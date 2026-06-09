/**
 * Fee Service — manages fee records, payments, overdue status updates,
 * summary aggregates, and upcoming deadline checks.
 *
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.7
 */

'use strict';

const pool = require('../db/pool');

/**
 * Fetch all fee records for a student, including their associated payments.
 * Returns records ordered by due_date ascending.
 *
 * @param {string} studentId - UUID of the student
 * @returns {Promise<object[]>} array of fee records with nested payments array
 */
async function getFeeRecords(studentId) {
  // Verify student exists
  const { rows: userRows } = await pool.query(
    'SELECT id FROM users WHERE id = $1 AND deleted_at IS NULL',
    [studentId]
  );
  if (userRows.length === 0) {
    const err = new Error('Resource not found');
    err.status = 404;
    throw err;
  }

  // Fetch all fees for the student
  const { rows: feeRows } = await pool.query(
    `SELECT
       id,
       student_id,
       amount,
       due_date,
       status,
       payment_plan,
       created_at
     FROM fees
     WHERE student_id = $1
     ORDER BY due_date ASC`,
    [studentId]
  );

  if (feeRows.length === 0) {
    return [];
  }

  // Fetch all payments for these fees in one query
  const feeIds = feeRows.map((f) => f.id);
  const { rows: paymentRows } = await pool.query(
    `SELECT
       id,
       fee_id,
       amount_paid,
       paid_at,
       transaction_id,
       receipt_ref
     FROM fee_payments
     WHERE fee_id = ANY($1::uuid[])
     ORDER BY paid_at ASC`,
    [feeIds]
  );

  // Group payments by fee_id
  const paymentsByFeeId = {};
  for (const payment of paymentRows) {
    if (!paymentsByFeeId[payment.fee_id]) {
      paymentsByFeeId[payment.fee_id] = [];
    }
    paymentsByFeeId[payment.fee_id].push(payment);
  }

  // Attach payments to each fee record
  return feeRows.map((fee) => ({
    ...fee,
    payments: paymentsByFeeId[fee.id] || [],
  }));
}

/**
 * Record a payment for a fee and update the fee status to 'paid' if the
 * total amount paid meets or exceeds the fee amount.
 *
 * @param {string} feeId       - UUID of the fee record
 * @param {object} paymentData
 * @param {number} paymentData.amount_paid    - amount being paid
 * @param {string} [paymentData.transaction_id] - optional transaction reference
 * @param {string} [paymentData.receipt_ref]    - optional receipt reference
 * @returns {Promise<object>} the newly created payment record
 */
async function recordPayment(feeId, paymentData) {
  const { amount_paid, transaction_id, receipt_ref } = paymentData;

  if (!amount_paid || isNaN(Number(amount_paid)) || Number(amount_paid) <= 0) {
    const err = new Error('amount_paid must be a positive number');
    err.status = 400;
    throw err;
  }

  // Fetch the fee record to verify it exists and get the total amount
  const { rows: feeRows } = await pool.query(
    'SELECT id, amount, status FROM fees WHERE id = $1',
    [feeId]
  );
  if (feeRows.length === 0) {
    const err = new Error('Resource not found');
    err.status = 404;
    throw err;
  }

  const fee = feeRows[0];

  // Insert the payment record
  const { rows: paymentRows } = await pool.query(
    `INSERT INTO fee_payments (fee_id, amount_paid, transaction_id, receipt_ref)
     VALUES ($1, $2, $3, $4)
     RETURNING id, fee_id, amount_paid, paid_at, transaction_id, receipt_ref`,
    [feeId, Number(amount_paid), transaction_id || null, receipt_ref || null]
  );

  const newPayment = paymentRows[0];

  // Calculate total paid so far (including this new payment)
  const { rows: totalRows } = await pool.query(
    'SELECT COALESCE(SUM(amount_paid), 0) AS total_paid FROM fee_payments WHERE fee_id = $1',
    [feeId]
  );

  const totalPaid = Number(totalRows[0].total_paid);
  const feeAmount = Number(fee.amount);

  // Update fee status to 'paid' if fully covered
  if (totalPaid >= feeAmount) {
    await pool.query(
      "UPDATE fees SET status = 'paid' WHERE id = $1",
      [feeId]
    );
  }

  return newPayment;
}

/**
 * Set status = 'overdue' for all fees where due_date < NOW() and status = 'pending'.
 * This is intended to be run on server start and on a daily schedule.
 *
 * @returns {Promise<number>} count of records updated
 */
async function updateOverdueStatuses() {
  const { rowCount } = await pool.query(
    `UPDATE fees
     SET status = 'overdue'
     WHERE due_date < CURRENT_DATE
       AND status = 'pending'`
  );

  if (rowCount > 0) {
    console.log(`[feeService] Marked ${rowCount} fee(s) as overdue.`);
  }

  return rowCount;
}

/**
 * Return aggregate fee totals across all students.
 * Used by the Admin dashboard (Requirement 8.2).
 *
 * @returns {Promise<object>} { total_collected, total_pending, total_overdue }
 */
async function getFeesSummary() {
  const { rows } = await pool.query(
    `SELECT
       COALESCE(SUM(CASE WHEN status = 'paid'    THEN amount ELSE 0 END), 0) AS total_collected,
       COALESCE(SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END), 0) AS total_pending,
       COALESCE(SUM(CASE WHEN status = 'overdue' THEN amount ELSE 0 END), 0) AS total_overdue
     FROM fees`
  );

  return {
    total_collected: Number(rows[0].total_collected),
    total_pending:   Number(rows[0].total_pending),
    total_overdue:   Number(rows[0].total_overdue),
  };
}

/**
 * Return all pending fee records whose due_date falls within the next 7 days.
 * The caller (route handler / notification system) is responsible for acting
 * on the returned data — this function only queries and returns.
 *
 * @returns {Promise<object[]>} array of fee records with student info
 */
async function checkUpcomingDeadlines() {
  const { rows } = await pool.query(
    `SELECT
       f.id,
       f.student_id,
       f.amount,
       f.due_date,
       f.status,
       f.payment_plan,
       u.name  AS student_name,
       u.email AS student_email
     FROM fees f
     JOIN users u ON u.id = f.student_id
     WHERE f.status = 'pending'
       AND f.due_date >= CURRENT_DATE
       AND f.due_date <= CURRENT_DATE + INTERVAL '7 days'
     ORDER BY f.due_date ASC`
  );

  return rows;
}

module.exports = {
  getFeeRecords,
  recordPayment,
  updateOverdueStatuses,
  getFeesSummary,
  checkUpcomingDeadlines,
};
