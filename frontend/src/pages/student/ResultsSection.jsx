import { useState, useEffect, useRef, useCallback } from 'react';
import api from '../../utils/api';
import useAuth from '../../hooks/useAuth';

const PROGRAM_STRUCTURE = [
  {
    program: 'Degree',
    years: [
      { year: 'Year 1', semesters: ['1st Semester', '2nd Semester'] },
      { year: 'Year 2', semesters: ['1st Semester', '2nd Semester'] },
      { year: 'Year 3', semesters: ['1st Semester', '2nd Semester'] },
      { year: 'Year 4', semesters: ['1st Semester', '2nd Semester'] },
    ]
  },
  {
    program: 'Diploma',
    years: [
      { year: 'Year 1', semesters: ['1st Semester', '2nd Semester'] },
      { year: 'Year 2', semesters: ['1st Semester', '2nd Semester'] },
    ]
  },
  {
    program: 'Top Up',
    years: [
      { year: 'Year 1', semesters: ['1st Semester', '2nd Semester'] },
      { year: 'Year 2', semesters: ['1st Semester', '2nd Semester'] },
    ]
  }
];

function fmt(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' });
}

function StatusBadge({ status }) {
  const map = {
    pending:  { label: '⏳ Pending',  cls: 'text-yellow-300 bg-yellow-500/10 border-yellow-500/25' },
    approved: { label: '✅ Approved', cls: 'text-green-300 bg-green-500/10 border-green-500/25' },
    rejected: { label: '❌ Rejected', cls: 'text-red-300 bg-red-500/10 border-red-500/25' },
  };
  const s = map[status] || map.pending;
  return (
    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${s.cls}`}>{s.label}</span>
  );
}

function PerfBadge({ category }) {
  if (!category) return null;
  const map = {
    Excellent: 'text-green-300 bg-green-500/10',
    'Very Good': 'text-blue-300 bg-blue-500/10',
    Good: 'text-teal-300 bg-teal-500/10',
    Average: 'text-yellow-300 bg-yellow-500/10',
    Poor: 'text-red-300 bg-red-500/10',
  };
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${map[category] || ''}`}>{category}</span>
  );
}

function InlineUpload({ program, year, semester, onUploaded }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef();

  async function handleFileChange(e) {
    const f = e.target.files[0];
    if (!f) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', f);
      fd.append('academic_level', program);
      fd.append('year_label', year);
      fd.append('period_label', semester);
      await api.post('/result-uploads', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      onUploaded();
    } catch (err) {
      alert(err.response?.data?.error || 'Upload failed.');
    } finally {
      setUploading(false);
      setFile(null);
    }
  }

  return (
    <div>
      <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={handleFileChange} />
      <button 
        onClick={() => fileRef.current?.click()}
        disabled={uploading}
        className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors border border-orange-500/30 text-orange-400 hover:bg-orange-500/10 disabled:opacity-50"
      >
        {uploading ? 'Uploading...' : '📤 Upload'}
      </button>
    </div>
  );
}

export default function ResultsSection({ studentId }) {
  const { user } = useAuth();
  const [uploads, setUploads] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadUploads = useCallback(() => {
    if (!studentId) return;
    setLoading(true);
    api.get('/result-uploads/my')
      .then(r => setUploads(r.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [studentId]);

  useEffect(() => { loadUploads(); }, [loadUploads]);

  async function handleDelete(id) {
    if (!window.confirm("Delete this result?")) return;
    try {
      await api.delete(`/result-uploads/${id}`);
      loadUploads();
    } catch (err) {
      alert(err.response?.data?.error || 'Delete failed');
    }
  }

  // Group uploads for easy lookup
  const getUpload = (program, year, semester) => {
    return uploads.find(u => u.academic_level === program && u.year_label === year && u.period_label === semester);
  };

  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-white">Academic Results</h2>
        <p className="text-sm text-white/40 mt-0.5">Upload and track your academic results by program and semester</p>
      </div>

      {loading ? (
        <p className="text-white/30 text-sm py-8 text-center">Loading...</p>
      ) : (
        <div className="flex flex-col gap-8">
          {PROGRAM_STRUCTURE.map((prog, idx) => (
            <div key={prog.program} className="rounded-2xl border border-white/10 overflow-hidden" style={{ background: 'rgba(255,255,255,0.02)' }}>
              {/* Program Header */}
              <div className="px-5 py-3 border-b border-white/10" style={{ background: 'rgba(255,255,255,0.05)' }}>
                <h3 className="text-lg font-bold text-white tracking-wide">{prog.program}</h3>
              </div>
              
              {/* Years and Semesters */}
              <div className="p-5 flex flex-col gap-6">
                {prog.years.map(y => (
                  <div key={y.year} className="flex flex-col gap-3">
                    <h4 className="text-sm font-bold text-white/60 border-b border-white/5 pb-1">{y.year}</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {y.semesters.map(sem => {
                        const existing = getUpload(prog.program, y.year, sem);
                        return (
                          <div key={sem} className="rounded-xl p-4 flex flex-col gap-2 transition-all" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-white/80">{sem}</span>
                              {existing && <StatusBadge status={existing.status} />}
                            </div>

                            {existing ? (
                              <div className="flex flex-col gap-2 mt-1">
                                {existing.performance_score != null && (
                                  <div className="flex items-center gap-2">
                                    <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
                                      <div className="h-full rounded-full" style={{
                                        width: `${existing.performance_score}%`,
                                        background: existing.performance_score >= 70 ? '#22c55e' : existing.performance_score >= 50 ? '#f97316' : '#ef4444',
                                      }} />
                                    </div>
                                    <span className="text-[10px] font-bold text-white/70">{existing.performance_score}%</span>
                                    <PerfBadge category={existing.performance_category} />
                                  </div>
                                )}
                                
                                {existing.admin_comment && (
                                  <p className="text-[10px] text-white/50 bg-white/5 p-2 rounded-lg">💬 {existing.admin_comment}</p>
                                )}
                                
                                <div className="flex items-center gap-3 pt-2">
                                  <a href={existing.file_url} target="_blank" rel="noreferrer" className="text-xs text-blue-400 hover:text-blue-300 font-semibold transition-colors">
                                    📥 View File
                                  </a>
                                  {existing.status === 'pending' && (
                                    <button onClick={() => handleDelete(existing.id)} className="text-xs text-red-400 hover:text-red-300 font-semibold transition-colors">
                                      🗑️ Delete
                                    </button>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <div className="mt-2 flex items-center justify-between">
                                <span className="text-xs text-white/30 italic">No result uploaded</span>
                                <InlineUpload program={prog.program} year={y.year} semester={sem} onUploaded={loadUploads} />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
