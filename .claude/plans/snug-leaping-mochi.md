# M-WC — Gremlin War Camp (altar POI upgrade + hints)

## Context

Next milestone in the locked roguelike meta-loop build order (`.claude/plans/roguelike-metaloop-master-plan.md`,
M-WC section). Everything through M-RL has shipped. The Boss Altar today is a lone
64x56 structure dropped in the forest with a partial density gradient already around it
(2 of 5 Gremlin Shacks biased near it, 3 concentric bands of decorative `gremlin_camp_prop`
clutter within 500px, and +6 Gremlins / +4 Gremlings via `spawnAltarDensity()`). It reads
as "denser gremlin content" but not as a *place* — there's no walled camp, no banners, and
the only navigation aid is the altar's own one-time minimap landmark.

M-WC promotes the altar into a **walled Gremlin War Camp**: palisade + banners + totems +
lit braziers around the altar, an escalating breadcrumb-prop trail leading toward it, and a
more prominent minimap landmark once discovered. It also folds in a standing backlog item —
the 5 scattered Gremlin Shacks getting the same discovered-minimap-landmark treatment the
altar already has. This is content + layout on existing systems (altar/shack/camp spawn,
`MinimapUI.revealLandmark`, the M-DN night light-mask), no new state machine or data model.

**Model:** Sonnet (content/wiring on already-designed systems, per the working convention).

**Locked decisions (the user, this session):**
- Shacks stay scattered; bump near-altar count 2→3 to populate the camp, leave 2 wild. Each
  shack still gets its own standalone minimap landmark.
- The camp glows at night — add decorative lit braziers that emit night light (reuse M-DN's
  light-mask), so the camp reads as an inhabited glow from a distance.

## Changes

### 1. New placeholder textures — `src/scenes/BootScene.ts`
Add four generated textures alongside the existing `boss_altar`/`gremlin_camp_prop` bakes
(same crude-pixel style, palette-consistent with the gremlin roster):
- **`palisade_stake`** (~12x26): a pointed vertical wooden stake, dark brown with a lighter
  edge. Tiled into a ring = the camp wall.
- **`gremlin_banner`** (~16x30): a pole with a crimson/green war-cloth (elite palette).
- **`war_totem`** (~18x38): a taller stacked bone/skull totem pole — a camp centerpiece prop.
- **`camp_brazier`** (~14x22): a post with a flame bowl on top; doubles as the night light
  source. Flame in the same orange as the altar's fire (`0xe8862c`).

### 2. War-camp layout — `src/scenes/MainScene.ts`
New `spawnWarCamp()`, called right after `spawnAltarDensity()` in `create()` (~line 524),
reading `this.altarPosition` (guard-return if null). Deterministic via `this.sessionRng()`,
same as the existing camp code. All props are plain `scene.add.image(...).setDepth(y)` —
non-solid and Y-sorted, consistent with every other world structure. Props are untracked
scene images (auto-destroyed on `scene.restart()`), so no reset needed for them.
- **Palisade ring**: stakes at radius ~230px around the altar, one every ~14°, **skipping a
  ~55° entrance arc** (fixed facing, e.g. toward world center so the player walks in through
  the gate). Small per-stake jitter so it doesn't look laser-perfect.
- **Banners**: ~4 `gremlin_banner` scattered inside the camp (radius 60–200px).
- **Totems**: ~2 `war_totem`, one flanking the altar.
- **Braziers**: ~3 `camp_brazier` (two flanking the entrance gap, one deeper in). Their world
  positions are pushed to a new `campLightPoints: { x: number; y: number }[]` field.
- **Breadcrumb trail**: 2 sparse outer bands of `gremlin_camp_prop` (500–750px count ~6,
  750–1050px count ~4) extending the existing 3 inner bands, so clutter *increases* as the
  player approaches — the environmental hint trail. Enemy counts unchanged (locked decision 7:
  prefer a bigger world over more enemies; the trail is decorative).

Bump `SHACK_NEAR_ALTAR_COUNT` 2→3 in `spawnGremlinShacks()`.

Add `private campLightPoints: { x: number; y: number }[] = [];` and reset it to `[]` at the
top of `create()` (alongside the other per-run field resets, per the `scene.restart()`-
doesn't-re-init-fields gotcha).

### 3. Night lighting — `src/scenes/MainScene.ts` `collectLights()`
After the existing shack/altar loops, add a loop over `campLightPoints` pushing a
`{ x, y, radius: POI_LIGHT_RADIUS }` light for any on-screen brazier (reuse the existing
`onScreen`/`toScreen` helpers verbatim). Braziers glow at night exactly like the altar/shacks
already do — no new lighting code, just more light sources.

### 4. Minimap landmarks — `src/ui/MinimapUI.ts` + `src/scenes/MainScene.ts`
- **`MinimapUI.revealLandmark(worldX, worldY, color?, radius?)`**: add an optional `radius`
  param (default the current 1.5) so a bigger marker can distinguish the war camp from a
  plain shack. Draw `fillCircle(radius, radius, radius)` and offset the draw by `-radius`.
- **Shack landmarks (backlog item)**: add `discoveredOnMap = false` to `GremlinShack`
  (`src/entities/GremlinShack.ts`). In `MainScene`, generalize the discovery pass — rename/extend
  `updateAltarDiscovery()` to also loop `this.gremlinShacks`, revealing each once the player is
  within `REVEAL_RADIUS`, in a distinct **wood-brown** color (e.g. `0x8a6a3a`, radius 1.5) so
  shacks read differently from the altar.
- **War-camp landmark**: keep the altar's existing reveal but make it **more prominent** — the
  altar's `revealLandmark` call passes the red default with a **larger radius (~2.5)**, so the
  war camp is the standout marker on the map. (Altar position == camp center, so no separate
  camp landmark is needed.)

### 5. Docs
- `CLAUDE.md`: new `5o.` roadmap entry under item 5 for M-WC; update the master-plan build-order
  summary paragraph (M-WC done, M-TE next).
- `STATUS.md`: new "Just finished: M-WC" entry with verification detail.
- `.claude/plans/roguelike-metaloop-master-plan.md`: mark M-WC shipped in its section + the
  build-order list.
- Copy this plan file into `.claude/plans/` and commit alongside the feature (plans-in-repo
  convention). No `RECIPES.md` change (no new recipes/upgrades this milestone).

## Files touched
- `src/scenes/BootScene.ts` — 4 new textures.
- `src/scenes/MainScene.ts` — `spawnWarCamp()`, `campLightPoints` field + reset, `collectLights()`
  brazier loop, generalized discovery loop, `SHACK_NEAR_ALTAR_COUNT` 2→3, war-camp reveal radius.
- `src/ui/MinimapUI.ts` — `revealLandmark` optional `radius` param.
- `src/entities/GremlinShack.ts` — `discoveredOnMap` field.
- `CLAUDE.md`, `STATUS.md`, `.claude/plans/roguelike-metaloop-master-plan.md`.

## Verification
1. `node node_modules/typescript/bin/tsc --noEmit` — clean.
2. `preview_start` "dev" + `preview_screenshot` boots.
3. `preview_eval` against `MainScene`:
   - Teleport player to `altarPosition`; screenshot shows the palisade ring w/ entrance gap,
     banners, totems, braziers around the altar; breadcrumb props thin out with distance.
   - `collectLights()` includes brazier lights when camera is on the camp; force night
     (`nightIntensity01` high) + screenshot → the camp glows.
   - Walk player within `REVEAL_RADIUS` of a shack and of the altar; assert
     `shack.discoveredOnMap`/`altar.discoveredOnMap` flip true and `MinimapUI` shows a
     brown shack dot + a larger red war-camp dot (screenshot the minimap).
   - New Run (`scene.restart`) → `campLightPoints` reset to `[]`, camp regenerates cleanly.
4. `preview_console_logs` (error level) clean.

## Same-day playtest follow-up (the user: "the camp just looks so busy")

The first ship above (all four sections) landed as designed, but the first look at it in the
live preview showed a genuine layout bug, not placeholder-art pickiness: two systems were
drawing decoration over each other with no exclusion zone. `spawnAltarDensity()` still ran
its **pre-existing** (pre-M-WC) 3-band `gremlin_camp_prop` scatter (0–500px, 40 props) right
on top of the new palisade/banners/totems/braziers, and ordinary trees/rocks/bushes/wild
enemies had no reason not to spawn inside the camp at all, since nothing told the world-gen
scatter functions the camp existed.

**Fix (implemented, not just tuning):**
- **New shared constants** `WAR_CAMP_RADIUS = 230` (the palisade wall — also now the camp
  floor stamp radius) and `WAR_CAMP_CLEAR_RADIUS = 300` (padded past the wall so cluster
  jitter can't slip a node inside it) in `MainScene.ts`, module scope near
  `ALTAR_CLEAR_RADIUS`.
- **`pickSpawnPoint()`** (used by every tree/rock/boulder/bush/enemy scatter call) and
  **`pickCreekEdgePoint()`** (Cattail's own bespoke sampler — doesn't route through
  `pickSpawnPoint`, so it needed its own copy of the same check) both reject any candidate
  within `WAR_CAMP_CLEAR_RADIUS` once `this.altarPosition` is set.
- **`scatterClustered()`** (bush clumps) gets an extra fallback-to-cluster-center check after
  jitter, mirroring the existing creek-avoidance fallback pattern, since jitter alone could
  still push an already-valid cluster center back inside the wall.
- **`this.altarPosition` is now assigned *before* `spawnNodes()`/`spawnEnemies()` run** in
  `create()` (previously it was picked only after the world was already scattered) — moved
  right after `this.biome = new Biome(...)`, since `sessionRng()` returns an independent,
  non-deterministic generator per call, reordering it doesn't affect anything else.
- **`buildBiomeTexture()`** stamps a distinct packed-dirt floor color (`0x5a4a30`, radius
  `WAR_CAMP_RADIUS`, 40px soft edge, same falloff idea as the forest/creek blend) over the
  camp's own small bounding box once `altarPosition` is known.
- **Removed** `spawnAltarDensity()`'s old 3-band prop scatter entirely — `spawnWarCamp()` is
  now the single source of truth for all camp dressing (inside the wall AND the breadcrumb
  trail approaching it, rebased to start at 300px instead of 500px so it doesn't overlap the
  new clear zone).
- **Huts are evenly spaced, not a random roll** — `spawnGremlinShacks()`'s 3 near-altar
  shacks no longer call `pickPointNearAltar`; they're fanned at a fixed ~170px radius, 100°
  apart (± small jitter), centered on the side of the camp *opposite* the entrance gate, via
  a new shared `campGateFacing()` helper (also used by the palisade gate + brazier
  placement, so everything agrees on one facing). Banner/totem scatter radii tightened
  (140px/110px, down from 200px/130px) so they stay in the courtyard instead of competing
  with the hut ring.

**Verified:** across multiple fresh reloads/reseeds, 0 of ~396 world nodes ever land within
300px of the altar (an initial check caught 1 stray Cattail at 260px via the
`pickCreekEdgePoint` gap — fixed and reverified at 0 on the next reseed); the 3 huts land at
~161–177px from the altar (target 170±10); `preview_screenshot` at both a wide shot and a
close zoom shows a clean dirt clearing, palisade ring, and evenly-fanned huts with zero
stray clutter inside the wall. `tsc --noEmit` clean, no console errors. Deliberately **not**
touched: the M-DN nightfall-surge enemy spawner (`pickNightSpawnPoint`) can still drop a
wandering enemy inside the camp — out of scope (not "ground clutter", and thematically
tolerable — the camp is gremlin territory anyway).
