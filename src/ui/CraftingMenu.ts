import Phaser from "phaser";
import { isPlaceableRecipe, outputKey, RECIPES, type Recipe, type RecipeCategory } from "../systems/Recipes";
import type { Crafting } from "../systems/Crafting";
import type { ResourceType } from "../systems/Inventory";
import type { ItemContainer } from "../systems/ItemContainer";
import { itemDef, type ItemStat } from "../systems/Items";
import { weaponAttacksPerSecond, weaponDamage, weaponPrimaryDamageType, weaponStaminaCost } from "../systems/Weapons";
import { ARMOR_SETS } from "../systems/SetBonuses";
import { weaponSkillDamageMultiplier, type Skills } from "../systems/Skills";
import type { PlayerProgression } from "../systems/Progression";
import { MARGIN as MINIMAP_MARGIN, PANEL_H as MINIMAP_H } from "./MinimapUI";
import { ProgressBar } from "./ProgressBar";

// A quick "crafting…" bar plays before the item lands — a small satisfying
// beat, deliberately short so it never feels like a slog. One bar covers the
// WHOLE batch (e.g. crafting x8 Shishkabob is still a single 450ms bar).
const CRAFT_BAR_MS = 450;
const SLIDER_W = 140;
const SLIDER_H = 10;

const CATEGORIES: { id: RecipeCategory; label: string }[] = [
  { id: "tools", label: "Tools" },
  { id: "weapons", label: "Weapons" },
  { id: "armor", label: "Armor" },
  { id: "crafting", label: "Crafting" },
  { id: "misc", label: "Misc" },
];

// Widened + split into two columns (recipe list left, detail panel right) so
// the description/stats/cost block sits BESIDE the list instead of below it
// — with every recipe discovered the old single-column layout pushed the
// detail panel off the bottom of a fixed-height panel. PANEL_W bumped
// accordingly; LIST_COL_W is the list column's width before the detail
// column starts.
// 620 left ~295px of dead space between the end of the "Misc" tab and the
// panel's right edge (the user). The real floors are the tab strip (~325px) and
// the detail column having room for the quantity slider plus its "Max" button,
// so the panel is sized to those and nothing else. Descriptions and cost lines
// already word-wrap against PANEL_W, so they reflow rather than clip.
// 480 -> 552 (the user: "some names are cut off in the crafting menu like the
// effigies"). The panel is right-anchored, so the extra width grows leftward
// into open screen with nothing to collide with, and PANEL_W and LIST_COL_W
// grow by the SAME 72px — which leaves the detail column's width, and therefore
// every wrap point in it, exactly as it was.
const PANEL_W = 552;
// A FLOOR, not the height: the panel now sizes itself to the space between its
// top margin and the bottom HUD (see panelH in the constructor). The old fixed
// 440 was authored when the Armor/Weapons tabs held a handful of recipes each;
// the forged + bayou tiers pushed those lists past it and the rows ran out the
// bottom edge.
const PANEL_H_MIN = 360;
// Clearance kept below the panel for the HP/stamina bars + hotbar + XP bar.
const BOTTOM_CLEARANCE = 190;
// Row pitch of the recipe list, and the wheel step for scrolling it.
// Row pitch is driven by the recipe icon (see LIST_ICON below), not the text —
// the icon is the taller element now.
const ROW_H = 36;
const SCROLL_STEP = ROW_H * 3;
// Recipe rows have always carried an output icon, but at 18px against the old
// placeholder art it read as a coloured smudge rather than a picture of the
// thing. 32 is the authored icon size — 1:1, no resampling at all.
const LIST_ICON = 32;
// Widened to keep the same room for names now that the icon is 14px bigger,
// then again (204 -> 276) to fit the longest real recipe name — "Effigy of the
// Duneshaper" needs ~268px including the 32px icon. The ellipsis truncation
// below stays as a backstop for anything longer still.
const LIST_COL_W = 276;
const DETAIL_GAP = 20;
const MARGIN_RIGHT = 16;
// Stacks below the top-right MinimapUI panel (+ the stat-points badge that
// now lives in the gap between them) instead of the old fixed 70px, which
// assumed the "[Tab] Menu" icon was the only thing above it.
const MARGIN_TOP = MINIMAP_MARGIN + MINIMAP_H + 40;

export interface CraftingMenuDeps {
  backpack: ItemContainer;
  crafting: Crafting;
  craft: (recipe: Recipe, batches: number) => void;
  // Max number of times `recipe` could be crafted right now (cost- and
  // room-limited) — backs the batch-quantity slider for stackable outputs.
  maxBatches: (recipe: Recipe) => number;
  startPlacement: (recipe: Recipe) => void;
  isNearWorkbench: () => boolean;
  // Whether a placed Workbench at >= `tier` is nearby (biome 2 Phase 4) — gates
  // forged recipes that need an upgraded bench (recipe.requiresWorkbenchTier).
  isNearWorkbenchAtTier: (tier: number) => boolean;
  skills: Skills;
  progression: PlayerProgression;
  // DEV `nobuildcost` cheat — when true, every recipe reads as craftable
  // regardless of ingredients/proximity (see isCraftable below).
  noBuildCost: () => boolean;
}

// A recipe is affordable to craft/place right now — resource cost AND
// (for tier 1+) Workbench proximity. Composed here at the call site rather
// than inside Crafting.canAfford, which stays pure resource-math.
function isCraftable(deps: CraftingMenuDeps, recipe: Recipe): boolean {
  if (deps.noBuildCost()) return true;
  return (
    deps.crafting.canAfford(recipe, deps.backpack) &&
    (recipe.tier === 0 || deps.isNearWorkbench()) &&
    (recipe.requiresWorkbenchTier === undefined || deps.isNearWorkbenchAtTier(recipe.requiresWorkbenchTier))
  );
}

// Right-side crafting panel. Opens/closes together with InventoryMenu as one
// combined Tab menu (see MainScene.toggleCombinedMenu) — there's no
// crafting-only key anymore, and no click-to-open icon either (removed once
// the minimap took over the top-right corner); Tab and Escape are the only
// entry points. Only ever lists DISCOVERED recipes (see
// Crafting.ts) — locked
// recipes are invisible, not greyed. Craftable-but-unaffordable ones are
// greyed and sorted below craftable ones. Equipping happens in
// InventoryMenu, not here — this panel only crafts.
//
// NOTE: every element here is a plain scrollFactor(0) GameObject positioned
// in absolute screen coordinates, not nested in a Container. Phaser's input
// hit-testing does not correctly combine a scrollFactor(0) container's
// transform with the camera scroll for interactive children, which made
// every button in here unclickable once the camera moved away from world
// origin. Keep it flat.
export class CraftingMenu {
  private scene: Phaser.Scene;
  private deps: CraftingMenuDeps;
  private panelX: number;
  private panelY: number;
  private bg: Phaser.GameObjects.Rectangle;
  private open = false;
  private activeCategory: RecipeCategory = "tools";
  private selected: Recipe | null = null;
  private rows: Phaser.GameObjects.GameObject[] = [];
  // True while a craft bar is filling — greys the button + blocks re-clicks.
  private busy = false;
  private progressBar: ProgressBar;
  // Batch-quantity slider for stackable-output recipes (e.g. 5x Shishkabob in
  // one craft) — reset to 1 whenever a different recipe is selected.
  private batchAmount = 1;
  private sliderDragging = false;
  private sliderTrack: { x: number; y: number; w: number } = { x: 0, y: 0, w: SLIDER_W };
  // Panel height is computed from the available screen space (see constructor)
  // rather than fixed, and the recipe list scrolls inside it when a category
  // holds more rows than fit — the same windowed-render + own-wheel-handler
  // pattern CookingMenu uses (only in-view rows are created).
  private panelH: number;
  private listScroll = 0;
  private maxListScroll = 0;
  private listTop = 0;
  private listViewH = 0;
  // Coalesces refresh() into one repaint per frame — mirrors InventoryMenu's
  // fix for the same flicker (the user: "flickery when I open inventory while
  // things are autopicking up"). refreshDiscovery() calls craftingMenu.refresh()
  // once per collected node (via collectNode -> discoverMaterial/addToBackpack),
  // so a multi-item magnet pull was tearing down and rebuilding every row
  // several times in a single frame — this panel sits right beside Inventory
  // under Tab, so that read as the same flicker even after InventoryMenu's own
  // refresh() was fixed.
  private refreshQueued = false;

  constructor(scene: Phaser.Scene, deps: CraftingMenuDeps) {
    this.scene = scene;
    this.deps = deps;
    this.panelX = scene.scale.width - PANEL_W - MARGIN_RIGHT;
    this.panelY = MARGIN_TOP;
    this.panelH = Math.max(PANEL_H_MIN, scene.scale.height - this.panelY - BOTTOM_CLEARANCE);
    this.progressBar = new ProgressBar(scene, { width: 96, height: 26, depth: 3005 });
    scene.input.on("wheel", this.onWheel, this);

    this.bg = scene.add
      .rectangle(this.panelX, this.panelY, PANEL_W, this.panelH, 0x0a0a0a, 0.93)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(3000)
      .setVisible(false);
  }

  toggle(): void {
    this.open = !this.open;
    this.bg.setVisible(this.open);
    if (this.open) this.render();
    else {
      // Closing mid-craft cancels the bar — nothing's consumed until it fills,
      // so this is a clean no-op (no half-finished craft, no lost resources).
      this.busy = false;
      this.progressBar.stop();
      this.clearRows();
    }
  }

  close(): void {
    if (this.open) this.toggle();
  }

  // Scrolls the recipe list while the pointer is over the open panel. Own
  // handler (CookingMenu's pattern) rather than a MainScene branch, so the
  // hotbar-cycling wheel is only overridden where this panel actually is.
  private onWheel(pointer: Phaser.Input.Pointer, _o: unknown, _dx: number, dy: number): void {
    if (!this.open || this.maxListScroll <= 0) return;
    if (!this.containsPoint(pointer.x, pointer.y)) return;
    const next = Phaser.Math.Clamp(this.listScroll + (dy > 0 ? SCROLL_STEP : -SCROLL_STEP), 0, this.maxListScroll);
    if (next === this.listScroll) return;
    this.listScroll = next;
    this.render();
  }

  // Left edge of the panel — so anything else anchored to the right screen edge
  // (HintUI) can step aside instead of covering the Craft button.
  get left(): number {
    return this.panelX;
  }

  isOpen(): boolean {
    return this.open;
  }

  // Whether a screen point falls within the panel — used to distinguish "drag
  // dropped over this open menu but missed a target" (snap back) from "drag
  // dropped out in the world" (drop the item), see MainScene.resolveItemDrag.
  containsPoint(screenX: number, screenY: number): boolean {
    if (!this.open) return false;
    return (
      screenX >= this.panelX &&
      screenX <= this.panelX + PANEL_W &&
      screenY >= this.panelY &&
      screenY <= this.panelY + this.panelH
    );
  }

  // Call after any inventory/skill/craft state change so affordability and
  // owned state stay in sync while the menu is open. Coalesced to one repaint
  // per frame (see refreshQueued) — refreshDiscovery() calls this once per
  // collected node, and a magnet pull can collect several in one frame.
  refresh(): void {
    if (!this.open || this.refreshQueued) return;
    this.refreshQueued = true;
    this.scene.events.once(Phaser.Scenes.Events.POST_UPDATE, () => {
      this.refreshQueued = false;
      if (this.open) this.render();
    });
  }

  // --- batch slider drag (driven by MainScene's shared global pointermove/up,
  // same pattern as DryingRackMenu's amount slider) ---

  isDraggingSlider(): boolean {
    return this.sliderDragging;
  }

  endSliderDrag(): void {
    this.sliderDragging = false;
  }

  updateSliderFromPointer(screenX: number): void {
    if (!this.selected) return;
    const max = this.deps.maxBatches(this.selected);
    const frac = Phaser.Math.Clamp((screenX - this.sliderTrack.x) / this.sliderTrack.w, 0, 1);
    this.batchAmount = Math.max(1, Math.round(frac * max));
    this.render();
  }

  private clearRows(): void {
    for (const r of this.rows) r.destroy();
    this.rows = [];
  }

  // The recipes the panel lists. Normally the discovered set; while the DEV
  // `nobuildcost` cheat is on, EVERY recipe is shown so the player can craft
  // anything for free. This is display-only — it never touches Crafting's
  // discoveredIds, so turning the cheat off snaps the list right back to what
  // was genuinely discovered (nothing is permanently unlocked).
  private visibleRecipes(): Recipe[] {
    return this.deps.noBuildCost() ? RECIPES : this.deps.crafting.discoveredRecipes();
  }

  private render(): void {
    this.clearRows();
    const x0 = this.panelX + 12;

    let x = x0;
    const tabY = this.panelY + 12;
    // Which categories have at least one discovered recipe the player can make
    // right now (ingredients + proximity) — drives a small amber dot on the tab
    // so a collapsed (unselected) tab still signals "there's something makeable
    // in here." Amber, NOT green (reserve red/green for buff/debuff deltas).
    const visible = this.visibleRecipes();
    const craftableCats = new Set(
      visible.filter((r) => isCraftable(this.deps, r)).map((r) => r.category),
    );
    for (const cat of CATEGORIES) {
      const active = cat.id === this.activeCategory;
      const t = this.scene.add
        .text(x, tabY, cat.label, {
          fontFamily: "monospace",
          fontSize: "15px",
          color: active ? "#ffffff" : "#8a93a3",
          backgroundColor: active ? "#2a3a55" : undefined,
          padding: { x: 4, y: 2 },
        })
        .setScrollFactor(0)
        .setDepth(3001)
        .setInteractive({ useHandCursor: true })
        .on("pointerdown", () => {
          this.activeCategory = cat.id;
          this.selected = null;
          this.render();
        });
      this.rows.push(t);
      if (craftableCats.has(cat.id)) {
        const dot = this.scene.add
          .circle(x + t.width + 3, tabY + 2, 3, 0xffe08a)
          .setScrollFactor(0)
          .setDepth(3002);
        this.rows.push(dot);
      }
      x += t.width + 8;
    }

    const listTop = tabY + 28;
    this.listTop = listTop;
    this.listViewH = this.panelY + this.panelH - listTop - 12;
    const recipes = this.visibleRecipes()
      .filter((r) => r.category === this.activeCategory)
      .sort((a, b) => {
        const aAfford = isCraftable(this.deps, a) ? 0 : 1;
        const bAfford = isCraftable(this.deps, b) ? 0 : 1;
        if (aAfford !== bAfford) return aAfford - bAfford;
        return a.name.localeCompare(b.name);
      });

    // Only the rows inside the viewport are created (a long Armor tab would
    // otherwise run straight out the bottom of the panel).
    //
    // Both bounds are kept on WHOLE rows because nothing clips this list — the
    // rows are plain scrollFactor(0) objects, and a geometry mask would clip
    // rendering but not input (a row hidden behind the tabs would still eat
    // clicks meant for them). So instead of clipping a partial row, we never
    // draw one:
    //   * maxListScroll rounds UP to a row multiple. The wheel already steps in
    //     whole rows, so an unrounded max left every row sitting a fraction of a
    //     row high at the bottom of the scroll range — which is how the top row
    //     ended up drawn over the category tabs.
    //   * lastRow counts only FULLY visible rows (floor), where a ceil here
    //     deliberately included the partly-visible one, and that is what ran out
    //     of the panel's bottom edge.
    const visibleRows = Math.max(1, Math.floor(this.listViewH / ROW_H));
    this.maxListScroll = Math.max(0, (recipes.length - visibleRows) * ROW_H);
    this.listScroll = Phaser.Math.Clamp(this.listScroll, 0, this.maxListScroll);
    const firstRow = Math.floor(this.listScroll / ROW_H);
    const lastRow = Math.min(recipes.length - 1, firstRow + visibleRows - 1);

    if (recipes.length === 0) {
      const t = this.scene.add.text(x0, listTop, "No known recipes yet.", {
        fontFamily: "monospace",
        fontSize: "15px",
        color: "#6b7280",
      });
      t.setScrollFactor(0).setDepth(3001);
      this.rows.push(t);
    }

    const iconSize = LIST_ICON;
    for (let i = firstRow; i <= lastRow && i < recipes.length; i++) {
      const recipe = recipes[i];
      const y = listTop + i * ROW_H - this.listScroll;
      const affordable = isCraftable(this.deps, recipe);
      const isSelected = this.selected?.id === recipe.id;
      const label = recipe.name;
      const selectRecipe = () => {
        this.selected = recipe;
        this.batchAmount = 1;
        this.render();
      };

      // Icon and name are both centred on the row now that the icon (32px) is
      // taller than the text — anchoring either to the row's top edge would
      // leave them visibly out of line.
      const rowMid = y + ROW_H / 2;
      const texture = itemDef(outputKey(recipe))?.texture;
      if (texture) {
        const icon = this.scene.add
          .image(x0 + iconSize / 2, rowMid, texture)
          .setDisplaySize(iconSize, iconSize)
          .setScrollFactor(0)
          .setDepth(3001)
          .setInteractive({ useHandCursor: true })
          .on("pointerdown", selectRecipe);
        this.rows.push(icon);
      }

      const nameX = x0 + iconSize + 6;
      const t = this.scene.add
        .text(nameX, rowMid, label, {
          fontFamily: "monospace",
          fontSize: "16px",
          color: isSelected ? "#ffe08a" : affordable ? "#ffffff" : "#5b6472",
          backgroundColor: isSelected ? "#20242e" : undefined,
          padding: { x: 4, y: 2 },
        })
        .setOrigin(0, 0.5)
        .setScrollFactor(0)
        .setDepth(3001)
        .setInteractive({ useHandCursor: true })
        .on("pointerdown", selectRecipe);
      // Keep a long name (e.g. "Effigy of the Duneshaper") inside the list
      // column so it never spills into the detail panel — truncate with an
      // ellipsis until it fits. Measured, not char-counted, so it's exact.
      const maxNameW = x0 + LIST_COL_W - nameX;
      if (t.width > maxNameW) {
        let trimmed = label;
        while (trimmed.length > 1 && t.width > maxNameW) {
          trimmed = trimmed.slice(0, -1);
          t.setText(trimmed.trimEnd() + "…");
        }
      }
      this.rows.push(t);
    }

    // "more above/below" affordances — the list has no visible scrollbar.
    if (this.listScroll > 0) this.addScrollHint(x0 + LIST_COL_W - 14, listTop - 2, "\u25b2");
    if (this.listScroll < this.maxListScroll) {
      this.addScrollHint(x0 + LIST_COL_W - 14, listTop + this.listViewH - 10, "\u25bc");
    }

    if (this.selected && this.selected.category === this.activeCategory) {
      // Detail column sits BESIDE the list, starting at the same height as
      // the list itself (not below it) — see LIST_COL_W above.
      this.renderDetail(this.selected, x0 + LIST_COL_W + DETAIL_GAP, listTop);
    }
  }

  private addScrollHint(x: number, y: number, glyph: string): void {
    const t = this.scene.add
      .text(x, y, glyph, { fontFamily: "monospace", fontSize: "13px", color: "#5b6472" })
      .setScrollFactor(0)
      .setDepth(3002);
    this.rows.push(t);
  }

  // Mirrors Tooltip.statValue — a freshly crafted item is always tier 0
  // ("Lvl 1"), so only the base (skill-adjusted for weapons) numbers apply.
  private statValue(def: ReturnType<typeof itemDef>, stat: ItemStat): string {
    if (!def) return stat.value;
    if (stat.label === "Damage" && def.weapon) {
      const base = weaponDamage(def.weapon);
      const dmgType = weaponPrimaryDamageType(def.weapon);
      const adjusted = Math.round(base * weaponSkillDamageMultiplier(dmgType, this.deps.skills));
      return adjusted === base ? `${base}` : `${adjusted} (base ${base})`;
    }
    if (stat.label === "Armor" && def.armorSlot) {
      return `${def.armorDefense ?? 0}`;
    }
    if (stat.label === "Attack Speed" && def.weapon) {
      return `${weaponAttacksPerSecond(def.weapon).toFixed(1)}/s`;
    }
    // Read live from Weapons.ts (see Tooltip.statValue's identical fix) rather
    // than the hand-authored Items.ts string, which drifts the moment a
    // balance pass touches WEAPON_STAMINA_COST but not every item's display
    // text. Strength/Agility no longer discount stamina after M-SS — only
    // relics do, which this menu doesn't factor — so this is still just the
    // flat base cost, just the CURRENT one.
    if (stat.label === "Stamina" && def.weapon) {
      return `${weaponStaminaCost(def.weapon)}`;
    }
    return stat.value;
  }

  private renderDetail(recipe: Recipe, x0: number, startY: number): void {
    let y = startY;

    const desc = this.scene.add.text(x0, y, recipe.description, {
      fontFamily: "monospace",
      fontSize: "15px",
      color: "#c8d0dc",
      wordWrap: { width: this.panelX + PANEL_W - 12 - x0 },
    });
    desc.setScrollFactor(0).setDepth(3001);
    this.rows.push(desc);
    y += desc.height + 8;

    // If this piece belongs to an armor SET, surface the full-set bonus name +
    // description here (playtester: "ember blink description should be in the
    // ember armor description") — for every set piece, not just Ember.
    const set = ARMOR_SETS.find((s) => s.pieces.includes(outputKey(recipe)));
    if (set) {
      const bonus = this.scene.add.text(
        x0,
        y,
        `Set Bonus — ${set.bonusName}: ${set.bonusDesc}`,
        {
          fontFamily: "monospace",
          fontSize: "15px",
          color: "#e3b25a",
          wordWrap: { width: this.panelX + PANEL_W - 12 - x0 },
        },
      );
      bonus.setScrollFactor(0).setDepth(3001);
      this.rows.push(bonus);
      y += bonus.height + 8;
    }

    // Weapon/armor damage & armor numbers — the freshly-crafted item is
    // always tier 0 (Lvl 1), so this shows base (adjusted-by-skill) exactly
    // like the InventoryMenu/Hotbar Tooltip does for an owned tier-0 item.
    const def = itemDef(outputKey(recipe));
    if (def?.stats?.length) {
      for (const stat of def.stats) {
        const t = this.scene.add.text(x0, y, `${stat.label}: ${this.statValue(def, stat)}`, {
          fontFamily: "monospace",
          fontSize: "15px",
          color: "#9adfff",
        });
        t.setScrollFactor(0).setDepth(3001);
        this.rows.push(t);
        y += 18;
      }
      y += 4;
    }

    const placeable = isPlaceableRecipe(recipe);
    // A batch slider only makes sense for a non-placeable recipe whose output
    // actually stacks (maxStack > 1) AND there's more than one batch worth of
    // resources+room available right now.
    const maxBatch = !placeable && (def?.maxStack ?? 1) > 1 ? this.deps.maxBatches(recipe) : 0;
    const stackable = maxBatch > 1;
    if (stackable) this.batchAmount = Phaser.Math.Clamp(this.batchAmount, 1, maxBatch);
    const batch = stackable ? this.batchAmount : 1;
    // The slider is expressed in OUTPUT units, not craft repetitions — most
    // recipes are 1:1 so this is a no-op, but a few (Shishkabob x2, Slingshot
    // Pellets x25, Javelin x2) grant more than one item per craft, and the
    // slider should read as "how many items", not "how many times to craft".
    const outputCount = recipe.output.kind === "item" ? (recipe.output.count ?? 1) : 1;
    const qty = batch * outputCount;
    const maxQty = maxBatch * outputCount;

    for (const [resource, amount] of Object.entries(recipe.costs) as [ResourceType, number][]) {
      // Counts EQUIPPED pieces too (a worn base forged piece counts toward a
      // T2 reforge recipe), so the readout never shows a misleading "0/1".
      const have = this.deps.crafting.availableFor(resource, this.deps.backpack);
      const need = amount * batch;
      const resourceName = itemDef(resource)?.name ?? resource;
      const t = this.scene.add.text(x0, y, `${resourceName}: ${have}/${need}`, {
        fontFamily: "monospace",
        fontSize: "15px",
        color: have >= need ? "#8fe38f" : "#e38f8f",
      });
      t.setScrollFactor(0).setDepth(3001);
      this.rows.push(t);
      y += 18;
    }
    y += 8;

    if (recipe.tier >= 1 && !this.deps.isNearWorkbench()) {
      const t = this.scene.add.text(x0, y, "Requires a nearby Workbench", {
        fontFamily: "monospace",
        fontSize: "15px",
        color: "#e3b25a",
      });
      t.setScrollFactor(0).setDepth(3001);
      this.rows.push(t);
      y += 18;
    } else if (
      recipe.requiresWorkbenchTier !== undefined &&
      !this.deps.isNearWorkbenchAtTier(recipe.requiresWorkbenchTier)
    ) {
      // Near a Workbench, but not an upgraded-enough one (forged gear needs Lvl 3).
      const t = this.scene.add.text(x0, y, `Requires Workbench Lvl ${recipe.requiresWorkbenchTier + 1}`, {
        fontFamily: "monospace",
        fontSize: "15px",
        color: "#e3b25a",
      });
      t.setScrollFactor(0).setDepth(3001);
      this.rows.push(t);
      y += 18;
    }

    // Placeable recipes (build pieces) don't land in the backpack at all, so
    // an inventory count for them would just always read 0 — only show this
    // for recipes whose output actually goes into the backpack.
    if (!placeable) {
      const have = this.deps.backpack.count(outputKey(recipe));
      const t = this.scene.add.text(x0, y, `In inventory: ${have}`, {
        fontFamily: "monospace",
        fontSize: "15px",
        color: "#9aa4b5",
      });
      t.setScrollFactor(0).setDepth(3001);
      this.rows.push(t);
      y += 18;
    }

    if (stackable) {
      const t = this.scene.add.text(x0, y, `Qty: ${qty} / ${maxQty}`, {
        fontFamily: "monospace",
        fontSize: "15px",
        color: "#e8ecf2",
      });
      t.setScrollFactor(0).setDepth(3001);
      this.rows.push(t);
      y += 18;

      this.sliderTrack = { x: x0, y, w: SLIDER_W };
      const trackBg = this.scene.add
        .rectangle(x0, y, SLIDER_W, SLIDER_H, 0x1a1f2a, 0.95)
        .setOrigin(0, 0)
        .setStrokeStyle(1, 0x3a4250)
        .setScrollFactor(0)
        .setDepth(3001)
        .setInteractive({ useHandCursor: true })
        .on("pointerdown", (pointer: Phaser.Input.Pointer) => {
          this.sliderDragging = true;
          this.updateSliderFromPointer(pointer.x);
        });
      this.rows.push(trackBg);
      const frac = batch / maxBatch;
      const fill = this.scene.add
        .rectangle(x0 + 1, y + 1, Math.max(0, (SLIDER_W - 2) * frac), SLIDER_H - 2, 0xc9a86a, 1)
        .setOrigin(0, 0)
        .setScrollFactor(0)
        .setDepth(3002);
      this.rows.push(fill);
      const knob = this.scene.add
        .rectangle(x0 + SLIDER_W * frac, y + SLIDER_H / 2, 8, SLIDER_H + 8, 0xffffff, 1)
        .setOrigin(0.5, 0.5)
        .setScrollFactor(0)
        .setDepth(3003);
      this.rows.push(knob);

      const maxBtn = this.scene.add
        .text(x0 + SLIDER_W + 10, y + SLIDER_H / 2, "Max", {
          fontFamily: "monospace",
          fontSize: "13px",
          color: batch >= maxBatch ? "#5a6272" : "#c9a86a",
          backgroundColor: "#1a1f2a",
          padding: { x: 6, y: 3 },
        })
        .setOrigin(0, 0.5)
        .setScrollFactor(0)
        .setDepth(3001)
        .setInteractive({ useHandCursor: batch < maxBatch })
        .on("pointerdown", () => {
          if (this.batchAmount === maxBatch) return;
          this.batchAmount = maxBatch;
          this.render();
        });
      this.rows.push(maxBtn);
      y += SLIDER_H + 14;
    }

    const btnY = y;
    // While a craft bar is filling the button greys out (and the bar covers
    // it); placeable recipes never use the bar so they stay live.
    const clickable = isCraftable(this.deps, recipe) && (placeable || !this.busy);
    const btnLabel = placeable ? "Place" : this.busy ? "Crafting…" : stackable ? `Craft x${qty}` : "Craft";
    const btn = this.scene.add
      .text(x0, btnY, btnLabel, {
        fontFamily: "monospace",
        fontSize: "16px",
        color: clickable ? "#0a0a0a" : "#4a4a4a",
        backgroundColor: clickable ? "#8fe38f" : "#2a2a2a",
        padding: { x: 10, y: 5 },
      })
      .setScrollFactor(0)
      .setDepth(3001)
      .setInteractive({ useHandCursor: clickable })
      .on("pointerdown", () => {
        if (!clickable) return;
        if (placeable) {
          // Per user request: entering placement mode from the crafting menu
          // no longer closes it — the panel stays up (mirrors how it already
          // stayed open for a plain "Craft" click) while the ghost follows
          // the cursor.
          this.deps.startPlacement(recipe);
          return;
        }
        // Consume+grant happens when the bar finishes (the busy flag blocks a
        // second craft meanwhile). Driven by the tween, so it still lands even
        // if the menu is closed mid-bar.
        this.busy = true;
        this.progressBar.setPosition(x0, btnY).setSize(96, 26).start(CRAFT_BAR_MS, {
          onComplete: () => {
            this.busy = false;
            this.deps.craft(recipe, batch);
            this.batchAmount = 1;
            if (this.open) this.render();
          },
        });
        this.render();
      });
    this.rows.push(btn);

    // Keep the running bar pinned over the (now greyed) button as the panel
    // re-renders under it.
    if (this.busy && !placeable) this.progressBar.setPosition(x0, btnY).setVisible(true);
  }
}
