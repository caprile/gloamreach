# Status

## Current State

_Living snapshot — edit in place, never append. Last shipped: **16-item playtest fix batch**
(2026-07-12, Sonnet — fixes/UI/tuning on existing systems, no new mechanic) off a fresh
end-to-end playtest. Highlights: Stone Axe renamed **Woodcutter's Axe** (display only); fixed
`"Attack Elite Elite Snake"` (prompt no longer double-prepends "Elite " — `displayName` already
carries it); **Boar and MeleeGremling now wake on a hit taken while idle** (added `takeHit()`
overrides mirroring the existing RangedGremlin/Hexling/Snake precedent — this was the real cause
of "the slingshot outranges Snake/Boar's aggro," not a missing `forceAggro()` call); ranged
attacks with no ammo now show a floating "Out of ammo!" instead of a silent no-op, and firing the
last loaded round **auto-refills the ammo slot from the backpack** if more is carried (Slingshot
Pellets stack cap 50→99); dragging a placeable OUT of the hotbar (either row) now re-arms
placement mode instead of dropping it on the ground; the corner tip popup (`HintUI`) now renders
above every menu (was hidden behind the crafting/inventory panel, depth 2860→3200); the
Player-Level-Up banner and the EventLog's center-toast stack (e.g. "Defeated X") no longer
overlap (`EventLogUI.setTopOffset`, + the redundant duplicate "Level Up!" toast is now silent —
the banner already covers it); Gremlin Shack count 5→8 (denser, only the 5 wild-standalone slots
grew — the War Camp's 3-hut cluster geometry is untouched); Lvl-2 cooked dishes rebalanced from
~2.3x a Lvl-1 dish's total heal down to a flat **+25%** (`hpPerSec` up, `durationMs` matched to
the Lvl-1 dish instead of extended); Gremlin Shack chests and cracked-open Gloaming Vein ore nodes
now have a constant pulsing glow halo (reuses the `light_soft` additive-glow idiom) so both read
as obviously interactable — previously only the Gloam Shard *drop* popped, the ore node itself
was static; new **Tips** button on the Pause menu (`TipsUI.ts`) lists every hint discovered this
run, re-readable, since right-click-to-upgrade and other non-obvious gestures are otherwise taught
once and gone. Not built: a wolf-howl SFX on nightfall — noted in `Sfx.ts` as a poor fit for the
current raw-oscillator-envelope synth approach; revisit once real audio assets are in scope.
See "16-item playtest fix batch" below for full detail.

Prior: **Biome 2 — Phase 2 playtest fix batch** (2026-07-12) — off the user's first badlands
playtest. Fixed the badlands-enemies/Emberbloom
"in the woods" spawn leak (`pickBadlandsPoint` now gates on the DOMINANT biome, not >=0.4
coverage); Duskrunner bite/pounce reach (whiffed on diagonals) + damage (1-dmg-in-max-armor →
raised, flat-armor model kept per the user); added Duskrunner pack-attack sync. **Reworked two
enemy identities:** **Hexling** is now a real MAGE — distinct taller robed 20×30 texture,
stand-and-cast (no kite), a **Flame Strike** (3 delayed magic AoE circles at your locked spot →
blink away) as its close-range punish, HP 30→55; **Cragscale**'s roll is faster+wider and opens a
**BLEED** wound (new `systems/Bleed.ts` DoT), the heavy must-dodge threat distinct from the
Duskrunner pounce. And killed the worldgen "straight vertical/horizontal lines" (the crisp forest
SQUARE edge) by feathering it into the now-continuous outer overlay with a soft-disc bitmap mask.
Prior: Biome 2 Phase 2 (badlands core 3 enemies — Duskrunner/Cragscale/Hexling + Emberbloom/
Sunfruit flora, spawned out in the patchwork via `pickBadlandsPoint`, each with elite variants +
per-species trophies); Phase 1 (combat systems layer); Phase 0 (patchwork worldgen)._

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
plan (`.claude/plans/biome-2-sunscorch-badlands.md`) drives it. **Phases 0–2 have shipped:**
Phase 0 (patchwork worldgen — world grew to 28000px for ~5 biomes), Phase 1 (combat systems
layer — resist/weak, AOE arcs, pack-aggro, magic-bypass, all dormant hooks), and **Phase 2**
(the core badlands roster — Duskrunner/Cragscale/Hexling + Emberbloom/Sunfruit flora, which
light up those hooks; plan `.claude/plans/biome-2-phase-2-enemies.md`). The badlands is now
**walkable + populated**. Remaining phases (own Opus sessions each, own plan files): **Phase 2b**
— the deferred 4th bespoke Gloamreach native creature (scoped out of Phase 2 with the user),
**next**; Phase 3 badlands boss (new win-con, demotes Gremlin King) + King critical-drop rework
+ 2 POIs; Phase 4 smelting/forging gear tier; Phase 5 tier-2 relics + biome-1 trim +
family-replace-with-refund. The master-plan tail **M-TE** (trophy-gated gear) is folded into
this biome-2 work. Real pixel art/animations stay deliberately deferred until content/balance
settle (roadmap item 8). Phase 2's badlands stats/counts + Phase 1's arc/resist/pack numbers are
all first-pass — expect a tuning pass as the biome fills out.

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
- **Badlands has content now (Phase 2); dunes + deep ring are still empty.** The forest disc
  holds the biome-1 roster/POIs; the **badlands patchwork now holds the Duskrunner/Cragscale/
  Hexling roster + Emberbloom/Sunfruit flora** (via `pickBadlandsPoint`). Everything past the
  badlands band (dunes, the empty outer ring) is still terrain only until later phases.
- **Enemy respawn top-up is forest-species-only, biome-agnostic.** `makeRespawnEnemy` weights
  by the biome-1 `spawnEnemies()` counts and spawns near the player regardless of which biome
  they're standing in — so a player camping in the badlands gets forest enemies topped up
  around them, and the badlands roster (spawned once at world-gen) does NOT replenish. Harmless
  for now, but a Phase 2b/M-W1 follow-up (make respawns biome-aware).

## Recent Entries

> Older entries in STATUS-archive.md.

### 16-item playtest fix batch (naming/UI/aggro/ammo/glow/tips/food-balance)

Off a fresh end-to-end playtest (the user), built on **Sonnet** — every item is a fix, tuning
number, or UI addition on an already-shipped system; nothing here is a new mechanic. No
`RECIPES.md` change (no recipe/cost changes).

- **Woodcutter's Axe** — `stone_axe`'s display `name` changed from "Stone Axe" (the item key,
  recipe, and every code reference stay `stone_axe`).
- **`"Attack Elite Elite Snake"` fixed** — `MainScene.promptForEnemy` was prepending its own
  "Elite " on top of `enemy.displayName`, which already carries the prefix per-species (e.g.
  `Snake.ts`'s `displayName: elite ? "Elite Snake" : "Snake"`). The prompt now just reads
  `enemy.displayName` directly.
- **Boar/Snake outranged by the Slingshot, fixed at the root** — investigating "hitting enemies
  should aggro them" found `Enemy.forceAggro()` (the pack-aggro wake mechanism) is only ever
  overridden by nothing — every `mode`-driven subclass (Boar/Snake/RangedGremlin/MeleeGremling/
  Hexling) ignores it, since it flips the base `state` field their own `update()` never reads.
  The ACTUAL existing fix pattern is a per-subclass `takeHit()` override that flips `mode` on a
  landed hit while idle — already present on RangedGremlin, Hexling, and (via its own bespoke
  reveal-and-fight-back logic) Snake, but **missing on Boar and MeleeGremling**. Added matching
  `takeHit()` overrides to both, mirroring RangedGremlin's exact idiom. (A `resolveWeaponHit()`-
  level `forceAggro()` call was tried first but proven fully redundant — base `Enemy.takeHit()`
  already does the same idle→chasing flip for state-field enemies — and removed.) Verified live:
  an idle Boar/MeleeGremling's `isAggro()` flips true on `takeHit()`.
- **"Out of ammo!" feedback** — firing a ranged weapon with no ammo loaded now spawns a small
  rising/fading callout at the player (`MainScene.spawnFeedbackText`, an explicit, narrow
  deviation from the standing "never reveal what's missing" silent-guard convention — used only
  where a playtester specifically asked for feedback).
- **Ammo auto-refill + bigger stacks** — when a shot empties the equipped ammo slot, it now
  auto-tops-up from the backpack (same key, up to `maxStack`) instead of unequipping to `null`.
  Slingshot Pellets' `maxStack` 50→99 (covers both the backpack stack cap and the ammo slot's own
  cap, which reads `itemDef(key).maxStack`).
- **Hotbar-drag-to-place** — dragging a placeable OUT of the hotbar (row 1 or row 2 — mechanically
  one container, see the standing hotbar note) into the game world now re-arms placement mode
  (`setHotbarSelection`) instead of dropping it as a loose pickup. Backpack-sourced drags are
  unchanged (still an explicit "get rid of this" world-drop).
- **Tip popup depth fix** — `HintUI`'s corner card was depth 2860/2861, below the crafting/
  inventory panel's 3000/3001, so a tip firing while a menu was open rendered behind it. Bumped to
  3200/3201 — above every menu, still below the pause overlay (3500).
- **"Defeated" / "Level Up!" text overlap fixed** — two related issues: (1) the dedicated
  `showLevelUpBanner()` callout and the EventLog's own generic center-toast stack
  (`EventLogUI.showToast`) were BOTH firing for the same player-level-up event, competing for the
  same screen region — the EventLog line is now passed a new `silent` flag (`EventLog.add`'s 4th
  param) so only the dedicated banner shows (still logged to the persistent side panel). (2) Even
  with that dedupe, a same-beat "Defeated X" combat toast could still land under the banner on a
  short viewport — `EventLogUI.setTopOffset()` lets `showLevelUpBanner()` reserve that vertical
  space for ~2.15s (matching the banner's own fade timing), pushing the toast stack below it.
- **Denser Gremlin Shacks** — count 5→8. Only the wild-standalone pool grew (2→5); the War Camp's
  3-hut fan (`SHACK_NEAR_ALTAR_COUNT`, carefully spaced opposite the gate) is untouched.
- **Lvl-2 food rebalanced** — Bramble-Glazed Boar Skewer / Blood-Glazed Snake Skewer were ~2.3x
  their Lvl-1 counterpart's total heal (e.g. 90 HP vs Cooked Boar Meat's 40). Per the user, a Lvl-2
  dish should read as "faster healing, not just a straight-up bigger number" — both now heal at a
  higher `hpPerSec` (2→2.5) over the SAME duration as their Lvl-1 counterpart (was extended
  30s/35s), landing at a flat **+25%** total (50/55 HP). Vitality's healing-received multiplier
  (`Health.healMult`, M-SS) applies equally to both tiers, so it doesn't change this ratio.
- **Chest + Gloam Shard glow** — both were easy to miss as interactable/mineable. Gremlin Shack
  chests now have a constant warm-gold pulsing halo (added in `GremlinShack`'s constructor);
  Gloaming Vein ore nodes get a purple pulsing halo the moment they're cracked open
  (`ResourceNode.crack()` → new private `startGlow()`, cleaned up in `deplete()`). Both reuse the
  `light_soft` additive-glow texture already established for the Gloam Shard drop-pop/night
  lighting — same visual language, just now a persistent day-and-night effect instead of a
  one-shot pop or a night-only light point.
- **Tips panel (Pause menu)** — a new `src/ui/TipsUI.ts` panel, opened via a "Tips" button on
  `PauseMenuUI` (panel height 384→436 to fit it), lists every hint discovered so far this run
  (`HintManager.discovered()`, new — `Set` insertion order needs no separate tracking). Modeled on
  `WelcomeUI`'s swap-over-the-hidden-pause-panel pattern (`openTips`/`closeTips` mirror
  `openHowToPlay`/`closeWelcome` exactly, including an Esc-key branch — a real gap in the first
  draft, since without it Esc while Tips was open fell through to a no-op `openPauseMenu()` guard
  rather than closing back to the pause panel). Addresses the "right-click to upgrade is not
  obvious" feedback — it's taught once by a corner popup and otherwise gone; this is the
  look-it-back-up escape hatch.
- **Wolf howl SFX — noted, not built.** Every existing cue in `Sfx.ts` is a raw Web Audio
  oscillator/gain envelope synthesized at call time (no asset files); a convincing howl doesn't
  fit that same simple-envelope approach. Left as an in-code comment on `nightfall()` — revisit
  once real audio assets are in scope (deliberately last on the roadmap).

Verified live via `preview_eval` (own dev server instance): Elite-Boar prompt reads "Attack Elite
Boar" (not doubled); an idle Boar/MeleeGremling's `isAggro()` flips on `takeHit()`; firing an empty
Slingshot spawns the feedback text with no crash; a 1-round ammo stack auto-refills to the backpack's
supply on the depleting shot; a 99-count Slingshot Pellets stack holds; `gremlinShacks.length` is 8
post-`create()`; the full Pause→Tips→Close→Resume loop (including Esc mid-Tips) preserves
`isPaused`/pause-panel state correctly; the Tips panel renders the two hints triggered in-test; and
the chest's gold glow halo is visible in a full-scene screenshot. `tsc --noEmit` clean throughout.

### Biome 2 — Phase 2 playtest fix batch (spawn/reach/damage/Hexling-mage/Cragscale-bleed/worldgen)

Off the phase order — a feedback pass off the user's first badlands playtest. Built on **Opus**
(the Hexling redesign + the new bleed DoT are new mechanics). Fixes + two enemy-identity reworks:

- **Spawn leak (badlands enemies + Emberbloom "in the woods")** — `MainScene.pickBadlandsPoint`
  gated on `coverageAt(badlands) >= 0.4`, but near the forest transition a point can carry >=0.4
  badlands coverage while forest (disc or an overlapping forest blob) still WINS the blend, so a
  Duskrunner/Emberbloom placed there read as "in the forest." Now gates on
  `worldBiomes.dominantBiomeAt(x,y) === "badlands"` (which already resolves the winner incl. the
  forest disc). Verified live: **0** badlands enemies + **0** flora inside the forest disc
  (nearest at r≈2385/2500, just past the forest edge 2300).
- **Duskrunner melee "doesn't hit at some angles"** — a flat 20px bite/22px pounce reach whiffed
  on diagonal approaches (the player↔enemy collider holds centers ~24px apart on the diagonal).
  Bumped `MELEE_RANGE` 20→30 + `POUNCE_HIT_RADIUS` 22→32. Verified: a bite at 25px now connects.
- **"Duskrunner does 1 dmg in max armor"** — flat armor (full Tier-2 Gremlin set = 13) floored a
  14-dmg bite to 1. Per the user (locked via `AskUserQuestion`) kept the flat-armor model and
  **raised badlands damage** instead of reworking the formula: Duskrunner bite 14→20 (~7 through
  max armor; a pack landing that together is real pressure).
- **Duskrunner pack-attack sync** — packs of 3-4 already spawned, but attacked one at a time. New
  `Duskrunner.isPounceWindup()`/`joinPounce()` + `MainScene.updateDuskrunnerPacks`: a pouncing
  dog rallies chasing packmates within 210px to leap in the same beat (no-ops for anything out of
  band / on cooldown, so it's cheap and self-limiting).
- **Hexling → a real MAGE** (the user: "make it FEEL like a mage"). Was a recolored gremlin
  silhouette that kited + teleported (uncatchable) and threw one rock. Rewritten:
  (1) **distinct texture** — a taller 20×30 hooded/robed staff-caster (was the 18×22 squat
  gremlin body); (2) **stand-and-cast** — it no longer kites/back-pedals, only repositions via
  blink; (3) a second attack, **Flame Strike** — when the player closes to 150px it plants and
  calls down a cluster of 3 delayed fire circles at the player's LOCKED position (walk out to
  dodge), which detonate as **magic** AoE (18, bypasses armor) after an 820ms telegraph, then it
  **blinks away** to resume casting (blink is also the cornered-fallback when flame's on
  cooldown); (4) HP 30→55 so it's not 1-2-shot the instant you reach it. Routed through the same
  `checkPlayerHit()` area-damage path the bosses use (Hexling added to that instanceof union; the
  return shape widened to carry the magic `dmgType`). Verified live via a deterministic
  update-loop trace: telegraph→impact→`{damage:18,dmgType:"magic"}`→blink-to-~220px.
- **Cragscale roll "too easy to sidestep / feels the same as Duskrunner"** — the roll was a
  slow-ish locked charge you could stroll around. Now `ROLL_SPEED` 240→300 + `ROLL_HIT_RADIUS`
  30→40 (a casual sidestep no longer clears the shell — you need a dash/committed move), and a
  connect opens a **BLEED** wound on top of the big shove. First DoT in the game:
  `src/systems/Bleed.ts` (`BleedManager`, framework-free like Buffs) — stacking
  {dmgPerSec, remainingMs}, ticked in `update()`, applied via a new optional `bleed` param on
  `applyDamageToPlayer` (so it rides the **same i-frame guard** — a dashed-through roll opens no
  wound) carried by a new `Enemy.pendingBleed` hook (parallel to `pendingAttackKnockback`).
  Cragscale roll = 5/s for 4s (~20, stacks). Cleared on death. This is the heavy "must-dodge"
  threat that separates the tank from the Duskrunner's quick light pounce. Verified: roll connect
  sets `pendingBleed{5,4000}` + kb 230; the manager ticks whole points.
- **Worldgen "huge straight vertical/horizontal lines that don't blend"** — the crisp grass
  tilesprite + forest bake are a 4000px **square** (`BIOME_SIZE`) centered on spawn, so their
  edges met the blurry outer overlay as hard axis-aligned lines at ±2000 from center (plus a
  blocky core-skip circle sampled at the coarse overlay resolution). Fix: (1) the outer overlay
  now bakes **continuously** (dropped the `forestCoverage>=0.999` skip) as a smooth base under
  everything; (2) the grass tilesprite moved ABOVE it (depth -9.5→-9.4) and both crisp layers get
  a **soft-disc bitmap mask** (`forest_feather`, a canvas radial gradient — opaque across the
  play area, fading to 0 by the square edge), so the crisp core dissolves into the overlay as a
  circle instead of a square. Verified live from the west-edge midpoint: the straight line is
  gone, replaced by a soft blend; the forest core is still crisp; no console errors.

Files: `Duskrunner.ts`, `Cragscale.ts`, `Hexling.ts` (rewrite), `Enemy.ts` (`pendingBleed`), new
`systems/Bleed.ts`, `BootScene.ts` (hexling texture + `forest_feather`), `MainScene.ts` (spawn
gate, pack sync, bleed wiring, area-hit `dmgType`, overlay continuity + feather mask). Dashboard
Enemies tab updated (manual mirror). No `RECIPES.md` change. See [[survivor-rpg-biome-2-plan]].

### Biome 2 — Phase 2: Badlands enemies & wildlife (core 3 + flora)

Plan: `.claude/plans/biome-2-phase-2-enemies.md` (Phase 2 of the
`biome-2-sunscorch-badlands.md` umbrella). Built on **Opus** (new content/AI). Scope locked
with the user via `AskUserQuestion`: **the core 3 enemies + arid flora** (the 4th native creature
deferred to Phase 2b); difficulty **noticeably tougher** than the forest roster; Cragscale
resist = **resist slash, neutral blunt, weak pierce**. First *content* in the badlands — three
bespoke enemies that each light up a Phase 1 dormant hook, spawned out in the badlands
patchwork, never the forest disc.

**1. Duskrunner** (`src/entities/Duskrunner.ts`) — gloam-touched canid swarm. Fast (92), low-HP
(20), short 220ms telegraphed bite. Deliberately drives the **base `state` field** (not a
private `mode`), so the inherited `Enemy.forceAggro()`/`isAggro()` work with **zero override** —
the reference `packAggro` user (radius 260). The AOE-arc payoff enemy (neutral resists). Spawns
in **packs of 3-4** so `updatePackAggro` visibly converges them. Loot: Duskrunner Pelt (+
Duskrunner Trophy elite).

**2. Cragscale** (`src/entities/Cragscale.ts`) — slow (40) armored bruiser, tanky (HP 60), one
heavy telegraphed basher (520ms tell + 180 knockback). **Teaches the damage-type layer** via
`resistances: { slash: 0.5, blunt: 1.0, pierce: 1.6 }` — the resist math + damage-number tint
already live in `resolveWeaponHit` (Phase 1), so this just declares data. Loot: Cragscale Plate
(+ trophy).

**3. Hexling** (`src/entities/Hexling.ts`) — compact **stand-and-cast magic kiter** (its own
subclass, NOT extending RangedGremlin — tracks a private `mode`, overrides `isAggro()`). Casts a
single **`hex_bolt`** per 2s with `damageType: "magic"` → **bypasses the player's flat armor**
(the dormant Phase 1 `applyDamageToPlayer` hook goes live). `Projectile` gained an optional
`damageType`; the enemy-projectile→player overlap now forwards it (physical Gremlin rocks leave
it undefined = unchanged). Resists `{ magic: 0.4, slash/blunt/pierce: 1.4 }` (resists magic,
weak to physical). Loot: Hex Essence (+ trophy).

**Flora** — Emberbloom (desert herb) + Sunfruit (cactus fruit), both persistent free-pickups
reusing the Blackberry `persistent`/`pickedTexture`/`regrowMs` path. **No recipes wired** —
future alchemy/food ingredients, surfaced only via the discovered-material toast.

**Integration** — new `MainScene.pickBadlandsPoint(rng, minCoverage=0.5)` sweeps a polar annulus
in the badlands radius band (2600-6400) and requires real `worldBiomes.coverageAt(..,"badlands")`
there, honoring the War-Camp/Vein exclusions. `spawnBadlandsEnemies()` (6 packs + 10 Cragscale +
10 Hexling, each `rollElite`) + `spawnBadlandsFlora()` (24 Emberbloom + 20 Sunfruit). 8 new
`ResourceType`s + `Items.ts` defs (Gloamreach flavor) + `TROPHY_ROLL` entries (Common/tier1 for
now — Phase 5 retiers to tier-2 + Ember refinement) + ~17 `BootScene` textures.

**Verified live** (`preview_eval`, console error-free; `tsc` clean): 39 badlands enemies
(Duskrunner ×19 / Cragscale ×10 / Hexling ×10) + 44 flora, all at r∈[2657, 6279] — **none in the
forest disc** (forest roster capped at r=2001, unchanged). Cragscale resist damage: 10 slash →
5, 10 pierce → 16. Hexling bolt spawns with `damageType:"magic"`; pack-aggro leader +
`updatePackAggro` woke both packmates (class-gated). Biome discovery toast + "Sunscorch
Badlands" minimap label confirmed. **Dashboard Enemies tab + trophy-source map updated** (manual
mirror); no `RECIPES.md` change (no new recipes). See [[survivor-rpg-biome-2-plan]].

**Same-session feedback pass (the user playtested):** four fixes. (1) **Density** — the badlands
was ~22× sparser than the forest (39 enemies over the whole huge ring), so the user walked into a
badlands area and found **0 enemies**. `pickBadlandsPoint` now concentrates in the **accessible
inner band** (r 2500-5200, inner-weighted `frac^1.7`) with a lower coverage threshold (0.5→0.4),
and counts jumped: Duskrunner **16 packs (~56)** / Cragscale **34** / Hexling **34** (~124 total,
was 39) + flora 40/32. Verified: ~5-9 badlands enemies near a typical r≈3000 entry point.
(2) **Terrain too red/pink** — `badlandsGroundColorAt` was a near-flat clay fill that the coarse
LINEAR-stretched overlay washed into solid color. Rewrote it with **multi-scale value-noise
mottling** (new `colorUtil.valueNoise2D`) across a dustier warm-earth palette (clay/ochre/sand/
taupe/rust, browner + a cooler taupe drift to kill the pink); verified 47 distinct tones across a
patch (channel spread R 74-166). (3) **Jagged straight borders** — `WorldBiomes.seedCoverage` now
uses a **3-harmonic angular wobble** (was a single sine) + bigger lobes (`wAmp` 0.18-0.36) + wider
soft falloff, so blob edges read as organic curves. (4) **Distinctive enemy kits** (the user: give
the new enemies unique attacks) — **Duskrunner** gained a **pounce** (locked-direction leap
gap-closer, built on Boar's charge mechanism); **Cragscale** a **rolling charge** (shell-roll to
catch kiters, spins during the roll) on top of its basher; **Hexling** a **blink** (teleports
~215px when the player closes inside 96px — a magical evade with a fading ghost VFX). All three
verified firing (state machines progress through every phase; blink teleports 164px). `tsc` clean,
no console errors. Dashboard Enemies tab updated for the new attacks.

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
