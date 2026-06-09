'use strict';

/**
 * Audit log middleware factory.
 * Usage: router.post('/', requireAuth, auditLog('user_created', 'user'), handler)
 *
 * Writes a row to activity_logs after the handler responds successfully.
 */

const pool = require('../db/pool');

/**
 * @param {string} action      - e.g. 'login', 'user_created', 'cv_uploaded'
 * @param {string} entityType  - e.g. 'user', 'staff', 'beneficiary', 'cv'
 * @param {Function} [getEntityId] - optional fn(req, res_body) => string
 */
function auditLog(action, entityType = null, getEntityId = null) {
  return async function (req, res, next) {
    // Intercept res.json to capture the response body
    const originalJson = res.json.bind(res);
    res.json = function (body) {
      res._auditBody = body;
      return originalJson(body);
    };

    res.on('finish', async () => {
      // Only log successful responses (2xx)
      if (res.statusCode < 200 || res.statusCode >= 300) return;

      try {
        const user = req.user || {};
        const entityId = getEntityId
          ? getEntityId(req, res._auditBody)
          : (req.params?.id || res._auditBody?.id || null);

        await pool.query(
          `INSERT INTO activity_logs
             (user_id, user_role, user_name, action, entity_type, entity_id, details, ip_address)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            user.sub || null,
            user.role || null,
            user.name || null,
            action,
            entityType,
            entityId ? String(entityId) : null,
            JSON.stringify({ method: req.method, path: req.path }),
            req.ip || req.headers['x-forwarded-for'] || null,
          ]
        );
      } catch {
        // Never let audit logging break the main request
      }
    });

    next();
  };
}

/**
 * Log a login event directly (called from authService).
 */
async function logLogin(userId, role, name, ip) {
  try {
    await pool.query(
      `INSERT INTO activity_logs (user_id, user_role, user_name, action, entity_type, ip_address)
       VALUES ($1, $2, $3, 'login', 'session', $4)`,
      [userId, role, name, ip || null]
    );
  } catch {
    // Never break login flow
  }
}

/**
 * Log a logout event.
 */
async function logLogout(userId, role, name, ip) {
  try {
    await pool.query(
      `INSERT INTO activity_logs (user_id, user_role, user_name, action, entity_type, ip_address)
       VALUES ($1, $2, $3, 'logout', 'session', $4)`,
      [userId, role, name, ip || null]
    );
  } catch {}
}

module.exports = { auditLog, logLogin, logLogout };
