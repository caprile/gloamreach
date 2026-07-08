import type { ResourceType } from "./Inventory";
import { itemDef } from "./Items";
import { armorUpgradesForItem } from "./ArmorUpgrades";

// A named upgrade a placed station can receive via its right-click Upgrade
// popup. Replaces the old generic `workbench_upgrade` consumable: costs are
// deducted directly from the backpack and the applied upgrade bumps the placed
// instance's `tier` (which survives Destroy -> pickup -> re-Place via the
// ItemStack.tier field). Gremlin armor levels (Milestone M) reuse the same
// tier plumbing on worn items rather than a parallel system.
export interface StationUpgradeDef {
  id: string;
  name: string;
  description: string;
  appliesToItemKey: string; // which placed object this upgrade targets
  resultTier: number; // the tier the station reaches after applying it
  costs: Partial<Record<ResourceType, number>>;
}

export const STATION_UPGRADES: StationUpgradeDef[] = [
  {
    id: "tool_sharpener",
    name: "Tool Sharpener",
    description: "A whetstone fixture. Reinforces the Workbench for finer work.",
    appliesToItemKey: "workbench",
    resultTier: 1,
    costs: { twine: 3, wood: 5, stone: 2 },
  },
];

// The upgrades that could apply to a given placed object, ordered by the tier
// they grant so a station upgrades one step at a time.
export function upgradesForItem(itemKey: string): StationUpgradeDef[] {
  return STATION_UPGRADES.filter((u) => u.appliesToItemKey === itemKey).sort(
    (a, b) => a.resultTier - b.resultTier,
  );
}

// "Workbench Lvl 2" instead of a bare "Workbench" — only for items that
// actually have upgrades defined (checked across both the station and armor
// upgrade tables — a worn Gremlin Cap gets the same "Lvl N" treatment as a
// placed Workbench); everything else (Campfire, Drying Rack today) keeps its
// plain item name. Shared by the placed-object label, the Upgrade panel,
// event-log lines, and item tooltips (backpack/hotbar) so an item's level
// reads consistently everywhere it's shown. Levels are 1-based for display
// (tier 0 == "Lvl 1") since "Lvl 0" reads as broken to a player even though
// the underlying tier field starts at 0.
export function stationDisplayName(itemKey: string, tier: number): string {
  const base = itemDef(itemKey)?.name ?? itemKey;
  if (upgradesForItem(itemKey).length === 0 && armorUpgradesForItem(itemKey).length === 0) return base;
  return `${base} Lvl ${tier + 1}`;
}
