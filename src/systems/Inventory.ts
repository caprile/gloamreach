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
  | "mire_shard" // biome 3: Ember Shards steeped at the Mire Crucible (Lvl 4) — the tier-3 refinement currency
  | "gravemark_rubbing" // biome 3: a bayou-creature drop, consumed on pickup — maps the nearest unknown Sunken Crypt
  | "refined_trophy_uncommon_t2" // Phase 5: badlands (Tier 2) Common trophies refined via Ember Shards — rolls Uncommon
  | "refined_trophy_uncommon_t3" // biome 3 (Tier 3): refined via Mire Shards, AND the guaranteed drop from the bayou crypt wardens (2026-07-23) — rolls Uncommon at power tier 3
  | "boss_refined_trophy" // Gremlin King drop (S4) — guaranteed Mythic (Tier 1) at the Relic Forge
  | "boss_refined_trophy_t2" // Duneshaper drop (S4) — guaranteed Mythic (Tier 2) at the Relic Forge
  | "boss_refined_trophy_t3" // Miretyrant drop — guaranteed Mythic (Tier 3) at the Relic Forge
  // --- biome-3 (Phase 2b) jewelry economy — DORMANT: authored now, real sources land in biome 3 ---
  | "moonsilver" // the universal jewelry metal — mined in biome 3 (no node yet)
  | "gem_gloam" // ability gem → Gloamstep Band (Q); "gem source dictates build"
  | "gem_ember" // ability gem → Gloam Focus (E)
  | "gem_blood" // ability gem → Bloodpact Shroud (R)
  // --- biome-3 (Phase 3) bayou gear economy — DORMANT: authored now, real sources land in biome 3 ---
  | "bog_ore" // gloam-soaked bayou ore — smelts into Gloamsteel (no node yet)
  | "gloamsteel_ingot"
  | "mirebronze_ingot" // B4-P5: the SUNSTEEL branch metal — Sunsteel Ingot smelted with Bog Ore // the bayou forged ingot: Bog Ore + Hex Essence at a Lvl 2 Smelter
  | "mirehide" // bayou creature hide — the light-armor half of the bayou reforge
  | "swamp_moss" // bayou harvestable — a future alchemy/food ingredient (no recipe yet)
  | "water_lily" // bayou harvestable, grows on the water — future alchemy/food ingredient
  | "duneshaper_heart" // the Duneshaper's guaranteed drop — upgrades the Gemwright's Table to craft ability jewelry (biome-3 gate)
  // --- biome-3 (Phase 4b) bayou creature drops ---
  | "mirejaw_meat" // the bayou's food source (Duskrunner-meat precedent) — dropped by Mirejaws, cooking recipes land later
  | "blighttoad_legs" // the bayou's SECOND food source — dropped by Blighttoads, safe once cooked
  | "blight_gland" // a Blighttoad's poison sac — a future alchemy/coated-ammo ingredient
  | "gloam_dust" // motes shed by a slain Murkling — a future alchemy/augment ingredient
  // Bayou elite trophies — Common / Tier 3 (the deepest tier so far, ×2.25 relic magnitude)
  | "mirejaw_trophy"
  | "blighttoad_trophy"
  | "mosswretch_trophy"
  | "murkling_trophy"
  | "fenlurker_trophy"
  | "corpselight_trophy"
  // --- biome-3 (Phase 4d) surface-POI spoils — the two halves of the deep-mire summon ---
  | "tyrant_sigil" // pulled from a Sunken Shrine's bowl once its rite is survived
  | "gorge_bone" // taken from a Drowned Lodge's chieftain hut once its haunts are put down
  | "miretyrant_effigy"; // bound from both POI spoils — unseals the Sunken Gorge
