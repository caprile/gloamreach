// The raw resource types. These are now also regular inventory item keys
// (see Items.ts) held as stacks in the backpack ItemContainer — the old
// count-based `Inventory` class was replaced by that unified model. This type
// still names the crafting-ingredient/resource keys used across recipes,
// resource nodes, and drops. "leather" drops from Snake. "boar_meat" drops
// from defeated Boars (see Enemy.ts / MainScene.spawnLooseDrop). "gremlin_skin"
// drops only from the ranged Gremlin variant (feeds the Drying Rack's
// gremlin_leather output); "gremlin_blood" drops from either Gremlin variant.
export type ResourceType =
  | "wood"
  | "stone"
  | "leather"
  | "boar_meat"
  | "gremlin_blood"
  | "gremlin_skin";
