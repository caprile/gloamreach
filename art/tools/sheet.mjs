// Compose PNG frames into a horizontal strip, or a scaled contact sheet.
//
// The game loads player animations as one strip per (character, animation,
// direction) — see src/art/playerRig.ts. Frame width is derived from the strip
// width and the frame count baked into the filename, so a strip carries its own
// metadata and there is no manifest to drift.
//
// Usage:
//   node art/tools/sheet.mjs --strip out.png frame0.png frame1.png ...
//   node art/tools/sheet.mjs --preview out.png --scale 6 a.png b.png ...
//
// --preview lays the inputs out left-to-right on a magenta backdrop and
// nearest-neighbour upscales, purely so a 48px sprite is legible when read back
// as an image. Never ship a preview.

import { readFileSync, writeFileSync } from "node:fs";
import { decode, encode, blit, upscale } from "./png.mjs";

const args = process.argv.slice(2);
const mode = args[0];
if (mode !== "--strip" && mode !== "--preview") {
  console.error("usage: sheet.mjs --strip|--preview <out.png> [--scale N] <frames...>");
  process.exit(1);
}
const out = args[1];
let rest = args.slice(2);
let scale = 1;
if (rest[0] === "--scale") {
  scale = Number(rest[1]);
  rest = rest.slice(2);
}
if (!rest.length) {
  console.error("no input frames");
  process.exit(1);
}

const frames = rest.map((f) => decode(readFileSync(f)));
const w = Math.max(...frames.map((f) => f.width));
const h = Math.max(...frames.map((f) => f.height));
if (mode === "--strip" && frames.some((f) => f.width !== w || f.height !== h)) {
  // A strip slices on a fixed grid, so a ragged frame would shear the whole
  // animation rather than fail loudly.
  console.error("frames differ in size — a strip needs a uniform canvas");
  process.exit(1);
}

const gap = mode === "--preview" ? 2 : 0;
const sheet = {
  width: frames.length * w + (frames.length - 1) * gap,
  height: h,
  px: Buffer.alloc((frames.length * w + (frames.length - 1) * gap) * h * 4),
};
frames.forEach((f, i) => blit(f, sheet, i * (w + gap), Math.floor((h - f.height) / 2)));
if (mode === "--preview") {
  // Flood the still-transparent pixels afterwards, not before — blit copies
  // alpha verbatim, so a backdrop painted first would be erased by the frame's
  // own transparent margin.
  for (let i = 0; i < sheet.px.length; i += 4) {
    if (sheet.px[i + 3] !== 0) continue;
    sheet.px[i] = 0xff;
    sheet.px[i + 2] = 0xff;
    sheet.px[i + 3] = 0xff;
  }
}

const final = scale > 1 ? upscale(sheet, scale) : sheet;
writeFileSync(out, encode(final.width, final.height, final.px));
console.log(`${out}: ${frames.length} frame(s) @ ${w}x${h} -> ${final.width}x${final.height}`);
