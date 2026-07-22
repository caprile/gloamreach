// Epic loot (B4-P2) — the shared special-item pool the biome-3 roadmap specced
// in Phase 2b and that phase never shipped.
//
// Pure data + two tiny helpers, framework-free like Run/Buffs/Characters, so
// BOTH MainScene (which rolls) and the POI entity classes (which glow) can read
// it without either importing the other. The mapping from a POI's loot table to
// its tier lives in MainScene, since the tables do.
//
// Deliberately TIERED BY POI DEPTH rather than one flat pool on every table: a
// Gremlin Shack five minutes into a run must not be able to hand out a
// found-only active the crypts are supposed to gate. Each tier is a superset of
// the one above, so depth only ever adds options. Chances are first-pass.
import type { EpicPool, LootContainer } from "./LootContainer";

// Shallow biome-1 spoils: two modest utility uniques.
const T1_KEYS = ["ring_sparkbound", "amulet_long_dark"];

// Mid-depth: the stronger passives, including the only status-resist item.
const T2_KEYS = [...T1_KEYS, "ring_gloamwrought_signet", "ring_deep_vein", "back_mireborn_cloak"];

// Deepest content — and the ONLY source of the three found-only actives, so the
// crypts and the chieftain's hut have a payoff no recipe and no shallower chest
// can substitute for.
const T3_KEYS = [
  ...T2_KEYS,
  "amulet_choirbone",
  "special_gravebind_coil",
  "special_pale_choir_lance",
  "back_drowned_king_shroud",
];

export const EPIC_POOL_T1: EpicPool = { chance: 0.04, keys: T1_KEYS };
export const EPIC_POOL_T2: EpicPool = { chance: 0.06, keys: T2_KEYS };
export const EPIC_POOL_T3: EpicPool = { chance: 0.08, keys: T3_KEYS };

// Every epic key, for the pickup toast + the container glow. T3 is the superset.
export const EPIC_ITEM_KEYS: ReadonlySet<string> = new Set(T3_KEYS);

// Container-glow tint. Rather than adding a second glow object per POI (and a
// second infinite tween to leak), an epic waiting inside just burns whiter on
// the glow each container already has. Takes the container's OWN base tint back
// as a parameter so the existing per-POI colours (the Lodge's pale huts vs the
// chieftain's gold, etc.) are preserved when there's nothing rare inside.
export const EPIC_GLOW_TINT = 0xfff6d0;

export function glowTintFor(loot: LootContainer, baseTint: number): number {
  return loot.holdsAny(EPIC_ITEM_KEYS) ? EPIC_GLOW_TINT : baseTint;
}
