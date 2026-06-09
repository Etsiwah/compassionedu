# Requirements Document

## Introduction

This document specifies the expansion of the existing CompassionEdu School Management System into a complete School + Beneficiary Management Platform. The expansion adds six new functional modules — Beneficiary Profile Management, Timetable Management, Enhanced Notifications, Student Activities / Child News, Enhanced Announcements, and Reports & Analytics — while extending the Admin Dashboard and Student Dashboard with richer summary cards. All new modules must integrate cleanly with the existing Express.js + PostgreSQL backend and React + Tailwind frontend, preserving the glassmorphism design language, orange branding, sidebar navigation, and all existing routes and components.

## Glossary

- **System**: The CompassionEdu web application (existing + expanded)
- **Admin**: A privileged user with full control over all records, users, and content
- **Student**: A registered learner with a personalized portal
- **Parent**: A registered guardian with read-only access to their child's records
- **Teacher**: A registered educator who can manage attendance and results for assigned classes
- **Beneficiary**: A student who is enrolled in a sponsored project and has an associated Beneficiary_Profile
- **Beneficiary_Profile**: An extended record for a sponsored student containing project number, beneficiary number, education details, and uploaded documents
- **Timetable**: A weekly schedule of class sessions mapping subjects, teachers, time slots, rooms, and class groups
- **Timetable_Entry**: A single row in a timetable representing one class session (subject, teacher, day, start time, end time, room, class group)
- **Notification**: A targeted, in-app alert delivered to a specific user, distinct from a broadcast Announcement
- **Activity_Card**: An admin-created post containing an image, title, date, and details describing a student activity, event, or community project
- **Report**: A generated summary document (PDF or CSV) covering attendance, fees, or beneficiary data for a specified date range
- **Announcement**: An existing system-wide or role-targeted message (extended in this spec with rich text, attachments, pinning, and audience targeting)
- **Dashboard_Card**: A summary widget displayed on the Admin or Student dashboard showing a key metric with a label and value
- **Fee_Receipt**: A student-uploaded proof-of-payment document (PDF, JPG, or PNG) linked to a specific fee record, subject to admin approval
- **CV_Upload**: A student-uploaded curriculum vitae or resume document (PDF or DOCX) with version history, subject to admin review
- **Semester_Result_Upload**: A student-uploaded academic result file for a specific academic year and semester, subject to admin approval and remarks
- **Student_Activity_Post**: A student-submitted post describing a school activity, project, event, or achievement, with optional media, subject to admin moderation before publication
- **Student_Experience_Post**: A student-submitted post describing a new experience, achievement, or community participation, with optional photos/videos and captions, subject to admin approval before publication
- **Extended_Student_Profile**: The full student profile visible to both the student and admin, combining identity, personal, education, and beneficiary fields into a single unified view

## Requirements

### Requirement 1: Beneficiary Profile — Admin Management

**User Story:** As an Admin, I want to create and manage beneficiary profiles for sponsored students, so that I can track project participation, education details, and supporting documents in one place.

#### Acceptance Criteria

1. WHEN an Admin submits a valid beneficiary profile form, THE System SHALL create a Beneficiary_Profile record linked to the selected student user and persist all provided fields.
2. THE System SHALL require the following fields when creating a Beneficiary_Profile: Project Number, Beneficiary Number, Name, Date of Birth, Gender, Phone, Email, Education Level (one of: JHS, SHS, Tertiary), School Name, Program, and Academic Year.
3. WHEN an Admin updates any field of an existing Beneficiary_Profile, THE System SHALL persist the updated values and reflect them immediately in the admin view.
4. WHEN an Admin uploads a document (school results, report card, admission letter, or ID) to a Beneficiary_Profile and the file passes all format and size validation, THE System SHALL store the file and associate it with the correct profile; IF the file fails validation, THEN THE System SHALL reject storage entirely, return a descriptive error message, and only display errors in response to actual upload attempts — never proactively; IF an internal error occurs during the rejection process, THEN THE System SHALL ensure the operation is atomic so that any validation failure completely prevents storage and always returns an error message.
5. THE System SHALL accept document uploads in PDF, JPEG, PNG, and WEBP formats only; IF a file of any other format is uploaded, THEN THE System SHALL reject the upload without storing the file and return a descriptive error message.
6. THE System SHALL accept document uploads up to 20MB per file; IF a file exceeds 20MB, THEN THE System SHALL reject the upload without storing the file and return a descriptive error message.
7. THE System SHALL display a searchable, filterable list of all Beneficiary_Profiles showing Project Number, Beneficiary Number, Name, Education Level, and School Name.
8. WHEN an Admin searches the beneficiary list with a query string, THE System SHALL return all profiles whose Name, Project Number, or Beneficiary Number contains the query string.

---

### Requirement 2: Beneficiary Profile — Student View

**User Story:** As a Student, I want to view my own beneficiary profile and uploaded documents, so that I can confirm my project details and access my records.

#### Acceptance Criteria

1. WHEN a Student navigates to their Beneficiary Profile section, THE System SHALL display all fields of their own Beneficiary_Profile if one exists.
2. IF a Student does not yet have a Beneficiary_Profile, THEN THE System SHALL display a clear message indicating that no beneficiary record has been assigned.
3. THE System SHALL display a list of all documents uploaded to the Student's Beneficiary_Profile, showing document type, file name, and upload date; IF no Beneficiary_Profile exists, THEN THE System SHALL hide the document section entirely rather than showing an empty list.
4. WHEN a Student selects a document from the list, THE System SHALL open a preview for PDF and image files inline, and provide a download link for all file types.
5. WHILE a Student is authenticated, THE System SHALL restrict Beneficiary_Profile access to only that student's own record.

---

### Requirement 3: Timetable Management — Admin

**User Story:** As an Admin, I want to create and assign timetables for classes, so that students and teachers have a clear weekly schedule.

#### Acceptance Criteria

1. WHEN an Admin submits a valid Timetable_Entry form, THE System SHALL persist the entry with subject, teacher, day of week, start time, end time, room, and class group.
2. THE System SHALL require all of the following fields for a Timetable_Entry: subject, teacher (linked to a user with role teacher), day of week, start time, end time, room, and class group.
3. IF a new Timetable_Entry conflicts with an existing entry for the same teacher on the same day and overlapping time range, THEN THE System SHALL reject the entry and return a descriptive conflict error.
4. IF a new Timetable_Entry conflicts with an existing entry for the same room on the same day and overlapping time range, THEN THE System SHALL reject the entry and return a descriptive conflict error.
5. WHEN an Admin deletes a Timetable_Entry, THE System SHALL remove it and it SHALL no longer appear in any timetable view.
6. THE System SHALL display all Timetable_Entries in a weekly grid view organized by day and time slot.

---

### Requirement 4: Timetable Management — Student View

**User Story:** As a Student, I want to view my own class timetable, so that I know when and where each subject is scheduled.

#### Acceptance Criteria

1. WHEN a Student navigates to the Timetable section, THE System SHALL display all Timetable_Entries assigned to the Student's class group in a weekly grid organized by day and time.
2. THE System SHALL display for each Timetable_Entry: subject name, teacher name, room, start time, and end time.
3. WHILE a Student is authenticated, THE System SHALL restrict timetable data to only the entries belonging to that student's class group; IF the filtering mechanism fails and cannot guarantee that only the student's class group entries are returned, THEN THE System SHALL prevent any timetable data from being displayed rather than risk showing entries from other class groups.

---

### Requirement 5: Enhanced Notifications — Admin Sending

**User Story:** As an Admin, I want to send targeted in-app notifications to individual users or groups, so that I can communicate fee reminders, attendance alerts, and project updates directly.

#### Acceptance Criteria

1. WHEN an Admin creates a Notification with a message, type (one of: announcement, fee_reminder, attendance_alert, project_update), and target (all students, all parents, or a specific user ID), THE System SHALL persist the Notification and deliver it to all matching recipients.
2. THE System SHALL support the following notification types: announcement, fee_reminder, attendance_alert, project_update.
3. THE System SHALL support the following notification targets: all_students, all_parents, specific_user (identified by user ID).
4. WHEN a fee record transitions to Overdue status, THE System SHALL queue a fee_reminder Notification for the affected student to be delivered in the next scheduled batch (daily or weekly), rather than immediately.
5. WHEN a student's attendance percentage falls below 75%, THE System SHALL automatically create an attendance_alert Notification for the affected student and their linked parent.

---

### Requirement 6: Enhanced Notifications — Student Receiving

**User Story:** As a Student, I want to see my unread notifications with a badge count and browse my notification history, so that I never miss important updates.

#### Acceptance Criteria

1. THE System SHALL display a bell icon in the navigation bar with a numeric badge showing the count of unread Notifications for the authenticated user.
2. WHEN a Student opens the notification panel, THE System SHALL display all Notifications for that student in reverse chronological order, distinguishing unread from read items.
3. WHEN a Student marks a Notification as read, THE System SHALL update its status to read, decrement the unread badge count, and cancel or reset any pending automatic timeout for that notification; manual marking takes priority and suppresses all automatic read-marking mechanisms for that notification. THE System SHALL also mark a Notification as read automatically when the student views its full detail or when a configurable time-based expiry elapses, provided the student has not already manually marked it as read.
4. THE System SHALL poll for new Notifications at least every 60 seconds while the user is authenticated; reasonable network-delay tolerance above 60 seconds is acceptable.
5. WHEN a Student views the Notifications section, THE System SHALL display the full notification history including type, message, and timestamp.

---

### Requirement 7: Student Activities / Child News

**User Story:** As an Admin, I want to post activity cards about student events and community projects, so that students can stay informed about school life and achievements.

#### Acceptance Criteria

1. WHEN an Admin submits a valid Activity_Card form with a title, date, details, and optional image, THE System SHALL persist the Activity_Card and make it visible to all students.
2. THE System SHALL accept activity images in JPEG, PNG, and WEBP formats up to 10MB; IF an image exceeds 10MB or is an unsupported format, THEN THE System SHALL reject the upload and return a descriptive error message.
3. WHEN an Admin deletes an Activity_Card, THE System SHALL remove it and it SHALL no longer appear in any student view.
4. WHEN a Student navigates to the Activities section, THE System SHALL display all Activity_Cards in reverse chronological order, showing image (if present), title, date, and a summary of details.
5. THE System SHALL display the most recent 5 Activity_Cards on the Student Dashboard as a "Recent Activities" widget.

---

### Requirement 8: Enhanced Announcements

**User Story:** As an Admin, I want to create rich announcements with attachments, pinning, and precise audience targeting, so that important communications are prominent and reach the right people.

#### Acceptance Criteria

1. WHEN an Admin creates an Announcement, THE System SHALL accept rich text content (formatted with basic HTML or Markdown) in addition to plain text.
2. WHEN an Admin attaches a file to an Announcement, THE System SHALL store the attachment and include a download link in the announcement display only when a file is actually attached; attachments SHALL be limited to PDF, JPEG, PNG, and WEBP formats up to 20MB.
3. WHEN an Admin pins an Announcement, THE System SHALL display it at the top of the announcement feed for all targeted recipients above non-pinned announcements; THE System SHALL block all pin and unpin operations on the same Announcement until the current operation completes, keeping the announcement in its current display position until operations resolve sequentially.
4. THE System SHALL support audience targeting for Announcements to: all users, students only, teachers only, parents only, or a specific named group (e.g., a class group name).
5. THE System SHALL display Announcements in a timeline feed ordered by pinned-first then reverse chronological.
6. WHEN an Admin unpins an Announcement, THE System SHALL move it back to its chronological position in the feed; THE System SHALL block all pin and unpin operations on the same Announcement until the current operation completes, keeping the announcement in its current display position until operations resolve sequentially.

---

### Requirement 9: Admin Dashboard Expansion

**User Story:** As an Admin, I want an expanded dashboard with key metric cards, so that I can see the most important operational numbers at a glance.

#### Acceptance Criteria

1. THE System SHALL display the following Dashboard_Cards on the Admin Dashboard: Total Students (count of active student users), Attendance % (system-wide average attendance percentage), Fees Collected (total amount of paid fees), Active Beneficiaries (count of students with a Beneficiary_Profile), and Pending Actions (count of pending moderation items plus overdue fees).
2. WHEN the Admin Dashboard loads, THE System SHALL fetch and display current values for all Dashboard_Cards within 2 seconds under normal load.
3. THE System SHALL display each Dashboard_Card with a label, numeric value, and a contextual icon.

---

### Requirement 10: Student Dashboard Expansion

**User Story:** As a Student, I want a dashboard home page with summary cards linking to my key sections, so that I can quickly navigate to what matters most.

#### Acceptance Criteria

1. THE System SHALL display the following Dashboard_Cards on the Student Dashboard home: My Attendance (student's overall attendance percentage), My Fees (current fee status label), Timetable (link to timetable section), Results (link to results section), Notifications (unread notification count), and Activities (count of new Activity_Cards since last visit).
2. WHEN the Student Dashboard loads, THE System SHALL fetch and display current values for all Dashboard_Cards.
3. WHEN a Student clicks a Dashboard_Card, THE System SHALL navigate to the specific section of the student portal that corresponds to that card.

---

### Requirement 11: Reports & Analytics — Admin

**User Story:** As an Admin, I want to generate and export attendance, fee, and beneficiary reports, so that I can share data with stakeholders and perform offline analysis.

#### Acceptance Criteria

1. WHEN an Admin requests an attendance report for a specified date range, THE System SHALL generate a summary showing each student's attendance percentage and total present/absent/late counts for that period.
2. WHEN an Admin requests a fee report, THE System SHALL generate a summary showing total fees collected, total pending, total overdue, and a per-student breakdown.
3. WHEN an Admin requests a beneficiary report, THE System SHALL generate a summary listing all Beneficiary_Profiles with their project number, beneficiary number, name, education level, and school; IF any required field is missing from a profile record, THEN THE System SHALL reject the report request and return an error rather than generating a partial report.
4. THE System SHALL provide export functionality for all reports in CSV format.
5. WHEN an Admin exports a report and the CSV file is successfully generated, THE System SHALL initiate a browser download of the file; IF the CSV file cannot be generated, THEN THE System SHALL return an error message and SHALL NOT initiate a browser download.
6. IF a report is requested for a date range with no data, THEN THE System SHALL return an empty report with appropriate column headers rather than an error.

---

### Requirement 12: Non-Functional and Integration Constraints

**User Story:** As a system stakeholder, I want the expanded platform to remain performant, secure, and consistent with the existing design, so that the user experience is seamless and the system is maintainable.

#### Acceptance Criteria

1. THE System SHALL preserve all existing routes, components, and database tables without modification; new functionality SHALL be added through new routes, new tables, and new components only.
2. THE System SHALL apply role-based access control to all new API endpoints: Admin endpoints SHALL require the admin role, Student endpoints SHALL require the student role, and shared endpoints SHALL validate the requesting user's identity.
3. THE System SHALL render all new pages and components in a mobile-responsive layout consistent with the existing glassmorphism design, orange branding, and sidebar navigation.
4. WHEN any new data-loading operation is in progress, THE System SHALL display a loading indicator consistent with the existing LoadingSpinner component; WHEN the operation fails, THE System SHALL immediately hide the loading indicator and display a descriptive error message.
5. WHEN any new operation fails, THE System SHALL display a descriptive error message consistent with the existing ErrorMessage component; error messages SHALL only be displayed when operations actually fail and SHALL NOT appear when operations succeed.
6. THE System SHALL store all new file uploads in the existing uploads directory structure and serve them via the existing static file middleware.
7. THE System SHALL require both role verification and identity validation for all shared endpoints; IF either check fails, THEN THE System SHALL deny access and return a 401 or 403 response.

---

### Requirement 13: Student Fee Receipt Upload

**User Story:** As a Student, I want to upload proof of payment for my fees, so that the admin can verify and confirm my payment without requiring a physical visit.

#### Acceptance Criteria

1. WHEN a Student uploads a Fee_Receipt file that passes format and size validation, THE System SHALL store the file, associate it with the student's account, set its status to pending_review, and notify the admin of a new pending receipt.
2. THE System SHALL accept Fee_Receipt uploads in PDF, JPEG, and PNG formats only; IF a file of any other format is submitted, THEN THE System SHALL reject the upload without storing the file and return a descriptive error message.
3. THE System SHALL accept Fee_Receipt uploads up to 20MB per file; IF a file exceeds 20MB, THEN THE System SHALL reject the upload without storing the file and return a descriptive error message.
4. BEFORE a Student submits a Fee_Receipt, THE System SHALL display a preview of the selected file so the student can confirm the correct file is selected.
5. WHEN a Student uploads a new Fee_Receipt to replace a previous one, THE System SHALL retain the previous upload in the upload history and mark the new upload as the current pending receipt.
6. THE System SHALL display the student's full Fee_Receipt upload history showing file name, upload date, and approval status (pending_review, approved, rejected) for each entry.
7. WHEN an Admin approves a Fee_Receipt, THE System SHALL update its status to approved and send a notification to the student confirming approval.
8. WHEN an Admin rejects a Fee_Receipt, THE System SHALL update its status to rejected, record the rejection reason, and send a notification to the student with the rejection reason.

---

### Requirement 14: Student CV Upload

**User Story:** As a Student, I want to upload my CV or resume, so that the admin can review my qualifications and I can keep my documents up to date.

#### Acceptance Criteria

1. WHEN a Student uploads a CV_Upload file that passes format and size validation, THE System SHALL store the file, associate it with the student's account, and make it available for admin review.
2. THE System SHALL accept CV_Upload files in PDF and DOCX formats only; IF a file of any other format is submitted, THEN THE System SHALL reject the upload without storing the file and return a descriptive error message.
3. THE System SHALL accept CV_Upload files up to 20MB per file; IF a file exceeds 20MB, THEN THE System SHALL reject the upload without storing the file and return a descriptive error message.
4. BEFORE a Student submits a CV_Upload, THE System SHALL display a preview for PDF files so the student can confirm the correct file is selected.
5. WHEN a Student uploads a new CV_Upload to replace a previous one, THE System SHALL retain all previous versions in a version history list showing version number, file name, and upload date.
6. THE System SHALL display the student's CV version history with the most recent version clearly marked as current.
7. WHEN an Admin views a student's profile, THE System SHALL display all CV_Upload versions with options to download each version.
8. WHEN an Admin approves a CV_Upload, THE System SHALL update its status to approved and the student SHALL be notified.

---

### Requirement 15: Student Semester Result Upload

**User Story:** As a Student, I want to upload my semester results for each academic year and semester, so that the admin can review my academic progress and add remarks.

#### Acceptance Criteria

1. WHEN a Student submits a Semester_Result_Upload with a valid academic year, semester (1, 2, or 3), GPA, and result file, THE System SHALL store the record and file, set its status to pending_review, and notify the admin.
2. THE System SHALL require the following fields for a Semester_Result_Upload: Academic Year (e.g., 2024/2025), Semester (one of: 1, 2, 3), GPA (numeric value between 0.0 and 4.0 inclusive), and Result File.
3. THE System SHALL accept Semester_Result_Upload files in PDF and image formats (JPEG, PNG, WEBP) only; IF a file of any other format is submitted, THEN THE System SHALL reject the upload without storing the file and return a descriptive error message.
4. THE System SHALL accept Semester_Result_Upload files up to 20MB per file; IF a file exceeds 20MB, THEN THE System SHALL reject the upload without storing the file and return a descriptive error message.
5. WHEN an Admin approves a Semester_Result_Upload, THE System SHALL update its status to approved; WHEN an Admin rejects it, THE System SHALL update its status to rejected and record the rejection reason; in both cases THE System SHALL notify the student.
6. WHEN an Admin adds remarks to a Semester_Result_Upload, THE System SHALL persist the remarks and display them alongside the result in the student's view.
7. THE System SHALL display the student's result history as a timeline of semester cards ordered by academic year and semester, showing GPA, status, and admin remarks for each entry.
8. THE System SHALL display an academic progress chart on the student's results page showing GPA trend across all approved semesters in chronological order.

---

### Requirement 16: Student Activity Posts

**User Story:** As a Student, I want to post updates about my school activities, projects, and achievements, so that the admin can see my involvement and highlight my contributions.

#### Acceptance Criteria

1. WHEN a Student submits a Student_Activity_Post with a title, description, date, and optional media, THE System SHALL store the post with status pending_review and notify the admin for moderation.
2. THE System SHALL accept Student_Activity_Post media in JPEG, PNG, WEBP, and MP4 formats up to 50MB per file; IF a file exceeds 50MB or is an unsupported format, THEN THE System SHALL reject the upload and return a descriptive error message.
3. WHEN an Admin approves a Student_Activity_Post, THE System SHALL update its status to published and make it visible in the student's activity timeline and gallery; approval and rejection are mutually exclusive — once a post is approved it cannot also be rejected, and vice versa.
4. WHEN an Admin rejects a Student_Activity_Post, THE System SHALL update its status to rejected and notify the student with the rejection reason.
5. WHEN an Admin highlights a Student_Activity_Post, THE System SHALL mark it as highlighted and display it prominently at the top of the activity feed.
6. THE System SHALL display approved Student_Activity_Posts in a timeline view and a gallery view, both ordered reverse chronologically.
7. WHILE a Student is authenticated, THE System SHALL display only that student's own posts (all statuses) in their personal activity management view; published posts from all students SHALL be visible in a shared activity feed.

---

### Requirement 17: Student Experience / News Posts

**User Story:** As a Student, I want to share my new experiences, achievements, and community participation, so that my journey is documented and can inspire others.

#### Acceptance Criteria

1. WHEN a Student submits a Student_Experience_Post with a title, description, date, and optional photos/videos with captions, THE System SHALL store the post with status pending_review and notify the admin for approval.
2. THE System SHALL accept Student_Experience_Post media in JPEG, PNG, WEBP, and MP4 formats up to 50MB per file; IF a file exceeds 50MB or is an unsupported format, THEN THE System SHALL reject the upload and return a descriptive error message.
3. WHEN an Admin approves a Student_Experience_Post, THE System SHALL update its status to published; the post SHALL remain invisible in the news feed until an Admin explicitly makes it visible through a separate visibility action; approval and rejection are mutually exclusive — once a post is approved it cannot also be rejected, and vice versa.
4. WHEN an Admin rejects a Student_Experience_Post, THE System SHALL update its status to rejected and notify the student with the rejection reason.
5. THE System SHALL display approved Student_Experience_Posts in a card-based feed ordered reverse chronologically, showing title, date, a media thumbnail (if present), and a summary of the description.
6. WHILE a Student is authenticated, THE System SHALL display only that student's own posts (all statuses) in their personal experience management view.

---

### Requirement 18: Extended Student Profile

**User Story:** As a Student, I want a comprehensive profile page that shows all my identity, personal, and education details in one place, so that I and the admin have a complete view of my record.

#### Acceptance Criteria

1. THE System SHALL display the following identity fields on the Extended_Student_Profile: Student Name, School Name, Family Name, Project Number, Beneficiary Number, and Profile Picture.
2. THE System SHALL display the following personal fields on the Extended_Student_Profile: Phone, Email, Address, and Guardian Name.
3. THE System SHALL display the following education fields on the Extended_Student_Profile: Current School, Education Level (JHS/SHS/Tertiary), Program, Current Level/Year, and Academic Year.
4. WHEN a Student updates any editable profile field (Phone, Email, Address, Guardian Name, Profile Picture), THE System SHALL persist the change immediately and display the updated value.
5. THE System SHALL restrict students from editing identity fields (Student Name, Family Name, Project Number, Beneficiary Number) and education fields (Current School, Education Level, Program, Academic Year); these fields SHALL only be editable by an Admin.
6. WHEN an Admin views a student's Extended_Student_Profile, THE System SHALL display all fields including identity, personal, education, uploaded documents, CV versions, fee receipts, semester results, activity posts, and experience posts in a unified view.
7. THE System SHALL display the Profile Picture with a circular crop; WHEN a Student uploads a new Profile Picture, THE System SHALL accept JPEG, PNG, and WEBP formats up to 10MB and reject all other formats and sizes with a descriptive error message.
