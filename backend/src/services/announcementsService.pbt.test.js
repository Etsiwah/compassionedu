/**
 * Property-Based Tests for announcements module
 *
 * Property 8: Announcement targeting correctness — for any announcement
 *   with target role T, only users with matching role receive it.
 *
 * Validates: Requirements 9.1, 9.4
 *
 * // Feature: compassion-edu, Property 8: Announcement targeting correctness
 */

'use strict';

jest.mock('../db/pool', () => ({ query: jest.fn() }));

const fc = require('fast-check');
const pool = require('../db/pool');
const { getAnnouncementsForUser, createAnnouncement } = require('./announcementsService');

beforeEach(() => jest.resetAllMocks());

const ALL_ROLES = ['student', 'teacher', 'parent', 'admin'];
const VALID_TARGET_ROLES = ['all', 'student', 'teacher', 'parent'];

// ── Property 8: Announcement targeting correctness ────────────────────────────

describe('Property 8: Announcement targeting correctness', () => {
  /**
   * getAnnouncementsForUser must pass both userId and userRole to the query,
   * so the DB can filter by target_role IN ('all', userRole).
   */
  test('query always includes both userId and userRole as parameters', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.constantFrom(...ALL_ROLES),
        async (userId, role) => {
          pool.query.mockReset();
          pool.query.mockResolvedValueOnce({ rows: [] });

          await getAnnouncementsForUser(userId, role);

          const [sql, params] = pool.query.mock.calls[0];
          return (
            params.includes(userId) &&
            params.includes(role) &&
            /target_role/i.test(sql)
          );
        }
      ),
      { numRuns: 200 }
    );
  });

  /**
   * The query must filter by target_role = 'all' OR target_role = userRole.
   * We verify the SQL contains 'all' as a literal.
   */
  test('query filters by target_role including "all"', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.constantFrom(...ALL_ROLES),
        async (userId, role) => {
          pool.query.mockReset();
          pool.query.mockResolvedValueOnce({ rows: [] });

          await getAnnouncementsForUser(userId, role);

          const [sql] = pool.query.mock.calls[0];
          return sql.includes("'all'") || sql.includes('"all"');
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Announcements returned by the service are passed through unchanged from DB.
   * For any set of mock announcements, the service returns exactly those rows.
   */
  test('service returns exactly the rows the DB provides', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.constantFrom(...ALL_ROLES),
        fc.array(
          fc.record({
            id: fc.uuid(),
            title: fc.string({ minLength: 1, maxLength: 50 }),
            content: fc.string({ minLength: 1, maxLength: 200 }),
            target_role: fc.constantFrom(...VALID_TARGET_ROLES),
            is_read: fc.boolean(),
          }),
          { minLength: 0, maxLength: 10 }
        ),
        async (userId, role, mockRows) => {
          pool.query.mockReset();
          pool.query.mockResolvedValueOnce({ rows: mockRows });

          const result = await getAnnouncementsForUser(userId, role);
          return result.length === mockRows.length;
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Announcement creation validation', () => {
  /**
   * createAnnouncement must reject any target_role not in the valid set.
   * Valid roles: 'all', 'student', 'teacher', 'parent'.
   * Invalid: 'admin', empty string, arbitrary strings.
   */
  test('invalid target_role is always rejected with 422', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate strings that are NOT valid target roles
        fc.string({ minLength: 1, maxLength: 20 }).filter(
          s => !VALID_TARGET_ROLES.includes(s)
        ),
        async (target_role) => {
          let status = null;
          try {
            await createAnnouncement({ title: 'T', content: 'C', target_role });
          } catch (err) {
            status = err.status;
          }
          return status === 422 && pool.query.mock.calls.length === 0;
        }
      ),
      { numRuns: 200 }
    );
  });

  /**
   * All valid target roles must be accepted without throwing 422.
   */
  test('all valid target roles are accepted', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...VALID_TARGET_ROLES),
        async (target_role) => {
          pool.query.mockReset();
          pool.query.mockResolvedValueOnce({
            rows: [{ id: 'ann-1', title: 'T', content: 'C', target_role }],
          });

          let status422 = false;
          try {
            await createAnnouncement({ title: 'T', content: 'C', target_role });
          } catch (err) {
            if (err.status === 422) status422 = true;
          }
          return !status422;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Missing required fields (title, content, target_role) must be rejected with 400.
   */
  test('missing required fields are rejected with 400', async () => {
    const cases = [
      { content: 'C', target_role: 'all' },           // missing title
      { title: 'T', target_role: 'all' },              // missing content
      { title: 'T', content: 'C' },                    // missing target_role
    ];
    for (const data of cases) {
      let status = null;
      try { await createAnnouncement(data); } catch (err) { status = err.status; }
      expect(status).toBe(400);
    }
  });
});
