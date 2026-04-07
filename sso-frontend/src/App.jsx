// import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
// import { AuthProvider } from './hooks/useAuth';
// import { ProtectedRoute } from './components/ProtectedRoute';
// import LoginPage from './pages/LoginPage';
// import DashboardPage from './pages/DashboardPage';
// import ProfilePage from './pages/ProfilePage';
// import RegisterClientPage from './pages/RegisterClientPage';
// import SignupPage from './pages/SignupPage';
// import { useAuth }        from './hooks/useAuth';

// export default function App() {

//   return (
//     <AuthProvider>
//       <BrowserRouter>
//         <Routes>
//           {/* Public */}
//           <Route path="/login" element={<LoginPage />} />
//           <Route path="/register" element={<RegisterClientPage />} />
//           <Route path="/signup" element={<SignupPage />} />

//           {/* Protected — redirects to /login if not logged in */}
//           <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
//           <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />

//           {/* Default */}
//           <Route path="*" element={<Navigate to="/dashboard" replace />} />
//         </Routes>
//       </BrowserRouter>
//     </AuthProvider>
//   );
// }




import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth';
import { ProtectedRoute } from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ProfilePage from './pages/ProfilePage';
import RegisterClientPage from './pages/RegisterClientPage';
import SignupPage from './pages/SignupPage';
import { useAuth } from './hooks/useAuth';

// ─── PublicRoute ───────────────────────────────────────────
// Already logged in? → redirect to /dashboard
// Not logged in?     → show the page normally
function PublicRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) return null; // wait for session check to finish
  console.log(user)
  if (user) return <Navigate to="/dashboard" replace />;

  return children;
}

// ─── App ───────────────────────────────────────────────────
export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>

          {/* Public — logged-in user redirect to /dashboard */}
          <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
          <Route path="/signup" element={<PublicRoute><SignupPage /></PublicRoute>} />
          <Route path="/register" element={<PublicRoute><RegisterClientPage /></PublicRoute>} />

          {/* Protected — not logged-in redirect to /login */}
          <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />

          {/* Default */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />

        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}