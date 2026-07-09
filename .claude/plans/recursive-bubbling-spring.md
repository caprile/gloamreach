# Combat depth pass: enemy AI polish, armor defense, weapon upgrades, playtest fixes

## Context

Fresh session picking up right after the Progression milestone shipped (`STATUS.md`,
`CLAUDE.md` roadmap item 5). The user played a session and came back with a batch of
items spanning three kinds of work: (1) enemy AI bugs (facing, Gremlin wander, water
spawns), (2) new combat-depth content (armor now has real defense numbers, weapons get
an upgrade-tier system like stations/armor already have, two new weapons), and (3) a
grab-bag of UI/placement bugs plus a documentation ask (a recipe dashboard) and a sprint
speed rebalance. None of this is in any existing plan file — this is a new batch, built
in one session across several independent milestones.

Confirmed with the user via `AskUserQuestion`: the Club upgrade path applies to **Stone
Club only** (Wood Club stays a fixed starter weapon).

Root causes already confirmed by reading the code directly (not guessed):
- **Gremlin/Snake "always facing the same direction"**: `Enemy.applyFacing()` only
  rotates the sprite when velocity magnitude > 3 (`src/entities/Enemy.ts:249-252`).
  Snake sits at velocity 0 while `hidden` (most of its lifetime) and RangedGremlin sits
  at velocity 0 while `idle` (no wander state at all, see next point) — so both spend
  most of the game showing whatever rotation they had at spawn (never explicitly set,
  defaults to unrotated). Boar/Gremling already wander and rotate fine.
- **Gremlins don't wander**: confirmed — `RangedGremlin.update()`'s `idle` branch
  (`src/entities/Gremlin.ts:88-95`) does nothing but check aggro radius; no wander target,
  no movement. `MeleeGremling` (lines 303-320) and `Enemy`/Boar (lines 220-238) both
  already have wander logic Gremlin lacks.
- **No-spawn-in-water**: `pickSpawnPoint()` (`src/scenes/MainScene.ts:944-963`) already
  supports an `avoidCreek` param that rejects candidates on creek/water cells
  (`this.biome.isCreekAt`), and resource nodes already pass `avoidCreek: true`
  (`spawnNodes`, lines 1050/1101/1108). But `spawnEnemies()` (lines 1198-1283) never
  passes it for Boar/Snake/Gremlin/Gremling — the water check exists, it's just not wired
  to enemy spawns. `pickSpreadSpawnPoint` (lines 971-989, used by Gremlin/Gremling) also
  doesn't forward the param to its internal `pickSpawnPoint` call yet.
- **Ghost placement bug**: `attemptPlaceObject()` (`src/scenes/MainScene.ts:1906-1973`)
  re-arms placement mode after every successful placement (by design, so multiple can be
  placed in a row) but never checks whether the just-consumed `itemSource` stack is now
  empty until the *next* click attempt. Placing your last owned Workbench/Drying Rack
  leaves a faded ghost sitting armed on the cursor until you click again — that's the
  "ghost workbench left on the map" report.
- **Gremlin Pants lvl2 "shows" before Workbench Lvl 2 exists**: read
  `UpgradeMenu.renderUpgradeRow()` and `MainScene.upgradeBlockReason()` — this is already
  working as designed (visible-but-blocked-with-reason, enforced at both click and
  apply time), consistent with the locked Milestone K decision that the whole upgrade
  path should stay visible so the player can see what's ahead. **No code bug found.**
  This item becomes "verify in preview, don't change the visibility model" — see below.
- **Inventory closing on placement**: `startItemPlacement()` (line 1855-1871) explicitly
  calls `this.inventoryMenu.close()`. Removing that call alone isn't quite safe though —
  the global placement click-handler (`pointerdown`, lines 293-319) only guards against
  clicking the hotbar/event-log/keybinds panels (`pointerOverHud()`, lines 594-600), not
  the `InventoryMenu` panel bounds, so a click meant to interact with the still-open
  inventory would fall through and place an object underneath it. Needs both changes
  together.
- **Ring range off by default**: `rangeRingEnabled = true` at `MainScene.ts:189` — flip
  to `false`.
- **Running rescale math**: `Skills.ts` currently has `BASE_SPRINT_MULTIPLIER = 1.15` and
  `RUNNING_SPRINT_BONUS_PER_LEVEL = 0.005` (+0.5%/level, reaching 1.65x at the level-100
  soft cap). The user wants 1.75x at level 0 climbing to 2.25x at the soft cap — that's a
  1.75->2.25 spread over 100 levels, i.e. **still exactly 0.005/level**. Only
  `BASE_SPRINT_MULTIPLIER` changes (1.15 -> 1.75); the per-level bonus constant and its
  tooltip text are untouched.

All new numeric constants below (armor defense values, weapon damage/costs, upgrade
costs) are first-pass/tunable, matching every other milestone's convention.

## Milestone 1 — Enemy AI: facing, Gremlin wander, no-spawn-in-water

- **`src/entities/Enemy.ts`** constructor: add `this.setRotation(Phaser.Math.FloatBetween(0, Math.PI * 2))`
  so every enemy (including Snake, which extends Enemy) starts with a randomized facing
  instead of a uniform default — fixes the "always facing the same direction" complaint
  for the common case of standing still (Snake hidden, Gremlin idle).
- **`src/entities/Gremlin.ts`** `RangedGremlin`: give it an idle wander state, anchored to
  its spawn point (store `spawnX`/`spawnY` from the constructor args). New constants
  `RANGED_WANDER_SPEED = 20`, `RANGED_WANDER_RADIUS = 70`. Unlike Boar/Gremling's
  incremental "drift from current position" wander (which can slowly walk away from
  spawn over a long session), pick each wander target directly within
  `RANGED_WANDER_RADIUS` of the stored spawn point (`spawnX + cos(angle)*r, spawnY +
  sin(angle)*r`) — guarantees it stays in "a small area around their spawn" per the
  request, and is simpler than porting the drift pattern. Same cadence as
  Boar/Gremling (new target every 2-4s idle). This also calls `applyFacing()` each tick
  while moving, which is what actually fixes the visible-rotation half of the complaint
  for Gremlins (they're idle far more often than aggro'd).
- **`src/scenes/MainScene.ts`** `spawnEnemies()`: pass `avoidCreek: true` to every enemy
  spawn point pick (Boar, Snake, RangedGremlin, MeleeGremling). Widen
  `pickSpreadSpawnPoint()`'s signature (line 971) to accept an `avoidCreek` param and
  forward it to its internal `pickSpawnPoint()` call (line 981), then pass `true` from
  the Gremlin/Gremling call sites (lines 1255, 1270).

## Milestone 2 — Armor defense numbers

- **`src/systems/Items.ts`**: add `armorDefense?: number` to `ItemDef`, set on the three
  Gremlin pieces (base/tier-0 values): Cap `2`, Shirt `4`, Pants `3`. Add an "Armor: N"
  entry to each piece's `stats` array (analogous to the existing "Damage" stat on
  weapons).
- **`src/systems/ArmorUpgrades.ts`**: add `defenseBonus?: number` to `ArmorUpgradeDef`.
  Set on the existing lvl2 defs: Cap `+2` (total 4), Shirt `+3` (total 7), Pants `+2`
  (total 5). Add `armorDefenseForTier(itemKey, tier): number` (base defense from
  `itemDef`, plus the matching upgrade's `defenseBonus` if `tier >= 1`) and
  `totalPlayerDefense(equipment: Equipment): number` (sums `armorDefenseForTier` across
  every `EquipSlot`) — both live here since this file already owns armor-upgrade domain
  logic; no changes needed to `Equipment.ts` itself (kept data-only, avoids a
  runtime-import cycle with `Items.ts`).
- **`src/scenes/MainScene.ts`** `applyDamageToPlayer()` (~line 1613): reduce incoming
  damage by `totalPlayerDefense(this.equipment)`, floored at 1 so no combination of
  armor ever grants full immunity: `const reduced = Math.max(1, Math.round(amount -
  totalPlayerDefense(this.equipment)))`. Per the user, this is a flat deduction applied
  to all damage today (everything currently dealt is physical — no magic/elemental
  damage exists yet, flagged inline as the spot to branch on damage type later).
- **`src/ui/Tooltip.ts`** `statValue()`: mirror the existing weapon "base (adjusted)"
  override for the new "Armor" stat label — `armorDefenseForTier(def.key, tier ?? 0)`
  shown as `"base (adjusted)"` once a piece is upgraded, same pattern as weapon damage.
  `show()` already threads `tier` through for the display name; extend that same param
  into `statValue()`.

## Milestone 3 — Weapon upgrade system (Stone Club, + 2 new weapons)

New file **`src/systems/WeaponUpgrades.ts`**, structurally identical to
`ArmorUpgrades.ts`/`StationUpgrades.ts`:
```ts
export interface WeaponUpgradeDef {
  id: string;
  name: string;
  description: string;
  appliesToItemKey: string;
  resultTier: number;
  costs: Partial<Record<ResourceType, number>>;
  damageBonus: number; // flat dmg added at this tier
}
export const WEAPON_UPGRADES: WeaponUpgradeDef[] = [...]
export function weaponUpgradesForItem(itemKey: string): WeaponUpgradeDef[]
export function weaponTierDamageBonus(itemKey: string, tier: number): number
```
"Lvl 1-3" per the user's phrasing means the base crafted weapon is already Lvl 1
(tier 0); each weapon gets **2** `WeaponUpgradeDef` entries (tier 1 -> "Lvl 2", tier 2 ->
"Lvl 3") — exactly mirrors how Gremlin armor's single lvl2 upgrade already works, just
one step further. Content (first-pass numbers):

| Weapon | Base dmg/cd/stam | Lvl2 | Lvl3 |
|---|---|---|---|
| Stone Club (existing, blunt) | 5 / 550ms / 14 | +2 dmg, `{wood:3, stone:3}` | +2 dmg, `{wood:5, stone:5, bones:3}` |
| Bone Knife (new, slash) | 4 / 350ms / 8 | +1 dmg, `{bones:5}` | +2 dmg, `{bones:8, gremlin_blood:2}` |
| Primal Spear (new, pierce) | 8 / 650ms / 16 | +2 dmg, `{wood:3, stone:2, bones:3}` | +3 dmg, `{wood:5, stone:4, gremlin_blood:3}` |

- **`src/systems/Weapons.ts`**: add `bone_knife`/`primal_spear` to `WeaponType`, and to
  `WEAPON_DAMAGE_TYPES` (`["slash"]` / `["pierce"]` respectively — deliberately fills the
  two weapon-damage-type skills that currently have zero XP sources, per
  `CLAUDE.md`'s Progression section), `WEAPON_DAMAGE`, `WEAPON_COOLDOWN_MS`,
  `WEAPON_STAMINA_COST` per the table above.
- **`src/systems/Items.ts`**: add `bone_knife`/`primal_spear` ItemDefs (pattern: copy
  `stone_club`'s shape — `weapon:`, `maxStack: 1`, `hotbarable: true`, stats block).
- **`src/systems/Recipes.ts`**: `bone_knife` — tier 0, `{bones: 4}`, no skill requirement
  (mirrors Wood Club, the other tier-0 starter weapon — first-ever slash weapon, nothing
  to gate on yet). `primal_spear` — tier 1 (workbench-gated), `{wood: 4, stone: 2,
  leather: 1}`, **also no skill requirement** — unlike Stone Club's `blunt: 3` gate
  (reachable "for free" from the pre-existing Wood Club), there is no pre-existing pierce
  weapon, so gating Primal Spear behind a pierce level would be permanently uncraftable.
  This is a deliberate deviation from the Stone Club precedent, called out explicitly.
- **Tier tracking for weapons** — reuses the existing generic `ItemStack.tier` field
  (already used by placeables and armor), no new data model needed. `recomputeEquipped()`
  (`MainScene.ts:569-573`) additionally reads the selected hotbar slot's `stack.tier ??
  0` into a new `equippedWeaponTier: number` field. `tryAttackEnemy()` (~line 1520) adds
  `weaponTierDamageBonus(this.equippedWeapon, this.equippedWeaponTier)` to the base
  damage before applying the existing skill multiplier.
- **Right-click-to-upgrade for weapons** — currently right-click on a plain backpack/
  hotbar item is a no-op (`InventoryMenu.ts:280`, `HotbarUI.ts:103`, per the last
  playtest batch's "right-click reserved for context menus" decision). Add one more
  branch: right-click a slot holding a weapon with `weaponUpgradesForItem(key).length >
  0` opens the existing `UpgradeMenu` (reusing the exact same panel armor/station
  upgrades already use) instead of no-op. This needs `UpgradeMenu`'s `UpgradeDef` union
  widened to `StationUpgradeDef | ArmorUpgradeDef | WeaponUpgradeDef`, and
  `MainScene`'s upgrade-target tracking (currently keyed on either a placed `Image` or an
  `EquipSlot`, see `openContextMenuForObject`/`openArmorContextMenu`,
  `upgradeTarget`-style fields around line 2049-2217) widened to a third case: `{kind:
  "weapon", container: ItemContainer, index: number}`. Applying deducts cost and does
  `container.set(index, { ...stack, tier: upg.resultTier })` (no new `ItemContainer`
  method needed — `set()` already takes a whole stack). `stationDisplayName()`
  (`StationUpgrades.ts:48`) gains one more OR-clause checking
  `weaponUpgradesForItem(itemKey)` so a tiered weapon's tooltip/name reads "Stone Club
  Lvl 2" the same way stations/armor already do.

## Milestone 4 — Upgrade menu delta display ("+2 Armor" / "+2 Damage")

- Add an optional `deltaLabel?: string` to `ArmorUpgradeDef` and `WeaponUpgradeDef`
  (authored directly per entry, e.g. `"+2 Armor"` / `"+1 Damage"` — simplest approach,
  avoids building generic cross-shape stat-diffing logic for three different def types).
  `StationUpgradeDef` gets the same optional field but it stays unset for Tool Sharpener
  (which has no direct numeric effect, just unlocks a gate).
- **`src/ui/UpgradeMenu.ts`** `renderUpgradeRow()` (lines 165-203): insert a new text line
  between the cost line (`rowY + 26`) and the description (`rowY + 42`) showing
  `upg.deltaLabel` in green (`#8fe38f`) when present, shifting the description/row-height
  math down by one line's worth (~16px) to keep the existing "measure real height" panel
  pattern intact (see the dynamic-row-height convention already used here).

## Milestone 5 — Bug fixes batch

a. **Ghost placement bug** — in `attemptPlaceObject()`, after the placement fully
   completes (end of the function, after `this.hotbarUI.refresh()`), add: if
   `itemSource` was used and `itemSource.container.count(itemSource.key) < 1`, call
   `this.cancelPlacement()` immediately instead of waiting for the next click to notice.
b. **All lvl-2 Gremlin armor requires Workbench Lvl 2** — add `requiresWorkbenchTier: 1`
   to `gremlin_cap_lvl2` and `gremlin_shirt_lvl2` in `ArmorUpgrades.ts` (currently only
   `gremlin_pants_lvl2` has this; the block-reason plumbing already exists and needs no
   other changes since it's `UpgradeDef`-generic).
c. **Gremlin Pants recipe-visibility "bug"** — no code change; verify via `preview_eval`
   during the verification pass that the row shows greyed-with-reason (not clickable)
   until a Workbench reaches tier 1, confirming the existing behavior matches intent.
d. **Inventory stays open during placement** — remove `this.inventoryMenu.close()` from
   `startItemPlacement()`. Widen the placement-mode branch of the global `pointerdown`
   handler (`MainScene.ts:307-311`) to also bail out (without placing) when
   `this.inventoryMenu.isOpen() && this.inventoryMenu.containsPoint(pointer.x,
   pointer.y)` — mirrors the existing `containsPoint` guard pattern already used
   elsewhere (line 774). This lets a player place several items in a row (crafted or
   from an owned stack) without the inventory closing each time, while clicks on the
   still-open panel itself don't accidentally place through it.
e. **Ring range off by default** — flip `rangeRingEnabled = true` to `false`
   (`MainScene.ts:189`).
f. **Running/walking rescale** — `Skills.ts`: `BASE_SPRINT_MULTIPLIER` 1.15 -> **1.75**.
   `RUNNING_SPRINT_BONUS_PER_LEVEL` (0.005) is unchanged — the math already lands
   exactly on 2.25x at the level-100 soft cap. No tooltip text needs updating (it
   already just says "+0.5% sprint speed per level").

## Milestone 6 — Recipe/upgrade dashboard doc

New **`RECIPES.md`** at the repo root (alongside `CLAUDE.md`/`STATUS.md`), hand-authored
markdown tables generated by reading the current `Recipes.ts`/`ArmorUpgrades.ts`/
`StationUpgrades.ts`/`WeaponUpgrades.ts`/`Processing.ts` at write time:
- **Recipes** table: name, category, tier (+ "Requires Workbench" flag), costs, required
  skills, output.
- **Station Upgrades**, **Armor Upgrades** (with defense numbers), **Weapon Upgrades**
  (with damage numbers) tables: base item, tier reached, costs, extra gates (e.g.
  Workbench-tier requirements), delta.
- **Processing (Drying Rack)** table: input -> output ratio.

A short maintenance note at the top: this file is a hand-maintained snapshot, not
generated — update it whenever `Recipes.ts`/`*Upgrades.ts`/`Processing.ts` change. Add
one line to `CLAUDE.md`'s "Working conventions" section pointing at it, mirroring the
existing "Plans must be committed in-repo" convention entry, so future sessions know to
keep it in sync.

## Verification

1. `node node_modules/typescript/bin/tsc --noEmit` after each milestone.
2. `preview_start` ("dev"), then `preview_eval` against
   `window.__game.scene.getScene('MainScene')` for the logic-heavy pieces:
   - Spawn a RangedGremlin, leave it idle, and sample its rotation/position over several
     seconds to confirm it wanders and rotates within `RANGED_WANDER_RADIUS` of spawn.
   - Confirm `spawnEnemies()`'s live roster has zero enemies with `biome.isCreekAt(x, y)`
     true.
   - Force-equip full tier-0 and tier-1 Gremlin armor sets and call
     `applyDamageToPlayer()` directly to confirm the flat-deduction math (floor of 1).
   - Right-click-upgrade a Stone Club/Bone Knife/Primal Spear through all tiers and
     confirm `tryAttackEnemy()`'s live damage output includes the tier bonus.
   - Reproduce the ghost-placement bug's old repro (single owned Workbench, place it) and
     confirm placement mode now exits cleanly with no residual ghost.
   - Confirm Gremlin Pants/Cap/Shirt lvl2 all show "Requires nearby Workbench Lvl 2" when
     only a tier-0 Workbench is nearby, and unlock once one reaches tier 1.
   - Confirm placing an item from an open inventory leaves `inventoryMenu.isOpen()` true,
     and that clicking inside the still-open panel doesn't place an object.
   - Sample sprint speed at Running lvl 0 (~166 px/s) and the lvl-100 soft cap (~214
     px/s).
3. `preview_screenshot` to confirm the UpgradeMenu's new delta line renders without
   overlapping the row below (reuses the existing measured-row-height pattern), and that
   the game boots cleanly with the new weapons visible once crafted.
4. Check `preview_console_logs` (level `error`) for runtime errors throughout.
