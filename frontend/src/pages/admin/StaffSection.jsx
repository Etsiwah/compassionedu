import { useState, useEffect, useCallback } from 'react';
import api from '../../utils/api';

/* ── helpers ── */
function fmt(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

function fmtTime(dateStr) {
  if (!dateStr) return 'Never';
  const d = new Date(dateStr);
  const now = new Date();
  const diff = Math.floor((now - d) / 1000);
  if (diff < 60)    return 'Just now';
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return fmt(dateStr);
}

function initials(name = '') {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

const STAFF_ROLES = ['Support', 'Manager', 'Field Staff', 'Coordinator', 'Supervisor', 'Other'];

/* ── glass card ── */
function Glass({ children, className = '' }) {
  return (
    <div
      className={`rounded-2xl ${className}`}
      style={{
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.09)',
        boxShadow: '0 4px 24px rgba(0,0,0,0.25)',
      }}
    >
      {children}
    </div>
  );
}

/* ── source badge ── */
function SourceBadge({ source }) {
  const isAdmin = source === 'admin_added';
  return (
    <span
      className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide ${
        isAdmin ? 'text-orange-300' : 'text-blue-300'
      }`}
      style={{
        background: isAdmin ? 'rgba(249,115,22,0.12)' : 'rgba(59,130,246,0.12)',
        border: `1px solid ${isAdmin ? 'rgba(249,115,22,0.25)' : 'rgba(59,130,246,0.25)'}`,
      }}
    >
      {isAdmin ? '👑 Admin Added' : '🌐 Self-Registered'}
    </span>
  );
}

/* ── status badge ── */
function StatusBadge({ active }) {
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${
        active ? 'text-green-400' : 'text-red-400'
      }`}
      style={{
        background: active ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
        border: `1px solid ${active ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)'}`,
      }}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-green-400' : 'bg-red-400'}`} />
      {active ? 'Active' : 'Suspended'}
    </span>
  );
}

/* ── shared input style ── */
const inputCls = 'w-full rounded-xl px-3 py-2.5 text-sm text-white/90 focus:outline-none focus:ring-2 focus:ring-orange-400/60 transition-all';
const inputStyle = { background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)' };

/* ── Add / Edit Modal ── */
function StaffModal({ initial, onSave, onClose }) {
  const isEdit = !!initial?.id;
  const [form, setForm] = useState({
    name:       initial?.name       || '',
    email:      initial?.email      || '',
    password:   '',
    phone:      initial?.phone      || '',
    staff_role: initial?.staff_role || '',
    is_active:  initial?.is_active  ?? true,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!isEdit && !form.password) { setError('Password is required for new staff.'); return; }
    setSaving(true);
    try {
      const payload = { ...form };
      if (isEdit && !payload.password) delete payload.password;
      await onSave(payload);
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full max-w-md rounded-2xl overflow-hidden"
        style={{
          background: 'rgba(15,20,40,0.97)',
          border: '1px solid rgba(255,255,255,0.12)',
          boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
          animation: 'modalIn 0.2s ease-out',
        }}
      >
        <style>{`@keyframes modalIn{from{opacity:0;transform:scale(.95) translateY(8px)}to{opacity:1;transform:scale(1) translateY(0)}}`}</style>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <h3 className="text-base font-bold text-white">
            {isEdit ? '✏️ Edit Staff Member' : '➕ Add New Staff'}
          </h3>
          <button onClick={onClose} className="text-white/40 hover:text-white/80 text-xl leading-none">×</button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4">
          {/* Name */}
          <div>
            <label className="block text-xs font-medium text-white/50 mb-1.5">Full Name *</label>
            <input type="text" required value={form.name} onChange={e => set('name', e.target.value)}
              placeholder="e.g. Ama Owusu" className={inputCls} style={inputStyle} />
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs font-medium text-white/50 mb-1.5">Email Address *</label>
            <input type="email" required value={form.email} onChange={e => set('email', e.target.value)}
              placeholder="e.g. ama@compassionedu.com" className={inputCls} style={inputStyle} />
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-medium text-white/50 mb-1.5">
              Password {isEdit ? '(leave blank to keep current)' : '*'}
            </label>
            <input type="password" value={form.password} onChange={e => set('password', e.target.value)}
              placeholder={isEdit ? 'Leave blank to keep current' : 'Min. 6 characters'}
              className={inputCls} style={inputStyle} />
          </div>

          {/* Phone */}
          <div>
            <label className="block text-xs font-medium text-white/50 mb-1.5">Phone Number</label>
            <input type="tel" value={form.phone} onChange={e => set('phone', e.target.value)}
              placeholder="e.g. +233 20 123 4567" className={inputCls} style={inputStyle} />
          </div>

          {/* Staff Role */}
          <div>
            <label className="block text-xs font-medium text-white/50 mb-1.5">Staff Role</label>
            <select value={form.staff_role} onChange={e => set('staff_role', e.target.value)}
              className={inputCls} style={inputStyle}>
              <option value="">— Select role —</option>
              {STAFF_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>

          {/* Status */}
          <div>
            <label className="block text-xs font-medium text-white/50 mb-1.5">Status</label>
            <div className="flex gap-2">
              {[true, false].map(v => (
                <button key={String(v)} type="button" onClick={() => set('is_active', v)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all border ${
                    form.is_active === v
                      ? v ? 'bg-green-500/20 text-green-300 border-green-500/40'
                          : 'bg-red-500/20 text-red-300 border-red-500/40'
                      : 'text-white/40 border-white/10 hover:border-white/20'
                  }`}>
                  {v ? '✅ Active' : '⛔ Suspended'}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <p className="text-xs text-red-400 px-3 py-2 rounded-xl" style={{ background: 'rgba(239,68,68,0.1)' }}>
              {error}
            </p>
          )}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white/50 hover:text-white/80 transition-all"
              style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-50"
              style={{ background: saving ? 'rgba(249,115,22,0.5)' : '#f97316', boxShadow: '0 2px 12px rgba(249,115,22,0.3)' }}>
              {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Staff'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── Delete confirm ── */
function DeleteModal({ name, onConfirm, onClose }) {
  const [deleting, setDeleting] = useState(false);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-sm rounded-2xl p-6 text-center"
        style={{ background: 'rgba(15,20,40,0.97)', border: '1px solid rgba(255,255,255,0.12)', boxShadow: '0 24px 80px rgba(0,0,0,0.6)', animation: 'modalIn 0.2s ease-out' }}>
        <div className="text-4xl mb-3">🗑️</div>
        <h3 className="text-base font-bold text-white mb-1">Remove Staff Member</h3>
        <p className="text-sm text-white/50 mb-5">
          Remove <span className="text-white font-semibold">{name}</span> from staff? Their account will be deactivated.
        </p>
        <div className="flex gap-3">
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white/50 hover:text-white/80 transition-all"
            style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
            Cancel
          </button>
          <button onClick={async () => { setDeleting(true); try { await onConfirm(); onClose(); } catch { setDeleting(false); } }}
            disabled={deleting}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-50"
            style={{ background: '#ef4444', boxShadow: '0 2px 12px rgba(239,68,68,0.3)' }}>
            {deleting ? 'Removing…' : 'Remove'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── View Profile Modal ── */
function StaffProfileModal({ staffId, onClose }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/profile/${staffId}`)
      .then(r => setProfile(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [staffId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-md rounded-2xl overflow-hidden"
        style={{ background: 'rgba(15,20,40,0.97)', border: '1px solid rgba(255,255,255,0.12)', boxShadow: '0 24px 80px rgba(0,0,0,0.6)', animation: 'modalIn 0.2s ease-out' }}>
        
        {/* Header decoration */}
        <div className="relative h-24 bg-gradient-to-br from-blue-500/20 to-blue-600/5 flex justify-end p-3">
          <button onClick={onClose} className="text-white/40 hover:text-white/80 text-2xl leading-none h-min">×</button>
        </div>

        {loading ? (
          <div className="py-12 text-center text-white/40">Loading profile…</div>
        ) : profile ? (
          <div className="px-6 pb-6 -mt-12">
            <div className="w-24 h-24 rounded-full flex items-center justify-center text-3xl font-bold text-white shadow-2xl mb-4"
              style={{ background: 'linear-gradient(135deg, #3b82f6, #2563eb)', border: '4px solid rgba(15,20,40,1)' }}>
              {initials(profile.name)}
            </div>

            <h3 className="text-xl font-bold text-white">{profile.name}</h3>
            <p className="text-sm text-white/50 mb-6">{profile.email}</p>

            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] text-white/40 uppercase tracking-wide">Position / Role</p>
                  <p className="text-sm text-white/90 font-medium">{profile.staff_role || '—'}</p>
                </div>
                <div>
                  <p className="text-[10px] text-white/40 uppercase tracking-wide">Phone Number</p>
                  <p className="text-sm text-white/90 font-medium">{profile.phone || '—'}</p>
                </div>
                <div>
                  <p className="text-[10px] text-white/40 uppercase tracking-wide">Date of Birth</p>
                  <p className="text-sm text-white/90 font-medium">{fmt(profile.date_of_birth)}</p>
                </div>
              </div>

              <div className="border-t border-white/10 my-1" />

              <div>
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-[10px] text-white/40 uppercase tracking-wide">CV / Resume</p>
                  {profile.cv_url && profile.cv_status === 'pending' && <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-yellow-500/20 text-yellow-300">Pending</span>}
                  {profile.cv_url && profile.cv_status === 'approved' && <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-green-500/20 text-green-300">Approved</span>}
                  {profile.cv_url && profile.cv_status === 'rejected' && <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-500/20 text-red-300">Rejected</span>}
                </div>
                {profile.cv_url ? (
                  <div className="flex items-center gap-4">
                    <a href={profile.cv_url} target="_blank" rel="noreferrer" className="text-sm text-blue-400 hover:underline">
                      View CV ↗
                    </a>
                    {profile.cv_status === 'pending' && (
                      <div className="flex gap-2">
                        <button onClick={() => api.patch(`/profile/${staffId}/staff-documents`, { field: 'cv', status: 'approved' }).then(r => setProfile(r.data))} className="text-xs px-2 py-1 bg-green-500/20 text-green-300 hover:bg-green-500/30 rounded">Approve</button>
                        <button onClick={() => api.patch(`/profile/${staffId}/staff-documents`, { field: 'cv', status: 'rejected' }).then(r => setProfile(r.data))} className="text-xs px-2 py-1 bg-red-500/20 text-red-300 hover:bg-red-500/30 rounded">Reject</button>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-white/40">—</p>
                )}
              </div>

              <div>
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-[10px] text-white/40 uppercase tracking-wide">Portfolio</p>
                  {profile.portfolio_url && profile.portfolio_status === 'pending' && <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-yellow-500/20 text-yellow-300">Pending</span>}
                  {profile.portfolio_url && profile.portfolio_status === 'approved' && <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-green-500/20 text-green-300">Approved</span>}
                  {profile.portfolio_url && profile.portfolio_status === 'rejected' && <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-500/20 text-red-300">Rejected</span>}
                </div>
                {profile.portfolio_url ? (
                  <div className="flex items-center gap-4">
                    <a href={profile.portfolio_url} target="_blank" rel="noreferrer" className="text-sm text-blue-400 hover:underline">
                      View Portfolio ↗
                    </a>
                    {profile.portfolio_status === 'pending' && (
                      <div className="flex gap-2">
                        <button onClick={() => api.patch(`/profile/${staffId}/staff-documents`, { field: 'portfolio', status: 'approved' }).then(r => setProfile(r.data))} className="text-xs px-2 py-1 bg-green-500/20 text-green-300 hover:bg-green-500/30 rounded">Approve</button>
                        <button onClick={() => api.patch(`/profile/${staffId}/staff-documents`, { field: 'portfolio', status: 'rejected' }).then(r => setProfile(r.data))} className="text-xs px-2 py-1 bg-red-500/20 text-red-300 hover:bg-red-500/30 rounded">Reject</button>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-white/40">—</p>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="py-12 text-center text-white/40">Profile not found.</div>
        )}
      </div>
    </div>
  );
}

/* ── Main section ── */
export default function StaffSection() {
  const [staff, setStaff]             = useState([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState('');
  const [search, setSearch]           = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [modal, setModal]             = useState(null);
  const [toggling, setToggling]       = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search)                      params.set('q', search);
    if (statusFilter !== 'all')      params.set('status', statusFilter);
    if (sourceFilter !== 'all')      params.set('source', sourceFilter);

    api.get(`/staff?${params}`)
      .then(r => { setStaff(r.data || []); setError(''); })
      .catch(e => setError(e.response?.data?.error || 'Failed to load staff'))
      .finally(() => setLoading(false));
  }, [search, statusFilter, sourceFilter]);

  useEffect(() => { load(); }, [load]);

  async function handleSave(form) {
    if (modal?.data?.id) {
      await api.put(`/staff/${modal.data.id}`, form);
    } else {
      await api.post('/staff', form);
    }
    load();
  }

  async function handleToggle(member) {
    setToggling(member.id);
    try {
      await api.patch(`/staff/${member.id}/toggle`);
      load();
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to update status');
    } finally {
      setToggling(null);
    }
  }

  async function handleDelete(id) {
    await api.delete(`/staff/${id}`);
    load();
  }

  const counts = {
    total:      staff.length,
    active:     staff.filter(s => s.is_active).length,
    suspended:  staff.filter(s => !s.is_active).length,
    adminAdded: staff.filter(s => s.account_source === 'admin_added').length,
    selfReg:    staff.filter(s => s.account_source !== 'admin_added').length,
  };

  return (
    <div className="flex flex-col gap-6">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-bold text-white">Staff Management</h2>
          <p className="text-sm text-white/40 mt-0.5">All staff — admin-added and self-registered</p>
        </div>
        <button
          onClick={() => setModal({ type: 'add' })}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all"
          style={{ background: '#f97316', boxShadow: '0 2px 12px rgba(249,115,22,0.35)' }}
        >
          ➕ Add New Staff
        </button>
      </div>

      {/* ── Summary cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { label: 'Total',           value: counts.total,      icon: '🏫', colour: 'rgba(249,115,22,0.15)' },
          { label: 'Active',          value: counts.active,     icon: '✅', colour: 'rgba(34,197,94,0.15)'  },
          { label: 'Suspended',       value: counts.suspended,  icon: '⛔', colour: 'rgba(239,68,68,0.15)'  },
          { label: 'Admin Added',     value: counts.adminAdded, icon: '👑', colour: 'rgba(249,115,22,0.15)' },
          { label: 'Self-Registered', value: counts.selfReg,    icon: '🌐', colour: 'rgba(59,130,246,0.15)' },
        ].map(c => (
          <Glass key={c.label} className="p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-base flex-shrink-0"
              style={{ background: c.colour, border: '1px solid rgba(255,255,255,0.08)' }}>
              {c.icon}
            </div>
            <div>
              <p className="text-xl font-bold text-white">{c.value}</p>
              <p className="text-[10px] text-white/40 leading-tight">{c.label}</p>
            </div>
          </Glass>
        ))}
      </div>

      {/* ── Filters ── */}
      <Glass className="p-4 flex flex-wrap gap-3 items-center">
        {/* Search */}
        <div className="flex-1 min-w-[200px] relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 text-sm">🔍</span>
          <input
            type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or email…"
            className="w-full pl-8 pr-3 py-2.5 rounded-xl text-sm text-white/90 focus:outline-none focus:ring-2 focus:ring-orange-400/60"
            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}
          />
        </div>

        {/* Status filter */}
        <div className="flex gap-1.5">
          {[
            { val: 'all',      label: '🌐 All' },
            { val: 'active',   label: '✅ Active' },
            { val: 'inactive', label: '⛔ Suspended' },
          ].map(f => (
            <button key={f.val} onClick={() => setStatusFilter(f.val)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                statusFilter === f.val
                  ? 'bg-orange-500/20 text-orange-300 border border-orange-500/40'
                  : 'text-white/40 border border-white/10 hover:border-white/20 hover:text-white/70'
              }`}>
              {f.label}
            </button>
          ))}
        </div>

        {/* Source filter */}
        <div className="flex gap-1.5">
          {[
            { val: 'all',             label: 'All Sources' },
            { val: 'admin_added',     label: '👑 Admin Added' },
            { val: 'self_registered', label: '🌐 Self-Reg' },
          ].map(f => (
            <button key={f.val} onClick={() => setSourceFilter(f.val)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                sourceFilter === f.val
                  ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                  : 'text-white/40 border border-white/10 hover:border-white/20 hover:text-white/70'
              }`}>
              {f.label}
            </button>
          ))}
        </div>
      </Glass>

      {/* ── Error ── */}
      {error && (
        <div className="px-4 py-3 rounded-xl text-sm text-red-400"
          style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
          {error}
        </div>
      )}

      {/* ── Table ── */}
      <Glass className="overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-white/30 text-sm">Loading staff…</div>
        ) : staff.length === 0 ? (
          <div className="py-16 text-center">
            <div className="text-4xl mb-3">🏫</div>
            <p className="text-white/40 text-sm">
              {search || statusFilter !== 'all' || sourceFilter !== 'all'
                ? 'No staff match your filters.'
                : 'No staff yet. Click "Add New Staff" to get started.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                  {['Staff Member', 'Contact', 'Role', 'Source', 'Status', 'Last Login', 'Date Joined', 'Actions'].map(h => (
                    <th key={h} className="text-left px-4 py-3.5 text-xs font-semibold text-white/35 uppercase tracking-wide whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {staff.map((s, i) => (
                  <tr key={s.id}
                    className="group transition-colors hover:bg-white/3"
                    style={{ borderBottom: i < staff.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>

                    {/* Name + avatar */}
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold text-white"
                          style={{ background: s.account_source === 'admin_added'
                            ? 'linear-gradient(135deg,#f97316,#ea580c)'
                            : 'linear-gradient(135deg,#3b82f6,#2563eb)' }}>
                          {initials(s.name)}
                        </div>
                        <span className="font-semibold text-white/90 whitespace-nowrap">{s.name}</span>
                      </div>
                    </td>

                    {/* Email + phone */}
                    <td className="px-4 py-4">
                      <p className="text-white/70">{s.email}</p>
                      <p className="text-white/35 text-xs mt-0.5">{s.phone || '—'}</p>
                    </td>

                    {/* Staff role */}
                    <td className="px-4 py-4">
                      <span className="text-white/60 text-xs px-2 py-1 rounded-lg"
                        style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>
                        {s.staff_role || 'Unassigned'}
                      </span>
                    </td>

                    {/* Source */}
                    <td className="px-4 py-4">
                      <SourceBadge source={s.account_source || 'self_registered'} />
                    </td>

                    {/* Status */}
                    <td className="px-4 py-4">
                      <StatusBadge active={s.is_active} />
                    </td>

                    {/* Last login */}
                    <td className="px-4 py-4 text-white/40 text-xs whitespace-nowrap">
                      {fmtTime(s.last_login_at)}
                    </td>

                    {/* Date joined */}
                    <td className="px-4 py-4 text-white/40 text-xs whitespace-nowrap">
                      {fmt(s.created_at)}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {/* View Profile */}
                        <button
                          onClick={() => setModal({ type: 'view', data: s })}
                          className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-purple-300 transition-all hover:bg-purple-500/15"
                          style={{ border: '1px solid rgba(168,85,247,0.25)' }}
                          title="View Profile">
                          👤
                        </button>

                        {/* Edit */}
                        <button
                          onClick={() => setModal({ type: 'edit', data: s })}
                          className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-blue-300 transition-all hover:bg-blue-500/15"
                          style={{ border: '1px solid rgba(59,130,246,0.25)' }}>
                          ✏️
                        </button>

                        {/* Suspend / Activate */}
                        <button
                          onClick={() => handleToggle(s)}
                          disabled={toggling === s.id}
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all disabled:opacity-50 ${
                            s.is_active
                              ? 'text-yellow-300 hover:bg-yellow-500/15'
                              : 'text-green-300 hover:bg-green-500/15'
                          }`}
                          style={{ border: `1px solid ${s.is_active ? 'rgba(234,179,8,0.25)' : 'rgba(34,197,94,0.25)'}` }}
                          title={s.is_active ? 'Suspend' : 'Activate'}
                        >
                          {toggling === s.id ? '…' : s.is_active ? '⛔' : '✅'}
                        </button>

                        {/* Delete */}
                        <button
                          onClick={() => setModal({ type: 'delete', data: s })}
                          className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-red-400 transition-all hover:bg-red-500/15"
                          style={{ border: '1px solid rgba(239,68,68,0.25)' }}>
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Glass>

      {/* ── Modals ── */}
      {(modal?.type === 'add' || modal?.type === 'edit') && (
        <StaffModal
          initial={modal.data}
          onSave={handleSave}
          onClose={() => setModal(null)}
        />
      )}

      {modal?.type === 'delete' && (
        <DeleteModal
          name={modal.data.name}
          onConfirm={() => handleDelete(modal.data.id)}
          onClose={() => setModal(null)}
        />
      )}

      {modal?.type === 'view' && (
        <StaffProfileModal
          staffId={modal.data.id}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
