import Phaser from "phaser";
import { ROW1_COUNT, ROW2_COUNT, type Hotbar } from "../systems/Hotbar";
import type { ItemContainer } from "../systems/ItemContainer";
import { itemDef } from "../systems/Items";
import type { Skills } from "../systems/Skills";
import type { PlayerProgression } from "../systems/Progression";
import type { WeaponType } from "../systems/Weapons";
import { appliedAugmentIds, isAugmentableItem, MAX_AUGMENTS_PER_ITEM } from "../systems/GearAugments";
import { Tooltip } from "./Tooltip";

// Bumped 40->46 to match the InventoryMenu slot size (S3) — icons render the
// same size whether they sit in the backpack or the hotbar.
const SLOT_SIZE = 46;
const SLOT_GAP = 6;
const ROW_GAP = 6;
const BOTTOM_MARGIN = 34;
// Icons are generated tiny (native ~14-30px) and were drawn at native size, so
// they looked lost in the slot. Fit each within this box (aspect preserved).
const ICON_BOX = SLOT_SIZE - 12;
const TOTAL_SLOTS = ROW1_COUNT + ROW2_COUNT;

export interface HotbarUIDeps {
  skills: Skills;
  progression: PlayerProgression;
  // Left-press on a slot begins dragging that slot's stack.
  beginDrag: (container: ItemContainer, index: number, pointer: Phaser.Input.Pointer) => void;
  // Right-click on a slot holding gear (weapon/tool/armor) with a defined
  // upgrade path opens its Upgrade panel (see MainScene.openGearUpgradeMenu).
  openGearUpgrade: (container: ItemContainer, index: number) => void;
  // Right-click on a slot holding an `edible` item eats one (Buffs.ts) — food
  // can sit in the hotbar for quick eating without opening the backpack.
  eatItem: (container: ItemContainer, index: number) => void;
  // Suppress tooltips while a drag is in progress.
  isDragging: () => boolean;
  // Resolve the on-screen texture for a stack, honoring per-tier station art so
  // an upgraded bench in the hotbar shows the same tier sprite it does when
  // placed (the user: "art for benches needs to also show in the hotbar").
  // Returns null to fall back to the item's base icon.
  stationTexture?: (key: string, tier: number) => string | null;
  // Whether the item (weapon/tool) at (key, tier) has a discovered + affordable
  // next-tier upgrade the player could apply right now — drives the small
  // pulsing "upgrade ready" arrow (S3). Materials only (position-independent),
  // so it doesn't flicker as the player walks near/away from a Workbench.
  upgradeReady?: (key: string, tier: number, appliedIds?: string[]) => boolean;
  // Live capped crit totals for a weapon (base + Strength/Agility + relics) —
  // shown on the weapon tooltip alongside the per-weapon base.
  critTotals?: (weapon: WeaponType) => { chance: number; mult: number };
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
  private refreshQueued = false;
  private rows: Phaser.GameObjects.GameObject[] = [];
  // Looping alpha tweens for the "upgrade ready" arrows — tracked so they're
  // killed on every re-render (rows are destroyed each render; an orphaned
  // repeat:-1 tween would leak, per the codebase's infinite-tween-leak note).
  private indicatorTweens: Phaser.Tweens.Tween[] = [];
  private tooltipUI: Tooltip;
  private originX: number;
  private row1Y: number;
  private row2Y: number;

  constructor(scene: Phaser.Scene, hotbar: Hotbar, deps: HotbarUIDeps) {
    this.scene = scene;
    this.hotbar = hotbar;
    this.deps = deps;
    this.tooltipUI = new Tooltip(scene, deps.skills, deps.progression, deps.critTotals);
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

  // Coalesced repaint, same pattern as InventoryMenu/CraftingMenu. render() is a
  // full teardown-and-rebuild of every slot, and MainScene calls this several
  // times in a single frame — twice per armor equip, and once per collected node
  // while a magnet sweep is pulling drops in. Rebuilding interactive objects
  // repeatedly under a stationary cursor is what strobes the bar.
  refresh(): void {
    if (this.refreshQueued) return;
    this.refreshQueued = true;
    this.scene.events.once(Phaser.Scenes.Events.POST_UPDATE, () => {
      this.refreshQueued = false;
      this.render(true);
    });
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
    for (const t of this.indicatorTweens) t.remove();
    this.indicatorTweens = [];
    for (const r of this.rows) r.destroy();
    this.rows = [];
  }

  // A small gold up-arrow at a slot's top-right corner with a gentle looping
  // fade, shown when that slot's item has an affordable upgrade ready (S3).
  private addUpgradeArrow(slotX: number, slotY: number): void {
    const arrow = this.scene.add
      .text(slotX + SLOT_SIZE - 2, slotY + 1, "▲", { fontFamily: "monospace", fontSize: "16px", color: "#ffd24a" })
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(2902);
    this.rows.push(arrow);
    this.indicatorTweens.push(
      this.scene.tweens.add({ targets: arrow, alpha: { from: 1, to: 0.25 }, duration: 620, yoyo: true, repeat: -1 }),
    );
  }


  // Gem-slot pips (biome 3 Phase 3) — mirrors InventoryMenu.addGemPips so an
  // augmentable weapon reads the same in the hotbar as in the backpack.
  private addGemPips(slotX: number, slotY: number, key: string, upgrades?: string[]): void {
    if (!isAugmentableItem(key)) return;
    const used = appliedAugmentIds({ upgrades }).length;
    for (let i = 0; i < MAX_AUGMENTS_PER_ITEM; i++) {
      const filled = i < used;
      const pip = this.scene.add
        .rectangle(slotX + 5 + i * 8, slotY + SLOT_SIZE - 6, 5, 5, filled ? 0x9a5cff : 0x2b3040, 1)
        .setOrigin(0, 1)
        .setStrokeStyle(1, filled ? 0xc9a8ff : 0x4a5262)
        .setAngle(45)
        .setScrollFactor(0)
        .setDepth(2902);
      this.rows.push(pip);
    }
  }

  // `keepTooltip` is set only by the coalesced refresh path — rebuilding destroys
  // the slot the pointer is over and Phaser won't re-fire pointerover until the
  // pointer moves, so unconditionally hiding here made the tooltip vanish (and
  // stay vanished) on every pickup. Mirrors InventoryMenu.render.
  private render(keepTooltip = false): void {
    this.clear();
    if (!keepTooltip) this.hideTooltip();
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
            this.tooltipUI.show(stack.key, { x, y, width: SLOT_SIZE, height: SLOT_SIZE }, "above", stack.tier, stack.upgrades);
        })
        .on("pointerout", () => this.tooltipUI.hide())
        .on("pointerdown", (pointer: Phaser.Input.Pointer) => {
          // Right-click is a no-op now — quick-move-to-backpack moved to a
          // double-left-click-in-place, detected scene-side (see
          // MainScene.resolveItemDrag) — except on gear (weapon/tool/armor),
          // which opens its Upgrade panel instead.
          if (pointer.rightButtonDown()) {
            const def = stack ? itemDef(stack.key) : undefined;
            if (def?.edible) this.deps.eatItem(this.hotbar.container, i);
            else if (def && (def.weapon || def.tool || def.armorSlot))
              this.deps.openGearUpgrade(this.hotbar.container, i);
            return;
          }
          this.deps.beginDrag(this.hotbar.container, i, pointer);
        });
      this.rows.push(box);

      const num = this.scene.add
        .text(x + 3, y + 2, `${col + 1}`, {
          fontFamily: "monospace",
          fontSize: "13px",
          color: isRow2 ? "#e8c040" : "#8a93a3",
        })
        .setScrollFactor(0)
        .setDepth(2901);
      this.rows.push(num);

      if (stack) {
        const def = itemDef(stack.key);
        if (def) {
          const tiered = this.deps.stationTexture?.(stack.key, stack.tier ?? 0);
          const tex = tiered && this.scene.textures.exists(tiered) ? tiered : def.texture;
          const icon = this.scene.add
            .image(x + SLOT_SIZE / 2, y + SLOT_SIZE / 2, tex)
            .setScrollFactor(0)
            .setDepth(2901);
          const s = Math.min(ICON_BOX / icon.width, ICON_BOX / icon.height);
          icon.setDisplaySize(icon.width * s, icon.height * s);
          this.rows.push(icon);
        }
        if (this.deps.upgradeReady?.(stack.key, stack.tier ?? 0, stack.upgrades)) this.addUpgradeArrow(x, y);
        this.addGemPips(x, y, stack.key, stack.upgrades);
        if (stack.count > 1) {
          const c = this.scene.add
            .text(x + SLOT_SIZE - 3, y + SLOT_SIZE - 2, `${stack.count}`, {
              fontFamily: "monospace",
              fontSize: "13px",
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
