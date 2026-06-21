// Deterministic pinyin -> zhuyin (bopomofo) converter. Pure functions, no I/O.
// Works syllable-by-syllable from a toneless base + tone (see lib/pinyin.ts).

import { parseSyllable, splitSyllables } from './pinyin.js';

const INITIALS: Record<string, string> = {
  b: 'ㄅ',
  p: 'ㄆ',
  m: 'ㄇ',
  f: 'ㄈ',
  d: 'ㄉ',
  t: 'ㄊ',
  n: 'ㄋ',
  l: 'ㄌ',
  g: 'ㄍ',
  k: 'ㄎ',
  h: 'ㄏ',
  j: 'ㄐ',
  q: 'ㄑ',
  x: 'ㄒ',
  zh: 'ㄓ',
  ch: 'ㄔ',
  sh: 'ㄕ',
  r: 'ㄖ',
  z: 'ㄗ',
  c: 'ㄘ',
  s: 'ㄙ',
};

const FINALS: Record<string, string> = {
  a: 'ㄚ',
  o: 'ㄛ',
  e: 'ㄜ',
  ê: 'ㄝ',
  ai: 'ㄞ',
  ei: 'ㄟ',
  ao: 'ㄠ',
  ou: 'ㄡ',
  an: 'ㄢ',
  en: 'ㄣ',
  ang: 'ㄤ',
  eng: 'ㄥ',
  ong: 'ㄨㄥ',
  er: 'ㄦ',
  i: 'ㄧ',
  ia: 'ㄧㄚ',
  ie: 'ㄧㄝ',
  iao: 'ㄧㄠ',
  iou: 'ㄧㄡ',
  iu: 'ㄧㄡ',
  ian: 'ㄧㄢ',
  in: 'ㄧㄣ',
  iang: 'ㄧㄤ',
  ing: 'ㄧㄥ',
  iong: 'ㄩㄥ',
  u: 'ㄨ',
  ua: 'ㄨㄚ',
  uo: 'ㄨㄛ',
  uai: 'ㄨㄞ',
  uei: 'ㄨㄟ',
  ui: 'ㄨㄟ',
  uan: 'ㄨㄢ',
  uen: 'ㄨㄣ',
  un: 'ㄨㄣ',
  uang: 'ㄨㄤ',
  ueng: 'ㄨㄥ',
  ü: 'ㄩ',
  üe: 'ㄩㄝ',
  üan: 'ㄩㄢ',
  ün: 'ㄩㄣ',
};

const TONE_MARKS: Record<number, string> = {
  1: '',
  2: 'ˊ',
  3: 'ˇ',
  4: 'ˋ',
};
const NEUTRAL_MARK = '˙';

const EMPTY_RIME_INITIALS = new Set(['zh', 'ch', 'sh', 'r', 'z', 'c', 's']);

/** Split a toneless base into [initial, final], normalizing y/w/j/q/x spellings. */
function splitBase(base: string): { initial: string; final: string } {
  // Zero-initial spellings beginning with y / w.
  if (base.startsWith('y')) {
    if (base.startsWith('yu')) return { initial: '', final: 'ü' + base.slice(2) };
    if (base.startsWith('yi')) return { initial: '', final: base.slice(1) };
    return { initial: '', final: 'i' + base.slice(1) };
  }
  if (base.startsWith('w')) {
    if (base.startsWith('wu')) return { initial: '', final: base.slice(1) };
    return { initial: '', final: 'u' + base.slice(1) };
  }

  let initial = '';
  let final = base;
  const two = base.slice(0, 2);
  if (two === 'zh' || two === 'ch' || two === 'sh') {
    initial = two;
    final = base.slice(2);
  } else if ('bpmfdtnlgkhjqxrzcs'.includes(base[0] ?? '')) {
    initial = base[0]!;
    final = base.slice(1);
  }

  // After j/q/x a written 'u' is actually 'ü'.
  if ((initial === 'j' || initial === 'q' || initial === 'x') && final.startsWith('u')) {
    final = 'ü' + final.slice(1);
  }

  return { initial, final };
}

/** Convert a single toneless base + tone to zhuyin. Throws on unmappable input. */
export function syllableToZhuyin(base: string, tone: number): string {
  if (!base) throw new Error('empty syllable');

  const { initial, final } = splitBase(base);

  let finalSymbols: string;
  if (final === 'i' && EMPTY_RIME_INITIALS.has(initial)) {
    finalSymbols = ''; // empty rime: zhi/chi/shi/ri/zi/ci/si
  } else if (final === '') {
    finalSymbols = '';
  } else {
    const mapped = FINALS[final];
    if (mapped === undefined) {
      throw new Error(`unmappable final "${final}" in syllable "${base}"`);
    }
    finalSymbols = mapped;
  }

  const initialSymbol = initial ? (INITIALS[initial] ?? '') : '';
  const core = initialSymbol + finalSymbols;
  if (!core) throw new Error(`unmappable syllable "${base}"`);

  if (tone === 0) return NEUTRAL_MARK + core;
  return core + (TONE_MARKS[tone] ?? '');
}

/** Convert a (possibly multi-syllable, numbered or marked) pinyin string to zhuyin. */
export function pinyinToZhuyin(pinyin: string): string {
  return splitSyllables(pinyin)
    .map((syllable) => {
      const { base, tone } = parseSyllable(syllable);
      return syllableToZhuyin(base, tone);
    })
    .join(' ');
}
