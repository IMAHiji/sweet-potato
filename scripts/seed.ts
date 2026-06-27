#!/usr/bin/env tsx
import { readFile } from 'fs/promises';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { sql } from 'drizzle-orm';
import { db, sqlite } from '../src/server/db/client.js';
import { characters } from '../src/server/db/schema.js';
import type { NewCharacter } from '../src/server/db/schema.js';
import { pinyinToZhuyin } from '../src/server/lib/zhuyin.js';
import { stripTones } from '../src/server/lib/pinyin.js';
import { seedUsers } from './seed-users.js';
import { env } from '../src/server/env.js';

const dataDir = join(fileURLToPath(import.meta.url), '../data');

/** Parse "1-3" → [1, 2, 3], "4" → [4] */
export function parseLevelRange(range: string): number[] {
  const parts = range.split('-');
  const start = parseInt(parts[0] ?? '1', 10);
  const end = parts.length > 1 ? parseInt(parts[1] ?? start.toString(), 10) : start;
  const levels: number[] = [];
  for (let i = start; i <= end; i++) levels.push(i);
  return levels;
}

/** "n1" → 1, "n7" → 7 */
export function levelCodeToNumber(code: string): number {
  return parseInt(code.replace('n', ''), 10);
}

type CedictEntry = { traditional: string; definition: string };

/** Parse CC-CEDICT text into a map keyed by simplified character. */
export function parseCedict(text: string): Map<string, CedictEntry> {
  const map = new Map<string, CedictEntry>();
  for (const rawLine of text.split('\n')) {
    const line = rawLine.trimEnd();
    if (line.startsWith('#') || !line.trim()) continue;
    // Format: Traditional Simplified [pinyin] /def1/def2/
    const match = /^(\S+)\s+(\S+)\s+\[([^\]]+)\]\s+\/(.+)\/$/.exec(line);
    if (!match) continue;
    const traditional = match[1];
    const simplified = match[2];
    const defRaw = match[4];
    if (!traditional || !simplified || !defRaw) continue;
    const definition = defRaw.split('/').filter(Boolean).join('; ');
    // Keep first entry per simplified character (most common reading)
    if (!map.has(simplified)) {
      map.set(simplified, { traditional, definition });
    }
  }
  return map;
}

// ── Actual drkameleon/complete-hsk-vocabulary compact JSON format ─────────────
interface HskForm {
  t: string;    // traditional
  i: {
    y: string;  // pinyin with diacritics
    n: string;  // pinyin numbered
    w: string;  // Wade-Giles
    b: string;  // bopomofo
    g: string;  // Gwoyeu Romatzyh
  };
  m: string[];  // meanings
  c: string[];  // classifiers
}

interface HskEntry {
  s: string;      // simplified
  r: string;      // radical
  l: string[];    // level codes, e.g. ["t1","n1","o1"]
  q: number;      // frequency rank
  p: string[];    // part of speech
  f: HskForm[];   // forms/readings
}

// ── Load data files ─────────────────────────────────────────────────────────

const hskPath = join(dataDir, 'hsk-complete.min.json');
const cedictPath = join(dataDir, 'cedict_ts.u8');

let hskEntries: HskEntry[];
try {
  const hskRaw = await readFile(hskPath, 'utf-8');
  hskEntries = JSON.parse(hskRaw) as HskEntry[];
} catch {
  console.error(`Error: HSK data not found at ${hskPath}`);
  console.error('Run "pnpm data:download" first.');
  process.exit(1);
}

let cedictMap: Map<string, CedictEntry>;
try {
  const cedictRaw = await readFile(cedictPath, 'utf-8');
  cedictMap = parseCedict(cedictRaw);
} catch {
  console.error(`Error: CC-CEDICT not found at ${cedictPath}`);
  console.error('Run "pnpm data:download" first.');
  process.exit(1);
}

// ── Filter & seed ────────────────────────────────────────────────────────────

const targetLevels = parseLevelRange(env.HSK_LEVELS);
const targetCodes = new Set(targetLevels.map((n) => `n${n}`));

let seeded = 0;
let skippedMultiChar = 0;
const byLevel: Record<number, number> = {};

for (const entry of hskEntries) {
  // Find which HSK 3.0 level code this entry belongs to (prefix 'n')
  const nLevel = entry.l.find((l) => l.startsWith('n'));
  if (!nLevel || !targetCodes.has(nLevel)) continue;

  // Single-character filter
  if (entry.s.length !== 1) {
    skippedMultiChar++;
    continue;
  }

  const form = entry.f[0];
  if (!form) continue;

  const pinyin = form.i.y;
  if (!pinyin) continue;

  const zhuyin = pinyinToZhuyin(pinyin);
  const pinyinSearch = stripTones(pinyin);
  const cedictEntry = cedictMap.get(entry.s);
  const traditional = cedictEntry?.traditional ?? form.t;
  const definition = cedictEntry?.definition ?? form.m.join('; ');
  const hskLevel = levelCodeToNumber(nLevel);

  const row: NewCharacter = {
    traditional,
    simplified: entry.s,
    pinyin,
    pinyinSearch,
    zhuyin,
    definition,
    hskLevel,
  };

  db.insert(characters)
    .values(row)
    .onConflictDoUpdate({
      target: characters.traditional,
      set: {
        simplified: sql`excluded.simplified`,
        pinyin: sql`excluded.pinyin`,
        pinyinSearch: sql`excluded.pinyin_search`,
        zhuyin: sql`excluded.zhuyin`,
        definition: sql`excluded.definition`,
        hskLevel: sql`excluded.hsk_level`,
        updatedAt: sql`(unixepoch())`,
      },
    })
    .run();

  seeded++;
  byLevel[hskLevel] = (byLevel[hskLevel] ?? 0) + 1;
}

await seedUsers(db);

// ── Summary ──────────────────────────────────────────────────────────────────

console.log('\nSeed complete:');
for (const level of targetLevels) {
  const count = byLevel[level] ?? 0;
  if (count > 0) console.log(`  HSK${level}: ${count} characters`);
}
console.log(`  Total: ${seeded} characters seeded/updated`);
if (skippedMultiChar > 0) {
  console.log(
    `  Skipped: ${skippedMultiChar} multi-character entries (words, not single chars)`,
  );
}

sqlite.close();
