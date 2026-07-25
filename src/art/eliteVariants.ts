import Phaser from "phaser";

// Elite creature variants, derived from whatever their base texture actually
// is — placeholder or real art.
//
// BootScene draws each `<name>_elite` by re-running the same `drawX()` helper
// with a crimson/gold palette. That is generation, not derivation: it happens
// during makeTextures(), before applyTextureOverrides() runs, so dropping real
// art in for `boar` leaves `boar_elite` as the old placeholder drawing. Half
// the roster would have shipped mismatched — a photoreal boar next to a
// pixel-blob elite boar.
//
// Rather than authoring 14 more sprites (and hoping each one reads as "the
// same creature, but elite"), the recolour is done here, on the base's own
// pixels, after overrides land. That keeps the property the roster convention
// already claims — every elite is its base silhouette in crimson/gold, so
// "elite" reads identically across all three biomes — and makes it free
// forever: a base that gets real art later brings its elite along with it.
//
// These are the exact stops the hand-written elite palettes use, so a derived
// elite sits beside a still-generated one without a visible seam.
const RAMP: [number, [number, number, number]][] = [
  [0.0, [0x2a, 0x0c, 0x14]], // deepest shadow
  [0.35, [0x3f, 0x10, 0x20]], // dark crimson
  [0.6, [0x6a, 0x1f, 0x2a]], // crimson body
  [0.82, [0xf0, 0xc0, 0x40]], // gold accent
  [1.0, [0xff, 0xe8, 0xa0]], // gold highlight
];

// Creatures whose elite texture isn't just `<base>_elite`. The melee gremling
// is drawn under `gremling_weak` (it is the weaker of the two gremlin types)
// but its elite is `gremling_elite`, so the prefix rule misses it — which is
// silent, since a missing derivation just leaves the old placeholder in place.
const ELITE_KEY: Record<string, string> = {
  gremling_weak: "gremling_elite",
};

/** Rec. 601 luma of pixel `i`, 0..1 — how light the source pixel reads. */
function luma(px: Uint8ClampedArray, i: number): number {
  return (0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2]) / 255;
}

function ramp(l: number): [number, number, number] {
  for (let i = 1; i < RAMP.length; i++) {
    const [hi, hiC] = RAMP[i];
    if (l > hi && i < RAMP.length - 1) continue;
    const [lo, loC] = RAMP[i - 1];
    const t = hi === lo ? 0 : Math.min(1, Math.max(0, (l - lo) / (hi - lo)));
    return [
      Math.round(loC[0] + (hiC[0] - loC[0]) * t),
      Math.round(loC[1] + (hiC[1] - loC[1]) * t),
      Math.round(loC[2] + (hiC[2] - loC[2]) * t),
    ];
  }
  return RAMP[RAMP.length - 1][1];
}

/**
 * Rebuild every `<key>_elite` whose base appears in `bases`, by luminance-
 * ramping the base's pixels into the elite palette.
 *
 * Call from BootScene.create() AFTER applyTextureOverrides(), passing the keys
 * that were actually overridden — a base still on its placeholder already has a
 * hand-drawn elite that matches it, so there is nothing to fix.
 */
export function deriveEliteTextures(scene: Phaser.Scene, bases: string[]): string[] {
  const done: string[] = [];
  const overridden = new Set(bases);
  for (const base of bases) {
    const eliteKey = eliteKeyFor(base);
    if (!scene.textures.exists(eliteKey) || !scene.textures.exists(base)) continue;
    // A hand-authored elite always wins. The recolour is a stand-in for art
    // nobody has drawn — if `<name>_elite.png` exists on disk, overwriting it
    // with a tinted base would silently discard the better asset.
    if (overridden.has(eliteKey)) continue;

    if (!recolourToElite(scene, base, eliteKey)) continue;
    done.push(eliteKey);
  }
  if (done.length) console.info(`[art] ${done.length} elite variant(s) derived from real art.`);
  return done;
}

/**
 * Write `dstKey` as an elite-palette recolour of `srcKey`, replacing any
 * existing texture under that name. Returns false if the source is missing.
 *
 * Works on an animation STRIP as readily as on a still, since a strip is a
 * single image — which is how animated creatures get elite variants for free
 * (see creatureRig.ts).
 */
export function recolourToElite(scene: Phaser.Scene, srcKey: string, dstKey: string): boolean {
  if (!scene.textures.exists(srcKey)) return false;
  const src = scene.textures.get(srcKey).getSourceImage() as HTMLImageElement | HTMLCanvasElement;
  const w = src.width;
  const h = src.height;
  const canvas = scene.textures.createCanvas(`__elitesrc__${dstKey}`, w, h);
  if (!canvas) return false;
  const ctx = canvas.getContext();
  ctx.clearRect(0, 0, w, h);
  ctx.drawImage(src, 0, 0);

  const img = ctx.getImageData(0, 0, w, h);
  const px = img.data;

  // Normalise against the sprite's OWN luminance range before ramping.
  // Straight luma bunches most creatures into one band — a brown boar sits
  // around 0.4 everywhere, so body and tusks both came out dark crimson and
  // nothing reached the gold. Stretching min..max first is what reproduces
  // the hand-drawn intent: darkest mass to deep crimson, brightest details
  // (tusks, claws, eyes) to gold. Measured across the WHOLE image, so every
  // frame of a strip is normalised together and the colour can't shift
  // frame-to-frame.
  let lo = 1;
  let hi = 0;
  for (let i = 0; i < px.length; i += 4) {
    if (px[i + 3] === 0) continue;
    const l = luma(px, i);
    if (l < lo) lo = l;
    if (l > hi) hi = l;
  }
  const span = hi - lo || 1;

  for (let i = 0; i < px.length; i += 4) {
    if (px[i + 3] === 0) continue; // leave transparency exactly as-is
    // Gamma < 1 lifts the mid-tones so the body MASS lands on crimson rather
    // than on the dark shadow stop. Without it a creature's largest, most
    // recognisable area comes out near-black and only a few specular pixels
    // reach the gold — legible, but much darker than the hand-drawn elites it
    // sits beside.
    const l = Math.pow((luma(px, i) - lo) / span, 0.62);
    const [r, g, b] = ramp(l);
    px[i] = r;
    px[i + 1] = g;
    px[i + 2] = b;
  }
  ctx.putImageData(img, 0, 0);
  canvas.refresh();

  scene.textures.remove(dstKey);
  scene.textures.addCanvas(dstKey, canvas.getSourceImage() as HTMLCanvasElement);
  return true;
}

/** The elite texture key for a base creature key (see ELITE_KEY for the odd one). */
export function eliteKeyFor(base: string): string {
  return ELITE_KEY[base] ?? `${base}_elite`;
}
