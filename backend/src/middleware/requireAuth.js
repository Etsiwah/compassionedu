/**
 * requireAuth middleware — validates the JWT in the Authorization header
 * and attaches the decoded payload to req.user.
 *
 * Requirements: 1.1, 1.3
 */

'use strict';

const jwt = require('jsonwebtoken');

const ACCESS_TOKEN_SECRET = process.env.JWT_SECRET || 'changeme-jwt-secret';

/**
 * Express middleware that enforces authentication.
 * Expects: Authorization: Bearer <token>
 * On success: attaches decoded JWT payload to req.user and calls next().
 * On failure: responds with 401.
 */
function requireAuth(req, res, next) {
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const token = authHeader.slice(7); // strip "Bearer "

  try {
    const payload = jwt.verify(token, ACCESS_TOKEN_SECRET);
    req.user = payload; // { sub, role, iat, exp }
    next();
  } catch (err) {
    // Covers TokenExpiredError, JsonWebTokenError, NotBeforeError
    return res.status(401).json({ error: 'Authentication required' });
  }
}

module.exports = requireAuth;
