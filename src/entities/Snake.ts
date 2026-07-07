import Phaser from "phaser";
import { Enemy } from "./Enemy";

// First hidden/ambush enemy — structurally different from Boar, not just a
// re-tuned copy (see CLAUDE.md's "per-enemy tunable combat stats" decision
// and the plan's Milestone D). Own state machine (hidden/striking/fleeing),
// own constants — do NOT reuse Boar's AGGRO_RADIUS/CHASE_SPEED/etc., and
// don't fold these into Enemy's base update().
type SnakeMode = "hidden" | "striking" | "fleeing";

const AMBUSH_RADIUS = 45; // px — much tighter than Boar's 140; a trigger, not a chase range
const STRIKE_SPEED = 90; // px/s — quick lunge once triggered
const FLEE_SPEED = 70; // px/s — retreat after striking
const MELEE_RANGE = 22; // px
const BITE_COOLDOWN_MS = 900;
const FLEE_DURATION_MS = 1200; // post-bite retreat before fully re-hiding
const RETALIATION_FLEE_MS = 2500; // "a few seconds" retreat after being hit post-bite, before wanting to strike again
const REHIDE_COOLDOWN_MS = 3500; // can't ambush again until this long after fully re-hiding
const HIDDEN_ALPHA = 0.35; // "in the grass" — reuses the placeholder texture, no new art
const MAX_HEALTH = 11;
const BITE_DAMAGE = 20; // a landed ambush bite should hurt — low HP is the tradeoff, not low damage

// Own deaggro condition (per CLAUDE.md's "different condition, not just
// different number" standing decision) — Snake is a hit-and-run ambusher,
// not a sustained hunter like Boar, so it gives up much faster: either the
// player breaks line of sight/distance, or enough time passes chasing
// without landing a bite.
const CHASE_GIVEUP_MS = 4000;
const CHASE_GIVEUP_RADIUS = 150; // px — player this far away while striking ends the chase immediately

export class Snake extends Enemy {
  private mode: SnakeMode = "hidden";
  private lastStrikeBiteAt = -Infinity;
  private fleeUntil = 0;
  private ambushReadyAt = 0;
  private pursuitStart = 0;
  // Whether it has already landed a bite on the player during the current
  // engagement (reset whenever it fully disengages back to hidden). Drives
  // the takeHit() branch below: hasn't bitten yet -> fight back; already
  // bitten -> flee-then-reengage instead of instantly backing off for good.
  private hasBitten = false;
  // Set when a flee should end back in "striking" (wants to hit again)
  // rather than fully re-hiding — see takeHit()'s retaliation-flee case.
  private reengageAfterFlee = false;

  constructor(scene: Phaser.Scene, cfg: { x: number; y: number }) {
    super(scene, {
      x: cfg.x,
      y: cfg.y,
      texture: "snake",
      displayName: "Snake",
      loot: [{ resource: "leather", min: 1, max: 1 }],
      maxHealth: MAX_HEALTH,
      biteDamage: BITE_DAMAGE,
    });
    this.setAlpha(HIDDEN_ALPHA);
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
      // Deaggro: chasing too long without landing a bite, or the player got
      // too far away — give up and re-hide, regardless of whether it's ever
      // been hit. Fixes "chases forever if it never lands a hit."
      if (now - this.pursuitStart >= CHASE_GIVEUP_MS || dist > CHASE_GIVEUP_RADIUS) {
        this.giveUp(now);
        return false;
      }
      if (dist <= MELEE_RANGE) {
        body.setVelocity(0, 0);
        this.applyFacing(playerX - this.x, playerY - this.y);
        if (now - this.lastStrikeBiteAt >= BITE_COOLDOWN_MS) {
          this.lastStrikeBiteAt = now;
          this.hasBitten = true;
          this.beginFlee(now, FLEE_DURATION_MS, false); // bite landed -> flee, then fully re-hide
          return true; // bite lands
        }
        return false;
      }
      const angle = Phaser.Math.Angle.Between(this.x, this.y, playerX, playerY);
      const vx = Math.cos(angle) * STRIKE_SPEED;
      const vy = Math.sin(angle) * STRIKE_SPEED;
      body.setVelocity(vx, vy);
      this.applyFacing(vx, vy);
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
    const vx = Math.cos(awayAngle) * FLEE_SPEED;
    const vy = Math.sin(awayAngle) * FLEE_SPEED;
    body.setVelocity(vx, vy);
    this.applyFacing(vx, vy);
    return false;
  }

  private enterStriking(now: number): void {
    this.mode = "striking";
    this.pursuitStart = now;
    this.setAlpha(1);
  }

  private giveUp(now: number): void {
    this.mode = "hidden";
    this.ambushReadyAt = now + REHIDE_COOLDOWN_MS;
    this.hasBitten = false;
    (this.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
    this.setAlpha(HIDDEN_ALPHA);
  }

  private beginFlee(now: number, durationMs: number, reengage: boolean): void {
    this.mode = "fleeing";
    this.fleeUntil = now + durationMs;
    this.reengageAfterFlee = reengage;
  }

  // HP bar only shows once it's actually engaged (striking/fleeing), not
  // while sitting hidden — mirrors the base "only show when aggro'd" rule
  // via Snake's own mode instead of the shared `state` field.
  protected isAggro(): boolean {
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
