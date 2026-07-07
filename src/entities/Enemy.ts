import Phaser from "phaser";
import type { ResourceType } from "../systems/Inventory";

export type EnemyState = "idle" | "chasing";

const AGGRO_RADIUS = 105; // px — player enters this range, Boar starts chasing (Milestone B: tuned down from 140, "too aggressive" playtest flag)
const DEAGGRO_RADIUS = 190; // wider gap than AGGRO_RADIUS to avoid boundary flicker (kept ~2x aggro, same ratio as before)
const CHASE_SPEED = 60; // px/s — slower than player base (95), so it's escapable
const WANDER_SPEED = 20; // px/s idle wander
const MELEE_RANGE = 28; // px — how close the Boar must be to bite
const BITE_COOLDOWN_MS = 1000;

// Default "give up eventually" behavior for any non-boss enemy (user
// decision, see STATUS.md/memory): if 30s of continuous pursuit passes
// without landing a single attack — obstacles, a kiting player, whatever the
// cause — back off instead of pursuing forever. The give-up is intentionally
// distinct from the ordinary distance-based deaggro above (target simply
// left aggro range, which re-triggers instantly on return): this one also
// grants a short window where normal proximity won't re-trigger aggro,
// unless the player gets right up close or actually attacks it. These live
// on the base class (not Boar-specific constants) since the mechanism itself
// is meant to be a shared default future enemies opt into, even though each
// enemy still tunes its own aggro/deaggro *radius* per the standing
// "don't share one config table" decision.
const CHASE_GIVEUP_MS = 30000;
const POST_GIVEUP_IMMUNITY_MS = 5000;
const CLOSE_REAGGRO_RADIUS = 50; // px — overrides the immunity window even before it expires

// One independently-rolled drop entry. Most enemies (Boar, Snake) have a
// single entry; the ranged Gremlin variant drops two (skin + blood) — see
// EnemyConfig.loot below, which is why this is an array rather than a single
// resource/min/max triple.
export interface LootEntry {
  resource: ResourceType;
  min: number;
  max: number;
}

export interface EnemyConfig {
  x: number;
  y: number;
  texture: string;
  displayName: string;
  loot: LootEntry[];
  maxHealth: number;
  biteDamage: number;
}

// A simple melee enemy (currently only "Boar"). Ranged attacks, ambush AI,
// charge, and fear-of-fire are all deliberately out of scope for this pass —
// see CLAUDE.md's "First biome — content notes" for the fuller roster.
export class Enemy extends Phaser.Physics.Arcade.Sprite {
  readonly displayName: string;
  private readonly loot: LootEntry[];
  private readonly biteDamageValue: number;
  readonly maxHealth: number;
  health: number;
  depleted = false;
  state: EnemyState = "idle";
  private lastBiteAt = -Infinity;
  private wanderTarget: { x: number; y: number } | null = null;
  private nextWanderAt = 0;
  // Give-up/immunity state (see CHASE_GIVEUP_MS etc. above) — protected so a
  // future subclass overriding update() entirely can still reuse the same
  // clock/helpers below rather than reimplementing the mechanism.
  protected pursuitClockStart = 0;
  protected aggroImmuneUntil = 0;

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
    this.loot = cfg.loot;
    this.maxHealth = cfg.maxHealth;
    this.health = cfg.maxHealth;
    this.biteDamageValue = cfg.biteDamage;
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setCollideWorldBounds(true); // matches Player — without this, chase/flee/kite AI can walk enemies off the map
    this.setDepth(cfg.y); // Y-sorted against the player/trees, see preUpdate

    const barX = cfg.x - Enemy.BAR_W / 2;
    const barY = cfg.y - Enemy.BAR_OFFSET_Y;
    this.healthBarBg = scene.add
      .rectangle(barX, barY, Enemy.BAR_W, Enemy.BAR_H, 0x1a1f2a, 0.85)
      .setOrigin(0, 0.5);
    this.healthBarFill = scene.add
      .rectangle(barX, barY, Enemy.BAR_W, Enemy.BAR_H, 0xd02020, 1)
      .setOrigin(0, 0.5);
  }

  // Keeps the HP bar glued to the sprite (and its fill in sync with current
  // health) every frame, independent of MainScene's own update() cadence —
  // same reasoning as ResourceNode's count-label preUpdate override. Also
  // keeps the enemy's own depth Y-sorted against the player and trees/
  // boulders (which are now walk-through-able but still visually occlude
  // whatever is "behind" them, see MainScene.updateTreeOcclusion).
  preUpdate(time: number, delta: number): void {
    super.preUpdate(time, delta);
    this.setDepth(this.y);
    const barX = this.x - Enemy.BAR_W / 2;
    const barY = this.y - Enemy.BAR_OFFSET_Y;
    const aggro = this.isAggro();
    this.healthBarBg.setPosition(barX, barY).setDepth(this.depth + 1).setVisible(aggro);
    this.healthBarFill.setPosition(barX, barY).setDepth(this.depth + 1).setVisible(aggro);
    this.healthBarFill.setScale(Math.max(0, this.health / this.maxHealth), 1);
  }

  // Whether the HP bar should be shown right now — only while actively
  // aggro'd on the player, not at rest. Base default matches Boar's own
  // state field; Snake overrides this since it tracks aggro via its own
  // hidden/striking/fleeing mode instead of the shared `state` field.
  protected isAggro(): boolean {
    return this.state === "chasing";
  }

  get biteDamage(): number {
    return this.biteDamageValue;
  }

  // Resource(s) dropped on death — data-driven per EnemyConfig so MainScene's
  // attack handler doesn't need per-species branching (Boar -> boar_meat,
  // Snake -> leather, ranged Gremlin -> skin + blood, etc.). Each entry is
  // rolled independently.
  rollLoot(): { resource: ResourceType; amount: number }[] {
    return this.loot.map((entry) => ({
      resource: entry.resource,
      amount: Phaser.Math.Between(entry.min, entry.max),
    }));
  }

  // --- give-up / re-aggro-immunity helpers (see constants above) ---

  // Call when starting a fresh pursuit (idle -> chasing).
  protected startPursuit(now: number): void {
    this.pursuitClockStart = now;
  }

  // Call whenever this enemy successfully lands an attack — resets the
  // give-up clock so a fight that's actually landing hits never times out.
  protected markAttackLanded(now: number): void {
    this.pursuitClockStart = now;
  }

  // True once continuous pursuit has run long enough without landing a hit
  // that the default "back off for a while" behavior should kick in.
  protected hasGivenUpPursuit(now: number): boolean {
    return now - this.pursuitClockStart >= CHASE_GIVEUP_MS;
  }

  // Whether normal aggro-radius proximity should be allowed to (re-)trigger
  // a chase right now. False during the post-giveup immunity window, unless
  // the player is close enough to override it (see CLOSE_REAGGRO_RADIUS).
  protected canAggro(dist: number, now: number): boolean {
    return now >= this.aggroImmuneUntil || dist <= CLOSE_REAGGRO_RADIUS;
  }

  // Enter the post-giveup window: ignores ordinary-range re-aggro for
  // POST_GIVEUP_IMMUNITY_MS. Close proximity or being attacked (see
  // takeHit()) both override it early.
  protected enterGivenUpState(now: number): void {
    this.aggroImmuneUntil = now + POST_GIVEUP_IMMUNITY_MS;
  }

  // Called every frame from MainScene.updateEnemies(). Returns true if a
  // bite lands this frame — caller applies damage to Health so Enemy doesn't
  // need to know about Player/Health directly.
  update(delta: number, playerX: number, playerY: number, now: number): boolean {
    if (this.depleted) return false;
    const body = this.body as Phaser.Physics.Arcade.Body;
    const dist = Phaser.Math.Distance.Between(this.x, this.y, playerX, playerY);

    if (this.state === "idle" && dist <= AGGRO_RADIUS && this.canAggro(dist, now)) {
      this.state = "chasing";
      this.startPursuit(now);
    } else if (this.state === "chasing") {
      // Ordinary "target left" case — no re-aggro immunity, resumes instantly
      // if the player comes back within range.
      if (dist > DEAGGRO_RADIUS) {
        this.state = "idle";
      } else if (this.hasGivenUpPursuit(now)) {
        // 30s of trying without landing a single hit — back off instead of
        // pursuing forever (default non-boss behavior, see constants above).
        this.state = "idle";
        this.enterGivenUpState(now);
      }
    }

    if (this.state === "chasing") {
      if (dist <= MELEE_RANGE) {
        body.setVelocity(0, 0);
        this.applyFacing(playerX - this.x, playerY - this.y);
        if (now - this.lastBiteAt >= BITE_COOLDOWN_MS) {
          this.lastBiteAt = now;
          this.markAttackLanded(now);
          return true; // bite lands
        }
        return false;
      }
      // Trees/boulders no longer block movement, so there's nothing left to
      // get stuck on — chase straight at the player every frame (the old
      // ground-truth stuck-detection/escape-heading heuristic that used to
      // live here is gone, see STATUS.md history).
      const directAngle = Phaser.Math.Angle.Between(this.x, this.y, playerX, playerY);
      const vx = Math.cos(directAngle) * CHASE_SPEED;
      const vy = Math.sin(directAngle) * CHASE_SPEED;
      body.setVelocity(vx, vy);
      this.applyFacing(vx, vy);
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
        const vx = Math.cos(angle) * WANDER_SPEED;
        const vy = Math.sin(angle) * WANDER_SPEED;
        body.setVelocity(vx, vy);
        this.applyFacing(vx, vy);
      }
    }
    return false;
  }

  // Full 360° facing: rotate the sprite to point along its current
  // direction of travel rather than just flipping left/right. The boar
  // texture is drawn nose-first toward the left (angle PI when unrotated —
  // see BootScene), so the rotation needed to align it with a movement
  // vector is that vector's angle offset by PI. Skips the update while
  // nearly stopped so it keeps its last facing (e.g. mid-bite) instead of
  // snapping to an arbitrary angle from a near-zero velocity.
  protected applyFacing(vx: number, vy: number): void {
    if (Math.abs(vx) < 3 && Math.abs(vy) < 3) return;
    this.setRotation(Math.atan2(vy, vx) + Math.PI);
  }

  // Same shape/feel as ResourceNode.takeHit: apply damage + feedback, return
  // true once depleted so the caller awards loot and destroys.
  takeHit(damage: number): boolean {
    this.health = Math.max(0, this.health - damage);
    this.playHitFeedback();
    // Being attacked always overrides the post-giveup immunity window — an
    // enemy that just backed off doesn't stand there tanking hits without
    // fighting back.
    this.aggroImmuneUntil = 0;
    if (this.state === "idle") {
      this.state = "chasing";
      this.startPursuit(this.scene.time.now);
    }
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
