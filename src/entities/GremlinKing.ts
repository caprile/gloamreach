import Phaser from "phaser";
import { Enemy } from "./Enemy";

// First boss — the "tutorial biome" boss. Fully bespoke telegraph/execute/
// recover state machine (does NOT reuse Enemy.update()'s idle/chase/bite
// machine at all, same "full override" precedent Snake.ts already
// established) built around three melee/AoE attacks read via a world-space
// telegraph indicator, plus a parallel poise/stagger meter that's the
// "pattern knowledge pays off" mechanic (per the standing "damage types are
// later" note, there's no elemental-weakness system yet — this is the v1
// substitute). Designed entirely around the player's EXISTING dash/i-frame
// toolkit; no new player ability was added for this fight.
export type BossState = "idle" | "telegraphing" | "executing" | "recovering" | "staggered";
export type BossAttackType = "cleave" | "charge" | "slam";

const BOSS_MAX_HEALTH = 600;
const BOSS_SCALE = 2.4;
const BOSS_AGGRO_RADIUS = 260;
const BOSS_ARENA_LEASH_RADIUS = 500; // from spawn point — kiting this far fully deaggros
const BOSS_MOVE_SPEED = 45; // slow deliberate approach outside of an attack

const BOSS_MAX_POISE = 100;
const STAGGER_DURATION_MS = 3000;
export const STAGGER_DAMAGE_MULTIPLIER = 1.5; // exported for MainScene.tryAttackEnemy's bonus-damage check
const POISE_REGEN_DELAY_MS = 4000; // only resumes this long after the last hit that chipped it
const POISE_REGEN_PER_SEC = 15;

const CLEAVE_TELEGRAPH_MS = 550;
const CLEAVE_EXECUTE_MS = 200;
const CLEAVE_RECOVER_MS = 700;
const CLEAVE_RANGE = 70;
const CLEAVE_ARC_DEG = 120;
const CLEAVE_DAMAGE = 22;

const CHARGE_TELEGRAPH_MS = 850;
const CHARGE_SPEED = 340;
const CHARGE_MAX_DISTANCE = 420;
const CHARGE_RECOVER_MS = 900;
const CHARGE_HIT_RADIUS = 34; // point+radius approximation, not a true capsule/segment check — see plan's flagged follow-up
const CHARGE_DAMAGE = 30;

const SLAM_TELEGRAPH_MS = 950;
const SLAM_EXECUTE_MS = 150;
const SLAM_RECOVER_MS = 800;
const SLAM_RADIUS = 110;
const SLAM_DAMAGE = 35;
const SLAM_KNOCKBACK = 260;

// Phase 2 (<50% HP): shorter telegraphs/recovery + faster approach — NOT more
// damage, per the locked decision (pressure comes from tighter timing, not a
// numbers wall). Multipliers are captured once per state-entry, not
// re-applied mid-state, so crossing the threshold mid-telegraph doesn't
// retroactively shrink an already-playing animation.
const ENRAGE_HP_THRESHOLD = 0.5;
const ENRAGE_TELEGRAPH_MULTIPLIER = 0.65;
const ENRAGE_RECOVER_MULTIPLIER = 0.75;
const ENRAGE_MOVE_MULTIPLIER = 1.3;

const ATTACK_COOLDOWN_MS = 1200;
const POISE_BAR_OFFSET_Y = 10; // px below the inherited HP bar's own line

function telegraphMsFor(attack: BossAttackType): number {
  if (attack === "cleave") return CLEAVE_TELEGRAPH_MS;
  if (attack === "charge") return CHARGE_TELEGRAPH_MS;
  return SLAM_TELEGRAPH_MS;
}

function recoverMsFor(attack: BossAttackType): number {
  if (attack === "cleave") return CLEAVE_RECOVER_MS;
  if (attack === "charge") return CHARGE_RECOVER_MS;
  return SLAM_RECOVER_MS;
}

export class GremlinKing extends Enemy {
  private bossState: BossState = "idle";
  private currentAttack: BossAttackType | null = null;
  private lastAttack: BossAttackType | null = null;
  private stateEnteredAt = 0;
  private currentStateDurationMs = 0;
  private nextAttackReadyAt = 0;
  private aggroed = false;
  private enraged = false;
  private readonly spawnX: number;
  private readonly spawnY: number;

  poise = BOSS_MAX_POISE;
  private lastPoiseChipAt = -Infinity;

  // Charge target is locked at telegraph-start (not homing) — captured once,
  // never re-read, so a sidestep during the telegraph actually dodges it.
  private chargeTargetX = 0;
  private chargeTargetY = 0;
  private chargeLineEndX = 0;
  private chargeLineEndY = 0;
  private chargeTraveled = 0;

  // One attack instance can only land once, not once per overlapping frame.
  private hasHitThisAttack = false;

  private poiseBarBg: Phaser.GameObjects.Rectangle;
  private poiseBarFill: Phaser.GameObjects.Rectangle;
  private telegraphGfx: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene, cfg: { x: number; y: number }) {
    super(scene, {
      x: cfg.x,
      y: cfg.y,
      texture: "gremlin_king",
      displayName: "Gremlin King",
      loot: [{ resource: "gremlin_king_fang", min: 1, max: 1 }],
      maxHealth: BOSS_MAX_HEALTH,
      biteDamage: 0, // never uses the base bite path — all damage flows through checkPlayerHit()
    });
    this.spawnX = cfg.x;
    this.spawnY = cfg.y;
    this.setScale(BOSS_SCALE);
    // Collision body stays at the base sprite's unscaled size while the
    // visual is scaled up (matches trees/boulders' already-loose approach to
    // collider precision) — a known, acceptable first-pass cosmetic gap; all
    // gameplay hit-checks here use plain x/y distance math, not body bounds.

    const barX = cfg.x - Enemy.BAR_W / 2;
    const barY = cfg.y - Enemy.BAR_OFFSET_Y + POISE_BAR_OFFSET_Y;
    this.poiseBarBg = scene.add
      .rectangle(barX, barY, Enemy.BAR_W, Enemy.BAR_H, 0x1a1f2a, 0.85)
      .setOrigin(0, 0.5);
    this.poiseBarFill = scene.add
      .rectangle(barX, barY, Enemy.BAR_W, Enemy.BAR_H, 0xe8c040, 1)
      .setOrigin(0, 0.5);
    this.telegraphGfx = scene.add.graphics();
  }

  preUpdate(time: number, delta: number): void {
    super.preUpdate(time, delta);
    const barX = this.x - Enemy.BAR_W / 2;
    const barY = this.y - Enemy.BAR_OFFSET_Y + POISE_BAR_OFFSET_Y;
    const aggro = this.isAggro();
    this.poiseBarBg.setPosition(barX, barY).setDepth(this.depth + 1).setVisible(aggro);
    this.poiseBarFill.setPosition(barX, barY).setDepth(this.depth + 1).setVisible(aggro);
    this.poiseBarFill.setScale(Math.max(0, this.poise / BOSS_MAX_POISE), 1);
  }

  protected isAggro(): boolean {
    return this.aggroed;
  }

  isStaggered(): boolean {
    return this.bossState === "staggered";
  }

  // Fully custom state machine — does NOT call super.update() (same
  // precedent as Snake.ts). Returns false always: the boss never uses the
  // base "bite lands" contract, area damage is queried separately via
  // checkPlayerHit() so it can carry richer info (knockback) than a bare bool.
  update(delta: number, playerX: number, playerY: number, now: number): boolean {
    if (this.depleted) return false;
    this.enraged = this.health <= this.maxHealth * ENRAGE_HP_THRESHOLD;
    this.updatePoiseRegen(delta, now);

    switch (this.bossState) {
      case "staggered":
        this.updateStaggered(now);
        return false;
      case "telegraphing":
        this.updateTelegraphing(playerX, playerY, now);
        return false;
      case "executing":
        this.updateExecuting(delta, now);
        return false;
      case "recovering":
        this.updateRecovering(now);
        return false;
      default:
        this.updateIdle(playerX, playerY, now);
        return false;
    }
  }

  private updateStaggered(now: number): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(0, 0);
    if (now >= this.stateEnteredAt + STAGGER_DURATION_MS) {
      this.bossState = "idle";
      this.poise = BOSS_MAX_POISE;
      this.nextAttackReadyAt = now + ATTACK_COOLDOWN_MS;
    }
  }

  private updateIdle(playerX: number, playerY: number, now: number): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    const distFromSpawn = Phaser.Math.Distance.Between(this.x, this.y, this.spawnX, this.spawnY);
    if (this.aggroed && distFromSpawn > BOSS_ARENA_LEASH_RADIUS) this.aggroed = false;

    const dist = Phaser.Math.Distance.Between(this.x, this.y, playerX, playerY);
    if (!this.aggroed) {
      if (dist <= BOSS_AGGRO_RADIUS) this.aggroed = true;
      else {
        body.setVelocity(0, 0);
        return;
      }
    }

    if (now >= this.nextAttackReadyAt) {
      this.beginTelegraph(this.pickAttack(), now, playerX, playerY);
      return;
    }

    const moveSpeed = BOSS_MOVE_SPEED * (this.enraged ? ENRAGE_MOVE_MULTIPLIER : 1);
    if (dist > CLEAVE_RANGE) {
      const angle = Phaser.Math.Angle.Between(this.x, this.y, playerX, playerY);
      const vx = Math.cos(angle) * moveSpeed;
      const vy = Math.sin(angle) * moveSpeed;
      body.setVelocity(vx, vy);
      this.applyFacing(vx, vy);
    } else {
      body.setVelocity(0, 0);
      this.applyFacing(playerX - this.x, playerY - this.y);
    }
  }

  private pickAttack(): BossAttackType {
    const options: BossAttackType[] = ["cleave", "charge", "slam"];
    const pool = this.lastAttack ? options.filter((a) => a !== this.lastAttack) : options;
    const choice = pool[Phaser.Math.Between(0, pool.length - 1)];
    this.lastAttack = choice;
    return choice;
  }

  private beginTelegraph(attack: BossAttackType, now: number, playerX: number, playerY: number): void {
    this.currentAttack = attack;
    this.bossState = "telegraphing";
    this.stateEnteredAt = now;
    this.currentStateDurationMs = telegraphMsFor(attack) * (this.enraged ? ENRAGE_TELEGRAPH_MULTIPLIER : 1);
    (this.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
    if (attack === "charge") {
      this.chargeTargetX = playerX;
      this.chargeTargetY = playerY;
      const angle = Phaser.Math.Angle.Between(this.x, this.y, playerX, playerY);
      this.chargeLineEndX = this.x + Math.cos(angle) * CHARGE_MAX_DISTANCE;
      this.chargeLineEndY = this.y + Math.sin(angle) * CHARGE_MAX_DISTANCE;
    }
  }

  private updateTelegraphing(playerX: number, playerY: number, now: number): void {
    this.applyFacing(playerX - this.x, playerY - this.y);
    this.drawTelegraph(now);
    if (now >= this.stateEnteredAt + this.currentStateDurationMs) this.beginExecute(now);
  }

  private beginExecute(now: number): void {
    this.bossState = "executing";
    this.stateEnteredAt = now;
    this.hasHitThisAttack = false;
    this.telegraphGfx.clear();
    const body = this.body as Phaser.Physics.Arcade.Body;
    if (this.currentAttack === "charge") {
      this.chargeTraveled = 0;
      const angle = Phaser.Math.Angle.Between(this.x, this.y, this.chargeTargetX, this.chargeTargetY);
      body.setVelocity(Math.cos(angle) * CHARGE_SPEED, Math.sin(angle) * CHARGE_SPEED);
      this.applyFacing(Math.cos(angle) * CHARGE_SPEED, Math.sin(angle) * CHARGE_SPEED);
    } else {
      body.setVelocity(0, 0);
      this.currentStateDurationMs = this.currentAttack === "cleave" ? CLEAVE_EXECUTE_MS : SLAM_EXECUTE_MS;
    }
  }

  private updateExecuting(delta: number, now: number): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    if (this.currentAttack === "charge") {
      this.chargeTraveled += (CHARGE_SPEED * delta) / 1000;
      if (this.chargeTraveled >= CHARGE_MAX_DISTANCE || this.hasHitThisAttack) {
        body.setVelocity(0, 0);
        this.beginRecover(now);
      }
      return;
    }
    if (now >= this.stateEnteredAt + this.currentStateDurationMs) this.beginRecover(now);
  }

  private beginRecover(now: number): void {
    this.bossState = "recovering";
    this.stateEnteredAt = now;
    this.currentStateDurationMs = recoverMsFor(this.currentAttack!) * (this.enraged ? ENRAGE_RECOVER_MULTIPLIER : 1);
    (this.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
  }

  private updateRecovering(now: number): void {
    if (now >= this.stateEnteredAt + this.currentStateDurationMs) {
      this.bossState = "idle";
      this.nextAttackReadyAt = now + ATTACK_COOLDOWN_MS;
    }
  }

  private updatePoiseRegen(delta: number, now: number): void {
    if (this.bossState === "staggered") return;
    if (now - this.lastPoiseChipAt < POISE_REGEN_DELAY_MS) return;
    if (this.poise >= BOSS_MAX_POISE) return;
    this.poise = Math.min(BOSS_MAX_POISE, this.poise + POISE_REGEN_PER_SEC * (delta / 1000));
  }

  private drawTelegraph(now: number): void {
    const g = this.telegraphGfx;
    g.clear();
    g.setDepth(this.depth + 0.5);
    const frac = Phaser.Math.Clamp(
      this.currentStateDurationMs > 0 ? (now - this.stateEnteredAt) / this.currentStateDurationMs : 1,
      0,
      1,
    );

    if (this.currentAttack === "cleave") {
      const facing = this.rotation - Math.PI; // Enemy sprites drawn nose-left, see applyFacing's +PI convention
      const half = Phaser.Math.DegToRad(CLEAVE_ARC_DEG / 2);
      g.fillStyle(0xff3030, 0.1 + 0.3 * frac);
      g.beginPath();
      g.slice(this.x, this.y, CLEAVE_RANGE, facing - half, facing + half, false);
      g.fillPath();
    } else if (this.currentAttack === "charge") {
      g.lineStyle(4, 0xff3030, 0.5);
      g.beginPath();
      g.moveTo(this.x, this.y);
      g.lineTo(this.chargeLineEndX, this.chargeLineEndY);
      g.strokePath();
    } else if (this.currentAttack === "slam") {
      const r = SLAM_RADIUS * frac;
      g.fillStyle(0xff3030, 0.15 + 0.25 * frac);
      g.fillCircle(this.x, this.y, r);
      g.lineStyle(2, 0xff3030, 0.6);
      g.strokeCircle(this.x, this.y, r);
    }
  }

  // Queried every frame by MainScene.updateEnemies() — separate from the
  // base Enemy.update() boolean contract since area damage needs richer info
  // (knockback) than "a bite landed." Only evaluates during `executing`, and
  // only once per attack instance (hasHitThisAttack).
  checkPlayerHit(playerX: number, playerY: number): { damage: number; knockback?: number } | null {
    if (this.bossState !== "executing" || this.hasHitThisAttack) return null;
    const dist = Phaser.Math.Distance.Between(this.x, this.y, playerX, playerY);

    if (this.currentAttack === "slam") {
      if (dist > SLAM_RADIUS) return null;
      this.hasHitThisAttack = true;
      return { damage: SLAM_DAMAGE, knockback: SLAM_KNOCKBACK };
    }
    if (this.currentAttack === "cleave") {
      if (dist > CLEAVE_RANGE) return null;
      const toPlayer = Phaser.Math.Angle.Between(this.x, this.y, playerX, playerY);
      const facing = this.rotation - Math.PI;
      const diff = Phaser.Math.Angle.ShortestBetween(
        Phaser.Math.RadToDeg(facing),
        Phaser.Math.RadToDeg(toPlayer),
      );
      if (Math.abs(diff) > CLEAVE_ARC_DEG / 2) return null;
      this.hasHitThisAttack = true;
      return { damage: CLEAVE_DAMAGE };
    }
    if (this.currentAttack === "charge") {
      if (dist > CHARGE_HIT_RADIUS) return null;
      this.hasHitThisAttack = true;
      return { damage: CHARGE_DAMAGE };
    }
    return null;
  }

  // Layers poise reduction on top of the base HP/tint/aggro-clear handling —
  // same precedent as Snake.takeHit()/RangedGremlin.takeHit().
  takeHit(damage: number): boolean {
    const depleted = super.takeHit(damage);
    if (depleted) return true;
    if (this.bossState === "staggered") return false;
    this.poise = Math.max(0, this.poise - damage);
    this.lastPoiseChipAt = this.scene.time.now;
    if (this.poise <= 0) this.enterStaggered(this.scene.time.now);
    return false;
  }

  private enterStaggered(now: number): void {
    this.bossState = "staggered";
    this.stateEnteredAt = now;
    this.currentAttack = null;
    (this.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
    this.telegraphGfx.clear();
  }

  playDeathFeedback(onComplete: () => void): void {
    this.poiseBarBg.destroy();
    this.poiseBarFill.destroy();
    this.telegraphGfx.destroy();
    super.playDeathFeedback(onComplete);
  }
}
