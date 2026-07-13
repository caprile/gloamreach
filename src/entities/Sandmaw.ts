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
const ERUPT_DAMAGE = 46; // bumped 38→46 — a big committed ambush should really punish getting caught (badlands damage pass)
const BURST_RADIUS = 95; // AoE radius around the Sandmaw (the tremor telegraph previews exactly this)
const ERUPT_KNOCKBACK = 220; // a strong sand-blast shove (near-cosmetic today — see Player.update knockback note)

// 560ms tell before the burst detonates. A walking player (95px/s) covers ~52px
// in that window; starting from AMBUSH_RADIUS (62px in) they can just clear
// BURST_RADIUS (95) with a beat of reaction — greedy/advancing players eat it,
// reactive ones (or a dash, which also grants i-frames) escape.
const SURFACE_WINDUP_MS = 560;
const ERUPT_STRIKE_MS = 340; // detonation window (long enough for the spikes to visibly shoot up + the per-frame hit query)
const EXPOSED_MS = 1100; // fully surfaced + planted after erupting — the vulnerable punish window
const BURROW_MS = 350; // dive-back-under animation
const RESUBMERGE_COOLDOWN_MS = 2600; // after re-burrowing, before it can ambush again
const SUBMERGED_ALPHA = 0.18; // near-invisible but a keen eye can spot the mound (subtler than Snake's 0.35)

// S-curve stalk: while creeping toward the player it weaves side-to-side instead
// of tracking in a dead-straight line, so the approaching mound reads as a
// snaking predator and is harder to read a fixed offset off of. The heading is
// the true player-angle plus a sine wobble; WEAVE_MAX_ANGLE is the peak swing
// off-axis (~52°) and WEAVE_ANGULAR_SPEED sets the weave period (~1.5s/cycle).
const WEAVE_MAX_ANGLE = 0.9; // radians of peak deflection to either side of the player-heading
const WEAVE_ANGULAR_SPEED = 0.0042; // radians/ms of sine phase (2π/~1500ms → one full S per ~1.5s)

export class Sandmaw extends Enemy {
  private mode: SandmawMode = "submerged";
  private stateStartAt = 0;
  private resubmergeAt = 0;
  private eruptHit = false;
  private weavePhase = 0; // S-curve stalk sine accumulator (advanced by delta)
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

  update(delta: number, playerX: number, playerY: number, now: number): boolean {
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
          // Weave toward the player in an S-curve rather than a straight line:
          // heading = true player-angle + a sine wobble that swings ±WEAVE_MAX_ANGLE.
          this.weavePhase += delta * WEAVE_ANGULAR_SPEED;
          const base = Phaser.Math.Angle.Between(this.x, this.y, playerX, playerY);
          const heading = base + Math.sin(this.weavePhase) * WEAVE_MAX_ANGLE;
          const spd = SUBMERGED_DRIFT * this.speedMult * this.envSpeedMult;
          const vx = Math.cos(heading) * spd;
          const vy = Math.sin(heading) * spd;
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
        }
        return false;
      }

      case "erupting": {
        body.setVelocity(0, 0);
        // Animate the sand/stone spikes shooting up over the strike window. The
        // AoE hit itself is dealt via checkPlayerHit(), queried by the scene this
        // same window. Just hold and time out into the punish window.
        this.drawEruptionSpikes(elapsed / ERUPT_STRIKE_MS);
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

  // The eruption's execute-phase visual: a ring of sand/stone spikes violently
  // bursting up around the Sandmaw (mirrors the Gloamwarden's crystal-spike
  // eruption, but sand/stone-colored + centered on itself rather than a locked
  // ground spot). frac01 ramps 0→1 over ERUPT_STRIKE_MS; spikes shoot up fast
  // (rise clamps early) then hold for the rest of the window.
  private drawEruptionSpikes(frac01: number): void {
    const g = this.telegraphGfx;
    g.clear();
    g.setDepth(this.depth + 0.5);
    const f = Phaser.Math.Clamp(frac01, 0, 1);
    const rise = Math.min(1, f * 2.4); // spikes snap up in the first ~40% of the window
    // Lingering dust wash under the spikes, fading as they settle.
    g.fillStyle(0xc9a24a, 0.3 * (1 - f * 0.55));
    g.fillCircle(this.x, this.y, BURST_RADIUS);
    // Ring of jagged sand/stone spikes around the burst edge.
    const count = 9;
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + (i % 2) * 0.36;
      const dd = BURST_RADIUS * (0.45 + 0.5 * ((i % 3) / 2));
      const sx = this.x + Math.cos(a) * dd;
      const sy = this.y + Math.sin(a) * dd;
      const hgt = (15 + (i % 3) * 9) * rise;
      const w = 5 + (i % 2) * 2;
      g.fillStyle(0x8a6a45, 0.92); // dark stone base
      g.fillTriangle(sx - w, sy + 4, sx + w, sy + 4, sx, sy - hgt);
      g.fillStyle(0xe8d6a8, 0.85); // pale sand highlight sliver
      g.fillTriangle(sx - w * 0.4, sy + 2, sx + w * 0.4, sy + 2, sx, sy - hgt * 0.9);
    }
    // Central plume erupting straight out of the mound.
    g.fillStyle(0xcbb488, 0.95);
    g.fillTriangle(this.x - 7, this.y + 5, this.x + 7, this.y + 5, this.x, this.y - 28 * rise);
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

  // Un-targetable while submerged (the user: "shouldn't be attackable while
  // invisible") — the player can't hover-click or weapon-arc-sweep a lurking
  // mound. The reveal-on-hit takeHit() path is now only reachable once it has
  // surfaced, which is the intended interaction.
  isTargetable(): boolean {
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
