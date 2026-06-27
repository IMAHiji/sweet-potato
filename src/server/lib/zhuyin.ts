// Pinyin → Zhuyin (Bopomofo) conversion

const TONE_MAP: Record<string, [string, number]> = {
  ā: ['a', 1], á: ['a', 2], ǎ: ['a', 3], à: ['a', 4],
  ē: ['e', 1], é: ['e', 2], ě: ['e', 3], è: ['e', 4],
  ī: ['i', 1], í: ['i', 2], ǐ: ['i', 3], ì: ['i', 4],
  ō: ['o', 1], ó: ['o', 2], ǒ: ['o', 3], ò: ['o', 4],
  ū: ['u', 1], ú: ['u', 2], ǔ: ['u', 3], ù: ['u', 4],
  ǖ: ['ü', 1], ǘ: ['ü', 2], ǚ: ['ü', 3], ǜ: ['ü', 4],
};

const TONE_MARKS = ['', '', 'ˊ', 'ˇ', 'ˋ', '˙'];

const INITIALS: Record<string, string> = {
  zh: 'ㄓ', ch: 'ㄔ', sh: 'ㄕ', b: 'ㄅ', p: 'ㄆ', m: 'ㄇ', f: 'ㄈ',
  d: 'ㄉ', t: 'ㄊ', n: 'ㄋ', l: 'ㄌ', g: 'ㄍ', k: 'ㄎ', h: 'ㄏ',
  j: 'ㄐ', q: 'ㄑ', x: 'ㄒ', r: 'ㄖ', z: 'ㄗ', c: 'ㄘ', s: 'ㄙ',
  y: 'ㄧ', w: 'ㄨ',
};

const FINALS: Record<string, string> = {
  iang: 'ㄧㄤ', iong: 'ㄩㄥ', uang: 'ㄨㄤ',
  üan: 'ㄩㄢ', uan: 'ㄨㄢ',
  ian: 'ㄧㄢ', iao: 'ㄧㄠ', ing: 'ㄧㄥ',
  ang: 'ㄤ', eng: 'ㄥ', ong: 'ㄨㄥ',
  uai: 'ㄨㄞ', ui: 'ㄨㄟ', un: 'ㄨㄣ',
  ün: 'ㄩㄣ', üe: 'ㄩㄝ',
  ao: 'ㄠ', ai: 'ㄞ', ei: 'ㄟ', an: 'ㄢ', en: 'ㄣ', ou: 'ㄡ',
  ia: 'ㄧㄚ', ie: 'ㄧㄝ', in: 'ㄧㄣ', iu: 'ㄧㄡ',
  ua: 'ㄨㄚ', uo: 'ㄨㄛ', ue: 'ㄩㄝ',
  er: 'ㄦ', a: 'ㄚ', o: 'ㄛ', e: 'ㄜ', i: 'ㄧ', u: 'ㄨ', ü: 'ㄩ',
};

const WHOLE_SYLLABLES: Record<string, string> = {
  zhi: 'ㄓ', chi: 'ㄔ', shi: 'ㄕ', ri: 'ㄖ',
  zi: 'ㄗ', ci: 'ㄘ', si: 'ㄙ',
  yi: 'ㄧ', wu: 'ㄨ', yu: 'ㄩ', ye: 'ㄧㄝ', yue: 'ㄩㄝ',
  yuan: 'ㄩㄢ', yin: 'ㄧㄣ', yun: 'ㄩㄣ', yang: 'ㄧㄤ',
  yao: 'ㄧㄠ', you: 'ㄧㄡ', yan: 'ㄧㄢ', ying: 'ㄧㄥ',
  wa: 'ㄨㄚ', wo: 'ㄨㄛ', wai: 'ㄨㄞ', wei: 'ㄨㄟ',
  wan: 'ㄨㄢ', wen: 'ㄨㄣ', wang: 'ㄨㄤ', weng: 'ㄨㄥ',
  yong: 'ㄩㄥ', er: 'ㄦ',
};

function extractTone(syllable: string): [string, number] {
  let tone = 0;
  const result = syllable
    .split('')
    .map((ch) => {
      const entry = TONE_MAP[ch];
      if (entry) { tone = entry[1]; return entry[0]; }
      return ch;
    })
    .join('');
  return [result, tone === 0 ? 1 : tone];
}

function syllableToZhuyin(raw: string): string {
  const [syl, tone] = extractTone(raw.toLowerCase().replace(/v/g, 'ü'));
  const toneMark = TONE_MARKS[tone] ?? '';

  if (WHOLE_SYLLABLES[syl]) {
    return (WHOLE_SYLLABLES[syl] ?? '') + (tone === 1 ? '' : toneMark);
  }

  let initial = '';
  let final = syl;

  const twoChar = syl.slice(0, 2);
  if (INITIALS[twoChar]) {
    initial = INITIALS[twoChar] ?? '';
    final = syl.slice(2);
  } else {
    const oneChar = syl[0] ?? '';
    if (INITIALS[oneChar]) {
      initial = INITIALS[oneChar] ?? '';
      final = syl.slice(1);
    }
  }

  // j/q/x + u → ü
  if (['ㄐ', 'ㄑ', 'ㄒ'].includes(initial)) {
    final = final.replace(/^u/, 'ü');
  }

  const zhuyinFinal = FINALS[final] ?? final;
  return initial + zhuyinFinal + (tone === 1 ? '' : toneMark);
}

export function pinyinToZhuyin(pinyin: string): string {
  return pinyin.trim().split(/\s+/).map(syllableToZhuyin).join(' ');
}
