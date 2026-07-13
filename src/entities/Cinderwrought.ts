import Phaser from "phaser";
import { Enemy } from "./Enemy";
import type { IncomingDamageType } from "../systems/Weapons";

// The Sunken Forge's guardian mini-boss (biome 2 Phase 3, POI 2). Bespoke AI
// following the Gloamwarden/GremlinKing telegraph/poise pattern but a trimmed
// sibling — two telegraphed attacks, a small poise/stagger bar, difficulty
// sitting between an elite and the Gremlin King (per the "no shared boss
// framework" lock). Extends Enemy for the HP-bar/loot/death machinery but
// fully overrides update() (Snake/Boar/Gloamwarden precedent). Designed around
// the player's existing dash/i-frame toolkit — no new player ability.
//
// Its two attacks are deliberately NOT Gloamwarden's leap-smash/eruption or the
// Gremlin King's charge/radial-slam:
//   • CINDER CONE — rears back, then exhales a fire cone in a LOCKED direction
//     (the direction snaps to the player at telegraph START, so sidestepping
//     during the long wind-up dodges it). No cone attack exists elsewhere in
//     the game — this is the Cinderwrought's signature.
//   • FORGE HAMMER — a heavy overhead front-arc smash that punishes standing at
//     close range. Wide front wedge, short reach, big damage + knockback; the
//     dodge is to back out of reach (or dash) during the wind-up.
export type WroughtState = "idle" | "telegraphing" | "executing" | "recovering" | "staggered";
export type WroughtAttackType = "cone" | "hammer";

const WROUGHT_MAX_HEALTH = 300; // a badlands mini-boss — tougher than the forest Gloamwarden (260)
export const CINDERWROUGHT_SCALE = 1.8;
const AGGRO_RADIUS = 260;
const LEASH_RADIUS = 520; // kited past this -> fully deaggros
const MOVE_SPEED = 52;
const DEAGGRO_REGEN_PER_SEC = 12; // claws HP back between engagements (GremlinKing/Gloamwarden precedent)

export const WROUGHT_MAX_POISE = 70;
export const CINDERWROUGHT_STAGGER_DAMAGE_MULTIPLIER = 1.5; // punish-window bonus (mirrors the roster)
const STAGGER_DURATION_MS = 2500;
const POISE_REGEN_DELAY_MS = 3500;
const POISE_REGEN_PER_SEC = 12;
const POISE_BAR_OFFSET_Y = 10;

// Cinder Cone — locked-direction fire breath. Long readable wind-up; the cone
// direction is fixed at telegraph start so a sidestep clears it.
const CONE_TELEGRAPH_MS = 820;
const CONE_IMPACT_MS = 420; // breath sustained; the hit lands once within this window
const CONE_RECOVER_MS = 700;
const CONE_RANGE = 210;
const CONE_HALF_ANGLE = Phaser.Math.DegToRad(32); // ~64deg fan
// Fire damage — bypasses flat armor (like magic), so it hurts even in full
// plate. Bumped 30→46 (the user: "cinder guy damage is too low"): a forge boss
// breathing fire should be a real threat, not a chip.
const CONE_DAMAGE = 46;
const CONE_KNOCKBACK = 140;

// Forge Hammer — heavy overhead front-arc smash. Locks direction at execute;
// the dodge is to leave the wide-but-short front wedge before it lands.
const HAMMER_TELEGRAPH_MS = 720;
const HAMMER_IMPACT_MS = 150; // planted overhead beat — the strike window
const HAMMER_RECOVER_MS = 780;
const HAMMER_RANGE = 155; // reaches just past MELEE_STOP_RANGE so a standing player is caught
const HAMMER_HALF_ARC = Phaser.Math.DegToRad(70); // wide front wedge
// Fire damage (the molten hammer) — bypasses armor; bumped 44→58 so getting
// caught in the wedge is a genuine "you should have dodged" punish.
const HAMMER_DAMAGE = 58;
const HAMMER_KNOCKBACK = 240;

const MELEE_STOP_RANGE = 150; // both attacks reach from here; stops approaching inside it
const ATTACK_COOLDOWN_MS = 850;
// How close to spawn counts as "home" while wandering back deaggro'd (mirrors
// GremlinKing/Gloamwarden) — below this it idles instead of micro-adjusting.
const RETURN_HOME_EPS = 20;

function telegraphMsFor(attack: WroughtAttackType): number {
  return attack === "cone" ? CONE_TELEGRAPH_MS : HAMMER_TELEGRAPH_MS;
}
function recoverMsFor(attack: WroughtAttackType): number {
  return attack === "cone" ? CONE_RECOVER_MS : HAMMER_RECOVER_MS;
}

export class Cinderwrought extends Enemy {
  private wroughtState: WroughtState = "idle";
  private currentAttack: WroughtAttackType | null = null;
  private lastAttack: WroughtAttackType | null = null;
  private stateEnteredAt = 0;
  private currentStateDurationMs = 0;
  private nextAttackReadyAt = 0;
  private aggroed = false;
  private readonly spawnX: number;
  private readonly spawnY: number;

  poise = WROUGHT_MAX_POISE;
  private lastPoiseChipAt = -Infinity;

  // The locked direction both attacks fire in (radians): the cone locks it at
  // telegraph start, the hammer at execute.
  private attackAngle = 0;

  private hasHitThisAttack = false;

  private poiseBarBg: Phaser.GameObjects.Rectangle;
  private poiseBarFill: Phaser.GameObjects.Rectangle;
  private telegraphGfx: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene, cfg: { x: number; y: number }) {
    super(scene, {
      x: cfg.x,
      y: cfg.y,
      texture: "cinderwrought",
      displayName: "Cinderwrought",
      // Guaranteed drop (the user): a better relic trophy for the harder fight +
      // the shards that fuel refining — mirrors the Gloamwarden's payoff.
      loot: [
        { resource: "gloam_shard", min: 3, max: 5 },
        { resource: "refined_trophy_uncommon", min: 1, max: 1 },
      ],
      maxHealth: WROUGHT_MAX_HEALTH,
      biteDamage: 0, // all damage flows through checkPlayerHit()
      // A molten-slag brute: the hard crust shrugs off blunt, the cracks between
      // the plates take a piercing weapon well (the damage-type layer nudge —
      // the inverse of a Sandmaw, so a spear/pick still shines somewhere).
      resistances: { blunt: 0.8, pierce: 1.25 },
    });
    this.spawnX = cfg.x;
    this.spawnY = cfg.y;
    this.baseScale = CINDERWROUGHT_SCALE;
    this.setScale(CINDERWROUGHT_SCALE);

    const barX = cfg.x - Enemy.BAR_W / 2;
    const barY = cfg.y - Enemy.BAR_OFFSET_Y + POISE_BAR_OFFSET_Y;
    this.poiseBarBg = scene.add.rectangle(barX, barY, Enemy.BAR_W, Enemy.BAR_H, 0x2a1710, 0.85).setOrigin(0, 0.5);
    this.poiseBarFill = scene.add.rectangle(barX, barY, Enemy.BAR_W, Enemy.BAR_H, 0xff8a3a, 1).setOrigin(0, 0.5);
    this.telegraphGfx = scene.add.graphics();
  }

  preUpdate(time: number, delta: number): void {
    super.preUpdate(time, delta);
    const barX = this.x - Enemy.BAR_W / 2;
    const barY = this.y - Enemy.BAR_OFFSET_Y + POISE_BAR_OFFSET_Y;
    const aggro = this.isAggro();
    this.poiseBarBg.setPosition(barX, barY).setDepth(this.depth + 1).setVisible(aggro);
    this.poiseBarFill.setPosition(barX, barY).setDepth(this.depth + 1).setVisible(aggro);
    this.poiseBarFill.setScale(Math.max(0, this.poise / WROUGHT_MAX_POISE), 1);
  }

  isAggro(): boolean {
    return this.aggroed;
  }
  isStaggered(): boolean {
    return this.wroughtState === "staggered";
  }

  update(delta: number, playerX: number, playerY: number, now: number): boolean {
    if (this.depleted) return false;
    this.updatePoiseRegen(delta, now);
    if (!this.aggroed && this.health < this.maxHealth) {
      this.health = Math.min(this.maxHealth, this.health + DEAGGRO_REGEN_PER_SEC * (delta / 1000));
      this.applyHpTint();
    }

    switch (this.wroughtState) {
      case "staggered":
        this.updateStaggered(now);
        return false;
      case "telegraphing":
        this.updateTelegraphing(playerX, playerY, now);
        return false;
      case "executing":
        this.updateExecuting(now);
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
      this.wroughtState = "idle";
      this.poise = WROUGHT_MAX_POISE;
      this.nextAttackReadyAt = now + ATTACK_COOLDOWN_MS;
    }
  }

  private updateIdle(playerX: number, playerY: number, now: number): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    const distFromSpawn = Phaser.Math.Distance.Between(this.x, this.y, this.spawnX, this.spawnY);
    if (this.aggroed && distFromSpawn > LEASH_RADIUS) this.aggroed = false;

    const dist = Phaser.Math.Distance.Between(this.x, this.y, playerX, playerY);
    if (!this.aggroed) {
      if (dist <= AGGRO_RADIUS) {
        this.aggroed = true;
      } else {
        // Deaggro'd (kited past the leash) — wander back toward its own spawn so
        // it doesn't get stranded far from the forge (GremlinKing/Gloamwarden).
        if (distFromSpawn > RETURN_HOME_EPS) {
          const angle = Phaser.Math.Angle.Between(this.x, this.y, this.spawnX, this.spawnY);
          const vx = Math.cos(angle) * MOVE_SPEED;
          const vy = Math.sin(angle) * MOVE_SPEED;
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

  private pickAttack(): WroughtAttackType {
    // Alternate the two attacks (never twice in a row).
    const options: WroughtAttackType[] = ["cone", "hammer"];
    const pool = this.lastAttack ? options.filter((a) => a !== this.lastAttack) : options;
    const choice = pool[Phaser.Math.Between(0, pool.length - 1)];
    this.lastAttack = choice;
    return choice;
  }

  private beginTelegraph(attack: WroughtAttackType, now: number, playerX: number, playerY: number): void {
    this.currentAttack = attack;
    this.wroughtState = "telegraphing";
    this.stateEnteredAt = now;
    this.currentStateDurationMs = telegraphMsFor(attack);
    (this.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
    // The cone LOCKS its direction now (sidestep during the wind-up to dodge).
    // The hammer re-locks at execute (below), so it tracks the player longer.
    if (attack === "cone") {
      this.attackAngle = Phaser.Math.Angle.Between(this.x, this.y, playerX, playerY);
      this.applyFacing(Math.cos(this.attackAngle), Math.sin(this.attackAngle));
    }
  }

  private updateTelegraphing(playerX: number, playerY: number, now: number): void {
    // The cone's direction is locked — keep the sprite pointed at the locked
    // angle so the tell reads honestly; the hammer keeps tracking the player.
    if (this.currentAttack === "cone") this.applyFacing(Math.cos(this.attackAngle), Math.sin(this.attackAngle));
    else this.applyFacing(playerX - this.x, playerY - this.y);
    this.drawTelegraph(playerX, playerY, now);
    if (now >= this.stateEnteredAt + this.currentStateDurationMs) this.beginExecute(now, playerX, playerY);
  }

  private beginExecute(now: number, playerX: number, playerY: number): void {
    this.wroughtState = "executing";
    this.stateEnteredAt = now;
    this.hasHitThisAttack = false;
    this.telegraphGfx.clear();
    (this.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
    if (this.currentAttack === "cone") {
      this.currentStateDurationMs = CONE_IMPACT_MS;
    } else {
      // Forge Hammer: lock the swing direction at the player NOW, then the
      // overhead beat lands.
      this.attackAngle = Phaser.Math.Angle.Between(this.x, this.y, playerX, playerY);
      this.applyFacing(Math.cos(this.attackAngle), Math.sin(this.attackAngle));
      this.currentStateDurationMs = HAMMER_IMPACT_MS;
    }
  }

  private updateExecuting(now: number): void {
    this.drawExecute(now);
    if (now >= this.stateEnteredAt + this.currentStateDurationMs) this.beginRecover(now);
  }

  private beginRecover(now: number): void {
    this.wroughtState = "recovering";
    this.stateEnteredAt = now;
    this.currentStateDurationMs = recoverMsFor(this.currentAttack!);
    this.telegraphGfx.clear();
    (this.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
  }

  private updateRecovering(now: number): void {
    if (now >= this.stateEnteredAt + this.currentStateDurationMs) {
      this.wroughtState = "idle";
      this.nextAttackReadyAt = now + ATTACK_COOLDOWN_MS;
    }
  }

  private updatePoiseRegen(delta: number, now: number): void {
    if (this.wroughtState === "staggered") return;
    if (now - this.lastPoiseChipAt < POISE_REGEN_DELAY_MS) return;
    if (this.poise >= WROUGHT_MAX_POISE) return;
    this.poise = Math.min(WROUGHT_MAX_POISE, this.poise + POISE_REGEN_PER_SEC * (delta / 1000));
  }

  // Wedge helper: fill a fire-colored sector centered on `angle`.
  private fillWedge(
    g: Phaser.GameObjects.Graphics,
    angle: number,
    halfAngle: number,
    range: number,
    color: number,
    alpha: number,
  ): void {
    g.fillStyle(color, alpha);
    g.beginPath();
    g.moveTo(this.x, this.y);
    g.arc(this.x, this.y, range, angle - halfAngle, angle + halfAngle);
    g.closePath();
    g.fillPath();
  }

  private drawTelegraph(_playerX: number, _playerY: number, now: number): void {
    const g = this.telegraphGfx;
    g.clear();
    g.setDepth(this.depth + 0.5);
    const frac = Phaser.Math.Clamp(
      this.currentStateDurationMs > 0 ? (now - this.stateEnteredAt) / this.currentStateDurationMs : 1,
      0,
      1,
    );
    if (this.currentAttack === "cone") {
      // Growing ember fan in the LOCKED direction — a faint fill that brightens
      // as the breath charges, with a crisp outline at the true reach so the
      // dodge boundary reads.
      this.fillWedge(g, this.attackAngle, CONE_HALF_ANGLE, CONE_RANGE, 0xff6a1a, 0.1 + 0.22 * frac);
      g.lineStyle(2, 0xffb060, 0.55);
      g.beginPath();
      g.moveTo(this.x, this.y);
      g.arc(this.x, this.y, CONE_RANGE, this.attackAngle - CONE_HALF_ANGLE, this.attackAngle + CONE_HALF_ANGLE);
      g.closePath();
      g.strokePath();
    } else {
      // Hammer: a short wide front wedge that fills as the overhead winds up.
      // Tracks the player during the telegraph (direction locks at execute).
      const facing = Phaser.Math.Angle.Between(this.x, this.y, _playerX, _playerY);
      this.fillWedge(g, facing, HAMMER_HALF_ARC, HAMMER_RANGE, 0xff4a1a, 0.12 + 0.3 * frac);
      g.lineStyle(2, 0xffa050, 0.6);
      g.beginPath();
      g.moveTo(this.x, this.y);
      g.arc(this.x, this.y, HAMMER_RANGE, facing - HAMMER_HALF_ARC, facing + HAMMER_HALF_ARC);
      g.closePath();
      g.strokePath();
    }
  }

  // The execute-phase visual: a bright burst of the attack's shape at full reach.
  private drawExecute(now: number): void {
    const g = this.telegraphGfx;
    g.clear();
    g.setDepth(this.depth + 0.5);
    const frac = Phaser.Math.Clamp((now - this.stateEnteredAt) / Math.max(1, this.currentStateDurationMs), 0, 1);
    if (this.currentAttack === "cone") {
      // A rolling flame cone: two stacked wedges (outer glow + hot core) that
      // flicker over the impact window.
      const flick = 0.85 + 0.15 * Math.sin(frac * Math.PI * 6);
      this.fillWedge(g, this.attackAngle, CONE_HALF_ANGLE, CONE_RANGE, 0xff6a1a, 0.5 * flick);
      this.fillWedge(g, this.attackAngle, CONE_HALF_ANGLE * 0.6, CONE_RANGE * 0.9, 0xffd060, 0.55 * flick);
    } else {
      // Hammer impact: the front wedge flashes bright then fades over the beat.
      const a = 0.75 * (1 - frac);
      this.fillWedge(g, this.attackAngle, HAMMER_HALF_ARC, HAMMER_RANGE, 0xffb050, a);
      this.fillWedge(g, this.attackAngle, HAMMER_HALF_ARC * 0.7, HAMMER_RANGE, 0xfff0c0, a * 0.8);
    }
  }

  // Queried each frame by MainScene.updateEnemies() (like GremlinKing/Gloamwarden)
  // — area damage needs richer info (knockback) than the base bite bool.
  checkPlayerHit(
    playerX: number,
    playerY: number,
  ): { damage: number; knockback?: number; dmgType?: IncomingDamageType } | null {
    if (this.wroughtState !== "executing" || this.hasHitThisAttack) return null;
    const dist = Phaser.Math.Distance.Between(this.x, this.y, playerX, playerY);
    const angleToPlayer = Phaser.Math.Angle.Between(this.x, this.y, playerX, playerY);
    const angleDiff = Math.abs(Phaser.Math.Angle.Wrap(angleToPlayer - this.attackAngle));
    if (this.currentAttack === "cone") {
      if (dist > CONE_RANGE || angleDiff > CONE_HALF_ANGLE) return null;
      this.hasHitThisAttack = true;
      return { damage: CONE_DAMAGE, knockback: CONE_KNOCKBACK, dmgType: "fire" };
    }
    if (dist > HAMMER_RANGE || angleDiff > HAMMER_HALF_ARC) return null;
    this.hasHitThisAttack = true;
    return { damage: HAMMER_DAMAGE, knockback: HAMMER_KNOCKBACK, dmgType: "fire" };
  }

  takeHit(damage: number): boolean {
    const depleted = super.takeHit(damage);
    if (depleted) return true;
    if (this.wroughtState === "staggered") return false;
    this.poise = Math.max(0, this.poise - damage);
    this.lastPoiseChipAt = this.scene.time.now;
    if (this.poise <= 0) this.enterStaggered(this.scene.time.now);
    return false;
  }

  private enterStaggered(now: number): void {
    this.wroughtState = "staggered";
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
