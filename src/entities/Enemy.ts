import Phaser from "phaser";
import type { ResourceType } from "../systems/Inventory";
import type { DamageType } from "../systems/Weapons";
import { ysortDepth } from "../systems/depth";

export type EnemyState = "idle" | "chasing";

// Souls-like attack phases shared by every telegraphed melee attack (see the
// per-attack skeleton in the plan): a wind-up the player can react to, a brief
// strike window where the hit is checked against the player's CURRENT position
// (so leaving reach during the wind-up dodges it), and a recovery window where
// the enemy is planted and vulnerable — the punish window. This is a shared
// MECHANISM; each enemy tunes its own durations/reach/damage (per the standing
// "don't fold per-enemy combat stats into one config table" rule).
export type AttackPhase = "none" | "windup" | "strike" | "recover";

// Config for the base in-place telegraphed swing (Enemy.tickMeleeSwing). Each
// caller passes its own numbers; nothing here is a shared constant.
export interface SwingConfig {
  reach: number; // px — strike hit-check distance (player must still be within this at strike time)
  windupMs: number; // telegraph/dodge window before the hit lands
  strikeMs: number; // brief active window after the hit resolves
  recoverMs: number; // planted/vulnerable punish window after the strike
  cooldownMs: number; // gap after recovery before another swing can start
  knockback?: number; // optional px/s shove applied to the player on connect
}

// Base "default melee enemy" swing timings — used by Enemy.update() (the
// canonical telegraphed-swing reference) and mirrored by the weak Gremling.
const BASE_SWING: SwingConfig = {
  reach: 28, // matches the old MELEE_RANGE
  windupMs: 400,
  strikeMs: 90,
  recoverMs: 450,
  cooldownMs: 250,
};

const AGGRO_RADIUS = 105; // px — player enters this range, Boar starts chasing (Milestone B: tuned down from 140, "too aggressive" playtest flag)
const DEAGGRO_RADIUS = 190; // wider gap than AGGRO_RADIUS to avoid boundary flicker (kept ~2x aggro, same ratio as before)
const CHASE_SPEED = 60; // px/s — slower than player base (95), so it's escapable
const WANDER_SPEED = 20; // px/s idle wander
const MELEE_RANGE = 28; // px — how close the default melee enemy must be to start a swing

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

// Every elite drops exactly one trophy (M-RL prerequisite — reverses the
// M-EL2-era "Elite Gremlings drop no trophy" special case). Centralized here so
// the rule holds for every elite type, present and future, without each
// subclass restating it in its own loot literal.
// The trophy TYPE is per-species (Boar -> boar_trophy, Snake -> snake_trophy,
// Gremlin/Gremling -> gremlin_trophy), so each elite drops a unique trophy.
// Subclasses set EnemyConfig.eliteTrophy; it defaults to gremlin_trophy.
const DEFAULT_ELITE_TROPHY: ResourceType = "gremlin_trophy";

export interface EnemyConfig {
  x: number;
  y: number;
  texture: string;
  displayName: string;
  loot: LootEntry[];
  maxHealth: number;
  biteDamage: number;
  // Elite variant (default false). When true, one trophy drop is appended to
  // `loot` (see the constructor) and Run.ts scores the kill as "elite".
  // Subclasses pass this through from their own cfg.
  elite?: boolean;
  // Which trophy an elite drops (unique per species). Ignored when not elite;
  // defaults to gremlin_trophy. Boar/Snake override it with their own type.
  eliteTrophy?: ResourceType;
  // Per-damage-type incoming multiplier (Biome 2 Phase 1). <1 = resistant,
  // >1 = weak; any type absent = 1 (neutral). Lets badlands enemies teach the
  // damage-type layer (e.g. a rock reptile resists blunt, is weak to pierce)
  // purely as data — the resist math lives in MainScene.resolveWeaponHit. Empty
  // for every biome-1 enemy, so their combat is unchanged.
  resistances?: Partial<Record<DamageType, number>>;
  // True for a humanoid/upright sprite (Hexling) — skips the random full-360°
  // spawn rotation below and makes applyFacing (see applyUprightFacing) mirror
  // left/right via flipX with only a slight up/down tilt, never rotating past
  // horizontal. Default false = the nose-first full-rotation facing every other
  // enemy (Boar/Snake/Duskrunner/...) already uses.
  upright?: boolean;
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
  // Elite variant flag (default false). Set from EnemyConfig.elite in the
  // constructor; read for run-score kill classification (see Run.ts) and to
  // append the shared trophy drop.
  elite = false;
  // Per-damage-type incoming multiplier (Biome 2 Phase 1). Read by
  // MainScene.resolveWeaponHit via resistMultiplier(); empty for biome-1 enemies.
  private readonly resistances: Partial<Record<DamageType, number>>;
  // --- swarm pack-aggro (Biome 2 Phase 1, opt-in) ---
  // When true, this enemy both propagates aggro to and receives aggro from
  // nearby same-type pack members (MainScene.updatePackAggro drives it). Off by
  // default so only Phase 2's swarm creature opts in — every existing enemy is
  // unaffected. packAggroRadius is how close a woken ally must be to also wake.
  packAggro = false;
  packAggroRadius = 220;
  state: EnemyState = "idle";
  private wanderTarget: { x: number; y: number } | null = null;
  private nextWanderAt = 0;
  // Give-up/immunity state (see CHASE_GIVEUP_MS etc. above) — protected so a
  // future subclass overriding update() entirely can still reuse the same
  // clock/helpers below rather than reimplementing the mechanism.
  protected pursuitClockStart = 0;
  protected aggroImmuneUntil = 0;
  // Movement-speed multiplier (default 1). Elite variants set this >1 and
  // multiply their chase/pursue/kite speeds by it in update(). Base value keeps
  // every ordinary enemy identical.
  protected speedMult = 1;
  // Environmental movement multiplier, set each frame by MainScene (1 by day,
  // NIGHT_ENEMY_SPEED_MULT at night — M-DN). Public so the scene can assign it
  // without threading it through update()'s signature. Multiplied alongside
  // speedMult into aggressive-movement velocities (chase/pursue/kite/strike);
  // idle wander is deliberately left at base speed. GremlinKing's overridden
  // update() ignores it, so the boss stays exempt from the night speed buff.
  envSpeedMult = 1;

  // --- souls-like attack telegraph state (see AttackPhase above) ---
  // protected so subclasses driving their own attack (Boar charge, Snake
  // lunge, Gremlin claw) can read/advance the same phase clock and reuse the
  // wind-up tell rather than each re-inventing it.
  protected attackPhase: AttackPhase = "none";
  protected attackStartedAt = 0;
  protected lastAttackEndAt = -Infinity;
  // Knockback (px/s) to apply to the player when the current attack connects,
  // read by MainScene.updateEnemies() on the frame the bite lands (0 = none).
  // Set by tickMeleeSwing (from SwingConfig.knockback) or directly by a
  // subclass's own attack (e.g. Boar's charge gore).
  pendingAttackKnockback = 0;
  // Bleed (damage-over-time) to apply to the player when the current attack
  // connects, read by MainScene.updateEnemies() the frame the hit lands, then
  // cleared. null = no bleed (every attack except Cragscale's rolling charge).
  // Rides the same i-frame guard as the hit's direct damage, so a dashed-through
  // roll applies neither.
  pendingBleed: { dmgPerSec: number; durationMs: number } | null = null;
  // The unscaled/base display scale to restore after a wind-up scale-pulse.
  // Elites bump this to their own scale so the pulse throbs around the right
  // size (see each subclass's elite branch).
  protected baseScale = 1;
  // Handle to the current wind-up pulse tween so it can be stopped/reset
  // cleanly without killTweensOf() clobbering the HP-bar hit-feedback shake.
  private windupTween?: Phaser.Tweens.Tween;
  // True for a humanoid sprite (see EnemyConfig.upright) — applyFacing mirrors
  // via flipX instead of rotating.
  private upright = false;

  // Thin world-space HP bar (no number, just a bar) — separate GameObjects
  // rather than a Container, gone glued to position every frame via
  // preUpdate, matching ResourceNode's count-label tracking convention.
  private healthBarBg: Phaser.GameObjects.Rectangle;
  private healthBarFill: Phaser.GameObjects.Rectangle;
  // protected (not private) so a subclass can position a second bar (e.g.
  // GremlinKing's poise bar) consistently against these same constants.
  protected static readonly BAR_W = 22;
  protected static readonly BAR_H = 3;
  protected static readonly BAR_OFFSET_Y = 16; // px above the sprite's center

  constructor(scene: Phaser.Scene, cfg: EnemyConfig) {
    super(scene, cfg.x, cfg.y, cfg.texture);
    this.displayName = cfg.displayName;
    this.elite = cfg.elite ?? false;
    // Elites always drop one trophy (unique per species) on top of their own
    // loot table.
    this.loot = this.elite
      ? [...cfg.loot, { resource: cfg.eliteTrophy ?? DEFAULT_ELITE_TROPHY, min: 1, max: 1 }]
      : cfg.loot;
    this.maxHealth = cfg.maxHealth;
    this.health = cfg.maxHealth;
    this.biteDamageValue = cfg.biteDamage;
    this.resistances = cfg.resistances ?? {};
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setCollideWorldBounds(true); // matches Player — without this, chase/flee/kite AI can walk enemies off the map
    this.setDepth(ysortDepth(cfg.y)); // Y-sorted against the player/trees, see preUpdate
    // Randomized initial facing — without this every enemy defaults to the
    // same unrotated orientation and only ever rotates once it moves, which
    // reads as "always facing the same direction" for anything that spends
    // most of its life stationary (Snake hidden, Gremlin idle). An upright
    // humanoid (Hexling) never rotates at all — it only randomizes its mirror.
    this.upright = cfg.upright ?? false;
    if (this.upright) {
      this.setFlipX(Phaser.Math.Between(0, 1) === 1);
    } else {
      this.setRotation(Phaser.Math.FloatBetween(0, Math.PI * 2));
    }

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
    this.setDepth(ysortDepth(this.y));
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
  // hidden/striking/fleeing mode instead of the shared `state` field. Public
  // so MainScene's M-DN dawn-cleanup can spare a night-spawn that engaged.
  isAggro(): boolean {
    return this.state === "chasing";
  }

  get biteDamage(): number {
    return this.biteDamageValue;
  }

  // Incoming-damage multiplier for a given damage type (Biome 2 Phase 1). 1 =
  // neutral (the default for any type not listed in this enemy's resistances).
  resistMultiplier(type: DamageType): number {
    return this.resistances[type] ?? 1;
  }

  // Wake this enemy into a chase without dealing it damage — a pack member
  // reacting to a nearby ally engaging (swarm pack-aggro, Biome 2 Phase 1).
  // No-op if depleted or already chasing; clears the post-giveup immunity so a
  // woken ally actually commits rather than shrugging it off. Drives the base
  // `state` machine; a subclass that tracks aggro via its OWN field (Boar/Snake/
  // Gremlin use a private `mode`) MUST override this to flip that field — the
  // exact same reason they override isAggro(). Phase 2's swarm creature (the
  // first real packAggro user) will either use the base machine or override
  // both, so this base version stays correct for the common case.
  forceAggro(now: number): void {
    if (this.depleted || this.state === "chasing") return;
    this.state = "chasing";
    this.startPursuit(now);
    this.aggroImmuneUntil = 0;
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
    } else if (this.state === "chasing" && !this.isAttacking()) {
      // Ordinary "target left" case — no re-aggro immunity, resumes instantly
      // if the player comes back within range. Never deaggro mid-swing: a
      // committed telegraphed attack always plays out (dodge = leave its reach).
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
      // Telegraphed melee: once in reach (or already mid-swing), drive the
      // wind-up → strike → recover cycle instead of biting on contact. The
      // strike re-checks the player's position, so backpedaling/dashing out
      // during the wind-up dodges it, and the recovery is a punish window.
      if (this.isAttacking() || dist <= MELEE_RANGE + this.reachBonus()) {
        const hit = this.tickMeleeSwing(body, playerX, playerY, now, BASE_SWING);
        if (hit) {
          this.markAttackLanded(now);
          return true; // strike connects
        }
        return false; // committed to the swing, or in range on cooldown → hold
      }
      // Trees/boulders no longer block movement, so there's nothing left to
      // get stuck on — chase straight at the player every frame (the old
      // ground-truth stuck-detection/escape-heading heuristic that used to
      // live here is gone, see STATUS.md history).
      const directAngle = Phaser.Math.Angle.Between(this.x, this.y, playerX, playerY);
      const chaseSpeed = CHASE_SPEED * this.speedMult * this.envSpeedMult;
      const vx = Math.cos(directAngle) * chaseSpeed;
      const vy = Math.sin(directAngle) * chaseSpeed;
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
    if (this.upright) {
      this.applyUprightFacing(vx, vy);
      return;
    }
    this.setRotation(Math.atan2(vy, vx) + Math.PI);
  }

  // Upright/humanoid facing (Hexling): the sprite is drawn standing, front-on —
  // rotating it to point along travel (like the nose-first Boar) would flip it
  // upside-down whenever it moves up/down. Instead mirror left/right via flipX
  // and only lean a few degrees toward up/down, never near horizontal.
  private static readonly UPRIGHT_MAX_TILT = 0.22; // ~12.6°, well short of 90°
  private applyUprightFacing(vx: number, vy: number): void {
    if (Math.abs(vx) > 3) this.setFlipX(vx < 0);
    const tilt = Phaser.Math.Clamp(vy / 260, -Enemy.UPRIGHT_MAX_TILT, Enemy.UPRIGHT_MAX_TILT);
    this.setRotation(tilt);
  }

  // Face an explicit direction (radians), bypassing applyFacing's
  // near-stopped guard — for telegraphs where the enemy is planted but must
  // point where it's about to strike (Boar charge wind-up, Snake coil). Passing
  // a unit vector to applyFacing silently no-ops (magnitude < 3), which is why
  // those tells previously didn't rotate the sprite. Same nose-first PI offset.
  protected faceAngle(angle: number): void {
    if (this.upright) {
      this.applyUprightFacing(Math.cos(angle), Math.sin(angle));
      return;
    }
    this.setRotation(angle + Math.PI);
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

  // Don't disrupt a committed attack that's mid-MOVEMENT: a charging Boar /
  // lunging Snake should PLAY OUT when hit (souls-like — you can't stunlock a
  // committed attack out of it). The x-shake tween below fights the attack's
  // own body velocity and snaps position back on complete, which read as
  // "attacking cancels the charge." When the attacker is planted (wind-up /
  // recovery punish window) the shake is harmless and still gives hit
  // feedback, so only skip it while actually moving under attack velocity.
  private playHitFeedback(): void {
    const body = this.body as Phaser.Physics.Arcade.Body | undefined;
    const movingAttack =
      this.isAttacking() && !!body && (Math.abs(body.velocity.x) > 1 || Math.abs(body.velocity.y) > 1);
    if (movingAttack) {
      this.applyHpTint();
      return;
    }
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
    this.applyHpTint();
  }

  // The health-based body tint (white → dark red as HP drops). Extracted from
  // playHitFeedback so the wind-up tell can flash a warning color and then
  // restore the correct HP tint afterward.
  protected applyHpTint(): void {
    const frac = this.health / this.maxHealth;
    const shade = Phaser.Display.Color.Interpolate.ColorWithColor(
      new Phaser.Display.Color(255, 255, 255),
      new Phaser.Display.Color(140, 20, 20),
      100,
      Math.round((1 - frac) * 100),
    );
    this.setTint(Phaser.Display.Color.GetColor(shade.r, shade.g, shade.b));
  }

  // --- souls-like telegraph helpers (shared mechanism, per-enemy numbers) ---

  // True while committed to any attack phase — callers should stop moving the
  // enemy (it's planted) while this holds, so the wind-up/recovery reads as a
  // real commitment the player can punish.
  isAttacking(): boolean {
    return this.attackPhase !== "none";
  }

  protected attackElapsed(now: number): number {
    return now - this.attackStartedAt;
  }

  // Wind-up "tell" for a telegraphed attack — a scale "load up" plus a warning
  // tint held through the wind-up (deliberately NOT a world-space red arc, per
  // the locked direction: players learn hitboxes from the animation, not an
  // explicit danger zone). Finite tween (no repeat:-1 leak), snapped back to
  // baseScale by endWindupTell at the strike.
  protected playWindupTell(windupMs: number, color = 0xffd24a): void {
    this.windupTween?.stop();
    this.setScale(this.baseScale);
    const punch = this.baseScale * 1.18;
    this.windupTween = this.scene.tweens.add({
      targets: this,
      scaleX: punch,
      scaleY: punch,
      duration: windupMs,
      ease: "Quad.easeIn",
    });
    this.setTint(color);
  }

  // Release the wind-up: snap scale back and restore the HP-based tint. Called
  // at the strike moment (the snap-back reads as the swing releasing).
  protected endWindupTell(): void {
    this.windupTween?.stop();
    this.windupTween = undefined;
    this.setScale(this.baseScale);
    this.applyHpTint();
  }

  // Extra melee reach to offset the collider separation added by a larger
  // (elite) body. The player↔enemy physics collider keeps their centers apart
  // by roughly the sum of their body half-widths, so a sprite scaled up past 1
  // can never get its center as close to the player's as a normal-sized one —
  // a flat reach/strike threshold tuned for scale 1 then becomes unreachable
  // (elite Gremling: 19.8px settle vs a 20px reach = whiffs the swing start on
  // most approach angles). This returns exactly the half-width the scaling
  // added, so an elite keeps the same effective reach-past-its-edge as a normal
  // enemy. Uses baseScale (the resting size), not the live wind-up-pulsed scale,
  // and is 0 for any unscaled enemy — mirrors MainScene.enemyReach()'s
  // size-scaling, but for the enemy's OWN attack rather than the player's.
  protected reachBonus(): number {
    return Math.max(0, (this.baseScale - 1) * (Math.max(this.width, this.height) / 2));
  }

  // Drives a full in-place telegraphed swing (wind-up → strike → recover →
  // cooldown) for a simple melee enemy. Holds the enemy planted the whole
  // time. Returns true on the single frame the strike connects — i.e. the
  // player is still within cfg.reach at strike time, which is what makes
  // dodging out during the wind-up actually work. The caller applies the
  // damage (via Enemy.update()'s existing boolean contract).
  //
  // Call this every frame while the enemy wants to melee: the caller starts a
  // swing by calling it once the player is in reach, and MUST keep calling it
  // while isAttacking() even if the player leaves reach (that's the dodge).
  protected tickMeleeSwing(
    body: Phaser.Physics.Arcade.Body,
    playerX: number,
    playerY: number,
    now: number,
    cfg: SwingConfig,
  ): boolean {
    body.setVelocity(0, 0); // planted for the whole interaction
    const dist = Phaser.Math.Distance.Between(this.x, this.y, playerX, playerY);

    switch (this.attackPhase) {
      case "windup":
        if (this.attackElapsed(now) >= cfg.windupMs) {
          this.attackPhase = "strike";
          this.attackStartedAt = now;
          this.endWindupTell();
          const hit = dist <= cfg.reach + this.reachBonus(); // hit-check against CURRENT position
          this.pendingAttackKnockback = hit ? cfg.knockback ?? 0 : 0;
          return hit;
        }
        return false;
      case "strike":
        if (this.attackElapsed(now) >= cfg.strikeMs) {
          this.attackPhase = "recover";
          this.attackStartedAt = now;
        }
        return false;
      case "recover":
        if (this.attackElapsed(now) >= cfg.recoverMs) {
          this.attackPhase = "none";
          this.lastAttackEndAt = now;
        }
        return false;
      default:
        // Not attacking: start a fresh swing if off cooldown. Facing is locked
        // here (not re-tracked through the wind-up), so a player who steps
        // around during the tell can dodge.
        if (now - this.lastAttackEndAt >= cfg.cooldownMs) {
          this.attackPhase = "windup";
          this.attackStartedAt = now;
          this.applyFacing(playerX - this.x, playerY - this.y);
          this.playWindupTell(cfg.windupMs);
        }
        return false;
    }
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
