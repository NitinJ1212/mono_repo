// src/hooks/useAuth.js
import { useState, useEffect, createContext, useContext } from 'react';
import { getMe, getLoginUrl, logoutApi } from '../api/auth';

const Ctx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // On app load → check session with backend
  useEffect(() => { checkSession(); }, []);

  async function checkSession() {
    try {
      const data = await getMe();
      setUser(data.user);
    } catch (err) {
      setUser(null);
      // If SSO kicked us out via backchannel
      if (err.response?.data?.error === 'sso_logout')
        window.location.href = '/login?reason=sso_logout';
    } finally {
      setLoading(false);
    }
  }

  async function login() {
    const url = await getLoginUrl();  // backend builds PKCE + SSO URL
    if (url.message) {
      alert(url.message);
    }
    window.location.href = url;       // redirect user to SSO server
  }

  async function logout() {
    const ssoUrl = await logoutApi(); // backend revokes token, destroys session
    setUser(null);
    window.location.href = ssoUrl;   // SSO global logout
  }

  return (
    <Ctx.Provider value={{ user, loading, login, logout, checkSession }}>
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);
