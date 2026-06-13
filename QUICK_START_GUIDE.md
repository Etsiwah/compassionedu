# Announcement Module - Quick Start Guide

## 🎯 Current Status
✅ **10 of 14 tasks complete (71%)**
- Backend implementation: 100% complete
- Frontend implementation: 100% complete
- Testing & deployment: Ready to execute

---

## 🚀 Next Actions (Choose Your Path)

### Path A: Test Locally First (Recommended)

**What you'll do**: Test all new features on your local machine before deploying

**Time**: 30-45 minutes

**Steps**:

1. **Set up Gmail App Password** (5 min):
   - Visit: https://myaccount.google.com/apppasswords
   - Enable 2FA if not already enabled
   - Create app password for "Mail"
   - Copy the 16-character password

2. **Update backend/.env** (1 min):
   ```bash
   # Open: backend/.env
   # Replace this line:
   SMTP_PASS=your-gmail-app-password-here
   
   # With your actual password (remove spaces):
   SMTP_PASS=abcdefghijklmnop
   ```

3. **Test Email Service** (2 min):
   ```bash
   cd backend
   node test-email.js
   ```
   Expected output: "✅ Test email sent successfully"
   Check your email inbox for the test message

4. **Start Development Servers** (2 min):
   
   **Terminal 1 - Backend**:
   ```bash
   cd backend
   npm run dev
   ```
   Wait for: "Server running on http://localhost:4000"
   
   **Terminal 2 - Frontend**:
   ```bash
   cd frontend
   npm run dev
   ```
   Wait for: "Local: http://localhost:3000"

5. **Test New Features** (20-30 min):
   - Open browser: http://localhost:3000
   - Log in as **Admin**
   - Go to **Announcements**
   - Test creating announcement with different target roles
   - Test editing an announcement (click Edit button)
   - Test deleting an announcement (click Delete button)
   - Check your email inbox (emails should arrive)
   
   - Log in as **Staff** user
   - Go to **Announcements**
   - Test submitting a reply (click Reply button)
   
   - Log back as **Admin**
   - Go to **Replies** (new menu item)
   - View all replies submitted

---

### Path B: Deploy to Production Immediately

**What you'll do**: Skip local testing and deploy directly to production

**Time**: 20-30 minutes

**Prerequisites**:
- ⚠️ **Risky**: Skipping local testing means issues found in production
- ✅ Use this if you trust the implementation and want to go live ASAP

**Steps**:

1. **Configure Production Email** (5 min):
   - Get Gmail app password (see Path A, step 1)
   - Log into Render.com dashboard
   - Navigate to `compassionedu-api` service
   - Go to **Environment** tab
   - Add these variables:
     ```
     SMTP_HOST=smtp.gmail.com
     SMTP_PORT=587
     SMTP_SECURE=false
     SMTP_USER=kwesiyakubuetsiwah@gmail.com
     SMTP_PASS=your-gmail-app-password-here
     SMTP_FROM=kwesiyakubuetsiwah@gmail.com
     FRONTEND_URL=https://compassion-project-kappa.vercel.app
     ```
   - Click **Save Changes**

2. **Run Database Migration** (5 min):
   - Log into Supabase dashboard
   - Go to **Database** → **Backups** → Create backup (wait for completion)
   - Go to **SQL Editor**
   - Open: `backend/src/db/migrations/update_announcements_schema.sql`
   - Copy entire contents
   - Paste into SQL Editor
   - Click **Run**
   - Verify no errors

3. **Deploy Code** (10 min):
   
   **Option A: Using Git UI** (if you prefer):
   - Open GitHub Desktop (or your Git client)
   - Stage all changes
   - Commit with message: "feat: announcement improvements"
   - Push to GitHub
   
   **Option B: Using Command Line**:
   ```bash
   git add .
   git commit -m "feat: announcement module improvements"
   git push origin main
   ```
   
   - Backend will auto-deploy on Render (watch logs)
   
   **Deploy Frontend**:
   ```bash
   cd frontend
   npx vercel --prod
   ```
   - Answer **N** to "Set up and deploy?"
   - Answer **Y** to "Link to existing project?"
   - Select your project
   - Answer **Y** to "Deploy?"

4. **Verify Production** (5 min):
   - Visit: https://compassion-project-kappa.vercel.app
   - Log in as admin
   - Check that **Replies** menu item appears
   - Test creating an announcement
   - Check email was sent

---

### Path C: Review Implementation First

**What you'll do**: Understand what was built before testing/deploying

**Time**: 15-20 minutes

**Files to Review**:

1. **Backend Changes**:
   - `backend/src/services/announcementsService.js` - Edit/delete logic
   - `backend/src/services/replyService.js` - Reply handling (NEW)
   - `backend/src/services/emailService.js` - Email notifications
   - `backend/src/routes/announcements.js` - New API endpoints
   - `backend/src/db/migrations/update_announcements_schema.sql` - Database changes

2. **Frontend Changes**:
   - `frontend/src/pages/admin/AnnouncementsSection.jsx` - Edit/delete UI
   - `frontend/src/components/AnnouncementReply.jsx` - Reply component (NEW)
   - `frontend/src/pages/admin/AnnouncementRepliesSection.jsx` - Admin replies panel (NEW)
   - `frontend/src/pages/staff/AnnouncementsSection.jsx` - Staff view (NEW)

3. **Documentation**:
   - `DEPLOYMENT_CHECKLIST.md` - Full deployment guide (NEW)
   - `DEPLOYMENT.md` - Detailed deployment instructions
   - `RENDER_ENV_VARIABLES.md` - Render configuration guide

**After Review**: Choose Path A or Path B

---

## 📋 What's New in This Implementation

### For Admins:
✨ **Edit Announcements**: Click "Edit" button to modify existing announcements
✨ **Delete Announcements**: Click "Delete" button to remove announcements (soft delete)
✨ **View Replies**: New "Replies" menu shows all staff/student replies in one place
✨ **Filter Replies**: Filter by user role (Staff/Student)
✨ **Fixed Target Groups**: Dropdown now shows only Everyone, Staff, Students

### For Staff:
✨ **Reply to Announcements**: Click "Reply" button below each announcement
✨ **Submit Feedback**: Share thoughts/questions with admin team

### For Students:
✨ **Reply to Announcements**: Click "Reply" button below each announcement
✨ **Engage with School**: Communicate with administration

### For Everyone:
✨ **Email Notifications**: Receive emails when new announcements are created
✨ **No Self-Notifications**: Creators don't receive their own announcements
✨ **Better Targeting**: Announcements reach the right audience only

---

## ⚡ Quick Commands Reference

```bash
# Test email locally
cd backend && node test-email.js

# Start backend dev server
cd backend && npm run dev

# Start frontend dev server
cd frontend && npm run dev

# Deploy frontend to production
cd frontend && npx vercel --prod

# Check git status
git status

# Commit and push changes
git add .
git commit -m "feat: announcement improvements"
git push origin main
```

---

## 🆘 Need Help?

### Local Testing Issues
- **Email not sending**: Check SMTP_PASS is correct in backend/.env
- **Backend won't start**: Run `npm install` in backend directory
- **Frontend won't start**: Run `npm install` in frontend directory
- **Can't see new features**: Hard refresh browser (Ctrl+Shift+R)

### Production Deployment Issues
- **Backend deployment failing**: Check Render logs for errors
- **Frontend not updating**: Wait 1-2 minutes for Vercel CDN to update
- **Database errors**: Verify migration ran successfully in Supabase
- **Email not working**: Check Render environment variables are set

### Documentation
- Full deployment guide: `DEPLOYMENT_CHECKLIST.md`
- Environment setup: `RENDER_ENV_VARIABLES.md`
- General deployment: `DEPLOYMENT.md`

---

## 📊 Implementation Checklist

- [x] Database migration created
- [x] Backend services implemented
- [x] API routes updated
- [x] Admin UI updated (edit/delete)
- [x] Reply component created
- [x] Staff/student views updated
- [x] Admin replies panel created
- [x] Email service configured
- [ ] Gmail app password configured
- [ ] Local testing completed
- [ ] Production migration run
- [ ] Production deployment completed
- [ ] Production testing completed

---

**Ready to start?** Choose your path above and follow the steps!

**Recommended**: Start with **Path A** (Test Locally) to ensure everything works before going live.
