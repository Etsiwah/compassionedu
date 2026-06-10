# 🎯 Next Steps - CompassionEdu Setup

## ✅ **What's Done:**
- ✅ Supabase project created: `compassionedu`
- ✅ Database tables created (21 tables)
- ✅ Backend `.env` file created

---

## 🔧 **What You Need to Do Now:**

### **Step 1: Update Database Connection String** (5 minutes)

1. **In Supabase Dashboard:**
   - Click "Settings" (gear icon) in left sidebar
   - Click "Database"
   - Scroll to "Connection string"
   - Select "URI" tab
   - Click "Copy"

2. **Open:** `backend/.env`

3. **Replace this line:**
   ```
   DATABASE_URL=postgresql://postgres.[project-ref]:[YOUR-PASSWORD]@aws-0-eu-west-1.pooler.supabase.com:5432/postgres
   ```
   
   **With your actual Supabase connection string**

4. **Make sure to replace `[YOUR-PASSWORD]`** with the database password you created

---

### **Step 2: Test Database Connection** (2 minutes)

1. **Restart your backend server:**
   ```cmd
   cd backend
   npm run dev
   ```

2. **Check the console output:**
   - ✅ Should see: `Database connected successfully`
   - ✅ Should see: `Server running on port 4000`

3. **If you see errors:**
   - Double-check your DATABASE_URL
   - Make sure password is correct
   - Check if you replaced `[YOUR-PASSWORD]`

---

### **Step 3: Configure Gmail SMTP** (Optional - for password reset emails)

1. **Enable 2FA on Gmail:**
   - Go to: https://myaccount.google.com/security
   - Enable 2-Step Verification

2. **Generate App Password:**
   - Go to: https://myaccount.google.com/apppasswords
   - Select "Mail" and your device
   - Copy the 16-character password

3. **Update `backend/.env`:**
   ```env
   SMTP_USER=kwesiyakubuetsiwah@gmail.com
   SMTP_PASS=your-16-character-app-password
   ```

---

### **Step 4: Configure Google OAuth** (Optional - for "Sign in with Google")

1. **Go to Google Cloud Console:**
   - Visit: https://console.cloud.google.com
   - Create a new project (or use existing)

2. **Enable Google+ API:**
   - Go to "APIs & Services" → "Library"
   - Search for "Google+ API"
   - Click "Enable"

3. **Create OAuth Credentials:**
   - Go to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "OAuth client ID"
   - Application type: "Web application"
   - Name: "CompassionEdu Local"

4. **Configure URLs:**
   - Authorized JavaScript origins: `http://localhost:3000`
   - Authorized redirect URIs: `http://localhost:4000/api/auth/google/callback`

5. **Copy credentials to `backend/.env`:**
   ```env
   GOOGLE_CLIENT_ID=your-actual-client-id.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=your-actual-client-secret
   ```

---

## 🧪 **Step 5: Test Your Application**

1. **Make sure both servers are running:**
   - Backend: `cd backend && npm run dev` (port 4000)
   - Frontend: `cd frontend && npx react-scripts start` (port 3000)

2. **Test user registration:**
   - Go to: http://localhost:3000
   - Click "Get Started" or go to Login page
   - Try creating an account with email/password

3. **Check Supabase:**
   - Go to Supabase → Table Editor → users
   - You should see your new user!

---

## 📚 **Optional: Create Admin User**

To test admin features, create an admin user manually:

1. **In Supabase, go to SQL Editor**

2. **Run this query (replace with your email):**
   ```sql
   INSERT INTO users (role, name, email, password_hash, is_active)
   VALUES (
     'admin',
     'Admin User',
     'admin@compassionedu.com',
     '$2b$10$placeholder.hash.will.be.replaced.when.you.login',
     true
   );
   ```

3. **Then register normally with that email** - the password hash will be updated

---

## 🚀 **Deployment (Later)**

Once everything works locally:
- Deploy frontend to **Vercel**
- Deploy backend to **Render**
- Update Supabase connection string in Render
- Update environment variables for production

See `DEPLOYMENT_GUIDE_LIVE.md` for detailed deployment instructions.

---

## 🆘 **Troubleshooting**

### Backend won't connect to database
- Check DATABASE_URL in `backend/.env`
- Make sure password is correct (no special characters causing issues)
- Try the "Session" connection string instead of "Transaction" in Supabase

### Gmail SMTP not working
- Make sure 2FA is enabled
- Use App Password, not your regular Gmail password
- Check SMTP_PORT is 587

### Google OAuth not working
- Check redirect URIs match exactly
- Make sure JavaScript origins include http://localhost:3000
- Check credentials are copied correctly

---

## ✅ **Current Status Checklist**

- [x] Supabase project created
- [x] Database tables created
- [x] Backend .env file created
- [ ] Database connection string updated in .env
- [ ] Backend connected to Supabase (test with `npm run dev`)
- [ ] Gmail SMTP configured (optional)
- [ ] Google OAuth configured (optional)
- [ ] Test user registration working
- [ ] Ready for local development

---

**Need help? Check:**
- `SUPABASE_SETUP_GUIDE.md` - Detailed Supabase setup
- `SETUP_GUIDE.md` - Full local development guide
- `DEPLOYMENT_GUIDE_LIVE.md` - Production deployment guide
