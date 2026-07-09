import type { DamageType } from "./Weapons";

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

// Short hover-tooltip text for a skill's mechanical impact, or null if it has
// none (most skills today only gate recipes — "if applicable" per the user).
export function skillImpactDescription(skill: SkillType): string | null {
  if (WEAPON_SKILLS.includes(skill)) return "+0.5% weapon damage per level";
  if (skill === "running") return "+0.5% sprint speed per level";
  return null;
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
