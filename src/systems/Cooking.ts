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
// `requiredCampfireTier` gates a dish on the campfire's own level, which is now
// the COUNT of upgrades applied to it (0 = any campfire; 1 = a campfire with one
// upgrade / "Lvl 2"; 2 = "Lvl 3"; 3 = "Lvl 4" — see StationUpgrades' no-ladder
// model). The CookingMenu only lists dishes at or below the open campfire's tier
// (grouped into collapsible per-tier sections, best on top).
//
// Recipe design (the user): each tier has a biome-NATIVE "best" dish craftable
// entirely from the current biome's ingredients (so a player never has to
// backtrack a biome just to cook), plus optional MIXED dishes that spend a
// plentiful leftover from an earlier biome (boar_meat) as a minor component.
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

  // --- Lvl 3 campfire (tier 2) — badlands dishes ---
  {
    id: "seared_duskrunner_steak",
    name: "Seared Duskrunner Steak",
    output: "seared_duskrunner_steak",
    inputs: { shishkabob: 1, duskrunner_meat: 1, dustbloom: 1 }, // badlands-native best
    requiredCampfireTier: 2,
  },
  {
    id: "emberbloom_broth",
    name: "Emberbloom Broth",
    output: "emberbloom_broth",
    inputs: { emberbloom: 2, sunfruit: 1, gloamcap: 1 }, // badlands-native, meatless (no skewer)
    requiredCampfireTier: 2,
  },
  {
    id: "sunfruit_glazed_ribs",
    name: "Sunfruit-Glazed Ribs",
    output: "sunfruit_glazed_ribs",
    inputs: { shishkabob: 1, sunfruit: 2, boar_meat: 1 }, // mixed — burns leftover boar_meat
    requiredCampfireTier: 2,
  },

  // --- Lvl 4 campfire (tier 3) — richest badlands dishes ---
  {
    id: "sunscorch_feast",
    name: "Sunscorch Feast",
    output: "sunscorch_feast",
    inputs: { shishkabob: 1, duskrunner_meat: 2, gloamcap: 1, sunfruit: 1 }, // badlands-native best
    requiredCampfireTier: 3,
  },
  {
    id: "emberglazed_skewer",
    name: "Ember-Glazed Skewer",
    output: "emberglazed_skewer",
    inputs: { shishkabob: 1, duskrunner_meat: 1, emberbloom: 1, boar_meat: 1 }, // mixed — leftover boar_meat
    requiredCampfireTier: 3,
  },
];

export function canAffordCook(recipe: CookRecipe, backpack: ItemContainer): boolean {
  return Object.entries(recipe.inputs).every(([key, n]) => backpack.count(key) >= n);
}
