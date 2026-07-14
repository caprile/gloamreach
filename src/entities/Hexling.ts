import Phaser from "phaser";
import { Enemy } from "./Enemy";
import type { DamageType } from "../systems/Weapons";
import type { ProjectileConfig, ProjectileHost } from "./Projectile";

// Hexling — the badlands MAGE (biome 2 Phase 2). The first enemy to deal
// non-physical damage: its bolts + flame strike are `magic`, BYPASSING the
// player's flat armor (the Phase 1 hook in MainScene.applyDamageToPlayer). A
// deliberately COMPACT bespoke caster (NOT extending RangedGremlin) with its own
// private `mode`, so it overrides isAggro().
//
// Reworked per the user: it must FEEL like a mage, not "a reskinned gremlin that
// throws one rock." So:
//   * It STANDS AND CASTS — it does NOT kite/back-pedal. It only repositions via
//     its signature BLINK.
//   * Two attacks: a ranged HEX BOLT at distance, and a close-range FLAME STRIKE
//     (multiple delayed AoE fire circles that detonate after a short telegraph)
//     when the player closes in — then it blinks away to resume casting.
//   * A distinct taller, hooded/robed, staff-wielding silhouette (BootScene), not
//     the squat gremlin body.

const AGGRO_RADIUS = 170;
const DEAGGRO_RADIUS = 400;
const MAX_CAST_RANGE = 250; // farther than this → drift in to get in bolt range
const APPROACH_SPEED = 46; // slow walk to close into cast range (it does NOT kite away)
const WANDER_SPEED = 16;
const WANDER_RADIUS = 60;

const MAX_HEALTH = 95; // was 55, was 30 — playtest: badlands enemies died too fast even in Woods-tier gear; a stand-and-cast caster needs to actually survive being closed on to threaten its Flame Strike punish
// 22, not 14 — badlands-rebalance pass: magic bypasses armor entirely, so a
// Hexling's raw number IS the net damage. the user: "base hexlings should kill
// you in like 3 hits" — bolt + flame (below) are both bumped to make that true
// even at full HP/Vitality, not just against an unarmored player.
// Fired as a tight 3-bolt volley now (see castBolt), not a single shot — the
// per-bolt number came down from the old single-shot 26 so a stationary
// point-target hit by exactly one bolt (the common case) deals about the same
// as before; a player caught square in the cone can eat more than one.
const BOLT_DAMAGE = 16; // magic — bypasses armor, per bolt (was a single 26 pre-volley-rework)
const BOLT_COUNT = 3;
const BOLT_SPREAD = Phaser.Math.DegToRad(7); // tight cone-line (the user: "more cone-line", not a wide fan — cf. Duneshaper's 18° volley)
const CAST_COOLDOWN_MS = 1700;
const BOLT_SPEED = 210;
const BOLT_MAX_RANGE = 250;

// Flame Strike — the close-range punish. When the player closes to
// FLAME_TRIGGER the mage plants and calls down a cluster of fire circles at the
// player's LOCKED position (they don't track — walk out to dodge), which
// detonate after the telegraph, then it blinks away. This is what makes closing
// on a Hexling dangerous instead of a free kill.
const FLAME_TRIGGER = 150; // player within this (and flame ready) → flame strike
const FLAME_TELEGRAPH_MS = 820; // growing-circle tell (the dodge window)
const FLAME_IMPACT_MS = 240; // detonation window checkPlayerHit fires in
const FLAME_COOLDOWN_MS = 4600;
const FLAME_DAMAGE = 40; // magic, bypasses armor — the close-range punish, ~3-hit-kills a base player
const FLAME_RADIUS = 48; // each circle's damage radius
const FLAME_SPREAD = 62; // gap between the 3 clustered circles

// Blink — the mage's only repositioning. Used as a FALLBACK escape when cornered
// with flame on cooldown, and automatically at the end of every flame strike.
const BLINK_TRIGGER = 92; // cornered inside this (flame not ready) → blink out
const BLINK_DIST = 220;
// 5200 (was 2600): playtest — the Hexling "teleports too much" (S2). Roughly
// doubling the cooldown, plus gating the post-flame reposition blink on this
// same cooldown (see updateFlame), so it can't teleport after every flame on
// top of every corner. It now commits to standing and casting far more often.
const BLINK_COOLDOWN_MS = 5200;

type HexMode = "idle" | "engaged";
type FlameState = "none" | "telegraph" | "impact";

export class Hexling extends Enemy {
  private mode: HexMode = "idle";
  private readonly spawnX: number;
  private readonly spawnY: number;
  private nextCastAt = 0;
  private blinkReadyAt = 0;
  private wanderTgt: { x: number; y: number } | null = null;
  private nextRoamAt = 0;

  // Flame strike state.
  private flameState: FlameState = "none";
  private flameStartAt = 0;
  private flameReadyAt = 0;
  private flameHit = false;
  private flameCircles: { x: number; y: number }[] = [];
  private telegraphGfx: Phaser.GameObjects.Graphics;
  // Elite-scaled damage (the base BOLT/FLAME_DAMAGE consts were previously used
  // unscaled for elites too — every other elite gets +50% dmg, this closes the gap).
  private readonly boltDamage: number;
  private readonly flameDamage: number;

  constructor(scene: Phaser.Scene, cfg: { x: number; y: number; elite?: boolean }) {
    const elite = cfg.elite ?? false;
    super(scene, {
      x: cfg.x,
      y: cfg.y,
      texture: elite ? "hexling_elite" : "hexling",
      displayName: elite ? "Elite Hexling" : "Hexling",
      // Hex Essence is the ONLY smelting fuel (1 per ingot, both Sunsteel and
      // Embersteel) — building every base forged item (Forge Anvil unlock: 5 +
      // all 3 Sunsteel weapons: 10 + full Sunsteel heavy armor: 8 = 23 ingots,
      // i.e. 23 hex essence) shouldn't require looping the whole badlands ring
      // for it (playtest: "I shouldn't have to loop around the whole Badlands
      // just to get enough for base biome-2 stuff"). Base ~5/kill (avg of 4-6)
      // means clearing even a modest fraction of the ~22 Hexlings in half the
      // ring (44 total, spawn uniformly) clears the 23-target with real margin.
      loot: elite
        ? [{ resource: "hex_essence", min: 9, max: 11 }]
        : [{ resource: "hex_essence", min: 4, max: 6 }],
      maxHealth: elite ? Math.round(MAX_HEALTH * 1.5) : MAX_HEALTH,
      biteDamage: 0, // all damage flows through the bolt/flame paths, never a melee bite
      elite,
      eliteTrophy: "hexling_trophy",
      // NEUTRAL to physical now (playtest: the user — the flat 0.5 physical resist
      // made a caster that already bypasses armor + teleports feel un-killable with
      // a normal weapon). It keeps its two WEAKNESSES (they favor the player): weak
      // to magic (magic weapons are its counter) and weak to fire (S2 decision 3 —
      // the one badlands enemy fire is meant to be strong against). Physical types
      // are omitted → default 1.0.
      resistances: { magic: 1.5, fire: 1.5 },
      upright: true, // humanoid mage — mirror left/right, never rotate upside-down
    });
    this.boltDamage = elite ? Math.round(BOLT_DAMAGE * 1.5) : BOLT_DAMAGE;
    this.flameDamage = elite ? Math.round(FLAME_DAMAGE * 1.5) : FLAME_DAMAGE;
    this.spawnX = cfg.x;
    this.spawnY = cfg.y;
    this.telegraphGfx = scene.add.graphics();
    if (elite) {
      this.speedMult = 1.1;
      this.setScale(1.35);
      this.baseScale = 1.35;
    }
  }

  update(_delta: number, playerX: number, playerY: number, now: number): boolean {
    if (this.depleted) return false;
    const body = this.body as Phaser.Physics.Arcade.Body;

    // A flame strike, once started, plays out fully (planted) regardless of range.
    if (this.flameState !== "none") {
      this.updateFlame(playerX, playerY, now);
      return false;
    }

    const dist = Phaser.Math.Distance.Between(this.x, this.y, playerX, playerY);

    if (this.mode === "idle") {
      if (dist <= AGGRO_RADIUS && this.canAggro(dist, now)) {
        this.mode = "engaged";
        this.startPursuit(now);
      } else {
        this.updateWander(body, now);
        return false;
      }
    }

    if (dist > DEAGGRO_RADIUS && !this.withinAggroPersist(now)) {
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

    this.applyFacing(playerX - this.x, playerY - this.y); // always face the player

    // Player closed in → flame strike (the close-range punish), else blink out if
    // cornered with flame on cooldown so it's never simply run down and cornered.
    if (dist <= FLAME_TRIGGER && now >= this.flameReadyAt) {
      this.startFlame(playerX, playerY, now);
      return false;
    }
    if (dist <= BLINK_TRIGGER && now >= this.blinkReadyAt) {
      this.doBlink(playerX, playerY, now);
      return false;
    }

    // Otherwise: STAND AND CAST. Only drift inward if out of bolt range — it
    // never back-pedals away from the player (that kite feel was the whole
    // "just a gremlin" problem).
    const speedMult = this.speedMult * this.envSpeedMult;
    if (dist > MAX_CAST_RANGE) {
      const toward = Phaser.Math.Angle.Between(this.x, this.y, playerX, playerY);
      body.setVelocity(Math.cos(toward) * APPROACH_SPEED * speedMult, Math.sin(toward) * APPROACH_SPEED * speedMult);
    } else {
      body.setVelocity(0, 0);
      if (now >= this.nextCastAt) {
        this.castBolt(playerX, playerY, now);
        this.nextCastAt = now + CAST_COOLDOWN_MS;
      }
    }
    return false;
  }

  private updateWander(body: Phaser.Physics.Arcade.Body, now: number): void {
    if (now >= this.nextRoamAt) {
      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const r = Phaser.Math.FloatBetween(0, WANDER_RADIUS);
      this.wanderTgt = { x: this.spawnX + Math.cos(angle) * r, y: this.spawnY + Math.sin(angle) * r };
      this.nextRoamAt = now + Phaser.Math.Between(2000, 4000);
    }
    if (!this.wanderTgt) return;
    const d = Phaser.Math.Distance.Between(this.x, this.y, this.wanderTgt.x, this.wanderTgt.y);
    if (d < 4) {
      body.setVelocity(0, 0);
      return;
    }
    const angle = Phaser.Math.Angle.Between(this.x, this.y, this.wanderTgt.x, this.wanderTgt.y);
    body.setVelocity(Math.cos(angle) * WANDER_SPEED, Math.sin(angle) * WANDER_SPEED);
    this.applyFacing(Math.cos(angle), Math.sin(angle));
  }

  // --- Flame Strike ---------------------------------------------------------

  // Lock a cluster of 3 fire circles across the player's CURRENT position (one on
  // the player, two spread along the perpendicular of the mage→player axis, so a
  // sideways dodge is covered but retreating straight back escapes — a learnable
  // pattern). Planted; nothing tracks the player after this.
  private startFlame(playerX: number, playerY: number, now: number): void {
    this.flameState = "telegraph";
    this.flameStartAt = now;
    this.flameHit = false;
    (this.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
    const axis = Phaser.Math.Angle.Between(this.x, this.y, playerX, playerY);
    const perp = axis + Math.PI / 2;
    const ox = Math.cos(perp) * FLAME_SPREAD;
    const oy = Math.sin(perp) * FLAME_SPREAD;
    this.flameCircles = [
      { x: playerX, y: playerY },
      { x: playerX + ox, y: playerY + oy },
      { x: playerX - ox, y: playerY - oy },
    ];
    this.setTint(0xff8a3a); // ember charge tint while channeling
  }

  private updateFlame(playerX: number, playerY: number, now: number): void {
    (this.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
    this.applyFacing(playerX - this.x, playerY - this.y);
    const elapsed = now - this.flameStartAt;
    if (this.flameState === "telegraph") {
      this.drawFlameTelegraph(elapsed / FLAME_TELEGRAPH_MS);
      if (elapsed >= FLAME_TELEGRAPH_MS) {
        this.flameState = "impact";
        this.flameStartAt = now;
      }
      return;
    }
    // impact — the detonation; checkPlayerHit (queried by the scene this frame)
    // deals the magic damage. After the brief window, blink away and go on
    // cooldown so a flame strike always ends with the mage repositioning.
    this.drawFlameImpact();
    if (elapsed >= FLAME_IMPACT_MS) {
      this.flameState = "none";
      this.telegraphGfx.clear();
      this.flameReadyAt = now + FLAME_COOLDOWN_MS;
      this.applyHpTint();
      // Only reposition-blink if the blink is off cooldown (S2 anti-teleport):
      // otherwise it stays put and casts point-blank, rather than teleporting
      // away after every single flame strike.
      if (now >= this.blinkReadyAt) this.doBlink(playerX, playerY, now);
    }
  }

  private drawFlameTelegraph(frac01: number): void {
    const g = this.telegraphGfx;
    g.clear();
    g.setDepth(this.depth + 0.5);
    const f = Phaser.Math.Clamp(frac01, 0, 1);
    for (const c of this.flameCircles) {
      const r = FLAME_RADIUS * (0.5 + 0.5 * f);
      g.fillStyle(0xff5a1e, 0.1 + 0.28 * f);
      g.fillCircle(c.x, c.y, r);
      g.lineStyle(2, 0xffb43a, 0.55 + 0.35 * f);
      g.strokeCircle(c.x, c.y, FLAME_RADIUS);
    }
  }

  private drawFlameImpact(): void {
    const g = this.telegraphGfx;
    g.clear();
    g.setDepth(this.depth + 0.5);
    for (const c of this.flameCircles) {
      g.fillStyle(0xffd23a, 0.85);
      g.fillCircle(c.x, c.y, FLAME_RADIUS * 0.55);
      g.fillStyle(0xff5a1e, 0.5);
      g.fillCircle(c.x, c.y, FLAME_RADIUS);
    }
  }

  // Queried each frame by MainScene.updateEnemies() (like the bosses) — the flame
  // strike is area damage, and it's `magic` so it bypasses the player's flat
  // armor (Phase 1 hook). One hit per cast.
  checkPlayerHit(playerX: number, playerY: number): { damage: number; dmgType?: DamageType } | null {
    if (this.flameState !== "impact" || this.flameHit) return null;
    for (const c of this.flameCircles) {
      if (Phaser.Math.Distance.Between(c.x, c.y, playerX, playerY) <= FLAME_RADIUS) {
        this.flameHit = true;
        return { damage: this.flameDamage, dmgType: "magic" };
      }
    }
    return null;
  }

  // --- Blink ----------------------------------------------------------------

  private doBlink(playerX: number, playerY: number, now: number): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    const ghost = this.scene.add.image(this.x, this.y, this.texture.key).setAlpha(0.55).setDepth(this.depth);
    ghost.setScale(this.baseScale);
    ghost.setTint(0x9a5ee8);
    this.scene.tweens.add({
      targets: ghost,
      alpha: 0,
      scaleX: this.baseScale * 0.4,
      scaleY: this.baseScale * 0.4,
      duration: 220,
      ease: "Quad.easeOut",
      onComplete: () => ghost.destroy(),
    });
    const away = Phaser.Math.Angle.Between(playerX, playerY, this.x, this.y) + Phaser.Math.FloatBetween(-0.7, 0.7);
    const nx = playerX + Math.cos(away) * BLINK_DIST;
    const ny = playerY + Math.sin(away) * BLINK_DIST;
    this.x = nx;
    this.y = ny;
    body.reset(nx, ny);
    this.setAlpha(0.2);
    this.scene.tweens.add({ targets: this, alpha: 1, duration: 180, ease: "Quad.easeIn" });
    this.applyFacing(playerX - nx, playerY - ny);
    this.blinkReadyAt = now + BLINK_COOLDOWN_MS;
    this.nextCastAt = Math.max(this.nextCastAt, now + 250); // brief beat before casting again
  }

  // Tight 3-bolt cone (the user), each bolt its own projectile — self-resolving
  // like the Duneshaper's Gloam Volley. MIXED damage now (playtest): the CENTER
  // bolt is FIRE (bypasses armor — the shot you must actually dodge), the two
  // OUTER bolts are PHYSICAL (undefined type → the player's flat armor reduces
  // them), so armor is worth wearing against a Hexling instead of being fully
  // negated by an all-magic volley.
  private castBolt(playerX: number, playerY: number, now: number): void {
    this.markAttackLanded(now);
    const baseAngle = Phaser.Math.Angle.Between(this.x, this.y, playerX, playerY);
    const middle = (BOLT_COUNT - 1) / 2; // index 1 for BOLT_COUNT=3
    for (let i = 0; i < BOLT_COUNT; i++) {
      const offset = (i - middle) * BOLT_SPREAD;
      const isCenter = i === middle;
      const cfg: ProjectileConfig = {
        x: this.x,
        y: this.y,
        angle: baseAngle + offset,
        speed: BOLT_SPEED,
        damage: this.boltDamage,
        texture: isCenter ? "hex_bolt" : "hex_bolt_phys",
        maxRangePx: BOLT_MAX_RANGE,
        sourceIsPlayer: false,
        // Center = fire (armor-bypassing); outer = physical (undefined → armor applies).
        damageType: isCenter ? "fire" : undefined,
      };
      (this.scene as unknown as ProjectileHost).spawnProjectile(cfg);
    }
  }

  takeHit(damage: number): boolean {
    const depleted = super.takeHit(damage);
    if (!depleted && this.mode === "idle") {
      this.mode = "engaged";
      this.startPursuit(this.scene.time.now);
    }
    return depleted;
  }

  isAggro(): boolean {
    return this.mode !== "idle";
  }

  // Tear down the telegraph Graphics with the sprite (it's a separate GameObject,
  // not destroyed by the base fade).
  playDeathFeedback(onComplete: () => void): void {
    this.telegraphGfx.clear();
    this.telegraphGfx.destroy();
    super.playDeathFeedback(onComplete);
  }
}
