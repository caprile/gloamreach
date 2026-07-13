# Status

## Current State

_Living snapshot — edit in place, never append. Last shipped: **Biome 2 — Phase 3: Duskrunner
Warren POI** (2026-07-12, Opus). The **first of Phase 3's two POIs** (the user chose "two POIs
first"; the badlands boss + Gremlin King rework stay deferred). A **two-wave destructible den**,
NOT a shack clone: `src/entities/BadlandsDen.ts` is a burrow mound guarded by **3 Duskrunners →
(on clear) 3 ELITE Duskrunners**; only once both waves fall does the den become **attackable with a
melee weapon** (its own HP), and smashing it collapses it into a **lootable cache** (a heap of the
fallen — reuses `LootContainer`/`ChestMenu`). Loot is thus gated behind destruction; the Warren
does **NOT respawn** (you destroy it). **10 dens (fairly common — ~one per sizable badlands chunk,
per the user)** spread ≥950px apart via `pickBadlandsPoint` (+ a `DEN_CLEAR_RADIUS` exclusion).
**Duskrunners are now a badlands food source** — every one drops raw `duskrunner_meat` (cook/eat
specifics deferred, like sunfruit/emberbloom). Discovering one fires a prominent **discovery popup
toast** (new `"poi"` `LogKind`) + a `map_den` minimap/world landmark; faint gloam-ember night glow.
Verified live via `preview_eval`: 10 dens spread across r 2505–5004, wave
1 (normal) → wave 2 (elite) → attackable → wrecked+cache → loot; prompt gating (nothing during
waves, "Smash" only with a melee weapon, "Search the remains" when looted, out-of-reach null); meat
drop; landmark; sprites render. Next: **Phase 3 POI 2 — the Sunken Forge mini-boss** (then the
badlands boss + King rework). See "Biome 2 — Phase 3: Duskrunner Warren POI" below.
[[survivor-rpg-biome-2-plan]]_

_Prior: **Biome 2 — Phase 2b: Sandmaw** (2026-07-12, Opus). The deferred 4th native badlands
creature — a **burrowing ambusher**. The **Sandmaw** (`src/entities/Sandmaw.ts`) lurks submerged
(near-invisible) until you enter its 62px ambush ring, then ERUPTS in a telegraphed radial
sand-burst (95px, 38 physical + 220 knockback, via `checkPlayerHit` like the bosses/Hexling flame),
stays surfaced + vulnerable for a punish window, then burrows and slow-stalks to re-ambush. Own
bespoke state machine. Resist `{ pierce: 0.6, blunt: 1.4 }` — the **inverse of Cragscale**. 24
scattered lone spawns; elite + `sandmaw_trophy` + `sandmaw_chitin`. See "Biome 2 — Phase 2b:
Sandmaw" below._

_Prior: **4-item playtest fix batch**
(2026-07-12, Sonnet-class fixes on existing systems). (1) **Cragscale re-toned** to a cool
slate-grey hide (was warm brown `0x7a5040`, too close to the Boar) so the rock reptile no longer
reads as a second boar — Boar stays warm-brown, Cragscale is grey-stone (`BootScene.ts` normal
variant only; elite crimson/gold unchanged). (2) **Woodcutter's Axe crafting-menu name** — the
`stone_axe` RECIPE still read "Stone Axe" (only the item's inventory `name` was renamed in the
prior batch); the recipe `name` now matches. (3) **Continue past the win (playtesting)** —
winning (Gremlin King kill) now offers a green **[ Continue ]** button on the run-end screen beside
[ New Run ]: it un-freezes the world (`resumeAfterWin` clears `runOver`, sets `inProgressMode`) and
raises a persistent top-center **"⚠ IN-PROGRESS CONTENT"** caveat banner so live/testing builds can
be pushed before a biome is done. Score is posted at the win; **death still always ends the run**
(no respawn during playtesting — `endRun` forces the "died" outcome via `Run.setOutcome` so a
continued-then-died run reads YOU DIED). (4) **Refined-Uncommon relic cap** — a Refined
(Uncommon) trophy rolls the Uncommon outcome table (which has a 1% Mythic band) but is now
**capped at Rare** via a new optional `TrophyRoll.maxRarity` — refinement is a gated climb, not a
Mythic gamba; a would-be Mythic clamps to Rare (Rare-refined stays uncapped). Verified live:
30k refined-Uncommon rolls → 0 Mythic (~6% Rare); Continue button un-freezes the run; axe recipe
name + Cragscale/Boar tints distinct; no console errors. Dashboard Relics tab + RECIPES.md updated.
See "4-item playtest fix batch" below. [[survivor-rpg-relics]]_

_Prior: **Placeholder art pass — all creatures + non-rotating facing** (2026-07-12, Opus). Every
enemy + the player brought up to the Hexling's detail bar (layered silhouette/shading/features/
glow) in `BootScene.ts`, exact dimensions preserved; **non-rotating facing** (`applyUprightFacing`,
`EnemyConfig.upright` default `?? true`) is now the roster default — purely visual, attack
hit-checks use distance math. See "Placeholder art pass" below. [[survivor-rpg-enemy-art-facing]]_

_Prior: **Biome 2 playtest fix batch #2**
(2026-07-12, Sonnet). Fixed the REAL cause of the map's "flat lines"/hard seams: the tiled
`outerFeatureBiome`'s Voronoi/CA zone generation + creek carve were never toroidal-aware, but
`Biome.bilinear()` wrapped it anyway for tiled sampling — bilinearly blending two UNRELATED grid
edges together, baking a hard seam every `OUTER_FEATURE_SIZE` (4000px) world px in both x and y
(the prior fix below only addressed the *forest-disc-edge* line, a different source). Now
`buildVoronoiZones`/`smooth()`/`carveCreek` are genuinely toroidal when `tiled` (wrap-around
Voronoi distance, wrapped CA neighbors, a periodic sine wobble for the creek ribbon instead of a
free random walk) — verified live via `preview_eval` (0 big forestWeight jumps scanned across 5
tile boundaries). Also added a generic `mottleColor()` brightness-noise pass
(`colorUtil.ts`) applied to `WorldBiomes`' base-layer + outer-forest-blob color (outside the
protected forest core) so the "light green" open wilds outside spawn read as textured instead of
flat (the user: "loses the speckled texture"; Dunes/badlands already had their own noise, base
layer didn't) — an explicit placeholder pass, real tilesets replace it later. **Hexling no longer
rotates upside-down**: new `EnemyConfig.upright` flag (only Hexling opts in) skips the base
`Enemy`'s random-360°-spawn-rotation + `applyFacing`'s full-rotation-toward-travel, replaced by
`applyUprightFacing()` — mirrors left/right via `flipX`, tilts at most ~11° up/down, never near
horizontal. **Biome-2 damage bumped significantly** per the user ("should hurt even with lvl-3
armor... make the game hard"): Duskrunner bite 20→34, Cragscale basher/roll 22→40 (both net well
above biome-1's Boar-25/Snake-20 through the 13-flat Lvl-3-armor cap), Hexling bolt 14→22 / flame
18→34 (both `magic`, bypass armor entirely — 3 flame hits ≈ 102 now kills a 100-HP player, per
the user's "should kill you in like 3 hits" ask); also fixed a latent bug where Elite Hexling dealt
the SAME bolt/flame damage as a base Hexling (every other elite gets +50% dmg, Hexling's magic
damage was never scaled) — now `boltDamage`/`flameDamage` instance fields scale with `elite` like
every other enemy. `ExploredMap` gained `colorAtSmoothed()` (center-weighted 3x3 average of
revealed neighbor cells, still -1/fog if the cell itself is unrevealed) wired into both
`WorldMapUI` and `MinimapUI`'s cell fill, softening the visible per-cell rectangular edges at
higher map zoom on top of the seam fix. No new mechanic — Sonnet-class fixes/tuning throughout.

Prior: **16-item playtest fix batch** (2026-07-12, Sonnet — fixes/UI/tuning on existing systems,
no new mechanic) off a fresh end-to-end playtest. Highlights: Stone Axe renamed **Woodcutter's Axe** (display only); fixed
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
plan (`.claude/plans/biome-2-sunscorch-badlands.md`) drives it. **Phases 0–2b have shipped:**
Phase 0 (patchwork worldgen — world grew to 28000px for ~5 biomes), Phase 1 (combat systems
layer — resist/weak, AOE arcs, pack-aggro, magic-bypass, all dormant hooks), **Phase 2**
(the core badlands roster — Duskrunner/Cragscale/Hexling + Emberbloom/Sunfruit flora, which
light up those hooks; plan `.claude/plans/biome-2-phase-2-enemies.md`), and **Phase 2b**
(the 4th native creature — the **Sandmaw** burrowing ambusher; plan
`.claude/plans/biome-2-phase-2b-sandmaw.md`). The badlands is now **walkable + populated with a
complete 4-enemy roster**. **Phase 3 is underway** — the user chose "two POIs first," and **POI 1,
the Duskrunner Warren, has shipped** (two-wave destructible den → lootable cache; see below).
Remaining Phase 3 work (own sessions): **POI 2 — the Sunken Forge mini-boss (next)**, then the
**badlands boss** (new win-con, demotes the Gremlin King) + the **Gremlin King critical-drop
rework**. Then Phase 4 smelting/forging gear tier; Phase 5 tier-2 relics + biome-1 trim +
family-replace-with-refund. The master-plan tail **M-TE** (trophy-gated gear) is folded into
this biome-2 work. Real pixel art/animations stay deliberately deferred until content/balance
settle (roadmap item 8). Phase 2/2b badlands stats/counts + Phase 1's arc/resist/pack numbers are
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
- **Badlands has content now (Phase 2/2b); dunes + deep ring are still empty.** The forest disc
  holds the biome-1 roster/POIs; the **badlands patchwork now holds the Duskrunner/Cragscale/
  Hexling/Sandmaw roster + Emberbloom/Sunfruit flora** (via `pickBadlandsPoint`). Everything past
  the badlands band (dunes, the empty outer ring) is still terrain only until later phases.
- **Enemy respawn top-up is forest-species-only, biome-agnostic.** `makeRespawnEnemy` weights
  by the biome-1 `spawnEnemies()` counts and spawns near the player regardless of which biome
  they're standing in — so a player camping in the badlands gets forest enemies topped up
  around them, and the badlands roster (spawned once at world-gen) does NOT replenish. Harmless
  for now, but a Phase 2b/M-W1 follow-up (make respawns biome-aware).

## Recent Entries

> Older entries in STATUS-archive.md.

### Biome 2 — Phase 3: Duskrunner Warren POI (two-wave destructible den)

Plan: `.claude/plans/biome-2-sunscorch-badlands.md` (Phase 3, umbrella). Built on **Opus** (new
POI mechanic). the user scoped Phase 3 to **"two POIs first"** (the badlands boss + Gremlin King
critical-drop rework stay deferred), then specced POI 1 in detail — it is deliberately NOT a
Gremlin-Shack clone.

**The Warren** (`src/entities/BadlandsDen.ts`) — a plain data class (not a GameObject subclass;
MainScene owns the wave/smash scheduling), a burrow-mound `image` + a lazily-created cache
`image` + `LootContainer`. Its lifecycle is a state machine (`DenPhase`):
- **wave1** — 3 normal Duskrunners guard the den; the mound is inert (not hoverable/interactable).
- **wave2** — clearing wave 1 spawns **3 ELITE Duskrunners** (`onDenGuardKilled` → `spawnDenWave`).
- **attackable** — with both waves dead the den is exposed; smash it with a **melee weapon** (it
  has HP `DEN_HEALTH` 42; ranged doesn't apply to a structure). `tryAttackDen` mirrors
  `tryMeleeAttack`'s cooldown/stamina/reach guards + a size-scaled `denReach` (mirrors
  `enemyReach`), deals `(weaponDamage+tier)×skill×relic` dmg, spawns a damage number.
- **looted** — on the killing hit the mound swaps to `duskrunner_den_wrecked`, a `warren_cache`
  sprite + warm pulsing glow appear, and the cache loot rolls. Opening reuses the shared
  `ChestMenu` (`openChestMenu` was generalized from `(shack)` to `(loot, table)`).

So **loot is gated behind destruction** (both waves must die first, automatically) and the Warren
**does NOT respawn** — you destroy it. **Spawn: 10 dens** (the user: dens should be **fairly common**,
~one per sizable badlands chunk — bumped 3→10) spread ≥`DEN_MIN_SPACING` (950px) apart via
`pickBadlandsPoint`, picked **before** the wild badlands packs so a new `DEN_CLEAR_RADIUS` (200)
exclusion in `pickBadlandsPoint` keeps ordinary spawns out of a den's clearing (the standing
"POI busy = missing exclusion zone" lesson). **Cache loot** (`DUSKRUNNER_WARREN_LOOT_TABLE`):
guaranteed pelts, likely meat/bones, chances at `sandmaw_chitin`/`gloam_shard` + a
`duskrunner_trophy` — richer than a shack (a two-wave elite fight earns it).

**Duskrunners are now a badlands food source** (the user): every Duskrunner (den *and* wild) drops
raw **`duskrunner_meat`** alongside its pelt (elite 2×). New `ResourceType` + `ItemDef` +
`icon_duskrunner_meat`; the cook/eat specifics are **deferred** — it's a "future cooking
ingredient" like sunfruit/emberbloom, so the food exists in the world without over-designing it.

**Map + night:** a discovered Warren fires a prominent **discovery popup toast** (new `"poi"`
`LogKind` in `EventLog`/`EventLogUI`, routed through `showToast` like a biome-discovery toast, in a
warm orange matching the map marker) **and** adds a `map_den` minimap/world-map landmark ("Duskrunner
Warren", dusty orange-brown `0xc06a34`) via the generalized `updateAltarDiscovery` pass; dens glow
a faint gloam-ember at night (`denLightPoints` in `collectLights`, radius 90 — subtler than a full
POI). Hover/prompt/interact reuse the exact existing chain (new `hoveredDen`, `promptForDen`,
`tryInteract` branch, hover-highlight target = `den.target`), interactable only while
attackable/looted so the mound doesn't block enemy hovers during the fight.

Files: new `BadlandsDen.ts`; `Inventory.ts` + `Items.ts` (`duskrunner_meat`); `Duskrunner.ts`
(meat loot); `BootScene.ts` (`duskrunner_den`/`_wrecked`/`warren_cache`/`map_den`/
`icon_duskrunner_meat` textures); `MainScene.ts` (den fields/reset, `spawnBadlandsDens`/
`spawnDenWave`/`onDenGuardKilled`/`tryAttackDen`/`denReach`, `pickBadlandsPoint` exclusion, hover/
prompt/interact/discovery/lights wiring, `openChestMenu` generalized); `dashboard/main.ts` (Enemies
tab Duskrunner loot row). No `RECIPES.md` change (no recipes — cache is a loot table, meat has no
recipe yet). **Verified:** `tsc --noEmit` clean; `preview_start` boots with no console errors;
`preview_eval` — 10 dens spread across r 2505–5004 (minGap 1214px), wave1(normal)→wave2(elite)→
attackable→wrecked+cache→loot, prompt gating (guarded=null / attackable-no-weapon=null /
melee="Smash" / ranged=null / looted="Search the remains" / out-of-reach=null), Duskrunner rollLoot
yields pelt+meat, discovery fires the "poi" popup toast + adds the `map_den` landmark; screenshots
confirm the den mound + guards render and the discovery toast pops. **Next: POI 2 — the Sunken
Forge mini-boss.**

### Biome 2 — Phase 2b: Sandmaw (burrowing ambusher, the 4th native creature)

Plan: `.claude/plans/biome-2-phase-2b-sandmaw.md`. Built on **Opus** (new enemy AI / state
machine). The "+1 native creature" deferred out of Phase 2's core-3 scope. Creature identity
locked with the user via `AskUserQuestion`: **a burrowing ambusher** (over an aerial diver or a
stealth flanker).

**The Sandmaw** (`src/entities/Sandmaw.ts`) — a gloam-touched burrowing ambush predator, the
badlands roster's 4th and most distinct threat vector. The existing trio is swarm-pounce
(Duskrunner) / armored roll-tank (Cragscale) / stationary flame-mage (Hexling); the Sandmaw adds
**"watch the ground / don't stand still near a lurker."** Own bespoke state machine, fully
overrides `update()` (does NOT call super — same precedent as Snake/Hexling):
`submerged → surfacing → erupting → exposed → burrowing → submerged`.
- **submerged** — near-invisible (alpha 0.18, a subtler Snake), slow-stalks (30px/s) toward a
  player within `STALK_RADIUS` 240px but outside the ambush ring to reposition (holds still
  otherwise — a slow drift so it isn't an invisible shove). Triggers on `AMBUSH_RADIUS` 62px.
- **surfacing** — pops to full alpha + `playWindupTell` load-up + a growing dust-ring telegraph
  previewing the exact burst radius. `SURFACE_WINDUP_MS` 560ms = the dodge window.
- **erupting** — a radial **sand-burst** (`BURST_RADIUS` 95px, 38 physical + 220 knockback), one
  hit per eruption, dealt via `checkPlayerHit()` (queried by the scene like the bosses / Hexling
  flame — NOT a melee bite; `biteDamage: 0`). Added `Sandmaw` to that `instanceof` union.
- **exposed** — fully surfaced + planted 1100ms: the vulnerable punish window.
- **burrowing** — dives back under (350ms), then a 2600ms re-ambush cooldown.

Numbers first-pass: HP 45 (between Duskrunner 20 / Cragscale 60), erupt 38 (~25 net through the
13-flat Lvl-3 armor cap, badlands-rebalance tier). Elite ×1.5 HP/dmg, ×1.1 speed, ×1.3 scale, 2×
loot, crimson/gold recolor. **Dodge math:** a walking player (95px/s) covers ~52px in the 560ms
wind-up; from 62px in they just clear the 95px burst with a beat of reaction — greedy/advancing
players eat it, reactive ones (or a dash + its i-frames) escape (same movement-dodgeable
principle as 5t's smash fix). **Resist profile (locked):** `{ pierce: 0.6, blunt: 1.4 }` — the
**inverse of Cragscale** (resist-slash/weak-pierce), so clubs/warhammer shine on Sandmaws where
the Primal Spear shines on Cragscales; the damage-type layer now rewards carrying more than one
weapon. **Reveal-and-retaliate:** attacked while submerged → surfaces + erupts (Snake/Hexling
`takeHit` precedent). `isAggro()` hidden while submerged (HP bar shows only once surfaced).
**Spawn:** scattered **lone** ambushers (no pack — a lurker is a solo trap), 24 via
`pickBadlandsPoint` in `spawnBadlandsEnemies()`, elite via `rollElite`. **Loot:**
`sandmaw_chitin` ×1 (×2 elite; a light-but-tough plating shard, no recipe yet); elite +
`sandmaw_trophy` (Common/tier1 in `TROPHY_ROLL`, like the other badlands trophies — Phase 5
retiers to tier-2 + Ember).

Files: new `Sandmaw.ts`; `Inventory.ts` + `Items.ts` (2 resources); `Relics.ts` (`TROPHY_ROLL`);
`BootScene.ts` (`drawSandmaw` normal + elite 26×18 plated burrower facing right, + chitin/trophy
icons); `MainScene.ts` (import, spawn 24, area-hit union); `dashboard/main.ts` (Enemies-tab entry
+ trophy-source row). No `RECIPES.md` change (no recipes). **Verified:** `tsc --noEmit` clean;
`preview_start` boots with no console errors; `preview_eval` — 24 Sandmaws spawn, all 4 textures
load, full state cycle submerged→surfacing(α1)→erupting→hit `{38, kb220}`→single-hit-per-erupt→
exposed→burrowing→submerged(α0.18); a player 300px out at erupt = no hit (dodge); resists
pierce×0.6/blunt×1.4/slash×1.0; takeHit-while-submerged flips to surfacing; `isAggro()` false
while submerged; sprite + elite recolor render correctly. **Next: Phase 3** (badlands boss = new
win-con + Gremlin King critical-drop rework + 2 POIs).

### 4-item playtest fix batch (Cragscale art, axe name, boss-continue, refined-relic cap)

Off the user's latest playtest notes. Sonnet-class fixes/tuning on already-shipped systems, no new
mechanic. Four items:

1. **Boar/Cragscale too similar.** Both were warm-brown quadrupeds facing right — the Cragscale
   hide `0x7a5040` was nearly the Boar body `0x6b4a2a`. Re-toned the **normal** Cragscale to a cool
   slate-grey palette (hide `0x69726c`, cooler belly/head, lighter stone plates) so the rock
   reptile reads as stony, not a second boar. Elite (crimson/gold) unchanged. Verified via texture
   pixel sample: Boar body `#6b4a2a` vs Cragscale body `#69726c`.
2. **Woodcutter's Axe name in the crafting menu.** The prior batch renamed only the item's inventory
   `name` (`Items.ts`); the `stone_axe` RECIPE in `Recipes.ts` still read "Stone Axe", and the
   crafting menu shows the recipe name. Changed `Recipes.ts` recipe `name` → "Woodcutter's Axe"
   (id/key/output all stay `stone_axe`). RECIPES.md table row updated.
3. **Continue past the win (in-progress playtesting).** Beating the current end-game boss (Gremlin
   King) fires `endRun("won")` which froze the world at the run-end screen, blocking end-to-end
   testing into biome 2. `RunEndUI` now shows a green **[ Continue ]** button beside [ New Run ]
   **only on a win** (`RunEndDeps.onContinue`, two-button layout; death shows only New Run), plus a
   caption ("Continue = explore in-progress content past this boss"). `MainScene.resumeAfterWin()`
   hides the screen, clears `runOver`, sets `inProgressMode`, and raises a **persistent top-center
   caveat banner** ("⚠ IN-PROGRESS CONTENT — past the current end-game target") so it's clear you're
   past finished content — this sets the precedent for pushing live builds before a biome is done, as
   the end-game target moves outward with future bosses. The win's score is posted at the kill.
   **Death is UNaffected** — a hardcore death always ends the run, even after Continuing (the user: no
   respawn during playtesting): `onPlayerDeath`'s `endRun("died")` no longer gates on the continue
   flag, and `endRun` calls a new `Run.setOutcome()` when `inProgressMode` so a continued-then-died
   run's end screen correctly reads **YOU DIED** (the win's `end()` had already locked the outcome to
   "won"; `setOutcome` overrides it) and hides the banner. New fields reset in `create()` per the
   `scene.restart()` field-init gotcha. Verified live: win screen carries both buttons + caption;
   Continue sets `runOver=false`/`inProgressMode=true` + shows the banner (screenshot, top-center,
   clear of HUD); a death after Continue forces outcome "died", hides the banner, and shows the YOU
   DIED screen (no completion bonus). Phase 3 of the biome-2 plan properly demotes the Gremlin King
   from win-con to a mid-boss with a critical drop.
4. **No Mythic from a Refined (Uncommon) trophy.** A `refined_trophy_uncommon` has rarity `uncommon`
   and rolls the Uncommon outcome table, which has a 1% Mythic band — so a gated refinement could
   still gamba a Mythic. Added an optional `TrophyRoll.maxRarity`; `refined_trophy_uncommon` now sets
   `maxRarity: "rare"`, and `RelicManager.roll()` clamps any rolled-up result above the cap down to
   it (the 1% Mythic band merges into Rare → ~6% Rare, rest Uncommon). Raw Common trophies and the
   deeper-biome-scaffold `refined_trophy_rare` are uncapped (Rare-refined can still hit Mythic — a
   Phase-5 concern, unreachable in biome 1). The dashboard "Trophy → outcome odds" breakdown now
   merges capped bands so its display matches the roll clamp; RECIPES.md refined-trophy row notes the
   cap. Verified live: 30k refined-Uncommon rolls → **0 Mythic** (1782 Rare ≈ 6%, rest Uncommon);
   30k rare-refined rolls → ~10% Mythic (uncapped, confirming the cap is trophy-specific).

Files: `BootScene.ts` (Cragscale tint), `Recipes.ts` (axe name), `RunEndUI.ts` + `MainScene.ts`
(continue button + resume + death gate), `Relics.ts` (`maxRarity` + clamp), `dashboard/main.ts`
(capped breakdown), `RECIPES.md`. `tsc --noEmit` clean; verified live via `preview_eval` +
screenshot; no console errors.

### Placeholder art pass — all creatures + non-rotating facing (2026-07-12, Opus)

the user: bring the placeholder art up to real effort even before real pixel art, using the new
**Hexling as the minimum detail bar** (it "looks awesome"), revamp every model that hadn't had
love, and make enemies follow the Hexling's **non-rotating** facing — noting this is visual only
and must NOT change attack direction (an enemy can still hit you while not facing exactly at you).

**Non-rotating facing (Enemy.ts).** The `upright` flag already existed (Hexling-only) — flipped its
default from `?? false` to `?? true`, so EVERY enemy is now non-rotating: `applyUprightFacing`
mirrors left/right via `flipX` with a ≤~11° (`UPRIGHT_MAX_TILT` 0.22 rad) up/down tilt, never
rotating off-vertical. The old default (`applyFacing`'s full-360° rotation-toward-travel + a random
full spawn rotation) was literally flipping the vertically-drawn Gremlin King / Gloamwarden
upside-down as they walked. Base `Enemy` is never instantiated directly (all subclasses), and no
subclass passes `upright:false`, so the single default flip covers the whole roster; the spawn
randomizer now only picks a random `flipX` mirror. **Purely visual** — attack hit-checks all use
x/y distance math (`tickMeleeSwing`, `checkPlayerHit`, charge/pounce/roll contact radii), never
sprite facing, so nothing about who-can-hit-whom changed. Kept the **Cragscale roll-spin** (it sets
`rotation` directly as a deliberate rolling-ball attack tell); after the roll it settles via
`faceAngle` back to the upright tilt. Comments on `EnemyConfig.upright` / the constructor /
`applyFacing` updated to describe the new default.

**Art (BootScene.ts).** Every creature texture redrawn to the Hexling's bar (layered silhouette +
base/shadow/highlight shading + feature details + glow), **preserving each texture's exact
dimensions** so reach/scale/body-separation tuning is untouched. All side-view creatures are now
drawn facing **RIGHT** (was nose-left) so the `flipX` convention reads correctly. Each with a
parameterized `draw*` helper generating normal + a crimson/gold **elite** recolor of the identical
silhouette (matching the existing `drawHexling` pattern):
- **player** (20x20) — front-facing blue-tunic adventurer: head+hair+eyes, tunic w/ belt+buckle,
  arms+hands, legs+boots. (Player is its own class, not `upright`; orientation is static, only the
  equipped-icon offset tracks facing — so a symmetric front view is correct.)
- **Boar** (26x20) — bristly hog, back-spikes, upward tusk, snout+nostrils, beady eye+glint.
- **Snake** (20x8) — head+yellow eye+forked tongue at right, scale flecks, belly underline.
- **Gremlin** (18x22) / **Gremling** (14x16) — hunched imps: pointed ears, glowing eyes, snaggle
  teeth, pot-belly, clawed hands (Gremling smaller/simpler = lesser threat).
- **Duskrunner** (24x14) — lean jackal: bushy tail, pointed ear, ember eye, four legs.
- **Cragscale** (28x18) — armored reptile: ridged + spiked stone-plate back, stubby legs, tail.
- **Gremlin King** (40x48) — hulking ogre-gremlin: bone crown, glowing eyes, upward tusks, huge
  fists, muscled torso + loincloth.
- **Gloamwarden** (34x42) — amethyst brute: violet body, shoulder/head crystal growths, crystalline
  fists, glowing chest core + eyes.
- **Hexling** left as-is (the benchmark). World props (trees/rocks/stations) + item icons left
  as-is — out of scope for a creature pass.

**Verification.** Type-check clean; no console errors. Live `preview_eval` texture-showcase overlay
confirmed all sprites render with the intended detail; a follow-up query confirmed all 233 live
enemies report `upright:true` with near-zero rotation and varied `flipX`. Real pixel art +
animations still deferred (roadmap item 8) — this is a polish-the-placeholder pass, not the final
art.

### Biome 2 playtest fix batch #2 (worldgen seam, ground texture, Hexling rotation, damage)

Off a second badlands playtest (the user), built on **Sonnet** — fixes/tuning on already-shipped
systems, no new mechanic. Four items:

1. **Worldgen seam (the real "flat lines" cause).** The tiled `outerFeatureBiome` (badlands/dunes/
   outer-forest feature layer, `MainScene.ts`) generates its Voronoi zones + CA smoothing + creek
   ribbon as a bounded, non-toroidal grid, but `Biome.bilinear()` samples it with wraparound for
   tiled instances — bilinearly blending the grid's two UNRELATED edges together, which bakes a
   hard seam every `OUTER_FEATURE_SIZE` (4000 world px) in both x and y. Confirmed live via
   `preview_eval`: `worldBiomeColorAt` scan found nothing (smooth data), but a direct screenshot at
   a tile-boundary-adjacent player position showed one clean horizontal line — later confirmed via
   `outerFeatureBiome.forestWeight()` boundary scans. Fixed in `Biome.ts`: `buildVoronoiZones` now
   uses a toroidal (shortest-way-around) delta for seed distance when `tiled`; `smooth()`'s CA
   neighbor lookup wraps via `Biome.wrapCell` instead of the old "out-of-bounds counts as agreeing"
   rule; `carveCreek()` swaps its free random walk for a periodic sine wobble when tiled (guarantees
   `wobble(0) === wobble(mainLen)`, so the ribbon's start/end lateral position always matches at the
   wrap). Re-verified post-fix: 0 big `forestWeight` jumps scanned across 5 tile boundaries × 5
   sample points each. This is a DIFFERENT root cause than the prior "Phase 2 playtest fix batch"'s
   forest-disc-square-edge fix (see below) — that one didn't touch the tiled outer layer at all.
2. **Ground texture ("loses the speckled texture" outside spawn).** New `colorUtil.mottleColor()`
   — a generic two-octave brightness-noise pass (broad 150px + fine 55px), applied in
   `WorldBiomes.worldBiomeColorAt()` to the base layer + outer-forest-blob color (skipped inside the
   protected forest core, which keeps its real crisp tileSprite bake). Badlands/Dunes already had
   their own richer noise (barely touched by this subtle a pass); the open-wilds base layer and
   Dunes' flat fill had none at all — this was the actual "flat light green" the user saw. Explicit
   placeholder pass (comment points at CLAUDE.md's real-art-later note).
3. **Hexling rotation** ("shouldn't rotate and look upside down... should be upright, maybe mirror
   left/right with slight angles up/down"). New `EnemyConfig.upright` flag (`Enemy.ts`) — only
   Hexling sets it. Skips the base `Enemy` constructor's random-360°-spawn-rotation (replaced by a
   random initial `flipX`) and `applyFacing`'s full-rotation-toward-travel (the Boar/Snake/
   Duskrunner/Cragscale nose-first pattern), replaced by a new `applyUprightFacing()`: mirrors via
   `flipX` on horizontal movement, tilts `rotation` at most `UPRIGHT_MAX_TILT` (0.22 rad, ~11°)
   toward vertical movement, clamped so it's never near horizontal/upside-down. `faceAngle()` (used
   by locked-direction telegraphs) branches the same way, though Hexling doesn't currently call it.
   Verified live: `applyFacing` at all 8 compass directions stayed within ±0.192 rad.
4. **Biome-2 damage bumped significantly** ("badlands enemies don't do enough damage... should hurt
   even with lvl 3 armor... base hexlings should kill you in like 3 hits... make the game hard").
   Raw damage (net-of-armor in parens, vs. the 13-flat Lvl-3-armor cap): Duskrunner bite 20→**34**
   (net 21, was 7); Cragscale basher/roll 22→**40** (net 27, was 9); Hexling bolt 14→**22** and
   flame 18→**34** (both `magic` — bypass armor entirely, so raw IS net; 3 flame hits ≈ 102 now
   kills a base 100-HP player). For comparison, biome-1's hardest hitters net ~12 (Boar) and ~7
   (Snake) through the same armor cap — biome-2 is now clearly, deliberately harder. Also fixed a
   latent bug found while touching this: **Elite Hexling dealt the exact same bolt/flame damage as
   a base Hexling** — every other elite gets +50% dmg via its `maxHealth`/`biteDamage` constructor
   scaling, but Hexling's magic damage was two module-level consts never read against `elite`. Now
   `boltDamage`/`flameDamage` are per-instance fields scaled `elite ? round(BASE*1.5) : BASE`,
   assigned after `super()` (can't reference `this` before it) and read at both call sites.
5. **Map cell blockiness** (secondary polish alongside #1, same "sharp edges" complaint). New
   `ExploredMap.colorAtSmoothed()` — a center-weighted 3x3 average over revealed neighbor fog cells
   (still -1/fog if the cell itself is unrevealed, never bleeds color INTO fog) — wired into both
   `WorldMapUI`'s dirty-triggered terrain rebuild and `MinimapUI`'s per-frame cell fill, softening
   the visible hard rectangular cell edges especially at `WorldMapUI`'s higher zoom levels.

Verified: `tsc --noEmit` clean, `npm run build` clean, live `preview_eval` on all four items (seam
scan, mottle visible in a fresh screenshot, Hexling facing at 8 directions, live damage constant
readout), no console errors. No `RECIPES.md` change (no recipe/cost changes).

> Older entries (16-item playtest fix batch, Biome 2 Phase 2, Biome 2 Phase 1, Biome 2 Phase 0,
> Welcome overlay, and earlier) are in STATUS-archive.md.
