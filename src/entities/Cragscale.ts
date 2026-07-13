import Phaser from "phaser";
import { Enemy } from "./Enemy";
import type { SwingConfig } from "./Enemy";

// Cragscale — the badlands armored rock reptile (biome 2 Phase 2). Slow, tanky,
// hits hard: the enemy that TEACHES the Phase 1 damage-type layer. Its
// resistances (resist slash, neutral blunt, weak pierce — locked with the user)
// are declared as data on EnemyConfig; the resist math + damage-number tint live
// in MainScene.resolveWeaponHit. Uses the base `state` field (no private mode)
// so forceAggro()/isAggro() need no override.
//
// Two attacks give it a distinct rhythm: a heavy point-blank BASHER, and a
// signature ROLLING CHARGE — it tucks into its shell and barrels along a locked
// line (spinning), which is how a 40px/s tank actually catches a kiting player
// (built on the same locked-direction charge mechanism as Boar). The long
// telegraphs + recoveries make the fight about spacing + the right damage type.

const AGGRO_RADIUS = 130;
const DEAGGRO_RADIUS = 240;
const CHASE_SPEED = 40; // deliberate lumber — but the roll closes the gap
const WANDER_SPEED = 14;
const MELEE_RANGE = 30; // its big body needs a slightly longer basher threshold

const MAX_HEALTH = 60; // "noticeably tougher" = a real damage sponge vs the forest roster
// 48, not 40: badlands still read "a bit weak" in full armor (the user). The tank
// should be the scariest single hit out here — 48 - 13 = 35 net through max
// (Lvl-3, 13 flat) armor, on top of its resist-slash/weak-pierce gimmick + bleed.
const BITE_DAMAGE = 48; // shared "hit" value for both the basher and the roll

// Heavy basher — a long, readable wind-up + long recovery (the punish window),
// with a solid shove on connect.
const BASHER_SWING: SwingConfig = {
  reach: 34,
  windupMs: 520,
  strikeMs: 100,
  recoverMs: 600,
  cooldownMs: 700,
  knockback: 180,
};

// Rolling charge — locked-direction shell roll that overshoots then recovers.
// Reworked (the user: "too easy to sidestep without requiring sprint/dodge" and
// "feels the same as duskrunner"): faster + a wider hit radius so a lazy
// side-step no longer clears it (you need a dash/committed move), and a connect
// now opens a BLEED wound on top of the big shove — getting rolled is the heavy,
// scary threat that separates the tank from the Duskrunner's quick light pounce.
const ROLL_TRIGGER_MAX = 215; // beyond MELEE_RANGE and within this → roll to close
const ROLL_WINDUP_MS = 560; // tuck-in tell
const ROLL_SPEED = 300; // was 240 — fast enough to catch a strafing player
const ROLL_MAX_DIST = 230;
// 58, not 40 (the user: "bigger radius when spinning"). The rolling shell now
// sweeps a genuinely wide lane — a lazy strafe won't clear it; you need a
// committed dash or to get fully outside its line.
const ROLL_HIT_RADIUS = 58;
const ROLL_RECOVER_MS = 640; // unroll/turnaround — the punish window
const ROLL_COOLDOWN_MS = 1000;
const ROLL_KNOCKBACK = 230;
const ROLL_SPIN_RATE = 0.03; // rad/ms sprite spin while rolling (the visual tell)
// Bleed opened by a landed roll: 5/s for 4s (~20 total, stacks if re-rolled).
const ROLL_BLEED_DPS = 5;
const ROLL_BLEED_MS = 4000;

type CragAttack = "basher" | "roll";

export class Cragscale extends Enemy {
  private wanderTgt: { x: number; y: number } | null = null;
  private nextRoamAt = 0;

  private currentAttack: CragAttack | null = null;
  private rollAngle = 0;
  private rollTraveled = 0;
  private rollHit = false;
  private rollCooldownUntil = 0;

  constructor(scene: Phaser.Scene, cfg: { x: number; y: number; elite?: boolean }) {
    const elite = cfg.elite ?? false;
    super(scene, {
      x: cfg.x,
      y: cfg.y,
      texture: elite ? "cragscale_elite" : "cragscale",
      displayName: elite ? "Elite Cragscale" : "Cragscale",
      loot: elite
        ? [{ resource: "cragscale_plate", min: 3, max: 4 }]
        : [{ resource: "cragscale_plate", min: 1, max: 2 }],
      maxHealth: elite ? Math.round(MAX_HEALTH * 1.5) : MAX_HEALTH,
      biteDamage: elite ? Math.round(BITE_DAMAGE * 1.5) : BITE_DAMAGE,
      elite,
      eliteTrophy: "cragscale_trophy",
      // Locked resist profile: stone-hard plates turn aside blades (slash), take
      // blunt normally, and crack under a thrust (pierce = the Primal Spear).
      // ranged/magic left neutral (absent = 1).
      resistances: { slash: 0.5, blunt: 1.0, pierce: 1.6 },
    });
    if (elite) {
      this.speedMult = 1.1;
      this.setScale(1.3);
      this.baseScale = 1.3; // wind-up pulse throbs around the elite's size
    }
  }

  update(delta: number, playerX: number, playerY: number, now: number): boolean {
    if (this.depleted) return false;
    const body = this.body as Phaser.Physics.Arcade.Body;
    const dist = Phaser.Math.Distance.Between(this.x, this.y, playerX, playerY);

    if (this.state === "idle" && dist <= AGGRO_RADIUS && this.canAggro(dist, now)) {
      this.state = "chasing";
      this.startPursuit(now);
    } else if (this.state === "chasing" && !this.isAttacking()) {
      if (dist > DEAGGRO_RADIUS && !this.withinAggroPersist(now)) {
        this.state = "idle";
      } else if (this.hasGivenUpPursuit(now)) {
        this.state = "idle";
        this.enterGivenUpState(now);
      }
    }

    if (this.state === "chasing") {
      if (this.isAttacking()) {
        return this.currentAttack === "roll"
          ? this.updateRoll(delta, playerX, playerY, now)
          : this.continueBasher(body, playerX, playerY, now);
      }
      if (dist <= MELEE_RANGE + this.reachBonus()) {
        this.currentAttack = "basher";
        return this.continueBasher(body, playerX, playerY, now);
      }
      if (dist <= ROLL_TRIGGER_MAX && now >= this.rollCooldownUntil) {
        this.startRoll(now, playerX, playerY);
        return false;
      }
      const angle = Phaser.Math.Angle.Between(this.x, this.y, playerX, playerY);
      const speed = CHASE_SPEED * this.speedMult * this.envSpeedMult;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;
      body.setVelocity(vx, vy);
      this.applyFacing(vx, vy);
      return false;
    }

    if (now >= this.nextRoamAt) {
      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const d = Phaser.Math.Between(15, 40);
      this.wanderTgt = { x: this.x + Math.cos(angle) * d, y: this.y + Math.sin(angle) * d };
      this.nextRoamAt = now + Phaser.Math.Between(2500, 4500);
    }
    if (this.wanderTgt) {
      const d = Phaser.Math.Distance.Between(this.x, this.y, this.wanderTgt.x, this.wanderTgt.y);
      if (d < 4) {
        body.setVelocity(0, 0);
      } else {
        const angle = Phaser.Math.Angle.Between(this.x, this.y, this.wanderTgt.x, this.wanderTgt.y);
        const vx = Math.cos(angle) * WANDER_SPEED;
        const vy = Math.sin(angle) * WANDER_SPEED;
        body.setVelocity(vx, vy);
        this.applyFacing(vx, vy);
      }
    }
    return false;
  }

  private continueBasher(
    body: Phaser.Physics.Arcade.Body,
    playerX: number,
    playerY: number,
    now: number,
  ): boolean {
    const hit = this.tickMeleeSwing(body, playerX, playerY, now, BASHER_SWING);
    if (!this.isAttacking()) this.currentAttack = null;
    if (hit) {
      this.markAttackLanded(now);
      return true;
    }
    return false;
  }

  private startRoll(now: number, playerX: number, playerY: number): void {
    this.currentAttack = "roll";
    this.attackPhase = "windup";
    this.attackStartedAt = now;
    this.rollAngle = Phaser.Math.Angle.Between(this.x, this.y, playerX, playerY);
    this.faceAngle(this.rollAngle);
    this.playWindupTell(ROLL_WINDUP_MS, 0xd6a24a); // sandy tuck-in tell
    this.rollTraveled = 0;
    this.rollHit = false;
    (this.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
  }

  private updateRoll(delta: number, playerX: number, playerY: number, now: number): boolean {
    const body = this.body as Phaser.Physics.Arcade.Body;

    if (this.attackPhase === "windup") {
      body.setVelocity(0, 0);
      if (this.attackElapsed(now) >= ROLL_WINDUP_MS) {
        this.attackPhase = "strike";
        this.attackStartedAt = now;
        this.endWindupTell();
        const spd = ROLL_SPEED * this.speedMult;
        body.setVelocity(Math.cos(this.rollAngle) * spd, Math.sin(this.rollAngle) * spd);
      }
      return false;
    }

    if (this.attackPhase === "strike") {
      this.rotation += ROLL_SPIN_RATE * delta; // spin while rolling (the visual tell)
      this.rollTraveled += (ROLL_SPEED * this.speedMult * delta) / 1000;
      const dist = Phaser.Math.Distance.Between(this.x, this.y, playerX, playerY);
      if (!this.rollHit && dist <= ROLL_HIT_RADIUS + this.reachBonus()) {
        this.rollHit = true;
        this.pendingAttackKnockback = ROLL_KNOCKBACK;
        this.pendingBleed = { dmgPerSec: ROLL_BLEED_DPS, durationMs: ROLL_BLEED_MS };
        this.markAttackLanded(now);
        body.setVelocity(0, 0);
        this.faceAngle(this.rollAngle); // stop spinning, settle facing
        this.attackPhase = "recover";
        this.attackStartedAt = now;
        return true; // roll connects
      }
      if (this.rollTraveled >= ROLL_MAX_DIST) {
        body.setVelocity(0, 0);
        this.faceAngle(this.rollAngle); // stop spinning, settle facing
        this.attackPhase = "recover";
        this.attackStartedAt = now;
      }
      return false;
    }

    // recover — unroll/turnaround, the punish window
    body.setVelocity(0, 0);
    if (this.attackElapsed(now) >= ROLL_RECOVER_MS) {
      this.attackPhase = "none";
      this.currentAttack = null;
      this.rollCooldownUntil = now + ROLL_COOLDOWN_MS;
    }
    return false;
  }
}
