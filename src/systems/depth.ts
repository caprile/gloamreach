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
