import Phaser from "phaser";
import type { Enemy } from "./Enemy";
import { LootContainer } from "../systems/LootContainer";
import { ysortDepth } from "../systems/depth";

// A Duskrunner Warren — a badlands POI (biome 2 Phase 3). Unlike the Gremlin
// Shack (a loot cache guarded by a respawning guard pair), a Warren is a
// TWO-WAVE destructible den, per the user's spec:
//   • wave1  — 3 normal Duskrunners guard the den. The den itself is inert.
//   • wave2  — killing wave 1 stirs 3 ELITE Duskrunners.
//   • attackable — with both waves dead the den is exposed; smash it with a
//     melee weapon (it has HP, like a resource node).
//   • looted — destroyed, it collapses into a lootable cache (a heap of the
//     fallen) that reuses LootContainer + ChestMenu exactly like the shack.
// A Warren does NOT respawn — you destroy it. Plain data class (not a
// GameObject subclass); MainScene owns wave scheduling + the smash damage,
// mirroring how it owns the shack's guard scheduling.
export type DenPhase = "wave1" | "wave2" | "attackable" | "looted";

export const DEN_CACHE_SIZE = 6;
const DEN_HEALTH = 42; // several melee hits to smash once undefended

export class BadlandsDen {
  private readonly scene: Phaser.Scene;
  // The den mound. Doubles as the smash target while `attackable`; once
  // `looted` the cache below becomes the hover/interact target instead.
  readonly image: Phaser.GameObjects.Image;
  private cacheImage: Phaser.GameObjects.Image | null = null;
  private glowImage: Phaser.GameObjects.Image | null = null;
  // A faint ember glow on the mound itself, present from the moment the den
  // spawns (not just once looted) — playtest feedback was that a Warren read
  // as scenery, not an "obviously destroy this" POI, until it was already
  // cleared. Brightens once `attackable` to say "smash me now"; swapped out
  // for the brighter cache glow on collapse().
  private moundGlow: Phaser.GameObjects.Image;
  readonly x: number;
  readonly y: number;
  readonly loot = new LootContainer(DEN_CACHE_SIZE);
  phase: DenPhase = "wave1";
  guards: Enemy[] = [];
  health = DEN_HEALTH;
  readonly maxHealth = DEN_HEALTH;
  // One-time minimap landmark once explored close enough (same discovered-
  // structure treatment as GremlinShack/BossAltar).
  discoveredOnMap = false;
  // POI respawn (S4): when this den is fully cleared (looted + cache emptied) the
  // scene arms a timer here; once it elapses reset() returns the den to wave1.
  respawnAt: number | null = null;

  constructor(scene: Phaser.Scene, cfg: { x: number; y: number }) {
    this.scene = scene;
    this.x = cfg.x;
    this.y = cfg.y;
    this.image = scene.add.image(cfg.x, cfg.y, "duskrunner_den").setDepth(ysortDepth(cfg.y));
    this.moundGlow = this.createMoundGlow();
  }

  // The faint idle ember pulse on the mound (present from spawn so a Warren reads
  // as an "obviously destroy this" POI, not scenery). Extracted so reset() can
  // rebuild it after collapse() destroyed the original.
  private createMoundGlow(): Phaser.GameObjects.Image {
    const glow = this.scene.add
      .image(this.x, this.y, "light_soft")
      .setTint(0xff9a4a)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setScale(0.16)
      .setAlpha(0.3)
      .setDepth(this.image.depth - 1);
    this.scene.tweens.add({
      targets: glow,
      alpha: 0.5,
      scale: 0.2,
      duration: 1100,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
    return glow;
  }

  // S4 respawn: return a fully-looted den to its guarded wave-1 state. The scene
  // re-spawns wave 1 and re-arms the loot separately (mirrors respawnShackGuards).
  reset(): void {
    this.scene.tweens.killTweensOf(this.image);
    this.cacheImage?.destroy();
    this.cacheImage = null;
    if (this.glowImage) {
      this.scene.tweens.killTweensOf(this.glowImage);
      this.glowImage.destroy();
      this.glowImage = null;
    }
    this.image.setTexture("duskrunner_den").clearTint();
    this.phase = "wave1";
    this.health = this.maxHealth;
    this.guards = [];
    this.respawnAt = null;
    // Let the next collapse roll fresh cache loot (it was emptied to get here).
    this.loot.rearmIfEmpty();
    this.moundGlow = this.createMoundGlow();
  }

  // The current hover/interact target: the cache once destroyed, else the mound.
  get target(): Phaser.GameObjects.Image {
    return this.cacheImage ?? this.image;
  }

  // Weapon smash while `attackable`. Returns true on the hit that collapses it.
  takeHit(damage: number): boolean {
    if (this.phase !== "attackable") return false;
    this.health = Math.max(0, this.health - damage);
    this.playHitFeedback();
    if (this.health <= 0) {
      this.collapse();
      return true;
    }
    return false;
  }

  private playHitFeedback(): void {
    const baseX = this.image.x;
    this.scene.tweens.killTweensOf(this.image);
    this.scene.tweens.add({
      targets: this.image,
      x: baseX + 3,
      duration: 55,
      yoyo: true,
      repeat: 1,
      ease: "Sine.easeInOut",
      onComplete: () => {
        this.image.x = baseX;
      },
    });
    // Darken toward collapse, same feel as a resource node breaking.
    const frac = this.health / this.maxHealth;
    const shade = Phaser.Display.Color.Interpolate.ColorWithColor(
      new Phaser.Display.Color(255, 255, 255),
      new Phaser.Display.Color(90, 70, 55),
      100,
      Math.round((1 - frac) * 100),
    );
    this.image.setTint(Phaser.Display.Color.GetColor(shade.r, shade.g, shade.b));
  }

  // Both guard waves are down — the den is now smashable. Brighten/quicken
  // the mound glow so it visually shouts "hit me" rather than staying the
  // same faint idle pulse it had while guarded.
  markAttackable(): void {
    this.scene.tweens.killTweensOf(this.moundGlow);
    this.moundGlow.setAlpha(0.6).setScale(0.22);
    this.scene.tweens.add({
      targets: this.moundGlow,
      alpha: 0.95,
      scale: 0.3,
      duration: 550,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
  }

  private collapse(): void {
    this.phase = "looted";
    this.scene.tweens.killTweensOf(this.image);
    this.scene.tweens.killTweensOf(this.moundGlow);
    this.moundGlow.destroy();
    this.image.setTexture("duskrunner_den_wrecked").clearTint();
    this.cacheImage = this.scene.add
      .image(this.x, this.y + 6, "warren_cache")
      .setDepth(ysortDepth(this.y) + 1);
    // Warm pulsing halo so the cache reads as lootable (same additive light_soft
    // idiom + gating as the shack chest). Hidden until it actually has loot.
    this.glowImage = this.scene.add
      .image(this.cacheImage.x, this.cacheImage.y, "light_soft")
      .setTint(0xffcf6a)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setScale(0.14)
      .setAlpha(0.4)
      .setDepth(this.cacheImage.depth - 1)
      .setVisible(false);
    this.scene.tweens.add({
      targets: this.glowImage,
      alpha: 0.8,
      scale: 0.2,
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
  }

  // Keep the cache glow honest (only glow while it holds loot) — polled once a
  // frame by MainScene, same as GremlinShack.syncGlow.
  syncGlow(): void {
    this.glowImage?.setVisible(this.phase === "looted" && !this.loot.isEmpty());
  }
}
