/**
 * Tests for Email Service — sendAnnouncementEmails function
 */

'use strict';

const emailService = require('./emailService');
const nodemailer = require('nodemailer');

// Mock nodemailer
jest.mock('nodemailer');

// Mock pool
jest.mock('../db/pool', () => ({
  query: jest.fn()
}));

const pool = require('../db/pool');

describe('sendAnnouncementEmails', () => {
  let mockTransporter;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Mock transporter
    mockTransporter = {
      sendMail: jest.fn().mockResolvedValue({ messageId: 'test-message-id' })
    };
    nodemailer.createTransporter.mockReturnValue(mockTransporter);

    // Mock database query for creator name
    pool.query.mockResolvedValue({
      rows: [{ name: 'Test Admin' }]
    });

    // Set environment variables
    process.env.FRONTEND_URL = 'http://localhost:3000';
  });

  afterEach(() => {
    delete process.env.FRONTEND_URL;
  });

  test('should send emails to all unique recipients', async () => {
    const announcement = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      title: 'Test Announcement',
      content: 'This is a test announcement',
      created_by: 'admin-user-id',
      created_at: new Date('2024-01-15T10:30:00Z')
    };

    const recipients = [
      { id: '1', email: 'user1@test.com', name: 'User 1', role: 'student' },
      { id: '2', email: 'user2@test.com', name: 'User 2', role: 'staff' },
      { id: '3', email: 'user3@test.com', name: 'User 3', role: 'student' }
    ];

    await emailService.sendAnnouncementEmails(announcement, recipients);

    // Should send 3 emails
    expect(mockTransporter.sendMail).toHaveBeenCalledTimes(3);

    // Verify email content structure
    const firstCall = mockTransporter.sendMail.mock.calls[0][0];
    expect(firstCall.subject).toBe('New Announcement: Test Announcement');
    expect(firstCall.to).toBe('user1@test.com');
    expect(firstCall.html).toContain('Test Announcement');
    expect(firstCall.html).toContain('This is a test announcement');
    expect(firstCall.html).toContain('Test Admin');
    expect(firstCall.html).toContain('http://localhost:3000/announcements/123e4567-e89b-12d3-a456-426614174000');
  });

  test('should remove duplicate email addresses', async () => {
    const announcement = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      title: 'Test Announcement',
      content: 'Test content',
      created_by: 'admin-user-id',
      created_at: new Date()
    };

    const recipients = [
      { id: '1', email: 'user@test.com', name: 'User 1', role: 'student' },
      { id: '2', email: 'user@test.com', name: 'User 2', role: 'student' }, // duplicate
      { id: '3', email: 'user@test.com', name: 'User 3', role: 'staff' }, // duplicate
      { id: '4', email: 'other@test.com', name: 'User 4', role: 'staff' }
    ];

    await emailService.sendAnnouncementEmails(announcement, recipients);

    // Should only send 2 emails (unique addresses only)
    expect(mockTransporter.sendMail).toHaveBeenCalledTimes(2);

    const sentEmails = mockTransporter.sendMail.mock.calls.map(call => call[0].to);
    expect(sentEmails).toContain('user@test.com');
    expect(sentEmails).toContain('other@test.com');
  });

  test('should handle empty or invalid email addresses', async () => {
    const announcement = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      title: 'Test Announcement',
      content: 'Test content',
      created_by: 'admin-user-id',
      created_at: new Date()
    };

    const recipients = [
      { id: '1', email: 'valid@test.com', name: 'User 1', role: 'student' },
      { id: '2', email: '', name: 'User 2', role: 'student' }, // empty
      { id: '3', email: null, name: 'User 3', role: 'staff' }, // null
      { id: '4', email: '  ', name: 'User 4', role: 'staff' } // whitespace only
    ];

    await emailService.sendAnnouncementEmails(announcement, recipients);

    // Should only send to valid email
    expect(mockTransporter.sendMail).toHaveBeenCalledTimes(1);
    expect(mockTransporter.sendMail.mock.calls[0][0].to).toBe('valid@test.com');
  });

  test('should handle email sending failures gracefully', async () => {
    const announcement = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      title: 'Test Announcement',
      content: 'Test content',
      created_by: 'admin-user-id',
      created_at: new Date()
    };

    const recipients = [
      { id: '1', email: 'success@test.com', name: 'User 1', role: 'student' },
      { id: '2', email: 'fail@test.com', name: 'User 2', role: 'staff' },
      { id: '3', email: 'success2@test.com', name: 'User 3', role: 'student' }
    ];

    // Mock sendMail to fail for specific email
    mockTransporter.sendMail.mockImplementation((mailOptions) => {
      if (mailOptions.to === 'fail@test.com') {
        return Promise.reject(new Error('SMTP error'));
      }
      return Promise.resolve({ messageId: 'test-id' });
    });

    // Should not throw error
    await expect(emailService.sendAnnouncementEmails(announcement, recipients)).resolves.not.toThrow();

    // All 3 emails should be attempted
    expect(mockTransporter.sendMail).toHaveBeenCalledTimes(3);
  });

  test('should use default creator name if database query fails', async () => {
    pool.query.mockRejectedValue(new Error('Database error'));

    const announcement = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      title: 'Test Announcement',
      content: 'Test content',
      created_by: 'admin-user-id',
      created_at: new Date()
    };

    const recipients = [
      { id: '1', email: 'user@test.com', name: 'User 1', role: 'student' }
    ];

    await emailService.sendAnnouncementEmails(announcement, recipients);

    // Should still send email with default creator name
    expect(mockTransporter.sendMail).toHaveBeenCalledTimes(1);
    const emailHtml = mockTransporter.sendMail.mock.calls[0][0].html;
    expect(emailHtml).toContain('Administrator');
  });

  test('should generate correct email subject with announcement title', async () => {
    const announcement = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      title: 'Important Update',
      content: 'Test content',
      created_by: 'admin-user-id',
      created_at: new Date()
    };

    const recipients = [
      { id: '1', email: 'user@test.com', name: 'User', role: 'student' }
    ];

    await emailService.sendAnnouncementEmails(announcement, recipients);

    expect(mockTransporter.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: 'New Announcement: Important Update'
      })
    );
  });

  test('should include correct view link in email', async () => {
    const announcementId = 'abc123-def456';
    const announcement = {
      id: announcementId,
      title: 'Test',
      content: 'Test content',
      created_by: 'admin-user-id',
      created_at: new Date()
    };

    const recipients = [
      { id: '1', email: 'user@test.com', name: 'User', role: 'student' }
    ];

    await emailService.sendAnnouncementEmails(announcement, recipients);

    const emailHtml = mockTransporter.sendMail.mock.calls[0][0].html;
    expect(emailHtml).toContain(`http://localhost:3000/announcements/${announcementId}`);
  });

  test('should batch emails in groups of 50', async () => {
    const announcement = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      title: 'Test Announcement',
      content: 'Test content',
      created_by: 'admin-user-id',
      created_at: new Date()
    };

    // Create 120 unique recipients
    const recipients = Array.from({ length: 120 }, (_, i) => ({
      id: `${i}`,
      email: `user${i}@test.com`,
      name: `User ${i}`,
      role: i % 2 === 0 ? 'student' : 'staff'
    }));

    await emailService.sendAnnouncementEmails(announcement, recipients);

    // Should send all 120 emails
    expect(mockTransporter.sendMail).toHaveBeenCalledTimes(120);
  });

  test('should handle empty recipients array', async () => {
    const announcement = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      title: 'Test Announcement',
      content: 'Test content',
      created_by: 'admin-user-id',
      created_at: new Date()
    };

    const recipients = [];

    await emailService.sendAnnouncementEmails(announcement, recipients);

    // Should not attempt to send any emails
    expect(mockTransporter.sendMail).not.toHaveBeenCalled();
  });
});
