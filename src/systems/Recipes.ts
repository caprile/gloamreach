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
  // count defaults to 1 when absent — set for batch crafts (e.g. a handful
  // of pellets per craft) so a stackable's per-click output isn't always 1.
  | { kind: "item"; itemId: string; itemName: string; count?: number };

export interface Recipe {
  id: string;
  name: string;
  description: string;
  category: RecipeCategory;
  // Tier 0 recipes are craftable anywhere. Tier 1+ requires proximity to a
  // placed Workbench — see MainScene.isNearWorkbench / CraftingMenuDeps.
  tier: number;
  costs: Partial<Record<ResourceType, number>>;
  // ALL entries must be met to craft. Multiple allowed for future weapons
  // gated on more than one skill (e.g. "5 Slash + 5 Pierce").
  requiredSkills?: { skill: SkillType; level: number }[];
  // Extra discovery gate beyond "ingredients known": recipe IDs (of OTHER
  // recipes' output items) that must already be discovered. Used for a
  // recipe whose own ingredients are common but that only makes sense once
  // some other item exists (e.g. Slingshot Pellets shouldn't appear before
  // the player has crafted a Slingshot to use them with).
  requiresDiscovered?: string[];
  output: RecipeOutput;
}

export const RECIPES: Recipe[] = [
  {
    id: "stone_axe",
    name: "Woodcutter's Axe",
    description: "A crude axe for chopping trees.",
    category: "tools",
    tier: 0,
    costs: { wood: 4, stone: 4 },
    requiredSkills: [{ skill: "chopping", level: 0 }],
    output: { kind: "tool", tool: "stone_axe" },
  },
  {
    id: "stone_pickaxe",
    name: "Stone Pickaxe",
    description: "A crude pickaxe for mining boulders.",
    category: "tools",
    tier: 1,
    costs: { wood: 3, stone: 4, leather: 1 },
    requiredSkills: [{ skill: "mining", level: 0 }],
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
    // Blunt 3 is reachable "for free" just from swinging the starting Wood
    // Club (also blunt) — an early gate, not a grind wall.
    requiredSkills: [{ skill: "blunt", level: 3 }],
    output: { kind: "item", itemId: "stone_club", itemName: "Stone Club" },
  },
  {
    id: "bone_knife",
    name: "Bone Knife",
    description: "A quick blade honed from a sharpened bone.",
    category: "weapons",
    tier: 1,
    costs: { leather: 1, bones: 4 },
    output: { kind: "item", itemId: "bone_knife", itemName: "Bone Knife" },
  },
  {
    id: "primal_spear",
    name: "Primal Spear",
    description: "A wood-and-bone spear built for a heavier, slower strike.",
    category: "weapons",
    tier: 1,
    costs: { wood: 4, stone: 2, leather: 1 },
    output: { kind: "item", itemId: "primal_spear", itemName: "Primal Spear" },
  },
  {
    id: "slingshot",
    name: "Slingshot",
    description: "A simple ranged launcher. Weak on its own — load it with pellets and lean on practice.",
    category: "weapons",
    tier: 1,
    costs: { wood: 2, leather: 2 },
    output: { kind: "item", itemId: "slingshot", itemName: "Slingshot" },
  },
  {
    id: "slingshot_pellets",
    name: "Slingshot Pellets",
    description: "A handful of rounded stones sized for a Slingshot.",
    category: "weapons",
    tier: 0,
    costs: { stone: 5 },
    // Stone is common enough that this would otherwise appear immediately —
    // gate its discovery on having actually crafted a Slingshot first, so it
    // doesn't show up before there's anything to load it into.
    requiresDiscovered: ["slingshot"],
    output: { kind: "item", itemId: "slingshot_pellets", itemName: "Slingshot Pellets", count: 25 },
  },
  {
    id: "javelin",
    name: "Javelin",
    description: "A disposable thrown spear. Hits harder than a pellet, but each throw burns one.",
    category: "weapons",
    // Bumped to tier 1 + a Pierce skill gate per playtest feedback — a free
    // starter javelin at Pierce 0 undercut the point of the (also ranged,
    // pierce-typed) Slingshot as the actual early opener.
    tier: 1,
    costs: { wood: 3, stone: 1 },
    requiredSkills: [{ skill: "pierce", level: 5 }],
    output: { kind: "item", itemId: "javelin", itemName: "Javelin", count: 2 },
  },
  {
    id: "shishkabob",
    name: "Shishkabob",
    description: "A skewer for cooking meat and vegetables over a fire.",
    category: "misc",
    tier: 0,
    costs: { wood: 1 },
    output: { kind: "item", itemId: "shishkabob", itemName: "Shishkabob", count: 2 },
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
    id: "comfort",
    name: "Bedroll",
    description: "A bedroll stuffed with reeds for cushioning. Rest near a lit campfire, away from danger, to slowly recover HP.",
    category: "crafting",
    tier: 0,
    costs: { wood: 3, cattail: 5 },
    output: { kind: "item", itemId: "comfort", itemName: "Bedroll" },
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
    requiredSkills: [{ skill: "light_armor", level: 0 }],
    output: { kind: "item", itemId: "gremlin_cap", itemName: "Gremlin Cap" },
  },
  {
    id: "gremlin_shirt",
    name: "Gremlin Shirt",
    description: "A tough shirt of cured gremlin leather reinforced with bone.",
    category: "armor",
    tier: 1,
    costs: { gremlin_leather: 3, leather: 1, bones: 5 },
    requiredSkills: [{ skill: "light_armor", level: 0 }],
    output: { kind: "item", itemId: "gremlin_shirt", itemName: "Gremlin Shirt" },
  },
  {
    id: "gremlin_pants",
    name: "Gremlin Pants",
    description: "Leg wraps of cured gremlin leather and scrap hide.",
    category: "armor",
    tier: 1,
    costs: { gremlin_leather: 2, leather: 2, blackberry: 1 },
    requiredSkills: [{ skill: "light_armor", level: 0 }],
    output: { kind: "item", itemId: "gremlin_pants", itemName: "Gremlin Pants" },
  },
  {
    id: "relic_forge",
    name: "Relic Forge",
    description:
      "A stone plinth that binds monster trophies into relics. Feed it a trophy to roll a random relic, or spend Gloam Shards to refine trophies into rarer ones.",
    category: "crafting",
    // Tier 1 (Workbench-gated) like the Drying Rack. Requiring a trophy to
    // build gates it behind the same elite kills that fuel it, and keys its
    // discovery to the moment the relic loop becomes relevant.
    tier: 1,
    costs: { stone: 10, bones: 5, gremlin_trophy: 1 },
    output: { kind: "item", itemId: "relic_forge", itemName: "Relic Forge" },
  },
  {
    id: "gremlin_totem",
    name: "Gremlin Totem",
    description: "A grim totem bound with gremlin remains and dark bindings. Its purpose becomes clear at the Boss Altar's fire.",
    category: "misc",
    tier: 1,
    costs: { gremlin_trophy: 3, wood: 1, gremlin_guck: 1 },
    requiredSkills: [],
    output: { kind: "item", itemId: "gremlin_totem", itemName: "Gremlin Totem" },
  },
  {
    id: "tyrant_totem",
    name: "Effigy of the Duneshaper",
    description: "An effigy bound from warren fetishes and gloam shards. Offer it to a badlands altar's fire to summon the Duneshaper.",
    category: "misc",
    tier: 1,
    costs: { warren_fetish: 3, gloam_shard: 2, bones: 8 },
    requiredSkills: [],
    output: { kind: "item", itemId: "tyrant_totem", itemName: "Effigy of the Duneshaper" },
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
