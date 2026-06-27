# F9 — Shared client primitives (display toggles + audio)  ◄ UI CONTRACTS

**Phase:** 0 — Foundation (sequential). **Depends on:** F2 (bundle), F6 (layout, `.speak-btn`).

**Goal:** The two Alpine stores every UI lane consumes — `display` (script/notation toggles) and
`audio` (Web Speech pronunciation) — plus the reusable 🔊 partial, plus the **component stubs**
(`flashcard`, `admin-forms`) wired into `main.ts` so lanes never edit the entrypoint.

## Tasks

### Display toggle store
- [ ] `components/toggles.ts`: `Alpine.store('display', { script: 'simplified'|'traditional', notation: 'pinyin'|'zhuyin'|'both', ... })`, persisted to `localStorage`, default **traditional + both**. Two toggle controls (placed by lanes in their headers, reading `$store.display`).

### Audio store (Web Speech API)
- [ ] `components/audio.ts`:
  - `export interface Speaker { available: boolean; speak(text, opts?): void; cancel(): void; }` — the swap seam for a future cloud TTS.
  - `class WebSpeechSpeaker implements Speaker` wrapping `window.speechSynthesis`.
  - **`pickVoice(voices): SpeechSynthesisVoice | null`** — pure, exported for testing. Prefer lang `zh-TW` → `zh-HK` → `zh` → `zh-CN` → `zh-SG`; null if none.
  - Handle Chrome's async voice load: listen for `voiceschanged`, recompute `available` + chosen voice.
  - `Alpine.store('audio', { available, voiceName, autoPlay (persisted), speak(text), cancel(), toggleAutoPlay() })`. `speak()` cancels any in-flight utterance first; sets `lang` from the picked voice.
  - When unsupported / no zh voice → `available = false` (the partial hides/disables the button).
- [ ] `views/partials/speak-button.eta`: a `<button class="speak-btn" ... x-show="$store.audio.available" @click="$store.audio.speak(<%= it.text %>)" :aria-label="...">🔊</button>` taking a `text` local. Lanes include this partial wherever pronunciation is offered.
- [ ] **Voice-picker (settings):** a small control (in nav or a settings popover) listing available `zh*` voices when more than one exists, plus the **auto-play-on-flip** toggle. Persist both.

### Component stubs + registration
- [ ] Create **stub** `components/flashcard.ts` and `components/admin-forms.ts` — each registers an empty `Alpine.data('flashcard'|'adminForm', () => ({}))`. Lanes B/C fill these.
- [ ] Finalize `main.ts`: import + register `theme`, `toggles`, `audio`, `flashcard`, `admin-forms`. **After this step `main.ts` is frozen.**

### Tests
- [ ] `tests/audio.test.ts` (Vitest): unit-test `pickVoice()` with a mocked voices array — picks `zh-TW` over `zh-CN`; returns null when no `zh*` voice.

## Files created

- `components/{toggles,audio}.ts`; **stub** `components/{flashcard,admin-forms}.ts`
- `views/partials/speak-button.eta`
- updated `main.ts`; `tests/audio.test.ts`

## Acceptance criteria

- `$store.display` toggles persist across reloads; `$store.audio.speak('你好')` speaks via a zh voice when one exists, and the 🔊 button is hidden when none does.
- Auto-play-on-flip preference persists.
- `main.ts` registers all five components; **lanes need not modify it.**
- `pnpm test` includes `audio.test.ts` green.

## How to verify

```bash
pnpm dev
# In console: Alpine.store('audio').speak('你好嗎')  → hear it (if a zh voice is installed).
# Toggle script/notation persists on reload. pnpm test → audio + zhuyin specs pass.
```
