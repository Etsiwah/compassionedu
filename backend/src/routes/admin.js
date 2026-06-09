'use strict';

const express = require('express');
const bcrypt  = require('bcryptjs');
const requireAuth = require('../middleware/requireAuth');
const requireRole = require('../middleware/requireRole');
const pool = require('../db/pool');
const {
  getCompassionDashboard,
  getContentModerationItems,
  moderateContent,
  getDashboardMetrics,
} = require('../services/adminService');
const audit = require('../services/auditService');
const staffWorkReportService = require('../services/staffWorkReportService');

const router = express.Router();

/**
 * GET /api/admin/dashboard/metrics
 * Returns aggregated platform statistics for the admin dashboard cards.
 */
router.get('/dashboard/metrics', requireAuth, requireRole('admin'), async (_req, res, next) => {
  try { res.json(await getDashboardMetrics()); } catch (e) { next(e); }
});

router.get('/dashboard', requireAuth, requireRole('admin'), async (_req, res, next) => {
  try { res.json(await getCompassionDashboard()); } catch (e) { next(e); }
});

router.get('/content', requireAuth, requireRole('admin'), async (_req, res, next) => {
  try { res.json(await getContentModerationItems()); } catch (e) { next(e); }
});

router.patch('/content/:id', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const { action } = req.body;
    res.json(await moderateContent(req.params.id, action));
  } catch (e) { next(e); }
});

/**
 * GET /api/admin/platform-analytics
 * Returns fee and attendance analytics for charts.
 */
router.get('/platform-analytics', requireAuth, requireRole('admin'), async (_req, res, next) => {
  try {
    const [feesRes, attendanceRes, resultsRes] = await Promise.all([
      pool.query(`
        SELECT
          TO_CHAR(created_at, 'YYYY-MM') AS month,
          SUM(amount) FILTER (WHERE status='paid') AS collected,
          SUM(amount) FILTER (WHERE status='pending') AS pending,
          SUM(amount) FILTER (WHERE status='overdue') AS overdue,
          COUNT(*) AS total_fees
        FROM fees
        WHERE created_at >= NOW() - INTERVAL '6 months'
        GROUP BY month
        ORDER BY month ASC
      `),
      pool.query(`
        SELECT
          TO_CHAR(date, 'YYYY-MM') AS month,
          COUNT(*) FILTER (WHERE status='present') AS present,
          COUNT(*) FILTER (WHERE status='absent') AS absent,
          COUNT(*) FILTER (WHERE status='late') AS late,
          COUNT(*) AS total
        FROM attendance
        WHERE date >= NOW() - INTERVAL '6 months'
        GROUP BY month
        ORDER BY month ASC
      `),
      pool.query(`
        SELECT
          subject,
          ROUND(AVG(marks), 1) AS avg_marks,
          COUNT(*) AS student_count
        FROM results
        GROUP BY subject
        ORDER BY avg_marks DESC
        LIMIT 10
      `),
    ]);
    res.json({
      fees:       feesRes.rows,
      attendance: attendanceRes.rows,
      results:    resultsRes.rows,
    });
  } catch (e) { next(e); }
});

/**
 * GET /api/admin/activity-logs
 * Returns audit trail for admin monitoring.
 * Query: role (filter by user role), action, limit, offset
 */
router.get('/activity-logs', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const { role, action, limit = 100, offset = 0 } = req.query;
    const logs = await audit.getLogs({ role, action, limit: Number(limit), offset: Number(offset) });
    res.json(logs);
  } catch (e) { next(e); }
});

/**
 * GET /api/admin/pending-registrations
 * Returns all users with status='pending', awaiting admin approval.
 */
router.get('/pending-registrations', requireAuth, requireRole('admin'), async (_req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, name, email, role, created_at
       FROM users
       WHERE status = 'pending' AND deleted_at IS NULL
       ORDER BY created_at ASC`
    );
    res.json(rows);
  } catch (e) { next(e); }
});

/**
 * PATCH /api/admin/users/:id/approve
 * Approves a pending user account.
 */
router.patch('/users/:id/approve', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `UPDATE users SET status = 'active', is_active = TRUE
       WHERE id = $1 AND deleted_at IS NULL
       RETURNING id, name, email, role`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'User not found' });
    res.json({ message: 'User approved successfully', user: rows[0] });
  } catch (e) { next(e); }
});

/**
 * PATCH /api/admin/users/:id/reject
 * Rejects a pending user account.
 */
router.patch('/users/:id/reject', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `UPDATE users SET status = 'rejected', is_active = FALSE
       WHERE id = $1 AND deleted_at IS NULL
       RETURNING id, name, email, role`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'User not found' });
    res.json({ message: 'User rejected', user: rows[0] });
  } catch (e) { next(e); }
});

/**
 * POST /api/admin/users/:id/reset-password
 * Admin resets a user's password and forces change on next login.
 * Body: { temporaryPassword }
 */
router.post('/users/:id/reset-password', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const { temporaryPassword } = req.body;
    if (!temporaryPassword || temporaryPassword.length < 8) {
      return res.status(400).json({ error: 'Temporary password must be at least 8 characters.' });
    }
    const hash = await bcrypt.hash(temporaryPassword, 10);
    const { rows } = await pool.query(
      `UPDATE users SET password_hash = $1, force_password_change = TRUE
       WHERE id = $2 AND deleted_at IS NULL
       RETURNING id`,
      [hash, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'User not found' });
    res.json({ message: 'Password reset. User must change password on next login.' });
  } catch (e) { next(e); }
});

/**
 * GET /api/admin/work-reports
 * Returns all staff work reports. Optional ?staff_id= filter.
 */
router.get('/work-reports', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    res.json(await staffWorkReportService.getAllReports(req.query.staff_id || null));
  } catch (e) { next(e); }
});

module.exports = router;
