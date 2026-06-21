import type { Alpine as AlpineApi } from 'alpinejs';

interface Card {
  id: number;
  traditional: string;
  simplified: string;
  pinyin: string;
  zhuyin: string;
  glossEn: string | null;
  definitionZh: string | null;
}

type Rating = 'known' | 'again';

function shuffleIndices(n: number): number[] {
  const order = Array.from({ length: n }, (_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [order[i], order[j]] = [order[j]!, order[i]!];
  }
  return order;
}

function logReview(characterId: number, rating: Rating): void {
  // Fire-and-forget: never block the UI on the response.
  void fetch('/api/reviews', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ characterId, rating }),
  }).catch(() => {
    /* offline / network error — the study session still works */
  });
}

/**
 * Flashcard deck. Reads its deck from a <script type="application/json"> tag
 * (id `deck-data`) rendered by /study, flips cards, marks known/again (logging
 * each review), shuffles, and shows an end-of-deck summary.
 */
export function registerFlashcard(Alpine: AlpineApi): void {
  Alpine.data('flashcard', () => ({
    deck: [] as Card[],
    order: [] as number[],
    pos: 0,
    flipped: false,
    knownCount: 0,
    againCount: 0,
    done: false,

    init(this: FlashcardState) {
      const el = document.getElementById('deck-data');
      try {
        this.deck = el?.textContent ? (JSON.parse(el.textContent) as Card[]) : [];
      } catch {
        this.deck = [];
      }
      this.order = shuffleIndices(this.deck.length);
    },

    get card(): Card | null {
      const idx = this.order[this.pos];
      return idx === undefined ? null : (this.deck[idx] ?? null);
    },

    get total(): number {
      return this.order.length;
    },

    get progressText(): string {
      return `${Math.min(this.pos + 1, this.total)} / ${this.total}`;
    },

    get progressPct(): number {
      return this.total === 0 ? 0 : Math.round((this.pos / this.total) * 100);
    },

    flip(this: FlashcardState) {
      this.flipped = !this.flipped;
    },

    rate(this: FlashcardState, rating: Rating) {
      const current = this.card;
      if (!current) return;
      if (rating === 'known') this.knownCount++;
      else this.againCount++;
      logReview(current.id, rating);
      this.advance();
    },

    advance(this: FlashcardState) {
      if (this.pos + 1 >= this.total) {
        this.done = true;
      } else {
        this.pos++;
        this.flipped = false;
      }
    },

    prev(this: FlashcardState) {
      if (this.pos > 0) {
        this.pos--;
        this.flipped = false;
      }
    },

    shuffle(this: FlashcardState) {
      this.order = shuffleIndices(this.deck.length);
      this.pos = 0;
      this.flipped = false;
      this.knownCount = 0;
      this.againCount = 0;
      this.done = false;
    },

    restart(this: FlashcardState) {
      this.pos = 0;
      this.flipped = false;
      this.knownCount = 0;
      this.againCount = 0;
      this.done = false;
    },

    handleKey(this: FlashcardState, event: KeyboardEvent) {
      if (this.done) return;
      switch (event.key) {
        case ' ':
        case 'Enter':
          event.preventDefault();
          this.flip();
          break;
        case '1':
          this.rate('again');
          break;
        case '2':
          this.rate('known');
          break;
        case 'ArrowRight':
          this.advance();
          break;
        case 'ArrowLeft':
          this.prev();
          break;
      }
    },
  }));
}

// Internal shape used for `this` typing of the methods above.
interface FlashcardState {
  deck: Card[];
  order: number[];
  pos: number;
  flipped: boolean;
  knownCount: number;
  againCount: number;
  done: boolean;
  card: Card | null;
  total: number;
  progressText: string;
  progressPct: number;
  flip(): void;
  rate(rating: Rating): void;
  advance(): void;
  prev(): void;
  shuffle(): void;
  restart(): void;
  handleKey(event: KeyboardEvent): void;
}
