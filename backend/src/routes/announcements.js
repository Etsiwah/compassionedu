'use strict';

const express = require('express');
const requireAuth = require('../middleware/requireAuth');
const requireRole = require('../middleware/requireRole');
const { getAnnouncementsForUser, createAnnouncement, markAsRead } = require('../services/announcementsService');

const router = express.Router();

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const { sub, role } = req.user;
    res.json(await getAnnouncementsForUser(sub, role));
  } catch (e) { next(e); }
});

router.post('/', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const announcement = await createAnnouncement({ ...req.body, created_by: req.user.sub });
    res.status(201).json(announcement);
  } catch (e) { next(e); }
});

router.patch('/:id/read', requireAuth, async (req, res, next) => {
  try {
    await markAsRead(req.params.id, req.user.sub);
    res.status(204).send();
  } catch (e) { next(e); }
});

module.exports = router;
