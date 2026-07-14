import Phaser from "phaser";
import type { IncomingDamageType } from "../systems/Weapons";

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
}

// Whatever spawns projectiles (currently just MainScene) implements this —
// lets Enemy subclasses call scene.spawnProjectile(...) without importing
// MainScene directly (would be a circular import: MainScene already imports
// entity classes).
export interface ProjectileHost {
  spawnProjectile(cfg: ProjectileConfig): Projectile;
}

export class Projectile extends Phaser.Physics.Arcade.Sprite {
  readonly damage: number;
  readonly sourceIsPlayer: boolean;
  readonly isCrit: boolean;
  readonly damageType?: IncomingDamageType;
  private readonly spawnX: number;
  private readonly spawnY: number;
  private readonly maxRangePx: number;
  private readonly velX: number;
  private readonly velY: number;

  constructor(scene: Phaser.Scene, cfg: ProjectileConfig) {
    super(scene, cfg.x, cfg.y, cfg.texture);
    this.damage = cfg.damage;
    this.sourceIsPlayer = cfg.sourceIsPlayer;
    this.isCrit = cfg.isCrit ?? false;
    this.damageType = cfg.damageType;
    this.spawnX = cfg.x;
    this.spawnY = cfg.y;
    this.maxRangePx = cfg.maxRangePx;
    this.velX = Math.cos(cfg.angle) * cfg.speed;
    this.velY = Math.sin(cfg.angle) * cfg.speed;
    scene.add.existing(this);
    scene.physics.add.existing(this);
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
    const traveled = Phaser.Math.Distance.Between(this.spawnX, this.spawnY, this.x, this.y);
    if (traveled >= this.maxRangePx) this.destroy();
  }
}
