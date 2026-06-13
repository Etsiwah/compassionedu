'use strict';

/**
 * Staff Portal Routes — endpoints accessible by staff role.
 * Mounted at /api/staff-portal in app.js.
 * These are READ-ONLY views staff are permitted to access.
 */

const express = require('express');
const requireAuth = require('../middleware/requireAuth');
const requireRole = require('../middleware/requireRole');
const pool = require('../db/pool');
const audit = require('../services/auditService');
const staffProfileService = require('../services/staffProfileService');
const staffWorkReportService = require('../services/staffWorkReportService');

const router = express.Router();
router.use(requireAuth, requireRole('staff', 'admin'));

/**
 * GET /api/staff-portal/students
 * Staff can view the student list (name, email, status only — no sensitive data).
 */
router.get('/students', async (req, res, next) => {
  try {
    const { q } = req.query;
    const conditions = ["role = 'student'", 'deleted_at IS NULL'];
    const params = [];

    if (q && q.trim()) {
      params.push(`%${q.trim()}%`);
      conditions.push(`(name ILIKE $${params.length} OR email ILIKE $${params.length})`);
    }

    const { rows } = await pool.query(
      `SELECT id, name, email, school_level, is_active, created_at
       FROM users
       WHERE ${conditions.join(' AND ')}
       ORDER BY name ASC`,
      params
    );

    res.json({ users: rows, total: rows.length });
  } catch (err) { next(err); }
});

/**
 * GET /api/staff-portal/announcements
 * Staff can view announcements targeted at all, teacher, or staff.
 */
router.get('/announcements', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT a.id, a.title, a.content, a.target_role, a.created_at,
              u.name AS created_by_name
       FROM announcements a
       LEFT JOIN users u ON u.id = a.created_by
       WHERE a.target_role IN ('all', 'teacher', 'staff')
       ORDER BY a.created_at DESC`
    );
    res.json(rows);
  } catch (err) { next(err); }
});

/**
 * GET /api/staff-portal/metrics
 * Basic metrics for the staff dashboard home.
 */
router.get('/metrics', async (req, res, next) => {
  try {
    const userId = req.user.sub;
    
    const [studentsRes, announcementsRes, unreadAnnouncementsRes] = await Promise.all([
      pool.query("SELECT COUNT(*) AS cnt FROM users WHERE role = 'student' AND deleted_at IS NULL"),
      pool.query("SELECT COUNT(*) AS cnt FROM announcements WHERE target_role IN ('all','teacher','staff','everyone') AND deleted_at IS NULL"),
      pool.query(
        `SELECT COUNT(*) AS cnt FROM announcements a
         WHERE a.target_role IN ('staff', 'everyone') 
         AND a.deleted_at IS NULL
         AND NOT EXISTS (
           SELECT 1 FROM announcement_reads ar 
           WHERE ar.announcement_id = a.id AND ar.user_id = $1
         )`,
        [userId]
      ),
    ]);

    res.json({
      total_students:       Number(studentsRes.rows[0].cnt),
      total_announcements:  Number(announcementsRes.rows[0].cnt),
      unread_notifications: Number(unreadAnnouncementsRes.rows[0].cnt),
    });
  } catch (err) { next(err); }
});

/**
 * POST /api/staff-portal/attendance
 * Staff can record attendance (same as teacher).
 */
router.post('/attendance', async (req, res, next) => {
  try {
    const { student_id, subject, date, status, period } = req.body;

    if (!student_id || !date || !status) {
      const err = new Error('student_id, date, and status are required');
      err.status = 400;
      throw err;
    }

    const validStatuses = ['present', 'absent', 'late'];
    if (!validStatuses.includes(status)) {
      const err = new Error('status must be present, absent, or late');
      err.status = 400;
      throw err;
    }

    const { rows } = await pool.query(
      `INSERT INTO attendance (student_id, subject, date, status, period)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, student_id, subject, date, status, period, created_at`,
      [student_id, subject || null, date, status, period || null]
    );

    await audit.log({
      userId: req.user.sub,
      role: req.user.role,
      name: req.user.name,
      action: 'attendance_recorded',
      entityType: 'attendance',
      entityId: rows[0].id,
      details: { student_id, date, status },
    });

    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
});

/**
 * GET /api/staff-portal/me/profile
 * Returns the authenticated staff member's own profile.
 * User identity is taken exclusively from req.user.sub (the verified JWT subject).
 */
router.get('/me/profile', async (req, res, next) => {
  try {
    const profile = await staffProfileService.getStaffProfile(req.user.sub);
    res.json(profile);
  } catch (err) { next(err); }
});

/**
 * ALL /api/staff-portal/me/profile (non-GET methods)
 * Returns 405 Method Not Allowed for any mutating request.
 */
router.all('/me/profile', (req, res) => {
  res.status(405).json({ error: 'Method not allowed' });
});

/**
 * POST /api/staff-portal/work-reports
 * Staff submits a daily work report.
 */
router.post('/work-reports', async (req, res, next) => {
  try {
    const report = await staffWorkReportService.createReport(req.user.sub, req.body);
    res.status(201).json(report);
  } catch (e) { next(e); }
});

/**
 * GET /api/staff-portal/work-reports/my
 * Returns the authenticated staff member's own work reports.
 */
router.get('/work-reports/my', async (req, res, next) => {
  try {
    res.json(await staffWorkReportService.getMyReports(req.user.sub));
  } catch (e) { next(e); }
});

module.exports = router;
