import Phaser from "phaser";
import type { EquipSlot } from "../systems/Equipment";
import type { ItemContainer } from "../systems/ItemContainer";
import { itemDef } from "../systems/Items";
import { Tooltip } from "./Tooltip";

export interface ArmorSlotView {
  id: EquipSlot;
  label: string;
  itemKey: string | null;
}

export interface InventoryMenuDeps {
  backpack: ItemContainer;
  armorSlots: () => ArmorSlotView[];
  // Left-press on a filled slot begins dragging that stack.
  beginDrag: (container: ItemContainer, index: number, pointer: Phaser.Input.Pointer) => void;
  // Right-click quick-moves the stack to the hotbar (if hotbar-able).
  quickMove: (container: ItemContainer, index: number) => void;
  // Suppress tooltips while a drag is in progress.
  isDragging: () => boolean;
}

const PANEL_X = 16;
const PANEL_Y = 48;
const SLOT = 46;
const GAP = 6;
export const BACKPACK_COLS = 6;
export const BACKPACK_ROWS = 6;
export const BACKPACK_SIZE = BACKPACK_COLS * BACKPACK_ROWS;
const ARMOR_COLS = 3;

// Fixed layout anchors so render() and slotIndexAt() stay in lockstep.
// Backpack grid sits on the left, equipment grid to its right — both start
// at the same row (GRID_Y).
const GRID_Y = PANEL_Y + 56;
const BACKPACK_X = PANEL_X + 12; // 28
const BACKPACK_Y = GRID_Y;
const BACKPACK_W = BACKPACK_COLS * SLOT + (BACKPACK_COLS - 1) * GAP; // 306
const BACKPACK_H = BACKPACK_ROWS * SLOT + (BACKPACK_ROWS - 1) * GAP; // 306

const GRID_GAP = 24;
const ARMOR_X = BACKPACK_X + BACKPACK_W + GRID_GAP; // 358
const ARMOR_Y = GRID_Y;
const ARMOR_W = ARMOR_COLS * SLOT + (ARMOR_COLS - 1) * GAP; // 150
const ARMOR_ROWS_MAX = 3; // EQUIP_SLOTS is 9 slots / 3 cols = 3 rows
const ARMOR_H = ARMOR_ROWS_MAX * SLOT + (ARMOR_ROWS_MAX - 1) * GAP; // 150

const PANEL_W = ARMOR_X + ARMOR_W - PANEL_X + 12; // 504
const PANEL_H = BACKPACK_Y + BACKPACK_H - PANEL_Y + 20; // 382

// Trash drop target: sits below the armor grid, in the panel's otherwise-
// empty lower-right corner. Dragging a stack here permanently deletes it (see
// MainScene.destroyStack) — distinct from dragging out to the game world,
// which drops it as a recoverable loose pickup instead.
const TRASH_SIZE = 46;
const TRASH_X = ARMOR_X;
const TRASH_Y = ARMOR_Y + ARMOR_H + 24;

// Top-left grid inventory (Tab). Renders the backpack ItemContainer as a grid
// plus worn-equipment placeholders. Slots are drag sources (and the whole
// grid is a drop target via slotIndexAt); hovering pops a tooltip. Dragging
// itself is owned by MainScene so items can move between the backpack and the
// hotbar with one mechanism.
//
// Like the crafting menu, every element is a flat scrollFactor(0) object (no
// Containers) so input hit-testing survives camera scroll.
export class InventoryMenu {
  private scene: Phaser.Scene;
  private deps: InventoryMenuDeps;
  private bg: Phaser.GameObjects.Rectangle;
  private open = false;
  private rows: Phaser.GameObjects.GameObject[] = [];
  private tooltipUI: Tooltip;

  constructor(scene: Phaser.Scene, deps: InventoryMenuDeps) {
    this.scene = scene;
    this.deps = deps;
    this.tooltipUI = new Tooltip(scene);

    this.bg = scene.add
      .rectangle(PANEL_X, PANEL_Y, PANEL_W, PANEL_H, 0x0a0a0a, 0.93)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(3000)
      .setVisible(false);
  }

  toggle(): void {
    this.open = !this.open;
    this.bg.setVisible(this.open);
    if (this.open) this.render();
    else this.teardown();
  }

  close(): void {
    if (this.open) this.toggle();
  }

  isOpen(): boolean {
    return this.open;
  }

  refresh(): void {
    if (this.open) this.render();
  }

  hideTooltip(): void {
    this.tooltipUI.hide();
  }

  // Whether a screen point falls within the panel — see CraftingMenu's
  // containsPoint for why this matters to drag resolution.
  containsPoint(screenX: number, screenY: number): boolean {
    if (!this.open) return false;
    return screenX >= PANEL_X && screenX <= PANEL_X + PANEL_W && screenY >= PANEL_Y && screenY <= PANEL_Y + PANEL_H;
  }

  // The trash drop target — dragging a stack here destroys it permanently.
  isOverTrash(screenX: number, screenY: number): boolean {
    if (!this.open) return false;
    return (
      screenX >= TRASH_X &&
      screenX <= TRASH_X + TRASH_SIZE &&
      screenY >= TRASH_Y &&
      screenY <= TRASH_Y + TRASH_SIZE
    );
  }

  // Backpack slot index under a screen point, or null (used as a drop target).
  slotIndexAt(screenX: number, screenY: number): number | null {
    if (!this.open) return null;
    const dx = screenX - BACKPACK_X;
    const dy = screenY - BACKPACK_Y;
    if (dx < 0 || dy < 0) return null;
    const col = Math.floor(dx / (SLOT + GAP));
    const row = Math.floor(dy / (SLOT + GAP));
    if (col >= BACKPACK_COLS || row >= BACKPACK_ROWS) return null;
    // reject the gap between cells
    if (dx - col * (SLOT + GAP) > SLOT || dy - row * (SLOT + GAP) > SLOT) return null;
    const index = row * BACKPACK_COLS + col;
    return index < this.deps.backpack.size ? index : null;
  }

  private teardown(): void {
    this.clearRows();
    this.hideTooltip();
  }

  private clearRows(): void {
    for (const r of this.rows) r.destroy();
    this.rows = [];
  }

  private render(): void {
    this.clearRows();
    this.hideTooltip();
    const x0 = PANEL_X + 12;

    this.addText(x0, PANEL_Y + 10, "Inventory", 15, "#ffffff");
    this.addText(BACKPACK_X, PANEL_Y + 36, "Backpack", 12, "#8a93a3");
    this.addText(ARMOR_X, PANEL_Y + 36, "Equipment", 12, "#8a93a3");
    this.renderBackpack();
    this.renderArmor(ARMOR_X, ARMOR_Y);
    this.renderTrash();
  }

  // Drag a stack here to permanently delete it. Dragging a stack out of the
  // panel entirely (onto the game world) drops it as a recoverable pickup
  // instead — this is the only-way-to-lose-it-for-good option.
  private renderTrash(): void {
    const box = this.scene.add
      .rectangle(TRASH_X, TRASH_Y, TRASH_SIZE, TRASH_SIZE, 0x2a1414, 0.9)
      .setOrigin(0, 0)
      .setStrokeStyle(1, 0x7a3a3a)
      .setScrollFactor(0)
      .setDepth(3001);
    this.rows.push(box);
    this.addText(TRASH_X + TRASH_SIZE / 2, TRASH_Y + TRASH_SIZE / 2, "✕", 20, "#c25a5a", 0.5, 0.5);
    this.addText(TRASH_X + TRASH_SIZE / 2, TRASH_Y + TRASH_SIZE + 6, "Destroy", 10, "#8a6060", 0.5, 0);
  }

  private renderArmor(x0: number, y0: number): void {
    const slots = this.deps.armorSlots();
    slots.forEach((slot, i) => {
      const col = i % ARMOR_COLS;
      const row = Math.floor(i / ARMOR_COLS);
      const x = x0 + col * (SLOT + GAP);
      const y = y0 + row * (SLOT + GAP);

      const box = this.scene.add
        .rectangle(x, y, SLOT, SLOT, 0x14181f, 0.9)
        .setOrigin(0, 0)
        .setStrokeStyle(1, 0x3a4250)
        .setScrollFactor(0)
        .setDepth(3001);
      this.rows.push(box);

      this.addText(x + SLOT / 2, y + SLOT / 2, slot.label, 10, "#5b6472", 0.5, 0.5);
    });
  }

  private renderBackpack(): void {
    const backpack = this.deps.backpack;

    for (let i = 0; i < BACKPACK_SIZE; i++) {
      const col = i % BACKPACK_COLS;
      const row = Math.floor(i / BACKPACK_COLS);
      const x = BACKPACK_X + col * (SLOT + GAP);
      const y = BACKPACK_Y + row * (SLOT + GAP);
      const stack = backpack.slot(i);

      const box = this.scene.add
        .rectangle(x, y, SLOT, SLOT, 0x14181f, 0.9)
        .setOrigin(0, 0)
        .setStrokeStyle(1, 0x3a4250)
        .setScrollFactor(0)
        .setDepth(3001)
        .setInteractive({ useHandCursor: true })
        .on("pointerover", () => {
          if (stack && !this.deps.isDragging())
            this.tooltipUI.show(stack.key, { x, y, width: SLOT, height: SLOT }, "right");
        })
        .on("pointerout", () => this.hideTooltip())
        .on("pointerdown", (pointer: Phaser.Input.Pointer) => {
          if (!stack) return;
          if (pointer.rightButtonDown()) this.deps.quickMove(backpack, i);
          else this.deps.beginDrag(backpack, i, pointer);
        });
      this.rows.push(box);

      if (!stack) continue;

      const def = itemDef(stack.key);
      if (def) {
        const icon = this.scene.add
          .image(x + SLOT / 2, y + SLOT / 2, def.texture)
          .setScrollFactor(0)
          .setDepth(3002);
        this.rows.push(icon);
      }
      if (stack.count > 1) {
        this.addText(x + SLOT - 4, y + SLOT - 3, `${stack.count}`, 11, "#ffffff", 1, 1);
      }
    }
  }

  private addText(
    x: number,
    y: number,
    str: string,
    size: number,
    color: string,
    originX = 0,
    originY = 0,
  ): void {
    const t = this.scene.add
      .text(x, y, str, { fontFamily: "monospace", fontSize: `${size}px`, color })
      .setOrigin(originX, originY)
      .setScrollFactor(0)
      .setDepth(3002);
    this.rows.push(t);
  }
}
