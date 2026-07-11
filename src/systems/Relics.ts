// Relics — the roguelike run-length passive-power system (M-RL). Trophies won
// from elites/bosses are consumed at a placed Relic Forge to attempt a
// PROBABILISTIC roll into a random relic. Two independent axes:
//   • Rarity (Common/Uncommon/Rare/Mythic) — which effect pool a relic comes
//     from. A trophy has its OWN rarity, which drives an OUTCOME TABLE over the
//     result rarity: a Common trophy can produce Common/Uncommon/Rare (never
//     Mythic) at its listed odds and can also FAIL; higher-rarity trophies
//     guarantee at least their own rarity with a chance to roll up. Rarity is
//     still source-determined by the trophy — NOT climbable via any manual
//     combine (see TROPHY_OUTCOME_ODDS; odds locked with the user 2026-07-11).
//   • Power tier (biome depth) — a magnitude multiplier on the relic's numbers
//     (POWER_TIER_MULT). A relic's power tier ALWAYS equals the trophy's tier
//     (a Tier-1 trophy only ever produces a Tier-1 relic). Flat x1.0 this
//     milestone (single biome); scaffolding that activates in M-W1.
//
// A roll consumes 1 trophy whether it succeeds or fails. As a hook, the very
// FIRST roll of a run is a guaranteed success (at the trophy's base rarity);
// beyond that a per-rarity PITY counter guarantees a base-rarity success after N
// consecutive misses. Rolling a relic id (at a given power tier) you already own
// auto-stacks onto that entry (+count, aggregated stats) — that IS the
// "combining." Effects were always additive: each owned instance contributes
// base x its power-tier mult.
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

// Outcome table per TROPHY rarity: ordered highest-rarity-first bands. A roll
// draws one number in [0,1) and walks the bands, subtracting each chance, to
// pick the produced rarity — so the listed `chance` values ARE the exact
// per-rarity odds. A trophy whose bands don't sum to 1 can FAIL (crumble): only
// Common does (13.5% total), since Uncommon/Rare have a 100% floor band at their
// own rarity. Locked odds (the user, 2026-07-11):
//   Common trophy   → 1% Rare, 2.5% Uncommon, 10% Common (else fail)
//   Uncommon trophy → 1% Mythic, 5% Rare, else Uncommon (never fails)
//   Rare trophy     → 10% Mythic, else Rare (never fails)
export const TROPHY_OUTCOME_ODDS: Record<RelicRarity, { rarity: RelicRarity; chance: number }[]> = {
  common: [
    { rarity: "rare", chance: 0.01 },
    { rarity: "uncommon", chance: 0.025 },
    { rarity: "common", chance: 0.1 },
  ],
  uncommon: [
    { rarity: "mythic", chance: 0.01 },
    { rarity: "rare", chance: 0.05 },
    { rarity: "uncommon", chance: 1.0 },
  ],
  rare: [
    { rarity: "mythic", chance: 0.1 },
    { rarity: "rare", chance: 1.0 },
  ],
  mythic: [{ rarity: "mythic", chance: 1.0 }],
};

// Overall chance a trophy of this rarity produces ANY relic (sum of its bands,
// capped at 1) — for the forge/dashboard "success %" readout.
export function trophyOverallSuccessChance(trophyRarity: RelicRarity): number {
  return Math.min(1, TROPHY_OUTCOME_ODDS[trophyRarity].reduce((s, b) => s + b.chance, 0));
}

// Resolve the produced result rarity for one roll of a trophy of the given
// rarity (null = the trophy failed / crumbled).
function rollOutcomeRarity(trophyRarity: RelicRarity, rng: () => number): RelicRarity | null {
  let r = rng();
  for (const band of TROPHY_OUTCOME_ODDS[trophyRarity]) {
    if (r < band.chance) return band.rarity;
    r -= band.chance;
  }
  return null;
}

// Pity threshold: after this many consecutive misses of a trophy rarity, the
// next roll is a guaranteed base-rarity success (kills the low-% feel-bad tail).
// Only Common can miss, so only its value bites; the rest are moot (100% floor).
export const PITY_THRESHOLD: Record<RelicRarity, number> = {
  common: 12,
  uncommon: 8,
  rare: 1, // 100% floor anyway; pity is moot
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

// What a trophy rolls: its own rarity (drives the outcome table above) and the
// power tier of the resulting relic (always == the trophy's tier).
export interface TrophyRoll {
  rarity: RelicRarity;
  powerTier: number;
}
export const TROPHY_ROLL: Record<string, TrophyRoll> = {
  // Every first-biome elite trophy is Common / Tier 1 — they share the Common
  // outcome table + pity counter, so more elite variety just means more attempts
  // (not fragmented odds). Deeper biomes (M-W1) remap a species' trophy to a
  // higher rarity/tier per source.
  gremlin_trophy: { rarity: "common", powerTier: 1 },
  boar_trophy: { rarity: "common", powerTier: 1 },
  snake_trophy: { rarity: "common", powerTier: 1 },
  // Dormant this milestone — killing the King wins the run, so a fang can't be
  // spent yet. Correct + ready for M-W1's mid-bosses.
  gremlin_king_fang: { rarity: "rare", powerTier: 1 },
  // Refined trophies (Gloaming Vein loop). Roll-only keys — produced ONLY by
  // refinement (never dropped, never a refine input themselves), so they climb
  // trophies one rarity up into a guaranteed-success roll. A Refined (Uncommon)
  // trophy rolls the Uncommon outcome table (100% floor + chances to roll up).
  refined_trophy_uncommon: { rarity: "uncommon", powerTier: 1 },
  refined_trophy_rare: { rarity: "rare", powerTier: 1 },
};

// --- Trophy refinement (Gloaming Vein) ---
//
// A GATED climb of trophy rarity (this deliberately overrides M-RL's "rarity is
// not climbable" lock — but behind a rare finite resource + a mini-boss, so it's
// consistent with "nothing free"). Raw trophies of a given rarity + Gloam Shards
// are spent to produce ONE refined trophy of the next rarity up. Locked rules:
//   • Species-agnostic — any mix of same-rarity raw trophies counts (all raw
//     trophies already share one roll pool + pity, so species is cosmetic).
//   • Single-step + terminal — raw -> one up only; refined trophies are NEVER a
//     refine input (only raw-trophy keys qualify), which caps biome 1 at Refined
//     Uncommon and blocks an infinite ladder.
//   • Biome-tiered — a recipe requires trophy tier == shard tier (both Tier 1
//     now). Deeper biomes (M-W1) add higher-tier rows with their own ore.
export interface RefineRecipe {
  id: string;
  inputRarity: RelicRarity; // raw trophies of THIS rarity qualify as input (species-agnostic)
  inputCount: number;
  shardKey: string;
  shardCount: number;
  tier: number; // biome tier — input trophies AND the shard must both be this tier
  output: string; // the produced refined-trophy item key
}

export const REFINE_RECIPES: RefineRecipe[] = [
  // Biome 1: 3 raw Common trophies + 2 Gloam Shards -> 1 Refined (Uncommon).
  { id: "refine_common", inputRarity: "common", inputCount: 3, shardKey: "gloam_shard", shardCount: 2, tier: 1, output: "refined_trophy_uncommon" },
  // Scaffold for deeper biomes — no raw Uncommon trophy drops in biome 1, so
  // refinableTrophyKeys("uncommon", 1) is empty and this row never surfaces.
  // M-W1 re-keys the ore/tier when a deeper biome actually drops raw Uncommons.
  { id: "refine_uncommon", inputRarity: "uncommon", inputCount: 3, shardKey: "gloam_shard", shardCount: 3, tier: 1, output: "refined_trophy_rare" },
];

// Raw (non-refined) trophy keys of a given rarity + tier — the eligible inputs
// for a refine recipe. Excludes refined_* keys (roll-only, never re-refined).
export function refinableTrophyKeys(rarity: RelicRarity, tier: number): string[] {
  return Object.keys(TROPHY_ROLL).filter(
    (k) => !k.startsWith("refined_") && TROPHY_ROLL[k].rarity === rarity && TROPHY_ROLL[k].powerTier === tier,
  );
}

// Total qualifying raw trophies the player owns for a recipe (summed across
// species). `count` reads the backpack.
export function ownedRefineInput(recipe: RefineRecipe, count: (key: string) => number): number {
  return refinableTrophyKeys(recipe.inputRarity, recipe.tier).reduce((s, k) => s + count(k), 0);
}

export function canAffordRefine(recipe: RefineRecipe, count: (key: string) => number): boolean {
  return ownedRefineInput(recipe, count) >= recipe.inputCount && count(recipe.shardKey) >= recipe.shardCount;
}

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
// `rarity` is the PRODUCED relic's rarity on success (which may exceed the
// trophy's own rarity if it rolled up), or the trophy's rarity on failure.
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
  // The very first roll of a run is a guaranteed success (the "hook") — this
  // flips true after the first roll of any kind.
  private firstRollDone = false;

  count(): number {
    return this.instances.length;
  }

  // Current consecutive-miss count for a rarity (for a forge pity readout).
  missStreak(rarity: RelicRarity): number {
    return this.misses[rarity];
  }

  // Whether the next roll would be the run's first (and thus guaranteed) — the
  // forge surfaces this so the hook is discoverable.
  isFirstRollPending(): boolean {
    return !this.firstRollDone;
  }

  // Attempt a roll by consuming one trophy of `trophyKey`. Returns the outcome
  // (the CALLER consumes the trophy either way — success or fail). The trophy's
  // rarity drives an outcome table (rollOutcomeRarity) that resolves the PRODUCED
  // rarity, which may roll up past the trophy's own. The relic's power tier
  // always equals the trophy's tier. A would-be failure is floored to a
  // base-rarity success on (a) the run's first roll ever, or (b) once misses
  // reach the pity threshold.
  roll(trophyKey: string, rng: () => number = Math.random): RollResult | null {
    const t = TROPHY_ROLL[trophyKey];
    if (!t) return null;

    let resultRarity = rollOutcomeRarity(t.rarity, rng);
    const firstRollHit = !resultRarity && !this.firstRollDone;
    const pityHit = !resultRarity && this.misses[t.rarity] + 1 >= PITY_THRESHOLD[t.rarity];
    if (!resultRarity && (firstRollHit || pityHit)) resultRarity = t.rarity;
    this.firstRollDone = true;

    if (!resultRarity) {
      this.misses[t.rarity] += 1;
      return { success: false, rarity: t.rarity };
    }
    this.misses[t.rarity] = 0;
    const pool = RELIC_POOLS[resultRarity];
    if (!pool.length) return null; // every rarity has a pool; guard for safety
    const id = pool[Math.floor(rng() * pool.length)];
    this.instances.push({ id, powerTier: t.powerTier });
    return { success: true, rarity: resultRarity, id, powerTier: t.powerTier, pity: pityHit };
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
