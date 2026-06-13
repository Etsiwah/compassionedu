/**
 * CompassionEdu — Express application entry point.
 * Mounts all route modules and global middleware.
 */

'use strict';

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const app = express();

// ── Security Headers ──────────────────────────────────────────────────────────
app.use(helmet());

// ── Global middleware ──────────────────────────────────────────────────────────
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : ['http://localhost:3000', 'http://localhost:3001'];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (origin.endsWith('.vercel.app') || allowedOrigins.includes(origin) || process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }
    callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'],
}));

// Compression
try {
  const compression = require('compression');
  app.use(compression());
} catch { /* compression not installed — skip */ }

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ── Static file serving for uploads ───────────────────────────────────────────
// NOTE: /uploads is no longer served publicly.
// Files are served via the authenticated /api/files route below.
const path = require('path');
const UPLOAD_DIR = process.env.UPLOAD_DIR || 'uploads';

// ── Rate Limiting ─────────────────────────────────────────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 requests per windowMs
  message: { error: 'Too many requests from this IP, please try again after 15 minutes' },
  standardHeaders: true,
  legacyHeaders: false,
});

// ── Route modules ───────────────────────────

app.use('/api/auth', authLimiter, require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/profile', require('./routes/profile'));
app.use('/api/fees', require('./routes/fees'));
app.use('/api/results', require('./routes/results'));
app.use('/api/attendance', require('./routes/attendance'));
app.use('/api/portfolio', require('./routes/portfolio'));
app.use('/api/announcements', require('./routes/announcements'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/admin', require('./routes/admin'));

// Dev-only routes (blocked in production inside the router)
app.use('/api/dev', require('./routes/dev'));
app.use('/api/beneficiaries', require('./routes/beneficiaries'));
app.use('/api/staff', require('./routes/staff'));
app.use('/api/staff-portal', require('./routes/staffPortal'));
app.use('/api/result-uploads', require('./routes/resultUploads'));
app.use('/api/fee-uploads', require('./routes/feeUploads'));
app.use('/api/activities', require('./routes/activities'));
app.use('/api/portfolio-level', require('./routes/portfolioLevel'));
app.use('/api/files', require('./routes/files'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/health', require('./routes/health'));

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Environment check endpoint (temporary for debugging) ─────────────────────
app.get('/api/env-check', (_req, res) => {
  res.json({
    hasGoogleClientId: !!process.env.GOOGLE_CLIENT_ID,
    hasGoogleClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
    hasBackendUrl: !!process.env.BACKEND_URL,
    hasFrontendUrl: !!process.env.FRONTEND_URL,
    backendUrl: process.env.BACKEND_URL || 'NOT SET',
    frontendUrl: process.env.FRONTEND_URL || 'NOT SET',
    nodeEnv: process.env.NODE_ENV || 'NOT SET',
  });
});

// ── One-time seed endpoint (protected by secret key) ─────────────────────────
// Call: GET /api/setup-seed?key=YOUR_JWT_SECRET
// Use this to seed demo accounts on Render when Shell is unavailable
app.get('/api/setup-seed', async (req, res) => {
  const { key } = req.query;
  if (!key || key !== process.env.JWT_SECRET) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  try {
    const bcrypt = require('bcrypt');
    const pool   = require('./db/pool');

    const DEMO_ACCOUNTS = [
      { role: 'admin',   name: 'Admin User',        email: 'admin@compassionedu.com',    password: 'Admin@123'   },
      { role: 'staff',   name: 'Staff Member One',  email: 'staff1@compassionedu.com',   password: 'Staff@123'   },
      { role: 'staff',   name: 'Staff Member Two',  email: 'staff2@compassionedu.com',   password: 'Staff@123'   },
      { role: 'teacher', name: 'Teacher One',       email: 'teacher1@compassionedu.com', password: 'Teacher@123' },
      { role: 'student', name: 'Student One',       email: 'student1@compassionedu.com', password: 'Student@123' },
      { role: 'student', name: 'Student Two',       email: 'student2@compassionedu.com', password: 'Student@123' },
      { role: 'parent',  name: 'Parent One',        email: 'parent1@compassionedu.com',  password: 'Parent@123'  },
    ];

    const results = [];
    for (const account of DEMO_ACCOUNTS) {
      const password_hash = await bcrypt.hash(account.password, 10);
      await pool.query(
        `INSERT INTO users (role, name, email, password_hash, is_active, account_source, status)
         VALUES ($1, $2, $3, $4, TRUE, 'admin_added', 'active')
         ON CONFLICT (email) DO UPDATE
           SET role = EXCLUDED.role, name = EXCLUDED.name,
               password_hash = EXCLUDED.password_hash,
               is_active = TRUE, deleted_at = NULL, account_source = 'admin_added', status = 'active'`,
        [account.role, account.name, account.email, password_hash]
      );
      results.push(`✅ ${account.role}: ${account.email}`);
    }

    res.json({ success: true, seeded: results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Serve React Frontend (Single Port Mode) ──────────────────────────────────
const frontendPath = path.join(__dirname, '..', '..', 'frontend', 'build');
app.use(express.static(frontendPath));

// ── 404 / SPA fallback handler ────────────────────────────────────────────────
app.use((req, res, next) => {
  // If it's an API route that wasn't matched, return 404 JSON
  if (req.path.startsWith('/api/') || req.path.startsWith('/uploads/') || req.path.startsWith('/files/')) {
    return res.status(404).json({ error: 'Resource not found' });
  }
  
  // In production, frontend is deployed separately on Vercel - return simple status
  if (process.env.NODE_ENV === 'production') {
    return res.status(200).json({ 
      status: 'ok', 
      message: 'CompassionEdu API is running', 
      frontend: process.env.FRONTEND_URL || 'https://compassion-project-kappa.vercel.app'
    });
  }
  
  // In development, serve the built frontend if available
  res.sendFile(path.join(frontendPath, 'index.html'), (err) => {
    if (err) res.status(404).send('Frontend not built. Run npm run build in frontend directory.');
  });
});

// ── Global error handler ──────────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error(err.stack);
  const status = err.status || err.statusCode || 500;
  const message = status < 500 ? err.message : 'An unexpected error occurred';
  res.status(status).json({ error: message, ...(err.field ? { field: err.field } : {}) });
});

// ── Start server ──────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 4000;

if (require.main === module) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`CompassionEdu API listening on port ${PORT}`);

    // In development, remind devs about demo accounts
    if (process.env.NODE_ENV !== 'production') {
      console.log('\n📋  Demo accounts available at: http://localhost:3000/dev/accounts');
      console.log('    Run `npm run seed` to create them if not yet seeded.\n');
    }

    // Start fee scheduler: marks overdue fees and checks upcoming deadlines
    try {
      const { startFeeScheduler } = require('./jobs/feeScheduler');
      startFeeScheduler();
    } catch (err) {
      console.error('Failed to start fee scheduler:', err.message);
    }
  });
}

module.exports = app;
