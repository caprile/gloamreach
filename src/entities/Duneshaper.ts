import Phaser from "phaser";
import { Enemy } from "./Enemy";
import type { DamageType } from "../systems/Weapons";
import type { ProjectileConfig, ProjectileHost } from "./Projectile";

// The Duneshaper (a.k.a. the Gloam Tyrant) — the SUNSCORCH BADLANDS FINAL BOSS
// and the game's new win-condition (biome 2 Phase 3). A gloam-warped apex
// sorcerer commanding sand + gloamfire. Bespoke AI following the GremlinKing/
// Gloamwarden/Cinderwrought telegraph/poise pattern — NOT a shared framework
// (the standing "own condition/numbers, don't generalize" boss lock). Extends
// Enemy for the HP-bar/loot/death machinery, fully overrides update() (Snake/
// Boar/Gloamwarden/Cinderwrought precedent). Built around the player's EXISTING
// dash/i-frame toolkit — no new player ability.
//
// The escalation (locked with the user): a PHASE-GATED attack pool. Three
// attacks at full HP; a 4th (gloamfire lance) unlocks at 70% HP; a 5th
// (sunscorch barrage) unlocks at 50% HP, alongside enrage timing. It out-classes
// the Gremlin King (3 attacks + one enrage phase), as befits the final boss.
//
// A deliberate DAMAGE-TYPE MIX so player gear reads: the sand spikes are
// PHYSICAL pierce (the flat-armor subtraction applies), while the bolts/nova/
// lance/barrage are MAGIC (bypass flat armor via the Phase 1 hook). It also
// resists magic and is weak to physical melee — a caster's soft hide.
export type TyrantState = "idle" | "telegraphing" | "executing" | "recovering" | "staggered";
export type TyrantAttack = "volley" | "spikes" | "nova" | "lance" | "barrage";

const MAX_HEALTH = 900; // final boss — above the Gremlin King's 600
export const DUNESHAPER_SCALE = 2.3;
const AGGRO_RADIUS = 300;
const LEASH_RADIUS = 580; // kited past this -> fully deaggros
const MOVE_SPEED = 48;
const PREFERRED_RANGE = 220; // a caster: holds around here and casts, only closing if farther
const DEAGGRO_REGEN_PER_SEC = 14; // claws HP back between engagements (roster precedent)

export const DUNESHAPER_MAX_POISE = 120;
export const DUNESHAPER_STAGGER_DAMAGE_MULTIPLIER = 1.5;
const STAGGER_DURATION_MS = 3000;
const POISE_REGEN_DELAY_MS = 4000;
const POISE_REGEN_PER_SEC = 15;
const POISE_BAR_OFFSET_Y = 10;

const ATTACK_COOLDOWN_MS = 900;
const RETURN_HOME_EPS = 20;

// Phase gates (fraction of max HP). The attack pool grows as HP drops.
const PHASE2_HP = 0.7; // + gloamfire lance
const PHASE3_HP = 0.5; // + sunscorch barrage, and enrage timing
const ENRAGE_TELEGRAPH_MULTIPLIER = 0.7;
const ENRAGE_RECOVER_MULTIPLIER = 0.75;
const ENRAGE_MOVE_MULTIPLIER = 1.3;

// --- Gloam Volley — 3 magic bolts in a spread (projectiles self-resolve). ---
const VOLLEY_TELEGRAPH_MS = 700;
const VOLLEY_EXECUTE_MS = 200;
const VOLLEY_RECOVER_MS = 550;
const VOLLEY_BOLTS = 3;
const VOLLEY_SPREAD = Phaser.Math.DegToRad(18);
const VOLLEY_BOLT_DAMAGE = 24; // magic — bypasses armor
const VOLLEY_BOLT_SPEED = 240;
const VOLLEY_BOLT_RANGE = 460;

// --- Sand Spikes — 3 growing circles across the player's spot, PHYSICAL. ---
const SPIKES_TELEGRAPH_MS = 850;
const SPIKES_IMPACT_MS = 260;
const SPIKES_RECOVER_MS = 700;
const SPIKES_RADIUS = 46;
const SPIKES_SPREAD = 62;
const SPIKES_DAMAGE = 50; // physical pierce — the flat-armor subtraction applies
const SPIKES_KNOCKBACK = 70;

// --- Blink Nova — teleport near the player, detonate a radial magic burst. ---
const NOVA_TELEGRAPH_MS = 650;
const NOVA_IMPACT_MS = 200;
const NOVA_RECOVER_MS = 650;
const NOVA_BLINK_STANDOFF = 96; // lands this far from the player, on the near side
const NOVA_RADIUS = 132;
const NOVA_DAMAGE = 42; // magic
const NOVA_KNOCKBACK = 220;

// --- Gloamfire Lance (phase 2) — locked-direction beam. ---
const LANCE_TELEGRAPH_MS = 900;
const LANCE_IMPACT_MS = 320;
const LANCE_RECOVER_MS = 800;
const LANCE_RANGE = 340;
const LANCE_HALF_ANGLE = Phaser.Math.DegToRad(10);
const LANCE_DAMAGE = 46; // magic
const LANCE_KNOCKBACK = 120;

// --- Sunscorch Barrage (phase 3) — a carpet of meteor circles. ---
const BARRAGE_TELEGRAPH_MS = 1100;
const BARRAGE_IMPACT_MS = 320;
const BARRAGE_RECOVER_MS = 850;
const BARRAGE_RING_COUNT = 6;
const BARRAGE_RING_RADIUS = 145; // ring of impacts around the player + one on them
const BARRAGE_CIRCLE_RADIUS = 54;
const BARRAGE_DAMAGE = 30; // magic
const BARRAGE_KNOCKBACK = 80;

function telegraphMsFor(a: TyrantAttack): number {
  switch (a) {
    case "volley": return VOLLEY_TELEGRAPH_MS;
    case "spikes": return SPIKES_TELEGRAPH_MS;
    case "nova": return NOVA_TELEGRAPH_MS;
    case "lance": return LANCE_TELEGRAPH_MS;
    case "barrage": return BARRAGE_TELEGRAPH_MS;
  }
}
function recoverMsFor(a: TyrantAttack): number {
  switch (a) {
    case "volley": return VOLLEY_RECOVER_MS;
    case "spikes": return SPIKES_RECOVER_MS;
    case "nova": return NOVA_RECOVER_MS;
    case "lance": return LANCE_RECOVER_MS;
    case "barrage": return BARRAGE_RECOVER_MS;
  }
}

export class Duneshaper extends Enemy {
  private tyrantState: TyrantState = "idle";
  private currentAttack: TyrantAttack | null = null;
  private lastAttack: TyrantAttack | null = null;
  private stateEnteredAt = 0;
  private currentStateDurationMs = 0;
  private nextAttackReadyAt = 0;
  private aggroed = false;
  private enraged = false;
  private readonly spawnX: number;
  private readonly spawnY: number;

  poise = DUNESHAPER_MAX_POISE;
  private lastPoiseChipAt = -Infinity;

  // Locked direction for the lance (snapped at telegraph start so a sidestep dodges).
  private attackAngle = 0;
  // AoE circle sets for spikes / barrage — locked at telegraph start.
  private zoneCircles: { x: number; y: number }[] = [];
  // Nova detonates around the boss's post-blink position.
  private hasHitThisAttack = false;

  private poiseBarBg: Phaser.GameObjects.Rectangle;
  private poiseBarFill: Phaser.GameObjects.Rectangle;
  private telegraphGfx: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene, cfg: { x: number; y: number }) {
    super(scene, {
      x: cfg.x,
      y: cfg.y,
      texture: "duneshaper",
      displayName: "The Duneshaper",
      // Guaranteed relic payoff for the final fight — a couple of refined
      // (Uncommon-rolling) trophies + shards to fuel the forge. Phase 5 will
      // re-tier the whole badlands trophy set (tier-2 + Ember); kept simple here.
      loot: [
        { resource: "gloam_shard", min: 5, max: 8 },
        { resource: "refined_trophy_uncommon", min: 2, max: 2 },
      ],
      maxHealth: MAX_HEALTH,
      biteDamage: 0, // all damage flows through checkPlayerHit() / projectiles
      // A caster's soft hide: every melee type bites deep, its own gloam element
      // barely dents it. ranged left neutral.
      resistances: { magic: 0.5, slash: 1.3, blunt: 1.3, pierce: 1.3 },
      upright: true, // humanoid sorcerer — mirror left/right, never rotate
    });
    this.spawnX = cfg.x;
    this.spawnY = cfg.y;
    this.baseScale = DUNESHAPER_SCALE;
    this.setScale(DUNESHAPER_SCALE);

    const barX = cfg.x - Enemy.BAR_W / 2;
    const barY = cfg.y - Enemy.BAR_OFFSET_Y + POISE_BAR_OFFSET_Y;
    this.poiseBarBg = scene.add.rectangle(barX, barY, Enemy.BAR_W, Enemy.BAR_H, 0x1a1030, 0.85).setOrigin(0, 0.5);
    this.poiseBarFill = scene.add.rectangle(barX, barY, Enemy.BAR_W, Enemy.BAR_H, 0xc79cf0, 1).setOrigin(0, 0.5);
    this.telegraphGfx = scene.add.graphics();
  }

  preUpdate(time: number, delta: number): void {
    super.preUpdate(time, delta);
    const barX = this.x - Enemy.BAR_W / 2;
    const barY = this.y - Enemy.BAR_OFFSET_Y + POISE_BAR_OFFSET_Y;
    const aggro = this.isAggro();
    this.poiseBarBg.setPosition(barX, barY).setDepth(this.depth + 1).setVisible(aggro);
    this.poiseBarFill.setPosition(barX, barY).setDepth(this.depth + 1).setVisible(aggro);
    this.poiseBarFill.setScale(Math.max(0, this.poise / DUNESHAPER_MAX_POISE), 1);
  }

  isAggro(): boolean {
    return this.aggroed;
  }
  // Public mirror for the fixed top-of-screen BossHealthUI (like GremlinKing).
  isEngaged(): boolean {
    return this.aggroed;
  }
  isStaggered(): boolean {
    return this.tyrantState === "staggered";
  }
  get poiseMax(): number {
    return DUNESHAPER_MAX_POISE;
  }

  update(delta: number, playerX: number, playerY: number, now: number): boolean {
    if (this.depleted) return false;
    this.enraged = this.health <= this.maxHealth * PHASE3_HP;
    this.updatePoiseRegen(delta, now);
    if (!this.aggroed && this.health < this.maxHealth) {
      this.health = Math.min(this.maxHealth, this.health + DEAGGRO_REGEN_PER_SEC * (delta / 1000));
      this.applyHpTint();
    }

    switch (this.tyrantState) {
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
      this.tyrantState = "idle";
      this.poise = DUNESHAPER_MAX_POISE;
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

    // A caster holds around PREFERRED_RANGE and casts; only drifts in if farther.
    const moveSpeed = MOVE_SPEED * (this.enraged ? ENRAGE_MOVE_MULTIPLIER : 1);
    if (dist > PREFERRED_RANGE) {
      const angle = Phaser.Math.Angle.Between(this.x, this.y, playerX, playerY);
      body.setVelocity(Math.cos(angle) * moveSpeed, Math.sin(angle) * moveSpeed);
      this.applyFacing(playerX - this.x, playerY - this.y);
    } else {
      body.setVelocity(0, 0);
      this.applyFacing(playerX - this.x, playerY - this.y);
    }
  }

  // Attacks unlocked at the current HP fraction (the escalation).
  private availableAttacks(): TyrantAttack[] {
    const frac = this.health / this.maxHealth;
    const pool: TyrantAttack[] = ["volley", "spikes", "nova"];
    if (frac <= PHASE2_HP) pool.push("lance");
    if (frac <= PHASE3_HP) pool.push("barrage");
    return pool;
  }

  private pickAttack(): TyrantAttack {
    const options = this.availableAttacks();
    const pool = this.lastAttack ? options.filter((a) => a !== this.lastAttack) : options;
    const choice = pool[Phaser.Math.Between(0, pool.length - 1)];
    this.lastAttack = choice;
    return choice;
  }

  private beginTelegraph(attack: TyrantAttack, now: number, playerX: number, playerY: number): void {
    this.currentAttack = attack;
    this.tyrantState = "telegraphing";
    this.stateEnteredAt = now;
    this.currentStateDurationMs = telegraphMsFor(attack) * (this.enraged ? ENRAGE_TELEGRAPH_MULTIPLIER : 1);
    (this.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
    this.playWindupTell(this.currentStateDurationMs, 0xc79cf0);

    if (attack === "lance") {
      // Lock the beam direction NOW (sidestep during the wind-up to dodge).
      this.attackAngle = Phaser.Math.Angle.Between(this.x, this.y, playerX, playerY);
    } else if (attack === "spikes") {
      // 3 circles: on the player + a perpendicular spread (a sideways dodge is
      // covered, retreating straight back escapes — a learnable pattern).
      const axis = Phaser.Math.Angle.Between(this.x, this.y, playerX, playerY);
      const perp = axis + Math.PI / 2;
      const ox = Math.cos(perp) * SPIKES_SPREAD;
      const oy = Math.sin(perp) * SPIKES_SPREAD;
      this.zoneCircles = [
        { x: playerX, y: playerY },
        { x: playerX + ox, y: playerY + oy },
        { x: playerX - ox, y: playerY - oy },
      ];
    } else if (attack === "barrage") {
      // A carpet: a ring of impacts around the player + one on them. Find a gap.
      this.zoneCircles = [{ x: playerX, y: playerY }];
      for (let i = 0; i < BARRAGE_RING_COUNT; i++) {
        const a = (i / BARRAGE_RING_COUNT) * Math.PI * 2;
        this.zoneCircles.push({
          x: playerX + Math.cos(a) * BARRAGE_RING_RADIUS,
          y: playerY + Math.sin(a) * BARRAGE_RING_RADIUS,
        });
      }
    }
  }

  private updateTelegraphing(playerX: number, playerY: number, now: number): void {
    // The lance keeps its locked heading; everything else keeps facing the player.
    if (this.currentAttack === "lance") this.faceAngle(this.attackAngle);
    else this.applyFacing(playerX - this.x, playerY - this.y);
    this.drawTelegraph(now);
    if (now >= this.stateEnteredAt + this.currentStateDurationMs) this.beginExecute(now, playerX, playerY);
  }

  private beginExecute(now: number, playerX: number, playerY: number): void {
    this.tyrantState = "executing";
    this.stateEnteredAt = now;
    this.hasHitThisAttack = false;
    this.telegraphGfx.clear();
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(0, 0);

    switch (this.currentAttack) {
      case "volley":
        this.fireVolley(playerX, playerY);
        this.currentStateDurationMs = VOLLEY_EXECUTE_MS;
        break;
      case "spikes":
        this.currentStateDurationMs = SPIKES_IMPACT_MS;
        break;
      case "nova":
        this.blinkTo(playerX, playerY);
        this.currentStateDurationMs = NOVA_IMPACT_MS;
        break;
      case "lance":
        this.currentStateDurationMs = LANCE_IMPACT_MS;
        break;
      case "barrage":
        this.currentStateDurationMs = BARRAGE_IMPACT_MS;
        break;
    }
  }

  private updateExecuting(now: number): void {
    this.drawExecute(now);
    if (now >= this.stateEnteredAt + this.currentStateDurationMs) this.beginRecover(now);
  }

  private beginRecover(now: number): void {
    this.tyrantState = "recovering";
    this.stateEnteredAt = now;
    this.currentStateDurationMs = recoverMsFor(this.currentAttack!) * (this.enraged ? ENRAGE_RECOVER_MULTIPLIER : 1);
    (this.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
    this.telegraphGfx.clear();
  }

  private updateRecovering(now: number): void {
    if (now >= this.stateEnteredAt + this.currentStateDurationMs) {
      this.tyrantState = "idle";
      this.nextAttackReadyAt = now + ATTACK_COOLDOWN_MS;
    }
  }

  private updatePoiseRegen(delta: number, now: number): void {
    if (this.tyrantState === "staggered") return;
    if (now - this.lastPoiseChipAt < POISE_REGEN_DELAY_MS) return;
    if (this.poise >= DUNESHAPER_MAX_POISE) return;
    this.poise = Math.min(DUNESHAPER_MAX_POISE, this.poise + POISE_REGEN_PER_SEC * (delta / 1000));
  }

  // --- Gloam Volley ---------------------------------------------------------

  private fireVolley(playerX: number, playerY: number): void {
    const center = Phaser.Math.Angle.Between(this.x, this.y, playerX, playerY);
    for (let i = 0; i < VOLLEY_BOLTS; i++) {
      const offset = (i - (VOLLEY_BOLTS - 1) / 2) * VOLLEY_SPREAD;
      const cfg: ProjectileConfig = {
        x: this.x,
        y: this.y,
        angle: center + offset,
        speed: VOLLEY_BOLT_SPEED,
        damage: VOLLEY_BOLT_DAMAGE,
        texture: "gloam_bolt",
        maxRangePx: VOLLEY_BOLT_RANGE,
        sourceIsPlayer: false,
        damageType: "magic",
      };
      (this.scene as unknown as ProjectileHost).spawnProjectile(cfg);
    }
  }

  // --- Blink (for the nova) -------------------------------------------------

  private blinkTo(playerX: number, playerY: number): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    const ghost = this.scene.add.image(this.x, this.y, this.texture.key).setAlpha(0.5).setDepth(this.depth);
    ghost.setScale(this.baseScale).setTint(0x9a5ee8);
    this.scene.tweens.add({
      targets: ghost,
      alpha: 0,
      duration: 240,
      ease: "Quad.easeOut",
      onComplete: () => ghost.destroy(),
    });
    // Land NOVA_BLINK_STANDOFF from the player, on the near side (so the nova's
    // radius reaches them but they still had the telegraph to move).
    const toBoss = Phaser.Math.Angle.Between(playerX, playerY, this.x, this.y);
    const nx = playerX + Math.cos(toBoss) * NOVA_BLINK_STANDOFF;
    const ny = playerY + Math.sin(toBoss) * NOVA_BLINK_STANDOFF;
    this.x = nx;
    this.y = ny;
    body.reset(nx, ny);
    this.applyFacing(playerX - nx, playerY - ny);
  }

  // --- Telegraph / execute visuals ------------------------------------------

  private fillWedge(g: Phaser.GameObjects.Graphics, angle: number, half: number, range: number, color: number, alpha: number): void {
    g.fillStyle(color, alpha);
    g.beginPath();
    g.moveTo(this.x, this.y);
    g.arc(this.x, this.y, range, angle - half, angle + half);
    g.closePath();
    g.fillPath();
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
    if (this.currentAttack === "lance") {
      this.fillWedge(g, this.attackAngle, LANCE_HALF_ANGLE, LANCE_RANGE, 0xb060ff, 0.1 + 0.24 * frac);
      g.lineStyle(2, 0xd7a0ff, 0.6);
      g.beginPath();
      g.moveTo(this.x, this.y);
      g.arc(this.x, this.y, LANCE_RANGE, this.attackAngle - LANCE_HALF_ANGLE, this.attackAngle + LANCE_HALF_ANGLE);
      g.closePath();
      g.strokePath();
    } else if (this.currentAttack === "spikes" || this.currentAttack === "barrage") {
      const r0 = this.currentAttack === "spikes" ? SPIKES_RADIUS : BARRAGE_CIRCLE_RADIUS;
      for (const c of this.zoneCircles) {
        g.fillStyle(0xc79050, 0.1 + 0.26 * frac); // dusty sand telegraph
        g.fillCircle(c.x, c.y, r0 * (0.5 + 0.5 * frac));
        g.lineStyle(2, 0xe0b060, 0.5 + 0.35 * frac);
        g.strokeCircle(c.x, c.y, r0);
      }
    } else if (this.currentAttack === "nova") {
      // A charge glow around the boss growing toward the nova radius.
      g.fillStyle(0x9a5ee8, 0.1 + 0.22 * frac);
      g.fillCircle(this.x, this.y, NOVA_RADIUS * (0.35 + 0.4 * frac));
      g.lineStyle(2, 0xc79cf0, 0.55);
      g.strokeCircle(this.x, this.y, NOVA_RADIUS * 0.5);
    } else if (this.currentAttack === "volley") {
      // A gathering violet mote at the staff hand.
      g.fillStyle(0xb060ff, 0.2 + 0.4 * frac);
      g.fillCircle(this.x, this.y - 8, 6 + 6 * frac);
    }
  }

  private drawExecute(now: number): void {
    const g = this.telegraphGfx;
    g.clear();
    g.setDepth(this.depth + 0.5);
    const frac = Phaser.Math.Clamp((now - this.stateEnteredAt) / Math.max(1, this.currentStateDurationMs), 0, 1);
    if (this.currentAttack === "lance") {
      const flick = 0.85 + 0.15 * Math.sin(frac * Math.PI * 6);
      this.fillWedge(g, this.attackAngle, LANCE_HALF_ANGLE, LANCE_RANGE, 0xb060ff, 0.5 * flick);
      this.fillWedge(g, this.attackAngle, LANCE_HALF_ANGLE * 0.5, LANCE_RANGE, 0xffe0ff, 0.6 * flick);
    } else if (this.currentAttack === "spikes" || this.currentAttack === "barrage") {
      const magic = this.currentAttack === "barrage";
      const r0 = magic ? BARRAGE_CIRCLE_RADIUS : SPIKES_RADIUS;
      const a = 0.8 * (1 - frac);
      for (const c of this.zoneCircles) {
        g.fillStyle(magic ? 0xff7a3a : 0xd8a860, a);
        g.fillCircle(c.x, c.y, r0);
        g.fillStyle(magic ? 0xffe08a : 0xf0d090, a * 0.8);
        g.fillCircle(c.x, c.y, r0 * 0.55);
      }
    } else if (this.currentAttack === "nova") {
      const a = 0.7 * (1 - frac);
      g.fillStyle(0x9a5ee8, a);
      g.fillCircle(this.x, this.y, NOVA_RADIUS);
      g.fillStyle(0xe0c0ff, a * 0.8);
      g.fillCircle(this.x, this.y, NOVA_RADIUS * 0.6);
    }
  }

  // Queried each frame by MainScene.updateEnemies() (like the other area bosses)
  // — richer than the base bite bool (knockback + magic dmgType). One hit per
  // attack instance. The volley isn't handled here — its projectiles self-resolve.
  checkPlayerHit(playerX: number, playerY: number): { damage: number; knockback?: number; dmgType?: DamageType } | null {
    if (this.tyrantState !== "executing" || this.hasHitThisAttack) return null;
    const dist = Phaser.Math.Distance.Between(this.x, this.y, playerX, playerY);

    if (this.currentAttack === "nova") {
      if (dist > NOVA_RADIUS) return null;
      this.hasHitThisAttack = true;
      return { damage: NOVA_DAMAGE, knockback: NOVA_KNOCKBACK, dmgType: "magic" };
    }
    if (this.currentAttack === "lance") {
      const angleToPlayer = Phaser.Math.Angle.Between(this.x, this.y, playerX, playerY);
      const angleDiff = Math.abs(Phaser.Math.Angle.Wrap(angleToPlayer - this.attackAngle));
      if (dist > LANCE_RANGE || angleDiff > LANCE_HALF_ANGLE) return null;
      this.hasHitThisAttack = true;
      return { damage: LANCE_DAMAGE, knockback: LANCE_KNOCKBACK, dmgType: "magic" };
    }
    if (this.currentAttack === "spikes") {
      for (const c of this.zoneCircles) {
        if (Phaser.Math.Distance.Between(c.x, c.y, playerX, playerY) <= SPIKES_RADIUS) {
          this.hasHitThisAttack = true;
          return { damage: SPIKES_DAMAGE, knockback: SPIKES_KNOCKBACK }; // physical — armor applies
        }
      }
      return null;
    }
    if (this.currentAttack === "barrage") {
      for (const c of this.zoneCircles) {
        if (Phaser.Math.Distance.Between(c.x, c.y, playerX, playerY) <= BARRAGE_CIRCLE_RADIUS) {
          this.hasHitThisAttack = true;
          return { damage: BARRAGE_DAMAGE, knockback: BARRAGE_KNOCKBACK, dmgType: "magic" };
        }
      }
      return null;
    }
    return null;
  }

  takeHit(damage: number): boolean {
    const depleted = super.takeHit(damage);
    if (depleted) return true;
    if (this.tyrantState === "staggered") return false;
    this.poise = Math.max(0, this.poise - damage);
    this.lastPoiseChipAt = this.scene.time.now;
    if (this.poise <= 0) this.enterStaggered(this.scene.time.now);
    return false;
  }

  private enterStaggered(now: number): void {
    this.tyrantState = "staggered";
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
