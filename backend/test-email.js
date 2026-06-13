/**
 * Email Service Test Script
 * 
 * This script tests the email service configuration for the CompassionEdu announcement system.
 * Run this after configuring SMTP environment variables to verify email sending works.
 * 
 * Usage:
 *   node test-email.js <recipient-email>
 * 
 * Example:
 *   node test-email.js test@example.com
 */

require('dotenv').config();
const nodemailer = require('nodemailer');

// Check if recipient email is provided
const recipientEmail = process.argv[2];
if (!recipientEmail) {
  console.error('❌ Error: Please provide a recipient email address');
  console.log('Usage: node test-email.js <recipient-email>');
  console.log('Example: node test-email.js test@example.com');
  process.exit(1);
}

// Validate email format
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
if (!emailRegex.test(recipientEmail)) {
  console.error('❌ Error: Invalid email address format');
  process.exit(1);
}

// Check required environment variables
const requiredVars = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS'];
const missingVars = requiredVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error('❌ Error: Missing required environment variables:');
  missingVars.forEach(varName => console.error(`   - ${varName}`));
  console.log('\nPlease configure these in your backend/.env file');
  process.exit(1);
}

// Warning for placeholder passwords
if (process.env.SMTP_PASS === 'your-gmail-app-password-here' || 
    process.env.SMTP_PASS === 'your-app-password') {
  console.error('❌ Error: SMTP_PASS appears to be a placeholder value');
  console.log('\nTo configure Gmail SMTP:');
  console.log('1. Enable 2FA: https://myaccount.google.com/security');
  console.log('2. Generate App Password: https://myaccount.google.com/apppasswords');
  console.log('3. Update SMTP_PASS in backend/.env with the 16-character password');
  process.exit(1);
}

console.log('🔧 Email Service Configuration Test');
console.log('=====================================\n');

// Display configuration (hide password)
console.log('Configuration:');
console.log(`  SMTP Host: ${process.env.SMTP_HOST}`);
console.log(`  SMTP Port: ${process.env.SMTP_PORT}`);
console.log(`  SMTP User: ${process.env.SMTP_USER}`);
console.log(`  SMTP Pass: ${'*'.repeat(Math.min(process.env.SMTP_PASS?.length || 0, 16))}`);
console.log(`  SMTP From: ${process.env.SMTP_FROM || process.env.SMTP_USER}`);
console.log(`  Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
console.log(`  Recipient: ${recipientEmail}\n`);

// Create transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

// Test email content
const testAnnouncement = {
  id: 'test-' + Date.now(),
  title: 'Test Announcement - Email Service Verification',
  content: `This is a test email from the CompassionEdu announcement system.

If you received this email, your SMTP configuration is working correctly!

Configuration Details:
- SMTP Host: ${process.env.SMTP_HOST}
- SMTP Port: ${process.env.SMTP_PORT}
- Sender: ${process.env.SMTP_USER}
- Test Time: ${new Date().toLocaleString()}

This test was performed as part of Task 11: Email Service Configuration for the Announcement Module Enhancement.`,
  created_at: new Date(),
  created_by_name: 'System Administrator'
};

const viewLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/announcements/${testAnnouncement.id}`;

const htmlBody = `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h2>New Announcement from ${testAnnouncement.created_by_name}</h2>
  <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
    <h3 style="margin-top: 0;">${testAnnouncement.title}</h3>
    <p>${testAnnouncement.content.replace(/\n/g, '<br>')}</p>
  </div>
  <p style="color: #666; font-size: 14px;">
    Posted on: ${new Date(testAnnouncement.created_at).toLocaleString()}
  </p>
  <a href="${viewLink}" 
     style="display: inline-block; background: #f97316; color: white; padding: 12px 24px; 
            text-decoration: none; border-radius: 6px; margin-top: 10px;">
    View in System
  </a>
  <p style="margin-top: 30px; color: #999; font-size: 12px; border-top: 1px solid #ddd; padding-top: 20px;">
    CompassionEdu School Management System<br>
    This is an automated test message. Please do not reply to this email.<br>
    <strong>Task 11: Email Service Configuration Test</strong>
  </p>
</div>
`;

// Send test email
async function sendTestEmail() {
  try {
    console.log('📤 Sending test email...\n');
    
    const info = await transporter.sendMail({
      from: `"CompassionEdu Test" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
      to: recipientEmail,
      subject: `Test: ${testAnnouncement.title}`,
      html: htmlBody,
      text: `${testAnnouncement.title}\n\n${testAnnouncement.content}\n\nPosted on: ${testAnnouncement.created_at.toLocaleString()}\n\nView in System: ${viewLink}`
    });

    console.log('✅ SUCCESS! Test email sent successfully');
    console.log(`   Message ID: ${info.messageId}`);
    console.log(`   Recipient: ${recipientEmail}`);
    console.log('\n📧 Please check the recipient inbox (and spam folder) for the test email.\n');
    console.log('Expected email content:');
    console.log(`  - Subject: Test: ${testAnnouncement.title}`);
    console.log(`  - From: CompassionEdu Test`);
    console.log(`  - Contains: Announcement title, content, and "View in System" button\n`);
    
  } catch (error) {
    console.error('❌ FAILED! Could not send test email\n');
    console.error('Error Details:');
    console.error(`  Type: ${error.code || error.name}`);
    console.error(`  Message: ${error.message}\n`);
    
    // Provide troubleshooting tips based on error
    if (error.code === 'EAUTH' || error.responseCode === 535) {
      console.log('Troubleshooting Tips:');
      console.log('  • Verify SMTP_USER is correct (your Gmail address)');
      console.log('  • Verify SMTP_PASS is a Gmail App Password (not regular password)');
      console.log('  • Ensure 2FA is enabled on your Gmail account');
      console.log('  • Generate new App Password: https://myaccount.google.com/apppasswords');
    } else if (error.code === 'ECONNECTION' || error.code === 'ETIMEDOUT') {
      console.log('Troubleshooting Tips:');
      console.log('  • Check your internet connection');
      console.log('  • Verify SMTP_HOST is correct (smtp.gmail.com for Gmail)');
      console.log('  • Verify SMTP_PORT is correct (587 for TLS, 465 for SSL)');
      console.log('  • Check if firewall is blocking SMTP ports');
    } else if (error.code === 'EMESSAGE') {
      console.log('Troubleshooting Tips:');
      console.log('  • Check email content for invalid characters');
      console.log('  • Verify recipient email address is valid');
    }
    
    console.log('\nFor more help, see: DEPLOYMENT.md\n');
    process.exit(1);
  }
}

// Verify SMTP connection before sending
console.log('🔌 Verifying SMTP connection...');
transporter.verify((error, success) => {
  if (error) {
    console.error('❌ SMTP Connection Failed\n');
    console.error('Error:', error.message);
    console.log('\nPlease check your SMTP configuration in backend/.env');
    console.log('See DEPLOYMENT.md for detailed setup instructions.\n');
    process.exit(1);
  } else {
    console.log('✅ SMTP connection verified successfully\n');
    sendTestEmail();
  }
});
