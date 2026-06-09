import { useState, useEffect } from 'react';
import api from '../../utils/api';

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
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-100 dark:bg-gray-700 text-left">
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Email</th>
                <th className="px-3 py-2">Role</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr><td colSpan={4} className="px-3 py-4 text-center text-gray-400">No users found.</td></tr>
              ) : users.map(u => (
                <tr key={u.id} className="border-t border-gray-200 dark:border-gray-600">
                  <td className="px-3 py-2">{u.name}</td>
                  <td className="px-3 py-2">{u.email}</td>
                  <td className="px-3 py-2 capitalize">{u.role}</td>
                  <td className="px-3 py-2">
                    <button onClick={() => handleDelete(u.id)} className="text-xs text-red-500 hover:underline">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
