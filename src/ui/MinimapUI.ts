import Phaser from "phaser";
import { Biome } from "../systems/Biome";
import { FogOfWar } from "../systems/Fog";

// Corner HUD minimap (World & discovery roadmap item 6): a RenderTexture
// terrain layer that fills in one pixel per newly-revealed FogOfWar cell
// (incremental — never cleared/redrawn in full), plus a small player marker
// repainted every frame on top. Passive display only, no interaction — see
// CLAUDE.md's roadmap notes for the locked scope (no waypoints/fast-travel,
// no entity blips, fixed reveal radius).

export const PANEL_W = 224; // exact 4:3 match for the 3584x2688 world (scale 16)
export const PANEL_H = 168;
export const MARGIN = 12;
const BORDER_COLOR = 0x3a4250;

// Matches MainScene.buildBiomeTexture()'s exact terrain bake so the minimap
// reads as a shrunk version of the real ground, not a different palette.
const GRASS_COLOR = 0x4a7a3a;
const FOREST_COLOR = 0x24421c;
const FOREST_ALPHA = 0.55;
const CREEK_COLOR = 0x3a6ea5;
const CREEK_ALPHA = 0.6;

function blend(base: number, overlay: number, alpha: number): number {
  const br = (base >> 16) & 0xff;
  const bg = (base >> 8) & 0xff;
  const bb = base & 0xff;
  const or_ = (overlay >> 16) & 0xff;
  const og = (overlay >> 8) & 0xff;
  const ob = overlay & 0xff;
  const r = Math.round(br * (1 - alpha) + or_ * alpha);
  const g = Math.round(bg * (1 - alpha) + og * alpha);
  const b = Math.round(bb * (1 - alpha) + ob * alpha);
  return (r << 16) | (g << 8) | b;
}

function terrainColorAt(biome: Biome, worldX: number, worldY: number): number {
  let color = GRASS_COLOR;
  const forestW = biome.forestWeight(worldX, worldY);
  if (forestW > 0.02) color = blend(color, FOREST_COLOR, FOREST_ALPHA * forestW);
  const creekW = biome.creekWeight(worldX, worldY);
  if (creekW > 0.02) color = blend(color, CREEK_COLOR, CREEK_ALPHA * creekW);
  return color;
}

export class MinimapUI {
  private biome: Biome;
  private fog: FogOfWar;
  private leftX: number;
  private topY: number;
  private terrain: Phaser.GameObjects.RenderTexture;
  private marker: Phaser.GameObjects.Graphics;
  // Scratch 1x1 Graphics reused for every incremental terrain-pixel draw —
  // never added to the display list itself, only used as a draw source.
  private pixel: Phaser.GameObjects.Graphics;
  // Light dark-blue overlay that fades in at night (M-DN) — sits between the
  // terrain and the player marker so the map dims but the marker stays visible.
  private nightDim: Phaser.GameObjects.Rectangle;

  // Top-right corner. The old "[Tab] Menu" icon that lived here was removed
  // (Tab key / Escape still open/close the combined crafting+inventory menu),
  // and the CraftingMenu panel + stat-points badge both shifted down to sit
  // below this panel — see MainScene.createStatPointsBadge and
  // CraftingMenu's MARGIN_TOP, both computed from this file's exported
  // MARGIN/PANEL_H so they stack without overlapping.
  constructor(scene: Phaser.Scene, biome: Biome, fog: FogOfWar) {
    this.biome = biome;
    this.fog = fog;
    this.leftX = scene.scale.width - MARGIN - PANEL_W;
    this.topY = MARGIN;

    scene.add
      .rectangle(this.leftX - 1, this.topY - 1, PANEL_W + 2, PANEL_H + 2, 0x000000, 0.5)
      .setOrigin(0, 0)
      .setStrokeStyle(1, BORDER_COLOR)
      .setScrollFactor(0)
      .setDepth(2900); // must clear WORLD_H (2688) so trees/world objects (depth=y) never draw over the minimap

    this.terrain = scene.add
      .renderTexture(this.leftX, this.topY, PANEL_W, PANEL_H)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(2901);
    this.terrain.fill(0x000000, 1); // starts fully fogged

    this.pixel = scene.make.graphics({}, false);
    this.nightDim = scene.add
      .rectangle(this.leftX, this.topY, PANEL_W, PANEL_H, 0x0b1c3a, 1)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(2901.5)
      .setAlpha(0);
    this.marker = scene.add.graphics().setScrollFactor(0).setDepth(2902);
  }

  // Fade the minimap's night dim with the same intensity driving the world
  // darkness (M-DN). Kept lighter than the world tint — the minimap only needs
  // to read as "dimmer at night," not go dark.
  setNightIntensity(i01: number): void {
    this.nightDim.setAlpha(Math.min(1, Math.max(0, i01)) * 0.35);
  }

  update(playerX: number, playerY: number): void {
    const newly = this.fog.consumeNewlyRevealed();
    for (const { cx, cy } of newly) {
      const worldX = (cx + 0.5) * this.fog.scale;
      const worldY = (cy + 0.5) * this.fog.scale;
      const color = terrainColorAt(this.biome, worldX, worldY);
      this.pixel.clear();
      this.pixel.fillStyle(color, 1);
      this.pixel.fillRect(0, 0, 1, 1);
      this.terrain.draw(this.pixel, cx, cy);
    }

    const mx = this.leftX + playerX / this.fog.scale;
    const my = this.topY + playerY / this.fog.scale;
    this.marker.clear();
    this.marker.fillStyle(0xffe08a, 1);
    this.marker.fillCircle(mx, my, 2.5);
  }

  // One-time permanent landmark marker (e.g. a discovered Boss Altar) —
  // burned into the terrain RenderTexture like a revealed fog cell, not the
  // ephemeral per-frame `marker` layer, so it persists without being redrawn
  // every frame. Callers are expected to only invoke this once per landmark
  // (see BossAltar.discoveredOnMap) — still safe to call repeatedly since it
  // just redraws the same pixels.
  revealLandmark(worldX: number, worldY: number, color = 0xd6483a): void {
    const cx = Math.round(worldX / this.fog.scale);
    const cy = Math.round(worldY / this.fog.scale);
    this.pixel.clear();
    this.pixel.fillStyle(color, 1);
    this.pixel.fillCircle(1.5, 1.5, 1.5);
    this.terrain.draw(this.pixel, cx - 1, cy - 1);
  }
}
