import Phaser from "phaser";
import { Enemy } from "./Enemy";

// Sandmaw — the badlands BURROWING AMBUSHER (biome 2 Phase 2b, the deferred 4th
// native creature). A gloam-touched sand predator that lurks submerged beneath
// the Sunscorch flats (near-invisible, like a badlands Snake) and ERUPTS in a
// telegraphed radial sand-burst when the player wanders into its ambush ring,
// then dives back under and re-stalks. Its threat vector — "watch the ground,
// don't stand still near a lurker" — is deliberately unlike anything else in the
// roster (Duskrunner pack-pounce / Cragscale roll-tank / Hexling flame-mage).
//
// Own bespoke state machine (submerged → surfacing → erupting → exposed →
// burrowing), own constants, per the standing "own numbers, don't share one
// config table" rule. Fully overrides update() (does NOT call super.update() —
// the base chase/wander machine doesn't apply, same precedent as Snake/Hexling).
//
// The eruption is AREA damage centered on the Sandmaw, so it's routed through
// the same checkPlayerHit() path the bosses + Hexling flame use (queried each
// frame by MainScene.updateEnemies) rather than update()'s single-bite boolean.
// You dodge it by reacting to the tremor tell and clearing the burst radius
// (movement- or dash-dodgeable); the post-erupt "exposed" window is the punish.

type SandmawMode = "submerged" | "surfacing" | "erupting" | "exposed" | "burrowing";

const AMBUSH_RADIUS = 62; // player this close (+ off cooldown) → surface & erupt — a trigger, not a chase range
const STALK_RADIUS = 240; // submerged, drifts slowly toward a player within this (outside ambush) to re-ambush
const SUBMERGED_DRIFT = 30; // px/s — slow underground reposition; low so it isn't an invisible shove

const MAX_HEALTH = 45; // between Duskrunner (20) and Cragscale (60) — an ambusher with burst, not a tank
// Physical burst. Badlands-rebalance tier: it must hurt through max (Lvl-3, 13
// flat) armor — 38 - 13 = 25 net, in line with the Duskrunner/Cragscale bumps.
// It's a heavy committed hit but fully telegraphed + movement-dodgeable.
const ERUPT_DAMAGE = 38;
const BURST_RADIUS = 95; // AoE radius around the Sandmaw (the tremor telegraph previews exactly this)
const ERUPT_KNOCKBACK = 220; // a strong sand-blast shove (near-cosmetic today — see Player.update knockback note)

// 560ms tell before the burst detonates. A walking player (95px/s) covers ~52px
// in that window; starting from AMBUSH_RADIUS (62px in) they can just clear
// BURST_RADIUS (95) with a beat of reaction — greedy/advancing players eat it,
// reactive ones (or a dash, which also grants i-frames) escape.
const SURFACE_WINDUP_MS = 560;
const ERUPT_STRIKE_MS = 200; // detonation window checkPlayerHit fires in (long enough for the per-frame query)
const EXPOSED_MS = 1100; // fully surfaced + planted after erupting — the vulnerable punish window
const BURROW_MS = 350; // dive-back-under animation
const RESUBMERGE_COOLDOWN_MS = 2600; // after re-burrowing, before it can ambush again
const SUBMERGED_ALPHA = 0.18; // near-invisible but a keen eye can spot the mound (subtler than Snake's 0.35)

export class Sandmaw extends Enemy {
  private mode: SandmawMode = "submerged";
  private stateStartAt = 0;
  private resubmergeAt = 0;
  private eruptHit = false;
  // Elite-scaled burst damage (mirrors Hexling's per-instance boltDamage — the
  // base ERUPT_DAMAGE const would otherwise be used unscaled for elites too).
  private readonly eruptDamage: number;
  private telegraphGfx: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene, cfg: { x: number; y: number; elite?: boolean }) {
    const elite = cfg.elite ?? false;
    super(scene, {
      x: cfg.x,
      y: cfg.y,
      texture: elite ? "sandmaw_elite" : "sandmaw",
      displayName: elite ? "Elite Sandmaw" : "Sandmaw",
      loot: elite
        ? [{ resource: "sandmaw_chitin", min: 2, max: 2 }]
        : [{ resource: "sandmaw_chitin", min: 1, max: 1 }],
      maxHealth: elite ? Math.round(MAX_HEALTH * 1.5) : MAX_HEALTH,
      biteDamage: 0, // all damage flows through the radial erupt (checkPlayerHit), never a melee bite
      elite,
      eliteTrophy: "sandmaw_trophy",
      // A burrower is hard to pin with a thrust but concussed by a heavy blow:
      // resists pierce, weak to blunt (slash/ranged/magic neutral). Complements
      // Cragscale's inverse (weak-pierce/resist-slash), so clubs/warhammer shine
      // here where the Primal Spear shines there — the damage-type layer rewards
      // carrying more than one weapon into the badlands.
      resistances: { pierce: 0.6, blunt: 1.4 },
    });
    this.eruptDamage = elite ? Math.round(ERUPT_DAMAGE * 1.5) : ERUPT_DAMAGE;
    this.telegraphGfx = scene.add.graphics();
    this.setAlpha(SUBMERGED_ALPHA); // starts lurking
    if (elite) {
      this.speedMult = 1.1;
      this.setScale(1.3);
      this.baseScale = 1.3; // wind-up pulse throbs around the elite's size
    }
  }

  update(_delta: number, playerX: number, playerY: number, now: number): boolean {
    if (this.depleted) return false;
    const body = this.body as Phaser.Physics.Arcade.Body;
    const dist = Phaser.Math.Distance.Between(this.x, this.y, playerX, playerY);
    const elapsed = now - this.stateStartAt;

    switch (this.mode) {
      case "submerged": {
        if (dist <= AMBUSH_RADIUS && now >= this.resubmergeAt) {
          this.beginSurfacing(now);
          return false;
        }
        // Stalk: creep toward a player that's in range but not yet in ambush
        // reach, so it repositions to re-ambush instead of being a dead pixel
        // once you walk past. Holds still otherwise (an invisible shove would
        // feel bad — kept slow for the same reason).
        if (dist <= STALK_RADIUS && dist > AMBUSH_RADIUS) {
          const angle = Phaser.Math.Angle.Between(this.x, this.y, playerX, playerY);
          const spd = SUBMERGED_DRIFT * this.speedMult * this.envSpeedMult;
          const vx = Math.cos(angle) * spd;
          const vy = Math.sin(angle) * spd;
          body.setVelocity(vx, vy);
          this.applyFacing(vx, vy);
        } else {
          body.setVelocity(0, 0);
        }
        return false;
      }

      case "surfacing": {
        body.setVelocity(0, 0);
        this.faceAngle(Phaser.Math.Angle.Between(this.x, this.y, playerX, playerY));
        this.drawTremor(elapsed / SURFACE_WINDUP_MS);
        if (elapsed >= SURFACE_WINDUP_MS) {
          this.mode = "erupting";
          this.stateStartAt = now;
          this.eruptHit = false;
          this.endWindupTell(); // snap the load-up scale back — reads as the burst releasing
          this.drawBurst();
        }
        return false;
      }

      case "erupting": {
        body.setVelocity(0, 0);
        // The AoE hit itself is dealt via checkPlayerHit(), queried by the scene
        // this same window. Just hold and time out into the punish window.
        if (elapsed >= ERUPT_STRIKE_MS) {
          this.mode = "exposed";
          this.stateStartAt = now;
          this.telegraphGfx.clear();
        }
        return false;
      }

      case "exposed": {
        body.setVelocity(0, 0); // fully surfaced, planted, vulnerable — the reward for dodging
        if (elapsed >= EXPOSED_MS) {
          this.mode = "burrowing";
          this.stateStartAt = now;
          this.playBurrowDive();
        }
        return false;
      }

      case "burrowing": {
        body.setVelocity(0, 0);
        if (elapsed >= BURROW_MS) {
          this.mode = "submerged";
          this.setAlpha(SUBMERGED_ALPHA);
          this.resubmergeAt = now + RESUBMERGE_COOLDOWN_MS;
        }
        return false;
      }
    }
    return false;
  }

  // Begin the surface tremor: pop up to full alpha, play the load-up scale/tint
  // tell, and start the growing dust-ring telegraph. Radial around itself, so no
  // direction is locked — the dodge is to leave the burst radius, not to sidestep
  // a line. Takes only `now` (facing is cosmetic, handled in the surfacing tick),
  // so takeHit() can also call it without player coords.
  private beginSurfacing(now: number): void {
    this.mode = "surfacing";
    this.stateStartAt = now;
    this.setAlpha(1);
    this.playWindupTell(SURFACE_WINDUP_MS, 0xffb04a); // amber sand-load tell
  }

  private playBurrowDive(): void {
    this.scene.tweens.add({
      targets: this,
      alpha: SUBMERGED_ALPHA,
      duration: BURROW_MS,
      ease: "Quad.easeIn",
    });
  }

  // Growing dust ring previewing the exact burst radius (a ground telegraph, like
  // the boss slam / Hexling flame tells — animation, not an explicit red danger
  // arc). frac01 ramps 0→1 over the wind-up.
  private drawTremor(frac01: number): void {
    const g = this.telegraphGfx;
    g.clear();
    g.setDepth(this.depth + 0.5);
    const f = Phaser.Math.Clamp(frac01, 0, 1);
    const r = BURST_RADIUS * (0.4 + 0.6 * f);
    g.fillStyle(0xc9a24a, 0.1 + 0.24 * f);
    g.fillCircle(this.x, this.y, r);
    g.lineStyle(2, 0xe0b060, 0.5 + 0.35 * f);
    g.strokeCircle(this.x, this.y, BURST_RADIUS);
  }

  private drawBurst(): void {
    const g = this.telegraphGfx;
    g.clear();
    g.setDepth(this.depth + 0.5);
    g.fillStyle(0xf0d27a, 0.8);
    g.fillCircle(this.x, this.y, BURST_RADIUS * 0.6);
    g.fillStyle(0xc9a24a, 0.45);
    g.fillCircle(this.x, this.y, BURST_RADIUS);
  }

  // Queried each frame by MainScene.updateEnemies() (like the bosses / Hexling
  // flame). Physical radial burst with a strong knockback; one hit per eruption.
  // Rides applyDamageToPlayer, so dash i-frames/armor "just work" against it.
  checkPlayerHit(playerX: number, playerY: number): { damage: number; knockback: number } | null {
    if (this.mode !== "erupting" || this.eruptHit) return null;
    if (Phaser.Math.Distance.Between(this.x, this.y, playerX, playerY) <= BURST_RADIUS + this.reachBonus()) {
      this.eruptHit = true;
      return { damage: this.eruptDamage, knockback: ERUPT_KNOCKBACK };
    }
    return null;
  }

  // Attacked while lurking (e.g. an unlucky weapon-arc sweep catches the mound) →
  // surface and erupt in retaliation rather than sit there tanking hits. Mirrors
  // Snake/Hexling's reveal-and-fight-back takeHit override. If already surfaced,
  // let the current cycle play out (a committed erupt isn't interruptible).
  takeHit(damage: number): boolean {
    const depleted = super.takeHit(damage);
    if (depleted) return true;
    if (this.mode === "submerged") {
      this.beginSurfacing(this.scene.time.now);
    }
    return false;
  }

  // HP bar only shows once it has surfaced (mirrors Snake hiding its bar while
  // hidden) — a lurking Sandmaw gives away nothing.
  isAggro(): boolean {
    return this.mode !== "submerged";
  }

  // Tear down the telegraph Graphics with the sprite (separate GameObject, not
  // destroyed by the base fade) — same as Hexling.
  playDeathFeedback(onComplete: () => void): void {
    this.telegraphGfx.clear();
    this.telegraphGfx.destroy();
    super.playDeathFeedback(onComplete);
  }
}
