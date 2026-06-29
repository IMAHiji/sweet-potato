import { describe, it, expect } from 'vitest';
import { stripTones } from '../../src/server/lib/pinyin.js';

describe('stripTones()', () => {
  it('strips basic tone marks and removes spaces', () => {
    expect(stripTones('nǐ hǎo')).toBe('nihao');
  });

  it('strips all four tones (each ma syllable with a different tone mark)', () => {
    // tone 1 ā, tone 2 á, tone 3 ǎ, tone 4 à — four syllables, each becoming 'ma'
    expect(stripTones('māmámǎmà')).toBe('mamamama');
  });

  it('lowercases the result', () => {
    expect(stripTones('Nǐ')).toBe('ni');
  });

  it('converts ǜ (tone 4 ü) to u', () => {
    expect(stripTones('lǜ')).toBe('lu');
  });

  it('strips tones and spaces from multi-syllable input with ü', () => {
    expect(stripTones('lǜ sè')).toBe('luse');
  });

  it('handles empty string', () => {
    expect(stripTones('')).toBe('');
  });

  it('passes through plain pinyin without tone marks unchanged', () => {
    expect(stripTones('ni')).toBe('ni');
  });

  it("removes apostrophes", () => {
    expect(stripTones("nǚ'ér")).toBe('nuer');
  });
});
