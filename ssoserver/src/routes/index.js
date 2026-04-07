// src/routes/index.js
const express = require('express');
const router = express.Router();

// Controllers
const authCtrl = require('../controllers/authController');
const oauthCtrl = require('../controllers/oauthController');
const adminCtrl = require('../controllers/adminController');
const discoveryCtrl = require('../controllers/discoveryController');

// Middleware
const { authenticate } = require('../middleware/authenticate');
const { loginLimiter, tokenLimiter, registerLimiter } = require('../middleware/rateLimiter');
const {
  validate, validateQuery,
  registerSchema, loginSchema, mfaVerifySchema,
  authorizeSchema, tokenSchema, revokeSchema,
  clientRegisterSchema,
  ssologinSchema,
} = require('../utils/validators');

// ─────────────────────────────────────────────────────────
// OIDC DISCOVERY  (public, no auth)
// ─────────────────────────────────────────────────────────
router.get('/.well-known/openid-configuration', discoveryCtrl.openidConfiguration);
router.get('/.well-known/jwks.json', discoveryCtrl.jwks);

// ─────────────────────────────────────────────────────────
// AUTH ROUTES
// ─────────────────────────────────────────────────────────

// Register a new Service Provider client app
// POST /admin/clients
router.post('/admin/clients', validate(clientRegisterSchema), adminCtrl.createClient);
// Register new user
// POST /auth/register
router.post('/auth/register', registerLimiter, validate(registerSchema), authCtrl.register);
// Step 1: Authorization endpoint — redirect user here to start SSO
// GET /oauth/authorize
router.get('/oauth/authorize', validateQuery(authorizeSchema), oauthCtrl.authorize);
// Login with email + password
// POST /auth/login
router.post('/auth/login', loginLimiter, validate(loginSchema), authCtrl.login);
router.post('/auth/sso-login', loginLimiter, validate(ssologinSchema), authCtrl.ssologin);
// Step 2: Exchange auth code for tokens  /  Refresh tokens
// POST /oauth/token
router.post('/oauth/token', tokenLimiter, validate(tokenSchema), oauthCtrl.token);
// Revoke a token (RFC 7009)
// POST /oauth/revoke
router.post('/oauth/revoke', validate(revokeSchema), oauthCtrl.revoke);
// Global SSO logout
// GET /auth/logout
router.get('/auth/logout', authCtrl.logout);

router.post('/backchannel-logout', authCtrl.allLogout)
// Verify MFA OTP after login
// POST /auth/mfa/verify
router.post('/auth/mfa/verify', loginLimiter, validate(mfaVerifySchema), authCtrl.mfaVerify);

// List all client apps
// GET /admin/clients
router.get('/admin/clients', adminCtrl.listClients);

// Get a single client
// GET /admin/clients/:clientId
router.get('/admin/clients/:clientId', adminCtrl.getClient);

// Update a client
// PUT /admin/clients/:clientId
router.put('/admin/clients/:clientId', adminCtrl.updateClient);

// Rotate client secret
// POST /admin/clients/:clientId/rotate-secret
router.post('/admin/clients/:clientId/rotate-secret', adminCtrl.rotateSecret);

// Delete a client
// DELETE /admin/clients/:clientId
router.delete('/admin/clients/:clientId', adminCtrl.deleteClient);

// Setup MFA (get QR code) — requires valid access token
// GET /auth/mfa/setup
router.get('/auth/mfa/setup', authenticate, authCtrl.mfaSetup);

// Confirm & activate MFA — requires valid access token
// POST /auth/mfa/confirm
router.post('/auth/mfa/confirm', authenticate, authCtrl.mfaConfirm);


// List all active sessions for current user
// GET /auth/sessions
router.get('/auth/sessions', authenticate, authCtrl.getSessions);

// Revoke a specific session
// DELETE /auth/sessions/:sessionId
router.delete('/auth/sessions/:sessionId', authenticate, authCtrl.revokeSession);

// ─────────────────────────────────────────────────────────
// OAUTH 2.0 ROUTES
// ─────────────────────────────────────────────────────────


// Step 1b: User gives consent to scopes
// POST /oauth/consent
router.post('/oauth/consent', oauthCtrl.consent);


// Introspect a token (RFC 7662) — for resource servers
// POST /oauth/introspect
router.post('/oauth/introspect', oauthCtrl.introspect);

// OIDC userinfo — get user claims from access token
// GET /oauth/userinfo
router.get('/oauth/userinfo', authenticate, oauthCtrl.userinfo);

// ─────────────────────────────────────────────────────────
// ADMIN ROUTES  (protect with your own admin auth in production)
// ─────────────────────────────────────────────────────────


// View audit logs
// GET /admin/audit-logs
router.get('/admin/audit-logs', adminCtrl.auditLogs);




// ## Complete Flow After the Fix
// ```
// User on App A → clicks Logout
//         │
//         ▼
// App A → POST /oauth/revoke (kills refresh token)
//         │
//         ▼
// App A → GET /auth/logout (SSO server)
//         │
//         ├── DELETE sessions row
//         ├── UPDATE refresh_tokens SET revoked_at (all)
//         ├── SELECT all client logout_uris for this user
//         │
//         ├──→ POST http://app-b.com/backchannel-logout { user_id }
//         │         └── App B destroys local session ✅
//         │
//         ├──→ POST http://app-c.com/backchannel-logout { user_id }
//         │         └── App C destroys local session ✅
//         │
//         └── DELETE user_client_sessions
//         │
//         ▼
// App A → clears its own session + cookies
//         │
//         ▼
// All apps logged out immediately ✅



module.exports = router;
