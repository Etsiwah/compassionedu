# Quick Deployment Checklist ✅

## 1️⃣ Database (Supabase) - 10 minutes

```bash
1. Create account at supabase.com
2. New Project → "compassionedu"
3. Save database password!
4. Get connection string from Settings → Database
5. SQL Editor → Paste schema.sql → Run
```

**Connection String Format:**
```
postgresql://postgres:PASSWORD@db.xxxxx.supabase.co:5432/postgres
```

---

## 2️⃣ Backend (Render) - 15 minutes

```bash
1. Push code to GitHub
2. Create account at render.com
3. New Web Service → Connect GitHub repo
4. Root Directory: backend
5. Build: npm install
6. Start: npm start
7. Add ALL environment variables (see below)
8. Deploy!
```

**Required Environment Variables:**
```env
DATABASE_URL=<from-supabase>
JWT_SECRET=<generate-random-64-chars>
JWT_REFRESH_SECRET=<generate-random-64-chars>
FRONTEND_URL=<will-get-from-vercel>
BACKEND_URL=https://YOUR-APP.onrender.com
ALLOWED_ORIGINS=<will-get-from-vercel>
SMTP_USER=your-email@gmail.com
SMTP_PASS=<gmail-app-password>
GOOGLE_CLIENT_ID=<from-google-console>
GOOGLE_CLIENT_SECRET=<from-google-console>
```

---

## 3️⃣ Frontend (Vercel) - 10 minutes

```bash
1. Create account at vercel.com  
2. New Project → Import from GitHub
3. Root Directory: frontend
4. Framework: Create React App
5. Add environment variable:
   REACT_APP_API_URL=https://YOUR-APP.onrender.com
6. Deploy!
```

---

## 4️⃣ Gmail Setup - 5 minutes

```bash
1. Go to myaccount.google.com
2. Security → Enable 2-Step Verification
3. Go to myaccount.google.com/apppasswords
4. Generate password for "Mail"
5. Copy 16-character password
6. Add to Render: SMTP_PASS
```

---

## 5️⃣ Google OAuth - 10 minutes

```bash
1. Go to console.cloud.google.com
2. New Project or select existing
3. APIs & Services → Credentials
4. Create OAuth 2.0 Client ID
5. Add Authorized origins:
   - https://YOUR-APP.vercel.app
6. Add Redirect URIs:
   - https://YOUR-APP.onrender.com/api/auth/google/callback
7. Copy Client ID & Secret
8. Add to Render environment variables
```

---

## 6️⃣ Final Update - 2 minutes

Go back to Render and update:
```env
FRONTEND_URL=https://YOUR-APP.vercel.app
ALLOWED_ORIGINS=https://YOUR-APP.vercel.app
```

---

## 🎯 URLs You'll Need

After deployment, you'll have:
- ✅ Frontend: `https://compassionedu-xyz.vercel.app`
- ✅ Backend: `https://compassionedu-api.onrender.com`
- ✅ Database: Supabase dashboard

---

## 🧪 Quick Test

1. Visit frontend URL
2. Try login with test account
3. Try "Forgot Password"
4. Try "Continue with Google"

---

## ⚡ Generate Secrets

Run in terminal:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Run twice for JWT_SECRET and JWT_REFRESH_SECRET!

---

## 🆘 Common Issues

**CORS Error?**
→ Check ALLOWED_ORIGINS matches frontend URL exactly

**Google OAuth fails?**
→ Check redirect URI matches exactly

**Emails not sending?**
→ Use Gmail App Password, not regular password

**Database error?**
→ Check DATABASE_URL is correct

---

## 💡 Pro Tips

1. **Use .env.local for testing** - Never commit real credentials
2. **Render free tier sleeps** - First request takes 30 sec
3. **Vercel auto-deploys** - Every git push deploys automatically
4. **Save all passwords** - Keep them in a password manager
5. **Test locally first** - Make sure everything works before deploying

---

## 📱 Share Your App!

Once deployed, share:
`https://your-app.vercel.app`

Users can:
- ✅ Sign up with email
- ✅ Sign in with Google
- ✅ Reset forgotten passwords
- ✅ Access their dashboard

---

## Total Time: ~52 minutes

Good luck! 🚀
