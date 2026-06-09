import { useState, useEffect, useRef, useCallback } from 'react';
import api from '../../utils/api';
import useAuth from '../../hooks/useAuth';

const STRUCTURE = {
  JHS:     { years: ['JHS 1','JHS 2','JHS 3'],                          categories: ['Group Pictures','Sports','Academic Events','Classroom Activities','Excursions','Club Events','Other'] },
  SHS:     { years: ['SHS 1','SHS 2','SHS 3'],                          categories: ['Presentations','Projects','Competitions','Group Discussions','Programs','School Events','Other'] },
  Diploma: { years: ['Diploma 1','Diploma 2'],                          categories: ['Presentations','Research','Conferences','Seminars','Group Work','Field Work','Academic Events','Other'] },
  Degree:  { years: ['Degree 1','Degree 2','Degree 3','Degree 4'],      categories: ['Presentations','Research','Conferences','Seminars','Group Work','Field Work','Academic Events','Other'] },
};

function getLevelGroup(level) {
  if (!level) return null;
  const l = level.toUpperCase();
  if (l.startsWith('JHS'))     return 'JHS';
  if (l.startsWith('SHS'))     return 'SHS';
  if (l.startsWith('DIPLOMA')) return 'Diploma';
  if (l.startsWith('DEGREE'))  return 'Degree';
  return null;
}

function timeAgo(d) {
  if (!d) return '';
  const diff = Math.floor((Date.now() - new Date(d)) / 1000);
  if (diff < 60)    return 'just now';
  if (diff < 3600)  return `${Math.floor(diff/60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff/3600)}h ago`;
  return new Date(d).toLocaleDateString('en-GB', { day:'2-digit', month:'short' });
}

const REACTIONS = [
  { key: 'like',      emoji: '👍', label: 'Like' },
  { key: 'love',      emoji: '❤️', label: 'Love' },
  { key: 'celebrate', emoji: '🎉', label: 'Celebrate' },
  { key: 'support',   emoji: '🤝', label: 'Support' },
];

function StatusBadge({ status }) {
  const map = {
    pending:  'text-yellow-300 bg-yellow-500/10 border-yellow-500/25',
    approved: 'text-green-300 bg-green-500/10 border-green-500/25',
    rejected: 'text-red-300 bg-red-500/10 border-red-500/25',
  };
  return <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border capitalize ${map[status]||map.pending}`}>{status}</span>;
}

function Avatar({ name, photo, size = 9 }) {
  const initials = (name||'U').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
  return (
    <div className={`w-${size} h-${size} rounded-full overflow-hidden flex-shrink-0`}>
      {photo
        ? <img src={photo} alt={name} className="w-full h-full object-cover" />
        : <div className="w-full h-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white text-xs font-bold">{initials}</div>
      }
    </div>
  );
}

function ActivityCard({ act, currentUserId, onReact, onComment, onDelete }) {
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText]   = useState('');
  const [replyTo, setReplyTo]           = useState(null);
  const [comments, setComments]         = useState([]);
  const [reactions, setReactions]       = useState(act.reactions_breakdown || []);
  const [loadingComments, setLoadingComments] = useState(false);

  function getCount(key) {
    const r = reactions.find(r => r.reaction === key);
    return r ? Number(r.count) : 0;
  }

  async function loadComments() {
    setLoadingComments(true);
    try {
      const { data } = await api.get(`/activities/${act.id}`);
      setComments(data.comments || []);
      setReactions(data.reactions || []);
    } catch {} finally { setLoadingComments(false); }
  }

  async function handleReact(key) {
    try {
      const { data } = await api.post(`/activities/${act.id}/react`, { reaction: key });
      setReactions(data.reactions || []);
    } catch {}
  }

  async function submitComment(e) {
    e.preventDefault();
    if (!commentText.trim()) return;
    try {
      const { data } = await api.post(`/activities/${act.id}/comments`, {
        content: commentText, parent_id: replyTo?.id || null,
      });
      setComments(prev => [...prev, data]);
      setCommentText(''); setReplyTo(null);
    } catch {}
  }

  async function handleDeleteComment(commentId) {
    try {
      await api.delete(`/activities/comments/${commentId}`);
      setComments(prev => prev.filter(c => c.id !== commentId));
    } catch {}
  }

  const mediaItems = act.media || [];
  const photos = mediaItems.filter(m => m.media_type === 'photo');
  const videos = mediaItems.filter(m => m.media_type === 'video');

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.09)' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <Avatar name={act.student_name} photo={act.student_photo} />
          <div>
            <p className="text-sm font-semibold text-white">{act.student_name}</p>
            <p className="text-xs text-white/40">{act.school_level} · {act.category} · {timeAgo(act.created_at)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-white/30 px-2 py-0.5 rounded-full" style={{background:'rgba(255,255,255,0.05)'}}>{act.category}</span>
          {act.student_id === currentUserId && (
            <button onClick={() => onDelete(act.id)} className="text-xs text-red-400 hover:text-red-300 transition-colors">🗑️</button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="px-4 pb-3">
        <p className="text-sm font-semibold text-white mb-1">{act.title}</p>
        {act.description && <p className="text-sm text-white/60 leading-relaxed">{act.description}</p>}
        {act.location && <p className="text-xs text-white/30 mt-1">📍 {act.location}</p>}
      </div>

      {/* Photos grid */}
      {photos.length > 0 && (
        <div className={`grid gap-1 px-4 pb-3 ${photos.length === 1 ? 'grid-cols-1' : photos.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
          {photos.slice(0,6).map((m,i) => (
            <div key={m.id} className="relative rounded-xl overflow-hidden" style={{paddingTop:'75%'}}>
              <img src={m.url} alt="" className="absolute inset-0 w-full h-full object-cover" />
              {i === 5 && photos.length > 6 && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                  <span className="text-white font-bold text-lg">+{photos.length-6}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Videos */}
      {videos.map(v => (
        <div key={v.id} className="px-4 pb-3">
          <video src={v.url} controls className="w-full rounded-xl max-h-64 bg-black" />
        </div>
      ))}

      {/* Reactions */}
      <div className="flex items-center gap-1 px-4 pb-2 flex-wrap">
        {REACTIONS.map(r => (
          <button key={r.key} onClick={() => handleReact(r.key)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs transition-all hover:bg-white/10"
            style={{background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.08)'}}>
            <span>{r.emoji}</span>
            <span className="text-white/60">{getCount(r.key) || ''}</span>
          </button>
        ))}
        <button onClick={() => { setShowComments(s => !s); if (!showComments) loadComments(); }}
          className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs text-white/50 hover:text-white/80 transition-all ml-auto"
          style={{background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.08)'}}>
          💬 {act.comment_count || 0}
        </button>
      </div>

      {/* Comments */}
      {showComments && (
        <div className="px-4 pb-4 border-t border-white/8 pt-3">
          {loadingComments ? <p className="text-xs text-white/30">Loading…</p> : (
            <div className="flex flex-col gap-2 mb-3 max-h-48 overflow-y-auto">
              {comments.map(c => (
                <div key={c.id} className="flex items-start gap-2">
                  <Avatar name={c.user_name} photo={c.user_photo} size={7} />
                  <div className="flex-1 rounded-xl px-3 py-2" style={{background:'rgba(255,255,255,0.05)'}}>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-white/80">{c.user_name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-white/30">{timeAgo(c.created_at)}</span>
                        {(c.user_id === currentUserId) && (
                          <button onClick={() => handleDeleteComment(c.id)} className="text-[10px] text-red-400 hover:text-red-300">×</button>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-white/60 mt-0.5">{c.content}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
          <form onSubmit={submitComment} className="flex gap-2">
            <input value={commentText} onChange={e => setCommentText(e.target.value)}
              placeholder="Write a comment…"
              className="flex-1 rounded-xl px-3 py-2 text-xs text-white/90 focus:outline-none focus:ring-1 focus:ring-orange-400/60"
              style={{background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.12)'}} />
            <button type="submit" className="px-3 py-2 rounded-xl text-xs font-semibold text-white" style={{background:'#f97316'}}>Post</button>
          </form>
        </div>
      )}
    </div>
  );
}

function UploadForm({ currentLevel, onUploaded }) {
  const group     = getLevelGroup(currentLevel);
  const structure = group ? STRUCTURE[group] : null;
  const [form, setForm] = useState({ title:'', description:'', school_level: currentLevel||'', year_label:'', category:'', location:'', activity_date: new Date().toISOString().slice(0,10) });
  const [files, setFiles]       = useState([]);
  const [previews, setPreviews] = useState([]);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError]       = useState('');
  const [success, setSuccess]   = useState('');
  const fileRef = useRef();

  function set(k,v) { setForm(f => ({...f, [k]:v})); }

  function handleFiles(newFiles) {
    const valid = [];
    for (const f of newFiles) {
      const isPhoto = ['image/jpeg','image/png','image/jpg','image/webp'].includes(f.type);
      const isVideo = ['video/mp4','video/quicktime','video/webm'].includes(f.type);
      if (!isPhoto && !isVideo) { setError(`${f.name}: unsupported format`); continue; }
      if (isPhoto && f.size > 20*1024*1024) { setError(`${f.name}: photo max 20 MB`); continue; }
      if (isVideo && f.size > 200*1024*1024) { setError(`${f.name}: video max 200 MB`); continue; }
      valid.push(f);
    }
    setFiles(prev => [...prev, ...valid]);
    valid.forEach(f => {
      if (f.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = e => setPreviews(prev => [...prev, { type:'image', src: e.target.result, name: f.name }]);
        reader.readAsDataURL(f);
      } else {
        setPreviews(prev => [...prev, { type:'video', name: f.name }]);
      }
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.title) { setError('Title is required.'); return; }
    if (!form.school_level) { setError('School level is required.'); return; }
    if (!form.category) { setError('Category is required.'); return; }
    setUploading(true); setError(''); setSuccess('');
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k,v]) => v && fd.append(k, v));
      files.forEach(f => fd.append('media', f));
      await api.post('/activities', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setSuccess('✅ Activity submitted! Awaiting admin approval.');
      setForm({ title:'', description:'', school_level: currentLevel||'', year_label:'', category:'', location:'', activity_date: new Date().toISOString().slice(0,10) });
      setFiles([]); setPreviews([]);
      onUploaded();
    } catch (err) {
      setError(err.response?.data?.error || 'Upload failed.');
    } finally { setUploading(false); }
  }

  const allLevels = Object.values(STRUCTURE).flatMap(s => s.years);
  const categories = structure?.categories || Object.values(STRUCTURE).flatMap(s => s.categories).filter((v,i,a) => a.indexOf(v)===i);

  const inputCls = 'w-full rounded-xl px-3 py-2.5 text-sm text-white/90 focus:outline-none focus:ring-2 focus:ring-orange-400/60';
  const inputStyle = { background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.12)' };

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl p-5 flex flex-col gap-4" style={{background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.09)'}}>
      <h3 className="text-sm font-bold text-white/80 uppercase tracking-wide">📸 Post Activity</h3>
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="block text-xs font-medium text-white/50 mb-1.5">Title *</label>
          <input type="text" value={form.title} onChange={e => set('title', e.target.value)} placeholder="e.g. Group Presentation" className={inputCls} style={inputStyle} />
        </div>
        <div>
          <label className="block text-xs font-medium text-white/50 mb-1.5">School Level *</label>
          <select value={form.school_level} onChange={e => { set('school_level', e.target.value); set('year_label',''); set('category',''); }} className={inputCls} style={inputStyle}>
            <option value="">— Select level —</option>
            {allLevels.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-white/50 mb-1.5">Category *</label>
          <select value={form.category} onChange={e => set('category', e.target.value)} className={inputCls} style={inputStyle}>
            <option value="">— Select category —</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-white/50 mb-1.5">Date *</label>
          <input type="date" value={form.activity_date} onChange={e => set('activity_date', e.target.value)} className={inputCls} style={inputStyle} />
        </div>
        <div>
          <label className="block text-xs font-medium text-white/50 mb-1.5">Location</label>
          <input type="text" value={form.location} onChange={e => set('location', e.target.value)} placeholder="Optional" className={inputCls} style={inputStyle} />
        </div>
        <div className="col-span-2">
          <label className="block text-xs font-medium text-white/50 mb-1.5">Description</label>
          <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={3} placeholder="Describe the activity…" className={`${inputCls} resize-none`} style={inputStyle} />
        </div>
      </div>
      {/* Media drop zone */}
      <div onDragOver={e=>{e.preventDefault();setDragging(true);}} onDragLeave={()=>setDragging(false)}
        onDrop={e=>{e.preventDefault();setDragging(false);handleFiles(Array.from(e.dataTransfer.files));}}
        onClick={()=>fileRef.current?.click()}
        className="rounded-xl p-5 text-center cursor-pointer transition-all"
        style={{border:`2px dashed ${dragging?'rgba(249,115,22,0.6)':'rgba(255,255,255,0.15)'}`, background: dragging?'rgba(249,115,22,0.05)':'rgba(255,255,255,0.03)'}}>
        {previews.length > 0 ? (
          <div className="flex flex-wrap gap-2 justify-center">
            {previews.map((p,i) => p.type==='image'
              ? <img key={i} src={p.src} alt="" className="h-16 w-16 object-cover rounded-lg" />
              : <div key={i} className="h-16 w-16 rounded-lg bg-white/10 flex items-center justify-center text-2xl">🎬</div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1">
            <span className="text-2xl">📸</span>
            <p className="text-xs text-white/60">Drag & drop or <span className="text-orange-400 font-semibold">browse</span></p>
            <p className="text-[10px] text-white/30">JPG, PNG, MP4, MOV, WEBM · Photos 20MB · Videos 200MB</p>
          </div>
        )}
        <input ref={fileRef} type="file" accept=".jpg,.jpeg,.png,.webp,.mp4,.mov,.webm" multiple className="hidden" onChange={e=>handleFiles(Array.from(e.target.files))} />
      </div>
      {error   && <p className="text-xs text-red-400 px-3 py-2 rounded-xl" style={{background:'rgba(239,68,68,0.1)'}}>{error}</p>}
      {success && <p className="text-xs text-green-400 px-3 py-2 rounded-xl" style={{background:'rgba(34,197,94,0.1)'}}>{success}</p>}
      <button type="submit" disabled={uploading} className="py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-50" style={{background:'#f97316', boxShadow:'0 2px 12px rgba(249,115,22,0.3)'}}>
        {uploading ? 'Posting…' : '📸 Post Activity'}
      </button>
    </form>
  );
}

export default function ActivitiesSection({ studentId }) {
  const { user } = useAuth();
  const [tab, setTab]         = useState('feed');
  const [feed, setFeed]       = useState([]);
  const [myPosts, setMyPosts] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [levelFilter, setLevelFilter]     = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [search, setSearch]   = useState('');

  useEffect(() => {
    if (!studentId) return;
    api.get(`/profile/${studentId}`).then(r => setProfile(r.data)).catch(() => {});
  }, [studentId]);

  const loadFeed = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (levelFilter)    params.set('level', levelFilter);
    if (categoryFilter) params.set('category', categoryFilter);
    if (search)         params.set('search', search);
    api.get(`/activities/feed?${params}`)
      .then(r => setFeed(r.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [levelFilter, categoryFilter, search]);

  const loadMyPosts = useCallback(() => {
    api.get('/activities/my').then(r => setMyPosts(r.data || [])).catch(() => {});
  }, []);

  useEffect(() => { loadFeed(); }, [loadFeed]);
  useEffect(() => { if (tab === 'my') loadMyPosts(); }, [tab, loadMyPosts]);

  async function handleDelete(id) {
    try { await api.delete(`/activities/${id}`); loadFeed(); loadMyPosts(); } catch {}
  }

  const currentLevel = profile?.level || profile?.school_level || null;
  const allLevels    = Object.values(STRUCTURE).flatMap(s => s.years);
  const allCategories = Object.values(STRUCTURE).flatMap(s => s.categories).filter((v,i,a) => a.indexOf(v)===i);

  const tabs = [
    { id: 'feed', label: '🌐 Feed' },
    { id: 'post', label: '📸 Post' },
    { id: 'my',   label: '👤 My Posts' },
  ];

  return (
    <div className="flex flex-col gap-5 max-w-2xl">
      <div>
        <h2 className="text-xl font-bold text-white">Activities</h2>
        <p className="text-sm text-white/40 mt-0.5">Share and explore school activities</p>
      </div>

      <div className="flex gap-1 p-1 rounded-xl" style={{background:'rgba(255,255,255,0.05)'}}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${tab===t.id ? 'bg-orange-500 text-white shadow' : 'text-white/50 hover:text-white/80'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'feed' && (
        <>
          {/* Filters */}
          <div className="flex flex-wrap gap-2">
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…"
              className="flex-1 min-w-[140px] rounded-xl px-3 py-2 text-xs text-white/90 focus:outline-none focus:ring-1 focus:ring-orange-400/60"
              style={{background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.1)'}} />
            <select value={levelFilter} onChange={e => setLevelFilter(e.target.value)}
              className="rounded-xl px-3 py-2 text-xs text-white/90 focus:outline-none"
              style={{background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.1)'}}>
              <option value="">All Levels</option>
              {allLevels.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
            <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}
              className="rounded-xl px-3 py-2 text-xs text-white/90 focus:outline-none"
              style={{background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.1)'}}>
              <option value="">All Categories</option>
              {allCategories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {loading ? (
            <p className="text-white/30 text-sm text-center py-8">Loading…</p>
          ) : feed.length === 0 ? (
            <div className="rounded-2xl p-8 text-center" style={{background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.07)'}}>
              <div className="text-3xl mb-2">🏃</div>
              <p className="text-white/40 text-sm">No activities yet. Be the first to post!</p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {feed.map(act => (
                <ActivityCard key={act.id} act={act} currentUserId={user?.sub || user?.id}
                  onDelete={handleDelete} />
              ))}
            </div>
          )}
        </>
      )}

      {tab === 'post' && (
        <UploadForm currentLevel={currentLevel} onUploaded={() => { loadFeed(); setTab('feed'); }} />
      )}

      {tab === 'my' && (
        <div className="flex flex-col gap-3">
          {myPosts.length === 0 ? (
            <div className="rounded-2xl p-8 text-center" style={{background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.07)'}}>
              <p className="text-white/40 text-sm">You haven't posted any activities yet.</p>
            </div>
          ) : myPosts.map(act => (
            <div key={act.id} className="rounded-2xl p-4" style={{background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.09)'}}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-white">{act.title}</p>
                  <p className="text-xs text-white/40">{act.school_level} · {act.category} · {new Date(act.activity_date).toLocaleDateString('en-GB')}</p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={act.status} />
                  <button onClick={() => handleDelete(act.id)} className="text-xs text-red-400 hover:text-red-300">🗑️</button>
                </div>
              </div>
              {act.admin_comment && (
                <p className="mt-2 text-xs text-white/60 px-3 py-2 rounded-lg" style={{background:'rgba(255,255,255,0.04)'}}>
                  💬 {act.admin_comment}
                </p>
              )}
              {act.media?.length > 0 && (
                <div className="flex gap-2 mt-2 flex-wrap">
                  {act.media.slice(0,3).map(m => m.media_type==='photo'
                    ? <img key={m.id} src={m.url} alt="" className="h-12 w-12 object-cover rounded-lg" />
                    : <div key={m.id} className="h-12 w-12 rounded-lg bg-white/10 flex items-center justify-center text-lg">🎬</div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
