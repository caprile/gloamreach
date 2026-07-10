# Plan: Gremlin Shack POI + Boss Altar / Gremlin King (first boss)

## Context

The user wants the long-term world shape to become one giant circular Valheim-style map
(spawn at center, danger increases outward) — but explicitly asked for two things to be
built *first*, before that world-gen rework: (1) POIs in the current first biome,
starting with a "Gremlin Shack" containing a lootable chest guarded by gremlins, and
(2) a boss-altar summon mechanic plus the first actual boss fight, styled after Elden
Ring — telegraphed, dodgeable, deadly, pattern-based, with a poise/stagger punish
mechanic. This is explicitly the *tutorial* boss for the whole game, so it should be
tough-but-fair using only the player's existing dash/i-frame toolkit, not a new ability.

Two ordered milestones, meant to ship as separate sessions per this project's own
"one milestone per session" convention (see `CLAUDE.md`). **P1 should land and be
committed before P2 starts** — P2's altar/gremlin-density placement is written to lean on
P1's shack-scatter code already existing (shares the same "bias toward the altar" spawn
pass). Locked decisions below came from two rounds of `AskUserQuestion` with the user;
everything else is a first-pass/tunable call, flagged as such, matching this repo's
established style of shipping concrete numbers rather than TODOs (see `STATUS.md`).

All file:line references below were verified against the current repo state (re-read
directly, not taken on faith from the research passes that fed this plan).

---

## Shared groundwork (applies to both milestones)

- **No fixed "far corner" exists** — `Biome.ts` generates zone layout fresh each session
  (seeded Voronoi + smoothing). "Near the altar" can't be a hardcoded world coordinate;
  both milestones pick the altar's position once in `MainScene.create()` (biased toward
  `"forest"` zone, far from center) and bias shack/decoration placement off that chosen
  point, exactly like every other spawn system already does via
  `pickSpawnPoint()`/`pickSpreadSpawnPoint()` (`MainScene.ts` lines 983-1029).
- **World-gen-placed structures don't go through `placedObjects`** — that array
  (`MainScene.ts` line 240) is exclusively for the player craft-then-place flow
  (Workbench/Campfire/Drying Rack), tagged via `image.setData("itemKey", ...)`. The
  Gremlin Shack and the Altar are structurally more like the Drying Rack's own parallel
  `dryingRacks: {image, station}[]` array (line 153) — each new structure type gets its
  **own** parallel array pairing an `image` with live state, not `placedObjects`.
- **World textures for non-player-placed objects get their own dedicated texture** in
  `BootScene.makeTextures()` (not `makeItemIcons()` — that's for the 24x24 inventory
  icons only), generated with the same `Graphics.generateTexture` idiom used for `tree`
  (30x40, line 63) / `boulder` (30x24, line 72) / `drying_rack` (30x34, line 161).
- **Reference numbers**: player max HP is 100, no passive regen (`Health.ts`). Existing
  enemy HP: Boar 20, Snake 11, RangedGremlin 32, MeleeGremling 12. Dash i-frames:
  `DASH_IFRAME_MS = 150` (`MainScene.ts` line 101), dash burst `~105ms`/`450px/s`
  (`Player.ts`). `applyDamageToPlayer()` (`MainScene.ts` line 1655) is the single choke
  point all player damage — including the boss's — must route through; it already checks
  `this.time.now < this.invulnerableUntil` and applies flat armor deduction
  (`totalPlayerDefense`), so dash i-frames and armor "just work" against the boss with no
  special-casing.

---

## Milestone P1: Gremlin Shack (first POI)

Built **concretely** for Gremlin Shack specifically, not as a generic multi-type "POI
framework" — matches this project's explicit convention (see CLAUDE.md's "per-enemy
tunable combat stats" note and the Milestone-O-era decisions in `STATUS.md`: don't build
the abstraction until a second concrete case actually needs it). The code is still
structured loosely enough (a `gremlinShacks: GremlinShack[]` array) that a second POI type
later isn't a rewrite.

### Locked shape
- Guards respawn after a timer once both are cleared — repeatable farm spot, mirrors the
  existing Blackberry-bush regrow pattern (`ResourceNode.persistent/pickedTexture/
  regrowMs/harvested`, wired in `MainScene.ts`).
- Multiple shacks scattered through the forest zone; density (and general gremlin-camp
  decoration) increases toward the altar's location once P2 exists, so exploring toward
  denser gremlin content is itself the "hint trail" toward the boss.
- The shack building is a **non-interactive backdrop**; a separate small **barrel/chest
  sprite** sits at a fixed offset near its doorway and is the actual interactable (matches
  the user's own framing — "a shack... that contains a barrel or chest" — rather than
  making the whole building the interactable).

### New files

**`src/systems/LootContainer.ts`**
```ts
import { ItemContainer } from "./ItemContainer";

export interface LootRollEntry {
  key: string;    // any ItemDef/ResourceType key
  min: number;
  max: number;
  chance: number;  // independent roll per entry — a chest should feel variable, unlike
                    // Enemy.LootEntry's guaranteed-per-kill drops
}

// Pairs an ItemContainer with a loot table + roll state for a world-placed
// lootable container. Not a generic "Container UI" abstraction beyond this —
// ChestMenu talks to ItemContainer directly, same as DryingRackMenu does for
// the backpack side.
export class LootContainer {
  readonly items: ItemContainer;
  private rolled = false;

  constructor(size: number) {
    this.items = new ItemContainer(size);
  }

  // No-op on repeat calls so re-opening an already-looted (but not yet
  // guard-respawned) chest doesn't top it back up.
  rollIfEmpty(table: LootRollEntry[], rng: () => number = Math.random): void {
    if (this.rolled) return;
    this.rolled = true;
    for (const entry of table) {
      if (rng() >= entry.chance) continue;
      const amount = entry.min + Math.floor(rng() * (entry.max - entry.min + 1));
      this.items.add(entry.key, amount);
    }
  }

  // Called once both guards respawn — re-arms the chest to roll fresh loot
  // next time it's opened, but ONLY if it's already fully empty (a player who
  // never opened it keeps what's there; loot doesn't top itself back up for
  // free while unclaimed).
  rearmIfEmpty(): void {
    if (this.isEmpty()) this.rolled = false;
  }

  isEmpty(): boolean {
    return this.items.all().every((s) => s === null);
  }
}
```
Reuses `ItemContainer` (`src/systems/ItemContainer.ts`) directly — confirmed API:
`add(key, count)`, `count(key)`, `removeCount(key, n)`, `all()`, and the free function
`moveSlot(fromContainer, fromIndex, toContainer, toIndex)` (line 131) — no new container
primitive needed.

**`src/ui/ChestMenu.ts`** — modeled on `src/ui/DryingRackMenu.ts`'s structure (flat
`scrollFactor(0)` GameObjects, no Container per the standing Phaser-Container-input-bug
rule) but simpler: two side-by-side grids (backpack | chest), no slider/process step.
```ts
export interface ChestMenuDeps {
  backpack: ItemContainer;
  skills: Skills;
  chest: () => ItemContainer | null;
  beginDrag: (container: ItemContainer, index: number, pointer: Phaser.Input.Pointer) => void;
  isDragging: () => boolean;
}
```
- `containsPoint(x,y)`, `slotIndexAt(x,y)` (backpack side), new `chestSlotIndexAt(x,y)`
  (chest side) — same col/row math `DryingRackMenu.slotIndexAt` already uses.
- Items move purely via the existing `moveSlot()` primitive; no slider/preview state.
- Title reads a hand-written flavor string, not an `itemDef()` lookup — the shack/chest
  is never a backpack item, no recipe exists for it.

**`resolveItemDrag()` extension** (`MainScene.ts` lines 710-816) — this function is an
if-chain (drying-rack-open? → inventory-menu-open? → hotbar → backpack → world-drop),
**not** a clean "container kind" enum. Adding chest support is a direct extension of the
same shape (new branch parallel to the existing drying-rack block), not a generalization —
consistent with "don't build the abstraction until a 3rd/4th case proves it's needed."
Also add `this.chestMenu.isOpen()` to `anyMenuOpen()` (lines 564-573).

### `src/entities/GremlinShack.ts` (new)

Plain data class (not a GameObject subclass — the shack is a static visual), pairing the
backdrop image, the chest sprite/loot, and guard-respawn scheduling:
```ts
export interface GremlinShackConfig { x: number; y: number; }

export const SHACK_GUARD_RESPAWN_MS = 6 * 60 * 1000; // 6 min — double blackberry's 3min regrow
export const SHACK_CHEST_SIZE = 8;

export class GremlinShack {
  readonly image: Phaser.GameObjects.Image;       // backdrop, non-interactive
  readonly chestImage: Phaser.GameObjects.Image;   // the actual interactable
  readonly x: number;
  readonly y: number;
  readonly loot: LootContainer;
  guards: Enemy[] = [];
  respawnAt: number | null = null;

  constructor(scene: Phaser.Scene, cfg: GremlinShackConfig) {
    this.x = cfg.x;
    this.y = cfg.y;
    this.image = scene.add.image(cfg.x, cfg.y, "gremlin_shack").setDepth(cfg.y);
    this.chestImage = scene.add
      .image(cfg.x + 18, cfg.y + 12, "gremlin_shack_chest")
      .setDepth(cfg.y + 1);
    this.loot = new LootContainer(SHACK_CHEST_SIZE);
  }
}
```

### World textures (`BootScene.ts`, added to `makeTextures()`)

- `gremlin_shack` (48x40) — plank-wall lean-to with a doorway gap and roof overhang,
  biggest world object yet (prior largest was `tree` at 30x40) so it reads as a
  structure, not a prop.
- `gremlin_shack_chest` (16x14) — small wooden barrel/chest, sits near the doorway.

Both **non-solid** (not added to the `solids` StaticGroup) — matches the existing
"trees/boulders walk-through, Y-sorted, alpha-faded when occluding the player" convention
(no solid-collision infrastructure exists for world objects today; adding it here would
be a bigger scope increase than a first POI warrants). `setDepth(y)` on both for Y-sort.
Skip occlusion-fade (`updateTreeOcclusion`'s `obstacleNodes` list) for the shack for this
first pass — a known, acceptable rough edge (the list is typed to `ResourceNode[]` and
extending it is more scope than justified here), not silently glossed over.

### Guards: anchoring + respawn

**`RangedGremlin`** already spawn-anchors (`spawnX`/`spawnY`, `RANGED_WANDER_RADIUS = 70`,
`Gremlin.ts` lines 61-64, 213-234) — reuse as-is, just spawn at `shack.x/y + random offset`.

**`MeleeGremling`** does **not** spawn-anchor today — its wander target drifts from its
*current* position each cycle (`Gremlin.ts` lines 339-343), so over a long session it can
random-walk arbitrarily far. Needs one small additive change (not a new subclass): an
**optional** `wanderAnchor` on its constructor, defaulting to `undefined` so the 8 existing
free-roaming Gremlings elsewhere in `spawnEnemies()` are unaffected:
```ts
constructor(scene: Phaser.Scene, cfg: { x: number; y: number; wanderAnchor?: { x: number; y: number; radius: number } }) {
  // ...unchanged...
  this.wanderAnchor = cfg.wanderAnchor ?? null;
}
```
Wander-target picker: if `wanderAnchor` set, sample relative to the anchor (mirrors
`RangedGremlin.updateWander`'s exact approach) instead of current position. Shack guard
spawn: `new MeleeGremling(this, { x, y, wanderAnchor: { x: shack.x, y: shack.y, radius: 70 } })`.

**Respawn-after-timer** — new `MainScene` method, called from `tryAttackEnemy()`'s
existing kill branch (right after `this.enemies = this.enemies.filter(...)`, line 1582):
```ts
private onShackGuardKilled(enemy: Enemy): void {
  const shack = this.gremlinShacks.find((s) => s.guards.includes(enemy));
  if (!shack) return;
  shack.guards = shack.guards.filter((g) => g !== enemy);
  if (shack.guards.length > 0) return; // other guard still alive
  shack.respawnAt = this.time.now + SHACK_GUARD_RESPAWN_MS;
  shack.loot.rearmIfEmpty();
  this.time.delayedCall(SHACK_GUARD_RESPAWN_MS, () => this.respawnShackGuards(shack));
}

private respawnShackGuards(shack: GremlinShack): void {
  shack.respawnAt = null;
  const ranged = new RangedGremlin(this, { x: shack.x + Phaser.Math.Between(-40, 40), y: shack.y + Phaser.Math.Between(-40, 40) });
  const melee = new MeleeGremling(this, { x: shack.x + Phaser.Math.Between(-40, 40), y: shack.y + Phaser.Math.Between(-40, 40), wanderAnchor: { x: shack.x, y: shack.y, radius: 70 } });
  shack.guards = [ranged, melee];
  this.enemies.push(ranged, melee);
  this.enemyGroup.add(ranged);
  this.enemyGroup.add(melee);
}
```
Respawn fires only once **both** guards are dead, not per-guard — reads as "the shack is
cleared, then re-contested as a pair later" rather than a staggered trickle. First-pass,
flagged tunable. Initial shack setup calls `respawnShackGuards(shack)` directly to spawn
the first pair.

### Hover/prompt/interact wiring

Extend `updateHover()` (lines 1342-1412) with a new candidate loop over
`this.gremlinShacks` (hit-testing `shack.chestImage`, not the backdrop), matching the
existing `dryingRacks` loop shape (lines 1373-1383). New prompt:
```ts
private promptForShack(shack: GremlinShack): string | null {
  const inReach = Phaser.Math.Distance.Between(this.player.x, this.player.y, shack.x, shack.y) <= REACH;
  return inReach ? "[LMB] Open" : null;
}
```
`tryInteract()` gets a matching branch calling `openChestMenu(shack)`, mirroring the
Drying Rack open/close pair (`openDryingRackMenu`/`closeDryingRackMenu`, lines 912-925):
`craftingMenu.close()`, `inventoryMenu.close()`, close any open upgrade menu, then
`shack.loot.rollIfEmpty(GREMLIN_SHACK_LOOT_TABLE)` and `chestMenu.openMenu()`. Add
`closeChestMenu()` to the same "close every menu" call sites `closeDryingRackMenu()`
already appears at (re-verify each still applies at implementation time).

### World placement

Reuse `pickSpreadSpawnPoint()` (lines 1010-1029) exactly like the Gremlin-family spacing
pool. New `spawnGremlinShacks()`, called from `create()` after `spawnEnemies()`.

### First-pass tunable numbers (P1)

| Constant | Value | Why |
|---|---|---|
| `SHACK_COUNT` | 5 | Sparse discovery feel; 2-3 encountered per forest-zone playthrough on the current ~3584x2688 world |
| `SHACK_CLEAR_RADIUS` | 260px | Wider than Boar's 220px — a full POI is a bigger early spike than one enemy |
| `SHACK_MIN_SPACING` | 500px | Well above `GREMLIN_CLUSTER_RADIUS` (220) — shacks are landmarks, not ambient scatter |
| `SHACK_GUARD_RESPAWN_MS` | 360,000 (6 min) | 2x blackberry's 3-min regrow — combat+loot spot warrants a longer cooldown than a passive pickup |
| `SHACK_CHEST_SIZE` | 8 slots | Room for a varied table without reading as "a second backpack" |
| Loot table | `gremlin_blood` 1-3 (90%), `gremlin_skin` 1-2 (50%), `bones` 1-2 (60%), `twine` 1-2 (35%), `leather` 1 (25%) | All existing `ResourceType` keys already in `Inventory.ts`'s union — no new type needed here |

---

## Milestone P2: Boss Altar + Gremlin King

### Locked decisions (from `AskUserQuestion`, do not re-litigate)
- Altar found via **exploration + escalating environmental hints** (denser shacks/camp
  decoration/enemies as you approach) — no minimap marker, consistent with the minimap's
  already-locked "terrain + player position only, no entity blips" rule.
- Summon: craft a **Gremlin Totem**, place it into the altar's own built-in fire (the
  altar is its own structure with a brazier — not the player-placeable `Campfire`).
- **No new player ability** — fight is built entirely around the existing dash + 150ms
  i-frame system. A dedicated teleport/blink is explicitly deferred to a future, tougher
  boss.
- **Poise/stagger meter** is the "pattern knowledge pays off" mechanic for v1, since the
  game has no damage-type/resistance system yet (that stays a flagged future item per the
  standing CLAUDE.md note).
- **Melee + AoE only**, three attacks: wide cleave, telegraphed line-charge, telegraphed
  growing-circle ground slam. No projectiles.
- **Two phases**: below 50% HP, "enraged" — shorter telegraphs/recovery + faster movement,
  not more damage (keeps the ramp about pattern-reading pressure, not a numbers wall).
- Visually a **big Troll/Ogre-scaled reskin**, procedurally generated like everything else.

### Altar placement + density gradient (ties into P1)

New `MainScene` field `altarPosition: {x,y} | null`, chosen once in `create()` **before**
`spawnGremlinShacks()` runs (P1's scatter reads this to bias toward it):
```ts
private pickAltarPosition(rng: Phaser.Math.RandomDataGenerator): { x: number; y: number } {
  const ALTAR_CLEAR_RADIUS = 900; // far from world-center safe zone — most of the world's half-diagonal
  return this.pickSpawnPoint(rng, "forest", ALTAR_CLEAR_RADIUS, true);
}
```

**Density gradient** — rather than a real per-cell density field (out of scope), three
concrete additive layers, all centered on `altarPosition` within `ALTAR_NEAR_RADIUS = 500`:
1. **2 of the 5 shacks** are biased near the altar (sampled as `altarPosition + random
   offset within ALTAR_NEAR_RADIUS`, rejecting non-forest/creek cells like
   `pickSpawnPoint` already does) instead of a fully free `pickSpreadSpawnPoint` roll.
2. **New decorative "gremlin camp" prop** — a small bone/rock-cairn texture (16x16,
   `BootScene.ts`), purely visual (`scene.add.image`, no physics, no hover/interact
   wiring at all). Scattered in 3 concentric bands around the altar: 20 props at 0-150px,
   15 at 150-300px, 5 at 300-500px — a stepped falloff, simple to reason about/tune
   instead of a true continuous gradient.
3. **Extra gremlin density near the altar only** — `ALTAR_EXTRA_GREMLINS = 6` /
   `ALTAR_EXTRA_GREMLINGS = 4`, spawned via the same zone/creek-constrained sampling,
   additive on top of (not a multiplier on) the existing Milestone-O-tuned base counts in
   `spawnEnemies()` — avoids re-litigating that hard-won balance pass anywhere else on
   the map.

### The Altar structure

**`src/entities/BossAltar.ts`** (new, small — parallel to `GremlinShack`):
```ts
export interface BossAltarConfig { x: number; y: number; }

export class BossAltar {
  readonly image: Phaser.GameObjects.Image;
  readonly x: number;
  readonly y: number;
  summoned = false;      // true once the King has been summoned (blocks prompt while alive/after defeat — see below)
  bossDefeated = false;  // tracked for a future "spent altar" visual; not built now

  constructor(scene: Phaser.Scene, cfg: BossAltarConfig) {
    this.x = cfg.x;
    this.y = cfg.y;
    this.image = scene.add.image(cfg.x, cfg.y, "boss_altar").setDepth(cfg.y);
  }
}
```
New `boss_altar` world texture (64x56, `BootScene.ts`): gray stone base ring, dark pit
recess, a static flame silhouette (flat-triangle convention, matching the existing
Campfire icon's flame style — no particle system exists/needed). Non-solid, same
justification as the shack. `ALTAR_COUNT = 1` for this session.

### Gremlin Totem (new craftable item)

**`Items.ts`**:
```ts
gremlin_totem: {
  key: "gremlin_totem",
  name: "Gremlin Totem",
  description: "A grim totem bound with gremlin remains. Placed into the Boss Altar's fire to summon its guardian.",
  texture: "icon_gremlin_totem",
  maxStack: 99,       // stackable consumable, not a durability item — no reason to force single-stacking
  hotbarable: true,   // must be the selected hotbar item for the altar's gating check below
  stats: [{ label: "Type", value: "Ritual Item" }],
},
```
New icon in `makeItemIcons()`: carved bone totem with a dark binding wrap + a small red
inlay, 24x24.

**`Recipes.ts`**:
```ts
{
  id: "gremlin_totem",
  name: "Gremlin Totem",
  description: "A grim totem bound with gremlin remains. Summons the Gremlin King at the Boss Altar.",
  category: "misc",
  tier: 1,
  costs: { gremlin_leather: 4, gremlin_guck: 3, bones: 8, twine: 4 },
  requiredSkills: [{ skill: "light_armor", level: 3 }],
  output: { kind: "item", itemId: "gremlin_totem", itemName: "Gremlin Totem" },
},
```
Costs use `gremlin_leather`/`gremlin_guck` — the two rarest processed materials in the
game today — deliberately making this pricier than a full Gremlin Shirt (3
`gremlin_leather` total) alone, appropriate as an endgame-of-first-biome gate. The
`light_armor` skill-level gate (rather than a weapon skill) is a soft signal the player
has engaged with gremlin-armor progression specifically, not just combat generally. All
numbers first-pass/tunable. **Add the new recipe to `RECIPES.md`'s tables** in the same
pass (per `CLAUDE.md`'s "keep RECIPES.md in sync" working convention).

### Altar interaction — gating and consumption

Mirrors the existing tool-kind gating philosophy exactly (`promptFor()`'s "no tool of the
right kind → show nothing, never reveal what's required", lines 1419-1433):
```ts
private promptForAltar(altar: BossAltar): string | null {
  const inReach = Phaser.Math.Distance.Between(this.player.x, this.player.y, altar.x, altar.y) <= REACH;
  if (!inReach || altar.summoned) return null;
  const selected = this.hotbar.get(this.hotbar.selected());
  if (!selected || selected.key !== "gremlin_totem") return null; // not holding it -> show nothing
  return "[LMB] Place Totem";
}
```
Wired into `updateHover()`/`tryInteract()` the same way as the shack (new candidate type).

**Consumption**: confirmed the correct existing primitive is `ItemContainer.removeCount(key, n)`
(`ItemContainer.ts` line 100 — the same one `Crafting.craft()` uses for ingredients), NOT
the placement system's single-slot `container.set(idx, null)` (that's for `maxStack: 1`
placeables specifically; `gremlin_totem` is a stackable consumable).
```ts
private attemptSummonBoss(altar: BossAltar): void {
  if (altar.summoned) return;
  if (this.hotbar.container.count("gremlin_totem") >= 1) this.hotbar.container.removeCount("gremlin_totem", 1);
  else if (this.backpack.count("gremlin_totem") >= 1) this.backpack.removeCount("gremlin_totem", 1);
  else return;
  this.afterItemMove();
  altar.summoned = true;
  this.eventLog.add("combat", "The altar's fire roars to life...");
  this.time.delayedCall(BOSS_RITUAL_DELAY_MS, () => this.spawnGremlinKing(altar));
}
```
`BOSS_RITUAL_DELAY_MS = 2500` — a readable ritual beat, not a loading screen.

### `GremlinKing` — state machine, base class choice

**`src/entities/GremlinKing.ts`** (new) extends `Enemy`. Justification: keeps `Enemy`'s
HP-bar scaffolding, `rollLoot()`/`playDeathFeedback()` (reused verbatim for the guaranteed
trophy drop), and `takeHit()`'s damage/tint/aggro-clear pattern (boss layers poise
reduction on top via `super.takeHit()` — same layering precedent as `Snake.takeHit()`,
`Snake.ts` lines 159-169). What it does **not** want is `Enemy.update()`'s idle/chase/bite
machine — it **fully overrides `update()`** without calling `super.update()`, the exact
precedent `Snake.ts` already established (line 61 comment). No case for a raw-Sprite boss.

**One base-class change required**: `Enemy.BAR_W`/`BAR_H`/`BAR_OFFSET_Y` are currently
`private static readonly` (`Enemy.ts` lines 74-76) — a subclass can't read them to
position a second (poise) bar consistently. Widen all three to `protected static readonly`
— a one-line, zero-behavior-change edit, consistent with how `Enemy.ts` already marks
other subclass-facing internals (`pursuitClockStart`, `applyFacing`, etc.) `protected`.

**One `Inventory.ts` change required**: `EnemyConfig.loot: LootEntry[]` requires
`resource: ResourceType`, a closed union (`Inventory.ts` lines 17-29). The boss's
guaranteed trophy drop needs a new key added to that union:
```ts
export type ResourceType =
  | "wood" | "stone" | "leather" | "boar_meat" | "bones" | "gremlin_blood"
  | "gremlin_guck" | "gremlin_skin" | "cattail" | "blackberry" | "twine"
  | "gremlin_leather"
  | "gremlin_king_fang"; // new — Gremlin King's guaranteed unique trophy drop
```

**States**: `idle → telegraphing(attackType) → executing(attackType) → recovering → idle`,
with `staggered` interruptible from any state when poise hits 0, returning to `idle` after
`STAGGER_DURATION_MS` (poise resets to max).

**Telegraph visuals** reuse the exact idiom `MainScene.updateAttackRangeRing()` (lines
622-629) already establishes — a `Graphics` object cleared and redrawn every frame at a
world position. The boss owns its own `Graphics`, drawn only while `telegraphing`:
- **Cleave**: fixed-geometry arc (`CLEAVE_RANGE`/`CLEAVE_ARC_DEG`, centered on facing),
  alpha ramping 0.1→0.4 across the telegraph window.
- **Charge**: a fixed line along the locked target direction, drawn immediately at full
  `CHARGE_MAX_DISTANCE` length (not growing) — the whole point is reading a static line
  and sidestepping it.
- **Slam**: a circle of radius `SLAM_RADIUS` **growing from 0 to full** across the
  telegraph duration — directly analogous to `updateAttackRangeRing`'s circle draw, animated.

**Charge attack movement**: a **locked-line dash**, not a homing lunge (Snake's own
`STRIKE_SPEED` lunge re-aims every frame at the live player — explicitly NOT the model
here; closer in spirit to `Player.ts`'s own fixed-velocity-held dash). `chargeTargetX/Y`
is captured once at the `idle → telegraphing("charge")` transition and never re-read —
this is what makes it sidestep-dodgeable. Velocity set once at
`telegraphing → executing`, held until `CHARGE_MAX_DISTANCE` traveled or the player is
hit, then zeroed and transitions to `recovering` either way (whiff and landed hit share
the same punish window).

### Poise meter

Public `poise: number` field, parallel to `Enemy.health`. `takeHit()` override:
```ts
takeHit(damage: number): boolean {
  const depleted = super.takeHit(damage); // HP + tint/aggro-clear via base class
  if (depleted) return true;
  if (this.bossState === "staggered") return false;
  this.poise = Math.max(0, this.poise - damage); // 1:1 chip with damage dealt, first-pass
  this.lastPoiseChipAt = this.scene.time.now;
  if (this.poise <= 0) this.enterStaggered(this.scene.time.now);
  return false;
}
```
1:1 chip means `BOSS_MAX_POISE = 100` breaks after ~100 damage dealt — roughly 3-5 hits
from an upgraded first-biome weapon (Stone Club lvl3 = 9, Primal Spear lvl3 = 12 per
`RECIPES.md`), so a stagger occurs roughly every 15-20% of the boss's HP bar, giving
multiple punish windows across a full fight. **Regen**: only resumes
`POISE_REGEN_DELAY_MS` (4s) after the last hit that chipped it, at
`POISE_REGEN_PER_SEC = 15` — rewards sustained pressure, lets a disengaging player's poise
climb back rather than farming one stagger over and over.

**Bonus damage while staggered** — applied in `tryAttackEnemy()` (`MainScene.ts` line
1562-1564) before calling `takeHit()`, via a public `isStaggered(): boolean` getter (not a
private-field type-narrow):
```ts
let dmg = Math.round(baseDmg * weaponSkillDamageMultiplier(dmgType, this.skills));
if (enemy instanceof GremlinKing && enemy.isStaggered()) dmg = Math.round(dmg * STAGGER_DAMAGE_MULTIPLIER);
const depleted = enemy.takeHit(dmg);
```

**Poise bar UI**: a second pair of `Rectangle`s (gold/yellow fill, visually distinct from
the red HP bar) positioned below the HP bar in `GremlinKing`'s constructor, synced every
frame in its own `preUpdate` override (calls `super.preUpdate()` first, then updates the
poise bar's position/fill-scale), visibility gated by the boss's own `isAggro()` override
(`return this.bossState !== "idle";`) — same "hides until engaged" convention every other
enemy's HP bar already follows.

### Area damage to the player

Confirmed **no existing precedent** for enemy→player area damage — every current attack
(`Enemy.ts` bite, `Snake.ts` strike) is a single fixed-range distance check, both
resolving through `MainScene.applyDamageToPlayer(enemy.biteDamage)` called from
`updateEnemies()` (line 1617) off a plain `boolean` return from `Enemy.update()`. Rather
than overload that contract, `GremlinKing` gets an explicit, separate query method, kept
outside the generic per-frame loop:
```ts
// MainScene.updateEnemies() — existing loop unchanged, new branch appended:
if (enemy instanceof GremlinKing) {
  const areaHit = enemy.checkPlayerHit(this.player.x, this.player.y);
  if (areaHit) this.applyDamageToPlayer(areaHit.damage, areaHit.knockback ? { fromX: enemy.x, fromY: enemy.y, speed: areaHit.knockback } : undefined);
}
```
`checkPlayerHit()` only evaluates during `executing`, gated by a per-attack
`hasHitThisAttack` boolean (reset when a new attack's `executing` phase begins) so one
cleave/slam/charge can only land once, not once per overlapping frame:
- **Slam**: `dist <= SLAM_RADIUS` → `{ damage: SLAM_DAMAGE, knockback: SLAM_KNOCKBACK }`.
- **Cleave**: `dist <= CLEAVE_RANGE` AND within `CLEAVE_ARC_DEG/2` of facing (angle-diff
  check via `Phaser.Math.Angle.ShortestBetween`).
- **Charge**: `dist <= CHARGE_HIT_RADIUS` against the boss's *current* position — a
  simplified "point + generous radius" stand-in for a true capsule/segment check, called
  out below as a spot to verify feel in playtesting before investing in exact math.

**`applyDamageToPlayer` signature change** — add an *optional* second param, so every
existing call site (Boar bite, Snake bite, Gremlin claw/projectile) is untouched:
```ts
private applyDamageToPlayer(amount: number, knockback?: { fromX: number; fromY: number; speed: number }): void {
  if (this.isDead) return;
  if (this.time.now < this.invulnerableUntil) return;
  const reduced = Math.max(1, Math.round(amount - totalPlayerDefense(this.equipment)));
  const died = this.health.takeDamage(reduced);
  this.refreshHealthBar();
  if (knockback) {
    const angle = Phaser.Math.Angle.Between(knockback.fromX, knockback.fromY, this.player.x, this.player.y);
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(Math.cos(angle) * knockback.speed, Math.sin(angle) * knockback.speed);
    this.time.delayedCall(150, () => body.setVelocity(0, 0)); // brief impulse, matches dash's own short-burst feel
  }
  if (died) this.onPlayerDeath();
}
```

### Enrage (phase 2)

Checked every frame: `this.enraged = this.health <= this.maxHealth * ENRAGE_HP_THRESHOLD`.
Durations are captured **once per state-entry** (not re-scaled mid-state), so crossing the
threshold mid-telegraph doesn't retroactively shrink an already-playing animation —
avoids a jarring "suddenly faster" glitch. Applies to telegraph/recovery durations and
move speed only — **not** damage (per the locked decision: pressure comes from tighter
timing, not bigger numbers).

### Boss spawn + defeat

```ts
private spawnGremlinKing(altar: BossAltar): void {
  const boss = new GremlinKing(this, { x: altar.x, y: altar.y - 60 });
  this.gremlinKing = boss;
  this.enemies.push(boss);
  this.enemyGroup.add(boss);
  this.eventLog.add("combat", "The Gremlin King rises!");
}
```
No new physics wiring — `enemyGroup` already collides against `solids`/player. Boss kit is
melee/AoE-only, no projectile-overlap wiring needed.

**Defeat** needs **no boss-specific code in `tryAttackEnemy()`** — the existing death
branch (loot roll, `playDeathFeedback`, removal from `this.enemies`) already works
generically for any `Enemy` subclass. Only addition: a guaranteed unique trophy via the
constructor's `loot` config, same `LootEntry[]` shape every enemy already uses:
```ts
loot: [{ resource: "gremlin_king_fang", min: 1, max: 1 }], // guaranteed unique drop
```
New `gremlin_king_fang` item (`Items.ts` + icon), **no recipe yet** — an explicit hook for
future content, not designed further here. `altar.summoned` stays `true` permanently after
one kill (the altar's prompt logic already guards on it) — a deliberate one-shot-per-
session design; the natural hook point for a future "boss respawns / portal opens" system,
not built now (confirmed no portal scaffolding exists anywhere in the repo yet).

### Boss texture (`BootScene.ts`)

`gremlin_king` (40x48 base, before the runtime `BOSS_SCALE` multiplier stacks further
size) — same green-gremlin palette family as the existing roster (reads as "gremlin, but
massive") with blockier proportions and visible tusks to read as a boss at a glance, not
just a bigger regular enemy.

### First-pass tunable numbers (P2)

| Constant | Value |
|---|---|
| `ALTAR_CLEAR_RADIUS` / `ALTAR_NEAR_RADIUS` | 900px / 500px |
| `ALTAR_EXTRA_GREMLINS` / `_GREMLINGS` | 6 / 4 |
| Camp-prop bands (0-150 / 150-300 / 300-500px) | 20 / 15 / 5 props |
| Gremlin Totem recipe | 4 `gremlin_leather`, 3 `gremlin_guck`, 8 `bones`, 4 `twine`; tier 1; Light Armor lvl 3 |
| `BOSS_RITUAL_DELAY_MS` | 2500 |
| `BOSS_MAX_HEALTH` | 600 |
| `BOSS_SCALE` | 2.4x |
| `BOSS_AGGRO_RADIUS` / `BOSS_ARENA_LEASH_RADIUS` | 260 / 500px |
| `BOSS_MOVE_SPEED` | 45 px/s (58.5 enraged) |
| `BOSS_MAX_POISE` | 100 |
| `STAGGER_DURATION_MS` / `_DAMAGE_MULTIPLIER` | 3000ms / 1.5x |
| `POISE_REGEN_DELAY_MS` / `_PER_SEC` | 4000ms / 15 |
| Cleave: telegraph / execute / recover / range / arc / dmg | 550 / 200 / 700ms, 70px, 120°, 22 |
| Charge: telegraph / speed / max-dist / recover / hit-radius / dmg | 850ms, 340px/s, 420px, 900ms, 34px, 30 |
| Slam: telegraph / execute / recover / radius / dmg / knockback | 950 / 150 / 800ms, 110px, 35, 260px/s |
| `ATTACK_COOLDOWN_MS` | 1200 |
| Enrage threshold / telegraph / recover / move multipliers | 50% HP / 0.65x / 0.75x / 1.3x |

---

## Accepted first-pass gaps (not blocking, called out explicitly)

1. **Shack occlusion-fade skipped** — the shack isn't added to `updateTreeOcclusion`'s
   obstacle list, so a player positioned "behind" it may render incorrectly in rare cases.
2. **Charge attack's hit-check is a point+radius approximation**, not true capsule/segment
   math — worth a playtest pass to confirm it doesn't feel like it's missing or
   phantom-hitting before investing in exact geometry.
3. **Poise chip rate (1:1 with damage) and all boss numeric tuning** are explicitly
   first-pass — this is a "tutorial boss," expect a same-day playtest rebalance pass
   after first tested live, matching how every other combat milestone in this project has
   shipped (see `STATUS.md`'s repeated playtest-fix-batch pattern).

---

## Critical files

**P1**: `src/scenes/MainScene.ts` (hover/prompt/interact loops, `resolveItemDrag`, spawn
wiring, guard-death hook), `src/entities/Gremlin.ts` (`MeleeGremling` wander-anchor
addition), `src/systems/ItemContainer.ts` (reused as-is), `src/ui/DryingRackMenu.ts`
(structural model for new `ChestMenu.ts`), `src/scenes/BootScene.ts` (new textures).

**P2**: `src/entities/Enemy.ts` (base class — `protected` visibility change,
`takeHit`/HP-bar-layering precedent), `src/entities/Snake.ts` (full-`update()`-override
precedent, `takeHit` layering precedent), `src/entities/Gremlin.ts` (burst/stand-ground
timing precedent), `src/scenes/MainScene.ts` (`applyDamageToPlayer` signature change,
`updateEnemies` area-check branch, altar interaction/consumption, spawn wiring),
`src/systems/Recipes.ts` + `src/systems/Items.ts` (Gremlin Totem), `src/systems/
Inventory.ts` (`ResourceType` union addition).

---

## Verification

Per `CLAUDE.md`'s standing workflow: `tsc --noEmit` after each milestone, then
`preview_start`/`preview_eval`/`preview_screenshot`. Specifically:

**P1**: teleport the player to a spawned shack via `preview_eval`, confirm
`updateHover()` selects it and the prompt reads `"[LMB] Open"` only in reach; a scripted
`tryInteract()` opens `ChestMenu` with rolled loot present; killing both guards via a
direct `takeHit()` call schedules a respawn and the chest re-arms only once empty;
dragging an item from chest to backpack and back round-trips correctly; `preview_screenshot`
confirms the shack/chest textures render and Y-sort correctly against the player.

**P2**: confirm `altarPosition` is chosen once and shacks/props/extra gremlins cluster
near it (sample distances in a script); the altar prompt is invisible without a Totem
selected and reads `"[LMB] Place Totem"` once one is; summoning consumes exactly one
Totem and spawns `GremlinKing` after the ritual delay; a scripted attack sequence
confirms telegraph→execute→recover timing for all three attacks, that `charge`'s target
locks at telegraph-start (moving the player mid-telegraph doesn't retarget), that poise
depletes and triggers `staggered` at 0, that damage during `staggered` is multiplied, and
that crossing the enrage threshold shortens future telegraph durations without disrupting
an in-progress one. `preview_screenshot` confirms telegraph indicators (arc/line/growing
circle) render, and that the boss's HP + poise bars both show once aggro'd.

Once both milestones ship, update `CLAUDE.md`'s roadmap (new lettered entries under the
Combat/World items, following the existing convention) and `RECIPES.md` (Gremlin Totem
row) in the same pass — and copy this plan file into the repo's own `.claude/plans/`
per the project's "plans must be committed in-repo" convention.
