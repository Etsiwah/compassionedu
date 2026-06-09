import { useState, useEffect, useRef } from 'react';
import api from '../utils/api';

/* ── helpers ── */
const val = v => (v !== null && v !== undefined && v !== '')
  ? v
  : <span className="text-white/25 italic">Not Provided</span>;

function fmt(dateStr) {
  if (!dateStr) return null;
  try {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  } catch { return dateStr; }
}

/* ── glass section card ── */
function Section({ title, icon, children, fullWidth }) {
  return (
    <div
      className={fullWidth ? 'col-span-1 sm:col-span-2' : ''}
      style={{
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.09)',
        borderRadius: '1rem',
        overflow: 'hidden',
      }}
    >
      <div
        className="flex items-center gap-2 px-5 py-3.5"
        style={{
          borderBottom: '1px solid rgba(255,255,255,0.07)',
          background: 'rgba(255,255,255,0.03)',
        }}
      >
        <span className="text-base">{icon}</span>
        <h3 className="text-xs font-bold text-white/60 uppercase tracking-widest">{title}</h3>
      </div>
      <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
        {children}
      </div>
    </div>
  );
}

/* ── read-only field ── */
function Field({ label, value }) {
  return (
    <div>
      <p className="text-[10px] font-semibold text-white/40 uppercase tracking-wide mb-0.5">{label}</p>
      <p className="text-sm text-white/85 font-medium">{val(value)}</p>
    </div>
  );
}

/* ── loading spinner ── */
function Spinner() {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4" role="status">
      <div
        className="w-10 h-10 rounded-full border-4 animate-spin"
        style={{ borderColor: 'rgba(249,115,22,0.2)', borderTopColor: '#f97316' }}
      />
      <p className="text-sm text-white/40">Loading profile…</p>
    </div>
  );
}

/* ── error banner ── */
function ErrorBanner({ message }) {
  return (
    <div
      className="rounded-2xl p-5 flex items-start gap-4"
      style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)' }}
      role="alert"
    >
      <span className="text-2xl flex-shrink-0">⚠️</span>
      <div>
        <p className="text-sm font-semibold text-red-300 mb-1">Failed to load profile</p>
        <p className="text-sm text-red-400/80">
          {message || 'Something went wrong. Please refresh the page.'}
        </p>
      </div>
    </div>
  );
}

/* ── main component ── */
export default function StaffProfile() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoMsg, setPhotoMsg] = useState('');
  const photoRef = useRef();

  function load() {
    setLoading(true);
    api.get('/staff-portal/me/profile')
      .then(r => { setProfile(r.data); setError(''); })
      .catch(e => setError(e.response?.data?.error || 'Failed to load profile'))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function handlePhotoChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    setPhotoUploading(true);
    setPhotoMsg('');
    try {
      const fd = new FormData();
      fd.append('photo', file);
      await api.post(`/profile/${profile.id}/photos`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      load();
    } catch (err) {
      setPhotoMsg(err.response?.data?.error || '❌ Photo upload failed.');
    } finally {
      setPhotoUploading(false);
      if (photoRef.current) photoRef.current.value = '';
    }
  }

  if (loading) return <Spinner />;
  if (error)   return <ErrorBanner message={error} />;
  if (!profile) return null;

  const initials = (profile.name || 'S')
    .split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  const joinedDate = fmt(profile.created_at);

  return (
    <div className="flex flex-col gap-5 max-w-3xl">

      {/* ── page header ── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-bold text-white">My Profile</h2>
          <p className="text-sm text-white/40 mt-0.5">View your staff profile information</p>
        </div>
      </div>

      {photoMsg && (
        <p
          className={`text-sm px-4 py-2.5 rounded-xl ${photoMsg.startsWith('❌') ? 'text-red-400' : 'text-green-400'}`}
          style={{ background: photoMsg.startsWith('❌') ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)' }}
        >
          {photoMsg}
        </p>
      )}

      {/* ── avatar / name banner ── */}
      <div
        className="rounded-2xl p-5 flex items-center gap-5"
        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)' }}
      >
        <div className="relative flex-shrink-0">
          <div className="w-20 h-20 rounded-full overflow-hidden ring-2 ring-orange-400/50">
            {profile.photo_url ? (
              <img src={profile.photo_url} alt={profile.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-bold text-xl">
                {initials}
              </div>
            )}
          </div>
          <button
            onClick={() => photoRef.current?.click()}
            disabled={photoUploading}
            className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full flex items-center justify-center text-xs transition-all disabled:opacity-50"
            style={{ background: '#f97316', border: '2px solid rgba(10,15,35,1)' }}
            title="Change photo"
          >
            {photoUploading ? '…' : '📷'}
          </button>
          <input
            ref={photoRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handlePhotoChange}
          />
        </div>

        <div>
          <h3 className="text-lg font-bold text-white">{profile.name || 'Staff Member'}</h3>
          <p className="text-sm text-white/50">{profile.email}</p>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            {profile.staff_role && (
              <span
                className="text-xs font-semibold px-2 py-0.5 rounded-full"
                style={{ background: 'rgba(249,115,22,0.12)', border: '1px solid rgba(249,115,22,0.25)', color: '#f97316' }}
              >
                Staff • {profile.staff_role}
              </span>
            )}
            <span
              className={`text-xs font-semibold px-2 py-0.5 rounded-full ${profile.is_active ? 'text-green-400' : 'text-red-400'}`}
              style={{ background: profile.is_active ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)' }}
            >
              {profile.is_active ? 'Active' : 'Inactive'}
            </span>
          </div>
        </div>
      </div>

      {/* ── Personal Details ── */}
      <Section title="Personal Details" icon="👤">
        <Field label="Full Name"    value={profile.name} />
        <Field label="Staff ID"     value={profile.id} />
        <Field label="Phone Number" value={profile.phone} />
        <Field label="Age"          value={profile.age} />
        <Field label="Gender"       value={profile.gender} />
        <Field label="Email Address" value={profile.email} />
      </Section>

      {/* ── Employment Details ── */}
      <Section title="Employment Details" icon="💼">
        <Field label="Role"        value={profile.staff_role} />
        <Field label="Department"  value={profile.department} />
        <Field label="Date Joined" value={joinedDate} />
      </Section>

      {/* ── Documents ── */}
      <Section title="Documents" icon="📄">
        <div className="col-span-1 sm:col-span-2">
          {profile.cv_url ? (
            <div className="flex gap-3 flex-wrap">
              <a
                href={profile.cv_url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:scale-[1.02]"
                style={{ background: '#f97316', boxShadow: '0 2px 12px rgba(249,115,22,0.3)' }}
              >
                View CV
              </a>
              <a
                href={profile.cv_url}
                download
                className="px-4 py-2 rounded-xl text-sm font-semibold transition-all hover:scale-[1.02]"
                style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.8)' }}
              >
                Download CV
              </a>
            </div>
          ) : (
            <p className="text-sm text-white/25 italic">No CV on file</p>
          )}
        </div>
      </Section>

      {/* ── Portfolio ── */}
      <Section title="Portfolio" icon="🌐">
        <div className="col-span-1 sm:col-span-2">
          {profile.portfolio_url ? (
            <div className="flex flex-col gap-2">
              <a
                href={profile.portfolio_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block px-4 py-2 rounded-xl text-sm font-semibold transition-all hover:scale-[1.02] self-start"
                style={{ background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)', color: '#93c5fd' }}
              >
                Open Portfolio ↗
              </a>
              <a
                href={profile.portfolio_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-white/40 hover:text-white/60 break-all transition-colors"
              >
                {profile.portfolio_url}
              </a>
            </div>
          ) : (
            <p className="text-sm text-white/25 italic">No portfolio link on file</p>
          )}
        </div>
      </Section>

      {/* ── Bio ── */}
      <Section title="Bio / About Me" icon="📝">
        <div className="col-span-1 sm:col-span-2">
          {profile.bio ? (
            <p className="text-sm text-white/75 leading-relaxed">{profile.bio}</p>
          ) : (
            <p className="text-sm text-white/25 italic">No bio provided.</p>
          )}
        </div>
      </Section>

    </div>
  );
}
