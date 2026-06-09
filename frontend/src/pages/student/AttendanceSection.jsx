import { useState, useEffect } from 'react';
import api from '../../utils/api';

function fmt(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' });
}

/* ── Progress bar ── */
function ProgressBar({ pct }) {
  const colour = pct >= 75 ? '#22c55e' : pct >= 50 ? '#f97316' : '#ef4444';
  return (
    <div>
      <div className="flex justify-between items-center mb-1.5">
        <span className="text-xs text-white/50">Attendance Rate</span>
        <span className="text-sm font-bold text-white">{pct != null ? `${pct}%` : '—'}</span>
      </div>
      <div className="h-3 rounded-full overflow-hidden" style={{ background:'rgba(255,255,255,0.1)' }}>
        <div className="h-full rounded-full transition-all duration-500" style={{ width:`${pct||0}%`, background: colour }} />
      </div>
      {pct != null && pct < 75 && (
        <p className="text-xs text-red-400 mt-1.5">⚠️ Below 75% threshold — attendance alert may be triggered</p>
      )}
    </div>
  );
}

/* ── Status badge ── */
function StatusDot({ status }) {
  const map = {
    present: { colour:'#22c55e', label:'Present' },
    absent:  { colour:'#ef4444', label:'Absent' },
    late:    { colour:'#f97316', label:'Late' },
  };
  const s = map[status] || map.absent;
  return (
    <span className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: s.colour }}>
      <span className="w-2 h-2 rounded-full" style={{ background: s.colour }} />
      {s.label}
    </span>
  );
}

/* ── Mini calendar ── */
function AttendanceCalendar({ records, month }) {
  if (!month) return null;
  const [year, mon] = month.split('-').map(Number);
  const daysInMonth = new Date(year, mon, 0).getDate();
  const firstDay    = new Date(year, mon - 1, 1).getDay();

  const recordMap = {};
  records.forEach(r => {
    const d = new Date(r.date).getDate();
    recordMap[d] = r.status;
  });

  const statusColour = { present:'rgba(34,197,94,0.3)', absent:'rgba(239,68,68,0.3)', late:'rgba(249,115,22,0.3)' };
  const days = ['Su','Mo','Tu','We','Th','Fr','Sa'];

  return (
    <div>
      <div className="grid grid-cols-7 gap-1 mb-1">
        {days.map(d => <div key={d} className="text-center text-[10px] text-white/30 font-semibold">{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: firstDay }).map((_, i) => <div key={`e${i}`} />)}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day    = i + 1;
          const status = recordMap[day];
          return (
            <div key={day}
              className="aspect-square rounded-lg flex items-center justify-center text-xs font-medium transition-all"
              style={{
                background: status ? statusColour[status] : 'rgba(255,255,255,0.04)',
                color: status ? '#fff' : 'rgba(255,255,255,0.4)',
                border: `1px solid ${status ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.06)'}`,
              }}
              title={status ? `${day}: ${status}` : `${day}`}>
              {day}
            </div>
          );
        })}
      </div>
      {/* Legend */}
      <div className="flex gap-4 mt-3 justify-center">
        {[['present','#22c55e'],['absent','#ef4444'],['late','#f97316']].map(([s,c]) => (
          <div key={s} className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded" style={{ background: `${c}4d` }} />
            <span className="text-[10px] text-white/40 capitalize">{s}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AttendanceSection({ studentId }) {
  const [month,   setMonth]   = useState(new Date().toISOString().slice(0, 7));
  const [subject, setSubject] = useState('');
  const [data,    setData]    = useState({ records: [], attendance_percentage: null });
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  useEffect(() => {
    if (!studentId) return;
    setLoading(true);
    const params = new URLSearchParams();
    if (month)   params.set('month', month);
    if (subject) params.set('subject', subject);
    api.get(`/attendance/${studentId}?${params}`)
      .then(r => { setData(r.data); setError(''); })
      .catch(e => setError(e.response?.data?.error || 'Failed to load attendance'))
      .finally(() => setLoading(false));
  }, [studentId, month, subject]);

  const { records, attendance_percentage } = data;

  // Summary counts
  const present = records.filter(r => r.status === 'present').length;
  const absent  = records.filter(r => r.status === 'absent').length;
  const late    = records.filter(r => r.status === 'late').length;
  const total   = records.length;

  return (
    <div className="flex flex-col gap-5 max-w-2xl">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-white">Attendance</h2>
        <p className="text-sm text-white/40 mt-0.5">Track your attendance records</p>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <input type="month" value={month} onChange={e => setMonth(e.target.value)}
          className="rounded-xl px-3 py-2.5 text-sm text-white/90 focus:outline-none focus:ring-2 focus:ring-orange-400/60"
          style={{ background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.12)' }} />
        <input type="text" placeholder="Filter by subject…" value={subject} onChange={e => setSubject(e.target.value)}
          className="flex-1 min-w-[140px] rounded-xl px-3 py-2.5 text-sm text-white/90 focus:outline-none focus:ring-2 focus:ring-orange-400/60"
          style={{ background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.12)' }} />
      </div>

      {error && (
        <p className="text-sm text-red-400 px-4 py-3 rounded-xl" style={{ background:'rgba(239,68,68,0.1)' }}>{error}</p>
      )}

      {loading ? (
        <p className="text-white/30 text-sm text-center py-8">Loading…</p>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { label:'Total',   value: total,   colour:'rgba(249,115,22,0.15)' },
              { label:'Present', value: present, colour:'rgba(34,197,94,0.15)'  },
              { label:'Absent',  value: absent,  colour:'rgba(239,68,68,0.15)'  },
              { label:'Late',    value: late,    colour:'rgba(234,179,8,0.15)'  },
            ].map(c => (
              <div key={c.label} className="rounded-2xl p-3 text-center"
                style={{ background: c.colour, border:'1px solid rgba(255,255,255,0.08)' }}>
                <p className="text-xl font-bold text-white">{c.value}</p>
                <p className="text-xs text-white/50">{c.label}</p>
              </div>
            ))}
          </div>

          {/* Progress bar */}
          <div className="rounded-2xl p-5"
            style={{ background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.09)' }}>
            <ProgressBar pct={attendance_percentage != null ? Number(attendance_percentage) : null} />
          </div>

          {/* Calendar */}
          <div className="rounded-2xl p-5"
            style={{ background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.09)' }}>
            <p className="text-xs font-bold text-white/40 uppercase tracking-wide mb-4">
              {new Date(month + '-01').toLocaleDateString('en-GB', { month:'long', year:'numeric' })}
            </p>
            <AttendanceCalendar records={records} month={month} />
          </div>

          {/* Records list */}
          {records.length > 0 && (
            <div className="rounded-2xl overflow-hidden"
              style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.07)' }}>
              <div className="px-4 py-3" style={{ borderBottom:'1px solid rgba(255,255,255,0.07)' }}>
                <p className="text-xs font-bold text-white/40 uppercase tracking-wide">Recent Records</p>
              </div>
              <div className="divide-y" style={{ '--tw-divide-opacity':1 }}>
                {records.slice(0, 10).map(r => (
                  <div key={r.id} className="flex items-center justify-between px-4 py-3"
                    style={{ borderBottom:'1px solid rgba(255,255,255,0.04)' }}>
                    <div>
                      <p className="text-sm text-white/80">{fmt(r.date)}</p>
                      {r.subject && <p className="text-xs text-white/40">{r.subject}{r.period ? ` · ${r.period}` : ''}</p>}
                    </div>
                    <StatusDot status={r.status} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {records.length === 0 && (
            <div className="rounded-2xl p-8 text-center"
              style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.07)' }}>
              <div className="text-3xl mb-2">📅</div>
              <p className="text-white/40 text-sm">No attendance records for this period.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
