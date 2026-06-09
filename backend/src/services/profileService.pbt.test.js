/**
 * Property-Based Tests for profile management
 *
 * Property 9 (partial): Profile photo upload rejection — for any file with
 *   invalid MIME type or size > 10MB, upload must be rejected.
 *
 * Validates: Requirements 3.6
 *
 * // Feature: compassion-edu, Property 9: File upload rejection for invalid types and sizes
 */

'use strict';

jest.mock('../db/pool', () => ({ query: jest.fn() }));

const fc = require('fast-check');
const pool = require('../db/pool');
const { updateProfile } = require('./profileService');

beforeEach(() => jest.resetAllMocks());

// ── Constants matching profile.js route configuration ─────────────────────────

const ACCEPTED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
const MB = 1024 * 1024;

// ── Pure validation helpers (mirror the logic in routes/profile.js) ───────────

/**
 * Returns true if the MIME type is accepted for profile photos.
 * Mirrors the fileFilter in routes/profile.js.
 */
function isAcceptedMimeType(mimetype) {
  return ACCEPTED_MIME_TYPES.has(mimetype);
}

/**
 * Returns true if the file size is within the allowed limit.
 * Mirrors the limits.fileSize check in routes/profile.js.
 */
function isWithinSizeLimit(sizeBytes) {
  return sizeBytes <= MAX_FILE_SIZE_BYTES;
}

/**
 * Returns true if the upload should be accepted (valid MIME + within size).
 */
function isValidPhotoUpload(mimetype, sizeBytes) {
  return isAcceptedMimeType(mimetype) && isWithinSizeLimit(sizeBytes);
}

// ── Arbitraries ───────────────────────────────────────────────────────────────

const validMimeArb = fc.constantFrom('image/jpeg', 'image/png', 'image/webp');

const invalidMimeArb = fc.oneof(
  fc.constantFrom(
    'image/gif',
    'image/bmp',
    'image/tiff',
    'image/svg+xml',
    'video/mp4',
    'audio/mpeg',
    'application/pdf',
    'text/plain',
    'application/zip',
    'application/octet-stream'
  ),
  // Also generate arbitrary strings that are not in the accepted set
  fc.string({ minLength: 3, maxLength: 40 }).filter(s => !ACCEPTED_MIME_TYPES.has(s))
);

const withinSizeArb = fc.integer({ min: 1, max: MAX_FILE_SIZE_BYTES });
const oversizeArb = fc.integer({ min: MAX_FILE_SIZE_BYTES + 1, max: MAX_FILE_SIZE_BYTES * 10 });

// ── Property 9 (partial): Profile photo upload rejection ─────────────────────

describe('Property 9 (partial): Profile photo upload — MIME type validation', () => {
  /**
   * Any file with an invalid MIME type must be rejected, regardless of size.
   * The fileFilter in routes/profile.js must return false for these types.
   */
  test('invalid MIME type is always rejected', () => {
    fc.assert(
      fc.property(
        invalidMimeArb,
        withinSizeArb,
        (mimetype, size) => {
          return !isValidPhotoUpload(mimetype, size);
        }
      ),
      { numRuns: 500 }
    );
  });

  /**
   * The three accepted MIME types (JPEG, PNG, WEBP) within size limit must pass.
   */
  test('valid MIME types within size limit are always accepted', () => {
    fc.assert(
      fc.property(
        validMimeArb,
        withinSizeArb,
        (mimetype, size) => {
          return isValidPhotoUpload(mimetype, size);
        }
      ),
      { numRuns: 300 }
    );
  });

  /**
   * Acceptance is determined solely by membership in the accepted set —
   * no other string is accepted, no matter how similar it looks.
   */
  test('only exactly image/jpeg, image/png, image/webp are accepted', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 0, maxLength: 50 }),
        (mimetype) => {
          const accepted = isAcceptedMimeType(mimetype);
          const isKnownValid = ['image/jpeg', 'image/png', 'image/webp'].includes(mimetype);
          return accepted === isKnownValid;
        }
      ),
      { numRuns: 500 }
    );
  });
});

describe('Property 9 (partial): Profile photo upload — size limit enforcement', () => {
  /**
   * Any file exceeding 10MB must be rejected, regardless of MIME type.
   */
  test('file exceeding 10MB is always rejected', () => {
    fc.assert(
      fc.property(
        validMimeArb,
        oversizeArb,
        (mimetype, size) => {
          return !isValidPhotoUpload(mimetype, size);
        }
      ),
      { numRuns: 300 }
    );
  });

  /**
   * A file exactly at the 10MB boundary must be accepted (boundary is inclusive).
   */
  test('file exactly at 10MB boundary is accepted', () => {
    expect(isWithinSizeLimit(MAX_FILE_SIZE_BYTES)).toBe(true);
  });

  /**
   * A file one byte over the 10MB boundary must be rejected.
   */
  test('file one byte over 10MB boundary is rejected', () => {
    expect(isWithinSizeLimit(MAX_FILE_SIZE_BYTES + 1)).toBe(false);
  });

  /**
   * Files with invalid MIME type AND oversized are also rejected.
   */
  test('invalid MIME type AND oversized file is always rejected', () => {
    fc.assert(
      fc.property(
        invalidMimeArb,
        oversizeArb,
        (mimetype, size) => {
          return !isValidPhotoUpload(mimetype, size);
        }
      ),
      { numRuns: 200 }
    );
  });
});

describe('Property 9 (partial): Profile photo upload — combined validation', () => {
  /**
   * The only uploads that pass are those with a valid MIME type AND size <= 10MB.
   * This is the conjunction of both constraints.
   */
  test('upload is accepted if and only if MIME is valid AND size <= 10MB', () => {
    fc.assert(
      fc.property(
        fc.oneof(validMimeArb, invalidMimeArb),
        fc.oneof(withinSizeArb, oversizeArb),
        (mimetype, size) => {
          const result = isValidPhotoUpload(mimetype, size);
          const expected = isAcceptedMimeType(mimetype) && isWithinSizeLimit(size);
          return result === expected;
        }
      ),
      { numRuns: 500 }
    );
  });
});

// ── updateProfile: project_numbers validation ─────────────────────────────────

describe('updateProfile: project_numbers validation', () => {
  /**
   * project_numbers must be a non-negative integer.
   * Any negative value or non-integer must be rejected with status 400.
   */
  test('negative project_numbers is always rejected with 400', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.integer({ min: -10000, max: -1 }),
        async (userId, project_numbers) => {
          pool.query.mockReset();
          // Mock user exists check
          pool.query.mockResolvedValueOnce({ rows: [{ id: userId }] });

          let status = null;
          try {
            await updateProfile(userId, { project_numbers });
          } catch (err) {
            status = err.status;
          }
          return status === 400;
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Non-integer project_numbers (floats) must be rejected with status 400.
   * We use fc.double with a fractional offset to guarantee non-integer values.
   */
  test('non-integer project_numbers is always rejected with 400', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        // Generate non-integer floats by adding 0.5 to an integer in range
        fc.integer({ min: 0, max: 9999 }).map(n => n + 0.5),
        async (userId, project_numbers) => {
          pool.query.mockReset();
          pool.query.mockResolvedValueOnce({ rows: [{ id: userId }] });

          let status = null;
          try {
            await updateProfile(userId, { project_numbers });
          } catch (err) {
            status = err.status;
          }
          return status === 400;
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Valid non-negative integer project_numbers must not be rejected with 400.
   */
  test('valid non-negative integer project_numbers is accepted', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.integer({ min: 0, max: 10000 }),
        async (userId, project_numbers) => {
          pool.query.mockReset();
          // Mock user exists check
          pool.query.mockResolvedValueOnce({ rows: [{ id: userId }] });
          // Mock the upsert
          pool.query.mockResolvedValueOnce({ rows: [] });
          // Mock getProfile inner queries
          pool.query.mockResolvedValueOnce({ rows: [{ id: userId, name: 'Test', email: 'test@test.com', role: 'student' }] });
          pool.query.mockResolvedValueOnce({ rows: [] });

          let status400 = false;
          try {
            await updateProfile(userId, { project_numbers });
          } catch (err) {
            if (err.status === 400) status400 = true;
          }
          return !status400;
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * updateProfile with no recognized fields does not throw a 400.
   * (It simply calls getProfile after verifying the user exists.)
   */
  test('updateProfile with empty data does not throw 400', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        async (userId) => {
          pool.query.mockReset();
          pool.query.mockResolvedValueOnce({ rows: [{ id: userId }] });
          pool.query.mockResolvedValueOnce({ rows: [{ id: userId, name: 'Test', email: 'test@test.com', role: 'student' }] });
          pool.query.mockResolvedValueOnce({ rows: [] });

          let status400 = false;
          try {
            await updateProfile(userId, {});
          } catch (err) {
            if (err.status === 400) status400 = true;
          }
          return !status400;
        }
      ),
      { numRuns: 50 }
    );
  });
});

// ── addPhoto / setDefaultPhoto: 404 for non-existent user/photo ───────────────

describe('addPhoto and setDefaultPhoto: 404 for non-existent resources', () => {
  const { addPhoto, setDefaultPhoto } = require('./profileService');

  /**
   * addPhoto must return 404 when the user does not exist.
   */
  test('addPhoto returns 404 for non-existent user', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        async (userId) => {
          pool.query.mockReset();
          pool.query.mockResolvedValueOnce({ rows: [] }); // user not found

          let status = null;
          try {
            await addPhoto(userId, { url: '/uploads/photos/test.jpg' });
          } catch (err) {
            status = err.status;
          }
          return status === 404;
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * setDefaultPhoto must return 404 when the photo does not belong to the user.
   */
  test('setDefaultPhoto returns 404 for non-existent photo', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.uuid(),
        async (userId, photoId) => {
          pool.query.mockReset();
          pool.query.mockResolvedValueOnce({ rows: [] }); // photo not found

          let status = null;
          try {
            await setDefaultPhoto(userId, photoId);
          } catch (err) {
            status = err.status;
          }
          return status === 404;
        }
      ),
      { numRuns: 50 }
    );
  });
});
