import { Routes, Route, Navigate } from 'react-router-dom';
import { useState } from 'react';
import Navbar from '../components/common/Navbar';
import Sidebar from '../components/common/Sidebar';
import useAuth from '../hooks/useAuth';
import useAttendance from '../hooks/useAttendance';
import useResults from '../hooks/useResults';
import useFees from '../hooks/useFees';
import AttendanceCalendar from '../components/attendance/AttendanceCalendar';
import AttendancePercentageBar from '../components/attendance/AttendancePercentageBar';
import ResultsTable from '../components/results/ResultsTable';
import FeeStatusBadge from '../components/fees/FeeStatusBadge';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorMessage from '../components/common/ErrorMessage';

const LINKS = [
  { to: '/parent/dashboard',  label: 'Dashboard',  iconName: 'LayoutDashboard' },
  { to: '/parent/attendance', label: 'Attendance',  iconName: 'CalendarDays' },
  { to: '/parent/results',    label: 'Results',     iconName: 'FileCheck' },
  { to: '/parent/fees',       label: 'Fees',        iconName: 'Wallet' },
  { to: '/settings',          label: 'Settings',    iconName: 'Settings' },
];

/* ── Glassmorphism card wrapper ── */
function GlassCard({ children, className = '' }) {
  return (
    <div
      className={`rounded-2xl p-5 ${className}`}
      style={{
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        background: 'rgba(255,255,255,0.06)',
        border: '1px solid rgba(255,255,255,0.09)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
      }}
    >
      {children}
    </div>
  );
}

/* ── Child ID input ── */
function ChildIdInput({ childId, onSet }) {
  const [input, setInput] = useState(childId || '');
  return (
    <form
      onSubmit={e => { e.preventDefault(); onSet(input.trim()); }}
      className="flex gap-2 items-center mb-5"
    >
      <input
        type="text"
        value={input}
        onChange={e => setInput(e.target.value)}
        placeholder="Enter child's student ID…"
        className="flex-1 rounded-xl px-3 py-2.5 text-sm text-white/90 focus:outline-none focus:ring-2 focus:ring-orange-400/60"
        style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}
      />
      <button
        type="submit"
        className="bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-colors"
      >
        View
      </button>
    </form>
  );
}

/* ── Dashboard home ── */
function ParentDashboardHome({ childId, onSetChild }) {
  const { user } = useAuth();
  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-white">
          Welcome, {user?.name?.split(' ')[0]} 👋
        </h2>
        <p className="text-sm text-white/40 mt-0.5">Monitor your child's progress.</p>
      </div>

      <GlassCard className="mb-6">
        <h3 className="text-sm font-semibold text-white/60 mb-3 uppercase tracking-wide">Child ID</h3>
        <ChildIdInput childId={childId} onSet={onSetChild} />
        {childId ? (
          <p className="text-xs text-green-400">Viewing data for student ID: <span className="font-mono">{childId}</span></p>
        ) : (
          <p className="text-xs text-white/30">Enter your child's student ID above to view their records.</p>
        )}
      </GlassCard>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { icon: '📅', label: 'Attendance', path: '/parent/attendance', colour: 'rgba(34,197,94,0.18)' },
          { icon: '📊', label: 'Results',    path: '/parent/results',    colour: 'rgba(168,85,247,0.18)' },
          { icon: '💳', label: 'Fees',       path: '/parent/fees',       colour: 'rgba(249,115,22,0.18)' },
        ].map(({ icon, label, path, colour }) => (
          <a
            key={path}
            href={path}
            className="rounded-2xl p-5 flex items-center gap-4 transition-all hover:scale-[1.02]"
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.09)',
              boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
            }}
          >
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
              style={{ background: colour, border: '1px solid rgba(255,255,255,0.1)' }}
            >
              {icon}
            </div>
            <span className="text-sm font-semibold text-white/80">{label}</span>
          </a>
        ))}
      </div>
    </div>
  );
}

/* ── Attendance section ── */
function ParentAttendance({ childId, onSetChild }) {
  const [month] = useState(new Date().toISOString().slice(0, 7));
  const { records, attendance_percentage, loading, error } = useAttendance(childId, { month });

  return (
    <div className="flex flex-col gap-4 max-w-lg">
      <h2 className="text-lg font-bold text-white">Child's Attendance</h2>
      <ChildIdInput childId={childId} onSet={onSetChild} />
      {!childId ? (
        <p className="text-sm text-white/30">Enter a student ID to view attendance.</p>
      ) : loading ? (
        <LoadingSpinner />
      ) : error ? (
        <ErrorMessage message={error} />
      ) : (
        <GlassCard>
          <AttendancePercentageBar percentage={attendance_percentage} />
          <div className="mt-4">
            <AttendanceCalendar records={records} month={month} />
          </div>
        </GlassCard>
      )}
    </div>
  );
}

/* ── Results section ── */
function ParentResults({ childId, onSetChild }) {
  const { results, gpa, loading, error } = useResults(childId);

  return (
    <div className="flex flex-col gap-4 max-w-2xl">
      <h2 className="text-lg font-bold text-white">Child's Results</h2>
      <ChildIdInput childId={childId} onSet={onSetChild} />
      {!childId ? (
        <p className="text-sm text-white/30">Enter a student ID to view results.</p>
      ) : loading ? (
        <LoadingSpinner />
      ) : error ? (
        <ErrorMessage message={error} />
      ) : (
        <GlassCard>
          {gpa != null && (
            <p className="text-sm text-white/60 mb-3">
              GPA: <span className="font-bold text-orange-400">{Number(gpa).toFixed(2)}</span>
            </p>
          )}
          <ResultsTable results={results} />
        </GlassCard>
      )}
    </div>
  );
}

/* ── Fees section ── */
function ParentFees({ childId, onSetChild }) {
  const { fees, loading, error } = useFees(childId);

  return (
    <div className="flex flex-col gap-4 max-w-2xl">
      <h2 className="text-lg font-bold text-white">Child's Fees</h2>
      <ChildIdInput childId={childId} onSet={onSetChild} />
      {!childId ? (
        <p className="text-sm text-white/30">Enter a student ID to view fees.</p>
      ) : loading ? (
        <LoadingSpinner />
      ) : error ? (
        <ErrorMessage message={error} />
      ) : fees.length === 0 ? (
        <p className="text-sm text-white/30">No fee records found.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {fees.map(fee => (
            <GlassCard key={fee.id}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm text-white/90">{fee.description || 'Fee'}</p>
                  <p className="text-xs text-white/40 mt-0.5">
                    Due: {new Date(fee.due_date).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <FeeStatusBadge status={fee.status} />
                  <p className="text-sm font-semibold text-white/70">
                    GH₵ {Number(fee.amount).toFixed(2)}
                  </p>
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Main layout ── */
export default function ParentView() {
  const [childId, setChildId] = useState('');

  return (
    <div
      className="flex flex-col min-h-screen"
      style={{ background: 'linear-gradient(135deg, #0a0f23 0%, #0f1a35 50%, #0a0f23 100%)' }}
    >
      <Navbar />
      <div className="flex flex-1">
        <Sidebar links={LINKS} title="Parent Portal" />
        <main className="flex-1 p-6 overflow-y-auto">
          <Routes>
            <Route path="dashboard"  element={<ParentDashboardHome childId={childId} onSetChild={setChildId} />} />
            <Route path="attendance" element={<ParentAttendance    childId={childId} onSetChild={setChildId} />} />
            <Route path="results"    element={<ParentResults       childId={childId} onSetChild={setChildId} />} />
            <Route path="fees"       element={<ParentFees          childId={childId} onSetChild={setChildId} />} />
            <Route path="*"          element={<Navigate to="dashboard" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
