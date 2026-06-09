# Design Document: CompassionEdu Platform Expansion

## Overview

This document describes the technical design for expanding the CompassionEdu School Management System into a complete School + Beneficiary Management Platform. The expansion adds six new functional modules — Beneficiary Profile Management, Timetable Management, Enhanced Notifications, Student Activities / Child News, Enhanced Announcements, and Reports & Analytics — plus extended Admin and Student dashboards, and student self-service uploads (fee receipts, CVs, semester results, activity posts, experience posts, extended profile).

All new functionality is strictly additive: no existing routes, tables, or components are modified. New modules follow the established service/route pattern (`pool.query` in service files, `requireAuth`/`requireRole` middleware in route files) and the existing glassmorphism + orange branding design language.

**Research Summary:**
- PostgreSQL time-overlap detection uses the standard interval overlap predicate: `(start1, end1) OVERLAPS (start2, end2)`, natively supported and index-friendly.
- CSV generation in Node.js is handled with manual string building (simple, no extra dependency) or the `csv-stringify` package; the existing `pdfkit` dependency covers PDF generation if needed.
- Polling-based notifications are the simplest approach consistent with the existing stack; WebSockets would require additional infrastructure not present in the codebase.
- The `fast-check` PBT library (already a dev dependency) is used for all property-based tests.

---

## Architecture

### Integration with Existing System

New modules are mounted in `app.js` via the existing `mountIfExists` pattern. Each new domain gets its own service file and route file.

```
backend/src/
  routes/
    beneficiary.js          ← NEW: /api/beneficiary
    timetable.js            ← NEW: /api/timetable
    notifications.js        ← NEW: /api/notifications
    activities.js           ← NEW: /api/activities
    reports.js              ← NEW: /api/reports
    student-uploads.js      ← NEW: /api/student-uploads
  services/
    beneficiaryService.js
    timetableService.js
    notificationService.js
    activityService.js
    reportService.js
    studentUploadService.js
  middleware/
    createUpload.js         ← NEW: multer factory
  jobs/
    attendanceScheduler.js  ← NEW: attendance alert cron

frontend/src/
  pages/
    admin/
      BeneficiarySection.jsx
      TimetableSection.jsx
      NotificationsSection.jsx
      ActivitiesSection.jsx
      ReportsSection.jsx
    student/
      BeneficiarySection.jsx
      TimetableSection.jsx
      NotificationsSection.jsx
      ActivitiesSection.jsx
      UploadsSection.jsx
      ExtendedProfileSection.jsx
  components/
    notifications/
      NotificationBell.jsx
      NotificationPanel.jsx
    timetable/
      WeeklyGrid.jsx
    activities/
      ActivityCard.jsx
    uploads/
      FilePreview.jsx
      UploadHistory.jsx
```

### High-Level Architecture Diagram

```mermaid
graph TD
    subgraph Frontend
        A[React + Vite] --> B[AdminDashboard]
        A --> C[StudentPortal]
        B --> B1[BeneficiarySection]
        B --> B2[TimetableSection]
        B --> B3[NotificationsSection]
        B --> B4[ActivitiesSection]
        B --> B5[ReportsSection]
        C --> C1[BeneficiarySection]
        C --> C2[TimetableSection]
        C --> C3[NotificationsSection]
        C --> C4[ActivitiesSection]
        C --> C5[UploadsSection]
        C --> C6[ExtendedProfileSection]
    end

    subgraph Backend
        D[Express.js] --> E[/api/beneficiary]
        D --> F[/api/timetable]
        D --> G[/api/notifications]
        D --> H[/api/activities]
        D --> I[/api/reports]
        D --> J[/api/student-uploads]
        E --> K[(PostgreSQL)]
        F --> K
        G --> K
        H --> K
        I --> K
        J --> K
    end

    A -->|JWT Bearer| D
    J -->|multer| L[uploads/]
```

---

## Components and Interfaces

### Backend Service Pattern

All new services follow the established pattern:

```javascript
'use strict';
const pool = require('../db/pool');

async function createBeneficiaryProfile(data) { /* pool.query(...) */ }
async function getBeneficiaryProfile(studentId) { /* pool.query(...) */ }
module.exports = { createBeneficiaryProfile, getBeneficiaryProfile };
```

All new route files follow:

```javascript
'use strict';
const express = require('express');
const requireAuth = require('../middleware/requireAuth');
const requireRole = require('../middleware/requireRole');
const svc = require('../services/beneficiaryService');
const router = express.Router();

router.post('/', requireAuth, requireRole('admin'), async (req, res, next) => { ... });
router.get('/me', requireAuth, requireRole('student'), async (req, res, next) => { ... });
module.exports = router;
```

### New API Endpoints Summary

| Method | Path | Role | Description |
|--------|------|------|-------------|
| POST | /api/beneficiary | admin | Create beneficiary profile |
| GET | /api/beneficiary | admin | List all profiles (search/filter) |
| GET | /api/beneficiary/:id | admin | Get single profile |
| PUT | /api/beneficiary/:id | admin | Update profile |
| POST | /api/beneficiary/:id/documents | admin | Upload document to profile |
| GET | /api/beneficiary/me | student | Get own beneficiary profile |
| GET | /api/timetable | admin | List all timetable entries |
| POST | /api/timetable | admin | Create timetable entry |
| DELETE | /api/timetable/:id | admin | Delete timetable entry |
| GET | /api/timetable/student | student | Get student's class group timetable |
| GET | /api/notifications | student,parent | Get notifications for authenticated user |
| POST | /api/notifications | admin | Create and send notification |
| PATCH | /api/notifications/:id/read | student,parent | Mark notification as read |
| GET | /api/notifications/unread-count | student,parent | Get unread badge count |
| GET | /api/activities | admin,student | List activity cards |
| POST | /api/activities | admin | Create activity card |
| DELETE | /api/activities/:id | admin | Delete activity card |
| GET | /api/activities/recent | student | Get 5 most recent for dashboard |
| PUT | /api/announcements/:id/pin | admin | Pin announcement |
| DELETE | /api/announcements/:id/pin | admin | Unpin announcement |
| GET | /api/reports/attendance | admin | Generate attendance report |
| GET | /api/reports/fees | admin | Generate fee report |
| GET | /api/reports/beneficiaries | admin | Generate beneficiary report |
| GET | /api/reports/attendance/csv | admin | Export attendance CSV |
| GET | /api/reports/fees/csv | admin | Export fee CSV |
| GET | /api/reports/beneficiaries/csv | admin | Export beneficiary CSV |
| POST | /api/student-uploads/fee-receipts | student | Upload fee receipt |
| GET | /api/student-uploads/fee-receipts | student | Get own receipt history |
| PATCH | /api/student-uploads/fee-receipts/:id | admin | Approve/reject receipt |
| POST | /api/student-uploads/cv | student | Upload CV version |
| GET | /api/student-uploads/cv | student | Get own CV version history |
| PATCH | /api/student-uploads/cv/:id | admin | Approve CV |
| POST | /api/student-uploads/semester-results | student | Upload semester result |
| GET | /api/student-uploads/semester-results | student | Get own result history |
| PATCH | /api/student-uploads/semester-results/:id | admin | Approve/reject/add remarks |
| POST | /api/student-uploads/activity-posts | student | Submit activity post |
| GET | /api/student-uploads/activity-posts | student | Get own activity posts |
| PATCH | /api/student-uploads/activity-posts/:id | admin | Approve/reject/highlight |
| POST | /api/student-uploads/experience-posts | student | Submit experience post |
| GET | /api/student-uploads/experience-posts | student | Get own experience posts |
| PATCH | /api/student-uploads/experience-posts/:id | admin | Approve/reject/set visibility |
| GET | /api/admin/dashboard/metrics | admin | Extended dashboard metrics |
| GET | /api/profile/extended/:studentId | admin,student | Extended student profile |
| PATCH | /api/profile/extended | student | Update editable profile fields |

### Request / Response Shapes

**POST /api/beneficiary**
```json
// Request body
{
  "student_id": "uuid",
  "project_number": "P-001",
  "beneficiary_number": "B-042",
  "name": "Kwame Asante",
  "date_of_birth": "2005-03-15",
  "gender": "male",
  "phone": "+233201234567",
  "email": "kwame@example.com",
  "education_level": "SHS",
  "school_name": "Accra Academy",
  "program": "General Science",
  "academic_year": "2024/2025"
}
// Response 201
{ "id": "uuid", "student_id": "uuid", "project_number": "P-001", "created_at": "..." }
```

**POST /api/timetable**
```json
// Request body
{
  "subject": "Mathematics",
  "teacher_id": "uuid",
  "day_of_week": "Monday",
  "start_time": "08:00",
  "end_time": "09:00",
  "room": "Room 101",
  "class_group": "SHS1A"
}
// Response 201: persisted entry; 409 on conflict
```

**POST /api/notifications**
```json
// Request body
{ "message": "Your fee payment is overdue.", "type": "fee_reminder", "target": "specific_user", "target_user_id": "uuid" }
// Response 201: { "id": "uuid", "recipients_count": 1 }
```

**GET /api/notifications** (student/parent)
```json
// Response 200
[{ "id": "uuid", "message": "...", "type": "fee_reminder", "is_read": false, "created_at": "..." }]
```

**GET /api/reports/attendance?from=2024-01-01&to=2024-03-31**
```json
// Response 200
{
  "period": { "from": "2024-01-01", "to": "2024-03-31" },
  "students": [
    { "student_id": "uuid", "name": "Kwame Asante", "total": 60, "present": 52, "absent": 5, "late": 3, "percentage": 86.67 }
  ]
}
```

**GET /api/reports/attendance/csv** — responds with `Content-Type: text/csv`, `Content-Disposition: attachment; filename="attendance-report.csv"`.

---

## Data Models

### New Database Tables (14 new tables)

```sql
-- Table 15: beneficiary_profiles
CREATE TABLE IF NOT EXISTS beneficiary_profiles (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id         UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  project_number     VARCHAR(100) NOT NULL,
  beneficiary_number VARCHAR(100) NOT NULL,
  name               VARCHAR(255) NOT NULL,
  date_of_birth      DATE NOT NULL,
  gender             VARCHAR(20) NOT NULL,
  phone              VARCHAR(50) NOT NULL,
  email              VARCHAR(255) NOT NULL,
  education_level    VARCHAR(20) NOT NULL CHECK (education_level IN ('JHS','SHS','Tertiary')),
  school_name        VARCHAR(255) NOT NULL,
  program            VARCHAR(255) NOT NULL,
  academic_year      VARCHAR(20) NOT NULL,
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  updated_at         TIMESTAMPTZ DEFAULT NOW()
);
```

```sql
-- Table 16: beneficiary_documents
CREATE TABLE IF NOT EXISTS beneficiary_documents (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id    UUID REFERENCES beneficiary_profiles(id) ON DELETE CASCADE,
  document_type VARCHAR(50) NOT NULL,
  file_name     VARCHAR(255) NOT NULL,
  url           TEXT NOT NULL,
  mime_type     VARCHAR(100) NOT NULL,
  file_size     BIGINT NOT NULL,
  uploaded_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Table 17: timetable_entries
CREATE TABLE IF NOT EXISTS timetable_entries (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject     VARCHAR(100) NOT NULL,
  teacher_id  UUID REFERENCES users(id) ON DELETE SET NULL,
  day_of_week VARCHAR(10) NOT NULL CHECK (day_of_week IN ('Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday')),
  start_time  TIME NOT NULL,
  end_time    TIME NOT NULL,
  room        VARCHAR(100) NOT NULL,
  class_group VARCHAR(100) NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT chk_time_order CHECK (end_time > start_time)
);

-- Table 18: notifications
CREATE TABLE IF NOT EXISTS notifications (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES users(id) ON DELETE CASCADE,
  message    TEXT NOT NULL,
  type       VARCHAR(30) NOT NULL CHECK (type IN ('announcement','fee_reminder','attendance_alert','project_update')),
  is_read    BOOLEAN DEFAULT FALSE,
  read_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table 19: activity_cards
CREATE TABLE IF NOT EXISTS activity_cards (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title      VARCHAR(255) NOT NULL,
  details    TEXT NOT NULL,
  event_date DATE NOT NULL,
  image_url  TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table 20: fee_receipts
CREATE TABLE IF NOT EXISTS fee_receipts (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id       UUID REFERENCES users(id) ON DELETE CASCADE,
  file_name        VARCHAR(255) NOT NULL,
  url              TEXT NOT NULL,
  mime_type        VARCHAR(100) NOT NULL,
  file_size        BIGINT NOT NULL,
  status           VARCHAR(20) DEFAULT 'pending_review' CHECK (status IN ('pending_review','approved','rejected')),
  rejection_reason TEXT,
  is_current       BOOLEAN DEFAULT TRUE,
  uploaded_at      TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at      TIMESTAMPTZ,
  reviewed_by      UUID REFERENCES users(id)
);

-- Table 21: cv_uploads
CREATE TABLE IF NOT EXISTS cv_uploads (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id  UUID REFERENCES users(id) ON DELETE CASCADE,
  version     INT NOT NULL DEFAULT 1,
  file_name   VARCHAR(255) NOT NULL,
  url         TEXT NOT NULL,
  mime_type   VARCHAR(100) NOT NULL,
  file_size   BIGINT NOT NULL,
  status      VARCHAR(20) DEFAULT 'pending_review' CHECK (status IN ('pending_review','approved','rejected')),
  is_current  BOOLEAN DEFAULT TRUE,
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES users(id)
);
```

```sql
-- Table 22: semester_results
CREATE TABLE IF NOT EXISTS semester_results (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id       UUID REFERENCES users(id) ON DELETE CASCADE,
  academic_year    VARCHAR(20) NOT NULL,
  semester         SMALLINT NOT NULL CHECK (semester IN (1,2,3)),
  gpa              NUMERIC(3,2) NOT NULL CHECK (gpa >= 0.0 AND gpa <= 4.0),
  file_name        VARCHAR(255) NOT NULL,
  url              TEXT NOT NULL,
  mime_type        VARCHAR(100) NOT NULL,
  file_size        BIGINT NOT NULL,
  status           VARCHAR(20) DEFAULT 'pending_review' CHECK (status IN ('pending_review','approved','rejected')),
  admin_remarks    TEXT,
  rejection_reason TEXT,
  uploaded_at      TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at      TIMESTAMPTZ,
  reviewed_by      UUID REFERENCES users(id),
  UNIQUE (student_id, academic_year, semester)
);

-- Table 23: student_activity_posts
CREATE TABLE IF NOT EXISTS student_activity_posts (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id       UUID REFERENCES users(id) ON DELETE CASCADE,
  title            VARCHAR(255) NOT NULL,
  description      TEXT NOT NULL,
  post_date        DATE NOT NULL,
  status           VARCHAR(20) DEFAULT 'pending_review' CHECK (status IN ('pending_review','published','rejected')),
  is_highlighted   BOOLEAN DEFAULT FALSE,
  rejection_reason TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at      TIMESTAMPTZ,
  reviewed_by      UUID REFERENCES users(id)
);

-- Table 24: student_activity_post_media
CREATE TABLE IF NOT EXISTS student_activity_post_media (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id    UUID REFERENCES student_activity_posts(id) ON DELETE CASCADE,
  url        TEXT NOT NULL,
  mime_type  VARCHAR(100) NOT NULL,
  file_size  BIGINT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table 25: student_experience_posts
CREATE TABLE IF NOT EXISTS student_experience_posts (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id       UUID REFERENCES users(id) ON DELETE CASCADE,
  title            VARCHAR(255) NOT NULL,
  description      TEXT NOT NULL,
  post_date        DATE NOT NULL,
  status           VARCHAR(20) DEFAULT 'pending_review' CHECK (status IN ('pending_review','published','rejected')),
  is_visible       BOOLEAN DEFAULT FALSE,
  rejection_reason TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at      TIMESTAMPTZ,
  reviewed_by      UUID REFERENCES users(id)
);

-- Table 26: student_experience_post_media
CREATE TABLE IF NOT EXISTS student_experience_post_media (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id    UUID REFERENCES student_experience_posts(id) ON DELETE CASCADE,
  url        TEXT NOT NULL,
  mime_type  VARCHAR(100) NOT NULL,
  file_size  BIGINT NOT NULL,
  caption    TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table 27: extended_student_profiles
CREATE TABLE IF NOT EXISTS extended_student_profiles (
  user_id        UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  family_name    VARCHAR(255),
  phone          VARCHAR(50),
  address        TEXT,
  guardian_name  VARCHAR(255),
  current_school VARCHAR(255),
  education_level VARCHAR(20) CHECK (education_level IN ('JHS','SHS','Tertiary')),
  program        VARCHAR(255),
  current_level  VARCHAR(50),
  academic_year  VARCHAR(20),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);
```

### Announcement Table Extension

The existing `announcements` table is extended with four new nullable columns via `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`. This is a non-breaking additive migration:

- `is_pinned BOOLEAN DEFAULT FALSE` — supports pinning (Req 8.3, 8.6)
- `attachment_url TEXT` — stores the uploaded attachment path (Req 8.2)
- `attachment_name VARCHAR(255)` — original filename for display (Req 8.2)
- `target_group VARCHAR(100)` — allows class group targeting in addition to role targeting (Req 8.4)

The existing `target_role` column continues to work unchanged. When `target_group` is set, the announcement is delivered to users whose class group matches.

### New Indexes

```sql
CREATE INDEX IF NOT EXISTS idx_beneficiary_profiles_student ON beneficiary_profiles(student_id);
CREATE INDEX IF NOT EXISTS idx_beneficiary_profiles_project ON beneficiary_profiles(project_number);
CREATE INDEX IF NOT EXISTS idx_beneficiary_profiles_number  ON beneficiary_profiles(beneficiary_number);
CREATE INDEX IF NOT EXISTS idx_beneficiary_documents_profile ON beneficiary_documents(profile_id);
CREATE INDEX IF NOT EXISTS idx_timetable_teacher_day ON timetable_entries(teacher_id, day_of_week);
CREATE INDEX IF NOT EXISTS idx_timetable_room_day    ON timetable_entries(room, day_of_week);
CREATE INDEX IF NOT EXISTS idx_timetable_class_group ON timetable_entries(class_group);
CREATE INDEX IF NOT EXISTS idx_notifications_user    ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread  ON notifications(user_id, is_read) WHERE is_read = FALSE;
CREATE INDEX IF NOT EXISTS idx_activity_cards_date   ON activity_cards(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_fee_receipts_student  ON fee_receipts(student_id);
CREATE INDEX IF NOT EXISTS idx_cv_uploads_student    ON cv_uploads(student_id);
CREATE INDEX IF NOT EXISTS idx_semester_results_student ON semester_results(student_id, academic_year, semester);
CREATE INDEX IF NOT EXISTS idx_activity_posts_student ON student_activity_posts(student_id);
CREATE INDEX IF NOT EXISTS idx_activity_posts_status  ON student_activity_posts(status);
CREATE INDEX IF NOT EXISTS idx_experience_posts_student ON student_experience_posts(student_id);
CREATE INDEX IF NOT EXISTS idx_experience_posts_status  ON student_experience_posts(status);
```

---

## File Upload Architecture

### Multer Factory Pattern

A shared factory in `src/middleware/createUpload.js` creates domain-specific multer instances:

```javascript
// src/middleware/createUpload.js
const multer = require('multer');
const path = require('path');

function createUpload({ subdir, allowedMimes, maxSizeBytes }) {
  const storage = multer.diskStorage({
    destination: path.join(__dirname, '../../uploads', subdir),
    filename: (_req, file, cb) => {
      const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      cb(null, `${unique}${path.extname(file.originalname)}`);
    },
  });
  const fileFilter = (_req, file, cb) => {
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      const err = new Error(`Unsupported file type: ${file.mimetype}`);
      err.status = 422;
      cb(err, false);
    }
  };
  return multer({ storage, fileFilter, limits: { fileSize: maxSizeBytes } });
}

module.exports = createUpload;
```

### Upload Configurations by Domain

| Domain | Allowed MIME Types | Max Size | Subdir |
|--------|-------------------|----------|--------|
| Beneficiary documents | application/pdf, image/jpeg, image/png, image/webp | 20 MB | beneficiary-docs/ |
| Activity card images | image/jpeg, image/png, image/webp | 10 MB | activity-images/ |
| Announcement attachments | application/pdf, image/jpeg, image/png, image/webp | 20 MB | announcement-attachments/ |
| Fee receipts | application/pdf, image/jpeg, image/png | 20 MB | fee-receipts/ |
| CV uploads | application/pdf, application/vnd.openxmlformats-officedocument.wordprocessingml.document | 20 MB | cvs/ |
| Semester results | application/pdf, image/jpeg, image/png, image/webp | 20 MB | semester-results/ |
| Activity post media | image/jpeg, image/png, image/webp, video/mp4 | 50 MB | activity-posts/ |
| Experience post media | image/jpeg, image/png, image/webp, video/mp4 | 50 MB | experience-posts/ |
| Profile pictures | image/jpeg, image/png, image/webp | 10 MB | photos/ (existing) |

### Atomic Upload Validation

Multer's `fileFilter` rejects invalid files before they are written to disk. If the filter rejects a file, multer calls `cb(err, false)` and the file is never stored. The route handler checks for multer errors in the `next(err)` chain before any database writes, ensuring atomicity: either the file is stored AND the DB record is created, or neither happens.

---

## Notification System Design

### Architecture

Notifications use a polling model consistent with the existing stack (no WebSocket infrastructure required):

```
Admin action / scheduled job
        ↓
  INSERT INTO notifications (user_id, message, type)
        ↓
  Frontend polls GET /api/notifications/unread-count every 60s
        ↓
  Badge count updates in NotificationBell component
        ↓
  User opens panel → GET /api/notifications → full list
        ↓
  User marks read → PATCH /api/notifications/:id/read
```

### Auto-Trigger Notifications

Two scheduled jobs create notifications automatically:

1. **Fee overdue trigger** — `feeScheduler.js` already runs daily. After marking fees overdue, it calls `notificationService.queueFeeReminders(overdueStudentIds)` which inserts `fee_reminder` notifications for affected students.

2. **Attendance alert trigger** — A new daily cron job in `attendanceScheduler.js` queries students with attendance < 75% and calls `notificationService.createAttendanceAlerts(studentIds)` which inserts `attendance_alert` notifications for the student and their linked parents.

### Notification Delivery for Group Targets

```javascript
async function createNotification({ message, type, target, target_user_id }) {
  let userIds = [];
  if (target === 'specific_user') {
    userIds = [target_user_id];
  } else if (target === 'all_students') {
    const { rows } = await pool.query("SELECT id FROM users WHERE role='student' AND deleted_at IS NULL");
    userIds = rows.map(r => r.id);
  } else if (target === 'all_parents') {
    const { rows } = await pool.query("SELECT id FROM users WHERE role='parent' AND deleted_at IS NULL");
    userIds = rows.map(r => r.id);
  }
  // Bulk INSERT INTO notifications (user_id, message, type) VALUES ...
}
```

### Frontend Polling

```javascript
// NotificationBell component
useEffect(() => {
  const poll = async () => {
    const { count } = await api.get('/notifications/unread-count');
    setUnreadCount(count);
  };
  poll();
  const interval = setInterval(poll, 60_000);
  return () => clearInterval(interval);
}, []);
```

---

## Timetable Conflict Detection

Time-overlap detection uses PostgreSQL's native `OVERLAPS` predicate, which is index-friendly and handles edge cases (adjacent slots do not conflict):

```sql
-- Teacher conflict check
SELECT id FROM timetable_entries
WHERE teacher_id = $1
  AND day_of_week = $2
  AND (start_time, end_time) OVERLAPS ($3::time, $4::time);

-- Room conflict check
SELECT id FROM timetable_entries
WHERE room = $1
  AND day_of_week = $2
  AND (start_time, end_time) OVERLAPS ($3::time, $4::time);
```

If either query returns rows, the service throws a 409 conflict error before inserting.

---

## Reports & Analytics Design

### Report Generation

Reports are generated server-side as JSON (for display) and CSV (for export). No PDF generation is used for reports.

### Attendance Report Query

```sql
SELECT
  u.id AS student_id,
  u.name,
  COUNT(*) AS total,
  COUNT(*) FILTER (WHERE a.status = 'present') AS present,
  COUNT(*) FILTER (WHERE a.status = 'absent')  AS absent,
  COUNT(*) FILTER (WHERE a.status = 'late')    AS late,
  ROUND(
    COUNT(*) FILTER (WHERE a.status = 'present')::numeric
    / NULLIF(COUNT(*), 0) * 100, 2
  ) AS percentage
FROM users u
LEFT JOIN attendance a ON a.student_id = u.id
  AND a.date BETWEEN $1 AND $2
WHERE u.role = 'student' AND u.deleted_at IS NULL
GROUP BY u.id, u.name
ORDER BY u.name ASC;
```

### Fee Report Query

```sql
SELECT
  u.id AS student_id,
  u.name,
  COALESCE(SUM(CASE WHEN f.status = 'paid'    THEN f.amount ELSE 0 END), 0) AS paid,
  COALESCE(SUM(CASE WHEN f.status = 'pending' THEN f.amount ELSE 0 END), 0) AS pending,
  COALESCE(SUM(CASE WHEN f.status = 'overdue' THEN f.amount ELSE 0 END), 0) AS overdue
FROM users u
LEFT JOIN fees f ON f.student_id = u.id
WHERE u.role = 'student' AND u.deleted_at IS NULL
GROUP BY u.id, u.name
ORDER BY u.name ASC;
```

### Beneficiary Report Query

```sql
SELECT
  bp.project_number,
  bp.beneficiary_number,
  bp.name,
  bp.education_level,
  bp.school_name
FROM beneficiary_profiles bp
ORDER BY bp.name ASC;
-- Service validates all required fields are non-null before returning
```

### CSV Export

CSV is built server-side using manual string construction (no extra dependency):

```javascript
function toCSV(headers, rows) {
  const escape = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const header = headers.map(escape).join(',');
  const body = rows.map(r => headers.map(h => escape(r[h])).join(',')).join('\n');
  return `${header}\n${body}`;
}
```

The route sets `Content-Type: text/csv` and `Content-Disposition: attachment; filename="..."` before sending.

---

## Admin Dashboard Metrics Endpoint

`GET /api/admin/dashboard/metrics` returns all five cards in a single query batch:

```javascript
async function getDashboardMetrics() {
  const [students, attendance, fees, beneficiaries, pending] = await Promise.all([
    pool.query("SELECT COUNT(*) FROM users WHERE role='student' AND deleted_at IS NULL"),
    pool.query(`SELECT ROUND(AVG(pct),2) AS avg_pct FROM (
      SELECT student_id,
        ROUND(COUNT(*) FILTER (WHERE status='present')::numeric / NULLIF(COUNT(*),0)*100,2) AS pct
      FROM attendance GROUP BY student_id) sub`),
    pool.query("SELECT COALESCE(SUM(amount),0) AS total FROM fees WHERE status='paid'"),
    pool.query("SELECT COUNT(*) FROM beneficiary_profiles"),
    pool.query(`SELECT
      (SELECT COUNT(*) FROM fee_receipts WHERE status='pending_review') +
      (SELECT COUNT(*) FROM cv_uploads WHERE status='pending_review') +
      (SELECT COUNT(*) FROM semester_results WHERE status='pending_review') +
      (SELECT COUNT(*) FROM student_activity_posts WHERE status='pending_review') +
      (SELECT COUNT(*) FROM student_experience_posts WHERE status='pending_review') +
      (SELECT COUNT(*) FROM fees WHERE status='overdue') AS total`),
  ]);
  return {
    total_students:      Number(students.rows[0].count),
    attendance_pct:      Number(attendance.rows[0].avg_pct ?? 0),
    fees_collected:      Number(fees.rows[0].total),
    active_beneficiaries: Number(beneficiaries.rows[0].count),
    pending_actions:     Number(pending.rows[0].total),
  };
}
```

---

## Frontend Component Architecture

### New Routes in AdminDashboard

The existing `AdminDashboard` page uses nested React Router routes. New sections are added as additional `<Route>` entries:

```jsx
// Inside AdminDashboard.jsx nested routes
<Route path="beneficiary/*" element={<BeneficiarySection />} />
<Route path="timetable/*"   element={<TimetableSection />} />
<Route path="notifications" element={<NotificationsSection />} />
<Route path="activities/*"  element={<ActivitiesSection />} />
<Route path="reports/*"     element={<ReportsSection />} />
```

### New Routes in StudentPortal

```jsx
// Inside StudentPortal.jsx nested routes
<Route path="beneficiary"   element={<BeneficiarySection />} />
<Route path="timetable"     element={<TimetableSection />} />
<Route path="notifications" element={<NotificationsSection />} />
<Route path="activities"    element={<ActivitiesSection />} />
<Route path="uploads/*"     element={<UploadsSection />} />
<Route path="profile"       element={<ExtendedProfileSection />} />
```

### NotificationBell Component

Placed in the shared navigation bar (visible to all authenticated roles):

```jsx
// components/notifications/NotificationBell.jsx
export function NotificationBell() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const poll = () => api.get('/notifications/unread-count').then(r => setCount(r.count));
    poll();
    const id = setInterval(poll, 60_000);
    return () => clearInterval(id);
  }, []);
  return (
    <button className="relative" onClick={openPanel}>
      <BellIcon className="w-6 h-6 text-orange-400" />
      {count > 0 && (
        <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </button>
  );
}
```

### WeeklyGrid Component

Renders timetable entries in a 7-column day grid:

```jsx
// components/timetable/WeeklyGrid.jsx
const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday'];
export function WeeklyGrid({ entries }) {
  const byDay = DAYS.reduce((acc, d) => ({ ...acc, [d]: [] }), {});
  entries.forEach(e => byDay[e.day_of_week]?.push(e));
  return (
    <div className="grid grid-cols-5 gap-2">
      {DAYS.map(day => (
        <div key={day} className="glass-card p-2">
          <h3 className="text-orange-400 font-semibold text-sm mb-2">{day}</h3>
          {byDay[day].sort((a,b) => a.start_time.localeCompare(b.start_time)).map(e => (
            <TimetableSlot key={e.id} entry={e} />
          ))}
        </div>
      ))}
    </div>
  );
}
```

### Dashboard Card Component

Reusable card for both Admin and Student dashboards:

```jsx
// components/common/DashboardCard.jsx
export function DashboardCard({ label, value, icon: Icon, onClick }) {
  return (
    <button
      onClick={onClick}
      className="glass-card p-4 flex items-center gap-4 hover:border-orange-400 transition-colors w-full text-left"
    >
      <div className="bg-orange-500/20 rounded-full p-3">
        <Icon className="w-6 h-6 text-orange-400" />
      </div>
      <div>
        <p className="text-gray-400 text-sm">{label}</p>
        <p className="text-white text-2xl font-bold">{value}</p>
      </div>
    </button>
  );
}
```

---

## Announcement Pinning Design

Pin/unpin operations use an optimistic-lock pattern to prevent race conditions (Req 8.3, 8.6). The service uses a single `UPDATE ... WHERE id = $1 RETURNING *` — PostgreSQL row-level locking ensures sequential resolution. The frontend disables the pin/unpin button while the request is in-flight:

```javascript
// announcementsService.js additions
async function pinAnnouncement(id) {
  const { rows } = await pool.query(
    "UPDATE announcements SET is_pinned = TRUE WHERE id = $1 RETURNING *", [id]
  );
  if (rows.length === 0) { const e = new Error('Not found'); e.status = 404; throw e; }
  return rows[0];
}

async function unpinAnnouncement(id) {
  const { rows } = await pool.query(
    "UPDATE announcements SET is_pinned = FALSE WHERE id = $1 RETURNING *", [id]
  );
  if (rows.length === 0) { const e = new Error('Not found'); e.status = 404; throw e; }
  return rows[0];
}

// Updated getAnnouncementsForUser — pinned-first ordering
async function getAnnouncementsForUser(userId, role) {
  const { rows } = await pool.query(
    `SELECT a.*,
       CASE WHEN ar.user_id IS NOT NULL THEN true ELSE false END AS is_read
     FROM announcements a
     LEFT JOIN announcement_reads ar ON ar.announcement_id = a.id AND ar.user_id = $1
     WHERE a.target_role = 'all' OR a.target_role = $2
        OR (a.target_group IS NOT NULL AND a.target_group = (
              SELECT class_group FROM timetable_entries
              WHERE class_group IN (
                SELECT class_group FROM timetable_entries te2
                JOIN users u ON u.id = $1 LIMIT 1
              ) LIMIT 1
            ))
     ORDER BY a.is_pinned DESC, a.created_at DESC`,
    [userId, role]
  );
  return rows;
}
```

---

## Extended Student Profile Design

The `extended_student_profiles` table stores the mutable personal/education fields. Identity fields (name, family_name, project_number, beneficiary_number) are sourced from `users` and `beneficiary_profiles` respectively and are read-only for students.

`GET /api/profile/extended/:studentId` joins all relevant tables:

```sql
SELECT
  u.id, u.name, u.email,
  esp.family_name, esp.phone, esp.address, esp.guardian_name,
  esp.current_school, esp.education_level, esp.program, esp.current_level, esp.academic_year,
  bp.project_number, bp.beneficiary_number,
  pp.url AS profile_picture_url
FROM users u
LEFT JOIN extended_student_profiles esp ON esp.user_id = u.id
LEFT JOIN beneficiary_profiles bp ON bp.student_id = u.id
LEFT JOIN profile_photos pp ON pp.user_id = u.id AND pp.is_default = TRUE
WHERE u.id = $1 AND u.deleted_at IS NULL;
```

`PATCH /api/profile/extended` (student) only allows updating: `phone`, `email`, `address`, `guardian_name`, and `profile_picture` (via separate photo upload endpoint). All other fields are rejected with 403.

---

## Property-Based Testing Correctness Properties

All PBT tests use `fast-check` (already a dev dependency). Key properties:

### 1. Timetable Conflict Invariant
**Property:** For any two persisted timetable entries with the same teacher and day, their time ranges must not overlap.
```javascript
fc.assert(fc.asyncProperty(
  fc.record({ teacher_id: fc.uuid(), day: fc.constantFrom(...DAYS),
    start: fc.integer({min:8,max:16}), duration: fc.integer({min:1,max:3}) }),
  async ({ teacher_id, day, start, duration }) => {
    const e1 = await createEntry({ teacher_id, day, start_time: `${start}:00`, end_time: `${start+duration}:00`, ... });
    const e2 = createEntry({ teacher_id, day, start_time: `${start}:00`, end_time: `${start+duration}:00`, ... });
    await expect(e2).rejects.toMatchObject({ status: 409 });
  }
));
```

### 2. Notification Delivery Completeness
**Property:** When a notification is sent to `all_students`, every active student receives exactly one notification row.
```javascript
fc.assert(fc.asyncProperty(
  fc.array(fc.record({ id: fc.uuid() }), { minLength: 1, maxLength: 20 }),
  async (students) => {
    // seed students, send notification, verify count matches
    const count = await pool.query("SELECT COUNT(*) FROM notifications WHERE type='announcement'");
    expect(Number(count.rows[0].count)).toBe(students.length);
  }
));
```

### 3. File Upload Atomicity
**Property:** If a file fails MIME validation, no database record is created.
```javascript
fc.assert(fc.asyncProperty(
  fc.record({ mime: fc.constantFrom('text/plain','application/zip','video/avi') }),
  async ({ mime }) => {
    const before = await pool.query("SELECT COUNT(*) FROM fee_receipts");
    await expect(uploadFeeReceipt({ mime })).rejects.toBeDefined();
    const after = await pool.query("SELECT COUNT(*) FROM fee_receipts");
    expect(after.rows[0].count).toBe(before.rows[0].count);
  }
));
```

### 4. CV Version Monotonicity
**Property:** Each new CV upload for a student has a version number strictly greater than all previous versions.
```javascript
fc.assert(fc.asyncProperty(
  fc.integer({ min: 1, max: 10 }),
  async (uploadCount) => {
    for (let i = 0; i < uploadCount; i++) await uploadCV(studentId, validFile);
    const { rows } = await pool.query("SELECT version FROM cv_uploads WHERE student_id=$1 ORDER BY version ASC", [studentId]);
    for (let i = 1; i < rows.length; i++) {
      expect(rows[i].version).toBeGreaterThan(rows[i-1].version);
    }
  }
));
```

### 5. Report Empty-Range Safety
**Property:** Requesting a report for a date range with no data returns an empty array, not an error.
```javascript
fc.assert(fc.asyncProperty(
  fc.record({ from: fc.constant('1900-01-01'), to: fc.constant('1900-01-02') }),
  async ({ from, to }) => {
    const result = await generateAttendanceReport(from, to);
    expect(Array.isArray(result.students)).toBe(true);
    expect(result.students.length).toBe(0);
  }
));
```

### 6. Notification Read Idempotency
**Property:** Marking a notification as read multiple times leaves it in the `is_read = true` state with a single `read_at` timestamp (no duplicate updates).
```javascript
fc.assert(fc.asyncProperty(
  fc.integer({ min: 2, max: 10 }),
  async (markCount) => {
    const notif = await createNotification({ user_id: studentId, ... });
    for (let i = 0; i < markCount; i++) await markNotificationRead(notif.id, studentId);
    const { rows } = await pool.query("SELECT is_read, read_at FROM notifications WHERE id=$1", [notif.id]);
    expect(rows[0].is_read).toBe(true);
    expect(rows[0].read_at).not.toBeNull();
  }
));
```

---

## app.js Additions

The following `mountIfExists` calls are added to `app.js` (no existing lines modified):

```javascript
mountIfExists('./routes/beneficiary',     '/api/beneficiary');
mountIfExists('./routes/timetable',       '/api/timetable');
mountIfExists('./routes/notifications',   '/api/notifications');
mountIfExists('./routes/activities',      '/api/activities');
mountIfExists('./routes/reports',         '/api/reports');
mountIfExists('./routes/student-uploads', '/api/student-uploads');
```

The attendance scheduler is started alongside the existing fee scheduler:

```javascript
try {
  const { startAttendanceScheduler } = require('./jobs/attendanceScheduler');
  startAttendanceScheduler();
} catch (err) {
  console.error('Failed to start attendance scheduler:', err.message);
}
```

---

## Correctness Properties

The following formal correctness properties must hold at all times and are verified by the property-based test suite:

### Property 1: Timetable No-Overlap

**Validates: Requirements 3.3, 3.4**

For any two persisted `timetable_entries` with the same `teacher_id` and `day_of_week`, their `(start_time, end_time)` intervals must not overlap. The same property holds for `room` + `day_of_week`. Attempting to insert a conflicting entry is rejected with HTTP 409.

### Property 2: Upload Atomicity

**Validates: Requirements 1.4, 1.5, 1.6, 13.2, 13.3, 14.2, 14.3, 15.3, 15.4**

For every upload domain (fee receipts, CVs, semester results, beneficiary documents, activity post media, experience post media), if the file fails MIME type or size validation, no database record is created. The row count in the relevant table is identical before and after a rejected upload.

### Property 3: Notification Delivery Completeness

**Validates: Requirements 5.1, 5.3**

When a notification is sent to `all_students` (or `all_parents`), the number of rows inserted into `notifications` equals the number of active users with that role at the time of sending. No recipient is skipped and no recipient receives more than one row per send operation.

### Property 4: Notification Read Idempotency

**Validates: Requirements 6.3**

Marking a notification as read N times (N ≥ 1) produces the same final state as marking it read once: `is_read = true`, `read_at` set to the timestamp of the first mark. Subsequent mark operations do not change `read_at`.

### Property 5: CV Version Monotonicity

**Validates: Requirements 14.5, 14.6**

For a given `student_id`, the `version` column of `cv_uploads` rows is strictly increasing in insertion order. No two rows for the same student share the same version number. The latest upload always has the highest version number.

### Property 6: Semester Result Uniqueness

**Validates: Requirements 15.1, 15.2**

For a given `student_id`, no two rows in `semester_results` share the same `(academic_year, semester)` pair. Attempting to insert a duplicate is rejected with a unique constraint violation (HTTP 409).

### Property 7: Report Empty-Range Safety

**Validates: Requirements 11.6**

Requesting any report type for a date range containing no data returns an empty array with correct column headers, not an error response. The HTTP status is always 200 for valid date range inputs regardless of data availability.

### Property 8: Beneficiary Profile Student Isolation

**Validates: Requirements 2.5**

`GET /api/beneficiary/me` for a student with ID X never returns a profile whose `student_id` differs from X, regardless of query parameters or request body content.

### Property 9: Announcement Feed Order

**Validates: Requirements 8.3, 8.5, 8.6**

The announcement feed always satisfies: all pinned announcements (`is_pinned = true`) appear before all non-pinned announcements; within each group, ordering is strictly reverse chronological by `created_at`. This invariant holds after any pin or unpin operation.

### Property 10: Role Access Enforcement

**Validates: Requirements 12.2, 12.7**

Every admin-only endpoint returns HTTP 403 when called with a valid student JWT. Every student-only endpoint returns HTTP 403 when called with a valid admin JWT. All protected endpoints return HTTP 401 when called without a JWT.

---

## Error Handling

All new route handlers follow the existing pattern: errors are passed to `next(err)` and handled by the global error handler in `app.js`, which returns `{ error: message }` with the appropriate HTTP status code.

| Scenario | HTTP Status | Error Message Pattern |
|----------|-------------|----------------------|
| Missing required field | 400 | `"<field> is required"` |
| Invalid enum value | 422 | `"<field> must be one of: ..."` |
| Unsupported file MIME type | 422 | `"Unsupported file type: <mime>"` |
| File exceeds size limit | 413 | `"File too large"` (multer default) |
| Resource not found | 404 | `"Resource not found"` |
| Timetable time conflict | 409 | `"Timetable conflict: teacher already has a class at this time"` or `"Timetable conflict: room is already booked at this time"` |
| Duplicate semester result | 409 | `"A result for this academic year and semester already exists"` |
| Unauthorized (no token) | 401 | `"Authentication required"` |
| Forbidden (wrong role) | 403 | `"Forbidden"` |
| Internal server error | 500 | `"An unexpected error occurred"` |

Loading and error states in the frontend use the existing `LoadingSpinner` and `ErrorMessage` components. Every data-fetching hook sets `loading = true` before the request and `loading = false` (with optional `error` state) in the finally block.

---

## Testing Strategy

### Unit Tests (Jest)

Each new service file has a corresponding `.test.js` file that mocks `pool.query` and tests:
- Happy-path: correct SQL is called with correct parameters, correct value is returned.
- Validation errors: missing fields, invalid enums, out-of-range values throw errors with the correct `status` code.
- Not-found: queries returning empty rows throw 404 errors.

### Property-Based Tests (fast-check)

Each new service file has a corresponding `.pbt.test.js` file covering the correctness properties listed above. PBT tests use an in-memory or test-database pool to verify invariants across randomly generated inputs.

### Integration Tests

Route-level tests use `supertest` against the Express app with a test database. They verify:
- Auth middleware rejects unauthenticated requests (401).
- Role middleware rejects wrong-role requests (403).
- End-to-end upload → DB record creation → retrieval flow.
- CSV export sets correct headers and produces parseable output.

### Frontend Tests

React component tests use Vitest + React Testing Library:
- `NotificationBell` renders badge count and polls at 60s intervals.
- `WeeklyGrid` renders entries grouped by day in correct time order.
- `DashboardCard` navigates to the correct route on click.
- Upload forms show file preview before submission and display error messages on rejection.
