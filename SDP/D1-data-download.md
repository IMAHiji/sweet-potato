# D1 — Data download

**Phase:** 1 — Lane D (data). **Depends on:** Foundation only (F1 scripts dir). Runs fully in parallel — touches no `src/` files. **Then:** D2.

**Goal:** A repeatable downloader that fetches the HSK word list + CC-CEDICT into
`scripts/data/` (gitignored), cached, with provenance recorded.

## Owns (only these files — shared with D2)

- `scripts/download-data.ts`, `scripts/sources.ts`
- `scripts/data/README.md`
- (`scripts/seed.ts` and `tests/seed.test.ts` are added in D2)

## Tasks

- [ ] `scripts/sources.ts`: source URLs as constants + short provenance notes. Primary HSK
  source: a maintained HSK 3.0 dataset that already bundles simplified/traditional/pinyin/
  meanings/levels (e.g. `drkameleon/complete-hsk-vocabulary` `complete.min.json`, levels
  `n1`–`n7`). Secondary: **CC-CEDICT** (`cedict_ts.u8`) as a definition/traditional fallback.
- [ ] `scripts/download-data.ts`: fetch each source into `scripts/data/` (gitignored). Cache;
  skip re-download if present; `--force` to refresh. npm `data:download`.
- [ ] `scripts/data/README.md`: record source URLs, licenses, and retrieval date.

## Acceptance criteria

- `pnpm data:download` populates `scripts/data/` and is idempotent (re-run skips unless `--force`).
- Provenance + licenses recorded.

## How to verify

```bash
pnpm data:download && ls -la scripts/data
```
