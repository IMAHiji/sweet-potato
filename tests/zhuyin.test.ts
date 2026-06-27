import { describe, it, expect } from 'vitest';
import { pinyinToZhuyin } from '../src/server/lib/zhuyin.js';
import { stripTones } from '../src/server/lib/pinyin.js';

describe('pinyinToZhuyin', () => {
  const cases: [string, string][] = [
    ['nǐ', 'ㄋㄧˇ'],
    ['hǎo', 'ㄏㄠˇ'],
    ['zhōng', 'ㄓㄨㄥ'],
    ['wén', 'ㄨㄣˊ'],
    ['xué', 'ㄒㄩㄝˊ'],
    ['yǔ', 'ㄩˇ'],
    ['shì', 'ㄕˋ'],
    ['rén', 'ㄖㄣˊ'],
    ['nǎ', 'ㄋㄚˇ'],
    ['lǐ', 'ㄌㄧˇ'],
    ['ér', 'ㄦˊ'],
  ];

  for (const [pinyin, expected] of cases) {
    it(`${pinyin} → ${expected}`, () => {
      expect(pinyinToZhuyin(pinyin)).toBe(expected);
    });
  }

  it('handles multi-syllable input', () => {
    expect(pinyinToZhuyin('nǐ hǎo')).toBe('ㄋㄧˇ ㄏㄠˇ');
  });
});

describe('stripTones', () => {
  it('strips tone marks and lowercases', () => {
    expect(stripTones('nǐ hǎo')).toBe('nihao');
  });

  it('strips ü → u', () => {
    expect(stripTones('lǜ')).toBe('lu');
  });

  it('handles uppercase', () => {
    expect(stripTones('Wǒ')).toBe('wo');
  });

  it('drops apostrophes', () => {
    expect(stripTones("nǚ'ér")).toBe('nuer');
  });
});
