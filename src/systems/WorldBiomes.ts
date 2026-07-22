import Phaser from "phaser";
import { Biome } from "./Biome";
import { blendColors, mottleColor } from "./colorUtil";
import { forestTerrainColorAt } from "./ExploredMap";
import { badlandsGroundColorAt } from "./Badlands";
import { dunesGroundColorAt } from "./Dunes";
import { bayouGroundColorAt } from "./Bayou";

// The patchwork world map (biome-2 Phase 0). Decides WHICH biome type covers each
// world point, Valheim-style: a universal base layer with biome "blobs" painted on
// top. Biome 1 (forest) is a solid protected CHUNK at the center (the tutorial
// area — no later biome ever generates inside it); beyond it the world is a
// patchwork. Framework-light like Biome/Fog — the only Phaser touch is
// RandomDataGenerator for the seeded, deterministic layout; it owns no GameObjects.
//
// ORDERING RULE (locked, the user): radius sets a danger CEILING, not a fixed tier.
// A blob at radius r may be any biome whose tier <= ceiling(r), weighted toward the
// ceiling — so you NEVER meet a higher-tier biome before its unlock radius (no
// out-of-order danger), but LOWER-tier biomes (forest, badlands) can appear anywhere
// out in later-biome territory. Forest is itself a blob biome now, so it spawns in
// pockets beyond the disc too.
//
// Two levels: THIS is the level-1 biome-TYPE map. Each biome keeps its own feature
// generator for its internal look. worldBiomeColorAt composites base + all biomes and
// is the single source of truth for both the terrain bake and the map.

export type BiomeId = "forest" | "badlands" | "bayou" | "dunes";

// Every blob biome + the danger tier it sits at. Forest (tier 1) IS in the pool now
// (it spawns as outer blobs too); the protected center chunk is additionally
// guaranteed by forestCoverage(). Adding biomes 4–5 = more rows + a ceiling segment.
const BIOMES: { id: BiomeId; tier: number }[] = [
  { id: "forest", tier: 1 },
  { id: "badlands", tier: 2 },
  { id: "bayou", tier: 3 },
  { id: "dunes", tier: 4 },
];

const FOREST_CORE = 2000; // forest chunk is solid (coverage 1) within this radius
const FOREST_EDGE = 2300; // guaranteed forest chunk fully gone by here

// Ceiling curve (piecewise-linear control points: [radius, maxTier]). A biome of
// tier T only becomes eligible once ceiling(r) >= T, giving each biome a hard
// "unlock radius" (the ordering guarantee) while lower biomes stay eligible outward.
// Tuned so: forest-only inside ~2400, badlands from ~2400, dunes from ~6500.
// Biome 3 (bayou) TOOK tier 3 and its 6500 unlock radius; the content-less Dunes
// placeholder was demoted to tier 4 / the deep frontier, which is where it always
// belonged (it exists only to make the patchwork visibly varied, and everything
// past ~10500 is deliberately reserved for a future biome).
const CEILING_POINTS: [number, number][] = [
  [FOREST_EDGE, 1],
  [2400, 2], // badlands unlocks
  [6500, 3], // bayou unlocks
  [10500, 4], // dunes unlocks (deep frontier)
  [14000, 5], // headroom (dunes stays top biome until biome 5 exists)
];
// How fast a below-ceiling biome's weight falls off (bigger = lower biomes rarer).
const LOWER_FALLOFF = 0.9;

// Jittered-grid seed scatter: one blob seed per grid cell (deterministic), which
// also doubles as the spatial bucket for cheap coverage lookups (only the 3x3
// neighbor cells can cover a point). Spacing ~ blob scale → ~2x the old badlands
// chunk (locked "2x chunks") with partial overlaps + base-layer gaps.
const SEED_GRID = 1100;
const BLOB_MIN = 0.72 * SEED_GRID; // per-seed radius range
const BLOB_MAX = 1.25 * SEED_GRID;

// Base layer palette (grades outward): lush grass near center -> dusty barren rim.
const BASE_GRASS = 0x4a7a3a;
const BASE_DUST = 0x7d6f55;
const BASE_GRADE_END = 9000; // radius by which the base is fully dusty
// Outer forest blobs reuse the tiled feature with a green palette (a "meadow/woods"
// look), distinct from the crisp center bake which draws the real forest.
const FOREST_DARK = 0x24421c;
const FOREST_DARK_ALPHA = 0.55;

interface BlobSeed {
  x: number;
  y: number;
  biome: BiomeId;
  radius: number;
  wAmp: number; // edge-wobble amplitude (px)
  wK: number; // edge-wobble angular frequency
  wPhase: number;
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Phaser.Math.Clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

export class WorldBiomes {
  private cx: number;
  private cy: number;
  private worldRadius: number;
  private forest: Biome;
  // One tiled feature Biome shared by all outer biomes — each reinterprets its
  // zone/creek pattern with its own palette (badlands mesa/ravine, dune ridge/hollow,
  // outer-forest woods).
  private outerFeature: Biome;

  // Seed grid (spatial buckets). `seeds[gy*cols+gx]` is that cell's seed or null.
  // Assigned in buildSeeds() (called from the constructor).
  private cols!: number;
  private rows!: number;
  private originX!: number;
  private originY!: number;
  private seeds: (BlobSeed | null)[] = [];

  constructor(
    cx: number,
    cy: number,
    worldRadius: number,
    forest: Biome,
    outerFeature: Biome,
    rng: Phaser.Math.RandomDataGenerator,
  ) {
    this.cx = cx;
    this.cy = cy;
    this.worldRadius = worldRadius;
    this.forest = forest;
    this.outerFeature = outerFeature;
    this.buildSeeds(rng);
  }

  // The danger ceiling (max eligible tier) at a radius — the outward gradient,
  // interpolated across CEILING_POINTS. Monotonic, so higher biomes are strictly
  // gated behind their unlock radius (never out of order).
  ceilingTier(r: number): number {
    const pts = CEILING_POINTS;
    if (r <= pts[0][0]) return pts[0][1];
    for (let i = 1; i < pts.length; i++) {
      if (r <= pts[i][0]) {
        const [r0, t0] = pts[i - 1];
        const [r1, t1] = pts[i];
        return t0 + ((t1 - t0) * (r - r0)) / (r1 - r0);
      }
    }
    return pts[pts.length - 1][1];
  }

  // Pick a seed's biome: weighted random among biomes eligible at its radius
  // (tier <= ceiling), biased toward the ceiling so the top-eligible biome
  // dominates while lower ones are sprinkled in.
  private pickBiome(r: number, rng: Phaser.Math.RandomDataGenerator): BiomeId {
    const ceil = this.ceilingTier(r);
    let total = 0;
    const weights: number[] = [];
    for (const b of BIOMES) {
      const w = b.tier <= ceil + 0.001 ? Math.exp(-LOWER_FALLOFF * (ceil - b.tier)) : 0;
      weights.push(w);
      total += w;
    }
    let roll = rng.frac() * total;
    for (let i = 0; i < BIOMES.length; i++) {
      roll -= weights[i];
      if (roll <= 0) return BIOMES[i].id;
    }
    return BIOMES[0].id;
  }

  private buildSeeds(rng: Phaser.Math.RandomDataGenerator): void {
    const size = this.worldRadius * 2;
    this.cols = Math.ceil(size / SEED_GRID);
    this.rows = this.cols;
    this.originX = this.cx - this.worldRadius;
    this.originY = this.cy - this.worldRadius;
    this.seeds = new Array(this.cols * this.rows).fill(null);
    for (let gy = 0; gy < this.rows; gy++) {
      for (let gx = 0; gx < this.cols; gx++) {
        const sx = this.originX + (gx + rng.frac()) * SEED_GRID;
        const sy = this.originY + (gy + rng.frac()) * SEED_GRID;
        const r = Math.hypot(sx - this.cx, sy - this.cy);
        // No blob seeds inside the guaranteed forest chunk (it owns the center),
        // or out past the world edge.
        if (r < FOREST_EDGE || r > this.worldRadius + BLOB_MAX) continue;
        const radius = BLOB_MIN + rng.frac() * (BLOB_MAX - BLOB_MIN);
        this.seeds[gy * this.cols + gx] = {
          x: sx,
          y: sy,
          biome: this.pickBiome(r, rng),
          radius,
          // Bigger lobes (0.18-0.36 of radius) for more pronounced blob shapes.
          wAmp: radius * (0.18 + rng.frac() * 0.18),
          wK: 3 + Math.floor(rng.frac() * 4),
          wPhase: rng.frac() * Math.PI * 2,
        };
      }
    }
  }

  private seedCoverage(s: BlobSeed, x: number, y: number): number {
    const dx = x - s.x;
    const dy = y - s.y;
    const d = Math.hypot(dx, dy);
    // Multi-octave angular wobble (3 harmonics) instead of a single sine, so the
    // blob edge reads as an organic lumpy outline rather than a smooth oval — the
    // extra frequencies also break up the long near-axis runs that baked as
    // "jagged straight lines" at the coarse overlay resolution (the user's note).
    const ang = Math.atan2(dy, dx);
    const wob =
      0.6 * Math.sin(ang * s.wK + s.wPhase) +
      0.28 * Math.sin(ang * (s.wK * 2 + 1) + s.wPhase * 1.7) +
      0.16 * Math.sin(ang * (s.wK * 3 + 2) - s.wPhase * 0.6);
    const eff = s.radius + s.wAmp * wob;
    if (d >= eff) return 0;
    // Full-strength core, wide smooth falloff to the wobbly edge (softer border →
    // the LINEAR-filtered stretch blends it into a curve, not a hard line).
    return smoothstep(eff, eff * 0.5, d);
  }

  // 0..1 coverage of a biome type at a point — max over nearby blobs of that type.
  // Only scans the 3x3 seed-grid neighborhood (blobs can't reach further).
  coverageAt(x: number, y: number, biome: BiomeId): number {
    const gx = Math.floor((x - this.originX) / SEED_GRID);
    const gy = Math.floor((y - this.originY) / SEED_GRID);
    let best = 0;
    for (let ny = gy - 1; ny <= gy + 1; ny++) {
      if (ny < 0 || ny >= this.rows) continue;
      for (let nx = gx - 1; nx <= gx + 1; nx++) {
        if (nx < 0 || nx >= this.cols) continue;
        const s = this.seeds[ny * this.cols + nx];
        if (!s || s.biome !== biome) continue;
        const c = this.seedCoverage(s, x, y);
        if (c > best) best = c;
      }
    }
    return best;
  }

  // Solid forest chunk: 1 inside the core, smooth ramp to 0 by the forest edge.
  // This is what keeps the center biome-1-only regardless of the blob layer.
  forestCoverage(r: number): number {
    if (r <= FOREST_CORE) return 1;
    if (r >= FOREST_EDGE) return 0;
    return smoothstep(FOREST_EDGE, FOREST_CORE, r);
  }

  private baseGrade(r: number): number {
    return Phaser.Math.Clamp((r - FOREST_CORE) / (BASE_GRADE_END - FOREST_CORE), 0, 1);
  }

  // Outer forest-blob ground color (a coarse "woods/meadow" look from the tiled
  // feature). The center chunk uses the crisp real-forest bake instead.
  private forestBlobColorAt(x: number, y: number): number {
    const woodsW = this.outerFeature.forestWeight(x, y);
    return blendColors(BASE_GRASS, FOREST_DARK, FOREST_DARK_ALPHA * woodsW);
  }

  // The single terrain-color source: base (graded) + outer biome blobs + the forest
  // (blobs OR the guaranteed center chunk) on top so it wins in the protected core.
  worldBiomeColorAt(x: number, y: number): number {
    const r = Math.hypot(x - this.cx, y - this.cy);
    let color = blendColors(BASE_GRASS, BASE_DUST, this.baseGrade(r));
    const bC = this.coverageAt(x, y, "badlands");
    if (bC > 0.01) color = blendColors(color, badlandsGroundColorAt(x, y, this.outerFeature), bC);
    const yC = this.coverageAt(x, y, "bayou");
    if (yC > 0.01) color = blendColors(color, bayouGroundColorAt(x, y, this.outerFeature), yC);
    const dC = this.coverageAt(x, y, "dunes");
    if (dC > 0.01) color = blendColors(color, dunesGroundColorAt(x, y, this.outerFeature), dC);
    // Forest: the guaranteed center chunk (real crisp features) OR an outer blob.
    const discC = this.forestCoverage(r);
    const blobC = this.coverageAt(x, y, "forest");
    if (discC > 0.01) color = blendColors(color, forestTerrainColorAt(this.forest, x, y), discC);
    if (blobC > discC + 0.01) color = blendColors(color, this.forestBlobColorAt(x, y), blobC);
    // Finishing mottle pass so EVERY outer ground reads as textured, not a flat
    // fill — badlands already has its own richer noise (barely touched by this
    // subtle a pass), but the base layer (open wilds between blobs) and Dunes
    // had none at all (the user: "loses the speckled texture" outside spawn).
    // Skipped inside the protected forest core, which keeps its real crisp bake
    // + tiled grass sprite untouched.
    if (discC <= 0.5) color = mottleColor(color, x, y, 0.1);
    return color;
  }

  // Which biome the player is standing in (for the HUD label + discovery toast).
  // "base" = the open wilds between blobs. The center chunk always reads "forest".
  dominantBiomeAt(x: number, y: number): BiomeId | "base" {
    const r = Math.hypot(x - this.cx, y - this.cy);
    if (this.forestCoverage(r) > 0.5) return "forest";
    let best: BiomeId | "base" = "base";
    let bestCov = 0.4; // must be meaningfully inside a blob to count as "in" it
    for (const b of BIOMES) {
      const c = this.coverageAt(x, y, b.id);
      if (c > bestCov) {
        bestCov = c;
        best = b.id;
      }
    }
    return best;
  }
}
