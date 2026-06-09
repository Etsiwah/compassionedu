'use strict';

const path    = require('path');
const express = require('express');
const multer  = require('multer');
const requireAuth = require('../middleware/requireAuth');
const requireRole = require('../middleware/requireRole');
const svc = require('../services/resultUploadService');
const fileService = require('../services/fileService');
const notificationService = require('../services/notificationService');

const router = express.Router();

/* ── Multer setup ── */
const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads', 'results');
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename:    (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname).toLowerCase()}`);
  },
});
const fileFilter = (_req, file, cb) => {
  const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
  if (allowed.includes(file.mimetype)) return cb(null, true);
  const err = new Error('Only PDF, JPG, and PNG files are allowed');
  err.status = 422;
  cb(err, false);
};
const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
});

function handleUpload(req, res, next) {
  upload.single('file')(req, res, err => {
    if (!err) return next();
    if (err.code === 'LIMIT_FILE_SIZE')
      return res.status(422).json({ error: 'File too large. Maximum size is 20 MB.' });
    if (err.status === 422)
      return res.status(422).json({ error: err.message });
    next(err);
  });
}

/* ── Ensure uploads/results directory exists ── */
const fs = require('fs');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

/* ── Student routes ── */

// GET /api/result-uploads/level-structure
router.get('/level-structure', requireAuth, (_req, res) => {
  res.json(svc.LEVEL_STRUCTURE);
});

// POST /api/result-uploads — student uploads a result
router.post(
  '/',
  requireAuth,
  requireRole('student'),
  handleUpload,
  async (req, res, next) => {
    try {
      if (!req.file) return res.status(422).json({ error: 'No file uploaded.' });

      const { academic_level, year_label, period_label } = req.body;
      const studentId = req.user.sub;

      const result = await svc.uploadResult(studentId, {
        academic_level,
        year_label,
        period_label,
        file_name: req.file.originalname,
        file_url:  `/uploads/results/${req.file.filename}`,
        mime_type: req.file.mimetype,
        file_size: req.file.size,
      });

      // Record file ownership and notify admins
      try {
        await fileService.recordOwnership(req.file.filename, req.user.sub, 'result-upload');
        await notificationService.notifyAdmins('file_upload',
          `${req.user.name || req.user.sub} uploaded a result document`, req.user.sub);
      } catch { /* non-critical */ }

      res.status(201).json(result);
    } catch (err) { next(err); }
  }
);

// GET /api/result-uploads/my — student sees own uploads (all statuses)
router.get(
  '/my',
  requireAuth,
  requireRole('student'),
  async (req, res, next) => {
    try {
      const uploads = await svc.getStudentUploads(req.user.sub);
      res.json(uploads);
    } catch (err) { next(err); }
  }
);

// GET /api/result-uploads/my/performance — student performance summary
router.get(
  '/my/performance',
  requireAuth,
  requireRole('student'),
  async (req, res, next) => {
    try {
      const summary = await svc.getPerformanceSummary(req.user.sub);
      res.json(summary);
    } catch (err) { next(err); }
  }
);

// DELETE /api/result-uploads/:id — student deletes own pending upload
router.delete(
  '/:id',
  requireAuth,
  requireRole('student'),
  async (req, res, next) => {
    try {
      res.json(await svc.deleteUpload(req.params.id, req.user.sub));
    } catch (err) { next(err); }
  }
);

/* ── Admin routes ── */

// GET /api/result-uploads/admin/all
router.get(
  '/admin/all',
  requireAuth,
  requireRole('admin'),
  async (req, res, next) => {
    try {
      const { status, q, level, limit, offset } = req.query;
      const uploads = await svc.getAllUploads({
        status, q, level,
        limit:  limit  ? Number(limit)  : 100,
        offset: offset ? Number(offset) : 0,
      });
      res.json(uploads);
    } catch (err) { next(err); }
  }
);

// GET /api/result-uploads/admin/analytics
router.get(
  '/admin/analytics',
  requireAuth,
  requireRole('admin'),
  async (req, res, next) => {
    try {
      res.json(await svc.getAdminAnalytics());
    } catch (err) { next(err); }
  }
);

// GET /api/result-uploads/admin/student/:studentId
router.get(
  '/admin/student/:studentId',
  requireAuth,
  requireRole('admin'),
  async (req, res, next) => {
    try {
      const uploads = await svc.getStudentUploads(req.params.studentId);
      const perf    = await svc.getPerformanceSummary(req.params.studentId);
      res.json({ uploads, performance: perf });
    } catch (err) { next(err); }
  }
);

// PATCH /api/result-uploads/admin/:id/review
router.patch(
  '/admin/:id/review',
  requireAuth,
  requireRole('admin'),
  async (req, res, next) => {
    try {
      const { action, comment, performance_score } = req.body;
      const result = await svc.reviewUpload(req.params.id, req.user.sub, {
        action, comment, performance_score,
      });
      res.json(result);
    } catch (err) { next(err); }
  }
);

module.exports = router;
