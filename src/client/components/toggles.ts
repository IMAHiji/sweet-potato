import type { Alpine as AlpineType } from 'alpinejs';

type Script = 'simplified' | 'traditional';
type Notation = 'pinyin' | 'zhuyin' | 'both';

interface DisplayStore {
  script: Script;
  notation: Notation;
  setScript(val: Script): void;
  setNotation(val: Notation): void;
}

export function registerToggles(Alpine: AlpineType) {
  const store: DisplayStore = {
    script: (localStorage.getItem('display.script') ?? 'traditional') as Script,
    notation: (localStorage.getItem('display.notation') ?? 'both') as Notation,
    setScript(val: Script) {
      store.script = val;
      localStorage.setItem('display.script', val);
    },
    setNotation(val: Notation) {
      store.notation = val;
      localStorage.setItem('display.notation', val);
    },
  };
  Alpine.store('display', store);
}
