# F8 — Phonetics library + first tests

**Phase:** 0 — Foundation (sequential; may be built any time after F5). **Depends on:** F2 (Vitest), F5 (none at runtime — pure functions).

**Goal:** Pure, well-tested pinyin/zhuyin helpers consumed by Lane D (seed) and Lane C (admin
"derive zhuyin"), plus the search-normalizer that powers `pinyin_search`.

## Tasks

- [ ] `src/server/lib/pinyin.ts`:
  - `normalize(pinyin)` — numbered tones (`ni3`) → tone-marked (`nǐ`) if the source uses numbers; split syllables.
  - **`stripTones(pinyin): string`** — lowercase, remove tone diacritics, drop spaces/apostrophes → the `pinyin_search` value (e.g. `"Nǐ Hǎo"` → `"nihao"`). Pure, no I/O.
- [ ] `src/server/lib/zhuyin.ts`: **deterministic `pinyinToZhuyin(pinyin): string`** (initials/finals/tone-mark mapping). Pure. Handle neutral tone, `ü`, `er`, whole-syllable forms (zhi/chi/shi/ri/zi/ci/si). Multi-syllable input → space-joined zhuyin.
- [ ] `tests/zhuyin.test.ts` (Vitest) + npm `test:zhuyin` (`vitest run tests/zhuyin.test.ts`):
  - Assert a fixed table: 你→ㄋㄧˇ, 中→ㄓㄨㄥ, 綠→ㄌㄩˋ, 兒→ㄦˊ, plus a few multi-syllable words.
  - Assert `stripTones`: `"nǐ hǎo"`→`"nihao"`, `"lǜ"`→`"lu"` (or chosen `ü` rule — document it), `"Wǒ"`→`"wo"`.
  - Fail loudly on any mismatch.

> This is the project's first real Vitest suite — it proves the harness from F2 works and gives
> the seed + admin lanes a trustworthy converter. Note the known multi-reading (多音字)
> limitation: pick the first reading, same as the seed.

## Files created

- `src/server/lib/pinyin.ts`, `src/server/lib/zhuyin.ts`
- `tests/zhuyin.test.ts`

## Acceptance criteria

- `pnpm test:zhuyin` passes on the fixed table (zhuyin + stripTones cases).
- `pinyinToZhuyin` and `stripTones` are pure (no DB/network) and import cleanly into scripts.

## How to verify

```bash
pnpm test:zhuyin     # green
```
