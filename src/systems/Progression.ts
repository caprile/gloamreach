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
  endurance: "+3 max Stamina & +1.5% stamina regen per point",
  vitality: "+4 max HP & +1% healing received per point",
  strength: "+0.015x crit damage per point (all weapons)",
  agility: "+0.3% crit chance per point (all weapons)",
  intelligence: "+1% skill XP gain per point",
  wisdom: "+2% buff/food duration & -0.5% ability cooldown per point",
};
export function statDescription(stat: StatType): string {
  return STAT_DESCRIPTIONS[stat];
}

// The CURRENT cumulative effect of every point already spent on `stat` — shown
// on the Character menu's Stats tab so a player can see "how much +HP am I
// actually getting" rather than just the per-point rate (playtest request).
//
// Reads the GETTERS rather than re-multiplying the per-point constants (B4-P3):
// that removes a standing duplication-drift risk and means a class's stat
// potency shows up here for free, with no second place to keep in sync.
export function statTotalEffect(stat: StatType, p: PlayerProgression): string {
  const pct = (v: number, dp = 0) => `${(v * 100).toFixed(dp)}%`;
  switch (stat) {
    case "endurance":
      return `+${p.enduranceStaminaBonus()} max Stamina, +${pct(p.staminaRegenMult() - 1)} regen`;
    case "vitality":
      return `+${p.vitalityHealthBonus()} max HP, +${pct(p.healingReceivedMult() - 1, 1)} healing`;
    case "strength":
      return `+${p.critMultBonus().toFixed(2)}x crit damage`;
    case "agility":
      return `+${pct(p.critChanceBonus(), 1)} crit chance`;
    case "intelligence":
      return `+${pct(p.xpMult() - 1, 1)} skill XP`;
    case "wisdom":
      return `+${pct(p.buffDurationMult() - 1)} buff duration, ${pct(p.abilityCooldownMult() - 1)} ability cooldown`;
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
// Playtest speed-up (S1 balance batch): lowered from 150/1.9 to reach a given
// level ~1.5x faster overall — the user wanted player levels & stat points to
// come noticeably quicker. Soft-cap behavior is untouched.
// Exponent 1.8 -> 1.7 (the user, ending biome 3 at level 21: "sorta feels like we
// don't level up fast enough if this is the 2nd to last biome"). Lowering the
// EXPONENT rather than the base is deliberate — it barely moves the early game
// (level 5 costs ~12% less) but takes a big bite out of the deep-run wall
// (level 21 costs ~29% less), which is exactly where the pace was flagging.
// D4 (2026-07-23): 110->85 (~1.29x faster). THIS is the lever that actually
// delivers "raise baseline XP for everyone" (Skills.ts's skillXpToNext
// coefficient, despite looking related, only affects skill-level pace — see
// its comment; player levels are governed by this curve alone). Sized to
// roughly replicate what the user's Ashcaller run ("this XP kinda feels like
// how the base character should be") got for free from its OWN
// `character.xpMult` (1.3, applying to every skill's raw XP INCOME before it
// ever reaches this curve) — a neutral class now gets close to that same felt
// pace without needing the class pick, and the Ashcaller's own multiplier is
// trimmed in Characters.ts so it's a lean bonus on top of this, not a second
// full stack. The EXPONENT is left alone; it's already been tuned twice
// specifically for late-run pace, and this pass is about the baseline everyone
// gets, not reshaping the curve again.
const XP_BASE = 85;
const XP_EXPONENT = 1.7;
export function xpToNextPlayerLevel(level: number): number {
  return Math.round(XP_BASE * Math.pow(level + 1, XP_EXPONENT));
}

// The hard ceiling on how many points may be allocated to ANY single stat.
//
// Why a point cap at all: an Ascetic playtest (2026-07-24) reached level 31 by
// farming renewable Sunken Shrines and dumped 118 points into Intelligence,
// which is a straight player-XP multiplier (all raw skill XP becomes player XP
// via Skills' onLevelUp feed) — i.e. Int paid for more Int, unbounded. Capping
// every stat bounds total character power no matter how long a run farms.
//
// Why 100 specifically: natural 3-biome play ends around level 24 = 300 points
// (verified with the user), and 6 stats x 100 = 600, so honest progression only
// ever spends ~half the budget — a real build choice, with the cap biting only
// the farm. Re-checked against the real XP curve: even a 5-biome run lands near
// level 29 (~435 points), so this has headroom for future biomes.
export const STAT_POINT_CAP = 100;

// --- per-point stat values (M-SS, retuned 2026-07-24) ---
//
// Retune rule (the user: "ideally I want all of these stats to have impact up to
// lvl 100 — otherwise feels weird"): every stat must still be GROWING at point
// 99. Strength was the offender — its crit-damage axis is capped at a combined
// 3.0x and base weapon mults run 1.5-1.8x, so a +0.04x/point rate burned the
// whole ~1.4x budget in ~35 points (24 for a 1.5-potency Reaver). The fix is a
// slower rate against the SAME ceiling, not a bigger ceiling: damage is already
// high, so nothing here raises a cap. Endurance's flat stamina, Vitality's flat
// HP and both Wisdom axes keep their old rates — they were already meaningful
// to 100 — while the % axes are trimmed so they saturate near the point cap
// rather than far short of it or never.
const ENDURANCE_STAMINA_PER_POINT = 3;
const ENDURANCE_STAMINA_REGEN_PCT_PER_POINT = 0.015; // +1.5% -> +150% at the cap
const VITALITY_HP_PER_POINT = 4;
const VITALITY_HEALING_PCT_PER_POINT = 0.01; // +1% -> +100% at the cap
// 0.015x/point reaches the 3.0x combined crit cap around point 93-100 against a
// 1.5x base weapon (earlier on a 1.8x pike or with a crit-damage relic, which is
// why MainScene's live critCapped check — not this constant — gates allocation).
const STRENGTH_CRIT_MULT_PER_POINT = 0.015;
// 0.0045 -> 0.003 (2026-07-26). At 0.45%/point a HIGH-POTENCY class saturated the
// 60% cap at roughly HALF the point cap: The user's x1.5-Agility Vagabond finished a
// run at 59% of 60 with 50 points spent, i.e. ~52 points was the whole stat, leaving
// him effectively five stats instead of six. Per the standing rule the ceiling is NOT
// raised (damage is already high) — the rate is slowed so the cap arrives near the
// point cap instead of far short of it. At x1.5 potency with a Mythic crit relic that
// now lands around point 87; at neutral potency with no relic it never caps at all,
// which is the intended "still growing at point 99".
const AGILITY_CRIT_CHANCE_PER_POINT = 0.003;
const INT_XP_PCT_PER_POINT = 0.01; // +1% -> +100% at the cap, closing the XP loop
const WISDOM_BUFF_DURATION_PCT_PER_POINT = 0.02; // +2% buff/food duration
// Wisdom's SECOND axis. Buff duration alone was invisible in play (the user, at 55
// points: "I put wisdom to 55 this run and I'm not sure I really felt it. what
// does it even do?") — longer food buffs are real but you never see the moment
// they pay off, and with three buffs running you top them up before they lapse
// anyway. Ability cooldown is an axis NOTHING else touches (Endurance=stamina,
// Vitality=HP, Str/Agi=crit, Int=XP) and it is felt every single cast. Capped so
// it can't collapse cooldowns entirely.
const WISDOM_ABILITY_CDR_PER_POINT = 0.005; // -0.5% ability cooldown
// Exported (not just local) so wisdomAbilityCdrCapped() below and the Stats-tab
// "CAPPED" marker (D9) can both compare against the exact same number rather
// than duplicating "100 points" as a magic constant in two files.
export const WISDOM_ABILITY_CDR_CAP = 0.5;

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
  // B4-P3: per-stat multiplier on the value of each allocated point, set once
  // from the run character. Living INSIDE this class (rather than at each
  // MainScene read site) is the whole trick — every getter and every stat
  // readout picks it up from one place, so no hook site had to change.
  private statPotency: Partial<Record<StatType, number>> = {};

  setStatPotency(map: Partial<Record<StatType, number>>): void {
    this.statPotency = { ...map };
  }

  potency(stat: StatType): number {
    return this.statPotency[stat] ?? 1;
  }

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

  // Spend up to `count` unspent points on `stat`, clamped by both the unspent
  // pool and STAT_POINT_CAP. Returns how many actually landed (0 = no-op), so a
  // batch button ("+5") can partially fill without ever overshooting the cap.
  allocate(stat: StatType, count = 1): number {
    const take = Math.min(count, this.unspentPoints, this.pointsUntilCap(stat));
    if (take <= 0) return 0;
    this.unspentPoints -= take;
    this.stats[stat] += take;
    return take;
  }

  // Headroom left on `stat` before STAT_POINT_CAP. Never negative — setStat (the
  // dev bypass) can legitimately push a stat past the cap.
  pointsUntilCap(stat: StatType): number {
    return Math.max(0, STAT_POINT_CAP - this.stats[stat]);
  }

  // True once `stat` cannot take another point. Distinct from an AXIS being
  // saturated (see wisdomAbilityCdrCapped / MainScene's critCapped): this is the
  // universal per-stat ceiling and applies to every stat equally.
  atPointCap(stat: StatType): boolean {
    return this.pointsUntilCap(stat) <= 0;
  }

  // DEV-only direct set (the `setstat` console command) — bypasses unspentPoints
  // entirely, unlike allocate().
  setStat(stat: StatType, value: number): void {
    this.stats[stat] = Math.max(0, Math.round(value));
  }

  // HP/stamina stay whole numbers (both feed bars the player reads as integers),
  // so potency rounds the TOTAL rather than the per-point rate.
  enduranceStaminaBonus(): number {
    return Math.round(this.stats.endurance * ENDURANCE_STAMINA_PER_POINT * this.potency("endurance"));
  }
  vitalityHealthBonus(): number {
    return Math.round(this.stats.vitality * VITALITY_HP_PER_POINT * this.potency("vitality"));
  }

  // --- M-SS secondary axes (multipliers/additives read at MainScene hooks) ---

  // Agility's additive crit-chance contribution (weapon base + relics add on
  // top; the total is soft-capped in MainScene's crit roll). Fraction, e.g.
  // 0.05 = +5%.
  critChanceBonus(): number {
    return this.stats.agility * AGILITY_CRIT_CHANCE_PER_POINT * this.potency("agility");
  }
  // Strength's additive crit-multiplier contribution (e.g. 0.4 = +0.4x).
  critMultBonus(): number {
    return this.stats.strength * STRENGTH_CRIT_MULT_PER_POINT * this.potency("strength");
  }

  // What ONE more point on each crit axis would actually add, potency included.
  // Exposed so the Stats tab can turn remaining cap headroom into "~N points
  // left" rather than only announcing the axis once it's already dead — the
  // constants stay private here, which is why this isn't computed at the UI.
  critChancePerPoint(): number {
    return AGILITY_CRIT_CHANCE_PER_POINT * this.potency("agility");
  }
  critMultPerPoint(): number {
    return STRENGTH_CRIT_MULT_PER_POINT * this.potency("strength");
  }
  // Vitality amplifies ALL healing received (food/Comfort/kill-heal) — NOT
  // passive regen (there is none). Multiplier, e.g. 1.15 at 10 Vitality.
  healingReceivedMult(): number {
    return 1 + this.stats.vitality * VITALITY_HEALING_PCT_PER_POINT * this.potency("vitality");
  }
  // Endurance speeds stamina regen (an axis relics don't touch). Multiplier.
  staminaRegenMult(): number {
    return 1 + this.stats.endurance * ENDURANCE_STAMINA_REGEN_PCT_PER_POINT * this.potency("endurance");
  }
  // Intelligence boosts all skill-XP gain (stacks additively with the
  // Scholar's-Idol relic's xpPct at the MainScene award site). Multiplier.
  xpMult(): number {
    return 1 + this.stats.intelligence * INT_XP_PCT_PER_POINT * this.potency("intelligence");
  }
  // Wisdom lengthens buff/food durations (auto-covers future buff procs).
  buffDurationMult(): number {
    return 1 + this.stats.wisdom * WISDOM_BUFF_DURATION_PCT_PER_POINT * this.potency("wisdom");
  }

  // Wisdom also shortens ability cooldowns. Multiplier applied to cooldownMs at
  // the single cast site, alongside the equipment one.
  abilityCooldownMult(): number {
    const cdr = Math.min(
      WISDOM_ABILITY_CDR_CAP,
      this.stats.wisdom * WISDOM_ABILITY_CDR_PER_POINT * this.potency("wisdom"),
    );
    return 1 - cdr;
  }

  // D9 (2026-07-23): Wisdom's ability-cooldown axis is reachable at exactly 100
  // points (the user had 112 and 12 of them were doing nothing, with no on-screen
  // indication). Unlike Strength/Agility's crit caps — which combine with
  // weapon base + relics + gear augments, so "how many points is too many"
  // depends on the whole build (see MainScene's critCapped dep) — this one
  // depends ONLY on the stat itself, so it can live here as a clean boolean.
  // Wisdom's OTHER axis (buff/food duration) is uncapped, so this being true
  // does not mean the stat as a whole has stopped mattering.
  wisdomAbilityCdrCapped(): boolean {
    return this.stats.wisdom * WISDOM_ABILITY_CDR_PER_POINT * this.potency("wisdom") >= WISDOM_ABILITY_CDR_CAP;
  }
}
