import Phaser from "phaser";
import { Enemy } from "./Enemy";
import type { SwingConfig } from "./Enemy";

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

type MirejawMode = "lurk" | "lunging" | "hunting";

const AMBUSH_RADIUS = 150; // lurking, player this close → commit the lunge
const STALK_RADIUS = 300; // lurking, drifts toward a player inside this to line one up
const LURK_DRIFT = 26; // px/s — a submerged gator repositioning, deliberately slow
const LURK_ALPHA = 0.4; // half-sunk, not invisible (cf. Sandmaw's 0.18)

const CHASE_SPEED = 66; // surfaced hunt — slower than the player, so it's escapable on foot
const DEAGGRO_RADIUS = 460;

const MAX_HEALTH = 130; // the bayou's tanky regular (badlands topped out at Hexling 95)

// The ambush: a long telegraph, then a fast locked-line lunge. Big enough to
// take a third of a bayou-geared player's HP through Gloamsteel plate, which is
// the point — being caught flat-footed at the water's edge should hurt.
const LUNGE_WINDUP_MS = 430; // jaw-open/coil tell — the sidestep window
const LUNGE_SPEED = 400;
const LUNGE_MAX_DIST = 215;
const LUNGE_HIT_RADIUS = 38;
const LUNGE_DAMAGE = 85;
const LUNGE_KNOCKBACK = 150;
const LUNGE_RECOVER_MS = 720; // beached/planted after the snap — the punish window
const LUNGE_COOLDOWN_MS = 3200;
// Signature death-roll bleed: the chomp doesn't just hit, it tears.
const LUNGE_BLEED_DPS = 7;
const LUNGE_BLEED_MS = 6000;

// The surfaced melee chomp — its bread-and-butter once hunting.
const CHOMP_DAMAGE = 62;
const CHOMP_BLEED_DPS = 5;
const CHOMP_BLEED_MS = 4000;
const CHOMP_SWING: SwingConfig = {
  reach: 40, // a big head on a big body
  windupMs: 460,
  strikeMs: 90,
  recoverMs: 520,
  cooldownMs: 500,
  knockback: 80,
};

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
            { resource: "mirehide", min: 1, max: 2 },
            { resource: "mirejaw_meat", min: 1, max: 2 },
          ],
      maxHealth: elite ? Math.round(MAX_HEALTH * 1.5) : MAX_HEALTH,
      biteDamage: elite ? Math.round(CHOMP_DAMAGE * 1.5) : CHOMP_DAMAGE,
      elite,
      eliteTrophy: "mirejaw_trophy",
      // Overlapping bony scutes turn a thrust; the belly under them doesn't like
      // an edge. Deliberately the INVERSE of the Fenlurker (resist slash / weak
      // blunt) and distinct from the Mosswretch (resist blunt / weak fire), so
      // all three physical types have a bayou creature they beat — the same
      // spread the badlands used to make carrying two weapons matter.
      resistances: { pierce: 0.5, slash: 1.25 },
    });
    this.lungeDamage = elite ? Math.round(LUNGE_DAMAGE * 1.5) : LUNGE_DAMAGE;
    this.setAlpha(LURK_ALPHA);
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

    if (this.mode === "lunging") return this.updateLunge(delta, playerX, playerY, now);

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
        const ang = Phaser.Math.Angle.Between(this.x, this.y, playerX, playerY);
        const spd = LURK_DRIFT * this.speedMult * this.envSpeedMult;
        const vx = Math.cos(ang) * spd;
        const vy = Math.sin(ang) * spd;
        body.setVelocity(vx, vy);
        this.applyFacing(vx, vy);
      } else {
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
