import type { ItemContainer } from "./ItemContainer";

// Cooking recipes — the first food/consumable production, done at a placed
// Campfire. Deliberately its OWN small table rather than a RecipeCategory in
// Recipes.ts: cooking is a station interaction (you open the campfire, pick a
// dish, Cook), not a generic craft, and keeping it separate leaves room for a
// dedicated cooking station later. Multi-ingredient (unlike the single-input
// Drying Rack), so it can't reuse Processing.ts's slider model — the CookingMenu
// consumes inputs straight from the backpack via ItemContainer.removeCount, the
// same primitive Crafting.craft() uses.
//
// `requiredCampfireTier` gates a dish on the campfire's own upgrade tier (0 = any
// campfire; 1 = a Lvl 2 / "Stone Hearth"-upgraded campfire — see
// StationUpgrades.ts). Higher-tier dishes stay visible-but-locked so the player
// can see what upgrading unlocks.
export interface CookRecipe {
  id: string;
  name: string;
  output: string; // item key produced (an `edible` ItemDef)
  inputs: Record<string, number>;
  requiredCampfireTier: number;
}

export const COOK_RECIPES: CookRecipe[] = [
  {
    id: "cooked_boar_meat",
    name: "Cooked Boar Meat",
    output: "cooked_boar_meat",
    inputs: { shishkabob: 1, boar_meat: 1 },
    requiredCampfireTier: 0,
  },
  {
    id: "bramble_boar_skewer",
    name: "Bramble-Glazed Boar Skewer",
    output: "bramble_boar_skewer",
    inputs: { shishkabob: 1, boar_meat: 1, blackberry: 2 },
    requiredCampfireTier: 1,
  },
  {
    id: "cooked_snake_meat",
    name: "Cooked Snake Meat",
    output: "cooked_snake_meat",
    inputs: { shishkabob: 1, snake_meat: 1 },
    requiredCampfireTier: 0,
  },
  {
    id: "blood_snake_skewer",
    name: "Blood-Glazed Snake Skewer",
    output: "blood_snake_skewer",
    inputs: { shishkabob: 1, snake_meat: 1, gremlin_blood: 1 },
    requiredCampfireTier: 1,
  },
];

export function canAffordCook(recipe: CookRecipe, backpack: ItemContainer): boolean {
  return Object.entries(recipe.inputs).every(([key, n]) => backpack.count(key) >= n);
}
