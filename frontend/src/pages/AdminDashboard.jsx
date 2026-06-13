import { Routes, Route, Navigate } from 'react-router-dom';
import Navbar from '../components/common/Navbar';
import Sidebar from '../components/common/Sidebar';
import DashboardSection from './admin/DashboardSection';
import UsersSection from './admin/UsersSection';
import ModerationSection from './admin/ModerationSection';
import AnnouncementsSection from './admin/AnnouncementsSection';
import AnnouncementRepliesSection from './admin/AnnouncementRepliesSection';
import BeneficiariesSection from './admin/BeneficiariesSection';
import StaffSection from './admin/StaffSection';
import ActivityLogsSection from './admin/ActivityLogsSection';
import StudentsSection from './admin/StudentsSection';
import AdminResultsSection from './admin/ResultsSection';
import AdminFeesSection from './admin/FeesSection';
import AdminActivitiesSection from './admin/ActivitiesSection';
import PortfolioViewerSection from './admin/PortfolioViewerSection';
import AdminHealthSection from './admin/HealthSection';
import AdminProfileSection from './admin/ProfileSection';

const LINKS = [
  { to: '/admin/dashboard',      label: 'Dashboard',      iconName: 'LayoutDashboard' },
  { to: '/admin/students',       label: 'Students',       iconName: 'GraduationCap' },
  { to: '/admin/users',          label: 'Users',          iconName: 'Users' },
  { to: '/admin/staff',          label: 'Staff',          iconName: 'UserCog' },
  { to: '/admin/beneficiaries',  label: 'Beneficiaries',  iconName: 'HeartHandshake' },
  { to: '/admin/announcements',  label: 'Announcements',  iconName: 'Megaphone' },
  { to: '/admin/replies',        label: 'Replies',        iconName: 'MessageSquare' },
  { to: '/admin/content',        label: 'Reports',        iconName: 'BarChart3' },
  { to: '/admin/results',        label: 'Results',        iconName: 'FileCheck' },
  { to: '/admin/fees-mgmt',      label: 'Fees',           iconName: 'Wallet' },
  { to: '/admin/activities-mgmt', label: 'Activities',    iconName: 'CalendarDays' },
  { to: '/admin/health',         label: 'Health Records', iconName: 'HeartPulse' },
  { to: '/admin/activity-logs',  label: 'Activity Logs',  iconName: 'History' },
  { to: '/admin/settings',       label: 'Settings',       iconName: 'Settings' },
];

export default function AdminDashboard() {
  return (
    <div
      className="flex flex-col min-h-screen"
      style={{ background: 'linear-gradient(135deg, #0a0f23 0%, #0f1a35 50%, #0a0f23 100%)' }}
    >
      <Navbar />
      <div className="flex flex-1 relative">
        <Sidebar links={LINKS} title="Admin Panel" />
        <main className="flex-1 p-4 lg:p-6 overflow-y-auto w-full">
          <Routes>
            <Route path="dashboard"     element={<DashboardSection />} />
            <Route path="students"      element={<StudentsSection />} />
            <Route path="users"         element={<UsersSection />} />
            <Route path="staff"         element={<StaffSection />} />
            <Route path="beneficiaries" element={<BeneficiariesSection />} />
            <Route path="content"       element={<ModerationSection />} />
            <Route path="results"       element={<AdminResultsSection />} />
            <Route path="fees-mgmt"     element={<AdminFeesSection />} />
            <Route path="activities-mgmt" element={<AdminActivitiesSection />} />
            <Route path="health"        element={<AdminHealthSection />} />
            <Route path="announcements" element={<AnnouncementsSection />} />
            <Route path="replies"       element={<AnnouncementRepliesSection />} />
            <Route path="activity-logs" element={<ActivityLogsSection />} />
            <Route path="profile"       element={<AdminProfileSection />} />
            <Route path="settings"      element={<Navigate to="/settings" replace />} />
            <Route path="*"             element={<Navigate to="dashboard" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

