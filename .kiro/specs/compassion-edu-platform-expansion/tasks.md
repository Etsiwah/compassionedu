# Implementation Plan: CompassionEdu Platform Expansion

## Overview

Tasks are ordered by dependency: database foundation first, then backend services and routes, then frontend components, with property-based tests co-located with each service. All new functionality is strictly additive — no existing routes, tables, or components are modified. The ten phases map to the ten functional modules in the requirements. Property-based tests use `fast-check` (already a dev dependency) and are placed in `.pbt.test.js` files alongside each service.

## Task Dependency Graph

```json
{
  "waves": [
    {
      "wave": 1,
      "label": "Foundation",
      "tasks": ["0.1", "0.2"]
    },
    {
      "wave": 2,
      "label": "Beneficiary Profile Backend",
      "tasks": ["1.1", "1.2"]
    },
    {
      "wave": 3,
      "label": "Timetable Backend",
      "tasks": ["2.1", "2.2"]
    },
    {
      "wave": 4,
      "label": "Notifications Backend",
      "tasks": ["3.1", "3.2", "3.3", "3.4"]
    },
    {
      "wave": 5,
      "label": "Activities Backend",
      "tasks": ["4.1", "4.2"]
    },
    {
      "wave": 6,
      "label": "Enhanced Announcements Backend",
      "tasks": ["5.1", "5.2"]
    },
    {
      "wave": 7,
      "label": "Reports Backend",
      "tasks": ["6.1", "6.2"]
    },
    {
      "wave": 8,
      "label": "Student Uploads Backend",
      "tasks": ["7.1", "7.2"]
    },
    {
      "wave": 9,
      "label": "Extended Profile Backend",
      "tasks": ["8.1", "8.2"]
    },
    {
      "wave": 10,
      "label": "Dashboard Metrics Backend",
      "tasks": ["9.1", "9.2"]
    },
    {
      "wave": 11,
      "label": "Shared Frontend Components",
      "tasks": ["2.5", "3.5", "3.6", "4.5", "7.8", "7.9", "9.3"]
    },
    {
      "wave": 12,
      "label": "Admin Frontend Sections",
      "tasks": ["1.3", "2.3", "3.7", "4.3", "6.3", "9.4"]
    },
    {
      "wave": 13,
      "label": "Student Frontend Sections",
      "tasks": ["1.4", "2.4", "3.8", "4.4", "7.3", "7.4", "7.5", "7.6", "7.7", "8.3", "9.5"]
    },
    {
      "wave": 14,
      "label": "Unit Tests",
      "tasks": ["0.2", "1.5", "2.6", "3.9", "4.6", "6.4", "7.10", "8.4", "9.6"]
    },
    {
      "wave": 15,
      "label": "Property-Based Tests",
      "tasks": ["1.6", "2.7", "3.10", "3.11", "5.3", "6.5", "7.11", "7.12", "7.13", "10.1"]
    },
    {
      "wave": 16,
      "label": "Integration & Navigation",
      "tasks": ["10.2", "10.3"]
    }
  ]
}
```

## Tasks


### Phase 0: Foundation

- [ ] 0.1 Write and run database migration for all new tables and announcement column extensions
  - Create `backend/src/db/migrations/001_expansion.sql` with all 14 new tables: `beneficiary_profiles`, `beneficiary_documents`, `timetable_entries`, `notifications`, `activity_cards`, `fee_receipts`, `cv_uploads`, `semester_results`, `student_activity_posts`, `student_activity_post_media`, `student_experience_posts`, `student_experience_post_media`, `extended_student_profiles`
  - Add 4 new nullable columns to `announcements` via `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`: `is_pinned BOOLEAN DEFAULT FALSE`, `attachment_url TEXT`, `attachment_name VARCHAR(255)`, `target_group VARCHAR(100)`
  - Add all new indexes from the design document (beneficiary, timetable, notifications, activity, upload tables)
  - Update `backend/src/db/migrate.js` to run the new migration file
  - Verify migration runs without errors against the existing schema (all statements use `IF NOT EXISTS`)
  - _Requirements: 1.1, 1.2, 3.1, 5.1, 7.1, 8.1, 9.1, 11.1, 13.1, 14.1, 15.1, 16.1, 17.1, 18.1_

- [ ] 0.2 Create shared Multer upload factory middleware
  - Create `backend/src/middleware/createUpload.js` implementing `createUpload({ subdir, allowedMimes, maxSizeBytes })` factory
  - `fileFilter` calls `cb(err, false)` with a 422-status error for unsupported MIME types; file is never written to disk on rejection
  - `limits.fileSize` set so multer rejects oversized files with a 413 error
  - Create required upload subdirectories: `uploads/beneficiary-docs/`, `uploads/activity-images/`, `uploads/announcement-attachments/`, `uploads/fee-receipts/`, `uploads/cvs/`, `uploads/semester-results/`, `uploads/activity-posts/`, `uploads/experience-posts/`
  - Write unit tests in `backend/src/middleware/createUpload.test.js` verifying allowed MIME types pass and disallowed types are rejected without storing the file
  - _Requirements: 1.4, 1.5, 1.6, 7.2, 8.2, 13.2, 13.3, 14.2, 14.3, 15.3, 15.4, 16.2, 17.2_


### Phase 1: Beneficiary Profile Management

- [ ] 1.1 Implement `beneficiaryService.js`
  - Create `backend/src/services/beneficiaryService.js`
  - `createBeneficiaryProfile(data)`: validates all required fields (project_number, beneficiary_number, name, date_of_birth, gender, phone, email, education_level, school_name, program, academic_year); validates `education_level` is one of `JHS|SHS|Tertiary`; inserts into `beneficiary_profiles`; returns created row
  - `updateBeneficiaryProfile(id, data)`: updates provided fields, returns updated row; throws 404 if not found
  - `getBeneficiaryProfileByStudent(studentId)`: returns the profile for the given student_id; throws 404 if none exists
  - `getBeneficiaryProfileById(id)`: returns a single profile by primary key; throws 404 if not found
  - `listBeneficiaryProfiles({ search })`: returns all profiles; when `search` is provided, filters by name, project_number, or beneficiary_number containing the query string (case-insensitive `ILIKE`)
  - `addBeneficiaryDocument(profileId, { document_type, file_name, url, mime_type, file_size })`: inserts into `beneficiary_documents`; returns created row
  - `getBeneficiaryDocuments(profileId)`: returns all documents for a profile ordered by `uploaded_at DESC`
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 2.1, 2.2, 2.3, 2.4, 2.5_

- [ ] 1.2 Implement `beneficiary` API route
  - Create `backend/src/routes/beneficiary.js`
  - `POST /api/beneficiary` — admin only; calls `createBeneficiaryProfile`; responds 201
  - `GET /api/beneficiary` — admin only; calls `listBeneficiaryProfiles` with optional `?search=` query param; responds 200
  - `GET /api/beneficiary/:id` — admin only; calls `getBeneficiaryProfileById`; responds 200 or 404
  - `PUT /api/beneficiary/:id` — admin only; calls `updateBeneficiaryProfile`; responds 200 or 404
  - `POST /api/beneficiary/:id/documents` — admin only; uses `createUpload` with beneficiary-docs config (PDF/JPEG/PNG/WEBP, 20 MB); calls `addBeneficiaryDocument`; responds 201
  - `GET /api/beneficiary/:id/documents` — admin only; calls `getBeneficiaryDocuments`; responds 200
  - `GET /api/beneficiary/me` — student only; calls `getBeneficiaryProfileByStudent(req.user.id)`; responds 200 or 404
  - _Requirements: 1.1, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 2.1, 2.2, 2.3, 2.4, 2.5, 12.2_

- [ ] 1.3 Build Admin Beneficiary Management UI
  - Create `frontend/src/pages/admin/BeneficiarySection.jsx`
  - Searchable, filterable table listing all beneficiary profiles (columns: Project Number, Beneficiary Number, Name, Education Level, School Name)
  - "Add Beneficiary" form with all required fields and education level dropdown (JHS / SHS / Tertiary)
  - "Edit" action opens a pre-filled form; on submit calls `PUT /api/beneficiary/:id`
  - Document upload panel per profile: file picker restricted to PDF/JPEG/PNG/WEBP, max 20 MB; upload history showing document type, file name, upload date
  - Loading spinner (`LoadingSpinner`) while fetching; error message (`ErrorMessage`) on failure
  - Mobile-responsive glassmorphism layout with orange branding
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 12.3, 12.4, 12.5_

- [ ] 1.4 Build Student Beneficiary Profile View
  - Create `frontend/src/pages/student/BeneficiarySection.jsx`
  - Fetches `GET /api/beneficiary/me`; if 404, displays "No beneficiary record has been assigned" message
  - Displays all profile fields in a read-only card layout
  - Document list showing document type, file name, upload date; hidden entirely if no profile exists
  - Clicking a document opens inline preview for PDF/image files and provides a download link for all types
  - Loading and error state handling
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 12.3, 12.4, 12.5_

- [ ] 1.5 Write unit tests for `beneficiaryService.js`
  - Create `backend/src/services/beneficiaryService.test.js`
  - Mock `pool.query`; test happy-path for each function
  - Test validation errors: missing required fields throw 400, invalid education_level throws 422
  - Test not-found: empty query result throws 404
  - _Requirements: 1.1, 1.2, 1.4, 1.5, 1.6, 2.5_

- [ ] 1.6 Write PBT for Beneficiary Profile Student Isolation
  - Create `backend/src/services/beneficiaryService.pbt.test.js`
  - **Property 8: Beneficiary Profile Student Isolation**
  - **Validates: Requirements 2.5**
  - Property: `getBeneficiaryProfileByStudent(studentId)` never returns a profile whose `student_id` differs from the requested `studentId`, for any valid UUID input
  - Use `fc.uuid()` generator for student IDs; seed test data with known profiles; verify returned profile's `student_id` always equals the requested ID


### Phase 2: Timetable Management

- [ ] 2.1 Implement `timetableService.js`
  - Create `backend/src/services/timetableService.js`
  - `createTimetableEntry(data)`: validates all required fields (subject, teacher_id, day_of_week, start_time, end_time, room, class_group); validates `day_of_week` is one of the 7 valid values; validates `end_time > start_time`; runs teacher conflict check using PostgreSQL `OVERLAPS` predicate; runs room conflict check using `OVERLAPS` predicate; throws 409 with descriptive message on conflict; inserts and returns created row
  - `deleteTimetableEntry(id)`: deletes the entry; throws 404 if not found
  - `listTimetableEntries()`: returns all entries ordered by day_of_week and start_time
  - `getTimetableForClassGroup(classGroup)`: returns all entries for the given class group ordered by day_of_week and start_time; returns empty array (not error) if filtering fails
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 4.1, 4.2, 4.3_

- [ ] 2.2 Implement `timetable` API route
  - Create `backend/src/routes/timetable.js`
  - `GET /api/timetable` — admin only; calls `listTimetableEntries`; responds 200
  - `POST /api/timetable` — admin only; calls `createTimetableEntry`; responds 201 or 409
  - `DELETE /api/timetable/:id` — admin only; calls `deleteTimetableEntry`; responds 204 or 404
  - `GET /api/timetable/student` — student only; resolves student's class group, calls `getTimetableForClassGroup`; responds 200
  - Mount route in `app.js`
  - _Requirements: 3.1, 3.3, 3.4, 3.5, 3.6, 4.1, 4.2, 4.3, 12.2_

- [ ] 2.3 Build Admin Timetable Management UI
  - Create `frontend/src/pages/admin/TimetableSection.jsx`
  - Weekly grid view displaying all timetable entries organized by day and time slot (uses `WeeklyGrid` component)
  - "Add Entry" form: subject, teacher dropdown (users with role=teacher), day of week, start time, end time, room, class group
  - Conflict error displayed inline when API returns 409
  - Delete button per entry with confirmation prompt
  - Loading and error state handling
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 12.3, 12.4, 12.5_

- [ ] 2.4 Build Student Timetable View
  - Create `frontend/src/pages/student/TimetableSection.jsx`
  - Fetches `GET /api/timetable/student` and renders the `WeeklyGrid` component
  - Displays subject name, teacher name, room, start time, end time per slot
  - If no entries, shows a friendly empty state message
  - Loading and error state handling
  - _Requirements: 4.1, 4.2, 4.3, 12.3, 12.4, 12.5_

- [ ] 2.5 Build `WeeklyGrid` reusable timetable component
  - Create `frontend/src/components/timetable/WeeklyGrid.jsx`
  - Accepts `entries` prop; groups entries by day (Monday–Friday); sorts each day's entries by start_time
  - Renders a 5-column responsive grid with day headers in orange
  - Each slot shows subject, teacher, room, and time range
  - Write Vitest unit test in `WeeklyGrid.test.jsx`: verify entries are grouped by day and sorted by start_time
  - _Requirements: 3.6, 4.1, 4.2, 12.3_

- [ ] 2.6 Write unit tests for `timetableService.js`
  - Create `backend/src/services/timetableService.test.js`
  - Mock `pool.query`; test happy-path create, list, delete, and class-group fetch
  - Test conflict detection: mock query returning a row → service throws 409
  - Test validation: missing fields throw 400, invalid day_of_week throws 422, end_time ≤ start_time throws 400
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 4.3_

- [ ] 2.7 Write PBT for Timetable No-Overlap invariant
  - Create `backend/src/services/timetableService.pbt.test.js`
  - **Property 1: Timetable No-Overlap**
  - **Validates: Requirements 3.3, 3.4**
  - Property 1a (teacher): for any two entries with the same teacher_id and day_of_week, their (start_time, end_time) intervals must not overlap; inserting a conflicting entry must be rejected with status 409
  - Property 1b (room): same invariant for room + day_of_week
  - Use `fc.integer({ min: 8, max: 16 })` for start hours, `fc.integer({ min: 1, max: 3 })` for duration, `fc.constantFrom('Monday','Tuesday','Wednesday','Thursday','Friday')` for days


### Phase 3: Enhanced Notifications

- [ ] 3.1 Implement `notificationService.js`
  - Create `backend/src/services/notificationService.js`
  - `createNotification({ message, type, target, target_user_id })`: validates `type` is one of `announcement|fee_reminder|attendance_alert|project_update`; validates `target` is one of `all_students|all_parents|specific_user`; resolves recipient user IDs based on target; bulk-inserts one row per recipient into `notifications`; returns `{ id, recipients_count }`
  - `getNotificationsForUser(userId)`: returns all notifications for the user ordered by `created_at DESC`
  - `getUnreadCount(userId)`: returns count of rows where `user_id = userId AND is_read = FALSE`
  - `markNotificationRead(notificationId, userId)`: updates `is_read = TRUE, read_at = NOW()` only if `is_read` is currently FALSE (idempotent — no-op if already read, does not overwrite `read_at`); throws 404 if notification does not belong to the user
  - `queueFeeReminders(studentIds)`: bulk-inserts `fee_reminder` notifications for the given student IDs
  - `createAttendanceAlerts(studentIds)`: for each student, inserts an `attendance_alert` notification for the student and for each linked parent via `parent_student_links`
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 6.1, 6.2, 6.3, 6.4, 6.5_

- [ ] 3.2 Implement `notifications` API route
  - Create `backend/src/routes/notifications.js`
  - `GET /api/notifications` — student/parent; calls `getNotificationsForUser(req.user.id)`; responds 200
  - `POST /api/notifications` — admin only; calls `createNotification`; responds 201 with `{ id, recipients_count }`
  - `PATCH /api/notifications/:id/read` — student/parent; calls `markNotificationRead`; responds 200 or 404
  - `GET /api/notifications/unread-count` — student/parent; calls `getUnreadCount`; responds 200 with `{ count }`
  - Mount route in `app.js`
  - _Requirements: 5.1, 5.3, 6.1, 6.2, 6.3, 6.4, 6.5, 12.2_

- [ ] 3.3 Implement `attendanceScheduler.js` background job
  - Create `backend/src/jobs/attendanceScheduler.js`
  - `startAttendanceScheduler()`: schedules a daily job (consistent with existing `feeScheduler.js` pattern using `setInterval`)
  - Job queries students whose attendance percentage is below 75% and calls `notificationService.createAttendanceAlerts(studentIds)`
  - Export `startAttendanceScheduler`
  - Add startup call in `app.js` alongside the existing fee scheduler (wrapped in try/catch)
  - _Requirements: 5.5_

- [ ] 3.4 Integrate fee overdue notifications into `feeScheduler.js`
  - Update `backend/src/jobs/feeScheduler.js` to call `notificationService.queueFeeReminders(overdueStudentIds)` after marking fees as overdue
  - Notifications are queued (inserted) but not sent immediately — they appear in the student's notification list on next poll
  - _Requirements: 5.4_

- [ ] 3.5 Build `NotificationBell` component
  - Create `frontend/src/components/notifications/NotificationBell.jsx`
  - Polls `GET /api/notifications/unread-count` every 60 000 ms using `setInterval` in a `useEffect`; clears interval on unmount
  - Displays a bell icon with an orange badge showing the unread count; shows "99+" when count exceeds 99; badge hidden when count is 0
  - Clicking the bell opens the `NotificationPanel`
  - Write Vitest test: verify badge renders with correct count and polling interval is set to 60 000 ms
  - _Requirements: 6.1, 6.4_

- [ ] 3.6 Build `NotificationPanel` component
  - Create `frontend/src/components/notifications/NotificationPanel.jsx`
  - Fetches `GET /api/notifications` when opened; displays notifications in reverse chronological order
  - Visually distinguishes unread (highlighted background) from read items
  - "Mark as read" button per notification calls `PATCH /api/notifications/:id/read` and updates local state; badge count decrements
  - Shows notification type badge, message, and timestamp
  - Loading spinner while fetching; error message on failure
  - _Requirements: 6.2, 6.3, 6.5_

- [ ] 3.7 Build Admin Notifications Management UI
  - Create `frontend/src/pages/admin/NotificationsSection.jsx`
  - Form to compose and send a notification: message textarea, type dropdown (announcement / fee_reminder / attendance_alert / project_update), target dropdown (all_students / all_parents / specific_user)
  - When "specific_user" is selected, shows a user search field
  - On submit calls `POST /api/notifications`; shows success confirmation with recipient count
  - Loading and error state handling
  - _Requirements: 5.1, 5.2, 5.3, 12.3, 12.4, 12.5_

- [ ] 3.8 Build Student Notifications Section UI
  - Create `frontend/src/pages/student/NotificationsSection.jsx`
  - Full notification history view: type badge, message, timestamp, read/unread indicator
  - "Mark all as read" button
  - Integrates `NotificationPanel` list rendering
  - Loading and error state handling
  - _Requirements: 6.2, 6.3, 6.5, 12.3, 12.4, 12.5_

- [ ] 3.9 Write unit tests for `notificationService.js`
  - Create `backend/src/services/notificationService.test.js`
  - Mock `pool.query`; test happy-path for each function
  - Test `createNotification` with each target type resolves correct user IDs
  - Test `markNotificationRead` is idempotent: calling twice does not change `read_at`
  - Test invalid type/target throws 422
  - _Requirements: 5.1, 5.2, 5.3, 6.3_

- [ ] 3.10 Write PBT for Notification Delivery Completeness
  - Create `backend/src/services/notificationService.pbt.test.js`
  - **Property 3: Notification Delivery Completeness**
  - **Validates: Requirements 5.1, 5.3**
  - Property: when `createNotification` is called with `target = 'all_students'` and there are N active students, exactly N notification rows are inserted — no student is skipped and no student receives more than one row per send operation
  - Use `fc.array(fc.record({ id: fc.uuid() }), { minLength: 1, maxLength: 20 })` to generate student sets

- [ ] 3.11 Write PBT for Notification Read Idempotency
  - Add to `backend/src/services/notificationService.pbt.test.js`
  - **Property 4: Notification Read Idempotency**
  - **Validates: Requirements 6.3**
  - Property: calling `markNotificationRead(id, userId)` N times (N ≥ 1) always results in `is_read = true` and `read_at` equal to the timestamp of the first call; subsequent calls do not change `read_at`
  - Use `fc.integer({ min: 2, max: 10 })` for the repeat count


### Phase 4: Student Activities / Child News

- [ ] 4.1 Implement `activityService.js`
  - Create `backend/src/services/activityService.js`
  - `createActivityCard({ title, details, event_date, image_url, created_by })`: validates required fields (title, details, event_date); inserts into `activity_cards`; returns created row
  - `deleteActivityCard(id)`: deletes the card; throws 404 if not found
  - `listActivityCards()`: returns all cards ordered by `created_at DESC`
  - `getRecentActivityCards(limit = 5)`: returns the most recent N cards ordered by `created_at DESC`
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [ ] 4.2 Implement `activities` API route
  - Create `backend/src/routes/activities.js`
  - `GET /api/activities` — admin and student; calls `listActivityCards`; responds 200
  - `POST /api/activities` — admin only; uses `createUpload` with activity-images config (JPEG/PNG/WEBP, 10 MB); calls `createActivityCard`; responds 201
  - `DELETE /api/activities/:id` — admin only; calls `deleteActivityCard`; responds 204 or 404
  - `GET /api/activities/recent` — student only; calls `getRecentActivityCards(5)`; responds 200
  - Mount route in `app.js`
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 12.2_

- [ ] 4.3 Build Admin Activities Management UI
  - Create `frontend/src/pages/admin/ActivitiesSection.jsx`
  - List of all activity cards in reverse chronological order with image thumbnail, title, date, details summary
  - "Add Activity" form: title, date, details textarea, optional image upload (JPEG/PNG/WEBP, max 10 MB)
  - Delete button per card with confirmation prompt
  - Loading and error state handling
  - _Requirements: 7.1, 7.2, 7.3, 12.3, 12.4, 12.5_

- [ ] 4.4 Build Student Activities Section UI
  - Create `frontend/src/pages/student/ActivitiesSection.jsx`
  - Displays all activity cards in reverse chronological order using the `ActivityCard` component
  - Loading and error state handling
  - _Requirements: 7.4, 7.5, 12.3, 12.4, 12.5_

- [ ] 4.5 Build `ActivityCard` reusable component
  - Create `frontend/src/components/activities/ActivityCard.jsx`
  - Accepts `{ title, event_date, details, image_url }` props
  - Renders image (if present) with fallback placeholder, title, formatted date, and details summary
  - Glassmorphism card styling with orange accent
  - Write Vitest test: verify card renders title, date, and details; verify image is hidden when `image_url` is null
  - _Requirements: 7.4, 12.3_

- [ ] 4.6 Write unit tests for `activityService.js`
  - Create `backend/src/services/activityService.test.js`
  - Mock `pool.query`; test happy-path for create, delete, list, and recent
  - Test missing required fields throw 400
  - Test delete of non-existent card throws 404
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_


### Phase 5: Enhanced Announcements

- [ ] 5.1 Extend `announcementsService.js` with pin/unpin and rich-text support
  - Add `pinAnnouncement(id)` to `backend/src/services/announcementsService.js`: `UPDATE announcements SET is_pinned = TRUE WHERE id = $1 RETURNING *`; throws 404 if no row returned
  - Add `unpinAnnouncement(id)`: `UPDATE announcements SET is_pinned = FALSE WHERE id = $1 RETURNING *`; throws 404 if no row returned
  - Update `getAnnouncementsForUser(userId, role)` to include `ORDER BY is_pinned DESC, created_at DESC` and to filter by `target_group` when set
  - Update `createAnnouncement` to accept optional `attachment_url`, `attachment_name`, `target_group`, and `is_pinned` fields
  - Add unit tests for pin, unpin, and updated ordering to `announcementsService.test.js`
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6_

- [ ] 5.2 Extend `announcements` API route with pin/unpin and attachment upload
  - Add to `backend/src/routes/announcements.js`:
    - `PUT /api/announcements/:id/pin` — admin only; calls `pinAnnouncement`; responds 200; frontend disables button while request is in-flight
    - `DELETE /api/announcements/:id/pin` — admin only; calls `unpinAnnouncement`; responds 200
  - Update `POST /api/announcements` to use `createUpload` with announcement-attachments config (PDF/JPEG/PNG/WEBP, 20 MB) for optional file attachment
  - Announcement creation form: rich-text textarea (Markdown/HTML), optional attachment file picker, audience targeting dropdown (all / students / teachers / parents / class group name), pin toggle
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 12.2_

- [ ] 5.3 Write PBT for Announcement Feed Order invariant
  - Create `backend/src/services/announcementsService.pbt.test.js` (add to existing file if present)
  - **Property 9: Announcement Feed Order**
  - **Validates: Requirements 8.3, 8.5, 8.6**
  - Property: after any sequence of create/pin/unpin operations, `getAnnouncementsForUser` always returns pinned announcements before non-pinned, and within each group the order is strictly reverse chronological by `created_at`
  - Use `fc.array(fc.record({ is_pinned: fc.boolean(), created_at: fc.date() }), { minLength: 1, maxLength: 20 })` to generate announcement sets


### Phase 6: Reports & Analytics

- [ ] 6.1 Implement `reportService.js`
  - Create `backend/src/services/reportService.js`
  - `generateAttendanceReport(from, to)`: runs the attendance report query from the design document; returns `{ period: { from, to }, students: [...] }`; if no data exists for the range, returns `{ period, students: [] }` — never an error
  - `generateFeeReport()`: runs the fee report query; returns `{ totals: { collected, pending, overdue }, students: [...] }`
  - `generateBeneficiaryReport()`: runs the beneficiary report query; validates all required fields are non-null for every row — if any row has a null required field, throws 422 with a descriptive message; returns `{ beneficiaries: [...] }`
  - `toCSV(headers, rows)`: pure function that builds a CSV string with proper quoting and double-quote escaping; returns the CSV string
  - All report functions return empty arrays (not errors) when no data matches the query
  - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6_

- [ ] 6.2 Implement `reports` API route
  - Create `backend/src/routes/reports.js`
  - `GET /api/reports/attendance?from=&to=` — admin only; calls `generateAttendanceReport`; responds 200 with JSON
  - `GET /api/reports/fees` — admin only; calls `generateFeeReport`; responds 200 with JSON
  - `GET /api/reports/beneficiaries` — admin only; calls `generateBeneficiaryReport`; responds 200 or 422
  - `GET /api/reports/attendance/csv?from=&to=` — admin only; sets `Content-Type: text/csv`, `Content-Disposition: attachment; filename="attendance-report.csv"`; responds 200 or error (no download on error)
  - `GET /api/reports/fees/csv` — admin only; filename `"fee-report.csv"`
  - `GET /api/reports/beneficiaries/csv` — admin only; filename `"beneficiary-report.csv"`; returns error (not download) if report generation fails
  - Mount route in `app.js`
  - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 12.2_

- [ ] 6.3 Build Admin Reports & Analytics UI
  - Create `frontend/src/pages/admin/ReportsSection.jsx`
  - Three report tabs: Attendance, Fees, Beneficiaries
  - Attendance tab: date range picker (from/to), "Generate" button, results table (student name, present/absent/late counts, percentage); "Export CSV" button triggers browser download
  - Fees tab: summary totals (collected/pending/overdue), per-student breakdown table; "Export CSV" button
  - Beneficiaries tab: table with project number, beneficiary number, name, education level, school; "Export CSV" button
  - CSV export: calls the CSV endpoint and triggers browser download via `<a download>` or `window.location`; no download initiated on error
  - Loading spinner while generating; error message if generation fails
  - Empty state message when report returns no data
  - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 12.3, 12.4, 12.5_

- [ ] 6.4 Write unit tests for `reportService.js`
  - Create `backend/src/services/reportService.test.js`
  - Mock `pool.query`; test happy-path for all three report types
  - Test `generateAttendanceReport` with empty result returns `{ students: [] }` not an error
  - Test `generateBeneficiaryReport` with a row containing a null required field throws 422
  - Test `toCSV` with various inputs: empty rows, values containing commas, values containing double-quotes
  - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6_

- [ ] 6.5 Write PBT for Report Empty-Range Safety
  - Create `backend/src/services/reportService.pbt.test.js`
  - **Property 7: Report Empty-Range Safety**
  - **Validates: Requirements 11.6**
  - Property: `generateAttendanceReport(from, to)` always returns `{ students: [] }` (not an error) when the date range contains no attendance data; HTTP status is always 200 for valid date inputs
  - Use `fc.date({ min: new Date('1900-01-01'), max: new Date('1900-12-31') })` to generate dates guaranteed to have no data


### Phase 7: Student Self-Service Uploads

- [ ] 7.1 Implement `studentUploadService.js`
  - Create `backend/src/services/studentUploadService.js`

  **Fee Receipts:**
  - `uploadFeeReceipt(studentId, fileData)`: marks any existing `is_current = TRUE` receipt as `is_current = FALSE`; inserts new receipt with `status = 'pending_review', is_current = TRUE`; returns created row
  - `getFeeReceiptHistory(studentId)`: returns all receipts ordered by `uploaded_at DESC`
  - `reviewFeeReceipt(id, adminId, { action, rejection_reason })`: action is `approved` or `rejected`; updates status, sets `reviewed_by` and `reviewed_at`; notifies student via `notificationService`; throws 404 if not found

  **CV Uploads:**
  - `uploadCV(studentId, fileData)`: computes next version number (MAX(version) + 1, or 1 if none); marks previous `is_current = FALSE`; inserts new CV with `is_current = TRUE`; returns created row
  - `getCVHistory(studentId)`: returns all CV versions ordered by `version DESC`
  - `reviewCV(id, adminId, { action })`: updates status to `approved`; notifies student; throws 404 if not found

  **Semester Results:**
  - `uploadSemesterResult(studentId, { academic_year, semester, gpa, ...fileData })`: validates `semester` is 1, 2, or 3; validates `gpa` is between 0.0 and 4.0; inserts into `semester_results`; throws 409 if `(student_id, academic_year, semester)` already exists; returns created row
  - `getSemesterResultHistory(studentId)`: returns all results ordered by `academic_year ASC, semester ASC`
  - `reviewSemesterResult(id, adminId, { action, rejection_reason, admin_remarks })`: updates status and remarks; notifies student; throws 404 if not found

  **Activity Posts:**
  - `submitActivityPost(studentId, { title, description, post_date })`: inserts with `status = 'pending_review'`; notifies admin; returns created row
  - `addActivityPostMedia(postId, mediaData)`: inserts into `student_activity_post_media`
  - `getStudentActivityPosts(studentId)`: returns all posts for the student (all statuses) ordered by `created_at DESC`
  - `getPublishedActivityPosts()`: returns all published posts ordered by `is_highlighted DESC, created_at DESC`
  - `reviewActivityPost(id, adminId, { action, rejection_reason })`: action is `published` or `rejected`; validates mutual exclusivity (approved post cannot be rejected and vice versa); updates status; notifies student on rejection; throws 404 if not found
  - `highlightActivityPost(id, adminId)`: sets `is_highlighted = TRUE`; throws 404 if not found

  **Experience Posts:**
  - `submitExperiencePost(studentId, { title, description, post_date })`: inserts with `status = 'pending_review'`; notifies admin; returns created row
  - `addExperiencePostMedia(postId, mediaData)`: inserts into `student_experience_post_media`
  - `getStudentExperiencePosts(studentId)`: returns all posts for the student (all statuses) ordered by `created_at DESC`
  - `reviewExperiencePost(id, adminId, { action, rejection_reason })`: action is `published` or `rejected`; validates mutual exclusivity; updates status; notifies student on rejection; throws 404 if not found
  - `setExperiencePostVisibility(id, adminId, isVisible)`: sets `is_visible`; throws 404 if not found
  - _Requirements: 13.1–13.8, 14.1–14.8, 15.1–15.8, 16.1–16.7, 17.1–17.6_

- [ ] 7.2 Implement `student-uploads` API route
  - Create `backend/src/routes/student-uploads.js`
  - Fee receipts: `POST /api/student-uploads/fee-receipts` (student, PDF/JPEG/PNG, 20 MB); `GET /api/student-uploads/fee-receipts` (student); `PATCH /api/student-uploads/fee-receipts/:id` (admin)
  - CV: `POST /api/student-uploads/cv` (student, PDF/DOCX, 20 MB); `GET /api/student-uploads/cv` (student); `PATCH /api/student-uploads/cv/:id` (admin)
  - Semester results: `POST /api/student-uploads/semester-results` (student, PDF/JPEG/PNG/WEBP, 20 MB); `GET /api/student-uploads/semester-results` (student); `PATCH /api/student-uploads/semester-results/:id` (admin)
  - Activity posts: `POST /api/student-uploads/activity-posts` (student, JPEG/PNG/WEBP/MP4, 50 MB); `GET /api/student-uploads/activity-posts` (student); `PATCH /api/student-uploads/activity-posts/:id` (admin); `GET /api/student-uploads/activity-posts/published` (student)
  - Experience posts: `POST /api/student-uploads/experience-posts` (student, JPEG/PNG/WEBP/MP4, 50 MB); `GET /api/student-uploads/experience-posts` (student); `PATCH /api/student-uploads/experience-posts/:id` (admin)
  - Mount route in `app.js`
  - _Requirements: 13.1–13.8, 14.1–14.8, 15.1–15.8, 16.1–16.7, 17.1–17.6, 12.2_

- [ ] 7.3 Build Fee Receipt Upload UI
  - Create fee receipt section within `frontend/src/pages/student/UploadsSection.jsx`
  - File picker restricted to PDF/JPEG/PNG; shows `FilePreview` component before submission
  - On submit calls `POST /api/student-uploads/fee-receipts`
  - Upload history table: file name, upload date, status badge (pending_review / approved / rejected)
  - Admin view: list of all pending receipts with approve/reject actions and rejection reason input
  - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 13.6, 13.7, 13.8, 12.3, 12.4, 12.5_

- [ ] 7.4 Build CV Upload UI
  - Create CV section within `frontend/src/pages/student/UploadsSection.jsx`
  - File picker restricted to PDF/DOCX; shows PDF preview via `FilePreview` for PDF files
  - On submit calls `POST /api/student-uploads/cv`
  - Version history list: version number, file name, upload date; current version clearly marked
  - Admin view: all CV versions with download links per version; approve button
  - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5, 14.6, 14.7, 14.8, 12.3, 12.4, 12.5_

- [ ] 7.5 Build Semester Result Upload UI
  - Create semester results section within `frontend/src/pages/student/UploadsSection.jsx`
  - Form fields: academic year (text), semester (dropdown: 1/2/3), GPA (number input 0.0–4.0), result file (PDF/JPEG/PNG/WEBP)
  - Timeline of semester cards ordered by academic year and semester: GPA, status badge, admin remarks
  - Academic progress chart (line chart using recharts) showing GPA trend across approved semesters in chronological order
  - Admin view: approve/reject with remarks input
  - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5, 15.6, 15.7, 15.8, 12.3, 12.4, 12.5_

- [ ] 7.6 Build Student Activity Post UI
  - Create activity posts section within `frontend/src/pages/student/UploadsSection.jsx`
  - Form: title, description, date, optional media upload (JPEG/PNG/WEBP/MP4, max 50 MB)
  - Personal activity management view: all own posts with status badges
  - Published activity feed: timeline view and gallery view (toggle), reverse chronological; highlighted posts appear at top
  - Admin moderation view: pending posts with approve/reject/highlight actions
  - _Requirements: 16.1, 16.2, 16.3, 16.4, 16.5, 16.6, 16.7, 12.3, 12.4, 12.5_

- [ ] 7.7 Build Student Experience Post UI
  - Create experience posts section within `frontend/src/pages/student/UploadsSection.jsx`
  - Form: title, description, date, optional media with captions (JPEG/PNG/WEBP/MP4, max 50 MB)
  - Personal experience management view: all own posts with status badges
  - Published experience feed: card-based, reverse chronological, showing title, date, media thumbnail, description summary
  - Admin moderation view: approve/reject and set visibility actions
  - _Requirements: 17.1, 17.2, 17.3, 17.4, 17.5, 17.6, 12.3, 12.4, 12.5_

- [ ] 7.8 Build `FilePreview` reusable component
  - Create `frontend/src/components/uploads/FilePreview.jsx`
  - Accepts a `File` object prop; renders inline PDF preview (`<iframe>` or `<embed>`) for PDF files; renders `<img>` for image files; renders a filename label for other types
  - Write Vitest test: verify PDF preview renders `<iframe>`, image preview renders `<img>`, unsupported type renders filename only
  - _Requirements: 13.4, 14.4_

- [ ] 7.9 Build `UploadHistory` reusable component
  - Create `frontend/src/components/uploads/UploadHistory.jsx`
  - Accepts `items` array and `columns` config prop; renders a table with file name, upload date, and status badge
  - Status badge colors: pending_review = yellow, approved = green, rejected = red
  - Write Vitest test: verify correct number of rows rendered and status badge colors
  - _Requirements: 13.6, 14.6, 15.7_

- [ ] 7.10 Write unit tests for `studentUploadService.js`
  - Create `backend/src/services/studentUploadService.test.js`
  - Mock `pool.query`; test happy-path for each upload and review function
  - Test `uploadCV` version increment: first upload = version 1, second = version 2
  - Test `uploadSemesterResult` duplicate throws 409
  - Test `reviewActivityPost` with action `published` then `rejected` on same post throws error (mutual exclusivity)
  - Test missing required fields throw 400; invalid GPA range throws 422
  - _Requirements: 13.1–13.8, 14.1–14.8, 15.1–15.8, 16.1–16.7, 17.1–17.6_

- [ ] 7.11 Write PBT for Upload Atomicity
  - Create `backend/src/services/studentUploadService.pbt.test.js`
  - **Property 2: Upload Atomicity**
  - **Validates: Requirements 1.4, 1.5, 1.6, 13.2, 13.3, 14.2, 14.3, 15.3, 15.4**
  - Property: for every upload domain, if the file's MIME type is not in the allowed list, the row count in the relevant table is identical before and after the rejected upload attempt
  - Use `fc.constantFrom('text/plain','application/zip','video/avi','application/x-msdownload')` for invalid MIME types

- [ ] 7.12 Write PBT for CV Version Monotonicity
  - Add to `backend/src/services/studentUploadService.pbt.test.js`
  - **Property 5: CV Version Monotonicity**
  - **Validates: Requirements 14.5, 14.6**
  - Property: after N sequential CV uploads for the same student, the `version` values are strictly increasing (1, 2, 3, …, N) with no gaps or duplicates; the latest upload always has the highest version number
  - Use `fc.integer({ min: 1, max: 10 })` for upload count

- [ ] 7.13 Write PBT for Semester Result Uniqueness
  - Add to `backend/src/services/studentUploadService.pbt.test.js`
  - **Property 6: Semester Result Uniqueness**
  - **Validates: Requirements 15.1, 15.2**
  - Property: attempting to insert two `semester_results` rows with the same `(student_id, academic_year, semester)` always results in a 409 error; only one row exists in the table after the second attempt
  - Use `fc.constantFrom('2024/2025','2023/2024')` for academic years and `fc.constantFrom(1,2,3)` for semesters


### Phase 8: Extended Student Profile

- [ ] 8.1 Extend `profileService.js` with extended profile functions
  - Add to `backend/src/services/profileService.js`:
  - `getExtendedStudentProfile(studentId)`: runs the JOIN query from the design document across `users`, `extended_student_profiles`, `beneficiary_profiles`, and `profile_photos`; returns the unified profile object; throws 404 if user not found
  - `upsertExtendedStudentProfile(studentId, data)`: only allows updating `phone`, `email`, `address`, `guardian_name`; rejects any attempt to update identity or education fields with a 403 error; uses `INSERT ... ON CONFLICT (user_id) DO UPDATE`; returns updated row
  - `updateProfilePicture(studentId, { url })`: inserts a new `profile_photos` row with `is_default = TRUE` and sets all previous photos for the student to `is_default = FALSE`
  - _Requirements: 18.1, 18.2, 18.3, 18.4, 18.5, 18.6, 18.7_

- [ ] 8.2 Extend `profile` API route with extended profile endpoints
  - Add to `backend/src/routes/profile.js`:
  - `GET /api/profile/extended/:studentId` — admin or the student themselves (validate `req.user.id === studentId` OR `req.user.role === 'admin'`); calls `getExtendedStudentProfile`; responds 200 or 404
  - `PATCH /api/profile/extended` — student only; calls `upsertExtendedStudentProfile(req.user.id, req.body)`; responds 200 or 403
  - `POST /api/profile/picture` — student only; uses `createUpload` with photos config (JPEG/PNG/WEBP, 10 MB); calls `updateProfilePicture`; responds 200
  - _Requirements: 18.1, 18.2, 18.3, 18.4, 18.5, 18.6, 18.7, 12.2_

- [ ] 8.3 Build Extended Student Profile UI
  - Create `frontend/src/pages/student/ExtendedProfileSection.jsx`
  - Identity section (read-only for students): Student Name, School Name, Family Name, Project Number, Beneficiary Number, Profile Picture (circular crop)
  - Personal section (editable): Phone, Email, Address, Guardian Name; inline edit with save button; calls `PATCH /api/profile/extended`
  - Education section (read-only for students): Current School, Education Level, Program, Current Level/Year, Academic Year
  - Profile picture upload: file picker (JPEG/PNG/WEBP, max 10 MB), preview before upload, calls `POST /api/profile/picture`
  - Admin view of `GET /api/profile/extended/:studentId`: all sections plus tabs/accordion for uploaded documents, CV versions, fee receipts, semester results, activity posts, experience posts
  - Loading and error state handling
  - _Requirements: 18.1, 18.2, 18.3, 18.4, 18.5, 18.6, 18.7, 12.3, 12.4, 12.5_

- [ ] 8.4 Write unit tests for extended profile service functions
  - Add to `backend/src/services/profileService.test.js` (or create if not exists):
  - Test `getExtendedStudentProfile` returns joined data correctly
  - Test `upsertExtendedStudentProfile` with identity field in body throws 403
  - Test `updateProfilePicture` sets new photo as default and clears previous defaults
  - _Requirements: 18.4, 18.5, 18.7_


### Phase 9: Dashboard Expansion

- [ ] 9.1 Extend `adminService.js` with dashboard metrics function
  - Add `getDashboardMetrics()` to `backend/src/services/adminService.js`
  - Runs five parallel queries using `Promise.all` as specified in the design document:
    1. Total active students count
    2. System-wide average attendance percentage
    3. Total fees collected (sum of paid fees)
    4. Active beneficiaries count
    5. Pending actions count (sum of pending_review items across all upload tables + overdue fees)
  - Returns `{ total_students, attendance_pct, fees_collected, active_beneficiaries, pending_actions }`
  - _Requirements: 9.1, 9.2, 9.3_

- [ ] 9.2 Add dashboard metrics endpoint to `admin` route
  - Add to `backend/src/routes/admin.js`:
  - `GET /api/admin/dashboard/metrics` — admin only; calls `getDashboardMetrics`; responds 200; designed to complete within 2 seconds under normal load
  - _Requirements: 9.1, 9.2, 9.3, 12.2_

- [ ] 9.3 Build `DashboardCard` reusable component
  - Create `frontend/src/components/common/DashboardCard.jsx`
  - Accepts `{ label, value, icon, onClick }` props
  - Renders glassmorphism card with orange icon background, label in gray, value in white bold
  - Calls `onClick` when clicked (for navigation)
  - Write Vitest test: verify label and value render correctly; verify `onClick` is called on click
  - _Requirements: 9.3, 10.3_

- [ ] 9.4 Expand Admin Dashboard with new metric cards
  - Update `frontend/src/components/admin/CompassionDashboard.jsx` (or admin dashboard home page)
  - Fetch `GET /api/admin/dashboard/metrics` on load
  - Render five `DashboardCard` components: Total Students, Attendance %, Fees Collected, Active Beneficiaries, Pending Actions
  - Each card has a contextual icon (users, chart, currency, heart, bell)
  - Loading spinner while fetching; error message on failure
  - _Requirements: 9.1, 9.2, 9.3, 12.3, 12.4, 12.5_

- [ ] 9.5 Expand Student Dashboard with summary cards
  - Update the student dashboard home page component
  - Fetch student-specific metrics: attendance percentage, fee status, unread notification count, recent activity count
  - Render six `DashboardCard` components: My Attendance, My Fees, Timetable (link), Results (link), Notifications (unread count), Activities (new count)
  - Clicking each card navigates to the corresponding student portal section
  - Loading and error state handling
  - _Requirements: 10.1, 10.2, 10.3, 12.3, 12.4, 12.5_

- [ ] 9.6 Write unit tests for `getDashboardMetrics`
  - Add to `backend/src/services/adminService.test.js`:
  - Mock all five `pool.query` calls; verify correct values are returned for each metric
  - Test that all five queries run in parallel (Promise.all pattern)
  - Test that null/undefined query results default to 0
  - _Requirements: 9.1, 9.2_


### Phase 10: Integration, Role Access & Navigation

- [ ] 10.1 Write PBT for Role Access Enforcement
  - Create `backend/src/services/roleAccess.pbt.test.js`
  - **Property 10: Role Access Enforcement**
  - **Validates: Requirements 12.2, 12.7**
  - Property 1: every admin-only endpoint returns HTTP 403 when called with a valid student JWT
  - Property 2: every student-only endpoint returns HTTP 403 when called with a valid admin JWT
  - Property 3: all protected endpoints return HTTP 401 when called without a JWT
  - Use `supertest` against the Express app; use `fc.constantFrom(...adminOnlyPaths)` and `fc.constantFrom(...studentOnlyPaths)` to generate endpoint samples
  - Cover at minimum: `POST /api/beneficiary`, `POST /api/timetable`, `POST /api/notifications`, `POST /api/activities`, `GET /api/reports/attendance`, `GET /api/student-uploads/fee-receipts`, `GET /api/student-uploads/cv`

- [ ] 10.2 Mount all new routes in `app.js`
  - Add the following `mountIfExists` calls to `backend/src/app.js` (no existing lines modified):
    - `mountIfExists('./routes/beneficiary',     '/api/beneficiary')`
    - `mountIfExists('./routes/timetable',       '/api/timetable')`
    - `mountIfExists('./routes/notifications',   '/api/notifications')`
    - `mountIfExists('./routes/activities',      '/api/activities')`
    - `mountIfExists('./routes/reports',         '/api/reports')`
    - `mountIfExists('./routes/student-uploads', '/api/student-uploads')`
  - Add `startAttendanceScheduler` startup call alongside the existing fee scheduler (wrapped in try/catch)
  - Verify the app starts cleanly with all routes mounted and no existing routes broken
  - _Requirements: 12.1_

- [ ] 10.3 Add sidebar navigation links for all new sections
  - Update the admin sidebar navigation component to include links to: Beneficiary Profiles, Timetable, Notifications, Activities, Reports
  - Update the student sidebar navigation component to include links to: My Beneficiary Profile, Timetable, Notifications, Activities, My Uploads (with sub-links: Fee Receipts, CV, Semester Results, Activity Posts, Experience Posts), My Profile
  - Add new nested `<Route>` entries in `AdminDashboard.jsx` and `StudentPortal.jsx` for all new sections as specified in the design document
  - Ensure all new links use the existing sidebar styling (glassmorphism, orange active state, mobile-responsive)
  - Verify no existing routes or components are modified — only additions
  - _Requirements: 12.1, 12.3_


## Notes

- All new backend files follow the established `'use strict'; const pool = require('../db/pool');` pattern
- All new route files use `requireAuth` + `requireRole` middleware from the existing middleware directory
- File uploads use the `createUpload` factory (task 0.2) — never raw multer instances
- PBT tests use `fast-check` (already in `devDependencies`) and are in `.pbt.test.js` files
- Frontend components use the existing `LoadingSpinner` and `ErrorMessage` components for all async states
- No existing routes, tables, or components are modified — all changes are strictly additive (Requirement 12.1)
- The `mountIfExists` pattern in `app.js` means routes can be developed and tested independently before final wiring in task 10.2
- CSV export uses manual string construction (`toCSV` in `reportService.js`) — no additional npm dependency required
- Notification polling interval is exactly 60 000 ms (Requirement 6.4)
- Timetable conflict detection uses PostgreSQL's native `OVERLAPS` predicate for correctness and index efficiency
- The `extended_student_profiles` table stores only mutable personal/education fields; identity fields are sourced from `users` and `beneficiary_profiles` (read-only for students)
