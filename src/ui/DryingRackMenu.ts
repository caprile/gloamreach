import Phaser from "phaser";
import type { ItemContainer } from "../systems/ItemContainer";
import { itemDef } from "../systems/Items";
import type { ProcessingStation } from "../systems/Processing";
import { Tooltip } from "./Tooltip";

export interface DryingRackMenuDeps {
  backpack: ItemContainer;
  // The station of the rack currently open (null when the menu is closed).
  station: () => ProcessingStation | null;
  // Left-press on a backpack stack begins dragging it (reuses MainScene's
  // shared drag controller so items can drop onto the input slot below).
  beginDrag: (container: ItemContainer, index: number, pointer: Phaser.Input.Pointer) => void;
  // Right-click a valid-input backpack stack to load the whole stack straight
  // into the rack, no drag needed.
  quickLoad: (index: number) => void;
  isDragging: () => boolean;
  // Move the rack's ready output into the backpack.
  collectOutput: () => void;
  // Pull any loaded (still-drying) input back out into the backpack.
  retrieveInput: () => void;
}

const SLOT = 46;
const GAP = 6;
const COLS = 6;
const ROWS = 6;
const BACKPACK_W = COLS * SLOT + (COLS - 1) * GAP; // 306
const BACKPACK_H = ROWS * SLOT + (ROWS - 1) * GAP; // 306
const IO_SLOT = 56; // the input / output boxes are a touch larger than a grid cell
const DEPTH_BG = 3000;
const DEPTH_ITEM = 3001;
const DEPTH_TEXT = 3002;

// The Drying Rack's processing menu (Milestone H) — the game's first
// processing-station UI and its first drag-and-drop interaction. Opened by
// interacting with a placed rack; shows the player's backpack alongside the
// station's input/output so items can be dragged in. Backpack items that AREN'T
// a valid input for this station are dimmed (an affordance, not a hard block),
// mirroring the crafting menu's grey-out-unaffordable pattern but keyed off
// "is this a valid input" instead.
//
// Like the other menus, everything here is a flat scrollFactor(0) GameObject
// (no Containers) so input hit-testing survives camera scroll — see the note in
// CraftingMenu.ts. Rendered fresh each frame while open (MainScene drives it) so
// the progress bar, counts, and live output preview stay current as drying
// advances on its own.
export class DryingRackMenu {
  private scene: Phaser.Scene;
  private deps: DryingRackMenuDeps;
  private bg: Phaser.GameObjects.Rectangle;
  private open = false;
  private rows: Phaser.GameObjects.GameObject[] = [];
  private tooltipUI: Tooltip;

  private panelX: number;
  private panelY: number;
  private panelW: number;
  private panelH: number;
  private backpackX: number;
  private backpackY: number;
  private processX: number;
  private inputBox: { x: number; y: number } = { x: 0, y: 0 };

  constructor(scene: Phaser.Scene, deps: DryingRackMenuDeps) {
    this.scene = scene;
    this.deps = deps;
    this.tooltipUI = new Tooltip(scene);

    this.panelW = 560;
    this.panelH = 380;
    this.panelX = scene.scale.width / 2 - this.panelW / 2;
    this.panelY = scene.scale.height / 2 - this.panelH / 2;
    this.backpackX = this.panelX + 16;
    this.backpackY = this.panelY + 52;
    this.processX = this.backpackX + BACKPACK_W + 30;
    // Input box sits below the "Input" label in the process column.
    this.inputBox = { x: this.processX + 40, y: this.backpackY + 24 };

    this.bg = scene.add
      .rectangle(this.panelX, this.panelY, this.panelW, this.panelH, 0x0a0a0a, 0.95)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(DEPTH_BG)
      .setVisible(false);
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

  // MainScene calls this every frame while open so drying progress, counts, and
  // the live output preview refresh even without user input.
  refresh(): void {
    if (this.open) this.render();
  }

  hideTooltip(): void {
    this.tooltipUI.hide();
  }

  // Backpack slot index under a screen point (drop target for moving items back
  // into the bag), or null.
  slotIndexAt(screenX: number, screenY: number): number | null {
    if (!this.open) return null;
    const dx = screenX - this.backpackX;
    const dy = screenY - this.backpackY;
    if (dx < 0 || dy < 0) return null;
    const col = Math.floor(dx / (SLOT + GAP));
    const row = Math.floor(dy / (SLOT + GAP));
    if (col >= COLS || row >= ROWS) return null;
    if (dx - col * (SLOT + GAP) > SLOT || dy - row * (SLOT + GAP) > SLOT) return null;
    const index = row * COLS + col;
    return index < this.deps.backpack.size ? index : null;
  }

  // True when a screen point is over the input slot — the drop target that
  // loads a dragged stack into the rack.
  isOverInput(screenX: number, screenY: number): boolean {
    if (!this.open) return false;
    return (
      screenX >= this.inputBox.x &&
      screenX <= this.inputBox.x + IO_SLOT &&
      screenY >= this.inputBox.y &&
      screenY <= this.inputBox.y + IO_SLOT
    );
  }

  private clearRows(): void {
    for (const r of this.rows) r.destroy();
    this.rows = [];
  }

  private render(): void {
    this.clearRows();
    this.tooltipUI.hide();
    const station = this.deps.station();
    if (!station) return;

    this.addText(this.panelX + 16, this.panelY + 14, "Drying Rack", 16, "#ffffff");
    this.addText(this.backpackX, this.panelY + 34, "Backpack", 12, "#8a93a3");
    this.renderBackpack(station);
    this.renderProcess(station);
  }

  private renderBackpack(station: ProcessingStation): void {
    const backpack = this.deps.backpack;
    for (let i = 0; i < COLS * ROWS; i++) {
      const col = i % COLS;
      const row = Math.floor(i / COLS);
      const x = this.backpackX + col * (SLOT + GAP);
      const y = this.backpackY + row * (SLOT + GAP);
      const stack = backpack.slot(i);
      const valid = !!stack && station.canAccept(stack.key);

      const box = this.scene.add
        .rectangle(x, y, SLOT, SLOT, 0x14181f, 0.9)
        .setOrigin(0, 0)
        .setStrokeStyle(1, valid ? 0x8fe38f : 0x3a4250)
        .setScrollFactor(0)
        .setDepth(DEPTH_ITEM)
        .setInteractive({ useHandCursor: true })
        .on("pointerover", () => {
          if (stack && !this.deps.isDragging())
            this.tooltipUI.show(stack.key, { x, y, width: SLOT, height: SLOT }, "right");
        })
        .on("pointerout", () => this.tooltipUI.hide())
        .on("pointerdown", (pointer: Phaser.Input.Pointer) => {
          if (!stack) return;
          if (pointer.rightButtonDown()) this.deps.quickLoad(i);
          else this.deps.beginDrag(backpack, i, pointer);
        });
      this.rows.push(box);

      if (!stack) continue;
      const def = itemDef(stack.key);
      if (def) {
        // Dim items that aren't a valid input for this station — a visual
        // affordance only; they can still be dragged/rearranged.
        const icon = this.scene.add
          .image(x + SLOT / 2, y + SLOT / 2, def.texture)
          .setScrollFactor(0)
          .setDepth(DEPTH_ITEM)
          .setAlpha(valid ? 1 : 0.28);
        this.rows.push(icon);
      }
      if (stack.count > 1) {
        this.addText(x + SLOT - 4, y + SLOT - 3, `${stack.count}`, 11, valid ? "#ffffff" : "#5b6472", 1, 1);
      }
    }
  }

  private renderProcess(station: ProcessingStation): void {
    const px = this.processX;

    // --- Input ---
    this.addText(px, this.backpackY + 4, "Input", 12, "#8a93a3");
    const ib = this.inputBox;
    this.renderSlotBox(ib.x, ib.y, station.input, station.input ? "#8fe38f" : "#3a4250");
    if (station.input) {
      // Clicking a loaded input pulls it back out into the backpack.
      const hit = this.scene.add
        .rectangle(ib.x, ib.y, IO_SLOT, IO_SLOT, 0xffffff, 0.001)
        .setOrigin(0, 0)
        .setScrollFactor(0)
        .setDepth(DEPTH_TEXT)
        .setInteractive({ useHandCursor: true })
        .on("pointerdown", () => this.deps.retrieveInput());
      this.rows.push(hit);
    } else {
      this.addText(ib.x + IO_SLOT / 2, ib.y + IO_SLOT + 8, "drag reeds\nor skins here", 10, "#5b6472", 0.5, 0);
    }

    // --- Progress ---
    const barY = ib.y + IO_SLOT + 30;
    const barW = 150;
    const barX = px;
    const barBg = this.scene.add
      .rectangle(barX, barY, barW, 10, 0x1a1f2a, 0.95)
      .setOrigin(0, 0)
      .setStrokeStyle(1, 0x3a4250)
      .setScrollFactor(0)
      .setDepth(DEPTH_ITEM);
    this.rows.push(barBg);
    const frac = station.progressFraction();
    if (frac > 0) {
      const fill = this.scene.add
        .rectangle(barX + 1, barY + 1, (barW - 2) * frac, 8, 0xc9a86a, 1)
        .setOrigin(0, 0)
        .setScrollFactor(0)
        .setDepth(DEPTH_ITEM + 1);
      this.rows.push(fill);
    }
    const status = station.isProcessing() ? "Drying…" : station.input ? "Idle" : "Empty";
    this.addText(barX + barW + 8, barY - 2, status, 11, "#9aa4b5");

    // --- Output (live preview + collectable) ---
    const outLabelY = barY + 26;
    this.addText(px, outLabelY, "Output", 12, "#8a93a3");
    const preview = station.previewOutput();
    const ob = { x: ib.x, y: outLabelY + 20 };
    this.renderSlotBox(ob.x, ob.y, preview, preview ? "#d0b070" : "#3a4250");

    // Down-arrow between input and output boxes.
    this.addText(ib.x + IO_SLOT / 2, ib.y + IO_SLOT + 2, "↓", 16, "#6b7280", 0.5, 0);

    const ready = station.output?.count ?? 0;
    const readyColor = ready > 0 ? "#8fe38f" : "#5b6472";
    this.addText(ob.x + IO_SLOT + 12, ob.y + 4, `Ready: ${ready}`, 12, readyColor);

    const canCollect = ready > 0;
    const btn = this.scene.add
      .text(ob.x + IO_SLOT + 12, ob.y + 24, "Collect", {
        fontFamily: "monospace",
        fontSize: "14px",
        color: canCollect ? "#0a0a0a" : "#4a4a4a",
        backgroundColor: canCollect ? "#8fe38f" : "#2a2a2a",
        padding: { x: 10, y: 5 },
      })
      .setScrollFactor(0)
      .setDepth(DEPTH_TEXT)
      .setInteractive({ useHandCursor: canCollect })
      .on("pointerdown", () => {
        if (canCollect) this.deps.collectOutput();
      });
    this.rows.push(btn);
  }

  // A single item box showing an icon + count (or empty). `stroke` is a hex
  // string.
  private renderSlotBox(
    x: number,
    y: number,
    slot: { key: string; count: number } | null,
    stroke: string,
  ): void {
    const strokeColor = Phaser.Display.Color.HexStringToColor(stroke || "#3a4250").color;
    const box = this.scene.add
      .rectangle(x, y, IO_SLOT, IO_SLOT, 0x14181f, 0.9)
      .setOrigin(0, 0)
      .setStrokeStyle(2, strokeColor)
      .setScrollFactor(0)
      .setDepth(DEPTH_ITEM);
    this.rows.push(box);
    if (!slot) return;
    const def = itemDef(slot.key);
    if (def) {
      const icon = this.scene.add
        .image(x + IO_SLOT / 2, y + IO_SLOT / 2, def.texture)
        .setScrollFactor(0)
        .setDepth(DEPTH_ITEM + 1);
      this.rows.push(icon);
    }
    if (slot.count >= 1) {
      this.addText(x + IO_SLOT - 4, y + IO_SLOT - 3, `${slot.count}`, 12, "#ffffff", 1, 1);
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
      .text(x, y, str, { fontFamily: "monospace", fontSize: `${size}px`, color, align: "center" })
      .setOrigin(originX, originY)
      .setScrollFactor(0)
      .setDepth(DEPTH_TEXT);
    this.rows.push(t);
  }
}
