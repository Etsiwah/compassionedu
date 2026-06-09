/**
 * Fees Router — endpoints for fee management.
 *
 * GET  /api/fees/summary          — aggregate totals (Admin only)
 * GET  /api/fees/:studentId       — fee records + payment history
 * POST /api/fees/:studentId/payments — record a payment (Admin/Teacher)
 *
 * Access control:
 *   - Students may only view their own fees (studentId === req.user.sub)
 *   - Admins may view any student's fees and record payments
 *   - Teachers may record payments
 *
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.7
 */

'use strict';

const express = require('express');
const requireAuth = require('../middleware/requireAuth');
const requireRole = require('../middleware/requireRole');
const {
  getFeeRecords,
  recordPayment,
  getFeesSummary,
} = require('../services/feeService');

const router = express.Router();

// ── Access-control helper ──────────────────────────────────────────────────────

/**
 * Middleware that allows admins to access any student's fees but restricts
 * students to their own records only.
 * Must be used after requireAuth.
 */
function requireSelfOrAdmin(req, res, next) {
  const { studentId } = req.params;
  const { sub: requesterId, role } = req.user;

  if (role === 'admin' || requesterId === studentId) {
    return next();
  }

  return res.status(403).json({ error: 'Access denied' });
}

// ── Routes ─────────────────────────────────────────────────────────────────────

/**
 * GET /api/fees/summary
 * Returns aggregate fee totals: total_collected, total_pending, total_overdue.
 * Admin only.
 * Requirement 8.2
 *
 * NOTE: This route must be defined BEFORE /:studentId to avoid Express
 * treating "summary" as a studentId parameter.
 */
router.get(
  '/summary',
  requireAuth,
  requireRole('admin'),
  async (_req, res, next) => {
    try {
      const summary = await getFeesSummary();
      res.json(summary);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/fees/:studentId
 * Returns all fee records for the student, each with a nested payments array.
 * Requirements 4.1, 4.2, 4.5
 */
router.get(
  '/:studentId',
  requireAuth,
  requireRole('admin', 'student', 'teacher', 'parent'),
  requireSelfOrAdmin,
  async (req, res, next) => {
    try {
      const records = await getFeeRecords(req.params.studentId);
      res.json(records);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/fees/:studentId/payments
 * Body: { fee_id, amount_paid, transaction_id?, receipt_ref? }
 * Records a payment against a specific fee record.
 * Admin and Teacher only.
 * Requirement 4.7
 */
router.post(
  '/:studentId/payments',
  requireAuth,
  requireRole('admin', 'teacher'),
  async (req, res, next) => {
    try {
      const { fee_id, amount_paid, transaction_id, receipt_ref } = req.body;

      if (!fee_id) {
        return res.status(400).json({ error: 'fee_id is required' });
      }

      const payment = await recordPayment(fee_id, {
        amount_paid,
        transaction_id,
        receipt_ref,
      });

      res.status(201).json(payment);
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
