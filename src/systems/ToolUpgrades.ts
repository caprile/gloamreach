import type { ResourceType } from "./Inventory";

// A named upgrade for an owned tool instance (an axe/pickaxe), structurally a
// slim WeaponUpgradeDef (WeaponUpgrades.ts) minus the combat damageBonus —
// applied via right-click on the tool wherever it sits (backpack or hotbar),
// targeting that specific ItemStack's `tier` field, exactly like a weapon
// upgrade. The tier gates felling higher-hardness nodes: MainScene tracks the
// equipped tool's tier (`equippedToolTier`) and a node's `minToolTier`, so a
// base axe just bounces off the badlands Ironbark tree until it's upgraded.
export interface ToolUpgradeDef {
  id: string;
  name: string;
  description: string;
  appliesToItemKey: string; // which tool item this upgrade targets
  resultTier: number; // the tier the tool reaches after applying it
  costs: Partial<Record<ResourceType, number>>;
  deltaLabel?: string; // shown in UpgradeMenu, e.g. "Fells hardwood"
}

// The Woodcutter's Axe (stone_axe) gains a single badlands-tier upgrade: once
// the player has smelted the badlands' basic ore into Sunsteel Ingots, they can
// reinforce the axe so it can fell Ironbark — a new, tougher badlands tree.
export const TOOL_UPGRADES: ToolUpgradeDef[] = [
  {
    id: "stone_axe_ironshod",
    name: "Ironshod Woodcutter's Axe",
    description: "Sunsteel-edged and bound with ingot bands — bites through the badlands' ironbark, which a stone edge only glances off.",
    appliesToItemKey: "stone_axe",
    resultTier: 1,
    costs: { sunsteel_ingot: 2, stone: 6 },
    deltaLabel: "Fells Ironbark trees",
  },
  {
    // B4-P5: the mirror of the axe upgrade, on the mining side. Bog Ore — the
    // bayou's only surface ore — is now gated behind it, so entering the bayou
    // with badlands-era tools means you can SEE the ore and not touch it, which
    // is exactly the gate Ironbark already establishes for wood. Deliberately
    // crafted in the BADLANDS from badlands materials (Sunsteel + Ironbark), so
    // it's something you prepare before you travel, not something you find after.
    id: "stone_pickaxe_ironshod",
    name: "Ironshod Pickaxe",
    description: "Sunsteel-headed and hafted in ironbark — bites into bog ore, which a stone head only skids across.",
    appliesToItemKey: "stone_pickaxe",
    resultTier: 1,
    costs: { sunsteel_ingot: 2, ironbark: 4 },
    deltaLabel: "Mines Bog Ore",
  },
];

// The upgrades that could apply to a given tool item, ordered by the tier they
// grant so a tool upgrades one step at a time (mirrors weaponUpgradesForItem).
export function toolUpgradesForItem(itemKey: string): ToolUpgradeDef[] {
  return TOOL_UPGRADES.filter((u) => u.appliesToItemKey === itemKey).sort(
    (a, b) => a.resultTier - b.resultTier,
  );
}
