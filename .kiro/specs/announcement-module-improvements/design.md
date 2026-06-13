# Technical Design Document

## Overview

This document provides the technical design for enhancing the Admin Announcement system with six major improvements: fixing targeted announcement delivery, removing unused target groups, enabling announcement management (edit/delete), preventing self-notifications, implementing a reply system, and adding email notifications.

## System Context

### Existing Components
- **Backend**: Node.js/Express API with PostgreSQL database
- **Frontend**: React application with admin, staff, and student portals
- **Authentication**: JWT-based auth with role-based access control (admin, staff, student, teacher, parent)
- **Notification System**: In-app notification infrastructure (partially implemented)
- **Email Service**: Needs integration (SMTP/SendGrid/AWS SES)

### Current Announcement System
- **Database Table**: `announcements` with columns: id, title, content, target_role, created_by, created_at
- **Target Roles**: 'all', 'student', 'teacher', 'parent' (currently includes unused roles)
- **Service**: `announcementsService.js` with create, get, and mark-as-read functions
- **Known Issue**: Targeted announcements to 'student' or 'staff' not delivered correctly

---

## 1. Database Schema Changes

### 1.1 Update `announcements` Table

**Problem**: Current target_role CHECK constraint includes 'teacher' and 'parent' (unused), missing 'staff', and uses 'all' instead of 'everyone'.

**Solution**: Update constraint and add columns for edit tracking.

```sql
-- Drop old constraint
ALTER TABLE announcements
DROP CONSTRAINT IF EXISTS announcements_target_role_check;

-- Add new constraint with correct roles
ALTER TABLE announcements
ADD CONSTRAINT announcements_target_role_check
CHECK (target_role IN ('everyone', 'staff', 'student'));

-- Add columns for edit/delete tracking
ALTER TABLE announcements
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Create index for soft deletes
CREATE INDEX IF NOT EXISTS idx_announcements_deleted_at ON announcements(deleted_at)
WHERE deleted_at IS NULL;
```

### 1.2 Create `announcement_replies` Table

**Purpose**: Store user replies to announcements.

```sql
CREATE TABLE IF NOT EXISTS announcement_replies (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  announcement_id UUID NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_role       VARCHAR(20) NOT NULL CHECK (user_role IN ('staff', 'student')),
  reply_message   TEXT NOT NULL CHECK (LENGTH(TRIM(reply_message)) > 0),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);


-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_announcement_replies_announcement ON announcement_replies(announcement_id);
CREATE INDEX IF NOT EXISTS idx_announcement_replies_user ON announcement_replies(user_id);
CREATE INDEX IF NOT EXISTS idx_announcement_replies_created ON announcement_replies(created_at DESC);
```

### 1.3 Update `VALID_ROLES` in Service Layer

**File**: `backend/src/services/announcementsService.js`

**Change**:
```javascript
// OLD
const VALID_ROLES = ['all', 'student', 'teacher', 'parent', 'staff'];

// NEW
const VALID_ROLES = ['everyone', 'staff', 'student'];
```

---

## 2. Backend Architecture

### 2.1 Enhanced Announcements Service

**File**: `backend/src/services/announcementsService.js`

#### 2.1.1 Fix `getAnnouncementsForUser()` - Targeted Delivery

**Problem**: Current query uses `target_role = $2` which only matches exact role. Doesn't handle 'everyone' properly.

**Solution**:
```javascript
async function getAnnouncementsForUser(userId, role) {
  const { rows } = await pool.query(
    `SELECT a.id, a.title, a.content, a.target_role, a.created_by, a.created_at, a.updated_at,
            u.name as created_by_name,
            CASE WHEN ar.user_id IS NOT NULL THEN true ELSE false END AS is_read
     FROM announcements a
     LEFT JOIN users u ON u.id = a.created_by
     LEFT JOIN announcement_reads ar ON ar.announcement_id = a.id AND ar.user_id = $1
     WHERE a.deleted_at IS NULL
       AND (a.target_role = 'everyone' OR a.target_role = $2)
     ORDER BY a.created_at DESC`,
    [userId, role]
  );
  return rows;
}
```

**Key Changes**:
- Added `deleted_at IS NULL` filter for soft deletes
- Changed logic to check for 'everyone' OR matching role
- Added creator name join
- Added updated_at for edit tracking

#### 2.1.2 Enhanced `createAnnouncement()` - Prevent Self-Notifications

```javascript
async function createAnnouncement(data, emailService) {
  const { title, content, target_role, created_by } = data;
  
  // Validation
  if (!title || !content || !target_role) {
    const err = new Error('title, content, and target_role are required');
    err.status = 400;
    throw err;
  }
  if (!VALID_ROLES.includes(target_role)) {
    const err = new Error(`target_role must be one of: ${VALID_ROLES.join(', ')}`);
    err.status = 422;
    throw err;
  }

  // Create announcement
  const { rows } = await pool.query(
    `INSERT INTO announcements (title, content, target_role, created_by)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [title, content, target_role, created_by]
  );
  const announcement = rows[0];

  // Get recipients excluding creator
  const recipients = await getRecipients(target_role, created_by);

  // Create in-app notifications for recipients
  await createNotificationsForRecipients(announcement.id, recipients);

  // Send emails to recipients
  if (emailService) {
    await emailService.sendAnnouncementEmails(announcement, recipients);
  }

  return announcement;
}
```

#### 2.1.3 New `getRecipients()` Helper

```javascript
async function getRecipients(targetRole, creatorId) {
  let roleConditions = '';
  
  if (targetRole === 'everyone') {
    roleConditions = "role IN ('staff', 'student')";
  } else if (targetRole === 'staff') {
    roleConditions = "role = 'staff'";
  } else if (targetRole === 'student') {
    roleConditions = "role = 'student'";
  }

  const { rows } = await pool.query(
    `SELECT id, email, name, role
     FROM users
     WHERE ${roleConditions}
       AND is_active = TRUE
       AND deleted_at IS NULL
       AND id != $1`,
    [creatorId]
  );

  return rows;
}
```


#### 2.1.4 New `updateAnnouncement()` Function

```javascript
async function updateAnnouncement(id, data, updatedBy) {
  const { title, content, target_role } = data;
  
  // Validation
  if (target_role && !VALID_ROLES.includes(target_role)) {
    const err = new Error(`target_role must be one of: ${VALID_ROLES.join(', ')}`);
    err.status = 422;
    throw err;
  }

  // Build update query dynamically
  const updates = [];
  const values = [];
  let paramCount = 1;

  if (title !== undefined) {
    updates.push(`title = $${paramCount++}`);
    values.push(title);
  }
  if (content !== undefined) {
    updates.push(`content = $${paramCount++}`);
    values.push(content);
  }
  if (target_role !== undefined) {
    updates.push(`target_role = $${paramCount++}`);
    values.push(target_role);
  }

  updates.push(`updated_at = NOW()`);
  updates.push(`updated_by = $${paramCount++}`);
  values.push(updatedBy);
  values.push(id);

  const { rows } = await pool.query(
    `UPDATE announcements
     SET ${updates.join(', ')}
     WHERE id = $${paramCount} AND deleted_at IS NULL
     RETURNING *`,
    values
  );

  if (rows.length === 0) {
    const err = new Error('Announcement not found');
    err.status = 404;
    throw err;
  }

  return rows[0];
}
```

#### 2.1.5 New `deleteAnnouncement()` Function (Soft Delete)

```javascript
async function deleteAnnouncement(id) {
  const { rows } = await pool.query(
    `UPDATE announcements
     SET deleted_at = NOW()
     WHERE id = $1 AND deleted_at IS NULL
     RETURNING *`,
    [id]
  );

  if (rows.length === 0) {
    const err = new Error('Announcement not found');
    err.status = 404;
    throw err;
  }

  // Invalidate related notifications (optional)
  await pool.query(
    `DELETE FROM announcement_reads WHERE announcement_id = $1`,
    [id]
  );

  return rows[0];
}
```

### 2.2 New Reply Service

**File**: `backend/src/services/replyService.js`

```javascript
'use strict';

const pool = require('../db/pool');

/**
 * Check if user can reply to announcement (must be a recipient)
 */
async function canReply(announcementId, userId, userRole) {
  const { rows } = await pool.query(
    `SELECT target_role FROM announcements
     WHERE id = $1 AND deleted_at IS NULL`,
    [announcementId]
  );

  if (rows.length === 0) return false;

  const { target_role } = rows[0];
  
  // Admin cannot reply
  if (userRole === 'admin') return false;

  // Check if user role matches target
  if (target_role === 'everyone') return userRole === 'staff' || userRole === 'student';
  if (target_role === 'staff') return userRole === 'staff';
  if (target_role === 'student') return userRole === 'student';

  return false;
}

/**
 * Create a reply to an announcement
 */
async function createReply(data) {
  const { announcement_id, user_id, user_role, reply_message } = data;

  // Validate
  if (!announcement_id || !user_id || !user_role || !reply_message) {
    const err = new Error('announcement_id, user_id, user_role, and reply_message are required');
    err.status = 400;
    throw err;
  }


  if (reply_message.trim().length === 0) {
    const err = new Error('Reply message cannot be empty');
    err.status = 400;
    throw err;
  }

  // Check permission
  const canUserReply = await canReply(announcement_id, user_id, user_role);
  if (!canUserReply) {
    const err = new Error('You do not have permission to reply to this announcement');
    err.status = 403;
    throw err;
  }

  // Insert reply
  const { rows } = await pool.query(
    `INSERT INTO announcement_replies (announcement_id, user_id, user_role, reply_message)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [announcement_id, user_id, user_role, reply_message]
  );

  // Notify all admins
  await notifyAdminsOfReply(rows[0]);

  return rows[0];
}

/**
 * Get all replies for admin panel
 */
async function getAllReplies(filters = {}) {
  let whereConditions = [];
  let values = [];
  let paramCount = 1;

  if (filters.announcement_id) {
    whereConditions.push(`ar.announcement_id = $${paramCount++}`);
    values.push(filters.announcement_id);
  }

  if (filters.user_role) {
    whereConditions.push(`ar.user_role = $${paramCount++}`);
    values.push(filters.user_role);
  }

  const whereClause = whereConditions.length > 0
    ? `WHERE ${whereConditions.join(' AND ')}`
    : '';

  const { rows } = await pool.query(
    `SELECT ar.id, ar.announcement_id, ar.user_id, ar.user_role, ar.reply_message, ar.created_at,
            a.title as announcement_title,
            u.name as user_name, u.email as user_email
     FROM announcement_replies ar
     JOIN announcements a ON a.id = ar.announcement_id
     JOIN users u ON u.id = ar.user_id
     ${whereClause}
     ORDER BY ar.created_at DESC
     LIMIT 100`,
    values
  );

  return rows;
}

/**
 * Notify all admins when a reply is submitted
 */
async function notifyAdminsOfReply(reply) {
  // Get announcement title and user name
  const { rows: details } = await pool.query(
    `SELECT a.title, u.name
     FROM announcements a, users u
     WHERE a.id = $1 AND u.id = $2`,
    [reply.announcement_id, reply.user_id]
  );

  if (details.length === 0) return;

  const { title, name } = details[0];
  const messagePreview = reply.reply_message.substring(0, 50) + (reply.reply_message.length > 50 ? '...' : '');

  // Get all admins
  const { rows: admins } = await pool.query(
    `SELECT id FROM users WHERE role = 'admin' AND is_active = TRUE AND deleted_at IS NULL`
  );

  // Create notifications for each admin (use existing notification system)
  // This would integrate with your notification service
  // For now, placeholder logic:
  const notificationService = require('./notificationService');
  await notificationService.notifyAdmins(
    'announcement_reply',
    `${name} replied to "${title}": ${messagePreview}`,
    reply.id
  );
}

module.exports = { createReply, getAllReplies, canReply };
```


### 2.3 Email Service

**File**: `backend/src/services/emailService.js` (NEW)

```javascript
'use strict';

const nodemailer = require('nodemailer'); // or SendGrid, AWS SES

// Configure email transporter
const transporter = nodemailer.createTransporter({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

/**
 * Send announcement emails to recipients
 */
async function sendAnnouncementEmails(announcement, recipients) {
  const { id, title, content, created_by } = announcement;

  // Get creator name
  const pool = require('../db/pool');
  const { rows } = await pool.query(
    `SELECT name FROM users WHERE id = $1`,
    [created_by]
  );
  const creatorName = rows.length > 0 ? rows[0].name : 'Administrator';

  // Build email content
  const subject = `New Announcement: ${title}`;
  const viewLink = `${process.env.FRONTEND_URL}/announcements/${id}`;

  const htmlBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>New Announcement from ${creatorName}</h2>
      <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin-top: 0;">${title}</h3>
        <p>${content.replace(/\n/g, '<br>')}</p>
      </div>
      <p style="color: #666; font-size: 14px;">
        Posted on: ${new Date(announcement.created_at).toLocaleString()}
      </p>
      <a href="${viewLink}" 
         style="display: inline-block; background: #f97316; color: white; padding: 12px 24px; 
                text-decoration: none; border-radius: 6px; margin-top: 10px;">
        View in System
      </a>
      <p style="margin-top: 30px; color: #999; font-size: 12px; border-top: 1px solid #ddd; padding-top: 20px;">
        CompassionEdu School Management System<br>
        This is an automated message. Please do not reply to this email.
      </p>
    </div>
  `;

  // Remove duplicates and exclude empty emails
  const uniqueEmails = [...new Set(recipients.map(r => r.email))].filter(e => e);

  // Send emails in batches (to avoid rate limits)
  const BATCH_SIZE = 50;
  for (let i = 0; i < uniqueEmails.length; i += BATCH_SIZE) {
    const batch = uniqueEmails.slice(i, i + BATCH_SIZE);
    
    await Promise.allSettled(
      batch.map(email =>
        transporter.sendMail({
          from: `"CompassionEdu" <${process.env.SMTP_FROM || 'noreply@compassionedu.com'}>`,
          to: email,
          subject: subject,
          html: htmlBody
        })
      )
    );

    // Small delay between batches
    if (i + BATCH_SIZE < uniqueEmails.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  console.log(`Sent announcement emails to ${uniqueEmails.length} recipients`);
}

module.exports = { sendAnnouncementEmails };
```

---

## 3. API Endpoints

### 3.1 Existing Endpoint Updates

**File**: `backend/src/routes/announcements.js` (or create if doesn't exist)


```javascript
const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/requireAuth');
const requireRole = require('../middleware/requireRole');
const announcementService = require('../services/announcementsService');
const replyService = require('../services/replyService');
const emailService = require('../services/emailService');

/**
 * GET /api/announcements
 * Get all announcements for the authenticated user
 */
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const announcements = await announcementService.getAnnouncementsForUser(
      req.user.sub,
      req.user.role
    );
    res.json(announcements);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/announcements
 * Create a new announcement (Admin only)
 */
router.post('/', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const announcement = await announcementService.createAnnouncement(
      { ...req.body, created_by: req.user.sub },
      emailService
    );
    res.status(201).json(announcement);
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/announcements/:id
 * Update an existing announcement (Admin only)
 */
router.put('/:id', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const announcement = await announcementService.updateAnnouncement(
      req.params.id,
      req.body,
      req.user.sub
    );
    res.json(announcement);
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/announcements/:id
 * Delete an announcement (Admin only, soft delete)
 */
router.delete('/:id', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    await announcementService.deleteAnnouncement(req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/announcements/:id/replies
 * Submit a reply to an announcement (Staff/Students only)
 */
router.post('/:id/replies', requireAuth, requireRole('staff', 'student'), async (req, res, next) => {
  try {
    const reply = await replyService.createReply({
      announcement_id: req.params.id,
      user_id: req.user.sub,
      user_role: req.user.role,
      reply_message: req.body.reply_message
    });
    res.status(201).json(reply);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/announcements/replies
 * Get all announcement replies (Admin only)
 */
router.get('/replies', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const filters = {
      announcement_id: req.query.announcement_id,
      user_role: req.query.user_role
    };
    const replies = await replyService.getAllReplies(filters);
    res.json(replies);
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/announcements/:id/read
 * Mark announcement as read
 */
router.patch('/:id/read', requireAuth, async (req, res, next) => {
  try {
    await announcementService.markAsRead(req.params.id, req.user.sub);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

module.exports = router;
```


---

## 4. Frontend Components

### 4.1 Admin Announcement List Component

**File**: `frontend/src/pages/admin/AnnouncementsSection.jsx` (Update existing)

**Key Features**:
- Display list of announcements with Edit/Delete buttons
- Confirmation dialog for deletion
- Form for creating/editing announcements
- Target group dropdown with only Everyone/Staff/Students options

**Component Structure**:
```jsx
import { useState, useEffect } from 'react';
import api from '../../utils/api';
import useAuth from '../../hooks/useAuth';

export default function AnnouncementsSection() {
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [form, setForm] = useState({
    title: '',
    content: '',
    target_role: 'everyone'
  });

  // Load announcements
  useEffect(() => {
    loadAnnouncements();
  }, []);

  async function loadAnnouncements() {
    try {
      const { data } = await api.get('/announcements');
      setAnnouncements(data);
    } catch (err) {
      console.error('Failed to load announcements', err);
    }
  }

  // Handle create/update
  async function handleSubmit(e) {
    e.preventDefault();
    try {
      if (editingId) {
        await api.put(`/announcements/${editingId}`, form);
      } else {
        await api.post('/announcements', form);
      }
      setShowForm(false);
      setEditingId(null);
      setForm({ title: '', content: '', target_role: 'everyone' });
      loadAnnouncements();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to save announcement');
    }
  }

  // Handle edit
  function startEdit(announcement) {
    setForm({
      title: announcement.title,
      content: announcement.content,
      target_role: announcement.target_role
    });
    setEditingId(announcement.id);
    setShowForm(true);
  }

  // Handle delete
  async function confirmDelete() {
    try {
      await api.delete(`/announcements/${deleteConfirm}`);
      setDeleteConfirm(null);
      loadAnnouncements();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete announcement');
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-white">Announcements</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
        >
          {showForm ? 'Cancel' : 'Create Announcement'}
        </button>
      </div>

      {/* Create/Edit Form */}
      {showForm && (
        <div className="bg-white/5 p-6 rounded-xl mb-6">
          <h3 className="text-lg font-semibold text-white mb-4">
            {editingId ? 'Edit Announcement' : 'New Announcement'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-white/70 mb-2">Title</label>
              <input
                type="text"
                value={form.title}
                onChange={e => setForm({...form, title: e.target.value})}
                required
                className="w-full px-4 py-2 rounded-lg bg-white/10 text-white border border-white/20"
              />
            </div>
            <div>
              <label className="block text-white/70 mb-2">Target Audience</label>
              <select
                value={form.target_role}
                onChange={e => setForm({...form, target_role: e.target.value})}
                className="w-full px-4 py-2 rounded-lg bg-white/10 text-white border border-white/20"
              >
                <option value="everyone">Everyone</option>
                <option value="staff">Staff Only</option>
                <option value="student">Students Only</option>
              </select>
            </div>
            <div>
              <label className="block text-white/70 mb-2">Content</label>
              <textarea
                value={form.content}
                onChange={e => setForm({...form, content: e.target.value})}
                required
                rows={6}
                className="w-full px-4 py-2 rounded-lg bg-white/10 text-white border border-white/20"
              />
            </div>
            <button
              type="submit"
              className="px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
            >
              {editingId ? 'Update' : 'Create'} Announcement
            </button>
          </form>
        </div>
      )}


      {/* Announcements List */}
      <div className="space-y-4">
        {announcements.map(announcement => (
          <div key={announcement.id} className="bg-white/5 p-6 rounded-xl">
            <div className="flex justify-between items-start mb-2">
              <h3 className="text-lg font-semibold text-white">{announcement.title}</h3>
              <div className="flex gap-2">
                <button
                  onClick={() => startEdit(announcement)}
                  className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
                >
                  Edit
                </button>
                <button
                  onClick={() => setDeleteConfirm(announcement.id)}
                  className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-sm"
                >
                  Delete
                </button>
              </div>
            </div>
            <div className="text-sm text-white/50 mb-2">
              To: <span className="capitalize">{announcement.target_role}</span> | 
              {' '}{new Date(announcement.created_at).toLocaleDateString()}
            </div>
            <p className="text-white/80">{announcement.content}</p>
          </div>
        ))}
      </div>

      {/* Delete Confirmation Dialog */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-900 p-6 rounded-xl max-w-md">
            <h3 className="text-xl font-bold text-white mb-4">Confirm Delete</h3>
            <p className="text-white/70 mb-6">
              Are you sure you want to delete this announcement? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={confirmDelete}
                className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
              >
                Delete
              </button>
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

### 4.2 Reply Component (Staff/Student View)

**File**: `frontend/src/components/AnnouncementReply.jsx` (NEW)

```jsx
import { useState } from 'react';
import api from '../utils/api';

export default function AnnouncementReply({ announcementId, onSuccess }) {
  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post(`/announcements/${announcementId}/replies`, {
        reply_message: message
      });
      setMessage('');
      setShowForm(false);
      if (onSuccess) onSuccess();
      alert('Reply submitted successfully!');
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to submit reply');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mt-4">
      {!showForm ? (
        <button
          onClick={() => setShowForm(true)}
          className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 text-sm"
        >
          Reply
        </button>
      ) : (
        <form onSubmit={handleSubmit} className="bg-white/10 p-4 rounded-lg">
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder="Type your reply..."
            required
            rows={3}
            className="w-full px-3 py-2 rounded bg-white/10 text-white border border-white/20 mb-2"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 text-sm disabled:opacity-50"
            >
              {submitting ? 'Sending...' : 'Submit Reply'}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-500 text-sm"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
```


### 4.3 Admin Reply Management Panel

**File**: `frontend/src/pages/admin/AnnouncementRepliesSection.jsx` (NEW)

```jsx
import { useState, useEffect } from 'react';
import api from '../../utils/api';

export default function AnnouncementRepliesSection() {
  const [replies, setReplies] = useState([]);
  const [filter, setFilter] = useState({ role: '', announcement_id: '' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReplies();
  }, [filter]);

  async function loadReplies() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter.role) params.append('user_role', filter.role);
      if (filter.announcement_id) params.append('announcement_id', filter.announcement_id);
      
      const { data } = await api.get(`/announcements/replies?${params}`);
      setReplies(data);
    } catch (err) {
      console.error('Failed to load replies', err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-white mb-6">Announcement Replies</h2>

      {/* Filters */}
      <div className="bg-white/5 p-4 rounded-xl mb-6 flex gap-4">
        <select
          value={filter.role}
          onChange={e => setFilter({...filter, role: e.target.value})}
          className="px-4 py-2 rounded bg-white/10 text-white border border-white/20"
        >
          <option value="">All Roles</option>
          <option value="staff">Staff Only</option>
          <option value="student">Students Only</option>
        </select>
      </div>

      {/* Replies List */}
      {loading ? (
        <p className="text-white/50">Loading replies...</p>
      ) : replies.length === 0 ? (
        <p className="text-white/50">No replies yet.</p>
      ) : (
        <div className="space-y-4">
          {replies.map(reply => (
            <div key={reply.id} className="bg-white/5 p-6 rounded-xl">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="text-lg font-semibold text-white">{reply.announcement_title}</h3>
                  <p className="text-sm text-white/50">
                    {reply.user_name} ({reply.user_role}) | {new Date(reply.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
              <p className="text-white/80 mt-4">{reply.reply_message}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

---

## 5. Security & Performance Considerations

### 5.1 Security

1. **Input Validation**:
   - Sanitize all user inputs (title, content, reply_message)
   - Prevent XSS attacks with proper escaping
   - Validate target_role enum on backend

2. **Authorization**:
   - Verify only admins can edit/delete announcements
   - Verify users can only reply to announcements they should see
   - Exclude admin creator from recipient lists

3. **Rate Limiting**:
   - Add rate limiting on reply submissions (e.g., 10 per hour per user)
   - Add rate limiting on email sending

4. **SQL Injection Prevention**:
   - Use parameterized queries (already implemented with pg library)

### 5.2 Performance

1. **Database Indexes**:
   - Index on `announcements.deleted_at` for soft delete queries
   - Index on `announcement_replies.announcement_id` for fast lookups
   - Index on `announcement_replies.created_at DESC` for sorting

2. **Email Sending**:
   - Batch emails in groups of 50 to avoid rate limits
   - Use background queue (Bull/Redis) for async processing (optional enhancement)
   - Implement retry logic for failed emails

3. **Caching** (Optional):
   - Cache announcement list for short periods (30-60 seconds)
   - Invalidate cache on create/edit/delete

---

## 6. Environment Variables

Add to `.env`:

```bash
# Email Service
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=noreply@compassionedu.com

# Frontend URL for email links
FRONTEND_URL=https://compassion-project-kappa.vercel.app
```

---

## 7. Migration Scripts

**File**: `backend/src/db/migrations/003_announcement_improvements.sql`

```sql
-- Migration: Announcement Module Improvements
-- Date: 2024

-- 1. Update target_role constraint
ALTER TABLE announcements
DROP CONSTRAINT IF EXISTS announcements_target_role_check;

ALTER TABLE announcements
ADD CONSTRAINT announcements_target_role_check
CHECK (target_role IN ('everyone', 'staff', 'student'));

-- 2. Add edit/delete tracking columns
ALTER TABLE announcements
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- 3. Create index for soft deletes
CREATE INDEX IF NOT EXISTS idx_announcements_deleted_at ON announcements(deleted_at)
WHERE deleted_at IS NULL;

-- 4. Create announcement_replies table
CREATE TABLE IF NOT EXISTS announcement_replies (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  announcement_id UUID NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_role       VARCHAR(20) NOT NULL CHECK (user_role IN ('staff', 'student')),
  reply_message   TEXT NOT NULL CHECK (LENGTH(TRIM(reply_message)) > 0),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Create indexes for reply queries
CREATE INDEX IF NOT EXISTS idx_announcement_replies_announcement ON announcement_replies(announcement_id);
CREATE INDEX IF NOT EXISTS idx_announcement_replies_user ON announcement_replies(user_id);
CREATE INDEX IF NOT EXISTS idx_announcement_replies_created ON announcement_replies(created_at DESC);

-- 6. Update existing 'all' values to 'everyone' (data migration)
UPDATE announcements SET target_role = 'everyone' WHERE target_role = 'all';
```

---

## 8. Testing Strategy

### 8.1 Unit Tests
- Test `getRecipients()` with different target_role values
- Test self-notification exclusion logic
- Test reply permission checks
- Test email deduplication logic

### 8.2 Integration Tests
- Test announcement creation → email sending flow
- Test reply submission → admin notification flow
- Test edit/delete with proper authorization

### 8.3 Manual Testing Checklist
- [ ] Create announcement to "Everyone" - verify emails sent to all staff + students
- [ ] Create announcement to "Staff" - verify emails only to staff
- [ ] Create announcement to "Students" - verify emails only to students
- [ ] Verify admin who creates announcement does NOT receive email/notification
- [ ] Edit announcement - verify changes visible immediately
- [ ] Delete announcement - verify soft delete (not visible but in DB)
- [ ] Submit reply as staff - verify admin receives notification
- [ ] Submit reply as student - verify admin receives notification
- [ ] Try to reply as admin - verify blocked
- [ ] View reply management panel - verify all replies displayed

---

## 9. Deployment Checklist

- [ ] Run database migration script
- [ ] Update `announcementsService.js` with new functions
- [ ] Create `replyService.js`
- [ ] Create `emailService.js`
- [ ] Update/create announcement routes
- [ ] Install nodemailer: `npm install nodemailer`
- [ ] Add SMTP environment variables to Render
- [ ] Update frontend AnnouncementsSection component
- [ ] Create AnnouncementReply component
- [ ] Create AnnouncementRepliesSection component
- [ ] Add route to Admin dashboard for Reply Management
- [ ] Deploy backend to Render
- [ ] Deploy frontend to Vercel
- [ ] Test all flows on production

---

## 10. Future Enhancements

1. **Rich Text Editor** - Allow formatted announcements
2. **File Attachments** - Allow admins to attach files to announcements
3. **Announcement Scheduling** - Schedule announcements for future publication
4. **Read Receipts** - Track who has read announcements
5. **Reply Threading** - Allow replies to replies
6. **Email Preferences** - Allow users to opt-out of announcement emails
7. **Push Notifications** - Mobile push notifications for announcements
8. **Analytics** - Track announcement engagement metrics

