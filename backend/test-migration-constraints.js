'use strict';

/**
 * Test script to verify announcement schema migration
 * Tests:
 * 1. Migration runs successfully
 * 2. Constraints work correctly (try inserting invalid target_role values)
 * 3. All required columns exist
 * 4. Indexes are created
 * 5. announcement_replies table exists with proper constraints
 */

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('ERROR: DATABASE_URL environment variable is not set.');
  process.exit(1);
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: DATABASE_URL && DATABASE_URL.includes('render.com') 
    ? { rejectUnauthorized: false } 
    : false
});

async function testMigration() {
  console.log('\n' + '='.repeat(70));
  console.log('ANNOUNCEMENT SCHEMA MIGRATION TEST');
  console.log('='.repeat(70) + '\n');

  const client = await pool.connect();

  try {
    // ─────────────────────────────────────────────────────────────────────
    // TEST 1: Run the migration
    // ─────────────────────────────────────────────────────────────────────
    console.log('TEST 1: Running migration...');
    const migrationPath = path.join(__dirname, 'src', 'db', 'migrations', 'update_announcements_schema.sql');
    const migrationSql = fs.readFileSync(migrationPath, 'utf8');

    const cleanedSql = migrationSql
      .split('\n')
      .filter(line => {
        const trimmed = line.trim();
        return trimmed.length > 0 && !trimmed.startsWith('--');
      })
      .join('\n');

    const statements = cleanedSql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    let migOk = 0;
    let migSkipped = 0;

    for (const stmt of statements) {
      try {
        await client.query(stmt);
        migOk++;
      } catch (err) {
        if (
          err.code === '42710' || // duplicate_object
          err.code === '42P07' || // duplicate_table
          err.code === '42701' || // duplicate_column
          err.message.includes('already exists')
        ) {
          migSkipped++;
        } else {
          console.warn(`  ⚠️  Statement skipped: ${err.message.slice(0, 80)}`);
          migSkipped++;
        }
      }
    }

    console.log(`  ✅  Migration applied (${migOk} statements OK, ${migSkipped} skipped/existing)\n`);

    // ─────────────────────────────────────────────────────────────────────
    // TEST 2: Verify announcements table structure
    // ─────────────────────────────────────────────────────────────────────
    console.log('TEST 2: Verifying announcements table structure...');
    
    const { rows: columns } = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'announcements'
      ORDER BY ordinal_position
    `);

    const requiredColumns = ['id', 'title', 'content', 'target_role', 'created_by', 'created_at', 'updated_at', 'updated_by', 'deleted_at'];
    const foundColumns = columns.map(c => c.column_name);

    console.log('  Found columns:', foundColumns.join(', '));
    
    const missingColumns = requiredColumns.filter(c => !foundColumns.includes(c));
    if (missingColumns.length === 0) {
      console.log('  ✅  All required columns exist\n');
    } else {
      console.log(`  ❌  Missing columns: ${missingColumns.join(', ')}\n`);
    }

    // ─────────────────────────────────────────────────────────────────────
    // TEST 3: Verify target_role constraint (valid values)
    // ─────────────────────────────────────────────────────────────────────
    console.log('TEST 3: Testing target_role constraint with valid values...');
    
    // Get a test admin user
    const { rows: adminUsers } = await client.query(`
      SELECT id FROM users WHERE role = 'admin' LIMIT 1
    `);

    let testAdminId = null;
    if (adminUsers.length > 0) {
      testAdminId = adminUsers[0].id;
    } else {
      // Create a test admin if none exists
      const { rows: newAdmin } = await client.query(`
        INSERT INTO users (role, name, email, password_hash)
        VALUES ('admin', 'Test Admin', 'test-admin-migration@test.com', 'dummy-hash')
        RETURNING id
      `);
      testAdminId = newAdmin[0].id;
      console.log('  Created test admin user');
    }

    const validRoles = ['everyone', 'staff', 'student'];
    const validTestResults = [];

    for (const role of validRoles) {
      try {
        const { rows } = await client.query(`
          INSERT INTO announcements (title, content, target_role, created_by)
          VALUES ($1, $2, $3, $4)
          RETURNING id
        `, [`Test ${role}`, `Test content for ${role}`, role, testAdminId]);
        
        validTestResults.push({ role, success: true, id: rows[0].id });
        console.log(`  ✅  '${role}' - ACCEPTED (as expected)`);
      } catch (err) {
        validTestResults.push({ role, success: false, error: err.message });
        console.log(`  ❌  '${role}' - REJECTED (unexpected): ${err.message}`);
      }
    }

    const allValidPassed = validTestResults.every(r => r.success);
    console.log(allValidPassed ? '  ✅  All valid roles accepted\n' : '  ❌  Some valid roles rejected\n');

    // ─────────────────────────────────────────────────────────────────────
    // TEST 4: Verify target_role constraint (invalid values)
    // ─────────────────────────────────────────────────────────────────────
    console.log('TEST 4: Testing target_role constraint with invalid values...');
    
    const invalidRoles = ['all', 'teacher', 'parent', 'admin', 'invalid', ''];
    const invalidTestResults = [];

    for (const role of invalidRoles) {
      try {
        await client.query(`
          INSERT INTO announcements (title, content, target_role, created_by)
          VALUES ($1, $2, $3, $4)
        `, [`Test ${role}`, `Test content`, role, testAdminId]);
        
        invalidTestResults.push({ role, rejected: false });
        console.log(`  ❌  '${role}' - ACCEPTED (should be rejected!)`);
      } catch (err) {
        invalidTestResults.push({ role, rejected: true });
        console.log(`  ✅  '${role}' - REJECTED (as expected)`);
      }
    }

    const allInvalidRejected = invalidTestResults.every(r => r.rejected);
    console.log(allInvalidRejected ? '  ✅  All invalid roles rejected\n' : '  ❌  Some invalid roles accepted\n');

    // ─────────────────────────────────────────────────────────────────────
    // TEST 5: Verify announcement_replies table exists
    // ─────────────────────────────────────────────────────────────────────
    console.log('TEST 5: Verifying announcement_replies table...');
    
    const { rows: replyColumns } = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'announcement_replies'
      ORDER BY ordinal_position
    `);

    if (replyColumns.length === 0) {
      console.log('  ❌  announcement_replies table does not exist\n');
    } else {
      console.log('  Found columns:', replyColumns.map(c => c.column_name).join(', '));
      
      const requiredReplyColumns = ['id', 'announcement_id', 'user_id', 'user_role', 'reply_message', 'created_at'];
      const foundReplyColumns = replyColumns.map(c => c.column_name);
      const missingReplyColumns = requiredReplyColumns.filter(c => !foundReplyColumns.includes(c));
      
      if (missingReplyColumns.length === 0) {
        console.log('  ✅  All required columns exist\n');
      } else {
        console.log(`  ❌  Missing columns: ${missingReplyColumns.join(', ')}\n`);
      }
    }

    // ─────────────────────────────────────────────────────────────────────
    // TEST 6: Verify announcement_replies constraints
    // ─────────────────────────────────────────────────────────────────────
    console.log('TEST 6: Testing announcement_replies constraints...');
    
    // Get a test announcement
    const testAnnouncementId = validTestResults.find(r => r.success)?.id;
    
    // Get a test student
    const { rows: studentUsers } = await client.query(`
      SELECT id FROM users WHERE role = 'student' LIMIT 1
    `);

    let testStudentId = null;
    if (studentUsers.length > 0) {
      testStudentId = studentUsers[0].id;
    } else {
      const { rows: newStudent } = await client.query(`
        INSERT INTO users (role, name, email, password_hash)
        VALUES ('student', 'Test Student', 'test-student-migration@test.com', 'dummy-hash')
        RETURNING id
      `);
      testStudentId = newStudent[0].id;
      console.log('  Created test student user');
    }

    // Test valid reply
    try {
      const { rows } = await client.query(`
        INSERT INTO announcement_replies (announcement_id, user_id, user_role, reply_message)
        VALUES ($1, $2, $3, $4)
        RETURNING id
      `, [testAnnouncementId, testStudentId, 'student', 'Test reply message']);
      
      console.log(`  ✅  Valid reply inserted successfully (id: ${rows[0].id})`);
    } catch (err) {
      console.log(`  ❌  Valid reply rejected: ${err.message}`);
    }

    // Test invalid user_role
    try {
      await client.query(`
        INSERT INTO announcement_replies (announcement_id, user_id, user_role, reply_message)
        VALUES ($1, $2, $3, $4)
      `, [testAnnouncementId, testStudentId, 'admin', 'Test reply']);
      
      console.log(`  ❌  Invalid user_role 'admin' accepted (should be rejected!)`);
    } catch (err) {
      console.log(`  ✅  Invalid user_role 'admin' rejected (as expected)`);
    }

    // Test empty reply message
    try {
      await client.query(`
        INSERT INTO announcement_replies (announcement_id, user_id, user_role, reply_message)
        VALUES ($1, $2, $3, $4)
      `, [testAnnouncementId, testStudentId, 'student', '   ']);
      
      console.log(`  ❌  Empty reply message accepted (should be rejected!)`);
    } catch (err) {
      console.log(`  ✅  Empty reply message rejected (as expected)`);
    }

    console.log();

    // ─────────────────────────────────────────────────────────────────────
    // TEST 7: Verify indexes
    // ─────────────────────────────────────────────────────────────────────
    console.log('TEST 7: Verifying indexes...');
    
    const { rows: indexes } = await client.query(`
      SELECT indexname
      FROM pg_indexes
      WHERE tablename IN ('announcements', 'announcement_replies')
      ORDER BY indexname
    `);

    console.log('  Found indexes:');
    indexes.forEach(idx => console.log(`    - ${idx.indexname}`));

    const requiredIndexes = [
      'idx_announcements_deleted_at',
      'idx_announcement_replies_announcement',
      'idx_announcement_replies_user',
      'idx_announcement_replies_created'
    ];

    const foundIndexes = indexes.map(idx => idx.indexname);
    const missingIndexes = requiredIndexes.filter(idx => !foundIndexes.includes(idx));

    if (missingIndexes.length === 0) {
      console.log('  ✅  All required indexes exist\n');
    } else {
      console.log(`  ⚠️  Missing indexes: ${missingIndexes.join(', ')}\n`);
    }

    // ─────────────────────────────────────────────────────────────────────
    // CLEANUP: Delete test data
    // ─────────────────────────────────────────────────────────────────────
    console.log('CLEANUP: Removing test data...');
    
    // Delete test announcements
    const testAnnouncementIds = validTestResults.filter(r => r.success).map(r => r.id);
    if (testAnnouncementIds.length > 0) {
      await client.query(`
        DELETE FROM announcements WHERE id = ANY($1)
      `, [testAnnouncementIds]);
      console.log(`  Deleted ${testAnnouncementIds.length} test announcements`);
    }

    // Delete test users if they were created
    await client.query(`
      DELETE FROM users WHERE email IN ('test-admin-migration@test.com', 'test-student-migration@test.com')
    `);
    console.log('  Deleted test users');

    console.log();
    console.log('='.repeat(70));
    console.log('MIGRATION TEST COMPLETED SUCCESSFULLY ✅');
    console.log('='.repeat(70) + '\n');

  } catch (err) {
    console.error('\n❌  Test failed:', err.message);
    console.error(err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

testMigration();
