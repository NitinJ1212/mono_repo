// client-example/ssoClient.js
// ─────────────────────────────────────────────────────────
// Example: How your client app integrates with this SSO Server
// Use this in your Express.js client application
// ─────────────────────────────────────────────────────────
const crypto = require('crypto');
const axios  = require('axios');

const SSO_SERVER    = process.env.SSO_SERVER    || 'http://localhost:3000';
const CLIENT_ID     = process.env.CLIENT_ID     || 'your-client-id';
const CLIENT_SECRET = process.env.CLIENT_SECRET || 'your-client-secret';
const REDIRECT_URI  = process.env.REDIRECT_URI  || 'http://localhost:4000/auth/callback';

// ─── STEP 1: Build the authorization URL ─────
// Call this when user clicks "Login with SSO"
function buildAuthorizationUrl() {
  // Generate PKCE code_verifier + code_challenge
  const codeVerifier  = crypto.randomBytes(64).toString('base64url');
  const codeChallenge = crypto
    .createHash('sha256')
    .update(codeVerifier)
    .digest('base64url');

  // Generate state (anti-CSRF)
  const state = crypto.randomBytes(16).toString('hex');

  const params = new URLSearchParams({
    client_id:             CLIENT_ID,
    redirect_uri:          REDIRECT_URI,
    response_type:         'code',
    scope:                 'openid profile email',
    state,
    code_challenge:        codeChallenge,
    code_challenge_method: 'S256',
  });

  // IMPORTANT: Save codeVerifier + state in session (server-side) before redirecting
  return {
    url:           `${SSO_SERVER}/oauth/authorize?${params}`,
    state,
    codeVerifier,  // Store in session: req.session.codeVerifier = codeVerifier
  };
}

// ─── STEP 3: Handle the callback ─────────────
// GET /auth/callback?code=...&state=...
async function handleCallback(code, returnedState, savedState, savedCodeVerifier) {
  // 1. Validate state
  if (returnedState !== savedState) {
    throw new Error('State mismatch — possible CSRF attack');
  }

  // 2. Exchange code for tokens (back-channel — server to server)
  const response = await axios.post(
    `${SSO_SERVER}/oauth/token`,
    new URLSearchParams({
      grant_type:    'authorization_code',
      code,
      redirect_uri:  REDIRECT_URI,
      client_id:     CLIENT_ID,
      client_secret: CLIENT_SECRET,
      code_verifier: savedCodeVerifier,
    }),
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
  );

  return response.data;
  // Returns: { access_token, refresh_token, id_token, expires_in, scope }
}

// ─── STEP 4: Verify JWT locally (middleware) ──
function createJwtMiddleware(jwksUrl) {
  const jwksClient = require('jwks-rsa');
  const jwt        = require('jsonwebtoken');

  const client = jwksClient({ jwksUri: jwksUrl, cache: true, cacheMaxAge: 86400000 });

  return async function verifyJwt(req, res, next) {
    const authHeader = req.headers['authorization'];
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'missing_token' });
    }

    const token = authHeader.slice(7);

    try {
      const decoded = jwt.decode(token, { complete: true });
      const key     = await client.getSigningKey(decoded.header.kid);
      const pubKey  = key.getPublicKey();

      const payload = jwt.verify(token, pubKey, {
        algorithms: ['RS256'],
        issuer:     SSO_SERVER,
        audience:   CLIENT_ID,
      });

      req.user = payload;
      next();
    } catch (err) {
      return res.status(401).json({ error: 'invalid_token', message: err.message });
    }
  };
}

// ─── STEP 6: Refresh the access token ─────────
async function refreshTokens(refreshToken) {
  const response = await axios.post(
    `${SSO_SERVER}/oauth/token`,
    new URLSearchParams({
      grant_type:    'refresh_token',
      refresh_token: refreshToken,
      client_id:     CLIENT_ID,
      client_secret: CLIENT_SECRET,
    }),
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
  );

  return response.data;
  // Returns: { access_token, refresh_token (new!), expires_in }
}

// ─── STEP 7: Revoke tokens on logout ──────────
async function revokeToken(token) {
  await axios.post(
    `${SSO_SERVER}/oauth/revoke`,
    new URLSearchParams({
      token,
      client_id:     CLIENT_ID,
      client_secret: CLIENT_SECRET,
    }),
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
  );
}

// ─── Example Express client app routes ────────
// const express = require('express');
// const session = require('express-session');
// const app     = express();
// app.use(session({ secret: 'your-secret', resave: false, saveUninitialized: false }));
//
// app.get('/login', (req, res) => {
//   const { url, state, codeVerifier } = buildAuthorizationUrl();
//   req.session.oauthState        = state;
//   req.session.pkceCodeVerifier  = codeVerifier;
//   res.redirect(url);
// });
//
// app.get('/auth/callback', async (req, res) => {
//   const { code, state } = req.query;
//   const tokens = await handleCallback(
//     code, state,
//     req.session.oauthState,
//     req.session.pkceCodeVerifier,
//   );
//   // Store tokens: access_token in memory, refresh_token in HttpOnly cookie
//   req.session.accessToken = tokens.access_token;
//   res.cookie('rt', tokens.refresh_token, { httpOnly: true, secure: true, sameSite: 'lax' });
//   res.redirect('/dashboard');
// });
//
// app.get('/logout', async (req, res) => {
//   const rt = req.cookies.rt;
//   if (rt) await revokeToken(rt);
//   req.session.destroy();
//   res.clearCookie('rt');
//   res.redirect(`${SSO_SERVER}/auth/logout?post_logout_redirect_uri=http://localhost:4000/login`);
// });

module.exports = { buildAuthorizationUrl, handleCallback, createJwtMiddleware, refreshTokens, revokeToken };
