import Phaser from "phaser";
import { Enemy } from "./Enemy";
import { enemyStat } from "../systems/enemyStats";

// Combat stats from the Phaser-free source of truth (also read by the balancing
// dashboard — tune there). attacks[0]=chomp, [1]=sweep, [2]=slam, [3]=roll.
const S = enemyStat("miretyrant");

// The Miretyrant — the DUSKMIRE BAYOU final boss and the game's win-condition
// (biome 3 Phase 4d), demoting the Duneshaper to a mid-boss. A colossal
// gloam-gorged alligator-behemoth waiting at the bottom of the Sunken Gorge.
//
// Bespoke AI on the GremlinKing / Gloamwarden / Cinderwrought / Duneshaper
// lineage — a trimmed sibling, NOT a shared framework (the standing boss lock).
// Extends Enemy for the HP-bar/loot/death machinery, fully overrides update().
// Built around the player's EXISTING dash/i-frame + ability toolkit; no new
// player mechanic.
//
// The identity it has to carry: the Duneshaper is a CASTER that holds range and
// throws magic at you, so the Miretyrant is a BRUISER that wants to be on top of
// you. Its dodges are spacing dodges — get out of the sweep's reach, run the
// roll's line, leave the slam's ring — rather than "sidestep the marked ground".
// It also fights in a room, which the Duneshaper never does: the arena's walls
// are what make a travelling attack read.
//
// Adds are its signature (locked with the user: BELLOW WAVES, not a continuous
// trickle). The bellow runs on its OWN timer rather than in the attack pool, so
// it lands as punctuation between attacks instead of competing with them; the
// boss only ASKS (consumeBellow), and MainScene resolves the spawn — the same
// contract checkPlayerHit() already uses, which is what gets the adds terrain
// collision, crypt navigation and containment for free.
export type MiretyrantState = "idle" | "telegraphing" | "executing" | "recovering" | "staggered";
export type MiretyrantAttack = "chomp" | "sweep" | "slam" | "roll";

// 3200 -> 4600. the user cleared the whole bayou and killed this in EMBERSTEEL
// gear — a full tier below the bayou set it is meant to gate — and called the
// fight "too easy and boring". The boring half is answered by the phase-3 mire
// pools below (an arena that closes in, rather than a longer bar); this is the
// half that just needed to be bigger.
const MAX_HEALTH = S.hp;
export const MIRETYRANT_SCALE = 2.6;
const AGGRO_RADIUS = 330;
const LEASH_RADIUS = 620; // retreat past this and it resets (there is no arena seal — locked)
const MOVE_SPEED = S.moveSpeed; // a bruiser: slower than a player sprint, faster than the Duneshaper's drift
const PREFERRED_RANGE = 96; // closes to here and stays — it fights in your face
const DEAGGRO_REGEN_PER_SEC = 16;

export const MIRETYRANT_MAX_POISE = S.poise!; // 450→800 (2026-07-23): a sword could perma-stagger the win-con boss
export const MIRETYRANT_STAGGER_DAMAGE_MULTIPLIER = 1.35;
const STAGGER_DURATION_MS = 2200;
const POISE_REGEN_DELAY_MS = 3000;
const POISE_REGEN_PER_SEC = S.poiseRegenPerSec!; // 24→28: recovers poise faster so stagger stays earned, not a lock
const POISE_BAR_H = 7;

const ATTACK_COOLDOWN_MS = 720;
const RETURN_HOME_EPS = 20;

// Phase gates (fraction of max HP).
const PHASE2_HP = 0.65; // + death roll
const PHASE3_HP = 0.35; // + enrage timing, and the bellow interval halves
const ENRAGE_TELEGRAPH_MULTIPLIER = 0.75;
const ENRAGE_RECOVER_MULTIPLIER = 0.75;
const ENRAGE_MOVE_MULTIPLIER = 1.25;

// --- Lunging Chomp — a locked-heading gap-closer ending in a jaw snap. ---
// The heading is snapped at telegraph start and never re-read, so it is
// genuinely sidestep-dodgeable (the GremlinKing charge precedent, deliberately
// not the Snake's re-aiming lunge).
const CHOMP_TELEGRAPH_MS = 600;
const CHOMP_LUNGE_MS = 260;
const CHOMP_BITE_MS = 150; // planted snap at the end of the lunge — the strike window
const CHOMP_RECOVER_MS = 620;
const CHOMP_MAX_LUNGE = 300;
const CHOMP_RADIUS = 74; // tight: this one you step out of the LINE of
const CHOMP_DAMAGE = S.attacks[0].damage;
const CHOMP_KNOCKBACK = 150;
const CHOMP_LAND_EPS = 10;

// --- Tail Sweep — a wide arc swung around itself. ---
// Big radius, huge knockback, and it covers most of the circle, so the dodge is
// DISTANCE (or a dash through), not a sidestep. The counterpart to the chomp.
const SWEEP_TELEGRAPH_MS = 700;
const SWEEP_IMPACT_MS = 320;
const SWEEP_RECOVER_MS = 780;
const SWEEP_RADIUS = 165;
const SWEEP_HALF_ANGLE = Phaser.Math.DegToRad(120); // rear-to-front — only the far side is safe
const SWEEP_DAMAGE = S.attacks[1].damage;
const SWEEP_KNOCKBACK = 300;

// --- Muck Slam — radial AoE under itself, growing-circle telegraph. ---
const SLAM_TELEGRAPH_MS = 820;
const SLAM_IMPACT_MS = 200;
const SLAM_RECOVER_MS = 700;
const SLAM_RADIUS = 150;
const SLAM_DAMAGE = S.attacks[2].damage;
const SLAM_KNOCKBACK = 240;

// --- Death Roll (phase 2) — a travelling multi-hit spin along a locked line. ---
// The one attack you OUTRUN rather than step around: it crosses the arena, can
// hit more than once, and its recovery is the longest in the kit (the punish).
const ROLL_TELEGRAPH_MS = 780;
const ROLL_TRAVEL_MS = 900;
const ROLL_RECOVER_MS = 1000;
const ROLL_SPEED = S.burstSpeed!;
const ROLL_RADIUS = 82;
const ROLL_DAMAGE = S.attacks[3].damage;
const ROLL_KNOCKBACK = 200;
const ROLL_HIT_INTERVAL_MS = 420; // it can catch you more than once if you run with it

// --- Bellow (adds) — on its own clock, see the file header. ---
const BELLOW_INTERVAL_MS = 15000;
const BELLOW_ENRAGED_INTERVAL_MS = 8500;
const BELLOW_FIRST_DELAY_MS = 6000; // never opens the fight with adds
const BELLOW_TELL_MS = 700; // the rear-back is the tell; the spawn lands at the end of it
export const MIRETYRANT_ADDS_PER_BELLOW = 3;
export const MIRETYRANT_ADDS_ENRAGED = 5;
export const MIRETYRANT_MAX_ADDS = 8; // hard cap so a slow fight can't drown the player

function telegraphMsFor(a: MiretyrantAttack): number {
  switch (a) {
    case "chomp": return CHOMP_TELEGRAPH_MS;
    case "sweep": return SWEEP_TELEGRAPH_MS;
    case "slam": return SLAM_TELEGRAPH_MS;
    case "roll": return ROLL_TELEGRAPH_MS;
  }
}
function recoverMsFor(a: MiretyrantAttack): number {
  switch (a) {
    case "chomp": return CHOMP_RECOVER_MS;
    case "sweep": return SWEEP_RECOVER_MS;
    case "slam": return SLAM_RECOVER_MS;
    case "roll": return ROLL_RECOVER_MS;
  }
}

export class Miretyrant extends Enemy {
  private tyrantState: MiretyrantState = "idle";
  private currentAttack: MiretyrantAttack | null = null;
  private lastAttack: MiretyrantAttack | null = null;
  private stateEnteredAt = 0;
  private currentStateDurationMs = 0;
  private nextAttackReadyAt = 0;
  private aggroed = false;
  private enraged = false;
  private readonly spawnX: number;
  private readonly spawnY: number;

  poise = MIRETYRANT_MAX_POISE;
  private lastPoiseChipAt = -Infinity;

  // Locked heading/landing for the committed attacks (chomp lunge, death roll).
  private attackAngle = 0;
  private lungeTargetX = 0;
  private lungeTargetY = 0;
  private lungeLanded = false;
  private lungeElapsed = 0;
  private rollElapsed = 0;
  private lastRollHitAt = -Infinity;
  private hasHitThisAttack = false;

  // Bellow clock. `pendingAdds` is what MainScene drains via consumeBellow().
  private nextBellowAt = 0;
  private bellowingUntil = 0;
  private pendingAdds = 0;
  private pendingPools: { x: number; y: number }[] = [];

  private poiseBarBg: Phaser.GameObjects.Rectangle;
  private poiseBarFill: Phaser.GameObjects.Rectangle;
  private telegraphGfx: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene, cfg: { x: number; y: number }) {
    super(scene, {
      x: cfg.x,
      y: cfg.y,
      texture: "miretyrant",
      displayName: "The Miretyrant",
      // Killing it ENDS the run, so these are for correctness / a future
      // continue-mode rather than something a player banks.
      loot: [
        { resource: "gloam_shard", min: 8, max: 12 },
        { resource: "boss_refined_trophy_t3", min: 1, max: 1 },
      ],
      maxHealth: MAX_HEALTH,
      biteDamage: 0, // everything flows through checkPlayerHit()
      // Resistances/weaknesses removed (2026-07-24, the user) — damage-type layer retired.
      upright: true,
      barScale: 2.6,
    });
    this.spawnX = cfg.x;
    this.spawnY = cfg.y;
    this.baseScale = MIRETYRANT_SCALE;
    this.setScale(MIRETYRANT_SCALE);

    const barX = cfg.x - this.barW / 2;
    const barY = cfg.y - this.barOffsetY + this.barH + 2;
    this.poiseBarBg = scene.add.rectangle(barX, barY, this.barW, POISE_BAR_H, 0x14201a, 0.85).setOrigin(0, 0.5);
    this.poiseBarFill = scene.add.rectangle(barX, barY, this.barW, POISE_BAR_H, 0x7fd6a0, 1).setOrigin(0, 0.5);
    this.telegraphGfx = scene.add.graphics();
  }

  preUpdate(time: number, delta: number): void {
    super.preUpdate(time, delta);
    const barX = this.x - this.barW / 2;
    const barY = this.y - this.barOffsetY + this.barH + 2;
    const aggro = this.isAggro();
    this.poiseBarBg.setPosition(barX, barY).setDepth(this.depth + 1).setVisible(aggro);
    this.poiseBarFill.setPosition(barX, barY).setDepth(this.depth + 1).setVisible(aggro);
    this.poiseBarFill.setScale(Math.max(0, this.poise / MIRETYRANT_MAX_POISE), 1);
  }

  isAggro(): boolean {
    return this.aggroed;
  }
  // Public mirror for the fixed top-of-screen BossHealthUI (BossBarTarget).
  isEngaged(): boolean {
    return this.aggroed;
  }
  isStaggered(): boolean {
    return this.tyrantState === "staggered";
  }
  get poiseMax(): number {
    return MIRETYRANT_MAX_POISE;
  }

  // How many adds the last bellow called up, drained by MainScene (which owns
  // enemy registration). Returns 0 on every other frame.
  consumeBellow(): number {
    const n = this.pendingAdds;
    this.pendingAdds = 0;
    return n;
  }

  // Mire pools left by phase-3 impacts, drained by MainScene the same way (the
  // boss ASKS, the scene resolves — the standing contract, which is what gets
  // the pools their rendering and their poison for free).
  //
  // This is the fight's answer to "boring": from phase 3 the arena itself starts
  // closing in, so the punish windows you were farming get progressively more
  // expensive to stand in. It costs the boss no new attack — the pools fall out
  // of the slams and rolls it was already throwing.
  consumeMirePools(): { x: number; y: number }[] {
    const p = this.pendingPools;
    this.pendingPools = [];
    return p;
  }

  update(delta: number, playerX: number, playerY: number, now: number): boolean {
    if (this.depleted) return false;
    this.enraged = this.health <= this.maxHealth * PHASE3_HP;
    this.updatePoiseRegen(delta, now);
    if (!this.aggroed && this.health < this.maxHealth) {
      this.health = Math.min(this.maxHealth, this.health + DEAGGRO_REGEN_PER_SEC * (delta / 1000));
      this.applyHpTint();
    }

    switch (this.tyrantState) {
      case "staggered":
        this.updateStaggered(now);
        return false;
      case "telegraphing":
        this.updateTelegraphing(playerX, playerY, now);
        return false;
      case "executing":
        this.updateExecuting(delta, playerX, playerY, now);
        return false;
      case "recovering":
        this.updateRecovering(now);
        return false;
      default:
        this.updateIdle(playerX, playerY, now);
        return false;
    }
  }

  private updateStaggered(now: number): void {
    (this.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
    if (now >= this.stateEnteredAt + STAGGER_DURATION_MS) {
      this.tyrantState = "idle";
      this.poise = MIRETYRANT_MAX_POISE;
      this.nextAttackReadyAt = now + ATTACK_COOLDOWN_MS;
    }
  }

  private updateIdle(playerX: number, playerY: number, now: number): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    const distFromSpawn = Phaser.Math.Distance.Between(this.x, this.y, this.spawnX, this.spawnY);
    if (this.aggroed && distFromSpawn > LEASH_RADIUS) {
      this.aggroed = false;
      this.nextBellowAt = 0;
    }

    const dist = Phaser.Math.Distance.Between(this.x, this.y, playerX, playerY);
    if (!this.aggroed) {
      if (dist <= AGGRO_RADIUS) {
        this.aggroed = true;
        // Never open with adds — the first bellow is a mid-fight escalation.
        this.nextBellowAt = now + BELLOW_FIRST_DELAY_MS;
      } else {
        if (distFromSpawn > RETURN_HOME_EPS) {
          const angle = Phaser.Math.Angle.Between(this.x, this.y, this.spawnX, this.spawnY);
          const vx = Math.cos(angle) * MOVE_SPEED;
          const vy = Math.sin(angle) * MOVE_SPEED;
          body.setVelocity(vx, vy);
          this.applyFacing(vx, vy);
        } else {
          body.setVelocity(0, 0);
        }
        return;
      }
    }

    // The bellow gets first refusal between attacks — it's punctuation, and a
    // wave that has to wait its turn behind the attack pool never lands.
    if (this.bellowingUntil > 0) {
      body.setVelocity(0, 0);
      this.applyFacing(playerX - this.x, playerY - this.y);
      if (now >= this.bellowingUntil) {
        this.bellowingUntil = 0;
        this.pendingAdds = this.enraged ? MIRETYRANT_ADDS_ENRAGED : MIRETYRANT_ADDS_PER_BELLOW;
        this.nextBellowAt =
          now + (this.enraged ? BELLOW_ENRAGED_INTERVAL_MS : BELLOW_INTERVAL_MS);
        this.nextAttackReadyAt = Math.max(this.nextAttackReadyAt, now + ATTACK_COOLDOWN_MS);
      }
      return;
    }
    if (now >= this.nextBellowAt) {
      this.bellowingUntil = now + BELLOW_TELL_MS;
      this.playWindupTell(BELLOW_TELL_MS);
      body.setVelocity(0, 0);
      return;
    }

    if (now >= this.nextAttackReadyAt) {
      this.beginTelegraph(this.pickAttack(dist), now, playerX, playerY);
      return;
    }

    const speed = MOVE_SPEED * (this.enraged ? ENRAGE_MOVE_MULTIPLIER : 1);
    if (dist > PREFERRED_RANGE) {
      const angle = Phaser.Math.Angle.Between(this.x, this.y, playerX, playerY);
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;
      body.setVelocity(vx, vy);
      this.applyFacing(vx, vy);
    } else {
      body.setVelocity(0, 0);
      this.applyFacing(playerX - this.x, playerY - this.y);
    }
  }

  // Phase-gated pool, weighted by range so the kit reads: the chomp/roll close
  // distance, the sweep/slam punish standing next to it.
  private pickAttack(dist: number): MiretyrantAttack {
    const pool: MiretyrantAttack[] = ["chomp", "sweep", "slam"];
    if (this.health <= this.maxHealth * PHASE2_HP) pool.push("roll");
    const far = dist > SWEEP_RADIUS;
    const weighted = pool.filter((a) => {
      if (a === this.lastAttack && pool.length > 1) return false;
      // Standing off? The reaching attacks only. In your face? Anything.
      if (far && (a === "sweep" || a === "slam")) return false;
      return true;
    });
    const choices = weighted.length > 0 ? weighted : pool;
    const choice = choices[Phaser.Math.Between(0, choices.length - 1)];
    this.lastAttack = choice;
    return choice;
  }

  private beginTelegraph(
    attack: MiretyrantAttack,
    now: number,
    playerX: number,
    playerY: number,
  ): void {
    this.currentAttack = attack;
    this.tyrantState = "telegraphing";
    this.stateEnteredAt = now;
    // Captured ONCE at state entry: crossing the enrage threshold mid-telegraph
    // must not retroactively shrink an animation already playing.
    this.currentStateDurationMs =
      telegraphMsFor(attack) * (this.enraged ? ENRAGE_TELEGRAPH_MULTIPLIER : 1);
    (this.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
    this.playWindupTell(this.currentStateDurationMs);

    if (attack === "chomp") {
      const dist = Phaser.Math.Distance.Between(this.x, this.y, playerX, playerY);
      const angle = Phaser.Math.Angle.Between(this.x, this.y, playerX, playerY);
      const lunge = Math.min(dist, CHOMP_MAX_LUNGE);
      this.attackAngle = angle;
      this.lungeTargetX = this.x + Math.cos(angle) * lunge;
      this.lungeTargetY = this.y + Math.sin(angle) * lunge;
      this.faceAngle(angle);
    } else if (attack === "roll" || attack === "sweep") {
      this.attackAngle = Phaser.Math.Angle.Between(this.x, this.y, playerX, playerY);
      this.faceAngle(this.attackAngle);
    }
  }

  private updateTelegraphing(playerX: number, playerY: number, now: number): void {
    // The committed attacks keep their locked heading (that's what makes them
    // dodgeable); the slam is boss-centred, so it can keep watching you.
    if (this.currentAttack === "slam") this.applyFacing(playerX - this.x, playerY - this.y);
    this.drawTelegraph(now);
    if (now >= this.stateEnteredAt + this.currentStateDurationMs) this.beginExecute(now);
  }

  private beginExecute(now: number): void {
    this.tyrantState = "executing";
    this.stateEnteredAt = now;
    this.hasHitThisAttack = false;
    this.telegraphGfx.clear();
    const body = this.body as Phaser.Physics.Arcade.Body;
    switch (this.currentAttack) {
      case "chomp": {
        this.lungeLanded = false;
        this.lungeElapsed = 0;
        const dist = Phaser.Math.Distance.Between(this.x, this.y, this.lungeTargetX, this.lungeTargetY);
        const speed = dist > 0 ? dist / (CHOMP_LUNGE_MS / 1000) : 0;
        body.setVelocity(Math.cos(this.attackAngle) * speed, Math.sin(this.attackAngle) * speed);
        break;
      }
      case "roll": {
        this.rollElapsed = 0;
        this.lastRollHitAt = -Infinity;
        this.currentStateDurationMs = ROLL_TRAVEL_MS;
        body.setVelocity(Math.cos(this.attackAngle) * ROLL_SPEED, Math.sin(this.attackAngle) * ROLL_SPEED);
        break;
      }
      case "sweep": {
        body.setVelocity(0, 0);
        this.currentStateDurationMs = SWEEP_IMPACT_MS;
        break;
      }
      default: {
        body.setVelocity(0, 0);
        this.currentStateDurationMs = SLAM_IMPACT_MS;
        break;
      }
    }
  }

  private updateExecuting(delta: number, playerX: number, playerY: number, now: number): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    if (this.currentAttack === "chomp") {
      if (!this.lungeLanded) {
        this.lungeElapsed += delta;
        const dist = Phaser.Math.Distance.Between(this.x, this.y, this.lungeTargetX, this.lungeTargetY);
        if (dist <= CHOMP_LAND_EPS || this.lungeElapsed >= CHOMP_LUNGE_MS) {
          body.setVelocity(0, 0);
          this.lungeLanded = true;
          this.stateEnteredAt = now;
          this.currentStateDurationMs = CHOMP_BITE_MS;
        }
        return;
      }
      if (now >= this.stateEnteredAt + this.currentStateDurationMs) this.beginRecover(now);
      return;
    }
    if (this.currentAttack === "roll") {
      this.rollElapsed += delta;
      this.drawRoll();
      if (this.rollElapsed >= ROLL_TRAVEL_MS) {
        body.setVelocity(0, 0);
        this.beginRecover(now);
      }
      return;
    }
    // Sweep / slam: rooted, hazard drawn for the impact window.
    this.drawImpact(now, playerX, playerY);
    if (now >= this.stateEnteredAt + this.currentStateDurationMs) this.beginRecover(now);
  }

  private beginRecover(now: number): void {
    // Phase 3 only: a heavy impact churns the floor into a mire pool where it
    // landed. Chomp/sweep are excluded — a pool under every attack would carpet
    // the arena in seconds and remove the movement game rather than tighten it.
    if (this.enraged && (this.currentAttack === "slam" || this.currentAttack === "roll")) {
      this.pendingPools.push({ x: this.x, y: this.y });
    }
    this.tyrantState = "recovering";
    this.stateEnteredAt = now;
    this.currentStateDurationMs =
      recoverMsFor(this.currentAttack!) * (this.enraged ? ENRAGE_RECOVER_MULTIPLIER : 1);
    this.telegraphGfx.clear();
    (this.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
  }

  private updateRecovering(now: number): void {
    if (now >= this.stateEnteredAt + this.currentStateDurationMs) {
      this.tyrantState = "idle";
      this.nextAttackReadyAt = now + ATTACK_COOLDOWN_MS;
    }
  }

  private updatePoiseRegen(delta: number, now: number): void {
    if (this.tyrantState === "staggered") return;
    if (now - this.lastPoiseChipAt < POISE_REGEN_DELAY_MS) return;
    if (this.poise >= MIRETYRANT_MAX_POISE) return;
    this.poise = Math.min(MIRETYRANT_MAX_POISE, this.poise + POISE_REGEN_PER_SEC * (delta / 1000));
  }

  private drawTelegraph(now: number): void {
    const g = this.telegraphGfx;
    g.clear();
    g.setDepth(this.depth + 0.5);
    const frac = Phaser.Math.Clamp(
      this.currentStateDurationMs > 0 ? (now - this.stateEnteredAt) / this.currentStateDurationMs : 1,
      0,
      1,
    );
    const swamp = 0x5fbf87;
    switch (this.currentAttack) {
      case "chomp": {
        // The LANE it will cross, so the dodge (step off the line) is legible.
        g.fillStyle(swamp, 0.1 + 0.2 * frac);
        const nx = Math.cos(this.attackAngle);
        const ny = Math.sin(this.attackAngle);
        const px = -ny * CHOMP_RADIUS * 0.7;
        const py = nx * CHOMP_RADIUS * 0.7;
        const ex = this.lungeTargetX;
        const ey = this.lungeTargetY;
        g.fillPoints(
          [
            new Phaser.Geom.Point(this.x + px, this.y + py),
            new Phaser.Geom.Point(ex + px, ey + py),
            new Phaser.Geom.Point(ex - px, ey - py),
            new Phaser.Geom.Point(this.x - px, this.y - py),
          ],
          true,
        );
        g.lineStyle(2, swamp, 0.55);
        g.strokeCircle(ex, ey, CHOMP_RADIUS);
        break;
      }
      case "sweep": {
        g.fillStyle(swamp, 0.08 + 0.2 * frac);
        g.slice(
          this.x,
          this.y,
          SWEEP_RADIUS * (0.6 + 0.4 * frac),
          this.attackAngle - SWEEP_HALF_ANGLE,
          this.attackAngle + SWEEP_HALF_ANGLE,
        );
        g.fillPath();
        g.lineStyle(2, swamp, 0.5);
        g.beginPath();
        g.arc(this.x, this.y, SWEEP_RADIUS, this.attackAngle - SWEEP_HALF_ANGLE, this.attackAngle + SWEEP_HALF_ANGLE);
        g.strokePath();
        break;
      }
      case "roll": {
        const ex = this.x + Math.cos(this.attackAngle) * ROLL_SPEED * (ROLL_TRAVEL_MS / 1000);
        const ey = this.y + Math.sin(this.attackAngle) * ROLL_SPEED * (ROLL_TRAVEL_MS / 1000);
        g.lineStyle(3 + 4 * frac, 0x8fe0b0, 0.35 + 0.3 * frac);
        g.lineBetween(this.x, this.y, ex, ey);
        g.lineStyle(2, swamp, 0.5);
        g.strokeCircle(this.x, this.y, ROLL_RADIUS);
        break;
      }
      default: {
        const r = SLAM_RADIUS * (0.5 + 0.5 * frac);
        g.fillStyle(0x4c7a5c, 0.12 + 0.26 * frac);
        g.fillCircle(this.x, this.y, r);
        g.lineStyle(2, swamp, 0.6);
        g.strokeCircle(this.x, this.y, SLAM_RADIUS);
        break;
      }
    }
  }

  // Execute-phase hazard visual for the rooted attacks.
  private drawImpact(now: number, _playerX: number, _playerY: number): void {
    const g = this.telegraphGfx;
    g.clear();
    g.setDepth(this.depth + 0.5);
    const frac = Phaser.Math.Clamp((now - this.stateEnteredAt) / Math.max(1, this.currentStateDurationMs), 0, 1);
    if (this.currentAttack === "sweep") {
      g.fillStyle(0x8fe0b0, 0.5 * (1 - frac) + 0.2);
      g.slice(this.x, this.y, SWEEP_RADIUS, this.attackAngle - SWEEP_HALF_ANGLE, this.attackAngle + SWEEP_HALF_ANGLE);
      g.fillPath();
      return;
    }
    // Slam: a muck shockwave ring expanding to the true radius.
    g.lineStyle(8, 0x6ea884, 0.8 * (1 - frac) + 0.2);
    g.strokeCircle(this.x, this.y, SLAM_RADIUS * Math.min(1, 0.4 + frac * 1.4));
  }

  private drawRoll(): void {
    const g = this.telegraphGfx;
    g.clear();
    g.setDepth(this.depth + 0.5);
    g.fillStyle(0x6ea884, 0.35);
    g.fillCircle(this.x, this.y, ROLL_RADIUS);
  }

  // Queried each frame by MainScene.updateEnemies() (the boss contract) — area
  // damage carries knockback, which the base bite bool can't express.
  checkPlayerHit(playerX: number, playerY: number): { damage: number; knockback?: number } | null {
    if (this.tyrantState !== "executing") return null;
    const dist = Phaser.Math.Distance.Between(this.x, this.y, playerX, playerY);

    if (this.currentAttack === "roll") {
      // The only multi-hit attack in the kit: running WITH the roll can catch
      // you again, running across it can't.
      const now = this.scene.time.now;
      if (dist > ROLL_RADIUS) return null;
      if (now - this.lastRollHitAt < ROLL_HIT_INTERVAL_MS) return null;
      this.lastRollHitAt = now;
      return { damage: ROLL_DAMAGE, knockback: ROLL_KNOCKBACK };
    }

    if (this.hasHitThisAttack) return null;

    switch (this.currentAttack) {
      case "chomp": {
        if (!this.lungeLanded || dist > CHOMP_RADIUS) return null;
        this.hasHitThisAttack = true;
        return { damage: CHOMP_DAMAGE, knockback: CHOMP_KNOCKBACK };
      }
      case "sweep": {
        if (dist > SWEEP_RADIUS) return null;
        const toPlayer = Phaser.Math.Angle.Between(this.x, this.y, playerX, playerY);
        const delta = Math.abs(Phaser.Math.Angle.Wrap(toPlayer - this.attackAngle));
        if (delta > SWEEP_HALF_ANGLE) return null;
        this.hasHitThisAttack = true;
        return { damage: SWEEP_DAMAGE, knockback: SWEEP_KNOCKBACK };
      }
      default: {
        if (dist > SLAM_RADIUS) return null;
        this.hasHitThisAttack = true;
        return { damage: SLAM_DAMAGE, knockback: SLAM_KNOCKBACK };
      }
    }
  }

  takeHit(damage: number): boolean {
    const depleted = super.takeHit(damage);
    if (depleted) return true;
    if (this.tyrantState === "staggered") return false;
    this.poise = Math.max(0, this.poise - damage);
    this.lastPoiseChipAt = this.scene.time.now;
    if (this.poise <= 0) this.enterStaggered(this.scene.time.now);
    return false;
  }

  private enterStaggered(now: number): void {
    this.tyrantState = "staggered";
    this.stateEnteredAt = now;
    this.currentAttack = null;
    this.bellowingUntil = 0;
    (this.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
    this.telegraphGfx.clear();
  }

  playDeathFeedback(onComplete: () => void): void {
    this.poiseBarBg.destroy();
    this.poiseBarFill.destroy();
    this.telegraphGfx.destroy();
    super.playDeathFeedback(onComplete);
  }
}
