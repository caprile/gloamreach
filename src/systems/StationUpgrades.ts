import type { ResourceType } from "./Inventory";
import { itemDef } from "./Items";
import { armorUpgradesForItem } from "./ArmorUpgrades";
import { weaponUpgradesForItem } from "./WeaponUpgrades";

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
  // Display/sort order only — NOT the level the station reaches. Station
  // upgrades are a no-ladder set: applying ANY discovered, not-yet-applied
  // upgrade bumps the station's level by exactly +1 (level == count of
  // upgrades applied, any order). See MainScene.applyStationUpgrade and
  // UpgradeMenu's station branch. (Worn weapon/armor upgrades still read
  // resultTier as a real destination tier — that path is unchanged.)
  resultTier: number;
  costs: Partial<Record<ResourceType, number>>;
  // Short player-facing summary shown in UpgradeMenu (e.g. "+2 Armor") — left
  // unset for upgrades like Tool Sharpener that only unlock a gate rather
  // than grant a direct numeric effect.
  deltaLabel?: string;
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
  {
    id: "stone_hearth",
    name: "Stone Hearth",
    description: "A ring of stones and a cooking grate. Unlocks tastier campfire dishes.",
    appliesToItemKey: "campfire",
    resultTier: 1,
    costs: { twine: 4, stone: 20 },
    deltaLabel: "Better campfire dishes",
  },
  {
    id: "sunsteel_grill",
    name: "Sunsteel Grill",
    description: "A forged grill plate over the coals. Sears badlands game and desert flora.",
    appliesToItemKey: "campfire",
    resultTier: 2,
    costs: { sunsteel_ingot: 3, clay: 8, stone: 10 },
    deltaLabel: "Better campfire dishes",
  },
  {
    id: "emberforge_hearth",
    name: "Emberforge Hearth",
    description: "An ember-fed hearth that never dies down. Cooks the richest cross-biome feasts.",
    appliesToItemKey: "campfire",
    resultTier: 3,
    costs: { embersteel_ingot: 3, stone: 20 },
    deltaLabel: "Best campfire dishes",
  },
  {
    id: "gloam_conduit",
    name: "Gloam Conduit",
    description: "A gloam-shard conduit set into the forge. Unlocks trophy refinement.",
    appliesToItemKey: "relic_forge",
    resultTier: 1,
    costs: { stone: 15, gloam_shard: 1 },
    deltaLabel: "Unlocks the Refine tab",
  },
  {
    // Relic Forge Lvl 3 (Phase 5). Only discoverable once Embersteel Ingot is
    // known, same "you had to actually smelt this" gate as Emberforge Anvil.
    id: "ember_kiln",
    name: "Ember Kiln",
    description: "A cinder-fed reduction kiln bolted to the forge. Renders Gloam Shards down into concentrated Ember.",
    appliesToItemKey: "relic_forge",
    resultTier: 2,
    costs: { embersteel_ingot: 3, stone: 20 },
    deltaLabel: "Unlocks Gloam -> Ember conversion",
  },
  {
    id: "forge_anvil",
    name: "Forge Anvil",
    description: "A proper forge and anvil bolted to the bench. Lets you work metal ingots into gear.",
    appliesToItemKey: "workbench",
    resultTier: 2,
    costs: { sunsteel_ingot: 5, stone: 10 },
    deltaLabel: "Unlocks forged gear",
  },
  {
    id: "ember_crucible",
    name: "Ember Crucible",
    description: "The Gremlin King's still-burning heart set into the kiln — hot enough to melt the rarest ore.",
    appliesToItemKey: "smelter",
    resultTier: 1,
    costs: { gremlin_king_heart: 1, stone: 10 },
    deltaLabel: "Smelt rare ore",
  },
  {
    // Workbench Lvl 4. Only DISCOVERED once Embersteel Ingot is known (i.e.
    // a rare ingot has actually been smelted) — canDiscoverUpgrade gates the
    // upgrade on every cost key being discovered.
    id: "emberforge_anvil",
    name: "Emberforge Anvil",
    description: "An ember-fed anvil that runs hot enough to reforge finished gear. Unlocks the enhanced tier.",
    appliesToItemKey: "workbench",
    resultTier: 3,
    costs: { embersteel_ingot: 5, stone: 15 },
    deltaLabel: "Unlocks enhanced gear",
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
  if (
    upgradesForItem(itemKey).length === 0 &&
    armorUpgradesForItem(itemKey).length === 0 &&
    weaponUpgradesForItem(itemKey).length === 0
  ) {
    return base;
  }
  return `${base} Lvl ${tier + 1}`;
}
