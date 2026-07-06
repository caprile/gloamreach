# Placement mode for build/placeable items

## Context

Right now every recipe output — tools, weapons, resources, and "build" items like
the campfire — lands unconditionally in the backpack via `MainScene.craftRecipe()`
(`src/scenes/MainScene.ts:407-422`). There's no concept of a world-placed object;
`campfire` is just a normal stackable `ItemDef` (`src/systems/Items.ts:123-131`)
indistinguishable in structure from `shishkabob`.

The user wants build/placeable items (campfire today, more building pieces later)
to skip the backpack entirely. Instead of "Craft", the button says **"Place"**,
which enters a **placement mode**: a ghost preview follows the cursor (clamped to
a radius around the player), LMB commits the placement (only then are materials
deducted and a world object spawned), RMB cancels for free. After a successful
placement, the mode stays active so the next one can be placed immediately,
until the player cancels or runs out of materials.

Because materials are only spent at the moment of LMB placement (not at the
"Place" click), there's nothing to destroy-and-drop on cancel — so this doesn't
need the loose-world-drop system (Milestone 3, not yet built) at all. That concept
is deferred until "destroying already-placed build pieces" becomes a feature.

Reach precedent: gathering interaction already uses `REACH = 64` px
(`MainScene.ts:29`, `Phaser.Math.Distance.Between`). Placement radius is a
sibling constant, `PLACEMENT_RADIUS = REACH * 1.25` (80px) — started at
`REACH * 2.5` (160px, "2-3x" per the original ask) and was halved after
hands-on testing felt too permissive. Named for easy tuning later.

## Design decisions locked in with the user

- Out-of-range cursor: ghost **clamps to the radius edge** (always placeable),
  not blocked.
- No overlap/collision checks for this pass — place anywhere in range.
- Multi-quantity flow: crafting a placeable does **not** deduct cost or add to
  backpack up front. Hitting "Place" just enters placement mode for that recipe.
  Cost is deducted per-unit, only on each successful LMB placement. After each
  placement the mode re-arms automatically (ghost keeps following the cursor) so
  the player can keep placing without reopening the crafting menu — this *is*
  the "ask to place another" behavior, expressed as the persisting prompt/ghost
  rather than a separate confirm dialog. Running out of materials mid-loop
  auto-cancels with an event-log message. Flagging this interpretation
  explicitly in case a literal confirm popup was intended instead.
- RMB cancel, Escape, and Tab (in addition to opening the inventory) all cancel
  placement mode outright — free, nothing to destroy since nothing was spent yet.
- Movement is not restricted during placement mode (consistent with how menus
  don't block movement today) — the radius is recomputed live off the player's
  current position each frame, so walking is the natural way to reposition it.

## Implementation

**`src/systems/Items.ts`**
- Add `placeable?: boolean` to the `ItemDef` interface (~line 12-21).
- Set `placeable: true` on the `campfire` def (~line 123-131). Future building
  pieces set this explicitly too — it's per-item, not inferred from category.

**`src/systems/Recipes.ts`**
- Add a small helper next to `outputKey()` (~line 104-106):
  `isPlaceableRecipe(recipe): boolean` — true iff `recipe.output.kind === "item"`
  and `ITEM_DEFS[recipe.output.itemId]?.placeable`. Shared by `CraftingMenu` and
  `MainScene` so the rule lives in one place.

**`src/ui/CraftingMenu.ts`**
- Add `startPlacement(recipe: Recipe): void` to the menu's `deps` interface.
- In the craft button handler (~line 227-243): if `isPlaceableRecipe(recipe)`,
  label the button "Place" instead of "Craft"; on click call
  `this.deps.startPlacement(recipe)` then `this.close()` (existing method,
  ~lines 80-93) instead of the current `deps.craft(recipe)` + in-place re-render.
  Non-placeable recipes keep today's behavior unchanged.

**`src/scenes/MainScene.ts`** — the bulk of the new logic
- New constant `PLACEMENT_RADIUS = REACH * 2.5` near `REACH` (line 29).
- New state: `placementMode: { recipe: Recipe } | null`, `placementGhost?:
  Phaser.GameObjects.Image`, `placedObjects: Phaser.GameObjects.Image[] = []`
  (plain visual objects for now — no interaction/collision, matching "minimal
  now" scope; a real placed-object entity can come later alongside the
  destroy-for-pieces feature).
- `startPlacement(recipe)`: sets `placementMode`, spawns `placementGhost` via
  `this.add.image(x, y, ITEM_DEFS[key].texture).setAlpha(0.5)` at the current
  clamped cursor position.
- `cancelPlacement()`: destroys the ghost, clears `placementMode`, clears the
  prompt text.
- `updatePlacementGhost()` (called from `update()` when `placementMode` is set,
  in place of `updateHover()`): reads `this.input.activePointer` world position,
  clamps the vector from the player to `PLACEMENT_RADIUS`, repositions the ghost,
  and sets `promptText` to `[LMB] Place <name> / [RMB] Cancel` (reusing the
  existing fixed bottom-right `promptText` object from `createHud()`,
  lines 446-459 — no new HUD element).
- `attemptPlaceObject()` (LMB while in placement mode, guarded by the existing
  `pointerOverHud()` check, lines 173-178): re-check
  `this.crafting.canAfford(recipe, this.backpack)`; if false, log "Out of
  materials for X" and `cancelPlacement()`. If true, call
  `this.crafting.craft(recipe, this.backpack)` (deducts cost, existing method,
  `Crafting.ts:42-48`), push a new `this.add.image(...)` at the ghost's current
  position into `placedObjects`, refresh HUD/inventory, and leave placement mode
  active (ghost keeps following the cursor for the next one).
- Wire into `update()` (~143-146): branch on `placementMode` to call
  `updatePlacementGhost()` instead of `updateHover()`.
- Wire into the `pointerdown` handler (~85-89): branch on `placementMode` —
  left button → `attemptPlaceObject()`, right button → `cancelPlacement()` —
  instead of `tryInteract()`.
- Guard the Escape/Tab/T key handlers (~120-131) with an early
  `if (this.placementMode) { this.cancelPlacement(); return; }` so they cancel
  placement instead of toggling a menu while placing.

## Post-review fixes

Two issues surfaced in hands-on testing after the initial implementation:

- **The "Place" click itself was placing the object.** Phaser fires both the
  button's own `pointerdown` handler and the scene-wide generic `pointerdown`
  event for the same underlying click. Since `startPlacement` set
  `placementMode` synchronously before the scene-wide handler ran, that same
  click was then read as the first placement click, planting the item right
  where "Place" was clicked. Fixed with a one-shot
  `suppressNextPointerdown` flag, set in `startPlacement()` and consumed at
  the top of the scene's `pointerdown` listener — it swallows exactly the
  click that entered placement mode, so a genuinely separate LMB is required
  to place.
- **Placement hint text was unreadable behind the hotbar.** It had been
  reusing the shared bottom-right `promptText` (reserved for gather prompts
  per the CLAUDE.md rule), which sat too close to the hotbar. Split into its
  own `placementHintText`, small (12px), positioned at `(12, 30)` — directly
  under the top-left controls line, clear of both the hotbar and the
  `[T] Craft` tab.

## Verification

1. `node node_modules/typescript/bin/tsc --noEmit` — type-check.
2. `preview_start` (config `"dev"`), `preview_screenshot` to confirm boot.
3. Via `preview_eval` against `window.__game.scene.getScene('MainScene')`:
   - Grant enough wood/stone for a campfire, open the crafting menu, confirm the
     campfire row's button reads "Place".
   - Call the equivalent of clicking Place; assert `placementMode` is set, a
     `placementGhost` exists, and the crafting menu closed.
   - Set the pointer/mouse position far from the player and call
     `updatePlacementGhost()`; assert the ghost's distance from the player is
     clamped to `PLACEMENT_RADIUS`.
   - Simulate LMB (`attemptPlaceObject()`); assert backpack wood/stone decreased
     by the recipe cost, `placedObjects` gained an entry at the expected
     position, and `placementMode` is still active (re-armed for another).
   - Simulate RMB (`cancelPlacement()`); assert `placementMode` is cleared, the
     ghost is destroyed, and no materials were deducted for the cancelled one.
   - Confirm Escape/Tab while `placementMode` is active cancels rather than
     opening the inventory/crafting menu.
4. `preview_console_logs` (level `error`) — confirm no runtime errors.
