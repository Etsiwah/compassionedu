import { useState, useEffect } from 'react';
import api from '../../utils/api';

const STATUS_STYLE = {
  pending:  'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
  approved: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  flagged:  'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
};

export default function ContentModerationPanel() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/admin/content')
      .then(r => setItems(r.data))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  async function moderate(id, action) {
    const { data } = await api.patch(`/admin/content/${id}`, { action });
    setItems(prev => prev.map(item => item.id === id ? { ...item, moderation_status: data.moderation_status } : item));
  }

  if (loading) return <p className="text-sm text-gray-400">Loading…</p>;
  if (!items.length) return <p className="text-sm text-gray-500">No content items to moderate.</p>;

  return (
    <div className="flex flex-col gap-3">
      {items.map(item => (
        <div key={item.id} className="bg-white dark:bg-gray-800 rounded-xl shadow p-4 flex items-start gap-4">
          {item.mime_type?.startsWith('image/') ? (
            <img src={item.url} alt={item.title || 'media'} className="w-20 h-20 object-cover rounded-lg flex-shrink-0" />
          ) : (
            <div className="w-20 h-20 flex items-center justify-center bg-gray-100 dark:bg-gray-700 rounded-lg text-3xl flex-shrink-0">🎬</div>
          )}
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm text-gray-800 dark:text-gray-100 truncate">{item.title || 'Untitled'}</p>
            <p className="text-xs text-gray-500">{item.student_name}</p>
            <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${STATUS_STYLE[item.moderation_status] || ''}`}>
              {item.moderation_status}
            </span>
          </div>
          <div className="flex flex-col gap-1 flex-shrink-0">
            <button
              onClick={() => moderate(item.id, 'approved')}
              disabled={item.moderation_status === 'approved'}
              className="text-xs bg-green-500 hover:bg-green-600 disabled:opacity-40 text-white px-3 py-1 rounded-lg transition-colors"
            >
              Approve
            </button>
            <button
              onClick={() => moderate(item.id, 'flagged')}
              disabled={item.moderation_status === 'flagged'}
              className="text-xs bg-red-500 hover:bg-red-600 disabled:opacity-40 text-white px-3 py-1 rounded-lg transition-colors"
            >
              Flag
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
