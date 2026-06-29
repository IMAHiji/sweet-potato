import type { Alpine as AlpineType } from 'alpinejs';

interface Character {
  id: number;
  traditional: string;
  simplified: string;
  pinyin: string;
  pinyinSearch: string;
  zhuyin: string;
  definition: string;
  hskLevel: number | null;
  frequencyRank: number | null;
  createdAt: Date | null;
  updatedAt: Date | null;
}

interface AudioStore {
  available: boolean;
  autoPlay: boolean;
  speak(text: string): void;
  toggleAutoPlay(): void;
}

interface DisplayStore {
  script: 'traditional' | 'simplified';
  notation: 'pinyin' | 'zhuyin' | 'both';
}

interface PendingReview {
  characterId: number;
  rating: 'known' | 'again';
}

const QUEUE_KEY = 'sweet-potato:review-queue';

export function registerFlashcard(Alpine: AlpineType) {
  Alpine.data('flashcard', () => ({
    deck: [] as Character[],
    index: 0,
    flipped: false,
    tallies: { known: 0, again: 0 } as { known: number; again: number },
    done: false,
    saveError: false,
    pendingRetry: null as PendingReview | null,

    init() {
      const el = document.getElementById('deck-data');
      if (el?.textContent) {
        try {
          this.deck = JSON.parse(el.textContent) as Character[];
        } catch {
          this.deck = [];
        }
      }
      this.shuffle();
      void this.drainQueue();
    },

    flip() {
      this.flipped = !this.flipped;
      const audio = Alpine.store('audio') as AudioStore;
      if (audio.autoPlay) {
        this.speak();
      }
    },

    mark(rating: 'known' | 'again') {
      this.tallies[rating]++;
      const card = this.deck[this.index];
      if (card) {
        void this.postReview(card.id, rating);
      }
      this.advance();
    },

    advance() {
      this.index++;
      this.flipped = false;
      if (this.index >= this.deck.length) {
        this.done = true;
      }
    },

    restart() {
      this.index = 0;
      this.flipped = false;
      this.tallies = { known: 0, again: 0 };
      this.done = false;
      this.saveError = false;
      this.pendingRetry = null;
      this.shuffle();
    },

    shuffle() {
      const arr = this.deck;
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const a = arr[i];
        const b = arr[j];
        if (a !== undefined && b !== undefined) {
          arr[i] = b;
          arr[j] = a;
        }
      }
    },

    currentChar(): string {
      const display = Alpine.store('display') as DisplayStore;
      const card = this.deck[this.index];
      if (!card) return '';
      return display.script === 'traditional' ? card.traditional : card.simplified;
    },

    speak() {
      const audio = Alpine.store('audio') as AudioStore;
      audio.speak(this.currentChar());
    },

    handleKey(event: KeyboardEvent) {
      // Don't intercept when typing in an input
      const target = event.target;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement
      ) {
        return;
      }

      if (this.done) return;

      switch (event.key) {
        case ' ':
          event.preventDefault();
          this.flip();
          break;
        case '1':
          if (this.flipped) this.mark('again');
          break;
        case '2':
          if (this.flipped) this.mark('known');
          break;
        case 'ArrowLeft':
          if (this.index > 0) {
            this.index--;
            this.flipped = false;
          }
          break;
        case 'ArrowRight':
          if (this.index < this.deck.length - 1) {
            this.index++;
            this.flipped = false;
          }
          break;
      }
    },

    loadQueue(): PendingReview[] {
      try {
        const raw = localStorage.getItem(QUEUE_KEY);
        return raw ? (JSON.parse(raw) as PendingReview[]) : [];
      } catch {
        return [];
      }
    },

    saveQueue(queue: PendingReview[]): void {
      try {
        if (queue.length === 0) {
          localStorage.removeItem(QUEUE_KEY);
        } else {
          localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
        }
      } catch {
        // localStorage unavailable — ignore
      }
    },

    enqueue(review: PendingReview): void {
      const queue = this.loadQueue();
      queue.push(review);
      this.saveQueue(queue);
    },

    async drainQueue(): Promise<void> {
      const queue = this.loadQueue();
      if (queue.length === 0) return;

      const remaining: PendingReview[] = [];
      for (const item of queue) {
        const ok = await this.sendReview(item.characterId, item.rating);
        if (!ok) remaining.push(item);
      }
      this.saveQueue(remaining);
    },

    async sendReview(characterId: number, rating: 'known' | 'again'): Promise<boolean> {
      try {
        const res = await fetch('/api/reviews', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ characterId, rating }),
        });
        return res.ok;
      } catch {
        return false;
      }
    },

    async postReview(characterId: number, rating: 'known' | 'again'): Promise<void> {
      const ok = await this.sendReview(characterId, rating);
      if (ok) {
        this.saveError = false;
        this.pendingRetry = null;
        await this.drainQueue();
      } else {
        this.saveError = true;
        this.pendingRetry = { characterId, rating };
        this.enqueue({ characterId, rating });
      }
    },

    async retryReview(): Promise<void> {
      if (!this.pendingRetry) return;
      const { characterId, rating } = this.pendingRetry;
      // Clear error state before attempting — don't re-enqueue on failure
      // since the item is already in the localStorage queue from the first failure
      this.saveError = false;
      this.pendingRetry = null;
      const ok = await this.sendReview(characterId, rating);
      if (ok) {
        await this.drainQueue();
      } else {
        this.saveError = true;
        this.pendingRetry = { characterId, rating };
      }
    },
  }));
}
