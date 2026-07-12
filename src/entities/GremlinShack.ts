import Phaser from "phaser";
import type { Enemy } from "./Enemy";
import { LootContainer } from "../systems/LootContainer";
import { ysortDepth } from "../systems/depth";

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
  }
}
