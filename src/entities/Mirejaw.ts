import Phaser from "phaser";
import { Enemy } from "./Enemy";
import type { SwingConfig } from "./Enemy";
import { enemyStat } from "../systems/enemyStats";

// Combat stats from the Phaser-free source of truth (also read by the balancing
// dashboard — tune there). attacks[0] = chomp, attacks[1] = lunge.
const S = enemyStat("mirejaw");
const ELITE = S.elite!;

// Mirejaw — the Duskmire Bayou's SIGNATURE AMBUSHER (biome 3 Phase 4b). A
// gloam-corrupted alligator that lies half-sunk in the muck until something
// wades too close, then explodes forward in a locked-line lunge chomp. It is
// the game's ONLY source of Mirehide (locked with the user), so the bayou's
// light-armor reforge tier is gated behind actually hunting the thing.
//
// Deliberately NOT a second Sandmaw: the Sandmaw is invisible and detonates a
// radial burst around itself (you dodge by clearing a ring). The Mirejaw is
// VISIBLE while lurking (a low mound in the water, alpha 0.4 — you can learn to
// spot one), and its ambush is a straight LINE you sidestep. And unlike the
// Sandmaw it does not go back under after one attempt: once it commits it
// SURFACES and hunts, chomping in melee, which is what makes it the biome's
// apex regular rather than a one-shot trap.
//
// Own bespoke state machine (lurk → lunging → hunting), own constants, per the
// standing "own numbers, don't share one config table" rule. Fully overrides
// update() (no super.update() — Snake/Sandmaw precedent).

type MirejawMode = "lurk" | "lunging" | "hunting" | "rolling";

// Tuning pass (2026-07-22, the user): the first numbers were sized against the
// BADLANDS roster, not against what a bayou-ready player actually is — sprinting
// at 166-229px/s (Running skill + move relics, up to ~309 on a kill-rush),
// dashing at 450, and blinking 220px on a 6s cooldown, while hitting for ~45-70
// (130-200 on a crit). A 66px/s chaser with 130 HP was outrun at a WALK and died
// in two swings. Everything below is scaled to that reality: this is the bayou's
// apex regular and it has to be able to genuinely run you down.
const AMBUSH_RADIUS = 240; // lurking, player this close → commit the lunge
// 460 -> 330. Stalking escalates into an open hunt after STALK_PATIENCE_MS
// regardless of distance, so this radius is effectively the creature's real
// aggro range — and 460 is beyond the ~360px visible half-height, i.e. a gator
// committed to you from off the top of the screen (the user: "aggro radius for
// alligators is absolutely absurd - aggrod onto before and they werent even on
// my screen"). 330 keeps it on-screen while staying well above its 240 ambush ring.
const STALK_RADIUS = 330; // lurking, drifts toward a player inside this to line one up
const LURK_DRIFT = 44; // px/s — a submerged gator repositioning, still slow enough to spot
const LURK_ALPHA = 0.4; // half-sunk, not invisible (cf. Sandmaw's 0.18)
// Stalking is SLOW (that's what makes a lurking gator readable), which means a
// player who simply keeps walking can never be ambushed — the stalk can't close
// on 95px/s, so the creature would politely watch you leave forever (caught in
// testing: it fell 537px behind a walking player and never engaged). After this
// long stalking without getting an ambush, it abandons stealth and HUNTS. That's
// the escalation an apex predator should have, and it's what stops the bayou's
// signature creature from being trivially ignorable.
const STALK_PATIENCE_MS = 2400;

// Faster than a player's WALK (95) and most of a sprint, so escaping on foot
// means actually committing to a sprint/dash instead of strolling off.
const CHASE_SPEED = S.moveSpeed;
// 720 -> 520. At WORLD_ZOOM 1.5 the visible world is roughly 1280x720px, so the
// screen half-diagonal is ~734 and the half-HEIGHT only ~360: a 720 deaggro
// radius meant a gator essentially could not lose you anywhere on screen
// (the user: "gator dudes still not really deaggroing... chasing me forever").
// Apex-predator commitment is now carried by the base-class aggro persistence
// plus the sticky STALK_RADIUS below, not by a radius the player can't see out of.
const DEAGGRO_RADIUS = 520;

const MAX_HEALTH = S.hp; // ~5-6 bayou-tier hits; the badlands' 95-HP Hexling was two

// The ambush: a long telegraph, then a fast locked-line lunge. It has to cover
// enough ground to catch a sprinting player, so the lunge outruns a sprint while
// it lasts — the counterplay is the 430ms tell + the locked direction, not speed.
const LUNGE_WINDUP_MS = 430; // jaw-open/coil tell — the sidestep window
const LUNGE_SPEED = S.burstSpeed!;
const LUNGE_MAX_DIST = 340;
const LUNGE_HIT_RADIUS = 44;
const LUNGE_DAMAGE = S.attacks[1].damage; // ~78 net through a full Gloamsteel set — being caught really hurts
const LUNGE_KNOCKBACK = 190;
const LUNGE_RECOVER_MS = 720; // beached/planted after the snap — the punish window
const LUNGE_COOLDOWN_MS = 2600;
// Signature death-roll bleed: the chomp doesn't just hit, it tears.
const LUNGE_BLEED_DPS = 9;
const LUNGE_BLEED_MS = 6000;

// The surfaced melee chomp — its bread-and-butter once hunting.
const CHOMP_DAMAGE = S.attacks[0].damage;
const CHOMP_BLEED_DPS = 6;
const CHOMP_BLEED_MS = 4000;
const CHOMP_SWING: SwingConfig = {
  reach: 56, // a huge head on a huge body (the sprite is 1.55x now)
  windupMs: 440,
  strikeMs: 90,
  recoverMs: 500,
  cooldownMs: 430,
  knockback: 110,
};

// --- the DEATH ROLL (C1, 2026-07-23) ---
// the user: the Mirejaw "feels like a glorified boar." It was right — lunge in,
// bite, repeat is a Boar's kit with a bigger sprite. This is the move that makes
// it read as an alligator: a landed chomp LATCHES, and it thrashes.
//
// Design contract, matching the roster's souls-like rules:
//   * It is a PUNISH FOR BEING CAUGHT, not a new way to catch you. It can only
//     start from a chomp that already connected — never opened cold.
//   * Each tick re-checks the player's CURRENT position against a tight radius,
//     so rolling away mid-roll cuts your losses. Per-tick damage is deliberately
//     modest; eating all three is what hurts.
//   * It ends PLANTED for a long recovery — the biggest punish window the
//     creature offers, and the reward for having escaped the roll.
//   * Long cooldown so it stays a signature moment rather than every bite.
// Damage/bleed come from enemyStats' third attack entry (the dashboard mirrors it).
const DEATHROLL_TICKS = 3;
const DEATHROLL_TICK_MS = 360;
const DEATHROLL_RADIUS = 62; // tight — this is a latched grip, not an AoE
const DEATHROLL_TICK_DAMAGE = S.attacks[2].damage;
const DEATHROLL_BLEED_DPS = S.attacks[2].bleedDps ?? 7;
const DEATHROLL_BLEED_MS = 3000;
const DEATHROLL_RECOVER_MS = 1000; // dizzy and beached afterwards
const DEATHROLL_COOLDOWN_MS = S.attacks[2].intervalMs;
const DEATHROLL_SPIN_RAD_PER_SEC = 15; // the visual: it barrel-rolls

export class Mirejaw extends Enemy {
  private mode: MirejawMode = "lurk";
  private lungeAngle = 0;
  private lungeTraveled = 0;
  private lungeHit = false;
  private lungeCooldownUntil = 0;
  private readonly lungeDamage: number;
  // Set on the frame the ambush chomp connects so the scene reads the lunge's
  // (much bigger) damage instead of the standing chomp's — see the getter below.
  private overrideBite: number | null = null;
  private wanderTgt: { x: number; y: number } | null = null;
  private nextRoamAt = 0;
  // When the current uninterrupted stalk began (-1 = not stalking). Drives the
  // give-up-on-stealth escalation above.
  private stalkingSince = -1;
  // --- death-roll state (C1) ---
  private rollTicksDone = 0;
  private rollNextTickAt = 0;
  private rollEndsAt = 0;
  private rollCooldownUntil = 0;
  private readonly rollTickDamage: number;
  // Set on a tick frame; consumed by checkPlayerHit() the same frame (the scene
  // queries it right after update()). Mirrors how the mini-bosses hand the scene
  // an area hit rather than using update()'s plain boolean bite contract.
  private pendingRollHit = false;

  constructor(scene: Phaser.Scene, cfg: { x: number; y: number; elite?: boolean }) {
    const elite = cfg.elite ?? false;
    super(scene, {
      x: cfg.x,
      y: cfg.y,
      texture: elite ? "mirejaw_elite" : "mirejaw",
      displayName: elite ? "Elite Mirejaw" : "Mirejaw",
      // The ONLY Mirehide source in the game (locked) + the bayou's food drop,
      // mirroring how Duskrunner meat feeds the badlands.
      loot: elite
        ? [
            { resource: "mirehide", min: 3, max: 4 },
            { resource: "mirejaw_meat", min: 2, max: 3 },
          ]
        : [
            { resource: "gravemark_rubbing", min: 1, max: 1, chance: 0.06 },
            { resource: "mirehide", min: 1, max: 2 },
            { resource: "mirejaw_meat", min: 1, max: 2 },
          ],
      maxHealth: elite ? Math.round(MAX_HEALTH * ELITE.hp) : MAX_HEALTH,
      biteDamage: elite ? Math.round(CHOMP_DAMAGE * ELITE.damage) : CHOMP_DAMAGE,
      elite,
      eliteTrophy: "mirejaw_trophy",
      barScale: 1.5, // big sprite, readable overhead bar
      // Overlapping bony scutes turn a thrust; the belly under them doesn't like
      // an edge. Deliberately the INVERSE of the Fenlurker (resist slash / weak
      // blunt) and distinct from the Mosswretch (resist blunt / weak fire), so
      // all three physical types have a bayou creature they beat — the same
      // spread the badlands used to make carrying two weapons matter.
      resistances: { pierce: 0.5, slash: 1.25 },
    });
    this.lungeDamage = elite ? Math.round(LUNGE_DAMAGE * ELITE.damage) : LUNGE_DAMAGE;
    this.rollTickDamage = elite ? Math.round(DEATHROLL_TICK_DAMAGE * ELITE.damage) : DEATHROLL_TICK_DAMAGE;
    // At home in the water (C1): the player wades at 50% in the deep bayou, this
    // does not. Out on dry ground you can still outpace it — in the water you
    // cannot, which is what makes the swamp its territory. See Enemy.ignoresTerrainSlow.
    this.ignoresTerrainSlow = true;
    this.setAlpha(LURK_ALPHA);
    // A gloam-gorged alligator should read as the biggest thing in the swamp
    // (the user: "the gators are too small"). The texture itself also grew to
    // 48x22; this scales it past every other common creature.
    this.setScale(elite ? ELITE.scale : S.scale);
    this.baseScale = elite ? ELITE.scale : S.scale;
    if (elite) this.speedMult = ELITE.speed;
  }

  update(delta: number, playerX: number, playerY: number, now: number): boolean {
    if (this.depleted) return false;
    const body = this.body as Phaser.Physics.Arcade.Body;
    const dist = Phaser.Math.Distance.Between(this.x, this.y, playerX, playerY);

    if (this.mode === "lunging") return this.updateLunge(delta, playerX, playerY, now);
    if (this.mode === "rolling") return this.updateDeathRoll(delta, playerX, playerY, now);

    if (this.mode === "lurk") {
      if (dist <= AMBUSH_RADIUS && now >= this.lungeCooldownUntil && this.canAggro(dist, now)) {
        this.surface();
        this.startLunge(now, playerX, playerY);
        return false;
      }
      // Creep into position while the player is near but not yet in ambush
      // range; otherwise hold still and wait (a lurking gator that patrols
      // reads wrong, and a slow invisible shove feels bad).
      if (dist <= STALK_RADIUS) {
        // Stalking a target it can't catch → drop the ambush and just hunt.
        if (this.stalkingSince < 0) this.stalkingSince = now;
        else if (now - this.stalkingSince >= STALK_PATIENCE_MS) {
          this.surface();
          return false;
        }
        const ang = Phaser.Math.Angle.Between(this.x, this.y, playerX, playerY);
        const spd = LURK_DRIFT * this.speedMult * this.envSpeedMult;
        const vx = Math.cos(ang) * spd;
        const vy = Math.sin(ang) * spd;
        body.setVelocity(vx, vy);
        this.applyFacing(vx, vy);
      } else {
        this.stalkingSince = -1; // player left stalk range — patience resets
        this.updateWander(body, now);
      }
      return false;
    }

    // --- hunting: surfaced and committed ---
    if (!this.isAttacking()) {
      if (dist > DEAGGRO_RADIUS && !this.withinAggroPersist(now)) {
        this.submerge();
        return false;
      }
      if (this.hasGivenUpPursuit(now)) {
        this.enterGivenUpState(now);
        this.submerge();
        return false;
      }
    }

    // In reach (or mid-swing) → chomp. Mid-range and off cooldown → re-lunge,
    // so a player who backs off to heal gets closed on rather than kited from.
    if (this.isAttacking() || dist <= CHOMP_SWING.reach + this.reachBonus()) {
      const hit = this.tickMeleeSwing(body, playerX, playerY, now, CHOMP_SWING);
      if (hit) {
        this.pendingBleed = { dmgPerSec: CHOMP_BLEED_DPS, durationMs: CHOMP_BLEED_MS };
        this.markAttackLanded(now);
        // The chomp LATCHES: a connected bite off cooldown rolls straight into
        // the death roll (C1). Only ever entered from a hit that already landed,
        // so it's a punish for being caught rather than another way to catch you.
        if (now >= this.rollCooldownUntil) this.startDeathRoll(now);
        return true;
      }
      return false;
    }
    if (dist <= AMBUSH_RADIUS && dist > CHOMP_SWING.reach + 30 && now >= this.lungeCooldownUntil) {
      this.startLunge(now, playerX, playerY);
      return false;
    }
    const ang = Phaser.Math.Angle.Between(this.x, this.y, playerX, playerY);
    const spd = CHASE_SPEED * this.speedMult * this.envSpeedMult;
    const vx = Math.cos(ang) * spd;
    const vy = Math.sin(ang) * spd;
    body.setVelocity(vx, vy);
    this.applyFacing(vx, vy);
    return false;
  }

  private updateWander(body: Phaser.Physics.Arcade.Body, now: number): void {
    if (now >= this.nextRoamAt) {
      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const d = Phaser.Math.Between(15, 40);
      this.wanderTgt = { x: this.x + Math.cos(angle) * d, y: this.y + Math.sin(angle) * d };
      this.nextRoamAt = now + Phaser.Math.Between(3000, 6000);
    }
    if (!this.wanderTgt) return;
    const d = Phaser.Math.Distance.Between(this.x, this.y, this.wanderTgt.x, this.wanderTgt.y);
    if (d < 4) {
      body.setVelocity(0, 0);
      return;
    }
    const angle = Phaser.Math.Angle.Between(this.x, this.y, this.wanderTgt.x, this.wanderTgt.y);
    body.setVelocity(Math.cos(angle) * LURK_DRIFT, Math.sin(angle) * LURK_DRIFT);
    this.applyFacing(Math.cos(angle), Math.sin(angle));
  }

  private surface(): void {
    this.mode = "hunting";
    this.setAlpha(1);
    this.startPursuit(this.scene.time.now);
  }

  // Back under the water after losing the player — it re-arms as an ambush
  // rather than idling in the open like a spent chaser.
  private submerge(): void {
    this.mode = "lurk";
    this.attackPhase = "none";
    this.stalkingSince = -1;
    // Abandon any in-flight roll cleanly — without this a submerge mid-roll
    // would leave the sprite rotated and a tick pending for the next surface.
    this.pendingRollHit = false;
    this.rollTicksDone = DEATHROLL_TICKS;
    this.setRotation(0);
    this.setAlpha(LURK_ALPHA);
    (this.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
    this.lungeCooldownUntil = this.scene.time.now + LUNGE_COOLDOWN_MS;
  }

  // Direction is LOCKED at wind-up start and never re-read — that's what makes
  // it genuinely sidestep-dodgeable (the Snake's old homing lunge is the
  // anti-pattern this roster deliberately doesn't copy).
  private startLunge(now: number, playerX: number, playerY: number): void {
    this.mode = "lunging";
    this.attackPhase = "windup";
    this.attackStartedAt = now;
    this.lungeAngle = Phaser.Math.Angle.Between(this.x, this.y, playerX, playerY);
    this.faceAngle(this.lungeAngle);
    this.playWindupTell(LUNGE_WINDUP_MS, 0x9ad46a); // sickly bayou-green jaw-open tell
    this.lungeTraveled = 0;
    this.lungeHit = false;
    (this.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
  }

  private updateLunge(delta: number, playerX: number, playerY: number, now: number): boolean {
    const body = this.body as Phaser.Physics.Arcade.Body;
    const elapsed = this.attackElapsed(now);

    if (this.attackPhase === "windup") {
      body.setVelocity(0, 0);
      if (elapsed >= LUNGE_WINDUP_MS) {
        this.attackPhase = "strike";
        this.attackStartedAt = now;
        this.endWindupTell();
        this.setAlpha(1); // bursts out of the water on the snap
        const spd = LUNGE_SPEED * this.speedMult;
        body.setVelocity(Math.cos(this.lungeAngle) * spd, Math.sin(this.lungeAngle) * spd);
      }
      return false;
    }

    if (this.attackPhase === "strike") {
      this.lungeTraveled += (LUNGE_SPEED * this.speedMult * delta) / 1000;
      const dist = Phaser.Math.Distance.Between(this.x, this.y, playerX, playerY);
      if (!this.lungeHit && dist <= LUNGE_HIT_RADIUS + this.reachBonus()) {
        this.lungeHit = true;
        this.pendingAttackKnockback = LUNGE_KNOCKBACK;
        this.pendingBleed = { dmgPerSec: LUNGE_BLEED_DPS, durationMs: LUNGE_BLEED_MS };
        this.overrideBite = this.lungeDamage; // the ambush chomp, not the normal one
        this.markAttackLanded(now);
        body.setVelocity(0, 0);
        this.attackPhase = "recover";
        this.attackStartedAt = now;
        return true;
      }
      if (this.lungeTraveled >= LUNGE_MAX_DIST) {
        body.setVelocity(0, 0);
        this.attackPhase = "recover";
        this.attackStartedAt = now;
      }
      return false;
    }

    // recover — beached and planted, the reward for sidestepping
    body.setVelocity(0, 0);
    if (elapsed >= LUNGE_RECOVER_MS) {
      this.attackPhase = "none";
      this.lungeCooldownUntil = now + LUNGE_COOLDOWN_MS;
      this.surface(); // a committed ambush always graduates into the hunt
    }
    return false;
  }

  // --- death roll (C1) ---

  private startDeathRoll(now: number): void {
    this.mode = "rolling";
    // Counts as "attacking" so the hunting-branch deaggro checks can't fire
    // mid-roll and the base playHitFeedback() skips its position-shake (the
    // standing "a committed attack plays out" rule).
    this.attackPhase = "strike";
    this.attackStartedAt = now;
    this.rollTicksDone = 0;
    this.rollNextTickAt = now + DEATHROLL_TICK_MS;
    this.rollEndsAt = 0;
    (this.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
  }

  private updateDeathRoll(delta: number, playerX: number, playerY: number, now: number): boolean {
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(0, 0); // latched in place — it's thrashing, not travelling

    // The spin is driven MANUALLY rather than by a tween: Enemy.playHitFeedback
    // calls killTweensOf(this) whenever a planted enemy is struck, which would
    // silently stop a rotation tween mid-roll and leave the sprite crooked.
    if (this.rollTicksDone < DEATHROLL_TICKS) {
      this.rotation += (DEATHROLL_SPIN_RAD_PER_SEC * delta) / 1000;
    }

    if (this.rollTicksDone < DEATHROLL_TICKS) {
      if (now >= this.rollNextTickAt) {
        this.rollTicksDone += 1;
        this.rollNextTickAt = now + DEATHROLL_TICK_MS;
        // Re-checked against the player's CURRENT position every tick, so
        // breaking away mid-roll genuinely cuts your losses.
        const dist = Phaser.Math.Distance.Between(this.x, this.y, playerX, playerY);
        if (dist <= DEATHROLL_RADIUS + this.reachBonus()) {
          this.pendingRollHit = true;
          this.markAttackLanded(now);
        }
        if (this.rollTicksDone >= DEATHROLL_TICKS) {
          // Out of thrashes → planted, dizzy, punishable.
          this.attackPhase = "recover";
          this.attackStartedAt = now;
          this.rollEndsAt = now + DEATHROLL_RECOVER_MS;
          this.setRotation(0); // stop crooked; upright facing takes over again
        }
      }
      return false;
    }

    if (now >= this.rollEndsAt) {
      this.attackPhase = "none";
      this.rollCooldownUntil = now + DEATHROLL_COOLDOWN_MS;
      this.mode = "hunting";
    }
    return false;
  }

  // Area-hit contract (the mini-boss/Sandmaw pattern): the scene queries this
  // right after update() and routes it through applyDamageToPlayer, so dash
  // i-frames and armor apply to a roll tick exactly like any other hit.
  checkPlayerHit(_playerX: number, _playerY: number): {
    damage: number;
    bleed?: { dmgPerSec: number; durationMs: number };
  } | null {
    if (!this.pendingRollHit) return null;
    this.pendingRollHit = false;
    return {
      damage: this.rollTickDamage,
      bleed: { dmgPerSec: DEATHROLL_BLEED_DPS, durationMs: DEATHROLL_BLEED_MS },
    };
  }

  // The ambush chomp hits far harder than the standing one, so the damage the
  // scene reads on the landing frame is that hit's, consumed once.
  get biteDamage(): number {
    if (this.overrideBite !== null) {
      const d = this.overrideBite;
      this.overrideBite = null;
      return d;
    }
    return super.biteDamage;
  }

  // Attacked while lurking → surface and hunt rather than sit there soaking hits
  // (Snake/Sandmaw/Hexling reveal-and-retaliate precedent).
  takeHit(damage: number): boolean {
    const depleted = super.takeHit(damage);
    if (!depleted && this.mode === "lurk") this.surface();
    return depleted;
  }

  // Hidden while lurking — the HP bar would give away a waiting ambush.
  isAggro(): boolean {
    return this.mode !== "lurk";
  }
}
