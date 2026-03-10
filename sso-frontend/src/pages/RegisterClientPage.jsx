// src/pages/RegisterClientPage.jsx
// Client self-registration form → POST /admin/clients on SSO server (localhost:3000)
import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';

const SSO_BASE = 'http://localhost:5000/api/auth-sso'; // Your SSO server

/* ─── API call ─────────────────────────────────────────── */
async function registerClient(payload) {
  const res = await fetch(`${SSO_BASE}/admin/clients`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || data.message || 'Registration failed');
  return data;
}

/* ─── Helpers ──────────────────────────────────────────── */
function genId() {
  const adj = ['swift', 'bold', 'bright', 'clean', 'fast', 'smart', 'iron', 'blue'];
  const noun = ['api', 'app', 'hub', 'key', 'box', 'node', 'link', 'gate'];
  return `${adj[Math.random() * adj.length | 0]}_${noun[Math.random() * noun.length | 0]}_${Math.random().toString(36).slice(2, 6)}`;
}

const GRANT_OPTIONS = [
  { value: 'authorization_code', label: 'Authorization Code', desc: 'Standard OAuth 2.0 flow with PKCE' },
  { value: 'refresh_token', label: 'Refresh Token', desc: 'Get new access tokens silently' },
  { value: 'client_credentials', label: 'Client Credentials', desc: 'Machine-to-machine (no user)' },
];

const SCOPE_OPTIONS = [
  { value: 'openid', color: '#4ade80' },
  { value: 'profile', color: '#22d3ee' },
  { value: 'email', color: '#a78bfa' },
  { value: 'offline_access', color: '#fbbf24' },
];

/* ─── Sub-components ───────────────────────────────────── */
function Field({ label, hint, error, children }) {
  return (
    <div style={f.wrap}>
      <label style={f.label}>{label}</label>
      {hint && <span style={f.hint}>{hint}</span>}
      {children}
      {error && <span style={f.error}>⚠ {error}</span>}
    </div>
  );
}

function TextInput({ value, onChange, placeholder, mono, disabled, rightSlot }) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ position: 'relative' }}>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          ...f.input,
          fontFamily: mono ? "'IBM Plex Mono', monospace" : "'Sora', sans-serif",
          fontSize: mono ? '.72rem' : '.8rem',
          borderColor: focused ? '#c8a97e' : '#1e1e2a',
          paddingRight: rightSlot ? 44 : 14,
          background: disabled ? '#0a0a0f' : '#080810',
          color: disabled ? '#52525b' : '#f0eee8',
        }}
      />
      {rightSlot && <div style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)' }}>{rightSlot}</div>}
    </div>
  );
}

function TagInput({ values, onChange, placeholder }) {
  const [input, setInput] = useState('');
  const [focused, setFocused] = useState(false);

  function add() {
    const v = input.trim();
    if (v && !values.includes(v)) onChange([...values, v]);
    setInput('');
  }

  function remove(i) { onChange(values.filter((_, idx) => idx !== i)); }

  return (
    <div style={{ ...f.tagBox, borderColor: focused ? '#c8a97e' : '#1e1e2a' }}>
      <div style={f.tagList}>
        {values.map((v, i) => (
          <span key={i} style={f.tag}>
            {v}
            <button onClick={() => remove(i)} style={f.tagX}>×</button>
          </span>
        ))}
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add(); } if (e.key === 'Backspace' && !input && values.length) remove(values.length - 1); }}
          onBlur={() => { add(); setFocused(false); }}
          onFocus={() => setFocused(true)}
          placeholder={values.length === 0 ? placeholder : 'Add more…'}
          style={f.tagInput}
        />
      </div>
    </div>
  );
}

function ToggleChip({ active, onClick, children, color }) {
  return (
    <button onClick={onClick} style={{
      padding: '6px 14px', borderRadius: 8, cursor: 'pointer',
      fontSize: '.68rem', fontFamily: "'IBM Plex Mono', monospace",
      letterSpacing: '.06em', transition: 'all .18s',
      border: active ? `1px solid ${color}44` : '1px solid #1e1e2a',
      background: active ? `${color}12` : 'transparent',
      color: active ? color : '#52525b',
    }}>
      {active ? '✓ ' : ''}{children}
    </button>
  );
}

/* ─── Step indicators ──────────────────────────────────── */
const STEPS = ['App Info', 'OAuth Config', 'Scopes & URIs', 'Review'];

function StepBar({ current }) {
  return (
    <div style={s.stepBar}>
      {STEPS.map((name, i) => (
        <div key={i} style={s.stepItem}>
          <div style={{
            ...s.stepDot,
            background: i < current ? '#4ade80' : i === current ? '#c8a97e' : '#1e1e2a',
            border: i === current ? '2px solid rgba(200,169,126,.4)' : '2px solid transparent',
            boxShadow: i === current ? '0 0 12px rgba(200,169,126,.3)' : 'none',
          }}>
            {i < current ? '✓' : i + 1}
          </div>
          {i < STEPS.length - 1 && (
            <div style={{ ...s.stepLine, background: i < current ? '#4ade80' : '#1e1e2a' }} />
          )}
          <span style={{
            ...s.stepLabel,
            color: i === current ? '#c8a97e' : i < current ? '#4ade80' : '#3f3f46',
          }}>{name}</span>
        </div>
      ))}
    </div>
  );
}

/* ─── Success Screen ───────────────────────────────────── */
function SuccessScreen({ result, onReset }) {
  const [copied, setCopied] = useState('');
  function copy(key, val) {
    navigator.clipboard.writeText(val);
    setCopied(key); setTimeout(() => setCopied(''), 2000);
  }

  return (
    <div style={s.successWrap}>
      <div style={s.successIcon}>
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
          <circle cx="24" cy="24" r="23" stroke="#4ade80" strokeWidth="1.5" />
          <path d="M14 24l7 7 13-13" stroke="#4ade80" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <h2 style={s.successTitle}>Client Registered!</h2>
      <p style={s.successSub}>Save these credentials — secret <strong style={{ color: '#fb7185' }}>dikhega sirf ek baar</strong></p>

      <div style={s.credBox}>
        <CredRow label="Client ID" val={result.client_id} onCopy={() => copy('id', result.client_id)} copied={copied === 'id'} />
        <CredRow label="Client Secret" val={result.client_secret} onCopy={() => copy('sec', result.client_secret)} copied={copied === 'sec'} secret />
        {result.name && <CredRow label="App Name" val={result.name} />}
      </div>

      <div style={s.warnBox}>
        ⚠  Client secret ab dobara nahi dikhega. Abhi copy karo aur safe jagah save karo.
      </div>

      <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 28 }}>
        <Link to="/login" style={s.btnSecondary}>Go to Login →</Link>
        <button onClick={onReset} style={s.btnOutline}>Register Another</button>
      </div>
    </div>
  );
}

function CredRow({ label, val, onCopy, copied, secret }) {
  const [show, setShow] = useState(false);
  return (
    <div style={s.credRow}>
      <span style={s.credLabel}>{label}</span>
      <div style={s.credRight}>
        <span style={s.credVal}>{secret && !show ? '•'.repeat(Math.min(val?.length || 20, 32)) : val}</span>
        {secret && (
          <button onClick={() => setShow(!show)} style={s.credBtn}>{show ? '🙈' : '👁'}</button>
        )}
        {onCopy && (
          <button onClick={onCopy} style={{ ...s.credBtn, color: copied ? '#4ade80' : '#52525b' }}>
            {copied ? '✓' : '⎘'}
          </button>
        )}
      </div>
    </div>
  );
}

/* ─── MAIN COMPONENT ───────────────────────────────────── */
export default function RegisterClientPage() {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [apiError, setApiError] = useState('');
  const cardRef = useRef();

  // Form state
  const [form, setForm] = useState({
    name: '',
    description: '',
    client_id: genId(),
    website_url: '',
    logo_url: '',
    grant_types: ['authorization_code', 'refresh_token'],
    allowed_scopes: ['openid', 'profile', 'email'],
    redirect_uris: [],
    logout_uri: '',
    token_endpoint_auth_method: 'client_secret_basic',
    access_token_ttl: 900,
    refresh_token_ttl: 604800,
    is_active: true,
  });
  const [errors, setErrors] = useState({});

  function set(key, val) {
    setForm(f => ({ ...f, [key]: val }));
    setErrors(e => ({ ...e, [key]: '' }));
  }

  function toggleArr(key, val) {
    setForm(f => ({
      ...f,
      [key]: f[key].includes(val) ? f[key].filter(v => v !== val) : [...f[key], val],
    }));
  }

  // Validation per step
  function validate(s) {
    const e = {};
    if (s === 0) {
      if (!form.name.trim()) e.name = 'App name required';
      if (form.name.length > 100) e.name = 'Max 100 characters';
      if (!form.client_id.trim()) e.client_id = 'Client ID required';
      if (!/^[a-z0-9_-]+$/i.test(form.client_id)) e.client_id = 'Only letters, numbers, _ and - allowed';
    }
    if (s === 1) {
      if (form.grant_types.length === 0) e.grant_types = 'Select at least one';
    }
    if (s === 2) {
      if (form.redirect_uris.length === 0) e.redirect_uris = 'At least one redirect URI required';
      const badUri = form.redirect_uris.find(u => !u.startsWith('http'));
      if (badUri) e.redirect_uris = `"${badUri}" must start with http:// or https://`;
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function next() { if (validate(step)) setStep(s => Math.min(s + 1, 3)); }
  function back() { setStep(s => Math.max(s - 1, 0)); }

  async function submit() {
    if (!validate(2)) return;
    setLoading(true);
    setApiError('');
    try {
      const payload = {
        name: form.name.trim(),
        client_id: form.client_id.trim(),
        description: form.description.trim() || undefined,
        website_url: form.website_url.trim() || undefined,
        grant_types: form.grant_types,
        allowed_scopes: form.allowed_scopes,
        redirect_uris: form.redirect_uris,
        logout_uri: form.logout_uri.trim() || undefined,
        token_endpoint_auth_method: form.token_endpoint_auth_method,
        access_token_ttl: Number(form.access_token_ttl),
        refresh_token_ttl: Number(form.refresh_token_ttl),
        is_active: true,
      };
      const data = await registerClient(payload);
      setResult(data);
    } catch (err) {
      setApiError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (result) return (
    <div style={s.page}><div style={s.center}><SuccessScreen result={result} onReset={() => { setResult(null); setStep(0); setForm(f => ({ ...f, client_id: genId(), name: '', description: '', redirect_uris: [], logout_uri: '' })); }} /></div></div>
  );

  return (
    <div style={s.page}>
      {/* Grid bg */}
      <div style={s.gridBg} />

      {/* Topbar */}
      <div style={s.topbar}>
        <div style={s.brand}>
          <div style={s.brandIcon}>
            <svg width="16" height="16" viewBox="0 0 22 22" fill="none">
              <rect x="1" y="1" width="20" height="20" rx="6" stroke="#c8a97e" strokeWidth="1.3" />
              <circle cx="11" cy="11" r="4" stroke="#c8a97e" strokeWidth="1.3" />
            </svg>
          </div>
          <span style={s.brandName}>NEXUS SSO</span>
          <span style={s.brandSep}>/</span>
          <span style={s.brandPage}>Client Registration</span>
        </div>
        <Link to="/login" style={s.topLink}>Back to Login →</Link>
      </div>

      <div style={s.body}>
        {/* Left column — context */}
        <div style={s.leftCol}>
          <div style={s.leftSticky}>
            <div style={s.eyebrow}>
              <div style={s.liveOrb} />
              DEVELOPER PORTAL
            </div>
            <h1 style={s.heroTitle}>Register Your<br /><em>Application</em></h1>
            <p style={s.heroDesc}>Register your app as an OAuth 2.0 client on the SSO server. You'll get a client_id and client_secret to start the PKCE authorization flow.</p>

            <StepBar current={step} />

            <div style={s.infoCards}>
              {[
                { icon: '⎆', title: 'PKCE Required', body: 'All clients must use PKCE S256 — no implicit flow allowed' },
                { icon: '⊗', title: 'Secret Rotation', body: 'Rotate secrets anytime via /admin/clients/:id/rotate-secret' },
                { icon: '◈', title: 'Exact URI Match', body: 'Redirect URIs must match exactly — no wildcard patterns' },
              ].map((c, i) => (
                <div key={i} style={s.infoCard}>
                  <span style={s.infoIcon}>{c.icon}</span>
                  <div>
                    <div style={s.infoTitle}>{c.title}</div>
                    <div style={s.infoBody}>{c.body}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right column — form card */}
        <div style={s.rightCol}>
          <div style={s.card} ref={cardRef}>
            {/* Card header */}
            <div style={s.cardHead}>
              <div style={s.cardHeadLeft}>
                <div style={s.cardStep}>Step {step + 1} of {STEPS.length}</div>
                <div style={s.cardTitle}>{STEPS[step]}</div>
              </div>
              <div style={s.progressRing}>
                <svg width="44" height="44" viewBox="0 0 44 44">
                  <circle cx="22" cy="22" r="18" fill="none" stroke="#1e1e2a" strokeWidth="2.5" />
                  <circle cx="22" cy="22" r="18" fill="none" stroke="#c8a97e" strokeWidth="2.5"
                    strokeDasharray={`${(step / (STEPS.length - 1)) * 113} 113`}
                    strokeLinecap="round" strokeDashoffset="28"
                    style={{ transition: 'stroke-dasharray .4s ease' }} />
                </svg>
                <span style={s.progressPct}>{Math.round((step / (STEPS.length - 1)) * 100)}%</span>
              </div>
            </div>

            {/* ── STEP 0: App Info ── */}
            {step === 0 && (
              <div style={s.stepContent}>
                <Field label="Application Name" hint="Public name users will see" error={errors.name}>
                  <TextInput value={form.name} onChange={v => set('name', v)} placeholder="My Awesome App" />
                </Field>

                <Field label="Client ID" hint="Unique identifier — alphanumeric, _ and -" error={errors.client_id}>
                  <TextInput
                    value={form.client_id}
                    onChange={v => set('client_id', v)}
                    placeholder="my_app_001"
                    mono
                    rightSlot={
                      <button onClick={() => set('client_id', genId())} style={s.regenBtn} title="Generate random ID">⟳</button>
                    }
                  />
                </Field>

                <Field label="Description" hint="Optional — what does this app do?">
                  <textarea
                    value={form.description}
                    onChange={e => set('description', e.target.value)}
                    placeholder="A brief description of your application..."
                    rows={3}
                    style={f.textarea}
                  />
                </Field>

                <Field label="Website URL" hint="Optional — your app's homepage">
                  <TextInput value={form.website_url} onChange={v => set('website_url', v)} placeholder="https://myapp.com" />
                </Field>
              </div>
            )}

            {/* ── STEP 1: OAuth Config ── */}
            {step === 1 && (
              <div style={s.stepContent}>
                <Field label="Grant Types" hint="Which OAuth flows does your app need?" error={errors.grant_types}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 6 }}>
                    {GRANT_OPTIONS.map(g => (
                      <div
                        key={g.value}
                        onClick={() => toggleArr('grant_types', g.value)}
                        style={{
                          ...s.grantCard,
                          borderColor: form.grant_types.includes(g.value) ? '#c8a97e55' : '#1e1e2a',
                          background: form.grant_types.includes(g.value) ? 'rgba(200,169,126,.06)' : '#080810',
                        }}
                      >
                        <div style={{
                          width: 18, height: 18, borderRadius: 5, flexShrink: 0,
                          border: form.grant_types.includes(g.value) ? '2px solid #c8a97e' : '2px solid #2a2a38',
                          background: form.grant_types.includes(g.value) ? '#c8a97e' : 'transparent',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '.55rem', color: '#1a0f04',
                        }}>
                          {form.grant_types.includes(g.value) ? '✓' : ''}
                        </div>
                        <div>
                          <div style={{ fontSize: '.78rem', color: '#e2e0da', marginBottom: 2 }}>{g.label}</div>
                          <div style={{ fontSize: '.65rem', color: '#52525b', fontFamily: "'IBM Plex Mono',monospace" }}>{g.desc}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </Field>

                <Field label="Token Endpoint Auth Method" hint="How does your backend authenticate?">
                  <div style={{ display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
                    {['client_secret_basic', 'client_secret_post', 'none'].map(m => (
                      <ToggleChip
                        key={m} color="#c8a97e"
                        active={form.token_endpoint_auth_method === m}
                        onClick={() => set('token_endpoint_auth_method', m)}
                      >{m}</ToggleChip>
                    ))}
                  </div>
                </Field>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <Field label="Access Token TTL" hint="Seconds (default 900 = 15min)">
                    <TextInput value={form.access_token_ttl} onChange={v => set('access_token_ttl', v)} placeholder="900" mono />
                  </Field>
                  <Field label="Refresh Token TTL" hint="Seconds (default 604800 = 7d)">
                    <TextInput value={form.refresh_token_ttl} onChange={v => set('refresh_token_ttl', v)} placeholder="604800" mono />
                  </Field>
                </div>
              </div>
            )}

            {/* ── STEP 2: Scopes & URIs ── */}
            {step === 2 && (
              <div style={s.stepContent}>
                <Field label="Allowed Scopes" hint="Which user data can this app access?">
                  <div style={{ display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
                    {SCOPE_OPTIONS.map(sc => (
                      <ToggleChip
                        key={sc.value} color={sc.color}
                        active={form.allowed_scopes.includes(sc.value)}
                        onClick={() => toggleArr('allowed_scopes', sc.value)}
                      >{sc.value}</ToggleChip>
                    ))}
                  </div>
                </Field>

                <Field label="Redirect URIs" hint="Press Enter or comma to add. Must be exact URL." error={errors.redirect_uris}>
                  <TagInput
                    values={form.redirect_uris}
                    onChange={v => { set('redirect_uris', v); }}
                    placeholder="http://localhost:5000/api/auth-sso/auth/callback"
                  />
                  <div style={s.uriHint}>
                    💡 For local dev: <code style={s.code}>http://localhost:5000/api/auth-sso/auth/callback</code>
                  </div>
                </Field>

                <Field label="Backchannel Logout URI" hint="Optional — SSO will POST {user_id} here on global logout">
                  <TextInput
                    value={form.logout_uri}
                    onChange={v => set('logout_uri', v)}
                    placeholder="http://localhost:5000/api/auth-sso/backchannel-logout"
                  />
                </Field>
              </div>
            )}

            {/* ── STEP 3: Review ── */}
            {step === 3 && (
              <div style={s.stepContent}>
                <div style={s.reviewGrid}>
                  <ReviewRow label="App Name" val={form.name} />
                  <ReviewRow label="Client ID" val={form.client_id} mono />
                  <ReviewRow label="Grant Types" val={form.grant_types.join(', ')} mono />
                  <ReviewRow label="Scopes" val={form.allowed_scopes.join(', ')} mono />
                  <ReviewRow label="Redirect URIs" val={form.redirect_uris.join('\n')} mono block />
                  {form.logout_uri && <ReviewRow label="Logout URI" val={form.logout_uri} mono />}
                  <ReviewRow label="Access TTL" val={`${form.access_token_ttl}s`} mono />
                  <ReviewRow label="Refresh TTL" val={`${form.refresh_token_ttl}s`} mono />
                  <ReviewRow label="Auth Method" val={form.token_endpoint_auth_method} mono />
                </div>

                {apiError && (
                  <div style={s.apiError}>⚠ {apiError}</div>
                )}

                <div style={s.reviewNote}>
                  Client secret will be generated by SSO server and shown <strong>only once</strong>.
                </div>
              </div>
            )}

            {/* Nav buttons */}
            <div style={s.navRow}>
              {step > 0 ? (
                <button onClick={back} style={s.btnBack}>← Back</button>
              ) : (
                <div />
              )}
              {step < 3 ? (
                <button onClick={next} style={s.btnNext}>
                  Continue →
                </button>
              ) : (
                <button onClick={submit} disabled={loading} style={{ ...s.btnNext, ...(loading ? s.btnLoading : {}) }}>
                  {loading ? (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={s.spinner} />Registering…
                    </span>
                  ) : '✓ Register Client'}
                </button>
              )}
            </div>
          </div>

          <p style={s.footNote}>
            Already have a client? Manage it via <code style={s.code}>GET /admin/clients</code> on your SSO server.
          </p>
        </div>
      </div>

      <style>{`
        @keyframes fadeUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spinAni { to{transform:rotate(360deg)} }
        @keyframes glowPulse { 0%,100%{opacity:.5} 50%{opacity:1} }
        @keyframes successPop { from{opacity:0;transform:scale(.9)} to{opacity:1;transform:scale(1)} }
        * { box-sizing:border-box; margin:0; padding:0; }
        body { background:#06060a; }
        input::placeholder, textarea::placeholder { color:#3f3f46; }
        input:focus, textarea:focus { outline:none; }
        button { font-family: inherit; }
        a { text-decoration:none; }
        ::-webkit-scrollbar { width:4px; }
        ::-webkit-scrollbar-track { background:#0d0d12; }
        ::-webkit-scrollbar-thumb { background:#2a2a38; border-radius:2px; }
      `}</style>
    </div>
  );
}

/* ─── Review row ───────────────────────────────────── */
function ReviewRow({ label, val, mono, block }) {
  return (
    <div style={{ ...s.revRow, flexDirection: block ? 'column' : 'row', gap: block ? 4 : 12, alignItems: block ? 'flex-start' : 'flex-start' }}>
      <span style={s.revLabel}>{label}</span>
      <span style={{
        ...s.revVal,
        fontFamily: mono ? "'IBM Plex Mono',monospace" : 'inherit',
        fontSize: mono ? '.68rem' : '.78rem',
        whiteSpace: block ? 'pre' : 'normal',
      }}>{val}</span>
    </div>
  );
}

/* ─── Styles ───────────────────────────────────────── */
const G = '#c8a97e', BG = '#06060a', SURF = '#0d0d12', SURF2 = '#111117', BRD = '#1e1e2a';

const s = {
  page: {
    minHeight: '100vh', background: BG,
    fontFamily: "'Sora', 'DM Sans', sans-serif",
    color: '#f0eee8', position: 'relative', overflow: 'hidden',
    animation: 'fadeUp .5s ease both',
  },
  gridBg: {
    position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
    backgroundImage: `linear-gradient(rgba(200,169,126,.018) 1px,transparent 1px),linear-gradient(90deg,rgba(200,169,126,.018) 1px,transparent 1px)`,
    backgroundSize: '36px 36px',
  },
  topbar: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '14px 40px', borderBottom: `1px solid ${BRD}`, background: SURF2,
    position: 'sticky', top: 0, zIndex: 20,
  },
  brand: { display: 'flex', alignItems: 'center', gap: 10 },
  brandIcon: { width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(200,169,126,.07)', border: `1px solid rgba(200,169,126,.2)`, borderRadius: 7 },
  brandName: { fontFamily: "'IBM Plex Mono',monospace", fontSize: '.65rem', letterSpacing: '.22em', color: G },
  brandSep: { color: '#2a2a38', fontSize: '.9rem' },
  brandPage: { fontFamily: "'IBM Plex Mono',monospace", fontSize: '.62rem', letterSpacing: '.1em', color: '#52525b' },
  topLink: { fontFamily: "'IBM Plex Mono',monospace", fontSize: '.63rem', letterSpacing: '.08em', color: '#52525b', transition: 'color .2s' },

  body: {
    display: 'flex', gap: 0, maxWidth: 1140, margin: '0 auto',
    padding: '48px 24px 80px', position: 'relative', zIndex: 1,
    flexWrap: 'wrap',
  },

  leftCol: { flex: '1 1 340px', paddingRight: 48, paddingTop: 8 },
  leftSticky: { position: 'sticky', top: 90 },

  eyebrow: {
    display: 'flex', alignItems: 'center', gap: 8,
    fontFamily: "'IBM Plex Mono',monospace", fontSize: '.6rem', letterSpacing: '.2em', color: G,
    marginBottom: 20,
  },
  liveOrb: { width: 7, height: 7, borderRadius: '50%', background: G, boxShadow: `0 0 8px ${G}`, animation: 'glowPulse 2.5s ease infinite' },
  heroTitle: {
    fontFamily: "'Sora',sans-serif", fontWeight: 700, fontSize: 'clamp(1.8rem,2.8vw,2.6rem)',
    lineHeight: 1.15, letterSpacing: '-.03em', color: '#f0eee8', marginBottom: 16,
  },
  heroDesc: { fontSize: '.78rem', color: '#52525b', lineHeight: 1.8, marginBottom: 36 },

  stepBar: {
    display: 'flex', alignItems: 'flex-start', gap: 0,
    marginBottom: 36, position: 'relative',
  },
  stepItem: { display: 'flex', alignItems: 'center', flex: 1, flexDirection: 'column', position: 'relative' },
  stepDot: { width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.62rem', color: '#1a0f04', fontWeight: 700, flexShrink: 0, zIndex: 1, transition: 'all .3s', fontFamily: "'IBM Plex Mono',monospace" },
  stepLine: { position: 'absolute', top: 14, left: '50%', width: '100%', height: 2, zIndex: 0, transition: 'background .3s' },
  stepLabel: { fontSize: '.57rem', fontFamily: "'IBM Plex Mono',monospace", letterSpacing: '.08em', marginTop: 8, textAlign: 'center', transition: 'color .3s', lineHeight: 1.4 },

  infoCards: { display: 'flex', flexDirection: 'column', gap: 12 },
  infoCard: { display: 'flex', gap: 12, padding: '12px 14px', background: SURF, border: `1px solid ${BRD}`, borderRadius: 10 },
  infoIcon: { fontSize: '.9rem', color: G, flexShrink: 0, paddingTop: 2 },
  infoTitle: { fontSize: '.72rem', color: '#a1a1aa', marginBottom: 3, fontWeight: 500 },
  infoBody: { fontSize: '.65rem', color: '#3f3f46', lineHeight: 1.6, fontFamily: "'IBM Plex Mono',monospace" },

  rightCol: { flex: '1 1 460px' },

  card: {
    background: SURF, border: `1px solid ${BRD}`, borderRadius: 20, overflow: 'hidden',
    boxShadow: '0 40px 100px rgba(0,0,0,.5), 0 0 0 1px rgba(200,169,126,.04)',
    marginBottom: 16,
  },
  cardHead: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '22px 28px', borderBottom: `1px solid ${BRD}`, background: SURF2,
  },
  cardHeadLeft: {},
  cardStep: { fontFamily: "'IBM Plex Mono',monospace", fontSize: '.58rem', letterSpacing: '.15em', color: '#52525b', marginBottom: 4 },
  cardTitle: { fontSize: '1.05rem', fontWeight: 600, color: '#f0eee8', letterSpacing: '-.01em' },

  progressRing: { position: 'relative', width: 44, height: 44 },
  progressPct: { position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.55rem', fontFamily: "'IBM Plex Mono',monospace", color: G },

  stepContent: { padding: '28px 28px 8px', display: 'flex', flexDirection: 'column', gap: 20 },

  grantCard: {
    display: 'flex', gap: 14, alignItems: 'center', padding: '14px 16px',
    border: '1px solid', borderRadius: 12, cursor: 'pointer', transition: 'all .18s',
  },

  reviewGrid: { display: 'flex', flexDirection: 'column', gap: 0, background: '#080810', borderRadius: 12, overflow: 'hidden', border: `1px solid ${BRD}`, marginBottom: 16 },
  revRow: { display: 'flex', padding: '11px 16px', borderBottom: `1px solid rgba(30,30,42,.6)` },
  revLabel: { fontFamily: "'IBM Plex Mono',monospace", fontSize: '.6rem', letterSpacing: '.1em', color: '#52525b', textTransform: 'uppercase', flexShrink: 0, width: 110, paddingTop: 2 },
  revVal: { color: '#e2e0da', wordBreak: 'break-all', lineHeight: 1.6 },

  reviewNote: { background: 'rgba(200,169,126,.05)', border: `1px solid rgba(200,169,126,.18)`, borderRadius: 10, padding: '11px 14px', fontSize: '.7rem', color: G, lineHeight: 1.6, fontFamily: "'IBM Plex Mono',monospace" },
  apiError: { background: 'rgba(251,113,133,.05)', border: '1px solid rgba(251,113,133,.2)', borderRadius: 10, padding: '11px 14px', fontSize: '.7rem', color: '#fb7185', lineHeight: 1.6, marginBottom: 16 },

  navRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 28px', borderTop: `1px solid ${BRD}` },
  btnBack: { background: 'transparent', border: `1px solid ${BRD}`, borderRadius: 10, color: '#71717a', fontSize: '.75rem', padding: '10px 20px', cursor: 'pointer', fontFamily: "'IBM Plex Mono',monospace", letterSpacing: '.06em', transition: 'all .2s' },
  btnNext: {
    background: `linear-gradient(135deg, ${G}, #a07840)`, border: 'none', borderRadius: 10,
    color: '#1a0f04', fontSize: '.78rem', fontWeight: 600, padding: '11px 28px', cursor: 'pointer',
    fontFamily: "'IBM Plex Mono',monospace", letterSpacing: '.06em', transition: 'all .22s',
  },
  btnLoading: { opacity: .7, cursor: 'not-allowed' },
  spinner: { width: 14, height: 14, borderRadius: '50%', border: '2px solid rgba(26,15,4,.2)', borderTop: '2px solid #1a0f04', animation: 'spinAni .7s linear infinite', flexShrink: 0, display: 'inline-block' },

  uriHint: { fontSize: '.64rem', color: '#52525b', marginTop: 8, lineHeight: 1.6, fontFamily: "'IBM Plex Mono',monospace" },
  code: { background: '#0a0a0f', border: `1px solid ${BRD}`, borderRadius: 4, padding: '1px 6px', fontFamily: "'IBM Plex Mono',monospace", fontSize: '.65rem', color: G },
  regenBtn: { background: 'none', border: 'none', cursor: 'pointer', color: '#52525b', fontSize: '.9rem', padding: 0, transition: 'color .2s', lineHeight: 1 },

  footNote: { fontSize: '.6rem', color: '#3f3f46', textAlign: 'center', fontFamily: "'IBM Plex Mono',monospace", lineHeight: 1.7 },

  // Success
  successWrap: { background: SURF, border: `1px solid ${BRD}`, borderRadius: 20, padding: '48px 40px', textAlign: 'center', maxWidth: 560, width: '100%', animation: 'successPop .4s ease both' },
  successIcon: { display: 'flex', justifyContent: 'center', marginBottom: 20 },
  successTitle: { fontSize: '1.6rem', fontWeight: 600, color: '#f0eee8', marginBottom: 8, letterSpacing: '-.02em' },
  successSub: { fontSize: '.78rem', color: '#71717a', lineHeight: 1.7, marginBottom: 28 },
  credBox: { background: '#080810', border: `1px solid ${BRD}`, borderRadius: 14, overflow: 'hidden', marginBottom: 20 },
  credRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 18px', borderBottom: `1px solid rgba(30,30,42,.6)` },
  credLabel: { fontFamily: "'IBM Plex Mono',monospace", fontSize: '.6rem', letterSpacing: '.1em', color: '#52525b', textTransform: 'uppercase', flexShrink: 0 },
  credRight: { display: 'flex', alignItems: 'center', gap: 8 },
  credVal: { fontFamily: "'IBM Plex Mono',monospace", fontSize: '.68rem', color: G, wordBreak: 'break-all', textAlign: 'right' },
  credBtn: { background: 'none', border: 'none', cursor: 'pointer', fontSize: '.85rem', padding: '2px 4px', transition: 'color .2s' },
  warnBox: { background: 'rgba(251,113,133,.06)', border: '1px solid rgba(251,113,133,.2)', borderRadius: 10, padding: '12px 16px', fontSize: '.7rem', color: '#fb7185', lineHeight: 1.7, fontFamily: "'IBM Plex Mono',monospace", textAlign: 'left' },
  btnSecondary: { background: `linear-gradient(135deg, ${G}, #a07840)`, border: 'none', borderRadius: 10, color: '#1a0f04', fontSize: '.75rem', fontWeight: 600, padding: '11px 24px', cursor: 'pointer', fontFamily: "'IBM Plex Mono',monospace" },
  btnOutline: { background: 'transparent', border: `1px solid ${BRD}`, borderRadius: 10, color: '#71717a', fontSize: '.75rem', padding: '11px 24px', cursor: 'pointer', fontFamily: "'IBM Plex Mono',monospace" },

  center: { display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', padding: '40px 24px', position: 'relative', zIndex: 1 },
};

const f = {
  wrap: { display: 'flex', flexDirection: 'column', gap: 6 },
  label: { fontSize: '.72rem', fontWeight: 500, color: '#a1a1aa', letterSpacing: '.04em' },
  hint: { fontSize: '.63rem', color: '#52525b', fontFamily: "'IBM Plex Mono',monospace", marginTop: -2 },
  error: { fontSize: '.63rem', color: '#fb7185', fontFamily: "'IBM Plex Mono',monospace", marginTop: 2 },
  input: {
    width: '100%', padding: '11px 14px', background: '#080810', border: '1px solid #1e1e2a',
    borderRadius: 10, color: '#f0eee8', fontSize: '.8rem',
    fontFamily: "'Sora',sans-serif", transition: 'border-color .2s',
    appearance: 'none',
  },
  textarea: {
    width: '100%', padding: '11px 14px', background: '#080810', border: '1px solid #1e1e2a',
    borderRadius: 10, color: '#f0eee8', fontSize: '.78rem', fontFamily: "'Sora',sans-serif",
    resize: 'vertical', lineHeight: 1.7, transition: 'border-color .2s',
  },
  tagBox: {
    padding: '8px 10px', background: '#080810', border: '1px solid',
    borderRadius: 10, transition: 'border-color .2s', minHeight: 46,
  },
  tagList: { display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' },
  tag: {
    display: 'inline-flex', alignItems: 'center', gap: 5,
    background: 'rgba(200,169,126,.1)', border: '1px solid rgba(200,169,126,.25)',
    borderRadius: 6, padding: '3px 10px',
    fontFamily: "'IBM Plex Mono',monospace", fontSize: '.65rem', color: G,
  },
  tagX: { background: 'none', border: 'none', cursor: 'pointer', color: '#52525b', fontSize: '.8rem', padding: 0, lineHeight: 1, display: 'flex', alignItems: 'center' },
  tagInput: { border: 'none', background: 'transparent', color: '#f0eee8', fontSize: '.72rem', fontFamily: "'IBM Plex Mono',monospace", outline: 'none', minWidth: 200, padding: '2px 4px' },
};
