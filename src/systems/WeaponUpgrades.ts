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
    costs: { bones: 3 }, // was 5 — bones are in high demand; eased per 2026-07-11 playtest
    damageBonus: 1,
    deltaLabel: "+1 Damage",
  },
  {
    id: "bone_knife_lvl3",
    name: "Bone Knife Lvl 3",
    description: "Blooded and honed — the blade bites deeper.",
    appliesToItemKey: "bone_knife",
    resultTier: 2,
    costs: { bones: 8, gremlin_guck: 2 },
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
    costs: { wood: 5, stone: 4, gremlin_guck: 3 },
    damageBonus: 3,
    deltaLabel: "+3 Damage",
  },
];

// Forged-weapon upgrades (biome 2, the user: "add levels to the ember weapons").
// Both the base forged weapons (Sunsteel) and the enhanced ones (Embersteel +
// Ember Brand) get two right-click levels (+2 then +2 damage), sunk in ingots.
// Tuned so a base (Lvl 1) ember weapon out-damages a fully-upgraded (Lvl 3) steel
// one: every ember base is >= steel base + 5, and steel tops out at +4.
function forgedWeaponUpgrades(key: string, name: string, ingot: ResourceType): WeaponUpgradeDef[] {
  return [
    {
      id: `${key}_lvl2`,
      name: `${name} Lvl 2`,
      description: `Reforge the ${name.toLowerCase()} with another ingot for a heavier, harder-hitting head.`,
      appliesToItemKey: key,
      resultTier: 1,
      costs: { [ingot]: 2 },
      damageBonus: 2,
      deltaLabel: "+2 Damage",
    },
    {
      id: `${key}_lvl3`,
      name: `${name} Lvl 3`,
      description: `A master reforge — a third ingot worked into the ${name.toLowerCase()} for a truly punishing strike.`,
      appliesToItemKey: key,
      resultTier: 2,
      costs: { [ingot]: 3 },
      damageBonus: 2,
      deltaLabel: "+2 Damage",
    },
  ];
}

WEAPON_UPGRADES.push(
  ...forgedWeaponUpgrades("sunsteel_warhammer", "Sunsteel Warhammer", "sunsteel_ingot"),
  ...forgedWeaponUpgrades("sunsteel_sword", "Sunsteel Longsword", "sunsteel_ingot"),
  ...forgedWeaponUpgrades("sunsteel_pike", "Sunsteel Pike", "sunsteel_ingot"),
  // The bows were simply never registered (the user: "does embersteel warbow not
  // have any upgrades?") — every other forged weapon of their own tier had two
  // levels and these had none, so a ranged build's gear dead-ended at base.
  ...forgedWeaponUpgrades("sunsteel_warbow", "Sunsteel Warbow", "sunsteel_ingot"),
  ...forgedWeaponUpgrades("embersteel_warhammer", "Embersteel Warhammer", "embersteel_ingot"),
  ...forgedWeaponUpgrades("embersteel_sword", "Embersteel Longsword", "embersteel_ingot"),
  ...forgedWeaponUpgrades("embersteel_pike", "Embersteel Pike", "embersteel_ingot"),
  ...forgedWeaponUpgrades("embersteel_warbow", "Embersteel Warbow", "embersteel_ingot"),
  ...forgedWeaponUpgrades("ember_brand", "Ember Brand", "embersteel_ingot"),
  // Bayou tier (biome 3 Phase 3) — sunk in Gloamsteel. Stacks with gem
  // augments (GearAugments.ts), which live on the instance's `upgrades` set
  // rather than its `tier`.
  ...forgedWeaponUpgrades("gloamsteel_warhammer", "Gloamsteel Warhammer", "gloamsteel_ingot"),
  ...forgedWeaponUpgrades("gloamsteel_sword", "Gloamsteel Longsword", "gloamsteel_ingot"),
  ...forgedWeaponUpgrades("gloamsteel_pike", "Gloamsteel Pike", "gloamsteel_ingot"),
  ...forgedWeaponUpgrades("gloamsteel_warbow", "Gloamsteel Warbow", "gloamsteel_ingot"),
  ...forgedWeaponUpgrades("gloam_brand", "Gloam Brand", "gloamsteel_ingot"),
  ...forgedWeaponUpgrades("gloamdrinker", "Gloamdrinker", "gloamsteel_ingot"),
  // Mirebronze (the Sunsteel branch) shipped without upgrades too — the same
  // omission as the bows. The longer road already pays less in base damage; it
  // shouldn't also be the only forged tier that can't be levelled.
  ...forgedWeaponUpgrades("mirebronze_warhammer", "Mirebronze Warhammer", "mirebronze_ingot"),
  ...forgedWeaponUpgrades("mirebronze_sword", "Mirebronze Longsword", "mirebronze_ingot"),
  ...forgedWeaponUpgrades("mirebronze_pike", "Mirebronze Pike", "mirebronze_ingot"),
);

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
