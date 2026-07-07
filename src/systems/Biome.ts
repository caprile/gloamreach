import Phaser from "phaser";

// Procedural biome layout for the first biome. Generated fresh each session
// (the seed is random, not a fixed string) and queried by the scene for
// zone-aware spawning and — later — a "Wet" status when standing on a creek.
//
// Framework-light like Stamina/Inventory: the only Phaser dependency is
// RandomDataGenerator for seeded pseudo-randomness. It owns no GameObjects;
// MainScene bakes the visual once from forEachCell().

export type ZoneType = "forest" | "grassy";

// Zone-lookup grid resolution, in world px. Deliberately independent of the
// 32px render TILE — this is a coarse gameplay/query grid, not a tilemap. A
// 2560x1920 world is 64x48 = 3072 cells: cheap to fully materialize as flat
// arrays, no lazy/streaming lookup needed.
const CELL = 40;

const SEED_MIN = 6; // Voronoi seed points (scales the number of zone blobs)
const SEED_MAX = 10;
const SMOOTH_PASSES = 4; // cellular-automaton smoothing iterations
const CA_FLIP_THRESHOLD = 5; // flip a cell when >=5 of its 8 neighbors disagree
const MIN_ZONE_FRACTION = 0.1; // re-roll if either zone covers <10% of cells
const MAX_REROLLS = 3;

// Creek carve: a winding band walked across the map. Widths taper cell-to-cell
// so the ribbon reads organic rather than a uniform corridor.
const CREEK_WIDTH_MIN = 1;
const CREEK_WIDTH_MAX = 2;
const CREEK_TURN_CHANCE = 0.3; // per step, chance to wobble laterally by 1 cell

export class Biome {
  readonly worldW: number;
  readonly worldH: number;
  readonly cols: number;
  readonly rows: number;
  private zones: ZoneType[] = []; // length cols*rows
  private creek: boolean[] = []; // length cols*rows; a cell can be forest AND creek

  constructor(worldW: number, worldH: number, rng: Phaser.Math.RandomDataGenerator) {
    this.worldW = worldW;
    this.worldH = worldH;
    this.cols = Math.ceil(worldW / CELL);
    this.rows = Math.ceil(worldH / CELL);
    this.generate(rng);
  }

  get cellSize(): number {
    return CELL;
  }

  // --- generation ---

  private generate(rng: Phaser.Math.RandomDataGenerator): void {
    // Re-roll the whole layout if smoothing collapses it into (nearly) one
    // zone — a degenerate all-forest/all-grassy session isn't the "three
    // distinct sub-areas" we want.
    for (let attempt = 0; attempt <= MAX_REROLLS; attempt++) {
      this.zones = this.buildVoronoiZones(rng);
      for (let p = 0; p < SMOOTH_PASSES; p++) this.zones = this.smooth(this.zones);
      if (this.zonesBalanced()) break;
    }
    this.creek = this.carveCreek(rng);
  }

  // Assign each cell to its nearest random seed point's zone type. Naive
  // O(cells * seeds) nearest lookup — ~24k squared-distance checks, trivially
  // fast, no k-d tree warranted.
  private buildVoronoiZones(rng: Phaser.Math.RandomDataGenerator): ZoneType[] {
    const seedCount = rng.between(SEED_MIN, SEED_MAX);
    const seeds: { cx: number; cy: number; zone: ZoneType }[] = [];
    for (let i = 0; i < seedCount; i++) {
      seeds.push({
        cx: rng.between(0, this.cols - 1),
        cy: rng.between(0, this.rows - 1),
        zone: rng.frac() < 0.5 ? "forest" : "grassy",
      });
    }

    const grid: ZoneType[] = new Array(this.cols * this.rows);
    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        let best = Infinity;
        let bestZone: ZoneType = "grassy";
        for (const s of seeds) {
          const dx = x - s.cx;
          const dy = y - s.cy;
          const d2 = dx * dx + dy * dy;
          if (d2 < best) {
            best = d2;
            bestZone = s.zone;
          }
        }
        grid[y * this.cols + x] = bestZone;
      }
    }
    return grid;
  }

  // One cellular-automaton smoothing pass: a cell flips to its neighbors'
  // majority type when enough of them disagree, rounding off jagged Voronoi
  // boundaries into organic blobs. Double-buffered (read `src`, write fresh).
  private smooth(src: ZoneType[]): ZoneType[] {
    const out: ZoneType[] = new Array(src.length);
    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        const i = y * this.cols + x;
        const self = src[i];
        let disagree = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            const nx = x + dx;
            const ny = y + dy;
            // Out-of-bounds neighbors count as agreeing (same as self), so map
            // edges aren't eroded toward one type.
            if (nx < 0 || ny < 0 || nx >= this.cols || ny >= this.rows) continue;
            if (src[ny * this.cols + nx] !== self) disagree++;
          }
        }
        out[i] = disagree >= CA_FLIP_THRESHOLD ? (self === "forest" ? "grassy" : "forest") : self;
      }
    }
    return out;
  }

  private zonesBalanced(): boolean {
    let forest = 0;
    for (const z of this.zones) if (z === "forest") forest++;
    const frac = forest / this.zones.length;
    return frac >= MIN_ZONE_FRACTION && frac <= 1 - MIN_ZONE_FRACTION;
  }

  // A single winding creek walked edge-to-edge (horizontal or vertical), each
  // step wobbling laterally so it snakes rather than running straight. Marks a
  // tapering band into a separate grid — decoupled from zone type so a creek
  // can cut across forest and grassy alike. Looping this N times would give
  // multiple creeks; one is enough for a visual-only pass.
  private carveCreek(rng: Phaser.Math.RandomDataGenerator): boolean[] {
    const creek: boolean[] = new Array(this.cols * this.rows).fill(false);
    const horizontal = rng.frac() < 0.5;
    const mainLen = horizontal ? this.cols : this.rows;
    const crossMax = (horizontal ? this.rows : this.cols) - 1;
    let cross = rng.between(0, crossMax); // lateral position, wobbles as we walk

    for (let main = 0; main < mainLen; main++) {
      const r = rng.frac();
      if (r < CREEK_TURN_CHANCE / 2) cross = Math.max(0, cross - 1);
      else if (r < CREEK_TURN_CHANCE) cross = Math.min(crossMax, cross + 1);

      const width = rng.between(CREEK_WIDTH_MIN, CREEK_WIDTH_MAX);
      for (let w = -width; w <= width; w++) {
        const c = cross + w;
        if (c < 0 || c > crossMax) continue;
        const x = horizontal ? main : c;
        const y = horizontal ? c : main;
        creek[y * this.cols + x] = true;
      }
    }
    return creek;
  }

  // --- queries ---

  private cellIndex(worldX: number, worldY: number): number {
    const cx = Phaser.Math.Clamp(Math.floor(worldX / CELL), 0, this.cols - 1);
    const cy = Phaser.Math.Clamp(Math.floor(worldY / CELL), 0, this.rows - 1);
    return cy * this.cols + cx;
  }

  zoneAt(worldX: number, worldY: number): ZoneType {
    return this.zones[this.cellIndex(worldX, worldY)];
  }

  // Cheap O(1) flat-array lookup — this is the primitive a future "Wet" status
  // debuff hooks into ("is the player standing on a creek cell").
  isCreekAt(worldX: number, worldY: number): boolean {
    return this.creek[this.cellIndex(worldX, worldY)];
  }

  // Iterate every cell (grid coords + zone/creek) so the scene can bake a
  // one-time background visual. Kept here so callers never touch the flat
  // arrays directly.
  forEachCell(cb: (cx: number, cy: number, zone: ZoneType, isCreek: boolean) => void): void {
    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        const i = y * this.cols + x;
        cb(x, y, this.zones[i], this.creek[i]);
      }
    }
  }

  // Diagnostics for verification (coverage ratios, etc.).
  zoneFraction(zone: ZoneType): number {
    let n = 0;
    for (const z of this.zones) if (z === zone) n++;
    return n / this.zones.length;
  }

  creekFraction(): number {
    let n = 0;
    for (const c of this.creek) if (c) n++;
    return n / this.creek.length;
  }
}
