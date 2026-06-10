# CompassionEdu 🎓

> A modern school management platform for students, staff, and administrators.

[![Live Demo](https://img.shields.io/badge/demo-live-success)](https://your-app.vercel.app)
[![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

---

## 🌟 Features

### Authentication & Security
- ✅ **Email/Password Authentication** - Secure login with JWT tokens
- ✅ **Google OAuth 2.0** - Sign in with Google account
- ✅ **Password Reset** - Email-based password recovery
- ✅ **Role-Based Access** - Student, Staff, Admin, Teacher, Parent roles
- ✅ **Session Management** - Refresh tokens for extended sessions

### Student Features
- 📊 View academic results and GPA
- 📅 Track attendance with visual calendar
- 💰 Monitor fee status and payment history
- 📁 Build digital portfolio (skills, projects, CV)
- 📢 Receive announcements and updates
- 🏥 Track health records

### Staff/Admin Features
- 👥 User management (create, update, deactivate)
- 📈 Upload and manage results
- ✅ Record student attendance
- 💳 Fee management and tracking
- 📝 Portfolio review and moderation
- 📊 Analytics dashboard
- 🔔 System notifications

### Technical Features
- 🎨 Modern, responsive UI with Tailwind CSS
- 🌓 Dark mode support (coming soon)
- 📱 Mobile-friendly design
- ⚡ Fast performance with React
- 🔒 Secure API with Express.js
- 💾 PostgreSQL database
- 📧 Email notifications

---

## 🚀 Quick Start

### Prerequisites

- Node.js 16+
- PostgreSQL (or Supabase account)
- Gmail account (for emails)
- Google Cloud Project (for OAuth)

### Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/Etsiwah/compassionedu.git
   cd compassionedu
   ```

2. **Set up backend**
   ```bash
   cd backend
   npm install
   cp .env.example .env
   # Edit .env with your credentials
   npm run migrate
   npm run dev
   ```

3. **Set up frontend**
   ```bash
   cd frontend
   npm install
   npm start
   ```

4. **Visit** http://localhost:3000

---

## 📦 Tech Stack

### Frontend
- **React 18** - UI framework
- **React Router 6** - Navigation
- **Tailwind CSS** - Styling
- **Axios** - HTTP client
- **Context API** - State management

### Backend
- **Node.js** - Runtime
- **Express.js** - Web framework
- **JWT** - Authentication
- **bcryptjs** - Password hashing
- **Nodemailer** - Email sending
- **Passport.js** - OAuth
- **PostgreSQL** - Database

### Infrastructure
- **Vercel** - Frontend hosting
- **Render** - Backend hosting
- **Supabase** - Database hosting
- **Gmail SMTP** - Email delivery
- **Google OAuth** - Social login

---

## 🌐 Deployment

### Option 1: Quick Deploy (Recommended)

Follow our **[QUICK_DEPLOY.md](QUICK_DEPLOY.md)** guide - takes about 50 minutes.

### Option 2: Detailed Deploy

See **[DEPLOYMENT_GUIDE_LIVE.md](DEPLOYMENT_GUIDE_LIVE.md)** for step-by-step instructions.

### Architecture

Check out **[ARCHITECTURE.md](ARCHITECTURE.md)** to understand the system design.

---

## 📚 Documentation

| Document | Description |
|----------|-------------|
| [SETUP_GUIDE.md](SETUP_GUIDE.md) | Local development setup |
| [QUICK_DEPLOY.md](QUICK_DEPLOY.md) | Quick deployment checklist |
| [DEPLOYMENT_GUIDE_LIVE.md](DEPLOYMENT_GUIDE_LIVE.md) | Detailed production deployment |
| [ARCHITECTURE.md](ARCHITECTURE.md) | System architecture & data flow |

---

## 🎯 Project Structure

```
compassionedu/
├── backend/
│   ├── src/
│   │   ├── routes/          # API endpoints
│   │   ├── services/        # Business logic
│   │   ├── middleware/      # Auth, validation
│   │   ├── db/             # Database & migrations
│   │   └── app.js          # Express app
│   ├── uploads/            # File uploads
│   ├── package.json
│   └── .env.example
│
├── frontend/
│   ├── src/
│   │   ├── components/     # Reusable components
│   │   ├── pages/          # Page components
│   │   ├── context/        # React context
│   │   ├── hooks/          # Custom hooks
│   │   ├── utils/          # Utilities
│   │   └── App.jsx         # Main app
│   ├── public/             # Static assets
│   ├── package.json
│   └── .env.example
│
└── docs/                   # Documentation
```

---

## 🔐 Environment Variables

### Backend (.env)

```env
# Database
DATABASE_URL=postgresql://...

# Auth
JWT_SECRET=your-secret
JWT_REFRESH_SECRET=your-refresh-secret

# Email
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Google OAuth
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret

# URLs
FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:4000
ALLOWED_ORIGINS=http://localhost:3000
```

### Frontend (.env)

```env
REACT_APP_API_URL=http://localhost:4000
```

See `.env.example` files for complete configuration.

---

## 🧪 Testing

### Backend Tests
```bash
cd backend
npm test
```

### Frontend Tests
```bash
cd frontend
npm test
```

---

## 🤝 Contributing

We welcome contributions! Here's how:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📝 API Documentation

### Authentication Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Create new account |
| POST | `/api/auth/login` | Email/password login |
| POST | `/api/auth/forgot-password` | Request password reset |
| POST | `/api/auth/reset-password` | Reset password with token |
| GET | `/api/auth/google` | Initiate Google OAuth |
| GET | `/api/auth/google/callback` | Google OAuth callback |
| POST | `/api/auth/refresh` | Refresh access token |
| POST | `/api/auth/logout` | Logout current session |

### User Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users/profile` | Get user profile |
| PUT | `/api/users/profile` | Update profile |
| POST | `/api/users/profile/photo` | Upload profile photo |

... (more endpoints in full API docs)

---

## 🔒 Security Features

- **Password Hashing** - bcrypt with 10 rounds
- **JWT Tokens** - Stateless authentication
- **Refresh Tokens** - Secure session management
- **CORS Protection** - Whitelist allowed origins
- **HTTPS Only** - Encrypted data transmission
- **SQL Injection Prevention** - Parameterized queries
- **XSS Protection** - Input sanitization
- **Rate Limiting** - Prevent brute force attacks
- **Email Verification** - Password reset tokens expire

---

## 📊 Database Schema

### Core Tables

- **users** - User accounts and roles
- **refresh_tokens** - JWT refresh tokens
- **password_reset_tokens** - Password reset tokens
- **student_profiles** - Extended student data
- **fees** - Fee obligations
- **attendance** - Attendance records
- **results** - Academic results
- **portfolio** - Student portfolios
- **announcements** - System announcements
- **notifications** - User notifications

... (14 tables total)

See `backend/src/db/schema.sql` for complete schema.

---

## 🌍 Supported Browsers

- ✅ Chrome (last 2 versions)
- ✅ Firefox (last 2 versions)
- ✅ Safari (last 2 versions)
- ✅ Edge (last 2 versions)
- ✅ Mobile browsers (iOS Safari, Chrome Android)

---

## 📞 Support

### Documentation
- Setup Guide: [SETUP_GUIDE.md](SETUP_GUIDE.md)
- Deployment: [DEPLOYMENT_GUIDE_LIVE.md](DEPLOYMENT_GUIDE_LIVE.md)
- Architecture: [ARCHITECTURE.md](ARCHITECTURE.md)

### Issues
Found a bug? [Open an issue](https://github.com/Etsiwah/compassionedu/issues)

### Contact
- Email: kwesiyakubuetsiwah@gmail.com
- GitHub: [@Etsiwah](https://github.com/Etsiwah)

---

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🎉 Acknowledgments

- [Compassion International](https://www.compassion.com/) - Inspiration and mission
- [React](https://reactjs.org/) - Amazing UI library
- [Express.js](https://expressjs.com/) - Excellent backend framework
- [Vercel](https://vercel.com/) - Seamless frontend hosting
- [Render](https://render.com/) - Reliable backend hosting
- [Supabase](https://supabase.com/) - Powerful PostgreSQL platform

---

## 🚀 Roadmap

### Phase 1 (Current)
- ✅ Authentication (Email/Password)
- ✅ Google OAuth
- ✅ Password Reset
- ✅ User Management
- ✅ Student Portal
- ✅ Admin Dashboard

### Phase 2 (Coming Soon)
- 🔄 Real-time notifications (WebSockets)
- 🔄 File upload to cloud (AWS S3/Cloudinary)
- 🔄 Advanced analytics
- 🔄 Parent portal enhancements
- 🔄 Mobile app (React Native)
- 🔄 Dark mode toggle

### Phase 3 (Future)
- 📱 Native mobile apps
- 🤖 AI-powered insights
- 📧 Email templates customization
- 🌐 Multi-language support
- 📊 Advanced reporting
- 🔔 Push notifications

---

## 💰 Pricing

### Free Tier
- ✅ Up to 1,000 users
- ✅ All core features
- ✅ 500 MB storage
- ✅ Email support

### Pro Tier ($52/month)
- ✅ Unlimited users
- ✅ 8 GB storage
- ✅ Priority support
- ✅ Custom domain
- ✅ Advanced analytics
- ✅ Daily backups

---

## 🌟 Star History

If you find this project useful, please consider giving it a ⭐!

[![Star History Chart](https://api.star-history.com/svg?repos=Etsiwah/compassionedu&type=Date)](https://star-history.com/#Etsiwah/compassionedu&Date)

---

## 📸 Screenshots

### Landing Page
![Landing Page](docs/screenshots/landing.png)

### Login Page
![Login](docs/screenshots/login.png)

### Student Dashboard
![Dashboard](docs/screenshots/dashboard.png)

### Admin Panel
![Admin](docs/screenshots/admin.png)

---

Made with ❤️ by [Etsiwah](https://github.com/Etsiwah)

**"Releasing children from poverty in Jesus' name."** - Compassion International

---

⭐ **Star this repo if you found it helpful!** ⭐
