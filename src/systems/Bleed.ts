// Lightweight player damage-over-time (bleed) — the game's first DoT, added for
// Cragscale's rolling charge (the user: getting rolled should deal "a damage over
// time tick like bleed"). Framework-free like Health/Stamina/Buffs; owns no
// GameObjects. Each application is a stack {dmgPerSec, remainingMs}; tick() sums
// the active stacks, carries fractional damage between frames, and returns whole
// points for the caller to apply to Health. Bleed ignores armor (it's internal
// bleeding) but is gated by the same i-frame check as the hit that caused it, so
// a dash that dodges the roll dodges the bleed too (see applyDamageToPlayer).

interface BleedStack {
  dmgPerSec: number;
  remainingMs: number;
}

export class BleedManager {
  private stacks: BleedStack[] = [];
  private accum = 0; // fractional damage carried across frames
  private static readonly MAX_STACKS = 5;

  // Add a bleed stack. At the cap, refresh the shortest-lived stack rather than
  // growing unbounded — repeated rolls keep bleed dangerous without runaway DPS.
  apply(dmgPerSec: number, durationMs: number): void {
    if (this.stacks.length >= BleedManager.MAX_STACKS) {
      let shortest = 0;
      for (let i = 1; i < this.stacks.length; i++) {
        if (this.stacks[i].remainingMs < this.stacks[shortest].remainingMs) shortest = i;
      }
      this.stacks[shortest] = { dmgPerSec, remainingMs: durationMs };
      return;
    }
    this.stacks.push({ dmgPerSec, remainingMs: durationMs });
  }

  // Advance all stacks by delta ms; returns whole damage points to apply now
  // (0 while the fractional accumulator is still below 1).
  tick(delta: number): number {
    if (this.stacks.length === 0) return 0;
    let dps = 0;
    for (const s of this.stacks) {
      s.remainingMs -= delta;
      if (s.remainingMs > 0) dps += s.dmgPerSec;
    }
    this.stacks = this.stacks.filter((s) => s.remainingMs > 0);
    this.accum += (dps * delta) / 1000;
    if (this.accum < 1) return 0;
    const whole = Math.floor(this.accum);
    this.accum -= whole;
    return whole;
  }

  isBleeding(): boolean {
    return this.stacks.length > 0;
  }

  clear(): void {
    this.stacks = [];
    this.accum = 0;
  }
}
