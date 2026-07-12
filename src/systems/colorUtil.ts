// Tiny shared color helpers for terrain compositing (biome palettes + map).
// Framework-free — plain integer 0xRRGGBB math.

// Blend `overlay` over `base` by `alpha` (0 = base, 1 = overlay).
export function blendColors(base: number, overlay: number, alpha: number): number {
  const a = alpha < 0 ? 0 : alpha > 1 ? 1 : alpha;
  const br = (base >> 16) & 0xff;
  const bg = (base >> 8) & 0xff;
  const bb = base & 0xff;
  const or_ = (overlay >> 16) & 0xff;
  const og = (overlay >> 8) & 0xff;
  const ob = overlay & 0xff;
  const r = Math.round(br * (1 - a) + or_ * a);
  const g = Math.round(bg * (1 - a) + og * a);
  const b = Math.round(bb * (1 - a) + ob * a);
  return (r << 16) | (g << 8) | b;
}
