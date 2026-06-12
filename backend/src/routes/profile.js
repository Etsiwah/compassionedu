/**
 * Profile Router — endpoints for student profile management.
 */

'use strict';

const path = require('path');
const express = require('express');
const multer = require('multer');
const requireAuth = require('../middleware/requireAuth');
const requireRole = require('../middleware/requireRole');
const pool = require('../db/pool');
const fileService = require('../services/fileService');
const notificationService = require('../services/notificationService');
const {
  getProfile,
  updateProfile,
  addPhoto,
  setDefaultPhoto,
  searchStudents,
  addDocument,
} = require('../services/profileService');

const router = express.Router();

// ── Multer configuration ───────────────────────────────────────────────────────

function envMb(name, fallback) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

const ACCEPTED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_PROFILE_PHOTO_SIZE_MB = envMb('MAX_PROFILE_PHOTO_SIZE_MB', 10);
const MAX_FILE_SIZE_BYTES = MAX_PROFILE_PHOTO_SIZE_MB * 1024 * 1024;

/**
 * Resolve the upload directory relative to this file so it works regardless
 * of the working directory the server is started from.
 * Files land at: backend/uploads/photos/<filename>
 */
const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads', 'photos');

const storage = multer.diskStorage({
  destination(_req, _file, cb) {
    cb(null, UPLOAD_DIR);
  },
  filename(_req, file, cb) {
    // Prefix with timestamp to avoid collisions
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${unique}${ext}`);
  },
});

/**
 * MIME type filter — rejects files that are not JPEG, PNG, or WEBP.
 * Multer calls cb(error) to abort the upload; we use a custom error
 * so the global error handler can return the correct 422 shape.
 */
function fileFilter(_req, file, cb) {
  if (ACCEPTED_MIME_TYPES.has(file.mimetype)) {
    cb(null, true);
  } else {
    const err = new Error(
      'Invalid file type. Only JPEG, PNG, and WEBP images are accepted.'
    );
    err.status = 422;
    err.field = 'file';
    cb(err, false);
  }
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
});

const DOC_UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads', 'beneficiary-docs');
const docStorage = multer.diskStorage({
  destination(_req, _file, cb) {
    cb(null, DOC_UPLOAD_DIR);
  },
  filename(_req, file, cb) {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${unique}${ext}`);
  },
});
const docUpload = multer({
  storage: docStorage,
  limits: { fileSize: 20 * 1024 * 1024 },
});

/**
 * Wrap multer's single-file upload so that size-limit errors (which multer
 * surfaces as MulterError with code LIMIT_FILE_SIZE) are converted to the
 * standard 422 shape expected by the design's error table.
 */
function uploadPhoto(req, res, next) {
  upload.single('photo')(req, res, (err) => {
    if (!err) return next();

    // multer size-limit error
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(422).json({
        error: `File too large. Maximum allowed size is ${MAX_PROFILE_PHOTO_SIZE_MB} MB.`,
        field: 'file',
      });
    }

    // MIME type rejection or other multer error with a status we set
    if (err.status === 422) {
      return res.status(422).json({ error: err.message, field: 'file' });
    }

    // Unexpected error — pass to global handler
    next(err);
  });
}

function uploadDocument(req, res, next) {
  docUpload.single('file')(req, res, (err) => {
    if (!err) return next();
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(422).json({ error: 'File too large. Maximum size is 20 MB.', field: 'file' });
    }
    next(err);
  });
}

// ── Access-control helper ──────────────────────────────────────────────────────

/**
 * Middleware that allows admins to access any profile but restricts students
 * (and other non-admin roles) to their own profile only.
 * Must be used after requireAuth.
 */
function requireSelfOrAdmin(req, res, next) {
  const { userId } = req.params;
  const { sub: requesterId, role } = req.user;

  if (role === 'admin' || requesterId === userId) {
    return next();
  }

  return res.status(403).json({ error: 'Access denied' });
}

// ── Routes ─────────────────────────────────────────────────────────────────────

/**
 * GET /api/profile/:userId
 * Returns the combined profile (users + student_profiles + profile_photos).
 * Requirement 3.7
 */
router.get(
  '/:userId',
  requireAuth,
  requireRole('admin', 'student', 'teacher', 'parent', 'staff'),
  requireSelfOrAdmin,
  async (req, res, next) => {
    try {
      const profile = await getProfile(req.params.userId);
      res.json(profile);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * PATCH /api/profile/:userId
 * Body: all extended profile fields
 */
router.patch(
  '/:userId',
  requireAuth,
  requireRole('admin', 'student', 'staff'),
  requireSelfOrAdmin,
  async (req, res, next) => {
    try {
      const profile = await updateProfile(req.params.userId, req.body);
      res.json(profile);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/profile/:userId/photos
 * Multipart form-data with field "photo".
 * Validates MIME type (JPEG/PNG/WEBP) and size (≤ 10 MB).
 * Stores file metadata in profile_photos table.
 * Requirements 3.1, 3.2, 3.6
 */
router.post(
  '/:userId/photos',
  requireAuth,
  requireRole('admin', 'student', 'staff'),
  requireSelfOrAdmin,
  uploadPhoto,
  async (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(422).json({ error: 'No file uploaded.', field: 'file' });
      }

      // Build the public URL path for the stored file
      const url = `/uploads/photos/${req.file.filename}`;

      const photo = await addPhoto(req.params.userId, {
        filename: req.file.filename,
        url,
      });

      // Record file ownership + notify admins
      try {
        await fileService.recordOwnership(req.file.filename, req.user.sub, 'profile-photo');
        await notificationService.notifyAdmins('file_upload',
          `${req.user.name || req.user.sub} uploaded a profile photo`, req.user.sub);
      } catch { /* non-critical */ }

      res.status(201).json(photo);
    } catch (err) {
      next(err);
    }
  }
);

router.post(
  '/:userId/documents',
  requireAuth,
  requireRole('admin', 'student', 'staff'),
  requireSelfOrAdmin,
  uploadDocument,
  async (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(422).json({ error: 'No file uploaded.', field: 'file' });
      }
      req.file.file_url = `/uploads/beneficiary-docs/${req.file.filename}`;
      const document = await addDocument(req.params.userId, req.file, req.body, req.user.sub);
      res.status(201).json(document);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * PATCH /api/profile/:userId/photos/:photoId/default
 */
router.patch(
  '/:userId/photos/:photoId/default',
  requireAuth,
  requireRole('admin', 'student', 'staff'),
  requireSelfOrAdmin,
  async (req, res, next) => {
    try {
      const photo = await setDefaultPhoto(req.params.userId, req.params.photoId);
      res.json(photo);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/profile/search/students
 * Admin-only: search students by name, email, student ID, project number, parent phone.
 * Query: q, status, limit, offset
 */
router.get(
  '/search/students',
  requireAuth,
  requireRole('admin'),
  async (req, res, next) => {
    try {
      const { q, status, limit, offset } = req.query;
      const results = await searchStudents({
        q,
        status,
        limit: limit ? Number(limit) : 50,
        offset: offset ? Number(offset) : 0,
      });
      res.json(results);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/profile/parent/my-children
 * Returns all students linked to the logged-in parent.
 */
router.get(
  '/parent/my-children',
  requireAuth,
  requireRole('parent', 'admin'),
  async (req, res, next) => {
    try {
      const parentId = req.user.sub;
      const { rows } = await pool.query(
        `SELECT u.id, u.name, u.email, u.school_level, u.is_active,
                sp.level, sp.program, sp.school_name, sp.student_id_number,
                pp.url AS photo_url
         FROM parent_student_links psl
         JOIN users u ON u.id = psl.student_id
         LEFT JOIN student_profiles sp ON sp.user_id = u.id
         LEFT JOIN profile_photos pp ON pp.user_id = u.id AND pp.is_default = TRUE
         WHERE psl.parent_id = $1
           AND u.deleted_at IS NULL
         ORDER BY u.name ASC`,
        [parentId]
      );
      res.json(rows);
    } catch (err) { next(err); }
  }
);

/**
 * POST /api/profile/parent/link
 * Body: { studentId } — link a student to the logged-in parent.
 */
router.post(
  '/parent/link',
  requireAuth,
  requireRole('parent', 'admin'),
  async (req, res, next) => {
    try {
      const parentId = req.user.sub;
      const { studentId } = req.body;
      if (!studentId) {
        const e = new Error('studentId is required'); e.status = 422; throw e;
      }
      /* verify student exists */
      const { rows: check } = await pool.query(
        `SELECT id FROM users WHERE id = $1 AND role = 'student' AND deleted_at IS NULL`,
        [studentId]
      );
      if (!check.length) {
        const e = new Error('Student not found'); e.status = 404; throw e;
      }
      await pool.query(
        `INSERT INTO parent_student_links (parent_id, student_id)
         VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [parentId, studentId]
      );
      res.status(201).json({ message: 'Child linked successfully' });
    } catch (err) { next(err); }
  }
);

/**
 * DELETE /api/profile/parent/link/:studentId
 * Unlinks a student from the logged-in parent.
 */
router.delete(
  '/parent/link/:studentId',
  requireAuth,
  requireRole('parent', 'admin'),
  async (req, res, next) => {
    try {
      const parentId = req.user.sub;
      await pool.query(
        `DELETE FROM parent_student_links WHERE parent_id = $1 AND student_id = $2`,
        [parentId, req.params.studentId]
      );
      res.json({ message: 'Child unlinked' });
    } catch (err) { next(err); }
  }
);

router.patch('/:userId/staff-documents',
  requireAuth,
  requireRole('admin'),
  async (req, res, next) => {
    try {
      const { field, status } = req.body;
      const { approveStaffDocument } = require('../services/staffProfileService');
      const profile = await approveStaffDocument(req.params.userId, field, status);
      res.json(profile);
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
