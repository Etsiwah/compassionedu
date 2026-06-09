/**
 * Property-Based Tests for authentication
 *
 * Property 1: Role access isolation — for any role R, requests with role R
 *   token must be denied on routes requiring a different role.
 * Property 2: Password never stored in plaintext — for any password string,
 *   stored hash must not equal plaintext.
 *
 * Validates: Requirements 1.4, 1.5, 1.6, 1.7, 1.8, 1.9
 *
 * // Feature: compassion-edu, Property 1: Role access isolation
 * // Feature: compassion-edu, Property 2: Password never stored in plaintext
 */

'use strict';

jest.setTimeout(30000);

const fc = require('fast-check');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const requireRole = require('../middleware/requireRole');

const SECRET = process.env.JWT_SECRET || 'changeme-jwt-secret';
const ALL_ROLES = ['admin', 'student', 'teacher', 'parent'];

jest.setTimeout(30000);

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeReq(role) {
  return { user: { sub: 'user-uuid-1', role } };
}

function makeRes() {
  const res = { _status: null, _body: null };
  res.status = (s) => { res._status = s; return res; };
  res.json = (b) => { res._body = b; return res; };
  return res;
}

// ── Property 1: Role access isolation ─────────────────────────────────────────

describe('Property 1: Role access isolation', () => {
  /**
   * For any role R and any set of allowed roles that does NOT include R,
   * requireRole must deny the request with 403.
   */
  test('token with role R is denied on routes requiring a different role', () => {
    fc.assert(
      fc.property(
        // Pick a role for the token
        fc.constantFrom(...ALL_ROLES),
        // Pick a non-empty subset of roles that excludes the token role
        fc.constantFrom(...ALL_ROLES),
        (tokenRole, allowedRole) => {
          // Only test cases where the token role is NOT in the allowed set
          fc.pre(tokenRole !== allowedRole);

          const req = makeReq(tokenRole);
          const res = makeRes();
          let nextCalled = false;
          const next = () => { nextCalled = true; };

          requireRole(allowedRole)(req, res, next);

          // Must be denied — next should not be called, status must be 403
          return !nextCalled && res._status === 403;
        }
      ),
      { numRuns: 200 }
    );
  });

  /**
   * For any role R, a token with role R must be ALLOWED on a route
   * that includes R in its allowed roles.
   */
  test('token with role R is allowed on routes that include R', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...ALL_ROLES),
        (role) => {
          const req = makeReq(role);
          const res = makeRes();
          let nextCalled = false;
          const next = () => { nextCalled = true; };

          requireRole(role)(req, res, next);

          return nextCalled && res._status === null;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * A route requiring multiple roles allows any of those roles.
   */
  test('multi-role route allows any role in the allowed list', () => {
    fc.assert(
      fc.property(
        // Pick 2–4 allowed roles
        fc.shuffledSubarray(ALL_ROLES, { minLength: 2, maxLength: 4 }),
        (allowedRoles) => {
          // Test each role in the allowed list
          return allowedRoles.every(role => {
            const req = makeReq(role);
            const res = makeRes();
            let nextCalled = false;
            requireRole(...allowedRoles)(req, res, () => { nextCalled = true; });
            return nextCalled;
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * JWT tokens signed with the correct secret decode to the correct role.
   */
  test('JWT role payload round-trips correctly for any role', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...ALL_ROLES),
        fc.uuid(),
        (role, userId) => {
          const token = jwt.sign({ sub: userId, role }, SECRET, { expiresIn: '1h' });
          const decoded = jwt.verify(token, SECRET);
          return decoded.role === role && decoded.sub === userId;
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ── Property 2: Password never stored in plaintext ────────────────────────────

describe('Property 2: Password never stored in plaintext', () => {
  /**
   * For any password string, bcrypt.hash must produce a hash that:
   * - does not equal the plaintext
   * - starts with the bcrypt prefix ($2b$)
   * - verifies correctly with bcrypt.compare
   */
  test('hashed password never equals plaintext', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate realistic password strings (1–72 chars, bcrypt limit)
        fc.string({ minLength: 1, maxLength: 72 }),
        async (password) => {
          const hash = await bcrypt.hash(password, 10);

          // Hash must not equal plaintext
          if (hash === password) return false;

          // Hash must have bcrypt format
          if (!hash.startsWith('$2b$')) return false;

          // Hash must verify correctly
          const matches = await bcrypt.compare(password, hash);
          return matches === true;
        }
      ),
      { numRuns: 20 } // bcrypt is slow — keep iterations low
    );
  });

  /**
   * Two hashes of the same password must differ (bcrypt uses random salt).
   */
  test('same password produces different hashes each time (random salt)', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 72 }),
        async (password) => {
          const hash1 = await bcrypt.hash(password, 10);
          const hash2 = await bcrypt.hash(password, 10);
          // Different salts → different hashes
          return hash1 !== hash2;
        }
      ),
      { numRuns: 10 }
    );
  });

  /**
   * A hash of password A must NOT verify against password B.
   */
  test('hash of password A does not match password B', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 72 }),
        fc.string({ minLength: 1, maxLength: 72 }),
        async (passwordA, passwordB) => {
          fc.pre(passwordA !== passwordB);
          const hashA = await bcrypt.hash(passwordA, 10);
          const matches = await bcrypt.compare(passwordB, hashA);
          return matches === false;
        }
      ),
      { numRuns: 10 }
    );
  });
});
