# CompassionEdu - System Architecture

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER'S BROWSER                           │
│                    (Chrome, Safari, Firefox)                     │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                │ HTTPS
                                ↓
┌─────────────────────────────────────────────────────────────────┐
│                      VERCEL (Frontend)                           │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  React Application (Port 443)                             │  │
│  │  - Landing Page                                           │  │
│  │  - Login/Signup Pages                                     │  │
│  │  - Password Reset Pages                                   │  │
│  │  - Dashboard (Student/Admin/Staff)                        │  │
│  │                                                            │  │
│  │  URL: https://compassionedu-xyz.vercel.app               │  │
│  └───────────────────────────────────────────────────────────┘  │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                │ REST API Calls
                                │ (HTTPS)
                                ↓
┌─────────────────────────────────────────────────────────────────┐
│                       RENDER (Backend)                           │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  Node.js + Express API (Port 4000)                        │  │
│  │                                                            │  │
│  │  Endpoints:                                               │  │
│  │  - POST /api/auth/login                                   │  │
│  │  - POST /api/auth/register                                │  │
│  │  - POST /api/auth/forgot-password                         │  │
│  │  - POST /api/auth/reset-password                          │  │
│  │  - GET  /api/auth/google                                  │  │
│  │  - GET  /api/auth/google/callback                         │  │
│  │  - ... (all other API endpoints)                          │  │
│  │                                                            │  │
│  │  URL: https://compassionedu-api.onrender.com             │  │
│  └───────────────────────────────────────────────────────────┘  │
└────────┬──────────────────────────────────────┬─────────────────┘
         │                                      │
         │ SQL Queries                          │ SMTP
         │ (PostgreSQL Protocol)                │ (Email Sending)
         ↓                                      ↓
┌──────────────────────────┐        ┌──────────────────────────┐
│   SUPABASE (Database)    │        │    GMAIL (Email)         │
│  ┌────────────────────┐  │        │  ┌────────────────────┐  │
│  │  PostgreSQL        │  │        │  │  SMTP Server       │  │
│  │                    │  │        │  │                    │  │
│  │  Tables:           │  │        │  │  Sends:            │  │
│  │  - users           │  │        │  │  - Password Reset  │  │
│  │  - refresh_tokens  │  │        │  │  - Welcome Email   │  │
│  │  - password_reset  │  │        │  │                    │  │
│  │  - fees            │  │        │  │  Port: 587 (TLS)   │  │
│  │  - attendance      │  │        │  └────────────────────┘  │
│  │  - results         │  │        └──────────────────────────┘
│  │  - portfolio       │  │
│  │  - ... (14 tables) │  │
│  └────────────────────┘  │
└──────────────────────────┘

         ↑
         │ OAuth Flow
         │ (User Authentication)
         │
┌──────────────────────────┐
│  GOOGLE CLOUD PLATFORM   │
│  ┌────────────────────┐  │
│  │  OAuth 2.0         │  │
│  │                    │  │
│  │  - User Consent    │  │
│  │  - Token Exchange  │  │
│  │  - Profile Data    │  │
│  └────────────────────┘  │
└──────────────────────────┘
```

---

## 🔄 Request Flow Examples

### 1. **Email/Password Login**

```
User                Frontend (Vercel)      Backend (Render)       Database (Supabase)
  │                        │                      │                       │
  │   Enter email/pwd      │                      │                       │
  ├───────────────────────>│                      │                       │
  │                        │  POST /auth/login    │                       │
  │                        ├─────────────────────>│                       │
  │                        │                      │  Query users table    │
  │                        │                      ├──────────────────────>│
  │                        │                      │  Return user data     │
  │                        │                      │<──────────────────────┤
  │                        │                      │  Verify password      │
  │                        │                      │  Generate JWT token   │
  │                        │  Return token + user │                       │
  │                        │<─────────────────────┤                       │
  │   Redirect to dashboard│                      │                       │
  │<───────────────────────┤                      │                       │
  │                        │                      │                       │
```

### 2. **Forgot Password Flow**

```
User                Frontend             Backend              Database        Gmail
  │                      │                    │                    │            │
  │  Click "Forgot      │                    │                    │            │
  │   Password"         │                    │                    │            │
  ├────────────────────>│                    │                    │            │
  │                     │                    │                    │            │
  │  Enter email        │                    │                    │            │
  ├────────────────────>│                    │                    │            │
  │                     │  POST /forgot-pwd  │                    │            │
  │                     ├───────────────────>│                    │            │
  │                     │                    │  Find user         │            │
  │                     │                    ├───────────────────>│            │
  │                     │                    │  User found        │            │
  │                     │                    │<───────────────────┤            │
  │                     │                    │  Generate token    │            │
  │                     │                    │  Save token hash   │            │
  │                     │                    ├───────────────────>│            │
  │                     │                    │  Token saved       │            │
  │                     │                    │<───────────────────┤            │
  │                     │                    │  Send email        │            │
  │                     │                    ├────────────────────────────────>│
  │                     │                    │                    │  Email sent│
  │                     │  Success message   │                    │            │
  │                     │<───────────────────┤                    │            │
  │  "Check your email" │                    │                    │            │
  │<────────────────────┤                    │                    │            │
  │                     │                    │                    │            │
  │  ┌──────────────────────────────────────────────────────────────────────┐ │
  │  │  Email arrives with reset link:                                      │ │
  │  │  https://your-app.vercel.app/reset-password?token=xxxxxxxxxxxxx      │ │
  │  └──────────────────────────────────────────────────────────────────────┘ │
  │                     │                    │                    │            │
  │  Click reset link   │                    │                    │            │
  ├────────────────────>│                    │                    │            │
  │                     │                    │                    │            │
  │  Enter new password │                    │                    │            │
  ├────────────────────>│                    │                    │            │
  │                     │  POST /reset-pwd   │                    │            │
  │                     ├───────────────────>│                    │            │
  │                     │                    │  Verify token      │            │
  │                     │                    ├───────────────────>│            │
  │                     │                    │  Token valid       │            │
  │                     │                    │<───────────────────┤            │
  │                     │                    │  Hash new password │            │
  │                     │                    │  Update password   │            │
  │                     │                    ├───────────────────>│            │
  │                     │                    │  Delete token      │            │
  │                     │                    ├───────────────────>│            │
  │                     │  Success           │                    │            │
  │                     │<───────────────────┤                    │            │
  │  "Password reset!"  │                    │                    │            │
  │<────────────────────┤                    │                    │            │
```

### 3. **Google OAuth Flow**

```
User          Frontend          Backend          Google          Database
  │                │                │                │                │
  │  Click Google  │                │                │                │
  │  button        │                │                │                │
  ├───────────────>│                │                │                │
  │                │  Redirect to   │                │                │
  │                │  /auth/google  │                │                │
  │                ├───────────────>│                │                │
  │                │                │  Redirect to   │                │
  │                │                │  Google        │                │
  │                │                ├───────────────>│                │
  │                │                │                │                │
  │  Google Login Screen (accounts.google.com)      │                │
  │<─────────────────────────────────────────────────┤                │
  │                │                │                │                │
  │  Select account│                │                │                │
  │  & Authorize   │                │                │                │
  ├──────────────────────────────────────────────────>│                │
  │                │                │  Redirect with │                │
  │                │                │  auth code     │                │
  │                │                │<───────────────┤                │
  │                │                │  Exchange code │                │
  │                │                │  for tokens    │                │
  │                │                ├───────────────>│                │
  │                │                │  Access token  │                │
  │                │                │<───────────────┤                │
  │                │                │  Get user info │                │
  │                │                ├───────────────>│                │
  │                │                │  User profile  │                │
  │                │                │<───────────────┤                │
  │                │                │  Find/Create   │                │
  │                │                │  user          │                │
  │                │                ├───────────────────────────────>│
  │                │                │  User data     │                │
  │                │                │<───────────────────────────────┤
  │                │                │  Generate JWT  │                │
  │                │  Redirect with │                │                │
  │                │  tokens        │                │                │
  │                │<───────────────┤                │                │
  │  Dashboard     │                │                │                │
  │<───────────────┤                │                │                │
```

---

## 🔐 Security Layers

```
┌────────────────────────────────────────────────────────────┐
│  Layer 1: HTTPS/TLS Encryption                             │
│  - All traffic encrypted in transit                        │
│  - Automatic with Vercel, Render, Supabase                 │
└────────────────────────────────────────────────────────────┘
         ↓
┌────────────────────────────────────────────────────────────┐
│  Layer 2: CORS Protection                                  │
│  - Only frontend domain can call backend                   │
│  - Configured in ALLOWED_ORIGINS                           │
└────────────────────────────────────────────────────────────┘
         ↓
┌────────────────────────────────────────────────────────────┐
│  Layer 3: JWT Authentication                               │
│  - Stateless token-based auth                              │
│  - Access tokens (24h) + Refresh tokens (30d)              │
└────────────────────────────────────────────────────────────┘
         ↓
┌────────────────────────────────────────────────────────────┐
│  Layer 4: Password Security                                │
│  - Bcrypt hashing (10 rounds)                              │
│  - Reset tokens hashed with SHA-256                        │
│  - Tokens expire in 1 hour                                 │
└────────────────────────────────────────────────────────────┘
         ↓
┌────────────────────────────────────────────────────────────┐
│  Layer 5: Database Security                                │
│  - Connection encrypted (SSL)                              │
│  - Row Level Security (Supabase)                           │
│  - Environment variables never in code                     │
└────────────────────────────────────────────────────────────┘
```

---

## 📦 Technology Stack

### Frontend (Vercel)
- **Framework:** React 18
- **Routing:** React Router v6
- **Styling:** Tailwind CSS
- **HTTP Client:** Axios
- **State Management:** Context API + Hooks
- **Build Tool:** Create React App

### Backend (Render)
- **Runtime:** Node.js 18+
- **Framework:** Express.js
- **Authentication:** JWT (jsonwebtoken)
- **Password Hashing:** bcryptjs
- **Email:** Nodemailer
- **OAuth:** Passport.js + Google Strategy
- **Database Client:** node-postgres (pg)
- **Validation:** express-validator

### Database (Supabase)
- **Type:** PostgreSQL 15
- **ORM:** Raw SQL queries
- **Backups:** Automatic daily (Pro plan)
- **Extensions:** pgcrypto (UUID generation)

### External Services
- **Email:** Gmail SMTP (smtp.gmail.com:587)
- **OAuth:** Google OAuth 2.0
- **CDN:** Vercel Edge Network
- **DNS:** Cloudflare (if custom domain)

---

## 📊 Data Flow

### Authentication Token Flow

```
┌─────────────┐
│    User     │
│   Logins    │
└──────┬──────┘
       │
       ↓
┌─────────────────────────────────┐
│  Backend generates:             │
│                                 │
│  1. Access Token (JWT)          │
│     - Expires: 24 hours         │
│     - Contains: user ID + role  │
│     - Stored: Frontend memory   │
│                                 │
│  2. Refresh Token (Random)      │
│     - Expires: 30 days          │
│     - Stored: Database (hashed) │
│     - Stored: Frontend storage  │
└─────────────────────────────────┘
       │
       ↓
┌─────────────────────────────────┐
│  Every API Request:             │
│                                 │
│  Headers:                       │
│  Authorization: Bearer <token>  │
│                                 │
│  Backend verifies JWT           │
│  - Valid? → Process request     │
│  - Expired? → Use refresh token │
│  - Invalid? → 401 Unauthorized  │
└─────────────────────────────────┘
```

---

## 🌐 Deployment Environments

### Development (Local)
```
Frontend:  http://localhost:3000
Backend:   http://localhost:4000
Database:  localhost:5432
```

### Production (Cloud)
```
Frontend:  https://compassionedu-xyz.vercel.app
Backend:   https://compassionedu-api.onrender.com
Database:  db.xxxxx.supabase.co:5432
```

---

## 🔄 CI/CD Pipeline

```
Developer → Push to GitHub → Automatic Deployment
                  │
                  ├──> Vercel (Frontend)
                  │    - Build React app
                  │    - Deploy to CDN
                  │    - Update live site
                  │    - Time: ~2 minutes
                  │
                  └──> Render (Backend)
                       - Install dependencies
                       - Run migrations (if any)
                       - Deploy new version
                       - Health check
                       - Time: ~5 minutes
```

---

## 💾 Database Schema (Simplified)

```sql
users
├── id (UUID, PK)
├── email (unique)
├── password_hash
├── role (student/admin/staff)
└── ...

refresh_tokens
├── id (UUID, PK)
├── user_id (FK → users)
├── token_hash
└── expires_at

password_reset_tokens
├── id (UUID, PK)
├── user_id (FK → users, unique)
├── token_hash
└── expires_at

... (11 more tables)
```

---

## 🎯 Key Features Architecture

### Feature: Password Reset
```
Frontend                Backend              Database        Email
   │                       │                    │             │
   │ /forgot-password      │                    │             │
   ├──────────────────────>│                    │             │
   │                       │ Generate token     │             │
   │                       │ Hash token         │             │
   │                       │ Store hash         │             │
   │                       ├───────────────────>│             │
   │                       │ Send email         │             │
   │                       ├────────────────────────────────>│
   │ Success               │                    │             │
   │<──────────────────────┤                    │             │
```

### Feature: Google OAuth
```
Frontend         Backend          Google        Database
   │                │                │              │
   │ Click Google   │                │              │
   ├───────────────>│                │              │
   │                │ Redirect       │              │
   │                ├───────────────>│              │
   │                │                │              │
   │ User consents  │                │              │
   ├──────────────────────────────>│              │
   │                │ Get profile    │              │
   │                │<───────────────┤              │
   │                │ Create/Find    │              │
   │                │ user           │              │
   │                ├───────────────────────────────>│
   │                │ Issue JWT      │              │
   │ Auth success   │                │              │
   │<───────────────┤                │              │
```

---

## 📈 Scalability Considerations

### Current Setup (Free Tier)
- **Users:** Up to 1,000 concurrent
- **Requests:** Unlimited
- **Storage:** 500 MB database
- **Bandwidth:** 100 GB/month

### Upgrade Path
1. **Phase 1:** Render + Supabase Pro (~$32/mo)
   - Handle 10,000+ users
   - Always-on backend
   - Larger database

2. **Phase 2:** Add Redis caching
   - Faster response times
   - Reduced database load

3. **Phase 3:** CDN for file uploads
   - Use AWS S3 or Cloudinary
   - Offload file serving

4. **Phase 4:** Load balancing
   - Multiple backend instances
   - Auto-scaling

---

This architecture is production-ready and can scale with your user base! 🚀
