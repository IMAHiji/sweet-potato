import type { Alpine as AlpineApi } from 'alpinejs';

export type ScriptPref = 'traditional' | 'simplified';
export type NotationPref = 'pinyin' | 'zhuyin' | 'both';
export type DefLangPref = 'en' | 'zh' | 'both';

const SCRIPT_KEY = 'sp-script';
const NOTATION_KEY = 'sp-notation';
const DEFLANG_KEY = 'sp-deflang';

interface DisplayStore {
  script: ScriptPref;
  notation: NotationPref;
  defLang: DefLangPref;
  setScript(value: ScriptPref): void;
  setNotation(value: NotationPref): void;
  setDefLang(value: DefLangPref): void;
  showPinyin(): boolean;
  showZhuyin(): boolean;
  showGlossEn(): boolean;
  showDefZh(): boolean;
}

function load<T extends string>(key: string, fallback: T, allowed: readonly T[]): T {
  try {
    const v = localStorage.getItem(key);
    if (v && (allowed as readonly string[]).includes(v)) return v as T;
  } catch {
    /* ignore */
  }
  return fallback;
}

function save(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* ignore */
  }
}

/**
 * Global `$store.display` controlling simplified⇄traditional and the
 * pinyin/zhuyin/both notation, persisted to localStorage. Pages render BOTH
 * scripts and BOTH notations in the DOM and use x-show against this store, so
 * toggling is instant with no refetch. Default: traditional + both.
 */
export function registerToggles(Alpine: AlpineApi): void {
  const store: DisplayStore = {
    script: load<ScriptPref>(SCRIPT_KEY, 'traditional', ['traditional', 'simplified']),
    notation: load<NotationPref>(NOTATION_KEY, 'both', ['pinyin', 'zhuyin', 'both']),
    defLang: load<DefLangPref>(DEFLANG_KEY, 'both', ['en', 'zh', 'both']),

    setScript(value: ScriptPref) {
      this.script = value;
      save(SCRIPT_KEY, value);
    },

    setNotation(value: NotationPref) {
      this.notation = value;
      save(NOTATION_KEY, value);
    },

    setDefLang(value: DefLangPref) {
      this.defLang = value;
      save(DEFLANG_KEY, value);
    },

    showPinyin(): boolean {
      return this.notation === 'pinyin' || this.notation === 'both';
    },

    showZhuyin(): boolean {
      return this.notation === 'zhuyin' || this.notation === 'both';
    },

    showGlossEn(): boolean {
      return this.defLang === 'en' || this.defLang === 'both';
    },

    showDefZh(): boolean {
      return this.defLang === 'zh' || this.defLang === 'both';
    },
  };

  Alpine.store('display', store);
}
