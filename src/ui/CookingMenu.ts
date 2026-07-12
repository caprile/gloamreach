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
  // Tier of the campfire the menu is currently bound to (null when closed).
  campfireTier: () => number | null;
  // Cook `batches` of `recipeId` in one call — consumes its inputs from the
  // backpack and deposits the food (scene handles overflow-drop). The menu
  // only asks; it doesn't move items itself.
  cook: (recipeId: string, batches: number) => void;
  // Max times `recipe` could be cooked right now (cost- and room-limited) —
  // backs the batch-quantity slider.
  maxBatches: (recipe: CookRecipe) => number;
}

const DEPTH_BG = 3000;
const DEPTH_ITEM = 3001;
const DEPTH_TEXT = 3002;
const ROW_H = 74;
const ROW_GAP = 8;

// The Campfire's cooking menu — the game's first food-production UI. Unlike the
// Drying Rack (single input + amount slider), cooking dishes are multi-
// ingredient, so this is a recipe LIST: each row shows a dish, its
// ingredients (have/need), and the buff it grants. Dishes above the
// campfire's own tier stay hidden entirely (not just locked) until the
// campfire is upgraded, matching Crafting.ts's "don't reveal locked info"
// convention.
//
// Rows are SELECTABLE rather than each having its own Cook button (playtest
// feedback: bulk-cooking was too many clicks) — clicking a row selects it,
// and a shared footer below the list shows that dish's scaled ingredient
// cost, a batch-quantity slider (when more than one batch is affordable),
// and a single Cook button that runs the whole batch behind one bar. Mirrors
// CraftingMenu's list-select-then-detail-panel shape.
//
// Self-contained (no drag/drop, no backpack grid) — a Cook click consumes
// straight from the backpack via the scene's `cook` dep. Flat scrollFactor(0)
// GameObjects (no Containers), per the note in CraftingMenu.ts.
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

  private panelX: number;
  private panelY: number;
  private panelW: number;
  private panelH: number;

  constructor(scene: Phaser.Scene, deps: CookingMenuDeps) {
    this.scene = scene;
    this.deps = deps;
    this.tooltipUI = new Tooltip(scene, deps.skills);
    this.progressBar = new ProgressBar(scene, { width: 96, height: 28, depth: DEPTH_TEXT + 3 });

    this.panelW = 520;
    this.panelH = 120 + COOK_RECIPES.length * (ROW_H + ROW_GAP) + FOOTER_H;
    this.panelX = scene.scale.width / 2 - this.panelW / 2;
    this.panelY = scene.scale.height / 2 - this.panelH / 2;

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
    this.selected = null;
    this.batchAmount = 1;
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

  private render(): void {
    this.clearRows();
    this.tooltipUI.hide();
    const tier = this.deps.campfireTier() ?? 0;
    const discovered = this.deps.discovered();

    // Only dishes this campfire's tier can actually cook are listed at all —
    // a higher-tier dish doesn't appear until the campfire is upgraded (per the
    // user: it shouldn't even be on the list until Lvl 2) — AND a dish stays
    // hidden until every ingredient has been discovered.
    const recipes = COOK_RECIPES.filter(
      (r) =>
        r.requiredCampfireTier <= tier &&
        Object.keys(r.inputs).every((key) => discovered.has(key)),
    );

    if (this.selected && !recipes.includes(this.selected)) this.selected = null;

    // Size + center the panel to the visible rows (1 at Lvl 1, 2 at Lvl 2).
    this.panelH = 70 + Math.max(1, recipes.length) * (ROW_H + ROW_GAP) + FOOTER_H;
    this.panelY = this.scene.scale.height / 2 - this.panelH / 2;
    this.bg.setPosition(this.panelX, this.panelY).setSize(this.panelW, this.panelH);

    this.addText(this.panelX + 16, this.panelY + 14, stationDisplayName("campfire", tier), 16, "#ffffff");
    this.addText(
      this.panelX + 16,
      this.panelY + 40,
      "Cook meat and vegetables into food. Right-click a dish in your bag to eat it.",
      11,
      "#8a93a3",
    );

    if (recipes.length === 0) {
      this.addText(
        this.panelX + 16,
        this.panelY + 74,
        "No dishes known yet — gather their ingredients first.",
        12,
        "#8a93a3",
      );
      return;
    }

    let y = this.panelY + 70;
    for (const recipe of recipes) {
      this.renderRow(recipe, y);
      y += ROW_H + ROW_GAP;
    }

    this.renderFooter(y + 6);
  }

  private renderRow(recipe: CookRecipe, y: number): void {
    const x = this.panelX + 16;
    const rowW = this.panelW - 32;
    const canCook = canAffordCook(recipe, this.deps.backpack);
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
      this.rows.push(icon);
    }

    this.addText(x + 52, y + 10, recipe.name, 14, canCook ? "#e8ecf2" : "#8a93a3");

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
      this.rows.push(t);
      ix += t.width + 14;
    }

    if (def?.edible) {
      this.addText(
        x + 52,
        y + 50,
        `+${def.edible.hpPerSec} HP/s for ${Math.round(def.edible.durationMs / 1000)}s`,
        11,
        "#c9a86a",
      );
    }
  }

  // Shared footer for the currently-selected dish: scaled ingredient cost,
  // a batch slider (when more than 1 is affordable), and one Cook button
  // that cooks the whole selected batch behind a single bar.
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
    this.addText(x + 12, y + 8, `${recipe.name} — ${costParts}`, 12, "#c8d0dc");

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
      .setDepth(DEPTH_TEXT);
    this.rows.push(t);
  }
}
