// Relics — the roguelike run-length passive-power system (M-RL, reworked in
// Phase 5). Trophies won from elites/bosses are consumed at a placed Relic
// Forge to attempt a PROBABILISTIC roll into a random relic. Two independent
// axes:
//   • Rarity (Common/Uncommon/Rare/Mythic) — which effect pool a relic comes
//     from. A trophy has its OWN rarity, which drives an OUTCOME TABLE over the
//     result rarity: a Common trophy can produce Common/Uncommon/Rare (never
//     Mythic) at its listed odds and can also FAIL; higher-rarity trophies
//     guarantee at least their own rarity with a chance to roll up. Rarity is
//     still source-determined by the trophy — NOT climbable via any manual
//     combine (see TROPHY_OUTCOME_ODDS; odds locked with the user 2026-07-11).
//   • Power tier (biome depth) — a magnitude multiplier on the relic's numbers
//     (POWER_TIER_MULT). A relic's power tier ALWAYS equals the trophy's tier.
//     Biome 1 trophies are Tier 1; badlands (biome 2) elite trophies are
//     Tier 2 (Phase 5) — a badlands run's relics hit noticeably harder.
//
// A roll consumes 1 trophy whether it succeeds or fails. As a hook, the very
// FIRST roll of a run is a guaranteed success (at the trophy's base rarity);
// beyond that a per-rarity PITY counter guarantees a base-rarity success after N
// consecutive misses.
//
// PHASE 5 REWORK — family-based ownership, NOT stacking. Every RelicDef has a
// `family` (damage/move/defense/stamina/lifesteal/vitality/crit/xp — the
// player's "loadout" is one relic per family, 8 max). Rolling a relic in a
// family you already own compares the two (a strict-dominance test over every
// effect the pair touches, direction-normalized so "lower is better" stats
// compare correctly):
//   • the new relic dominates  -> auto-REPLACE, the displaced relic refunds
//     Gloam/Ember Shards (scaled by its own rarity + tier).
//   • the OLD relic dominates or they're equal -> auto-DECLINE the new roll,
//     IT refunds shards instead (nothing changes, "wasted" roll -> a shard
//     dividend).
//   • neither dominates (e.g. a differing secondary stat) -> AMBIGUOUS; the
//     manager leaves ownership untouched and reports `familyConflict.verdict
//     === "choice"` — the caller must resolve it via `resolveChoice()` once
//     the player picks which one to keep. This is the only case a roll doesn't
//     fully resolve itself.
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

// The "loadout slot" a relic occupies — a player holds AT MOST ONE relic per
// family (Phase 5's higher-tier-replaces model, locked decision 7). A relic
// with a secondary stat still claims one primary family; the secondary stat
// only matters for the dominance comparison when a new roll contests the slot.
export type RelicFamily = "damage" | "move" | "defense" | "stamina" | "lifesteal" | "vitality" | "crit" | "xp";
export const RELIC_FAMILIES: RelicFamily[] = ["damage", "move", "defense", "stamina", "lifesteal", "vitality", "crit", "xp"];
const RELIC_FAMILY_NAMES: Record<RelicFamily, string> = {
  damage: "Damage",
  move: "Move Speed",
  defense: "Defense",
  stamina: "Stamina",
  lifesteal: "Lifesteal",
  vitality: "Vitality",
  crit: "Crit",
  xp: "XP",
};
export function relicFamilyName(f: RelicFamily): string {
  return RELIC_FAMILY_NAMES[f];
}

// Power-tier magnitude multipliers (1-based, geometric). A relic's effect
// numbers scale by this. Biome 1 sources Tier 1; badlands (biome 2) elites
// source Tier 2 (Phase 5); deeper biomes will source 3+. Missing tiers fall
// back to x1.
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
// across owned instances (one per family), each scaled by its power-tier mult.
export interface RelicEffect {
  damagePct?: number;
  moveSpeedPct?: number;
  staminaCostPct?: number; // negative = cheaper
  damageTakenPct?: number; // negative = less taken
  killHeal?: number; // flat HP per kill
  maxHp?: number; // flat + max HP (legacy; the seed pool now uses maxHpPct)
  maxStamina?: number; // flat + max stamina (legacy)
  xpPct?: number; // + skill XP
  // M-SS: HP/stamina relics went PERCENT so they MULTIPLY the stat-built base
  // (100 + Vitality×4 / 100 + Endurance×3) instead of a flat bump that dwarfs a
  // few stat points — relics now synergize with a stats build rather than
  // competing with it.
  maxHpPct?: number; // +% max HP (multiplies the stat-built base)
  maxStaminaPct?: number; // +% max stamina
  // M-SS crit channels. critChancePct is additive crit chance (5 = +5%);
  // critDamagePct is additive crit MULTIPLIER as a percent (30 = +0.30x). Both
  // stack onto weapon base + Agility/Strength; the totals are soft-capped in
  // MainScene's crit roll.
  critChancePct?: number;
  critDamagePct?: number;
}

// Which direction is "good" for a given effect key — used by the dominance
// comparison. true = higher raw value is better; false = lower (more negative)
// is better. Every RelicEffect key must appear here.
const HIGHER_IS_BETTER: Record<keyof RelicEffect, boolean> = {
  damagePct: true,
  moveSpeedPct: true,
  staminaCostPct: false,
  damageTakenPct: false,
  killHeal: true,
  maxHp: true,
  maxStamina: true,
  xpPct: true,
  maxHpPct: true,
  maxStaminaPct: true,
  critChancePct: true,
  critDamagePct: true,
};
// A single "goodness" score per key (higher is always better after this),
// so two effects can be compared key-by-key with one direction.
function goodness(key: keyof RelicEffect, value: number): number {
  return HIGHER_IS_BETTER[key] ? value : -value;
}

export interface RelicDef {
  id: string;
  name: string;
  rarity: RelicRarity;
  family: RelicFamily;
  effect: RelicEffect;
}

// The relic pool. Effects scale up with rarity. PHASE 5: magnitudes trimmed to
// ~0.625x across the board (locked decision 8 — "Common damage +8%→~+5%,
// Mythic +40%→~+25%") so a tier-1 relic is a modest edge with real headroom
// above it (tier-2 badlands relics, future biomes). Still all first-pass/
// tunable. Only the Common pool is reachable from biome-1 trophies; badlands
// elites (Phase 5) source the same pool at Tier 2 (POWER_TIER_MULT ×1.5).
export const RELIC_DEFS: Record<string, RelicDef> = {
  // --- common (small single-stat) ---
  relic_warriors_charm: { id: "relic_warriors_charm", name: "Warrior's Charm", rarity: "common", family: "damage", effect: { damagePct: 5 } },
  relic_swift_charm: { id: "relic_swift_charm", name: "Swift Charm", rarity: "common", family: "move", effect: { moveSpeedPct: 5 } },
  relic_stoneskin_charm: { id: "relic_stoneskin_charm", name: "Stoneskin Charm", rarity: "common", family: "defense", effect: { damageTakenPct: -5 } },
  relic_tireless_charm: { id: "relic_tireless_charm", name: "Tireless Charm", rarity: "common", family: "stamina", effect: { staminaCostPct: -8 } },
  relic_bloodroot_charm: { id: "relic_bloodroot_charm", name: "Bloodroot Charm", rarity: "common", family: "lifesteal", effect: { killHeal: 1 } },
  relic_stout_charm: { id: "relic_stout_charm", name: "Stout Charm", rarity: "common", family: "vitality", effect: { maxHpPct: 9 } },
  relic_keen_charm: { id: "relic_keen_charm", name: "Keen Charm", rarity: "common", family: "crit", effect: { critChancePct: 3 } },

  // --- uncommon (bigger single / small dual) ---
  relic_warriors_idol: { id: "relic_warriors_idol", name: "Warrior's Idol", rarity: "uncommon", family: "damage", effect: { damagePct: 10 } },
  relic_swift_idol: { id: "relic_swift_idol", name: "Swift Idol", rarity: "uncommon", family: "move", effect: { moveSpeedPct: 10 } },
  relic_ironhide_idol: { id: "relic_ironhide_idol", name: "Ironhide Idol", rarity: "uncommon", family: "defense", effect: { damageTakenPct: -9 } },
  relic_vigor_idol: { id: "relic_vigor_idol", name: "Vigor Idol", rarity: "uncommon", family: "vitality", effect: { maxHpPct: 13, maxStaminaPct: 11 } },
  relic_sanguine_idol: { id: "relic_sanguine_idol", name: "Sanguine Idol", rarity: "uncommon", family: "lifesteal", effect: { killHeal: 3 } },
  relic_scholars_idol: { id: "relic_scholars_idol", name: "Scholar's Idol", rarity: "uncommon", family: "xp", effect: { xpPct: 16 } },
  relic_savage_idol: { id: "relic_savage_idol", name: "Savage Idol", rarity: "uncommon", family: "crit", effect: { critDamagePct: 19 } },

  // --- rare (strong dual) ---
  relic_war_totem: { id: "relic_war_totem", name: "War Totem", rarity: "rare", family: "damage", effect: { damagePct: 16, staminaCostPct: -8 } },
  relic_phantom_totem: { id: "relic_phantom_totem", name: "Phantom Totem", rarity: "rare", family: "move", effect: { moveSpeedPct: 14, damageTakenPct: -8 } },
  relic_titan_totem: { id: "relic_titan_totem", name: "Titan Totem", rarity: "rare", family: "vitality", effect: { maxHpPct: 25, maxStaminaPct: 19 } },
  relic_reaper_totem: { id: "relic_reaper_totem", name: "Reaper Totem", rarity: "rare", family: "lifesteal", effect: { killHeal: 5, damagePct: 9 } },

  // --- mythic (very strong / triple) ---
  relic_gremlin_kings_wrath: { id: "relic_gremlin_kings_wrath", name: "Gremlin King's Wrath", rarity: "mythic", family: "damage", effect: { damagePct: 25, moveSpeedPct: 11 } },
  relic_undying_heart: { id: "relic_undying_heart", name: "Undying Heart", rarity: "mythic", family: "defense", effect: { killHeal: 9, damageTakenPct: -14 } },
  relic_avatars_mantle: { id: "relic_avatars_mantle", name: "Avatar's Mantle", rarity: "mythic", family: "damage", effect: { damagePct: 19, moveSpeedPct: 16, staminaCostPct: -13 } },
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
  // Optional hard cap on the PRODUCED relic rarity. Refined trophies use this:
  // a Refined (Uncommon) trophy rolls the Uncommon outcome table (which has a 1%
  // Mythic band), but refinement is already a gated climb — it shouldn't ALSO
  // gamba into the top rarity. A would-be result above this cap clamps down to
  // it. Absent = no cap (raw drops roll up freely to their table's max).
  maxRarity?: RelicRarity;
}
export const TROPHY_ROLL: Record<string, TrophyRoll> = {
  // Biome-1 elite trophies: Common / Tier 1 — they share the Common outcome
  // table + pity counter, so more elite variety just means more attempts.
  gremlin_trophy: { rarity: "common", powerTier: 1 },
  boar_trophy: { rarity: "common", powerTier: 1 },
  snake_trophy: { rarity: "common", powerTier: 1 },
  // Badlands (biome 2) elite trophies — PHASE 5: bumped to Tier 2 (locked
  // decision, 2026-07-13: "all badlands elites -> tier-2"). Still Common
  // rarity (same outcome table + pity as biome 1), but every relic they
  // produce is scaled ×1.5 (POWER_TIER_MULT[2]) — a badlands run's relics
  // hit noticeably harder without a rarer/rarer roll table.
  duskrunner_trophy: { rarity: "common", powerTier: 2 },
  cragscale_trophy: { rarity: "common", powerTier: 2 },
  hexling_trophy: { rarity: "common", powerTier: 2 },
  sandmaw_trophy: { rarity: "common", powerTier: 2 },
  // Dormant this milestone — killing the King wins the run, so a fang can't be
  // spent yet. Correct + ready for M-W1's mid-bosses.
  gremlin_king_fang: { rarity: "rare", powerTier: 1 },
  // Refined trophies (Gloaming Vein loop, biome 1). Roll-only keys (produced
  // ONLY by refinement) so they climb trophies one rarity up into a
  // guaranteed-success roll. A Refined (Uncommon) trophy rolls the Uncommon
  // outcome table (100% floor + a chance to roll up to Rare) but is CAPPED at
  // Rare — refinement is a gated climb, not a Mythic gamba.
  refined_trophy_uncommon: { rarity: "uncommon", powerTier: 1, maxRarity: "rare" },
  refined_trophy_rare: { rarity: "rare", powerTier: 1 },
  // Tier-2 refined trophy (Phase 5) — badlands raw Common (Tier 2) trophies
  // refined via Ember Shards. Same "capped at Rare" gate as the biome-1
  // refined trophy, just at Tier 2 magnitude.
  refined_trophy_uncommon_t2: { rarity: "uncommon", powerTier: 2, maxRarity: "rare" },
};

// --- Trophy refinement (Gloaming Vein / Ember Kiln) ---
//
// A GATED climb of trophy rarity (this deliberately overrides M-RL's "rarity is
// not climbable" lock — but behind a rare finite resource + a mini-boss/station
// upgrade, so it's consistent with "nothing free"). Raw trophies of a given
// rarity + shards are spent to produce ONE refined trophy of the next rarity
// up. Locked rules:
//   • Species-agnostic — any mix of same-rarity, same-tier raw trophies counts.
//   • Single-step + terminal — raw -> one up only; refined trophies are NEVER a
//     refine input (only raw-trophy keys qualify), which caps a tier at Refined
//     Uncommon and blocks an infinite ladder.
//   • Biome-tiered — a recipe requires trophy tier == shard tier. Biome 1 uses
//     Gloam Shards (Tier 1); badlands (Phase 5) uses Ember Shards (Tier 2),
//     which are themselves converted FROM Gloam Shards at the Relic Forge
//     once it reaches Lvl 3 (the Ember Kiln upgrade) — see GLOAM_TO_EMBER_RATIO.
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
  // Biome 1: 3 raw Common trophies (Tier 1) + 2 Gloam Shards -> 1 Refined (Uncommon).
  { id: "refine_common", inputRarity: "common", inputCount: 3, shardKey: "gloam_shard", shardCount: 2, tier: 1, output: "refined_trophy_uncommon" },
  // Scaffold for deeper biomes — no raw Uncommon trophy drops in biome 1, so
  // refinableTrophyKeys("uncommon", 1) is empty and this row never surfaces.
  { id: "refine_uncommon", inputRarity: "uncommon", inputCount: 3, shardKey: "gloam_shard", shardCount: 3, tier: 1, output: "refined_trophy_rare" },
  // PHASE 5: badlands Common trophies are Tier 2 now, so they need their own
  // tier-2 row, gated behind Ember Shards (the tier-2 refinement currency).
  { id: "refine_common_t2", inputRarity: "common", inputCount: 3, shardKey: "ember_shard", shardCount: 2, tier: 2, output: "refined_trophy_uncommon_t2" },
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

// --- Gloam -> Ember conversion (Relic Forge Lvl 3, "Ember Kiln") ---
// Once discovered, Gloam Shards can be rendered down into the tier-2
// refinement currency at this ratio (locked decision 12). One conversion =
// one action (mirrors a single craft/process click); the forge menu's Convert
// tab calls it repeatedly for a batch.
export const GLOAM_TO_EMBER_RATIO = 3; // 3 Gloam Shards -> 1 Ember Shard

// A single owned relic instance — an id at a specific power tier.
export interface RelicInstance {
  id: string;
  powerTier: number;
}

export interface RelicGroup {
  id: string;
  powerTier: number;
  def: RelicDef;
  family: RelicFamily;
}

// One of the 8 loadout slots, filled or empty — for a fixed-order display
// (the Relics inventory panel, paper-doll style).
export interface RelicFamilySlot {
  family: RelicFamily;
  label: string;
  group: RelicGroup | null;
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
  // Set when a successful roll contested a family slot already owned. See
  // RelicManager doc comment above for the three verdicts.
  familyConflict?: {
    family: RelicFamily;
    oldId: string;
    oldPowerTier: number;
    verdict: "replaced" | "declined" | "choice";
    // Only set for "replaced"/"declined" (auto-resolved) — the shards granted
    // for whichever relic got discarded. "choice" resolves via resolveChoice().
    refundShardKey?: string;
    refundShardAmount?: number;
  };
}

// Outcome of resolveChoice() — mirrors the auto-resolved familyConflict shape
// so the caller can reuse the same result-line rendering.
export interface ChoiceResolution {
  discardedId: string;
  refundShardKey: string;
  refundShardAmount: number;
}

// Shard refund on displacing a relic during a family conflict.
//
// EXPLOIT FIX (playtest — "am I netting ember shards?"): the old formula
// (REFUND_BASE[rarity] × powerTier) paid REAL shards — e.g. displacing a
// Common/T2 relic refunded 2 Ember Shards. But the trophy that produced the
// new relic drops FREE from an elite (zero shard cost), so rolling into an
// owned family and displacing was a NET shard source: roll → auto-replace →
// +2 Ember, farmable indefinitely. Since a RelicInstance doesn't track whether
// it came from a raw (free) or refined (shard-costed) trophy, there's no way to
// scale the refund to actual acquisition cost — and ANY positive refund on the
// free-trophy path is a net gain. So the displacement refund is now ZERO: an
// automatic replace/decline/choice consumes the trophy and gives nothing back
// (a wasted roll is just a wasted roll), which is the only accounting that
// makes displacing/rerolling provably never a shard source. The dominance
// behavior (auto-replace/decline/choice) is unchanged — only the payout is
// removed. The refund plumbing (RollResult.refundShard*, previewShardRefund,
// resolveChoice) is kept intact so a future explicit "dismantle for shards"
// sink can reuse it, and the UI simply omits any zero-amount refund line.
function shardKeyForTier(tier: number): string {
  return tier >= 2 ? "ember_shard" : "gloam_shard";
}
function shardRefund(id: string, powerTier: number): { refundShardKey: string; refundShardAmount: number } {
  return { refundShardKey: shardKeyForTier(powerTier), refundShardAmount: 0 };
}
// Public wrapper — lets UI preview a refund amount before the player commits
// to a choice (e.g. the family-conflict "Keep New / Keep Old" prompt).
export function previewShardRefund(id: string, powerTier: number): { refundShardKey: string; refundShardAmount: number } {
  return shardRefund(id, powerTier);
}

// Dominance comparison between two relic instances (already scaled to their
// own power tier). Returns:
//   "better"       — `a` is >= `b` on every effect key either touches, and
//                     strictly greater on at least one (direction-normalized).
//   "worse_or_equal" — `b` is >= `a` on everything (includes an exact tie).
//   "ambiguous"    — some keys favor `a`, others favor `b` (e.g. a differing
//                     secondary stat) — no clean winner.
function compareInstances(aId: string, aTier: number, bId: string, bTier: number): "better" | "worse_or_equal" | "ambiguous" {
  const aEff = RELIC_DEFS[aId].effect;
  const bEff = RELIC_DEFS[bId].effect;
  const aMult = powerTierMult(aTier);
  const bMult = powerTierMult(bTier);
  const keys = new Set<keyof RelicEffect>([...Object.keys(aEff), ...Object.keys(bEff)] as (keyof RelicEffect)[]);
  let aBetterCount = 0;
  let bBetterCount = 0;
  for (const key of keys) {
    const aVal = (aEff[key] ?? 0) * aMult;
    const bVal = (bEff[key] ?? 0) * bMult;
    const aGood = goodness(key, aVal);
    const bGood = goodness(key, bVal);
    if (aGood > bGood) aBetterCount++;
    else if (bGood > aGood) bBetterCount++;
  }
  if (aBetterCount > 0 && bBetterCount === 0) return "better";
  if (bBetterCount > 0 && aBetterCount === 0) return "worse_or_equal";
  if (aBetterCount === 0 && bBetterCount === 0) return "worse_or_equal"; // exact tie -> nothing gained, decline
  return "ambiguous";
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
  if (e.maxHpPct) parts.push(`+${pct(e.maxHpPct)}% max HP`);
  if (e.maxStaminaPct) parts.push(`+${pct(e.maxStaminaPct)}% max stamina`);
  if (e.critChancePct) parts.push(`+${pct(e.critChancePct)}% crit chance`);
  if (e.critDamagePct) parts.push(`+${(0.01 * e.critDamagePct * m).toFixed(2)}x crit damage`);
  if (e.xpPct) parts.push(`+${pct(e.xpPct)}% skill XP`);
  return parts.join(", ");
}
// Public wrapper — defaults to tier 1 (biome 1).
export function relicEffectText(def: RelicDef, powerTier = 1): string {
  return scaledEffectText(def, powerTier);
}

// --- aggregated "all relic effects" summary (Inventory Relics column) ---
//
// One display row per effect CHANNEL the loadout actually touches, with a
// formatted grand total plus the per-relic contributions behind it (so a hover
// can answer "which relic gives me this?"). Declaration order here is the
// display order. A value's tier scaling is already baked into the numbers the
// summary reports.
function fmtPct(v: number): string {
  return Math.abs(v) % 1 < 1e-6 ? v.toFixed(0) : v.toFixed(1);
}
const EFFECT_DISPLAY: { key: keyof RelicEffect; label: string; fmt: (v: number) => string }[] = [
  { key: "damagePct", label: "Damage", fmt: (v) => `+${fmtPct(v)}%` },
  { key: "critChancePct", label: "Crit Chance", fmt: (v) => `+${fmtPct(v)}%` },
  { key: "critDamagePct", label: "Crit Dmg", fmt: (v) => `+${(0.01 * v).toFixed(2)}x` },
  { key: "moveSpeedPct", label: "Move Speed", fmt: (v) => `+${fmtPct(v)}%` },
  { key: "damageTakenPct", label: "Dmg Taken", fmt: (v) => `${fmtPct(v)}%` }, // already negative = good
  { key: "staminaCostPct", label: "Stam. Cost", fmt: (v) => `${v > 0 ? "+" : ""}${fmtPct(v)}%` },
  { key: "killHeal", label: "HP/Kill", fmt: (v) => `+${Math.round(v)}` },
  { key: "maxHpPct", label: "Max HP", fmt: (v) => `+${fmtPct(v)}%` },
  { key: "maxStaminaPct", label: "Max Stam.", fmt: (v) => `+${fmtPct(v)}%` },
  { key: "maxHp", label: "Max HP", fmt: (v) => `+${Math.round(v)}` }, // legacy flat channels
  { key: "maxStamina", label: "Max Stam.", fmt: (v) => `+${Math.round(v)}` },
  { key: "xpPct", label: "Skill XP", fmt: (v) => `+${fmtPct(v)}%` },
];

// One aggregated channel: the grand total (formatted) + which relics feed it.
export interface RelicEffectSummary {
  key: keyof RelicEffect;
  label: string;
  total: string; // formatted aggregate, e.g. "+15%"
  sources: { name: string; rarity: RelicRarity; amount: string }[];
}

export class RelicManager {
  // At most one owned relic PER FAMILY (Phase 5's loadout model).
  private instances: Partial<Record<RelicFamily, RelicInstance>> = {};
  // Consecutive misses since the last success, per rarity (drives pity).
  private misses: Record<RelicRarity, number> = { common: 0, uncommon: 0, rare: 0, mythic: 0 };
  // The very first roll of a run is a guaranteed success (the "hook") — this
  // flips true after the first roll of any kind.
  private firstRollDone = false;

  count(): number {
    return Object.keys(this.instances).length;
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
  //
  // If the produced relic's family is already owned, this resolves the
  // conflict via compareInstances — "better"/"worse_or_equal" mutate
  // `instances` immediately and return the refund inline; "ambiguous" leaves
  // `instances` untouched and the caller must follow up with resolveChoice().
  roll(trophyKey: string, rng: () => number = Math.random): RollResult | null {
    const t = TROPHY_ROLL[trophyKey];
    if (!t) return null;

    let resultRarity = rollOutcomeRarity(t.rarity, rng);
    const firstRollHit = !resultRarity && !this.firstRollDone;
    const pityHit = !resultRarity && this.misses[t.rarity] + 1 >= PITY_THRESHOLD[t.rarity];
    if (!resultRarity && (firstRollHit || pityHit)) resultRarity = t.rarity;
    this.firstRollDone = true;

    // Clamp a rolled-up result to the trophy's cap (refined trophies cap below
    // Mythic). A pity/first-roll floor sets t.rarity, which is always <= cap.
    if (resultRarity && t.maxRarity && RELIC_RARITIES.indexOf(resultRarity) > RELIC_RARITIES.indexOf(t.maxRarity)) {
      resultRarity = t.maxRarity;
    }

    if (!resultRarity) {
      this.misses[t.rarity] += 1;
      return { success: false, rarity: t.rarity };
    }
    this.misses[t.rarity] = 0;
    const pool = RELIC_POOLS[resultRarity];
    if (!pool.length) return null; // every rarity has a pool; guard for safety
    const id = pool[Math.floor(rng() * pool.length)];
    const family = RELIC_DEFS[id].family;
    const base: RollResult = { success: true, rarity: resultRarity, id, powerTier: t.powerTier, pity: pityHit };

    const existing = this.instances[family];
    if (!existing) {
      this.instances[family] = { id, powerTier: t.powerTier };
      return base;
    }

    const verdict = compareInstances(id, t.powerTier, existing.id, existing.powerTier);
    if (verdict === "better") {
      const refund = shardRefund(existing.id, existing.powerTier);
      this.instances[family] = { id, powerTier: t.powerTier };
      return { ...base, familyConflict: { family, oldId: existing.id, oldPowerTier: existing.powerTier, verdict: "replaced", ...refund } };
    }
    if (verdict === "worse_or_equal") {
      const refund = shardRefund(id, t.powerTier);
      return { ...base, familyConflict: { family, oldId: existing.id, oldPowerTier: existing.powerTier, verdict: "declined", ...refund } };
    }
    // Ambiguous — leave ownership untouched until the caller resolves it.
    return { ...base, familyConflict: { family, oldId: existing.id, oldPowerTier: existing.powerTier, verdict: "choice" } };
  }

  // Finalize an "ambiguous" family conflict once the player picks. `newId`/
  // `newPowerTier` are the just-rolled relic (from the RollResult). Returns
  // null if the family isn't actually contested (stale call).
  resolveChoice(family: RelicFamily, keepNew: boolean, newId: string, newPowerTier: number): ChoiceResolution | null {
    const existing = this.instances[family];
    if (!existing) return null;
    if (keepNew) {
      const refund = shardRefund(existing.id, existing.powerTier);
      this.instances[family] = { id: newId, powerTier: newPowerTier };
      return { discardedId: existing.id, ...refund };
    }
    const refund = shardRefund(newId, newPowerTier);
    return { discardedId: newId, ...refund };
  }

  // Owned relics, one per family, ordered by ascending rarity then name — for
  // the HUD bar and forge grid.
  groupedForDisplay(): RelicGroup[] {
    const groups: RelicGroup[] = [];
    for (const family of RELIC_FAMILIES) {
      const inst = this.instances[family];
      if (!inst) continue;
      groups.push({ id: inst.id, powerTier: inst.powerTier, def: RELIC_DEFS[inst.id], family });
    }
    groups.sort((a, b) => {
      const ra = RELIC_RARITIES.indexOf(a.def.rarity);
      const rb = RELIC_RARITIES.indexOf(b.def.rarity);
      if (ra !== rb) return ra - rb;
      return a.def.name.localeCompare(b.def.name);
    });
    return groups;
  }

  // All 8 loadout slots in fixed order, filled or empty — for the Inventory
  // menu's paper-doll-style Relics column.
  familySlots(): RelicFamilySlot[] {
    return RELIC_FAMILIES.map((family) => {
      const inst = this.instances[family];
      const group: RelicGroup | null = inst ? { id: inst.id, powerTier: inst.powerTier, def: RELIC_DEFS[inst.id], family } : null;
      return { family, label: relicFamilyName(family), group };
    });
  }

  // Aggregated "all relic effects" view — one row per channel the loadout
  // actually touches, each with its formatted grand total and the per-relic
  // contributions behind it (for the Inventory Relics column's hover-to-see-
  // source breakdown). Skips channels no owned relic contributes to.
  effectSummary(): RelicEffectSummary[] {
    const out: RelicEffectSummary[] = [];
    for (const { key, label, fmt } of EFFECT_DISPLAY) {
      let total = 0;
      const sources: { name: string; rarity: RelicRarity; amount: string }[] = [];
      for (const family of RELIC_FAMILIES) {
        const inst = this.instances[family];
        if (!inst) continue;
        const base = RELIC_DEFS[inst.id].effect[key];
        if (!base) continue;
        const v = base * powerTierMult(inst.powerTier);
        total += v;
        sources.push({ name: RELIC_DEFS[inst.id].name, rarity: RELIC_DEFS[inst.id].rarity, amount: fmt(v) });
      }
      if (sources.length === 0) continue;
      out.push({ key, label, total: fmt(total), sources });
    }
    return out;
  }

  // Sum an effect channel across all owned instances (one per family), each
  // scaled by its power-tier multiplier.
  private sumEffect<K extends keyof RelicEffect>(key: K): number {
    let sum = 0;
    for (const family of RELIC_FAMILIES) {
      const inst = this.instances[family];
      if (!inst) continue;
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
  // M-SS: percent max-HP/stamina relics multiply the stat-built base in
  // MainScene.syncStatBonuses (so stats + relics compound instead of the flat
  // relic dwarfing a few stat points).
  maxHpPctMult(): number {
    return 1 + this.sumEffect("maxHpPct") / 100;
  }
  maxStaminaPctMult(): number {
    return 1 + this.sumEffect("maxStaminaPct") / 100;
  }
  // M-SS crit channels (additive onto weapon base + Agility/Strength; totals
  // soft-capped in the MainScene crit roll). Returned as fractions/multiplier
  // deltas: critChanceBonus 0.05 = +5%, critDamageBonus 0.30 = +0.30x.
  critChanceBonus(): number {
    return this.sumEffect("critChancePct") / 100;
  }
  critDamageBonus(): number {
    return this.sumEffect("critDamagePct") / 100;
  }
  xpMult(): number {
    return 1 + this.sumEffect("xpPct") / 100;
  }
}
