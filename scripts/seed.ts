import { existsSync, readFileSync } from 'node:fs';
import { db, sqlite } from '../src/server/db/client.js';
import {
  characters,
  users,
  type NewCharacter,
  type Role,
} from '../src/server/db/schema.js';
import { env, parseHskLevels } from '../src/server/env.js';
import { hash } from '../src/server/lib/password.js';
import { normalizePinyin } from '../src/server/lib/pinyin.js';
import { pinyinToZhuyin } from '../src/server/lib/zhuyin.js';
import {
  CEDICT_FILE,
  HSK_FILE,
  type HskEntry,
} from './sources.js';

interface CedictEntry {
  traditional: string;
  defs: string[];
}

/** Parse CC-CEDICT (optional) into a simplified -> {traditional, defs} map. */
function buildCedictMap(): Map<string, CedictEntry> {
  const map = new Map<string, CedictEntry>();
  if (!existsSync(CEDICT_FILE)) return map;
  const text = readFileSync(CEDICT_FILE, 'utf8');
  for (const line of text.split('\n')) {
    if (!line || line.startsWith('#')) continue;
    const m = line.match(/^(\S+)\s+(\S+)\s+\[[^\]]*\]\s+\/(.*)\/\s*$/);
    if (!m) continue;
    const [, traditional, simplified, defsRaw] = m;
    if (simplified && !map.has(simplified)) {
      map.set(simplified, {
        traditional: traditional ?? simplified,
        defs: (defsRaw ?? '').split('/').filter(Boolean),
      });
    }
  }
  return map;
}

/** Lowest "new HSK" level (n1..n7) present on an entry, within [min,max]. */
function levelInRange(entry: HskEntry, min: number, max: number): number | null {
  const levels = entry.l
    .map((code) => /^n(\d)$/.exec(code))
    .filter((m): m is RegExpExecArray => m !== null)
    .map((m) => Number(m[1]))
    .filter((n) => n >= min && n <= max);
  return levels.length ? Math.min(...levels) : null;
}

async function seedCharacters(): Promise<void> {
  if (!existsSync(HSK_FILE)) {
    console.error(
      `✖ Missing ${HSK_FILE}. Run \`pnpm data:download\` first.`,
    );
    process.exit(1);
  }

  const { min, max } = parseHskLevels();
  const entries = JSON.parse(readFileSync(HSK_FILE, 'utf8')) as HskEntry[];
  const cedict = buildCedictMap();

  const rows = new Map<string, NewCharacter>(); // keyed by traditional (unique)
  const perLevel: Record<number, number> = {};
  let skipped = 0;

  for (const entry of entries) {
    if ([...entry.s].length !== 1) continue; // single characters only

    const level = levelInRange(entry, min, max);
    if (level === null) continue;

    const form = entry.f[0];
    if (!form) {
      skipped++;
      continue;
    }

    const traditional = form.t || entry.s;
    const numbered = form.i.n;

    let zhuyin: string;
    try {
      zhuyin = pinyinToZhuyin(numbered);
    } catch {
      skipped++;
      continue;
    }

    const meanings = form.m?.length
      ? form.m
      : (cedict.get(entry.s)?.defs ?? []);
    const definition = meanings.join('; ').trim();
    if (!definition) {
      skipped++;
      continue;
    }

    if (rows.has(traditional)) continue; // keep first reading (多音字 limitation)

    rows.set(traditional, {
      traditional,
      simplified: entry.s,
      pinyin: normalizePinyin(numbered),
      zhuyin,
      definition,
      hskLevel: level,
      frequencyRank: entry.q ?? null,
    });
    perLevel[level] = (perLevel[level] ?? 0) + 1;
  }

  for (const row of rows.values()) {
    await db
      .insert(characters)
      .values(row)
      .onConflictDoUpdate({
        target: characters.traditional,
        set: {
          simplified: row.simplified,
          pinyin: row.pinyin,
          zhuyin: row.zhuyin,
          definition: row.definition,
          hskLevel: row.hskLevel,
          frequencyRank: row.frequencyRank,
          updatedAt: new Date(),
        },
      });
  }

  console.log(`\nCharacters seeded (HSK ${min}-${max}):`);
  for (const lvl of Object.keys(perLevel).map(Number).sort((a, b) => a - b)) {
    console.log(`  HSK ${lvl}: ${perLevel[lvl]}`);
  }
  console.log(`  total: ${rows.size}`);
  console.log(`  skipped: ${skipped}`);
  if (cedict.size === 0) {
    console.log('  (CC-CEDICT not present — used HSK meanings only)');
  }
}

async function upsertUser(
  email: string,
  password: string,
  role: Role,
  displayName: string,
): Promise<void> {
  const passwordHash = await hash(password);
  const normalized = email.trim().toLowerCase();
  await db
    .insert(users)
    .values({ email: normalized, passwordHash, role, displayName })
    .onConflictDoUpdate({
      target: users.email,
      set: { passwordHash, role, displayName },
    });
  console.log(`  user: ${normalized} (${role})`);
}

async function seedUsers(): Promise<void> {
  console.log('\nSeeding users:');
  await upsertUser(env.ADMIN_EMAIL, env.ADMIN_PASSWORD, 'admin', 'Admin');
  await upsertUser(env.TEST_USER_EMAIL, env.TEST_USER_PASSWORD, 'user', 'Test User');
}

async function main(): Promise<void> {
  await seedCharacters();
  await seedUsers();
  sqlite.close();
  console.log('\n✓ Seed complete.');
}

main().catch((err) => {
  console.error('✖ Seed failed:', err);
  sqlite.close();
  process.exit(1);
});
