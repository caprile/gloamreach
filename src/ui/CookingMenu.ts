import Phaser from "phaser";
import type { ItemContainer } from "../systems/ItemContainer";
import { itemDef } from "../systems/Items";
import { COOK_RECIPES, canAffordCook, type CookRecipe } from "../systems/Cooking";
import { stationDisplayName } from "../systems/StationUpgrades";
import type { Skills } from "../systems/Skills";
import { Tooltip } from "./Tooltip";

export interface CookingMenuDeps {
  backpack: ItemContainer;
  skills: Skills;
  // Tier of the campfire the menu is currently bound to (null when closed).
  campfireTier: () => number | null;
  // Cook one of `recipeId` — consumes its inputs from the backpack and deposits
  // the food (scene handles overflow-drop). The menu only asks; it doesn't move
  // items itself.
  cook: (recipeId: string) => void;
}

const DEPTH_BG = 3000;
const DEPTH_ITEM = 3001;
const DEPTH_TEXT = 3002;
const ROW_H = 74;
const ROW_GAP = 8;

// The Campfire's cooking menu — the game's first food-production UI. Unlike the
// Drying Rack (single input + amount slider), cooking dishes are multi-
// ingredient, so this is a simple recipe LIST: each row shows a dish, its
// ingredients (have/need), the buff it grants, and a Cook button. Dishes above
// the campfire's own tier stay visible but locked, so a Lvl 1 campfire still
// advertises what a Lvl 2 ("Stone Hearth") one would unlock.
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

  private panelX: number;
  private panelY: number;
  private panelW: number;
  private panelH: number;

  constructor(scene: Phaser.Scene, deps: CookingMenuDeps) {
    this.scene = scene;
    this.deps = deps;
    this.tooltipUI = new Tooltip(scene, deps.skills);

    this.panelW = 520;
    this.panelH = 120 + COOK_RECIPES.length * (ROW_H + ROW_GAP);
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
    this.bg.setVisible(true);
    this.render();
  }

  close(): void {
    if (!this.open) return;
    this.open = false;
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

  private clearRows(): void {
    for (const r of this.rows) r.destroy();
    this.rows = [];
  }

  private render(): void {
    this.clearRows();
    this.tooltipUI.hide();
    const tier = this.deps.campfireTier() ?? 0;

    // Only dishes this campfire's tier can actually cook are listed at all —
    // a higher-tier dish doesn't appear until the campfire is upgraded (per the
    // user: it shouldn't even be on the list until Lvl 2).
    const recipes = COOK_RECIPES.filter((r) => r.requiredCampfireTier <= tier);

    // Size + center the panel to the visible rows (1 at Lvl 1, 2 at Lvl 2).
    this.panelH = 70 + Math.max(1, recipes.length) * (ROW_H + ROW_GAP) + 6;
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

    let y = this.panelY + 70;
    for (const recipe of recipes) {
      this.renderRow(recipe, y);
      y += ROW_H + ROW_GAP;
    }
  }

  private renderRow(recipe: CookRecipe, y: number): void {
    const x = this.panelX + 16;
    const rowW = this.panelW - 32;
    const canCook = canAffordCook(recipe, this.deps.backpack);

    const box = this.scene.add
      .rectangle(x, y, rowW, ROW_H, 0x14181f, 0.9)
      .setOrigin(0, 0)
      .setStrokeStyle(1, 0x3a4250)
      .setScrollFactor(0)
      .setDepth(DEPTH_ITEM);
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
        .on("pointerout", () => this.tooltipUI.hide());
      this.rows.push(icon);
    }

    this.addText(x + 52, y + 10, recipe.name, 14, "#e8ecf2");

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

    const btn = this.scene.add
      .text(x + rowW - 70, y + ROW_H / 2 - 12, "Cook", {
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
        if (canCook) this.deps.cook(recipe.id);
      });
    this.rows.push(btn);
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
