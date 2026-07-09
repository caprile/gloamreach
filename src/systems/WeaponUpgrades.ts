import type { ResourceType } from "./Inventory";

// A named upgrade for an owned weapon instance — structurally identical to
// StationUpgradeDef/ArmorUpgradeDef (StationUpgrades.ts/ArmorUpgrades.ts),
// applied via right-click on the weapon wherever it sits (backpack or
// hotbar), targeting that specific ItemStack's `tier` field (the same
// generic per-instance tier every other upgradable item already carries).
export interface WeaponUpgradeDef {
  id: string;
  name: string;
  description: string;
  appliesToItemKey: string; // which weapon item this upgrade targets
  resultTier: number; // the tier the weapon reaches after applying it
  costs: Partial<Record<ResourceType, number>>;
  damageBonus: number; // flat damage added at this tier (on top of the base weapon damage)
  deltaLabel: string; // shown in UpgradeMenu, e.g. "+2 Damage"
}

// "Lvl 1-3" per the user's request: the base crafted weapon is already
// Lvl 1 (tier 0), so each weapon gets exactly two upgrades here (tier 1 ->
// "Lvl 2", tier 2 -> "Lvl 3") — one step further than Gremlin armor's single
// lvl2 upgrade, same pattern.
export const WEAPON_UPGRADES: WeaponUpgradeDef[] = [
  {
    id: "stone_club_lvl2",
    name: "Stone Club Lvl 2",
    description: "A denser stone head, better bound to the haft.",
    appliesToItemKey: "stone_club",
    resultTier: 1,
    costs: { wood: 3, stone: 3 },
    damageBonus: 2,
    deltaLabel: "+2 Damage",
  },
  {
    id: "stone_club_lvl3",
    name: "Stone Club Lvl 3",
    description: "Reinforced with bone for a heavier, more punishing swing.",
    appliesToItemKey: "stone_club",
    resultTier: 2,
    costs: { wood: 5, stone: 5, bones: 3 },
    damageBonus: 2,
    deltaLabel: "+2 Damage",
  },
  {
    id: "bone_knife_lvl2",
    name: "Bone Knife Lvl 2",
    description: "A finer edge, ground down from a second bone.",
    appliesToItemKey: "bone_knife",
    resultTier: 1,
    costs: { bones: 5 },
    damageBonus: 1,
    deltaLabel: "+1 Damage",
  },
  {
    id: "bone_knife_lvl3",
    name: "Bone Knife Lvl 3",
    description: "Blooded and honed — the blade bites deeper.",
    appliesToItemKey: "bone_knife",
    resultTier: 2,
    costs: { bones: 8, gremlin_blood: 2 },
    damageBonus: 2,
    deltaLabel: "+2 Damage",
  },
  {
    id: "primal_spear_lvl2",
    name: "Primal Spear Lvl 2",
    description: "A sturdier haft and a sharpened bone tip.",
    appliesToItemKey: "primal_spear",
    resultTier: 1,
    costs: { wood: 3, stone: 2, bones: 3 },
    damageBonus: 2,
    deltaLabel: "+2 Damage",
  },
  {
    id: "primal_spear_lvl3",
    name: "Primal Spear Lvl 3",
    description: "Blooded tip, balanced shaft — a true hunting spear.",
    appliesToItemKey: "primal_spear",
    resultTier: 2,
    costs: { wood: 5, stone: 4, gremlin_blood: 3 },
    damageBonus: 3,
    deltaLabel: "+3 Damage",
  },
];

// The upgrades that could apply to a given weapon item, ordered by the tier
// they grant so a weapon upgrades one step at a time.
export function weaponUpgradesForItem(itemKey: string): WeaponUpgradeDef[] {
  return WEAPON_UPGRADES.filter((u) => u.appliesToItemKey === itemKey).sort(
    (a, b) => a.resultTier - b.resultTier,
  );
}

// Cumulative flat damage bonus a weapon instance has earned at `tier`.
export function weaponTierDamageBonus(itemKey: string, tier: number): number {
  if (tier < 1) return 0;
  let bonus = 0;
  for (const u of weaponUpgradesForItem(itemKey)) {
    if (u.resultTier <= tier) bonus += u.damageBonus;
  }
  return bonus;
}
