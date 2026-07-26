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
  {
    // A dead-simple Lvl 2 dish (the user playtest request): just badlands meat on
    // a skewer — no herb/glaze — so duskrunner meat has an easy cook path.
    id: "duskrunner_skewer",
    name: "Duskrunner Skewer",
    output: "duskrunner_skewer",
    inputs: { shishkabob: 1, duskrunner_meat: 1 },
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

  // --- Bayou dishes (biome 3). The bayou shipped its food SOURCE in Phase 4b
  // (mirejaw_meat, "cooking recipes land later") and its harvestables in 4a,
  // but never the recipes — so the deepest biome had no food at all and every
  // player arrived there living off badlands leftovers (the user playtest: "is
  // there any food in bayou?"). These sit at the existing top campfire tier
  // rather than adding a Lvl 5: by the bayou you have a Lvl 4 fire, and the
  // gate that matters is having bayou INGREDIENTS. ---
  // All four sit behind the Mirelight Hearth (campfire Lvl 5, tier 4) rather than
  // the Emberforge tier the badlands already reaches (the user: "add a new level to
  // the campfire that unlocks the bayou food ... the bayou food shouldn't come with
  // lvl 4 campfire"). Two anchor on gator meat and two on toad legs, so neither
  // food source carries the whole menu.
  {
    id: "seared_mirejaw_tail",
    name: "Seared Mirejaw Tail",
    output: "seared_mirejaw_tail",
    inputs: { shishkabob: 1, mirejaw_meat: 1 }, // the simple one — meat on a stick, like the Duskrunner Skewer
    requiredCampfireTier: 4,
  },
  {
    id: "fireroasted_toad_legs",
    name: "Fire-Roasted Toad Legs",
    output: "fireroasted_toad_legs",
    inputs: { shishkabob: 1, blighttoad_legs: 2 }, // the toad-side simple dish
    requiredCampfireTier: 4,
  },
  {
    id: "mossbound_mirejaw",
    name: "Mossbound Mirejaw",
    output: "mossbound_mirejaw",
    inputs: { shishkabob: 1, mirejaw_meat: 1, swamp_moss: 2 }, // bayou-native, finally uses swamp moss
    requiredCampfireTier: 4,
  },
  {
    id: "mirelight_platter",
    name: "Mirelight Platter",
    output: "mirelight_platter",
    // Replaced the Lily-Gilded Feast's 2x Mirejaw Meat with toad legs — the
    // bayou's best dish no longer doubles down on the same animal.
    inputs: { shishkabob: 1, blighttoad_legs: 2, water_lily: 2, swamp_moss: 1 },
    requiredCampfireTier: 4,
  },
];

export function canAffordCook(recipe: CookRecipe, backpack: ItemContainer): boolean {
  return Object.entries(recipe.inputs).every(([key, n]) => backpack.count(key) >= n);
}
