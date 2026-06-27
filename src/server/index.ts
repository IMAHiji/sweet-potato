import Fastify from 'fastify';
import formBody from '@fastify/formbody';
import autoload from '@fastify/autoload';
import { fileURLToPath } from 'url';
import { join } from 'path';
import { env } from './env.js';
import { sqlite } from './db/client.js';

const app = Fastify({
  logger: {
    level: env.NODE_ENV === 'development' ? 'info' : 'warn',
    transport: env.NODE_ENV === 'development'
      ? { target: 'pino-pretty', options: { colorize: true } }
      : undefined,
  },
});

// Plugins
const pluginsDir = join(fileURLToPath(import.meta.url), '../plugins');
const routesDir = join(fileURLToPath(import.meta.url), '../routes');

await app.register(formBody);

await app.register(autoload, {
  dir: pluginsDir,
  options: {},
});

await app.register(autoload, {
  dir: routesDir,
  options: {},
});

// Health check
app.get('/healthz', async () => ({ ok: true }));

// Error handlers
app.setErrorHandler(async (error, _request, reply) => {
  app.log.error(error);
  return reply.status(500).renderPage('/pages/error', { title: 'Error' });
});

app.setNotFoundHandler(async (_request, reply) => {
  return reply.status(404).renderPage('/pages/404', { title: 'Not found' });
});

// Start
const address = await app.listen({ port: env.PORT, host: '0.0.0.0' });
app.log.info(`Server listening at ${address}`);

// Graceful shutdown
const shutdown = async () => {
  await app.close();
  sqlite.close();
  process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
