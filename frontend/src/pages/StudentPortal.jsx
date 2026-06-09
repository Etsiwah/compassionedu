import { Routes, Route, Navigate } from 'react-router-dom';
import Navbar from '../components/common/Navbar';
import Sidebar from '../components/common/Sidebar';
import useAuth from '../hooks/useAuth';

import ProfileSection       from './student/ProfileSection';
import FeesSection          from './student/FeesSection';
import ResultsSection       from './student/ResultsSection';
import AttendanceSection    from './student/AttendanceSection';
import PortfolioSection     from './student/PortfolioSection';
import StudentDashboardHome from './student/StudentDashboardHome';
import ActivitiesSection    from './student/ActivitiesSection';
import AnnouncementsSection from './student/AnnouncementsSection';
import HealthSection        from './student/HealthSection';

const LINKS = [
  { to: '/student/home',          label: 'Dashboard',      icon: '🏠' },
  { to: '/student/profile',       label: 'Profile',        icon: '👤' },
  { to: '/student/results',       label: 'Results',        icon: '📊' },
  { to: '/student/fees',          label: 'Fees',           icon: '💳' },
  { to: '/student/attendance',    label: 'Attendance',     icon: '📅' },
  { to: '/student/activities',    label: 'Activities',     icon: '🏃' },
  { to: '/student/portfolio',     label: 'Portfolio',      icon: '🗂️' },
  { to: '/student/health',        label: 'Health',         icon: '🏥' },
  { to: '/student/announcements', label: 'Announcements',  icon: '📢' },
  { to: '/settings',              label: 'Settings',       icon: '⚙️' },
];

export default function StudentPortal() {
  const { user } = useAuth();
  const studentId = user?.sub || user?.id;

  return (
    <div
      className="flex flex-col min-h-screen"
      style={{ background: 'linear-gradient(135deg, #0a0f23 0%, #0f1a35 50%, #0a0f23 100%)' }}
    >
      <Navbar />
      <div className="flex flex-1">
        <Sidebar links={LINKS} title="Student Portal" />
        <main className="flex-1 p-6 overflow-y-auto">
          <Routes>
            <Route path="home"          element={<StudentDashboardHome studentId={studentId} />} />
            <Route path="profile"       element={<ProfileSection       studentId={studentId} />} />
            <Route path="fees"          element={<FeesSection          studentId={studentId} />} />
            <Route path="results"       element={<ResultsSection       studentId={studentId} />} />
            <Route path="attendance"    element={<AttendanceSection    studentId={studentId} />} />
            <Route path="portfolio"     element={<PortfolioSection     studentId={studentId} />} />
            <Route path="activities"    element={<ActivitiesSection    studentId={studentId} />} />
            <Route path="health"        element={<HealthSection />} />
            <Route path="announcements" element={<AnnouncementsSection />} />
            <Route path="*"             element={<Navigate to="home" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
