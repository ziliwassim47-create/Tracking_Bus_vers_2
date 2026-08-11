import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import './App.css';
import { AuthProvider, useAuth } from './AuthContext';
import { ToastProvider } from './components/Shared';
import LoginPage from './pages/LoginPage';
import ParentDashboard from './pages/parent/ParentDashboard';

// ─── Protected Route ──────────────────────────────────────────────────────────
function ProtectedRoute({ children, allowedRole }) {
  const { session } = useAuth();
  if (!session) return <Navigate to="/login" replace />;
  if (allowedRole && session.role !== allowedRole) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

// ─── Root redirect ────────────────────────────────────────────────────────────
function RootRedirect() {
  const { session } = useAuth();
  if (!session) return <Navigate to="/login" replace />;
  if (session.role === 'parent') return <Navigate to="/parent" replace />;
  return <Navigate to="/login" replace />;
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            {/* Public */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/" element={<RootRedirect />} />

            <Route path="/parent" element={
              <ProtectedRoute allowedRole="parent"><ParentDashboard /></ProtectedRoute>
            } />

            {/* Catch-all */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  );
}
