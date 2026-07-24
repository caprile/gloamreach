import Phaser from "phaser";
import { Enemy } from "./Enemy";
import type { SwingConfig } from "./Enemy";
import { enemyStat } from "../systems/enemyStats";

// Combat stats from the Phaser-free source of truth (also read by the balancing
// dashboard — tune numbers there). attacks[0] = claw.
const S = enemyStat("murkling");
const ELITE = S.elite!;

// Murkling — the bayou's FAST MELEE SWARM (biome 3 Phase 4b), the Duskrunner
// analog. Small gloam-warped sprite-beasts that boil out of the reeds in packs
// and claw at you with almost no wind-up. Individually trivial (22 HP, one
// weapon swing); the threat is five of them at once, which is exactly the AOE-arc
// payoff enemy the Phase-1 weapon-arc work exists for.
//
// Like the Duskrunner it drives the BASE `state` field, so the inherited
// forceAggro()/isAggro() work with zero override — the reference pack-aggro
// shape. Its distinguishing trait vs the Duskrunner is that it does NOT pounce:
// it just SWARMS, closing in a loose weave so a pack doesn't stack into one
// pixel, and it keeps the shortest telegraph in the game (a flicker, not a tell).

const AGGRO_RADIUS = 300;
const DEAGGRO_RADIUS = 640;
// 172px/s — the FASTEST thing in the bayou and the only creature that can hang
// with a sprinting player (166-229 depending on Running/relics). That IS the
// swarm's identity: you cannot outrun a Murkling nest, you kill it, sweep it
// with an AOE arc, or blink out. Every other bayou creature is escapable on
// foot; this one makes you spend something.
const CHASE_SPEED = S.moveSpeed;
const WANDER_SPEED = 30;
const MELEE_RANGE = 26;
const PACK_AGGRO_RADIUS = 340; // wide: one Murkling waking means the whole reed-bed wakes

const MAX_HEALTH = S.hp; // still ~one bayou-tier hit for a strong weapon — by design
// 62 raw. Bayou armor is thick (Gloamsteel full set = 42 flat), so a swarm unit
// needs a real number to land more than the floor-of-1 chip; at 62 it nets ~20
// through full plate and ~32 through Mirehide light — with 4-6 of them swinging
// on a 130ms cooldown, a nest you ignore genuinely kills you.
const CLAW_DAMAGE = S.attacks[0].damage;

// The shortest swing in the roster — a skitter-and-slash, not a telegraphed
// commitment. You don't dodge an individual Murkling claw; you kill the pack or
// leave. (Contrast the Mosswretch's 780ms overhead smash, which is ALL dodge.)
const CLAW_SWING: SwingConfig = {
  reach: MELEE_RANGE,
  windupMs: 150,
  strikeMs: 50,
  recoverMs: 170,
  cooldownMs: 130,
};

// Loose approach weave: each Murkling carries a fixed angular offset so a pack
// fans out around the player instead of converging into one overlapping blob.
const SWARM_SPREAD = 0.55; // radians of peak off-axis deflection

export class Murkling extends Enemy {
  private wanderTgt: { x: number; y: number } | null = null;
  private nextRoamAt = 0;
  private readonly weaveOffset: number;

  constructor(scene: Phaser.Scene, cfg: { x: number; y: number; elite?: boolean }) {
    const elite = cfg.elite ?? false;
    super(scene, {
      x: cfg.x,
      y: cfg.y,
      texture: elite ? "murkling_elite" : "murkling",
      displayName: elite ? "Elite Murkling" : "Murkling",
      loot: elite
        ? [{ resource: "gloam_dust", min: 2, max: 3 }]
        : [
            { resource: "gravemark_rubbing", min: 1, max: 1, chance: 0.06 },
            { resource: "gloam_dust", min: 1, max: 2 },
          ],
      maxHealth: elite ? Math.round(MAX_HEALTH * ELITE.hp) : MAX_HEALTH,
      biteDamage: elite ? Math.round(CLAW_DAMAGE * ELITE.damage) : CLAW_DAMAGE,
      elite,
      eliteTrophy: "murkling_trophy",
      // Deliberately NEUTRAL to every damage type: the swarm is the roster's
      // baseline, the creature you measure a weapon's sweep against. Giving it
      // resistances would muddy that read.
    });
    this.packAggro = true;
    this.packAggroRadius = PACK_AGGRO_RADIUS;
    this.weaveOffset = Phaser.Math.FloatBetween(-SWARM_SPREAD, SWARM_SPREAD);
    this.setScale(elite ? ELITE.scale : S.scale); // small — the swarm reads as many little things
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
      if (this.isAttacking() || dist <= MELEE_RANGE + this.reachBonus()) {
        const hit = this.tickMeleeSwing(body, playerX, playerY, now, CLAW_SWING);
        if (hit) {
          this.markAttackLanded(now);
          return true;
        }
        return false;
      }
      // Weave in at a fixed personal offset, straightening out as it closes so
      // the final approach still commits (the fan-out is for the run-in, not a
      // permanent orbit).
      const straighten = Phaser.Math.Clamp((dist - MELEE_RANGE) / 140, 0, 1);
      const ang = Phaser.Math.Angle.Between(this.x, this.y, playerX, playerY) + this.weaveOffset * straighten;
      const spd = CHASE_SPEED * this.speedMult * this.envSpeedMult;
      const vx = Math.cos(ang) * spd;
      const vy = Math.sin(ang) * spd;
      body.setVelocity(vx, vy);
      this.applyFacing(vx, vy);
      return false;
    }

    if (now >= this.nextRoamAt) {
      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const d = Phaser.Math.Between(20, 50);
      this.wanderTgt = { x: this.x + Math.cos(angle) * d, y: this.y + Math.sin(angle) * d };
      this.nextRoamAt = now + Phaser.Math.Between(1500, 3200);
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
