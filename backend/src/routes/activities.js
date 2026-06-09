'use strict';

const path    = require('path');
const express = require('express');
const multer  = require('multer');
const fs      = require('fs');
const requireAuth = require('../middleware/requireAuth');
const requireRole = require('../middleware/requireRole');
const svc = require('../services/activitiesService');

const router = express.Router();

/* ── Multer setup ── */
function envMb(name, fallback) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

const MAX_MEDIA_SIZE_MB = envMb('MAX_MEDIA_SIZE_MB', 200);
const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads', 'activities');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename:    (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname).toLowerCase()}`);
  },
});

const PHOTO_MIMES = ['image/jpeg','image/png','image/jpg','image/webp'];
const VIDEO_MIMES = ['video/mp4','video/quicktime','video/webm'];
const ALL_MIMES   = [...PHOTO_MIMES, ...VIDEO_MIMES];

const fileFilter = (_req, file, cb) => {
  if (ALL_MIMES.includes(file.mimetype)) return cb(null, true);
  const err = new Error('Only JPG, PNG, MP4, MOV, WEBM files are allowed');
  err.status = 422; cb(err, false);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_MEDIA_SIZE_MB * 1024 * 1024 },
});

function handleUpload(req, res, next) {
  upload.array('media', 10)(req, res, err => {
    if (!err) return next();
    if (err.code === 'LIMIT_FILE_SIZE')
      return res.status(422).json({ error: `File too large. Maximum allowed size is ${MAX_MEDIA_SIZE_MB} MB.` });
    if (err.status === 422)
      return res.status(422).json({ error: err.message });
    next(err);
  });
}

/* ── Public: structure ── */
router.get('/structure', requireAuth, (_req, res) => {
  res.json(svc.ACTIVITY_STRUCTURE);
});

/* ── Feed (approved activities) ── */
router.get(
  '/feed',
  requireAuth,
  requireRole('admin', 'student', 'staff', 'teacher', 'parent'),
  async (req, res, next) => {
    try {
      const { level, category, search, limit, offset } = req.query;
      const feed = await svc.getFeed({
        level, category, search,
        limit:  limit  ? Number(limit)  : 20,
        offset: offset ? Number(offset) : 0,
      });
      res.json(feed);
    } catch (err) { next(err); }
  }
);

/* ── Student: get own activities ── */
router.get(
  '/my',
  requireAuth,
  requireRole('student', 'staff'),
  async (req, res, next) => {
    try {
      res.json(await svc.getStudentActivities(req.user.sub));
    } catch (err) { next(err); }
  }
);

/* ── Student: create activity + upload media ── */
router.post(
  '/',
  requireAuth,
  requireRole('student', 'staff'),
  handleUpload,
  async (req, res, next) => {
    try {
      const { title, description, school_level, year_label, category, location, activity_date } = req.body;

      const activity = await svc.createActivity(req.user.sub, {
        title, description, school_level, year_label, category, location, activity_date,
      });

      // Attach uploaded media
      if (req.files && req.files.length > 0) {
        const mediaItems = req.files.map(f => ({
          url:        `/uploads/activities/${f.filename}`,
          mime_type:  f.mimetype,
          file_name:  f.originalname,
          file_size:  f.size,
          media_type: PHOTO_MIMES.includes(f.mimetype) ? 'photo' : 'video',
        }));
        await svc.addActivityMedia(activity.id, req.user.sub, mediaItems);
      }

      res.status(201).json(activity);
    } catch (err) { next(err); }
  }
);

/* ── Get single activity ── */
router.get(
  '/:id',
  requireAuth,
  async (req, res, next) => {
    try {
      const act = await svc.getActivity(req.params.id, req.user.sub, req.user.role);
      res.json(act);
    } catch (err) { next(err); }
  }
);

/* ── Delete activity ── */
router.delete(
  '/:id',
  requireAuth,
  requireRole('student', 'staff', 'admin'),
  async (req, res, next) => {
    try {
      res.json(await svc.deleteActivity(req.params.id, req.user.sub, req.user.role));
    } catch (err) { next(err); }
  }
);

/* ── Comments ── */
router.post(
  '/:id/comments',
  requireAuth,
  async (req, res, next) => {
    try {
      const { content, parent_id } = req.body;
      res.status(201).json(await svc.addComment(req.params.id, req.user.sub, { content, parent_id }));
    } catch (err) { next(err); }
  }
);

router.patch(
  '/comments/:commentId',
  requireAuth,
  async (req, res, next) => {
    try {
      res.json(await svc.editComment(req.params.commentId, req.user.sub, req.body.content));
    } catch (err) { next(err); }
  }
);

router.delete(
  '/comments/:commentId',
  requireAuth,
  async (req, res, next) => {
    try {
      res.json(await svc.deleteComment(req.params.commentId, req.user.sub, req.user.role));
    } catch (err) { next(err); }
  }
);

/* ── Reactions ── */
router.post(
  '/:id/react',
  requireAuth,
  async (req, res, next) => {
    try {
      const result = await svc.toggleReaction(req.params.id, req.user.sub, req.body.reaction);
      const reactions = await svc.getReactions(req.params.id);
      res.json({ ...result, reactions });
    } catch (err) { next(err); }
  }
);

/* ── Admin routes ── */
router.get(
  '/admin/all',
  requireAuth,
  requireRole('admin'),
  async (req, res, next) => {
    try {
      const { status, level, search, limit, offset } = req.query;
      res.json(await svc.getAllActivities({
        status, level, search,
        limit:  limit  ? Number(limit)  : 100,
        offset: offset ? Number(offset) : 0,
      }));
    } catch (err) { next(err); }
  }
);

router.get(
  '/admin/analytics',
  requireAuth,
  requireRole('admin'),
  async (req, res, next) => {
    try { res.json(await svc.getAdminAnalytics()); }
    catch (err) { next(err); }
  }
);

router.patch(
  '/admin/:id/review',
  requireAuth,
  requireRole('admin'),
  async (req, res, next) => {
    try {
      const { action, comment } = req.body;
      res.json(await svc.reviewActivity(req.params.id, req.user.sub, { action, comment }));
    } catch (err) { next(err); }
  }
);

module.exports = router;
