import { useState, useEffect, useCallback } from 'react';
import api from '../../utils/api';

const TERMS = ['Term 1', 'Term 2', 'Term 3', 'Semester 1', 'Semester 2', 'Final Exam'];

function gradeFromMarks(marks) {
  const m = Number(marks);
  if (m >= 80) return { grade: 'A', colour: '#22c55e' };
  if (m >= 70) return { grade: 'B', colour: '#84cc16' };
  if (m >= 60) return { grade: 'C', colour: '#f59e0b' };
  if (m >= 50) return { grade: 'D', colour: '#f97316' };
  return { grade: 'F', colour: '#ef4444' };
}

const inputCls = `w-full rounded-xl px-3 py-2.5 text-sm text-white/90 focus:outline-none focus:ring-2 focus:ring-orange-400/60`;
const inputStyle = { background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)' };

export default function ResultsEntry() {
  const [form, setForm] = useState({
    student_id: '',
    subject:    '',
    term:       '',
    marks:      '',
  });
  const [students, setStudents] = useState([]);
  const [saving,   setSaving]   = useState(false);
  const [success,  setSuccess]  = useState('');
  const [error,    setError]    = useState('');
  const [recent,   setRecent]   = useState([]);

  /* load student list */
  useEffect(() => {
    api.get('/staff-portal/students')
      .then(r => setStudents(r.data.users || []))
      .catch(() => {});
  }, []);

  const loadRecent = useCallback(() => {
    if (!form.student_id) return;
    api.get(`/results?studentId=${form.student_id}`)
      .then(r => setRecent(r.data?.results || []))
      .catch(() => {});
  }, [form.student_id]);

  useEffect(() => { loadRecent(); }, [loadRecent]);

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(''); setSuccess('');
    const marks = Number(form.marks);
    if (marks < 0 || marks > 100) { setError('Marks must be between 0 and 100.'); return; }
    setSaving(true);
    try {
      await api.post('/results', { ...form, marks });
      setSuccess('✅ Result saved successfully.');
      setForm(f => ({ ...f, marks: '' }));
      loadRecent();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save result');
    } finally {
      setSaving(false);
    }
  }

  const preview = form.marks !== '' ? gradeFromMarks(form.marks) : null;

  return (
    <div className="flex flex-col gap-6 max-w-lg">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">

        {/* Student */}
        <div>
          <label className="block text-xs font-medium text-white/50 mb-1.5">Student</label>
          {students.length > 0 ? (
            <select
              value={form.student_id}
              onChange={e => set('student_id', e.target.value)}
              required
              className={inputCls}
              style={inputStyle}
            >
              <option value="">— Select student —</option>
              {students.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              value={form.student_id}
              onChange={e => set('student_id', e.target.value)}
              placeholder="Paste student UUID"
              required
              className={inputCls}
              style={inputStyle}
            />
          )}
        </div>

        {/* Subject */}
        <div>
          <label className="block text-xs font-medium text-white/50 mb-1.5">Subject</label>
          <input
            type="text"
            value={form.subject}
            onChange={e => set('subject', e.target.value)}
            placeholder="e.g. Mathematics"
            required
            className={inputCls}
            style={inputStyle}
          />
        </div>

        {/* Term */}
        <div>
          <label className="block text-xs font-medium text-white/50 mb-1.5">Term / Semester</label>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {TERMS.map(t => (
              <button
                key={t} type="button"
                onClick={() => set('term', t)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all border ${
                  form.term === t
                    ? 'bg-orange-500/20 text-orange-300 border-orange-500/40'
                    : 'text-white/40 border-white/10 hover:border-white/25'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
          <input
            type="text"
            value={form.term}
            onChange={e => set('term', e.target.value)}
            placeholder="Or type custom term…"
            required
            className={inputCls}
            style={inputStyle}
          />
        </div>

        {/* Marks with live grade preview */}
        <div>
          <label className="block text-xs font-medium text-white/50 mb-1.5">Marks (0–100)</label>
          <div className="flex gap-3 items-center">
            <input
              type="number"
              value={form.marks}
              onChange={e => set('marks', e.target.value)}
              min={0} max={100} step={0.1}
              required
              className={`flex-1 ${inputCls}`}
              style={inputStyle}
              placeholder="e.g. 78.5"
            />
            {preview && (
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold flex-shrink-0"
                style={{ background: `${preview.colour}22`, border: `1px solid ${preview.colour}55`, color: preview.colour }}
              >
                {preview.grade}
              </div>
            )}
          </div>
        </div>

        {error   && <p className="text-xs text-red-400">{error}</p>}
        {success && <p className="text-xs text-green-400">{success}</p>}

        <button
          type="submit"
          disabled={saving}
          className="py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-50 transition-all hover:opacity-90"
          style={{ background: '#f97316', boxShadow: '0 2px 14px rgba(249,115,22,0.35)' }}
        >
          {saving ? 'Saving…' : 'Save Result'}
        </button>
      </form>

      {/* Recent results for selected student */}
      {recent.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-white/30 uppercase tracking-widest mb-2">Recent Results</p>
          <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                  {['Subject', 'Term', 'Marks', 'Grade'].map(h => (
                    <th key={h} className="text-left px-3 py-2 text-xs font-semibold text-white/30 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recent.slice(0, 8).map((r, i) => {
                  const { grade, colour } = gradeFromMarks(r.marks);
                  return (
                    <tr key={r.id} style={{ borderBottom: i < recent.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                      <td className="px-3 py-2 text-white/70">{r.subject}</td>
                      <td className="px-3 py-2 text-white/40 text-xs">{r.term}</td>
                      <td className="px-3 py-2 text-white/70 font-mono">{Number(r.marks).toFixed(1)}</td>
                      <td className="px-3 py-2">
                        <span className="text-xs font-bold" style={{ color: colour }}>{grade}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
