import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { fileURLToPath } from 'url';
import { join } from 'path';
import { db, sqlite } from './client.js';

const migrationsFolder = join(fileURLToPath(import.meta.url), '../migrations');

migrate(db, { migrationsFolder });
console.log('Migrations applied.');
sqlite.close();
