import Phaser from "phaser";
import { ysortDepth } from "../systems/depth";

export interface BossAltarConfig {
  x: number;
  y: number;
}

// A world-gen-placed (not player-placed) structure — a fixed landmark found
// via exploration. Non-solid, same as GremlinShack. `summoned` is a
// permanent one-shot gate: once the Gremlin King has been summoned, the
// altar's interact prompt never shows again (no re-summon/portal scaffolding
// exists yet — the natural hook point for a future biome-transition system,
// not built now).
export class BossAltar {
  readonly image: Phaser.GameObjects.Image;
  readonly x: number;
  readonly y: number;
  summoned = false;
  bossDefeated = false;
  // True once the player has explored close enough to reveal this altar's
  // fog-of-war cell — used to add a one-time landmark marker to the minimap
  // (a discovered fixed structure, not a live entity blip — keeps the
  // minimap's locked "no entity blips" rule intact).
  discoveredOnMap = false;

  constructor(scene: Phaser.Scene, cfg: BossAltarConfig) {
    this.x = cfg.x;
    this.y = cfg.y;
    this.image = scene.add.image(cfg.x, cfg.y, "boss_altar").setDepth(ysortDepth(cfg.y));
  }
}
