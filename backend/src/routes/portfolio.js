/**
 * Portfolio Router — endpoints for student portfolio and CV management.
 */

'use strict';

const path = require('path');
const express = require('express');
const multer = require('multer');
const requireAuth = require('../middleware/requireAuth');
const requireRole = require('../middleware/requireRole');
const fileService = require('../services/fileService');
const notificationService = require('../services/notificationService');
const {
  getPortfolio,
  uploadCV,
  addExperience,
  updateExperience,
  deleteExperience,
  uploadMedia,
  updateSkills,
  getGrowthTimeline,
} = require('../services/portfolioService');

const router = express.Router();

// ── Upload directory ───────────────────────────────────────────────────────────

function envMb(name, fallback) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

const PORTFOLIO_UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads', 'portfolio');

// ── CV multer configuration ────────────────────────────────────────────────────

const VALID_CV_MIMES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);
const MAX_CV_SIZE_MB = envMb('MAX_CV_SIZE_MB', 50);
const MAX_CV_SIZE_BYTES = MAX_CV_SIZE_MB * 1024 * 1024;

const cvStorage = multer.diskStorage({
  destination(_req, _file, cb) {
    cb(null, PORTFOLIO_UPLOAD_DIR);
  },
  filename(_req, file, cb) {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `cv-${unique}${ext}`);
  },
});

function cvFileFilter(_req, file, cb) {
  if (VALID_CV_MIMES.has(file.mimetype)) {
    cb(null, true);
  } else {
    const err = new Error('CV must be PDF or DOCX format');
    err.status = 422;
    err.field = 'file';
    cb(err, false);
  }
}

const cvUpload = multer({
  storage: cvStorage,
  fileFilter: cvFileFilter,
  limits: { fileSize: MAX_CV_SIZE_BYTES },
});

/**
 * Wraps multer CV upload to convert LIMIT_FILE_SIZE errors to the standard
 * 422 shape and surface MIME type rejections correctly.
 */
function uploadCVMiddleware(req, res, next) {
  cvUpload.single('cv')(req, res, (err) => {
    if (!err) return next();

    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(422).json({
        error: `CV file must not exceed ${MAX_CV_SIZE_MB}MB`,
        field: 'file',
      });
    }

    if (err.status === 422) {
      return res.status(422).json({ error: err.message, field: 'file' });
    }

    next(err);
  });
}

// ── Media multer configuration ─────────────────────────────────────────────────

const MAX_MEDIA_SIZE_MB = envMb('MAX_MEDIA_SIZE_MB', 50);
const MAX_MEDIA_SIZE_BYTES = MAX_MEDIA_SIZE_MB * 1024 * 1024;

const mediaStorage = multer.diskStorage({
  destination(_req, _file, cb) {
    cb(null, PORTFOLIO_UPLOAD_DIR);
  },
  filename(_req, file, cb) {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `media-${unique}${ext}`);
  },
});

const mediaUpload = multer({
  storage: mediaStorage,
  limits: { fileSize: MAX_MEDIA_SIZE_BYTES },
});

/**
 * Wraps multer media upload to convert LIMIT_FILE_SIZE errors to the standard
 * 422 shape.
 */
function uploadMediaMiddleware(req, res, next) {
  mediaUpload.single('media')(req, res, (err) => {
    if (!err) return next();

    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(422).json({
        error: `Media file must not exceed ${MAX_MEDIA_SIZE_MB}MB`,
        field: 'file',
      });
    }

    next(err);
  });
}

// ── Access-control helper ──────────────────────────────────────────────────────

/**
 * Allows admins to access any student's portfolio.
 * Students may only access their own portfolio.
 * Teachers and parents may view (read-only) — enforced by route-level requireRole.
 */
function requireSelfOrAdmin(req, res, next) {
  const { studentId } = req.params;
  const { sub, role } = req.user;
  if (role === 'admin' || sub === studentId) return next();
  return res.status(403).json({ error: 'Access denied' });
}

// ── Routes ─────────────────────────────────────────────────────────────────────

/**
 * GET /api/portfolio/:studentId
 * Returns the full portfolio: cv_url, experiences, media, skills.
 * Requirement 7.1, 7.2, 7.3, 7.4, 7.5
 */
router.get(
  '/:studentId',
  requireAuth,
  requireRole('admin', 'teacher', 'student', 'parent'),
  requireSelfOrAdmin,
  async (req, res, next) => {
    try {
      res.json(await getPortfolio(req.params.studentId));
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/portfolio/:studentId/cv
 * Multipart form-data with field "cv".
 * Validates MIME type (PDF/DOCX) and size (≤ 50MB).
 * Requirements 7.1, 7.6
 */
router.post(
  '/:studentId/cv',
  requireAuth,
  requireRole('admin', 'student'),
  requireSelfOrAdmin,
  uploadCVMiddleware,
  async (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'CV file is required', field: 'file' });
      }
      const result = await uploadCV(req.params.studentId, {
        mimetype: req.file.mimetype,
        size: req.file.size,
        url: `/uploads/portfolio/${req.file.filename}`,
      });
      // Record ownership + notify
      try {
        await fileService.recordOwnership(req.file.filename, req.user.sub, 'portfolio-cv');
        await notificationService.notifyAdmins('file_upload',
          `${req.user.name || req.user.sub} uploaded a CV`, req.user.sub);
      } catch { /* non-critical */ }
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/portfolio/:studentId/experiences
 * Body: { title, organization?, start_date, end_date?, description? }
 * Requirement 7.2
 */
router.post(
  '/:studentId/experiences',
  requireAuth,
  requireRole('admin', 'student'),
  requireSelfOrAdmin,
  async (req, res, next) => {
    try {
      res.status(201).json(await addExperience(req.params.studentId, req.body));
    } catch (err) {
      next(err);
    }
  }
);

/**
 * PUT /api/portfolio/:studentId/experiences/:id
 * Body: { title, organization?, start_date, end_date?, description? }
 * Requirement 7.2
 */
router.put(
  '/:studentId/experiences/:id',
  requireAuth,
  requireRole('admin', 'student'),
  requireSelfOrAdmin,
  async (req, res, next) => {
    try {
      res.json(await updateExperience(req.params.id, req.body));
    } catch (err) {
      next(err);
    }
  }
);

/**
 * DELETE /api/portfolio/:studentId/experiences/:id
 * Requirement 7.2
 */
router.delete(
  '/:studentId/experiences/:id',
  requireAuth,
  requireRole('admin', 'student'),
  requireSelfOrAdmin,
  async (req, res, next) => {
    try {
      await deleteExperience(req.params.id);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/portfolio/:studentId/media
 * Multipart form-data with field "media".
 * Validates size (≤ 50MB). Any MIME type is accepted for media.
 * Body fields: title?, description?
 * Requirements 7.3, 7.7
 */
router.post(
  '/:studentId/media',
  requireAuth,
  requireRole('admin', 'student'),
  requireSelfOrAdmin,
  uploadMediaMiddleware,
  async (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'Media file is required', field: 'file' });
      }
      const result = await uploadMedia(req.params.studentId, {
        mimetype: req.file.mimetype,
        size: req.file.size,
        url: `/uploads/portfolio/${req.file.filename}`,
        title: req.body.title,
        description: req.body.description,
      });
      // Record ownership + notify
      try {
        await fileService.recordOwnership(req.file.filename, req.user.sub, 'portfolio-media');
        await notificationService.notifyAdmins('file_upload',
          `${req.user.name || req.user.sub} uploaded portfolio media`, req.user.sub);
      } catch { /* non-critical */ }
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * PATCH /api/portfolio/:studentId/skills
 * Body: { skills: string[] }
 * Requirement 7.4
 */
router.patch(
  '/:studentId/skills',
  requireAuth,
  requireRole('admin', 'student'),
  requireSelfOrAdmin,
  async (req, res, next) => {
    try {
      res.json(await updateSkills(req.params.studentId, req.body.skills));
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/portfolio/:studentId/timeline
 * Returns experience entries sorted by start_date ascending.
 * Requirement 7.5
 */
router.get(
  '/:studentId/timeline',
  requireAuth,
  requireRole('admin', 'teacher', 'student', 'parent'),
  requireSelfOrAdmin,
  async (req, res, next) => {
    try {
      res.json(await getGrowthTimeline(req.params.studentId));
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
