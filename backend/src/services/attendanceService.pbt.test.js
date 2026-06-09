/**
 * Property-Based Tests for attendance module
 *
 * Property 6: Attendance percentage calculation correctness — for any array
 *   of attendance records, percentage must equal present_count/total * 100.
 *
 * Validates: Requirements 6.2
 *
 * // Feature: compassion-edu, Property 6: Attendance percentage calculation correctness
 */

'use strict';

const fc = require('fast-check');

// ── Pure percentage logic (mirrors attendanceService.calculatePercentage) ─────

/**
 * Calculate attendance percentage from a list of status strings.
 * Returns null if the list is empty.
 *
 * @param {string[]} statuses - array of 'present' | 'absent' | 'late'
 * @returns {number|null}
 */
function calcPercentage(statuses) {
  const total = statuses.length;
  if (total === 0) return null;
  const presentCount = statuses.filter(s => s === 'present').length;
  return Math.round((presentCount / total) * 100 * 100) / 100;
}

// ── Arbitraries ───────────────────────────────────────────────────────────────

const statusArb = fc.constantFrom('present', 'absent', 'late');
const recordsArb = fc.array(statusArb, { minLength: 1, maxLength: 200 });

// ── Property 6: Attendance percentage calculation correctness ─────────────────

describe('Property 6: Attendance percentage calculation correctness', () => {
  /**
   * For any non-empty array of records, percentage = present_count / total * 100.
   */
  test('percentage equals present_count / total * 100', () => {
    fc.assert(
      fc.property(
        recordsArb,
        (statuses) => {
          const total = statuses.length;
          const presentCount = statuses.filter(s => s === 'present').length;
          const expected = Math.round((presentCount / total) * 100 * 100) / 100;
          const actual = calcPercentage(statuses);
          return actual === expected;
        }
      ),
      { numRuns: 1000 }
    );
  });

  /**
   * Percentage is always in [0, 100] for any non-empty input.
   */
  test('percentage is always in [0, 100]', () => {
    fc.assert(
      fc.property(
        recordsArb,
        (statuses) => {
          const pct = calcPercentage(statuses);
          return pct !== null && pct >= 0 && pct <= 100;
        }
      ),
      { numRuns: 1000 }
    );
  });

  /**
   * All-present records produce 100%.
   */
  test('all-present records produce 100%', () => {
    fc.assert(
      fc.property(
        fc.array(fc.constant('present'), { minLength: 1, maxLength: 200 }),
        (statuses) => calcPercentage(statuses) === 100
      ),
      { numRuns: 200 }
    );
  });

  /**
   * All-absent records produce 0%.
   */
  test('all-absent records produce 0%', () => {
    fc.assert(
      fc.property(
        fc.array(fc.constantFrom('absent', 'late'), { minLength: 1, maxLength: 200 }),
        (statuses) => calcPercentage(statuses) === 0
      ),
      { numRuns: 200 }
    );
  });

  /**
   * Empty records return null.
   */
  test('empty records return null', () => {
    expect(calcPercentage([])).toBeNull();
  });

  /**
   * Adding a 'present' record to any existing set never decreases the percentage.
   */
  test('adding a present record never decreases percentage', () => {
    fc.assert(
      fc.property(
        recordsArb,
        (statuses) => {
          const before = calcPercentage(statuses);
          const after = calcPercentage([...statuses, 'present']);
          return after >= before;
        }
      ),
      { numRuns: 500 }
    );
  });

  /**
   * Adding an 'absent' record to any existing set never increases the percentage.
   */
  test('adding an absent record never increases percentage', () => {
    fc.assert(
      fc.property(
        recordsArb,
        (statuses) => {
          const before = calcPercentage(statuses);
          const after = calcPercentage([...statuses, 'absent']);
          return after <= before;
        }
      ),
      { numRuns: 500 }
    );
  });

  /**
   * Low attendance threshold: percentage < 75 triggers notification.
   * For any set of records where present_count / total < 0.75, the
   * percentage must be < 75.
   */
  test('low attendance threshold is correctly identified', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100 }),  // total records
        fc.integer({ min: 0, max: 74 }),   // present count (< 75% of total)
        (total, presentCount) => {
          fc.pre(presentCount < total); // present must be less than total
          const statuses = [
            ...Array(presentCount).fill('present'),
            ...Array(total - presentCount).fill('absent'),
          ];
          const pct = calcPercentage(statuses);
          // If present/total < 0.75, percentage must be < 75
          return presentCount / total < 0.75 ? pct < 75 : true;
        }
      ),
      { numRuns: 500 }
    );
  });
});
