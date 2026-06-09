'use strict';

const express      = require('express');
const requireAuth  = require('../middleware/requireAuth');
const notifService = require('../services/notificationService');

const router = express.Router();

/**
 * GET /api/notifications
 * Returns all notifications for the authenticated user, newest first.
 */
router.get('/', requireAuth, async (req, res, next) => {
  try {
    res.json(await notifService.getNotifications(req.user.sub));
  } catch (e) { next(e); }
});

/**
 * PATCH /api/notifications/:id/read
 * Marks a notification as read. Only the owning user may do this.
 */
router.patch('/:id/read', requireAuth, async (req, res, next) => {
  try {
    await notifService.markAsRead(req.params.id, req.user.sub);
    res.status(204).send();
  } catch (e) { next(e); }
});

module.exports = router;
