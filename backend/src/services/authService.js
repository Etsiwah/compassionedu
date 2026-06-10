/**
 * Auth Service — login, token issuance, refresh, and logout.
 * Requirement 1.1, 1.2, 1.3, 1.9
 */

'use strict';

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const pool = require('../db/pool');

const ACCESS_TOKEN_SECRET = process.env.JWT_SECRET || 'changeme-jwt-secret';
const REFRESH_TOKEN_SECRET = process.env.JWT_REFRESH_SECRET || 'changeme-refresh-secret';
const ACCESS_TOKEN_EXPIRY = process.env.JWT_EXPIRES_IN || '24h';
const REFRESH_TOKEN_EXPIRY = process.env.REFRESH_TOKEN_EXPIRES_IN || '30d';

function parseDurationMs(value, fallbackMs) {
  if (!value) return fallbackMs;

  const match = String(value).trim().match(/^(\d+)(ms|s|m|h|d)?$/i);
  if (!match) return fallbackMs;

  const amount = Number(match[1]);
  const unit = (match[2] || 'ms').toLowerCase();
  const multipliers = {
    ms: 1,
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };

  return amount * multipliers[unit];
}

function hashRefreshToken(token) {
  return crypto.createHmac('sha256', REFRESH_TOKEN_SECRET).update(token).digest('hex');
}

/**
 * Authenticate a user by email and password.
 * Returns the user record (without password_hash) on success.
 * Throws a 401 error on invalid credentials.
 *
 * @param {string} email
 * @param {string} password
 * @returns {Promise<object>} user
 */
async function login(email, password) {
  if (!email || !password) {
    const err = new Error('Email and password are required');
    err.status = 400;
    throw err;
  }

  const { rows } = await pool.query(
    `SELECT id, role, name, email, password_hash, is_active, deleted_at, status, force_password_change
     FROM users
     WHERE LOWER(email) = LOWER($1)`,
    [email]
  );

  const user = rows[0];

  // Use a constant-time comparison path even when user is not found to
  // prevent timing-based user enumeration attacks.
  const dummyHash = '$2b$10$invalidhashfortimingprotection000000000000000000000000';
  const hashToCompare = user ? user.password_hash : dummyHash;

  const passwordMatch = await bcrypt.compare(password, hashToCompare);

  if (!user || !passwordMatch) {
    const err = new Error('Invalid email or password');
    err.status = 401;
    throw err;
  }

  // Check account status before allowing login
  if (user.status === 'pending') {
    const err = new Error('Your account is pending admin approval.');
    err.status = 403;
    throw err;
  }

  if (!user.is_active || user.deleted_at) {
    const err = new Error('Your account has been deactivated. Please contact an administrator.');
    err.status = 403;
    throw err;
  }

  // Record last login timestamp
  await pool.query(
    'UPDATE users SET last_login_at = NOW() WHERE id = $1',
    [user.id]
  );

  // Audit log — imported lazily to avoid circular deps
  try {
    const audit = require('./auditService');
    await audit.log({ userId: user.id, role: user.role, name: user.name, action: 'login', entityType: 'session' });
  } catch {}

  // Return user without sensitive fields
  const { password_hash, deleted_at, ...safeUser } = user;
  return safeUser;
}



/**
 * Issue an access token and a refresh token for the given user.
 * Stores the refresh token hash in the database.
 *
 * @param {object} user - { id, role, name, email }
 * @returns {Promise<{ accessToken: string, refreshToken: string }>}
 */
async function issueTokens(user) {
  const accessToken = jwt.sign(
    { sub: user.id, role: user.role },
    ACCESS_TOKEN_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRY }
  );

  // Generate a cryptographically random refresh token
  const rawRefreshToken = crypto.randomBytes(64).toString('hex');
  const tokenHash = hashRefreshToken(rawRefreshToken);

  const expiresAt = new Date();
  expiresAt.setTime(expiresAt.getTime() + parseDurationMs(REFRESH_TOKEN_EXPIRY, 30 * 24 * 60 * 60 * 1000));

  await pool.query(
    `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
     VALUES ($1, $2, $3)`,
    [user.id, tokenHash, expiresAt]
  );

  return { accessToken, refreshToken: rawRefreshToken };
}

/**
 * Validate a refresh token and issue a new access token.
 * Rotates the refresh token (deletes old, inserts new).
 *
 * @param {string} token - raw refresh token
 * @returns {Promise<{ accessToken: string, refreshToken: string, user: object }>}
 */
async function refreshToken(token) {
  if (!token) {
    const err = new Error('Refresh token is required');
    err.status = 400;
    throw err;
  }

  const tokenHash = hashRefreshToken(token);

  const { rows } = await pool.query(
    `SELECT rt.id, rt.user_id, rt.expires_at,
            u.id AS uid, u.role, u.name, u.email, u.is_active, u.deleted_at
     FROM refresh_tokens rt
     JOIN users u ON u.id = rt.user_id
     WHERE rt.token_hash = $1`,
    [tokenHash]
  );

  const record = rows[0];

  if (!record) {
    const err = new Error('Authentication required');
    err.status = 401;
    throw err;
  }

  if (new Date(record.expires_at) < new Date()) {
    // Clean up expired token
    await pool.query('DELETE FROM refresh_tokens WHERE id = $1', [record.id]);
    const err = new Error('Authentication required');
    err.status = 401;
    throw err;
  }

  if (!record.is_active || record.deleted_at) {
    await pool.query('DELETE FROM refresh_tokens WHERE id = $1', [record.id]);
    const err = new Error('Authentication required');
    err.status = 401;
    throw err;
  }

  // Delete the used refresh token (rotation)
  await pool.query('DELETE FROM refresh_tokens WHERE id = $1', [record.id]);

  const user = { id: record.uid, role: record.role, name: record.name, email: record.email };
  const tokens = await issueTokens(user);

  return { ...tokens, user };
}

/**
 * Invalidate all refresh tokens for a user (logout all devices).
 *
 * @param {string} userId
 * @returns {Promise<void>}
 */
async function logoutAll(userId) {
  await pool.query('DELETE FROM refresh_tokens WHERE user_id = $1', [userId]);
}

/**
 * Invalidate a specific refresh token (logout from current device).
 *
 * @param {string} token
 * @returns {Promise<void>}
 */
async function logoutSession(token) {
  if (!token) return;
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  await pool.query('DELETE FROM refresh_tokens WHERE token_hash = $1', [tokenHash]);
}

/**
 * Change user password.
 * Checks current password and updates with new password.
 *
 * @param {string} userId
 * @param {string} currentPassword
 * @param {string} newPassword
 * @returns {Promise<void>}
 */
async function changePassword(userId, currentPassword, newPassword) {
  const { rows } = await pool.query(
    'SELECT password_hash FROM users WHERE id = $1 AND deleted_at IS NULL',
    [userId]
  );
  if (rows.length === 0) {
    const err = new Error('User not found');
    err.status = 404;
    throw err;
  }
  const user = rows[0];

  const match = await bcrypt.compare(currentPassword, user.password_hash);
  if (!match) {
    const err = new Error('Incorrect current password');
    err.status = 400;
    throw err;
  }

  const newHash = await bcrypt.hash(newPassword, 10);
  await pool.query(
    'UPDATE users SET password_hash = $1, force_password_change = FALSE WHERE id = $2',
    [newHash, userId]
  );
}

/**
 * Request a password reset token
 * Generates a token and sends reset email
 *
 * @param {string} email
 * @returns {Promise<void>}
 */
async function requestPasswordReset(email) {
  const { rows } = await pool.query(
    'SELECT id, name, email FROM users WHERE LOWER(email) = LOWER($1) AND deleted_at IS NULL',
    [email]
  );

  // Always return success to prevent email enumeration
  if (rows.length === 0) {
    return;
  }

  const user = rows[0];
  
  // Generate secure random token
  const resetToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
  
  // Token expires in 1 hour
  const expiresAt = new Date();
  expiresAt.setTime(expiresAt.getTime() + 60 * 60 * 1000);

  // Store hashed token in database
  await pool.query(
    `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
     VALUES ($1, $2, $3)
     ON CONFLICT (user_id) DO UPDATE 
     SET token_hash = $2, expires_at = $3, created_at = NOW()`,
    [user.id, tokenHash, expiresAt]
  );

  // Send reset email
  const emailService = require('./emailService');
  await emailService.sendPasswordResetEmail(user.email, resetToken, user.name);
}

/**
 * Reset password using token
 *
 * @param {string} token
 * @param {string} newPassword
 * @returns {Promise<void>}
 */
async function resetPassword(token, newPassword) {
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

  const { rows } = await pool.query(
    `SELECT prt.user_id, prt.expires_at, u.email
     FROM password_reset_tokens prt
     JOIN users u ON u.id = prt.user_id
     WHERE prt.token_hash = $1 AND u.deleted_at IS NULL`,
    [tokenHash]
  );

  if (rows.length === 0) {
    const err = new Error('Invalid or expired reset token');
    err.status = 400;
    throw err;
  }

  const record = rows[0];

  if (new Date(record.expires_at) < new Date()) {
    // Clean up expired token
    await pool.query('DELETE FROM password_reset_tokens WHERE user_id = $1', [record.user_id]);
    const err = new Error('Invalid or expired reset token');
    err.status = 400;
    throw err;
  }

  // Hash new password
  const newHash = await bcrypt.hash(newPassword, 10);
  
  // Update password and delete reset token
  await pool.query(
    'UPDATE users SET password_hash = $1, force_password_change = FALSE WHERE id = $2',
    [newHash, record.user_id]
  );
  
  await pool.query('DELETE FROM password_reset_tokens WHERE user_id = $1', [record.user_id]);

  // Audit log
  try {
    const audit = require('./auditService');
    await audit.log({ 
      userId: record.user_id, 
      action: 'password_reset', 
      entityType: 'user',
      details: { email: record.email }
    });
  } catch {}
}

module.exports = { 
  login, 
  issueTokens, 
  refreshToken, 
  logoutAll, 
  logoutSession, 
  changePassword,
  requestPasswordReset,
  resetPassword
};
