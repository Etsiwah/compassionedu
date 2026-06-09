'use strict';

const pool = require('../db/pool');

/**
 * Fetch a combined profile for the given user.
 * Joins users + student_profiles + profile_photos.
 */
async function getProfile(userId) {
  const { rows: userRows } = await pool.query(
    `SELECT
       u.id,
       u.name,
       u.email,
       u.role,
       u.school_level,
       u.location,
       u.phone        AS user_phone,
       u.is_active,
       u.created_at,
       sp.cv_url,
       sp.project_numbers,
       sp.skills,
       sp.age,
       sp.gender,
       sp.date_of_birth,
       sp.phone             AS sp_phone,
       sp.address,
       sp.school_name,
       sp.level,
       sp.program,
       sp.department,
       sp.class_year,
       sp.enrollment_date,
       sp.student_id_number,
       sp.father_name,
       sp.mother_name,
       sp.parent_phone,
       sp.parent_email,
       sp.emergency_name,
       sp.emergency_phone,
       sp.emergency_relation,
       sp.nationality,
       sp.gps_location,
       sp.religion,
       sp.disability_status,
       sp.project_number,
       sp.graduation_year,
       sp.region,
       sp.district
     FROM users u
     LEFT JOIN student_profiles sp ON sp.user_id = u.id
     WHERE u.id = $1 AND u.deleted_at IS NULL`,
    [userId]
  );

  if (userRows.length === 0) {
    const err = new Error('Resource not found');
    err.status = 404;
    throw err;
  }

  const { rows: photoRows } = await pool.query(
    `SELECT id, url, is_default, created_at
     FROM profile_photos
     WHERE user_id = $1
     ORDER BY is_default DESC, created_at DESC`,
    [userId]
  );

  const profile = userRows[0];
  // Normalise phone — prefer student_profiles phone, fall back to users phone
  profile.phone = profile.sp_phone || profile.user_phone || null;
  delete profile.sp_phone;
  delete profile.user_phone;

  profile.photos = photoRows;
  profile.default_photo = photoRows.find(p => p.is_default) || photoRows[0] || null;
  profile.photo_url = profile.default_photo?.url || null;

  const [
    parents,
    health,
    sponsorships,
    documents,
  ] = await Promise.all([
    pool.query('SELECT * FROM parents_guardians WHERE student_id = $1', [userId]),
    pool.query('SELECT * FROM beneficiary_health WHERE student_id = $1', [userId]),
    pool.query('SELECT * FROM sponsorships WHERE student_id = $1 ORDER BY created_at DESC', [userId]),
    pool.query('SELECT * FROM beneficiary_documents WHERE student_id = $1 ORDER BY created_at DESC', [userId]),
  ]);

  profile.parents_guardian = parents.rows[0] || {};
  profile.health = health.rows[0] || {};
  profile.sponsorship = sponsorships.rows[0] || {};
  profile.sponsorship_history = sponsorships.rows;
  profile.documents = documents.rows;

  return profile;
}

/**
 * Update mutable profile fields for a user.
 * Accepts all extended student profile fields.
 */
async function updateProfile(userId, data) {
  const payload = {
    ...data,
    ...(data.personal || {}),
    ...(data.academic || {}),
  };

  const {
    // users table fields
    name, school_level, location,
    // student_profiles fields
    project_numbers, age, gender, date_of_birth, phone, address,
    school_name, level, program, department, class_year, enrollment_date,
    student_id_number, father_name, mother_name, parent_phone, parent_email,
    emergency_name, emergency_phone, emergency_relation,
    nationality, gps_location, religion, disability_status, project_number,
    graduation_year, region, district,
  } = payload;

  if (
    project_numbers !== undefined &&
    (!Number.isInteger(project_numbers) || project_numbers < 0)
  ) {
    const err = new Error('project_numbers must be a non-negative integer');
    err.status = 400;
    throw err;
  }

  if (project_numbers !== undefined && project_numbers !== null) {
    const num = Number(project_numbers);
    if (!Number.isInteger(num) || num < 0) {
      const err = new Error('project_numbers must be a non-negative integer');
      err.status = 400;
      throw err;
    }
  }

  const { rows: existing } = await pool.query(
    'SELECT id FROM users WHERE id = $1 AND deleted_at IS NULL',
    [userId]
  );
  if (existing.length === 0) {
    const err = new Error('Resource not found');
    err.status = 404;
    throw err;
  }

  // Update users table
  const userSet = [];
  const userParams = [];
  if (name         !== undefined) { userParams.push(name);         userSet.push(`name = $${userParams.length}`); }
  if (school_level !== undefined) { userParams.push(school_level); userSet.push(`school_level = $${userParams.length}`); }
  if (location     !== undefined) { userParams.push(location);     userSet.push(`location = $${userParams.length}`); }
  if (phone        !== undefined) { userParams.push(phone);        userSet.push(`phone = $${userParams.length}`); }

  if (userSet.length > 0) {
    userParams.push(userId);
    await pool.query(
      `UPDATE users SET ${userSet.join(', ')} WHERE id = $${userParams.length}`,
      userParams
    );
  }

  // Upsert student_profiles with all extended fields
  const spFields = {
    project_numbers, age, gender, date_of_birth, phone, address,
    school_name, level, program, department, class_year, enrollment_date,
    student_id_number, father_name, mother_name, parent_phone, parent_email,
    emergency_name, emergency_phone, emergency_relation,
    nationality, gps_location, religion, disability_status, project_number,
    graduation_year, region, district,
  };

  const spKeys   = Object.keys(spFields).filter(k => spFields[k] !== undefined);
  const spValues = spKeys.map(k => spFields[k]);

  if (spKeys.length > 0) {
    const insertCols = ['user_id', ...spKeys].join(', ');
    const insertPlaceholders = ['$1', ...spKeys.map((_, i) => `$${i + 2}`)].join(', ');
    const updateSet = spKeys.map((k, i) => `${k} = $${i + 2}`).join(', ');

    await pool.query(
      `INSERT INTO student_profiles (${insertCols}, updated_at)
       VALUES (${insertPlaceholders}, NOW())
       ON CONFLICT (user_id) DO UPDATE
         SET ${updateSet}, updated_at = NOW()`,
      [userId, ...spValues]
    );
  }

  if (data.parents_guardian || data.parents) {
    const pg = data.parents_guardian || data.parents;
    await pool.query(
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
        userId,
        pg.father_full_name || null,
        pg.father_phone || null,
        pg.father_occupation || null,
        pg.mother_full_name || null,
        pg.mother_phone || null,
        pg.mother_occupation || null,
        pg.guardian_full_name || null,
        pg.guardian_phone || null,
        pg.guardian_relationship || null,
        pg.guardian_occupation || null,
        pg.emergency_contact || null,
        pg.emergency_phone || null,
      ]
    );
  }

  if (data.health) {
    const h = data.health;
    await pool.query(
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
        userId,
        h.medical_conditions || null,
        h.allergies || null,
        h.health_insurance_details || null,
        h.special_needs || null,
        h.counseling_notes || null,
        h.welfare_notes || null,
      ]
    );
  }

  if (data.sponsorship) {
    const s = data.sponsorship;
    const status = s.status || 'unsponsored';
    if (!['sponsored', 'unsponsored', 'scholarship', 'ended'].includes(status)) {
      const err = new Error('Invalid sponsorship status');
      err.status = 400;
      throw err;
    }
    const values = [
      userId,
      status,
      s.sponsor_name || null,
      s.sponsor_email || null,
      s.sponsor_phone || null,
      s.scholarship_status || null,
      s.date_joined || null,
      s.start_date || null,
      s.end_date || null,
      s.financial_support || 0,
      s.items_received || null,
      s.notes || null,
    ];
    const latest = await pool.query(
      `SELECT id FROM sponsorships WHERE student_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [userId]
    );
    if (latest.rows[0]) {
      await pool.query(
        `UPDATE sponsorships SET
           status = $1,
           sponsor_name = $2,
           sponsor_email = $3,
           sponsor_phone = $4,
           scholarship_status = $5,
           date_joined = $6,
           start_date = $7,
           end_date = $8,
           financial_support = $9,
           items_received = $10,
           notes = $11,
           updated_at = NOW()
         WHERE id = $12`,
        [...values.slice(1), latest.rows[0].id]
      );
    } else {
      await pool.query(
        `INSERT INTO sponsorships (
           student_id, status, sponsor_name, sponsor_email, sponsor_phone,
           scholarship_status, date_joined, start_date, end_date,
           financial_support, items_received, notes
         )
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
        values
      );
    }
  }

  return getProfile(userId);
}

async function addDocument(userId, fileData, data = {}, uploadedBy = null) {
  const { rows: existing } = await pool.query(
    'SELECT id FROM users WHERE id = $1 AND deleted_at IS NULL',
    [userId]
  );
  if (existing.length === 0) {
    const err = new Error('Resource not found');
    err.status = 404;
    throw err;
  }

  const title = data.title || fileData.originalname;
  const documentType = data.document_type || data.type || 'general';

  const { rows } = await pool.query(
    `INSERT INTO beneficiary_documents
       (student_id, document_type, title, file_url, mime_type, file_size, uploaded_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     RETURNING *`,
    [
      userId,
      documentType,
      title,
      fileData.file_url,
      fileData.mimetype,
      fileData.size,
      uploadedBy,
    ]
  );

  return rows[0];
}

async function addPhoto(userId, fileData) {
  const { rows: existing } = await pool.query(
    'SELECT id FROM users WHERE id = $1 AND deleted_at IS NULL',
    [userId]
  );
  if (existing.length === 0) {
    const err = new Error('Resource not found');
    err.status = 404;
    throw err;
  }

  const { url } = fileData;

  // Set new photo as default, clear old defaults
  await pool.query(
    'UPDATE profile_photos SET is_default = FALSE WHERE user_id = $1',
    [userId]
  );

  const { rows } = await pool.query(
    `INSERT INTO profile_photos (user_id, url, is_default)
     VALUES ($1, $2, TRUE)
     RETURNING id, user_id, url, is_default, created_at`,
    [userId, url]
  );

  return rows[0];
}

async function setDefaultPhoto(userId, photoId) {
  const { rows: photoRows } = await pool.query(
    'SELECT id FROM profile_photos WHERE id = $1 AND user_id = $2',
    [photoId, userId]
  );
  if (photoRows.length === 0) {
    const err = new Error('Resource not found');
    err.status = 404;
    throw err;
  }

  await pool.query(
    'UPDATE profile_photos SET is_default = FALSE WHERE user_id = $1',
    [userId]
  );

  const { rows } = await pool.query(
    `UPDATE profile_photos
     SET is_default = TRUE
     WHERE id = $1
     RETURNING id, user_id, url, is_default, created_at`,
    [photoId]
  );

  return rows[0];
}

/**
 * Search students — admin only.
 * Searches by name, email, student_id_number, project_numbers, parent_phone.
 */
async function searchStudents({ q, status, limit = 50, offset = 0 }) {
  const conditions = ["u.role = 'student'", 'u.deleted_at IS NULL'];
  const params = [];

  if (q && q.trim()) {
    params.push(`%${q.trim()}%`);
    const n = params.length;
    conditions.push(`(
      u.name ILIKE $${n} OR
      u.email ILIKE $${n} OR
      sp.student_id_number ILIKE $${n} OR
      CAST(sp.project_numbers AS TEXT) ILIKE $${n} OR
      sp.parent_phone ILIKE $${n}
    )`);
  }

  if (status === 'active')   conditions.push('u.is_active = TRUE');
  if (status === 'inactive') conditions.push('u.is_active = FALSE');

  const where = `WHERE ${conditions.join(' AND ')}`;
  params.push(limit, offset);

  const { rows } = await pool.query(
    `SELECT
       u.id, u.name, u.email, u.is_active, u.created_at,
       u.phone AS user_phone,
       sp.student_id_number, sp.project_numbers, sp.school_name,
       sp.level, sp.program, sp.age, sp.phone AS sp_phone,
       sp.father_name, sp.mother_name, sp.parent_phone,
       sp.emergency_phone, sp.gender, sp.date_of_birth,
       pp.url AS photo_url
     FROM users u
     LEFT JOIN student_profiles sp ON sp.user_id = u.id
     LEFT JOIN profile_photos pp ON pp.user_id = u.id AND pp.is_default = TRUE
     ${where}
     ORDER BY u.created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  return rows.map(r => ({
    ...r,
    phone: r.sp_phone || r.user_phone || null,
    sp_phone: undefined,
    user_phone: undefined,
  }));
}

module.exports = { getProfile, updateProfile, addPhoto, setDefaultPhoto, searchStudents, addDocument };
