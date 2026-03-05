# SSO Server — Node.js + Express

Authorization Code + PKCE · JWT (RS256) · OIDC · PostgreSQL · Redis

---

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Copy env and fill in your values
cp .env.example .env

# 3. Generate RSA key pair (run ONCE)
node src/utils/generateKeys.js

# 4. Run DB migrations
node src/db/migrate.js

# 5. Start server
npm run dev
```

---

## Complete API Reference

### Discovery (public)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/.well-known/openid-configuration` | OIDC discovery document |
| GET | `/.well-known/jwks.json` | Public RSA keys for JWT verification |

---

### Auth APIs

#### POST /auth/register
```json
{ "email": "user@example.com", "password": "min8chars", "name": "John" }
```

#### POST /auth/login
```json
{ "email": "user@example.com", "password": "...", "session_id": "optional_oauth_session" }
```
Returns: `{ mfa_required: true, mfa_session }` if MFA enabled
OR: `{ redirect_uri }` if part of OAuth flow
OR: `{ user, session_id }` for plain login

#### POST /auth/mfa/verify
```json
{ "mfa_token": "123456", "session_id": "mfa_pending_token" }
```

#### GET /auth/mfa/setup  🔒 (Bearer token required)
Returns QR code to scan in authenticator app

#### POST /auth/mfa/confirm  🔒
```json
{ "token": "123456" }
```

#### GET /auth/logout
Query: `?id_token_hint=...&post_logout_redirect_uri=https://myapp.com/done`
Destroys session, revokes all refresh tokens

#### GET /auth/sessions  🔒
Returns all active sessions for current user

#### DELETE /auth/sessions/:sessionId  🔒
Revoke a specific session

---

### OAuth 2.0 APIs

#### GET /oauth/authorize
```
?client_id=...
&redirect_uri=https://myapp.com/callback
&response_type=code
&scope=openid profile email
&state=random_csrf_value
&code_challenge=BASE64URL(SHA256(verifier))
&code_challenge_method=S256
```
Returns: `{ action: "login_required", session_id }` or redirects with code

#### POST /oauth/consent
```json
{ "session_id": "pending_auth_id", "approved": true }
```

#### POST /oauth/token — Exchange code
```
grant_type=authorization_code
&code=AUTH_CODE
&redirect_uri=https://myapp.com/callback
&client_id=...
&client_secret=...
&code_verifier=PKCE_VERIFIER
```
Returns: `{ access_token, refresh_token, id_token, expires_in }`

#### POST /oauth/token — Refresh
```
grant_type=refresh_token
&refresh_token=...
&client_id=...
&client_secret=...
```

#### POST /oauth/revoke
```
token=...&client_id=...&client_secret=...
```

#### POST /oauth/introspect
```
token=...&client_id=...&client_secret=...
```

#### GET /oauth/userinfo  🔒
Returns user claims from access token

---

### Admin APIs

| Method | Path | Description |
|--------|------|-------------|
| POST | `/admin/clients` | Register new client app |
| GET | `/admin/clients` | List all clients |
| GET | `/admin/clients/:id` | Get client details |
| PUT | `/admin/clients/:id` | Update client |
| POST | `/admin/clients/:id/rotate-secret` | Rotate client secret |
| DELETE | `/admin/clients/:id` | Delete client |
| GET | `/admin/audit-logs` | View audit logs |

#### Register client body:
```json
{
  "name": "My App",
  "redirect_uris": ["https://myapp.com/auth/callback"],
  "allowed_scopes": ["openid", "profile", "email"],
  "grant_types": ["authorization_code", "refresh_token"]
}
```

---

## Project Structure

```
src/
├── app.js                    ← Express entry point
├── config/
│   └── jwt.js               ← RS256 key loading + sign/verify helpers
├── db/
│   ├── index.js             ← PG pool + Redis client
│   └── migrate.js           ← Run to create all tables
├── middleware/
│   ├── authenticate.js      ← Bearer JWT + session middleware
│   └── rateLimiter.js       ← Per-route rate limits
├── controllers/
│   ├── authController.js    ← register, login, MFA, logout, sessions
│   ├── oauthController.js   ← authorize, token, revoke, introspect, userinfo
│   ├── adminController.js   ← client CRUD + audit logs
│   └── discoveryController.js ← JWKS + openid-config
├── routes/
│   └── index.js             ← All route definitions
└── utils/
    ├── crypto.js            ← Token generation, PKCE, hashing
    ├── validators.js        ← Zod schemas + middleware
    ├── audit.js             ← Audit log helper
    └── generateKeys.js      ← Run once to create RSA keys

client-example/
└── ssoClient.js             ← How to integrate from a client app
```

---

## Security Checklist

- [x] PKCE (S256) mandatory on all auth code flows
- [x] Refresh token rotation (one-time use)
- [x] Token family reuse detection → revoke all
- [x] RS256 asymmetric JWT signing
- [x] Tokens hashed in DB (SHA256)
- [x] Passwords hashed with bcrypt (rounds=12)
- [x] HttpOnly + Secure + SameSite cookies
- [x] Rate limiting on login/token/register
- [x] Account lockout after 5 failed attempts
- [x] Exact redirect_uri validation
- [x] Audit logging on all auth events
- [x] Access token JTI blacklisting on revoke
