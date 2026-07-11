import Phaser from "phaser";
import { Enemy } from "./Enemy";

// First hidden/ambush enemy — structurally different from Boar, not just a
// re-tuned copy (see CLAUDE.md's "per-enemy tunable combat stats" decision
// and the plan's Milestone D). Own state machine (hidden/striking/fleeing),
// own constants — do NOT reuse Boar's AGGRO_RADIUS/CHASE_SPEED/etc., and
// don't fold these into Enemy's base update().
type SnakeMode = "hidden" | "striking" | "fleeing";

const AMBUSH_RADIUS = 45; // px — much tighter than Boar's 140; a trigger, not a chase range
const STRIKE_SPEED = 150; // px/s — a fast committed lunge along the locked direction (was a slower homing chase)
const FLEE_SPEED = 70; // px/s — retreat after striking
const MELEE_RANGE = 22; // px
// Coil wind-up (the tell + dodge window) then a short locked-direction lunge.
// The lunge does NOT re-home, so a sidestep during the coil makes it whiff —
// and the existing post-strike flee doubles as the recovery/punish window.
const COIL_MS = 340; // rear-back/coil telegraph before the lunge
const LUNGE_MS = 260; // max lunge travel time before a miss becomes a flee
const FLEE_DURATION_MS = 1200; // post-bite retreat before fully re-hiding
const RETALIATION_FLEE_MS = 2500; // "a few seconds" retreat after being hit post-bite, before wanting to strike again
const REHIDE_COOLDOWN_MS = 3500; // can't ambush again until this long after fully re-hiding
const HIDDEN_ALPHA = 0.35; // "in the grass" — reuses the placeholder texture, no new art
const MAX_HEALTH = 11;
const BITE_DAMAGE = 20; // a landed ambush bite should hurt — low HP is the tradeoff, not low damage

// Own deaggro condition (per CLAUDE.md's "different condition, not just
// different number" standing decision) — Snake is a hit-and-run ambusher, so
// it gives up fast: fleeing far enough during the coil cancels the strike, and
// the whole lunge always resolves (bite or whiff→flee) within COIL_MS+LUNGE_MS,
// so it can never chase forever.
const CHASE_GIVEUP_RADIUS = 150; // px — player this far away during the coil cancels the strike

export class Snake extends Enemy {
  private mode: SnakeMode = "hidden";
  private fleeUntil = 0;
  private ambushReadyAt = 0;
  // Locked lunge direction, captured on the first coil frame and never
  // re-aimed (that's what makes the lunge sidesteppable). strikeLocked guards
  // capturing it exactly once per strike.
  private lockedStrikeAngle = 0;
  private strikeLocked = false;
  // Whether it has already landed a bite on the player during the current
  // engagement (reset whenever it fully disengages back to hidden). Drives
  // the takeHit() branch below: hasn't bitten yet -> fight back; already
  // bitten -> flee-then-reengage instead of instantly backing off for good.
  private hasBitten = false;
  // Set when a flee should end back in "striking" (wants to hit again)
  // rather than fully re-hiding — see takeHit()'s retaliation-flee case.
  private reengageAfterFlee = false;

  constructor(scene: Phaser.Scene, cfg: { x: number; y: number; elite?: boolean }) {
    const elite = cfg.elite ?? false;
    super(scene, {
      x: cfg.x,
      y: cfg.y,
      texture: elite ? "snake_elite" : "snake",
      displayName: elite ? "Elite Snake" : "Snake",
      loot: elite ? [{ resource: "leather", min: 2, max: 2 }] : [{ resource: "leather", min: 1, max: 1 }],
      maxHealth: elite ? Math.round(MAX_HEALTH * 1.5) : MAX_HEALTH,
      biteDamage: elite ? Math.round(BITE_DAMAGE * 1.5) : BITE_DAMAGE,
      elite,
      eliteTrophy: "snake_trophy",
    });
    this.setAlpha(HIDDEN_ALPHA);
    if (elite) {
      this.speedMult = 1.1;
      this.setScale(1.3);
      this.baseScale = 1.3; // wind-up pulse throbs around the elite's size
    }
  }

  // Fully own implementation — deliberately does not call super.update()
  // (Boar's chase/wander/give-up state machine doesn't apply here).
  update(_delta: number, playerX: number, playerY: number, now: number): boolean {
    if (this.depleted) return false;
    const body = this.body as Phaser.Physics.Arcade.Body;
    const dist = Phaser.Math.Distance.Between(this.x, this.y, playerX, playerY);

    if (this.mode === "hidden") {
      body.setVelocity(0, 0);
      if (dist <= AMBUSH_RADIUS && now >= this.ambushReadyAt) {
        this.enterStriking(now);
      }
      return false;
    }

    if (this.mode === "striking") {
      // Coil wind-up: plant, lock the lunge direction toward the player on the
      // first frame, and play the tell. The player dodges here by sidestepping
      // or backing out of ambush range before the lunge fires.
      if (this.attackPhase === "windup") {
        body.setVelocity(0, 0);
        if (!this.strikeLocked) {
          this.lockedStrikeAngle = Phaser.Math.Angle.Between(this.x, this.y, playerX, playerY);
          this.applyFacing(Math.cos(this.lockedStrikeAngle), Math.sin(this.lockedStrikeAngle));
          this.playWindupTell(COIL_MS, 0x9be89b); // greenish coil tell
          this.strikeLocked = true;
        }
        // Fled far enough during the coil — the ambush is dodged, re-hide.
        if (dist > CHASE_GIVEUP_RADIUS) {
          this.giveUp(now);
          return false;
        }
        if (this.attackElapsed(now) >= COIL_MS) {
          this.attackPhase = "strike";
          this.attackStartedAt = now;
          this.endWindupTell();
        }
        return false;
      }

      // Lunge: travel along the LOCKED direction (no re-homing) for the bite.
      const lungeVx = Math.cos(this.lockedStrikeAngle) * STRIKE_SPEED * this.speedMult * this.envSpeedMult;
      const lungeVy = Math.sin(this.lockedStrikeAngle) * STRIKE_SPEED * this.speedMult * this.envSpeedMult;
      body.setVelocity(lungeVx, lungeVy);
      this.applyFacing(lungeVx, lungeVy);
      if (dist <= MELEE_RANGE) {
        this.hasBitten = true;
        this.beginFlee(now, FLEE_DURATION_MS, false); // bite landed -> flee, then fully re-hide
        return true; // bite lands
      }
      // Whiffed the lunge (player dodged) — retreat; the flee IS the punish window.
      if (this.attackElapsed(now) >= LUNGE_MS) {
        this.beginFlee(now, FLEE_DURATION_MS, false);
      }
      return false;
    }

    // fleeing: retreat directly away from the player until the timer
    // expires, then either re-hide (post-bite retreat) or go back to
    // striking to try again (post-retaliation-hit retreat) — see
    // beginFlee()'s reengage param / takeHit()'s branching.
    if (now >= this.fleeUntil) {
      if (this.reengageAfterFlee) {
        this.enterStriking(now);
      } else {
        this.mode = "hidden";
        this.ambushReadyAt = now + REHIDE_COOLDOWN_MS;
        this.hasBitten = false;
        body.setVelocity(0, 0);
        this.setAlpha(HIDDEN_ALPHA);
      }
      return false;
    }
    const awayAngle = Phaser.Math.Angle.Between(playerX, playerY, this.x, this.y);
    const vx = Math.cos(awayAngle) * FLEE_SPEED * this.speedMult * this.envSpeedMult;
    const vy = Math.sin(awayAngle) * FLEE_SPEED * this.speedMult * this.envSpeedMult;
    body.setVelocity(vx, vy);
    this.applyFacing(vx, vy);
    return false;
  }

  private enterStriking(now: number): void {
    this.mode = "striking";
    this.setAlpha(1);
    // Begin the coil wind-up; the lunge direction is locked on the first
    // windup frame in update() (strikeLocked), regardless of what triggered
    // the strike (ambush, retaliation, or flee-reengage).
    this.attackPhase = "windup";
    this.attackStartedAt = now;
    this.strikeLocked = false;
  }

  private giveUp(now: number): void {
    this.mode = "hidden";
    this.ambushReadyAt = now + REHIDE_COOLDOWN_MS;
    this.hasBitten = false;
    this.attackPhase = "none";
    this.endWindupTell();
    (this.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
    this.setAlpha(HIDDEN_ALPHA);
  }

  private beginFlee(now: number, durationMs: number, reengage: boolean): void {
    this.mode = "fleeing";
    this.fleeUntil = now + durationMs;
    this.reengageAfterFlee = reengage;
    // Leaving the strike — drop any active wind-up tell so scale/tint reset.
    this.attackPhase = "none";
    this.endWindupTell();
  }

  // HP bar only shows once it's actually engaged (striking/fleeing), not
  // while sitting hidden — mirrors the base "only show when aggro'd" rule
  // via Snake's own mode instead of the shared `state` field.
  isAggro(): boolean {
    return this.mode !== "hidden";
  }

  // Reaction to being attacked branches on whether it has already landed a
  // bite on the player this engagement (per user spec):
  // - Hasn't bitten yet: reveal + fight back (go/stay striking) rather than
  //   fleeing outright — a snake that hasn't gotten its hit in yet doesn't
  //   just run.
  // - Already bitten: flee for a few seconds, then wants to strike again
  //   (reengage), rather than fully disengaging for the long rehide cooldown.
  takeHit(damage: number): boolean {
    const depleted = super.takeHit(damage);
    if (depleted) return true;
    const now = this.scene.time.now;
    if (!this.hasBitten) {
      if (this.mode !== "striking") this.enterStriking(now);
    } else {
      this.beginFlee(now, RETALIATION_FLEE_MS, true);
    }
    return false;
  }
}
