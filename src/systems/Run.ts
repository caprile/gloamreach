// Run.ts — the run container for the roguelike meta-loop (M-R1). Framework-free
// (no Phaser), like Health/Stamina/Buffs/Skills. Owns the per-run seed
// (display-only for now — see .claude/plans/roguelike-metaloop-master-plan.md;
// true deterministic world-gen from a seed is deferred to M-W1), an elapsed
// clock, a kill tally, and the run's score. Score is a pure function of the
// current state, so it can be read live for the HUD and finalized on end.

export type RunOutcome = "won" | "died";
export type KillCategory = "normal" | "elite" | "boss";

// --- tunable score constants (first-pass) ---
// Flat per-kill points by category. Kept flat (not depth-scaled) so grinding
// diminishes relative to the completion bonus below — see the master plan's
// "a fast final-boss kill can beat a slow full-clear" constraint.
export const KILL_POINTS: Record<KillCategory, number> = {
  normal: 10,
  elite: 30,
  boss: 500,
};
// Awarded only on a win (killing the final boss). The completion x speed term
// is meant to dominate the flat kill points.
export const COMPLETION_BONUS = 2000;
// Speed multiplier on the completion bonus: full MAX at/under the "par" time,
// decaying toward 1x as the run drags on.
// 10 min -> 90 min (2026-07-26). The multiplier can only exceed 1x BELOW par, and
// a full three-biome run takes 70-100 minutes, so a 10-minute par made this a dead
// term: all five of the user's recorded wins (69:56 through 98:17) scored exactly
// x1.00, leaving score ~80% flat kill points — the opposite of the "reward going
// fast" intent it was built for. At 90 min the real range finally spans something
// (69:56 -> x1.29, 77:26 -> x1.16, 98:17 -> x1.00) and a genuinely fast 30-minute
// run can still reach the 3x cap.
export const SPEED_TARGET_MS = 90 * 60 * 1000; // 90 min par time
export const MAX_SPEED_MULT = 3;

// Completion-bonus multiplier for a run of the given length. Faster = higher,
// clamped to [1, MAX_SPEED_MULT].
export function speedMultiplier(elapsedMs: number): number {
  if (elapsedMs <= 0) return MAX_SPEED_MULT;
  const raw = SPEED_TARGET_MS / elapsedMs;
  return Math.max(1, Math.min(MAX_SPEED_MULT, raw));
}

// Display-only run identifier. Uppercase base36 for readability; carries no
// determinism guarantees until M-W1 wires a seed into world-gen.
function generateSeed(): string {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

// MM:SS from a millisecond duration — shared by the run HUD and run-end screen.
export function formatDuration(ms: number): string {
  const totalSec = Math.floor(Math.max(0, ms) / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export class Run {
  readonly seed: string;
  elapsedMs = 0;
  state: "active" | "ended" = "active";
  outcome: RunOutcome | null = null;
  kills = 0;
  readonly killsByCategory: Record<KillCategory, number> = {
    normal: 0,
    elite: 0,
    boss: 0,
  };

  constructor(seed = generateSeed()) {
    this.seed = seed;
  }

  tick(deltaMs: number): void {
    if (this.state === "active") this.elapsedMs += deltaMs;
  }

  recordKill(category: KillCategory): void {
    this.kills += 1;
    this.killsByCategory[category] += 1;
  }

  killPoints(): number {
    let sum = 0;
    for (const cat of Object.keys(this.killsByCategory) as KillCategory[]) {
      sum += this.killsByCategory[cat] * KILL_POINTS[cat];
    }
    return sum;
  }

  // The speed-scaled completion bonus — zero unless the run was won.
  completionPoints(): number {
    if (this.outcome !== "won") return 0;
    return COMPLETION_BONUS * speedMultiplier(this.elapsedMs);
  }

  score(): number {
    return Math.round(this.killPoints() + this.completionPoints());
  }

  end(outcome: RunOutcome): void {
    if (this.state === "ended") return;
    this.outcome = outcome;
    this.state = "ended";
  }

  // Put an ended run back on the clock. Both "Continue" paths (past a win, and
  // the test-mode respawn after a death) un-freeze the world but used to leave
  // this at "ended", so tick() silently stopped accumulating and the run timer
  // sat frozen for the rest of the session (the user: "timer should keep going
  // when you hit continue"). `outcome` is deliberately left alone — a score for
  // the finished run is already recorded, and if the continued run later ends
  // for real, endRun() forces the true outcome via setOutcome().
  resume(): void {
    this.state = "active";
  }

  // Force the recorded outcome even if the run already ended. Used only for the
  // playtest "Continue past the win" path: a won run that's later ended by death
  // must read as a death on the end screen (end() no-ops once ended).
  setOutcome(outcome: RunOutcome): void {
    this.outcome = outcome;
  }
}
