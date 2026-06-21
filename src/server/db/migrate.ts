import { resolve } from 'node:path';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { db, pool } from './client.js';

// Migrations sit next to this file (src in dev, dist in prod — copied by the
// build step), so resolve relative to the module rather than the cwd.
const migrationsFolder = resolve(import.meta.dirname, 'migrations');

async function main() {
  await migrate(db, { migrationsFolder });
  await pool.end();
  console.log('✓ Migrations applied.');
}

main().catch(async (err) => {
  console.error('✖ Migration failed:', err);
  await pool.end();
  process.exit(1);
});
