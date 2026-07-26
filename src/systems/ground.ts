// Ground MATERIALS — the texture counterpart to WorldBiomes' colour field.
//
// The world's ground has always been a per-pixel COLOUR field: worldBiomeColorAt
// composites base + biome blobs + features into one number, baked into a coarse
// stretched overlay outside the forest and a crisp RenderTexture inside it. That
// gives correct, smoothly-blended biome colour at any world size, but it can
// never carry pixel-art DETAIL: the outer overlay is 4096 texels stretched over
// 28000px, so one texel is ~7 world px.
//
// So detail is a separate, bounded layer (GroundDetailUI): a chunk of real 32px
// tiles stamped around the player at 1:1 world scale, drawn semi-transparently
// OVER the colour field. The colour still decides what the ground *is*; the
// tiles only give it grain. That keeps every existing biome boundary, POI floor
// stamp and map colour exactly as it was — this layer is additive.
//
// This module owns the vocabulary both halves share: which material covers a
// point, and which texture keys represent it. Deliberately Phaser-free (the
// balancing dashboard imports across src/systems).

export type GroundMaterial =
  | "grass"
  | "forest_floor"
  | "creek"
  | "clay"
  | "sand"
  | "rock"
  | "muck"
  | "swamp_water"
  | "peat"
  | "silt";

// How many hand-picked variants each material has. Variants exist to kill the
// repeated-silhouette problem: a single 32px tile repeated over thousands of
// pixels reads as a grid however good the tile is, and the eye locks onto it
// (the same reason src/art/variants.ts exists for props). The stamper picks one
// per cell by hashing the cell's world position, so the choice is stable across
// reloads without threading an RNG through anything.
export const GROUND_VARIANTS: Record<GroundMaterial, number> = {
  grass: 3,
  forest_floor: 3,
  creek: 3,
  clay: 3,
  sand: 3,
  rock: 2,
  muck: 3,
  swamp_water: 3,
  peat: 3,
  silt: 2,
};

// Per-material opacity over the colour field. Most sit around half so the biome
// colour still leads and the tile only supplies grain — which is also what lets
// one clay tile serve the whole badlands palette, from ochre patches to rust
// lows, without looking pasted on. Water is stronger: the bayou channels carry a
// real movement penalty, so they must read unmistakably as water (the same
// reason bayouGroundColorAt draws water last at 0.85).
export const GROUND_ALPHA: Record<GroundMaterial, number> = {
  grass: 0.5,
  forest_floor: 0.55,
  creek: 0.72,
  clay: 0.5,
  sand: 0.45,
  rock: 0.55,
  muck: 0.5,
  swamp_water: 0.62,
  peat: 0.55,
  silt: 0.45,
};

// Placeholder tint per material, for the generated fallback tiles in BootScene.
// Pulled from each biome's own palette so the game still reads correctly with no
// art on disk at all (real art stays a per-asset, reversible override).
export const GROUND_PLACEHOLDER_COLOR: Record<GroundMaterial, number> = {
  grass: 0x4a7a3a,
  forest_floor: 0x2f4423,
  creek: 0x6d7f88,
  clay: 0x966a45,
  sand: 0xcbb488,
  rock: 0x5f3826,
  muck: 0x3c4a3a,
  swamp_water: 0x2d2a52,
  peat: 0x232d24,
  silt: 0x6b6a4e,
};

export const GROUND_MATERIALS = Object.keys(GROUND_VARIANTS) as GroundMaterial[];

/** Texture key for one variant of a material — `ground_grass_0`, etc. */
export function groundTextureKey(m: GroundMaterial, variant: number): string {
  return `ground_${m}_${variant}`;
}

/** Every ground texture key, in a stable order (BootScene + overrides). */
export function groundTextureKeys(): string[] {
  const keys: string[] = [];
  for (const m of GROUND_MATERIALS) {
    for (let v = 0; v < GROUND_VARIANTS[m]; v++) keys.push(groundTextureKey(m, v));
  }
  return keys;
}

// The art is authored at 32px, but the layer stamps QUADRANTS of it on a 16px
// grid (see GroundDetailUI / registerGroundTileFrames). The user asked for finer,
// curvier material boundaries, and the naive way to get them — smaller tiles —
// would halve the ground's pixel resolution against every other sprite in the
// game. Instead only the material DECISION gets finer: a cell keeps the quadrant
// and variant its 32px block would have used, so four cells of the same material
// reassemble the original tile pixel-for-pixel and the interior is unchanged.
// Only where materials actually meet does the extra resolution show up, which is
// exactly where it was wanted.
export const GROUND_TILE_PX = 32;
export const GROUND_CELL = 16;

// Cheap deterministic hash of a cell coordinate -> [0, 1). Used for both the
// variant pick and the boundary jitter, with different salts.
export function cellHash(cx: number, cy: number, salt: number): number {
  let h = (cx * 374761393 + cy * 668265263 + salt * 2246822519) | 0;
  h = (h ^ (h >>> 13)) * 1274126177;
  h = h ^ (h >>> 16);
  return ((h >>> 0) % 100000) / 100000;
}

/** Which variant of `m` this cell uses. */
export function variantForCell(m: GroundMaterial, cx: number, cy: number): number {
  return Math.floor(cellHash(cx, cy, 7) * GROUND_VARIANTS[m]) % GROUND_VARIANTS[m];
}
