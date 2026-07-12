import Phaser from "phaser";
import { Enemy } from "./Enemy";
import type { SwingConfig } from "./Enemy";
import type { ProjectileConfig, ProjectileHost } from "./Projectile";

// Two variants (per the first-biome content plan's Milestone C note, added
// 2026-07-07): a stronger ranged+melee one, called "Gremlin", and a weaker
// melee-only one, called "Gremling" (2026-07-08 naming split — same species,
// distinct names per variant; loot items stay "Gremlin ___" regardless of
// which one drops them). They're deliberately separate classes with their
// own state machines/numbers rather than one class with a "ranged?" flag —
// the melee-only variant genuinely has no kiting/throwing states to speak
// of, consistent with the standing "own condition, not just a knob" rule.

const RANGED_AGGRO_RADIUS = 136; // larger than melee — ranged notices earlier (~15% shorter, playtest feedback)
// Wider than PROJECTILE_MAX_RANGE (see below) so there's real room for the
// "pursue" band between "in range" and "gave up" — previously this equaled
// PROJECTILE_MAX_RANGE exactly, which meant a player who kited past shot
// range always deaggro'd instead of being chased back into it.
const RANGED_DEAGGRO_RADIUS = 400;
const KITE_SPEED = 55; // backs away while too close (below RANGED_MIN_KITE_DIST)
const RANGED_MIN_KITE_DIST = 140; // closer than this -> flee; keeps some daylight before melee range
const RANGED_PURSUE_SPEED = 70; // chases in while out of shot range (beyond PROJECTILE_MAX_RANGE)
const RANGED_MELEE_RANGE = 20; // player closing to this -> switches to melee mode (~15% shorter, playtest feedback)
const RANGED_MELEE_EXIT_RANGE = 34; // must back out past this (not just RANGED_MELEE_RANGE) to leave melee mode — hysteresis gap, same reasoning as AGGRO/DEAGGRO_RADIUS elsewhere: without it, the player-enemy physics collider's constant separation jitter flips the mode every frame right at the boundary
const RANGED_CLAW_DAMAGE = 15; // was 10 — light enemy-dmg buff (2026-07-11 rebalance): gremlins were floored to 1 dmg vs Lvl2+ armor
// Telegraphed close-range claw — a rare "back off!" swipe the kiter only does
// when the player is right on top of it (the user: it should rarely fire). The
// shove knockback reinforces its kiter identity: it hits, pushes you away, and
// resumes kiting. reach (28) is a touch past RANGED_MELEE_RANGE so a stationary
// player at melee distance still gets caught at strike time.
const RANGED_CLAW_SWING: SwingConfig = {
  reach: 28,
  windupMs: 300,
  strikeMs: 80,
  recoverMs: 350,
  cooldownMs: 600,
  knockback: 210,
};
const PROJECTILE_SPEED = 220;
const PROJECTILE_DAMAGE = 11; // was 8 — light enemy-dmg buff (2026-07-11 rebalance)
const PROJECTILE_MAX_RANGE = 220; // ~15% shorter, playtest feedback
const RANGED_MAX_HEALTH = 32; // doubled 2026-07-07 (was 16) — tanky enough to trade at range
// Burst pattern (2026-07-07 spec): once the player is in range, fire a quick
// 2-shot burst, then wait out a longer cooldown before the next burst — not a
// flat per-shot cooldown. BURST_SHOT_INTERVAL_MS is deliberately short (a
// "double tap"), BURST_COOLDOWN_MS is the gap between bursts.
const BURST_SHOT_COUNT = 2;
const BURST_SHOT_INTERVAL_MS = 180;
const BURST_COOLDOWN_MS = 2400;
// Minimum time to stay planted once committing to a reactive stop-and-shoot
// (see standGroundUntil below) — the previous version resumed fleeing the
// instant the burst itself finished (~200ms), which read as barely pausing.
// User feedback: at least 2x that.
const RANGED_STAND_GROUND_MS = 450;
// Idle wander, anchored to spawn (not an incremental drift like Boar/Gremling
// — picking each target directly within RANGED_WANDER_RADIUS of the stored
// spawn point guarantees it never wanders off, per the user's "small area
// around their spawn" request).
const RANGED_WANDER_SPEED = 20;
const RANGED_WANDER_RADIUS = 70;

type RangedMode = "idle" | "ranged" | "meleeing";

// Stronger variant: kites + fires 2-shot bursts at range, but fully commits to
// fighting back in melee the instant the player closes inside melee range —
// and drops back to ranged/kiting the instant the player backs back out of
// it (not a fallback-only claw anymore, a real mode toggle both ways). Drops
// both Gremlin Skin (Drying Rack -> Gremlin Leather) and Gremlin Blood — the
// skin is exclusive to this variant so Gremlin Leather Armor isn't trivially
// farmable from the weak melee-only one.
export class RangedGremlin extends Enemy {
  private mode: RangedMode = "idle";
  private readonly spawnX: number;
  private readonly spawnY: number;
  private rangedWanderTarget: { x: number; y: number } | null = null;
  private nextRangedWanderAt = 0;
  // Burst state: shotsFiredInBurst counts 0/1 mid-burst, resets to 0 once a
  // full burst completes and starts burstCooldownUntil.
  private shotsFiredInBurst = 0;
  private nextBurstShotAt = -Infinity;
  private burstCooldownUntil = 0;
  // Timestamp (this.scene.time.now units) until which the gremlin must stay
  // planted once it commits to a reactive stop-and-shoot in close — refreshed
  // every frame the burst is active so it always covers at least
  // RANGED_STAND_GROUND_MS from the moment the burst actually finishes, not
  // just from when it started.
  private standGroundUntil = -Infinity;

  constructor(scene: Phaser.Scene, cfg: { x: number; y: number; elite?: boolean }) {
    const elite = cfg.elite ?? false;
    super(scene, {
      x: cfg.x,
      y: cfg.y,
      texture: elite ? "gremlin_elite" : "gremlin",
      displayName: elite ? "Elite Gremlin" : "Gremlin",
      // Trophy is appended centrally by Enemy when elite (no inline entry here,
      // which would double-drop) — only the skin/blood counts differ by tier.
      loot: elite
        ? [
            { resource: "gremlin_skin", min: 2, max: 2 },
            { resource: "gremlin_blood", min: 2, max: 2 },
          ]
        : [
            { resource: "gremlin_skin", min: 1, max: 1 },
            { resource: "gremlin_blood", min: 1, max: 1 },
          ],
      maxHealth: elite ? Math.round(RANGED_MAX_HEALTH * 1.5) : RANGED_MAX_HEALTH,
      biteDamage: elite ? Math.round(RANGED_CLAW_DAMAGE * 1.5) : RANGED_CLAW_DAMAGE, // reuses Enemy's shared "melee hit" field name
      elite,
    });
    this.spawnX = cfg.x;
    this.spawnY = cfg.y;
    if (elite) {
      this.speedMult = 1.1;
      this.setScale(1.4);
      this.baseScale = 1.4; // so the wind-up pulse throbs around the elite's size
    }
  }

  update(_delta: number, playerX: number, playerY: number, now: number): boolean {
    if (this.depleted) return false;
    const body = this.body as Phaser.Physics.Arcade.Body;
    const dist = Phaser.Math.Distance.Between(this.x, this.y, playerX, playerY);

    if (this.mode === "idle") {
      if (dist <= RANGED_AGGRO_RADIUS && this.canAggro(dist, now)) {
        this.mode = "ranged";
        this.startPursuit(now);
      } else {
        this.updateWander(body, now);
        return false;
      }
    }

    if (dist > RANGED_DEAGGRO_RADIUS) {
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

    // Mode toggles both ways, but with a hysteresis gap between the enter and
    // exit thresholds (RANGED_MELEE_RANGE vs RANGED_MELEE_EXIT_RANGE) — a
    // single shared threshold let the player-enemy physics collider's
    // separation jitter flip the mode every frame while hovering right at the
    // boundary. Not a one-way fallback: still toggles both directions, just
    // with a buffer zone instead of a knife-edge.
    // Don't flip modes mid-swing — once the claw's wind-up commits, a player
    // backpedaling past the exit range shouldn't yank it back into kiting; it
    // stays planted and either connects or whiffs, then re-evaluates.
    if (!this.isAttacking()) {
      // + reachBonus() so a scaled-up elite's larger body (which the player↔enemy
      // collider holds further from the player's center) doesn't leave it stuck
      // just outside its own flat melee range — see Enemy.reachBonus().
      const bonus = this.reachBonus();
      if (this.mode === "meleeing") {
        if (dist > RANGED_MELEE_EXIT_RANGE + bonus) this.mode = "ranged";
      } else if (dist <= RANGED_MELEE_RANGE + bonus) {
        this.mode = "meleeing";
      }
    }

    if (this.mode === "meleeing") {
      const hit = this.tickMeleeSwing(body, playerX, playerY, now, RANGED_CLAW_SWING);
      if (hit) {
        this.markAttackLanded(now);
        return true; // telegraphed claw connects (with a shove, see RANGED_CLAW_SWING)
      }
      return false;
    }

    // Ranged mode: maintain an optimal kiting band instead of always
    // fleeing — too close backs away, too far (out of projectile range)
    // pursues back in, and the band between holds ground to fire. This is
    // what produces the flee/pursue loop as the player closes and backs off
    // (playtest feedback: previously "ranged" always fled, so a player who
    // just held distance past shot range could never be re-engaged).
    //
    // The gremlin must stand still to shoot, but it should still *try* to
    // shoot even while being chased in close — it just has to stop to do so
    // (playtest feedback: it shouldn't purely flee when cornered, it should
    // periodically plant and fire back, then resume fleeing). So a fresh
    // burst can start anywhere in shot range, not just the ideal hold band;
    // a burst already in progress (midBurst) always keeps it planted
    // (overriding flee/pursue) until it finishes, so a shot never fires
    // mid-movement.
    const midBurst = this.shotsFiredInBurst > 0;
    const inShotRange = dist <= PROJECTILE_MAX_RANGE;
    const readyForFreshBurst = !midBurst && now >= this.burstCooldownUntil;
    const inHoldBand = dist >= RANGED_MIN_KITE_DIST && dist <= PROJECTILE_MAX_RANGE;
    // Once committing to a reactive stop-and-shoot (starting or mid-burst),
    // keep pushing standGroundUntil forward so it always covers at least
    // RANGED_STAND_GROUND_MS from the last such frame — this is what makes
    // the gremlin stay planted for a beat after the burst itself finishes,
    // instead of resuming flee/pursue the instant the last shot fires.
    if (midBurst || (inShotRange && readyForFreshBurst)) {
      this.standGroundUntil = Math.max(this.standGroundUntil, now + RANGED_STAND_GROUND_MS);
    }
    const holdingStill = inHoldBand || now < this.standGroundUntil;

    if (!holdingStill && dist < RANGED_MIN_KITE_DIST) {
      const awayAngle = Phaser.Math.Angle.Between(playerX, playerY, this.x, this.y);
      const vx = Math.cos(awayAngle) * KITE_SPEED * this.speedMult * this.envSpeedMult;
      const vy = Math.sin(awayAngle) * KITE_SPEED * this.speedMult * this.envSpeedMult;
      body.setVelocity(vx, vy);
      this.applyFacing(vx, vy);
    } else if (!holdingStill && dist > PROJECTILE_MAX_RANGE) {
      const towardAngle = Phaser.Math.Angle.Between(this.x, this.y, playerX, playerY);
      const vx = Math.cos(towardAngle) * RANGED_PURSUE_SPEED * this.speedMult * this.envSpeedMult;
      const vy = Math.sin(towardAngle) * RANGED_PURSUE_SPEED * this.speedMult * this.envSpeedMult;
      body.setVelocity(vx, vy);
      this.applyFacing(vx, vy);
    } else {
      body.setVelocity(0, 0);
      this.applyFacing(playerX - this.x, playerY - this.y);
    }

    // A fresh burst only ever starts while holding ground in-band; a burst
    // already underway (midBurst) always continues, since holdingStill is
    // forced true for it above.
    if (!holdingStill) return false;

    if (this.shotsFiredInBurst === 0 && now >= this.burstCooldownUntil) {
      this.fireShot(playerX, playerY, now);
      this.shotsFiredInBurst = 1;
      this.nextBurstShotAt = now + BURST_SHOT_INTERVAL_MS;
    } else if (this.shotsFiredInBurst > 0 && this.shotsFiredInBurst < BURST_SHOT_COUNT && now >= this.nextBurstShotAt) {
      this.fireShot(playerX, playerY, now);
      this.shotsFiredInBurst++;
      if (this.shotsFiredInBurst >= BURST_SHOT_COUNT) {
        this.shotsFiredInBurst = 0;
        this.burstCooldownUntil = now + BURST_COOLDOWN_MS;
      } else {
        this.nextBurstShotAt = now + BURST_SHOT_INTERVAL_MS;
      }
    }
    return false;
  }

  // Idle wander, confined to RANGED_WANDER_RADIUS of the spawn point — each
  // new target is drawn fresh from spawn (not the current position), so it
  // can never random-walk away like Boar/Gremling's incremental drift can.
  private updateWander(body: Phaser.Physics.Arcade.Body, now: number): void {
    if (now >= this.nextRangedWanderAt) {
      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const r = Phaser.Math.FloatBetween(0, RANGED_WANDER_RADIUS);
      this.rangedWanderTarget = { x: this.spawnX + Math.cos(angle) * r, y: this.spawnY + Math.sin(angle) * r };
      this.nextRangedWanderAt = now + Phaser.Math.Between(2000, 4000);
    }
    if (!this.rangedWanderTarget) return;
    const d = Phaser.Math.Distance.Between(this.x, this.y, this.rangedWanderTarget.x, this.rangedWanderTarget.y);
    if (d < 4) {
      body.setVelocity(0, 0);
      return;
    }
    const angle = Phaser.Math.Angle.Between(this.x, this.y, this.rangedWanderTarget.x, this.rangedWanderTarget.y);
    const vx = Math.cos(angle) * RANGED_WANDER_SPEED;
    const vy = Math.sin(angle) * RANGED_WANDER_SPEED;
    body.setVelocity(vx, vy);
    this.applyFacing(vx, vy);
  }

  private fireShot(playerX: number, playerY: number, now: number): void {
    this.markAttackLanded(now);
    const angle = Phaser.Math.Angle.Between(this.x, this.y, playerX, playerY);
    const cfg: ProjectileConfig = {
      x: this.x,
      y: this.y,
      angle,
      speed: PROJECTILE_SPEED,
      damage: PROJECTILE_DAMAGE,
      texture: "gremlin_rock",
      maxRangePx: PROJECTILE_MAX_RANGE,
      sourceIsPlayer: false,
    };
    (this.scene as unknown as ProjectileHost).spawnProjectile(cfg);
  }

  // Getting hit while idle should snap it into the fight instead of tanking
  // hits passively — mirrors Enemy.takeHit()'s own idle->chasing flip, just
  // keyed off `mode` since this variant doesn't use the shared `state` field.
  takeHit(damage: number): boolean {
    const depleted = super.takeHit(damage);
    if (!depleted && this.mode === "idle") {
      this.mode = "ranged";
      this.startPursuit(this.scene.time.now);
    }
    return depleted;
  }

  isAggro(): boolean {
    return this.mode !== "idle";
  }
}

const MELEE_AGGRO_RADIUS = 110; // ~15% shorter, playtest feedback
const MELEE_DEAGGRO_RADIUS = 220;
const MELEE_CHASE_SPEED = 70;
const MELEE_WANDER_SPEED = 20;
const MELEE_RANGE = 20; // ~15% shorter, playtest feedback
const MELEE_CLAW_DAMAGE = 12; // was 8 — light enemy-dmg buff (2026-07-11); still weaker than the ranged variant's claw (15) and Boar's bite (25)
const MELEE_MAX_HEALTH = 12;
// Snappy telegraphed claw for the weak trash Gremling — the intentionally
// simple, still-kiteable baseline: a quick wind-up + short recovery, just
// enough of a tell/punish window that it can't be pure-facetanked.
const GREMLING_SWING: SwingConfig = {
  reach: MELEE_RANGE,
  windupMs: 320,
  strikeMs: 80,
  recoverMs: 380,
  cooldownMs: 200,
};

type MeleeMode = "idle" | "chasing";

// Weaker variant, called "Gremling" (vs. the ranged "Gremlin") — no
// kiting/throwing states at all, plain chase-and-claw, but with its own tuned
// numbers (not Boar's), per the standing "own condition/numbers, don't copy"
// rule. Drops Gremlin Blood only (no skin) — item names stay "Gremlin ___"
// regardless of which variant drops them.
export class MeleeGremling extends Enemy {
  private mode: MeleeMode = "idle";
  private meleeWanderTarget: { x: number; y: number } | null = null;
  private nextMeleeWanderAt = 0;
  // Optional spawn anchor (Gremlin Shack guards) — when set, wander targets
  // are drawn fresh from this point each cycle (mirrors RangedGremlin's
  // spawn-anchored wander) instead of drifting from the current position, so
  // a guard can never random-walk away from the shack it's posted at.
  // Undefined for every free-roaming Gremling elsewhere, which keeps the
  // original incremental-drift behavior unchanged.
  private readonly wanderAnchor: { x: number; y: number; radius: number } | null;

  constructor(
    scene: Phaser.Scene,
    cfg: {
      x: number;
      y: number;
      wanderAnchor?: { x: number; y: number; radius: number };
      elite?: boolean;
    },
  ) {
    const elite = cfg.elite ?? false;
    super(scene, {
      x: cfg.x,
      y: cfg.y,
      texture: elite ? "gremling_elite" : "gremling_weak",
      displayName: elite ? "Elite Gremling" : "Gremling",
      // Elite Gremlings now drop a trophy too (appended centrally by Enemy) —
      // the trophy is what feeds the relic economy, so every elite yields one.
      // Their own loot is 2x blood at elite tier.
      loot: elite
        ? [{ resource: "gremlin_blood", min: 2, max: 2 }]
        : [{ resource: "gremlin_blood", min: 1, max: 1 }],
      maxHealth: elite ? Math.round(MELEE_MAX_HEALTH * 1.5) : MELEE_MAX_HEALTH,
      biteDamage: elite ? Math.round(MELEE_CLAW_DAMAGE * 1.5) : MELEE_CLAW_DAMAGE,
      elite,
    });
    this.wanderAnchor = cfg.wanderAnchor ?? null;
    if (elite) {
      this.speedMult = 1.1;
      this.setScale(1.4);
      this.baseScale = 1.4; // wind-up pulse throbs around the elite's size
    }
  }

  update(_delta: number, playerX: number, playerY: number, now: number): boolean {
    if (this.depleted) return false;
    const body = this.body as Phaser.Physics.Arcade.Body;
    const dist = Phaser.Math.Distance.Between(this.x, this.y, playerX, playerY);

    if (this.mode === "idle" && dist <= MELEE_AGGRO_RADIUS && this.canAggro(dist, now)) {
      this.mode = "chasing";
      this.startPursuit(now);
    } else if (this.mode === "chasing" && !this.isAttacking()) {
      // Don't deaggro mid-swing — a committed attack always plays out.
      if (dist > MELEE_DEAGGRO_RADIUS) {
        this.mode = "idle";
      } else if (this.hasGivenUpPursuit(now)) {
        this.mode = "idle";
        this.enterGivenUpState(now);
      }
    }

    if (this.mode === "chasing") {
      if (this.isAttacking() || dist <= MELEE_RANGE + this.reachBonus()) {
        const hit = this.tickMeleeSwing(body, playerX, playerY, now, GREMLING_SWING);
        if (hit) {
          this.markAttackLanded(now);
          return true; // telegraphed claw connects
        }
        return false; // committed to the swing, or in range on cooldown → hold
      }
      const angle = Phaser.Math.Angle.Between(this.x, this.y, playerX, playerY);
      const vx = Math.cos(angle) * MELEE_CHASE_SPEED * this.speedMult * this.envSpeedMult;
      const vy = Math.sin(angle) * MELEE_CHASE_SPEED * this.speedMult * this.envSpeedMult;
      body.setVelocity(vx, vy);
      this.applyFacing(vx, vy);
      return false;
    }

    if (now >= this.nextMeleeWanderAt) {
      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      if (this.wanderAnchor) {
        const r = Phaser.Math.FloatBetween(0, this.wanderAnchor.radius);
        this.meleeWanderTarget = {
          x: this.wanderAnchor.x + Math.cos(angle) * r,
          y: this.wanderAnchor.y + Math.sin(angle) * r,
        };
      } else {
        const d = Phaser.Math.Between(20, 50);
        this.meleeWanderTarget = { x: this.x + Math.cos(angle) * d, y: this.y + Math.sin(angle) * d };
      }
      this.nextMeleeWanderAt = now + Phaser.Math.Between(2000, 4000);
    }
    if (this.meleeWanderTarget) {
      const d = Phaser.Math.Distance.Between(this.x, this.y, this.meleeWanderTarget.x, this.meleeWanderTarget.y);
      if (d < 4) {
        body.setVelocity(0, 0);
      } else {
        const angle = Phaser.Math.Angle.Between(this.x, this.y, this.meleeWanderTarget.x, this.meleeWanderTarget.y);
        const vx = Math.cos(angle) * MELEE_WANDER_SPEED;
        const vy = Math.sin(angle) * MELEE_WANDER_SPEED;
        body.setVelocity(vx, vy);
        this.applyFacing(vx, vy);
      }
    }
    return false;
  }

  isAggro(): boolean {
    return this.mode === "chasing";
  }

  // Same "getting hit while idle wakes it" fix as Boar/RangedGremlin/Hexling
  // — the base Enemy.forceAggro() called from resolveWeaponHit only flips
  // the shared `state` field, which this `mode`-driven update() never reads.
  takeHit(damage: number): boolean {
    const depleted = super.takeHit(damage);
    if (!depleted && this.mode === "idle") {
      this.mode = "chasing";
      this.startPursuit(this.scene.time.now);
    }
    return depleted;
  }
}
