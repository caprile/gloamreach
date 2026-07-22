import Phaser from "phaser";
import { ExploredMap } from "../systems/ExploredMap";

// Corner HUD minimap — a NEARBY view that scrolls with the player, showing
// roughly what's on screen plus a little margin (not the whole world; the full
// world lives on the separate WorldMapUI overlay, opened with M). Reads the
// shared ExploredMap color cache each frame and paints a player-centered
// window of fog cells, clipped to the panel. Passive display only: terrain +
// player + discovered-landmark dots, no live entity blips (locked scope).

export const PANEL_W = 224;
export const PANEL_H = 168;
export const MARGIN = 12;
const BORDER_COLOR = 0x3a4250;
const VOID_COLOR = 0x0a0e14; // unexplored / off-map

// Screen px per fog cell in the nearby view. At the 40px fog scale this shows
// a ~2240x1680 world-px window — a touch wider than the 1920x1080 viewport, so
// the minimap reads as "what you're looking at, plus a margin."
const CELL_PX = 4;

export class MinimapUI {
  private map: ExploredMap;
  private leftX: number;
  private topY: number;
  private cx: number; // panel center (screen)
  private cy: number;
  private terrain: Phaser.GameObjects.Graphics; // repainted every frame (nearby window)
  private nightDim: Phaser.GameObjects.Rectangle;
  private panelBg!: Phaser.GameObjects.Rectangle;
  private hidden = false;

  constructor(scene: Phaser.Scene, map: ExploredMap) {
    this.map = map;
    this.leftX = scene.scale.width - MARGIN - PANEL_W;
    this.topY = MARGIN;
    this.cx = this.leftX + PANEL_W / 2;
    this.cy = this.topY + PANEL_H / 2;

    this.panelBg = scene.add
      .rectangle(this.leftX - 1, this.topY - 1, PANEL_W + 2, PANEL_H + 2, 0x000000, 0.5)
      .setOrigin(0, 0)
      .setStrokeStyle(1, BORDER_COLOR)
      .setScrollFactor(0)
      .setDepth(2900); // clears WORLD_H so world objects (depth=y) never draw over the HUD

    this.terrain = scene.add.graphics().setScrollFactor(0).setDepth(2901);
    this.nightDim = scene.add
      .rectangle(this.leftX, this.topY, PANEL_W, PANEL_H, 0x0b1c3a, 1)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(2901.5)
      .setAlpha(0);
  }

  setNightIntensity(i01: number): void {
    this.nightDim.setAlpha(Math.min(1, Math.max(0, i01)) * 0.35);
  }

  // Hide the whole panel (biome 3 Phase 4c: there's no surface map underground —
  // a Sunken Crypt is navigated by torchlight). update() also early-returns while
  // hidden so it doesn't repaint an off-world position behind the hidden panel.
  setHidden(hidden: boolean): void {
    if (hidden === this.hidden) return;
    this.hidden = hidden;
    this.panelBg.setVisible(!hidden);
    this.terrain.setVisible(!hidden);
    this.nightDim.setVisible(!hidden);
  }

  // Fill a screen-space rect clipped to the panel — cells at the window edge
  // are cropped instead of overflowing into the rest of the HUD (avoids a
  // geometry mask, which is finicky with scrollFactor(0) fixed HUD).
  private fillClipped(sx: number, sy: number, w: number, h: number, color: number): void {
    const l = Math.max(sx, this.leftX);
    const t = Math.max(sy, this.topY);
    const r = Math.min(sx + w, this.leftX + PANEL_W);
    const b = Math.min(sy + h, this.topY + PANEL_H);
    if (r <= l || b <= t) return;
    this.terrain.fillStyle(color, 1);
    this.terrain.fillRect(l, t, r - l, b - t);
  }

  update(playerX: number, playerY: number): void {
    if (this.hidden) return;
    const cell = this.map.cellSize;
    const pcx = playerX / cell; // player position in fractional fog cells
    const pcy = playerY / cell;
    const halfCols = PANEL_W / 2 / CELL_PX;
    const halfRows = PANEL_H / 2 / CELL_PX;

    this.terrain.clear();
    // Void backdrop so unexplored gaps read as dark, not transparent.
    this.terrain.fillStyle(VOID_COLOR, 1);
    this.terrain.fillRect(this.leftX, this.topY, PANEL_W, PANEL_H);

    const minCx = Math.floor(pcx - halfCols) - 1;
    const maxCx = Math.ceil(pcx + halfCols) + 1;
    const minCy = Math.floor(pcy - halfRows) - 1;
    const maxCy = Math.ceil(pcy + halfRows) + 1;
    for (let gy = minCy; gy <= maxCy; gy++) {
      for (let gx = minCx; gx <= maxCx; gx++) {
        const color = this.map.colorAtSmoothed(gx, gy);
        if (color < 0) continue; // unexplored — leave the void backdrop
        const sx = this.cx + (gx - pcx) * CELL_PX;
        const sy = this.cy + (gy - pcy) * CELL_PX;
        this.fillClipped(sx, sy, CELL_PX + 1, CELL_PX + 1, color);
      }
    }

    // Discovered landmarks as small marker dots (icons live on the full map).
    for (const lm of this.map.landmarks) {
      const sx = this.cx + (lm.worldX / cell - pcx) * CELL_PX;
      const sy = this.cy + (lm.worldY / cell - pcy) * CELL_PX;
      if (sx < this.leftX + 2 || sx > this.leftX + PANEL_W - 2) continue;
      if (sy < this.topY + 2 || sy > this.topY + PANEL_H - 2) continue;
      this.terrain.fillStyle(0x11141a, 1);
      this.terrain.fillCircle(sx, sy, 4);
      this.terrain.fillStyle(lm.tint, 1);
      this.terrain.fillCircle(sx, sy, 2.5);
    }

    // Player marker — always dead center.
    this.terrain.fillStyle(0x101418, 1);
    this.terrain.fillCircle(this.cx, this.cy, 3.5);
    this.terrain.fillStyle(0xffe08a, 1);
    this.terrain.fillCircle(this.cx, this.cy, 2.5);
  }
}
