# Plan: First-biome content pass — procedural biome, enemy roster, dodge, workbench

## Context

Roadmap items 1–4 are shipped (crafting/inventory, loose drops+magnet, stamina/sprint/dash,
Combat foundation). Combat currently ships with exactly one bite-only enemy (Boar), no ranged
system, no zone/terrain variety, and a `dash` that's a movement burst with no dodge feel. This
batch builds out the **first biome's content** — the deferred work called out in `CLAUDE.md`'s
"First biome — content notes" and `STATUS.md`'s "Explicitly deferred" list — turning the flat
proof-of-concept world into a generated biome with three sub-areas and a real enemy roster.

Confirmed with the user before planning:
- **Biome is fully procedural** — zone boundaries randomly generated each session (not fixed
  regions with randomized contents).
- **World grows to ~2560×1920** (2× each dimension) so zones read as distinct.
- **Creek is visual-only + walkable this pass** (no collision), but architected so a future
  "Wet" status debuff can cheaply query "am I on a creek cell."
- **Dash → dodge bundles i-frames now** (not phased) — reuse the existing `invulnerableUntil`
  mechanism.

This is large — split into **7 milestones, one chat session each** per project convention.
Sequencing and dependencies are summarized at the bottom. Numbers below (radii, counts,
costs, pass counts) are **starting values to tune via `preview_eval`/`preview_screenshot`**,
not final balance.

**Key architectural finding:** there is *no* zone/region concept in the codebase today —
`spawnNodes()`/`spawnEnemies()` do uniform-random scatter over one stretched grass
`TileSprite`. Milestone A is genuinely new architecture; everything enemy-related depends on it.

---

## Milestone A — World resize + procedural biome generation (FOUNDATION)

**Goal:** 2560×1920 world partitioned at session start into Forest / Grassy-open zones with
organic edges, plus an overlaid winding Creek, queryable per-cell, rendered without per-tile
GameObjects.

### New file: `src/systems/Biome.ts`
Engine-light (like `Stamina.ts`), only touches `Phaser.Math.RandomDataGenerator`.

- **Zone grid:** coarse **40px cells** (independent of `TILE=32`; pure lookup grid). 2560×1920
  → 64×48 = 3072 cells, materialized as flat arrays.
- **Algorithm (implement directly):**
  1. **Voronoi base zones:** RNG-pick `N = rng.between(6,10)` seed points, each coin-flipped
     `forest`/`grassy`. Each cell → nearest seed's type (squared distance, ~24k checks, no k-d
     tree). Store `ZoneType[]`.
  2. **Cellular-automaton smoothing (3–5 passes):** each cell flips to its Moore-neighborhood
     majority type when ≥5/8 neighbors disagree. **Double-buffer** (read `grid`, write
     `nextGrid`, swap). Produces blobby organic edges. Pass count eyeball-tuned via screenshot.
  3. **Creek carve (separate pass, overlays on top):** random-walk from a random edge cell
     toward the opposite edge — 70% continue heading, 30% turn ±1 laterally (winding but
     progressing). Mark each visited cell + a tapering `rng.between(1,3)`-cell radius into a
     **separate `boolean[] creekGrid`** (a cell can be `forest` AND `creek`). One creek this
     pass; loop N times later trivially.
  4. **Query API:** `zoneAt(x,y): ZoneType`, `isCreekAt(x,y): boolean` (single flat-array
     bounds-checked lookup — this *is* the cheap primitive the future Wet debuff needs; don't
     route creek data through anything heavier). Internal `worldToCell(x,y)` clamped to bounds.
- **Degenerate-layout guard:** if either zone type covers <10% of cells, re-roll the whole grid
  (cap 3 retries) — prevents an all-one-biome session.

### Rendering (avoid one GameObject per tile)
One-time bake into a **single `RenderTexture`** sized to the world, depth below entities, drawn
once in `create()`, never touched per-frame:
- Fill forest cells with a darker-green overlay; **skip grassy cells** so the existing grass
  `TileSprite` shows through as the "grassy" look; draw creek cells last as semi-transparent
  blue on top of whatever zone they overlay.
- Use flat per-cell fills (not soft blobs) so the visual is WYSIWYG with the gameplay grid —
  avoids art/logic mismatch where the ground looks like one zone but `zoneAt()` says another.
- Individual trees/rocks/enemies stay sprite-per-object (dozens, not thousands) — unchanged.

**Follow-up note — REVISED 2026-07-07** (see `STATUS.md`'s "16:9 resolution, smoothed
biome borders, crafting-menu inventory count" entry): the "flat per-cell fills, WYSIWYG
with the gameplay grid" decision above was reversed after a playtest complaint that zone
boundaries read as big jagged 40px staircases ("angular drops"). `Biome.ts` gained
bilinear `forestWeight(x,y)`/`creekWeight(x,y)` queries (interpolating the same
underlying zone/creek grids, values anchored at cell centers), and
`MainScene.buildBiomeTexture()` now supersamples the bake at an 8px stride, blending each
overlay's alpha continuously by the interpolated weight instead of a hard on/off fill per
cell. Boundaries now render as a soft multi-cell gradient band that reads as a rounded
line. **Gameplay queries are unchanged** — `zoneAt()`/`isCreekAt()` stay hard-edged
per-cell lookups for spawning logic; only the render bake got smoothed, so there's no
render/logic mismatch beyond "the edge visually blurs over ~1 cell before the hard
gameplay boundary." `forEachCell()` (no longer used by anything once the bake stopped
iterating cells directly) was deleted rather than left dead.

### Existing files touched
- **`src/scenes/MainScene.ts`:** `WORLD_W`→`TILE*80` (2560), `WORLD_H`→`TILE*60` (1920) (~L39–41).
  New `private biome!: Biome;` built in `create()` *before* `spawnNodes()`/`spawnEnemies()`. New
  `buildBiomeTexture()` called once in `create()`.
- **`spawnNodes()` / `spawnEnemies()`:** add zone-aware placement *plumbing* here (specific
  per-zone density numbers land in B/C/D to avoid re-touching twice). Use **rejection sampling**:
  redraw random `x,y` until `biome.zoneAt(x,y)` matches the wanted type, cap ~200 attempts with a
  graceful fallback to the last draw (no infinite loop if a zone is tiny).

### Seeded-RNG convention change
All three RNG streams become **session-random** (time-based seed, e.g. `[Date.now().toString()]`),
kept as three *separate* `RandomDataGenerator` instances:
- **Biome layout** must be random each session — that's the whole point of "procedural."
- **Node-scatter / enemy-scatter** (`"explore-and-gather"`, `"boar-country"`): also go random.
  Rationale: once biome layout is random, a fixed content seed no longer reproduces a coherent
  *experience* anyway, so the reproducibility benefit is already gone. Nothing in requirements
  needs debug-reproducible seeds.

### Risk
- CA pass count + Voronoi seed count are eyeball-tuned — budget screenshot iteration time.
- Test several forced seeds via `preview_eval`, assert both zone coverage ratios before "done."

---

## Milestone B — Boar tuning for the new world (depends on A) — DONE (2026-07-07)

**Goal:** Retune Boar per `STATUS.md`'s "too aggressive" flag, for the 2× world + forest density.

- **`src/entities/Enemy.ts`** (Boar-specific literals — do NOT generalize into a shared table,
  per the standing user decision): `AGGRO_RADIUS` 140→~100–110 (smaller, not larger — the
  complaint was aggression, not size); `DEAGGRO_RADIUS` keep ~2× aggro for the hysteresis gap
  (e.g. 110/180).
- **`spawnEnemies()`:** clear zone around player spawn 150→~220–250 (keep it ~2× aggro radius —
  the ratio is what was broken). Boar count: world area is now **4×** (both dims doubled); same
  density would be ~24 (too many). Use ~**10–14 total, weighted ~80% forest / ~20% grassy** via
  `biome.zoneAt` rejection sampling (matches "Boar common in Forest, rare in grassy").
- Fill in the Boar-specific half of the density plumbing stubbed in A. Small/mechanical
  milestone; could tail-end A's session if budget allows.

**Follow-up note — RESOLVED 2026-07-07** (see `STATUS.md`'s "Trees/boulders no longer
solid..." entry and the session plan `.claude/plans/review-the-plan-and-witty-cloud.md`):
the obstacle-avoidance heuristic added to `Enemy.ts`'s chase logic (ground-truth stuck
detection + randomized near-tangent escape headings + a persistent per-instance escape
side — see STATUS.md's "stuck between multiple trees" entries and
[[feedback_enemy_obstacle_avoidance]]) worked, but the user considered the resulting
movement **"kind of trash"** — zigzagging rather than a clean path around an obstacle.
The **"walk through trees" direction was chosen** over improving the heuristic further:
trees and boulders are now non-solid (`solid: false`) for *both* the player and enemies
(applies to boulders too, not just trees), and the old escape-heading mechanism was
deleted from `Enemy.ts` outright rather than left inert. Bundled in the same pass so
removing collision didn't also remove the visual "walking behind a tree" read: real
Y-depth sorting (player/enemy/tree depth all track Y position, replacing the old fixed
depths) plus a Stardew-style occlusion fade (the tree/boulder fades to partial alpha, not
the player, when it would otherwise render in front of them). The `solids` physics group
stays wired up empty, reserved for future structures/walls/mountains that should still
block movement. Line-of-sight-gated aggro was raised in the same discussion but scoped
out: the user's rule is "only things you can't move through block line of sight," so
non-solid trees/boulders don't need to gate LOS either — this activates automatically
once a future *solid* obstacle exists. See [[survivor-rpg-non-solid-trees-y-sort]] for
the full design record.

Milestone B's original scope above (retuning `AGGRO_RADIUS`/`DEAGGRO_RADIUS`/Boar counts
for the "too aggressive" complaint) is now **also done** (2026-07-07): `AGGRO_RADIUS`
140→105, `DEAGGRO_RADIUS` 280→190, Boar count 8→12 split 80% forest/20% grassy, spawn
clear radius 200→220. See `STATUS.md`'s "Boar tuning for the 2x world" entry for full
detail/verification. Milestone B is fully closed — both halves (movement + numeric
tuning) are done.

---

## Milestone C — Projectile system + Gremlin (depends on A; recommended after B) — SHIPPED (2026-07-07)

**Goal:** Build the game's **first projectile system** (reusable later for the Slingshot) and
ship Gremlin.

### New file: `src/entities/Projectile.ts`
Generic reusable Arcade sprite (NOT Gremlin-specific):
- `ProjectileConfig { x, y, angle, speed, damage, texture, maxRangePx, sourceIsPlayer }`.
- Constructor sets body velocity from angle; records spawn point; `preUpdate` self-destroys once
  traveled distance ≥ `maxRangePx` (distance-based despawn, **not** a fixed timer — speed varies
  per weapon). Straight-line only, no homing this pass.

### Collision wiring (new — `MainScene.ts`)
- `enemyProjectiles` (and an unused-for-now `playerProjectiles`) Arcade groups created in
  `create()`. `physics.add.overlap(enemyProjectiles, player, …)` → callback calls the existing
  `applyDamageToPlayer(dmg)` (reuses the i-frame-respecting entry point ~L672) then destroys the
  projectile.
- `spawnProjectile(cfg): Projectile` helper on `MainScene` adds to the correct group by
  `sourceIsPlayer` — so the future Slingshot calls the same helper, not a Gremlin-private path.

### New file: `src/entities/Gremlin.ts`
**Subclass `Enemy`** to inherit HP-bar / tint / death-fade *rendering* (shared utility, not a
stats table), but **override `update()`** with a genuinely different state machine:
`idle | kiting | throwing | meleeing`.
- Own aggro radius (~160, larger — ranged notices earlier), own `PREFERRED_RANGE` (~120).
- **Kiting:** closer than preferred → move *away* from player; between preferred and aggro →
  hold and throw rocks on cooldown (~1800–2200ms) via `scene.spawnProjectile(...)` aimed at
  player's current position (no leading).
- **Melee fallback:** player closes to ~24px → `meleeing`, claw (higher DPS than the throw,
  punishing the close).

**Two gremlin variants — added 2026-07-07, before this milestone is built:**
- **Ranged Gremlin (stronger)** — the `idle | kiting | throwing | meleeing` state machine
  above, full ranged+melee kit as originally designed. On death drops **both** 1 **Gremlin
  Skin** (new `gremlin_skin` resource, drying-rack input — see Milestone H) **and** 1
  **Gremlin Blood**.
- **Melee Gremlin (weaker)** — a simpler variant, melee-only (no `kiting`/`throwing`
  states, no projectile spawns) — closer to Boar's chase/bite shape than the ranged
  variant's kiting AI, but still its own tuned numbers per the standing "own condition, own
  numbers" rule, not a Boar copy. Drops **1 Gremlin Blood only** (no skin) — skin is
  exclusively a ranged-Gremlin drop, since the drying rack's `gremlin_skin → gremlin_leather`
  output feeds gremlin leather armor (Milestone H) and shouldn't be trivially farmable from
  the weak variant.
- Both variants likely share a common base (e.g. `GremlinBase extends Enemy` holding the
  loot-drop-on-death plumbing) with the ranged-only state machine living in a subclass —
  exact split TBD at implementation time; don't over-design this ahead of writing the code.

### Existing files touched
- Wherever `ResourceType` lives (likely `src/systems/Inventory.ts` — verify): add
  `gremlin_blood` and `gremlin_skin` (new, ranged-Gremlin-only drop feeding Milestone H's
  drying rack).
- **`spawnEnemies()`:** Gremlin weighted toward **grassy** with occasional forest. Spawn mix
  between the two variants (e.g. melee more common, ranged rarer/stronger) is a tuning call
  for implementation time, not locked here.
- **`tryAttackEnemy()` / enemy update loop:** verify hit application is generic (`.takeHit()` on
  the hovered target), not hardcoded to `Enemy`. **Likely small refactor:** `Enemy.update()`
  today returns a bare `boolean` ("bite landed"); to express "threw a projectile" / "no event",
  widen the return to a small discriminated union (`{type:"none"} | {type:"melee",damage} |
  {type:"projectile",cfg}`). Flag as expected in this milestone, not a blocker.

---

## Milestone D — Snake (depends on A; independent of B/C) — SHIPPED (2026-07-07)

**Goal:** First hidden/ambush enemy — structurally different from Boar and Gremlin.

**Why prioritized (2026-07-07):** Stone Pickaxe and Stone Club (`src/systems/Recipes.ts`)
were changed to require `leather` again (user decision — leather-gating is intentional,
not a bug), but `leather` has **zero drop sources** anywhere in the game right now.
Discovery for those two recipes is correctly gated so they don't show up as
"permanently stuck" (see Milestone G's follow-up: tier 1+ recipes are hidden entirely
until a Workbench is placed, separate from ingredient discovery) — but they still can't
ever be *finished* discovering without a leather source. Snake is that source (see
below — drops 1 `leather` on death), so it jumps ahead of B/C in practical priority even
though the plan's original ordering had no hard dependency forcing this. Still start it
in its own fresh session per project convention.

### New file: `src/entities/Snake.ts`
Subclass `Enemy` for rendering reuse; override `update()` with `hidden | striking | fleeing | idle`.
- **Hidden** is the core new mechanic: rest motionless at low alpha (~0.35) reusing the existing
  placeholder texture — reads as "in the grass" without new art.
- **Ambush trigger:** *tight* radius (~40–50px, vs Boar's 140) — a genuinely different *condition*
  (radius crossed → one immediate strike attempt, not a sustained chase), which is exactly the
  "different condition, not just different number" the standing decision calls for.
- **Strike → flee → re-hide** (hit-and-retreat), can ambush again after a cooldown (~3–4s).
- Own numbers (do NOT copy Boar): low dmg (~4–5), low HP (~10–12).
- Drops **1 leather** on death. **Naming resolution:** reuse the existing `leather` key (Stone
  Club already consumes it) — do NOT add a duplicate `leather_scrap` type. Note this explicitly
  in-session so it isn't relitigated. **Display name resolved 2026-07-07 to "Leather Scraps"**
  (`Items.ts` `name` field only — the `ResourceType`/item key stays `leather`).

**Playtest follow-ups (same day, 2026-07-07), after initial ship:**
- Bite damage 5 → 20 (kept HP low at 11 — high-risk low-HP glass cannon, not low damage).
- Enemy HP bars now only render while aggro'd, not at rest — new `Enemy.isAggro()`
  (protected, default `state === "chasing"`), overridden in `Snake` as `mode !== "hidden"`.
  Applies to Boar too (bar was previously always visible).
- **Deaggro while chasing** — it never gave up if it just never landed a hit. Added own
  condition (own numbers, not Boar's 30s/280px): `CHASE_GIVEUP_MS` (4000) and
  `CHASE_GIVEUP_RADIUS` (150px), checked every frame in `striking`.
- **`takeHit()` branches on whether it's already bitten the player this engagement**
  (new `hasBitten` field): hasn't bitten yet → reveal + fight back (`striking`) instead of
  fleeing; already bitten → flee a few seconds (`RETALIATION_FLEE_MS`, 2500) then want to
  strike again (`reengageAfterFlee`), rather than fully disengaging. Uninterrupted
  bite → flee → re-hide loop unchanged.
- Workbench recipe moved `category: "build"` → `"crafting"`; Campfire moved
  `"build"` → new `"misc"` category. `RecipeCategory`'s `"build"` value removed entirely;
  `CraftingMenu.ts`'s tab list now Tools/Weapons/Armor/Crafting/Misc.

### Existing files touched
- **`spawnEnemies()`:** Snake weighted toward **grassy**; keep a clear zone around player spawn.

> D has no functional dependency on B or C. Recommend sequential C-then-D (or D-then-C), **not**
> simultaneous sessions, only because both hand-edit `spawnEnemies()`.

---

## Milestone E — Dash → dodge + i-frames (fully independent) — DONE (2026-07-07)

**Goal:** Snappier dodge feel + brief invulnerability, reusing the existing `invulnerableUntil`.

- **`src/entities/Player.ts`:** `DASH_SPEED` 340→~420–480 (sharper burst), `DASH_DURATION_MS`
  160→~100–110 (a snap, not a glide). Net displacement stays comparable (~47–54px); the *feel*
  change is the sharper velocity spike + quick end. Leave `DASH_COOLDOWN_MS` (600) unless
  back-to-back dodging feels spammy in testing.
- **`src/scenes/MainScene.ts`:** at the dash-start site (where `DASH_STAMINA_COST` is spent, ~L245–252),
  set `this.invulnerableUntil = this.time.now + DASH_IFRAME_MS`. `PlayerFrameResult` already
  reports `dashStarted` back to MainScene (per STATUS.md) — drive the i-frame off that. New
  `DASH_IFRAME_MS` ~150 (slightly longer than dash duration so invuln outlasts the visible burst,
  covering "clipped as I stopped"; the 600ms cooldown still prevents dodge-spam safety). The
  existing `if (now < invulnerableUntil) return;` guard in `applyDamageToPlayer()` (~L672) needs
  **zero changes** — it's already generic to any code setting the field. Do NOT reuse the 1500ms
  respawn value — same field/mechanism, different constant.

Most self-contained milestone; safe any time.

---

## Milestone F — Player attack-range indicator (fully independent) — DONE (2026-07-07)

**Goal:** Subtle ring showing current reach, consistent with "don't show more than necessary."

- **When shown:** only when a **weapon or tool is equipped** (unarmed → no range to communicate,
  so an empty Graphics draws nothing). Do **not** further gate on "near a target" — that would
  flicker during approach, defeating a *range preview*. Equipped-gated, not target-gated.
- **Rendering:** `attackRangeRing: Phaser.GameObjects.Graphics` on `MainScene`, created in
  `create()` (depth just above ground / below entities). Each frame (grouped with the existing
  `syncEquippedIconPosition()` call): `clear()`; if nothing equipped, `return` (empty = invisible,
  cheapest hide); else `lineStyle(1.5, 0xffffff, 0.25).strokeCircle(player.x, player.y, REACH)`.
- **Radius = `REACH` (64)** for any equipped tool/weapon — all melee currently uses flat `REACH`,
  there's no per-weapon range table. Don't invent one just for the ring; if per-weapon range is
  added later, the ring reads whatever that exposes.
- Start inline in `MainScene` (~10 lines); promote to `src/ui/AttackRangeRing.ts` only if it grows.

---

## Milestone G — Workbench (fully independent) — DONE

**Goal:** Placeable Workbench via the existing campfire placement flow; gate `tier >= 1` recipes
on proximity to any placed workbench, with non-silent feedback.

- **`src/systems/Items.ts`:** new `workbench` `ItemDef` mirroring campfire (`placeable: true`,
  `hotbarable: false`); new placeholder texture in `BootScene.ts` (same `generateTexture` pattern —
  e.g. a brown table silhouette).
- **`src/systems/Recipes.ts`:** new `workbench` recipe (`tier: 0` — no bench needed to build the
  bench), cost ~`{wood:6, stone:4}` (tunable). Retarget `stone_pickaxe` and `stone_club` `tier:
  0`→`tier: 1`. **Defer** their cost-split changes (CLAUDE.md flags those as open/TBD) — scope
  here is "retarget tier," not "rebalance costs."
- **`src/scenes/MainScene.ts`:** tag placed objects with `image.setData("itemKey", outputKey(recipe))`
  in `attemptPlaceObject()` (Phaser-idiomatic, smallest diff — no need to restructure the
  `placedObjects` array type). New `isNearWorkbench(x,y,radius): boolean` filtering `placedObjects`
  by `getData("itemKey")==="workbench"` + distance. `WORKBENCH_RANGE` ~96–100 (looser than
  `REACH` — it's "am I near it," not a precise click). Expose via `CraftingMenu`'s existing `deps`
  bag as `deps.isNearWorkbench`.
- **`src/systems/Crafting.ts`:** keep `canAfford` pure resource-math (it's scene-independent and
  testable). Compose the workbench check at the call site, not inside `canAfford`.
- **`src/ui/CraftingMenu.ts`:** recipe-row + detail-panel `affordable` becomes
  `canAfford(...) && (recipe.tier === 0 || deps.isNearWorkbench())` — inherits all existing
  color/grey/button-clickability logic for free. **Non-silent feedback:** when `tier >= 1 &&
  !isNearWorkbench()` specifically, render a detail-panel line "Requires a nearby Workbench" in a
  warning amber (distinct from the red "can't afford" color). Never says "tier 1" or a px number —
  says "needs a workbench," consistent with the gating philosophy.

---

## Milestone H — Harvestables + Drying Rack (processing stations) — SHIPPED (2026-07-07)

**Shipped notes:** built on Opus per the guidance below. New `src/systems/Processing.ts`
(`ProcessingStation` + `PROCESS_RECIPES`: `cattail→twine` 2:1 @ 3s/unit,
`gremlin_skin→gremlin_leather` 1:1 @ 4s/unit — durations were a first-pass tuning call) and
`src/ui/DryingRackMenu.ts` (backpack-alongside with non-input dimming, drag/right-click
quick-load into the input slot, live output preview, progress bar, Collect button). Cattail
spawns on creek borders via new `Biome.isCreekEdge` + `MainScene.pickCreekEdgePoint`;
Blackberry bushes in forest (free pickup, no eating mechanic yet). Drying Rack is a tier-0
placeable (8 wood + 1 leather) reusing the campfire/workbench placement flow; each placed
rack has its own station, ticked every frame in `MainScene.updateProcessing()` (real-time,
continues while the menu is closed / during death freeze). Added `gremlin_leather_armor`
(tier-1 armor recipe, 2 gremlin_leather + 2 twine) as a sink for the outputs — not yet
wearable. Slingshot's twine ingredient remains a noted downstream hook. See `STATUS.md` for
the full entry + verification. **With this, the whole A–H first-biome plan is done.**

**Original plan (below) — added 2026-07-07:**

**Goal:** two new gatherable resources tied to specific terrain/flora, and the game's
**first "processing station" concept** — a crafting table that isn't "spend resources, get
item instantly" (Workbench/Campfire) but instead "load raw items in, wait, get a different
item out." This is new architecture, not a reskin of the existing recipe/craft flow — **use
Opus for this milestone** (mirrors the Milestone A/C "net-new architecture → Opus" guidance
above), not Sonnet.

### New harvestables
- **Cattail** — a gatherable flora, found **only at the border of creek cells**
  (`biome.isCreekAt`-adjacent, not creek-interior or generic grassy/forest — a new spawn
  constraint distinct from anything `pickSpawnPoint` currently supports; likely needs a
  new "near creek edge" predicate rather than reusing `avoidCreek`). Free pickup (no tool),
  same interaction model as branches/rocks. Feeds the Drying Rack (below) as its raw input
  for **twine**.
- **Blackberries** — a food item, found as **bushes in the wooded (forest) areas** — a new
  gatherable flora type, harvested the same way (free pickup). **The food/consumable
  concept doesn't exist in the game yet** (Shishkabob/cooked-meat is still on the roadmap
  per `CLAUDE.md`'s cooking notes) — Blackberries are a raw pickup now; what "eating" one
  actually does (heal? buff? stamina/food-pool interaction?) is undesigned and out of scope
  until the food system itself is built. Don't invent an eating mechanic just to give this
  milestone an end-to-end payoff — it's fine for Blackberries to sit in inventory unused
  until food lands.

### New file: `src/systems/Processing.ts` (or similar — new architectural concept)
Distinct from `src/systems/Crafting.ts`'s instant recipe-craft model:
- A **processing station** (Drying Rack first, but architect for reuse — e.g. a future
  Campfire-cooking flow could plausibly share this rather than being bespoke) has its own
  **input slot(s)**, a **process definition** (`input item → output item`, plus a **process
  duration**), and **runs over time** rather than resolving on click like `Crafting.craftRecipe()`
  does today.
- **New UI surface needed**: unlike the Workbench (which just gates an existing recipe by
  proximity, no new UI), the Drying Rack needs **its own menu for loading items in** — a
  new `src/ui/` panel, opened by interacting with a placed Drying Rack (mirrors how
  `CraftingMenu` opens, but shows the rack's own input/output/progress instead of the
  global recipe list).

  **Interaction flow — locked in 2026-07-07 (user spec):**
  1. Walk up to the processing station (Drying Rack), interact with it (same hover/reach
     prompt model as everything else — `[LMB] Use`/similar, gated on being in range).
  2. Interacting opens the station's **own processing menu side-by-side with the player's
     inventory** — the inventory is shown *alongside* the process panel, not hidden behind
     it, since the whole interaction is dragging from one into the other.
  3. **Item dimming**: while the menu is open, only inventory items that are a valid input
     for *this* station light up at full brightness; every other item is faded/dulled out
     (a visual affordance, not a hard block — mirrors the existing "grey out unaffordable"
     pattern in `CraftingMenu`, but keyed off "is this a valid input" rather than "can I
     afford this").
  4. **Drag-and-drop**: the player drags a valid (lit) item from inventory into the
     station's input box/slot. This is the **first drag-and-drop interaction in the
     game** — everything so far (hotbar equip, crafting) has been click-based. Flag this
     explicitly at implementation time; it's new interaction plumbing, not a reuse of an
     existing pattern.
  5. **Live output preview**: as soon as a valid item (or stack) is dragged into the input
     box, a **preview box directly underneath it** shows what the output will be *and its
     count*, computed from the item's conversion ratio — before the player commits/confirms
     anything. E.g. dragging in a stack of 10 Cattail (2:1 ratio) previews "5 Twine";
     dragging in Gremlin Skin (1:1 ratio) previews a 1:1 count of Gremlin Leather.
  6. Multiple input slots may exist per station (exact count TBD at implementation time —
     start with the single-slot case described above and only add more if the design needs
     it); process **runs over time** per the process duration, not instantly on drop.
- **Recipes for this pass (ratios locked in 2026-07-07):**
  - `cattail → twine`, **2:1** (2 Cattail → 1 Twine) — e.g. 10 Cattail previews/produces 5
    Twine.
  - `gremlin_skin → gremlin_leather`, **1:1** — **only the ranged Gremlin variant**
    (Milestone C, above) drops `gremlin_skin`, so this output is gated behind that enemy
    existing and being killable, same "leather-gates-recipes" precedent Snake set for
    `leather`/Stone Pickaxe.
- **Placement**: Drying Rack is a new placeable, following the existing
  Campfire/Workbench placement-mode flow (`attemptPlaceObject`, `image.setData("itemKey",
  ...)` tagging) — no new placement architecture needed there, only the processing/menu
  layer above is new.

### Downstream recipe hooks (not built this milestone, just noted so they aren't lost)
- **Twine** is used in the **Slingshot** recipe (`CLAUDE.md` currently lists Slingshot as
  `2 wood + 2 leather`, workbench-gated — this adds `twine` as a further ingredient/gate
  once Milestone H ships; exact split TBD).
- **Twine + Gremlin Leather** craft **Gremlin Leather Armor** — a new armor recipe (the
  `"armor"` crafting-menu tab already exists per `STATUS.md`'s tab-reorg entry, so this
  slots into an existing tab, not a new one).

### Existing files touched
- `ResourceType` gains `cattail`, `blackberry`, `twine`, `gremlin_leather` (and
  `gremlin_skin` from Milestone C, if not already added there).
- `src/systems/Items.ts` / `Recipes.ts`: new `drying_rack` placeable recipe (tier TBD — likely
  `tier: 0` like Campfire/Workbench, since it's a *type* of gate, not a *tier* gate), new
  `gremlin_leather_armor` recipe once twine/gremlin_leather exist.
- `spawnNodes()` / biome query layer: new creek-adjacent spawn predicate for Cattail; new
  forest-bush spawn for Blackberries.

### Open questions (flag before implementation, not answered here)
- **Interaction flow, item-dimming, drag-and-drop, and live output-preview are now
  locked in** (see above, 2026-07-07) — remaining UI open question is just exact layout/
  visual polish (panel sizing, slot art, whether/how a "processing..." progress state is
  shown while a batch is running, whether processing continues while the menu is closed).
- Process duration for both recipes (cattail→twine, gremlin_skin→gremlin_leather) —
  unset (ratios are locked: 2:1 and 1:1 respectively, but *time* per batch is not).
- Blackberries' actual in-game effect once the food system exists — explicitly deferred,
  not part of this milestone.
- Twine's exact role in the Slingshot recipe (added ingredient vs. replacing something) —
  TBD at implementation time.

---

## Sequencing & dependencies

```
A (world + biome) ──┬─→ B (Boar tuning) ─→ C (projectiles + Gremlin) ─→ D (Snake)
                    └─→ [zone-query plumbing in spawnNodes/spawnEnemies shared by B/C/D]
                    (A, C, D all done; B's numeric-tuning half is the only open item left here)

E (dodge + i-frames)  — independent, any time
F (attack-range ring) — independent, any time
G (workbench)         — DONE (2026-07-07)
H (harvestables + Drying Rack) — depends on A (biome creek query) for Cattail placement;
                                  gremlin_leather output depends on C (ranged Gremlin's
                                  gremlin_skin drop) — otherwise independent
```

**Priority note (2026-07-07):** D (Snake) is bumped ahead of B/C in practical priority —
see Milestone D's "Why prioritized" callout above — because it's the only planned source
of `leather`, which Stone Pickaxe/Stone Club now require. D has no hard dependency on
B/C, so this doesn't violate the sequencing above, just reorders which pending milestone
to pick up next.

**Priority note #2 (2026-07-07):** with D shipped, **C (projectiles + Gremlin) is next up**
— picked over B's remaining numeric-tuning half because H's `gremlin_skin →
gremlin_leather` recipe (Gremlin Leather Armor's whole reason to exist) is blocked on the
ranged Gremlin variant existing. B's open half (Boar `AGGRO_RADIUS`/`DEAGGRO_RADIUS`/count
retuning) is small, independent, and can slot in any later session without blocking
anything else. C now explicitly includes **both Gremlin variants** (ranged: kiting +
rock-throw + melee fallback, drops Gremlin Skin + Gremlin Blood; melee-only: weaker,
Boar-shaped chase/bite, drops Gremlin Blood only) — see Milestone C's "Two gremlin
variants" note above.

- **Hard:** A before B/C/D (all need final `WORLD_W/H` + `biome.zoneAt()`). A before H
  (Cattail's creek-border spawn needs `Biome`'s creek query). C before H's
  `gremlin_skin → gremlin_leather` recipe specifically (needs the ranged Gremlin variant's
  drop to exist) — though H's Cattail/twine half has no dependency on C at all and could
  ship first if Gremlin isn't done yet.
- **Soft:** B before C/D (avoids interleaving unrelated edits to `spawnEnemies()`); C-then-D not
  simultaneous (both edit `spawnEnemies()`).
- **None:** E/F/G any order, low mutual conflict (E→`Player.ts`+1 line; F→`MainScene` create/update;
  G→`Items`/`Recipes`/`Crafting`/`CraftingMenu` + `placedObjects` tagging).

## Open risks to carry into execution

1. **A's CA/Voronoi params are eyeball-tuned** — screenshot iteration, no first-try formula.
2. **Degenerate all-one-biome layouts** — mitigated by the <10%-coverage re-roll; test with forced
   seeds before calling A done.
3. **`Enemy.update()` return type** likely needs widening to a discriminated union in C (to express
   projectile/none/melee) — small refactor, flag it, not a blocker.
4. **Workbench range/cost + all enemy stat numbers are placeholders** — tune during each session's
   `preview_eval` pass; don't treat this doc's numbers as final.
5. **Arcade `Group.add()` silently resets body properties to the group's defaults** — bit
   this codebase twice: `Projectile`'s velocity zeroed on `enemyProjectiles.add()`
   (Milestone C), and `Enemy.setCollideWorldBounds(true)` silently undone by
   `enemyGroup.add()` (fixed 2026-07-07 by configuring `physics.add.group({
   collideWorldBounds: true })` instead of relying on each entity's own constructor).
   Any future entity that sets a body property in its own constructor and later gets
   `.add()`-ed into a bare `physics.add.group()` is at risk of the same silent reset —
   either configure the group's defaults to match, or re-apply the property after
   `.add()`, not before.

## Model guidance (per CLAUDE.md)

- **A** and **C** (biome generation algorithm; first projectile system) are net-new architecture —
  good candidates for **Opus**.
- **H** (Drying Rack / processing-station concept — first "load item, wait, get output"
  system + its own load-in UI menu, distinct from instant-craft) is also net-new
  architecture — **use Opus**, per the note in Milestone H above.
- **B, D, E, F, G** reuse established patterns — **Sonnet** is appropriate.

## Verification (each milestone)

1. `node node_modules/typescript/bin/tsc --noEmit` — cheap first check.
2. `preview_start` (config `dev`) → `preview_screenshot` to confirm boot.
3. `preview_eval` against `window.__game.scene.getScene('MainScene')` for logic:
   - **A:** call `biome.zoneAt`/`isCreekAt` across a grid; assert both zone coverage ratios; force
     several seeds; screenshot the baked biome texture for blobbiness/creek shape.
   - **B:** count Boars per zone; measure time-to-first-aggro from a stationary spawn.
   - **C:** spawn a Gremlin, assert kiting retreat vector, projectile spawn + travel + player-hit
     damage through `applyDamageToPlayer` (respecting i-frames), Gremlin Blood drop.
   - **D:** assert Snake hidden alpha, tight ambush trigger, strike→flee→rehide, leather drop.
   - **E:** assert dash velocity/duration new values; `invulnerableUntil` set on dash; a bite
     during the window deals 0.
   - **F:** ring visible only when equipped; radius = REACH; cleared when unequipped.
   - **G:** tier-1 recipe blocked with amber "Requires a nearby Workbench" until within range of a
     placed workbench, then craftable; workbench itself craftable anywhere.
   - **H:** Cattail only spawns near creek-border cells (assert via `biome.isCreekAt`
     proximity check across sampled spawn points); Blackberry bushes only in forest zone;
     Drying Rack menu accepts Cattail → produces Twine after its process duration, and
     Gremlin Skin → Gremlin Leather likewise; ranged Gremlin drops Gremlin Skin + Gremlin
     Blood while melee Gremlin drops Gremlin Blood only.
4. `preview_console_logs` (level `error`) — Phaser boot banner / Vite HMR noise is normal.
5. If a backgrounded preview tab hangs `preview_eval`/`preview_screenshot`, `preview_stop` then
   `preview_start` fresh (known quirk).
