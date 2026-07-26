// check-seam.mjs <tile.png> ... — score how well a tile actually TILES.
//
// A tile that looks perfect on its own can still show a grid in game: the eye
// picks up a single mismatched edge instantly once it repeats every 32px across
// a whole biome. PixelLab's tiles-pro output is usually seamless but not always,
// and the failure is invisible in a viewer showing one copy — the same class of
// bug as the opaque POI decals (see check-alpha.mjs).
//
// The measure is relative, not absolute: compare how different the wrapping edge
// pair is (row 0 vs row H-1, col 0 vs col W-1) to how different ADJACENT INTERIOR
// rows/cols are. A seamless tile's wrap looks like just another interior step,
// so the ratio sits near 1. A seam makes the wrap several times worse.
//
// Ratios are reported per axis, since a tile can be fine horizontally and seam
// vertically (which is exactly what the first ground batch did).
import { readFileSync } from "node:fs";
import { decode } from "./png.mjs";

const WARN = 2.0; // wrap this many times worse than an interior step = visible

function rowDiff({ width, px }, ya, yb) {
  let sum = 0;
  for (let x = 0; x < width; x++) {
    const a = (ya * width + x) * 4;
    const b = (yb * width + x) * 4;
    sum += Math.abs(px[a] - px[b]) + Math.abs(px[a + 1] - px[b + 1]) + Math.abs(px[a + 2] - px[b + 2]);
  }
  return sum / (width * 3);
}

function colDiff({ width, height, px }, xa, xb) {
  let sum = 0;
  for (let y = 0; y < height; y++) {
    const a = (y * width + xa) * 4;
    const b = (y * width + xb) * 4;
    sum += Math.abs(px[a] - px[b]) + Math.abs(px[a + 1] - px[b + 1]) + Math.abs(px[a + 2] - px[b + 2]);
  }
  return sum / (height * 3);
}

let worst = 0;
for (const file of process.argv.slice(2)) {
  const img = decode(readFileSync(file));
  const { width: w, height: h } = img;

  let interiorRows = 0;
  for (let y = 0; y < h - 1; y++) interiorRows += rowDiff(img, y, y + 1);
  interiorRows /= h - 1;
  let interiorCols = 0;
  for (let x = 0; x < w - 1; x++) interiorCols += colDiff(img, x, x + 1);
  interiorCols /= w - 1;

  // Guard against a perfectly flat tile, where every interior step is ~0 and the
  // ratio would explode on rounding noise.
  const vert = rowDiff(img, 0, h - 1) / Math.max(interiorRows, 0.5);
  const horiz = colDiff(img, 0, w - 1) / Math.max(interiorCols, 0.5);
  const bad = Math.max(vert, horiz);
  worst = Math.max(worst, bad);
  const name = file.split(/[\\/]/).pop();
  const flag = bad >= WARN ? "!!" : "  ";
  console.log(`${flag} ${name.padEnd(30)} vert x${vert.toFixed(2)}  horiz x${horiz.toFixed(2)}`);
}
if (worst >= WARN) {
  console.log(`\n!! a wrap edge >= x${WARN} of an interior step will read as a grid when tiled.`);
}
