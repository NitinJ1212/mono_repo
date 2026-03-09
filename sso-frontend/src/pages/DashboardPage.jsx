// src/pages/DashboardPage.jsx
import { useAuth } from '../hooks/useAuth';
import { useState } from 'react';
import { Link } from 'react-router-dom';

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);
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
          <Link to="/dashboard" style={{ ...s.navLink, color:'#c8a97e' }}>Dashboard</Link>
          <Link to="/profile"   style={s.navLink}>Profile</Link>
        </div>
        <div style={s.topRight}>
          <div style={s.pill}><span style={s.pillDot}/>Session Active</div>
          <button
            disabled={loggingOut}
            style={s.logoutBtn}
            onClick={async () => { setLoggingOut(true); await logout(); }}
          >{loggingOut ? 'Signing out…' : 'Sign Out'}</button>
        </div>
      </div>

      <div style={s.body}>
        {/* Welcome hero */}
        <div style={s.hero}>
          <div style={s.heroLeft}>
            <div style={s.avatar}>{initials}</div>
            <div>
              <p style={s.heroLabel}>Authenticated via SSO ✓</p>
              <h1 style={s.heroName}>Welcome, {user?.name || user?.email?.split('@')[0]}</h1>
              <p style={s.heroEmail}>{user?.email}</p>
            </div>
          </div>
          <div style={s.heroRight}>
            <div style={s.heroBadge}>
              <span style={s.heroBadgeDot}/>
              <span>RS256 · PKCE · OpenID</span>
            </div>
          </div>
          <div style={s.heroGlow}/>
        </div>

        {/* Stats row */}
        <div style={s.statsRow}>
          {[
            { label:'User ID',        val: user?.id?.slice(0, 8) + '…',  color:'#c8a97e' },
            { label:'Email Verified', val: user?.emailVerified ? 'Yes' : 'No', color: user?.emailVerified ? '#4ade80' : '#fb7185' },
            { label:'Auth Method',    val:'SSO · PKCE',  color:'#a78bfa' },
            { label:'Token Type',     val:'Bearer JWT',  color:'#38bdf8' },
          ].map((stat, i) => (
            <div key={i} style={s.statCard}>
              <div style={s.statLabel}>{stat.label}</div>
              <div style={{ ...s.statVal, color: stat.color }}>{stat.val}</div>
            </div>
          ))}
        </div>

        {/* Info cards */}
        <div style={s.grid}>
          <InfoCard title="SSO Flow" icon="⎆">
            {[
              'React checks session → GET /api/auth/me',
              'Backend returns user from session',
              'ProtectedRoute allows access',
              'Dashboard loads with user data',
            ].map((step, i) => (
              <div key={i} style={s.step}>
                <div style={s.stepNum}>{i + 1}</div>
                <span style={{ fontSize:'.73rem', color:'#71717a', lineHeight:1.5 }}>{step}</span>
              </div>
            ))}
          </InfoCard>

          <InfoCard title="Your Session" icon="◈">
            <Row label="Name"   val={user?.name || '—'} />
            <Row label="Email"  val={user?.email} />
            <Row label="ID"     val={user?.id} mono />
            <Row label="Scope"  val="openid profile email" />
          </InfoCard>

          <InfoCard title="Security Active" icon="⊕">
            {['PKCE S256','RS256 JWT','Token Rotation','Back-channel Logout','CSRF Guard','AES Session'].map((f,i) => (
              <div key={i} style={s.secItem}>
                <span style={s.secDot}/>
                <span style={{ fontSize:'.73rem', color:'#a1a1aa' }}>{f}</span>
                <span style={s.secOk}>✓</span>
              </div>
            ))}
          </InfoCard>

          <InfoCard title="Quick Actions" icon="→">
            <Link to="/profile" style={s.actionBtn}>View Full Profile →</Link>
            <div style={{ height:10 }}/>
            <button
              onClick={async () => { setLoggingOut(true); await logout(); }}
              style={{ ...s.actionBtn, ...s.actionBtnDanger }}
            >
              Sign Out from all apps →
            </button>
            <p style={s.actionNote}>Logout will propagate to ALL connected SSO client apps via back-channel.</p>
          </InfoCard>
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

function InfoCard({ title, icon, children }) {
  return (
    <div style={cs.card}>
      <div style={cs.head}><span style={cs.icon}>{icon}</span><span style={cs.title}>{title}</span></div>
      <div style={cs.body}>{children}</div>
    </div>
  );
}
function Row({ label, val, mono }) {
  return (
    <div style={cs.row}>
      <span style={cs.label}>{label}</span>
      <span style={{ ...cs.val, fontFamily: mono ? "'DM Mono',monospace" : 'inherit',
        fontSize: mono ? '.63rem' : '.76rem' }}>{val}</span>
    </div>
  );
}

const G = '#c8a97e', BG = '#06060a', SURF = '#0d0d12', SURF2 = '#111117', BRD = '#1e1e2a';

const s = {
  page: { minHeight:'100vh', background:BG, color:'#e2e0da',
          fontFamily:"'Fraunces',Georgia,serif", animation:'fadeUp .5s ease both' },
  topbar: {
    display:'flex',alignItems:'center',justifyContent:'space-between',gap:16,
    padding:'14px 36px',borderBottom:`1px solid ${BRD}`,
    background:SURF2,position:'sticky',top:0,zIndex:10,
  },
  brand:     { display:'flex',alignItems:'center',gap:10,flexShrink:0 },
  brandIcon: { width:32,height:32,display:'flex',alignItems:'center',justifyContent:'center',
               background:'rgba(200,169,126,.07)',border:`1px solid rgba(200,169,126,.2)`,borderRadius:8 },
  brandName: { fontFamily:"'DM Mono',monospace",fontSize:'.65rem',letterSpacing:'.22em',color:G },
  topNav:    { display:'flex',gap:24,flex:1,justifyContent:'center' },
  navLink:   { fontFamily:"'DM Mono',monospace",fontSize:'.67rem',letterSpacing:'.1em',color:'#52525b',transition:'color .2s' },
  topRight:  { display:'flex',alignItems:'center',gap:12,flexShrink:0 },
  pill: { display:'flex',alignItems:'center',gap:7,background:'rgba(74,222,128,.06)',
          border:'1px solid rgba(74,222,128,.18)',borderRadius:999,padding:'5px 12px',
          fontFamily:"'DM Mono',monospace",fontSize:'.58rem',color:'#4ade80',letterSpacing:'.08em' },
  pillDot: { width:6,height:6,borderRadius:'50%',background:'#4ade80',
             boxShadow:'0 0 6px #4ade80',animation:'glow 2s ease infinite' },
  logoutBtn: { background:'transparent',border:`1px solid ${BRD}`,borderRadius:8,
               color:'#71717a',fontSize:'.7rem',padding:'7px 16px',cursor:'pointer',
               fontFamily:"'DM Mono',monospace",letterSpacing:'.05em' },

  body: { maxWidth:1020,margin:'0 auto',padding:'44px 28px 80px' },

  hero: {
    display:'flex',alignItems:'center',justifyContent:'space-between',
    padding:'32px 36px',background:SURF,border:`1px solid ${BRD}`,
    borderRadius:18,marginBottom:20,position:'relative',overflow:'hidden',
  },
  heroLeft:  { display:'flex',alignItems:'center',gap:24 },
  avatar: {
    width:68,height:68,borderRadius:'50%',flexShrink:0,
    background:`linear-gradient(135deg, ${G}, #7a5828)`,
    display:'flex',alignItems:'center',justifyContent:'center',
    fontSize:'1.5rem',fontWeight:300,fontStyle:'italic',color:'#1a0f04',
  },
  heroLabel: { fontFamily:"'DM Mono',monospace",fontSize:'.6rem',letterSpacing:'.15em',
               color:'#52525b',marginBottom:6,textTransform:'uppercase' },
  heroName:  { fontSize:'clamp(1.2rem,2.5vw,1.7rem)',fontWeight:300,fontStyle:'italic',
               color:'#e8e0d4',marginBottom:4 },
  heroEmail: { fontFamily:"'DM Mono',monospace",fontSize:'.68rem',color:'#52525b' },
  heroRight: {},
  heroBadge: { display:'flex',alignItems:'center',gap:8,background:'rgba(200,169,126,.07)',
               border:`1px solid rgba(200,169,126,.18)`,borderRadius:10,padding:'8px 14px',
               fontFamily:"'DM Mono',monospace",fontSize:'.6rem',color:G,letterSpacing:'.08em' },
  heroBadgeDot: { width:7,height:7,borderRadius:'50%',background:G,
                  boxShadow:`0 0 8px ${G}`,animation:'glow 2.5s ease infinite' },
  heroGlow: { position:'absolute',top:0,right:0,width:300,height:'100%',pointerEvents:'none',
              background:'radial-gradient(ellipse at right center, rgba(200,169,126,.04) 0%, transparent 70%)' },

  statsRow: { display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',
              gap:12,marginBottom:20 },
  statCard: { background:SURF,border:`1px solid ${BRD}`,borderRadius:12,padding:'18px 20px' },
  statLabel: { fontFamily:"'DM Mono',monospace",fontSize:'.58rem',letterSpacing:'.1em',
               color:'#52525b',marginBottom:8,textTransform:'uppercase' },
  statVal:   { fontSize:'.9rem',fontWeight:300,fontStyle:'italic' },

  grid: { display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(440px,1fr))',gap:14 },

  step: { display:'flex',gap:12,alignItems:'flex-start',padding:'7px 0',
          borderBottom:'1px solid rgba(255,255,255,.03)' },
  stepNum: { width:22,height:22,borderRadius:'50%',flexShrink:0,
             background:'rgba(200,169,126,.1)',border:`1px solid rgba(200,169,126,.2)`,
             display:'flex',alignItems:'center',justifyContent:'center',
             fontFamily:"'DM Mono',monospace",fontSize:'.6rem',color:G },

  secItem: { display:'flex',alignItems:'center',gap:10,padding:'7px 0',
             borderBottom:'1px solid rgba(255,255,255,.03)' },
  secDot:  { width:7,height:7,borderRadius:'50%',background:'#4ade80',
             boxShadow:'0 0 5px rgba(74,222,128,.5)',flexShrink:0 },
  secOk:   { marginLeft:'auto',color:'#4ade80',fontSize:'.72rem' },

  actionBtn: {
    display:'block',width:'100%',padding:'12px 16px',textAlign:'left',
    background:'rgba(200,169,126,.07)',border:`1px solid rgba(200,169,126,.2)`,
    borderRadius:10,color:G,fontSize:'.75rem',cursor:'pointer',
    fontFamily:"'Fraunces',Georgia,serif",fontStyle:'italic',transition:'all .2s',
  },
  actionBtnDanger: {
    background:'rgba(239,68,68,.05)',border:'1px solid rgba(239,68,68,.15)',color:'#fb7185',
  },
  actionNote: { marginTop:14,fontSize:'.65rem',color:'#52525b',lineHeight:1.6,fontFamily:"'DM Mono',monospace" },
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
  val:   { fontSize:'.76rem',color:'#e2e8f0',textAlign:'right',wordBreak:'break-all' },
};
