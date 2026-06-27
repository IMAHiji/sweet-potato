#!/usr/bin/env tsx
import { existsSync, mkdirSync, createWriteStream, createReadStream } from 'fs';
import { writeFile } from 'fs/promises';
import { createGunzip } from 'zlib';
import { pipeline } from 'stream/promises';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { SOURCES } from './sources.js';

const dataDir = join(fileURLToPath(import.meta.url), '../data');
const force = process.argv.includes('--force');
mkdirSync(dataDir, { recursive: true });

async function download(url: string, destPath: string): Promise<void> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  const buf = await res.arrayBuffer();
  await writeFile(destPath, Buffer.from(buf));
}

// Download HSK JSON
const hskPath = join(dataDir, SOURCES.HSK.filename);
if (!force && existsSync(hskPath)) {
  console.log('HSK data: already cached. Use --force to refresh.');
} else {
  console.log('Downloading HSK data…');
  await download(SOURCES.HSK.url, hskPath);
  console.log('HSK data downloaded.');
}

// Download CC-CEDICT (gzipped)
const cedictGzPath = join(dataDir, SOURCES.CEDICT.filename);
const cedictPath = join(dataDir, 'cedict_ts.u8');
if (!force && existsSync(cedictPath)) {
  console.log('CC-CEDICT: already cached.');
} else {
  console.log('Downloading CC-CEDICT…');
  await download(SOURCES.CEDICT.url, cedictGzPath);
  // Decompress
  const src = createReadStream(cedictGzPath);
  const dst = createWriteStream(cedictPath);
  await pipeline(src, createGunzip(), dst);
  console.log('CC-CEDICT downloaded and decompressed.');
}

console.log('Done. Data files in scripts/data/');
