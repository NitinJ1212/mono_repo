// src/pages/LoginPage.jsx
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function LoginPage() {
  const { user, login, loading } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [loggingIn, setLoggingIn] = useState(false);

  const error = params.get('error');
  const reason = params.get('reason');
  const loggedOut = params.get('logged_out');
  const sessionID = params.get('session_id');

  // Already logged in? Go to profile
  useEffect(() => {
    if (!loading && user) navigate('/profile', { replace: true });
  }, [user, loading]);

  async function handleLogin() {
    setLoggingIn(true);
    try {
      const sessionId = await login();
      if (sessionId?.session_id) {
        window.location.href = `http://localhost:5174/login?session_id=${sessionId?.session_id}`;
      } else {
        setLoggingIn(false);
        alert("Login failed. Please try again.Error :: " + JSON.stringify(sessionId?.message));
      }
    } catch (err) {
      setLoggingIn(false);
    }
  }

  const errorMsg = error === 'state_mismatch' ? 'Security check failed. Please try again.'
    : error === 'token_exchange_failed' ? 'Login failed. Please try again.'
      : error === 'access_denied' ? 'Access was denied.'
        : reason === 'sso_logout' ? 'You were logged out by SSO.'
          : reason === 'session_expired' ? 'Your session expired. Please login again.'
            : loggedOut ? 'You have been logged out.'
              : null;

  return (
    <div style={styles.page}>
      {/* Background grid */}
      <div style={styles.grid} />

      {/* Glow orb */}
      <div style={styles.orb} />

      <div style={styles.card}>
        {/* Logo mark */}
        <div style={styles.logoWrap}>
          <div style={styles.logoRing}>
            <div style={styles.logoDot} />
          </div>
        </div>

        <div style={styles.badge}>SSO PROTECTED</div>

        <h1 style={styles.h1}>Welcome back2</h1>
        <p style={styles.sub}>Sign in securely via your SSO identity provider</p>

        {errorMsg && (
          <div style={styles.errorBox}>
            ⚠ {errorMsg}
          </div>
        )}

        <button
          onClick={handleLogin}
          disabled={loggingIn || loading}
          style={{ ...styles.btn, ...(loggingIn ? styles.btnLoading : {}) }}
        >
          {loggingIn ? (
            <>
              <span style={styles.spinner} />
              Redirecting to SSO...
            </>
          ) : (
            <>
              <span style={styles.btnIcon}>⎆</span>
              Continue with SSO
            </>
          )}
        </button>

        <p style={styles.hint}>
          You will be redirected to the SSO server to authenticate
        </p>

        {/* Flow indicator */}
        <div style={styles.flow}>
          {['This App', '→', 'SSO Server', '→', 'Profile'].map((s, i) => (
            <span key={i} style={i % 2 === 1 ? styles.flowArrow : styles.flowStep}>{s}</span>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity:0; transform: translateY(16px); } to { opacity:1; transform:translateY(0); } }
        @keyframes pulse { 0%,100%{opacity:.6} 50%{opacity:1} }
      `}</style>
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    background: '#070709',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: 'Outfit, sans-serif',
    position: 'relative',
    overflow: 'hidden',
  },
  grid: {
    position: 'fixed', inset: 0, pointerEvents: 'none',
    backgroundImage: 'linear-gradient(rgba(74,222,128,.03) 1px,transparent 1px),linear-gradient(90deg,rgba(74,222,128,.03) 1px,transparent 1px)',
    backgroundSize: '32px 32px',
  },
  orb: {
    position: 'absolute', width: 500, height: 500,
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(74,222,128,0.06) 0%, transparent 70%)',
    top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
    pointerEvents: 'none',
  },
  card: {
    position: 'relative', zIndex: 1,
    background: 'rgba(14,14,18,0.95)',
    border: '1px solid #1e1e2a',
    borderRadius: 20,
    padding: '48px 40px',
    width: '100%', maxWidth: 420,
    textAlign: 'center',
    animation: 'fadeIn .6s ease both',
    boxShadow: '0 0 60px rgba(0,0,0,.5)',
  },
  logoWrap: {
    display: 'flex', justifyContent: 'center', marginBottom: 28,
  },
  logoRing: {
    width: 64, height: 64, borderRadius: '50%',
    border: '2px solid rgba(74,222,128,.3)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    animation: 'pulse 2.5s ease infinite',
  },
  logoDot: {
    width: 24, height: 24, borderRadius: '50%',
    background: 'radial-gradient(circle, #4ade80, #22d3ee)',
    boxShadow: '0 0 20px rgba(74,222,128,.5)',
  },
  badge: {
    display: 'inline-block',
    fontFamily: 'DM Mono, monospace',
    fontSize: 10, letterSpacing: '.2em', color: '#4ade80',
    background: 'rgba(74,222,128,.08)',
    border: '1px solid rgba(74,222,128,.2)',
    padding: '3px 12px', borderRadius: 999, marginBottom: 20,
  },
  h1: {
    fontSize: '1.9rem', fontWeight: 700, color: '#f1f5f9',
    marginBottom: 8, letterSpacing: '-.02em',
  },
  sub: {
    fontSize: '.85rem', color: '#52525b', marginBottom: 32, lineHeight: 1.6,
  },
  errorBox: {
    background: 'rgba(239,68,68,.08)',
    border: '1px solid rgba(239,68,68,.2)',
    borderRadius: 10, padding: '12px 16px',
    fontSize: '.8rem', color: '#fca5a5',
    marginBottom: 24, textAlign: 'left',
  },
  btn: {
    width: '100%',
    background: 'linear-gradient(135deg, #4ade80, #22d3ee)',
    color: '#000', fontWeight: 700, fontSize: '.9rem',
    border: 'none', borderRadius: 12,
    padding: '14px 24px', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
    transition: 'opacity .2s, transform .2s',
    fontFamily: 'Outfit, sans-serif',
  },
  btnLoading: { opacity: .7, cursor: 'not-allowed' },
  btnIcon: { fontSize: '1.1rem' },
  spinner: {
    width: 16, height: 16, borderRadius: '50%',
    border: '2px solid rgba(0,0,0,.2)',
    borderTop: '2px solid #000',
    display: 'inline-block',
    animation: 'spin .8s linear infinite',
  },
  hint: {
    fontSize: '.72rem', color: '#3f3f46',
    marginTop: 16, fontFamily: 'DM Mono, monospace',
  },
  flow: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    gap: 8, marginTop: 32,
    borderTop: '1px solid #1e1e2a', paddingTop: 24,
  },
  flowStep: {
    fontSize: '.65rem', color: '#4ade80',
    background: 'rgba(74,222,128,.06)',
    border: '1px solid rgba(74,222,128,.15)',
    padding: '3px 10px', borderRadius: 6,
    fontFamily: 'DM Mono, monospace',
  },
  flowArrow: { fontSize: '.7rem', color: '#3f3f46' },
};
