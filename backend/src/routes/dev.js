/**
 * Dev-only routes for demo account credentials.
 * Mounted at /api/dev in app.js.
 */

'use strict';

const express = require('express');

const router = express.Router();

router.use((_req, res, next) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ error: 'Resource not found' });
  }
  next();
});

const DEMO_ACCOUNTS = [
  {
    role: 'admin',
    label: 'Super Admin',
    name: 'Admin User',
    email: 'admin@compassionedu.com',
    password: 'Admin@123',
    permissions: ['Full access'],
  },
  {
    role: 'staff',
    label: 'Staff',
    name: 'Staff Member One',
    email: 'staff1@compassionedu.com',
    password: 'Staff@123',
    permissions: ['Manage assigned areas', 'View announcements', 'View students'],
  },
  {
    role: 'teacher',
    label: 'Teacher',
    name: 'Teacher One',
    email: 'teacher1@compassionedu.com',
    password: 'Teacher@123',
    permissions: ['Record attendance', 'Enter results', 'View students'],
  },
  {
    role: 'student',
    label: 'Beneficiary / Student',
    name: 'Student One',
    email: 'student1@compassionedu.com',
    password: 'Student@123',
    permissions: ['View dashboard', 'Upload receipts', 'Upload results', 'Manage portfolio'],
  },
  {
    role: 'parent',
    label: 'Parent',
    name: 'Parent One',
    email: 'parent1@compassionedu.com',
    password: 'Parent@123',
    permissions: ['View child attendance', 'View child results', 'View child fees'],
  },
];

router.get('/accounts', (_req, res) => {
  res.json({ accounts: DEMO_ACCOUNTS });
});

module.exports = router;
