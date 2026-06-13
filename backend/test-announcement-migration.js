'use strict';

/**
 * Test script for announcement migration
 * Tests:
 * 1. Migration runs successfully
 * 2. Constraint rejects invalid target_role values
 * 3. Constraint accepts valid target_role values
 * 4. announcement_replies table exists with proper constraints
 * 5. Indexes are created
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
  ssl: (DATABASE_URL && DATABASE_URL.includes('render.com')) ? { rejectUnauthorized: false } : false
});

async function testMigration() {
  console.log('\n========================================');
  console.log('Testing Announcement Schema Migration');
  console.log('========================================\n');

  const client = await pool.connect();

  try {
    // ── TEST 1: Run the migration ──
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

    for (const stmt of statements) {
      try {
        await client.query(stmt);
      } catch (err) {
        // Ignore "already exists" errors
        if (
          err.code !== '42710' && // duplicate_object
          err.code !== '42P07' && // duplicate_table
          err.code !== '42701' && // duplicate_column
          !err.message.includes('already exists')
        ) {
          throw err;
        }
      }
    }
    console.log('  ✅  Migration executed successfully\n');

    // ── TEST 2: Verify announcements table has updated_at, updated_by, deleted_at ──
    console.log('TEST 2: Checking announcements table columns...');
    const { rows: columns } = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'announcements'
      ORDER BY ordinal_position
    `);
    
    const columnNames = columns.map(r => r.column_name);
    const requiredColumns = ['updated_at', 'updated_by', 'deleted_at'];
    
    for (const col of requiredColumns) {
      if (columnNames.includes(col)) {
        console.log(`  ✅  Column '${col}' exists`);
      } else {
        console.log(`  ❌  Column '${col}' MISSING`);
      }
    }
    console.log('');

    // ── TEST 3: Verify target_role constraint (should reject invalid values) ──
    console.log('TEST 3: Testing target_role constraint...');
    
    // Get a valid admin user to use as created_by
    const { rows: users } = await client.query(`
      SELECT id FROM users WHERE role = 'admin' LIMIT 1
    `);
    
    let adminId;
    if (users.length === 0) {
      console.log('  ⚠️  No admin user found, creating one for testing...');
      const { rows: newUser } = await client.query(`
        INSERT INTO users (role, name, email, password_hash)
        VALUES ('admin', 'Test Admin', 'test_migration@test.com', 'dummy_hash')
        RETURNING id
      `);
      adminId = newUser[0].id;
    } else {
      adminId = users[0].id;
    }

    // Test invalid values (should fail)
    const invalidValues = ['all', 'teacher', 'parent', 'invalid', ''];
    
    for (const value of invalidValues) {
      try {
        await client.query(`
          INSERT INTO announcements (title, content, target_role, created_by)
          VALUES ('Test', 'Test content', $1, $2)
        `, [value, adminId]);
        console.log(`  ❌  FAIL: Constraint accepted invalid value '${value}'`);
      } catch (err) {
        if (err.message.includes('violates check constraint')) {
          console.log(`  ✅  PASS: Constraint rejected invalid value '${value}'`);
        } else {
          console.log(`  ⚠️  Unexpected error for '${value}': ${err.message}`);
        }
      }
    }

    // Test valid values (should succeed)
    const validValues = ['everyone', 'staff', 'student'];
    const insertedIds = [];
    
    for (const value of validValues) {
      try {
        const { rows } = await client.query(`
          INSERT INTO announcements (title, content, target_role, created_by)
          VALUES ($1, $2, $3, $4)
          RETURNING id
        `, [`Test ${value}`, 'Test content', value, adminId]);
        insertedIds.push(rows[0].id);
        console.log(`  ✅  PASS: Constraint accepted valid value '${value}'`);
      } catch (err) {
        console.log(`  ❌  FAIL: Constraint rejected valid value '${value}': ${err.message}`);
      }
    }
    console.log('');

    // ── TEST 4: Verify announcement_replies table exists ──
    console.log('TEST 4: Checking announcement_replies table...');
    const { rows: tables } = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'announcement_replies'
    `);
    
    if (tables.length > 0) {
      console.log('  ✅  announcement_replies table exists');
      
      const { rows: replyColumns } = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'announcement_replies'
        ORDER BY ordinal_position
      `);
      
      const replyColumnNames = replyColumns.map(r => r.column_name);
      const requiredReplyColumns = ['id', 'announcement_id', 'user_id', 'user_role', 'reply_message', 'created_at'];
      
      for (const col of requiredReplyColumns) {
        if (replyColumnNames.includes(col)) {
          console.log(`  ✅  Column '${col}' exists`);
        } else {
          console.log(`  ❌  Column '${col}' MISSING`);
        }
      }
    } else {
      console.log('  ❌  announcement_replies table MISSING');
    }
    console.log('');

    // ── TEST 5: Verify indexes exist ──
    console.log('TEST 5: Checking indexes...');
    const { rows: indexes } = await client.query(`
      SELECT indexname 
      FROM pg_indexes 
      WHERE tablename IN ('announcements', 'announcement_replies')
      ORDER BY indexname
    `);
    
    const expectedIndexes = [
      'idx_announcements_deleted_at',
      'idx_announcement_replies_announcement',
      'idx_announcement_replies_user',
      'idx_announcement_replies_created'
    ];
    
    const indexNames = indexes.map(r => r.indexname);
    
    for (const idx of expectedIndexes) {
      if (indexNames.includes(idx)) {
        console.log(`  ✅  Index '${idx}' exists`);
      } else {
        console.log(`  ⚠️  Index '${idx}' not found (may use different name)`);
      }
    }
    console.log('');

    // ── TEST 6: Test announcement_replies constraints ──
    console.log('TEST 6: Testing announcement_replies constraints...');
    
    // Get a valid student
    const { rows: students } = await client.query(`
      SELECT id FROM users WHERE role = 'student' LIMIT 1
    `);
    
    let studentId;
    if (students.length === 0) {
      const { rows: newStudent } = await client.query(`
        INSERT INTO users (role, name, email, password_hash)
        VALUES ('student', 'Test Student', 'test_student@test.com', 'dummy_hash')
        RETURNING id
      `);
      studentId = newStudent[0].id;
    } else {
      studentId = students[0].id;
    }

    // Test invalid user_role (should fail)
    try {
      await client.query(`
        INSERT INTO announcement_replies (announcement_id, user_id, user_role, reply_message)
        VALUES ($1, $2, 'admin', 'Test reply')
      `, [insertedIds[0], studentId]);
      console.log('  ❌  FAIL: Constraint accepted invalid user_role "admin"');
    } catch (err) {
      if (err.message.includes('violates check constraint')) {
        console.log('  ✅  PASS: Constraint rejected invalid user_role "admin"');
      } else {
        console.log(`  ⚠️  Unexpected error: ${err.message}`);
      }
    }

    // Test empty reply_message (should fail)
    try {
      await client.query(`
        INSERT INTO announcement_replies (announcement_id, user_id, user_role, reply_message)
        VALUES ($1, $2, 'student', '   ')
      `, [insertedIds[0], studentId]);
      console.log('  ❌  FAIL: Constraint accepted empty reply_message');
    } catch (err) {
      if (err.message.includes('violates check constraint')) {
        console.log('  ✅  PASS: Constraint rejected empty reply_message');
      } else {
        console.log(`  ⚠️  Unexpected error: ${err.message}`);
      }
    }

    // Test valid reply (should succeed)
    try {
      await client.query(`
        INSERT INTO announcement_replies (announcement_id, user_id, user_role, reply_message)
        VALUES ($1, $2, 'student', 'This is a valid reply')
      `, [insertedIds[0], studentId]);
      console.log('  ✅  PASS: Valid reply inserted successfully');
    } catch (err) {
      console.log(`  ❌  FAIL: Could not insert valid reply: ${err.message}`);
    }
    console.log('');

    // Clean up test data
    console.log('Cleaning up test data...');
    await client.query('DELETE FROM announcement_replies WHERE user_id = $1', [studentId]);
    for (const id of insertedIds) {
      await client.query('DELETE FROM announcements WHERE id = $1', [id]);
    }
    await client.query('DELETE FROM users WHERE email IN ($1, $2)', ['test_migration@test.com', 'test_student@test.com']);
    console.log('  ✅  Test data cleaned up\n');

    console.log('========================================');
    console.log('✅  All migration tests completed!');
    console.log('========================================\n');

  } catch (err) {
    console.error('\n❌  Test failed:', err.message);
    console.error(err.stack);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

testMigration();
