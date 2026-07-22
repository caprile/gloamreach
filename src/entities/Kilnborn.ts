import Phaser from "phaser";
import { Enemy } from "./Enemy";
import type { IncomingDamageType } from "../systems/Weapons";

// The ember crypt's warden (biome 3 Phase 4c). Bespoke AI: extends Enemy, fully
// overrides update(). Like the Palewake it deliberately avoids the
// idle → telegraph → execute → recover (+poise) skeleton Gloamwarden and
// Cinderwrought share — and it avoids the Palewake's shape too. Its loop is
// driven by a HEAT meter that RISES AS IT ACTS, rather than a poise meter that
// falls as you hit it:
//
//   stoking → lash (×n, each raises heat) → overheat → BACKDRAFT → venting → …
//
//   • Heat climbs whenever it acts. As it climbs, the floor of its own vault
//     CATCHES FIRE tile by tile — standing on a lit tile burns you (`fire`
//     damage, armor-bypassing), so the arena shrinks as the fight goes on.
//   • At full heat it detonates a BACKDRAFT that sweeps the burning floor. The
//     dodge is not a direction — it's being on ground that is still COLD.
//   • venting is the punish window, and it arrives on the BOSS's clock, not the
//     player's: you cannot force it early by chipping a bar, you survive to it.
//
// MainScene assigns `arena` (the vault room rect) at spawn so the fire grid
// covers exactly the room the fight happens in.
export type KilnbornState = "stoking" | "lash" | "overheat" | "backdraft" | "venting";

export const KILNBORN_SCALE = 1.6;
export const KILNBORN_VENT_DAMAGE_MULTIPLIER = 1.7; // punish-window bonus while venting

const MAX_HEALTH = 300;
const AGGRO_RADIUS = 300;
const LEASH_RADIUS = 900;
const DEAGGRO_REGEN_PER_SEC = 12;
const MOVE_SPEED = 50; // squat and slow — it wins by owning ground, not chasing

const HEAT_MAX = 100;
const HEAT_PER_SEC = 2.6; // passive climb while engaged
const HEAT_PER_LASH = 16;
// Fire-grid cell (px). Kept small enough that "cold ground" is a real choice —
// at 48 a modest vault only held 12 tiles, so surviving a backdraft came down to
// standing on one of five chunky squares.
const TILE = 32;
const MAX_BURN_FRACTION = 0.62; // at full heat, this share of the room is alight

const LASH_RANGE = 132;
const LASH_WINDUP_MS = 440;
const LASH_STRIKE_MS = 110;
const LASH_RECOVER_MS = 400;
const LASH_COOLDOWN_MS = 620;
const LASH_REACH = 118;
const LASH_DAMAGE = 30; // fire
const LASH_KNOCKBACK = 110;

const OVERHEAT_MS = 1600; // the "get to cold ground" window
const BACKDRAFT_MS = 320;
const BACKDRAFT_DAMAGE = 58; // fire — punishing, but only on lit ground
const BACKDRAFT_KNOCKBACK = 260;
const VENTING_MS = 3200;

const BURN_TICK_MS = 620;
const BURN_TICK_DAMAGE = 7; // standing in fire

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export class Kilnborn extends Enemy {
  private kilnState: KilnbornState = "stoking";
  private stateEnteredAt = 0;
  private aggroed = false;
  private readonly spawnX: number;
  private readonly spawnY: number;

  private heat = 0;
  private nextLashAt = 0;
  private hasHitThisAttack = false;
  private nextBurnTickAt = 0;
  private pendingHit: { damage: number; knockback?: number } | null = null;

  // The vault room this fight owns (assigned by MainScene). The fire grid is
  // built from it; with no arena set it falls back to a square around spawn so
  // the boss is still functional if ever placed outside a crypt.
  arena: Rect | null = null;
  private tiles: { x: number; y: number }[] = [];
  private litCount = 0;
  private fireGfx: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene, cfg: { x: number; y: number }) {
    super(scene, {
      x: cfg.x,
      y: cfg.y,
      texture: "kilnborn",
      displayName: "The Kilnborn",
      loot: [
        { resource: "moonsilver", min: 2, max: 3 },
        { resource: "gloam_shard", min: 2, max: 4 },
      ],
      maxHealth: MAX_HEALTH,
      biteDamage: 0, // everything flows through checkPlayerHit()
      barScale: 2.4,
      // Molten slag shell: shrugs off blunt, splits along its cracks to pierce.
      // Same "carry more than one weapon" nudge the badlands roster teaches.
      resistances: { blunt: 0.75, pierce: 1.25, fire: 0.4 },
    });
    this.spawnX = cfg.x;
    this.spawnY = cfg.y;
    this.baseScale = KILNBORN_SCALE;
    this.setScale(KILNBORN_SCALE);
    this.fireGfx = scene.add.graphics().setDepth(-6); // over the crypt floor, under entities
  }

  isAggro(): boolean {
    return this.aggroed;
  }

  // Venting is this fight's stagger — earned by surviving the backdraft, not by
  // chipping a poise bar. Read by MainScene.staggerMultiplierFor.
  isStaggered(): boolean {
    return this.kilnState === "venting";
  }

  heat01(): number {
    return this.heat / HEAT_MAX;
  }

  private ensureTiles(): void {
    if (this.tiles.length > 0) return;
    const a: Rect = this.arena ?? { x: this.x - 220, y: this.y - 180, w: 440, h: 360 };
    for (let y = a.y + TILE / 2; y < a.y + a.h; y += TILE) {
      for (let x = a.x + TILE / 2; x < a.x + a.w; x += TILE) this.tiles.push({ x, y });
    }
    // Shuffle once so tiles ignite in a scattered order rather than sweeping
    // left-to-right (which would make "cold ground" a trivially readable band).
    for (let i = this.tiles.length - 1; i > 0; i--) {
      const j = Phaser.Math.Between(0, i);
      [this.tiles[i], this.tiles[j]] = [this.tiles[j], this.tiles[i]];
    }
  }

  private isTileLit(index: number): boolean {
    return index < this.litCount;
  }

  // Whether a world point stands on burning floor. Also the backdraft's hit test
  // — the detonation sweeps exactly the ground that is already alight.
  private onBurningGround(px: number, py: number): boolean {
    for (let i = 0; i < this.litCount; i++) {
      const t = this.tiles[i];
      if (Math.abs(px - t.x) <= TILE / 2 && Math.abs(py - t.y) <= TILE / 2) return true;
    }
    return false;
  }

  update(delta: number, playerX: number, playerY: number, now: number): boolean {
    if (this.depleted) return false;
    this.ensureTiles();

    if (!this.aggroed && this.health < this.maxHealth) {
      this.health = Math.min(this.maxHealth, this.health + DEAGGRO_REGEN_PER_SEC * (delta / 1000));
      this.applyHpTint();
    }

    const dist = Phaser.Math.Distance.Between(this.x, this.y, playerX, playerY);
    if (!this.aggroed) {
      if (dist <= AGGRO_RADIUS) {
        this.aggroed = true;
        this.stateEnteredAt = now;
      } else {
        this.coolDown(delta);
        this.driftHome();
        this.drawFire();
        return false;
      }
    }
    if (Phaser.Math.Distance.Between(this.x, this.y, this.spawnX, this.spawnY) > LEASH_RADIUS) {
      this.aggroed = false;
      this.kilnState = "stoking";
      this.attackPhase = "none";
      return false;
    }

    switch (this.kilnState) {
      case "stoking":
        this.updateStoking(delta, playerX, playerY, now);
        break;
      case "lash":
        this.updateLash(playerX, playerY, now);
        break;
      case "overheat":
        this.updateOverheat(now);
        break;
      case "backdraft":
        this.updateBackdraft(now, playerX, playerY);
        break;
      case "venting":
        this.updateVenting(delta, now);
        break;
    }
    this.drawFire();
    this.tickBurningGround(playerX, playerY, now);
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
    body.setVelocity(Math.cos(a) * MOVE_SPEED, Math.sin(a) * MOVE_SPEED);
  }

  private addHeat(amount: number): void {
    this.heat = Phaser.Math.Clamp(this.heat + amount, 0, HEAT_MAX);
    this.litCount = Math.round(this.tiles.length * MAX_BURN_FRACTION * this.heat01());
  }

  private coolDown(delta: number): void {
    if (this.heat <= 0) return;
    this.addHeat(-(HEAT_PER_SEC * 3 * (delta / 1000)));
  }

  private updateStoking(delta: number, playerX: number, playerY: number, now: number): void {
    this.addHeat(HEAT_PER_SEC * (delta / 1000));
    if (this.heat >= HEAT_MAX) {
      this.enterOverheat(now);
      return;
    }
    const body = this.body as Phaser.Physics.Arcade.Body;
    const dist = Phaser.Math.Distance.Between(this.x, this.y, playerX, playerY);
    if (dist <= LASH_RANGE && now >= this.nextLashAt) {
      this.kilnState = "lash";
      this.stateEnteredAt = now;
      this.attackPhase = "windup";
      this.attackStartedAt = now;
      this.hasHitThisAttack = false;
      body.setVelocity(0, 0);
      this.faceAngle(Phaser.Math.Angle.Between(this.x, this.y, playerX, playerY));
      this.playWindupTell(LASH_WINDUP_MS, 0xff8a2a);
      return;
    }
    if (dist > LASH_RANGE * 0.8) {
      const a = Phaser.Math.Angle.Between(this.x, this.y, playerX, playerY);
      const vx = Math.cos(a) * MOVE_SPEED * this.envSpeedMult;
      const vy = Math.sin(a) * MOVE_SPEED * this.envSpeedMult;
      body.setVelocity(vx, vy);
      this.applyFacing(vx, vy);
    } else {
      body.setVelocity(0, 0);
    }
  }

  // A single fire jab on the shared windup → strike → recover shape, but hand-run
  // (not tickMeleeSwing) because connecting also stokes the heat that drives the
  // whole fight.
  private updateLash(playerX: number, playerY: number, now: number): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(0, 0);
    const elapsed = now - this.attackStartedAt;
    switch (this.attackPhase) {
      case "windup":
        if (elapsed >= LASH_WINDUP_MS) {
          this.attackPhase = "strike";
          this.attackStartedAt = now;
          this.endWindupTell();
          const dist = Phaser.Math.Distance.Between(this.x, this.y, playerX, playerY);
          if (dist <= LASH_REACH + this.reachBonus()) {
            this.pendingHit = { damage: LASH_DAMAGE, knockback: LASH_KNOCKBACK };
          }
          this.addHeat(HEAT_PER_LASH); // acting is what heats it, hit or miss
        }
        break;
      case "strike":
        if (elapsed >= LASH_STRIKE_MS) {
          this.attackPhase = "recover";
          this.attackStartedAt = now;
        }
        break;
      default:
        if (elapsed >= LASH_RECOVER_MS) {
          this.attackPhase = "none";
          this.nextLashAt = now + LASH_COOLDOWN_MS;
          if (this.heat >= HEAT_MAX) {
            this.enterOverheat(now);
          } else {
            this.kilnState = "stoking";
            this.stateEnteredAt = now;
          }
        }
        break;
    }
  }

  private enterOverheat(now: number): void {
    this.kilnState = "overheat";
    this.stateEnteredAt = now;
    this.attackPhase = "none";
    (this.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
    this.playWindupTell(OVERHEAT_MS, 0xffd070);
  }

  private updateOverheat(now: number): void {
    (this.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
    if (now - this.stateEnteredAt < OVERHEAT_MS) return;
    this.endWindupTell();
    this.kilnState = "backdraft";
    this.stateEnteredAt = now;
    this.hasHitThisAttack = false;
  }

  private updateBackdraft(now: number, playerX: number, playerY: number): void {
    (this.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
    if (!this.hasHitThisAttack) {
      this.hasHitThisAttack = true;
      // The detonation sweeps the burning floor: cold ground is safe ground.
      if (this.onBurningGround(playerX, playerY)) {
        this.pendingHit = { damage: BACKDRAFT_DAMAGE, knockback: BACKDRAFT_KNOCKBACK };
      }
    }
    if (now - this.stateEnteredAt >= BACKDRAFT_MS) {
      this.kilnState = "venting";
      this.stateEnteredAt = now;
    }
  }

  // The punish window: spent, planted, and dumping its heat — the fire goes out
  // across the room over the vent, which is also the visual cue that it's open.
  private updateVenting(delta: number, now: number): void {
    (this.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
    const frac = Phaser.Math.Clamp((now - this.stateEnteredAt) / VENTING_MS, 0, 1);
    this.heat = HEAT_MAX * (1 - frac);
    this.litCount = Math.round(this.tiles.length * MAX_BURN_FRACTION * this.heat01());
    if (frac >= 1) {
      this.heat = 0;
      this.litCount = 0;
      this.kilnState = "stoking";
      this.stateEnteredAt = now;
      this.nextLashAt = now + 400;
    }
  }

  private tickBurningGround(playerX: number, playerY: number, now: number): void {
    if (this.litCount === 0) return;
    if (now < this.nextBurnTickAt) return;
    if (!this.onBurningGround(playerX, playerY)) return;
    this.nextBurnTickAt = now + BURN_TICK_MS;
    // Never overwrite a queued attack hit — the backdraft matters more.
    if (!this.pendingHit) this.pendingHit = { damage: BURN_TICK_DAMAGE };
  }

  private drawFire(): void {
    const g = this.fireGfx;
    g.clear();
    for (let i = 0; i < this.litCount; i++) {
      const t = this.tiles[i];
      g.fillStyle(0x8a2c10, 0.5);
      g.fillRect(t.x - TILE / 2, t.y - TILE / 2, TILE, TILE);
      g.fillStyle(0xff6a1a, 0.45);
      g.fillRect(t.x - TILE / 2 + 5, t.y - TILE / 2 + 5, TILE - 10, TILE - 10);
    }
    // Overheat tell: the whole lit floor flares brighter as the detonation nears.
    if (this.kilnState === "overheat") {
      const frac = Phaser.Math.Clamp((this.scene.time.now - this.stateEnteredAt) / OVERHEAT_MS, 0, 1);
      for (let i = 0; i < this.litCount; i++) {
        const t = this.tiles[i];
        g.fillStyle(0xffd070, 0.15 + 0.5 * frac);
        g.fillRect(t.x - TILE / 2, t.y - TILE / 2, TILE, TILE);
      }
    }
  }

  // Queried each frame by MainScene.updateEnemies(). Everything this fight deals
  // — jab, backdraft, and standing in fire — is `fire` typed, so flat armor never
  // applies and heavy-armor magic/fire mitigation is the real counter.
  checkPlayerHit(): { damage: number; knockback?: number; dmgType?: IncomingDamageType } | null {
    if (!this.pendingHit) return null;
    const hit = this.pendingHit;
    this.pendingHit = null;
    return { ...hit, dmgType: "fire" };
  }

  playDeathFeedback(onComplete: () => void): void {
    this.fireGfx.destroy();
    super.playDeathFeedback(onComplete);
  }
}
