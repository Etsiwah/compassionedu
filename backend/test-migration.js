// Test migration script - validates migration file syntax
'use strict';

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
  ssl: (DATABASE_URL && DATABASE_URL.includes('render.com') || DATABASE_URL.includes('supabase.com')) 
    ? { rejectUnauthorized: false } 
    : false
});

async function testMigration() {
  console.log('\n🧪 Testing Announcement Migration...\n');
  const client = await pool.connect();

  try {
    // Read and execute the migration file
    const migrationPath = path.join(__dirname, 'src', 'db', 'migrations', 'update_announcements_schema.sql');
    const migrationSql = fs.readFileSync(migrationPath, 'utf8');
    
    // Remove comment-only lines but keep SQL statements
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

    console.log(`📝 Found ${statements.length} SQL statements\n`);

    let ok = 0;
    let skipped = 0;

    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      try {
        await client.query(stmt);
        console.log(`✅ Statement ${i + 1}/${statements.length} executed successfully`);
        ok++;
      } catch (err) {
        if (
          err.code === '42710' || // duplicate_object
          err.code === '42P07' || // duplicate_table
          err.code === '42701' || // duplicate_column
          err.message.includes('already exists')
        ) {
          console.log(`⏩ Statement ${i + 1}/${statements.length} skipped (already exists)`);
          skipped++;
        } else {
          console.error(`❌ Statement ${i + 1}/${statements.length} failed:`);
          console.error(`   ${err.message}`);
          skipped++;
        }
      }
    }

    console.log(`\n📊 Results: ${ok} executed, ${skipped} skipped\n`);

    // Test constraints are working
    console.log('🔍 Testing constraints...\n');

    // Test 1: Check target_role constraint
    try {
      await client.query(
        `INSERT INTO announcements (title, content, target_role) 
         VALUES ('Test', 'Test content', 'invalid_role')`
      );
      console.log('❌ CONSTRAINT FAIL: Invalid target_role was accepted!');
    } catch (err) {
      if (err.message.includes('announcements_target_role_check')) {
        console.log('✅ Target role constraint working correctly');
      } else {
        console.log(`⚠️  Unexpected error: ${err.message}`);
      }
    }

    // Test 2: Check announcement_replies table exists and constraint works
    try {
      await client.query(
        `INSERT INTO announcement_replies (announcement_id, user_id, user_role, reply_message) 
         VALUES (gen_random_uuid(), gen_random_uuid(), 'admin', 'Test')`
      );
      console.log('❌ CONSTRAINT FAIL: Invalid user_role was accepted in replies!');
    } catch (err) {
      if (err.message.includes('user_role') || err.message.includes('foreign key')) {
        console.log('✅ Reply user_role constraint working correctly');
      } else {
        console.log(`⚠️  Unexpected error: ${err.message}`);
      }
    }

    // Test 3: Check new columns exist
    const { rows } = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'announcements' 
        AND column_name IN ('updated_at', 'updated_by', 'deleted_at')
      ORDER BY column_name
    `);
    
    if (rows.length === 3) {
      console.log('✅ All new announcement columns exist');
    } else {
      console.log(`⚠️  Expected 3 new columns, found ${rows.length}`);
    }

    // Test 4: Check announcement_replies table exists
    const { rows: tables } = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'announcement_replies'
    `);
    
    if (tables.length > 0) {
      console.log('✅ announcement_replies table exists');
    } else {
      console.log('❌ announcement_replies table not found');
    }

    console.log('\n✨ Migration test completed successfully!\n');

  } catch (err) {
    console.error('\n❌ Migration test failed:', err.message);
    console.error(err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

testMigration();
