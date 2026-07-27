import Phaser from "phaser";
import { ATTACK_FX_DEPTH, TELEGRAPH_DEPTH } from "../systems/depth";
import { burstFx, coneFx } from "../art/attackFx";
import { Enemy } from "./Enemy";
import { enemyStat } from "../systems/enemyStats";
import type { DebuffKind } from "../systems/PlayerDebuffs";

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
export type MiretyrantAttack = "chomp" | "sweep" | "slam" | "roll" | "surge" | "heave";

// 3200 -> 4600. The user cleared the whole bayou and killed this in EMBERSTEEL
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
const SURGE_HP = 0.82; // + gloamtide (the room-wide sweep) — the earliest gate
const PHASE2_HP = 0.65; // + death roll
const PHASE3_HP = 0.35; // + enrage timing, and the bellow interval halves
// Ceiling on any single hit, as a share of max HP. This is the boss the guard
// exists for: The user killed it in one Bloodrush window at level 31 without
// seeing either phase. 5% floors the fight at ~20 connects however strong you are.
const BOSS_MAX_HIT_FRACTION = 0.05;
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

// --- Gloamtide (phase 2) — a wall of mire that crosses the WHOLE arena. ---
// the user: "a move that is a dungeon room wide VERY fast sweep horizontally,
// signaled of course but still requiring fast dodging, that you have to deal
// with while fighting adds."
//
// Every other attack in the kit is anchored on the boss, so the dodge is always
// measured against where IT is standing. This one is anchored on the ROOM: a
// full-height wall sweeps from one side to the other, and the only safe ground
// is a single gap in it. That makes it the one attack you cannot answer by
// spacing yourself relative to the boss — you have to read the gap and get to
// it, through whatever the last bellow left on the floor, which is exactly the
// "deal with it while fighting adds" ask.
//
// The wall is genuinely faster than a sprint, so outrunning it sideways is not
// an option: the counterplay is the gap (or a dash through it on i-frames). The
// long telegraph is what keeps that fair.
const SURGE_TELEGRAPH_MS = 1000; // long — you must cross the room during it
const SURGE_TRAVEL_MS = 560; // very fast once it goes
const SURGE_RECOVER_MS = 1050; // the biggest punish window in the kit
const SURGE_WALL_HALF = 46; // half-thickness of the wall
const SURGE_GAP_HALF = 86; // half-height of the safe opening
const SURGE_EDGE_INSET = 40; // keeps the gap off the arena wall
const SURGE_DAMAGE = S.attacks[1].damage; // shares the tail sweep's weight
const SURGE_KNOCKBACK = 260;

// --- Gorge Heave — the SPACING attack: it throws you out of melee. ---
// the user: "I want miretyrant to push you away like a knockback out of melee
// range that you have to dodge."
//
// The kit's other four are all "does this hurt me", answered by leaving. This
// one inverts the bruiser's own premise: it wants you close, and this is how it
// decides when you are ALLOWED to be. Damage is deliberately the smallest in the
// kit — the payload is the displacement, and what it really costs you is the
// re-approach, made through whatever the last bellow left standing.
//
// Dodging it means being outside HEAVE_RADIUS when it lands (or dashing on
// i-frames), and dodging it is what keeps you in position to punish the longest
// recovery in the kit bar the surge. Eat it and the punish window is spent
// walking back. The radius is deliberately well past melee reach so simply
// standing on the boss can never be safe.
const HEAVE_TELEGRAPH_MS = 660;
const HEAVE_IMPACT_MS = 200;
const HEAVE_RECOVER_MS = 900;
const HEAVE_RADIUS = 190;
const HEAVE_DAMAGE = S.attacks[4].damage;
const HEAVE_KNOCKBACK = 620;
// Long enough for the shove to actually clear melee range (620px/s x 0.3s
// ~= 186px, roughly the radius itself) rather than nudge you.
const HEAVE_KNOCKBACK_MS = 300;
// Disarm carried by a landed heave. Kept under HEAVE_RECOVER_MS (900) so the
// boss's own punish window always outlasts it — you get thrown and silenced-of-
// weapon, but the opening you were owed is still there when you get back.
const HEAVE_DISARM_MS = 1800;

// --- Bellow (adds) — on its own clock, see the file header. ---
// Escalating SCRIPTED waves (the user, playtest: "spawn alligators instead of
// the frog dudes... fighting strong adds the whole time"): the first couple of
// bellows are frog swarms (Murkling/Blighttoad), then Mirejaw gators arrive and
// stay in the mix from then on. Wave COMPOSITION is decided by MainScene (which
// owns the entity classes) off the wave index this file hands it; this file
// only owns the clock + count.
const BELLOW_INTERVAL_MS = 11000; // was 15000 — tightened for near-constant pressure
const BELLOW_ENRAGED_INTERVAL_MS = 6500; // was 8500
const BELLOW_FIRST_DELAY_MS = 6000; // never opens the fight with adds
const BELLOW_TELL_MS = 700; // the rear-back is the tell; the spawn lands at the end of it
export const MIRETYRANT_MAX_ADDS = 8; // hard cap so a slow fight can't drown the player

function telegraphMsFor(a: MiretyrantAttack): number {
  switch (a) {
    case "chomp": return CHOMP_TELEGRAPH_MS;
    case "sweep": return SWEEP_TELEGRAPH_MS;
    case "slam": return SLAM_TELEGRAPH_MS;
    case "roll": return ROLL_TELEGRAPH_MS;
    case "surge": return SURGE_TELEGRAPH_MS;
    case "heave": return HEAVE_TELEGRAPH_MS;
  }
}
function recoverMsFor(a: MiretyrantAttack): number {
  switch (a) {
    case "chomp": return CHOMP_RECOVER_MS;
    case "sweep": return SWEEP_RECOVER_MS;
    case "slam": return SLAM_RECOVER_MS;
    case "roll": return ROLL_RECOVER_MS;
    case "surge": return SURGE_RECOVER_MS;
    case "heave": return HEAVE_RECOVER_MS;
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

  // Bellow clock. `pendingWave` is what MainScene drains via consumeBellow() —
  // a 1-based wave index (0 = nothing pending), which MainScene turns into a
  // scripted composition (early waves = frogs, wave 3+ = gators join in).
  private nextBellowAt = 0;
  private bellowingUntil = 0;
  private bellowCount = 0;
  private pendingWave = 0;
  private pendingPools: { x: number; y: number }[] = [];

  private poiseBarBg: Phaser.GameObjects.Rectangle;
  private poiseBarFill: Phaser.GameObjects.Rectangle;
  private telegraphGfx: Phaser.GameObjects.Graphics;
  // The arena rect, handed in by MainScene (which owns the dungeon layout). Only
  // the Gloamtide needs it — every other attack is anchored on the boss itself,
  // which is exactly what makes this one different.
  private arena: { x: number; y: number; w: number; h: number } | null = null;
  // Gloamtide state, all locked at telegraph start so the wall can never re-aim.
  private surgeFromX = 0;
  private surgeToX = 0;
  private surgeGapY = 0;
  private surgeElapsed = 0;

  constructor(
    scene: Phaser.Scene,
    cfg: { x: number; y: number; arena?: { x: number; y: number; w: number; h: number } },
  ) {
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
    // Big-boss pacing guards (base Enemy, off by default). See
    // Enemy.maxHitFraction — this boss is the reason both exist.
    this.maxHitFraction = BOSS_MAX_HIT_FRACTION;
    this.arena = cfg.arena ?? null;
    this.phaseGates = [SURGE_HP, PHASE2_HP, PHASE3_HP];
    this.setScale(MIRETYRANT_SCALE);
    // See GremlinKing: baseScale is the resting size a scale tween returns to,
    // and this boss never set it either. Inert for combat (no reachBonus reads,
    // biteDamage 0) but required now that phase transitions tween the scale.
    this.baseScale = MIRETYRANT_SCALE;

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

  // The 1-based wave index the last bellow just called up (0 = nothing
  // pending), drained by MainScene (which owns enemy registration and decides
  // what a given wave index actually spawns).
  consumeBellow(): number {
    const w = this.pendingWave;
    this.pendingWave = 0;
    return w;
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
    // Scripted phase transition: hold everything, and pause the current state's
    // timer (stateEnteredAt) so a telegraph can't elapse behind the flash and
    // land with no wind-up to react to. The bellow clock is left alone — adds
    // already in the water keep fighting, only the boss itself pauses.
    if (this.isPhaseLocked()) {
      (this.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
      this.stateEnteredAt = now;
      return false;
    }
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
        this.updateRecovering(now, playerX, playerY);
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
        this.bellowCount++;
        this.pendingWave = this.bellowCount;
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
    // The heave is in the base pool, not phase-gated: "it decides when you're
    // allowed to be in melee" has to be true from the first exchange, or the
    // fight teaches the wrong spacing for its first two thirds.
    const pool: MiretyrantAttack[] = ["chomp", "sweep", "slam", "heave"];
    // The Gloamtide covers the whole room, so it needs the arena rect to exist
    // and is never filtered by range below — distance from the boss is exactly
    // the thing it does not care about.
    if (this.arena && this.health <= this.maxHealth * SURGE_HP) pool.push("surge");
    if (this.health <= this.maxHealth * PHASE2_HP) pool.push("roll");
    const far = dist > SWEEP_RADIUS;
    const weighted = pool.filter((a) => {
      if (a === this.lastAttack && pool.length > 1) return false;
      // Standing off? The reaching attacks only. In your face? Anything.
      // The heave is boss-centred like sweep/slam, and pointless at range —
      // there is nothing to throw out of melee if you are already out of it.
      if (far && (a === "sweep" || a === "slam" || a === "heave")) return false;
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
    } else if (attack === "surge" && this.arena) {
      const a = this.arena;
      // Sweep TOWARD the player's side of the room, so the wall always has real
      // ground to cross rather than spawning on top of them. Both edges are set
      // outside the room so the wall is fully formed as it enters.
      const fromLeft = playerX >= a.x + a.w / 2;
      this.surgeFromX = fromLeft ? a.x - SURGE_WALL_HALF : a.x + a.w + SURGE_WALL_HALF;
      this.surgeToX = fromLeft ? a.x + a.w + SURGE_WALL_HALF : a.x - SURGE_WALL_HALF;
      // The gap is placed AWAY from where the player is standing right now —
      // otherwise the safe spot is wherever they already are and the attack is
      // free. Making them move is the whole point.
      const lo = a.y + SURGE_EDGE_INSET + SURGE_GAP_HALF;
      const hi = a.y + a.h - SURGE_EDGE_INSET - SURGE_GAP_HALF;
      const mid = a.y + a.h / 2;
      this.surgeGapY = Phaser.Math.Clamp(playerY < mid ? hi : lo, lo, hi);
      this.surgeElapsed = 0;
      this.applyFacing(this.surgeToX - this.x, 0);
    }
  }

  private updateTelegraphing(playerX: number, playerY: number, now: number): void {
    // The committed attacks keep their locked heading (that's what makes them
    // dodgeable); the slam is boss-centred, so it can keep watching you.
    if (this.currentAttack === "slam" || this.currentAttack === "heave") {
      this.applyFacing(playerX - this.x, playerY - this.y);
    }
    this.drawTelegraph(now);
    if (now >= this.stateEnteredAt + this.currentStateDurationMs) this.beginExecute(now);
  }

  private beginExecute(now: number): void {
    this.tyrantState = "executing";
    this.stateEnteredAt = now;
    // See Cinderwrought.beginExecute — bosses bypass attackPhase entirely.
    this.markAttackAnim();
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
      case "surge": {
        // The boss stays planted and the ROOM does the attacking — it is the
        // one thing in the kit that isn't a swing.
        body.setVelocity(0, 0);
        this.surgeElapsed = 0;
        this.currentStateDurationMs = SURGE_TRAVEL_MS;
        break;
      }
      case "heave": {
        body.setVelocity(0, 0);
        this.currentStateDurationMs = HEAVE_IMPACT_MS;
        break;
      }
      default: {
        body.setVelocity(0, 0);
        this.currentStateDurationMs = SLAM_IMPACT_MS;
        break;
      }
    }
    if (this.currentAttack === "sweep" || this.currentAttack === "slam" || this.currentAttack === "heave") {
      this.spawnImpactFx();
    }
  }

  // Where the Gloamtide's wall is right now, 0..1 across its travel. Shared by
  // the hit test and the draw so what you see is exactly what hits you.
  private surgeWallX(): number {
    const t = Phaser.Math.Clamp(this.surgeElapsed / SURGE_TRAVEL_MS, 0, 1);
    return this.surgeFromX + (this.surgeToX - this.surgeFromX) * t;
  }

  private updateExecuting(delta: number, playerX: number, playerY: number, now: number): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    if (this.currentAttack === "surge") {
      this.surgeElapsed += delta;
      this.drawSurge(this.surgeWallX(), 1);
      if (this.surgeElapsed >= SURGE_TRAVEL_MS) {
        this.telegraphGfx.clear();
        this.beginRecover(now);
      }
      return;
    }
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
    // Sweep / slam: rooted for the impact window; the art was spawned at execute.
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

  private updateRecovering(now: number, playerX: number, playerY: number): void {
    // Turn back toward the player as it recovers. A committed attack faces
    // its LOCKED heading, and the travelling ones (leap, charge, roll) carry
    // the boss PAST you — so without this it spends its whole punish window
    // staring the wrong way (the user, on the Gloamwarden).
    this.applyFacing(playerX - this.x, playerY - this.y);
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

  // The wall + its gap. `intensity` scales opacity so the telegraph reads as a
  // warning and the live wall reads as the attack — the standing "under your
  // feet = it hasn't happened yet, over your head = it's happening" split can't
  // apply here (this one IS ground-level), so opacity carries it instead.
  private drawSurge(wallX: number, intensity: number): void {
    const a = this.arena;
    if (!a) return;
    const g = this.telegraphGfx;
    g.clear();
    g.setDepth(ATTACK_FX_DEPTH);
    const swamp = 0x5fbf87;
    const topH = this.surgeGapY - SURGE_GAP_HALF - a.y;
    const botY = this.surgeGapY + SURGE_GAP_HALF;
    const botH = a.y + a.h - botY;
    g.fillStyle(swamp, 0.16 * intensity + 0.22 * intensity);
    if (topH > 0) g.fillRect(wallX - SURGE_WALL_HALF, a.y, SURGE_WALL_HALF * 2, topH);
    if (botH > 0) g.fillRect(wallX - SURGE_WALL_HALF, botY, SURGE_WALL_HALF * 2, botH);
    g.lineStyle(2, swamp, 0.6 * intensity);
    if (topH > 0) g.strokeRect(wallX - SURGE_WALL_HALF, a.y, SURGE_WALL_HALF * 2, topH);
    if (botH > 0) g.strokeRect(wallX - SURGE_WALL_HALF, botY, SURGE_WALL_HALF * 2, botH);
    // Mark the gap itself — the safe ground is the information that matters, and
    // an unmarked hole in a wall reads as "the wall didn't render" at a glance.
    g.lineStyle(2, 0xd8f0c0, 0.5 * intensity);
    g.strokeRect(wallX - SURGE_WALL_HALF, this.surgeGapY - SURGE_GAP_HALF, SURGE_WALL_HALF * 2, SURGE_GAP_HALF * 2);
  }

  private drawTelegraph(now: number): void {
    const g = this.telegraphGfx;
    g.clear();
    g.setDepth(TELEGRAPH_DEPTH);
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
      case "surge": {
        // Slide the preview in from the start edge as the telegraph runs, so the
        // direction it will travel is unmistakable before it moves.
        const lead = this.surgeFromX + (this.surgeToX - this.surgeFromX) * 0.08 * frac;
        this.drawSurge(lead, 0.35 + 0.65 * frac);
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
      case "heave": {
        // Reads as an OUTWARD shove rather than a slam: the ring is drawn at
        // full size from the start (this is a boundary to get outside of, not a
        // circle closing on you) with spokes racing outward through it, so it
        // can't be mistaken for the slam's growing-circle tell.
        g.fillStyle(0x4c7a5c, 0.08 + 0.16 * frac);
        g.fillCircle(this.x, this.y, HEAVE_RADIUS);
        g.lineStyle(3, swamp, 0.45 + 0.4 * frac);
        g.strokeCircle(this.x, this.y, HEAVE_RADIUS);
        g.lineStyle(2, 0xd8f0c0, 0.35 + 0.4 * frac);
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2;
          const inner = HEAVE_RADIUS * (0.25 + 0.6 * frac);
          const outer = Math.min(HEAVE_RADIUS, inner + HEAVE_RADIUS * 0.22);
          g.lineBetween(
            this.x + Math.cos(a) * inner,
            this.y + Math.sin(a) * inner,
            this.x + Math.cos(a) * outer,
            this.y + Math.sin(a) * outer,
          );
        }
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

  // Impact art for the rooted attacks, fired once when the strike window opens.
  // The sweep keeps a wedge silhouette rather than a splash: its ±120° arc means
  // the SAFE side is a narrow slice behind the boss, and a round splash would
  // paint over the one piece of ground the dodge depends on.
  private spawnImpactFx(): void {
    if (this.currentAttack === "sweep") {
      coneFx(
        this.scene,
        "fx_mire_wave",
        this.x,
        this.y,
        this.attackAngle,
        SWEEP_RADIUS,
        SWEEP_HALF_ANGLE,
        SWEEP_IMPACT_MS + 200,
      );
      return;
    }
    if (this.currentAttack === "heave") {
      // Same splash art, sized to the heave's own (larger) radius — see the
      // standing rule: scale an impact sprite against the radius checkPlayerHit
      // actually uses, so what you see is what hits.
      burstFx(this.scene, "fx_mire_splash", this.x, this.y, HEAVE_RADIUS, HEAVE_IMPACT_MS + 300);
      return;
    }
    burstFx(this.scene, "fx_mire_splash", this.x, this.y, SLAM_RADIUS, SLAM_IMPACT_MS + 260);
  }

  private drawRoll(): void {
    const g = this.telegraphGfx;
    g.clear();
    g.setDepth(ATTACK_FX_DEPTH);
    g.fillStyle(0x6ea884, 0.35);
    g.fillCircle(this.x, this.y, ROLL_RADIUS);
  }

  // Queried each frame by MainScene.updateEnemies() (the boss contract) — area
  // damage carries knockback, which the base bite bool can't express.
  checkPlayerHit(
    playerX: number,
    playerY: number,
  ): {
    damage: number;
    knockback?: number;
    knockbackMs?: number;
    debuff?: { kind: DebuffKind; durationMs: number; magnitude?: number };
  } | null {
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

    if (this.currentAttack === "surge") {
      // Anchored on the ROOM, not the boss, so `dist` is irrelevant here. Caught
      // if you are inside the wall's thickness and NOT inside the gap.
      if (this.hasHitThisAttack || !this.arena) return null;
      if (Math.abs(playerX - this.surgeWallX()) > SURGE_WALL_HALF) return null;
      if (Math.abs(playerY - this.surgeGapY) <= SURGE_GAP_HALF) return null;
      this.hasHitThisAttack = true;
      return { damage: SURGE_DAMAGE, knockback: SURGE_KNOCKBACK };
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
      case "heave": {
        if (dist > HEAVE_RADIUS) return null;
        this.hasHitThisAttack = true;
        return {
          damage: HEAVE_DAMAGE,
          knockback: HEAVE_KNOCKBACK,
          knockbackMs: HEAVE_KNOCKBACK_MS,
          // DISARM — the bayou debuff system's teacher for it, and the only
          // place in the game it appears. Losing your weapon is the harshest of
          // the four, so it belongs on the one fight built entirely out of long
          // telegraphs (660ms here) rather than on anything that can swarm you.
          //
          // It also lands on precisely the right attack: the heave already
          // exists to THROW YOU OUT of melee, so being unable to swing on the
          // way back in extends what the attack was always saying. The window
          // is under the heave's own recovery, so the boss can't chain it.
          debuff: { kind: "disarm", durationMs: HEAVE_DISARM_MS },
        };
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
    if (this.isPhaseLocked()) return false; // hit was refused — no poise chip either
    if (this.tyrantState === "staggered") return false;
    // effectiveDamage, not raw: a capped hit must not break poise at full value.
    this.poise = Math.max(0, this.poise - this.effectiveDamage(damage));
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
