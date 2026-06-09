# Implementation Plan: CompassionEdu School Management System

## Overview

Tasks are ordered to build the system incrementally: project scaffolding → auth → core data modules → frontend shell → feature modules → admin dashboard → wiring and polish. Each task builds on the previous, with no orphaned code. Property-based tests use `fast-check` and are placed close to the implementation they validate.

## Tasks

- [x] 1. Project scaffolding and shared configuration
  - Initialize backend: `npm init`, install Express, pg, bcrypt, jsonwebtoken, multer, fast-check, jest
  - Initialize frontend: `npx create-react-app` with Tailwind CSS, install react-router-dom, axios, recharts
  - Create directory structure matching the design (`src/routes/`, `src/middleware/`, `src/services/`, `src/db/`)
  - Create `src/db/schema.sql` with all 14 tables from the design data model
  - Create `src/db/migrate.js` script to run schema against PostgreSQL
  - Create shared TypeScript/JSDoc types file matching the design's type definitions
  - _Requirements: 1.1, 2.1, 3.1_

- [x] 2. Authentication module
  - [x] 2.1 Implement auth service and routes
    - Write `src/services/authService.js`: `login(email, password)`, `issueTokens(user)`, `refreshToken(token)`, `logout(userId)`
    - Write `src/routes/auth.js`: POST `/api/auth/login`, POST `/api/auth/refresh`, POST `/api/auth/logout`
    - Write `src/middleware/requireAuth.js`: validates JWT, attaches `req.user`
    - Write `src/middleware/requireRole.js`: checks `req.user.role` against allowed roles array
    - _Requirements: 1.1, 1.2, 1.3, 1.9_

  - [x]* 2.2 Write property tests for authentication
    - **Property 1: Role access isolation** — for any role R, requests with role R token must be denied on routes requiring a different role
    - **Property 2: Password never stored in plaintext** — for any password string, stored hash must not equal plaintext
    - **Validates: Requirements 1.4, 1.5, 1.6, 1.7, 1.8, 1.9**
    - Tag: `// Feature: compassion-edu, Property 1: Role access isolation`
    - Tag: `// Feature: compassion-edu, Property 2: Password never stored in plaintext`

- [x] 3. User management module (Admin)
  - [x] 3.1 Implement user CRUD service and routes
    - Write `src/services/userService.js`: `listUsers(query, role, page, limit)`, `createUser(data)`, `softDeleteUser(id)`
    - Write `src/routes/users.js`: GET `/api/users`, POST `/api/users`, DELETE `/api/users/:id`
    - Guard all routes with `requireRole('admin')`
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [x]* 3.2 Write property tests for user management
    - **Property 3: User search result relevance** — for any query Q, all returned users must have name or email containing Q
    - **Property 10: Duplicate email rejection** — for any existing email, a second creation attempt must be rejected
    - **Validates: Requirements 2.4, 2.5**
    - Tag: `// Feature: compassion-edu, Property 3: User search result relevance`
    - Tag: `// Feature: compassion-edu, Property 10: Duplicate email rejection`

- [x] 4. Profile management module
  - [x] 4.1 Implement profile service and routes
    - Write `src/services/profileService.js`: `getProfile(userId)`, `updateProfile(userId, data)`, `addPhoto(userId, fileData)`, `setDefaultPhoto(userId, photoId)`
    - Write `src/routes/profile.js`: GET/PATCH `/api/profile/:userId`, POST `/api/profile/:userId/photos`, PATCH `/api/profile/:userId/photos/:photoId/default`
    - Implement multer middleware for photo uploads with MIME type and size validation (JPEG/PNG/WEBP, max 10MB)
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_

  - [x]* 4.2 Write property tests for profile management
    - **Property 9 (partial): Profile photo upload rejection** — for any file with invalid MIME type or size > 10MB, upload must be rejected
    - **Validates: Requirements 3.6**
    - Tag: `// Feature: compassion-edu, Property 9: File upload rejection for invalid types and sizes`

- [x] 5. Fee management module
  - [x] 5.1 Implement fee service and routes
    - Write `src/services/feeService.js`: `getFeeRecords(studentId)`, `recordPayment(feeId, paymentData)`, `updateOverdueStatuses()`, `getFeesSummary()`, `checkUpcomingDeadlines()`
    - Write `src/routes/fees.js`: GET `/api/fees/:studentId`, POST `/api/fees/:studentId/payments`, GET `/api/fees/summary`
    - Implement `updateOverdueStatuses()` as a scheduled job (run on server start and via cron)
    - Implement `checkUpcomingDeadlines()` to trigger notifications for fees due within 7 days
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.7_

  - [x]* 5.2 Write property tests for fee management
    - **Property 4: Fee status transition correctness** — for any fee record, status must match the paid/pending/overdue logic
    - **Validates: Requirements 4.1, 4.3**
    - Tag: `// Feature: compassion-edu, Property 4: Fee status transition correctness`

- [x] 6. Examination results module
  - [x] 6.1 Implement results service and routes
    - Write `src/services/resultsService.js`: `getResults(studentId, term)`, `createResult(data)`, `calculateGPA(studentId, term)`, `getPerformanceTrend(studentId)`, `generateReportCardPDF(studentId, term)`
    - Write `src/routes/results.js`: GET `/api/results/:studentId`, POST `/api/results`, GET `/api/results/:studentId/report-card/:term`
    - Use `pdfkit` or `puppeteer` to generate PDF report cards
    - Validate marks are in range 0–100 before persisting
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

  - [x]* 6.2 Write property tests for results module
    - **Property 5: Examination marks range invariant** — for any marks value outside [0,100], creation must be rejected
    - **Validates: Requirements 5.6**
    - Tag: `// Feature: compassion-edu, Property 5: Examination marks range invariant`

- [x] 7. Attendance module
  - [x] 7.1 Implement attendance service and routes
    - Write `src/services/attendanceService.js`: `getAttendance(studentId, month, subject)`, `recordAttendance(sessionData)`, `calculatePercentage(studentId, subject)`, `getAttendanceAnalytics()`, `checkLowAttendance()`
    - Write `src/routes/attendance.js`: GET `/api/attendance/:studentId`, POST `/api/attendance`, GET `/api/attendance/analytics`
    - Implement `checkLowAttendance()` to trigger notifications when percentage < 75%
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

  - [x]* 7.2 Write property tests for attendance module
    - **Property 6: Attendance percentage calculation correctness** — for any array of attendance records, percentage must equal present_count/total * 100
    - **Validates: Requirements 6.2**
    - Tag: `// Feature: compassion-edu, Property 6: Attendance percentage calculation correctness`

- [x] 8. Checkpoint — backend modules complete
  - Ensure all tests pass, ask the user if questions arise.
  - Verify all routes are mounted in `src/app.js`
  - Verify all role guards are in place

- [x] 9. Portfolio and CV module
  - [x] 9.1 Implement portfolio service and routes
    - Write `src/services/portfolioService.js`: `getPortfolio(studentId)`, `uploadCV(studentId, fileData)`, `addExperience(studentId, data)`, `updateExperience(id, data)`, `deleteExperience(id)`, `uploadMedia(studentId, fileData)`, `updateSkills(studentId, skills)`, `getGrowthTimeline(studentId)`
    - Write `src/routes/portfolio.js` with all portfolio endpoints
    - Implement multer validation for CV (PDF/DOCX, max 50MB) and media (max 50MB)
    - `getGrowthTimeline` must return experiences sorted by `start_date` ascending
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7_

  - [x]* 9.2 Write property tests for portfolio module
    - **Property 9 (full): File upload rejection** — for any CV with invalid MIME type or any media > 50MB, upload must be rejected
    - **Validates: Requirements 7.6, 7.7**
    - Tag: `// Feature: compassion-edu, Property 9: File upload rejection for invalid types and sizes`

- [x] 10. Announcements and notifications module
  - [x] 10.1 Implement announcements service and routes
    - Write `src/services/announcementsService.js`: `getAnnouncementsForUser(userId, role)`, `createAnnouncement(data)`, `markAsRead(announcementId, userId)`
    - Write `src/routes/announcements.js`: GET `/api/announcements`, POST `/api/announcements`, PATCH `/api/announcements/:id/read`
    - `getAnnouncementsForUser` must filter by `target_role IN ('all', userRole)`
    - _Requirements: 9.1, 9.2, 9.3, 9.4_

  - [x]* 10.2 Write property tests for announcements
    - **Property 8: Announcement targeting correctness** — for any announcement with target role T, only users with matching role receive it
    - **Validates: Requirements 9.1, 9.4**
    - Tag: `// Feature: compassion-edu, Property 8: Announcement targeting correctness`

- [x] 11. Admin dashboard module
  - [x] 11.1 Implement admin service and routes
    - Write `src/services/adminService.js`: `getCompassionDashboard()`, `getContentModerationItems()`, `moderateContent(itemId, action)`
    - Write `src/routes/admin.js`: GET `/api/admin/dashboard`, GET `/api/admin/content`, PATCH `/api/admin/content/:id`
    - `getCompassionDashboard` returns students with attendance < 75% or overdue fees
    - `moderateContent` sets `moderation_status` to 'approved' or 'flagged'
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7_

  - [x]* 11.2 Write property tests for admin module
    - **Property 7: Portfolio media moderation state machine** — flagged items must not appear in portfolio; approved items must appear
    - **Validates: Requirements 8.6, 8.7**
    - Tag: `// Feature: compassion-edu, Property 7: Portfolio media moderation state machine`

- [x] 12. Frontend — Auth and routing shell
  - Implement `AuthContext.jsx` and `useAuth.js` hook (stores JWT, exposes user role)
  - Implement `ThemeContext.jsx` and `ThemeToggle.jsx` (persists preference to localStorage)
  - Implement `ProtectedRoute.jsx` component that checks role before rendering
  - Implement `LoginPage.jsx` with email/password form wired to `POST /api/auth/login`
  - Set up React Router with routes for `/login`, `/student/*`, `/admin/*`, `/teacher/*`, `/parent/*`
  - Implement `utils/api.js` Axios instance with JWT Authorization header interceptor and 401 redirect
  - _Requirements: 1.1, 1.2, 10.2_

- [x] 13. Frontend — Student portal
  - [x] 13.1 Implement student portal pages and components
    - Implement `StudentPortal.jsx` layout with sidebar navigation
    - Implement `ProfileCard.jsx` and `PhotoUploader.jsx` wired to profile API
    - Implement `FeeStatusBadge.jsx`, `PaymentHistoryTable.jsx`, `FeeReminderBanner.jsx` wired to fees API
    - Implement `ResultsTable.jsx`, `PerformanceTrendChart.jsx` (using recharts), `ReportCardDownload.jsx`
    - Implement `AttendanceCalendar.jsx` and `AttendancePercentageBar.jsx`
    - Implement `CVUploader.jsx`, `ExperienceForm.jsx`, `ProjectsGallery.jsx`, `SkillsEditor.jsx`, `GrowthTimeline.jsx`
    - _Requirements: 3.1–3.7, 4.1–4.5, 5.1–5.4, 6.1–6.2, 7.1–7.5_

  - [x]* 13.2 Write unit tests for student portal components
    - Test `FeeStatusBadge` renders correct badge for each status value
    - Test `AttendanceCalendar` marks days correctly given mock data
    - Test `GrowthTimeline` renders entries in chronological order
    - _Requirements: 4.1, 6.1, 7.5_

- [x] 14. Frontend — Admin dashboard
  - Implement `AdminDashboard.jsx` layout
  - Implement `UserManagementTable.jsx` with search input wired to `GET /api/users?q=`
  - Implement `ContentModerationPanel.jsx` with approve/flag buttons wired to `PATCH /api/admin/content/:id`
  - Implement `FeeCollectionChart.jsx`, `AttendanceAnalyticsChart.jsx`, `PerformanceOverviewChart.jsx` using recharts
  - Implement `CompassionDashboard.jsx` showing at-risk students list
  - _Requirements: 2.3, 2.4, 8.1–8.7_

- [x] 15. Frontend — Teacher and Parent views
  - Implement `TeacherView.jsx`: attendance recording form wired to `POST /api/attendance`, results entry form wired to `POST /api/results`
  - Implement `ParentView.jsx`: read-only views of linked child's attendance, results, and fee status
  - _Requirements: 1.6, 1.7, 6.4, 5.5_

- [x] 16. Frontend — Loading states, error handling, and notifications
  - Implement `LoadingSpinner.jsx` and wrap all async data fetches with loading state
  - Implement `ErrorMessage.jsx` and wire to all API error responses
  - Implement notification bell component showing unread announcements count
  - Wire announcement read/unread state to `PATCH /api/announcements/:id/read`
  - _Requirements: 9.2, 9.3, 10.3, 10.4_

- [x] 17. Final checkpoint — full integration
  - Ensure all tests pass, ask the user if questions arise.
  - Verify all frontend routes are protected by correct roles
  - Verify all backend routes return correct HTTP status codes for error scenarios
  - Verify file upload validation works end-to-end for profile photos, CVs, and portfolio media

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for traceability
- Property tests use `fast-check` with minimum 100 iterations per test
- Unit tests use Jest (backend) and React Testing Library (frontend)
- Checkpoints at tasks 8 and 17 ensure incremental validation
