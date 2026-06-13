import { useState, useEffect } from 'react';
import api from '../../utils/api';

function fmt(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' });
}

const LEVEL_ORDER = [
  'JHS 1','JHS 2','JHS 3',
  'SHS 1','SHS 2','SHS 3',
  'Diploma 1','Diploma 2',
  'Degree 1','Degree 2','Degree 3','Degree 4',
];

export default function StudentPortfolioModal({ student, onClose }) {
  const [portfolio, setPortfolio] = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [activeLevel, setActiveLevel] = useState(null);

  useEffect(() => {
    api.get(`/portfolio-level/${student.id}/full`)
      .then(r => {
        setPortfolio(r.data);
        const levels = Object.keys(r.data.levels || {});
        setActiveLevel(r.data.current_level || levels[0] || null);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [student.id]);

  function exportPortfolio() {
    if (!portfolio) return;
    const lines = [
      `CompassionEdu — Student Portfolio`,
      `Student: ${student.name}`,
      `Email: ${student.email}`,
      `Current Level: ${portfolio.current_level || '—'}`,
      `Generated: ${new Date().toLocaleString()}`,
      ``,
    ];

    const orderedLevels = LEVEL_ORDER.filter(l => portfolio.levels[l]);
    for (const level of orderedLevels) {
      const data = portfolio.levels[level];
      lines.push(`═══ ${level} ═══`);
      if (data.cvs?.length) {
        lines.push(`CVs:`);
        data.cvs.forEach(cv => lines.push(`  - ${cv.cv_category}: ${cv.file_name} (${fmt(cv.uploaded_at)})`));
      }
      if (data.skills?.length) {
        lines.push(`Skills: ${data.skills.map(s => s.skill_name).join(', ')}`);
      }
      if (data.experiences?.length) {
        lines.push(`Experiences:`);
        data.experiences.forEach(e => lines.push(`  - ${e.title}${e.organization ? ` @ ${e.organization}` : ''} (${fmt(e.start_date)})`));
      }
      if (data.projects?.length) {
        lines.push(`Projects:`);
        data.projects.forEach(p => lines.push(`  - ${p.title}${p.description ? `: ${p.description}` : ''}`));
      }
      lines.push('');
    }

    const blob = new Blob([lines.join('\n')], { type:'text/plain' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `${(student.name||'student').replace(/\s+/g,'_')}_portfolio.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const levelData = activeLevel && portfolio?.levels?.[activeLevel];
  const populatedLevels = LEVEL_ORDER.filter(l => portfolio?.levels?.[l]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background:'rgba(0,0,0,0.75)', backdropFilter:'blur(4px)' }}
      onClick={e => e.target===e.currentTarget && onClose()}>
      <div className="w-full max-w-3xl max-h-[90vh] flex flex-col rounded-2xl overflow-hidden"
        style={{ background:'rgba(15,20,40,0.97)', border:'1px solid rgba(255,255,255,0.12)', boxShadow:'0 24px 80px rgba(0,0,0,0.6)', animation:'modalIn 0.2s ease-out' }}>
        <style>{`@keyframes modalIn{from{opacity:0;transform:scale(.95)}to{opacity:1;transform:scale(1)}}`}</style>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 flex-shrink-0"
          style={{ borderBottom:'1px solid rgba(255,255,255,0.08)' }}>
          <div>
            <h3 className="text-base font-bold text-white">{student.name}'s Portfolio</h3>
            <p className="text-xs text-white/40">{student.email}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={exportPortfolio}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold text-blue-300 hover:bg-blue-500/15 transition-all"
              style={{ border:'1px solid rgba(59,130,246,0.25)' }}>
              📥 Export
            </button>
            <button onClick={onClose} className="text-white/40 hover:text-white/80 text-xl px-2">×</button>
          </div>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center text-white/30">Loading portfolio…</div>
        ) : !portfolio || populatedLevels.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-white/30 text-sm">No portfolio data yet.</div>
        ) : (
          <div className="flex flex-1 overflow-hidden">
            {/* Level sidebar */}
            <div className="w-40 flex-shrink-0 p-3 overflow-y-auto" style={{ borderRight:'1px solid rgba(255,255,255,0.07)' }}>
              <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-2 px-2">Levels</p>
              {populatedLevels.map(l => (
                <button key={l} onClick={() => setActiveLevel(l)}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold mb-1 transition-all ${
                    activeLevel===l ? 'bg-orange-500/20 text-orange-300' : 'text-white/50 hover:text-white/80 hover:bg-white/5'
                  }`}>
                  {l}
                  {portfolio.current_level === l && (
                    <span className="ml-1 text-[8px] text-orange-400">●</span>
                  )}
                </button>
              ))}
            </div>

            {/* Level content */}
            <div className="flex-1 overflow-y-auto p-5">
              {activeLevel && levelData ? (
                <div className="flex flex-col gap-5">
                  <div className="flex items-center gap-2">
                    <h4 className="text-base font-bold text-white">{activeLevel}</h4>
                    {portfolio.current_level === activeLevel && (
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full text-orange-300" style={{ background:'rgba(249,115,22,0.15)', border:'1px solid rgba(249,115,22,0.3)' }}>
                        Current Level
                      </span>
                    )}
                  </div>

                  {/* CVs */}
                  {levelData.cvs?.length > 0 && (
                    <div>
                      <p className="text-xs font-bold text-white/40 uppercase tracking-wide mb-2">📄 CVs</p>
                      <div className="flex flex-col gap-2">
                        {levelData.cvs.map(cv => (
                          <div key={cv.id} className="flex items-center justify-between px-3 py-2.5 rounded-xl"
                            style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.07)' }}>
                            <div>
                              <p className="text-sm text-white/80 font-medium">{cv.file_name}</p>
                              <p className="text-xs text-white/40">{cv.cv_category} · {fmt(cv.uploaded_at)}</p>
                            </div>
                            <a href={cv.file_url} target="_blank" rel="noreferrer"
                              className="text-xs text-blue-400 hover:text-blue-300 font-semibold">📥</a>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Skills */}
                  {levelData.skills?.length > 0 && (
                    <div>
                      <p className="text-xs font-bold text-white/40 uppercase tracking-wide mb-2">⚡ Skills</p>
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
                    <div>
                      <p className="text-xs font-bold text-white/40 uppercase tracking-wide mb-2">💼 Experiences</p>
                      <div className="flex flex-col gap-2">
                        {levelData.experiences.map(exp => (
                          <div key={exp.id} className="px-3 py-2.5 rounded-xl"
                            style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.07)' }}>
                            <p className="text-sm font-semibold text-white/90">{exp.title}</p>
                            {exp.organization && <p className="text-xs text-orange-300">{exp.organization}</p>}
                            <p className="text-xs text-white/40">{fmt(exp.start_date)}{exp.end_date ? ` – ${fmt(exp.end_date)}` : ''}</p>
                            {exp.description && <p className="text-xs text-white/50 mt-1">{exp.description}</p>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Projects */}
                  {levelData.projects?.length > 0 && (
                    <div>
                      <p className="text-xs font-bold text-white/40 uppercase tracking-wide mb-2">🗂️ Projects</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {levelData.projects.map(p => (
                          <div key={p.id} className="rounded-xl overflow-hidden"
                            style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.07)' }}>
                            {p.file_url && p.mime_type?.startsWith('image/') && (
                              <img src={p.file_url} alt={p.title} className="w-full h-24 object-cover" />
                            )}
                            <div className="p-3">
                              <p className="text-sm font-semibold text-white/90">{p.title}</p>
                              {p.description && <p className="text-xs text-white/50 mt-0.5">{p.description}</p>}
                              {p.tags?.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1.5">
                                  {p.tags.map(t => <span key={t} className="text-[10px] px-1.5 py-0.5 rounded-full text-white/40" style={{ background:'rgba(255,255,255,0.06)' }}>{t}</span>)}
                                </div>
                              )}
                              {p.file_url && (
                                <a href={p.file_url} target="_blank" rel="noreferrer" className="text-xs text-blue-400 hover:text-blue-300 mt-1 inline-block">📥 Download</a>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {!levelData.cvs?.length && !levelData.skills?.length && !levelData.experiences?.length && !levelData.projects?.length && (
                    <p className="text-white/30 text-sm">No data for this level.</p>
                  )}
                </div>
              ) : (
                <p className="text-white/30 text-sm">Select a level to view portfolio data.</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
