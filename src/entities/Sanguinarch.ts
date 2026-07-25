import Phaser from "phaser";
import { Enemy } from "./Enemy";
import type { IncomingDamageType } from "../systems/Weapons";
import { enemyStat } from "../systems/enemyStats";

// Combat stats from the Phaser-free source of truth (also read by the balancing dashboard).
const S = enemyStat("sanguinarch");

// The blood crypt's warden (biome 3 Phase 4c). Bespoke AI: extends Enemy, fully
// overrides update(). The third of three deliberately different crypt machines —
// where the Palewake is a positioning puzzle and the Kilnborn is an arena timer,
// the Sanguinarch's phases are driven BY THE PLAYER'S OWN DEBUFF:
//
//   frenzy ⇄ feed → engorged → frenzy …
//
//   • frenzy — fast, cheap flurry swings that STACK BLEED on you (the existing
//     pendingBleed contract). Low damage per hit; the bleed is the real payload.
//   • feed — it plants and channels. If you are BLEEDING when the channel lands
//     it drinks: heals itself and swells into…
//   • engorged — slow, huge, telegraphed slams, and it takes bonus damage the
//     whole time (this fight's stagger, see ENGORGED_DAMAGE_MULTIPLIER).
//
// So the player chooses the fight: bleed and you hand it heals but get a long,
// juicy punish phase; stay clean (dodge the flurry, or outlast the stacks) and
// it never opens up — you grind a fast, frantic, never-vulnerable enemy down.
// Nothing here is chip-the-poise-bar, and nothing here is on the boss's clock.
//
// MainScene pushes `playerBleeding` each frame (an enemy can't see player state
// through update()'s signature) — the one wire this fight needs.
export type SanguinarchState = "frenzy" | "feed" | "engorged";

export const SANGUINARCH_SCALE = 1.5;
export const SANGUINARCH_ENGORGED_SCALE = 1.85; // the sac visibly swells when it drinks
export const SANGUINARCH_ENGORGED_DAMAGE_MULTIPLIER = 1.7;

const MAX_HEALTH = S.hp;
const AGGRO_RADIUS = 300;
const LEASH_RADIUS = 900;
const DEAGGRO_REGEN_PER_SEC = 10;

const FRENZY_SPEED = 88;
const ENGORGED_SPEED = 32;

// Flurry: quick, low-damage, high-bleed. Short wind-up on purpose — these are
// meant to be hard to dodge every single time, which is what makes "stay clean"
// a real challenge rather than a free win.
const SLASH_WINDUP_MS = 300;
const SLASH_STRIKE_MS = 80;
const SLASH_RECOVER_MS = 260;
const SLASH_COOLDOWN_MS = 380;
const SLASH_REACH = 68;
const SLASH_DAMAGE = S.attacks[0].damage;
const SLASH_BLEED = { dmgPerSec: 6, durationMs: 5000 };

const FEED_INTERVAL_MS = 5200; // how often it tries to drink
const FEED_CHANNEL_MS = 1500; // planted + telegraphed — dodgeable by cleansing/spacing
const FEED_RANGE = 260;
const FEED_HEAL = 45;
const FEED_DENIED_COOLDOWN_MS = 2600; // denied? it just goes back to being frantic

const ENGORGED_MS = 6500;
const SLAM_WINDUP_MS = 720;
const SLAM_STRIKE_MS = 140;
const SLAM_RECOVER_MS = 620;
const SLAM_COOLDOWN_MS = 700;
const SLAM_RADIUS = 96;
const SLAM_DAMAGE = S.attacks[1].damage;
const SLAM_KNOCKBACK = 220;

export class Sanguinarch extends Enemy {
  private archState: SanguinarchState = "frenzy";
  private stateEnteredAt = 0;
  private aggroed = false;
  private readonly spawnX: number;
  private readonly spawnY: number;

  // Pushed by MainScene each frame — whether the player currently has bleed
  // stacks. This is the input its whole phase machine runs on.
  playerBleeding = false;

  private nextFeedAt = 0;
  private nextSlamAt = 0;
  private slamHit = false;
  private pendingHit: { damage: number; knockback?: number } | null = null;
  private channelGfx: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene, cfg: { x: number; y: number }) {
    super(scene, {
      x: cfg.x,
      y: cfg.y,
      texture: "sanguinarch",
      displayName: "The Sanguinarch",
      // Guaranteed REFINED TROPHY (T3, bayou miniboss tier) + the vault it seals,
      // mirroring the Gloamwarden(T1)/Cinderwrought(T2) — see Palewake.
      loot: [
        { resource: "refined_trophy_uncommon_t3", min: 1, max: 1 },
        { resource: "moonsilver", min: 2, max: 3 },
        { resource: "gloam_shard", min: 2, max: 4 },
        // The bayou's DIRECT Mire Shard source (the user: "where tf do I get mire
        // shards? Why does nothing give me them in biome 3?"). Until now the only
        // route was the Relic Forge conversion ladder — Lvl 3 Ember Kiln then Lvl 4
        // Mire Crucible, 3:1 each way, i.e. NINE Gloam Shards per Mire Shard, via
        // two station upgrades nothing surfaces. A tier-3 currency should drop from
        // the tier-3 content: the crypt wardens, exactly as the Gloamwarden's vein
        // is the direct source of tier-1 Gloam. The conversion chain stays as the
        // fallback for anyone who never finds a crypt.
        { resource: "mire_shard", min: 2, max: 3 },
      ],
      maxHealth: MAX_HEALTH,
      biteDamage: SLASH_DAMAGE, // the flurry uses the base bite path (update() -> true)
      barScale: 2.4,
      // Resistances/weaknesses removed (2026-07-24, the user) — damage-type layer retired.
    });
    this.spawnX = cfg.x;
    this.spawnY = cfg.y;
    this.baseScale = SANGUINARCH_SCALE;
    this.setScale(SANGUINARCH_SCALE);
    this.channelGfx = scene.add.graphics();
  }

  isAggro(): boolean {
    return this.aggroed;
  }

  // Engorged is this fight's stagger — the player opens it by choosing to bleed,
  // not by chipping a bar. Read by MainScene.staggerMultiplierFor.
  isStaggered(): boolean {
    return this.archState === "engorged";
  }

  update(delta: number, playerX: number, playerY: number, now: number): boolean {
    if (this.depleted) return false;
    if (!this.aggroed && this.health < this.maxHealth) {
      this.health = Math.min(this.maxHealth, this.health + DEAGGRO_REGEN_PER_SEC * (delta / 1000));
      this.applyHpTint();
    }

    const dist = Phaser.Math.Distance.Between(this.x, this.y, playerX, playerY);
    if (!this.aggroed) {
      if (dist <= AGGRO_RADIUS) {
        this.aggroed = true;
        this.stateEnteredAt = now;
        this.nextFeedAt = now + FEED_INTERVAL_MS;
      } else {
        this.driftHome();
        return false;
      }
    }
    if (Phaser.Math.Distance.Between(this.x, this.y, this.spawnX, this.spawnY) > LEASH_RADIUS) {
      this.aggroed = false;
      this.enterFrenzy(now);
      return false;
    }

    switch (this.archState) {
      case "feed":
        this.updateFeed(playerX, playerY, now);
        return false;
      case "engorged":
        this.updateEngorged(playerX, playerY, now);
        return false;
      default:
        return this.updateFrenzy(playerX, playerY, now, dist);
    }
  }

  private driftHome(): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    const d = Phaser.Math.Distance.Between(this.x, this.y, this.spawnX, this.spawnY);
    if (d < 20) {
      body.setVelocity(0, 0);
      return;
    }
    const a = Phaser.Math.Angle.Between(this.x, this.y, this.spawnX, this.spawnY);
    body.setVelocity(Math.cos(a) * FRENZY_SPEED * 0.5, Math.sin(a) * FRENZY_SPEED * 0.5);
  }

  private enterFrenzy(now: number): void {
    this.archState = "frenzy";
    this.stateEnteredAt = now;
    this.attackPhase = "none";
    this.channelGfx.clear();
    this.setScale(SANGUINARCH_SCALE);
    this.baseScale = SANGUINARCH_SCALE;
  }

  // Fast approach + the shared telegraphed swing, whose payload is bleed rather
  // than damage. Returns true on the frame the strike connects (base bite path),
  // with pendingBleed set so MainScene applies the stack under the same i-frame
  // guard as the hit itself.
  private updateFrenzy(playerX: number, playerY: number, now: number, dist: number): boolean {
    const body = this.body as Phaser.Physics.Arcade.Body;

    // Try to drink on its own schedule, but only from close enough to reach.
    if (!this.isAttacking() && now >= this.nextFeedAt && dist <= FEED_RANGE) {
      this.enterFeed(now, playerX, playerY);
      return false;
    }

    if (this.isAttacking() || dist <= SLASH_REACH + this.reachBonus()) {
      const hit = this.tickMeleeSwing(body, playerX, playerY, now, {
        reach: SLASH_REACH,
        windupMs: SLASH_WINDUP_MS,
        strikeMs: SLASH_STRIKE_MS,
        recoverMs: SLASH_RECOVER_MS,
        cooldownMs: SLASH_COOLDOWN_MS,
      });
      if (hit) {
        this.pendingBleed = { ...SLASH_BLEED };
        this.markAttackLanded(now);
        return true;
      }
      return false;
    }

    const a = Phaser.Math.Angle.Between(this.x, this.y, playerX, playerY);
    const vx = Math.cos(a) * FRENZY_SPEED * this.envSpeedMult;
    const vy = Math.sin(a) * FRENZY_SPEED * this.envSpeedMult;
    body.setVelocity(vx, vy);
    this.applyFacing(vx, vy);
    return false;
  }

  private enterFeed(now: number, playerX: number, playerY: number): void {
    this.archState = "feed";
    this.stateEnteredAt = now;
    this.attackPhase = "none";
    (this.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
    this.faceAngle(Phaser.Math.Angle.Between(this.x, this.y, playerX, playerY));
    this.playWindupTell(FEED_CHANNEL_MS, 0xff4a6a);
  }

  // The channel resolves against the player's state AT THE END, so cleansing or
  // simply outlasting the bleed during the wind-up denies it.
  private updateFeed(playerX: number, playerY: number, now: number): void {
    (this.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
    this.drawFeedChannel(playerX, playerY, now);
    if (now - this.stateEnteredAt < FEED_CHANNEL_MS) return;

    this.endWindupTell();
    this.channelGfx.clear();
    const inRange = Phaser.Math.Distance.Between(this.x, this.y, playerX, playerY) <= FEED_RANGE;
    if (this.playerBleeding && inRange) {
      this.health = Math.min(this.maxHealth, this.health + FEED_HEAL);
      this.applyHpTint();
      this.enterEngorged(now);
    } else {
      // Denied — no punish window for the player, it just goes back to being fast
      // and frantic. That asymmetry IS the design: bleeding is the only way to
      // buy an opening, and it costs you.
      this.enterFrenzy(now);
      this.nextFeedAt = now + FEED_DENIED_COOLDOWN_MS;
    }
  }

  private enterEngorged(now: number): void {
    this.archState = "engorged";
    this.stateEnteredAt = now;
    this.attackPhase = "none";
    this.nextSlamAt = now;
    this.baseScale = SANGUINARCH_ENGORGED_SCALE;
    this.setScale(SANGUINARCH_ENGORGED_SCALE);
  }

  // Slow, heavy, and wide open. Hand-run rather than tickMeleeSwing because the
  // slam is a radial AoE routed through checkPlayerHit (knockback), not a bite.
  private updateEngorged(playerX: number, playerY: number, now: number): void {
    const body = this.body as Phaser.Physics.Arcade.Body;

    if (this.attackPhase !== "none") {
      body.setVelocity(0, 0);
      const elapsed = now - this.attackStartedAt;
      if (this.attackPhase === "windup") {
        // Area tell: a radial slam's reach is invisible from the pose alone, so
        // the footprint is drawn during the wind-up (see Enemy.drawAreaCircle).
        this.drawAreaCircle(
          this.x,
          this.y,
          SLAM_RADIUS,
          Phaser.Math.Clamp(elapsed / SLAM_WINDUP_MS, 0, 1),
          0xff4a6a,
        );
      }
      if (this.attackPhase === "windup" && elapsed >= SLAM_WINDUP_MS) {
        this.attackPhase = "strike";
        this.attackStartedAt = now;
        this.endWindupTell();
        this.clearAreaTelegraph();
        this.slamHit = false;
      } else if (this.attackPhase === "strike") {
        if (!this.slamHit) {
          this.slamHit = true;
          if (Phaser.Math.Distance.Between(this.x, this.y, playerX, playerY) <= SLAM_RADIUS) {
            this.pendingHit = { damage: SLAM_DAMAGE, knockback: SLAM_KNOCKBACK };
          }
        }
        if (elapsed >= SLAM_STRIKE_MS) {
          this.attackPhase = "recover";
          this.attackStartedAt = now;
        }
      } else if (this.attackPhase === "recover" && elapsed >= SLAM_RECOVER_MS) {
        this.attackPhase = "none";
        this.nextSlamAt = now + SLAM_COOLDOWN_MS;
      }
      return;
    }

    if (now - this.stateEnteredAt >= ENGORGED_MS) {
      this.enterFrenzy(now);
      this.nextFeedAt = now + FEED_INTERVAL_MS;
      return;
    }

    const dist = Phaser.Math.Distance.Between(this.x, this.y, playerX, playerY);
    if (dist <= SLAM_RADIUS * 0.85 && now >= this.nextSlamAt) {
      this.attackPhase = "windup";
      this.attackStartedAt = now;
      body.setVelocity(0, 0);
      this.faceAngle(Phaser.Math.Angle.Between(this.x, this.y, playerX, playerY));
      this.playWindupTell(SLAM_WINDUP_MS, 0xff4a6a);
      return;
    }
    const a = Phaser.Math.Angle.Between(this.x, this.y, playerX, playerY);
    const vx = Math.cos(a) * ENGORGED_SPEED * this.envSpeedMult;
    const vy = Math.sin(a) * ENGORGED_SPEED * this.envSpeedMult;
    body.setVelocity(vx, vy);
    this.applyFacing(vx, vy);
  }

  private drawFeedChannel(playerX: number, playerY: number, now: number): void {
    const g = this.channelGfx;
    g.clear();
    g.setDepth(this.depth + 0.5);
    const frac = Phaser.Math.Clamp((now - this.stateEnteredAt) / FEED_CHANNEL_MS, 0, 1);
    // A thickening crimson draw-line toward the player: it reads as "it's about
    // to drink," and the player's own status bar tells them whether they'll feed it.
    g.lineStyle(1 + 5 * frac, 0xa8203a, 0.25 + 0.4 * frac);
    g.lineBetween(this.x, this.y, playerX, playerY);
    g.fillStyle(0xff4a6a, 0.2 + 0.35 * frac);
    g.fillCircle(this.x, this.y, 20 + 16 * frac);
  }

  checkPlayerHit(): { damage: number; knockback?: number; dmgType?: IncomingDamageType } | null {
    if (!this.pendingHit) return null;
    const hit = this.pendingHit;
    this.pendingHit = null;
    return hit;
  }

  playDeathFeedback(onComplete: () => void): void {
    this.channelGfx.destroy();
    super.playDeathFeedback(onComplete);
  }
}
