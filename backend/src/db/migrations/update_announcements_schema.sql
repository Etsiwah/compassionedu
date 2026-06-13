-- ============================================================
-- Migration: Update Announcements Schema
-- Purpose: Fix targeted delivery, add edit/delete tracking, and add replies table
-- Requirements: REQ-1 (Fix Targeted Delivery), REQ-2 (Remove Unused Groups)
-- Design Reference: Section 1.1, 1.2
-- ============================================================

-- ============================================================
-- STEP 1: Update announcements table - Fix target_role constraint
-- Remove 'teacher', 'parent', 'all' and add 'everyone', keep 'staff', 'student'
-- ============================================================

-- Drop old constraint
ALTER TABLE announcements
DROP CONSTRAINT IF EXISTS announcements_target_role_check;

-- Add new constraint with correct roles: 'everyone', 'staff', 'student'
ALTER TABLE announcements
ADD CONSTRAINT announcements_target_role_check
CHECK (target_role IN ('everyone', 'staff', 'student'));

-- ============================================================
-- STEP 2: Add columns for edit/delete tracking
-- ============================================================

-- Add updated_at timestamp for edit tracking
ALTER TABLE announcements
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

-- Add updated_by to track who made the edit
ALTER TABLE announcements
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES users(id);

-- Add deleted_at for soft delete functionality
ALTER TABLE announcements
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- ============================================================
-- STEP 3: Create index for soft deletes
-- Improves query performance when filtering out deleted announcements
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_announcements_deleted_at 
ON announcements(deleted_at)
WHERE deleted_at IS NULL;

-- ============================================================
-- STEP 4: Create announcement_replies table
-- Stores user replies to announcements from staff and students
-- ============================================================

CREATE TABLE IF NOT EXISTS announcement_replies (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  announcement_id UUID NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_role       VARCHAR(20) NOT NULL CHECK (user_role IN ('staff', 'student')),
  reply_message   TEXT NOT NULL CHECK (LENGTH(TRIM(reply_message)) > 0),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- STEP 5: Create indexes on announcement_replies for performance
-- ============================================================

-- Index for fetching all replies for a specific announcement
CREATE INDEX IF NOT EXISTS idx_announcement_replies_announcement 
ON announcement_replies(announcement_id);

-- Index for fetching all replies by a specific user
CREATE INDEX IF NOT EXISTS idx_announcement_replies_user 
ON announcement_replies(user_id);

-- Index for sorting replies by creation date (most recent first)
CREATE INDEX IF NOT EXISTS idx_announcement_replies_created 
ON announcement_replies(created_at DESC);
