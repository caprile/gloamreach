# Biome 3 & New-Systems Roadmap (the Bayou era)

## Context

This is a **design roadmap**, not a single implementation plan. the user brainstormed a large pile
of ideas centered on **Biome 3 — a haunted bayou** (working name **Duskmire Bayou**; purple, misty,
swampy), plus a set of **game-wide systems** much bigger than one biome: activated abilities, a
jewelry/gems material class, equipment-granted powers, game-wide epic loot, augment/reforge gear
progression, terrain that actually blocks pathing, and roguelike run-shape choices.

Narrative bridge: the **gloam** corruption from biome-2's Gloaming Vein has bled into the lowlands and
flooded them, poisoning the swamp and warping its fauna. (Gloam is the established in-world energy —
Gloaming Vein, gloam shards, Gloamwarden — and "Gloamreach" is the game's interim *title*, not this
biome's name; the biome is a bayou.)

The biome-2 (Sunscorch Badlands) umbrella is complete, so this is the next multi-session arc. This
file **sorts the pile into pillars, works the open questions, and sequences them into buildable
milestones** — each phase is one session (Opus for new mechanics, Sonnet for fixes/UI-on-existing).

Codebase research (2026-07-21) established that **most of this reuses existing scaffolding** — the
one true greenfield lift is terrain collision. Key findings are woven into each phase.

### Locked decisions (from the user)
1. **First milestone = Terrain-that-matters** (blocking terrain, retrofit into biome 2 first).
2. **Abilities cost = cooldown only** (no mana, no stamina/HP spend — gated purely by a per-ability timer).
3. **Abilities are equipment-granted** (rings / amulet / cape / special-slot items grant the actives).
4. **Roguelike layer starts with post-boss reward choice** — and it fires on **big bosses only, never minibosses**.
5. **Ability UI = Dota-2 style** — a QER slot bar: empty slots shown, filled when an ability is
   equipped; clean, readable, easy-to-see icons; crisp cooldown timer overlay; hover for description.
6. **No new base gear sets in biome 3.** The biome-2 sets (Sunsteel/Duskhide + Embersteel/Emberhide)
   are now the **core base sets**. Biome-3 progression **reforges those sets forward** + adds gem
   augments — reforge-into-a-new-item stays valid; the thing we're avoiding is authoring fresh
   base sets from scratch each biome.
7. **Biome 3 is melee-core.** Two biomes of ranged enemies is enough — the core bayou roster is
   melee. **One uncommon** ranged/haunt carries the auto-locking **homing-missile** attack; it is
   not the core.
8. **Biome-3 boss is not a caster/witch** (biome-2's Duneshaper was already a wizard). Direction: a
   **melee boss with adds**. Concepts below are brainstorm-open.

### Recommended phase order
Phase 1 (Terrain) is locked first. The rest is the recommended sequence — systems before the bayou
content drop that consumes them — but phases 2–5 are resequenceable:

1. **Terrain-that-matters** + generic environmental-zone hook *(Opus)*
2. **Abilities & gear economy** — Q/E/R equipment-granted actives + gems/jewelry + epic loot *(Opus, split 2a/2b)*
3. **Bayou gear progression** — reforge biome-2 sets forward + gem augments *(Sonnet-ish)*
4. **Biome 3 — the bayou content** *(Opus)*
5. **Post-boss RNG reward choice** *(Opus-lite; small, could be pulled forward)*

> Reminder: after each phase's plan is finalized, copy it into the repo's `.claude/plans/` and
> commit alongside the feature. Keep `RECIPES.md`, `STATUS.md`, and the dashboard Enemies tab in sync.

---

## Pillar map (how the ideas cluster)

| Pillar | Ideas it absorbs | Greenfield vs reuse |
|---|---|---|
| **A. Terrain-that-matters** | blocking terrain, structures/paths, "less flat", swamp-water-slow, HP-regen-prevention zones | **Greenfield** collision; zone effects reuse per-frame seam |
| **B. Abilities & gear economy** | Q/E/R spells (Dota-style UI), rings/amulet/cape/spec grant abilities, jewelry metals + gems, game-wide epic loot, miniboss-gated build gems | Heavy **reuse** (slots exist, relic-proc pattern, LootContainer) |
| **C. Bayou gear progression** | tiered gear that reforges/augments the biome-2 base sets forward (upgraded workbench + gems + materials); no new base sets | **Reuse** reforge recipes + right-click tier-bump upgrade |
| **D. Biome 3 — the bayou** | purple misty haunted bayou; **melee-core** corrupted fauna; moss/lily; poison DoT; one uncommon homing-missile haunt; melee boss-with-adds | **Reuse** biome-registration + enemy/boss/POI patterns |
| **E. Roguelike run-shape** | **big-boss** RNG reward choice, then start-of-run base character, then RNG dungeons | Post-boss choice reuses relic-choice UI; rest greenfield |

---

## Phase 1 — Terrain-that-matters *(FIRST, Opus)*

**Goal:** the world stops being a flat walkable plane. Add impassable terrain (rock walls, cliffs,
deep water/ravines, structures) that shapes navigation — retrofit into **biome 2** first so it
improves what exists, then it's the foundation the bayou's swamp channels build on. Also lands the
**generic environmental-zone hook** biome 3 needs (slow / no-regen).

**Current reality (research):** *zero* impassable geometry today. The only collision is (a) a
`solids` static-body group fully wired for player and enemies (`MainScene.ts:1094/1099/1130`) but
with **nothing added to it** — the `if(cfg.solid)` gate exists (`:3684/:3759`) but every scatter call
passes `solid:false`; and (b) two invisible boundary clamps (`clampPlayerToWorld`,
`MainScene.ts:3638-3647`, called each frame at `:1483`). Terrain data is purely cosmetic. Enemies use
straight-line chase, no pathfinding.

**Recommended approach — hybrid, two mechanisms:**
1. **Discrete blocking props via the existing `solids` group** (cheap — plumbing already live). Add a
   `solid:true` prop family (mesa walls, boulder ridges, ruined-wall segments; later cypress-knee
   clusters) in the scatter layer; they get real Arcade separation + wall-sliding for free, and the
   enemy↔solids collider already exists. Primary tool for "structures / paths / can't-be-crossed".
2. **Analytic blocked-zone query for large area features** (deep water, ravines). Add
   `isBlockedAt(x,y)` backed by biome coverage / a blocked-feature noise field, and resolve player
   movement with **axis-separated push-out** (store prev x/y before `Player.update`, revert per-axis
   on a blocked frame so you slide along edges). Slots in after `clampPlayerToWorld` (`:1483`).
   Enemies get the same cheap push in `updateEnemies` (or rely on solids where possible).

**Generic environmental-zone hook (build here, biome-3 consumes):** a per-frame
`updateEnvironmentZones()` after `clampPlayerToWorld` (`:1483`), inside the `!isPaused/!isDead` guard:
- **Slow:** fold a factor into `moveMult` at `MainScene.ts:1481` before it reaches `Player.update()`
  — Player code untouched.
- **No-regen:** add a zone guard to `updateComfortRegen()` (`:7669`) and gate `buffs.tick()` (`:1513`)
  so miasma suppresses all HP regen; show a "Miasma/Cursed" debuff icon in `buffBarUI` (invert the
  Resting-buff idiom at `:7670`).

**Biome-2 retrofit content:** mesa-wall / canyon / boulder-ridge structures forming corridors and
chokepoints (deeper badlands = more walls), plus a few ravines/water as analytic blocked zones with
crossable fords. Keep blocked masses **sparse and roughly convex** so straight-line chasers don't get
badly stuck (pathfinding is out of scope).

**Open sub-questions:** how aggressive is biome-2 blocking (dressing vs maze-routing)?; deep water =
blocking vs slowing+damaging (may differ biome 2 vs 3)?; enemy stuck-mitigation (accept it vs a
slide-along-normal nudge)?

**Reuse / touch:** `MainScene.ts` (`solids`, scatter `solid` gate, `clampPlayerToWorld`, update loop
`:1481-1546`, samplers), `Player.ts` (`speedMult` `:163`), `depth.ts` (`ysortDepth`),
`Biome.isCreekAt/isCreekEdge` (`Biome.ts:263-287`, the primitive to promote from cosmetic to blocking).

**Acceptance:** player is physically stopped/routed by walls & water (assert via `preview_eval` that
position doesn't cross); slow + no-regen zones measurably change `moveMult` / suppress regen; biome-1
forest gameplay unchanged.

---

## Phase 2 — Abilities & gear economy *(Opus; split 2a/2b)*

The interconnected heart of the pile: **Q/E/R active abilities (cooldown-only) sourced from equipped
gear**, fed by a new **jewelry/gems material class** and a game-wide **epic-loot** drop.

### 2a — Ability system + Dota-style UI + starter actives
- **Slots:** each equipped ability-granting item contributes one active. Recommended mapping:
  **special1 → Q, special2 → E, back(cape) → R** (three actives to start; reserve **T** for a 4th
  later). Rings/amulet carry passive bonuses (and can enhance actives) rather than their own actives
  at first. All these slots (`necklace, back, ring1, ring2, special1, special2`) already exist in
  `Equipment.ts:6-16` and auto-render in the paper-doll — no slot plumbing needed.
- **Data model:** an `AbilityDef` table mirroring the relic `RelicUnique`/`UniqueKind` pattern
  (`Relics.ts:206-219`) — `{ id, name, description, cooldownMs, iconTexture, cast(scene, ctx) }`.
  Effects reuse existing primitives: dash-blink (dash i-frame path), AoE nova (`checkPlayerHit`-style
  radial), projectile volley (`spawnProjectile`, `MainScene.ts:5256`), heal/shield burst
  (BuffManager), knockback.
- **Cost = cooldown only** (locked). Track `abilityReadyAt[slot]` on MainScene, modeled on the dash
  gate (`Player.ts:133`, `lastDashAt`) and relic cooldown fields (`guardianReadyAt` `:6636`).
- **Input:** register `keydown-Q/E/R` alongside `:1375-1393` with the standard
  `if(runOver||typingInSearch())return` guard. **Conflict: `R` is already take-all-from-chest
  (`:1382`)** — rebind take-all before claiming R. Aim from `player.getFacing()` (`Player.ts:176`) or
  mouse world point (`cameras.main.getWorldPoint`, `:5268`).
- **HUD — Dota-2 style ability bar (`src/ui/AbilityBarUI.ts`, new):** a fixed on-screen row of
  QER (+T) slots near the hotbar. Each slot shows the **empty state** (dim frame + key letter) when no
  ability is equipped, and **fills with the ability icon** when the granting item is equipped. On
  cooldown: a **radial/vertical sweep overlay** darkening the icon + a **numeric seconds countdown**
  centered on it; icon brightens/flashes ready when it clears. Icons must be **large and readable**;
  **hover shows a tooltip** with the ability name + description + cooldown (reuse the `Tooltip.ts` /
  `BuffBarUI` hover pattern). Fixed-HUD depth must clear `WORLD_H`. Add the binds to `KeybindsUI`.
- **Starter actives:** ship ~3–4 abilities on craftable/found gear so the system is exercised before
  the full gem economy exists.

### 2b — Jewelry/gems material class + epic loot
- **Gems as the ability carrier:** new materials — jewelry metals (silver/gold analog) + cut gems
  from raw gems (mined from new rare nodes and/or dropped by elites/minibosses). A "Ring/Amulet/Cape
  of X" recipe = metal + a specific gem → grants ability X. So **gem source dictates build**: the
  miniboss-gated-build idea (kill miniboss A → its guaranteed gem → craft the item that grants ability
  A) works *even before dungeons exist*, using gems as boss/elite/rare-node drops.
- **Epic loot (game-wide):** append a shared low-chance (`≤5%`) special-item pool to **every** chest
  loot table. Reuse `LootContainer` + `LootRollEntry` (`LootContainer.ts:7-12`) + the already-generic
  `openChestMenu(loot, table)` (`MainScene.ts:2867`). No quality field on `LootRollEntry`, so special
  items are **distinct item keys** (each its own `ItemDef`), sitting in spec1/spec2/back slots and
  carrying actives/uniques — rare *found* powers alongside crafted ones. Pool of ~8–15, run-varying
  via independent low rolls.
- **Effect aggregation gap (must build):** equipped non-armor items have **no stat/ability
  aggregation path today** — `syncStatBonuses` (`MainScene.ts:7138`) reads only `progression` +
  `relics`, combat reads armor only as flat defense. Add an `Equipment`-derived effect summer (passive
  stats from rings/amulet) wired into `syncStatBonuses` + combat hooks, plus the `AbilityDef` reader
  for actives. Model on how `relics.*` getters are consumed at hooks (`:6231/6196/1481/6635`).

**Open sub-questions:** exact QER→slot mapping; do rings grant actives too (→ use T) or passives only;
gem sockets vs consumed-in-recipe; number of starter abilities; epic-loot pool size; specials strictly
found vs also craftable.

**Reuse / touch:** `Equipment.ts`, `Items.ts` (jewelry/capes/specials + gems as materials),
`Relics.ts` (proc-pattern reference), `LootContainer.ts`, `openChestMenu`, `Recipes.ts` (jeweler
recipes, `requiresWorkbenchTier`), `MainScene.ts` (input, ability state, `syncStatBonuses`, HUD wiring),
new `src/systems/Abilities.ts` + `src/ui/AbilityBarUI.ts`.

---

## Phase 3 — Bayou gear progression (no new base sets) *(extends existing upgrade/reforge system)*

**Goal:** biome-3 gear does **not** introduce a fresh base armor/weapon set. The biome-2 sets are the
core base; bayou gear = **reforging those sets forward** (base piece + biome-3 materials/gems →
enhanced piece) **and** **gem augments** that add abilities/effects. Reforge-into-a-new-item is fine —
we're only avoiding authoring a brand-new base set from scratch.

**Reuse — two existing mechanisms, both stay:**
- **Reforge-forward (new item consuming the base):** the biome-2 enhanced recipes already do this —
  `Recipe.costs` is string-keyed over any item key (`Recipes.ts:32-38`), so a base piece is consumed
  as an ingredient, gated by `requiresWorkbenchTier`. Add a bayou reforge tier (Embersteel/Emberhide →
  a gloam-infused bayou tier) plus the workbench-tier bump to unlock it.
- **In-place augment (same item, mutated):** the right-click tier-bump already refines in place —
  `applyArmorUpgrade` (`MainScene.ts:7981`) / `applyGearUpgrade` (`:7999`) deduct costs and mutate
  `tier` on the same item. Extend with `WeaponUpgradeDef`/`ArmorUpgradeDef` entries whose `costs`
  include **gems/jewelry-metals**. For **mix-and-match** augments (add crit / an element / a
  socketed-gem passive) rather than a linear ladder, model on the **no-ladder station-upgrade pattern**
  (applied-ids set, `UpgradeMenu.ts:36/176`).

This is also where the previously-deferred **base/T2 ore-gear in-place upgrades** land, alongside gem
augments.

**Open sub-questions:** gems consumed one-shot vs socketed (removable)?; per-instance data model
(extend `tier` vs an applied-augment-ids set)?; how far the reforge ladder climbs in biome 3.

---

## Phase 4 — Biome 3: the bayou (working name Duskmire Bayou) *(Opus, content drop)*

> **SCOPE UPDATE 2026-07-22 (the user, locked).** Phase 4 is **sliced into four sessions**, and a
> **Dungeon mechanic** was added to the arc:
>
> - **4a — terrain, environment & surface sources. SHIPPED** (see STATUS.md B3-P4a).
> - **4b — the melee-core roster. SHIPPED** (see STATUS.md B3-P4b). All six built: Mirejaw /
>   Blighttoad / Mosswretch / Murkling / Fenlurker + the one ranged Corpselight haunt. Locked
>   with the user: the **specced 6** (no 7th apex elite), **Mirehide from the Mirejaw ONLY**, and
>   the **homing projectile built now** (`Projectile.homing`, the game's first tracking shot).
>   Also added `Enemy.pendingPoison`, 3 creature materials, 6 elite trophies at Common/Tier 3,
>   and re-enabled the bayou's respawn top-up (4a had it gated off). **A same-session tuning pass
>   rescaled the entire roster** after the user flagged it as too easy/too slow — new enemies must
>   be sized against the PLAYER's measured envelope (sprint 166-229px/s, dash 450, 220px blink,
>   45-70 per hit), never against the previous biome's roster.
> - **4c — DUNGEONS (NEXT)**: Valheim burial-chamber / sunken-crypt style interiors. **The most
>   precious materials are NOT found on the surface.** The three ability geodes and Moonsilver were
>   REMOVED from 4a's surface scatter and are now dungeon-only loot (their textures + ResourceNode
>   shapes are kept in-repo, so the dungeon phase re-sites them rather than rebuilding). Ordered
>   after 4b because a dungeon needs the bayou roster to populate it — building it first yields an
>   empty crypt. Until it ships, `moonsilver` + the 3 gems are dormant again (`__dev.give`).
> - **4d — surface POIs + the Miretyrant boss + the win-con swap.**
>
> **Locked surface/dungeon split:** SURFACE = bulk gathering + foraging under threat (wood, stone,
> **Bog Ore**, moss, lilies) — Bog Ore stays above ground on purpose so the Gloamsteel/Mirehide
> reforge tier is still reachable by exploring. DUNGEON = build-defining materials (ability gems,
> Moonsilver). **The surface's job is to feel dangerous and murky while you hunt for a way in** —
> which is why 4a shipped three themed macro-zones (miasma / bonemire / hammock) and why surface
> POIs + diverse signature areas remain explicitly wanted, not replaced by dungeons.


Depends on Phase 1 (blocking water + zone effects); richer with Phase 2 (abilities). Follows the
biome-2 content template (register biome → samplers → bespoke enemies → POIs → boss), honoring the
"no shared boss framework" + "per-enemy own numbers" + organic/uneven-density rules.

**Terrain/vibe:** new `src/systems/Bayou.ts` `bayouGroundColorAt(x,y,featureBiome)` (purple/violet
misty swamp palette; reinterpret the shared feature's `forestWeight→cypress hammocks`,
`grassy→open muck`, `creekWeight→deep gloam channels`). Register in `WorldBiomes.ts` (add to `BiomeId`
`:26`, `BIOMES` `:31-35` as a new tier, `CEILING_POINTS` unlock radius `:44-49`, a `coverageAt`+
`blendColors` line in `worldBiomeColorAt` `:248-251`), `BIOME_NAMES` (`MainScene.ts:135-137`), enemy
roster switch (`:1760-1781`), and a `pickBayouPoint` sampler cloned from `pickBadlandsPoint`
(`:3265`). Ground + minimap + world-map render automatically. Purple night-mist tint via the M-DN
overlay.

**Environmental (uses Phase-1 hook):** swamp **water slows** (moveMult zone); **miasma no-regen zones**
(gate comfort + buff regen); shallow water optionally = slow + a **poison/`Wet` DoT** tick. Consider a
new incoming-damage type **`poison`** (like existing `fire`/`magic` armor-bypass types in
`applyDamageToPlayer` `:6668`) that also suppresses regen while ticking — unifying miasma + creature
poison. (Or reuse the existing `bleed` param — open.)

**Melee-core roster (initial set — needs to grow; names/kits tunable).** Each is a bespoke subclass
with its own state machine/constants/loot + elite variant + per-species bayou trophy:
- **Mirejaw** *(alligator)* — gloam-corrupted reptile; submerged/muck **ambush lunge**, high melee
  burst (Snake/Sandmaw lineage). The signature ambusher.
- **Blighttoad** *(poison frog, made melee)* — bloated toad that **pounces + bites**, applying a poison
  DoT on contact; semi-swarm via `packAggro`. Keeps the poison theme without being ranged.
- **Mosswretch** — shambling moss-shrouded husk; slow, tanky, heavy telegraphed melee smash (the
  bruiser / Cragscale analog).
- **Murkling** — small gloam-warped sprite-beasts; **fast melee swarm**, pack-aggro (the Duskrunner analog).
- **Fenlurker** — muck-**burrowing** ambusher (Sandmaw water-analog); erupts into a melee maul.
- *(uncommon, the ONE ranged/haunt)* **Corpselight / Wispmother** — a floating swamp-haunt that fires
  **slow homing gloam-orbs** — this is the auto-locking missile. Homing = a small `Projectile`
  extension: add optional `homing?: {turnRateRadPerSec, target}` and re-aim velocity toward the target
  each `preUpdate`; keep **speed + turn-rate low** (deliberate, bounded reversal of the anti-kite
  governor). Rare, NOT core.

More creatures beyond this initial six are expected in the Phase-4 detail plan (the user wants a fuller
roster) — e.g. additional melee variants / an elite-only apex predator.

**Flora:** moss, water lily (persistent free-pickups, reuse the Blackberry `persistent/pickedTexture/
regrowMs` path) — future alchemy/food ingredients.

**Boss — melee, with adds (brainstorm-open, NOT a caster/witch):**
- Lead concept — **The Miretyrant:** a colossal gloam-gorged alligator-behemoth. Melee kit: lunging
  chomp, wide tail-sweep arc, a rising muck-slam AoE. **Adds mechanic:** periodically bellows and
  surfaces Murkling/Blighttoad adds from the water; a later phase summons more + a bigger slam. Poise/
  stagger + phase escalation on the GremlinKing/Duneshaper template.
- Alt — **The Broodmaw:** continuously spawns Murkling swarms the player must control while dodging
  melee lunges (adds-management as the core challenge).
- Default assumption: the bayou boss becomes the **new win-con**, demoting Duneshaper to a
  mid-progression big boss (which then starts granting the Phase-5 reward choice). Flagged open.

**POIs:** 1–2 bayou POIs (sunken shrine / drowned lodge) reusing the Sunken-Forge POI quartet
(`pickXPositions`/`armX`/`onXKilled`/discovery-landmark). RNG-dungeon POIs deferred to Phase 5's later
sub-phases.

**Open sub-questions:** water blocking vs slowing (by depth)?; real `poison` damage-type vs reuse
`bleed`?; confirm bayou boss = new win-con; final roster size; which enemies drop which build gems;
lock the biome's proper name.

---

## Phase 5 — Post-boss RNG reward choice *(roguelike beachhead; small)*

**Goal (locked roguelike starting point):** after a **big-boss** victory, present **3 RNG reward
options; player picks one.** Options vary per run (relic, ability unlock, stat boon, gem, special
item). High-impact, small build.

**Big bosses only (locked) — minibosses never grant it.** Use the existing big-boss distinction:
`engagedBigBoss()` / `BossBarTarget` separate big bosses (Gremlin King, Duneshaper, the bayou boss)
from minibosses (Cinderwrought, Gloamwarden, Sunken-Forge/den guardians), which stay on the small
floating bars. The **run-ending win boss** fires `endRun("won")` and grants **no** choice; every
*other* big-boss kill does — so once the bayou boss becomes the win-con, the Gremlin King and
Duneshaper big-boss kills grant the choice, the bayou-boss kill ends the run.

**Reuse:** the relic forge's `renderFamilyChoice` two-button picker (`RelicForgeMenu.ts:688-747`) —
generalize to an N-option card picker. Weighted RNG via `TROPHY_OUTCOME_ODDS`/`rollOutcomeRarity`
(`Relics.ts:122-156`). Hook into the kill tail `resolveKill` (`MainScene.ts:6141`), gated on
big-boss-and-not-run-ending.

**Later (deferred sub-phases of Pillar E, plan when reached):**
- **Start-of-run base character** — greenfield; seeds `PlayerProgression` starting stats/gear/an innate
  ability + a run-defining modifier; RNG-per-run options; choice screen at run start (reuse
  `WelcomeUI`/`RunEndUI` modal patterns).
- **RNG dungeons + build-defining miniboss drops** — extend the Sunken-Forge POI template with an
  `sessionRng()`-driven miniboss table (all Enemy subclasses share the
  `update`/`checkPlayerHit`/`rollLoot` contract) and per-miniboss guaranteed gem/material drops, so
  *which dungeon you clear* determines *which build gems you get*. Reuse `decoratePoi` + `CLEAR_RADIUS`.

---

## Cross-cutting notes

- **Model per phase:** new mechanics (1, 2, 4, greenfield parts of 5) → **Opus**; upgrade/reforge
  extension (3) and UI-on-existing → **Sonnet**.
- **One phase per session** — this file is the umbrella; each phase gets its own committed plan file.
- **Keep in sync each phase:** `RECIPES.md`, `STATUS.md` (`Current State` + `Recent Entries`, prune
  >40KB), the dashboard **Enemies tab** (manual mirror), and a biome-3 memory linking the umbrella.
- **Respect standing locks:** prompt-gating; per-enemy bespoke stats (no shared config table); no
  shared boss framework; POI-busy = add an exclusion `CLEAR_RADIUS` (not just art); organic/uneven
  density; fixed-HUD depth must clear `WORLD_H`; `scene.restart()` needs every new per-run field reset
  in `create()`.

## Verification (per phase)

Browser game — verify live, not just `tsc --noEmit`:
1. `node node_modules/typescript/bin/tsc --noEmit`.
2. `preview_start` config `"dev"` → `preview_screenshot`; `preview_resize` if the render loop is paused.
3. `preview_eval` against `window.__game.scene.getScene('MainScene')` (force player into a wall/zone and
   read position; fire an ability and read cooldown state + AbilityBarUI; roll a chest table and assert
   the special-item chance; kill a big boss and assert the choice UI opens; kill a miniboss and assert
   it does NOT).
4. `preview_console_logs` level `error`.
5. `window.__dev` console commands (god/spawn/setstat/exploremap) to reach late-game states fast.
