import Phaser from "phaser";
import { Enemy } from "./Enemy";
import type { SwingConfig } from "./Enemy";
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
//
// C3 (2026-07-23): the TWO-FORM TRANSFORM. the user rejected the phase-out and
// blink ideas as done-before ("we've done untargetable windows and teleporting,
// get more creative") and asked for exactly this: close to melee and the wisp
// COLLAPSES into the drowned corpse the light was luring you toward — bigger,
// slow, and it swings a real physical maul (armor answers the husk, where it
// does nothing against the wisp's armor-bypassing orbs). Back off and it
// DISSOLVES back into the wisp. The player picks the fight: commit to melee and
// face the tanky husk, or kite and eat homing orbs indefinitely.
//
// The design rules that make it a fight rather than two statlines:
//   * ONE shared HP pool. Chipping the wisp at range is real progress — but the
//     husk takes reduced damage (HUSK_DAMAGE_TAKEN_MULT), so the same DPS goes
//     further at range. That's the reward for committing to a strategy.
//   * BOTH transitions hurt. The collapse is a telegraphed drop-slam; the
//     dissolve puffs gloam. Plus a transform COOLDOWN — so flickering at the
//     range boundary to dodge both forms is not free.
//   * The husk lumbers after you and DISSOLVES back on its own if you stay out
//     of its reach for a beat, so disengaging works but costs you ground.

type HauntMode = "idle" | "engaged" | "collapsing" | "husk" | "dissolving";

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

// --- C3 transform ---
// The wisp collapses into the husk when the player is this close (just past the
// husk's own melee reach, so getting into melee IS what triggers it).
const TRANSFORM_RANGE = 96;
// The husk dissolves back if the player stays beyond this for HUSK_REVERT_MS.
// Wider than TRANSFORM_RANGE so there's hysteresis — you can't sit exactly on
// the boundary and strobe the forms.
const HUSK_REVERT_RANGE = 190;
const HUSK_REVERT_MS = 2000;
// After ANY transform, neither can fire again for this long — the hard stop on
// boundary-flicker cheese.
const TRANSFORM_COOLDOWN_MS = 1600;
// The husk takes reduced damage: chipping the wisp at range is real progress,
// but a given DPS goes further at range than into the armored corpse. That's
// the whole "commit to a strategy" lever.
const HUSK_DAMAGE_TAKEN_MULT = 0.5;
const HUSK_SCALE = 1.7; // it looms once corporeal (vs the wisp's base ~1.3 elite / 1)
const HUSK_TINT = 0x6d8a6a; // waterlogged drowned-flesh green
const HUSK_CHASE_SPEED = 62; // slow — a lurching corpse; well under a sprint

// Collapse: a telegraphed drop-slam as the light crashes down into a body.
const COLLAPSE_WINDUP_MS = 560; // the tell — you can be clear before it lands
const COLLAPSE_SLAM_RADIUS = 104;
const COLLAPSE_SLAM_DAMAGE = S.attacks[2].damage; // magic AoE — bypasses armor
const COLLAPSE_SLAM_KNOCKBACK = 150;
// Dissolve: a smaller gloam puff as the body comes apart back into light.
const DISSOLVE_MS = 420;
const DISSOLVE_PUFF_RADIUS = 84;
const DISSOLVE_PUFF_DAMAGE = Math.round(S.attacks[2].damage * 0.5);

// The husk's physical maul (armor answers this, unlike the orb).
const HUSK_MAUL_DAMAGE = S.attacks[1].damage;
const HUSK_MAUL_SWING: SwingConfig = {
  reach: 74,
  windupMs: 520,
  strikeMs: 100,
  recoverMs: 560, // the punish window — a slow corpse is punishable between swings
  cooldownMs: 480,
  knockback: 130,
  tell: { punchScale: 1.28, color: 0x8fbf7a },
};

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
  // --- C3 transform state ---
  private readonly wispScale: number; // the resting wisp size, to restore on dissolve
  private transformReadyAt = 0; // no transform until now — anti-flicker
  private collapseEndsAt = 0; // >0 while the collapse telegraph plays
  private dissolveEndsAt = 0; // >0 while dissolving back
  private outOfReachSince = -1; // when the player left husk reach (-1 = in reach / not husk)
  private readonly huskMaulDamage: number;
  private readonly collapseSlamDamage: number;
  private readonly dissolvePuffDamage: number;
  // Set the frame a transform's AoE resolves; drained by checkPlayerHit().
  private pendingAreaHit: { damage: number; radius: number; knockback: number } | null = null;

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
      // Resistances/weaknesses removed (2026-07-24, the user) — damage-type layer retired.
      upright: true, // a hovering wisp-shroud — mirror, never rotate
    });
    this.orbDamage = elite ? Math.round(ORB_DAMAGE * ELITE.damage) : ORB_DAMAGE;
    const dmgMult = elite ? ELITE.damage : 1;
    this.huskMaulDamage = Math.round(HUSK_MAUL_DAMAGE * dmgMult);
    this.collapseSlamDamage = Math.round(COLLAPSE_SLAM_DAMAGE * dmgMult);
    this.dissolvePuffDamage = Math.round(DISSOLVE_PUFF_DAMAGE * dmgMult);
    this.wispScale = elite ? ELITE.scale : 1;
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

    // --- C3 transform modes: handled before the wisp logic below ---
    if (this.mode === "collapsing") return this.updateCollapse(playerX, playerY, now);
    if (this.mode === "dissolving") return this.updateDissolve(now);
    if (this.mode === "husk") return this.updateHusk(delta, playerX, playerY, now);

    // A slow vertical bob so it reads as floating rather than walking. Purely
    // cosmetic (it rides rotation, not position, so it can't desync the body).
    // Wisp-only — the husk lurches, it doesn't hover.
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

    // C3: the player closed to melee → the wisp COLLAPSES into the husk. Gated
    // on the transform cooldown so you can't strobe the forms at the boundary.
    // An in-flight cast is abandoned — the light is crashing down, not shooting.
    if (dist <= TRANSFORM_RANGE && now >= this.transformReadyAt) {
      this.abortCast();
      this.startCollapse(now);
      return false;
    }

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

  // --- C3 transform handlers ---

  private startCollapse(now: number): void {
    this.mode = "collapsing";
    this.collapseEndsAt = now + COLLAPSE_WINDUP_MS;
    this.setRotation(0); // stop the wisp bob; it's crashing down
    (this.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
    this.playWindupTell(COLLAPSE_WINDUP_MS, 0x8fbf7a, 1.35);
    // Attempted, not landed — the slam may be dodged (see the split rule).
    this.markAttackAttempted(now);
  }

  // Telegraphed drop-slam, then it's a corpse. The slam re-checks the player's
  // CURRENT position (below, in checkPlayerHit's caller frame) so stepping out
  // of the growing tell before it lands dodges it.
  private updateCollapse(playerX: number, playerY: number, now: number): boolean {
    (this.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
    if (now < this.collapseEndsAt) return false;
    this.endWindupTell();
    // Land the slam if the player is still inside it.
    const dist = Phaser.Math.Distance.Between(this.x, this.y, playerX, playerY);
    if (dist <= COLLAPSE_SLAM_RADIUS + this.reachBonus()) {
      this.pendingAreaHit = {
        damage: this.collapseSlamDamage,
        radius: COLLAPSE_SLAM_RADIUS,
        knockback: COLLAPSE_SLAM_KNOCKBACK,
      };
    }
    // Become the husk.
    this.mode = "husk";
    this.setScale(HUSK_SCALE);
    this.baseScale = HUSK_SCALE;
    this.setTint(HUSK_TINT);
    this.outOfReachSince = -1;
    this.transformReadyAt = now + TRANSFORM_COOLDOWN_MS;
    this.attackPhase = "none";
    return false;
  }

  private updateHusk(delta: number, playerX: number, playerY: number, now: number): boolean {
    const body = this.body as Phaser.Physics.Arcade.Body;
    const dist = Phaser.Math.Distance.Between(this.x, this.y, playerX, playerY);

    // Revert-on-distance: if the player stays out of the husk's reach long
    // enough (and the transform cooldown has elapsed), it dissolves back into
    // the wisp — disengaging works, but the dissolve puff makes it cost ground.
    if (!this.isAttacking()) {
      if (dist > HUSK_REVERT_RANGE) {
        if (this.outOfReachSince < 0) this.outOfReachSince = now;
        else if (now - this.outOfReachSince >= HUSK_REVERT_MS && now >= this.transformReadyAt) {
          this.startDissolve(now);
          return false;
        }
      } else {
        this.outOfReachSince = -1;
      }
      // Full deaggro / give-up while a corpse → dissolve back rather than idle
      // as a husk (an idle husk in the water reads wrong).
      if (
        (dist > DEAGGRO_RADIUS && !this.withinAggroPersist(now)) ||
        this.hasGivenUpPursuit(now)
      ) {
        if (this.hasGivenUpPursuit(now)) this.enterGivenUpState(now);
        this.startDissolve(now);
        return false;
      }
    }

    // In reach (or mid-swing) → maul. Else lurch toward the player.
    if (this.isAttacking() || dist <= HUSK_MAUL_SWING.reach + this.reachBonus()) {
      const hit = this.tickMeleeSwing(body, playerX, playerY, now, HUSK_MAUL_SWING);
      if (hit) {
        this.markAttackLanded(now);
        return true; // physical maul — the boolean-bite path (armor applies)
      }
      return false;
    }
    const ang = Phaser.Math.Angle.Between(this.x, this.y, playerX, playerY);
    const spd = HUSK_CHASE_SPEED * this.speedMult * this.envSpeedMult;
    body.setVelocity(Math.cos(ang) * spd, Math.sin(ang) * spd);
    if (Math.abs(Math.cos(ang)) > 0.1) this.setFlipX(Math.cos(ang) < 0);
    return false;
  }

  private startDissolve(now: number): void {
    this.mode = "dissolving";
    this.dissolveEndsAt = now + DISSOLVE_MS;
    this.attackPhase = "none";
    (this.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
    // The gloam puff resolves immediately (a quick pop, not a telegraphed
    // heave) — its cost is paid the instant the corpse comes apart.
    this.pendingAreaHit = { damage: this.dissolvePuffDamage, radius: DISSOLVE_PUFF_RADIUS, knockback: 0 };
  }

  private updateDissolve(now: number): boolean {
    (this.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
    if (now < this.dissolveEndsAt) return false;
    // Back to the wisp.
    this.mode = "engaged";
    this.setScale(this.wispScale);
    this.baseScale = this.wispScale;
    this.applyHpTint(); // restore the HP-based tint (drop the husk green)
    this.outOfReachSince = -1;
    this.transformReadyAt = now + TRANSFORM_COOLDOWN_MS;
    this.nextCastAt = now + CAST_COOLDOWN_MS; // a beat before it starts casting again
    return false;
  }

  // Area-hit contract (mini-boss/Sandmaw pattern): the scene queries this right
  // after update() and routes it through applyDamageToPlayer, so dash i-frames
  // and armor-vs-magic apply to the collapse slam / dissolve puff exactly like
  // any other hit. Both are `magic` (gloam bursts bypass flat armor), which is
  // the deliberate contrast with the husk maul's physical damage.
  checkPlayerHit(_playerX: number, _playerY: number): {
    damage: number;
    knockback?: number;
    dmgType: "magic";
  } | null {
    if (!this.pendingAreaHit) return null;
    const h = this.pendingAreaHit;
    this.pendingAreaHit = null;
    return { damage: h.damage, knockback: h.knockback || undefined, dmgType: "magic" };
  }

  // Whether the creature is in a corporeal (husk / mid-collapse) form right now
  // — drives the reduced-damage rule in takeHit.
  private isCorporeal(): boolean {
    return this.mode === "husk" || this.mode === "collapsing";
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
    // C3: the corporeal husk soaks damage — chipping the wisp at range is real
    // progress, but a given DPS goes further at range than into the corpse. This
    // is on top of the fire/magic weakness (applied earlier in resolveWeaponHit),
    // so a fire weapon still bites a husk harder than a physical one does.
    const effective = this.isCorporeal() ? damage * HUSK_DAMAGE_TAKEN_MULT : damage;
    const depleted = super.takeHit(effective);
    if (!depleted && this.mode === "idle") {
      this.mode = "engaged";
      this.startPursuit(this.scene.time.now);
    }
    return depleted;
  }

  // The husk maul is the ONLY source of the boolean-bite contract for this
  // creature (the wisp deals damage via projectiles + the transform AoEs via
  // checkPlayerHit), so biteDamage always reports the maul's physical hit. 0 in
  // wisp form is never read, since the wisp never returns true from update().
  get biteDamage(): number {
    return this.huskMaulDamage;
  }

  isAggro(): boolean {
    return this.mode !== "idle";
  }
}
