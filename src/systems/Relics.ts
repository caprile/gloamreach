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
//   Common trophy   → 1% Rare, 2.5% Uncommon, 20% Common (else fail)
//   Uncommon trophy → 1% Mythic, 5% Rare, else Uncommon (never fails)
//   Rare trophy     → 10% Mythic, else Rare (never fails)
// S4 (2026-07-15): Common's own-rarity band bumped 10%→20% (success 13.5%→23.5%)
// to soften the crumble tail — raw Common trophies drop free but crumbling most
// rolls read as pure feel-bad. Pity also cut 12→8 (below).
export const TROPHY_OUTCOME_ODDS: Record<RelicRarity, { rarity: RelicRarity; chance: number }[]> = {
  common: [
    { rarity: "rare", chance: 0.01 },
    { rarity: "uncommon", chance: 0.025 },
    { rarity: "common", chance: 0.2 },
  ],
  uncommon: [
    { rarity: "mythic", chance: 0.01 },
    { rarity: "rare", chance: 0.12 }, // 0.05→0.12 (2026-07-15: refined-uncommon rolls should hit Rare more)
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

// Resolve the produced result rarity for one roll given an outcome band list
// (null = the trophy failed / crumbled). Bands are the shared per-rarity table
// OR a trophy's own `outcomeOdds` override (the Boss Refined Trophy).
function rollOutcomeRarity(bands: { rarity: RelicRarity; chance: number }[], rng: () => number): RelicRarity | null {
  let r = rng();
  for (const band of bands) {
    if (r < band.chance) return band.rarity;
    r -= band.chance;
  }
  return null;
}

// Pity threshold: after this many consecutive misses of a trophy rarity, the
// next roll is a guaranteed base-rarity success (kills the low-% feel-bad tail).
// Only Common can miss, so only its value bites; the rest are moot (100% floor).
export const PITY_THRESHOLD: Record<RelicRarity, number> = {
  common: 8,
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

// --- Unique effects (bespoke Rare/Mythic procs) ---
//
// The single-family redesign (2026-07-15): every relic touches only its own
// family's axis, Common/Uncommon are a small flat stat, and Rare/Mythic carry a
// bespoke CONDITIONAL proc (a periodic spike — every Nth hit, on kill, on crit,
// on cooldown — NOT a permanent multiplier, which keeps them easy to balance).
// One `UniqueKind` per family; the Rare and Mythic of a family share the kind
// with scaled params. MainScene reads `RelicManager.unique(kind)` at the matching
// hook point. Magnitude params (percent/flat) get × powerTierMult(tier) at the
// use site; discrete params (Nth-hit interval, cooldown ms, revive count) stay
// fixed.
export type UniqueKind =
  | "onslaught" // damage: every Nth hit deals +bonusPct
  | "killrush" // move: on kill, movePct burst for ms (+ dash refund)
  | "guardian" // defense: bank `charges` hit-negates, one recharging per cooldownMs OUT of combat
  | "secondwind" // stamina: on kill restore restorePct of max stam (+ free-attack window)
  | "leech" // lifesteal: heal healPct of damage dealt (+ overheal shield)
  | "undying" // vitality: low-HP emergency heal (+ once-per-run revive)
  | "critsplash" // crit: crits splash splashPct within radius (+ slow)
  | "xpstreak"; // xp: chained kills ramp XP up to maxPct

export interface RelicUnique {
  kind: UniqueKind;
  params: Record<string, number>;
}

export interface RelicDef {
  id: string;
  name: string;
  rarity: RelicRarity;
  family: RelicFamily;
  effect: RelicEffect;
  // Rare/Mythic only — the bespoke conditional proc (read by MainScene hooks).
  unique?: RelicUnique;
}

// The relic pool. Effects scale up with rarity. PHASE 5: magnitudes trimmed to
// ~0.625x across the board (locked decision 8 — "Common damage +8%→~+5%,
// Mythic +40%→~+25%") so a tier-1 relic is a modest edge with real headroom
// above it (tier-2 badlands relics, future biomes). Still all first-pass/
// tunable. Only the Common pool is reachable from biome-1 trophies; badlands
// elites (Phase 5) source the same pool at Tier 2 (POWER_TIER_MULT ×1.5).
export const RELIC_DEFS: Record<string, RelicDef> = {
  // 2026-07-15 single-family redesign: every relic touches ONE family axis.
  // Common/Uncommon = a small flat stat (conservative — the anti-scaling worry).
  // Rare/Mythic REUSE Uncommon's stat number (the % plateaus) and add a bespoke
  // conditional proc; Mythic = a spicier version of its family's proc. Rarity is
  // ordered by rarity index (compareInstances), so the flat stat doesn't need to
  // grow to keep auto-replace clean.

  // --- common (small single stat) ---
  relic_warriors_charm: { id: "relic_warriors_charm", name: "Warrior's Charm", rarity: "common", family: "damage", effect: { damagePct: 4 } },
  relic_swift_charm: { id: "relic_swift_charm", name: "Swift Charm", rarity: "common", family: "move", effect: { moveSpeedPct: 4 } },
  relic_stoneskin_charm: { id: "relic_stoneskin_charm", name: "Stoneskin Charm", rarity: "common", family: "defense", effect: { damageTakenPct: -4 } },
  relic_tireless_charm: { id: "relic_tireless_charm", name: "Tireless Charm", rarity: "common", family: "stamina", effect: { staminaCostPct: -6 } },
  relic_bloodroot_charm: { id: "relic_bloodroot_charm", name: "Bloodroot Charm", rarity: "common", family: "lifesteal", effect: { killHeal: 1 } },
  relic_stout_charm: { id: "relic_stout_charm", name: "Stout Charm", rarity: "common", family: "vitality", effect: { maxHpPct: 8 } },
  relic_keen_charm: { id: "relic_keen_charm", name: "Keen Charm", rarity: "common", family: "crit", effect: { critChancePct: 3 } },
  relic_scholars_charm: { id: "relic_scholars_charm", name: "Scholar's Charm", rarity: "common", family: "xp", effect: { xpPct: 8 } },

  // --- uncommon (modestly bigger flat stat — the number PLATEAUS here) ---
  relic_warriors_idol: { id: "relic_warriors_idol", name: "Warrior's Idol", rarity: "uncommon", family: "damage", effect: { damagePct: 7 } },
  relic_swift_idol: { id: "relic_swift_idol", name: "Swift Idol", rarity: "uncommon", family: "move", effect: { moveSpeedPct: 7 } },
  relic_ironhide_idol: { id: "relic_ironhide_idol", name: "Ironhide Idol", rarity: "uncommon", family: "defense", effect: { damageTakenPct: -7 } },
  relic_tireless_idol: { id: "relic_tireless_idol", name: "Tireless Idol", rarity: "uncommon", family: "stamina", effect: { staminaCostPct: -10 } },
  relic_sanguine_idol: { id: "relic_sanguine_idol", name: "Sanguine Idol", rarity: "uncommon", family: "lifesteal", effect: { killHeal: 2 } },
  relic_vigor_idol: { id: "relic_vigor_idol", name: "Vigor Idol", rarity: "uncommon", family: "vitality", effect: { maxHpPct: 12 } },
  relic_savage_idol: { id: "relic_savage_idol", name: "Savage Idol", rarity: "uncommon", family: "crit", effect: { critChancePct: 5 } },
  relic_scholars_idol: { id: "relic_scholars_idol", name: "Scholar's Idol", rarity: "uncommon", family: "xp", effect: { xpPct: 14 } },

  // --- rare (Uncommon's stat + a family proc) ---
  relic_war_totem: { id: "relic_war_totem", name: "Onslaught Totem", rarity: "rare", family: "damage", effect: { damagePct: 7 }, unique: { kind: "onslaught", params: { interval: 5, bonusPct: 100 } } },
  relic_phantom_totem: { id: "relic_phantom_totem", name: "Fleetfoot Totem", rarity: "rare", family: "move", effect: { moveSpeedPct: 7 }, unique: { kind: "killrush", params: { movePct: 25, ms: 2500, dashRefund: 0 } } },
  relic_aegis_totem: { id: "relic_aegis_totem", name: "Aegis Totem", rarity: "rare", family: "defense", effect: { damageTakenPct: -7 }, unique: { kind: "guardian", params: { cooldownMs: 10000, charges: 1 } } },
  relic_endless_totem: { id: "relic_endless_totem", name: "Second Wind Totem", rarity: "rare", family: "stamina", effect: { staminaCostPct: -10 }, unique: { kind: "secondwind", params: { restorePct: 25, freeMs: 0 } } },
  relic_reaper_totem: { id: "relic_reaper_totem", name: "Reaper Totem", rarity: "rare", family: "lifesteal", effect: { killHeal: 2 }, unique: { kind: "leech", params: { healPct: 2, shieldPct: 0 } } },
  relic_titan_totem: { id: "relic_titan_totem", name: "Titan Totem", rarity: "rare", family: "vitality", effect: { maxHpPct: 12 }, unique: { kind: "undying", params: { lowHpHealPct: 25, thresholdPct: 25, cooldownMs: 60000 } } },
  relic_deadeye_totem: { id: "relic_deadeye_totem", name: "Deadeye Totem", rarity: "rare", family: "crit", effect: { critChancePct: 5 }, unique: { kind: "critsplash", params: { splashPct: 35, radius: 70, slowPct: 0, slowMs: 0 } } },
  relic_sage_totem: { id: "relic_sage_totem", name: "Sage Totem", rarity: "rare", family: "xp", effect: { xpPct: 14 }, unique: { kind: "xpstreak", params: { perKillPct: 8, maxPct: 50, windowMs: 4000 } } },

  // --- mythic (Uncommon's stat + a spicier version of the family proc) ---
  relic_avatars_mantle: { id: "relic_avatars_mantle", name: "Berserker's Mantle", rarity: "mythic", family: "damage", effect: { damagePct: 7 }, unique: { kind: "onslaught", params: { interval: 4, bonusPct: 100 } } },
  relic_windwalkers_mantle: { id: "relic_windwalkers_mantle", name: "Windwalker's Mantle", rarity: "mythic", family: "move", effect: { moveSpeedPct: 7 }, unique: { kind: "killrush", params: { movePct: 35, ms: 3500, dashRefund: 1 } } },
  relic_undying_heart: { id: "relic_undying_heart", name: "Bulwark Mantle", rarity: "mythic", family: "defense", effect: { damageTakenPct: -7 }, unique: { kind: "guardian", params: { cooldownMs: 10000, charges: 2 } } },
  relic_perpetual_mantle: { id: "relic_perpetual_mantle", name: "Perpetual Mantle", rarity: "mythic", family: "stamina", effect: { staminaCostPct: -10 }, unique: { kind: "secondwind", params: { restorePct: 40, freeMs: 2000 } } },
  relic_bloodlords_mantle: { id: "relic_bloodlords_mantle", name: "Bloodlord's Mantle", rarity: "mythic", family: "lifesteal", effect: { killHeal: 2 }, unique: { kind: "leech", params: { healPct: 4, shieldPct: 15 } } },
  relic_colossus_mantle: { id: "relic_colossus_mantle", name: "Colossus Mantle", rarity: "mythic", family: "vitality", effect: { maxHpPct: 12 }, unique: { kind: "undying", params: { revivePct: 40 } } },
  relic_assassins_mantle: { id: "relic_assassins_mantle", name: "Assassin's Mantle", rarity: "mythic", family: "crit", effect: { critChancePct: 5 }, unique: { kind: "critsplash", params: { splashPct: 50, radius: 90, slowPct: 30, slowMs: 1500 } } },
  relic_enlightened_mantle: { id: "relic_enlightened_mantle", name: "Enlightened Mantle", rarity: "mythic", family: "xp", effect: { xpPct: 14 }, unique: { kind: "xpstreak", params: { perKillPct: 10, maxPct: 90, windowMs: 5000 } } },
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
  // Optional per-trophy outcome-band override, replacing TROPHY_OUTCOME_ODDS[rarity].
  // The Boss Refined Trophy uses this for its bespoke "Rare, 50% roll-up to
  // Mythic" profile (which the shared Rare table can't express). Bands walk
  // highest-rarity-first, same as the shared table.
  outcomeOdds?: { rarity: RelicRarity; chance: number }[];
  // How many candidate relics a SUCCESSFUL roll offers the player to pick from
  // (biome-3 Phase 5). Absent or 1 = the original behaviour (one relic, granted
  // outright). Boss trophies set 3: they already guarantee a Mythic, and there's
  // exactly one Mythic per family, so the pick reads as "which family gets it?".
  // Data, not an isBossTrophy branch — any future trophy opts in by setting it.
  choiceCount?: number;
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
  // Bayou (biome 3) elite trophies — Tier 3 (×2.25), same Common rarity/outcome
  // table + shared pity as every other raw elite trophy. Deliberately NO tier-3
  // REFINE_RECIPES row yet: refining needs a tier-3 shard currency, which the
  // bayou's own POI/dungeon phases (4c/4d) will source — so these are roll-only
  // for now, exactly as biome-2's trophies were before Phase 5 added Ember Shards.
  mirejaw_trophy: { rarity: "common", powerTier: 3 },
  blighttoad_trophy: { rarity: "common", powerTier: 3 },
  mosswretch_trophy: { rarity: "common", powerTier: 3 },
  murkling_trophy: { rarity: "common", powerTier: 3 },
  fenlurker_trophy: { rarity: "common", powerTier: 3 },
  corpselight_trophy: { rarity: "common", powerTier: 3 },
  // Dormant this milestone — killing the King wins the run, so a fang can't be
  // spent yet. Correct + ready for M-W1's mid-bosses.
  gremlin_king_fang: { rarity: "rare", powerTier: 1 },
  // Boss trophies — S4 (2026-07-15): a main-boss kill now GUARANTEES a Mythic of
  // that boss's tier (locked with the user — main bosses only; mini-bosses keep
  // their refined-trophy drops). The Gremlin King is a biome-1 mid-run boss you
  // keep playing past, so its trophy (Tier 1) is spendable; the Duneshaper ends
  // the run, so its Tier-2 trophy is kept for correctness / a future continue
  // mode. Two keys so the tiers differ (T2 relics hit ×1.5).
  // Phase 5 (biome 3): both boss trophies now offer a CHOICE of 3 Mythics rather
  // than granting one at random — the payoff for a big-boss kill is picking which
  // family your guaranteed Mythic lands in.
  boss_refined_trophy: {
    rarity: "mythic",
    powerTier: 1,
    outcomeOdds: [{ rarity: "mythic", chance: 1.0 }],
    choiceCount: 3,
  },
  boss_refined_trophy_t2: {
    rarity: "mythic",
    powerTier: 2,
    outcomeOdds: [{ rarity: "mythic", chance: 1.0 }],
    choiceCount: 3,
  },
  // Miretyrant (biome-3 finale, and the current win-con). It used to drop the
  // Duneshaper's TIER-2 trophy (the user: "looks like myretyrant dropped a t2
  // relic?") — so the deepest boss in the game paid out at the previous biome's
  // magnitude. Tier 3 (x2.25) already existed for the bayou refined trophies;
  // the boss ladder just never got its rung.
  boss_refined_trophy_t3: {
    rarity: "mythic",
    powerTier: 3,
    outcomeOdds: [{ rarity: "mythic", chance: 1.0 }],
    choiceCount: 3,
  },
  // Refined trophies (Gloaming Vein loop, biome 1). Roll-only keys (produced
  // ONLY by refinement) so they climb trophies one rarity up into a
  // guaranteed-success roll. A Refined (Uncommon) trophy rolls the Uncommon
  // outcome table (100% floor + a 1% roll-up to Rare + a 1% Mythic band).
  // S4 (2026-07-15): the old maxRarity:"rare" cap is LIFTED (locked with the user)
  // so a mini-boss refined trophy can gamba into a Mythic, not just main bosses.
  refined_trophy_uncommon: { rarity: "uncommon", powerTier: 1 },
  refined_trophy_rare: { rarity: "rare", powerTier: 1 },
  // Tier-2 refined trophy (Phase 5) — badlands raw Common (Tier 2) trophies
  // refined via Ember Shards. Cap also lifted (S4), at Tier 2 magnitude.
  refined_trophy_uncommon_t2: { rarity: "uncommon", powerTier: 2 },
  refined_trophy_uncommon_t3: { rarity: "uncommon", powerTier: 3 },
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
  // BIOME 3: the bayou's six species all drop Common/Tier-3 trophies, and until
  // now there was no tier-3 row and no tier-3 currency — so the deepest trophies
  // in the game could only ever be gambled raw, never refined (the user playtest:
  // "badlands relic refining? new shards?"). Mire Shards close that, exactly the
  // way Ember Shards closed the tier-2 gap in Phase 5.
  { id: "refine_common_t3", inputRarity: "common", inputCount: 3, shardKey: "mire_shard", shardCount: 2, tier: 3, output: "refined_trophy_uncommon_t3" },
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

// Every shard conversion, as data. Was a single hardcoded Gloam->Ember path in
// the Convert tab; the bayou needed a second one, and a second hardcoded block
// is how the first drift starts. A deeper biome is now a row here plus its
// station-upgrade row — nothing in the menu changes.
export interface ShardConversion {
  id: string;
  fromKey: string;
  toKey: string;
  ratio: number;
  minStationTier: number; // Relic Forge tier that unlocks it
}

export const SHARD_CONVERSIONS: ShardConversion[] = [
  { id: "gloam_to_ember", fromKey: "gloam_shard", toKey: "ember_shard", ratio: GLOAM_TO_EMBER_RATIO, minStationTier: 2 },
  // Biome 3: the tier-3 currency. Same ratio and same shape — depth costs more
  // because the input is itself a converted currency, not because the rate got
  // worse.
  { id: "ember_to_mire", fromKey: "ember_shard", toKey: "mire_shard", ratio: 3, minStationTier: 3 },
];

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
  // Biome-3 Phase 5: a trophy with choiceCount > 1 (boss trophies) offers SEVERAL
  // candidate relics and lets the player pick one. While a pick is pending, `id`
  // is unset and NOTHING has been written to the loadout yet — the caller must
  // follow up with commitCandidate(), which fills in `id` + any familyConflict.
  candidates?: string[];
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

// Shard refund when a family conflict DISCARDS the just-rolled relic.
//
// EXPLOIT FIX (playtest — "am I netting ember shards?"): the old formula
// (REFUND_BASE[rarity] × powerTier) paid REAL shards on ANY displacement — but
// the trophy that produced the new relic drops FREE from an elite (zero shard
// cost), so rolling into an owned family and displacing the OLD relic was a NET
// shard source (roll → auto-replace → +shards, farmable). The rule now (locked
// with the user — "50% of the shard cost if the created relic doesn't replace one"):
//   • Replacing/upgrading (verdict "better" / Keep New) refunds NOTHING — getting
//     the better relic IS the reward, and the displaced OLD relic's cost is
//     unknowable anyway.
//   • Discarding the JUST-ROLLED relic (verdict "worse_or_equal" / Keep Old)
//     refunds 50% (floored) of the shards that trophy COST to make. Raw trophies
//     drop free (refund 0); only REFINED trophies — which cost shards at the
//     Relic Forge / Ember Kiln — pay half back, softening a wasted refined roll.
// Together this keeps rerolling from ever netting shards while still returning
// value on a costly refined-trophy roll that didn't make the loadout.
function shardKeyForTier(tier: number): string {
  if (tier >= 3) return "mire_shard";
  return tier >= 2 ? "ember_shard" : "gloam_shard";
}
// Refund for discarding the just-rolled relic — 50% (floored) of the trophy's
// shard cost. A refined trophy's cost is its REFINE_RECIPES row; a raw trophy
// isn't a refine output, so it refunds nothing.
function trophyDiscardRefund(trophyKey: string): { refundShardKey: string; refundShardAmount: number } {
  const recipe = REFINE_RECIPES.find((r) => r.output === trophyKey);
  if (!recipe) return { refundShardKey: "gloam_shard", refundShardAmount: 0 };
  return { refundShardKey: recipe.shardKey, refundShardAmount: Math.floor(recipe.shardCount * 0.5) };
}
// USER OVERRIDE (playtest): "relics that get replaced should get the partial
// refund also." A displacement that keeps the NEW relic and discards the OLD one
// now returns a SMALL, capped refund for the displaced old relic. We can't know
// which trophy made it, so it's a flat value by the old relic's rarity (tier-
// scaled). Kept small; the old net-farm worry is moot now that ember mobs supply
// shards directly, and to replace at all you must roll a strictly-better relic.
const REPLACE_REFUND_BY_RARITY: Record<RelicRarity, number> = { common: 1, uncommon: 2, rare: 3, mythic: 5 };
function replaceRefund(oldId: string, oldTier: number): { refundShardKey: string; refundShardAmount: number } {
  const rarity = RELIC_DEFS[oldId].rarity;
  const amt = Math.max(1, Math.round(REPLACE_REFUND_BY_RARITY[rarity] * (oldTier >= 2 ? 1.5 : 1)));
  return { refundShardKey: shardKeyForTier(oldTier), refundShardAmount: amt };
}

// Dominance comparison between two same-family relic instances. Since the
// single-family redesign (2026-07-15) each family has exactly one CURATED relic
// per rarity — a higher rarity is always a strict upgrade (same-or-bigger flat
// stat PLUS the unique proc) — so we order by RARITY, then power tier, NOT by the
// (now-plateau'd) numeric stat. This is what frees the flat stat to stop growing.
// `compareInstances` is only ever called same-family (roll() looks up
// instances[family]), so cross-family never reaches here.
//   "better"         — `a` strictly dominates: higher-or-equal on BOTH rarity and
//                      power tier (and strictly higher on at least one).
//   "worse_or_equal" — `a` is dominated: lower-or-equal on both, or identical.
//   "ambiguous"      — rarity and tier DISAGREE (one is higher rarity, the other
//                      higher tier). 2026-07-15: a higher-tier lower-rarity roll is
//                      no longer auto-declined — since rarity plateaus the flat stat
//                      at Uncommon and higher tiers scale it ×1.5+, a T2 Rare can
//                      genuinely out-stat a T1 Mythic (different proc) — so the
//                      player picks (Keep New / Keep Old) instead of the game guessing.
function compareInstances(aId: string, aTier: number, bId: string, bTier: number): "better" | "worse_or_equal" | "ambiguous" {
  const aRank = RELIC_RARITIES.indexOf(RELIC_DEFS[aId].rarity);
  const bRank = RELIC_RARITIES.indexOf(RELIC_DEFS[bId].rarity);
  if (aRank === bRank) {
    // Same rarity = the same curated id within a family — only power tier differs.
    return aTier > bTier ? "better" : "worse_or_equal";
  }
  if (aRank > bRank) {
    // New is higher rarity: a clean win only if its tier isn't behind.
    return aTier >= bTier ? "better" : "ambiguous";
  }
  // New is lower rarity: dominated unless its tier is ahead, which makes it a toss-up.
  return aTier > bTier ? "ambiguous" : "worse_or_equal";
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
  const base = parts.join(", ");
  const uq = uniqueText(def, powerTier);
  return uq ? (base ? `${base} · ${uq}` : uq) : base;
}

// Human one-line description of a relic's unique proc, scaled to a power tier.
// Magnitude params (percent/flat) scale by the tier mult; discrete params
// (interval, cooldown, durations, radius) are fixed. Empty for a proc-less relic.
export function uniqueText(def: RelicDef, powerTier = 1): string {
  const u = def.unique;
  if (!u) return "";
  const m = powerTierMult(powerTier);
  const p = u.params;
  const pct = (v: number) => (Math.abs(v * m) % 1 === 0 ? (v * m).toFixed(0) : (v * m).toFixed(1));
  const sec = (ms: number) => (ms % 1000 === 0 ? (ms / 1000).toFixed(0) : (ms / 1000).toFixed(1));
  switch (u.kind) {
    case "onslaught":
      return `every ${p.interval}th hit +${pct(p.bonusPct)}% damage`;
    case "killrush":
      return `on kill +${pct(p.movePct)}% move ${sec(p.ms)}s${p.dashRefund ? " + refunds dash" : ""}`;
    case "guardian":
      return p.charges > 1
        ? `holds ${p.charges} hit-negates; regains one per ${sec(p.cooldownMs)}s WITHOUT being hit`
        : `negates a hit; regains it after ${sec(p.cooldownMs)}s WITHOUT being hit`;
    case "secondwind":
      return `on kill restore ${pct(p.restorePct)}% max stamina${p.freeMs ? ` + ${sec(p.freeMs)}s free attacks` : ""}`;
    case "leech":
      return `heal ${pct(p.healPct)}% of damage dealt${p.shieldPct ? `, overheal → shield (≤${pct(p.shieldPct)}% max HP)` : ""}`;
    case "undying":
      return p.revivePct
        ? `survive one fatal hit per run (heal to ${pct(p.revivePct)}% HP)`
        : `heal ${pct(p.lowHpHealPct)}% max HP when below ${p.thresholdPct}% HP (every ${sec(p.cooldownMs)}s)`;
    case "critsplash":
      return `melee crits splash ${pct(p.splashPct)}% within ${p.radius}px${p.slowPct ? ` + ${pct(p.slowPct)}% slow ${sec(p.slowMs)}s` : ""}`;
    case "xpstreak":
      return `chained kills ramp +${pct(p.perKillPct)}%/kill up to +${pct(p.maxPct)}% XP`;
  }
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
  // The trophy key behind an unresolved "choice" verdict, so resolveChoice() can
  // compute the Keep-Old (discard-new) refund from its shard cost. Only one
  // choice is ever pending at a time (the forge blocks rolls until resolved).
  private pendingChoiceTrophyKey: string | null = null;
  // The contested OLD relic, so a Keep-New (replace) refund can be previewed.
  private pendingChoiceOldId: string | null = null;
  private pendingChoiceOldTier = 1;
  // Phase 5 (biome 3): an unresolved boss-trophy pick. The rarity + candidate set
  // are already decided; the loadout stays untouched until commitCandidate().
  private pendingCandidates: {
    ids: string[];
    powerTier: number;
    rarity: RelicRarity;
    trophyKey: string;
    pity: boolean;
  } | null = null;

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

    const bands = t.outcomeOdds ?? TROPHY_OUTCOME_ODDS[t.rarity];
    let resultRarity = rollOutcomeRarity(bands, rng);
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
    let pool = RELIC_POOLS[resultRarity];
    if (!pool.length) return null; // every rarity has a pool; guard for safety
    // S4: never hand back a Rare/Mythic id the player already owns — those are
    // the "chase" relics, and a duplicate would only contest its own family slot
    // (usually auto-declining), reading as a wasted lucky roll. Common/Uncommon
    // can still repeat — they churn through the family-dominance compare fine and
    // their pools are too small to reliably exclude. Guard the (unlikely) case of
    // owning every id in the pool by falling back to the full pool.
    if (resultRarity === "rare" || resultRarity === "mythic") {
      const owned = new Set(Object.values(this.instances).map((i) => i.id));
      const fresh = pool.filter((id) => !owned.has(id));
      if (fresh.length) pool = fresh;
    }
    // Phase 5: a trophy that offers a CHOICE draws several distinct candidates
    // and writes NOTHING yet — the loadout is only touched once the player picks
    // (commitCandidate). The rarity/candidate set is fixed here, at click, so an
    // interrupted spin still can't change the outcome.
    const choiceCount = Math.min(t.choiceCount ?? 1, pool.length);
    if (choiceCount > 1) {
      const candidates: string[] = [];
      const remaining = [...pool];
      for (let i = 0; i < choiceCount; i++) {
        candidates.push(remaining.splice(Math.floor(rng() * remaining.length), 1)[0]);
      }
      this.pendingCandidates = { ids: candidates, powerTier: t.powerTier, rarity: resultRarity, trophyKey, pity: pityHit };
      return { success: true, rarity: resultRarity, powerTier: t.powerTier, pity: pityHit, candidates };
    }

    const id = pool[Math.floor(rng() * pool.length)];
    return this.place(id, t.powerTier, trophyKey, { success: true, rarity: resultRarity, id, powerTier: t.powerTier, pity: pityHit });
  }

  // Write a resolved relic into its family slot, resolving any contest with the
  // relic already there. Shared by the single-relic roll path and Phase 5's
  // commitCandidate() so the two can't drift on the dominance rules.
  private place(id: string, powerTier: number, trophyKey: string, base: RollResult): RollResult {
    const family = RELIC_DEFS[id].family;
    const existing = this.instances[family];
    if (!existing) {
      this.instances[family] = { id, powerTier };
      return base;
    }

    const verdict = compareInstances(id, powerTier, existing.id, existing.powerTier);
    if (verdict === "better") {
      // New relic wins the slot — the OLD one is displaced with a small refund.
      this.instances[family] = { id, powerTier };
      return { ...base, familyConflict: { family, oldId: existing.id, oldPowerTier: existing.powerTier, verdict: "replaced", ...replaceRefund(existing.id, existing.powerTier) } };
    }
    if (verdict === "worse_or_equal") {
      // New relic is discarded — refund half its trophy's shard cost.
      const refund = trophyDiscardRefund(trophyKey);
      return { ...base, familyConflict: { family, oldId: existing.id, oldPowerTier: existing.powerTier, verdict: "declined", ...refund } };
    }
    // Ambiguous — leave ownership untouched until the caller resolves it, and
    // remember the trophy + old relic so resolveChoice()/previewChoiceRefunds()
    // can price both the Keep-Old and Keep-New refunds.
    this.pendingChoiceTrophyKey = trophyKey;
    this.pendingChoiceOldId = existing.id;
    this.pendingChoiceOldTier = existing.powerTier;
    return { ...base, familyConflict: { family, oldId: existing.id, oldPowerTier: existing.powerTier, verdict: "choice" } };
  }

  // --- Phase 5: boss-trophy relic pick ---

  // Whether a boss-trophy roll is waiting on the player to pick a candidate.
  // The forge blocks further rolls + tab switches while this is true.
  hasPendingCandidates(): boolean {
    return this.pendingCandidates !== null;
  }

  // The candidate ids awaiting a pick (empty when none is pending).
  pendingCandidateIds(): string[] {
    return this.pendingCandidates ? [...this.pendingCandidates.ids] : [];
  }

  // Commit one of the pending candidates into the loadout. `id` must be one of
  // the offered candidates — anything else is rejected, so a stale/forged click
  // can't grant an arbitrary relic. Returns the completed RollResult (with `id`
  // filled in and any family conflict resolved exactly as a normal roll would),
  // or null if nothing is pending.
  commitCandidate(id: string): RollResult | null {
    const pending = this.pendingCandidates;
    if (!pending || !pending.ids.includes(id)) return null;
    this.pendingCandidates = null;
    return this.place(id, pending.powerTier, pending.trophyKey, {
      success: true,
      rarity: pending.rarity,
      id,
      powerTier: pending.powerTier,
      pity: pending.pity,
    });
  }

  // Finalize an "ambiguous" family conflict once the player picks. `newId`/
  // `newPowerTier` are the just-rolled relic (from the RollResult). Returns
  // null if the family isn't actually contested (stale call).
  resolveChoice(family: RelicFamily, keepNew: boolean, newId: string, newPowerTier: number): ChoiceResolution | null {
    const existing = this.instances[family];
    if (!existing) return null;
    const trophyKey = this.pendingChoiceTrophyKey;
    this.pendingChoiceTrophyKey = null;
    if (keepNew) {
      // Old relic displaced — small refund for the discarded old relic.
      this.instances[family] = { id: newId, powerTier: newPowerTier };
      return { discardedId: existing.id, ...replaceRefund(existing.id, existing.powerTier) };
    }
    // Just-rolled relic discarded — refund half its trophy's shard cost.
    return { discardedId: newId, ...trophyDiscardRefund(trophyKey ?? "") };
  }

  // Preview the two refund outcomes for the pending "Keep New / Keep Old" prompt
  // (Keep New displaces the OLD relic → nothing; Keep Old discards the just-
  // rolled relic → half its trophy's shard cost). Reads the stored pending trophy.
  previewChoiceRefunds(): {
    keepNew: { refundShardKey: string; refundShardAmount: number };
    keepOld: { refundShardKey: string; refundShardAmount: number };
  } {
    const keepNew = this.pendingChoiceOldId
      ? replaceRefund(this.pendingChoiceOldId, this.pendingChoiceOldTier)
      : { refundShardKey: "gloam_shard", refundShardAmount: 0 };
    return { keepNew, keepOld: trophyDiscardRefund(this.pendingChoiceTrophyKey ?? "") };
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

  // The active unique proc of a given kind (at most one — ≤1 relic per family and
  // kind↔family), with its power tier so MainScene can scale magnitude params by
  // powerTierMult() at the use site. null = no owned relic has this proc.
  unique(kind: UniqueKind): { params: Record<string, number>; powerTier: number } | null {
    for (const family of RELIC_FAMILIES) {
      const inst = this.instances[family];
      if (!inst) continue;
      const u = RELIC_DEFS[inst.id].unique;
      if (u && u.kind === kind) return { params: u.params, powerTier: inst.powerTier };
    }
    return null;
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
