'use strict';

const express = require('express');
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');

const requireAuth = require('../middleware/requireAuth');
const requireRole = require('../middleware/requireRole');
const healthService = require('../services/healthService');
const fileService = require('../services/fileService');
const notificationService = require('../services/notificationService');

const router = express.Router();

/* ── Multer setup ── */
const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads', 'health');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

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
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
});

function handleUpload(req, res, next) {
  upload.single('file')(req, res, err => {
    if (!err) return next();
    if (err.code === 'LIMIT_FILE_SIZE')
      return res.status(422).json({ error: 'File too large. Maximum size is 10 MB.' });
    if (err.status === 422)
      return res.status(422).json({ error: err.message });
    next(err);
  });
}

/* ── Student Routes ── */

// POST /api/health — Upload a new health record
router.post(
  '/',
  requireAuth,
  requireRole('student'),
  handleUpload,
  async (req, res, next) => {
    try {
      if (!req.file) return res.status(422).json({ error: 'No file uploaded.' });

      const { record_type, description } = req.body;
      if (!['insurance_card', 'hospital_bill', 'other'].includes(record_type)) {
        return res.status(400).json({ error: 'Invalid record_type.' });
      }

      const studentId = req.user.sub || req.user.id;
      const file_url = `/uploads/health/${req.file.filename}`;

      const record = await healthService.uploadRecord(studentId, {
        record_type,
        file_url,
        description
      });

      // Record file ownership and notify admins
      try {
        await fileService.recordOwnership(req.file.filename, studentId, 'health-upload');
        await notificationService.notifyAdmins('health_upload',
          `${req.user.name || studentId} uploaded a health record`, studentId);
      } catch (e) { 
        console.error('Failed to notify admins or record ownership', e); 
      }

      res.status(201).json(record);
    } catch (err) { next(err); }
  }
);

// GET /api/health/my — Get student's own records
router.get(
  '/my',
  requireAuth,
  requireRole('student'),
  async (req, res, next) => {
    try {
      const studentId = req.user.sub || req.user.id;
      const records = await healthService.getStudentRecords(studentId);
      res.json(records);
    } catch (err) { next(err); }
  }
);

// DELETE /api/health/:id — Delete a pending record
router.delete(
  '/:id',
  requireAuth,
  requireRole('student'),
  async (req, res, next) => {
    try {
      const studentId = req.user.sub || req.user.id;
      const deleted = await healthService.deleteRecord(req.params.id, studentId);
      
      // Optionally remove file from disk
      try {
        const filename = deleted.file_url.split('/').pop();
        const filePath = path.join(UPLOAD_DIR, filename);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      } catch (e) {
        console.error('Failed to delete file from disk', e);
      }

      res.json({ message: 'Record deleted successfully' });
    } catch (err) { 
      res.status(400).json({ error: err.message });
    }
  }
);

/* ── Admin Routes ── */

// GET /api/health/admin/all — Get all health records
router.get(
  '/admin/all',
  requireAuth,
  requireRole('admin'),
  async (req, res, next) => {
    try {
      const { status, limit, offset } = req.query;
      const records = await healthService.getAllRecords({
        status,
        limit: limit ? Number(limit) : 100,
        offset: offset ? Number(offset) : 0
      });
      res.json(records);
    } catch (err) { next(err); }
  }
);

// PATCH /api/health/admin/:id/review — Review a record
router.patch(
  '/admin/:id/review',
  requireAuth,
  requireRole('admin'),
  async (req, res, next) => {
    try {
      const { status, admin_notes } = req.body;
      if (!['approved', 'rejected', 'pending'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status.' });
      }

      const record = await healthService.reviewRecord(req.params.id, {
        status,
        admin_notes
      });
      res.json(record);
    } catch (err) { 
      res.status(400).json({ error: err.message });
    }
  }
);

module.exports = router;
