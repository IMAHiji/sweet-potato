import type { Alpine as AlpineType } from 'alpinejs';

export interface Speaker {
  available: boolean;
  speak(text: string): void;
  cancel(): void;
}

/** Pure — pick best Chinese voice. Exported for unit tests. */
export function pickVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  const langPriority = ['zh-TW', 'zh-HK', 'zh', 'zh-CN', 'zh-SG'];
  for (const lang of langPriority) {
    const match = voices.find((v) => v.lang === lang || v.lang.startsWith(lang + '-'));
    if (match) return match;
  }
  return null;
}

interface AudioStore extends Speaker {
  voiceName: string;
  autoPlay: boolean;
  toggleAutoPlay(): void;
}

export function registerAudio(Alpine: AlpineType) {
  let voice: SpeechSynthesisVoice | null = null;

  const store: AudioStore = {
    available: false,
    voiceName: '',
    autoPlay: localStorage.getItem('audio.autoPlay') === 'true',

    speak(text: string) {
      if (!voice) return;
      window.speechSynthesis?.cancel();
      const utt = new SpeechSynthesisUtterance(text);
      utt.voice = voice;
      utt.lang = voice.lang;
      window.speechSynthesis.speak(utt);
    },

    cancel() {
      window.speechSynthesis?.cancel();
    },

    toggleAutoPlay() {
      store.autoPlay = !store.autoPlay;
      localStorage.setItem('audio.autoPlay', String(store.autoPlay));
    },
  };

  if (typeof window !== 'undefined' && window.speechSynthesis) {
    const updateVoice = () => {
      voice = pickVoice(window.speechSynthesis.getVoices());
      store.available = voice !== null;
      store.voiceName = voice?.name ?? '';
    };
    updateVoice();
    window.speechSynthesis.addEventListener('voiceschanged', updateVoice);
  }

  Alpine.store('audio', store);
}
