import { existsSync, readFileSync } from 'node:fs';
import { HSK_FILE, type HskEntry, type HskForm } from '../sources.js';

/**
 * A single-character headword selected from the HSK dataset. HSK is the source
 * of *selection + grading* (which characters, what level/frequency) and of the
 * forms used to look the character up in MOEDICT (traditional) and CC-CEDICT.
 */
export interface Headword {
  traditional: string;
  simplified: string;
  /** HSK pinyin with numbered tones, e.g. "dou1" — picks the MOEDICT reading. */
  numberedPinyin: string;
  /** Reading-specific English meanings from the HSK dataset (CC-CEDICT-sourced). */
  glossHsk: string;
  hskLevel: number;
  frequencyRank: number | null;
}

/** Parse `HSK_LEVELS` ("1-3" | "2") into an inclusive numeric range. */
export function parseLevelRange(value: string): { min: number; max: number } {
  const parts = value.split('-').map((n) => parseInt(n, 10));
  const min = parts[0] ?? 1;
  const max = parts[1] ?? min;
  return { min: Math.min(min, max), max: Math.max(min, max) };
}

/** Lowest "new HSK" level (n1..n7) present on an entry, within [min,max]. */
export function levelInRange(
  entry: HskEntry,
  min: number,
  max: number,
): number | null {
  const levels = entry.l
    .map((code) => /^n(\d)$/.exec(code))
    .filter((m): m is RegExpExecArray => m !== null)
    .map((m) => Number(m[1]))
    .filter((n) => n >= min && n <= max);
  return levels.length ? Math.min(...levels) : null;
}

const isVariantForm = (f: HskForm): boolean =>
  (f.m ?? []).length > 0 &&
  (f.m ?? []).every((m) => /variant (of|character)/i.test(m));

// Capitalized pinyin marks a surname / proper-noun reading (e.g. "Dū", "Hé").
const isProperNoun = (f: HskForm): boolean => /^[A-Z]/.test(f.i.y ?? '');

// A neutral-tone reading (no tone digit, or tone 5) whose meanings read as a
// grammatical particle — for high-frequency function characters (的, 了, 著,
// 地, 嗎, 呢, 吧 …) this is the HSK-taught reading even though its lexical
// heteronym carries more dictionary senses.
const isNeutralParticle = (f: HskForm): boolean => {
  const neutral = /(^|[^0-9])5?$/.test(f.i.n) && !/[1-4]$/.test(f.i.n);
  const particle = (f.m ?? []).some((m) =>
    /particle|marker|\(used|\(modal|\(aspect|grammatical/i.test(m),
  );
  return neutral && particle;
};

/**
 * Score a form so the common HSK reading wins over surname/variant readings.
 * The HSK dataset lists forms with surnames and variant glyphs first, so the
 * naive `f[0]` is frequently wrong for 多音字 (都, 和, 還 …).
 */
function scoreForm(f: HskForm): number {
  let s = (f.m ?? []).length; // richer readings are the more common ones
  if (isNeutralParticle(f)) s += 1000; // grammatical-particle reading dominates
  if (isVariantForm(f)) s -= 100;
  if (isProperNoun(f)) s -= 50;
  return s;
}

/** Pick the form representing the common HSK reading (stable on ties). */
function pickBestForm(entry: HskEntry): HskForm | null {
  let best: HskForm | null = null;
  let bestScore = -Infinity;
  for (const f of entry.f) {
    const s = scoreForm(f);
    if (s > bestScore) {
      best = f;
      bestScore = s;
    }
  }
  return best;
}

/**
 * Select the graded single-character headwords in the inclusive HSK level
 * range, deduplicated by traditional form (first wins). Throws if the HSK
 * dataset hasn't been downloaded yet.
 */
export function selectHeadwords(min: number, max: number): Headword[] {
  if (!existsSync(HSK_FILE)) {
    throw new Error(`Missing ${HSK_FILE}. Run \`pnpm data:download\` first.`);
  }
  const entries = JSON.parse(readFileSync(HSK_FILE, 'utf8')) as HskEntry[];
  const byTraditional = new Map<string, Headword>();

  for (const entry of entries) {
    if ([...entry.s].length !== 1) continue; // single characters only

    const level = levelInRange(entry, min, max);
    if (level === null) continue;

    const form = pickBestForm(entry);
    if (!form) continue;

    const traditional = form.t || entry.s;
    if (byTraditional.has(traditional)) continue;

    byTraditional.set(traditional, {
      traditional,
      simplified: entry.s,
      numberedPinyin: form.i.n,
      glossHsk: (form.m ?? []).join('; ').trim(),
      hskLevel: level,
      frequencyRank: entry.q ?? null,
    });
  }

  return [...byTraditional.values()];
}
