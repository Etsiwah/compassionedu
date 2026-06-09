'use strict';

const pool  = require('../db/pool');
const audit = require('./auditService');

/* ── Level / category structure ─────────────────────────────────────────── */
const ACTIVITY_STRUCTURE = {
  JHS: {
    years:      ['JHS 1', 'JHS 2', 'JHS 3'],
    categories: ['Group Pictures', 'Sports', 'Academic Events', 'Classroom Activities', 'Excursions', 'Club Events', 'Other'],
  },
  SHS: {
    years:      ['SHS 1', 'SHS 2', 'SHS 3'],
    categories: ['Presentations', 'Projects', 'Competitions', 'Group Discussions', 'Programs', 'School Events', 'Other'],
  },
  Diploma: {
    years:      ['Diploma 1', 'Diploma 2'],
    categories: ['Presentations', 'Research', 'Conferences', 'Seminars', 'Group Work', 'Field Work', 'Academic Events', 'Other'],
  },
  Degree: {
    years:      ['Degree 1', 'Degree 2', 'Degree 3', 'Degree 4'],
    categories: ['Presentations', 'Research', 'Conferences', 'Seminars', 'Group Work', 'Field Work', 'Academic Events', 'Other'],
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

/* ── Ensure tables ── */
async function ensureTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS activities (
      id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      student_id       UUID REFERENCES users(id) ON DELETE CASCADE,
      title            VARCHAR(255) NOT NULL,
      description      TEXT,
      school_level     VARCHAR(50)  NOT NULL,
      year_label       VARCHAR(50),
      category         VARCHAR(100) NOT NULL,
      location         VARCHAR(255),
      activity_date    DATE         NOT NULL,
      status           VARCHAR(20)  NOT NULL DEFAULT 'pending'
                         CHECK (status IN ('pending','approved','rejected')),
      admin_comment    TEXT,
      rejection_reason TEXT,
      reviewed_by      UUID REFERENCES users(id) ON DELETE SET NULL,
      reviewed_at      TIMESTAMPTZ,
      view_count       INT          NOT NULL DEFAULT 0,
      created_at       TIMESTAMPTZ  DEFAULT NOW(),
      updated_at       TIMESTAMPTZ  DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS activity_media (
      id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      activity_id  UUID REFERENCES activities(id) ON DELETE CASCADE,
      url          TEXT         NOT NULL,
      mime_type    VARCHAR(100) NOT NULL,
      file_name    VARCHAR(255) NOT NULL,
      file_size    BIGINT       NOT NULL,
      media_type   VARCHAR(10)  NOT NULL CHECK (media_type IN ('photo','video')),
      created_at   TIMESTAMPTZ  DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS activity_comments (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      activity_id UUID REFERENCES activities(id) ON DELETE CASCADE,
      user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
      parent_id   UUID REFERENCES activity_comments(id) ON DELETE CASCADE,
      content     TEXT NOT NULL,
      created_at  TIMESTAMPTZ DEFAULT NOW(),
      updated_at  TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS activity_reactions (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      activity_id UUID REFERENCES activities(id) ON DELETE CASCADE,
      user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
      reaction    VARCHAR(20) NOT NULL CHECK (reaction IN ('like','love','celebrate','support')),
      created_at  TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE (activity_id, user_id)
    )
  `);

  await pool.query(`CREATE INDEX IF NOT EXISTS idx_activities_student  ON activities(student_id)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_activities_status   ON activities(status)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_activities_level    ON activities(school_level)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_activity_media_act  ON activity_media(activity_id)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_activity_comments   ON activity_comments(activity_id)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_activity_reactions  ON activity_reactions(activity_id)`);
}

/* ── Create activity ── */
async function createActivity(studentId, {
  title, description, school_level, year_label, category, location, activity_date,
}) {
  await ensureTables();

  if (!title || !school_level || !category || !activity_date) {
    const e = new Error('title, school_level, category, and activity_date are required');
    e.status = 400; throw e;
  }

  const { rows } = await pool.query(
    `INSERT INTO activities
       (student_id, title, description, school_level, year_label, category, location, activity_date)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     RETURNING *`,
    [studentId, title, description || null, school_level, year_label || null,
     category, location || null, activity_date]
  );

  // Notify admin
  try {
    await audit.log({
      userId: studentId, role: 'student', action: 'activity_uploaded',
      entityType: 'activity', entityId: rows[0].id,
      details: { title, school_level, category },
    });
  } catch {}

  return rows[0];
}

/* ── Add media to activity ── */
async function addActivityMedia(activityId, studentId, mediaItems) {
  await ensureTables();

  // Verify ownership
  const { rows: act } = await pool.query(
    'SELECT id FROM activities WHERE id = $1 AND student_id = $2',
    [activityId, studentId]
  );
  if (act.length === 0) {
    const e = new Error('Activity not found'); e.status = 404; throw e;
  }

  const inserted = [];
  for (const m of mediaItems) {
    const { rows } = await pool.query(
      `INSERT INTO activity_media (activity_id, url, mime_type, file_name, file_size, media_type)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [activityId, m.url, m.mime_type, m.file_name, m.file_size, m.media_type]
    );
    inserted.push(rows[0]);
  }
  return inserted;
}

/* ── Get feed (approved activities) ── */
async function getFeed({ level, category, search, limit = 20, offset = 0 }) {
  await ensureTables();

  const conditions = ["a.status = 'approved'"];
  const params = [];

  if (level) {
    params.push(level);
    conditions.push(`a.school_level = $${params.length}`);
  }
  if (category) {
    params.push(category);
    conditions.push(`a.category = $${params.length}`);
  }
  if (search && search.trim()) {
    params.push(`%${search.trim()}%`);
    conditions.push(`(a.title ILIKE $${params.length} OR u.name ILIKE $${params.length} OR a.category ILIKE $${params.length})`);
  }

  const where = `WHERE ${conditions.join(' AND ')}`;
  params.push(limit, offset);

  const { rows } = await pool.query(
    `SELECT a.*,
            u.name AS student_name,
            pp.url AS student_photo,
            (SELECT COUNT(*) FROM activity_comments c WHERE c.activity_id = a.id) AS comment_count,
            (SELECT COUNT(*) FROM activity_reactions r WHERE r.activity_id = a.id) AS reaction_count,
            (SELECT json_agg(json_build_object('reaction', r2.reaction, 'count', r2.cnt))
             FROM (SELECT reaction, COUNT(*) AS cnt FROM activity_reactions
                   WHERE activity_id = a.id GROUP BY reaction) r2) AS reactions_breakdown
     FROM activities a
     JOIN users u ON u.id = a.student_id
     LEFT JOIN profile_photos pp ON pp.user_id = a.student_id AND pp.is_default = TRUE
     ${where}
     ORDER BY a.created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  // Attach media to each activity
  for (const act of rows) {
    const { rows: media } = await pool.query(
      'SELECT * FROM activity_media WHERE activity_id = $1 ORDER BY created_at ASC',
      [act.id]
    );
    act.media = media;
  }

  return rows;
}

/* ── Get student's own activities ── */
async function getStudentActivities(studentId) {
  await ensureTables();
  const { rows } = await pool.query(
    `SELECT a.*,
            (SELECT COUNT(*) FROM activity_comments c WHERE c.activity_id = a.id) AS comment_count,
            (SELECT COUNT(*) FROM activity_reactions r WHERE r.activity_id = a.id) AS reaction_count
     FROM activities a
     WHERE a.student_id = $1
     ORDER BY a.created_at DESC`,
    [studentId]
  );
  for (const act of rows) {
    const { rows: media } = await pool.query(
      'SELECT * FROM activity_media WHERE activity_id = $1',
      [act.id]
    );
    act.media = media;
  }
  return rows;
}

/* ── Get single activity with media + comments ── */
async function getActivity(activityId, requesterId, requesterRole) {
  await ensureTables();

  const { rows } = await pool.query(
    `SELECT a.*, u.name AS student_name, pp.url AS student_photo
     FROM activities a
     JOIN users u ON u.id = a.student_id
     LEFT JOIN profile_photos pp ON pp.user_id = a.student_id AND pp.is_default = TRUE
     WHERE a.id = $1`,
    [activityId]
  );

  if (rows.length === 0) {
    const e = new Error('Activity not found'); e.status = 404; throw e;
  }

  const act = rows[0];

  // Visibility check
  if (act.status !== 'approved' && requesterRole !== 'admin' && act.student_id !== requesterId) {
    const e = new Error('Activity not found'); e.status = 404; throw e;
  }

  // Media
  const { rows: media } = await pool.query(
    'SELECT * FROM activity_media WHERE activity_id = $1 ORDER BY created_at ASC',
    [activityId]
  );
  act.media = media;

  // Comments
  const { rows: comments } = await pool.query(
    `SELECT c.*, u.name AS user_name, pp.url AS user_photo
     FROM activity_comments c
     JOIN users u ON u.id = c.user_id
     LEFT JOIN profile_photos pp ON pp.user_id = c.user_id AND pp.is_default = TRUE
     WHERE c.activity_id = $1
     ORDER BY c.created_at ASC`,
    [activityId]
  );
  act.comments = comments;

  // Reactions
  const { rows: reactions } = await pool.query(
    `SELECT reaction, COUNT(*) AS count
     FROM activity_reactions WHERE activity_id = $1 GROUP BY reaction`,
    [activityId]
  );
  act.reactions = reactions;

  // Increment view count
  await pool.query('UPDATE activities SET view_count = view_count + 1 WHERE id = $1', [activityId]);

  return act;
}

/* ── Delete activity (student own, or admin) ── */
async function deleteActivity(activityId, userId, role) {
  await ensureTables();
  const condition = role === 'admin' ? 'id = $1' : 'id = $1 AND student_id = $2';
  const params    = role === 'admin' ? [activityId] : [activityId, userId];

  const { rows } = await pool.query(
    `DELETE FROM activities WHERE ${condition} RETURNING id`,
    params
  );
  if (rows.length === 0) {
    const e = new Error('Activity not found'); e.status = 404; throw e;
  }
  return { success: true };
}

/* ── Admin: review activity ── */
async function reviewActivity(activityId, adminId, { action, comment }) {
  await ensureTables();

  if (!['approved', 'rejected'].includes(action)) {
    const e = new Error('action must be approved or rejected'); e.status = 400; throw e;
  }

  const { rows } = await pool.query(
    `UPDATE activities
     SET status           = $1,
         admin_comment    = $2,
         rejection_reason = CASE WHEN $1 = 'rejected' THEN $2 ELSE NULL END,
         reviewed_by      = $3,
         reviewed_at      = NOW(),
         updated_at       = NOW()
     WHERE id = $4
     RETURNING *`,
    [action, comment || null, adminId, activityId]
  );

  if (rows.length === 0) {
    const e = new Error('Activity not found'); e.status = 404; throw e;
  }

  await audit.log({
    userId: adminId, role: 'admin', action: `activity_${action}`,
    entityType: 'activity', entityId: activityId, details: { comment },
  });

  return rows[0];
}

/* ── Admin: get all activities ── */
async function getAllActivities({ status, level, search, limit = 100, offset = 0 }) {
  await ensureTables();
  const conditions = [];
  const params = [];

  if (status && status !== 'all') { params.push(status); conditions.push(`a.status = $${params.length}`); }
  if (level)  { params.push(level);  conditions.push(`a.school_level = $${params.length}`); }
  if (search && search.trim()) {
    params.push(`%${search.trim()}%`);
    conditions.push(`(a.title ILIKE $${params.length} OR u.name ILIKE $${params.length})`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  params.push(limit, offset);

  const { rows } = await pool.query(
    `SELECT a.*, u.name AS student_name, u.email AS student_email,
            (SELECT COUNT(*) FROM activity_media m WHERE m.activity_id = a.id) AS media_count
     FROM activities a
     JOIN users u ON u.id = a.student_id
     ${where}
     ORDER BY a.created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );
  return rows;
}

/* ── Admin analytics ── */
async function getAdminAnalytics() {
  await ensureTables();
  const [counts, topStudents] = await Promise.all([
    pool.query(`
      SELECT
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE status = 'pending')  AS pending,
        COUNT(*) FILTER (WHERE status = 'approved') AS approved,
        COUNT(*) FILTER (WHERE status = 'rejected') AS rejected
      FROM activities
    `),
    pool.query(`
      SELECT u.id, u.name, COUNT(a.id) AS activity_count
      FROM activities a
      JOIN users u ON u.id = a.student_id
      WHERE a.status = 'approved'
      GROUP BY u.id, u.name
      ORDER BY activity_count DESC
      LIMIT 5
    `),
  ]);
  return { counts: counts.rows[0], top_students: topStudents.rows };
}

/* ── Comments ── */
async function addComment(activityId, userId, { content, parent_id }) {
  await ensureTables();
  if (!content || !content.trim()) {
    const e = new Error('Comment cannot be empty'); e.status = 400; throw e;
  }
  const { rows } = await pool.query(
    `INSERT INTO activity_comments (activity_id, user_id, parent_id, content)
     VALUES ($1,$2,$3,$4)
     RETURNING *`,
    [activityId, userId, parent_id || null, content.trim()]
  );
  const { rows: user } = await pool.query(
    'SELECT name FROM users WHERE id = $1', [userId]
  );
  return { ...rows[0], user_name: user[0]?.name };
}

async function editComment(commentId, userId, content) {
  await ensureTables();
  const { rows } = await pool.query(
    `UPDATE activity_comments SET content = $1, updated_at = NOW()
     WHERE id = $2 AND user_id = $3 RETURNING *`,
    [content, commentId, userId]
  );
  if (rows.length === 0) {
    const e = new Error('Comment not found'); e.status = 404; throw e;
  }
  return rows[0];
}

async function deleteComment(commentId, userId, role) {
  await ensureTables();
  const condition = role === 'admin' ? 'id = $1' : 'id = $1 AND user_id = $2';
  const params    = role === 'admin' ? [commentId] : [commentId, userId];
  const { rows } = await pool.query(
    `DELETE FROM activity_comments WHERE ${condition} RETURNING id`, params
  );
  if (rows.length === 0) {
    const e = new Error('Comment not found'); e.status = 404; throw e;
  }
  return { success: true };
}

/* ── Reactions ── */
async function toggleReaction(activityId, userId, reaction) {
  await ensureTables();
  const valid = ['like', 'love', 'celebrate', 'support'];
  if (!valid.includes(reaction)) {
    const e = new Error('Invalid reaction'); e.status = 400; throw e;
  }

  // Check existing
  const { rows: existing } = await pool.query(
    'SELECT id, reaction FROM activity_reactions WHERE activity_id = $1 AND user_id = $2',
    [activityId, userId]
  );

  if (existing.length > 0) {
    if (existing[0].reaction === reaction) {
      // Remove reaction
      await pool.query('DELETE FROM activity_reactions WHERE id = $1', [existing[0].id]);
      return { action: 'removed', reaction };
    } else {
      // Change reaction
      await pool.query('UPDATE activity_reactions SET reaction = $1 WHERE id = $2', [reaction, existing[0].id]);
      return { action: 'changed', reaction };
    }
  } else {
    await pool.query(
      'INSERT INTO activity_reactions (activity_id, user_id, reaction) VALUES ($1,$2,$3)',
      [activityId, userId, reaction]
    );
    return { action: 'added', reaction };
  }
}

async function getReactions(activityId) {
  await ensureTables();
  const { rows } = await pool.query(
    `SELECT reaction, COUNT(*) AS count
     FROM activity_reactions WHERE activity_id = $1 GROUP BY reaction`,
    [activityId]
  );
  return rows;
}

module.exports = {
  ACTIVITY_STRUCTURE,
  getLevelGroup,
  ensureTables,
  createActivity,
  addActivityMedia,
  getFeed,
  getStudentActivities,
  getActivity,
  deleteActivity,
  reviewActivity,
  getAllActivities,
  getAdminAnalytics,
  addComment,
  editComment,
  deleteComment,
  toggleReaction,
  getReactions,
};
