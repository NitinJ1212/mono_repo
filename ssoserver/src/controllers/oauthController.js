// src/controllers/oauthController.js
const { v4: uuidv4 } = require('uuid');

const { query, redis } = require('../db');
const { signAccessToken, signIdToken, verifyToken } = require('../config/jwt');
const {
  generateToken, hashToken, verifyCodeChallenge,
} = require('../utils/crypto');
const { auditLog } = require('../utils/audit');

const ACCESS_TTL = parseInt(process.env.ACCESS_TOKEN_TTL) || 900;
const REFRESH_TTL = parseInt(process.env.REFRESH_TOKEN_TTL) || 604800;

// ─── HELPER: validate client credentials ─────
async function getClient(clientId, clientSecret) {
  const result = await query('SELECT * FROM clients WHERE client_id = $1 AND is_active = TRUE', [clientId]);
  const client = result.rows[0];
  if (!client) return null;

  // const bcrypt = require('bcrypt');
  // async function main() {
  //   const secret = clientSecret; // your actual plain text secret
  //   const hash = await bcrypt.hash(secret, 12);
  //   return hash;
  // }

  // const valid = await main();
  // return valid ? client : null;

  const bcrypt = require('bcrypt');
  console.log(client.client_secret_hash, "clientSecret, client.client_secret_hash------------------");
  const valid = await bcrypt.compare(clientSecret, client.client_secret_hash);
  console.log(valid, "---------------222222222222");
  return valid ? client : null;
}

// ─────────────────────────────────────────────────────────
// GET /oauth/authorize
// Browser visits this → SSO validates, stores pending auth,
// shows login if needed or immediately issues code if session exists
// ─────────────────────────────────────────────────────────
async function authorize(req, res) {
  const {
    client_id, redirect_uri, response_type,
    scope, state, code_challenge, code_challenge_method,
  } = req.validated;
  try {
    // 1. Validate client and redirect_uri
    const clientResult = await query('SELECT * FROM clients WHERE client_id = $1 AND is_active = TRUE', [client_id]);
    const client = clientResult.rows[0];

    if (!client) {
      return res.status(400).json({ error: 'invalid_client', message: 'Unknown client_id' });
    }

    if (!client.redirect_uris.includes(redirect_uri)) {
      return res.status(400).json({ error: 'invalid_redirect_uri', message: 'redirect_uri not registered' });
    }

    // 2. Validate requested scopes
    const requestedScopes = scope.split(' ');
    const invalidScopes = requestedScopes.filter(s => !client.allowed_scopes.includes(s));
    if (invalidScopes.length) {
      return res.status(400).json({
        error: 'invalid_scope',
        message: `Scopes not allowed: ${invalidScopes.join(', ')}`,
      });
    }
    // 3. Store pending auth data in Redis keyed by a session_id
    const pendingSessionId = generateToken(24);
    const pendingData = {
      client_id,
      redirect_uri,
      scopes: requestedScopes,
      state,
      code_challenge,
      code_challenge_method,
    };
    await redis.setex(`pending_auth:${pendingSessionId}`, 600, JSON.stringify(pendingData));

    // 4. Check if user already has SSO session
    const sessionToken = req.cookies?.sso_session;
    if (sessionToken) {
      const sessResult = await query(
        `SELECT s.user_id, u.email, u.name
         FROM sessions s JOIN users u ON u.id = s.user_id
         WHERE s.session_token = $1 AND s.expires_at > NOW()`,
        [sessionToken]
      );
      const existingSession = sessResult.rows[0];
      if (existingSession) {
        // Check consent
        const consentResult = await query(
          'SELECT scopes FROM consent_grants WHERE user_id = $1 AND client_id = $2',
          [existingSession.user_id, client_id]
        );
        const granted = consentResult.rows[0];
        const hasConsent = granted && requestedScopes.every(s => granted.scopes.includes(s));

        if (hasConsent) {
          // Issue code immediately - no re-login needed
          const { issueAuthCode } = require('./authController');
          const code = await issueAuthCode(existingSession.user_id, pendingData);
          await redis.del(`pending_auth:${pendingSessionId}`);
          await auditLog({
            userId: existingSession.user_id, clientId: client_id,
            eventType: 'oauth.authorize_silent', req,
          });
          return res.redirect(`${redirect_uri}?code=${code}&state=${state}`);
        }

        // Has session but no consent → show consent screen
        return res.status(200).json({
          action: 'consent_required',
          session_id: pendingSessionId,
          client_name: client.name,
          requested_scopes: requestedScopes,
          message: 'User consent required. POST to /oauth/consent with session_id and approved=true',
        });
      }
    }
    // 5. No session → show login
    return res.status(200).json({
      action: 'login_required',
      session_id: pendingSessionId,
      message: 'User must login. POST to /auth/login with session_id included.',
    });

  } catch (err) {
    console.error('Authorize error:', err);
    return res.status(500).json({ error: 'server_error' });
  }
}

// ─────────────────────────────────────────────────────────
// POST /oauth/consent
// User approves/denies the OAuth scope request
// ─────────────────────────────────────────────────────────
async function consent(req, res) {
  const { session_id, approved } = req.body;
  const sessionToken = req.cookies?.sso_session;

  if (!session_id) {
    return res.status(400).json({ error: 'missing_session_id' });
  }

  try {
    // Validate SSO session
    const sessResult = await query(
      'SELECT user_id FROM sessions WHERE session_token = $1 AND expires_at > NOW()',
      [sessionToken]
    );
    const session = sessResult.rows[0];
    if (!session) {
      return res.status(401).json({ error: 'invalid_session' });
    }

    const raw = await redis.get(`pending_auth:${session_id}`);
    if (!raw) {
      return res.status(400).json({ error: 'session_expired', message: 'Auth session expired' });
    }

    const authData = JSON.parse(raw);

    if (!approved) {
      await redis.del(`pending_auth:${session_id}`);
      return res.redirect(`${authData.redirect_uri}?error=access_denied&state=${authData.state}`);
    }

    // Save consent grant
    await query(
      `INSERT INTO consent_grants (user_id, client_id, scopes)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, client_id)
       DO UPDATE SET scopes = $3, granted_at = NOW()`,
      [session.user_id, authData.client_id, authData.scopes]
    );

    const { issueAuthCode } = require('./authController');
    const code = await issueAuthCode(session.user_id, authData);
    await redis.del(`pending_auth:${session_id}`);

    await auditLog({
      userId: session.user_id, clientId: authData.client_id,
      eventType: 'oauth.consent_granted', req,
    });

    return res.status(200).json({
      redirect_uri: `${authData.redirect_uri}?code=${code}&state=${authData.state}`,
    });

  } catch (err) {
    console.error('Consent error:', err);
    return res.status(500).json({ error: 'server_error' });
  }
}

// ─────────────────────────────────────────────────────────
// POST /oauth/token
// grant_type: authorization_code  |  refresh_token
// ─────────────────────────────────────────────────────────
async function token(req, res) {
  const { grant_type } = req.validated;
  if (grant_type === 'authorization_code') {
    return handleAuthorizationCode(req, res);
  }
  if (grant_type === 'refresh_token') {
    return handleRefreshToken(req, res);
  }

  return res.status(400).json({ error: 'unsupported_grant_type' });
}

async function handleAuthorizationCode(req, res) {
  const { code, redirect_uri, client_id, client_secret, code_verifier } = req.validated;

  try {
    // 1. Validate client
    const client = await getClient(client_id, client_secret);
    if (!client) {
      return res.status(401).json({ error: 'invalid_client' });
    }

    // 2. Look up auth code (Redis first for speed)
    let codeData;
    const cached = await redis.get(`auth_code:${code}`);
    if (cached) {
      codeData = JSON.parse(cached);
    } else {
      const dbResult = await query(`SELECT * FROM authorization_codes WHERE code = $1 AND used = FALSE AND expires_at > NOW()`, [code]);
      if (!dbResult.rows[0]) {
        return res.status(400).json({ error: 'invalid_grant', message: 'Invalid or expired authorization code' });
      }
      const row = dbResult.rows[0];
      codeData = {
        userId: row.user_id,
        client_id: row.client_id,
        redirect_uri: row.redirect_uri,
        scopes: row.scopes,
        code_challenge: row.code_challenge,
      };
    }

    // 3. Validate client_id matches
    if (codeData.client_id !== client_id) {
      return res.status(400).json({ error: 'invalid_grant', message: 'client_id mismatch' });
    }

    // 4. Validate redirect_uri
    if (codeData.redirect_uri !== redirect_uri) {
      return res.status(400).json({ error: 'invalid_grant', message: 'redirect_uri mismatch' });
    }

    // 5. PKCE: verify code_verifier against stored code_challenge
    if (!verifyCodeChallenge(code_verifier, codeData.code_challenge)) {
      await auditLog({ eventType: 'oauth.pkce_failed', req, metadata: { client_id } });
      return res.status(400).json({ error: 'invalid_grant', message: 'PKCE verification failed' });
    }

    // 6. Mark code as used (prevent replay)
    await query('UPDATE authorization_codes SET used = TRUE WHERE code = $1', [code]);
    await redis.del(`auth_code:${code}`);

    // 7. Fetch user
    const userResult = await query('SELECT id, email, name, email_verified FROM users WHERE id = $1', [codeData.userId]);
    const user = userResult.rows[0];
    if (!user) {
      return res.status(400).json({ error: 'invalid_grant', message: 'User not found' });
    }

    // 8. Issue tokens
    const tokens = await issueTokenPair(user, client_id, codeData.scopes);

    await auditLog({
      userId: user.id, clientId: client_id,
      eventType: 'oauth.token_issued', req,
    });

    return res.status(200).json(tokens);

  } catch (err) {
    console.error('Token exchange error:', err);
    return res.status(500).json({ error: 'server_error' });
  }
}

async function handleRefreshToken(req, res) {
  const { refresh_token, client_id, client_secret } = req.validated;

  try {
    // 1. Validate client
    const client = await getClient(client_id, client_secret);
    if (!client) {
      return res.status(401).json({ error: 'invalid_client' });
    }

    // 2. Hash the incoming token to find it in DB
    const tokenHash = hashToken(refresh_token);
    console.log(tokenHash, "tokenHashtokenHashtokenHashtokenHash-----", refresh_token)

    const tokenResult = await query(
      `SELECT * FROM refresh_tokens
       WHERE token_hash = $1 AND client_id = $2`,
      [tokenHash, client_id]
    );
    const storedToken = tokenResult.rows[0];

    if (!storedToken) {
      return res.status(400).json({ error: 'invalid_grant', message: 'Refresh token not found' });
    }

    // 3. Check if already revoked → THEFT DETECTED → revoke whole family
    if (storedToken.revoked_at) {
      await query(
        'UPDATE refresh_tokens SET revoked_at = NOW() WHERE family_id = $1',
        [storedToken.family_id]
      );
      await auditLog({
        userId: storedToken.user_id, clientId: client_id,
        eventType: 'oauth.refresh_token_reuse_detected', req,
      });
      return res.status(400).json({
        error: 'invalid_grant',
        message: 'Refresh token reuse detected. All sessions revoked.',
      });
    }

    // 4. Check expiry
    if (new Date(storedToken.expires_at) < new Date()) {
      return res.status(400).json({ error: 'invalid_grant', message: 'Refresh token expired' });
    }

    // 5. Revoke old refresh token
    await query(
      'UPDATE refresh_tokens SET revoked_at = NOW() WHERE id = $1',
      [storedToken.id]
    );

    // 6. Fetch user
    const userResult = await query(
      'SELECT id, email, name, email_verified, status FROM users WHERE id = $1',
      [storedToken.user_id]
    );
    const user = userResult.rows[0];

    if (!user || user.status !== 'active') {
      return res.status(400).json({ error: 'invalid_grant', message: 'User not found or disabled' });
    }

    // 7. Issue new token pair (same family_id for theft tracking)
    const tokens = await issueTokenPair(user, client_id, storedToken.scopes, storedToken.family_id);

    await auditLog({
      userId: user.id, clientId: client_id,
      eventType: 'oauth.token_refreshed', req,
    });

    return res.status(200).json(tokens);

  } catch (err) {
    console.error('Refresh token error:', err);
    return res.status(500).json({ error: 'server_error' });
  }
}

// ─────────────────────────────────────────────────────────
// POST /oauth/revoke  (RFC 7009)
// ─────────────────────────────────────────────────────────
async function revoke(req, res) {
  const { token: rawToken, client_id, client_secret } = req.validated;

  try {
    const client = await getClient(client_id, client_secret);
    if (!client) {
      return res.status(401).json({ error: 'invalid_client' });
    }

    const tokenHash = hashToken(rawToken);

    // Try revoke as refresh_token
    const rt = await query(
      'UPDATE refresh_tokens SET revoked_at = NOW() WHERE token_hash = $1 AND client_id = $2 RETURNING user_id',
      [tokenHash, client_id]
    );

    if (rt.rows[0]) {
      await auditLog({
        userId: rt.rows[0].user_id, clientId: client_id,
        eventType: 'oauth.refresh_token_revoked', req,
      });
    } else {
      // Try revoke as access token (blacklist by jti in Redis)
      try {
        const payload = verifyToken(rawToken);
        if (payload.jti) {
          const ttl = Math.max(0, payload.exp - Math.floor(Date.now() / 1000));
          await redis.setex(`revoked:${payload.jti}`, ttl, '1');
          await auditLog({
            userId: payload.sub, clientId: client_id,
            eventType: 'oauth.access_token_revoked', req,
          });
        }
      } catch (_) {
        // Token invalid — RFC says always return 200
      }
    }

    // RFC 7009: always return 200 regardless
    return res.status(200).json({});

  } catch (err) {
    console.error('Revoke error:', err);
    return res.status(500).json({ error: 'server_error' });
  }
}

// ─────────────────────────────────────────────────────────
// POST /oauth/introspect  (RFC 7662)
// For resource servers that can't verify JWTs locally
// ─────────────────────────────────────────────────────────
async function introspect(req, res) {
  const { token: rawToken, client_id, client_secret } = req.body;

  try {
    const client = await getClient(client_id, client_secret);
    if (!client) {
      return res.status(401).json({ error: 'invalid_client' });
    }

    let payload;
    try {
      payload = verifyToken(rawToken);
    } catch (_) {
      return res.status(200).json({ active: false });
    }

    // Check revocation
    if (payload.jti) {
      const revoked = await redis.get(`revoked:${payload.jti}`);
      if (revoked) return res.status(200).json({ active: false });
    }

    return res.status(200).json({
      active: true,
      sub: payload.sub,
      scope: payload.scope,
      client_id: payload.aud,
      username: payload.email,
      exp: payload.exp,
      iat: payload.iat,
      iss: payload.iss,
      jti: payload.jti,
    });

  } catch (err) {
    console.error('Introspect error:', err);
    return res.status(500).json({ error: 'server_error' });
  }
}

// ─────────────────────────────────────────────────────────
// GET /oauth/userinfo  (OIDC)
// ─────────────────────────────────────────────────────────
async function userinfo(req, res) {
  const userId = req.user.sub;
  const scopes = (req.user.scope || '').split(' ');

  try {
    const result = await query(
      'SELECT id, email, name, email_verified, created_at FROM users WHERE id = $1',
      [userId]
    );
    const user = result.rows[0];
    if (!user) return res.status(404).json({ error: 'user_not_found' });

    const claims = { sub: user.id };

    if (scopes.includes('email')) {
      claims.email = user.email;
      claims.email_verified = user.email_verified;
    }
    if (scopes.includes('profile')) {
      claims.name = user.name;
      claims.created_at = user.created_at;
    }

    return res.status(200).json(claims);

  } catch (err) {
    console.error('Userinfo error:', err);
    return res.status(500).json({ error: 'server_error' });
  }
}

// ─── HELPER: issue access + refresh + id tokens ──────────
async function issueTokenPair(user, clientId, scopes, existingFamilyId = null) {
  const jti = uuidv4();
  const familyId = existingFamilyId || uuidv4();
  const scopeStr = Array.isArray(scopes) ? scopes.join(' ') : scopes;

  // Access Token (JWT)
  const accessToken = signAccessToken({
    sub: user.id,
    email: user.email,
    name: user.name,
    scope: scopeStr,
    aud: clientId,
    jti,
  });

  // Refresh Token (opaque)
  const refreshTokenRaw = generateToken(48);
  const refreshTokenHash = hashToken(refreshTokenRaw);
  console.log(refreshTokenHash, "refreshTokenHashrefreshTokenHashrefreshTokenHash-----", refreshTokenRaw)
  const refreshExpiresAt = new Date(Date.now() + REFRESH_TTL * 1000);

  await query(
    `INSERT INTO refresh_tokens (token_hash, user_id, client_id, scopes, family_id, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [refreshTokenHash, user.id, clientId, Array.isArray(scopes) ? scopes : scopes.split(' '), familyId, refreshExpiresAt]
  );

  //   await query(`INSERT INTO user_client_sessions (user_id, client_id) VALUES ($1, $2) ON CONFLICT (user_id, client_id) DO NOTHING`,
  //   [user.id, clientId]);
  // ID Token (if openid scope)
  let idToken = null;
  if (scopeStr.includes('openid')) {
    idToken = signIdToken({
      sub: user.id,
      email: user.email,
      name: user.name,
      email_verified: user.email_verified,
      aud: clientId,
    });
  }

  const response = {
    access_token: accessToken,
    token_type: 'Bearer',
    expires_in: ACCESS_TTL,
    refresh_token: refreshTokenRaw,
    scope: scopeStr,
  };

  if (idToken) response.id_token = idToken;

  return response;
}

module.exports = { authorize, consent, token, revoke, introspect, userinfo };
