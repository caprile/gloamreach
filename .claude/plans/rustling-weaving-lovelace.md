# M-R1 — Run + Score + Hardcore Death

Detailed plan for milestone **M-R1** of the roguelike meta-loop
(`.claude/plans/roguelike-metaloop-master-plan.md`). Second in the locked build order,
after M-FX (shipped). Built on **Opus** (new core mechanic).

## Context

The game currently has no notion of a "run." Death teleports the player back to world
center and refills HP (`MainScene.onPlayerDeath`/`respawnPlayer`, MainScene.ts:2425-2442);
killing the Gremlin King is treated like any other enemy death — it just drops loot
(`tryAttackEnemy` kill path, MainScene.ts:2298-2318). There is **no elapsed-run timer, no
score, and no save/load anywhere** (`localStorage` appears nowhere in `src/`).

M-R1 introduces the **run container** that the whole meta-loop hangs off: a seed-stamped
run with an elapsed clock and a live score, **hardcore permadeath** (death ends the run
and posts a score instead of respawning), a **win** condition (kill the final boss →
completion bonus × speed), and a minimal **localStorage high-score table** (the game's
first save/load — meta only).

**Locked this session** (`AskUserQuestion`):
- **Seed is display-only for now.** Generate + show a seed string per run and record it
  with the score, but "New Run" just restarts the scene with fresh RNG. True deterministic
  world-gen from a seed is deferred to **M-W1** (which reworks world-gen anyway). This
  avoids refactoring every existing `Phaser.Math.Between` spawn/loot call.
- **Live, toggleable run HUD.** A small always-visible run clock + current score, with a
  keybind to minimize/expand it.
- **Dying posts a partial score.** A death ends the run and records the score earned so
  far (kills, no completion bonus). Every run leaves a leaderboard mark.

Working against the current single biome: the **Gremlin King is both the first and (for
now) the final boss**, so the system must degrade gracefully to 1 biome and scale as rings
are added in M-W1.

## New files

### `src/systems/Run.ts` — the run container (framework-free, like `Health`/`Buffs`/`Skills`)
- Fields: `seed: string` (generated at construction, display-only), `elapsedMs` (ticked),
  `state: "active" | "ended"`, `outcome: "won" | "died" | null`, kill tally
  (`kills` total + a small breakdown by category: `normal` / `elite` / `boss`).
- Methods: `tick(deltaMs)` (accumulates `elapsedMs` while `active`), `recordKill(category)`,
  `end(outcome)`, `score(): number` (pure, computed from current state).
- **Score constants live at the top of this file** (codebase favors near-the-feature
  constants — mirrors MainScene.ts:97-140). First-pass, all tunable:
  - Kill points: `normal = 10`, `elite = 30`, `boss = 500`.
  - `COMPLETION_BONUS = 2000` (awarded only on a win).
  - Speed multiplier: `speedMult = clamp(TARGET_MS / elapsedMs, 1, MAX_SPEED_MULT)` with
    `TARGET_MS ≈ 10 min`, `MAX_SPEED_MULT = 3`. **Applied to the completion bonus only.**
  - **Win** score = `round(COMPLETION_BONUS * speedMult + killPoints)`.
  - **Death** score = `killPoints` (no completion, no speed mult).
  - This satisfies the master plan's constraint (a fast final-boss kill can beat a slow
    full-clear): the `completion × speed` term dominates and diminishes grinding, since
    kill points are flat. Degrades cleanly to 1 biome — the boss kill is the completion.

### `src/systems/HighScores.ts` — first localStorage use
- `ScoreEntry = { score, outcome, seed, elapsedMs, kills, level, dateISO }`.
- `load(): ScoreEntry[]` (tolerant of missing key / malformed JSON — try/catch, return
  `[]` on any parse error, since this is the codebase's first persisted data),
  `record(entry): { entries, rank }` (appends, sorts desc by score, truncates to a small
  cap e.g. 20, persists, returns the sorted list + the new entry's rank for highlighting).
- Storage key namespaced, e.g. `"survivor-rpg:highscores:v1"`.

### `src/ui/RunEndUI.ts` — full-screen terminal panel (models `CharacterMenu.ts`)
- Flat GameObjects (no Container), `scrollFactor(0)`, `RunEndDeps` interface injecting the
  finished `Run`, the `HighScores` list + posted rank, and an `onNewRun()` callback —
  same Deps pattern as `CharacterMenuDeps` (CharacterMenu.ts:22-26).
- Depth **3500-3502** (above CharacterMenu's 3000 so it sits over any open menu, below
  Tooltip's 4500).
- Content: big title (**VICTORY!** green-tinted / **YOU DIED** red-tinted — the one place
  red/green *is* allowed per the reserve-red/green convention, since it's a
  win/lose state marker), final score, a breakdown block (time MM:SS, kills, player level
  reached, boss completion bonus, speed multiplier), a **high-score table** (top ~5, the
  just-posted entry highlighted by its rank), and a **"New Run"** button (`setInteractive`,
  triggers `onNewRun`).
- Full-screen dark scrim behind it so the frozen world reads as "over."

### `src/ui/RunHudUI.ts` — live run readout (fixed HUD)
- Small widget (run clock `MM:SS` + current score) anchored top-of-screen, `scrollFactor(0)`.
- **Depth in the fixed-HUD band (~2820)** — must clear `WORLD_H` (2688) per the
  fixed-HUD-depth rule, so world sprites near the map bottom don't render over it.
- `update(run)` each frame; `toggleMinimized()` collapses to a tiny score-only chip (or
  hides entirely) and back. Placed clear of the top-right minimap and the top-center
  BossHealthUI (top-left is the open corner).

## MainScene wiring (`src/scenes/MainScene.ts`)

- **`create()`**: instantiate `this.run = new Run()`, `this.runHudUI`, `this.runEndUI`
  (hidden). Add a `HARDCORE = true` constant near the other top-of-file constants.
- **`update()` (551-606)**: add an early `if (this.runOver) return;` guard (freezes the
  world sim + input while the end screen is up — the RunEndUI is tween/pointer-driven and
  unaffected). Call `this.run.tick(delta)` and `this.runHudUI.update(this.run)` in **both**
  the living and dead branches, after `stamina.tick()`.
- **`tryAttackEnemy()` kill path (2298-2318)**: after a confirmed kill, classify the enemy
  and `this.run.recordKill(category)` — a small local helper (`instanceof GremlinKing` →
  `"boss"`; Gremlin `.elite` flag → `"elite"`; else `"normal"`), kept in MainScene rather
  than bloating `Enemy`. If `enemy instanceof GremlinKing`, call `this.endRun("won")` after
  the existing loot/death-feedback (the fang still drops).
- **`onPlayerDeath()` (2425-2433)**: branch on `HARDCORE`. Hardcore → keep the buff-clear +
  "You died..." log, then (after a short death-feedback delay, ~1s) call
  `this.endRun("died")` **instead of** scheduling `respawnPlayer`. Non-hardcore keeps the
  existing respawn path untouched — `respawnPlayer()` stays as live code behind the flag,
  which is exactly the documented future easy-mode hook (master plan decision 3).
- **New `endRun(outcome)`**: set `this.runOver = true`, `this.run.end(outcome)`, build a
  `ScoreEntry` (pulling `progression` level + `run` fields), `HighScores.record(...)`, and
  `this.runEndUI.show(...)`. The **"New Run"** callback calls `this.scene.restart()` — a
  clean full reset since all game state is in-scene/in-memory; the high-score table
  survives in localStorage. New seed generated on the fresh `create()`.
- **HUD toggle keybind**: add one key (proposed **J** — free; V/O/H/K/R/Tab are taken) that
  calls `runHudUI.toggleMinimized()`. Register it alongside the other single-key handlers.

## Docs to keep in sync (per project conventions)
- Add the new toggle key to the **Keybinds panel** UI list and `CLAUDE.md`'s Controls
  section.
- Mark **M-R1 shipped** in `STATUS.md`, `CLAUDE.md`'s roadmap (new item 5h), and the
  master plan's build-order checklist.
- `RECIPES.md` — **no change** (M-R1 touches no recipes).

## Verification
1. `node node_modules/typescript/bin/tsc --noEmit` — cheap first check.
2. `preview_start` (config `"dev"`) → `preview_screenshot` to confirm boot + the live run
   HUD renders; `preview_resize` first if the loop is paused (known quirk).
3. `preview_eval` against `window.__game.scene.getScene('MainScene')`:
   - Force death: drain health via `applyDamageToPlayer` / set health to 0 → assert
     `runOver === true`, RunEndUI visible, title = "YOU DIED", score = kill points only,
     and `localStorage` has a new entry (`HighScores.load()` length grew).
   - Force win: spawn + kill a `GremlinKing` (or call the kill path directly) → assert
     title = "VICTORY!", score includes completion bonus × speed mult, entry recorded.
   - Fast vs slow: set `run.elapsedMs` low vs high before a win → assert the speed
     multiplier (and thus score) differs as designed.
   - "New Run" button → `scene.restart()` produces a fresh run (new seed, `elapsedMs` ~0,
     kills 0) while `HighScores.load()` still returns the prior entries.
   - Toggle key collapses/expands `runHudUI`.
4. `preview_console_logs` (level `error`) clean (Phaser/Vite noise ignored).

---

## Shipped 2026-07-10 — implementation notes

Implemented as designed above, with these concrete details:

- **Score constants** (in `Run.ts`): `KILL_POINTS = { normal: 10, elite: 30, boss: 500 }`,
  `COMPLETION_BONUS = 2000`, `SPEED_TARGET_MS = 10 * 60 * 1000`, `MAX_SPEED_MULT = 3`.
  `speedMultiplier(elapsedMs)` and `formatDuration(ms)` exported as free functions (shared
  by `RunHudUI` and `RunEndUI`).
- **`Enemy.elite`** added as a plain readable field (default `false`) on the `Enemy` base
  class, set `true` by both `RangedGremlin`/`MeleeGremling` elite constructors — used by
  `MainScene.classifyKill()` instead of threading a category through `rollLoot()`/loot
  tables.
- **`create()` reset gotcha**: `scene.restart()` re-runs `create()` on the same scene
  instance but does **not** re-run field initializers for booleans already assigned a
  value in a prior life of the scene — `runOver` and `isDead` are now explicitly reset to
  `false` at the top of `create()`, and `this.run = new Run()` is constructed there too
  (previously would have kept a stale `Run` reference otherwise, since `!:` fields aren't
  reset automatically).
- **Win-beat delay** ended up as `1200ms` (not the ~1s estimate) to comfortably outlast
  the enemy fade-out (`Enemy.playDeathFeedback`, 300ms) plus a beat.
- **HUD toggle key**: **J**, added to `KeybindsUI`'s list; its panel's `PANEL_Y` moved
  `10 → 44` to leave room for the new top-left `RunHudUI` clock/score line (EventLogUI
  auto-follows via `KeybindsUI.top`/`.right`).
- Verified live via `preview_eval` (kill-point math, forced death → score posted to
  `localStorage` → YOU DIED screenshot, forced win → VICTORY at exact fast/slow score
  math, New Run reset while scores persisted, HUD minimize toggle) — see `STATUS.md`'s
  M-R1 entry for the full verification log. `tsc --noEmit` clean, no console errors.
