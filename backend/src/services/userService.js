/**
 * User Service — CRUD operations for user management (Admin only).
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5
 */

'use strict';

const bcrypt = require('bcryptjs');
const pool = require('../db/pool');

const BCRYPT_ROUNDS = 12;

/**
 * List users with optional search, role filter, and pagination.
 * Search is case-insensitive and matches against name or email.
 * Only returns non-deleted users.
 *
 * @param {string|undefined} query   - substring to search in name/email
 * @param {string|undefined} role    - filter by role ('admin','student','teacher','parent')
 * @param {number} [page=1]          - 1-based page number
 * @param {number} [limit=20]        - records per page
 * @returns {Promise<{ users: object[], total: number, page: number, limit: number }>}
 */
async function listUsers(query, role, page = 1, limit = 20) {
  const safePage = Math.max(1, parseInt(page, 10) || 1);
  const safeLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const offset = (safePage - 1) * safeLimit;

  const conditions = ['deleted_at IS NULL'];
  const params = [];

  if (query && query.trim() !== '') {
    params.push(`%${query.trim()}%`);
    conditions.push(`(name ILIKE $${params.length} OR email ILIKE $${params.length})`);
  }

  if (role && role.trim() !== '') {
    params.push(role.trim());
    conditions.push(`role = $${params.length}`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // Count total matching records for pagination metadata
  const countResult = await pool.query(
    `SELECT COUNT(*) AS total FROM users ${whereClause}`,
    params
  );
  const total = parseInt(countResult.rows[0].total, 10);

  // Fetch the page of results
  params.push(safeLimit, offset);
  const { rows } = await pool.query(
    `SELECT id, role, name, email, school_level, location, is_active, created_at
     FROM users
     ${whereClause}
     ORDER BY created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  return { users: rows, total, page: safePage, limit: safeLimit };
}

/**
 * Create a new user account.
 * Hashes the password with bcrypt before storing.
 * Throws 409 if the email is already in use.
 *
 * @param {object} data
 * @param {string} data.role
 * @param {string} data.name
 * @param {string} data.email
 * @param {string} data.password
 * @param {string} [data.school_level]
 * @param {string} [data.location]
 * @returns {Promise<object>} created user (without password_hash)
 */
async function createUser(data) {
  const { role, name, email, password, school_level, location } = data;

  // Validate required fields
  if (!role || !name || !email || !password) {
    const err = new Error('role, name, email, and password are required');
    err.status = 400;
    throw err;
  }

  const validRoles = ['admin', 'student', 'teacher', 'parent', 'staff'];
  if (!validRoles.includes(role)) {
    const err = new Error(`role must be one of: ${validRoles.join(', ')}`);
    err.status = 400;
    throw err;
  }

  // Check for duplicate email (case-insensitive)
  const existing = await pool.query(
    'SELECT id FROM users WHERE LOWER(email) = LOWER($1)',
    [email]
  );
  if (existing.rows.length > 0) {
    const err = new Error('Email already in use');
    err.status = 409;
    throw err;
  }

  // Hash the password — never store plaintext (Requirement 1.9)
  const password_hash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  const { rows } = await pool.query(
    `INSERT INTO users (role, name, email, password_hash, school_level, location)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, role, name, email, school_level, location, is_active, created_at`,
    [role, name, email, password_hash, school_level || null, location || null]
  );

  return rows[0];
}

/**
 * Soft-delete a user by setting deleted_at = NOW() and is_active = false.
 * Historical records are preserved for audit purposes (Requirement 2.2).
 * Throws 404 if the user does not exist or is already deleted.
 *
 * @param {string} id - user UUID
 * @returns {Promise<object>} updated user record
 */
async function softDeleteUser(id) {
  const { rows } = await pool.query(
    `UPDATE users
     SET deleted_at = NOW(), is_active = FALSE
     WHERE id = $1 AND deleted_at IS NULL
     RETURNING id, role, name, email, is_active, deleted_at`,
    [id]
  );

  if (rows.length === 0) {
    const err = new Error('Resource not found');
    err.status = 404;
    throw err;
  }

  return rows[0];
}

module.exports = { listUsers, createUser, softDeleteUser };
