/**
 * requireRole middleware factory — checks that req.user.role is in the
 * allowed roles array. Must be used after requireAuth.
 *
 * Requirements: 1.4, 1.5, 1.6, 1.7, 1.8
 */

'use strict';

/**
 * Returns an Express middleware that allows only users whose role is
 * included in the provided `roles` array.
 *
 * Usage:
 *   router.get('/admin-only', requireAuth, requireRole('admin'), handler)
 *   router.get('/multi-role', requireAuth, requireRole('admin', 'teacher'), handler)
 *
 * @param {...string} roles - one or more allowed role strings
 * @returns {Function} Express middleware
 */
function requireRole(...roles) {
  return function (req, res, next) {
    if (!req.user) {
      // requireAuth was not applied before this middleware
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    next();
  };
}

module.exports = requireRole;
