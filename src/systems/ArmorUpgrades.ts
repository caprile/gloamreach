import type { ResourceType } from "./Inventory";
import { itemDef } from "./Items";
import type { Equipment } from "./Equipment";
import { EQUIP_SLOTS } from "./Equipment";

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
  // Flat defense added by this upgrade (on top of the base item's
  // ItemDef.armorDefense) — see armorDefenseForTier below.
  defenseBonus?: number;
  // Short player-facing summary of what this upgrade grants, shown in
  // UpgradeMenu between the cost and description lines (e.g. "+2 Armor").
  deltaLabel?: string;
}

export const ARMOR_UPGRADES: ArmorUpgradeDef[] = [
  {
    id: "gremlin_cap_lvl2",
    name: "Gremlin Cap Lvl 2",
    description: "Reinforce the cap with a fresh hide and a few more berries for the dye.",
    appliesToItemKey: "gremlin_cap",
    resultTier: 1,
    costs: { gremlin_leather: 1, blackberry: 1 },
    requiresWorkbenchTier: 1,
    defenseBonus: 2,
    deltaLabel: "+2 Armor",
  },
  {
    id: "gremlin_shirt_lvl2",
    name: "Gremlin Shirt Lvl 2",
    description: "Layer on more cured leather and bone reinforcement.",
    appliesToItemKey: "gremlin_shirt",
    resultTier: 1,
    costs: { gremlin_leather: 2, bones: 2 },
    requiresWorkbenchTier: 1,
    defenseBonus: 3,
    deltaLabel: "+3 Armor",
  },
  {
    id: "gremlin_pants_lvl2",
    name: "Gremlin Pants Lvl 2",
    description: "A finer stitch job — needs a properly outfitted Workbench to pull off.",
    appliesToItemKey: "gremlin_pants",
    resultTier: 1,
    costs: { gremlin_leather: 1, leather: 1 },
    requiresWorkbenchTier: 1,
    defenseBonus: 2,
    deltaLabel: "+2 Armor",
  },
];

// The upgrades that could apply to a given equipped armor item, ordered by
// the tier they grant.
export function armorUpgradesForItem(itemKey: string): ArmorUpgradeDef[] {
  return ARMOR_UPGRADES.filter((u) => u.appliesToItemKey === itemKey).sort(
    (a, b) => a.resultTier - b.resultTier,
  );
}

// Base defense (ItemDef.armorDefense) plus the applied upgrade's defenseBonus
// once the piece has reached tier >= 1. A piece with no armorDefense/no
// matching upgrade defaults to 0 either way.
export function armorDefenseForTier(itemKey: string, tier: number): number {
  const base = itemDef(itemKey)?.armorDefense ?? 0;
  if (tier < 1) return base;
  const upg = armorUpgradesForItem(itemKey).find((u) => u.resultTier === tier);
  return base + (upg?.defenseBonus ?? 0);
}

// Sum of armorDefenseForTier across every worn slot — the flat damage
// reduction applied to all incoming (physical) player damage.
export function totalPlayerDefense(equipment: Equipment): number {
  let total = 0;
  for (const { id } of EQUIP_SLOTS) {
    const eq = equipment.get(id);
    if (eq) total += armorDefenseForTier(eq.key, eq.tier);
  }
  return total;
}
