import Phaser from "phaser";
import { ROW1_COUNT, ROW2_COUNT, type Hotbar } from "../systems/Hotbar";
import type { ItemContainer } from "../systems/ItemContainer";
import { itemDef } from "../systems/Items";
import type { Skills } from "../systems/Skills";
import type { PlayerProgression } from "../systems/Progression";
import { Tooltip } from "./Tooltip";

const SLOT_SIZE = 40;
const SLOT_GAP = 6;
const ROW_GAP = 6;
const BOTTOM_MARGIN = 34;
const TOTAL_SLOTS = ROW1_COUNT + ROW2_COUNT;

export interface HotbarUIDeps {
  skills: Skills;
  progression: PlayerProgression;
  // Left-press on a slot begins dragging that slot's stack.
  beginDrag: (container: ItemContainer, index: number, pointer: Phaser.Input.Pointer) => void;
  // Right-click on a slot holding a weapon with a defined upgrade path opens
  // its Upgrade panel (see MainScene.openWeaponUpgradeMenu).
  openWeaponUpgrade: (container: ItemContainer, index: number) => void;
  // Right-click on a slot holding an `edible` item eats one (Buffs.ts) — food
  // can sit in the hotbar for quick eating without opening the backpack.
  eatItem: (container: ItemContainer, index: number) => void;
  // Suppress tooltips while a drag is in progress.
  isDragging: () => boolean;
}

// Always-visible bottom-center bar, TWO stacked rows of ROW1_COUNT slots
// each: row 1 (top, keyed 1-9) is the original tool/weapon quick-select; row
// 2 (bottom, keyed Alt+1-9) is a dedicated row for crafting stations/
// processors (see Hotbar.ts). Both rows render off the same flat
// Hotbar.container/selectedSlot — row 2 is a layout/routing convention, not
// a separate selection system. Renders the hotbar's ItemContainer (icons +
// stack counts) and is both a drag source and a drop target. slotAt() lets
// the scene-level drag controller find the slot under the pointer on drop.
// All coords are screen-space (scrollFactor 0), so pointer.x/y compare
// directly.
export class HotbarUI {
  private scene: Phaser.Scene;
  private hotbar: Hotbar;
  private deps: HotbarUIDeps;
  private rows: Phaser.GameObjects.GameObject[] = [];
  private tooltipUI: Tooltip;
  private originX: number;
  private row1Y: number;
  private row2Y: number;

  constructor(scene: Phaser.Scene, hotbar: Hotbar, deps: HotbarUIDeps) {
    this.scene = scene;
    this.hotbar = hotbar;
    this.deps = deps;
    this.tooltipUI = new Tooltip(scene, deps.skills, deps.progression);
    const totalW = ROW1_COUNT * SLOT_SIZE + (ROW1_COUNT - 1) * SLOT_GAP;
    this.originX = (scene.scale.width - totalW) / 2;
    this.row2Y = scene.scale.height - SLOT_SIZE - BOTTOM_MARGIN;
    this.row1Y = this.row2Y - ROW_GAP - SLOT_SIZE;
    this.render();
  }

  // Top edge of row 1, in screen space — lets other fixed HUD elements (the
  // stamina/HP/XP bars) anchor directly above the whole hotbar block without
  // duplicating the centering math.
  get top(): number {
    return this.row1Y;
  }

  // Left edge / total width / bottom edge of the (row-1-width) hotbar block,
  // in screen space — lets other fixed HUD elements (the XP bar) match the
  // hotbar's horizontal span exactly instead of duplicating the centering math.
  get left(): number {
    return this.originX;
  }

  get width(): number {
    return ROW1_COUNT * SLOT_SIZE + (ROW1_COUNT - 1) * SLOT_GAP;
  }

  get bottom(): number {
    return this.row2Y + SLOT_SIZE;
  }

  refresh(): void {
    this.render();
  }

  hideTooltip(): void {
    this.tooltipUI.hide();
  }

  // Which row (0 = tools/weapons, 1 = stations) a screen Y falls in, or null.
  private rowAt(screenY: number): 0 | 1 | null {
    if (screenY >= this.row1Y && screenY <= this.row1Y + SLOT_SIZE) return 0;
    if (screenY >= this.row2Y && screenY <= this.row2Y + SLOT_SIZE) return 1;
    return null;
  }

  // Which hotbar slot (if any, 0..TOTAL_SLOTS-1) contains the given screen
  // point — used as a drop target and to keep world interaction from firing
  // over either row of the bar.
  slotAt(screenX: number, screenY: number): number | null {
    const row = this.rowAt(screenY);
    if (row === null) return null;
    for (let col = 0; col < ROW1_COUNT; col++) {
      const x = this.originX + col * (SLOT_SIZE + SLOT_GAP);
      if (screenX >= x && screenX <= x + SLOT_SIZE) return row === 0 ? col : ROW1_COUNT + col;
    }
    return null;
  }

  private clear(): void {
    for (const r of this.rows) r.destroy();
    this.rows = [];
  }

  private render(): void {
    this.clear();
    this.hideTooltip();
    const selected = this.hotbar.selected();

    for (let i = 0; i < TOTAL_SLOTS; i++) {
      const isRow2 = i >= ROW1_COUNT;
      const col = isRow2 ? i - ROW1_COUNT : i;
      const x = this.originX + col * (SLOT_SIZE + SLOT_GAP);
      const y = isRow2 ? this.row2Y : this.row1Y;
      const stack = this.hotbar.get(i);
      const isSelected = selected === i;

      const box = this.scene.add
        .rectangle(x, y, SLOT_SIZE, SLOT_SIZE, isRow2 ? 0x0a0e0a : 0x0a0a0a, 0.8)
        .setOrigin(0, 0)
        .setStrokeStyle(2, isSelected ? 0xffe08a : isRow2 ? 0x3a4a38 : 0x444a55)
        .setScrollFactor(0)
        .setDepth(2900) // must clear WORLD_H (2688) so trees/world objects (depth=y) never draw over the hotbar
        .setInteractive({ useHandCursor: true })
        .on("pointerover", () => {
          if (stack && !this.deps.isDragging())
            this.tooltipUI.show(stack.key, { x, y, width: SLOT_SIZE, height: SLOT_SIZE }, "above", stack.tier);
        })
        .on("pointerout", () => this.tooltipUI.hide())
        .on("pointerdown", (pointer: Phaser.Input.Pointer) => {
          // Right-click is a no-op now — quick-move-to-backpack moved to a
          // double-left-click-in-place, detected scene-side (see
          // MainScene.resolveItemDrag) — except on a weapon, which opens its
          // Upgrade panel instead.
          if (pointer.rightButtonDown()) {
            if (stack && itemDef(stack.key)?.edible) this.deps.eatItem(this.hotbar.container, i);
            else if (stack && itemDef(stack.key)?.weapon) this.deps.openWeaponUpgrade(this.hotbar.container, i);
            return;
          }
          this.deps.beginDrag(this.hotbar.container, i, pointer);
        });
      this.rows.push(box);

      const num = this.scene.add
        .text(x + 3, y + 2, `${col + 1}`, {
          fontFamily: "monospace",
          fontSize: "11px",
          color: isRow2 ? "#e8c040" : "#8a93a3",
        })
        .setScrollFactor(0)
        .setDepth(2901);
      this.rows.push(num);

      if (stack) {
        const def = itemDef(stack.key);
        if (def) {
          const icon = this.scene.add
            .image(x + SLOT_SIZE / 2, y + SLOT_SIZE / 2, def.texture)
            .setScrollFactor(0)
            .setDepth(2901);
          this.rows.push(icon);
        }
        if (stack.count > 1) {
          const c = this.scene.add
            .text(x + SLOT_SIZE - 3, y + SLOT_SIZE - 2, `${stack.count}`, {
              fontFamily: "monospace",
              fontSize: "11px",
              color: "#ffffff",
            })
            .setOrigin(1, 1)
            .setScrollFactor(0)
            .setDepth(2902);
          this.rows.push(c);
        }
      }
    }
  }
}
