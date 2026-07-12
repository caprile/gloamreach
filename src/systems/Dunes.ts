import type { Biome } from "./Biome";
import { blendColors } from "./colorUtil";

// Dunes — a PLACEHOLDER outer biome type (biome tier 3), terrain only (no
// content/enemies this phase). Its whole reason to exist right now is to make the
// patchwork VISIBLE: with only forest + badlands the outer world would read as one
// uniform zone, but badlands (dusty red-brown) mixing with dunes (pale sand) shows
// the biome-blob diversity. Real dune content is a later biome phase. Same shape as
// Badlands: a reused Biome instance is reinterpreted forestWeight -> dune ridge,
// grassy -> sand flats, creekWeight -> wind hollow.

// Pale warm sand — the dune base ground (contrasts badlands' dark red-brown).
export const DUNE_SAND = 0xd8c48f;
export const DUNE_RIDGE = 0xc2a870; // raised dune ridges (reused "forest" zone)
export const DUNE_HOLLOW = 0xb39a6a; // wind-scoured hollows (reused "creek")
export const DUNE_RIDGE_ALPHA = 0.55;
export const DUNE_HOLLOW_ALPHA = 0.6;

export function dunesGroundColorAt(worldX: number, worldY: number, featureBiome: Biome): number {
  let color = DUNE_SAND;
  const ridgeW = featureBiome.forestWeight(worldX, worldY);
  if (ridgeW > 0.02) color = blendColors(color, DUNE_RIDGE, DUNE_RIDGE_ALPHA * ridgeW);
  const hollowW = featureBiome.creekWeight(worldX, worldY);
  if (hollowW > 0.02) color = blendColors(color, DUNE_HOLLOW, DUNE_HOLLOW_ALPHA * hollowW);
  return color;
}
