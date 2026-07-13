import Phaser from "phaser";
import { ysortDepth } from "../systems/depth";

// Which boss an altar summons. "gremlin" = the forest War-Camp altar (Gremlin
// King, now a mid-boss); "tyrant" = the badlands altars (the Duneshaper, the
// win-condition final boss). Several tyrant altars exist per world so at least
// one is reachable (see MainScene.spawnTyrantAltars + the clue system).
export type BossAltarKind = "gremlin" | "tyrant";

export interface BossAltarConfig {
  x: number;
  y: number;
  kind?: BossAltarKind;
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
  readonly kind: BossAltarKind;
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
    this.kind = cfg.kind ?? "gremlin";
    const texture = this.kind === "tyrant" ? "tyrant_altar" : "boss_altar";
    this.image = scene.add.image(cfg.x, cfg.y, texture).setDepth(ysortDepth(cfg.y));
  }
}
