import Phaser from "phaser";
import type { Enemy } from "./Enemy";
import type { ResourceNode } from "./ResourceNode";
import type { CryptLayout, CryptRect } from "../systems/CryptLayout";
import { LootContainer } from "../systems/LootContainer";
import { ysortDepth } from "../systems/depth";

// A Sunken Crypt (biome 3 Phase 4c — the dungeon mechanic). Plain data class
// like BadlandsDen: it owns the surface entrance's GameObjects and the bundle of
// state MainScene needs, while MainScene owns generation, population and the
// enter/exit transition (the same split every other POI uses).
//
// Each crypt is THEMED to exactly one ability gem (the user's lock): which crypt
// you find and clear decides which of the three Q/E/R abilities you can unlock,
// so the theme drives the entrance art, the map marker, the warden, and the
// geode in the vault — one decision, four consistent tells.
export type CryptTheme = "gloam" | "ember" | "blood";

export const CRYPT_CACHE_SIZE = 8;

export interface CryptThemeDef {
  entranceTexture: string;
  mapMarker: string;
  geodeTexture: string;
  gem: string; // ResourceType key of the ability gem buried here
  gemLabel: string;
  wardenName: string;
  lightTint: number;
  name: string;
}

export const CRYPT_THEMES: Record<CryptTheme, CryptThemeDef> = {
  gloam: {
    entranceTexture: "crypt_entrance_gloam",
    mapMarker: "map_crypt_gloam",
    geodeTexture: "geode_gloam",
    gem: "gem_gloam",
    gemLabel: "Gloam Geode",
    wardenName: "The Palewake",
    lightTint: 0x9a5cff,
    name: "Palewake Crypt",
  },
  ember: {
    entranceTexture: "crypt_entrance_ember",
    mapMarker: "map_crypt_ember",
    geodeTexture: "geode_ember",
    gem: "gem_ember",
    gemLabel: "Ember Geode",
    wardenName: "The Kilnborn",
    lightTint: 0xff6a1a,
    name: "Kilnborn Crypt",
  },
  blood: {
    entranceTexture: "crypt_entrance_blood",
    mapMarker: "map_crypt_blood",
    geodeTexture: "geode_blood",
    gem: "gem_blood",
    gemLabel: "Blood Geode",
    wardenName: "The Sanguinarch",
    lightTint: 0xc02a44,
    name: "Sanguinarch Crypt",
  },
};

export class SunkenCrypt {
  private readonly scene: Phaser.Scene;
  readonly theme: CryptTheme;
  readonly x: number; // surface entrance
  readonly y: number;
  readonly image: Phaser.GameObjects.Image;
  private readonly glow: Phaser.GameObjects.Image;

  // Interior (filled in by MainScene.buildCryptInterior)
  layout!: CryptLayout;
  entryPoint = { x: 0, y: 0 };
  // Interior brazier positions. Kept PER CRYPT rather than in the scene's shared
  // light list because the six interiors sit on one grid inside CRYPT_REALM and
  // a neighbouring crypt is within camera range — pooling them would leave the
  // next dungeon's braziers glowing across the void while you stand in this one.
  // collectLights() only reads these for the crypt you're actually inside.
  braziers: { x: number; y: number }[] = [];
  // Rooms/corridors the player has set foot in. Discovering a space lights the
  // WHOLE space permanently (the user) — a fog-of-war reveal rather than a torch
  // radius, so exploring a crypt leaves a map of lit rooms behind you and the
  // unexplored parts stay black. Persists for the run, like everything else in
  // a prebuilt interior.
  discovered = new Set<CryptRect>();
  exitStairs: Phaser.GameObjects.Image | null = null;
  warden: Enemy | null = null;
  vaultNodes: ResourceNode[] = [];
  enemies: Enemy[] = [];
  readonly loot = new LootContainer(CRYPT_CACHE_SIZE);
  chestImage: Phaser.GameObjects.Image | null = null;
  private chestGlow: Phaser.GameObjects.Image | null = null;

  // True once the warden is dead and the vault has been unsealed. Cleared crypts
  // stay cleared for the run — the interior is prebuilt, never regenerated.
  vaultOpen = false;
  discoveredOnMap = false;

  constructor(scene: Phaser.Scene, cfg: { x: number; y: number; theme: CryptTheme }) {
    this.scene = scene;
    this.theme = cfg.theme;
    this.x = cfg.x;
    this.y = cfg.y;
    const def = CRYPT_THEMES[cfg.theme];
    this.image = scene.add.image(cfg.x, cfg.y, def.entranceTexture).setDepth(ysortDepth(cfg.y));
    // The doorway breathes a little of its gem's light — how a crypt reads as a
    // crypt from across the swamp, especially at night (collectLights also puts a
    // real light hole here).
    this.glow = scene.add
      .image(cfg.x, cfg.y + 8, "light_soft")
      .setTint(def.lightTint)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setScale(0.18)
      .setAlpha(0.32)
      .setDepth(this.image.depth - 1);
    scene.tweens.add({
      targets: this.glow,
      alpha: 0.5,
      scale: 0.24,
      duration: 1400,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
  }

  get def(): CryptThemeDef {
    return CRYPT_THEMES[this.theme];
  }

  // Satisfies DungeonInterior (B3-P4d) — the underground paths are shared with
  // the Miretyrant's lair now, and they only ever wanted a display name.
  get name(): string {
    return this.def.name;
  }

  // Attach the crypt's loot chest (built with the interior) so its glow can be
  // gated on actually holding something, like the shack/warren caches.
  setChest(image: Phaser.GameObjects.Image): void {
    this.chestImage = image;
    this.chestGlow = this.scene.add
      .image(image.x, image.y, "light_soft")
      .setTint(0xffcf6a)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setScale(0.14)
      .setAlpha(0.4)
      .setDepth(image.depth - 1)
      .setVisible(false);
    this.scene.tweens.add({
      targets: this.chestGlow,
      alpha: 0.8,
      scale: 0.2,
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
  }

  syncGlow(): void {
    this.chestGlow?.setVisible(!this.loot.isEmpty());
  }
}
