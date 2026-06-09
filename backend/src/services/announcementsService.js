'use strict';

const pool = require('../db/pool');

const VALID_ROLES = ['all', 'student', 'teacher', 'parent', 'staff'];

async function getAnnouncementsForUser(userId, role) {
  const { rows } = await pool.query(
    `SELECT a.*, 
       CASE WHEN ar.user_id IS NOT NULL THEN true ELSE false END AS is_read
     FROM announcements a
     LEFT JOIN announcement_reads ar ON ar.announcement_id = a.id AND ar.user_id = $1
     WHERE a.target_role = 'all' OR a.target_role = $2
     ORDER BY a.created_at DESC`,
    [userId, role]
  );
  return rows;
}

async function createAnnouncement(data) {
  const { title, content, target_role, created_by } = data;
  if (!title || !content || !target_role) {
    const err = new Error('title, content, and target_role are required'); err.status = 400; throw err;
  }
  if (!VALID_ROLES.includes(target_role)) {
    const err = new Error(`target_role must be one of: ${VALID_ROLES.join(', ')}`); err.status = 422; throw err;
  }
  const { rows } = await pool.query(
    `INSERT INTO announcements (title, content, target_role, created_by)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [title, content, target_role, created_by || null]
  );
  return rows[0];
}

async function markAsRead(announcementId, userId) {
  await pool.query(
    `INSERT INTO announcement_reads (announcement_id, user_id)
     VALUES ($1, $2) ON CONFLICT DO NOTHING`,
    [announcementId, userId]
  );
}

module.exports = { getAnnouncementsForUser, createAnnouncement, markAsRead };
