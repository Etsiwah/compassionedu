'use strict';

const path = require('path');
const fs   = require('fs');
const pool = require('../db/pool');

const UPLOAD_DIR = process.env.UPLOAD_DIR || 'uploads';
const BASE_DIR   = path.join(__dirname, '..', '..', UPLOAD_DIR);

/**
 * Record file ownership after a successful upload.
 * Uses ON CONFLICT DO NOTHING so duplicate calls are safe.
 *
 * @param {string} filename  - stored filename (e.g. "1698765432-document.pdf")
 * @param {string} userId    - UUID of the authenticated uploader
 * @param {string|null} context - e.g. 'portfolio', 'fee-receipt'
 */
async function recordOwnership(filename, userId, context) {
  await pool.query(
    `INSERT INTO file_ownership (filename, user_id, context)
     VALUES ($1, $2, $3)
     ON CONFLICT (filename) DO NOTHING`,
    [filename, userId, context || null]
  );
}

/**
 * Locate the absolute path of a file by searching all known upload subdirectories.
 *
 * @param {string} filename
 * @returns {string|null} absolute path if found, null otherwise
 */
function findFilePath(filename) {
  const subdirs = [
    'photos',
    'cvs',
    'results',
    'semester-results',
    'portfolio',
    'fee-receipts',
    'activity-images',
    'activity-posts',
    'experience-posts',
    'announcement-attachments',
    'beneficiary-docs',
    'activities',
    '',  // root of uploads dir
  ];

  for (const sub of subdirs) {
    const candidate = sub
      ? path.join(BASE_DIR, sub, filename)
      : path.join(BASE_DIR, filename);
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

/**
 * Enforce access control and return the absolute file path for serving.
 *
 * @param {string} filename            - filename as stored in file_ownership
 * @param {string} requestingUserId    - UUID of the authenticated requester
 * @param {string} requestingUserRole  - role of the authenticated requester
 * @returns {Promise<string>}          absolute path to the file on disk
 * @throws {Error} 404 if no ownership record exists or file not on disk
 * @throws {Error} 403 if requester is not the owner and not an admin
 */
async function serveFile(filename, requestingUserId, requestingUserRole) {
  // Look up ownership record
  const { rows } = await pool.query(
    'SELECT user_id FROM file_ownership WHERE filename = $1',
    [filename]
  );

  if (!rows.length) {
    const err = new Error('Not found');
    err.status = 404;
    throw err;
  }

  // Enforce ownership: only owner or admin may access
  if (requestingUserRole !== 'admin' && rows[0].user_id !== requestingUserId) {
    const err = new Error('Forbidden');
    err.status = 403;
    throw err;
  }

  // Locate the physical file
  const filePath = findFilePath(filename);
  if (!filePath) {
    const err = new Error('Not found');
    err.status = 404;
    throw err;
  }

  return filePath;
}

module.exports = { recordOwnership, serveFile, findFilePath };
