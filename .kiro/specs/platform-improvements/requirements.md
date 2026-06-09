# Requirements Document

## Introduction

This document defines six targeted improvements to the CompassionEdu platform:

1. **Registration Approval Workflow** — self-registered accounts are held in a pending state until an admin approves them; login is blocked with a clear message until approval.
2. **Announcements Staff Targeting** — the announcements system gains a `staff` target role so admins can send messages to staff members only.
3. **Staff Work Reports** — staff members submit plain-text daily reports; admins can view all submitted reports.
4. **File Protection** — uploaded files are served through an authenticated API route; access is restricted to the file owner and admins.
5. **Admin Password Reset** — admins can set a temporary password for any user account and mark it as requiring a password change on next login.
6. **In-App Notifications** — a persistent notifications table records platform events; the existing NotificationBell component is backed by a real API; admins receive notifications for new registrations and file uploads.

## Glossary

- **Auth Service**: The backend service module (`authService.js`) and its associated `/api/auth` routes responsible for authentication and token management.
- **Registration Approval Workflow**: The process by which a self-registered account moves from `pending` status to `active` status upon admin approval.
- **Pending Account**: A user account with `status = 'pending'` created by self-registration, not yet approved by an admin.
- **Admin**: A user with `role = 'admin'` in the `users` table.
- **Staff**: A user with `role = 'staff'` in the `users` table.
- **Announcement**: A record in the `announcements` table with a title, content body, and a `target_role` that determines which users see it.
- **Staff Work Report**: A plain-text daily report submitted by a staff member, stored in the `staff_work_reports` table.
- **File Ownership Record**: A row in the `file_ownership` table mapping a stored filename to the `user_id` of the uploader.
- **Temporary Password**: A bcrypt-hashed password set by an admin for a user account, paired with `force_password_change = TRUE`.
- **Notification**: A record in the `notifications` table representing a platform event targeted at a specific user.
- **Notification Bell**: The `NotificationBell.jsx` React component that polls `/api/notifications` and displays unread count.
- **LINKS Array**: The sidebar navigation array used in the admin panel React component to define navigation items.

---

## Requirements

### Requirement 1: Registration Approval Workflow

**User Story:** As an admin, I want to review and approve or reject self-registered accounts before they can log in, so that only verified users gain access to the platform.

#### Acceptance Criteria

1. WHEN a user completes self-registration via `POST /api/auth/register`, THE Auth Service SHALL create the user account with `status = 'pending'` and SHALL NOT issue an access token or refresh token.

2. WHEN a user with `status = 'pending'` attempts to log in via `POST /api/auth/login`, THE Auth Service SHALL reject the request with HTTP 403 and the message `"Your account is pending admin approval."`.

3. WHEN a user with `status = 'inactive'` or a soft-deleted account (`deleted_at IS NOT NULL`) attempts to log in, THE Auth Service SHALL reject the request with HTTP 403 and a message that distinguishes the reason from a pending-approval block.

4. THE Admin Service SHALL expose a `GET /api/admin/pending-registrations` endpoint that returns all users with `status = 'pending'`, accessible only to admins.

5. WHEN an admin sends `PATCH /api/admin/users/:id/approve`, THE Admin Service SHALL set `status = 'active'` for the specified user and SHALL respond with HTTP 200.

6. WHEN an admin sends `PATCH /api/admin/users/:id/reject`, THE Admin Service SHALL set `status = 'rejected'` and `is_active = FALSE` for the specified user and SHALL respond with HTTP 200.

7. THE users table SHALL include a `status` column of type `VARCHAR(20)` with a `CHECK` constraint permitting only `'pending'`, `'active'`, and `'rejected'` as values, defaulting to `'pending'` for `account_source = 'self_registered'` and `'active'` for `account_source = 'admin_added'`.

8. WHEN the admin panel loads the registration approval queue, THE Admin Panel SHALL display each pending account's name, email, role, and registration timestamp.

---

### Requirement 2: Announcements Staff Targeting

**User Story:** As an admin, I want to target announcements specifically at staff members, so that staff-relevant messages are not seen by students, parents, or teachers.

#### Acceptance Criteria

1. THE announcements table `target_role` column `CHECK` constraint SHALL permit `'staff'` as a valid value, in addition to the existing values `'all'`, `'student'`, `'teacher'`, and `'parent'`.

2. WHEN a user with `role = 'staff'` requests `GET /api/announcements`, THE Announcements Service SHALL return all announcements where `target_role = 'all'` OR `target_role = 'staff'`.

3. WHEN an admin creates an announcement via `POST /api/announcements` with `target_role = 'staff'`, THE Announcements Service SHALL persist the record and respond with HTTP 201.

4. IF an admin submits `POST /api/announcements` with a `target_role` value not in `['all', 'student', 'teacher', 'parent', 'staff']`, THEN THE Announcements Service SHALL respond with HTTP 422 and an error message listing the valid values.

5. WHERE the admin panel provides a UI form for creating announcements, THE Admin Panel SHALL include `'Staff'` as a selectable option in the target audience dropdown.

---

### Requirement 3: Staff Work Reports

**User Story:** As a staff member, I want to submit a plain-text daily report of my work, so that admins can monitor staff activity.

#### Acceptance Criteria

1. THE database SHALL contain a `staff_work_reports` table with columns: `id` (UUID primary key), `staff_id` (UUID foreign key referencing `users.id`), `report_date` (DATE), `content` (TEXT, not null), and `created_at` (TIMESTAMPTZ).

2. WHEN a staff member sends `POST /api/staff-portal/work-reports` with a non-empty `content` string and a valid `report_date`, THE Staff Portal Service SHALL insert a work report record and respond with HTTP 201 and the created record.

3. IF a staff member submits `POST /api/staff-portal/work-reports` with an empty or missing `content` field, THEN THE Staff Portal Service SHALL respond with HTTP 400 and a descriptive error message.

4. WHEN a staff member sends `GET /api/staff-portal/work-reports/my`, THE Staff Portal Service SHALL return all work report records where `staff_id` equals the authenticated user's ID, ordered by `report_date` descending.

5. WHEN an admin sends `GET /api/admin/work-reports`, THE Admin Service SHALL return all work report records joined with the submitting staff member's name and email, ordered by `report_date` descending.

6. WHERE an admin queries work reports with an optional `staff_id` query parameter, THE Admin Service SHALL filter results to the specified staff member's reports only.

7. THE staff portal navigation SHALL include a "Work Reports" section that staff can use to submit and review their own reports.

---

### Requirement 4: File Protection

**User Story:** As a platform operator, I want uploaded files to be accessible only to authenticated users who own the file or are admins, so that private documents are not publicly accessible.

#### Acceptance Criteria

1. THE application SHALL remove the `express.static` middleware that serves the `/uploads` directory without authentication.

2. THE application SHALL expose a `GET /api/files/:filename` route that requires a valid JWT before serving the requested file from the uploads directory.

3. THE database SHALL contain a `file_ownership` table with columns: `id` (UUID primary key), `filename` (VARCHAR, unique), `user_id` (UUID foreign key referencing `users.id`), `uploaded_at` (TIMESTAMPTZ), and `context` (VARCHAR, e.g., `'portfolio'`, `'fee-receipt'`).

4. WHEN a file is successfully uploaded via any existing upload route, THE system SHALL insert a corresponding row into `file_ownership` recording the `filename` and the authenticated user's ID.

5. WHEN an authenticated non-admin user requests `GET /api/files/:filename`, THE File Service SHALL look up the `file_ownership` record for that filename. IF the requesting user's ID does not match the `user_id` on the ownership record, THEN THE File Service SHALL respond with HTTP 403.

6. WHEN an admin user requests `GET /api/files/:filename`, THE File Service SHALL serve the file regardless of the `user_id` on the ownership record.

7. IF no `file_ownership` record exists for the requested filename, THEN THE File Service SHALL respond with HTTP 404.

8. IF the physical file does not exist on disk for the requested filename, THEN THE File Service SHALL respond with HTTP 404.

---

### Requirement 5: Admin Password Reset

**User Story:** As an admin, I want to set a temporary password for a user account and force the user to change it on next login, so that I can restore access to locked-out accounts securely.

#### Acceptance Criteria

1. THE users table SHALL include a `force_password_change` column of type `BOOLEAN` defaulting to `FALSE`.

2. WHEN an admin sends `POST /api/admin/users/:id/reset-password` with a `temporaryPassword` string of at least 8 characters, THE Admin Service SHALL hash the password with bcrypt and update the target user's `password_hash` and set `force_password_change = TRUE`, responding with HTTP 200.

3. IF an admin submits `POST /api/admin/users/:id/reset-password` with a `temporaryPassword` shorter than 8 characters, THEN THE Admin Service SHALL respond with HTTP 400 and the message `"Temporary password must be at least 8 characters."`.

4. WHEN a user with `force_password_change = TRUE` successfully authenticates via `POST /api/auth/login`, THE Auth Service SHALL include `force_password_change: true` in the login response payload.

5. WHEN a user with `force_password_change = TRUE` successfully changes their password via `POST /api/auth/change-password`, THE Auth Service SHALL set `force_password_change = FALSE` for that user.

6. WHERE the admin panel displays a user's detail or management view, THE Admin Panel SHALL provide a "Reset Password" action that invokes the reset endpoint.

---

### Requirement 6: In-App Notifications

**User Story:** As an admin, I want to receive in-app notifications when new users register or files are uploaded, so that I can take timely action on pending items.

#### Acceptance Criteria

1. THE database SHALL contain a `notifications` table with columns: `id` (UUID primary key), `user_id` (UUID foreign key referencing `users.id` — the recipient), `type` (VARCHAR, e.g., `'new_registration'`, `'file_upload'`, `'announcement'`), `message` (TEXT), `is_read` (BOOLEAN defaulting to `FALSE`), `entity_id` (UUID, nullable — the related entity's ID), and `created_at` (TIMESTAMPTZ).

2. THE application SHALL expose a `GET /api/notifications` endpoint that requires authentication and returns all notification records where `user_id` equals the authenticated user's ID, ordered by `created_at` descending.

3. WHEN an authenticated user sends `PATCH /api/notifications/:id/read`, THE Notification Service SHALL set `is_read = TRUE` for the specified notification and respond with HTTP 204.

4. IF the `user_id` on a notification does not match the authenticated user's ID, THEN THE Notification Service SHALL respond with HTTP 403 when that user attempts to mark it as read.

5. WHEN a new user self-registers and a pending account is created, THE system SHALL insert a notification record for every user with `role = 'admin'` with `type = 'new_registration'` and a message identifying the registrant's name and email.

6. WHEN a file upload completes successfully via any upload route, THE system SHALL insert a notification record for every user with `role = 'admin'` with `type = 'file_upload'` and a message identifying the uploader's name and the file context.

7. WHILE the Notification Bell is mounted in the browser, THE Notification Bell SHALL poll `GET /api/notifications` every 60 seconds and update the displayed unread count to reflect the current number of notifications where `is_read = FALSE`.

8. THE Notification Bell SHALL display the unread notification count as a numeric badge on the bell icon; WHEN the unread count exceeds 99, THE Notification Bell SHALL display `"99+"`.
