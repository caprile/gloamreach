import Phaser from "phaser";
import { ExploredMap } from "../systems/ExploredMap";

// Full-screen world map overlay (opened with M or the corner Map button). Shows
// EVERYTHING explored so far — the shrunk fog color cache from ExploredMap —
// zoomable with the scroll wheel and pannable by dragging. Discovered POIs get
// an icon + label (once explored within reveal range; see MainScene). Non-
// modal: the game keeps running and the player can keep walking while it's open
// (per the locked design — opening the map does NOT pause).
//
// Terrain is drawn as clipped Graphics rects each time the view changes (a
// dirty flag), NOT a scaled/masked RenderTexture — the same reliable fixed-HUD
// clipping the corner minimap uses, sidestepping geometry-mask-vs-camera-scroll
// drift on a scrollFactor(0) panel.

const VOID_COLOR = 0x0a0e14;
const SCRIM_DEPTH = 3398;
const PANEL_DEPTH = 3400;
const TERRAIN_DEPTH = 3401;
const OVERLAY_DEPTH = 3402;
const UI_DEPTH = 3403;

const MIN_ZOOM = 1;
const MAX_ZOOM = 10;

export class WorldMapUI {
  private scene: Phaser.Scene;
  private map: ExploredMap;
  private open = false;

  private scrim: Phaser.GameObjects.Rectangle;
  private panel: Phaser.GameObjects.Rectangle;
  private titleText: Phaser.GameObjects.Text;
  private hintText: Phaser.GameObjects.Text;
  private closeBtn: Phaser.GameObjects.Text;
  private terrain: Phaser.GameObjects.Graphics;
  private overlay: Phaser.GameObjects.Graphics; // player marker + landmark dots backing
  private icons: { img: Phaser.GameObjects.Image; label: Phaser.GameObjects.Text }[] = [];

  // Terrain-area rect (below the title bar) that terrain/markers clip to.
  private ix = 0;
  private iy = 0;
  private iw = 0;
  private ih = 0;
  private cxp = 0; // terrain-area center (screen)
  private cyp = 0;

  private zoom = 1;
  private panX = 0;
  private panY = 0;
  private dragging = false;
  private dragStartX = 0;
  private dragStartY = 0;
  private dragPanX = 0;
  private dragPanY = 0;
  private dirty = true;

  constructor(scene: Phaser.Scene, map: ExploredMap) {
    this.scene = scene;
    this.map = map;
    const W = scene.scale.width;
    const H = scene.scale.height;
    const px = 60;
    const py = 56;
    const pw = W - 120;
    const ph = H - 112;

    this.ix = px + 8;
    this.iy = py + 44;
    this.iw = pw - 16;
    this.ih = ph - 52;
    this.cxp = this.ix + this.iw / 2;
    this.cyp = this.iy + this.ih / 2;

    this.scrim = scene.add
      .rectangle(0, 0, W, H, 0x05070c, 0.6)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(SCRIM_DEPTH)
      .setVisible(false);

    this.panel = scene.add
      .rectangle(px, py, pw, ph, 0x0e131c, 0.96)
      .setOrigin(0, 0)
      .setStrokeStyle(2, 0x3a4658)
      .setScrollFactor(0)
      .setDepth(PANEL_DEPTH)
      .setVisible(false)
      .setInteractive({ useHandCursor: false });
    // Drag-to-pan starts on the panel; scene-level move/up finish it.
    this.panel.on("pointerdown", (p: Phaser.Input.Pointer) => {
      if (!this.open) return;
      this.dragging = true;
      this.dragStartX = p.x;
      this.dragStartY = p.y;
      this.dragPanX = this.panX;
      this.dragPanY = this.panY;
    });

    this.terrain = scene.add.graphics().setScrollFactor(0).setDepth(TERRAIN_DEPTH).setVisible(false);
    this.overlay = scene.add.graphics().setScrollFactor(0).setDepth(OVERLAY_DEPTH).setVisible(false);

    this.titleText = scene.add
      .text(px + 16, py + 12, "World Map", {
        fontFamily: "monospace",
        fontSize: "18px",
        color: "#ffe08a",
      })
      .setScrollFactor(0)
      .setDepth(UI_DEPTH)
      .setVisible(false);

    this.hintText = scene.add
      .text(px + pw / 2, py + ph - 18, "Scroll to zoom  ·  Drag to pan  ·  M / Esc to close", {
        fontFamily: "monospace",
        fontSize: "12px",
        color: "#8a93a3",
      })
      .setOrigin(0.5, 0.5)
      .setScrollFactor(0)
      .setDepth(UI_DEPTH)
      .setVisible(false);

    this.closeBtn = scene.add
      .text(px + pw - 16, py + 12, "✕", {
        fontFamily: "monospace",
        fontSize: "18px",
        color: "#c8d0dc",
      })
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(UI_DEPTH)
      .setVisible(false)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => this.close());

    scene.input.on("pointermove", (p: Phaser.Input.Pointer) => {
      if (!this.open || !this.dragging) return;
      this.panX = this.dragPanX + (p.x - this.dragStartX);
      this.panY = this.dragPanY + (p.y - this.dragStartY);
      this.clampPan();
      this.dirty = true;
    });
    scene.input.on("pointerup", () => {
      this.dragging = false;
    });
  }

  isOpen(): boolean {
    return this.open;
  }

  containsPoint(x: number, y: number): boolean {
    return this.open && this.panel.getBounds().contains(x, y);
  }

  toggle(): void {
    if (this.open) this.close();
    else this.openMap();
  }

  openMap(): void {
    this.open = true;
    this.zoom = 1;
    this.panX = 0;
    this.panY = 0;
    this.dirty = true;
    this.scrim.setVisible(true);
    this.panel.setVisible(true);
    this.terrain.setVisible(true);
    this.overlay.setVisible(true);
    this.titleText.setVisible(true);
    this.hintText.setVisible(true);
    this.closeBtn.setVisible(true);
  }

  close(): void {
    this.open = false;
    this.dragging = false;
    this.scrim.setVisible(false);
    this.panel.setVisible(false);
    this.terrain.setVisible(false);
    this.overlay.setVisible(false);
    this.titleText.setVisible(false);
    this.hintText.setVisible(false);
    this.closeBtn.setVisible(false);
    for (const { img, label } of this.icons) {
      img.setVisible(false);
      label.setVisible(false);
    }
  }

  // New terrain revealed while the map is open — force a terrain repaint.
  markDirty(): void {
    if (this.open) this.dirty = true;
  }

  handleWheel(deltaY: number): void {
    if (!this.open) return;
    this.zoom = Phaser.Math.Clamp(this.zoom * (deltaY < 0 ? 1.15 : 1 / 1.15), MIN_ZOOM, MAX_ZOOM);
    this.clampPan();
    this.dirty = true;
  }

  private baseScale(): number {
    return Math.min(this.iw / this.map.cols, this.ih / this.map.rows);
  }

  private clampPan(): void {
    const scale = this.baseScale() * this.zoom;
    const contentW = this.map.cols * scale;
    const contentH = this.map.rows * scale;
    const maxX = contentW / 2;
    const maxY = contentH / 2;
    this.panX = Phaser.Math.Clamp(this.panX, -maxX, maxX);
    this.panY = Phaser.Math.Clamp(this.panY, -maxY, maxY);
  }

  private fillClipped(sx: number, sy: number, w: number, h: number, color: number): void {
    const l = Math.max(sx, this.ix);
    const t = Math.max(sy, this.iy);
    const r = Math.min(sx + w, this.ix + this.iw);
    const b = Math.min(sy + h, this.iy + this.ih);
    if (r <= l || b <= t) return;
    this.terrain.fillStyle(color, 1);
    this.terrain.fillRect(l, t, r - l, b - t);
  }

  // Screen position of a fog-cell coordinate (may be fractional).
  private cellToScreen(gx: number, gy: number, scale: number, originX: number, originY: number) {
    return { sx: originX + gx * scale, sy: originY + gy * scale };
  }

  update(playerX: number, playerY: number): void {
    if (!this.open) return;
    const scale = this.baseScale() * this.zoom;
    const contentW = this.map.cols * scale;
    const contentH = this.map.rows * scale;
    const originX = this.cxp - contentW / 2 + this.panX;
    const originY = this.cyp - contentH / 2 + this.panY;

    if (this.dirty) {
      this.terrain.clear();
      this.terrain.fillStyle(VOID_COLOR, 1);
      this.terrain.fillRect(this.ix, this.iy, this.iw, this.ih);
      // Only iterate cells whose screen rect overlaps the terrain area.
      const minGx = Math.max(0, Math.floor((this.ix - originX) / scale));
      const maxGx = Math.min(this.map.cols - 1, Math.ceil((this.ix + this.iw - originX) / scale));
      const minGy = Math.max(0, Math.floor((this.iy - originY) / scale));
      const maxGy = Math.min(this.map.rows - 1, Math.ceil((this.iy + this.ih - originY) / scale));
      for (let gy = minGy; gy <= maxGy; gy++) {
        for (let gx = minGx; gx <= maxGx; gx++) {
          const color = this.map.colorAt(gx, gy);
          if (color < 0) continue;
          this.fillClipped(originX + gx * scale, originY + gy * scale, scale + 1, scale + 1, color);
        }
      }
      this.dirty = false;
    }

    // Landmark icons + labels (redrawn every frame — cheap, few of them).
    const cell = this.map.cellSize;
    for (let i = 0; i < this.map.landmarks.length; i++) {
      const lm = this.map.landmarks[i];
      if (!this.icons[i]) {
        const img = this.scene.add.image(0, 0, lm.iconKey).setScrollFactor(0).setDepth(OVERLAY_DEPTH + 1);
        const label = this.scene.add
          .text(0, 0, lm.label, {
            fontFamily: "monospace",
            fontSize: "12px",
            color: "#e8e0cc",
            backgroundColor: "#000000aa",
            padding: { x: 3, y: 1 },
          })
          .setOrigin(0.5, 0)
          .setScrollFactor(0)
          .setDepth(OVERLAY_DEPTH + 1);
        this.icons[i] = { img, label };
      }
      const { img, label } = this.icons[i];
      const sx = originX + (lm.worldX / cell) * scale;
      const sy = originY + (lm.worldY / cell) * scale;
      const inside = sx >= this.ix && sx <= this.ix + this.iw && sy >= this.iy && sy <= this.iy + this.ih;
      img.setVisible(inside).setPosition(sx, sy);
      label.setVisible(inside).setPosition(sx, sy + 11);
    }

    // Player marker (a bright dot) on top of everything.
    this.overlay.clear();
    const psx = originX + (playerX / cell) * scale;
    const psy = originY + (playerY / cell) * scale;
    if (psx >= this.ix && psx <= this.ix + this.iw && psy >= this.iy && psy <= this.iy + this.ih) {
      this.overlay.fillStyle(0x101418, 1);
      this.overlay.fillCircle(psx, psy, 5);
      this.overlay.fillStyle(0xffe08a, 1);
      this.overlay.fillCircle(psx, psy, 3.5);
    }
  }
}
