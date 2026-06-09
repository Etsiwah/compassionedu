import { useState, useEffect, useCallback } from 'react';
import api from '../../utils/api';

const STATUSES = ['present', 'absent', 'late'];

const STATUS_STYLE = {
  present: 'bg-green-500/20 text-green-300 border-green-500/40',
  absent:  'bg-red-500/20 text-red-300 border-red-500/40',
  late:    'bg-yellow-500/20 text-yellow-300 border-yellow-500/40',
};

function field(label, children) {
  return (
    <div>
      <label className="block text-xs font-medium text-white/50 mb-1.5">{label}</label>
      {children}
    </div>
  );
}

const inputCls = `w-full rounded-xl px-3 py-2.5 text-sm text-white/90 focus:outline-none
  focus:ring-2 focus:ring-orange-400/60`;
const inputStyle = { background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)' };

export default function AttendanceRecorder() {
  const [form, setForm] = useState({
    student_id: '',
    subject:    '',
    date:       new Date().toISOString().slice(0, 10),
    status:     'present',
  });
  const [students, setStudents] = useState([]);
  const [saving,  setSaving]  = useState(false);
  const [success, setSuccess] = useState('');
  const [error,   setError]   = useState('');
  const [recent,  setRecent]  = useState([]);

  /* load students list for the picker */
  useEffect(() => {
    api.get('/staff-portal/students')
      .then(r => setStudents(r.data.users || []))
      .catch(() => {});
  }, []);

  const loadRecent = useCallback(() => {
    api.get(`/attendance?limit=5`)
      .then(r => setRecent(r.data?.records || []))
      .catch(() => {});
  }, []);

  useEffect(() => { loadRecent(); }, [loadRecent]);

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(''); setSuccess('');
    setSaving(true);
    try {
      await api.post('/attendance', form);
      setSuccess('✅ Attendance recorded successfully.');
      setForm(f => ({ ...f, student_id: '', status: 'present' }));
      loadRecent();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to record attendance');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-6 max-w-lg">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">

        {/* Student select or text input */}
        {field('Student',
          students.length > 0 ? (
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
          )
        )}

        {field('Subject',
          <input
            type="text"
            value={form.subject}
            onChange={e => set('subject', e.target.value)}
            placeholder="e.g. Mathematics"
            className={inputCls}
            style={inputStyle}
          />
        )}

        {field('Date',
          <input
            type="date"
            value={form.date}
            onChange={e => set('date', e.target.value)}
            required
            className={inputCls}
            style={inputStyle}
          />
        )}

        {field('Status',
          <div className="flex gap-2">
            {STATUSES.map(s => (
              <button
                key={s}
                type="button"
                onClick={() => set('status', s)}
                className={`flex-1 py-2 rounded-xl text-xs font-semibold capitalize transition-all border ${
                  form.status === s ? STATUS_STYLE[s] : 'text-white/40 border-white/10 hover:border-white/25'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {error   && <p className="text-xs text-red-400">{error}</p>}
        {success && <p className="text-xs text-green-400">{success}</p>}

        <button
          type="submit"
          disabled={saving}
          className="py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-50 transition-all hover:opacity-90"
          style={{ background: '#f97316', boxShadow: '0 2px 14px rgba(249,115,22,0.35)' }}
        >
          {saving ? 'Recording…' : 'Record Attendance'}
        </button>
      </form>

      {/* Recent records */}
      {recent.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-white/30 uppercase tracking-widest mb-2">Recent</p>
          <div className="flex flex-col gap-1.5">
            {recent.map(r => (
              <div key={r.id} className="flex items-center justify-between px-3 py-2 rounded-xl"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div>
                  <p className="text-xs font-medium text-white/70">{r.student_name || r.student_id}</p>
                  <p className="text-[10px] text-white/30">{r.subject || 'General'} · {r.date}</p>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize border ${STATUS_STYLE[r.status] || ''}`}>
                  {r.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
