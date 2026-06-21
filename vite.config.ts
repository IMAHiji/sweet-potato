import { defineConfig } from 'vite';
import { resolve } from 'node:path';

const clientRoot = resolve(import.meta.dirname, 'src/client');

// Vite builds ONLY the client bundle (JS + SCSS) into `public/`.
// Fastify renders the HTML (Eta) and serves these assets in production via the
// generated manifest; in dev the Eta layout points <script>/<link> at the Vite
// dev server (see src/server/lib/assets.ts).
export default defineConfig({
  root: clientRoot,
  // We never serve an index.html through Vite — Fastify owns the HTML — so run
  // the dev server in "custom" mode (no SPA fallback / index transform).
  appType: 'custom',
  build: {
    outDir: resolve(import.meta.dirname, 'public'),
    emptyOutDir: true,
    manifest: true,
    rollupOptions: {
      input: resolve(clientRoot, 'main.ts'),
    },
  },
  server: {
    port: 5173,
    strictPort: true,
    cors: true,
    // Emit absolute asset URLs so the cross-origin Fastify page (:3000) can load
    // modules from the Vite dev server (:5173).
    origin: 'http://localhost:5173',
  },
});
