# G1 — Integration & merge

**Phase:** 2 — Integration (sequential, orchestrator). **Depends on:** Lanes A, B, C, D complete.

**Goal:** Bring the four lanes together on `main` and prove the whole app builds, type-checks,
lints, tests, and runs as one process.

## Tasks

- [ ] **Merge** each lane's worktree/branch into `main`. By the ownership matrix the lanes touch
  disjoint files, so merges should be conflict-free. If a conflict appears, it means two lanes
  edited a shared file — fix the boundary, don't paper over it.
- [ ] Confirm the **stub-and-fill** files were filled, not duplicated: `flashcard.ts`,
  `admin-forms.ts`, `lanes/_browse.scss`, `_study.scss`, `_admin.scss`. `main.ts` and
  `main.scss` should be unchanged since F9/F6.
- [ ] Confirm every lane route auto-loaded (no manual `index.ts` edits): `/characters`,
  `/characters/:id`, `/study`, `/api/reviews`, `/admin*`.
- [ ] Run the full gate: `pnpm typecheck && pnpm lint && pnpm test && pnpm build`.
- [ ] Smoke test on the **dev fixture** (`pnpm seed:dev`): nav links resolve; auth gating holds;
  toggles + audio shared stores behave the same on every page (one `$store.display`, one
  `$store.audio`).

## Acceptance criteria

- Clean merge; all gates green; every route present and guarded.
- Shared stores are singletons (no lane shipped a private copy of toggles/audio).

## How to verify

```bash
pnpm install && pnpm typecheck && pnpm lint && pnpm test && pnpm build
pnpm db:migrate && pnpm seed:dev && pnpm dev   # click through every nav link as admin + as test user
```
