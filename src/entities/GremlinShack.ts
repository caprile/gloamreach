import Phaser from "phaser";
import type { Enemy } from "./Enemy";
import { LootContainer } from "../systems/LootContainer";
import { ysortDepth } from "../systems/depth";
import { glowTintFor } from "../systems/EpicLoot";

export interface GremlinShackConfig {
  x: number;
  y: number;
  // True for the 3 huts fanned inside the Gremlin War Camp (see
  // MainScene.spawnGremlinShacks) — they're treated as part of the boss camp
  // POI, not a standalone one: their guards don't auto-respawn (a respawn
  // mid-boss-fight was jarring) and they don't get their own minimap
  // landmark (the camp's single "Gremlin War Camp" marker covers them).
  nearCamp?: boolean;
}

export const SHACK_GUARD_RESPAWN_MS = 6 * 60 * 1000; // 6 min — 2x blackberry's 3min regrow
export const SHACK_CHEST_SIZE = 8;

// A world-gen-placed POI: a non-interactive backdrop building plus a small
// lootable chest sprite near its doorway (the actual interactable), guarded
// by 2 gremlins that respawn as a pair once both are killed. Plain data
// class, not a GameObject subclass — the shack itself is a static visual;
// MainScene owns the guard-respawn scheduling via its own timer calls.
export class GremlinShack {
  readonly image: Phaser.GameObjects.Image; // backdrop, non-interactive
  readonly chestImage: Phaser.GameObjects.Image; // the actual interactable
  private readonly glowImage: Phaser.GameObjects.Image;
  readonly x: number;
  readonly y: number;
  readonly loot: LootContainer;
  readonly nearCamp: boolean;
  guards: Enemy[] = [];
  respawnAt: number | null = null;
  // True once the player has explored close enough to reveal this shack's
  // fog cell — used to add a one-time minimap landmark (same treatment as
  // BossAltar.discoveredOnMap, a discovered fixed structure, not a live blip).
  discoveredOnMap = false;

  constructor(scene: Phaser.Scene, cfg: GremlinShackConfig) {
    this.x = cfg.x;
    this.y = cfg.y;
    this.nearCamp = cfg.nearCamp ?? false;
    this.image = scene.add.image(cfg.x, cfg.y, "gremlin_shack").setDepth(ysortDepth(cfg.y));
    this.chestImage = scene.add
      .image(cfg.x + 18, cfg.y + 12, "gremlin_shack_chest")
      .setDepth(ysortDepth(cfg.y) + 1);
    this.loot = new LootContainer(SHACK_CHEST_SIZE);

    // A constant pulsing glow so the chest reads as "interactable" at a
    // glance (playtest: players consistently missed that it was clickable).
    // Reuses the light_soft gradient (same additive-glow idiom as the Gloam
    // Shard pop/night lighting), warm gold to read as "loot" rather than the
    // vein's purple "ore" glow.
    // Scale kept tight to the 16x14 chest sprite itself (light_soft is a
    // 256px texture) — an earlier pass at 0.45-0.62 read as a huge blob
    // (the user: "that radius is huge!"). Starts hidden — syncGlow() below
    // only shows it while the chest actually has something in it.
    this.glowImage = scene.add
      .image(this.chestImage.x, this.chestImage.y, "light_soft")
      .setTint(0xffd873)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setScale(0.14)
      .setAlpha(0.4)
      .setDepth(this.chestImage.depth - 1)
      .setVisible(false);
    scene.tweens.add({
      targets: this.glowImage,
      alpha: 0.8,
      scale: 0.2,
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
  }

  // Called by MainScene once per frame (and right after any loot roll/rearm)
  // to keep the glow honest: an emptied-out chest shouldn't keep begging for
  // attention (the user: "chest should only glow if there are items in it").
  // The pulsing tween above keeps running regardless — this only toggles
  // visibility, so the glow resumes mid-pulse instead of restarting.
  syncGlow(): void {
    this.glowImage.setVisible(!this.loot.isEmpty());
    // B4-P2: an epic waiting inside burns whiter than ordinary spoils. A tint
    // swap rather than a second glow object, so there's no extra infinite tween
    // to leak and the existing pulse just carries the new colour.
    this.glowImage.setTint(glowTintFor(this.loot, 0xffd873));
  }
}
