import { existsSync, readFileSync } from 'node:fs';
import { CEDICT_FILE } from '../sources.js';
import { readingKey } from './pinyin-key.js';

interface CedictReading {
  /** Reading key from the bracketed pinyin, e.g. "dou1". */
  key: string | null;
  gloss: string;
}

export type CedictMap = Map<string, CedictReading[]>;

/**
 * Build a map of traditional headword -> its CC-CEDICT readings (in file
 * order). Each reading keeps its pinyin key so the seed can match the gloss to
 * the chosen MOEDICT/HSK reading rather than blindly taking the first entry
 * (which is often a surname). Empty map if the file isn't downloaded.
 *
 * Line format: `傳統 传统 [chuan2 tong3] /tradition/convention/.../`
 */
export function buildCedictMap(): CedictMap {
  const map: CedictMap = new Map();
  if (!existsSync(CEDICT_FILE)) return map;

  const text = readFileSync(CEDICT_FILE, 'utf8');
  for (const line of text.split('\n')) {
    if (!line || line.startsWith('#')) continue;
    const m = line.match(/^(\S+)\s+(\S+)\s+\[([^\]]*)\]\s+\/(.*)\/\s*$/);
    if (!m) continue;
    const traditional = m[1];
    if (!traditional) continue;
    const gloss = (m[4] ?? '')
      .split('/')
      .filter(Boolean)
      .join('; ')
      .trim();
    if (!gloss) continue;
    const readings = map.get(traditional) ?? [];
    readings.push({ key: readingKey(m[3]), gloss });
    map.set(traditional, readings);
  }
  return map;
}

/**
 * Look up the English gloss for a headword, preferring the CC-CEDICT entry
 * whose pinyin matches the chosen reading and falling back to the first entry.
 */
export function cedictGloss(
  map: CedictMap,
  traditional: string,
  numberedPinyin: string,
): string | null {
  const readings = map.get(traditional);
  if (!readings || readings.length === 0) return null;
  const want = readingKey(numberedPinyin);
  const match = want ? readings.find((r) => r.key === want) : undefined;
  return (match ?? readings[0]!).gloss;
}
