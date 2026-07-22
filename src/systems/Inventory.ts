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
  | "duskrunner_meat" // dropped by Duskrunners — a raw food-source drop (future cooking ingredient, no recipe yet)
  | "cragscale_plate" // dropped by Cragscales — a future heavy-armor/smithing ingredient
  | "hex_essence" // dropped by Hexlings — a future magic-weapon/alchemy reagent
  | "sandmaw_chitin" // dropped by Sandmaws — a light-but-tough plating shard (future armor/tool material)
  | "ironbark" // chopped from badlands Ironbark trees (needs an upgraded/Ironshod axe) — a hard wood feeding select badlands recipes/upgrades
  | "ember_ore" // mined from a Sunken Forge's ember deposits (after killing the Cinderwrought) — the RARE smelting ore (Phase 4): Cinderforged Ore → Embersteel Ingot
  | "clay" // mined from scattered badlands Clay Deposits — the build material for the Smelter (Phase 4)
  | "sunscorch_ore" // the COMMON badlands smelting ore (Phase 4): Sunscorch Ore → Sunsteel Ingot
  | "sunsteel_ingot" // basic forged ingot (Smelter output) — the base forged-gear tier + Workbench Lvl 3 (Phase 4)
  | "embersteel_ingot" // rare/T2 forged ingot (Smelter Lvl 2, gated on the Gremlin King's Heart) — feeds the Session-2 enhanced tier
  | "gremlin_king_heart" // the Gremlin King's guaranteed drop — upgrades the Smelter to smelt rare ore (Phase 4 gate)
  | "warren_fetish" // looted from Duskrunner Warren caches — the Effigy of the Duneshaper (badlands boss summon) ingredient
  | "emberbloom" // arid desert-herb harvestable — a future alchemy ingredient
  | "sunfruit" // cactus-fruit harvestable — a future food ingredient
  | "gloamcap" // gloam-touched desert mushroom harvestable — a future alchemy/food ingredient
  | "dustbloom" // pale windblown desert flower harvestable — a future alchemy ingredient
  // Badlands elite trophies — Common / Tier 2 (Phase 5 retiered them from Tier 1)
  | "duskrunner_trophy"
  | "cragscale_trophy"
  | "hexling_trophy"
  | "sandmaw_trophy"
  | "gloam_shard" // mined from the Gloaming Vein POI — spent at the Relic Forge's Refine tab
  | "refined_trophy_uncommon" // Common (Tier 1) trophies refined up (Gloaming Vein loop) — rolls Uncommon
  | "refined_trophy_rare" // scaffold for deeper biomes — rolls Rare
  | "ember_shard" // Phase 5: Gloam Shards rendered down at the Relic Forge's Ember Kiln (Lvl 3) — the tier-2 refinement currency
  | "refined_trophy_uncommon_t2" // Phase 5: badlands (Tier 2) Common trophies refined via Ember Shards — rolls Uncommon
  | "boss_refined_trophy" // Gremlin King drop (S4) — guaranteed Mythic (Tier 1) at the Relic Forge
  | "boss_refined_trophy_t2" // Duneshaper drop (S4) — guaranteed Mythic (Tier 2) at the Relic Forge
  // --- biome-3 (Phase 2b) jewelry economy — DORMANT: authored now, real sources land in biome 3 ---
  | "moonsilver" // the universal jewelry metal — mined in biome 3 (no node yet)
  | "gem_gloam" // ability gem → Gloamstep Band (Q); "gem source dictates build"
  | "gem_ember" // ability gem → Gloam Focus (E)
  | "gem_blood" // ability gem → Bloodpact Shroud (R)
  | "duneshaper_heart"; // the Duneshaper's guaranteed drop — upgrades the Gemwright's Table to craft ability jewelry (biome-3 gate)
