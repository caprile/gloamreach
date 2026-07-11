import Phaser from "phaser";
import { Enemy } from "./Enemy";

// The Gloaming Vein's guardian mini-boss (Gloaming Vein POI). Bespoke AI
// following GremlinKing's telegraph/poise pattern but LIGHTER — two telegraphed
// attacks, a small poise/stagger bar, difficulty sitting between an elite and
// the Gremlin King (per the "no shared boss framework" lock — this is a trimmed
// sibling of GremlinKing, not a subclass of it). Extends Enemy for the HP-bar/
// loot/death machinery but fully overrides update() (Snake/Boar/GremlinKing
// precedent). Designed around the player's existing dash/i-frame toolkit — no
// new player ability. On death, MainScene cracks open the vein's ore nodes.
//
// Its two attacks are deliberately NOT the roster's charge/radial-slam (which
// read as "Boar charge / Gremlin King slam again"):
//   • LEAPING SMASH — a gap-closer leap to a locked landing point + impact AoE.
//     Kept on purpose: it teaches the player the Gremlin King's own leaping
//     smash before that fight (per the user).
//   • GLOAM ERUPTION — a ground-target: the warden roots itself and channels,
//     then crystal spikes violently erupt at the player's LOCKED position. The
//     boss stays put and vulnerable the whole time (a punish window), the dodge
//     is to leave the marked ground. Distinct from a charge (no line rush) and
//     from a boss-centered radial slam (the hazard is on YOU, not the boss).
export type WardenState = "idle" | "telegraphing" | "executing" | "recovering" | "staggered";
export type WardenAttackType = "smash" | "eruption";

const WARDEN_MAX_HEALTH = 260; // between an elite (~/) and the Gremlin King (600)
export const GLOAMWARDEN_SCALE = 1.7;
const AGGRO_RADIUS = 240;
const LEASH_RADIUS = 480; // kited past this -> fully deaggros
const MOVE_SPEED = 55;
const DEAGGRO_REGEN_PER_SEC = 10; // claws HP back between engagements (see GremlinKing's note)

export const WARDEN_MAX_POISE = 60;
export const WARDEN_STAGGER_DAMAGE_MULTIPLIER = 1.5; // punish-window bonus (mirrors GremlinKing)
const STAGGER_DURATION_MS = 2500;
const POISE_REGEN_DELAY_MS = 3500;
const POISE_REGEN_PER_SEC = 12;
const POISE_BAR_OFFSET_Y = 10;

// Leaping smash — gap-closer: lock the player's spot, leap to it, AoE on landing
// (ported from GremlinKing so it reads as a lighter preview of that fight).
const SMASH_TELEGRAPH_MS = 780;
const SMASH_LEAP_MS = 300; // airtime to the locked landing point
const SMASH_IMPACT_MS = 130; // planted beat on landing — the strike window
const SMASH_RECOVER_MS = 720;
const SMASH_MAX_LEAP = 340;
const SMASH_RADIUS = 95; // walk-dodgeable in the telegraph+leap window (same reasoning as GremlinKing)
const SMASH_DAMAGE = 22;
const SMASH_KNOCKBACK = 200;
const SMASH_LAND_EPS = 10;

// Gloam eruption — ground-target: crystal spikes erupt at the player's locked
// position while the warden stays rooted (long readable tell + punish window).
const ERUPT_TELEGRAPH_MS = 920; // long/readable — punish the channel, or leave the spot
const ERUPT_IMPACT_MS = 180; // spikes-up window checkPlayerHit fires in
const ERUPT_RECOVER_MS = 620;
const ERUPT_RADIUS = 72; // tight — a precise "get off this ground" dodge
const ERUPT_DAMAGE = 24;
const ERUPT_KNOCKBACK = 120; // small upward launch
const ERUPT_MAX_RANGE = 420; // won't target the player further than this (clamped)

const MELEE_STOP_RANGE = 150; // both attacks reach from here; stops approaching inside it
const ATTACK_COOLDOWN_MS = 850;

function telegraphMsFor(attack: WardenAttackType): number {
  return attack === "smash" ? SMASH_TELEGRAPH_MS : ERUPT_TELEGRAPH_MS;
}
function recoverMsFor(attack: WardenAttackType): number {
  return attack === "smash" ? SMASH_RECOVER_MS : ERUPT_RECOVER_MS;
}

export class Gloamwarden extends Enemy {
  private wardenState: WardenState = "idle";
  private currentAttack: WardenAttackType | null = null;
  private lastAttack: WardenAttackType | null = null;
  private stateEnteredAt = 0;
  private currentStateDurationMs = 0;
  private nextAttackReadyAt = 0;
  private aggroed = false;
  private readonly spawnX: number;
  private readonly spawnY: number;

  poise = WARDEN_MAX_POISE;
  private lastPoiseChipAt = -Infinity;

  // Leaping smash: landing point locked at telegraph start, then a timed leap.
  private smashTargetX = 0;
  private smashTargetY = 0;
  private smashLanded = false;
  private smashElapsed = 0;

  // Gloam eruption: the ground spot (player's locked position) the spikes hit.
  private eruptTargetX = 0;
  private eruptTargetY = 0;

  private hasHitThisAttack = false;

  private poiseBarBg: Phaser.GameObjects.Rectangle;
  private poiseBarFill: Phaser.GameObjects.Rectangle;
  private telegraphGfx: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene, cfg: { x: number; y: number }) {
    super(scene, {
      x: cfg.x,
      y: cfg.y,
      texture: "gloamwarden",
      displayName: "Gloamwarden",
      // Guaranteed drop: a taste of the payoff + the shards that fuel refining
      // (the vein nodes it unseals give the bulk). MainScene cracks the vein on
      // its death (separate from this loot roll).
      loot: [
        { resource: "gloam_shard", min: 3, max: 4 },
        { resource: "refined_trophy_uncommon", min: 1, max: 1 },
      ],
      maxHealth: WARDEN_MAX_HEALTH,
      biteDamage: 0, // all damage flows through checkPlayerHit()
    });
    this.spawnX = cfg.x;
    this.spawnY = cfg.y;
    this.baseScale = GLOAMWARDEN_SCALE;
    this.setScale(GLOAMWARDEN_SCALE);

    const barX = cfg.x - Enemy.BAR_W / 2;
    const barY = cfg.y - Enemy.BAR_OFFSET_Y + POISE_BAR_OFFSET_Y;
    this.poiseBarBg = scene.add.rectangle(barX, barY, Enemy.BAR_W, Enemy.BAR_H, 0x1a1f2a, 0.85).setOrigin(0, 0.5);
    this.poiseBarFill = scene.add.rectangle(barX, barY, Enemy.BAR_W, Enemy.BAR_H, 0xb069e8, 1).setOrigin(0, 0.5);
    this.telegraphGfx = scene.add.graphics();
  }

  preUpdate(time: number, delta: number): void {
    super.preUpdate(time, delta);
    const barX = this.x - Enemy.BAR_W / 2;
    const barY = this.y - Enemy.BAR_OFFSET_Y + POISE_BAR_OFFSET_Y;
    const aggro = this.isAggro();
    this.poiseBarBg.setPosition(barX, barY).setDepth(this.depth + 1).setVisible(aggro);
    this.poiseBarFill.setPosition(barX, barY).setDepth(this.depth + 1).setVisible(aggro);
    this.poiseBarFill.setScale(Math.max(0, this.poise / WARDEN_MAX_POISE), 1);
  }

  isAggro(): boolean {
    return this.aggroed;
  }
  isStaggered(): boolean {
    return this.wardenState === "staggered";
  }

  update(delta: number, playerX: number, playerY: number, now: number): boolean {
    if (this.depleted) return false;
    this.updatePoiseRegen(delta, now);
    if (!this.aggroed && this.health < this.maxHealth) {
      this.health = Math.min(this.maxHealth, this.health + DEAGGRO_REGEN_PER_SEC * (delta / 1000));
      this.applyHpTint();
    }

    switch (this.wardenState) {
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
    (this.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
    if (now >= this.stateEnteredAt + STAGGER_DURATION_MS) {
      this.wardenState = "idle";
      this.poise = WARDEN_MAX_POISE;
      this.nextAttackReadyAt = now + ATTACK_COOLDOWN_MS;
    }
  }

  private updateIdle(playerX: number, playerY: number, now: number): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    const distFromSpawn = Phaser.Math.Distance.Between(this.x, this.y, this.spawnX, this.spawnY);
    if (this.aggroed && distFromSpawn > LEASH_RADIUS) this.aggroed = false;

    const dist = Phaser.Math.Distance.Between(this.x, this.y, playerX, playerY);
    if (!this.aggroed) {
      if (dist <= AGGRO_RADIUS) this.aggroed = true;
      else {
        body.setVelocity(0, 0);
        return;
      }
    }

    if (now >= this.nextAttackReadyAt) {
      this.beginTelegraph(this.pickAttack(), now, playerX, playerY);
      return;
    }

    if (dist > MELEE_STOP_RANGE) {
      const angle = Phaser.Math.Angle.Between(this.x, this.y, playerX, playerY);
      const vx = Math.cos(angle) * MOVE_SPEED;
      const vy = Math.sin(angle) * MOVE_SPEED;
      body.setVelocity(vx, vy);
      this.applyFacing(vx, vy);
    } else {
      body.setVelocity(0, 0);
      this.applyFacing(playerX - this.x, playerY - this.y);
    }
  }

  private pickAttack(): WardenAttackType {
    // Alternate the two attacks (never twice in a row).
    const options: WardenAttackType[] = ["smash", "eruption"];
    const pool = this.lastAttack ? options.filter((a) => a !== this.lastAttack) : options;
    const choice = pool[Phaser.Math.Between(0, pool.length - 1)];
    this.lastAttack = choice;
    return choice;
  }

  private beginTelegraph(attack: WardenAttackType, now: number, playerX: number, playerY: number): void {
    this.currentAttack = attack;
    this.wardenState = "telegraphing";
    this.stateEnteredAt = now;
    this.currentStateDurationMs = telegraphMsFor(attack);
    (this.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
    if (attack === "smash") {
      // Lock the landing spot at the player's position, clamped to a max leap.
      const dist = Phaser.Math.Distance.Between(this.x, this.y, playerX, playerY);
      const angle = Phaser.Math.Angle.Between(this.x, this.y, playerX, playerY);
      const leapDist = Math.min(dist, SMASH_MAX_LEAP);
      this.smashTargetX = this.x + Math.cos(angle) * leapDist;
      this.smashTargetY = this.y + Math.sin(angle) * leapDist;
    } else {
      // Lock the eruption ground spot at the player's position (clamped range).
      const dist = Phaser.Math.Distance.Between(this.x, this.y, playerX, playerY);
      const angle = Phaser.Math.Angle.Between(this.x, this.y, playerX, playerY);
      const d = Math.min(dist, ERUPT_MAX_RANGE);
      this.eruptTargetX = this.x + Math.cos(angle) * d;
      this.eruptTargetY = this.y + Math.sin(angle) * d;
    }
  }

  private updateTelegraphing(playerX: number, playerY: number, now: number): void {
    this.applyFacing(playerX - this.x, playerY - this.y);
    this.drawTelegraph(now);
    if (now >= this.stateEnteredAt + this.currentStateDurationMs) this.beginExecute(now);
  }

  private beginExecute(now: number): void {
    this.wardenState = "executing";
    this.stateEnteredAt = now;
    this.hasHitThisAttack = false;
    this.telegraphGfx.clear();
    const body = this.body as Phaser.Physics.Arcade.Body;
    if (this.currentAttack === "smash") {
      this.smashLanded = false;
      this.smashElapsed = 0;
      const dist = Phaser.Math.Distance.Between(this.x, this.y, this.smashTargetX, this.smashTargetY);
      const angle = Phaser.Math.Angle.Between(this.x, this.y, this.smashTargetX, this.smashTargetY);
      const speed = dist > 0 ? dist / (SMASH_LEAP_MS / 1000) : 0;
      body.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
      this.applyFacing(Math.cos(angle), Math.sin(angle));
    } else {
      // Eruption: rooted, spikes burst at the locked spot for the impact window.
      body.setVelocity(0, 0);
      this.currentStateDurationMs = ERUPT_IMPACT_MS;
    }
  }

  private updateExecuting(delta: number, now: number): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    if (this.currentAttack === "smash") {
      if (!this.smashLanded) {
        this.smashElapsed += delta;
        const dist = Phaser.Math.Distance.Between(this.x, this.y, this.smashTargetX, this.smashTargetY);
        if (dist <= SMASH_LAND_EPS || this.smashElapsed >= SMASH_LEAP_MS) {
          body.setVelocity(0, 0);
          this.smashLanded = true;
          this.stateEnteredAt = now;
          this.currentStateDurationMs = SMASH_IMPACT_MS;
        }
        return;
      }
      if (now >= this.stateEnteredAt + this.currentStateDurationMs) this.beginRecover(now);
      return;
    }
    // Eruption impact: draw the erupted spikes at the locked spot each frame.
    this.drawEruptionSpikes(now);
    if (now >= this.stateEnteredAt + this.currentStateDurationMs) this.beginRecover(now);
  }

  private beginRecover(now: number): void {
    this.wardenState = "recovering";
    this.stateEnteredAt = now;
    this.currentStateDurationMs = recoverMsFor(this.currentAttack!);
    this.telegraphGfx.clear();
    (this.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
  }

  private updateRecovering(now: number): void {
    if (now >= this.stateEnteredAt + this.currentStateDurationMs) {
      this.wardenState = "idle";
      this.nextAttackReadyAt = now + ATTACK_COOLDOWN_MS;
    }
  }

  private updatePoiseRegen(delta: number, now: number): void {
    if (this.wardenState === "staggered") return;
    if (now - this.lastPoiseChipAt < POISE_REGEN_DELAY_MS) return;
    if (this.poise >= WARDEN_MAX_POISE) return;
    this.poise = Math.min(WARDEN_MAX_POISE, this.poise + POISE_REGEN_PER_SEC * (delta / 1000));
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
      // Landing-zone marker at the LOCKED point (not the boss) — purple, grows
      // toward the true AoE size as the leap nears.
      const r = SMASH_RADIUS * (0.55 + 0.45 * frac);
      g.fillStyle(0x9a5ee8, 0.12 + 0.28 * frac);
      g.fillCircle(this.smashTargetX, this.smashTargetY, r);
      g.lineStyle(2, 0x9a5ee8, 0.6);
      g.strokeCircle(this.smashTargetX, this.smashTargetY, SMASH_RADIUS);
    } else {
      // Eruption channel marker: a jagged crystal outline "charging up" from the
      // ground at the locked spot — reads as "crystals about to burst here."
      const tx = this.eruptTargetX;
      const ty = this.eruptTargetY;
      g.fillStyle(0x7a3ec8, 0.1 + 0.22 * frac);
      g.fillCircle(tx, ty, ERUPT_RADIUS);
      g.lineStyle(2, 0xc79cf0, 0.7);
      g.strokeCircle(tx, ty, ERUPT_RADIUS);
      // A few small rising shard hints scale up with the telegraph.
      g.fillStyle(0x9a5ee8, 0.3 + 0.4 * frac);
      const h = 6 + 14 * frac;
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        const sx = tx + Math.cos(a) * ERUPT_RADIUS * 0.5;
        const sy = ty + Math.sin(a) * ERUPT_RADIUS * 0.5;
        g.fillTriangle(sx - 3, sy, sx + 3, sy, sx, sy - h);
      }
    }
  }

  // The eruption's execute-phase visual: full-height crystal spikes bursting up
  // at the locked spot (drawn during the impact window, not the telegraph).
  private drawEruptionSpikes(now: number): void {
    const g = this.telegraphGfx;
    g.clear();
    g.setDepth(this.depth + 0.5);
    const frac = Phaser.Math.Clamp((now - this.stateEnteredAt) / Math.max(1, this.currentStateDurationMs), 0, 1);
    const tx = this.eruptTargetX;
    const ty = this.eruptTargetY;
    // Spikes shoot up fast then hold.
    const rise = Math.min(1, frac * 3);
    g.fillStyle(0x8a4ed8, 0.9);
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2;
      const dd = ERUPT_RADIUS * (0.3 + 0.6 * ((i % 3) / 2));
      const sx = tx + Math.cos(a) * dd;
      const sy = ty + Math.sin(a) * dd;
      const hgt = (18 + (i % 3) * 8) * rise;
      g.fillTriangle(sx - 5, sy + 4, sx + 5, sy + 4, sx, sy - hgt);
    }
    // Bright central spike.
    g.fillStyle(0xd6b0ff, 0.95);
    g.fillTriangle(tx - 6, ty + 5, tx + 6, ty + 5, tx, ty - 30 * rise);
  }

  // Queried each frame by MainScene.updateEnemies() (like GremlinKing) — area
  // damage needs richer info (knockback) than the base bite bool.
  checkPlayerHit(playerX: number, playerY: number): { damage: number; knockback?: number } | null {
    if (this.wardenState !== "executing" || this.hasHitThisAttack) return null;
    if (this.currentAttack === "smash") {
      if (!this.smashLanded) return null;
      const dist = Phaser.Math.Distance.Between(this.x, this.y, playerX, playerY);
      if (dist > SMASH_RADIUS) return null;
      this.hasHitThisAttack = true;
      return { damage: SMASH_DAMAGE, knockback: SMASH_KNOCKBACK };
    }
    // Eruption: hit if the player is still standing on the locked spot.
    const dist = Phaser.Math.Distance.Between(this.eruptTargetX, this.eruptTargetY, playerX, playerY);
    if (dist > ERUPT_RADIUS) return null;
    this.hasHitThisAttack = true;
    return { damage: ERUPT_DAMAGE, knockback: ERUPT_KNOCKBACK };
  }

  takeHit(damage: number): boolean {
    const depleted = super.takeHit(damage);
    if (depleted) return true;
    if (this.wardenState === "staggered") return false;
    this.poise = Math.max(0, this.poise - damage);
    this.lastPoiseChipAt = this.scene.time.now;
    if (this.poise <= 0) this.enterStaggered(this.scene.time.now);
    return false;
  }

  private enterStaggered(now: number): void {
    this.wardenState = "staggered";
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
