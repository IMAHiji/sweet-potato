import { existsSync, mkdirSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { gunzipSync } from 'node:zlib';
import {
  CEDICT_FILE,
  CEDICT_URL,
  DATA_DIR,
  HSK_FILE,
  HSK_URL,
} from './sources.js';

const force = process.argv.includes('--force');

async function fetchToFile(
  url: string,
  dest: string,
  opts: { gunzip?: boolean } = {},
): Promise<void> {
  if (existsSync(dest) && !force) {
    console.log(`• cached  ${dest}`);
    return;
  }
  console.log(`• fetch   ${url}`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`);
  const raw = Buffer.from(await res.arrayBuffer());
  const out = opts.gunzip ? gunzipSync(raw) : raw;
  await writeFile(dest, out);
  console.log(`  saved   ${dest} (${out.length.toLocaleString()} bytes)`);
}

async function main(): Promise<void> {
  mkdirSync(DATA_DIR, { recursive: true });

  // HSK dataset is required.
  await fetchToFile(HSK_URL, HSK_FILE);

  // CC-CEDICT is optional enrichment — don't fail the whole download if it's
  // unavailable.
  try {
    await fetchToFile(CEDICT_URL, CEDICT_FILE, { gunzip: true });
  } catch (err) {
    console.warn(
      `! CC-CEDICT download failed (optional): ${(err as Error).message}`,
    );
  }

  console.log('✓ Data download complete.');
}

main().catch((err) => {
  console.error('✖ Download failed:', err);
  process.exit(1);
});
