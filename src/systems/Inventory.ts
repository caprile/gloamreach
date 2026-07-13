// The raw resource types. These are now also regular inventory item keys
// (see Items.ts) held as stacks in the backpack ItemContainer — the old
// count-based `Inventory` class was replaced by that unified model. This type
// still names the crafting-ingredient/resource keys used across recipes,
// resource nodes, and drops. "leather" drops from Snake. "boar_meat" drops
// from defeated Boars (see Enemy.ts / MainScene.spawnLooseDrop). "gremlin_skin"
// drops only from the ranged Gremlin (feeds the Drying Rack's
// gremlin_leather output); "gremlin_blood" drops from either variant (ranged
// Gremlin or melee-only Gremling — item names stay "gremlin_" regardless).
// "cattail" (creek-edge harvestable) and "gremlin_skin" are the Drying Rack's
// raw inputs; "twine" and "gremlin_leather" are its processed outputs.
// "blackberry" is a forest-bush harvestable (a future food item — no eating
// mechanic yet). "bones" drops from Boars alongside boar_meat. "gremlin_guck"
// is the Drying Rack's processed output for raw gremlin_blood (2:1) — recipes
// that want a gremlin-blood ingredient now consume this instead of the raw
// drop, mirroring cattail->twine/gremlin_skin->gremlin_leather.
export type ResourceType =
  | "wood"
  | "stone"
  | "leather"
  | "boar_meat"
  | "snake_meat"
  | "bones"
  | "gremlin_blood"
  | "gremlin_guck"
  | "gremlin_skin"
  | "cattail"
  | "blackberry"
  | "twine"
  | "gremlin_leather"
  | "gremlin_trophy" // dropped by Elite Gremlins (Gremlin Shack guards); Gremlin Totem ingredient
  | "boar_trophy" // dropped by Elite Boars — a Relic Forge trophy (Common)
  | "snake_trophy" // dropped by Elite Snakes — a Relic Forge trophy (Common)
  | "gremlin_king_fang" // Gremlin King's guaranteed unique trophy drop
  // --- badlands (biome 2 Phase 2) raw materials + flora ---
  | "duskrunner_pelt" // dropped by Duskrunners — a future badlands leather-tier hide (no recipe yet)
  | "cragscale_plate" // dropped by Cragscales — a future heavy-armor/smithing ingredient
  | "hex_essence" // dropped by Hexlings — a future magic-weapon/alchemy reagent
  | "sandmaw_chitin" // dropped by Sandmaws — a light-but-tough plating shard (future armor/tool material)
  | "emberbloom" // arid desert-herb harvestable — a future alchemy ingredient
  | "sunfruit" // cactus-fruit harvestable — a future food ingredient
  // Badlands elite trophies (Common/tier1 for now; Phase 5 retiers them to tier-2 + Ember refinement)
  | "duskrunner_trophy"
  | "cragscale_trophy"
  | "hexling_trophy"
  | "sandmaw_trophy"
  | "gloam_shard" // mined from the Gloaming Vein POI — spent at the Relic Forge's Refine tab
  | "refined_trophy_uncommon" // Common trophies refined up (Gloaming Vein loop) — rolls Uncommon
  | "refined_trophy_rare"; // scaffold for deeper biomes — rolls Rare
