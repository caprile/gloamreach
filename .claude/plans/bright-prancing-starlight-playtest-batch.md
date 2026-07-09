# Playtest fixes batch: Gremlin Guck processing, bigger map, crafting-menu stats, Place context menu, level-up banner

## Context

Fresh session picking up right after the Combat depth pass shipped
(`.claude/plans/recursive-bubbling-spring.md`, `STATUS.md`, `CLAUDE.md` roadmap item 5's
same-day follow-up). The user played a session and came back with six independent
playtest-driven asks — no single theme, applied directly without a separate
EnterPlanMode/ExitPlanMode round since each item was small and unambiguous from the
request itself:

1. Bone Knife should cost 1 Leather + 4 Bones and require a Workbench.
2. Spear should also require a Workbench (already did — tier 1, confirmed not changed).
3. Recipes that spend raw Gremlin Blood should spend a new **Gremlin Guck** instead,
   produced at the Drying Rack (raw blood -> guck, 2:1).
4. The Player Level-up notification needs to be far more visible/eye-catching (not
   intrusive, but impossible to miss).
5. Weapon/armor recipes' Damage/Armor numbers need to show up in the crafting menu
   detail panel (today only the owned-item Tooltip shows this).
6. Backpack placeables need a right-click "Place" context-menu option, not just the
   existing single-left-click-in-place path.
7. The map needs to be bigger — a playtest ran out of enemies/resources before finishing
   everything the player wanted to craft.

## Changes shipped

- **`Recipes.ts`**: `bone_knife` recipe changed from `{tier: 0, costs: {bones: 4}}` to
  `{tier: 1, costs: {leather: 1, bones: 4}}`. `primal_spear` was already `tier: 1`
  (workbench-gated) — confirmed via read, no change needed.
- **New `ResourceType`/item: `gremlin_guck`** (`Inventory.ts`, `Items.ts`,
  `icon_gremlin_guck` texture in `BootScene.ts` — a dark rendered-down blob, visually
  distinct from Gremlin Blood's droplet). New `Processing.ts` `PROCESS_RECIPES` entry:
  `{ input: "gremlin_blood", output: "gremlin_guck", inputPerOutput: 2 }`, mirroring the
  existing cattail->twine and gremlin_skin->gremlin_leather entries exactly (same
  `ProcessingStation`/`DryingRackMenu` machinery, no new code needed there).
  `WeaponUpgrades.ts`'s `bone_knife_lvl3` and `primal_spear_lvl3` costs switched from
  `gremlin_blood` to `gremlin_guck` — raw blood is no longer a direct crafting
  ingredient anywhere, only a Drying Rack processing input.
- **`MainScene.showLevelUpBanner(level, points)`**: new method, called from the existing
  `this.progression.onLevelUp()` listener alongside the pre-existing EventLog line and
  stat-points badge refresh (additive, not a replacement). Big centered "LEVEL UP!" +
  "Level N • +N Stat Points" text, `Back.easeOut` punch-in scale/alpha tween, holds
  ~1.7s, fades over 450ms and destroys itself — plus a brief
  `cameras.main.flash(180, 90, 70, 20)`. `scrollFactor(0)`, depth 6000, no
  `setInteractive()` — deliberately non-blocking, doesn't intercept clicks or pause
  anything.
- **`CraftingMenu.ts`**: new `CraftingMenuDeps.skills: Skills` field (threaded from
  `MainScene.createCraftingMenu()`, which already had `this.skills`). New private
  `statValue(def, stat)` method — mirrors `Tooltip.ts`'s method exactly for the
  "Damage"/"Armor" cases, minus the tier-adjustment math (a freshly crafted item is
  always tier 0 / "Lvl 1", so no owned-instance tier to read). `renderDetail()` now
  renders `def.stats` lines (cyan, `#9adfff`) right after the description, before the
  cost lines.
- **`InventoryMenu.ts` / `MainScene.ts`**: new `InventoryMenuDeps.openPlaceContextMenu`
  dep. The backpack-slot right-click handler now branches three ways: weapon -> existing
  Upgrade panel, placeable -> new one-row `ContextMenu` popup ("Place"), anything else ->
  no-op (unchanged). `MainScene.openPlaceContextMenu()` just calls the pre-existing
  `startItemPlacement(container, index)` — no new placement logic, just a second,
  explicit/discoverable entry point alongside the already-shipped
  single-left-click-in-place path (which stays as-is, deferred behind the double-click
  window).
- **Map size**: `MainScene.ts` `WORLD_W`/`WORLD_H` 80x60 -> 112x84 tiles (2560x1920 ->
  3584x2688px, ~2x area). Every fixed spawn/scatter count in `spawnEnemies()`/
  `spawnNodes()` scaled up ~1.8-2x to match: Boar 12->24, Snake 15->28, RangedGremlin
  12->22, Gremling 4->8, Cattail 22->42, Branch 40->76, Rock 30->56, Tree(forest)
  70->132, Tree(grassy) 14->26, Boulder 18->34, Blackberry-bush total 16->30.
  Density-tuning constants (cluster radius/max spacing, aggro/deaggro radii, etc.) were
  deliberately left untouched — only raw counts changed, since the map itself grew
  proportionally and those constants are about *local* crowding, not total population.

## Verification

Type-check clean (`tsc --noEmit`). Verified live via `preview_eval` against the running
dev server:
- `physics.world.bounds` reports 3584x2688.
- Placing a fake Workbench + discovering `leather`/`bones` makes Bone Knife discoverable
  in the crafting menu; its detail panel renders `"Damage: 4"` above `leather: /1` and
  `bones: /4` cost lines.
- Discovering `gremlin_leather`/`blackberry` makes Gremlin Cap discoverable; its detail
  panel renders `"Armor: 2"`.
- Right-clicking a backpack slot holding a `campfire` stack opens a `ContextMenu` with a
  single `"Place"` row; invoking it (`startItemPlacement`) sets `placementMode` and
  spawns the placement ghost.
- Triggering `progression.addXp()` past a level threshold creates a "LEVEL UP!" text
  object at `alpha: 0, scale: 0.3` (i.e. the tween's start state, captured
  synchronously) which is fully destroyed ~3s later once the fade-out tween completes.

## Docs updated

`RECIPES.md` (Bone Knife's row + tier, the two weapon-upgrade cost cells, new
Processing table row) and `STATUS.md` (new dated entry, this file linked as the plan).
