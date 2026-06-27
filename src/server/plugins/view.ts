import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';
import view from '@fastify/view';
import { Eta } from 'eta';
import { fileURLToPath } from 'url';
import { join } from 'path';
import { getAssetUrls } from '../lib/assets.js';
import { env } from '../env.js';
import type { User } from '../db/schema.js';

declare module 'fastify' {
  interface FastifyReply {
    renderPage(page: string, data?: Record<string, unknown>): Promise<void>;
  }
  interface FastifyRequest {
    user: User | null;
  }
}

const viewsDir = join(fileURLToPath(import.meta.url), '../../views');

export default fp(async function viewPlugin(app: FastifyInstance) {
  // Initialize request.user to null; auth plugin overwrites it per request.
  app.decorateRequest('user', null);

  const eta = new Eta({ views: viewsDir, cache: env.NODE_ENV === 'production' });

  await app.register(view, {
    engine: { eta },
    root: viewsDir,
    layout: '/layouts/base',
  });

  app.decorateReply('renderPage', async function (
    this: FastifyReply & { request: FastifyRequest },
    page: string,
    data: Record<string, unknown> = {},
  ) {
    const assets = getAssetUrls();
    return this.view(page, {
      ...assets,
      NODE_ENV: env.NODE_ENV,
      currentUser: this.request.user ?? null,
      ...data,
    });
  });
});
