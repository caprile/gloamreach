import type { Biome } from "./Biome";
import { blendColors, valueNoise2D } from "./colorUtil";

// Sunscorch Badlands (biome 2) palette + ground-color helper. The badlands is
// one biome TYPE in the patchwork world map (see WorldBiomes) — this module owns
// only its look; WHERE it appears (blob coverage) and the base/other biomes are
// composited by WorldBiomes.worldBiomeColorAt. The feature layer (mesa clusters /
// cracked-clay flats / dry ravine) is a reused Biome instance, reinterpreted:
// forestWeight -> mesa, grassy -> flats, creekWeight -> dry ravine.
//
// The ground is MOTTLED with value noise across a small warm-earth palette rather
// than a flat clay fill — the user's feedback was that a single bright red/pink
// wash read as untextured. Multi-scale noise (big warm patches + finer sand/rust
// streaks + a cooler taupe drift) survives the coarse outer-overlay bake, so even
// stretched it reads as varied dusty ground with browns and tans, not one color.

// Warm-earth palette (browner/dustier than the old pure red — pulls the whole
// biome away from "pink").
export const BADLANDS_CLAY = 0x966a45; // main dusty clay-brown
export const BADLANDS_OCHRE = 0xac8348; // warm yellow-brown patches
export const BADLANDS_SAND = 0xcbb488; // pale sandy drifts
export const BADLANDS_TAUPE = 0x82735c; // cooler grey-brown, breaks up the warmth
export const BADLANDS_RUST = 0x6d4029; // dark rust in cracks/shadow
// Mesa-rock clusters (the reused Biome's "forest" zone) — dark red rock.
export const BADLANDS_MESA = 0x5f3826;
// Dry ravine (the reused Biome's "creek") — a pale sandy dry riverbed.
export const BADLANDS_RAVINE = 0xc7ab74;
export const BADLANDS_MESA_ALPHA = 0.5;
export const BADLANDS_RAVINE_ALPHA = 0.6;

// The badlands' own full ground color at a point, at full strength. The blob-
// coverage weighting is applied by the compositor (WorldBiomes).
export function badlandsGroundColorAt(worldX: number, worldY: number, featureBiome: Biome): number {
  // Big warm patches: clay <-> ochre across ~420px lobes.
  const nWarm = valueNoise2D(worldX, worldY, 420);
  let color = blendColors(BADLANDS_CLAY, BADLANDS_OCHRE, nWarm);
  // Cooler taupe drift in some regions — the main lever against the uniform-red look.
  const nCool = valueNoise2D(worldX + 1300, worldY - 640, 300);
  if (nCool > 0.6) color = blendColors(color, BADLANDS_TAUPE, (nCool - 0.6) * 1.5);
  // Finer streaks: pale sand highs, dark rust lows (~130px), reads as cracked drift.
  const nFine = valueNoise2D(worldX - 720, worldY + 910, 130);
  if (nFine > 0.66) color = blendColors(color, BADLANDS_SAND, (nFine - 0.66) * 1.6);
  else if (nFine < 0.3) color = blendColors(color, BADLANDS_RUST, (0.3 - nFine) * 1.4);
  // Mesa rock clusters (feature layer) darken; dry ravine (feature creek) pales.
  const mesaW = featureBiome.forestWeight(worldX, worldY);
  if (mesaW > 0.02) color = blendColors(color, BADLANDS_MESA, BADLANDS_MESA_ALPHA * mesaW);
  const ravineW = featureBiome.creekWeight(worldX, worldY);
  if (ravineW > 0.02) color = blendColors(color, BADLANDS_RAVINE, BADLANDS_RAVINE_ALPHA * ravineW);
  return color;
}
