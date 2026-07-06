import Phaser from "phaser";

export type EnemyState = "idle" | "chasing";

const AGGRO_RADIUS = 140; // px — player enters this range, Boar starts chasing
const DEAGGRO_RADIUS = 200; // px — larger than aggro; avoids boundary flicker
const CHASE_SPEED = 60; // px/s — slower than player base (95), so it's escapable
const WANDER_SPEED = 20; // px/s idle wander
const MELEE_RANGE = 28; // px — how close the Boar must be to bite
const BITE_DAMAGE = 8;
const BITE_COOLDOWN_MS = 1000;
const MAX_HEALTH = 20;

export interface EnemyConfig {
  x: number;
  y: number;
  texture: string;
  displayName: string;
}

// A simple melee enemy (currently only "Boar"). Ranged attacks, ambush AI,
// charge, and fear-of-fire are all deliberately out of scope for this pass —
// see CLAUDE.md's "First biome — content notes" for the fuller roster.
export class Enemy extends Phaser.Physics.Arcade.Sprite {
  readonly displayName: string;
  readonly maxHealth = MAX_HEALTH;
  health = MAX_HEALTH;
  depleted = false;
  state: EnemyState = "idle";
  private lastBiteAt = -Infinity;
  private wanderTarget: { x: number; y: number } | null = null;
  private nextWanderAt = 0;

  // Thin world-space HP bar (no number, just a bar) — separate GameObjects
  // rather than a Container, gone glued to position every frame via
  // preUpdate, matching ResourceNode's count-label tracking convention.
  private healthBarBg: Phaser.GameObjects.Rectangle;
  private healthBarFill: Phaser.GameObjects.Rectangle;
  private static readonly BAR_W = 22;
  private static readonly BAR_H = 3;
  private static readonly BAR_OFFSET_Y = 16; // px above the sprite's center

  constructor(scene: Phaser.Scene, cfg: EnemyConfig) {
    super(scene, cfg.x, cfg.y, cfg.texture);
    this.displayName = cfg.displayName;
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setDepth(9); // just under the player (10)

    const barX = cfg.x - Enemy.BAR_W / 2;
    const barY = cfg.y - Enemy.BAR_OFFSET_Y;
    this.healthBarBg = scene.add
      .rectangle(barX, barY, Enemy.BAR_W, Enemy.BAR_H, 0x1a1f2a, 0.85)
      .setOrigin(0, 0.5)
      .setDepth(9);
    this.healthBarFill = scene.add
      .rectangle(barX, barY, Enemy.BAR_W, Enemy.BAR_H, 0xd02020, 1)
      .setOrigin(0, 0.5)
      .setDepth(9);
  }

  // Keeps the HP bar glued to the sprite (and its fill in sync with current
  // health) every frame, independent of MainScene's own update() cadence —
  // same reasoning as ResourceNode's count-label preUpdate override.
  preUpdate(time: number, delta: number): void {
    super.preUpdate(time, delta);
    const barX = this.x - Enemy.BAR_W / 2;
    const barY = this.y - Enemy.BAR_OFFSET_Y;
    this.healthBarBg.setPosition(barX, barY);
    this.healthBarFill.setPosition(barX, barY);
    this.healthBarFill.setScale(Math.max(0, this.health / this.maxHealth), 1);
  }

  get biteDamage(): number {
    return BITE_DAMAGE;
  }

  // Called every frame from MainScene.updateEnemies(). Returns true if a
  // bite lands this frame — caller applies damage to Health so Enemy doesn't
  // need to know about Player/Health directly.
  update(delta: number, playerX: number, playerY: number, now: number): boolean {
    if (this.depleted) return false;
    const body = this.body as Phaser.Physics.Arcade.Body;
    const dist = Phaser.Math.Distance.Between(this.x, this.y, playerX, playerY);

    if (this.state === "idle" && dist <= AGGRO_RADIUS) this.state = "chasing";
    else if (this.state === "chasing" && dist > DEAGGRO_RADIUS) this.state = "idle";

    if (this.state === "chasing") {
      if (dist <= MELEE_RANGE) {
        body.setVelocity(0, 0);
        if (now - this.lastBiteAt >= BITE_COOLDOWN_MS) {
          this.lastBiteAt = now;
          return true; // bite lands
        }
        return false;
      }
      const angle = Phaser.Math.Angle.Between(this.x, this.y, playerX, playerY);
      body.setVelocity(Math.cos(angle) * CHASE_SPEED, Math.sin(angle) * CHASE_SPEED);
      return false;
    }

    // Idle wander: pick a small nearby target periodically, drift toward it.
    if (now >= this.nextWanderAt) {
      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const d2 = Phaser.Math.Between(20, 50);
      this.wanderTarget = { x: this.x + Math.cos(angle) * d2, y: this.y + Math.sin(angle) * d2 };
      this.nextWanderAt = now + Phaser.Math.Between(2000, 4000);
    }
    if (this.wanderTarget) {
      const d = Phaser.Math.Distance.Between(this.x, this.y, this.wanderTarget.x, this.wanderTarget.y);
      if (d < 4) {
        body.setVelocity(0, 0);
      } else {
        const angle = Phaser.Math.Angle.Between(this.x, this.y, this.wanderTarget.x, this.wanderTarget.y);
        body.setVelocity(Math.cos(angle) * WANDER_SPEED, Math.sin(angle) * WANDER_SPEED);
      }
    }
    return false;
  }

  // Same shape/feel as ResourceNode.takeHit: apply damage + feedback, return
  // true once depleted so the caller awards loot and destroys.
  takeHit(damage: number): boolean {
    this.health = Math.max(0, this.health - damage);
    this.playHitFeedback();
    return this.health <= 0;
  }

  private playHitFeedback(): void {
    this.scene.tweens.killTweensOf(this);
    const baseX = this.x;
    this.scene.tweens.add({
      targets: this,
      x: baseX + 4,
      duration: 60,
      yoyo: true,
      repeat: 1,
      ease: "Sine.easeInOut",
      onComplete: () => {
        this.x = baseX;
      },
    });
    const frac = this.health / this.maxHealth;
    const shade = Phaser.Display.Color.Interpolate.ColorWithColor(
      new Phaser.Display.Color(255, 255, 255),
      new Phaser.Display.Color(140, 20, 20),
      100,
      Math.round((1 - frac) * 100),
    );
    this.setTint(Phaser.Display.Color.GetColor(shade.r, shade.g, shade.b));
  }

  // Death feedback (fade), then the caller destroys/removes from tracking
  // and spawns loot. Kept out of takeHit so MainScene can read x/y for the
  // loot drop before anything moves/destructs.
  playDeathFeedback(onComplete: () => void): void {
    this.depleted = true;
    (this.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
    this.scene.tweens.killTweensOf(this);
    this.healthBarBg.destroy();
    this.healthBarFill.destroy();
    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      duration: 300,
      ease: "Sine.easeIn",
      onComplete: () => {
        this.destroy();
        onComplete();
      },
    });
  }
}
