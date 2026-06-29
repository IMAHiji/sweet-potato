import type { Alpine as AlpineType } from 'alpinejs';

export function registerAdminForms(Alpine: AlpineType) {
  Alpine.data('adminForm', () => ({
    dirty: false,
    deriving: false,

    init() {
      window.addEventListener('beforeunload', (e) => {
        if (this.dirty) {
          e.preventDefault();
          e.returnValue = '';
        }
      });
    },

    markDirty() {
      this.dirty = true;
    },

    async deriveZhuyin(pinyinValue: string, zhuyinFieldId: string) {
      const csrfToken =
        (document.querySelector('input[name="_csrf"]') as HTMLInputElement | null)?.value ?? '';
      this.deriving = true;
      try {
        const res = await fetch('/admin/derive-zhuyin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pinyin: pinyinValue, _csrf: csrfToken }),
        });
        const data = (await res.json()) as { zhuyin: string };
        const field = document.getElementById(zhuyinFieldId) as HTMLInputElement | null;
        if (field) {
          field.value = data.zhuyin;
          this.dirty = true;
        }
      } finally {
        this.deriving = false;
      }
    },
  }));
}
