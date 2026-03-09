// src/pages/ProfilePage.jsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { getProfile } from '../api/auth';

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const [profile,    setProfile]    = useState(null);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    getProfile().then(setProfile).catch(console.error);
  }, []);

  const initials = user?.name
    ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : user?.email?.[0]?.toUpperCase() || '?';

  return (
    <div style={s.page}>
      {/* Topbar */}
      <div style={s.topbar}>
        <div style={s.brand}>
          <div style={s.brandIcon}>
            <svg width="16" height="16" viewBox="0 0 22 22" fill="none">
              <rect x="1" y="1" width="20" height="20" rx="6" stroke="#c8a97e" strokeWidth="1.3"/>
              <circle cx="11" cy="11" r="4" stroke="#c8a97e" strokeWidth="1.3"/>
            </svg>
          </div>
          <span style={s.brandName}>NEXUS SSO</span>
        </div>
        <div style={s.topNav}>
          <Link to="/dashboard" style={s.navLink}>Dashboard</Link>
          <Link to="/profile"   style={{ ...s.navLink, color:'#c8a97e' }}>Profile</Link>
        </div>
        <button
          disabled={loggingOut}
          style={s.logoutBtn}
          onClick={async () => { setLoggingOut(true); await logout(); }}
        >{loggingOut ? 'Signing out…' : 'Sign Out'}</button>
      </div>

      <div style={s.body}>
        {/* Profile hero */}
        <div style={s.hero}>
          <div style={s.avatarWrap}>
            <div style={s.avatarRing}>
              <div style={s.avatar}>{initials}</div>
            </div>
            <div style={s.avatarOnline}/>
          </div>
          <div>
            <p style={s.heroTag}>SSO Identity Profile</p>
            <h1 style={s.heroName}>{user?.name || 'Unknown User'}</h1>
            <p style={s.heroEmail}>{user?.email}</p>
            <div style={s.heroBadges}>
              <span style={{ ...s.badge, ...s.badgeGold }}>● SSO Authenticated</span>
              {user?.emailVerified && <span style={{ ...s.badge, ...s.badgeGreen }}>✓ Verified</span>}
            </div>
          </div>
        </div>

        <div style={s.grid}>
          {/* Identity */}
          <Section title="Identity" icon="◈">
            <Row label="Full Name"       val={user?.name || '—'} />
            <Row label="Email Address"   val={user?.email} />
            <Row label="Email Verified"  val={user?.emailVerified ? '✅ Verified' : '❌ Not Verified'}/>
            <Row label="User ID (sub)"   val={user?.id} mono />
          </Section>

          {/* Token Info */}
          <Section title="Token Info" icon="⟨/⟩">
            <Row label="Algorithm"    val="RS256 (Asymmetric)" />
            <Row label="Grant Type"   val="Authorization Code + PKCE" />
            <Row label="Scope"        val="openid profile email" />
            <Row label="Expires In"
                 val={profile ? `${Math.max(0, profile.expiresIn)}s` : 'Loading…'}
                 color={profile?.expiresIn > 300 ? '#4ade80' : profile?.expiresIn > 60 ? '#fbbf24' : '#fb7185'}
            />
            <div style={s.tokenPreview}>
              <div style={s.tokenLabel}>Access Token Preview</div>
              <div style={s.tokenVal}>{profile?.tokenPreview || '…loading'}</div>
            </div>
          </Section>

          {/* Security */}
          <Section title="Security" icon="⊕">
            {[
              { name:'PKCE S256',           desc:'SHA256 code challenge',         on:true },
              { name:'RS256 JWT',           desc:'RSA asymmetric signing',        on:true },
              { name:'Refresh Rotation',    desc:'Old token killed on refresh',   on:true },
              { name:'Back-channel Logout', desc:'Global SSO propagation',        on:true },
              { name:'CSRF State Check',    desc:'State param verified',          on:true },
              { name:'HttpOnly Cookie',     desc:'Session cookie protection',     on:true },
            ].map((item, i) => (
              <div key={i} style={s.secRow}>
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <span style={{ ...s.secDot, background: item.on ? '#4ade80' : '#52525b',
                    boxShadow: item.on ? '0 0 6px rgba(74,222,128,.4)' : 'none' }}/>
                  <div>
                    <div style={{ fontSize:'.73rem', color:'#a1a1aa' }}>{item.name}</div>
                    <div style={{ fontSize:'.62rem', color:'#52525b', fontFamily:"'DM Mono',monospace" }}>{item.desc}</div>
                  </div>
                </div>
                <span style={{ fontSize:'.68rem', color: item.on ? '#4ade80' : '#52525b' }}>
                  {item.on ? '✓ Active' : '✗ Off'}
                </span>
              </div>
            ))}
          </Section>

          {/* Actions */}
          <Section title="Actions" icon="→">
            <Link to="/dashboard" style={s.actionBtn}>← Back to Dashboard</Link>
            <div style={{ height:10 }}/>
            <button
              onClick={async () => { setLoggingOut(true); await logout(); }}
              style={{ ...s.actionBtn, ...s.actionBtnRed, border:'1px solid rgba(239,68,68,.2)' }}
            >
              ⊗ Sign Out (all apps)
            </button>
            <p style={s.actionNote}>
              Signing out here will send a back-channel logout to ALL connected SSO client apps, logging you out everywhere simultaneously.
            </p>
          </Section>
        </div>
      </div>

      <style>{`
        @keyframes glow { 0%,100%{opacity:.4} 50%{opacity:.9} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        * { box-sizing:border-box; margin:0; padding:0; }
        body { background:#06060a; }
        a { text-decoration:none; }
      `}</style>
    </div>
  );
}

function Section({ title, icon, children }) {
  return (
    <div style={cs.card}>
      <div style={cs.head}><span style={cs.icon}>{icon}</span><span style={cs.title}>{title}</span></div>
      <div style={cs.body}>{children}</div>
    </div>
  );
}
function Row({ label, val, mono, color }) {
  return (
    <div style={cs.row}>
      <span style={cs.label}>{label}</span>
      <span style={{ ...cs.val, fontFamily: mono ? "'DM Mono',monospace" : 'inherit',
        fontSize: mono ? '.62rem' : '.75rem', color: color || '#e2e8f0' }}>{val}</span>
    </div>
  );
}

const G='#c8a97e', BG='#06060a', SURF='#0d0d12', SURF2='#111117', BRD='#1e1e2a';

const s = {
  page: { minHeight:'100vh',background:BG,color:'#e2e0da',
          fontFamily:"'Fraunces',Georgia,serif",animation:'fadeUp .5s ease both' },
  topbar: {
    display:'flex',alignItems:'center',justifyContent:'space-between',gap:16,
    padding:'14px 36px',borderBottom:`1px solid ${BRD}`,background:SURF2,
    position:'sticky',top:0,zIndex:10,
  },
  brand:     { display:'flex',alignItems:'center',gap:10,flexShrink:0 },
  brandIcon: { width:32,height:32,display:'flex',alignItems:'center',justifyContent:'center',
               background:'rgba(200,169,126,.07)',border:`1px solid rgba(200,169,126,.2)`,borderRadius:8 },
  brandName: { fontFamily:"'DM Mono',monospace",fontSize:'.65rem',letterSpacing:'.22em',color:G },
  topNav:    { display:'flex',gap:24,flex:1,justifyContent:'center' },
  navLink:   { fontFamily:"'DM Mono',monospace",fontSize:'.67rem',letterSpacing:'.1em',color:'#52525b' },
  logoutBtn: { background:'transparent',border:`1px solid ${BRD}`,borderRadius:8,
               color:'#71717a',fontSize:'.7rem',padding:'7px 16px',cursor:'pointer',
               fontFamily:"'DM Mono',monospace",letterSpacing:'.05em',flexShrink:0 },

  body: { maxWidth:1020,margin:'0 auto',padding:'44px 28px 80px' },

  hero: {
    display:'flex',alignItems:'center',gap:28,padding:'36px',
    background:SURF,border:`1px solid ${BRD}`,borderRadius:18,marginBottom:20,
  },
  avatarWrap:   { position:'relative',flexShrink:0 },
  avatarRing:   { width:88,height:88,borderRadius:'50%',border:`1px solid rgba(200,169,126,.25)`,
                  display:'flex',alignItems:'center',justifyContent:'center',animation:'glow 3s ease infinite' },
  avatar:       { width:72,height:72,borderRadius:'50%',
                  background:`linear-gradient(135deg, ${G}, #7a5828)`,
                  display:'flex',alignItems:'center',justifyContent:'center',
                  fontSize:'1.5rem',fontWeight:300,fontStyle:'italic',color:'#1a0f04' },
  avatarOnline: { position:'absolute',bottom:4,right:4,width:16,height:16,borderRadius:'50%',
                  background:'#4ade80',border:'2px solid #06060a',boxShadow:'0 0 8px #4ade80' },
  heroTag:   { fontFamily:"'DM Mono',monospace",fontSize:'.6rem',letterSpacing:'.15em',
               color:'#52525b',marginBottom:6,textTransform:'uppercase' },
  heroName:  { fontSize:'clamp(1.4rem,3vw,2rem)',fontWeight:300,fontStyle:'italic',
               color:'#e8e0d4',marginBottom:4 },
  heroEmail: { fontFamily:"'DM Mono',monospace",fontSize:'.7rem',color:'#52525b',marginBottom:14 },
  heroBadges:{ display:'flex',gap:10,flexWrap:'wrap' },
  badge: { fontSize:'.62rem',padding:'3px 12px',borderRadius:999,fontFamily:"'DM Mono',monospace",letterSpacing:'.06em' },
  badgeGold:  { background:'rgba(200,169,126,.1)',color:G,border:`1px solid rgba(200,169,126,.25)` },
  badgeGreen: { background:'rgba(74,222,128,.1)',color:'#4ade80',border:'1px solid rgba(74,222,128,.25)' },

  grid: { display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(440px,1fr))',gap:14 },

  tokenPreview: { marginTop:14,background:'#080810',border:`1px solid ${BRD}`,borderRadius:8,padding:14 },
  tokenLabel:   { fontFamily:"'DM Mono',monospace",fontSize:'.57rem',letterSpacing:'.12em',
                  color:'#52525b',marginBottom:6,textTransform:'uppercase' },
  tokenVal:     { fontFamily:"'DM Mono',monospace",fontSize:'.62rem',color:'#71717a',wordBreak:'break-all',lineHeight:1.6 },

  secRow: { display:'flex',justifyContent:'space-between',alignItems:'center',
            padding:'9px 0',borderBottom:'1px solid rgba(255,255,255,.03)' },
  secDot: { width:8,height:8,borderRadius:'50%',flexShrink:0 },

  actionBtn: {
    display:'block',width:'100%',padding:'12px 18px',textAlign:'left',
    background:'rgba(200,169,126,.07)',border:`1px solid rgba(200,169,126,.2)`,
    borderRadius:10,color:G,fontSize:'.75rem',cursor:'pointer',
    fontFamily:"'Fraunces',Georgia,serif",fontStyle:'italic',
  },
  actionBtnRed: { background:'rgba(239,68,68,.05)',color:'#fb7185' },
  actionNote: { marginTop:14,fontSize:'.63rem',color:'#52525b',lineHeight:1.7,
                fontFamily:"'DM Mono',monospace" },
};

const cs = {
  card:  { background:SURF,border:`1px solid ${BRD}`,borderRadius:16,overflow:'hidden' },
  head:  { display:'flex',alignItems:'center',gap:10,padding:'14px 20px',
           borderBottom:`1px solid ${BRD}`,background:SURF2 },
  icon:  { color:G,fontSize:'.9rem' },
  title: { fontFamily:"'DM Mono',monospace",fontSize:'.67rem',letterSpacing:'.1em',color:'#71717a' },
  body:  { padding:'16px 20px' },
  row:   { display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:12,
           padding:'7px 0',borderBottom:'1px solid rgba(255,255,255,.03)' },
  label: { fontFamily:"'DM Mono',monospace",fontSize:'.58rem',letterSpacing:'.1em',
           color:'#52525b',textTransform:'uppercase',flexShrink:0,paddingTop:2 },
  val:   { fontSize:'.75rem',textAlign:'right',wordBreak:'break-all' },
};
