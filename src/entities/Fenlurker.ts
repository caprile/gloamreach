import Phaser from "phaser";
import { Enemy } from "./Enemy";

// Fenlurker — the bayou's MUCK-BURROWING AMBUSHER (biome 3 Phase 4b), the
// Sandmaw's water analog. It tunnels under the silt, invisible and untargetable,
// stalks toward you, and erupts into a MELEE MAUL: a locked-direction burst out
// of the ground that rakes forward, rather than the Sandmaw's radial burst.
//
// That difference is the whole point of shipping both. The Sandmaw detonates a
// ring around itself, so you dodge by CLEARING DISTANCE. The Fenlurker rakes a
// LINE out of the mud, so you dodge by STEPPING ASIDE — and if you dodge it, it
// is left planted and fully exposed for a long punish window with no radial
// safety net. Same threat vector ("watch the ground"), opposite dodge verb.
//
// Own bespoke state machine (buried → surfacing → mauling → exposed → digging),
// fully overriding update() (Sandmaw/Snake/Hexling precedent).

type FenMode = "buried" | "surfacing" | "mauling" | "exposed" | "digging";

const AMBUSH_RADIUS = 120; // player this close (+ off cooldown) → burst out
const STALK_RADIUS = 480; // buried, tunnels toward a player inside this to line up an ambush
// 130px/s under the silt — genuinely hunting, and it's UNSEEN while doing it, so
// speed here reads as dread rather than unfairness (you can still sprint away;
// you just can't stroll). The first pass crawled at 40 and never caught anyone.
const BURROW_DRIFT = 130;
const BURIED_ALPHA = 0.12; // a barely-there ripple in the muck

const MAX_HEALTH = 220;

// The maul: a short, fast, LOCKED-direction rake forward. Shorter than a
// Mirejaw's lunge (it comes up right under you, it doesn't need to travel), but
// it strikes on contact anywhere along the rake.
const SURFACE_WINDUP_MS = 500; // silt-bulge tell — the sidestep window
const MAUL_SPEED = 420;
const MAUL_MAX_DIST = 150;
const MAUL_HIT_RADIUS = 46;
const MAUL_DAMAGE = 110;
const MAUL_KNOCKBACK = 240;
const MAUL_BLEED_DPS = 7;
const MAUL_BLEED_MS = 5000;

const EXPOSED_MS = 1000; // planted, fully surfaced — the reward for stepping aside
const DIG_MS = 380;
const REBURY_COOLDOWN_MS = 1900;

export class Fenlurker extends Enemy {
  private mode: FenMode = "buried";
  private stateStartAt = 0;
  private reburyAt = 0;
  private maulAngle = 0;
  private maulTraveled = 0;
  private maulHit = false;
  private telegraphGfx: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene, cfg: { x: number; y: number; elite?: boolean }) {
    const elite = cfg.elite ?? false;
    super(scene, {
      x: cfg.x,
      y: cfg.y,
      texture: elite ? "fenlurker_elite" : "fenlurker",
      displayName: elite ? "Elite Fenlurker" : "Fenlurker",
      // It dredges up what the bog swallowed — the bayou's bone supply, which
      // otherwise only came from forest Boars.
      loot: elite
        ? [{ resource: "bones", min: 4, max: 5 }]
        : [{ resource: "bones", min: 2, max: 3 }],
      maxHealth: elite ? Math.round(MAX_HEALTH * 1.5) : MAX_HEALTH,
      biteDamage: elite ? Math.round(MAUL_DAMAGE * 1.5) : MAUL_DAMAGE,
      elite,
      eliteTrophy: "fenlurker_trophy",
      // Slick, boneless and slippery: an edge skids off it, but a heavy blow
      // has nothing to slide against. The exact inverse of the Mirejaw
      // (resist pierce / weak slash), so the two bayou ambushers want
      // different weapons — the damage-type layer's whole purpose.
      resistances: { slash: 0.5, blunt: 1.25 },
    });
    this.telegraphGfx = scene.add.graphics();
    this.setAlpha(BURIED_ALPHA);
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
    const elapsed = now - this.stateStartAt;

    switch (this.mode) {
      case "buried": {
        if (this.forceSurface || (dist <= AMBUSH_RADIUS && now >= this.reburyAt)) {
          this.forceSurface = false;
          this.beginSurfacing(now, playerX, playerY);
          return false;
        }
        if (dist <= STALK_RADIUS && dist > AMBUSH_RADIUS) {
          const ang = Phaser.Math.Angle.Between(this.x, this.y, playerX, playerY);
          const spd = BURROW_DRIFT * this.speedMult * this.envSpeedMult;
          const vx = Math.cos(ang) * spd;
          const vy = Math.sin(ang) * spd;
          body.setVelocity(vx, vy);
          this.applyFacing(vx, vy);
          this.drawSiltTrail();
        } else {
          body.setVelocity(0, 0);
          this.telegraphGfx.clear();
        }
        return false;
      }

      case "surfacing": {
        body.setVelocity(0, 0);
        this.faceAngle(this.maulAngle); // points along the LOCKED rake during the tell
        this.drawSiltBulge(elapsed / SURFACE_WINDUP_MS);
        if (elapsed >= SURFACE_WINDUP_MS) {
          this.mode = "mauling";
          this.stateStartAt = now;
          this.maulTraveled = 0;
          this.maulHit = false;
          this.endWindupTell();
          this.setAlpha(1);
          this.telegraphGfx.clear();
          const spd = MAUL_SPEED * this.speedMult;
          body.setVelocity(Math.cos(this.maulAngle) * spd, Math.sin(this.maulAngle) * spd);
        }
        return false;
      }

      case "mauling": {
        this.maulTraveled += (MAUL_SPEED * this.speedMult * delta) / 1000;
        if (!this.maulHit && dist <= MAUL_HIT_RADIUS + this.reachBonus()) {
          this.maulHit = true;
          this.pendingAttackKnockback = MAUL_KNOCKBACK;
          this.pendingBleed = { dmgPerSec: MAUL_BLEED_DPS, durationMs: MAUL_BLEED_MS };
          this.markAttackLanded(now);
          body.setVelocity(0, 0);
          this.mode = "exposed";
          this.stateStartAt = now;
          return true;
        }
        if (this.maulTraveled >= MAUL_MAX_DIST) {
          body.setVelocity(0, 0);
          this.mode = "exposed";
          this.stateStartAt = now;
        }
        return false;
      }

      case "exposed": {
        body.setVelocity(0, 0);
        if (elapsed >= EXPOSED_MS) {
          this.mode = "digging";
          this.stateStartAt = now;
          this.scene.tweens.add({ targets: this, alpha: BURIED_ALPHA, duration: DIG_MS, ease: "Quad.easeIn" });
        }
        return false;
      }

      case "digging": {
        body.setVelocity(0, 0);
        if (elapsed >= DIG_MS) {
          this.mode = "buried";
          this.setAlpha(BURIED_ALPHA);
          this.reburyAt = now + REBURY_COOLDOWN_MS;
        }
        return false;
      }
    }
    return false;
  }

  // Lock the rake direction at wind-up start (never re-read afterwards) and
  // play the load-up tell. Takes player coords, unlike the Sandmaw's radial
  // version, precisely because this attack HAS a direction to commit to.
  private beginSurfacing(now: number, playerX: number, playerY: number): void {
    this.mode = "surfacing";
    this.stateStartAt = now;
    this.maulAngle = Phaser.Math.Angle.Between(this.x, this.y, playerX, playerY);
    this.setAlpha(0.75); // heaving up out of the silt, not fully out yet
    this.playWindupTell(SURFACE_WINDUP_MS, 0x8fd94a); // sickly bayou green
  }

  // Faint churned-silt wake while tunneling — the only tell that something is
  // moving under the mud. Sparse on purpose: spottable, not obvious.
  private drawSiltTrail(): void {
    const g = this.telegraphGfx;
    g.clear();
    g.setDepth(this.depth + 0.5);
    g.fillStyle(0x4a4a3a, 0.3);
    g.fillEllipse(this.x, this.y + 2, 20, 9);
    g.fillStyle(0x6a6a52, 0.22);
    g.fillEllipse(this.x, this.y, 12, 6);
  }

  // The ambush tell: silt heaving up, plus a short wedge along the LOCKED rake
  // direction previewing where the maul is about to come from — an animation
  // cue, not a red danger arc (the locked "players learn hitboxes" direction).
  private drawSiltBulge(frac01: number): void {
    const g = this.telegraphGfx;
    g.clear();
    g.setDepth(this.depth + 0.5);
    const f = Phaser.Math.Clamp(frac01, 0, 1);
    g.fillStyle(0x5a5a44, 0.25 + 0.3 * f);
    g.fillEllipse(this.x, this.y, 26 + 16 * f, 12 + 8 * f);
    // Clods thrown along the rake line as it breaks the surface.
    const reach = (MAUL_MAX_DIST * 0.55) * f;
    for (let i = 1; i <= 3; i++) {
      const d = (reach * i) / 3;
      const cx = this.x + Math.cos(this.maulAngle) * d;
      const cy = this.y + Math.sin(this.maulAngle) * d;
      g.fillStyle(0x6a6a52, 0.5 * f);
      g.fillCircle(cx, cy, 3.5 - i * 0.6);
    }
  }

  // Damaged while buried (it can't be clicked — see isTargetable — but an
  // untargeted AoE like the Gloam Nova still reaches it) → burst out and
  // retaliate rather than soak it, the Snake/Sandmaw reveal-and-fight-back
  // precedent. takeHit gets no player coords and this attack has a LOCKED
  // direction, so it only arms a flag; update() commits the ambush next frame,
  // where the real aim point is available.
  private forceSurface = false;
  takeHit(damage: number): boolean {
    const depleted = super.takeHit(damage);
    if (!depleted && this.mode === "buried") this.forceSurface = true;
    return depleted;
  }

  // Invisible AND unclickable while under the silt (the Sandmaw's locked rule —
  // "shouldn't be attackable while invisible"); the HP bar stays hidden too.
  isAggro(): boolean {
    return this.mode !== "buried";
  }
  isTargetable(): boolean {
    return this.mode !== "buried";
  }

  playDeathFeedback(onComplete: () => void): void {
    this.telegraphGfx.clear();
    this.telegraphGfx.destroy();
    super.playDeathFeedback(onComplete);
  }
}
