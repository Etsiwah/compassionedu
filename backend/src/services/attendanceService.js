/**
 * Attendance Service — manages attendance records, percentage calculations,
 * analytics aggregates, and low-attendance notifications.
 *
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5
 */

'use strict';

const pool = require('../db/pool');

/**
 * Fetch attendance records for a student, optionally filtered by month and/or subject.
 *
 * @param {string} studentId  - UUID of the student
 * @param {string} [month]    - ISO month string e.g. "2024-03" (YYYY-MM)
 * @param {string} [subject]  - subject name filter
 * @returns {Promise<object[]>} array of attendance records ordered by date ASC
 */
async function getAttendance(studentId, month, subject) {
  const { rows: userRows } = await pool.query(
    'SELECT id FROM users WHERE id = $1 AND deleted_at IS NULL',
    [studentId]
  );
  if (userRows.length === 0) {
    const err = new Error('Resource not found');
    err.status = 404;
    throw err;
  }

  const conditions = ['student_id = $1'];
  const params = [studentId];
  let idx = 2;

  if (month) {
    conditions.push(`TO_CHAR(date, 'YYYY-MM') = $${idx++}`);
    params.push(month);
  }

  if (subject) {
    conditions.push(`subject = $${idx++}`);
    params.push(subject);
  }

  const { rows } = await pool.query(
    `SELECT id, student_id, date, subject, period, status, created_at
     FROM attendance
     WHERE ${conditions.join(' AND ')}
     ORDER BY date ASC`,
    params
  );

  return rows;
}

/**
 * Record attendance for one or more students in a class session.
 * Accepts an array of attendance entries.
 *
 * @param {object[]} entries - array of { student_id, date, subject, period?, status }
 * @returns {Promise<object[]>} array of created attendance records
 */
async function recordAttendance(entries) {
  if (!Array.isArray(entries) || entries.length === 0) {
    const err = new Error('entries must be a non-empty array');
    err.status = 400;
    throw err;
  }

  const VALID_STATUSES = ['present', 'absent', 'late'];

  for (const entry of entries) {
    if (!entry.student_id || !entry.date || !entry.status) {
      const err = new Error('Each entry requires student_id, date, and status');
      err.status = 400;
      throw err;
    }
    if (!VALID_STATUSES.includes(entry.status)) {
      const err = new Error(`status must be one of: ${VALID_STATUSES.join(', ')}`);
      err.status = 422;
      throw err;
    }
  }

  const created = [];
  for (const entry of entries) {
    const { rows } = await pool.query(
      `INSERT INTO attendance (student_id, date, subject, period, status)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, student_id, date, subject, period, status, created_at`,
      [
        entry.student_id,
        entry.date,
        entry.subject || null,
        entry.period || null,
        entry.status,
      ]
    );
    created.push(rows[0]);
  }

  return created;
}

/**
 * Calculate attendance percentage for a student, optionally scoped to a subject.
 * Returns null if no records exist.
 *
 * Formula: (count of 'present' / total) * 100, rounded to 2 decimal places.
 *
 * @param {string} studentId - UUID of the student
 * @param {string} [subject] - optional subject filter
 * @returns {Promise<number|null>}
 */
async function calculatePercentage(studentId, subject) {
  const conditions = ['student_id = $1'];
  const params = [studentId];

  if (subject) {
    conditions.push('subject = $2');
    params.push(subject);
  }

  const { rows } = await pool.query(
    `SELECT
       COUNT(*) AS total,
       COUNT(*) FILTER (WHERE status = 'present') AS present_count
     FROM attendance
     WHERE ${conditions.join(' AND ')}`,
    params
  );

  const total = Number(rows[0].total);
  if (total === 0) return null;

  const presentCount = Number(rows[0].present_count);
  return Math.round((presentCount / total) * 100 * 100) / 100;
}

/**
 * Return attendance analytics aggregated across all students.
 * Used by the Admin dashboard (Requirement 8.3).
 *
 * @returns {Promise<object>} { total_records, present_count, absent_count, late_count, overall_percentage }
 */
async function getAttendanceAnalytics() {
  const { rows } = await pool.query(
    `SELECT
       COUNT(*) AS total_records,
       COUNT(*) FILTER (WHERE status = 'present') AS present_count,
       COUNT(*) FILTER (WHERE status = 'absent')  AS absent_count,
       COUNT(*) FILTER (WHERE status = 'late')    AS late_count
     FROM attendance`
  );

  const total   = Number(rows[0].total_records);
  const present = Number(rows[0].present_count);
  const absent  = Number(rows[0].absent_count);
  const late    = Number(rows[0].late_count);

  const overallPercentage = total > 0
    ? Math.round((present / total) * 100 * 100) / 100
    : null;

  return { total_records: total, present_count: present, absent_count: absent, late_count: late, overall_percentage: overallPercentage };
}

/**
 * Return students whose attendance percentage (across all subjects) is below 75%.
 * Used to trigger notifications (Requirement 6.3).
 *
 * @returns {Promise<object[]>} array of { student_id, name, email, attendance_percentage }
 */
async function checkLowAttendance() {
  const { rows } = await pool.query(
    `SELECT
       a.student_id,
       u.name,
       u.email,
       ROUND(
         (COUNT(*) FILTER (WHERE a.status = 'present')::numeric / COUNT(*)) * 100,
         2
       ) AS attendance_percentage
     FROM attendance a
     JOIN users u ON u.id = a.student_id
     WHERE u.deleted_at IS NULL
     GROUP BY a.student_id, u.name, u.email
     HAVING (COUNT(*) FILTER (WHERE a.status = 'present')::numeric / COUNT(*)) * 100 < 75`
  );

  return rows.map((r) => ({
    student_id: r.student_id,
    name: r.name,
    email: r.email,
    attendance_percentage: Number(r.attendance_percentage),
  }));
}

module.exports = {
  getAttendance,
  recordAttendance,
  calculatePercentage,
  getAttendanceAnalytics,
  checkLowAttendance,
};
