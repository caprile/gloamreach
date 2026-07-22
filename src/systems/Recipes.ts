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
  // Extra proximity gate (biome 2 Phase 4): the nearby Workbench must itself
  // have reached at least this upgrade tier (0-based, matching
  // StationUpgradeDef.resultTier). Forged gear needs a Lvl 3 Workbench
  // (requiresWorkbenchTier: 2); the enhanced/T2 tier needs Lvl 4 (tier 3).
  // Absent = any placed Workbench satisfies a tier-1 recipe as before.
  requiresWorkbenchTier?: number;
  // Keyed by ANY inventory item key, not just raw ResourceType — the enhanced
  // (T2) reforge recipes consume a crafted base piece (e.g. sunsteel_helm) as
  // an ingredient. All cost lookups go through the backpack's string-keyed
  // count()/removeCount() + the discovered set, so a crafted-item key works as
  // a cost with no extra handling; a base piece must simply be UNEQUIPPED (in
  // the backpack) to reforge.
  costs: Partial<Record<string, number>>;
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
    costs: { wood: 4, stone: 3 },
    requiredSkills: [{ skill: "chopping", level: 0 }],
    output: { kind: "tool", tool: "stone_axe" },
  },
  {
    id: "stone_pickaxe",
    name: "Stone Pickaxe",
    description: "A crude pickaxe for mining boulders.",
    category: "tools",
    tier: 1,
    costs: { wood: 3, stone: 3, leather: 1 },
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
    costs: { stone: 3 },
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
    costs: { wood: 5, stone: 2 },
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
    id: "smelter",
    name: "Smelter",
    description: "A clay kiln for melting ore into ingots. Needs ore plus a Hexling's hex essence for the heat.",
    category: "crafting",
    // Tier 1 (Workbench-gated) like the Drying Rack. No King drop — basic
    // smelting is available without ever fighting the Gremlin King (locked).
    tier: 1,
    costs: { clay: 10, stone: 10 },
    output: { kind: "item", itemId: "smelter", itemName: "Smelter" },
  },
  {
    // Biome-3 Phase 2b: the dedicated jewelry station. Tier 1 (Workbench-gated)
    // like the Smelter. Costs moonsilver (a biome-3 material with no source yet),
    // so it's dormant/dev-testable until biome 3 — its jewelry recipes live in
    // Jewelry.ts (its own menu), not here.
    id: "jewelry_station",
    name: "Gemwright's Table",
    description: "A jeweler's bench for setting gems into rings and amulets. Needs moonsilver to build.",
    category: "crafting",
    tier: 1,
    costs: { moonsilver: 4, stone: 10 },
    output: { kind: "item", itemId: "jewelry_station", itemName: "Gemwright's Table" },
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
    costs: { stone: 7, bones: 5, gremlin_trophy: 1 },
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
    description: "An effigy bound from Gloam-Bone Totems and gloam shards. Offer it to a badlands altar's fire to summon the Duneshaper.",
    category: "misc",
    tier: 1,
    costs: { warren_fetish: 3, gloam_shard: 2, bones: 8 },
    requiredSkills: [],
    output: { kind: "item", itemId: "tyrant_totem", itemName: "Effigy of the Duneshaper" },
  },

  // --- forged HEAVY armor: Sunsteel set (biome 2 Phase 4, Workbench Lvl 3) ---
  {
    id: "sunsteel_helm",
    name: "Sunsteel Helm",
    description: "A forged steel helm. Heavy protection, forged at an upgraded Workbench.",
    category: "armor",
    tier: 1,
    requiresWorkbenchTier: 2,
    costs: { sunsteel_ingot: 2, cragscale_plate: 2 },
    requiredSkills: [{ skill: "heavy_armor", level: 0 }],
    output: { kind: "item", itemId: "sunsteel_helm", itemName: "Sunsteel Helm" },
  },
  {
    id: "sunsteel_cuirass",
    name: "Sunsteel Cuirass",
    description: "A forged steel breastplate — the sturdiest Sunsteel armor.",
    category: "armor",
    tier: 1,
    requiresWorkbenchTier: 2,
    costs: { sunsteel_ingot: 4, cragscale_plate: 4, bones: 5 },
    requiredSkills: [{ skill: "heavy_armor", level: 0 }],
    output: { kind: "item", itemId: "sunsteel_cuirass", itemName: "Sunsteel Cuirass" },
  },
  {
    id: "sunsteel_greaves",
    name: "Sunsteel Greaves",
    description: "Forged steel leg plates lined with sandmaw chitin.",
    category: "armor",
    tier: 1,
    requiresWorkbenchTier: 2,
    costs: { sunsteel_ingot: 2, cragscale_plate: 2, sandmaw_chitin: 2 },
    requiredSkills: [{ skill: "heavy_armor", level: 0 }],
    output: { kind: "item", itemId: "sunsteel_greaves", itemName: "Sunsteel Greaves" },
  },

  // --- forged LIGHT armor: Duskhide set (biome 2 Phase 4, Workbench Lvl 3) ---
  // Duskhide is the badlands' "no forge required" light path — crafted purely
  // from beast drops (pelt / chitin / bone), zero metal, so a light build never
  // has to smelt (S1 rebalance). Its base total (13) matches a fully-upgraded
  // Gremlin (Lvl 3) set, then reforges into Emberhide.
  {
    id: "duskhide_hood",
    name: "Duskhide Hood",
    description: "A light hood of tanned duskrunner hide bound with chitin.",
    category: "armor",
    tier: 1,
    requiresWorkbenchTier: 2,
    costs: { duskrunner_pelt: 4, sandmaw_chitin: 1 },
    requiredSkills: [{ skill: "light_armor", level: 0 }],
    output: { kind: "item", itemId: "duskhide_hood", itemName: "Duskhide Hood" },
  },
  {
    id: "duskhide_vest",
    name: "Duskhide Vest",
    description: "A layered duskrunner-hide vest reinforced with bone and chitin.",
    category: "armor",
    tier: 1,
    requiresWorkbenchTier: 2,
    costs: { duskrunner_pelt: 6, bones: 3, sandmaw_chitin: 2 },
    requiredSkills: [{ skill: "light_armor", level: 0 }],
    output: { kind: "item", itemId: "duskhide_vest", itemName: "Duskhide Vest" },
  },
  {
    id: "duskhide_leggings",
    name: "Duskhide Leggings",
    description: "Duskrunner-hide leggings reinforced with sandmaw chitin.",
    category: "armor",
    tier: 1,
    requiresWorkbenchTier: 2,
    costs: { duskrunner_pelt: 4, sandmaw_chitin: 2 },
    requiredSkills: [{ skill: "light_armor", level: 0 }],
    output: { kind: "item", itemId: "duskhide_leggings", itemName: "Duskhide Leggings" },
  },

  // --- forged weapons: one per melee damage type (biome 2 Phase 4, Workbench Lvl 3) ---
  {
    id: "sunsteel_warhammer",
    name: "Sunsteel Warhammer",
    description: "A massive forged maul with a wide, crushing arc.",
    category: "weapons",
    tier: 1,
    requiresWorkbenchTier: 2,
    costs: { sunsteel_ingot: 4, cragscale_plate: 2, wood: 4 },
    requiredSkills: [{ skill: "blunt", level: 3 }],
    output: { kind: "item", itemId: "sunsteel_warhammer", itemName: "Sunsteel Warhammer" },
  },
  {
    id: "sunsteel_sword",
    name: "Sunsteel Longsword",
    description: "A keen forged blade for quick, cutting strikes.",
    category: "weapons",
    tier: 1,
    requiresWorkbenchTier: 2,
    costs: { sunsteel_ingot: 3, wood: 2 },
    requiredSkills: [{ skill: "slash", level: 3 }],
    output: { kind: "item", itemId: "sunsteel_sword", itemName: "Sunsteel Longsword" },
  },
  {
    id: "sunsteel_pike",
    name: "Sunsteel Pike",
    description: "A long forged spear with reach and a punishing thrust.",
    category: "weapons",
    tier: 1,
    requiresWorkbenchTier: 2,
    costs: { sunsteel_ingot: 3, wood: 3 },
    requiredSkills: [{ skill: "pierce", level: 3 }],
    output: { kind: "item", itemId: "sunsteel_pike", itemName: "Sunsteel Pike" },
  },
  {
    id: "sunsteel_warbow",
    name: "Sunsteel Warbow",
    description: "A forged badlands bow — outranges and out-hits the Slingshot. Feed it Arrows from the backpack.",
    category: "weapons",
    tier: 1,
    requiresWorkbenchTier: 2,
    costs: { sunsteel_ingot: 2, ironbark: 3, duskrunner_pelt: 2 },
    // Ranged 0 = categorization only (routes ranged-skill XP) — no chicken-and-egg
    // gate, since you can't grind Ranged past 0 without a launcher.
    requiredSkills: [{ skill: "ranged", level: 0 }],
    output: { kind: "item", itemId: "sunsteel_warbow", itemName: "Sunsteel Warbow" },
  },
  {
    id: "arrows",
    name: "Arrows",
    description: "A bundle of metal-tipped arrows for a Warbow, forged from a Sunsteel Ingot.",
    category: "weapons",
    tier: 1,
    requiresWorkbenchTier: 2,
    // Gate discovery on owning a Warbow first, like Slingshot Pellets → Slingshot.
    requiresDiscovered: ["sunsteel_warbow"],
    costs: { sunsteel_ingot: 1, wood: 5 },
    output: { kind: "item", itemId: "arrows", itemName: "Arrows", count: 50 },
  },
  {
    id: "arrows_embersteel",
    name: "Arrows (Embersteel)",
    description: "The same Warbow arrows, forged from an Embersteel Ingot instead — for when Sunsteel is short.",
    category: "weapons",
    tier: 1,
    requiresWorkbenchTier: 3,
    requiresDiscovered: ["sunsteel_warbow"],
    costs: { embersteel_ingot: 1, wood: 5 },
    output: { kind: "item", itemId: "arrows", itemName: "Arrows", count: 50 },
  },

  // === enhanced / T2 tier (biome 2 Phase 4 Session 2, Workbench Lvl 4) ===
  // Each REFORGES its base forged piece — the base item is consumed as an
  // ingredient (must be in the backpack, not equipped). All gate
  // requiresWorkbenchTier: 3 (an Emberforge-Anvil Workbench) and are only
  // DISCOVERED once both the base piece and Embersteel Ingot have been made.

  // --- enhanced HEAVY armor: Embersteel set ---
  {
    id: "embersteel_helm",
    name: "Embersteel Helm",
    description: "Reforge a Sunsteel Helm with ember-steel for far heavier protection.",
    category: "armor",
    tier: 1,
    requiresWorkbenchTier: 3,
    costs: { sunsteel_helm: 1, embersteel_ingot: 2, cragscale_plate: 2, hex_essence: 1 },
    requiredSkills: [{ skill: "heavy_armor", level: 0 }],
    output: { kind: "item", itemId: "embersteel_helm", itemName: "Embersteel Helm" },
  },
  {
    id: "embersteel_cuirass",
    name: "Embersteel Cuirass",
    description: "Reforge a Sunsteel Cuirass with ember-steel — the sturdiest armor in the badlands.",
    category: "armor",
    tier: 1,
    requiresWorkbenchTier: 3,
    costs: { sunsteel_cuirass: 1, embersteel_ingot: 4, cragscale_plate: 3, bones: 4, hex_essence: 2 },
    requiredSkills: [{ skill: "heavy_armor", level: 0 }],
    output: { kind: "item", itemId: "embersteel_cuirass", itemName: "Embersteel Cuirass" },
  },
  {
    id: "embersteel_greaves",
    name: "Embersteel Greaves",
    description: "Reforge Sunsteel Greaves with ember-steel over a chitin lining.",
    category: "armor",
    tier: 1,
    requiresWorkbenchTier: 3,
    costs: { sunsteel_greaves: 1, embersteel_ingot: 2, sandmaw_chitin: 2, cragscale_plate: 2, hex_essence: 1 },
    requiredSkills: [{ skill: "heavy_armor", level: 0 }],
    output: { kind: "item", itemId: "embersteel_greaves", itemName: "Embersteel Greaves" },
  },

  // --- enhanced LIGHT armor: Emberhide set ---
  {
    id: "emberhide_hood",
    name: "Emberhide Hood",
    description: "Reforge a Duskhide Hood with ember-steel banding — light, but far tougher.",
    category: "armor",
    tier: 1,
    requiresWorkbenchTier: 3,
    costs: { duskhide_hood: 1, embersteel_ingot: 1, duskrunner_pelt: 2, sandmaw_chitin: 1, hex_essence: 1 },
    requiredSkills: [{ skill: "light_armor", level: 0 }],
    output: { kind: "item", itemId: "emberhide_hood", itemName: "Emberhide Hood" },
  },
  {
    id: "emberhide_vest",
    name: "Emberhide Vest",
    description: "Reforge a Duskhide Vest with ember-steel seams — plate-grade protection, feather weight.",
    category: "armor",
    tier: 1,
    requiresWorkbenchTier: 3,
    costs: { duskhide_vest: 1, embersteel_ingot: 2, duskrunner_pelt: 3, sandmaw_chitin: 2, bones: 3, hex_essence: 1 },
    requiredSkills: [{ skill: "light_armor", level: 0 }],
    output: { kind: "item", itemId: "emberhide_vest", itemName: "Emberhide Vest" },
  },
  {
    id: "emberhide_leggings",
    name: "Emberhide Leggings",
    description: "Reforge Duskhide Leggings with ember-steel plates.",
    category: "armor",
    tier: 1,
    requiresWorkbenchTier: 3,
    costs: { duskhide_leggings: 1, embersteel_ingot: 1, sandmaw_chitin: 1, duskrunner_pelt: 2, hex_essence: 1 },
    requiredSkills: [{ skill: "light_armor", level: 0 }],
    output: { kind: "item", itemId: "emberhide_leggings", itemName: "Emberhide Leggings" },
  },

  // --- enhanced weapons: reforge each base forged weapon ---
  {
    id: "embersteel_warhammer",
    name: "Embersteel Warhammer",
    description: "Reforge a Sunsteel Warhammer onto a heavy ironbark haft and ember-steel head for a wider crush.",
    category: "weapons",
    tier: 1,
    requiresWorkbenchTier: 3,
    costs: { sunsteel_warhammer: 1, embersteel_ingot: 3, ironbark: 4, cragscale_plate: 2, hex_essence: 2 },
    requiredSkills: [{ skill: "blunt", level: 3 }],
    output: { kind: "item", itemId: "embersteel_warhammer", itemName: "Embersteel Warhammer" },
  },
  {
    id: "embersteel_sword",
    name: "Embersteel Longsword",
    description: "Reforge a Sunsteel Longsword with ember-steel for a keener, deadlier edge.",
    category: "weapons",
    tier: 1,
    requiresWorkbenchTier: 3,
    costs: { sunsteel_sword: 1, embersteel_ingot: 2, ironbark: 2, sandmaw_chitin: 2, hex_essence: 2 },
    requiredSkills: [{ skill: "slash", level: 3 }],
    output: { kind: "item", itemId: "embersteel_sword", itemName: "Embersteel Longsword" },
  },
  {
    id: "embersteel_pike",
    name: "Embersteel Pike",
    description: "Reforge a Sunsteel Pike onto a long ironbark shaft for a thrust that punches through plate.",
    category: "weapons",
    tier: 1,
    requiresWorkbenchTier: 3,
    costs: { sunsteel_pike: 1, embersteel_ingot: 2, ironbark: 3, cragscale_plate: 2, hex_essence: 2 },
    requiredSkills: [{ skill: "pierce", level: 3 }],
    output: { kind: "item", itemId: "embersteel_pike", itemName: "Embersteel Pike" },
  },
  {
    id: "embersteel_warbow",
    name: "Embersteel Warbow",
    description: "Reforge a Sunsteel Warbow onto an ironbark stave with ember-steel limbs — longer reach and a heavier draw.",
    category: "weapons",
    tier: 1,
    requiresWorkbenchTier: 3,
    costs: { sunsteel_warbow: 1, embersteel_ingot: 3, ironbark: 3, duskrunner_pelt: 2, hex_essence: 2 },
    requiredSkills: [{ skill: "ranged", level: 0 }],
    output: { kind: "item", itemId: "embersteel_warbow", itemName: "Embersteel Warbow" },
  },

  // --- the first MAGIC weapon: Ember Brand (rare-ore exclusive) ---
  {
    id: "ember_brand",
    name: "Ember Brand",
    description: "A fire-brand forged from ember-steel and bound hex essence. Its strikes land as raw magic.",
    category: "weapons",
    tier: 1,
    requiresWorkbenchTier: 3,
    costs: { embersteel_ingot: 3, hex_essence: 4, ironbark: 2 },
    // Categorization only (Magic 0) — you can't grind Magic XP before owning a
    // magic weapon, so this can't gate on its own skill.
    requiredSkills: [{ skill: "magic", level: 0 }],
    output: { kind: "item", itemId: "ember_brand", itemName: "Ember Brand" },
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
