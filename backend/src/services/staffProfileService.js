'use strict';

const pool = require('../db/pool');

/**
 * Fetch a combined profile for the given staff user.
 * Joins users + staff_profiles + profile_photos (default only).
 * Falls back to users + profile_photos when the staff_profiles table is absent.
 */
async function getStaffProfile(userId) {
  // First verify the user exists
  const { rows: userRows } = await pool.query(
    `SELECT
       u.id,
       u.name,
       u.email,
       u.role,
       u.is_active,
       u.phone        AS user_phone,
       u.staff_role,
       u.created_at,
       pp.url         AS photo_url
     FROM users u
     LEFT JOIN profile_photos pp ON pp.user_id = u.id AND pp.is_default = TRUE
     WHERE u.id = $1
       AND u.deleted_at IS NULL`,
    [userId]
  );

  if (userRows.length === 0) {
    const err = new Error('Resource not found');
    err.status = 404;
    throw err;
  }

  const base = userRows[0];

  // Try to get extended staff_profiles data (table may not exist yet)
  let extended = {
    phone: null, age: null, date_of_birth: null, gender: null, department: null,
    bio: null, portfolio_url: null, portfolio_status: 'pending', cv_url: null, cv_status: 'pending',
  };

  try {
    const { rows: spRows } = await pool.query(
      `SELECT phone, age, date_of_birth, gender, department, bio, portfolio_url, portfolio_status, cv_url, cv_status
       FROM staff_profiles
       WHERE user_id = $1`,
      [userId]
    );
    if (spRows.length > 0) {
      extended = spRows[0];
    }
  } catch {
    // staff_profiles table absent — use null defaults
  }

  return {
    id:            base.id,
    name:          base.name,
    email:         base.email,
    role:          base.role,
    is_active:     base.is_active,
    staff_role:    base.staff_role,
    created_at:    base.created_at,
    photo_url:     base.photo_url,
    phone:         extended.phone || base.user_phone || null,
    age:           extended.age,
    date_of_birth: extended.date_of_birth,
    gender:        extended.gender,
    department:    extended.department,
    bio:           extended.bio,
    portfolio_url: extended.portfolio_url,
    portfolio_status: extended.portfolio_status || 'pending',
    cv_url:        extended.cv_url,
    cv_status:     extended.cv_status || 'pending',
  };
}

async function updateStaffProfile(userId, data) {
  const { name, phone, age, date_of_birth, gender, department, bio, portfolio_url, cv_url, staff_role } = data;

  // Update user base fields
  const userParams = [];
  const userSet = [];
  if (name !== undefined) { userParams.push(name); userSet.push(`name = $${userParams.length}`); }
  if (phone !== undefined) { userParams.push(phone); userSet.push(`phone = $${userParams.length}`); }
  if (staff_role !== undefined) { userParams.push(staff_role); userSet.push(`staff_role = $${userParams.length}`); }

  if (userSet.length > 0) {
    userParams.push(userId);
    await pool.query(
      `UPDATE users SET ${userSet.join(', ')} WHERE id = $${userParams.length}`,
      userParams
    );
  }

  // Upsert staff_profiles
  const spFields = { age, date_of_birth, gender, department, bio, portfolio_url, cv_url, phone };
  const spKeys = Object.keys(spFields).filter(k => spFields[k] !== undefined);
  const spValues = spKeys.map(k => spFields[k]);

  if (spKeys.length > 0) {
    const insertCols = ['user_id', ...spKeys, 'cv_status', 'portfolio_status'].join(', ');
    const insertPlaceholders = ['$1', ...spKeys.map((_, i) => `$${i + 2}`), "'pending'", "'pending'"].join(', ');
    
    // For update, reset status to pending if URL changes
    const updateSets = spKeys.map((k, i) => {
      if (k === 'cv_url') return `cv_url = $${i + 2}, cv_status = CASE WHEN staff_profiles.cv_url IS DISTINCT FROM $${i + 2} THEN 'pending' ELSE staff_profiles.cv_status END`;
      if (k === 'portfolio_url') return `portfolio_url = $${i + 2}, portfolio_status = CASE WHEN staff_profiles.portfolio_url IS DISTINCT FROM $${i + 2} THEN 'pending' ELSE staff_profiles.portfolio_status END`;
      return `${k} = $${i + 2}`;
    });
    const updateSet = updateSets.join(', ');

    await pool.query(
      `INSERT INTO staff_profiles (${insertCols}, updated_at)
       VALUES (${insertPlaceholders}, NOW())
       ON CONFLICT (user_id) DO UPDATE
         SET ${updateSet}, updated_at = NOW()`,
      [userId, ...spValues]
    );
  }

  return getStaffProfile(userId);
}

async function approveStaffDocument(userId, field, status) {
  if (!['approved', 'rejected', 'pending'].includes(status)) {
    throw new Error('Invalid status');
  }
  if (field !== 'cv' && field !== 'portfolio') {
    throw new Error('Invalid field');
  }
  
  const col = field === 'cv' ? 'cv_status' : 'portfolio_status';
  
  await pool.query(
    `UPDATE staff_profiles SET ${col} = $1, updated_at = NOW() WHERE user_id = $2`,
    [status, userId]
  );
  
  return getStaffProfile(userId);
}

module.exports = { getStaffProfile, updateStaffProfile, approveStaffDocument };
