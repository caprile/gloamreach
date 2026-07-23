import Phaser from "phaser";
import type { ItemContainer } from "../systems/ItemContainer";
import { itemDef } from "../systems/Items";
import { JEWELRY_RECIPES, canAffordJewelry, type JewelryRecipe } from "../systems/Jewelry";
import { describePassive } from "../systems/EquipmentEffects";
import { stationDisplayName } from "../systems/StationUpgrades";
import { ABILITY_DEFS, SLOT_ABILITY_KEY } from "../systems/Abilities";
import { MAX_AUGMENTS_PER_ITEM, describeAugmentEffect, type GearAugmentDef } from "../systems/GearAugments";
import type { Skills } from "../systems/Skills";
import { Tooltip } from "./Tooltip";
import { ProgressBar } from "./ProgressBar";

// A short "crafting…" bar plays before the piece (or the whole batch) lands in
// the bag — same commit-at-end pattern as CookingMenu/CraftingMenu.
const CRAFT_BAR_MS = 500;
const SLIDER_W = 140;
const SLIDER_H = 10;
const FOOTER_H = 92;

export interface JewelryMenuDeps {
  backpack: ItemContainer;
  skills: Skills;
  // Item keys the player has discovered — a recipe stays hidden until ALL its
  // ingredients are discovered (same "don't reveal locked info" rule Cooking/
  // Crafting use).
  discovered: () => ReadonlySet<string>;
  // Tier (== upgrade count) of the Gemwright's Table the menu is bound to (null
  // when closed). Tier 0 = passive jewelry, tier 1 (Duneshaper's-Heart upgrade)
  // = the ability specials.
  stationTier: () => number | null;
  // Craft `batches` of `recipeId` in one call — consumes inputs, deposits the
  // jewelry (scene handles overflow-drop).
  craft: (recipeId: string, batches: number) => void;
  maxBatches: (recipe: JewelryRecipe) => number;
  noBuildCost: () => boolean;
  // --- B4-P5: gem setting moved here from the shared Upgrade panel ---
  // Items that can take a gem (worn + backpack), the gems available, and the
  // apply call. All addressed by id so the menu never holds a live item ref.
  augmentTargets: () => { id: string; label: string; key: string; texture: string; applied: string[] }[];
  availableAugments: () => GearAugmentDef[];
  canAffordAugment: (aug: GearAugmentDef) => boolean;
  applyAugment: (targetId: string, augId: string) => boolean;
}

const DEPTH_BG = 3000;
const DEPTH_ITEM = 3001;
const DEPTH_TEXT = 3002;
const ROW_H = 74;
const ROW_GAP = 8;
const HEADER_H = 30;
const VIEW_H = 372;
const SCROLL_STEP = 60;
const AMBER = "#ffe08a";

const INTRO_BLURB = "Set gems into rings and amulets. Equip them from your bag to augment your abilities and gear.";

// The Gemwright's Table's crafting menu — a near-clone of CookingMenu: recipes
// grouped into COLLAPSIBLE per-tier sections (best/highest tier on top), a
// scrollable windowed+masked list, and a fixed footer with a batch slider and
// one Craft button behind a single progress bar. Only tiers the placed station
// can actually reach are shown; a recipe also stays hidden until all its
// ingredients are discovered.
export class JewelryMenu {
  private scene: Phaser.Scene;
  private deps: JewelryMenuDeps;
  private bg: Phaser.GameObjects.Rectangle;
  private open = false;
  private rows: Phaser.GameObjects.GameObject[] = [];
  private tooltipUI: Tooltip;
  private selected: JewelryRecipe | null = null;
  private batchAmount = 1;
  private sliderDragging = false;
  private sliderTrack: { x: number; y: number; w: number } = { x: 0, y: 0, w: SLIDER_W };
  private busy = false;
  private progressBar: ProgressBar;

  private scrollOffset = 0;
  private maxScroll = 0;
  private collapsedTiers = new Set<number>();
  private onlyCraftable = false;
  // B4-P5 gem-setting tab state: the A and B of the pairing.
  private tab: "craft" | "gems" = "craft";
  private gemTargetId: string | null = null;
  private gemAugId: string | null = null;
  private maskShape: Phaser.GameObjects.Graphics;
  private listMask: Phaser.Display.Masks.GeometryMask;

  private panelX: number;
  private panelY: number;
  private panelW: number;
  private panelH: number;
  private introH: number;
  private viewTop: number;

  constructor(scene: Phaser.Scene, deps: JewelryMenuDeps) {
    this.scene = scene;
    this.deps = deps;
    this.tooltipUI = new Tooltip(scene, deps.skills);
    this.progressBar = new ProgressBar(scene, { width: 96, height: 28, depth: DEPTH_TEXT + 3 });

    this.panelW = 520;

    const measure = scene.add
      .text(0, 0, INTRO_BLURB, { fontFamily: "monospace", fontSize: "13px", wordWrap: { width: this.panelW - 32 } })
      .setVisible(false);
    const descH = measure.height;
    measure.destroy();
    this.introH = 40 + descH + 12 + 26;

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

    this.maskShape = scene.make.graphics({}, false).setScrollFactor(0);
    this.maskShape.fillStyle(0xffffff).fillRect(this.panelX, this.viewTop, this.panelW, VIEW_H);
    this.listMask = this.maskShape.createGeometryMask();

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
    this.busy = false;
    this.progressBar.stop();
    this.bg.setVisible(false);
    this.clearRows();
    this.tooltipUI.hide();
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

  containsPoint(screenX: number, screenY: number): boolean {
    if (!this.open) return false;
    return (
      screenX >= this.panelX &&
      screenX <= this.panelX + this.panelW &&
      screenY >= this.panelY &&
      screenY <= this.panelY + this.panelH
    );
  }

  // --- batch slider drag (driven by MainScene's shared global pointermove/up) ---

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

  private isCraftable(recipe: JewelryRecipe): boolean {
    return this.deps.noBuildCost() || canAffordJewelry(recipe, this.deps.backpack);
  }

  // Discovered recipes at or below the open station's tier, grouped by tier
  // (DESC, ability specials on top), recipe order preserved within a tier.
  private groupedVisibleRecipes(): { tier: number; recipes: JewelryRecipe[] }[] {
    const tier = this.deps.stationTier() ?? 0;
    const discovered = this.deps.discovered();
    const visible = JEWELRY_RECIPES.filter(
      (r) =>
        r.requiredStationTier <= tier &&
        Object.keys(r.inputs).every((key) => discovered.has(key)) &&
        (!this.onlyCraftable || this.isCraftable(r)),
    );
    const byTier = new Map<number, JewelryRecipe[]>();
    for (const r of visible) {
      const arr = byTier.get(r.requiredStationTier);
      if (arr) arr.push(r);
      else byTier.set(r.requiredStationTier, [r]);
    }
    return [...byTier.entries()].map(([t, recipes]) => ({ tier: t, recipes })).sort((a, b) => b.tier - a.tier);
  }

  private craftableCountForTier(tier: number): number {
    const discovered = this.deps.discovered();
    return JEWELRY_RECIPES.filter(
      (r) =>
        r.requiredStationTier === tier &&
        Object.keys(r.inputs).every((key) => discovered.has(key)) &&
        this.isCraftable(r),
    ).length;
  }

  // The short effect line under a recipe row: ability specials advertise what
  // they grant; passive jewelry shows its augment/utility bonuses.
  // Which hotkey an ability-granting design will occupy, derived from the item's
  // own equip slot rather than written out per recipe (so it can't drift). The
  // recipe list previously said only "Gloamstep Band" with no hint that it fills
  // Q, which made the whole Q/E/R layout unreadable at craft time (the user:
  // "it isn't clear in the gemcrafter bench what item gives you what hotkey slot").
  private abilityKeyLabel(outputKey: string): string {
    const def = itemDef(outputKey);
    if (!def?.grantsAbility || !def.armorSlot) return "";
    const key = SLOT_ABILITY_KEY[def.armorSlot];
    return key ? key.toUpperCase() : "";
  }

  private effectLine(outputKey: string): string {
    const def = itemDef(outputKey);
    if (def?.grantsAbility) return `Grants ${ABILITY_DEFS[def.grantsAbility].name}`;
    if (def?.passive) return describePassive(def.passive).join("  ");
    return "";
  }

  private render(): void {
    this.clearRows();
    this.tooltipUI.hide();
    const tier = this.deps.stationTier() ?? 0;

    this.bg.setPosition(this.panelX, this.panelY).setSize(this.panelW, this.panelH);

    this.addText(this.panelX + 16, this.panelY + 14, stationDisplayName("jewelry_station", tier), 16, "#ffffff");
    this.renderTabs(this.panelY + 38);
    if (this.tab === "gems") {
      this.renderGemsTab(this.panelY + 74);
      return;
    }
    this.addText(this.panelX + 16, this.panelY + 56, INTRO_BLURB, 11, "#8a93a3", 0, 0, this.panelW - 32);
    this.renderFilterCheckbox(this.panelY + this.introH - 24);

    const groups = this.groupedVisibleRecipes();
    const flat = groups.flatMap((g) => g.recipes);
    if (this.selected && !flat.includes(this.selected)) this.selected = null;

    const items: ({ kind: "header"; group: { tier: number; recipes: JewelryRecipe[] } } | { kind: "row"; recipe: JewelryRecipe })[] = [];
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
        this.onlyCraftable ? "Nothing craftable right now." : "No designs known yet — gather their materials first.",
        12,
        "#8a93a3",
      );
    }

    for (const lo of laidOut) {
      const screenY = this.viewTop - this.scrollOffset + lo.top;
      if (screenY + lo.h <= this.viewTop || screenY >= viewBottom) continue;
      const it = items[lo.i];
      if (it.kind === "header") this.renderSectionHeader(it.group, screenY);
      else this.renderRow(it.recipe, screenY);
    }

    if (this.scrollOffset < this.maxScroll) {
      this.addText(this.panelX + this.panelW - 16, viewBottom - 16, "▾", 14, "#5b6472", 1, 0);
    }
    if (this.scrollOffset > 0) {
      this.addText(this.panelX + this.panelW - 16, this.viewTop + 4, "▴", 14, "#5b6472", 1, 0);
    }

    this.renderFooter(this.viewTop + VIEW_H);
  }


  // Craft / Set Gems tabs. Gem setting used to live in the shared right-click
  // Upgrade panel alongside station, armor and weapon upgrades — four unrelated
  // concepts in one list (the user: "not a big fan of the gem setting menu living
  // in the same place as the upgrades, it is confusing"). It belongs at the gem
  // station, next to the jewelry it's kin to.
  private renderTabs(y: number): void {
    let tx = this.panelX + 16;
    for (const t of ["craft", "gems"] as const) {
      const active = this.tab === t;
      const label = t === "craft" ? "Craft" : "Set Gems";
      // Both tabs get a background box so an inactive tab still reads as a
      // clickable tab (the user: "Set Gems tab kind of hard to see") — the active
      // one is brighter/highlighted, the inactive one a legible dim box.
      const btn = this.scene.add
        .text(tx, y, label, {
          fontFamily: "monospace",
          fontSize: "15px",
          color: active ? "#ffffff" : "#c2cad6",
          backgroundColor: active ? "#3a5a88" : "#232c3a",
          padding: { x: 8, y: 4 },
        })
        .setScrollFactor(0)
        .setDepth(DEPTH_TEXT)
        .setInteractive({ useHandCursor: true })
        .on("pointerdown", () => {
          this.tab = t;
          this.render();
        });
      this.rows.push(btn);
      tx += btn.width + 8;
    }
  }

  // A + B, like the Smelter: pick the GEAR on the left, the GEM on the right,
  // and the footer previews exactly what setting it will do before you commit.
  private renderGemsTab(top: number): void {
    const x = this.panelX + 16;
    const colW = (this.panelW - 44) / 2;
    const targets = this.deps.augmentTargets();
    const gems = this.deps.availableAugments();

    if (this.gemTargetId && !targets.some((t) => t.id === this.gemTargetId)) this.gemTargetId = null;
    const target = targets.find((t) => t.id === this.gemTargetId) ?? null;

    this.addText(x, top, "Gear", 12, "#e3b25a");
    this.addText(x + colW + 12, top, "Gem", 12, "#e3b25a");

    if (targets.length === 0) {
      this.addText(x, top + 22, "No gear that can take a gem.", 11, "#8a93a3", 0, 0, colW);
    }

    let ty = top + 22;
    for (const t of targets.slice(0, 8)) {
      const full = t.applied.length >= MAX_AUGMENTS_PER_ITEM;
      const sel = this.gemTargetId === t.id;
      const box = this.scene.add
        .rectangle(x, ty, colW, 30, sel ? 0x2a3a55 : 0x14181f, 0.95)
        .setOrigin(0, 0)
        .setStrokeStyle(1, sel ? 0xe3b25a : 0x3a4250)
        .setScrollFactor(0)
        .setDepth(DEPTH_ITEM)
        .setInteractive({ useHandCursor: true })
        .on("pointerdown", () => {
          this.gemTargetId = t.id;
          this.render();
        });
      this.rows.push(box);
      if (t.texture) {
        const img = this.scene.add.image(x + 16, ty + 15, t.texture).setScrollFactor(0).setDepth(DEPTH_ITEM + 1);
        this.rows.push(img);
      }
      // The slot readout is what makes the 2-per-item cap visible up front.
      this.addText(x + 32, ty + 3, t.label, 11, full ? "#8a93a3" : "#e8ecf2");
      this.addText(x + 32, ty + 17, `Gems ${t.applied.length}/${MAX_AUGMENTS_PER_ITEM}`, 10, full ? "#e08a8a" : "#8a93a3");
      ty += 34;
    }

    let gy = top + 22;
    const gx = x + colW + 12;
    for (const g of gems.slice(0, 8)) {
      const already = target ? target.applied.includes(g.id) : false;
      const fits = target ? g.appliesToItemKeys.includes(target.key) : true;
      const afford = this.deps.canAffordAugment(g);
      const usable = !!target && fits && !already && afford && target.applied.length < MAX_AUGMENTS_PER_ITEM;
      const sel = this.gemAugId === g.id;
      const box = this.scene.add
        .rectangle(gx, gy, colW, 30, sel ? 0x2a3a55 : 0x14181f, 0.95)
        .setOrigin(0, 0)
        .setStrokeStyle(1, sel ? 0xe3b25a : 0x3a4250)
        .setScrollFactor(0)
        .setDepth(DEPTH_ITEM)
        .setInteractive({ useHandCursor: true })
        .on("pointerdown", () => {
          this.gemAugId = g.id;
          this.render();
        });
      this.rows.push(box);
      this.addText(gx + 8, gy + 3, g.name, 11, usable ? "#e8ecf2" : "#8a93a3");
      const why = !target ? "" : already ? "already set" : !fits ? "wrong gear type" : !afford ? "missing materials" : g.deltaLabel;
      this.addText(gx + 8, gy + 17, why, 10, usable ? "#8fe38f" : "#e08a8a");
      gy += 34;
    }

    this.renderGemPreview(Math.max(ty, gy) + 10, target, gems.find((g) => g.id === this.gemAugId) ?? null);
  }

  // The preview the user asked for: what you're about to get, before you spend.
  private renderGemPreview(
    y: number,
    target: { id: string; label: string; key: string; applied: string[] } | null,
    gem: GearAugmentDef | null,
  ): void {
    const x = this.panelX + 16;
    const w = this.panelW - 32;
    const box = this.scene.add
      .rectangle(x, y, w, 84, 0x14181f, 0.95)
      .setOrigin(0, 0)
      .setStrokeStyle(1, 0xc9a86a)
      .setScrollFactor(0)
      .setDepth(DEPTH_ITEM);
    this.rows.push(box);

    if (!target || !gem) {
      this.addText(x + 10, y + 10, "Pick a piece of gear and a gem to see what it will do.", 11, "#8a93a3");
      return;
    }

    this.addText(x + 10, y + 8, `${target.label}  +  ${gem.name}`, 12, "#e8ecf2");
    const effects = describeAugmentEffect(gem.effect).join("   ");
    this.addText(x + 10, y + 26, effects || gem.deltaLabel, 11, "#8fe38f");
    const cost = Object.entries(gem.costs)
      .map(([k, n]) => `${itemDef(k)?.name ?? k} x${n}`)
      .join(", ");
    this.addText(x + 10, y + 42, `Cost: ${cost}`, 10, "#8a93a3");

    const fits = gem.appliesToItemKeys.includes(target.key);
    const already = target.applied.includes(gem.id);
    const full = target.applied.length >= MAX_AUGMENTS_PER_ITEM;
    const can = fits && !already && !full && this.deps.canAffordAugment(gem);

    const bw = 110;
    const bh = 26;
    const bx = x + w - bw - 10;
    const by = y + 50;
    const btn = this.scene.add
      .rectangle(bx, by, bw, bh, can ? 0x2a2333 : 0x14181f, 0.95)
      .setOrigin(0, 0)
      .setStrokeStyle(1, can ? 0xe3b25a : 0x3a4250)
      .setScrollFactor(0)
      .setDepth(DEPTH_ITEM)
      .setInteractive({ useHandCursor: can })
      .on("pointerdown", () => {
        if (!can) return;
        if (this.deps.applyAugment(target.id, gem.id)) {
          this.gemAugId = null;
          this.render();
        }
      });
    this.rows.push(btn);
    this.addText(bx + bw / 2, by + bh / 2, "Set Gem", 12, can ? "#f0c090" : "#6a7280", 0.5, 0.5);
  }

  private renderFilterCheckbox(y: number): void {
    const x = this.panelX + 16;
    const box = this.scene.add
      .rectangle(x, y, 14, 14, this.onlyCraftable ? 0xffe08a : 0x14181f, 0.95)
      .setOrigin(0, 0)
      .setStrokeStyle(1, this.onlyCraftable ? 0xffe08a : 0x5b6472)
      .setScrollFactor(0)
      .setDepth(DEPTH_ITEM)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => {
        this.onlyCraftable = !this.onlyCraftable;
        this.scrollOffset = 0;
        this.render();
      });
    this.rows.push(box);
    const label = this.addText(x + 22, y + 1, "Show only craftable", 12, this.onlyCraftable ? AMBER : "#8a93a3");
    label
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => {
        this.onlyCraftable = !this.onlyCraftable;
        this.scrollOffset = 0;
        this.render();
      });
  }

  private renderSectionHeader(group: { tier: number; recipes: JewelryRecipe[] }, screenY: number): void {
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

    const chevron = collapsed ? "▸" : "▾";
    const label = group.tier === 0 ? "Rings & Amulets" : "Ability Jewelry";
    this.mask(this.addText(x + 10, screenY + 7, `${chevron} ${label}`, 13, "#e8ecf2"));

    const n = this.craftableCountForTier(group.tier);
    if (n > 0) {
      this.mask(this.addText(x + rowW - 12, screenY + 7, `● ${n} ready`, 12, AMBER, 1, 0));
    }
  }

  private renderRow(recipe: JewelryRecipe, y: number): void {
    const x = this.panelX + 16;
    const rowW = this.panelW - 32;
    const canCraft = this.isCraftable(recipe);
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
        .on("pointerover", () => this.tooltipUI.show(recipe.output, { x: x + 10, y, width: 32, height: ROW_H }, "right"))
        .on("pointerout", () => this.tooltipUI.hide())
        .on("pointerdown", () => {
          this.selected = recipe;
          this.batchAmount = 1;
          this.render();
        });
      this.mask(icon);
      this.rows.push(icon);
    }

    const nameText = this.addText(x + 52, y + 10, recipe.name, 14, canCraft ? "#e8ecf2" : "#8a93a3");
    this.mask(nameText);
    // Hotkey badge for ability-granting designs — the one thing the list was
    // missing that made Q/E/R planning possible.
    const hotkey = this.abilityKeyLabel(recipe.output);
    if (hotkey) {
      const bx = x + 52 + nameText.width + 8;
      const badge = this.scene.add
        .rectangle(bx, y + 10, 20, 18, 0x2a2333, 0.95)
        .setOrigin(0, 0)
        .setStrokeStyle(1, 0xc9a86a)
        .setScrollFactor(0)
        .setDepth(DEPTH_ITEM);
      this.mask(badge);
      this.rows.push(badge);
      this.mask(this.addText(bx + 10, y + 12, hotkey, 12, "#e8c98a", 0.5, 0));
    }

    const parts = Object.entries(recipe.inputs).map(([key, need]) => {
      const have = this.deps.backpack.count(key);
      const name = itemDef(key)?.name ?? key;
      return { text: `${name} ${have}/${need}`, ok: have >= need };
    });
    let ix = x + 52;
    const iy = y + 32;
    for (const p of parts) {
      const t = this.scene.add
        .text(ix, iy, p.text, { fontFamily: "monospace", fontSize: "13px", color: p.ok ? "#8fe38f" : "#e08a8a" })
        .setScrollFactor(0)
        .setDepth(DEPTH_TEXT);
      this.mask(t);
      this.rows.push(t);
      ix += t.width + 14;
    }

    const effect = this.effectLine(recipe.output);
    if (effect) this.mask(this.addText(x + 52, y + 50, effect, 11, "#c9a86a"));
  }

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
      this.addText(x + 12, y + FOOTER_H / 2 - 14, "Select a design above to craft it.", 12, "#8a93a3");
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
    const canCraft = maxBatch >= 1 && !this.busy;
    const btn = this.scene.add
      .text(btnX, btnY, this.busy ? "Crafting…" : stackable ? `Craft x${batch}` : "Craft", {
        fontFamily: "monospace",
        fontSize: "16px",
        color: canCraft ? "#0a0a0a" : "#4a4a4a",
        backgroundColor: canCraft ? "#8fe38f" : "#2a2a2a",
        padding: { x: 12, y: 6 },
      })
      .setScrollFactor(0)
      .setDepth(DEPTH_TEXT)
      .setInteractive({ useHandCursor: canCraft })
      .on("pointerdown", () => {
        if (!canCraft) return;
        this.busy = true;
        this.progressBar.setPosition(btnX, btnY).setSize(96, 28).start(CRAFT_BAR_MS, {
          onComplete: () => {
            this.busy = false;
            this.deps.craft(recipe.id, batch);
            this.batchAmount = 1;
            if (this.open) this.render();
          },
        });
        this.render();
      });
    this.rows.push(btn);

    if (this.busy) this.progressBar.setPosition(btnX, btnY).setVisible(true);
  }

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
