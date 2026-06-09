/**
 * Property-Based Tests for fee management
 *
 * Property 4: Fee status transition correctness — for any fee record,
 *   status must match the paid/pending/overdue logic.
 *
 * Validates: Requirements 4.1, 4.3
 *
 * // Feature: compassion-edu, Property 4: Fee status transition correctness
 */

'use strict';

const fc = require('fast-check');

// ── Pure logic helpers (extracted from feeService for property testing) ────────

/**
 * Determine the correct fee status given the fee amount, total paid, and due date.
 * This mirrors the business logic in feeService.
 *
 * @param {number} amount     - total fee amount
 * @param {number} totalPaid  - total amount paid so far
 * @param {Date}   dueDate    - fee due date
 * @param {Date}   [now]      - reference date (defaults to today)
 * @returns {'paid'|'overdue'|'pending'}
 */
function deriveStatus(amount, totalPaid, dueDate, now = new Date()) {
  if (totalPaid >= amount) return 'paid';
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  if (due < today) return 'overdue';
  return 'pending';
}

// ── Arbitraries ───────────────────────────────────────────────────────────────

const positiveAmountArb = fc.float({ min: 1, max: 10000, noNaN: true, noDefaultInfinity: true })
  .map(n => Math.round(n * 100) / 100);

const dateArb = fc.date({
  min: new Date('2020-01-01'),
  max: new Date('2030-12-31'),
});

// ── Property 4: Fee status transition correctness ─────────────────────────────

describe('Property 4: Fee status transition correctness', () => {
  /**
   * A fee is 'paid' if and only if totalPaid >= amount, regardless of due date.
   */
  test('fee is paid when totalPaid >= amount', () => {
    fc.assert(
      fc.property(
        positiveAmountArb,
        positiveAmountArb,
        dateArb,
        dateArb,
        (amount, extra, dueDate, now) => {
          const totalPaid = amount + extra; // always >= amount
          const status = deriveStatus(amount, totalPaid, dueDate, now);
          return status === 'paid';
        }
      ),
      { numRuns: 500 }
    );
  });

  /**
   * A fee is 'paid' when totalPaid exactly equals amount.
   */
  test('fee is paid when totalPaid exactly equals amount', () => {
    fc.assert(
      fc.property(
        positiveAmountArb,
        dateArb,
        dateArb,
        (amount, dueDate, now) => {
          const status = deriveStatus(amount, amount, dueDate, now);
          return status === 'paid';
        }
      ),
      { numRuns: 200 }
    );
  });

  /**
   * An unpaid fee with a past due date is 'overdue'.
   */
  test('unpaid fee with past due date is overdue', () => {
    fc.assert(
      fc.property(
        positiveAmountArb,
        // due date is strictly in the past relative to now
        fc.date({ min: new Date('2020-01-01'), max: new Date('2024-12-31') }),
        fc.date({ min: new Date('2025-01-01'), max: new Date('2030-12-31') }),
        (amount, dueDate, now) => {
          const status = deriveStatus(amount, 0, dueDate, now);
          return status === 'overdue';
        }
      ),
      { numRuns: 500 }
    );
  });

  /**
   * An unpaid fee with a future due date is 'pending'.
   */
  test('unpaid fee with future due date is pending', () => {
    fc.assert(
      fc.property(
        positiveAmountArb,
        // due date is strictly in the future relative to now
        fc.date({ min: new Date('2025-01-01'), max: new Date('2030-12-31') }),
        fc.date({ min: new Date('2020-01-01'), max: new Date('2024-12-31') }),
        (amount, dueDate, now) => {
          const status = deriveStatus(amount, 0, dueDate, now);
          return status === 'pending';
        }
      ),
      { numRuns: 500 }
    );
  });

  /**
   * Status is always one of the three valid values.
   */
  test('status is always paid, overdue, or pending', () => {
    fc.assert(
      fc.property(
        positiveAmountArb,
        positiveAmountArb,
        dateArb,
        dateArb,
        (amount, totalPaid, dueDate, now) => {
          const status = deriveStatus(amount, totalPaid, dueDate, now);
          return ['paid', 'overdue', 'pending'].includes(status);
        }
      ),
      { numRuns: 1000 }
    );
  });

  /**
   * A paid fee can never become overdue or pending (paid is terminal).
   */
  test('paid status is terminal — more payment does not change it', () => {
    fc.assert(
      fc.property(
        positiveAmountArb,
        positiveAmountArb,
        dateArb,
        dateArb,
        (amount, extra, dueDate, now) => {
          const totalPaid = amount + extra;
          const status1 = deriveStatus(amount, totalPaid, dueDate, now);
          // Adding even more payment should still be paid
          const status2 = deriveStatus(amount, totalPaid + 1000, dueDate, now);
          return status1 === 'paid' && status2 === 'paid';
        }
      ),
      { numRuns: 200 }
    );
  });
});
