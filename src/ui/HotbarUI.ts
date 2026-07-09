import Phaser from "phaser";
import type { Hotbar } from "../systems/Hotbar";
import type { ItemContainer } from "../systems/ItemContainer";
import { itemDef } from "../systems/Items";
import type { Skills } from "../systems/Skills";
import { Tooltip } from "./Tooltip";

const SLOT_SIZE = 40;
const SLOT_GAP = 6;
const SLOT_COUNT = 9;

export interface HotbarUIDeps {
  skills: Skills;
  // Left-press on a slot begins dragging that slot's stack.
  beginDrag: (container: ItemContainer, index: number, pointer: Phaser.Input.Pointer) => void;
  // Right-click on a slot holding a weapon with a defined upgrade path opens
  // its Upgrade panel (see MainScene.openWeaponUpgradeMenu).
  openWeaponUpgrade: (container: ItemContainer, index: number) => void;
  // Suppress tooltips while a drag is in progress.
  isDragging: () => boolean;
}

// Always-visible bottom-center bar of 9 slots. Renders the hotbar's
// ItemContainer (icons + stack counts) and is both a drag source and a drop
// target. slotAt() lets the scene-level drag controller find the slot under
// the pointer on drop. All coords are screen-space (scrollFactor 0), so
// pointer.x/y compare directly.
export class HotbarUI {
  private scene: Phaser.Scene;
  private hotbar: Hotbar;
  private deps: HotbarUIDeps;
  private rows: Phaser.GameObjects.GameObject[] = [];
  private tooltipUI: Tooltip;
  private originX: number;
  private originY: number;

  constructor(scene: Phaser.Scene, hotbar: Hotbar, deps: HotbarUIDeps) {
    this.scene = scene;
    this.hotbar = hotbar;
    this.deps = deps;
    this.tooltipUI = new Tooltip(scene, deps.skills);
    const totalW = SLOT_COUNT * SLOT_SIZE + (SLOT_COUNT - 1) * SLOT_GAP;
    this.originX = (scene.scale.width - totalW) / 2;
    this.originY = scene.scale.height - SLOT_SIZE - 14;
    this.render();
  }

  // Top edge of the hotbar row, in screen space — lets other fixed HUD
  // elements (the stamina bar, and future HP/mana bars) anchor directly
  // above it without duplicating the centering math.
  get top(): number {
    return this.originY;
  }

  refresh(): void {
    this.render();
  }

  hideTooltip(): void {
    this.tooltipUI.hide();
  }

  // Which hotbar slot (if any) contains the given screen point — used as a
  // drop target and to keep world interaction from firing over the bar.
  slotAt(screenX: number, screenY: number): number | null {
    if (screenY < this.originY || screenY > this.originY + SLOT_SIZE) return null;
    for (let i = 0; i < SLOT_COUNT; i++) {
      const x = this.originX + i * (SLOT_SIZE + SLOT_GAP);
      if (screenX >= x && screenX <= x + SLOT_SIZE) return i;
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

    for (let i = 0; i < SLOT_COUNT; i++) {
      const x = this.originX + i * (SLOT_SIZE + SLOT_GAP);
      const y = this.originY;
      const stack = this.hotbar.get(i);
      const isSelected = selected === i;

      const box = this.scene.add
        .rectangle(x, y, SLOT_SIZE, SLOT_SIZE, 0x0a0a0a, 0.8)
        .setOrigin(0, 0)
        .setStrokeStyle(2, isSelected ? 0xffe08a : 0x444a55)
        .setScrollFactor(0)
        .setDepth(2500)
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
            if (stack && itemDef(stack.key)?.weapon) this.deps.openWeaponUpgrade(this.hotbar.container, i);
            return;
          }
          this.deps.beginDrag(this.hotbar.container, i, pointer);
        });
      this.rows.push(box);

      const num = this.scene.add
        .text(x + 3, y + 2, `${i + 1}`, {
          fontFamily: "monospace",
          fontSize: "11px",
          color: "#8a93a3",
        })
        .setScrollFactor(0)
        .setDepth(2501);
      this.rows.push(num);

      if (stack) {
        const def = itemDef(stack.key);
        if (def) {
          const icon = this.scene.add
            .image(x + SLOT_SIZE / 2, y + SLOT_SIZE / 2, def.texture)
            .setScrollFactor(0)
            .setDepth(2501);
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
            .setDepth(2502);
          this.rows.push(c);
        }
      }
    }
  }
}
