import Phaser from "phaser";
import { ItemContainer } from "../systems/ItemContainer";
import { itemDef } from "../systems/Items";
import type { Skills } from "../systems/Skills";
import { Tooltip } from "./Tooltip";
import { bindFrame, frameInto } from "./frames";

export interface ChestMenuDeps {
  backpack: ItemContainer;
  skills: Skills;
  // The chest currently open (null when the menu is closed).
  chest: () => ItemContainer | null;
  // Display name of the open container. This menu is shared by every lootable
  // in the game (shack chest, Warren cache, crypt chest, shrine bowl, lodge
  // huts), so the header can't be a constant — it read "Gremlin Shack Chest"
  // over a Duskrunner cache.
  chestTitle: () => string;
  beginDrag: (container: ItemContainer, index: number, pointer: Phaser.Input.Pointer) => void;
  isDragging: () => boolean;
}

const SLOT = 46;
const GAP = 6;
const DEPTH_BG = 3000;
const DEPTH_ITEM = 3001;
const DEPTH_TEXT = 3002;
const CHEST_COLS = 4;
const CHEST_ROWS = 2; // 8 slots — see GremlinShack.SHACK_CHEST_SIZE
const CHEST_W = CHEST_COLS * SLOT + (CHEST_COLS - 1) * GAP;

// A lootable world container's menu (first use: the Gremlin Shack's chest).
// Modeled on DryingRackMenu's structure (flat scrollFactor(0) GameObjects, no
// Container per the standing Phaser-Container-input-bug rule).
//
// The player's backpack grid used to be rendered alongside the chest, mirroring
// the Drying Rack's load-from-bag layout. It's gone (the user: "since inventory
// management isn't really a thing, I don't think we need to show the inventory
// at all when opening a chest to view its contents") — a loot chest is a
// one-directional thing you empty, not a place you organise. Everything that
// actually moved items still works: [R] takes all, and double-click/Ctrl-click
// on a chest slot quick-moves it to the backpack. Only the drag-INTO-chest
// gesture is lost, and stashing loot back into a shack chest was never a real
// use case.
export class ChestMenu {
  private scene: Phaser.Scene;
  private deps: ChestMenuDeps;
  private bg: Phaser.GameObjects.Rectangle;
  private open = false;
  private rows: Phaser.GameObjects.GameObject[] = [];
  private tooltipUI: Tooltip;

  private panelX: number;
  private panelY: number;
  private panelW: number;
  private panelH: number;
  private chestX: number;
  private chestY: number;

  constructor(scene: Phaser.Scene, deps: ChestMenuDeps) {
    this.scene = scene;
    this.deps = deps;
    this.tooltipUI = new Tooltip(scene, deps.skills);

    this.panelW = CHEST_W + 32;
    this.panelH = 90 + CHEST_ROWS * (SLOT + GAP) + 22;
    this.panelX = scene.scale.width / 2 - this.panelW / 2;
    this.panelY = scene.scale.height / 2 - this.panelH / 2;
    this.chestX = this.panelX + 16;
    this.chestY = this.panelY + 90;

    this.bg = scene.add
      .rectangle(this.panelX, this.panelY, this.panelW, this.panelH, 0x0a0a0a, 0.95)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(DEPTH_BG)
      .setVisible(false);
    bindFrame(this.bg, "panel");
  }

  openMenu(): void {
    if (this.open) return;
    this.open = true;
    this.bg.setVisible(true);
    this.render();
  }

  close(): void {
    if (!this.open) return;
    this.open = false;
    this.bg.setVisible(false);
    this.clearRows();
    this.tooltipUI.hide();
  }

  isOpen(): boolean {
    return this.open;
  }

  // MainScene calls this after any item move so counts refresh immediately.
  refresh(): void {
    if (this.open) this.render();
  }

  containsPoint(screenX: number, screenY: number): boolean {
    if (!this.open) return false;
    return (
      screenX >= this.panelX &&
      screenX <= this.panelX + this.panelW &&
      screenY >= this.panelY &&
      screenY <= this.panelY + this.panelH
    );
  }

  // Chest slot index under a screen point, or null.
  chestSlotIndexAt(screenX: number, screenY: number): number | null {
    if (!this.open) return null;
    const chest = this.deps.chest();
    if (!chest) return null;
    return this.gridSlotAt(screenX, screenY, this.chestX, this.chestY, CHEST_COLS, CHEST_ROWS, chest.size);
  }

  private gridSlotAt(
    screenX: number,
    screenY: number,
    originX: number,
    originY: number,
    cols: number,
    rows: number,
    size: number,
  ): number | null {
    const dx = screenX - originX;
    const dy = screenY - originY;
    if (dx < 0 || dy < 0) return null;
    const col = Math.floor(dx / (SLOT + GAP));
    const row = Math.floor(dy / (SLOT + GAP));
    if (col >= cols || row >= rows) return null;
    if (dx - col * (SLOT + GAP) > SLOT || dy - row * (SLOT + GAP) > SLOT) return null;
    const index = row * cols + col;
    return index < size ? index : null;
  }

  private clearRows(): void {
    for (const r of this.rows) r.destroy();
    this.rows = [];
  }

  private render(): void {
    this.clearRows();
    this.tooltipUI.hide();
    const chest = this.deps.chest();
    if (!chest) return;

    this.addText(this.panelX + 16, this.panelY + 14, this.deps.chestTitle(), 16, "#ffffff");
    const descText = this.scene.add
      .text(this.panelX + 16, this.panelY + 38, "Loot recovered from the shack's guards.", {
        fontFamily: "monospace",
        fontSize: "13px",
        color: "#8a93a3",
        wordWrap: { width: this.panelW - 32 },
      })
      .setScrollFactor(0)
      .setDepth(DEPTH_TEXT);
    this.rows.push(descText);

    this.addText(this.chestX, this.chestY - 18, "Chest", 12, "#8a93a3");
    this.addText(this.chestX + CHEST_W, this.chestY - 18, "[R] Take All", 11, "#e8c040", 1, 0);
    this.renderGrid(chest, this.chestX, this.chestY, CHEST_COLS, CHEST_ROWS);
  }

  private renderGrid(
    container: ItemContainer,
    originX: number,
    originY: number,
    cols: number,
    rows: number,
  ): void {
    for (let i = 0; i < cols * rows; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = originX + col * (SLOT + GAP);
      const y = originY + row * (SLOT + GAP);
      const stack = container.slot(i);

      const box = this.scene.add
        .rectangle(x, y, SLOT, SLOT, 0x14181f, 0.9)
        .setOrigin(0, 0)
        .setStrokeStyle(1, 0x3a4250)
        .setScrollFactor(0)
        .setDepth(DEPTH_ITEM)
        .setInteractive({ useHandCursor: true })
        .on("pointerover", () => {
          if (stack && !this.deps.isDragging())
            this.tooltipUI.show(stack.key, { x, y, width: SLOT, height: SLOT }, "right", stack.tier);
        })
        .on("pointerout", () => this.tooltipUI.hide())
        .on("pointerdown", (pointer: Phaser.Input.Pointer) => {
          if (!stack) return;
          if (pointer.leftButtonDown()) this.deps.beginDrag(container, i, pointer);
        });
      this.rows.push(box);
      frameInto(this.rows, box, "slot");

      if (!stack) continue;
      const def = itemDef(stack.key);
      if (def) {
        const icon = this.scene.add
          .image(x + SLOT / 2, y + SLOT / 2, def.texture)
          .setScrollFactor(0)
          .setDepth(DEPTH_ITEM);
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
      .text(x, y, str, { fontFamily: "monospace", fontSize: `${size + 1}px`, color, align: "center" })
      .setOrigin(originX, originY)
      .setScrollFactor(0)
      .setDepth(DEPTH_TEXT);
    this.rows.push(t);
  }
}
