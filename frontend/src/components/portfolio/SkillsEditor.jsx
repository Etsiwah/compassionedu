import { useState } from 'react';
import api from '../../utils/api';

export default function SkillsEditor({ studentId, skills = [], onSaved }) {
  const [input, setInput] = useState('');
  const [list, setList] = useState(skills);
  const [saving, setSaving] = useState(false);

  function addSkill() {
    const trimmed = input.trim();
    if (!trimmed || list.includes(trimmed)) return;
    setList(l => [...l, trimmed]);
    setInput('');
  }

  function removeSkill(skill) {
    setList(l => l.filter(s => s !== skill));
  }

  async function handleSave() {
    setSaving(true);
    try {
      await api.patch(`/portfolio/${studentId}/skills`, { skills: list });
      onSaved?.();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {list.map(skill => (
          <span key={skill} className="flex items-center gap-1 bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300 text-xs px-2 py-1 rounded-full">
            {skill}
            <button onClick={() => removeSkill(skill)} aria-label={`Remove ${skill}`} className="hover:text-red-500">×</button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addSkill())}
          placeholder="Add a skill…"
          className="flex-1 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 text-sm bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-400"
        />
        <button onClick={addSkill} className="text-sm bg-gray-100 dark:bg-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600">Add</button>
      </div>
      <button onClick={handleSave} disabled={saving}
        className="self-start bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white text-sm font-medium px-4 py-1.5 rounded-lg transition-colors">
        {saving ? 'Saving…' : 'Save skills'}
      </button>
    </div>
  );
}
