import Phaser from "phaser";

export type EnemyState = "idle" | "chasing";

const AGGRO_RADIUS = 140; // px — player enters this range, Boar starts chasing
// Wider than a plain "avoid boundary flicker" gap needs — dense obstacle
// clusters can take several chained escape maneuvers to clear, and each one
// can push the Boar temporarily further from the player. Too tight a margin
// here means it gives up and wanders off mid-navigation instead of finishing
// the maneuver. See STATUS.md for the obstacle-avoidance history.
const DEAGGRO_RADIUS = 280;
const CHASE_SPEED = 60; // px/s — slower than player base (95), so it's escapable
const WANDER_SPEED = 20; // px/s idle wander
const MELEE_RANGE = 28; // px — how close the Boar must be to bite
const BITE_DAMAGE = 25; // ~4 bites kills a full-health (100) player
const BITE_COOLDOWN_MS = 1000;
// No real pathfinding exists. Rather than reacting to the physics `touching`
// flag (a fixed offset from that can just aim straight into a SECOND nearby
// obstacle and wedge forever — see STATUS.md), progress is measured directly:
// if actual movement over a short window is too small, commit to a randomized
// escape heading for a while. Randomizing each attempt (instead of a fixed
// per-instance offset) is what breaks a deterministic "approach -> wedge ->
// back off -> approach the exact same wedge again" loop between clustered
// obstacles.
const STUCK_CHECK_INTERVAL_MS = 350; // how often to sample position for progress
const STUCK_DISPLACEMENT_PX = 12; // below this over one interval counts as "not progressing"
const ESCAPE_DURATION_MS = 900; // commit to a chosen escape heading this long before retrying direct
const MAX_HEALTH = 20;

// Default "give up eventually" behavior for any non-boss enemy (user
// decision, see STATUS.md/memory): if 30s of continuous pursuit passes
// without landing a single attack — obstacles, a kiting player, whatever the
// cause — back off instead of pursuing forever. The give-up is intentionally
// distinct from the ordinary distance-based deaggro above (target simply
// left aggro range, which re-triggers instantly on return): this one also
// grants a short window where normal proximity won't re-trigger aggro,
// unless the player gets right up close or actually attacks it. These live
// on the base class (not Boar-specific constants) since the mechanism itself
// is meant to be a shared default future enemies opt into, even though each
// enemy still tunes its own aggro/deaggro *radius* per the standing
// "don't share one config table" decision.
const CHASE_GIVEUP_MS = 30000;
const POST_GIVEUP_IMMUNITY_MS = 5000;
const CLOSE_REAGGRO_RADIUS = 50; // px — overrides the immunity window even before it expires

export interface EnemyConfig {
  x: number;
  y: number;
  texture: string;
  displayName: string;
}

// A simple melee enemy (currently only "Boar"). Ranged attacks, ambush AI,
// charge, and fear-of-fire are all deliberately out of scope for this pass —
// see CLAUDE.md's "First biome — content notes" for the fuller roster.
export class Enemy extends Phaser.Physics.Arcade.Sprite {
  readonly displayName: string;
  readonly maxHealth = MAX_HEALTH;
  health = MAX_HEALTH;
  depleted = false;
  state: EnemyState = "idle";
  private lastBiteAt = -Infinity;
  private wanderTarget: { x: number; y: number } | null = null;
  private nextWanderAt = 0;
  // Obstacle-escape state (see STUCK_* / ESCAPE_* constants above).
  private lastProgressCheckAt = 0;
  private lastProgressX: number;
  private lastProgressY: number;
  private escapeAngle = 0;
  private escapeUntil = 0;
  // Which side (left/right of the direct-to-player line) escape attempts
  // pick, fixed per-instance. Re-randomizing this every time it gets stuck
  // makes it zigzag between both sides of a wide obstacle instead of
  // consistently working around one edge — classic wall-following needs a
  // committed side, not a fresh coin flip each attempt.
  private readonly escapeSide: 1 | -1 = Math.random() < 0.5 ? 1 : -1;
  // Give-up/immunity state (see CHASE_GIVEUP_MS etc. above) — protected so a
  // future subclass overriding update() entirely can still reuse the same
  // clock/helpers below rather than reimplementing the mechanism.
  protected pursuitClockStart = 0;
  protected aggroImmuneUntil = 0;

  // Thin world-space HP bar (no number, just a bar) — separate GameObjects
  // rather than a Container, gone glued to position every frame via
  // preUpdate, matching ResourceNode's count-label tracking convention.
  private healthBarBg: Phaser.GameObjects.Rectangle;
  private healthBarFill: Phaser.GameObjects.Rectangle;
  private static readonly BAR_W = 22;
  private static readonly BAR_H = 3;
  private static readonly BAR_OFFSET_Y = 16; // px above the sprite's center

  constructor(scene: Phaser.Scene, cfg: EnemyConfig) {
    super(scene, cfg.x, cfg.y, cfg.texture);
    this.displayName = cfg.displayName;
    this.lastProgressX = cfg.x;
    this.lastProgressY = cfg.y;
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setDepth(9); // just under the player (10)

    const barX = cfg.x - Enemy.BAR_W / 2;
    const barY = cfg.y - Enemy.BAR_OFFSET_Y;
    this.healthBarBg = scene.add
      .rectangle(barX, barY, Enemy.BAR_W, Enemy.BAR_H, 0x1a1f2a, 0.85)
      .setOrigin(0, 0.5)
      .setDepth(9);
    this.healthBarFill = scene.add
      .rectangle(barX, barY, Enemy.BAR_W, Enemy.BAR_H, 0xd02020, 1)
      .setOrigin(0, 0.5)
      .setDepth(9);
  }

  // Keeps the HP bar glued to the sprite (and its fill in sync with current
  // health) every frame, independent of MainScene's own update() cadence —
  // same reasoning as ResourceNode's count-label preUpdate override.
  preUpdate(time: number, delta: number): void {
    super.preUpdate(time, delta);
    const barX = this.x - Enemy.BAR_W / 2;
    const barY = this.y - Enemy.BAR_OFFSET_Y;
    this.healthBarBg.setPosition(barX, barY);
    this.healthBarFill.setPosition(barX, barY);
    this.healthBarFill.setScale(Math.max(0, this.health / this.maxHealth), 1);
  }

  get biteDamage(): number {
    return BITE_DAMAGE;
  }

  // --- give-up / re-aggro-immunity helpers (see constants above) ---

  // Call when starting a fresh pursuit (idle -> chasing).
  protected startPursuit(now: number): void {
    this.pursuitClockStart = now;
  }

  // Call whenever this enemy successfully lands an attack — resets the
  // give-up clock so a fight that's actually landing hits never times out.
  protected markAttackLanded(now: number): void {
    this.pursuitClockStart = now;
  }

  // True once continuous pursuit has run long enough without landing a hit
  // that the default "back off for a while" behavior should kick in.
  protected hasGivenUpPursuit(now: number): boolean {
    return now - this.pursuitClockStart >= CHASE_GIVEUP_MS;
  }

  // Whether normal aggro-radius proximity should be allowed to (re-)trigger
  // a chase right now. False during the post-giveup immunity window, unless
  // the player is close enough to override it (see CLOSE_REAGGRO_RADIUS).
  protected canAggro(dist: number, now: number): boolean {
    return now >= this.aggroImmuneUntil || dist <= CLOSE_REAGGRO_RADIUS;
  }

  // Enter the post-giveup window: ignores ordinary-range re-aggro for
  // POST_GIVEUP_IMMUNITY_MS. Close proximity or being attacked (see
  // takeHit()) both override it early.
  protected enterGivenUpState(now: number): void {
    this.aggroImmuneUntil = now + POST_GIVEUP_IMMUNITY_MS;
  }

  // Called every frame from MainScene.updateEnemies(). Returns true if a
  // bite lands this frame — caller applies damage to Health so Enemy doesn't
  // need to know about Player/Health directly.
  update(delta: number, playerX: number, playerY: number, now: number): boolean {
    if (this.depleted) return false;
    const body = this.body as Phaser.Physics.Arcade.Body;
    const dist = Phaser.Math.Distance.Between(this.x, this.y, playerX, playerY);

    if (this.state === "idle" && dist <= AGGRO_RADIUS && this.canAggro(dist, now)) {
      this.state = "chasing";
      this.startPursuit(now);
    } else if (this.state === "chasing") {
      // Don't deaggro mid-escape: navigating around a cluster can temporarily
      // push the Boar past DEAGGRO_RADIUS on its way around, and giving up
      // right then meant it would never actually finish the maneuver — it'd
      // just permanently idle a step away from getting through. This is the
      // ordinary "target left" case — no re-aggro immunity, it resumes
      // instantly if the player comes back.
      if (dist > DEAGGRO_RADIUS && now >= this.escapeUntil) {
        this.state = "idle";
      } else if (this.hasGivenUpPursuit(now)) {
        // 30s of trying without landing a single hit — back off instead of
        // pursuing forever (default non-boss behavior, see constants above).
        this.state = "idle";
        this.enterGivenUpState(now);
      }
    }

    if (this.state === "chasing") {
      if (dist <= MELEE_RANGE) {
        body.setVelocity(0, 0);
        this.applyFacing(playerX - this.x, playerY - this.y);
        if (now - this.lastBiteAt >= BITE_COOLDOWN_MS) {
          this.lastBiteAt = now;
          this.markAttackLanded(now);
          return true; // bite lands
        }
        return false;
      }
      // Ground-truth stuck detection: sample actual displacement every
      // STUCK_CHECK_INTERVAL_MS. If it's too small — wedged against one
      // obstacle, oscillating between several, whatever the cause — commit to
      // a fresh randomized heading for ESCAPE_DURATION_MS. A new random pick
      // each time (rather than a fixed offset) is what prevents repeating the
      // exact same failed maneuver against the same obstacle layout forever.
      const directAngle = Phaser.Math.Angle.Between(this.x, this.y, playerX, playerY);
      if (now - this.lastProgressCheckAt >= STUCK_CHECK_INTERVAL_MS) {
        const moved = Phaser.Math.Distance.Between(this.x, this.y, this.lastProgressX, this.lastProgressY);
        if (moved < STUCK_DISPLACEMENT_PX && now >= this.escapeUntil) {
          // Biased to near-tangent (roughly perpendicular to the direct-to-
          // player line): near-forward just re-hits the same obstacle, and
          // anything past ~100° has a net-negative cosine projection onto the
          // goal direction — i.e. it's *backward*, so repeated escapes in
          // that range compound into steady drift away from the player
          // rather than sliding around the obstacle at roughly constant
          // distance (this was tried and measured: a wider 99-162° range
          // reliably walked the Boar out of aggro range over several
          // consecutive attempts). The side itself is fixed per-instance
          // (escapeSide), not re-picked here, so repeated attempts commit to
          // working around the same edge instead of zigzagging.
          const offset = Phaser.Math.FloatBetween(Math.PI * 0.36, Math.PI * 0.56);
          this.escapeAngle = directAngle + this.escapeSide * offset;
          this.escapeUntil = now + ESCAPE_DURATION_MS;
        }
        this.lastProgressCheckAt = now;
        this.lastProgressX = this.x;
        this.lastProgressY = this.y;
      }
      const angle = now < this.escapeUntil ? this.escapeAngle : directAngle;
      const vx = Math.cos(angle) * CHASE_SPEED;
      const vy = Math.sin(angle) * CHASE_SPEED;
      body.setVelocity(vx, vy);
      this.applyFacing(vx, vy);
      return false;
    }

    // Idle wander: pick a small nearby target periodically, drift toward it.
    if (now >= this.nextWanderAt) {
      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const d2 = Phaser.Math.Between(20, 50);
      this.wanderTarget = { x: this.x + Math.cos(angle) * d2, y: this.y + Math.sin(angle) * d2 };
      this.nextWanderAt = now + Phaser.Math.Between(2000, 4000);
    }
    if (this.wanderTarget) {
      const d = Phaser.Math.Distance.Between(this.x, this.y, this.wanderTarget.x, this.wanderTarget.y);
      if (d < 4) {
        body.setVelocity(0, 0);
      } else {
        const angle = Phaser.Math.Angle.Between(this.x, this.y, this.wanderTarget.x, this.wanderTarget.y);
        const vx = Math.cos(angle) * WANDER_SPEED;
        const vy = Math.sin(angle) * WANDER_SPEED;
        body.setVelocity(vx, vy);
        this.applyFacing(vx, vy);
      }
    }
    return false;
  }

  // Full 360° facing: rotate the sprite to point along its current
  // direction of travel rather than just flipping left/right. The boar
  // texture is drawn nose-first toward the left (angle PI when unrotated —
  // see BootScene), so the rotation needed to align it with a movement
  // vector is that vector's angle offset by PI. Skips the update while
  // nearly stopped so it keeps its last facing (e.g. mid-bite) instead of
  // snapping to an arbitrary angle from a near-zero velocity.
  private applyFacing(vx: number, vy: number): void {
    if (Math.abs(vx) < 3 && Math.abs(vy) < 3) return;
    this.setRotation(Math.atan2(vy, vx) + Math.PI);
  }

  // Same shape/feel as ResourceNode.takeHit: apply damage + feedback, return
  // true once depleted so the caller awards loot and destroys.
  takeHit(damage: number): boolean {
    this.health = Math.max(0, this.health - damage);
    this.playHitFeedback();
    // Being attacked always overrides the post-giveup immunity window — an
    // enemy that just backed off doesn't stand there tanking hits without
    // fighting back.
    this.aggroImmuneUntil = 0;
    if (this.state === "idle") {
      this.state = "chasing";
      this.startPursuit(this.scene.time.now);
    }
    return this.health <= 0;
  }

  private playHitFeedback(): void {
    this.scene.tweens.killTweensOf(this);
    const baseX = this.x;
    this.scene.tweens.add({
      targets: this,
      x: baseX + 4,
      duration: 60,
      yoyo: true,
      repeat: 1,
      ease: "Sine.easeInOut",
      onComplete: () => {
        this.x = baseX;
      },
    });
    const frac = this.health / this.maxHealth;
    const shade = Phaser.Display.Color.Interpolate.ColorWithColor(
      new Phaser.Display.Color(255, 255, 255),
      new Phaser.Display.Color(140, 20, 20),
      100,
      Math.round((1 - frac) * 100),
    );
    this.setTint(Phaser.Display.Color.GetColor(shade.r, shade.g, shade.b));
  }

  // Death feedback (fade), then the caller destroys/removes from tracking
  // and spawns loot. Kept out of takeHit so MainScene can read x/y for the
  // loot drop before anything moves/destructs.
  playDeathFeedback(onComplete: () => void): void {
    this.depleted = true;
    (this.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
    this.scene.tweens.killTweensOf(this);
    this.healthBarBg.destroy();
    this.healthBarFill.destroy();
    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      duration: 300,
      ease: "Sine.easeIn",
      onComplete: () => {
        this.destroy();
        onComplete();
      },
    });
  }
}
