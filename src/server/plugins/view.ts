import { resolve } from 'node:path';
import fastifyView from '@fastify/view';
import { Eta } from 'eta';
import fp from 'fastify-plugin';
import type { FastifyPluginAsync, FastifyReply } from 'fastify';
import { isProd } from '../env.js';
import { getAssetLinks } from '../lib/assets.js';
import type { RenderOptions } from '../types.js';

// Templates live next to the compiled server (dev: src/server/views; prod:
// dist/server/views — copied there by the build's view-copy step).
const viewsDir = resolve(import.meta.dirname, '../views');

const viewPlugin: FastifyPluginAsync = async (fastify) => {
  const eta = new Eta({ views: viewsDir, cache: isProd });

  await fastify.register(fastifyView, {
    engine: { eta },
    root: viewsDir,
    viewExt: 'eta',
  });

  // Shared render helper: injects common locals and wraps the page in a layout.
  fastify.decorateReply(
    'render',
    async function (
      this: FastifyReply,
      page: string,
      data: Record<string, unknown> = {},
      opts: RenderOptions = {},
    ) {
      const request = this.request;
      const locals = {
        currentUser: request.user ?? null,
        assets: getAssetLinks(),
        flash: request.flashMessages ?? [],
        isProd,
        currentPath: request.url,
      };
      const layout = opts.layout === undefined ? 'layouts/base' : opts.layout;
      const viewOpts = layout === false ? {} : { layout };
      await this.view(page, { ...locals, ...data }, viewOpts);
      return this;
    },
  );
};

export default fp(viewPlugin, { name: 'view' });
