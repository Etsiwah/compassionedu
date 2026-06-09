import { useState } from 'react';
import api from '../../utils/api';
import UserManagementTable from '../../components/admin/UserManagementTable';

const ROLES = ['student', 'teacher', 'parent', 'admin'];
const EMPTY = { name: '', email: '', password: '', role: 'student' };

export default function UsersSection() {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  function set(field, value) { setForm(f => ({ ...f, [field]: value })); }

  async function handleCreate(e) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await api.post('/users', form);
      setForm(EMPTY);
      setShowForm(false);
      setRefreshKey(k => k + 1);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create user');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">User Management</h2>
        <button onClick={() => setShowForm(s => !s)}
          className="text-sm bg-orange-500 hover:bg-orange-600 text-white px-4 py-1.5 rounded-lg transition-colors">
          {showForm ? 'Cancel' : '+ New User'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-white dark:bg-gray-800 rounded-xl shadow p-4 flex flex-col gap-3 max-w-sm">
          {[
            { id: 'name', label: 'Name', type: 'text' },
            { id: 'email', label: 'Email', type: 'email' },
            { id: 'password', label: 'Password', type: 'password' },
          ].map(({ id, label, type }) => (
            <div key={id}>
              <label htmlFor={id} className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-0.5">{label}</label>
              <input id={id} type={type} required value={form[id]} onChange={e => set(id, e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 text-sm bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-400" />
            </div>
          ))}
          <div>
            <label htmlFor="role" className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-0.5">Role</label>
            <select id="role" value={form.role} onChange={e => set('role', e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 text-sm bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-400">
              {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
          <button type="submit" disabled={saving}
            className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white text-sm font-medium px-4 py-1.5 rounded-lg transition-colors">
            {saving ? 'Creating…' : 'Create User'}
          </button>
        </form>
      )}

      <UserManagementTable key={refreshKey} />
    </div>
  );
}
