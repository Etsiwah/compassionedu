# 🚀 CompassionEdu - Production Testing Guide

## 📋 Deployment Status

### Your URLs:
- **Frontend (Vercel)**: https://compassion-project-kappa.vercel.app/
- **Backend (Render)**: https://compassionedu-api.onrender.com
- **Database (Supabase)**: Project ID: pbpyptpzhmsjlzlyhoxr

---

## ⚠️ CURRENT ISSUES DETECTED

### 1. Frontend (404 Error)
**Status**: ❌ Not accessible
**Error**: HTTP 404 - Not Found

**Possible Causes**:
- Deployment hasn't completed
- Build failed on Vercel
- Incorrect routing configuration

**How to Fix**:
1. Go to Vercel Dashboard: https://vercel.com/dashboard
2. Find your `compassion-project-kappa` project
3. Check the latest deployment status
4. If it failed, check the build logs
5. If successful, verify the domain is correctly configured

### 2. Backend (503 Error)
**Status**: ⚠️ Service unavailable (likely sleeping)
**Error**: HTTP 503 - Service Unavailable

**Possible Causes**:
- Render free tier has spun down (normal after 15 min inactivity)
- Deployment still in progress
- Service crashed

**How to Fix**:
1. Go to Render Dashboard: https://dashboard.render.com/
2. Find your backend service
3. Check if it's "Active" or "Sleeping"
4. If sleeping, it will wake up on first request (30-60 seconds)
5. Check deployment logs for errors

---

## ✅ PRE-TESTING CHECKLIST

Before your friend tests the app, verify these configurations:

### 🔧 Backend Configuration (Render)

Go to: Render Dashboard → Your Service → Environment

**Required Environment Variables**:

```env
NODE_ENV=production
PORT=4000
DATABASE_URL=postgresql://postgres.pbpyptpzhmsjlzlyhoxr:GxiQSTY3AIl5aAs6@aws-0-eu-west-1.pooler.supabase.com:5432/postgres

JWT_SECRET=dev-jwt-secret-change-in-production-12345678
JWT_REFRESH_SECRET=dev-refresh-secret-change-in-production-87654321
JWT_EXPIRES_IN=24h
REFRESH_TOKEN_EXPIRES_IN=30d

ALLOWED_ORIGINS=https://compassion-project-kappa.vercel.app
FRONTEND_URL=https://compassion-project-kappa.vercel.app
BACKEND_URL=https://compassionedu-api.onrender.com

GOOGLE_CLIENT_ID=425237110717-8rhl0o4585rqulf4n84n5pvod6phubbu.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=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

UPLOAD_DIR=/opt/render/project/src/uploads
MAX_PROFILE_PHOTO_SIZE_MB=10
MAX_CV_SIZE_MB=50
MAX_MEDIA_SIZE_MB=50

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=kwesiyakubuetsiwah@gmail.com
SMTP_PASS=your-gmail-app-password-here
```

### 🎨 Frontend Configuration (Vercel)

Go to: Vercel Dashboard → Your Project → Settings → Environment Variables

**Required Environment Variables**:

```env
REACT_APP_API_URL=https://compassionedu-api.onrender.com/api
REACT_APP_SHOW_DEV_ACCOUNTS=false
```

**Important**: After adding/changing environment variables on Vercel, you MUST **redeploy** for changes to take effect!

### 🔐 Google OAuth Configuration

Go to: https://console.cloud.google.com → Credentials

**Update Authorized Redirect URIs**:
- Add: `https://compassionedu-api.onrender.com/api/auth/google/callback`

**Update Authorized JavaScript Origins**:
- Add: `https://compassion-project-kappa.vercel.app`

---

## 🧪 TESTING PROCEDURES

### Test 1: Backend Health Check

**Open in browser**: https://compassionedu-api.onrender.com

**Expected Result**: 
```json
{"message":"CompassionEdu API is running","version":"1.0.0"}
```

**If it takes 30-60 seconds**: Normal for Render free tier (waking up from sleep)

**If it fails**: Check Render logs for errors

---

### Test 2: Frontend Access

**Open in browser**: https://compassion-project-kappa.vercel.app/

**Expected Result**: 
- Landing page loads with CompassionEdu branding
- Login button visible
- Navigation works

**If 404 error**: 
1. Check Vercel deployment status
2. Verify build completed successfully
3. Check if SPA routing is configured correctly

---

### Test 3: Student Registration (Your Friend's Phone)

**Steps**:
1. Open: https://compassion-project-kappa.vercel.app/
2. Click "Sign In" or "Get Started"
3. Click "Sign Up" tab
4. Fill in registration form:
   - First Name: Test
   - Middle Name: User (optional)
   - Last Name: Student
   - Email: test.student@example.com
   - Role: Student 🎒
   - Password: Test@123
   - Confirm Password: Test@123
5. Click "Create Account"

**Expected Result**:
- ✅ Account created successfully
- ✅ Automatically logged in
- ✅ Redirected to Student Dashboard (`/student`)
- ✅ User data visible in Supabase

**Check in Supabase**:
1. Go to: https://supabase.com/dashboard/project/pbpyptpzhmsjlzlyhoxr
2. Click "Table Editor" → "users"
3. Verify new user record exists

---

### Test 4: Staff Registration

**Steps**:
1. Use signup form
2. Select Role: Staff 🏫
3. Use different email: test.staff@example.com
4. Complete registration

**Expected Result**:
- ✅ Account created successfully
- ✅ Redirected to Staff Dashboard (`/staff`)

---

### Test 5: Login Test

**Steps**:
1. Logout from current session
2. Click "Sign In"
3. Enter credentials from Test 3 or 4
4. Click "Sign In"

**Expected Result**:
- ✅ Login successful
- ✅ Session persists
- ✅ Redirected to correct dashboard

---

### Test 6: Admin Account Verification

**Admin Credentials**:
- Email: admin@compassionedu.com
- Password: Admin@123

**Steps**:
1. Logout if logged in
2. Login with admin credentials
3. Verify dashboard access

**Expected Result**:
- ✅ Admin can login
- ✅ Admin dashboard loads
- ✅ Can view student and staff records

---

### Test 7: Google OAuth (Optional)

**Steps**:
1. Click "Continue with Google"
2. Select Google account
3. Authorize the app

**Expected Result**:
- ✅ OAuth succeeds
- ✅ Account created or logged in
- ✅ Redirected to dashboard

**If it fails**:
- Verify Google OAuth redirect URIs are updated with production URLs

---

### Test 8: Mobile Testing

**Test on**:
- 📱 iPhone Safari
- 📱 Android Chrome
- 📱 Mobile Firefox

**Verify**:
- ✅ Responsive layout
- ✅ Touch interactions work
- ✅ Forms are usable
- ✅ Navigation works
- ✅ Registration succeeds
- ✅ Login succeeds

---

### Test 9: Error Handling

**Test invalid credentials**:
- Email: wrong@example.com
- Password: WrongPass123

**Expected**: Error message displayed

**Test duplicate registration**:
- Try registering with same email twice

**Expected**: "Account already exists" error

---

## 📊 TEST REPORT TEMPLATE

Copy this and fill it out after testing:

```
## CompassionEdu Production Test Report
Date: [DATE]
Tester: [NAME]
Device: [DEVICE / BROWSER]

### Backend Status
- [ ] Backend accessible
- [ ] Health endpoint responds
- [ ] Response time acceptable

### Frontend Status
- [ ] Landing page loads
- [ ] Navigation works
- [ ] Responsive on mobile
- [ ] No console errors

### Authentication Tests
- [ ] Student registration works
- [ ] Staff registration works
- [ ] Login works
- [ ] Logout works
- [ ] Session persists
- [ ] Google OAuth works (optional)

### Dashboard Tests
- [ ] Student dashboard loads
- [ ] Staff dashboard loads
- [ ] Admin dashboard loads
- [ ] Profile data displays
- [ ] Navigation between sections works

### Database Tests
- [ ] User records saved in Supabase
- [ ] Data persists after logout/login
- [ ] No duplicate records created

### Error Handling
- [ ] Invalid login shows error
- [ ] Duplicate registration blocked
- [ ] Error messages are clear

### Issues Found
1. [List any issues]
2. 
3. 

### Recommended Fixes
1. [List recommended fixes]
2. 
3. 

### Overall Status
- [ ] ✅ PASS - Ready for use
- [ ] ⚠️ PARTIAL - Works with minor issues
- [ ] ❌ FAIL - Major issues blocking use
```

---

## 🔧 TROUBLESHOOTING COMMON ISSUES

### Issue: "Cannot reach the server"
**Solution**: 
- Wait 30-60 seconds (Render free tier waking up)
- Check Render service is "Active"
- Verify CORS settings include your Vercel URL

### Issue: "404 Not Found" on frontend
**Solution**:
- Verify Vercel deployment succeeded
- Check build logs for errors
- Ensure SPA routing is enabled in Vercel

### Issue: "Invalid email or password" for demo accounts
**Solution**:
- Run seed script on production database
- Or manually insert demo users via Supabase SQL Editor

### Issue: Google OAuth redirects to localhost
**Solution**:
- Update Google Cloud Console redirect URIs
- Ensure FRONTEND_URL and BACKEND_URL use production URLs
- Redeploy backend after changes

### Issue: Session doesn't persist
**Solution**:
- Check localStorage is enabled in browser
- Verify JWT tokens are being set
- Check browser console for errors

---

## 🎯 NEXT STEPS

1. ✅ Fix frontend 404 error on Vercel
2. ✅ Wake up backend on Render (wait 60s or trigger request)
3. ✅ Verify environment variables are set correctly
4. ✅ Update Google OAuth URLs
5. ✅ Run demo account seed if needed
6. ✅ Test complete signup flow yourself first
7. ✅ Share URL with friend for external testing
8. ✅ Fill out test report
9. ✅ Fix any issues found
10. ✅ Celebrate successful deployment! 🎉

---

## 📞 SUPPORT

If you encounter issues:
1. Check Render logs: Dashboard → Service → Logs
2. Check Vercel logs: Dashboard → Project → Deployments → View Function Logs
3. Check Supabase logs: Dashboard → Logs
4. Check browser console for frontend errors (F12)

---

**Good luck with testing!** 🚀
