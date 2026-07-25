// Report how much of a PNG is opaque, and whether its four corners are solid.
//
// Exists because a whole batch of "transparent background" ground decals came
// back with a fully OPAQUE canvas, which drew a white square behind every POI.
// Nothing caught it: the art looked correct in an image viewer (which composites
// over white anyway), and `trim.mjs` — which HAD been an accidental opacity
// check, since a transparent margin is what it crops — was deliberately skipped
// for decals because trimming breaks them.
//
// So the check is explicit now, and fetch-raw.sh runs it on every download.
// Four opaque corners on anything that isn't a tile means the background never
// came through; fix it with `adjust.mjs --feather`, don't re-roll and hope.
//
// Usage: node art/tools/check-alpha.mjs <file.png> [...]

import { readFileSync } from "node:fs";
import { inflateSync } from "node:zlib";

function chunks(buf) {
  const out = [];
  let p = 8;
  while (p < buf.length) {
    const len = buf.readUInt32BE(p);
    out.push({ type: buf.toString("ascii", p + 4, p + 8), data: buf.subarray(p + 8, p + 8 + len) });
    p += 12 + len;
  }
  return out;
}

function paeth(a, b, c) {
  const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
}

let bad = 0;
for (const file of process.argv.slice(2)) {
  const buf = readFileSync(file);
  const cs = chunks(buf);
  const ihdr = cs.find((c) => c.type === "IHDR")?.data;
  if (!ihdr) continue;
  const w = ihdr.readUInt32BE(0), h = ihdr.readUInt32BE(4);
  if (ihdr[8] !== 8 || ihdr[9] !== 6) continue; // no alpha channel to check
  const raw = inflateSync(Buffer.concat(cs.filter((c) => c.type === "IDAT").map((c) => c.data)));
  const bpp = 4, stride = w * bpp;
  const px = Buffer.alloc(h * stride);
  for (let y = 0; y < h; y++) {
    const filter = raw[y * (stride + 1)];
    const line = raw.subarray(y * (stride + 1) + 1, y * (stride + 1) + 1 + stride);
    const cur = px.subarray(y * stride, (y + 1) * stride);
    const prev = y > 0 ? px.subarray((y - 1) * stride, y * stride) : null;
    for (let i = 0; i < stride; i++) {
      const a = i >= bpp ? cur[i - bpp] : 0;
      const b = prev ? prev[i] : 0;
      const c = prev && i >= bpp ? prev[i - bpp] : 0;
      const x = line[i];
      cur[i] = filter === 0 ? x : filter === 1 ? (x + a) & 0xff : filter === 2 ? (x + b) & 0xff
        : filter === 3 ? (x + ((a + b) >> 1)) & 0xff : (x + paeth(a, b, c)) & 0xff;
    }
  }
  const at = (x, y) => px[(y * w + x) * 4 + 3];
  const cornersSolid = at(0, 0) > 200 && at(w - 1, 0) > 200 && at(0, h - 1) > 200 && at(w - 1, h - 1) > 200;
  let opaque = 0;
  for (let i = 3; i < px.length; i += 4) if (px[i] > 200) opaque++;
  const name = file.split(/[\\/]/).pop();
  if (cornersSolid) {
    bad++;
    console.warn(`  !! ${name}: ${w}x${h} has NO transparent background (${Math.round((100 * opaque) / (w * h))}% opaque, all 4 corners solid) — expected for a TILE, a bug for anything else`);
  }
}
process.exit(bad ? 1 : 0);
