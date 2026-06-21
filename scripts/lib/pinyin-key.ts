import { parseSyllable } from '../../src/server/lib/pinyin.js';

/**
 * A normalized single-syllable comparison key (toneless base + tone number,
 * e.g. "ni3"), used to match a chosen HSK reading against MOEDICT heteronyms
 * and CC-CEDICT entries regardless of numbered/tone-marked/case differences.
 * Takes the first syllable — our headwords are single characters.
 */
export function readingKey(pinyin: string | undefined): string | null {
  if (!pinyin) return null;
  const first = pinyin.trim().split(/[\s'··]+/)[0];
  if (!first) return null;
  const { base, tone } = parseSyllable(first);
  return `${base}${tone}`;
}
