// Resize a PNG by box-averaging (down) or nearest-neighbour (up).
//
// Written for UI chrome, where the source is generated at whatever canvas the
// generator offers and the target is fixed by the game's own layout — a slot
// frame has to fit a 70px slot around a 64px icon, and a panel border has to
// stay inside a 12px content margin. Both are hard numbers the art has to meet,
// not preferences.
//
// Downscaling averages rather than dropping pixels: a rivet one pixel wide
// disappears entirely under nearest-neighbour, which is exactly the detail that
// makes a frame read as metal. Upscaling stays nearest so pixel art stays hard.
//
// Usage: node art/tools/scale.mjs --to 48 <file.png> [...]        # longest side
//        node art/tools/scale.mjs --factor 0.5 <file.png> [...]
//        node art/tools/scale.mjs --to 48 --out other.png <file.png>

import { readFileSync, writeFileSync } from "node:fs";
import { decode, encode } from "./png.mjs";

const args = process.argv.slice(2);
let to = 0, factor = 0, out = null;
const files = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--to") to = parseInt(args[++i], 10);
  else if (args[i] === "--factor") factor = parseFloat(args[++i]);
  else if (args[i] === "--out") out = args[++i];
  else files.push(args[i]);
}

for (const file of files) {
  const { width, height, px } = decode(readFileSync(file));
  const f = factor || (to ? to / Math.max(width, height) : 1);
  const w = Math.max(1, Math.round(width * f));
  const h = Math.max(1, Math.round(height * f));
  const dst = Buffer.alloc(w * h * 4);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const x0 = Math.floor((x * width) / w);
      const x1 = Math.max(x0 + 1, Math.ceil(((x + 1) * width) / w));
      const y0 = Math.floor((y * height) / h);
      const y1 = Math.max(y0 + 1, Math.ceil(((y + 1) * height) / h));
      let r = 0, g = 0, b = 0, a = 0, n = 0;
      for (let sy = y0; sy < y1 && sy < height; sy++) {
        for (let sx = x0; sx < x1 && sx < width; sx++) {
          const i = (sy * width + sx) * 4;
          const al = px[i + 3] / 255;
          // Premultiplied: averaging colour across transparent pixels drags the
          // edge toward whatever RGB happens to sit under alpha 0, which shows
          // up as a halo once the sprite is composited.
          r += px[i] * al;
          g += px[i + 1] * al;
          b += px[i + 2] * al;
          a += al;
          n++;
        }
      }
      const j = (y * w + x) * 4;
      if (a > 0) {
        dst[j] = Math.round(r / a);
        dst[j + 1] = Math.round(g / a);
        dst[j + 2] = Math.round(b / a);
        dst[j + 3] = Math.round((a / n) * 255);
      }
    }
  }
  const target = out ?? file;
  writeFileSync(target, encode(w, h, dst));
  console.log(`${file} ${width}x${height} -> ${target} ${w}x${h}`);
}
