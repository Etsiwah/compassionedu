/**
 * Portfolio Service — manages student portfolio data including CV, experiences,
 * project media, skills, and the growth timeline.
 *
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7
 */

'use strict';

const pool = require('../db/pool');

const VALID_CV_MIMES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

function envMb(name, fallback) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

const MAX_CV_SIZE_MB = envMb('MAX_CV_SIZE_MB', 50);
const MAX_MEDIA_SIZE_MB = envMb('MAX_MEDIA_SIZE_MB', 50);
const MAX_CV_SIZE = MAX_CV_SIZE_MB * 1024 * 1024;
const MAX_MEDIA_SIZE = MAX_MEDIA_SIZE_MB * 1024 * 1024;

/**
 * Fetch the full portfolio for a student.
 * Returns cv_url, experiences (sorted by start_date ASC), media (non-flagged,
 * sorted by created_at DESC), and skills.
 *
 * @param {string} studentId - UUID of the student
 * @returns {Promise<object>} { cv_url, experiences, media, skills }
 */
async function getPortfolio(studentId) {
  const { rows: userRows } = await pool.query(
    'SELECT id FROM users WHERE id = $1 AND deleted_at IS NULL',
    [studentId]
  );
  if (userRows.length === 0) {
    const err = new Error('Resource not found');
    err.status = 404;
    throw err;
  }

  const [profileRes, experiencesRes, mediaRes] = await Promise.all([
    pool.query(
      'SELECT cv_url, project_numbers, skills FROM student_profiles WHERE user_id = $1',
      [studentId]
    ),
    pool.query(
      'SELECT * FROM experiences WHERE student_id = $1 ORDER BY start_date ASC',
      [studentId]
    ),
    pool.query(
      `SELECT * FROM portfolio_media
       WHERE student_id = $1 AND moderation_status != 'flagged'
       ORDER BY created_at DESC`,
      [studentId]
    ),
  ]);

  return {
    cv_url: profileRes.rows[0]?.cv_url || null,
    experiences: experiencesRes.rows,
    media: mediaRes.rows,
    skills: profileRes.rows[0]?.skills || [],
  };
}

/**
 * Store a CV file URL in the student's profile.
 * Validates that the file is PDF or DOCX and does not exceed the configured limit.
 *
 * @param {string} studentId - UUID of the student
 * @param {object} fileData  - { mimetype, size, url }
 * @returns {Promise<object>} { cv_url }
 */
async function uploadCV(studentId, fileData) {
  const { mimetype, size, url } = fileData;

  if (!VALID_CV_MIMES.includes(mimetype)) {
    const err = new Error('CV must be PDF or DOCX format');
    err.status = 422;
    err.field = 'file';
    throw err;
  }

  if (size > MAX_CV_SIZE) {
    const err = new Error(`CV file must not exceed ${MAX_CV_SIZE_MB}MB`);
    err.status = 422;
    err.field = 'file';
    throw err;
  }

  await pool.query(
    `INSERT INTO student_profiles (user_id, cv_url)
     VALUES ($1, $2)
     ON CONFLICT (user_id) DO UPDATE SET cv_url = $2, updated_at = NOW()`,
    [studentId, url]
  );

  return { cv_url: url };
}

/**
 * Add a new experience entry to the student's portfolio.
 *
 * @param {string} studentId - UUID of the student
 * @param {object} data      - { title, organization?, start_date, end_date?, description? }
 * @returns {Promise<object>} the created experience record
 */
async function addExperience(studentId, data) {
  const { title, organization, start_date, end_date, description } = data;

  if (!title || !start_date) {
    const err = new Error('title and start_date are required');
    err.status = 400;
    throw err;
  }

  const { rows } = await pool.query(
    `INSERT INTO experiences (student_id, title, organization, start_date, end_date, description)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [studentId, title, organization || null, start_date, end_date || null, description || null]
  );

  return rows[0];
}

/**
 * Update an existing experience entry.
 *
 * @param {string} id   - UUID of the experience record
 * @param {object} data - { title, organization?, start_date, end_date?, description? }
 * @returns {Promise<object>} the updated experience record
 */
async function updateExperience(id, data) {
  const { title, organization, start_date, end_date, description } = data;

  const { rows } = await pool.query(
    `UPDATE experiences
     SET title = $1, organization = $2, start_date = $3, end_date = $4, description = $5
     WHERE id = $6
     RETURNING *`,
    [title, organization || null, start_date, end_date || null, description || null, id]
  );

  if (rows.length === 0) {
    const err = new Error('Resource not found');
    err.status = 404;
    throw err;
  }

  return rows[0];
}

/**
 * Delete an experience entry.
 *
 * @param {string} id - UUID of the experience record
 * @returns {Promise<void>}
 */
async function deleteExperience(id) {
  const { rowCount } = await pool.query(
    'DELETE FROM experiences WHERE id = $1',
    [id]
  );

  if (rowCount === 0) {
    const err = new Error('Resource not found');
    err.status = 404;
    throw err;
  }
}

/**
 * Store a portfolio media file (image or video) for a student.
 * Validates that the file does not exceed the configured limit.
 * New media items start with moderation_status = 'pending'.
 *
 * @param {string} studentId - UUID of the student
 * @param {object} fileData  - { mimetype, size, url, title?, description? }
 * @returns {Promise<object>} the created portfolio_media record
 */
async function uploadMedia(studentId, fileData) {
  const { mimetype, size, url, title, description } = fileData;

  if (size > MAX_MEDIA_SIZE) {
    const err = new Error(`Media file must not exceed ${MAX_MEDIA_SIZE_MB}MB`);
    err.status = 422;
    err.field = 'file';
    throw err;
  }

  const { rows } = await pool.query(
    `INSERT INTO portfolio_media (student_id, url, mime_type, title, description)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [studentId, url, mimetype, title || null, description || null]
  );

  return rows[0];
}

/**
 * Replace the skills list for a student.
 *
 * @param {string}   studentId - UUID of the student
 * @param {string[]} skills    - array of skill strings
 * @returns {Promise<object>} { skills }
 */
async function updateSkills(studentId, skills) {
  if (!Array.isArray(skills)) {
    const err = new Error('skills must be an array');
    err.status = 400;
    throw err;
  }

  await pool.query(
    `INSERT INTO student_profiles (user_id, skills)
     VALUES ($1, $2)
     ON CONFLICT (user_id) DO UPDATE SET skills = $2, updated_at = NOW()`,
    [studentId, skills]
  );

  return { skills };
}

/**
 * Return the student's experience entries sorted by start_date ascending.
 * This forms the chronological Growth Timeline (Requirement 7.5).
 *
 * @param {string} studentId - UUID of the student
 * @returns {Promise<object[]>} array of experience records ordered by start_date ASC
 */
async function getGrowthTimeline(studentId) {
  const { rows } = await pool.query(
    'SELECT * FROM experiences WHERE student_id = $1 ORDER BY start_date ASC',
    [studentId]
  );

  return rows;
}

module.exports = {
  getPortfolio,
  uploadCV,
  addExperience,
  updateExperience,
  deleteExperience,
  uploadMedia,
  updateSkills,
  getGrowthTimeline,
};
