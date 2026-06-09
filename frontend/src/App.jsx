import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Pages
import LandingPage      from './pages/LandingPage';
import LoginPage        from './pages/LoginPage';
import StudentPortal    from './pages/StudentPortal';
import AdminDashboard   from './pages/AdminDashboard';
import StaffDashboard   from './pages/StaffDashboard';
import TeacherView      from './pages/TeacherView';
import ParentView       from './pages/ParentView';
import SettingsPage     from './pages/SettingsPage';
import DevAccountsPage  from './pages/DevAccountsPage';

// Route guard
import ProtectedRoute from './components/common/ProtectedRoute';

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ToastContainer position="top-right" autoClose={3000} theme="dark" />
        <BrowserRouter>
          <Routes>
            {/* ── Public ── */}
            <Route path="/login"        element={<LoginPage />} />
            <Route path="/dev/accounts" element={<DevAccountsPage />} />

            {/* ── Settings (all authenticated roles) ── */}
            <Route
              path="/settings"
              element={
                <ProtectedRoute allowedRoles={['admin', 'staff', 'student', 'teacher', 'parent']}>
                  <SettingsPage />
                </ProtectedRoute>
              }
            />

            {/* ── Student portal ── */}
            <Route
              path="/student/*"
              element={
                <ProtectedRoute allowedRoles={['student']}>
                  <StudentPortal />
                </ProtectedRoute>
              }
            />

            {/* ── Admin dashboard ── */}
            <Route
              path="/admin/*"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />

            {/* ── Staff dashboard ── */}
            <Route
              path="/staff/*"
              element={
                <ProtectedRoute allowedRoles={['staff']}>
                  <StaffDashboard />
                </ProtectedRoute>
              }
            />

            {/* ── Teacher view ── */}
            <Route
              path="/teacher/*"
              element={
                <ProtectedRoute allowedRoles={['teacher']}>
                  <TeacherView />
                </ProtectedRoute>
              }
            />

            {/* ── Parent view ── */}
            <Route
              path="/parent/*"
              element={
                <ProtectedRoute allowedRoles={['parent']}>
                  <ParentView />
                </ProtectedRoute>
              }
            />

            {/* ── Landing / fallback ── */}
            <Route path="/" element={<LandingPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
