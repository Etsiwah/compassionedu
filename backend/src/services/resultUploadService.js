'use strict';

const pool   = require('../db/pool');
const audit  = require('./auditService');

/* ── Level structure ─────────────────────────────────────────────────────── */
const LEVEL_STRUCTURE = {
  JHS: {
    years: ['JHS 1', 'JHS 2', 'JHS 3'],
    periods: ['Term 1', 'Term 2', 'Term 3'],
  },
  SHS: {
    years: ['SHS 1', 'SHS 2', 'SHS 3'],
    periods: ['Semester 1', 'Semester 2'],
  },
  Diploma: {
    years: ['Diploma 1', 'Diploma 2'],
    periods: ['Semester 1', 'Semester 2'],
  },
  Degree: {
    years: ['Degree 1', 'Degree 2', 'Degree 3', 'Degree 4'],
    periods: ['Semester 1', 'Semester 2'],
  },
};

function getLevelGroup(level) {
  if (!level) return null;
  const l = level.toUpperCase();
  if (l.startsWith('JHS'))     return 'JHS';
  if (l.startsWith('SHS'))     return 'SHS';
  if (l.startsWith('DIPLOMA')) return 'Diploma';
  if (l.startsWith('DEGREE'))  return 'Degree';
  return null;
}

/* ── Performance scoring ─────────────────────────────────────────────────── */
function scoreCategory(score) {
  if (score >= 80) return 'Excellent';
  if (score >= 70) return 'Very Good';
  if (score >= 60) return 'Good';
  if (score >= 50) return 'Average';
  return 'Poor';
}

function calcTrend(uploads) {
  // uploads sorted oldest → newest, each with a performance_score
  const scores = uploads
    .filter(u => u.performance_score != null)
    .map(u => Number(u.performance_score));
  if (scores.length < 2) return 'Stable';
  const last  = scores[scores.length - 1];
  const prev  = scores[scores.length - 2];
  if (last > prev + 2)  return 'Improving';
  if (last < prev - 2)  return 'Declining';
  return 'Stable';
}

/* ── Ensure tables exist ─────────────────────────────────────────────────── */
async function ensureTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS student_result_uploads (
      id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      student_id       UUID REFERENCES users(id) ON DELETE CASCADE,
      academic_level   VARCHAR(50)  NOT NULL,
      year_label       VARCHAR(50)  NOT NULL,
      period_label     VARCHAR(50)  NOT NULL,
      file_name        VARCHAR(255) NOT NULL,
      file_url         TEXT         NOT NULL,
      mime_type        VARCHAR(100) NOT NULL,
      file_size        BIGINT       NOT NULL,
      status           VARCHAR(20)  NOT NULL DEFAULT 'pending'
                         CHECK (status IN ('pending','approved','rejected')),
      admin_comment    TEXT,
      rejection_reason TEXT,
      performance_score NUMERIC(5,2),
      performance_category VARCHAR(20),
      reviewed_by      UUID REFERENCES users(id) ON DELETE SET NULL,
      reviewed_at      TIMESTAMPTZ,
      uploaded_at      TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE (student_id, academic_level, year_label, period_label)
    )
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_result_uploads_student
      ON student_result_uploads(student_id)
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_result_uploads_status
      ON student_result_uploads(status)
  `);
}

/* ── Upload a result ─────────────────────────────────────────────────────── */
async function uploadResult(studentId, {
  academic_level, year_label, period_label,
  file_name, file_url, mime_type, file_size,
}) {
  await ensureTables();

  if (!academic_level || !year_label || !period_label) {
    const e = new Error('academic_level, year_label, and period_label are required');
    e.status = 400; throw e;
  }

  // Validate level group
  const group = getLevelGroup(academic_level);
  if (!group) {
    const e = new Error(`Invalid academic level: ${academic_level}`);
    e.status = 400; throw e;
  }

  // Enforce current-level rule: year_label must start with the group prefix
  const yearGroup = getLevelGroup(year_label);
  if (yearGroup !== group) {
    const e = new Error(`Year "${year_label}" does not belong to level "${academic_level}"`);
    e.status = 400; throw e;
  }

  // Check duplicate
  const { rows: existing } = await pool.query(
    `SELECT id FROM student_result_uploads
     WHERE student_id = $1 AND academic_level = $2
       AND year_label = $3 AND period_label = $4`,
    [studentId, academic_level, year_label, period_label]
  );
  if (existing.length > 0) {
    const e = new Error(`A result for ${year_label} ${period_label} already exists. Delete it first to re-upload.`);
    e.status = 409; throw e;
  }

  const { rows } = await pool.query(
    `INSERT INTO student_result_uploads
       (student_id, academic_level, year_label, period_label,
        file_name, file_url, mime_type, file_size)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     RETURNING *`,
    [studentId, academic_level, year_label, period_label,
     file_name, file_url, mime_type, file_size]
  );

  // Notify admin
  try {
    const { rows: admins } = await pool.query(
      "SELECT id FROM users WHERE role='admin' AND deleted_at IS NULL LIMIT 1"
    );
    if (admins.length > 0) {
      await pool.query(
        `INSERT INTO activity_logs
           (user_id, user_role, user_name, action, entity_type, entity_id, details)
         SELECT $1, u.role, u.name, 'result_uploaded', 'result_upload', $2,
                jsonb_build_object('level', $3, 'year', $4, 'period', $5)
         FROM users u WHERE u.id = $1`,
        [studentId, rows[0].id, academic_level, year_label, period_label]
      );
    }
  } catch { /* never break upload */ }

  return rows[0];
}

/* ── Get uploads for a student ───────────────────────────────────────────── */
async function getStudentUploads(studentId) {
  await ensureTables();
  const { rows } = await pool.query(
    `SELECT r.*, u.name AS reviewer_name
     FROM student_result_uploads r
     LEFT JOIN users u ON u.id = r.reviewed_by
     WHERE r.student_id = $1
     ORDER BY r.uploaded_at DESC`,
    [studentId]
  );
  return rows;
}

/* ── Get approved uploads for a student (public view) ───────────────────── */
async function getApprovedUploads(studentId) {
  await ensureTables();
  const { rows } = await pool.query(
    `SELECT * FROM student_result_uploads
     WHERE student_id = $1 AND status = 'approved'
     ORDER BY uploaded_at ASC`,
    [studentId]
  );
  return rows;
}

/* ── Admin: get all uploads ──────────────────────────────────────────────── */
async function getAllUploads({ status, q, level, limit = 100, offset = 0 }) {
  await ensureTables();
  const conditions = [];
  const params = [];

  if (status && status !== 'all') {
    params.push(status);
    conditions.push(`r.status = $${params.length}`);
  }
  if (level) {
    params.push(level);
    conditions.push(`r.academic_level = $${params.length}`);
  }
  if (q && q.trim()) {
    params.push(`%${q.trim()}%`);
    conditions.push(`(u.name ILIKE $${params.length} OR u.email ILIKE $${params.length})`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  params.push(limit, offset);

  const { rows } = await pool.query(
    `SELECT r.*, u.name AS student_name, u.email AS student_email
     FROM student_result_uploads r
     JOIN users u ON u.id = r.student_id
     ${where}
     ORDER BY r.uploaded_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );
  return rows;
}

/* ── Admin: review (approve / reject) ───────────────────────────────────── */
async function reviewUpload(uploadId, adminId, { action, comment, performance_score }) {
  await ensureTables();

  if (!['approved', 'rejected'].includes(action)) {
    const e = new Error('action must be approved or rejected'); e.status = 400; throw e;
  }

  let category = null;
  let score    = null;

  if (action === 'approved' && performance_score != null) {
    score    = Number(performance_score);
    category = scoreCategory(score);
  }

  const { rows } = await pool.query(
    `UPDATE student_result_uploads
     SET status              = $1,
         admin_comment       = $2,
         rejection_reason    = CASE WHEN $1 = 'rejected' THEN $2 ELSE NULL END,
         performance_score   = $3,
         performance_category = $4,
         reviewed_by         = $5,
         reviewed_at         = NOW()
     WHERE id = $6
     RETURNING *`,
    [action, comment || null, score, category, adminId, uploadId]
  );

  if (rows.length === 0) {
    const e = new Error('Upload not found'); e.status = 404; throw e;
  }

  // Log
  await audit.log({
    userId: adminId, role: 'admin', action: `result_${action}`,
    entityType: 'result_upload', entityId: uploadId,
    details: { comment, performance_score: score },
  });

  return rows[0];
}

/* ── Delete an upload (student can delete own pending) ───────────────────── */
async function deleteUpload(uploadId, studentId) {
  await ensureTables();
  const { rows } = await pool.query(
    `DELETE FROM student_result_uploads
     WHERE id = $1 AND student_id = $2 AND status = 'pending'
     RETURNING id`,
    [uploadId, studentId]
  );
  if (rows.length === 0) {
    const e = new Error('Upload not found or cannot be deleted'); e.status = 404; throw e;
  }
  return { success: true };
}

/* ── Performance summary for a student ──────────────────────────────────── */
async function getPerformanceSummary(studentId) {
  await ensureTables();
  const { rows } = await pool.query(
    `SELECT * FROM student_result_uploads
     WHERE student_id = $1 AND status = 'approved'
     ORDER BY uploaded_at ASC`,
    [studentId]
  );

  if (rows.length === 0) return null;

  const scores = rows.filter(r => r.performance_score != null).map(r => Number(r.performance_score));
  const avg    = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null;
  const trend  = calcTrend(rows);

  const dist = { Excellent: 0, 'Very Good': 0, Good: 0, Average: 0, Poor: 0 };
  rows.forEach(r => { if (r.performance_category) dist[r.performance_category] = (dist[r.performance_category] || 0) + 1; });

  return {
    total_uploads:  rows.length,
    average_score:  avg ? Number(avg.toFixed(2)) : null,
    trend,
    distribution:   dist,
    uploads:        rows,
  };
}

/* ── Admin analytics ─────────────────────────────────────────────────────── */
async function getAdminAnalytics() {
  await ensureTables();
  const [counts, topPerformers] = await Promise.all([
    pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE status = 'pending')  AS pending,
        COUNT(*) FILTER (WHERE status = 'approved') AS approved,
        COUNT(*) FILTER (WHERE status = 'rejected') AS rejected,
        COUNT(*) AS total
      FROM student_result_uploads
    `),
    pool.query(`
      SELECT u.id, u.name, u.email,
             AVG(r.performance_score) AS avg_score,
             COUNT(*) AS result_count
      FROM student_result_uploads r
      JOIN users u ON u.id = r.student_id
      WHERE r.status = 'approved' AND r.performance_score IS NOT NULL
      GROUP BY u.id, u.name, u.email
      ORDER BY avg_score DESC
      LIMIT 10
    `),
  ]);

  return {
    counts:        counts.rows[0],
    top_performers: topPerformers.rows,
  };
}

module.exports = {
  LEVEL_STRUCTURE,
  getLevelGroup,
  uploadResult,
  getStudentUploads,
  getApprovedUploads,
  getAllUploads,
  reviewUpload,
  deleteUpload,
  getPerformanceSummary,
  getAdminAnalytics,
};
