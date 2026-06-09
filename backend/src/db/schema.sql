-- CompassionEdu School Management System
-- PostgreSQL Schema — 14 tables
-- Run via: node src/db/migrate.js

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- Table 1: users
-- Core identity table for all roles (admin, student, teacher, parent)
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role          VARCHAR(20) NOT NULL CHECK (role IN ('admin','student','teacher','parent','staff')),
  name          VARCHAR(255) NOT NULL,
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  school_level  VARCHAR(100),
  location      VARCHAR(255),
  is_active     BOOLEAN DEFAULT TRUE,
  deleted_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- Table 2: refresh_tokens
-- Server-side refresh token store for JWT re-issuance
-- ============================================================
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- Table 3: profile_photos
-- Multiple photos per user, one designated as default
-- ============================================================
CREATE TABLE IF NOT EXISTS profile_photos (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES users(id) ON DELETE CASCADE,
  url        TEXT NOT NULL,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- Table 4: student_profiles
-- Extended profile data for students (CV, skills, project count)
-- ============================================================
CREATE TABLE IF NOT EXISTS student_profiles (
  user_id         UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  cv_url          TEXT,
  project_numbers INT DEFAULT 0,
  skills          TEXT[] DEFAULT '{}',
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- Table 5: parent_student_links
-- Many-to-many: a parent can have multiple children and vice versa
-- ============================================================
CREATE TABLE IF NOT EXISTS parent_student_links (
  parent_id  UUID REFERENCES users(id) ON DELETE CASCADE,
  student_id UUID REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (parent_id, student_id)
);

-- ============================================================
-- Table 6: teacher_class_assignments
-- Maps teachers to the classes/subjects they are responsible for
-- ============================================================
CREATE TABLE IF NOT EXISTS teacher_class_assignments (
  teacher_id UUID REFERENCES users(id) ON DELETE CASCADE,
  class_name VARCHAR(100) NOT NULL,
  subject    VARCHAR(100),
  PRIMARY KEY (teacher_id, class_name, subject)
);

-- ============================================================
-- Table 7: fees
-- Fee obligations per student with status and optional payment plan
-- ============================================================
CREATE TABLE IF NOT EXISTS fees (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id   UUID REFERENCES users(id) ON DELETE CASCADE,
  amount       NUMERIC(10,2) NOT NULL,
  due_date     DATE NOT NULL,
  status       VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('paid','pending','overdue')),
  payment_plan JSONB,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- Table 8: fee_payments
-- Individual payment transactions linked to a fee record
-- ============================================================
CREATE TABLE IF NOT EXISTS fee_payments (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fee_id         UUID REFERENCES fees(id) ON DELETE CASCADE,
  amount_paid    NUMERIC(10,2) NOT NULL,
  paid_at        TIMESTAMPTZ DEFAULT NOW(),
  transaction_id VARCHAR(255),
  receipt_ref    VARCHAR(255)
);

-- ============================================================
-- Table 9: results
-- Examination results per student, subject, and term
-- ============================================================
CREATE TABLE IF NOT EXISTS results (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES users(id) ON DELETE CASCADE,
  subject    VARCHAR(100) NOT NULL,
  marks      NUMERIC(5,2) NOT NULL CHECK (marks >= 0 AND marks <= 100),
  grade      VARCHAR(5),
  term       VARCHAR(50) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- Table 10: attendance
-- Daily or period-level attendance records per student
-- ============================================================
CREATE TABLE IF NOT EXISTS attendance (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES users(id) ON DELETE CASCADE,
  date       DATE NOT NULL,
  subject    VARCHAR(100),
  period     VARCHAR(50),
  status     VARCHAR(20) NOT NULL CHECK (status IN ('present','absent','late')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- Table 11: experiences
-- Portfolio experience entries (jobs, internships, volunteering)
-- ============================================================
CREATE TABLE IF NOT EXISTS experiences (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id   UUID REFERENCES users(id) ON DELETE CASCADE,
  title        VARCHAR(255) NOT NULL,
  organization VARCHAR(255),
  start_date   DATE NOT NULL,
  end_date     DATE,
  description  TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- Table 12: portfolio_media
-- Project gallery media (images, videos) with moderation status
-- ============================================================
CREATE TABLE IF NOT EXISTS portfolio_media (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id        UUID REFERENCES users(id) ON DELETE CASCADE,
  url               TEXT NOT NULL,
  mime_type         VARCHAR(100) NOT NULL,
  title             VARCHAR(255),
  description       TEXT,
  moderation_status VARCHAR(20) DEFAULT 'pending' CHECK (moderation_status IN ('pending','approved','flagged')),
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- Table 13: announcements
-- System-wide or role-targeted announcements created by admins
-- ============================================================
CREATE TABLE IF NOT EXISTS announcements (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title       VARCHAR(255) NOT NULL,
  content     TEXT NOT NULL,
  target_role VARCHAR(20) NOT NULL CHECK (target_role IN ('all','student','teacher','parent')),
  created_by  UUID REFERENCES users(id),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- Table 14: announcement_reads
-- Tracks which users have read which announcements
-- ============================================================
CREATE TABLE IF NOT EXISTS announcement_reads (
  announcement_id UUID REFERENCES announcements(id) ON DELETE CASCADE,
  user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
  read_at         TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (announcement_id, user_id)
);

-- ============================================================
-- Table 15: beneficiaries
-- Admin-managed beneficiary records (independent of user accounts)
-- ============================================================
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
);

CREATE INDEX IF NOT EXISTS idx_beneficiaries_status ON beneficiaries(status);
CREATE INDEX IF NOT EXISTS idx_beneficiaries_email  ON beneficiaries(LOWER(email));

-- ============================================================
-- Staff extensions — additive columns on users table
-- ============================================================
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone          VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS staff_role     VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at  TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS account_source VARCHAR(20) DEFAULT 'self_registered'
  CHECK (account_source IN ('admin_added','self_registered'));

CREATE INDEX IF NOT EXISTS idx_users_staff_role ON users(staff_role) WHERE role = 'staff';

-- ============================================================
-- Extended student profile fields (additive columns on student_profiles)
-- ============================================================
ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS age               INT;
ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS gender            VARCHAR(20);
ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS date_of_birth     DATE;
ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS phone             VARCHAR(50);
ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS address           TEXT;
ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS school_name       VARCHAR(255);
ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS level             VARCHAR(100);
ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS program           VARCHAR(255);
ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS department        VARCHAR(255);
ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS class_year        VARCHAR(100);
ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS enrollment_date   DATE;
ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS student_id_number VARCHAR(100);
ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS father_name       VARCHAR(255);
ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS mother_name       VARCHAR(255);
ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS parent_phone      VARCHAR(50);
ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS parent_email      VARCHAR(255);
ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS emergency_name    VARCHAR(255);
ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS emergency_phone   VARCHAR(50);
ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS emergency_relation VARCHAR(100);
ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS nationality       VARCHAR(100);
ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS gps_location      VARCHAR(255);
ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS religion          VARCHAR(100);
ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS disability_status VARCHAR(255);
ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS project_number    VARCHAR(100);
ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS graduation_year   INT;
ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS region            VARCHAR(150);
ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS district          VARCHAR(150);
ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS academic_documents JSONB DEFAULT '[]'::jsonb;

-- ============================================================
-- Beneficiary/student management extensions
-- Beneficiary and Student are the same entity, these tables hang
-- from users.id where users.role = 'student'.
-- ============================================================
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
);

CREATE TABLE IF NOT EXISTS academic_records (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  institution         VARCHAR(255),
  educational_level   VARCHAR(100),
  class_year          VARCHAR(100),
  program_course      VARCHAR(255),
  student_index_number VARCHAR(100),
  term                VARCHAR(100),
  academic_year       VARCHAR(50),
  result_summary      TEXT,
  grades              JSONB DEFAULT '[]'::jsonb,
  performance_notes   TEXT,
  attendance_summary  TEXT,
  graduation_year     INT,
  document_url        TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

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
);

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
);

CREATE TABLE IF NOT EXISTS beneficiary_health (
  student_id               UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  medical_conditions       TEXT,
  allergies                TEXT,
  health_insurance_details TEXT,
  special_needs            TEXT,
  counseling_notes         TEXT,
  welfare_notes            TEXT,
  updated_at               TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS beneficiary_activity_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  actor_id      UUID REFERENCES users(id) ON DELETE SET NULL,
  activity_type VARCHAR(100) NOT NULL,
  title         VARCHAR(255) NOT NULL,
  description   TEXT,
  metadata      JSONB DEFAULT '{}'::jsonb,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_student_profiles_project_number ON student_profiles(LOWER(project_number));
CREATE INDEX IF NOT EXISTS idx_student_profiles_student_id_number ON student_profiles(LOWER(student_id_number));
CREATE INDEX IF NOT EXISTS idx_student_profiles_level ON student_profiles(level);
CREATE INDEX IF NOT EXISTS idx_student_profiles_school ON student_profiles(LOWER(school_name));
CREATE INDEX IF NOT EXISTS idx_academic_records_student ON academic_records(student_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sponsorships_student ON sponsorships(student_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sponsorships_status ON sponsorships(status);
CREATE INDEX IF NOT EXISTS idx_beneficiary_documents_student ON beneficiary_documents(student_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_beneficiary_activity_student ON beneficiary_activity_logs(student_id, created_at DESC);

-- ============================================================
-- Table 16: activity_logs
-- Audit trail for all significant user actions
-- ============================================================
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
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_user    ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action  ON activity_logs(action);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created ON activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_role    ON activity_logs(user_role);

-- ============================================================
-- Table 17: notifications
-- Per-user in-app notifications used by the notification bell
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES users(id) ON DELETE CASCADE,
  type       VARCHAR(80) NOT NULL DEFAULT 'general',
  title      VARCHAR(255) NOT NULL,
  message    TEXT NOT NULL,
  link       TEXT,
  is_read    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, is_read, created_at DESC);

-- ============================================================
-- Indexes for common query patterns
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_users_email        ON users(LOWER(email));
CREATE INDEX IF NOT EXISTS idx_users_role         ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_deleted_at   ON users(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_fees_student_id    ON fees(student_id);
CREATE INDEX IF NOT EXISTS idx_fees_status        ON fees(status);
CREATE INDEX IF NOT EXISTS idx_fees_due_date      ON fees(due_date);
CREATE INDEX IF NOT EXISTS idx_results_student_id ON results(student_id);
CREATE INDEX IF NOT EXISTS idx_results_term       ON results(term);
CREATE INDEX IF NOT EXISTS idx_attendance_student ON attendance(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date    ON attendance(date);
CREATE INDEX IF NOT EXISTS idx_experiences_student ON experiences(student_id, start_date);
CREATE INDEX IF NOT EXISTS idx_portfolio_media_student ON portfolio_media(student_id);
CREATE INDEX IF NOT EXISTS idx_announcements_role ON announcements(target_role);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id);

-- ============================================================
-- Table 17: staff_profiles
-- Extended profile data for staff members (bio, portfolio, CV, etc.)
-- ============================================================
CREATE TABLE IF NOT EXISTS staff_profiles (
  user_id       UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  bio           TEXT,
  portfolio_url TEXT,
  portfolio_status VARCHAR(20) DEFAULT 'pending',
  cv_url        TEXT,
  cv_status     VARCHAR(20) DEFAULT 'pending',
  age           INT,
  date_of_birth DATE,
  gender        VARCHAR(20),
  phone         VARCHAR(50),
  department    VARCHAR(255),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- Platform Improvements: users table additions
-- ============================================================
ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active'
  CHECK (status IN ('pending','active','rejected'));
ALTER TABLE users ADD COLUMN IF NOT EXISTS force_password_change BOOLEAN DEFAULT FALSE;

-- ============================================================
-- Platform Improvements: announcements target_role constraint fix
-- ============================================================
ALTER TABLE announcements DROP CONSTRAINT IF EXISTS announcements_target_role_check;
ALTER TABLE announcements ADD CONSTRAINT announcements_target_role_check
  CHECK (target_role IN ('all','student','teacher','parent','staff'));

-- ============================================================
-- Table 18: staff_work_reports
-- Daily work reports submitted by staff members
-- ============================================================
CREATE TABLE IF NOT EXISTS staff_work_reports (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  report_date DATE NOT NULL,
  content     TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_work_reports_staff ON staff_work_reports(staff_id);
CREATE INDEX IF NOT EXISTS idx_work_reports_date  ON staff_work_reports(report_date DESC);

-- ============================================================
-- Table 19: file_ownership
-- Maps uploaded filenames to the user who uploaded them
-- ============================================================
CREATE TABLE IF NOT EXISTS file_ownership (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filename    VARCHAR(255) UNIQUE NOT NULL,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  context     VARCHAR(100)
);
CREATE INDEX IF NOT EXISTS idx_file_ownership_user ON file_ownership(user_id);

-- ============================================================
-- Table 20: notifications
-- In-app notifications for admins (new registrations, file uploads)
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type       VARCHAR(50) NOT NULL,
  message    TEXT NOT NULL,
  is_read    BOOLEAN DEFAULT FALSE,
  entity_id  UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notifications_user    ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread  ON notifications(user_id, is_read) WHERE is_read = FALSE;
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);

-- ============================================================
-- Table 21: student_health_records
-- Health records uploaded by students (insurance cards, hospital bills)
-- ============================================================
CREATE TABLE IF NOT EXISTS student_health_records (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id   UUID REFERENCES users(id) ON DELETE CASCADE,
  record_type  VARCHAR(50) NOT NULL CHECK (record_type IN ('insurance_card', 'hospital_bill', 'other')),
  file_url     TEXT NOT NULL,
  description  TEXT,
  status       VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_notes  TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_health_records_student ON student_health_records(student_id);
CREATE INDEX IF NOT EXISTS idx_health_records_status  ON student_health_records(status);
