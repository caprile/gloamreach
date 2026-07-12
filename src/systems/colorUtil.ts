// Tiny shared color helpers for terrain compositing (biome palettes + map).
// Framework-free — plain integer 0xRRGGBB math.

// Blend `overlay` over `base` by `alpha` (0 = base, 1 = overlay).
export function blendColors(base: number, overlay: number, alpha: number): number {
  const a = alpha < 0 ? 0 : alpha > 1 ? 1 : alpha;
  const br = (base >> 16) & 0xff;
  const bg = (base >> 8) & 0xff;
  const bb = base & 0xff;
  const or_ = (overlay >> 16) & 0xff;
  const og = (overlay >> 8) & 0xff;
  const ob = overlay & 0xff;
  const r = Math.round(br * (1 - a) + or_ * a);
  const g = Math.round(bg * (1 - a) + og * a);
  const b = Math.round(bb * (1 - a) + ob * a);
  return (r << 16) | (g << 8) | b;
}

// Deterministic integer-lattice hash -> 0..1. No RNG object, so it's safe to call
// per-pixel in the terrain bake AND per-cell on the map (they must agree).
function hash2(ix: number, iy: number): number {
  let h = (ix * 374761393 + iy * 668265263) | 0;
  h = (Math.imul(h ^ (h >>> 13), 1274126177)) | 0;
  h ^= h >>> 16;
  return (h >>> 0) / 4294967295;
}

// Smooth value noise at `x,y`, one lattice cell = `scale` world px. Returns 0..1.
// Cheap (4 hashes + smoothstep bilerp) — used to mottle otherwise-flat terrain
// color so a placeholder biome reads as varied ground rather than a solid fill.
export function valueNoise2D(x: number, y: number, scale: number): number {
  const gx = x / scale;
  const gy = y / scale;
  const ix = Math.floor(gx);
  const iy = Math.floor(gy);
  const fx = gx - ix;
  const fy = gy - iy;
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);
  const a = hash2(ix, iy);
  const b = hash2(ix + 1, iy);
  const c = hash2(ix, iy + 1);
  const d = hash2(ix + 1, iy + 1);
  const top = a + (b - a) * sx;
  const bot = c + (d - c) * sx;
  return top + (bot - top) * sy;
}

// Generic per-point brightness mottle — a cheap way to make an otherwise flat
// placeholder ground color read as "textured" (small light/dark variation)
// without needing a bespoke palette per biome. Two octaves (a broad patch +
// a finer grain) so it survives a coarse/stretched bake instead of aliasing
// away. `strength` ~0.08-0.16 is a subtle speckle; real tilesets replace this
// pass entirely once pixel-art assets exist (see CLAUDE.md's art-asset note).
export function mottleColor(color: number, x: number, y: number, strength: number): number {
  const broad = valueNoise2D(x, y, 150);
  const fine = valueNoise2D(x + 500, y - 500, 55);
  const n = broad * 0.65 + fine * 0.35 - 0.5; // -0.5..0.5
  const factor = 1 + n * strength * 2;
  const r = Math.min(255, Math.max(0, Math.round(((color >> 16) & 0xff) * factor)));
  const g = Math.min(255, Math.max(0, Math.round(((color >> 8) & 0xff) * factor)));
  const b = Math.min(255, Math.max(0, Math.round((color & 0xff) * factor)));
  return (r << 16) | (g << 8) | b;
}
