import ThemeToggle from './ThemeToggle';
import NotificationBell from './NotificationBell';
import ProfileDropdown from './ProfileDropdown';
import useAuth from '../../hooks/useAuth';

/**
 * Glassmorphism top navigation bar.
 * - Profile picture + name + role badge anchored to the TOP LEFT
 * - Notification bell + theme toggle on the right
 */
export default function Navbar() {
  const auth = useAuth();
  const user = auth?.user;

  return (
    <nav
      className="sticky top-0 z-50 flex items-center justify-between px-4 py-2.5"
      style={{
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        background: 'rgba(10, 15, 35, 0.75)',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        boxShadow: '0 4px 24px rgba(0,0,0,0.25)',
        minHeight: '56px',
      }}
    >
      {/* ── LEFT: profile identity area ── */}
      <div className="flex items-center gap-3">
        {user ? (
          <ProfileDropdown />
        ) : (
          <span className="font-bold text-orange-400 text-lg tracking-tight">CompassionEdu</span>
        )}
      </div>

      {/* ── RIGHT: actions ── */}
      <div className="flex items-center gap-1">
        {user && <NotificationBell />}
        <ThemeToggle />
      </div>
    </nav>
  );
}
