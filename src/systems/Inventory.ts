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
  | "bones"
  | "gremlin_blood"
  | "gremlin_guck"
  | "gremlin_skin"
  | "cattail"
  | "blackberry"
  | "twine"
  | "gremlin_leather"
  | "gremlin_king_fang"; // Gremlin King's guaranteed unique trophy drop
