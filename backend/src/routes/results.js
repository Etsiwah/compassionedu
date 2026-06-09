/**
 * Results Router — endpoints for examination results management.
 *
 * GET  /api/results/:studentId                    — get results (filterable by ?term=)
 * POST /api/results                               — create a result entry (Admin/Teacher)
 * GET  /api/results/:studentId/report-card/:term  — download PDF report card
 *
 * Access control:
 *   - Students may only view their own results (studentId === req.user.sub)
 *   - Parents may view their linked child's results
 *   - Admins and Teachers can create results and view any student's results
 *
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6
 */

'use strict';

const express = require('express');
const requireAuth = require('../middleware/requireAuth');
const requireRole = require('../middleware/requireRole');
const {
  getResults,
  createResult,
  calculateGPA,
  getPerformanceTrend,
  generateReportCardPDF,
} = require('../services/resultsService');

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
 * GET /api/results/:studentId
 * Requirements 5.1, 5.2, 5.3
 */
router.get(
  '/:studentId',
  requireAuth,
  requireRole('admin', 'teacher', 'student', 'parent'),
  requireSelfOrPrivileged,
  async (req, res, next) => {
    try {
      const { studentId } = req.params;
      const { term } = req.query;

      const results = await getResults(studentId, term || undefined);

      let gpa = null;
      let trend = null;

      if (term) {
        gpa = await calculateGPA(studentId, term);
      } else {
        trend = await getPerformanceTrend(studentId);
      }

      res.json({
        results,
        ...(term ? { gpa } : { performance_trend: trend }),
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/results
 * Body: { student_id, subject, marks, term }
 * Requirements 5.5, 5.6
 */
router.post(
  '/',
  requireAuth,
  requireRole('admin', 'teacher'),
  async (req, res, next) => {
    try {
      const { student_id, subject, marks, term } = req.body;
      const result = await createResult({ student_id, subject, marks, term });
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/results/:studentId/report-card/:term
 * Requirement 5.4
 */
router.get(
  '/:studentId/report-card/:term',
  requireAuth,
  requireRole('admin', 'teacher', 'student', 'parent'),
  requireSelfOrPrivileged,
  async (req, res, next) => {
    try {
      const { studentId, term } = req.params;

      const pdfBuffer = await generateReportCardPDF(studentId, term);

      const safeFilename = `report-card-${studentId}-${term.replace(/\s+/g, '-')}.pdf`;

      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${safeFilename}"`,
        'Content-Length': pdfBuffer.length,
      });

      res.send(pdfBuffer);
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
