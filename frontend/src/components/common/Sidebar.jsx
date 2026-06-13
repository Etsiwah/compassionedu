import { NavLink } from 'react-router-dom';
import { useState } from 'react';

/**
 * Modern glassmorphism sidebar with premium Lucide-style SVG icons
 * Accepts `links` array: [{ to, label, iconName }]
 * Accepts optional `title` for the sidebar header.
 */

// Premium Lucide-style icon components
const Icons = {
  LayoutDashboard: () => (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="9"/>
      <rect x="14" y="3" width="7" height="5"/>
      <rect x="14" y="12" width="7" height="9"/>
      <rect x="3" y="16" width="7" height="5"/>
    </svg>
  ),
  GraduationCap: () => (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
      <path d="M6 12v5c3 3 9 3 12 0v-5"/>
    </svg>
  ),
  Users: () => (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  UserCog: () => (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="18" cy="15" r="3"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M10 15H6a4 4 0 0 0-4 4v2"/>
      <path d="m21.7 16.4-.9-.3m.9 3.8-.9-.3m-2.2-5.6-.9.3m3.1 3.6-.9.3m-1.1-2.6h1m-4 0h1"/>
    </svg>
  ),
  HeartHandshake: () => (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
      <path d="M12 5 9.04 7.96a2.17 2.17 0 0 0 0 3.08v0c.82.82 2.13.85 3 .07l2.07-1.9a2.82 2.82 0 0 1 3.79 0l2.96 2.66"/>
      <path d="m18 15-2-2"/>
      <path d="m15 18-2-2"/>
    </svg>
  ),
  Megaphone: () => (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m3 11 18-5v12L3 14v-3z"/>
      <path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/>
    </svg>
  ),
  BarChart3: () => (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3v18h18"/>
      <path d="M18 17V9"/>
      <path d="M13 17V5"/>
      <path d="M8 17v-3"/>
    </svg>
  ),
  FileCheck: () => (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
      <polyline points="14 2 14 8 20 8"/>
      <path d="m9 15 2 2 4-4"/>
    </svg>
  ),
  Wallet: () => (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/>
      <path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/>
      <path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/>
    </svg>
  ),
  CalendarDays: () => (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
      <line x1="16" y1="2" x2="16" y2="6"/>
      <line x1="8" y1="2" x2="8" y2="6"/>
      <line x1="3" y1="10" x2="21" y2="10"/>
      <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01M16 18h.01"/>
    </svg>
  ),
  HeartPulse: () => (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
      <path d="M3.22 12H9.5l.5-1 2 4.5 2-7 1.5 3.5h5.27"/>
    </svg>
  ),
  History: () => (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3v5h5"/>
      <path d="M3.05 13A9 9 0 1 0 6 5.3L3 8"/>
      <path d="M12 7v5l4 2"/>
    </svg>
  ),
  Bell: () => (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/>
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>
    </svg>
  ),
  Settings: () => (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M12 1v6m0 6v6"/>
      <path d="m15.14 8.86 4.24-4.24m-4.24 10.6 4.24 4.24"/>
      <path d="m8.86 8.86-4.24-4.24m4.24 10.6-4.24 4.24"/>
    </svg>
  ),
  UserCircle: () => (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <circle cx="12" cy="10" r="3"/>
      <path d="M7 20.662V19a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v1.662"/>
    </svg>
  ),
  LogOut: () => (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
      <polyline points="16 17 21 12 16 7"/>
      <line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  ),
};

export default function Sidebar({ links, title }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2.5 rounded-xl transition-all duration-200 hover:scale-105"
        style={{
          background: 'linear-gradient(135deg, #fb923c 0%, #f97316 100%)',
          boxShadow: '0 4px 12px rgba(251, 146, 60, 0.4)',
        }}
        aria-label="Toggle menu"
      >
        {isOpen ? (
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        )}
      </button>

      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-30 transition-opacity duration-300"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-40
          w-64 lg:w-56 min-h-screen flex flex-col py-6 px-3 flex-shrink-0
          transform transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
        style={{
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          background: 'linear-gradient(180deg, rgba(10, 15, 35, 0.98) 0%, rgba(15, 20, 45, 0.96) 100%)',
          borderRight: '1px solid rgba(251, 146, 60, 0.1)',
          boxShadow: '4px 0 32px rgba(0,0,0,0.3), inset -1px 0 0 rgba(251, 146, 60, 0.05)',
        }}
      >
        {/* Optional section title */}
        {title && (
          <div className="px-3 mb-6 mt-12 lg:mt-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-orange-400/60 mb-1">
              {title}
            </p>
            <div className="h-0.5 w-12 bg-gradient-to-r from-orange-400/40 to-transparent rounded-full"/>
          </div>
        )}

        <nav className="flex flex-col gap-1">
          {links.map(({ to, label, iconName }) => {
            const IconComponent = Icons[iconName] || Icons.LayoutDashboard;
            
            return (
              <NavLink
                key={to}
                to={to}
                onClick={() => setIsOpen(false)}
                className={({ isActive }) =>
                  `group flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all duration-300 relative overflow-hidden ${
                    isActive
                      ? 'text-white shadow-lg'
                      : 'text-white/60 hover:text-white hover:bg-white/5'
                  }`
                }
                style={({ isActive }) =>
                  isActive
                    ? {
                        background: 'linear-gradient(135deg, rgba(251, 146, 60, 0.2) 0%, rgba(249, 115, 22, 0.15) 100%)',
                        boxShadow: 'inset 0 0 0 1px rgba(251, 146, 60, 0.3), 0 4px 12px rgba(251, 146, 60, 0.15)',
                      }
                    : {}
                }
              >
                {({ isActive }) => (
                  <>
                    {/* Active indicator */}
                    {isActive && (
                      <div
                        className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 rounded-r-full"
                        style={{
                          background: 'linear-gradient(180deg, #fb923c 0%, #f97316 100%)',
                          boxShadow: '0 0 12px rgba(251, 146, 60, 0.6)',
                        }}
                      />
                    )}

                    {/* Icon container with gradient background */}
                    <span
                      className={`relative flex-shrink-0 flex items-center justify-center w-9 h-9 rounded-lg transition-all duration-300 ${
                        isActive
                          ? 'scale-105'
                          : 'group-hover:scale-105'
                      }`}
                      style={
                        isActive
                          ? {
                              background: 'linear-gradient(135deg, rgba(251, 146, 60, 0.25) 0%, rgba(249, 115, 22, 0.2) 100%)',
                              boxShadow: '0 2px 8px rgba(251, 146, 60, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                            }
                          : {
                              background: 'rgba(255, 255, 255, 0.03)',
                            }
                      }
                    >
                      <span className={isActive ? 'text-orange-400' : 'text-white/60 group-hover:text-white/90'}>
                        <IconComponent />
                      </span>
                    </span>

                    {/* Label */}
                    <span className="truncate font-medium">
                      {label}
                    </span>

                    {/* Hover glow effect */}
                    <div
                      className={`absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none ${
                        isActive ? 'hidden' : ''
                      }`}
                      style={{
                        background: 'radial-gradient(circle at center, rgba(251, 146, 60, 0.08) 0%, transparent 70%)',
                      }}
                    />
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
