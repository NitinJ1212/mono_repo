// src/pages/LoginPage.jsx
import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import Login from '../components/Login';

/* ── Animated particle canvas background ────────────── */
function Particles() {
  const ref = useRef();
  useEffect(() => {
    const c = ref.current, ctx = c.getContext('2d');
    let W, H, pts = [], raf;
    const resize = () => { W = c.width = innerWidth; H = c.height = innerHeight; };
    resize();
    window.addEventListener('resize', resize);
    for (let i = 0; i < 60; i++) pts.push({
      x: Math.random() * 1400, y: Math.random() * 900,
      vx: (Math.random() - .5) * .2, vy: (Math.random() - .5) * .2,
      r: Math.random() * 1.5 + .3, o: Math.random() * .4 + .05,
    });
    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      pts.forEach(p => {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > W) p.vx *= -1;
        if (p.y < 0 || p.y > H) p.vy *= -1;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(200,169,126,${p.o})`; ctx.fill();
      });
      pts.forEach((a, i) => pts.slice(i + 1).forEach(b => {
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (d < 130) {
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
          ctx.strokeStyle = `rgba(200,169,126,${.07 * (1 - d / 130)})`;
          ctx.lineWidth = .6; ctx.stroke();
        }
      }));
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  }, []);
  return <canvas ref={ref} style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }} />;
}

/* ── Typewriter effect ───────────────────────────────── */
function Typewriter({ words = [] }) {
  const [idx, setIdx] = useState(0);
  const [text, setText] = useState('');
  const [deleting, setDeleting] = useState(false);
  useEffect(() => {
    const word = words[idx];
    const delay = deleting ? 45 : 90;
    const t = setTimeout(() => {
      if (!deleting) {
        if (text.length < word.length) setText(word.slice(0, text.length + 1));
        else setTimeout(() => setDeleting(true), 2000);
      } else {
        if (text.length > 0) setText(text.slice(0, -1));
        else { setDeleting(false); setIdx((idx + 1) % words.length); }
      }
    }, delay);
    return () => clearTimeout(t);
  }, [text, deleting, idx]);
  return <span style={{ color: '#c8a97e' }}>{text}<span style={{ animation: 'blink .9s step-end infinite' }}>_</span></span>;
}

/* ── Main Login Page ─────────────────────────────────── */
export default function LoginPage() {
  const { user, loading, login } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [busy, setBusy] = useState(false);
  const [btnHover, setBtnHover] = useState(false);

  // If already logged in → go to dashboard
  useEffect(() => {
    if (!loading && user) navigate('/dashboard', { replace: true });
  }, [user, loading]);

  // Error / status messages from URL params
  const error = params.get('error');
  const reason = params.get('reason');
  const loggedOut = params.get('logged_out');

  const alertMsg =
    // error === 'state_mismatch' ? { type: 'err', msg: '⚠  Security check failed. Please try again.' }
    //   : error === 'token_exchange_failed' ? { type: 'err', msg: '⚠  Login failed. Please try again.' }
    //     : error === 'access_denied' ? { type: 'err', msg: '⚠  Access was denied by SSO.' }
    //       : error === 'missing_code' ? { type: 'err', msg: '⚠  Authorization code missing.' }
    //         : reason === 'sso_logout' ? { type: 'info', msg: '◌  You were signed out by SSO.' }
    //           : reason === 'session_expired' ? { type: 'info', msg: '◌  Session expired. Please sign in again.' }
    //             : loggedOut ? { type: 'info', msg: '◌  You have been signed out successfully.' }
    //               : null;

    async function handleLogin() {
      if (busy) return;
      setBusy(true);
      try {
        const loggedin = await login();
        console.log(loggedin, "3333333333333333333333333333333----")
        if (loggedin) navigate('/profile', { replace: true });
      }
      catch (_) { setBusy(false); }
    }

  if (loading) return null;

  return (
    <div style={s.page}>
      <Particles />
      {/* radial dark overlay */}
      <div style={s.overlay} />

      {/* ─── LEFT — Branding panel ─── */}
      <div style={s.left}>
        <div style={s.leftContent}>

          {/* Logo */}
          <div style={s.logo}>
            <div style={s.logoIcon}>
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                <rect x="1" y="1" width="20" height="20" rx="6" stroke="#c8a97e" strokeWidth="1.3" />
                <circle cx="11" cy="11" r="4" stroke="#c8a97e" strokeWidth="1.3" />
                <path d="M11 7v2M11 13v2M7 11h2M13 11h2" stroke="#c8a97e" strokeWidth="1.3" strokeLinecap="round" />
              </svg>
            </div>
            <span style={s.logoText}>NEXUS SSO</span>
          </div>

          {/* Headline with typewriter */}
          <div style={s.headline}>
            <p style={s.headlineSmall}>One login for</p>
            <h1 style={s.headlineBig}>
              <Typewriter words={['your team.', 'developers.', 'enterprise.', 'the future.']} />
            </h1>
          </div>

          {/* Feature list */}
          <div style={s.featureList}>
            {[
              { icon: '⎆', title: 'PKCE + RS256', desc: 'Authorization code flow with asymmetric JWT signing' },
              { icon: '⟳', title: 'Silent Refresh', desc: 'Tokens rotate automatically before expiry' },
              { icon: '⊗', title: 'Global Logout', desc: 'Backchannel propagation across all client apps' },
              { icon: '◈', title: 'CSRF Protected', desc: 'State parameter verification on every login' },
            ].map((f, i) => (
              <div key={i} style={s.feature}>
                <div style={s.featureIcon}>{f.icon}</div>
                <div>
                  <div style={s.featureTitle}>{f.title}</div>
                  <div style={s.featureDesc}>{f.desc}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Version tag */}
          <div style={s.versionTag}>
            <span style={s.versionDot} />
            RFC 6749 · OIDC Core 1.0 · v2.4.1
          </div>
        </div>
      </div>

      {/* ─── RIGHT — Login Card ─── */}
      <div style={s.right}>
        <div style={s.card}>

          {/* Terminal top bar */}
          <div style={s.cardBar}>
            <div style={s.barDots}>
              {['#ff5f57', '#febc2e', '#28c840'].map((c, i) => (
                <div key={i} style={{ width: 11, height: 11, borderRadius: '50%', background: c, opacity: .8 }} />
              ))}
            </div>
            <span style={s.barLabel}>sso.auth — secure handshake</span>
            <div style={s.barStatus}>
              <span style={s.barStatusDot} />
              <span>TLS 1.3</span>
            </div>
          </div>

          {/* Card body */}
          <div style={s.cardBody}>

            {/* Shield icon */}
            <div style={s.shieldWrap}>
              <div style={s.shieldOuter}>
                <div style={s.shieldInner}>
                  <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                    <path d="M16 3L4 8v8c0 7 5.3 13.5 12 15 6.7-1.5 12-8 12-15V8L16 3z"
                      stroke="#c8a97e" strokeWidth="1.3" strokeLinejoin="round" fill="none" />
                    <path d="M11 16l3.5 3.5L21 12" stroke="#c8a97e" strokeWidth="1.5"
                      strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </div>
            </div>

            <h2 style={s.cardTitle}>Welcome back</h2>
            <p style={s.cardSub}>Sign in with your SSO identity provider</p>

            {/* Alert message */}
            {alertMsg && (
              <div style={{ ...s.alert, ...(alertMsg.type === 'err' ? s.alertErr : s.alertInfo) }}>
                {alertMsg.msg}
              </div>
            )}

            {/* SSO Login Button */}
            {/* <button
              onClick={handleLogin}
              disabled={busy}
              onMouseEnter={() => setBtnHover(true)}
              onMouseLeave={() => setBtnHover(false)}
              style={{
                ...s.btn,
                ...(btnHover && !busy ? s.btnHover : {}),
                ...(busy ? s.btnBusy : {}),
              }}
            >
              {busy ? (
                <div style={s.btnRow}>
                  <span style={s.spinner} />
                  <span>Redirecting to SSO server…</span>
                </div>
              ) : (
                <div style={s.btnRow}>
                  <svg width="17" height="17" viewBox="0 0 17 17" fill="none">
                    <rect x=".7" y=".7" width="15.6" height="15.6" rx="4.3" stroke="#1a0f04" strokeWidth="1.2" />
                    <path d="M5.5 8.5h6M8.5 5.5l3 3-3 3" stroke="#1a0f04" strokeWidth="1.3"
                      strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span>Continue with SSO</span>
                  <span style={{ marginLeft: 'auto', opacity: .5 }}>↗</span>
                </div>
              )}
            </button> */}
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => navigate('/signup', { replace: true })} style={{
                ...s.btn,
                ...(btnHover && !busy ? s.btnHover : {}),
                ...(busy ? s.btnBusy : {}),
              }}>Signup</button>
              <button onClick={() => navigate('/register', { replace: true })} style={{
                ...s.btn,
                ...(btnHover && !busy ? s.btnHover : {}),
                ...(busy ? s.btnBusy : {}),
              }}>Client Register</button>
            </div>
            {/* OAuth flow trace */}
            <div style={s.flowRow}>
              {[
                { label: 'This App', color: '#c8a97e', bg: 'rgba(200,169,126,.08)', border: 'rgba(200,169,126,.2)' },
                { label: '→', color: '#3f3f46', bg: 'transparent', border: 'transparent' },
                { label: 'SSO :3000', color: '#a78bfa', bg: 'rgba(167,139,250,.08)', border: 'rgba(167,139,250,.2)' },
                { label: '→', color: '#3f3f46', bg: 'transparent', border: 'transparent' },
                { label: 'Dashboard', color: '#4ade80', bg: 'rgba(74,222,128,.08)', border: 'rgba(74,222,128,.2)' },
              ].map((item, i) => (
                <span key={i} style={{
                  fontSize: '.58rem', fontFamily: "'DM Mono',monospace",
                  color: item.color, letterSpacing: '.05em',
                  ...(item.bg !== 'transparent' ? {
                    background: item.bg, border: `1px solid ${item.border}`,
                    padding: '2px 8px', borderRadius: 5,
                  } : {}),
                }}>{item.label}</span>
              ))}
            </div>

            {/* Security tags */}
            <div style={s.tags}>
              {['PKCE S256', 'RS256', 'AES Session', 'CSRF'].map((t, i) => (
                <div key={i} style={s.tag}>
                  <span style={s.tagDot} />
                  {t}
                </div>
              ))}
            </div>
          </div>

          {/* Card footer */}
          <div style={s.cardFoot}>
            <span>Protected by Nexus SSO</span>
            <span style={{ color: '#2a2a36' }}>·</span>
            <span>RFC 6749 compliant</span>
          </div>
        </div>
        <Login />
        <p style={s.finePrint}>
          By continuing you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>

      <style>{`
        @keyframes blink   { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes fadeUp  { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        @keyframes glowPulse { 0%,100%{opacity:.5} 50%{opacity:1} }
        @keyframes spinAni { to{transform:rotate(360deg)} }
        * { box-sizing:border-box; }
        body { background:#06060a; margin:0; }
      `}</style>
    </div>
  );
}

/* ── Styles ────────────────────────────────────── */
const G = '#c8a97e', BG = '#06060a', SURF = '#0d0d12', SURF2 = '#111117', BRD = '#1e1e2a';

const s = {
  page: {
    minHeight: '100vh', background: BG, display: 'flex', flexWrap: 'wrap',
    fontFamily: "'Fraunces',Georgia,serif", color: '#e2e0da', position: 'relative',
  },
  overlay: {
    position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
    background: 'radial-gradient(ellipse at 50% 50%, transparent 20%, rgba(6,6,10,.9) 100%)',
  },

  /* LEFT */
  left: {
    flex: '1 1 440px', minHeight: '100vh', display: 'flex',
    alignItems: 'center', justifyContent: 'center',
    padding: '64px 56px', position: 'relative', zIndex: 1,
    animation: 'fadeUp .7s ease both',
    borderRight: `1px solid ${BRD}`,
  },
  leftContent: { maxWidth: 400 },

  logo: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 72 },
  logoIcon: {
    width: 42, height: 42, display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'rgba(200,169,126,.07)', border: `1px solid rgba(200,169,126,.2)`, borderRadius: 11,
  },
  logoText: { fontFamily: "'DM Mono',monospace", fontSize: '.72rem', letterSpacing: '.25em', color: G },

  headline: { marginBottom: 60 },
  headlineSmall: {
    fontFamily: "'DM Mono',monospace", fontSize: '.63rem', letterSpacing: '.2em',
    color: '#52525b', marginBottom: 10, textTransform: 'uppercase',
  },
  headlineBig: {
    fontSize: 'clamp(2rem,3.2vw,3rem)', fontWeight: 300, fontStyle: 'italic',
    color: '#e8e0d4', lineHeight: 1.15, letterSpacing: '-.01em',
  },

  featureList: { display: 'flex', flexDirection: 'column', gap: 22, marginBottom: 60 },
  feature: { display: 'flex', gap: 16, alignItems: 'flex-start' },
  featureIcon: {
    width: 38, height: 38, flexShrink: 0, display: 'flex', alignItems: 'center',
    justifyContent: 'center', background: 'rgba(200,169,126,.06)',
    border: `1px solid rgba(200,169,126,.14)`, borderRadius: 9,
    color: G, fontSize: '1rem',
  },
  featureTitle: {
    fontFamily: "'DM Mono',monospace", fontSize: '.67rem',
    letterSpacing: '.08em', color: '#a1a1aa', marginBottom: 3,
  },
  featureDesc: { fontSize: '.72rem', color: '#52525b', lineHeight: 1.6 },

  versionTag: {
    display: 'flex', alignItems: 'center', gap: 9,
    fontFamily: "'DM Mono',monospace", fontSize: '.58rem', letterSpacing: '.1em', color: '#3f3f46',
  },
  versionDot: {
    width: 6, height: 6, borderRadius: '50%', background: 'rgba(200,169,126,.5)',
    boxShadow: '0 0 6px rgba(200,169,126,.3)', animation: 'glowPulse 3s ease infinite',
  },

  /* RIGHT */
  right: {
    flex: '1 1 420px', minHeight: '100vh', display: 'flex',
    flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    padding: '64px 56px', position: 'relative', zIndex: 1,
    animation: 'fadeUp .7s .12s ease both',
  },
  card: {
    width: '100%', maxWidth: 430, background: SURF,
    border: `1px solid ${BRD}`, borderRadius: 18, overflow: 'hidden',
    boxShadow: '0 40px 100px rgba(0,0,0,.65), 0 0 0 1px rgba(200,169,126,.05)',
  },

  /* Terminal bar */
  cardBar: {
    display: 'flex', alignItems: 'center', gap: 10, padding: '11px 18px',
    background: SURF2, borderBottom: `1px solid ${BRD}`,
  },
  barDots: { display: 'flex', gap: 6, marginRight: 4 },
  barLabel: { fontFamily: "'DM Mono',monospace", fontSize: '.58rem', letterSpacing: '.07em', color: '#3f3f46', flex: 1, textAlign: 'center' },
  barStatus: { display: 'flex', alignItems: 'center', gap: 5, fontFamily: "'DM Mono',monospace", fontSize: '.55rem', color: '#4ade80' },
  barStatusDot: { width: 5, height: 5, borderRadius: '50%', background: '#4ade80', boxShadow: '0 0 5px #4ade80', animation: 'glowPulse 2s infinite' },

  /* Card body */
  cardBody: { padding: '36px 32px 28px' },
  shieldWrap: { display: 'flex', justifyContent: 'center', marginBottom: 20 },
  shieldOuter: {
    width: 72, height: 72, borderRadius: '50%',
    border: `1px solid rgba(200,169,126,.15)`,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    animation: 'glowPulse 3s ease infinite',
  },
  shieldInner: {
    width: 58, height: 58, borderRadius: '50%',
    background: 'rgba(200,169,126,.07)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  cardTitle: {
    textAlign: 'center', fontSize: '1.6rem', fontWeight: 300,
    fontStyle: 'italic', color: '#e8e0d4', marginBottom: 8,
  },
  cardSub: { textAlign: 'center', fontSize: '.77rem', color: '#52525b', marginBottom: 28, lineHeight: 1.6 },

  alert: {
    borderRadius: 10, padding: '11px 14px', marginBottom: 24,
    fontFamily: "'DM Mono',monospace", fontSize: '.71rem', lineHeight: 1.6,
  },
  alertErr: { background: 'rgba(239,68,68,.06)', border: '1px solid rgba(239,68,68,.2)', color: '#fca5a5' },
  alertInfo: { background: 'rgba(200,169,126,.06)', border: `1px solid rgba(200,169,126,.18)`, color: G },

  /* Button */
  btn: {
    width: '100%', padding: '14px 20px', marginBottom: 24,
    background: `linear-gradient(135deg, #c8a97e, #a07840)`,
    border: 'none', borderRadius: 12, cursor: 'pointer',
    transition: 'all .22s',
  },
  btnHover: {
    background: `linear-gradient(135deg, #dbbf94, #c8a97e)`,
    transform: 'translateY(-1px)',
    boxShadow: '0 10px 32px rgba(200,169,126,.22)',
  },
  btnBusy: { opacity: .65, cursor: 'not-allowed', transform: 'none' },
  btnRow: {
    display: 'flex', alignItems: 'center', gap: 10,
    color: '#1a0f04', fontWeight: 500, fontSize: '.82rem',
    letterSpacing: '.04em', fontFamily: "'DM Mono',monospace",
  },
  spinner: {
    width: 15, height: 15, borderRadius: '50%', flexShrink: 0,
    border: '2px solid rgba(26,15,4,.2)', borderTop: '2px solid #1a0f04',
    animation: 'spinAni .75s linear infinite',
  },

  /* Flow row */
  flowRow: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    gap: 7, flexWrap: 'wrap', marginBottom: 22,
  },

  /* Tags */
  tags: { display: 'flex', flexWrap: 'wrap', gap: 7, justifyContent: 'center' },
  tag: {
    display: 'flex', alignItems: 'center', gap: 5,
    background: 'rgba(255,255,255,.03)', border: `1px solid ${BRD}`,
    borderRadius: 6, padding: '4px 10px',
    fontFamily: "'DM Mono',monospace", fontSize: '.57rem',
    letterSpacing: '.08em', color: '#52525b',
  },
  tagDot: { width: 5, height: 5, borderRadius: '50%', background: G, opacity: .55 },

  /* Card footer */
  cardFoot: {
    display: 'flex', gap: 10, justifyContent: 'center', alignItems: 'center',
    padding: '13px 32px', borderTop: `1px solid ${BRD}`, background: SURF2,
    fontFamily: "'DM Mono',monospace", fontSize: '.57rem', letterSpacing: '.06em', color: '#3f3f46',
  },

  finePrint: {
    marginTop: 18, fontFamily: "'DM Mono',monospace", fontSize: '.57rem',
    letterSpacing: '.04em', color: '#2a2a36', textAlign: 'center', maxWidth: 380, lineHeight: 1.6,
  },
};
