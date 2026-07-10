# Playtest fixes batch: boss HUD/hitbox, chest take-all, 2nd hotbar row

## Context

Fresh session picking up right after the Boss Altar + Gremlin King milestone shipped
(`.claude/plans/lexical-sleeping-journal.md`, `STATUS.md`, `CLAUDE.md` roadmap item 5c).
The user played the first real boss fight and came back with a batch of independent
playtest-driven asks — applied directly without a separate EnterPlanMode/ExitPlanMode
round (each item was small/unambiguous from the request itself), except one genuinely
open design question (the 2nd hotbar row) which got its own `AskUserQuestion` round
before any code changed:

1. Boss HP/poise bar needs to be big and at the top of the screen, Elden Ring/Valheim
   style (existing bars were the small floating world-space kind every enemy gets).
2. A "Take All" action for an open chest, auto-stacking into the backpack; Ctrl+Left-
   Click should behave like double-click everywhere in inventory/chests/processors.
3. Boss hitbox feels wrong — attacks that look like they should land don't.
4. Trees render in front of the hotbar; should always be behind it.
5. Boss Altar should show on the minimap once discovered.
6. Gremlin Totem's description spoils what it summons — should only describe the item.
7. Inventory should show live equipped-combat stats (damage/attack speed/attack
   stamina/armor).
8. A destroyed-then-rebuilt Workbench shouldn't re-lock recipe discovery the player
   had already unlocked (reported via a concrete repro: built a Lvl 2 Workbench,
   discovered nothing new yet, broke it, picked up a newly-needed ingredient — no
   discovery toast fired even though the recipe should already be "known reachable").
9. Explore a 2nd hotbar row dedicated to crafting stations/processors, with loose-
   station auto-pickup defaulting there instead of the backpack.

Locked via `AskUserQuestion` for item 9 (do not re-litigate without asking again):
- **Alt+1-9** selects row 2 directly (not click-only/scroll-only — the user's stated
  preference, confirmed feasible via `event.altKey` on the existing `keydown-<KEY>`
  handlers).
- Row 2 is **9 slots**, mirroring row 1's width exactly.
- Scroll wheel **spans both rows by default**; a new toggle key restricts it to the
  current row only, so a player who dislikes the wheel jumping rows can turn it off.

## Changes shipped

- **`src/scenes/MainScene.ts` HUD depth fix**: the hotbar, minimap, HP/stamina/XP bars,
  and hover/placement prompt text all used `setDepth()` values under `WORLD_H` (2688) —
  `HotbarUI`/`MinimapUI` at 2500-2502, the HUD bars/prompts at 2000-2002. A world object
  near the bottom of the map (`setDepth(y)`, trees/enemies) could render on top of them.
  Bumped to 2900-2902 (Hotbar/Minimap) and 2800-2802 (HP/stamina/XP bars, prompts) —
  still below `CraftingMenu`/`InventoryMenu`'s 3000-3002 and `Tooltip`'s 4500-4501, so
  every existing draw-order relationship between UI panels is unchanged.
- **`src/entities/GremlinKing.ts` + `src/scenes/MainScene.ts` boss reach fix**: flat
  `REACH` (64px) was tuned around the roster's normal ~20-26px sprites; the boss's
  40x48 base sprite at `BOSS_SCALE` 2.4x has a ~58px half-height, leaving almost no
  actual reach past its own visible edge. New `MainScene.enemyReach(enemy)` scales
  reach by however much an enemy's `displayWidth/displayHeight`-derived radius exceeds
  a 13px baseline — generic by sprite size, not a Gremlin-King-specific branch. Used by
  both `promptForEnemy()` and `tryAttackEnemy()` so the "you can attack" prompt and the
  actual hit-check agree.
- **New `src/ui/BossHealthUI.ts`**: fixed top-of-screen HP bar (red) + poise bar (gold)
  stacked underneath, boss name above, all `scrollFactor(0)`/depth 2950-2951. `update()`
  takes the `GremlinKing | null` instance directly and gates visibility on
  `!depleted && isEngaged()` — a new public `GremlinKing.isEngaged()` mirrors the
  existing protected `isAggro()` for this purpose. `BOSS_MAX_POISE` exported from
  `GremlinKing.ts` so the UI doesn't hardcode it. Wired into both branches of
  `MainScene.update()` (normal and frozen-on-death) alongside the other ambient HUD
  updates. The existing small floating world-space HP/poise bars (`Enemy`/`GremlinKing`)
  are untouched — both now show simultaneously, not a replacement.
- **Minimap Boss Altar landmark**: `Fog.ts`'s `REVEAL_RADIUS` exported; new
  `BossAltar.discoveredOnMap` flag (mirrors `summoned`/`bossDefeated`); new
  `MinimapUI.revealLandmark(worldX, worldY, color?)` burns a small marker into the
  minimap's `RenderTexture` terrain layer (same incremental-draw idiom fog reveals
  already use) the first time the player comes within `REVEAL_RADIUS` of an altar
  (`MainScene.updateAltarDiscovery()`, called from both `update()` branches). A
  discovered fixed structure, not a live entity blip — keeps the minimap's
  already-locked "no entity blips" rule intact (this is "revealed terrain you found,"
  conceptually, not a tracker).
- **Gremlin Totem description**: `Items.ts` and `Recipes.ts` both changed from
  "...summons its guardian"/"Summons the Gremlin King at the Boss Altar" to "...Its
  purpose becomes clear at the Boss Altar's fire" — describes the totem, not the
  outcome. `RECIPES.md`'s dev-reference row is untouched (not player-facing, the
  spoiler concern doesn't apply there).
- **Equipment stats panel**: `InventoryMenu.ts` gained a new `CombatStatsView`
  interface + `combatStats: () => CombatStatsView` dep, rendered as a 3rd "Combat"
  column beside Backpack/Equipment (widened `PANEL_W`). `MainScene.combatStats()`
  computes weapon name/damage/attack-speed/stamina-cost (mirroring `Tooltip.ts`'s
  existing "base (adjusted)" math exactly — same skill/progression multipliers) plus
  `totalPlayerDefense(this.equipment)` for total armor. New `equippedWeaponName` field
  set alongside `equippedWeapon`/`equippedWeaponTier` in `recomputeEquipped()` (the
  weapon type alone doesn't carry a display name).
- **Workbench discovery persistence bug fix**: `hasWorkbenchPlaced()` checked
  `this.placedObjects` (currently placed), so destroying the only Workbench re-locked
  every tier-1+ recipe's *discovery* even though the player had already unlocked it —
  discovery is meant to be a one-way ratchet, same as ingredient-known tracking. New
  sticky `MainScene.everPlacedWorkbench` field, set `true` (never reset) the moment a
  Workbench is placed; `hasWorkbenchPlaced()` now just returns it.
  `isNearWorkbench()`/`isNearWorkbenchAtTier()` (proximity, not discovery) are
  untouched and still correctly read live `placedObjects` state.
- **Chest Take All + Ctrl-click quick-move**:
  - New **R** keybind (`MainScene.takeAllFromChest()`) — while a chest is open, moves
    every stack into the backpack via `ItemContainer.add()` (auto-stacks onto existing
    backpack stacks first) for plain stacks, `addStack()` for any tiered stack (none
    exist in the shack loot table today, but the loop is written generically); leftover
    that doesn't fit stays in the chest. `ChestMenu.ts` shows a `[R] Take All` hint in
    the chest column header.
  - New `MainScene.isCtrlClick(pointer)` / `isQuickMoveClick(pointer, key)` — the
    latter is `isDoubleClickInPlace(key) || isCtrlClick(pointer)`, still running the
    double-click bookkeeping either way. Swapped into the existing hotbar-select and
    backpack click-in-place branches in `resolveItemDrag()`.
  - **New** click-in-place quick-move support (previously only reachable via manual
    drag) added to the Drying Rack's own backpack grid (double-click/Ctrl-click
    quick-loads into the rack input, mirroring the existing right-click `quickLoad`)
    and to the Chest menu's own backpack grid AND the chest grid itself (double-click/
    Ctrl-click quick-moves a stack to the other side via `ItemContainer.findAssignable`).
- **Second hotbar row**: `src/systems/Hotbar.ts` now exports `ROW1_COUNT`/`ROW2_COUNT`
  (9/9) and its `SLOT_COUNT` is their sum (18) — one flat `ItemContainer`/
  `selectedSlot`, row 2 is purely a UI/routing convention. `HotbarUI.ts` rewritten to
  render two stacked rows (row 2 below row 1, closest to the screen edge; row 1 shifts
  up to make room, so `HotbarUI.top` — what the HP/stamina/XP bars anchor above — moves
  with it automatically) with a distinct green-tinted border + amber slot numbers for
  row 2. `MainScene.ts`: `HOTBAR_KEYS`' `keydown-<KEY>` handlers now check
  `event.altKey` to pick row 1 vs row 2 (`ROW1_COUNT + i`). New
  `wheelSpansBothRows` field (default `true`) + **H** toggle
  (`toggleWheelSpansBothRows()`); `cycleHotbar()` branches on it (full 18-slot wrap vs.
  looping within the current row only). New `findHotbarSlotFor(key)`/
  `hotbarRow2Assignable(key)` — a placeable prefers an empty row-2 slot first, falling
  back to the normal `findAssignable()` (which may land in row 1) if row 2 is full;
  wired into both `quickMoveItem()`'s backpack->hotbar path and `collectNode()`'s
  loose-pickup routing (checked before the existing tiered/non-tiered backpack-credit
  branches, so both a fresh station drop and a Destroy-recovered tiered one route the
  same way).

## Verification

Type-check clean (`tsc --noEmit`), production build clean (`npm run build`). Verified
live via `preview_eval`/`preview_screenshot` against the running dev server:
- Forcing `GremlinKing.aggroed = true` shows the new top HUD bar with correct HP/poise
  fractions; clearing it hides the bar again.
- A scripted `takeAllFromChest()` empties a chest with mixed loot into the backpack.
- A scripted pointer with `event.ctrlKey = true` quick-moves a stack backpack<->hotbar
  and both directions of the chest menu, matching what double-click already does.
- The two-row hotbar screenshot shows row 2 with a distinct green-tinted border;
  `selectHotbarSlot(9 + 2)` (simulating Alt+3) selects the row-2 slot and engages
  placement mode for the placeable there.
- A simulated loose `drying_rack` pickup (`collectNode`) lands in hotbar row 2 first;
  filling row 2 first makes the next pickup fall back to the backpack correctly.
- `cycleHotbar()` loops within the current row when `wheelSpansBothRows` is toggled
  off, and spans both rows again once toggled back on.
- `preview_screenshot` confirms the minimap shows a discovered-altar landmark dot and
  the boss HUD bar renders top-center with no overlap against other HUD elements.

## Docs updated

`CLAUDE.md` (new "5d." roadmap entry, Controls section additions for Alt+1-9/H/R/
Ctrl-click) and `STATUS.md` (new dated entry, this file linked as the plan).
