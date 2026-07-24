import Phaser from "phaser";
import { Enemy } from "./Enemy";
import type { ProjectileConfig, ProjectileHost } from "./Projectile";
import { enemyStat } from "../systems/enemyStats";

// Combat stats from the Phaser-free source of truth (also read by the balancing
// dashboard — tune there). attacks[0] = homing orb.
const S = enemyStat("corpselight");
const ELITE = S.elite!;

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

const AGGRO_RADIUS = 340;
// Trimmed 700→520 (the user playtest: "ranged dudes do not deaggro and they shoot
// at me with seemingly infinite range"). 700 was the Mirejaw's apex-predator
// commitment on a creature that never closes — it meant a haunt you'd walked
// well past was still lobbing orbs at you. A drifting wisp should lose interest.
const DEAGGRO_RADIUS = 520;
// The anti-kite governor every OTHER ranged attacker already respects (Hexling
// 250, Gremlin's projectile max) and this one was missing entirely: it would cast
// at any distance inside its deaggro radius. Past this it drifts in to get in
// range instead — which is what makes closing/retreating a real decision.
const CAST_RANGE = 380;
const PREFERRED_RANGE = 240; // hovers around this — drifts out if crowded, in if too far
const DRIFT_SPEED = 85; // a weightless float — still far under a sprint, it never runs you down
const WANDER_SPEED = 18;
const WANDER_RADIUS = 90;
// Stop-and-telegraph before each orb (the user: "dudes still don't stop when they
// shoot you"). It used to fire mid-drift with no tell at all — the one ranged
// creature in the game that ignored the souls-like windup contract. Now it plants
// (velocity 0), pulses, and only then releases: the plant IS the tell, and the
// window is what you dash out of.
const CAST_WINDUP_MS = 520;

const MAX_HEALTH = S.hp;
const ORB_DAMAGE = S.attacks[0].damage; // magic — bypasses armor entirely, so this IS very close to the net number
// Orb tuning (2026-07-22, the user: "the projectiles fade away really soon"). The
// first pass paired 110px/s with a 4.2s lifetime = a ~460px leash, so an orb
// died almost as soon as it was fired and the Corpselight read as harmless. Now
// 170px/s × 9s ≈ 1500px of pursuit — it genuinely chases you across a fight.
// The bound that keeps it FAIR is unchanged in spirit: 170 is still well under a
// bayou-tier sprint (166-229), so running in a straight line outruns it outright;
// the turn rate only punishes standing still or turning into it.
const ORB_SPEED = 170;
const ORB_TURN_RATE = 1.2; // rad/s — loosened 1.9→1.2 (2026-07-23): the orb was too sticky to shake; now movement/dash genuinely dodges it
// Hard expiry (a curving orb never trips distance-despawn). 9000 at 170px/s was
// ~1.5km of chase — the orb outlived the whole engagement. The Projectile miss
// rule ends most orbs well before this; this is just the backstop for one that
// never gets near enough to count as dodged.
// Trimmed 4200→3000 (≈510px of pursuit) alongside CAST_RANGE: the orb's reach and
// the caster's reach should agree, or the creature's effective range is really
// CAST_RANGE + orb travel and outrunning it never ends the threat.
const ORB_LIFETIME_MS = 3000;
const ORB_MAX_RANGE = 2200; // unused by the homing path, kept honest for the despawn contract
const CAST_COOLDOWN_MS = 1900;

export class Corpselight extends Enemy {
  private mode: HauntMode = "idle";
  private readonly spawnX: number;
  private readonly spawnY: number;
  private nextCastAt = 0;
  private wanderTgt: { x: number; y: number } | null = null;
  private nextRoamAt = 0;
  private readonly orbDamage: number;
  private bobPhase = 0;
  private castingUntil = 0; // >0 while planted mid-wind-up
  private castAimX = 0; // locked at wind-up start — the orb does NOT re-aim during the tell
  private castAimY = 0;

  constructor(scene: Phaser.Scene, cfg: { x: number; y: number; elite?: boolean }) {
    const elite = cfg.elite ?? false;
    super(scene, {
      x: cfg.x,
      y: cfg.y,
      texture: elite ? "corpselight_elite" : "corpselight",
      displayName: elite ? "Elite Corpselight" : "Corpselight",
      loot: elite
        ? [{ resource: "hex_essence", min: 6, max: 8 }]
        : [
            { resource: "gravemark_rubbing", min: 1, max: 1, chance: 0.06 },
            { resource: "hex_essence", min: 3, max: 5 },
          ],
      maxHealth: elite ? Math.round(MAX_HEALTH * ELITE.hp) : MAX_HEALTH,
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
    this.orbDamage = elite ? Math.round(ORB_DAMAGE * ELITE.damage) : ORB_DAMAGE;
    this.spawnX = cfg.x;
    this.spawnY = cfg.y;
    // Desynchronise the cast clock. A Drowned Lodge fields 2-3 haunts and they
    // all started at nextCastAt 0, so engaging one engaged a VOLLEY — every orb
    // arriving on the same beat forever after. Staggered, the same creatures
    // read as a rhythm you can weave through rather than a wall.
    this.nextCastAt = scene.time.now + Phaser.Math.Between(0, CAST_COOLDOWN_MS);
    if (elite) {
      this.speedMult = ELITE.speed;
      this.setScale(ELITE.scale);
      this.baseScale = ELITE.scale;
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
      this.abortCast();
      body.setVelocity(0, 0);
      return false;
    }
    if (this.hasGivenUpPursuit(now)) {
      this.mode = "idle";
      this.enterGivenUpState(now);
      this.abortCast();
      body.setVelocity(0, 0);
      return false;
    }

    if (Math.abs(playerX - this.x) > 3) this.setFlipX(playerX < this.x); // face the player without the tilt

    // Mid-cast: PLANTED. It has committed to this orb — it neither drifts nor
    // re-aims, so the wind-up is a real window (sidestep the line, or dash).
    if (this.castingUntil > 0) {
      body.setVelocity(0, 0);
      if (now >= this.castingUntil) {
        this.castingUntil = 0;
        this.endWindupTell();
        this.castOrb(this.castAimX, this.castAimY, now);
        this.nextCastAt = now + CAST_COOLDOWN_MS;
      }
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

    // Only ever casts from inside CAST_RANGE — outside it, the drift above is
    // closing the gap and no orb is coming.
    if (now >= this.nextCastAt && dist <= CAST_RANGE) {
      this.castingUntil = now + CAST_WINDUP_MS;
      this.castAimX = playerX;
      this.castAimY = playerY;
      this.playWindupTell(CAST_WINDUP_MS, 0xa98bff, 1.14);
    }
    return false;
  }

  // Drop a wind-up that will never resolve (deaggro/give-up mid-cast), so the
  // tell's tint and scale punch don't stick on an idle wisp.
  private abortCast(): void {
    if (this.castingUntil === 0) return;
    this.castingUntil = 0;
    this.endWindupTell();
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
    this.markAttackAttempted(now);
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
      sourceEnemy: this,
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
