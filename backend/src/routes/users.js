'use strict';

const express = require('express');
const requireAuth = require('../middleware/requireAuth');
const requireRole = require('../middleware/requireRole');
const { validateRegistration } = require('../middleware/validators');
const { listUsers, createUser, softDeleteUser } = require('../services/userService');
const audit = require('../services/auditService');
const pool = require('../db/pool');

const router = express.Router();

/** GET /api/users/me - Get current user's profile (all authenticated users) */
router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, role, name, email, created_at, last_login_at FROM users WHERE id = $1 AND deleted_at IS NULL',
      [req.user.sub]
    );
    if (rows.length === 0) {
      const err = new Error('User not found');
      err.status = 404;
      throw err;
    }
    res.json(rows[0]);
  } catch (err) { next(err); }
});

router.use(requireRole('admin'));

/** GET /api/users */
router.get('/', async (req, res, next) => {
  try {
    const { q, role, page, limit } = req.query;
    const result = await listUsers(q, role, page, limit);
    res.json(result);
  } catch (err) { next(err); }
});

/** POST /api/users — enforces single-admin rule */
router.post('/', validateRegistration, async (req, res, next) => {
  try {
    // Prevent creating a second admin
    if (req.body.role === 'admin') {
      const { rows } = await pool.query(
        "SELECT COUNT(*) AS cnt FROM users WHERE role = 'admin' AND deleted_at IS NULL"
      );
      if (parseInt(rows[0].cnt, 10) >= 1) {
        const err = new Error('Only one admin account is allowed in the system');
        err.status = 403;
        throw err;
      }
    }

    const user = await createUser(req.body);

    await audit.log({
      userId: req.user.sub,
      role: req.user.role,
      name: req.user.name,
      action: 'user_created',
      entityType: 'user',
      entityId: user.id,
      details: { created_role: user.role, email: user.email },
    });

    res.status(201).json(user);
  } catch (err) { next(err); }
});

/** DELETE /api/users/:id — prevents deleting the admin */
router.delete('/:id', async (req, res, next) => {
  try {
    // Prevent deleting the admin account
    const { rows } = await pool.query(
      "SELECT role FROM users WHERE id = $1 AND deleted_at IS NULL",
      [req.params.id]
    );
    if (rows.length > 0 && rows[0].role === 'admin') {
      const err = new Error('The admin account cannot be deleted');
      err.status = 403;
      throw err;
    }

    const user = await softDeleteUser(req.params.id);

    await audit.log({
      userId: req.user.sub,
      role: req.user.role,
      name: req.user.name,
      action: 'user_deleted',
      entityType: 'user',
      entityId: req.params.id,
    });

    res.json(user);
  } catch (err) { next(err); }
});

module.exports = router;
