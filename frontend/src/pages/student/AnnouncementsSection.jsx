import { useState, useEffect } from 'react';
import api from '../../utils/api';
import AnnouncementReply from '../../components/AnnouncementReply';

function timeAgo(d) {
  if (!d) return '';
  const diff = Math.floor((Date.now() - new Date(d)) / 1000);
  if (diff < 60)    return 'just now';
  if (diff < 3600)  return `${Math.floor(diff/60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff/3600)}h ago`;
  return new Date(d).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' });
}

const TYPE_COLOURS = {
  all:     'text-blue-300 bg-blue-500/10 border-blue-500/25',
  student: 'text-green-300 bg-green-500/10 border-green-500/25',
  teacher: 'text-purple-300 bg-purple-500/10 border-purple-500/25',
  parent:  'text-pink-300 bg-pink-500/10 border-pink-500/25',
  staff:   'text-orange-300 bg-orange-500/10 border-orange-500/25',
};

export default function AnnouncementsSection() {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading]             = useState(true);
  const [search, setSearch]               = useState('');

  useEffect(() => {
    api.get('/announcements')
      .then(r => setAnnouncements(r.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function markRead(id) {
    await api.patch(`/announcements/${id}/read`).catch(() => {});
    setAnnouncements(prev => prev.map(a => a.id === id ? { ...a, is_read: true } : a));
  }

  const filtered = announcements.filter(a =>
    !search || a.title.toLowerCase().includes(search.toLowerCase()) ||
    a.content.toLowerCase().includes(search.toLowerCase())
  );

  const unreadCount = announcements.filter(a => !a.is_read).length;

  return (
    <div className="flex flex-col gap-5 max-w-2xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-bold text-white">Announcements</h2>
          <p className="text-sm text-white/40 mt-0.5">
            {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={() => announcements.filter(a => !a.is_read).forEach(a => markRead(a.id))}
            className="text-xs font-semibold text-orange-400 hover:text-orange-300 transition-colors">
            Mark all as read
          </button>
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 text-sm">🔍</span>
        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search announcements…"
          className="w-full pl-8 pr-3 py-2.5 rounded-xl text-sm text-white/90 focus:outline-none focus:ring-2 focus:ring-orange-400/60"
          style={{ background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.1)' }} />
      </div>

      {/* List */}
      {loading ? (
        <p className="text-white/30 text-sm text-center py-8">Loading…</p>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl p-8 text-center"
          style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.07)' }}>
          <div className="text-3xl mb-2">📢</div>
          <p className="text-white/40 text-sm">
            {search ? 'No announcements match your search.' : 'No announcements yet.'}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map(a => (
            <div
              key={a.id}
              onClick={() => !a.is_read && markRead(a.id)}
              className={`rounded-2xl p-5 cursor-pointer transition-all ${!a.is_read ? 'hover:bg-white/6' : ''}`}
              style={{
                background: !a.is_read ? 'rgba(249,115,22,0.06)' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${!a.is_read ? 'rgba(249,115,22,0.2)' : 'rgba(255,255,255,0.07)'}`,
              }}>
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  {!a.is_read && (
                    <div className="w-2 h-2 rounded-full bg-orange-400 flex-shrink-0 mt-1" />
                  )}
                  <h3 className={`text-sm font-bold ${!a.is_read ? 'text-white' : 'text-white/80'}`}>
                    {a.title}
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border capitalize ${TYPE_COLOURS[a.target_role] || TYPE_COLOURS.all}`}>
                    {a.target_role}
                  </span>
                  <span className="text-xs text-white/30">{timeAgo(a.created_at)}</span>
                </div>
              </div>
              <p className={`text-sm mt-2 leading-relaxed ${!a.is_read ? 'text-white/70' : 'text-white/50'}`}>
                {a.content}
              </p>
              {!a.is_read && (
                <p className="text-[10px] text-orange-400/60 mt-2">Tap to mark as read</p>
              )}
              
              {/* Reply Component */}
              <div className="mt-4 pt-4 border-t border-white/5">
                <AnnouncementReply announcementId={a.id} onSuccess={() => {}} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
