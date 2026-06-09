/**
 * Property-Based Tests for examination results module
 *
 * Property 5: Examination marks range invariant — for any marks value
 *   outside [0, 100], creation must be rejected.
 *
 * Validates: Requirements 5.6
 *
 * // Feature: compassion-edu, Property 5: Examination marks range invariant
 */

'use strict';

jest.mock('../db/pool', () => ({ query: jest.fn() }));

const fc = require('fast-check');
const pool = require('../db/pool');
const { createResult, calculateGrade } = require('./resultsService');

beforeEach(() => jest.resetAllMocks());

// ── Property 5: Examination marks range invariant ─────────────────────────────

describe('Property 5: Examination marks range invariant', () => {
  /**
   * Any marks value strictly outside [0, 100] must be rejected with status 422.
   */
  test('marks outside [0, 100] are always rejected with 422', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate marks outside the valid range
        fc.oneof(
          fc.float({ max: Math.fround(-0.001), noNaN: true, noDefaultInfinity: true }),   // negative
          fc.float({ min: Math.fround(100.001), max: Math.fround(1e6), noNaN: true, noDefaultInfinity: true }) // > 100
        ),
        async (marks) => {
          let threw = false;
          let status = null;
          try {
            await createResult({ student_id: 'uuid-1', subject: 'Math', marks, term: 'T1' });
          } catch (err) {
            threw = true;
            status = err.status;
          }
          // pool must NOT be called — validation happens before DB
          return threw && status === 422 && pool.query.mock.calls.length === 0;
        }
      ),
      { numRuns: 200 }
    );
  });

  /**
   * NaN and Infinity must also be rejected.
   */
  test('NaN and Infinity marks are rejected with 422', async () => {
    for (const marks of [NaN, Infinity, -Infinity]) {
      let status = null;
      try {
        await createResult({ student_id: 'uuid-1', subject: 'Math', marks, term: 'T1' });
      } catch (err) {
        status = err.status;
      }
      expect(status).toBe(422);
    }
  });

  /**
   * Any marks value in [0, 100] must NOT be rejected by the range check.
   * (The service may still throw 404 if student doesn't exist — that's fine.)
   */
  test('marks in [0, 100] pass the range check', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.float({ min: 0, max: 100, noNaN: true, noDefaultInfinity: true }),
        async (marks) => {
          pool.query.mockReset();
          // Mock student exists + INSERT
          pool.query
            .mockResolvedValueOnce({ rows: [{ id: 'uuid-1' }] })
            .mockResolvedValueOnce({ rows: [{ id: 'r1', marks: String(marks), grade: 'A', subject: 'Math', term: 'T1' }] });

          let status422 = false;
          try {
            await createResult({ student_id: 'uuid-1', subject: 'Math', marks, term: 'T1' });
          } catch (err) {
            if (err.status === 422) status422 = true;
          }
          return !status422;
        }
      ),
      { numRuns: 200 }
    );
  });

  /**
   * Boundary values 0 and 100 are valid.
   */
  test('boundary values 0 and 100 are accepted', async () => {
    for (const marks of [0, 100]) {
      pool.query.mockReset();
      pool.query
        .mockResolvedValueOnce({ rows: [{ id: 'uuid-1' }] })
        .mockResolvedValueOnce({ rows: [{ id: 'r1', marks: String(marks), grade: marks >= 90 ? 'A' : 'F', subject: 'Math', term: 'T1' }] });

      let status422 = false;
      try {
        await createResult({ student_id: 'uuid-1', subject: 'Math', marks, term: 'T1' });
      } catch (err) {
        if (err.status === 422) status422 = true;
      }
      expect(status422).toBe(false);
    }
  });
});

// ── Grade calculation properties ──────────────────────────────────────────────

describe('Grade calculation invariants', () => {
  /**
   * Grade is always one of A, B, C, D, F for any marks in [0, 100].
   */
  test('grade is always a valid letter for any marks in [0, 100]', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 0, max: 100, noNaN: true, noDefaultInfinity: true }),
        (marks) => ['A', 'B', 'C', 'D', 'F'].includes(calculateGrade(marks))
      ),
      { numRuns: 1000 }
    );
  });

  /**
   * Grade is monotonically non-decreasing with marks:
   * higher marks never produce a lower grade.
   */
  test('higher marks never produce a lower grade', () => {
    const gradeOrder = { A: 5, B: 4, C: 3, D: 2, F: 1 };
    fc.assert(
      fc.property(
        fc.float({ min: 0, max: 100, noNaN: true, noDefaultInfinity: true }),
        fc.float({ min: 0, max: 100, noNaN: true, noDefaultInfinity: true }),
        (marks1, marks2) => {
          const g1 = calculateGrade(marks1);
          const g2 = calculateGrade(marks2);
          if (marks1 <= marks2) {
            return gradeOrder[g1] <= gradeOrder[g2];
          }
          return gradeOrder[g1] >= gradeOrder[g2];
        }
      ),
      { numRuns: 1000 }
    );
  });
});
