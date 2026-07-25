// Dependency-free PNG alpha-trim.
//
// PixelLab generates on a fixed square-ish canvas, so a wide-and-short prop
// (a fallen log, a branch) comes back padded with transparent rows. Those rows
// are not free: a sprite's origin is its centre, so asymmetric padding shifts
// the prop off its own anchor point, and the hover-highlight outline traces the
// canvas rather than the art. Trimming to the alpha bounding box makes the PNG
// the shape of the thing it draws.
//
// Usage: node art/tools/trim.mjs <file.png> [...more]
//        node art/tools/trim.mjs --report <file.png>   (measure only)

import { readFileSync, writeFileSync } from "node:fs";
import { decode, encode, bounds } from "./png.mjs";

const args = process.argv.slice(2);
const reportOnly = args[0] === "--report";
const files = reportOnly ? args.slice(1) : args;

for (const file of files) {
  const { width, height, px } = decode(readFileSync(file));
  const b = bounds(width, height, px);
  if (!b) {
    console.log(`${file}: FULLY TRANSPARENT`);
    continue;
  }
  const w = b.x1 - b.x0 + 1, h = b.y1 - b.y0 + 1;
  if (reportOnly || (w === width && h === height)) {
    console.log(`${file}: ${width}x${height} -> content ${w}x${h}${reportOnly ? "" : " (no trim needed)"}`);
    continue;
  }
  const out = Buffer.alloc(w * h * 4);
  for (let y = 0; y < h; y++)
    px.copy(out, y * w * 4, ((y + b.y0) * width + b.x0) * 4, ((y + b.y0) * width + b.x1 + 1) * 4);
  writeFileSync(file, encode(w, h, out));
  console.log(`${file}: ${width}x${height} -> ${w}x${h}`);
}
