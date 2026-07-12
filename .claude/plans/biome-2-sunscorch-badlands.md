# Biome 2 — Sunscorch Badlands (umbrella plan + M-W1 content)

> **Umbrella plan.** Like `roguelike-metaloop-master-plan.md`, this is the shared vision +
> locked decisions + build order for the second biome. Each **Phase** below is sized to be
> its own session with its own detailed plan file (per the "one milestone per session"
> convention). Phases 0–1 are detailed enough to start building; Phases 2–5 capture locked
> decisions + insertion points and get fleshed out when picked up.
>
> **On approval, copy this file into the repo's `.claude/plans/` and commit it** (global
> `~/.claude/plans/` is not guaranteed reachable across sessions — see
> `feedback_plans_must_be_in_repo`).

## Context

The forest (biome 1) content is complete and the circular-world *geometry* already shipped
(roadmap 5v: `WORLD_RADIUS` 4000, forest in a central `BIOME_RADIUS` 2000 circle, empty
grass out to the edge — headroom deliberately left for exactly this). This is the **M-W1
content pass**: fill the outer ring with a second biome and the systems it needs. the user
wants biomes to **blend naturally** (no hard ring — earlier biomes may leak into the next),
danger scaling outward per the locked master-plan direction.

Bundled asks (from the user's notes + this session's follow-ups), all folded into the phases
below: a non-physical damage type with a real resist/weakness layer; per-weapon AOE arcs;
swarm enemies; new Gloamreach-flavored wildlife/enemies (a canid swarm, a rock reptile, a
magical gremlin variant, a native creature, arid flora); **2 unique POIs beyond the boss arena
and Gloaming Vein**; smelting/forging for an upgraded gear tier (new tools + tool-tier material
gating, a workbench level, new processor(s), new light set, new heavy set, new weapons); tier-2
trophies + tier-2 relics with an **Ember-Shard** refinement currency (fed by banked Gloam
Shards); a **relic replace-with-refund** rework; a **rebalance of the currently-overtuned
biome-1 relics**; a **bigger world sized for ~5 biomes**; a **new final boss** (badlands) that
demotes the Gremlin King into a critical-drop earlier boss. Jewelry is **discoverable but not
craftable** here (a stretch content sprinkle), not fully ruled out.

## Locked decisions (from the user, this session)

1. **Biome 2 = Arid canyon / badlands** ("Sunscorch Badlands" — working name). Red-rock
   mesas, dry scrub, cracked earth; warm palette contrasting the green forest. The world/
   setting is **Gloamreach** — lean into it for flavor (see decision 11).
2. **Natural blending, not a hard ring.** The forest→badlands boundary is noisy and
   overlapping — forest content can leak outward and badlands inward in a transition band.
3. **Phased umbrella** (this doc). Build order at the bottom.
4. **Damage types: real (light) resist/weakness layer.** Add a non-physical `magic` type
   (already present in the `DamageType` union, unused) with per-enemy resist/weak
   multipliers. Damage numbers recolor by effectiveness.
5. **Heavy armor: grind-not-mobility tradeoff.** Heavy armor does **NOT** slow you or cost
   more stamina. Its cost is that it's **grindier to craft** (more resources / higher skill
   gates / more smelting steps) and, because the roguelike score rewards *speed*, the time
   sunk into it typically means a **lower score** — a safety-vs-score playstyle choice, no
   new penalty mechanic needed. Light armor stays the fast, low-investment path.
6. **Weapon AOE = per-weapon arc stat.** Each melee weapon gets an arc width/range; wide
   sweepers (spear, new warhammer) hit several enemies, knife stays near-single-target.
   Ranged stays single-target. Pairs with the new swarm enemies.
7. **Relic tier model: higher-tier replaces same-type, with a shard REFUND (not stacking).**
   Today duplicate/same relics stack (shown "×2"). Change this: rolling a relic of a
   type/family you already own **replaces** the lower-tier instance (or is auto-declined if
   you already hold an equal/higher tier), and the displaced/redundant relic **refunds some
   Gloam Shards** (or shards of the relevant tier) instead of stacking. Kills runaway
   same-effect stacking, gives a clean upgrade path, and turns "dupes" into a resource. Exact
   family definition + refund amounts in Phase 5.
8. **Relic rebalance = trim biome-1 magnitudes.** Cut the effect %s on existing relics so
   tier-1 relics are a modest edge with headroom above them (the chosen lever; not making
   them rarer, not diminishing-returns — those stay available if trimming proves
   insufficient).
9. **Jewelry: discoverable, not yet craftable.** Don't fully rule jewelry out of this biome —
   rings/amulets may **drop or be discovered** here (populating the unused `necklace`/`ring1`/
   `ring2` slots as found gear) even though a jewelry *crafting* loop is deferred. Treat as a
   stretch/optional content sprinkle, not a core deliverable.
10. **Bosses are NOT "optional."** Drop that framing. The **badlands boss becomes the new
    win-condition final boss**, demoting the Gremlin King to an earlier boss — but the
    **Gremlin King must drop something CRITICAL to biome-2 progression** (a key crafting
    material for the new gear tier / a gate to smelting or the badlands). It's technically
    skippable, but its drop should have a **huge impact** on craftable gear, so a real run
    fights it. (This retires `gremlin_king_fang`'s dormant-trophy-only role — it or a new
    drop becomes a load-bearing material.)
11. **Worldbuilding / Gloamreach flavor.** Start adding setting flavor. Creatures should be
    **Gloamreach-specific**, not literal real animals — e.g. the "coyote" swarm is a
    gloam-touched canid with its own name/lore, not a real coyote. Give the biome, its
    creatures, materials, and POIs evocative in-world names + short lore blurbs (reuse the
    existing item `description` field + hint/event-log copy).
12. **Tier-2 refinement currency = Ember Shard, fed by Gloam Shards.** Biome 2 introduces
    **Ember Shards** as its refinement currency. Once discovered, **Gloam Shards can be
    processed into Ember Shards at some ratio** (at a processor) — which makes *banking* Gloam
    Shards across the biome-1→2 transition a real payoff. Ember Shards drive tier-2 trophy
    refinement (Phase 5).
13. **The world map must GROW for future biomes.** Plan for **at least 5 total biomes** (3+
    beyond this one). Phase 0 should enlarge `WORLD_RADIUS` substantially and lay out biome-2
    as one ring band of a much larger world, so future biomes are added data, not another
    world-size rewrite.

## Open sub-decisions (resolve when the relevant phase starts)

- Exact new `WORLD_RADIUS` + per-biome radius bands + transition-band width (Phase 0
  first-pass proposed below; must leave room for ~3 more outer biomes).
- Precise resist/weak matrix numbers and whether magic damage to the *player* bypasses flat
  armor (Phase 1 proposes it — gives magical enemies teeth + a future magic-resist-gear hook).
- Exactly which critical material the Gremlin King drops and what it gates (Phase 3/4) — the
  drop should be a load-bearing biome-2 gear/smelting material, not a nice-to-have.
- Gloam→Ember Shard conversion ratio + which processor does it (Phase 4/5).

---

## Phase 0 — World ring: badlands terrain + blended boundary (L, Opus)

The spatial foundation everything else sits in. The circular-world geometry already exists;
this adds a *second biome layer* driven by radius with noisy edges, and makes terrain,
spawning, and the map all badlands-aware.

**Grow the world for future biomes (locked decision 13).** Plan for **~5 total biomes**.
Enlarge `WORLD_RADIUS` substantially (first pass: 4000 → ~9000–10000) and define an explicit
**radius-band table** (`BIOME_BANDS`: inner forest core, forest→badlands transition,
badlands, then reserved empty bands for biomes 3–5). Keep biome 1's content radius roughly
where it is (don't rescale the forest); the growth is outward headroom. Audit everything
keyed off the old radius/size constants — `clampPlayerToWorld`, `drawWorldBoundary`, physics/
camera bounds, `ExploredMap`/`Fog` world-space grids, minimap/world-map extents, and the
region-only terrain bake (a much larger world **cannot** be one texture — bake per band/region
and mind the GPU texture-size cap). `ysortDepth`'s compression already tolerates larger Y
(depth.ts) but re-check the max. This is the load-bearing, highest-risk part of Phase 0 — do
it first and verify the existing forest still plays identically before adding badlands.

**Biome selection (the natural blend).** Do NOT try to make `Biome.ts` cover a ring. Instead
add a radius-driven **badlands weight** with organic noise, computed in one shared helper so
gameplay, terrain bake, and map all agree:
- New `badlandsWeight(x, y): 0..1` — ramps 0→1 across the forest→badlands transition band from
  the `BIOME_BANDS` table above. Perturb the radius test with a cheap value-noise/sine field so
  the boundary wobbles (±150–250px) — this is what makes forest "leak" into badlands and vice
  versa rather than a perfect circle (locked decision 2). Reuse the deterministic `sessionRng`
  seeding pattern. Design the helper to generalize to `biomeWeightAt(x, y, bandIndex)` so
  biomes 3–5 drop in as more bands, not new bespoke functions.
- Keep the existing forest `Biome` instance for the inner region unchanged. In the transition
  band both `forestWeight()` and `badlandsWeight()` can be > 0 → content from both leaks.
- Add a lightweight badlands **feature layer** (rock-cluster / dry-scrub / dry-creek zones) —
  either a second origin-aware `Biome` instance sized to the badlands square, or a smaller
  bespoke generator. Prefer reusing `Biome.ts`'s Voronoi+CA machinery with a badlands
  `ZoneType` palette to avoid new code.

**Terrain bake** (`MainScene.buildBiomeTexture()`, MainScene.ts:2365) — currently a
`BIOME_SIZE²` RenderTexture at the biome origin. Extend to also stamp badlands ground over
the ring: warm base (e.g. `0x9c6b3f` dusty clay) with `badlandsWeight`-blended rock/scrub
overlays, blended smoothly against the forest bake in the transition band. Watch the GPU
texture-size cap — the badlands ring is large; bake it as its own region texture(s) rather
than one 8000px whole-world texture (same reasoning as the region-only forest bake).

**Spawning.** The existing samplers (`pickSpawnPoint`, `pickCreekEdgePoint`,
`pickSpreadSpawnPoint`, MainScene.ts:2285+) reject points outside `BIOME_RADIUS`. Generalize
them to accept a **biome/zone predicate** so forest spawners keep sampling the inner circle
and new badlands spawners sample the ring. Add `pickBadlandsPoint(rng, ...)` mirroring
`pickSpawnPoint` but gated on `badlandsWeight > 0.5` (+ the existing camp/vein exclusion
zones). Danger scales outward: badlands enemy counts/tiers key off radius band.

**Map + fog.** `ExploredMap.terrainColorAt()` (ExploredMap.ts:35) must mirror the new bake —
sample `badlandsWeight` and blend the badlands palette so the minimap/world-map read as the
real ground. Fog reveal (`Fog.ts`) already works world-space, no change. `MinimapUI` /
`WorldMapUI` need no structural change — just the terrain color.

**Textures** (`BootScene.ts`): badlands ground tints, dead/dry tree, mesa rock, cactus, dry
scrub, cracked-earth detail — following the existing `Graphics.generateTexture` pattern.

**Critical files:** `src/systems/Biome.ts` (badlands feature layer / palette),
`src/scenes/MainScene.ts` (`badlandsWeight`, terrain bake, samplers, new constants),
`src/systems/ExploredMap.ts` (map colors), `src/systems/depth.ts` (reuse `ysortDepth` for any
new world objects — **do not use raw `y`**), `src/scenes/BootScene.ts` (textures).

**Deliverable:** walkable badlands ring with blended forest boundary, correct on the
map/minimap, empty of content (enemies/POIs land in later phases). Verify visually.

## Phase 1 — Combat systems layer: damage types, resist/weak, AOE arcs, swarm base (M/L, Opus)

The reusable mechanics biome-2 content depends on. Build before the content so enemies/weapons
can just declare data.

**Non-physical damage + resistances.**
- `magic` already exists in `DamageType` (Weapons.ts:6) — activate it. Give a future magic
  weapon (Phase 4) `magic` as its type, finally feeding the dormant `magic` weapon skill.
- Add `resistances?: Partial<Record<DamageType, number>>` to `EnemyConfig` (Enemy.ts:78),
  default multiplier 1. In the player-hit path (`resolveWeaponHit`, MainScene.ts:3704 → before
  `enemy.takeHit`), multiply damage by the enemy's resist/weak for the hit's `dmgType`.
- Recolor `spawnDamageNumber()` (MainScene.ts:3785) by effectiveness (weak = orange/red brighter,
  resisted = dimmed/blue) — the number system already exists, just add a tint arg.
- **Player-side:** magical enemy attacks deal `magic` damage that **bypasses flat armor**
  (`applyDamageToPlayer`, MainScene.ts:3879 — currently subtracts `totalPlayerDefense`
  uniformly; branch so `magic` skips or heavily reduces the flat-armor term). Makes the
  magical enemy a distinct threat and seeds a future magic-resist-gear hook. Tunable.

**Per-weapon AOE arc** (locked decision 6).
- Add `WEAPON_ARC: Record<WeaponType, { halfAngleDeg: number; range: number; falloff: number }>`
  to `Weapons.ts` (knife ≈ near-single-target; spear/warhammer wide).
- In `tryMeleeAttack()` (MainScene.ts:3588), after resolving the primary hovered target,
  gather other live enemies within `range` and within `±halfAngleDeg` of the player's facing,
  and apply arc damage (primary × `falloff`) to each via the existing `resolveWeaponHit()` (it
  already owns kill/loot/xp logic, so multi-hit reuses cleanly). Respect one crit roll per
  swing or roll per-target (recommend per-target for feel). Ranged untouched.

**Swarm base behavior.**
- Add a lightweight **pack-aggro** helper on `Enemy` (not a shared stat table — per the "own
  condition/numbers, don't generalize" rule): when a pack member aggros or is hit, nearby
  same-type members within a radius also aggro. Keep it opt-in via a flag so only swarm
  enemies use it. Individual swarm AI stays in the subclass (Phase 2).

**Critical files:** `src/systems/Weapons.ts` (arc table, activate magic), `src/entities/Enemy.ts`
(`resistances`, pack-aggro helper), `src/scenes/MainScene.ts` (resist math in `resolveWeaponHit`,
arc gather in `tryMeleeAttack`, magic-bypass in `applyDamageToPlayer`, damage-number tint).

## Phase 2 — Badlands enemies & wildlife (L, Opus)

New subclasses following the existing per-enemy precedent (own state machine + constants +
loot; reuse `Enemy` base, `tickMeleeSwing`, `playWindupTell`, telegraph→strike→recover). Each
declares `resistances` (Phase 1) and a short in-world lore blurb (locked decision 11 — give
each a Gloamreach-specific name + `description`/hint copy, not a literal real animal).

- **Gloam-touched canid swarm** (the "coyote," reflavored — e.g. **"Ashjackal"/"Gloamhound"**,
  final name TBD) — low HP, fast, short telegraph bite; uses Phase 1 pack-aggro so a pack
  converges. The AOE-arc payoff enemy. Elite variant per the M-EL2 pattern. Give it a subtle
  gloam/ember visual tell so it reads as corrupted, not mundane.
- **Rock/scale reptile** (the "lizard," reflavored — e.g. **"Cragback"/"Emberscale"**) — slow,
  armored; **resists blunt & physical, weak to pierce**. Teaches the damage-type layer.
  Basher/lunge attack.
- **Magical Gremlin variant** (e.g. "Emberling"/"Hexling") — casts a `magic` projectile
  (reuse `Projectile.ts`, `sourceIsPlayer:false`, new magic texture); **resists magic, weak to
  physical**. First enemy dealing non-physical damage to the player (Phase 1 magic-bypass).
- **1+ additional Gloamreach-native creature** for flavor (a unique badlands beast with no
  real-world analog — e.g. a burrowing ambusher or a mesa-perched glider) so the biome has an
  identity beyond "reskinned forest." Reuses the same subclass toolkit.
- **Ambient wildlife/flora** — arid harvestables (desert herb → future potion/alchemy
  ingredient, dry grass, cactus fruit) reusing the `ResourceNode` free-pickup + `persistent`/
  regrow pattern (ResourceNode.ts). Herbs are the seed of a future alchemy loop; no potion
  system now.

**Critical files:** new `src/entities/` files for each creature (Gloamreach-flavored names TBD);
`src/entities/ResourceNode.ts` (new harvestable types); `MainScene` badlands spawn methods
(reuse `pickBadlandsPoint`); `Inventory.ts`/`Items.ts`/`BootScene.ts` for new resources +
textures. Elite trophies: give badlands elites their own tier-2 species trophies (Phase 5).

## Phase 3 — Badlands boss + Gremlin King rework + two unique POIs (L, Opus)

**Exactly two NEW unique POIs — NOT counting the boss arena or the Gloaming Vein/shard
farm(s)** (locked correction). The boss arena and vein are their own landmarks; these two are
*additional* explorable content. Reuse the POI toolkit: placement + hover/prompt gating,
`MinimapUI.revealLandmark()` / `WorldMapUI` icons, the shared no-spawn **exclusion zone**
pattern (`feedback_poi_busy_not_placeholder` — enforce a clear radius in every sampler BEFORE
tuning props), and the M-DN `collectLights()` night-glow pattern. Give both POIs
Gloamreach-flavored names + lore.

- **POI 1 — canid-swarm lair** (swarm POI): a den that periodically emits packs of the Phase-2
  canid; lootable cache guarded like the Gremlin Shack. Reuses `LootContainer` + `ChestMenu`.
- **POI 2 — Ember Shrine / Sunken Forge** (mini-boss + smelting theme): a bespoke mini-boss à
  la `Gloamwarden` (lighter than the biome boss, telegraph/poise pattern, **not** a shared
  framework), guarding the ore/forge theme; ties into Phase 4 smelting.

**Badlands boss = the new win-condition final boss** (locked decision 10; bespoke AI,
`GremlinKing.ts` as reference, not a base class). Update the M-R1 win/score classifier
(`MainScene.tryAttackEnemy` kill path + `Run`/`RunEndUI`) so killing **this** boss fires
`endRun("won")`; the Gremlin King no longer ends the run. Drops a tier-2 trophy for the relic
loop (Phase 5). Large chunk — likely its own session, split from the two POIs.

**Gremlin King rework — critical biome-2 drop (locked decision 10).** The King is no longer a
win/dead-end; it must drop a **load-bearing biome-2 material** (retire/repurpose
`gremlin_king_fang`'s trophy-only role, or add a new drop). That material should **gate or
massively boost** the new gear tier — e.g. required to craft the Furnace/tier-2 workbench, or a
standout ingredient in the best forged gear. It's technically skippable, but skipping it should
visibly cost you power (defines *what* it gates jointly with Phase 4).

**Critical files:** new `src/entities/` POI + boss/mini-boss classes; `GremlinKing.ts` (loot
change); `MainScene` POI-spawn + discovery (`updateAltarDiscovery` generalization), win/score
classifier; `Run.ts`/`RunEndUI.ts`; `Items.ts`/`Recipes.ts` (King's drop + what it gates);
`BootScene` textures; `ExploredMap` landmark tints/icons.

## Phase 4 — Smelting & forging: new stations, tools, and gear tier (L, Opus)

The upgraded gear tier + the crafting infrastructure and **progression gating** behind it
(locked expansion: not just new weapons — new **tools**, a new **Workbench level**, and new
**processor(s)**, with material progress gated behind tool/skill upgrades).

- **New tools + a gating ladder.** Add upgraded tools (e.g. a **stone→copper/iron Pickaxe**
  and **Axe** tier) via the existing `ToolType`/tool-tier machinery. Badlands materials are
  **gated behind them**: hard mesa rock / ore nodes require the upgraded pickaxe (reuse the
  `ResourceNode` `toolKind()`/`requiredKind()` *kind*-gating, extended to a tier check — the
  design already anticipated tiers: "a stone axe shows Chop but fails on a hardwood tree").
  Also gate via **skill levels** (`requiredSkills[]`) and the King's critical drop (Phase 3).
- **New Workbench level (tier 2)** — a `StationUpgrades.ts` upgrade on the workbench (like
  `tool_sharpener`) that unlocks the tier-2 recipe band; the existing `requiresWorkbenchTier`
  gate (`ArmorUpgrades.ts`) already supports "needs Workbench at tier N," so higher gear can
  require the upgraded bench.
- **New processor(s)** — the **Furnace/Forge** smelting station (ore → bars) following the
  station+menu pattern (`Processing.ts` `ProcessingStation` + `DryingRackMenu.ts` + `ProgressBar`;
  recommend the instant-process + timed-bar model for consistency). The **Gloam→Ember Shard
  conversion** (locked decision 12) runs here (or on a second small processor) once Ember Shards
  are discovered, at a set ratio — rewards banking Gloam Shards across the transition.
- **New light armor set** (badlands) — higher-tier light armor via forged bars, following the
  Gremlin set's `ItemDef` (`armorSlot`/`armorType:"light_armor"`/`armorDefense`) + `Recipe` +
  `ArmorUpgrades.ts` tier pattern.
- **New heavy armor set** — `armorType:"heavy_armor"` (enum exists). **No mobility/stamina
  penalty** (locked decision 5): higher `armorDefense`, but grindier recipes (more bars, higher
  `heavy_armor` skill gate, more forge/smelt steps, likely the King's drop). Finally wire the
  dormant `heavy_armor` skill: recipe discovery gate + XP-on-kill-while-worn (mirror
  `light_armor` via `armorTypesWornPerPiece`, Items.ts). No movement math touched — the cost is
  grind→time→lower score.
- **New weapons** — forged bars → upgraded weapons incl. **wide-arc AOE weapons** (warhammer =
  wide blunt cleave via Phase 1 arc) and the first **magic weapon** (`DamageType:"magic"`,
  feeds the magic weapon skill). Reuse `WeaponUpgrades.ts` tier pattern.

**Critical files:** `src/systems/Recipes.ts`, `Items.ts`, `Inventory.ts` (ores/bars/shards/
tools/gear), `Weapons.ts` (new weapons + arcs), `ResourceNode.ts` (tool-tier gating on ore/rock),
`ArmorUpgrades.ts` / `WeaponUpgrades.ts` / `StationUpgrades.ts` (tiers + workbench-lvl-2 +
gloam→ember + gating), `Processing.ts` (smelt + convert recipes), `Skills.ts` (heavy_armor XP +
tool-tier skills), new forge station entity + menu, `BootScene` textures. **Keep `RECIPES.md`
and the balancing dashboard in sync** (per conventions).

## Phase 5 — Relics: tier-2 pool, higher-tier-replaces model, biome-1 rebalance (M, Opus)

The relic economy for biome 2 + the requested rebalance. All in `src/systems/Relics.ts` + the
forge menu.

- **Trim biome-1 magnitudes** (locked decision 8): reduce `RELIC_DEFS` effect %s so tier-1
  relics are a modest edge (e.g. Common damage +8%→~+5%, Mythic +40%→~+25%; scale the whole
  table down proportionally). Update `RECIPES.md` + dashboard Relics tab.
- **Tier-2 relics:** `POWER_TIER_MULT` already scaffolds tier 2 = 1.5× (Relics.ts:64). Biome-2
  elites drop **tier-2 trophies** (`TROPHY_ROLL` entries at `powerTier:2`); the badlands boss +
  a deeper badlands **Gloaming Vein** (tier-2, tougher warden) feed higher-rarity/tier-2 rolls.
  Extend `REFINE_RECIPES` — the `refine_uncommon → refined_trophy_rare` recipe already exists as
  scaffold; activate it driven by **Ember Shards** (locked decision 12), the tier-2 refinement
  currency (Gloam Shards are the tier-1 currency and convert into Ember at Phase 4's processor).
- **Higher-tier-replaces-same-type + shard refund, NO stacking** (locked decision 7). Today
  duplicate/same relics stack ("×2"). Change `RelicManager.roll()`'s insert step to a
  **family-based replace**:
  - Add a `RelicDef.family` tag (e.g. `"damage"`, `"move"`, `"maxhp"`, `"crit"`…) — cleaner
    than inferring "same type" from effect keys, and unambiguous for dual-stat relics (pick a
    primary family, or allow a small family set per relic).
  - On roll, if you already own a relic of that family: keep only the **higher tier**; the
    displaced/redundant one (the just-rolled dup at equal/lower tier, or the replaced lower
    tier) is **not stored** — instead **refund some Gloam/Ember Shards** (amount scaled by the
    refunded relic's rarity/tier). This removes the "×N same effect" runaway *and* makes dupes
    a shard economy rather than dead rolls.
  - Update `sumEffect()`/`groupedForDisplay()` (no more counts > 1 per family), `RelicBarUI`
    (drop the ×N badge, keep T#), and `RelicForgeMenu` result line ("replaced Warrior's Charm
    → refunded 2 Gloam Shards"). Verify the aggregate effect getters still read one instance
    per family.

**Critical files:** `src/systems/Relics.ts` (magnitudes, tier-2 trophies/refine via Ember,
`family` tag + replace/refund logic), `src/ui/RelicForgeMenu.ts` / `RelicBarUI.ts`,
`Items.ts`/`Inventory.ts` (Ember Shard), `RECIPES.md`, dashboard.

---

## Build order — proposed

Each phase = its own session + its own committed plan file. Prompt **Opus** for Phases 0–5
(all new mechanics/content); the biome-1 relic-magnitude *trim* alone could be a Sonnet
sub-task if split out.

0. **World ring** (bigger world + badlands terrain + blended boundary) — the enabler; grow
   `WORLD_RADIUS` for ~5 biomes first, verify forest unchanged, then add walkable/mapped badlands.
1. **Combat systems layer** (damage types + resist/weak, AOE arcs, swarm base) — build before
   content so enemies/weapons declare data, not logic.
2. **Enemies & wildlife** (Gloamreach-flavored canid swarm, rock reptile, magical gremlin, +1
   native creature, arid flora).
3. **Badlands boss (new final boss) + Gremlin King critical-drop rework + 2 unique POIs**
   (boss likely splits into its own session; the two POIs do NOT include the boss/vein).
4. **Smelting & forging gear tier** (furnace + gloam→ember processor, workbench lvl 2, new
   tools + tool-tier material gating, new light + heavy sets, forged/AOE/magic weapons).
5. **Relics** (biome-1 trim, tier-2 pool via Ember refinement, family-replace + shard refund).

Phases 2/4/5 lean on 0/1; 3's Gremlin-King drop + boss loot interlock with 4's gear (define
what the King's drop gates jointly). Reasonable to interleave 4 before finishing all of 3 if the
forge mini-boss POI motivates smelting first.

## Verification (per phase)

Standard project loop (`CLAUDE.md` "Verification workflow"):
1. `node node_modules/typescript/bin/tsc --noEmit` — cheap first check.
2. `preview_start` ("dev") → `preview_screenshot`; if the loop looks paused, `preview_resize`
   first (known quirk).
3. `preview_eval` against `window.__game.scene.getScene('MainScene')` for precise assertions,
   e.g.:
   - **Phase 0:** teleport the player into the ring, confirm badlands terrain renders + the
     boundary blends; check `badlandsWeight` at sample points; confirm minimap/world-map colors
     match; confirm no forest content spawns in the deep ring and no badlands content in the core.
   - **Phase 1:** call an attack against enemies with declared `resistances`, assert the applied
     damage reflects the multiplier and the damage-number tint; place 3 enemies in an arc and
     confirm a wide weapon hits multiple; confirm a `magic` player-hit bypasses flat armor.
   - **Phase 2:** aggro one coyote, confirm the pack converges; hit a rock lizard with
     blunt vs pierce and compare damage; take a magic-gremlin bolt in heavy armor and confirm it
     still hurts.
   - **Phase 3–5:** POI discovery landmarks appear; boss win fires `endRun("won")`; forge
     smelts ore→bar and crafts the new sets; a tier-2 relic replaces its tier-1 same-family
     counterpart; verify trimmed magnitudes via the dashboard.
4. `preview_console_logs` (level error) for runtime errors.

## Conventions to honor as each phase ships

- Update `RECIPES.md`, `STATUS.md` (Current State + Recent Entry), the balancing dashboard
  (`dashboard.html` — Enemies tab is a manual mirror), and `CLAUDE.md`'s roadmap.
- New Y-sorting world objects use `ysortDepth` (not raw `y`); new fixed-HUD elements clear
  `WORLD_H` depth.
- Each POI enforces its no-spawn exclusion zone in every sampler *before* prop tuning.
- Commit this umbrella + each phase plan into the repo's `.claude/plans/`.
