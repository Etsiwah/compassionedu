'use strict';

const bcrypt = require('bcryptjs');
const PDFDocument = require('pdfkit');
const pool = require('../db/pool');

const BCRYPT_ROUNDS = 12;
const STUDENT_ROLE = 'student';

const profileFields = [
  'age',
  'gender',
  'date_of_birth',
  'phone',
  'address',
  'school_name',
  'level',
  'program',
  'department',
  'class_year',
  'enrollment_date',
  'student_id_number',
  'father_name',
  'mother_name',
  'parent_phone',
  'parent_email',
  'emergency_name',
  'emergency_phone',
  'emergency_relation',
  'nationality',
  'gps_location',
  'religion',
  'disability_status',
  'project_number',
  'graduation_year',
  'region',
  'district',
];

function badRequest(message, field) {
  const err = new Error(message);
  err.status = 400;
  if (field) err.field = field;
  return err;
}

function notFound() {
  const err = new Error('Beneficiary not found');
  err.status = 404;
  return err;
}

function cleanString(value) {
  if (value === undefined || value === null) return null;
  const trimmed = String(value).trim();
  return trimmed === '' ? null : trimmed;
}

function toBoolStatus(value) {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value === 'boolean') return value;
  return String(value).toLowerCase() !== 'inactive';
}

function emptyToNullPayload(data = {}) {
  return Object.fromEntries(
    Object.entries(data).map(([key, value]) => [key, typeof value === 'string' ? cleanString(value) : value])
  );
}

function selectBaseQuery() {
  return `
    SELECT
      u.id,
      u.name,
      u.email,
      u.is_active,
      u.created_at,
      u.location,
      pp.url AS photo_url,
      sp.gender,
      sp.date_of_birth,
      COALESCE(sp.age, DATE_PART('year', AGE(sp.date_of_birth))::INT) AS age,
      sp.phone,
      sp.address,
      sp.school_name,
      sp.level,
      sp.program,
      sp.department,
      sp.class_year,
      sp.student_id_number,
      sp.father_name,
      sp.mother_name,
      sp.parent_phone,
      sp.parent_email,
      sp.emergency_name,
      sp.emergency_phone,
      sp.emergency_relation,
      sp.project_number,
      sp.graduation_year,
      sp.region,
      sp.district,
      sp.nationality,
      sp.gps_location,
      sp.religion,
      sp.disability_status,
      COALESCE(latest_s.status, 'unsponsored') AS sponsorship_status,
      latest_s.sponsor_name,
      latest_s.scholarship_status,
      latest_s.start_date AS sponsorship_start_date,
      latest_s.end_date AS sponsorship_end_date
    FROM users u
    LEFT JOIN student_profiles sp ON sp.user_id = u.id
    LEFT JOIN LATERAL (
      SELECT url
      FROM profile_photos
      WHERE user_id = u.id
      ORDER BY is_default DESC, created_at DESC
      LIMIT 1
    ) pp ON TRUE
    LEFT JOIN LATERAL (
      SELECT status, sponsor_name, scholarship_status, start_date, end_date
      FROM sponsorships
      WHERE student_id = u.id
      ORDER BY created_at DESC
      LIMIT 1
    ) latest_s ON TRUE
  `;
}

function mapBase(row) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    status: row.is_active ? 'active' : 'inactive',
    is_active: row.is_active,
    created_at: row.created_at,
    photo_url: row.photo_url,
    gender: row.gender,
    date_of_birth: row.date_of_birth,
    age: row.age,
    phone: row.phone,
    address: row.address,
    location: row.location,
    school_name: row.school_name,
    institution: row.school_name,
    level: row.level,
    educational_level: row.level,
    program: row.program,
    department: row.department,
    class_year: row.class_year,
    student_id_number: row.student_id_number,
    beneficiary_id: row.student_id_number,
    project_number: row.project_number,
    graduation_year: row.graduation_year,
    region: row.region,
    district: row.district,
    nationality: row.nationality,
    gps_location: row.gps_location,
    religion: row.religion,
    disability_status: row.disability_status,
    sponsorship_status: row.sponsorship_status,
    sponsor_name: row.sponsor_name,
    scholarship_status: row.scholarship_status,
    sponsorship_start_date: row.sponsorship_start_date,
    sponsorship_end_date: row.sponsorship_end_date,
  };
}

async function ensureStudent(id, client = pool) {
  const { rows } = await client.query(
    `SELECT id, name, email, is_active, created_at
     FROM users
     WHERE id = $1 AND role = $2 AND deleted_at IS NULL`,
    [id, STUDENT_ROLE]
  );
  if (rows.length === 0) throw notFound();
  return rows[0];
}

async function listBeneficiaries(filters = {}) {
  const conditions = [`u.role = '${STUDENT_ROLE}'`, 'u.deleted_at IS NULL'];
  const params = [];

  const add = (value, clause) => {
    params.push(value);
    conditions.push(clause(params.length));
  };

  if (filters.search && filters.search.trim()) {
    add(`%${filters.search.trim()}%`, i => `(
      u.name ILIKE $${i}
      OR u.email ILIKE $${i}
      OR sp.student_id_number ILIKE $${i}
      OR sp.project_number ILIKE $${i}
      OR sp.school_name ILIKE $${i}
      OR latest_s.sponsor_name ILIKE $${i}
    )`);
  }
  if (filters.status && filters.status !== 'all') {
    add(filters.status === 'active', i => `u.is_active = $${i}`);
  }
  if (filters.sponsorshipStatus && filters.sponsorshipStatus !== 'all') {
    if (filters.sponsorshipStatus === 'unsponsored') {
      conditions.push(`COALESCE(latest_s.status, 'unsponsored') = 'unsponsored'`);
    } else {
      add(filters.sponsorshipStatus, i => `latest_s.status = $${i}`);
    }
  }
  if (filters.institution) add(`%${filters.institution}%`, i => `sp.school_name ILIKE $${i}`);
  if (filters.level) add(`%${filters.level}%`, i => `sp.level ILIKE $${i}`);
  if (filters.gender && filters.gender !== 'all') add(filters.gender, i => `LOWER(sp.gender) = LOWER($${i})`);
  if (filters.region) add(`%${filters.region}%`, i => `sp.region ILIKE $${i}`);
  if (filters.district) add(`%${filters.district}%`, i => `sp.district ILIKE $${i}`);
  if (filters.sponsor) add(`%${filters.sponsor}%`, i => `latest_s.sponsor_name ILIKE $${i}`);

  const { rows } = await pool.query(
    `${selectBaseQuery()}
     WHERE ${conditions.join(' AND ')}
     ORDER BY u.created_at DESC`,
    params
  );

  return rows.map(mapBase);
}

async function getBeneficiaryOverview() {
  const [
    counts,
    byLevel,
    byInstitution,
    recentRows,
  ] = await Promise.all([
    pool.query(`
      SELECT
        COUNT(*)::INT AS total,
        COUNT(*) FILTER (WHERE u.is_active)::INT AS active,
        COUNT(*) FILTER (WHERE NOT u.is_active)::INT AS inactive,
        COUNT(*) FILTER (WHERE COALESCE(s.status, 'unsponsored') IN ('sponsored','scholarship'))::INT AS sponsored,
        COUNT(*) FILTER (WHERE COALESCE(s.status, 'unsponsored') = 'unsponsored')::INT AS unsponsored
      FROM users u
      LEFT JOIN LATERAL (
        SELECT status FROM sponsorships WHERE student_id = u.id ORDER BY created_at DESC LIMIT 1
      ) s ON TRUE
      WHERE u.role = 'student' AND u.deleted_at IS NULL
    `),
    pool.query(`
      SELECT COALESCE(NULLIF(sp.level, ''), 'Unassigned') AS label, COUNT(*)::INT AS count
      FROM users u
      LEFT JOIN student_profiles sp ON sp.user_id = u.id
      WHERE u.role = 'student' AND u.deleted_at IS NULL
      GROUP BY label
      ORDER BY count DESC, label ASC
    `),
    pool.query(`
      SELECT COALESCE(NULLIF(sp.school_name, ''), 'Unassigned') AS label, COUNT(*)::INT AS count
      FROM users u
      LEFT JOIN student_profiles sp ON sp.user_id = u.id
      WHERE u.role = 'student' AND u.deleted_at IS NULL
      GROUP BY label
      ORDER BY count DESC, label ASC
      LIMIT 8
    `),
    pool.query(`
      ${selectBaseQuery()}
      WHERE u.role = 'student' AND u.deleted_at IS NULL
      ORDER BY u.created_at DESC
      LIMIT 6
    `),
  ]);

  return {
    counts: counts.rows[0] || { total: 0, active: 0, inactive: 0, sponsored: 0, unsponsored: 0 },
    groupedByLevel: byLevel.rows,
    groupedByInstitution: byInstitution.rows,
    recentlyAdded: recentRows.rows.map(mapBase),
  };
}

async function getBeneficiaryById(id) {
  await ensureStudent(id);

  const [
    base,
    parents,
    academicRecords,
    sponsorships,
    health,
    documents,
    activities,
    results,
    attendance,
    fees,
  ] = await Promise.all([
    pool.query(`${selectBaseQuery()} WHERE u.id = $1 AND u.role = 'student' AND u.deleted_at IS NULL`, [id]),
    pool.query(`SELECT * FROM parents_guardians WHERE student_id = $1`, [id]),
    pool.query(`SELECT * FROM academic_records WHERE student_id = $1 ORDER BY created_at DESC`, [id]),
    pool.query(`SELECT * FROM sponsorships WHERE student_id = $1 ORDER BY created_at DESC`, [id]),
    pool.query(`SELECT * FROM beneficiary_health WHERE student_id = $1`, [id]),
    pool.query(`SELECT * FROM beneficiary_documents WHERE student_id = $1 ORDER BY created_at DESC`, [id]),
    pool.query(`
      SELECT bal.*, u.name AS actor_name
      FROM beneficiary_activity_logs bal
      LEFT JOIN users u ON u.id = bal.actor_id
      WHERE bal.student_id = $1
      ORDER BY bal.created_at DESC
      LIMIT 100
    `, [id]),
    pool.query(`SELECT id, subject, marks, grade, term, created_at FROM results WHERE student_id = $1 ORDER BY created_at DESC`, [id]),
    pool.query(`
      SELECT
        COUNT(*)::INT AS total,
        COUNT(*) FILTER (WHERE status = 'present')::INT AS present,
        COUNT(*) FILTER (WHERE status = 'absent')::INT AS absent,
        COUNT(*) FILTER (WHERE status = 'late')::INT AS late,
        ROUND(
          CASE WHEN COUNT(*) = 0 THEN 0
          ELSE (COUNT(*) FILTER (WHERE status = 'present')::NUMERIC / COUNT(*)::NUMERIC) * 100 END,
          1
        ) AS attendance_rate
      FROM attendance
      WHERE student_id = $1
    `, [id]),
    pool.query(`
      SELECT
        COALESCE(SUM(amount), 0)::NUMERIC AS total_support_recorded,
        COUNT(*)::INT AS fee_records,
        COUNT(*) FILTER (WHERE status = 'paid')::INT AS paid_records,
        COUNT(*) FILTER (WHERE status IN ('pending','overdue'))::INT AS open_records
      FROM fees
      WHERE student_id = $1
    `, [id]),
  ]);

  if (base.rows.length === 0) throw notFound();
  const summary = mapBase(base.rows[0]);
  const parentRow = parents.rows[0] || {};
  const latestAcademic = academicRecords.rows[0] || {};
  const latestSponsorship = sponsorships.rows[0] || {};

  return {
    id,
    summary,
    personal: {
      full_name: summary.name,
      email: summary.email,
      profile_photo: summary.photo_url,
      gender: summary.gender,
      date_of_birth: summary.date_of_birth,
      age: summary.age,
      nationality: summary.nationality,
      address: summary.address,
      gps_location: summary.gps_location,
      religion: summary.religion,
      disability_status: summary.disability_status,
      beneficiary_id: summary.student_id_number,
      student_id_number: summary.student_id_number,
      project_number: summary.project_number,
      phone: summary.phone,
      region: summary.region,
      district: summary.district,
      status: summary.status,
    },
    academic: {
      current_institution: latestAcademic.institution || summary.school_name,
      educational_level: latestAcademic.educational_level || summary.level,
      class_form_year: latestAcademic.class_year || summary.class_year,
      program_course: latestAcademic.program_course || summary.program,
      student_index_number: latestAcademic.student_index_number || summary.student_id_number,
      graduation_year: latestAcademic.graduation_year || summary.graduation_year,
      records: academicRecords.rows,
      results: results.rows,
      attendance: attendance.rows[0],
    },
    parents_guardian: {
      father_full_name: parentRow.father_full_name || base.rows[0].father_name,
      father_phone: parentRow.father_phone,
      father_occupation: parentRow.father_occupation,
      mother_full_name: parentRow.mother_full_name || base.rows[0].mother_name,
      mother_phone: parentRow.mother_phone,
      mother_occupation: parentRow.mother_occupation,
      guardian_full_name: parentRow.guardian_full_name,
      guardian_phone: parentRow.guardian_phone,
      guardian_relationship: parentRow.guardian_relationship,
      guardian_occupation: parentRow.guardian_occupation,
      emergency_contact: parentRow.emergency_contact || base.rows[0].emergency_name,
      emergency_phone: parentRow.emergency_phone || base.rows[0].emergency_phone,
      emergency_relation: base.rows[0].emergency_relation,
      parent_phone: base.rows[0].parent_phone,
      parent_email: base.rows[0].parent_email,
    },
    sponsorship: {
      status: latestSponsorship.status || summary.sponsorship_status,
      sponsor_name: latestSponsorship.sponsor_name || summary.sponsor_name,
      sponsor_email: latestSponsorship.sponsor_email,
      sponsor_phone: latestSponsorship.sponsor_phone,
      scholarship_status: latestSponsorship.scholarship_status || summary.scholarship_status,
      date_joined: latestSponsorship.date_joined,
      start_date: latestSponsorship.start_date,
      end_date: latestSponsorship.end_date,
      financial_support: latestSponsorship.financial_support,
      items_received: latestSponsorship.items_received,
      history: sponsorships.rows,
      financial_summary: fees.rows[0],
    },
    health: health.rows[0] || {},
    documents: documents.rows,
    activity_logs: activities.rows,
  };
}

async function upsertProfile(client, id, data) {
  const values = profileFields
    .filter(field => data[field] !== undefined)
    .map(field => [field, data[field]]);

  if (values.length === 0) {
    await client.query(
      `INSERT INTO student_profiles (user_id) VALUES ($1)
       ON CONFLICT (user_id) DO NOTHING`,
      [id]
    );
    return;
  }

  const columns = values.map(([field]) => field);
  const params = [id, ...values.map(([, value]) => value)];
  const insertCols = ['user_id', ...columns].join(', ');
  const placeholders = params.map((_, index) => `$${index + 1}`).join(', ');
  const updates = columns.map((field, index) => `${field} = $${index + 2}`).join(', ');

  await client.query(
    `INSERT INTO student_profiles (${insertCols})
     VALUES (${placeholders})
     ON CONFLICT (user_id) DO UPDATE
       SET ${updates}, updated_at = NOW()`,
    params
  );
}

async function upsertParents(client, id, data) {
  if (!data || Object.keys(data).length === 0) return;
  const payload = emptyToNullPayload(data);
  await client.query(
    `INSERT INTO parents_guardians (
       student_id, father_full_name, father_phone, father_occupation,
       mother_full_name, mother_phone, mother_occupation,
       guardian_full_name, guardian_phone, guardian_relationship, guardian_occupation,
       emergency_contact, emergency_phone
     )
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
     ON CONFLICT (student_id) DO UPDATE SET
       father_full_name = EXCLUDED.father_full_name,
       father_phone = EXCLUDED.father_phone,
       father_occupation = EXCLUDED.father_occupation,
       mother_full_name = EXCLUDED.mother_full_name,
       mother_phone = EXCLUDED.mother_phone,
       mother_occupation = EXCLUDED.mother_occupation,
       guardian_full_name = EXCLUDED.guardian_full_name,
       guardian_phone = EXCLUDED.guardian_phone,
       guardian_relationship = EXCLUDED.guardian_relationship,
       guardian_occupation = EXCLUDED.guardian_occupation,
       emergency_contact = EXCLUDED.emergency_contact,
       emergency_phone = EXCLUDED.emergency_phone,
       updated_at = NOW()`,
    [
      id,
      payload.father_full_name,
      payload.father_phone,
      payload.father_occupation,
      payload.mother_full_name,
      payload.mother_phone,
      payload.mother_occupation,
      payload.guardian_full_name,
      payload.guardian_phone,
      payload.guardian_relationship,
      payload.guardian_occupation,
      payload.emergency_contact,
      payload.emergency_phone,
    ]
  );
}

async function upsertHealth(client, id, data) {
  if (!data || Object.keys(data).length === 0) return;
  const payload = emptyToNullPayload(data);
  await client.query(
    `INSERT INTO beneficiary_health (
       student_id, medical_conditions, allergies, health_insurance_details,
       special_needs, counseling_notes, welfare_notes
     )
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     ON CONFLICT (student_id) DO UPDATE SET
       medical_conditions = EXCLUDED.medical_conditions,
       allergies = EXCLUDED.allergies,
       health_insurance_details = EXCLUDED.health_insurance_details,
       special_needs = EXCLUDED.special_needs,
       counseling_notes = EXCLUDED.counseling_notes,
       welfare_notes = EXCLUDED.welfare_notes,
       updated_at = NOW()`,
    [
      id,
      payload.medical_conditions,
      payload.allergies,
      payload.health_insurance_details,
      payload.special_needs,
      payload.counseling_notes,
      payload.welfare_notes,
    ]
  );
}

async function addSponsorship(client, id, data) {
  if (!data || Object.keys(data).length === 0) return;
  const payload = emptyToNullPayload(data);
  const status = payload.status || 'unsponsored';
  if (!['sponsored', 'unsponsored', 'scholarship', 'ended'].includes(status)) {
    throw badRequest('Invalid sponsorship status', 'sponsorship.status');
  }

  await client.query(
    `INSERT INTO sponsorships (
       student_id, status, sponsor_name, sponsor_email, sponsor_phone,
       scholarship_status, date_joined, start_date, end_date,
       financial_support, items_received, notes
     )
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
    [
      id,
      status,
      payload.sponsor_name,
      payload.sponsor_email,
      payload.sponsor_phone,
      payload.scholarship_status,
      payload.date_joined,
      payload.start_date,
      payload.end_date,
      payload.financial_support || 0,
      payload.items_received,
      payload.notes,
    ]
  );
}

async function createBeneficiary(data = {}, actorId = null) {
  const payload = emptyToNullPayload({ ...data, ...(data.personal || {}) });
  const name = payload.name || payload.full_name;
  const email = payload.email;
  const password = payload.password || 'Student@123';

  if (!name) throw badRequest('Full name is required', 'name');
  if (!email) throw badRequest('Email is required', 'email');

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const existing = await client.query('SELECT id FROM users WHERE LOWER(email) = LOWER($1)', [email]);
    if (existing.rows.length) {
      throw Object.assign(new Error('Email already in use'), { status: 409, field: 'email' });
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const active = toBoolStatus(payload.status);
    const { rows } = await client.query(
      `INSERT INTO users (role, name, email, password_hash, is_active, location, account_source)
       VALUES ($1, $2, $3, $4, $5, $6, 'admin_added')
       RETURNING id`,
      [STUDENT_ROLE, name, email, passwordHash, active === undefined ? true : active, payload.location || payload.address,]
    );

    const id = rows[0].id;
    const profile = { ...payload, ...(data.academic || {}) };
    profile.school_name = profile.school_name || profile.current_institution || profile.institution;
    profile.level = profile.level || profile.educational_level;
    profile.class_year = profile.class_year || profile.class_form_year;
    profile.program = profile.program || profile.program_course;
    await upsertProfile(client, id, profile);
    await upsertParents(client, id, data.parents_guardian || data.parents || {});
    await upsertHealth(client, id, data.health || {});
    await addSponsorship(client, id, data.sponsorship || {});
    await addActivityLog(id, actorId, {
      activity_type: 'profile',
      title: 'Beneficiary profile created',
      description: 'Student/beneficiary record was created by an administrator.',
    }, client);

    await client.query('COMMIT');
    return getBeneficiaryById(id);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function updateBeneficiary(id, data = {}, actorId = null) {
  const payload = emptyToNullPayload({ ...data, ...(data.personal || {}) });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await ensureStudent(id, client);

    const userSets = [];
    const userParams = [];
    const addUserSet = (field, value) => {
      userParams.push(value);
      userSets.push(`${field} = $${userParams.length}`);
    };

    if (payload.name || payload.full_name) addUserSet('name', payload.name || payload.full_name);
    if (payload.email) {
      const existing = await client.query(
        `SELECT id FROM users WHERE LOWER(email) = LOWER($1) AND id <> $2`,
        [payload.email, id]
      );
      if (existing.rows.length) {
        throw Object.assign(new Error('Email already in use'), { status: 409, field: 'email' });
      }
      addUserSet('email', payload.email);
    }
    const active = toBoolStatus(payload.status);
    if (active !== undefined) addUserSet('is_active', active);
    if (payload.location || payload.address) addUserSet('location', payload.location || payload.address);

    if (userSets.length) {
      userParams.push(id);
      await client.query(`UPDATE users SET ${userSets.join(', ')} WHERE id = $${userParams.length}`, userParams);
    }

    const profile = { ...payload, ...(data.academic || {}) };
    profile.school_name = profile.school_name || profile.current_institution || profile.institution;
    profile.level = profile.level || profile.educational_level;
    profile.class_year = profile.class_year || profile.class_form_year;
    profile.program = profile.program || profile.program_course;
    await upsertProfile(client, id, profile);
    await upsertParents(client, id, data.parents_guardian || data.parents || {});
    await upsertHealth(client, id, data.health || {});
    if (data.sponsorship && Object.keys(data.sponsorship).length > 0) {
      await addSponsorship(client, id, data.sponsorship);
    }
    await addActivityLog(id, actorId, {
      activity_type: 'profile',
      title: 'Beneficiary profile updated',
      description: 'Student/beneficiary profile details were updated.',
    }, client);

    await client.query('COMMIT');
    return getBeneficiaryById(id);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function deleteBeneficiary(id, actorId = null) {
  await ensureStudent(id);
  await pool.query(
    `UPDATE users SET is_active = FALSE, deleted_at = NOW() WHERE id = $1 AND role = $2`,
    [id, STUDENT_ROLE]
  );
  await addActivityLog(id, actorId, {
    activity_type: 'status',
    title: 'Beneficiary deactivated',
    description: 'Student/beneficiary account was deactivated.',
  });
  return { success: true };
}

async function promoteBeneficiary(id, actorId, { nextLevel, nextClassYear, note } = {}) {
  await ensureStudent(id);
  const updates = {};
  if (nextLevel) updates.level = cleanString(nextLevel);
  if (nextClassYear) updates.class_year = cleanString(nextClassYear);
  if (Object.keys(updates).length) {
    await upsertProfile(pool, id, updates);
  }
  await addActivityLog(id, actorId, {
    activity_type: 'promotion',
    title: 'Beneficiary promoted',
    description: note || `Promoted${nextLevel ? ` to ${nextLevel}` : ''}${nextClassYear ? ` (${nextClassYear})` : ''}.`,
    metadata: updates,
  });
  return getBeneficiaryById(id);
}

async function addActivityLog(studentId, actorId, data = {}, client = pool) {
  await ensureStudent(studentId, client);
  const payload = emptyToNullPayload(data);
  if (!payload.title) throw badRequest('Activity title is required', 'title');
  await client.query(
    `INSERT INTO beneficiary_activity_logs
       (student_id, actor_id, activity_type, title, description, metadata)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      studentId,
      actorId || null,
      payload.activity_type || 'note',
      payload.title,
      payload.description,
      payload.metadata ? JSON.stringify(payload.metadata) : '{}',
    ]
  );
  return { success: true };
}

async function addDocument(studentId, actorId, file, data = {}) {
  await ensureStudent(studentId);
  if (!file) throw badRequest('No file uploaded', 'file');
  const title = cleanString(data.title) || file.originalname;
  const documentType = cleanString(data.document_type) || cleanString(data.type) || 'other';
  const { rows } = await pool.query(
    `INSERT INTO beneficiary_documents
       (student_id, document_type, title, file_url, mime_type, file_size, uploaded_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     RETURNING *`,
    [
      studentId,
      documentType,
      title,
      file.file_url,
      file.mimetype,
      file.size,
      actorId || null,
    ]
  );
  await addActivityLog(studentId, actorId, {
    activity_type: 'document',
    title: 'Document uploaded',
    description: `${title} was uploaded.`,
  });
  return rows[0];
}

async function generateBeneficiaryPdf(id) {
  const profile = await getBeneficiaryById(id);
  const doc = new PDFDocument({ margin: 48, size: 'A4' });
  const chunks = [];

  return new Promise((resolve, reject) => {
    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.fontSize(20).text('Beneficiary Profile', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(14).text(profile.personal.full_name || 'Unnamed beneficiary', { align: 'center' });
    doc.moveDown();

    const section = title => {
      doc.moveDown();
      doc.fontSize(13).fillColor('#f97316').text(title);
      doc.fillColor('#111111').moveDown(0.25);
    };
    const line = (label, value) => {
      doc.fontSize(10).text(`${label}: ${value || 'Not recorded'}`);
    };

    section('Personal Information');
    line('Email', profile.summary.email);
    line('Gender', profile.personal.gender);
    line('Date of birth', profile.personal.date_of_birth);
    line('Age', profile.personal.age);
    line('Nationality', profile.personal.nationality);
    line('Beneficiary ID', profile.personal.beneficiary_id);
    line('Project number', profile.personal.project_number);
    line('Address', profile.personal.address);

    section('Academic Information');
    line('Institution', profile.academic.current_institution);
    line('Level', profile.academic.educational_level);
    line('Class/Form/Year', profile.academic.class_form_year);
    line('Program/Course', profile.academic.program_course);
    line('Graduation year', profile.academic.graduation_year);

    section('Parent/Guardian Information');
    line('Father', profile.parents_guardian.father_full_name);
    line('Mother', profile.parents_guardian.mother_full_name);
    line('Guardian', profile.parents_guardian.guardian_full_name);
    line('Emergency contact', profile.parents_guardian.emergency_contact);

    section('Sponsorship');
    line('Status', profile.sponsorship.status);
    line('Sponsor', profile.sponsorship.sponsor_name);
    line('Scholarship status', profile.sponsorship.scholarship_status);
    line('Financial support', profile.sponsorship.financial_support);
    line('Items received', profile.sponsorship.items_received);

    section('Health & Welfare');
    line('Medical conditions', profile.health.medical_conditions);
    line('Allergies', profile.health.allergies);
    line('Special needs', profile.health.special_needs);
    line('Welfare notes', profile.health.welfare_notes);

    section('Activity Summary');
    line('Activity entries', profile.activity_logs.length);
    line('Documents', profile.documents.length);

    doc.end();
  });
}

module.exports = {
  listBeneficiaries,
  getBeneficiaryOverview,
  getBeneficiaryById,
  createBeneficiary,
  updateBeneficiary,
  deleteBeneficiary,
  promoteBeneficiary,
  addActivityLog,
  addDocument,
  generateBeneficiaryPdf,
};
