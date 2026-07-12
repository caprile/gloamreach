import type { Biome } from "./Biome";
import { blendColors } from "./colorUtil";

// Sunscorch Badlands (biome 2) palette + ground-color helper. The badlands is
// one biome TYPE in the patchwork world map (see WorldBiomes) — this module owns
// only its look; WHERE it appears (blob coverage) and the base/other biomes are
// composited by WorldBiomes.worldBiomeColorAt. The feature layer (mesa clusters /
// cracked-clay flats / dry ravine) is a reused Biome instance, reinterpreted:
// forestWeight -> mesa, grassy -> flats, creekWeight -> dry ravine.

// Cracked-clay flats: the badlands base ground. Dusty red-brown (muted).
export const BADLANDS_CLAY = 0x8f5a42;
// Mesa-rock clusters (the reused Biome's "forest" zone) — darker red rock.
export const BADLANDS_MESA = 0x703f26;
// Dry ravine (the reused Biome's "creek") — a pale sandy dry riverbed.
export const BADLANDS_RAVINE = 0xc9a866;
export const BADLANDS_MESA_ALPHA = 0.6;
export const BADLANDS_RAVINE_ALPHA = 0.7;

// The badlands' own full ground color at a point (clay flats + mesa + ravine),
// at full strength. The blob-coverage weighting is applied by the compositor.
export function badlandsGroundColorAt(worldX: number, worldY: number, featureBiome: Biome): number {
  let color = BADLANDS_CLAY;
  const mesaW = featureBiome.forestWeight(worldX, worldY);
  if (mesaW > 0.02) color = blendColors(color, BADLANDS_MESA, BADLANDS_MESA_ALPHA * mesaW);
  const ravineW = featureBiome.creekWeight(worldX, worldY);
  if (ravineW > 0.02) color = blendColors(color, BADLANDS_RAVINE, BADLANDS_RAVINE_ALPHA * ravineW);
  return color;
}
