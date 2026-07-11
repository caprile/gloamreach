// Y-sort depth for world objects (player/enemies/trees/structures/props).
//
// World objects sort front-to-back by `depth = y` so a lower sprite draws in
// front. With the circular world now 8000px tall, a raw `depth = y` reaches
// ~8000 — which would render a low tree/enemy OVER the fixed HUD (hotbar/menus/
// minimap all live at depth 2600-6000). So we compress the whole world Y range
// into a bounded band well below the HUD floor. Order is preserved (monotonic
// in y), and the ground layers (negative depth) still sit below everything.
//
// Invariant: ysortDepth(WORLD_H) must stay below the lowest fixed-HUD depth
// (~2600). At WORLD_H = 8000, 8000 * 0.3 = 2400 — clear.
export const WORLD_DEPTH_SCALE = 0.3;

export function ysortDepth(y: number): number {
  return y * WORLD_DEPTH_SCALE;
}
