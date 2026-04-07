// src/api/auth.js
import axios from 'axios';

// axios with credentials (sends cookies automatically)
const api = axios.create({
  baseURL: 'http://localhost:4008/api',
  withCredentials: true,   // IMPORTANT: sends session cookie to backend
});

// ── Check if user is logged in ────────────────
export async function getMe() {
  const res = await api.get('/auth/me');
  return res.data;  // { user: { id, email, name, emailVerified }, tokenExpiresAt }
}

// ── Get SSO login URL from backend ───────────
export async function getLoginUrl() {
  const res = await api.get('/auth/login');
  return res.data;  // SSO authorize URL
}

// ── Get full profile ──────────────────────────
export async function getProfile() {
  const res = await api.get('/profile');
  return res.data;
}

// ── Logout ────────────────────────────────────
export async function logout() {
  const res = await api.get('/auth/logout');
  return res.data.logoutUrl;  // SSO logout URL to redirect to
}
