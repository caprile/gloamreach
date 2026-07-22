import type { Biome } from "./Biome";
import { blendColors, valueNoise2D } from "./colorUtil";

// Duskmire Bayou (biome 3) palette + ground helpers. Same shape as Badlands/Dunes:
// this module owns only the biome's LOOK and its terrain query; WHERE it appears
// (blob coverage) is decided by WorldBiomes, which composites it via
// worldBiomeColorAt. The shared feature Biome is reinterpreted a third way:
//   forestWeight -> cypress hammocks (raised, root-tangled dry ground)
//   grassy       -> open muck (the default sodden flats)
//   creekWeight  -> deep gloam channels (the standing water)
//
// Palette is violet/teal rot rather than the badlands' warm earth, so the two read
// as opposites at a glance on the world map. Mottled with multi-scale value noise
// for the same reason the badlands is (the user: a flat wash reads as untextured,
// and the outer-overlay bake stretches whatever we give it).

export const BAYOU_MUCK = 0x3c4a3a; // sodden olive-green muck — the base ground
export const BAYOU_MOSS = 0x4e6340; // brighter moss patches
export const BAYOU_ROT = 0x2b2f33; // dark rotted lows
export const BAYOU_VIOLET = 0x4a3a5c; // the gloam bruise that ties it to biome 3
export const BAYOU_SILT = 0x6b6a4e; // pale silt drifts / dried crust
// Cypress hammocks (the reused Biome's "forest" zone) — near-black tangled wood.
export const BAYOU_HAMMOCK = 0x232d24;
// Deep gloam channels (the reused "creek") — the standing water itself.
export const BAYOU_WATER_DEEP = 0x2d2a52; // deep violet-black water
export const BAYOU_WATER_SHALLOW = 0x40514f; // murky teal shallows
export const BAYOU_HAMMOCK_ALPHA = 0.55;
// A uniform gloam wash applied LAST, over everything. Without it the biome
// composited to an olive #525b41 — a swamp is green by nature, so the violet
// signature only ever showed where the gloam noise happened to spike, and next
// to the forest it read as "more green biome" (exactly the distinctness problem
// the user flagged on the badlands' flat red). Washing the finished color keeps
// every internal contrast (moss/silt/rot/water) intact while guaranteeing the
// whole biome reads violet-bruised from a distance.
export const BAYOU_GLOAM_WASH = 0x4a3a70;
export const BAYOU_GLOAM_WASH_ALPHA = 0.34;

// Water thresholds on the feature creekWeight. Below SHALLOW it's dry ground.
// Between the two it's wadeable shallows; above DEEP it's a proper channel.
// These same thresholds drive BOTH the color and the movement penalty, so what
// LOOKS like deep water always IS deep water (no cosmetic-vs-mechanical drift).
// Verified against the live feature field: with a 0.30/0.62 split, ~80% of bayou
// water sampled as DEEP — channels had almost no wadeable rim. Widened so a
// shoreline reads (and plays) as shallow before it drops off.
export const BAYOU_SHALLOW_W = 0.22;
export const BAYOU_DEEP_W = 0.7;

export type BayouWater = "dry" | "shallow" | "deep";

// How wet the ground is at a point, from the shared feature's creek channel.
// The single source of truth for the water-slow env effect (locked: water slows
// by depth, never blocks — the world stays fully traversable).
export function bayouWaterAt(worldX: number, worldY: number, featureBiome: Biome): BayouWater {
  const w = featureBiome.creekWeight(worldX, worldY);
  if (w >= BAYOU_DEEP_W) return "deep";
  if (w >= BAYOU_SHALLOW_W) return "shallow";
  return "dry";
}

// The bayou's full ground color at a point, at full strength; the blob-coverage
// weighting is applied by the compositor (WorldBiomes).
export function bayouGroundColorAt(worldX: number, worldY: number, featureBiome: Biome): number {
  // Big sodden patches: muck <-> moss across ~400px lobes.
  const nWet = valueNoise2D(worldX + 2100, worldY + 1450, 400);
  let color = blendColors(BAYOU_MUCK, BAYOU_MOSS, nWet);
  // Gloam bruise drifting through some regions — the biome-3 violet signature.
  const nGloam = valueNoise2D(worldX - 880, worldY + 2300, 330);
  if (nGloam > 0.4) color = blendColors(color, BAYOU_VIOLET, (nGloam - 0.4) * 1.6);
  // Finer detail: pale silt crust highs, rotted dark lows (~120px).
  const nFine = valueNoise2D(worldX + 640, worldY - 1180, 120);
  if (nFine > 0.68) color = blendColors(color, BAYOU_SILT, (nFine - 0.68) * 1.4);
  else if (nFine < 0.32) color = blendColors(color, BAYOU_ROT, (0.32 - nFine) * 1.5);
  // Cypress hammocks (feature layer) darken to near-black tangles.
  const hammockW = featureBiome.forestWeight(worldX, worldY);
  if (hammockW > 0.02) color = blendColors(color, BAYOU_HAMMOCK, BAYOU_HAMMOCK_ALPHA * hammockW);
  // Water last so it always wins — the channels must read unmistakably as water
  // (they carry a real movement penalty, so they can't be subtle).
  const w = featureBiome.creekWeight(worldX, worldY);
  if (w >= BAYOU_DEEP_W) {
    color = blendColors(color, BAYOU_WATER_DEEP, 0.85);
  } else if (w >= BAYOU_SHALLOW_W) {
    // Ramp across the shallow band so the shoreline reads as a gradient, not a step.
    const t = (w - BAYOU_SHALLOW_W) / (BAYOU_DEEP_W - BAYOU_SHALLOW_W);
    color = blendColors(color, BAYOU_WATER_SHALLOW, 0.4 + 0.4 * t);
  }
  return blendColors(color, BAYOU_GLOAM_WASH, BAYOU_GLOAM_WASH_ALPHA);
}
