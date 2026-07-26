// Turn a generated UI panel into a nine-slice FRAME by clearing its centre.
//
// src/ui/frames.ts draws menu chrome as a border with a transparent middle,
// laid over the flat rectangle each menu already draws. That keeps the
// rectangle's fill, alpha and hit area intact, and — the reason it isn't
// optional — a nine-slice STRETCHES its centre, so a hammered-metal interior
// smeared across a 700x850 panel looks like a rendering bug. Only the border,
// which the slicing preserves, can be art.
//
// Asking the generator for a hollow frame is a coin flip (the same lesson as
// transparent backgrounds — see art/README.md rule 2). Cutting the middle out
// afterwards is deterministic.
//
// Usage:
//   node art/tools/hollow.mjs --report <file.png>
//   node art/tools/hollow.mjs --inset 26 [--fade 3] <file.png> [...]
//
//   --report  measure the art instead of changing it: prints the border depth
//             each edge actually has, which is what --inset should be.
//   --inset   pixels of border to KEEP on every side.
//   --corner  keep an NxN square at each corner untouched. Panel art puts a
//             thicker riveted plate at the corners than along the edges, and a
//             uniform cut slices straight through it. This is also what the
//             nine-slice inset must be set to, since a corner plate that
//             reaches past the slice line gets stretched.
//   --fade    soften the last N px of the cut so the border doesn't end on a
//             hard line against the panel fill showing through.

import { readFileSync, writeFileSync } from "node:fs";
import { decode, encode } from "./png.mjs";

const args = process.argv.slice(2);
let inset = 0, fade = 0, corner = 0, report = false;
const files = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--inset") inset = parseInt(args[++i], 10);
  else if (args[i] === "--corner") corner = parseInt(args[++i], 10);
  else if (args[i] === "--fade") fade = parseInt(args[++i], 10);
  else if (args[i] === "--report") report = true;
  else files.push(args[i]);
}

// How far in from an edge the image stops changing — i.e. where the decorative
// border ends and the flat interior begins. Measured as the first row/column
// whose colours match the one before it closely enough to read as flat fill.
function borderDepth(width, height, px, edge) {
  const at = (x, y) => (y * width + x) * 4;
  const len = edge === "top" || edge === "bottom" ? height : width;
  const across = edge === "top" || edge === "bottom" ? width : height;
  let prev = null;
  for (let d = 0; d < Math.floor(len / 2); d++) {
    let diff = 0;
    const line = [];
    for (let a = 0; a < across; a++) {
      const x = edge === "left" ? d : edge === "right" ? width - 1 - d : a;
      const y = edge === "top" ? d : edge === "bottom" ? height - 1 - d : a;
      const i = at(x, y);
      line.push([px[i], px[i + 1], px[i + 2], px[i + 3]]);
    }
    if (prev) {
      for (let a = 0; a < across; a++) {
        for (let c = 0; c < 4; c++) diff += Math.abs(line[a][c] - prev[a][c]);
      }
      // Normalised per pixel per channel; below this the line is a repeat of
      // the one before it, so the border has stopped.
      if (diff / (across * 4) < 3) return d;
    }
    prev = line;
  }
  return 0;
}

for (const file of files) {
  const { width, height, px } = decode(readFileSync(file));

  if (report) {
    const depths = ["top", "bottom", "left", "right"].map((e) => `${e} ${borderDepth(width, height, px, e)}`);
    console.log(`${file}  ${width}x${height}  border: ${depths.join(", ")}`);
    continue;
  }

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      // Distance INTO the image from the nearest edge.
      const d = Math.min(x, y, width - 1 - x, height - 1 - y);
      if (d < inset - fade) continue;
      if (corner > 0) {
        const cx = Math.min(x, width - 1 - x);
        const cy = Math.min(y, height - 1 - y);
        if (cx < corner && cy < corner) continue; // inside a corner plate
      }
      // 1 at the inner lip of the kept border, 0 once fully inside the cut.
      const a = d >= inset ? 0 : (inset - d) / Math.max(1, fade);
      const i = (y * width + x) * 4 + 3;
      px[i] = Math.round(px[i] * a);
    }
  }
  writeFileSync(file, encode(width, height, px));
  console.log(`hollowed ${file} (inset ${inset}, fade ${fade})`);
}
