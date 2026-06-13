import { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Navbar from '../components/common/Navbar';
import Sidebar from '../components/common/Sidebar';
import useAuth from '../hooks/useAuth';
import api from '../utils/api';
import AttendanceRecorder from './teacher/AttendanceRecorder';
import ResultsEntry from './teacher/ResultsEntry';

const LINKS = [
  { to: '/teacher/dashboard',  label: 'Dashboard',  iconName: 'LayoutDashboard' },
  { to: '/teacher/attendance', label: 'Attendance',  iconName: 'CalendarDays' },
  { to: '/teacher/results',    label: 'Results',     iconName: 'FileCheck' },
  { to: '/teacher/students',   label: 'Students',    iconName: 'GraduationCap' },
  { to: '/settings',           label: 'Settings',    iconName: 'Settings' },
];

/* ── Metric card ── */
function MetricCard({ icon, label, value, colour }) {
  return (
    <div
      className="rounded-2xl p-5 flex items-start gap-4"
      style={{
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        background: 'rgba(255,255,255,0.06)',
        border: '1px solid rgba(255,255,255,0.09)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
      }}
    >
      <div
        className="w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
        style={{ background: colour || 'rgba(249,115,22,0.15)', border: '1px solid rgba(255,255,255,0.1)' }}
      >
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold text-white">{value ?? '—'}</p>
        <p className="text-sm font-medium text-white/70">{label}</p>
      </div>
    </div>
  );
}

/* ── Dashboard home ── */
function TeacherDashboardHome() {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState({ students: null, classes: null });

  useEffect(() => {
    api.get('/users?role=student')
      .then(r => setMetrics(m => ({ ...m, students: r.data.total })))
      .catch(() => {});
  }, []);

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-white">
          Welcome, {user?.name?.split(' ')[0]} 👋
        </h2>
        <p className="text-sm text-white/40 mt-0.5">Manage attendance and results for your classes.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <MetricCard icon="🎒" label="Students"       value={metrics.students} colour="rgba(59,130,246,0.18)" />
        <MetricCard icon="📅" label="Attendance"     value={null}             colour="rgba(34,197,94,0.18)" />
        <MetricCard icon="📊" label="Results Entered" value={null}            colour="rgba(168,85,247,0.18)" />
        <MetricCard icon="🔔" label="Notifications"  value={null}             colour="rgba(249,115,22,0.18)" />
      </div>

      <div
        className="rounded-2xl p-5"
        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
      >
        <h3 className="text-xs font-semibold text-white/30 uppercase tracking-widest mb-3">Quick Actions</h3>
        <div className="grid grid-cols-2 gap-3">
          {[
            { icon: '📅', label: 'Record Attendance', path: '/teacher/attendance' },
            { icon: '📊', label: 'Enter Results',      path: '/teacher/results' },
            { icon: '🎒', label: 'View Students',      path: '/teacher/students' },
            { icon: '⚙️', label: 'Settings',           path: '/settings' },
          ].map(({ icon, label, path }) => (
            <a
              key={path}
              href={path}
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-white/70 hover:text-white transition-all"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)' }}
            >
              <span>{icon}</span>
              <span className="font-medium">{label}</span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Students list ── */
function TeacherStudentsList() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/users?role=student')
      .then(r => setUsers(r.data.users || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h2 className="text-lg font-bold text-white mb-4">Students</h2>
      {loading ? (
        <p className="text-white/40 text-sm">Loading…</p>
      ) : (
        <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                {['Name', 'Email', 'Status'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-white/40 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((u, i) => (
                <tr key={u.id} style={{ borderBottom: i < users.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                  <td className="px-4 py-3 text-white/80 font-medium">{u.name}</td>
                  <td className="px-4 py-3 text-white/50">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${u.is_active ? 'text-green-400 bg-green-400/10' : 'text-red-400 bg-red-400/10'}`}>
                      {u.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr><td colSpan={3} className="px-4 py-6 text-center text-white/30 text-sm">No students found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ── Glass wrapper for existing form components ── */
function GlassSection({ title, children }) {
  return (
    <div>
      <h2 className="text-lg font-bold text-white mb-4">{title}</h2>
      <div
        className="rounded-2xl p-5 max-w-lg"
        style={{
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.09)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
        }}
      >
        {children}
      </div>
    </div>
  );
}

export default function TeacherView() {
  return (
    <div
      className="flex flex-col min-h-screen"
      style={{ background: 'linear-gradient(135deg, #0a0f23 0%, #0f1a35 50%, #0a0f23 100%)' }}
    >
      <Navbar />
      <div className="flex flex-1">
        <Sidebar links={LINKS} title="Teacher Portal" />
        <main className="flex-1 p-6 overflow-y-auto">
          <Routes>
            <Route path="dashboard"  element={<TeacherDashboardHome />} />
            <Route path="attendance" element={
              <GlassSection title="Record Attendance">
                <AttendanceRecorder />
              </GlassSection>
            } />
            <Route path="results" element={
              <GlassSection title="Enter Results">
                <ResultsEntry />
              </GlassSection>
            } />
            <Route path="students" element={<TeacherStudentsList />} />
            <Route path="*"        element={<Navigate to="dashboard" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
