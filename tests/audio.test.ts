import { describe, it, expect } from 'vitest';
import { pickVoice } from '../src/client/components/audio.js';

function makeVoice(lang: string, name: string): SpeechSynthesisVoice {
  return { lang, name, default: false, localService: true, voiceURI: name } as SpeechSynthesisVoice;
}

describe('pickVoice', () => {
  it('prefers zh-TW over zh-CN', () => {
    const voices = [makeVoice('zh-CN', 'CN'), makeVoice('zh-TW', 'TW')];
    expect(pickVoice(voices)?.lang).toBe('zh-TW');
  });

  it('falls back to zh-CN when no preferred zh voice', () => {
    const voices = [makeVoice('zh-CN', 'CN'), makeVoice('en-US', 'EN')];
    expect(pickVoice(voices)?.lang).toBe('zh-CN');
  });

  it('returns null when no zh voice exists', () => {
    const voices = [makeVoice('en-US', 'EN'), makeVoice('fr-FR', 'FR')];
    expect(pickVoice(voices)).toBeNull();
  });

  it('prefers zh-HK over zh', () => {
    const voices = [makeVoice('zh', 'ZH'), makeVoice('zh-HK', 'HK')];
    expect(pickVoice(voices)?.lang).toBe('zh-HK');
  });
});
