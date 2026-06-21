import { existsSync, mkdirSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { gunzipSync } from 'node:zlib';
import { parseLevelRange, selectHeadwords } from './lib/hsk.js';
import {
  CEDICT_FILE,
  CEDICT_URL,
  DATA_DIR,
  HSK_FILE,
  HSK_URL,
  MOEDICT_API_BASE,
  MOEDICT_DIR,
} from './sources.js';

const force = process.argv.includes('--force');

// HSK level range governs how many MOEDICT entries we fetch. Loaded standalone
// (download only needs HSK_LEVELS, not the full validated server env).
if (existsSync('.env')) process.loadEnvFile('.env');
const HSK_LEVELS = process.env.HSK_LEVELS ?? '1-3';

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

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Fetch the MOEDICT 國語 entry for each HSK-selected headword and cache it to
 * MOEDICT_DIR. Skips cached files, throttles to stay polite, and tolerates
 * missing entries (a few HSK chars have no MOEDICT 國語 entry — the seed falls
 * back for those).
 */
async function downloadMoedict(): Promise<void> {
  const { min, max } = parseLevelRange(HSK_LEVELS);
  const headwords = selectHeadwords(min, max);
  mkdirSync(MOEDICT_DIR, { recursive: true });

  let fetched = 0;
  let cached = 0;
  let missing = 0;

  for (const { traditional } of headwords) {
    const dest = resolve(MOEDICT_DIR, `${traditional}.json`);
    if (existsSync(dest) && !force) {
      cached++;
      continue;
    }
    const url = `${MOEDICT_API_BASE}${encodeURIComponent(traditional)}.json`;
    try {
      const res = await fetch(url);
      if (res.status === 404) {
        missing++;
        continue;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      await writeFile(dest, text);
      fetched++;
    } catch (err) {
      console.warn(`  ! ${traditional}: ${(err as Error).message}`);
      missing++;
    }
    await sleep(80); // be gentle with moedict.tw
  }

  console.log(
    `  MOEDICT (HSK ${min}-${max}): ${fetched} fetched, ${cached} cached, ${missing} missing of ${headwords.length}`,
  );
}

async function main(): Promise<void> {
  mkdirSync(DATA_DIR, { recursive: true });

  // HSK dataset is required (drives selection + grading).
  await fetchToFile(HSK_URL, HSK_FILE);

  // CC-CEDICT supplies the English gloss.
  try {
    await fetchToFile(CEDICT_URL, CEDICT_FILE, { gunzip: true });
  } catch (err) {
    console.warn(
      `! CC-CEDICT download failed: ${(err as Error).message}`,
    );
  }

  // MOEDICT supplies zhuyin + Chinese definition (one file per headword).
  await downloadMoedict();

  console.log('✓ Data download complete.');
}

main().catch((err) => {
  console.error('✖ Download failed:', err);
  process.exit(1);
});
