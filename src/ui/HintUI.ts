import Phaser from "phaser";

// Corner popup card for contextual hints (Hints.ts). A single card slides in
// from the right edge, holds, then fades; click to dismiss early. Anchored on
// the right edge at mid-height — clear of the minimap (top-right), the hotbar
// + hover prompt (bottom), and the log/keybinds column (top-left).
//
// Flat scrollFactor(0) GameObjects (no Container — same input/hit-test
// constraint the other menus document). Depth sits above the live world
// (fixed-HUD depths must clear WORLD_H, per the post-boss batch) but below the
// menus (3000+) and the pause overlay (3500).
const DEPTH_BOX = 2860;
const DEPTH_TEXT = 2861;
const CARD_W = 264;
const RIGHT_MARGIN = 16;
const PAD = 12;
const HOLD_MS = 8000; // playtest: tips (esp. gloam-shard/material help) vanished too fast
const FADE_MS = 1400;
const SLIDE_MS = 300;

export class HintUI {
  private scene: Phaser.Scene;
  private restX: number;
  private centerY: number;
  private objects: Phaser.GameObjects.GameObject[] = [];
  // Only one hint is on screen at a time; a new one replaces the current.
  private hideEvent?: Phaser.Time.TimerEvent;
  private slideTween?: Phaser.Tweens.Tween;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.restX = scene.scale.width - RIGHT_MARGIN - CARD_W;
    this.centerY = Math.round(scene.scale.height * 0.42);
  }

  show(text: string): void {
    // Replace any hint currently showing so two never stack/overlap.
    this.clear();

    const wrapWidth = CARD_W - PAD * 2;

    const header = this.scene.add
      .text(0, 0, "TIP", {
        fontFamily: "monospace",
        fontSize: "11px",
        color: "#e3b25a",
      })
      .setScrollFactor(0);

    const body = this.scene.add
      .text(0, 0, text, {
        fontFamily: "monospace",
        fontSize: "13px",
        color: "#dfe6f0",
        wordWrap: { width: wrapWidth },
      })
      .setScrollFactor(0);

    const cardH = PAD + header.height + 6 + body.height + PAD;
    const topY = Math.round(this.centerY - cardH / 2);
    const startX = this.scene.scale.width + 20; // off-screen right

    const box = this.scene.add
      .rectangle(startX, topY, CARD_W, cardH, 0x11151d, 0.96)
      .setOrigin(0, 0)
      .setStrokeStyle(1, 0x3a4250)
      .setScrollFactor(0)
      .setDepth(DEPTH_BOX)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => this.dismiss());
    // A slim accent stripe down the left edge so it reads as a "tip" card,
    // not a system toast.
    const accent = this.scene.add
      .rectangle(startX, topY, 3, cardH, 0xe3b25a, 1)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(DEPTH_TEXT);

    header.setPosition(startX + PAD, topY + PAD).setDepth(DEPTH_TEXT);
    body.setPosition(startX + PAD, topY + PAD + header.height + 6).setDepth(DEPTH_TEXT);

    this.objects = [box, accent, header, body];

    // Slide the whole group in together by tweening a shared x delta.
    const dx = this.restX - startX;
    this.slideTween = this.scene.tweens.add({
      targets: { t: 0 },
      t: 1,
      duration: SLIDE_MS,
      ease: "Cubic.easeOut",
      onUpdate: (tw) => {
        const p = (tw.getValue() ?? 0) as number;
        const x = startX + dx * p;
        box.x = x;
        accent.x = x;
        header.x = x + PAD;
        body.x = x + PAD;
      },
      onComplete: () => {
        this.hideEvent = this.scene.time.delayedCall(HOLD_MS, () => this.fadeOut());
      },
    });
  }

  private fadeOut(): void {
    if (this.objects.length === 0) return;
    this.scene.tweens.add({
      targets: this.objects,
      alpha: 0,
      duration: FADE_MS,
      onComplete: () => this.clear(),
    });
  }

  private dismiss(): void {
    this.fadeOut();
  }

  private clear(): void {
    this.slideTween?.remove();
    this.slideTween = undefined;
    this.hideEvent?.remove();
    this.hideEvent = undefined;
    for (const o of this.objects) o.destroy();
    this.objects = [];
  }
}
