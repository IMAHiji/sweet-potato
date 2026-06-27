# G2 — Seed real data + content pass

**Phase:** 2 — Integration (sequential). **Depends on:** G1, Lane D.

**Goal:** Replace the dev fixture with the real HSK 1–3 seed and verify every page against real
data + audio.

## Tasks

- [ ] `pnpm data:download && pnpm seed` against a fresh `data/sweet-potato.db` (delete the
  fixture db first, or run seed which upserts over it).
- [ ] Verify counts per HSK level look right (~500–900 chars).
- [ ] Spot-check browse/detail/study with real characters: zhuyin correct, `pinyinSearch`
  makes toneless pinyin search work, 🔊 pronounces real characters + sentences.
- [ ] Add a couple of admin example sentences (via Lane C) to a few high-frequency characters so
  the detail page's sentence feature is demonstrable.

## Acceptance criteria

- Real HSK data loads; pages render correctly; search (incl. toneless pinyin) works; audio works.
- At least a few characters have example sentences for demo.

## How to verify

```bash
rm -f data/sweet-potato.db* && pnpm db:migrate && pnpm data:download && pnpm seed && pnpm dev
sqlite3 data/sweet-potato.db 'select hsk_level, count(*) from characters group by 1 order by 1;'
```
