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
import { inflateSync, deflateSync } from "node:zlib";

const SIG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function crc32(buf) {
  let c, table = crc32.table;
  if (!table) {
    table = crc32.table = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
      c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      table[n] = c;
    }
  }
  let crc = -1;
  for (let i = 0; i < buf.length; i++) crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xff];
  return (crc ^ -1) >>> 0;
}

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

function makeChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function paeth(a, b, c) {
  const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
}

function decode(buf) {
  const cs = chunks(buf);
  const ihdr = cs.find((c) => c.type === "IHDR").data;
  const width = ihdr.readUInt32BE(0), height = ihdr.readUInt32BE(4);
  if (ihdr[8] !== 8 || ihdr[9] !== 6 || ihdr[12] !== 0) throw new Error("unsupported PNG");
  const raw = inflateSync(Buffer.concat(cs.filter((c) => c.type === "IDAT").map((c) => c.data)));
  const bpp = 4, stride = width * bpp;
  const px = Buffer.alloc(height * stride);
  for (let y = 0; y < height; y++) {
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
  return { width, height, px };
}

function encode(width, height, px) {
  const stride = width * 4;
  const raw = Buffer.alloc(height * (stride + 1));
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0;
    px.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([SIG, makeChunk("IHDR", ihdr), makeChunk("IDAT", deflateSync(raw, { level: 9 })), makeChunk("IEND", Buffer.alloc(0))]);
}

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
