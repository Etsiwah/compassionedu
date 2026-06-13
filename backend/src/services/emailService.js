/**
 * Email Service — Send emails using Nodemailer
 */

'use strict';

const nodemailer = require('nodemailer');

// Create transporter
const transporter = nodemailer.createTransporter({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: process.env.SMTP_PORT || 587,
  secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

/**
 * Send password reset email
 * @param {string} email - Recipient email
 * @param {string} resetToken - Password reset token
 * @param {string} name - User's name
 * @returns {Promise<void>}
 */
async function sendPasswordResetEmail(email, resetToken, name) {
  const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
  
  const mailOptions = {
    from: `"CompassionEdu" <${process.env.SMTP_USER}>`,
    to: email,
    subject: 'Password Reset Request - CompassionEdu',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0;">CompassionEdu</h1>
        </div>
        <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
          <h2 style="color: #333; margin-top: 0;">Password Reset Request</h2>
          <p>Hello ${name},</p>
          <p>We received a request to reset your password for your CompassionEdu account. Click the button below to reset your password:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" style="background: #f97316; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">Reset Password</a>
          </div>
          <p style="color: #666; font-size: 14px;">Or copy and paste this link into your browser:</p>
          <p style="color: #667eea; font-size: 14px; word-break: break-all;">${resetUrl}</p>
          <p style="color: #999; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
            <strong>This link will expire in 1 hour.</strong><br>
            If you didn't request this password reset, please ignore this email or contact support if you have concerns.
          </p>
        </div>
        <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
          <p>© ${new Date().getFullYear()} CompassionEdu · Releasing Children from Poverty in Jesus' Name</p>
        </div>
      </body>
      </html>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Password reset email sent to ${email}`);
  } catch (error) {
    console.error('Error sending password reset email:', error);
    throw new Error('Failed to send password reset email');
  }
}

/**
 * Send welcome email to new users
 * @param {string} email - Recipient email
 * @param {string} name - User's name
 * @returns {Promise<void>}
 */
async function sendWelcomeEmail(email, name) {
  const mailOptions = {
    from: `"CompassionEdu" <${process.env.SMTP_USER}>`,
    to: email,
    subject: 'Welcome to CompassionEdu!',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0;">Welcome to CompassionEdu!</h1>
        </div>
        <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
          <h2 style="color: #333; margin-top: 0;">Hello ${name}!</h2>
          <p>Thank you for joining CompassionEdu. We're excited to have you on board!</p>
          <p>You can now access your dashboard and start managing your academic journey.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/login" style="background: #f97316; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">Go to Dashboard</a>
          </div>
          <p style="color: #666; font-size: 14px;">If you have any questions, feel free to contact our support team.</p>
        </div>
        <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
          <p>© ${new Date().getFullYear()} CompassionEdu · Releasing Children from Poverty in Jesus' Name</p>
        </div>
      </body>
      </html>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Welcome email sent to ${email}`);
  } catch (error) {
    console.error('Error sending welcome email:', error);
    // Don't throw error for welcome emails as they're not critical
  }
}

/**
 * Send announcement emails to recipients
 * @param {Object} announcement - The announcement object with id, title, content, created_at, created_by
 * @param {Array} recipients - Array of recipient objects with id, email, name, role
 * @returns {Promise<void>}
 */
async function sendAnnouncementEmails(announcement, recipients) {
  const { id, title, content, created_by, created_at } = announcement;

  // Get creator name from database
  const pool = require('../db/pool');
  let creatorName = 'Administrator';
  try {
    const { rows } = await pool.query(
      `SELECT name FROM users WHERE id = $1`,
      [created_by]
    );
    if (rows.length > 0) {
      creatorName = rows[0].name;
    }
  } catch (err) {
    console.error('Error fetching creator name:', err);
  }

  // Build email subject
  const subject = `New Announcement: ${title}`;

  // Generate view link
  const viewLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/announcements/${id}`;

  // Format date
  const formattedDate = new Date(created_at).toLocaleString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  // Build HTML email body
  const htmlBody = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0;">New Announcement</h1>
      </div>
      <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
        <h2 style="color: #333; margin-top: 0;">New Announcement from ${creatorName}</h2>
        <div style="background: #ffffff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f97316;">
          <h3 style="color: #333; margin-top: 0;">${title}</h3>
          <p style="color: #666; white-space: pre-wrap;">${content}</p>
        </div>
        <p style="color: #999; font-size: 14px; margin-bottom: 20px;">
          Posted on: ${formattedDate}
        </p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${viewLink}" style="background: #f97316; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">View in System</a>
        </div>
      </div>
      <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
        <p style="margin: 5px 0;">© ${new Date().getFullYear()} CompassionEdu · Releasing Children from Poverty in Jesus' Name</p>
        <p style="margin: 5px 0;">This is an automated message. Please do not reply to this email.</p>
      </div>
    </body>
    </html>
  `;

  // Remove duplicate email addresses from recipient list
  const uniqueEmails = [...new Set(recipients.map(r => r.email).filter(e => e && e.trim()))];

  console.log(`Preparing to send announcement emails to ${uniqueEmails.length} unique recipients`);

  // Send emails in batches of 50 to avoid rate limits
  const BATCH_SIZE = 50;
  let successCount = 0;
  let failureCount = 0;

  for (let i = 0; i < uniqueEmails.length; i += BATCH_SIZE) {
    const batch = uniqueEmails.slice(i, i + BATCH_SIZE);
    
    // Use Promise.allSettled to handle individual failures gracefully
    const results = await Promise.allSettled(
      batch.map(email =>
        transporter.sendMail({
          from: `"CompassionEdu" <${process.env.SMTP_USER}>`,
          to: email,
          subject: subject,
          html: htmlBody
        })
      )
    );

    // Log results for this batch
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        successCount++;
      } else {
        failureCount++;
        console.error(`Failed to send email to ${batch[index]}:`, result.reason);
      }
    });

    // Small delay between batches to respect rate limits
    if (i + BATCH_SIZE < uniqueEmails.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  // Log email sending results
  console.log(`Announcement email sending complete: ${successCount} succeeded, ${failureCount} failed out of ${uniqueEmails.length} total recipients`);
}

module.exports = {
  sendPasswordResetEmail,
  sendWelcomeEmail,
  sendAnnouncementEmails,
};
