import type { DamageType } from "./Weapons";

// The overall character Level — separate from per-activity Skills. Fed BY skill
// leveling (each skill level-up grants the player that level-up's XP cost),
// and unlike skills it drives real stats: reaching level N grants N allocatable
// points spent across the stats below. First-pass numbers throughout — expect
// tuning, like every other system in this project.
export type StatType = "endurance" | "vitality" | "strength" | "agility" | "intelligence" | "willpower";
// (No "luck" — deliberately deferred; don't stub it in.)

export const STAT_TYPES: StatType[] = [
  "endurance",
  "vitality",
  "strength",
  "agility",
  "intelligence",
  "willpower",
];

const STAT_NAMES: Record<StatType, string> = {
  endurance: "Endurance",
  vitality: "Vitality",
  strength: "Strength",
  agility: "Agility",
  intelligence: "Intelligence",
  willpower: "Willpower",
};
export function statDisplayName(stat: StatType): string {
  return STAT_NAMES[stat];
}

// Intelligence/Willpower describe systems that don't exist yet (spell cast
// time, mana) — kept as placeholders per the user's own framing ("basically
// placeholders because these magical concepts don't exist in the game or
// plan yet"). No mechanical hook for either exists; the description is
// forward-looking only.
const STAT_DESCRIPTIONS: Record<StatType, string> = {
  endurance: "+1 max Stamina per point",
  vitality: "+1 max HP per point",
  strength: "-0.5% stamina cost — melee weapons, per point",
  agility: "-0.5% stamina cost — ranged weapons, per point",
  intelligence: "-0.5% spell cast time per point (no spells yet)",
  willpower: "-0.5% mana cost to magic attacks per point (no mana yet)",
};
export function statDescription(stat: StatType): string {
  return STAT_DESCRIPTIONS[stat];
}

// --- tunable constants ---
// XP to advance from `level` to `level+1`. Steeper than skills' linear curve so
// leveling feels fast early (fed by many skills leveling in parallel) and
// meaningful later. Bumped up significantly from an initial pass that let a
// player reach level 8-9 in a single normal play session mostly from passive
// skill XP (running/gathering) rather than deliberate combat — the curve, not
// the XP hooks, was the problem (audited addXp/hooks for double-counting;
// found none).
const XP_BASE = 150;
const XP_EXPONENT = 1.9;
export function xpToNextPlayerLevel(level: number): number {
  return Math.round(XP_BASE * Math.pow(level + 1, XP_EXPONENT));
}

const ENDURANCE_STAMINA_PER_POINT = 1;
const VITALITY_HP_PER_POINT = 1;
const STAMINA_COST_PCT_PER_POINT = 0.005; // -0.5% weapon stamina cost per point
const MIN_STAMINA_COST_MULT = 0.1; // floor so cost can't reach 0/negative

type LevelUpListener = (level: number, pointsAwarded: number) => void;

export class PlayerProgression {
  level = 1;
  xp = 0; // progress within the current level, in [0, xpToNextPlayerLevel(level))
  unspentPoints = 0;
  private stats: Record<StatType, number> = {
    endurance: 0,
    vitality: 0,
    strength: 0,
    agility: 0,
    intelligence: 0,
    willpower: 0,
  };
  private listeners: LevelUpListener[] = [];

  // Mirrors Skills.onLevelUp / EventLog.onAdd — array of listeners.
  onLevelUp(cb: LevelUpListener): void {
    this.listeners.push(cb);
  }

  // Grant player XP (sourced from skill level-ups). Rolls over into as many
  // levels as it covers; each new level N awards N points.
  addXp(amount: number): void {
    if (amount <= 0) return;
    this.xp += amount;
    while (this.xp >= xpToNextPlayerLevel(this.level)) {
      this.xp -= xpToNextPlayerLevel(this.level);
      this.level += 1;
      this.unspentPoints += this.level;
      for (const cb of this.listeners) cb(this.level, this.level);
    }
  }

  statValue(stat: StatType): number {
    return this.stats[stat];
  }

  // Spend one unspent point on `stat`. Returns false (no-op) if none unspent.
  allocate(stat: StatType): boolean {
    if (this.unspentPoints <= 0) return false;
    this.unspentPoints -= 1;
    this.stats[stat] += 1;
    return true;
  }

  enduranceStaminaBonus(): number {
    return this.stats.endurance * ENDURANCE_STAMINA_PER_POINT;
  }
  vitalityHealthBonus(): number {
    return this.stats.vitality * VITALITY_HP_PER_POINT;
  }
}

// Non-magical melee (slash/blunt/pierce) is scaled by Strength, ranged by
// Agility. Magic has no active stamina-cost stat today — Intelligence/
// Willpower's job is spell-cast-time/mana-cost, neither of which exist yet.
export function weaponStaminaCostMultiplier(dmgType: DamageType, p: PlayerProgression): number {
  if (dmgType === "magic") return 1;
  const stat: StatType = dmgType === "ranged" ? "agility" : "strength";
  return Math.max(MIN_STAMINA_COST_MULT, 1 - p.statValue(stat) * STAMINA_COST_PCT_PER_POINT);
}
