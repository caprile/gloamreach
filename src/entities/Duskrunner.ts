import Phaser from "phaser";
import { Enemy } from "./Enemy";
import type { SwingConfig } from "./Enemy";

// Duskrunner — the badlands canid swarm (biome 2 Phase 2). A gloam-touched
// jackal that hunts the dry flats in packs: fast, low-HP, and the first real
// user of the Phase 1 pack-aggro base. Deliberately drives the BASE `state`
// field (idle/chasing) rather than a private `mode`, so the inherited
// Enemy.forceAggro()/isAggro() work with ZERO override — the reference swarm
// implementation the Phase 1 note pointed at. Own constants per the standing
// "own numbers, don't share one config table" rule.
//
// Its signature attack is a POUNCE — a short locked-direction leap gap-closer
// (built on the same telegraph/lunge mechanism as Boar's charge / Snake's
// lunge): from mid-range it crouches, then springs along a locked line, biting
// on contact. A pack of pouncing dogs converging via pack-aggro is the real
// threat (and the AOE-arc payoff enemy). Up close it falls back to a snappy
// point-blank bite.

const AGGRO_RADIUS = 160;
// Very sticky (the user: "duskrunners should be really hard to deaggro"). A pack
// that's locked on doesn't give up until you're most of a screen away — the
// swarm's whole identity is the relentless run-down, so kiting has to mean
// genuinely outrunning them, not strolling just past the old 280px edge.
const DEAGGRO_RADIUS = 620;
const CHASE_SPEED = 92; // fast — nearly the player's walk speed, so it runs you down
const WANDER_SPEED = 22;
const ANCHOR_LEASH = 90; // den guards: wander stays within this of the den, and returns if pulled out
// 30, not 20: a flat 20px bite whiffed on diagonal approaches because the
// player↔enemy collider holds their centers ~24px apart on the diagonal, so the
// strike-frame reach check never saw the player in range (the user: "melee
// attacks don't hit me at some angles"). 30 clears the body-separation gap.
const MELEE_RANGE = 30;

const MAX_HEALTH = 20; // noticeably tougher than a Gremling (12), still low for a swarm unit
// 42, not 34: badlands damage still read "a bit weak" in a full-armor playtest
// (the user). 42 - 13 = 29 net per bite; a pack of 3-4 landing that on the same
// beat is a real threat you have to break line-of-sight or dash out of.
const BITE_DAMAGE = 42;

const PACK_AGGRO_RADIUS = 260; // a woken packmate within this range also engages

// Snappy point-blank bite — the fallback when the player is right on top of it.
// Faster cooldown (the user: "faster on their cooldown to attack again"): a swarm
// that's on top of you should be snapping almost continuously.
const BITE_SWING: SwingConfig = {
  reach: MELEE_RANGE,
  windupMs: 180,
  strikeMs: 60,
  recoverMs: 200,
  cooldownMs: 140,
};

// Pounce — a crouch tell then a fast locked-direction leap that overshoots
// slightly (so it's sidestep-dodgeable), biting anything it crosses.
const POUNCE_RANGE_MIN = 44; // closer than this → just bite
const POUNCE_RANGE_MAX = 190; // within this (and past bite range) → pounce
const POUNCE_WINDUP_MS = 260; // crouch/load tell
const POUNCE_SPEED = 330; // clearly faster than chase — closes the gap in a blink
const POUNCE_MAX_DIST = 185; // travels this far before landing/recovering
const POUNCE_HIT_RADIUS = 32; // contact check along the leap (was 22 — same body-gap fix as MELEE_RANGE)
const POUNCE_RECOVER_MS = 300; // landing recovery — the punish window
const POUNCE_COOLDOWN_MS = 560; // faster re-pounce (the user) — keeps the pressure up between leaps
const POUNCE_KNOCKBACK = 90; // a small shove on a landed pounce

type DuskAttack = "bite" | "pounce";

export class Duskrunner extends Enemy {
  private wanderTgt: { x: number; y: number } | null = null;
  private nextRoamAt = 0;
  // Den guards are anchored to their warren so they don't idle-drift away from
  // the POI (the user: "duskrunners are still wandering away from their POI").
  // Wild pack Duskrunners leave this null and roam freely.
  private anchor: { x: number; y: number } | null = null;

  // Pounce state — locked at wind-up start, never re-read (sidestep-dodgeable).
  private currentAttack: DuskAttack | null = null;
  private pounceAngle = 0;
  private pounceTraveled = 0;
  private pounceHit = false;
  private pounceCooldownUntil = 0;

  constructor(
    scene: Phaser.Scene,
    cfg: { x: number; y: number; elite?: boolean; wanderAnchor?: { x: number; y: number } },
  ) {
    const elite = cfg.elite ?? false;
    super(scene, {
      x: cfg.x,
      y: cfg.y,
      texture: elite ? "duskrunner_elite" : "duskrunner",
      displayName: elite ? "Elite Duskrunner" : "Duskrunner",
      // Duskrunners double as a badlands food source (the user): every one drops
      // raw Duskrunner Meat alongside its pelt. Cooking/eat specifics are deferred
      // (the item is a future ingredient for now — like sunfruit/emberbloom).
      loot: elite
        ? [
            { resource: "duskrunner_pelt", min: 2, max: 2 },
            { resource: "duskrunner_meat", min: 2, max: 2 },
          ]
        : [
            { resource: "duskrunner_pelt", min: 1, max: 1 },
            { resource: "duskrunner_meat", min: 1, max: 1 },
          ],
      maxHealth: elite ? Math.round(MAX_HEALTH * 1.5) : MAX_HEALTH,
      biteDamage: elite ? Math.round(BITE_DAMAGE * 1.5) : BITE_DAMAGE,
      elite,
      eliteTrophy: "duskrunner_trophy",
    });
    // Opt into the shared pack-aggro base (Phase 1): an aggro'd Duskrunner wakes
    // idle Duskrunner neighbors within PACK_AGGRO_RADIUS via
    // MainScene.updatePackAggro. Same-class only, so it can't wake a Cragscale.
    this.packAggro = true;
    this.packAggroRadius = PACK_AGGRO_RADIUS;
    this.anchor = cfg.wanderAnchor ?? null;
    if (elite) {
      this.speedMult = 1.1;
      this.setScale(1.3);
      this.baseScale = 1.3; // wind-up pulse throbs around the elite's size
    }
  }

  update(delta: number, playerX: number, playerY: number, now: number): boolean {
    if (this.depleted) return false;
    const body = this.body as Phaser.Physics.Arcade.Body;
    const dist = Phaser.Math.Distance.Between(this.x, this.y, playerX, playerY);

    if (this.state === "idle" && dist <= AGGRO_RADIUS && this.canAggro(dist, now)) {
      this.state = "chasing";
      this.startPursuit(now);
    } else if (this.state === "chasing" && !this.isAttacking()) {
      // Don't deaggro mid-attack — a committed pounce/bite always plays out.
      if (dist > DEAGGRO_RADIUS && !this.withinAggroPersist(now)) {
        this.state = "idle";
      } else if (this.hasGivenUpPursuit(now)) {
        this.state = "idle";
        this.enterGivenUpState(now);
      }
    }

    if (this.state === "chasing") {
      // Mid-attack: keep driving whichever attack is committed.
      if (this.isAttacking()) {
        return this.currentAttack === "pounce"
          ? this.updatePounce(delta, playerX, playerY, now)
          : this.continueBite(body, playerX, playerY, now);
      }
      // Point-blank → bite; mid-range and off cooldown → pounce.
      if (dist <= MELEE_RANGE + this.reachBonus()) {
        this.currentAttack = "bite";
        return this.continueBite(body, playerX, playerY, now);
      }
      if (dist <= POUNCE_RANGE_MAX && dist >= POUNCE_RANGE_MIN && now >= this.pounceCooldownUntil) {
        this.startPounce(now, playerX, playerY);
        return false;
      }
      // Otherwise chase straight in.
      const angle = Phaser.Math.Angle.Between(this.x, this.y, playerX, playerY);
      const speed = CHASE_SPEED * this.speedMult * this.envSpeedMult;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;
      body.setVelocity(vx, vy);
      this.applyFacing(vx, vy);
      return false;
    }

    // Idle wander — small incremental drift. Anchored (den) guards roam only a
    // short leash around the warren and get pulled straight back if they've
    // strayed too far, so they never wander off the POI.
    if (this.anchor && Phaser.Math.Distance.Between(this.x, this.y, this.anchor.x, this.anchor.y) > ANCHOR_LEASH) {
      this.wanderTgt = { x: this.anchor.x, y: this.anchor.y };
      this.nextRoamAt = now + Phaser.Math.Between(2000, 4000);
    } else if (now >= this.nextRoamAt) {
      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const d = Phaser.Math.Between(20, 50);
      let tx = this.x + Math.cos(angle) * d;
      let ty = this.y + Math.sin(angle) * d;
      if (this.anchor) {
        // Bias the drift back toward the anchor so it circles the den, not away.
        tx = Phaser.Math.Clamp(tx, this.anchor.x - ANCHOR_LEASH, this.anchor.x + ANCHOR_LEASH);
        ty = Phaser.Math.Clamp(ty, this.anchor.y - ANCHOR_LEASH, this.anchor.y + ANCHOR_LEASH);
      }
      this.wanderTgt = { x: tx, y: ty };
      this.nextRoamAt = now + Phaser.Math.Between(2000, 4000);
    }
    if (this.wanderTgt) {
      const d = Phaser.Math.Distance.Between(this.x, this.y, this.wanderTgt.x, this.wanderTgt.y);
      if (d < 4) {
        body.setVelocity(0, 0);
      } else {
        const angle = Phaser.Math.Angle.Between(this.x, this.y, this.wanderTgt.x, this.wanderTgt.y);
        const vx = Math.cos(angle) * WANDER_SPEED;
        const vy = Math.sin(angle) * WANDER_SPEED;
        body.setVelocity(vx, vy);
        this.applyFacing(vx, vy);
      }
    }
    return false;
  }

  // Point-blank bite via the shared telegraphed-swing helper; clears
  // currentAttack when the swing fully resolves.
  private continueBite(
    body: Phaser.Physics.Arcade.Body,
    playerX: number,
    playerY: number,
    now: number,
  ): boolean {
    const hit = this.tickMeleeSwing(body, playerX, playerY, now, BITE_SWING);
    if (!this.isAttacking()) this.currentAttack = null; // swing finished
    if (hit) {
      this.markAttackLanded(now);
      return true;
    }
    return false;
  }

  private startPounce(now: number, playerX: number, playerY: number): void {
    this.currentAttack = "pounce";
    this.attackPhase = "windup";
    this.attackStartedAt = now;
    this.pounceAngle = Phaser.Math.Angle.Between(this.x, this.y, playerX, playerY);
    this.faceAngle(this.pounceAngle); // point along the locked leap during the crouch
    this.playWindupTell(POUNCE_WINDUP_MS, 0xffb04a); // amber crouch tell
    this.pounceTraveled = 0;
    this.pounceHit = false;
    (this.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
  }

  private updatePounce(delta: number, playerX: number, playerY: number, now: number): boolean {
    const body = this.body as Phaser.Physics.Arcade.Body;

    if (this.attackPhase === "windup") {
      body.setVelocity(0, 0);
      if (this.attackElapsed(now) >= POUNCE_WINDUP_MS) {
        this.attackPhase = "strike";
        this.attackStartedAt = now;
        this.endWindupTell();
        const spd = POUNCE_SPEED * this.speedMult;
        body.setVelocity(Math.cos(this.pounceAngle) * spd, Math.sin(this.pounceAngle) * spd);
        this.applyFacing(Math.cos(this.pounceAngle), Math.sin(this.pounceAngle));
      }
      return false;
    }

    if (this.attackPhase === "strike") {
      this.pounceTraveled += (POUNCE_SPEED * this.speedMult * delta) / 1000;
      const dist = Phaser.Math.Distance.Between(this.x, this.y, playerX, playerY);
      if (!this.pounceHit && dist <= POUNCE_HIT_RADIUS + this.reachBonus()) {
        this.pounceHit = true;
        this.pendingAttackKnockback = POUNCE_KNOCKBACK;
        this.markAttackLanded(now);
        body.setVelocity(0, 0);
        this.attackPhase = "recover";
        this.attackStartedAt = now;
        return true; // bite on contact
      }
      if (this.pounceTraveled >= POUNCE_MAX_DIST) {
        body.setVelocity(0, 0);
        this.attackPhase = "recover";
        this.attackStartedAt = now;
      }
      return false;
    }

    // recover — landing punish window
    body.setVelocity(0, 0);
    if (this.attackElapsed(now) >= POUNCE_RECOVER_MS) {
      this.attackPhase = "none";
      this.currentAttack = null;
      this.pounceCooldownUntil = now + POUNCE_COOLDOWN_MS;
    }
    return false;
  }

  // --- pack coordination (the user: "attack as a pack") ---
  // A single pouncing Duskrunner rallies its neighbors so a pack converges and
  // leaps in the same beat instead of trickling in one at a time. Driven by
  // MainScene.updateDuskrunnerPacks; the rally only takes during the leader's
  // wind-up so the joiners' leaps land together, not staggered.

  // True only during the crouch tell of a pounce — the window to rally on.
  isPounceWindup(): boolean {
    return this.currentAttack === "pounce" && this.attackPhase === "windup";
  }

  // Rally call: if chasing, in a valid pounce band, and off cooldown, commit a
  // pounce now. No-op otherwise (already attacking, on cooldown, wrong range),
  // so it's safe to call every frame from the sync pass.
  joinPounce(now: number, playerX: number, playerY: number): void {
    if (this.depleted || this.state !== "chasing" || this.isAttacking()) return;
    if (now < this.pounceCooldownUntil) return;
    const dist = Phaser.Math.Distance.Between(this.x, this.y, playerX, playerY);
    if (dist < POUNCE_RANGE_MIN || dist > POUNCE_RANGE_MAX) return;
    this.startPounce(now, playerX, playerY);
  }
}
