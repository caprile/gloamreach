import type { Equipment } from "./Equipment";
import { EQUIP_SLOTS } from "./Equipment";
import type { ItemStack } from "./ItemContainer";

// Gem augments for a specific gear INSTANCE — Biome-3 Phase 3, the
// mix-and-match half of bayou gear progression (the reforge recipes in
// Recipes.ts are the other half). Locked with the user: augments are
// CONSUMED one-shot (no removable sockets) and apply in ANY order — this is
// the no-ladder model StationUpgrades already established, moved onto a worn/
// held item rather than a placed station.
//
// Storage reuses the SAME per-instance fields a placed station's upgrades use:
// `ItemStack.upgrades` for gear in a container, `EquippedItem.upgrades` for a
// worn piece. No new per-instance data model — which is exactly why the
// existing UpgradeMenu could serve this panel too.
//
// DELIBERATELY not the relic/jewelry layers: relics own the raw-% combat stat
// layer and jewelry owns ability-augment + explorer utility, so augments stay
// GEAR-flavored — the numbers that live on the weapon/armor itself (flat
// damage, crit, arc reach, flat armor, elemental mitigation, swing cost).
export interface AugmentEffect {
  // --- weapon ---
  damageBonus?: number; // flat damage added to the weapon's base
  critChancePct?: number; // added crit chance (6 = +6%)
  critMultBonus?: number; // added crit multiplier (0.3 = +0.30x)
  arcRangePct?: number; // widens the melee AOE arc's reach (30 = +30%)
  staminaCostPct?: number; // reduces weapon/tool swing stamina cost (12 = -12%)
  // --- armor ---
  defenseBonus?: number; // flat armor on top of the piece's tiered defense
  elementalMitigationPct?: number; // extra magic/fire reduction (10 = -10% of the hit)
  moveSpeedPct?: number; // added move speed (4 = +4%)
}

export interface GearAugmentDef {
  id: string;
  name: string;
  description: string;
  // Discriminator the UpgradeMenu and MainScene branch on — an augment row is
  // offered from the applied-id set, never from the resultTier ladder.
  augment: true;
  appliesToItemKeys: string[];
  // Display/sort order only, NOT a destination tier (same caveat as
  // StationUpgradeDef.resultTier under the no-ladder model). An augment never
  // touches the item's `tier`, so it composes freely with the Lvl 2/3
  // right-click upgrades a piece already has.
  resultTier: number;
  costs: Partial<Record<string, number>>;
  deltaLabel: string;
  requiresWorkbenchTier?: number;
  effect: AugmentEffect;
}

// A hard cap is what makes augments a CHOICE rather than a checklist — with
// every augment applyable to every piece, an uncapped item would just take all
// of them. Two per instance keeps the pick meaningful.
export const MAX_AUGMENTS_PER_ITEM = 2;

// Augmenting is bayou-era work: it needs an Emberforge Anvil (Workbench Lvl 4,
// tier 3) — the same bench the Ember tier is forged at, so the gear and the
// gems that augment it arrive in the same era.
const AUGMENT_BENCH_TIER = 3;

// Only the top two forged tiers accept augments. Starter/stone gear is
// deliberately excluded — gems are a late-game sink, not a way to keep a Wood
// Club relevant.
const AUGMENTABLE_WEAPONS = [
  "embersteel_warhammer",
  "embersteel_sword",
  "embersteel_pike",
  "embersteel_warbow",
  "ember_brand",
  "gloamsteel_warhammer",
  "gloamsteel_sword",
  "gloamsteel_pike",
  "gloamsteel_warbow",
  "gloam_brand",
];

const AUGMENTABLE_ARMOR = [
  "embersteel_helm",
  "embersteel_cuirass",
  "embersteel_greaves",
  "emberhide_hood",
  "emberhide_vest",
  "emberhide_leggings",
  "gloamsteel_helm",
  "gloamsteel_cuirass",
  "gloamsteel_greaves",
  "mirehide_hood",
  "mirehide_vest",
  "mirehide_leggings",
];

export const GEAR_AUGMENTS: GearAugmentDef[] = [
  // --- weapon augments ---
  {
    id: "aug_gloam_edge",
    name: "Gloam Edge",
    description: "A gloam-gem bound along the edge. The weapon bites harder with every strike.",
    augment: true,
    appliesToItemKeys: AUGMENTABLE_WEAPONS,
    resultTier: 0,
    costs: { gem_gloam: 1, gloamsteel_ingot: 1 },
    deltaLabel: "+3 Damage",
    requiresWorkbenchTier: AUGMENT_BENCH_TIER,
    effect: { damageBonus: 3 },
  },
  {
    id: "aug_serrated_fang",
    name: "Serrated Fang",
    description: "Blood-gem shards set into a serrated back-edge — it finds the weak seam more often.",
    augment: true,
    appliesToItemKeys: AUGMENTABLE_WEAPONS,
    resultTier: 1,
    costs: { gem_blood: 1, sandmaw_chitin: 2 },
    deltaLabel: "+6% Crit Chance",
    requiresWorkbenchTier: AUGMENT_BENCH_TIER,
    effect: { critChancePct: 6 },
  },
  {
    id: "aug_cruel_weight",
    name: "Cruel Weight",
    description: "An ember-gem core weighted behind the head. When it lands clean, it lands ruinously.",
    augment: true,
    appliesToItemKeys: AUGMENTABLE_WEAPONS,
    resultTier: 2,
    costs: { gem_ember: 1, cragscale_plate: 2 },
    deltaLabel: "+0.30x Crit Damage",
    requiresWorkbenchTier: AUGMENT_BENCH_TIER,
    effect: { critMultBonus: 0.3 },
  },
  {
    id: "aug_widened_sweep",
    name: "Widened Sweep",
    description: "Moonsilver inlay along the haft carries the swing further than the steel alone reaches.",
    augment: true,
    appliesToItemKeys: AUGMENTABLE_WEAPONS,
    resultTier: 3,
    costs: { moonsilver: 2, gem_gloam: 1 },
    deltaLabel: "+30% Arc Reach",
    requiresWorkbenchTier: AUGMENT_BENCH_TIER,
    effect: { arcRangePct: 30 },
  },
  {
    id: "aug_swift_grip",
    name: "Swift Grip",
    description: "A moonsilver-wound grip that takes the shock out of a swing. Less of you spent per blow.",
    augment: true,
    appliesToItemKeys: AUGMENTABLE_WEAPONS,
    resultTier: 4,
    costs: { moonsilver: 2, twine: 4 },
    deltaLabel: "-12% Stamina Cost",
    requiresWorkbenchTier: AUGMENT_BENCH_TIER,
    effect: { staminaCostPct: 12 },
  },

  // --- armor augments ---
  {
    id: "aug_warded_plating",
    name: "Warded Plating",
    description: "Gloamsteel plates riveted over the weak points.",
    augment: true,
    appliesToItemKeys: AUGMENTABLE_ARMOR,
    resultTier: 0,
    costs: { gloamsteel_ingot: 2 },
    deltaLabel: "+2 Armor",
    requiresWorkbenchTier: AUGMENT_BENCH_TIER,
    effect: { defenseBonus: 2 },
  },
  {
    id: "aug_stoneheart_core",
    name: "Stoneheart Core",
    description: "A cragscale-and-gloamsteel underlayer. Heavy, and almost nothing gets through it.",
    augment: true,
    appliesToItemKeys: AUGMENTABLE_ARMOR,
    resultTier: 1,
    costs: { gloamsteel_ingot: 3, cragscale_plate: 3 },
    deltaLabel: "+3 Armor",
    requiresWorkbenchTier: AUGMENT_BENCH_TIER,
    effect: { defenseBonus: 3 },
  },
  {
    id: "aug_gloamweave_lining",
    name: "Gloamweave Lining",
    description: "A gloam-gem woven into the lining drinks the worst of any spell or flame.",
    augment: true,
    appliesToItemKeys: AUGMENTABLE_ARMOR,
    resultTier: 2,
    costs: { gem_gloam: 1, moonsilver: 1 },
    deltaLabel: "-10% Magic/Fire Damage",
    requiresWorkbenchTier: AUGMENT_BENCH_TIER,
    effect: { elementalMitigationPct: 10 },
  },
  {
    id: "aug_fleetfoot_stitching",
    name: "Fleetfoot Stitching",
    description: "Mirehide panels restitched for stride instead of bulk.",
    augment: true,
    appliesToItemKeys: AUGMENTABLE_ARMOR,
    resultTier: 3,
    costs: { mirehide: 2, gem_blood: 1 },
    deltaLabel: "+4% Move Speed",
    requiresWorkbenchTier: AUGMENT_BENCH_TIER,
    effect: { moveSpeedPct: 4 },
  },
];

export function isGearAugment(def: { id: string }): def is GearAugmentDef {
  return (def as GearAugmentDef).augment === true;
}

// Every augment this item key could ever take (the menu filters the ones
// already applied to the specific instance).
export function augmentsForItem(itemKey: string): GearAugmentDef[] {
  return GEAR_AUGMENTS.filter((a) => a.appliesToItemKeys.includes(itemKey)).sort(
    (a, b) => a.resultTier - b.resultTier,
  );
}

export function isAugmentableItem(itemKey: string): boolean {
  return augmentsForItem(itemKey).length > 0;
}

// The applied-augment ids on an instance. Both instance shapes (a container
// ItemStack and a worn EquippedItem) carry the same optional `upgrades` field,
// so one reader serves both.
export function appliedAugmentIds(instance: { upgrades?: string[] } | null | undefined): string[] {
  const ids = instance?.upgrades ?? [];
  // A placed station's ids can also live in this field; filter to augment ids
  // so an unrelated id could never be counted against the cap.
  return ids.filter((id) => GEAR_AUGMENTS.some((a) => a.id === id));
}

export function augmentDef(id: string): GearAugmentDef | undefined {
  return GEAR_AUGMENTS.find((a) => a.id === id);
}

// Sum of every applied augment's effect on one instance.
export function augmentEffect(instance: { upgrades?: string[] } | null | undefined): AugmentEffect {
  const out: AugmentEffect = {};
  for (const id of appliedAugmentIds(instance)) {
    const e = augmentDef(id)?.effect;
    if (!e) continue;
    for (const k of Object.keys(e) as (keyof AugmentEffect)[]) {
      out[k] = (out[k] ?? 0) + (e[k] ?? 0);
    }
  }
  return out;
}

// Sum across every WORN piece — the armor-side aggregate MainScene reads at
// the defense / elemental-mitigation / move-speed hooks.
export function equippedAugmentEffect(equipment: Equipment): AugmentEffect {
  const out: AugmentEffect = {};
  for (const { id } of EQUIP_SLOTS) {
    const e = augmentEffect(equipment.get(id));
    for (const k of Object.keys(e) as (keyof AugmentEffect)[]) {
      out[k] = (out[k] ?? 0) + (e[k] ?? 0);
    }
  }
  return out;
}

// Short "Gloam Edge, Warded Plating" line for the item tooltip.
export function augmentSummary(instance: ItemStack | { upgrades?: string[] } | null | undefined): string[] {
  return appliedAugmentIds(instance).map((id) => augmentDef(id)?.name ?? id);
}
