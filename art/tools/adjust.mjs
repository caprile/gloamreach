// Darken / desaturate a PNG in place, preserving alpha.
//
// Generated tiles come back at a pleasant standalone brightness, which is the
// wrong target for a DUNGEON FLOOR: the floor is background, and anything that
// has to read against it — enemies, the exit stairs, a dropped item — competes
// with it directly. Toning the floor down is cheaper and far more controllable
// than re-rolling generations until one happens to be dark enough.
//
// Usage: node art/tools/adjust.mjs --mul 0.65 --sat 0.6 <file.png> [...]
//   --mul      brightness multiplier (1 = unchanged)
//   --sat      saturation, 0 = greyscale, 1 = unchanged
//   --feather  radial alpha falloff: solid inside this fraction of the radius,
//              fading to fully transparent at the edge.
//
// --feather exists because a generated "ground stain" came back with a fully
// OPAQUE canvas despite the prompt asking for transparency, which drew a white
// square behind every POI. Asking the model again is a coin flip; computing the
// falloff is deterministic — and a soft edge is what a ground decal wants
// anyway, since a hard-edged blob reads as a decal rather than as ground.

import { readFileSync, writeFileSync } from "node:fs";
import { decode, encode } from "./png.mjs";

const args = process.argv.slice(2);
let mul = 1, sat = 1, feather = 0;
const files = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--mul") mul = parseFloat(args[++i]);
  else if (args[i] === "--sat") sat = parseFloat(args[++i]);
  else if (args[i] === "--feather") feather = parseFloat(args[++i]);
  else files.push(args[i]);
}

for (const file of files) {
  const { width, height, px } = decode(readFileSync(file));
  if (feather > 0) {
    const cx = (width - 1) / 2, cy = (height - 1) / 2;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        // Normalised elliptical distance, so a non-square canvas fades on both
        // axes at once instead of clipping the short one.
        const d = Math.hypot((x - cx) / cx, (y - cy) / cy);
        let a = 1;
        if (d >= 1) a = 0;
        else if (d > feather) {
          const t = (d - feather) / (1 - feather);
          a = 1 - t * t * (3 - 2 * t); // smoothstep — no visible banding ring
        }
        const i = (y * width + x) * 4 + 3;
        px[i] = Math.round(px[i] * a);
      }
    }
  }
  for (let i = 0; i < px.length; i += 4) {
    if (px[i + 3] === 0) continue;
    let r = px[i], g = px[i + 1], b = px[i + 2];
    // Rec. 601 luma — matches how the eye weights the channels, so desaturating
    // toward it doesn't shift perceived brightness the way a flat average does.
    const y = 0.299 * r + 0.587 * g + 0.114 * b;
    r = (y + (r - y) * sat) * mul;
    g = (y + (g - y) * sat) * mul;
    b = (y + (b - y) * sat) * mul;
    px[i] = Math.max(0, Math.min(255, Math.round(r)));
    px[i + 1] = Math.max(0, Math.min(255, Math.round(g)));
    px[i + 2] = Math.max(0, Math.min(255, Math.round(b)));
  }
  writeFileSync(file, encode(width, height, px));
  console.log(`${file}: mul ${mul} sat ${sat}`);
}
