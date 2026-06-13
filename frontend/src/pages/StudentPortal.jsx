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
  { to: '/student/home',          label: 'Dashboard',      iconName: 'LayoutDashboard' },
  { to: '/student/profile',       label: 'Profile',        iconName: 'UserCircle' },
  { to: '/student/results',       label: 'Results',        iconName: 'FileCheck' },
  { to: '/student/fees',          label: 'Fees',           iconName: 'Wallet' },
  { to: '/student/attendance',    label: 'Attendance',     iconName: 'CalendarDays' },
  { to: '/student/activities',    label: 'Activities',     iconName: 'CalendarDays' },
  { to: '/student/portfolio',     label: 'Portfolio',      iconName: 'FileCheck' },
  { to: '/student/health',        label: 'Health',         iconName: 'HeartPulse' },
  { to: '/student/announcements', label: 'Announcements',  iconName: 'Megaphone' },
  { to: '/settings',              label: 'Settings',       iconName: 'Settings' },
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
