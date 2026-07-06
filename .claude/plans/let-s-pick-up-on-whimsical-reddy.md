# M1 polish: HUD cleanup, hotbar tooltips, inventory layout

## Context

Milestone 1 of the inventory overhaul (unified `ItemContainer` model) is done
and working. Before starting Milestone 2 (resource health/tool damage), the
user wants to polish the UI that M1 left rough:

- The top-left HUD text (`Wood: X  Stone: Y  Tool: Z`) is redundant now that
  items live visibly in the hotbar/backpack grid — it's just noise.
- Hotbar slots show icons but no info-on-hover, unlike the backpack grid,
  which is an inconsistent experience.
- The inventory panel stacks equipment above the backpack grid, wasting
  horizontal space and capping the grid at 5x4.
- The always-visible controls reminder line overlaps the inventory panel's
  top edge.

Canvas is 800x600 (`src/main.ts`). All layout numbers below assume this.

## 1+2. Remove the top-left HUD text (wood/stone/tool)

File: [MainScene.ts](src/scenes/MainScene.ts)

- Delete the `private hudText!: Phaser.GameObjects.Text;` field.
- In `createHud()`, delete the `this.hudText = this.add.text(12, 10, "", {...})` block.
- Strip `refreshHud()` down to just its other side effects (it's called from
  `recomputeEquipped()`, `tryInteract()`, `craftRecipe()` — keep the name,
  renaming is pure churn):
  ```ts
  private refreshHud(): void {
    this.craftingMenu?.refresh();
    this.inventoryMenu?.refresh();
  }
  ```
  Delete the `toolLabel` const and the `hudText.setText(...)` call.

## 5. Move the controls line up

File: [MainScene.ts](src/scenes/MainScene.ts), `createHud()`

- Move the "Move: WASD / Arrows ..." text from `(12, 36)` to `(12, 10)` (same
  fontSize/style). Update the stale comment above it (referenced the now-gone
  hudText line) to something like "Top-left static controls reminder."
- `PANEL_Y = 48` in `InventoryMenu.ts` needs no change — at fontSize 14 the
  controls text is ~18px tall (y=10 to ~28), leaving 20px clearance to
  `PANEL_Y=48`. That clearance is what fixes the reported overlap (previously
  the line sat at y=36, nearly touching the panel).

## 3. Shared Tooltip class, wired into HotbarUI

### New file: `src/ui/Tooltip.ts`

Extract `InventoryMenu`'s existing `showTooltip`/`hideTooltip`/`tooltip[]`
logic into a standalone class so both `InventoryMenu` and `HotbarUI` share one
implementation instead of duplicating the ~40 lines of tooltip-box building.

```ts
export type TooltipPlacement = "right" | "above";

export class Tooltip {
  constructor(scene: Phaser.Scene) { ... }
  show(
    key: string,
    anchor: { x: number; y: number; width: number; height: number },
    placement: TooltipPlacement,
  ): void;
  hide(): void;
  private place(anchor, w, h, placement): { tx: number; ty: number };
}
```

- `show()`: clears any existing tooltip, looks up `itemDef(key)`, builds the
  same line array (name, blank, description, then blank + stat lines if
  `def.stats?.length`), builds the text object with the same style
  (monospace 12px, `#e8ecf2`, wordWrap 180), computes w/h with padX=8/padY=6,
  calls `place()`, draws the background rectangle (`0x000000`, alpha 0.92,
  1px stroke `#555e6e`) and repositions the text. Same depths as today (box
  4500 / text 4501).
- `hide()`: destroys everything tracked and clears.
- `place()` has two branches:
  - **`"right"`** (InventoryMenu, backpack grid): `tx = anchor.x + anchor.width + 8`;
    if it would overflow the screen's right edge, flip to
    `tx = anchor.x - w - 8`; `ty` clamped into `[4, scale.height - h - 4]`.
    Reproduces InventoryMenu's current behavior (the anchor rect now carries
    the +8 offset internally instead of the caller pre-computing it).
  - **`"above"`** (HotbarUI, bottom bar): `tx = anchor.x + anchor.width/2 - w/2`,
    clamped into `[4, scale.width - w - 4]`; `ty = anchor.y - h - 8`, clamped
    to `>= 4`. Opens upward, centered on the slot — the hotbar sits at the
    very bottom of the screen so there's no room below it, and to-the-right
    would overlap neighboring slots.

Two branches rather than one unified algorithm, since the two callers anchor
from genuinely different edges of the slot. Public API stays to 3 params.

### `src/ui/InventoryMenu.ts` changes

- Import `Tooltip`; add `private tooltipUI: Tooltip;`, instantiated in the
  constructor.
- `hideTooltip()` body becomes `this.tooltipUI.hide();`.
- Delete the private `showTooltip()` method and the `tooltip[]` field.
- In `renderBackpack()`'s `pointerover` handler:
  ```ts
  if (stack && !this.deps.isDragging())
    this.tooltipUI.show(stack.key, { x, y, width: SLOT, height: SLOT }, "right");
  ```

### `src/ui/HotbarUI.ts` changes

- Import `Tooltip`; add `private tooltipUI: Tooltip;`, instantiated in the
  constructor.
- Extend `HotbarUIDeps` with `isDragging: () => boolean;` (matches
  `InventoryMenuDeps`).
- In `render()`'s per-slot box, add before the existing `pointerdown`:
  ```ts
  .on("pointerover", () => {
    if (stack && !this.deps.isDragging())
      this.tooltipUI.show(stack.key, { x, y, width: SLOT_SIZE, height: SLOT_SIZE }, "above");
  })
  .on("pointerout", () => this.tooltipUI.hide())
  ```
- Add `this.tooltipUI.hide();` at the top of `render()` so a stale tooltip
  doesn't survive a slot re-render while open.
- Add a public `hideTooltip(): void { this.tooltipUI.hide(); }` so
  `MainScene` can hide it when a drag begins.

### `src/scenes/MainScene.ts` wiring

- Update the `this.hotbarUI = new HotbarUI(...)` call to add
  `isDragging: () => this.dragSource !== null`.
- In `beginItemDrag()`, alongside the existing
  `this.inventoryMenu.hideTooltip();`, add `this.hotbarUI.hideTooltip();`.

## 4. InventoryMenu horizontal layout, grid grown to 6x6

File: [InventoryMenu.ts](src/ui/InventoryMenu.ts)

Backpack grid grows from 5x4 (20 slots) to **6x6 (36 slots)** — a clean
square, sized to use the vertical space freed by no longer stacking equipment
above it. Equipment stays a 3x3 grid (9 slots), repositioned to the right.

New constants (`SLOT=46, GAP=6` unchanged):

```ts
const PANEL_X = 16;
const PANEL_Y = 48;

export const BACKPACK_COLS = 6;
export const BACKPACK_ROWS = 6;
export const BACKPACK_SIZE = BACKPACK_COLS * BACKPACK_ROWS;

const ARMOR_COLS = 3;

const GRID_Y = PANEL_Y + 56;
const BACKPACK_X = PANEL_X + 12;
const BACKPACK_Y = GRID_Y;
const BACKPACK_W = BACKPACK_COLS * SLOT + (BACKPACK_COLS - 1) * GAP; // 306
const BACKPACK_H = BACKPACK_ROWS * SLOT + (BACKPACK_ROWS - 1) * GAP; // 306

const GRID_GAP = 24;
const ARMOR_X = BACKPACK_X + BACKPACK_W + GRID_GAP; // 358
const ARMOR_Y = GRID_Y;
const ARMOR_W = ARMOR_COLS * SLOT + (ARMOR_COLS - 1) * GAP; // 150

const PANEL_W = (ARMOR_X + ARMOR_W - PANEL_X) + 12; // 504
const PANEL_H = (BACKPACK_Y + BACKPACK_H - PANEL_Y) + 20; // 382
```

Sanity check: panel spans x:[16,520], y:[48,430] on the 800x600 canvas —
well clear of the hotbar (top at y=546) and the repositioned controls line.
It overlaps `CraftingMenu`'s screen region horizontally, but the two panels
are mutually exclusive (opening one already closes the other via the
existing keydown handlers), so no real visual conflict.

### `render()`

Draws backpack (left) then equipment (right), both grids starting at `GRID_Y`:

```ts
private render(): void {
  this.clearRows();
  this.hideTooltip();
  const x0 = PANEL_X + 12;

  this.addText(x0, PANEL_Y + 10, "Inventory", 15, "#ffffff");
  this.addText(BACKPACK_X, PANEL_Y + 36, "Backpack", 12, "#8a93a3");
  this.addText(ARMOR_X, PANEL_Y + 36, "Equipment", 12, "#8a93a3");
  this.renderBackpack();
  this.renderArmor(ARMOR_X, ARMOR_Y);
}
```

- `renderArmor()`: only the call-site origin changes (now right of the
  backpack instead of above it); internal 3-column math is unchanged.
- `renderBackpack()`: no logic changes — already reads `BACKPACK_X/Y`,
  `BACKPACK_COLS` symbolically; only the constants change.
- `slotIndexAt()`: no structural change needed — it already reads the same
  named constants, and since `BACKPACK_X/Y` no longer derive from `ARMOR_Y`,
  the hit-test stays correct automatically. Preserves the "render() and
  slotIndexAt() stay in lockstep" invariant from the existing code comment.
- `this.bg` rectangle picks up new `PANEL_W/PANEL_H` automatically.

## Edge cases

- Hotbar tooltip at leftmost/rightmost slots: `place()`'s `"above"` branch
  clamps `tx` into `[4, 800 - w - 4]`, shifting off-center rather than
  clipping off-screen.
- Hotbar tooltip vertical: slot y=546 (`originY`), tooltip bottom = 538;
  `ty = 538 - h`, clamped to `>= 4`. Fine on 800x600; worth eyeballing once
  real multi-stat items exist.
- Backpack tooltip at new rightmost column (col 5, x=288): `tx = 342` fits
  comfortably under the 180px wordwrap width — right-mode tooltips keep
  opening rightward as before.
- Drag-start hides both tooltips (`MainScene.beginItemDrag`), since a drag
  can originate from either grid.
- `HotbarUI.render()` hides its tooltip at the top of the method so a stale
  box doesn't survive a slot-content refresh while open.

## Critical files

- `src/ui/Tooltip.ts` (new)
- `src/ui/InventoryMenu.ts`
- `src/ui/HotbarUI.ts`
- `src/scenes/MainScene.ts`

## Verification

1. `node node_modules/typescript/bin/tsc --noEmit` — type-check.
2. `preview_start` (config `dev`), `preview_screenshot` to confirm boot.
3. `preview_eval`: open inventory (Tab), confirm backpack renders as 6x6 on
   the left and equipment 3x3 to its right; confirm no top-left wood/stone/tool
   text; confirm controls line sits at the top without overlapping the panel.
4. `preview_eval`/`preview_snapshot`: hover a hotbar slot with an item in it
   (e.g. after crafting/picking up something and moving it to the hotbar),
   confirm a tooltip appears above the slot; hover a backpack slot, confirm
   tooltip still appears to the right (or flips left near the screen edge).
5. Drag an item from backpack to hotbar and back; confirm tooltips don't get
   stuck visible during/after the drag.
6. `preview_console_logs` (level `error`) — no runtime errors.
