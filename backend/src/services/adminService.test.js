/**
 * Unit tests for adminService.js
 *
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7
 */

'use strict';

jest.mock('../db/pool', () => ({ query: jest.fn() }));

const pool = require('../db/pool');
const {
  getCompassionDashboard,
  getContentModerationItems,
  moderateContent,
} = require('./adminService');

beforeEach(() => jest.clearAllMocks());

// ─────────────────────────────────────────────────────────────────────────────
// getCompassionDashboard
// ─────────────────────────────────────────────────────────────────────────────
describe('getCompassionDashboard', () => {
  test('returns at-risk students with low attendance', async () => {
    const mockRows = [
      {
        id: 'student-1',
        name: 'Alice',
        email: 'alice@school.edu',
        attendance_percentage: '60.00',
        overdue_fees_count: '0',
      },
    ];
    pool.query.mockResolvedValueOnce({ rows: mockRows });

    const result = await getCompassionDashboard();

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Alice');
    expect(result[0].attendance_percentage).toBe('60.00');
  });

  test('returns at-risk students with overdue fees', async () => {
    const mockRows = [
      {
        id: 'student-2',
        name: 'Bob',
        email: 'bob@school.edu',
        attendance_percentage: '80.00',
        overdue_fees_count: '2',
      },
    ];
    pool.query.mockResolvedValueOnce({ rows: mockRows });

    const result = await getCompassionDashboard();

    expect(result).toHaveLength(1);
    expect(result[0].overdue_fees_count).toBe('2');
  });

  test('returns multiple at-risk students ordered by name', async () => {
    const mockRows = [
      { id: 'student-1', name: 'Alice', email: 'alice@school.edu', attendance_percentage: '60.00', overdue_fees_count: '0' },
      { id: 'student-2', name: 'Bob',   email: 'bob@school.edu',   attendance_percentage: '80.00', overdue_fees_count: '1' },
    ];
    pool.query.mockResolvedValueOnce({ rows: mockRows });

    const result = await getCompassionDashboard();

    expect(result).toHaveLength(2);
    expect(result[0].name).toBe('Alice');
    expect(result[1].name).toBe('Bob');
  });

  test('returns empty array when no at-risk students exist', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });

    const result = await getCompassionDashboard();

    expect(result).toEqual([]);
  });

  test('queries only active students with role student', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });

    await getCompassionDashboard();

    const queryText = pool.query.mock.calls[0][0];
    expect(queryText).toMatch(/role\s*=\s*'student'/);
    expect(queryText).toMatch(/deleted_at IS NULL/);
  });

  test('filters by attendance < 75 or overdue fees > 0', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });

    await getCompassionDashboard();

    const queryText = pool.query.mock.calls[0][0];
    expect(queryText).toMatch(/75/);
    expect(queryText).toMatch(/overdue/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// getContentModerationItems
// ─────────────────────────────────────────────────────────────────────────────
describe('getContentModerationItems', () => {
  test('returns all content items with student names', async () => {
    const mockRows = [
      {
        id: 'media-1',
        student_id: 'student-1',
        url: '/uploads/img.jpg',
        mime_type: 'image/jpeg',
        title: 'My Project',
        moderation_status: 'pending',
        student_name: 'Alice',
        created_at: '2024-01-01T00:00:00Z',
      },
      {
        id: 'media-2',
        student_id: 'student-2',
        url: '/uploads/video.mp4',
        mime_type: 'video/mp4',
        title: 'Demo Video',
        moderation_status: 'approved',
        student_name: 'Bob',
        created_at: '2024-01-02T00:00:00Z',
      },
    ];
    pool.query.mockResolvedValueOnce({ rows: mockRows });

    const result = await getContentModerationItems();

    expect(result).toHaveLength(2);
    expect(result[0].student_name).toBe('Alice');
    expect(result[1].student_name).toBe('Bob');
  });

  test('returns empty array when no content items exist', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });

    const result = await getContentModerationItems();

    expect(result).toEqual([]);
  });

  test('includes items of all moderation statuses', async () => {
    const mockRows = [
      { id: 'media-1', moderation_status: 'pending',  student_name: 'Alice' },
      { id: 'media-2', moderation_status: 'approved', student_name: 'Bob' },
      { id: 'media-3', moderation_status: 'flagged',  student_name: 'Carol' },
    ];
    pool.query.mockResolvedValueOnce({ rows: mockRows });

    const result = await getContentModerationItems();

    expect(result).toHaveLength(3);
    const statuses = result.map((r) => r.moderation_status);
    expect(statuses).toContain('pending');
    expect(statuses).toContain('approved');
    expect(statuses).toContain('flagged');
  });

  test('joins portfolio_media with users to include student_name', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });

    await getContentModerationItems();

    const queryText = pool.query.mock.calls[0][0];
    expect(queryText).toMatch(/portfolio_media/i);
    expect(queryText).toMatch(/JOIN users/i);
    expect(queryText).toMatch(/student_name/i);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// moderateContent
// ─────────────────────────────────────────────────────────────────────────────
describe('moderateContent', () => {
  const itemId = 'media-uuid-1';

  test('sets moderation_status to approved', async () => {
    const mockRow = {
      id: itemId,
      moderation_status: 'approved',
      url: '/uploads/img.jpg',
    };
    pool.query.mockResolvedValueOnce({ rows: [mockRow] });

    const result = await moderateContent(itemId, 'approved');

    expect(result.moderation_status).toBe('approved');
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE portfolio_media'),
      ['approved', itemId]
    );
  });

  test('sets moderation_status to flagged', async () => {
    const mockRow = {
      id: itemId,
      moderation_status: 'flagged',
      url: '/uploads/img.jpg',
    };
    pool.query.mockResolvedValueOnce({ rows: [mockRow] });

    const result = await moderateContent(itemId, 'flagged');

    expect(result.moderation_status).toBe('flagged');
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE portfolio_media'),
      ['flagged', itemId]
    );
  });

  test('throws 422 for invalid action', async () => {
    await expect(moderateContent(itemId, 'delete')).rejects.toMatchObject({ status: 422 });
    expect(pool.query).not.toHaveBeenCalled();
  });

  test('throws 422 for empty action string', async () => {
    await expect(moderateContent(itemId, '')).rejects.toMatchObject({ status: 422 });
    expect(pool.query).not.toHaveBeenCalled();
  });

  test('throws 422 for pending action (not a valid moderation action)', async () => {
    await expect(moderateContent(itemId, 'pending')).rejects.toMatchObject({ status: 422 });
    expect(pool.query).not.toHaveBeenCalled();
  });

  test('throws 404 when content item does not exist', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });

    await expect(moderateContent('nonexistent-id', 'approved')).rejects.toMatchObject({ status: 404 });
  });

  test('returns the updated content item on success', async () => {
    const mockRow = {
      id: itemId,
      student_id: 'student-1',
      url: '/uploads/img.jpg',
      mime_type: 'image/jpeg',
      title: 'My Project',
      moderation_status: 'approved',
      created_at: '2024-01-01T00:00:00Z',
    };
    pool.query.mockResolvedValueOnce({ rows: [mockRow] });

    const result = await moderateContent(itemId, 'approved');

    expect(result).toEqual(mockRow);
    expect(result.id).toBe(itemId);
  });
});
