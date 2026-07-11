# Plan: Contextual Hints + Pause Menu (playtest-readiness pass)

Status: **shipped 2026-07-11.** Built on Opus (two new systems). Off the master-plan
build order — the user paused M-TE (trophy gear) to instead polish the first biome enough
for outside playtesters. This is the first item of that polish pass.

## Why (the cold-start problem)

A fresh playtester dropped into the game has no idea (a) what the goal is — the win
condition (explore → War Camp → farm elite trophies → craft a Gremlin Totem → summon &
kill the Gremlin King) is undiscoverable — or (b) the controls, since interaction is
mouse-only, there are ~10 keybinds, and the Keybinds panel defaults collapsed. That
"what am I doing / how?" wall is the single most likely thing to sink a playtest, more
than balance or content. This pass closes it *without* hand-holding.

## Locked decisions (from the user)

1. **Contextual hints, not up-front tutorial.** Valheim-Hugin-style: a tip appears the
   first time the player hits a situation, then not again. Explicitly **not a mascot** —
   the "raven" was only a behavioral reference. Plain tip popups.
2. **Keep it a challenge.** Sparse, optional, no hand-holding. Hints teach controls and
   *nudge* toward mechanics; they **never** spell out the totem→altar→boss win condition.
3. **Presentation:** corner popup card (slides in from the right edge, holds ~5s, fades,
   click to dismiss).
4. **Lifetime:** "already shown" state **resets each run**; the on/off preference
   **persists** (localStorage). Toggle lives in a **pause menu** (settings didn't exist).
5. **Pause menu (Esc)** — chosen over a standalone settings panel because it also delivers
   the pause playtesters expect (freeze the run) + a Resume / New Run escape hatch, and is
   the natural home for the Hints toggle. Three needs, one deliverable.

## What shipped

### `src/systems/Hints.ts` — `HintManager` (framework-free, like Run/Buffs)
- `HintId` union + `HINT_TEXT` table (8 tips). `trigger(id)` shows once per run if enabled
  (idempotent — safe from a per-frame hover path). Disabled = true no-op that does **not**
  mark the hint shown, so re-enabling mid-run still surfaces future first-occurrences.
- Per-run `shown` set (fresh instance in `create()`); `enabled` persists in localStorage
  (`survivor-rpg:hints-enabled:v1`, tolerant of a blocked/corrupt store; only `"0"` = off).
- `onShow` listener the UI subscribes to (same shape as `EventLog.onAdd`).

### `src/ui/HintUI.ts` — corner popup card
- Right-edge, mid-height (`~42%`), clear of minimap/hotbar/prompt/left-column. Flat
  scrollFactor(0) objects (no Container). Depth 2860/2861 (clears WORLD_H, below menus).
- Slide-in (tween a `{t}` proxy → syncs box/accent/header/body x, killed on replace so a
  stale onComplete can't fade the next card early), hold 5.2s, fade 0.7s, click-to-dismiss.
  Only one card at a time — a new hint replaces the current.

### `src/ui/PauseMenuUI.ts` — pause overlay (modeled on RunEndUI)
- Interactive full-screen scrim (swallows world clicks) + centered panel: **PAUSED** +
  Resume / **Hints: ON/OFF** (flips + relabels live) / New Run. Depths 3500-3502.

### MainScene wiring
- Fields `hints` / `hintUI` / `pauseMenu` / `isPaused`; all reset in `create()` per the
  `scene.restart()` field-init gotcha (also defensively `physics.world.resume()` +
  `time.paused = false` in case New Run was clicked from the pause menu).
- **Freeze:** `openPauseMenu()` sets `isPaused`, zeroes player velocity, `physics.world.pause()`,
  `time.paused = true`; `update()` early-returns on `isPaused` (so `run.tick`/day-night never
  advance — pausing doesn't burn the speedrun clock). `resumeGame()` reverses it. Blocked
  once `runOver`/`isDead` (RunEndUI owns the frozen world then). World pointerdown guarded
  with `isPaused`; Esc opens pause only when no other menu is open (else closes that menu).
- **Triggers (8, at existing hook points):** `awaken` (create, +1.5s), `pickup_reach`
  (promptFor pickup branch), `tool_locked` (tryInteract, clicked a chop/mine node w/o the
  right tool KIND — never names the tool), `open_menu` (first recipe unlock in
  refreshDiscovery), `stamina_empty` (update, stamina < 5), `low_hp` (update, HP ≤ 30%),
  `nightfall` (spawnNightBatch), `elite_trophy` (addToBackpack of gremlin/boar/snake_trophy;
  NOT the boss fang).
- Keybinds panel gained a `"Pause / close: Esc"` line for discoverability.

## Verification
`tsc --noEmit` clean; preview console clean. Verified live via `preview_eval`: hint card
renders (4 objects) + idempotent + one-at-a-time; disabled = no-op that doesn't burn the
hint, re-enable re-shows; pause freezes physics + scene clock + `isPaused`, resumes clean;
toggle persists to localStorage. Screenshots: PAUSED overlay + the right-edge TIP card.

## Not done (deferred playtest-polish backlog, from the same analysis)
Discovered-material toast, hover highlight on interactables, inventory auto-sort, minimap
rework (nearby-view + full-map overlay), ranged starter weapon, passive HP regen, and a
balance pass (best driven *by* playtester feedback). M-TE (trophy gear) still queued.
