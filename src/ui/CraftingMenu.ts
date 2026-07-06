import Phaser from "phaser";
import { outputKey, type Recipe, type RecipeCategory } from "../systems/Recipes";
import type { Crafting } from "../systems/Crafting";
import type { ResourceType } from "../systems/Inventory";
import type { ItemContainer } from "../systems/ItemContainer";
import { itemDef } from "../systems/Items";

const CATEGORIES: { id: RecipeCategory; label: string }[] = [
  { id: "tools", label: "Tools" },
  { id: "weapons", label: "Weapons" },
  { id: "armor", label: "Armor" },
  { id: "crafting", label: "Crafting" },
  { id: "build", label: "Build Pieces" },
];

const PANEL_W = 340;
const PANEL_H = 440;
const MARGIN_RIGHT = 16;
const MARGIN_TOP = 70; // leaves world visible above and below the panel

export interface CraftingMenuDeps {
  backpack: ItemContainer;
  crafting: Crafting;
  isOwned: (recipe: Recipe) => boolean;
  craft: (recipe: Recipe) => void;
}

// Right-side crafting panel, toggled with T, the top-right icon, or Escape
// to close. Only ever lists DISCOVERED recipes (see Crafting.ts) — locked
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
  private icon: Phaser.GameObjects.Text;
  private bg: Phaser.GameObjects.Rectangle;
  private open = false;
  private activeCategory: RecipeCategory = "tools";
  private selected: Recipe | null = null;
  private rows: Phaser.GameObjects.GameObject[] = [];

  constructor(scene: Phaser.Scene, deps: CraftingMenuDeps) {
    this.scene = scene;
    this.deps = deps;
    this.panelX = scene.scale.width - PANEL_W - MARGIN_RIGHT;
    this.panelY = MARGIN_TOP;

    this.icon = scene.add
      .text(scene.scale.width - 16, 16, "[T] Craft", {
        fontFamily: "monospace",
        fontSize: "14px",
        color: "#ffffff",
        backgroundColor: "#000000aa",
        padding: { x: 8, y: 4 },
      })
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(3000)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => this.toggle());

    this.bg = scene.add
      .rectangle(this.panelX, this.panelY, PANEL_W, PANEL_H, 0x0a0a0a, 0.93)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(3000)
      .setVisible(false);
  }

  toggle(): void {
    this.open = !this.open;
    this.bg.setVisible(this.open);
    if (this.open) this.render();
    else this.clearRows();
  }

  close(): void {
    if (this.open) this.toggle();
  }

  isOpen(): boolean {
    return this.open;
  }

  // Call after any inventory/skill/craft state change so affordability and
  // owned state stay in sync while the menu is open.
  refresh(): void {
    if (this.open) this.render();
  }

  private clearRows(): void {
    for (const r of this.rows) r.destroy();
    this.rows = [];
  }

  private render(): void {
    this.clearRows();
    const x0 = this.panelX + 12;

    let x = x0;
    const tabY = this.panelY + 12;
    for (const cat of CATEGORIES) {
      const active = cat.id === this.activeCategory;
      const t = this.scene.add
        .text(x, tabY, cat.label, {
          fontFamily: "monospace",
          fontSize: "12px",
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
      x += t.width + 8;
    }

    let y = tabY + 28;
    const recipes = this.deps.crafting
      .discoveredRecipes()
      .filter((r) => r.category === this.activeCategory)
      .sort((a, b) => {
        const aAfford = this.deps.crafting.canAfford(a, this.deps.backpack) ? 0 : 1;
        const bAfford = this.deps.crafting.canAfford(b, this.deps.backpack) ? 0 : 1;
        if (aAfford !== bAfford) return aAfford - bAfford;
        return a.name.localeCompare(b.name);
      });

    if (recipes.length === 0) {
      const t = this.scene.add.text(x0, y, "No known recipes yet.", {
        fontFamily: "monospace",
        fontSize: "13px",
        color: "#6b7280",
      });
      t.setScrollFactor(0).setDepth(3001);
      this.rows.push(t);
    }

    const iconSize = 18;
    for (const recipe of recipes) {
      const affordable = this.deps.crafting.canAfford(recipe, this.deps.backpack);
      const owned = this.deps.isOwned(recipe);
      const isSelected = this.selected?.id === recipe.id;
      const label = `${owned ? "* " : ""}${recipe.name}`;
      const selectRecipe = () => {
        this.selected = recipe;
        this.render();
      };

      const texture = itemDef(outputKey(recipe))?.texture;
      if (texture) {
        const icon = this.scene.add
          .image(x0 + iconSize / 2, y + iconSize / 2 + 1, texture)
          .setDisplaySize(iconSize, iconSize)
          .setScrollFactor(0)
          .setDepth(3001)
          .setInteractive({ useHandCursor: true })
          .on("pointerdown", selectRecipe);
        this.rows.push(icon);
      }

      const t = this.scene.add
        .text(x0 + iconSize + 6, y, label, {
          fontFamily: "monospace",
          fontSize: "14px",
          color: isSelected ? "#ffe08a" : affordable ? "#ffffff" : "#5b6472",
          backgroundColor: isSelected ? "#20242e" : undefined,
          padding: { x: 4, y: 2 },
        })
        .setScrollFactor(0)
        .setDepth(3001)
        .setInteractive({ useHandCursor: true })
        .on("pointerdown", selectRecipe);
      this.rows.push(t);
      y += 22;
    }

    y += 12;
    if (this.selected && this.selected.category === this.activeCategory) {
      this.renderDetail(this.selected, x0, y);
    }
  }

  private renderDetail(recipe: Recipe, x0: number, startY: number): void {
    let y = startY;

    const desc = this.scene.add.text(x0, y, recipe.description, {
      fontFamily: "monospace",
      fontSize: "12px",
      color: "#c8d0dc",
      wordWrap: { width: PANEL_W - 24 },
    });
    desc.setScrollFactor(0).setDepth(3001);
    this.rows.push(desc);
    y += desc.height + 8;

    for (const [resource, amount] of Object.entries(recipe.costs) as [ResourceType, number][]) {
      const have = this.deps.backpack.count(resource);
      const t = this.scene.add.text(x0, y, `${resource}: ${have}/${amount}`, {
        fontFamily: "monospace",
        fontSize: "13px",
        color: have >= amount ? "#8fe38f" : "#e38f8f",
      });
      t.setScrollFactor(0).setDepth(3001);
      this.rows.push(t);
      y += 18;
    }
    y += 8;

    const affordable = this.deps.crafting.canAfford(recipe, this.deps.backpack);
    const btn = this.scene.add
      .text(x0, y, "Craft", {
        fontFamily: "monospace",
        fontSize: "14px",
        color: affordable ? "#0a0a0a" : "#4a4a4a",
        backgroundColor: affordable ? "#8fe38f" : "#2a2a2a",
        padding: { x: 10, y: 5 },
      })
      .setScrollFactor(0)
      .setDepth(3001)
      .setInteractive({ useHandCursor: affordable })
      .on("pointerdown", () => {
        if (!affordable) return;
        this.deps.craft(recipe);
        this.render();
      });
    this.rows.push(btn);
  }
}
