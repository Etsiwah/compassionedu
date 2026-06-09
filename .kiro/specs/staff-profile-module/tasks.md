# Implementation Plan: Staff Profile Module

## Overview

Implement a secure, read-only staff profile page for the CompassionEdu Staff Dashboard. The work is split into four layers delivered incrementally: database schema, backend service + route, frontend page component, and wiring into the existing dashboard shell. Property-based tests (fast-check) cover the seven correctness properties defined in the design; React Testing Library unit tests cover the frontend rendering contract.

---

## Tasks

- [x] 1. Extend the database schema with the `staff_profiles` table
  - Append the `CREATE TABLE IF NOT EXISTS staff_profiles` DDL to `backend/src/db/schema.sql`, matching the column definitions in the design (user_id UUID PK, bio TEXT, portfolio_url TEXT, cv_url TEXT, age INT, gender VARCHAR(20), phone VARCHAR(50), department VARCHAR(255), created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ)
  - Ensure the foreign key `REFERENCES users(id) ON DELETE CASCADE` is present
  - Use `CREATE TABLE IF NOT EXISTS` so repeated migrations are idempotent
  - _Requirements: 10.1, 10.2, 10.3, 10.4_

- [x] 2. Implement `staffProfileService.js`
  - [x] 2.1 Create `backend/src/services/staffProfileService.js` with the `getStaffProfile(userId)` function
    - Execute the single parameterised SQL query joining `users`, `profile_photos` (LEFT JOIN on `pp.is_default = TRUE`), and `staff_profiles` as defined in the design
    - Bind `userId` exclusively to `WHERE u.id = $1 AND u.deleted_at IS NULL`
    - Throw `{ message: 'Resource not found', status: 404 }` when `rows.length === 0`
    - Wrap the query in a try/catch; if the error message contains `"staff_profiles"` (table not found), fall back to the two-table query (`users + profile_photos`) and return `null` for all `sp.*` fields
    - Export only `getStaffProfile` — no write, update, or delete functions
    - _Requirements: 1.1, 1.2, 1.5, 1.6, 3.1, 3.2, 3.3, 10.1, 10.2, 10.3, 10.4_

  - [ ]* 2.2 Write property test for Ownership Invariant (Property 1)
    - **Property 1: Ownership Invariant** — `getStaffProfile(userId)` always returns an object whose `id` field equals `userId`
    - Mock `pool.query` to return a row with `id` equal to the generated UUID
    - Use `fc.uuid()` to generate arbitrary user IDs; run 100 iterations
    - File: `backend/src/services/staffProfileService.pbt.test.js`
    - **Validates: Requirements 1.1, 1.6, 3.1, 3.2, 3.3**

  - [ ]* 2.3 Write property test for Field Completeness (Property 2)
    - **Property 2: Field Completeness** — the returned object always contains all 13 required keys (`id`, `name`, `email`, `phone`, `age`, `gender`, `staff_role`, `department`, `created_at`, `photo_url`, `cv_url`, `portfolio_url`, `bio`)
    - Mock `pool.query` to return rows with all 13 keys; `null` is a valid value for optional fields
    - Use `fc.uuid()` as input; run 100 iterations
    - File: `backend/src/services/staffProfileService.pbt.test.js`
    - **Validates: Requirements 1.2, 10.1, 10.4**

  - [ ]* 2.4 Write property test for 404 on Missing User (Property 3)
    - **Property 3: 404 for Missing User** — `getStaffProfile(userId)` throws an error with `status === 404` for any UUID where the query returns zero rows
    - Mock `pool.query` to return `{ rows: [] }`; assert the thrown error has `status === 404`
    - Use `fc.uuid()` as input; run 100 iterations
    - File: `backend/src/services/staffProfileService.pbt.test.js`
    - **Validates: Requirements 1.5**

  - [ ]* 2.5 Write property test for Graceful Degradation (Property 5)
    - **Property 5: Graceful Degradation Without `staff_profiles` Row** — when the query succeeds but returns `null` for all `sp.*` columns, the function returns a valid profile with correct `id`, `name`, `email`, `staff_role` and `null` for `phone`, `age`, `gender`, `department`, `bio`, `portfolio_url`, `cv_url`
    - Mock `pool.query` to return a row with only `users` columns populated and `sp.*` as `null`
    - Use `fc.uuid()` as input; run 100 iterations
    - File: `backend/src/services/staffProfileService.pbt.test.js`
    - **Validates: Requirements 10.2, 10.3**

  - [ ]* 2.6 Write unit tests for `staffProfileService.js`
    - Successful fetch returns correct `ProfileData` shape
    - 404 is thrown when `pool.query` returns no rows
    - `photo_url` is `null` when no default photo exists
    - `staff_profiles` table absence degrades gracefully (null extended fields, no thrown error)
    - File: `backend/src/services/staffProfileService.test.js`
    - _Requirements: 1.1, 1.2, 1.5, 10.2, 10.3_

- [x] 3. Add the profile route and mutation guard to `staffPortal.js`
  - [x] 3.1 Register `GET /api/staff-portal/me/profile` in `backend/src/routes/staffPortal.js`
    - Import `staffProfileService` at the top of `staffPortal.js`
    - Add `router.get('/me/profile', async (req, res, next) => { ... })` handler that calls `staffProfileService.getStaffProfile(req.user.sub)` and responds with `res.json(profile)`
    - Use only `req.user.sub` as the user ID; ignore any URL params, query string, or body fields
    - _Requirements: 1.1, 1.4, 1.6, 3.1_

  - [x] 3.2 Register the HTTP 405 catch-all for mutation methods on the profile route
    - Add `router.all('/me/profile', (req, res) => res.status(405).json({ error: 'Method not allowed' }))` immediately **after** the `router.get` handler
    - _Requirements: 2.2_

  - [ ]* 3.3 Write property test for HTTP 405 on Mutation Methods (Property 4)
    - **Property 4: HTTP 405 for Mutation Methods** — for any method in `{ POST, PUT, PATCH, DELETE }` sent by an authenticated staff member, the route responds with HTTP 405
    - Use supertest to fire each method against `/api/staff-portal/me/profile` with a mocked auth middleware
    - Use `fc.constantFrom('POST', 'PUT', 'PATCH', 'DELETE')` as input; run 100 iterations
    - File: `backend/src/services/staffProfileService.pbt.test.js`
    - **Validates: Requirements 2.2**

  - [ ]* 3.4 Write unit tests for the route handler
    - `GET` with valid staff JWT returns HTTP 200 and correct profile shape
    - `GET` without a valid JWT returns HTTP 401 (via `requireAuth`)
    - `GET` with admin JWT returns HTTP 200
    - `POST`/`PUT`/`PATCH`/`DELETE` returns HTTP 405 (four example cases)
    - Student JWT returns HTTP 403 (via `requireRole`)
    - File: `backend/src/routes/staffPortal.test.js`
    - _Requirements: 1.1, 1.3, 1.4, 2.2, 2.3_

- [x] 4. Checkpoint — backend complete
  - Ensure all backend tests pass, ask the user if any questions arise.

- [x] 5. Implement `StaffProfile.jsx`
  - [x] 5.1 Create `frontend/src/pages/StaffProfile.jsx` with state management and API call
    - On mount, call `api.get('/staff-portal/me/profile')` and store result in local state (`profile`, `loading`, `error`)
    - While loading, render a visible spinner element
    - On error, render a user-readable error message (no blank screen, no uncaught exception)
    - Apply `background: linear-gradient(135deg, #0a0f23 0%, #0f1a35 50%, #0a0f23 100%)` outer container matching the existing dashboard shell
    - _Requirements: 1.1, 9.4, 9.5_

  - [x] 5.2 Render the Personal Information glass-card section
    - Display Avatar: if `photo_url` is non-null and non-empty use it as `<img src>`, otherwise construct the ui-avatars fallback URL `https://ui-avatars.com/api/?name={encodeURIComponent(name)}&background=f97316&color=fff`
    - Display Full Name (`name`), Email (`email`), Phone (`phone`), Age (`age`), Gender (`gender`); fall back to `"—"` for any null/empty optional field; fall back to `"Unknown Staff"` if `name` is missing
    - Apply glass-card style: `background: rgba(255,255,255,0.06)`, `border: 1px solid rgba(255,255,255,0.09)`, `backdropFilter: blur(16px)`, `borderRadius` consistent with existing cards
    - Include a visible section heading and an icon
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 9.1_

  - [x] 5.3 Render the Employment Information glass-card section
    - Display Staff ID (`id`), Role (`staff_role`), Department (`department`); fall back to `"—"` for null/empty values
    - Format `created_at` as `new Date(created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })`
    - Include a visible section heading and an icon
    - _Requirements: 5.1, 5.2, 5.3_

  - [x] 5.4 Render the Documents (CV) glass-card section
    - When `cv_url` is non-null and non-empty: render a "View CV" anchor (`target="_blank"`) and a "Download CV" anchor (with `download` attribute); hide the "No CV on file" text
    - When `cv_url` is null or empty: render "No CV on file" text; hide the CV buttons
    - Do NOT render any upload, replace, or remove CV control
    - Include a visible section heading and an icon
    - Apply `hover:scale-[1.02]` on the button/anchor elements
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 9.6_

  - [x] 5.5 Render the Portfolio glass-card section
    - When `portfolio_url` is non-null and non-empty: render an "Open Portfolio" anchor with `target="_blank" rel="noopener noreferrer"`; as fallback if the button fails, also render the URL as a `<a href>` hyperlink; hide the "No portfolio link on file" text
    - When `portfolio_url` is null or empty: render "No portfolio link on file" text; hide the portfolio button
    - Do NOT render any edit or remove portfolio control
    - Include a visible section heading and an icon
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

  - [x] 5.6 Render the Bio / About Me glass-card section
    - When `bio` is non-null and non-empty: render the bio text
    - When `bio` is null or empty: render "No bio provided."
    - Do NOT render any edit control for the bio field
    - Include a visible section heading and an icon
    - _Requirements: 8.1, 8.2, 8.3, 8.4_

  - [x] 5.7 Apply responsive grid layout
    - Use a CSS grid / flexbox layout that is multi-column on desktop (≥ 1024 px) and single-column on tablet/mobile
    - Apply `hover:scale-[1.02]` transition on interactive cards and buttons, consistent with `StaffDashboard.jsx`
    - _Requirements: 9.2, 9.6_

  - [ ]* 5.8 Write property test for Nullable Field Display (Property 6)
    - **Property 6: Nullable Field Display** — for any profile response object, null/empty optional fields render the correct placeholder; non-null fields render the actual value
    - Use React Testing Library; generate profile objects with `fc.record({ phone: fc.option(fc.string()), age: fc.option(fc.integer()), ... })` to cover all optional fields
    - Assert: null `phone`/`age`/`gender`/`staff_role`/`department` → `"—"` is in the document; non-null → value is in the document
    - Assert: null `cv_url` → "No CV on file"; non-null → "View CV" button exists
    - Assert: null `portfolio_url` → "No portfolio link on file"; non-null → "Open Portfolio" exists
    - Assert: null `bio` → "No bio provided."; non-null → bio text exists
    - File: `frontend/src/pages/StaffProfile.test.jsx`
    - **Validates: Requirements 4.3, 6.4, 7.2, 8.1, 8.2**

  - [ ]* 5.9 Write property test for Date Formatting (Property 7)
    - **Property 7: Date Formatting** — for any valid ISO 8601 timestamp in `created_at`, the rendered date string matches the pattern `"D Month YYYY"` (e.g. `"15 January 2023"`)
    - Generate timestamps with `fc.date()` and verify rendered text against `/^\d{1,2} \w+ \d{4}$/`
    - File: `frontend/src/pages/StaffProfile.test.jsx`
    - **Validates: Requirements 5.2**

  - [ ]* 5.10 Write unit tests for `StaffProfile.jsx`
    - Personal info section renders all fields; null `photo_url` renders ui-avatars fallback URL containing `f97316`
    - Null optional fields render `"—"` placeholder
    - Non-null `cv_url` renders View CV and Download CV; null renders "No CV on file"
    - Non-null `portfolio_url` renders Open Portfolio button; null renders "No portfolio link on file"
    - Non-null `bio` renders bio text; null renders "No bio provided."
    - Loading state renders a spinner element
    - API error renders an error message — no blank screen
    - No edit, delete, upload, or mutation controls present in rendered output
    - File: `frontend/src/pages/StaffProfile.test.jsx`
    - _Requirements: 4.1, 4.2, 4.3, 6.1, 6.4, 7.1, 7.2, 8.1, 8.2, 2.1, 9.4, 9.5_

- [x] 6. Wire `StaffProfile` into `StaffDashboard.jsx`
  - [x] 6.1 Add the "My Profile" sidebar link and route to `StaffDashboard.jsx`
    - Add `import StaffProfile from './StaffProfile'` at the top of `frontend/src/pages/StaffDashboard.jsx`
    - Append `{ to: '/staff/profile', label: 'My Profile', icon: '👤' }` to the `LINKS` array
    - Add `<Route path="profile" element={<StaffProfile />} />` inside the `<Routes>` block
    - _Requirements: 9.3_

- [x] 7. Final checkpoint — full stack integration verified
  - Ensure all backend and frontend tests pass, ask the user if any questions arise.

---

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for traceability
- PBT files use the naming convention `*.pbt.test.js` (backend) and reside alongside the service under test; frontend PBTs live in `*.test.jsx` alongside the component
- All `fc.assert` calls use `numRuns: 100` minimum, consistent with existing PBT files in the project
- The `router.all` catch-all in task 3.2 **must** be registered after `router.get` to avoid Express swallowing GET requests
- The `staff_profiles` table uses `CREATE TABLE IF NOT EXISTS` so the migration is safe to run multiple times
- No existing routes, services, or tables are modified except `staffPortal.js` (tasks 3.1–3.2) and `StaffDashboard.jsx` (task 6.1)

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1"] },
    { "id": 1, "tasks": ["2.1"] },
    { "id": 2, "tasks": ["2.2", "2.3", "2.4", "2.5", "2.6", "3.1"] },
    { "id": 3, "tasks": ["3.2", "5.1"] },
    { "id": 4, "tasks": ["3.3", "3.4", "5.2", "5.3", "5.4", "5.5", "5.6"] },
    { "id": 5, "tasks": ["5.7"] },
    { "id": 6, "tasks": ["5.8", "5.9", "5.10", "6.1"] }
  ]
}
```
