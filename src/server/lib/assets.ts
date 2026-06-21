import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { isProd } from '../env.js';

export interface AssetLinks {
  /** <script type="module"> sources, in order. */
  scripts: string[];
  /** <link rel="stylesheet"> hrefs, in order. */
  styles: string[];
}

const VITE_DEV_ORIGIN = 'http://localhost:5173';
const CLIENT_ENTRY = 'main.ts';

interface ViteManifestChunk {
  file: string;
  css?: string[];
  isEntry?: boolean;
}
type ViteManifest = Record<string, ViteManifestChunk>;

let cached: AssetLinks | null = null;

function devLinks(): AssetLinks {
  // In dev the Vite server injects CSS via the JS module (HMR), so no <link>.
  return {
    scripts: [`${VITE_DEV_ORIGIN}/@vite/client`, `${VITE_DEV_ORIGIN}/${CLIENT_ENTRY}`],
    styles: [],
  };
}

function prodLinks(): AssetLinks {
  const manifestPath = resolve(process.cwd(), 'public/.vite/manifest.json');
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as ViteManifest;
  const entry = manifest[CLIENT_ENTRY];
  if (!entry) {
    throw new Error(
      `Vite manifest missing entry "${CLIENT_ENTRY}". Did you run \`pnpm build\`?`,
    );
  }
  return {
    scripts: [`/${entry.file}`],
    styles: (entry.css ?? []).map((href) => `/${href}`),
  };
}

/** Resolve client asset URLs for the current environment (cached in prod). */
export function getAssetLinks(): AssetLinks {
  if (!isProd) return devLinks();
  if (!cached) cached = prodLinks();
  return cached;
}
