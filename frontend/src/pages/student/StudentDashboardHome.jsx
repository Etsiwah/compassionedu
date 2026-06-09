import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import useAuth from '../../hooks/useAuth';

/* ── Glassmorphism dashboard card ── */
function DashboardCard({ icon, label, value, sub, colour, onClick }) {
  return (
    <button
      onClick={onClick}
      className="rounded-2xl p-5 flex items-start gap-4 text-left w-full transition-all duration-200 hover:scale-[1.02] active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-orange-400/40"
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
      <div className="min-w-0">
        <p className="text-2xl font-bold text-white leading-tight">
          {value ?? <span className="text-white/30 text-lg">—</span>}
        </p>
        <p className="text-sm font-medium text-white/70 mt-0.5">{label}</p>
        {sub && <p className="text-xs text-white/35 mt-0.5">{sub}</p>}
      </div>
    </button>
  );
}

export default function StudentDashboardHome({ studentId }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState({
    attendance: null,
    feeStatus: null,
    unreadNotifications: null,
    newActivities: null,
  });

  useEffect(() => {
    if (!studentId) return;

    Promise.allSettled([
      api.get(`/attendance/summary/${studentId}`),
      api.get(`/fees?studentId=${studentId}`),
      api.get('/notifications/unread-count'),
      api.get('/activities/recent'),
    ]).then(([attendanceRes, feesRes, notifRes, activitiesRes]) => {
      setData({
        attendance: attendanceRes.status === 'fulfilled'
          ? `${attendanceRes.value.data.percentage ?? '—'}%`
          : null,
        feeStatus: feesRes.status === 'fulfilled'
          ? (feesRes.value.data.status || feesRes.value.data[0]?.status || 'pending')
          : null,
        unreadNotifications: notifRes.status === 'fulfilled'
          ? notifRes.value.data.count
          : null,
        newActivities: activitiesRes.status === 'fulfilled'
          ? (activitiesRes.value.data?.length ?? null)
          : null,
      });
    });
  }, [studentId]);

  const cards = [
    {
      icon: '👤',
      label: 'My Profile',
      value: null,
      sub: 'View & edit profile',
      colour: 'rgba(59,130,246,0.18)',
      path: '/student/profile',
    },
    {
      icon: '📅',
      label: 'Attendance',
      value: data.attendance,
      sub: 'Overall percentage',
      colour: 'rgba(34,197,94,0.18)',
      path: '/student/attendance',
    },
    {
      icon: '💳',
      label: 'School Fees',
      value: data.feeStatus
        ? data.feeStatus.charAt(0).toUpperCase() + data.feeStatus.slice(1)
        : null,
      sub: 'Current status',
      colour: data.feeStatus === 'overdue'
        ? 'rgba(239,68,68,0.18)'
        : data.feeStatus === 'paid'
          ? 'rgba(34,197,94,0.18)'
          : 'rgba(249,115,22,0.18)',
      path: '/student/fees',
    },
    {
      icon: '📊',
      label: 'Results',
      value: null,
      sub: 'View academic results',
      colour: 'rgba(168,85,247,0.18)',
      path: '/student/results',
    },
    {
      icon: '🏃',
      label: 'Activities',
      value: data.newActivities,
      sub: 'Recent activities',
      colour: 'rgba(20,184,166,0.18)',
      path: '/student/activities',
    },
    {
      icon: '🔔',
      label: 'Notifications',
      value: data.unreadNotifications,
      sub: 'Unread messages',
      colour: data.unreadNotifications > 0
        ? 'rgba(249,115,22,0.25)'
        : 'rgba(249,115,22,0.12)',
      path: '/student/announcements',
    },
  ];

  return (
    <div>
      {/* Greeting */}
      <div className="mb-6">
        <h2 className="text-xl font-bold text-white">
          Hello, {user?.name?.split(' ')[0]} 👋
        </h2>
        <p className="text-sm text-white/40 mt-0.5">Here's your personal overview.</p>
      </div>

      {/* Dashboard cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {cards.map(card => (
          <DashboardCard
            key={card.label}
            icon={card.icon}
            label={card.label}
            value={card.value}
            sub={card.sub}
            colour={card.colour}
            onClick={() => navigate(card.path)}
          />
        ))}
      </div>

      {/* Quick links */}
      <div
        className="rounded-2xl p-5"
        style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.07)',
        }}
      >
        <h3 className="text-xs font-semibold text-white/30 uppercase tracking-widest mb-3">Quick Actions</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[
            { icon: '📤', label: 'Upload Receipt',  path: '/student/fees' },
            { icon: '📄', label: 'Upload CV',        path: '/student/portfolio' },
            { icon: '🎓', label: 'Upload Results',   path: '/student/results' },
            { icon: '📸', label: 'Post Activity',    path: '/student/activities' },
            { icon: '✏️', label: 'Edit Profile',     path: '/student/profile' },
            { icon: '⚙️', label: 'Settings',         path: '/settings' },
          ].map(({ icon, label, path }) => (
            <button
              key={path}
              onClick={() => navigate(path)}
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-white/70 hover:text-white transition-all text-left"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)' }}
            >
              <span>{icon}</span>
              <span className="font-medium">{label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
