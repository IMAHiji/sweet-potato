import { resolve } from 'node:path';
import fastifyStatic from '@fastify/static';
import fp from 'fastify-plugin';
import type { FastifyPluginAsync } from 'fastify';

// Vite builds the client into public/, with hashed files under public/assets/.
// Serve that directory at /assets, matching the URLs in the Vite manifest.
const assetsDir = resolve(process.cwd(), 'public/assets');

const staticPlugin: FastifyPluginAsync = async (fastify) => {
  await fastify.register(fastifyStatic, {
    root: assetsDir,
    prefix: '/assets/',
    index: false,
    immutable: true,
    maxAge: '1y',
  });
};

export default fp(staticPlugin, { name: 'static' });
