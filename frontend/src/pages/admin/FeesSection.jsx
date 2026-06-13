import { useState, useEffect, useCallback } from 'react';
import api from '../../utils/api';
import ResponsiveTable from '../../components/common/ResponsiveTable';

function fmt(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' });
}
function currency(n) {
  return `GH₵ ${Number(n || 0).toLocaleString('en-GH', { minimumFractionDigits: 2 })}`;
}

function fileUrl(value) {
  if (!value) return '#';
  if (/^https?:\/\//i.test(value)) return value;
  return `${(api.defaults.baseURL || '').replace(/\/api\/?$/, '')}${value}`;
}

async function downloadFile(url, filename = 'uploaded-receipt') {
  const res = await fetch(fileUrl(url));
  const blob = await res.blob();
  const objectUrl = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = filename;
  link.click();
  window.URL.revokeObjectURL(objectUrl);
}

const FEE_LEVELS = {
  Diploma: { years: ['Diploma Year 1','Diploma Year 2'], periods: ['Semester 1','Semester 2'] },
  'Top Up': { years: ['Top Up Year 1','Top Up Year 2'], periods: ['Semester 1','Semester 2'] },
  Degree:  { years: ['Degree Year 1','Degree Year 2','Degree Year 3','Degree Year 4'], periods: ['Semester 1','Semester 2'] },
};

function StatusBadge({ status }) {
  const map = {
    paid:           'text-green-300 bg-green-500/10 border-green-500/25',
    partially_paid: 'text-blue-300 bg-blue-500/10 border-blue-500/25',
    pending:        'text-yellow-300 bg-yellow-500/10 border-yellow-500/25',
    overdue:        'text-red-300 bg-red-500/10 border-red-500/25',
    approved:       'text-green-300 bg-green-500/10 border-green-500/25',
    rejected:       'text-red-300 bg-red-500/10 border-red-500/25',
  };
  const labels = {
    paid:'Paid', partially_paid:'Partially Paid', pending:'Pending',
    overdue:'Overdue', approved:'Approved', rejected:'Rejected',
  };
  return (
    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border capitalize ${map[status] || map.pending}`}>
      {labels[status] || status}
    </span>
  );
}

/* ── Review modal ── */
function ReviewModal({ payment, onDone, onClose }) {
  const [action,  setAction]  = useState('approved');
  const [comment, setComment] = useState('');
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      await api.patch(`/fee-uploads/admin/payments/${payment.id}/review`, { action, comment: comment || null });
      onDone(); onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed.');
    } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-md rounded-2xl overflow-hidden"
        style={{ background: 'rgba(15,20,40,0.97)', border: '1px solid rgba(255,255,255,0.12)', boxShadow: '0 24px 80px rgba(0,0,0,0.6)', animation: 'modalIn 0.2s ease-out' }}>
        <style>{`@keyframes modalIn{from{opacity:0;transform:scale(.95)}to{opacity:1;transform:scale(1)}}`}</style>
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <h3 className="text-base font-bold text-white">Review Payment</h3>
          <button onClick={onClose} className="text-white/40 hover:text-white/80 text-xl">×</button>
        </div>
        <div className="p-5">
          <div className="rounded-xl p-3 mb-4" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <p className="text-sm font-semibold text-white">{payment.student_name}</p>
            <p className="text-xs text-white/50">{payment.academic_level} · {payment.year_label} · {payment.period_label}</p>
            <p className="text-sm font-bold text-orange-300 mt-1">{currency(payment.amount_paid)} · {payment.payment_method}</p>
            {payment.transaction_id && <p className="text-xs text-white/30">Txn: {payment.transaction_id}</p>}
            <a href={fileUrl(payment.file_url)} target="_blank" rel="noreferrer"
              className="text-xs text-blue-400 hover:text-blue-300 mt-1 inline-block">
              👁 View Receipt
            </a>
            <button
              type="button"
              onClick={() => downloadFile(payment.file_url, payment.file_name)}
              className="ml-3 text-xs font-semibold text-orange-300 hover:text-orange-200"
            >
              Download
            </button>
          </div>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex gap-2">
              {['approved','rejected'].map(a => (
                <button key={a} type="button" onClick={() => setAction(a)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-bold capitalize transition-all border ${
                    action === a
                      ? a === 'approved' ? 'bg-green-500/20 text-green-300 border-green-500/40'
                                        : 'bg-red-500/20 text-red-300 border-red-500/40'
                      : 'text-white/40 border-white/10'
                  }`}>
                  {a === 'approved' ? '✅ Approve' : '❌ Reject'}
                </button>
              ))}
            </div>
            <div>
              <label className="block text-xs font-medium text-white/50 mb-1.5">Comment</label>
              <textarea value={comment} onChange={e => setComment(e.target.value)} rows={3}
                placeholder={action === 'rejected' ? 'Reason for rejection…' : 'Optional comment…'}
                className="w-full rounded-xl px-3 py-2.5 text-sm text-white/90 focus:outline-none focus:ring-2 focus:ring-orange-400/60 resize-none"
                style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)' }} />
            </div>
            {error && <p className="text-xs text-red-400">{error}</p>}
            <div className="flex gap-3">
              <button type="button" onClick={onClose}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white/50 hover:text-white/80 transition-all"
                style={{ border: '1px solid rgba(255,255,255,0.1)' }}>Cancel</button>
              <button type="submit" disabled={saving}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-50"
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

/* ── Assign fee modal ── */
function AssignFeeModal({ onDone, onClose }) {
  const [students, setStudents] = useState([]);
  const [form, setForm] = useState({
    student_id: '', academic_level: '', year_label: '', period_label: '',
    tuition_fee: '', registration_fee: '', hostel_fee: '', examination_fee: '', other_charges: '', due_date: '',
  });
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');

  useEffect(() => {
    api.get('/users?role=student').then(r => setStudents(r.data.users || [])).catch(() => {});
  }, []);

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  const group     = form.academic_level ? (form.academic_level.toUpperCase().startsWith('DIPLOMA') ? 'Diploma' : form.academic_level.toUpperCase().startsWith('TOP') ? 'Top Up' : form.academic_level.toUpperCase().startsWith('DEGREE') ? 'Degree' : null) : null;
  const structure = group ? FEE_LEVELS[group] : null;

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      await api.post('/fee-uploads/admin/records', {
        ...form,
        tuition_fee:      Number(form.tuition_fee || 0),
        registration_fee: Number(form.registration_fee || 0),
        hostel_fee:       Number(form.hostel_fee || 0),
        examination_fee:  Number(form.examination_fee || 0),
        other_charges:    Number(form.other_charges || 0),
      });
      onDone(); onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed.');
    } finally { setSaving(false); }
  }

  const inputCls = 'w-full rounded-xl px-3 py-2.5 text-sm text-white/90 focus:outline-none focus:ring-2 focus:ring-orange-400/60';
  const inputStyle = { background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)' };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl"
        style={{ background: 'rgba(15,20,40,0.97)', border: '1px solid rgba(255,255,255,0.12)', boxShadow: '0 24px 80px rgba(0,0,0,0.6)' }}>
        <div className="flex items-center justify-between px-5 py-4 sticky top-0"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', background: 'rgba(15,20,40,0.97)' }}>
          <h3 className="text-base font-bold text-white">Assign Fee Record</h3>
          <button onClick={onClose} className="text-white/40 hover:text-white/80 text-xl">×</button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4">
          <div>
            <label className="block text-xs font-medium text-white/50 mb-1.5">Student *</label>
            <select value={form.student_id} onChange={e => set('student_id', e.target.value)} required className={inputCls} style={inputStyle}>
              <option value="">— Select student —</option>
              {students.map(s => <option key={s.id} value={s.id}>{s.name} ({s.email})</option>)}
            </select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-white/50 mb-1.5">Level *</label>
              <select value={form.academic_level} onChange={e => { set('academic_level', e.target.value); set('year_label',''); set('period_label',''); }} required className={inputCls} style={inputStyle}>
                <option value="">— Level —</option>
                <option value="Diploma">Diploma</option>
                <option value="Top Up">Top Up</option>
                <option value="Degree">Degree</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-white/50 mb-1.5">Year *</label>
              <select value={form.year_label} onChange={e => set('year_label', e.target.value)} required className={inputCls} style={inputStyle}>
                <option value="">— Year —</option>
                {structure?.years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-white/50 mb-1.5">Semester *</label>
              <select value={form.period_label} onChange={e => set('period_label', e.target.value)} required className={inputCls} style={inputStyle}>
                <option value="">— Semester —</option>
                {structure?.periods.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              ['tuition_fee','Tuition Fee'], ['registration_fee','Registration Fee'],
              ['hostel_fee','Hostel Fee'], ['examination_fee','Examination Fee'],
              ['other_charges','Other Charges'],
            ].map(([k, label]) => (
              <div key={k}>
                <label className="block text-xs font-medium text-white/50 mb-1.5">{label} (GH₵)</label>
                <input type="number" min="0" step="0.01" value={form[k]} onChange={e => set(k, e.target.value)}
                  placeholder="0.00" className={inputCls} style={inputStyle} />
              </div>
            ))}
            <div>
              <label className="block text-xs font-medium text-white/50 mb-1.5">Due Date</label>
              <input type="date" value={form.due_date} onChange={e => set('due_date', e.target.value)} className={inputCls} style={inputStyle} />
            </div>
          </div>
          {error && <p className="text-xs text-red-400">{error}</p>}
          <div className="flex gap-3">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white/50 hover:text-white/80 transition-all"
              style={{ border: '1px solid rgba(255,255,255,0.1)' }}>Cancel</button>
            <button type="submit" disabled={saving}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-50"
              style={{ background: '#f97316' }}>
              {saving ? 'Saving…' : 'Assign Fees'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── Main admin fees section ── */
export default function AdminFeesSection() {
  const [tab,       setTab]       = useState('payments');
  const [payments,  setPayments]  = useState([]);
  const [records,   setRecords]   = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState('');
  const [statusFilter, setStatusFilter] = useState('pending');
  const [reviewing, setReviewing] = useState(null);
  const [assigning, setAssigning] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search)                   params.set('q', search);
    if (statusFilter !== 'all')   params.set('status', statusFilter);

    Promise.allSettled([
      api.get(`/fee-uploads/admin/payments?${params}`),
      api.get(`/fee-uploads/admin/records?${params}`),
      api.get('/fee-uploads/admin/analytics'),
    ]).then(([paymentsRes, recordsRes, analyticsRes]) => {
      if (paymentsRes.status === 'fulfilled')  setPayments(paymentsRes.value.data || []);
      if (recordsRes.status === 'fulfilled')   setRecords(recordsRes.value.data || []);
      if (analyticsRes.status === 'fulfilled') setAnalytics(analyticsRes.value.data);
    }).finally(() => setLoading(false));
  }, [search, statusFilter]);

  useEffect(() => { load(); }, [load]);

  const counts = analytics?.payment_counts || {};

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-bold text-white">Fees Management</h2>
          <p className="text-sm text-white/40 mt-0.5">Manage student fee records and payment approvals</p>
        </div>
        <button onClick={() => setAssigning(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white"
          style={{ background: '#f97316', boxShadow: '0 2px 12px rgba(249,115,22,0.35)' }}>
          ➕ Assign Fees
        </button>
      </div>

      {/* Analytics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Total Collected', value: currency(analytics?.total_collected),   icon: '💰', colour: 'rgba(34,197,94,0.15)'  },
          { label: 'Outstanding',     value: currency(analytics?.total_outstanding),  icon: '⚠️', colour: 'rgba(239,68,68,0.15)'  },
          { label: 'Pending Review',  value: counts.pending,                          icon: '⏳', colour: 'rgba(234,179,8,0.15)'  },
          { label: 'Approved',        value: counts.approved,                         icon: '✅', colour: 'rgba(34,197,94,0.15)'  },
        ].map(c => (
          <div key={c.label} className="rounded-2xl p-4 flex items-center gap-3"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg" style={{ background: c.colour }}>
              {c.icon}
            </div>
            <div>
              <p className="text-lg font-bold text-white">{c.value ?? '—'}</p>
              <p className="text-xs text-white/40">{c.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'rgba(255,255,255,0.05)' }}>
        {[
          { id: 'payments', label: 'Pending Receipt Approvals' },
          { id: 'records',  label: '📋 Fee Records' },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
              tab === t.id ? 'bg-orange-500 text-white shadow' : 'text-white/50 hover:text-white/80'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

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

      {/* Payments table */}
      {tab === 'payments' && (
        <div className="rounded-2xl overflow-hidden"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
          {loading ? (
            <div className="py-12 text-center text-white/30 text-sm">Loading…</div>
          ) : payments.length === 0 ? (
            <div className="py-12 text-center">
              <div className="text-3xl mb-2">💳</div>
              <p className="text-white/30 text-sm">No payment submissions found.</p>
            </div>
          ) : (
            <ResponsiveTable
              headers={['Student','Level / Period','Amount','Method','Date','Status','Actions']}
              data={payments}
              emptyMessage="No payment submissions found."
              renderRow={(p, i) => (
                <>
                  <td className="px-4 py-4">
                    <p className="font-semibold text-white/90">{p.student_name}</p>
                    <p className="text-xs text-white/40">{p.student_email}</p>
                  </td>
                  <td className="px-4 py-4">
                    <p className="text-white/70 text-xs">{p.academic_level}</p>
                    <p className="text-white/40 text-xs">{p.year_label} · {p.period_label}</p>
                  </td>
                  <td className="px-4 py-4 text-orange-300 font-bold text-sm">{currency(p.amount_paid)}</td>
                  <td className="px-4 py-4 text-white/60 text-xs">{p.payment_method}</td>
                  <td className="px-4 py-4 text-white/40 text-xs whitespace-nowrap">{fmt(p.payment_date)}</td>
                  <td className="px-4 py-4"><StatusBadge status={p.status} /></td>
                  <td className="px-4 py-4">
                    <div className="flex gap-1.5">
                      <a href={fileUrl(p.file_url)} target="_blank" rel="noreferrer"
                        className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-blue-300 hover:bg-blue-500/15 transition-all"
                        style={{ border: '1px solid rgba(59,130,246,0.25)' }}>
                        👁
                      </a>
                      <button
                        type="button"
                        onClick={() => downloadFile(p.file_url, p.file_name)}
                        className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-green-300 hover:bg-green-500/15 transition-all"
                        style={{ border: '1px solid rgba(34,197,94,0.25)' }}
                      >
                        Download
                      </button>
                      <button onClick={() => setReviewing(p)}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                          p.status === 'pending'
                            ? 'text-orange-300 hover:bg-orange-500/15'
                            : 'text-white/40 hover:text-white/70'
                        }`}
                        style={{ border: `1px solid ${p.status === 'pending' ? 'rgba(249,115,22,0.25)' : 'rgba(255,255,255,0.1)'}` }}>
                        {p.status === 'pending' ? 'Review' : 'Edit'}
                      </button>
                    </div>
                  </td>
                </>
              )}
              renderMobileCard={(p) => (
                <div className="space-y-3">
                  {/* Student Info */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-white/90 text-sm">{p.student_name}</p>
                      <p className="text-xs text-white/50 mt-0.5 truncate">{p.student_email}</p>
                      <div className="mt-2">
                        <StatusBadge status={p.status} />
                      </div>
                    </div>
                    <p className="text-orange-300 font-bold text-lg">{currency(p.amount_paid)}</p>
                  </div>

                  {/* Details Grid */}
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <p className="text-white/40 mb-1">Level</p>
                      <p className="text-white/70">{p.academic_level}</p>
                    </div>
                    <div>
                      <p className="text-white/40 mb-1">Period</p>
                      <p className="text-white/70">{p.year_label} · {p.period_label}</p>
                    </div>
                    <div>
                      <p className="text-white/40 mb-1">Method</p>
                      <p className="text-white/70">{p.payment_method}</p>
                    </div>
                    <div>
                      <p className="text-white/40 mb-1">Date</p>
                      <p className="text-white/70">{fmt(p.payment_date)}</p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-2 border-t border-white/5 flex-wrap">
                    <a href={fileUrl(p.file_url)} target="_blank" rel="noreferrer"
                      className="flex-1 min-w-[80px] text-center px-3 py-2.5 rounded-lg text-xs font-semibold text-blue-300 hover:bg-blue-500/15 transition-all"
                      style={{ border: '1px solid rgba(59,130,246,0.25)' }}>
                      👁 View
                    </a>
                    <button
                      type="button"
                      onClick={() => downloadFile(p.file_url, p.file_name)}
                      className="flex-1 min-w-[80px] px-3 py-2.5 rounded-lg text-xs font-semibold text-green-300 hover:bg-green-500/15 transition-all"
                      style={{ border: '1px solid rgba(34,197,94,0.25)' }}
                    >
                      📥 Download
                    </button>
                    <button onClick={() => setReviewing(p)}
                      className={`flex-1 min-w-[80px] px-3 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                        p.status === 'pending'
                          ? 'text-orange-300 hover:bg-orange-500/15'
                          : 'text-white/40 hover:text-white/70'
                      }`}
                      style={{ border: `1px solid ${p.status === 'pending' ? 'rgba(249,115,22,0.25)' : 'rgba(255,255,255,0.1)'}` }}>
                      {p.status === 'pending' ? '✏️ Review' : '✏️ Edit'}
                    </button>
                  </div>
                </div>
              )}
            />
          )}
        </div>
      )}

      {/* Fee records table */}
      {tab === 'records' && (
        <div className="rounded-2xl overflow-hidden"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
          {loading ? (
            <div className="py-12 text-center text-white/30 text-sm">Loading…</div>
          ) : records.length === 0 ? (
            <div className="py-12 text-center">
              <div className="text-3xl mb-2">📋</div>
              <p className="text-white/30 text-sm">No fee records found. Click "Assign Fees" to create one.</p>
            </div>
          ) : (
            <ResponsiveTable
              headers={['Student','Level / Period','Total','Paid','Outstanding','Status','Due']}
              data={records}
              emptyMessage="No fee records found."
              renderRow={(r, i) => (
                <>
                  <td className="px-4 py-4">
                    <p className="font-semibold text-white/90">{r.student_name}</p>
                    <p className="text-xs text-white/40">{r.student_email}</p>
                  </td>
                  <td className="px-4 py-4">
                    <p className="text-white/70 text-xs">{r.academic_level}</p>
                    <p className="text-white/40 text-xs">{r.year_label} · {r.period_label}</p>
                  </td>
                  <td className="px-4 py-4 text-white/80 font-medium">{currency(r.total_amount)}</td>
                  <td className="px-4 py-4 text-green-300 font-medium">{currency(r.amount_paid)}</td>
                  <td className="px-4 py-4 text-red-300 font-medium">
                    {currency(Math.max(0, Number(r.total_amount) - Number(r.amount_paid)))}
                  </td>
                  <td className="px-4 py-4"><StatusBadge status={r.status} /></td>
                  <td className="px-4 py-4 text-white/40 text-xs whitespace-nowrap">{fmt(r.due_date)}</td>
                </>
              )}
              renderMobileCard={(r) => (
                <div className="space-y-3">
                  {/* Student Info */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-white/90 text-sm">{r.student_name}</p>
                      <p className="text-xs text-white/50 mt-0.5 truncate">{r.student_email}</p>
                      <div className="mt-2">
                        <StatusBadge status={r.status} />
                      </div>
                    </div>
                  </div>

                  {/* Details Grid */}
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <p className="text-white/40 mb-1">Level</p>
                      <p className="text-white/70">{r.academic_level}</p>
                    </div>
                    <div>
                      <p className="text-white/40 mb-1">Period</p>
                      <p className="text-white/70">{r.year_label} · {r.period_label}</p>
                    </div>
                    <div>
                      <p className="text-white/40 mb-1">Total</p>
                      <p className="text-white/80 font-medium">{currency(r.total_amount)}</p>
                    </div>
                    <div>
                      <p className="text-white/40 mb-1">Paid</p>
                      <p className="text-green-300 font-medium">{currency(r.amount_paid)}</p>
                    </div>
                    <div>
                      <p className="text-white/40 mb-1">Outstanding</p>
                      <p className="text-red-300 font-medium">
                        {currency(Math.max(0, Number(r.total_amount) - Number(r.amount_paid)))}
                      </p>
                    </div>
                    <div>
                      <p className="text-white/40 mb-1">Due Date</p>
                      <p className="text-white/70">{fmt(r.due_date)}</p>
                    </div>
                  </div>
                </div>
              )}
            />
          )}
        </div>
      )}

      {reviewing && (
        <ReviewModal payment={reviewing} onDone={load} onClose={() => setReviewing(null)} />
      )}
      {assigning && (
        <AssignFeeModal onDone={load} onClose={() => setAssigning(false)} />
      )}
    </div>
  );
}
