// The overall character Level — separate from per-activity Skills. Fed BY skill
// leveling (each skill level-up grants the player that level-up's XP cost),
// and unlike skills it drives real stats: reaching level N grants N allocatable
// points spent across the stats below. First-pass numbers throughout — expect
// tuning, like every other system in this project.
//
// M-SS reworked every stat to a distinct, always-live axis relics don't touch:
// crit is split by AXIS (Strength = crit multiplier, Agility = crit chance,
// both all-weapon), Endurance/Vitality each got a flat bump plus a secondary
// regen/healing axis, and the old "spell/mana placeholder" pair became real
// XP-gain (Intelligence) / buff-duration (Wisdom) knobs. `willpower` was
// renamed `wisdom` in the same pass.
export type StatType = "endurance" | "vitality" | "strength" | "agility" | "intelligence" | "wisdom";
// (No "luck" — deliberately deferred; don't stub it in.)

export const STAT_TYPES: StatType[] = [
  "endurance",
  "vitality",
  "strength",
  "agility",
  "intelligence",
  "wisdom",
];

const STAT_NAMES: Record<StatType, string> = {
  endurance: "Endurance",
  vitality: "Vitality",
  strength: "Strength",
  agility: "Agility",
  intelligence: "Intelligence",
  wisdom: "Wisdom",
};
export function statDisplayName(stat: StatType): string {
  return STAT_NAMES[stat];
}

// Every stat now has a live mechanical effect (M-SS). Crit is the headline:
// Strength scales crit MULTIPLIER, Agility scales crit CHANCE — both apply to
// all weapons and multiply together, so a crit build wants both.
const STAT_DESCRIPTIONS: Record<StatType, string> = {
  endurance: "+3 max Stamina & +2% stamina regen per point",
  vitality: "+4 max HP & +1.5% healing received per point",
  strength: "+0.04x crit damage per point (all weapons)",
  agility: "+0.5% crit chance per point (all weapons)",
  intelligence: "+1.5% skill XP gain per point",
  wisdom: "+2% buff & food duration per point",
};
export function statDescription(stat: StatType): string {
  return STAT_DESCRIPTIONS[stat];
}

// The CURRENT cumulative effect of every point already spent on `stat` — shown
// on the Character menu's Stats tab so a player can see "how much +HP am I
// actually getting" rather than just the per-point rate (playtest request).
export function statTotalEffect(stat: StatType, p: PlayerProgression): string {
  const n = p.statValue(stat);
  const pct = (v: number, dp = 0) => `${(v * 100).toFixed(dp)}%`;
  switch (stat) {
    case "endurance":
      return `+${n * ENDURANCE_STAMINA_PER_POINT} max Stamina, +${pct(n * ENDURANCE_STAMINA_REGEN_PCT_PER_POINT)} regen`;
    case "vitality":
      return `+${n * VITALITY_HP_PER_POINT} max HP, +${pct(n * VITALITY_HEALING_PCT_PER_POINT, 1)} healing`;
    case "strength":
      return `+${(n * STRENGTH_CRIT_MULT_PER_POINT).toFixed(2)}x crit damage`;
    case "agility":
      return `+${pct(n * AGILITY_CRIT_CHANCE_PER_POINT, 1)} crit chance`;
    case "intelligence":
      return `+${pct(n * INT_XP_PCT_PER_POINT, 1)} skill XP`;
    case "wisdom":
      return `+${pct(n * WISDOM_BUFF_DURATION_PCT_PER_POINT)} buff duration`;
  }
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

// --- per-point stat values (M-SS, all tunable) ---
const ENDURANCE_STAMINA_PER_POINT = 3;
const ENDURANCE_STAMINA_REGEN_PCT_PER_POINT = 0.02; // +2% stamina regen rate
const VITALITY_HP_PER_POINT = 4;
const VITALITY_HEALING_PCT_PER_POINT = 0.015; // +1.5% healing received
const STRENGTH_CRIT_MULT_PER_POINT = 0.04; // +0.04x crit damage multiplier
const AGILITY_CRIT_CHANCE_PER_POINT = 0.005; // +0.5% crit chance
const INT_XP_PCT_PER_POINT = 0.015; // +1.5% skill XP gain
const WISDOM_BUFF_DURATION_PCT_PER_POINT = 0.02; // +2% buff/food duration

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
    wisdom: 0,
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

  // DEV-only direct set (the `setstat` console command) — bypasses unspentPoints
  // entirely, unlike allocate().
  setStat(stat: StatType, value: number): void {
    this.stats[stat] = Math.max(0, Math.round(value));
  }

  enduranceStaminaBonus(): number {
    return this.stats.endurance * ENDURANCE_STAMINA_PER_POINT;
  }
  vitalityHealthBonus(): number {
    return this.stats.vitality * VITALITY_HP_PER_POINT;
  }

  // --- M-SS secondary axes (multipliers/additives read at MainScene hooks) ---

  // Agility's additive crit-chance contribution (weapon base + relics add on
  // top; the total is soft-capped in MainScene's crit roll). Fraction, e.g.
  // 0.05 = +5%.
  critChanceBonus(): number {
    return this.stats.agility * AGILITY_CRIT_CHANCE_PER_POINT;
  }
  // Strength's additive crit-multiplier contribution (e.g. 0.4 = +0.4x).
  critMultBonus(): number {
    return this.stats.strength * STRENGTH_CRIT_MULT_PER_POINT;
  }
  // Vitality amplifies ALL healing received (food/Comfort/kill-heal) — NOT
  // passive regen (there is none). Multiplier, e.g. 1.15 at 10 Vitality.
  healingReceivedMult(): number {
    return 1 + this.stats.vitality * VITALITY_HEALING_PCT_PER_POINT;
  }
  // Endurance speeds stamina regen (an axis relics don't touch). Multiplier.
  staminaRegenMult(): number {
    return 1 + this.stats.endurance * ENDURANCE_STAMINA_REGEN_PCT_PER_POINT;
  }
  // Intelligence boosts all skill-XP gain (stacks additively with the
  // Scholar's-Idol relic's xpPct at the MainScene award site). Multiplier.
  xpMult(): number {
    return 1 + this.stats.intelligence * INT_XP_PCT_PER_POINT;
  }
  // Wisdom lengthens buff/food durations (auto-covers future buff procs).
  buffDurationMult(): number {
    return 1 + this.stats.wisdom * WISDOM_BUFF_DURATION_PCT_PER_POINT;
  }
}
