import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import api from '../../utils/api';

/** Maps role → display label shown in the badge */
const ROLE_LABELS = {
  admin:   'Super Admin',
  staff:   'Teacher',
  teacher: 'Teacher',
  student: 'Student',
  parent:  'Parent',
};

/** Maps role → badge colour classes */
const ROLE_COLOURS = {
  admin:   'bg-orange-500/20 text-orange-300 border-orange-500/30',
  staff:   'bg-blue-500/20 text-blue-300 border-blue-500/30',
  teacher: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  student: 'bg-green-500/20 text-green-300 border-green-500/30',
  parent:  'bg-purple-500/20 text-purple-300 border-purple-500/30',
};

/** Maps role → human-readable role name shown in the dropdown header */
const ROLE_NAMES = {
  admin:   'Admin',
  staff:   'Staff',
  teacher: 'Teacher',
  student: 'Beneficiary',
  parent:  'Parent',
};

export default function ProfileDropdown() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [profile, setProfile] = useState(null);
  const ref = useRef();

  // Load extended profile data (photo, project/beneficiary numbers, etc.)
  useEffect(() => {
    if (!user) return;
    api.get(`/profile/${user.sub || user.id}`)
      .then(r => setProfile(r.data))
      .catch(() => {}); // fail silently — we fall back to user object
  }, [user]);

  // Close on outside click
  useEffect(() => {
    function onMouseDown(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, []);

  if (!user) return null;

  const role       = user.role || 'student';
  const name       = user.name || 'User';
  const email      = user.email || '';
  const photoUrl   = profile?.photo_url || null;
  const initials   = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  const roleDest = {
    admin:   '/admin',
    staff:   '/staff',
    teacher: '/teacher',
    student: '/student',
    parent:  '/parent',
  };

  function handleLogout() {
    const refreshToken = localStorage.getItem('ce_refresh_token');
    api.post('/auth/logout', { refreshToken }).catch(() => {});
    logout();
    navigate('/login', { replace: true });
  }

  return (
    <div className="relative" ref={ref}>
      {/* ── Trigger: profile picture + name + role badge ── */}
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2.5 px-2 py-1.5 rounded-xl transition-all duration-200 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-orange-400/50"
        aria-label="Open profile menu"
        aria-expanded={open}
      >
        {/* Avatar */}
        <div className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0 ring-2 ring-orange-400/60">
          {photoUrl ? (
            <img src={photoUrl} alt={name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white text-sm font-bold">
              {initials}
            </div>
          )}
        </div>

        {/* Name + role */}
        <div className="hidden sm:flex flex-col items-start leading-tight">
          <span className="text-sm font-semibold text-white/90 truncate max-w-[120px]">{name}</span>
          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full border ${ROLE_COLOURS[role] || ROLE_COLOURS.student}`}>
            {ROLE_NAMES[role]} • {ROLE_LABELS[role]}
          </span>
        </div>

        {/* Chevron */}
        <svg
          className={`w-3.5 h-3.5 text-white/50 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* ── Dropdown panel ── */}
      {open && (
        <div
          className="absolute left-0 top-full mt-2 w-72 z-50 rounded-2xl overflow-hidden"
          style={{
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            background: 'rgba(15, 20, 40, 0.85)',
            border: '1px solid rgba(255,255,255,0.12)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08)',
            animation: 'dropdownIn 0.18s ease-out',
          }}
        >
          <style>{`
            @keyframes dropdownIn {
              from { opacity: 0; transform: translateY(-6px) scale(0.97); }
              to   { opacity: 1; transform: translateY(0) scale(1); }
            }
          `}</style>

          {/* Header */}
          <div className="p-4 flex items-center gap-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0 ring-2 ring-orange-400/50">
              {photoUrl ? (
                <img src={photoUrl} alt={name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-bold text-base">
                  {initials}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">{name}</p>
              <p className="text-xs text-white/50 truncate">{email}</p>
              <span className={`inline-block mt-1 text-[10px] font-medium px-2 py-0.5 rounded-full border ${ROLE_COLOURS[role] || ROLE_COLOURS.student}`}>
                {ROLE_NAMES[role]} • {ROLE_LABELS[role]}
              </span>
            </div>
          </div>

          {/* Student-specific fields */}
          {role === 'student' && (profile?.project_number || profile?.beneficiary_number || profile?.school_name || profile?.current_level) && (
            <div className="px-4 py-3 grid grid-cols-2 gap-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              {profile?.project_number && (
                <div>
                  <p className="text-[10px] text-white/40 uppercase tracking-wide">Project #</p>
                  <p className="text-xs text-white/80 font-medium">{profile.project_number}</p>
                </div>
              )}
              {profile?.beneficiary_number && (
                <div>
                  <p className="text-[10px] text-white/40 uppercase tracking-wide">Beneficiary #</p>
                  <p className="text-xs text-white/80 font-medium">{profile.beneficiary_number}</p>
                </div>
              )}
              {profile?.school_name && (
                <div>
                  <p className="text-[10px] text-white/40 uppercase tracking-wide">School</p>
                  <p className="text-xs text-white/80 font-medium truncate">{profile.school_name}</p>
                </div>
              )}
              {profile?.current_level && (
                <div>
                  <p className="text-[10px] text-white/40 uppercase tracking-wide">Level</p>
                  <p className="text-xs text-white/80 font-medium">{profile.current_level}</p>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="p-2">
            <DropdownItem
              icon="👤"
              label="View Profile"
              onClick={() => { setOpen(false); navigate(`${roleDest[role]}/profile`); }}
            />
            <DropdownItem
              icon="⚙️"
              label="Settings"
              onClick={() => { setOpen(false); navigate('/settings'); }}
            />
            <div style={{ margin: '4px 0', borderTop: '1px solid rgba(255,255,255,0.08)' }} />
            <DropdownItem
              icon="🚪"
              label="Sign Out"
              danger
              onClick={handleLogout}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function DropdownItem({ icon, label, onClick, danger }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-150 text-left ${
        danger
          ? 'text-red-400 hover:bg-red-500/10'
          : 'text-white/80 hover:bg-white/8 hover:text-white'
      }`}
      style={!danger ? { '--tw-bg-opacity': 1 } : {}}
    >
      <span className="text-base leading-none">{icon}</span>
      <span className="font-medium">{label}</span>
    </button>
  );
}
