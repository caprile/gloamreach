// Y-sort depth for world objects (player/enemies/trees/structures/props).
//
// World objects sort front-to-back by `depth = y` so a lower sprite draws in
// front. With the circular world now 28000px tall (grown for ~5 biomes), a raw
// `depth = y` reaches ~28000 — which would render a low tree/enemy OVER the
// fixed HUD (hotbar/menus/minimap all live at depth 2600-6000). So we compress
// the whole world Y range into a bounded band well below the HUD floor. Order is
// preserved (monotonic in y), and the ground layers (negative depth) still sit
// below everything.
//
// Invariant: ysortDepth(WORLD_H) must stay below the lowest fixed-HUD depth
// (~2600). At WORLD_H = 28000, 28000 * 0.09 = 2520 — clear. (Was 0.3 at 8000px,
// 0.13 at 18000px; shrunk again when the world grew to 28000 in biome-2 Phase 0.)
export const WORLD_DEPTH_SCALE = 0.09;

export function ysortDepth(y: number): number {
  return y * WORLD_DEPTH_SCALE;
}

// An attack INDICATOR (the telegraph footprint drawn during a wind-up) and the
// ATTACK ITSELF must never be mistakable for one another — a player reading a
// warning as a hit, or a hit as a warning, is the difference between dodging and
// eating it. Colour alone can't carry that: an attack is drawn in its element's
// own hue, so a same-hue warning next to it reads as "more of the same thing".
//
// So the split is STRUCTURAL, and applies to the whole roster at once:
//
//   INDICATOR  — flat on the ground, UNDER every entity, outline-led and
//                translucent, never a textured sprite. It is a boundary marker.
//   THE ATTACK — a real art sprite ABOVE the entities, opaque and short-lived.
//
// "Under your feet = it hasn't happened yet; over your head = it's happening" is
// learnable in one fight and holds for every enemy and boss.
//
// The value sits above every ground layer (the bakes and POI decals run
// -9.5..-6) and below every entity (ysortDepth is >= 0 for all world y).
export const TELEGRAPH_DEPTH = -5;

// Impact art. Above every world entity, below the fixed HUD (2600+).
//
// 2560, not 2500: ysortDepth tops out at 2520 for an entity at the very bottom
// of the 28000px world, so 2500 would have let one draw OVER the hit that just
// landed on it — the exact confusion this whole split exists to prevent, just
// rare enough to never show up in a playtest near the centre of the map.
export const ATTACK_FX_DEPTH = 2560;
