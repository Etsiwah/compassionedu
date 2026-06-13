import { useState, useEffect } from 'react';
import api from '../../utils/api';
import ResponsiveTable from '../common/ResponsiveTable';

function initials(name = '') {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

const roleColors = {
  admin: 'text-purple-400 bg-purple-400/10',
  teacher: 'text-blue-400 bg-blue-400/10',
  staff: 'text-green-400 bg-green-400/10',
  student: 'text-orange-400 bg-orange-400/10',
  parent: 'text-pink-400 bg-pink-400/10',
};

export default function UserManagementTable() {
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    api.get(`/users?q=${encodeURIComponent(query)}`)
      .then(r => setUsers(r.data.users || r.data))
      .catch(() => setUsers([]))
      .finally(() => setLoading(false));
  }, [query]);

  async function handleDelete(id) {
    if (!window.confirm('Soft-delete this user?')) return;
    await api.delete(`/users/${id}`);
    setUsers(u => u.filter(x => x.id !== id));
  }

  return (
    <div className="flex flex-col gap-3">
      <input
        type="search"
        placeholder="Search by name or email…"
        value={query}
        onChange={e => setQuery(e.target.value)}
        className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-400 max-w-sm"
      />
      {loading ? (
        <p className="text-sm text-gray-400">Loading…</p>
      ) : (
        <ResponsiveTable
          headers={['User', 'Email', 'Role', 'Actions']}
          data={users}
          emptyMessage="No users found."
          renderRow={(u) => (
            <>
              <td className="px-4 py-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full flex-shrink-0 overflow-hidden bg-gradient-to-br from-gray-400 to-gray-600 flex items-center justify-center text-white text-xs font-bold">
                    {initials(u.name)}
                  </div>
                  <p className="font-semibold text-white/90">{u.name}</p>
                </div>
              </td>
              <td className="px-4 py-4 text-white/60 text-sm">{u.email}</td>
              <td className="px-4 py-4">
                <span className={`text-xs px-2 py-1 rounded-full font-semibold capitalize ${roleColors[u.role] || 'text-gray-400 bg-gray-400/10'}`}>
                  {u.role}
                </span>
              </td>
              <td className="px-4 py-4">
                <button onClick={() => handleDelete(u.id)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-red-300 hover:bg-red-500/15 transition-all"
                  style={{ border: '1px solid rgba(239,68,68,0.25)' }}>
                  🗑️ Delete
                </button>
              </td>
            </>
          )}
          renderMobileCard={(u) => (
            <div className="space-y-3">
              {/* User Info */}
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-full flex-shrink-0 overflow-hidden bg-gradient-to-br from-gray-400 to-gray-600 flex items-center justify-center text-white text-sm font-bold">
                  {initials(u.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-white/90 text-sm">{u.name}</p>
                  <p className="text-xs text-white/50 mt-0.5 truncate">{u.email}</p>
                  <div className="mt-2">
                    <span className={`text-xs px-2 py-1 rounded-full font-semibold capitalize ${roleColors[u.role] || 'text-gray-400 bg-gray-400/10'}`}>
                      {u.role}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-2 border-t border-white/5">
                <button onClick={() => handleDelete(u.id)}
                  className="w-full px-3 py-2.5 rounded-lg text-xs font-semibold text-red-300 hover:bg-red-500/15 transition-all"
                  style={{ border: '1px solid rgba(239,68,68,0.25)' }}>
                  🗑️ Delete User
                </button>
              </div>
            </div>
          )}
        />
      )}
    </div>
  );
}
