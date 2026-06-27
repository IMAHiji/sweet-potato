import type { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import staticPlugin from '@fastify/static';
import { fileURLToPath } from 'url';
import { join } from 'path';

const publicDir = join(fileURLToPath(import.meta.url), '../../../../public');

export default fp(async function staticAssets(app: FastifyInstance) {
  await app.register(staticPlugin, {
    root: publicDir,
    prefix: '/assets',
  });
});
