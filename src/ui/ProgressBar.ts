import Phaser from "phaser";

export interface ProgressBarStartOpts {
  ease?: string;
  onUpdate?: (frac: number) => void;
  onComplete: () => void;
}

// A small, self-contained horizontal fill bar for timed actions (craft /
// process / cook). One instance is owned per menu (NOT part of the menu's
// re-rendered `rows`, so it survives the per-frame render clear) — position it
// over the action button, then call start() with a duration + onComplete.
//
// The fill tweens a plain {v} proxy rather than the Rectangle itself, so the
// tween keeps running (and its onComplete still grants the item) even if the
// menu is closed and the bar hidden mid-action — the visuals can be hidden
// safely without killing the tween target. Flat scrollFactor(0) GameObjects,
// per the note in CraftingMenu.ts.
export class ProgressBar {
  private scene: Phaser.Scene;
  private bg: Phaser.GameObjects.Rectangle;
  private fill: Phaser.GameObjects.Rectangle;
  private tween?: Phaser.Tweens.Tween;
  private w: number;
  private h: number;
  private fillColor: number;

  constructor(
    scene: Phaser.Scene,
    opts: { width?: number; height?: number; bgColor?: number; fillColor?: number; depth?: number } = {},
  ) {
    this.scene = scene;
    this.w = opts.width ?? 120;
    this.h = opts.height ?? 26;
    this.fillColor = opts.fillColor ?? 0x8fe38f;
    const depth = opts.depth ?? 3005;

    this.bg = scene.add
      .rectangle(0, 0, this.w, this.h, opts.bgColor ?? 0x14181f, 0.98)
      .setOrigin(0, 0)
      .setStrokeStyle(1, 0x3a4250)
      .setScrollFactor(0)
      .setDepth(depth)
      .setVisible(false);
    this.fill = scene.add
      .rectangle(0, 0, this.w - 2, this.h - 2, this.fillColor, 1)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(depth + 1)
      .setVisible(false);
    this.fill.scaleX = 0;
  }

  get running(): boolean {
    return !!this.tween && this.tween.isPlaying();
  }

  setPosition(x: number, y: number): this {
    this.bg.setPosition(x, y);
    this.fill.setPosition(x + 1, y + 1);
    return this;
  }

  setSize(w: number, h: number): this {
    this.w = w;
    this.h = h;
    this.bg.setSize(w, h);
    this.fill.setSize(w - 2, h - 2);
    return this;
  }

  setFillColor(color: number): this {
    this.fillColor = color;
    this.fill.setFillStyle(color, 1);
    return this;
  }

  setVisible(v: boolean): this {
    this.bg.setVisible(v);
    this.fill.setVisible(v);
    return this;
  }

  // Tween the fill 0 -> 1 over `durationMs`, invoking onComplete when full.
  start(durationMs: number, opts: ProgressBarStartOpts): void {
    this.stop();
    this.fill.scaleX = 0;
    this.setVisible(true);
    const proxy = { v: 0 };
    this.tween = this.scene.tweens.add({
      targets: proxy,
      v: 1,
      duration: durationMs,
      ease: opts.ease ?? "Sine.easeInOut",
      onUpdate: () => {
        this.fill.scaleX = proxy.v;
        opts.onUpdate?.(proxy.v);
      },
      onComplete: () => {
        this.tween = undefined;
        this.setVisible(false);
        opts.onComplete();
      },
    });
  }

  // Cancel an in-flight fill WITHOUT firing onComplete (used on destroy).
  stop(): void {
    this.tween?.remove();
    this.tween = undefined;
    this.setVisible(false);
  }

  destroy(): void {
    this.stop();
    this.bg.destroy();
    this.fill.destroy();
  }
}
