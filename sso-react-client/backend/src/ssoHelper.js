// src/ssoHelper.js
const crypto = require('crypto');
const axios = require('axios');

const SSO_SERVER = process.env.SSO_SERVER || 'http://localhost:5000/api/auth-sso';
const CLIENT_ID = process.env.CLIENT_ID || '';
const CLIENT_SECRET = process.env.CLIENT_SECRET || '';
const REDIRECT_URI = process.env.REDIRECT_URI || 'http://localhost:4000/auth/callback';

// ── Build SSO authorize URL with PKCE ─────────
function buildAuthUrl() {
  const codeVerifier = crypto.randomBytes(64).toString('base64url');
  const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');
  const state = crypto.randomBytes(16).toString('hex');

  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    scope: 'email',
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });
  return {
    url: `${SSO_SERVER}/oauth/authorize?${params}`,
    state,
    codeVerifier,
  };
}

// ── Exchange auth code → tokens ───────────────
async function exchangeCodeForTokens(code, codeVerifier) {
  const res = await axios.post(
    `${SSO_SERVER}/oauth/token`,
    new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: REDIRECT_URI,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      code_verifier: codeVerifier,
    }),
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
  );
  return res.data;
}

// ── Get user info from SSO ────────────────────
async function getUserInfo(accessToken) {
  const res = await axios.get(`${SSO_SERVER}/oauth/userinfo`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return res.data;
}

// ── Refresh access token ──────────────────────
async function refreshAccessToken(refreshToken) {
  const res = await axios.post(
    `${SSO_SERVER}/oauth/token`,
    new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
    }),
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
  );
  return res.data;
}

// ── Revoke token ──────────────────────────────
async function revokeToken(token) {
  await axios.post(
    `${SSO_SERVER}/oauth/revoke`,
    new URLSearchParams({ token, client_id: CLIENT_ID, client_secret: CLIENT_SECRET }),
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
  );
}

module.exports = { buildAuthUrl, exchangeCodeForTokens, getUserInfo, refreshAccessToken, revokeToken, SSO_SERVER };
