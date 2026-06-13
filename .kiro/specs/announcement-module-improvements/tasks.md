# Implementation Plan: Announcement Module Improvements

## Overview

This implementation plan breaks down the announcement module enhancements into 14 sequential tasks covering database migration, backend services (announcements, replies, email), API routes, and frontend components for admin, staff, and student portals. The implementation follows a bottom-up approach: database schema first, then services, API routes, and finally frontend components. Each task includes detailed sub-tasks with requirements traceability.

## Tasks

- [x] 1. Database Schema Migration
  - Create migration file `backend/src/db/migrations/update_announcements_schema.sql`
  - Drop old `target_role` CHECK constraint
  - Add new CHECK constraint with 'everyone', 'staff', 'student' (remove 'teacher', 'parent', 'all')
  - Add columns: `updated_at`, `updated_by`, `deleted_at` for edit/delete tracking
  - Create index on `deleted_at` for soft delete queries
  - Create `announcement_replies` table with proper constraints
  - Add indexes on `announcement_replies` for performance
  - Test migration on development database
  - Verify constraints work correctly (try inserting invalid target_role values)
  - _Requirements: REQ-1 (Fix Targeted Delivery), REQ-2 (Remove Unused Groups)_
  - _Design Reference: Section 1.1, 1.2_

- [x] 2. Update Announcements Service - Core Logic
  - Update `VALID_ROLES` in `backend/src/services/announcementsService.js` to `['everyone', 'staff', 'student']`
  - Fix `getAnnouncementsForUser()` query to check `(target_role = 'everyone' OR target_role = $2)`
  - Add `deleted_at IS NULL` filter to queries
  - Add `updated_at` and creator name to SELECT queries
  - Create new `getRecipients(targetRole, creatorId)` helper function
  - Update `createAnnouncement()` to call `getRecipients()` and exclude creator
  - Update `createAnnouncement()` to accept and use `emailService` parameter
  - Add validation in `createAnnouncement()` for VALID_ROLES
  - _Requirements: REQ-1 (Fix Targeted Delivery), REQ-2 (Remove Unused Groups), REQ-5 (Prevent Self-Notifications)_
  - _Design Reference: Section 2.1.1, 2.1.2, 2.1.3_

- [x] 3. Add Edit and Delete Functions to Announcements Service
  - Create `updateAnnouncement(id, data, updatedBy)` function in `announcementsService.js`
  - Build dynamic UPDATE query based on provided fields (title, content, target_role)
  - Set `updated_at = NOW()` and `updated_by` on updates
  - Validate target_role if provided in update data
  - Return 404 if announcement not found or already deleted
  - Create `deleteAnnouncement(id)` function for soft delete
  - Set `deleted_at = NOW()` instead of hard delete
  - Invalidate related `announcement_reads` records on delete
  - Return 404 if announcement not found or already deleted
  - _Requirements: REQ-3 (Enable Editing), REQ-4 (Enable Deletion)_
  - _Design Reference: Section 2.1.4, 2.1.5_

- [x] 4. Create Reply Service
  - Create new file `backend/src/services/replyService.js`
  - Implement `canReply(announcementId, userId, userRole)` permission check
  - Verify user role matches announcement target_role (everyone = staff OR student)
  - Reject replies from admin users
  - Reject replies to non-existent announcements
  - Implement `createReply(data)` function with validation
  - Validate reply_message is not empty after trimming
  - Insert reply record with all required fields
  - Implement `notifyAdminsOfReply(reply)` to create notifications for all admins
  - Implement `getAllReplies(filters)` with optional filtering by announcement_id and user_role
  - Join with announcements and users tables to get title and user details
  - Limit results to 100 records, ordered by created_at DESC
  - _Requirements: REQ-6 (Reply Submissions), REQ-7 (Reply Management Panel), REQ-8 (Admin Notifications for Replies)_
  - _Design Reference: Section 2.2_

- [x] 5. Create Email Service
  - Install `nodemailer` package: `npm install nodemailer`
  - Create new file `backend/src/services/emailService.js`
  - Configure nodemailer transporter with SMTP settings from environment variables
  - Implement `sendAnnouncementEmails(announcement, recipients)` function
  - Query database to get creator name
  - Build email subject: "New Announcement: [title]"
  - Build HTML email body with header, content, date, view link, footer
  - Generate view link: `${process.env.FRONTEND_URL}/announcements/${id}`
  - Remove duplicate email addresses from recipient list
  - Send emails in batches of 50 to avoid rate limits
  - Use Promise.allSettled to handle individual failures gracefully
  - Log email sending results
  - _Requirements: REQ-9 (Email Notifications), REQ-10 (Email Content Format)_
  - _Design Reference: Section 2.3_

- [x] 6. Update Announcement Routes
  - Update or create `backend/src/routes/announcements.js`
  - Import `replyService` and `emailService`
  - Add PUT `/api/announcements/:id` route (admin only) calling `updateAnnouncement()`
  - Add DELETE `/api/announcements/:id` route (admin only) calling `deleteAnnouncement()`
  - Add POST `/api/announcements/:id/replies` route (staff/student only) calling `createReply()`
  - Add GET `/api/announcements/replies` route (admin only) calling `getAllReplies()`
  - Support query parameters `announcement_id` and `user_role` for filtering replies
  - Update POST `/api/announcements` to pass `emailService` to `createAnnouncement()`
  - Ensure all routes have proper auth and role middleware
  - Register routes in main app if not already registered
  - _Requirements: REQ-3 (Edit), REQ-4 (Delete), REQ-6 (Reply), REQ-7 (View Replies)_
  - _Design Reference: Section 3.1_

- [-] 7. Update Admin Announcements Frontend
  - Update `frontend/src/pages/admin/AnnouncementsSection.jsx`
  - Add state for `showForm`, `editingId`, `deleteConfirm`
  - Update target group dropdown to show only: Everyone, Staff, Students
  - Map 'everyone' to display "Everyone" (handle target_role naming)
  - Add Edit button for each announcement in the list
  - Implement `startEdit(announcement)` to populate form with existing data
  - Update form submit to call PUT API when `editingId` is set
  - Add Delete button for each announcement
  - Implement confirmation dialog with "Are you sure?" message
  - Call DELETE API on confirmation
  - Reload announcements after successful edit or delete
  - Display success/error messages
  - _Requirements: REQ-3 (Edit), REQ-4 (Delete), REQ-2 (Remove Unused Groups)_
  - _Design Reference: Section 4.1_

- [-] 8. Create Reply Component for Staff and Students
  - Create new file `frontend/src/components/AnnouncementReply.jsx`
  - Add state for `showForm`, `message`, `submitting`
  - Display "Reply" button when form is hidden
  - Show form when Reply button is clicked
  - Create textarea for reply message input
  - Implement form submission calling POST `/api/announcements/:id/replies`
  - Show loading state while submitting
  - Display success message on successful submission
  - Clear form and hide it after successful submission
  - Display error message if submission fails
  - Add Cancel button to close form without submitting
  - _Requirements: REQ-6 (Reply Submissions)_
  - _Design Reference: Section 4.2_

- [x] 9. Integrate Reply Component into User Announcement Views
  - Import `AnnouncementReply` component into `frontend/src/pages/staff/StaffAnnouncements.jsx` (or equivalent)
  - Add `<AnnouncementReply announcementId={announcement.id} />` below each announcement
  - Only show reply component for non-admin users
  - Import component into `frontend/src/pages/student/StudentAnnouncements.jsx` (or equivalent)
  - Add reply component to student announcement view
  - Test that reply component appears correctly in both portals
  - _Requirements: REQ-6 (Reply Submissions)_
  - _Design Reference: Section 4.2_

- [x] 10. Create Admin Reply Management Panel
  - Create new file `frontend/src/pages/admin/AnnouncementRepliesSection.jsx`
  - Add state for `replies`, `filter`, `loading`
  - Implement `loadReplies()` function calling GET `/api/announcements/replies`
  - Support filtering by user_role and announcement_id via query parameters
  - Create filter UI with dropdowns for role (All/Staff/Student) and announcement
  - Display replies in a table or card layout
  - Show: announcement title, user name, user role, reply message, timestamp
  - Sort by created_at descending (most recent first)
  - Show "No replies yet" message when replies array is empty
  - Add loading spinner while fetching data
  - Auto-reload when filters change
  - Add this section to admin navigation/menu
  - _Requirements: REQ-7 (Reply Management Panel)_
  - _Design Reference: Section 4.3_

- [x] 11. Add Environment Variables for Email Service
  - Add to `backend/.env` (local development): `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`, `FRONTEND_URL`
  - Update `.env.example` with these new variables
  - Add environment variables to Render.com backend service settings
  - Document email service setup in deployment guide
  - Test email sending in development environment
  - Test email sending in production environment after deployment
  - _Requirements: REQ-9 (Email Notifications)_
  - _Design Reference: Section 2.3_
  - _Note: SMTP_PASS needs real Gmail app password to function_

- [ ] 12. Run Database Migration
  - Test migration script on local development database
  - Verify no existing data is lost
  - Check that existing announcements still load correctly
  - Document rollback procedure in case of issues
  - Create database backup before production migration
  - Execute migration on production database
  - Verify production announcements still work
  - Monitor logs for any migration-related errors
  - _Requirements: All requirements depend on schema changes_
  - _Design Reference: Section 1.1, 1.2_

- [ ] 13. Integration Testing
  - Test announcement creation with target_role='everyone' - verify Staff and Students both receive it
  - Test announcement creation with target_role='staff' - verify only Staff receive it
  - Test announcement creation with target_role='student' - verify only Students receive it
  - Test that announcement creator does not receive notification or email
  - Test editing an announcement - verify changes appear immediately
  - Test deleting an announcement - verify it disappears from all users
  - Test Staff user submitting reply to staff-targeted announcement
  - Test Student user submitting reply to student-targeted announcement
  - Test that Admin cannot submit replies (403 error)
  - Test that users cannot reply to announcements not targeted to them
  - Verify all admins receive notifications when replies are submitted
  - Verify admin can view all replies in management panel
  - Verify filtering replies by role and announcement works
  - Test email sending for all three target groups
  - Verify email content includes all required fields
  - Test that no duplicate emails are sent to same address
  - _Requirements: All requirements_
  - _Design Reference: All sections_

- [ ] 14. Deploy and Verify Production
  - Commit all code changes to git
  - Push to GitHub to trigger backend deployment on Render
  - Deploy frontend to Vercel using `cd frontend && npx vercel --prod`
  - Monitor Render deployment logs for errors
  - Monitor Vercel deployment logs for errors
  - Test announcement creation in production
  - Test targeted delivery in production with real user accounts
  - Test edit and delete in production
  - Test reply submission in production
  - Test reply management panel in production
  - Test email notifications in production
  - Verify email links work and point to production frontend
  - Monitor for any error logs or user reports
  - Document any issues found and create follow-up tasks if needed
  - _Requirements: All requirements_
  - _Design Reference: All sections_

## Notes

- Tasks are ordered to build foundation first (database, services) before user-facing features (frontend)
- Task 1 (Database Migration) must complete before any other tasks can run successfully
- Tasks 2-5 (Backend Services) are independent and can be developed in parallel after Task 1
- Task 6 (API Routes) depends on Tasks 2-5 being complete
- Tasks 7-10 (Frontend) depend on Task 6 being complete
- Task 11 (Environment Variables) should be completed before testing email functionality
- Task 12 (Database Migration in Production) must be done before Task 14 (Production Deployment)
- Task 13 (Integration Testing) should be performed before Task 14 (Production Deployment)
- Each task references specific requirements for traceability
- The implementation preserves existing functionality while adding new features
- All new routes include proper authentication and role-based access control
- Soft deletes are used for announcements to preserve audit history

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1"] },
    { "id": 1, "tasks": ["2", "3", "4", "5"] },
    { "id": 2, "tasks": ["6"] },
    { "id": 3, "tasks": ["7", "8", "10", "11"] },
    { "id": 4, "tasks": ["9"] },
    { "id": 5, "tasks": ["12"] },
    { "id": 6, "tasks": ["13"] },
    { "id": 7, "tasks": ["14"] }
  ]
}
```
