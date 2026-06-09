/**
 * Unit tests for portfolioService.js
 *
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7
 */

'use strict';

jest.mock('../db/pool', () => ({ query: jest.fn() }));

const pool = require('../db/pool');
const {
  getPortfolio,
  uploadCV,
  addExperience,
  updateExperience,
  deleteExperience,
  uploadMedia,
  updateSkills,
  getGrowthTimeline,
} = require('./portfolioService');

beforeEach(() => jest.clearAllMocks());

// ─────────────────────────────────────────────────────────────────────────────
// getPortfolio
// ─────────────────────────────────────────────────────────────────────────────
describe('getPortfolio', () => {
  const studentId = 'student-uuid-1';

  test('returns portfolio data for a valid student', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ id: studentId }] }) // user check
      .mockResolvedValueOnce({ rows: [{ cv_url: '/uploads/cv.pdf', project_numbers: 3, skills: ['JS', 'Node'] }] }) // profile
      .mockResolvedValueOnce({ rows: [{ id: 'exp-1', title: 'Intern', start_date: '2023-01-01' }] }) // experiences
      .mockResolvedValueOnce({ rows: [{ id: 'media-1', url: '/uploads/img.jpg' }] }); // media

    const result = await getPortfolio(studentId);

    expect(result.cv_url).toBe('/uploads/cv.pdf');
    expect(result.experiences).toHaveLength(1);
    expect(result.media).toHaveLength(1);
    expect(result.skills).toEqual(['JS', 'Node']);
  });

  test('returns null cv_url and empty arrays when no profile exists', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ id: studentId }] })
      .mockResolvedValueOnce({ rows: [] })  // no profile row
      .mockResolvedValueOnce({ rows: [] })  // no experiences
      .mockResolvedValueOnce({ rows: [] }); // no media

    const result = await getPortfolio(studentId);

    expect(result.cv_url).toBeNull();
    expect(result.experiences).toEqual([]);
    expect(result.media).toEqual([]);
    expect(result.skills).toEqual([]);
  });

  test('throws 404 when student does not exist', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    await expect(getPortfolio('nonexistent')).rejects.toMatchObject({ status: 404 });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// uploadCV
// ─────────────────────────────────────────────────────────────────────────────
describe('uploadCV', () => {
  const studentId = 'student-uuid-1';

  test('accepts PDF files within size limit', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });

    const result = await uploadCV(studentId, {
      mimetype: 'application/pdf',
      size: 1024 * 1024, // 1 MB
      url: '/uploads/portfolio/cv.pdf',
    });

    expect(result).toEqual({ cv_url: '/uploads/portfolio/cv.pdf' });
    expect(pool.query).toHaveBeenCalledTimes(1);
  });

  test('accepts DOCX files within size limit', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });

    const result = await uploadCV(studentId, {
      mimetype: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      size: 2 * 1024 * 1024, // 2 MB
      url: '/uploads/portfolio/cv.docx',
    });

    expect(result).toEqual({ cv_url: '/uploads/portfolio/cv.docx' });
  });

  test('rejects invalid MIME type with 422', async () => {
    await expect(
      uploadCV(studentId, { mimetype: 'image/jpeg', size: 1024, url: '/uploads/cv.jpg' })
    ).rejects.toMatchObject({ status: 422, field: 'file' });
    expect(pool.query).not.toHaveBeenCalled();
  });

  test('rejects file exceeding 50MB with 422', async () => {
    await expect(
      uploadCV(studentId, {
        mimetype: 'application/pdf',
        size: 51 * 1024 * 1024, // 51 MB
        url: '/uploads/cv.pdf',
      })
    ).rejects.toMatchObject({ status: 422, field: 'file' });
    expect(pool.query).not.toHaveBeenCalled();
  });

  test('accepts file exactly at 50MB limit', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });

    await expect(
      uploadCV(studentId, {
        mimetype: 'application/pdf',
        size: 50 * 1024 * 1024, // exactly 50 MB
        url: '/uploads/cv.pdf',
      })
    ).resolves.toBeDefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// addExperience
// ─────────────────────────────────────────────────────────────────────────────
describe('addExperience', () => {
  const studentId = 'student-uuid-1';

  test('creates an experience entry with all fields', async () => {
    const mockRow = {
      id: 'exp-1',
      student_id: studentId,
      title: 'Software Intern',
      organization: 'TechCorp',
      start_date: '2023-06-01',
      end_date: '2023-08-31',
      description: 'Built features',
    };
    pool.query.mockResolvedValueOnce({ rows: [mockRow] });

    const result = await addExperience(studentId, {
      title: 'Software Intern',
      organization: 'TechCorp',
      start_date: '2023-06-01',
      end_date: '2023-08-31',
      description: 'Built features',
    });

    expect(result).toEqual(mockRow);
  });

  test('creates an experience entry with only required fields', async () => {
    const mockRow = { id: 'exp-2', student_id: studentId, title: 'Volunteer', start_date: '2023-01-01' };
    pool.query.mockResolvedValueOnce({ rows: [mockRow] });

    const result = await addExperience(studentId, { title: 'Volunteer', start_date: '2023-01-01' });
    expect(result).toEqual(mockRow);
  });

  test('rejects missing title with 400', async () => {
    await expect(
      addExperience(studentId, { start_date: '2023-01-01' })
    ).rejects.toMatchObject({ status: 400 });
    expect(pool.query).not.toHaveBeenCalled();
  });

  test('rejects missing start_date with 400', async () => {
    await expect(
      addExperience(studentId, { title: 'Intern' })
    ).rejects.toMatchObject({ status: 400 });
    expect(pool.query).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// updateExperience
// ─────────────────────────────────────────────────────────────────────────────
describe('updateExperience', () => {
  test('updates and returns the experience record', async () => {
    const mockRow = { id: 'exp-1', title: 'Updated Title', start_date: '2023-01-01' };
    pool.query.mockResolvedValueOnce({ rows: [mockRow] });

    const result = await updateExperience('exp-1', { title: 'Updated Title', start_date: '2023-01-01' });
    expect(result).toEqual(mockRow);
  });

  test('throws 404 when experience does not exist', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    await expect(
      updateExperience('nonexistent', { title: 'X', start_date: '2023-01-01' })
    ).rejects.toMatchObject({ status: 404 });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// deleteExperience
// ─────────────────────────────────────────────────────────────────────────────
describe('deleteExperience', () => {
  test('deletes the experience record successfully', async () => {
    pool.query.mockResolvedValueOnce({ rowCount: 1 });
    await expect(deleteExperience('exp-1')).resolves.toBeUndefined();
  });

  test('throws 404 when experience does not exist', async () => {
    pool.query.mockResolvedValueOnce({ rowCount: 0 });
    await expect(deleteExperience('nonexistent')).rejects.toMatchObject({ status: 404 });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// uploadMedia
// ─────────────────────────────────────────────────────────────────────────────
describe('uploadMedia', () => {
  const studentId = 'student-uuid-1';

  test('stores media file within size limit', async () => {
    const mockRow = {
      id: 'media-1',
      student_id: studentId,
      url: '/uploads/portfolio/media-img.jpg',
      mime_type: 'image/jpeg',
      title: 'My Project',
      description: null,
      moderation_status: 'pending',
    };
    pool.query.mockResolvedValueOnce({ rows: [mockRow] });

    const result = await uploadMedia(studentId, {
      mimetype: 'image/jpeg',
      size: 5 * 1024 * 1024, // 5 MB
      url: '/uploads/portfolio/media-img.jpg',
      title: 'My Project',
    });

    expect(result).toEqual(mockRow);
  });

  test('rejects media file exceeding 50MB with 422', async () => {
    await expect(
      uploadMedia(studentId, {
        mimetype: 'video/mp4',
        size: 51 * 1024 * 1024, // 51 MB
        url: '/uploads/portfolio/video.mp4',
      })
    ).rejects.toMatchObject({ status: 422, field: 'file' });
    expect(pool.query).not.toHaveBeenCalled();
  });

  test('accepts media file exactly at 50MB limit', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ id: 'media-2' }] });

    await expect(
      uploadMedia(studentId, {
        mimetype: 'image/png',
        size: 50 * 1024 * 1024, // exactly 50 MB
        url: '/uploads/portfolio/img.png',
      })
    ).resolves.toBeDefined();
  });

  test('accepts any MIME type for media', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ id: 'media-3' }] });

    await expect(
      uploadMedia(studentId, {
        mimetype: 'video/mp4',
        size: 10 * 1024 * 1024,
        url: '/uploads/portfolio/video.mp4',
      })
    ).resolves.toBeDefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// updateSkills
// ─────────────────────────────────────────────────────────────────────────────
describe('updateSkills', () => {
  const studentId = 'student-uuid-1';

  test('updates skills and returns the new list', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });

    const result = await updateSkills(studentId, ['JavaScript', 'Python', 'SQL']);
    expect(result).toEqual({ skills: ['JavaScript', 'Python', 'SQL'] });
  });

  test('accepts an empty skills array', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });

    const result = await updateSkills(studentId, []);
    expect(result).toEqual({ skills: [] });
  });

  test('rejects non-array skills with 400', async () => {
    await expect(updateSkills(studentId, 'JavaScript')).rejects.toMatchObject({ status: 400 });
    expect(pool.query).not.toHaveBeenCalled();
  });

  test('rejects null skills with 400', async () => {
    await expect(updateSkills(studentId, null)).rejects.toMatchObject({ status: 400 });
    expect(pool.query).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// getGrowthTimeline
// ─────────────────────────────────────────────────────────────────────────────
describe('getGrowthTimeline', () => {
  const studentId = 'student-uuid-1';

  test('returns experiences sorted by start_date ascending', async () => {
    const mockRows = [
      { id: 'exp-1', title: 'First Job', start_date: '2021-01-01' },
      { id: 'exp-2', title: 'Second Job', start_date: '2022-06-01' },
      { id: 'exp-3', title: 'Third Job', start_date: '2023-09-01' },
    ];
    pool.query.mockResolvedValueOnce({ rows: mockRows });

    const result = await getGrowthTimeline(studentId);

    expect(result).toHaveLength(3);
    expect(result[0].title).toBe('First Job');
    expect(result[1].title).toBe('Second Job');
    expect(result[2].title).toBe('Third Job');
  });

  test('returns empty array when no experiences exist', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });

    const result = await getGrowthTimeline(studentId);
    expect(result).toEqual([]);
  });

  test('queries with ORDER BY start_date ASC', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });

    await getGrowthTimeline(studentId);

    const queryCall = pool.query.mock.calls[0];
    expect(queryCall[0]).toMatch(/ORDER BY start_date ASC/i);
  });
});
