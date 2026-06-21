import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { readingKey } from './pinyin-key.js';
import {
  MOEDICT_DIR,
  type MoedictEntry,
  type MoedictHeteronym,
} from '../sources.js';

// Cap how many MOEDICT senses we keep in the Chinese definition so a few
// heavily-polysemous characters don't produce enormous strings.
const SENSE_CAP = 6;

export interface MoedictReading {
  zhuyin: string;
  pinyin: string;
  definitionZh: string;
  examples: string[];
}

/** Read and parse the cached MOEDICT entry for a traditional headword. */
export function readMoedictEntry(traditional: string): MoedictEntry | null {
  const file = resolve(MOEDICT_DIR, `${traditional}.json`);
  if (!existsSync(file)) return null;
  try {
    return JSON.parse(readFileSync(file, 'utf8')) as MoedictEntry;
  } catch {
    return null;
  }
}

function buildDefinitionZh(h: MoedictHeteronym): {
  definitionZh: string;
  examples: string[];
} {
  const senses: string[] = [];
  const examples: string[] = [];
  for (const d of h.definitions ?? []) {
    if (d.def) {
      const sense = d.type ? `（${d.type}）${d.def}` : d.def;
      if (senses.length < SENSE_CAP) senses.push(sense.trim());
    }
    if (d.example) examples.push(...d.example);
  }
  return { definitionZh: senses.join('\n'), examples };
}

/**
 * Pick the MOEDICT reading for a headword, preferring the heteronym whose
 * pinyin matches the HSK reading (disambiguates 多音字) and otherwise falling
 * back to the first heteronym that carries zhuyin. Returns null if no heteronym
 * has zhuyin.
 */
export function pickReading(
  entry: MoedictEntry,
  numberedPinyin: string,
): MoedictReading | null {
  const heteronyms = (entry.heteronyms ?? []).filter((h) =>
    h.bopomofo?.trim(),
  );
  if (heteronyms.length === 0) return null;

  const want = readingKey(numberedPinyin);
  const match = heteronyms.find(
    (h) => want !== null && readingKey(h.pinyin ?? h.bopomofo2) === want,
  );
  const chosen = match ?? heteronyms[0]!;

  const { definitionZh, examples } = buildDefinitionZh(chosen);
  return {
    zhuyin: chosen.bopomofo!.trim(),
    pinyin: (chosen.pinyin ?? chosen.bopomofo2 ?? '').trim(),
    definitionZh,
    examples,
  };
}
