import { useState, useEffect } from 'react';
import useAuth from '../../hooks/useAuth';
import api from '../../utils/api';

export default function AdminProfileSection() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    if (!user) return;
    api.get(`/profile/${user.sub || user.id}`)
      .then(res => setProfile(res.data))
      .catch(() => {});
  }, [user]);

  if (!user) return null;

  const roleLabels = {
    admin: 'Super Admin',
    staff: 'Staff',
  };

  const initials = user.name
    ? user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
    : 'A';

  const phone = profile?.phone || 'Not provided';
  const name = user.name || profile?.name || 'Administrator';

  return (
    <div className="max-w-3xl flex flex-col gap-6">
      <div className="mb-2">
        <h2 className="text-2xl font-bold text-white">Admin Profile</h2>
        <p className="mt-1 text-sm text-white/50">View your administrator details.</p>
      </div>

      <div
        className="rounded-2xl p-8 flex flex-col sm:flex-row gap-8 items-center sm:items-start"
        style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
        }}
      >
        <div className="w-32 h-32 rounded-full overflow-hidden shrink-0 flex items-center justify-center bg-gradient-to-br from-orange-400 to-orange-600 shadow-xl shadow-orange-500/20 ring-4 ring-orange-500/20">
          <span className="text-5xl font-bold text-white tracking-wider">{initials}</span>
        </div>

        <div className="flex flex-col flex-1 w-full gap-4">
          <div>
            <h3 className="text-3xl font-bold text-white mb-1">{name}</h3>
            <span className="inline-block px-3 py-1 bg-orange-500/20 text-orange-300 border border-orange-500/30 rounded-full text-xs font-semibold tracking-wider uppercase">
              {roleLabels[user.role] || user.role || 'Administrator'}
            </span>
          </div>

          <div className="grid md:grid-cols-2 gap-4 mt-2">
            <div className="bg-white/5 rounded-xl p-4 border border-white/10 flex flex-col gap-1">
              <span className="text-xs uppercase tracking-wide text-white/40 font-semibold">Full Name</span>
              <span className="text-white font-medium">{name}</span>
            </div>

            <div className="bg-white/5 rounded-xl p-4 border border-white/10 flex flex-col gap-1">
              <span className="text-xs uppercase tracking-wide text-white/40 font-semibold">Email Address</span>
              <span className="text-white font-medium">{user.email}</span>
            </div>
            
            <div className="bg-white/5 rounded-xl p-4 border border-white/10 flex flex-col gap-1">
              <span className="text-xs uppercase tracking-wide text-white/40 font-semibold">Telephone</span>
              <span className="text-white font-medium">{phone}</span>
            </div>

            <div className="bg-white/5 rounded-xl p-4 border border-white/10 flex flex-col gap-1 md:col-span-2">
              <span className="text-xs uppercase tracking-wide text-white/40 font-semibold">Position / Role</span>
              <span className="text-white font-medium capitalize">{roleLabels[user.role] || user.role || 'Administrator'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
