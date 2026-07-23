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
  // --- optional overrides so the same menu serves the Smelter (biome 2 Phase 4).
  // Functions (not static strings) so ONE menu instance can switch between the
  // Drying Rack and the Smelter based on which station the player opened. ---
  title?: () => string; // panel title (default "Drying Rack")
  descKey?: () => string; // itemDef key for the description line (default "drying_rack")
  actionLabel?: () => string; // process-button verb (default "Process")
  busyLabel?: () => string; // button label while the bar fills (default "Drying…")
  // Pull the loaded fuel (Smelter's Hex Essence) back out into the backpack.
  // Only wired for the Smelter (the Drying Rack has no fuel slot).
  retrieveFuel?: () => void;
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
  // The compatible-material cells currently drawn, mapped to their real
  // backpack index (the view is filtered, so grid position != container index).
  private visibleCells: { x: number; y: number; index: number }[] = [];

  private panelX: number;
  private panelY: number;
  private panelW: number;
  private panelH: number;
  private backpackX: number;
  private backpackY: number;
  private processX: number;
  private inputBox: { x: number; y: number } = { x: 0, y: 0 };
  // Fuel drop-target (Smelter only) — sits to the right of the input slot.
  private fuelBox: { x: number; y: number } = { x: 0, y: 0 };
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
    this.fuelBox = { x: this.processX + 40 + IO_SLOT + 14, y: this.backpackY };
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

  // Real backpack index of the compatible-material cell under a screen point
  // (drop target for moving items back into the bag), or null. Maps against the
  // filtered cells actually drawn, not a fixed grid.
  slotIndexAt(screenX: number, screenY: number): number | null {
    if (!this.open) return null;
    for (const c of this.visibleCells) {
      if (screenX >= c.x && screenX <= c.x + SLOT && screenY >= c.y && screenY <= c.y + SLOT) return c.index;
    }
    return null;
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

  // True when a screen point is over the fuel slot (Smelter only) — the drop
  // target that loads dragged fuel. False when the open station has no fuel slot.
  isOverFuel(screenX: number, screenY: number): boolean {
    if (!this.open || !this.deps.station()?.usesFuelSlot()) return false;
    return (
      screenX >= this.fuelBox.x &&
      screenX <= this.fuelBox.x + IO_SLOT &&
      screenY >= this.fuelBox.y &&
      screenY <= this.fuelBox.y + IO_SLOT
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

    this.addText(this.panelX + 16, this.panelY + 14, this.deps.title?.() ?? "Drying Rack", 16, "#ffffff");
    const desc = itemDef(this.deps.descKey?.() ?? "drying_rack")?.description ?? "";
    const descText = this.scene.add
      .text(this.panelX + 16, this.panelY + 38, desc, {
        fontFamily: "monospace",
        fontSize: "13px",
        color: "#8a93a3",
        wordWrap: { width: this.panelW - 32 },
      })
      .setScrollFactor(0)
      .setDepth(DEPTH_TEXT);
    this.rows.push(descText);

    this.addText(this.backpackX, this.backpackY - 18, "Compatible Materials", 12, "#8a93a3");
    this.renderBackpack(station);
    this.renderProcess(station, max);
  }

  // Shows ONLY the materials this station can accept as input or fuel (that the
  // player currently owns), instead of the whole backpack with everything else
  // dimmed — no more scanning past a bag full of unrelated loot to find the two
  // things a rack/smelter takes.
  private renderBackpack(station: ProcessingStation): void {
    this.visibleCells = [];
    const backpack = this.deps.backpack;
    const compatible: { index: number; stack: { key: string; count: number; tier?: number } }[] = [];
    for (let i = 0; i < backpack.size; i++) {
      const stack = backpack.slot(i);
      if (stack && (station.canAccept(stack.key) || station.canAcceptFuel(stack.key))) {
        compatible.push({ index: i, stack });
      }
    }

    if (compatible.length === 0) {
      this.addText(this.backpackX, this.backpackY + 8, "No compatible materials in your backpack.", 11, "#5b6472");
      return;
    }

    compatible.forEach((entry, gridPos) => {
      const col = gridPos % COLS;
      const row = Math.floor(gridPos / COLS);
      const x = this.backpackX + col * (SLOT + GAP);
      const y = this.backpackY + row * (SLOT + GAP);
      const stack = entry.stack;
      const index = entry.index;

      const box = this.scene.add
        .rectangle(x, y, SLOT, SLOT, 0x14181f, 0.9)
        .setOrigin(0, 0)
        .setStrokeStyle(1, 0x8fe38f)
        .setScrollFactor(0)
        .setDepth(DEPTH_ITEM)
        .setInteractive({ useHandCursor: true })
        .on("pointerover", () => {
          if (!this.deps.isDragging())
            this.tooltipUI.show(stack.key, { x, y, width: SLOT, height: SLOT }, "right", stack.tier);
        })
        .on("pointerout", () => this.tooltipUI.hide())
        .on("pointerdown", (pointer: Phaser.Input.Pointer) => {
          if (pointer.rightButtonDown()) this.deps.quickLoad(index);
          else this.deps.beginDrag(backpack, index, pointer);
        });
      this.rows.push(box);
      this.visibleCells.push({ x, y, index });

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
    });
  }

  private renderProcess(station: ProcessingStation, max: number): void {
    const px = this.processX;
    const ib = this.inputBox;
    const useFuel = station.usesFuelSlot();

    // --- Input slot (+ Fuel slot for the Smelter, side by side) ---
    this.addText(ib.x, this.backpackY - 18, useFuel ? "Ore" : "Input", 12, "#8a93a3");
    this.renderSlotBox(ib.x, ib.y, station.input, station.input ? "#8fe38f" : "#3a4250");
    // Small "Take Out" link under a loaded slot (moved below to make room for
    // the fuel slot to its right).
    const takeLink = (x: number, y: number, label: string, onClick: () => void) => {
      const t = this.scene.add
        .text(x, y, label, {
          fontFamily: "monospace",
          fontSize: "13px",
          color: "#c8d0dc",
          backgroundColor: "#20242e",
          padding: { x: 5, y: 2 },
        })
        .setScrollFactor(0)
        .setDepth(DEPTH_TEXT)
        .setInteractive({ useHandCursor: true })
        .on("pointerdown", onClick);
      this.rows.push(t);
    };
    const underSlotY = ib.y + IO_SLOT + 2;
    if (station.input) takeLink(ib.x, underSlotY, "Take Out", () => this.deps.retrieveInput());

    if (useFuel) {
      const fb = this.fuelBox;
      this.addText(fb.x, this.backpackY - 18, "Fuel", 12, "#8a93a3");
      this.renderSlotBox(fb.x, fb.y, station.fuel, station.fuel ? "#c9a86a" : "#3a4250");
      if (station.fuel) {
        takeLink(fb.x, underSlotY, "Take Out", () => this.deps.retrieveFuel?.());
      } else {
        // Empty-fuel hint so the player knows the Smelter needs Hex Essence.
        const fuelName = itemDef(station.fuelKey() ?? "")?.name ?? "fuel";
        this.addText(fb.x, underSlotY + 1, `Load ${fuelName}`, 10, "#8a7a55");
      }
    }

    // --- Amount selector (slider + numeric entry) ---
    const amountY = ib.y + IO_SLOT + 22;
    const amountLabel = station.input
      ? `Amount: ${this.selectedAmount} / ${max}`
      : "Amount: — (load an input first)";
    const amountText = this.scene.add
      .text(px, amountY, amountLabel, {
        fontFamily: "monospace",
        fontSize: "14px",
        color: "#e8ecf2",
      })
      .setScrollFactor(0)
      .setDepth(DEPTH_TEXT)
      .setInteractive({ useHandCursor: !!station.input })
      .on("pointerdown", () => this.promptForAmount(max));
    this.rows.push(amountText);

    // Slider Y follows the (now lower) amount label. Only Y moves — the drag
    // hit-test reads track.x/w, so repositioning Y each render is safe.
    this.sliderTrack.y = amountY + 20;
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
        ? `${preview.output} ${itemDef(recipe.output)?.name ?? ""}`
        : "-> nothing yet";
    const previewY = track.y + 22;
    // Show the OUTPUT item's icon next to the preview text (was text-only) —
    // reads visually like the input slot instead of just a number.
    let previewTextX = px;
    if (preview.output > 0 && recipe) {
      const outDef = itemDef(recipe.output);
      if (outDef) {
        const icon = this.scene.add
          .image(px + 8, previewY + 8, outDef.texture)
          .setDisplaySize(16, 16)
          .setScrollFactor(0)
          .setDepth(DEPTH_TEXT);
        this.rows.push(icon);
      }
      previewTextX = px + 20;
    }
    this.addText(
      previewTextX,
      previewY,
      preview.output > 0 ? `-> ${previewLabel}` : previewLabel,
      13,
      preview.output > 0 ? "#8fe38f" : "#5b6472",
    );

    // The Smelter's fuel is now its own loaded slot (rendered above), and
    // maxPossibleOutput already caps the slider by the loaded fuel — so if the
    // preview shows an output, the fuel to make it is guaranteed present.
    const btnY = previewY + 26;

    const canProcess = preview.output > 0 && !this.busy;
    const btn = this.scene.add
      .text(px, btnY, this.busy ? (this.deps.busyLabel?.() ?? "Drying…") : (this.deps.actionLabel?.() ?? "Process"), {
        fontFamily: "monospace",
        fontSize: "16px",
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
      .text(x, y, str, { fontFamily: "monospace", fontSize: `${size + 1}px`, color, align: "center" })
      .setOrigin(originX, originY)
      .setScrollFactor(0)
      .setDepth(DEPTH_TEXT);
    this.rows.push(t);
  }
}
