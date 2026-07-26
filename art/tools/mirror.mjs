// Dependency-free horizontal PNG mirror.
//
// Why this exists: an icon's art angle is load-bearing, not just cosmetic. A
// held item is drawn at a fixed tilt from Player.HAND_OFFSET, so the angle you
// SEE is the art's own lean plus that tilt. The stone pickaxe is drawn leaning
// -70.5 degrees and held at +30, which lands on a natural-looking -40.5 — but
// with its head pointing backwards. Mirroring it at RENDER time (setFlipX) fixed
// the head and broke the pose, because the lean flips sign and then ADDS to the
// tilt (+100.5, i.e. standing straight up).
//
// Mirroring the source file instead fixes both, and fixes the icon everywhere it
// appears — hotbar, inventory, crafting list — rather than only in the hand.
// Pair it with the item's `heldTiltMirrored` flag (Items.ts) so the held tilt
// flips sign too and the pose comes back to +40.5.
//
// Usage: node art/tools/mirror.mjs <file.png> [...more]

import { readFileSync, writeFileSync } from "node:fs";
import { decode, encode } from "./png.mjs";

const files = process.argv.slice(2);
if (files.length === 0) {
  console.error("usage: node art/tools/mirror.mjs <file.png> [...]");
  process.exit(1);
}

for (const file of files) {
  const { width, height, px } = decode(readFileSync(file));
  const out = Buffer.alloc(px.length);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const src = (y * width + x) * 4;
      const dst = (y * width + (width - 1 - x)) * 4;
      out[dst] = px[src];
      out[dst + 1] = px[src + 1];
      out[dst + 2] = px[src + 2];
      out[dst + 3] = px[src + 3];
    }
  }
  writeFileSync(file, encode(width, height, out));
  console.log(`${file}: mirrored ${width}x${height}`);
}
