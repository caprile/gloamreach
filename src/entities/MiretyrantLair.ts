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

  unsealed = false;
  discoveredOnMap = false;

  // Interior (filled in by MainScene.buildLairInterior)
  layout!: CryptLayout;
  entryPoint = { x: 0, y: 0 };
  braziers: { x: number; y: number }[] = [];
  objects: Phaser.GameObjects.GameObject[] = [];
  discovered = new Set<CryptRect>();
  exitStairs: Phaser.GameObjects.Image | null = null;
  enemies: Enemy[] = [];
  boss: Enemy | null = null;
  // Adds the Miretyrant's bellow has surfaced, tracked so the concurrent cap
  // means something (see Miretyrant.MIRETYRANT_MAX_ADDS).
  adds: Enemy[] = [];

  // Every maw that leads down here. ONE interior, several doors (the user
  // playtest: "there should be 2 boss locations"). Separate lairs would mean
  // two bosses and two win conditions in a one-life run; separate doors just
  // means you don't have to cross a 28000px world to reach the finale. The
  // player always returns to the door they came in by, since the exit restores
  // their pre-descent position rather than the lair's own.
  // `discovered` is PER MAW, not one flag for the lair: discovery used to be a
  // single `discoveredOnMap` boolean tested against `x`/`y` — which are maw #1 —
  // so walking past any OTHER door revealed nothing, and once maw #1 was found
  // the effigy's reveal-everything step was skipped by its own guard. the user hit
  // both halves in one run ("never got the map markers" / "walked past the
  // dungeon and it didn't discover it"). Same class of bug as the second maw
  // giving no interact prompt (B4-P6): several doors, one door's coordinates.
  readonly maws: { x: number; y: number; image: Phaser.GameObjects.Image; discovered: boolean }[] = [];

  constructor(scene: Phaser.Scene, cfg: { x: number; y: number }) {
    this.x = cfg.x;
    this.y = cfg.y;
    this.image = this.addMaw(scene, cfg.x, cfg.y);
  }

  private readonly glows: Phaser.GameObjects.Image[] = [];

  // Build one surface maw (image + pulsing glow). The first is the canonical
  // `image`/`x`/`y`; the rest are additional doors.
  addMaw(scene: Phaser.Scene, x: number, y: number): Phaser.GameObjects.Image {
    const img = scene.add.image(x, y, this.unsealed ? "gorge_maw_open" : "gorge_maw_sealed").setDepth(ysortDepth(y));
    const glow = scene.add
      .image(x, y + 10, "light_soft")
      .setTint(0x4fbf86)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setScale(0.22)
      .setAlpha(0.28)
      .setDepth(img.depth - 1);
    scene.tweens.add({
      targets: glow,
      alpha: 0.52,
      scale: 0.3,
      duration: 1800,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
    this.glows.push(glow);
    this.maws.push({ x, y, image: img, discovered: false });
    return img;
  }

  // Break the seal: EVERY maw opens and stays open for the run.
  unseal(): void {
    if (this.unsealed) return;
    this.unsealed = true;
    for (const m of this.maws) m.image.setTexture("gorge_maw_open");
    for (const g of this.glows) g.setAlpha(0.55).setScale(0.34);
  }
}
