import Phaser from "phaser";
import { Enemy } from "./Enemy";
import type { ProjectileConfig, ProjectileHost } from "./Projectile";

// Corpselight — the bayou's ONE ranged creature (biome 3 Phase 4b), and
// deliberately UNCOMMON. The roster is melee-core by design (locked), so this is
// the exception that makes the rest read as a choice: a drifting swamp-haunt
// that never closes, never melees, and fires slow HOMING gloam-orbs.
//
// The homing orb is the game's first tracking projectile (Projectile.homing), and
// it's a bounded, deliberate reversal of the anti-kite governor every other
// ranged attack respects. The bounds are what make it fair:
//   * SLOW (110 px/s — well under a walking player) and
//   * a LOW turn rate (1.5 rad/s), so lateral movement out-turns it and it
//     overshoots into a lazy arc, and
//   * a hard LIFETIME, so an overshot orb expires instead of orbiting forever.
// Standing still is what gets you hit. Its damage is `magic`, so it bypasses
// flat armor — bayou plate does not answer a Corpselight; footwork does.
//
// It also drops Hex Essence: the bayou's Gloamsteel tier is smelted with essence
// that until now only badlands Hexlings supplied, so hunting haunts is the local
// answer to "must I walk back to the badlands to forge bayou gear?".

type HauntMode = "idle" | "engaged";

const AGGRO_RADIUS = 260;
const DEAGGRO_RADIUS = 520;
const PREFERRED_RANGE = 210; // hovers around this — drifts out if crowded, in if too far
const DRIFT_SPEED = 40; // a slow, weightless float; it never sprints anywhere
const WANDER_SPEED = 14;
const WANDER_RADIUS = 90;

const MAX_HEALTH = 90;
const ORB_DAMAGE = 26; // magic — bypasses armor entirely, so this IS the net number
const ORB_SPEED = 110; // deliberately slow enough to walk away from
const ORB_TURN_RATE = 1.5; // rad/s — a wide, out-turnable arc
const ORB_LIFETIME_MS = 4200; // hard expiry (a curving orb never trips distance-despawn)
const ORB_MAX_RANGE = 900; // unused by the homing path, kept honest for the despawn contract
const CAST_COOLDOWN_MS = 2400;

export class Corpselight extends Enemy {
  private mode: HauntMode = "idle";
  private readonly spawnX: number;
  private readonly spawnY: number;
  private nextCastAt = 0;
  private wanderTgt: { x: number; y: number } | null = null;
  private nextRoamAt = 0;
  private readonly orbDamage: number;
  private bobPhase = 0;

  constructor(scene: Phaser.Scene, cfg: { x: number; y: number; elite?: boolean }) {
    const elite = cfg.elite ?? false;
    super(scene, {
      x: cfg.x,
      y: cfg.y,
      texture: elite ? "corpselight_elite" : "corpselight",
      displayName: elite ? "Elite Corpselight" : "Corpselight",
      loot: elite
        ? [{ resource: "hex_essence", min: 6, max: 8 }]
        : [{ resource: "hex_essence", min: 3, max: 5 }],
      maxHealth: elite ? Math.round(MAX_HEALTH * 1.5) : MAX_HEALTH,
      biteDamage: 0, // never melees — every point of its damage is an orb
      elite,
      eliteTrophy: "corpselight_trophy",
      // Physical types are NEUTRAL on purpose: the Hexling's old flat physical
      // resist made an armor-bypassing caster feel unkillable with a normal
      // weapon (playtest), and that lesson applies double to something that
      // drifts. It keeps only weaknesses — fire burns off a marsh-light, and
      // magic unravels it.
      resistances: { fire: 1.25, magic: 1.25 },
      upright: true, // a hovering wisp-shroud — mirror, never rotate
    });
    this.orbDamage = elite ? Math.round(ORB_DAMAGE * 1.5) : ORB_DAMAGE;
    this.spawnX = cfg.x;
    this.spawnY = cfg.y;
    if (elite) {
      this.speedMult = 1.1;
      this.setScale(1.3);
      this.baseScale = 1.3;
    }
  }

  update(delta: number, playerX: number, playerY: number, now: number): boolean {
    if (this.depleted) return false;
    const body = this.body as Phaser.Physics.Arcade.Body;
    const dist = Phaser.Math.Distance.Between(this.x, this.y, playerX, playerY);

    // A slow vertical bob so it reads as floating rather than walking. Purely
    // cosmetic (it rides rotation, not position, so it can't desync the body).
    this.bobPhase += delta * 0.0026;
    this.setRotation(Math.sin(this.bobPhase) * 0.09);

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

    // Hold a loose standoff: drift out if the player crowds it, in if they
    // retreat, otherwise hang still and cast. It has no escape ability (no
    // blink), so closing the gap really does beat it — the orbs are the price
    // of getting there.
    const spd = DRIFT_SPEED * this.speedMult * this.envSpeedMult;
    const toPlayer = Phaser.Math.Angle.Between(this.x, this.y, playerX, playerY);
    if (dist < PREFERRED_RANGE * 0.7) {
      body.setVelocity(-Math.cos(toPlayer) * spd, -Math.sin(toPlayer) * spd);
    } else if (dist > PREFERRED_RANGE * 1.25) {
      body.setVelocity(Math.cos(toPlayer) * spd, Math.sin(toPlayer) * spd);
    } else {
      body.setVelocity(0, 0);
    }
    if (Math.abs(playerX - this.x) > 3) this.setFlipX(playerX < this.x); // face the player without the tilt

    if (now >= this.nextCastAt) {
      this.castOrb(playerX, playerY, now);
      this.nextCastAt = now + CAST_COOLDOWN_MS;
    }
    return false;
  }

  private updateWander(body: Phaser.Physics.Arcade.Body, now: number): void {
    if (now >= this.nextRoamAt) {
      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const r = Phaser.Math.FloatBetween(0, WANDER_RADIUS);
      this.wanderTgt = { x: this.spawnX + Math.cos(angle) * r, y: this.spawnY + Math.sin(angle) * r };
      this.nextRoamAt = now + Phaser.Math.Between(2500, 5000);
    }
    if (!this.wanderTgt) return;
    const d = Phaser.Math.Distance.Between(this.x, this.y, this.wanderTgt.x, this.wanderTgt.y);
    if (d < 4) {
      body.setVelocity(0, 0);
      return;
    }
    const angle = Phaser.Math.Angle.Between(this.x, this.y, this.wanderTgt.x, this.wanderTgt.y);
    body.setVelocity(Math.cos(angle) * WANDER_SPEED, Math.sin(angle) * WANDER_SPEED);
    if (Math.abs(Math.cos(angle)) > 0.1) this.setFlipX(Math.cos(angle) < 0);
  }

  // One slow homing orb per cast. `target` is the live player sprite, so the orb
  // keeps re-aiming as you move — bounded by ORB_TURN_RATE, which is what makes
  // circle-strafing beat it.
  private castOrb(playerX: number, playerY: number, now: number): void {
    this.markAttackLanded(now);
    const scene = this.scene as unknown as ProjectileHost & { player: { x: number; y: number } };
    const cfg: ProjectileConfig = {
      x: this.x,
      y: this.y,
      angle: Phaser.Math.Angle.Between(this.x, this.y, playerX, playerY),
      speed: ORB_SPEED,
      damage: this.orbDamage,
      texture: "gloam_orb",
      maxRangePx: ORB_MAX_RANGE,
      sourceIsPlayer: false,
      damageType: "magic", // bypasses flat armor (Phase-1 hook)
      homing: { turnRateRadPerSec: ORB_TURN_RATE, target: scene.player },
      maxLifetimeMs: ORB_LIFETIME_MS,
    };
    scene.spawnProjectile(cfg);
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
}
