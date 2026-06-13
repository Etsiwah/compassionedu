# Requirements Document

## Introduction

This document specifies requirements for comprehensive enhancements to the existing Admin Announcement system. The improvements address six critical areas: fixing targeted announcement delivery, streamlining target group options, enabling announcement management, preventing self-notifications, implementing a reply system, and adding email notifications. These enhancements will improve communication effectiveness and user engagement within the educational platform.

## Glossary

- **Announcement_System**: The existing system component that allows admins to create and distribute announcements to users
- **Admin**: A user with administrative privileges who can create, edit, and delete announcements
- **Staff**: Users with staff role in the system
- **Students**: Users with student role in the system
- **Target_Group**: The intended recipient category for an announcement (Everyone, Staff, or Students)
- **Notification**: An in-system alert that informs users of new announcements or replies
- **Reply**: A message submitted by Staff or Students in response to an announcement
- **Reply_Management_Panel**: An admin interface displaying all replies to announcements
- **Email_Notification**: An email sent to user registration addresses when announcements are created
- **Creator**: The Admin user who creates an announcement
- **Recipient**: A user who should receive an announcement based on Target_Group selection
- **Targeted_Announcement**: An announcement intended for a specific Target_Group (Staff or Students), not Everyone
- **Database_Query**: A query executed against the database to retrieve user records for announcement delivery
- **Role_Filter**: Logic that determines which users receive an announcement based on their role

## Requirements

### Requirement 1: Fix Targeted Announcement Delivery

**User Story:** As an Admin, I want targeted announcements to reach Staff-only or Students-only groups correctly, so that I can communicate with specific audiences effectively.

#### Acceptance Criteria

1. WHEN an Admin creates an announcement with Target_Group "Staff", THE Announcement_System SHALL deliver the announcement to all users with Staff role
2. WHEN an Admin creates an announcement with Target_Group "Students", THE Announcement_System SHALL deliver the announcement to all users with Students role
3. WHEN an Admin creates an announcement with Target_Group "Everyone", THE Announcement_System SHALL deliver the announcement to all users with Staff role AND all users with Students role
4. THE Database_Query SHALL correctly filter users by role when retrieving Recipients
5. THE Role_Filter SHALL apply the correct role criteria for each Target_Group selection
6. FOR ALL announcements with Target_Group "Staff", the set of Recipients SHALL equal the set of all users with Staff role
7. FOR ALL announcements with Target_Group "Students", the set of Recipients SHALL equal the set of all users with Students role
8. FOR ALL announcements with Target_Group "Everyone", the set of Recipients SHALL equal the union of all users with Staff role and all users with Students role

### Requirement 2: Remove Unused Target Groups

**User Story:** As an Admin, I want only relevant target group options (Everyone, Staff, Students), so that I don't see confusing unused options like Teacher and Parent.

#### Acceptance Criteria

1. THE Announcement_System SHALL provide exactly three Target_Group options: "Everyone", "Staff", and "Students"
2. THE Announcement_System SHALL NOT provide Target_Group options for "Teacher" or "Parent"
3. WHEN an Admin views the announcement creation form, THE form SHALL display only "Everyone", "Staff", and "Students" as Target_Group choices
4. THE Backend_Validation SHALL reject announcement submissions with Target_Group values other than "Everyone", "Staff", or "Students"
5. THE Database_Schema SHALL restrict Target_Group values to "Everyone", "Staff", or "Students"
6. FOR ALL valid announcement creation requests, the Target_Group field SHALL contain one of exactly three values: "Everyone", "Staff", or "Students"

### Requirement 3: Enable Announcement Editing

**User Story:** As an Admin, I want to edit existing announcements, so that I can correct mistakes or update information without deleting and recreating announcements.

#### Acceptance Criteria

1. WHEN an Admin views the announcement list, THE Announcement_System SHALL display an Edit button for each announcement
2. WHEN an Admin clicks the Edit button, THE Announcement_System SHALL display an edit form pre-populated with the announcement's current title, content, and Target_Group
3. WHEN an Admin submits edited announcement data, THE Announcement_System SHALL update the announcement record with the new data
4. WHEN an announcement is edited, THE Announcement_System SHALL preserve the original creation timestamp
5. WHEN an announcement is edited, THE Announcement_System SHALL update the last_modified timestamp to the current time
6. WHEN an announcement is edited, THE updated content SHALL be visible to all Recipients immediately upon page refresh
7. THE Edit_Form SHALL validate that title is not empty and content is not empty before allowing submission
8. IF audit logging is supported, WHEN an announcement is edited, THE Announcement_System SHALL log the edit action with Admin identifier, timestamp, and changed fields

### Requirement 4: Enable Announcement Deletion

**User Story:** As an Admin, I want to delete announcements, so that I can remove outdated or incorrect information from the system.

#### Acceptance Criteria

1. WHEN an Admin views the announcement list, THE Announcement_System SHALL display a Delete button for each announcement
2. WHEN an Admin clicks the Delete button, THE Announcement_System SHALL display a confirmation dialog requesting confirmation of deletion
3. WHEN an Admin confirms deletion in the dialog, THE Announcement_System SHALL remove the announcement record from the database
4. WHEN an announcement is deleted, THE announcement SHALL NOT appear in announcement lists for any Recipients
5. WHEN an announcement is deleted, THE associated Notification records SHALL be marked as invalid or removed
6. WHEN an Admin cancels the deletion dialog, THE Announcement_System SHALL NOT delete the announcement
7. IF audit logging is supported, WHEN an announcement is deleted, THE Announcement_System SHALL log the deletion action with Admin identifier, timestamp, and announcement identifier

### Requirement 5: Prevent Self-Notifications for Creator

**User Story:** As an Admin, I want to not receive notifications for announcements I create, so that I only see notifications for information relevant to me.

#### Acceptance Criteria

1. WHEN an Admin creates an announcement, THE Announcement_System SHALL NOT create a Notification for that Admin
2. WHEN an Admin creates an announcement with Target_Group "Everyone", THE Announcement_System SHALL create Notification records for all Staff and all Students excluding the Creator
3. WHEN an Admin creates an announcement with Target_Group "Staff", THE Announcement_System SHALL create Notification records for all Staff excluding the Creator
4. WHEN an Admin creates an announcement with Target_Group "Students", THE Announcement_System SHALL create Notification records for all Students
5. FOR ALL announcement creation events, the Creator SHALL NOT be included in the set of users receiving Notifications
6. FOR ALL announcement creation events, IF the Creator has a role matching the Target_Group, the Creator SHALL be excluded from Notification Recipients

### Requirement 6: Parse and Display Reply Submissions

**User Story:** As a Student or Staff member, I want to reply to announcements, so that I can ask questions or provide feedback to administrators.

#### Acceptance Criteria

1. WHEN a Staff or Students user views an announcement, THE Announcement_System SHALL display a Reply button
2. WHEN a Staff or Students user clicks the Reply button, THE Announcement_System SHALL display a reply form with a text input field
3. WHEN a Staff or Students user submits a Reply, THE Announcement_System SHALL validate that the reply message is not empty
4. WHEN a valid Reply is submitted, THE Announcement_System SHALL store the Reply record with announcement_id, user_id, user_role, reply_message, and timestamp
5. WHEN a Reply is successfully stored, THE Announcement_System SHALL display a success confirmation to the user
6. THE Announcement_System SHALL allow only users who are Recipients of an announcement to submit Replies to that announcement
7. WHEN an Admin views an announcement, THE Announcement_System SHALL NOT display a Reply button
8. FOR ALL Reply submissions, the Reply record SHALL contain a valid announcement_id referencing an existing announcement

### Requirement 7: Display Reply Management Panel for Admin

**User Story:** As an Admin, I want to view all replies to announcements in a management panel, so that I can monitor user feedback and questions.

#### Acceptance Criteria

1. THE Announcement_System SHALL provide a Reply_Management_Panel accessible to Admin users
2. WHEN an Admin accesses the Reply_Management_Panel, THE panel SHALL display all Reply records sorted by timestamp in descending order
3. FOR EACH Reply displayed in the panel, THE Announcement_System SHALL show the announcement title, user name, user role, reply message, and submission timestamp
4. THE Reply_Management_Panel SHALL allow filtering Replies by announcement
5. THE Reply_Management_Panel SHALL allow filtering Replies by user role (Staff or Students)
6. WHEN no Replies exist, THE Reply_Management_Panel SHALL display a message indicating no replies have been submitted
7. THE Reply_Management_Panel SHALL paginate results if more than 50 Replies exist

### Requirement 8: Generate Notifications for Admin on Replies

**User Story:** As an Admin, I want to receive notifications when users reply to announcements, so that I am aware of user engagement and can respond promptly.

#### Acceptance Criteria

1. WHEN a Staff or Students user submits a Reply, THE Announcement_System SHALL create a Notification for all Admin users
2. THE Reply_Notification SHALL include the announcement title, user name, and reply preview (first 50 characters of reply message)
3. WHEN an Admin views the Reply_Notification, THE Notification SHALL link to the Reply_Management_Panel filtered to show the specific announcement's replies
4. THE Reply_Notification SHALL be marked as unread upon creation
5. WHEN an Admin clicks on the Reply_Notification, THE Notification SHALL be marked as read

### Requirement 9: Send Email Notifications for Announcements

**User Story:** As a Recipient, I want to receive email notifications when announcements are created, so that I am informed even when not actively using the system.

#### Acceptance Criteria

1. WHEN an Admin creates an announcement, THE Announcement_System SHALL send Email_Notification messages to all Recipients based on Target_Group
2. WHEN Target_Group is "Everyone", THE Announcement_System SHALL send Email_Notification to all Staff registration emails AND all Students registration emails
3. WHEN Target_Group is "Staff", THE Announcement_System SHALL send Email_Notification to all Staff registration emails
4. WHEN Target_Group is "Students", THE Announcement_System SHALL send Email_Notification to all Students registration emails
5. THE Email_Notification SHALL include announcement title, announcement content, creation date, Creator name, and a link to view the announcement in the system
6. THE Announcement_System SHALL NOT send Email_Notification to the Creator
7. THE Announcement_System SHALL NOT send duplicate Email_Notification messages to the same email address for a single announcement
8. IF email sending fails for a Recipient, THE Announcement_System SHALL log the failure and continue sending to remaining Recipients
9. FOR ALL announcement creation events, each Recipient SHALL receive at most one Email_Notification

### Requirement 10: Format Email Notification Content

**User Story:** As a Recipient, I want announcement emails to be well-formatted and contain all relevant information, so that I can understand the announcement without logging into the system.

#### Acceptance Criteria

1. THE Email_Notification SHALL have a subject line in the format: "New Announcement: [announcement_title]"
2. THE Email_Notification body SHALL include a header stating "New Announcement from [Creator_name]"
3. THE Email_Notification body SHALL include the full announcement content formatted as plain text or HTML
4. THE Email_Notification body SHALL include the creation date formatted as "Posted on: [date] at [time]"
5. THE Email_Notification body SHALL include a call-to-action link with text "View in System" that links to the announcement detail page
6. THE Email_Notification SHALL include a footer with system name and unsubscribe information if applicable
7. THE Email_Notification SHALL use the Recipient's preferred language if the system supports multilingual content

## Correctness Properties for Property-Based Testing

### Property 1: Announcement Delivery Completeness (Requirement 1)

**Category:** Invariant

**Property:** For any announcement with a given Target_Group, the set of Recipients who receive the announcement must equal the complete set of users with roles matching the Target_Group criteria.

**Test Strategy:**
- Generate random user databases with varying numbers of Staff, Students, Admins, Teachers, Parents
- For each Target_Group (Everyone, Staff, Students), create announcement and capture Recipients
- Verify: Recipients(Staff) = All users with role "staff"
- Verify: Recipients(Students) = All users with role "student"
- Verify: Recipients(Everyone) = All users with role "staff" ∪ All users with role "student"

### Property 2: Target Group Validation (Requirement 2)

**Category:** Error Conditions

**Property:** The system must reject any announcement creation or edit request with Target_Group values outside the allowed set {Everyone, Staff, Students}.

**Test Strategy:**
- Generate random Target_Group values including valid options, invalid strings, null, empty string, and previously valid but now removed options (Teacher, Parent)
- Attempt to create announcements with each generated Target_Group
- Verify: System accepts only "Everyone", "Staff", "Students"
- Verify: System rejects all other values with appropriate error messages

### Property 3: Edit Preservation Invariant (Requirement 3)

**Category:** Invariant

**Property:** Editing an announcement must preserve the original creation timestamp while updating only the specified fields and the last_modified timestamp.

**Test Strategy:**
- Generate random announcements with creation timestamps
- Generate random edit operations (title change, content change, Target_Group change, combinations)
- Apply edits and verify: created_at remains unchanged AND last_modified > created_at AND edited fields are updated AND unedited fields are unchanged

### Property 4: Deletion Completeness (Requirement 4)

**Category:** Invariant

**Property:** After deleting an announcement, the announcement must not be visible to any user, and all associated notifications must be invalidated.

**Test Strategy:**
- Generate random announcements with varying Recipients
- Delete announcements and verify: announcement not in any user's announcement list AND associated notifications are marked invalid or removed
- Verify: Query for announcement by ID returns not found

### Property 5: Self-Notification Exclusion (Requirement 5)

**Category:** Invariant

**Property:** For all announcement creation events, the Creator must never receive a Notification regardless of their role or the Target_Group.

**Test Strategy:**
- Generate random announcements with Creator having different roles (admin, staff, student)
- Generate random Target_Groups (Everyone, Staff, Students)
- Create announcements and capture Notification Recipients
- Verify: Creator ID ∉ Notification Recipients for all cases

### Property 6: Reply Permission Constraint (Requirement 6)

**Category:** Error Conditions

**Property:** Only users who are Recipients of an announcement (based on Target_Group matching their role) can successfully submit Replies to that announcement.

**Test Strategy:**
- Generate random announcements with varying Target_Groups
- Generate random Reply attempts from users with different roles (staff, student, admin, teacher, parent)
- Verify: Reply succeeds if user role matches Target_Group criteria
- Verify: Reply fails with permission error if user role does not match Target_Group criteria
- Verify: Admin cannot reply to any announcement

### Property 7: Email Delivery Uniqueness (Requirement 9)

**Category:** Invariant

**Property:** For each announcement creation, each unique email address must receive at most one Email_Notification, and the Creator's email must receive zero Email_Notifications.

**Test Strategy:**
- Generate random user databases where some users share email addresses
- Generate random announcements with varying Target_Groups
- Create announcements and capture email sending operations
- Verify: Each unique email address appears at most once in send list
- Verify: Creator email address does not appear in send list
- Verify: Count(unique email addresses in send list) ≤ Count(Recipients based on Target_Group)

### Property 8: Email Content Completeness (Requirement 10)

**Category:** Invariant

**Property:** Every Email_Notification must contain all required fields (subject, announcement title, content, date, Creator name, view link) and the subject must correctly include the announcement title.

**Test Strategy:**
- Generate random announcements with varying titles, content lengths, Creator names
- Create announcements and capture generated Email_Notification content
- Verify: Email subject contains announcement title
- Verify: Email body contains all required fields (header with Creator name, content, formatted date, view link)
- Verify: View link is well-formed URL pointing to correct announcement ID

### Property 9: Reply Storage Completeness (Requirement 6)

**Category:** Invariant

**Property:** Every successfully submitted Reply must be stored with all required fields (announcement_id, user_id, user_role, reply_message, timestamp) and must reference a valid existing announcement.

**Test Strategy:**
- Generate random valid and invalid announcement IDs
- Generate random Reply submissions with varying message lengths from eligible users
- Submit Replies and capture stored records
- Verify: Stored Reply contains all required fields
- Verify: announcement_id references an existing announcement
- Verify: Timestamp is set to submission time
- Verify: Attempts to reply to non-existent announcements fail

### Property 10: Reply Management Panel Filtering (Requirement 7)

**Category:** Metamorphic Property

**Property:** Filtering Replies in the Reply_Management_Panel by any criterion must return a subset (or equal set) of the unfiltered Reply list, and the filtered results must satisfy the filter criteria.

**Test Strategy:**
- Generate random Reply datasets with varying announcements, users, roles, timestamps
- Retrieve unfiltered Reply list
- Apply various filters (by announcement, by role, combinations)
- Verify: Count(filtered results) ≤ Count(unfiltered results)
- Verify: All filtered results satisfy the filter criteria
- Verify: No results satisfying the filter criteria are excluded from filtered results

## Testing Guidance

### Integration Tests (Not Property-Based)

The following aspects should be tested with integration tests using 1-3 representative examples rather than property-based testing:

1. **Email Service Integration**: Verify that the Email_Notification system successfully communicates with the email service provider (SMTP, SendGrid, AWS SES, etc.)
2. **Database Transaction Integrity**: Verify that announcement creation, editing, and deletion operations are properly wrapped in transactions
3. **Frontend Component Rendering**: Verify that Edit/Delete buttons render correctly, Reply forms display properly, and the Reply_Management_Panel loads
4. **Authentication and Authorization**: Verify that only Admin users can access edit/delete/reply management features
5. **Notification System Integration**: Verify that in-system notifications appear in user notification feeds
6. **Link Generation**: Verify that email "View in System" links and notification links correctly navigate to announcement detail pages

### Manual Testing Requirements

1. **Cross-browser Email Rendering**: Verify email appearance in Gmail, Outlook, Apple Mail, etc.
2. **Accessibility Compliance**: Verify screen reader compatibility for Reply forms and management panels
3. **User Experience Flow**: Verify that confirmation dialogs, success messages, and error messages provide clear feedback
4. **Performance with Large Datasets**: Verify system performance with 1000+ announcements and 10000+ users
