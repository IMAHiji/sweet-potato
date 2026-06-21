import type { Alpine as AlpineApi } from 'alpinejs';

type Theme = 'sunny' | 'dark';
const STORAGE_KEY = 'sp-theme';

function readTheme(): Theme {
  const attr = document.documentElement.dataset.theme;
  return attr === 'dark' ? 'dark' : 'sunny';
}

/**
 * Theme toggle. The actual <html data-theme> is set before paint by the inline
 * no-FOUC script in base.eta; this component just reflects and flips it.
 */
export function registerTheme(Alpine: AlpineApi): void {
  Alpine.data('theme', () => ({
    current: 'sunny' as Theme,

    init(this: { current: Theme }) {
      this.current = readTheme();
    },

    toggle(this: { current: Theme }) {
      this.current = this.current === 'dark' ? 'sunny' : 'dark';
      document.documentElement.dataset.theme = this.current;
      try {
        localStorage.setItem(STORAGE_KEY, this.current);
      } catch {
        /* ignore storage failures (private mode) */
      }
    },
  }));
}
