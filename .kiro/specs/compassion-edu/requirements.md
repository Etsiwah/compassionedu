# Requirements Document

## Introduction

CompassionEdu is a full-stack School Management System inspired by the Ubuntu philosophy — treating students as whole individuals rather than data points. The platform balances administrative rigor (fees, attendance, examinations) with human-centric features (portfolios, CV building, experience tracking). It serves three primary user roles: Admins, Students, and Parents, accessible via a mobile-responsive web application.

## Glossary

- **System**: The CompassionEdu web application
- **Admin**: A privileged user with full control over all records, users, and content
- **Student**: A registered learner with a personalized portal
- **Parent**: A registered guardian with read-only access to their child's records
- **Teacher**: A registered educator who can manage attendance and results for assigned classes
- **Profile**: A user's personal record including photo, school level, and location
- **Portfolio**: A student's collection of CV, experiences, projects, and skills
- **Fee_Record**: A financial record linking a student to a payment obligation
- **Attendance_Record**: A daily or period-level record of a student's presence or absence
- **Result**: An examination outcome record for a student per subject and term
- **Announcement**: A system-wide or role-targeted notification message
- **Content_Item**: Any file uploaded by a student (image, video, PDF, DOCX)
- **Growth_Timeline**: A chronological view of a student's academic and experiential milestones
- **Compassion_Dashboard**: An admin view highlighting at-risk students and engagement metrics

## Requirements

### Requirement 1: User Authentication and Role-Based Access

**User Story:** As a user, I want to securely log in and access only the features relevant to my role, so that data privacy and system integrity are maintained.

#### Acceptance Criteria

1. WHEN a user submits valid credentials, THE System SHALL authenticate the user and issue a JWT token scoped to their role.
2. WHEN a user submits invalid credentials, THE System SHALL return an error message and deny access.
3. WHEN an authenticated user's JWT token expires, THE System SHALL require re-authentication before granting further access.
4. WHILE a user is authenticated as Admin, THE System SHALL grant access to all administrative features and all student records.
5. WHILE a user is authenticated as Student, THE System SHALL restrict access to only that student's own records and portal.
6. WHILE a user is authenticated as Teacher, THE System SHALL restrict access to attendance and results management for assigned classes only.
7. WHILE a user is authenticated as Parent, THE System SHALL restrict access to read-only views of their linked child's records.
8. IF a user attempts to access a resource outside their role's permissions, THEN THE System SHALL return an authorization error and deny the request.
9. THE System SHALL store passwords as cryptographic hashes and SHALL NOT store plaintext passwords.

---

### Requirement 2: User Management (Admin)

**User Story:** As an Admin, I want to add and remove users across all roles, so that I can maintain accurate system membership.

#### Acceptance Criteria

1. WHEN an Admin submits a valid new user form, THE System SHALL create the user account with the specified role and send a welcome notification.
2. WHEN an Admin deletes a user, THE System SHALL deactivate the account and retain historical records for audit purposes.
3. THE System SHALL display a searchable, filterable user management table listing all registered users with their role, name, and status.
4. WHEN an Admin searches the user table with a query string, THE System SHALL return all users whose name or email contains the query string within 500ms.
5. IF an Admin attempts to create a user with a duplicate email address, THEN THE System SHALL reject the request and display a descriptive error message.

---

### Requirement 3: Profile Management

**User Story:** As a Student, I want to manage my profile including photos, school level, location, and project counts, so that my record accurately reflects who I am.

#### Acceptance Criteria

1. WHEN a Student uploads a profile photo, THE System SHALL store the image and associate it with the student's profile.
2. THE System SHALL allow a Student to upload multiple profile photos and designate one as the default display photo.
3. WHEN a Student updates their school level, THE System SHALL persist the new value and display it on the student's portal.
4. WHEN a Student updates their current location, THE System SHALL persist the new value and display it on the student's portal.
5. WHEN a Student updates their project count, THE System SHALL persist the new numeric value and display it on the student's portal.
6. IF a Student uploads a file that exceeds 10MB or is not an accepted image format (JPEG, PNG, WEBP), THEN THE System SHALL reject the upload and display a descriptive error message.
7. THE System SHALL display the student's default profile photo, school level, location, and project count on their portal home page.

---

### Requirement 4: Fee Management

**User Story:** As a Student, I want to view my fee payment status and history, so that I can stay informed about my financial obligations.

#### Acceptance Criteria

1. THE System SHALL display each student's current fee status as one of: Paid, Pending, or Overdue.
2. THE System SHALL display a chronological payment history for each student, including amount, date, and a receipt reference.
3. WHEN a fee due date passes without a recorded payment, THE System SHALL automatically update the fee status to Overdue.
4. WHEN a fee deadline is within 7 days, THE System SHALL send an automated reminder notification to the student.
5. THE System SHALL display any active flexible payment plan associated with a student's fee record.
6. WHERE online payment integration is configured, THE System SHALL provide a payment interface supporting UPI and card transactions.
7. WHEN an Admin records a payment for a student, THE System SHALL update the fee status and append the transaction to the payment history.

---

### Requirement 5: Examination Results

**User Story:** As a Student, I want to view my examination results by subject and term, so that I can track my academic performance.

#### Acceptance Criteria

1. THE System SHALL display subject-wise marks and grades for each student, filterable by term or semester.
2. THE System SHALL calculate and display a GPA or aggregate score for each term based on recorded results.
3. THE System SHALL display a performance trend chart showing a student's aggregate scores across multiple terms.
4. WHEN a Student requests a report card for a specific term, THE System SHALL generate and provide a downloadable PDF report card.
5. WHEN an Admin or Teacher records a new result entry, THE System SHALL persist the result and make it immediately visible to the student.
6. IF a result entry contains marks outside the valid range (0–100), THEN THE System SHALL reject the entry and display a descriptive error message.

---

### Requirement 6: Attendance Tracking

**User Story:** As a Student, I want to view my attendance records, so that I can monitor my presence and address absences.

#### Acceptance Criteria

1. THE System SHALL display a calendar view of a student's daily attendance, marking each day as Present, Absent, or Late.
2. THE System SHALL calculate and display the attendance percentage per subject and per calendar month.
3. WHEN a student's attendance percentage for any subject falls below 75%, THE System SHALL send an absence notification to the student and their linked parent.
4. WHEN a Teacher records attendance for a class session, THE System SHALL persist the records and update each affected student's attendance view.
5. THE System SHALL support period-wise attendance recording in addition to daily attendance.

---

### Requirement 7: Portfolio and CV Management

**User Story:** As a Student, I want to build and maintain a portfolio with my CV, experiences, projects, and skills, so that I can showcase my growth and achievements.

#### Acceptance Criteria

1. WHEN a Student uploads a CV file in PDF or DOCX format, THE System SHALL store the file and associate it with the student's portfolio.
2. WHEN a Student adds an experience entry with a title, organization, start date, end date, and description, THE System SHALL persist the entry and display it in the portfolio.
3. THE System SHALL display a projects showcase gallery where students can upload images and videos with titles and descriptions.
4. THE System SHALL allow a Student to add, edit, and remove skills from a skills section in their portfolio.
5. THE System SHALL display a Growth Timeline showing the student's experience entries and academic milestones in chronological order.
6. IF a Student uploads a CV file that is not PDF or DOCX format, THEN THE System SHALL reject the upload and display a descriptive error message.
7. IF a Student uploads a portfolio media file that exceeds 50MB, THEN THE System SHALL reject the upload and display a descriptive error message.

---

### Requirement 8: Admin Dashboard and Analytics

**User Story:** As an Admin, I want a comprehensive dashboard with analytics and content moderation tools, so that I can oversee the entire school's operations.

#### Acceptance Criteria

1. THE System SHALL display a Compassion Dashboard showing a list of at-risk students based on low attendance or overdue fees.
2. THE System SHALL display fee collection summary charts showing total collected, pending, and overdue amounts.
3. THE System SHALL display attendance analytics charts aggregated across all students and classes.
4. THE System SHALL display performance overview charts showing grade distributions and term-over-term trends.
5. THE System SHALL provide a content moderation panel listing all student-uploaded Content_Items with options to approve or flag each item.
6. WHEN an Admin flags a Content_Item, THE System SHALL mark it as flagged and hide it from the student's public portfolio view.
7. WHEN an Admin approves a Content_Item, THE System SHALL mark it as approved and make it visible in the student's portfolio.

---

### Requirement 9: Announcements and Notifications

**User Story:** As an Admin, I want to send announcements to specific user roles, so that I can communicate important information efficiently.

#### Acceptance Criteria

1. WHEN an Admin creates an announcement with a title, content, and target role, THE System SHALL persist the announcement and deliver it to all users matching the target role.
2. THE System SHALL display unread announcements as notifications in the recipient's portal.
3. WHEN a user reads an announcement, THE System SHALL mark it as read and remove it from the unread count.
4. THE System SHALL support targeting announcements to All Users, Students only, Teachers only, or Parents only.

---

### Requirement 10: UI and Accessibility

**User Story:** As any user, I want a responsive, accessible, and visually comfortable interface, so that I can use the platform on any device without difficulty.

#### Acceptance Criteria

1. THE System SHALL render all pages in a mobile-responsive layout that adapts to screen widths from 320px to 1920px.
2. THE System SHALL provide a dark/light theme toggle that persists the user's preference across sessions.
3. WHEN a data-loading operation is in progress, THE System SHALL display a loading indicator to the user.
4. WHEN an operation fails, THE System SHALL display a descriptive, human-readable error message.
5. THE System SHALL use warm, approachable color palettes and typography consistent with the CompassionEdu brand guidelines.
