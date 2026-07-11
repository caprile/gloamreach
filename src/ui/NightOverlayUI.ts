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
const NIGHT_COLOR = 0x0b1c3a;
const MAX_NIGHT_ALPHA = 0.42; // "moderate" — clearly night, world stays playable

export interface ScreenLight {
  x: number; // screen-space center
  y: number;
  radius: number; // px; light fades to nothing at this distance
}

export class NightOverlayUI {
  private rt: Phaser.GameObjects.RenderTexture;
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
    this.brush = scene.make.image({ key: "light_soft" }, false).setOrigin(0.5);
  }

  // Called every frame. intensity01 0 = full day (overlay hidden, no cost),
  // ramping to 1 at deep night. `lights` are screen-space holes to carve.
  render(intensity01: number, lights: ScreenLight[]): void {
    if (intensity01 <= 0) {
      if (this.rt.visible) {
        this.rt.clear();
        this.rt.setVisible(false);
      }
      return;
    }
    this.rt.setVisible(true);
    this.rt.clear();
    this.rt.fill(NIGHT_COLOR, intensity01 * MAX_NIGHT_ALPHA);
    for (const light of lights) {
      this.brush.setPosition(light.x, light.y).setDisplaySize(light.radius * 2, light.radius * 2);
      this.rt.erase(this.brush);
    }
  }
}
