// src/middleware/authenticate.js
const { verifyToken } = require('../config/jwt');
const { redis }       = require('../db');

// ─── Verify Bearer JWT on protected routes ────
async function authenticate(req, res, next) {
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'unauthorized', message: 'Missing Bearer token' });
  }

  const token = authHeader.slice(7);

  try {
    const payload = verifyToken(token);

    // Check if token is blacklisted (revoked access token via jti)
    const revoked = await redis.get(`revoked:${payload.jti}`);
    if (revoked) {
      return res.status(401).json({ error: 'token_revoked', message: 'Token has been revoked' });
    }

    req.user  = payload;
    req.token = token;
    next();
  } catch (err) {
    const msg = err.name === 'TokenExpiredError' ? 'Token expired' : 'Invalid token';
    return res.status(401).json({ error: 'invalid_token', message: msg });
  }
}

// ─── Require specific scopes ──────────────────
function requireScope(...scopes) {
  return (req, res, next) => {
    const tokenScopes = (req.user?.scope || '').split(' ');
    const hasAll = scopes.every(s => tokenScopes.includes(s));
    if (!hasAll) {
      return res.status(403).json({
        error: 'insufficient_scope',
        required: scopes,
      });
    }
    next();
  };
}

// ─── SSO Session middleware ───────────────────
// Used on SSO server's own login flow pages
async function requireSession(req, res, next) {
  const sessionToken = req.cookies?.sso_session;
  if (!sessionToken) {
    return res.status(401).json({ error: 'no_session', message: 'No SSO session found' });
  }

  const { query } = require('../db');
  const result = await query(
    `SELECT s.*, u.id as user_id, u.email, u.name, u.status
     FROM sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.session_token = $1 AND s.expires_at > NOW()`,
    [sessionToken]
  );

  if (!result.rows[0]) {
    return res.status(401).json({ error: 'session_expired', message: 'Session expired or invalid' });
  }

  req.session = result.rows[0];
  req.sessionUser = {
    id: result.rows[0].user_id,
    email: result.rows[0].email,
    name: result.rows[0].name,
  };

  // Update last_used
  query('UPDATE sessions SET last_used = NOW() WHERE session_token = $1', [sessionToken]);
  next();
}

module.exports = { authenticate, requireScope, requireSession };
