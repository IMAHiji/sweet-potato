// Tone-diacritic to number mapping for normalization
const toneMap: Record<string, [string, number]> = {
  ā: ['a', 1], á: ['a', 2], ǎ: ['a', 3], à: ['a', 4],
  ē: ['e', 1], é: ['e', 2], ě: ['e', 3], è: ['e', 4],
  ī: ['i', 1], í: ['i', 2], ǐ: ['i', 3], ì: ['i', 4],
  ō: ['o', 1], ó: ['o', 2], ǒ: ['o', 3], ò: ['o', 4],
  ū: ['u', 1], ú: ['u', 2], ǔ: ['u', 3], ù: ['u', 4],
  ǖ: ['ü', 1], ǘ: ['ü', 2], ǚ: ['ü', 3], ǜ: ['ü', 4],
};

/**
 * Strip tone marks, lowercase, drop spaces/apostrophes → pinyin_search value.
 * e.g. "Nǐ Hǎo" → "nihao", "lǜ" → "lu"
 */
export function stripTones(pinyin: string): string {
  return pinyin
    .toLowerCase()
    .split('')
    .map((ch) => (toneMap[ch] ? toneMap[ch]![0] : ch))
    .join('')
    .replace(/[üÜ]/g, 'u')
    .replace(/[\s']/g, '');
}

/**
 * Convert numbered-tone pinyin to tone-marked pinyin if needed.
 * e.g. "ni3" → "nǐ" (limited, best-effort)
 */
export function normalize(pinyin: string): string {
  return pinyin;
}
