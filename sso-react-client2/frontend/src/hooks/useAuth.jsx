// src/hooks/useAuth.js
import { useState, useEffect, createContext, useContext } from 'react';
import { getMe, getLoginUrl, logout as apiLogout } from '../api/auth';

// ── Auth Context ──────────────────────────────
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);  // true while checking session

  // Check session on app load
  useEffect(() => {
    checkSession();
  }, []);

  async function checkSession() {
    try {
      const data = await getMe();
      setUser(data.user);
    } catch (err) {
      // 401 = not logged in, that's fine
      setUser(null);

      // If SSO logged us out, redirect to login
      if (err.response?.data?.error === 'sso_logout') {
        window.location.href = '/login?reason=sso_logout';
      }
    } finally {
      setLoading(false);
    }
  }

  async function login() {
    // Get SSO URL from backend, then redirect
    const sessionID = await getLoginUrl();
    return sessionID;
    // window.location.href = url;
  }

  async function logout() {
    const ssoLogoutUrl = await apiLogout();
    setUser(null);
    // Redirect to SSO logout (SSO will then redirect back to /login)
    window.location.href = ssoLogoutUrl;
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, checkSession }}>
      {children}
    </AuthContext.Provider>
  );
}

// Hook to use in any component
export function useAuth() {
  return useContext(AuthContext);
}
