import Phaser from "phaser";

// The "an upgrade is ready here" indicator, shared by every place it can appear:
// an inventory slot, a hotbar slot, and a placed station out in the world.
//
// It used to be a small gold "▲" glyph at each of those three sites (the user:
// "icon for upgrade not super clear ... a glow/pulse might be good instead of
// the triangle"). A 16px character in the corner of a 70px slot full of real
// pixel art, or floating beside a station in a cluttered camp, simply didn't
// read — it was the right information at the wrong volume.
//
// One helper rather than three copies of the tween, so the signal stays
// identical wherever it shows up and can be re-tuned in one place. The caller
// supplies only the centre, how big the thing being marked is, and a depth.
const GLOW_TEXTURE = "light_soft"; // BootScene.makeLightTexture — a 256px soft radial gradient
const GLOW_SRC_SIZE = 256;
const TINT = 0xffd24a; // the same gold the old glyph used, so the meaning carries over
const PULSE_MS = 760;
const ALPHA_LOW = 0.26;
// Loud enough to catch the eye across a camp, but held under 1 so the thing
// being marked still reads through it — an additive gold at full strength turns
// a workbench (or an item icon) into a featureless blob.
const ALPHA_HIGH = 0.72;
const PULSE_SCALE = 1.14;

export interface UpgradeGlow {
  glow: Phaser.GameObjects.Image;
  tween: Phaser.Tweens.Tween;
}

// `diameter` is the glow's resting width in px — pass roughly 1.5x the slot or
// sprite being marked so the light spills past its edges rather than sitting
// inside them. `fixed` for HUD/menu use (scrollFactor 0).
//
// `maxAlpha` dims the pulse for a caller that has to draw the glow OVER the
// thing it marks rather than under it (the world station: placed-station images
// carry no depth of their own, so the halo can't be tucked behind one without
// disappearing under the ground layers).
//
// The caller owns both returned objects: push the image onto whatever row list
// it clears, and kill the tween on teardown (an infinite tween outlives a
// destroyed target otherwise — see the standing Phaser tween-leak rule).
export function addUpgradeGlow(
  scene: Phaser.Scene,
  x: number,
  y: number,
  diameter: number,
  opts: { depth: number; fixed?: boolean; maxAlpha?: number },
): UpgradeGlow {
  const base = diameter / GLOW_SRC_SIZE;
  const peak = opts.maxAlpha ?? ALPHA_HIGH;
  const glow = scene.add
    .image(x, y, GLOW_TEXTURE)
    .setTint(TINT)
    .setBlendMode(Phaser.BlendModes.ADD)
    .setAlpha(Math.min(ALPHA_LOW, peak * 0.4))
    .setScale(base)
    .setDepth(opts.depth);
  if (opts.fixed) glow.setScrollFactor(0);
  const tween = scene.tweens.add({
    targets: glow,
    alpha: peak,
    scale: base * PULSE_SCALE,
    duration: PULSE_MS,
    yoyo: true,
    repeat: -1,
    ease: "Sine.easeInOut",
  });
  return { glow, tween };
}
