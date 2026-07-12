import Phaser from "phaser";
import { Enemy } from "./Enemy";

// Boar — the bruiser / standout beast of the roster. Its souls-like identity is
// a committed CHARGE (a locked-direction gore-rush that overshoots past the
// player, followed by a long recovery/turnaround the player punishes) plus a
// quick point-blank GORE bite so it can't be trivially circled up close. It no
// longer uses the base Enemy chase/bite machine — it fully overrides update()
// (same precedent as Snake/Gremlin), driving both attacks off the shared
// attack-phase clock + wind-up tell on the base class. Damage flows through the
// existing boolean contract (return true → biteDamage), with a shove via the
// base pendingAttackKnockback field.

const AGGRO_RADIUS = 120; // px — the boar notices and commits from a fair range
const DEAGGRO_RADIUS = 230; // hysteresis gap above aggro, avoids boundary flicker
const CHASE_SPEED = 60; // px/s — deliberate approach; slower than the player so it relies on the charge to close
const WANDER_SPEED = 20;

const MAX_HEALTH = 20;
const BITE_DAMAGE = 25; // shared "hit" value for both the gore bite and the charge

// Point-blank gore bite — short, snappy, keeps a cornered player honest.
const GORE_RANGE = 44; // dist at/under which the boar gores instead of charging
const GORE_WINDUP_MS = 260;
const GORE_STRIKE_MS = 90;
const GORE_RECOVER_MS = 320;
const GORE_COOLDOWN_MS = 500;
const GORE_KNOCKBACK = 120;

// Signature charge — a big telegraph, a fast committed lunge along a LOCKED
// direction that overshoots, then a long recovery. The whole point is that the
// direction is fixed at wind-up start (never re-homed), so a sidestep dodges it
// and the overshoot + recovery leave the boar's flank exposed.
const CHARGE_TRIGGER_MAX = 220; // px — beyond this it just chases to close the gap
const CHARGE_WINDUP_MS = 620; // paws-the-ground tell — long enough to read and sidestep
const CHARGE_SPEED = 270; // px/s — clearly faster than chase, so it closes a kiter
// Overshoot + recovery both trimmed per playtest feedback ("recover faster,
// don't overshoot so much") — still a real punish window, just less brutal.
const CHARGE_MAX_DISTANCE = 170; // travels this far, overshooting past the player (was 230)
const CHARGE_HIT_RADIUS = 26; // point+radius contact check along the rush
const CHARGE_RECOVER_MS = 550; // long turnaround — the main punish window (was 820)
const CHARGE_COOLDOWN_MS = 700;
const CHARGE_KNOCKBACK = 300;

type BoarMode = "idle" | "chasing";
type BoarAttack = "gore" | "charge";

export class Boar extends Enemy {
  private mode: BoarMode = "idle";
  private currentAttack: BoarAttack | null = null;
  private nextAttackReadyAt = 0;

  // Charge state — locked at wind-up start, never re-read (see the note above).
  private chargeAngle = 0;
  private chargeTraveled = 0;
  private chargeHit = false;

  private boarWanderTarget: { x: number; y: number } | null = null;
  private boarNextWanderAt = 0;

  constructor(scene: Phaser.Scene, cfg: { x: number; y: number; elite?: boolean }) {
    const elite = cfg.elite ?? false;
    super(scene, {
      x: cfg.x,
      y: cfg.y,
      texture: elite ? "boar_elite" : "boar",
      displayName: elite ? "Elite Boar" : "Boar",
      // Bones feed a lot of upgrades (bone knife, armor, spear), so a normal
      // Boar drops 1-2 (was flat 1) to keep the run economy from starving —
      // see the 2026-07-11 playtest "ran out of bones" note.
      loot: elite
        ? [
            { resource: "boar_meat", min: 2, max: 2 },
            { resource: "bones", min: 2, max: 3 },
          ]
        : [
            { resource: "boar_meat", min: 1, max: 1 },
            { resource: "bones", min: 1, max: 2 },
          ],
      maxHealth: elite ? Math.round(MAX_HEALTH * 1.5) : MAX_HEALTH,
      biteDamage: elite ? Math.round(BITE_DAMAGE * 1.5) : BITE_DAMAGE,
      elite,
      eliteTrophy: "boar_trophy",
    });
    if (elite) {
      this.speedMult = 1.1;
      this.setScale(1.3);
      this.baseScale = 1.3; // wind-up pulse throbs around the elite's size
    }
  }

  // Boar tracks aggro via its own `mode` (not the base `state`), so override
  // the HP-bar visibility check accordingly.
  isAggro(): boolean {
    return this.mode === "chasing";
  }

  // Getting hit while idle should snap it into the fight instead of tanking
  // hits passively — mirrors RangedGremlin/Hexling's own takeHit override
  // (this is what a ranged weapon's out-of-aggro-range shot needs to
  // actually wake the boar; the base Enemy's forceAggro() flips the shared
  // `state` field, which Boar's own `mode`-driven update() never reads).
  takeHit(damage: number): boolean {
    const depleted = super.takeHit(damage);
    if (!depleted && this.mode === "idle") {
      this.mode = "chasing";
      this.startPursuit(this.scene.time.now);
    }
    return depleted;
  }

  update(delta: number, playerX: number, playerY: number, now: number): boolean {
    if (this.depleted) return false;
    const body = this.body as Phaser.Physics.Arcade.Body;
    const dist = Phaser.Math.Distance.Between(this.x, this.y, playerX, playerY);

    // Aggro / deaggro — never while mid-attack (a committed charge/gore plays out).
    if (this.mode === "idle" && dist <= AGGRO_RADIUS && this.canAggro(dist, now)) {
      this.mode = "chasing";
      this.startPursuit(now);
    } else if (this.mode === "chasing" && !this.isAttacking()) {
      if (dist > DEAGGRO_RADIUS) {
        this.mode = "idle";
      } else if (this.hasGivenUpPursuit(now)) {
        this.mode = "idle";
        this.enterGivenUpState(now);
      }
    }

    // Pick an attack when chasing, in range, and off cooldown: gore up close,
    // charge at mid-range.
    if (this.mode === "chasing" && !this.isAttacking() && now >= this.nextAttackReadyAt) {
      if (dist <= GORE_RANGE + this.reachBonus()) this.startGore(now, playerX, playerY);
      else if (dist <= CHARGE_TRIGGER_MAX) this.startCharge(now, playerX, playerY);
    }

    if (this.isAttacking()) {
      return this.currentAttack === "charge"
        ? this.updateCharge(delta, playerX, playerY, now)
        : this.updateGore(playerX, playerY, now);
    }

    if (this.mode === "chasing") {
      const angle = Phaser.Math.Angle.Between(this.x, this.y, playerX, playerY);
      const speed = CHASE_SPEED * this.speedMult * this.envSpeedMult;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;
      body.setVelocity(vx, vy);
      this.applyFacing(vx, vy);
      return false;
    }

    // Idle wander — small incremental drift (matches the old base behavior).
    if (now >= this.boarNextWanderAt) {
      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const d = Phaser.Math.Between(20, 50);
      this.boarWanderTarget = { x: this.x + Math.cos(angle) * d, y: this.y + Math.sin(angle) * d };
      this.boarNextWanderAt = now + Phaser.Math.Between(2000, 4000);
    }
    if (this.boarWanderTarget) {
      const d = Phaser.Math.Distance.Between(this.x, this.y, this.boarWanderTarget.x, this.boarWanderTarget.y);
      if (d < 4) {
        body.setVelocity(0, 0);
      } else {
        const angle = Phaser.Math.Angle.Between(this.x, this.y, this.boarWanderTarget.x, this.boarWanderTarget.y);
        const vx = Math.cos(angle) * WANDER_SPEED;
        const vy = Math.sin(angle) * WANDER_SPEED;
        body.setVelocity(vx, vy);
        this.applyFacing(vx, vy);
      }
    }
    return false;
  }

  private startGore(now: number, playerX: number, playerY: number): void {
    this.currentAttack = "gore";
    this.attackPhase = "windup";
    this.attackStartedAt = now;
    this.applyFacing(playerX - this.x, playerY - this.y);
    this.playWindupTell(GORE_WINDUP_MS);
    (this.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
  }

  private updateGore(playerX: number, playerY: number, now: number): boolean {
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(0, 0);
    const dist = Phaser.Math.Distance.Between(this.x, this.y, playerX, playerY);

    if (this.attackPhase === "windup") {
      if (this.attackElapsed(now) >= GORE_WINDUP_MS) {
        this.attackPhase = "strike";
        this.attackStartedAt = now;
        this.endWindupTell();
        const hit = dist <= GORE_RANGE + this.reachBonus();
        this.pendingAttackKnockback = hit ? GORE_KNOCKBACK : 0;
        if (hit) this.markAttackLanded(now);
        return hit; // re-checked against current position → dodgeable
      }
      return false;
    }
    if (this.attackPhase === "strike") {
      if (this.attackElapsed(now) >= GORE_STRIKE_MS) {
        this.attackPhase = "recover";
        this.attackStartedAt = now;
      }
      return false;
    }
    // recover
    if (this.attackElapsed(now) >= GORE_RECOVER_MS) {
      this.attackPhase = "none";
      this.currentAttack = null;
      this.nextAttackReadyAt = now + GORE_COOLDOWN_MS;
    }
    return false;
  }

  private startCharge(now: number, playerX: number, playerY: number): void {
    this.currentAttack = "charge";
    this.attackPhase = "windup";
    this.attackStartedAt = now;
    // Lock the charge direction NOW — never re-aimed, so a sidestep dodges it.
    this.chargeAngle = Phaser.Math.Angle.Between(this.x, this.y, playerX, playerY);
    // Point the sprite along the locked charge direction for the whole wind-up
    // (faceAngle, not applyFacing — the latter no-ops on the unit vector).
    this.faceAngle(this.chargeAngle);
    this.playWindupTell(CHARGE_WINDUP_MS, 0xff7a3a); // hotter/orange tell for the big attack
    this.chargeTraveled = 0;
    this.chargeHit = false;
    (this.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
  }

  private updateCharge(delta: number, playerX: number, playerY: number, now: number): boolean {
    const body = this.body as Phaser.Physics.Arcade.Body;

    if (this.attackPhase === "windup") {
      body.setVelocity(0, 0);
      if (this.attackElapsed(now) >= CHARGE_WINDUP_MS) {
        this.attackPhase = "strike";
        this.attackStartedAt = now;
        this.endWindupTell();
        body.setVelocity(Math.cos(this.chargeAngle) * CHARGE_SPEED, Math.sin(this.chargeAngle) * CHARGE_SPEED);
        this.applyFacing(Math.cos(this.chargeAngle), Math.sin(this.chargeAngle));
      }
      return false;
    }

    if (this.attackPhase === "strike") {
      this.chargeTraveled += (CHARGE_SPEED * delta) / 1000;
      const dist = Phaser.Math.Distance.Between(this.x, this.y, playerX, playerY);
      if (!this.chargeHit && dist <= CHARGE_HIT_RADIUS + this.reachBonus()) {
        this.chargeHit = true;
        this.pendingAttackKnockback = CHARGE_KNOCKBACK;
        this.markAttackLanded(now);
        body.setVelocity(0, 0);
        this.attackPhase = "recover";
        this.attackStartedAt = now;
        return true; // gore connects
      }
      if (this.chargeTraveled >= CHARGE_MAX_DISTANCE) {
        body.setVelocity(0, 0);
        this.attackPhase = "recover";
        this.attackStartedAt = now;
      }
      return false;
    }

    // recover — the long turnaround; the punish window
    body.setVelocity(0, 0);
    if (this.attackElapsed(now) >= CHARGE_RECOVER_MS) {
      this.attackPhase = "none";
      this.currentAttack = null;
      this.nextAttackReadyAt = now + CHARGE_COOLDOWN_MS;
    }
    return false;
  }
}
