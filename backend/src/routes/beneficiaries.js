'use strict';

const fs = require('fs');
const path = require('path');
const express = require('express');
const multer = require('multer');
const requireAuth = require('../middleware/requireAuth');
const requireRole = require('../middleware/requireRole');
const svc = require('../services/beneficiaryService');

const router = express.Router();

const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads', 'beneficiary-docs');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname).toLowerCase()}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/jpg',
      'image/webp',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    if (allowed.includes(file.mimetype)) return cb(null, true);
    const err = new Error('Only PDF, image, and Word document files are allowed');
    err.status = 422;
    cb(err, false);
  },
});

function handleUpload(req, res, next) {
  upload.single('file')(req, res, err => {
    if (!err) return next();
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(422).json({ error: 'File too large. Maximum size is 20 MB.' });
    }
    if (err.status === 422) return res.status(422).json({ error: err.message });
    next(err);
  });
}

router.use(requireAuth, requireRole('admin'));

router.get('/overview', async (_req, res, next) => {
  try {
    res.json(await svc.getBeneficiaryOverview());
  } catch (err) {
    next(err);
  }
});

router.get('/', async (req, res, next) => {
  try {
    const {
      search,
      status,
      sponsorshipStatus,
      institution,
      level,
      gender,
      region,
      district,
      sponsor,
    } = req.query;

    res.json(await svc.listBeneficiaries({
      search,
      status,
      sponsorshipStatus,
      institution,
      level,
      gender,
      region,
      district,
      sponsor,
    }));
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const beneficiary = await svc.createBeneficiary(req.body, req.user.sub);
    res.status(201).json(beneficiary);
  } catch (err) {
    next(err);
  }
});

router.get('/:id/export.pdf', async (req, res, next) => {
  try {
    const buffer = await svc.generateBeneficiaryPdf(req.params.id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="beneficiary-${req.params.id}.pdf"`);
    res.send(buffer);
  } catch (err) {
    next(err);
  }
});

router.post('/:id/documents', handleUpload, async (req, res, next) => {
  try {
    if (req.file) req.file.file_url = `/uploads/beneficiary-docs/${req.file.filename}`;
    const document = await svc.addDocument(req.params.id, req.user.sub, req.file, req.body);
    res.status(201).json(document);
  } catch (err) {
    next(err);
  }
});

router.post('/:id/activity', async (req, res, next) => {
  try {
    res.status(201).json(await svc.addActivityLog(req.params.id, req.user.sub, req.body));
  } catch (err) {
    next(err);
  }
});

router.post('/:id/promote', async (req, res, next) => {
  try {
    res.json(await svc.promoteBeneficiary(req.params.id, req.user.sub, req.body));
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    res.json(await svc.getBeneficiaryById(req.params.id));
  } catch (err) {
    next(err);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    res.json(await svc.updateBeneficiary(req.params.id, req.body, req.user.sub));
  } catch (err) {
    next(err);
  }
});

router.patch('/:id', async (req, res, next) => {
  try {
    res.json(await svc.updateBeneficiary(req.params.id, req.body, req.user.sub));
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    res.json(await svc.deleteBeneficiary(req.params.id, req.user.sub));
  } catch (err) {
    next(err);
  }
});

module.exports = router;
