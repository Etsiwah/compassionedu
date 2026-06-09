/**
 * Property-Based Tests for portfolio module
 *
 * Property 9 (full): File upload rejection — for any CV with invalid MIME
 *   type or any media > 50MB, upload must be rejected.
 *
 * Validates: Requirements 7.6, 7.7
 *
 * // Feature: compassion-edu, Property 9: File upload rejection for invalid types and sizes
 */

'use strict';

jest.mock('../db/pool', () => ({ query: jest.fn() }));

const fc = require('fast-check');
const pool = require('../db/pool');
const { uploadCV, uploadMedia, getGrowthTimeline } = require('./portfolioService');

beforeEach(() => jest.resetAllMocks());

const MB = 1024 * 1024;
const MAX_SIZE = 50 * MB;

const VALID_CV_MIMES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

const INVALID_CV_MIMES = [
  'image/jpeg', 'image/png', 'video/mp4', 'text/plain',
  'application/zip', 'application/msword', 'audio/mpeg',
];

// ── Property 9: File upload rejection ─────────────────────────────────────────

describe('Property 9: CV upload — invalid MIME type rejection', () => {
  /**
   * Any CV with a MIME type not in [PDF, DOCX] must be rejected with 422.
   */
  test('invalid CV MIME type is always rejected with 422', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...INVALID_CV_MIMES),
        fc.integer({ min: 1, max: MAX_SIZE }),
        async (mimetype, size) => {
          let status = null;
          try {
            await uploadCV('student-1', { mimetype, size, url: '/uploads/cv.bin' });
          } catch (err) {
            status = err.status;
          }
          return status === 422 && pool.query.mock.calls.length === 0;
        }
      ),
      { numRuns: 200 }
    );
  });

  /**
   * Valid MIME types (PDF, DOCX) within size limit must NOT be rejected by MIME check.
   */
  test('valid CV MIME types within size limit are accepted', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...VALID_CV_MIMES),
        fc.integer({ min: 1, max: MAX_SIZE }),
        async (mimetype, size) => {
          pool.query.mockReset();
          pool.query.mockResolvedValueOnce({ rows: [] });

          let status422 = false;
          try {
            await uploadCV('student-1', { mimetype, size, url: '/uploads/cv.pdf' });
          } catch (err) {
            if (err.status === 422) status422 = true;
          }
          return !status422;
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Property 9: CV upload — size limit enforcement', () => {
  /**
   * Any CV file exceeding 50MB must be rejected with 422, regardless of MIME type.
   */
  test('CV file exceeding 50MB is always rejected with 422', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...VALID_CV_MIMES),
        fc.integer({ min: MAX_SIZE + 1, max: MAX_SIZE * 10 }),
        async (mimetype, size) => {
          let status = null;
          try {
            await uploadCV('student-1', { mimetype, size, url: '/uploads/cv.pdf' });
          } catch (err) {
            status = err.status;
          }
          return status === 422 && pool.query.mock.calls.length === 0;
        }
      ),
      { numRuns: 200 }
    );
  });

  /**
   * A file exactly at the 50MB boundary must be accepted.
   */
  test('CV file exactly at 50MB boundary is accepted', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    let threw = false;
    try {
      await uploadCV('student-1', {
        mimetype: 'application/pdf',
        size: MAX_SIZE,
        url: '/uploads/cv.pdf',
      });
    } catch {
      threw = true;
    }
    expect(threw).toBe(false);
  });
});

describe('Property 9: Media upload — size limit enforcement', () => {
  /**
   * Any media file exceeding 50MB must be rejected with 422.
   */
  test('media file exceeding 50MB is always rejected with 422', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 5, maxLength: 30 }).map(s => `${s}/${s}`), // fake MIME
        fc.integer({ min: MAX_SIZE + 1, max: MAX_SIZE * 10 }),
        async (mimetype, size) => {
          let status = null;
          try {
            await uploadMedia('student-1', { mimetype, size, url: '/uploads/media.bin' });
          } catch (err) {
            status = err.status;
          }
          return status === 422 && pool.query.mock.calls.length === 0;
        }
      ),
      { numRuns: 200 }
    );
  });

  /**
   * Media accepts any MIME type within the size limit.
   */
  test('media accepts any MIME type within size limit', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('image/jpeg', 'video/mp4', 'image/png', 'application/pdf', 'audio/mpeg'),
        fc.integer({ min: 1, max: MAX_SIZE }),
        async (mimetype, size) => {
          pool.query.mockReset();
          pool.query.mockResolvedValueOnce({ rows: [{ id: 'media-1' }] });

          let status422 = false;
          try {
            await uploadMedia('student-1', { mimetype, size, url: '/uploads/media.bin' });
          } catch (err) {
            if (err.status === 422) status422 = true;
          }
          return !status422;
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Growth timeline ordering', () => {
  /**
   * getGrowthTimeline must always return experiences sorted by start_date ASC.
   * We verify the SQL query contains ORDER BY start_date ASC.
   */
  test('growth timeline query always orders by start_date ASC', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        async (studentId) => {
          pool.query.mockReset();
          pool.query.mockResolvedValueOnce({ rows: [] });

          await getGrowthTimeline(studentId);

          const [sql] = pool.query.mock.calls[0];
          return /ORDER BY start_date ASC/i.test(sql);
        }
      ),
      { numRuns: 50 }
    );
  });
});
