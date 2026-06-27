import { describe, it, expect } from 'vitest';
import { pinyinToZhuyin } from '../src/server/lib/zhuyin.js';
import { stripTones } from '../src/server/lib/pinyin.js';

describe('seed data transformation', () => {
  it('single character filter: keeps "一", drops "一二"', () => {
    const entries = [{ simplified: '一' }, { simplified: '一二' }];
    const filtered = entries.filter((e) => e.simplified.length === 1);
    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.simplified).toBe('一');
  });

  it('level code mapping: n1 → 1, n3 → 3', () => {
    expect(levelCodeToNumber('n1')).toBe(1);
    expect(levelCodeToNumber('n3')).toBe(3);
  });

  it('pinyinSearch is tone-stripped and spaceless', () => {
    expect(stripTones('nǐ hǎo')).toBe('nihao');
  });

  it('pinyinToZhuyin maps 你 correctly', () => {
    expect(pinyinToZhuyin('nǐ')).toBe('ㄋㄧˇ');
  });

  it('parses HSK entry into NewCharacter shape', () => {
    const entry = {
      simplified: '你',
      traditional: '你',
      pinyin: ['nǐ'],
      meanings: ['you (singular)'],
      level: 'n1',
    };
    const pinyin = entry.pinyin[0]!;
    const result = {
      traditional: entry.traditional,
      simplified: entry.simplified,
      pinyin,
      pinyinSearch: stripTones(pinyin),
      zhuyin: pinyinToZhuyin(pinyin),
      definition: entry.meanings.join('; '),
      hskLevel: levelCodeToNumber(entry.level),
    };
    expect(result.pinyinSearch).toBe('ni');
    expect(result.zhuyin).toBe('ㄋㄧˇ');
    expect(result.hskLevel).toBe(1);
  });
});

function levelCodeToNumber(code: string): number {
  return parseInt(code.replace('n', ''), 10);
}
