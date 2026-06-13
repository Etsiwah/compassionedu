# CompassionEdu Deployment Guide

## Overview

This guide provides instructions for deploying the CompassionEdu application to production environments, with specific focus on Render.com deployment and email service configuration.

## Table of Contents

1. [Environment Variables](#environment-variables)
2. [Email Service Setup](#email-service-setup)
3. [Render.com Deployment](#rendercom-deployment)
4. [Post-Deployment Testing](#post-deployment-testing)

---

## Environment Variables

### Backend Environment Variables

The following environment variables must be configured in your production environment:

#### Server Configuration
```
NODE_ENV=production
PORT=4000
```

#### Database Configuration
```
DATABASE_URL=postgresql://user:password@host:port/database
```
- Use your production PostgreSQL connection string
- For Supabase: Use the connection pooler URL for better performance

#### Authentication
```
JWT_SECRET=<64-character-random-hex-string>
JWT_REFRESH_SECRET=<64-character-random-hex-string>
JWT_EXPIRES_IN=24h
REFRESH_TOKEN_EXPIRES_IN=30d
```
- Generate secrets using: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`
- **NEVER** use development secrets in production

#### CORS Configuration
```
ALLOWED_ORIGINS=https://your-frontend-domain.com
FRONTEND_URL=https://your-frontend-domain.com
BACKEND_URL=https://your-backend-domain.com
```
- Replace with your actual frontend and backend URLs
- Multiple origins can be comma-separated

#### File Upload Configuration
```
UPLOAD_DIR=uploads
MAX_PROFILE_PHOTO_SIZE_MB=10
MAX_CV_SIZE_MB=50
MAX_MEDIA_SIZE_MB=50
```

#### Email Service Configuration (Required for Announcements)
```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=noreply@compassionedu.com
```
See [Email Service Setup](#email-service-setup) section below for detailed configuration.

#### OAuth Configuration (Optional)
```
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

---

## Email Service Setup

Email notifications are required for the announcement system (REQ-9). Configure one of the following email providers:

### Option 1: Gmail SMTP (Recommended for Small Deployments)

#### Prerequisites
- A Gmail account
- 2-Factor Authentication enabled

#### Setup Steps

1. **Enable 2-Factor Authentication**
   - Go to: https://myaccount.google.com/security
   - Enable 2-Step Verification

2. **Generate App Password**
   - Go to: https://myaccount.google.com/apppasswords
   - Select "Mail" and "Other (Custom name)"
   - Name it "CompassionEdu Production"
   - Copy the generated 16-character password

3. **Configure Environment Variables**
   ```
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=your-email@gmail.com
   SMTP_PASS=<16-character-app-password>
   SMTP_FROM=your-email@gmail.com
   ```

#### Gmail Limitations
- **Sending Limit**: 500 emails per day
- **Rate Limit**: 100-150 emails per hour
- **Best For**: Small schools (<100 users) or testing environments

### Option 2: SendGrid (Recommended for Production)

#### Prerequisites
- SendGrid account (free tier: 100 emails/day)

#### Setup Steps

1. **Create SendGrid Account**
   - Sign up at: https://sendgrid.com/

2. **Generate API Key**
   - Navigate to Settings → API Keys
   - Create API Key with "Mail Send" permissions
   - Copy the API key

3. **Update Email Service Code**
   - Modify `backend/src/services/emailService.js` to use SendGrid
   - Install: `npm install @sendgrid/mail`

4. **Configure Environment Variables**
   ```
   SENDGRID_API_KEY=<your-api-key>
   SMTP_FROM=noreply@compassionedu.com
   FRONTEND_URL=https://your-frontend-domain.com
   ```

#### SendGrid Benefits
- **Higher Limits**: 100 emails/day (free), up to 100k/day (paid)
- **Better Deliverability**: Dedicated IP options
- **Analytics**: Email open/click tracking
- **Best For**: Production deployments with >100 users

### Option 3: AWS SES (Enterprise)

For large-scale deployments (>10,000 users):
- Lower cost per email
- Requires AWS account and domain verification
- See AWS SES documentation: https://docs.aws.amazon.com/ses/

---

## Render.com Deployment

### Backend Service Configuration

1. **Create New Web Service**
   - Go to Render.com dashboard
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
   - Select `backend` directory as root

2. **Configure Build Settings**
   ```
   Build Command: npm install
   Start Command: npm start
   ```

3. **Add Environment Variables**

   Navigate to "Environment" tab and add the following variables:

   | Variable Name | Example Value | Notes |
   |--------------|---------------|-------|
   | `NODE_ENV` | `production` | Required |
   | `PORT` | `4000` | Or leave empty to use Render's default |
   | `DATABASE_URL` | `postgresql://...` | Your PostgreSQL connection string |
   | `JWT_SECRET` | `<random-64-char-hex>` | Generate with crypto |
   | `JWT_REFRESH_SECRET` | `<random-64-char-hex>` | Generate with crypto |
   | `JWT_EXPIRES_IN` | `24h` | Access token lifetime |
   | `REFRESH_TOKEN_EXPIRES_IN` | `30d` | Refresh token lifetime |
   | `ALLOWED_ORIGINS` | `https://your-frontend.onrender.com` | Your frontend URL |
   | `FRONTEND_URL` | `https://your-frontend.onrender.com` | Your frontend URL |
   | `BACKEND_URL` | `https://your-backend.onrender.com` | Your backend URL |
   | `UPLOAD_DIR` | `uploads` | File upload directory |
   | `MAX_PROFILE_PHOTO_SIZE_MB` | `10` | Max profile photo size |
   | `MAX_CV_SIZE_MB` | `50` | Max CV size |
   | `MAX_MEDIA_SIZE_MB` | `50` | Max media size |
   | `SMTP_HOST` | `smtp.gmail.com` | SMTP server host |
   | `SMTP_PORT` | `587` | SMTP server port |
   | `SMTP_SECURE` | `false` | Use TLS |
   | `SMTP_USER` | `your-email@gmail.com` | SMTP username |
   | `SMTP_PASS` | `<app-password>` | Gmail app password |
   | `SMTP_FROM` | `noreply@compassionedu.com` | From email address |
   | `GOOGLE_CLIENT_ID` | `<your-client-id>` | Optional: Google OAuth |
   | `GOOGLE_CLIENT_SECRET` | `<your-secret>` | Optional: Google OAuth |

4. **Deploy**
   - Click "Create Web Service"
   - Wait for initial deployment to complete
   - Note your backend URL

### Frontend Service Configuration

1. **Create New Static Site**
   - Click "New +" → "Static Site"
   - Connect repository, select `frontend` directory

2. **Configure Build Settings**
   ```
   Build Command: npm run build
   Publish Directory: dist
   ```

3. **Add Environment Variables**
   ```
   VITE_API_URL=https://your-backend.onrender.com/api
   ```

4. **Deploy**
   - Create static site
   - Note your frontend URL

### Post-Deployment Configuration

1. **Update Backend CORS**
   - Update `ALLOWED_ORIGINS` and `FRONTEND_URL` in backend environment variables
   - Trigger redeployment

2. **Update Google OAuth (if used)**
   - Add authorized redirect URIs in Google Console:
     - `https://your-frontend.onrender.com`
     - `https://your-backend.onrender.com/auth/google/callback`

---

## Post-Deployment Testing

### Email Service Testing

Test email notifications to ensure proper configuration:

#### 1. Test SMTP Connection

Create a test script or use the admin panel to send a test announcement:

```javascript
// Test script: backend/test-email.js
require('dotenv').config();
const emailService = require('./src/services/emailService');

const testAnnouncement = {
  id: 'test-123',
  title: 'Test Announcement',
  content: 'This is a test email from CompassionEdu',
  created_by: 'admin-id',
  created_at: new Date()
};

const testRecipients = [
  { email: 'test@example.com', name: 'Test User', role: 'staff' }
];

emailService.sendAnnouncementEmails(testAnnouncement, testRecipients)
  .then(() => console.log('✅ Test email sent successfully'))
  .catch(err => console.error('❌ Email failed:', err));
```

Run: `node backend/test-email.js`

#### 2. Test Announcement Flow

1. Log in as admin
2. Create a test announcement targeting "Staff"
3. Verify:
   - ✅ Email received by staff users
   - ✅ Email content is formatted correctly
   - ✅ "View in System" link works
   - ✅ Admin (creator) did NOT receive email
   - ✅ No duplicate emails sent

#### 3. Monitor Email Logs

Check Render.com logs for email-related errors:
```bash
# In Render.com dashboard → Logs
# Look for:
Sent announcement emails to X recipients
```

### Common Email Issues

| Issue | Possible Cause | Solution |
|-------|---------------|----------|
| "Invalid login" | Incorrect SMTP credentials | Verify SMTP_USER and SMTP_PASS |
| "Authentication failed" | App password not used | Generate Gmail app password |
| "Connection timeout" | Firewall blocking port 587 | Check network settings or use port 465 |
| "550 Daily limit exceeded" | Gmail daily limit reached | Upgrade to SendGrid or AWS SES |
| Emails go to spam | No SPF/DKIM records | Configure DNS or use SendGrid |
| "SMTP_FROM not set" | Missing environment variable | Add SMTP_FROM to environment |

### Health Check Endpoints

Verify deployment health:

```bash
# Backend health
curl https://your-backend.onrender.com/health

# Database connectivity
curl https://your-backend.onrender.com/api/announcements
```

---

## Security Best Practices

### Environment Variables
- ✅ Never commit `.env` files to version control
- ✅ Use different secrets for development and production
- ✅ Rotate JWT secrets periodically
- ✅ Use Gmail app passwords, not account passwords
- ✅ Restrict CORS origins to known domains

### Database
- ✅ Use connection pooling (Supabase pooler)
- ✅ Enable SSL for database connections
- ✅ Regular backups

### Email Service
- ✅ Use `SMTP_FROM` with your domain (not Gmail address) for better deliverability
- ✅ Monitor email sending logs for abuse
- ✅ Implement rate limiting if using SendGrid API directly

---

## Troubleshooting

### Backend Won't Start
1. Check Render logs for errors
2. Verify all required environment variables are set
3. Test database connection string locally

### Emails Not Sending
1. Check SMTP credentials are correct
2. Verify SMTP_FROM is set
3. Check Render logs for email errors
4. Test SMTP connection with telnet: `telnet smtp.gmail.com 587`

### CORS Errors
1. Verify `ALLOWED_ORIGINS` includes your frontend URL
2. Check `FRONTEND_URL` matches actual frontend domain
3. Ensure no trailing slashes in URLs

---

## Maintenance

### Regular Tasks
- Monitor email sending volume vs. provider limits
- Review Render logs for errors
- Check database size and performance
- Test announcement system monthly
- Update dependencies: `npm audit fix`

### Scaling Considerations
- **<100 users**: Gmail SMTP is sufficient
- **100-1000 users**: Upgrade to SendGrid Free/Essentials
- **1000-10000 users**: SendGrid Pro or AWS SES
- **>10000 users**: AWS SES with dedicated IPs

---

## Support Resources

- **Render.com Docs**: https://render.com/docs
- **SendGrid Docs**: https://docs.sendgrid.com/
- **Gmail SMTP**: https://support.google.com/mail/answer/7126229
- **Nodemailer Docs**: https://nodemailer.com/about/

---

## Changelog

| Date | Change | Author |
|------|--------|--------|
| 2024-01-XX | Initial deployment guide created | System |
| 2024-01-XX | Email service configuration added | System |

