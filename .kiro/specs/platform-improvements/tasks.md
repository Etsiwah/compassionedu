# Implementation Plan: Platform Improvements

## Overview

Six targeted improvements to the CompassionEdu platform: Registration Approval Workflow,
Announcements Staff Targeting, Staff Work Reports, File Protection, Admin Password Reset,
and In-App Notifications. Implementation follows the existing layered architecture: DB migrations
first, then backend services and routes, then frontend utilities and components.

---

## Tasks

- [x] 1. Apply database migrations
  - [x] 1.1 Add `status` and `force_password_change` columns to the `users` table
    - In `backend/src/db/schema.sql`, add the `ALTER TABLE users` statements for `status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','active','rejected'))` and `force_password_change BOOLEAN DEFAULT FALSE`
    - _Requirements: 1.7, 5.1_

  - [x] 1.2 Update `announcements` table `target_role` CHECK constraint to include `'staff'`
    - In `schema.sql`, drop the existing `announcements_target_role_check` constraint and add a new one that includes `'staff'`
    - _Requirements: 2.1_

  - [x] 1.3 Create `staff_work_reports` table with indexes
    - In `schema.sql`, add the `CREATE TABLE IF NOT EXISTS staff_work_reports` block plus `idx_work_reports_staff` and `idx_work_reports_date` indexes
    - _Requirements: 3.1_

  - [x] 1.4 Create `file_ownership` table with index
    - In `schema.sql`, add the `CREATE TABLE IF NOT EXISTS file_ownership` block plus `idx_file_ownership_user` index
    - _Requirements: 4.3_

  - [x] 1.5 Create `notifications` table with indexes
    - In `schema.sql`, add the `CREATE TABLE IF NOT EXISTS notifications` block plus `idx_notifications_user`, `idx_notifications_unread`, and `idx_notifications_created` indexes
    - _Requirements: 6.1_

- [x] 2. Implement notification service
  - [x] 2.1 Create `backend/src/services/notificationService.js`
    - Implement `notifyAdmins(type, message, entityId)` — queries all active admins and bulk-inserts one notification row per admin
    - Implement `getNotifications(userId)` — returns all notifications for a user ordered by `created_at DESC`
    - Implement `markAsRead(notifId, userId)` — checks ownership (403 if mismatch, 404 if not found) then sets `is_read = TRUE`
    - _Requirements: 6.2, 6.3, 6.4, 6.5, 6.6_

  - [ ]* 2.2 Write property test for `notifyAdmins` fan-out (Property 14)
    - **Property 14: New registration fan-out covers all admins**
    - For any set of admin users in the database, `notifyAdmins('new_registration', ...)` should insert exactly one `notifications` row per admin with the correct `type` and non-empty `message`
    - **Validates: Requirements 6.5**

  - [ ]* 2.3 Write property test for `notifyAdmins` file-upload fan-out (Property 15)
    - **Property 15: File upload fan-out covers all admins**
    - For any set of admin users, `notifyAdmins('file_upload', ...)` should insert exactly one row per admin
    - **Validates: Requirements 6.6**

  - [ ]* 2.4 Write property test for `markAsRead` ownership enforcement (Property 16)
    - **Property 16: Notification ownership is enforced on mark-read**
    - For any notification owned by user A, calling `markAsRead` as user B (id ≠ A) should throw 403 and leave `is_read` unchanged
    - **Validates: Requirements 6.4**

- [x] 3. Implement file service
  - [x] 3.1 Create `backend/src/services/fileService.js`
    - Implement `recordOwnership(filename, userId, context)` — upsert-safe `INSERT ... ON CONFLICT (filename) DO NOTHING`
    - Implement `serveFile(filename, requestingUserId, requestingUserRole)` — look up ownership record (404 if missing), enforce ownership check (403 if non-owner non-admin), locate file on disk via `findFilePath` (404 if missing), return absolute path
    - _Requirements: 4.4, 4.5, 4.6, 4.7, 4.8_

  - [ ]* 3.2 Write property test for file ownership record creation (Property 9)
    - **Property 9: File upload always creates an ownership record**
    - For any upload by any authenticated user, after `recordOwnership` completes, querying `file_ownership` for that filename should return exactly one record with the correct `user_id`
    - **Validates: Requirements 4.4**

  - [ ]* 3.3 Write property test for non-owner file access (Property 10)
    - **Property 10: Non-owners and non-admins cannot access files**
    - For any file owned by user A, user B (role ≠ `'admin'`, id ≠ A) calling `serveFile` should throw 403; an admin calling `serveFile` for the same file should succeed
    - **Validates: Requirements 4.5, 4.6**

- [x] 4. Implement staff work report service
  - [x] 4.1 Create `backend/src/services/staffWorkReportService.js`
    - Implement `createReport(staffId, { content, report_date })` — validate non-empty content (throw 400 if blank/whitespace), insert into `staff_work_reports`, return created row
    - Implement `getMyReports(staffId)` — return all rows for `staff_id` ordered by `report_date DESC`
    - Implement `getAllReports(staffId)` — join with `users` for name/email, optionally filter by `staff_id` UUID parameter, ordered by `report_date DESC`
    - _Requirements: 3.2, 3.3, 3.4, 3.5, 3.6_

  - [ ]* 4.2 Write property test for blank content rejection (Property 6)
    - **Property 6: Work report creation rejects blank content**
    - For any string composed entirely of whitespace (including the empty string), `createReport` should throw HTTP 400 and not insert any row
    - **Validates: Requirements 3.3**

  - [ ]* 4.3 Write property test for `getMyReports` isolation (Property 7)
    - **Property 7: Staff see only their own reports in correct order**
    - For any staff member's ID and any set of reports in the DB, `getMyReports` should return only records where `staff_id` matches the requesting user's ID, sorted by `report_date DESC`
    - **Validates: Requirements 3.4**

  - [ ]* 4.4 Write property test for admin filter on work reports (Property 8)
    - **Property 8: Admin work-report filter is respected**
    - For any `staff_id` filter value passed to `getAllReports`, every record in the result should have a matching `staff_id`
    - **Validates: Requirements 3.6**

- [x] 5. Checkpoint — Ensure all new services pass their tests, ask the user if questions arise.

- [x] 6. Modify auth service and routes
  - [x] 6.1 Update `backend/src/services/authService.js` — login status checks
    - Extend the `SELECT` in `login()` to include `status` and `force_password_change` columns
    - After password verification, check `status === 'pending'` and throw 403 with message `"Your account is pending admin approval."`
    - Keep the existing `is_active`/`deleted_at` check as 401 (distinct from pending)
    - Include `force_password_change` in the returned safe user object
    - _Requirements: 1.2, 1.3, 5.4_

  - [x] 6.2 Update `backend/src/services/authService.js` — `changePassword()` clears flag
    - In `changePassword()`, update the SQL to also set `force_password_change = FALSE` when writing the new hash
    - _Requirements: 5.5_

  - [x] 6.3 Update `backend/src/routes/auth.js` — register route
    - Remove any token/refresh token generation from the `POST /api/auth/register` handler; the INSERT already defaults to `status = 'pending'`
    - Call `notificationService.notifyAdmins('new_registration', ...)` after inserting the user
    - Respond with `201` and `{ message: 'Registration received. Awaiting admin approval.' }`
    - _Requirements: 1.1, 6.5_

  - [x] 6.4 Update `backend/src/routes/auth.js` — login response
    - Add `force_password_change: user.force_password_change ?? false` to the JSON response payload
    - _Requirements: 5.4_

  - [ ]* 6.5 Write property test for self-registration — no token issued (Property 1)
    - **Property 1: Self-registration never issues tokens**
    - For any valid registration payload, the register endpoint should return an acknowledgement with no `token` or `refreshToken` fields and the DB row should have `status = 'pending'`
    - **Validates: Requirements 1.1**

  - [ ]* 6.6 Write property test for pending login block (Property 2)
    - **Property 2: Pending accounts are blocked at login**
    - For any user account with `status = 'pending'`, calling `authService.login` with the correct password should throw 403 with a message containing `"pending admin approval"`
    - **Validates: Requirements 1.2**

  - [ ]* 6.7 Write property test for `force_password_change` in login response (Property 13)
    - **Property 13: Login response includes force_password_change flag**
    - For any user with `force_password_change = TRUE`, the login response should contain `force_password_change: true`; with `FALSE` it should be `false`
    - **Validates: Requirements 5.4**

  - [ ]* 6.8 Write property test for password reset round-trip (Property 12)
    - **Property 12: Password reset round-trip clears the force-change flag**
    - For any user account, setting `force_password_change = TRUE` then calling `changePassword` successfully should result in `force_password_change = FALSE` in the DB
    - **Validates: Requirements 5.5**

- [x] 7. Modify announcements service
  - [x] 7.1 Update `backend/src/services/announcementsService.js`
    - Add `'staff'` to the `VALID_ROLES` constant so staff-targeted announcements pass validation
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [ ]* 7.2 Write property test for staff announcement filtering (Property 4)
    - **Property 4: Staff users only receive eligible announcements**
    - For any staff user and any set of announcement records with varying `target_role` values, `getAnnouncementsForUser` should return only announcements where `target_role` is `'all'` or `'staff'`
    - **Validates: Requirements 2.2**

  - [ ]* 7.3 Write property test for invalid `target_role` rejection (Property 5)
    - **Property 5: Invalid target_role is always rejected**
    - For any string not in `['all', 'student', 'teacher', 'parent', 'staff']`, `createAnnouncement` should throw 422
    - **Validates: Requirements 2.4**

- [x] 8. Add admin endpoints to `backend/src/routes/admin.js`
  - [x] 8.1 Add `GET /api/admin/pending-registrations` endpoint
    - Query `users` where `status = 'pending'` and `deleted_at IS NULL`, return `id`, `name`, `email`, `role`, `created_at` ordered by `created_at ASC`
    - Guard with `requireAuth` + `requireRole('admin')`
    - _Requirements: 1.4, 1.8_

  - [x] 8.2 Add `PATCH /api/admin/users/:id/approve` endpoint
    - Set `status = 'active'`, `is_active = TRUE` for the target user; return 404 if not found, 200 on success
    - _Requirements: 1.5_

  - [x] 8.3 Add `PATCH /api/admin/users/:id/reject` endpoint
    - Set `status = 'rejected'`, `is_active = FALSE` for the target user; return 404 if not found, 200 on success
    - _Requirements: 1.6_

  - [x] 8.4 Add `POST /api/admin/users/:id/reset-password` endpoint
    - Validate `temporaryPassword` length ≥ 8 (400 if short); bcrypt hash and update `password_hash`, set `force_password_change = TRUE`; return 404 if user not found
    - _Requirements: 5.2, 5.3_

  - [x] 8.5 Add `GET /api/admin/work-reports` endpoint
    - Call `staffWorkReportService.getAllReports(req.query.staff_id || null)` and return the result; guard with `requireAuth` + `requireRole('admin')`
    - _Requirements: 3.5, 3.6_

  - [ ]* 8.6 Write property test for approval/rejection state transitions (Property 3)
    - **Property 3: Approval and rejection are correct state transitions**
    - For any pending user ID, after the approve endpoint the user's `status` should be `'active'`; after the reject endpoint `status = 'rejected'` and `is_active = FALSE`
    - **Validates: Requirements 1.5, 1.6**

  - [ ]* 8.7 Write property test for short temporary password rejection (Property 11)
    - **Property 11: Short temporary passwords are always rejected**
    - For any string of length 0–7, the reset-password endpoint should return HTTP 400 with message `"Temporary password must be at least 8 characters."`
    - **Validates: Requirements 5.3**

- [x] 9. Add work-report routes to `backend/src/routes/staffPortal.js`
  - [x] 9.1 Add `POST /api/staff-portal/work-reports` route
    - Call `staffWorkReportService.createReport(req.user.sub, req.body)`, respond 201 with the created record; let service-layer errors propagate via `next(e)`
    - _Requirements: 3.2, 3.3_

  - [x] 9.2 Add `GET /api/staff-portal/work-reports/my` route
    - Call `staffWorkReportService.getMyReports(req.user.sub)` and return the result
    - _Requirements: 3.4_

- [x] 10. Create new backend routes
  - [x] 10.1 Create `backend/src/routes/files.js`
    - Single `GET /:filename` route, guarded by `requireAuth`; call `fileService.serveFile(req.params.filename, req.user.sub, req.user.role)` then `res.sendFile(filePath)`
    - _Requirements: 4.2, 4.5, 4.6, 4.7, 4.8_

  - [x] 10.2 Create `backend/src/routes/notifications.js`
    - `GET /` guarded by `requireAuth` — calls `notifService.getNotifications(req.user.sub)`
    - `PATCH /:id/read` guarded by `requireAuth` — calls `notifService.markAsRead(req.params.id, req.user.sub)`, responds 204
    - _Requirements: 6.2, 6.3, 6.4_

- [x] 11. Update `backend/src/app.js`
  - [x] 11.1 Remove `express.static` for `/uploads` and mount new routes
    - Delete or comment out the `app.use('/uploads', express.static(...))` line
    - Add `app.use('/api/files', require('./routes/files'))` and `app.use('/api/notifications', require('./routes/notifications'))` mounts
    - _Requirements: 4.1, 6.2_

- [ ] 12. Add file ownership and notification hooks to upload handlers
  - [x] 12.1 Update `backend/src/routes/feeUploads.js`
    - After a successful upload, call `fileService.recordOwnership(req.file.filename, req.user.sub, 'fee-receipt')`
    - Then call `notificationService.notifyAdmins('file_upload', ...)` with the uploader's name and context
    - _Requirements: 4.4, 6.6_

  - [x] 12.2 Update `backend/src/routes/resultUploads.js`
    - Same pattern as 12.1 with context `'result-upload'`
    - _Requirements: 4.4, 6.6_

  - [x] 12.3 Update `backend/src/routes/portfolio.js`
    - Same pattern as 12.1 with context `'portfolio'`
    - _Requirements: 4.4, 6.6_

  - [x] 12.4 Update `backend/src/routes/profile.js`
    - Same pattern as 12.1 with context `'profile'`
    - _Requirements: 4.4, 6.6_

- [ ] 13. Checkpoint — Run the full backend test suite; ensure all new and modified routes behave as expected. Ask the user if questions arise.

- [ ] 14. Create frontend file URL utility
  - [ ] 14.1 Create `frontend/src/utils/fileUrl.js`
    - Export `fileUrl(path)` helper: returns `null` for falsy input; returns `path` unchanged for absolute URLs (starts with `http`); strips any legacy `/uploads/...` prefix and returns `/api/files/${filename}`
    - _Requirements: 4.2_

- [ ] 15. Create new frontend section components
  - [ ] 15.1 Create `frontend/src/pages/admin/PendingApprovalsSection.jsx`
    - On mount, fetch `GET /api/admin/pending-registrations` and render a table showing name, email, role, and registration timestamp for each pending account
    - Add Approve and Reject buttons per row that call the respective PATCH endpoints and refresh the list on success
    - _Requirements: 1.4, 1.8_

  - [ ] 15.2 Create `frontend/src/pages/staff/WorkReportsSection.jsx`
    - Render a form with a `report_date` date input and a `content` textarea; on submit POST to `/api/staff-portal/work-reports`
    - Below the form, list the staff member's own past reports fetched from `GET /api/staff-portal/work-reports/my`, ordered by date descending
    - _Requirements: 3.2, 3.4, 3.7_

  - [ ] 15.3 Create `frontend/src/pages/admin/WorkReportsAdminSection.jsx`
    - Fetch `GET /api/admin/work-reports` on mount; render a table showing staff name, email, report date, and content preview
    - Include an optional `staff_id` filter input that appends `?staff_id=...` to re-fetch filtered results
    - _Requirements: 3.5, 3.6_

  - [ ]* 15.4 Write unit tests for `PendingApprovalsSection`
    - Test that the table renders pending accounts correctly
    - Test that Approve/Reject buttons call the right endpoints and refresh the list
    - _Requirements: 1.8_

  - [ ]* 15.5 Write unit tests for `WorkReportsSection`
    - Test form submission with valid and invalid (empty) content
    - Test that past reports list is rendered correctly
    - _Requirements: 3.2, 3.3, 3.4_

- [ ] 16. Update existing frontend components
  - [ ] 16.1 Update `frontend/src/pages/AdminDashboard.jsx`
    - Add `{ to: '/admin/pending-approvals', label: 'Pending Approvals', icon: '⏳' }` to the LINKS array
    - Add `{ to: '/admin/work-reports', label: 'Work Reports', icon: '📋' }` to the LINKS array
    - Add routes rendering `PendingApprovalsSection` and `WorkReportsAdminSection`
    - _Requirements: 1.8, 3.5_

  - [ ] 16.2 Update `frontend/src/pages/StaffDashboard.jsx`
    - Add `{ to: '/staff/work-reports', label: 'Work Reports', icon: '📋' }` to the staff LINKS array
    - Add route rendering `WorkReportsSection`
    - _Requirements: 3.7_

  - [ ] 16.3 Add Reset Password button to `frontend/src/pages/admin/UsersSection.jsx`
    - Add a "Reset Password" action button per user row that opens a small modal with a `temporaryPassword` input (min 8 chars)
    - On confirm, `POST /api/admin/users/:id/reset-password` with the entered password; show success or error feedback
    - _Requirements: 5.6_

  - [ ] 16.4 Add Reset Password button to `frontend/src/pages/admin/StaffSection.jsx`
    - Same pattern as 16.3 applied to the staff management table
    - _Requirements: 5.6_

  - [ ] 16.5 Update `frontend/src/App.jsx` — force password change redirect
    - After a successful login, check if `user.force_password_change === true` in the response; if so, redirect to `/settings` before rendering the normal dashboard
    - _Requirements: 5.4_

  - [ ] 16.6 Update `frontend/src/components/common/NotificationBell.jsx`
    - Replace any mock or fallback data with a real `fetch('/api/notifications')` call
    - Set up a `setInterval` polling every 60 seconds; clear the interval on component unmount
    - Compute unread count from returned notifications; display `n > 99 ? '99+' : n` on the badge
    - _Requirements: 6.7, 6.8_

  - [ ]* 16.7 Write property test for notification badge display (Property 17)
    - **Property 17: Notification badge displays correct count and caps at 99+**
    - For any integer `n` where 0 ≤ n ≤ 99, the badge should display `n`; for any `n > 99`, the badge should display `"99+"`
    - **Validates: Requirements 6.8**

  - [ ] 16.8 Update all frontend components using `/uploads/` file URLs to use `fileUrl()` helper
    - Search for all occurrences of `/uploads/` in `frontend/src` (e.g., `photo_url`, `cv_url`, `document_url`, `portfolio` image URLs)
    - Replace each with `fileUrl(value)` imported from `frontend/src/utils/fileUrl.js`
    - _Requirements: 4.2_

- [ ] 17. Final checkpoint — Ensure all tests pass, the app builds without errors, and all six features work end-to-end. Ask the user if questions arise.

---

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- The dependency order is strict: migrations → services → routes → frontend utilities → components
- Tasks 12.1–12.4 each touch a different file and can be executed in parallel
- Property tests reference the exact property numbers from the design document for traceability
- The `notificationService` is created before `auth.js` is modified because the register route depends on it
- `fileUrl()` must exist before any frontend components are updated to use it

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2", "1.3", "1.4", "1.5"] },
    { "id": 1, "tasks": ["2.1", "3.1", "4.1"] },
    { "id": 2, "tasks": ["2.2", "2.3", "2.4", "3.2", "3.3", "4.2", "4.3", "4.4", "7.1"] },
    { "id": 3, "tasks": ["6.1", "6.2", "7.2", "7.3", "8.1", "8.2", "8.3", "8.4", "8.5", "9.1", "9.2", "10.1", "10.2"] },
    { "id": 4, "tasks": ["6.3", "6.4", "11.1"] },
    { "id": 5, "tasks": ["6.5", "6.6", "6.7", "6.8", "8.6", "8.7", "12.1", "12.2", "12.3", "12.4"] },
    { "id": 6, "tasks": ["14.1"] },
    { "id": 7, "tasks": ["15.1", "15.2", "15.3"] },
    { "id": 8, "tasks": ["15.4", "15.5", "16.1", "16.2", "16.3", "16.4", "16.5", "16.6", "16.8"] },
    { "id": 9, "tasks": ["16.7"] }
  ]
}
```
