import Phaser from "phaser";
import type { IncomingDamageType } from "../systems/Weapons";
import { artScale, placeholderDims } from "../art/overrides";

// Generic reusable projectile — first ranged-attack primitive in the game
// (Gremlin's rock throw). Not Gremlin-specific: the Slingshot is expected to
// reuse this same class/spawn path via MainScene.spawnProjectile() once it
// exists (see the first-biome content plan's Milestone C).
export interface ProjectileConfig {
  x: number;
  y: number;
  angle: number; // radians
  speed: number; // px/s
  damage: number;
  texture: string;
  maxRangePx: number;
  sourceIsPlayer: boolean; // who fired it — not yet used to pick a group (only enemy-sourced projectiles exist so far), but part of describing a projectile regardless of source
  isCrit?: boolean; // player ranged crit (M-SS) — rolled at fire time, carried so the impact damage number tints
  // Damage type carried to the hit resolver (Biome 2 Phase 2). Absent = physical:
  // an enemy projectile with no type subtracts the player's flat armor as usual;
  // "magic"/"fire" (Hexling bolts) bypass that armor term in applyDamageToPlayer;
  // an undefined type is physical (armor applies). Player projectiles resolve as
  // their weapon's "ranged" type in the enemy overlap and don't read this field.
  damageType?: IncomingDamageType;
  // Extra rotation (radians) added to the travel angle when orienting the
  // sprite — for a texture whose "forward" isn't +x. The javelin art points UP
  // (-y), so it needs +90° to point along its flight; symmetric art (pellets)
  // leaves this 0.
  artAngleOffset?: number;
  // Homing (biome 3 — the Corpselight's gloam orb, the game's first tracking
  // projectile). Deliberately a BOUNDED reversal of the anti-kite governor: the
  // turn rate is low enough that a moving player out-turns it, so it punishes
  // standing still, not movement. `target` is a live ref (the player sprite) —
  // read each frame, so it keeps tracking as the player moves.
  homing?: { turnRateRadPerSec: number; target: { x: number; y: number } };
  // Time-based despawn. Required for a homing projectile: the default despawn
  // measures straight-line distance FROM SPAWN, which a curving orb may never
  // exceed (it would orbit forever). Straight shots leave this unset and keep
  // the distance rule, which is what makes per-weapon range honest.
  maxLifetimeMs?: number;
  // The enemy that fired this, notified when it actually connects. Structural
  // rather than an `Enemy` import (Enemy imports this module — a named type
  // would be a cycle). Only a LANDED shot resets a ranged enemy's give-up clock;
  // see Enemy.markAttackAttempted for why firing alone must not.
  sourceEnemy?: { onProjectileHitPlayer(now: number): void; displayName: string };
}

// Miss rule for homing projectiles (see preUpdate). "Came close" is generous
// enough that a dodge at any reasonable range counts, and the fizzle is short
// enough that a dodged orb is gone before it becomes a second threat.
const MISS_NEAR_PX = 150; // how close it must have gotten for a miss to count
const MISS_MARGIN_PX = 20; // how far back past that it must drift to be "missed"
const MISS_FIZZLE_MS = 300; // straight-line grace after giving up

// Whatever spawns projectiles (currently just MainScene) implements this —
// lets Enemy subclasses call scene.spawnProjectile(...) without importing
// MainScene directly (would be a circular import: MainScene already imports
// entity classes).
export interface ProjectileHost {
  spawnProjectile(cfg: ProjectileConfig): Projectile;
}

export class Projectile extends Phaser.Physics.Arcade.Sprite {
  // How much bigger than its placeholder footprint real projectile art is
  // drawn. Visual only — the collision body stays pinned to the placeholder.
  private static readonly PROJECTILE_ART_SCALE = 1.8;
  readonly damage: number;
  readonly sourceIsPlayer: boolean;
  readonly isCrit: boolean;
  readonly damageType?: IncomingDamageType;
  readonly sourceEnemy?: { onProjectileHitPlayer(now: number): void; displayName: string };
  private readonly spawnX: number;
  private readonly spawnY: number;
  private readonly maxRangePx: number;
  private readonly velX: number;
  private readonly velY: number;
  private readonly speed: number;
  private homing?: { turnRateRadPerSec: number; target: { x: number; y: number } };
  private readonly maxLifetimeMs?: number;
  private readonly artAngleOffset: number;
  private spawnedAt = -1;
  // Closest the orb has ever come to its target, and when it gave up. See the
  // miss rule in preUpdate.
  private closestDist = Number.POSITIVE_INFINITY;
  private missExpireAt = -1;

  constructor(scene: Phaser.Scene, cfg: ProjectileConfig) {
    super(scene, cfg.x, cfg.y, cfg.texture);
    // Projectiles are the smallest sprites in the game (a gremlin rock is 6x6)
    // and PixelLab's canvas floor is 32px, so real art arrives five times
    // oversized. It's pulled back to the placeholder's footprint — but not all
    // the way: 6px was hard to pick out even against flat ground, and once the
    // ground carried real texture an incoming rock could vanish into it. Art is
    // drawn at PROJECTILE_ART_SCALE of the old footprint so the threat reads,
    // while the COLLISION body stays pinned to the placeholder size below, so
    // nothing about hit behaviour changes — the same footprint-pinning rule the
    // creature roster follows, and a projectile that looks slightly bigger than
    // it hits is forgiving rather than unfair.
    //
    // Integer scaling doesn't apply here the way it does to icons: every
    // projectile is drawn rotated to its travel angle, so it is already
    // resampled off the pixel grid.
    //
    // Note artAngleOffset below: replacement art must keep the placeholder's
    // facing.
    const pinned = artScale(scene, cfg.texture);
    this.setScale(pinned === 1 ? 1 : pinned * Projectile.PROJECTILE_ART_SCALE);
    this.damage = cfg.damage;
    this.sourceIsPlayer = cfg.sourceIsPlayer;
    this.isCrit = cfg.isCrit ?? false;
    this.damageType = cfg.damageType;
    this.sourceEnemy = cfg.sourceEnemy;
    this.spawnX = cfg.x;
    this.spawnY = cfg.y;
    this.maxRangePx = cfg.maxRangePx;
    this.velX = Math.cos(cfg.angle) * cfg.speed;
    this.velY = Math.sin(cfg.angle) * cfg.speed;
    this.speed = cfg.speed;
    this.homing = cfg.homing;
    this.maxLifetimeMs = cfg.maxLifetimeMs;
    this.artAngleOffset = cfg.artAngleOffset ?? 0;
    scene.add.existing(this);
    scene.physics.add.existing(this);
    // Pin the body to the placeholder footprint. The Arcade body is sized from
    // the display size at creation, so without this the art-legibility scale
    // above would silently widen every projectile's hitbox.
    const was = placeholderDims(cfg.texture);
    if (was) {
      const body = this.body as Phaser.Physics.Arcade.Body;
      // setSize takes UNSCALED units — Arcade multiplies by the sprite's scale —
      // so dividing it back out is what makes the body land on the placeholder's
      // real pixel size rather than a fraction of it.
      body.setSize(was.w / this.scaleX, was.h / this.scaleY, true);
    }
    this.setRotation(cfg.angle + (cfg.artAngleOffset ?? 0));
  }

  // Arcade Groups overwrite a freshly-enabled body's velocity with their own
  // (zeroed) defaults the moment a member is add()-ed — setting velocity in
  // the constructor is silently clobbered once MainScene.spawnProjectile()
  // adds this to enemyProjectiles. Called by the spawner immediately after
  // that add() instead.
  launch(): void {
    (this.body as Phaser.Physics.Arcade.Body).setVelocity(this.velX, this.velY);
  }

  // Distance-based despawn (not a fixed timer) — speed varies per weapon, so
  // a timer would give faster projectiles more effective range than intended.
  preUpdate(time: number, delta: number): void {
    super.preUpdate(time, delta);
    if (this.spawnedAt < 0) this.spawnedAt = time;
    if (this.homing) {
      // MISS RULE (the user playtest: "if they miss you, it should just
      // disappear"). A bounded-turn orb that overshoots would otherwise loop
      // back and chase for its whole lifetime, which reads as unfair rather
      // than dodgeable. Once it has actually come close and is now moving away
      // again, the dodge SUCCEEDED: it stops tracking and fizzles shortly after.
      const dist = Phaser.Math.Distance.Between(this.x, this.y, this.homing.target.x, this.homing.target.y);
      this.closestDist = Math.min(this.closestDist, dist);
      if (this.closestDist <= MISS_NEAR_PX && dist > this.closestDist + MISS_MARGIN_PX) {
        this.homing = undefined;
        this.missExpireAt = time + MISS_FIZZLE_MS;
      } else {
        this.steerToward(delta);
        // A homing orb despawns on its lifetime, not on distance-from-spawn (see
        // maxLifetimeMs) — the curve means it can circle inside maxRangePx forever.
        if (this.maxLifetimeMs !== undefined && time - this.spawnedAt >= this.maxLifetimeMs) this.destroy();
        return;
      }
    }
    // A missed orb flies straight for a beat, then fizzles — it can still clip
    // someone who walks into it, it just stops hunting.
    if (this.missExpireAt >= 0 && time >= this.missExpireAt) {
      this.destroy();
      return;
    }
    const traveled = Phaser.Math.Distance.Between(this.spawnX, this.spawnY, this.x, this.y);
    if (traveled >= this.maxRangePx) this.destroy();
    if (this.maxLifetimeMs !== undefined && time - this.spawnedAt >= this.maxLifetimeMs) this.destroy();
  }

  // Rotate the current velocity toward the target by at most turnRate·dt this
  // frame (speed is preserved) — a bounded turn, so a player who keeps moving
  // laterally can out-turn it and make it overshoot.
  private steerToward(delta: number): void {
    const body = this.body as Phaser.Physics.Arcade.Body | undefined;
    if (!body || !this.homing) return;
    const current = Math.atan2(body.velocity.y, body.velocity.x);
    const desired = Phaser.Math.Angle.Between(this.x, this.y, this.homing.target.x, this.homing.target.y);
    const maxTurn = this.homing.turnRateRadPerSec * (delta / 1000);
    const next = current + Phaser.Math.Clamp(Phaser.Math.Angle.Wrap(desired - current), -maxTurn, maxTurn);
    body.setVelocity(Math.cos(next) * this.speed, Math.sin(next) * this.speed);
    this.setRotation(next + this.artAngleOffset);
  }
}
