/**
 * Results Service — manages examination results, GPA calculation,
 * performance trends, and PDF report card generation.
 *
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6
 */

'use strict';

const pool = require('../db/pool');
const PDFDocument = require('pdfkit');

// ── Grade calculation ──────────────────────────────────────────────────────────

/**
 * Derive a letter grade from a numeric marks value.
 * A: 90–100, B: 75–89, C: 60–74, D: 45–59, F: <45
 *
 * @param {number} marks - numeric marks in [0, 100]
 * @returns {string} letter grade
 */
function calculateGrade(marks) {
  if (marks >= 90) return 'A';
  if (marks >= 75) return 'B';
  if (marks >= 60) return 'C';
  if (marks >= 45) return 'D';
  return 'F';
}

// ── Service functions ──────────────────────────────────────────────────────────

/**
 * Fetch examination results for a student, optionally filtered by term.
 * Returns results ordered by term then subject.
 *
 * @param {string} studentId - UUID of the student
 * @param {string} [term]    - optional term filter (e.g. "Term 1 2024")
 * @returns {Promise<object[]>} array of result records
 */
async function getResults(studentId, term) {
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

  let query;
  let params;

  if (term) {
    query = `
      SELECT id, student_id, subject, marks, grade, term, created_at
      FROM results
      WHERE student_id = $1 AND term = $2
      ORDER BY term ASC, subject ASC
    `;
    params = [studentId, term];
  } else {
    query = `
      SELECT id, student_id, subject, marks, grade, term, created_at
      FROM results
      WHERE student_id = $1
      ORDER BY term ASC, subject ASC
    `;
    params = [studentId];
  }

  const { rows } = await pool.query(query, params);
  return rows;
}

/**
 * Create a new result entry after validating marks are in [0, 100].
 * Automatically calculates and stores the letter grade.
 *
 * @param {object} data
 * @param {string} data.student_id - UUID of the student
 * @param {string} data.subject    - subject name
 * @param {number} data.marks      - numeric marks (0–100)
 * @param {string} data.term       - term identifier
 * @returns {Promise<object>} the newly created result record
 */
async function createResult(data) {
  const { student_id, subject, marks, term } = data;

  // Validate required fields
  if (!student_id || !subject || marks === undefined || marks === null || !term) {
    const err = new Error('student_id, subject, marks, and term are required');
    err.status = 400;
    throw err;
  }

  const numericMarks = Number(marks);

  // Validate marks range — Requirement 5.6
  if (isNaN(numericMarks) || numericMarks < 0 || numericMarks > 100) {
    const err = new Error('Marks must be between 0 and 100');
    err.status = 422;
    throw err;
  }

  // Verify student exists
  const { rows: userRows } = await pool.query(
    'SELECT id FROM users WHERE id = $1 AND deleted_at IS NULL',
    [student_id]
  );
  if (userRows.length === 0) {
    const err = new Error('Resource not found');
    err.status = 404;
    throw err;
  }

  const grade = calculateGrade(numericMarks);

  const { rows } = await pool.query(
    `INSERT INTO results (student_id, subject, marks, grade, term)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, student_id, subject, marks, grade, term, created_at`,
    [student_id, subject, numericMarks, grade, term]
  );

  return rows[0];
}

/**
 * Calculate the average marks (GPA proxy) for a student in a given term.
 * Returns null if no results exist for the term.
 *
 * @param {string} studentId - UUID of the student
 * @param {string} term      - term identifier
 * @returns {Promise<number|null>} average marks rounded to 2 decimal places, or null
 */
async function calculateGPA(studentId, term) {
  const { rows } = await pool.query(
    `SELECT ROUND(AVG(marks)::numeric, 2) AS average
     FROM results
     WHERE student_id = $1 AND term = $2`,
    [studentId, term]
  );

  const avg = rows[0]?.average;
  return avg !== null && avg !== undefined ? Number(avg) : null;
}

/**
 * Return average marks per term for a student, ordered by term ascending.
 * Used to render the performance trend chart (Requirement 5.3).
 *
 * @param {string} studentId - UUID of the student
 * @returns {Promise<object[]>} array of { term, average_marks } ordered by term
 */
async function getPerformanceTrend(studentId) {
  const { rows } = await pool.query(
    `SELECT
       term,
       ROUND(AVG(marks)::numeric, 2) AS average_marks
     FROM results
     WHERE student_id = $1
     GROUP BY term
     ORDER BY term ASC`,
    [studentId]
  );

  return rows.map((r) => ({
    term: r.term,
    average_marks: Number(r.average_marks),
  }));
}

/**
 * Generate a PDF report card for a student for a specific term.
 * Returns a Buffer containing the PDF binary data.
 *
 * @param {string} studentId - UUID of the student
 * @param {string} term      - term identifier
 * @param {object} [studentData] - optional pre-fetched student data { id, name, email }
 * @returns {Promise<Buffer>} PDF buffer
 */
async function generateReportCardPDF(studentId, term, studentData) {
  let student = studentData;

  if (!student) {
    // Fetch student info if not provided
    const { rows: userRows } = await pool.query(
      'SELECT id, name, email FROM users WHERE id = $1 AND deleted_at IS NULL',
      [studentId]
    );
    if (userRows.length === 0) {
      const err = new Error('Resource not found');
      err.status = 404;
      throw err;
    }
    student = userRows[0];
  }
  // Fetch results for the term
  const { rows: resultRows } = await pool.query(
    `SELECT subject, marks, grade
     FROM results
     WHERE student_id = $1 AND term = $2
     ORDER BY subject ASC`,
    [studentId, term]
  );

  // Calculate average
  const average =
    resultRows.length > 0
      ? resultRows.reduce((sum, r) => sum + Number(r.marks), 0) / resultRows.length
      : null;

  // Build PDF using pdfkit
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const chunks = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // ── Header ──────────────────────────────────────────────────────────────
    doc
      .fontSize(22)
      .font('Helvetica-Bold')
      .text('CompassionEdu', { align: 'center' });

    doc
      .fontSize(16)
      .font('Helvetica')
      .text('Official Report Card', { align: 'center' });

    doc.moveDown();

    // ── Student info ─────────────────────────────────────────────────────────
    doc
      .fontSize(12)
      .font('Helvetica-Bold')
      .text('Student Information', { underline: true });

    doc.font('Helvetica').fontSize(11);
    doc.text(`Name:  ${student.name}`);
    doc.text(`Email: ${student.email}`);
    doc.text(`Term:  ${term}`);
    doc.text(`Date:  ${new Date().toLocaleDateString('en-ZA', { dateStyle: 'long' })}`);

    doc.moveDown();

    // ── Results table ────────────────────────────────────────────────────────
    doc
      .fontSize(12)
      .font('Helvetica-Bold')
      .text('Examination Results', { underline: true });

    doc.moveDown(0.5);

    if (resultRows.length === 0) {
      doc.font('Helvetica').fontSize(11).text('No results recorded for this term.');
    } else {
      // Column positions
      const colSubject = 50;
      const colMarks   = 300;
      const colGrade   = 400;
      const rowHeight  = 20;

      // Table header
      doc.font('Helvetica-Bold').fontSize(11);
      doc.text('Subject',  colSubject, doc.y, { continued: false });
      const headerY = doc.y - rowHeight;
      doc.text('Marks',    colMarks,   headerY, { continued: false });
      doc.text('Grade',    colGrade,   headerY, { continued: false });

      doc.moveDown(0.3);

      // Divider line
      doc
        .moveTo(colSubject, doc.y)
        .lineTo(480, doc.y)
        .strokeColor('#333333')
        .stroke();

      doc.moveDown(0.3);

      // Table rows
      doc.font('Helvetica').fontSize(11);
      for (const result of resultRows) {
        const rowY = doc.y;
        doc.text(result.subject, colSubject, rowY, { continued: false });
        doc.text(String(Number(result.marks).toFixed(1)), colMarks, rowY, { continued: false });
        doc.text(result.grade,   colGrade,   rowY, { continued: false });
        doc.moveDown(0.3);
      }

      // Divider line
      doc
        .moveTo(colSubject, doc.y)
        .lineTo(480, doc.y)
        .strokeColor('#333333')
        .stroke();

      doc.moveDown(0.5);

      // Average / GPA
      doc
        .font('Helvetica-Bold')
        .fontSize(12)
        .text(`Term Average: ${average !== null ? average.toFixed(2) : 'N/A'}  |  Overall Grade: ${average !== null ? calculateGrade(average) : 'N/A'}`);
    }

    doc.moveDown(2);

    // ── Footer ───────────────────────────────────────────────────────────────
    doc
      .fontSize(9)
      .font('Helvetica')
      .fillColor('#888888')
      .text(
        'This document was generated by CompassionEdu School Management System.',
        { align: 'center' }
      );

    doc.end();
  });
}

module.exports = {
  getResults,
  createResult,
  calculateGPA,
  getPerformanceTrend,
  generateReportCardPDF,
  calculateGrade, // exported for testing
};
