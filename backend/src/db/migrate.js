'use strict';

const fs   = require('fs');
const path = require('path');
const { Pool } = require('pg');

require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('ERROR: DATABASE_URL environment variable is not set.');
  process.exit(1);
}

const pool = new Pool({ 
  connectionString: DATABASE_URL,
  ssl: (DATABASE_URL && DATABASE_URL.includes('render.com')) ? { rejectUnauthorized: false } : false
});

async function migrate() {
  console.log('\nConnecting to PostgreSQL...');
  const client = await pool.connect();

  try {
    console.log('Running migrations...\n');

    // ── STEP 1: Run the main schema FIRST (creates all tables) ─────────
    const schemaPath = path.join(__dirname, 'schema.sql');
    const sql = fs.readFileSync(schemaPath, 'utf8');

    // Split on semicolons and run each statement individually
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    let ok = 0;
    let skipped = 0;

    for (const stmt of statements) {
      try {
        await client.query(stmt);
        ok++;
      } catch (err) {
        // Ignore "already exists" errors — these are expected on re-runs
        if (
          err.code === '42710' || // duplicate_object
          err.code === '42P07' || // duplicate_table
          err.code === '42701' || // duplicate_column
          err.message.includes('already exists')
        ) {
          skipped++;
        } else {
          console.warn(`  ⚠️  Statement skipped: ${err.message.slice(0, 80)}`);
          skipped++;
        }
      }
    }

    console.log(`  ✅  Schema applied (${ok} statements OK, ${skipped} skipped/existing)`);

    // ── STEP 2: Fix the role CHECK constraint to include 'staff' ──────────────
    // Now that users table exists, we can safely modify it
    try {
      await client.query(`
        DO $$
        BEGIN
          -- Drop old constraint if it exists
          IF EXISTS (
            SELECT 1 FROM information_schema.table_constraints
            WHERE table_name = 'users'
              AND constraint_name = 'users_role_check'
          ) THEN
            ALTER TABLE users DROP CONSTRAINT users_role_check;
          END IF;
        EXCEPTION WHEN OTHERS THEN
          NULL;
        END
        $$;
      `);

      await client.query(`
        DO $$
        BEGIN
          ALTER TABLE users ADD CONSTRAINT users_role_check
            CHECK (role IN ('admin','student','teacher','parent','staff'));
        EXCEPTION WHEN duplicate_object THEN
          NULL;
        END
        $$;
      `);
      console.log('  ✅  Role constraint updated (includes staff)');
    } catch (err) {
      console.log('  ⏩  Skipping role constraint update (table may not have role column yet)');
    }

    // ── STEP 3: Ensure additive columns exist on users table ──────────────────
    const alterColumns = [
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS phone          VARCHAR(50)`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS staff_role     VARCHAR(100)`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at  TIMESTAMPTZ`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS account_source VARCHAR(20) DEFAULT 'self_registered'`,
    ];

    for (const stmt of alterColumns) {
      try { await client.query(stmt); } catch { /* already exists */ }
    }
    console.log('  ✅  User table columns ensured');

    // ── STEP 4: Ensure extended student_profiles columns exist ────────────────
    const studentProfileCols = [
      `ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS age               INT`,
      `ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS gender            VARCHAR(20)`,
      `ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS date_of_birth     DATE`,
      `ALTER TABLE staff_profiles ADD COLUMN IF NOT EXISTS date_of_birth       DATE`,
      `ALTER TABLE staff_profiles ADD COLUMN IF NOT EXISTS cv_status           VARCHAR(20) DEFAULT 'pending'`,
      `ALTER TABLE staff_profiles ADD COLUMN IF NOT EXISTS portfolio_status    VARCHAR(20) DEFAULT 'pending'`,
      `ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS phone             VARCHAR(50)`,
      `ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS address           TEXT`,
      `ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS school_name       VARCHAR(255)`,
      `ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS level             VARCHAR(100)`,
      `ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS program           VARCHAR(255)`,
      `ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS department        VARCHAR(255)`,
      `ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS class_year        VARCHAR(100)`,
      `ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS enrollment_date   DATE`,
      `ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS student_id_number VARCHAR(100)`,
      `ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS father_name       VARCHAR(255)`,
      `ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS mother_name       VARCHAR(255)`,
      `ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS parent_phone      VARCHAR(50)`,
      `ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS parent_email      VARCHAR(255)`,
      `ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS emergency_name    VARCHAR(255)`,
      `ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS emergency_phone   VARCHAR(50)`,
      `ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS emergency_relation VARCHAR(100)`,
    ];

    for (const stmt of studentProfileCols) {
      try { await client.query(stmt); } catch { /* already exists */ }
    }
    console.log('  ✅  Student profile extended columns ensured');

    // ── STEP 5: Ensure beneficiary/student management columns and tables exist ──
    const beneficiaryProfileCols = [
      `ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS nationality       VARCHAR(100)`,
      `ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS gps_location      VARCHAR(255)`,
      `ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS religion          VARCHAR(100)`,
      `ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS disability_status VARCHAR(255)`,
      `ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS project_number    VARCHAR(100)`,
      `ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS graduation_year   INT`,
      `ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS region            VARCHAR(150)`,
      `ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS district          VARCHAR(150)`,
      `ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS academic_documents JSONB DEFAULT '[]'::jsonb`,
    ];

    for (const stmt of beneficiaryProfileCols) {
      try { await client.query(stmt); } catch { /* already exists */ }
    }

    await client.query(`
      CREATE TABLE IF NOT EXISTS parents_guardians (
        id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        student_id            UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        father_full_name      VARCHAR(255),
        father_phone          VARCHAR(50),
        father_occupation     VARCHAR(255),
        mother_full_name      VARCHAR(255),
        mother_phone          VARCHAR(50),
        mother_occupation     VARCHAR(255),
        guardian_full_name    VARCHAR(255),
        guardian_phone        VARCHAR(50),
        guardian_relationship VARCHAR(100),
        guardian_occupation   VARCHAR(255),
        emergency_contact     VARCHAR(255),
        emergency_phone       VARCHAR(50),
        created_at            TIMESTAMPTZ DEFAULT NOW(),
        updated_at            TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(student_id)
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS academic_records (
        id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        student_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        institution          VARCHAR(255),
        educational_level    VARCHAR(100),
        class_year           VARCHAR(100),
        program_course       VARCHAR(255),
        student_index_number VARCHAR(100),
        term                 VARCHAR(100),
        academic_year        VARCHAR(50),
        result_summary       TEXT,
        grades               JSONB DEFAULT '[]'::jsonb,
        performance_notes    TEXT,
        attendance_summary   TEXT,
        graduation_year      INT,
        document_url         TEXT,
        created_at           TIMESTAMPTZ DEFAULT NOW(),
        updated_at           TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS sponsorships (
        id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        student_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        status             VARCHAR(30) NOT NULL DEFAULT 'unsponsored'
          CHECK (status IN ('sponsored','unsponsored','scholarship','ended')),
        sponsor_name       VARCHAR(255),
        sponsor_email      VARCHAR(255),
        sponsor_phone      VARCHAR(50),
        scholarship_status VARCHAR(100),
        date_joined        DATE,
        start_date         DATE,
        end_date           DATE,
        financial_support  NUMERIC(12,2) DEFAULT 0,
        items_received     TEXT,
        notes              TEXT,
        created_at         TIMESTAMPTZ DEFAULT NOW(),
        updated_at         TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS beneficiary_documents (
        id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        student_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        document_type VARCHAR(100) NOT NULL,
        title         VARCHAR(255) NOT NULL,
        file_url      TEXT NOT NULL,
        mime_type     VARCHAR(100),
        file_size     INT,
        uploaded_by   UUID REFERENCES users(id) ON DELETE SET NULL,
        created_at    TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS beneficiary_health (
        student_id               UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        medical_conditions       TEXT,
        allergies                TEXT,
        health_insurance_details TEXT,
        special_needs            TEXT,
        counseling_notes         TEXT,
        welfare_notes            TEXT,
        updated_at               TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS beneficiary_activity_logs (
        id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        student_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        actor_id      UUID REFERENCES users(id) ON DELETE SET NULL,
        activity_type VARCHAR(100) NOT NULL,
        title         VARCHAR(255) NOT NULL,
        description   TEXT,
        metadata      JSONB DEFAULT '{}'::jsonb,
        created_at    TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    const beneficiaryIndexes = [
      `CREATE INDEX IF NOT EXISTS idx_student_profiles_project_number ON student_profiles(LOWER(project_number))`,
      `CREATE INDEX IF NOT EXISTS idx_student_profiles_student_id_number ON student_profiles(LOWER(student_id_number))`,
      `CREATE INDEX IF NOT EXISTS idx_student_profiles_level ON student_profiles(level)`,
      `CREATE INDEX IF NOT EXISTS idx_student_profiles_school ON student_profiles(LOWER(school_name))`,
      `CREATE INDEX IF NOT EXISTS idx_academic_records_student ON academic_records(student_id, created_at DESC)`,
      `CREATE INDEX IF NOT EXISTS idx_sponsorships_student ON sponsorships(student_id, created_at DESC)`,
      `CREATE INDEX IF NOT EXISTS idx_sponsorships_status ON sponsorships(status)`,
      `CREATE INDEX IF NOT EXISTS idx_beneficiary_documents_student ON beneficiary_documents(student_id, created_at DESC)`,
      `CREATE INDEX IF NOT EXISTS idx_beneficiary_activity_student ON beneficiary_activity_logs(student_id, created_at DESC)`,
    ];

    for (const stmt of beneficiaryIndexes) {
      try { await client.query(stmt); } catch { /* already exists */ }
    }
    console.log('  ✅  Beneficiary/student management tables ensured');

    // ── STEP 5: Ensure activity_logs table exists ──────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS activity_logs (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
        user_role   VARCHAR(20),
        user_name   VARCHAR(255),
        action      VARCHAR(100) NOT NULL,
        entity_type VARCHAR(50),
        entity_id   VARCHAR(255),
        details     JSONB,
        ip_address  VARCHAR(45),
        created_at  TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    console.log('  ✅  activity_logs table ensured');

    // ── STEP 6: Ensure beneficiaries table exists ──────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS beneficiaries (
        id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name       VARCHAR(255) NOT NULL,
        email      VARCHAR(255) NOT NULL,
        phone      VARCHAR(50),
        status     VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
        notes      TEXT,
        deleted_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    console.log('  ✅  beneficiaries table ensured');

    console.log('\n✨  Migration completed successfully.\n');

  } catch (err) {
    console.error('\n❌  Migration failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
