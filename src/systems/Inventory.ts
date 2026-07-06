// The raw resource types. These are now also regular inventory item keys
// (see Items.ts) held as stacks in the backpack ItemContainer — the old
// count-based `Inventory` class was replaced by that unified model. This type
// still names the crafting-ingredient/resource keys used across recipes,
// resource nodes, and drops. "leather" has no drop source yet (future
// hunting/skinning); recipes can reference it but it stays undiscovered until
// something drops it. "boar_meat" drops from defeated Boars (see Enemy.ts /
// MainScene.spawnLooseDrop).
export type ResourceType = "wood" | "stone" | "leather" | "boar_meat";
