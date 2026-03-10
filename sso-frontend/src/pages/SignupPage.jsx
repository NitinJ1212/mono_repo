// ─────────────────────────────────────────────────────────────
//  SignupPage.jsx  —  User Registration
//  API: POST http://localhost:5000/api/auth-sso/auth/register
//  Add to App.jsx: <Route path="/signup" element={<SignupPage />} />
// ─────────────────────────────────────────────────────────────
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';

const SSO_BASE = 'http://localhost:5000/api/auth-sso'; // ← your SSO server

// ═══════════════════════════════════════════════════════════
//  API  —  axios POST /auth/register
// ═══════════════════════════════════════════════════════════
async function registerUser({ name, email, password }) {
  try {
    const { data } = await axios.post(`${SSO_BASE}/auth/register`, {
      name,
      email,
      password,
    });
    return data;
  } catch (err) {
    // axios puts server response inside err.response.data
    const msg =
      err.response?.data?.error   ||
      err.response?.data?.message ||
      err.message                 ||
      'Registration failed';
    throw new Error(msg);
  }
}

// ═══════════════════════════════════════════════════════════
//  SUB-COMPONENT: InputField
// ═══════════════════════════════════════════════════════════
function InputField({ label, type = 'text', value, onChange, placeholder, error, hint, icon }) {
  const [focused, setFocused] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const isPassword = type === 'password';

  return (
    <div style={c.fieldWrap}>
      <label style={c.label}>{label}</label>
      {hint && <p style={c.hint}>{hint}</p>}
      <div style={{ position: 'relative' }}>
        {icon && (
          <span style={c.iconLeft}>{icon}</span>
        )}
        <input
          type={isPassword && showPwd ? 'text' : type}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            ...c.input,
            borderColor: error ? '#fb7185' : focused ? '#c8a97e' : '#1e1e2a',
            paddingLeft:  icon ? 40 : 14,
            paddingRight: isPassword ? 44 : 14,
          }}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPwd(v => !v)}
            style={c.eyeBtn}
            tabIndex={-1}
          >
            {showPwd ? '🙈' : '👁'}
          </button>
        )}
      </div>
      {error && <p style={c.errorMsg}>⚠ {error}</p>}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
//  SUB-COMPONENT: PasswordStrength
// ═══════════════════════════════════════════════════════════
function PasswordStrength({ password }) {
  const checks = [
    { label: '8+ characters',       pass: password.length >= 8 },
    { label: 'Uppercase letter',    pass: /[A-Z]/.test(password) },
    { label: 'Lowercase letter',    pass: /[a-z]/.test(password) },
    { label: 'Number',              pass: /\d/.test(password) },
    { label: 'Special char (!@#$)', pass: /[!@#$%^&*]/.test(password) },
  ];

  const score  = checks.filter(c => c.pass).length;
  const colors = ['#fb7185', '#fb7185', '#fbbf24', '#fbbf24', '#4ade80'];
  const labels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong'];
  const color  = colors[score - 1] || '#3f3f46';
  const label  = score > 0 ? labels[score - 1] : '';

  if (!password) return null;

  return (
    <div style={c.strengthWrap}>
      <div style={c.strengthBar}>
        {[1,2,3,4,5].map(i => (
          <div key={i} style={{
            ...c.strengthSeg,
            background: i <= score ? color : '#1e1e2a',
            transition: 'background .25s',
          }}/>
        ))}
        <span style={{ ...c.strengthLabel, color }}>{label}</span>
      </div>
      <div style={c.checkList}>
        {checks.map((ch, i) => (
          <span key={i} style={{ ...c.checkItem, color: ch.pass ? '#4ade80' : '#52525b' }}>
            {ch.pass ? '✓' : '○'} {ch.label}
          </span>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
//  SUB-COMPONENT: SuccessCard
// ═══════════════════════════════════════════════════════════
function SuccessCard({ name, email, onLogin }) {
  return (
    <div style={c.successCard}>
      <div style={c.successOrb}>
        <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
          <circle cx="22" cy="22" r="21" stroke="#4ade80" strokeWidth="1.4"/>
          <path d="M13 22l6 6 12-12" stroke="#4ade80" strokeWidth="1.8"
            strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
      <h3 style={c.successTitle}>Account Created!</h3>
      <p style={c.successSub}>Welcome, <strong style={{ color: '#c8a97e' }}>{name || email}</strong></p>
      <div style={c.successInfo}>
        <div style={c.successRow}>
          <span style={c.successKey}>Email</span>
          <span style={c.successVal}>{email}</span>
        </div>
        <div style={c.successRow}>
          <span style={c.successKey}>Status</span>
          <span style={{ ...c.successVal, color: '#4ade80' }}>● Active</span>
        </div>
        <div style={c.successRow}>
          <span style={c.successKey}>MFA</span>
          <span style={{ ...c.successVal, color: '#fbbf24' }}>Not configured</span>
        </div>
      </div>
      <button onClick={onLogin} style={c.loginBtn}>
        Continue to Login →
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
//  SUB-COMPONENT: Divider
// ═══════════════════════════════════════════════════════════
function Divider({ text }) {
  return (
    <div style={c.divider}>
      <div style={c.dividerLine}/>
      <span style={c.dividerText}>{text}</span>
      <div style={c.dividerLine}/>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
//  MAIN: SignupPage
// ═══════════════════════════════════════════════════════════
export default function SignupPage() {
  const navigate = useNavigate();

  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(null);
  const [agreed, setAgreed] = useState(false);

  function set(key, val) {
    setForm(f => ({ ...f, [key]: val }));
    setErrors(e => ({ ...e, [key]: '' }));
    setApiError('');
  }

  function validate() {
    const e = {};

    if (!form.name.trim())
      e.name = 'Full name is required';
    else if (form.name.trim().length < 2)
      e.name = 'Name must be at least 2 characters';

    if (!form.email.trim())
      e.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      e.email = 'Enter a valid email address';

    if (!form.password)
      e.password = 'Password is required';
    else if (form.password.length < 8)
      e.password = 'Password must be at least 8 characters';

    if (!form.confirm)
      e.confirm = 'Please confirm your password';
    else if (form.confirm !== form.password)
      e.confirm = 'Passwords do not match';

    if (!agreed)
      e.agreed = 'You must agree to the terms';

    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) return;
    setLoading(true);
    setApiError('');
    try {
      await registerUser({
        name:     form.name.trim(),
        email:    form.email.trim().toLowerCase(),
        password: form.password,
      });
      setSuccess({ name: form.name.trim(), email: form.email.trim() });
    } catch (err) {
      const msg = err.message;
      if (msg.includes('email') || msg === 'email_taken')
        setErrors(e => ({ ...e, email: 'This email is already registered' }));
      else
        setApiError(msg);
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div style={c.page}>
        <Bg />
        <div style={c.center}>
          <SuccessCard
            name={success.name}
            email={success.email}
            onLogin={() => navigate('/login')}
          />
        </div>
        <Styles />
      </div>
    );
  }

  return (
    <div style={c.page}>
      <Bg />

      <div style={c.topbar}>
        <div style={c.brand}>
          <BrandIcon />
          <span style={c.brandName}>NEXUS SSO</span>
        </div>
        <Link to="/login" style={c.topLink}>Sign in instead →</Link>
      </div>

      <div style={c.body}>
        <div style={c.leftPanel}>
          <div style={c.leftInner}>
            <div style={c.eyebrow}>
              <div style={c.orb}/>
              CREATE ACCOUNT
            </div>
            <h1 style={c.heroTitle}>Join the<br/><em>SSO network</em></h1>
            <p style={c.heroDesc}>
              Register once — access all connected apps with a single login.
              Secured with bcrypt, RS256 JWT, and PKCE.
            </p>
            <div style={c.feats}>
              {[
                { icon: '🔐', title: 'bcrypt password',   desc: 'Your password is hashed with 12 salt rounds' },
                { icon: '⚡', title: 'Instant access',    desc: 'Login immediately after registration' },
                { icon: '🛡', title: 'MFA available',     desc: 'Enable TOTP 2FA anytime after signup' },
              ].map((f, i) => (
                <div key={i} style={c.feat}>
                  <div style={c.featIcon}>{f.icon}</div>
                  <div>
                    <div style={c.featTitle}>{f.title}</div>
                    <div style={c.featDesc}>{f.desc}</div>
                  </div>
                </div>
              ))}
            </div>
            <div style={c.alreadyHave}>
              Already have an account?{' '}
              <Link to="/login" style={{ color: '#c8a97e' }}>Sign in →</Link>
            </div>
          </div>
        </div>

        <div style={c.rightPanel}>
          <div style={c.card}>
            <div style={c.cardHead}>
              <div style={c.cardTitleRow}>
                <div style={c.shieldIcon}>
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M10 2L3 5v5c0 4.5 3 8.5 7 9 4-0.5 7-4.5 7-9V5l-7-3z"
                      stroke="#c8a97e" strokeWidth="1.2" strokeLinejoin="round"/>
                    <path d="M7 10l2 2 4-4" stroke="#c8a97e" strokeWidth="1.2"
                      strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div>
                  <h2 style={c.cardTitle}>Create your account</h2>
                  <p style={c.cardSub}>POST /auth/register → SSO Server</p>
                </div>
              </div>
            </div>

            <div style={c.cardBody}>
              {apiError && (
                <div style={c.apiErr}>⚠ {apiError}</div>
              )}

              <InputField
                label="Full Name"
                value={form.name}
                onChange={v => set('name', v)}
                placeholder="Nitin Kumar"
                error={errors.name}
                icon="✦"
              />

              <InputField
                label="Email Address"
                type="email"
                value={form.email}
                onChange={v => set('email', v)}
                placeholder="nitin@example.com"
                error={errors.email}
                icon="@"
              />

              <Divider text="set password" />

              <InputField
                label="Password"
                type="password"
                value={form.password}
                onChange={v => set('password', v)}
                placeholder="Min 8 characters"
                error={errors.password}
              />

              <PasswordStrength password={form.password} />

              <InputField
                label="Confirm Password"
                type="password"
                value={form.confirm}
                onChange={v => set('confirm', v)}
                placeholder="Repeat your password"
                error={errors.confirm}
              />

              <div
                style={c.termsRow}
                onClick={() => { setAgreed(v => !v); setErrors(e => ({ ...e, agreed: '' })); }}
              >
                <div style={{
                  ...c.checkbox,
                  borderColor: agreed ? '#c8a97e' : errors.agreed ? '#fb7185' : '#2a2a38',
                  background:  agreed ? '#c8a97e' : 'transparent',
                }}>
                  {agreed && <span style={{ color: '#1a0f04', fontSize: '.65rem', lineHeight: 1 }}>✓</span>}
                </div>
                <span style={c.termsText}>
                  I agree to the{' '}
                  <span style={{ color: '#c8a97e', cursor: 'pointer' }}>Terms of Service</span>
                  {' '}and{' '}
                  <span style={{ color: '#c8a97e', cursor: 'pointer' }}>Privacy Policy</span>
                </span>
              </div>
              {errors.agreed && <p style={c.errorMsg}>⚠ {errors.agreed}</p>}

              <button
                onClick={handleSubmit}
                disabled={loading}
                style={{ ...c.submitBtn, opacity: loading ? .7 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}
              >
                {loading ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center' }}>
                    <span style={c.spinner}/>
                    Creating account…
                  </span>
                ) : 'Create Account →'}
              </button>
            </div>

            <div style={c.cardFoot}>
              <span>Already registered?</span>
              <Link to="/login" style={{ color: '#c8a97e', textDecoration: 'none' }}>Sign in here →</Link>
            </div>
          </div>
        </div>
      </div>

      <Styles />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
//  HELPERS
// ═══════════════════════════════════════════════════════════
function Bg() {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
      backgroundImage: `
        linear-gradient(rgba(200,169,126,.016) 1px, transparent 1px),
        linear-gradient(90deg, rgba(200,169,126,.016) 1px, transparent 1px)`,
      backgroundSize: '32px 32px',
    }}/>
  );
}

function BrandIcon() {
  return (
    <div style={{ width:30, height:30, display:'flex', alignItems:'center', justifyContent:'center',
      background:'rgba(200,169,126,.07)', border:'1px solid rgba(200,169,126,.2)', borderRadius:7 }}>
      <svg width="15" height="15" viewBox="0 0 22 22" fill="none">
        <rect x="1" y="1" width="20" height="20" rx="6" stroke="#c8a97e" strokeWidth="1.3"/>
        <circle cx="11" cy="11" r="4" stroke="#c8a97e" strokeWidth="1.3"/>
      </svg>
    </div>
  );
}

function Styles() {
  return (
    <style>{`
      @keyframes fadeUp  { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
      @keyframes spinAni { to{transform:rotate(360deg)} }
      @keyframes glowP   { 0%,100%{opacity:.5} 50%{opacity:1} }
      @keyframes popIn   { from{opacity:0;transform:scale(.94)} to{opacity:1;transform:scale(1)} }
      * { box-sizing:border-box; margin:0; padding:0; }
      body { background:#06060a; }
      input { outline:none; }
      input::placeholder { color:#3f3f46; }
      button { font-family:inherit; cursor:pointer; }
      a { text-decoration:none; }
      ::-webkit-scrollbar { width:4px; }
      ::-webkit-scrollbar-track { background:#0d0d12; }
      ::-webkit-scrollbar-thumb { background:#2a2a38; border-radius:2px; }
    `}</style>
  );
}

// ═══════════════════════════════════════════════════════════
//  STYLES
// ═══════════════════════════════════════════════════════════
const G   = '#c8a97e';
const BG  = '#06060a';
const S1  = '#0d0d12';
const S2  = '#111117';
const BRD = '#1e1e2a';

const c = {
  page: {
    minHeight: '100vh', background: BG, color: '#f0eee8',
    fontFamily: "'IBM Plex Mono', monospace",
    position: 'relative', animation: 'fadeUp .5s ease both',
  },
  topbar: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '14px 36px', borderBottom: `1px solid ${BRD}`,
    background: S2, position: 'sticky', top: 0, zIndex: 20,
  },
  brand:     { display: 'flex', alignItems: 'center', gap: 10 },
  brandName: { fontSize: '.65rem', letterSpacing: '.22em', color: G },
  topLink:   { fontSize: '.63rem', letterSpacing: '.06em', color: '#52525b', transition: 'color .2s' },
  body: {
    display: 'flex', flexWrap: 'wrap', maxWidth: 1080,
    margin: '0 auto', padding: '52px 24px 80px',
    position: 'relative', zIndex: 1, gap: 0,
  },
  leftPanel: { flex: '1 1 360px', paddingRight: 52, paddingTop: 8 },
  leftInner: { position: 'sticky', top: 88 },
  eyebrow: {
    display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20,
    fontSize: '.58rem', letterSpacing: '.22em', color: G,
  },
  orb: {
    width: 7, height: 7, borderRadius: '50%', background: G,
    boxShadow: `0 0 8px ${G}`, animation: 'glowP 2.5s ease infinite',
  },
  heroTitle: {
    fontSize: 'clamp(1.8rem,3vw,2.6rem)', fontWeight: 700,
    lineHeight: 1.15, letterSpacing: '-.03em', color: '#f0eee8',
    marginBottom: 14, fontFamily: "'IBM Plex Mono', monospace",
  },
  heroDesc:    { fontSize: '.72rem', color: '#52525b', lineHeight: 1.9, marginBottom: 36 },
  feats:       { display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 36 },
  feat:        { display: 'flex', gap: 14, alignItems: 'flex-start' },
  featIcon: {
    width: 36, height: 36, flexShrink: 0, display: 'flex', alignItems: 'center',
    justifyContent: 'center', background: 'rgba(200,169,126,.06)',
    border: `1px solid rgba(200,169,126,.15)`, borderRadius: 9, fontSize: '1rem',
  },
  featTitle:   { fontSize: '.7rem', color: '#a1a1aa', marginBottom: 3, fontWeight: 500 },
  featDesc:    { fontSize: '.63rem', color: '#3f3f46', lineHeight: 1.7 },
  alreadyHave: { fontSize: '.65rem', color: '#52525b', lineHeight: 1.8 },
  rightPanel:  { flex: '1 1 420px' },
  card: {
    background: S1, border: `1px solid ${BRD}`, borderRadius: 20,
    overflow: 'hidden',
    boxShadow: '0 40px 100px rgba(0,0,0,.55), 0 0 0 1px rgba(200,169,126,.04)',
  },
  cardHead:     { padding: '22px 28px', borderBottom: `1px solid ${BRD}`, background: S2 },
  cardTitleRow: { display: 'flex', alignItems: 'center', gap: 14 },
  shieldIcon: {
    width: 42, height: 42, flexShrink: 0, display: 'flex', alignItems: 'center',
    justifyContent: 'center', background: 'rgba(200,169,126,.07)',
    border: `1px solid rgba(200,169,126,.18)`, borderRadius: 11,
  },
  cardTitle:   { fontSize: '.95rem', fontWeight: 600, color: '#f0eee8', marginBottom: 3, letterSpacing: '-.01em' },
  cardSub:     { fontSize: '.58rem', color: '#3f3f46', letterSpacing: '.06em' },
  cardBody:    { padding: '26px 28px', display: 'flex', flexDirection: 'column', gap: 18 },
  cardFoot: {
    padding: '14px 28px', borderTop: `1px solid ${BRD}`, background: S2,
    display: 'flex', justifyContent: 'center', gap: 10,
    fontSize: '.6rem', letterSpacing: '.06em', color: '#3f3f46',
  },
  fieldWrap: { display: 'flex', flexDirection: 'column', gap: 5 },
  label:     { fontSize: '.67rem', color: '#a1a1aa', letterSpacing: '.06em', fontWeight: 500 },
  hint:      { fontSize: '.6rem', color: '#52525b', marginTop: -2 },
  input: {
    width: '100%', padding: '11px 14px',
    background: '#080810', border: '1px solid', borderRadius: 10,
    color: '#f0eee8', fontSize: '.78rem', fontFamily: "'IBM Plex Mono', monospace",
    transition: 'border-color .2s', appearance: 'none',
  },
  iconLeft: {
    position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)',
    color: '#52525b', fontSize: '.7rem', pointerEvents: 'none',
  },
  eyeBtn: {
    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
    background: 'none', border: 'none', cursor: 'pointer', fontSize: '.8rem',
    color: '#52525b', padding: '2px 4px', lineHeight: 1,
  },
  errorMsg: { fontSize: '.62rem', color: '#fb7185', marginTop: 2 },
  strengthWrap: { marginTop: -8, display: 'flex', flexDirection: 'column', gap: 8 },
  strengthBar:  { display: 'flex', alignItems: 'center', gap: 4 },
  strengthSeg:  { flex: 1, height: 3, borderRadius: 999 },
  strengthLabel: { fontSize: '.6rem', letterSpacing: '.06em', whiteSpace: 'nowrap', marginLeft: 6 },
  checkList: { display: 'flex', flexWrap: 'wrap', gap: '4px 16px' },
  checkItem: { fontSize: '.6rem', letterSpacing: '.04em', transition: 'color .2s' },
  termsRow: {
    display: 'flex', alignItems: 'flex-start', gap: 10,
    cursor: 'pointer', userSelect: 'none',
  },
  checkbox: {
    width: 18, height: 18, borderRadius: 5, flexShrink: 0,
    border: '2px solid', display: 'flex', alignItems: 'center',
    justifyContent: 'center', transition: 'all .2s', marginTop: 1,
  },
  termsText: { fontSize: '.68rem', color: '#71717a', lineHeight: 1.6 },
  divider:     { display: 'flex', alignItems: 'center', gap: 10 },
  dividerLine: { flex: 1, height: 1, background: BRD },
  dividerText: { fontSize: '.58rem', color: '#3f3f46', letterSpacing: '.12em', whiteSpace: 'nowrap' },
  submitBtn: {
    width: '100%', padding: '13px 20px',
    background: `linear-gradient(135deg, ${G}, #a07840)`,
    border: 'none', borderRadius: 12, color: '#1a0f04',
    fontSize: '.8rem', fontWeight: 600, letterSpacing: '.05em',
    transition: 'all .22s',
  },
  spinner: {
    width: 15, height: 15, borderRadius: '50%', flexShrink: 0, display: 'inline-block',
    border: '2px solid rgba(26,15,4,.2)', borderTop: '2px solid #1a0f04',
    animation: 'spinAni .75s linear infinite',
  },
  apiErr: {
    background: 'rgba(251,113,133,.05)', border: '1px solid rgba(251,113,133,.2)',
    borderRadius: 10, padding: '11px 14px',
    fontSize: '.68rem', color: '#fb7185', lineHeight: 1.7,
  },
  successCard: {
    background: S1, border: `1px solid ${BRD}`, borderRadius: 20,
    padding: '44px 36px', textAlign: 'center', maxWidth: 460, width: '100%',
    animation: 'popIn .4s ease both',
    boxShadow: '0 40px 100px rgba(0,0,0,.5)',
  },
  successOrb:   { display: 'flex', justifyContent: 'center', marginBottom: 18 },
  successTitle: { fontSize: '1.4rem', fontWeight: 700, color: '#f0eee8', marginBottom: 6, letterSpacing: '-.02em' },
  successSub:   { fontSize: '.75rem', color: '#71717a', marginBottom: 24, lineHeight: 1.7 },
  successInfo:  { background: '#080810', border: `1px solid ${BRD}`, borderRadius: 12, overflow: 'hidden', marginBottom: 24 },
  successRow:   { display: 'flex', justifyContent: 'space-between', padding: '10px 16px', borderBottom: `1px solid rgba(30,30,42,.5)` },
  successKey:   { fontSize: '.6rem', color: '#52525b', letterSpacing: '.1em', textTransform: 'uppercase' },
  successVal:   { fontSize: '.7rem', color: '#a1a1aa' },
  loginBtn: {
    width: '100%', padding: '13px', background: `linear-gradient(135deg, ${G}, #a07840)`,
    border: 'none', borderRadius: 12, color: '#1a0f04',
    fontSize: '.78rem', fontWeight: 600, letterSpacing: '.05em',
  },
  center: {
    display: 'flex', justifyContent: 'center', alignItems: 'center',
    minHeight: '100vh', padding: '40px 24px', position: 'relative', zIndex: 1,
  },
};
