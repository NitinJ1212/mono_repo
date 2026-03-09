// src/pages/ProfilePage.jsx
import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { getProfile } from '../api/auth';

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const [profile,   setProfile]   = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [loggingOut,setLoggingOut]= useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    try {
      const data = await getProfile();
      setProfile(data);
    } catch (err) {
      console.error('Profile error:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    setLoggingOut(true);
    await logout();
  }

  const initials = user?.name
    ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : user?.email?.[0].toUpperCase() || '?';

  const expiresIn = profile?.sessionInfo?.expiresIn;
  const expiryMin = expiresIn ? Math.floor(expiresIn / 60) : null;

  return (
    <div style={styles.page}>
      <div style={styles.grid}/>

      <div style={styles.wrap}>

        {/* ── Top bar ── */}
        <div style={styles.topbar}>
          <div style={styles.brand}>
            <div style={styles.brandDot}/>
            <span style={styles.brandText}>CLIENT APP</span>
          </div>
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            style={styles.logoutBtn}
          >
            {loggingOut ? 'Logging out...' : '⎗  Logout'}
          </button>
        </div>

        {/* ── Hero card ── */}
        <div style={styles.heroCard}>
          <div style={styles.heroBg}/>
          <div style={styles.heroContent}>
            {/* Avatar */}
            <div style={styles.avatarWrap}>
              <div style={styles.avatarRing}>
                <div style={styles.avatar}>{initials}</div>
              </div>
              <div style={styles.onlineDot}/>
            </div>

            <h1 style={styles.userName}>{user?.name || 'Unknown User'}</h1>
            <p style={styles.userEmail}>{user?.email}</p>

            <div style={styles.badges}>
              <span style={{ ...styles.chip, ...styles.chipGreen }}>
                ● SSO Authenticated
              </span>
              {user?.emailVerified && (
                <span style={{ ...styles.chip, ...styles.chipCyan }}>
                  ✓ Email Verified
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ── Info grid ── */}
        <div style={styles.grid2}>

          <InfoCard title="User Details" icon="👤">
            <InfoRow label="User ID"  value={user?.id}    mono />
            <InfoRow label="Name"     value={user?.name || '—'} />
            <InfoRow label="Email"    value={user?.email} />
            <InfoRow label="Verified" value={user?.emailVerified ? '✅ Yes' : '❌ No'} />
          </InfoCard>

          <InfoCard title="Session Info" icon="🔐">
            {loading ? (
              <p style={{ color: '#52525b', fontSize: '.8rem' }}>Loading...</p>
            ) : (
              <>
                <InfoRow label="Token Preview"  value={profile?.accessToken || '—'} mono />
                <InfoRow
                  label="Expires In"
                  value={expiryMin !== null ? `${expiryMin} min` : '—'}
                  highlight={expiryMin < 2 ? 'red' : expiryMin < 5 ? 'amber' : 'green'}
                />
                <InfoRow label="Auto Refresh"   value="✅ Enabled" />
                <InfoRow label="Signed via"      value="RS256 JWT" mono />
              </>
            )}
          </InfoCard>

          <InfoCard title="SSO Flow" icon="⎆">
            <Step n="1" done label="User visits /login" />
            <Step n="2" done label="Redirected to SSO Server" />
            <Step n="3" done label="Credentials verified by SSO" />
            <Step n="4" done label="Auth code returned" />
            <Step n="5" done label="Backend exchanges code for tokens" />
            <Step n="6" done label="Session created — you are here ✓" />
          </InfoCard>

          <InfoCard title="Auto-Logout" icon="🔔">
            <p style={styles.note}>
              If you logout from <strong>any other app</strong> using this SSO, you will be
              automatically logged out here too via back-channel notification.
            </p>
            <div style={styles.flowMini}>
              <FlowBit>Other App Logout</FlowBit>
              <span style={styles.fa}>→</span>
              <FlowBit>SSO Server</FlowBit>
              <span style={styles.fa}>→</span>
              <FlowBit>This App</FlowBit>
            </div>
          </InfoCard>

        </div>
      </div>

      <style>{`
        @keyframes fadeIn  { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pulse   { 0%,100%{opacity:1} 50%{opacity:.5} }
        @keyframes slideIn { from{opacity:0;transform:translateX(-10px)} to{opacity:1;transform:translateX(0)} }
      `}</style>
    </div>
  );
}

// ── Sub-components ────────────────────────────
function InfoCard({ title, icon, children }) {
  return (
    <div style={cardStyles.card}>
      <div style={cardStyles.header}>
        <span style={cardStyles.icon}>{icon}</span>
        <span style={cardStyles.title}>{title}</span>
      </div>
      <div style={cardStyles.body}>{children}</div>
    </div>
  );
}

function InfoRow({ label, value, mono, highlight }) {
  const valColor = highlight === 'red'   ? '#f87171'
                 : highlight === 'amber' ? '#fbbf24'
                 : highlight === 'green' ? '#4ade80'
                 : '#e2e8f0';
  return (
    <div style={cardStyles.row}>
      <span style={cardStyles.label}>{label}</span>
      <span style={{
        ...cardStyles.value,
        fontFamily: mono ? 'DM Mono, monospace' : 'Outfit, sans-serif',
        fontSize: mono ? '.68rem' : '.8rem',
        color: valColor,
        wordBreak: 'break-all',
      }}>
        {value}
      </span>
    </div>
  );
}

function Step({ n, done, label }) {
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '5px 0' }}>
      <div style={{
        width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
        background: done ? 'rgba(74,222,128,.15)' : 'rgba(255,255,255,.05)',
        border: `1.5px solid ${done ? 'rgba(74,222,128,.4)' : '#2a2a3a'}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '.6rem', color: done ? '#4ade80' : '#52525b', fontWeight: 700,
      }}>{done ? '✓' : n}</div>
      <span style={{ fontSize: '.75rem', color: done ? '#a1a1aa' : '#52525b' }}>{label}</span>
    </div>
  );
}

function FlowBit({ children }) {
  return (
    <span style={{
      fontSize: '.62rem', color: '#4ade80',
      background: 'rgba(74,222,128,.06)',
      border: '1px solid rgba(74,222,128,.15)',
      padding: '3px 8px', borderRadius: 6,
      fontFamily: 'DM Mono, monospace',
    }}>{children}</span>
  );
}

// ── Styles ────────────────────────────────────
const styles = {
  page: {
    minHeight: '100vh', background: '#070709',
    fontFamily: 'Outfit, sans-serif', color: '#e2e8f0',
  },
  grid: {
    position: 'fixed', inset: 0, pointerEvents: 'none',
    backgroundImage: 'linear-gradient(rgba(74,222,128,.025) 1px,transparent 1px),linear-gradient(90deg,rgba(74,222,128,.025) 1px,transparent 1px)',
    backgroundSize: '32px 32px',
  },
  wrap: {
    position: 'relative', zIndex: 1,
    maxWidth: 960, margin: '0 auto', padding: '32px 24px 80px',
    animation: 'fadeIn .5s ease both',
  },
  topbar: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 40,
  },
  brand: { display: 'flex', alignItems: 'center', gap: 10 },
  brandDot: {
    width: 8, height: 8, borderRadius: '50%', background: '#4ade80',
    boxShadow: '0 0 8px #4ade80', animation: 'pulse 2s ease infinite',
  },
  brandText: {
    fontFamily: 'DM Mono, monospace', fontSize: '.7rem',
    letterSpacing: '.2em', color: '#52525b',
  },
  logoutBtn: {
    background: 'transparent',
    border: '1px solid #2a2a3a', borderRadius: 8,
    color: '#71717a', fontSize: '.8rem', padding: '8px 18px',
    cursor: 'pointer', fontFamily: 'Outfit, sans-serif',
    transition: 'all .2s',
  },

  // Hero
  heroCard: {
    position: 'relative', borderRadius: 20, overflow: 'hidden',
    border: '1px solid #1e1e2a', marginBottom: 24,
    background: 'rgba(14,14,18,.95)',
  },
  heroBg: {
    position: 'absolute', inset: 0, pointerEvents: 'none',
    background: 'radial-gradient(ellipse at 50% 0%, rgba(74,222,128,.08) 0%, transparent 60%)',
  },
  heroContent: {
    position: 'relative', zIndex: 1,
    padding: '48px 32px', textAlign: 'center',
  },
  avatarWrap: { position: 'relative', display: 'inline-block', marginBottom: 20 },
  avatarRing: {
    width: 88, height: 88, borderRadius: '50%',
    border: '2px solid rgba(74,222,128,.3)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  avatar: {
    width: 72, height: 72, borderRadius: '50%',
    background: 'linear-gradient(135deg, #4ade80, #22d3ee)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '1.6rem', fontWeight: 800, color: '#000',
  },
  onlineDot: {
    position: 'absolute', bottom: 4, right: 4,
    width: 16, height: 16, borderRadius: '50%',
    background: '#4ade80', border: '2px solid #070709',
    boxShadow: '0 0 8px #4ade80',
  },
  userName: {
    fontSize: '1.8rem', fontWeight: 700, letterSpacing: '-.02em',
    color: '#f1f5f9', marginBottom: 6,
  },
  userEmail: { fontSize: '.9rem', color: '#71717a', marginBottom: 20 },
  badges:  { display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' },
  chip: {
    fontSize: '.68rem', padding: '4px 14px', borderRadius: 999,
    fontFamily: 'DM Mono, monospace', letterSpacing: '.05em',
  },
  chipGreen: {
    background: 'rgba(74,222,128,.1)', color: '#4ade80',
    border: '1px solid rgba(74,222,128,.2)',
  },
  chipCyan: {
    background: 'rgba(34,211,238,.1)', color: '#22d3ee',
    border: '1px solid rgba(34,211,238,.2)',
  },

  // Grid
  grid2: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))',
    gap: 16,
  },

  // Auto-logout note
  note: { fontSize: '.78rem', color: '#71717a', lineHeight: 1.7, marginBottom: 16 },
  flowMini: {
    display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
    marginTop: 8,
  },
  fa: { color: '#3f3f46', fontSize: '.8rem' },
};

const cardStyles = {
  card: {
    background: 'rgba(14,14,18,.95)',
    border: '1px solid #1e1e2a', borderRadius: 16, overflow: 'hidden',
  },
  header: {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '16px 20px', borderBottom: '1px solid #1e1e2a',
    background: 'rgba(255,255,255,.02)',
  },
  icon:  { fontSize: '1rem' },
  title: { fontSize: '.85rem', fontWeight: 600, color: '#a1a1aa' },
  body:  { padding: '16px 20px' },
  row: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
    padding: '7px 0', borderBottom: '1px solid rgba(255,255,255,.04)',
    gap: 16,
  },
  label: {
    fontSize: '.68rem', color: '#52525b', letterSpacing: '.08em',
    textTransform: 'uppercase', flexShrink: 0, paddingTop: 2,
    fontFamily: 'DM Mono, monospace',
  },
  value: { fontSize: '.8rem', textAlign: 'right' },
};
