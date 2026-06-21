import fastifyFormbody from '@fastify/formbody';
import Fastify from 'fastify';
import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { env, isProd } from './env.js';
import { sqlite } from './db/client.js';
import authPlugin from './plugins/auth.js';
import sessionPlugin from './plugins/session.js';
import staticPlugin from './plugins/static.js';
import viewPlugin from './plugins/view.js';
import adminRoutes from './routes/admin.js';
import apiRoutes from './routes/api.js';
import audioRoutes from './routes/audio.js';
import authRoutes from './routes/auth.js';
import charactersRoutes from './routes/characters.js';
import publicRoutes from './routes/public.js';
import studyRoutes from './routes/study.js';
// Side-effect import keeps the Fastify type augmentations in the build graph.
import './types.js';

async function buildServer() {
  const app = Fastify({
    logger: { level: isProd ? 'info' : 'debug' },
    trustProxy: isProd,
    disableRequestLogging: isProd,
  });

  // Body parsing for HTML form posts.
  await app.register(fastifyFormbody);

  // Order matters: session before auth (auth reads the session).
  await app.register(sessionPlugin);
  await app.register(viewPlugin);
  await app.register(staticPlugin);
  await app.register(authPlugin);

  // Routes.
  await app.register(publicRoutes);
  await app.register(authRoutes);
  await app.register(charactersRoutes);
  await app.register(studyRoutes);
  await app.register(audioRoutes);
  await app.register(apiRoutes);
  await app.register(adminRoutes, { prefix: '/admin' });

  app.setErrorHandler((error: FastifyError, request: FastifyRequest, reply: FastifyReply) => {
    request.log.error(error);
    if (request.url.startsWith('/api/')) {
      return reply
        .status(error.statusCode ?? 500)
        .send({ error: 'server_error' });
    }
    const status =
      error.statusCode && error.statusCode >= 400 && error.statusCode < 500
        ? error.statusCode
        : 500;
    return reply.status(status).render('pages/error', {
      title: 'Something went wrong',
      status,
      message:
        status === 500
          ? 'An unexpected error occurred. Please try again.'
          : error.message,
    });
  });

  app.setNotFoundHandler((request, reply) => {
    if (request.url.startsWith('/api/')) {
      return reply.status(404).send({ error: 'not_found' });
    }
    return reply.status(404).render('pages/404', { title: 'Page not found' });
  });

  return app;
}

async function main() {
  const app = await buildServer();

  for (const signal of ['SIGINT', 'SIGTERM'] as const) {
    process.once(signal, async () => {
      app.log.info(`Received ${signal}, shutting down…`);
      try {
        await app.close();
        sqlite.close();
      } finally {
        process.exit(0);
      }
    });
  }

  try {
    await app.listen({ port: env.PORT, host: '0.0.0.0' });
  } catch (err) {
    app.log.error(err);
    sqlite.close();
    process.exit(1);
  }
}

void main();
