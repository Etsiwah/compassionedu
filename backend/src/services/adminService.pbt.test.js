/**
 * Property-Based Tests for admin module
 *
 * Property 7: Portfolio media moderation state machine — flagged items must
 *   not appear in portfolio; approved items must appear.
 *
 * Validates: Requirements 8.6, 8.7
 *
 * // Feature: compassion-edu, Property 7: Portfolio media moderation state machine
 */

'use strict';

jest.mock('../db/pool', () => ({ query: jest.fn() }));

const fc = require('fast-check');
const pool = require('../db/pool');
const { moderateContent } = require('./adminService');

beforeEach(() => jest.resetAllMocks());

const VALID_ACTIONS = ['approved', 'flagged'];
const INVALID_ACTIONS = ['delete', 'pending', 'ban', 'hide', '', 'APPROVED', 'Flagged'];

// ── Property 7: Portfolio media moderation state machine ──────────────────────

describe('Property 7: Portfolio media moderation state machine', () => {
  /**
   * moderateContent with action 'approved' must set moderation_status to 'approved'.
   */
  test('approved action always sets status to approved', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        async (itemId) => {
          pool.query.mockReset();
          pool.query.mockResolvedValueOnce({
            rows: [{ id: itemId, moderation_status: 'approved' }],
          });

          const result = await moderateContent(itemId, 'approved');
          return result.moderation_status === 'approved';
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * moderateContent with action 'flagged' must set moderation_status to 'flagged'.
   */
  test('flagged action always sets status to flagged', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        async (itemId) => {
          pool.query.mockReset();
          pool.query.mockResolvedValueOnce({
            rows: [{ id: itemId, moderation_status: 'flagged' }],
          });

          const result = await moderateContent(itemId, 'flagged');
          return result.moderation_status === 'flagged';
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Only 'approved' and 'flagged' are valid actions — any other value must
   * be rejected with 422 before touching the DB.
   */
  test('invalid moderation actions are always rejected with 422', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        // Generate strings that are NOT valid actions
        fc.string({ minLength: 0, maxLength: 20 }).filter(
          s => !VALID_ACTIONS.includes(s)
        ),
        async (itemId, action) => {
          let status = null;
          try {
            await moderateContent(itemId, action);
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
   * Specific known-invalid actions are rejected.
   */
  test('known invalid actions are rejected with 422', async () => {
    for (const action of INVALID_ACTIONS) {
      pool.query.mockReset();
      let status = null;
      try {
        await moderateContent('item-uuid', action);
      } catch (err) {
        status = err.status;
      }
      expect(status).toBe(422);
      expect(pool.query).not.toHaveBeenCalled();
    }
  });

  /**
   * moderateContent passes the action as the moderation_status to the DB.
   * The UPDATE query must use the action value as the new status.
   */
  test('action value is passed directly to the UPDATE query', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.constantFrom(...VALID_ACTIONS),
        async (itemId, action) => {
          pool.query.mockReset();
          pool.query.mockResolvedValueOnce({
            rows: [{ id: itemId, moderation_status: action }],
          });

          await moderateContent(itemId, action);

          const [, params] = pool.query.mock.calls[0];
          return params.includes(action) && params.includes(itemId);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Non-existent items must return 404.
   */
  test('non-existent item returns 404', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.constantFrom(...VALID_ACTIONS),
        async (itemId, action) => {
          pool.query.mockReset();
          pool.query.mockResolvedValueOnce({ rows: [] }); // item not found

          let status = null;
          try {
            await moderateContent(itemId, action);
          } catch (err) {
            status = err.status;
          }
          return status === 404;
        }
      ),
      { numRuns: 100 }
    );
  });
});
