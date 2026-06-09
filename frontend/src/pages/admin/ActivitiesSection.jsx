import { useState, useEffect, useCallback } from 'react';
import api from '../../utils/api';

function timeAgo(d) {
  if (!d) return '';
  const diff = Math.floor((Date.now() - new Date(d)) / 1000);
  if (diff < 60)    return 'just now';
  if (diff < 3600)  return `${Math.floor(diff/60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff/3600)}h ago`;
  return new Date(d).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' });
}

function StatusBadge({ status }) {
  const map = {
    pending:  'text-yellow-300 bg-yellow-500/10 border-yellow-500/25',
    approved: 'text-green-300 bg-green-500/10 border-green-500/25',
    rejected: 'text-red-300 bg-red-500/10 border-red-500/25',
  };
  return <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border capitalize ${map[status]||map.pending}`}>{status}</span>;
}

function ReviewModal({ activity, onDone, onClose }) {
  const [action,  setAction]  = useState('approved');
  const [comment, setComment] = useState('');
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      await api.patch(`/activities/admin/${activity.id}/review`, { action, comment: comment||null });
      onDone(); onClose();
    } catch (err) { setError(err.response?.data?.error || 'Failed.'); }
    finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{background:'rgba(0,0,0,0.7)', backdropFilter:'blur(4px)'}}
      onClick={e => e.target===e.currentTarget && onClose()}>
      <div className="w-full max-w-md rounded-2xl overflow-hidden"
        style={{background:'rgba(15,20,40,0.97)', border:'1px solid rgba(255,255,255,0.12)', boxShadow:'0 24px 80px rgba(0,0,0,0.6)', animation:'modalIn 0.2s ease-out'}}>
        <style>{`@keyframes modalIn{from{opacity:0;transform:scale(.95)}to{opacity:1;transform:scale(1)}}`}</style>
        <div className="flex items-center justify-between px-5 py-4" style={{borderBottom:'1px solid rgba(255,255,255,0.08)'}}>
          <h3 className="text-base font-bold text-white">Review Activity</h3>
          <button onClick={onClose} className="text-white/40 hover:text-white/80 text-xl">×</button>
        </div>
        <div className="p-5">
          <div className="rounded-xl p-3 mb-4" style={{background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.07)'}}>
            <p className="text-sm font-semibold text-white">{activity.title}</p>
            <p className="text-xs text-white/50">{activity.student_name} · {activity.school_level} · {activity.category}</p>
            {activity.description && <p className="text-xs text-white/40 mt-1">{activity.description}</p>}
          </div>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex gap-2">
              {['approved','rejected'].map(a => (
                <button key={a} type="button" onClick={() => setAction(a)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-bold capitalize transition-all border ${
                    action===a ? (a==='approved' ? 'bg-green-500/20 text-green-300 border-green-500/40' : 'bg-red-500/20 text-red-300 border-red-500/40') : 'text-white/40 border-white/10'
                  }`}>
                  {a==='approved' ? '✅ Approve' : '❌ Reject'}
                </button>
              ))}
            </div>
            <div>
              <label className="block text-xs font-medium text-white/50 mb-1.5">Comment</label>
              <textarea value={comment} onChange={e => setComment(e.target.value)} rows={3}
                placeholder={action==='rejected' ? 'Reason for rejection…' : 'Optional comment…'}
                className="w-full rounded-xl px-3 py-2.5 text-sm text-white/90 focus:outline-none focus:ring-2 focus:ring-orange-400/60 resize-none"
                style={{background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.12)'}} />
            </div>
            {error && <p className="text-xs text-red-400">{error}</p>}
            <div className="flex gap-3">
              <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white/50 hover:text-white/80 transition-all" style={{border:'1px solid rgba(255,255,255,0.1)'}}>Cancel</button>
              <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-50" style={{background: action==='approved' ? '#22c55e' : '#ef4444'}}>
                {saving ? 'Saving…' : action==='approved' ? '✅ Approve' : '❌ Reject'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function AdminActivitiesSection() {
  const [activities, setActivities] = useState([]);
  const [analytics,  setAnalytics]  = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState('');
  const [statusFilter, setStatusFilter] = useState('pending');
  const [reviewing,  setReviewing]  = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search)                  params.set('search', search);
    if (statusFilter !== 'all')  params.set('status', statusFilter);
    Promise.allSettled([
      api.get(`/activities/admin/all?${params}`),
      api.get('/activities/admin/analytics'),
    ]).then(([actRes, analyticsRes]) => {
      if (actRes.status === 'fulfilled')      setActivities(actRes.value.data || []);
      if (analyticsRes.status === 'fulfilled') setAnalytics(analyticsRes.value.data);
    }).finally(() => setLoading(false));
  }, [search, statusFilter]);

  useEffect(() => { load(); }, [load]);

  const counts = analytics?.counts || {};

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-bold text-white">Activities Management</h2>
        <p className="text-sm text-white/40 mt-0.5">Review and moderate student activity posts</p>
      </div>

      {/* Analytics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label:'Total',    value: counts.total,    icon:'🏃', colour:'rgba(249,115,22,0.15)' },
          { label:'Pending',  value: counts.pending,  icon:'⏳', colour:'rgba(234,179,8,0.15)'  },
          { label:'Approved', value: counts.approved, icon:'✅', colour:'rgba(34,197,94,0.15)'  },
          { label:'Rejected', value: counts.rejected, icon:'❌', colour:'rgba(239,68,68,0.15)'  },
        ].map(c => (
          <div key={c.label} className="rounded-2xl p-4 flex items-center gap-3" style={{background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.08)'}}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg" style={{background:c.colour}}>{c.icon}</div>
            <div>
              <p className="text-xl font-bold text-white">{c.value ?? '—'}</p>
              <p className="text-xs text-white/40">{c.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Top students */}
      {analytics?.top_students?.length > 0 && (
        <div className="rounded-2xl p-4" style={{background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.07)'}}>
          <p className="text-xs font-bold text-white/40 uppercase tracking-wide mb-3">🏆 Most Active Students</p>
          <div className="flex flex-wrap gap-2">
            {analytics.top_students.map(s => (
              <div key={s.id} className="flex items-center gap-2 px-3 py-1.5 rounded-xl" style={{background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.08)'}}>
                <span className="text-sm font-semibold text-white">{s.name}</span>
                <span className="text-xs text-orange-300 font-bold">{s.activity_count} posts</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="rounded-2xl p-4 flex flex-wrap gap-3 items-center" style={{background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.07)'}}>
        <div className="flex-1 min-w-[200px] relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 text-sm">🔍</span>
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by title or student…"
            className="w-full pl-8 pr-3 py-2.5 rounded-xl text-sm text-white/90 focus:outline-none focus:ring-2 focus:ring-orange-400/60"
            style={{background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.1)'}} />
        </div>
        <div className="flex gap-1.5">
          {['all','pending','approved','rejected'].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold capitalize transition-all ${statusFilter===s ? 'bg-orange-500/20 text-orange-300 border border-orange-500/40' : 'text-white/40 border border-white/10 hover:border-white/20'}`}>
              {s==='all' ? '🌐 All' : s}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl overflow-hidden" style={{background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.07)'}}>
        {loading ? (
          <div className="py-12 text-center text-white/30 text-sm">Loading…</div>
        ) : activities.length === 0 ? (
          <div className="py-12 text-center"><div className="text-3xl mb-2">🏃</div><p className="text-white/30 text-sm">No activities found.</p></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{borderBottom:'1px solid rgba(255,255,255,0.07)'}}>
                  {['Student','Activity','Level / Category','Media','Status','Posted','Actions'].map(h => (
                    <th key={h} className="text-left px-4 py-3.5 text-xs font-semibold text-white/35 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {activities.map((a, i) => (
                  <tr key={a.id} className="hover:bg-white/3 transition-colors" style={{borderBottom: i<activities.length-1 ? '1px solid rgba(255,255,255,0.04)' : 'none'}}>
                    <td className="px-4 py-4">
                      <p className="font-semibold text-white/90">{a.student_name}</p>
                      <p className="text-xs text-white/40">{a.student_email}</p>
                    </td>
                    <td className="px-4 py-4">
                      <p className="text-white/80 font-medium">{a.title}</p>
                      {a.description && <p className="text-xs text-white/40 truncate max-w-[160px]">{a.description}</p>}
                    </td>
                    <td className="px-4 py-4">
                      <p className="text-white/70 text-xs">{a.school_level}</p>
                      <p className="text-white/40 text-xs">{a.category}</p>
                    </td>
                    <td className="px-4 py-4 text-white/50 text-xs">{a.media_count || 0} files</td>
                    <td className="px-4 py-4"><StatusBadge status={a.status} /></td>
                    <td className="px-4 py-4 text-white/40 text-xs whitespace-nowrap">{timeAgo(a.created_at)}</td>
                    <td className="px-4 py-4">
                      <button onClick={() => setReviewing(a)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${a.status==='pending' ? 'text-orange-300 hover:bg-orange-500/15' : 'text-white/40 hover:text-white/70'}`}
                        style={{border:`1px solid ${a.status==='pending' ? 'rgba(249,115,22,0.25)' : 'rgba(255,255,255,0.1)'}`}}>
                        {a.status==='pending' ? 'Review' : 'Edit'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {reviewing && <ReviewModal activity={reviewing} onDone={load} onClose={() => setReviewing(null)} />}
    </div>
  );
}
