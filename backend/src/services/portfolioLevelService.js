'use strict';

const pool  = require('../db/pool');
const path  = require('path');
const audit = require('./auditService');

/* ── Academic level structure ── */
const ACADEMIC_LEVELS = [
  'JHS 1','JHS 2','JHS 3',
  'SHS 1','SHS 2','SHS 3',
  'Diploma 1','Diploma 2',
  'Degree 1','Degree 2','Degree 3','Degree 4',
];

const LEVEL_GROUPS = {
  'JHS 1':'JHS','JHS 2':'JHS','JHS 3':'JHS',
  'SHS 1':'SHS','SHS 2':'SHS','SHS 3':'SHS',
  'Diploma 1':'Diploma','Diploma 2':'Diploma',
  'Degree 1':'Degree','Degree 2':'Degree','Degree 3':'Degree','Degree 4':'Degree',
};

const CV_CATEGORIES = ['Academic CV','Professional CV','Internship CV'];

/* ── Ensure tables ── */
async function ensureTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS portfolio_level_cvs (
      id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      student_id     UUID REFERENCES users(id) ON DELETE CASCADE,
      academic_level VARCHAR(50)  NOT NULL,
      cv_category    VARCHAR(50)  NOT NULL DEFAULT 'Academic CV',
      file_name      VARCHAR(255) NOT NULL,
      file_url       TEXT         NOT NULL,
      mime_type      VARCHAR(100) NOT NULL,
      file_size      BIGINT       NOT NULL,
      uploaded_at    TIMESTAMPTZ  DEFAULT NOW(),
      UNIQUE (student_id, academic_level, cv_category)
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS portfolio_level_skills (
      id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      student_id     UUID REFERENCES users(id) ON DELETE CASCADE,
      academic_level VARCHAR(50)  NOT NULL,
      skill_name     VARCHAR(255) NOT NULL,
      level_achieved VARCHAR(100),
      added_at       TIMESTAMPTZ  DEFAULT NOW(),
      UNIQUE (student_id, academic_level, skill_name)
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS portfolio_level_projects (
      id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      student_id     UUID REFERENCES users(id) ON DELETE CASCADE,
      academic_level VARCHAR(50)  NOT NULL,
      title          VARCHAR(255) NOT NULL,
      description    TEXT,
      tags           TEXT[],
      file_url       TEXT,
      file_name      VARCHAR(255),
      mime_type      VARCHAR(100),
      file_size      BIGINT,
      created_at     TIMESTAMPTZ  DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS portfolio_level_experiences (
      id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      student_id     UUID REFERENCES users(id) ON DELETE CASCADE,
      academic_level VARCHAR(50)  NOT NULL,
      title          VARCHAR(255) NOT NULL,
      organization   VARCHAR(255),
      start_date     DATE         NOT NULL,
      end_date       DATE,
      description    TEXT,
      created_at     TIMESTAMPTZ  DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS student_current_level (
      student_id     UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      academic_level VARCHAR(50) NOT NULL,
      updated_at     TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await pool.query(`CREATE INDEX IF NOT EXISTS idx_plcv_student   ON portfolio_level_cvs(student_id)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_plsk_student   ON portfolio_level_skills(student_id)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_plpr_student   ON portfolio_level_projects(student_id)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_plexp_student  ON portfolio_level_experiences(student_id)`);
}

/* ── Current level ── */
async function getCurrentLevel(studentId) {
  await ensureTables();
  const { rows } = await pool.query(
    'SELECT academic_level FROM student_current_level WHERE student_id = $1',
    [studentId]
  );
  return rows[0]?.academic_level || null;
}

async function setCurrentLevel(studentId, level) {
  await ensureTables();
  if (!ACADEMIC_LEVELS.includes(level)) {
    const e = new Error(`Invalid academic level: ${level}`); e.status = 400; throw e;
  }
  await pool.query(
    `INSERT INTO student_current_level (student_id, academic_level, updated_at)
     VALUES ($1, $2, NOW())
     ON CONFLICT (student_id) DO UPDATE SET academic_level = $2, updated_at = NOW()`,
    [studentId, level]
  );
  return { academic_level: level };
}

/* ── CV per level ── */
async function uploadLevelCV(studentId, { academic_level, cv_category, file_name, file_url, mime_type, file_size }) {
  await ensureTables();
  const { rows } = await pool.query(
    `INSERT INTO portfolio_level_cvs
       (student_id, academic_level, cv_category, file_name, file_url, mime_type, file_size)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     ON CONFLICT (student_id, academic_level, cv_category)
     DO UPDATE SET file_name=$4, file_url=$5, mime_type=$6, file_size=$7, uploaded_at=NOW()
     RETURNING *`,
    [studentId, academic_level, cv_category, file_name, file_url, mime_type, file_size]
  );
  return rows[0];
}

async function getLevelCVs(studentId, level) {
  await ensureTables();
  const { rows } = await pool.query(
    'SELECT * FROM portfolio_level_cvs WHERE student_id=$1 AND academic_level=$2 ORDER BY uploaded_at DESC',
    [studentId, level]
  );
  return rows;
}

/* ── Skills per level ── */
async function addLevelSkill(studentId, { academic_level, skill_name, level_achieved }) {
  await ensureTables();
  const { rows } = await pool.query(
    `INSERT INTO portfolio_level_skills (student_id, academic_level, skill_name, level_achieved)
     VALUES ($1,$2,$3,$4)
     ON CONFLICT (student_id, academic_level, skill_name)
     DO UPDATE SET level_achieved=$4, added_at=NOW()
     RETURNING *`,
    [studentId, academic_level, skill_name, level_achieved || null]
  );
  return rows[0];
}

async function deleteLevelSkill(skillId, studentId) {
  await ensureTables();
  const { rows } = await pool.query(
    'DELETE FROM portfolio_level_skills WHERE id=$1 AND student_id=$2 RETURNING id',
    [skillId, studentId]
  );
  if (rows.length === 0) { const e = new Error('Skill not found'); e.status = 404; throw e; }
  return { success: true };
}

async function getLevelSkills(studentId, level) {
  await ensureTables();
  const { rows } = await pool.query(
    'SELECT * FROM portfolio_level_skills WHERE student_id=$1 AND academic_level=$2 ORDER BY added_at DESC',
    [studentId, level]
  );
  return rows;
}

/* ── Projects per level ── */
async function addLevelProject(studentId, { academic_level, title, description, tags, file_url, file_name, mime_type, file_size }) {
  await ensureTables();
  const { rows } = await pool.query(
    `INSERT INTO portfolio_level_projects
       (student_id, academic_level, title, description, tags, file_url, file_name, mime_type, file_size)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
     RETURNING *`,
    [studentId, academic_level, title, description||null, tags||[], file_url||null, file_name||null, mime_type||null, file_size||null]
  );
  return rows[0];
}

async function deleteLevelProject(projectId, studentId) {
  await ensureTables();
  const { rows } = await pool.query(
    'DELETE FROM portfolio_level_projects WHERE id=$1 AND student_id=$2 RETURNING id',
    [projectId, studentId]
  );
  if (rows.length === 0) { const e = new Error('Project not found'); e.status = 404; throw e; }
  return { success: true };
}

async function getLevelProjects(studentId, level) {
  await ensureTables();
  const { rows } = await pool.query(
    'SELECT * FROM portfolio_level_projects WHERE student_id=$1 AND academic_level=$2 ORDER BY created_at DESC',
    [studentId, level]
  );
  return rows;
}

/* ── Experiences per level ── */
async function addLevelExperience(studentId, { academic_level, title, organization, start_date, end_date, description }) {
  await ensureTables();
  const { rows } = await pool.query(
    `INSERT INTO portfolio_level_experiences
       (student_id, academic_level, title, organization, start_date, end_date, description)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     RETURNING *`,
    [studentId, academic_level, title, organization||null, start_date, end_date||null, description||null]
  );
  return rows[0];
}

async function deleteLevelExperience(expId, studentId) {
  await ensureTables();
  const { rows } = await pool.query(
    'DELETE FROM portfolio_level_experiences WHERE id=$1 AND student_id=$2 RETURNING id',
    [expId, studentId]
  );
  if (rows.length === 0) { const e = new Error('Experience not found'); e.status = 404; throw e; }
  return { success: true };
}

async function getLevelExperiences(studentId, level) {
  await ensureTables();
  const { rows } = await pool.query(
    'SELECT * FROM portfolio_level_experiences WHERE student_id=$1 AND academic_level=$2 ORDER BY start_date ASC',
    [studentId, level]
  );
  return rows;
}

/* ── Full level portfolio ── */
async function getLevelPortfolio(studentId, level) {
  await ensureTables();
  const [cvs, skills, projects, experiences] = await Promise.all([
    getLevelCVs(studentId, level),
    getLevelSkills(studentId, level),
    getLevelProjects(studentId, level),
    getLevelExperiences(studentId, level),
  ]);
  return { level, cvs, skills, projects, experiences };
}

/* ── Growth timeline (all levels) ── */
async function getGrowthTimeline(studentId) {
  await ensureTables();
  const timeline = [];
  for (const level of ACADEMIC_LEVELS) {
    const [skills, projects, experiences] = await Promise.all([
      getLevelSkills(studentId, level),
      getLevelProjects(studentId, level),
      getLevelExperiences(studentId, level),
    ]);
    if (skills.length > 0 || projects.length > 0 || experiences.length > 0) {
      timeline.push({ level, group: LEVEL_GROUPS[level], skills, projects, experiences });
    }
  }
  return timeline;
}

/* ── Admin: get student full portfolio ── */
async function getStudentFullPortfolio(studentId) {
  await ensureTables();
  const currentLevel = await getCurrentLevel(studentId);
  const allData = {};
  for (const level of ACADEMIC_LEVELS) {
    const data = await getLevelPortfolio(studentId, level);
    if (data.cvs.length || data.skills.length || data.projects.length || data.experiences.length) {
      allData[level] = data;
    }
  }
  return { current_level: currentLevel, levels: allData };
}

module.exports = {
  ACADEMIC_LEVELS,
  LEVEL_GROUPS,
  CV_CATEGORIES,
  ensureTables,
  getCurrentLevel,
  setCurrentLevel,
  uploadLevelCV,
  getLevelCVs,
  addLevelSkill,
  deleteLevelSkill,
  getLevelSkills,
  addLevelProject,
  deleteLevelProject,
  getLevelProjects,
  addLevelExperience,
  deleteLevelExperience,
  getLevelExperiences,
  getLevelPortfolio,
  getGrowthTimeline,
  getStudentFullPortfolio,
};
