import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import { useThemeContext } from '../context/ThemeContext';
import api from '../utils/api';
import Navbar from '../components/common/Navbar';

/* ── Shared glass card ── */
function Section({ title, children }) {
  return (
    <div
      className="rounded-2xl p-5 mb-4"
      style={{
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        background: 'rgba(255,255,255,0.06)',
        border: '1px solid rgba(255,255,255,0.1)',
        boxShadow: '0 4px 24px rgba(0,0,0,0.2)',
      }}
    >
      <h3 className="text-sm font-semibold text-white/80 mb-4 uppercase tracking-wide">{title}</h3>
      {children}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div className="mb-4">
      <label className="block text-xs font-medium text-white/50 mb-1.5">{label}</label>
      {children}
    </div>
  );
}

const inputCls = `w-full rounded-xl px-3 py-2.5 text-sm text-white/90 focus:outline-none focus:ring-2 focus:ring-orange-400/60`;
const inputStyle = {
  background: 'rgba(255,255,255,0.08)',
  border: '1px solid rgba(255,255,255,0.12)',
};

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useThemeContext();
  const navigate = useNavigate();

  const role = user?.role || 'student';

  // Profile picture
  const photoInputRef = useRef();
  const [photoUrl, setPhotoUrl]       = useState(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoMsg, setPhotoMsg]       = useState('');
  const initials = (user?.name || 'U').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  useEffect(() => {
    if (!user) return;
    api.get(`/profile/${user.sub || user.id}`)
      .then(r => setPhotoUrl(r.data?.photo_url || null))
      .catch(() => {});
  }, [user]);

  async function handlePhotoChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    setPhotoMsg('');
    setPhotoUploading(true);
    try {
      const form = new FormData();
      form.append('photo', file);
      const { data } = await api.post(
        `/profile/${user.sub || user.id}/photos`,
        form,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );
      setPhotoUrl(data?.url || data?.photo_url || null);
      setPhotoMsg('✅ Photo updated.');
    } catch (err) {
      setPhotoMsg(err.response?.data?.error || '❌ Upload failed.');
    } finally {
      setPhotoUploading(false);
      if (photoInputRef.current) photoInputRef.current.value = '';
    }
  }

  // Account fields
  const [name, setName]       = useState(user?.name || '');
  const [email, setEmail]     = useState(user?.email || '');
  const [saving, setSaving]   = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  // Password fields
  const [currentPw, setCurrentPw]   = useState('');
  const [newPw, setNewPw]           = useState('');
  const [confirmPw, setConfirmPw]   = useState('');
  const [pwMsg, setPwMsg]           = useState('');
  const [pwSaving, setPwSaving]     = useState(false);

  // Notification prefs (local only — extend with API as needed)
  const [notifPush, setNotifPush]           = useState(true);
  const [notifEmail, setNotifEmail]         = useState(true);
  const [notifAnnouncements, setNotifAnnouncements] = useState(true);

  // Accent colour
  const [accent, setAccent] = useState(
    localStorage.getItem('ce_accent') || 'orange'
  );
  const ACCENTS = [
    { id: 'orange', label: 'Orange', hex: '#f97316' },
    { id: 'blue',   label: 'Blue',   hex: '#3b82f6' },
    { id: 'green',  label: 'Green',  hex: '#22c55e' },
    { id: 'purple', label: 'Purple', hex: '#a855f7' },
  ];

  async function handleSaveAccount(e) {
    e.preventDefault();
    setSaving(true);
    setSaveMsg('');
    try {
      await api.patch('/profile/extended', { name, email });
      setSaveMsg('✅ Profile updated.');
    } catch (err) {
      setSaveMsg(err.response?.data?.error || '❌ Failed to save.');
    } finally {
      setSaving(false);
    }
  }

  async function handleChangePassword(e) {
    e.preventDefault();
    if (newPw !== confirmPw) { setPwMsg('❌ Passwords do not match.'); return; }
    if (newPw.length < 6)    { setPwMsg('❌ Password must be at least 6 characters.'); return; }
    setPwSaving(true);
    setPwMsg('');
    try {
      await api.post('/auth/change-password', { currentPassword: currentPw, newPassword: newPw });
      setPwMsg('✅ Password changed.');
      setCurrentPw(''); setNewPw(''); setConfirmPw('');
    } catch (err) {
      setPwMsg(err.response?.data?.error || '❌ Failed to change password.');
    } finally {
      setPwSaving(false);
    }
  }

  function handleAccent(id) {
    setAccent(id);
    localStorage.setItem('ce_accent', id);
  }

  return (
    <div
      className="min-h-screen"
      style={{ background: 'linear-gradient(135deg, #0a0f23 0%, #0f1a35 50%, #0a0f23 100%)' }}
    >
      <Navbar />

      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Page header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-xl text-white/50 hover:text-white/90 hover:bg-white/8 transition-all"
          >
            ←
          </button>
          <div>
            <h1 className="text-xl font-bold text-white">Settings</h1>
            <p className="text-xs text-white/40">Manage your account and preferences</p>
          </div>
        </div>

        {/* ── Account ── */}
        <Section title="Account">
          {/* Profile picture */}
          <div className="flex items-center gap-4 mb-5 pb-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="relative">
              <div className="w-16 h-16 rounded-full overflow-hidden ring-2 ring-orange-400/50">
                {photoUrl ? (
                  <img src={photoUrl} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-bold text-lg">
                    {initials}
                  </div>
                )}
              </div>
              <button
                onClick={() => photoInputRef.current?.click()}
                disabled={photoUploading}
                className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center text-xs transition-all"
                style={{ background: '#f97316', border: '2px solid rgba(10,15,35,1)' }}
                title="Change photo"
              >
                {photoUploading ? '…' : '✏️'}
              </button>
              <input
                ref={photoInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handlePhotoChange}
                aria-label="Upload profile photo"
              />
            </div>
            <div>
              <p className="text-sm font-semibold text-white/90">{user?.name}</p>
              <p className="text-xs text-white/40">{user?.email}</p>
              <button
                onClick={() => photoInputRef.current?.click()}
                disabled={photoUploading}
                className="text-xs text-orange-400 hover:text-orange-300 mt-1 transition-colors disabled:opacity-50"
              >
                {photoUploading ? 'Uploading…' : 'Change photo'}
              </button>
              {photoMsg && <p className="text-xs text-white/60 mt-0.5">{photoMsg}</p>}
            </div>
          </div>

          <form onSubmit={handleSaveAccount}>
            <Field label="Full Name">
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                className={inputCls}
                style={inputStyle}
              />
            </Field>
            <Field label="Email Address">
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className={inputCls}
                style={inputStyle}
              />
            </Field>
            {saveMsg && <p className="text-xs mb-3 text-white/70">{saveMsg}</p>}
            <button
              type="submit"
              disabled={saving}
              className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white text-sm font-medium px-5 py-2 rounded-xl transition-colors"
            >
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </form>
        </Section>

        {/* ── Appearance ── */}
        <Section title="Appearance">
          <Field label="Theme">
            <div className="flex gap-2">
              {['light', 'dark'].map(t => (
                <button
                  key={t}
                  onClick={() => { if ((t === 'dark') !== isDark) toggleTheme(); }}
                  className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all border ${
                    (t === 'dark') === isDark
                      ? 'bg-orange-500/20 text-orange-300 border-orange-500/40'
                      : 'text-white/50 border-white/10 hover:border-white/20'
                  }`}
                >
                  {t === 'dark' ? '🌙 Dark' : '☀️ Light'}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Accent Colour">
            <div className="flex gap-2">
              {ACCENTS.map(a => (
                <button
                  key={a.id}
                  onClick={() => handleAccent(a.id)}
                  title={a.label}
                  className={`w-8 h-8 rounded-full transition-all ${accent === a.id ? 'ring-2 ring-white/60 scale-110' : 'opacity-60 hover:opacity-90'}`}
                  style={{ background: a.hex }}
                />
              ))}
            </div>
          </Field>
        </Section>

        {/* ── Notifications ── */}
        <Section title="Notifications">
          {[
            { label: 'Push Notifications', value: notifPush, set: setNotifPush },
            { label: 'Email Notifications', value: notifEmail, set: setNotifEmail },
            { label: 'Announcements', value: notifAnnouncements, set: setNotifAnnouncements },
          ].map(({ label, value, set }) => (
            <div key={label} className="flex items-center justify-between py-2.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <span className="text-sm text-white/70">{label}</span>
              <button
                onClick={() => set(v => !v)}
                className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${value ? 'bg-orange-500' : 'bg-white/15'}`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${value ? 'translate-x-5' : ''}`}
                />
              </button>
            </div>
          ))}
        </Section>

        {/* ── Security ── */}
        <Section title="Security">
          <form onSubmit={handleChangePassword}>
            <Field label="Current Password">
              <input
                type="password"
                value={currentPw}
                onChange={e => setCurrentPw(e.target.value)}
                className={inputCls}
                style={inputStyle}
                placeholder="••••••••"
              />
            </Field>
            <Field label="New Password">
              <input
                type="password"
                value={newPw}
                onChange={e => setNewPw(e.target.value)}
                className={inputCls}
                style={inputStyle}
                placeholder="Min. 6 characters"
              />
            </Field>
            <Field label="Confirm New Password">
              <input
                type="password"
                value={confirmPw}
                onChange={e => setConfirmPw(e.target.value)}
                className={inputCls}
                style={inputStyle}
                placeholder="••••••••"
              />
            </Field>
            {pwMsg && <p className="text-xs mb-3 text-white/70">{pwMsg}</p>}
            <button
              type="submit"
              disabled={pwSaving}
              className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white text-sm font-medium px-5 py-2 rounded-xl transition-colors"
            >
              {pwSaving ? 'Changing…' : 'Change Password'}
            </button>
          </form>

          {/* Session history */}
          <div className="mt-5 pt-5" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
            <p className="text-xs font-semibold text-white/40 uppercase tracking-wide mb-3">Session History</p>
            <div
              className="rounded-xl px-4 py-3 flex items-center justify-between"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
            >
              <div>
                <p className="text-sm text-white/70 font-medium">Current session</p>
                <p className="text-xs text-white/30 mt-0.5">This device · Active now</p>
              </div>
              <span className="text-xs text-green-400 font-medium px-2 py-0.5 rounded-full" style={{ background: 'rgba(34,197,94,0.1)' }}>
                Active
              </span>
            </div>
            <button
              onClick={() => {
                api.post('/auth/logout').catch(() => {});
                logout();
                navigate('/login', { replace: true });
              }}
              className="mt-3 text-xs text-red-400 hover:text-red-300 transition-colors"
            >
              Sign out all other sessions
            </button>
          </div>
        </Section>

        {/* ── Student-only: Education & Beneficiary ── */}
        {role === 'student' && (
          <Section title="Education & Beneficiary Info">
            <p className="text-sm text-white/50 mb-3">
              Your education and beneficiary details are managed by your admin. Contact your administrator to update these fields.
            </p>
            <button
              onClick={() => navigate('/student/profile')}
              className="text-sm text-orange-400 hover:text-orange-300 font-medium transition-colors"
            >
              View my full profile →
            </button>
          </Section>
        )}

        {/* ── Admin-only: System settings ── */}
        {role === 'admin' && (
          <Section title="Admin Controls">
            <div className="flex flex-col gap-2">
              <button
                onClick={() => navigate('/admin/users')}
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-white/70 hover:text-white hover:bg-white/8 transition-all text-left"
                style={{ border: '1px solid rgba(255,255,255,0.08)' }}
              >
                <span>👥</span>
                <div>
                  <p className="font-medium">User Management</p>
                  <p className="text-xs text-white/40">Create, edit, and deactivate accounts</p>
                </div>
              </button>
              <button
                onClick={() => navigate('/admin/content')}
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-white/70 hover:text-white hover:bg-white/8 transition-all text-left"
                style={{ border: '1px solid rgba(255,255,255,0.08)' }}
              >
                <span>🛡️</span>
                <div>
                  <p className="font-medium">Content Moderation</p>
                  <p className="text-xs text-white/40">Review and moderate uploaded content</p>
                </div>
              </button>
            </div>
          </Section>
        )}

        {/* ── Sign out ── */}
        <div className="mt-2">
          <button
            onClick={() => {
              api.post('/auth/logout').catch(() => {});
              logout();
              navigate('/login', { replace: true });
            }}
            className="w-full py-3 rounded-2xl text-sm font-medium text-red-400 transition-all hover:bg-red-500/10"
            style={{ border: '1px solid rgba(239,68,68,0.2)' }}
          >
            🚪 Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
