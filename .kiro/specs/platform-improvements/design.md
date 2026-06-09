# Design Document: Platform Improvements

## Overview

Six targeted improvements to the CompassionEdu platform, all implemented within the existing
Node.js/Express backend and React/Tailwind frontend. Every change follows the established
conventions: services in `backend/src/services/`, routes in `backend/src/routes/`, and React
section components mounted inside the existing `AdminDashboard` and `StaffDashboard` layouts.

---

## Architecture

### Layered Request Flow (unchanged convention)

```
HTTP Request
  → Express Router (routes/)
    → requireAuth + requireRole middleware
      → Service layer (services/)
        → pg pool (PostgreSQL)
```

### New modules introduced

| File | Purpose |
|---|---|
| `backend/src/services/notificationService.js` | Create, fetch, mark-read notifications |
| `backend/src/services/fileService.js` | Ownership lookup and file streaming |
| `backend/src/routes/files.js` | `GET /api/files/:filename` |
| `backend/src/routes/notifications.js` | `GET /api/notifications`, `PATCH /api/notifications/:id/read` |
| `frontend/src/pages/admin/PendingApprovalsSection.jsx` | Admin pending-registrations UI |
| `frontend/src/pages/admin/WorkReportsAdminSection.jsx` | Admin work-reports viewer |
| `frontend/src/pages/staff/WorkReportsSection.jsx` | Staff submit + view own reports |

---

## Database Schema Changes

### 1. `users` table — additive columns

```sql
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'pending'
    CHECK (status IN ('pending','active','rejected')),
  ADD COLUMN IF NOT EXISTS force_password_change BOOLEAN DEFAULT FALSE;
```

Existing `INSERT` statements that supply `account_source = 'admin_added'` must also supply
`status = 'active'`; the self-registration path in `auth.js` will omit `status` so it defaults
to `'pending'`.

### 2. `announcements` table — constraint migration

```sql
ALTER TABLE announcements
  DROP CONSTRAINT IF EXISTS announcements_target_role_check;

ALTER TABLE announcements
  ADD CONSTRAINT announcements_target_role_check
    CHECK (target_role IN ('all','student','teacher','parent','staff'));
```

### 3. New `staff_work_reports` table

```sql
CREATE TABLE IF NOT EXISTS staff_work_reports (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  report_date DATE NOT NULL,
  content     TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_work_reports_staff ON staff_work_reports(staff_id);
CREATE INDEX IF NOT EXISTS idx_work_reports_date  ON staff_work_reports(report_date DESC);
```

### 4. New `file_ownership` table

```sql
CREATE TABLE IF NOT EXISTS file_ownership (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filename    VARCHAR(255) UNIQUE NOT NULL,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  context     VARCHAR(100)
);

CREATE INDEX IF NOT EXISTS idx_file_ownership_user ON file_ownership(user_id);
```

### 5. New `notifications` table

```sql
CREATE TABLE IF NOT EXISTS notifications (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type       VARCHAR(50) NOT NULL,
  message    TEXT NOT NULL,
  is_read    BOOLEAN DEFAULT FALSE,
  entity_id  UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user    ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread  ON notifications(user_id, is_read) WHERE is_read = FALSE;
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);
```

---

## Feature 1: Registration Approval Workflow

### Backend changes

**`backend/src/routes/auth.js` — `POST /api/auth/register`**

```javascript
// After password hash, insert with status defaulting to 'pending'
const { rows } = await pool.query(
  `INSERT INTO users (role, name, email, password_hash, account_source)
   VALUES ($1, $2, $3, $4, 'self_registered')
   RETURNING id, role, name, email, created_at`,
  [userRole, name, email, password_hash]
);
// Fan-out: notify all admins
await notificationService.notifyAdmins('new_registration',
  `New registration: ${name} (${email})`, rows[0].id);
// Return acknowledgement — NO token issued
res.status(201).json({ message: 'Registration received. Awaiting admin approval.' });
```

**`backend/src/services/authService.js` — `login()`**

After the password comparison succeeds, add status checks before issuing tokens:

```javascript
// Fetch status alongside existing fields
// SELECT id, role, name, email, password_hash, is_active, deleted_at, status, force_password_change

if (user.status === 'pending') {
  const err = new Error('Your account is pending admin approval.');
  err.status = 403;
  throw err;
}
if (!user.is_active || user.deleted_at) {
  const err = new Error('Invalid email or password');
  err.status = 401;
  throw err;
}
// Include force_password_change in the returned safe user
```

**`backend/src/routes/auth.js` — `POST /api/auth/login`**

Include `force_password_change` in the response payload:

```javascript
res.json({
  token: accessToken,
  refreshToken,
  user: {
    id: user.id,
    role: user.role,
    name: user.name,
    email: user.email,
    force_password_change: user.force_password_change ?? false,
  },
});
```

**`backend/src/routes/admin.js` — new approval endpoints**

```javascript
// GET /api/admin/pending-registrations
router.get('/pending-registrations', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, name, email, role, created_at
       FROM users WHERE status = 'pending' AND deleted_at IS NULL
       ORDER BY created_at ASC`
    );
    res.json(rows);
  } catch (e) { next(e); }
});

// PATCH /api/admin/users/:id/approve
router.patch('/users/:id/approve', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `UPDATE users SET status = 'active', is_active = TRUE
       WHERE id = $1 AND deleted_at IS NULL RETURNING id`,
      [req.params.id]
    );
    if (!rows.length) { return res.status(404).json({ error: 'User not found' }); }
    res.json({ message: 'User approved' });
  } catch (e) { next(e); }
});

// PATCH /api/admin/users/:id/reject
router.patch('/users/:id/reject', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `UPDATE users SET status = 'rejected', is_active = FALSE
       WHERE id = $1 AND deleted_at IS NULL RETURNING id`,
      [req.params.id]
    );
    if (!rows.length) { return res.status(404).json({ error: 'User not found' }); }
    res.json({ message: 'User rejected' });
  } catch (e) { next(e); }
});
```

### Frontend changes

**`frontend/src/pages/admin/PendingApprovalsSection.jsx`** — new section component displaying a
table of pending accounts with Approve / Reject action buttons. Wired into `AdminDashboard` as
`/admin/pending-approvals` with a new LINKS entry `{ to: '/admin/pending-approvals', label: 'Pending Approvals', icon: '⏳' }`.

---

## Feature 2: Announcements Staff Targeting

### Backend changes

**`backend/src/services/announcementsService.js`**

```javascript
// Update constant
const VALID_ROLES = ['all', 'student', 'teacher', 'parent', 'staff'];
```

No other backend changes are required — the `getAnnouncementsForUser` query already uses a
parameterized `target_role = $2` filter, so staff users will automatically receive `staff`
announcements once the DB constraint is updated and `VALID_ROLES` is expanded.

### Frontend changes

**`frontend/src/pages/admin/AnnouncementsSection.jsx`** — `VALID_ROLES` already includes
`'staff'` in the existing file. No further changes needed beyond ensuring the DB constraint is
updated (Feature 2 is effectively complete on the frontend).

---

## Feature 3: Staff Work Reports

### Backend changes

**`backend/src/services/staffWorkReportService.js`** (new file)

```javascript
'use strict';
const pool = require('../db/pool');

async function createReport(staffId, { content, report_date }) {
  if (!content || !content.trim()) {
    const err = new Error('content is required and cannot be empty'); err.status = 400; throw err;
  }
  const { rows } = await pool.query(
    `INSERT INTO staff_work_reports (staff_id, report_date, content)
     VALUES ($1, $2, $3) RETURNING *`,
    [staffId, report_date, content.trim()]
  );
  return rows[0];
}

async function getMyReports(staffId) {
  const { rows } = await pool.query(
    `SELECT * FROM staff_work_reports
     WHERE staff_id = $1 ORDER BY report_date DESC`,
    [staffId]
  );
  return rows;
}

async function getAllReports(staffId) {
  const { rows } = await pool.query(
    `SELECT r.*, u.name AS staff_name, u.email AS staff_email
     FROM staff_work_reports r
     JOIN users u ON u.id = r.staff_id
     WHERE ($1::uuid IS NULL OR r.staff_id = $1)
     ORDER BY r.report_date DESC`,
    [staffId || null]
  );
  return rows;
}

module.exports = { createReport, getMyReports, getAllReports };
```

**`backend/src/routes/staffPortal.js`** — append work-report routes:

```javascript
const workReportService = require('../services/staffWorkReportService');

// POST /api/staff-portal/work-reports
router.post('/work-reports', async (req, res, next) => {
  try {
    const report = await workReportService.createReport(req.user.sub, req.body);
    res.status(201).json(report);
  } catch (e) { next(e); }
});

// GET /api/staff-portal/work-reports/my
router.get('/work-reports/my', async (req, res, next) => {
  try {
    res.json(await workReportService.getMyReports(req.user.sub));
  } catch (e) { next(e); }
});
```

**`backend/src/routes/admin.js`** — append admin work-reports route:

```javascript
// GET /api/admin/work-reports?staff_id=
router.get('/work-reports', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const workReportService = require('../services/staffWorkReportService');
    res.json(await workReportService.getAllReports(req.query.staff_id || null));
  } catch (e) { next(e); }
});
```

### Frontend changes

- **`frontend/src/pages/staff/WorkReportsSection.jsx`** — textarea form to submit a report with a
  date picker and a list of the staff member's own past reports.
- **`frontend/src/pages/admin/WorkReportsAdminSection.jsx`** — paginated table of all reports with
  optional staff_id filter, showing staff name, email, date, and content preview.
- Both pages wired into their respective dashboard LINKS arrays.

---

## Feature 4: File Protection

### Backend changes

**`backend/src/app.js`** — remove the static upload line and add the files route:

```javascript
// REMOVE this line:
// app.use('/uploads', express.static(path.join(__dirname, '..', UPLOAD_DIR)));

// ADD after other route mounts:
app.use('/api/files', require('./routes/files'));
```

**`backend/src/services/fileService.js`** (new file)

```javascript
'use strict';
const path = require('path');
const fs   = require('fs');
const pool = require('../db/pool');

const UPLOAD_DIR = process.env.UPLOAD_DIR || 'uploads';
const BASE_DIR   = path.join(__dirname, '..', '..', UPLOAD_DIR);

async function recordOwnership(filename, userId, context) {
  await pool.query(
    `INSERT INTO file_ownership (filename, user_id, context)
     VALUES ($1, $2, $3) ON CONFLICT (filename) DO NOTHING`,
    [filename, userId, context || null]
  );
}

async function serveFile(filename, requestingUserId, requestingUserRole) {
  const { rows } = await pool.query(
    'SELECT user_id FROM file_ownership WHERE filename = $1',
    [filename]
  );
  if (!rows.length) {
    const err = new Error('Not found'); err.status = 404; throw err;
  }
  if (requestingUserRole !== 'admin' && rows[0].user_id !== requestingUserId) {
    const err = new Error('Forbidden'); err.status = 403; throw err;
  }
  // Resolve the sub-directory from the filename prefix convention
  const filePath = findFilePath(filename);
  if (!filePath) {
    const err = new Error('Not found'); err.status = 404; throw err;
  }
  return filePath;
}

function findFilePath(filename) {
  // Search all subdirectories under uploads/
  const subdirs = ['fee-receipts', 'result-uploads', 'portfolio', 'profiles', ''];
  for (const sub of subdirs) {
    const candidate = path.join(BASE_DIR, sub, filename);
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

module.exports = { recordOwnership, serveFile };
```

**`backend/src/routes/files.js`** (new file)

```javascript
'use strict';
const express  = require('express');
const requireAuth = require('../middleware/requireAuth');
const fileService = require('../services/fileService');
const router   = express.Router();

router.get('/:filename', requireAuth, async (req, res, next) => {
  try {
    const filePath = await fileService.serveFile(
      req.params.filename,
      req.user.sub,
      req.user.role
    );
    res.sendFile(filePath);
  } catch (e) { next(e); }
});

module.exports = router;
```

**All existing multer upload handlers** — after a successful upload, call `recordOwnership`:

```javascript
// Example in feeUploads.js, after svc.uploadPayment():
const fileService = require('../services/fileService');
await fileService.recordOwnership(req.file.filename, req.user.sub, 'fee-receipt');
```

The same pattern applies to `resultUploads.js`, `portfolioLevel.js`, and any other route that
calls `multer` and stores a file.

### Frontend changes

All places in the frontend that construct a URL from a `photo_url`, `cv_url`, `document_url`, or
similar field must prefix the filename with `/api/files/` when the value is a relative path (i.e.,
does not start with `http`). A utility function handles this:

```javascript
// frontend/src/utils/fileUrl.js
export function fileUrl(path) {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  // Strip any legacy /uploads/ prefix, keep just the filename
  const filename = path.replace(/^\/?(uploads\/[^/]+\/)?/, '');
  return `/api/files/${filename}`;
}
```

---

## Feature 5: Admin Password Reset

### Backend changes

**`backend/src/routes/admin.js`** — new endpoint:

```javascript
const bcrypt = require('bcryptjs');

// POST /api/admin/users/:id/reset-password
router.post('/users/:id/reset-password', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const { temporaryPassword } = req.body;
    if (!temporaryPassword || temporaryPassword.length < 8) {
      return res.status(400).json({ error: 'Temporary password must be at least 8 characters.' });
    }
    const hash = await bcrypt.hash(temporaryPassword, 10);
    const { rows } = await pool.query(
      `UPDATE users SET password_hash = $1, force_password_change = TRUE
       WHERE id = $2 AND deleted_at IS NULL RETURNING id`,
      [hash, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'User not found' });
    res.json({ message: 'Password reset. User must change password on next login.' });
  } catch (e) { next(e); }
});
```

**`backend/src/services/authService.js` — `changePassword()`** — clear the flag after success:

```javascript
await pool.query(
  'UPDATE users SET password_hash = $1, force_password_change = FALSE WHERE id = $2',
  [newHash, userId]
);
```

### Frontend changes

- Add a "Reset Password" button to the actions column in `UsersSection.jsx` and `StaffSection.jsx`.
- The button opens a small modal with a single `temporaryPassword` input (min 8 chars) and calls
  `PATCH /api/admin/users/:id/reset-password`.
- On successful login, if `force_password_change: true` is present in the response, the app
  redirects to `/settings` (change-password view) before showing the normal dashboard.

---

## Feature 6: In-App Notifications

### Backend changes

**`backend/src/services/notificationService.js`** (new file)

```javascript
'use strict';
const pool = require('../db/pool');

async function notifyAdmins(type, message, entityId) {
  const { rows: admins } = await pool.query(
    "SELECT id FROM users WHERE role = 'admin' AND is_active = TRUE AND deleted_at IS NULL"
  );
  if (!admins.length) return;
  const values = admins.map((_, i) =>
    `($${i * 4 + 1}, $${i * 4 + 2}, $${i * 4 + 3}, $${i * 4 + 4})`
  ).join(',');
  const params = admins.flatMap(a => [a.id, type, message, entityId || null]);
  await pool.query(
    `INSERT INTO notifications (user_id, type, message, entity_id) VALUES ${values}`,
    params
  );
}

async function getNotifications(userId) {
  const { rows } = await pool.query(
    `SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC`,
    [userId]
  );
  return rows;
}

async function markAsRead(notifId, userId) {
  const { rows } = await pool.query(
    'SELECT id FROM notifications WHERE id = $1',
    [notifId]
  );
  if (!rows.length) {
    const err = new Error('Not found'); err.status = 404; throw err;
  }
  const { rows: owned } = await pool.query(
    'SELECT id FROM notifications WHERE id = $1 AND user_id = $2',
    [notifId, userId]
  );
  if (!owned.length) {
    const err = new Error('Forbidden'); err.status = 403; throw err;
  }
  await pool.query(
    'UPDATE notifications SET is_read = TRUE WHERE id = $1',
    [notifId]
  );
}

module.exports = { notifyAdmins, getNotifications, markAsRead };
```

**`backend/src/routes/notifications.js`** (new file)

```javascript
'use strict';
const express = require('express');
const requireAuth = require('../middleware/requireAuth');
const notifService = require('../services/notificationService');
const router = express.Router();

router.get('/', requireAuth, async (req, res, next) => {
  try {
    res.json(await notifService.getNotifications(req.user.sub));
  } catch (e) { next(e); }
});

router.patch('/:id/read', requireAuth, async (req, res, next) => {
  try {
    await notifService.markAsRead(req.params.id, req.user.sub);
    res.status(204).send();
  } catch (e) { next(e); }
});

module.exports = router;
```

**`backend/src/app.js`** — mount the route:

```javascript
app.use('/api/notifications', require('./routes/notifications'));
```

**Fan-out hooks** — call `notifyAdmins` at two points:

1. `auth.js` register route — after inserting the user (shown in Feature 1 above).
2. Every multer upload handler — after recording file ownership:

```javascript
await notificationService.notifyAdmins(
  'file_upload',
  `${req.user.name} uploaded a file (${context})`,
  null
);
```

### Frontend changes

**`frontend/src/components/common/NotificationBell.jsx`** — the component already polls
`/api/notifications` and falls back to announcements. The only change needed is to remove the
fallback path once the real endpoint exists — or simply leave it as-is since it already works
correctly when the endpoint is present.

---

## Error Handling Strategy

All service-layer errors follow the existing convention: attach a `.status` property and `throw`;
the global error handler in `app.js` picks up the status code automatically.

| Scenario | Status | Message |
|---|---|---|
| Pending account login | 403 | `"Your account is pending admin approval."` |
| Inactive / deleted login | 401 | `"Invalid email or password"` |
| File access by non-owner non-admin | 403 | `"Forbidden"` |
| File or ownership record not found | 404 | `"Not found"` |
| Short temporary password | 400 | `"Temporary password must be at least 8 characters."` |
| Empty work report content | 400 | `"content is required and cannot be empty"` |
| Invalid announcement target_role | 422 | `"target_role must be one of: ..."` |
| Notification mark-read by wrong user | 403 | `"Forbidden"` |

---

## Component Interfaces

### `PendingApprovalsSection` props
None — fetches `GET /api/admin/pending-registrations` on mount and on approve/reject.

### `WorkReportsSection` (staff) props
None — fetches `GET /api/staff-portal/work-reports/my` on mount; posts to
`POST /api/staff-portal/work-reports`.

### `WorkReportsAdminSection` props
None — fetches `GET /api/admin/work-reports` with optional `staff_id` filter.

### `notificationService` API
```javascript
notifyAdmins(type: string, message: string, entityId: string|null): Promise<void>
getNotifications(userId: string): Promise<Notification[]>
markAsRead(notifId: string, userId: string): Promise<void>
```

### `fileService` API
```javascript
recordOwnership(filename: string, userId: string, context: string|null): Promise<void>
serveFile(filename: string, requestingUserId: string, requestingUserRole: string): Promise<string>
```

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a
system — essentially, a formal statement about what the system should do. Properties serve as the
bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Self-registration never issues tokens

*For any* valid registration payload (name, email, password, allowed role), calling the register
endpoint should return an acknowledgement message and no `token` or `refreshToken` fields, and the
created user record in the database should have `status = 'pending'`.

**Validates: Requirements 1.1**

### Property 2: Pending accounts are blocked at login

*For any* user account with `status = 'pending'`, calling `authService.login` with the correct
password should throw an error with HTTP status 403 and a message containing `"pending admin
approval"`.

**Validates: Requirements 1.2**

### Property 3: Approval and rejection are correct state transitions

*For any* pending user ID, after calling the approve endpoint the user's `status` should be
`'active'`; after calling the reject endpoint the user's `status` should be `'rejected'` and
`is_active` should be `FALSE`.

**Validates: Requirements 1.5, 1.6**

### Property 4: Staff users only receive eligible announcements

*For any* staff user and any set of announcement records with varying `target_role` values,
`getAnnouncementsForUser` should return only announcements where `target_role` is `'all'` or
`'staff'`, and never announcements targeting other roles exclusively.

**Validates: Requirements 2.2**

### Property 5: Invalid target_role is always rejected

*For any* string that is not in `['all', 'student', 'teacher', 'parent', 'staff']`,
`createAnnouncement` should throw an error with HTTP status 422.

**Validates: Requirements 2.4**

### Property 6: Work report creation rejects blank content

*For any* string composed entirely of whitespace characters (including the empty string),
`createReport` should throw an error with HTTP status 400 and not insert any row.

**Validates: Requirements 3.3**

### Property 7: Staff see only their own reports in correct order

*For any* staff member's ID and any set of reports in the database, `getMyReports` should return
only records where `staff_id` matches the requesting user's ID, sorted by `report_date` descending.

**Validates: Requirements 3.4**

### Property 8: Admin work-report filter is respected

*For any* `staff_id` query parameter passed to `getAllReports`, every record in the returned list
should have a `staff_id` equal to the supplied filter value.

**Validates: Requirements 3.6**

### Property 9: File upload always creates an ownership record

*For any* upload by any authenticated user, after `recordOwnership` completes, querying
`file_ownership` for that filename should return exactly one record with the correct `user_id`.

**Validates: Requirements 4.4**

### Property 10: Non-owners and non-admins cannot access files

*For any* file owned by user A, when user B (role ≠ `'admin'`, id ≠ A) calls `serveFile`, the
function should throw a 403 error. When an admin (role = `'admin'`) calls `serveFile` for the same
file, it should succeed.

**Validates: Requirements 4.5, 4.6**

### Property 11: Short temporary passwords are always rejected

*For any* string of length 0 through 7, the reset-password endpoint should respond with HTTP 400
and the message `"Temporary password must be at least 8 characters."`.

**Validates: Requirements 5.3**

### Property 12: Password reset round-trip clears the force-change flag

*For any* user account, setting `force_password_change = TRUE` and then successfully calling
`changePassword` should result in `force_password_change = FALSE` in the database.

**Validates: Requirements 5.5**

### Property 13: Login response includes force_password_change flag

*For any* user with `force_password_change = TRUE`, the login response payload should contain the
field `force_password_change: true`. For any user with the flag `FALSE`, the field should be
`false`.

**Validates: Requirements 5.4**

### Property 14: New registration fan-out covers all admins

*For any* set of admin users in the database, after a self-registration event,
`notifyAdmins('new_registration', ...)` should insert exactly one `notifications` row per admin,
each with the correct `type` and a non-empty `message`.

**Validates: Requirements 6.5**

### Property 15: File upload fan-out covers all admins

*For any* set of admin users in the database, after a file upload event,
`notifyAdmins('file_upload', ...)` should insert exactly one `notifications` row per admin.

**Validates: Requirements 6.6**

### Property 16: Notification ownership is enforced on mark-read

*For any* notification record owned by user A, when user B (id ≠ A) calls `markAsRead`, the
function should throw a 403 error and the `is_read` field should remain unchanged.

**Validates: Requirements 6.4**

### Property 17: Notification badge displays correct count and caps at 99+

*For any* integer `n` where 0 ≤ n ≤ 99, the `NotificationBell` badge should display the exact
value `n`. *For any* integer `n > 99`, the badge should display the string `"99+"`.

**Validates: Requirements 6.8**
