# M-DN — Day / Night Cycle

## Context

Third milestone of the roguelike meta-loop
(`.claude/plans/roguelike-metaloop-master-plan.md`), after M-FX and M-R1 (both shipped).
M-DN adds a **global day/night clock** — the survival-time layer the later milestones hang
off: M-SB (Sleep/Bed skips to dawn), M-FA (Fresh Assault reads in-game time), and the
score's speed multiplier all want a real in-game clock and a night threat to give "surviving
the night" and "going fast" meaning.

**Locked design (from the master plan + this session's answers):**
- **Cycle: 10 min day + 5 min night** (15-min full cycle, day = 2/3). Run begins at dawn.
- **Night teeth (locked, no damage buff):** enemies move **slightly faster** at night, and a
  **modest batch of extra enemies surges in at each nightfall** in still-unexplored cells
  around the player. **Bounded by dawn cleanup** (locked): at daybreak any night-spawned enemy
  that hasn't aggroed and is off-screen is removed, so density returns to baseline each morning
  and can never creep upward over a long multi-night run. Night spawns that *did* engage (or
  are near the player) survive and fold into the normal roster.
- **Torch lighting (added this pass):** at night a held **Torch** casts light around the
  player; **Gremlin Shacks and the Boss Altar are lit** too. Torch becomes **non-stackable**
  (`maxStack: 1`). The radius is data-driven per light item so a future **Lantern** upgrade
  just plugs in a bigger radius.
- **Visual:** a **moderate blue-dusk darkness** over the world (world dims, HUD stays bright),
  smooth dusk/dawn fade, plus a light minimap dim. Darkness is a light-*mask* so torch/POI
  lights carve readable holes in it. The visual itself has no gameplay effect beyond the light.
- New core mechanic → built on **Opus** (already switched).

This is first-pass/tunable, in-memory only. The **boss (GremlinKing) is exempt** from the
night speed buff (bespoke tuned fight). "Denser spawns on respawn" from the locked wording is
naturally out of scope — there is no ambient enemy-respawn system yet; the nightfall surge
covers the "unexplored / newly-entered areas" half.

## New files

### `src/systems/DayNight.ts` (framework-free, like `Run`/`Health`/`Buffs`)
The clock. Ticked with `delta` from `MainScene.update()` so it freezes exactly when the run
does (mirrors `Run.tick`).
- Constants: `DAY_MS = 600000`, `NIGHT_MS = 300000`, `CYCLE_MS = 900000`,
  `TWILIGHT_MS = 20000` (dusk/dawn fade window), `NIGHT_ENEMY_SPEED_MULT = 1.15`.
- State: `elapsedMs = 0`; `tick(delta)` accumulates it.
- API:
  - `phase(): "day" | "night"` — `(elapsedMs % CYCLE_MS) < DAY_MS ? "day" : "night"`.
  - `isNight()`, `dayNumber()` = `floor(elapsedMs / CYCLE_MS) + 1`.
  - `enemySpeedMultiplier()` = `isNight() ? NIGHT_ENEMY_SPEED_MULT : 1` (binary, phase-based).
  - `nightIntensity01()` — 0 in full day, ramps 0→1 over `TWILIGHT_MS` at dusk, 1 through deep
    night, ramps 1→0 over `TWILIGHT_MS` at dawn (drives the tint alpha only).

### `src/ui/NightOverlayUI.ts` (raw `scrollFactor(0)` GameObject, no Container — house style)
The night **darkness + light mask**. A full-screen `RenderTexture` sized to the camera,
`setOrigin(0,0)`, `scrollFactor(0)`, **depth ~2700** (above every world sprite — world uses
`setDepth(y)` up to `WORLD_H` 2688 — but below the fixed-HUD band at 2800+, so HUD/minimap/menus
stay bright while the world dims). Fill `~0x0b1c3a`, moderate max alpha (`MAX_NIGHT_ALPHA ≈ 0.42`).
- `render(intensity01, lights)`: called each frame. If `intensity01 <= 0`, clear + hide (full
  day = no cost). Otherwise: `clear()`, `fill(0x0b1c3a, intensity01 * MAX_NIGHT_ALPHA)`, then
  for each light in `lights` (screen-space `{x, y, radius}`) `erase("light_soft", ...)` a soft
  radial gradient scaled to `radius` — punching a smooth bright hole in the darkness. This is
  the standard "darkness with light holes" technique; `light_soft` is a new pre-generated
  radial-alpha texture (see BootScene below).
- `lights` are computed by `MainScene` in screen space (`worldX - cam.scrollX`, camera zoom is
  1): the player (if a light item is equipped) + each on-screen Gremlin Shack / Boss Altar.

## Modified files

### `src/systems/Fog.ts`
Add `isRevealed(worldX, worldY): boolean` (grid lookup, bounds-checked) — needed so the
nightfall batch can prefer still-fogged cells. Pure read, no behavior change to `reveal()`.

### `src/systems/Items.ts` — torch is non-stackable
Change `torch.maxStack` `99 → 1` (per "torches can't stack"). A future `lantern` item would be
added here similarly and to the light-radius table in `recomputeEquipped()`.

### `src/scenes/BootScene.ts` — soft light texture
Generate a `light_soft` texture (a white radial gradient, opaque center → transparent edge) via
`Graphics`/`generateTexture`, used by `NightOverlayUI` as the erase brush that carves light
holes. Consistent with the all-textures-generated-in-code approach.

### `src/entities/Enemy.ts` — night speed hook + public aggro read
- Add a public field `envSpeedMult = 1` (sibling to the existing `protected speedMult`).
- Multiply it into the **aggressive-movement** velocity sites (leave idle *wander* at base
  speed — night is about the chase, and wander already ignores `speedMult`):
  - Base `Enemy` chase (currently raw `CHASE_SPEED`, lines ~227-228): `* this.speedMult *
    this.envSpeedMult` — this also finally routes `speedMult` through the base chase, harmless
    since non-gremlin base enemies have `speedMult === 1`.
- **Promote `isAggro()` from `protected` to `public`** (base + the `RangedGremlin`/
  `MeleeGremling`/`Snake` overrides) so `MainScene`'s dawn-cleanup filter can ask whether a
  night-spawn ever engaged. Read-only, no behavior change.

### `src/entities/Gremlin.ts` and `src/entities/Snake.ts` — night speed hook
Append `* this.envSpeedMult` to each existing `* this.speedMult` chase/pursue/kite velocity
(Gremlin.ts: RangedGremlin kite ~188-189 + pursue ~194-195; MeleeGremling chase ~370-371) and
to Snake's strike/pursue velocity sites (same pattern; leave its hidden/flee-to-cover idle
movement alone if simplest). `GremlinKing.ts` is **not touched** → boss stays exempt with zero
special-casing (its overridden `update()` never reads `envSpeedMult`).

### `src/scenes/MainScene.ts` — the wiring
- **Fields:** `private dayNight!: DayNight`, `private nightOverlay!: NightOverlayUI`,
  `private wasNight = false` (day/night edge tracker), `private nightSpawns: Enemy[] = []`
  (dawn-cleanup tracking), `private equippedLightRadius = 0`.
- **`create()` reset block** (per the standing `scene.restart()` full-field-reset gotcha —
  M-R1's freeze bug): reset `this.dayNight = new DayNight()`, `this.wasNight = false`,
  `this.nightSpawns = []`. `NightOverlayUI` is a GameObject → recreated in `createHud()` on
  every `create()` automatically.
- **`createHud()`:** instantiate `this.nightOverlay = new NightOverlayUI(this)`.
- **`recomputeEquipped()`:** set `this.equippedLightRadius` from a small light-item table
  (`torch → ~180`, extensible to a future `lantern`), keyed off the selected hotbar item's key.
- **`update()`:** call a new `this.updateDayNight(delta)` in **both** the alive and dead
  branches, next to `this.run.tick(delta)`:
  - `this.dayNight.tick(delta)`, then render the night layer:
    `nightOverlay.render(dayNight.nightIntensity01(), this.collectLights())` and
    `minimapUI.setNightIntensity(...)`.
  - **Nightfall edge** (day→night): if `dayNight.isNight() && !this.wasNight` and
    `!this.isDead` → `this.spawnNightBatch()`.
  - **Dawn edge** (night→day): if `!dayNight.isNight() && this.wasNight` →
    `this.cleanupNightSpawns()`.
  - Update `this.wasNight = dayNight.isNight()`.
- **`updateEnemies()`:** before `enemy.update(...)`, set
  `enemy.envSpeedMult = this.dayNight.enemySpeedMultiplier()` (cheap per-frame assignment;
  covers night-spawned enemies automatically; boss ignores it since its `update()` never reads
  the field).
- **`spawnNightBatch()`:** spawn a small fixed mix of **normal** enemies (first-pass: ~6 — e.g.
  2 Boar, 2 Snake, 2 RangedGremlin) via a new `pickNightSpawnPoint()`. Reuse the existing
  `new Enemy(...)`/`new Snake(...)`/`new RangedGremlin(...)` constructors, push to
  `this.enemies` + `this.enemyGroup` exactly as `spawnEnemies()` does, **and also track each in
  `this.nightSpawns`**. Log one EventLog line ("Night falls — the forest stirs...").
- **`cleanupNightSpawns()`:** for each tracked night-spawn, if it's already dead/destroyed drop
  it; else if `!enemy.isAggro()` **and** off-screen (outside the camera view + a margin),
  destroy it and remove from `this.enemies`/`this.enemyGroup`. Ones that engaged or are nearby
  stay and are simply dropped from `nightSpawns` (now permanent roster). Clear `nightSpawns`
  after. This is what guarantees density returns to baseline each morning.
- **`pickNightSpawnPoint()`:** rejection-sample a point in a ring ~500-850px around the player
  (off-screen so they appear out in the dark), preferring `!fog.isRevealed(x,y)` and non-creek
  cells; fall back to any valid ring point after an attempt cap (same attempt-cap-then-accept
  shape as `pickSpawnPoint`).
- **`collectLights()`:** returns screen-space `{x, y, radius}[]` for the night layer — the
  player (only if `equippedLightRadius > 0`) plus each `gremlinShacks`/`bossAltars` entry whose
  world position is within the camera view (+margin), each with a fixed POI radius. Screen pos
  = `world - cam.scroll` (camera zoom 1).

### `src/ui/RunHudUI.ts` — day/night readout
Extend `update(run, dayNight)` to prefix the line with the phase, e.g.
`[Day 1] T 3:20   Score 40` (full) / `[Night] T 3:20` (minimized). Update the one call site in
`MainScene`.

### `src/ui/MinimapUI.ts` — light night dim
Add a `setNightIntensity(i01)` that fades a thin dark-blue overlay `Rectangle` over the minimap
panel (owned by MinimapUI, above its terrain RenderTexture, below the player dot; alpha
`≈ 0.35 * i01`). Honors the master plan's "minimap dimming at night" note. Skip if it fights
the existing draw order — the world tint is the primary effect.

## Docs (same pass)
- **`STATUS.md`:** new "M-DN — Day/Night cycle" entry.
- **`CLAUDE.md`:** new roadmap sub-entry (e.g. "5i.") + tick M-DN done / M-SB next in the
  build-order line; update the master-plan status note.
- **`.claude/plans/roguelike-metaloop-master-plan.md`:** flip M-DN to SHIPPED, note M-SB next.
- **Commit this plan file into `.claude/plans/`** (per the "plans committed in-repo" convention).
- **Memory:** add a short pointer for the day/night system.
- `RECIPES.md` unaffected (no recipes).

## Verification
1. `node node_modules/typescript/bin/tsc --noEmit` — clean.
2. `preview_start` ("dev") + `preview_resize` (un-stick the render loop if needed) +
   `preview_screenshot` to confirm boot.
3. `preview_eval` against `window.__game.scene.getScene('MainScene')`:
   - Clock: set `dayNight.elapsedMs` to mid-day / just-past-dusk / deep-night / dawn and assert
     `phase()`, `isNight()`, `enemySpeedMultiplier()` (1 vs 1.15), and `nightIntensity01()`
     ramps (0 → partial → 1 → partial → 0).
   - Night speed: force night, run `updateEnemies`, confirm a chasing Boar/Gremlin's body speed
     is ~1.15× its day value and the GremlinKing's is unchanged.
   - Nightfall surge: force the day→night edge, confirm `this.enemies.length` grew by the batch
     size, new enemies are tracked in `nightSpawns`, and they landed in fogged/off-screen cells
     (spot-check `fog.isRevealed`).
   - Dawn cleanup: force night→day with the batch un-aggroed and off-screen → confirm those
     night-spawns are destroyed and `this.enemies.length` returns to baseline; an aggroed or
     near-player night-spawn is kept.
   - Torch light: equip a Torch, force deep night, confirm `collectLights()` includes the
     player entry with the torch radius (and none when a non-light item is selected); confirm
     on-screen shacks/altar contribute light entries.
   - Reset: kill the run → New Run → confirm `dayNight.elapsedMs === 0`, `wasNight === false`,
     `nightSpawns` empty, overlay cleared.
4. `preview_screenshot` at deep night to confirm the moderate blue darkness dims the world with
   a readable bright pool around a torch-holding player, while the HUD/minimap stay readable;
   `preview_console_logs` (level error) clean.
