import { useState, useEffect, useCallback } from 'react';
import api from '../../utils/api';

function fmt(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' });
}

function initials(name = '') {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

/* ── Student portfolio modal ── */
function PortfolioModal({ student, onClose }) {
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeLevel, setActiveLevel] = useState(null);

  useEffect(() => {
    api.get(`/portfolio-level/${student.id}/full`)
      .then(r => {
        setData(r.data);
        const levels = Object.keys(r.data.levels || {});
        setActiveLevel(r.data.current_level || levels[0] || null);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [student.id]);

  function exportPortfolio() {
    if (!data) return;
    const lines = [
      `CompassionEdu — Student Portfolio`,
      `Student: ${student.name} (${student.email})`,
      `Current Level: ${data.current_level || 'Not set'}`,
      `Generated: ${new Date().toLocaleString()}`,
      '',
    ];

    Object.entries(data.levels || {}).forEach(([level, levelData]) => {
      lines.push(`\n=== ${level} ===`);
      if (levelData.cvs?.length) {
        lines.push(`CVs: ${levelData.cvs.map(c => `${c.cv_category} (${c.file_name})`).join(', ')}`);
      }
      if (levelData.skills?.length) {
        lines.push(`Skills: ${levelData.skills.map(s => s.skill_name).join(', ')}`);
      }
      if (levelData.experiences?.length) {
        levelData.experiences.forEach(e => lines.push(`Experience: ${e.title} @ ${e.organization || 'N/A'} (${fmt(e.start_date)})`));
      }
      if (levelData.projects?.length) {
        levelData.projects.forEach(p => lines.push(`Project: ${p.title}${p.description ? ` — ${p.description}` : ''}`));
      }
    });

    const blob = new Blob([lines.join('\n')], { type:'text/plain' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `${student.name.replace(/\s+/g,'_')}_portfolio.txt`; a.click();
    URL.revokeObjectURL(url);
  }

  const levelData = activeLevel && data?.levels?.[activeLevel];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background:'rgba(0,0,0,0.7)', backdropFilter:'blur(4px)' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl"
        style={{ background:'rgba(15,20,40,0.97)', border:'1px solid rgba(255,255,255,0.12)', boxShadow:'0 24px 80px rgba(0,0,0,0.6)', animation:'modalIn 0.2s ease-out' }}>
        <style>{`@keyframes modalIn{from{opacity:0;transform:scale(.95)}to{opacity:1;transform:scale(1)}}`}</style>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 sticky top-0"
          style={{ borderBottom:'1px solid rgba(255,255,255,0.08)', background:'rgba(15,20,40,0.97)' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-bold text-sm">
              {initials(student.name)}
            </div>
            <div>
              <p className="text-sm font-bold text-white">{student.name}</p>
              <p className="text-xs text-white/40">{student.email}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={exportPortfolio}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold text-blue-300 hover:bg-blue-500/15 transition-all"
              style={{ border:'1px solid rgba(59,130,246,0.25)' }}>
              📥 Export
            </button>
            <button onClick={onClose} className="text-white/40 hover:text-white/80 text-xl px-2">×</button>
          </div>
        </div>

        {loading ? (
          <div className="py-12 text-center text-white/30">Loading portfolio…</div>
        ) : !data || Object.keys(data.levels || {}).length === 0 ? (
          <div className="py-12 text-center">
            <div className="text-3xl mb-2">🗂️</div>
            <p className="text-white/40 text-sm">No portfolio data yet.</p>
          </div>
        ) : (
          <div className="p-5">
            {/* Current level badge */}
            {data.current_level && (
              <div className="mb-4 flex items-center gap-2">
                <span className="text-xs text-white/40">Current Level:</span>
                <span className="text-xs font-bold px-3 py-1 rounded-full text-orange-300"
                  style={{ background:'rgba(249,115,22,0.12)', border:'1px solid rgba(249,115,22,0.25)' }}>
                  {data.current_level}
                </span>
              </div>
            )}

            {/* Level tabs */}
            <div className="flex flex-wrap gap-1.5 mb-5">
              {Object.keys(data.levels).map(level => (
                <button key={level} onClick={() => setActiveLevel(level)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    activeLevel === level
                      ? 'bg-orange-500 text-white'
                      : 'text-white/50 hover:text-white/80'
                  }`}
                  style={{ border:`1px solid ${activeLevel===level ? 'transparent' : 'rgba(255,255,255,0.1)'}` }}>
                  {level}
                </button>
              ))}
            </div>

            {/* Level content */}
            {levelData && (
              <div className="flex flex-col gap-4">
                {/* CVs */}
                {levelData.cvs?.length > 0 && (
                  <div className="rounded-xl p-4" style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.07)' }}>
                    <p className="text-xs font-bold text-white/40 uppercase tracking-wide mb-3">📄 CVs</p>
                    {levelData.cvs.map(cv => (
                      <div key={cv.id} className="flex items-center justify-between py-2">
                        <div>
                          <p className="text-sm text-white/80">{cv.file_name}</p>
                          <p className="text-xs text-white/40">{cv.cv_category} · {fmt(cv.uploaded_at)}</p>
                        </div>
                        <a href={cv.file_url} target="_blank" rel="noreferrer"
                          className="text-xs text-blue-400 hover:text-blue-300 font-semibold">📥 Download</a>
                      </div>
                    ))}
                  </div>
                )}

                {/* Skills */}
                {levelData.skills?.length > 0 && (
                  <div className="rounded-xl p-4" style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.07)' }}>
                    <p className="text-xs font-bold text-white/40 uppercase tracking-wide mb-3">⚡ Skills</p>
                    <div className="flex flex-wrap gap-2">
                      {levelData.skills.map(s => (
                        <span key={s.id} className="text-xs px-2.5 py-1 rounded-full text-orange-300"
                          style={{ background:'rgba(249,115,22,0.1)', border:'1px solid rgba(249,115,22,0.2)' }}>
                          {s.skill_name}{s.level_achieved ? ` · ${s.level_achieved}` : ''}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Experiences */}
                {levelData.experiences?.length > 0 && (
                  <div className="rounded-xl p-4" style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.07)' }}>
                    <p className="text-xs font-bold text-white/40 uppercase tracking-wide mb-3">💼 Experiences</p>
                    {levelData.experiences.map(exp => (
                      <div key={exp.id} className="py-2" style={{ borderBottom:'1px solid rgba(255,255,255,0.05)' }}>
                        <p className="text-sm font-semibold text-white/80">{exp.title}</p>
                        {exp.organization && <p className="text-xs text-orange-300">{exp.organization}</p>}
                        <p className="text-xs text-white/40">{fmt(exp.start_date)}{exp.end_date ? ` – ${fmt(exp.end_date)}` : ''}</p>
                        {exp.description && <p className="text-xs text-white/50 mt-1">{exp.description}</p>}
                      </div>
                    ))}
                  </div>
                )}

                {/* Projects */}
                {levelData.projects?.length > 0 && (
                  <div className="rounded-xl p-4" style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.07)' }}>
                    <p className="text-xs font-bold text-white/40 uppercase tracking-wide mb-3">🗂️ Projects</p>
                    <div className="grid grid-cols-2 gap-3">
                      {levelData.projects.map(p => (
                        <div key={p.id} className="rounded-xl overflow-hidden"
                          style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.07)' }}>
                          {p.file_url && p.mime_type?.startsWith('image/') && (
                            <img src={p.file_url} alt={p.title} className="w-full h-24 object-cover" />
                          )}
                          <div className="p-2.5">
                            <p className="text-xs font-semibold text-white/80">{p.title}</p>
                            {p.description && <p className="text-[10px] text-white/40 mt-0.5 line-clamp-2">{p.description}</p>}
                            {p.file_url && (
                              <a href={p.file_url} target="_blank" rel="noreferrer"
                                className="text-[10px] text-blue-400 hover:text-blue-300 mt-1 inline-block">📥 Download</a>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Main admin portfolio viewer ── */
export default function PortfolioViewerSection() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [selected, setSelected] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set('q', search);
    api.get(`/profile/search/students?${params}`)
      .then(r => setStudents(r.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [search]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-bold text-white">Student Portfolios</h2>
        <p className="text-sm text-white/40 mt-0.5">View and export student portfolio data</p>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 text-sm">🔍</span>
        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search students by name, email, ID…"
          className="w-full pl-8 pr-3 py-2.5 rounded-xl text-sm text-white/90 focus:outline-none focus:ring-2 focus:ring-orange-400/60"
          style={{ background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.1)' }} />
      </div>

      {/* Student grid */}
      {loading ? (
        <div className="py-12 text-center text-white/30 text-sm">Loading…</div>
      ) : students.length === 0 ? (
        <div className="py-12 text-center">
          <div className="text-3xl mb-2">🗂️</div>
          <p className="text-white/30 text-sm">No students found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {students.map(s => (
            <button key={s.id} onClick={() => setSelected(s)}
              className="rounded-2xl p-4 text-left transition-all hover:scale-[1.02]"
              style={{ background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.09)' }}>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
                  {s.photo_url
                    ? <img src={s.photo_url} alt={s.name} className="w-full h-full object-cover" />
                    : <div className="w-full h-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white text-xs font-bold">{initials(s.name)}</div>
                  }
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white/90 truncate">{s.name}</p>
                  <p className="text-xs text-white/40 truncate">{s.email}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {s.school_name && <span className="text-[10px] text-white/40 px-2 py-0.5 rounded-full" style={{ background:'rgba(255,255,255,0.05)' }}>{s.school_name}</span>}
                {s.level && <span className="text-[10px] text-orange-300 px-2 py-0.5 rounded-full" style={{ background:'rgba(249,115,22,0.1)' }}>{s.level}</span>}
                {s.program && <span className="text-[10px] text-white/40 px-2 py-0.5 rounded-full" style={{ background:'rgba(255,255,255,0.05)' }}>{s.program}</span>}
              </div>
              <p className="text-xs text-blue-400 mt-3 font-semibold">View Portfolio →</p>
            </button>
          ))}
        </div>
      )}

      {selected && (
        <PortfolioModal student={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}
