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
export type BossAttackType = "smash" | "charge" | "slam";

const BOSS_MAX_HEALTH = 600;
const BOSS_SCALE = 2.4;
const BOSS_AGGRO_RADIUS = 260;
const BOSS_ARENA_LEASH_RADIUS = 500; // from spawn point — kiting this far fully deaggros
const BOSS_MOVE_SPEED = 45; // slow deliberate approach outside of an attack

// Regen while fully deaggro'd (player kited past the leash / never engaged) so
// running away to heal/rest isn't a free reset of chip damage — the boss claws
// HP back between engagements. Only ticks when NOT aggroed; a real fight never
// sees it (poise/HP only refill via stagger/kill). 12 HP/s → ~50s to full from
// empty, meaningful but not instant.
const BOSS_DEAGGRO_REGEN_PER_SEC = 12;

export const BOSS_MAX_POISE = 100; // exported for the fixed-HUD BossHealthUI's poise-bar fraction
const STAGGER_DURATION_MS = 3000;
export const STAGGER_DAMAGE_MULTIPLIER = 1.5; // exported for MainScene.tryAttackEnemy's bonus-damage check
const POISE_REGEN_DELAY_MS = 4000; // only resumes this long after the last hit that chipped it
const POISE_REGEN_PER_SEC = 15;

// Leaping smash — REPLACED the old forward cleave (2026-07-11), which read as
// "just a worse 360° slam." A gap-closer instead: the boss locks the player's
// position at telegraph start, leaps to it, and impacts an AoE on landing —
// distinct from charge (rushes a fixed line, dodged by sidestepping) and slam
// (fires where the boss already stands). This one punishes RUNNING AWAY: the
// landing zone chases where you were, so the dodge is to move laterally out of
// the marked circle during the telegraph, not to sprint straight back.
const SMASH_TELEGRAPH_MS = 780; // read the locked landing marker, then move off it
const SMASH_LEAP_MS = 300; // airtime traveling to the locked landing point
const SMASH_IMPACT_MS = 130; // planted beat on landing — the strike window checkPlayerHit fires in
const SMASH_RECOVER_MS = 750; // punish window after the impact
const SMASH_MAX_LEAP = 380; // cap leap distance — closes gaps, but no cross-arena teleport
const MELEE_STOP_RANGE = 90; // boss stops approaching (and may attack) inside this — was CLEAVE_RANGE
// AoE radius at the landing point. Tuned DOWN from 120 (2026-07-11): the landing
// point is locked at the player's spot at telegraph-start, and in the ~1080ms of
// telegraph+leap a walking player (95px/s) only clears ~102px — LESS than 120,
// so the smash was undodgeable by movement (dash i-frames aside). 95 makes
// walking laterally out of the circle a real dodge; sprint/dash gives margin.
const SMASH_RADIUS = 95;
const SMASH_DAMAGE = 60; // ~2-shots a full-armor (Lvl3 = 13) 100-HP player: (60-13)*2 = 94
const SMASH_KNOCKBACK = 220;
const SMASH_LAND_EPS = 10; // px — treat as "arrived" within this of the locked point

const CHARGE_TELEGRAPH_MS = 850; // dodge window stays readable — only the dash itself sped up
const CHARGE_SPEED = 480; // was 340 — playtest: "line attack should be faster"
const CHARGE_MAX_DISTANCE = 420;
const CHARGE_RECOVER_MS = 900;
// Point+radius approximation, not a true capsule/segment check. Scaled by
// BOSS_SCALE (was a flat 34, matching the roster's unscaled size) — the boss's
// visual footprint is 2.4x bigger than its base sprite, so a flat radius let
// "contact" whiff on hits that visually landed. Same class of fix as
// MainScene.enemyReach()'s attack/prompt-reach scaling for normal enemies,
// just not previously applied to the boss's own charge math.
const CHARGE_HIT_RADIUS = 34 * BOSS_SCALE;
const CHARGE_DAMAGE = 55; // was 40 — 2026-07-11 boss dmg bump (~2-shot a full-armor player)

const SLAM_TELEGRAPH_MS = 950;
const SLAM_EXECUTE_MS = 150;
const SLAM_RECOVER_MS = 800;
const SLAM_RADIUS = 150; // was 110 — playtest: "aoes should be bigger"
const SLAM_DAMAGE = 55; // was 45 — 2026-07-11 boss dmg bump (~2-shot a full-armor player)
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

const ATTACK_COOLDOWN_MS = 950; // was 1200 — playtest: boss was too passive between attacks
const POISE_BAR_OFFSET_Y = 10; // px below the inherited HP bar's own line
// How close to spawn counts as "home" while wandering back deaggro'd — below
// this it just idles instead of endlessly micro-adjusting position.
const RETURN_HOME_EPS = 20;

function telegraphMsFor(attack: BossAttackType): number {
  if (attack === "smash") return SMASH_TELEGRAPH_MS;
  if (attack === "charge") return CHARGE_TELEGRAPH_MS;
  return SLAM_TELEGRAPH_MS;
}

function recoverMsFor(attack: BossAttackType): number {
  if (attack === "smash") return SMASH_RECOVER_MS;
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

  // Leaping smash: landing point locked at telegraph-start (like the charge
  // target), then a timed leap to it, then a brief planted impact window.
  private smashTargetX = 0;
  private smashTargetY = 0;
  private smashLanded = false;
  private smashElapsed = 0;

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

  isAggro(): boolean {
    return this.aggroed;
  }

  // Public mirror of isAggro() for the fixed top-of-screen BossHealthUI —
  // "engaged in the fight," same underlying condition the floating world-space
  // HP/poise bars already gate on.
  isEngaged(): boolean {
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
    // Heal back between engagements (only while fully deaggro'd) so kiting away
    // to rest doesn't permanently bank chip damage.
    if (!this.aggroed && this.health < this.maxHealth) {
      this.health = Math.min(this.maxHealth, this.health + BOSS_DEAGGRO_REGEN_PER_SEC * (delta / 1000));
      this.applyHpTint();
    }

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
      if (dist <= BOSS_AGGRO_RADIUS) {
        this.aggroed = true;
      } else {
        // Deaggro'd (e.g. kited past the leash mid-charge) — wander back
        // toward its own spawn point instead of idling wherever it ended up,
        // so the boss doesn't get permanently stranded far from the boss area.
        if (distFromSpawn > RETURN_HOME_EPS) {
          const angle = Phaser.Math.Angle.Between(this.x, this.y, this.spawnX, this.spawnY);
          const vx = Math.cos(angle) * BOSS_MOVE_SPEED;
          const vy = Math.sin(angle) * BOSS_MOVE_SPEED;
          body.setVelocity(vx, vy);
          this.applyFacing(vx, vy);
        } else {
          body.setVelocity(0, 0);
        }
        return;
      }
    }

    if (now >= this.nextAttackReadyAt) {
      this.beginTelegraph(this.pickAttack(), now, playerX, playerY);
      return;
    }

    const moveSpeed = BOSS_MOVE_SPEED * (this.enraged ? ENRAGE_MOVE_MULTIPLIER : 1);
    if (dist > MELEE_STOP_RANGE) {
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
    const options: BossAttackType[] = ["smash", "charge", "slam"];
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
    } else if (attack === "smash") {
      // Lock the landing point at the player's CURRENT spot, clamped to a max
      // leap so it can't cross the arena. Never re-read after this — the dodge
      // is to leave the marked circle during the telegraph.
      const dist = Phaser.Math.Distance.Between(this.x, this.y, playerX, playerY);
      const angle = Phaser.Math.Angle.Between(this.x, this.y, playerX, playerY);
      const leapDist = Math.min(dist, SMASH_MAX_LEAP);
      this.smashTargetX = this.x + Math.cos(angle) * leapDist;
      this.smashTargetY = this.y + Math.sin(angle) * leapDist;
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
    } else if (this.currentAttack === "smash") {
      // Leap to the locked landing point over SMASH_LEAP_MS — speed sized so it
      // arrives right on time. Impact/hit only after it lands (see updateExecuting).
      this.smashLanded = false;
      this.smashElapsed = 0;
      const dist = Phaser.Math.Distance.Between(this.x, this.y, this.smashTargetX, this.smashTargetY);
      const angle = Phaser.Math.Angle.Between(this.x, this.y, this.smashTargetX, this.smashTargetY);
      const speed = dist > 0 ? dist / (SMASH_LEAP_MS / 1000) : 0;
      body.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
      this.applyFacing(Math.cos(angle), Math.sin(angle));
    } else {
      body.setVelocity(0, 0);
      this.currentStateDurationMs = SLAM_EXECUTE_MS;
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
    if (this.currentAttack === "smash") {
      if (!this.smashLanded) {
        // Airborne: leap toward the locked point until we arrive (or airtime elapses).
        this.smashElapsed += delta;
        const dist = Phaser.Math.Distance.Between(this.x, this.y, this.smashTargetX, this.smashTargetY);
        if (dist <= SMASH_LAND_EPS || this.smashElapsed >= SMASH_LEAP_MS) {
          body.setVelocity(0, 0);
          this.smashLanded = true;
          // The impact/strike window: hold planted briefly so checkPlayerHit
          // (called the same frame from MainScene) can register the AoE.
          this.stateEnteredAt = now;
          this.currentStateDurationMs = SMASH_IMPACT_MS;
        }
        return;
      }
      if (now >= this.stateEnteredAt + this.currentStateDurationMs) this.beginRecover(now);
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

    if (this.currentAttack === "smash") {
      // Landing-zone marker at the LOCKED point (not the boss) — grows toward
      // the true AoE size as the leap nears, telling the player where NOT to be.
      const r = SMASH_RADIUS * (0.55 + 0.45 * frac);
      g.fillStyle(0xff3030, 0.12 + 0.28 * frac);
      g.fillCircle(this.smashTargetX, this.smashTargetY, r);
      g.lineStyle(2, 0xff3030, 0.6);
      g.strokeCircle(this.smashTargetX, this.smashTargetY, SMASH_RADIUS);
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
    if (this.currentAttack === "smash") {
      // Only lands after the leap connects — a radial AoE around the boss's
      // landing spot (which is the locked target it just arrived at).
      if (!this.smashLanded) return null;
      if (dist > SMASH_RADIUS) return null;
      this.hasHitThisAttack = true;
      return { damage: SMASH_DAMAGE, knockback: SMASH_KNOCKBACK };
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
