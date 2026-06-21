import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { env, isProd } from '../env.js';
import * as schema from './schema.js';

const { Pool } = pg;

// Managed Postgres (Railway/Render external) requires SSL; local docker does
// not. Defaults to on in production, overridable via DATABASE_SSL.
const sslEnabled =
  env.DATABASE_SSL !== undefined ? env.DATABASE_SSL === 'true' : isProd;

export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  ssl: sslEnabled ? { rejectUnauthorized: false } : undefined,
});

export const db = drizzle(pool, { schema });

export type Db = typeof db;
