# Step 08 — Seed HSK characters (with zhuyin derivation)

**Goal:** A repeatable script that downloads source data, loads HSK 1–3 single
characters with simplified/traditional/pinyin/definition, derives zhuyin, and upserts
them into `characters`.

**Depends on:** 05 (schema). Shares `scripts/seed.ts` with 07.

## Tasks

- [ ] `scripts/download-data.ts`: fetch source files into `scripts/data/` (gitignored):
  - An **open HSK word list** with levels + simplified + pinyin (e.g. a maintained HSK 3.0 dataset). Keep the source URL in a constant + a short README note for provenance.
  - **CC-CEDICT** (`cedict_ts.u8`) for traditional forms + English definitions.
  - Cache locally; skip re-download if present (`--force` to refresh).
- [ ] `src/server/lib/pinyin.ts`: normalize pinyin (numbered tones → tone marks if the HSK source uses numbers); split syllables.
- [ ] `src/server/lib/zhuyin.ts`: **deterministic pinyin→zhuyin converter** (initials/finals/tone-mark mapping). Pure function, no I/O. Port the mapping table; handle neutral tone, `ü`, `er`, whole-syllable forms (zhi/chi/shi/ri/zi/ci/si).
- [ ] `scripts/test-zhuyin.ts` + npm script `test:zhuyin`: assert a fixed table of known pairs (你→ㄋㄧˇ, 中→ㄓㄨㄥ, 綠→ㄌㄩˋ, 兒→ㄦˊ, etc.). Fail loudly on mismatch.
- [ ] `scripts/seed.ts`:
  1. Parse HSK list → filter to `HSK_LEVELS` (default 1–3) and **single characters only**.
  2. Build a CC-CEDICT map (key by simplified) → look up traditional + definition; dedupe keeping first reading (note multi-reading 多音字 limitation, like the prior project).
  3. Derive zhuyin from pinyin via `lib/zhuyin.ts`.
  4. Upsert into `characters` (`onConflictDoUpdate` on `traditional`), set `hsk_level`.
  5. Seed admin + test users (step 07).
  6. Print a summary (counts per level, skipped rows).
- [ ] npm scripts: `data:download`, `seed`.

## Files created

- `scripts/download-data.ts`, `scripts/seed.ts`, `scripts/test-zhuyin.ts`
- `src/server/lib/pinyin.ts`, `src/server/lib/zhuyin.ts`
- `scripts/data/README.md` (source provenance)

## Acceptance criteria

- `pnpm seed` loads several hundred HSK 1–3 characters, each with non-empty simplified, traditional, pinyin, **zhuyin**, definition, and `hsk_level`.
- `pnpm test:zhuyin` passes on the fixed table.
- Re-running `pnpm seed` updates in place (no duplicates).

## How to verify

```bash
pnpm data:download && pnpm seed
pnpm test:zhuyin
psql $DATABASE_URL -c 'select hsk_level, count(*) from characters group by 1 order by 1;'
psql $DATABASE_URL -c "select traditional, simplified, pinyin, zhuyin from characters where simplified='你';"
```
