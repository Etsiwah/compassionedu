/**
 * Auth routes — login, refresh, logout.
 * Mounted at /api/auth in app.js.
 * Requirements: 1.1, 1.2, 1.3
 */

'use strict';

const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const authService = require('../services/authService');
const requireAuth = require('../middleware/requireAuth');
const { validateRegistration, validateLogin, validateChangePassword } = require('../middleware/validators');
const pool = require('../db/pool');
const notificationService = require('../services/notificationService');

const router = express.Router();

/**
 * POST /api/auth/register
 * Body: { name, email, password, role? }
 * Self-registration — creates a PENDING account. No token is issued.
 * Admin must approve before the user can log in.
 */
router.post('/register', validateRegistration, async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;

    // Only allow student/staff self-registration; admin/teacher/parent via admin panel
    const allowedRoles = ['student', 'staff'];
    const userRole = allowedRoles.includes(role) ? role : 'student';

    // Check for duplicate email
    const { rows: existing } = await pool.query(
      'SELECT id FROM users WHERE LOWER(email) = LOWER($1)',
      [email]
    );
    if (existing.length > 0) {
      const err = new Error('An account with this email already exists');
      err.status = 409;
      throw err;
    }

    const password_hash = await bcrypt.hash(password, 10);

    // Insert with status='pending' — no tokens issued
    const { rows } = await pool.query(
      `INSERT INTO users (role, name, email, password_hash, account_source, status, is_active)
       VALUES ($1, $2, $3, $4, 'self_registered', 'pending', FALSE)
       RETURNING id, role, name, email`,
      [userRole, name, email, password_hash]
    );

    const user = rows[0];

    // Notify all admins about the new registration
    try {
      await notificationService.notifyAdmins(
        'new_registration',
        `New registration: ${user.name} (${user.email}) — role: ${user.role}`,
        user.id
      );
    } catch { /* notification failure should not block registration */ }

    res.status(201).json({
      message: 'Registration received. Your account is pending admin approval. You will be able to log in once approved.',
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/auth/login
 * Body: { email, password }
 * Returns: { token, refreshToken, user }
 */
router.post('/login', validateLogin, async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await authService.login(email, password);
    const { accessToken, refreshToken } = await authService.issueTokens(user);

    res.json({
      token: accessToken,
      refreshToken,
      user: {
        id: user.id,
        role: user.role,
        name: user.name,
        email: user.email,
        force_password_change: user.force_password_change ?? false,
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/auth/refresh
 * Body: { refreshToken }
 * Returns: { token, refreshToken, user }
 */
router.post('/refresh', async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    const result = await authService.refreshToken(refreshToken);

    res.json({
      token: result.accessToken,
      refreshToken: result.refreshToken,
      user: {
        id: result.user.id,
        role: result.user.role,
        name: result.user.name,
        email: result.user.email,
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/auth/change-password
 * Body: { currentPassword, newPassword }
 * Returns: 200 OK with success message
 */
router.post('/change-password', requireAuth, validateChangePassword, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    await authService.changePassword(req.user.sub, currentPassword, newPassword);
    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/auth/logout
 * Requires valid JWT. Invalidates the specific refresh token provided in the body.
 * Body: { refreshToken }
 * Returns: 204 No Content
 */
router.post('/logout', requireAuth, async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) {
      await authService.logoutSession(refreshToken);
    }
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/auth/logout-all
 * Requires valid JWT. Invalidates all refresh tokens for the user.
 * Returns: 204 No Content
 */
router.post('/logout-all', requireAuth, async (req, res, next) => {
  try {
    await authService.logoutAll(req.user.sub);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/auth/forgot-password
 * Body: { email }
 * Sends password reset email if account exists
 * Returns: 200 OK (always, to prevent email enumeration)
 */
router.post('/forgot-password', async (req, res, next) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      const err = new Error('Email is required');
      err.status = 400;
      throw err;
    }

    await authService.requestPasswordReset(email);
    
    // Always return success to prevent email enumeration
    res.json({ 
      message: 'If an account with that email exists, a password reset link has been sent.' 
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/auth/reset-password
 * Body: { token, newPassword }
 * Resets password using the token from email
 * Returns: 200 OK
 */
router.post('/reset-password', async (req, res, next) => {
  try {
    const { token, newPassword } = req.body;
    
    if (!token || !newPassword) {
      const err = new Error('Token and new password are required');
      err.status = 400;
      throw err;
    }

    if (newPassword.length < 8) {
      const err = new Error('Password must be at least 8 characters');
      err.status = 400;
      throw err;
    }

    await authService.resetPassword(token, newPassword);
    
    res.json({ message: 'Password reset successfully. You can now log in with your new password.' });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/auth/google
 * Redirects to Google OAuth consent screen
 */
router.get('/google', (req, res) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = `${process.env.BACKEND_URL || 'http://localhost:4000'}/api/auth/google/callback`;
  const scope = 'profile email';
  const state = req.query.state || 'default'; // Can pass state for frontend navigation
  
  const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${clientId}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&response_type=code` +
    `&scope=${encodeURIComponent(scope)}` +
    `&state=${state}`;
  
  res.redirect(googleAuthUrl);
});

/**
 * GET /api/auth/google/callback
 * Google OAuth callback handler
 */
router.get('/google/callback', async (req, res, next) => {
  try {
    const { code } = req.query;
    
    if (!code) {
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/login?error=google_auth_failed`);
    }

    // Exchange code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: `${process.env.BACKEND_URL || 'http://localhost:4000'}/api/auth/google/callback`,
        grant_type: 'authorization_code',
      }),
    });

    const tokenData = await tokenResponse.json();
    
    if (!tokenData.access_token) {
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/login?error=google_auth_failed`);
    }

    // Get user info from Google
    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    const googleUser = await userInfoResponse.json();
    
    // Find or create user
    let { rows } = await pool.query(
      'SELECT id, role, name, email, is_active, deleted_at, status FROM users WHERE LOWER(email) = LOWER($1)',
      [googleUser.email]
    );

    let user = rows[0];

    if (!user) {
      // Create new user with Google account
      const { rows: newUserRows } = await pool.query(
        `INSERT INTO users (role, name, email, password_hash, account_source, status, is_active)
         VALUES ('student', $1, $2, $3, 'google', 'active', TRUE)
         RETURNING id, role, name, email`,
        [googleUser.name, googleUser.email, await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10)]
      );
      user = newUserRows[0];
      
      // Send welcome email
      try {
        const emailService = require('../services/emailService');
        await emailService.sendWelcomeEmail(user.email, user.name);
      } catch {}
    } else {
      // Check if account is active
      if (user.status === 'pending') {
        return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/login?error=account_pending`);
      }
      
      if (!user.is_active || user.deleted_at) {
        return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/login?error=account_inactive`);
      }

      // Update last login
      await pool.query('UPDATE users SET last_login_at = NOW() WHERE id = $1', [user.id]);
    }

    // Issue tokens
    const { accessToken, refreshToken } = await authService.issueTokens(user);

    // Redirect to frontend with tokens
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth-callback?token=${accessToken}&refreshToken=${refreshToken}`);
  } catch (err) {
    console.error('Google OAuth error:', err);
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/login?error=google_auth_failed`);
  }
});

module.exports = router;
