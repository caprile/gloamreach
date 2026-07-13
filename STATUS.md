# Status

## Current State

_Living snapshot — edit in place, never append. Last shipped: **Biome 2 — Phase 4a: Smelting economy +
Gremlin King gate + base forged gear** (2026-07-13, Opus; **Session 1 of a 2-session Phase 4**). The forged
gear tier + the deferred **Gremlin King critical-drop rework** (locked decision 10). New progression: mine
**Clay** → build the **Smelter**; smelt **ore + Hex Essence = ingot** (common **Sunscorch Ore → Sunsteel
Ingot**); upgrade the **Workbench to Lvl 3** (Forge Anvil) → unlocks base forged recipes; kill the **Gremlin
King → Heart** (replaces the fang) → upgrade the **Smelter** (Ember Crucible) → smelt rare **Cinderforged Ore
→ Embersteel Ingot** (the T2 metal for Session 2). Base gear: a **Sunsteel heavy set** (14 armor, wires the
dormant `heavy_armor` skill — its effect is **magic/fire mitigation**, the counterpart to light's dodge
i-frames) + a **Duskhide light set** (10) + **three weapons** covering blunt/slash/pierce. The Smelter reuses
the Drying Rack's menu/`ProcessingStation` (fuel- + tier-aware); a new `Recipe.requiresWorkbenchTier` gates
the forged tier on a Lvl-3 bench; benches now change texture per tier. All ingredients drop from normal
badlands enemies. Verified live via `preview_eval` (smelt ratios/fuel/tier-gate end-to-end, King→Heart,
heavy mitigation 40-vs-50, bench swaps); `tsc` clean; no console errors. See the Phase 4a entry below.
[[survivor-rpg-biome-2-plan]]_

_Prior: **Badlands playtest batch (19 items)** (2026-07-13, Opus). A broad polish/tuning pass off a
badlands playtest: a **fire** damage type (`IncomingDamageType`, bypasses flat armor like magic) + a
player-facing type-tinted damage number; **Cinderwrought** deals fire + on death cracks open mineable
Cinderforged Ore (the Phase-4 hook); badlands damage bumped across the board; **5 Sunken Forges** (was 1);
denser everything + 2 new harvestables (Gloamcap, Dustbloom); every POI gets a floor decal + marker ring;
**one Duneshaper altar per quadrant** (4); POI map-detection radius widened (~260→760px); decorative
immersion props across both biomes. See the batch entry below._

_Prior: **Biome 2 — Phase 3: The Duneshaper
(badlands final boss + win-con swap)** (2026-07-13, Opus). The **new win-condition final boss**,
demoting the Gremlin King to a mid-boss. `src/entities/Duneshaper.ts` — a gloam-warped apex
sorcerer, bespoke telegraph/poise AI (GremlinKing/Gloamwarden precedent, NOT a shared framework).
HP **900**, poise 120 (stagger → ×1.5 for 3s), scale 2.3; resists magic ×0.5, weak to melee ×1.3;
regens 14 HP/s deaggro'd. **Phase-gated ESCALATION** (locked with the user): 3 attacks at full HP —
**Gloam Volley** (3 magic bolts), **Sand Spikes** (3 PHYSICAL-pierce circles — armor applies),
**Blink Nova** (teleport + radial magic burst); **+Gloamfire Lance** (locked-direction magic beam)
at **70% HP**; **+Sunscorch Barrage** (7-circle magic carpet) **and enrage timing** at **50% HP**.
Magic attacks bypass flat armor (Phase-1 hook); only the spikes are physical. All area attacks
funnel through `checkPlayerHit` → `applyDamageToPlayer` (dash i-frames/armor just work); the volley
self-resolves as projectiles. Loot: **2 Refined Trophy (Uncommon) + 5-8 Gloam Shards**. **Summon
(the user):** its own badlands **Boss Altar(s)** — **3 scattered Tyrant Altars** — but the summon
item (**Effigy of the Duneshaper**, tier-1 recipe) is crafted from **Gloam-Bone Fetishes looted
from Duskrunner Warren caches** (guaranteed 1/cache). **Clue system (the user):** several altars so
one's reachable + they glow at night + auto-discover as violet `map_tyrant_altar` landmarks +
**crafting the effigy reveals ALL altars on the map** with a directional nudge to the nearest.
**Win-con swap:** a Duneshaper kill fires `endRun("won")`; the Gremlin King no longer wins (still
"boss" score, still drops its fang — its critical-drop rework is deferred to Phase 4). BossHealthUI
generalized to a `BossBarTarget` interface (shows whichever big boss is engaged). Verified live via
`preview_eval`: 3 spread altars + all 6 textures load; summon consumes the effigy + prompt gating;
boss stats/resists/loot; phase pool 3→4→5; state-machine cycle; all 5 attacks' `checkPlayerHit`
(physical-vs-magic + knockback + one-hit-per-instance + miss); volley = 3 magic bolts; **Duneshaper
kill → `endRun("won")` (VICTORY screen rendered), Gremlin King kill → no win**; effigy craft reveals
all altars + "tugs toward the north-west" nudge; boss renders (visible/alpha/onScreen). Next:
**Gremlin King critical-drop rework** (Phase 4 gear gate); then Phase 4 smelting/forging + Phase 5
tier-2 relics. See "Biome 2 — Phase 3: The Duneshaper" below. [[survivor-rpg-biome-2-plan]]_

_Prior: **Biome 2 — Phase 3 POI 2: the Sunken Forge** (2026-07-12, Opus). A **bespoke fire/forge
mini-boss** (`src/entities/Cinderwrought.ts`) guarding a themed badlands landmark — a Cinder Cone
(locked-direction fire fan, the game's only cone) + a Forge Hammer (wide-but-short front-arc smash).
HP 300, poise 70, resists blunt ×0.8 / weak pierce ×1.25. Loot: 1 Refined Trophy (Uncommon) + 3-5
Gloam Shards. `map_forge` landmark + `"poi"` toast on discovery. See its entry below._

_Prior: **Biome 2 — Phase 3: Duskrunner Warren POI** (2026-07-12, Opus). The first of Phase 3's two
POIs — a **two-wave destructible den**, NOT a shack clone: `src/entities/BadlandsDen.ts` is a burrow
mound guarded by **3 Duskrunners → (on clear) 3 ELITE Duskrunners**; only once both waves fall does
the den become **attackable with a melee weapon**, and smashing it collapses it into a **lootable
cache** (reuses `LootContainer`/`ChestMenu`). Loot gated behind destruction; no respawn. 10 dens
spread ≥950px apart; Duskrunners now drop raw `duskrunner_meat`. `map_den` landmark + `"poi"` toast
on discovery. See "Biome 2 — Phase 3: Duskrunner Warren POI" below._

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
complete 4-enemy roster**. **Phase 3 is underway** — the user chose "two POIs first," which shipped
(Duskrunner Warren + Sunken Forge), and now the **badlands final boss has shipped too: the
Duneshaper** (`src/entities/Duneshaper.ts`), the **new win-condition** (a Duneshaper kill wins the
run; the Gremlin King is demoted to a mid-boss). Summoned via **3 scattered badlands Tyrant Altars**
+ an **Effigy of the Duneshaper** crafted from **Warren-cache fetishes**, with a **clue system**
(reveal-all-altars-on-craft + night glow + map landmarks). **Phase 3 is complete** (the King
critical-drop rework, its one deferred item, shipped as part of Phase 4a below). **Phase 4
(smelting/forging gear tier) is underway, sliced into two sessions.** **Session 1 has shipped
(Phase 4a):** the Smelter station (ore + Hex Essence = ingot), Clay + scattered ore mining, the
**Gremlin King's Heart** (replaces the fang — it upgrades the Smelter to melt rare ore), Workbench
Lvl 3 + a new `requiresWorkbenchTier` recipe gate, and the **base forged gear** (Sunsteel heavy set
wiring the dormant `heavy_armor` skill w/ magic-fire mitigation; Duskhide light set; blunt/slash/pierce
weapons). **Session 2 (next):** Workbench Lvl 4 + the T2 **enhanced** reforge recipes (base piece +
Embersteel → new item, both sets + weapons) + the first **magic weapon** (rare-ore-exclusive melee
fire brand). Then Phase 5 tier-2 relics + biome-1 trim + family-replace-with-refund. The master-plan
tail **M-TE** (trophy-gated gear) is folded into this biome-2 work. Real pixel art/animations stay
deliberately deferred until content/balance settle (roadmap item 8). Badlands stats/counts + the
forged-tier numbers are all first-pass — expect a tuning pass as the biome fills out.

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

### Biome 2 — Phase 4a: Smelting economy + Gremlin King gate + base forged gear (2026-07-13, Opus)

Plan: `.claude/plans/biome-2-phase-4-forging.md` (Phase 4 of the biome-2 umbrella, **sliced into two
sessions** — this is **Session 1**). Built on **Opus** (new mechanic: smelting station + a new gear
tier + new gating). The deferred **Gremlin King critical-drop rework** (locked decision 10) finally
lands here, gating the forged tier. All verified live via `preview_eval` (module-level + end-to-end
scene flow); `tsc --noEmit` clean; no console errors.

**The forged progression (Session 1):** Mine **Clay** → build the **Smelter**; smelt **ore + Hex
Essence = ingot** (A+B); common **Sunscorch Ore → Sunsteel Ingot**; upgrade **Workbench to Lvl 3**
(Forge Anvil, costs Sunsteel Ingots) → unlocks the base forged recipes; kill the **Gremlin King →
Heart** → upgrade the **Smelter** (Ember Crucible) → smelt rare **Cinderforged Ore → Embersteel
Ingot** (the T2 metal Session 2's enhanced recipes will consume).

- **Smelter** (`Items`/`Recipes`, tier-1 placeable, `{clay:10, stone:15}`) — a new station that
  **reuses the Drying Rack's menu + `ProcessingStation`** (both are processing stations). `Processing.ts`:
  new `SMELT_RECIPES` + `ProcessRecipe.fuel`/`minStationTier`; `ProcessingStation` parameterized with a
  `recipes` list + `setTier()`. `DryingRackMenu` gained optional `title/descKey/actionLabel/busyLabel`
  (functions) + a **fuel readout/gate** dep, so ONE menu instance serves both (switched by
  `openStationKind`). MainScene: `smelters[]` array, `openSmelterMenu`, `processSmelterAmount` (deducts
  Hex Essence fuel from the backpack), hover via the shared `placedObjects` loop (`hoveredSmelter`,
  `promptForSmelter` → "[LMB] Use Smelter"), placement/destroy (refunds loaded ore).
- **Gremlin King rework:** now drops **`gremlin_king_heart`** (was `gremlin_king_fang`, retired to a
  plain trophy). The Heart is the **`ember_crucible`** Smelter upgrade's ingredient (`StationUpgrades.ts`,
  Smelter tier 0→1) → unlocks rare-ore smelting. Skipping the King costs the whole rare/T2 tier.
- **Workbench Lvl 3:** new `forge_anvil` StationUpgrade (workbench tier 1→2). New
  **`Recipe.requiresWorkbenchTier`** field (enforced in `craftRecipe`/placement + a live "Requires
  Workbench Lvl 3" line in `CraftingMenu` via a new `isNearWorkbenchAtTier` dep). All 9 forged recipes
  gate on tier 2.
- **Base forged gear** (all `requiresWorkbenchTier: 2`): **Sunsteel heavy set** (Helm/Cuirass/Greaves,
  4/6/4 = 14 armor, `armorType: heavy_armor`) + **Duskhide light set** (Hood/Vest/Leggings, 3/4/3 = 10,
  `light_armor`) + three weapons covering each melee type (**Sunsteel Warhammer** blunt wide-AOE /
  **Longsword** slash / **Pike** pierce). Ingredients all drop from **normal** badlands enemies
  (Cragscale Plate / Duskrunner Pelt / Sandmaw Chitin) + Sunsteel Ingots — verified not over-gated.
- **`heavy_armor` skill wired + given an identity:** XP accrues per worn piece (free, existing kill
  path); its effect is **partial magic/fire mitigation** (`Skills.heavyArmorMagicMitigation`, −0.4%/lvl
  cap −30%) applied in `applyDamageToPlayer`'s bypass branch while wearing ≥1 heavy piece (the
  counterpart to light armor's dash i-frames). Verified: 50 magic → 40 in heavy@Lvl50 vs 50 in light.
- **Mineable minerals** (`spawnBadlandsMinerals`): Clay (~40), Sunscorch Ore (~44), rare Cinderforged
  veins (~8, plus the ~20 Sunken Forge POI deposits) scattered via `pickBadlandsPoint` (POI exclusions
  honored), all confirmed in the badlands. **Bench visuals per tier:** `applyTierVisual` now swaps
  Workbench/Smelter textures (`icon_workbench_t1/t2`, `icon_smelter_t1`) instead of only tinting.
- **BootScene:** 19 new textures (2 ore/clay nodes, ingots, Heart, Smelter + tier, Workbench Lvl 2/3,
  3 weapons, 6 armor). Weapons reuse their icon as the equipped-on-sprite visual.
- **Verified live:** smelt ratio 2:1 + fuel-per-recipe + rare-ore tier-gate; end-to-end fuel deduction
  + fuel-short no-op; King → Heart drop; Ember Crucible/Forge Anvil upgrades; heavy mitigation; bench
  texture-swap on a real placed object; Smelter menu opens with the right title/verb. Files:
  `Processing.ts`, `DryingRackMenu.ts`, `CraftingMenu.ts`, `Recipes.ts`, `Items.ts`, `Inventory.ts`,
  `Weapons.ts`, `Skills.ts`, `StationUpgrades.ts`, `GremlinKing.ts`, `MainScene.ts`, `BootScene.ts`,
  `RECIPES.md`, `dashboard/main.ts`.
- **Deferred to Session 2:** Workbench Lvl 4 (Emberforge Anvil); the T2 **enhanced** reforge recipes
  (base piece + Embersteel → new item, both sets + weapons); the first **magic weapon** (melee-range
  fire brand, rare-ore-exclusive). Also deferred: forged tool tier, a forged ranged weapon.

### Badlands playtest batch (19 items, 2026-07-13, Opus)

Broad polish/tuning pass off a badlands playtest. No new milestone letter. All verified live via
`preview_eval` + a demo screenshot; `tsc --noEmit` clean.

1. **HUD toast overlap** (`EventLogUI.ts`) — "Defeated X" (combat) and "Slash leveled up" (levelup)
   center toasts overlapped "sometimes." Root cause: the Y was summed over live-toast heights, but the
   earliest toast always fades first, so a freed FRONT slot got reused under a still-visible toast. Fixed
   with a monotonic `centerStackNextY` cursor that only resets to the top when the stack is fully empty.
2. **Fire damage type** (`Weapons.ts` + `MainScene`) — new `IncomingDamageType = DamageType | "fire"`
   (kept OUT of `DamageType`/`SkillType` so it isn't a bogus weapon skill) + `bypassesArmor()` (magic|fire).
   `applyDamageToPlayer` bypasses flat armor for fire like magic. New `spawnPlayerDamageNumber()` floats a
   colored number over the player on every hit (fire orange / magic violet / physical red) so incoming type
   is clear (the user: "fire damage should be clear").
3. **Cinderwrought rework** (`Cinderwrought.ts`) — attacks now return `dmgType: "fire"`, damage up (cone
   30→46, hammer 44→58). On death, `onCinderwroughtKilled` cracks its shielded Ember Deposit nodes into
   mineable **Cinderforged Ore** (`ember_ore`, new resource + `Ember Deposit` node) — the "something mineable
   after we kill him" for smelting/metalworking (Phase-4 hook).
4. **More Sunken Forges** — refactored the single `forgePosition`/`cinderwrought` into `forgePositions[]` +
   `forges[]`; **`FORGE_COUNT` = 5** (the user: "way more of the ember POIs"), spread `FORGE_MIN_SPACING` apart,
   each with its own boss + ore ring + dressing.
5. **Badlands damage bump** — Duskrunner 34→42, Cragscale 40→48, Hexling bolt 22→26 / flame 34→40,
   Sandmaw 38→46.
6. **Duskrunner tuning** — deaggro leash 280→**620** (very sticky, the user), attack cooldowns faster
   (pounce 850→560, bite 220→140); den guards take a `wanderAnchor` and stay leashed to the den (no idle
   wander off the POI).
7. **Cragscale** roll hit radius 40→**58** (bigger spin lane).
8. **Sandmaw** — new `Enemy.isTargetable()` (default `!depleted`); Sandmaw overrides it to `false` while
   submerged, and the hover-target loop + AOE-arc sweep both honor it → can't be clicked/swept while invisible.
9. **Density** — Sandmaws 24→46, dens 10→16, packs 16→24, cragscales 34→46, hexlings 34→44.
10. **Badlands flora** — bumped counts + 2 new harvestables (**Gloamcap**, **Dustbloom**) with node/picked/
    icon textures + `Items`/`Inventory` defs.
11. **POI rings/floors/decor** — new `decoratePoi(rng, cx, cy, {floor, ring})` helper + `poi_floor_*` soft
    radial decals (depth -7) + `poi_ring_*` marker props; wired into forges, dens, Duneshaper altars, and the
    Gloaming Vein.
12. **Duneshaper altar arena** — `TYRANT_ALTAR_CLEAR_RADIUS` 170→360 + a wide gloam floor + a ring of standing
    stones + scattered gloam crystals (night-glowing via `tyrantAltarLightPoints`) + **4 elite Hexling guards**
    each.
13. **One altar per quadrant** — `pickTyrantAltarPositions` now places one Duneshaper altar in each of the 4
    map quadrants (the user: "start thinking in # per quadrant") instead of 3 scattered.
14. **POI discovery radius** — new `POI_DISCOVERY_RADIUS` (~760px, was fog's 260) so shacks/vein/dens/forges
    land on the minimap + world map from much further out.
15. **Reveal-map shows POIs** — `updateAltarDiscovery(forceAll)`; the dev reveal-whole-map command
    (`Ctrl+Shift+M`) now force-adds every POI landmark, not just terrain.
16. **Rename** — "Gloam-Bone Fetish" → "Gloam-Bone Totem" (display name; key `warren_fetish` unchanged).
17. **Decorative immersion props** — `makeDecorProps` (8 textures) + `scatterDecor` drops ~480 non-interactive
    props across both biomes (forest: fern/flowers/mushrooms/log; badlands: skull/dead bush/mesa boulder/bones),
    routed through the spawn samplers so they respect every POI exclusion zone.

**Verified** (`preview_eval`, single clean server after clearing a stale one): 5 forges / 16 dens / 46 Sandmaws
/ 5 Cinderwroughts / 4 tyrant altars (quadrants EN/ES/WN/WS) / 21 elite Hexlings / 20 ember-ore nodes / 44
Gloamcap + 52 Dustbloom; all 15 sampled textures exist; Cinderwrought cone→`{46,fire}` / hammer→`{58,fire}`;
fire bypasses armor (40 full vs slash 36 through 4 armor); Sandmaw `isTargetable()` false while submerged; den
guard has anchor; `updateAltarDiscovery(true)` drops 32 landmarks (1 altar + 16 den + 5 forge + 5 shack + 4
tyrant + 1 vein). Files: `EventLogUI.ts`, `Weapons.ts`, `Enemy.ts`, `Duskrunner.ts`, `Cragscale.ts`,
`Hexling.ts`, `Sandmaw.ts`, `Cinderwrought.ts`, `MainScene.ts`, `BootScene.ts`, `Items.ts`, `Inventory.ts`,
`dashboard/main.ts`, `RECIPES.md`.

### Biome 2 — Phase 3: The Duneshaper (badlands final boss + win-con swap)

Plan: `.claude/plans/biome-2-phase-3-badlands-boss.md` (Phase 3, umbrella `biome-2-sunscorch-badlands.md`).
Built on **Opus** (new boss mechanic). The **badlands final boss** and the game's **new
win-condition**, demoting the Gremlin King to a mid-boss. Locked with the user via `AskUserQuestion` +
a follow-up: scope = boss + win-swap now (King's critical-drop rework deferred to Phase 4); identity
= a gloam-warped apex sorcerer; difficulty = phase-gated attack escalation; summon = its own altars
but the totem is gathered from a POI (the Warrens); **plus** multiple altars + a clue system.

**`src/entities/Duneshaper.ts`** — bespoke telegraph/poise AI (GremlinKing/Gloamwarden precedent,
NOT a shared framework); extends `Enemy`, fully overrides `update()`; `idle → telegraphing →
executing → recovering → staggered`. HP **900** (final boss, above the King's 600), poise 120
(stagger → ×1.5 for 3s), scale 2.3, aggro 300, leash 580, regens 14 HP/s deaggro'd. A **caster**:
holds ~220px and casts. `resistances: { magic: 0.5, slash/blunt/pierce: 1.3 }` (soft caster hide).
**Damage-type mix** so gear reads: Sand Spikes are PHYSICAL pierce (flat armor applies); Volley/Nova/
Lance/Barrage are `magic` (bypass flat armor, Phase-1 hook).
- **Phase-gated escalation** (`availableAttacks()` grows as HP drops; `pickAttack` never repeats):
  - **100%→:** Gloam Volley (3 magic `gloam_bolt` projectiles, ±18°), Sand Spikes (3 physical circles
    across the player's spot), Blink Nova (teleport to the player + radial magic burst 132px).
  - **≤70% HP:** + Gloamfire Lance (locked-direction magic beam, 340px/±10° — sidestep the wind-up).
  - **≤50% HP:** + Sunscorch Barrage (7-circle magic carpet — find a gap) **and** enrage timing
    (shorter telegraph/recovery + faster move, captured per state-entry).
- Area attacks resolve via `checkPlayerHit()` (`{damage, knockback?, dmgType?}`) → `applyDamageToPlayer`
  (dash i-frames/armor just work); the volley self-resolves as projectiles (the enemy-projectile→
  player overlap forwards `dmgType: "magic"`). One hit per attack instance. Loot: **2
  `refined_trophy_uncommon` + 5-8 `gloam_shard`** (Phase 5 re-tiers the badlands trophy set).

**Summon (the user: own altar, totem gathered from a POI):**
- **`warren_fetish`** ("Gloam-Bone Fetish", new `ResourceType`) added to `DUSKRUNNER_WARREN_LOOT_TABLE`
  (guaranteed 1/cache). **`tyrant_totem`** ("Effigy of the Duneshaper", new crafted item) — tier-1
  recipe `{ warren_fetish: 3, gloam_shard: 2, bones: 8 }`, a consumable like `gremlin_totem`.
- **`BossAltar.kind`** (`"gremlin" | "tyrant"`). The forest War-Camp altar stays `"gremlin"`;
  `spawnTyrantAltars` adds **3** `"tyrant"` altars (own `tyrant_altar` texture) via
  `pickTyrantAltarPositions` (`pickBadlandsPoint`, ≥2600px apart), pushed into `bossAltars` so hover/
  night-light/discovery reuse. Positions picked in `create()` before spawning; a `TYRANT_ALTAR_CLEAR_
  RADIUS` (170) exclusion keeps content off the clearings. `attemptSummonBoss` branches on kind →
  `attemptSummonDuneshaper` (consumes the effigy, guards a global `tyrantSummoned` flag, spawns the
  boss after the ritual delay). `promptForAltar` tyrant → "[LMB] Offer the Effigy".

**Clue system (the user — the world is huge, a single altar could be across the map):** (1) all
tyrant altars glow at night (`collectLights` already lights `bossAltars`); (2) `updateAltarDiscovery`
gives them a distinct violet `map_tyrant_altar` landmark + "Duneshaper's Altar" label when explored
near; (3) **the load-bearing fix** — crafting the effigy (`onTyrantTotemCrafted`, hooked in
`craftRecipe`) reveals **ALL** tyrant altars on the map at once + an event-log directional nudge
("The effigy tugs toward the north-west…") toward the nearest (a `compassDir` helper).

**Win-con swap:** a `Duneshaper` kill fires `endRun("won")`; the `GremlinKing` win trigger was
removed (still `classifyKill` "boss" = 500 pts, still drops `gremlin_king_fang` — Phase-4 rework).
Wired into `classifyKill`, the `checkPlayerHit` boss union, `staggerMultiplierFor`, the boss
prompt-color union, and the respawn `isBoss` exclusion. **BossHealthUI generalized** from a
`GremlinKing`-typed param to a `BossBarTarget` interface (`displayName/health/maxHealth/poise/
poiseMax/depleted/isEngaged()`); the scene passes `engagedBigBoss()` (Gremlin King or Duneshaper,
whichever is engaged). GremlinKing got a `poiseMax` getter. Mini-bosses stay off the big HUD.

**`BootScene`** — `duneshaper` (44×54 hooded gloam-tyrant w/ staff + gloam-crystal), `tyrant_altar`
(64×56 sandstone ring + violet gloamfire), `gloam_bolt` (violet magic bolt), `icon_warren_fetish`,
`icon_tyrant_totem`, `map_tyrant_altar` (violet marker).

Files: new `Duneshaper.ts` + plan; `BossAltar.ts` (kind), `Inventory.ts` (+warren_fetish), `Items.ts`
(+2 defs), `Recipes.ts` (+tyrant_totem), `BootScene.ts` (6 textures), `BossHealthUI.ts` (interface),
`GremlinKing.ts` (`poiseMax`), `MainScene.ts` (fields/reset, positions, spawn, exclusion, altar
branching, summon, win/HUD/hooks, craft-clue, warren loot), `dashboard/main.ts` (Enemies mirror),
`RECIPES.md`. **Verified:** `tsc --noEmit` clean; `preview_start` boots with no console errors;
`preview_eval` — 3 spread tyrant altars (r 2563–3978) + all 6 textures load; summon consumes the
effigy + prompt gating (in-reach / summoned=null); boss HP 900 / poise 120 / scale 2.3 / resists /
loot; phase pool 3→4→5 by HP; full state-machine cycle; **all 5 attacks' `checkPlayerHit`** — spikes
50 physical (armor applies) / nova 42 magic kb220 / lance 46 magic / barrage 30 magic, one hit per
instance, miss when far; volley = 3 magic gloam bolts; **Duneshaper kill → `endRun("won")` (the
VICTORY screen rendered), Gremlin King kill → NO win**; effigy craft reveals all 3 altars + fires the
directional nudge; `engagedBigBoss()` returns "The Duneshaper"; boss renders (visible/alpha 1/
onScreen, night 0). Dashboard Enemies tab updated (the one manual mirror). **Next: the Gremlin King
critical-drop rework** (Phase 4 gear gate).

### Biome 2 — Phase 3 POI 2: the Sunken Forge (Cinderwrought fire/forge mini-boss)

Plan: `.claude/plans/biome-2-phase-3-pois.md` (Phase 3, umbrella `biome-2-sunscorch-badlands.md`).
Built on **Opus** (new mini-boss mechanic). The second of Phase 3's two POIs. Locked with the user
via `AskUserQuestion`: **loot = Uncommon relic trophy + Gloam Shards** (mirror the Gloamwarden);
**attacks = Cinder Cone + Forge Hammer**; **names = The Sunken Forge / Cinderwrought**.

**`src/entities/Cinderwrought.ts`** — a bespoke fire/forge mini-boss modeled on `Gloamwarden.ts`'s
telegraph/poise/stagger skeleton (a **trimmed sibling, NOT a shared framework** — per the "no boss
framework" lock). Extends `Enemy` for the HP-bar/loot/death machinery, fully overrides `update()`
(Snake/Boar/Gloamwarden precedent): `idle → telegraphing → executing → recovering → staggered`. A
poise meter (70; `takeHit` chips 1:1 → stagger ×1.5 for 2.5s) drawn as a second amber bar below the
HP bar. HP **300** (badlands-tough, above the forest Gloamwarden's 260), scale **1.8**, move 52,
aggro 260, leash 520, regens 12 HP/s deaggro'd. `resistances: { blunt: 0.8, pierce: 1.25 }` — a
molten-slag crust (the Phase-1 damage-type nudge, the inverse of a Sandmaw). Two **new-feeling**
attacks, deliberately distinct from Gloamwarden (leap-smash/eruption) and GremlinKing (charge/slam):
- **Cinder Cone** — the game's **only cone**: exhales a fire fan (±32°, 210px) in a direction
  **locked at telegraph START** (820ms wind-up), so a sidestep clears it. 30 dmg / 140 kb.
- **Forge Hammer** — a heavy **wide-but-short front-arc** smash (±70°, 155px), direction re-locked
  at execute (tracks the player through the 720ms telegraph); the dodge is to back out of the wedge
  (or dash). 44 dmg / 240 kb.
Both attacks resolve via `checkPlayerHit()` (wedge geometry: dist + angular diff vs the locked
`attackAngle`) — queried by the scene like the other area-damage bosses — funnelling through the
same `applyDamageToPlayer` choke point, so dash i-frames/armor "just work" with no special-casing.
Fire-colored `Graphics` telegraph + execute visuals (fan/wedge fills). Guaranteed loot: **1
`refined_trophy_uncommon` + 3-5 `gloam_shard`** (mirrors the Gloamwarden's payoff).

**`MainScene`** — `forgePosition` picked once in `create()` (after the vein) via `pickForgePosition`
over `pickBadlandsPoint`, kept ≥1000px from the war camp / ≥900px from the Gloaming Vein so it reads
as its own destination; picked **before** spawning so a new `FORGE_CLEAR_RADIUS` (220) exclusion in
`pickBadlandsPoint` keeps ordinary badlands content out of the clearing (the standing exclusion-zone
lesson). `spawnSunkenForge()` drops the `sunken_forge` structure + the Cinderwrought + 9 scattered
`slag_chunk` props; `forgeLightPoints` glow ember at night (`collectLights`, radius 130). Discovery
(`updateAltarDiscovery`) adds a `map_forge` minimap/world landmark ("The Sunken Forge", fiery
`0xd6481a`) + fires the `"poi"` discovery toast. Wired into the `checkPlayerHit` boss `instanceof`
union, `staggerMultiplierFor` (`CINDERWROUGHT_STAGGER_DAMAGE_MULTIPLIER`), `classifyKill` (**elite** —
no dedicated mini-boss band, like the Gloamwarden), the boss prompt-color union, and the respawn
`isBoss` exclusion. **No smelting wiring** (Phase 4 doesn't exist — the smithy theme ships as loot +
the fight only, per the Phase-4 hook) and **no post-kill interactable** (loot is the guaranteed
drop, unlike the vein's mineable nodes).

**`BootScene`** — `cinderwrought` (34×42 charred-iron brute: molten cracks + forge-hammer fists +
ember eyes, warm fire palette contrasting the Gloamwarden's violet), `sunken_forge` (48×38 ruined
smithy w/ molten crucible + broken anvil), `slag_chunk` (16×14 cooled-lava rubble), `map_forge`
marker (fiery orange-red).

Files: new `Cinderwrought.ts`; `MainScene.ts` (import, constants, fields/reset, `pickForgePosition`/
`spawnSunkenForge`, exclusion, lights, discovery, 4 combat unions); `BootScene.ts` (4 textures);
`dashboard/main.ts` (Enemies-tab entry — the one manual mirror). No `RECIPES.md` change (no recipes).
**Verified:** `tsc --noEmit` clean; `preview_start` boots with no console errors; `preview_eval` +
screenshot — forge at r≈4174 (accessible badlands), 3377px from camp / 3167px from vein; all 4
textures load; boss HP 300/poise 70/scale 1.8; aggro + poise-bar-on-aggro; full `idle→telegraph→
execute→recover→idle` cycle for BOTH attacks (manual-clock driven, since the backgrounded preview
throttles rAF); cone hits the fan / misses at 90° sidestep / misses beyond 210px; hammer hits front
/ misses behind / misses beyond 155px; resists blunt 0.8 / pierce 1.25 / slash 1.0; poise→0 staggers
(×1.5); the fight kills a full-HP player (damage path end-to-end); discovery adds the `map_forge`
landmark + fires the `"poi"` toast; the Cinderwrought + forge structure + slag render in the
badlands. **Next: the badlands final boss (new win-con) + the Gremlin King critical-drop rework.**

> Older entries (Biome 2 Phase 3 Duskrunner Warren POI, Phase 2b Sandmaw, 4-item playtest fix batch,
> Placeholder art pass, Biome 2 playtest fix batch #2, 16-item playtest fix batch, Biome 2 Phase 2/1/0,
> Welcome overlay, and earlier) are in STATUS-archive.md.
