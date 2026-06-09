# Requirements Document

## Introduction

The Staff Profile Module adds a secure, read-only profile page to the CompassionEdu Staff Dashboard. Authenticated staff members can view their own personal information, employment details, documents (CV), and portfolio link. The module enforces strict read-only access — staff may not edit any data, and may not access any other staff member's profile. All administrative operations (user management, role changes, account creation, approvals, suspensions) remain inaccessible to the staff role.

The feature touches the Node.js/Express backend (`backend/src/`) for a dedicated staff-profile API endpoint, and the React frontend (`frontend/src/`) for a new profile page inside the existing dark-theme Staff Dashboard.

---

## Glossary

- **Staff_Profile_Page**: The React page component that renders a staff member's profile within the Staff Dashboard.
- **Staff_Profile_API**: The Express route `GET /api/staff-portal/me/profile` that returns profile data for the authenticated staff member.
- **Staff_Profile_Service**: The backend service function that queries the database and assembles the staff profile data object.
- **Profile_Data**: The combined set of fields returned by the Staff_Profile_API, including personal information, employment information, documents, and portfolio details.
- **Staff_Member**: A user whose `role` field in the `users` table is `'staff'`.
- **Avatar**: The default profile photo associated with a staff member's account, sourced from the `profile_photos` table; falls back to a generated initials image when no photo exists.
- **CV**: A curriculum vitae file stored as a URL (`cv_url`) on the staff member's profile, available for viewing or downloading.
- **Portfolio_Link**: A URL (`portfolio_url`) representing the staff member's external portfolio, available for viewing in a new browser tab.
- **RBAC**: Role-Based Access Control — the mechanism enforced by `requireAuth` and `requireRole` middleware to restrict route access by user role.
- **JWT**: JSON Web Token — the bearer token stored in `localStorage` under `ce_token`, decoded on the backend by `requireAuth` to identify `req.user.sub` (user ID) and `req.user.role`.
- **Admin**: A user whose `role` is `'admin'`; retains all existing administrative permissions unchanged.

---

## Requirements

### Requirement 1: Fetch Own Staff Profile Data

**User Story:** As a staff member, I want to view my own profile information, so that I can confirm my personal and employment details recorded in the system.

#### Acceptance Criteria

1. WHEN a Staff_Member sends a request to `GET /api/staff-portal/me/profile` with a valid JWT, THE Staff_Profile_API SHALL return the Profile_Data for the user identified by `req.user.sub`.
2. THE Staff_Profile_API SHALL return the following fields in Profile_Data: `id`, `name`, `email`, `phone`, `age`, `gender`, `staff_role`, `department`, `created_at` (date joined), `photo_url`, `cv_url`, `portfolio_url`, and `bio`.
3. WHEN the authenticated user's role is not `'staff'` or `'admin'`, THE Staff_Profile_API SHALL respond with HTTP 403 and an `{ "error": "Access denied" }` body.
4. WHEN no valid JWT is present in the `Authorization` header, THE Staff_Profile_API SHALL respond with HTTP 401 and an `{ "error": "Authentication required" }` body.
5. IF the user record identified by `req.user.sub` does not exist or has a non-null `deleted_at`, THEN THE Staff_Profile_API SHALL respond with HTTP 404 and an `{ "error": "Resource not found" }` body; IF the user record exists but profile data retrieval fails due to a data integrity or unexpected error, THEN THE Staff_Profile_API SHALL respond with HTTP 500.
6. THE Staff_Profile_API SHALL never return profile data belonging to a user other than `req.user.sub`, regardless of any query parameters or request body values supplied.

---

### Requirement 2: Read-Only Access Enforcement — No Mutation Routes for Staff

**User Story:** As a system administrator, I want staff members to be unable to edit, delete, or modify any profile or system data through the Staff Profile Module, so that data integrity and administrative control are preserved.

#### Acceptance Criteria

1. THE Staff_Profile_Page SHALL NOT render any button, form, or control labelled or functioning as "Edit Profile", "Delete Profile", "Change Role", "Manage Users", "Admin Settings", "Upload CV", "Replace CV", "Modify Portfolio", or equivalent mutation operations.
2. WHEN a Staff_Member makes an HTTP request using a mutating method (`POST`, `PUT`, `PATCH`, `DELETE`) to any route under `/api/staff-portal/me/profile`, THE Staff_Profile_API SHALL respond with HTTP 405 Method Not Allowed.
3. WHILE a Staff_Member is authenticated, THE Staff_Profile_API SHALL deny all requests to admin-only routes (`/api/admin/*`, `/api/users/*`, `/api/staff/*`) with HTTP 403.
4. THE Staff_Profile_Service SHALL NOT expose any function that writes, updates, or deletes profile data via the staff-profile code path.

---

### Requirement 3: Cross-Profile Access Prevention

**User Story:** As a system administrator, I want each staff member to only be able to view their own profile, so that staff cannot access the personal information of colleagues.

#### Acceptance Criteria

1. WHEN a Staff_Member makes a request to any profile endpoint, THE Staff_Profile_API SHALL resolve the target user ID exclusively from `req.user.sub` (the JWT subject claim) and SHALL NOT accept a user ID from the request URL parameters, query string, or body.
2. IF a Staff_Member sends a request that includes a `userId` path parameter, query parameter, or body field that differs from `req.user.sub`, THEN THE Staff_Profile_API SHALL ignore the supplied value and return only the profile of `req.user.sub`.
3. THE Staff_Profile_Service SHALL accept only `userId` as an argument and SHALL query `WHERE u.id = $1` with that value bound, ensuring the database layer cannot be bypassed to return a different user's data.

---

### Requirement 4: Staff Profile Page — Personal Information Display

**User Story:** As a staff member, I want to see my personal information clearly presented on my profile page, so that I can review my name, contact details, and demographic data.

#### Acceptance Criteria

1. WHEN the Staff_Profile_Page loads successfully, THE Staff_Profile_Page SHALL display the staff member's Avatar, Full Name, Email Address, Phone Number, Age, and Gender in the Personal Information section; THE Staff_Profile_Page SHALL require a non-empty Full Name value from the API response.
2. WHEN `photo_url` is null or empty, THE Staff_Profile_Page SHALL display a generated initials Avatar using the staff member's name with an orange background, consistent with the `ui-avatars.com` pattern used elsewhere in the project.
3. WHEN a profile field value (other than Full Name) is null or empty, THE Staff_Profile_Page SHALL display a placeholder text of `"—"` for that field rather than leaving a blank space; WHEN the Full Name field is missing from the API response, THE Staff_Profile_Page SHALL display `"Unknown Staff"` as a fallback.
4. THE Staff_Profile_Page SHALL label the Personal Information section with a visible section heading and an appropriate icon; THE Staff_Profile_Page SHALL render the section even if the heading or icon component fails to display.

---

### Requirement 5: Staff Profile Page — Employment Information Display

**User Story:** As a staff member, I want to see my employment details on my profile page, so that I can confirm my Staff ID, role, department, and join date.

#### Acceptance Criteria

1. WHEN the Staff_Profile_Page loads successfully, THE Staff_Profile_Page SHALL display the staff member's Staff ID (`id` field), Role (`staff_role`), Department (`department`), and Date Joined (`created_at`) in the Employment Information section; IF employment data cannot be retrieved from the database, THEN THE Staff_Profile_Page SHALL display the page with an error message in place of the Employment Information section content.
2. THE Staff_Profile_Page SHALL format the Date Joined value as a human-readable date string (e.g., `"15 January 2023"`).
3. THE Staff_Profile_Page SHALL label the Employment Information section with a visible section heading and an appropriate icon.

---

### Requirement 6: Staff Profile Page — Documents Section (CV)

**User Story:** As a staff member, I want to access my CV from my profile page, so that I can view or download the document on file.

#### Acceptance Criteria

1. WHEN `cv_url` is present and non-empty, THE Staff_Profile_Page SHALL display a "View CV" button and a "Download CV" button in the Documents section.
2. WHEN the staff member clicks "View CV", THE Staff_Profile_Page SHALL open the `cv_url` in a new browser tab.
3. WHEN the staff member clicks "Download CV", THE Staff_Profile_Page SHALL trigger a file download of the resource at `cv_url` using the `download` attribute on an anchor element.
4. WHEN `cv_url` is null or empty, THE Staff_Profile_Page SHALL display the text `"No CV on file"` in the Documents section in place of the buttons; WHEN `cv_url` is present and non-empty, THE Staff_Profile_Page SHALL hide the `"No CV on file"` text.
5. THE Staff_Profile_Page SHALL NOT render any button for uploading, replacing, or removing a CV.
6. THE Staff_Profile_Page SHALL label the Documents section with a visible section heading and an appropriate icon.

---

### Requirement 7: Staff Profile Page — Portfolio Section

**User Story:** As a staff member, I want to access my portfolio link from my profile page, so that I can verify and open the portfolio URL recorded for me.

#### Acceptance Criteria

1. WHEN `portfolio_url` is present and non-empty, THE Staff_Profile_Page SHALL display an "Open Portfolio" button that opens `portfolio_url` in a new browser tab using `target="_blank" rel="noopener noreferrer"`; IF the "Open Portfolio" button fails to render, THEN THE Staff_Profile_Page SHALL display the `portfolio_url` as a clickable hyperlink so the staff member retains access to the URL.
2. WHEN `portfolio_url` is null or empty, THE Staff_Profile_Page SHALL display the text `"No portfolio link on file"` in the Portfolio section; WHEN `portfolio_url` is present and non-empty, THE Staff_Profile_Page SHALL hide the `"No portfolio link on file"` text.
3. THE Staff_Profile_Page SHALL NOT render any button for editing or removing the portfolio link.
4. THE Staff_Profile_Page SHALL label the Portfolio section with a visible section heading and an appropriate icon.

---

### Requirement 8: Staff Profile Page — Bio / About Me Section

**User Story:** As a staff member, I want to read my bio on my profile page, so that I can review the descriptive text stored about me.

#### Acceptance Criteria

1. WHEN `bio` is present and non-empty, THE Staff_Profile_Page SHALL display the bio text in the Bio / About Me section.
2. WHEN `bio` is null or empty, THE Staff_Profile_Page SHALL display the placeholder text `"No bio provided."` in the Bio / About Me section.
3. THE Staff_Profile_Page SHALL NOT render any edit control for the bio field.
4. THE Staff_Profile_Page SHALL label the Bio / About Me section with a visible section heading and an appropriate icon; THE Staff_Profile_Page SHALL render the Bio section content even if the heading or icon component fails to display.

---

### Requirement 9: Responsive Layout and Dark-Theme UI

**User Story:** As a staff member, I want the profile page to be visually consistent with the rest of the Staff Dashboard and easy to use on any device, so that my experience is cohesive and accessible.

#### Acceptance Criteria

1. THE Staff_Profile_Page SHALL apply the same dark-theme visual style as the existing Staff Dashboard, using `background: rgba(255,255,255,0.05..0.08)` glass-card panels, white text with opacity variants, and orange (`#f97316`) accent colours.
2. THE Staff_Profile_Page SHALL use a responsive grid layout that renders as a multi-column layout on desktop screens (≥ 1024 px wide) and as a single-column stacked layout on tablet (768–1023 px) and mobile (< 768 px) screens.
3. THE Staff_Profile_Page SHALL integrate into the existing Staff Dashboard shell — wrapped by the `<Navbar>` and `<Sidebar>` components with `title="Staff Portal"` — and be navigable via a "My Profile" sidebar link at the route `/staff/profile`.
4. WHEN the Staff_Profile_Page is loading data from the API, THE Staff_Profile_Page SHALL display a loading indicator in place of the profile content; IF the loading indicator component fails to render, THEN THE Staff_Profile_Page SHALL proceed to display the profile content once data is available without blocking on the indicator.
5. IF the Staff_Profile_API returns an error response, THEN THE Staff_Profile_Page SHALL display a user-readable error message rather than a blank screen or uncaught exception.
6. THE Staff_Profile_Page SHALL apply visible hover effects on interactive cards and buttons, consistent with the `hover:scale-[1.02]` pattern used in the existing Staff Dashboard.

---

### Requirement 10: Database Schema — Staff Profile Fields

**User Story:** As a developer, I want the database to store all staff-specific profile fields needed by the Staff Profile Module, so that the API can return complete profile data.

#### Acceptance Criteria

1. THE Staff_Profile_Service SHALL retrieve staff-specific extended fields — `bio`, `portfolio_url`, and `cv_url` — from the database for staff users.
2. WHEN the `staff_profiles` table does not yet exist, THE Staff_Profile_Service SHALL fall back gracefully by returning `null` for `bio`, `portfolio_url`, and `cv_url` rather than throwing an unhandled error.
3. THE Staff_Profile_Service SHALL join `users`, `profile_photos` (for `photo_url`), and the staff extended fields source using `LEFT JOIN` so that a missing sub-profile row does not prevent the base profile from being returned; IF the `LEFT JOIN` itself fails due to a database error, THEN THE Staff_Profile_Service SHALL return the base `users` row data with `null` values for all extended fields rather than propagating the join failure.
4. THE Staff_Profile_API SHALL return the `staff_role` field from the `users.staff_role` column (VARCHAR 100) as the staff member's role display value.
