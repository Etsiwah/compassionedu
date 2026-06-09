'use strict';

const pool  = require('../db/pool');
const audit = require('./auditService');
const notifications = require('./notificationService');

/* ── Tertiary level structure ─────────────────────────────────────────────── */
const FEE_LEVEL_STRUCTURE = {
  Diploma: {
    years:   ['Diploma Year 1', 'Diploma Year 2'],
    periods: ['Semester 1', 'Semester 2'],
  },
  'Top Up': {
    years:   ['Top Up Year 1', 'Top Up Year 2'],
    periods: ['Semester 1', 'Semester 2'],
  },
  Degree: {
    years:   ['Degree Year 1', 'Degree Year 2', 'Degree Year 3', 'Degree Year 4'],
    periods: ['Semester 1', 'Semester 2'],
  },
};

function getLevelGroup(level) {
  if (!level) return null;
  const l = level.toUpperCase();
  if (l.startsWith('DIPLOMA')) return 'Diploma';
  if (l.startsWith('TOP UP') || l.startsWith('TOPUP')) return 'Top Up';
  if (l.startsWith('DEGREE'))  return 'Degree';
  return null;
}

const PAYMENT_METHODS = ['Mobile Money', 'Bank Transfer', 'Card', 'Cash'];

/* ── Progress label ── */
function progressLabel(pct) {
  if (pct >= 100) return 'Fully Paid';
  if (pct >= 75)  return 'Almost Cleared';
  if (pct >= 50)  return 'Nearly Completed';
  if (pct >= 25)  return 'In Progress';
  return 'Not Started';
}

/* ── Ensure tables ── */
async function ensureTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS student_fee_records (
      id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      student_id        UUID REFERENCES users(id) ON DELETE CASCADE,
      academic_level    VARCHAR(50)    NOT NULL,
      year_label        VARCHAR(50)    NOT NULL,
      period_label      VARCHAR(50)    NOT NULL,
      tuition_fee       NUMERIC(10,2)  NOT NULL DEFAULT 0,
      registration_fee  NUMERIC(10,2)  NOT NULL DEFAULT 0,
      hostel_fee        NUMERIC(10,2)  NOT NULL DEFAULT 0,
      examination_fee   NUMERIC(10,2)  NOT NULL DEFAULT 0,
      other_charges     NUMERIC(10,2)  NOT NULL DEFAULT 0,
      total_amount      NUMERIC(10,2)  GENERATED ALWAYS AS
                          (tuition_fee + registration_fee + hostel_fee + examination_fee + other_charges)
                          STORED,
      amount_paid       NUMERIC(10,2)  NOT NULL DEFAULT 0,
      status            VARCHAR(20)    NOT NULL DEFAULT 'pending'
                          CHECK (status IN ('paid','partially_paid','pending','overdue')),
      due_date          DATE,
      created_by        UUID REFERENCES users(id) ON DELETE SET NULL,
      created_at        TIMESTAMPTZ    DEFAULT NOW(),
      updated_at        TIMESTAMPTZ    DEFAULT NOW(),
      UNIQUE (student_id, academic_level, year_label, period_label)
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS fee_payment_uploads (
      id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      student_id       UUID REFERENCES users(id) ON DELETE CASCADE,
      fee_record_id    UUID REFERENCES student_fee_records(id) ON DELETE CASCADE,
      academic_level   VARCHAR(50)    NOT NULL,
      year_label       VARCHAR(50)    NOT NULL,
      period_label     VARCHAR(50)    NOT NULL,
      amount_paid      NUMERIC(10,2)  NOT NULL,
      payment_method   VARCHAR(50)    NOT NULL,
      transaction_id   VARCHAR(255),
      payment_date     DATE           NOT NULL,
      file_name        VARCHAR(255)   NOT NULL,
      file_url         TEXT           NOT NULL,
      mime_type        VARCHAR(100)   NOT NULL,
      file_size        BIGINT         NOT NULL,
      status           VARCHAR(20)    NOT NULL DEFAULT 'pending'
                         CHECK (status IN ('pending','approved','rejected')),
      admin_comment    TEXT,
      rejection_reason TEXT,
      reviewed_by      UUID REFERENCES users(id) ON DELETE SET NULL,
      reviewed_at      TIMESTAMPTZ,
      uploaded_at      TIMESTAMPTZ    DEFAULT NOW()
    )
  `);

  await pool.query(`CREATE INDEX IF NOT EXISTS idx_fee_records_student ON student_fee_records(student_id)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_fee_uploads_student ON fee_payment_uploads(student_id)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_fee_uploads_status  ON fee_payment_uploads(status)`);
}

/* ── Admin: create/update a fee record for a student ── */
async function upsertFeeRecord(adminId, {
  student_id, academic_level, year_label, period_label,
  tuition_fee = 0, registration_fee = 0, hostel_fee = 0,
  examination_fee = 0, other_charges = 0, due_date,
}) {
  await ensureTables();

  const group = getLevelGroup(academic_level);
  if (!group) {
    const e = new Error(`Invalid academic level: ${academic_level}`); e.status = 400; throw e;
  }

  const { rows } = await pool.query(
    `INSERT INTO student_fee_records
       (student_id, academic_level, year_label, period_label,
        tuition_fee, registration_fee, hostel_fee, examination_fee,
        other_charges, due_date, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
     ON CONFLICT (student_id, academic_level, year_label, period_label)
     DO UPDATE SET
       tuition_fee      = EXCLUDED.tuition_fee,
       registration_fee = EXCLUDED.registration_fee,
       hostel_fee       = EXCLUDED.hostel_fee,
       examination_fee  = EXCLUDED.examination_fee,
       other_charges    = EXCLUDED.other_charges,
       due_date         = EXCLUDED.due_date,
       updated_at       = NOW()
     RETURNING *`,
    [student_id, academic_level, year_label, period_label,
     tuition_fee, registration_fee, hostel_fee, examination_fee,
     other_charges, due_date || null, adminId]
  );

  return rows[0];
}

/* ── Student: get own fee records ── */
async function getStudentFeeRecords(studentId) {
  await ensureTables();
  const { rows } = await pool.query(
    `SELECT f.*,
            COALESCE(
              (SELECT SUM(p.amount_paid) FROM fee_payment_uploads p
               WHERE p.fee_record_id = f.id AND p.status = 'approved'), 0
            ) AS confirmed_paid
     FROM student_fee_records f
     WHERE f.student_id = $1
     ORDER BY f.created_at DESC`,
    [studentId]
  );
  return rows.map(r => ({
    ...r,
    amount_paid:        Number(r.confirmed_paid),
    outstanding:        Math.max(0, Number(r.total_amount) - Number(r.confirmed_paid)),
    progress_pct:       r.total_amount > 0
                          ? Math.min(100, Math.round((Number(r.confirmed_paid) / Number(r.total_amount)) * 100))
                          : 0,
    progress_label:     progressLabel(
                          r.total_amount > 0
                            ? Math.min(100, Math.round((Number(r.confirmed_paid) / Number(r.total_amount)) * 100))
                            : 0
                        ),
  }));
}

/* ── Student: upload payment proof ── */
async function uploadPayment(studentId, {
  fee_record_id, academic_level, year_label, period_label,
  amount_paid, payment_method, transaction_id, payment_date,
  file_name, file_url, mime_type, file_size,
}) {
  await ensureTables();

  if (!PAYMENT_METHODS.includes(payment_method)) {
    const e = new Error(`Invalid payment method: ${payment_method}`); e.status = 400; throw e;
  }
  if (!amount_paid || Number(amount_paid) <= 0) {
    const e = new Error('Amount paid must be greater than 0'); e.status = 400; throw e;
  }

  // Validate level
  const group = getLevelGroup(academic_level);
  if (!group) {
    const e = new Error(`Invalid academic level: ${academic_level}`); e.status = 400; throw e;
  }

  const { rows } = await pool.query(
    `INSERT INTO fee_payment_uploads
       (student_id, fee_record_id, academic_level, year_label, period_label,
        amount_paid, payment_method, transaction_id, payment_date,
        file_name, file_url, mime_type, file_size)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
     RETURNING *`,
    [studentId, fee_record_id || null, academic_level, year_label, period_label,
     amount_paid, payment_method, transaction_id || null, payment_date,
     file_name, file_url, mime_type, file_size]
  );

  // Audit log
  try {
    await audit.log({
      userId: studentId, role: 'student', action: 'fee_payment_uploaded',
      entityType: 'fee_payment', entityId: rows[0].id,
      details: { academic_level, year_label, period_label, amount_paid },
    });
  } catch {}

  try {
    await notifications.createForRole('admin', {
      type: 'fee_receipt_pending',
      title: 'New fee receipt pending approval',
      message: `${academic_level} ${year_label} ${period_label} receipt was uploaded and needs review.`,
      link: '/admin/fees',
    });
  } catch {}

  return rows[0];
}

/* ── Student: get own payment uploads ── */
async function getStudentPayments(studentId) {
  await ensureTables();
  const { rows } = await pool.query(
    `SELECT p.*, u.name AS reviewer_name
     FROM fee_payment_uploads p
     LEFT JOIN users u ON u.id = p.reviewed_by
     WHERE p.student_id = $1
     ORDER BY p.uploaded_at DESC`,
    [studentId]
  );
  return rows;
}

/* ── Student: fee summary ── */
async function getFeeSummary(studentId) {
  await ensureTables();
  const records = await getStudentFeeRecords(studentId);
  const total   = records.reduce((s, r) => s + Number(r.total_amount), 0);
  const paid    = records.reduce((s, r) => s + Number(r.amount_paid), 0);
  const balance = Math.max(0, total - paid);
  const pct     = total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 0;

  return {
    total_fees:    total,
    amount_paid:   paid,
    balance,
    progress_pct:  pct,
    progress_label: progressLabel(pct),
    records,
  };
}

/* ── Admin: get all payment uploads ── */
async function getAllPayments({ status, q, level, limit = 100, offset = 0 }) {
  await ensureTables();
  const conditions = [];
  const params = [];

  if (status && status !== 'all') {
    params.push(status);
    conditions.push(`p.status = $${params.length}`);
  }
  if (level) {
    params.push(level);
    conditions.push(`p.academic_level = $${params.length}`);
  }
  if (q && q.trim()) {
    params.push(`%${q.trim()}%`);
    conditions.push(`(u.name ILIKE $${params.length} OR u.email ILIKE $${params.length})`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  params.push(limit, offset);

  const { rows } = await pool.query(
    `SELECT p.*, u.name AS student_name, u.email AS student_email
     FROM fee_payment_uploads p
     JOIN users u ON u.id = p.student_id
     ${where}
     ORDER BY p.uploaded_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );
  return rows;
}

/* ── Admin: review payment ── */
async function reviewPayment(paymentId, adminId, { action, comment }) {
  await ensureTables();

  if (!['approved', 'rejected'].includes(action)) {
    const e = new Error('action must be approved or rejected'); e.status = 400; throw e;
  }

  const { rows } = await pool.query(
    `UPDATE fee_payment_uploads
     SET status           = $1::VARCHAR,
         admin_comment    = $2,
         rejection_reason = CASE WHEN $1::TEXT = 'rejected' THEN $2 ELSE NULL END,
         reviewed_by      = $3,
         reviewed_at      = NOW()
     WHERE id = $4
     RETURNING *`,
    [action, comment || null, adminId, paymentId]
  );

  if (rows.length === 0) {
    const e = new Error('Payment not found'); e.status = 404; throw e;
  }

  // If approved, update the fee record's amount_paid and status
  if (action === 'approved' && rows[0].fee_record_id) {
    await pool.query(
      `UPDATE student_fee_records
       SET amount_paid = (
         SELECT COALESCE(SUM(p.amount_paid), 0)
         FROM fee_payment_uploads p
         WHERE p.fee_record_id = $1 AND p.status = 'approved'
       ),
       status = CASE
         WHEN (
           SELECT COALESCE(SUM(p.amount_paid), 0)
           FROM fee_payment_uploads p
           WHERE p.fee_record_id = $1 AND p.status = 'approved'
         ) >= total_amount THEN 'paid'
         WHEN (
           SELECT COALESCE(SUM(p.amount_paid), 0)
           FROM fee_payment_uploads p
           WHERE p.fee_record_id = $1 AND p.status = 'approved'
         ) > 0 THEN 'partially_paid'
         ELSE 'pending'
       END,
       updated_at = NOW()
       WHERE id = $1`,
      [rows[0].fee_record_id]
    );
  }

  await audit.log({
    userId: adminId, role: 'admin', action: `fee_payment_${action}`,
    entityType: 'fee_payment', entityId: paymentId,
    details: { comment },
  });

  try {
    const payment = rows[0];
    const approved = action === 'approved';
    await notifications.createNotification({
      userId: payment.student_id,
      type: approved ? 'fee_receipt_approved' : 'fee_receipt_rejected',
      title: approved ? 'Fee receipt approved' : 'Fee receipt rejected',
      message: approved
        ? `${payment.year_label} ${payment.period_label} receipt has been approved.`
        : `${payment.year_label} ${payment.period_label} receipt was rejected. Please upload again.${comment ? ` Reason: ${comment}` : ''}`,
      link: '/student/fees',
    });
  } catch {}

  return rows[0];
}

/* ── Admin: analytics ── */
async function getAdminFeeAnalytics() {
  await ensureTables();
  const [counts, collected, outstanding] = await Promise.all([
    pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE status = 'pending')  AS pending,
        COUNT(*) FILTER (WHERE status = 'approved') AS approved,
        COUNT(*) FILTER (WHERE status = 'rejected') AS rejected,
        COUNT(*) AS total
      FROM fee_payment_uploads
    `),
    pool.query(`
      SELECT COALESCE(SUM(amount_paid), 0) AS total
      FROM fee_payment_uploads WHERE status = 'approved'
    `),
    pool.query(`
      SELECT COALESCE(SUM(total_amount - amount_paid), 0) AS total
      FROM student_fee_records WHERE amount_paid < total_amount
    `),
  ]);

  return {
    payment_counts:    counts.rows[0],
    total_collected:   Number(collected.rows[0].total),
    total_outstanding: Number(outstanding.rows[0].total),
  };
}

/* ── Admin: get all fee records ── */
async function getAllFeeRecords({ q, level, status, limit = 100, offset = 0 }) {
  await ensureTables();
  const conditions = [];
  const params = [];

  if (q && q.trim()) {
    params.push(`%${q.trim()}%`);
    conditions.push(`(u.name ILIKE $${params.length} OR u.email ILIKE $${params.length})`);
  }
  if (level) { params.push(level); conditions.push(`f.academic_level = $${params.length}`); }
  if (status && status !== 'all') { params.push(status); conditions.push(`f.status = $${params.length}`); }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  params.push(limit, offset);

  const { rows } = await pool.query(
    `SELECT f.*, u.name AS student_name, u.email AS student_email
     FROM student_fee_records f
     JOIN users u ON u.id = f.student_id
     ${where}
     ORDER BY f.created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );
  return rows;
}

module.exports = {
  FEE_LEVEL_STRUCTURE,
  getLevelGroup,
  PAYMENT_METHODS,
  upsertFeeRecord,
  getStudentFeeRecords,
  uploadPayment,
  getStudentPayments,
  getFeeSummary,
  getAllPayments,
  reviewPayment,
  getAdminFeeAnalytics,
  getAllFeeRecords,
};
