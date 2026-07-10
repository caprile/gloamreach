import Phaser from "phaser";

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

  constructor(scene: Phaser.Scene, cfg: BossAltarConfig) {
    this.x = cfg.x;
    this.y = cfg.y;
    this.image = scene.add.image(cfg.x, cfg.y, "boss_altar").setDepth(cfg.y);
  }
}
