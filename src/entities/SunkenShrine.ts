import Phaser from "phaser";
import type { Enemy } from "./Enemy";
import { LootContainer } from "../systems/LootContainer";
import { ysortDepth } from "../systems/depth";

// A Sunken Shrine — a bayou surface POI (biome 3 Phase 4d).
//
// Every POI in the game so far resolves the same way: something guards a thing,
// you kill it, you take the thing. The Shrine deliberately breaks that (locked
// with the user) — it is dormant when found, and THE PLAYER STARTS THE FIGHT by
// spending an offering. What follows is a timed rite the player has to survive
// on the spot, which turns the bayou's swarm creatures into the content instead
// of an obstacle between you and a chest.
//
//   • dormant — cold and algae-choked. Costs an offering to kindle.
//   • rite    — three escalating waves surface around it. Walk away (or die)
//               and the rite lapses: the offering is spent, the site is not.
//   • open    — survived. The bowl spills its spoils (a LootContainer, opened
//               with the same ChestMenu every other cache uses).
//
// Emptying the bowl returns it to dormant, so it is a RENEWABLE source rather
// than a one-shot clear — nothing in a run gets permanently exhausted.
//
// Plain data class like BadlandsDen/SunkenCrypt: it owns its GameObjects and
// phase, while MainScene owns wave scheduling, the leash check and the phase
// transitions (the same split every other POI uses).
export type ShrinePhase = "dormant" | "rite" | "open";

export const SHRINE_BOWL_SIZE = 6;

// What one kindling costs. Both are Phase-4b roster drops with no other use
// yet, so the rite gives the bayou's most common trash mobs an economy.
export const SHRINE_OFFERING: { key: string; count: number }[] = [
  { key: "blight_gland", count: 3 },
  { key: "gloam_dust", count: 2 },
];

export class SunkenShrine {
  private readonly scene: Phaser.Scene;
  readonly x: number;
  readonly y: number;
  readonly image: Phaser.GameObjects.Image;
  private readonly glow: Phaser.GameObjects.Image;

  phase: ShrinePhase = "dormant";
  readonly loot = new LootContainer(SHRINE_BOWL_SIZE);
  // Rite bookkeeping, driven by MainScene.updateShrines.
  wave = 0;
  nextWaveAt = 0;
  riteEnemies: Enemy[] = [];
  // How long the player has been outside the rite radius. A brief step out
  // shouldn't void the whole rite — only leaving it does (see the leash in
  // MainScene), so this accumulates rather than failing on the first frame.
  awayMs = 0;
  discoveredOnMap = false;

  constructor(scene: Phaser.Scene, cfg: { x: number; y: number }) {
    this.scene = scene;
    this.x = cfg.x;
    this.y = cfg.y;
    this.image = scene.add.image(cfg.x, cfg.y, "sunken_shrine").setDepth(ysortDepth(cfg.y));
    // The shrine breathes a little cold light even dormant — how it reads as a
    // shrine from across the swamp at night (collectLights also puts a real
    // light hole here). setPhase re-tunes this as the rite escalates.
    this.glow = scene.add
      .image(cfg.x, cfg.y - 16, "light_soft")
      .setTint(0x3ce0b8)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setScale(0.12)
      .setAlpha(0.22)
      .setDepth(this.image.depth - 1);
    this.pulseGlow(0.34, 0.16, 1600);
  }

  private pulseGlow(alpha: number, scale: number, duration: number): void {
    this.scene.tweens.killTweensOf(this.glow);
    this.scene.tweens.add({
      targets: this.glow,
      alpha,
      scale,
      duration,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
  }

  // Phase + its visual tell in one place, so the shrine can never show a state
  // it isn't in. The glow is the primary read at distance; the texture carries
  // it up close.
  setPhase(phase: ShrinePhase): void {
    this.phase = phase;
    if (phase === "dormant") {
      this.image.setTexture("sunken_shrine");
      this.glow.setAlpha(0.22).setScale(0.12);
      this.pulseGlow(0.34, 0.16, 1600);
    } else if (phase === "rite") {
      this.image.setTexture("sunken_shrine_lit");
      this.glow.setAlpha(0.55).setScale(0.2);
      this.pulseGlow(0.85, 0.28, 700);
    } else {
      this.image.setTexture("sunken_shrine_open");
      this.glow.setAlpha(0.5).setScale(0.18);
      this.pulseGlow(0.75, 0.24, 1000);
    }
  }

  // Each surviving wave stokes the fire a little brighter — the only progress
  // readout the rite gets (no new HUD, per the plan).
  stokeForWave(wave: number): void {
    const t = Math.min(1, wave / 3);
    this.glow.setAlpha(0.5 + t * 0.3).setScale(0.18 + t * 0.12);
    this.pulseGlow(0.85 + t * 0.15, 0.28 + t * 0.14, 700 - t * 200);
  }

  // Rite over, one way or the other. Kept separate from setPhase so MainScene
  // can clear the wave bookkeeping in one call from both the win and the lapse.
  clearRite(): void {
    this.wave = 0;
    this.nextWaveAt = 0;
    this.riteEnemies = [];
    this.awayMs = 0;
  }
}
