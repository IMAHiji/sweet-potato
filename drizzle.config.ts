import { existsSync } from 'node:fs';
import { defineConfig } from 'drizzle-kit';

// Standalone env loading so the config doesn't depend on the app's validated
// env module (which would exit the process on missing vars).
if (existsSync('.env')) {
  process.loadEnvFile('.env');
}

const url = process.env.DATABASE_PATH ?? './data/sweet-potato.db';

export default defineConfig({
  dialect: 'sqlite',
  schema: './src/server/db/schema.ts',
  out: './src/server/db/migrations',
  dbCredentials: { url },
  verbose: true,
  strict: true,
});
