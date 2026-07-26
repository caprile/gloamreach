import Phaser from "phaser";
import { EQUIP_SLOTS, type EquipSlot } from "../systems/Equipment";
import { SLOT_ABILITY_KEY } from "../systems/Abilities";
import type { ItemContainer, ItemStack } from "../systems/ItemContainer";
import { itemDef, itemBiome, itemCategory, type ItemBiome, type ItemCategory } from "../systems/Items";
import type { Skills } from "../systems/Skills";
import type { PlayerProgression } from "../systems/Progression";
import type { WeaponType } from "../systems/Weapons";
import { RARITY_COLOR, rarityIcon, rarityName, relicEffectText, relicFamilyName, uniqueText, type RelicEffectSummary, type RelicFamilySlot, type RelicGroup } from "../systems/Relics";
import { appliedAugmentIds, isAugmentableItem, MAX_AUGMENTS_PER_ITEM } from "../systems/GearAugments";
import { bindFrame, frameInto } from "./frames";
import { Tooltip } from "./Tooltip";

export interface ArmorSlotView {
  id: EquipSlot;
  label: string;
  itemKey: string | null;
  tier?: number;
  // Applied gem-augment ids on the worn instance (biome 3 Phase 3).
  upgrades?: string[];
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
  // Live capped crit totals for a weapon (base + Strength/Agility + relics),
  // shown on the weapon tooltip alongside its per-weapon base.
  critTotals?: (weapon: WeaponType) => { chance: number; mult: number };
  // Per-tier texture for an item (e.g. the Ironshod stone_axe at tier 1), so a
  // backpack icon matches the hotbar's tiered art. Null → base icon.
  stationTexture?: (key: string, tier: number) => string | null;
  armorSlots: () => ArmorSlotView[];
  combatStats: () => CombatStatsView;
  runSpeedBreakdown: () => RunSpeedView;
  // Phase 5: the player's owned relics, one fixed slot per family (empty or
  // filled) — surfaced right on the Inventory panel since playtesters kept
  // checking the Equipment column for them instead of the HUD relic bar.
  relicFamilySlots: () => RelicFamilySlot[];
  // Every numeric axis acting on the player: one combined number each, with the
  // contributions that built it. Assembled by MainScene so this panel never
  // re-derives a number combat already knows.
  activeEffects: () => EffectAxisView[];
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
  // Right-click on a backpack slot holding gear (weapon/tool/armor) with a
  // defined upgrade path opens its Upgrade panel (see MainScene.openGearUpgradeMenu).
  openGearUpgrade: (container: ItemContainer, index: number) => void;
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
  upgradeReady: (key: string, tier: number, appliedIds?: string[]) => boolean;
}

// One axis of the Active Effects tab: the combined number the game actually
// uses, plus the individual things that built it. Assembled by
// MainScene.activeEffects() — the menu stays presentation-only, so a number
// here can never disagree with the number combat uses.
export interface EffectAxisView {
  label: string;
  total: string;
  parts: { label: string; amount: string }[];
}

// A trailing block with no combined number — conditional procs and set bonuses,
// which are sentences rather than an addend on some axis.
interface FxNote {
  title: string;
  lines: { text: string; color: string; small?: boolean }[];
}

/** Backpack biome filters, plus the Relics/Effects views that replace the grid. */
type InventoryTab = ItemBiome | "all" | "relics" | "effects";

export const PANEL_X = 16;
export const PANEL_Y = 48;
// Bumped 46->70 for the real-art migration: icons are authored at 32x32, and
// the old 34px box rendered them at x1.06 — the worst possible scale for pixel
// art (nearest-neighbour keeps most rows 1:1 and doubles the occasional one,
// which reads as distortion, not magnification). KEEP THIS IN LOCKSTEP WITH
// HotbarUI's SLOT_SIZE — an item must look the same in the backpack and on the
// hotbar.
const SLOT = 70;
const GAP = 6;
const CELL = SLOT + GAP;
// Widened 6->7 to claw back the grid capacity the bigger slots cost. A biome
// tab holds ~45-48 items, which is ~7 rows at 7 cols — still inside the
// viewport below, so per-biome tabs stay scroll-free.
export const BACKPACK_COLS = 7;
// Sizes the grid VIEWPORT height (not the container). Cut 15->10 alongside the
// 46->70 slot bump: the vertical budget is fixed (the panel must stay clear of
// the hotbar), so bigger slots buy fewer rows. 10 rows x 70px is very close to
// the old 15 x 46 footprint, and because the grid also went 6->7 cols the
// visible ITEM count barely moves (90 -> 70 cells, but a biome tab's ~48 items
// now need ~7 rows instead of ~9) — per-biome tabs still fit without scrolling.
// The "All" tab still scrolls, as before.
export const BACKPACK_ROWS = 10;
// The backpack container is now effectively unlimited (auto-organized tabbed
// view, no manual arranging) — sized generously so a single hardcore run can't
// realistically overflow it. The 6x6 grid is just the on-screen viewport into
// this flat container; tabs/sections/scroll organize the rest.
export const BACKPACK_CAPACITY = 240;
// Two columns, not three. The third existed only to lay Q/E/R out as a ROW
// under the paper doll; stacking those vertically instead removes a whole
// column from the panel's width, which is what stopped the inventory reaching
// across the player (the user: "the inventory menu now overlaps with the player
// area", and placement clicks were landing on the panel).
const ARMOR_COLS = 2;
// 64 = exactly 2x the 32x32 authored icon size, so every source pixel becomes
// a clean 2x2 block instead of an uneven smear. Padding is only 6px per side
// because showing off the art is the whole point of the bump.
const ICON_BOX = 64;

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
const BP_SECTION_H = 21; // height of a "Materials"/"Gear"/... section header row

// Section order + labels within a biome tab (matches ItemContainer's sort).
const CATEGORY_SECTIONS: { cat: ItemCategory; label: string }[] = [
  { cat: "material", label: "Materials" },
  { cat: "gear", label: "Gear" },
  { cat: "special", label: "Specials" },
  { cat: "ability", label: "Abilities (Q/E/R)" },
  { cat: "station", label: "Stations" },
  { cat: "food", label: "Food" },
  { cat: "curio", label: "Trophies & Relics" },
];

const GRID_GAP = 24;
const ARMOR_X = BACKPACK_X + BACKPACK_W + GRID_GAP; // 358
const ARMOR_Y = GRID_Y;
const ARMOR_W = ARMOR_COLS * SLOT + (ARMOR_COLS - 1) * GAP; // 150
// Every slot carries a caption under it, so a slot's name is readable even when
// it's full (the user: "when an equipment slot is full I can't see what the name
// of the slot is" — the name used to be placeholder text INSIDE the box, which
// the item icon then covered).
const ARMOR_LABEL_H = 13;
const ARMOR_ROW_PITCH = SLOT + GAP + ARMOR_LABEL_H;

// Explicit paper-doll placement rather than flowing EQUIP_SLOTS into a grid, so
// the three groups read as three groups (the user's layout): gear down column 1,
// the interchangeable specials down column 2, the Q/E/R row underneath, ammo
// last. renderArmor() and armorSlotAt() both derive from this one table, which
// is what keeps drawing and hit-testing in lockstep.
const ARMOR_LAYOUT: Record<EquipSlot, { col: number; row: number }> = {
  helmet: { col: 0, row: 0 },
  chest: { col: 0, row: 1 },
  legs: { col: 0, row: 2 },
  ability1: { col: 0, row: 3 },
  ability2: { col: 0, row: 4 },
  ability3: { col: 0, row: 5 },
  special1: { col: 1, row: 0 },
  special2: { col: 1, row: 1 },
  special3: { col: 1, row: 2 },
  special4: { col: 1, row: 3 },
};
const ARMOR_ROWS_MAX = Math.max(...Object.values(ARMOR_LAYOUT).map((p) => p.row)) + 1;
const ARMOR_H = ARMOR_ROWS_MAX * ARMOR_ROW_PITCH - GAP;

// Trash drop target: directly under the last special, continuing that column
// rather than sitting off on its own — it's a slot-shaped target, so it reads
// as part of the paper doll. Dragging a stack here permanently deletes it (see
// MainScene.destroyStack) — distinct from dragging out to the game world,
// which drops it as a recoverable loose pickup instead.
const TRASH_SIZE = SLOT;
const TRASH_ROW = Math.max(...Object.values(ARMOR_LAYOUT).filter((p) => p.col === 1).map((p) => p.row)) + 1;
const TRASH_X = ARMOR_X + (SLOT + GAP);
const TRASH_Y = ARMOR_Y + TRASH_ROW * ARMOR_ROW_PITCH;

// The Combat block used to sit under the equipment grid; it is now the first
// section of the Active Effects tab. This width floor is all that survives of
// it — the equipment column is narrower than the old stats block, and letting
// the panel shrink to it would move every anchor the paper-doll is tuned
// against for no gain.
const EQUIP_COL_MIN_W = 200;

// Relics moved out of the panel entirely and onto their own backpack TAB
// (the user). They were a 4th side-by-side column purely so equipped relics
// were visible at a glance; as a tab they keep that while costing no width.
// The tab reuses the backpack's whole grid area, so the 8 family slots get a
// roomier 4-wide layout than the old 2-wide column.
const RELICS_COLS = 4;
const RELICS_X = BACKPACK_X;
const RELICS_Y = BP_GRID_TOP;
const RELIC_GRID_ROWS = Math.ceil(8 / RELICS_COLS); // 2
const RELIC_GRID_H = RELIC_GRID_ROWS * SLOT + (RELIC_GRID_ROWS - 1) * GAP;
const RELICS_W = RELICS_COLS * SLOT + (RELICS_COLS - 1) * GAP;
const RELIC_FX_ROW_H = 17;

// Active Effects tab. It replaced the Combat block under Equipment AND the
// relic Effects list under the relic slots (the user) — one place answering
// "what is actually acting on me right now" instead of two partial ones. Both
// of those were narrow columns, which is exactly why the unified list didn't
// fit anywhere: it needs the backpack's full width, and even then it runs long
// enough to want TWO columns. Sections are placed greedily and never split
// across a column, so a section always reads as one block.
//
// Two columns is enough because the content is BOUNDED, not open-ended: at most
// 8 relic channels and 8 procs (one relic per family), 5 jewelry channels, and a
// handful of set bonuses. A maximal loadout — every family filled with a Mythic,
// three passives worn, a full set — measures 621px against a 826px floor.
const FX_COL_GAP = 22;
const FX_COL_W = Math.floor((BACKPACK_W - FX_COL_GAP) / 2);
const FX_ROW_H = 18; // an axis's own header row
const FX_PART_H = 13; // one indented contribution
const FX_INDENT = 12;
const FX_SECTION_GAP = 8;

export const PANEL_W = ARMOR_X + Math.max(ARMOR_W, EQUIP_COL_MIN_W) - PANEL_X + 12;
// The backpack column is the tallest thing in the panel and now the only thing
// that sets its height — the Combat block that used to hang below Equipment
// moved into the Active Effects tab.
export const PANEL_H = BACKPACK_Y + BACKPACK_H + 20 - PANEL_Y;

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
  private refreshQueued = false;
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
  private activeTab: InventoryTab = "all";
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
    this.tooltipUI = new Tooltip(scene, deps.skills, deps.progression, deps.critTotals);

    this.bg = scene.add
      .rectangle(PANEL_X, PANEL_Y, PANEL_W, PANEL_H, 0x0a0a0a, 0.93)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(3000)
      .setVisible(false);
    bindFrame(this.bg, "panel");

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

  // Coalesced repaint. `render()` is a full teardown-and-rebuild of every
  // GameObject in the panel, and `afterItemMove()` calls this on EVERY item
  // movement — including each individual magnet pickup. With drops streaming in
  // that was several complete rebuilds a second underneath the cursor, which is
  // the flicker (the user: "weird flicker if I have my inventory open when I pick
  // stuff up"): interactive objects are destroyed and recreated under the
  // pointer, so hover state and the tooltip strobe.
  //
  // Collapsing a burst into one repaint per frame fixes the burst case; the
  // steady-state case is fixed by render() no longer dropping the tooltip (see
  // below), so a repaint under a stationary cursor is now visually inert.
  refresh(): void {
    if (!this.open || this.refreshQueued) return;
    this.refreshQueued = true;
    this.scene.events.once(Phaser.Scenes.Events.POST_UPDATE, () => {
      this.refreshQueued = false;
      if (this.open) this.render(true);
    });
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
    const row = Math.floor(dy / ARMOR_ROW_PITCH);
    if (col >= ARMOR_COLS || row >= ARMOR_ROWS_MAX) return null;
    // Reject the caption strip and the inter-column gutter — a drop there isn't
    // on a slot.
    if (dx - col * (SLOT + GAP) > SLOT || dy - row * ARMOR_ROW_PITCH > SLOT) return null;
    // Inverse of ARMOR_LAYOUT. Derived from the same table renderArmor draws
    // from, so a layout change can't desync drawing from hit-testing.
    const hit = (Object.keys(ARMOR_LAYOUT) as EquipSlot[]).find(
      (id) => ARMOR_LAYOUT[id].col === col && ARMOR_LAYOUT[id].row === row,
    );
    return hit ?? null;
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
      .text(slotX + SLOT - 2, slotY + 1, "▲", { fontFamily: "monospace", fontSize: "16px", color: "#ffd24a" })
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(3003);
    this.rows.push(arrow);
    this.indicatorTweens.push(
      this.scene.tweens.add({ targets: arrow, alpha: { from: 1, to: 0.25 }, duration: 620, yoyo: true, repeat: -1 }),
    );
  }


  // Gem-slot pips at a slot's bottom-left: one small diamond per augment slot,
  // filled (violet) for used and hollow for free — the at-a-glance answer to
  // "how many gems does this piece have left" without opening its panel. Only
  // drawn for augmentable gear (biome 3 Phase 3).
  private addGemPips(slotX: number, slotY: number, key: string, upgrades?: string[]): void {
    if (!isAugmentableItem(key)) return;
    const used = appliedAugmentIds({ upgrades }).length;
    for (let i = 0; i < MAX_AUGMENTS_PER_ITEM; i++) {
      const filled = i < used;
      const pip = this.scene.add
        .rectangle(slotX + 5 + i * 8, slotY + SLOT - 6, 5, 5, filled ? 0x9a5cff : 0x2b3040, 1)
        .setOrigin(0, 1)
        .setStrokeStyle(1, filled ? 0xc9a8ff : 0x4a5262)
        .setAngle(45)
        .setScrollFactor(0)
        .setDepth(3003);
      this.rows.push(pip);
    }
  }

  // `keepTooltip` is set only by the coalesced refresh path. Rebuilding destroys
  // the object the pointer is over, and Phaser won't re-fire pointerover until
  // the pointer actually moves — so unconditionally hiding here made the tooltip
  // vanish (and stay vanished) every time a pickup landed. Interaction-driven
  // renders — tab switch, scroll, search, open/close — still drop it, because
  // there the thing under the cursor genuinely changed.
  private render(keepTooltip = false): void {
    this.clearRows();
    if (!keepTooltip) this.hideTooltip();
    const x0 = PANEL_X + 12;

    const relicTab = this.activeTab === "relics";
    const effectsTab = this.activeTab === "effects";
    const gridTab = !relicTab && !effectsTab;
    const heading = relicTab ? "Relics" : effectsTab ? "Active Effects" : "Backpack";
    this.addText(x0, PANEL_Y + 10, "Inventory", 15, "#ffffff");
    this.addText(BACKPACK_X, PANEL_Y + 36, heading, 12, "#8a93a3");
    if (gridTab) this.renderSortButton();
    this.addText(ARMOR_X, PANEL_Y + 36, "Equipment", 12, "#8a93a3");
    this.renderTabs();
    // The relics and effects tabs take over the backpack's whole area, so its
    // search box and grid are skipped rather than drawn underneath.
    if (relicTab) {
      this.renderRelics(RELICS_X, RELICS_Y);
    } else if (effectsTab) {
      this.renderActiveEffects(BACKPACK_X, BP_GRID_TOP);
    } else {
      this.renderSearch();
      this.renderBackpackGrid();
    }
    this.renderArmor(ARMOR_X, ARMOR_Y);
    this.renderTrash();
  }

  // Reuses the Relics-column tooltip surface to show which relics feed one
  // aggregated effect channel (name + that relic's contribution).
  private showRelicEffectTooltip(row: RelicEffectSummary, rowX: number, rowY: number): void {
    const lines = row.sources.map((s) => `${s.name}: ${s.amount}`).join("\n");
    const str = `${row.label}  ${row.total}\n${lines}`;
    if (!this.relicTipText) {
      this.relicTipText = this.scene.add
        .text(0, 0, str, { fontFamily: "monospace", fontSize: "13px", color: "#e8ecf2", wordWrap: { width: 220 } })
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
    if (tx < 4) tx = rowX + FX_COL_W + 6;
    const ty = Phaser.Math.Clamp(rowY, 4, this.scene.scale.height - h - 4);
    this.relicTipBg!.setPosition(tx, ty).setSize(w, h).setVisible(true);
    this.relicTipText.setPosition(tx + padX, ty + padY).setVisible(true);
  }

  // --- Active Effects tab -------------------------------------------------
  //
  // One answer to "what is acting on me right now": every axis as ONE combined
  // number, with the things that built it indented underneath. the user's shape,
  // and the reason the old presentation was wrong — a Combat block listing the
  // weapon's damage and a separate relic list showing "+10.5% Damage" made the
  // reader do the multiplication themselves, in two places that never named the
  // same stat the same way.
  //
  // Numbers come from MainScene.activeEffects(); the only things assembled here
  // are the trailing NOTES (procs, set bonuses), which have no combined number
  // because they are conditional sentences rather than an addend on an axis.
  private effectNotes(): FxNote[] {
    const out: FxNote[] = [];
    const procs = this.deps
      .relicFamilySlots()
      .filter((s) => s.group?.def.unique)
      .map((s) => ({ name: s.group!.def.name, text: uniqueText(s.group!.def, s.group!.powerTier) }));
    if (procs.length) {
      out.push({
        title: "Procs",
        lines: procs.flatMap((p) => [
          { text: p.name, color: "#c8a8f0" },
          { text: p.text, color: "#8a7fa8", small: true },
        ]),
      });
    }
    const sets = this.deps.combatStats().setBonuses;
    if (sets.length) {
      out.push({
        title: "Set Bonuses",
        lines: sets.flatMap((set) => [
          { text: `◆ ${set.name}`, color: "#f0a840" },
          { text: set.desc, color: "#9a8560", small: true },
        ]),
      });
    }
    return out;
  }

  private renderActiveEffects(x0: number, y0: number): void {
    const axes = this.deps.activeEffects();
    const notes = this.effectNotes();
    // Estimate every block first, then split at the halfway mark rather than
    // filling column one until it overflows. Greedy filling packed column one
    // to within a pixel of the panel floor while column two sat a third empty —
    // correct, but permanently one relic away from running off the panel.
    const blocks: { est: number; draw: (x: number, y: number) => number }[] = [
      ...axes.map((axis) => ({
        est: FX_ROW_H + axis.parts.length * FX_PART_H + FX_SECTION_GAP,
        draw: (x: number, y: number) => this.drawAxis(x, y, axis),
      })),
      ...notes.map((note) => ({
        // Note lines wrap, so budget a second line for each.
        est: FX_ROW_H + note.lines.length * (FX_PART_H + 6) + FX_SECTION_GAP,
        draw: (x: number, y: number) => this.drawNote(x, y, note),
      })),
    ];
    const total = blocks.reduce((h, b) => h + b.est, 0);
    let col = 0;
    let y = y0;
    let used = 0;
    for (const block of blocks) {
      if (col === 0 && y > y0 && used + block.est > total / 2) {
        col = 1;
        y = y0;
      }
      used += block.est;
      y = block.draw(x0 + col * (FX_COL_W + FX_COL_GAP), y) + FX_SECTION_GAP;
    }
  }

  // One axis: the combined number on its own row, its contributions indented
  // under it. Returns the y it finished at.
  private drawAxis(x: number, y0: number, axis: EffectAxisView): number {
    this.addText(x, y0, axis.label, 12, "#e8ecf2");
    this.addText(x + FX_COL_W, y0, axis.total, 13, "#ffffff", 1, 0);
    let y = y0 + FX_ROW_H;
    for (const part of axis.parts) {
      this.addText(x + FX_INDENT, y, `• ${part.label}`, 10, "#7f8794");
      this.addText(x + FX_COL_W, y, part.amount, 10, "#9aa4b5", 1, 0);
      y += FX_PART_H;
    }
    return y;
  }

  private drawNote(x: number, y0: number, note: FxNote): number {
    this.addText(x, y0, note.title, 12, "#e8ecf2");
    let y = y0 + FX_ROW_H;
    for (const line of note.lines) {
      const t = this.addText(x + FX_INDENT, y, line.text, line.small ? 10 : 11, line.color, 0, 0, FX_COL_W - FX_INDENT);
      y += line.small ? t.height + 3 : FX_PART_H;
    }
    return y;
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
      // Rarity moves from the stroke onto the frame, so a Mythic still reads
      // as one at a glance across the family grid.
      frameInto(this.rows, box, "slot", rarity ? { accent: RARITY_COLOR[rarity] } : { accent: 0x6a7080 });

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
        .text(0, 0, str, { fontFamily: "monospace", fontSize: "13px", color: "#e8ecf2", wordWrap: { width: 220 } })
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
      .text(x, y, "Sort", { fontFamily: "monospace", fontSize: "14px", color: "#8a93a3" })
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
    slots.forEach((slot) => {
      const pos = ARMOR_LAYOUT[slot.id];
      const x = x0 + pos.col * (SLOT + GAP);
      const y = y0 + pos.row * ARMOR_ROW_PITCH;

      const box = this.scene.add
        .rectangle(x, y, SLOT, SLOT, 0x14181f, 0.9)
        .setOrigin(0, 0)
        .setStrokeStyle(1, slot.itemKey ? 0x5b6472 : 0x3a4250)
        .setScrollFactor(0)
        .setDepth(3001)
        .setInteractive({ useHandCursor: !!slot.itemKey })
        .on("pointerover", () => {
          if (slot.itemKey && !this.deps.isDragging())
            this.tooltipUI.show(slot.itemKey, { x, y, width: SLOT, height: SLOT }, "right", slot.tier, slot.upgrades);
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
      // The stroke used to be the "something is worn here" tell; with art on
      // the edge that becomes a tint, so an empty socket still reads as empty.
      frameInto(this.rows, box, "slot", slot.itemKey ? {} : { accent: 0x6a7080 });

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
        if (this.deps.upgradeReady(slot.itemKey, slot.tier ?? 0, slot.upgrades)) this.addUpgradeArrow(x, y);
        this.addGemPips(x, y, slot.itemKey, slot.upgrades);
      }

      // Caption under every slot, occupied or not — this is the slot's name, and
      // it stays legible with an item icon in the box. Brighter when empty so an
      // open slot still advertises what it takes.
      this.addText(
        x + SLOT / 2,
        y + SLOT + 2,
        slot.label,
        10,
        slot.itemKey ? "#6b7484" : "#8a93a3",
        0.5,
        0,
      );

      // Q/E/R key badge on the ability slots so it's clear which slot maps to
      // which ability. Shown whether the slot is occupied or empty.
      const abilityKey = SLOT_ABILITY_KEY[slot.id];
      if (abilityKey) {
        const chip = this.scene.add
          .rectangle(x + 1, y + 1, 17, 18, 0x0a0d12, 0.85)
          .setOrigin(0, 0)
          .setScrollFactor(0)
          .setDepth(3003);
        const lbl = this.scene.add
          .text(x + 9, y + 10, abilityKey.toUpperCase(), {
            fontFamily: "monospace",
            fontSize: "17px",
            fontStyle: "bold",
            color: "#bfe0ff",
            stroke: "#000000",
            strokeThickness: 2,
          })
          .setOrigin(0.5, 0.5)
          .setScrollFactor(0)
          .setDepth(3004);
        this.rows.push(chip, lbl);
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
    if (set.has("bayou")) out.push("bayou");
    return out;
  }

  private renderTabs(): void {
    // "Relics" is a peer of the biome tabs rather than a column of its own —
    // it swaps what the backpack area shows, not what it filters.
    const tabs: InventoryTab[] = ["all", ...this.presentBiomes(), "relics", "effects"];
    if (!tabs.includes(this.activeTab)) this.activeTab = "all";
    const labels: Record<InventoryTab, string> = {
      all: "All",
      forest: "Forest",
      badlands: "Badlands",
      bayou: "Bayou",
      relics: "Relics",
      effects: "Effects",
    };
    let x = BACKPACK_X;
    for (const tab of tabs) {
      const active = tab === this.activeTab;
      const t = this.scene.add
        .text(x, BP_TABS_Y, labels[tab], {
          fontFamily: "monospace",
          fontSize: "14px",
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
          fontSize: "15px",
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
          this.tooltipUI.show(stack.key, { x, y, width: SLOT, height: SLOT }, "right", stack.tier, stack.upgrades);
      })
      .on("pointerout", () => this.hideTooltip())
      .on("pointerdown", (pointer: Phaser.Input.Pointer) => {
        // Right-click is reserved for context-menu/upgrade actions (eat / open
        // Upgrade panel / Place popup); left-drag starts a move (see
        // MainScene.resolveItemDrag).
        if (pointer.rightButtonDown()) {
          const def = itemDef(stack.key);
          if (def?.edible) this.deps.eatItem(backpack, index);
          else if (def?.weapon || def?.tool || def?.armorSlot)
            this.deps.openGearUpgrade(backpack, index);
          else if (def?.placeable) this.deps.openPlaceContextMenu(backpack, index, pointer.x, pointer.y);
          return;
        }
        this.deps.beginDrag(backpack, index, pointer);
      });
    this.rows.push(box);
    frameInto(this.rows, box, "slot");
    this.visibleCells.push({ x, y, index });

    const def = itemDef(stack.key);
    if (def) {
      // Tiered art (e.g. the Ironshod stone_axe at tier 1) so an upgraded item
      // shows the same upgraded icon in the backpack as in the hotbar.
      const tiered = this.deps.stationTexture?.(stack.key, stack.tier ?? 0);
      const tex = tiered && this.scene.textures.exists(tiered) ? tiered : def.texture;
      const icon = this.scene.add
        .image(x + SLOT / 2, y + SLOT / 2, tex)
        .setScrollFactor(0)
        .setDepth(3002);
      this.fitIcon(icon);
      this.rows.push(icon);
    }
    if (stack.count > 1) {
      this.addText(x + SLOT - 4, y + SLOT - 3, `${stack.count}`, 11, "#ffffff", 1, 1);
    }
    if (this.deps.upgradeReady(stack.key, stack.tier ?? 0, stack.upgrades)) this.addUpgradeArrow(x, y);
    this.addGemPips(x, y, stack.key, stack.upgrades);
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
      // +1 everywhere (2026-07-15: "text is too small especially menus") — one
      // knob bumps every label this panel draws through addText.
      fontSize: `${size + 1}px`,
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
