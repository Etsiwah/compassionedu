'use strict';

/**
 * Staff Router — Admin-only staff management.
 * Staff members are users with role='staff' in the users table.
 * Mounted at /api/staff in app.js.
 */

const express = require('express');
const bcrypt  = require('bcryptjs');
const requireAuth = require('../middleware/requireAuth');
const requireRole = require('../middleware/requireRole');
const pool = require('../db/pool');

const router = express.Router();
router.use(requireAuth, requireRole('admin'));

const STAFF_FIELDS = `
  id, name, email, phone, staff_role, is_active, account_source,
  last_login_at, created_at
`;

/**
 * GET /api/staff
 * Query: q (name/email search), status (active|inactive|suspended), source (admin_added|self_registered)
 */
router.get('/', async (req, res, next) => {
  try {
    const { q, status, source } = req.query;
    const conditions = ["role = 'staff'", 'deleted_at IS NULL'];
    const params = [];

    if (q && q.trim()) {
      params.push(`%${q.trim()}%`);
      conditions.push(`(name ILIKE $${params.length} OR email ILIKE $${params.length})`);
    }

    if (status === 'active')   conditions.push("is_active = TRUE");
    if (status === 'inactive') conditions.push("is_active = FALSE");

    if (source === 'admin_added' || source === 'self_registered') {
      params.push(source);
      conditions.push(`account_source = $${params.length}`);
    }

    const { rows } = await pool.query(
      `SELECT ${STAFF_FIELDS}
       FROM users
       WHERE ${conditions.join(' AND ')}
       ORDER BY created_at DESC`,
      params
    );

    res.json(rows);
  } catch (err) { next(err); }
});

/**
 * POST /api/staff
 * Body: { name, email, password, phone?, staff_role?, is_active? }
 * Creates a new staff user (account_source = 'admin_added').
 */
router.post('/', async (req, res, next) => {
  try {
    const { name, email, password, phone, staff_role, is_active = true } = req.body;

    if (!name || !email || !password) {
      const err = new Error('name, email, and password are required');
      err.status = 400;
      throw err;
    }

    // Check duplicate
    const { rows: existing } = await pool.query(
      'SELECT id FROM users WHERE LOWER(email) = LOWER($1)',
      [email]
    );
    if (existing.length > 0) {
      const err = new Error('Email already in use');
      err.status = 409;
      throw err;
    }

    const password_hash = await bcrypt.hash(password, 10);

    const { rows } = await pool.query(
      `INSERT INTO users (role, name, email, password_hash, phone, staff_role, is_active, account_source)
       VALUES ('staff', $1, $2, $3, $4, $5, $6, 'admin_added')
       RETURNING ${STAFF_FIELDS}`,
      [name.trim(), email.trim(), password_hash, phone || null, staff_role || null, is_active]
    );

    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
});

/**
 * PUT /api/staff/:id
 * Body: { name?, email?, phone?, staff_role?, is_active? }
 */
router.put('/:id', async (req, res, next) => {
  try {
    const { name, email, phone, staff_role, is_active } = req.body;
    const setClauses = [];
    const params = [];

    if (name       !== undefined) { params.push(name.trim());  setClauses.push(`name = $${params.length}`); }
    if (email      !== undefined) { params.push(email.trim()); setClauses.push(`email = $${params.length}`); }
    if (phone      !== undefined) { params.push(phone);        setClauses.push(`phone = $${params.length}`); }
    if (staff_role !== undefined) { params.push(staff_role);   setClauses.push(`staff_role = $${params.length}`); }
    if (is_active  !== undefined) { params.push(is_active);    setClauses.push(`is_active = $${params.length}`); }

    if (setClauses.length === 0) {
      const err = new Error('No fields to update'); err.status = 400; throw err;
    }

    params.push(req.params.id);
    const { rows } = await pool.query(
      `UPDATE users
       SET ${setClauses.join(', ')}
       WHERE id = $${params.length} AND role = 'staff' AND deleted_at IS NULL
       RETURNING ${STAFF_FIELDS}`,
      params
    );

    if (rows.length === 0) {
      const err = new Error('Staff member not found'); err.status = 404; throw err;
    }

    res.json(rows[0]);
  } catch (err) { next(err); }
});

/**
 * PATCH /api/staff/:id/toggle
 * Toggles is_active (suspend / activate).
 */
router.patch('/:id/toggle', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `UPDATE users
       SET is_active = NOT is_active
       WHERE id = $1 AND role = 'staff' AND deleted_at IS NULL
       RETURNING ${STAFF_FIELDS}`,
      [req.params.id]
    );

    if (rows.length === 0) {
      const err = new Error('Staff member not found'); err.status = 404; throw err;
    }

    res.json(rows[0]);
  } catch (err) { next(err); }
});

/**
 * DELETE /api/staff/:id
 * Soft-deletes the staff member.
 */
router.delete('/:id', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `UPDATE users
       SET deleted_at = NOW(), is_active = FALSE
       WHERE id = $1 AND role = 'staff' AND deleted_at IS NULL
       RETURNING id`,
      [req.params.id]
    );

    if (rows.length === 0) {
      const err = new Error('Staff member not found'); err.status = 404; throw err;
    }

    res.json({ success: true });
  } catch (err) { next(err); }
});

module.exports = router;
