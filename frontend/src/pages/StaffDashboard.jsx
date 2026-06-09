import { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import Navbar from '../components/common/Navbar';
import Sidebar from '../components/common/Sidebar';
import api from '../utils/api';
import useAuth from '../hooks/useAuth';
import StaffProfileSection from './staff/ProfileSection';

const LINKS = [
  { to: '/staff/dashboard',      label: 'Dashboard',     icon: '🏠' },
  { to: '/staff/students',       label: 'Students',      icon: '🎒' },
  { to: '/staff/attendance',     label: 'Attendance',    icon: '📅' },
  { to: '/staff/announcements',  label: 'Announcements', icon: '📢' },
  { to: '/settings',             label: 'Settings',      icon: '⚙️' },
];

/* ── Metric card ── */
function MetricCard({ icon, label, value, colour, onClick }) {
  return (
    <button
      onClick={onClick}
      className="rounded-2xl p-5 flex items-start gap-4 text-left w-full transition-all hover:scale-[1.02]"
      style={{
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        background: 'rgba(255,255,255,0.06)',
        border: '1px solid rgba(255,255,255,0.09)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
      }}
    >
      <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
        style={{ background: colour || 'rgba(249,115,22,0.15)', border: '1px solid rgba(255,255,255,0.1)' }}>
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold text-white">{value ?? '—'}</p>
        <p className="text-sm font-medium text-white/70">{label}</p>
      </div>
    </button>
  );
}

/* ── Dashboard home ── */
function StaffDashboardHome() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState(null);

  useEffect(() => {
    api.get('/staff-portal/metrics')
      .then(r => setMetrics(r.data))
      .catch(() => {});
  }, []);

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-white">Welcome back, {user?.name?.split(' ')[0]} 👋</h2>
        <p className="text-sm text-white/40 mt-0.5">Here's your staff overview for today.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <MetricCard icon="🎒" label="Students"      value={metrics?.total_students}      colour="rgba(59,130,246,0.15)"  onClick={() => navigate('/staff/students')} />
        <MetricCard icon="📅" label="Attendance"    value={null}                          colour="rgba(34,197,94,0.15)"   onClick={() => navigate('/staff/attendance')} />
        <MetricCard icon="📢" label="Announcements" value={metrics?.total_announcements}  colour="rgba(168,85,247,0.15)"  onClick={() => navigate('/staff/announcements')} />
        <MetricCard icon="🔔" label="Notifications" value="—"                             colour="rgba(249,115,22,0.15)"  onClick={() => {}} />
      </div>

      {/* Quick actions */}
      <div className="rounded-2xl p-5"
        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
        <h3 className="text-xs font-semibold text-white/30 uppercase tracking-widest mb-3">Quick Actions</h3>
        <div className="grid grid-cols-2 gap-3">
          {[
            { icon: '📅', label: 'Record Attendance',  path: '/staff/attendance' },
            { icon: '📢', label: 'View Announcements', path: '/staff/announcements' },
            { icon: '🎒', label: 'View Students',      path: '/staff/students' },
            { icon: '⚙️', label: 'Settings',           path: '/settings' },
          ].map(({ icon, label, path }) => (
            <button key={path} onClick={() => navigate(path)}
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-white/70 hover:text-white transition-all text-left"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <span>{icon}</span>
              <span className="font-medium">{label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Students list (read-only via staff-portal endpoint) ── */
function StudentsListSection() {
  const [users, setUsers]   = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const params = search ? `?q=${encodeURIComponent(search)}` : '';
    api.get(`/staff-portal/students${params}`)
      .then(r => setUsers(r.data.users || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [search]);

  return (
    <div>
      <h2 className="text-lg font-bold text-white mb-4">Students</h2>

      {/* Search */}
      <div className="mb-4 relative max-w-sm">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 text-sm">🔍</span>
        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search students…"
          className="w-full pl-8 pr-3 py-2.5 rounded-xl text-sm text-white/90 focus:outline-none focus:ring-2 focus:ring-orange-400/60"
          style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }} />
      </div>

      <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
        {loading ? (
          <div className="py-10 text-center text-white/30 text-sm">Loading…</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                {['Name', 'Email', 'Level', 'Status'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-white/40 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((u, i) => (
                <tr key={u.id} style={{ borderBottom: i < users.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                  <td className="px-4 py-3 text-white/80 font-medium">{u.name}</td>
                  <td className="px-4 py-3 text-white/50">{u.email}</td>
                  <td className="px-4 py-3 text-white/40 text-xs">{u.school_level || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${u.is_active ? 'text-green-400 bg-green-400/10' : 'text-red-400 bg-red-400/10'}`}>
                      {u.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-white/30 text-sm">No students found.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

/* ── Attendance recorder ── */
function AttendanceSection() {
  const [form, setForm] = useState({
    student_id: '', subject: '',
    date: new Date().toISOString().slice(0, 10),
    status: 'present',
  });
  const [saving, setSaving]   = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError]     = useState('');

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(''); setSuccess('');
    setSaving(true);
    try {
      await api.post('/staff-portal/attendance', form);
      setSuccess('✅ Attendance recorded successfully.');
      setForm(f => ({ ...f, student_id: '', status: 'present' }));
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to record attendance');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <h2 className="text-lg font-bold text-white mb-4">Record Attendance</h2>
      <div className="max-w-md rounded-2xl p-5"
        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)' }}>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {[
            { id: 'student_id', label: 'Student ID', type: 'text', placeholder: 'Paste student UUID' },
            { id: 'subject',    label: 'Subject',    type: 'text', placeholder: 'e.g. Mathematics' },
            { id: 'date',       label: 'Date',       type: 'date' },
          ].map(({ id, label, type, placeholder }) => (
            <div key={id}>
              <label className="block text-xs font-medium text-white/50 mb-1.5">{label}</label>
              <input type={type} required={id !== 'subject'} value={form[id]}
                onChange={e => set(id, e.target.value)} placeholder={placeholder}
                className="w-full rounded-xl px-3 py-2.5 text-sm text-white/90 focus:outline-none focus:ring-2 focus:ring-orange-400/60"
                style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)' }} />
            </div>
          ))}

          <div>
            <label className="block text-xs font-medium text-white/50 mb-1.5">Status</label>
            <div className="flex gap-2">
              {['present', 'absent', 'late'].map(s => (
                <button key={s} type="button" onClick={() => set('status', s)}
                  className={`flex-1 py-2 rounded-xl text-xs font-semibold capitalize transition-all border ${
                    form.status === s
                      ? s === 'present' ? 'bg-green-500/20 text-green-300 border-green-500/40'
                        : s === 'absent' ? 'bg-red-500/20 text-red-300 border-red-500/40'
                        : 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40'
                      : 'text-white/40 border-white/10'
                  }`}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          {error   && <p className="text-xs text-red-400">{error}</p>}
          {success && <p className="text-xs text-green-400">{success}</p>}

          <button type="submit" disabled={saving}
            className="py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-50 transition-all"
            style={{ background: '#f97316', boxShadow: '0 2px 12px rgba(249,115,22,0.3)' }}>
            {saving ? 'Recording…' : 'Record Attendance'}
          </button>
        </form>
      </div>
    </div>
  );
}

/* ── Announcements (read-only) ── */
function AnnouncementsSection() {
  const [items, setItems]   = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/staff-portal/announcements')
      .then(r => setItems(r.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h2 className="text-lg font-bold text-white mb-4">Announcements</h2>
      {loading ? (
        <p className="text-white/30 text-sm">Loading…</p>
      ) : items.length === 0 ? (
        <p className="text-white/30 text-sm">No announcements yet.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {items.map(a => (
            <div key={a.id} className="rounded-2xl p-4"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-sm font-semibold text-white">{a.title}</h3>
                <span className="text-[10px] text-white/30 whitespace-nowrap">
                  {new Date(a.created_at).toLocaleDateString()}
                </span>
              </div>
              <p className="text-sm text-white/60 mt-1.5 leading-relaxed">{a.content}</p>
              {a.created_by_name && (
                <p className="text-xs text-white/30 mt-2">— {a.created_by_name}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function StaffDashboard() {
  return (
    <div className="flex flex-col min-h-screen"
      style={{ background: 'linear-gradient(135deg, #0a0f23 0%, #0f1a35 50%, #0a0f23 100%)' }}>
      <Navbar />
      <div className="flex flex-1">
        <Sidebar links={LINKS} title="Staff Portal" />
        <main className="flex-1 p-6 overflow-y-auto">
          <Routes>
            <Route path="dashboard"     element={<StaffDashboardHome />} />
            <Route path="students"      element={<StudentsListSection />} />
            <Route path="attendance"    element={<AttendanceSection />} />
            <Route path="announcements" element={<AnnouncementsSection />} />
            <Route path="profile"       element={<StaffProfileSection />} />
            <Route path="*"             element={<Navigate to="dashboard" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
