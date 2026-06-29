/**
 * Creates a minimal Fastify instance for integration testing.
 *
 * The env vars (DATABASE_URL=':memory:', SESSION_SECRET, etc.) must be set
 * before this module is first imported. vitest-setup.ts handles that via
 * vitest.config.ts -> test.setupFiles.
 *
 * Migrations are applied once (synchronously) when this module loads.
 * Each createTestApp() call returns a fresh, fully-ready Fastify instance
 * sharing the same in-memory SQLite singleton.
 */
import Fastify from 'fastify';
import formBody from '@fastify/formbody';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { fileURLToPath } from 'url';
import { join } from 'path';

import { db } from '../../src/server/db/client.js';
import viewPlugin from '../../src/server/plugins/view.js';
import sessionPlugin from '../../src/server/plugins/session.js';
import authPlugin from '../../src/server/plugins/auth.js';
import authRoutes from '../../src/server/routes/auth.js';
import characterRoutes from '../../src/server/routes/characters.js';

const migrationsFolder = join(
  fileURLToPath(import.meta.url),
  '../../../src/server/db/migrations',
);

// Apply migrations once when this module is first loaded.
// Drizzle tracks applied migrations so repeated calls are safe.
migrate(db, { migrationsFolder });

export async function createTestApp() {
  const app = Fastify({ logger: false });

  await app.register(formBody);
  // Order matters: session before auth (auth reads the session),
  // view before auth routes (routes call reply.renderPage).
  await app.register(sessionPlugin);
  await app.register(viewPlugin);
  await app.register(authPlugin);
  await app.register(authRoutes);
  await app.register(characterRoutes);

  await app.ready();
  return app;
}
