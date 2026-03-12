// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth';
import ProtectedRoute  from './components/ProtectedRoute';
import LoginPage       from './pages/LoginPage';
import ProfilePage     from './pages/ProfilePage';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/login"   element={<LoginPage />} />

          {/* Protected */}
          <Route path="/profile" element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          }/>

          {/* Default redirect */}
          <Route path="*" element={<Navigate to="/profile" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
