import { useState, useEffect, useCallback } from 'react';
import api from '../../utils/api';
import ResponsiveTable from '../../components/common/ResponsiveTable';

function fmt(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' });
}

function StatusBadge({ status }) {
  const map = {
    pending:  'text-yellow-300 bg-yellow-500/10 border-yellow-500/25',
    approved: 'text-green-300 bg-green-500/10 border-green-500/25',
    rejected: 'text-red-300 bg-red-500/10 border-red-500/25',
  };
  return (
    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border capitalize ${map[status] || map.pending}`}>
      {status}
    </span>
  );
}

function PerfBadge({ category }) {
  if (!category) return null;
  const map = {
    Excellent: 'text-green-300 bg-green-500/10',
    'Very Good': 'text-blue-300 bg-blue-500/10',
    Good: 'text-teal-300 bg-teal-500/10',
    Average: 'text-yellow-300 bg-yellow-500/10',
    Poor: 'text-red-300 bg-red-500/10',
  };
  return <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${map[category] || ''}`}>{category}</span>;
}

/* ── Review modal ── */
function ReviewModal({ upload, onDone, onClose }) {
  const [action,   setAction]   = useState('approved');
  const [comment,  setComment]  = useState('');
  const [score,    setScore]    = useState('');
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      await api.patch(`/result-uploads/admin/${upload.id}/review`, {
        action,
        comment: comment || null,
        performance_score: action === 'approved' && score ? Number(score) : null,
      });
      onDone();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to review.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-md rounded-2xl overflow-hidden"
        style={{ background: 'rgba(15,20,40,0.97)', border: '1px solid rgba(255,255,255,0.12)', boxShadow: '0 24px 80px rgba(0,0,0,0.6)', animation: 'modalIn 0.2s ease-out' }}>
        <style>{`@keyframes modalIn{from{opacity:0;transform:scale(.95)}to{opacity:1;transform:scale(1)}}`}</style>

        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <h3 className="text-base font-bold text-white">Review Result</h3>
          <button onClick={onClose} className="text-white/40 hover:text-white/80 text-xl">×</button>
        </div>

        <div className="p-5">
          {/* Upload info */}
          <div className="rounded-xl p-3 mb-4" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <p className="text-sm font-semibold text-white">{upload.student_name}</p>
            <p className="text-xs text-white/50">{upload.academic_level} · {upload.year_label} · {upload.period_label}</p>
            <a href={upload.file_url} target="_blank" rel="noreferrer"
              className="text-xs text-blue-400 hover:text-blue-300 mt-1 inline-block">
              👁 Preview file
            </a>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Action */}
            <div className="flex gap-2">
              {['approved', 'rejected'].map(a => (
                <button key={a} type="button" onClick={() => setAction(a)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-bold capitalize transition-all border ${
                    action === a
                      ? a === 'approved'
                        ? 'bg-green-500/20 text-green-300 border-green-500/40'
                        : 'bg-red-500/20 text-red-300 border-red-500/40'
                      : 'text-white/40 border-white/10'
                  }`}>
                  {a === 'approved' ? '✅ Approve' : '❌ Reject'}
                </button>
              ))}
            </div>

            {/* Performance score (only for approve) */}
            {action === 'approved' && (
              <div>
                <label className="block text-xs font-medium text-white/50 mb-1.5">
                  Performance Score (0–100) <span className="text-white/30">optional</span>
                </label>
                <input type="number" min="0" max="100" value={score} onChange={e => setScore(e.target.value)}
                  placeholder="e.g. 78"
                  className="w-full rounded-xl px-3 py-2.5 text-sm text-white/90 focus:outline-none focus:ring-2 focus:ring-orange-400/60"
                  style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)' }} />
              </div>
            )}

            {/* Comment */}
            <div>
              <label className="block text-xs font-medium text-white/50 mb-1.5">
                Comment <span className="text-white/30">optional</span>
              </label>
              <textarea value={comment} onChange={e => setComment(e.target.value)} rows={3}
                placeholder={action === 'rejected' ? 'Reason for rejection…' : 'Add a comment…'}
                className="w-full rounded-xl px-3 py-2.5 text-sm text-white/90 focus:outline-none focus:ring-2 focus:ring-orange-400/60 resize-none"
                style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)' }} />
            </div>

            {error && <p className="text-xs text-red-400">{error}</p>}

            <div className="flex gap-3">
              <button type="button" onClick={onClose}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white/50 hover:text-white/80 transition-all"
                style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
                Cancel
              </button>
              <button type="submit" disabled={saving}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-50 transition-all"
                style={{ background: action === 'approved' ? '#22c55e' : '#ef4444' }}>
                {saving ? 'Saving…' : action === 'approved' ? '✅ Approve' : '❌ Reject'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

/* ── Main admin results section ── */
export default function AdminResultsSection() {
  const [uploads,  setUploads]  = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState('');
  const [statusFilter, setStatusFilter] = useState('pending');
  const [reviewing, setReviewing] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search)                    params.set('q', search);
    if (statusFilter !== 'all')    params.set('status', statusFilter);

    Promise.allSettled([
      api.get(`/result-uploads/admin/all?${params}`),
      api.get('/result-uploads/admin/analytics'),
    ]).then(([uploadsRes, analyticsRes]) => {
      if (uploadsRes.status === 'fulfilled')   setUploads(uploadsRes.value.data || []);
      if (analyticsRes.status === 'fulfilled') setAnalytics(analyticsRes.value.data);
    }).finally(() => setLoading(false));
  }, [search, statusFilter]);

  useEffect(() => { load(); }, [load]);

  const counts = analytics?.counts || {};

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-white">Results Management</h2>
        <p className="text-sm text-white/40 mt-0.5">Review and approve student result uploads</p>
      </div>

      {/* Analytics cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Total Uploads', value: counts.total,    icon: '📋', colour: 'rgba(249,115,22,0.15)' },
          { label: 'Pending',       value: counts.pending,  icon: '⏳', colour: 'rgba(234,179,8,0.15)'  },
          { label: 'Approved',      value: counts.approved, icon: '✅', colour: 'rgba(34,197,94,0.15)'  },
          { label: 'Rejected',      value: counts.rejected, icon: '❌', colour: 'rgba(239,68,68,0.15)'  },
        ].map(c => (
          <div key={c.label} className="rounded-2xl p-4 flex items-center gap-3"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
              style={{ background: c.colour }}>
              {c.icon}
            </div>
            <div>
              <p className="text-xl font-bold text-white">{c.value ?? '—'}</p>
              <p className="text-xs text-white/40">{c.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Top performers */}
      {analytics?.top_performers?.length > 0 && (
        <div className="rounded-2xl p-4"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <p className="text-xs font-bold text-white/40 uppercase tracking-wide mb-3">🏆 Top Performers</p>
          <div className="flex flex-wrap gap-2">
            {analytics.top_performers.slice(0, 5).map(s => (
              <div key={s.id} className="flex items-center gap-2 px-3 py-1.5 rounded-xl"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <span className="text-sm font-semibold text-white">{s.name}</span>
                <span className="text-xs text-orange-300 font-bold">{Number(s.avg_score).toFixed(1)}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="rounded-2xl p-4 flex flex-wrap gap-3 items-center"
        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="flex-1 min-w-[200px] relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 text-sm">🔍</span>
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by student name or email…"
            className="w-full pl-8 pr-3 py-2.5 rounded-xl text-sm text-white/90 focus:outline-none focus:ring-2 focus:ring-orange-400/60"
            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }} />
        </div>
        <div className="flex gap-1.5">
          {['all','pending','approved','rejected'].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold capitalize transition-all ${
                statusFilter === s
                  ? 'bg-orange-500/20 text-orange-300 border border-orange-500/40'
                  : 'text-white/40 border border-white/10 hover:border-white/20'
              }`}>
              {s === 'all' ? '🌐 All' : s}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl overflow-hidden"
        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
        {loading ? (
          <div className="py-12 text-center text-white/30 text-sm">Loading…</div>
        ) : uploads.length === 0 ? (
          <div className="py-12 text-center">
            <div className="text-3xl mb-2">📋</div>
            <p className="text-white/30 text-sm">No uploads found.</p>
          </div>
        ) : (
          <ResponsiveTable
            headers={['Student','Level / Period','File','Status','Score','Uploaded','Actions']}
            data={uploads}
            emptyMessage="No uploads found."
            renderRow={(u, i) => (
              <>
                <td className="px-4 py-4">
                  <p className="font-semibold text-white/90">{u.student_name}</p>
                  <p className="text-xs text-white/40">{u.student_email}</p>
                </td>
                <td className="px-4 py-4">
                  <p className="text-white/70 text-xs">{u.academic_level}</p>
                  <p className="text-white/40 text-xs">{u.year_label} · {u.period_label}</p>
                </td>
                <td className="px-4 py-4">
                  <a href={u.file_url} target="_blank" rel="noreferrer"
                    className="text-xs text-blue-400 hover:text-blue-300 font-semibold">
                    👁 View
                  </a>
                </td>
                <td className="px-4 py-4"><StatusBadge status={u.status} /></td>
                <td className="px-4 py-4">
                  {u.performance_score != null ? (
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-white/80">{u.performance_score}%</span>
                      <PerfBadge category={u.performance_category} />
                    </div>
                  ) : '—'}
                </td>
                <td className="px-4 py-4 text-white/40 text-xs whitespace-nowrap">{fmt(u.uploaded_at)}</td>
                <td className="px-4 py-4">
                  {u.status === 'pending' && (
                    <button onClick={() => setReviewing(u)}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold text-orange-300 hover:bg-orange-500/15 transition-all"
                      style={{ border: '1px solid rgba(249,115,22,0.25)' }}>
                      Review
                    </button>
                  )}
                  {u.status !== 'pending' && (
                    <button onClick={() => setReviewing(u)}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white/40 hover:text-white/70 transition-all"
                      style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
                      Edit
                    </button>
                  )}
                </td>
              </>
            )}
            renderMobileCard={(u) => (
              <div className="space-y-3">
                {/* Student Info */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-white/90 text-sm">{u.student_name}</p>
                    <p className="text-xs text-white/50 mt-0.5 truncate">{u.student_email}</p>
                    <div className="mt-2">
                      <StatusBadge status={u.status} />
                    </div>
                  </div>
                  {u.performance_score != null && (
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-lg font-bold text-white/90">{u.performance_score}%</span>
                      <PerfBadge category={u.performance_category} />
                    </div>
                  )}
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <p className="text-white/40 mb-1">Level</p>
                    <p className="text-white/70">{u.academic_level}</p>
                  </div>
                  <div>
                    <p className="text-white/40 mb-1">Period</p>
                    <p className="text-white/70">{u.year_label} · {u.period_label}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-white/40 mb-1">Uploaded</p>
                    <p className="text-white/70">{fmt(u.uploaded_at)}</p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2 border-t border-white/5">
                  <a href={u.file_url} target="_blank" rel="noreferrer"
                    className="flex-1 text-center px-3 py-2.5 rounded-lg text-xs font-semibold text-blue-300 hover:bg-blue-500/15 transition-all"
                    style={{ border: '1px solid rgba(59,130,246,0.25)' }}>
                    👁 View File
                  </a>
                  <button onClick={() => setReviewing(u)}
                    className={`flex-1 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                      u.status === 'pending'
                        ? 'text-orange-300 hover:bg-orange-500/15'
                        : 'text-white/40 hover:text-white/70'
                    }`}
                    style={{ border: `1px solid ${u.status === 'pending' ? 'rgba(249,115,22,0.25)' : 'rgba(255,255,255,0.1)'}` }}>
                    {u.status === 'pending' ? '✏️ Review' : '✏️ Edit'}
                  </button>
                </div>
              </div>
            )}
          />
        )}
      </div>

      {reviewing && (
        <ReviewModal
          upload={reviewing}
          onDone={load}
          onClose={() => setReviewing(null)}
        />
      )}
    </div>
  );
}
