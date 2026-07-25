import Phaser from "phaser";
import { Enemy } from "./Enemy";
import type { DamageType } from "../systems/Weapons";
import type { ProjectileConfig, ProjectileHost } from "./Projectile";
import { enemyStat } from "../systems/enemyStats";

// Combat stats from the Phaser-free source of truth (also read by the balancing
// dashboard, so the two can never drift). Tune numbers there, not here.
const S = enemyStat("duneshaper");

// The Duneshaper (a.k.a. the Gloam Tyrant) — the SUNSCORCH BADLANDS FINAL BOSS
// (biome 2 Phase 3). It WAS the game's win-condition until biome 3's Miretyrant
// took that role (B3-P4d), exactly as biome 2 demoted the Gremlin King before
// it; it is now a mid-progression big boss whose kill is scored as a boss and
// whose drops are finally reachable. A gloam-warped apex
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

const MAX_HEALTH = S.hp; // 1250→2500 (PB17: the user wanted the final boss ≥2× tankier — a real endurance fight)
export const DUNESHAPER_SCALE = 2.3;
const AGGRO_RADIUS = 300;
const LEASH_RADIUS = 580; // kited past this -> fully deaggros
const MOVE_SPEED = 48;
const PREFERRED_RANGE = 220; // a caster: holds around here and casts, only closing if farther
const DEAGGRO_REGEN_PER_SEC = 14; // claws HP back between engagements (roster precedent)

// S2: harder to stagger-lock — poise up, the punish window shorter (2.2s) and
// less rewarding (1.35× not 1.5×), and poise recovers sooner + faster between
// engagements so it can't be chain-staggered. PB17: poise 170→400 (the user:
// "shouldn't stagger so fast") — scaled MORE than the 2× HP bump so staggers are
// genuinely rarer, not just spread over a longer fight.
export const DUNESHAPER_MAX_POISE = 400;
export const DUNESHAPER_STAGGER_DAMAGE_MULTIPLIER = 1.35;
const STAGGER_DURATION_MS = 2200;
const POISE_REGEN_DELAY_MS = 3000;
const POISE_REGEN_PER_SEC = 22;
const POISE_BAR_OFFSET_Y = 10;
// A boss stagger bar reads as a real mechanic — much bigger than the tiny 22×3
// regular-enemy bars (the primary poise display is the top BossHealthUI bar,
// but the world bar shouldn't be a thin sliver either).
const POISE_BAR_W = 64;
const POISE_BAR_H = 6;

const ATTACK_COOLDOWN_MS = 700; // 900→700 (S3: less downtime between casts — more pressure)
const RETURN_HOME_EPS = 20;

// Phase gates (fraction of max HP). The attack pool grows as HP drops.
const PHASE2_HP = 0.7; // + gloamfire lance
const PHASE3_HP = 0.5; // + sunscorch barrage, and enrage timing
// Ceiling on any single hit, as a share of max HP — the anti-one-burst governor.
const BOSS_MAX_HIT_FRACTION = 0.05;
const ENRAGE_TELEGRAPH_MULTIPLIER = 0.7;
const ENRAGE_RECOVER_MULTIPLIER = 0.75;
const ENRAGE_MOVE_MULTIPLIER = 1.3;

// --- Gloam Volley — a beam-like 6-bolt spray (projectiles self-resolve). ---
// S2 rework (the user): "beam-like, 6 not 3, near-instant, short react window."
// Short wind-up (420ms) + fast bolts (460 px/s) so it can't be lazily
// sidestepped, in a tight fan (6 × 9° = ~45°) that reads as a rapid beam-spray;
// per-bolt damage trimmed slightly since more bolts now land (a face-full hurts
// more, a clipping single hit ≈ the same).
const VOLLEY_TELEGRAPH_MS = 420;
const VOLLEY_EXECUTE_MS = 200;
const VOLLEY_RECOVER_MS = 550;
const VOLLEY_BOLTS = 6;
const VOLLEY_SPREAD = Phaser.Math.DegToRad(9);
const VOLLEY_BOLT_DAMAGE = S.attacks[0].damage; // magic — bypasses armor, per bolt
const VOLLEY_BOLT_SPEED = 460;
const VOLLEY_BOLT_RANGE = 520;

// --- Sand Spikes — a tracked 5-circle CROSS erupting under the player, PHYSICAL. ---
// S3 (the user: "3-circle attack too much like the hexling one, needs to be harder
// to dodge"): was 3 circles in a perpendicular row (a plain sidestep dodged it,
// and it read like the Hexling's bolt spread). Now it's a + of circles — center on
// the player + 4 arms along the boss→player axis and its perpendicular — that
// TRACKS the player until SPIKES_LOCK_FRAC, so the cardinal escapes are all
// covered and only a DIAGONAL run or a dash clears it. Distinct silhouette (a
// sand starburst under your feet), and genuinely a "move or dash" moment.
const SPIKES_TELEGRAPH_MS = 780;
const SPIKES_IMPACT_MS = 260;
const SPIKES_RECOVER_MS = 640;
const SPIKES_RADIUS = 44;
const SPIKES_SPREAD = 64; // arm distance from center
const SPIKES_LOCK_FRAC = 0.5; // track the player for the first half of the wind-up
const SPIKES_DAMAGE = S.attacks[1].damage; // physical pierce — the flat-armor subtraction applies
const SPIKES_KNOCKBACK = 70;

// --- Blink Nova — teleport near the player, detonate a radial magic burst. ---
const NOVA_TELEGRAPH_MS = 650;
const NOVA_IMPACT_MS = 200;
const NOVA_RECOVER_MS = 650;
const NOVA_BLINK_STANDOFF = 96; // lands this far from the player, on the near side
const NOVA_RADIUS = 132;
const NOVA_DAMAGE = S.attacks[2].damage; // 42→50 magic (S2: more dmg)
const NOVA_KNOCKBACK = 220;

// --- Gloamfire Lance (phase 2) — a tracking-then-committed sweeping beam. ---
// S3 (the user: "beam still trivial to sidestep"): the old beam locked its heading
// at telegraph START, so a full wind-up of free perpendicular walking dodged it.
// Now it TRACKS the player through the first LANCE_LOCK_FRAC of the wind-up before
// committing (a short reaction window, not a free pre-dodge), and SWEEPS ±half
// across that heading during the strike so a static sidestep gets caught.
const LANCE_TELEGRAPH_MS = 640;
const LANCE_IMPACT_MS = 340;
const LANCE_RECOVER_MS = 750;
const LANCE_RANGE = 360;
const LANCE_HALF_ANGLE = Phaser.Math.DegToRad(11);
const LANCE_LOCK_FRAC = 0.6; // re-aim at the player until 60% through the wind-up, then commit
const LANCE_SWEEP_HALF = Phaser.Math.DegToRad(20); // beam sweeps across ±20° during the strike
const LANCE_DAMAGE = S.attacks[3].damage; // magic — bypasses armor
const LANCE_KNOCKBACK = 120;

// --- Sunscorch Barrage (phase 3) — a carpet of meteor circles. ---
const BARRAGE_TELEGRAPH_MS = 1100;
const BARRAGE_IMPACT_MS = 320;
const BARRAGE_RECOVER_MS = 850;
const BARRAGE_RING_COUNT = 6;
const BARRAGE_RING_RADIUS = 145; // ring of impacts around the player + one on them
const BARRAGE_CIRCLE_RADIUS = 54;
const BARRAGE_DAMAGE = S.attacks[4].damage; // 30→34 magic (S2: more dmg)
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
      // A Tier-2 Boss Trophy (guaranteed Mythic, ×1.5 magnitude — S4) plus ember
      // shards, and the Duneshaper's Heart, which gates the Gemwright's Table's
      // ability-jewelry tier (B3-P2b). All three were unreachable while this
      // kill ended the run; B3-P4d's win-con swap is what turns them on.
      loot: [
        { resource: "ember_shard", min: 5, max: 8 },
        { resource: "boss_refined_trophy_t2", min: 1, max: 1 },
        { resource: "duneshaper_heart", min: 1, max: 1 },
      ],
      maxHealth: MAX_HEALTH,
      biteDamage: 0, // all damage flows through checkPlayerHit() / projectiles
      // Resistances/weaknesses removed (2026-07-24, the user) — damage-type layer retired.
      upright: true, // humanoid sorcerer — mirror left/right, never rotate
    });
    this.spawnX = cfg.x;
    this.spawnY = cfg.y;
    this.baseScale = DUNESHAPER_SCALE;
    // Big-boss pacing guards (base Enemy, off by default) — a per-hit ceiling
    // plus a scripted transition at each attack-unlock threshold, so an
    // overlevelled player still sees all three phases. See Enemy.maxHitFraction.
    this.maxHitFraction = BOSS_MAX_HIT_FRACTION;
    this.phaseGates = [PHASE2_HP, PHASE3_HP];
    this.setScale(DUNESHAPER_SCALE);

    const barX = cfg.x - POISE_BAR_W / 2;
    const barY = cfg.y - Enemy.BAR_OFFSET_Y + POISE_BAR_OFFSET_Y;
    this.poiseBarBg = scene.add.rectangle(barX, barY, POISE_BAR_W, POISE_BAR_H, 0x1a1030, 0.85).setOrigin(0, 0.5);
    this.poiseBarFill = scene.add.rectangle(barX, barY, POISE_BAR_W, POISE_BAR_H, 0xc79cf0, 1).setOrigin(0, 0.5);
    this.telegraphGfx = scene.add.graphics();
  }

  preUpdate(time: number, delta: number): void {
    super.preUpdate(time, delta);
    const barX = this.x - POISE_BAR_W / 2;
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
    // Scripted phase transition: hold everything, and pause the current state's
    // timer (stateEnteredAt) so a telegraph can't elapse behind the flash and
    // land with no wind-up to react to.
    if (this.isPhaseLocked()) {
      (this.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
      this.stateEnteredAt = now;
      return false;
    }
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
      // Initial aim; re-aimed each frame until LANCE_LOCK_FRAC (see updateTelegraphing).
      this.attackAngle = Phaser.Math.Angle.Between(this.x, this.y, playerX, playerY);
    } else if (attack === "spikes") {
      this.buildSpikesCross(playerX, playerY);
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
    const frac = this.currentStateDurationMs > 0 ? (now - this.stateEnteredAt) / this.currentStateDurationMs : 1;
    if (this.currentAttack === "lance") {
      // Track the player through the first LANCE_LOCK_FRAC of the wind-up, then
      // commit — so a full wind-up of free walking no longer pre-dodges the beam.
      if (frac < LANCE_LOCK_FRAC) this.attackAngle = Phaser.Math.Angle.Between(this.x, this.y, playerX, playerY);
      this.faceAngle(this.attackAngle);
    } else if (this.currentAttack === "spikes") {
      // Track the cross onto the player for the first half of the wind-up.
      if (frac < SPIKES_LOCK_FRAC) this.buildSpikesCross(playerX, playerY);
      this.applyFacing(playerX - this.x, playerY - this.y);
    } else {
      this.applyFacing(playerX - this.x, playerY - this.y);
    }
    this.drawTelegraph(now);
    if (now >= this.stateEnteredAt + this.currentStateDurationMs) this.beginExecute(now, playerX, playerY);
  }

  // The Sand Spikes CROSS: center on the player + 4 arms along the boss→player
  // axis and its perpendicular, so every cardinal escape is covered and only a
  // diagonal run / dash clears it.
  private buildSpikesCross(playerX: number, playerY: number): void {
    const axis = Phaser.Math.Angle.Between(this.x, this.y, playerX, playerY);
    const perp = axis + Math.PI / 2;
    const ax = Math.cos(axis) * SPIKES_SPREAD;
    const ay = Math.sin(axis) * SPIKES_SPREAD;
    const px = Math.cos(perp) * SPIKES_SPREAD;
    const py = Math.sin(perp) * SPIKES_SPREAD;
    this.zoneCircles = [
      { x: playerX, y: playerY },
      { x: playerX + ax, y: playerY + ay },
      { x: playerX - ax, y: playerY - ay },
      { x: playerX + px, y: playerY + py },
      { x: playerX - px, y: playerY - py },
    ];
  }

  // The lance's heading during the strike: the committed angle sweeps across
  // ±LANCE_SWEEP_HALF over the impact window, so a static sidestep gets caught.
  private lanceAngleAt(now: number): number {
    if (this.tyrantState !== "executing") return this.attackAngle;
    const frac = Phaser.Math.Clamp((now - this.stateEnteredAt) / Math.max(1, this.currentStateDurationMs), 0, 1);
    return this.attackAngle + (frac * 2 - 1) * LANCE_SWEEP_HALF;
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
      const a = this.lanceAngleAt(now);
      this.fillWedge(g, a, LANCE_HALF_ANGLE, LANCE_RANGE, 0xb060ff, 0.5 * flick);
      this.fillWedge(g, a, LANCE_HALF_ANGLE * 0.5, LANCE_RANGE, 0xffe0ff, 0.6 * flick);
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
      const angleDiff = Math.abs(Phaser.Math.Angle.Wrap(angleToPlayer - this.lanceAngleAt(this.scene.time.now)));
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
    if (this.isPhaseLocked()) return false; // hit was refused — no poise chip either
    if (this.tyrantState === "staggered") return false;
    // effectiveDamage, not raw: a capped hit must not break poise at full value.
    this.poise = Math.max(0, this.poise - this.effectiveDamage(damage));
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
