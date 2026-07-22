import Phaser from "phaser";
import type { Enemy } from "./Enemy";
import type { CryptLayout, CryptRect } from "../systems/CryptLayout";
import type { DungeonInterior } from "../systems/Dungeon";
import { ysortDepth } from "../systems/depth";

// The Sunken Gorge — the Miretyrant's lair (biome 3 Phase 4d session 2). A plain
// data class like SunkenCrypt/BadlandsDen: it owns the surface maw's GameObjects
// and the interior state MainScene needs, while MainScene owns generation,
// population and the descent.
//
// It is a SECOND kind of dungeon interior rather than a seventh crypt (see
// DungeonInterior): no theme, no gem, no vault nodes, no chest — killing what
// lives down here ends the run, so there is nothing to bank. What it does share
// with a crypt is everything about BEING underground, and that comes free from
// the interface.
//
// The seal is the whole gating story: one lair per world (locked), sealed until
// an Effigy of the Miretyrant is offered at the maw, and revealed on the map the
// moment that effigy is crafted (the Duneshaper altar's clue-system precedent —
// a 28000px world is too big to hunt a single door in).
export class MiretyrantLair implements DungeonInterior {
  readonly name = "The Sunken Gorge";
  readonly x: number; // surface maw
  readonly y: number;
  readonly image: Phaser.GameObjects.Image;
  private readonly glow: Phaser.GameObjects.Image;

  unsealed = false;
  discoveredOnMap = false;

  // Interior (filled in by MainScene.buildLairInterior)
  layout!: CryptLayout;
  entryPoint = { x: 0, y: 0 };
  braziers: { x: number; y: number }[] = [];
  discovered = new Set<CryptRect>();
  exitStairs: Phaser.GameObjects.Image | null = null;
  enemies: Enemy[] = [];
  boss: Enemy | null = null;
  // Adds the Miretyrant's bellow has surfaced, tracked so the concurrent cap
  // means something (see Miretyrant.MIRETYRANT_MAX_ADDS).
  adds: Enemy[] = [];

  constructor(scene: Phaser.Scene, cfg: { x: number; y: number }) {
    this.x = cfg.x;
    this.y = cfg.y;
    this.image = scene.add.image(cfg.x, cfg.y, "gorge_maw_sealed").setDepth(ysortDepth(cfg.y));
    this.glow = scene.add
      .image(cfg.x, cfg.y + 10, "light_soft")
      .setTint(0x4fbf86)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setScale(0.22)
      .setAlpha(0.28)
      .setDepth(this.image.depth - 1);
    scene.tweens.add({
      targets: this.glow,
      alpha: 0.52,
      scale: 0.3,
      duration: 1800,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
  }

  // Break the seal: the maw opens and stays open for the run.
  unseal(): void {
    if (this.unsealed) return;
    this.unsealed = true;
    this.image.setTexture("gorge_maw_open");
    this.glow.setAlpha(0.55).setScale(0.34);
  }
}
