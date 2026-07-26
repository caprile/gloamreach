// Split a generated UI KIT sheet into its individual elements.
//
// create_ui_asset's `elements` option returns several matched pieces — a slot,
// a button, a tab — laid out on one canvas, which is the cheapest way to get a
// consistent set (one job instead of three, and the style can't drift between
// them). They arrive as separate islands of opaque pixels on transparency, so
// they can be separated by flood fill rather than by eyeballing coordinates.
//
// Usage: node art/tools/split.mjs <sheet.png> [outPrefix]
//   -> <outPrefix>_1.png, _2.png, ... in reading order, bbox printed for each.
//
// Islands smaller than MIN_PX are ignored: generations often leave a few stray
// specks of shadow outside the pieces themselves.

import { readFileSync, writeFileSync } from "node:fs";
import { decode, encode } from "./png.mjs";

const [file, prefixArg] = process.argv.slice(2);
if (!file) {
  console.error("usage: node art/tools/split.mjs <sheet.png> [outPrefix]");
  process.exit(1);
}
const prefix = prefixArg ?? file.replace(/\.png$/i, "");

const MIN_PX = 400; // ~20x20 of solid pixels
const { width, height, px } = decode(readFileSync(file));
const alphaAt = (x, y) => px[(y * width + x) * 4 + 3];

const seen = new Uint8Array(width * height);
const islands = [];

for (let y0 = 0; y0 < height; y0++) {
  for (let x0 = 0; x0 < width; x0++) {
    const start = y0 * width + x0;
    if (seen[start] || alphaAt(x0, y0) <= 8) continue;

    // Iterative flood fill — a sheet island is tens of thousands of pixels, so
    // recursion would blow the stack.
    const stack = [start];
    seen[start] = 1;
    let minX = x0, maxX = x0, minY = y0, maxY = y0, count = 0;
    while (stack.length) {
      const i = stack.pop();
      const x = i % width;
      const y = (i / width) | 0;
      count++;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
      // 8-connected: a 1px diagonal join is still one piece, and antialiased
      // generation edges routinely leave those.
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
          const ni = ny * width + nx;
          if (seen[ni] || alphaAt(nx, ny) <= 8) continue;
          seen[ni] = 1;
          stack.push(ni);
        }
      }
    }
    if (count >= MIN_PX) islands.push({ minX, minY, maxX, maxY, count });
  }
}

// Reading order, so the numbering matches how the sheet looks.
islands.sort((a, b) => (Math.abs(a.minY - b.minY) > 24 ? a.minY - b.minY : a.minX - b.minX));

islands.forEach((isl, n) => {
  const w = isl.maxX - isl.minX + 1;
  const h = isl.maxY - isl.minY + 1;
  const out = Buffer.alloc(w * h * 4); // encode() writes through Buffer.copy
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const src = ((y + isl.minY) * width + (x + isl.minX)) * 4;
      const dst = (y * w + x) * 4;
      for (let c = 0; c < 4; c++) out[dst + c] = px[src + c];
    }
  }
  const name = `${prefix}_${n + 1}.png`;
  writeFileSync(name, encode(w, h, out));
  console.log(`${name}  ${w}x${h}  at ${isl.minX},${isl.minY}`);
});
