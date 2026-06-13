import { useState, useEffect } from 'react';
import api from '../../utils/api';
import useAuth from '../../hooks/useAuth';

const VALID_ROLES = ['everyone', 'staff', 'student'];
const EMPTY = { title: '', content: '', target_role: 'everyone' };

function timeAgo(d) {
  if (!d) return '';
  const diff = Math.floor((Date.now() - new Date(d)) / 1000);
  if (diff < 60)    return 'just now';
  if (diff < 3600)  return `${Math.floor(diff/60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff/3600)}h ago`;
  return new Date(d).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' });
}

function displayTargetRole(role) {
  if (role === 'everyone') return 'Everyone';
  if (role === 'staff') return 'Staff';
  if (role === 'student') return 'Students';
  return role;
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
  const [success, setSuccess] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  function load() {
    api.get('/announcements').then(r => setAnnouncements(r.data || [])).catch(() => {});
  }

  useEffect(load, []);

  function set(field, value) { setForm(f => ({ ...f, [field]: value })); }

  function startEdit(announcement) {
    setForm({
      title: announcement.title,
      content: announcement.content,
      target_role: announcement.target_role
    });
    setEditingId(announcement.id);
    setShowForm(true);
    setError('');
    setSuccess('');
  }

  function cancelEdit() {
    setForm(EMPTY);
    setEditingId(null);
    setShowForm(false);
    setError('');
    setSuccess('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(''); setSuccess(''); setSaving(true);
    try {
      if (editingId) {
        await api.put(`/announcements/${editingId}`, form);
        setSuccess('Announcement updated successfully!');
      } else {
        await api.post('/announcements', form);
        setSuccess('Announcement created successfully!');
      }
      setForm(EMPTY);
      setEditingId(null);
      setShowForm(false);
      load();
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || `Failed to ${editingId ? 'update' : 'create'} announcement`);
    } finally { setSaving(false); }
  }

  async function confirmDelete() {
    if (!deleteConfirm) return;
    try {
      await api.delete(`/announcements/${deleteConfirm}`);
      setSuccess('Announcement deleted successfully!');
      setDeleteConfirm(null);
      load();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete announcement');
      setDeleteConfirm(null);
    }
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

      {/* Success/Error Messages */}
      {success && (
        <div className="rounded-xl p-3 text-sm text-green-300"
          style={{ background:'rgba(34,197,94,0.15)', border:'1px solid rgba(34,197,94,0.3)' }}>
          {success}
        </div>
      )}
      {error && (
        <div className="rounded-xl p-3 text-sm text-red-300"
          style={{ background:'rgba(239,68,68,0.15)', border:'1px solid rgba(239,68,68,0.3)' }}>
          {error}
        </div>
      )}

      {/* Create/Edit form */}
      {isAdmin && showForm && (
        <form onSubmit={handleSubmit} className="rounded-2xl p-5 flex flex-col gap-4"
          style={{ background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.09)' }}>
          <h3 className="text-sm font-bold text-white/80 uppercase tracking-wide">
            {editingId ? '✏️ Edit Announcement' : '📢 New Announcement'}
          </h3>
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
                  {r === 'everyone' ? '🌐 Everyone' : r === 'staff' ? '👥 Staff' : '🎓 Students'}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={saving}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-50"
              style={{ background:'#f97316', boxShadow:'0 2px 12px rgba(249,115,22,0.3)' }}>
              {saving ? (editingId ? 'Updating…' : 'Posting…') : (editingId ? '✏️ Update Announcement' : '📢 Post Announcement')}
            </button>
            {editingId && (
              <button type="button" onClick={cancelEdit}
                className="px-4 py-2.5 rounded-xl text-sm font-bold text-white/70 border border-white/20 hover:border-white/30 transition-all">
                Cancel
              </button>
            )}
          </div>
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
                    {displayTargetRole(a.target_role)}
                  </span>
                  <span className="text-[10px] text-white/30">{timeAgo(a.created_at)}</span>
                </div>
              </div>
              {isAdmin && (
                <div className="flex gap-2 mt-3 pt-3 border-t border-white/5">
                  <button onClick={() => startEdit(a)}
                    className="flex-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-blue-300 border border-blue-500/30 hover:bg-blue-500/10 transition-all">
                    ✏️ Edit
                  </button>
                  <button onClick={() => setDeleteConfirm(a.id)}
                    className="flex-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-red-300 border border-red-500/30 hover:bg-red-500/10 transition-all">
                    🗑️ Delete
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setDeleteConfirm(null)}>
          <div className="bg-gray-900 p-6 rounded-xl max-w-md mx-4 border border-white/10" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-white mb-4">Confirm Delete</h3>
            <p className="text-white/70 mb-6">
              Are you sure you want to delete this announcement? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button onClick={confirmDelete}
                className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 font-semibold">
                Delete
              </button>
              <button onClick={() => setDeleteConfirm(null)}
                className="flex-1 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 font-semibold">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
