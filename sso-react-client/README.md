# SSO React Client — React Frontend + Express Backend

## Project Structure

```
sso-react-client/
├── backend/                 ← Express.js (port 4000)
│   ├── src/
│   │   ├── app.js           ← Entry point
│   │   ├── redis.js         ← Redis client
│   │   ├── ssoHelper.js     ← All SSO API calls
│   │   ├── middleware/
│   │   │   └── auth.js      ← Protect routes + auto-refresh
│   │   └── routes/
│   │       └── index.js     ← All API routes
│   ├── .env                 ← Config
│   └── package.json
│
└── frontend/                ← React + Vite (port 5173)
    ├── src/
    │   ├── main.jsx          ← Entry point
    │   ├── App.jsx           ← Router setup
    │   ├── api/
    │   │   └── auth.js       ← Backend API calls
    │   ├── hooks/
    │   │   └── useAuth.js    ← Auth state (context + hook)
    │   ├── components/
    │   │   └── ProtectedRoute.jsx
    │   └── pages/
    │       ├── LoginPage.jsx
    │       └── ProfilePage.jsx
    ├── vite.config.js        ← Proxy /api → backend
    └── package.json
```

---

## Setup

### Step 1 — Register client in SSO Server

```
POST http://localhost:3000/admin/clients
{
  "name": "React Client App",
  "redirect_uris": ["http://localhost:4008/auth/callback"],
  "allowed_scopes": ["openid", "profile", "email"],
  "grant_types": ["authorization_code", "refresh_token"]
}
```

Copy `client_id` and `client_secret` from response.

### Step 2 — Update logout_uri for auto-logout

```sql
UPDATE clients
SET logout_uri = 'http://localhost:4008/backchannel-logout'
WHERE client_id = 'your-client-id';
```

### Step 3 — Configure backend .env

```env
CLIENT_ID=your-client-id-from-step-1
CLIENT_SECRET=your-client-secret-from-step-1
SSO_SERVER=http://localhost:3000
REDIRECT_URI=http://localhost:4008/auth/callback
FRONTEND_URL=http://localhost:5173
```

### Step 4 — Run backend

```bash
cd backend
npm install
npm run dev
```

### Step 5 — Run frontend

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173

---

## How It Works

### Login Flow
```
1. User opens http://localhost:5173
2. ProtectedRoute → calls GET /api/auth/me → 401 → redirect /login
3. User clicks "Continue with SSO"
4. React → GET /api/auth/login → backend returns SSO URL
5. React: window.location.href = ssoUrl
6. Browser goes to SSO Server login page
7. User logs in at SSO (localhost:3000)
8. SSO redirects browser → GET http://localhost:4008/auth/callback?code=...&state=...
9. Backend:
   - Verifies state (CSRF check)
   - Exchanges code + code_verifier → access_token + refresh_token
   - Gets user info from SSO /oauth/userinfo
   - Saves user + tokens in session
10. Backend redirects → http://localhost:5173/profile
11. React ProfilePage → GET /api/auth/me → gets user data
12. Profile displayed ✅
```

### Auto-Logout Flow
```
1. User logs out from another app
2. SSO calls POST http://localhost:4008/backchannel-logout { user_id }
3. Backend sets Redis: logged_out:<user_id> = "1"
4. Next API call from React hits requireAuth middleware
5. Middleware sees Redis flag → destroys session → returns 401
6. React useAuth catches 401 → redirects to /login
```

### Token Auto-Refresh
```
Every API call → requireAuth middleware checks tokenExpiresAt
If expiring within 60 seconds → silently calls SSO refresh endpoint
New tokens saved in session → request continues normally
User never sees any interruption
```

---

## API Routes

| Route | Description |
|-------|-------------|
| GET /api/auth/login | Returns SSO authorize URL |
| GET /auth/callback | SSO redirects here (backend handles) |
| GET /api/auth/me | Returns current user from session |
| GET /api/auth/logout | Revokes token + returns SSO logout URL |
| GET /api/profile | Protected — returns full profile + token info |
| POST /backchannel-logout | SSO calls this for auto-logout |
