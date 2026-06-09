'use strict';

const pool = require('../db/pool');

async function notifyAdmins(type, message, entityId) {
  const { rows: admins } = await pool.query(
    "SELECT id FROM users WHERE role = 'admin' AND is_active = TRUE AND deleted_at IS NULL"
  );
  if (!admins.length) return;
  const values = admins.map((_, i) =>
    `($${i * 4 + 1}, $${i * 4 + 2}, $${i * 4 + 3}, $${i * 4 + 4})`
  ).join(',');
  const params = admins.flatMap(a => [a.id, type, message, entityId || null]);
  await pool.query(
    `INSERT INTO notifications (user_id, type, message, entity_id) VALUES ${values}`,
    params
  );
}

async function getNotifications(userId) {
  const { rows } = await pool.query(
    `SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC`,
    [userId]
  );
  return rows;
}

async function markAsRead(notifId, userId) {
  const { rows } = await pool.query(
    'SELECT id FROM notifications WHERE id = $1',
    [notifId]
  );
  if (!rows.length) {
    const err = new Error('Not found'); err.status = 404; throw err;
  }
  const { rows: owned } = await pool.query(
    'SELECT id FROM notifications WHERE id = $1 AND user_id = $2',
    [notifId, userId]
  );
  if (!owned.length) {
    const err = new Error('Forbidden'); err.status = 403; throw err;
  }
  await pool.query(
    'UPDATE notifications SET is_read = TRUE WHERE id = $1',
    [notifId]
  );
}

module.exports = { notifyAdmins, getNotifications, markAsRead };
