/**
 * Unit tests for attendanceService.js
 *
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5
 */

'use strict';

jest.mock('../db/pool', () => ({ query: jest.fn() }));

const pool = require('../db/pool');
const {
  getAttendance,
  recordAttendance,
  calculatePercentage,
  getAttendanceAnalytics,
  checkLowAttendance,
} = require('./attendanceService');

beforeEach(() => jest.clearAllMocks());

// ─────────────────────────────────────────────────────────────────────────────
// getAttendance
// ─────────────────────────────────────────────────────────────────────────────
describe('getAttendance', () => {
  const studentId = 'student-uuid-1';

  test('returns records for a student', async () => {
    const mockRecords = [
      { id: 'a1', student_id: studentId, date: '2024-03-01', subject: 'Math', period: null, status: 'present', created_at: '' },
    ];
    pool.query
      .mockResolvedValueOnce({ rows: [{ id: studentId }] })
      .mockResolvedValueOnce({ rows: mockRecords });

    const result = await getAttendance(studentId);
    expect(result).toEqual(mockRecords);
  });

  test('passes month filter to query', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ id: studentId }] })
      .mockResolvedValueOnce({ rows: [] });

    await getAttendance(studentId, '2024-03');
    const selectCall = pool.query.mock.calls[1];
    expect(selectCall[1]).toContain('2024-03');
  });

  test('passes subject filter to query', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ id: studentId }] })
      .mockResolvedValueOnce({ rows: [] });

    await getAttendance(studentId, undefined, 'Science');
    const selectCall = pool.query.mock.calls[1];
    expect(selectCall[1]).toContain('Science');
  });

  test('throws 404 when student does not exist', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    await expect(getAttendance('nonexistent')).rejects.toMatchObject({ status: 404 });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// recordAttendance
// ─────────────────────────────────────────────────────────────────────────────
describe('recordAttendance', () => {
  test('inserts entries and returns created records', async () => {
    const entries = [
      { student_id: 'sid-1', date: '2024-03-01', subject: 'Math', status: 'present' },
      { student_id: 'sid-2', date: '2024-03-01', subject: 'Math', status: 'absent' },
    ];
    pool.query
      .mockResolvedValueOnce({ rows: [{ id: 'a1', student_id: 'sid-1', date: '2024-03-01', subject: 'Math', period: null, status: 'present', created_at: '' }] })
      .mockResolvedValueOnce({ rows: [{ id: 'a2', student_id: 'sid-2', date: '2024-03-01', subject: 'Math', period: null, status: 'absent', created_at: '' }] });

    const result = await recordAttendance(entries);
    expect(result).toHaveLength(2);
    expect(pool.query).toHaveBeenCalledTimes(2);
  });

  test('rejects empty entries array with status 400', async () => {
    await expect(recordAttendance([])).rejects.toMatchObject({ status: 400 });
  });

  test('rejects non-array with status 400', async () => {
    await expect(recordAttendance(null)).rejects.toMatchObject({ status: 400 });
  });

  test('rejects invalid status with status 422', async () => {
    await expect(
      recordAttendance([{ student_id: 'sid-1', date: '2024-03-01', status: 'unknown' }])
    ).rejects.toMatchObject({ status: 422 });
  });

  test('rejects entry missing required fields with status 400', async () => {
    await expect(
      recordAttendance([{ student_id: 'sid-1', date: '2024-03-01' }]) // missing status
    ).rejects.toMatchObject({ status: 400 });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// calculatePercentage
// ─────────────────────────────────────────────────────────────────────────────
describe('calculatePercentage', () => {
  test('calculates correct percentage', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ total: '4', present_count: '3' }] });
    const pct = await calculatePercentage('student-1');
    expect(pct).toBe(75);
  });

  test('returns 100 when all records are present', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ total: '5', present_count: '5' }] });
    const pct = await calculatePercentage('student-1');
    expect(pct).toBe(100);
  });

  test('returns 0 when no records are present', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ total: '3', present_count: '0' }] });
    const pct = await calculatePercentage('student-1');
    expect(pct).toBe(0);
  });

  test('returns null when no records exist', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ total: '0', present_count: '0' }] });
    const pct = await calculatePercentage('student-1');
    expect(pct).toBeNull();
  });

  test('rounds to 2 decimal places', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ total: '3', present_count: '1' }] });
    const pct = await calculatePercentage('student-1');
    expect(pct).toBe(33.33);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// getAttendanceAnalytics
// ─────────────────────────────────────────────────────────────────────────────
describe('getAttendanceAnalytics', () => {
  test('returns aggregate counts and overall percentage', async () => {
    pool.query.mockResolvedValueOnce({
      rows: [{ total_records: '10', present_count: '8', absent_count: '1', late_count: '1' }],
    });

    const analytics = await getAttendanceAnalytics();
    expect(analytics.total_records).toBe(10);
    expect(analytics.present_count).toBe(8);
    expect(analytics.overall_percentage).toBe(80);
  });

  test('returns null overall_percentage when no records', async () => {
    pool.query.mockResolvedValueOnce({
      rows: [{ total_records: '0', present_count: '0', absent_count: '0', late_count: '0' }],
    });

    const analytics = await getAttendanceAnalytics();
    expect(analytics.overall_percentage).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// checkLowAttendance
// ─────────────────────────────────────────────────────────────────────────────
describe('checkLowAttendance', () => {
  test('returns students with attendance below 75%', async () => {
    pool.query.mockResolvedValueOnce({
      rows: [
        { student_id: 'sid-1', name: 'Alice', email: 'alice@school.edu', attendance_percentage: '60.00' },
      ],
    });

    const result = await checkLowAttendance();
    expect(result).toHaveLength(1);
    expect(result[0].attendance_percentage).toBe(60);
  });

  test('returns empty array when all students meet threshold', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    const result = await checkLowAttendance();
    expect(result).toEqual([]);
  });
});
