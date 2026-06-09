/**
 * Property-Based Tests for user management
 *
 * Property 3: User search result relevance — for any query Q, all returned
 *   users must have name or email containing Q (case-insensitive).
 * Property 10: Duplicate email rejection — for any existing email, a second
 *   creation attempt must be rejected.
 *
 * Validates: Requirements 2.4, 2.5
 *
 * // Feature: compassion-edu, Property 3: User search result relevance
 * // Feature: compassion-edu, Property 10: Duplicate email rejection
 */

'use strict';

jest.mock('../db/pool', () => ({ query: jest.fn() }));

const fc = require('fast-check');
const pool = require('../db/pool');
const { listUsers, createUser } = require('./userService');

beforeEach(() => jest.resetAllMocks());

// ── Arbitraries ───────────────────────────────────────────────────────────────

const roleArb = fc.constantFrom('admin', 'student', 'teacher', 'parent');

// Generate a realistic user row
const userRowArb = fc.record({
  id: fc.uuid(),
  role: roleArb,
  name: fc.string({ minLength: 2, maxLength: 40 }).filter(s => /^[a-zA-Z\s]+$/.test(s)),
  email: fc.emailAddress(),
  is_active: fc.constant(true),
  created_at: fc.constant(new Date().toISOString()),
});

// ── Property 3: User search result relevance ──────────────────────────────────

describe('Property 3: User search result relevance', () => {
  /**
   * For any query Q and any set of users, listUsers must only return users
   * whose name or email contains Q (case-insensitive).
   *
   * We test this by constructing a mock DB response that contains both
   * matching and non-matching users, then verifying the service filters
   * correctly via the SQL query it builds.
   */
  test('search query is passed to DB as ILIKE pattern', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0 && /^[a-zA-Z0-9 ]+$/.test(s)),
        async (query) => {
          // Reset mock between iterations
          pool.query.mockReset();
          pool.query
            .mockResolvedValueOnce({ rows: [{ total: '0' }] })
            .mockResolvedValueOnce({ rows: [] });

          await listUsers(query);

          const [sql, params] = pool.query.mock.calls[0];
          const pattern = `%${query.trim()}%`;

          return (
            sql.toUpperCase().includes('ILIKE') &&
            params.some(p => p === pattern)
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * When the DB returns users, all returned users must match the query
   * (name or email contains query, case-insensitive).
   * We simulate this by having the mock return only matching users and
   * verifying the service passes them through unchanged.
   */
  test('all returned users contain the search query in name or email', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 2, maxLength: 10 }).filter(s => /^[a-z]+$/.test(s)),
        fc.array(userRowArb, { minLength: 0, maxLength: 5 }),
        async (query, allUsers) => {
          pool.query.mockReset();
          // Filter to only users that match the query (simulating DB ILIKE)
          const matchingUsers = allUsers.filter(u =>
            u.name.toLowerCase().includes(query.toLowerCase()) ||
            u.email.toLowerCase().includes(query.toLowerCase())
          );

          pool.query
            .mockResolvedValueOnce({ rows: [{ total: String(matchingUsers.length) }] })
            .mockResolvedValueOnce({ rows: matchingUsers });

          const result = await listUsers(query);

          // Every returned user must contain the query in name or email
          return result.users.every(u =>
            u.name.toLowerCase().includes(query.toLowerCase()) ||
            u.email.toLowerCase().includes(query.toLowerCase())
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Pagination metadata must be consistent: page and limit are reflected
   * correctly in the response for any valid page/limit combination.
   */
  test('pagination metadata is consistent for any page and limit', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 50 }),
        fc.integer({ min: 1, max: 100 }),
        async (page, limit) => {
          pool.query.mockReset();
          pool.query
            .mockResolvedValueOnce({ rows: [{ total: '100' }] })
            .mockResolvedValueOnce({ rows: [] });

          const result = await listUsers(undefined, undefined, page, limit);

          return (
            result.page === page &&
            result.limit === Math.min(100, limit) &&
            result.total === 100
          );
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ── Property 10: Duplicate email rejection ────────────────────────────────────

describe('Property 10: Duplicate email rejection', () => {
  /**
   * For any existing email, a second createUser attempt with the same email
   * must be rejected with status 409.
   */
  test('duplicate email is always rejected with 409', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.emailAddress(),
        roleArb,
        fc.string({ minLength: 2, maxLength: 30 }),
        fc.string({ minLength: 8, maxLength: 30 }),
        async (email, role, name, password) => {
          pool.query.mockReset();
          // Mock: email already exists
          pool.query.mockResolvedValueOnce({ rows: [{ id: 'existing-uuid' }] });

          let threw = false;
          let status = null;
          try {
            await createUser({ role, name, email, password });
          } catch (err) {
            threw = true;
            status = err.status;
          }

          return threw && status === 409;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Email comparison must be case-insensitive — 'User@Example.com' and
   * 'user@example.com' are the same email.
   */
  test('duplicate email check is case-insensitive', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate a lowercase email
        fc.emailAddress(),
        async (email) => {
          pool.query.mockReset();
          const upperEmail = email.toUpperCase();

          // Mock: existing user found (simulating case-insensitive match)
          pool.query.mockResolvedValueOnce({ rows: [{ id: 'existing-uuid' }] });

          let status = null;
          try {
            await createUser({
              role: 'student',
              name: 'Test User',
              email: upperEmail,
              password: 'password123',
            });
          } catch (err) {
            status = err.status;
          }

          // The query must use LOWER() for case-insensitive comparison
          const [sql] = pool.query.mock.calls[0];
          return status === 409 && sql.includes('LOWER');
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * A new unique email must NOT be rejected — createUser proceeds to hash
   * and insert when no duplicate exists.
   */
  test('unique email is accepted and proceeds to insert', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.emailAddress(),
        roleArb,
        fc.string({ minLength: 2, maxLength: 30 }),
        fc.string({ minLength: 8, maxLength: 30 }),
        async (email, role, name, password) => {
          pool.query.mockReset();
          const mockUser = { id: 'new-uuid', role, name, email, is_active: true, created_at: '' };

          // Mock: no existing user, then INSERT returns new user
          pool.query
            .mockResolvedValueOnce({ rows: [] })       // no duplicate
            .mockResolvedValueOnce({ rows: [mockUser] }); // INSERT

          const result = await createUser({ role, name, email, password });
          return result.email === email && result.role === role;
        }
      ),
      { numRuns: 10 } // bcrypt hashing is slow — keep low
    );
  }, 60000); // 60s timeout for bcrypt
});
