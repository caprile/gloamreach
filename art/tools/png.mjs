// Dependency-free PNG codec shared by the art tools.
//
// Extracted from trim.mjs once a third tool (sheet.mjs) needed it — two
// hand-copied codecs were already one too many. Handles only the 8-bit
// truecolour-alpha, non-interlaced case, which is everything PixelLab emits and
// everything these tools write back.

import { inflateSync, deflateSync } from "node:zlib";

const SIG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function crc32(buf) {
  let c,
    table = crc32.table;
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
    const type = buf.toString("ascii", p + 4, p + 8);
    out.push({ type, data: buf.subarray(p + 8, p + 8 + len) });
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
  const p = a + b - c,
    pa = Math.abs(p - a),
    pb = Math.abs(p - b),
    pc = Math.abs(p - c);
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
}

/** Decode to a flat RGBA8 buffer. */
export function decode(buf) {
  if (!buf.subarray(0, 8).equals(SIG)) throw new Error("not a PNG");
  const cs = chunks(buf);
  const ihdr = cs.find((c) => c.type === "IHDR").data;
  const width = ihdr.readUInt32BE(0),
    height = ihdr.readUInt32BE(4);
  const depth = ihdr[8],
    colorType = ihdr[9],
    interlace = ihdr[12];
  if (depth !== 8 || colorType !== 6 || interlace !== 0)
    throw new Error(`unsupported PNG (depth ${depth}, colorType ${colorType}, interlace ${interlace})`);

  const raw = inflateSync(Buffer.concat(cs.filter((c) => c.type === "IDAT").map((c) => c.data)));
  const bpp = 4,
    stride = width * bpp;
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
      cur[i] =
        filter === 0
          ? x
          : filter === 1
            ? (x + a) & 0xff
            : filter === 2
              ? (x + b) & 0xff
              : filter === 3
                ? (x + ((a + b) >> 1)) & 0xff
                : (x + paeth(a, b, c)) & 0xff;
    }
  }
  return { width, height, px };
}

/** Re-encode RGBA8 with filter 0 — output is tiny at these canvas sizes. */
export function encode(width, height, px) {
  const stride = width * 4;
  const raw = Buffer.alloc(height * (stride + 1));
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0;
    px.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  return Buffer.concat([
    SIG,
    makeChunk("IHDR", ihdr),
    makeChunk("IDAT", deflateSync(raw, { level: 9 })),
    makeChunk("IEND", Buffer.alloc(0)),
  ]);
}

/** Alpha bounding box, or null when the image is fully transparent. */
export function bounds(width, height, px) {
  let x0 = width,
    y0 = height,
    x1 = -1,
    y1 = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (px[(y * width + x) * 4 + 3] === 0) continue;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
  }
  return x1 < 0 ? null : { x0, y0, x1, y1 };
}

/** Copy a w x h region of `src` into `dst` at (dx, dy). */
export function blit(src, dst, dx, dy) {
  for (let y = 0; y < src.height; y++) {
    const to = ((dy + y) * dst.width + dx) * 4;
    src.px.copy(dst.px, to, y * src.width * 4, (y + 1) * src.width * 4);
  }
}

/** Nearest-neighbour integer upscale — for human-readable previews only. */
export function upscale({ width, height, px }, n) {
  const w = width * n,
    h = height * n;
  const out = Buffer.alloc(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const s = (Math.floor(y / n) * width + Math.floor(x / n)) * 4;
      px.copy(out, (y * w + x) * 4, s, s + 4);
    }
  }
  return { width: w, height: h, px: out };
}
