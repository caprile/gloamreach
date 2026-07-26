// Hue-selective recolour of a PNG, preserving alpha and silhouette.
//
// Exists for TIER VARIANTS the generator refuses to draw. Independent
// generation is the house style for a tier ladder (see art/README.md), but it
// only works when the model will actually draw the object: picks and axes are a
// documented known-hard prompt — "axe"/"pick" plus a side view reliably drifts
// into a symmetric horizontal hammer. `icon_stone_pickaxe_t1` shipped as exactly
// that, a horizontal hammer standing in for a diagonal pickaxe (the user: "stone
// pickaxe lvl 2 looks too much like a hammer and it's horizontal in my hotbar").
// Four rerolls all drifted the same way, so the README's own advice applies:
// hand-edit rather than spend five more generations.
//
// Recolouring the BASE icon's head keeps the silhouette that already reads
// correctly and changes only the material, which is what a tier bump is.
//
// Usage:
//   node art/tools/recolor.mjs --from 265 --tol 60 --to 205 --sat 0.45 --lum 1.3 \
//        --in art/sprites/icon_stone_pickaxe.png --out art/sprites/icon_stone_pickaxe_t1.png
//
//   --from  source hue in degrees (0-360) — pixels within --tol of it are hit
//   --tol   hue tolerance in degrees
//   --to    destination hue in degrees
//   --sat   saturation multiplier applied to hit pixels
//   --lum   lightness multiplier applied to hit pixels
//   --min-l skip pixels darker than this lightness (0-1). Outlines are near
//           black and carry the silhouette; recolouring them softens the edge.
//
// Near-greyscale pixels have a meaningless hue, so they're skipped via a
// minimum-saturation floor rather than being dragged to --to along with
// everything else.

import { readFileSync, writeFileSync } from "node:fs";
import { decode, encode } from "./png.mjs";

const args = process.argv.slice(2);
const opt = { from: 0, tol: 30, to: 0, sat: 1, lum: 1, minL: 0.12, in: null, out: null };
for (let i = 0; i < args.length; i++) {
  const k = args[i].replace(/^--/, "");
  const map = { from: "from", tol: "tol", to: "to", sat: "sat", lum: "lum", "min-l": "minL", in: "in", out: "out" };
  const field = map[k];
  if (!field) continue;
  const v = args[++i];
  opt[field] = field === "in" || field === "out" ? v : parseFloat(v);
}
if (!opt.in || !opt.out) {
  console.error("need --in and --out");
  process.exit(1);
}

const MIN_SAT = 0.06; // below this a pixel is grey and its hue is noise

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return [0, 0, l];
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return [h * 360, s, l];
}

function hslToRgb(h, s, l) {
  h = ((h % 360) + 360) % 360 / 360;
  if (s === 0) { const v = Math.round(l * 255); return [v, v, v]; }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const f = (t) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  return [f(h + 1 / 3), f(h), f(h - 1 / 3)].map((v) => Math.max(0, Math.min(255, Math.round(v * 255))));
}

// Shortest angular distance between two hues, in degrees.
const hueDist = (a, b) => { const d = Math.abs(((a - b) % 360 + 360) % 360); return Math.min(d, 360 - d); };

const img = decode(readFileSync(opt.in));
let hit = 0;
for (let i = 0; i < img.px.length; i += 4) {
  if (img.px[i + 3] < 8) continue;
  const [h, s, l] = rgbToHsl(img.px[i], img.px[i + 1], img.px[i + 2]);
  if (s < MIN_SAT || l < opt.minL) continue;
  if (hueDist(h, opt.from) > opt.tol) continue;
  const [r, g, b] = hslToRgb(opt.to, Math.min(1, s * opt.sat), Math.min(1, l * opt.lum));
  img.px[i] = r; img.px[i + 1] = g; img.px[i + 2] = b;
  hit++;
}
writeFileSync(opt.out, encode(img.width, img.height, img.px));
console.log(`${opt.out}: recoloured ${hit} px`);
