// Copies non-TS server assets (Eta templates + SQL migrations) into dist/ after
// `tsc`, since tsc only emits .js. Run as part of `pnpm build`.
import { cpSync, existsSync } from 'node:fs';

cpSync('src/server/views', 'dist/server/views', { recursive: true });

if (existsSync('src/server/db/migrations')) {
  cpSync('src/server/db/migrations', 'dist/server/db/migrations', {
    recursive: true,
  });
}

console.log('✓ Copied views + migrations into dist/.');
