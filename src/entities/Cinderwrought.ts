import Phaser from "phaser";
import { TELEGRAPH_DEPTH } from "../systems/depth";
import { coneFx } from "../art/attackFx";
import { Enemy } from "./Enemy";
import type { IncomingDamageType } from "../systems/Weapons";
import { enemyStat } from "../systems/enemyStats";

// Combat stats from the Phaser-free source of truth (also read by the balancing
// dashboard, so the two can never drift). Tune numbers there, not here.
const S = enemyStat("cinderwrought");


// The Sunken Forge's guardian mini-boss (biome 2 Phase 3, POI 2). Bespoke AI
// following the Gloamwarden/GremlinKing telegraph pattern but its OWN identity:
// a SOLO, heavily-armored anvil-boss that CANNOT be staggered. Extends Enemy for
// the HP-bar/loot/death machinery but fully overrides update() (Snake/Boar/
// Gloamwarden precedent).
//
// Reworked (PB17, the user): the old fight was a 2v1 of stationary fire-swingers
// with attacks that could be walked out of — it read as chaotic, not cohesive
// (unlike the solo Gloamwarden). Now it's ONE tanky boss whose attacks are
// near-impossible to WALK out of and must be dashed through (i-frames):
//   • CINDER CONE — rears back, then exhales a wide fire cone that RE-AIMS at the
//     player at the moment it fires (locks at execute, tracks through the
//     wind-up). You can't sidestep it — the fan follows you — so the dodge is a
//     dash through the burst. No cone attack exists elsewhere in the game.
//   • FORGE HAMMER — a heavy overhead front-arc smash with long reach; it locks
//     onto the player at execute too, so backing out of the slow player-speed
//     window doesn't clear it. Dash the overhead beat or eat it.
// No stagger/poise mechanic: this boss is a straight survive-and-DPS wall, so the
// player leans on their dash toolkit rather than a stagger-punish loop.
export type WroughtState = "idle" | "telegraphing" | "executing" | "recovering";
export type WroughtAttackType = "cone" | "hammer";

const WROUGHT_MAX_HEALTH = S.hp; // solo & unstaggerable now — a real tanky wall (was 260 across two guards)
export const CINDERWROUGHT_SCALE = 1.8;
const AGGRO_RADIUS = 260;
const LEASH_RADIUS = 520; // kited past this -> fully deaggros
const MOVE_SPEED = 52;
const DEAGGRO_REGEN_PER_SEC = 12; // claws HP back between engagements (GremlinKing/Gloamwarden precedent)

// Kept exported for MainScene's staggerMultiplierFor() switch — but this boss
// can't stagger (isStaggered() always false), so the multiplier never applies.
// The value is inert; left so the import/switch arm don't need churn.
export const CINDERWROUGHT_STAGGER_DAMAGE_MULTIPLIER = 1;

// Cinder Cone — wide fire breath that RE-AIMS at the player when it fires. Long
// readable wind-up; because it locks at execute (not telegraph start) and the
// player walks slowly, you can't outrun the fan — dash through it.
const CONE_TELEGRAPH_MS = 720;
const CONE_IMPACT_MS = 420; // breath sustained; the hit lands once within this window
const CONE_RECOVER_MS = 650;
const CONE_RANGE = 300; // long enough that a slow walk can't clear it in the wind-up
const CONE_HALF_ANGLE = Phaser.Math.DegToRad(44); // ~88deg fan
// Fire damage — bypasses flat armor (like magic), so it hurts even in full
// plate. Solo boss now, so restored to a real threat (was nerfed to 32 for the
// 2v1). Getting caught should really sting.
const CONE_DAMAGE = S.attacks[0].damage;
const CONE_KNOCKBACK = 140;

// Forge Hammer — heavy overhead front-arc smash. Locks direction at execute and
// reaches far, so backing out at the slow player walk speed doesn't clear it;
// dash the overhead beat instead.
const HAMMER_TELEGRAPH_MS = 660;
const HAMMER_IMPACT_MS = 150; // planted overhead beat — the strike window
const HAMMER_RECOVER_MS = 720;
const HAMMER_RANGE = 235; // long front reach — can't back-pedal out at 95px/s
const HAMMER_HALF_ARC = Phaser.Math.DegToRad(70); // wide front wedge
// Physical (armor matters against the crushing blow) — restored to a solo-boss
// value (was 40 for the 2v1). Big knockback.
const HAMMER_DAMAGE = S.attacks[1].damage;
const HAMMER_KNOCKBACK = 260;

const MELEE_STOP_RANGE = 150; // both attacks reach from here; stops approaching inside it
// Only START an attack when the player is actually reachable — the shorter attack
// (Forge Hammer, 235) plus a margin, so whichever attack is picked can connect.
const ATTACK_INIT_RANGE = HAMMER_RANGE + 24;
const ATTACK_COOLDOWN_MS = 850; // solo cadence (was 1050 to survive the 2v1) — matches the Gloamwarden
// How close to spawn counts as "home" while wandering back deaggro'd (mirrors
// GremlinKing/Gloamwarden) — below this it idles instead of micro-adjusting.
const RETURN_HOME_EPS = 20;

function telegraphMsFor(attack: WroughtAttackType): number {
  return attack === "cone" ? CONE_TELEGRAPH_MS : HAMMER_TELEGRAPH_MS;
}
function recoverMsFor(attack: WroughtAttackType): number {
  return attack === "cone" ? CONE_RECOVER_MS : HAMMER_RECOVER_MS;
}

export class Cinderwrought extends Enemy {
  private wroughtState: WroughtState = "idle";
  private currentAttack: WroughtAttackType | null = null;
  private lastAttack: WroughtAttackType | null = null;
  private stateEnteredAt = 0;
  private currentStateDurationMs = 0;
  private nextAttackReadyAt = 0;
  private aggroed = false;
  private readonly spawnX: number;
  private readonly spawnY: number;

  // The locked direction both attacks fire in (radians) — both lock at EXECUTE
  // (re-aim at the player when the attack fires) so neither can be sidestepped.
  private attackAngle = 0;

  private hasHitThisAttack = false;

  private telegraphGfx: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene, cfg: { x: number; y: number; dropTrophy?: boolean }) {
    super(scene, {
      x: cfg.x,
      y: cfg.y,
      texture: "cinderwrought",
      displayName: "Cinderwrought",
      // Guaranteed drop (the user): the badlands "ember guy" is the native Ember
      // Shard source. Now a SOLO boss, so the single drop is bumped to keep the
      // per-forge ember-shard payoff high — "gotta be worth it" (was 2-4 across
      // two guards; now 5-8 from the one). Plus the tier-2 refined trophy.
      loot: [
        { resource: "ember_shard", min: 5, max: 8 },
        ...(cfg.dropTrophy ?? true ? [{ resource: "refined_trophy_uncommon_t2" as const, min: 1, max: 1 }] : []),
      ],
      maxHealth: WROUGHT_MAX_HEALTH,
      biteDamage: 0, // all damage flows through checkPlayerHit()
      // No weaknesses (playtest): weakness on a mini-boss stacked too hard with
      // crit/Onslaught. Fully neutral to every physical type — a straight DPS
      // check, not a bring-the-right-weapon puzzle.
      resistances: {},
      barScale: 2.4, // big overhead HP bar to match the 1.8× sprite (readable mini-boss bar)
    });
    this.spawnX = cfg.x;
    this.spawnY = cfg.y;
    this.baseScale = CINDERWROUGHT_SCALE;
    this.setScale(CINDERWROUGHT_SCALE);

    this.telegraphGfx = scene.add.graphics();
  }

  isAggro(): boolean {
    return this.aggroed;
  }
  // No poise/stagger mechanic on this boss — kept for MainScene's shared
  // staggerMultiplierFor() switch, always false.
  isStaggered(): boolean {
    return false;
  }

  update(delta: number, playerX: number, playerY: number, now: number): boolean {
    if (this.depleted) return false;
    if (!this.aggroed && this.health < this.maxHealth) {
      this.health = Math.min(this.maxHealth, this.health + DEAGGRO_REGEN_PER_SEC * (delta / 1000));
      this.applyHpTint();
    }

    switch (this.wroughtState) {
      case "telegraphing":
        this.updateTelegraphing(playerX, playerY, now);
        return false;
      case "executing":
        this.updateExecuting(now);
        return false;
      case "recovering":
        this.updateRecovering(now, playerX, playerY);
        return false;
      default:
        this.updateIdle(playerX, playerY, now);
        return false;
    }
  }

  private updateIdle(playerX: number, playerY: number, now: number): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    const distFromSpawn = Phaser.Math.Distance.Between(this.x, this.y, this.spawnX, this.spawnY);
    if (this.aggroed && distFromSpawn > LEASH_RADIUS) this.aggroed = false;

    const dist = Phaser.Math.Distance.Between(this.x, this.y, playerX, playerY);
    if (!this.aggroed) {
      if (dist <= AGGRO_RADIUS) {
        this.aggroed = true;
      } else {
        // Deaggro'd (kited past the leash) — wander back toward its own spawn so
        // it doesn't get stranded far from the forge (GremlinKing/Gloamwarden).
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

    // Only commit to an attack when the player is actually reachable; otherwise
    // fall through and keep closing the gap. reachBonus() covers the 1.8× sprite's
    // extra body radius.
    if (now >= this.nextAttackReadyAt && dist <= ATTACK_INIT_RANGE + this.reachBonus()) {
      this.beginTelegraph(this.pickAttack(), now);
      return;
    }

    if (dist > MELEE_STOP_RANGE) {
      const angle = Phaser.Math.Angle.Between(this.x, this.y, playerX, playerY);
      const vx = Math.cos(angle) * MOVE_SPEED;
      const vy = Math.sin(angle) * MOVE_SPEED;
      body.setVelocity(vx, vy);
      this.applyFacing(vx, vy);
    } else {
      body.setVelocity(0, 0);
      this.applyFacing(playerX - this.x, playerY - this.y);
    }
  }

  private pickAttack(): WroughtAttackType {
    // Alternate the two attacks (never twice in a row).
    const options: WroughtAttackType[] = ["cone", "hammer"];
    const pool = this.lastAttack ? options.filter((a) => a !== this.lastAttack) : options;
    const choice = pool[Phaser.Math.Between(0, pool.length - 1)];
    this.lastAttack = choice;
    return choice;
  }

  private beginTelegraph(attack: WroughtAttackType, now: number): void {
    this.currentAttack = attack;
    this.wroughtState = "telegraphing";
    this.stateEnteredAt = now;
    this.currentStateDurationMs = telegraphMsFor(attack);
    (this.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
    // Both attacks re-aim at the player at EXECUTE (see beginExecute), so the
    // telegraph just tracks the player — nothing is locked yet.
  }

  private updateTelegraphing(playerX: number, playerY: number, now: number): void {
    // Both attacks track the player during the wind-up (direction locks at
    // execute), so the tell honestly follows you — you can't pre-dodge by
    // sidestepping, only by dashing when it fires.
    this.applyFacing(playerX - this.x, playerY - this.y);
    this.drawTelegraph(playerX, playerY, now);
    if (now >= this.stateEnteredAt + this.currentStateDurationMs) this.beginExecute(now, playerX, playerY);
  }

  private beginExecute(now: number, playerX: number, playerY: number): void {
    this.wroughtState = "executing";
    this.stateEnteredAt = now;
    // Bosses resolve damage through checkPlayerHit() and never touch the
    // shared attackPhase, so without this nothing would ever play their
    // attack strip — the animation existed but was unreachable.
    this.markAttackAnim();
    this.hasHitThisAttack = false;
    this.telegraphGfx.clear();
    (this.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
    // Lock the direction at the player NOW (both attacks). Because the player
    // walks slowly (95px/s) and the hitboxes are wide/long, they're inside the
    // shape at this instant — the only escape is a dash's i-frames.
    this.attackAngle = Phaser.Math.Angle.Between(this.x, this.y, playerX, playerY);
    this.faceAngle(this.attackAngle);
    this.currentStateDurationMs = this.currentAttack === "cone" ? CONE_IMPACT_MS : HAMMER_IMPACT_MS;
    this.spawnExecuteFx();
  }

  private updateExecuting(now: number): void {
    if (now >= this.stateEnteredAt + this.currentStateDurationMs) this.beginRecover(now);
  }

  private beginRecover(now: number): void {
    this.wroughtState = "recovering";
    this.stateEnteredAt = now;
    this.currentStateDurationMs = recoverMsFor(this.currentAttack!);
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
      this.wroughtState = "idle";
      this.nextAttackReadyAt = now + ATTACK_COOLDOWN_MS;
    }
  }

  // Wedge helper: fill a fire-colored sector centered on `angle`.
  private fillWedge(
    g: Phaser.GameObjects.Graphics,
    angle: number,
    halfAngle: number,
    range: number,
    color: number,
    alpha: number,
  ): void {
    g.fillStyle(color, alpha);
    g.beginPath();
    g.moveTo(this.x, this.y);
    g.arc(this.x, this.y, range, angle - halfAngle, angle + halfAngle);
    g.closePath();
    g.fillPath();
  }

  private drawTelegraph(playerX: number, playerY: number, now: number): void {
    const g = this.telegraphGfx;
    g.clear();
    g.setDepth(TELEGRAPH_DEPTH);
    const frac = Phaser.Math.Clamp(
      this.currentStateDurationMs > 0 ? (now - this.stateEnteredAt) / this.currentStateDurationMs : 1,
      0,
      1,
    );
    // Telegraph tracks the CURRENT player angle (both attacks lock at execute).
    const facing = Phaser.Math.Angle.Between(this.x, this.y, playerX, playerY);
    if (this.currentAttack === "cone") {
      // Growing ember fan toward the player — faint fill that brightens as the
      // breath charges, with a crisp outline at the true reach so the dodge
      // boundary reads.
      this.fillWedge(g, facing, CONE_HALF_ANGLE, CONE_RANGE, 0xff6a1a, 0.1 + 0.22 * frac);
      g.lineStyle(2, 0xffb060, 0.55);
      g.beginPath();
      g.moveTo(this.x, this.y);
      g.arc(this.x, this.y, CONE_RANGE, facing - CONE_HALF_ANGLE, facing + CONE_HALF_ANGLE);
      g.closePath();
      g.strokePath();
    } else {
      // Hammer: a wide front wedge that fills as the overhead winds up.
      this.fillWedge(g, facing, HAMMER_HALF_ARC, HAMMER_RANGE, 0xff4a1a, 0.12 + 0.3 * frac);
      g.lineStyle(2, 0xffa050, 0.6);
      g.beginPath();
      g.moveTo(this.x, this.y);
      g.arc(this.x, this.y, HAMMER_RANGE, facing - HAMMER_HALF_ARC, facing + HAMMER_HALF_ARC);
      g.closePath();
      g.strokePath();
    }
  }

  // The execute-phase visual: one art sprite of the attack's shape at full
  // reach, in the LOCKED direction. Fire-and-forget — the direction can't change
  // once execute begins, so nothing needs to track the boss, and the sprite
  // survives its own death/despawn to finish rather than being stranded by it.
  private spawnExecuteFx(): void {
    if (this.currentAttack === "cone") {
      coneFx(this.scene, "fx_fire_cone", this.x, this.y, this.attackAngle, CONE_RANGE, CONE_HALF_ANGLE, CONE_IMPACT_MS);
    } else {
      coneFx(
        this.scene,
        "fx_hammer_arc",
        this.x,
        this.y,
        this.attackAngle,
        HAMMER_RANGE,
        HAMMER_HALF_ARC,
        // The strike window is a 150ms beat, too short to see the crush land —
        // the art outlives the hitbox on purpose.
        HAMMER_IMPACT_MS + 220,
      );
    }
  }

  // Queried each frame by MainScene.updateEnemies() (like GremlinKing/Gloamwarden)
  // — area damage needs richer info (knockback) than the base bite bool.
  checkPlayerHit(
    playerX: number,
    playerY: number,
  ): { damage: number; knockback?: number; dmgType?: IncomingDamageType } | null {
    if (this.wroughtState !== "executing" || this.hasHitThisAttack) return null;
    const dist = Phaser.Math.Distance.Between(this.x, this.y, playerX, playerY);
    const angleToPlayer = Phaser.Math.Angle.Between(this.x, this.y, playerX, playerY);
    const angleDiff = Math.abs(Phaser.Math.Angle.Wrap(angleToPlayer - this.attackAngle));
    // reachBonus() = the extra body-half the 1.8× scale adds, so a hit registers
    // at the sprite's visual edge, not just its center.
    const reach = this.reachBonus();
    if (this.currentAttack === "cone") {
      if (dist > CONE_RANGE + reach || angleDiff > CONE_HALF_ANGLE) return null;
      this.hasHitThisAttack = true;
      return { damage: CONE_DAMAGE, knockback: CONE_KNOCKBACK, dmgType: "fire" };
    }
    if (dist > HAMMER_RANGE + reach || angleDiff > HAMMER_HALF_ARC) return null;
    this.hasHitThisAttack = true;
    // Physical (armor matters against the crushing blow) — the molten HEAD is
    // fire-forged but the impact itself is a crush, not a burn.
    return { damage: HAMMER_DAMAGE, knockback: HAMMER_KNOCKBACK };
  }

  takeHit(damage: number): boolean {
    // Being hit (incl. a ranged shot that out-ranges AGGRO_RADIUS) wakes it —
    // proximity was the ONLY aggro path before, so it ignored ranged pokes.
    // Once aggro'd, MainScene.updatePackAggro wakes any forge-mate next frame.
    this.aggroed = true;
    return super.takeHit(damage);
  }

  // Pack-aggro (MainScene.updatePackAggro) — flip OUR own aggro field, since the
  // base forceAggro() drives the `state` machine this subclass doesn't use.
  forceAggro(_now: number): void {
    if (this.depleted) return;
    this.aggroed = true;
  }

  playDeathFeedback(onComplete: () => void): void {
    this.telegraphGfx.destroy();
    super.playDeathFeedback(onComplete);
  }
}
