'use strict';

const path    = require('path');
const express = require('express');
const multer  = require('multer');
const fs      = require('fs');
const requireAuth = require('../middleware/requireAuth');
const requireRole = require('../middleware/requireRole');
const svc = require('../services/portfolioLevelService');

const router = express.Router();

/* ── Multer ── */
function envMb(name, fallback) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

const MAX_CV_SIZE_MB = envMb('MAX_CV_SIZE_MB', 50);
const MAX_MEDIA_SIZE_MB = envMb('MAX_MEDIA_SIZE_MB', 200);
const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads', 'portfolio');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename:    (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname).toLowerCase()}`);
  },
});

const cvFilter = (_req, file, cb) => {
  const ok = ['application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
  if (ok.includes(file.mimetype)) return cb(null, true);
  const e = new Error('CV must be PDF or DOCX'); e.status = 422; cb(e, false);
};

const mediaFilter = (_req, file, cb) => {
  // Allow images, videos, PDFs, and documents for portfolio level projects
  const ok = [
    'image/jpeg', 'image/png', 'image/jpg', 'image/webp', 'image/gif',
    'video/mp4', 'video/quicktime', 'video/webm',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  ];
  if (ok.includes(file.mimetype)) return cb(null, true);
  const e = new Error('Only images, videos, PDFs, and document files are allowed'); e.status = 422; cb(e, false);
};

const cvUpload = multer({ storage, fileFilter: cvFilter, limits: { fileSize: MAX_CV_SIZE_MB * 1024 * 1024 } });
const mediaUpload = multer({ storage, fileFilter: mediaFilter, limits: { fileSize: MAX_MEDIA_SIZE_MB * 1024 * 1024 } });

function wrap(upload) {
  return (req, res, next) => {
    upload(req, res, err => {
      if (!err) return next();
      if (err.code === 'LIMIT_FILE_SIZE') return res.status(422).json({ error: 'File too large.' });
      if (err.status === 422) return res.status(422).json({ error: err.message });
      next(err);
    });
  };
}

/* ── Access control ── */
function selfOrAdmin(req, res, next) {
  const { studentId } = req.params;
  if (req.user.role === 'admin' || req.user.sub === studentId) return next();
  return res.status(403).json({ error: 'Access denied' });
}

/* ── Structure ── */
router.get('/structure', requireAuth, (_req, res) => {
  res.json({ levels: svc.ACADEMIC_LEVELS, cv_categories: svc.CV_CATEGORIES });
});

/* ── Current level ── */
router.get('/:studentId/current-level', requireAuth, selfOrAdmin, async (req, res, next) => {
  try { res.json({ academic_level: await svc.getCurrentLevel(req.params.studentId) }); }
  catch (e) { next(e); }
});

router.put('/:studentId/current-level', requireAuth, requireRole('student','admin'), selfOrAdmin, async (req, res, next) => {
  try { res.json(await svc.setCurrentLevel(req.params.studentId, req.body.academic_level)); }
  catch (e) { next(e); }
});

/* ── Level portfolio (all data for one level) ── */
router.get('/:studentId/level/:level', requireAuth, selfOrAdmin, async (req, res, next) => {
  try { res.json(await svc.getLevelPortfolio(req.params.studentId, req.params.level)); }
  catch (e) { next(e); }
});

/* ── CV ── */
router.post('/:studentId/cv', requireAuth, requireRole('student','admin'), selfOrAdmin,
  wrap(cvUpload.single('cv')), async (req, res, next) => {
    try {
      if (!req.file) return res.status(422).json({ error: 'No file uploaded.' });
      const { academic_level, cv_category } = req.body;
      res.status(201).json(await svc.uploadLevelCV(req.params.studentId, {
        academic_level, cv_category: cv_category || 'Academic CV',
        file_name: req.file.originalname,
        file_url:  `/uploads/portfolio/${req.file.filename}`,
        mime_type: req.file.mimetype,
        file_size: req.file.size,
      }));
    } catch (e) { next(e); }
  }
);

/* ── Skills ── */
router.post('/:studentId/skills', requireAuth, requireRole('student','admin'), selfOrAdmin, async (req, res, next) => {
  try { res.status(201).json(await svc.addLevelSkill(req.params.studentId, req.body)); }
  catch (e) { next(e); }
});

router.delete('/:studentId/skills/:skillId', requireAuth, requireRole('student','admin'), selfOrAdmin, async (req, res, next) => {
  try { res.json(await svc.deleteLevelSkill(req.params.skillId, req.params.studentId)); }
  catch (e) { next(e); }
});

/* ── Projects ── */
router.post('/:studentId/projects', requireAuth, requireRole('student','admin'), selfOrAdmin,
  wrap(mediaUpload.single('file')), async (req, res, next) => {
    try {
      const { academic_level, title, description, tags } = req.body;
      res.status(201).json(await svc.addLevelProject(req.params.studentId, {
        academic_level, title, description,
        tags: tags ? (Array.isArray(tags) ? tags : tags.split(',').map(t => t.trim())) : [],
        file_url:  req.file ? `/uploads/portfolio/${req.file.filename}` : null,
        file_name: req.file?.originalname || null,
        mime_type: req.file?.mimetype || null,
        file_size: req.file?.size || null,
      }));
    } catch (e) { next(e); }
  }
);

router.delete('/:studentId/projects/:projectId', requireAuth, requireRole('student','admin'), selfOrAdmin, async (req, res, next) => {
  try { res.json(await svc.deleteLevelProject(req.params.projectId, req.params.studentId)); }
  catch (e) { next(e); }
});

/* ── Experiences ── */
router.post('/:studentId/experiences', requireAuth, requireRole('student','admin'), selfOrAdmin, async (req, res, next) => {
  try { res.status(201).json(await svc.addLevelExperience(req.params.studentId, req.body)); }
  catch (e) { next(e); }
});

router.delete('/:studentId/experiences/:expId', requireAuth, requireRole('student','admin'), selfOrAdmin, async (req, res, next) => {
  try { res.json(await svc.deleteLevelExperience(req.params.expId, req.params.studentId)); }
  catch (e) { next(e); }
});

/* ── Growth timeline ── */
router.get('/:studentId/timeline', requireAuth, selfOrAdmin, async (req, res, next) => {
  try { res.json(await svc.getGrowthTimeline(req.params.studentId)); }
  catch (e) { next(e); }
});

/* ── Admin: full portfolio ── */
router.get('/:studentId/full', requireAuth, requireRole('admin'), async (req, res, next) => {
  try { res.json(await svc.getStudentFullPortfolio(req.params.studentId)); }
  catch (e) { next(e); }
});

module.exports = router;
