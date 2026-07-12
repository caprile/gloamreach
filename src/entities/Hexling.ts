import Phaser from "phaser";
import { Enemy } from "./Enemy";
import type { ProjectileConfig, ProjectileHost } from "./Projectile";

// Hexling — the badlands magical gremlin variant (biome 2 Phase 2). The first
// enemy to deal NON-PHYSICAL damage to the player: it casts a `magic` bolt that
// BYPASSES the player's flat armor (the dormant Phase 1 hook in
// MainScene.applyDamageToPlayer goes live here). A deliberately COMPACT
// stand-and-cast kiter — NOT extending RangedGremlin (its burst/hold-band
// machinery is more than this needs, and coupling would drag its gremlin
// texture/loot along). Own private `mode`, so it overrides isAggro() exactly as
// RangedGremlin does. It purely kites + casts (no melee claw); if cornered it
// keeps trying to back off and cast rather than fighting hand-to-hand.

const AGGRO_RADIUS = 150;
const DEAGGRO_RADIUS = 380;
const MIN_KITE_DIST = 150; // closer than this → back away
const MAX_CAST_RANGE = 240; // farther than this → approach to get in range
const KITE_SPEED = 62; // back-pedal speed when the player closes
const PURSUE_SPEED = 52; // close-the-gap speed when out of range
const WANDER_SPEED = 18;
const WANDER_RADIUS = 70;

const MAX_HEALTH = 30;
const BOLT_DAMAGE = 14; // kept modest because it ignores armor
const CAST_COOLDOWN_MS = 2000;
const BOLT_SPEED = 200;
const BOLT_MAX_RANGE = 240;

// Blink — the Hexling's signature magical evade. When the player closes inside
// BLINK_TRIGGER it teleports to BLINK_DIST away (roughly back to kiting range)
// instead of just back-pedalling, so it can't be simply run down and cornered.
// A short cooldown keeps it from being un-catchable. Builds a distinct "chase the
// caster" identity on top of the kite base.
const BLINK_TRIGGER = 96;
const BLINK_DIST = 215;
const BLINK_COOLDOWN_MS = 3600;

type HexMode = "idle" | "engaged";

export class Hexling extends Enemy {
  private mode: HexMode = "idle";
  private readonly spawnX: number;
  private readonly spawnY: number;
  private nextCastAt = 0;
  private blinkReadyAt = 0;
  private wanderTgt: { x: number; y: number } | null = null;
  private nextRoamAt = 0;

  constructor(scene: Phaser.Scene, cfg: { x: number; y: number; elite?: boolean }) {
    const elite = cfg.elite ?? false;
    super(scene, {
      x: cfg.x,
      y: cfg.y,
      texture: elite ? "hexling_elite" : "hexling",
      displayName: elite ? "Elite Hexling" : "Hexling",
      loot: elite
        ? [{ resource: "hex_essence", min: 2, max: 2 }]
        : [{ resource: "hex_essence", min: 1, max: 1 }],
      maxHealth: elite ? Math.round(MAX_HEALTH * 1.5) : MAX_HEALTH,
      biteDamage: elite ? Math.round(BOLT_DAMAGE * 1.5) : BOLT_DAMAGE, // unused (never returns a melee hit) — kept for consistency
      elite,
      eliteTrophy: "hexling_trophy",
      // "Resists magic, weak to physical" — all three melee types shred it,
      // its own element barely dents it. ranged left neutral.
      resistances: { magic: 0.4, slash: 1.4, blunt: 1.4, pierce: 1.4 },
    });
    this.spawnX = cfg.x;
    this.spawnY = cfg.y;
    if (elite) {
      this.speedMult = 1.1;
      this.setScale(1.4);
      this.baseScale = 1.4;
    }
  }

  update(_delta: number, playerX: number, playerY: number, now: number): boolean {
    if (this.depleted) return false;
    const body = this.body as Phaser.Physics.Arcade.Body;
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

    if (dist > DEAGGRO_RADIUS) {
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

    // Blink out when cornered (its signature evade) — teleports back to kiting
    // range rather than being run down. Takes priority over the kite/cast logic.
    if (dist < BLINK_TRIGGER && now >= this.blinkReadyAt) {
      this.doBlink(playerX, playerY, now);
      return false;
    }

    // Kite band: too close → back away, too far → approach, in-band → plant and
    // cast. Always faces the player. A single bolt per cooldown (no bursts).
    const speedMult = this.speedMult * this.envSpeedMult;
    if (dist < MIN_KITE_DIST) {
      const away = Phaser.Math.Angle.Between(playerX, playerY, this.x, this.y);
      body.setVelocity(Math.cos(away) * KITE_SPEED * speedMult, Math.sin(away) * KITE_SPEED * speedMult);
      this.applyFacing(playerX - this.x, playerY - this.y); // face the player even while retreating
    } else if (dist > MAX_CAST_RANGE) {
      const toward = Phaser.Math.Angle.Between(this.x, this.y, playerX, playerY);
      body.setVelocity(Math.cos(toward) * PURSUE_SPEED * speedMult, Math.sin(toward) * PURSUE_SPEED * speedMult);
      this.applyFacing(Math.cos(toward), Math.sin(toward));
    } else {
      body.setVelocity(0, 0);
      this.applyFacing(playerX - this.x, playerY - this.y);
    }

    // Cast whenever in range and off cooldown — even while kiting in close, so a
    // player who corners it still eats bolts (it just keeps backing off between).
    if (dist <= BOLT_MAX_RANGE && now >= this.nextCastAt) {
      this.castBolt(playerX, playerY, now);
      this.nextCastAt = now + CAST_COOLDOWN_MS;
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

  // Teleport to BLINK_DIST away from the player (roughly directly away, with a
  // little jitter so it's not perfectly predictable), leaving a fading violet
  // ghost at the old spot + popping in at the new one. A brief post-blink cast
  // delay stops it from instantly bolting the frame it reappears.
  private doBlink(playerX: number, playerY: number, now: number): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    // fading ghost at the current position (finite tween, self-destructs)
    const ghost = this.scene.add.image(this.x, this.y, this.texture.key).setAlpha(0.55).setDepth(this.depth);
    ghost.setTint(0x9a5ee8);
    this.scene.tweens.add({
      targets: ghost,
      alpha: 0,
      scaleX: 0.4,
      scaleY: 0.4,
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
    // pop-in at the new spot
    this.setAlpha(0.2);
    this.scene.tweens.add({ targets: this, alpha: 1, duration: 180, ease: "Quad.easeIn" });
    this.applyFacing(playerX - nx, playerY - ny);
    this.blinkReadyAt = now + BLINK_COOLDOWN_MS;
    this.nextCastAt = Math.max(this.nextCastAt, now + 300); // brief beat before casting again
  }

  private castBolt(playerX: number, playerY: number, now: number): void {
    this.markAttackLanded(now); // a landed cast resets the give-up clock, like a Gremlin shot
    const angle = Phaser.Math.Angle.Between(this.x, this.y, playerX, playerY);
    const cfg: ProjectileConfig = {
      x: this.x,
      y: this.y,
      angle,
      speed: BOLT_SPEED,
      damage: BOLT_DAMAGE,
      texture: "hex_bolt",
      maxRangePx: BOLT_MAX_RANGE,
      sourceIsPlayer: false,
      damageType: "magic", // bypasses the player's flat armor (Phase 1 hook)
    };
    (this.scene as unknown as ProjectileHost).spawnProjectile(cfg);
  }

  // Getting hit while idle snaps it into the fight (RangedGremlin precedent —
  // keyed off `mode`, not the shared `state` field).
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
}
