import Phaser from "phaser";
import { Enemy } from "./Enemy";
import type { SwingConfig } from "./Enemy";

// Blighttoad — the bayou's POISON carrier (biome 3 Phase 4b). A bloated,
// gloam-sick toad that hops in on you and bites, injecting a stacking poison
// dose. It's the creature half of the biome's signature status effect: the
// miasma zones (Phase 4a) teach you what poison does to your regen, and this
// teaches you that the wildlife can do it to you anywhere.
//
// Why poison matters here mechanically: it's a MAGIC SUBTYPE (see Poison.ts), so
// it BYPASSES flat armor. The toad's bite itself is modest and a Gloamsteel-plated
// player shrugs it off — the poison is the actual threat, and it stacks per bite
// (PoisonManager.apply, unlike the miasma's refresh-only sustain). Letting three
// toads chew on you is how a full-HP player dies in bayou plate.
//
// Semi-swarm: opts into the shared Phase-1 pack-aggro on the BASE `state` field
// (the Duskrunner's zero-override pattern), with a smaller radius than a true
// canid pack — toads rouse the neighbors, they don't hunt as a unit.

const AGGRO_RADIUS = 270;
const DEAGGRO_RADIUS = 600;
// Big committed leaps: 300px/s while airborne, ~150px per hop, with a shorter
// planted beat — averaging ~145px/s, which keeps pace with a walking player and
// most of a sprint. The first pass averaged 66px/s and was outwalked trivially.
const HOP_SPEED = 300; // px/s during a hop — it lurches forward in bursts, not a steady walk
const HOP_DIST = 150; // how far one hop carries
const HOP_GAP_MS = 330; // planted beat between hops (the burst-move rhythm)
const WANDER_SPEED = 20;
const PACK_AGGRO_RADIUS = 240;

const MAX_HEALTH = 150; // squishier than the Mirejaw/Mosswretch — it trades HP for the DoT
const BITE_DAMAGE = 66; // physical, mostly eaten by bayou-tier armor — the poison is the payload
// The dose. 9/s over 6s = 54 damage that armor CANNOT stop, and it halves every
// heal source while it runs (Poison.ts) — so it also blocks you from eating your
// way out of a fight. Stacks per bite (to 4×), which is the real pressure: a
// clump of toads you don't break off from ramps to 36 armor-ignoring dps.
const BITE_POISON_DPS = 9;
const BITE_POISON_MS = 6000;

const BITE_SWING: SwingConfig = {
  reach: 32,
  windupMs: 340, // a visible throat-swell before the lunge-bite
  strikeMs: 80,
  recoverMs: 380,
  cooldownMs: 420,
};

export class Blighttoad extends Enemy {
  private hopUntil = 0; // while now < this, the current hop is still carrying it
  private nextHopAt = 0;
  private wanderTgt: { x: number; y: number } | null = null;
  private nextRoamAt = 0;

  constructor(scene: Phaser.Scene, cfg: { x: number; y: number; elite?: boolean }) {
    const elite = cfg.elite ?? false;
    super(scene, {
      x: cfg.x,
      y: cfg.y,
      texture: elite ? "blighttoad_elite" : "blighttoad",
      displayName: elite ? "Elite Blighttoad" : "Blighttoad",
      loot: elite
        ? [{ resource: "blight_gland", min: 2, max: 3 }]
        : [{ resource: "blight_gland", min: 1, max: 1 }],
      maxHealth: elite ? Math.round(MAX_HEALTH * 1.5) : MAX_HEALTH,
      biteDamage: elite ? Math.round(BITE_DAMAGE * 1.5) : BITE_DAMAGE,
      elite,
      eliteTrophy: "blighttoad_trophy",
      // Full of the stuff itself, so its own venom-kin magic slides off; a
      // water-fat toad hates being dried out.
      resistances: { magic: 0.6, fire: 1.25 },
    });
    this.packAggro = true;
    this.packAggroRadius = PACK_AGGRO_RADIUS;
    if (elite) {
      this.speedMult = 1.1;
      this.setScale(1.3);
      this.baseScale = 1.3;
    }
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
      if (this.isAttacking() || dist <= BITE_SWING.reach + this.reachBonus()) {
        const hit = this.tickMeleeSwing(body, playerX, playerY, now, BITE_SWING);
        if (hit) {
          // The whole point of the creature — armor-bypassing, stacking.
          this.pendingPoison = { dmgPerSec: BITE_POISON_DPS, durationMs: BITE_POISON_MS };
          this.markAttackLanded(now);
          return true;
        }
        return false;
      }
      this.hopToward(body, playerX, playerY, now);
      return false;
    }

    this.updateWander(body, now);
    return false;
  }

  // Burst locomotion: a hop carries it for HOP_DIST at speed, then it sits
  // planted for HOP_GAP_MS. Average speed lands well under the player's walk, so
  // a toad is outrunnable — but the hop closes gaps in lurches that are harder to
  // read than a constant-velocity chaser.
  private hopToward(body: Phaser.Physics.Arcade.Body, playerX: number, playerY: number, now: number): void {
    if (now < this.hopUntil) return; // mid-hop, keep the launch velocity
    if (now < this.nextHopAt) {
      body.setVelocity(0, 0);
      return;
    }
    const ang = Phaser.Math.Angle.Between(this.x, this.y, playerX, playerY);
    const spd = HOP_SPEED * this.speedMult * this.envSpeedMult;
    body.setVelocity(Math.cos(ang) * spd, Math.sin(ang) * spd);
    this.applyFacing(Math.cos(ang) * spd, Math.sin(ang) * spd);
    const hopMs = (HOP_DIST / spd) * 1000;
    this.hopUntil = now + hopMs;
    this.nextHopAt = now + hopMs + HOP_GAP_MS;
  }

  private updateWander(body: Phaser.Physics.Arcade.Body, now: number): void {
    if (now >= this.nextRoamAt) {
      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const d = Phaser.Math.Between(20, 45);
      this.wanderTgt = { x: this.x + Math.cos(angle) * d, y: this.y + Math.sin(angle) * d };
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
    this.applyFacing(Math.cos(angle), Math.sin(angle));
  }
}
