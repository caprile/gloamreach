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

export class Mosswretch extends Enemy {
  private wanderTgt: { x: number; y: number } | null = null;
  private nextRoamAt = 0;

  constructor(scene: Phaser.Scene, cfg: { x: number; y: number; elite?: boolean }) {
    const elite = cfg.elite ?? false;
    super(scene, {
      x: cfg.x,
      y: cfg.y,
      texture: elite ? "mosswretch_elite" : "mosswretch",
      displayName: elite ? "Elite Mosswretch" : "Mosswretch",
      // A husk of dead wood and living moss comes apart into exactly that —
      // reusing existing keys rather than inventing a bespoke drop for it.
      loot: elite
        ? [
            { resource: "swamp_moss", min: 4, max: 6 },
            { resource: "wood", min: 3, max: 4 },
          ]
        : [
            { resource: "gravemark_rubbing", min: 1, max: 1, chance: 0.06 },
            { resource: "swamp_moss", min: 2, max: 3 },
            { resource: "wood", min: 1, max: 2 },
          ],
      maxHealth: elite ? Math.round(MAX_HEALTH * ELITE.hp) : MAX_HEALTH,
      biteDamage: elite ? Math.round(SMASH_DAMAGE * ELITE.damage) : SMASH_DAMAGE,
      elite,
      eliteTrophy: "mosswretch_trophy",
      // Spongy sodden moss eats a concussive blow; an edge parts it; fire is the
      // real answer (×1.5 — deliberately above the biome-2-normalized ×1.25, this
      // is the one creature meant to visibly melt to fire).
      resistances: { blunt: 0.5, slash: 1.25, fire: 1.5 },
      upright: true, // a shambling humanoid husk — mirror, never rotate
      barScale: 1.3, // bigger sprite, readable bar
    });
    this.setScale(elite ? ELITE.scale : S.scale); // looms over the rest of the roster
    this.baseScale = elite ? ELITE.scale : S.scale;
    if (elite) this.speedMult = ELITE.speed;
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

    if (this.state === "chasing") {
      if (this.isAttacking() || dist <= SMASH_SWING.reach + this.reachBonus()) {
        const hit = this.tickMeleeSwing(body, playerX, playerY, now, SMASH_SWING);
        if (hit) {
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
        this.applyFacing(Math.cos(angle), Math.sin(angle));
      }
    }
    return false;
  }
}
