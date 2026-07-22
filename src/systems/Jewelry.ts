import type { ItemContainer } from "./ItemContainer";

// Jewelry recipes — Biome-3 Phase 2b. Crafted at a placed Gemwright's Table
// (its own dedicated station), NOT at the Workbench: like Cooking.ts, this is a
// station interaction with its own recipe-list menu, so it's its own small
// table rather than a RecipeCategory in Recipes.ts. Multi-ingredient
// (metal + gem), so it consumes inputs straight from the backpack via
// ItemContainer.removeCount — the same primitive Cooking/Crafting use.
//
// `requiredStationTier` gates a recipe on the Gemwright's Table's own level
// (== the COUNT of upgrades applied, the StationUpgrades no-ladder model):
//   tier 0 = base station     → PASSIVE jewelry (ability-augment / explorer rings & amulets)
//   tier 1 = Duneshaper-Heart upgrade applied → the ABILITY-granting specials (Q/E/R gear)
//
// BIOME-3 DORMANT: every input (moonsilver / the gems) is a biome-3 material
// with no in-game source yet, and the tier-1 upgrade needs the Duneshaper's
// Heart — reachable only once biome 3 demotes the Duneshaper from the win-boss.
// Authored now, sourced later; test via __dev.give.
export interface JewelryRecipe {
  id: string;
  name: string;
  output: string; // item key produced (a jewelry ItemDef)
  inputs: Record<string, number>;
  requiredStationTier: number;
}

export const JEWELRY_RECIPES: JewelryRecipe[] = [
  // --- tier 0 (base station): passive jewelry ---
  {
    id: "ring_quickening",
    name: "Ring of Quickening",
    output: "ring_quickening",
    inputs: { moonsilver: 2, gloam_shard: 2 },
    requiredStationTier: 0,
  },
  {
    id: "amulet_channeling",
    name: "Amulet of Channeling",
    output: "amulet_channeling",
    inputs: { moonsilver: 3, gloam_shard: 3 },
    requiredStationTier: 0,
  },
  {
    id: "ring_forager",
    name: "Ring of the Forager",
    output: "ring_forager",
    inputs: { moonsilver: 2, twine: 2 },
    requiredStationTier: 0,
  },
  {
    id: "amulet_farsight",
    name: "Amulet of Farsight",
    output: "amulet_farsight",
    inputs: { moonsilver: 3, gloam_shard: 2 },
    requiredStationTier: 0,
  },

  // --- tier 1 (Duneshaper's Heart upgrade): the ability-granting specials ---
  // Each ability special (existing 2a items) needs its own gem — gem source
  // dictates which active you can make.
  {
    id: "special_gloamstep_band",
    name: "Gloamstep Band",
    output: "special_gloamstep_band",
    inputs: { moonsilver: 2, gem_gloam: 1 },
    requiredStationTier: 1,
  },
  {
    id: "special_gloam_focus",
    name: "Gloam Focus",
    output: "special_gloam_focus",
    inputs: { moonsilver: 2, gem_ember: 1 },
    requiredStationTier: 1,
  },
  {
    id: "back_bloodpact_shroud",
    name: "Bloodpact Shroud",
    output: "back_bloodpact_shroud",
    inputs: { moonsilver: 3, gem_blood: 1 },
    requiredStationTier: 1,
  },
];

export function canAffordJewelry(recipe: JewelryRecipe, backpack: ItemContainer): boolean {
  return Object.entries(recipe.inputs).every(([key, n]) => backpack.count(key) >= n);
}
