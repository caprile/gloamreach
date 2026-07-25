import Phaser from "phaser";

// Art variants — a second (third, fourth...) look for the same thing.
//
// A world built from exactly one tree texture reads as wallpaper no matter how
// cleverly the positions are scattered, because the eye locks onto the repeated
// silhouette rather than the layout. `scatterDecorClustered` already fixed the
// *spacing*; this fixes the *shapes*.
//
// The workflow is deliberately identical to the override layer's: dropping
// `art/sprites/tree_v2.png` into the repo is the ENTIRE change needed to add a
// second tree. There is nothing to register and no spawn site to edit — every
// caller resolves its texture through here, so new art is picked up the moment
// the file exists.
const SUFFIX = /_v\d+$/;
const MAX_VARIANTS = 9;

// Texture lookups are cheap but this runs per spawned object across thousands
// of props, and the answer can't change after BootScene.
const cache = new Map<string, string[]>();

/** `true` for keys like `tree_v2` — an intentional new variant, not a typo. */
export function isVariantKey(key: string): boolean {
  return SUFFIX.test(key);
}

/** Every texture that can stand in for `base`, starting with `base` itself. */
export function textureVariants(scene: Phaser.Scene, base: string): string[] {
  const hit = cache.get(base);
  if (hit) return hit;

  const found = [base];
  for (let i = 2; i <= MAX_VARIANTS; i++) {
    const key = `${base}_v${i}`;
    if (scene.textures.exists(key)) found.push(key);
  }
  cache.set(base, found);
  return found;
}

/**
 * Pick a variant of `base` for a prop at (x, y).
 *
 * Chosen from the position rather than an RNG so the same world always looks
 * the same: variant choice never has to be threaded through the spawn samplers,
 * and it can't drift between a reload and the run that produced it. The mix is
 * position-hashed rather than sequential so neighbouring props don't alternate
 * in a visible stripe.
 */
export function variantAt(scene: Phaser.Scene, base: string, x: number, y: number): string {
  const options = textureVariants(scene, base);
  if (options.length === 1) return base;

  // Cheap integer hash — the exact mix matters far less than it not correlating
  // with either axis, which a plain (x + y) would.
  let h = (Math.round(x) * 73856093) ^ (Math.round(y) * 19349663);
  h = (h ^ (h >>> 13)) >>> 0;
  return options[h % options.length];
}

/** Reset between runs — textures are rebuilt when the scene restarts. */
export function clearVariantCache(): void {
  cache.clear();
}
