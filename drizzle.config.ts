import { defineConfig } from 'drizzle-kit';

const dbUrl = process.env['DATABASE_URL'] ?? 'file:./data/sweet-potato.db';
const dbPath = dbUrl.replace(/^file:/, '');

export default defineConfig({
  dialect: 'sqlite',
  schema: './src/server/db/schema.ts',
  out: './src/server/db/migrations',
  dbCredentials: { url: dbPath },
});
