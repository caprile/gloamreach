import Phaser from "phaser";
import type { EquipSlot } from "../systems/Equipment";
import type { ItemContainer } from "../systems/ItemContainer";
import { itemDef } from "../systems/Items";
import type { Skills } from "../systems/Skills";
import type { PlayerProgression } from "../systems/Progression";
import { Tooltip } from "./Tooltip";

export interface ArmorSlotView {
  id: EquipSlot;
  label: string;
  itemKey: string | null;
  tier?: number;
}

// Live rollup of the player's current combat loadout — computed fresh by
// MainScene.combatStats() every render() call (mirrors the exact math
// Tooltip's weapon "base (adjusted)" lines already use), not derived here.
export interface CombatStatsView {
  weaponName: string | null; // null if no weapon equipped
  damage: number;
  damageTypeName: string | null; // e.g. "Pierce"; null if no weapon
  attackSpeed: number; // attacks/sec, 0 if no weapon
  staminaCost: number; // per hit, 0 if no weapon
  armor: number; // total flat defense from all worn armor
  attackRange: number; // px, same reach used for interact/attack gating
}

// Live "what determines the player's move speed right now" breakdown,
// computed by MainScene.runSpeedBreakdown() — shared by the Character menu's
// full Stats-tab breakdown and this panel's compact Combat-column line.
export interface RunSpeedView {
  walk: number; // base walk speed, px/s
  sprintMultiplier: number; // e.g. 1.775 at Running lvl 5
  sprint: number; // px/s, round(walk * sprintMultiplier)
  runningLevel: number;
  runningBonus: number; // px/s the Running skill adds vs. the 1.75x base sprint
  itemBonus: number; // px/s from speed items — always 0 today, no such items exist
}

export interface InventoryMenuDeps {
  backpack: ItemContainer;
  skills: Skills;
  progression: PlayerProgression;
  armorSlots: () => ArmorSlotView[];
  combatStats: () => CombatStatsView;
  runSpeedBreakdown: () => RunSpeedView;
  // Left-press on a filled slot begins dragging that stack.
  beginDrag: (container: ItemContainer, index: number, pointer: Phaser.Input.Pointer) => void;
  // Left-press on an occupied equipment slot begins dragging the equipped
  // item back out (e.g. to unequip it by dropping it in the backpack).
  beginArmorDrag: (slot: EquipSlot, pointer: Phaser.Input.Pointer) => void;
  // Ctrl+Click alias for unequipping — mirrors the standing pattern where
  // every double-click quick-move gesture also gets a Ctrl+Click alias.
  unequipArmorSlot: (slot: EquipSlot) => void;
  // Right-click on an equipment slot opens a small Unequip/Upgrade (or
  // Equip/Upgrade if empty) context menu — mirrors a placed station's
  // right-click Upgrade/Destroy popup.
  openArmorContextMenu: (slot: EquipSlot, screenX: number, screenY: number) => void;
  // Right-click on a backpack slot holding a weapon with a defined upgrade
  // path opens its Upgrade panel (see MainScene.openWeaponUpgradeMenu).
  openWeaponUpgrade: (container: ItemContainer, index: number) => void;
  // Right-click on a backpack slot holding a placeable (Workbench, Campfire,
  // ...) opens a tiny "Place" context menu — mirrors a placed station's own
  // right-click popup. A single left-click already enters placement mode too
  // (deferred behind the double-click window); this is an explicit,
  // discoverable alternative that doesn't require knowing that.
  openPlaceContextMenu: (container: ItemContainer, index: number, screenX: number, screenY: number) => void;
  // Right-click on a backpack slot holding an `edible` item eats one, applying
  // its heal-over-time buff (Buffs.ts). Food has no other right-click action.
  eatItem: (container: ItemContainer, index: number) => void;
  // Suppress tooltips while a drag is in progress.
  isDragging: () => boolean;
}

export const PANEL_X = 16;
export const PANEL_Y = 48;
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

// Combat-stats column: a 3rd side-by-side section, right of Equipment —
// live "what am I currently equipped with" summary (damage/attack speed/
// attack stamina/armor), computed by MainScene.combatStats().
const STATS_GAP = 24;
const STATS_X = ARMOR_X + ARMOR_W + STATS_GAP;
const STATS_Y = ARMOR_Y;
const STATS_W = 176;

export const PANEL_W = STATS_X + STATS_W - PANEL_X + 12;
export const PANEL_H = BACKPACK_Y + BACKPACK_H - PANEL_Y + 20; // 382

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
    this.tooltipUI = new Tooltip(scene, deps.skills, deps.progression);

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

  // Equipment slot under a screen point, or null — used as a drag-drop
  // target so dropping a dragged armor stack onto its matching slot equips
  // it (mirrors slotIndexAt for the backpack grid).
  armorSlotAt(screenX: number, screenY: number): EquipSlot | null {
    if (!this.open) return null;
    const dx = screenX - ARMOR_X;
    const dy = screenY - ARMOR_Y;
    if (dx < 0 || dy < 0) return null;
    const col = Math.floor(dx / (SLOT + GAP));
    const row = Math.floor(dy / (SLOT + GAP));
    if (col >= ARMOR_COLS || row >= ARMOR_ROWS_MAX) return null;
    if (dx - col * (SLOT + GAP) > SLOT || dy - row * (SLOT + GAP) > SLOT) return null;
    const index = row * ARMOR_COLS + col;
    const slots = this.deps.armorSlots();
    return index < slots.length ? slots[index].id : null;
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
    this.addText(STATS_X, PANEL_Y + 36, "Combat", 12, "#8a93a3");
    this.renderBackpack();
    this.renderArmor(ARMOR_X, ARMOR_Y);
    this.renderTrash();
    this.renderCombatStats(STATS_X, STATS_Y);
  }

  // Live equipped-loadout summary — damage/attack speed/attack stamina cost
  // (all from the currently equipped hotbar weapon, blank if none) plus total
  // armor (summed across every worn armor piece, 0 if none worn).
  private renderCombatStats(x0: number, y0: number): void {
    const stats = this.deps.combatStats();
    let y = y0;
    const lineGap = 20;
    this.addText(x0, y, stats.weaponName ?? "No weapon equipped", 12, stats.weaponName ? "#e8ecf2" : "#5b6472");
    y += lineGap + 4;
    // Neutral grey throughout (matches Attack Range/Move Speed below) — per
    // the user, red/green should be reserved for actual buff/debuff markers
    // (e.g. "boosted by an item"), not decorative per-stat coloring.
    this.addText(
      x0,
      y,
      `Damage: ${stats.weaponName ? `${stats.damage} ${stats.damageTypeName}` : "-"}`,
      12,
      "#8a93a3",
    );
    y += lineGap;
    this.addText(x0, y, `Attack Speed: ${stats.weaponName ? `${stats.attackSpeed.toFixed(1)}/s` : "-"}`, 12, "#8a93a3");
    y += lineGap;
    this.addText(x0, y, `Attack Stamina: ${stats.weaponName ? stats.staminaCost : "-"}`, 12, "#8a93a3");
    y += lineGap;
    this.addText(x0, y, `Armor: ${stats.armor}`, 12, "#8a93a3");
    y += lineGap;
    this.addText(x0, y, `Attack Range: ${stats.attackRange}`, 12, "#8a93a3");
    y += lineGap;
    const speed = this.deps.runSpeedBreakdown();
    this.addText(x0, y, `Move Speed: ${speed.walk} / ${speed.sprint} spr`, 12, "#8a93a3");
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
        .setStrokeStyle(1, slot.itemKey ? 0x5b6472 : 0x3a4250)
        .setScrollFactor(0)
        .setDepth(3001)
        .setInteractive({ useHandCursor: !!slot.itemKey })
        .on("pointerover", () => {
          if (slot.itemKey && !this.deps.isDragging())
            this.tooltipUI.show(slot.itemKey, { x, y, width: SLOT, height: SLOT }, "right", slot.tier);
        })
        .on("pointerout", () => this.hideTooltip())
        .on("pointerdown", (pointer: Phaser.Input.Pointer) => {
          if (pointer.rightButtonDown()) {
            this.deps.openArmorContextMenu(slot.id, pointer.x, pointer.y);
            return;
          }
          const e = pointer.event as (MouseEvent & { ctrlKey?: boolean }) | undefined;
          if (e?.ctrlKey && slot.itemKey) {
            this.deps.unequipArmorSlot(slot.id);
            return;
          }
          if (slot.itemKey) this.deps.beginArmorDrag(slot.id, pointer);
        });
      this.rows.push(box);

      if (slot.itemKey) {
        const def = itemDef(slot.itemKey);
        if (def) {
          const icon = this.scene.add
            .image(x + SLOT / 2, y + SLOT / 2, def.texture)
            .setScrollFactor(0)
            .setDepth(3002);
          this.rows.push(icon);
        }
      } else {
        this.addText(x + SLOT / 2, y + SLOT / 2, slot.label, 10, "#5b6472", 0.5, 0.5);
      }
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
            this.tooltipUI.show(stack.key, { x, y, width: SLOT, height: SLOT }, "right", stack.tier);
        })
        .on("pointerout", () => this.hideTooltip())
        .on("pointerdown", (pointer: Phaser.Input.Pointer) => {
          if (!stack) return;
          // Right-click is reserved for context-menu/upgrade actions now —
          // quick-move-to-hotbar (or quick-equip) moved to double-left-click,
          // detected by the scene via the click-in-place path (see
          // MainScene.resolveItemDrag) — except on a weapon (opens its
          // Upgrade panel) or a placeable (opens a "Place" popup).
          if (pointer.rightButtonDown()) {
            const def = itemDef(stack.key);
            if (def?.edible) this.deps.eatItem(backpack, i);
            else if (def?.weapon) this.deps.openWeaponUpgrade(backpack, i);
            else if (def?.placeable) this.deps.openPlaceContextMenu(backpack, i, pointer.x, pointer.y);
            return;
          }
          this.deps.beginDrag(backpack, i, pointer);
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
