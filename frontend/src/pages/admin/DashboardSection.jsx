import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import useAuth from '../../hooks/useAuth';
import CompassionDashboard from '../../components/admin/CompassionDashboard';
import FeeCollectionChart from '../../components/admin/FeeCollectionChart';
import AttendanceAnalyticsChart from '../../components/admin/AttendanceAnalyticsChart';
import PerformanceOverviewChart from '../../components/admin/PerformanceOverviewChart';

/* ── Glassmorphism metric card ── */
function MetricCard({ icon, label, value, sub, colour, onClick }) {
  return (
    <button
      onClick={onClick}
      className="rounded-2xl p-5 flex items-start gap-4 text-left w-full transition-all duration-200 hover:scale-[1.02] active:scale-[0.99]"
      style={{
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        background: 'rgba(255,255,255,0.06)',
        border: '1px solid rgba(255,255,255,0.09)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
        cursor: onClick ? 'pointer' : 'default',
      }}
    >
      <div
        className="w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
        style={{ background: colour || 'rgba(249,115,22,0.15)', border: '1px solid rgba(255,255,255,0.1)' }}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-bold text-white leading-tight">{value ?? <span className="text-white/30 text-lg">—</span>}</p>
        <p className="text-sm font-medium text-white/70 mt-0.5">{label}</p>
        {sub && <p className="text-xs text-white/35 mt-0.5">{sub}</p>}
      </div>
    </button>
  );
}

export default function DashboardSection() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState(null);
  const [analytics, setAnalytics] = useState({ fees: [], attendance: [], performance: [] });

  useEffect(() => {
    Promise.allSettled([
      api.get('/admin/dashboard/metrics'),
      api.get('/admin/platform-analytics'),
    ]).then(([metricsRes, analyticsRes]) => {
      if (metricsRes.status === 'fulfilled') {
        setMetrics(metricsRes.value.data);
      }
      if (analyticsRes.status === 'fulfilled') {
        const d = analyticsRes.value.data;
        setAnalytics({
          fees:        d.fees        || [],
          attendance:  d.attendance  || [],
          performance: d.results     || [],
        });
      }
    });
  }, []);

  const cards = [
    {
      icon: '🎒', label: 'Total Students',
      value: metrics?.total_students ?? null,
      colour: 'rgba(59,130,246,0.18)',
      path: '/admin/users',
    },
    {
      icon: '🏫', label: 'Staff',
      value: metrics?.total_staff ?? null,
      colour: 'rgba(168,85,247,0.18)',
      path: '/admin/staff',
    },
    {
      icon: '📅', label: 'Attendance',
      value: metrics?.attendance_pct != null ? `${metrics.attendance_pct}%` : null,
      colour: 'rgba(34,197,94,0.18)',
      path: '/admin/dashboard',
    },
    {
      icon: '💳', label: 'Fees Collected',
      value: metrics?.fees_collected != null ? `GH₵ ${Number(metrics.fees_collected).toLocaleString()}` : null,
      colour: 'rgba(249,115,22,0.18)',
      path: '/admin/dashboard',
    },
    {
      icon: '📊', label: 'Reports',
      value: null,
      sub: 'View analytics',
      colour: 'rgba(20,184,166,0.18)',
      path: '/admin/content',
    },
    {
      icon: '🔔', label: 'Notifications',
      value: null,
      sub: 'Manage alerts',
      colour: 'rgba(234,179,8,0.18)',
      path: '/admin/announcements',
    },
    {
      icon: '❤️', label: 'Active Beneficiaries',
      value: metrics?.active_beneficiaries ?? null,
      colour: 'rgba(239,68,68,0.18)',
      path: '/admin/beneficiaries',
    },
    {
      icon: '⏳', label: 'Pending Approvals',
      value: metrics?.pending_actions ?? null,
      colour: 'rgba(249,115,22,0.18)',
      path: '/admin/content',
    },
  ];

  return (
    <div className="flex flex-col gap-8">
      {/* Greeting */}
      <div>
        <h2 className="text-xl font-bold text-white">
          Welcome back, {user?.name?.split(' ')[0]} 👋
        </h2>
        <p className="text-sm text-white/40 mt-0.5">Here's what's happening across the platform.</p>
      </div>

      {/* Metric cards grid */}
      <section>
        <h3 className="text-xs font-semibold text-white/30 uppercase tracking-widest mb-3">Overview</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {cards.map(card => (
            <MetricCard
              key={card.label}
              icon={card.icon}
              label={card.label}
              value={card.value}
              sub={card.sub}
              colour={card.colour}
              onClick={card.path ? () => navigate(card.path) : undefined}
            />
          ))}
        </div>
      </section>

      {/* At-risk students */}
      <section>
        <h3 className="text-xs font-semibold text-white/30 uppercase tracking-widest mb-3">At-Risk Students</h3>
        <div
          className="rounded-2xl p-4"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.07)',
          }}
        >
          <CompassionDashboard />
        </div>
      </section>

      {/* Charts */}
      <section>
        <h3 className="text-xs font-semibold text-white/30 uppercase tracking-widest mb-3">Fee Collection</h3>
        <div className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <FeeCollectionChart data={analytics.fees} />
        </div>
      </section>

      <section>
        <h3 className="text-xs font-semibold text-white/30 uppercase tracking-widest mb-3">Attendance Analytics</h3>
        <div className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <AttendanceAnalyticsChart data={analytics.attendance} />
        </div>
      </section>

      <section>
        <h3 className="text-xs font-semibold text-white/30 uppercase tracking-widest mb-3">Performance Overview</h3>
        <div className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <PerformanceOverviewChart data={analytics.performance} />
        </div>
      </section>
    </div>
  );
}
