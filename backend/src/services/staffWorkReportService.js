'use strict';

const pool = require('../db/pool');

/**
 * Create a work report for the given staff member.
 * Validates that content is non-empty after trimming.
 *
 * @param {string} staffId   - UUID of the staff member
 * @param {object} data
 * @param {string} data.content      - Report content (must be non-empty)
 * @param {string} data.report_date  - ISO date string (YYYY-MM-DD)
 * @returns {object} The created report row
 */
async function createReport(staffId, { content, report_date }) {
  if (!content || !content.trim()) {
    const err = new Error('content is required and cannot be blank');
    err.status = 400;
    throw err;
  }

  if (!report_date) {
    const err = new Error('report_date is required');
    err.status = 400;
    throw err;
  }

  const { rows } = await pool.query(
    `INSERT INTO staff_work_reports (staff_id, report_date, content)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [staffId, report_date, content.trim()]
  );

  return rows[0];
}

/**
 * Return all reports submitted by a specific staff member,
 * ordered by report_date descending.
 *
 * @param {string} staffId - UUID of the staff member
 * @returns {Array} Array of report rows
 */
async function getMyReports(staffId) {
  const { rows } = await pool.query(
    `SELECT *
     FROM staff_work_reports
     WHERE staff_id = $1
     ORDER BY report_date DESC`,
    [staffId]
  );
  return rows;
}

/**
 * Return all reports, joined with user name/email.
 * Optionally filter to a single staff member.
 *
 * @param {string|null} staffIdFilter - UUID to filter by, or null for all reports
 * @returns {Array} Array of report rows with staff name and email included
 */
async function getAllReports(staffIdFilter = null) {
  const params = [];
  let whereClause = '';

  if (staffIdFilter) {
    params.push(staffIdFilter);
    whereClause = `WHERE r.staff_id = $1`;
  }

  const { rows } = await pool.query(
    `SELECT
       r.id,
       r.staff_id,
       r.report_date,
       r.content,
       r.created_at,
       u.name  AS staff_name,
       u.email AS staff_email
     FROM staff_work_reports r
     JOIN users u ON u.id = r.staff_id
     ${whereClause}
     ORDER BY r.report_date DESC`,
    params
  );

  return rows;
}

module.exports = { createReport, getMyReports, getAllReports };
