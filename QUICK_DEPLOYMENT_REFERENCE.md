# Quick Deployment Reference Card

## 🔗 Your URLs

| Service | URL | Status Check |
|---------|-----|--------------|
| **Frontend** | https://compassion-project-kappa.vercel.app | Open in browser |
| **Backend** | https://compassionedu-api.onrender.com | https://compassionedu-api.onrender.com/api/health |
| **Database** | Supabase (configured) | Check Supabase dashboard |

---

## 🎯 Quick Actions

### 1️⃣ Set Vercel Environment Variable (2 minutes)

```
Dashboard: https://vercel.com/dashboard
Project: compassion-project
Settings → Environment Variables → Add:

REACT_APP_API_URL = https://compassionedu-api.onrender.com/api
Environment: ✓ Production

Then: Deployments → ••• → Redeploy
```

---

### 2️⃣ Set Render Environment Variables (3 minutes)

```
Dashboard: https://dashboard.render.com
Service: compassionedu-api
Environment tab → Add/Update:

NODE_ENV = production
FRONTEND_URL = https://compassion-project-kappa.vercel.app
ALLOWED_ORIGINS = https://compassion-project-kappa.vercel.app
BACKEND_URL = https://compassionedu-api.onrender.com

(Copy other variables from backend/.env file)

Then: Save Changes (auto-redeploys)
```

---

### 3️⃣ Update Google OAuth (2 minutes)

```
Console: https://console.cloud.google.com
Project: CompassionEdu
APIs & Services → Credentials → Your OAuth Client

Authorized JavaScript origins:
  https://compassion-project-kappa.vercel.app

Authorized redirect URIs:
  https://compassion-project-kappa.vercel.app/auth/callback

Then: SAVE
```

---

### 4️⃣ Wake Backend & Test (1 minute)

```
1. Visit: https://compassionedu-api.onrender.com/api/health
   (Wait 30-60 seconds for first response)

2. Visit: https://compassion-project-kappa.vercel.app
   (Should load the landing page)

3. Test signup/login
```

---

## 🧪 Test Accounts

| Email | Password | Role |
|-------|----------|------|
| admin@compassionedu.com | Admin@123 | Admin |
| staff1@compassionedu.com | Staff@123 | Staff |
| teacher1@compassionedu.com | Teacher@123 | Teacher |
| student1@compassionedu.com | Student@123 | Student |
| parent1@compassionedu.com | Parent@123 | Parent |

---

## 📱 Share With Friend

**Send them this URL:**
```
https://compassion-project-kappa.vercel.app
```

**Ask them to:**
1. Open on their phone browser
2. Sign up with their email
3. Log in and explore
4. Report any issues

---

## 🆘 Quick Fixes

### "Cannot reach server"
→ Visit backend health URL and wait 60 seconds (Render wake-up)

### Google OAuth fails
→ Check you added production URL to Google Console

### 404 on Vercel
→ Check environment variable is set and redeployed

### CORS errors
→ Check ALLOWED_ORIGINS matches frontend URL exactly

---

## ✅ Done When...

- [ ] Can open https://compassion-project-kappa.vercel.app
- [ ] Can sign up and login
- [ ] Dashboard loads
- [ ] Google OAuth works
- [ ] Friend can access on their phone

---

**Full Instructions:** See `DEPLOYMENT_SETUP_INSTRUCTIONS.md`
