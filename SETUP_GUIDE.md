# CompassionEdu - Complete Setup Guide

## Features Implemented

✅ **Email/Password Authentication** (Already working)
✅ **Google OAuth Sign In/Sign Up**
✅ **Forgot Password with Email**
✅ **Password Reset Flow**

## Prerequisites

1. Node.js (v16 or higher)
2. PostgreSQL database
3. Gmail account (for sending emails)
4. Google Cloud Project (for OAuth)

## Step 1: Backend Configuration

### 1.1 Install Dependencies (Already Done)

```bash
cd backend
npm install
```

### 1.2 Configure Environment Variables

Create `backend/.env` file with the following:

```env
# Server
NODE_ENV=development
PORT=4000

# Database
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/compassion_edu

# Auth Secrets
JWT_SECRET=your-long-random-secret-key-here
JWT_REFRESH_SECRET=your-long-random-refresh-secret-here
JWT_EXPIRES_IN=24h
REFRESH_TOKEN_EXPIRES_IN=30d

# CORS
ALLOWED_ORIGINS=http://localhost:3000

# Email Configuration (Gmail)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-gmail-app-password
FRONTEND_URL=http://localhost:3000

# Google OAuth
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
BACKEND_URL=http://localhost:4000

# File uploads
UPLOAD_DIR=uploads
MAX_PROFILE_PHOTO_SIZE_MB=10
MAX_CV_SIZE_MB=50
MAX_MEDIA_SIZE_MB=50
```

### 1.3 Run Database Migration

```bash
cd backend
npm run migrate
```

This will create the `password_reset_tokens` table.

## Step 2: Email Setup (Gmail)

### 2.1 Enable 2-Factor Authentication

1. Go to your Google Account settings
2. Navigate to Security
3. Enable 2-Step Verification

### 2.2 Generate App Password

1. Go to https://myaccount.google.com/apppasswords
2. Select "Mail" and your device
3. Click "Generate"
4. Copy the 16-character password
5. Use this password in `SMTP_PASS` in your `.env` file

## Step 3: Google OAuth Setup

### 3.1 Create Google Cloud Project

1. Go to https://console.cloud.google.com/
2. Create a new project (or select existing)
3. Name it "CompassionEdu"

### 3.2 Enable Google+ API

1. Go to "APIs & Services" > "Library"
2. Search for "Google+ API"
3. Click "Enable"

### 3.3 Create OAuth Credentials

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth client ID"
3. Select "Web application"
4. Add authorized redirect URIs:
   - `http://localhost:4000/api/auth/google/callback`
   - `https://yourdomain.com/api/auth/google/callback` (for production)
5. Add authorized JavaScript origins:
   - `http://localhost:3000`
   - `https://yourdomain.com` (for production)
6. Click "Create"
7. Copy the **Client ID** and **Client Secret**
8. Add them to your `backend/.env` file

## Step 4: Frontend Configuration

Create `frontend/.env` file (if it doesn't exist):

```env
REACT_APP_API_URL=http://localhost:4000
```

## Step 5: Testing the Features

### Test 1: Email/Password Login ✅
1. Navigate to http://localhost:3000/login
2. Sign in with existing credentials
3. Should redirect to appropriate dashboard

### Test 2: Forgot Password
1. Navigate to http://localhost:3000/login
2. Click "Forgot Password?"
3. Enter your email
4. Check your email inbox
5. Click the reset link
6. Enter new password
7. Login with new password

### Test 3: Google OAuth
1. Navigate to http://localhost:3000/login
2. Click "Continue with Google"
3. Select your Google account
4. Authorize the app
5. Should redirect to dashboard

## Step 6: Running the Application

### Terminal 1 - Backend
```bash
cd backend
npm run dev
```

### Terminal 2 - Frontend
```bash
cd frontend
npm start
```

Visit: http://localhost:3000

## Troubleshooting

### Email Not Sending

**Problem:** Password reset emails not being sent

**Solutions:**
- Verify SMTP credentials in `.env`
- Make sure you're using Gmail App Password (not regular password)
- Check spam/junk folder
- Verify Gmail account has 2FA enabled

### Google OAuth Fails

**Problem:** "redirect_uri_mismatch" error

**Solutions:**
- Verify redirect URI in Google Console matches exactly: `http://localhost:4000/api/auth/google/callback`
- No trailing slash
- Check authorized JavaScript origins include `http://localhost:3000`

**Problem:** "invalid_client" error

**Solutions:**
- Verify GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in `.env`
- Make sure there are no extra spaces
- Regenerate credentials if needed

### Database Connection Error

**Problem:** "DATABASE_URL environment variable is not set"

**Solutions:**
- Create `.env` file in backend directory
- Copy contents from `.env.example`
- Update DATABASE_URL with your PostgreSQL credentials

## File Structure

```
backend/
├── src/
│   ├── routes/
│   │   └── auth.js           (✅ Updated with password reset & Google OAuth)
│   ├── services/
│   │   ├── authService.js    (✅ Added password reset functions)
│   │   └── emailService.js   (✅ NEW - Email sending service)
│   └── db/
│       └── schema.sql        (✅ Added password_reset_tokens table)

frontend/
├── src/
│   ├── pages/
│   │   ├── LoginPage.jsx            (✅ Updated with Google button & forgot password link)
│   │   ├── ForgotPasswordPage.jsx   (✅ NEW)
│   │   ├── ResetPasswordPage.jsx    (✅ NEW)
│   │   └── AuthCallbackPage.jsx     (✅ NEW - Google OAuth callback handler)
│   └── App.jsx                      (✅ Added new routes)
```

## Security Notes

1. **Never commit `.env` files** - They contain sensitive credentials
2. **Use App Passwords** - Don't use your main Gmail password
3. **Rotate Secrets** - Change JWT secrets in production
4. **HTTPS in Production** - Always use HTTPS for OAuth and password reset
5. **Token Expiration** - Password reset tokens expire in 1 hour

## Production Deployment

When deploying to production:

1. Update all URLs in `.env`:
   - `FRONTEND_URL=https://yourdomain.com`
   - `BACKEND_URL=https://api.yourdomain.com`
   
2. Update Google OAuth:
   - Add production URLs to authorized redirect URIs
   - Add production domain to authorized JavaScript origins

3. Use environment variables on your hosting platform
   - Don't commit `.env` files to version control
   - Set environment variables in hosting dashboard

4. Enable SMTP for production email service
   - Consider using SendGrid, AWS SES, or similar
   - Update SMTP settings accordingly

## Support

If you encounter issues:
1. Check the console for error messages
2. Verify all environment variables are set correctly
3. Ensure PostgreSQL is running
4. Check backend logs for detailed errors

---

**Congratulations!** 🎉 You now have a fully functional authentication system with:
- Email/Password login
- Google OAuth
- Password reset via email
- Professional email templates
