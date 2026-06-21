import { db, sqlite } from '../src/server/db/client.js';
import {
  characterAudio,
  characters,
  users,
  type NewCharacter,
  type Role,
} from '../src/server/db/schema.js';
import { env, parseHskLevels } from '../src/server/env.js';
import { hash } from '../src/server/lib/password.js';
import { normalizePinyin } from '../src/server/lib/pinyin.js';
import { pinyinToZhuyin } from '../src/server/lib/zhuyin.js';
import { buildCedictMap, cedictGloss } from './lib/cedict.js';
import { selectHeadwords } from './lib/hsk.js';
import { pickReading, readMoedictEntry } from './lib/moedict.js';
import { renderAudio, ttsConfigFromEnv } from './lib/tts.js';

async function seedCharacters(): Promise<void> {
  const { min, max } = parseHskLevels();
  const headwords = selectHeadwords(min, max);
  const cedict = buildCedictMap();
  const tts = ttsConfigFromEnv();

  const perLevel: Record<number, number> = {};
  let moedictFallback = 0;
  let skipped = 0;
  let audioOk = 0;
  let audioFail = 0;

  for (const h of headwords) {
    const entry = readMoedictEntry(h.traditional);
    const reading = entry ? pickReading(entry, h.numberedPinyin) : null;

    let zhuyin: string;
    let pinyin: string;
    let definitionZh: string | null;
    if (reading) {
      zhuyin = reading.zhuyin;
      pinyin = reading.pinyin || normalizePinyin(h.numberedPinyin);
      definitionZh = reading.definitionZh || null;
    } else {
      // No MOEDICT entry/reading — derive zhuyin locally, no Chinese definition.
      moedictFallback++;
      try {
        zhuyin = pinyinToZhuyin(h.numberedPinyin);
      } catch {
        skipped++;
        continue;
      }
      pinyin = normalizePinyin(h.numberedPinyin);
      definitionZh = null;
    }

    const glossEn =
      h.glossHsk || cedictGloss(cedict, h.traditional, h.numberedPinyin) || null;

    const row: NewCharacter = {
      traditional: h.traditional,
      simplified: h.simplified,
      pinyin,
      zhuyin,
      glossEn,
      definitionZh,
      hskLevel: h.hskLevel,
      frequencyRank: h.frequencyRank,
    };

    const [upserted] = await db
      .insert(characters)
      .values(row)
      .onConflictDoUpdate({
        target: characters.traditional,
        set: {
          simplified: row.simplified,
          pinyin: row.pinyin,
          zhuyin: row.zhuyin,
          glossEn: row.glossEn,
          definitionZh: row.definitionZh,
          hskLevel: row.hskLevel,
          frequencyRank: row.frequencyRank,
          updatedAt: new Date(),
        },
      })
      .returning({ id: characters.id });

    perLevel[h.hskLevel] = (perLevel[h.hskLevel] ?? 0) + 1;

    // Render + store the zh-TW pronunciation audio (cached on disk).
    if (tts && upserted) {
      try {
        const audio = await renderAudio(h.traditional, tts);
        await db
          .insert(characterAudio)
          .values({
            characterId: upserted.id,
            mime: audio.mime,
            voice: audio.voice,
            data: audio.bytes,
          })
          .onConflictDoUpdate({
            target: characterAudio.characterId,
            set: { mime: audio.mime, voice: audio.voice, data: audio.bytes },
          });
        audioOk++;
      } catch (err) {
        audioFail++;
        if (audioFail <= 3) {
          console.warn(`  ! audio ${h.traditional}: ${(err as Error).message}`);
        }
      }
    }
  }

  console.log(`\nCharacters seeded (HSK ${min}-${max}):`);
  for (const lvl of Object.keys(perLevel).map(Number).sort((a, b) => a - b)) {
    console.log(`  HSK ${lvl}: ${perLevel[lvl]}`);
  }
  console.log(`  total: ${headwords.length - skipped}`);
  console.log(`  MOEDICT fallback (local zhuyin, no 釋義): ${moedictFallback}`);
  if (skipped) console.log(`  skipped (no reading at all): ${skipped}`);
  if (tts) {
    console.log(`  audio: ${audioOk} rendered/cached, ${audioFail} failed`);
  } else {
    console.log('  audio: skipped (set AZURE_SPEECH_KEY + AZURE_SPEECH_REGION)');
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
  await upsertUser(
    env.TEST_USER_EMAIL,
    env.TEST_USER_PASSWORD,
    'user',
    'Test User',
  );
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
