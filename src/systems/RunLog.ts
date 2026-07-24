// RunLog.ts — per-run attribution, surfaced on the end-of-run screen (D7).
// Framework-free (no Phaser), like Run/Health/Buffs/Skills, so a fresh
// `new RunLog()` in create() fully resets it alongside the Run itself.
//
// WHY THIS EXISTS, and why it is deliberately NOT an event log. the user asked
// for "every item crafted, every enemy killed, every upgrade done, every relic
// rolled" as a balancing export. Most of that stream answers nothing: you
// already know what you crafted. What no one can see from inside a run is
// ATTRIBUTION — which slice of a swing actually dealt the damage, and which of
// the four concurrent lifesteal sources actually kept you alive. The 2026-07-23
// "god run" took a full code read to explain, and every load-bearing fact in
// that diagnosis is a bucket below.
//
// It is also player-facing rather than a dev export (the user: "maybe this isn't
// even an actual export but something we also show the player like an end of
// run summary... Slay the Spire has something similar"), which is why the
// buckets carry display labels rather than ids.

export type MilestoneKind = "level" | "boss" | "relic" | "biome";

export interface Milestone {
  atMs: number;
  kind: MilestoneKind;
  text: string;
}

export interface RelicRollRecord {
  atMs: number;
  trophy: string;
  // "Warrior's Idol (Uncommon)" on a success, "crumbled" on a failure, plus the
  // family verdict where one applied ("replaced", "declined").
  result: string;
}

// One aggregated bucket, ready to render: label, total, and share of its category.
export interface Bucket {
  label: string;
  value: number;
  pct: number;
}

function topOf(map: Map<string, number>, limit: number): Bucket[] {
  const total = [...map.values()].reduce((a, b) => a + b, 0);
  if (total <= 0) return [];
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([label, value]) => ({ label, value: Math.round(value), pct: (value / total) * 100 }));
}

export class RunLog {
  // Damage the PLAYER dealt, split by which part of an attack produced it —
  // primary hit / arc sweep / on-hit burst / crit splash / ranged / abilities.
  // This is the split that made the AOE-lifesteal loop legible.
  private dealt = new Map<string, number>();
  // Damage the player TOOK, keyed "Species — Attack" so a species that hurts
  // via one specific move is distinguishable from one that grinds you down.
  private taken = new Map<string, number>();
  // Healing RECEIVED, by source. Four sources can run at once (weapon lifelink,
  // the Leech relic, Bloodpact, food/Comfort buffs) and nothing on screen ever
  // said which was carrying the run.
  private healed = new Map<string, number>();
  private killsBySpecies = new Map<string, number>();

  readonly relicRolls: RelicRollRecord[] = [];
  readonly milestones: Milestone[] = [];

  private add(map: Map<string, number>, label: string, amount: number): void {
    if (!(amount > 0)) return;
    map.set(label, (map.get(label) ?? 0) + amount);
  }

  recordDamageDealt(source: string, amount: number): void {
    this.add(this.dealt, source, amount);
  }

  recordDamageTaken(source: string, amount: number): void {
    this.add(this.taken, source, amount);
  }

  recordHealing(source: string, amount: number): void {
    this.add(this.healed, source, amount);
  }

  recordKill(species: string): void {
    this.add(this.killsBySpecies, species, 1);
  }

  recordRelicRoll(atMs: number, trophy: string, result: string): void {
    this.relicRolls.push({ atMs, trophy, result });
  }

  // Milestones are capped so a long run's timeline stays a readable shape
  // rather than a wall — level-ups in particular fire dozens of times, so the
  // caller is expected to only log notable ones (see MainScene).
  recordMilestone(atMs: number, kind: MilestoneKind, text: string): void {
    this.milestones.push({ atMs, kind, text });
  }

  topDamageDealt(limit = 6): Bucket[] {
    return topOf(this.dealt, limit);
  }
  topDamageTaken(limit = 6): Bucket[] {
    return topOf(this.taken, limit);
  }
  topHealing(limit = 5): Bucket[] {
    return topOf(this.healed, limit);
  }
  topKills(limit = 6): Bucket[] {
    return topOf(this.killsBySpecies, limit);
  }

  totalDealt(): number {
    return Math.round([...this.dealt.values()].reduce((a, b) => a + b, 0));
  }
  totalTaken(): number {
    return Math.round([...this.taken.values()].reduce((a, b) => a + b, 0));
  }
  totalHealed(): number {
    return Math.round([...this.healed.values()].reduce((a, b) => a + b, 0));
  }

  // Relic rolls rolled up for display: how many attempts, and how many produced
  // a relic. Settles "4 rares in a row, is that even possible?" without anyone
  // having to reconstruct it from memory.
  relicSummary(): { attempts: number; successes: number } {
    const attempts = this.relicRolls.length;
    const successes = this.relicRolls.filter((r) => !/crumbled/i.test(r.result)).length;
    return { attempts, successes };
  }
}
