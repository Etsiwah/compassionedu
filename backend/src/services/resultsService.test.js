/**
 * Unit tests for resultsService.js
 *
 * Tests cover:
 *  - calculateGrade helper
 *  - createResult validation (marks range, missing fields)
 *  - getResults filtering
 *  - calculateGPA
 *  - getPerformanceTrend
 *  - generateReportCardPDF (smoke test — verifies a Buffer is returned)
 *
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6
 */

'use strict';

// ── Mock the DB pool so tests run without a real PostgreSQL connection ─────────
jest.mock('../db/pool', () => {
  const mockQuery = jest.fn();
  return { query: mockQuery };
});

const pool = require('../db/pool');
const {
  calculateGrade,
  getResults,
  createResult,
  calculateGPA,
  getPerformanceTrend,
  generateReportCardPDF,
} = require('./resultsService');

// ── Helper to reset mocks between tests ───────────────────────────────────────
beforeEach(() => {
  jest.clearAllMocks();
});

// ─────────────────────────────────────────────────────────────────────────────
// calculateGrade
// ─────────────────────────────────────────────────────────────────────────────
describe('calculateGrade', () => {
  test('returns A for marks 90–100', () => {
    expect(calculateGrade(90)).toBe('A');
    expect(calculateGrade(100)).toBe('A');
    expect(calculateGrade(95)).toBe('A');
  });

  test('returns B for marks 75–89', () => {
    expect(calculateGrade(75)).toBe('B');
    expect(calculateGrade(89)).toBe('B');
    expect(calculateGrade(80)).toBe('B');
  });

  test('returns C for marks 60–74', () => {
    expect(calculateGrade(60)).toBe('C');
    expect(calculateGrade(74)).toBe('C');
  });

  test('returns D for marks 45–59', () => {
    expect(calculateGrade(45)).toBe('D');
    expect(calculateGrade(59)).toBe('D');
  });

  test('returns F for marks below 45', () => {
    expect(calculateGrade(44)).toBe('F');
    expect(calculateGrade(0)).toBe('F');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// createResult — validation
// ─────────────────────────────────────────────────────────────────────────────
describe('createResult — validation', () => {
  test('rejects marks above 100 with status 422', async () => {
    await expect(
      createResult({ student_id: 'uuid-1', subject: 'Math', marks: 101, term: 'T1' })
    ).rejects.toMatchObject({ status: 422, message: 'Marks must be between 0 and 100' });
  });

  test('rejects marks below 0 with status 422', async () => {
    await expect(
      createResult({ student_id: 'uuid-1', subject: 'Math', marks: -1, term: 'T1' })
    ).rejects.toMatchObject({ status: 422, message: 'Marks must be between 0 and 100' });
  });

  test('rejects NaN marks with status 422', async () => {
    await expect(
      createResult({ student_id: 'uuid-1', subject: 'Math', marks: NaN, term: 'T1' })
    ).rejects.toMatchObject({ status: 422 });
  });

  test('rejects missing marks with status 400', async () => {
    await expect(
      createResult({ student_id: 'uuid-1', subject: 'Math', term: 'T1' })
    ).rejects.toMatchObject({ status: 400 });
  });

  test('rejects missing student_id with status 400', async () => {
    await expect(
      createResult({ subject: 'Math', marks: 80, term: 'T1' })
    ).rejects.toMatchObject({ status: 400 });
  });

  test('rejects missing term with status 400', async () => {
    await expect(
      createResult({ student_id: 'uuid-1', subject: 'Math', marks: 80 })
    ).rejects.toMatchObject({ status: 400 });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// createResult — success path
// ─────────────────────────────────────────────────────────────────────────────
describe('createResult — success', () => {
  test('inserts result and returns record with calculated grade', async () => {
    const studentId = 'student-uuid-1';
    const newResult = {
      id: 'result-uuid-1',
      student_id: studentId,
      subject: 'Mathematics',
      marks: '85.00',
      grade: 'B',
      term: 'Term 1 2024',
      created_at: new Date().toISOString(),
    };

    // First call: verify student exists
    pool.query
      .mockResolvedValueOnce({ rows: [{ id: studentId }] })
      // Second call: INSERT
      .mockResolvedValueOnce({ rows: [newResult] });

    const result = await createResult({
      student_id: studentId,
      subject: 'Mathematics',
      marks: 85,
      term: 'Term 1 2024',
    });

    expect(result).toEqual(newResult);
    expect(pool.query).toHaveBeenCalledTimes(2);

    // Verify the INSERT call includes the correct grade
    const insertCall = pool.query.mock.calls[1];
    expect(insertCall[1]).toContain('B'); // grade param
  });

  test('assigns grade A for marks 90', async () => {
    const studentId = 'student-uuid-2';
    pool.query
      .mockResolvedValueOnce({ rows: [{ id: studentId }] })
      .mockResolvedValueOnce({
        rows: [{ id: 'r2', student_id: studentId, subject: 'Science', marks: '90.00', grade: 'A', term: 'T1', created_at: '' }],
      });

    const result = await createResult({ student_id: studentId, subject: 'Science', marks: 90, term: 'T1' });
    expect(result.grade).toBe('A');
  });

  test('rejects when student does not exist (404)', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] }); // student not found

    await expect(
      createResult({ student_id: 'nonexistent', subject: 'Math', marks: 80, term: 'T1' })
    ).rejects.toMatchObject({ status: 404 });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// getResults
// ─────────────────────────────────────────────────────────────────────────────
describe('getResults', () => {
  const studentId = 'student-uuid-3';

  test('returns all results when no term filter provided', async () => {
    const mockResults = [
      { id: 'r1', student_id: studentId, subject: 'Math', marks: '80', grade: 'B', term: 'T1', created_at: '' },
      { id: 'r2', student_id: studentId, subject: 'Science', marks: '70', grade: 'C', term: 'T2', created_at: '' },
    ];

    pool.query
      .mockResolvedValueOnce({ rows: [{ id: studentId }] }) // student exists
      .mockResolvedValueOnce({ rows: mockResults });

    const results = await getResults(studentId);
    expect(results).toEqual(mockResults);
  });

  test('filters results by term when term is provided', async () => {
    const mockResults = [
      { id: 'r1', student_id: studentId, subject: 'Math', marks: '80', grade: 'B', term: 'T1', created_at: '' },
    ];

    pool.query
      .mockResolvedValueOnce({ rows: [{ id: studentId }] })
      .mockResolvedValueOnce({ rows: mockResults });

    const results = await getResults(studentId, 'T1');
    expect(results).toEqual(mockResults);

    // Verify the query included the term parameter
    const selectCall = pool.query.mock.calls[1];
    expect(selectCall[1]).toContain('T1');
  });

  test('returns 404 when student does not exist', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });

    await expect(getResults('nonexistent')).rejects.toMatchObject({ status: 404 });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// calculateGPA
// ─────────────────────────────────────────────────────────────────────────────
describe('calculateGPA', () => {
  test('returns average marks for a term', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ average: '82.50' }] });

    const gpa = await calculateGPA('student-1', 'Term 1 2024');
    expect(gpa).toBe(82.5);
  });

  test('returns null when no results exist for the term', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ average: null }] });

    const gpa = await calculateGPA('student-1', 'Term 99');
    expect(gpa).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// getPerformanceTrend
// ─────────────────────────────────────────────────────────────────────────────
describe('getPerformanceTrend', () => {
  test('returns average marks per term ordered by term', async () => {
    const mockRows = [
      { term: 'Term 1 2023', average_marks: '72.00' },
      { term: 'Term 2 2023', average_marks: '78.50' },
      { term: 'Term 1 2024', average_marks: '85.00' },
    ];

    pool.query.mockResolvedValueOnce({ rows: mockRows });

    const trend = await getPerformanceTrend('student-1');

    expect(trend).toHaveLength(3);
    expect(trend[0]).toEqual({ term: 'Term 1 2023', average_marks: 72 });
    expect(trend[1]).toEqual({ term: 'Term 2 2023', average_marks: 78.5 });
    expect(trend[2]).toEqual({ term: 'Term 1 2024', average_marks: 85 });
  });

  test('returns empty array when student has no results', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });

    const trend = await getPerformanceTrend('student-1');
    expect(trend).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// generateReportCardPDF — smoke test
// ─────────────────────────────────────────────────────────────────────────────
describe('generateReportCardPDF', () => {
  test('returns a non-empty Buffer', async () => {
    const studentId = 'student-pdf-1';

    pool.query
      // student lookup
      .mockResolvedValueOnce({ rows: [{ id: studentId, name: 'Alice Dlamini', email: 'alice@school.edu' }] })
      // results for term
      .mockResolvedValueOnce({
        rows: [
          { subject: 'Mathematics', marks: '85', grade: 'B' },
          { subject: 'Science',     marks: '92', grade: 'A' },
        ],
      });

    const buffer = await generateReportCardPDF(studentId, 'Term 1 2024');

    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(buffer.length).toBeGreaterThan(0);
  });

  test('returns a Buffer even when no results exist for the term', async () => {
    const studentId = 'student-pdf-2';

    pool.query
      .mockResolvedValueOnce({ rows: [{ id: studentId, name: 'Bob Nkosi', email: 'bob@school.edu' }] })
      .mockResolvedValueOnce({ rows: [] });

    const buffer = await generateReportCardPDF(studentId, 'Term 99');

    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(buffer.length).toBeGreaterThan(0);
  });

  test('throws 404 when student does not exist', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });

    await expect(generateReportCardPDF('nonexistent', 'T1')).rejects.toMatchObject({ status: 404 });
  });
});
