// Relics — the roguelike run-length passive-power system (M-RL). Trophies won
// from elites/bosses are consumed at a placed Relic Forge to attempt a
// PROBABILISTIC roll into a random relic. Two independent axes:
//   • Rarity (Common/Uncommon/Rare/Mythic) — which effect pool + roll odds a
//     relic comes from. Source-determined by the trophy; NOT climbable (there is
//     no manual combine — see the plan doc; this replaced an earlier combine
//     ladder idea).
//   • Power tier (biome depth) — a magnitude multiplier on the relic's numbers
//     (POWER_TIER_MULT). Flat x1.0 this milestone (single biome); scaffolding
//     that activates in M-W1.
//
// A roll consumes 1 trophy whether it succeeds or fails; success chance is set
// by rarity (Common 5% / Uncommon 10% / Rare 100%), with a per-rarity PITY
// counter that guarantees a success after N consecutive misses. Rolling a relic
// id (at a given power tier) you already own auto-stacks onto that entry (+count,
// aggregated stats) — that IS the "combining." Effects were always additive:
// each owned instance contributes base x its power-tier mult.
//
// Framework-free (no Phaser), like Health/Stamina/Buffs/Skills/Run. MainScene
// reads the aggregate effect getters at existing hook points, so wiring is
// declarative and a fresh `new RelicManager()` in create() fully resets the run.

export type RelicRarity = "common" | "uncommon" | "rare" | "mythic";

// Ascending order (drives the display sort + the rarity color ramp).
export const RELIC_RARITIES: RelicRarity[] = ["common", "uncommon", "rare", "mythic"];

const RARITY_NAMES: Record<RelicRarity, string> = {
  common: "Common",
  uncommon: "Uncommon",
  rare: "Rare",
  mythic: "Mythic",
};
export function rarityName(r: RelicRarity): string {
  return RARITY_NAMES[r];
}

// Phaser fill color (number) + text hex (string) per rarity — one source of
// truth for the gem tint, forge/bar borders, and colored labels.
export const RARITY_COLOR: Record<RelicRarity, number> = {
  common: 0x9aa4b2,
  uncommon: 0x5ad06a,
  rare: 0x4a9fe8,
  mythic: 0xe8a83c,
};
export function rarityHex(r: RelicRarity): string {
  return "#" + RARITY_COLOR[r].toString(16).padStart(6, "0");
}

// One placeholder gem icon per rarity (baked in BootScene), reused for every
// relic of that rarity — identity comes from the tooltip, not a unique sprite.
export function rarityIcon(r: RelicRarity): string {
  return `icon_relic_${r}`;
}

// Power-tier magnitude multipliers (1-based, geometric). A relic's effect
// numbers scale by this. Flat x1.0 this milestone; deeper biomes (M-W1) source
// higher power tiers. Missing tiers fall back to x1.
export const POWER_TIER_MULT: Record<number, number> = {
  1: 1.0,
  2: 1.5,
  3: 2.25,
  4: 3.375,
};
export function powerTierMult(tier: number): number {
  return POWER_TIER_MULT[tier] ?? 1;
}

// Per-rarity roll success chance and pity threshold (guaranteed success after
// this many consecutive misses of that rarity — kills the low-% feel-bad tail).
// All tunable; if Common feels thin at playtest, bump its chance here.
export const RARITY_SUCCESS_CHANCE: Record<RelicRarity, number> = {
  common: 0.05,
  uncommon: 0.1,
  rare: 1.0,
  mythic: 1.0,
};
export const PITY_THRESHOLD: Record<RelicRarity, number> = {
  common: 15,
  uncommon: 8,
  rare: 1, // 100% chance anyway; pity is moot
  mythic: 1,
};

// Passive effect channels a relic can contribute to. All optional; a relic sets
// only the ones it affects. Percentages are whole numbers (8 = +8%). Negative
// staminaCostPct/damageTakenPct REDUCE those (the good direction). Aggregated
// across owned instances, each scaled by its power-tier mult.
export interface RelicEffect {
  damagePct?: number;
  moveSpeedPct?: number;
  staminaCostPct?: number; // negative = cheaper
  damageTakenPct?: number; // negative = less taken
  killHeal?: number; // flat HP per kill
  maxHp?: number; // flat + max HP
  maxStamina?: number; // flat + max stamina
  xpPct?: number; // + skill XP
}

export interface RelicDef {
  id: string;
  name: string;
  rarity: RelicRarity;
  effect: RelicEffect;
}

// The relic pool. Effects scale up with rarity. First-pass numbers, all tunable.
// Only the Common pool is reachable this milestone (gremlin_trophy → Common);
// the rest are scaffolding for M-W1's trophy sources / deeper biomes.
export const RELIC_DEFS: Record<string, RelicDef> = {
  // --- common (small single-stat) ---
  relic_warriors_charm: { id: "relic_warriors_charm", name: "Warrior's Charm", rarity: "common", effect: { damagePct: 8 } },
  relic_swift_charm: { id: "relic_swift_charm", name: "Swift Charm", rarity: "common", effect: { moveSpeedPct: 8 } },
  relic_stoneskin_charm: { id: "relic_stoneskin_charm", name: "Stoneskin Charm", rarity: "common", effect: { damageTakenPct: -8 } },
  relic_tireless_charm: { id: "relic_tireless_charm", name: "Tireless Charm", rarity: "common", effect: { staminaCostPct: -12 } },
  relic_bloodroot_charm: { id: "relic_bloodroot_charm", name: "Bloodroot Charm", rarity: "common", effect: { killHeal: 2 } },
  relic_stout_charm: { id: "relic_stout_charm", name: "Stout Charm", rarity: "common", effect: { maxHp: 15 } },

  // --- uncommon (bigger single / small dual) ---
  relic_warriors_idol: { id: "relic_warriors_idol", name: "Warrior's Idol", rarity: "uncommon", effect: { damagePct: 16 } },
  relic_swift_idol: { id: "relic_swift_idol", name: "Swift Idol", rarity: "uncommon", effect: { moveSpeedPct: 16 } },
  relic_ironhide_idol: { id: "relic_ironhide_idol", name: "Ironhide Idol", rarity: "uncommon", effect: { damageTakenPct: -14 } },
  relic_vigor_idol: { id: "relic_vigor_idol", name: "Vigor Idol", rarity: "uncommon", effect: { maxHp: 25, maxStamina: 20 } },
  relic_sanguine_idol: { id: "relic_sanguine_idol", name: "Sanguine Idol", rarity: "uncommon", effect: { killHeal: 4 } },
  relic_scholars_idol: { id: "relic_scholars_idol", name: "Scholar's Idol", rarity: "uncommon", effect: { xpPct: 25 } },

  // --- rare (strong dual) ---
  relic_war_totem: { id: "relic_war_totem", name: "War Totem", rarity: "rare", effect: { damagePct: 26, staminaCostPct: -12 } },
  relic_phantom_totem: { id: "relic_phantom_totem", name: "Phantom Totem", rarity: "rare", effect: { moveSpeedPct: 22, damageTakenPct: -12 } },
  relic_titan_totem: { id: "relic_titan_totem", name: "Titan Totem", rarity: "rare", effect: { maxHp: 50, maxStamina: 35 } },
  relic_reaper_totem: { id: "relic_reaper_totem", name: "Reaper Totem", rarity: "rare", effect: { killHeal: 8, damagePct: 14 } },

  // --- mythic (very strong / triple) ---
  relic_gremlin_kings_wrath: { id: "relic_gremlin_kings_wrath", name: "Gremlin King's Wrath", rarity: "mythic", effect: { damagePct: 40, moveSpeedPct: 18 } },
  relic_undying_heart: { id: "relic_undying_heart", name: "Undying Heart", rarity: "mythic", effect: { killHeal: 15, damageTakenPct: -22 } },
  relic_avatars_mantle: { id: "relic_avatars_mantle", name: "Avatar's Mantle", rarity: "mythic", effect: { damagePct: 30, moveSpeedPct: 25, staminaCostPct: -20 } },
};

// Relic ids grouped by rarity (the roll pools). Built once from the def table.
export const RELIC_POOLS: Record<RelicRarity, string[]> = (() => {
  const out: Record<RelicRarity, string[]> = { common: [], uncommon: [], rare: [], mythic: [] };
  for (const id of Object.keys(RELIC_DEFS)) out[RELIC_DEFS[id].rarity].push(id);
  return out;
})();

// What a trophy rolls: the rarity pool, the power tier of the resulting relic,
// and the per-attempt success chance (sourced from the rarity table).
export interface TrophyRoll {
  rarity: RelicRarity;
  powerTier: number;
  successChance: number;
}
export const TROPHY_ROLL: Record<string, TrophyRoll> = {
  gremlin_trophy: { rarity: "common", powerTier: 1, successChance: RARITY_SUCCESS_CHANCE.common },
  // Dormant this milestone — killing the King wins the run, so a fang can't be
  // spent yet. Correct + ready for M-W1's mid-bosses.
  gremlin_king_fang: { rarity: "rare", powerTier: 1, successChance: RARITY_SUCCESS_CHANCE.rare },
};

// A single owned relic instance — an id at a specific power tier. Duplicates
// (same id + tier) are collapsed for display but each contributes its effect.
export interface RelicInstance {
  id: string;
  powerTier: number;
}

export interface RelicGroup {
  id: string;
  powerTier: number;
  def: RelicDef;
  count: number;
}

// Outcome of a roll attempt (the trophy is always consumed by the caller).
export interface RollResult {
  success: boolean;
  rarity: RelicRarity;
  id?: string; // set on success
  powerTier?: number; // set on success
  pity?: boolean; // success was forced by the pity counter
}

// A relic's effect numbers scaled to a power tier, for tooltip text.
function scaledEffectText(def: RelicDef, powerTier: number): string {
  const m = powerTierMult(powerTier);
  const e = def.effect;
  const pct = (v: number) => (Math.abs(v * m) % 1 === 0 ? (v * m).toFixed(0) : (v * m).toFixed(1));
  const flat = (v: number) => Math.round(v * m).toString();
  const parts: string[] = [];
  if (e.damagePct) parts.push(`+${pct(e.damagePct)}% damage`);
  if (e.moveSpeedPct) parts.push(`+${pct(e.moveSpeedPct)}% move speed`);
  if (e.staminaCostPct) parts.push(`${e.staminaCostPct > 0 ? "+" : ""}${pct(e.staminaCostPct)}% stamina cost`);
  if (e.damageTakenPct) parts.push(`${pct(e.damageTakenPct)}% damage taken`);
  if (e.killHeal) parts.push(`+${flat(e.killHeal)} HP on kill`);
  if (e.maxHp) parts.push(`+${flat(e.maxHp)} max HP`);
  if (e.maxStamina) parts.push(`+${flat(e.maxStamina)} max stamina`);
  if (e.xpPct) parts.push(`+${pct(e.xpPct)}% skill XP`);
  return parts.join(", ");
}
// Public wrapper — defaults to tier 1 (the only tier this milestone).
export function relicEffectText(def: RelicDef, powerTier = 1): string {
  return scaledEffectText(def, powerTier);
}

export class RelicManager {
  // Owned relic instances; duplicates allowed (stacked effects).
  private instances: RelicInstance[] = [];
  // Consecutive misses since the last success, per rarity (drives pity).
  private misses: Record<RelicRarity, number> = { common: 0, uncommon: 0, rare: 0, mythic: 0 };

  count(): number {
    return this.instances.length;
  }

  // Current consecutive-miss count for a rarity (for a forge pity readout).
  missStreak(rarity: RelicRarity): number {
    return this.misses[rarity];
  }

  // Attempt a roll by consuming one trophy of `trophyKey`. Returns the outcome
  // (the CALLER consumes the trophy either way — success or fail). On success a
  // random relic of the trophy's rarity/power-tier is added (auto-stacked).
  // Pity: a success is forced once misses reach the rarity's threshold.
  roll(trophyKey: string, rng: () => number = Math.random): RollResult | null {
    const t = TROPHY_ROLL[trophyKey];
    if (!t) return null;
    const pool = RELIC_POOLS[t.rarity];
    if (!pool.length) return null;

    const pityHit = this.misses[t.rarity] + 1 >= PITY_THRESHOLD[t.rarity];
    const success = pityHit || rng() < t.successChance;
    if (!success) {
      this.misses[t.rarity] += 1;
      return { success: false, rarity: t.rarity };
    }
    this.misses[t.rarity] = 0;
    const id = pool[Math.floor(rng() * pool.length)];
    this.instances.push({ id, powerTier: t.powerTier });
    return { success: true, rarity: t.rarity, id, powerTier: t.powerTier, pity: pityHit };
  }

  // Owned relics collapsed to (id, powerTier, count) groups, ordered by
  // ascending rarity, then name, then power tier — for the bar and forge list.
  groupedForDisplay(): RelicGroup[] {
    const counts = new Map<string, number>();
    for (const inst of this.instances) {
      const key = `${inst.id}@${inst.powerTier}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    const groups: RelicGroup[] = [];
    for (const [key, count] of counts) {
      const [id, tierStr] = key.split("@");
      groups.push({ id, powerTier: Number(tierStr), def: RELIC_DEFS[id], count });
    }
    groups.sort((a, b) => {
      const ra = RELIC_RARITIES.indexOf(a.def.rarity);
      const rb = RELIC_RARITIES.indexOf(b.def.rarity);
      if (ra !== rb) return ra - rb;
      if (a.def.name !== b.def.name) return a.def.name.localeCompare(b.def.name);
      return a.powerTier - b.powerTier;
    });
    return groups;
  }

  // Sum an effect channel across all owned instances, each scaled by its
  // power-tier multiplier.
  private sumEffect<K extends keyof RelicEffect>(key: K): number {
    let sum = 0;
    for (const inst of this.instances) {
      const base = RELIC_DEFS[inst.id].effect[key];
      if (base) sum += base * powerTierMult(inst.powerTier);
    }
    return sum;
  }

  // --- aggregate effect getters (read at MainScene hook points) ---

  damageMult(): number {
    return 1 + this.sumEffect("damagePct") / 100;
  }
  moveSpeedMult(): number {
    return 1 + this.sumEffect("moveSpeedPct") / 100;
  }
  // Floored so no stack of relics grants free actions.
  staminaCostMult(): number {
    return Math.max(0.25, 1 + this.sumEffect("staminaCostPct") / 100);
  }
  damageTakenMult(): number {
    return Math.max(0.25, 1 + this.sumEffect("damageTakenPct") / 100);
  }
  killHeal(): number {
    return this.sumEffect("killHeal");
  }
  maxHpBonus(): number {
    return Math.round(this.sumEffect("maxHp"));
  }
  maxStaminaBonus(): number {
    return Math.round(this.sumEffect("maxStamina"));
  }
  xpMult(): number {
    return 1 + this.sumEffect("xpPct") / 100;
  }
}
