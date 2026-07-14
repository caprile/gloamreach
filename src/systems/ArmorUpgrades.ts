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

// Each tier now grants a flat +1 armor over the previous one (base -> +1 -> +2
// over base), a deliberate flattening of the old lvl-2's big jump (cap/shirt/
// pants used to leap the full set 9 -> 16 in a single tier). `defenseBonus` is
// the cumulative bonus over the item's base armorDefense at that tier — so a
// piece's total at tier N is base + that tier's defenseBonus (see
// armorDefenseForTier). Full-set totals: Lvl 1 = 7, Lvl 2 = 10, Lvl 3 = 13.
export const ARMOR_UPGRADES: ArmorUpgradeDef[] = [
  {
    id: "gremlin_cap_lvl2",
    name: "Gremlin Cap Lvl 2",
    description: "Reinforce the cap with a fresh hide and a few more berries for the dye.",
    appliesToItemKey: "gremlin_cap",
    resultTier: 1,
    costs: { gremlin_leather: 1, blackberry: 1 },
    requiresWorkbenchTier: 1,
    defenseBonus: 1,
    deltaLabel: "+1 Armor",
  },
  {
    id: "gremlin_cap_lvl3",
    name: "Gremlin Cap Lvl 3",
    description: "A double-layered crown of hardened leather.",
    appliesToItemKey: "gremlin_cap",
    resultTier: 2,
    costs: { gremlin_leather: 2, blackberry: 2 },
    requiresWorkbenchTier: 1,
    defenseBonus: 2,
    deltaLabel: "+1 Armor",
  },
  {
    id: "gremlin_shirt_lvl2",
    name: "Gremlin Shirt Lvl 2",
    description: "Layer on more cured leather and bone reinforcement.",
    appliesToItemKey: "gremlin_shirt",
    resultTier: 1,
    costs: { gremlin_leather: 2, bones: 2 },
    requiresWorkbenchTier: 1,
    defenseBonus: 1,
    deltaLabel: "+1 Armor",
  },
  {
    id: "gremlin_shirt_lvl3",
    name: "Gremlin Shirt Lvl 3",
    description: "A bone-ribbed cuirass over the cured hide.",
    appliesToItemKey: "gremlin_shirt",
    resultTier: 2,
    costs: { gremlin_leather: 3, bones: 3 },
    requiresWorkbenchTier: 1,
    defenseBonus: 2,
    deltaLabel: "+1 Armor",
  },
  {
    id: "gremlin_pants_lvl2",
    name: "Gremlin Pants Lvl 2",
    description: "A finer stitch job — needs a properly outfitted Workbench to pull off.",
    appliesToItemKey: "gremlin_pants",
    resultTier: 1,
    costs: { gremlin_leather: 1, leather: 1 },
    requiresWorkbenchTier: 1,
    defenseBonus: 1,
    deltaLabel: "+1 Armor",
  },
  {
    id: "gremlin_pants_lvl3",
    name: "Gremlin Pants Lvl 3",
    description: "Reinforced leg wraps layered with a second cured hide.",
    appliesToItemKey: "gremlin_pants",
    resultTier: 2,
    costs: { gremlin_leather: 2, leather: 2 },
    requiresWorkbenchTier: 1,
    defenseBonus: 2,
    deltaLabel: "+1 Armor",
  },
];

// Forged-gear upgrades (biome 2, the user: "add levels to the ember armor and
// weapons"). Both the base forged tier (Sunsteel/Duskhide) and the enhanced
// tier (Embersteel/Emberhide) now get two right-click levels (+1 then +1 armor,
// = +2 over base at Lvl 3), sunk in ingots — a use for the ingot stockpile.
// Tuned so a base (Lvl 1) ember piece always out-armors a fully-upgraded (Lvl 3)
// steel piece: every ember base is >= steel base + 3, and steel tops out at +2.
// Gated on the same Workbench tier the piece is forged at (Sunsteel Lvl 3 = tier
// 2, Embersteel Lvl 4 = tier 3), so you already have the bench when you can wear
// the gear.
function forgedArmorUpgrades(key: string, name: string, ingot: ResourceType, benchTier: number): ArmorUpgradeDef[] {
  return [
    {
      id: `${key}_lvl2`,
      name: `${name} Lvl 2`,
      description: `Reforge the ${name.toLowerCase()} with another ingot for a tighter, tougher fit.`,
      appliesToItemKey: key,
      resultTier: 1,
      costs: { [ingot]: 2 },
      requiresWorkbenchTier: benchTier,
      defenseBonus: 1,
      deltaLabel: "+1 Armor",
    },
    {
      id: `${key}_lvl3`,
      name: `${name} Lvl 3`,
      description: `A master reforge — a third ingot beaten into the ${name.toLowerCase()} for the last measure of protection.`,
      appliesToItemKey: key,
      resultTier: 2,
      costs: { [ingot]: 3 },
      requiresWorkbenchTier: benchTier,
      defenseBonus: 2,
      deltaLabel: "+1 Armor",
    },
  ];
}

ARMOR_UPGRADES.push(
  ...forgedArmorUpgrades("sunsteel_helm", "Sunsteel Helm", "sunsteel_ingot", 2),
  ...forgedArmorUpgrades("sunsteel_cuirass", "Sunsteel Cuirass", "sunsteel_ingot", 2),
  ...forgedArmorUpgrades("sunsteel_greaves", "Sunsteel Greaves", "sunsteel_ingot", 2),
  ...forgedArmorUpgrades("duskhide_hood", "Duskhide Hood", "sunsteel_ingot", 2),
  ...forgedArmorUpgrades("duskhide_vest", "Duskhide Vest", "sunsteel_ingot", 2),
  ...forgedArmorUpgrades("duskhide_leggings", "Duskhide Leggings", "sunsteel_ingot", 2),
  ...forgedArmorUpgrades("embersteel_helm", "Embersteel Helm", "embersteel_ingot", 3),
  ...forgedArmorUpgrades("embersteel_cuirass", "Embersteel Cuirass", "embersteel_ingot", 3),
  ...forgedArmorUpgrades("embersteel_greaves", "Embersteel Greaves", "embersteel_ingot", 3),
  ...forgedArmorUpgrades("emberhide_hood", "Emberhide Hood", "embersteel_ingot", 3),
  ...forgedArmorUpgrades("emberhide_vest", "Emberhide Vest", "embersteel_ingot", 3),
  ...forgedArmorUpgrades("emberhide_leggings", "Emberhide Leggings", "embersteel_ingot", 3),
);

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
