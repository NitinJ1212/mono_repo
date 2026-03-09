// src/controllers/authController.js
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const { v4: uuidv4 } = require('uuid');

const { query, redis } = require('../db');
const { hashPassword, verifyPassword, generateToken, hashToken } = require('../utils/crypto');
const { auditLog } = require('../utils/audit');

const SESSION_TTL = 7 * 24 * 60 * 60; // 7 days in seconds

// ─── REGISTER ────────────────────────────────────────────
// POST /auth/register
async function register(req, res) {
  const { email, password, name } = req.validated;
  try {
    // Check if email exists
    const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows[0]) {
      return res.status(409).json({ error: 'email_taken', message: 'Email already registered' });
    }

    const password_hash = await hashPassword(password);

    const result = await query(
      `INSERT INTO users (email, password_hash, name)
       VALUES ($1, $2, $3)
       RETURNING id, email, name, created_at`,
      [email.toLowerCase(), password_hash, name || null]
    );

    const user = result.rows[0];
    await auditLog({ userId: user.id, eventType: 'user.registered', req });

    return res.status(201).json({
      message: 'User registered successfully',
      user: { id: user.id, email: user.email, name: user.name },
    });
  } catch (err) {
    console.error('Register error:', err);
    return res.status(500).json({ error: 'server_error' });
  }
}

// ─── LOGIN ───────────────────────────────────────────────
// POST /auth/login
async function login(req, res) {
  const { email, password, session_id } = req.validated;

  try {
    // Fetch user
    const result = await query(`SELECT id, email, name, password_hash, mfa_enabled, mfa_secret,
              status, failed_attempts, locked_until FROM users WHERE email = $1`, [email.toLowerCase()]);
    const user = result.rows[0];

    // Always same error to prevent user enumeration
    if (!user) {
      await auditLog({ eventType: 'auth.login_failed', req, metadata: { reason: 'user_not_found', email } });
      return res.status(401).json({ error: 'invalid_credentials', message: 'Invalid email or password' });
    }

    // Check account status
    if (user.status === 'disabled') {
      return res.status(403).json({ error: 'account_disabled', message: 'Account is disabled' });
    }

    // Check lockout
    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      return res.status(403).json({
        error: 'account_locked',
        message: 'Account temporarily locked. Try again later.',
        locked_until: user.locked_until,
      });
    }

    // Verify password
    const valid = await verifyPassword(password, user.password_hash);
    if (!valid) {
      // Increment failed attempts; lock after 5
      const newAttempts = (user.failed_attempts || 0) + 1;
      const lockUntil = newAttempts >= 5 ? new Date(Date.now() + 15 * 60 * 1000) : null;
      await query(
        'UPDATE users SET failed_attempts = $1, locked_until = $2, updated_at = NOW() WHERE id = $3',
        [newAttempts, lockUntil, user.id]
      );
      await auditLog({ userId: user.id, eventType: 'auth.login_failed', req, metadata: { reason: 'wrong_password' } });
      return res.status(401).json({ error: 'invalid_credentials', message: 'Invalid email or password' });
    }

    // Reset failed attempts
    await query('UPDATE users SET failed_attempts = 0, locked_until = NULL WHERE id = $1', [user.id]);

    // ── MFA required ──
    if (user.mfa_enabled) {
      // Store a short-lived MFA pending token in Redis
      const mfaPending = generateToken(24);
      await redis.setex(`mfa_pending:${mfaPending}`, 300, JSON.stringify({
        userId: user.id,
        session_id: session_id || null,
      }));

      await auditLog({ userId: user.id, eventType: 'auth.mfa_required', req });

      return res.status(200).json({
        mfa_required: true,
        mfa_session: mfaPending,
        message: 'MFA verification required',
      });
    }

    // ── No MFA: create session and handle auth flow ──
    const { sessionToken, sessionId } = await createSession(user, req);

    await auditLog({ userId: user.id, eventType: 'auth.login_success', req });

    // If this login is part of an OAuth flow (session_id passed from /authorize)
    if (session_id) {
      const pendingAuth = await redis.get(`pending_auth:${session_id}`);
      if (pendingAuth) {
        const authData = JSON.parse(pendingAuth);
        const code = await issueAuthCode(user.id, authData);
        await redis.del(`pending_auth:${session_id}`);
        // setSessionCookie(res, sessionToken);
        return res.status(200).json({
          redirect_uri: `${authData.redirect_uri}?code=${code}&state=${authData.state}`,
        });
      }
    }
    // Plain login (not OAuth flow)
    // setSessionCookie(res, sessionToken);
    return res.status(200).json({
      message: 'Login successful',
      user: { id: user.id, email: user.email, name: user.name },
      session_id: sessionId,
    });

  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'server_error' });
  }
}

// ─── MFA VERIFY ──────────────────────────────────────────
// POST /auth/mfa/verify
async function mfaVerify(req, res) {
  const { mfa_token, session_id } = req.validated;

  try {
    const raw = await redis.get(`mfa_pending:${session_id}`);
    if (!raw) {
      return res.status(401).json({ error: 'invalid_mfa_session', message: 'MFA session expired or invalid' });
    }

    const { userId, session_id: oauthSessionId } = JSON.parse(raw);

    // Fetch user's MFA secret
    const result = await query('SELECT id, email, name, mfa_secret FROM users WHERE id = $1', [userId]);
    const user = result.rows[0];

    if (!user?.mfa_secret) {
      return res.status(400).json({ error: 'mfa_not_setup' });
    }

    const valid = speakeasy.totp.verify({
      secret: user.mfa_secret,
      encoding: 'base32',
      token: mfa_token,
      window: 1, // allow 1 step drift
    });

    if (!valid) {
      await auditLog({ userId, eventType: 'auth.mfa_failed', req });
      return res.status(401).json({ error: 'invalid_mfa_token', message: 'Invalid MFA code' });
    }

    await redis.del(`mfa_pending:${session_id}`);

    const { sessionToken } = await createSession(user, req);
    await auditLog({ userId, eventType: 'auth.mfa_success', req });

    // If part of OAuth flow
    if (oauthSessionId) {
      const pendingAuth = await redis.get(`pending_auth:${oauthSessionId}`);
      if (pendingAuth) {
        const authData = JSON.parse(pendingAuth);
        const code = await issueAuthCode(userId, authData);
        await redis.del(`pending_auth:${oauthSessionId}`);
        // setSessionCookie(res, sessionToken);
        return res.status(200).json({
          redirect_uri: `${authData.redirect_uri}?code=${code}&state=${authData.state}`,
        });
      }
    }

    // setSessionCookie(res, sessionToken);
    return res.status(200).json({ message: 'MFA verified', user: { id: user.id, email: user.email } });

  } catch (err) {
    console.error('MFA verify error:', err);
    return res.status(500).json({ error: 'server_error' });
  }
}

// ─── MFA SETUP ───────────────────────────────────────────
// GET /auth/mfa/setup  (requires authenticate middleware)
async function mfaSetup(req, res) {
  const userId = req.user.sub;

  try {
    const userResult = await query('SELECT email, mfa_enabled FROM users WHERE id = $1', [userId]);
    const user = userResult.rows[0];

    if (!user) return res.status(404).json({ error: 'user_not_found' });
    if (user.mfa_enabled) {
      return res.status(400).json({ error: 'mfa_already_enabled', message: 'MFA is already enabled' });
    }

    const secret = speakeasy.generateSecret({
      name: `SSO (${user.email})`,
      length: 20,
    });

    // Store temp secret until confirmed
    await redis.setex(`mfa_setup:${userId}`, 600, secret.base32);

    const qrCodeDataUrl = await QRCode.toDataURL(secret.otpauth_url);

    return res.status(200).json({
      message: 'Scan QR code with your authenticator app, then confirm with /auth/mfa/confirm',
      qr_code: qrCodeDataUrl,
      manual_key: secret.base32, // for manual entry
    });
  } catch (err) {
    console.error('MFA setup error:', err);
    return res.status(500).json({ error: 'server_error' });
  }
}

// ─── MFA CONFIRM (activate MFA after setup) ──────────────
// POST /auth/mfa/confirm  (requires authenticate middleware)
async function mfaConfirm(req, res) {
  const userId = req.user.sub;
  const { token } = req.body;

  if (!token) return res.status(400).json({ error: 'token_required' });

  try {
    const secret = await redis.get(`mfa_setup:${userId}`);
    if (!secret) {
      return res.status(400).json({ error: 'setup_expired', message: 'MFA setup session expired. Start again.' });
    }

    const valid = speakeasy.totp.verify({ secret, encoding: 'base32', token, window: 1 });
    if (!valid) {
      return res.status(400).json({ error: 'invalid_token', message: 'Invalid verification code' });
    }

    await query(
      'UPDATE users SET mfa_secret = $1, mfa_enabled = TRUE, updated_at = NOW() WHERE id = $2',
      [secret, userId]
    );
    await redis.del(`mfa_setup:${userId}`);
    await auditLog({ userId, eventType: 'auth.mfa_enabled', req });

    return res.status(200).json({ message: 'MFA enabled successfully' });
  } catch (err) {
    console.error('MFA confirm error:', err);
    return res.status(500).json({ error: 'server_error' });
  }
}

// ─── LOGOUT ──────────────────────────────────────────────
// GET /auth/logout
async function logout(req, res) {
  const { id_token_hint, post_logout_redirect_uri } = req.query;

  try {
    const sessionToken = req.cookies?.sso_session;

    if (sessionToken) {
      // Get session to find user
      const sessResult = await query(
        'SELECT user_id FROM sessions WHERE session_token = $1',
        [sessionToken]
      );
      const session = sessResult.rows[0];

      if (session) {
        // Delete this session
        await query('DELETE FROM sessions WHERE session_token = $1', [sessionToken]);

        // Revoke ALL refresh tokens for user
        await query(
          'UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL',
          [session.user_id]
        );

        await auditLog({ userId: session.user_id, eventType: 'auth.logout', req });
      }
    }

    // Clear session cookie
    res.clearCookie('sso_session', { httpOnly: true, secure: true, sameSite: 'lax' });

    if (post_logout_redirect_uri) {
      return res.redirect(post_logout_redirect_uri);
    }

    return res.status(200).json({ message: 'Logged out successfully' });
  } catch (err) {
    console.error('Logout error:', err);
    return res.status(500).json({ error: 'server_error' });
  }
}
async function logouts(req, res) {
  const sessionToken = req.cookies?.sso_session;

  if (sessionToken) {
    const sessResult = await query(
      'SELECT user_id FROM sessions WHERE session_token = $1',
      [sessionToken]
    );
    const session = sessResult.rows[0];

    if (session) {
      // 1. Delete SSO session
      await query('DELETE FROM sessions WHERE session_token = $1', [sessionToken]);

      // 2. Revoke all refresh tokens
      await query(
        'UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL',
        [session.user_id]
      );

      // 3. Find all clients this user is logged into
      const clientsResult = await query(
        `SELECT c.client_id, c.logout_uri
         FROM user_client_sessions ucs
         JOIN clients c ON c.client_id = ucs.client_id
         WHERE ucs.user_id = $1 AND c.logout_uri IS NOT NULL`,
        [session.user_id]
      );

      // 4. Notify each client (fire and forget — don't wait)
      for (const client of clientsResult.rows) {
        notifyClientLogout(client.logout_uri, session.user_id)
          .catch(err => console.error(`Logout notify failed for ${client.client_id}:`, err.message));
      }

      // 5. Clean up user_client_sessions
      await query(
        'DELETE FROM user_client_sessions WHERE user_id = $1',
        [session.user_id]
      );

      await auditLog({ userId: session.user_id, eventType: 'auth.logout', req });
    }
  }

  res.clearCookie('sso_session', { httpOnly: true, secure: true, sameSite: 'lax' });

  const { post_logout_redirect_uri } = req.query;
  if (post_logout_redirect_uri) return res.redirect(post_logout_redirect_uri);
  return res.status(200).json({ message: 'Logged out successfully' });
}

// ─── Send logout notification to client app ───
async function notifyClientLogout(logoutUri, userId) {
  const axios = require('axios');
  await axios.post(logoutUri, { user_id: userId }, {
    timeout: 5000,
    headers: { 'Content-Type': 'application/json' }
  });
}

// ─── SESSION LIST (user can see active sessions) ──────────
// GET /auth/sessions  (requires authenticate)
async function getSessions(req, res) {
  const userId = req.user.sub;
  try {
    const result = await query(
      `SELECT id, ip_address, user_agent, last_used, created_at
       FROM sessions
       WHERE user_id = $1 AND expires_at > NOW()
       ORDER BY last_used DESC`,
      [userId]
    );
    return res.status(200).json({ sessions: result.rows });
  } catch (err) {
    return res.status(500).json({ error: 'server_error' });
  }
}

// ─── REVOKE SESSION ───────────────────────────────────────
// DELETE /auth/sessions/:sessionId  (requires authenticate)
async function revokeSession(req, res) {
  const userId = req.user.sub;
  const sessionId = req.params.sessionId;
  try {
    const result = await query(
      'DELETE FROM sessions WHERE id = $1 AND user_id = $2 RETURNING id',
      [sessionId, userId]
    );
    if (!result.rows[0]) {
      return res.status(404).json({ error: 'session_not_found' });
    }
    await auditLog({ userId, eventType: 'auth.session_revoked', req, metadata: { session_id: sessionId } });
    return res.status(200).json({ message: 'Session revoked' });
  } catch (err) {
    return res.status(500).json({ error: 'server_error' });
  }
}

// ─── HELPERS ─────────────────────────────────────────────
async function createSession(user, req) {
  const sessionToken = generateToken(48);
  const sessionId = uuidv4();
  const expiresAt = new Date(Date.now() + SESSION_TTL * 1000);
  const ip = req.ip || req.headers['x-forwarded-for'] || null;
  const ua = req.headers['user-agent'] || null;
  console.log(sessionId, "-----------------::::::::::")
  await query(
    `INSERT INTO sessions (id, user_id, session_token, ip_address, user_agent, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [sessionId, user.id, sessionToken, ip, ua, expiresAt]
  );

  return { sessionToken, sessionId };
}

async function issueAuthCode(userId, authData) {
  const { generateCode } = require('../utils/crypto');
  const code = generateCode();
  const expiresAt = new Date(Date.now() + (parseInt(process.env.AUTH_CODE_TTL) || 60) * 1000);
  console.log(userId, authData, "-----------------:::::::::: userId, authData in issueAuthCode")
  await query(
    `INSERT INTO authorization_codes
       (code, user_id, client_id, redirect_uri, scopes, code_challenge, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      code,
      userId,
      authData.client_id,
      authData.redirect_uri,
      authData.scopes,
      authData.code_challenge,
      expiresAt,
    ]
  );

  // Also cache in Redis for fast lookup
  await redis.setex(
    `auth_code:${code}`,
    parseInt(process.env.AUTH_CODE_TTL) || 60,
    JSON.stringify({ userId, ...authData })
  );

  return code;
}

function setSessionCookie(res, sessionToken) {
  res.cookie('sso_session', sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_TTL * 1000,
  });
}

module.exports = {
  register, login, mfaVerify, mfaSetup, mfaConfirm,
  logout, getSessions, revokeSession,
  issueAuthCode, createSession, setSessionCookie,
};
