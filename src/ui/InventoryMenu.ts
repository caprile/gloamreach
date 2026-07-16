import Phaser from "phaser";
import { EQUIP_SLOTS, type EquipSlot } from "../systems/Equipment";
import type { ItemContainer, ItemStack } from "../systems/ItemContainer";
import { itemDef, itemBiome, itemCategory, type ItemBiome, type ItemCategory } from "../systems/Items";
import type { Skills } from "../systems/Skills";
import type { PlayerProgression } from "../systems/Progression";
import { RARITY_COLOR, rarityIcon, rarityName, relicEffectText, relicFamilyName, type RelicEffectSummary, type RelicFamilySlot, type RelicGroup } from "../systems/Relics";
import { Tooltip } from "./Tooltip";

export interface ArmorSlotView {
  id: EquipSlot;
  label: string;
  itemKey: string | null;
  tier?: number;
  // Set only for the "ammo" slot — every other slot holds a single item.
  count?: number;
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
  ammo: { name: string; count: number } | null; // loaded ranged ammo, if any
  critChance: number; // 0..0.6 fraction (weapon base + Agility + relics), 0 if no weapon
  critMult: number; // crit damage multiplier (weapon base + Strength + relics), 0 if no weapon
  identity: string | null; // S7 weapon-type identity line (e.g. "Focused — …"); null if no weapon
  setBonuses: { name: string; desc: string }[]; // active full armor-set bonuses (empty = none)
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
  // Phase 5: the player's owned relics, one fixed slot per family (empty or
  // filled) — surfaced right on the Inventory panel since playtesters kept
  // checking the Equipment column for them instead of the HUD relic bar.
  relicFamilySlots: () => RelicFamilySlot[];
  // Aggregated "all relic effects" — one row per channel the owned relics
  // touch, each with its grand total + the relics contributing to it (rendered
  // below the relic slots; hovering a row shows the per-relic breakdown).
  relicEffectSummary: () => RelicEffectSummary[];
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
  // "Sort" button next to the Backpack label — re-flows the backpack into
  // fewer, merged, sorted stacks (ItemContainer.sortAndStack).
  sortBackpack: () => void;
  // Whether the item at (key, tier) has a discovered + affordable next-tier
  // upgrade the player could apply right now — drives the small pulsing
  // "upgrade ready" arrow on backpack weapons/tools and worn armor (S3).
  // Materials-only (position-independent) so it doesn't flicker with movement.
  upgradeReady: (key: string, tier: number) => boolean;
}

export const PANEL_X = 16;
export const PANEL_Y = 48;
const SLOT = 46;
const GAP = 6;
const CELL = SLOT + GAP;
export const BACKPACK_COLS = 6;
// Sizes the grid VIEWPORT height (not the container). Each biome tab holds
// ~45-48 unique items => ~9-11 rows at 6 cols (~590-690px of content), so 15
// rows (~720px viewport) lets a per-biome tab show every row with no scroll.
// The panel bottom then lands ~y=898, still clear of the bottom hotbar (~960).
// The "All" tab (93 items) still scrolls a little — expected for the
// everything-view; a wider grid would be needed to make it scroll-free too.
export const BACKPACK_ROWS = 15;
// The backpack container is now effectively unlimited (auto-organized tabbed
// view, no manual arranging) — sized generously so a single hardcore run can't
// realistically overflow it. The 6x6 grid is just the on-screen viewport into
// this flat container; tabs/sections/scroll organize the rest.
export const BACKPACK_CAPACITY = 240;
const ARMOR_COLS = 3;
// Item icons are generated tiny (native ~14-30px); fit each within this box
// (aspect preserved) so they fill the slot instead of floating small (S3).
const ICON_BOX = SLOT - 12;

// Fixed layout anchors so render() and slotIndexAt() stay in lockstep.
// Backpack grid sits on the left, equipment grid to its right — both start
// at the same row (GRID_Y).
const GRID_Y = PANEL_Y + 56;
const BACKPACK_X = PANEL_X + 12; // 28
const BACKPACK_Y = GRID_Y;
const BACKPACK_W = BACKPACK_COLS * SLOT + (BACKPACK_COLS - 1) * GAP; // 306
const BACKPACK_H = BACKPACK_ROWS * SLOT + (BACKPACK_ROWS - 1) * GAP; // 306

// The backpack column now stacks a tab strip + search box above a scrollable,
// sectioned grid (the grid viewport keeps the old BACKPACK_Y..+BACKPACK_H
// footprint's bottom edge, so the panel height is unchanged).
const BP_TABS_Y = PANEL_Y + 58;
const BP_SEARCH_Y = PANEL_Y + 80;
const BP_SEARCH_H = 22;
const BP_GRID_TOP = PANEL_Y + 110;
const BP_GRID_BOTTOM = BACKPACK_Y + BACKPACK_H; // unchanged bottom edge
const BP_GRID_VIEW_H = BP_GRID_BOTTOM - BP_GRID_TOP;
const BP_SECTION_H = 18; // height of a "Materials"/"Gear"/... section header row

// Section order + labels within a biome tab (matches ItemContainer's sort).
const CATEGORY_SECTIONS: { cat: ItemCategory; label: string }[] = [
  { cat: "material", label: "Materials" },
  { cat: "gear", label: "Gear" },
  { cat: "station", label: "Stations" },
  { cat: "food", label: "Food" },
  { cat: "curio", label: "Trophies & Relics" },
];

const GRID_GAP = 24;
const ARMOR_X = BACKPACK_X + BACKPACK_W + GRID_GAP; // 358
const ARMOR_Y = GRID_Y;
const ARMOR_W = ARMOR_COLS * SLOT + (ARMOR_COLS - 1) * GAP; // 150
// Computed (not a literal) so the grid grows a row automatically if
// EQUIP_SLOTS ever gains another entry (e.g. the "ammo" slot did).
const ARMOR_ROWS_MAX = Math.ceil(EQUIP_SLOTS.length / ARMOR_COLS);
const ARMOR_H = ARMOR_ROWS_MAX * SLOT + (ARMOR_ROWS_MAX - 1) * GAP;

// Combat-stats column: a 3rd side-by-side section, right of Equipment —
// live "what am I currently equipped with" summary (damage/attack speed/
// attack stamina/armor), computed by MainScene.combatStats().
const STATS_GAP = 24;
const STATS_X = ARMOR_X + ARMOR_W + STATS_GAP;
const STATS_Y = ARMOR_Y;
const STATS_W = 176;

// Relics column: a 4th side-by-side section, right of Combat — one fixed slot
// per relic family (8 total, 2x4), paper-doll style like Equipment so owned
// relics are visible without opening the Relic Forge menu or squinting at the
// HUD bar.
const RELICS_GAP = 24;
const RELICS_X = STATS_X + STATS_W + RELICS_GAP;
const RELICS_Y = STATS_Y;
const RELICS_COLS = 2;
const RELICS_W = RELICS_COLS * SLOT + (RELICS_COLS - 1) * GAP;

// Aggregated "all relic effects" list, stacked below the 8 relic slots in the
// Relics column. Sized for the realistic worst case (~9 distinct active
// channels — one relic per family, and the crit family feeds only one crit
// channel) so the panel never clips it.
const RELIC_GRID_ROWS = Math.ceil(8 / RELICS_COLS); // 4
const RELIC_GRID_H = RELIC_GRID_ROWS * SLOT + (RELIC_GRID_ROWS - 1) * GAP;
const RELIC_FX_Y = RELICS_Y + RELIC_GRID_H + 16; // "Effects" header baseline
const RELIC_FX_ROW_H = 15;
const RELIC_FX_MAX_ROWS = 9;
const RELIC_FX_BOTTOM = RELIC_FX_Y + 18 + RELIC_FX_MAX_ROWS * RELIC_FX_ROW_H;

export const PANEL_W = RELICS_X + RELICS_W - PANEL_X + 12;
// Tall enough for whichever column reaches lowest — the backpack grid (now 15
// rows), or the relic-effects list under the Relics column. NOTE: because the
// backpack is much taller than the Equipment/Combat/Relics columns, the lower-
// right area of the panel (below RELIC_FX_BOTTOM) is intentionally left EMPTY
// for now — reserved for a future run/character/set-bonus readout (deferred).
export const PANEL_H = Math.max(BACKPACK_Y + BACKPACK_H + 20, RELIC_FX_BOTTOM + 8) - PANEL_Y;

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
  // Looping alpha tweens for the "upgrade ready" arrows — killed on every
  // re-render (rows are destroyed each render; an orphaned repeat:-1 tween
  // would leak, per the codebase's infinite-tween-leak note).
  private indicatorTweens: Phaser.Tweens.Tween[] = [];
  private tooltipUI: Tooltip;
  // A separate lightweight tooltip for the Relics column (relics aren't
  // items, so the shared item Tooltip class doesn't apply — mirrors the
  // inline tipBg/tipText pattern RelicBarUI/RelicForgeMenu already use).
  private relicTipBg?: Phaser.GameObjects.Rectangle;
  private relicTipText?: Phaser.GameObjects.Text;
  // Tabbed-by-biome view state.
  private activeTab: ItemBiome | "all" = "all";
  private search = "";
  private searchFocused = false;
  private scrollY = 0; // px offset into the (possibly taller-than-viewport) grid
  private maxScroll = 0; // computed each render
  // Rebuilt every render: the on-screen cells actually drawn (in-viewport
  // only), each mapped to its REAL backpack container index so drag-out and
  // hit-testing resolve correctly even though the view is filtered/sorted.
  private visibleCells: { x: number; y: number; index: number }[] = [];

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

    // Search box focus tracking: clicking the search box focuses it; clicking
    // anywhere else (or nothing) unfocuses. One deterministic handler beats
    // relying on per-object pointerdown ordering.
    scene.input.on("pointerdown", (p: Phaser.Input.Pointer) => {
      if (!this.open) return;
      const focus = this.pointInSearchBox(p.x, p.y);
      if (focus !== this.searchFocused) {
        this.searchFocused = focus;
        this.render();
      }
    });
    // Typed characters route to the search box while it's focused. The scene
    // guards its gameplay hotkeys on isSearchFocused() and locks movement, so
    // these keys don't double as game input.
    scene.input.keyboard!.on("keydown", (e: KeyboardEvent) => {
      if (!this.open || !this.searchFocused) return;
      this.onSearchKey(e);
    });
  }

  private pointInSearchBox(x: number, y: number): boolean {
    return x >= BACKPACK_X && x <= BACKPACK_X + BACKPACK_W && y >= BP_SEARCH_Y && y <= BP_SEARCH_Y + BP_SEARCH_H;
  }

  private onSearchKey(e: KeyboardEvent): void {
    if (e.key === "Enter") {
      // Enter just unfocuses the box. (Esc is handled by the scene's Esc
      // guard, which unfocuses the box before it would close the menu.)
      this.unfocusSearch();
      return;
    }
    if (e.key === "Backspace") {
      if (this.search.length > 0) {
        this.search = this.search.slice(0, -1);
        this.scrollY = 0;
        this.render();
      }
      e.preventDefault();
      return;
    }
    // Printable single characters only.
    if (e.key.length === 1) {
      this.search += e.key;
      this.scrollY = 0;
      this.render();
      e.preventDefault();
    }
  }

  isSearchFocused(): boolean {
    return this.open && this.searchFocused;
  }

  unfocusSearch(): void {
    if (this.searchFocused) {
      this.searchFocused = false;
      this.render();
    }
  }

  // Called from the scene's global wheel handler. Returns true (consuming the
  // wheel) when the pointer is over the scrollable grid, scrolling it instead
  // of cycling the hotbar.
  handleWheel(pointer: Phaser.Input.Pointer, dy: number): boolean {
    if (!this.open) return false;
    const overGrid =
      pointer.x >= BACKPACK_X &&
      pointer.x <= BACKPACK_X + BACKPACK_W &&
      pointer.y >= BP_GRID_TOP &&
      pointer.y <= BP_GRID_BOTTOM;
    if (!overGrid || this.maxScroll <= 0) return overGrid; // still consume if over grid, even with nothing to scroll
    this.scrollY = Phaser.Math.Clamp(this.scrollY + (dy > 0 ? CELL : -CELL), 0, this.maxScroll);
    this.render();
    return true;
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
    this.hideRelicTooltip();
  }

  private hideRelicTooltip(): void {
    this.relicTipBg?.setVisible(false);
    this.relicTipText?.setVisible(false);
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

  // Real backpack container index of the item cell under a screen point, or
  // null. Maps against the rendered (filtered/sorted/scrolled) cells — used as
  // a drag SOURCE and for in-place click detection, NOT for free placement
  // (the view is auto-organized; drops route to the first free slot instead —
  // see isOverBackpackGrid).
  slotIndexAt(screenX: number, screenY: number): number | null {
    if (!this.open) return null;
    for (const c of this.visibleCells) {
      if (screenX >= c.x && screenX <= c.x + SLOT && screenY >= c.y && screenY <= c.y + SLOT) return c.index;
    }
    return null;
  }

  // Whether a screen point is anywhere over the scrollable backpack grid
  // viewport — a drop here means "put this in the backpack" (first free/merge
  // slot), since there's no free-arrange in the auto-organized view.
  isOverBackpackGrid(screenX: number, screenY: number): boolean {
    if (!this.open) return false;
    return (
      screenX >= BACKPACK_X &&
      screenX <= BACKPACK_X + BACKPACK_W &&
      screenY >= BP_GRID_TOP &&
      screenY <= BP_GRID_BOTTOM
    );
  }

  private teardown(): void {
    this.clearRows();
    this.hideTooltip();
    // Fresh view each time it opens — no stale search filter hiding items.
    this.searchFocused = false;
    this.search = "";
    this.scrollY = 0;
    this.activeTab = "all";
    this.visibleCells = [];
  }

  private clearRows(): void {
    for (const t of this.indicatorTweens) t.remove();
    this.indicatorTweens = [];
    for (const r of this.rows) r.destroy();
    this.rows = [];
  }

  // Fit an item icon within ICON_BOX (aspect preserved), so tiny generated
  // textures fill the slot instead of floating small.
  private fitIcon(icon: Phaser.GameObjects.Image): void {
    const s = Math.min(ICON_BOX / icon.width, ICON_BOX / icon.height);
    icon.setDisplaySize(icon.width * s, icon.height * s);
  }

  // A small gold up-arrow at a slot's top-right corner with a gentle looping
  // fade, shown when that slot's item has an affordable upgrade ready (S3).
  private addUpgradeArrow(slotX: number, slotY: number): void {
    const arrow = this.scene.add
      .text(slotX + SLOT - 2, slotY + 1, "▲", { fontFamily: "monospace", fontSize: "14px", color: "#ffd24a" })
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(3003);
    this.rows.push(arrow);
    this.indicatorTweens.push(
      this.scene.tweens.add({ targets: arrow, alpha: { from: 1, to: 0.25 }, duration: 620, yoyo: true, repeat: -1 }),
    );
  }

  private render(): void {
    this.clearRows();
    this.hideTooltip();
    const x0 = PANEL_X + 12;

    this.addText(x0, PANEL_Y + 10, "Inventory", 15, "#ffffff");
    this.addText(BACKPACK_X, PANEL_Y + 36, "Backpack", 12, "#8a93a3");
    this.renderSortButton();
    this.addText(ARMOR_X, PANEL_Y + 36, "Equipment", 12, "#8a93a3");
    this.addText(STATS_X, PANEL_Y + 36, "Combat", 12, "#8a93a3");
    this.addText(RELICS_X, PANEL_Y + 36, "Relics", 12, "#8a93a3");
    this.renderTabs();
    this.renderSearch();
    this.renderBackpackGrid();
    this.renderArmor(ARMOR_X, ARMOR_Y);
    this.renderTrash();
    this.renderCombatStats(STATS_X, STATS_Y);
    this.renderRelics(RELICS_X, RELICS_Y);
    // RELIC_FX_Y is already an absolute Y (built from RELICS_Y, which includes
    // PANEL_Y) — pass it straight through, matching how PANEL_H reserves space.
    this.renderRelicEffects(RELICS_X, RELIC_FX_Y);
  }

  // Aggregated "all relic effects" — one row per active channel with its grand
  // total, stacked below the relic slots. Hovering a row reuses the relic
  // tooltip to break down which relics contribute (task from the S3 triage:
  // "total aggregated effect list + hover a stat -> which relic grants it").
  private renderRelicEffects(x0: number, y0: number): void {
    const summary = this.deps.relicEffectSummary();
    this.addText(x0, y0, "Effects", 11, "#8a93a3");
    if (summary.length === 0) {
      this.addText(x0, y0 + 16, "—", 10, "#5b6472");
      return;
    }
    const totalX = x0 + RELICS_W;
    summary.forEach((row, i) => {
      const y = y0 + 18 + i * RELIC_FX_ROW_H;
      // A wide invisible hit-rect over the whole row so hovering anywhere on
      // it pops the source breakdown.
      const hit = this.scene.add
        .rectangle(x0, y, RELICS_W, RELIC_FX_ROW_H, 0x000000, 0.001)
        .setOrigin(0, 0)
        .setScrollFactor(0)
        .setDepth(3001)
        .setInteractive()
        .on("pointerover", () => this.showRelicEffectTooltip(row, x0, y))
        .on("pointerout", () => this.hideRelicTooltip());
      this.rows.push(hit);
      this.addText(x0, y, row.label, 10, "#a7b0bd");
      this.addText(totalX, y, row.total, 10, "#c8d0da", 1, 0);
    });
  }

  // Reuses the Relics-column tooltip surface to show which relics feed one
  // aggregated effect channel (name + that relic's contribution).
  private showRelicEffectTooltip(row: RelicEffectSummary, rowX: number, rowY: number): void {
    const lines = row.sources.map((s) => `${s.name}: ${s.amount}`).join("\n");
    const str = `${row.label}  ${row.total}\n${lines}`;
    if (!this.relicTipText) {
      this.relicTipText = this.scene.add
        .text(0, 0, str, { fontFamily: "monospace", fontSize: "11px", color: "#e8ecf2", wordWrap: { width: 220 } })
        .setScrollFactor(0)
        .setDepth(3010);
      this.relicTipBg = this.scene.add
        .rectangle(0, 0, 10, 10, 0x000000, 0.95)
        .setOrigin(0, 0)
        .setScrollFactor(0)
        .setDepth(3009);
    }
    this.relicTipText.setText(str);
    this.relicTipBg!.setStrokeStyle(1, 0x8a93a3);
    const padX = 8;
    const padY = 6;
    const w = this.relicTipText.width + padX * 2;
    const h = this.relicTipText.height + padY * 2;
    let tx = rowX - w - 6;
    if (tx < 4) tx = rowX + RELICS_W + 6;
    const ty = Phaser.Math.Clamp(rowY, 4, this.scene.scale.height - h - 4);
    this.relicTipBg!.setPosition(tx, ty).setSize(w, h).setVisible(true);
    this.relicTipText.setPosition(tx + padX, ty + padY).setVisible(true);
  }

  // Live equipped-loadout summary — damage/attack speed/attack stamina cost
  // (all from the currently equipped hotbar weapon, blank if none) plus total
  // armor (summed across every worn armor piece, 0 if none worn).
  private renderCombatStats(x0: number, y0: number): void {
    const stats = this.deps.combatStats();
    let y = y0;
    const lineGap = 20;
    this.addText(x0, y, stats.weaponName ?? "No weapon equipped", 12, stats.weaponName ? "#e8ecf2" : "#5b6472");
    y += lineGap;
    // S7 weapon-type identity line — a muted italic-toned hint under the name so
    // the player reads what this weapon type is best at (AOE / cripple / burst).
    if (stats.identity) {
      const idT = this.addText(x0, y, stats.identity, 10, "#7f97b0", 0, 0, STATS_W);
      y += idT.height + 4;
    } else {
      y += 4;
    }
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
    this.addText(
      x0,
      y,
      `Crit: ${stats.weaponName ? `${Math.round(stats.critChance * 100)}% x${stats.critMult.toFixed(2)}` : "-"}`,
      12,
      "#8a93a3",
    );
    y += lineGap;
    this.addText(x0, y, `Attack Stamina: ${stats.weaponName ? stats.staminaCost : "-"}`, 12, "#8a93a3");
    y += lineGap;
    this.addText(x0, y, `Armor: ${stats.armor}`, 12, "#8a93a3");
    y += lineGap;
    this.addText(x0, y, `Attack Range: ${stats.attackRange}`, 12, "#8a93a3");
    y += lineGap;
    this.addText(x0, y, `Ammo: ${stats.ammo ? `${stats.ammo.count} ${stats.ammo.name}` : "-"}`, 12, "#8a93a3");
    y += lineGap;
    const speed = this.deps.runSpeedBreakdown();
    this.addText(x0, y, `Move Speed: ${speed.walk} / ${speed.sprint} spr`, 12, "#8a93a3");
    // Active full-set bonuses (biome 2 forged gear payoff) — highlighted amber
    // so the reward reads as special, with the effect on the line beneath.
    for (const set of stats.setBonuses) {
      y += lineGap + 6;
      this.addText(x0, y, `◆ ${set.name}`, 12, "#f0a840");
      y += lineGap;
      // Wrap the effect text to the column width so a long set-bonus desc
      // (e.g. Emberblink) no longer runs off the panel/screen edge — S6.
      const descT = this.addText(x0, y, set.desc, 10, "#9a8560", 0, 0, STATS_W);
      y += descT.height;
    }
  }

  // The 8-slot relic loadout (Phase 5) — one fixed slot per family, paper-doll
  // style like renderArmor. Empty slots show the family label; filled slots
  // show the rarity gem icon + power-tier badge and hover for the full effect
  // tooltip.
  private renderRelics(x0: number, y0: number): void {
    const slots = this.deps.relicFamilySlots();
    slots.forEach((slot, i) => {
      const col = i % RELICS_COLS;
      const row = Math.floor(i / RELICS_COLS);
      const x = x0 + col * (SLOT + GAP);
      const y = y0 + row * (SLOT + GAP);
      const rarity = slot.group?.def.rarity;

      const box = this.scene.add
        .rectangle(x, y, SLOT, SLOT, 0x14181f, 0.9)
        .setOrigin(0, 0)
        .setStrokeStyle(1, rarity ? RARITY_COLOR[rarity] : 0x3a4250)
        .setScrollFactor(0)
        .setDepth(3001)
        .setInteractive({ useHandCursor: !!slot.group })
        .on("pointerover", () => {
          if (slot.group) this.showRelicTooltip(slot.group, x, y);
        })
        .on("pointerout", () => this.hideRelicTooltip());
      this.rows.push(box);

      if (slot.group) {
        const gem = this.scene.add
          .image(x + SLOT / 2, y + SLOT / 2 - 4, rarityIcon(slot.group.def.rarity))
          .setScrollFactor(0)
          .setDepth(3002);
        this.fitIcon(gem);
        this.rows.push(gem);
        this.addText(x + 3, y + 3, `T${slot.group.powerTier}`, 9, "#9fd0ff");
      } else {
        this.addText(x + SLOT / 2, y + SLOT / 2, slot.label, 9, "#5b6472", 0.5, 0.5);
      }
    });
  }

  private showRelicTooltip(group: RelicGroup, slotX: number, slotY: number): void {
    const def = group.def;
    const str = `${def.name}\n${rarityName(def.rarity)} ${relicFamilyName(group.family)} · Power T${group.powerTier}\n${relicEffectText(def, group.powerTier)}`;
    if (!this.relicTipText) {
      this.relicTipText = this.scene.add
        .text(0, 0, str, { fontFamily: "monospace", fontSize: "11px", color: "#e8ecf2", wordWrap: { width: 220 } })
        .setScrollFactor(0)
        .setDepth(3010);
      this.relicTipBg = this.scene.add
        .rectangle(0, 0, 10, 10, 0x000000, 0.95)
        .setOrigin(0, 0)
        .setScrollFactor(0)
        .setDepth(3009);
    }
    this.relicTipText.setText(str);
    this.relicTipBg!.setStrokeStyle(1, RARITY_COLOR[def.rarity]);
    const padX = 8;
    const padY = 6;
    const w = this.relicTipText.width + padX * 2;
    const h = this.relicTipText.height + padY * 2;
    let tx = slotX - w - 6;
    if (tx < 4) tx = slotX + SLOT + 6;
    const ty = Phaser.Math.Clamp(slotY, 4, this.scene.scale.height - h - 4);
    this.relicTipBg!.setPosition(tx, ty).setSize(w, h).setVisible(true);
    this.relicTipText.setPosition(tx + padX, ty + padY).setVisible(true);
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

  // Small clickable "Sort" label at the right edge of the Backpack header —
  // re-flows the backpack into fewer, merged, sorted stacks on click.
  private renderSortButton(): void {
    const x = BACKPACK_X + BACKPACK_W;
    const y = PANEL_Y + 36;
    const t = this.scene.add
      .text(x, y, "Sort", { fontFamily: "monospace", fontSize: "12px", color: "#8a93a3" })
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(3002)
      .setInteractive({ useHandCursor: true })
      .on("pointerover", () => t.setColor("#e8ecf2"))
      .on("pointerout", () => t.setColor("#8a93a3"))
      .on("pointerdown", () => this.deps.sortBackpack());
    this.rows.push(t);
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
          this.fitIcon(icon);
          this.rows.push(icon);
        }
        if (slot.count && slot.count > 1) {
          this.addText(x + SLOT - 4, y + SLOT - 3, `${slot.count}`, 11, "#ffffff", 1, 1);
        }
        if (this.deps.upgradeReady(slot.itemKey, slot.tier ?? 0)) this.addUpgradeArrow(x, y);
      } else {
        this.addText(x + SLOT / 2, y + SLOT / 2, slot.label, 10, "#5b6472", 0.5, 0.5);
      }
    });
  }

  // Which biomes the backpack currently holds items from (drives the tab strip
  // — an empty biome gets no tab, so a fresh forest run shows no Badlands tab).
  private presentBiomes(): ItemBiome[] {
    const set = new Set<ItemBiome>();
    const bp = this.deps.backpack;
    for (let i = 0; i < bp.size; i++) {
      const s = bp.slot(i);
      if (s) set.add(itemBiome(s.key));
    }
    const out: ItemBiome[] = [];
    if (set.has("forest")) out.push("forest");
    if (set.has("badlands")) out.push("badlands");
    return out;
  }

  private renderTabs(): void {
    const tabs: (ItemBiome | "all")[] = ["all", ...this.presentBiomes()];
    if (!tabs.includes(this.activeTab)) this.activeTab = "all";
    const labels: Record<ItemBiome | "all", string> = { all: "All", forest: "Forest", badlands: "Badlands" };
    let x = BACKPACK_X;
    for (const tab of tabs) {
      const active = tab === this.activeTab;
      const t = this.scene.add
        .text(x, BP_TABS_Y, labels[tab], {
          fontFamily: "monospace",
          fontSize: "12px",
          color: active ? "#ffffff" : "#8a93a3",
        })
        .setScrollFactor(0)
        .setDepth(3002)
        .setInteractive({ useHandCursor: true })
        .on("pointerover", () => { if (tab !== this.activeTab) t.setColor("#c8d0da"); })
        .on("pointerout", () => { if (tab !== this.activeTab) t.setColor("#8a93a3"); })
        .on("pointerdown", () => {
          if (this.activeTab === tab) return;
          this.activeTab = tab;
          this.scrollY = 0;
          this.render();
        });
      this.rows.push(t);
      if (active) {
        const underline = this.scene.add
          .rectangle(x, BP_TABS_Y + 16, t.width, 2, 0xf0a840, 1)
          .setOrigin(0, 0)
          .setScrollFactor(0)
          .setDepth(3002);
        this.rows.push(underline);
      }
      x += t.width + 16;
    }
  }

  private renderSearch(): void {
    const focused = this.searchFocused;
    const box = this.scene.add
      .rectangle(BACKPACK_X, BP_SEARCH_Y, BACKPACK_W, BP_SEARCH_H, 0x14181f, 0.9)
      .setOrigin(0, 0)
      .setStrokeStyle(1, focused ? 0xf0a840 : 0x3a4250)
      .setScrollFactor(0)
      .setDepth(3001)
      .setInteractive({ useHandCursor: true });
    this.rows.push(box);
    const hasText = this.search.length > 0;
    // Placeholder only when unfocused + empty; focused shows the text + caret
    // (so an empty focused box is just a caret, not "placeholder_").
    const shown = hasText ? this.search : focused ? "" : "🔍 Search items...";
    const caret = focused ? "_" : "";
    this.addText(
      BACKPACK_X + 6,
      BP_SEARCH_Y + BP_SEARCH_H / 2,
      `${shown}${caret}`,
      11,
      hasText ? "#e8ecf2" : "#5b6472",
      0,
      0.5,
    );
    // Insta-clear "✕" — only shown when there's a query to clear. Wipes the
    // search immediately (keeps the box focused so the player can retype).
    if (hasText) {
      const clear = this.scene.add
        .text(BACKPACK_X + BACKPACK_W - 8, BP_SEARCH_Y + BP_SEARCH_H / 2, "✕", {
          fontFamily: "monospace",
          fontSize: "13px",
          color: "#8a93a3",
        })
        .setOrigin(1, 0.5)
        .setScrollFactor(0)
        .setDepth(3002)
        .setInteractive({ useHandCursor: true })
        .on("pointerover", () => clear.setColor("#e8ecf2"))
        .on("pointerout", () => clear.setColor("#8a93a3"))
        .on("pointerdown", () => {
          this.search = "";
          this.scrollY = 0;
          this.searchFocused = true;
          this.render();
        });
      this.rows.push(clear);
    }
  }

  // The sectioned, scrollable backpack grid. Items are pulled from the flat
  // container, filtered by the active tab + search, grouped into category
  // sections, laid out in content space, then window-rendered into the
  // viewport (only in-view cells become GameObjects). visibleCells maps each
  // drawn cell back to its real container index for drag/hit-testing.
  private renderBackpackGrid(): void {
    this.visibleCells = [];
    const bp = this.deps.backpack;
    const q = this.search.trim().toLowerCase();

    const items: { index: number; stack: ItemStack }[] = [];
    for (let i = 0; i < bp.size; i++) {
      const s = bp.slot(i);
      if (!s) continue;
      // Search spans ALL items (any biome); it overrides the active tab while
      // there's a query. Otherwise the tab filters by biome.
      if (q) {
        if (!(itemDef(s.key)?.name ?? s.key).toLowerCase().includes(q)) continue;
      } else if (this.activeTab !== "all" && itemBiome(s.key) !== this.activeTab) {
        continue;
      }
      items.push({ index: i, stack: s });
    }

    if (items.length === 0) {
      this.addText(BACKPACK_X + BACKPACK_W / 2, BP_GRID_TOP + 28, q ? "No matching items" : "Empty", 12, "#5b6472", 0.5, 0.5);
      this.maxScroll = 0;
      return;
    }

    const byCat = new Map<ItemCategory, { index: number; stack: ItemStack }[]>();
    for (const it of items) {
      const c = itemCategory(it.stack.key);
      const arr = byCat.get(c) ?? [];
      arr.push(it);
      byCat.set(c, arr);
    }
    for (const arr of byCat.values()) {
      arr.sort((a, b) => {
        const na = itemDef(a.stack.key)?.name ?? a.stack.key;
        const nb = itemDef(b.stack.key)?.name ?? b.stack.key;
        return na < nb ? -1 : na > nb ? 1 : (a.stack.tier ?? 0) - (b.stack.tier ?? 0);
      });
    }

    // Lay out in content space (y from 0).
    type El =
      | { kind: "header"; y: number; label: string }
      | { kind: "cell"; y: number; col: number; index: number; stack: ItemStack };
    const els: El[] = [];
    let cy = 0;
    for (const { cat, label } of CATEGORY_SECTIONS) {
      const arr = byCat.get(cat);
      if (!arr || arr.length === 0) continue;
      els.push({ kind: "header", y: cy, label });
      cy += BP_SECTION_H;
      arr.forEach((it, i) => {
        const col = i % BACKPACK_COLS;
        if (i > 0 && col === 0) cy += CELL; // new row
        els.push({ kind: "cell", y: cy, col, index: it.index, stack: it.stack });
        if (i === arr.length - 1) cy += CELL; // advance past the section's last row
      });
      cy += 6; // gap between sections
    }
    const contentH = cy;
    this.maxScroll = Math.max(0, contentH - BP_GRID_VIEW_H);
    this.scrollY = Phaser.Math.Clamp(this.scrollY, 0, this.maxScroll);

    for (const el of els) {
      const sy = BP_GRID_TOP + el.y - this.scrollY;
      if (el.kind === "header") {
        if (sy >= BP_GRID_TOP - 2 && sy + BP_SECTION_H <= BP_GRID_BOTTOM) {
          this.addText(BACKPACK_X + 2, sy, el.label, 10, "#7c869a");
        }
        continue;
      }
      // Cells: fully-visible only (keeps the top edge clear of the search box).
      if (sy < BP_GRID_TOP || sy + SLOT > BP_GRID_BOTTOM + 4) continue;
      this.drawBackpackCell(BACKPACK_X + el.col * CELL, sy, el.index, el.stack);
    }

    this.renderScrollHints();
  }

  // One backpack item cell (box + icon + count) with the hover tooltip and
  // right-click/drag handlers, mapped to its real container index.
  private drawBackpackCell(x: number, y: number, index: number, stack: ItemStack): void {
    const backpack = this.deps.backpack;
    const box = this.scene.add
      .rectangle(x, y, SLOT, SLOT, 0x14181f, 0.9)
      .setOrigin(0, 0)
      .setStrokeStyle(1, 0x3a4250)
      .setScrollFactor(0)
      .setDepth(3001)
      .setInteractive({ useHandCursor: true })
      .on("pointerover", () => {
        if (!this.deps.isDragging())
          this.tooltipUI.show(stack.key, { x, y, width: SLOT, height: SLOT }, "right", stack.tier);
      })
      .on("pointerout", () => this.hideTooltip())
      .on("pointerdown", (pointer: Phaser.Input.Pointer) => {
        // Right-click is reserved for context-menu/upgrade actions (eat / open
        // Upgrade panel / Place popup); left-drag starts a move (see
        // MainScene.resolveItemDrag).
        if (pointer.rightButtonDown()) {
          const def = itemDef(stack.key);
          if (def?.edible) this.deps.eatItem(backpack, index);
          else if (def?.weapon || def?.tool) this.deps.openWeaponUpgrade(backpack, index);
          else if (def?.placeable) this.deps.openPlaceContextMenu(backpack, index, pointer.x, pointer.y);
          return;
        }
        this.deps.beginDrag(backpack, index, pointer);
      });
    this.rows.push(box);
    this.visibleCells.push({ x, y, index });

    const def = itemDef(stack.key);
    if (def) {
      const icon = this.scene.add
        .image(x + SLOT / 2, y + SLOT / 2, def.texture)
        .setScrollFactor(0)
        .setDepth(3002);
      this.fitIcon(icon);
      this.rows.push(icon);
    }
    if (stack.count > 1) {
      this.addText(x + SLOT - 4, y + SLOT - 3, `${stack.count}`, 11, "#ffffff", 1, 1);
    }
    if (this.deps.upgradeReady(stack.key, stack.tier ?? 0)) this.addUpgradeArrow(x, y);
  }

  // Small up/down arrows at the grid's right edge when there's more above/below.
  private renderScrollHints(): void {
    if (this.maxScroll <= 0) return;
    const x = BACKPACK_X + BACKPACK_W - 10;
    if (this.scrollY > 0) this.addText(x, BP_GRID_TOP - 2, "▲", 10, "#8a93a3");
    if (this.scrollY < this.maxScroll) this.addText(x, BP_GRID_BOTTOM - 14, "▼", 10, "#8a93a3");
  }

  private addText(
    x: number,
    y: number,
    str: string,
    size: number,
    color: string,
    originX = 0,
    originY = 0,
    wrapWidth?: number,
  ): Phaser.GameObjects.Text {
    const style: Phaser.Types.GameObjects.Text.TextStyle = {
      fontFamily: "monospace",
      fontSize: `${size}px`,
      color,
    };
    if (wrapWidth !== undefined) style.wordWrap = { width: wrapWidth };
    const t = this.scene.add
      .text(x, y, str, style)
      .setOrigin(originX, originY)
      .setScrollFactor(0)
      .setDepth(3002);
    this.rows.push(t);
    return t;
  }
}
