'use strict';

const path    = require('path');
const express = require('express');
const multer  = require('multer');
const fs      = require('fs');
const requireAuth = require('../middleware/requireAuth');
const requireRole = require('../middleware/requireRole');
const svc = require('../services/feeUploadService');
const fileService = require('../services/fileService');
const notificationService = require('../services/notificationService');

const router = express.Router();

/* ── Multer ── */
const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads', 'fee-receipts');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename:    (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname).toLowerCase()}`);
  },
});
const fileFilter = (_req, file, cb) => {
  // Allow images and document files for fee receipts
  const allowed = [
    'application/pdf',
    'image/jpeg', 'image/png', 'image/jpg', 'image/webp',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ];
  if (allowed.includes(file.mimetype)) return cb(null, true);
  const err = new Error('Only PDF, images, Word, and Excel files are allowed');
  err.status = 422; cb(err, false);
};
const upload = multer({ storage, fileFilter, limits: { fileSize: 20 * 1024 * 1024 } });

function handleUpload(req, res, next) {
  upload.single('receipt')(req, res, err => {
    if (!err) return next();
    if (err.code === 'LIMIT_FILE_SIZE')
      return res.status(422).json({ error: 'File too large. Maximum 20 MB.' });
    if (err.status === 422)
      return res.status(422).json({ error: err.message });
    next(err);
  });
}

/* ── Public: level structure ── */
router.get('/level-structure', requireAuth, (_req, res) => {
  res.json(svc.FEE_LEVEL_STRUCTURE);
});

router.get('/payment-methods', requireAuth, (_req, res) => {
  res.json(svc.PAYMENT_METHODS);
});

/* ── Student routes ── */

// GET /api/fee-uploads/my/summary
router.get('/my/summary', requireAuth, requireRole('student'), async (req, res, next) => {
  try { res.json(await svc.getFeeSummary(req.user.sub)); }
  catch (err) { next(err); }
});

// GET /api/fee-uploads/my/payments
router.get('/my/payments', requireAuth, requireRole('student'), async (req, res, next) => {
  try { res.json(await svc.getStudentPayments(req.user.sub)); }
  catch (err) { next(err); }
});

// POST /api/fee-uploads/my/pay — upload payment proof
router.post('/my/pay', requireAuth, requireRole('student'), handleUpload, async (req, res, next) => {
  try {
    if (!req.file) return res.status(422).json({ error: 'No receipt file uploaded.' });

    const {
      fee_record_id, academic_level, year_label, period_label,
      amount_paid, payment_method, transaction_id, payment_date,
    } = req.body;

    const result = await svc.uploadPayment(req.user.sub, {
      fee_record_id: fee_record_id || null,
      academic_level, year_label, period_label,
      amount_paid: Number(amount_paid),
      payment_method, transaction_id, payment_date,
      file_name: req.file.originalname,
      file_url:  `/uploads/fee-receipts/${req.file.filename}`,
      mime_type: req.file.mimetype,
      file_size: req.file.size,
    });

    // Record file ownership and notify admins
    try {
      await fileService.recordOwnership(req.file.filename, req.user.sub, 'fee-receipt');
      await notificationService.notifyAdmins('file_upload',
        `${req.user.name || req.user.sub} uploaded a fee receipt`, req.user.sub);
    } catch { /* non-critical — don't block the response */ }

    res.status(201).json(result);
  } catch (err) { next(err); }
});

/* ── Admin routes ── */

// GET /api/fee-uploads/admin/payments
router.get('/admin/payments', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const { status, q, level, limit, offset } = req.query;
    res.json(await svc.getAllPayments({
      status, q, level,
      limit:  limit  ? Number(limit)  : 100,
      offset: offset ? Number(offset) : 0,
    }));
  } catch (err) { next(err); }
});

// GET /api/fee-uploads/admin/records
router.get('/admin/records', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const { q, level, status, limit, offset } = req.query;
    res.json(await svc.getAllFeeRecords({
      q, level, status,
      limit:  limit  ? Number(limit)  : 100,
      offset: offset ? Number(offset) : 0,
    }));
  } catch (err) { next(err); }
});

// GET /api/fee-uploads/admin/analytics
router.get('/admin/analytics', requireAuth, requireRole('admin'), async (req, res, next) => {
  try { res.json(await svc.getAdminFeeAnalytics()); }
  catch (err) { next(err); }
});

// POST /api/fee-uploads/admin/records — create/update fee record for a student
router.post('/admin/records', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    res.status(201).json(await svc.upsertFeeRecord(req.user.sub, req.body));
  } catch (err) { next(err); }
});

// PATCH /api/fee-uploads/admin/payments/:id/review
router.patch('/admin/payments/:id/review', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const { action, comment } = req.body;
    res.json(await svc.reviewPayment(req.params.id, req.user.sub, { action, comment }));
  } catch (err) { next(err); }
});

module.exports = router;
