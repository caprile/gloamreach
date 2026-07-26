// seamless.mjs <tile.png> [--radius N] — make a tile's wrap edges match.
//
// tiles-pro returns 16 candidates and only some of them wrap cleanly (see
// check-seam.mjs). Re-rolling until the best-LOOKING tile also happens to wrap
// wastes generations and usually loses the tile you wanted, so instead the wrap
// is repaired directly.
//
// The repair is deliberately low-frequency: measure the difference between the
// two edge lines, split it in half, and fade that correction inward over a few
// pixels. Nothing is resampled or blurred, so the texture's own detail is
// untouched — only a gentle brightness/hue drift is removed, which is what a
// seam actually is. The two edge lines end up identical, which reads as nothing
// at all on ground grain (and is how most hand-authored tiles do it anyway).
//
// Run check-seam.mjs afterwards; a repaired tile should land near x1.
import { readFileSync, writeFileSync } from "node:fs";
import { decode, encode } from "./png.mjs";

const args = process.argv.slice(2);
const files = args.filter((a) => !a.startsWith("--"));
const ri = args.indexOf("--radius");
const R = ri >= 0 ? Number(args[ri + 1]) : 6;

// Correction weight at distance d from the edge: full at the edge, 0 by R.
const ramp = (d) => Math.max(0, 1 - d / R);

for (const file of files) {
  const { width: w, height: h, px } = decode(readFileSync(file));
  const at = (x, y) => (y * w + x) * 4;

  // Vertical wrap (top row must meet bottom row).
  for (let x = 0; x < w; x++) {
    for (let c = 0; c < 3; c++) {
      const d = (px[at(x, h - 1) + c] - px[at(x, 0) + c]) / 2;
      for (let y = 0; y < R && y < h / 2; y++) {
        px[at(x, y) + c] = clamp(px[at(x, y) + c] + d * ramp(y));
        px[at(x, h - 1 - y) + c] = clamp(px[at(x, h - 1 - y) + c] - d * ramp(y));
      }
    }
  }
  // Horizontal wrap (left col must meet right col). Runs after the vertical
  // pass so the corners inherit both corrections.
  for (let y = 0; y < h; y++) {
    for (let c = 0; c < 3; c++) {
      const d = (px[at(w - 1, y) + c] - px[at(0, y) + c]) / 2;
      for (let x = 0; x < R && x < w / 2; x++) {
        px[at(x, y) + c] = clamp(px[at(x, y) + c] + d * ramp(x));
        px[at(w - 1 - x, y) + c] = clamp(px[at(w - 1 - x, y) + c] - d * ramp(x));
      }
    }
  }
  writeFileSync(file, encode(w, h, px));
  console.log(`sealed ${file.split(/[\\/]/).pop()} (radius ${R})`);
}

function clamp(v) {
  return Math.max(0, Math.min(255, Math.round(v)));
}
