import Phaser from "phaser";
import { ATTACK_FX_DEPTH } from "../systems/depth";
import { scaleToLongest } from "./overrides";

// The "over your head = it's happening" half of the telegraph/attack split (see
// TELEGRAPH_DEPTH in systems/depth.ts). The indicator stays procedural Graphics
// flat on the ground; the attack itself is a real art sprite above the world.
//
// Two spawners cover the whole roster, because every area attack in the game is
// one of two shapes: a radial burst centred on a point, or a directional fan
// reaching out along a locked heading. Both are FIRE-AND-FORGET — the sprite is
// not parented to the enemy and destroys itself when its tween ends, so an enemy
// that dies or is culled mid-attack can't strand it in the world. (That is the
// bug the held-sprite versions in Gloamwarden/GremlinKing need explicit teardown
// for; prefer these unless the effect must track something that moves.)
//
// Both size the art against the radius/range `checkPlayerHit` actually uses, so
// what the player sees is what hits them.

/**
 * A radial impact centred on (x, y). `radiusPx` is the attack's own damage
 * radius; the art is scaled so its visible edge lands there.
 */
export function burstFx(
  scene: Phaser.Scene,
  key: string,
  x: number,
  y: number,
  radiusPx: number,
  durationMs: number,
  opts: { tint?: number; overshoot?: number } = {},
): Phaser.GameObjects.Image {
  const fx = scene.add.image(x, y, key).setDepth(ATTACK_FX_DEPTH);
  if (opts.tint !== undefined) fx.setTint(opts.tint);
  // Default 1:1 with the damage radius. `overshoot` exists for art whose outer
  // pixels are wispy spray rather than a hard edge, but it defaults to honest:
  // a burst drawn wider than it hits teaches the wrong radius, which costs the
  // player the next dodge.
  const full = scaleToLongest(scene, key, radiusPx * 2 * (opts.overshoot ?? 1));
  fx.setScale(full * 0.45);
  scene.tweens.add({
    targets: fx,
    scale: full,
    alpha: 0,
    duration: durationMs,
    ease: "Cubic.easeOut",
    onComplete: () => fx.destroy(),
  });
  return fx;
}

/**
 * A directional impact whose apex sits on the attacker at (x, y) and which
 * reaches `rangePx` along `angle`, spreading to `halfAngleRad` at the far end.
 *
 * The art is authored pointing +x with its apex at the left edge, so the origin
 * is pinned there and `rotation` aims it. Width and height are set independently
 * rather than by a uniform scale: a wedge's footprint is range x chord, which no
 * single generated canvas aspect matches for every attack, and being honest
 * about the footprint matters more here than a pixel-perfect aspect.
 */
export function coneFx(
  scene: Phaser.Scene,
  key: string,
  x: number,
  y: number,
  angle: number,
  rangePx: number,
  halfAngleRad: number,
  durationMs: number,
): Phaser.GameObjects.Image {
  const fx = scene.add.image(x, y, key).setOrigin(0, 0.5).setDepth(ATTACK_FX_DEPTH).setRotation(angle);
  // Clamped at 90 degrees: past that the wedge's chord starts SHRINKING again
  // while the arc keeps widening, so the raw sine would draw the Miretyrant's
  // 240-degree tail sweep narrower than its own 180-degree slice. The rear of a
  // very wide arc still isn't covered by a forward-anchored sprite — the ground
  // telegraph is what stays honest about that during the wind-up.
  fx.setDisplaySize(rangePx, 2 * rangePx * Math.sin(Math.min(halfAngleRad, Math.PI / 2)));
  const fullX = fx.scaleX;
  // Sweep out from the attacker rather than appearing whole — the reach is the
  // scary part, so it should be seen arriving.
  fx.scaleX = fullX * 0.5;
  scene.tweens.add({
    targets: fx,
    scaleX: fullX,
    alpha: 0,
    duration: durationMs,
    ease: "Quad.easeOut",
    onComplete: () => fx.destroy(),
  });
  return fx;
}
