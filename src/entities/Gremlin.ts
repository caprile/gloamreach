import Phaser from "phaser";
import { Enemy } from "./Enemy";
import type { ProjectileConfig, ProjectileHost } from "./Projectile";

// Two gremlin variants (per the first-biome content plan's Milestone C
// note, added 2026-07-07): a stronger ranged+melee one and a weaker
// melee-only one. They're deliberately separate classes with their own
// state machines/numbers rather than one class with a "ranged?" flag — the
// melee-only variant genuinely has no kiting/throwing states to speak of,
// consistent with the standing "own condition, not just a knob" rule.

const RANGED_AGGRO_RADIUS = 160; // larger than melee — ranged notices earlier
const RANGED_DEAGGRO_RADIUS = 260;
const KITE_SPEED = 55; // constantly backs away while in ranged mode
const RANGED_MELEE_RANGE = 24; // player closing to this -> switches to melee mode
const RANGED_MELEE_EXIT_RANGE = 40; // must back out past this (not just RANGED_MELEE_RANGE) to leave melee mode — hysteresis gap, same reasoning as AGGRO/DEAGGRO_RADIUS elsewhere: without it, the player-enemy physics collider's constant separation jitter flips the mode every frame right at the boundary
const RANGED_MELEE_COOLDOWN_MS = 900;
const RANGED_CLAW_DAMAGE = 10; // punishes closing the distance, higher than a single throw
const PROJECTILE_SPEED = 220;
const PROJECTILE_DAMAGE = 8;
const PROJECTILE_MAX_RANGE = 260;
const RANGED_MAX_HEALTH = 32; // doubled 2026-07-07 (was 16) — tanky enough to trade at range
// Burst pattern (2026-07-07 spec): once the player is in range, fire a quick
// 2-shot burst, then wait out a longer cooldown before the next burst — not a
// flat per-shot cooldown. BURST_SHOT_INTERVAL_MS is deliberately short (a
// "double tap"), BURST_COOLDOWN_MS is the gap between bursts.
const BURST_SHOT_COUNT = 2;
const BURST_SHOT_INTERVAL_MS = 180;
const BURST_COOLDOWN_MS = 2400;

type RangedMode = "idle" | "ranged" | "meleeing";

// Stronger variant: kites + fires 2-shot bursts at range, but fully commits to
// fighting back in melee the instant the player closes inside melee range —
// and drops back to ranged/kiting the instant the player backs back out of
// it (not a fallback-only claw anymore, a real mode toggle both ways). Drops
// both Gremlin Skin (Drying Rack -> Gremlin Leather) and Gremlin Blood — the
// skin is exclusive to this variant so Gremlin Leather Armor isn't trivially
// farmable from the weak melee-only one.
export class RangedGremlin extends Enemy {
  private mode: RangedMode = "idle";
  private lastMeleeAt = -Infinity;
  // Burst state: shotsFiredInBurst counts 0/1 mid-burst, resets to 0 once a
  // full burst completes and starts burstCooldownUntil.
  private shotsFiredInBurst = 0;
  private nextBurstShotAt = -Infinity;
  private burstCooldownUntil = 0;

  constructor(scene: Phaser.Scene, cfg: { x: number; y: number }) {
    super(scene, {
      x: cfg.x,
      y: cfg.y,
      texture: "gremlin",
      displayName: "Gremlin",
      loot: [
        { resource: "gremlin_skin", min: 1, max: 1 },
        { resource: "gremlin_blood", min: 1, max: 1 },
      ],
      maxHealth: RANGED_MAX_HEALTH,
      biteDamage: RANGED_CLAW_DAMAGE, // reuses Enemy's shared "melee hit" field name
    });
  }

  update(_delta: number, playerX: number, playerY: number, now: number): boolean {
    if (this.depleted) return false;
    const body = this.body as Phaser.Physics.Arcade.Body;
    const dist = Phaser.Math.Distance.Between(this.x, this.y, playerX, playerY);

    if (this.mode === "idle") {
      if (dist <= RANGED_AGGRO_RADIUS && this.canAggro(dist, now)) {
        this.mode = "ranged";
        this.startPursuit(now);
      } else {
        return false;
      }
    }

    if (dist > RANGED_DEAGGRO_RADIUS) {
      this.mode = "idle";
      body.setVelocity(0, 0);
      return false;
    }
    if (this.hasGivenUpPursuit(now)) {
      this.mode = "idle";
      this.enterGivenUpState(now);
      body.setVelocity(0, 0);
      return false;
    }

    // Mode toggles both ways, but with a hysteresis gap between the enter and
    // exit thresholds (RANGED_MELEE_RANGE vs RANGED_MELEE_EXIT_RANGE) — a
    // single shared threshold let the player-enemy physics collider's
    // separation jitter flip the mode every frame while hovering right at the
    // boundary. Not a one-way fallback: still toggles both directions, just
    // with a buffer zone instead of a knife-edge.
    if (this.mode === "meleeing") {
      if (dist > RANGED_MELEE_EXIT_RANGE) this.mode = "ranged";
    } else if (dist <= RANGED_MELEE_RANGE) {
      this.mode = "meleeing";
    }

    if (this.mode === "meleeing") {
      body.setVelocity(0, 0);
      this.applyFacing(playerX - this.x, playerY - this.y);
      if (now - this.lastMeleeAt >= RANGED_MELEE_COOLDOWN_MS) {
        this.lastMeleeAt = now;
        this.markAttackLanded(now);
        return true; // claw lands
      }
      return false;
    }

    // Ranged mode: always kiting (backing directly away) while managing the
    // burst-fire cycle below.
    const awayAngle = Phaser.Math.Angle.Between(playerX, playerY, this.x, this.y);
    const vx = Math.cos(awayAngle) * KITE_SPEED;
    const vy = Math.sin(awayAngle) * KITE_SPEED;
    body.setVelocity(vx, vy);
    this.applyFacing(vx, vy);

    if (this.shotsFiredInBurst === 0 && now >= this.burstCooldownUntil) {
      this.fireShot(playerX, playerY, now);
      this.shotsFiredInBurst = 1;
      this.nextBurstShotAt = now + BURST_SHOT_INTERVAL_MS;
    } else if (this.shotsFiredInBurst > 0 && this.shotsFiredInBurst < BURST_SHOT_COUNT && now >= this.nextBurstShotAt) {
      this.fireShot(playerX, playerY, now);
      this.shotsFiredInBurst++;
      if (this.shotsFiredInBurst >= BURST_SHOT_COUNT) {
        this.shotsFiredInBurst = 0;
        this.burstCooldownUntil = now + BURST_COOLDOWN_MS;
      } else {
        this.nextBurstShotAt = now + BURST_SHOT_INTERVAL_MS;
      }
    }
    return false;
  }

  private fireShot(playerX: number, playerY: number, now: number): void {
    this.markAttackLanded(now);
    const angle = Phaser.Math.Angle.Between(this.x, this.y, playerX, playerY);
    const cfg: ProjectileConfig = {
      x: this.x,
      y: this.y,
      angle,
      speed: PROJECTILE_SPEED,
      damage: PROJECTILE_DAMAGE,
      texture: "gremlin_rock",
      maxRangePx: PROJECTILE_MAX_RANGE,
      sourceIsPlayer: false,
    };
    (this.scene as unknown as ProjectileHost).spawnProjectile(cfg);
  }

  // Getting hit while idle should snap it into the fight instead of tanking
  // hits passively — mirrors Enemy.takeHit()'s own idle->chasing flip, just
  // keyed off `mode` since this variant doesn't use the shared `state` field.
  takeHit(damage: number): boolean {
    const depleted = super.takeHit(damage);
    if (!depleted && this.mode === "idle") {
      this.mode = "ranged";
      this.startPursuit(this.scene.time.now);
    }
    return depleted;
  }

  protected isAggro(): boolean {
    return this.mode !== "idle";
  }
}

const MELEE_AGGRO_RADIUS = 130;
const MELEE_DEAGGRO_RADIUS = 220;
const MELEE_CHASE_SPEED = 70;
const MELEE_WANDER_SPEED = 20;
const MELEE_RANGE = 24;
const MELEE_CLAW_COOLDOWN_MS = 800;
const MELEE_CLAW_DAMAGE = 8; // weaker than the ranged variant's fallback claw (10) and Boar's bite (25)
const MELEE_MAX_HEALTH = 12;

type MeleeMode = "idle" | "chasing";

// Weaker variant: no kiting/throwing states at all — plain chase-and-claw,
// but with its own tuned numbers (not Boar's), per the standing "own
// condition/numbers, don't copy" rule. Drops Gremlin Blood only (no skin).
export class MeleeGremlin extends Enemy {
  private mode: MeleeMode = "idle";
  private lastClawAt = -Infinity;
  private meleeWanderTarget: { x: number; y: number } | null = null;
  private nextMeleeWanderAt = 0;

  constructor(scene: Phaser.Scene, cfg: { x: number; y: number }) {
    super(scene, {
      x: cfg.x,
      y: cfg.y,
      texture: "gremlin_weak",
      displayName: "Weak Gremlin",
      loot: [{ resource: "gremlin_blood", min: 1, max: 1 }],
      maxHealth: MELEE_MAX_HEALTH,
      biteDamage: MELEE_CLAW_DAMAGE,
    });
  }

  update(_delta: number, playerX: number, playerY: number, now: number): boolean {
    if (this.depleted) return false;
    const body = this.body as Phaser.Physics.Arcade.Body;
    const dist = Phaser.Math.Distance.Between(this.x, this.y, playerX, playerY);

    if (this.mode === "idle" && dist <= MELEE_AGGRO_RADIUS && this.canAggro(dist, now)) {
      this.mode = "chasing";
      this.startPursuit(now);
    } else if (this.mode === "chasing") {
      if (dist > MELEE_DEAGGRO_RADIUS) {
        this.mode = "idle";
      } else if (this.hasGivenUpPursuit(now)) {
        this.mode = "idle";
        this.enterGivenUpState(now);
      }
    }

    if (this.mode === "chasing") {
      if (dist <= MELEE_RANGE) {
        body.setVelocity(0, 0);
        this.applyFacing(playerX - this.x, playerY - this.y);
        if (now - this.lastClawAt >= MELEE_CLAW_COOLDOWN_MS) {
          this.lastClawAt = now;
          this.markAttackLanded(now);
          return true; // claw lands
        }
        return false;
      }
      const angle = Phaser.Math.Angle.Between(this.x, this.y, playerX, playerY);
      const vx = Math.cos(angle) * MELEE_CHASE_SPEED;
      const vy = Math.sin(angle) * MELEE_CHASE_SPEED;
      body.setVelocity(vx, vy);
      this.applyFacing(vx, vy);
      return false;
    }

    if (now >= this.nextMeleeWanderAt) {
      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const d = Phaser.Math.Between(20, 50);
      this.meleeWanderTarget = { x: this.x + Math.cos(angle) * d, y: this.y + Math.sin(angle) * d };
      this.nextMeleeWanderAt = now + Phaser.Math.Between(2000, 4000);
    }
    if (this.meleeWanderTarget) {
      const d = Phaser.Math.Distance.Between(this.x, this.y, this.meleeWanderTarget.x, this.meleeWanderTarget.y);
      if (d < 4) {
        body.setVelocity(0, 0);
      } else {
        const angle = Phaser.Math.Angle.Between(this.x, this.y, this.meleeWanderTarget.x, this.meleeWanderTarget.y);
        const vx = Math.cos(angle) * MELEE_WANDER_SPEED;
        const vy = Math.sin(angle) * MELEE_WANDER_SPEED;
        body.setVelocity(vx, vy);
        this.applyFacing(vx, vy);
      }
    }
    return false;
  }

  protected isAggro(): boolean {
    return this.mode === "chasing";
  }
}
