# Status

## Current State

_Living snapshot — edit in place, never append. Last shipped: **Ember-tier armor set bonuses**
(2026-07-13, Opus). The deferred payoff for building the best-in-biome forged gear: two full-set
(3-piece) bonuses, both **unique mechanics** (not the raw-% channels relics own). **Embersteel (heavy)
→ Molten Bulwark**: knockback immunity + fire thorns on melee attackers. **Emberhide (light) →
Emberblink**: +60% dash distance + a fire nova at the landing point. New `src/systems/SetBonuses.ts`
(membership only; magnitudes = `SET_*` consts in MainScene); a `resolveKill` extraction so set-bonus
fire shares the weapon kill path; active bonuses shown in the inventory Combat column + a `Set (3)`
tooltip line on each Ember piece. `tsc` clean; verified live. See the entry below. Prior:
**Biome-aware enemy respawn** (2026-07-13, Sonnet). A small correctness fix on the fog-top-up respawn
system (an open Biome-2 item): `makeRespawnEnemy` now picks the respawn roster from the biome at each
spawn point (`worldBiomes.dominantBiomeAt`) — forest/base → the forest mix, badlands → the badlands
roster (Duskrunner/Cragscale/Hexling/Sandmaw), dunes → nothing. Prior: **Biome-wide wood/stone + Ironbark
axe-upgrade chain + relic-UI fixes** (2026-07-13, Opus). Off the master-plan build order — a mixed
batch. **Relic-UI fixes:** the Character menu (K) and Tab combined menu are now mutually exclusive
(they z-fought over the new Relics column), and the relic hover tooltip shows the relic's family/class.
**Every biome now supplies wood + stone:** new badlands dead-tree/boulder/branch/scrap-rock gatherables
(`spawnBadlandsNodes`) drop the same universal `wood`/`stone` keys. **Tool tiers are finally implemented**
(the long-reserved hook): `ResourceNode.minToolTier` + a tracked `equippedToolTier` mean a too-weak tool
bounces off (prompt still shows the verb — never reveals the tier). A new **Ironbark tree** (new `ironbark`
wood, `minToolTier: 1`) needs an upgraded axe; the **Woodcutter's Axe now upgrades in place** via a new
`ToolUpgrades.ts` (Ironshod Axe, `2 Sunsteel Ingot + 6 Stone`) that reuses the entire weapon-upgrade path.
Ironbark feeds the **Forge Anvil / Emberforge Anvil** Workbench upgrades + the **Embersteel Warhammer/Pike**
reforges (so the axe upgrade gates the forged tier). **Deferred to its own session (the user):** Ember-tier
uniqueness + armor **set bonuses**, ungated ore-gear upgrades, and a **QERT activated-ability** system.
Verified live; `tsc` clean; `RECIPES.md` + dashboard updated. See the entry below.
[[survivor-rpg-biome-2-plan]] [[survivor-rpg-placed-object-management]]_

_Prior: **Campfire tiers + cross-biome cooking +
no-ladder station upgrades** (2026-07-13, Opus). **Station/processor upgrades are now no-ladder** (any
discovered upgrade applies in any order; applying = +1 level; weapon/armor keep their ladder), plus
Campfire Lvl 3/4, 5 new HP-regen dishes, and a collapsible/scrollable cooking-menu rework. Full detail
in Recent Entries + [[survivor-rpg-no-ladder-station-upgrades]] [[survivor-rpg-cooking-food-buffs]]._

_Prior: **Biome 2 — Phase 5: Relics rework**
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

_Earlier milestones (full writeups in STATUS-archive.md): Biome 2 Phase 4a/4b (smelting + base/enhanced
forged gear + Gremlin King's Heart + Ember Brand), the 19-item badlands playtest batch, Phase 3
(Duneshaper boss + win-swap, Sunken Forge, Duskrunner Warren), Phase 2b Sandmaw, Phase 2 badlands roster,
Phase 0/1 patchwork worldgen + combat-systems layer, and the whole roguelike meta-loop._

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

**Dev tooling (2026-07-13, Sonnet):** `window.__dev` browser-console commands for playtesting without a
full playthrough — `god()` (still takes damage/knockback/shows real damage numbers, just floors HP at 1
and never dies), `heal()`, `nobuildcost()`, `setstat(name|"all", value)`, `spawn(name, elite?)`,
`killall(radius?)`, `exploremap()`, `list()` (dumps valid skill/stat/enemy names), plus a
`run("spawn duneshaper")`-style one-line parser. DEV-build-gated (`import.meta.env.DEV`, new
`src/vite-env.d.ts`) — unreachable in a production build. `nobuildcost` also fixed a real latent bug: the
Crafting/Cooking/Upgrade menus each computed their own greyed-out/affordability state independently of
MainScene's cost gates, so the first ship only fixed the click-to-craft path, not the menu display —
the user hit this immediately (craft button stayed greyed with nobuildcost on). See the Recent Entries
below + [[survivor-rpg-dev-console]].

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
- ~~**Enemy respawn top-up is forest-species-only, biome-agnostic.**~~ **FIXED (2026-07-13)** —
  `makeRespawnEnemy` now picks the roster from the biome at each chosen spawn point
  (`worldBiomes.dominantBiomeAt`): forest/base → the forest mix, badlands → the badlands mix
  (Duskrunner/Cragscale/Hexling/Sandmaw), dunes → nothing (empty placeholder). See the entry below.

## Recent Entries

> Older entries in STATUS-archive.md.

### Ember-tier armor set bonuses (2026-07-13, Opus)

The deferred "Ember-tier uniqueness + armor **set bonuses**" item (a payoff for building the
best-in-biome forged gear). Two full-set (3-piece) bonuses, both **unique mechanics, not the raw-%
channels relics own** (the user: "really reward the player, non-relic-overlapping"), each leaning into
its armor-skill identity. Locked via `AskUserQuestion`.
- **`src/systems/SetBonuses.ts`** (new, framework-free) — `ARMOR_SETS` (id/pieces/bonusName/desc) +
  `activeSets(slots)` (full-set membership by item key; no partials) + `setById`. Effect *magnitudes*
  live in MainScene (`SET_*` consts) next to where they apply; SetBonuses.ts only owns membership.
- **Embersteel (heavy) → Molten Bulwark:** immune to knockback + melee attackers seared for fire
  (thorns, 9 dmg). Knockback immunity guards the `if (knockback)` block in `applyDamageToPlayer` (so
  bite-shoves AND boss slams are negated); thorns fires in `updateEnemies`' melee-**bite** branch only
  (ranged projectiles never touch the plate).
- **Emberhide (light) → Emberblink:** dash burst distance ×1.6 (new `dashDistMult` param on
  `Player.update`, scales `DASH_SPEED` only — kept separate from the relic `moveMult`) + a fire nova
  at the landing point (`emberblinkBurst`, 16 dmg in a 95px radius, expanding orange `light_soft`
  flash). Scheduled `delayedCall(DASH_DURATION_MS)` off `frame.dashStarted` so it lands at the
  destination (`DASH_DURATION_MS` now exported from Player).
- **Shared kill path:** extracted `resolveKill(enemy)` out of `resolveWeaponHit`'s tail; new
  `dealSetBonusDamage(enemy, dmg)` (thorns/nova) runs takeHit → the SAME loot/scoring/heal tail, so
  set-bonus fire can kill without drifting from weapon kills. No weapon-skill XP (not a weapon hit);
  flat fire, no resist lookup this pass (noted hook if a fire-immune enemy ever ships).
- **Surfacing:** cached `activeSetIds` (recomputed in `afterItemMove` + reset in `create()`);
  `hasSet(id)`; active bonuses shown in the inventory **Combat column** (amber) via a new
  `CombatStatsView.setBonuses`; each of the 6 Ember pieces got a `Set (3): <bonus>` tooltip line so the
  set is discoverable before it's complete.
Verified live via `preview_eval`: set detection both sets, Combat-column data, knockback velocity stays
0 under Molten Bulwark, thorns 20→11 + clean kill, Emberblink 16 dmg in-radius + far enemy untouched +
kills handled, no console errors. `tsc` clean. No `RECIPES.md` change (no recipes/costs). Numbers are
first-pass/tunable. See [[survivor-rpg-biome-2-plan]].

### Biome-aware enemy respawn (2026-07-13, Sonnet)

Off the master-plan build order — a small correctness fix on the existing fog-top-up respawn
system (an open Biome-2 item, not a new mechanic). **The gap:** `MainScene.makeRespawnEnemy`
always drew from the biome-1 forest roster (Boar/Snake/RangedGremlin/MeleeGremling) regardless
of where the player stood, so a player camping in the badlands got **forest** enemies topped up
around them and the badlands roster (spawned once at world-gen) never replenished — draining
badlands food/loot over a long run.

**Fix:** `makeRespawnEnemy` now queries `worldBiomes.dominantBiomeAt(x, y)` at each chosen spawn
point (per-**point**, not per-player, so a spawn ring straddling a biome border spawns the right
roster on each side) and branches:
- **forest / base** (the universal between-blobs layer) → unchanged forest mix (Boar 24 / Snake 28 /
  RangedGremlin 22 / MeleeGremling 8 = 82). Meat sources still ~63%.
- **badlands** → the badlands mix, weighted ~ `spawnBadlandsEnemies()` counts (Duskrunner 84 /
  Cragscale 46 / Hexling 44 / Sandmaw 46 = 220). Duskrunners respawn as **lone** runners (no pack —
  a top-up, not a fresh war party); their `duskrunner_meat` is the badlands food drop, so the
  ~38% Duskrunner share keeps food renewable there the same way Boar/Snake do in the forest.
- **dunes** → returns `null` (empty placeholder biome, no roster yet); `updateRespawns` skips a
  null with `continue`, so no top-up happens out there.

Return type widened `Enemy → Enemy | null`; the only caller (`updateRespawns`) guards the null.
Elite rolls (night-boosted) + the density/cap/ring machinery are all unchanged — only the species
choice became biome-aware. **Still open (unchanged):** the *density targeting* is still
player-radius-based and biome-agnostic (fine — it's just a "how many nearby" measure), and the
dunes/deep-ring biomes remain content-less by design.

Verified live (`preview_eval`, 300 samples/biome): a forest point produced **only** the 4 forest
species (0 badlands), a badlands point (r=2220) produced **only** the 4 badlands species (0 forest),
and 50 dunes samples all returned null. `tsc --noEmit` clean, no console errors. `RECIPES.md`
unchanged (no recipe/data change); dashboard unchanged (respawn weighting isn't mirrored there).

### Biome-wide wood/stone + Ironbark axe-upgrade chain + relic-UI fixes (2026-07-13, Opus)

Off the master-plan build order — a mixed batch (two small fixes + two content adds). Locked
via `AskUserQuestion`: menus **mutually exclusive**, axe **upgrades in place**, Ironbark feeds
**Workbench Lvl 3/4 upgrades + the enhanced (T2) weapon reforges**.

- **Relic UI fixes.** (1) The Character menu (K) and the Tab combined menu are now **mutually
  exclusive** — opening one closes the other (both were depth-3000 and z-fought over the new
  Relics column). `toggleCombinedMenu()` closes `characterMenu`; the K handler closes the
  inventory/crafting menus first. (2) The relic hover tooltip in the Inventory panel now shows
  the relic's **family/class** (`relicFamilyName(group.family)` — "Damage", "Move Speed", …),
  inserted next to the rarity line.
- **Wood + stone in EVERY biome (item 3).** New `MainScene.spawnBadlandsNodes()` scatters
  badlands-themed gatherables via `pickBadlandsPoint` that drop the **same universal `wood`/`stone`
  keys** (so all recipes work anywhere): **Dead Tree** (chop→wood, 54), **Badlands Boulder**
  (mine→stone, 46), **Dry Branch** (pickup→wood, 40), **Scrap Rock** (pickup→stone, 40). New
  `badlands_deadtree`/`badlands_boulder`/`badlands_branch`/`badlands_scraprock` placeholder
  textures in `BootScene`.
- **Tool tiers, finally implemented (item 4).** The codebase reserved a tool-tier hook for a year
  ("a stone axe shows [LMB] Chop but fails on a hardwood tree; a better axe succeeds") — now live.
  New `ResourceNode.minToolTier`; `MainScene` tracks `equippedToolTier` (the equipped tool stack's
  tier, mirroring `equippedWeaponTier`); `tryInteract` bounces a too-weak tool off (shake + tint +
  a throttled event-log line, **no XP/stamina spent, prompt still shows the verb** — never reveals
  the tier). New **Ironbark tree** (`ironbark_tree`, chop→new `ironbark` resource, `minToolTier: 1`,
  34 spawned) needs the upgraded axe. **Axe upgrades IN PLACE** via a new `src/systems/ToolUpgrades.ts`
  (mirrors `WeaponUpgrades`) — **Ironshod Woodcutter's Axe** (tier 0→1, `2 Sunsteel Ingot + 6 Stone`,
  "Fells Ironbark trees"), discoverable once Sunsteel Ingot is known. Reuses the **entire** weapon-
  upgrade path with near-zero new plumbing: right-click a tool → `openWeaponUpgradeMenu` (added a
  `def?.tool` branch in InventoryMenu/HotbarUI), `ToolUpgradeDef` added to the `UpgradeMenu` union +
  the `upgradesFor` concat, and `applyWeaponUpgrade` (generic — just bumps the stack tier) handles it;
  `stationDisplayName` now checks the tool table too so an upgraded axe reads "Woodcutter's Axe Lvl 2".
- **Ironbark sinks (item 4 proposal, locked).** Ironbark feeds the **Forge Anvil** (Workbench Lvl 3,
  +5) and **Emberforge Anvil** (Lvl 4, +8) station upgrades, and the **Embersteel Warhammer** (+4)
  and **Embersteel Pike** (+3, replacing its 2 Wood) reforges — the two haft/shaft weapons ("some,
  not all": the mostly-metal Longsword and the magic Ember Brand are untouched). Because Forge Anvil
  gates all forged gear, this makes the axe upgrade a **genuine prerequisite** for the forged tier —
  intended, and thematically the hardwood reinforces the bench.
- **Deferred to their own session (the user's call, captured for follow-up):** Ember-tier uniqueness +
  **heavy/light armor set bonuses**; **ungated** upgrades for basic/T2 ore gear (no workbench gate);
  and a **QERT activated-ability** system (armor/weapon actives with cooldowns) — biome-2 keeps a
  simple passive/static special, saving QERT actives for biome 3 to avoid piling too many new
  mechanics into one biome. See [[survivor-rpg-biome-2-plan]].

Verified live (`preview_eval` + screenshots): all node types spawn (chop:wood 158→212, mine:stone→80,
34 Ironbark trees w/ minToolTier 1) and render; base axe **bounces off** Ironbark (health unchanged)
while the upgraded axe fells it in 4 swings + drops ironbark; base axe fells a badlands dead tree
(ungated); the upgrade apply path deducts `2 Sunsteel`, bumps tier, updates `equippedToolTier`; menu
mutual exclusion (Tab↔K); relic family names correct; recipe/upgrade costs updated. `tsc` clean, no
console errors. `RECIPES.md` (new Tool Upgrades section + updated station/weapon costs) + dashboard
(new Tool-upgrade table) updated.

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

### Campfire tiers + cross-biome cooking + no-ladder station upgrades (2026-07-13, Opus)

Plan: `.claude/plans/zany-whistling-flurry.md`. Off the master-plan build order — the user
wanted higher campfire tiers to cook the badlands food drops (which shipped with no recipes),
cross-biome dishes, and a cooking-menu rework. Designing it surfaced that the whole station-upgrade
model needed fixing first, so that became the foundation.

- **Station/processor upgrades are now NO-LADDER, apply = +1, level = count (the user, locked).**
  Previously each `StationUpgradeDef.resultTier` was a hardcoded destination and the shared Upgrade
  panel locked every upgrade except `resultTier === currentTier + 1` ("Requires previous tier"). Now:
  any *discovered* upgrade for a station shows immediately (any order), and applying it bumps the
  station's level by exactly **+1** — **level = count of upgrades applied**, tracked as a per-instance
  applied-id set. So a Lvl 1 Workbench carried into the badlands takes the badlands upgrade straight
  to Lvl 2 (not Lvl 3). Recipes/dishes gate on the level *count*; material-specificity comes from a
  recipe's own ingredient discovery, so "any 2 workbench upgrades → forged-gear level" is intended.
  `resultTier` is demoted to a sort hint. **Scope = stations/processors only** — worn weapon/armor
  upgrades keep their `resultTier` ladder (the shared `UpgradeMenu` branches on a new
  `appliedUpgradeIds()` dep: non-null for a placed station → no-ladder/set path, null for weapon/armor
  → old ladder). The applied-id set is a new `ItemStack.upgrades?: string[]` + `ResourceNode.upgrades`,
  threaded through `spawnLooseDrop`/`collectNode`/placement so it **survives Destroy → pickup →
  re-Place** alongside `tier` (without it, a re-placed station could re-apply the cheapest upgrade to
  max its level for free). `applyStationUpgrade` appends the id, sets `tier = set.size`;
  `sortAndStack` preserves the set (unique per instance).
- **Campfire Lvl 3/4** (`StationUpgrades.ts`): two more (non-ladder) campfire upgrades — **Sunsteel
  Grill** (`{sunsteel_ingot:3, clay:8, stone:10}`) and **Emberforge Hearth** (`{embersteel_ingot:3,
  stone:20}`), reusing the ingot economy with distinct costs. `applyTierVisual` now tints non-textured
  stations (campfire) warmer per level (Lvl2 amber → Lvl3 → Lvl4 ember) via `CAMPFIRE_TIER_TINT`.
- **5 new dishes** (`Cooking.ts`/`Items.ts`/`BootScene.ts`), HP-regen only, gentle ramp matching the
  existing "not a 2x jump" philosophy (Lvl3 ≈ +3 HP/s, Lvl4 ≈ +3.5). Design rule (the user): each level
  has a **biome-native best** dish craftable entirely from current-biome ingredients (no backtracking
  to farm) — Seared Duskrunner Steak (Lvl3), Sunscorch Feast (Lvl4), plus a meatless Emberbloom Broth —
  and **optional mixed** dishes that only spend a plentiful leftover (boar_meat) — Sunfruit-Glazed Ribs,
  Ember-Glazed Skewer. `requiredCampfireTier` (already existed) = the level count.
- **Cooking-menu rework** (`CookingMenu.ts`): the flat list is now **collapsible per-level sections,
  descending (best on top)**, sorted within a tier by total heal, in a **scrollable** viewport (fixed
  intro + fixed footer, scrollable middle). Scrolling uses **windowed rendering** — only rows/headers
  intersecting the viewport are created (off-window rows never exist, so no phantom clicks) — plus a
  geometry mask that clips the partial edge rows (mask clips rendering only, not input; both mask and
  masked objects are `scrollFactor(0)` at fixed screen coords). Its own wheel handler scrolls only when
  the pointer is over the panel; MainScene's global wheel handler gained a guard so the hotbar doesn't
  cycle while scrolling the menu. **Cookable indicators** (the user's ask): each section header shows an
  amber `● N ready` badge (recipes you can make now, even when collapsed), and a **"Show only cookable"**
  filter checkbox. `CraftingMenu` category tabs gained a matching amber dot when a category has a
  currently-craftable recipe. All amber (`#ffe08a`), never green (reserve red/green for buff deltas).
- **Verified live** (`preview_eval`, tsc clean, no console errors): no-ladder apply=+1 + count level +
  order-independence + duplicate-guard + correct offered set; weapon/armor keep the ladder
  (`appliedUpgradeIds` null); applied-set survives destroy→pickup; campfire tint distinct per level; new
  dishes visible/grouped tier-descending/heal-sorted; cook consumes correctly + eating applies a buff;
  menu scrollable (wheel-over-panel-only, collapse re-clamps scroll, mask present, filter drops
  non-cookable), panel stays fixed with camera far from origin; crafting tab-dots render. Dashboard
  station-upgrade rows dropped the misleading "Lvl N" tag (now "+1 level" + a no-ladder note); campfire
  cooking tier tag fixed for Lvl 3/4. `RECIPES.md` cooking + station-upgrade tables updated.
  (Screenshot capture was unavailable — the preview tab stayed backgrounded — so the pixel-level mask
  clip is visually unconfirmed, but per the plan the windowed render makes input correct regardless and
  the mask/objects share fixed `scrollFactor(0)` screen coords.)

> Older entries (Dev console commands, Phase 4b enhanced gear tier, Phase 4a Smelting economy, Badlands playtest batch, Biome 2
> Phase 3 The Duneshaper, Phase 3 POI 2 Sunken Forge, Phase 3 Duskrunner Warren POI, Phase 2b Sandmaw,
> 4-item playtest fix batch, Placeholder art pass, Biome 2 playtest fix batch #2, 16-item playtest fix
> batch, Biome 2 Phase 2/1/0, Welcome overlay, and earlier) are in STATUS-archive.md.
