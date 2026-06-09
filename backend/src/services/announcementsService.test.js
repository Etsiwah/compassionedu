/**
 * Unit tests for announcementsService.js
 *
 * Requirements: 9.1, 9.2, 9.3, 9.4
 */

'use strict';

jest.mock('../db/pool', () => ({ query: jest.fn() }));

const pool = require('../db/pool');
const {
  getAnnouncementsForUser,
  createAnnouncement,
  markAsRead,
} = require('./announcementsService');

beforeEach(() => jest.clearAllMocks());

// ─────────────────────────────────────────────────────────────────────────────
// getAnnouncementsForUser
// ─────────────────────────────────────────────────────────────────────────────
describe('getAnnouncementsForUser', () => {
  const userId = 'user-uuid-1';

  test('returns announcements for a student role', async () => {
    const mockRows = [
      { id: 'ann-1', title: 'Welcome', content: 'Hello students', target_role: 'student', is_read: false },
      { id: 'ann-2', title: 'All Hands', content: 'For everyone', target_role: 'all', is_read: true },
    ];
    pool.query.mockResolvedValueOnce({ rows: mockRows });

    const result = await getAnnouncementsForUser(userId, 'student');

    expect(result).toEqual(mockRows);
    expect(pool.query).toHaveBeenCalledTimes(1);
  });

  test('passes userId and role to the query', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });

    await getAnnouncementsForUser(userId, 'teacher');

    const [, params] = pool.query.mock.calls[0];
    expect(params).toContain(userId);
    expect(params).toContain('teacher');
  });

  test('returns empty array when no announcements match', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });

    const result = await getAnnouncementsForUser(userId, 'parent');
    expect(result).toEqual([]);
  });

  test('includes is_read flag on each announcement', async () => {
    const mockRows = [
      { id: 'ann-1', title: 'Test', content: 'Body', target_role: 'all', is_read: false },
    ];
    pool.query.mockResolvedValueOnce({ rows: mockRows });

    const result = await getAnnouncementsForUser(userId, 'student');
    expect(result[0]).toHaveProperty('is_read');
  });

  test('filters by target_role — query includes both "all" and the user role', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });

    await getAnnouncementsForUser(userId, 'parent');

    const [sql] = pool.query.mock.calls[0];
    // The query must filter by target_role = 'all' OR target_role = userRole
    expect(sql).toMatch(/target_role/i);
    expect(sql).toMatch(/all/i);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// createAnnouncement
// ─────────────────────────────────────────────────────────────────────────────
describe('createAnnouncement', () => {
  const adminId = 'admin-uuid-1';

  test('creates an announcement with all fields', async () => {
    const mockRow = {
      id: 'ann-1',
      title: 'School Closure',
      content: 'School is closed tomorrow.',
      target_role: 'all',
      created_by: adminId,
      created_at: '2024-03-01T10:00:00Z',
    };
    pool.query.mockResolvedValueOnce({ rows: [mockRow] });

    const result = await createAnnouncement({
      title: 'School Closure',
      content: 'School is closed tomorrow.',
      target_role: 'all',
      created_by: adminId,
    });

    expect(result).toEqual(mockRow);
    expect(pool.query).toHaveBeenCalledTimes(1);
  });

  test('creates an announcement targeting students only', async () => {
    const mockRow = {
      id: 'ann-2',
      title: 'Exam Schedule',
      content: 'Exams start Monday.',
      target_role: 'student',
      created_by: adminId,
      created_at: '2024-03-01T10:00:00Z',
    };
    pool.query.mockResolvedValueOnce({ rows: [mockRow] });

    const result = await createAnnouncement({
      title: 'Exam Schedule',
      content: 'Exams start Monday.',
      target_role: 'student',
      created_by: adminId,
    });

    expect(result.target_role).toBe('student');
  });

  test('creates an announcement targeting teachers only', async () => {
    const mockRow = { id: 'ann-3', title: 'Staff Meeting', content: 'Friday 3pm', target_role: 'teacher', created_by: adminId };
    pool.query.mockResolvedValueOnce({ rows: [mockRow] });

    const result = await createAnnouncement({
      title: 'Staff Meeting',
      content: 'Friday 3pm',
      target_role: 'teacher',
      created_by: adminId,
    });

    expect(result.target_role).toBe('teacher');
  });

  test('creates an announcement targeting parents only', async () => {
    const mockRow = { id: 'ann-4', title: 'Parent Evening', content: 'Next week', target_role: 'parent', created_by: adminId };
    pool.query.mockResolvedValueOnce({ rows: [mockRow] });

    const result = await createAnnouncement({
      title: 'Parent Evening',
      content: 'Next week',
      target_role: 'parent',
      created_by: adminId,
    });

    expect(result.target_role).toBe('parent');
  });

  test('creates an announcement without created_by (null)', async () => {
    const mockRow = { id: 'ann-5', title: 'System Notice', content: 'Maintenance tonight', target_role: 'all', created_by: null };
    pool.query.mockResolvedValueOnce({ rows: [mockRow] });

    const result = await createAnnouncement({
      title: 'System Notice',
      content: 'Maintenance tonight',
      target_role: 'all',
    });

    expect(result.created_by).toBeNull();
  });

  test('rejects missing title with status 400', async () => {
    await expect(
      createAnnouncement({ content: 'Some content', target_role: 'all' })
    ).rejects.toMatchObject({ status: 400 });
    expect(pool.query).not.toHaveBeenCalled();
  });

  test('rejects missing content with status 400', async () => {
    await expect(
      createAnnouncement({ title: 'Title', target_role: 'all' })
    ).rejects.toMatchObject({ status: 400 });
    expect(pool.query).not.toHaveBeenCalled();
  });

  test('rejects missing target_role with status 400', async () => {
    await expect(
      createAnnouncement({ title: 'Title', content: 'Content' })
    ).rejects.toMatchObject({ status: 400 });
    expect(pool.query).not.toHaveBeenCalled();
  });

  test('rejects invalid target_role with status 422', async () => {
    await expect(
      createAnnouncement({ title: 'Title', content: 'Content', target_role: 'admin' })
    ).rejects.toMatchObject({ status: 422 });
    expect(pool.query).not.toHaveBeenCalled();
  });

  test('rejects unknown target_role value with status 422', async () => {
    await expect(
      createAnnouncement({ title: 'Title', content: 'Content', target_role: 'unknown' })
    ).rejects.toMatchObject({ status: 422 });
    expect(pool.query).not.toHaveBeenCalled();
  });

  test('accepts all valid target_role values without throwing', async () => {
    const validRoles = ['all', 'student', 'teacher', 'parent'];

    for (const role of validRoles) {
      pool.query.mockResolvedValueOnce({ rows: [{ id: 'ann-x', title: 'T', content: 'C', target_role: role }] });
      await expect(
        createAnnouncement({ title: 'T', content: 'C', target_role: role })
      ).resolves.toBeDefined();
    }

    expect(pool.query).toHaveBeenCalledTimes(validRoles.length);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// markAsRead
// ─────────────────────────────────────────────────────────────────────────────
describe('markAsRead', () => {
  const announcementId = 'ann-uuid-1';
  const userId = 'user-uuid-1';

  test('inserts a read record successfully', async () => {
    pool.query.mockResolvedValueOnce({ rowCount: 1 });

    await expect(markAsRead(announcementId, userId)).resolves.toBeUndefined();
    expect(pool.query).toHaveBeenCalledTimes(1);
  });

  test('passes announcementId and userId to the query', async () => {
    pool.query.mockResolvedValueOnce({ rowCount: 1 });

    await markAsRead(announcementId, userId);

    const [, params] = pool.query.mock.calls[0];
    expect(params).toContain(announcementId);
    expect(params).toContain(userId);
  });

  test('does not throw when called twice for the same pair (ON CONFLICT DO NOTHING)', async () => {
    pool.query
      .mockResolvedValueOnce({ rowCount: 1 })
      .mockResolvedValueOnce({ rowCount: 0 }); // second call is a no-op

    await expect(markAsRead(announcementId, userId)).resolves.toBeUndefined();
    await expect(markAsRead(announcementId, userId)).resolves.toBeUndefined();
    expect(pool.query).toHaveBeenCalledTimes(2);
  });

  test('uses ON CONFLICT DO NOTHING in the query', async () => {
    pool.query.mockResolvedValueOnce({ rowCount: 1 });

    await markAsRead(announcementId, userId);

    const [sql] = pool.query.mock.calls[0];
    expect(sql).toMatch(/ON CONFLICT DO NOTHING/i);
  });
});
