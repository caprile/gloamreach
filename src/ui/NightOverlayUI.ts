import Phaser from "phaser";

// Night darkness + light mask (M-DN). A full-screen RenderTexture filled with
// dark blue at the current night intensity, from which soft light circles are
// *erased* — the standard "darkness with light holes" technique. Lights come
// from the player's held Torch (future Lantern) and from lit POIs (Gremlin
// Shacks, Boss Altar). Raw scrollFactor(0) GameObjects, no Container (house
// style — see the Phaser Container+scrollFactor(0)+input bug note).
//
// Depth sits above every world sprite (world Y-sort is compressed into a band
// that tops out ~2400 — see systems/depth.ts ysortDepth) but below the fixed-
// HUD band (2800+), so HUD/minimap/menus stay bright while only the world dims.
const DEPTH = 2700;
// The additive colour pass sits directly above the darkness mask, still well
// below the fixed-HUD band (2800+) so it never tints the HUD.
const LIGHT_DEPTH = 2701;
// Additive light is deliberately restrained: the erase pass already makes the
// world *visible*, so this pass only has to make it feel lit.
//
// This is low because additive blending SUMS overlapping lights, and light
// sources cluster hard — a Gloaming Vein is 9 crystals within one radius of each
// other, a war camp is a ring of braziers. At 0.4 a cluster summed straight past
// saturation and went white, losing the very colour this pass exists to add.
// Sized so the worst cluster still reads as its own hue; a single torch is
// correspondingly subtle, which is the right trade.
const ADDITIVE_STRENGTH = 0.15;
const NIGHT_COLOR = 0x0b1c3a;
const MAX_NIGHT_ALPHA = 0.42; // "moderate" — clearly night, world stays playable
// Underground (biome 3 Phase 4c) the same mask runs far darker and colder: a
// Sunken Crypt should read as PITCH black past your torchlight, not as a dim
// room. At night's 0.42 you could still make out the next crypt's floor across
// the void, which is exactly the illusion the dungeon depends on.
const CRYPT_COLOR = 0x05060a;
const MAX_CRYPT_ALPHA = 0.94;

export interface ScreenLight {
  x: number; // screen-space center
  y: number;
  radius: number; // px; light fades to nothing at this distance
  // Optional rectangular light (biome 3 Phase 4c): a discovered crypt room is
  // lit as a whole ROOM, not as a circle around a torch — same soft brush,
  // stretched to the room's footprint. `radius` is ignored when these are set.
  width?: number;
  height?: number;
  // Additive tint (0xRRGGBB). The erase pass only ever *reveals* what's under
  // the darkness, so it can't make a torch read as warm or a gloam crystal as
  // violet — every light looked identical. A light with a color also gets an
  // additive pass that casts that colour onto the world beneath it.
  //
  // Omit it for a pure reveal with no colour cast: that's the exact original
  // behaviour, and it's what a discovered crypt ROOM wants (it should read as
  // plainly lit, not as bathed in coloured light).
  color?: number;
}

export class NightOverlayUI {
  private rt: Phaser.GameObjects.RenderTexture;
  // Separate additive layer. This can't be folded into `rt`: drawing colour
  // *into* the darkness texture would occlude the world with that colour, since
  // rt renders normally. Casting light onto the world needs its own object
  // rendered with BlendModes.ADD.
  private lightRt: Phaser.GameObjects.RenderTexture;
  // Reusable erase brush — the light_soft gradient (BootScene). Not on the
  // display list; only ever used as a draw/erase source, its transform
  // (position + display size, origin-centered) drives where/how big each hole is.
  private brush: Phaser.GameObjects.Image;

  constructor(scene: Phaser.Scene) {
    const w = scene.scale.width;
    const h = scene.scale.height;
    this.rt = scene.add
      .renderTexture(0, 0, w, h)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(DEPTH)
      .setVisible(false);
    this.lightRt = scene.add
      .renderTexture(0, 0, w, h)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(LIGHT_DEPTH)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setVisible(false);
    this.brush = scene.make.image({ key: "light_soft" }, false).setOrigin(0.5);
  }

  // Called every frame. intensity01 0 = full day (overlay hidden, no cost),
  // ramping to 1 at deep night. `lights` are screen-space holes to carve.
  render(intensity01: number, lights: ScreenLight[], underground = false): void {
    if (intensity01 <= 0) {
      if (this.rt.visible) {
        this.rt.clear();
        this.rt.setVisible(false);
      }
      if (this.lightRt.visible) {
        this.lightRt.clear();
        this.lightRt.setVisible(false);
      }
      return;
    }
    this.rt.setVisible(true);
    this.rt.clear();
    this.rt.fill(
      underground ? CRYPT_COLOR : NIGHT_COLOR,
      intensity01 * (underground ? MAX_CRYPT_ALPHA : MAX_NIGHT_ALPHA),
    );
    // The brush is shared with the additive pass below, which tints it and
    // lowers its alpha — and erase strength reads that alpha. Reset explicitly
    // rather than relying on what last frame left behind.
    this.brush.clearTint().setAlpha(1);
    for (const light of lights) {
      const w = light.width ?? light.radius * 2;
      const h = light.height ?? light.radius * 2;
      this.brush.setPosition(light.x, light.y).setDisplaySize(w, h);
      this.rt.erase(this.brush);
    }

    // Additive colour pass — only lights that declared a colour.
    const tinted = lights.filter((l) => l.color !== undefined);
    if (!tinted.length) {
      if (this.lightRt.visible) {
        this.lightRt.clear();
        this.lightRt.setVisible(false);
      }
      return;
    }
    this.lightRt.setVisible(true);
    this.lightRt.clear();
    // Fades out with the night: a torch shouldn't visibly glow at noon.
    this.brush.setAlpha(intensity01 * ADDITIVE_STRENGTH);
    for (const light of tinted) {
      const w = light.width ?? light.radius * 2;
      const h = light.height ?? light.radius * 2;
      this.brush.setPosition(light.x, light.y).setDisplaySize(w, h).setTint(light.color!);
      this.lightRt.draw(this.brush);
    }
  }
}
