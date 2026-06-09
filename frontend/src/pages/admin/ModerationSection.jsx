import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import {
  BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

/* ── Shared glass panel ── */
function Panel({ title, sub, children, className = '' }) {
  return (
    <div className={`rounded-2xl p-5 ${className}`}
      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
      {(title || sub) && (
        <div className="mb-4">
          {title && <h3 className="text-sm font-bold text-white">{title}</h3>}
          {sub   && <p className="text-xs text-white/40 mt-0.5">{sub}</p>}
        </div>
      )}
      {children}
    </div>
  );
}

/* ── Custom recharts tooltip ── */
function GlassTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl p-3 text-xs"
      style={{ background: 'rgba(10,15,35,0.95)', border: '1px solid rgba(255,255,255,0.15)', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
      <p className="font-bold text-white/70 mb-1.5">{label}</p>
      {payload.map(p => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: <strong>{typeof p.value === 'number' && p.value > 1000
            ? `GH₵ ${Number(p.value).toLocaleString()}`
            : p.value}</strong>
        </p>
      ))}
    </div>
  );
}

/* ── Media moderation badge ── */
function StatusBadge({ status }) {
  const map = {
    pending:  'text-yellow-300 bg-yellow-500/10 border-yellow-500/25',
    approved: 'text-green-300 bg-green-500/10 border-green-500/25',
    flagged:  'text-red-300 bg-red-500/10 border-red-500/25',
  };
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border capitalize ${map[status] || map.pending}`}>
      {status}
    </span>
  );
}

/* ── Modal for showing lists ── */
function ListModal({ title, items, type, onClose, onNavigate }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
      <div className="w-full max-w-2xl rounded-2xl p-6 flex flex-col max-h-[80vh] shadow-2xl" style={{ background: '#0f1a35', border: '1px solid rgba(255,255,255,0.1)' }}>
        <div className="flex justify-between items-center mb-4 shrink-0">
          <h2 className="text-xl font-bold text-white">{title}</h2>
          <button onClick={onClose} className="text-white/50 hover:text-white p-2 text-xl leading-none">✕</button>
        </div>
        <div className="overflow-y-auto pr-2 flex flex-col gap-3 flex-1">
          {items.length === 0 ? (
            <p className="text-white/40 text-sm py-4 text-center">No items found.</p>
          ) : (
            items.map(item => (
              <div key={item.id} className="p-3 rounded-xl flex items-center gap-4 transition-all" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.05)' }}>
                 {type === 'media' ? (
                   <>
                     <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-black/20">
                       {item.mime_type?.startsWith('image/') ? (
                         <img src={item.url} alt="media" className="w-full h-full object-cover" />
                       ) : (
                         <div className="w-full h-full flex items-center justify-center text-xl">🎬</div>
                       )}
                     </div>
                     <div className="flex-1">
                       <p className="text-sm text-white font-bold">{item.title || 'Untitled'}</p>
                       <p className="text-xs text-white/50">{item.student_name}</p>
                     </div>
                     <StatusBadge status={item.moderation_status} />
                     <a href={item.url} download target="_blank" rel="noreferrer" title="Download Media" className="text-xs px-2 py-1.5 rounded-lg font-semibold transition-all hover:bg-white/10" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
                       ⬇️
                     </a>
                   </>
                 ) : (
                   <>
                     <div className="w-12 h-12 flex items-center justify-center text-2xl flex-shrink-0">📄</div>
                     <div className="flex-1">
                       <p className="text-sm text-white font-bold">{item.student_name} - {item.record_type.replace('_', ' ')}</p>
                       <p className="text-xs text-white/50">{new Date(item.created_at).toLocaleDateString()}</p>
                     </div>
                     <button onClick={() => onNavigate('/admin/health')} className="text-xs bg-blue-500/20 text-blue-300 px-3 py-1.5 rounded-lg font-semibold hover:bg-blue-500/30 transition-colors">
                       Review
                     </button>
                   </>
                 )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Main component ── */
export default function ModerationSection() {
  const [analytics, setAnalytics] = useState({ fees: [], attendance: [], results: [] });
  const [media,     setMedia]     = useState([]);
  const [healthRecords, setHealthRecords] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [moderating, setModerating] = useState({});
  const [modalState, setModalState] = useState(null);
  const navigate = useNavigate();

  const load = useCallback(() => {
    setLoading(true);
    Promise.allSettled([
      api.get('/admin/platform-analytics'),
      api.get('/admin/content'),
      api.get('/health/admin/all')
    ]).then(([analyticsRes, mediaRes, healthRes]) => {
      if (analyticsRes.status === 'fulfilled') setAnalytics(analyticsRes.value.data);
      if (mediaRes.status === 'fulfilled')     setMedia(mediaRes.value.data || []);
      if (healthRes.status === 'fulfilled')    setHealthRecords(healthRes.value.data || []);
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  async function moderate(id, action) {
    setModerating(m => ({ ...m, [id]: action }));
    try {
      const { data } = await api.patch(`/admin/content/${id}`, { action });
      setMedia(prev => prev.map(item => item.id === id ? { ...item, moderation_status: data.moderation_status } : item));
    } catch { /* ignore */ }
    finally { setModerating(m => { const n = { ...m }; delete n[id]; return n; }); }
  }

  /* Format month labels e.g. "2024-11" → "Nov 24" */
  function fmtMonth(m) {
    if (!m) return '';
    const [y, mo] = m.split('-');
    return new Date(Number(y), Number(mo) - 1).toLocaleDateString('en-GB', { month: 'short', year: '2-digit' });
  }

  const feeData       = analytics.fees.map(r => ({ ...r, month: fmtMonth(r.month), collected: Number(r.collected || 0), pending: Number(r.pending || 0), overdue: Number(r.overdue || 0) }));
  const attendData    = analytics.attendance.map(r => ({ ...r, month: fmtMonth(r.month), pct: r.total > 0 ? Math.round((Number(r.present) / Number(r.total)) * 100) : 0 }));
  const subjectData   = (analytics.results || []).slice(0, 8).map(r => ({ ...r, avg: Number(r.avg_marks || 0) }));

  // Process Health Records into monthly "Fees Invoice Uploaded" data
  const invoiceDataMap = {};
  healthRecords.forEach(record => {
    const d = new Date(record.created_at);
    const m = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
    const fm = fmtMonth(m);
    if (!invoiceDataMap[fm]) invoiceDataMap[fm] = { month: fm, approved: 0, pending: 0, rejected: 0 };
    if (record.status === 'approved') invoiceDataMap[fm].approved += 1;
    else if (record.status === 'pending') invoiceDataMap[fm].pending += 1;
    else if (record.status === 'rejected') invoiceDataMap[fm].rejected += 1;
  });
  const invoiceData = Object.values(invoiceDataMap);

  // Process uploads distribution for the new report
  let totalUploads = healthRecords.length + media.length;
  const uploadStats = [
    { name: 'Health/Invoices', value: healthRecords.length, fill: '#3b82f6' },
    { name: 'Portfolio Media', value: media.length, fill: '#f59e0b' }
  ];

  const pendingMedia  = media.filter(m => m.moderation_status === 'pending');
  const approvedCount = media.filter(m => m.moderation_status === 'approved').length;
  const flaggedCount  = media.filter(m => m.moderation_status === 'flagged').length;

  const CHART_STYLE = { background: 'transparent', fontSize: 11, fontFamily: 'inherit' };
  const AXIS_PROPS  = { stroke: 'rgba(255,255,255,0.2)', tick: { fill: 'rgba(255,255,255,0.4)', fontSize: 10 } };
  const GRID_PROPS  = { stroke: 'rgba(255,255,255,0.05)', strokeDasharray: '3 3' };

  return (
    <div className="flex flex-col gap-6">

      {/* ── Header ── */}
      <div>
        <h2 className="text-xl font-bold text-white">Reports & Analytics</h2>
        <p className="text-sm text-white/40 mt-0.5">Platform-wide insights and content moderation</p>
      </div>

      {/* ── Summary strip ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Pending Media',    value: pendingMedia.length, icon: '⏳', colour: 'rgba(234,179,8,0.15)', onClick: () => setModalState({ title: 'Pending Media', items: pendingMedia, type: 'media' }) },
          { label: 'Rejected Media',   value: flaggedCount,        icon: '🚩', colour: 'rgba(239,68,68,0.15)', onClick: () => setModalState({ title: 'Rejected / Flagged Media', items: media.filter(m => m.moderation_status === 'flagged'), type: 'media' }) },
          { label: 'Pending Invoices', value: healthRecords.filter(r => r.status === 'pending').length, icon: '📄', colour: 'rgba(234,179,8,0.15)', onClick: () => setModalState({ title: 'Pending Invoices', items: healthRecords.filter(r => r.status === 'pending'), type: 'invoice' }) },
          { label: 'Rejected Invoices',value: healthRecords.filter(r => r.status === 'rejected').length, icon: '❌', colour: 'rgba(239,68,68,0.15)', onClick: () => setModalState({ title: 'Rejected Invoices', items: healthRecords.filter(r => r.status === 'rejected'), type: 'invoice' }) },
        ].map(c => (
          <button key={c.label} onClick={c.onClick} className="rounded-2xl p-4 flex items-center gap-3 text-left transition-all hover:bg-white/10 active:scale-95 cursor-pointer hover:border-orange-400/30"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0" style={{ background: c.colour }}>
              {c.icon}
            </div>
            <div>
              <p className="text-xl font-bold text-white">{loading ? '—' : c.value}</p>
              <p className="text-xs text-white/40">{c.label}</p>
            </div>
          </button>
        ))}
      </div>

      {/* ── Uploads Report Panel ── */}
      <Panel title="Uploads Overview Report" sub="Total documents and media uploaded across the platform">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col gap-3 justify-center">
            <div className="p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.05)' }}>
              <p className="text-xs text-white/50">Total Uploads</p>
              <p className="text-2xl font-bold text-white">{totalUploads}</p>
            </div>
            <div className="p-4 rounded-xl" style={{ background: 'rgba(59,130,246,0.1)' }}>
              <p className="text-xs text-blue-300">Health & Invoices</p>
              <p className="text-xl font-bold text-white">{healthRecords.length}</p>
            </div>
            <div className="p-4 rounded-xl" style={{ background: 'rgba(245,158,11,0.1)' }}>
              <p className="text-xs text-yellow-300">Portfolio Media</p>
              <p className="text-xl font-bold text-white">{media.length}</p>
            </div>
          </div>
          <div className="h-48 flex items-center justify-center">
            {totalUploads > 0 ? (
              <ResponsiveContainer width="100%" height="100%" style={CHART_STYLE}>
                <PieChart>
                  <Pie data={uploadStats} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={70} stroke="none">
                    {uploadStats.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip content={<GlassTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-white/30 text-sm">No uploads yet.</p>
            )}
          </div>
        </div>
      </Panel>

      {/* ── Fees Invoice Uploaded Chart ── */}
      <Panel title="Fees Invoice Uploaded (Last 6 Months)" sub="Monthly breakdown of uploaded invoices and documents">
        {invoiceData.length === 0 ? (
          <p className="text-center text-white/30 text-sm py-8">No invoice uploads available.</p>
        ) : (
          <ResponsiveContainer width="100%" height={220} style={CHART_STYLE}>
            <BarChart data={invoiceData} barGap={4} barCategoryGap="30%">
              <CartesianGrid {...GRID_PROPS} />
              <XAxis dataKey="month" {...AXIS_PROPS} />
              <YAxis allowDecimals={false} {...AXIS_PROPS} />
              <Tooltip content={<GlassTooltip />} />
              <Legend wrapperStyle={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }} />
              <Bar dataKey="approved" name="Approved" fill="#22c55e" radius={[4,4,0,0]} />
              <Bar dataKey="pending"   name="Pending Review"   fill="#f59e0b" radius={[4,4,0,0]} />
              <Bar dataKey="rejected"   name="Rejected"   fill="#ef4444" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </Panel>

      {/* ── Attendance Trend Chart ── */}
      <Panel title="Attendance Rate (Last 6 Months)" sub="Monthly overall attendance percentage across all students">
        {attendData.length === 0 ? (
          <p className="text-center text-white/30 text-sm py-8">No attendance data available.</p>
        ) : (
          <ResponsiveContainer width="100%" height={200} style={CHART_STYLE}>
            <AreaChart data={attendData}>
              <defs>
                <linearGradient id="attendGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#f97316" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid {...GRID_PROPS} />
              <XAxis dataKey="month" {...AXIS_PROPS} />
              <YAxis domain={[0, 100]} unit="%" {...AXIS_PROPS} />
              <Tooltip content={<GlassTooltip />} />
              <Area type="monotone" dataKey="pct" name="Attendance %" stroke="#f97316" strokeWidth={2} fill="url(#attendGrad)" dot={{ fill: '#f97316', r: 4 }} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </Panel>

      {/* ── Subject Performance Chart ── */}
      {subjectData.length > 0 && (
        <Panel title="Subject Performance" sub="Average marks per subject across all students">
          <ResponsiveContainer width="100%" height={Math.max(180, subjectData.length * 36)} style={CHART_STYLE}>
            <BarChart data={subjectData} layout="vertical" barCategoryGap="20%">
              <CartesianGrid {...GRID_PROPS} horizontal={false} />
              <XAxis type="number" domain={[0, 100]} {...AXIS_PROPS} />
              <YAxis type="category" dataKey="subject" width={120} {...AXIS_PROPS} />
              <Tooltip content={<GlassTooltip />} />
              <Bar dataKey="avg" name="Avg Marks" radius={[0,4,4,0]}
                fill="url(#subjectGrad)"
                label={{ position: 'right', fill: 'rgba(255,255,255,0.5)', fontSize: 10, formatter: v => `${v}%` }}>
                <defs>
                  <linearGradient id="subjectGrad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%"   stopColor="#8b5cf6" />
                    <stop offset="100%" stopColor="#f97316" />
                  </linearGradient>
                </defs>
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Panel>
      )}

      {/* ── Media Moderation Queue ── */}
      <Panel title="Portfolio Media Moderation" sub={`${pendingMedia.length} item${pendingMedia.length !== 1 ? 's' : ''} pending review`}>
        {loading ? (
          <p className="text-center text-white/30 text-sm py-8">Loading…</p>
        ) : media.length === 0 ? (
          <div className="py-10 text-center">
            <div className="text-3xl mb-2">🖼️</div>
            <p className="text-white/30 text-sm">No media uploaded yet.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3 max-h-[500px] overflow-y-auto pr-1">
            {media.map(item => (
              <div key={item.id} className="flex items-start gap-4 p-3 rounded-xl transition-all"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                {/* Thumbnail */}
                <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
                  {item.mime_type?.startsWith('image/') ? (
                    <img src={item.url} alt={item.title || 'media'} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-white/5 flex items-center justify-center text-2xl">🎬</div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white/80 truncate">{item.title || 'Untitled'}</p>
                  <p className="text-xs text-white/40 mt-0.5">{item.student_name}</p>
                  <div className="mt-1.5">
                    <StatusBadge status={item.moderation_status} />
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 flex-shrink-0">
                  <a
                    href={item.url}
                    download
                    target="_blank"
                    rel="noreferrer"
                    title="Download Media"
                    className="flex items-center justify-center text-xs px-3 py-1.5 rounded-lg font-semibold transition-all hover:bg-white/20"
                    style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)' }}
                  >
                    ⬇️
                  </a>
                  <button
                    onClick={() => moderate(item.id, 'approved')}
                    disabled={item.moderation_status === 'approved' || !!moderating[item.id]}
                    className="text-xs px-3 py-1.5 rounded-lg font-semibold transition-all disabled:opacity-40"
                    style={{ background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)', color: '#86efac' }}
                  >
                    {moderating[item.id] === 'approved' ? '…' : '✅'}
                  </button>
                  <button
                    onClick={() => moderate(item.id, 'flagged')}
                    disabled={item.moderation_status === 'flagged' || !!moderating[item.id]}
                    className="text-xs px-3 py-1.5 rounded-lg font-semibold transition-all disabled:opacity-40"
                    style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5' }}
                  >
                    {moderating[item.id] === 'flagged' ? '…' : '🚩'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>

      {modalState && (
        <ListModal
          title={modalState.title}
          items={modalState.items}
          type={modalState.type}
          onClose={() => setModalState(null)}
          onNavigate={(path) => { setModalState(null); navigate(path); }}
        />
      )}
    </div>
  );
}
