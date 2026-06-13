# Render.com Environment Variables Configuration

## Quick Setup Checklist

This document provides a complete list of environment variables to configure in Render.com for the CompassionEdu backend service.

---

## Backend Service Environment Variables

Copy and paste these into your Render.com Web Service → Environment tab:

### Required Variables

| Variable Name | Value | Notes |
|--------------|-------|-------|
| `NODE_ENV` | `production` | Set environment to production |
| `DATABASE_URL` | `<your-postgres-url>` | Full PostgreSQL connection string |
| `JWT_SECRET` | `<generate-random-64-char-hex>` | Generate using crypto.randomBytes(64).toString('hex') |
| `JWT_REFRESH_SECRET` | `<generate-random-64-char-hex>` | Different from JWT_SECRET |
| `ALLOWED_ORIGINS` | `https://your-app.onrender.com` | Your frontend URL (update after frontend deployment) |
| `FRONTEND_URL` | `https://your-app.onrender.com` | Your frontend URL (update after frontend deployment) |
| `BACKEND_URL` | `https://your-api.onrender.com` | Your backend URL (from Render) |

### Email Service Variables (Required for Announcements)

| Variable Name | Value | Notes |
|--------------|-------|-------|
| `SMTP_HOST` | `smtp.gmail.com` | Gmail SMTP server (or your provider) |
| `SMTP_PORT` | `587` | Standard SMTP port with STARTTLS |
| `SMTP_SECURE` | `false` | Use STARTTLS instead of SSL |
| `SMTP_USER` | `your-email@gmail.com` | Your Gmail address |
| `SMTP_PASS` | `<gmail-app-password>` | 16-character app password from Google |
| `SMTP_FROM` | `noreply@compassionedu.com` | From address for emails |

**⚠️ Important**: For Gmail, you must:
1. Enable 2-Factor Authentication on your Google account
2. Generate an App Password at https://myaccount.google.com/apppasswords
3. Use the 16-character app password (not your regular password)

### Authentication Variables (Optional)

| Variable Name | Value | Notes |
|--------------|-------|-------|
| `JWT_EXPIRES_IN` | `24h` | Access token lifetime (optional, defaults to 24h) |
| `REFRESH_TOKEN_EXPIRES_IN` | `30d` | Refresh token lifetime (optional, defaults to 30d) |

### File Upload Variables (Optional)

| Variable Name | Value | Notes |
|--------------|-------|-------|
| `UPLOAD_DIR` | `uploads` | Directory for uploaded files (optional) |
| `MAX_PROFILE_PHOTO_SIZE_MB` | `10` | Max profile photo size in MB (optional) |
| `MAX_CV_SIZE_MB` | `50` | Max CV file size in MB (optional) |
| `MAX_MEDIA_SIZE_MB` | `50` | Max media file size in MB (optional) |

### Google OAuth Variables (Optional)

| Variable Name | Value | Notes |
|--------------|-------|-------|
| `GOOGLE_CLIENT_ID` | `<your-client-id>.apps.googleusercontent.com` | From Google Cloud Console (optional) |
| `GOOGLE_CLIENT_SECRET` | `<your-client-secret>` | From Google Cloud Console (optional) |

---

## Setup Instructions

### Step 1: Generate Security Secrets

Run these commands locally to generate secure random strings:

```bash
# Generate JWT_SECRET
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Generate JWT_REFRESH_SECRET
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Copy the output values for use in Render environment variables.

### Step 2: Configure Gmail SMTP

1. **Enable 2FA on Gmail**
   - Go to: https://myaccount.google.com/security
   - Click "2-Step Verification"
   - Follow setup instructions

2. **Generate App Password**
   - Go to: https://myaccount.google.com/apppasswords
   - Select "Mail" and device type "Other"
   - Name it "CompassionEdu Render"
   - Copy the 16-character password (no spaces)

3. **Add to Render**
   - Use the app password for `SMTP_PASS`
   - Use your Gmail address for `SMTP_USER`
   - Use a professional from-address for `SMTP_FROM` (e.g., noreply@compassionedu.com)

### Step 3: Add Variables to Render

1. Go to your Render.com dashboard
2. Select your backend web service
3. Click "Environment" in the left sidebar
4. Click "Add Environment Variable"
5. Add each variable from the tables above
6. Click "Save Changes"
7. Render will automatically redeploy with new variables

### Step 4: Update Frontend URL

After deploying your frontend:

1. Copy your frontend URL from Render (e.g., `https://compassionedu.onrender.com`)
2. Update these backend environment variables:
   - `ALLOWED_ORIGINS` → your frontend URL
   - `FRONTEND_URL` → your frontend URL
3. Save changes (triggers automatic redeployment)

---

## Alternative Email Providers

### SendGrid (Recommended for Production)

If using SendGrid instead of Gmail:

| Variable Name | Value |
|--------------|-------|
| `SENDGRID_API_KEY` | `<your-sendgrid-api-key>` |
| `SMTP_FROM` | `noreply@compassionedu.com` |
| `FRONTEND_URL` | `https://your-app.onrender.com` |

**Note**: Requires code changes in `backend/src/services/emailService.js` to use SendGrid SDK.

### AWS SES

If using AWS SES:

| Variable Name | Value |
|--------------|-------|
| `AWS_ACCESS_KEY_ID` | `<your-aws-access-key>` |
| `AWS_SECRET_ACCESS_KEY` | `<your-aws-secret-key>` |
| `AWS_REGION` | `us-east-1` |
| `SMTP_FROM` | `noreply@compassionedu.com` |
| `FRONTEND_URL` | `https://your-app.onrender.com` |

**Note**: Requires code changes and AWS SDK installation.

---

## Verification

After adding all environment variables:

### 1. Check Deployment Logs

1. Go to Render dashboard → your service → Logs
2. Look for successful startup messages:
   ```
   Server running on port 4000
   Database connected
   ```

### 2. Test API Endpoint

```bash
curl https://your-backend.onrender.com/health
```

Expected response: `200 OK`

### 3. Test Email Sending

1. Log in as admin
2. Create a test announcement
3. Check if email is sent (check logs for "Sent announcement emails to X recipients")
4. Verify email received in recipient inbox

### 4. Check for Errors

Common error messages in logs:

| Error | Cause | Fix |
|-------|-------|-----|
| `JWT_SECRET is not defined` | Missing JWT_SECRET | Add JWT_SECRET to environment |
| `Invalid login: 535` | Wrong SMTP credentials | Verify SMTP_USER and SMTP_PASS |
| `getaddrinfo ENOTFOUND` | Wrong SMTP_HOST | Check SMTP_HOST spelling |
| `CORS error` | Wrong ALLOWED_ORIGINS | Add frontend URL to ALLOWED_ORIGINS |

---

## Security Best Practices

✅ **DO:**
- Use different JWT secrets for production vs development
- Generate long random strings for secrets (64+ characters)
- Use Gmail app passwords, never regular account passwords
- Restrict ALLOWED_ORIGINS to your actual frontend domain
- Regularly rotate secrets (every 90 days recommended)

❌ **DON'T:**
- Never commit .env files to Git
- Never share SMTP passwords or API keys publicly
- Don't use default or example values in production
- Don't use the same secret for JWT_SECRET and JWT_REFRESH_SECRET

---

## Email Provider Limits

### Gmail SMTP
- **Free Limit**: 500 emails/day
- **Rate Limit**: ~100-150 emails/hour
- **Best For**: Testing and small deployments (<100 users)

### SendGrid
- **Free Tier**: 100 emails/day
- **Essentials**: 40k emails/month ($19.95/mo)
- **Pro**: 100k emails/month ($89.95/mo)
- **Best For**: Production deployments

### AWS SES
- **Pricing**: $0.10 per 1,000 emails
- **Free Tier**: 62,000 emails/month (first 12 months)
- **Best For**: Large-scale deployments (>10k users)

Choose the provider based on your expected announcement volume.

---

## Troubleshooting

### "Application failed to start"

1. Check Render logs for specific error
2. Verify DATABASE_URL is correct
3. Ensure JWT_SECRET and JWT_REFRESH_SECRET are set

### "Authentication failed" (SMTP)

1. Verify you're using Gmail app password, not account password
2. Check 2FA is enabled on Gmail account
3. Regenerate app password if needed

### "CORS policy error"

1. Add frontend URL to ALLOWED_ORIGINS
2. Remove trailing slashes from URLs
3. Ensure protocol is included (https://)

### Emails not sending

1. Check Render logs for email-related errors
2. Verify all SMTP_* variables are set
3. Test SMTP credentials locally first
4. Check Gmail daily limit not exceeded (500/day)

---

## Getting Help

- **Render Support**: https://render.com/docs
- **Gmail SMTP Guide**: https://support.google.com/mail/answer/7126229
- **Nodemailer Docs**: https://nodemailer.com/
- **Project Issues**: Create an issue in the GitHub repository

---

## Example Configuration

Here's a complete example (with placeholder values):

```bash
# Server
NODE_ENV=production

# Database
DATABASE_URL=postgresql://user:pass@host.region.supabase.co:5432/postgres

# Auth
JWT_SECRET=a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2
JWT_REFRESH_SECRET=f6e5d4c3b2a1f6e5d4c3b2a1f6e5d4c3b2a1f6e5d4c3b2a1f6e5d4c3b2a1f6e5
JWT_EXPIRES_IN=24h
REFRESH_TOKEN_EXPIRES_IN=30d

# URLs
ALLOWED_ORIGINS=https://compassionedu.onrender.com
FRONTEND_URL=https://compassionedu.onrender.com
BACKEND_URL=https://compassionedu-api.onrender.com

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=admin@yourschool.com
SMTP_PASS=abcdefghijklmnop
SMTP_FROM=noreply@compassionedu.com

# File Uploads
UPLOAD_DIR=uploads
MAX_PROFILE_PHOTO_SIZE_MB=10
MAX_CV_SIZE_MB=50
MAX_MEDIA_SIZE_MB=50
```

---

**Last Updated**: January 2024
**For**: CompassionEdu Announcement Module Enhancement (Task 11)

