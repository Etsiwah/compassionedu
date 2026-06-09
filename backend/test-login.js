require('dotenv').config({ path: require('path').resolve(__dirname, '.env') });
const pool = require('./src/db/pool');

async function fix() {
  await pool.query("UPDATE users SET status = 'active', is_active = true, deleted_at = null");
  const { rows } = await pool.query("SELECT * FROM users WHERE email = 'staff1@compassionedu.com'");
  console.log(rows[0]);
  process.exit(0);
}
fix();
