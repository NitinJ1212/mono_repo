// src/components/ProtectedRoute.jsx
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        minHeight: '100vh', background: '#070709', color: '#4ade80',
        fontFamily: 'DM Mono, monospace', fontSize: '.85rem',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div className="spin" style={{
            width: 40, height: 40, border: '2px solid #1a1a24',
            borderTop: '2px solid #4ade80', borderRadius: '50%',
            margin: '0 auto 16px', animation: 'spin 1s linear infinite',
          }}/>
          Checking session...
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  return children;
}
