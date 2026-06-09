# Requirements Document

## Introduction

This feature upgrades the CompassionEdu school management system with six interconnected improvements: demo login accounts seeded for every role, a redesigned dashboard header with glassmorphism identity display, a profile dropdown panel, a unified settings page, role-specific dashboards for admin/staff/student, and polished UI enhancements. A new "staff" role is introduced alongside the existing admin, student, teacher, and parent roles. All changes are strictly additive — no existing routes, tables, or components are broken.

## Glossary

- **System**: The CompassionEdu school management web application (Express.js + PostgreSQL backend, React + Vite + Tailwind frontend).
- **Seeder**: A backend script that inserts demo user accounts into the database on development startup.
- **Dev_Accounts_Page**: The frontend page at `/dev/accounts` that lists demo credentials and provides one-click login buttons.
- **Staff**: A new user role added to the system, representing school staff members (e.g., teachers' aides, coordinators) who manage assigned areas but do not have super-admin privileges.
- **Header**: The top navigation bar rendered inside each authenticated dashboard layout.
- **Identity_Block**: The top-left section of the Header displaying the user's profile picture, name, and role badge.
- **Role_Badge**: A small pill-shaped label showing the user's role and sub-role (e.g., "Admin • Super Admin", "Beneficiary • Student").
- **Profile_Dropdown**: The panel that appears when a user clicks the Identity_Block, showing extended profile details and action buttons.
- **Settings_Page**: The page at `/settings` accessible to all authenticated users, containing tabbed sections for account, appearance, notifications, security, and role-specific options.
- **Admin_Dashboard**: The dashboard layout and content rendered for users with the `admin` role at `/admin/*`.
- **Staff_Dashboard**: The dashboard layout and content rendered for users with the `staff` role at `/staff/*`.
- **Student_Dashboard**: The dashboard layout and content rendered for users with the `student` role at `/student/*`.
- **Glassmorphism**: A UI style using frosted-glass backgrounds (`backdrop-filter: blur`), semi-transparent surfaces, and soft borders.
- **Orange_Brand**: The CompassionEdu primary brand color (`#f97316` / `orange-500` in Tailwind), which must be preserved across all UI changes.
- **Accent_Color**: A user-selectable highlight color applied to interactive elements, defaulting to Orange_Brand.
- **Session_History**: A list of recent login sessions for a user, including device, IP address, and timestamp.
- **Beneficiary_Number**: A unique identifier assigned to student beneficiaries within the CompassionEdu sponsorship programme.
- **Project_Number**: A numeric count of projects associated with a student's portfolio profile.

---

## Requirements

### Requirement 1: Demo Login Accounts

**User Story:** As a developer, I want pre-seeded demo accounts for every role, so that I can test the system without manually creating users.

#### Acceptance Criteria

1. WHEN the backend starts in development mode (`NODE_ENV=development`), THE Seeder SHALL insert the following accounts if they do not already exist: `admin@compassionedu.com` (role: `admin`, password: `Admin@123`), `staff1@compassionedu.com` (role: `staff`, password: `Staff@123`), `staff2@compassionedu.com` (role: `staff`, password: `Staff@123`), `student1@compassionedu.com` (role: `student`, password: `Student@123`), `student2@compassionedu.com` (role: `student`, password: `Student@123`).
2. THE Seeder SHALL hash all demo passwords using bcrypt before storing them in the `users` table.
3. IF a demo account email already exists in the database, THEN THE Seeder SHALL skip insertion for that account without throwing an error.
4. WHEN the backend starts in production mode (`NODE_ENV=production`), THE Seeder SHALL not execute.
5. THE System SHALL add `staff` as a valid value in the `users.role` column constraint alongside the existing values `admin`, `student`, `teacher`, and `parent`.
6. THE Dev_Accounts_Page SHALL render at the `/dev/accounts` route and display each demo account's role, email, password, and a login button.
7. WHEN a user clicks a login button on the Dev_Accounts_Page, THE Dev_Accounts_Page SHALL submit the corresponding credentials to the login API and redirect the user to their role-specific dashboard on success.
8. WHEN `NODE_ENV` is not `development`, THE System SHALL return a 404 response for any request to `/dev/accounts`.
9. THE Dev_Accounts_Page SHALL be accessible without authentication.

---

### Requirement 2: Dashboard Header Redesign

**User Story:** As an authenticated user, I want to see my identity clearly in the top-left of the dashboard header, so that I always know which account I am using.

#### Acceptance Criteria

1. THE Header SHALL display the Identity_Block in the top-left position of every authenticated dashboard (Admin_Dashboard, Staff_Dashboard, Student_Dashboard, Teacher view, Parent view).
2. THE Identity_Block SHALL display the user's profile picture (or a generated avatar placeholder if no photo is set), the user's full name, and the Role_Badge.
3. THE Role_Badge SHALL display the role and sub-role label in the format `"<Role> • <Sub-role>"` (e.g., `"Admin • Super Admin"`, `"Beneficiary • Student"`, `"Staff • Teacher"`).
4. THE Header SHALL apply Glassmorphism styling: `backdrop-filter: blur(20px)`, semi-transparent background (`rgba(255,255,255,0.08)` in dark mode, `rgba(255,255,255,0.72)` in light mode), and a subtle bottom border.
5. THE Header SHALL preserve the Orange_Brand color for the CompassionEdu logo or wordmark displayed in the header.
6. WHEN the Header is rendered on a viewport narrower than 640px, THE Header SHALL collapse the user's full name and show only the profile picture and Role_Badge.
7. THE Header SHALL remain fixed at the top of the viewport while the user scrolls the main content area.

---

### Requirement 3: Profile Dropdown

**User Story:** As an authenticated user, I want to open a profile dropdown from the header, so that I can quickly view my details and access key actions.

#### Acceptance Criteria

1. WHEN a user clicks the Identity_Block in the Header, THE Profile_Dropdown SHALL open with a smooth slide-down and fade-in animation (duration ≤ 200ms).
2. WHEN the Profile_Dropdown is open and the user clicks outside it, THE Profile_Dropdown SHALL close with a fade-out animation (duration ≤ 150ms).
3. THE Profile_Dropdown SHALL display: the user's profile picture, full name, email address, role label, and — for students only — the Project_Number and Beneficiary_Number.
4. THE Profile_Dropdown SHALL display the user's school name and current school level when those values are present in the user's profile.
5. THE Profile_Dropdown SHALL contain a "View Profile" button that navigates to the user's profile page.
6. THE Profile_Dropdown SHALL contain a "Settings" button that navigates to `/settings`.
7. THE Profile_Dropdown SHALL contain a "Sign Out" button that calls the logout function, clears local storage tokens, and redirects the user to `/login`.
8. THE Profile_Dropdown SHALL apply Glassmorphism styling consistent with the Header.
9. WHEN the Profile_Dropdown is open, THE System SHALL trap keyboard focus within the dropdown and close it when the Escape key is pressed.

---

### Requirement 4: Settings Page

**User Story:** As an authenticated user, I want a settings page at `/settings`, so that I can manage my account preferences, appearance, notifications, and security in one place.

#### Acceptance Criteria

1. THE Settings_Page SHALL be accessible to all authenticated users at the `/settings` route.
2. IF an unauthenticated user navigates to `/settings`, THEN THE System SHALL redirect the user to `/login`.
3. THE Settings_Page SHALL contain an "Account" section where the user can update their profile picture, full name, and email address.
4. WHEN a user submits a valid account update in the "Account" section, THE Settings_Page SHALL call the existing profile API and display a success confirmation message within 3 seconds.
5. THE Settings_Page SHALL contain an "Appearance" section where the user can toggle between dark and light theme and select an Accent_Color from a predefined palette of at least 5 colors including Orange_Brand.
6. WHEN a user changes the theme or Accent_Color, THE System SHALL apply the change immediately without requiring a page reload and persist the preference to `localStorage`.
7. THE Settings_Page SHALL contain a "Notifications" section where the user can toggle push notifications, email notifications, and announcement notifications independently.
8. THE Settings_Page SHALL contain a "Security" section where the user can change their password and view their Session_History.
9. WHEN a user submits a password change with a new password shorter than 8 characters, THE Settings_Page SHALL display a validation error and SHALL NOT submit the request to the API.
10. WHERE the authenticated user's role is `student`, THE Settings_Page SHALL display a "Student" section containing education information fields (school, level) and beneficiary details (Beneficiary_Number).
11. WHERE the authenticated user's role is `admin`, THE Settings_Page SHALL display an "Admin" section containing links to user management, permissions management, and system settings.
12. THE Settings_Page SHALL apply Glassmorphism styling consistent with the rest of the dashboard.

---

### Requirement 5: Separate Role-Specific Dashboards

**User Story:** As a user, I want a dashboard tailored to my role, so that I only see the information and navigation relevant to my responsibilities.

#### Acceptance Criteria

1. THE Admin_Dashboard SHALL display summary cards for: Total Students, Total Staff, Attendance Rate, Fees Collected, Reports, Unread Notifications, and Pending Approvals.
2. THE Admin_Dashboard sidebar SHALL contain navigation links for: Dashboard, Users, Staff, Beneficiaries, Announcements, Reports, and Settings.
3. THE Staff_Dashboard SHALL be rendered at `/staff/*` for users with the `staff` role.
4. THE Staff_Dashboard SHALL display summary cards for: Assigned Students count, Attendance Rate, Activities count, and Unread Notifications count.
5. THE Staff_Dashboard sidebar SHALL contain navigation links for: Dashboard, Students, Activities, Announcements, and Settings.
6. THE Student_Dashboard SHALL display summary cards for: My Profile completion percentage, Attendance Rate, School Fees status, Results summary, Activities count, and Unread Notifications count.
7. THE Student_Dashboard sidebar SHALL contain navigation links for: Dashboard, Profile, Results, Fees, Activities, Announcements, and Settings.
8. WHEN a user with the `staff` role logs in, THE System SHALL redirect the user to `/staff` after successful authentication.
9. THE System SHALL protect the `/staff/*` routes so that only users with the `staff` role can access them; other roles SHALL receive a 403 redirect to their own dashboard.
10. THE Admin_Dashboard, Staff_Dashboard, and Student_Dashboard SHALL each use the redesigned Header from Requirement 2 and the Profile_Dropdown from Requirement 3.
11. THE Admin_Dashboard summary cards SHALL fetch their data from the existing `/api/admin/dashboard` endpoint and any new endpoints required for staff and pending-approval counts.

---

### Requirement 6: UI Enhancements

**User Story:** As a user, I want the interface to feel polished and modern, so that the application is pleasant to use without losing the familiar CompassionEdu look.

#### Acceptance Criteria

1. THE System SHALL apply Glassmorphism styling to all new and updated UI surfaces (Header, Profile_Dropdown, Settings_Page, dashboard cards) using `backdrop-filter: blur` and semi-transparent backgrounds.
2. THE System SHALL preserve the Orange_Brand color (`#f97316`) as the primary interactive color across all new and updated components.
3. THE System SHALL use softer box shadows (`box-shadow: 0 4px 24px rgba(0,0,0,0.12)`) on cards and panels instead of hard borders.
4. THE System SHALL increase internal padding on dashboard cards to a minimum of 20px on all sides.
5. THE System SHALL NOT remove, rename, or break any existing routes, API endpoints, database tables, or React components that are present before this upgrade.
6. WHEN the user's system preference is dark mode, THE System SHALL render all new surfaces in dark-mode Glassmorphism variants (dark semi-transparent backgrounds, light text).
7. THE System SHALL ensure all new interactive elements (buttons, links, dropdowns) meet WCAG 2.1 AA color contrast requirements (minimum contrast ratio of 4.5:1 for normal text).
