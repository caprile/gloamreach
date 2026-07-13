# Status

## Current State

_Living snapshot — edit in place, never append. Last shipped: **Biome 2 — Phase 5: Relics rework**
(2026-07-13, Opus). The relic economy for biome 2 + the requested rebalance, closing out the biome-2
umbrella plan's final milestone. Three parts, all locked via `AskUserQuestion`: **(1) Family loadout,
not stacking.** Every relic now has a `family` (damage/move/defense/stamina/lifesteal/vitality/crit/xp,
8 total) and a player holds **at most one relic per family**. Rolling into an owned family runs a
direction-normalized **dominance comparison**: new relic strictly better on every shared stat →
**auto-replaces** (old relic refunds Gloam/Ember Shards, scaled by its own rarity × power tier); old
strictly better/equal → the new roll **auto-declines** (refunds itself instead); **neither dominates**
(e.g. a differing secondary stat) → **ambiguous**, and the Relic Forge shows a **Keep New / Keep Old**
prompt, blocking further rolls until resolved (closing the menu mid-choice defaults to declining the
new one, so a spent trophy never yields literally nothing). **(2) Trimmed magnitudes** — every relic's
effect numbers scaled to ~0.625× the original (Common dmg +8%→+5%, Mythic +40%→+25%) per the locked
"Common damage +8%→~+5%, Mythic +40%→~+25%" spec. **(3) Tier-2 relics** — all four badlands elite
trophies (Duskrunner/Cragscale/Hexling/Sandmaw) bumped from Tier 1 → **Tier 2** (×1.5 magnitude), and a
new **Ember Shard** currency (Gloam Shards rendered down at the Relic Forge's new **Ember Kiln**
upgrade, Lvl 3, `{embersteel_ingot:3, stone:20}`, 3 Gloam → 1 Ember) feeds a new tier-2 refine recipe
(`refine_common_t2`: 3 Common-T2 trophies + 2 Ember → 1 Ember-Refined Trophy, rolls Uncommon capped at
Rare). New **Relics column on the Inventory panel** (Tab) — 8 fixed paper-doll-style slots, one per
family, filled or empty with hover tooltips — addresses playtester confusion (they were checking the
Equipment tab for relics instead of the HUD bar). `RelicManager` internals moved from an array of
stackable instances to `Partial<Record<RelicFamily, RelicInstance>>`; the aggregate effect getters
(`damageMult()` etc.) are unchanged, so every `MainScene` call site kept working with zero edits.
Verified via `tsc --noEmit` (clean) and live `preview_eval` (all three roll verdicts, tier-scaling
dominance, refund math, Ember conversion + its tier gating, both new UI panels rendered and measured
for overlap — caught and fixed a real layout bug where a 2-line "replaced/declined" result or the
choice-button block could overlap the relic grid below it). See the Phase 5 entry
below. **This completes the biome-2 umbrella plan (`.claude/plans/biome-2-sunscorch-badlands.md`).**
[[survivor-rpg-relics]]_

_Prior: **Biome 2 — Phase 4b: enhanced (T2) gear
tier + the first magic weapon** (2026-07-13, Opus; **Session 2 of Phase 4**, completing it). Adds the
**Workbench Lvl 4** upgrade (**Emberforge Anvil**, `{embersteel_ingot:5, stone:15}`, only discoverable once
an Embersteel Ingot has been smelted) which unlocks a new `requiresWorkbenchTier:3` recipe gate. **9
enhanced recipes** each **reforge their base forged piece** (the base item is consumed as an ingredient —
must be **unequipped/in the backpack**) + Embersteel Ingot: an **Embersteel heavy set** (7/9/7 = 23 armor)
+ an **Emberhide light set** (5/6/5 = 16) + three enhanced weapons (Embersteel Warhammer 20 blunt / Longsword
15 slash / Pike 17 pierce). The **first MAGIC weapon** — the **Ember Brand** (`{embersteel_ingot:3,
hex_essence:4}`, rare-ore-exclusive), 14 dmg / 520ms, `magic` type: DPS ≈ the Embersteel Pike on a neutral
target, but resisted (~×0.4–0.5) by the gloam-casters (Hexlings, the Duneshaper) — a sidegrade that finally
gives the `magic` weapon skill a real XP source (no badlands enemy is *weak* to magic yet — a hook for a
future magic-vulnerable foe). **Zero new MainScene logic** — the Emberforge upgrade, tier-3 gate, item-key
costs (Recipe.costs widened to `Partial<Record<string,number>>`), bench-texture swap, and magic damage-type
routing all flow through existing generic machinery. Verified live via `preview_eval` (all 10 recipes/items,
Emberforge chain t1→t2→t3, tier-4 gate blocks/allows, enhanced craft consumes base piece, bench t3 texture
swap, badlands magic resists); `tsc` clean; no console errors. **Phase 4 complete.** See the Phase 4b entry
below. [[survivor-rpg-biome-2-plan]]_

_Prior: **Biome 2 — Phase 4a: Smelting economy +
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
badlands enemies. See the Phase 4a entry below. [[survivor-rpg-biome-2-plan]]_

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
(smelting/forging gear tier) is COMPLETE (both sessions shipped).** **Session 1 (Phase 4a):** the
Smelter station (ore + Hex Essence = ingot), Clay + scattered ore mining, the **Gremlin King's Heart**
(replaces the fang — it upgrades the Smelter to melt rare ore), Workbench Lvl 3 + a new
`requiresWorkbenchTier` recipe gate, and the **base forged gear** (Sunsteel heavy set wiring the dormant
`heavy_armor` skill w/ magic-fire mitigation; Duskhide light set; blunt/slash/pierce weapons).
**Session 2 (Phase 4b):** Workbench Lvl 4 (**Emberforge Anvil**) + the 9 T2 **enhanced**
reforge recipes (each consumes its base forged piece + Embersteel Ingot → Embersteel heavy set / Emberhide
light set / three enhanced weapons) + the first **magic weapon** (the **Ember Brand**, rare-ore-exclusive
melee, `magic` damage type). **Phase 5 (just shipped): the relic rework** — family-loadout
(one relic per family, dominance-based auto-replace/decline/choice), trimmed biome-1 magnitudes (~0.625×),
tier-2 badlands relics (Duskrunner/Cragscale/Hexling/Sandmaw trophies now Tier 2), and a new Ember Shard
currency (Gloam→Ember at the Relic Forge's new Ember Kiln upgrade) feeding a tier-2 refine recipe. Also
added a dedicated Relics column on the Inventory panel. **This completes the biome-2 umbrella plan
(`.claude/plans/biome-2-sunscorch-badlands.md`) — all 6 phases (0–5) are shipped.** The master-plan tail
**M-TE** (trophy-gated gear) is folded into this biome-2 work and is done. Real pixel art/animations stay
deliberately deferred until content/balance settle (roadmap item 8). Badlands stats/counts + the
forged-tier + relic numbers are all first-pass — expect a tuning pass once outside playtesters weigh in.
**Next up:** no locked next milestone — likely a broader playtest/tuning pass, or a new biome-3 scoping
session per the master roadmap's "at least 5 total biomes" note.

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

### Biome 2 — Phase 5: Relics rework (2026-07-13, Opus)

Plan: `.claude/plans/biome-2-sunscorch-badlands.md` (Phase 5, the umbrella's final milestone —
**this completes it**). Built on **Opus**. Three locked deliverables (`AskUserQuestion`), plus a
fourth request added mid-session (a dedicated Relics UI panel). `tsc --noEmit` clean throughout;
verified live via `preview_eval` (see below) — caught and fixed one real layout bug along the way.

- **Family loadout, not stacking (`src/systems/Relics.ts`).** New `RelicFamily` type (8: damage/
  move/defense/stamina/lifesteal/vitality/crit/xp) + a `family` tag on every `RelicDef` — a
  dual-stat relic claims one primary family (e.g. War Totem's `damagePct`+`staminaCostPct` is
  `damage`). `RelicManager.instances` changed from an array of stackable `{id,powerTier}` to
  `Partial<Record<RelicFamily, RelicInstance>>` — **at most one relic per family (8 max)**.
  `roll()` now runs a new `compareInstances()` dominance check (direction-normalized per key —
  `staminaCostPct`/`damageTakenPct` are "lower is better") whenever the produced relic's family is
  already owned: **strictly better** (≥ on every shared stat, > on ≥1) → **auto-replaces**, old
  relic refunds shards; **strictly worse/equal** → **auto-declines**, the new roll refunds shards
  instead; **ambiguous** (mixed — e.g. a differing secondary stat) → `RollResult.familyConflict.
  verdict = "choice"`, ownership left untouched until `resolveChoice(family, keepNew, newId,
  newTier)` is called. Refund = `REFUND_BASE[rarity] * powerTier` (Common 1/Uncommon 2/Rare 4/
  Mythic 8), in Gloam Shards (Tier 1) or Ember Shards (Tier ≥2) via `shardKeyForTier`. The
  aggregate effect getters (`damageMult()` etc.) are **unchanged in shape** — `sumEffect()` just
  iterates the 8 families instead of an array — so every `MainScene` call site kept working with
  zero edits.
- **Trimmed magnitudes (locked decision 8).** Every `RELIC_DEFS` effect scaled to exactly
  **×0.625** the original value, matching the locked spec verbatim (Common damage 8→5%, Mythic
  40→25%) — e.g. Stoneskin Charm −8→−5%, Tireless Charm −12→−8%, Titan Totem 40/30→25/19%.
- **Tier-2 relics + Ember Shard currency.** All four badlands elite trophies (`duskrunner_trophy`/
  `cragscale_trophy`/`hexling_trophy`/`sandmaw_trophy`) bumped `powerTier: 1 → 2` in `TROPHY_ROLL`
  (still Common rarity, same odds/pity — just ×1.5 magnitude via the existing `POWER_TIER_MULT`
  scaffold). New **Ember Shard** item (`Items.ts`/`Inventory.ts`, amber recolor of the Gloam Shard
  texture in `BootScene.ts`) — converted from Gloam Shards at a new **Ember Kiln** Relic Forge
  upgrade (`StationUpgrades.ts`, Lvl 2→3, `{embersteel_ingot:3, stone:20}`, discoverable once
  Embersteel Ingot is known) via `GLOAM_TO_EMBER_RATIO = 3`. New tier-2 refine recipe
  (`refine_common_t2`: 3 Common-T2 trophies + 2 Ember Shard → 1 `refined_trophy_uncommon_t2`,
  new item, rolls Uncommon capped at Rare, powerTier 2) alongside the existing Tier-1 rows.
- **Relic Forge menu (`RelicForgeMenu.ts`): new Convert tab + choice UI.** A third tab (Bind/
  Refine/Convert), gated `forgeTier() >= 2` like Refine's `>= 1`, with a single "Convert" button
  (commit-at-end `ProgressBar`, same pattern as Refine) that renders `GLOAM_TO_EMBER_RATIO` Gloam
  into 1 Ember per click. The result line now branches on `familyConflict`: "replaced"/"declined"
  show a second refund line; "choice" renders a **Keep New / Keep Old** two-button prompt (each
  showing the relic's effect text + the shard refund the OTHER option would pay), blocking further
  rolls/tab-switches until resolved — `resolveChoice()` mutates `lastResult` in place so the same
  render path shows the outcome. **Closing the menu mid-choice auto-declines the new roll** (so a
  spent trophy never yields literally nothing). Dead `×N` stacking badges removed from both this
  menu's relic grid and `RelicBarUI.ts` (impossible now that families cap at 1).
- **New Relics column on the Inventory panel (`InventoryMenu.ts`)** — a request added mid-session
  after the user noted playtesters kept checking the Equipment tab for relics. A 4th side-by-side
  section (2×4 = 8 fixed slots, one per family, paper-doll style like Equipment): empty slots show
  the family label, filled slots show the rarity gem + a `T#` badge + a hover tooltip (name/
  rarity/tier/effect, a small inline tipBg/tipText mirroring the existing `RelicBarUI`/
  `RelicForgeMenu` pattern). Reads a new `RelicManager.familySlots()` (all 8 in fixed order,
  filled or `null`) via a new `InventoryMenuDeps.relicFamilySlots` dep.
- **Bug caught + fixed during verification:** the Bind tab's `resultBlockH` reserved layout space
  only distinguished "no conflict" (1 line) from "choice" (buttons); it didn't account for
  "replaced"/"declined" now being **2 lines** (a refund line was added under the "Forged:" line) —
  the result text overlapped the "Your Relics" header and grid below it. Fixed by branching
  `resultBlockH` on the conflict verdict (26/58/130) instead of just `choicePending()`; re-verified
  live with exact pixel-gap assertions (`Text.y + Text.height` vs the grid header's `y`) for both
  the 2-line and choice cases post-fix.
- **Verified live** (`preview_eval`): all three roll verdicts via `RelicManager.roll()`/
  `resolveChoice()` with controlled `rng` (no `Math.random` monkeypatching — that corrupts
  Phaser's internal texture-key generation and was a red herring in an earlier pass); tier-scaling
  dominance (an identical relic at T2 beats its own T1 copy); refund amounts match `REFUND_BASE ×
  powerTier` exactly for all 4 rarities; `xpMult()` reflects a T2 Scholar's Idol (1.24×); Ember
  conversion's 3-tier gating (no forge / Lvl 2 / Lvl 3) and the 6→3 gloam / +1 ember math; the
  Relics inventory column renders with correct gem/tier-badge/empty-label states; the Relic Forge's
  Bind/Refine/Convert tabs and the Keep New/Keep Old choice UI all render and resolve correctly
  on-screen with no post-fix overlap; zero console errors after the fix. Dashboard `renderRelics()`
  updated (family column + note, Ember conversion note, tier-2 trophy table rows — all read live
  off `Relics.ts`, so magnitude/family data can't drift); `RECIPES.md` Relics section rewritten.
  Files: `Relics.ts`, `Items.ts`, `Inventory.ts`, `BootScene.ts`, `StationUpgrades.ts`,
  `RelicForgeMenu.ts`, `RelicBarUI.ts`, `InventoryMenu.ts`, `MainScene.ts`, `RECIPES.md`,
  `dashboard/main.ts`. **This completes the biome-2 umbrella plan
  (`.claude/plans/biome-2-sunscorch-badlands.md`) — all 6 phases (0–5) are shipped.**

### Biome 2 — Phase 4b: enhanced (T2) gear tier + first magic weapon (2026-07-13, Opus)

Plan: `.claude/plans/biome-2-phase-4-forging.md` (**Session 2**, completing Phase 4). Built on **Opus**
(new gear tier + first magic weapon). **No new MainScene logic** — everything routes through generic
machinery Session 1 (5ak) and earlier phases already built. `tsc --noEmit` clean; verified live via
`preview_eval`; no console errors.

- **Workbench Lvl 4 (Emberforge Anvil):** new `StationUpgrades.ts` row (`emberforge_anvil`, workbench
  tier 2→3, `{embersteel_ingot:5, stone:15}`, "Unlocks enhanced gear"). Only **discoverable** once an
  Embersteel Ingot has been smelted (`canDiscoverUpgrade` gates on cost keys being discovered — no new
  wiring). The upgrade chain reads `tool_sharpener@t1 → forge_anvil@t2 → emberforge_anvil@t3` (verified).
  `applyTierVisual` swaps the placed bench to a new `icon_workbench_t3` (ember-fed-anvil sprite) via the
  existing `tieredStationTexture` — confirmed live on a real placed bench.
- **`Recipe.costs` widened** `Partial<Record<ResourceType, number>>` → `Partial<Record<string, number>>`
  so a **crafted base piece** (e.g. `sunsteel_helm`) works as an ingredient — the enhanced tier's core
  mechanic. All cost lookups already go through the backpack's string-keyed count/removeCount + the
  discovered set, so nothing else changed; the base piece just has to be **unequipped/in the backpack**
  to reforge.
- **9 enhanced recipes** (all `requiresWorkbenchTier: 3`, each **consumes its base forged piece**):
  **Embersteel heavy set** (Helm 7 / Cuirass 9 / Greaves 7 = 23 armor) + **Emberhide light set** (Hood 5 /
  Vest 6 / Leggings 5 = 16) + three enhanced weapons (**Embersteel Warhammer** 20 blunt / **Longsword** 15
  slash / **Pike** 17 pierce). Armor keeps the base sets' `heavy_armor`/`light_armor` categorization gate
  (level 0) + `armorType`, so heavy XP + magic/fire mitigation carry over free. No right-click ArmorUpgrades
  (the reforge IS the progression).
- **First MAGIC weapon — the Ember Brand** (`{embersteel_ingot:3, hex_essence:4}`, rare-ore-exclusive,
  `requiresWorkbenchTier: 3`, `magic` type, 14 dmg / 520ms / 15 stam / 45° arc). Its DPS ≈ the Embersteel
  Pike on a **neutral** target; `magic` is **resisted** (~×0.4–0.5) by the gloam-casters (Hexlings 0.4, the
  Duneshaper 0.5) and neutral (×1.0) vs Duskrunner/Cragscale/Sandmaw — a sidegrade, not flatly best, and
  the **only `magic` weapon-skill XP source**. Routes through the existing `resolveWeaponHit` resist +
  `awardSkillXp(dmgType)` path with zero new code. **Note:** no badlands enemy is *weak* to magic, so it
  never lands super-effective — a hook for a future magic-vulnerable foe (flagged in `RECIPES.md`).
- **`Weapons.ts`:** 4 new `WeaponType` keys (`embersteel_warhammer`/`_sword`/`_pike`, `ember_brand`) —
  TS forced entries in every `Record<WeaponType,…>` table (damage/cooldown/stamina/types/base-crit/arc).
- **BootScene:** 11 new textures (3 enhanced-weapon icons, 6 enhanced-armor icons, Ember Brand icon,
  `icon_workbench_t3`) — all confirmed present, drawn without error. Enhanced gear recasts the base
  silhouettes in dark ember-veined steel; the Ember Brand is a fire-brand rod with a gloamfire wisp.
- **Verified live** (`preview_eval`): all 10 new recipes present w/ correct costs & tier 3; all 10 items
  defined; Emberforge upgrade @t3 in the chain; `isNearWorkbenchAtTier(3)=true / (4)=false`; a **Lvl-2
  bench blocks** an enhanced craft while a **Lvl-3 bench allows** it (base `sunsteel_helm` + ingots
  consumed → `embersteel_helm` produced); bench t3 texture swap; weapon stats/arc; badlands magic resists.
- **Dashboard/RECIPES.md:** dashboard weapon arrays (previously stuck at the biome-1 four) extended to a
  shared `MELEE_WEAPONS` covering base forged + enhanced + magic; `RECIPES.md` crafting/upgrade/armor/weapon
  tables updated. Files: `Weapons.ts`, `Items.ts`, `Recipes.ts`, `StationUpgrades.ts`, `BootScene.ts`,
  `dashboard/main.ts`, `RECIPES.md`. **Phase 4 complete.**
- **Deferred beyond Phase 4** (unchanged): forged **tool** tier, a forged **ranged** weapon. The
  Gloam→Ember-Shard conversion + tier-2 relics both shipped in **Phase 5** — see that entry above.

> Older entries (Phase 4a Smelting economy, Badlands playtest batch, Biome 2 Phase 3 The Duneshaper,
> Phase 3 POI 2 Sunken Forge, Phase 3 Duskrunner Warren POI, Phase 2b Sandmaw, 4-item playtest fix batch,
> Placeholder art pass, Biome 2 playtest fix batch #2, 16-item playtest fix batch, Biome 2 Phase 2/1/0,
> Welcome overlay, and earlier) are in STATUS-archive.md.
