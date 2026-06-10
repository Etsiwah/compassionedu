# CompassionEdu - Live Deployment Guide
## Vercel (Frontend) + Render (Backend) + Supabase (Database)

This guide will walk you through deploying CompassionEdu to production using:
- **Vercel** for Frontend (Free tier available)
- **Render** for Backend (Free tier available)
- **Supabase** for PostgreSQL Database (Free tier available)

---

## 🎯 Phase 1: Database Setup (Supabase)

### Step 1.1: Create Supabase Project

1. Go to https://supabase.com
2. Click "Start your project"
3. Sign up/Login with GitHub
4. Click "New Project"
5. Fill in:
   - **Name:** compassionedu
   - **Database Password:** (Create a strong password - SAVE THIS!)
   - **Region:** Choose closest to your users
6. Click "Create new project" (takes ~2 minutes)

### Step 1.2: Get Database Connection String

1. In your Supabase project dashboard
2. Click "Settings" (gear icon) → "Database"
3. Scroll to "Connection string" section
4. Select "URI" tab
5. Copy the connection string (looks like):
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.xxxxx.supabase.co:5432/postgres
   ```
6. **Replace `[YOUR-PASSWORD]` with your actual database password**

### Step 1.3: Run Schema Migration

1. In Supabase dashboard, click "SQL Editor" (left sidebar)
2. Click "New query"
3. Copy and paste your entire `backend/src/db/schema.sql` file content
4. Click "Run" (bottom right)
5. Verify tables created successfully

**Alternative using local tools:**
```bash
# Install PostgreSQL client
# Then run:
psql "postgresql://postgres:[YOUR-PASSWORD]@db.xxxxx.supabase.co:5432/postgres" < backend/src/db/schema.sql
```

---

## 🚀 Phase 2: Backend Deployment (Render)

### Step 2.1: Prepare Backend for Deployment

1. Create `backend/.gitignore` (if not exists):
```gitignore
node_modules/
.env
*.log
uploads/*
!uploads/.gitkeep
```

2. Ensure `backend/package.json` has correct start script:
```json
{
  "scripts": {
    "start": "node src/app.js",
    "dev": "nodemon src/app.js"
  }
}
```

### Step 2.2: Push to GitHub

```bash
cd C:\Users\kwesi\Desktop\compassionedu-main

# Initialize git (if not already done)
git init
git add .
git commit -m "Initial commit with all features"

# Create repo on GitHub first, then:
git remote add origin https://github.com/YOUR_USERNAME/compassionedu.git
git branch -M main
git push -u origin main
```

### Step 2.3: Deploy to Render

1. Go to https://render.com
2. Sign up/Login with GitHub
3. Click "New +" → "Web Service"
4. Connect your GitHub repository
5. Select "compassionedu" repository
6. Configure:
   - **Name:** `compassionedu-api`
   - **Region:** Choose closest to your users
   - **Branch:** `main`
   - **Root Directory:** `backend`
   - **Runtime:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Instance Type:** Free

### Step 2.4: Set Environment Variables on Render

Click "Environment" tab and add these variables:

```env
NODE_ENV=production
PORT=4000

# Database (from Supabase)
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.xxxxx.supabase.co:5432/postgres

# Auth Secrets (generate new ones!)
JWT_SECRET=generate-a-new-64-character-random-string-here
JWT_REFRESH_SECRET=generate-another-64-character-random-string-here
JWT_EXPIRES_IN=24h
REFRESH_TOKEN_EXPIRES_IN=30d

# CORS (will update after deploying frontend)
ALLOWED_ORIGINS=https://your-app.vercel.app

# Email (Gmail)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-gmail-app-password

# URLs (update after deployment)
FRONTEND_URL=https://your-app.vercel.app
BACKEND_URL=https://compassionedu-api.onrender.com

# Google OAuth (will configure later)
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret

# File uploads
UPLOAD_DIR=/opt/render/project/src/uploads
MAX_PROFILE_PHOTO_SIZE_MB=10
MAX_CV_SIZE_MB=50
MAX_MEDIA_SIZE_MB=50
```

**To generate secrets:**
```bash
# Run this in terminal:
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

7. Click "Create Web Service"
8. Wait for deployment (5-10 minutes)
9. Copy your backend URL: `https://compassionedu-api.onrender.com`

---

## 💫 Phase 3: Frontend Deployment (Vercel)

### Step 3.1: Prepare Frontend for Deployment

1. Create `frontend/.env.production`:
```env
REACT_APP_API_URL=https://compassionedu-api.onrender.com
```

2. Update `frontend/package.json` (verify build script):
```json
{
  "scripts": {
    "build": "react-scripts build"
  }
}
```

### Step 3.2: Deploy to Vercel

**Option A: Using Vercel Dashboard (Recommended)**

1. Go to https://vercel.com
2. Sign up/Login with GitHub
3. Click "Add New" → "Project"
4. Import your GitHub repository
5. Configure:
   - **Framework Preset:** Create React App
   - **Root Directory:** `frontend`
   - **Build Command:** `npm run build`
   - **Output Directory:** `build`
   - **Install Command:** `npm install`

6. Add Environment Variables:
   - `REACT_APP_API_URL` = `https://compassionedu-api.onrender.com`

7. Click "Deploy"
8. Wait 2-3 minutes
9. Copy your frontend URL: `https://compassionedu-xyz.vercel.app`

**Option B: Using Vercel CLI**

```bash
npm install -g vercel

cd frontend
vercel

# Follow prompts:
# - Link to existing project? No
# - Project name: compassionedu
# - Which directory? ./
# - Override settings? No
```

---

## 🔐 Phase 4: Configure Google OAuth for Production

### Step 4.1: Update Google Cloud Console

1. Go to https://console.cloud.google.com
2. Select your project
3. Go to "APIs & Services" → "Credentials"
4. Click on your OAuth 2.0 Client ID
5. Add **Authorized JavaScript origins:**
   - `https://your-app.vercel.app` (replace with your actual Vercel URL)
   
6. Add **Authorized redirect URIs:**
   - `https://compassionedu-api.onrender.com/api/auth/google/callback`

7. Click "Save"

### Step 4.2: Update Backend Environment Variables

1. Go to your Render dashboard
2. Select your backend service
3. Go to "Environment" tab
4. Update these variables:
   - `FRONTEND_URL` = `https://your-app.vercel.app`
   - `BACKEND_URL` = `https://compassionedu-api.onrender.com`
   - `ALLOWED_ORIGINS` = `https://your-app.vercel.app`

5. Save (will auto-redeploy)

---

## 📧 Phase 5: Configure Gmail for Production

### Step 5.1: Generate Gmail App Password

1. Go to your Google Account: https://myaccount.google.com
2. Click "Security"
3. Enable "2-Step Verification" (if not already)
4. Go to https://myaccount.google.com/apppasswords
5. Select:
   - **App:** Mail
   - **Device:** Other (Custom name) → "CompassionEdu"
6. Click "Generate"
7. Copy the 16-character password (no spaces)
8. Add to Render environment variables:
   - `SMTP_USER` = your-email@gmail.com
   - `SMTP_PASS` = (the 16-character app password)

---

## ✅ Phase 6: Testing Production Deployment

### Test 1: Frontend Loads
- Visit `https://your-app.vercel.app`
- Landing page should load correctly
- Check browser console for errors

### Test 2: Backend API
- Visit `https://compassionedu-api.onrender.com/api/health`
- Should return `{ "status": "ok" }`

### Test 3: Email/Password Login
1. Go to login page
2. Try logging in with test account
3. Should redirect to dashboard

### Test 4: Forgot Password
1. Click "Forgot Password?"
2. Enter email
3. Check email inbox
4. Click reset link
5. Reset password successfully

### Test 5: Google OAuth
1. Click "Continue with Google"
2. Authorize with Google account
3. Should redirect back and log in

---

## 🔧 Troubleshooting

### Issue: "Failed to fetch" errors

**Cause:** CORS not configured properly

**Solution:**
1. Go to Render dashboard
2. Update `ALLOWED_ORIGINS` to include your Vercel URL exactly
3. Ensure no trailing slashes
4. Redeploy

### Issue: Google OAuth redirect_uri_mismatch

**Cause:** Redirect URI not added to Google Console

**Solution:**
1. Check error message for the actual redirect URI
2. Add it exactly to Google Console
3. Make sure it's `https://` not `http://`

### Issue: Password reset emails not sending

**Cause:** Gmail App Password not configured

**Solution:**
1. Verify 2FA is enabled on Gmail
2. Generate new App Password
3. Update `SMTP_PASS` on Render
4. Ensure no spaces in the password

### Issue: Database connection failed

**Cause:** Incorrect DATABASE_URL or Supabase project paused

**Solution:**
1. Verify connection string is correct
2. Check Supabase project is active
3. Test connection using pgAdmin or psql
4. Supabase free tier may pause after inactivity - just wake it up

### Issue: Build fails on Vercel

**Cause:** Missing dependencies or environment variables

**Solution:**
1. Check build logs on Vercel
2. Ensure `REACT_APP_API_URL` is set
3. Try deploying from a clean branch
4. Clear Vercel cache and redeploy

---

## 📊 Monitoring & Maintenance

### Render (Backend)
- Free tier sleeps after 15 min of inactivity
- First request after sleep takes ~30 seconds
- Upgrade to paid plan ($7/mo) for always-on
- Check logs: Render Dashboard → Your Service → Logs

### Vercel (Frontend)
- Always instant (no sleep)
- Automatic deployments on git push
- Check logs: Vercel Dashboard → Your Project → Deployments

### Supabase (Database)
- Free tier includes:
  - 500 MB database
  - Unlimited API requests
- Pauses after 1 week of inactivity
- Upgrade to Pro ($25/mo) for production apps

---

## 🎨 Custom Domain Setup (Optional)

### Add Custom Domain to Vercel

1. Go to Vercel project settings
2. Click "Domains"
3. Add your domain: `compassionedu.com`
4. Follow DNS configuration instructions
5. Update Google OAuth redirect URIs
6. Update Render CORS settings

### Add Custom Domain to Render

1. Go to Render service settings
2. Click "Custom Domain"
3. Add: `api.compassionedu.com`
4. Configure DNS with provided values
5. Update Vercel environment variable: `REACT_APP_API_URL`

---

## 💰 Cost Breakdown

### Free Tier (Perfect for starting):
- **Supabase:** Free (500 MB database, unlimited requests)
- **Render:** Free (sleeps after 15 min, 750 hours/month)
- **Vercel:** Free (unlimited deployments, 100 GB bandwidth)
- **Total:** $0/month

### Production Tier (Recommended for live app):
- **Supabase Pro:** $25/month (8 GB database, no pause, daily backups)
- **Render Starter:** $7/month (always-on, 512 MB RAM)
- **Vercel Pro:** $20/month (better analytics, more bandwidth)
- **Total:** ~$52/month

---

## 🔄 Continuous Deployment

Once set up, deployments are automatic:

1. **Push to GitHub:**
   ```bash
   git add .
   git commit -m "Update features"
   git push
   ```

2. **Automatic deployments:**
   - Vercel deploys frontend automatically
   - Render deploys backend automatically
   - Check deployment status in each dashboard

---

## 📝 Environment Variables Checklist

### Render (Backend)
- [ ] NODE_ENV
- [ ] PORT
- [ ] DATABASE_URL
- [ ] JWT_SECRET
- [ ] JWT_REFRESH_SECRET
- [ ] ALLOWED_ORIGINS
- [ ] SMTP_USER
- [ ] SMTP_PASS
- [ ] FRONTEND_URL
- [ ] BACKEND_URL
- [ ] GOOGLE_CLIENT_ID
- [ ] GOOGLE_CLIENT_SECRET

### Vercel (Frontend)
- [ ] REACT_APP_API_URL

### Google Cloud Console
- [ ] Authorized JavaScript origins
- [ ] Authorized redirect URIs

---

## 🎉 Success!

Your app is now live at:
- **Frontend:** `https://your-app.vercel.app`
- **Backend:** `https://compassionedu-api.onrender.com`

Share the frontend URL with users to access CompassionEdu!

---

## 📞 Support Resources

- **Vercel Docs:** https://vercel.com/docs
- **Render Docs:** https://render.com/docs
- **Supabase Docs:** https://supabase.com/docs
- **This Project:** Check SETUP_GUIDE.md for local development

**Questions?** Check the troubleshooting section or deployment logs for specific errors.
