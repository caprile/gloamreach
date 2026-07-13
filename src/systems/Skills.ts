import type { DamageType } from "./Weapons";
import { PLAYER_WALK_SPEED } from "../entities/Player";

// Skills are per-activity levels. For now they ONLY gate recipes (via
// Recipe.requiredSkills) — a skill level has no stat/damage effect itself.
// Leveling a skill DOES feed the separate overall Player Level (Progression.ts)
// via the onLevelUp subscriber. Several skill types below have no XP source
// wired yet (slash/pierce/ranged/magic/heavy_armor/blocking) — they exist so
// future content (ranged/magic weapons, heavy armor, a block/parry mechanic)
// slots in without a redesign.
//
// The 5 weapon skills reuse Weapons.ts's DamageType literals verbatim, so a
// weapon's primary damage type IS a SkillType with no mapping table.
export type SkillType =
  | DamageType // "slash" | "blunt" | "pierce" | "ranged" | "magic"
  | "heavy_armor"
  | "light_armor"
  | "running"
  | "blocking"
  | "chopping"
  | "mining";

// Grouping for the Character menu's Skills tab.
export const WEAPON_SKILLS: SkillType[] = ["slash", "blunt", "pierce", "ranged", "magic"];
export const ARMOR_SKILLS: SkillType[] = ["heavy_armor", "light_armor"];
export const GENERAL_SKILLS: SkillType[] = ["running", "blocking", "chopping", "mining"];
export const SKILL_TYPES: SkillType[] = [...WEAPON_SKILLS, ...ARMOR_SKILLS, ...GENERAL_SKILLS];

// Soft cap via natural leveling. A future item effect may push a skill past
// this — don't inline "100" elsewhere; import this constant so raising the cap
// later stays a one-line change.
export const MAX_SKILL_LEVEL = 100;

const SKILL_NAMES: Record<SkillType, string> = {
  slash: "Slash",
  blunt: "Blunt",
  pierce: "Pierce",
  ranged: "Ranged",
  magic: "Magic",
  heavy_armor: "Heavy Armor",
  light_armor: "Light Armor",
  running: "Running",
  blocking: "Blocking",
  chopping: "Chopping",
  mining: "Mining",
};
export function skillDisplayName(skill: SkillType): string {
  return SKILL_NAMES[skill];
}

// XP to advance from `level` to `level + 1`. A refill-style bar (each level's
// bar empties/refills), not a cumulative total: 0->1 is 100, 1->2 is 200, etc.
// First-pass numbers — expect tuning as more XP sources land.
export function skillXpToNext(level: number): number {
  return 100 * (level + 1);
}

const WEAPON_SKILL_DAMAGE_PCT_PER_LEVEL = 0.005; // +0.5% weapon damage per level

// The mechanical payoff of leveling a weapon skill (Slash/Blunt/Pierce/Ranged/
// Magic only — armor/general skills have none). Shown on hover in the
// Character menu via skillImpactDescription below.
export function weaponSkillDamageMultiplier(skill: SkillType, skills: Skills): number {
  if (!WEAPON_SKILLS.includes(skill)) return 1;
  return 1 + skills.get(skill) * WEAPON_SKILL_DAMAGE_PCT_PER_LEVEL;
}

// Sprint speed (multiplies Player's base walk speed while sprinting). Rescaled
// per the user: 1.75x at Running lvl 0, climbing to 2.25x at the lvl-100 soft
// cap — still exactly +0.5% of base speed per level, only the base changed.
// First-pass numbers, tunable like everything else.
const BASE_SPRINT_MULTIPLIER = 1.75;
const RUNNING_SPRINT_BONUS_PER_LEVEL = 0.005;
export function runningSprintMultiplier(skills: Skills): number {
  return BASE_SPRINT_MULTIPLIER + skills.get("running") * RUNNING_SPRINT_BONUS_PER_LEVEL;
}

// --- M-SS: second real effects for previously one-note / dormant skills ---

// light_armor extends the dash i-frame window (Monster Hunter "Evade Window").
// +5ms/level over the 150ms base, capped at +100ms (→ 250ms max). Live now
// since light gear exists.
const LIGHT_ARMOR_IFRAME_MS_PER_LEVEL = 5;
const LIGHT_ARMOR_IFRAME_CAP_MS = 100;
export function dashIframeBonusMs(skills: Skills): number {
  return Math.min(LIGHT_ARMOR_IFRAME_CAP_MS, skills.get("light_armor") * LIGHT_ARMOR_IFRAME_MS_PER_LEVEL);
}

// running also reduces sprint stamina drain: -1%/level, capped at -40%.
const RUNNING_DRAIN_REDUCTION_PER_LEVEL = 0.01;
const RUNNING_DRAIN_REDUCTION_CAP = 0.4;
export function sprintStaminaDrainMult(skills: Skills): number {
  return 1 - Math.min(RUNNING_DRAIN_REDUCTION_CAP, skills.get("running") * RUNNING_DRAIN_REDUCTION_PER_LEVEL);
}

// heavy_armor: partial mitigation of magic/FIRE damage (which bypasses the flat
// armor term — see MainScene.applyDamageToPlayer). This is heavy armor's
// identity vs light's dodge i-frames: it EATS elemental hits. -0.4%/level,
// capped at -30%. Only applied while wearing at least one heavy piece (gated in
// MainScene, not here). First-pass numbers.
const HEAVY_ARMOR_MAGIC_MIT_PER_LEVEL = 0.004;
const HEAVY_ARMOR_MAGIC_MIT_CAP = 0.3;
export function heavyArmorMagicMitigation(skills: Skills): number {
  return Math.min(HEAVY_ARMOR_MAGIC_MIT_CAP, skills.get("heavy_armor") * HEAVY_ARMOR_MAGIC_MIT_PER_LEVEL);
}

// chopping/mining: chance for a bonus +1 drop on a depleted tree / rock (incl.
// Gloam ore). +1%/level, soft-capped at 60%.
const GATHER_BONUS_CHANCE_PER_LEVEL = 0.01;
const GATHER_BONUS_CHANCE_CAP = 0.6;
export function choppingBonusChance(skills: Skills): number {
  return Math.min(GATHER_BONUS_CHANCE_CAP, skills.get("chopping") * GATHER_BONUS_CHANCE_PER_LEVEL);
}
export function miningBonusChance(skills: Skills): number {
  return Math.min(GATHER_BONUS_CHANCE_CAP, skills.get("mining") * GATHER_BONUS_CHANCE_PER_LEVEL);
}

// Hover-tooltip text for a skill's mechanical impact — always returns
// something so every skill's row is hoverable, even ones with no live effect
// yet (per the user: they want visibility into what a level is *actually*
// doing today, not just a generic rate). Live-computed off the real current
// level/skills instance, not a static per-level rate string.
export function skillImpactDescription(skill: SkillType, skills: Skills): string {
  if (WEAPON_SKILLS.includes(skill)) {
    const level = skills.get(skill);
    const pct = level * WEAPON_SKILL_DAMAGE_PCT_PER_LEVEL * 100;
    return `+0.5% weapon damage per level — currently +${pct.toFixed(1)}% at Lvl ${level}`;
  }
  if (skill === "running") {
    const level = skills.get("running");
    const mult = runningSprintMultiplier(skills);
    const sprint = Math.round(PLAYER_WALK_SPEED * mult);
    const drainCut = Math.round((1 - sprintStaminaDrainMult(skills)) * 100);
    return `+0.5% sprint speed & -1% sprint stamina drain per level — Sprint ${sprint} (x${mult.toFixed(2)}), -${drainCut}% drain at Lvl ${level}`;
  }
  if (skill === "light_armor") {
    const level = skills.get("light_armor");
    const bonus = dashIframeBonusMs(skills);
    return `+5ms dash i-frames per level (cap +100ms) — dodge window ${150 + bonus}ms at Lvl ${level}`;
  }
  if (skill === "chopping") {
    const pct = Math.round(choppingBonusChance(skills) * 100);
    return `+1% bonus-drop chance on trees per level (cap 60%) — currently ${pct}% for +1 wood`;
  }
  if (skill === "mining") {
    const pct = Math.round(miningBonusChance(skills) * 100);
    return `+1% bonus-drop chance on rocks/ore per level (cap 60%) — currently ${pct}% for +1`;
  }
  if (skill === "heavy_armor") {
    const level = skills.get("heavy_armor");
    const pct = Math.round(heavyArmorMagicMitigation(skills) * 100);
    return `While wearing heavy armor: -0.4% magic/fire damage per level (cap -30%) — currently -${pct}% at Lvl ${level}`;
  }
  if (skill === "blocking") {
    return "No effect yet — needs a block/parry mechanic first";
  }
  return "No combat/gather effect yet — recipe gate only";
}

type LevelUpListener = (skill: SkillType, newLevel: number, xpCost: number) => void;

export class Skills {
  private levels: Record<SkillType, number>;
  private xp: Record<SkillType, number>;
  private listeners: LevelUpListener[] = [];

  constructor() {
    this.levels = {} as Record<SkillType, number>;
    this.xp = {} as Record<SkillType, number>;
    for (const s of SKILL_TYPES) {
      this.levels[s] = 0;
      this.xp[s] = 0;
    }
  }

  get(skill: SkillType): number {
    return this.levels[skill];
  }

  // Progress within the current level (for UI XP bars). Always in
  // [0, skillXpToNext(level)).
  getXp(skill: SkillType): number {
    return this.xp[skill];
  }

  // Fires per level gained (may be called multiple times in one addXp if a
  // large XP dump crosses several levels). Mirrors EventLog.onAdd's shape.
  onLevelUp(cb: LevelUpListener): void {
    this.listeners.push(cb);
  }

  // Grant XP (fractional allowed, e.g. per-frame sprint XP). Rolls over into
  // as many level-ups as the total covers, stopping at MAX_SKILL_LEVEL.
  addXp(skill: SkillType, amount: number): void {
    if (amount <= 0) return;
    this.xp[skill] += amount;
    while (this.levels[skill] < MAX_SKILL_LEVEL) {
      const cost = skillXpToNext(this.levels[skill]);
      if (this.xp[skill] < cost) break;
      this.xp[skill] -= cost;
      this.levels[skill] += 1;
      for (const cb of this.listeners) cb(skill, this.levels[skill], cost);
    }
    // At the cap, park leftover XP at 0 so a maxed bar reads full-not-partial.
    if (this.levels[skill] >= MAX_SKILL_LEVEL) this.xp[skill] = 0;
  }
}
