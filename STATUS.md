# Status

## Current State

_Living snapshot — edit in place, never append. Last shipped: **Biome 2 — Phase 1
(Combat systems layer)** — the reusable mechanics biome-2 content will declare as data, all
dormant hooks until Phase 2 enemies/Phase 4 weapons use them: (1) a per-enemy **damage-type
resist/weakness** multiplier (`EnemyConfig.resistances`, applied in `resolveWeaponHit`; the
floating damage number recolors — orange-red weak, dim-blue resisted); (2) **per-weapon AOE
arc** melee cleave (`WEAPON_ARC` — spear/clubs sweep multiple in a cone, knife stays
single-target, ranged untouched, per-target crit); (3) **swarm pack-aggro** base
(`Enemy.packAggro`/`forceAggro` + `MainScene.updatePackAggro` — an aggro'd member wakes idle
same-type neighbors). Plus a dormant **magic-bypasses-flat-armor** branch in
`applyDamageToPlayer`. **2026-07-12**. Prior: Biome 2 Phase 0 (patchwork worldgen); Welcome
overlay per-page-load gate; Enemy respawn (fog top-up)._

**The game.** Top-down 2D pixel survival-ARPG (Phaser 3 + TypeScript + Vite; all
textures are placeholders generated in `BootScene`). A forest biome (biome 1) in the center of a
large **circular** world (now **28000px, `WORLD_RADIUS` 14000**, grown for ~5 biomes). Biome 1
is a solid **protected forest disc** (`BIOME_RADIUS` 2000, unchanged); everything beyond it is a
**Valheim-style patchwork** (`src/systems/WorldBiomes.ts`): a universal base layer that grades
grass→dusty outward, with biome **blobs** painted on top (metaball coverage). **Radius sets a
danger CEILING** — a blob may be any biome with `tier ≤ ceiling(r)`, weighted toward the ceiling,
so a higher-tier biome never appears below its unlock radius (no out-of-order danger) while lower
biomes (forest, badlands) can appear anywhere out in later-biome territory; forest also spawns as
blobs beyond the disc. Two outer biomes exist as **terrain only, no content**: the **Sunscorch
Badlands** (dusty red-brown) and a placeholder **Windswept Dunes** (pale sand). A **current-biome
label** sits on the minimap and a **discovery toast** fires on first entry to each biome
(`Ctrl+Shift+M` = dev reveal-whole-map). Day/night cycle and a hardcore
run/score meta-loop (seed is display-only for now). Shipped systems: gather/craft with
tool-KIND gating + a Workbench tier gate;
souls-like telegraphed combat on **every** enemy (Boar charge, Snake coil-lunge,
Gremlin/Gremling claws) plus the first boss (Gremlin King — poise/stagger + leaping
smash / charge / ground slam, enrage <50% HP); stamina/sprint/dash with dash i-frames;
Skills + Player Level progression; placeable stations (Campfire, Drying Rack, Relic
Forge, Bedroll); cooking → timed HP-regen food buffs; wearable 3-tier Gremlin armor +
weapon/station upgrades; elites (chance-based rolls + forced-elite shack guards)
dropping per-species trophies; a probabilistic trophy→Relic economy with a gated
**trophy-refinement** loop (the Gloaming Vein ore POI + Gloamwarden mini-boss →
Gloam Shards → the Relic Forge's Refine tab); a **nearby-view
minimap + full-screen zoomable/pannable world map** (M / Map button) with fog of war and
discovered-POI icons; the Gremlin War Camp + Gloaming Vein POIs; contextual hints + a
pause menu; and a drift-free balancing dashboard at `/dashboard.html` (second Vite entry,
imports live data modules).

**Meta-loop** (`.claude/plans/roguelike-metaloop-master-plan.md`): M-FX / M-R1 /
M-DN / Comfort(M-SB) / M-EL2 / M-RL / M-WC all shipped; M-FA cut. Hardcore one-life
death ends a run and posts a `localStorage` high score; killing the Gremlin King =
win. The world is now circular + much larger (M-W1 geometry prep, above); deterministic
seeded world-gen and actual multi-biome content are still deferred to M-W1 proper.

**In progress / next.** **Biome 2 (Sunscorch Badlands) is underway** — a phased umbrella
plan (`.claude/plans/biome-2-sunscorch-badlands.md`) drives it. **Phase 0 (Patchwork
worldgen)** and **Phase 1 (Combat systems layer)** have shipped: the world grew to 28000px for
~5 biomes with the patchwork terrain foundation, and the reusable combat mechanics (damage-type
resist/weak, per-weapon AOE arcs, swarm pack-aggro base, magic-armor-bypass hook) now exist as
dormant data hooks — walkable/mapped, but **still empty of content**. Remaining phases (own
Opus sessions each, own plan files): **Phase 2** — badlands enemies & wildlife (Gloamreach-
flavored canid swarm, rock reptile, magical gremlin, +1 native creature, arid flora), **next**;
Phase 3 badlands boss (new win-con, demotes Gremlin King) + King critical-drop rework + 2
POIs; Phase 4 smelting/forging gear tier; Phase 5 tier-2 relics + biome-1 trim +
family-replace-with-refund. The master-plan tail **M-TE** (trophy-gated gear) is folded into
this biome-2 work. Real pixel art/animations stay deliberately deferred until content/balance
settle (roadmap item 8). Phase 1's arc/resist/pack numbers are all first-pass — expect a tuning
pass once Phase 2 enemies actually use them.

**Known issues / open.**
- Boss may be slightly overtuned after the 5s damage bump (the user's "TBD" — left as-is
  since the harder feel was wanted). 5t cut the smash AoE 120→95 so it's movement-dodgeable;
  dash i-frames confirmed working against it.
- Enemy shove-knockback is near-cosmetic — `Player.update()` zeroes idle velocity each
  frame; deferred to a combat-feel pass.
- No save/load beyond the high-score table; all run state is in-memory only.
- The dashboard **Enemies tab is the one hand-mirrored data source** — keep it in sync
  when tuning enemy stats (everything else on the dashboard is imported live).
- **World Y-sort depth is compressed** (`systems/depth.ts` `ysortDepth` = `y * 0.09`,
  shrunk when the world grew to 28000px in biome-2 Phase 0) so world objects stay below the
  fixed HUD. Max-world-y depth 28000×0.09 = 2520, clear of the 2600 HUD floor. Any NEW world
  object that Y-sorts by position must use `ysortDepth(y)`, not raw `y`. **If the world grows
  further, shrink this again** (invariant: `WORLD_SIZE × scale < 2600`).
- **A world-sized `tileSprite` is out-of-memory** and must never be recreated. Phaser
  TileSprite allocates a canvas its own size; at 28000² that's ~3GB → boot OOM (this bit us
  this session). The grass tilesprite now covers only the forest region (`BIOME_SIZE`); the
  outer ground is a single bounded `bakeOuterOverlay` RenderTexture (`OVERLAY_TEX` 4096²,
  LINEAR-filtered, stretched over the world — constant GPU cost at any world size). Never size
  a tilesprite/RenderTexture to the whole world.
- **Outer world is empty of content for now.** The forest disc (biome 1) holds all enemies/
  nodes/POIs; the badlands + dunes patchwork beyond it is terrain only until Phases 1–5. A
  player can walk far into empty patchwork — harmless. The world map opens centered on the
  player (nearby view); zoom-out to full world via the wheel.

## Recent Entries

> Older entries in STATUS-archive.md.

### Biome 2 — Phase 1: Combat systems layer (damage types, resist/weak, AOE arcs, swarm base)

Plan: `.claude/plans/biome-2-phase-1-combat-systems.md` (Phase 1 of the
`biome-2-sunscorch-badlands.md` umbrella). Built on **Opus** (new combat mechanics). Three
reusable mechanics built *before* the biome-2 content so Phase 2 enemies / Phase 4 weapons can
declare them as data — all dormant until then, so biome-1 combat is unchanged. No new
enemies/weapons/content; verified by temporarily flagging existing enemies/weapons via eval.

**1. Damage-type resist/weakness.** `magic` already existed in `DamageType`; this adds the
multiplier layer. `EnemyConfig.resistances?: Partial<Record<DamageType, number>>` (`<1` resist,
`>1` weak, absent = 1) → stored on `Enemy`, exposed via `resistMultiplier(type)`. Applied at
the single choke point `resolveWeaponHit` (so it covers **both** melee and ranged and can't
drift), which also derives an effectiveness (`weak`/`resist`/`normal`) and passes it to
`spawnDamageNumber` — a non-crit number tints bright orange-red (weak) / dim blue (resisted);
crit's yellow still wins. Empty for every biome-1 enemy.

**2. Player-side magic-armor bypass (dormant hook).** `applyDamageToPlayer` gained an optional
`dmgType?: DamageType`; when `"magic"` it **skips the flat-armor term** (relic %-reduction
still applies, still floored at 1). No enemy deals magic until Phase 2's magical gremlin, so
every current caller uses the unchanged physical path. Verified live: 30 magic vs 30 blunt in
10-armor gremlin set → 30 taken (bypassed) vs 20 taken (30−10).

**3. Per-weapon AOE arc** (locked decision 6). `WEAPON_ARC: Record<WeaponType, {halfAngleDeg;
range; falloff}>` + `weaponArc()` in `Weapons.ts` — knife 25°/34px/0.5 (near single-target),
clubs medium, **primal_spear 50°/58px/0.7 (wide sweeper)**, ranged `range: 0`. `tryMeleeAttack`
now computes a shared pre-stagger/pre-crit `raw`, resolves the primary, then (if `arc.range > 0`)
sweeps other live enemies within `range` and `±halfAngle` of the swing direction (player →
primary target), each taking `raw × staggerMult × falloff` with **its own per-target crit**
through the same `resolveWeaponHit` (own resist, kill/loot/XP). Extracted
`staggerMultiplierFor(enemy)` (the GremlinKing/Gloamwarden `isStaggered()` checks) so
primary/secondary/ranged share it. `enemyRadiusBonus()` lets the cone still catch a big
elite/boss at its edge. Verified live: spear hit primary + in-cone neighbor (falloff) but not
the out-of-cone one; knife hit only the primary (neighbor beyond its 34px range).

**4. Swarm pack-aggro base** (opt-in). Public `Enemy.packAggro`/`packAggroRadius` (220) +
`forceAggro(now)` (wakes idle→chasing without damage; clears post-giveup immunity).
`MainScene.updatePackAggro(now)` (called each frame from `updateEnemies`) wakes idle **same-class**
`packAggro` neighbors of any aggro'd `packAggro` member — O(k·n) with k = packAggro count (0
today → effectively free). `forceAggro` drives the base `state` machine; a subclass tracking
aggro via its own field (Boar/Snake/Gremlin's private `mode`) must **override** it, exactly as
they already override `isAggro()` — documented in-code for Phase 2's swarm author. Verified live:
leader woke a 120px neighbor, not a 600px one, and not a different-class enemy 10px away.

**Verification.** `tsc --noEmit` clean. Live `preview_eval` against `MainScene` confirmed all
four (the render loop was throttled/backgrounded — pumped `game.loop.step` to reach RUNNING, per
CLAUDE.md's "assert against scene state, not screenshots" guidance). No `RECIPES.md`/dashboard
change (no recipe or enemy-stat data change — resist values arrive with Phase 2 enemies). See
[[survivor-rpg-biome-2-plan]].

### Biome 2 — Phase 0: Patchwork worldgen (bigger world + base-layer + biome blobs)

Plan: `.claude/plans/biome-2-phase-0-world-ring.md` (Phase 0 of the
`biome-2-sunscorch-badlands.md` umbrella). Built on **Opus** (world-gen rework). **Note:** an
initial concentric-**rings** version shipped and was **reworked same session** — the user found
rings too uniform and wanted Valheim-style diversity. This is the patchwork rebuild.

**Locked model (this session's brainstorm):** biome 1 = a solid **protected forest disc**
(unchanged, safe tutorial); *beyond* it a **universal base layer** (grades grass→dusty outward)
with biome **blobs** on top, each blob's biome drawn weighted by `danger = radialTier(r) + noise`
(moderate variance). Biome types repeat; blobs blend at seams with base-layer gaps between. World
grows **~2×** for ~5 biomes. Map centers on the player.

- **World grown to `WORLD_RADIUS` 14000 (28000px).** `depth.ts` `WORLD_DEPTH_SCALE` 0.3→**0.09**
  (28000×0.09 = 2520 < 2600 HUD floor; all Y-sort sites already use `ysortDepth`).
- **`src/systems/WorldBiomes.ts` (new, framework-light).** The level-1 biome-TYPE map: a
  jittered-grid **blob seed scatter** (which also serves as the spatial bucket for O(3×3)
  `coverageAt`), each seed's biome picked by `dangerAt(seed)` (nearest tier: badlands=2,
  dunes=3). `coverageAt` = metaball smoothstep falloff w/ noisy edges; `forestCoverage(r)`
  forces a solid disc ≤2000. **`worldBiomeColorAt`** is the single terrain-color source (base
  graded + badlands + dunes + forest-on-top) used by BOTH the bake and the map → no drift.
- **Palettes:** `Badlands.ts` (dusty red-brown `0x8f5a42` clay + mesa + ravine) and new
  `Dunes.ts` (pale sand) — a **placeholder terrain-only** biome so the patchwork reads with >1
  outer biome. Both reuse **one tiled `Biome`** for feature detail (new `Biome` `tiled` mode
  wraps coords, so a small cheap Biome repeats across the huge world vs a 28000px Voronoi).
  `colorUtil.ts` holds the shared `blendColors`.
- **Rendering (bounded, GPU-safe at any world size).** Forest keeps its crisp 4000² bake (now
  faded by `forestCoverage` so it never paints past the edge) — biome 1 pixel-identical. The
  outer ground is ONE `bakeOuterOverlay` RenderTexture (`OVERLAY_TEX` 4096², ~64MB,
  LINEAR-filtered, stretched over the world; skips the forest core). **A world-sized
  `tileSprite` OOMs** (28000²≈3GB — the boot bug this session, found via a stack trap since the
  uncaught error wasn't in the console filter); grass is now forest-region-sized only.
- **Map.** `ExploredMap.terrainColorFn = worldBiomeColorAt`; `WorldMapUI.openMap(px,py)` now
  **centers on the player** (new `centerOn`), framed to a ~5000px nearby view (wheel zooms out).

**Verified** (`tsc --noEmit` clean; `preview_eval` + screenshots, console error-free): boot OK;
forest core pixel-identical; coverage gradient forest→badlands→dunes with `dangerAt` rising
2.1→4.4 outward; badlands = dusty red-brown, dunes = pale sand, base-layer gaps between blobs,
all smoothly blended; world map shows the patchwork centered on the player; **all 401 nodes +
103 enemies stayed in the forest disc** (no leak into the empty patchwork). No `RECIPES.md`/
dashboard change. See [[survivor-rpg-biome-2-plan]], [[survivor-rpg-circular-world]].

**Same-session refinements (the user's feedback):**
- **Biome ordering → radius sets a danger CEILING** (`WorldBiomes.ceilingTier`/`pickBiome`), not
  a fixed tier. A blob may be any biome with `tier ≤ ceiling(r)`, weighted toward the ceiling —
  higher biomes gated behind an unlock radius (no out-of-order danger), lower biomes appear
  anywhere. **Forest is now a blob biome too** (spawns beyond the disc); the center chunk stays
  biome-1-only via `forestCoverage`. Verified across 600 samples/band: **dunes = 0 in every band
  before ~6500**; forest present at all radii (307→136→186→69→74).
- **Current-biome HUD label** on the minimap + a **first-entry discovery toast** (new `"biome"`
  `LogKind`, gold center toast; forest pre-marked so the first toast is genuinely new). Verified:
  entering badlands/dunes updated the label + fired one toast each. `BIOME_NAMES` = placeholder
  flavor (Verdant Woods / Sunscorch Badlands / Windswept Dunes / The Wilds).
- **Dev command `Ctrl+Shift+M`** (`revealEntireMap`) clears all fog + opens the world map for
  worldgen inspection (undocumented — not in the Keybinds panel). Verified: 490k cells revealed.

### Welcome overlay — show once per page load during early access

Off the build order, built on Sonnet (gating tweak on an existing system, no new
mechanic). the user reopened the deployed playtest link and didn't get the welcome — not a
deploy bug: the overlay's `localStorage` flag (`survivor-rpg:welcome-seen:v1`) is
once-ever-per-browser, and his browser had already dismissed it. Locked direction: for an
early-access playtest, show it **every session** (once per fresh page load) without
re-spamming on in-session New Run restarts.

- **`src/ui/WelcomeUI.ts`** — added `ALWAYS_SHOW_EACH_LOAD` (const, `true`) + a
  module-scoped `shownThisLoad` flag. `hasSeenWelcome()` returns `shownThisLoad` in
  early-access mode (falls back to the untouched localStorage gate when the const is
  flipped off); `markWelcomeSeen()` always sets `shownThisLoad`, and only writes
  localStorage in the non-early-access path. The module re-evaluates on a full page reload
  (→ shows again) but persists across `scene.restart()` (→ New Run does NOT re-show) —
  exactly the wanted granularity. Reverting to permanent "once ever" is a one-line flip.
- **`MainScene.ts`** — comment-only: the first-launch note by the `openWelcome()` trigger
  now describes the per-page-load behavior. No logic change (the `!hasSeenWelcome()` guard
  is unchanged; only its return value semantics moved).
- Note: playtesters get this only after the next push to `main` triggers the Pages deploy.
  No `RECIPES.md` change.

### Welcome + How to Play overlay, keybind clarity fix

Off the playtest-readiness backlog, built on Sonnet (new UI on existing freeze/menu
patterns, no new core mechanic). the user flagged two gaps: Ctrl+Click and Shift+Click
(quick-move / split-stack) had no in-game callout anywhere, and there was no cold-start
"what is this game" moment for new playtesters.

- **Keybinds panel** (`MainScene.ts`'s `KeybindsUI` bind list) gained two lines:
  `"Quick-move item: Ctrl+Click"` / `"Split stack in half: Shift+Click"`, next to the
  existing Left/Right Click lines.
- **`src/ui/WelcomeUI.ts`** (new) — a 2-page modal (Welcome / How to Play), styled after
  `PauseMenuUI`/`RunEndUI` (flat scrollFactor(0) GameObjects, depth 3600-3602, above
  every other menu). Page 1: early-access framing (placeholder art/sound, balance still
  tuning) + a thank-you for playtesting alongside development. Page 2: the
  Explore→Gather→Craft→Level→Fight loop at a high level, "play at your own pace but the
  score rewards speed," core controls (LMB/Tab/K/Esc), and the two click-modifier
  shortcuts above. **Deliberately spoiler-free**, matching `Hints.ts`'s standing rule —
  never names the totem/altar/boss win condition.
  - `hasSeenWelcome()`/`markWelcomeSeen()` persist a `localStorage` flag
    (`survivor-rpg:welcome-seen:v1`), same pattern as `HintManager`'s on/off pref — shows
    once per browser, not once per run.
- **`MainScene.ts` wiring**: `openWelcome()` reuses the exact `isPaused` freeze
  `openPauseMenu()` already establishes (`physics.world.pause()` + `time.paused = true`)
  rather than a second parallel freeze flag; `create()` calls it once if
  `!hasSeenWelcome()`. The pause menu (`PauseMenuUI`) gained a **"How to Play"** button
  (`onHowToPlay` dep) that re-shows the same overlay on demand — `openPauseMenu()` was
  split into itself (freeze + guard) and a new `showPauseMenuPanel()` (just the
  `.show()` call, no guard), so closing "How to Play" opened *from* the pause menu can
  re-invoke `showPauseMenuPanel()` without tripping `openPauseMenu()`'s
  `if (this.isPaused) return` guard (confirmed via `preview_eval` — the naive first
  version silently no-op'd on that exact path). Esc closes the welcome overlay first
  (before the pause-menu/menu-close checks), acting as "Start Playing."
- Verified via `preview_eval`: first-load overlay renders (both pages, Back/Next/Start
  Playing), `finish()` unfreezes + sets the localStorage flag, and the pause-menu →
  "How to Play" → close → back-to-pause-menu round-trip restores the correct frozen
  state. No console errors. No `RECIPES.md` change (no recipe/cost changes).

### Playtest polish batch — hints, elite tooltip, javelin, dash VFX, miniboss leash, text timings, stats display

Grab-bag of 11 playtest-feedback fixes (Sonnet-class polish on existing systems, no
new mechanic). Verified live via `preview_eval` + screenshots; `tsc --noEmit` clean.

- **F11 fullscreen reminder** — folded into the `awaken` hint text and added a
  "Fullscreen: F11" line to the Keybinds panel (F11 is the browser's own native
  fullscreen; nothing to wire).
- **Right-click discoverability** — new `right_click_tip` hint ("Right-click equipped
  gear or a placed station to inspect and upgrade it") triggered the first time the
  player places a station OR equips an armor piece, plus a "Inspect / upgrade: Right
  Click" Keybinds line.
- **Elite/boss red hover tooltip** — `promptForEnemy` now prefixes `Elite ` for
  `enemy.elite`, and a new `promptColorFor()` tints the bottom-right prompt text:
  crimson `#ff5a5a` for a boss/mini-boss (`GremlinKing`/`Gloamwarden`), orange
  `#ff9d5c` for elites, white otherwise. Verified: "[LMB] Attack Elite Boar".
- **Javelin art + thrown angle** — `icon_javelin` redrawn DIAGONALLY (bottom-left →
  top-right) so it no longer reads like the vertical Primal Spear icon. The in-flight
  javelin now flies nose-first: added `ProjectileConfig.artAngleOffset` (applied in
  `setRotation`) + `RangedWeaponConfig.projectileArtAngleOffset` = `Math.PI/2` for the
  javelin (its streak art points up). Verified rotation = angle+90°.
- **Dash more obvious** — `Player.playDashFx()` spawns 3 staggered translucent
  blue-tinted afterimage ghosts of the player sprite that fade/shrink over 260ms;
  called from the `frame.dashStarted` branch in `update()`.
- **Gloamwarden roams back to spawn** — its `updateIdle` deaggro branch now walks the
  mini-boss back toward its spawn point (mirrors `GremlinKing`'s `RETURN_HOME_EPS`
  return-home behavior) instead of idling wherever it was kited to.
- **All text fades slower** (playtest: "text isn't fading out slow enough", gloam-shard
  help vanished too fast) — HintUI HOLD 5200→8000 / FADE 700→1400; EventLogUI recipe/
  material toast HOLD 3200→5500 / FADE 900→1500; center toast delay 2200→4000 /
  duration 900→1500.
- **Altar/win-path guidance** — two new hints so the goal is clear after clearing camps:
  `altar_found` (fires when the War Camp altar is discovered on the map) and
  `totem_ready` (per-frame idempotent poll — fires once the player holds a
  `gremlin_totem`, pointing them to place it in the Boss Altar's fire). This
  deliberately relaxes the old "never spell out the win condition" hint rule, per
  the user's request.
- **Stats page total effect** — new `Progression.statTotalEffect(stat, p)` returns the
  CURRENT cumulative effect of points already spent (e.g. Vitality 5 → "+20 max HP,
  +7.5% healing"); shown as an amber "Now: …" line under each stat in `CharacterMenu`'s
  Stats tab (row height 44→52 to fit the third line).

### Enemy respawn — fog top-up (playtest food-economy fix)

Off the master-plan build order, built on **Opus** (a new spawn subsystem with its own
timing/state, not just a tuning change). Playtesters were burning through food far faster
than expected because the enemy roster was **one-shot and finite** — only wild (non-camp)
Gremlin Shack guards ever came back (their own 6-min pair timer). Meat sources (Boar/Snake)
drained to empty over a run. Now the world keeps itself huntable.

**Model (locked with the user via `AskUserQuestion`): fog top-up**, chosen over per-kill
replacement and full-world repopulation. A periodic check (`MainScene.updateRespawns`, every
`RESPAWN_TICK_MS` = **30s**, called from `update()`'s **alive branch only**) keeps the live
non-boss enemy count within `RESPAWN_NEARBY_RADIUS` (1500px) of the player topped up toward
`RESPAWN_NEARBY_TARGET` (10), spawning at most `RESPAWN_PER_TICK` (1) replacement per tick. At
1/30s that repopulates a fully cleared area in **~5 min** — the locked pace (an initial 7s/
~1-2 min tick felt way too fast in playtest; the user wanted ~5 min/area max). Bounded both
locally (the target) and globally (`RESPAWN_MAX_LIVE` 160) so camping can't build a swarm and
a long run can't run away.

**Off-screen spawns.** Reuses the nightfall-surge spawner: `pickNightSpawnPoint` gained
optional `ringMin`/`ringMax` params (default to the night constants), and respawns call it
with `RESPAWN_RING_MIN`/`_MAX` = **1150–1600px** — just past the camera's ~1102px
half-diagonal, so a replacement never materializes on-screen. Verified live via
`preview_eval`: at every realistic in-biome player position (center out to the ~1800px biome
edge) **100% of 200 sampled spawns landed >1102px away**; the only close spawns occur way out
in the empty outer grass (2800+px from center) where ring points clip the world edge and get
clamped — a spot players never hunt.

**Species mix.** `makeRespawnEnemy` weights by the baseline `spawnEnemies()` counts
(Boar 24 / Snake 28 / RangedGremlin 22 / MeleeGremling 8 = 82), so meat sources (~63%)
dominate — respawns fix the food shortage directly while keeping variety. Elite rolls at the
standard `rollElite` chance, night-boosted (`NIGHT_ELITE_CHANCE_MULT`) like every other spawn
path, so trophies stay renewable too.

**Excluded:** Gremlin King / Gloamwarden (one-shot win/mini-boss — filtered from both the
count and the spawn table), and the Gremlin Shack guards keep their own timer untouched.
`respawnAccumMs` resets in `create()` per the `scene.restart()` field-init gotcha. Verified:
tsc clean; the top-up paces exactly 1/tick up to the target of 10 then stops; no console
errors. No `RECIPES.md`/dashboard change (no recipe or enemy-stat change). One bounded
tradeoff, noted in-code: enemies you kite far away and abandon still count toward
`RESPAWN_MAX_LIVE`, so a very long roaming run could eventually park at the cap — the cap is
generous enough that this stays theoretical.

### M-SS — Stats & Skills depth pass (crit + distinct-axis effects + relic synergy)

Plan: `.claude/plans/crit-tempering-lodestar.md`. Built on **Opus** (crit is a new combat
mechanic + the relic change is a data-model change). Fixes the "Stats/Skills feel
negligible next to Relics" problem via the locked three-layer split: Relics = raw-% stat
layer, crafted gear = uniqueness/procs (M-TE, later), and **Stats/Skills = the reliable,
player-steered layer on axes relics don't touch** — plus making relics *synergize with*
stats instead of dwarfing them.

**Crit system (the headline).** Split by AXIS, not weapon class: **Strength = crit
multiplier** (+0.04×/pt, retired the old melee stamina-cost knob), **Agility = crit
chance** (+0.5%/pt, retired the ranged one), both **all-weapon**, multiplying together so a
crit build wants both. **Per-weapon base crit** lives in `Weapons.ts`
(`WEAPON_BASE_CRIT_CHANCE`/`_MULT` + getters) — slow/heavy weapons get higher base
(primal_spear 8%/1.6×, fast bone_knife 4%/1.5×), doubling as an attack-speed lever. The
locked pipeline is `weaponBase × (1+skill%) × (1+relic dmg%) × staggerMult ×
(critRoll?critMult:1)` — crit is the final multiplicative step. `MainScene.applyCrit()`
rolls it (chance/mult = weapon base + stat + relic, soft-capped `CRIT_CHANCE_CAP` 0.60 /
`CRIT_MULT_CAP` 3.0, `Math.random` — combat crit isn't seeded), called from both
`tryMeleeAttack` (rolled at hit) and `tryRangedAttack` (rolled at fire, baked into the
projectile via a new `Projectile.isCrit` — no weapon context at impact). A crit tints the
floating damage number orange-yellow + "!" and plays a new `Sfx.crit()` cue. The inventory
Combat column + the weapon Tooltip both surface crit (base + live stat/relic rollup).

**Stat rework (`Progression.ts`).** Every stat now has a live effect: **Endurance** +3 max
stam **and** +2% stamina-regen rate/pt; **Vitality** +4 max HP **and** +1.5%
healing-received/pt (amplifies food/Comfort/kill-heal, NOT passive regen — there is none);
**Intelligence** +1.5% skill-XP/pt (stacks with the Scholar's-Idol relic + is applied in
`awardSkillXp`); **`willpower` renamed `wisdom`** = +2% buff/food duration/pt. New getters:
`critChanceBonus`/`critMultBonus`/`healingReceivedMult`/`staminaRegenMult`/`xpMult`/
`buffDurationMult`. `weaponStaminaCostMultiplier` **retired** — grep'd out of MainScene (×3),
Tooltip, and CraftingMenu (their weapon "Stamina" tooltip line now shows the authored base;
only relics discount stamina now).

**Skill rework (`Skills.ts`).** Second/first real effects for one-note & dormant skills:
**light_armor** → +5ms dash i-frame/level over the 150ms base, cap +100ms (Monster Hunter
"Evade Window", added to `DASH_IFRAME_MS`); **running** also cuts sprint stamina drain
−1%/level cap −40%; **chopping/mining** → +1%/level (cap 60%) chance for a bonus +1 drop on
a depleted tree/rock (incl. cracked Gloam ore), rolled in the tool-swing path. `heavy_armor`
+ `blocking` stay deliberately dormant (biome-2 heavy gear / a real block mechanic) with an
explicit "no effect yet" impact line. **Per-piece armor XP** — the kill loop now awards +30
per *worn piece* (`armorTypesWornPerPiece`, replacing the old per-distinct-type
`armorTypesWorn`), so full-light (3) gives 3 light ticks and heavy_armor will accrue
naturally once biome-2 heavy gear ships. The 5 weapon-damage skills are unchanged (+0.5%/lvl)
— reserved as the M-TE proc-threshold hook.

**Relic synergy (`Relics.ts`).** HP/stamina relic channels went **flat → percent**
(`maxHpPct`/`maxStaminaPct` + `maxHpPctMult`/`maxStaminaPctMult` getters): Stout 15→15%,
Vigor 25/20→20%/18%, Titan 50/35→40%/30%. `MainScene.syncStatBonuses` now compounds
`(100 + statBonus) × relicPctMult − 100`, so stats × relics multiply (verified: 20 Vitality
→ base 180, +Stout+Vigor 35% → 243 max HP). New **crit relic channels** (`critChancePct`/
`critDamagePct` + getters) with two seeds — Common **Keen Charm** (+5% crit chance),
Uncommon **Savage Idol** (+0.30× crit dmg). `scaledEffectText` updated for all new channels;
`allocateStat` now always re-syncs (every stat feeds a cached multiplier now).

**Verified live** (`preview_eval`, console error-free): every stat getter (20 Vit → healMult
1.3, 10 End → regenMult 1.2, 10 Str → +0.4 crit mult, 10 Agi → +0.05 crit chance, 5 Int →
xpMult 1.075, 5 Wis → buffDurationMult 1.1); relic %-HP compounds the stat base (180×1.35=243
HP, 130×1.18=153.4 stam); crit rolls & applies (primal_spear 18%×2.30 → 10 dmg crits to 23,
non-crit 10) and both caps hold (mult 3.0 → 30, chance 0.60); heal 10×1.3=+13, buff 1000×1.1
→ 1100ms, stamina regen 20×1.2 → +24/s; all four skill getters + impact strings correct
(dash +100ms cap, drain 0.6, chop 30%, mine 60% cap); per-piece armor XP returns 3 light
entries for 3 worn pieces; Combat column reports crit 18%×2.30. `tsc --noEmit` + full build
clean. `RECIPES.md` relic table + dashboard weapons tab (base-crit + eff-DPS columns)
updated. See [[survivor-rpg-stats-skills-relics-direction]].
