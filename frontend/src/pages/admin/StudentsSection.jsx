import { useState, useEffect, useCallback } from 'react';
import api from '../../utils/api';
import StudentPortfolioModal from './StudentPortfolioModal';
import ResponsiveTable from '../../components/common/ResponsiveTable';

function fmt(dateStr) {
  if (!dateStr) return '—';
  try { return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }); }
  catch { return dateStr; }
}

function initials(name = '') {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

const val = v => v || '—';

/* ── Full profile modal ── */
function StudentProfileModal({ student, onClose, onEdit }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/profile/${student.id}`)
      .then(r => setProfile(r.data))
      .catch(() => setProfile(student))
      .finally(() => setLoading(false));
  }, [student.id]);

  const p = profile || student;

  function exportProfile() {
    const lines = [
      `CompassionEdu — Student Profile`,
      `Generated: ${new Date().toLocaleString()}`,
      ``,
      `PERSONAL`,
      `Name: ${val(p.name)}`,
      `Email: ${val(p.email)}`,
      `Phone: ${val(p.phone)}`,
      `Age: ${val(p.age)}`,
      `Gender: ${val(p.gender)}`,
      `Date of Birth: ${fmt(p.date_of_birth)}`,
      `Address: ${val(p.address)}`,
      ``,
      `ACADEMIC`,
      `School: ${val(p.school_name)}`,
      `Level: ${val(p.level)}`,
      `Program: ${val(p.program)}`,
      `Department: ${val(p.department)}`,
      `Class/Year: ${val(p.class_year)}`,
      `Student ID: ${val(p.student_id_number)}`,
      `Project Number: ${val(p.project_numbers)}`,
      `Enrollment Date: ${fmt(p.enrollment_date)}`,
      ``,
      `PARENT / GUARDIAN`,
      `Father: ${val(p.father_name)}`,
      `Mother: ${val(p.mother_name)}`,
      `Parent Phone: ${val(p.parent_phone)}`,
      `Parent Email: ${val(p.parent_email)}`,
      ``,
      `EMERGENCY CONTACT`,
      `Name: ${val(p.emergency_name)}`,
      `Phone: ${val(p.emergency_phone)}`,
      `Relationship: ${val(p.emergency_relation)}`,
      ``,
      `ACCOUNT`,
      `Status: ${p.is_active ? 'Active' : 'Inactive'}`,
      `Registered: ${fmt(p.created_at)}`,
    ];

    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `${(p.name || 'student').replace(/\s+/g, '_')}_profile.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl"
        style={{ background: 'rgba(15,20,40,0.97)', border: '1px solid rgba(255,255,255,0.12)', boxShadow: '0 24px 80px rgba(0,0,0,0.6)', animation: 'modalIn 0.2s ease-out' }}>
        <style>{`@keyframes modalIn{from{opacity:0;transform:scale(.95)}to{opacity:1;transform:scale(1)}}`}</style>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 sticky top-0"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', background: 'rgba(15,20,40,0.97)' }}>
          <h3 className="text-base font-bold text-white">Student Profile</h3>
          <div className="flex gap-2">
            <button onClick={exportProfile}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold text-blue-300 transition-all hover:bg-blue-500/15"
              style={{ border: '1px solid rgba(59,130,246,0.25)' }}>
              📥 Export
            </button>
            <button onClick={onClose} className="text-white/40 hover:text-white/80 text-xl leading-none px-2">×</button>
          </div>
        </div>

        {loading ? (
          <div className="py-12 text-center text-white/30">Loading…</div>
        ) : (
          <div className="p-5 flex flex-col gap-5">
            {/* Avatar + name */}
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full overflow-hidden flex-shrink-0 ring-2 ring-orange-400/40">
                {p.photo_url ? (
                  <img src={p.photo_url} alt={p.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-bold text-lg">
                    {initials(p.name)}
                  </div>
                )}
              </div>
              <div>
                <p className="text-lg font-bold text-white">{p.name}</p>
                <p className="text-sm text-white/50">{p.email}</p>
                <div className="flex gap-2 mt-1">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${p.is_active ? 'text-green-400 bg-green-400/10' : 'text-red-400 bg-red-400/10'}`}>
                    {p.is_active ? 'Active' : 'Inactive'}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full text-orange-300 bg-orange-500/10">
                    Registered {fmt(p.created_at)}
                  </span>
                </div>
              </div>
            </div>

            {/* Sections */}
            {[
              {
                title: '👤 Personal', fields: [
                  ['Phone', p.phone], ['Age', p.age], ['Gender', p.gender],
                  ['Date of Birth', fmt(p.date_of_birth)], ['Address', p.address],
                  ['Student ID', p.student_id_number], ['Project #', p.project_numbers],
                ]
              },
              {
                title: '🎓 Academic', fields: [
                  ['School', p.school_name], ['Level', p.level], ['Program', p.program],
                  ['Department', p.department], ['Class/Year', p.class_year],
                  ['Enrollment', fmt(p.enrollment_date)],
                ]
              },
              {
                title: '👨‍👩‍👧 Parent / Guardian', fields: [
                  ['Father', p.father_name], ['Mother', p.mother_name],
                  ['Parent Phone', p.parent_phone], ['Parent Email', p.parent_email],
                ]
              },
              {
                title: '🚨 Emergency Contact', fields: [
                  ['Name', p.emergency_name], ['Phone', p.emergency_phone],
                  ['Relationship', p.emergency_relation],
                ]
              },
            ].map(sec => (
              <div key={sec.title} className="rounded-xl overflow-hidden"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <div className="px-4 py-2.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <p className="text-xs font-bold text-white/50 uppercase tracking-wide">{sec.title}</p>
                </div>
                <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {sec.fields.map(([label, value]) => (
                    <div key={label}>
                      <p className="text-[10px] text-white/35 uppercase tracking-wide">{label}</p>
                      <p className="text-sm text-white/80 font-medium mt-0.5">{value || <span className="text-white/25 italic text-xs">Not Provided</span>}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Main section ── */
export default function StudentsSection() {
  const [students, setStudents]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const [search, setSearch]         = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selected, setSelected]     = useState(null);
  const [viewPortfolio, setViewPortfolio] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search)                   params.set('q', search);
    if (statusFilter !== 'all')   params.set('status', statusFilter);

    api.get(`/profile/search/students?${params}`)
      .then(r => { setStudents(r.data || []); setError(''); })
      .catch(e => setError(e.response?.data?.error || 'Failed to load students'))
      .finally(() => setLoading(false));
  }, [search, statusFilter]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="flex flex-col gap-6">

      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-white">Students</h2>
        <p className="text-sm text-white/40 mt-0.5">Search and view all student profiles</p>
      </div>

      {/* Search + filter */}
      <div className="rounded-2xl p-4 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center"
        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)' }}>
        <div className="flex-1 min-w-0 relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 text-sm">🔍</span>
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, email, student ID…"
            className="w-full pl-8 pr-3 py-2.5 rounded-xl text-sm text-white/90 focus:outline-none focus:ring-2 focus:ring-orange-400/60"
            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }} />
        </div>
        <div className="flex flex-wrap gap-2">
          {[
            { val: 'all',      label: '🌐 All' },
            { val: 'active',   label: '✅ Active' },
            { val: 'inactive', label: '⛔ Inactive' },
          ].map(f => (
            <button key={f.val} onClick={() => setStatusFilter(f.val)}
              className={`flex-1 sm:flex-none px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                statusFilter === f.val
                  ? 'bg-orange-500/20 text-orange-300 border border-orange-500/40'
                  : 'text-white/40 border border-white/10 hover:border-white/20'
              }`}>
              {f.label}
            </button>
          ))}
        </div>
        <span className="text-xs text-white/30 text-center sm:text-left">{students.length} result{students.length !== 1 ? 's' : ''}</span>
      </div>

      {error && (
        <div className="px-4 py-3 rounded-xl text-sm text-red-400"
          style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
          {error}
        </div>
      )}

      {/* Table */}
      <div>
        {loading ? (
          <div className="py-12 text-center text-white/30 text-sm rounded-2xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
            Loading students…
          </div>
        ) : (
          <ResponsiveTable
            headers={['Student', 'Contact', 'School / Level', 'Project #', 'Status', 'Registered', 'Actions']}
            data={students}
            emptyMessage={
              search ? 'No students match your search.' : 'No students registered yet.'
            }
            renderRow={(s, i) => (
              <>
                {/* Name + avatar */}
                <td className="px-4 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full flex-shrink-0 overflow-hidden">
                      {s.photo_url ? (
                        <img src={s.photo_url} alt={s.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white text-xs font-bold">
                          {initials(s.name)}
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="font-semibold text-white/90">{s.name}</p>
                      <p className="text-xs text-white/40">{s.email}</p>
                    </div>
                  </div>
                </td>
                {/* Contact */}
                <td className="px-4 py-4">
                  <p className="text-white/60 text-xs">{s.phone || '—'}</p>
                  <p className="text-white/35 text-xs mt-0.5">Parent: {s.parent_phone || '—'}</p>
                </td>
                {/* School */}
                <td className="px-4 py-4">
                  <p className="text-white/70 text-xs">{s.school_name || '—'}</p>
                  <p className="text-white/35 text-xs mt-0.5">{s.level || '—'} · {s.program || '—'}</p>
                </td>
                {/* Project # */}
                <td className="px-4 py-4 text-white/60 text-xs">{s.project_numbers || '—'}</td>
                {/* Status */}
                <td className="px-4 py-4">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${s.is_active ? 'text-green-400 bg-green-400/10' : 'text-red-400 bg-red-400/10'}`}>
                    {s.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                {/* Date */}
                <td className="px-4 py-4 text-white/40 text-xs whitespace-nowrap">{fmt(s.created_at)}</td>
                {/* Actions */}
                <td className="px-4 py-4">
                  <div className="flex gap-1.5">
                    <button onClick={() => setSelected(s)}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold text-blue-300 hover:bg-blue-500/15 transition-all"
                      style={{ border: '1px solid rgba(59,130,246,0.25)' }}>
                      👁 Profile
                    </button>
                    <button onClick={() => setViewPortfolio(s)}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold text-purple-300 hover:bg-purple-500/15 transition-all"
                      style={{ border: '1px solid rgba(168,85,247,0.25)' }}>
                      🗂️ Portfolio
                    </button>
                  </div>
                </td>
              </>
            )}
            renderMobileCard={(s) => (
              <div className="space-y-3">
                {/* Student Info */}
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-full flex-shrink-0 overflow-hidden">
                    {s.photo_url ? (
                      <img src={s.photo_url} alt={s.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white text-sm font-bold">
                        {initials(s.name)}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-white/90 text-sm">{s.name}</p>
                    <p className="text-xs text-white/50 mt-0.5 truncate">{s.email}</p>
                    <div className="mt-2">
                      <span className={`text-xs px-2 py-1 rounded-full font-semibold ${s.is_active ? 'text-green-400 bg-green-400/10' : 'text-red-400 bg-red-400/10'}`}>
                        {s.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <p className="text-white/40 mb-1">Phone</p>
                    <p className="text-white/70">{s.phone || '—'}</p>
                  </div>
                  <div>
                    <p className="text-white/40 mb-1">Parent Phone</p>
                    <p className="text-white/70">{s.parent_phone || '—'}</p>
                  </div>
                  <div>
                    <p className="text-white/40 mb-1">School</p>
                    <p className="text-white/70">{s.school_name || '—'}</p>
                  </div>
                  <div>
                    <p className="text-white/40 mb-1">Level</p>
                    <p className="text-white/70">{s.level || '—'}</p>
                  </div>
                  <div>
                    <p className="text-white/40 mb-1">Project #</p>
                    <p className="text-white/70">{s.project_numbers || '—'}</p>
                  </div>
                  <div>
                    <p className="text-white/40 mb-1">Registered</p>
                    <p className="text-white/70">{fmt(s.created_at)}</p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2 border-t border-white/5">
                  <button onClick={() => setSelected(s)}
                    className="flex-1 px-3 py-2.5 rounded-lg text-xs font-semibold text-blue-300 hover:bg-blue-500/15 transition-all"
                    style={{ border: '1px solid rgba(59,130,246,0.25)' }}>
                    👁 View Profile
                  </button>
                  <button onClick={() => setViewPortfolio(s)}
                    className="flex-1 px-3 py-2.5 rounded-lg text-xs font-semibold text-purple-300 hover:bg-purple-500/15 transition-all"
                    style={{ border: '1px solid rgba(168,85,247,0.25)' }}>
                    🗂️ Portfolio
                  </button>
                </div>
              </div>
            )}
          />
        )}
      </div>

      {/* Profile modal */}
      {selected && (
        <StudentProfileModal
          student={selected}
          onClose={() => setSelected(null)}
        />
      )}

      {/* Portfolio modal */}
      {viewPortfolio && (
        <StudentPortfolioModal
          student={viewPortfolio}
          onClose={() => setViewPortfolio(null)}
        />
      )}
    </div>
  );
}
