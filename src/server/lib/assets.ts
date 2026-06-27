import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';

const isProd = process.env['NODE_ENV'] === 'production';

let manifest: Record<string, { file: string; css?: string[] }> | null = null;

function getManifest() {
  if (manifest) return manifest;
  const dir = fileURLToPath(new URL('../../..', import.meta.url));
  const path = join(dir, 'public', '.vite', 'manifest.json');
  if (!existsSync(path)) {
    throw new Error(`Vite manifest not found at ${path}. Run \`pnpm build\` first.`);
  }
  manifest = JSON.parse(readFileSync(path, 'utf-8')) as typeof manifest;
  return manifest!;
}

export function getAssetUrls(): { scriptUrl: string; styleUrl: string } {
  if (!isProd) {
    return {
      scriptUrl: 'http://localhost:5173/main.ts',
      styleUrl: '',
    };
  }
  const m = getManifest();
  const entry = m['main.ts'];
  if (!entry) throw new Error('main.ts not found in Vite manifest');
  return {
    scriptUrl: `/assets/${entry.file}`,
    styleUrl: entry.css?.[0] ? `/assets/${entry.css[0]}` : '',
  };
}
