import { useState, useEffect, useCallback } from 'react';
import api from '../../utils/api';

const ACTION_ICONS = {
  login:              '🔑',
  logout:             '🚪',
  user_created:       '➕',
  user_deleted:       '🗑️',
  attendance_recorded:'📅',
  cv_uploaded:        '📄',
  profile_updated:    '✏️',
};

const ROLE_COLOURS = {
  admin:   'text-orange-300 bg-orange-500/10',
  staff:   'text-blue-300 bg-blue-500/10',
  student: 'text-green-300 bg-green-500/10',
  teacher: 'text-purple-300 bg-purple-500/10',
  parent:  'text-pink-300 bg-pink-500/10',
};

function fmt(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  const now = new Date();
  const diff = Math.floor((now - d) / 1000);
  if (diff < 60)    return 'Just now';
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return d.toLocaleString();
}

export default function ActivityLogsSection() {
  const [logs, setLogs]         = useState([]);
  const [loading, setLoading]   = useState(true);
  const [roleFilter, setRoleFilter] = useState('all');
  const [actionFilter, setActionFilter] = useState('all');
  const [autoRefresh, setAutoRefresh] = useState(true);

  const load = useCallback(() => {
    const params = new URLSearchParams();
    if (roleFilter !== 'all')   params.set('role', roleFilter);
    if (actionFilter !== 'all') params.set('action', actionFilter);
    params.set('limit', '200');

    api.get(`/admin/activity-logs?${params}`)
      .then(r => setLogs(r.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [roleFilter, actionFilter]);

  useEffect(() => {
    load();
  }, [load]);

  // Auto-refresh every 30s
  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(load, 30_000);
    return () => clearInterval(id);
  }, [autoRefresh, load]);

  const counts = {
    logins:   logs.filter(l => l.action === 'login').length,
    students: logs.filter(l => l.user_role === 'student').length,
    staff:    logs.filter(l => l.user_role === 'staff').length,
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-bold text-white">Activity Logs</h2>
          <p className="text-sm text-white/40 mt-0.5">Real-time audit trail of all user actions</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Auto-refresh toggle */}
          <button onClick={() => setAutoRefresh(v => !v)}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all border ${
              autoRefresh
                ? 'bg-green-500/15 text-green-300 border-green-500/30'
                : 'text-white/40 border-white/10'
            }`}>
            {autoRefresh ? '🔄 Live' : '⏸ Paused'}
          </button>
          <button onClick={load}
            className="px-3 py-2 rounded-xl text-xs font-semibold text-white/60 hover:text-white transition-all"
            style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
            ↻ Refresh
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Events', value: logs.length,    icon: '📋', colour: 'rgba(249,115,22,0.15)' },
          { label: 'Logins',       value: counts.logins,  icon: '🔑', colour: 'rgba(34,197,94,0.15)'  },
          { label: 'Student Events', value: counts.students, icon: '🎒', colour: 'rgba(59,130,246,0.15)' },
        ].map(c => (
          <div key={c.label} className="rounded-2xl p-4 flex items-center gap-3"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
              style={{ background: c.colour }}>
              {c.icon}
            </div>
            <div>
              <p className="text-xl font-bold text-white">{c.value}</p>
              <p className="text-xs text-white/40">{c.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="rounded-2xl p-4 flex flex-wrap gap-3"
        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
        {/* Role filter */}
        <div className="flex gap-1.5 flex-wrap">
          {['all', 'admin', 'staff', 'student', 'teacher'].map(r => (
            <button key={r} onClick={() => setRoleFilter(r)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all ${
                roleFilter === r
                  ? 'bg-orange-500/20 text-orange-300 border border-orange-500/40'
                  : 'text-white/40 border border-white/10 hover:border-white/20'
              }`}>
              {r === 'all' ? '🌐 All Roles' : r}
            </button>
          ))}
        </div>

        {/* Action filter */}
        <div className="flex gap-1.5 flex-wrap">
          {['all', 'login', 'logout', 'user_created', 'user_deleted', 'attendance_recorded'].map(a => (
            <button key={a} onClick={() => setActionFilter(a)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                actionFilter === a
                  ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                  : 'text-white/40 border border-white/10 hover:border-white/20'
              }`}>
              {a === 'all' ? 'All Actions' : a.replace(/_/g, ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Log table */}
      <div className="rounded-2xl overflow-hidden"
        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
        {loading ? (
          <div className="py-12 text-center text-white/30 text-sm">Loading logs…</div>
        ) : logs.length === 0 ? (
          <div className="py-12 text-center">
            <div className="text-3xl mb-2">📋</div>
            <p className="text-white/30 text-sm">No activity logs yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                  {['Time', 'User', 'Role', 'Action', 'Entity', 'IP'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-white/35 uppercase tracking-wide whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {logs.map((log, i) => (
                  <tr key={log.id}
                    className="hover:bg-white/3 transition-colors"
                    style={{ borderBottom: i < logs.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                    <td className="px-4 py-3 text-white/40 text-xs whitespace-nowrap">{fmt(log.created_at)}</td>
                    <td className="px-4 py-3 text-white/70 font-medium">{log.user_name || '—'}</td>
                    <td className="px-4 py-3">
                      {log.user_role ? (
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${ROLE_COLOURS[log.user_role] || 'text-white/40 bg-white/5'}`}>
                          {log.user_role}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1.5 text-white/70">
                        <span>{ACTION_ICONS[log.action] || '📌'}</span>
                        <span className="text-xs">{log.action?.replace(/_/g, ' ')}</span>
                      </span>
                    </td>
                    <td className="px-4 py-3 text-white/40 text-xs">{log.entity_type || '—'}</td>
                    <td className="px-4 py-3 text-white/30 text-xs font-mono">{log.ip_address || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
