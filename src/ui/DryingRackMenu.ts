import Phaser from "phaser";
import type { ItemContainer } from "../systems/ItemContainer";
import { itemDef } from "../systems/Items";
import type { ProcessingStation } from "../systems/Processing";
import type { Skills } from "../systems/Skills";
import { Tooltip } from "./Tooltip";
import { ProgressBar } from "./ProgressBar";

// A short "drying…" bar plays before the output lands — one bar for the whole
// batch (a 8->4 run is a single bar), a touch longer than a plain craft.
const PROCESS_BAR_MS = 600;

export interface DryingRackMenuDeps {
  backpack: ItemContainer;
  skills: Skills;
  // The station of the rack currently open (null when the menu is closed).
  station: () => ProcessingStation | null;
  // Left-press on a backpack stack begins dragging it (reuses MainScene's
  // shared drag controller so items can drop onto the input slot below).
  beginDrag: (container: ItemContainer, index: number, pointer: Phaser.Input.Pointer) => void;
  // Right-click a valid-input backpack stack to load the whole stack straight
  // into the rack, no drag needed.
  quickLoad: (index: number) => void;
  isDragging: () => boolean;
  // Pull the loaded (unprocessed) raw input back out into the backpack.
  retrieveInput: () => void;
  // Instantly process `amount` units of the loaded input. The scene deposits
  // the result into the backpack (or drops it on the floor if there's no
  // room) — this menu only picks the amount and asks for it to happen.
  processAmount: (amount: number) => void;
}

const SLOT = 46;
const GAP = 6;
const COLS = 6;
const ROWS = 6;
const BACKPACK_W = COLS * SLOT + (COLS - 1) * GAP; // 306
const BACKPACK_H = ROWS * SLOT + (ROWS - 1) * GAP; // 306
const IO_SLOT = 56;
const SLIDER_W = 170;
const SLIDER_H = 10;
const DEPTH_BG = 3000;
const DEPTH_ITEM = 3001;
const DEPTH_TEXT = 3002;

// The Drying Rack's processing menu (Milestone H, reworked to instant
// processing) — the game's first processing-station UI and its first drag-
// and-drop interaction. Opened by interacting with a placed rack; shows the
// player's backpack alongside the station's input so items can be dragged in.
// Backpack items that AREN'T a valid input for this station are dimmed (an
// affordance, not a hard block), mirroring the crafting menu's grey-out-
// unaffordable pattern but keyed off "is this a valid input" instead.
//
// Processing itself is instant, not timed: the player loads raw input, picks
// how much of it to run via a slider (or types an exact number), and hits
// Process. There's no output slot to "collect" — the scene deposits the
// result straight into the backpack (or drops it on the floor if full).
//
// Like the other menus, everything here is a flat scrollFactor(0) GameObject
// (no Containers) so input hit-testing survives camera scroll — see the note
// in CraftingMenu.ts.
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
  private sliderTrack: { x: number; y: number; w: number } = { x: 0, y: 0, w: SLIDER_W };

  // Desired OUTPUT count the player currently has selected to produce (not
  // input units) — 0..station.maxPossibleOutput(). Reset to the full
  // possible output whenever the menu opens; clamped down if the loaded
  // amount shrinks (e.g. after processing).
  private selectedAmount = 0;
  private sliderDragging = false;
  // True while a process bar is filling — greys the button + blocks re-clicks.
  private busy = false;
  private progressBar: ProgressBar;

  constructor(scene: Phaser.Scene, deps: DryingRackMenuDeps) {
    this.scene = scene;
    this.deps = deps;
    this.tooltipUI = new Tooltip(scene, deps.skills);
    this.progressBar = new ProgressBar(scene, { width: 96, height: 26, depth: DEPTH_TEXT + 3 });

    this.panelW = 600;
    this.panelH = 400;
    this.panelX = scene.scale.width / 2 - this.panelW / 2;
    this.panelY = scene.scale.height / 2 - this.panelH / 2;
    this.backpackX = this.panelX + 16;
    this.backpackY = this.panelY + 90;
    this.processX = this.backpackX + BACKPACK_W + 30;
    this.inputBox = { x: this.processX + 40, y: this.backpackY };
    this.sliderTrack = { x: this.processX, y: this.backpackY + IO_SLOT + 34, w: SLIDER_W };

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
    const station = this.deps.station();
    this.selectedAmount = station?.maxPossibleOutput() ?? 0;
    this.render();
  }

  close(): void {
    if (!this.open) return;
    this.open = false;
    this.sliderDragging = false;
    // Closing mid-process cancels the bar (nothing's consumed until it fills).
    this.busy = false;
    this.progressBar.stop();
    this.bg.setVisible(false);
    this.clearRows();
    this.tooltipUI.hide();
  }

  isOpen(): boolean {
    return this.open;
  }

  // MainScene calls this every frame while open so counts/preview refresh
  // immediately after a process/load/retrieve action.
  refresh(): void {
    if (this.open) this.render();
  }

  // Call after loading new input into the station — defaults the slider to
  // the full newly-loaded amount, matching the common case of "I dragged in
  // the whole stack and want to process all of it" without an extra step.
  // Doesn't fire on every refresh() so it never fights a manual slider
  // adjustment mid-session.
  selectFullAmount(): void {
    const station = this.deps.station();
    this.selectedAmount = station?.maxPossibleOutput() ?? 0;
    if (this.open) this.render();
  }

  hideTooltip(): void {
    this.tooltipUI.hide();
  }

  // Whether a screen point falls within the panel — see CraftingMenu's
  // containsPoint for why this matters to drag resolution.
  containsPoint(screenX: number, screenY: number): boolean {
    if (!this.open) return false;
    return (
      screenX >= this.panelX &&
      screenX <= this.panelX + this.panelW &&
      screenY >= this.panelY &&
      screenY <= this.panelY + this.panelH
    );
  }

  // Backpack slot index under a screen point (drop target for moving items
  // back into the bag), or null.
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

  // --- slider drag (driven by MainScene's shared global pointermove/up) ---

  isDraggingSlider(): boolean {
    return this.sliderDragging;
  }

  endSliderDrag(): void {
    this.sliderDragging = false;
  }

  updateSliderFromPointer(screenX: number): void {
    const station = this.deps.station();
    const max = station?.maxPossibleOutput() ?? 0;
    const frac = Phaser.Math.Clamp((screenX - this.sliderTrack.x) / this.sliderTrack.w, 0, 1);
    this.selectedAmount = Math.round(frac * max);
    this.render();
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

    const max = station.maxPossibleOutput();
    this.selectedAmount = Phaser.Math.Clamp(this.selectedAmount, 0, max);

    this.addText(this.panelX + 16, this.panelY + 14, "Drying Rack", 16, "#ffffff");
    const desc = itemDef("drying_rack")?.description ?? "";
    const descText = this.scene.add
      .text(this.panelX + 16, this.panelY + 38, desc, {
        fontFamily: "monospace",
        fontSize: "11px",
        color: "#8a93a3",
        wordWrap: { width: this.panelW - 32 },
      })
      .setScrollFactor(0)
      .setDepth(DEPTH_TEXT);
    this.rows.push(descText);

    this.addText(this.backpackX, this.backpackY - 18, "Backpack", 12, "#8a93a3");
    this.renderBackpack(station);
    this.renderProcess(station, max);
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
            this.tooltipUI.show(stack.key, { x, y, width: SLOT, height: SLOT }, "right", stack.tier);
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

  private renderProcess(station: ProcessingStation, max: number): void {
    const px = this.processX;

    // --- Input ---
    this.addText(px, this.backpackY - 18, "Input", 12, "#8a93a3");
    const ib = this.inputBox;
    this.renderSlotBox(ib.x, ib.y, station.input, station.input ? "#8fe38f" : "#3a4250");
    if (station.input) {
      const takeOut = this.scene.add
        .text(ib.x + IO_SLOT + 12, ib.y + 4, "Take Out", {
          fontFamily: "monospace",
          fontSize: "12px",
          color: "#c8d0dc",
          backgroundColor: "#20242e",
          padding: { x: 6, y: 3 },
        })
        .setScrollFactor(0)
        .setDepth(DEPTH_TEXT)
        .setInteractive({ useHandCursor: true })
        .on("pointerdown", () => this.deps.retrieveInput());
      this.rows.push(takeOut);
    }

    // --- Amount selector (slider + numeric entry) ---
    const amountY = ib.y + IO_SLOT + 8;
    const amountLabel = station.input
      ? `Amount: ${this.selectedAmount} / ${max}`
      : "Amount: — (load an input first)";
    const amountText = this.scene.add
      .text(px, amountY, amountLabel, {
        fontFamily: "monospace",
        fontSize: "12px",
        color: "#e8ecf2",
      })
      .setScrollFactor(0)
      .setDepth(DEPTH_TEXT)
      .setInteractive({ useHandCursor: !!station.input })
      .on("pointerdown", () => this.promptForAmount(max));
    this.rows.push(amountText);

    const track = this.sliderTrack;
    const trackBg = this.scene.add
      .rectangle(track.x, track.y, track.w, SLIDER_H, 0x1a1f2a, 0.95)
      .setOrigin(0, 0)
      .setStrokeStyle(1, 0x3a4250)
      .setScrollFactor(0)
      .setDepth(DEPTH_ITEM)
      .setInteractive({ useHandCursor: !!station.input })
      .on("pointerdown", (pointer: Phaser.Input.Pointer) => {
        if (!station.input) return;
        this.sliderDragging = true;
        this.updateSliderFromPointer(pointer.x);
      });
    this.rows.push(trackBg);
    const frac = max > 0 ? this.selectedAmount / max : 0;
    const fill = this.scene.add
      .rectangle(track.x + 1, track.y + 1, Math.max(0, (track.w - 2) * frac), SLIDER_H - 2, 0xc9a86a, 1)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(DEPTH_ITEM + 1);
    this.rows.push(fill);
    // Handle knob at the current position.
    const knobX = track.x + track.w * frac;
    const knob = this.scene.add
      .rectangle(knobX, track.y + SLIDER_H / 2, 8, SLIDER_H + 8, 0xffffff, 1)
      .setOrigin(0.5, 0.5)
      .setScrollFactor(0)
      .setDepth(DEPTH_ITEM + 2);
    this.rows.push(knob);

    // --- Live preview + Process button ---
    // The slider/selectedAmount are already in output units — convert to
    // input units only here, at the previewFor/process call boundary.
    const recipe = station.recipeForLoaded();
    const inputAmount = recipe ? this.selectedAmount * recipe.inputPerOutput : 0;
    const preview = station.previewFor(inputAmount);
    const previewLabel =
      preview.output > 0 && recipe
        ? `-> ${preview.output} ${itemDef(recipe.output)?.name ?? ""}`
        : "-> nothing yet";
    const previewY = track.y + 22;
    this.addText(px, previewY, previewLabel, 13, preview.output > 0 ? "#8fe38f" : "#5b6472");

    const btnY = previewY + 26;
    const canProcess = preview.output > 0 && !this.busy;
    const btn = this.scene.add
      .text(px, btnY, this.busy ? "Drying…" : "Process", {
        fontFamily: "monospace",
        fontSize: "14px",
        color: canProcess ? "#0a0a0a" : "#4a4a4a",
        backgroundColor: canProcess ? "#8fe38f" : "#2a2a2a",
        padding: { x: 10, y: 5 },
      })
      .setScrollFactor(0)
      .setDepth(DEPTH_TEXT)
      .setInteractive({ useHandCursor: canProcess })
      .on("pointerdown", () => {
        if (!canProcess) return;
        // The batch is processed when the bar finishes (busy blocks re-clicks);
        // tween-driven so it still lands if the menu closes mid-bar.
        this.busy = true;
        this.progressBar.setPosition(px, btnY).setSize(96, 26).start(PROCESS_BAR_MS, {
          onComplete: () => {
            this.busy = false;
            this.deps.processAmount(inputAmount);
            if (this.open) this.render();
          },
        });
        this.render();
      });
    this.rows.push(btn);

    // Keep the running bar pinned over the (greyed) button across re-renders.
    if (this.busy) this.progressBar.setPosition(px, btnY).setVisible(true);
  }

  private promptForAmount(max: number): void {
    if (max <= 0) return;
    // eslint-disable-next-line no-alert
    const raw = window.prompt(`Amount to process (0-${max}):`, `${this.selectedAmount}`);
    if (raw === null) return;
    const n = Math.floor(Number(raw));
    if (Number.isNaN(n)) return;
    this.selectedAmount = Phaser.Math.Clamp(n, 0, max);
    this.render();
  }

  // A single item box showing an icon + count (or empty). `stroke` is a hex
  // string.
  private renderSlotBox(
    x: number,
    y: number,
    slot: { key: string; count: number } | null,
    stroke: string,
  ): void {
    const strokeColor = Phaser.Display.Color.HexStringToColor(stroke).color;
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
