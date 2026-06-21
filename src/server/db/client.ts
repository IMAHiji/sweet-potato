import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { env } from '../env.js';
import * as schema from './schema.js';

// Resolve the SQLite file relative to the cwd and make sure its directory
// exists (the data dir is gitignored and not created by anything else).
const dbPath = resolve(env.DATABASE_PATH);
mkdirSync(dirname(dbPath), { recursive: true });

export const sqlite = new Database(dbPath);
// WAL gives better read/write concurrency; foreign_keys must be enabled per
// connection for the ON DELETE CASCADE constraints to apply.
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('foreign_keys = ON');

export const db = drizzle(sqlite, { schema });

export type Db = typeof db;
