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
}

export const ARMOR_SETS: ArmorSet[] = [
  {
    id: "embersteel",
    lineage: "heavy",
    rank: 1,
    name: "Embersteel",
    pieces: ["embersteel_helm", "embersteel_cuirass", "embersteel_greaves"],
    bonusName: "Molten Bulwark",
    bonusDesc: "Reduces all incoming damage. Melee attackers are seared for fire damage.",
  },
  {
    id: "emberhide",
    lineage: "light",
    rank: 1,
    name: "Emberhide",
    pieces: ["emberhide_hood", "emberhide_vest", "emberhide_leggings"],
    bonusName: "Emberblink",
    bonusDesc: "Your dash travels farther and erupts in fire where you land.",
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
    pieces: ["gloamsteel_helm", "gloamsteel_cuirass", "gloamsteel_greaves"],
    bonusName: "Gloam Bulwark",
    bonusDesc: "Greatly reduces all incoming damage. Melee attackers are seared badly.",
  },
  {
    id: "mirehide",
    lineage: "light",
    rank: 2,
    name: "Mirehide",
    pieces: ["mirehide_hood", "mirehide_vest", "mirehide_leggings"],
    bonusName: "Mireblink",
    bonusDesc: "Your dash travels much farther and erupts violently where you land.",
  },
];

// Which set bonus is currently active, if any.
//
// A lineage is complete when all THREE slot positions are covered by pieces of
// that lineage — at ANY mix of ranks — and the bonus that activates is the one
// for the LOWEST rank worn. So an Ember set with a single Gloamsteel piece in it
// still grants Molten Bulwark, and only becomes Gloam Bulwark once the last
// Ember piece is replaced.
//
// This exists because the old rule (exact key match, all three) meant crafting
// ONE piece of the next tier silently deleted your set bonus, leaving you weaker
// than before you upgraded and with no way to tell why (the user playtest: "kind
// of awkward how you lose the ember armor set bonus when you make a single piece
// of the next tier's stuff"). Progress should never be a downgrade; a partial
// upgrade now simply doesn't PAY yet.
export function activeSets(slots: (EquippedItem | null)[]): Set<SetId> {
  const worn = new Set<string>();
  for (const s of slots) if (s) worn.add(s.key);

  const active = new Set<SetId>();
  for (const lineage of ["heavy", "light"] as SetLineage[]) {
    const sets = ARMOR_SETS.filter((s) => s.lineage === lineage).sort((a, b) => a.rank - b.rank);
    if (sets.length === 0) continue;
    const positions = sets[0].pieces.length;

    // Lowest rank worn at each position; bail the moment a position is empty.
    let lowestRank = Infinity;
    let complete = true;
    for (let pos = 0; pos < positions; pos++) {
      const found = sets.filter((s) => worn.has(s.pieces[pos]));
      if (found.length === 0) {
        complete = false;
        break;
      }
      lowestRank = Math.min(lowestRank, ...found.map((s) => s.rank));
    }
    if (!complete) continue;

    const granted = sets.find((s) => s.rank === lowestRank);
    if (granted) active.add(granted.id);
  }
  return active;
}

export function setById(id: SetId): ArmorSet {
  // Non-null: SetId only ever comes from ARMOR_SETS itself.
  return ARMOR_SETS.find((s) => s.id === id)!;
}
