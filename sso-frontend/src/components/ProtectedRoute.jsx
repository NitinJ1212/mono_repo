// src/components/ProtectedRoute.jsx
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <GlobalLoader />;
  if (!user)   return <Navigate to="/login" replace />;
  return children;
}

export function GlobalLoader() {
  return (
    <div style={{
      position:'fixed',inset:0,display:'flex',flexDirection:'column',
      alignItems:'center',justifyContent:'center',
      background:'#06060a',gap:18,
    }}>
      <div style={{
        width:44,height:44,borderRadius:'50%',
        border:'2px solid #1a1a26',
        borderTop:'2px solid #c8a97e',
        animation:'spin 1s linear infinite',
      }}/>
      <span style={{
        fontFamily:"'DM Mono',monospace",fontSize:'.65rem',
        letterSpacing:'.2em',color:'#3f3f46',
      }}>VERIFYING SESSION</span>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
