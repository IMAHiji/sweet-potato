import type { Alpine as AlpineType } from 'alpinejs';

export function registerTheme(Alpine: AlpineType) {
  Alpine.data('theme', () => ({
    get current() {
      return document.documentElement.dataset['theme'] ?? 'sunny';
    },
    toggle() {
      const next = this.current === 'dark' ? 'sunny' : 'dark';
      document.documentElement.dataset['theme'] = next;
      localStorage.setItem('theme', next);
    },
  }));
}
