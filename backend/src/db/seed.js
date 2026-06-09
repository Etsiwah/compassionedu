'use strict';

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  ssl: (process.env.DATABASE_URL && process.env.DATABASE_URL.includes('render.com')) ? { rejectUnauthorized: false } : false
});

const DEMO_ACCOUNTS = [
  {
    role: 'admin',
    name: 'Admin User',
    email: 'admin@compassionedu.com',
    password: 'Admin@123',
  },
  {
    role: 'staff',
    name: 'Staff Member One',
    email: 'staff1@compassionedu.com',
    password: 'Staff@123',
  },
  {
    role: 'staff',
    name: 'Staff Member Two',
    email: 'staff2@compassionedu.com',
    password: 'Staff@123',
  },
  {
    role: 'teacher',
    name: 'Teacher One',
    email: 'teacher1@compassionedu.com',
    password: 'Teacher@123',
  },
  {
    role: 'student',
    name: 'Student One',
    email: 'student1@compassionedu.com',
    password: 'Student@123',
  },
  {
    role: 'student',
    name: 'Student Two',
    email: 'student2@compassionedu.com',
    password: 'Student@123',
  },
  {
    role: 'parent',
    name: 'Parent One',
    email: 'parent1@compassionedu.com',
    password: 'Parent@123',
  },
];

async function hasColumn(tableName, columnName) {
  const { rows } = await pool.query(
    `SELECT column_name
     FROM information_schema.columns
     WHERE table_name = $1 AND column_name = $2`,
    [tableName, columnName]
  );
  return rows.length > 0;
}

async function seed() {
  console.log('\nCompassionEdu - seeding demo accounts...\n');

  const hasAccountSource = await hasColumn('users', 'account_source');

  for (const account of DEMO_ACCOUNTS) {
    try {
      const passwordHash = await bcrypt.hash(account.password, 10);

      if (hasAccountSource) {
        await pool.query(
          `INSERT INTO users (role, name, email, password_hash, is_active, account_source)
           VALUES ($1, $2, $3, $4, TRUE, 'admin_added')
           ON CONFLICT (email) DO UPDATE
             SET role = EXCLUDED.role,
                 name = EXCLUDED.name,
                 password_hash = EXCLUDED.password_hash,
                 is_active = TRUE,
                 deleted_at = NULL,
                 account_source = 'admin_added'`,
          [account.role, account.name, account.email, passwordHash]
        );
      } else {
        await pool.query(
          `INSERT INTO users (role, name, email, password_hash, is_active)
           VALUES ($1, $2, $3, $4, TRUE)
           ON CONFLICT (email) DO UPDATE
             SET role = EXCLUDED.role,
                 name = EXCLUDED.name,
                 password_hash = EXCLUDED.password_hash,
                 is_active = TRUE,
                 deleted_at = NULL`,
          [account.role, account.name, account.email, passwordHash]
        );
      }

      console.log(`  OK [${account.role.toUpperCase().padEnd(7)}] ${account.email} / ${account.password}`);
    } catch (err) {
      console.error(`  FAIL ${account.email}: ${err.message}`);
    }
  }

  console.log('\nSeed complete.\n');
  console.log('  Login at: http://localhost:3000/login');
  console.log('  Demo accounts: http://localhost:3000/dev/accounts\n');

  await pool.end();
}

seed().catch(err => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
