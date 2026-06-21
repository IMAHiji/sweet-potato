import { resolve } from 'node:path';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { db, sqlite } from './client.js';

// Migrations sit next to this file (src in dev, dist in prod — copied by the
// build step), so resolve relative to the module rather than the cwd.
const migrationsFolder = resolve(import.meta.dirname, 'migrations');

try {
  migrate(db, { migrationsFolder });
  sqlite.close();
  console.log('✓ Migrations applied.');
} catch (err) {
  console.error('✖ Migration failed:', err);
  sqlite.close();
  process.exit(1);
}
