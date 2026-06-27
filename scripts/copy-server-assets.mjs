// Copies non-JS server assets into dist/ after tsc.
// tsc only emits .js; Eta views and SQL migrations must be copied manually.
import { cp, mkdir } from 'fs/promises';
import { existsSync } from 'fs';

const copies = [
  { src: 'src/server/views', dest: 'dist/server/views' },
  { src: 'src/server/db/migrations', dest: 'dist/server/db/migrations' },
];

for (const { src, dest } of copies) {
  if (!existsSync(src)) continue;
  await mkdir(dest, { recursive: true });
  await cp(src, dest, { recursive: true });
  console.log(`copied ${src} → ${dest}`);
}
