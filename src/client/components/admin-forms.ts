import type { Alpine as AlpineApi } from 'alpinejs';

interface RefHolder {
  $refs: Record<string, HTMLInputElement | undefined>;
}

async function deriveZhuyinInto(
  refs: Record<string, HTMLInputElement | undefined>,
  pinyinRef: string,
  zhuyinRef: string,
): Promise<void> {
  const pinyinEl = refs[pinyinRef];
  const zhuyinEl = refs[zhuyinRef];
  if (!pinyinEl || !zhuyinEl) return;
  const pinyin = pinyinEl.value.trim();
  if (!pinyin) return;
  try {
    const res = await fetch('/admin/derive-zhuyin', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ pinyin }),
    });
    if (!res.ok) return;
    const data = (await res.json()) as { zhuyin?: string };
    if (typeof data.zhuyin === 'string') {
      zhuyinEl.value = data.zhuyin;
      zhuyinEl.dispatchEvent(new Event('input', { bubbles: true }));
    }
  } catch {
    /* leave the field untouched on failure */
  }
}

/**
 * Admin form helpers:
 *  - `charForm`: dirty-state warning on navigate-away + "derive zhuyin" button.
 *  - `sentenceEditor`: expand/collapse an existing sentence row into an editable
 *    form, plus its own "derive zhuyin" button.
 *
 * All forms submit via standard POST and work without JS; these only enhance.
 */
export function registerAdminForms(Alpine: AlpineApi): void {
  Alpine.data('charForm', () => ({
    dirty: false,
    submitting: false,

    init(this: CharFormState) {
      window.addEventListener('beforeunload', (event) => {
        if (this.dirty && !this.submitting) {
          event.preventDefault();
          event.returnValue = '';
        }
      });
    },

    markDirty(this: CharFormState) {
      this.dirty = true;
    },

    onSubmit(this: CharFormState) {
      this.submitting = true;
    },

    async deriveZhuyin(this: CharFormState & RefHolder) {
      await deriveZhuyinInto(this.$refs, 'pinyin', 'zhuyin');
      this.markDirty();
    },
  }));

  Alpine.data('sentenceEditor', () => ({
    open: false,

    toggle(this: { open: boolean }) {
      this.open = !this.open;
    },

    async deriveZhuyin(this: RefHolder) {
      await deriveZhuyinInto(this.$refs, 'pinyin', 'zhuyin');
    },
  }));
}

interface CharFormState {
  dirty: boolean;
  submitting: boolean;
  markDirty(): void;
  onSubmit(): void;
}
