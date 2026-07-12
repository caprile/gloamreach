import Phaser from "phaser";

// Procedural biome layout for the first biome. Generated fresh each session
// (the seed is random, not a fixed string) and queried by the scene for
// zone-aware spawning and — later — a "Wet" status when standing on a creek.
//
// Framework-light like Stamina/Inventory: the only Phaser dependency is
// RandomDataGenerator for seeded pseudo-randomness. It owns no GameObjects;
// MainScene bakes the visual once by supersampling forestWeight()/creekWeight().

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
  // The biome occupies a CENTERED sub-region of the (larger, circular) world —
  // these are its world-space origin + size. Everything outside this box reads
  // as plain grass (see forestWeight/creekWeight), leaving the rest of the map
  // empty for future biomes.
  readonly originX: number;
  readonly originY: number;
  readonly regionW: number;
  readonly regionH: number;
  readonly cols: number;
  readonly rows: number;
  // When true the region TILES infinitely (coords wrap modulo the region) instead
  // of reading as plain grass outside it — used by the badlands/dunes feature layer
  // so a small, cheap Biome's mesa/flats/ravine pattern repeats across the huge
  // outer world at a sane blob scale, rather than generating a 28000px Voronoi.
  private readonly tiled: boolean;
  private zones: ZoneType[] = []; // length cols*rows
  private creek: boolean[] = []; // length cols*rows; a cell can be forest AND creek
  // Numeric mirrors of the two grids above (forest=1/grassy=0, creek 1/0),
  // kept only so forestWeight()/creekWeight() can bilinear-sample them for
  // smooth render-time boundaries instead of hard per-cell edges.
  private zoneNum: Float32Array = new Float32Array(0);
  private creekNum: Float32Array = new Float32Array(0);

  constructor(
    originX: number,
    originY: number,
    regionW: number,
    regionH: number,
    rng: Phaser.Math.RandomDataGenerator,
    tiled = false,
  ) {
    this.originX = originX;
    this.originY = originY;
    this.regionW = regionW;
    this.regionH = regionH;
    this.tiled = tiled;
    this.cols = Math.ceil(regionW / CELL);
    this.rows = Math.ceil(regionH / CELL);
    this.generate(rng);
  }

  // Wrap a cell index into [0, n) for tiled sampling.
  private static wrapCell(c: number, n: number): number {
    return ((c % n) + n) % n;
  }

  // Whether a world point falls inside the generated biome region. Points
  // outside it are plain grass with no forest/creek overlay. Tiled biomes are
  // "everywhere" (coords wrap), so they're always in-region.
  private inRegion(worldX: number, worldY: number): boolean {
    if (this.tiled) return true;
    return (
      worldX >= this.originX &&
      worldX < this.originX + this.regionW &&
      worldY >= this.originY &&
      worldY < this.originY + this.regionH
    );
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

    this.zoneNum = new Float32Array(this.zones.length);
    for (let i = 0; i < this.zones.length; i++) this.zoneNum[i] = this.zones[i] === "forest" ? 1 : 0;
    this.creekNum = new Float32Array(this.creek.length);
    for (let i = 0; i < this.creek.length; i++) this.creekNum[i] = this.creek[i] ? 1 : 0;
  }

  // Assign each cell to its nearest random seed point's zone type. Naive
  // O(cells * seeds) nearest lookup — ~24k squared-distance checks, trivially
  // fast, no k-d tree warranted.
  // Toroidal (shortest-way-around) delta for a tiled grid — e.g. cell 0 and
  // cell (n-1) are 1 apart, not (n-1) apart. Plain difference for non-tiled.
  private wrapDelta(d: number, n: number): number {
    if (!this.tiled) return d;
    return ((d + n / 2) % n + n) % n - n / 2;
  }

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
          const dx = this.wrapDelta(x - s.cx, this.cols);
          const dy = this.wrapDelta(y - s.cy, this.rows);
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
            let nx = x + dx;
            let ny = y + dy;
            if (this.tiled) {
              // Wrap so a tiled biome's zone grid is genuinely toroidal —
              // otherwise the bilinear sampler's wrap (see bilinear()) blends
              // two UNRELATED edges together, baking a hard seam every
              // regionW/H world px (the user: "flat lines" on the map/ground).
              nx = Biome.wrapCell(nx, this.cols);
              ny = Biome.wrapCell(ny, this.rows);
            } else if (nx < 0 || ny < 0 || nx >= this.cols || ny >= this.rows) {
              // Out-of-bounds neighbors count as agreeing (same as self), so
              // map edges aren't eroded toward one type.
              continue;
            }
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
    // Tiled biomes need the ribbon's start/end lateral position to MATCH (it
    // wraps into itself) or the bilinear sampler blends two unrelated ends
    // into a visible kink at the seam — a sine-based periodic wobble (always
    // wobble(0) === wobble(mainLen)) instead of a free random walk guarantees
    // that for exactly the same reason the zone grid was made toroidal above.
    const wobbleAmp = Math.min(crossMax / 2, rng.between(2, 5));
    const wobbleHarmonics = rng.between(1, 3);
    const wobblePhase = rng.frac() * Math.PI * 2;
    const centerCross = crossMax / 2;

    for (let main = 0; main < mainLen; main++) {
      if (this.tiled) {
        const t = (main / mainLen) * Math.PI * 2 * wobbleHarmonics;
        cross = Math.round(Phaser.Math.Clamp(centerCross + wobbleAmp * Math.sin(t + wobblePhase), 0, crossMax));
      } else {
        const r = rng.frac();
        if (r < CREEK_TURN_CHANCE / 2) cross = Math.max(0, cross - 1);
        else if (r < CREEK_TURN_CHANCE) cross = Math.min(crossMax, cross + 1);
      }

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
    let cx = Math.floor((worldX - this.originX) / CELL);
    let cy = Math.floor((worldY - this.originY) / CELL);
    if (this.tiled) {
      cx = Biome.wrapCell(cx, this.cols);
      cy = Biome.wrapCell(cy, this.rows);
    } else {
      cx = Phaser.Math.Clamp(cx, 0, this.cols - 1);
      cy = Phaser.Math.Clamp(cy, 0, this.rows - 1);
    }
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

  // A "shallow" creek cell: ON the water, but in the outer ring directly
  // touching dry land — not deep in the middle of a wider stretch. Cattail
  // spawns here (see MainScene) so it reads as growing right at the water's
  // edge, not out on dry land next to the creek. 4-neighborhood is enough —
  // a diagonal-only touch still counts as "at the bank."
  isCreekEdge(worldX: number, worldY: number): boolean {
    const cx = Phaser.Math.Clamp(Math.floor((worldX - this.originX) / CELL), 0, this.cols - 1);
    const cy = Phaser.Math.Clamp(Math.floor((worldY - this.originY) / CELL), 0, this.rows - 1);
    if (!this.creek[cy * this.cols + cx]) return false; // dry land, not water at all
    const neighbors = [
      [cx - 1, cy],
      [cx + 1, cy],
      [cx, cy - 1],
      [cx, cy + 1],
    ];
    for (const [nx, ny] of neighbors) {
      if (nx < 0 || ny < 0 || nx >= this.cols || ny >= this.rows) continue;
      if (!this.creek[ny * this.cols + nx]) return true; // touches dry land
    }
    return false;
  }

  // Bilinear-sample a numeric cell grid at a world position, treating each
  // cell's value as anchored to its center (so two adjacent cells' values
  // blend smoothly across the 40px gap between their centers, rather than
  // snapping hard at the cell boundary). Used only for rendering — gameplay
  // queries (zoneAt/isCreekAt) stay hard-edged per-cell lookups.
  private bilinear(grid: Float32Array, worldX: number, worldY: number): number {
    const gx = (worldX - this.originX) / CELL - 0.5;
    const gy = (worldY - this.originY) / CELL - 0.5;
    const x0 = Math.floor(gx);
    const y0 = Math.floor(gy);
    const tx = gx - x0;
    const ty = gy - y0;
    const sample = (cx: number, cy: number): number => {
      const cxs = this.tiled ? Biome.wrapCell(cx, this.cols) : Phaser.Math.Clamp(cx, 0, this.cols - 1);
      const cys = this.tiled ? Biome.wrapCell(cy, this.rows) : Phaser.Math.Clamp(cy, 0, this.rows - 1);
      return grid[cys * this.cols + cxs];
    };
    const v00 = sample(x0, y0);
    const v10 = sample(x0 + 1, y0);
    const v01 = sample(x0, y0 + 1);
    const v11 = sample(x0 + 1, y0 + 1);
    const top = v00 + (v10 - v00) * tx;
    const bot = v01 + (v11 - v01) * tx;
    return top + (bot - top) * ty;
  }

  // 0 (fully grassy) .. 1 (fully forest), smoothly interpolated — the render
  // bake blends the forest overlay's alpha by this instead of an on/off fill,
  // turning the old blocky 40px-stepped zone boundary into a soft gradient
  // band a couple of cells wide.
  forestWeight(worldX: number, worldY: number): number {
    if (!this.inRegion(worldX, worldY)) return 0; // outside the biome: plain grass
    return this.bilinear(this.zoneNum, worldX, worldY);
  }

  // Same idea for the creek overlay, so its banks fade in/out instead of
  // stair-stepping too.
  creekWeight(worldX: number, worldY: number): number {
    if (!this.inRegion(worldX, worldY)) return 0; // outside the biome: no creek
    return this.bilinear(this.creekNum, worldX, worldY);
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
