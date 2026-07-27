import Phaser from "phaser";
import { Enemy } from "./Enemy";
import type { SwingConfig } from "./Enemy";
import { enemyStat } from "../systems/enemyStats";

// Combat stats from the Phaser-free source of truth (also read by the balancing
// dashboard — tune there). attacks[0] = smash.
const S = enemyStat("mosswretch");
const ELITE = S.elite!;

// Mosswretch — the bayou's BRUISER (biome 3 Phase 4b), the Cragscale analog. A
// shambling husk of waterlogged deadwood under a shroud of hanging moss: very
// slow, very tanky, and it hits like a falling tree. One attack, one rule —
// its overhead smash has the longest wind-up in the common roster (780ms), so
// every single hit it lands is a hit you chose not to walk out of.
//
// It is the roster's FIRE lesson. Sun-dried moss over dead wood burns: it takes
// ×1.5 from fire, the biggest weakness multiplier on any common enemy, which is
// what finally makes the player's fire sources (Ember Brand, the Embersteel /
// Gloamsteel set-bonus novas and thorns) a deliberate answer to a specific
// creature rather than incidental damage. In exchange, blunt barely registers —
// you can't concuss a bundle of moss.
//
// Drives the BASE `state` machine (idle/chasing) with its own numbers: a slow
// straight-line chaser is exactly what the base machine models, so unlike the
// ambushers there's no reason for a bespoke mode field here.

const AGGRO_RADIUS = 250;
const DEAGGRO_RADIUS = 560;
// Still the SLOWEST common enemy and still outwalkable — that's the bruiser's
// deal. 36 was comically slow though (a player could circle it at a stroll);
// 74 means disengaging is a decision, not an afterthought.
const CHASE_SPEED = 74;
const WANDER_SPEED = 16;

const MAX_HEALTH = S.hp; // the wall: ~7-8 bayou-tier hits, and it does not flinch

// The smash. Huge reach, huge damage, huge tell — and a long recovery, so
// baiting it out is the intended way to fight one.
const SMASH_DAMAGE = S.attacks[0].damage; // heavy telegraphed overhead — big but no longer a one-shot
const SMASH_SWING: SwingConfig = {
  reach: 88, // long arms + a wide sweep — backing off half a step is NOT enough
  windupMs: 780,
  strikeMs: 110,
  recoverMs: 720, // the punish window; a whole weapon combo fits in it
  cooldownMs: 620,
  // the user playtest: "mosswretch attack is hard to predict". The swing was
  // always dodgeable — the hit is re-checked against your CURRENT position at
  // the strike frame — but nothing about the default tell said how FAR to go,
  // and reach 88 is far enough that stepping back half a pace fails. It now
  // rears visibly back and swells much larger in a sickly green: the rear-back
  // is the read, and its size is the reach.
  tell: { punchScale: 1.4, color: 0x8fd06a, rearBackSpeed: 46 },
  knockback: 300,
};
// Enfeeble carried by a landed smash — the TOP of the 5-10s band
// (DEBUFF_BASE_MS), and the longest debuff in the game on purpose: unlike the
// three lockouts it never stops you playing, so it can only be felt by
// outlasting several swing cycles. 6s -> 10s (2026-07-26) with the band.
// -30% is deliberately under the damage swing a single crit already produces.
const SMASH_ENFEEBLE_MS = 10000;
const SMASH_ENFEEBLE_MAG = 0.3;

// --- C2 (2026-07-23): the SPORE BURST and the death-spawn ---
//
// the user: it "lacks attack moves" and "feels a bit weird." Both complaints
// have the same root — a creature whose entire kit is one slow overhead swing,
// on the slowest body in the game, is trivially walked away from. These two
// additions answer that without making it faster (its slowness is the point):
//
//   * It can't CATCH you, so it STOPS you. The spore burst is a mid-range
//     ground-slam that leaves a lingering cloud which slows and poisons. It
//     deals no impact damage at all — the cloud is the payload, and its job is
//     to cut off the ground you were going to retreat across so the next smash
//     becomes a real threat. Used only at mid-range (in smash reach it just
//     smashes), so the two attacks never compete for the same moment.
//   * It doesn't die cleanly. A husk of animate moss comes apart INTO smaller
//     husks — so killing one in a bad spot costs you.
const SPORE_RANGE_MIN = 90; // just past smash reach — never used point-blank
const SPORE_RANGE_MAX = 300;
const SPORE_WINDUP_MS = 700; // a heavy planted heave; you can be gone before it lands
const SPORE_RECOVER_MS = 620;
const SPORE_COOLDOWN_MS = S.attacks[1].intervalMs;
const SPORE_TELL_COLOR = 0xb7e07a;

const DEATH_SPAWN_COUNT = 3;
// A spawnling is the same creature scaled down — same AI, no new entity class,
// no new texture (the placeholder-art ethos). Deliberately fragile and quick:
// the threat is being swarmed at the exact moment you'd started to relax.
const SPAWNLING_SCALE = 0.58;
const SPAWNLING_HP_FRAC = 0.16;
const SPAWNLING_DMG_FRAC = 0.42;
const SPAWNLING_SPEED_MULT = 1.9; // still not fast, but no longer strollable-away-from

export class Mosswretch extends Enemy {
  private wanderTgt: { x: number; y: number } | null = null;
  private nextRoamAt = 0;
  // True for a husk spawned by another husk's death (C2). A spawnling never
  // spawns more on its own death — that's the recursion guard, and it's also
  // just correct: there's nothing left to come apart.
  readonly isSpawnling: boolean;
  // --- spore burst state ---
  private sporeCooldownUntil = 0;
  private sporeWindupEndsAt = 0;
  private sporeRecoverEndsAt = 0;
  private casting = false;
  // Set the frame the burst resolves; drained by the scene (consumeSporeCloud).
  private pendingCloud: { x: number; y: number } | null = null;

  constructor(
    scene: Phaser.Scene,
    cfg: { x: number; y: number; elite?: boolean; spawnling?: boolean; eliteParent?: boolean },
  ) {
    const elite = cfg.elite ?? false;
    const spawnling = cfg.spawnling ?? false;
    // An elite husk now comes apart into elite-GRADE Mosslings (the user: "elite
    // tree guys need to drop elite mosslings"). Deliberately a separate flag from
    // `elite` rather than just passing elite through: it buys the stats, scale and
    // colour of an elite, but NOT elite status itself. That keeps both existing
    // guards intact — a spawnling still drops no trophy, and still scores as a
    // normal kill — so splitting an elite can't become a trophy or points fountain.
    const eliteSpawn = spawnling && (cfg.eliteParent ?? false);
    const spawnHp = SPAWNLING_HP_FRAC * (eliteSpawn ? ELITE.hp : 1);
    const spawnDmg = SPAWNLING_DMG_FRAC * (eliteSpawn ? ELITE.damage : 1);
    super(scene, {
      x: cfg.x,
      y: cfg.y,
      texture: elite ? "mosswretch_elite" : "mosswretch",
      displayName: spawnling
        ? eliteSpawn
          ? "Elite Mossling"
          : "Mossling"
        : elite
          ? "Elite Mosswretch"
          : "Mosswretch",
      // A husk of dead wood and living moss comes apart into exactly that —
      // reusing existing keys rather than inventing a bespoke drop for it.
      // A spawnling is a scrap of the parent, not a second full creature — a
      // token drop so a killed pack isn't literally worthless, but nowhere near
      // enough to make farming the death-spawn better than killing the parent.
      loot: spawnling
        ? [{ resource: "swamp_moss", min: 1, max: 1 }]
        : elite
          ? [
              { resource: "swamp_moss", min: 4, max: 6 },
              { resource: "wood", min: 3, max: 4 },
            ]
          : [
              { resource: "gravemark_rubbing", min: 1, max: 1, chance: 0.06 },
              { resource: "swamp_moss", min: 2, max: 3 },
              { resource: "wood", min: 1, max: 2 },
            ],
      maxHealth: spawnling
        ? Math.max(1, Math.round(MAX_HEALTH * spawnHp))
        : elite
          ? Math.round(MAX_HEALTH * ELITE.hp)
          : MAX_HEALTH,
      biteDamage: spawnling
        ? Math.round(SMASH_DAMAGE * spawnDmg)
        : elite
          ? Math.round(SMASH_DAMAGE * ELITE.damage)
          : SMASH_DAMAGE,
      // A spawnling is never elite — it must not drop a trophy, or one elite
      // kill would pay out four.
      elite: spawnling ? false : elite,
      eliteTrophy: "mosswretch_trophy",
      // Resistances/weaknesses removed (2026-07-24, the user) — damage-type layer retired.
      upright: true, // a shambling humanoid husk — mirror, never rotate
      barScale: spawnling ? 0.7 : 1.3,
    });
    this.isSpawnling = spawnling;
    const scale = spawnling
      ? SPAWNLING_SCALE * (eliteSpawn ? ELITE.scale : 1)
      : elite
        ? ELITE.scale
        : S.scale;
    this.setScale(scale); // looms over the rest of the roster
    this.baseScale = scale;
    if (spawnling) {
      this.speedMult = SPAWNLING_SPEED_MULT * (eliteSpawn ? ELITE.speed : 1);
      // A paler, sicklier green so a spawnling reads as a fragment at a glance
      // rather than looking like a distant full-size Mosswretch. An elite-grade
      // one takes the roster's crimson/gold elite tint instead, so a dangerous
      // split is readable at the moment it happens.
      this.setTint(eliteSpawn ? 0xd98a5a : 0xa8c98a);
    } else if (elite) {
      this.speedMult = ELITE.speed;
    }
  }

  // How many husks this one comes apart into. The scene resolves the actual
  // spawn (see MainScene.resolveKill) — same "the creature asks, the scene
  // spawns" split the Miretyrant's bellow uses, which is what gets the
  // spawnlings terrain collision, dungeon nav and containment for free.
  deathSpawnCount(): number {
    return this.isSpawnling ? 0 : DEATH_SPAWN_COUNT;
  }

  private startSporeBurst(now: number): void {
    this.casting = true;
    this.sporeWindupEndsAt = now + SPORE_WINDUP_MS;
    this.sporeRecoverEndsAt = 0;
    (this.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
    this.playWindupTell(SPORE_WINDUP_MS, SPORE_TELL_COLOR, 1.25);
  }

  // Planted heave → the cloud drops on the player's ground position AT THE
  // MOMENT IT RESOLVES (not a locked spot from wind-up start), so standing
  // still through the tell is what gets you covered; moving during it means the
  // cloud lands where you WERE. Then a long planted recovery — the punish.
  private tickSporeBurst(
    body: Phaser.Physics.Arcade.Body,
    playerX: number,
    playerY: number,
    now: number,
  ): boolean {
    body.setVelocity(0, 0);
    if (this.sporeRecoverEndsAt === 0) {
      if (now < this.sporeWindupEndsAt) return false;
      this.endWindupTell();
      this.pendingCloud = { x: playerX, y: playerY };
      this.sporeRecoverEndsAt = now + SPORE_RECOVER_MS;
      // Attempted, not landed: the cloud may well be dodged, so this must not
      // reset the give-up clock (the markAttackLanded/-Attempted split).
      this.markAttackAttempted(now);
      return false;
    }
    if (now >= this.sporeRecoverEndsAt) {
      this.casting = false;
      this.sporeCooldownUntil = now + SPORE_COOLDOWN_MS;
    }
    return false;
  }

  // Drained by the scene each frame; non-null on the frame a burst resolves.
  consumeSporeCloud(): { x: number; y: number } | null {
    const c = this.pendingCloud;
    this.pendingCloud = null;
    return c;
  }

  update(_delta: number, playerX: number, playerY: number, now: number): boolean {
    if (this.depleted) return false;
    const body = this.body as Phaser.Physics.Arcade.Body;
    const dist = Phaser.Math.Distance.Between(this.x, this.y, playerX, playerY);

    if (this.state === "idle" && dist <= AGGRO_RADIUS && this.canAggro(dist, now)) {
      this.state = "chasing";
      this.startPursuit(now);
    } else if (this.state === "chasing" && !this.isAttacking()) {
      if (dist > DEAGGRO_RADIUS && !this.withinAggroPersist(now)) {
        this.state = "idle";
      } else if (this.hasGivenUpPursuit(now)) {
        this.state = "idle";
        this.enterGivenUpState(now);
      }
    }

    // Spore burst runs BEFORE the smash branch but only fires outside smash
    // reach, so the two attacks never contend for the same moment: point-blank
    // it always smashes, mid-range it denies the ground instead.
    if (this.casting) return this.tickSporeBurst(body, playerX, playerY, now);

    if (this.state === "chasing") {
      if (
        !this.isAttacking() &&
        !this.isSpawnling && // fragments are just angry, not spore-bearing
        now >= this.sporeCooldownUntil &&
        dist > SPORE_RANGE_MIN + this.reachBonus() &&
        dist <= SPORE_RANGE_MAX
      ) {
        this.startSporeBurst(now);
        return false;
      }
      if (this.isAttacking() || dist <= SMASH_SWING.reach + this.reachBonus()) {
        const hit = this.tickMeleeSwing(body, playerX, playerY, now, SMASH_SWING);
        if (hit) {
          // ENFEEBLE — the bayou debuff system's teacher for it. It goes on the
          // SMASH rather than the spore cloud on purpose: the cloud is routed
          // through environmentEffectAt, which makes it terrain, and terrain is
          // deliberately undispellable (locked). Putting it on the overhead also
          // means the counterplay is the one the creature is already built
          // around — bait the 780ms wind-up out and you never take it.
          //
          // Read: the wretch caves your guard in, so you hit softer until you
          // shake it off. Scene-side it multiplies the same additive damage
          // bucket every other source uses.
          this.pendingDebuff = { kind: "enfeeble", durationMs: SMASH_ENFEEBLE_MS, magnitude: SMASH_ENFEEBLE_MAG };
          this.markAttackLanded(now);
          return true;
        }
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

    if (now >= this.nextRoamAt) {
      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const d = Phaser.Math.Between(15, 35);
      this.wanderTgt = { x: this.x + Math.cos(angle) * d, y: this.y + Math.sin(angle) * d };
      this.nextRoamAt = now + Phaser.Math.Between(3500, 6500);
    }
    if (this.wanderTgt) {
      const d = Phaser.Math.Distance.Between(this.x, this.y, this.wanderTgt.x, this.wanderTgt.y);
      if (d < 4) {
        body.setVelocity(0, 0);
      } else {
        const angle = Phaser.Math.Angle.Between(this.x, this.y, this.wanderTgt.x, this.wanderTgt.y);
        body.setVelocity(Math.cos(angle) * WANDER_SPEED, Math.sin(angle) * WANDER_SPEED);
        this.faceAngle(angle);
      }
    }
    return false;
  }
}
