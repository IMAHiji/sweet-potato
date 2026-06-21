// Pinyin normalization helpers: parse tone-marked OR numbered pinyin, and
// render tone-marked syllables. Pure functions, no I/O.

interface ParsedSyllable {
  /** Toneless, lowercase base with ü written as 'ü'. */
  base: string;
  /** 0 = neutral, 1-4 = tones. */
  tone: number;
}

// Accented vowel -> [base vowel, tone].
const ACCENT: Record<string, { base: string; tone: number }> = {
  ā: { base: 'a', tone: 1 },
  á: { base: 'a', tone: 2 },
  ǎ: { base: 'a', tone: 3 },
  à: { base: 'a', tone: 4 },
  ō: { base: 'o', tone: 1 },
  ó: { base: 'o', tone: 2 },
  ǒ: { base: 'o', tone: 3 },
  ò: { base: 'o', tone: 4 },
  ē: { base: 'e', tone: 1 },
  é: { base: 'e', tone: 2 },
  ě: { base: 'e', tone: 3 },
  è: { base: 'e', tone: 4 },
  ī: { base: 'i', tone: 1 },
  í: { base: 'i', tone: 2 },
  ǐ: { base: 'i', tone: 3 },
  ì: { base: 'i', tone: 4 },
  ū: { base: 'u', tone: 1 },
  ú: { base: 'u', tone: 2 },
  ǔ: { base: 'u', tone: 3 },
  ù: { base: 'u', tone: 4 },
  ǖ: { base: 'ü', tone: 1 },
  ǘ: { base: 'ü', tone: 2 },
  ǚ: { base: 'ü', tone: 3 },
  ǜ: { base: 'ü', tone: 4 },
  ń: { base: 'n', tone: 2 },
  ň: { base: 'n', tone: 3 },
  ǹ: { base: 'n', tone: 4 },
};

// base vowel -> tone-marked variants indexed by tone (0..4).
const TONE_MARK: Record<string, string[]> = {
  a: ['a', 'ā', 'á', 'ǎ', 'à'],
  o: ['o', 'ō', 'ó', 'ǒ', 'ò'],
  e: ['e', 'ē', 'é', 'ě', 'è'],
  i: ['i', 'ī', 'í', 'ǐ', 'ì'],
  u: ['u', 'ū', 'ú', 'ǔ', 'ù'],
  ü: ['ü', 'ǖ', 'ǘ', 'ǚ', 'ǜ'],
};

/** Parse one syllable (numbered, tone-marked, or plain) into base + tone. */
export function parseSyllable(raw: string): ParsedSyllable {
  let s = raw.trim().toLowerCase().replace(/u:/g, 'ü').replace(/v/g, 'ü');

  const numbered = s.match(/([0-5])$/);
  if (numbered) {
    s = s.slice(0, -1);
    const t = Number(numbered[1]);
    return { base: s, tone: t === 5 ? 0 : t };
  }

  let tone = 0;
  let base = '';
  for (const ch of s) {
    const accent = ACCENT[ch];
    if (accent) {
      base += accent.base;
      if (accent.tone) tone = accent.tone;
    } else {
      base += ch;
    }
  }
  return { base, tone };
}

/** Which vowel in a toneless base carries the tone mark (standard rules). */
function toneTargetIndex(base: string): number {
  const a = base.indexOf('a');
  if (a !== -1) return a;
  const e = base.indexOf('e');
  if (e !== -1) return e;
  const ou = base.indexOf('ou');
  if (ou !== -1) return ou; // mark the 'o'
  // otherwise the last vowel
  for (let i = base.length - 1; i >= 0; i--) {
    if ('aeiouü'.includes(base[i]!)) return i;
  }
  return -1;
}

/** Render one syllable as tone-marked pinyin (e.g. "ni3" -> "nǐ"). */
export function toToneMarked(raw: string): string {
  const { base, tone } = parseSyllable(raw);
  if (tone === 0) return base;
  const idx = toneTargetIndex(base);
  if (idx === -1) return base;
  const vowel = base[idx]!;
  const marked = TONE_MARK[vowel]?.[tone];
  if (!marked) return base;
  return base.slice(0, idx) + marked + base.slice(idx + 1);
}

/** Split a pinyin string into individual syllables. */
export function splitSyllables(pinyin: string): string[] {
  return pinyin
    .trim()
    .split(/[\s'·]+/)
    .filter(Boolean);
}

/** Normalize a whole pinyin string to space-joined tone-marked syllables. */
export function normalizePinyin(pinyin: string): string {
  return splitSyllables(pinyin).map(toToneMarked).join(' ');
}
