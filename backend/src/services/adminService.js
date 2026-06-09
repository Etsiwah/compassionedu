'use strict';

const pool = require('../db/pool');

async function getCompassionDashboard() {
  const { rows } = await pool.query(
    `SELECT DISTINCT u.id, u.name, u.email,
       (SELECT ROUND((COUNT(*) FILTER (WHERE a.status='present')::numeric / NULLIF(COUNT(*),0)) * 100, 2)
        FROM attendance a WHERE a.student_id = u.id) AS attendance_percentage,
       (SELECT COUNT(*) FROM fees f WHERE f.student_id = u.id AND f.status = 'overdue') AS overdue_fees_count
     FROM users u
     WHERE u.role = 'student' AND u.deleted_at IS NULL
       AND (
         (SELECT ROUND((COUNT(*) FILTER (WHERE a.status='present')::numeric / NULLIF(COUNT(*),0)) * 100, 2)
          FROM attendance a WHERE a.student_id = u.id) < 75
         OR
         (SELECT COUNT(*) FROM fees f WHERE f.student_id = u.id AND f.status = 'overdue') > 0
       )
     ORDER BY u.name ASC`
  );
  return rows;
}

async function getContentModerationItems() {
  const { rows } = await pool.query(
    `SELECT pm.*, u.name AS student_name
     FROM portfolio_media pm
     JOIN users u ON u.id = pm.student_id
     ORDER BY pm.created_at DESC`
  );
  return rows;
}

async function moderateContent(itemId, action) {
  if (!['approved', 'flagged'].includes(action)) {
    const err = new Error('action must be approved or flagged'); err.status = 422; throw err;
  }
  const { rows } = await pool.query(
    'UPDATE portfolio_media SET moderation_status = $1 WHERE id = $2 RETURNING *',
    [action, itemId]
  );
  if (rows.length === 0) {
    const err = new Error('Resource not found'); err.status = 404; throw err;
  }
  return rows[0];
}

async function getDashboardMetrics() {
  const { rows } = await pool.query(`
    SELECT
      (SELECT COUNT(*) FROM users WHERE role='student' AND deleted_at IS NULL) AS total_students,
      (SELECT COUNT(*) FROM users WHERE role IN ('staff','teacher') AND deleted_at IS NULL) AS total_staff,
      (SELECT COUNT(*) FROM users WHERE deleted_at IS NULL) AS total_users,
      (SELECT ROUND(
         (COUNT(*) FILTER (WHERE status='present')::numeric / NULLIF(COUNT(*),0)) * 100, 1
       ) FROM attendance) AS attendance_pct,
      (SELECT COALESCE(SUM(amount),0) FROM fees WHERE status='paid') AS fees_collected,
      (SELECT COUNT(*) FROM beneficiaries WHERE status='active' AND deleted_at IS NULL) AS active_beneficiaries,
      (SELECT COUNT(*) FROM portfolio_media WHERE moderation_status='pending') AS pending_actions,
      (SELECT COUNT(*) FROM announcements) AS total_announcements
  `);
  return rows[0];
}

module.exports = {
  getCompassionDashboard,
  getContentModerationItems,
  moderateContent,
  getDashboardMetrics,
};
