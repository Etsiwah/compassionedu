import { useState } from 'react';
import api from '../../utils/api';

const EMPTY = { title: '', organization: '', start_date: '', end_date: '', description: '' };

export default function ExperienceForm({ studentId, onSaved, initial = null, onCancel }) {
  const [form, setForm] = useState(initial || EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function set(field, value) {
    setForm(f => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      if (initial?.id) {
        await api.put(`/portfolio/${studentId}/experiences/${initial.id}`, form);
      } else {
        await api.post(`/portfolio/${studentId}/experiences`, form);
      }
      onSaved?.();
    } catch (err) {
      setError(err.response?.data?.error || 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 bg-white dark:bg-gray-800 rounded-xl p-4 shadow">
      <h3 className="font-semibold text-gray-700 dark:text-gray-200">{initial ? 'Edit Experience' : 'Add Experience'}</h3>
      {[
        { id: 'title', label: 'Title *', required: true },
        { id: 'organization', label: 'Organization' },
        { id: 'start_date', label: 'Start Date *', type: 'date', required: true },
        { id: 'end_date', label: 'End Date', type: 'date' },
      ].map(({ id, label, type = 'text', required }) => (
        <div key={id}>
          <label htmlFor={id} className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-0.5">{label}</label>
          <input
            id={id} type={type} required={required} value={form[id]}
            onChange={e => set(id, e.target.value)}
            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 text-sm bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
        </div>
      ))}
      <div>
        <label htmlFor="description" className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-0.5">Description</label>
        <textarea
          id="description" rows={3} value={form.description}
          onChange={e => set('description', e.target.value)}
          className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 text-sm bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-400"
        />
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={saving}
          className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white text-sm font-medium px-4 py-1.5 rounded-lg transition-colors">
          {saving ? 'Saving…' : 'Save'}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel}
            className="text-sm text-gray-500 hover:text-gray-700 px-4 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600">
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
