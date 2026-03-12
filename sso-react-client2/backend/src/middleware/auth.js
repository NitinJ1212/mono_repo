// src/middleware/auth.js
const redis = require('../redis');
const { refreshAccessToken } = require('../ssoHelper');

async function requireAuth(req, res, next) {
  // 1. No session → 401
  if (!req.session?.user) {
    return res.status(401).json({ error: 'unauthenticated', message: 'Not logged in' });
  }
  console.log("req.session -------------", req.session, "req.session -------------");
  const { user } = req.session;

  // 2. Check backchannel logout flag
  const loggedOut = await redis.get(`logged_out:${user.id}`);
  if (loggedOut) {
    req.session.destroy();
    return res.status(401).json({ error: 'sso_logout', message: 'Logged out by SSO' });
  }

  // 3. Auto-refresh if token expiring within 60s
  const now = Math.floor(Date.now() / 1000);
  if (now >= (req.session.tokenExpiresAt || 0) - 60) {
    try {
      const tokens = await refreshAccessToken(req.session.refreshToken);
      req.session.accessToken = tokens.access_token;
      req.session.refreshToken = tokens.refresh_token;
      req.session.tokenExpiresAt = now + tokens.expires_in;
    } catch (err) {
      req.session.destroy();
      return res.status(401).json({ error: 'session_expired', message: 'Session expired' });
    }
  }
  req.currentUser = user;
  req.accessToken = req.session.accessToken;
  next();
}

module.exports = { requireAuth };
