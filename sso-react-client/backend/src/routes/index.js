// src/routes/index.js
const express = require('express');
const router = express.Router();
const redis = require('../redis');
const { requireAuth } = require('../middleware/auth');
const {
  buildAuthUrl, exchangeCodeForTokens,
  getUserInfo, revokeToken, SSO_SERVER,
} = require('../ssoHelper');
const { default: loginWithSSO } = require('../sso');

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// ─────────────────────────────────────────────
// GET /api/auth/login
// React calls this → backend returns SSO URL
// React then redirects user to that URL
// ─────────────────────────────────────────────
router.get('/api/auth/login', async (req, res) => {
  const { url, state, codeVerifier } = buildAuthUrl();
  // Save PKCE + state in session
  req.session.oauthState = state;
  req.session.pkceCodeVerifier = codeVerifier;
  const sessionId = await loginWithSSO(url);
  console.log(sessionId, "session ID:::::::::::::::")
  // Return URL to React — React will do window.location.href = url
  res.json(sessionId);
});

// ─────────────────────────────────────────────
// GET /auth/callback
// SSO redirects browser here after login
// This is a BACKEND route (not React)
// ─────────────────────────────────────────────
router.get('/auth/callback', async (req, res) => {
  const { code, state, error } = req.query;

  if (error) {
    return res.redirect(`${FRONTEND_URL}/login?error=${error}`);
  }

  if (!code || !state) {
    return res.redirect(`${FRONTEND_URL}/login?error=missing_params`);
  }

  // CSRF check
  if (state !== req.session.oauthState) {
    return res.redirect(`${FRONTEND_URL}/login?error=state_mismatch`);
  }

  const codeVerifier = req.session.pkceCodeVerifier;
  delete req.session.oauthState;
  delete req.session.pkceCodeVerifier;

  try {
    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code, codeVerifier);

    // Get user info
    const userInfo = await getUserInfo(tokens.access_token);

    // Save in session
    const now = Math.floor(Date.now() / 1000);
    req.session.user = {
      id: userInfo.sub,
      email: userInfo.email,
      name: userInfo.name,
      emailVerified: userInfo.email_verified,
    };
    req.session.accessToken = tokens.access_token;
    req.session.refreshToken = tokens.refresh_token;
    req.session.tokenExpiresAt = now + tokens.expires_in;

    // Redirect React frontend to profile page
    res.redirect(`${FRONTEND_URL}/profile`);

  } catch (err) {
    console.error('Callback error:', err.response?.data || err.message);
    res.redirect(`${FRONTEND_URL}/login?error=token_exchange_failed`);
  }
});

// ─────────────────────────────────────────────
// GET /api/auth/me
// React calls this to check if user is logged in
// and get user data
// ─────────────────────────────────────────────
router.get('/api/auth/me', requireAuth, (req, res) => {
  res.json({
    user: req.currentUser,
    tokenExpiresAt: req.session.tokenExpiresAt,
  });
});

// ─────────────────────────────────────────────
// GET /api/auth/logout
// React calls this to logout
// ─────────────────────────────────────────────
router.get('/api/auth/logout', async (req, res) => {
  const refreshToken = req.session?.refreshToken;

  try {
    if (refreshToken) await revokeToken(refreshToken);
  } catch (err) {
    console.error('Revoke error (continuing):', err.message);
  }

  req.session.destroy();
  res.clearCookie('connect.sid');

  // Return SSO logout URL — React will redirect user there
  const ssoLogoutUrl = `${SSO_SERVER}/auth/logout?post_logout_redirect_uri=${FRONTEND_URL}/login?logged_out=true`;
  res.json({ logoutUrl: ssoLogoutUrl });
});

// ─────────────────────────────────────────────
// POST /backchannel-logout
// SSO server calls this when user logs out from
// any other client app → auto-logout this user
// ─────────────────────────────────────────────
router.post('/backchannel-logout', async (req, res) => {
  const { user_id } = req.body;
  if (!user_id) return res.status(400).json({ error: 'missing user_id' });

  // Set Redis flag — requireAuth middleware will catch it
  await redis.setex(`logged_out:${user_id}`, 3600, '1');
  console.log(`📢 Backchannel logout: user ${user_id}`);

  res.json({ ok: true });
});

// ─────────────────────────────────────────────
// GET /api/profile
// Example protected API — returns full profile
// ─────────────────────────────────────────────
router.get('/api/profile', requireAuth, (req, res) => {
  res.json({
    user: req.currentUser,
    accessToken: req.accessToken?.substring(0, 40) + '...',
    sessionInfo: {
      tokenExpiresAt: req.session.tokenExpiresAt,
      expiresIn: req.session.tokenExpiresAt - Math.floor(Date.now() / 1000),
    },
  });
});

module.exports = router;
