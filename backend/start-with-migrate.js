/**
 * Startup script that runs migrations before starting the API server.
 */

'use strict';

const { execSync } = require('child_process');

const PORT = process.env.PORT || 4000;

console.log('Starting CompassionEdu backend...');
console.log('Running database migrations...');

try {
  execSync('node src/db/migrate.js', { stdio: 'inherit' });
  console.log('Migrations completed successfully');

  const app = require('./src/app');
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`CompassionEdu API listening on port ${PORT}`);

    if (process.env.NODE_ENV !== 'production') {
      console.log('\nDemo accounts available at: http://localhost:3000/dev/accounts');
      console.log('Run `npm run seed` to create them if not yet seeded.\n');
    }

    try {
      const { startFeeScheduler } = require('./src/jobs/feeScheduler');
      startFeeScheduler();
    } catch (err) {
      console.error('Failed to start fee scheduler:', err.message);
    }
  });
} catch (error) {
  console.error('Migration failed:', error.message);
  process.exit(1);
}
