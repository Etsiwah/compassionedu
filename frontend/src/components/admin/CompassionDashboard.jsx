import { useState, useEffect } from 'react';
import api from '../../utils/api';

export default function CompassionDashboard() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    api.get('/admin/dashboard')
      .then(r => setStudents(r.data || []))
      .catch(() => setStudents([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="py-6 text-center">
        <p className="text-sm text-white/30">Loading at-risk students…</p>
      </div>
    );
  }

  if (students.length === 0) {
    return (
      <div className="py-6 text-center">
        <div className="text-2xl mb-2">✅</div>
        <p className="text-sm text-white/50">All students are on track. No interventions needed.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs text-white/40 mb-1">
        {students.length} student{students.length > 1 ? 's' : ''} need{students.length === 1 ? 's' : ''} attention
      </p>
      <div className="overflow-x-auto rounded-xl" style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              {['Student', 'Email', 'Attendance', 'Overdue Fees'].map(h => (
                <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-white/35 uppercase tracking-wide whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {students.map((s, i) => {
              const att  = s.attendance_percentage != null ? Number(s.attendance_percentage).toFixed(1) : null;
              const fees = Number(s.overdue_fees_count || 0);
              return (
                <tr
                  key={s.id}
                  style={{ borderBottom: i < students.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}
                  className="hover:bg-white/[0.02] transition-colors"
                >
                  <td className="px-4 py-3 font-semibold text-white/80">{s.name}</td>
                  <td className="px-4 py-3 text-white/40 text-xs">{s.email}</td>
                  <td className="px-4 py-3">
                    {att != null ? (
                      <span
                        className="text-xs font-bold px-2 py-0.5 rounded-full"
                        style={{
                          background: Number(att) < 75 ? 'rgba(239,68,68,0.15)' : 'rgba(34,197,94,0.15)',
                          color:      Number(att) < 75 ? '#fca5a5' : '#86efac',
                          border:     `1px solid ${Number(att) < 75 ? 'rgba(239,68,68,0.3)' : 'rgba(34,197,94,0.3)'}`,
                        }}
                      >
                        {att}%
                      </span>
                    ) : (
                      <span className="text-xs text-white/30">N/A</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className="text-xs font-bold px-2 py-0.5 rounded-full"
                      style={{
                        background: fees > 0 ? 'rgba(239,68,68,0.15)' : 'rgba(34,197,94,0.15)',
                        color:      fees > 0 ? '#fca5a5' : '#86efac',
                        border:     `1px solid ${fees > 0 ? 'rgba(239,68,68,0.3)' : 'rgba(34,197,94,0.3)'}`,
                      }}
                    >
                      {fees > 0 ? `${fees} overdue` : 'Clear'}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
