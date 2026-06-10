# Supabase Database Setup Guide for CompassionEdu

This guide will walk you through setting up your PostgreSQL database on Supabase.

---

## 📋 Prerequisites

- A Supabase account (sign up at https://supabase.com if you don't have one)
- Your database schema file: `backend/src/db/schema.sql`

---

## 🚀 Step-by-Step Setup

### Step 1: Create a Supabase Project

1. Go to https://supabase.com and sign in
2. Click **"New Project"**
3. Fill in the project details:
   - **Name**: `compassionedu` (or your preferred name)
   - **Database Password**: Create a strong password and **SAVE IT** (you'll need this)
   - **Region**: Choose the region closest to your users (e.g., US East, Europe, Asia)
   - **Pricing Plan**: Select "Free" for development
4. Click **"Create new project"**
5. Wait 2-3 minutes for the project to be provisioned

### Step 2: Get Your Database Connection Details

Once your project is ready:

1. In your Supabase dashboard, click on **"Settings"** (gear icon) in the left sidebar
2. Click on **"Database"**
3. Scroll down to **"Connection string"** section
4. You'll see several connection strings. We need the **"URI"** format
5. Click **"Show"** next to the URI and copy it

The URI will look like this:
```
postgresql://postgres:[YOUR-PASSWORD]@db.xxxxxxxxxxxxx.supabase.co:5432/postgres
```

**Important**: Replace `[YOUR-PASSWORD]` with your actual database password

### Step 3: Run the Schema Migration

You have two options to create your database tables:

#### Option A: Using Supabase SQL Editor (Recommended for Beginners)

1. In your Supabase dashboard, click on **"SQL Editor"** in the left sidebar
2. Click **"New query"**
3. Open your local file: `backend/src/db/schema.sql`
4. Copy the **entire contents** of the file
5. Paste it into the SQL Editor in Supabase
6. Click **"Run"** (or press Ctrl+Enter / Cmd+Enter)
7. You should see a success message: "Success. No rows returned"

#### Option B: Using Your Local Migration Script

1. Install the PostgreSQL client (if not already installed):
   ```cmd
   npm install -g pg
   ```

2. Update your backend `.env` file with the Supabase connection string:
   ```env
   DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.xxxxxxxxxxxxx.supabase.co:5432/postgres
   ```

3. Run the migration from your project root:
   ```cmd
   cd backend
   node src/db/migrate.js
   ```

### Step 4: Verify the Tables Were Created

1. In Supabase dashboard, click on **"Table Editor"** in the left sidebar
2. You should see all your tables listed:
   - ✅ users
   - ✅ refresh_tokens
   - ✅ password_reset_tokens
   - ✅ profile_photos
   - ✅ student_profiles
   - ✅ parent_student_links
   - ✅ teacher_class_assignments
   - ✅ fees
   - ✅ fee_payments
   - ✅ results
   - ✅ attendance
   - ✅ experiences
   - ✅ portfolio_media
   - ✅ announcements
   - ✅ announcement_reads
   - ✅ beneficiaries
   - ✅ parents_guardians
   - ✅ academic_records
   - ✅ sponsorships
   - ✅ beneficiary_documents
   - ✅ beneficiary_health
   - ✅ beneficiary_activity_logs
   - ✅ activity_logs
   - ✅ notifications
   - ✅ staff_profiles
   - ✅ staff_work_reports
   - ✅ file_ownership
   - ✅ student_health_records

### Step 5: Update Your Backend Environment Variables

1. Open `backend/.env` (create it if it doesn't exist)
2. Update the `DATABASE_URL` with your Supabase connection string:

```env
# Database
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.xxxxxxxxxxxxx.supabase.co:5432/postgres

# JWT Secret (generate a random string)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# JWT Expiry
ACCESS_TOKEN_EXPIRY=15m
REFRESH_TOKEN_EXPIRY=7d

# Server
PORT=4000
NODE_ENV=development

# CORS (Frontend URL)
FRONTEND_URL=http://localhost:3000

# Email Configuration (Gmail SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:4000/api/auth/google/callback

# Session Secret
SESSION_SECRET=your-session-secret-change-this-in-production
```

### Step 6: Test the Connection

1. Restart your backend server:
   ```cmd
   cd backend
   npm run dev
   ```

2. Check the console output - you should see:
   ```
   ✓ Database connected successfully
   Server running on port 4000
   ```

3. Test by creating a user through your frontend or using an API tool like Postman

---

## 🔒 Security Best Practices

### 1. Enable Row Level Security (RLS)

Supabase recommends enabling RLS to control data access:

1. In Supabase dashboard, go to **"Authentication"** → **"Policies"**
2. For each table, you can create policies to control who can read/write data
3. For now, during development, you can disable RLS, but **ENABLE IT BEFORE PRODUCTION**

To disable RLS during development:
1. Go to **"SQL Editor"**
2. Run this for each table:
   ```sql
   ALTER TABLE users DISABLE ROW LEVEL SECURITY;
   ALTER TABLE refresh_tokens DISABLE ROW LEVEL SECURITY;
   -- Repeat for all tables...
   ```

### 2. Restrict API Access

1. Go to **"Settings"** → **"API"**
2. Under **"API Settings"**, you can:
   - Restrict access by IP address
   - Enable/disable anonymous access
   - Set rate limits

### 3. Database Backups

Supabase automatically backs up your database daily on the free tier. For production:
1. Go to **"Settings"** → **"Database"**
2. Under **"Backups"**, you can trigger manual backups

---

## 📊 Monitoring Your Database

### View Database Stats
1. Go to **"Database"** in the left sidebar
2. You'll see:
   - Database size
   - Number of tables
   - Active connections
   - Query performance

### View Logs
1. Go to **"Logs"** in the left sidebar
2. Select **"Database"** to see PostgreSQL logs
3. Useful for debugging connection issues or slow queries

---

## 🔗 Connection Details Reference

After setup, save these details securely:

| Detail | Location in Supabase |
|--------|---------------------|
| **Database URL** | Settings → Database → Connection string |
| **API URL** | Settings → API → Project URL |
| **API Keys** | Settings → API → Project API keys |
| **Database Password** | The password you created when setting up the project |

---

## 🚨 Troubleshooting

### Issue: "connection refused" error

**Solution**: Check that:
- Your DATABASE_URL is correct
- Your database password is correct (no special characters causing issues)
- Your IP address is not blocked by Supabase (check Settings → Database → Connection pooling)

### Issue: "relation does not exist" error

**Solution**: 
- The tables weren't created. Go back to Step 3 and run the schema migration again
- Check in Table Editor to verify tables exist

### Issue: "password authentication failed"

**Solution**:
- Your database password in the DATABASE_URL is incorrect
- Reset it: Settings → Database → Database password → Reset password

### Issue: Backend can't connect from local machine

**Solution**:
- Supabase allows connections from any IP by default
- If you've enabled connection pooling, make sure you're using the correct connection string
- Try using the "Session" connection mode instead of "Transaction" mode

---

## 🎯 Next Steps

After your database is set up:

1. ✅ Configure Gmail SMTP for password reset emails
2. ✅ Configure Google OAuth credentials
3. ✅ Test user registration and login
4. ✅ Deploy backend to Render
5. ✅ Deploy frontend to Vercel
6. ✅ Update production environment variables

Refer to `DEPLOYMENT_GUIDE_LIVE.md` for detailed production deployment steps.

---

## 💡 Tips

- **Free Tier Limits**: 500 MB database size, 2 GB bandwidth, unlimited API requests
- **Upgrade Path**: Easily upgrade to Pro when you need more resources
- **Database Dashboard**: Use Supabase's Table Editor to view and edit data directly
- **SQL Editor**: Run custom queries and create indexes as needed
- **Realtime**: Supabase supports realtime subscriptions if you need live data updates

---

## 📞 Support

- Supabase Documentation: https://supabase.com/docs
- Supabase Discord: https://discord.supabase.com
- Project Issues: Contact kwesiyakubuetsiwah@gmail.com
