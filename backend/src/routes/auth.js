/**
 * Auth routes — login, refresh, logout.
 * Mounted at /api/auth in app.js.
 * Requirements: 1.1, 1.2, 1.3
 */

'use strict';

const express = require('express');
const bcrypt = require('bcryptjs');
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

module.exports = router;
