// Skills gate higher recipe tiers (e.g. a Tier 2 axe needing Axes lvl 3).
// Leveling isn't wired to any action yet (combat/crafting XP is future
// work) — everything starts at 0, which is enough to unlock all current
// tier-0 recipes.
export type SkillType = "axes" | "pickaxes";

export class Skills {
  private levels: Record<SkillType, number> = { axes: 0, pickaxes: 0 };

  get(skill: SkillType): number {
    return this.levels[skill];
  }

  levelUp(skill: SkillType): void {
    this.levels[skill] += 1;
  }
}
