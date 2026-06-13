# Announcement Module Improvements - Deployment Checklist

## Overview
This checklist guides you through the final deployment steps for the announcement module improvements. Tasks 1-10 are complete (backend + frontend). Tasks 11-14 remain.

---

## ✅ Task 11: Configure Environment Variables

### Local Development (.env)

**Status**: ⚠️ SMTP_PASS needs real Gmail app password

**Action Required**:
1. **Generate Gmail App Password**:
   - Go to your Google Account: https://myaccount.google.com/
   - Enable 2-Factor Authentication if not already enabled
   - Navigate to: https://myaccount.google.com/apppasswords
   - Create a new app password for "Mail"
   - Copy the 16-character password (remove spaces)

2. **Update backend/.env**:
   ```bash
   # Replace this line:
   SMTP_PASS=your-gmail-app-password-here
   
   # With your actual app password:
   SMTP_PASS=abcd efgh ijkl mnop  # (no spaces in actual use)
   ```

3. **Test Email Locally**:
   ```bash
   cd backend
   node test-email.js
   ```
   This should send a test email to verify SMTP configuration works.

### Production Environment (Render.com)

**Action Required**:
1. Log into Render.com dashboard
2. Navigate to your backend service: `compassionedu-api`
3. Go to **Environment** tab
4. Add/Update these environment variables:

```bash
# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=kwesiyakubuetsiwah@gmail.com
SMTP_PASS=your-gmail-app-password-here
SMTP_FROM=kwesiyakubuetsiwah@gmail.com

# Frontend URL (for email links)
FRONTEND_URL=https://compassion-project-kappa.vercel.app
```

5. Click **Save Changes** (this will trigger a redeploy)

**Reference**: See `RENDER_ENV_VARIABLES.md` for detailed Render setup guide

---

## ✅ Task 12: Run Database Migration

### Backup Production Database First! 🔴

**Before running migration**:
1. Log into Supabase dashboard
2. Navigate to your project: https://supabase.com/dashboard/project/_
3. Go to **Database** → **Backups**
4. Create a manual backup
5. Wait for backup to complete

### Run Migration on Production

**Migration File**: `backend/src/db/migrations/update_announcements_schema.sql`

**Option A: Via Supabase SQL Editor** (Recommended):
1. Log into Supabase dashboard
2. Go to **SQL Editor**
3. Create new query
4. Copy entire contents of `backend/src/db/migrations/update_announcements_schema.sql`
5. Paste into SQL Editor
6. Click **Run** button
7. Verify success (no errors in output)

**Option B: Via psql Command Line**:
```bash
# Get connection string from Supabase (Direct Connection mode)
psql "postgresql://postgres.pbpyptpzhmsjlzlyhoxr:GxiQSTY3AIl5aAs6@aws-0-eu-west-1.pooler.supabase.com:5432/postgres" -f backend/src/db/migrations/update_announcements_schema.sql
```

### Verify Migration Success

Run these queries in Supabase SQL Editor to verify:

```sql
-- Check announcements table has new columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'announcements' 
  AND column_name IN ('updated_at', 'updated_by', 'deleted_at');

-- Check announcement_replies table exists
SELECT table_name 
FROM information_schema.tables 
WHERE table_name = 'announcement_replies';

-- Check target_role constraint updated
SELECT constraint_name, check_clause
FROM information_schema.check_constraints
WHERE constraint_name LIKE '%target_role%';
```

Expected results:
- 3 rows for updated_at, updated_by, deleted_at columns
- 1 row showing announcement_replies table exists
- Check constraint allows: 'everyone', 'staff', 'student'

---

## ✅ Task 13: Integration Testing

### Test Scenarios Checklist

#### 1. Announcement Creation & Targeting
- [ ] Create announcement with target_role='everyone'
  - Verify both Staff and Student users can see it
  - Verify creator does NOT receive notification
- [ ] Create announcement with target_role='staff'
  - Verify only Staff users can see it
  - Verify Students cannot see it
- [ ] Create announcement with target_role='student'
  - Verify only Students can see it
  - Verify Staff cannot see it

#### 2. Edit & Delete Functionality
- [ ] Edit an announcement (admin only)
  - Change title, content, or target_role
  - Verify changes appear immediately for all users
  - Verify updated_at timestamp is set
- [ ] Delete an announcement (admin only)
  - Verify soft delete (deleted_at is set)
  - Verify announcement disappears from all user views
  - Verify announcement_reads records are invalidated

#### 3. Reply Submissions
- [ ] Staff user submits reply to staff-targeted announcement
  - Verify reply is saved
  - Verify all admins receive notification
- [ ] Student user submits reply to student-targeted announcement
  - Verify reply is saved
  - Verify all admins receive notification
- [ ] Test reply to 'everyone' announcement
  - Staff can reply
  - Student can reply
- [ ] Admin attempts to submit reply
  - Verify 403 Forbidden error
- [ ] User attempts to reply to announcement not targeted to them
  - Verify permission denied

#### 4. Admin Reply Management Panel
- [ ] Access /admin/replies page
- [ ] View all replies (no filters)
- [ ] Filter by role (Staff/Student)
- [ ] Verify reply details display:
  - Announcement title
  - User name, email, role
  - Reply message
  - Timestamp

#### 5. Email Notifications
- [ ] Create announcement with target_role='everyone'
  - Check Gmail inbox for staff/student test accounts
  - Verify email received
  - Verify email content format (title, content, date, link)
- [ ] Create announcement with target_role='staff'
  - Verify only staff users receive email
- [ ] Create announcement with target_role='student'
  - Verify only student users receive email
- [ ] Verify no duplicate emails sent
- [ ] Verify creator does NOT receive email
- [ ] Click "View Announcement" link in email
  - Verify link works and points to correct URL

### How to Test

1. **Start Local Development**:
   ```bash
   # Terminal 1 - Backend
   cd backend
   npm run dev
   
   # Terminal 2 - Frontend
   cd frontend
   npm run dev
   ```

2. **Create Test Accounts**:
   - Admin user
   - Staff user (at least 1)
   - Student user (at least 1)

3. **Run Through Test Scenarios**:
   - Use different browser profiles or incognito windows for different roles
   - Test each scenario and check off the boxes above

4. **Check Email**:
   - Monitor Gmail inbox for test accounts
   - Verify email delivery and content

---

## ✅ Task 14: Deploy to Production

### Pre-Deployment Checklist
- [ ] All tests from Task 13 pass locally
- [ ] SMTP_PASS configured with real Gmail app password
- [ ] Database migration run on production
- [ ] Environment variables configured on Render.com
- [ ] All code changes committed to git

### Deployment Steps

#### 1. Commit All Changes
```bash
# Check status
git status

# Stage all changes
git add .

# Commit with descriptive message
git commit -m "feat: announcement module improvements - edit, delete, replies, email notifications"

# Push to GitHub
git push origin main
```

**Note**: Pushing to GitHub will automatically trigger Render.com backend deployment.

#### 2. Monitor Backend Deployment
1. Go to Render.com dashboard: https://dashboard.render.com/
2. Navigate to `compassionedu-api` service
3. Go to **Logs** tab
4. Watch for:
   - "Build succeeded"
   - "Deploy live"
   - No error messages in logs

#### 3. Deploy Frontend to Vercel
```bash
cd frontend
npx vercel --prod
```

When prompted:
- "Set up and deploy?" → **N** (no)
- "Which scope?" → Select your account
- "Link to existing project?" → **Y** (yes)
- Select: `compassion-project` (or your project name)
- "Deploy?" → **Y** (yes)

#### 4. Verify Deployment

**Backend Health Check**:
```bash
# Test API is responding
curl https://compassionedu-api.onrender.com/health
```

**Frontend Check**:
- Visit: https://compassion-project-kappa.vercel.app
- Log in as admin
- Navigate to Announcements section
- Verify UI updates are visible

#### 5. Production Testing

Run through critical scenarios in production:

1. **Create Announcement**:
   - Log in as admin
   - Create announcement with target_role='everyone'
   - Verify email sent
   - Check email inbox for recipients

2. **Edit Announcement**:
   - Edit the announcement you just created
   - Verify changes saved

3. **Submit Reply**:
   - Log in as staff or student
   - Submit reply to announcement
   - Log in as admin
   - Check /admin/replies to see the reply

4. **Delete Announcement**:
   - Log in as admin
   - Delete an announcement
   - Verify it disappears from all views

### Post-Deployment Monitoring

**Monitor for 24-48 hours**:
1. **Check Render Logs** for errors:
   - https://dashboard.render.com/ → compassionedu-api → Logs

2. **Check Vercel Logs** for frontend errors:
   - https://vercel.com/dashboard → compassion-project → Logs

3. **Monitor Email Delivery**:
   - Check if emails are being sent successfully
   - Look for bounce notifications in Gmail

4. **User Feedback**:
   - Ask users to test announcements
   - Collect feedback on new features

---

## Rollback Plan (If Issues Occur)

### If Migration Causes Issues:
1. Restore Supabase backup from before migration
2. Wait for restore to complete
3. Investigate migration errors

### If Email Service Fails:
1. Check SMTP_PASS is correct in Render environment variables
2. Check Gmail account hasn't blocked app password
3. Review backend logs for SMTP errors
4. Email functionality failure doesn't break other features

### If Frontend Issues:
1. Revert to previous Vercel deployment:
   - Go to Vercel dashboard
   - Navigate to Deployments
   - Find previous working deployment
   - Click "Promote to Production"

### If Backend Issues:
1. Revert git commit:
   ```bash
   git revert HEAD
   git push origin main
   ```
2. Render will auto-deploy the reverted version

---

## Success Criteria

✅ Deployment is successful when:
- [ ] Database migration completed without errors
- [ ] Backend deployed and responding (health check passes)
- [ ] Frontend deployed and UI loads
- [ ] Announcements can be created with new target roles
- [ ] Announcements can be edited and deleted
- [ ] Replies can be submitted by staff/students
- [ ] Admin can view replies in management panel
- [ ] Email notifications are sent (if SMTP configured)
- [ ] No errors in production logs
- [ ] All users can access their respective portals

---

## Troubleshooting

### Email Not Sending
**Symptoms**: Announcements created but no emails received

**Checks**:
1. Verify SMTP_PASS is correct in Render environment variables
2. Check backend logs for email errors: `SMTP error`, `Authentication failed`
3. Verify Gmail hasn't revoked app password
4. Test locally with `node backend/test-email.js`

**Fix**:
- Regenerate Gmail app password
- Update SMTP_PASS in Render
- Restart backend service

### Migration Errors
**Symptoms**: Database errors, constraints violations

**Checks**:
1. Review Supabase logs
2. Check if migration was partially applied

**Fix**:
- Restore backup
- Review migration SQL for syntax errors
- Apply migration fixes manually

### 404 on New Routes
**Symptoms**: `/admin/replies` returns 404

**Checks**:
1. Verify frontend deployed successfully
2. Check browser console for errors
3. Clear browser cache

**Fix**:
- Redeploy frontend
- Hard refresh browser (Ctrl+Shift+R)

---

## Files Modified in This Implementation

### Backend Files
- `backend/src/db/migrations/update_announcements_schema.sql` (NEW)
- `backend/src/services/announcementsService.js` (UPDATED)
- `backend/src/services/replyService.js` (NEW)
- `backend/src/services/emailService.js` (UPDATED)
- `backend/src/routes/announcements.js` (UPDATED)
- `backend/.env` (UPDATED)
- `backend/.env.example` (UPDATED)
- `backend/test-email.js` (NEW)
- `backend/test-announcement-migration.js` (NEW)

### Frontend Files
- `frontend/src/pages/admin/AnnouncementsSection.jsx` (UPDATED)
- `frontend/src/pages/admin/AnnouncementRepliesSection.jsx` (NEW)
- `frontend/src/pages/AdminDashboard.jsx` (UPDATED)
- `frontend/src/components/AnnouncementReply.jsx` (NEW)
- `frontend/src/pages/staff/AnnouncementsSection.jsx` (NEW)
- `frontend/src/pages/StaffDashboard.jsx` (UPDATED)
- `frontend/src/pages/student/AnnouncementsSection.jsx` (UPDATED)

### Documentation Files
- `DEPLOYMENT.md` (NEW)
- `RENDER_ENV_VARIABLES.md` (NEW)
- `TASK_11_SUMMARY.md` (NEW)
- `DEPLOYMENT_CHECKLIST.md` (NEW - this file)
- `backend/MIGRATION_TEST_RESULTS.md` (NEW)

---

## Support & Resources

- **Render Dashboard**: https://dashboard.render.com/
- **Vercel Dashboard**: https://vercel.com/dashboard
- **Supabase Dashboard**: https://supabase.com/dashboard
- **Gmail App Passwords**: https://myaccount.google.com/apppasswords
- **Deployment Guide**: See `DEPLOYMENT.md`
- **Render Setup Guide**: See `RENDER_ENV_VARIABLES.md`

---

**Last Updated**: 2025-01-XX
**Implementation Status**: Tasks 1-10 Complete, Tasks 11-14 Ready for Execution
