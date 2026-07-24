import Phaser from "phaser";
import { Enemy } from "./Enemy";
import type { IncomingDamageType } from "../systems/Weapons";
import { enemyStat } from "../systems/enemyStats";

// Combat stats from the Phaser-free source of truth (also read by the balancing dashboard).
const S = enemyStat("palewake");

// The gloam crypt's warden (biome 3 Phase 4c). Bespoke AI: extends Enemy for the
// HP-bar/loot/death machinery, fully overrides update() (Snake/Gloamwarden
// precedent). It is deliberately NOT built on the
// idle → telegraph → execute → recover (+poise → staggered) skeleton that
// Gloamwarden and Cinderwrought share, because the user's brief for this phase was
// that each crypt warden must feel different from each other AND from every
// previous mini-boss. Where those two are "dodge the swing, chip the poise bar,"
// the Palewake is a POSITIONING PUZZLE with no poise bar at all:
//
//   stalking → manifest → tether → (unravel) → vanish → stalking
//
//   • stalking — near-invisible and UNTARGETABLE (isTargetable() false, the
//     Sandmaw's precedent). It circles to a flank; you cannot fight it here.
//   • manifest — it resolves into the world with a wind-up tell. Now hittable.
//   • tether — it channels a draining gloam beam. Continuous MAGIC damage
//     (armor-bypassing, the Phase-1 hook), and it will not stop on its own until
//     the channel runs out.
//   • unravel — the ONLY real punish window, and the player has to create it:
//     BREAK THE TETHER by putting a wall or a pillar between you (or leaving its
//     range). Riding the channel out to its natural end gives you nothing — it
//     just vanishes and starts over. This is a dodge verb that only exists
//     because Phase 4c introduced interiors with real occluders.
//
// MainScene assigns `occluders` (its crypt's wall + pillar rects) at spawn.
export type PalewakeState = "stalking" | "manifest" | "tether" | "unravel" | "vanish";

export const PALEWAKE_SCALE = 1.5;
export const PALEWAKE_UNRAVEL_DAMAGE_MULTIPLIER = 1.6; // punish-window bonus (its analog of a stagger)

const MAX_HEALTH = S.hp;
const AGGRO_RADIUS = 300;
const LEASH_RADIUS = 900; // crypt-sized; it owns the vault room, not the whole dungeon
const DEAGGRO_REGEN_PER_SEC = 10;

const STALK_SPEED = 96; // fast while untouchable — it repositions, it doesn't brawl
const STALK_MS = 2000;
const STALK_ALPHA = 0.22;
const FLANK_DIST = 150; // where it resolves relative to the player
const MANIFEST_MS = 460;

const TETHER_MAX_MS = 4200; // ride it out and you get NO punish window
const TETHER_RANGE = 330;
const TETHER_TICK_MS = 450;
// Per-second rate from the table, converted to this entity's own tick cadence.
// Was a hardcoded 10 that silently ignored the table's 14 for a whole balance
// pass — hence the wiring (2026-07-24).
const TETHER_TICK_DAMAGE = Math.round((S.attacks[0].damage * TETHER_TICK_MS) / 1000); // magic — armor does not apply
const TETHER_BREAK_GRACE_MS = 320; // how long LOS/range must stay broken before it unravels

const UNRAVEL_MS = 2600;
const VANISH_MS = 480;

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

// Segment (x1,y1)-(x2,y2) vs axis-aligned rect. Slab clip — cheap enough to run
// against a crypt's ~40 merged wall runs every frame the tether is live.
function segmentHitsRect(x1: number, y1: number, x2: number, y2: number, r: Rect): boolean {
  const dx = x2 - x1;
  const dy = y2 - y1;
  let t0 = 0;
  let t1 = 1;
  const clip = (p: number, q: number): boolean => {
    if (p === 0) return q >= 0; // parallel: inside the slab or reject outright
    const t = q / p;
    if (p < 0) {
      if (t > t1) return false;
      if (t > t0) t0 = t;
    } else {
      if (t < t0) return false;
      if (t < t1) t1 = t;
    }
    return true;
  };
  return (
    clip(-dx, x1 - r.x) &&
    clip(dx, r.x + r.w - x1) &&
    clip(-dy, y1 - r.y) &&
    clip(dy, r.y + r.h - y1)
  );
}

export class Palewake extends Enemy {
  private wakeState: PalewakeState = "stalking";
  private stateEnteredAt = 0;
  private aggroed = false;
  private readonly spawnX: number;
  private readonly spawnY: number;

  // Wall/pillar rects that can break the tether. Assigned by MainScene when the
  // crypt is built — empty means "nowhere to hide," so this is the one field
  // that must be wired or the fight loses its counterplay.
  occluders: Rect[] = [];

  // Its vault room. Flanks are clamped into this, because the Palewake now
  // collides with walls like every other crypt dweller — a flank picked inside
  // the rock would leave it shoved against a wall, tethering with no line of
  // sight, which hands the player a free unravel every cycle.
  arena: Rect | null = null;

  private flankX = 0;
  private flankY = 0;
  private nextTetherTickAt = 0;
  private tetherBrokenSince = 0; // 0 = tether currently intact
  private pendingTetherDamage = 0;

  private tetherGfx: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene, cfg: { x: number; y: number }) {
    super(scene, {
      x: cfg.x,
      y: cfg.y,
      texture: "palewake",
      displayName: "The Palewake",
      // The vault nodes it seals are the real payoff (MainScene cracks them on
      // death); this is the taste on top. Now mirrors the Gloamwarden/Cinderwrought
      // properly with a guaranteed REFINED TROPHY — the bayou miniboss tier (T3),
      // so a crypt clear is a guaranteed relic roll (the user: "where are my
      // guaranteed uncommon T3 trophies from minibosses?").
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
      biteDamage: 0, // all damage flows through checkPlayerHit()
      barScale: 2.4,
    });
    this.spawnX = cfg.x;
    this.spawnY = cfg.y;
    this.baseScale = PALEWAKE_SCALE;
    this.setScale(PALEWAKE_SCALE);
    this.setAlpha(STALK_ALPHA);
    this.tetherGfx = scene.add.graphics();
  }

  isAggro(): boolean {
    return this.aggroed;
  }

  // Untargetable while stalking — you cannot click or weapon-sweep a shade that
  // isn't really here (the Sandmaw's submerged rule).
  isTargetable(): boolean {
    return !this.depleted && this.wakeState !== "stalking";
  }

  // Read by MainScene.staggerMultiplierFor — the unravel IS this fight's stagger,
  // except the player earns it by breaking the tether rather than by chip damage.
  isStaggered(): boolean {
    return this.wakeState === "unravel";
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
        this.enterStalking(now, playerX, playerY);
      } else {
        this.driftHome();
      }
      return false;
    }
    if (Phaser.Math.Distance.Between(this.x, this.y, this.spawnX, this.spawnY) > LEASH_RADIUS) {
      this.aggroed = false;
      this.enterStalking(now, playerX, playerY);
      return false;
    }

    switch (this.wakeState) {
      case "stalking":
        this.updateStalking(playerX, playerY, now);
        break;
      case "manifest":
        this.updateManifest(playerX, playerY, now);
        break;
      case "tether":
        this.updateTether(playerX, playerY, now);
        break;
      case "unravel":
        this.updateUnravel(now);
        break;
      case "vanish":
        this.updateVanish(now, playerX, playerY);
        break;
    }
    return false;
  }

  private driftHome(): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    const d = Phaser.Math.Distance.Between(this.x, this.y, this.spawnX, this.spawnY);
    if (d < 20) {
      body.setVelocity(0, 0);
      return;
    }
    const a = Phaser.Math.Angle.Between(this.x, this.y, this.spawnX, this.spawnY);
    body.setVelocity(Math.cos(a) * STALK_SPEED * 0.5, Math.sin(a) * STALK_SPEED * 0.5);
  }

  private enterStalking(now: number, playerX: number, playerY: number): void {
    this.wakeState = "stalking";
    this.stateEnteredAt = now;
    this.setAlpha(STALK_ALPHA);
    this.tetherGfx.clear();
    // The drain carries over into the stalk (2026-07-24) — see updateStalking.
    this.nextTetherTickAt = now + TETHER_TICK_MS;
    this.pickFlank(playerX, playerY);
  }

  // Resolve BESIDE/BEHIND the player rather than in front — the fight should feel
  // like being circled, and it also means the player rarely already has a wall
  // lined up when the tether starts.
  private pickFlank(playerX: number, playerY: number): void {
    const toPlayer = Phaser.Math.Angle.Between(playerX, playerY, this.x, this.y);
    // Try several flanks and take the first with a CLEAR line to the player.
    // Without this it can resolve behind one of its own vault pillars, whereupon
    // the tether starts already-broken and it hands the player a free unravel —
    // the exact opposite of the intended fight, where breaking LOS is the work.
    for (let attempt = 0; attempt < 6; attempt++) {
      const side = Phaser.Math.Between(0, 1) === 0 ? 1 : -1;
      const a = toPlayer + side * Phaser.Math.FloatBetween(1.4, 2.2);
      this.flankX = playerX + Math.cos(a) * FLANK_DIST;
      this.flankY = playerY + Math.sin(a) * FLANK_DIST;
      if (this.arena) {
        const m = 26;
        this.flankX = Phaser.Math.Clamp(this.flankX, this.arena.x + m, this.arena.x + this.arena.w - m);
        this.flankY = Phaser.Math.Clamp(this.flankY, this.arena.y + m, this.arena.y + this.arena.h - m);
      }
      const blocked = this.occluders.some((r) =>
        segmentHitsRect(this.flankX, this.flankY, playerX, playerY, r),
      );
      if (!blocked) return;
    }
  }

  private updateStalking(playerX: number, playerY: number, now: number): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    const d = Phaser.Math.Distance.Between(this.x, this.y, this.flankX, this.flankY);
    if (d > 12) {
      const a = Phaser.Math.Angle.Between(this.x, this.y, this.flankX, this.flankY);
      const vx = Math.cos(a) * STALK_SPEED;
      const vy = Math.sin(a) * STALK_SPEED;
      body.setVelocity(vx, vy);
      this.applyFacing(vx, vy);
    } else {
      body.setVelocity(0, 0);
    }
    // The tether does NOT drop while it's faded out (the user: "palewake should
    // stay connected when invis"). It used to be cleared on entering this state,
    // so ~a third of every cycle was free time in which the fight's one and only
    // damage source did nothing — and since you cannot hit it while it stalks,
    // that third was dead air for both sides. Keeping the drain live makes the
    // counterplay CONSISTENT: line of sight is the answer in both phases, and
    // the walls matter the whole fight rather than only during the channel.
    // Deliberately no unravel here, though — the punish window is earned by
    // breaking the COMMITTED channel, not by walking behind a pillar early.
    const connected = this.tetherConnected(playerX, playerY);
    this.drawTether(playerX, playerY, connected, true);
    if (connected && now >= this.nextTetherTickAt) {
      this.nextTetherTickAt = now + TETHER_TICK_MS;
      this.pendingTetherDamage = TETHER_TICK_DAMAGE;
    }
    if (now - this.stateEnteredAt >= STALK_MS) {
      this.wakeState = "manifest";
      this.stateEnteredAt = now;
      (this.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
      this.setAlpha(1);
      this.faceAngle(Phaser.Math.Angle.Between(this.x, this.y, playerX, playerY));
      this.playWindupTell(MANIFEST_MS, 0xb98cff);
    }
  }

  private updateManifest(playerX: number, playerY: number, now: number): void {
    (this.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
    if (now - this.stateEnteredAt < MANIFEST_MS) return;
    this.endWindupTell();
    this.wakeState = "tether";
    this.stateEnteredAt = now;
    this.nextTetherTickAt = now + TETHER_TICK_MS;
    this.tetherBrokenSince = 0;
    this.faceAngle(Phaser.Math.Angle.Between(this.x, this.y, playerX, playerY));
  }

  private updateTether(playerX: number, playerY: number, now: number): void {
    (this.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
    this.faceAngle(Phaser.Math.Angle.Between(this.x, this.y, playerX, playerY));

    const connected = this.tetherConnected(playerX, playerY);
    this.drawTether(playerX, playerY, connected);

    if (connected) {
      this.tetherBrokenSince = 0;
      if (now >= this.nextTetherTickAt) {
        this.nextTetherTickAt = now + TETHER_TICK_MS;
        this.pendingTetherDamage = TETHER_TICK_DAMAGE;
      }
    } else {
      if (this.tetherBrokenSince === 0) this.tetherBrokenSince = now;
      // Held broken long enough — the channel snaps back on itself. THIS is the
      // player's damage window, and the only way to get one.
      if (now - this.tetherBrokenSince >= TETHER_BREAK_GRACE_MS) {
        this.enterUnravel(now);
        return;
      }
    }
    // Rode the whole channel out without breaking it: no punish, it just leaves.
    if (now - this.stateEnteredAt >= TETHER_MAX_MS) this.enterVanish(now);
  }

  private tetherConnected(playerX: number, playerY: number): boolean {
    if (Phaser.Math.Distance.Between(this.x, this.y, playerX, playerY) > TETHER_RANGE) return false;
    for (const r of this.occluders) {
      if (segmentHitsRect(this.x, this.y, playerX, playerY, r)) return false;
    }
    return true;
  }

  private enterUnravel(now: number): void {
    this.wakeState = "unravel";
    this.stateEnteredAt = now;
    this.tetherGfx.clear();
    this.setAlpha(1);
    (this.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
    this.setTint(0xffffff);
  }

  private updateUnravel(now: number): void {
    (this.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
    // Thrash in place, driven off the clock rather than a tween: the player is
    // MEANT to be hitting it right now, and Enemy.playHitFeedback() calls
    // killTweensOf(this) — a tweened wobble would be cancelled mid-swing and
    // leave the sprite stuck at an angle.
    const t = now - this.stateEnteredAt;
    this.setAngle(Math.sin(t / 45) * 6);
    if (t >= UNRAVEL_MS) {
      this.setAngle(0);
      this.enterVanish(now);
    }
  }

  private enterVanish(now: number): void {
    this.wakeState = "vanish";
    this.stateEnteredAt = now;
    this.tetherGfx.clear();
    this.applyHpTint();
  }

  private updateVanish(now: number, playerX: number, playerY: number): void {
    (this.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
    const frac = Phaser.Math.Clamp((now - this.stateEnteredAt) / VANISH_MS, 0, 1);
    this.setAlpha(1 - (1 - STALK_ALPHA) * frac);
    if (frac >= 1) this.enterStalking(now, playerX, playerY);
  }

  // `faint` = drawn during the stalk, where the beam is the one thing that gives
  // an otherwise near-invisible creature away. Dimmer than the committed
  // channel so the manifest still reads as the escalation it is.
  private drawTether(playerX: number, playerY: number, connected: boolean, faint = false): void {
    const g = this.tetherGfx;
    const k = faint ? 0.45 : 1;
    g.clear();
    g.setDepth(this.depth + 0.5);
    if (connected) {
      g.lineStyle(5, 0x6a3ec8, 0.35 * k);
      g.lineBetween(this.x, this.y, playerX, playerY);
      g.lineStyle(2, 0xd8c0ff, 0.85 * k);
      g.lineBetween(this.x, this.y, playerX, playerY);
      g.fillStyle(0xd8c0ff, 0.5 * k);
      g.fillCircle(playerX, playerY, 7);
    } else {
      // Frayed stub: the beam is visibly severed at the obstruction, so the
      // player can see the trick worked before the unravel actually fires.
      const a = Phaser.Math.Angle.Between(this.x, this.y, playerX, playerY);
      g.lineStyle(2, 0x6a3ec8, 0.45);
      g.lineBetween(this.x, this.y, this.x + Math.cos(a) * 34, this.y + Math.sin(a) * 34);
    }
  }

  // Queried each frame by MainScene.updateEnemies(). The tether's ticks are the
  // only damage this fight deals — typed `magic`, so flat armor does nothing and
  // heavy-armor magic mitigation is the counter.
  checkPlayerHit(): { damage: number; knockback?: number; dmgType?: IncomingDamageType } | null {
    if (this.pendingTetherDamage <= 0) return null;
    const damage = this.pendingTetherDamage;
    this.pendingTetherDamage = 0;
    return { damage, dmgType: "magic" };
  }

  playDeathFeedback(onComplete: () => void): void {
    this.tetherGfx.destroy();
    super.playDeathFeedback(onComplete);
  }
}
