// DayNight.ts — the global day/night clock (M-DN). Framework-free (no Phaser),
// like Run/Health/Buffs/Skills. Ticked with delta from MainScene.update(), so
// it freezes exactly when the run does (mirrors Run.tick). Drives three things:
// the night visual intensity (tint alpha), a slight enemy speed buff at night,
// and the day/night edge events MainScene uses to surge/clean-up night spawns.
//
// See .claude/plans/roguelike-metaloop-master-plan.md (M-DN) — first-pass,
// tunable, in-memory only.

// Cycle: 10 min day + 5 min night (day = 2/3). Run begins at dawn (elapsedMs 0).
export const DAY_MS = 10 * 60 * 1000; // 600000
export const NIGHT_MS = 5 * 60 * 1000; // 300000
export const CYCLE_MS = DAY_MS + NIGHT_MS; // 900000
// Dusk/dawn fade window — the tint ramps up over this at nightfall and back
// down over it at dawn. Short relative to the phases so most of the night is
// "deep" (full intensity).
export const TWILIGHT_MS = 20 * 1000;
// "Slightly faster" — a small, readable bump, not a stat wall (locked: no
// damage buff at night).
export const NIGHT_ENEMY_SPEED_MULT = 1.15;

export type DayPhase = "day" | "night";

export class DayNight {
  elapsedMs = 0;

  tick(deltaMs: number): void {
    this.elapsedMs += deltaMs;
  }

  // Position within the current 15-min cycle.
  private cyclePos(): number {
    return this.elapsedMs % CYCLE_MS;
  }

  phase(): DayPhase {
    return this.cyclePos() < DAY_MS ? "day" : "night";
  }

  isNight(): boolean {
    return this.phase() === "night";
  }

  // 1-based day counter for the HUD ("Day 1", "Day 2", ...).
  dayNumber(): number {
    return Math.floor(this.elapsedMs / CYCLE_MS) + 1;
  }

  // 1-based night counter for the HUD ("Night 1", ...). A night is the tail of
  // the same cycle as the day it follows, so it shares that day's number.
  nightNumber(): number {
    return this.dayNumber();
  }

  // Binary (phase-based) speed multiplier for enemies. Kept binary rather than
  // ramped so "night = faster" reads clearly; the visual intensity below is
  // the thing that fades smoothly.
  enemySpeedMultiplier(): number {
    return this.isNight() ? NIGHT_ENEMY_SPEED_MULT : 1;
  }

  // 0 in full day, ramps 0->1 over TWILIGHT_MS at dusk, holds 1 through deep
  // night, ramps 1->0 over TWILIGHT_MS at dawn. Drives the darkness overlay
  // alpha only — no gameplay effect.
  nightIntensity01(): number {
    const p = this.cyclePos();
    if (p < DAY_MS - TWILIGHT_MS) return 0; // full day
    if (p < DAY_MS) return (p - (DAY_MS - TWILIGHT_MS)) / TWILIGHT_MS; // dusk 0->1
    if (p < CYCLE_MS - TWILIGHT_MS) return 1; // deep night
    return (CYCLE_MS - p) / TWILIGHT_MS; // dawn 1->0
  }
}
