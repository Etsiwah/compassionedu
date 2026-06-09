import { useState, useEffect, useRef } from 'react';
import api from '../../utils/api';

const TYPE_ICONS = {
  announcement:    '📢',
  fee_reminder:    '💳',
  attendance_alert:'📅',
  project_update:  '❤️',
};

export default function NotificationBell() {
  const [items, setItems]   = useState([]);
  const [open, setOpen]     = useState(false);
  const ref = useRef();

  function load() {
    // Try the new notifications endpoint first, fall back to announcements
    api.get('/notifications')
      .then(r => setItems(r.data || []))
      .catch(() => {
        api.get('/announcements')
          .then(r => setItems((r.data || []).map(a => ({
            id: a.id,
            message: a.title,
            type: 'announcement',
            is_read: !!a.is_read,
            created_at: a.created_at,
          }))))
          .catch(() => {});
      });
  }

  useEffect(() => {
    load();
    const id = setInterval(load, 60_000);
    return () => clearInterval(id);
  }, []);

  // Close on outside click
  useEffect(() => {
    function onMouseDown(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, []);

  const unread = items.filter(n => !n.is_read);
  const count  = unread.length;

  async function markRead(id) {
    // Try new endpoint first, fall back to announcements
    await api.patch(`/notifications/${id}/read`).catch(() =>
      api.patch(`/announcements/${id}/read`).catch(() => {})
    );
    setItems(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
  }

  async function markAllRead() {
    await Promise.allSettled(unread.map(n => markRead(n.id)));
  }

  function formatTime(ts) {
    if (!ts) return '';
    const d = new Date(ts);
    const now = new Date();
    const diff = Math.floor((now - d) / 1000);
    if (diff < 60)   return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return d.toLocaleDateString();
  }

  return (
    <div className="relative" ref={ref}>
      {/* Bell button */}
      <button
        onClick={() => setOpen(o => !o)}
        aria-label={`Notifications — ${count} unread`}
        className="relative p-2 rounded-xl transition-all duration-150 text-white/60 hover:text-white/90 hover:bg-white/10"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {count > 0 && (
          <span
            className="absolute top-0.5 right-0.5 min-w-[16px] h-4 px-0.5 flex items-center justify-center rounded-full text-[10px] font-bold text-white"
            style={{ background: '#ef4444', boxShadow: '0 0 6px rgba(239,68,68,0.6)' }}
          >
            {count > 99 ? '99+' : count}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          className="absolute right-0 mt-2 w-80 z-50 rounded-2xl overflow-hidden"
          style={{
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            background: 'rgba(15, 20, 40, 0.88)',
            border: '1px solid rgba(255,255,255,0.12)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08)',
            animation: 'dropdownIn 0.18s ease-out',
          }}
        >
          <style>{`
            @keyframes dropdownIn {
              from { opacity: 0; transform: translateY(-6px) scale(0.97); }
              to   { opacity: 1; transform: translateY(0) scale(1); }
            }
          `}</style>

          {/* Header */}
          <div
            className="px-4 py-3 flex items-center justify-between"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}
          >
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-white">Notifications</span>
              {count > 0 && (
                <span
                  className="text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white"
                  style={{ background: '#ef4444' }}
                >
                  {count}
                </span>
              )}
            </div>
            {count > 0 && (
              <button
                onClick={markAllRead}
                className="text-xs text-orange-400 hover:text-orange-300 transition-colors font-medium"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <ul className="max-h-80 overflow-y-auto">
            {items.length === 0 ? (
              <li className="px-4 py-8 text-center text-sm text-white/30">
                <div className="text-2xl mb-2">🔔</div>
                No notifications yet
              </li>
            ) : (
              items.map(n => (
                <li
                  key={n.id}
                  onClick={() => !n.is_read && markRead(n.id)}
                  className={`px-4 py-3 cursor-pointer transition-colors ${
                    !n.is_read
                      ? 'bg-orange-500/8 hover:bg-orange-500/12'
                      : 'hover:bg-white/4'
                  }`}
                  style={!n.is_read ? { borderLeft: '2px solid rgba(249,115,22,0.6)' } : { borderLeft: '2px solid transparent' }}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-base mt-0.5 flex-shrink-0">
                      {TYPE_ICONS[n.type] || '🔔'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm leading-snug ${!n.is_read ? 'font-semibold text-white' : 'text-white/60'}`}>
                        {n.message || n.title}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        {n.type && (
                          <span className="text-[10px] text-white/30 capitalize">
                            {n.type.replace(/_/g, ' ')}
                          </span>
                        )}
                        <span className="text-[10px] text-white/25">{formatTime(n.created_at)}</span>
                      </div>
                    </div>
                    {!n.is_read && (
                      <div className="w-2 h-2 rounded-full bg-orange-400 flex-shrink-0 mt-1.5" />
                    )}
                  </div>
                </li>
              ))
            )}
          </ul>

          {/* Footer */}
          {items.length > 0 && (
            <div
              className="px-4 py-2.5 text-center"
              style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
            >
              <button className="text-xs text-white/30 hover:text-white/60 transition-colors">
                View all notifications
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
