import { runMigrations, closeConnection } from '../dist/index.js';

async function main() {
  try {
    await runMigrations();
    console.log('✓ Database migrations completed successfully.');
    await closeConnection();
    process.exit(0);
  } catch (error) {
    console.error('✗ Migration failed:', error);
    process.exit(1);
  }
}

main();
