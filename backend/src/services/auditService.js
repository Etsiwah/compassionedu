'use strict';

const pool = require('../db/pool');

async function log({ userId, role, name, action, entityType = null, entityId = null, details = null, ip = null }) {
  try {
    await pool.query(
      `INSERT INTO activity_logs
         (user_id, user_role, user_name, action, entity_type, entity_id, details, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        userId || null,
        role || null,
        name || null,
        action,
        entityType,
        entityId ? String(entityId) : null,
        details ? JSON.stringify(details) : null,
        ip || null,
      ]
    );
  } catch {
    // Never let audit logging break the main flow
  }
}

async function getLogs({ role, action, limit = 100, offset = 0 } = {}) {
  const conditions = [];
  const params = [];

  if (role) {
    params.push(role);
    conditions.push(`user_role = $${params.length}`);
  }
  if (action) {
    params.push(action);
    conditions.push(`action = $${params.length}`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  params.push(limit, offset);

  const { rows } = await pool.query(
    `SELECT id, user_id, user_role, user_name, action, entity_type, entity_id, details, ip_address, created_at
     FROM activity_logs
     ${where}
     ORDER BY created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  return rows;
}

module.exports = { log, getLogs };
