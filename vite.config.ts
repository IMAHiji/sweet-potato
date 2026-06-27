import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  root: 'src/client',
  build: {
    outDir: path.resolve('public'),
    emptyOutDir: true,
    manifest: true,
    rollupOptions: {
      input: path.resolve('src/client/main.ts'),
    },
  },
  server: {
    port: 5173,
    cors: true,
  },
});
