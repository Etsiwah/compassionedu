import { useState, useEffect } from 'react';
import api from '../../utils/api';
import useAuth from '../../hooks/useAuth';

const VALID_ROLES = ['all', 'student', 'teacher', 'parent', 'staff'];
const EMPTY = { title: '', content: '', target_role: 'all' };

function timeAgo(d) {
  if (!d) return '';
  const diff = Math.floor((Date.now() - new Date(d)) / 1000);
  if (diff < 60)    return 'just now';
  if (diff < 3600)  return `${Math.floor(diff/60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff/3600)}h ago`;
  return new Date(d).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' });
}

const inputCls = 'w-full rounded-xl px-3 py-2.5 text-sm text-white/90 focus:outline-none focus:ring-2 focus:ring-orange-400/60';
const inputStyle = { background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.12)' };

export default function AnnouncementsSection() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [announcements, setAnnouncements] = useState([]);
  const [form, setForm]   = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');
  const [showForm, setShowForm] = useState(false);

  function load() {
    api.get('/announcements').then(r => setAnnouncements(r.data || [])).catch(() => {});
  }

  useEffect(load, []);

  function set(field, value) { setForm(f => ({ ...f, [field]: value })); }

  async function handleCreate(e) {
    e.preventDefault();
    setError(''); setSaving(true);
    try {
      await api.post('/announcements', form);
      setForm(EMPTY); setShowForm(false); load();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to post announcement');
    } finally { setSaving(false); }
  }

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white">Announcements</h2>
          <p className="text-sm text-white/40 mt-0.5">{announcements.length} announcement{announcements.length !== 1 ? 's' : ''}</p>
        </div>
        {isAdmin && (
          <button onClick={() => setShowForm(s => !s)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all"
            style={{ background:'#f97316', boxShadow:'0 2px 12px rgba(249,115,22,0.35)' }}>
            {showForm ? '✕ Cancel' : '📢 New Announcement'}
          </button>
        )}
      </div>

      {/* Create form */}
      {isAdmin && showForm && (
        <form onSubmit={handleCreate} className="rounded-2xl p-5 flex flex-col gap-4"
          style={{ background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.09)' }}>
          <h3 className="text-sm font-bold text-white/80 uppercase tracking-wide">📢 New Announcement</h3>
          <div>
            <label className="block text-xs font-medium text-white/50 mb-1.5">Title *</label>
            <input type="text" required value={form.title} onChange={e => set('title', e.target.value)}
              placeholder="Announcement title…" className={inputCls} style={inputStyle} />
          </div>
          <div>
            <label className="block text-xs font-medium text-white/50 mb-1.5">Content *</label>
            <textarea rows={4} required value={form.content} onChange={e => set('content', e.target.value)}
              placeholder="Write your announcement…" className={`${inputCls} resize-none`} style={inputStyle} />
          </div>
          <div>
            <label className="block text-xs font-medium text-white/50 mb-1.5">Target Audience</label>
            <div className="flex flex-wrap gap-2">
              {VALID_ROLES.map(r => (
                <button key={r} type="button" onClick={() => set('target_role', r)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all ${
                    form.target_role === r
                      ? 'bg-orange-500/20 text-orange-300 border border-orange-500/40'
                      : 'text-white/40 border border-white/10 hover:border-white/20'
                  }`}>
                  {r === 'all' ? '🌐 Everyone' : r}
                </button>
              ))}
            </div>
          </div>
          {error && <p className="text-xs text-red-400">{error}</p>}
          <button type="submit" disabled={saving}
            className="py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-50"
            style={{ background:'#f97316', boxShadow:'0 2px 12px rgba(249,115,22,0.3)' }}>
            {saving ? 'Posting…' : '📢 Post Announcement'}
          </button>
        </form>
      )}

      {/* List */}
      {announcements.length === 0 ? (
        <div className="rounded-2xl p-8 text-center"
          style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.07)' }}>
          <div className="text-3xl mb-2">📢</div>
          <p className="text-white/40 text-sm">No announcements yet.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {announcements.map(a => (
            <div key={a.id} className="rounded-2xl p-5"
              style={{ background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.09)' }}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white">{a.title}</p>
                  <p className="text-sm text-white/60 mt-1 leading-relaxed">{a.content}</p>
                </div>
                <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full text-orange-300"
                    style={{ background:'rgba(249,115,22,0.12)', border:'1px solid rgba(249,115,22,0.25)' }}>
                    {a.target_role}
                  </span>
                  <span className="text-[10px] text-white/30">{timeAgo(a.created_at)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
