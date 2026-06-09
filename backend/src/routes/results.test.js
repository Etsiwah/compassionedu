/**
 * Integration tests for results routes.
 *
 * Uses supertest against the Express app with the DB pool mocked.
 * Tests cover:
 *  - GET /api/results/:studentId — auth, role, and response shape
 *  - POST /api/results           — auth, role, marks validation
 *  - GET /api/results/:studentId/report-card/:term — PDF response
 *
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6
 */

'use strict';

jest.mock('../db/pool', () => ({ query: jest.fn() }));

const request  = require('supertest');
const jwt      = require('jsonwebtoken');
const pool     = require('../db/pool');
const app      = require('../app');

const SECRET = process.env.JWT_SECRET || 'changeme-jwt-secret';

// ── Token helpers ─────────────────────────────────────────────────────────────
function makeToken(role, sub = 'user-uuid-1') {
  return jwt.sign({ sub, role }, SECRET, { expiresIn: '1h' });
}

const STUDENT_ID = 'student-uuid-abc';

beforeEach(() => jest.resetAllMocks());

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/results/:studentId
// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/results/:studentId', () => {
  test('returns 401 without a token', async () => {
    const res = await request(app).get(`/api/results/${STUDENT_ID}`);
    expect(res.status).toBe(401);
  });

  test('returns 403 when student requests another student\'s results', async () => {
    const token = makeToken('student', 'different-student-id');

    // Student exists check
    pool.query.mockResolvedValueOnce({ rows: [{ id: STUDENT_ID }] });

    const res = await request(app)
      .get(`/api/results/${STUDENT_ID}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
  });

  test('returns 200 with results and trend for admin', async () => {
    const token = makeToken('admin');
    const mockResults = [
      { id: 'r1', student_id: STUDENT_ID, subject: 'Math', marks: '80', grade: 'B', term: 'T1', created_at: '' },
    ];

    pool.query
      .mockResolvedValueOnce({ rows: [{ id: STUDENT_ID }] })   // student exists
      .mockResolvedValueOnce({ rows: mockResults })              // getResults
      .mockResolvedValueOnce({ rows: [{ term: 'T1', average_marks: '80.00' }] }); // trend

    const res = await request(app)
      .get(`/api/results/${STUDENT_ID}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('results');
    expect(res.body).toHaveProperty('performance_trend');
    expect(res.body.results).toHaveLength(1);
  });

  test('returns 200 with results and gpa when ?term= is provided', async () => {
    const token = makeToken('admin');
    const mockResults = [
      { id: 'r1', student_id: STUDENT_ID, subject: 'Math', marks: '80', grade: 'B', term: 'T1', created_at: '' },
    ];

    pool.query
      .mockResolvedValueOnce({ rows: [{ id: STUDENT_ID }] })
      .mockResolvedValueOnce({ rows: mockResults })
      .mockResolvedValueOnce({ rows: [{ average: '80.00' }] }); // calculateGPA

    const res = await request(app)
      .get(`/api/results/${STUDENT_ID}?term=T1`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('gpa', 80);
    expect(res.body).not.toHaveProperty('performance_trend');
  });

  test('student can access their own results', async () => {
    const token = makeToken('student', STUDENT_ID);
    pool.query
      .mockResolvedValueOnce({ rows: [{ id: STUDENT_ID }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .get(`/api/results/${STUDENT_ID}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/results
// ─────────────────────────────────────────────────────────────────────────────
describe('POST /api/results', () => {
  test('returns 401 without a token', async () => {
    const res = await request(app).post('/api/results').send({});
    expect(res.status).toBe(401);
  });

  test('returns 403 for student role', async () => {
    const token = makeToken('student', STUDENT_ID);
    const res = await request(app)
      .post('/api/results')
      .set('Authorization', `Bearer ${token}`)
      .send({ student_id: STUDENT_ID, subject: 'Math', marks: 80, term: 'T1' });

    expect(res.status).toBe(403);
  });

  test('returns 422 when marks > 100', async () => {
    const token = makeToken('admin');
    const res = await request(app)
      .post('/api/results')
      .set('Authorization', `Bearer ${token}`)
      .send({ student_id: STUDENT_ID, subject: 'Math', marks: 150, term: 'T1' });

    expect(res.status).toBe(422);
    expect(res.body.error).toMatch(/marks must be between 0 and 100/i);
  });

  test('returns 422 when marks < 0', async () => {
    const token = makeToken('admin');
    const res = await request(app)
      .post('/api/results')
      .set('Authorization', `Bearer ${token}`)
      .send({ student_id: STUDENT_ID, subject: 'Math', marks: -5, term: 'T1' });

    expect(res.status).toBe(422);
  });

  test('returns 201 with created result for admin', async () => {
    const token = makeToken('admin');
    const newResult = {
      id: 'result-new',
      student_id: STUDENT_ID,
      subject: 'Mathematics',
      marks: '85.00',
      grade: 'B',
      term: 'Term 1 2024',
      created_at: new Date().toISOString(),
    };

    pool.query
      .mockResolvedValueOnce({ rows: [{ id: STUDENT_ID }] }) // student exists
      .mockResolvedValueOnce({ rows: [newResult] });           // INSERT

    const res = await request(app)
      .post('/api/results')
      .set('Authorization', `Bearer ${token}`)
      .send({ student_id: STUDENT_ID, subject: 'Mathematics', marks: 85, term: 'Term 1 2024' });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ subject: 'Mathematics', grade: 'B' });
  });

  test('returns 201 for teacher role', async () => {
    const token = makeToken('teacher');
    const newResult = {
      id: 'result-t1',
      student_id: STUDENT_ID,
      subject: 'Science',
      marks: '92.00',
      grade: 'A',
      term: 'T1',
      created_at: '',
    };

    pool.query
      .mockResolvedValueOnce({ rows: [{ id: STUDENT_ID }] })
      .mockResolvedValueOnce({ rows: [newResult] });

    const res = await request(app)
      .post('/api/results')
      .set('Authorization', `Bearer ${token}`)
      .send({ student_id: STUDENT_ID, subject: 'Science', marks: 92, term: 'T1' });

    expect(res.status).toBe(201);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/results/:studentId/report-card/:term
// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/results/:studentId/report-card/:term', () => {
  test('returns 401 without a token', async () => {
    const res = await request(app).get(`/api/results/${STUDENT_ID}/report-card/T1`);
    expect(res.status).toBe(401);
  });

  test('returns PDF buffer with correct content-type for admin', async () => {
    const token = makeToken('admin');

    pool.query
      .mockResolvedValueOnce({ rows: [{ id: STUDENT_ID, name: 'Alice', email: 'alice@school.edu' }] })
      .mockResolvedValueOnce({ rows: [{ subject: 'Math', marks: '80', grade: 'B' }] });

    const res = await request(app)
      .get(`/api/results/${STUDENT_ID}/report-card/Term1`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/application\/pdf/);
    expect(res.headers['content-disposition']).toMatch(/attachment/);
    expect(res.body).toBeTruthy();
  });

  test('returns 404 when student does not exist', async () => {
    const token = makeToken('admin');
    pool.query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .get(`/api/results/nonexistent/report-card/T1`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
  });
});
