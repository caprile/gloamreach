// Dependency-free flat-background removal (colour key).
//
// Why this exists: PixelLab is asked for a transparent background and mostly
// obliges, but every batch has a few that come back on a solid fill instead —
// the POI decals did it last pass, an attack-FX crescent did it this one. It is
// invisible in a viewer (which composites over white or grey anyway) and only
// shows up in game, as a rectangle of flat colour behind the sprite.
// check-alpha.mjs catches it; this fixes it.
//
// --feather in adjust.mjs is the wrong repair here: it fades alpha with RADIUS,
// which is right for a round ground stain and wrong for anything whose shape
// isn't a disc — a crescent's own body sits at large radius and would be eaten.
// This keys on COLOUR instead, so the art's own silhouette is what survives.
//
// The key colour is sampled from the four corners (the background is by
// definition what's in them), and removal is a FLOOD FILL inward from those
// corners rather than a global match. That distinction is load-bearing: a first
// pass keyed globally and dissolved the crescent's own dark stone bands, which
// happened to sit within tolerance of the grey fill. Only pixels the background
// can actually reach are background.
//
// Usage: node art/tools/dekey.mjs [--tol 40] <file.png> [...more]

import { readFileSync, writeFileSync } from "node:fs";
import { decode, encode } from "./png.mjs";

const args = process.argv.slice(2);
let tol = 40;
const files = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--tol") tol = Number(args[++i]);
  else files.push(args[i]);
}

if (!files.length) {
  console.error("usage: node art/tools/dekey.mjs [--tol 40] <file.png> [...]");
  process.exit(1);
}

function at(px, width, x, y) {
  const i = (y * width + x) * 4;
  return [px[i], px[i + 1], px[i + 2]];
}

for (const file of files) {
  const { width, height, px } = decode(readFileSync(file));

  // The background is whatever is in the corners. Average them so a little
  // dithering in the fill doesn't skew the key.
  const corners = [
    at(px, width, 0, 0),
    at(px, width, width - 1, 0),
    at(px, width, 0, height - 1),
    at(px, width, width - 1, height - 1),
  ];
  const key = [0, 1, 2].map((c) => Math.round(corners.reduce((s, k) => s + k[c], 0) / corners.length));

  const shoulder = tol * 1.5; // narrow: the art's darkest band can sit close to a grey key
  const dist = (i) => Math.hypot(px[i] - key[0], px[i + 1] - key[1], px[i + 2] - key[2]);

  // Flood fill inward from every edge pixel that matches the key.
  const seen = new Uint8Array(width * height);
  const stack = [];
  const push = (x, y) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const p = y * width + x;
    if (seen[p]) return;
    seen[p] = 1;
    stack.push(p);
  };
  for (let x = 0; x < width; x++) {
    push(x, 0);
    push(x, height - 1);
  }
  for (let y = 0; y < height; y++) {
    push(0, y);
    push(width - 1, y);
  }

  let cleared = 0;
  while (stack.length) {
    const p = stack.pop();
    const i = p * 4;
    const d = dist(i);
    if (d > shoulder) continue; // real art — stop the fill here
    if (d <= tol) {
      px[i + 3] = 0;
      cleared++;
    } else {
      // Soft shoulder: the art's antialiased rim blends toward the key colour,
      // so a hard threshold leaves a halo of background-tinted pixels. These
      // still spread the fill, since the halo is one pixel of background too.
      px[i + 3] = Math.min(px[i + 3], Math.round(255 * ((d - tol) / (shoulder - tol))));
    }
    const x = p % width;
    const y = (p - x) / width;
    push(x - 1, y);
    push(x + 1, y);
    push(x, y - 1);
    push(x, y + 1);
  }

  writeFileSync(file, encode(width, height, px));
  const pct = ((cleared / (width * height)) * 100).toFixed(1);
  console.log(`${file}: keyed rgb(${key.join(",")}) tol ${tol} -> ${pct}% transparent`);
}
