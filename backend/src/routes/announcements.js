'use strict';

const express = require('express');
const requireAuth = require('../middleware/requireAuth');
const requireRole = require('../middleware/requireRole');
const { 
  getAnnouncementsForUser, 
  createAnnouncement, 
  markAsRead,
  updateAnnouncement,
  deleteAnnouncement
} = require('../services/announcementsService');
const replyService = require('../services/replyService');
const emailService = require('../services/emailService');

const router = express.Router();

/**
 * GET /api/announcements
 * Get all announcements for the authenticated user
 */
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const { sub, role } = req.user;
    res.json(await getAnnouncementsForUser(sub, role));
  } catch (e) { next(e); }
});

/**
 * POST /api/announcements
 * Create a new announcement (Admin only)
 */
router.post('/', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const announcement = await createAnnouncement(
      { ...req.body, created_by: req.user.sub },
      emailService
    );
    res.status(201).json(announcement);
  } catch (e) { next(e); }
});

/**
 * PUT /api/announcements/:id
 * Update an existing announcement (Admin only)
 */
router.put('/:id', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const announcement = await updateAnnouncement(
      req.params.id,
      req.body,
      req.user.sub
    );
    res.json(announcement);
  } catch (e) { next(e); }
});

/**
 * DELETE /api/announcements/:id
 * Delete an announcement (Admin only, soft delete)
 */
router.delete('/:id', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    await deleteAnnouncement(req.params.id);
    res.status(204).send();
  } catch (e) { next(e); }
});

/**
 * POST /api/announcements/:id/replies
 * Submit a reply to an announcement (Staff/Students only)
 */
router.post('/:id/replies', requireAuth, requireRole('staff', 'student'), async (req, res, next) => {
  try {
    const reply = await replyService.createReply({
      announcement_id: req.params.id,
      user_id: req.user.sub,
      user_role: req.user.role,
      reply_message: req.body.reply_message
    });
    res.status(201).json(reply);
  } catch (e) { next(e); }
});

/**
 * GET /api/announcements/replies
 * Get all announcement replies (Admin only)
 * Supports query parameters: announcement_id, user_role
 */
router.get('/replies', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const filters = {
      announcement_id: req.query.announcement_id,
      user_role: req.query.user_role
    };
    const replies = await replyService.getAllReplies(filters);
    res.json(replies);
  } catch (e) { next(e); }
});

/**
 * PATCH /api/announcements/:id/read
 * Mark announcement as read
 */
router.patch('/:id/read', requireAuth, async (req, res, next) => {
  try {
    await markAsRead(req.params.id, req.user.sub);
    res.status(204).send();
  } catch (e) { next(e); }
});

module.exports = router;
