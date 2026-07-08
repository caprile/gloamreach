import type { ResourceType } from "./Inventory";
import type { ToolType } from "../entities/ResourceNode";
import type { SkillType } from "./Skills";
import { itemDef } from "./Items";

// Tabs in the crafting sidebar. More will be added as content grows.
export type RecipeCategory = "tools" | "weapons" | "armor" | "crafting" | "misc";

// What crafting a recipe produces. Tools plug into the existing
// equip/unequip flow; everything else is just a counted inventory item
// until building/cooking/combat systems exist to use them.
export type RecipeOutput =
  | { kind: "tool"; tool: ToolType }
  | { kind: "item"; itemId: string; itemName: string };

export interface Recipe {
  id: string;
  name: string;
  description: string;
  category: RecipeCategory;
  // Tier 0 recipes are craftable anywhere. Tier 1+ requires proximity to a
  // placed Workbench — see MainScene.isNearWorkbench / CraftingMenuDeps.
  tier: number;
  costs: Partial<Record<ResourceType, number>>;
  requiredSkill?: { skill: SkillType; level: number };
  output: RecipeOutput;
}

export const RECIPES: Recipe[] = [
  {
    id: "stone_axe",
    name: "Stone Axe",
    description: "A crude axe for chopping trees.",
    category: "tools",
    tier: 0,
    costs: { wood: 4, stone: 4 },
    requiredSkill: { skill: "axes", level: 0 },
    output: { kind: "tool", tool: "stone_axe" },
  },
  {
    id: "stone_pickaxe",
    name: "Stone Pickaxe",
    description: "A crude pickaxe for mining boulders.",
    category: "tools",
    tier: 1,
    costs: { wood: 3, stone: 4, leather: 1 },
    requiredSkill: { skill: "pickaxes", level: 0 },
    output: { kind: "tool", tool: "stone_pickaxe" },
  },
  {
    id: "torch",
    name: "Torch",
    description: "A handheld light source.",
    category: "tools",
    tier: 0,
    costs: { wood: 1 },
    output: { kind: "item", itemId: "torch", itemName: "Torch" },
  },
  {
    id: "wood_club",
    name: "Wood Club",
    description: "A simple bat for bashing things.",
    category: "weapons",
    tier: 0,
    costs: { wood: 4 },
    output: { kind: "item", itemId: "wood_club", itemName: "Wood Club" },
  },
  {
    id: "stone_club",
    name: "Stone Club",
    description: "A heavier club with a stone head.",
    category: "weapons",
    tier: 1,
    costs: { wood: 3, stone: 2, leather: 1 },
    output: { kind: "item", itemId: "stone_club", itemName: "Stone Club" },
  },
  {
    id: "shishkabob",
    name: "Shishkabob",
    description: "A skewer for cooking meat and vegetables over a fire.",
    category: "misc",
    tier: 0,
    costs: { wood: 1 },
    output: { kind: "item", itemId: "shishkabob", itemName: "Shishkabob" },
  },
  {
    id: "campfire",
    name: "Campfire",
    description: "A placeable fire for light, warmth, and cooking.",
    category: "crafting",
    tier: 0,
    costs: { wood: 5, stone: 3 },
    output: { kind: "item", itemId: "campfire", itemName: "Campfire" },
  },
  {
    id: "workbench",
    name: "Workbench",
    description: "A placeable bench required for more advanced recipes.",
    category: "crafting",
    tier: 0,
    costs: { wood: 10 },
    output: { kind: "item", itemId: "workbench", itemName: "Workbench" },
  },
  {
    id: "drying_rack",
    name: "Drying Rack",
    description: "A placeable rack that dries raw goods into refined materials on demand.",
    category: "crafting",
    tier: 1,
    costs: { wood: 5, leather: 4, bones: 2 },
    output: { kind: "item", itemId: "drying_rack", itemName: "Drying Rack" },
  },
  {
    id: "gremlin_cap",
    name: "Gremlin Cap",
    description: "A light cap stitched from cured gremlin leather.",
    category: "armor",
    tier: 1,
    costs: { gremlin_leather: 1, blackberry: 5 },
    output: { kind: "item", itemId: "gremlin_cap", itemName: "Gremlin Cap" },
  },
  {
    id: "gremlin_shirt",
    name: "Gremlin Shirt",
    description: "A tough shirt of cured gremlin leather reinforced with bone.",
    category: "armor",
    tier: 1,
    costs: { gremlin_leather: 3, leather: 1, bones: 5 },
    output: { kind: "item", itemId: "gremlin_shirt", itemName: "Gremlin Shirt" },
  },
  {
    id: "gremlin_pants",
    name: "Gremlin Pants",
    description: "Leg wraps of cured gremlin leather and scrap hide.",
    category: "armor",
    tier: 1,
    costs: { gremlin_leather: 2, leather: 2, blackberry: 1 },
    output: { kind: "item", itemId: "gremlin_pants", itemName: "Gremlin Pants" },
  },
];

export function itemNameFor(itemId: string): string | undefined {
  const recipe = RECIPES.find((r) => r.output.kind === "item" && r.output.itemId === itemId);
  return recipe?.output.kind === "item" ? recipe.output.itemName : undefined;
}

// The item key a recipe produces (tool type or item id) — doubles as the
// ItemDef/ItemContainer key for that recipe's output.
export function outputKey(recipe: Recipe): string {
  return recipe.output.kind === "tool" ? recipe.output.tool : recipe.output.itemId;
}

// True for recipes whose output should be placed in the world (via placement
// mode) instead of landing in the backpack.
export function isPlaceableRecipe(recipe: Recipe): boolean {
  return recipe.output.kind === "item" && !!itemDef(recipe.output.itemId)?.placeable;
}
