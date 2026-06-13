'use strict';

const pool = require('../db/pool');
const notificationService = require('./notificationService');

/**
 * Check if user can reply to announcement (must be a recipient)
 * @param {string} announcementId - UUID of the announcement
 * @param {string} userId - UUID of the user
 * @param {string} userRole - Role of the user ('staff', 'student', 'admin')
 * @returns {Promise<boolean>} - True if user can reply, false otherwise
 */
async function canReply(announcementId, userId, userRole) {
  const { rows } = await pool.query(
    `SELECT target_role FROM announcements
     WHERE id = $1 AND deleted_at IS NULL`,
    [announcementId]
  );

  if (rows.length === 0) return false;

  const { target_role } = rows[0];
  
  // Admin cannot reply
  if (userRole === 'admin') return false;

  // Check if user role matches target
  if (target_role === 'everyone') return userRole === 'staff' || userRole === 'student';
  if (target_role === 'staff') return userRole === 'staff';
  if (target_role === 'student') return userRole === 'student';

  return false;
}

/**
 * Create a reply to an announcement
 * @param {Object} data - Reply data
 * @param {string} data.announcement_id - UUID of the announcement
 * @param {string} data.user_id - UUID of the user submitting the reply
 * @param {string} data.user_role - Role of the user ('staff' or 'student')
 * @param {string} data.reply_message - The reply message content
 * @returns {Promise<Object>} - The created reply record
 */
async function createReply(data) {
  const { announcement_id, user_id, user_role, reply_message } = data;

  // Validate required fields
  if (!announcement_id || !user_id || !user_role || !reply_message) {
    const err = new Error('announcement_id, user_id, user_role, and reply_message are required');
    err.status = 400;
    throw err;
  }

  // Validate reply message is not empty after trimming
  if (reply_message.trim().length === 0) {
    const err = new Error('Reply message cannot be empty');
    err.status = 400;
    throw err;
  }

  // Check permission - verify user role matches announcement target and user is not admin
  const canUserReply = await canReply(announcement_id, user_id, user_role);
  if (!canUserReply) {
    const err = new Error('You do not have permission to reply to this announcement');
    err.status = 403;
    throw err;
  }

  // Insert reply
  const { rows } = await pool.query(
    `INSERT INTO announcement_replies (announcement_id, user_id, user_role, reply_message)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [announcement_id, user_id, user_role, reply_message]
  );

  // Notify all admins of the new reply
  await notifyAdminsOfReply(rows[0]);

  return rows[0];
}

/**
 * Get all replies with optional filtering
 * @param {Object} filters - Optional filters
 * @param {string} filters.announcement_id - Filter by announcement ID
 * @param {string} filters.user_role - Filter by user role ('staff' or 'student')
 * @returns {Promise<Array>} - Array of reply records with joined data
 */
async function getAllReplies(filters = {}) {
  let whereConditions = [];
  let values = [];
  let paramCount = 1;

  if (filters.announcement_id) {
    whereConditions.push(`ar.announcement_id = $${paramCount++}`);
    values.push(filters.announcement_id);
  }

  if (filters.user_role) {
    whereConditions.push(`ar.user_role = $${paramCount++}`);
    values.push(filters.user_role);
  }

  const whereClause = whereConditions.length > 0
    ? `WHERE ${whereConditions.join(' AND ')}`
    : '';

  const { rows } = await pool.query(
    `SELECT ar.id, ar.announcement_id, ar.user_id, ar.user_role, ar.reply_message, ar.created_at,
            a.title as announcement_title,
            u.name as user_name, u.email as user_email
     FROM announcement_replies ar
     JOIN announcements a ON a.id = ar.announcement_id
     JOIN users u ON u.id = ar.user_id
     ${whereClause}
     ORDER BY ar.created_at DESC
     LIMIT 100`,
    values
  );

  return rows;
}

/**
 * Notify all admins when a reply is submitted
 * Creates notifications for all active admin users
 * @param {Object} reply - The reply record
 * @returns {Promise<void>}
 */
async function notifyAdminsOfReply(reply) {
  // Get announcement title and user name
  const { rows: details } = await pool.query(
    `SELECT a.title, u.name
     FROM announcements a, users u
     WHERE a.id = $1 AND u.id = $2`,
    [reply.announcement_id, reply.user_id]
  );

  if (details.length === 0) return;

  const { title, name } = details[0];
  const messagePreview = reply.reply_message.substring(0, 50) + (reply.reply_message.length > 50 ? '...' : '');

  // Use notification service to notify all admins
  await notificationService.notifyAdmins(
    'announcement_reply',
    `${name} replied to "${title}": ${messagePreview}`,
    reply.id
  );
}

module.exports = { createReply, getAllReplies, canReply };
