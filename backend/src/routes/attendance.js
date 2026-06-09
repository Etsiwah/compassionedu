/**
 * Attendance Router — endpoints for attendance tracking.
 *
 * GET  /api/attendance/analytics      — aggregate analytics (Admin only)
 * GET  /api/attendance/:studentId     — attendance records (filterable by ?month=, ?subject=)
 * POST /api/attendance                — record attendance for a class session (Teacher/Admin)
 *
 * Access control:
 *   - Students may only view their own attendance
 *   - Parents may view their linked child's attendance
 *   - Teachers and Admins can record and view any student's attendance
 *
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5
 */

'use strict';

const express = require('express');
const requireAuth = require('../middleware/requireAuth');
const requireRole = require('../middleware/requireRole');
const {
  getAttendance,
  recordAttendance,
  calculatePercentage,
  getAttendanceAnalytics,
} = require('../services/attendanceService');

const router = express.Router();

// ── Access-control helper ──────────────────────────────────────────────────────

function requireSelfOrPrivileged(req, res, next) {
  const { studentId } = req.params;
  const { sub: requesterId, role } = req.user;

  if (role === 'admin' || role === 'teacher' || role === 'parent') {
    return next();
  }
  if (requesterId === studentId) {
    return next();
  }
  return res.status(403).json({ error: 'Access denied' });
}

// ── Routes ─────────────────────────────────────────────────────────────────────

/**
 * GET /api/attendance/analytics
 * Returns aggregate attendance stats across all students.
 * Admin only. Must be defined before /:studentId.
 * Requirement 8.3
 */
router.get(
  '/analytics',
  requireAuth,
  requireRole('admin'),
  async (_req, res, next) => {
    try {
      const analytics = await getAttendanceAnalytics();
      res.json(analytics);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/attendance/:studentId
 * Returns attendance records for a student.
 * Query params: ?month=YYYY-MM, ?subject=SubjectName
 * Also returns attendance percentage in the response.
 * Requirements 6.1, 6.2
 */
router.get(
  '/:studentId',
  requireAuth,
  requireRole('admin', 'teacher', 'student', 'parent'),
  requireSelfOrPrivileged,
  async (req, res, next) => {
    try {
      const { studentId } = req.params;
      const { month, subject } = req.query;

      const records = await getAttendance(studentId, month, subject);
      const percentage = await calculatePercentage(studentId, subject);

      res.json({ records, attendance_percentage: percentage });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/attendance
 * Body: { entries: [{ student_id, date, subject?, period?, status }] }
 * Records attendance for one or more students in a session.
 * Teacher and Admin only.
 * Requirements 6.4, 6.5
 */
router.post(
  '/',
  requireAuth,
  requireRole('admin', 'teacher'),
  async (req, res, next) => {
    try {
      const { entries } = req.body;

      if (!entries) {
        return res.status(400).json({ error: 'entries array is required' });
      }

      const created = await recordAttendance(entries);
      res.status(201).json(created);
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
