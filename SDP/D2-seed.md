# D2 — Seed HSK characters

**Phase:** 1 — Lane D (data). **Depends on:** D1 (data files), Foundation (F5 schema, F8 `pinyinToZhuyin`+`stripTones`, F7 `seedUsers`).

**Goal:** Parse the HSK list, load HSK 1–3 **single characters** (simplified/traditional/
pinyin/definition), derive zhuyin + `pinyinSearch`, and upsert into `characters` — plus seed
users via the shared helper.

## Owns (only these files)

- `scripts/seed.ts`
- `tests/seed.test.ts`

## Tasks

- [ ] `scripts/seed.ts` (npm `seed`):
  1. Parse the HSK list → filter to `HSK_LEVELS` (default 1–3) and **single characters only**.
  2. Build a CC-CEDICT map (key by simplified) → look up traditional + definition; dedupe keeping the first reading (note the 多音字 multi-reading limitation).
  3. `zhuyin = pinyinToZhuyin(pinyin)` and `pinyinSearch = stripTones(pinyin)` (F8).
  4. Upsert into `characters` — `onConflictDoUpdate` on `traditional`; set `hskLevel`.
  5. `await seedUsers(db)` (the shared F7 helper — **do not** duplicate user-seeding logic).
  6. Print a summary (counts per level, skipped rows).
- [ ] `tests/seed.test.ts`: parser maps a sample HSK row → a `NewCharacter` with non-empty
  simplified/traditional/pinyin/zhuyin/`pinyinSearch`/definition/`hskLevel`; single-character
  filter drops multi-char words; upsert is idempotent (re-seed = no duplicate `traditional`).

> Mirrors the prior build, which loaded **542** single chars (HSK1 212 / HSK2 176 / HSK3 154).
> `seed` supersedes the `seed:dev` fixture once real data is wanted (G2).

## Acceptance criteria

- `pnpm seed` loads several hundred HSK 1–3 characters, each with non-empty simplified,
  traditional, pinyin, **zhuyin**, **`pinyinSearch`**, definition, `hskLevel`.
- Re-running `pnpm seed` updates in place (no duplicates).
- `tests/seed.test.ts` passes.

## How to verify

```bash
pnpm data:download && pnpm seed
sqlite3 data/sweet-potato.db 'select hsk_level, count(*) from characters group by 1 order by 1;'
sqlite3 data/sweet-potato.db "select traditional, simplified, pinyin, zhuyin, pinyin_search from characters where simplified='你';"
pnpm test seed
```
