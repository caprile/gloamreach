// Dependency-free 90-degree PNG rotation.
//
// Companion to mirror.mjs. Rotating the SOURCE file rotates the icon everywhere
// it appears — hotbar, inventory, crafting list — and the held sprite too, since
// Player.equippedIcon draws the same texture. That is usually what you want: a
// tool's rest angle is a property of the art, not of one render site.
//
// Usage: node art/tools/rotate.mjs [--ccw] <file.png> [...more]
//        default is CLOCKWISE.

import { readFileSync, writeFileSync } from "node:fs";
import { decode, encode } from "./png.mjs";

const args = process.argv.slice(2);
const ccw = args[0] === "--ccw";
const files = ccw ? args.slice(1) : args;

if (files.length === 0) {
  console.error("usage: node art/tools/rotate.mjs [--ccw] <file.png> [...]");
  process.exit(1);
}

for (const file of files) {
  const { width, height, px } = decode(readFileSync(file));
  // A rotation transposes the canvas; square icons come out the same size.
  const nw = height;
  const nh = width;
  const out = Buffer.alloc(px.length);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      // CW:  (x, y) -> (height-1-y, x)      CCW: (x, y) -> (y, width-1-x)
      const dx = ccw ? y : height - 1 - y;
      const dy = ccw ? width - 1 - x : x;
      const src = (y * width + x) * 4;
      const dst = (dy * nw + dx) * 4;
      out[dst] = px[src];
      out[dst + 1] = px[src + 1];
      out[dst + 2] = px[src + 2];
      out[dst + 3] = px[src + 3];
    }
  }
  writeFileSync(file, encode(nw, nh, out));
  console.log(`${file}: rotated ${ccw ? "CCW" : "CW"} -> ${nw}x${nh}`);
}
