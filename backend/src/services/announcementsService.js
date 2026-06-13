'use strict';

const pool = require('../db/pool');

const VALID_ROLES = ['everyone', 'staff', 'student'];

/**
 * Get recipients for an announcement based on target role, excluding creator
 */
async function getRecipients(targetRole, creatorId) {
  let roleConditions = '';
  
  if (targetRole === 'everyone') {
    roleConditions = "role IN ('staff', 'student')";
  } else if (targetRole === 'staff') {
    roleConditions = "role = 'staff'";
  } else if (targetRole === 'student') {
    roleConditions = "role = 'student'";
  }

  const { rows } = await pool.query(
    `SELECT id, email, name, role
     FROM users
     WHERE ${roleConditions}
       AND is_active = TRUE
       AND deleted_at IS NULL
       AND id != $1`,
    [creatorId]
  );

  return rows;
}

async function getAnnouncementsForUser(userId, role) {
  const { rows } = await pool.query(
    `SELECT a.id, a.title, a.content, a.target_role, a.created_by, a.created_at, a.updated_at,
            u.name as created_by_name,
            CASE WHEN ar.user_id IS NOT NULL THEN true ELSE false END AS is_read
     FROM announcements a
     LEFT JOIN users u ON u.id = a.created_by
     LEFT JOIN announcement_reads ar ON ar.announcement_id = a.id AND ar.user_id = $1
     WHERE a.deleted_at IS NULL
       AND (a.target_role = 'everyone' OR a.target_role = $2)
     ORDER BY a.created_at DESC`,
    [userId, role]
  );
  return rows;
}

async function createAnnouncement(data, emailService) {
  const { title, content, target_role, created_by } = data;
  
  // Validation
  if (!title || !content || !target_role) {
    const err = new Error('title, content, and target_role are required');
    err.status = 400;
    throw err;
  }
  if (!VALID_ROLES.includes(target_role)) {
    const err = new Error(`target_role must be one of: ${VALID_ROLES.join(', ')}`);
    err.status = 422;
    throw err;
  }

  // Create announcement
  const { rows } = await pool.query(
    `INSERT INTO announcements (title, content, target_role, created_by)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [title, content, target_role, created_by]
  );
  const announcement = rows[0];

  // Get recipients excluding creator
  const recipients = await getRecipients(target_role, created_by);

  // Create in-app notifications for recipients (if notification service exists)
  // await createNotificationsForRecipients(announcement.id, recipients);

  // Send emails to recipients
  if (emailService) {
    await emailService.sendAnnouncementEmails(announcement, recipients);
  }

  return announcement;
}

async function markAsRead(announcementId, userId) {
  await pool.query(
    `INSERT INTO announcement_reads (announcement_id, user_id)
     VALUES ($1, $2) ON CONFLICT DO NOTHING`,
    [announcementId, userId]
  );
}

/**
 * Update an existing announcement
 * Builds dynamic UPDATE query based on provided fields
 */
async function updateAnnouncement(id, data, updatedBy) {
  const { title, content, target_role } = data;
  
  // Validation
  if (target_role && !VALID_ROLES.includes(target_role)) {
    const err = new Error(`target_role must be one of: ${VALID_ROLES.join(', ')}`);
    err.status = 422;
    throw err;
  }

  // Build update query dynamically
  const updates = [];
  const values = [];
  let paramCount = 1;

  if (title !== undefined) {
    updates.push(`title = $${paramCount++}`);
    values.push(title);
  }
  if (content !== undefined) {
    updates.push(`content = $${paramCount++}`);
    values.push(content);
  }
  if (target_role !== undefined) {
    updates.push(`target_role = $${paramCount++}`);
    values.push(target_role);
  }

  updates.push(`updated_at = NOW()`);
  updates.push(`updated_by = $${paramCount++}`);
  values.push(updatedBy);
  values.push(id);

  const { rows } = await pool.query(
    `UPDATE announcements
     SET ${updates.join(', ')}
     WHERE id = $${paramCount} AND deleted_at IS NULL
     RETURNING *`,
    values
  );

  if (rows.length === 0) {
    const err = new Error('Announcement not found');
    err.status = 404;
    throw err;
  }

  return rows[0];
}

/**
 * Soft delete an announcement
 * Sets deleted_at timestamp and invalidates related announcement_reads
 */
async function deleteAnnouncement(id) {
  const { rows } = await pool.query(
    `UPDATE announcements
     SET deleted_at = NOW()
     WHERE id = $1 AND deleted_at IS NULL
     RETURNING *`,
    [id]
  );

  if (rows.length === 0) {
    const err = new Error('Announcement not found');
    err.status = 404;
    throw err;
  }

  // Invalidate related notifications
  await pool.query(
    `DELETE FROM announcement_reads WHERE announcement_id = $1`,
    [id]
  );

  return rows[0];
}

module.exports = { 
  getAnnouncementsForUser, 
  createAnnouncement, 
  markAsRead, 
  getRecipients,
  updateAnnouncement,
  deleteAnnouncement
};
