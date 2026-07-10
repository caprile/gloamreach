# Group C — Elite Gremlins + Trophy-gated Gremlin Totem

## Context

This is the **third and final** batch of the second Gremlin King playtest feedback,
implemented in the locked order **A → B → C** (A and B shipped 2026-07-10; see
`STATUS.md`). Group C is the biggest of the three: it introduces the game's first
**Elite enemy variant** concept and reworks the **Gremlin Totem**'s craft gate from a
skill level to a hard-won trophy currency.

**Problem it addresses:** the Boss Altar's escalating-difficulty gradient
(`spawnAltarDensity()`) currently just adds *more* ordinary gremlins near the boss — no
tougher, distinct threat marks the approach. And the Gremlin Totem (the boss-summon
item) is gated behind a Light Armor **skill level** (3), which is an arbitrary,
disconnected requirement. Group C ties the summon gate to actually fighting the tougher
gremlin content near the altar: **Elites drop a unique trophy, and 3 trophies craft the
Totem** — so the difficulty ramp toward the boss and the means to summon it are the same
content loop.

**Locked decisions (from the earlier planning session + this one):**
- Elites: **+50% HP, +50% damage, +10% move speed, bigger + visually distinct.**
- Elites are the **Gremlin Shack guards** — every shack's 1 ranged + 1 melee guard is an
  elite, and **only** shack guards are elite. Gremlins elsewhere on the map (including the
  altar-density extras) are unchanged. This is a cleaner hook than the altar-density batch:
  all guards already flow through one spawn path (`respawnShackGuards()`), and 2 of the 5
  shacks are already biased near the altar, so an altar-proximity elite cluster still falls
  out naturally.
- Elites drop a **unique trophy (`gremlin_trophy`) + 2x their normal resources.**
- **Each elite drops exactly 1 trophy** (confirmed) — must kill 3 elites per Totem.
- Totem recipe: cost becomes **`{ gremlin_trophy: 3, wood: 1, gremlin_guck: 1 }`**, remove
  the Light Armor skill gate. **Keep it tier 1 (Workbench-gated)** (confirmed) —
  discoverable once its ingredients are owned, but still needs Workbench proximity to craft.

**Design philosophy note:** the user's standing "own condition/numbers, don't generalize"
rule (per-enemy combat stats) is about *AI behavior*, not this. Here the elite modifier
is genuinely uniform across variants (a flat stat/scale/loot multiplier), so a shared
`elite` flag on the existing `Enemy`/`Gremlin` classes is appropriate — this is not a new
state machine, it's a stat/visual/loot modifier layered on the existing AI. The two
gremlin AIs (`RangedGremlin`, `MeleeGremling`) are untouched behaviorally.

## Approach

### 1. New resource: `gremlin_trophy`

- **`src/systems/Inventory.ts`** — add `"gremlin_trophy"` to the `ResourceType` union
  (alongside `gremlin_king_fang`), with a comment noting it's the Elite Gremlin drop /
  Totem ingredient.
- **`src/systems/Items.ts`** — add a `gremlin_trophy` entry to `ITEM_DEFS` (model on the
  existing `gremlin_king_fang` def near line 350): `maxStack: 99`, `hotbarable: false`,
  `texture: "icon_gremlin_trophy"`, a name ("Gremlin Trophy") and description that
  points at its use ("A gruesome trinket taken from an Elite Gremlin. Three of them can
  bind a Gremlin Totem."). Loose-drop world texture reuses this icon (see
  `spawnLooseDrop`, which pulls `itemDef(resource).texture`).
- **`src/scenes/BootScene.ts`** — generate `icon_gremlin_trophy` in `makeItemIcons()`
  (after the `icon_gremlin_king_fang` block ~line 499). A small distinct trophy icon
  (e.g. a dark-green severed-ear/claw motif with a gold accent, palette-consistent with
  the gremlin family). Uses the existing `ICON` size + `g.generateTexture` pattern.

### 2. Elite variant support on `Enemy` / `Gremlin`

The elite modifier is opt-in per-instance, applied in the two gremlin subclass
constructors. No behavioral AI change.

- **`src/entities/Enemy.ts`**:
  - Add a `protected speedMult = 1` field. Subclasses multiply their chase/pursue/kite
    speeds by it (see below). Default 1 keeps every existing enemy identical.
  - Add an `EliteConfig`-style optional bundle to `EnemyConfig` — cleanest is to keep
    `EnemyConfig` as-is and have the **subclasses** compute the elite-adjusted
    `maxHealth`/`biteDamage`/`loot`/`texture` before calling `super()`, then apply
    `setScale()` + `speedMult` in their own constructor body. This keeps `Enemy` generic
    and avoids threading an `elite` flag through the base config (Boar/Snake never need
    it).
  - No change to `takeHit`/`rollLoot`/hit-feedback — bigger scale means
    `MainScene.enemyReach()` (already size-scaling, from the post-boss batch) auto-covers
    the larger elite hitbox with no special-casing, same as the Gremlin King fix.

- **`src/entities/Gremlin.ts`** — add optional `elite?: boolean` to **both**
  `RangedGremlin` and `MeleeGremling` constructor cfg:
  - **HP/damage:** when elite, pass `maxHealth * 1.5` (rounded) and `biteDamage * 1.5`
    (rounded) to `super()`.
  - **Loot:** when elite, build the loot array as each base entry doubled
    (`min*2`/`max*2`); the ranged `RangedGremlin` **also** appends
    `{ resource: "gremlin_trophy", min: 1, max: 1 }` — the melee `MeleeGremling` does NOT
    drop a trophy (user decision), only its doubled blood.
  - **Speed:** set `this.speedMult = 1.1` in the constructor; wrap the movement-speed
    constants used in `update()` with it. Affected sites:
    - `RangedGremlin`: `KITE_SPEED`, `RANGED_PURSUE_SPEED` (the two chase/kite speeds;
      wander speed can stay base — cosmetic only).
    - `MeleeGremling`: `MELEE_CHASE_SPEED` (wander stays base).
    Do this by multiplying at the `Math.cos(...) * SPEED` call sites (e.g.
    `Math.cos(angle) * KITE_SPEED * this.speedMult`), a handful of edits — explicit and
    local, no config-table generalization.
  - **Texture + scale:** when elite, use a dedicated elite texture (`gremlin_elite` /
    `gremling_elite`) and `this.setScale(1.4)` after `super()`. Scale is the tint-proof
    visual tell (hit-feedback `setTint` recolors the base texture during combat, same as
    every enemy; the larger silhouette + distinct base palette still reads as "elite").
  - `displayName`: `"Elite Gremlin"` / `"Elite Gremling"` when elite (drives the
    `Defeated <name>` event-log line and hover prompt).

- **`src/scenes/BootScene.ts`** — generate `gremlin_elite` and `gremling_elite` textures
  next to the existing `gremlin`/`gremling_weak` blocks (~lines 92-111): recolored
  menacing variants (e.g. crimson/dark-purple bodies with a gold/bone accent) at the same
  base dimensions as their normal counterparts (the runtime `setScale(1.4)` adds the size
  on top, mirroring how `gremlin_king` is a 40x48 texture scaled by `BOSS_SCALE`).

### 3. Make Gremlin Shack guards elite

- **`src/scenes/MainScene.ts` `respawnShackGuards()`** (~line 1176): pass
  `elite: true` when constructing both guards — `new RangedGremlin(this, { x, y, elite:
  true })` and `new MeleeGremling(this, { ...existing wanderAnchor..., elite: true })`.
  This is the single shared spawn path for **both** the initial shack spawn and every
  6-minute respawn cycle, so both are covered by the one edit. 5 shacks × 2 guards = **10
  elites** in the world (respawning), comfortably supplying the 3 trophies a Totem needs.
  No other spawn site changes — `spawnEnemies()` and `spawnAltarDensity()` stay non-elite.
- No change needed to `tryAttackEnemy()` — it already reads `enemy.rollLoot()` generically
  and spawns each drop via `spawnLooseDrop`, so the doubled resources + trophy flow with
  zero kill-path changes. `onShackGuardKilled()` also already matches guards by object
  identity (`shack.guards.includes(enemy)`), so respawn/chest-rearm logic is unaffected by
  the guards now being elite. The trophy resource just needs its `ItemDef` (step 1) so
  `spawnLooseDrop` finds a texture and the backpack can stack it.

### 4. Rework the Gremlin Totem recipe

- **`src/systems/Recipes.ts`** (`gremlin_totem`, ~line 167):
  - `costs`: replace `{ gremlin_leather: 4, gremlin_guck: 3, bones: 8, twine: 4 }` with
    `{ gremlin_trophy: 3, wood: 1, gremlin_guck: 1 }`.
  - `requiredSkills`: change from `[{ skill: "light_armor", level: 3 }]` to `[]` (remove
    the skill gate entirely — discovery now keys off owning the ingredients, the normal
    ingredient-known discovery path; the trophy is the meaningful gate).
  - `tier`: **stays 1** (Workbench-gated to craft).
  - Description/name unchanged.
- **`RECIPES.md`** — update the Gremlin Totem row to the new cost/gate (per the standing
  "keep RECIPES.md in sync" convention in `CLAUDE.md`).

### 5. Docs

- **`STATUS.md`** — new "Just finished" section documenting Group C (elite variant model,
  trophy resource, spawn placement, totem rework), and mark Group C as shipped / the
  A→B→C batch complete.
- **`CLAUDE.md`** — add a `5f.` roadmap entry (or extend 5e) noting Group C shipped, and
  update the "Group C — not started" language in 5e.
- Copy this plan file into the repo's `.claude/plans/` and commit alongside the feature
  (per the "plans must be committed in-repo" convention). **Commit only when the user
  asks.**

## Files touched (summary)

| File | Change |
|------|--------|
| `src/systems/Inventory.ts` | add `gremlin_trophy` to `ResourceType` |
| `src/systems/Items.ts` | add `gremlin_trophy` ItemDef |
| `src/scenes/BootScene.ts` | `icon_gremlin_trophy`, `gremlin_elite`, `gremling_elite` textures |
| `src/entities/Enemy.ts` | `speedMult` field (default 1) |
| `src/entities/Gremlin.ts` | `elite?` flag on both variants: stat/loot/speed/scale/texture/name |
| `src/scenes/MainScene.ts` | `respawnShackGuards()` spawns both guards with `elite: true` |
| `src/systems/Recipes.ts` | Totem recipe: `{ gremlin_trophy: 3, wood: 1, gremlin_guck: 1 }`, drop skill gate, keep tier 1 |
| `RECIPES.md`, `STATUS.md`, `CLAUDE.md` | doc sync |

## Verification

Per `CLAUDE.md`'s verification workflow (browser game — verify live, not just typecheck):

1. `node node_modules/typescript/bin/tsc --noEmit` — cheap first pass.
2. `preview_start` (config `"dev"`), `preview_resize` if the loop is paused (known quirk),
   `preview_screenshot` to confirm boot.
3. **Elite construction/stats** via `preview_eval` against the live `MainScene`:
   - `new RangedGremlin(scene, {x,y,elite:true})` → assert `maxHealth === round(32*1.5)`,
     `biteDamage === round(10*1.5)`, `scaleX === 1.4`, texture key is `gremlin_elite`,
     `speedMult === 1.1`; `rollLoot()` returns doubled skin+blood **and** one
     `gremlin_trophy`. Same shape for `MeleeGremling`.
   - Confirm a **non-elite** gremlin is unchanged (`maxHealth === 32`, scale 1, no
     trophy) — regression guard on the default path.
4. **Shack guards are elite**: read `scene.gremlinShacks`, confirm each shack's two
   `guards` are elite (elite texture/name, 1.5x HP), and that a plain `spawnEnemies()`
   gremlin elsewhere is **not** elite. Confirm `respawnShackGuards()` produces elites too
   (call it directly on a shack and re-check).
5. **Kill → trophy drop**: script a `tryAttackEnemy` kill of an elite guard (or call
   `rollLoot()` + `spawnLooseDrop` path) and confirm a `gremlin_trophy` loose node
   appears and can be picked into the backpack; verify `onShackGuardKilled` still schedules
   the respawn only after both guards die.
6. **Totem recipe**: give the backpack 3 `gremlin_trophy` + 1 wood + 1 gremlin_guck, place
   a Workbench, and confirm
   the Gremlin Totem recipe is (a) discovered once its ingredients are owned, (b) craftable
   in Workbench range and blocked out of range, (c) references `gremlin_trophy: 3, wood: 1,
   gremlin_guck: 1` with no Light Armor gate. Then confirm the summoned boss flow still
   works end-to-end
   (Totem in hotbar → Boss Altar prompt → Gremlin King spawns).
7. `preview_console_logs` (level `error`) clean; `preview_screenshot` showing an elite
   next to a normal gremlin for the visual-distinctness confirmation.
