'use strict';

const express    = require('express');
const requireAuth = require('../middleware/requireAuth');
const fileService = require('../services/fileService');

const router = express.Router();

/**
 * GET /api/files/:filename
 * Serves a file from the uploads directory.
 * Requires authentication; enforces file ownership (admins bypass).
 */
router.get('/:filename', requireAuth, async (req, res, next) => {
  try {
    const filePath = await fileService.serveFile(
      req.params.filename,
      req.user.sub,
      req.user.role
    );
    res.sendFile(filePath);
  } catch (e) { next(e); }
});

module.exports = router;
