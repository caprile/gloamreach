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

export type SetId = "embersteel" | "emberhide";

export interface ArmorSet {
  id: SetId;
  name: string;
  pieces: string[]; // item keys — ALL required for the full-set bonus (no partials)
  bonusName: string;
  bonusDesc: string;
}

export const ARMOR_SETS: ArmorSet[] = [
  {
    id: "embersteel",
    name: "Embersteel",
    pieces: ["embersteel_helm", "embersteel_cuirass", "embersteel_greaves"],
    bonusName: "Molten Bulwark",
    bonusDesc: "Immune to knockback. Melee attackers are seared for fire damage.",
  },
  {
    id: "emberhide",
    name: "Emberhide",
    pieces: ["emberhide_hood", "emberhide_vest", "emberhide_leggings"],
    bonusName: "Emberblink",
    bonusDesc: "Your dash travels farther and erupts in fire where you land.",
  },
];

// Which full sets are currently worn. Set membership is purely by item key, so a
// piece's per-instance upgrade tier is irrelevant (the Ember tier has no further
// right-click upgrade anyway — the reforge IS its upgrade).
export function activeSets(slots: (EquippedItem | null)[]): Set<SetId> {
  const worn = new Set<string>();
  for (const s of slots) if (s) worn.add(s.key);
  const active = new Set<SetId>();
  for (const set of ARMOR_SETS) {
    if (set.pieces.every((k) => worn.has(k))) active.add(set.id);
  }
  return active;
}

export function setById(id: SetId): ArmorSet {
  // Non-null: SetId only ever comes from ARMOR_SETS itself.
  return ARMOR_SETS.find((s) => s.id === id)!;
}
