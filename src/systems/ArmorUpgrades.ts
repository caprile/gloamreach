import type { ResourceType } from "./Inventory";

// A named upgrade for a worn armor piece — mirrors StationUpgradeDef
// (StationUpgrades.ts) but targets an *equipped* item rather than a placed
// object. Costs are deducted directly from the backpack and the upgrade
// bumps the equipped EquippedItem's `tier` in place (Equipment.ts); there is
// no separate craftable "upgrade item" step, matching the station pattern.
export interface ArmorUpgradeDef {
  id: string;
  name: string;
  description: string;
  appliesToItemKey: string; // which armor item this upgrade targets
  resultTier: number; // the tier the piece reaches after applying it
  costs: Partial<Record<ResourceType, number>>;
  // Optional extra gate beyond raw materials: the player must be standing
  // near a placed Workbench that has itself reached at least this tier
  // (0-based, matching StationUpgradeDef.resultTier's numbering) — e.g.
  // Gremlin Pants' lvl 2 requires a Tool-Sharpener-upgraded Workbench.
  requiresWorkbenchTier?: number;
}

export const ARMOR_UPGRADES: ArmorUpgradeDef[] = [
  {
    id: "gremlin_cap_lvl2",
    name: "Gremlin Cap Lvl 2",
    description: "Reinforce the cap with a fresh hide and a few more berries for the dye.",
    appliesToItemKey: "gremlin_cap",
    resultTier: 1,
    costs: { gremlin_leather: 1, blackberry: 1 },
  },
  {
    id: "gremlin_shirt_lvl2",
    name: "Gremlin Shirt Lvl 2",
    description: "Layer on more cured leather and bone reinforcement.",
    appliesToItemKey: "gremlin_shirt",
    resultTier: 1,
    costs: { gremlin_leather: 2, bones: 2 },
  },
  {
    id: "gremlin_pants_lvl2",
    name: "Gremlin Pants Lvl 2",
    description: "A finer stitch job — needs a properly outfitted Workbench to pull off.",
    appliesToItemKey: "gremlin_pants",
    resultTier: 1,
    costs: { gremlin_leather: 1, leather: 1 },
    requiresWorkbenchTier: 1,
  },
];

// The upgrades that could apply to a given equipped armor item, ordered by
// the tier they grant.
export function armorUpgradesForItem(itemKey: string): ArmorUpgradeDef[] {
  return ARMOR_UPGRADES.filter((u) => u.appliesToItemKey === itemKey).sort(
    (a, b) => a.resultTier - b.resultTier,
  );
}
