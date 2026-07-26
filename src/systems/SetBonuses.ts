// Armor SET BONUSES — the payoff for building a full best-in-biome forged set
// (biome 2 Phase 4 gave the pieces; this rewards wearing all three). Deliberately
// UNIQUE mechanics, not the raw-% channels relics already own (the user: "really
// reward the player, non-relic-overlapping"). Each set leans into its armor-skill
// identity — Embersteel(heavy) = stand-and-tank, Emberhide(light) = dash/mobility.
//
// Effects are read by MainScene at the relevant hook points via activeSets(); the
// numeric constants for each effect live in MainScene next to where they apply,
// same as relic magnitudes vs. relic membership.
import { EquippedItem } from "./Equipment";

export type SetId = "embersteel" | "emberhide" | "gloamsteel" | "mirehide";

// A set's LINEAGE (which identity it belongs to) and its RANK within that
// lineage (higher = deeper biome). Together these are what let a set bonus
// survive a mid-tier upgrade — see activeSets.
export type SetLineage = "heavy" | "light";

export interface ArmorSet {
  id: SetId;
  name: string;
  lineage: SetLineage;
  rank: number; // 1 = Ember tier, 2 = bayou reforge
  // Item keys in slot order [helmet, chest, legs]. Position matters: a lineage
  // is only "complete" when all three positions are covered.
  pieces: string[];
  bonusName: string;
  bonusDesc: string;
  // Concrete figures for the bonus, shown on the granting item's tooltip.
  // DERIVED from the constants below rather than written out, so the numbers
  // have exactly one home — bonusDesc alone is prose ("greatly reduces incoming
  // damage"), which is what left these four uniques hovering with no numbers at
  // all (the user: "some of the specials still don't have their numbers").
  bonusStats: string[];
}

// Magnitudes for the four bonuses. These used to live in MainScene as private
// consts, which is why nothing player-facing could quote them; MainScene now
// imports them from here. Plain numbers only — this file stays Phaser-free.
export const SET_THORNS_FIRE_DAMAGE = 9;
export const SET_MOLTEN_DAMAGE_REDUCTION = 0.15; // 15% off every incoming hit (physical/magic/fire)
export const SET_EMBERBLINK_DASH_MULT = 1.6;
export const SET_EMBERBLINK_BURST_RADIUS = 95;
export const SET_EMBERBLINK_BURST_DAMAGE = 16;
export const SET_GLOAM_BULWARK_DAMAGE_REDUCTION = 0.22;
export const SET_GLOAM_THORNS_FIRE_DAMAGE = 15;
export const SET_MIREBLINK_DASH_MULT = 1.9;
export const SET_MIREBLINK_BURST_RADIUS = 120;
export const SET_MIREBLINK_BURST_DAMAGE = 26;

const bulwarkStats = (reductionPct: number, thorns: number): string[] => [
  `-${Math.round(reductionPct * 100)}% damage taken (all types)`,
  `${thorns} fire damage to melee attackers`,
];
const blinkStats = (dashMult: number, radius: number, damage: number): string[] => [
  `Dash distance x${dashMult}`,
  `${damage} fire damage in a ${radius}px burst on landing`,
];

export const ARMOR_SETS: ArmorSet[] = [
  {
    id: "embersteel",
    lineage: "heavy",
    rank: 1,
    name: "Embersteel",
    pieces: ["amulet_molten_bulwark"],
    bonusName: "Molten Bulwark",
    bonusDesc: "Reduces all incoming damage. Melee attackers are seared for fire damage.",
    bonusStats: bulwarkStats(SET_MOLTEN_DAMAGE_REDUCTION, SET_THORNS_FIRE_DAMAGE),
  },
  {
    id: "emberhide",
    lineage: "light",
    rank: 1,
    name: "Emberhide",
    pieces: ["ring_emberblink"],
    bonusName: "Emberblink",
    bonusDesc: "Your dash travels farther and erupts in fire where you land.",
    bonusStats: blinkStats(SET_EMBERBLINK_DASH_MULT, SET_EMBERBLINK_BURST_RADIUS, SET_EMBERBLINK_BURST_DAMAGE),
  },
  // Biome-3 Phase 3: the bayou reforge of each Ember set. Deliberately the SAME
  // two mechanics, turned up — a reforged set is the same identity worn better,
  // not a third thing to learn. MainScene picks the stronger constant when the
  // bayou set is worn (see moltenDamageReduction/emberblinkDash*).
  {
    id: "gloamsteel",
    lineage: "heavy",
    rank: 2,
    name: "Gloamsteel",
    pieces: ["amulet_gloam_bulwark"],
    bonusName: "Gloam Bulwark",
    bonusDesc: "Greatly reduces all incoming damage. Melee attackers are seared badly.",
    bonusStats: bulwarkStats(SET_GLOAM_BULWARK_DAMAGE_REDUCTION, SET_GLOAM_THORNS_FIRE_DAMAGE),
  },
  {
    id: "mirehide",
    lineage: "light",
    rank: 2,
    name: "Mirehide",
    pieces: ["ring_mireblink"],
    bonusName: "Mireblink",
    bonusDesc: "Your dash travels much farther and erupts violently where you land.",
    bonusStats: blinkStats(SET_MIREBLINK_DASH_MULT, SET_MIREBLINK_BURST_RADIUS, SET_MIREBLINK_BURST_DAMAGE),
  },
];

// Which bonus is currently active, if any.
//
// B4-P5: these effects are no longer granted by wearing three matching ARMOR
// pieces — they're granted by a single piece of JEWELRY (locked with the user:
// "move the set bonus effects away and put those effects on rings/amulets").
//
// Two reasons that's better. Armor is now purely flat armor, which is what makes
// branching gear (the Mirebronze route) balanceable at all — otherwise every new
// set would owe a bespoke bonus. And a bonus tied to three pieces made a partial
// upgrade feel like a downgrade, which is a problem this file previously had to
// paper over with the weakest-piece rule.
//
// Since each bonus is now ONE self-contained item, "wearing a partial set" no
// longer exists, and the rule inverts: wearing several of a lineage grants the
// HIGHEST rank worn, not the lowest. (You normally can't anyway — the amulets
// share the necklace slot — but the two rings CAN both be worn.)
export function activeSets(slots: (EquippedItem | null)[]): Set<SetId> {
  const worn = new Set<string>();
  for (const s of slots) if (s) worn.add(s.key);

  const active = new Set<SetId>();
  for (const lineage of ["heavy", "light"] as SetLineage[]) {
    const wornSets = ARMOR_SETS.filter(
      (set) => set.lineage === lineage && set.pieces.every((k) => worn.has(k)),
    );
    if (wornSets.length === 0) continue;
    const best = wornSets.reduce((a, b) => (b.rank > a.rank ? b : a));
    active.add(best.id);
  }
  return active;
}

export function setById(id: SetId): ArmorSet {
  // Non-null: SetId only ever comes from ARMOR_SETS itself.
  return ARMOR_SETS.find((s) => s.id === id)!;
}
