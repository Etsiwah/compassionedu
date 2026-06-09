import { useState, useEffect, useRef, useCallback } from 'react';
import api from '../../utils/api';
import useAuth from '../../hooks/useAuth';

/* ── Level structure ── */
const LEVEL_GROUPS = {
  JHS:     ['JHS 1','JHS 2','JHS 3'],
  SHS:     ['SHS 1','SHS 2','SHS 3'],
  Diploma: ['Diploma 1','Diploma 2'],
  Degree:  ['Degree 1','Degree 2','Degree 3','Degree 4'],
};
const ALL_LEVELS = Object.values(LEVEL_GROUPS).flat();
const CV_CATEGORIES = ['Academic CV','Professional CV','Internship CV'];

function fmt(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' });
}

/* ── Shared input style ── */
const inputCls = 'w-full rounded-xl px-3 py-2.5 text-sm text-white/90 focus:outline-none focus:ring-2 focus:ring-orange-400/60';
const inputStyle = { background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.12)' };

/* ── Glass section ── */
function Section({ title, icon, children, action }) {
  return (
    <div className="rounded-2xl overflow-hidden" style={{ background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.09)' }}>
      <div className="flex items-center justify-between px-5 py-3.5" style={{ borderBottom:'1px solid rgba(255,255,255,0.07)', background:'rgba(255,255,255,0.03)' }}>
        <div className="flex items-center gap-2">
          <span>{icon}</span>
          <h3 className="text-xs font-bold text-white/60 uppercase tracking-widest">{title}</h3>
        </div>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

/* ── Level selector ── */
function LevelSelector({ currentLevel, onSelect }) {
  return (
    <div className="rounded-2xl p-5" style={{ background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.09)' }}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-white/80">🎓 Academic Profile</h3>
        {currentLevel && (
          <span className="text-xs font-bold px-3 py-1 rounded-full text-orange-300" style={{ background:'rgba(249,115,22,0.15)', border:'1px solid rgba(249,115,22,0.3)' }}>
            Current: {currentLevel}
          </span>
        )}
      </div>
      <div className="flex flex-col gap-3">
        {Object.entries(LEVEL_GROUPS).map(([group, levels]) => (
          <div key={group}>
            <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-2">{group}</p>
            <div className="flex flex-wrap gap-2">
              {levels.map(l => (
                <button key={l} onClick={() => onSelect(l)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    currentLevel === l
                      ? 'bg-orange-500 text-white shadow'
                      : 'text-white/50 hover:text-white/80 hover:bg-white/8'
                  }`}
                  style={{ border:`1px solid ${currentLevel===l ? 'transparent' : 'rgba(255,255,255,0.1)'}` }}>
                  {l}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── CV Section ── */
function CVSection({ studentId, level, cvs, onRefresh }) {
  const [category, setCategory] = useState('Academic CV');
  const [uploading, setUploading] = useState(false);
  const [error, setError]         = useState('');
  const fileRef = useRef();

  async function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    const ok = ['application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!ok.includes(file.type)) { setError('Only PDF or DOCX allowed.'); return; }
    if (file.size > 50*1024*1024) { setError('Max 50 MB.'); return; }
    setError(''); setUploading(true);
    try {
      const fd = new FormData();
      fd.append('cv', file);
      fd.append('academic_level', level);
      fd.append('cv_category', category);
      await api.post(`/portfolio-level/${studentId}/cv`, fd, { headers:{'Content-Type':'multipart/form-data'} });
      onRefresh();
    } catch (err) { setError(err.response?.data?.error || 'Upload failed.'); }
    finally { setUploading(false); if (fileRef.current) fileRef.current.value=''; }
  }

  return (
    <Section title="CV" icon="📄"
      action={
        <div className="flex items-center gap-2">
          <select value={category} onChange={e => setCategory(e.target.value)}
            className="rounded-lg px-2 py-1 text-xs text-white/80 focus:outline-none"
            style={{ background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.12)' }}>
            {CV_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <button onClick={() => fileRef.current?.click()} disabled={uploading}
            className="text-xs font-semibold text-orange-300 hover:text-orange-200 transition-colors disabled:opacity-50">
            {uploading ? 'Uploading…' : '+ Upload'}
          </button>
          <input ref={fileRef} type="file" accept=".pdf,.docx" className="hidden" onChange={handleFile} />
        </div>
      }>
      {error && <p className="text-xs text-red-400 mb-3">{error}</p>}
      {cvs.length === 0 ? (
        <p className="text-sm text-white/30">No CV uploaded for {level} yet.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {cvs.map(cv => (
            <div key={cv.id} className="flex items-center justify-between px-3 py-2.5 rounded-xl"
              style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.07)' }}>
              <div>
                <p className="text-sm font-medium text-white/80">{cv.file_name}</p>
                <p className="text-xs text-white/40">{cv.cv_category} · {fmt(cv.uploaded_at)}</p>
              </div>
              <a href={cv.file_url} target="_blank" rel="noreferrer"
                className="text-xs text-blue-400 hover:text-blue-300 font-semibold">📥 Download</a>
            </div>
          ))}
        </div>
      )}
    </Section>
  );
}

/* ── Skills Section ── */
function SkillsSection({ studentId, level, skills, onRefresh }) {
  const [skillName, setSkillName]     = useState('');
  const [levelAchieved, setLevelAchieved] = useState('');
  const [saving, setSaving]           = useState(false);

  async function handleAdd(e) {
    e.preventDefault();
    if (!skillName.trim()) return;
    setSaving(true);
    try {
      await api.post(`/portfolio-level/${studentId}/skills`, {
        academic_level: level, skill_name: skillName.trim(), level_achieved: levelAchieved || null,
      });
      setSkillName(''); setLevelAchieved(''); onRefresh();
    } catch {} finally { setSaving(false); }
  }

  async function handleDelete(skillId) {
    try { await api.delete(`/portfolio-level/${studentId}/skills/${skillId}`); onRefresh(); } catch {}
  }

  return (
    <Section title="Skills" icon="⚡">
      <form onSubmit={handleAdd} className="flex gap-2 mb-4 flex-wrap">
        <input value={skillName} onChange={e => setSkillName(e.target.value)} placeholder="Skill name…"
          className="flex-1 min-w-[120px] rounded-xl px-3 py-2 text-sm text-white/90 focus:outline-none focus:ring-1 focus:ring-orange-400/60"
          style={{ background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.12)' }} />
        <input value={levelAchieved} onChange={e => setLevelAchieved(e.target.value)} placeholder="Level (optional)"
          className="w-32 rounded-xl px-3 py-2 text-sm text-white/90 focus:outline-none focus:ring-1 focus:ring-orange-400/60"
          style={{ background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.12)' }} />
        <button type="submit" disabled={saving}
          className="px-4 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
          style={{ background:'#f97316' }}>
          {saving ? '…' : 'Add'}
        </button>
      </form>
      {skills.length === 0 ? (
        <p className="text-sm text-white/30">No skills added for {level} yet.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {skills.map(s => (
            <div key={s.id} className="flex items-center gap-2 px-3 py-1.5 rounded-full"
              style={{ background:'rgba(249,115,22,0.12)', border:'1px solid rgba(249,115,22,0.25)' }}>
              <span className="text-xs font-semibold text-orange-300">{s.skill_name}</span>
              {s.level_achieved && <span className="text-[10px] text-white/40">· {s.level_achieved}</span>}
              <button onClick={() => handleDelete(s.id)} className="text-[10px] text-white/30 hover:text-red-400 ml-1">×</button>
            </div>
          ))}
        </div>
      )}
    </Section>
  );
}

/* ── Experiences Section ── */
function ExperiencesSection({ studentId, level, experiences, onRefresh }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title:'', organization:'', start_date:'', end_date:'', description:'' });
  const [saving, setSaving] = useState(false);

  function set(k,v) { setForm(f => ({...f,[k]:v})); }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post(`/portfolio-level/${studentId}/experiences`, { ...form, academic_level: level });
      setForm({ title:'', organization:'', start_date:'', end_date:'', description:'' });
      setShowForm(false); onRefresh();
    } catch {} finally { setSaving(false); }
  }

  async function handleDelete(expId) {
    try { await api.delete(`/portfolio-level/${studentId}/experiences/${expId}`); onRefresh(); } catch {}
  }

  return (
    <Section title="Experiences" icon="💼"
      action={
        <button onClick={() => setShowForm(s => !s)}
          className="text-xs font-semibold text-orange-300 hover:text-orange-200 transition-colors">
          {showForm ? 'Cancel' : '+ Add'}
        </button>
      }>
      {showForm && (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3 mb-4 p-4 rounded-xl" style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.07)' }}>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-white/50 mb-1">Title *</label>
              <input required value={form.title} onChange={e => set('title',e.target.value)} placeholder="e.g. Internship" className={inputCls} style={inputStyle} />
            </div>
            <div>
              <label className="block text-xs font-medium text-white/50 mb-1">Organization</label>
              <input value={form.organization} onChange={e => set('organization',e.target.value)} placeholder="Company/School" className={inputCls} style={inputStyle} />
            </div>
            <div>
              <label className="block text-xs font-medium text-white/50 mb-1">Start Date *</label>
              <input required type="date" value={form.start_date} onChange={e => set('start_date',e.target.value)} className={inputCls} style={inputStyle} />
            </div>
            <div>
              <label className="block text-xs font-medium text-white/50 mb-1">End Date</label>
              <input type="date" value={form.end_date} onChange={e => set('end_date',e.target.value)} className={inputCls} style={inputStyle} />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-white/50 mb-1">Description</label>
              <textarea value={form.description} onChange={e => set('description',e.target.value)} rows={2} className={`${inputCls} resize-none`} style={inputStyle} />
            </div>
          </div>
          <button type="submit" disabled={saving} className="py-2 rounded-xl text-sm font-bold text-white disabled:opacity-50" style={{ background:'#f97316' }}>
            {saving ? 'Saving…' : 'Add Experience'}
          </button>
        </form>
      )}
      {experiences.length === 0 ? (
        <p className="text-sm text-white/30">No experiences added for {level} yet.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {experiences.map(exp => (
            <div key={exp.id} className="flex items-start justify-between gap-3 px-4 py-3 rounded-xl"
              style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.07)' }}>
              <div>
                <p className="text-sm font-semibold text-white/90">{exp.title}</p>
                {exp.organization && <p className="text-xs text-orange-300">{exp.organization}</p>}
                <p className="text-xs text-white/40">{fmt(exp.start_date)}{exp.end_date ? ` – ${fmt(exp.end_date)}` : ' – Present'}</p>
                {exp.description && <p className="text-xs text-white/50 mt-1">{exp.description}</p>}
              </div>
              <button onClick={() => handleDelete(exp.id)} className="text-xs text-red-400 hover:text-red-300 flex-shrink-0">🗑️</button>
            </div>
          ))}
        </div>
      )}
    </Section>
  );
}

/* ── Projects Section ── */
function ProjectsSection({ studentId, level, projects, onRefresh }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title:'', description:'', tags:'' });
  const [file, setFile]         = useState(null);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState('');
  const fileRef = useRef();

  function set(k,v) { setForm(f => ({...f,[k]:v})); }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      const fd = new FormData();
      fd.append('academic_level', level);
      fd.append('title', form.title);
      if (form.description) fd.append('description', form.description);
      if (form.tags) fd.append('tags', form.tags);
      if (file) fd.append('file', file);
      await api.post(`/portfolio-level/${studentId}/projects`, fd, { headers:{'Content-Type':'multipart/form-data'} });
      setForm({ title:'', description:'', tags:'' }); setFile(null); setShowForm(false); onRefresh();
    } catch (err) { setError(err.response?.data?.error || 'Failed.'); }
    finally { setSaving(false); }
  }

  async function handleDelete(projectId) {
    try { await api.delete(`/portfolio-level/${studentId}/projects/${projectId}`); onRefresh(); } catch {}
  }

  return (
    <Section title="Projects & Media" icon="🗂️"
      action={
        <button onClick={() => setShowForm(s => !s)}
          className="text-xs font-semibold text-orange-300 hover:text-orange-200 transition-colors">
          {showForm ? 'Cancel' : '+ Add Project'}
        </button>
      }>
      {showForm && (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3 mb-4 p-4 rounded-xl" style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.07)' }}>
          <div>
            <label className="block text-xs font-medium text-white/50 mb-1">Project Title *</label>
            <input required value={form.title} onChange={e => set('title',e.target.value)} placeholder="e.g. Final Year Project" className={inputCls} style={inputStyle} />
          </div>
          <div>
            <label className="block text-xs font-medium text-white/50 mb-1">Description</label>
            <textarea value={form.description} onChange={e => set('description',e.target.value)} rows={2} className={`${inputCls} resize-none`} style={inputStyle} />
          </div>
          <div>
            <label className="block text-xs font-medium text-white/50 mb-1">Tags (comma separated)</label>
            <input value={form.tags} onChange={e => set('tags',e.target.value)} placeholder="e.g. Research, AI, Final Year" className={inputCls} style={inputStyle} />
          </div>
          <div>
            <label className="block text-xs font-medium text-white/50 mb-1">File (optional)</label>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => fileRef.current?.click()}
                className="px-3 py-2 rounded-xl text-xs font-semibold text-white/60 hover:text-white/90 transition-all"
                style={{ border:'1px solid rgba(255,255,255,0.15)' }}>
                {file ? file.name : '📎 Attach file'}
              </button>
              {file && <button type="button" onClick={() => setFile(null)} className="text-xs text-red-400">×</button>}
              <input ref={fileRef} type="file" accept=".jpg,.jpeg,.png,.mp4,.pdf" className="hidden" onChange={e => setFile(e.target.files[0])} />
            </div>
          </div>
          {error && <p className="text-xs text-red-400">{error}</p>}
          <button type="submit" disabled={saving} className="py-2 rounded-xl text-sm font-bold text-white disabled:opacity-50" style={{ background:'#f97316' }}>
            {saving ? 'Saving…' : 'Add Project'}
          </button>
        </form>
      )}
      {projects.length === 0 ? (
        <p className="text-sm text-white/30">No projects added for {level} yet.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {projects.map(p => (
            <div key={p.id} className="rounded-xl overflow-hidden" style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.07)' }}>
              {p.file_url && p.mime_type?.startsWith('image/') && (
                <img src={p.file_url} alt={p.title} className="w-full h-32 object-cover" />
              )}
              <div className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold text-white/90">{p.title}</p>
                  <button onClick={() => handleDelete(p.id)} className="text-xs text-red-400 hover:text-red-300 flex-shrink-0">🗑️</button>
                </div>
                {p.description && <p className="text-xs text-white/50 mt-1">{p.description}</p>}
                {p.tags?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {p.tags.map(t => <span key={t} className="text-[10px] px-1.5 py-0.5 rounded-full text-white/40" style={{ background:'rgba(255,255,255,0.06)' }}>{t}</span>)}
                  </div>
                )}
                {p.file_url && (
                  <a href={p.file_url} target="_blank" rel="noreferrer" className="text-xs text-blue-400 hover:text-blue-300 mt-2 inline-block">📥 Download</a>
                )}
                <p className="text-[10px] text-white/25 mt-1">{fmt(p.created_at)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </Section>
  );
}

/* ── Growth Timeline ── */
function GrowthTimelineSection({ studentId }) {
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    api.get(`/portfolio-level/${studentId}/timeline`)
      .then(r => setTimeline(r.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [studentId]);

  if (loading) return null;
  if (timeline.length === 0) return (
    <Section title="Growth Timeline" icon="📈">
      <p className="text-sm text-white/30">Add skills, projects, or experiences to see your growth timeline.</p>
    </Section>
  );

  return (
    <Section title="Growth Timeline" icon="📈">
      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-4 top-0 bottom-0 w-0.5" style={{ background:'rgba(249,115,22,0.3)' }} />
        <div className="flex flex-col gap-6 pl-10">
          {timeline.map((entry, i) => (
            <div key={entry.level} className="relative">
              {/* Dot */}
              <div className="absolute -left-10 top-1 w-4 h-4 rounded-full flex items-center justify-center"
                style={{ background:'#f97316', boxShadow:'0 0 8px rgba(249,115,22,0.5)' }}>
                <div className="w-2 h-2 rounded-full bg-white" />
              </div>
              <div className="rounded-xl p-4" style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.07)' }}>
                <p className="text-sm font-bold text-orange-300 mb-2">{entry.level}</p>
                {entry.skills.length > 0 && (
                  <div className="mb-2">
                    <p className="text-[10px] text-white/30 uppercase tracking-wide mb-1">Skills</p>
                    <div className="flex flex-wrap gap-1">
                      {entry.skills.map(s => (
                        <span key={s.id} className="text-xs px-2 py-0.5 rounded-full text-orange-300" style={{ background:'rgba(249,115,22,0.1)' }}>{s.skill_name}</span>
                      ))}
                    </div>
                  </div>
                )}
                {entry.projects.length > 0 && (
                  <div className="mb-2">
                    <p className="text-[10px] text-white/30 uppercase tracking-wide mb-1">Projects ({entry.projects.length})</p>
                    <div className="flex flex-wrap gap-1">
                      {entry.projects.map(p => (
                        <span key={p.id} className="text-xs px-2 py-0.5 rounded-full text-blue-300" style={{ background:'rgba(59,130,246,0.1)' }}>{p.title}</span>
                      ))}
                    </div>
                  </div>
                )}
                {entry.experiences.length > 0 && (
                  <div>
                    <p className="text-[10px] text-white/30 uppercase tracking-wide mb-1">Experiences ({entry.experiences.length})</p>
                    <div className="flex flex-wrap gap-1">
                      {entry.experiences.map(e => (
                        <span key={e.id} className="text-xs px-2 py-0.5 rounded-full text-green-300" style={{ background:'rgba(34,197,94,0.1)' }}>{e.title}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              {i < timeline.length - 1 && (
                <div className="flex justify-start pl-0 mt-2">
                  <span className="text-orange-400/50 text-lg">↓</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </Section>
  );
}

/* ── Main Portfolio Section ── */
export default function PortfolioSection({ studentId }) {
  const [currentLevel, setCurrentLevelState] = useState(null);
  const [activeLevel,  setActiveLevel]        = useState(null);
  const [levelData,    setLevelData]          = useState(null);
  const [loading,      setLoading]            = useState(true);
  const [tab,          setTab]                = useState('portfolio');

  // Load current level
  useEffect(() => {
    if (!studentId) return;
    api.get(`/portfolio-level/${studentId}/current-level`)
      .then(r => {
        const lvl = r.data.academic_level;
        setCurrentLevelState(lvl);
        setActiveLevel(lvl || ALL_LEVELS[0]);
      })
      .catch(() => setActiveLevel(ALL_LEVELS[0]))
      .finally(() => setLoading(false));
  }, [studentId]);

  const loadLevelData = useCallback(() => {
    if (!studentId || !activeLevel) return;
    api.get(`/portfolio-level/${studentId}/level/${encodeURIComponent(activeLevel)}`)
      .then(r => setLevelData(r.data))
      .catch(() => {});
  }, [studentId, activeLevel]);

  useEffect(() => { loadLevelData(); }, [loadLevelData]);

  async function handleSelectLevel(level) {
    setActiveLevel(level);
    // Set as current level
    try {
      await api.put(`/portfolio-level/${studentId}/current-level`, { academic_level: level });
      setCurrentLevelState(level);
    } catch {}
  }

  if (loading) return <div className="text-white/30 text-sm py-8 text-center">Loading portfolio…</div>;

  const tabs = [
    { id: 'portfolio', label: '🗂️ Portfolio' },
    { id: 'timeline',  label: '📈 Timeline' },
  ];

  return (
    <div className="flex flex-col gap-5 max-w-3xl">
      <div>
        <h2 className="text-xl font-bold text-white">Portfolio</h2>
        <p className="text-sm text-white/40 mt-0.5">Organize your academic journey by level</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl" style={{ background:'rgba(255,255,255,0.05)' }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${tab===t.id ? 'bg-orange-500 text-white shadow' : 'text-white/50 hover:text-white/80'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'portfolio' && (
        <>
          {/* Level selector */}
          <LevelSelector currentLevel={currentLevel} onSelect={handleSelectLevel} />

          {/* Active level badge */}
          {activeLevel && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-white/50">Viewing:</span>
              <span className="text-sm font-bold text-orange-300 px-3 py-1 rounded-full" style={{ background:'rgba(249,115,22,0.12)', border:'1px solid rgba(249,115,22,0.25)' }}>
                {activeLevel}
              </span>
            </div>
          )}

          {/* Level portfolio sections */}
          {activeLevel && levelData && (
            <div className="flex flex-col gap-4">
              <CVSection          studentId={studentId} level={activeLevel} cvs={levelData.cvs}               onRefresh={loadLevelData} />
              <SkillsSection      studentId={studentId} level={activeLevel} skills={levelData.skills}         onRefresh={loadLevelData} />
              <ExperiencesSection studentId={studentId} level={activeLevel} experiences={levelData.experiences} onRefresh={loadLevelData} />
              <ProjectsSection    studentId={studentId} level={activeLevel} projects={levelData.projects}     onRefresh={loadLevelData} />
            </div>
          )}
        </>
      )}

      {tab === 'timeline' && (
        <GrowthTimelineSection studentId={studentId} />
      )}
    </div>
  );
}
