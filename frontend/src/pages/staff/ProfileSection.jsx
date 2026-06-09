import { useState, useEffect } from 'react';
import useAuth from '../../hooks/useAuth';
import api from '../../utils/api';

const inputCls = "w-full rounded-xl px-4 py-3 text-sm text-white/90 focus:outline-none focus:ring-2 focus:ring-orange-400/60 transition-all";
const inputStyle = { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' };

function initials(name = '') {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

export default function StaffProfileSection() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState('');
  const [success, setSuccess] = useState('');

  const [form, setForm] = useState({
    name: '',
    phone: '',
    staff_role: '',
    date_of_birth: '',
    cv_url: '',
    portfolio_url: '',
  });

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    api.get(`/profile/${user.id}`)
      .then(r => {
        setProfile(r.data);
        setForm({
          name: r.data.name || '',
          phone: r.data.phone || '',
          staff_role: r.data.staff_role || '',
          date_of_birth: r.data.date_of_birth ? r.data.date_of_birth.slice(0, 10) : '',
          cv_url: r.data.cv_url || '',
          portfolio_url: r.data.portfolio_url || '',
        });
      })
      .catch(e => setError('Failed to load profile details.'))
      .finally(() => setLoading(false));
  }, [user]);

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const { data } = await api.patch(`/profile/${user.id}`, form);
      setProfile(data);
      setSuccess('Profile updated successfully!');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  }

  async function handleUpload(e, field) {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('document_type', field);
    formData.append('title', `${field.toUpperCase()} - ${user.name}`);

    try {
      setSaving(true);
      const { data } = await api.post(`/profile/${user.id}/documents`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setForm(f => ({ ...f, [field === 'cv' ? 'cv_url' : 'portfolio_url']: data.file_url }));
      setSuccess(`File uploaded successfully! Don't forget to click 'Save Profile Details' to apply.`);
    } catch (err) {
      setError('Failed to upload file. ' + (err.response?.data?.error || err.message));
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="py-12 text-center text-white/40">Loading profile…</div>;
  if (!user) return null;

  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold text-white">Staff Profile</h2>
        <p className="text-sm text-white/40 mt-1">Manage your personal information, CV, and portfolio.</p>
      </div>

      <div className="rounded-2xl p-6 relative overflow-hidden"
        style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 4px 24px rgba(0,0,0,0.2)'
        }}>
        
        {/* Header decoration */}
        <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-r from-orange-500/20 to-orange-600/5" />
        
        <div className="relative flex flex-col md:flex-row items-center md:items-end gap-5 mb-8">
          <div className="w-24 h-24 rounded-full flex items-center justify-center text-3xl font-bold text-white shadow-2xl"
            style={{ background: 'linear-gradient(135deg, #f97316, #ea580c)', border: '4px solid rgba(15,26,53,1)' }}>
            {initials(profile?.name || user.name)}
          </div>
          <div className="flex-1 text-center md:text-left">
            <h3 className="text-xl font-bold text-white">{profile?.name || user.name}</h3>
            <p className="text-sm text-white/50">{profile?.email || user.email}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="grid md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-semibold text-white/50 mb-1.5 uppercase tracking-wide">Full Name</label>
              <input type="text" value={form.name} onChange={e => set('name', e.target.value)} className={inputCls} style={inputStyle} required />
            </div>
            <div>
              <label className="block text-xs font-semibold text-white/50 mb-1.5 uppercase tracking-wide">Position / Role</label>
              <input type="text" value={form.staff_role} onChange={e => set('staff_role', e.target.value)} className={inputCls} style={inputStyle} placeholder="e.g. Science Teacher, Manager" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-white/50 mb-1.5 uppercase tracking-wide">Phone Number</label>
              <input type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} className={inputCls} style={inputStyle} placeholder="e.g. +233 20 123 4567" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-white/50 mb-1.5 uppercase tracking-wide">Date of Birth</label>
              <input type="date" value={form.date_of_birth} onChange={e => set('date_of_birth', e.target.value)} className={inputCls} style={inputStyle} />
            </div>
          </div>

          <div className="border-t border-white/10 my-2" />

          <div className="grid md:grid-cols-2 gap-5">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <label className="text-xs font-semibold text-white/50 uppercase tracking-wide">CV / Resume</label>
                {profile?.cv_url && profile?.cv_status === 'pending' && <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-yellow-500/20 text-yellow-300">Pending Approval</span>}
                {profile?.cv_url && profile?.cv_status === 'approved' && <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-green-500/20 text-green-300">Approved</span>}
                {profile?.cv_url && profile?.cv_status === 'rejected' && <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-500/20 text-red-300">Rejected</span>}
              </div>
              <div className="flex gap-2">
                <input type="url" value={form.cv_url} onChange={e => set('cv_url', e.target.value)} className={inputCls} style={inputStyle} placeholder="Enter a link..." />
                <label className="flex items-center justify-center px-4 py-3 rounded-xl cursor-pointer text-sm font-semibold transition-all bg-white/5 hover:bg-white/10 border border-white/10 whitespace-nowrap">
                  <span>Upload File</span>
                  <input type="file" className="hidden" onChange={e => handleUpload(e, 'cv')} accept=".pdf,.doc,.docx" />
                </label>
              </div>
              <p className="text-[10px] text-white/40 mt-1">Provide a public link or upload a file directly.</p>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <label className="text-xs font-semibold text-white/50 uppercase tracking-wide">Portfolio</label>
                {profile?.portfolio_url && profile?.portfolio_status === 'pending' && <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-yellow-500/20 text-yellow-300">Pending Approval</span>}
                {profile?.portfolio_url && profile?.portfolio_status === 'approved' && <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-green-500/20 text-green-300">Approved</span>}
                {profile?.portfolio_url && profile?.portfolio_status === 'rejected' && <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-500/20 text-red-300">Rejected</span>}
              </div>
              <div className="flex gap-2">
                <input type="url" value={form.portfolio_url} onChange={e => set('portfolio_url', e.target.value)} className={inputCls} style={inputStyle} placeholder="Enter a link..." />
                <label className="flex items-center justify-center px-4 py-3 rounded-xl cursor-pointer text-sm font-semibold transition-all bg-white/5 hover:bg-white/10 border border-white/10 whitespace-nowrap">
                  <span>Upload File</span>
                  <input type="file" className="hidden" onChange={e => handleUpload(e, 'portfolio')} accept=".pdf,.jpg,.png,.zip" />
                </label>
              </div>
              <p className="text-[10px] text-white/40 mt-1">Provide a website link or upload your portfolio.</p>
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-400 bg-red-400/10 px-4 py-3 rounded-xl border border-red-400/20">{error}</p>
          )}
          {success && (
            <p className="text-sm text-green-400 bg-green-400/10 px-4 py-3 rounded-xl border border-green-400/20">{success}</p>
          )}

          <div className="flex justify-end pt-2">
            <button type="submit" disabled={saving}
              className="px-8 py-3 rounded-xl text-sm font-bold text-white transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #f97316, #ea580c)', boxShadow: '0 4px 15px rgba(249,115,22,0.4)' }}>
              {saving ? 'Saving...' : 'Save Profile Details'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
