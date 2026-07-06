import Phaser from "phaser";
import type { EquipSlot } from "../systems/Equipment";
import type { ItemContainer } from "../systems/ItemContainer";
import { itemDef } from "../systems/Items";

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
const PANEL_W = 300;
const PANEL_H = 470;
const SLOT = 46;
const GAP = 6;
export const BACKPACK_COLS = 5;
export const BACKPACK_ROWS = 4;
export const BACKPACK_SIZE = BACKPACK_COLS * BACKPACK_ROWS;

// Fixed layout anchors so render() and slotIndexAt() stay in lockstep.
const ARMOR_Y = PANEL_Y + 56; // 104
const BACKPACK_X = PANEL_X + 12; // 28
const BACKPACK_Y = ARMOR_Y + 3 * (SLOT + GAP) + 28; // 288

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
  private tooltip: Phaser.GameObjects.GameObject[] = [];

  constructor(scene: Phaser.Scene, deps: InventoryMenuDeps) {
    this.scene = scene;
    this.deps = deps;

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
    for (const t of this.tooltip) t.destroy();
    this.tooltip = [];
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
    this.addText(x0, PANEL_Y + 36, "Equipment", 12, "#8a93a3");
    this.renderArmor(x0, ARMOR_Y);
    this.addText(x0, BACKPACK_Y - 20, "Backpack", 12, "#8a93a3");
    this.renderBackpack();
  }

  private renderArmor(x0: number, y0: number): void {
    const slots = this.deps.armorSlots();
    slots.forEach((slot, i) => {
      const col = i % 3;
      const row = Math.floor(i / 3);
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
          if (stack && !this.deps.isDragging()) this.showTooltip(stack.key, x + SLOT + 8, y);
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

  private showTooltip(key: string, x: number, y: number): void {
    this.hideTooltip();
    const def = itemDef(key);
    if (!def) return;

    const lines = [def.name, "", def.description];
    if (def.stats?.length) {
      lines.push("");
      for (const s of def.stats) lines.push(`${s.label}: ${s.value}`);
    }

    const text = this.scene.add
      .text(0, 0, lines.join("\n"), {
        fontFamily: "monospace",
        fontSize: "12px",
        color: "#e8ecf2",
        wordWrap: { width: 180 },
      })
      .setScrollFactor(0)
      .setDepth(4501);

    const padX = 8;
    const padY = 6;
    const w = text.width + padX * 2;
    const h = text.height + padY * 2;
    let tx = x;
    if (tx + w > this.scene.scale.width - 4) tx = x - w - SLOT - 16;
    const ty = Math.min(y, this.scene.scale.height - h - 4);

    const bgBox = this.scene.add
      .rectangle(tx, ty, w, h, 0x000000, 0.92)
      .setOrigin(0, 0)
      .setStrokeStyle(1, 0x555e6e)
      .setScrollFactor(0)
      .setDepth(4500);
    text.setPosition(tx + padX, ty + padY);

    this.tooltip.push(bgBox, text);
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
