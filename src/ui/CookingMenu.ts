import Phaser from "phaser";
import type { ItemContainer } from "../systems/ItemContainer";
import { itemDef } from "../systems/Items";
import { COOK_RECIPES, canAffordCook, type CookRecipe } from "../systems/Cooking";
import { stationDisplayName } from "../systems/StationUpgrades";
import type { Skills } from "../systems/Skills";
import { Tooltip } from "./Tooltip";
import { ProgressBar } from "./ProgressBar";

// A short "cooking…" bar plays before the dish (or the whole batch) lands in
// the bag. One bar covers the whole batch, same as CraftingMenu/DryingRack.
const COOK_BAR_MS = 500;
const SLIDER_W = 140;
const SLIDER_H = 10;
const FOOTER_H = 92;

export interface CookingMenuDeps {
  backpack: ItemContainer;
  skills: Skills;
  // Item keys the player has discovered (ever held). A dish stays hidden until
  // ALL its ingredients are discovered — same "don't reveal locked info" rule
  // Crafting.ts uses, so e.g. Cooked Boar Meat doesn't advertise itself before
  // the player has ever obtained a shishkabob.
  discovered: () => ReadonlySet<string>;
  // Tier (== level count) of the campfire the menu is currently bound to (null
  // when closed).
  campfireTier: () => number | null;
  // Cook `batches` of `recipeId` in one call — consumes its inputs from the
  // backpack and deposits the food (scene handles overflow-drop). The menu
  // only asks; it doesn't move items itself.
  cook: (recipeId: string, batches: number) => void;
  // Max times `recipe` could be cooked right now (cost- and room-limited) —
  // backs the batch-quantity slider.
  maxBatches: (recipe: CookRecipe) => number;
  // DEV `nobuildcost` cheat — when true, every dish reads as cookable
  // regardless of ingredients.
  noBuildCost: () => boolean;
}

const DEPTH_BG = 3000;
const DEPTH_ITEM = 3001;
const DEPTH_TEXT = 3002;
const ROW_H = 74;
const ROW_GAP = 8;
const HEADER_H = 30; // tier section-header row height
const VIEW_H = 372; // fixed height of the scrollable recipe-list viewport
const SCROLL_STEP = 60; // px per wheel notch
const AMBER = "#ffe08a"; // "you can make this" accent (NOT green — reserved for buff deltas)

// The Campfire's cooking menu. Dishes are grouped into COLLAPSIBLE per-tier
// sections ordered best-on-top (Lvl 4 → Lvl 1), and the list SCROLLS since the
// recipe count grows across the campfire's four levels. Only tiers the open
// campfire can actually cook are shown (a dish also stays hidden until all its
// ingredients are discovered — Crafting.ts's "don't reveal locked info" rule).
//
// Layout is a fixed-height frame: a fixed intro header (title + blurb + a
// "Show only cookable" filter), a fixed footer (selected-dish cost + batch
// slider + Cook button + ProgressBar), and a scrollable list region between
// them. The list uses WINDOWED rendering — only rows/headers intersecting the
// viewport are created — plus a geometry mask that clips the one partial row at
// each edge. IMPORTANT INVARIANT: a Phaser geometry mask clips RENDERING only,
// not INPUT, so off-window rows must never be created (creating them all and
// relying on the mask would reintroduce phantom clicks on hidden rows).
//
// Flat scrollFactor(0) GameObjects (no Containers), per the note in
// CraftingMenu.ts — the mask/bg/progressBar are owned separately and survive
// the per-render clearRows().
export class CookingMenu {
  private scene: Phaser.Scene;
  private deps: CookingMenuDeps;
  private bg: Phaser.GameObjects.Rectangle;
  private open = false;
  private rows: Phaser.GameObjects.GameObject[] = [];
  private tooltipUI: Tooltip;
  private selected: CookRecipe | null = null;
  // Batch-quantity slider for the selected dish — reset to 1 whenever a
  // different row is selected.
  private batchAmount = 1;
  private sliderDragging = false;
  private sliderTrack: { x: number; y: number; w: number } = { x: 0, y: 0, w: SLIDER_W };
  // True while a cook bar is filling — greys the button + blocks re-clicks.
  private busy = false;
  private progressBar: ProgressBar;

  // Scroll/collapse/filter state.
  private scrollOffset = 0;
  private maxScroll = 0;
  private collapsedTiers = new Set<number>();
  // Persists across opens within a run (reset only on scene.restart, since a
  // fresh scene builds a fresh CookingMenu).
  private onlyCookable = false;
  private maskShape: Phaser.GameObjects.Graphics;
  private listMask: Phaser.Display.Masks.GeometryMask;

  private panelX: number;
  private panelY: number;
  private panelW: number;
  private panelH: number;
  private introH: number;
  private viewTop: number;

  constructor(scene: Phaser.Scene, deps: CookingMenuDeps) {
    this.scene = scene;
    this.deps = deps;
    this.tooltipUI = new Tooltip(scene, deps.skills);
    this.progressBar = new ProgressBar(scene, { width: 96, height: 28, depth: DEPTH_TEXT + 3 });

    this.panelW = 520;

    // Measure the intro blurb's wrapped height once (its wrap width is the fixed
    // panel width, so it doesn't change) to size the fixed intro band.
    const measure = scene.add
      .text(0, 0, INTRO_BLURB, { fontFamily: "monospace", fontSize: "11px", wordWrap: { width: this.panelW - 32 } })
      .setVisible(false);
    const descH = measure.height;
    measure.destroy();
    this.introH = 40 + descH + 12 + 26; // title + blurb + gap + filter-checkbox row

    this.panelH = this.introH + VIEW_H + FOOTER_H;
    this.panelX = scene.scale.width / 2 - this.panelW / 2;
    this.panelY = scene.scale.height / 2 - this.panelH / 2;
    this.viewTop = this.panelY + this.introH;

    this.bg = scene.add
      .rectangle(this.panelX, this.panelY, this.panelW, this.panelH, 0x0a0a0a, 0.95)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(DEPTH_BG)
      .setVisible(false);

    // Geometry mask over the viewport rect. Both the mask shape and the masked
    // list objects are scrollFactor(0) (camera-locked), so they line up in
    // screen space regardless of camera scroll. Not added to the display list
    // (a mask renders to the stencil, not the color buffer).
    this.maskShape = scene.make.graphics({}, false).setScrollFactor(0);
    this.maskShape.fillStyle(0xffffff).fillRect(this.panelX, this.viewTop, this.panelW, VIEW_H);
    this.listMask = this.maskShape.createGeometryMask();

    // Own wheel handler — scrolls the list when the pointer is over the open
    // menu (mirrors EventLogUI); MainScene's global handler separately
    // suppresses hotbar-cycle over the open menu.
    scene.input.on("wheel", this.onWheel, this);
  }

  private onWheel(pointer: Phaser.Input.Pointer, _over: unknown, _dx: number, dy: number): void {
    if (!this.open || !this.containsPoint(pointer.x, pointer.y)) return;
    this.scrollOffset = Phaser.Math.Clamp(this.scrollOffset + (dy > 0 ? SCROLL_STEP : -SCROLL_STEP), 0, this.maxScroll);
    this.render();
  }

  openMenu(): void {
    if (this.open) return;
    this.open = true;
    this.selected = null;
    this.batchAmount = 1;
    this.scrollOffset = 0;
    this.collapsedTiers.clear();
    this.bg.setVisible(true);
    this.render();
  }

  close(): void {
    if (!this.open) return;
    this.open = false;
    this.sliderDragging = false;
    // Closing mid-cook cancels the bar (nothing's consumed until it fills).
    this.busy = false;
    this.progressBar.stop();
    this.bg.setVisible(false);
    this.clearRows();
    this.tooltipUI.hide();
  }

  isOpen(): boolean {
    return this.open;
  }

  // Re-render on demand (after a cook / any backpack change) so have/need counts
  // and Cook-button affordability update immediately.
  refresh(): void {
    if (this.open) this.render();
  }

  hideTooltip(): void {
    this.tooltipUI.hide();
  }

  containsPoint(screenX: number, screenY: number): boolean {
    if (!this.open) return false;
    return (
      screenX >= this.panelX &&
      screenX <= this.panelX + this.panelW &&
      screenY >= this.panelY &&
      screenY <= this.panelY + this.panelH
    );
  }

  // --- batch slider drag (driven by MainScene's shared global pointermove/up,
  // same pattern as DryingRackMenu/CraftingMenu's amount sliders) ---

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

  private isCookable(recipe: CookRecipe): boolean {
    return this.deps.noBuildCost() || canAffordCook(recipe, this.deps.backpack);
  }

  private totalHeal(recipe: CookRecipe): number {
    const e = itemDef(recipe.output)?.edible;
    return e ? e.hpPerSec * e.durationMs : 0;
  }

  // Whether `recipe` is listed at all: normally the campfire must be high
  // enough tier AND every ingredient discovered, but `nobuildcost` shows every
  // dish (matching CraftingMenu.visibleRecipes) — otherwise a free-cook cheat
  // still couldn't reach a locked dish, since it never rendered a row.
  private isVisible(recipe: CookRecipe, tier: number, discovered: ReadonlySet<string>): boolean {
    if (this.deps.noBuildCost()) return true;
    return (
      recipe.requiredCampfireTier <= tier && Object.keys(recipe.inputs).every((key) => discovered.has(key))
    );
  }

  // Discovered dishes at or below the open campfire's tier, grouped by tier
  // (DESC, best on top), each tier's dishes sorted by total heal DESC. Applies
  // the "show only cookable" filter when on.
  private groupedVisibleRecipes(): { tier: number; recipes: CookRecipe[] }[] {
    const tier = this.deps.campfireTier() ?? 0;
    const discovered = this.deps.discovered();
    const visible = COOK_RECIPES.filter(
      (r) => this.isVisible(r, tier, discovered) && (!this.onlyCookable || this.isCookable(r)),
    );
    const byTier = new Map<number, CookRecipe[]>();
    for (const r of visible) {
      const arr = byTier.get(r.requiredCampfireTier);
      if (arr) arr.push(r);
      else byTier.set(r.requiredCampfireTier, [r]);
    }
    return [...byTier.entries()]
      .map(([t, recipes]) => ({ tier: t, recipes: recipes.sort((a, b) => this.totalHeal(b) - this.totalHeal(a)) }))
      .sort((a, b) => b.tier - a.tier);
  }

  // How many DISCOVERED dishes in `tier` the player can cook right now — drives
  // the collapsed-section "● N" badge. Independent of the onlyCookable filter so
  // the count stays meaningful when the filter is off.
  private cookableCountForTier(tier: number): number {
    const discovered = this.deps.discovered();
    return COOK_RECIPES.filter(
      (r) => r.requiredCampfireTier === tier && this.isVisible(r, tier, discovered) && this.isCookable(r),
    ).length;
  }

  private render(): void {
    this.clearRows();
    this.tooltipUI.hide();
    const tier = this.deps.campfireTier() ?? 0;

    this.bg.setPosition(this.panelX, this.panelY).setSize(this.panelW, this.panelH);

    // --- fixed intro (title + blurb + filter checkbox), unmasked ---
    this.addText(this.panelX + 16, this.panelY + 14, stationDisplayName("campfire", tier), 16, "#ffffff");
    this.addText(this.panelX + 16, this.panelY + 40, INTRO_BLURB, 11, "#8a93a3", 0, 0, this.panelW - 32);
    this.renderFilterCheckbox(this.panelY + this.introH - 24);

    const groups = this.groupedVisibleRecipes();
    const flat = groups.flatMap((g) => g.recipes);
    if (this.selected && !flat.includes(this.selected)) this.selected = null;

    // --- content-space layout: headers always counted; rows only for
    // non-collapsed tiers ---
    const items: ({ kind: "header"; group: { tier: number; recipes: CookRecipe[] } } | { kind: "row"; recipe: CookRecipe })[] = [];
    let contentH = 0;
    const laidOut: { top: number; h: number; i: number }[] = [];
    for (const g of groups) {
      laidOut.push({ top: contentH, h: HEADER_H, i: items.length });
      items.push({ kind: "header", group: g });
      contentH += HEADER_H + ROW_GAP;
      if (!this.collapsedTiers.has(g.tier)) {
        for (const r of g.recipes) {
          laidOut.push({ top: contentH, h: ROW_H, i: items.length });
          items.push({ kind: "row", recipe: r });
          contentH += ROW_H + ROW_GAP;
        }
      }
    }

    this.maxScroll = Math.max(0, contentH - VIEW_H);
    this.scrollOffset = Phaser.Math.Clamp(this.scrollOffset, 0, this.maxScroll);
    const viewBottom = this.viewTop + VIEW_H;

    if (items.length === 0) {
      this.addText(
        this.panelX + 16,
        this.viewTop + 8,
        this.onlyCookable ? "Nothing cookable right now." : "No dishes known yet — gather their ingredients first.",
        12,
        "#8a93a3",
      );
    }

    // --- windowed draw: only create items intersecting the viewport ---
    for (const lo of laidOut) {
      const screenY = this.viewTop - this.scrollOffset + lo.top;
      if (screenY + lo.h <= this.viewTop || screenY >= viewBottom) continue; // fully off-window
      const it = items[lo.i];
      if (it.kind === "header") this.renderSectionHeader(it.group, screenY);
      else this.renderRow(it.recipe, screenY);
    }

    // Scroll affordance: a faint "▾ more" hint when there's content below.
    if (this.scrollOffset < this.maxScroll) {
      this.addText(this.panelX + this.panelW - 16, viewBottom - 16, "▾", 14, "#5b6472", 1, 0);
    }
    if (this.scrollOffset > 0) {
      this.addText(this.panelX + this.panelW - 16, this.viewTop + 4, "▴", 14, "#5b6472", 1, 0);
    }

    // --- fixed footer, unmasked ---
    this.renderFooter(this.viewTop + VIEW_H);
  }

  private renderFilterCheckbox(y: number): void {
    const x = this.panelX + 16;
    const box = this.scene.add
      .rectangle(x, y, 14, 14, this.onlyCookable ? 0xffe08a : 0x14181f, 0.95)
      .setOrigin(0, 0)
      .setStrokeStyle(1, this.onlyCookable ? 0xffe08a : 0x5b6472)
      .setScrollFactor(0)
      .setDepth(DEPTH_ITEM)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => {
        this.onlyCookable = !this.onlyCookable;
        this.scrollOffset = 0;
        this.render();
      });
    this.rows.push(box);
    const label = this.addText(x + 22, y + 1, "Show only cookable", 12, this.onlyCookable ? AMBER : "#8a93a3");
    label
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => {
        this.onlyCookable = !this.onlyCookable;
        this.scrollOffset = 0;
        this.render();
      });
  }

  private renderSectionHeader(group: { tier: number; recipes: CookRecipe[] }, screenY: number): void {
    const x = this.panelX + 16;
    const rowW = this.panelW - 32;
    const collapsed = this.collapsedTiers.has(group.tier);
    const box = this.scene.add
      .rectangle(x, screenY, rowW, HEADER_H, 0x1b2029, 0.95)
      .setOrigin(0, 0)
      .setStrokeStyle(1, 0x3a4250)
      .setScrollFactor(0)
      .setDepth(DEPTH_ITEM)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => {
        if (collapsed) this.collapsedTiers.delete(group.tier);
        else this.collapsedTiers.add(group.tier);
        this.render();
      });
    this.mask(box);
    this.rows.push(box);

    // "▾/▸ Lvl N Campfire Dishes"
    const chevron = collapsed ? "▸" : "▾";
    this.mask(this.addText(x + 10, screenY + 7, `${chevron} ${stationDisplayName("campfire", group.tier)} Dishes`, 13, "#e8ecf2"));

    // Cookable-now badge (amber "● N") — visible even when collapsed.
    const n = this.cookableCountForTier(group.tier);
    if (n > 0) {
      this.mask(this.addText(x + rowW - 12, screenY + 7, `● ${n} ready`, 12, AMBER, 1, 0));
    }
  }

  private renderRow(recipe: CookRecipe, y: number): void {
    const x = this.panelX + 16;
    const rowW = this.panelW - 32;
    const canCook = this.isCookable(recipe);
    const isSelected = this.selected?.id === recipe.id;

    const box = this.scene.add
      .rectangle(x, y, rowW, ROW_H, 0x14181f, 0.9)
      .setOrigin(0, 0)
      .setStrokeStyle(isSelected ? 2 : 1, isSelected ? 0xffe08a : 0x3a4250)
      .setScrollFactor(0)
      .setDepth(DEPTH_ITEM)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => {
        this.selected = recipe;
        this.batchAmount = 1;
        this.render();
      });
    this.mask(box);
    this.rows.push(box);

    const def = itemDef(recipe.output);
    if (def) {
      const icon = this.scene.add
        .image(x + 26, y + ROW_H / 2, def.texture)
        .setScrollFactor(0)
        .setDepth(DEPTH_ITEM + 1)
        .setInteractive({ useHandCursor: true })
        .on("pointerover", () =>
          this.tooltipUI.show(recipe.output, { x: x + 10, y, width: 32, height: ROW_H }, "right"),
        )
        .on("pointerout", () => this.tooltipUI.hide())
        .on("pointerdown", () => {
          this.selected = recipe;
          this.batchAmount = 1;
          this.render();
        });
      this.mask(icon);
      this.rows.push(icon);
    }

    this.mask(this.addText(x + 52, y + 10, recipe.name, 14, canCook ? "#e8ecf2" : "#8a93a3"));

    // Per-ingredient "Name have/need", each colored by whether the player has
    // enough — a compact affordability readout without inline rich text.
    const parts = Object.entries(recipe.inputs).map(([key, need]) => {
      const have = this.deps.backpack.count(key);
      const name = itemDef(key)?.name ?? key;
      return { text: `${name} ${have}/${need}`, ok: have >= need };
    });
    let ix = x + 52;
    const iy = y + 32;
    for (const p of parts) {
      const t = this.scene.add
        .text(ix, iy, p.text, {
          fontFamily: "monospace",
          fontSize: "11px",
          color: p.ok ? "#8fe38f" : "#e08a8a",
        })
        .setScrollFactor(0)
        .setDepth(DEPTH_TEXT);
      this.mask(t);
      this.rows.push(t);
      ix += t.width + 14;
    }

    if (def?.edible) {
      this.mask(
        this.addText(
          x + 52,
          y + 50,
          `+${def.edible.hpPerSec} HP/s for ${Math.round(def.edible.durationMs / 1000)}s`,
          11,
          "#c9a86a",
        ),
      );
    }
  }

  // Shared footer for the currently-selected dish: scaled ingredient cost,
  // a batch slider (when more than 1 is affordable), and one Cook button
  // that cooks the whole selected batch behind a single bar. Fixed position
  // (not masked, not windowed).
  private renderFooter(y: number): void {
    const x = this.panelX + 16;
    const rowW = this.panelW - 32;

    const box = this.scene.add
      .rectangle(x, y, rowW, FOOTER_H - 8, 0x0f1218, 0.95)
      .setOrigin(0, 0)
      .setStrokeStyle(1, 0x3a4250)
      .setScrollFactor(0)
      .setDepth(DEPTH_ITEM);
    this.rows.push(box);

    if (!this.selected) {
      this.addText(x + 12, y + FOOTER_H / 2 - 14, "Select a dish above to cook it.", 12, "#8a93a3");
      return;
    }

    const recipe = this.selected;
    const maxBatch = this.deps.maxBatches(recipe);
    const stackable = maxBatch > 1;
    if (stackable) this.batchAmount = Phaser.Math.Clamp(this.batchAmount, 1, maxBatch);
    const batch = Math.max(1, Math.min(this.batchAmount, Math.max(1, maxBatch)));

    const costParts = Object.entries(recipe.inputs)
      .map(([key, need]) => {
        const have = this.deps.backpack.count(key);
        const name = itemDef(key)?.name ?? key;
        return `${name} ${have}/${need * batch}`;
      })
      .join("   ");
    this.addText(x + 12, y + 8, costParts, 12, "#c8d0dc", 0, 0, rowW - 110);

    if (stackable) {
      this.addText(x + 12, y + 28, `Qty: ${batch} / ${maxBatch}`, 12, "#e8ecf2");
      const trackY = y + 46;
      this.sliderTrack = { x: x + 12, y: trackY, w: SLIDER_W };
      const trackBg = this.scene.add
        .rectangle(x + 12, trackY, SLIDER_W, SLIDER_H, 0x1a1f2a, 0.95)
        .setOrigin(0, 0)
        .setStrokeStyle(1, 0x3a4250)
        .setScrollFactor(0)
        .setDepth(DEPTH_ITEM + 1)
        .setInteractive({ useHandCursor: true })
        .on("pointerdown", (pointer: Phaser.Input.Pointer) => {
          this.sliderDragging = true;
          this.updateSliderFromPointer(pointer.x);
        });
      this.rows.push(trackBg);
      const frac = batch / maxBatch;
      const fill = this.scene.add
        .rectangle(x + 13, trackY + 1, Math.max(0, (SLIDER_W - 2) * frac), SLIDER_H - 2, 0xc9a86a, 1)
        .setOrigin(0, 0)
        .setScrollFactor(0)
        .setDepth(DEPTH_ITEM + 2);
      this.rows.push(fill);
      const knob = this.scene.add
        .rectangle(x + 12 + SLIDER_W * frac, trackY + SLIDER_H / 2, 8, SLIDER_H + 8, 0xffffff, 1)
        .setOrigin(0.5, 0.5)
        .setScrollFactor(0)
        .setDepth(DEPTH_ITEM + 3);
      this.rows.push(knob);
    }

    const btnX = x + rowW - 96;
    const btnY = y + 8;
    const canCook = maxBatch >= 1 && !this.busy;
    const btn = this.scene.add
      .text(btnX, btnY, this.busy ? "Cooking…" : stackable ? `Cook x${batch}` : "Cook", {
        fontFamily: "monospace",
        fontSize: "14px",
        color: canCook ? "#0a0a0a" : "#4a4a4a",
        backgroundColor: canCook ? "#8fe38f" : "#2a2a2a",
        padding: { x: 12, y: 6 },
      })
      .setScrollFactor(0)
      .setDepth(DEPTH_TEXT)
      .setInteractive({ useHandCursor: canCook })
      .on("pointerdown", () => {
        if (!canCook) return;
        this.busy = true;
        this.progressBar.setPosition(btnX, btnY).setSize(96, 28).start(COOK_BAR_MS, {
          onComplete: () => {
            this.busy = false;
            this.deps.cook(recipe.id, batch);
            this.batchAmount = 1;
            if (this.open) this.render();
          },
        });
        this.render();
      });
    this.rows.push(btn);

    if (this.busy) this.progressBar.setPosition(btnX, btnY).setVisible(true);
  }

  // Clip a windowed list object to the viewport (rendering only — see the class
  // invariant about input).
  private mask<T extends Phaser.GameObjects.GameObject>(o: T): T {
    (o as unknown as { setMask: (m: Phaser.Display.Masks.GeometryMask) => void }).setMask(this.listMask);
    return o;
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
    const t = this.scene.add
      .text(x, y, str, {
        fontFamily: "monospace",
        fontSize: `${size + 1}px`,
        color,
        wordWrap: wrapWidth ? { width: wrapWidth } : undefined,
      })
      .setOrigin(originX, originY)
      .setScrollFactor(0)
      .setDepth(DEPTH_TEXT);
    this.rows.push(t);
    return t;
  }
}

const INTRO_BLURB = "Cook meat and vegetables into food. Right-click a dish in your bag to eat it.";
