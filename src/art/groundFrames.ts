import Phaser from "phaser";
import { GROUND_CELL, GROUND_TILE_PX, groundTextureKeys } from "../systems/ground";

/** Frame name for the quadrant at (qx, qy) of a ground tile. */
export function groundQuadFrame(qx: number, qy: number): string {
  return `q${qy * 2 + qx}`;
}

/**
 * Split every ground tile into GROUND_CELL-sized quadrant frames.
 *
 * The ground detail layer stamps on a finer grid than the art is authored at, so
 * that material boundaries can follow a curve instead of stepping in 32px
 * blocks. Rather than shrink the art (which would put the ground at half the
 * pixel resolution of everything else on screen), each cell draws the quadrant
 * it would have occupied inside a whole tile — so four cells of one material
 * reassemble that tile exactly and only boundaries gain resolution.
 *
 * Must run AFTER applyTextureOverrides: a real-art PNG replaces the whole
 * Texture object, which would discard frames added to the placeholder.
 */
export function registerGroundTileFrames(scene: Phaser.Scene): void {
  const per = Math.max(1, Math.round(GROUND_TILE_PX / GROUND_CELL));
  for (const key of groundTextureKeys()) {
    if (!scene.textures.exists(key)) continue;
    const tex = scene.textures.get(key);
    const src = tex.getSourceImage();
    // Derive the quadrant size from the ACTUAL texture: an override is expected
    // to be 32x32, but a mis-sized one should carve up cleanly rather than
    // sample past the edge and stamp transparent gaps across a whole biome.
    const qw = Math.floor(src.width / per);
    const qh = Math.floor(src.height / per);
    if (qw <= 0 || qh <= 0) continue;
    for (let qy = 0; qy < per; qy++) {
      for (let qx = 0; qx < per; qx++) {
        tex.add(groundQuadFrame(qx, qy), 0, qx * qw, qy * qh, qw, qh);
      }
    }
  }
}
