import { BleedManager } from "./Bleed";

// Player poison — biome 3's signature status effect (the Duskmire Bayou's miasma
// zones today; its creatures in the Phase-4b roster). Framework-free like
// Health/Stamina/Bleed; owns no GameObjects.
//
// Poison is a SUBTYPE OF MAGIC (locked, the user) — see Weapons.isMagicFamily.
// Its damage routes through the `poison` IncomingDamageType, so it bypasses flat
// armor and IS reduced by heavy armor's magic mitigation, exactly like a Hexling
// bolt. What makes it poison rather than just "magic that ticks":
//   1. it deals its damage over time, and
//   2. it CRIPPLES HP REGEN while active — isPoisoned() feeds MainScene's
//      currentRegenMult, halving every heal source (food buffs, Comfort). It is
//      deliberately NOT a full shutoff (the user): "significantly worse" keeps it
//      as pressure you can still play against, where 0% would just be a switch.
//
// TWO APPLICATION MODES, because poison has two very different sources:
//
//   apply()   — a DISCRETE dose (a creature's bite). Genuinely stacks, with
//               BleedManager's cap/refresh rules; getting bitten repeatedly
//               should ramp. Composes BleedManager rather than duplicating its
//               stack/tick math.
//
//   sustain() — a CONTINUOUS environmental source (standing in a miasma). This
//               must NOT stack: the caller re-applies it every frame while the
//               condition holds, so routing it through apply() silently
//               multiplied the intended DPS by the stack cap — a 3 dps fog
//               actually dealt 15 and killed a full-HP player in ~7s (caught in
//               testing). sustain() instead REFRESHES one dedicated slot, the
//               same refresh-don't-stack contract BuffManager uses for a re-
//               applied buff id. Letting the caller re-arm every frame is what
//               makes leaving the zone self-cleaning: the slot simply lapses.
export class PoisonManager {
  private doses = new BleedManager();
  private env: { dmgPerSec: number; remainingMs: number } | null = null;
  private envAccum = 0; // fractional environmental damage carried across frames

  // A discrete poison dose — stacks (creature bites).
  apply(dmgPerSec: number, durationMs: number): void {
    this.doses.apply(dmgPerSec, durationMs);
  }

  // A sustained environmental source — refreshes, never stacks. Safe to call
  // every frame.
  sustain(dmgPerSec: number, durationMs: number): void {
    this.env = { dmgPerSec, remainingMs: durationMs };
  }

  // Advance everything by delta ms; returns whole damage points to apply now.
  tick(delta: number): number {
    let total = this.doses.tick(delta);
    if (this.env) {
      this.env.remainingMs -= delta;
      // Unlike a discrete stack, a sustained source pays out for the slice of
      // time it was actually active this frame — otherwise a slot that lapses
      // mid-frame contributes nothing and a re-armed-every-frame source could
      // tick forever at zero.
      const active = Math.max(0, Math.min(delta, delta + this.env.remainingMs));
      this.envAccum += (this.env.dmgPerSec * active) / 1000;
      if (this.env.remainingMs <= 0) this.env = null;
      if (this.envAccum >= 1) {
        const whole = Math.floor(this.envAccum);
        this.envAccum -= whole;
        total += whole;
      }
    }
    return total;
  }

  // True while any dose or environmental source is live — this is what drives the
  // regen penalty and the status HUD icon.
  isPoisoned(): boolean {
    return this.doses.isBleeding() || this.env !== null;
  }

  // Remaining ms across doses AND the environmental slot — the status HUD's
  // countdown. A sustained source keeps re-arming, so while you stand in a
  // miasma this simply holds near its full duration, which is the honest read.
  remainingMs(): number {
    return Math.max(this.doses.remainingMs(), this.env?.remainingMs ?? 0);
  }

  // Total dps in effect right now (doses + environment), for the HUD tooltip.
  dps(): number {
    return this.doses.dps() + (this.env?.dmgPerSec ?? 0);
  }

  clear(): void {
    this.doses.clear();
    this.env = null;
    this.envAccum = 0;
  }
}
