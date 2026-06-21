import { existsSync } from 'node:fs';
import { defineConfig } from 'drizzle-kit';

// Standalone env loading so the config doesn't depend on the app's validated
// env module (which would exit the process on missing vars).
if (existsSync('.env')) {
  process.loadEnvFile('.env');
}

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error('DATABASE_URL is required for drizzle-kit (set it in .env).');
}

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/server/db/schema.ts',
  out: './src/server/db/migrations',
  dbCredentials: { url },
  verbose: true,
  strict: true,
});
