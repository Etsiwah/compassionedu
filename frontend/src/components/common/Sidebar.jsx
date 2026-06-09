import { NavLink } from 'react-router-dom';

/**
 * Glassmorphism sidebar navigation.
 * Accepts `links` array: [{ to, label, icon }]
 * Accepts optional `title` for the sidebar header.
 */
export default function Sidebar({ links, title }) {
  return (
    <aside
      className="w-56 min-h-screen flex flex-col py-4 px-3 flex-shrink-0"
      style={{
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        background: 'rgba(10, 15, 35, 0.6)',
        borderRight: '1px solid rgba(255,255,255,0.07)',
        boxShadow: '4px 0 24px rgba(0,0,0,0.2)',
      }}
    >
      {/* Optional section title */}
      {title && (
        <p className="text-[10px] font-semibold uppercase tracking-widest text-white/30 px-3 mb-3">
          {title}
        </p>
      )}

      <nav className="flex flex-col gap-0.5">
        {links.map(({ to, label, icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                isActive
                  ? 'bg-orange-500/20 text-orange-300 shadow-sm'
                  : 'text-white/55 hover:text-white/90 hover:bg-white/6'
              }`
            }
            style={({ isActive }) =>
              isActive
                ? { boxShadow: 'inset 0 0 0 1px rgba(251,146,60,0.25)' }
                : {}
            }
          >
            {icon && (
              <span className="text-base leading-none w-5 text-center flex-shrink-0" aria-hidden="true">
                {icon}
              </span>
            )}
            <span className="truncate">{label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
