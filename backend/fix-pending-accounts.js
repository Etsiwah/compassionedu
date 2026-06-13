/**
 * Fix all pending accounts - make them active
 * Run with: node fix-pending-accounts.js
 */

require('dotenv').config();
const pool = require('./src/db/pool');

async function fixPendingAccounts() {
  try {
    console.log('🔧 Fixing pending accounts...\n');

    // Update all pending or inactive accounts to active
    const result = await pool.query(`
      UPDATE users 
      SET status = 'active', is_active = TRUE 
      WHERE status = 'pending' OR is_active = FALSE
      RETURNING id, name, email, role, status, is_active;
    `);

    if (result.rows.length === 0) {
      console.log('✅ No pending accounts found - all accounts are already active!\n');
    } else {
      console.log(`✅ Successfully activated ${result.rows.length} account(s):\n`);
      result.rows.forEach(user => {
        console.log(`   - ${user.name} (${user.email}) - ${user.role}`);
      });
      console.log('');
    }

    // Show all users status
    const allUsers = await pool.query(`
      SELECT id, name, email, role, status, is_active 
      FROM users 
      ORDER BY created_at DESC 
      LIMIT 10;
    `);

    console.log('📋 Recent user accounts:');
    console.log('─'.repeat(80));
    allUsers.rows.forEach(user => {
      const statusIcon = user.is_active && user.status === 'active' ? '✅' : '❌';
      console.log(`${statusIcon} ${user.name} | ${user.email} | ${user.role} | ${user.status}`);
    });
    console.log('─'.repeat(80));
    console.log('\n✨ Done! All accounts are now active and can login freely.\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

fixPendingAccounts();
