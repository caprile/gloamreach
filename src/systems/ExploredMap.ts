import { Biome } from "./Biome";
import { FogOfWar } from "./Fog";

// The shared "explored world" model behind BOTH the corner minimap (nearby
// view) and the full-screen map overlay. It owns a world-space color cache
// (one entry per fog cell) plus the list of discovered POI landmarks, and is
// the SINGLE consumer of FogOfWar's newly-revealed queue so the two views can
// never race each other draining it. Framework-light like Fog/Inventory — the
// only Phaser touch is the Biome it samples terrain colors from.

// Terrain palette — must match MainScene.buildBiomeTexture()'s bake so the map
// reads as a shrunk version of the real ground.
const GRASS_COLOR = 0x4a7a3a;
const FOREST_COLOR = 0x24421c;
const FOREST_ALPHA = 0.55;
const CREEK_COLOR = 0x3a6ea5;
const CREEK_ALPHA = 0.6;
// A revealed cell that lies beyond the circular world edge (the "void" ring)
// — rarely reached, but coloured distinctly so the map edge reads as a shore.
const EDGE_COLOR = 0x142236;

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

// A discovered fixed-structure marker (Boss Altar / War Camp, Gremlin Shack,
// …). Not a live entity blip — once a structure is explored within reveal
// range it's recorded here permanently, same treatment as revealed terrain.
export interface MapLandmark {
  worldX: number;
  worldY: number;
  iconKey: string; // BootScene map-marker texture (full map)
  label: string; // shown on the full map
  tint: number; // fallback dot color for the corner minimap
}

export interface RevealedCell {
  cx: number;
  cy: number;
  color: number;
}

export class ExploredMap {
  readonly fog: FogOfWar;
  private biome: Biome;
  readonly cols: number;
  readonly rows: number;
  readonly cellSize: number; // world px per fog cell
  private worldCx: number;
  private worldCy: number;
  private worldRadius: number;
  // 0xRRGGBB per revealed cell; -1 while still fogged.
  private colors: Int32Array;
  readonly landmarks: MapLandmark[] = [];

  constructor(biome: Biome, fog: FogOfWar, worldCx: number, worldCy: number, worldRadius: number) {
    this.biome = biome;
    this.fog = fog;
    this.cols = fog.cols;
    this.rows = fog.rows;
    this.cellSize = fog.scale;
    this.worldCx = worldCx;
    this.worldCy = worldCy;
    this.worldRadius = worldRadius;
    this.colors = new Int32Array(this.cols * this.rows).fill(-1);
  }

  reveal(playerX: number, playerY: number): void {
    this.fog.reveal(playerX, playerY);
  }

  // Drain fog's newly-revealed queue into the color cache and return the
  // changed cells (so the full-map RenderTexture can draw them incrementally).
  // Call exactly once per frame from the scene.
  drainRevealed(): RevealedCell[] {
    const newly = this.fog.consumeNewlyRevealed();
    if (newly.length === 0) return [];
    const out: RevealedCell[] = [];
    for (const { cx, cy } of newly) {
      const wx = (cx + 0.5) * this.cellSize;
      const wy = (cy + 0.5) * this.cellSize;
      const beyond = Math.hypot(wx - this.worldCx, wy - this.worldCy) > this.worldRadius;
      const color = beyond ? EDGE_COLOR : terrainColorAt(this.biome, wx, wy);
      this.colors[cy * this.cols + cx] = color;
      out.push({ cx, cy, color });
    }
    return out;
  }

  // Cached terrain color for a fog cell, or -1 if not yet revealed.
  colorAt(cx: number, cy: number): number {
    if (cx < 0 || cy < 0 || cx >= this.cols || cy >= this.rows) return -1;
    return this.colors[cy * this.cols + cx];
  }

  addLandmark(landmark: MapLandmark): void {
    this.landmarks.push(landmark);
  }
}
