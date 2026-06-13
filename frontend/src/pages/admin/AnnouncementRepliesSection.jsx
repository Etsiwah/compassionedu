import { useState, useEffect } from 'react';
import api from '../../utils/api';

function timeAgo(d) {
  if (!d) return '';
  const diff = Math.floor((Date.now() - new Date(d)) / 1000);
  if (diff < 60)    return 'just now';
  if (diff < 3600)  return `${Math.floor(diff/60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff/3600)}h ago`;
  return new Date(d).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' });
}

export default function AnnouncementRepliesSection() {
  const [replies, setReplies] = useState([]);
  const [filter, setFilter] = useState({ role: '', announcement_id: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadReplies();
  }, [filter]);

  async function loadReplies() {
    setLoading(true);
    setError('');
    
    try {
      const params = new URLSearchParams();
      if (filter.role) params.append('user_role', filter.role);
      if (filter.announcement_id) params.append('announcement_id', filter.announcement_id);
      
      const { data } = await api.get(`/announcements/replies?${params}`);
      setReplies(data || []);
    } catch (err) {
      console.error('Failed to load replies', err);
      setError(err.response?.data?.error || 'Failed to load replies');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-white">Announcement Replies</h2>
        <p className="text-sm text-white/40 mt-0.5">
          {replies.length} repl{replies.length !== 1 ? 'ies' : 'y'}
        </p>
      </div>

      {/* Filters */}
      <div className="rounded-xl p-4 flex flex-wrap gap-3"
        style={{ background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.09)' }}>
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs font-medium text-white/50 mb-1.5">Filter by Role</label>
          <select
            value={filter.role}
            onChange={e => setFilter({...filter, role: e.target.value})}
            className="w-full px-3 py-2 rounded-lg text-sm text-white/90 focus:outline-none focus:ring-2 focus:ring-orange-400/60"
            style={{ background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.12)' }}>
            <option value="">All Roles</option>
            <option value="staff">Staff</option>
            <option value="student">Students</option>
          </select>
        </div>

        {filter.role || filter.announcement_id ? (
          <button
            onClick={() => setFilter({ role: '', announcement_id: '' })}
            className="self-end px-4 py-2 rounded-lg text-sm font-semibold text-white/70 border border-white/20 hover:border-white/30 transition-all">
            Clear Filters
          </button>
        ) : null}
      </div>

      {/* Error Message */}
      {error && (
        <div className="rounded-xl p-3 text-sm text-red-300"
          style={{ background:'rgba(239,68,68,0.15)', border:'1px solid rgba(239,68,68,0.3)' }}>
          {error}
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="rounded-2xl p-8 text-center"
          style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.07)' }}>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-3"></div>
          <p className="text-white/40 text-sm">Loading replies...</p>
        </div>
      ) : replies.length === 0 ? (
        /* Empty State */
        <div className="rounded-2xl p-8 text-center"
          style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.07)' }}>
          <div className="text-3xl mb-2">💬</div>
          <p className="text-white/40 text-sm">No replies yet.</p>
          {(filter.role || filter.announcement_id) && (
            <button
              onClick={() => setFilter({ role: '', announcement_id: '' })}
              className="mt-3 text-orange-400 hover:text-orange-300 text-sm font-medium">
              Clear filters
            </button>
          )}
        </div>
      ) : (
        /* Replies List */
        <div className="flex flex-col gap-3">
          {replies.map(reply => (
            <div key={reply.id} className="rounded-xl p-5"
              style={{ background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.09)' }}>
              {/* Reply Header */}
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-semibold text-white">
                      {reply.user_name}
                    </span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize"
                      style={{ 
                        background: reply.user_role === 'staff' ? 'rgba(59,130,246,0.15)' : 'rgba(34,197,94,0.15)',
                        border: reply.user_role === 'staff' ? '1px solid rgba(59,130,246,0.3)' : '1px solid rgba(34,197,94,0.3)',
                        color: reply.user_role === 'staff' ? '#93c5fd' : '#86efac'
                      }}>
                      {reply.user_role}
                    </span>
                  </div>
                  <p className="text-xs text-white/40">{reply.user_email}</p>
                </div>
                <span className="text-[10px] text-white/30 flex-shrink-0">
                  {timeAgo(reply.created_at)}
                </span>
              </div>

              {/* Announcement Reference */}
              <div className="mb-2 pb-2 border-b border-white/5">
                <p className="text-xs text-white/40">
                  Reply to: <span className="text-white/60 font-medium">{reply.announcement_title}</span>
                </p>
              </div>

              {/* Reply Message */}
              <div className="rounded-lg p-3"
                style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.05)' }}>
                <p className="text-sm text-white/80 leading-relaxed whitespace-pre-wrap">
                  {reply.reply_message}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination Note */}
      {replies.length >= 100 && (
        <p className="text-xs text-white/40 text-center">
          Showing latest 100 replies. Use filters to refine results.
        </p>
      )}
    </div>
  );
}
