import Phaser from "phaser";
import type { HintKind } from "../systems/Hints";

// Corner popup card for contextual hints (Hints.ts). A single card slides in
// from the right edge, holds, then fades; click to dismiss early. Anchored on
// the right edge at mid-height — clear of the minimap (top-right), the hotbar
// + hover prompt (bottom), and the log/keybinds column (top-left).
//
// Flat scrollFactor(0) GameObjects (no Container — same input/hit-test
// constraint the other menus document). Depth sits above every menu (the
// crafting/inventory panels top out at 3001) so a tip firing while a menu is
// open is never hidden behind it (playtest) — but below the pause overlay
// (3500), the one screen where a tip popping up would be truly out of place.
const DEPTH_BOX = 3200;
const DEPTH_TEXT = 3201;
const CARD_W = 264;
const RIGHT_MARGIN = 16;
const PAD = 12;
const HOLD_MS = 8000; // playtest: tips (esp. gloam-shard/material help) vanished too fast
const FADE_MS = 1400;
const SLIDE_MS = 300;

// Two visual flavors: a warm amber TIP (direct control/mechanic teaching) and a
// cool cyan HINT (in-character objective nudge) — so a mysterious "go check that
// out" reads differently from a "here's how the controls work" at a glance.
const KIND_STYLE: Record<HintKind, { label: string; hex: number; css: string }> = {
  tutorial: { label: "TIP", hex: 0xe3b25a, css: "#e3b25a" },
  hint: { label: "HINT", hex: 0x5ec8d6, css: "#5ec8d6" },
};

export class HintUI {
  private scene: Phaser.Scene;
  private restX: number;
  private centerY: number;
  private objects: Phaser.GameObjects.GameObject[] = [];
  // Only one hint is on screen at a time. A hint that arrives while one is
  // already showing used to replace it immediately, so back-to-back triggers
  // (e.g. two hints firing within the same second) could bump a tip off
  // screen before the player ever read it. Now it queues instead, and the
  // next one only appears once the current tip has had its full HOLD_MS.
  private queue: { text: string; kind: HintKind }[] = [];
  private displaying = false;
  private hideEvent?: Phaser.Time.TimerEvent;
  private slideTween?: Phaser.Tweens.Tween;

  // Left edge of any open right-hand panel the card must not cover, or null when
  // nothing is in the way. The card rests against the right edge, which is
  // exactly where the crafting panel lives — so a tip firing mid-craft sat on
  // top of the Craft button (the user). Supplied by the scene because HintUI has
  // no business knowing which menus exist.
  private obstacleLeft?: () => number | null;

  constructor(scene: Phaser.Scene, obstacleLeft?: () => number | null) {
    this.scene = scene;
    this.obstacleLeft = obstacleLeft;
    this.restX = scene.scale.width - RIGHT_MARGIN - CARD_W;
    this.centerY = Math.round(scene.scale.height * 0.42);
  }

  // Where the card should come to rest right now — shifted left of an open
  // panel, never past the screen edge. Recomputed per hint rather than cached,
  // since a menu can open or close between two tips.
  private currentRestX(): number {
    const obstacle = this.obstacleLeft?.() ?? null;
    if (obstacle === null) return this.restX;
    return Math.max(RIGHT_MARGIN, Math.min(this.restX, obstacle - CARD_W - 12));
  }

  show(text: string, kind: HintKind = "tutorial"): void {
    this.queue.push({ text, kind });
    if (!this.displaying) this.advance();
  }

  private advance(): void {
    const next = this.queue.shift();
    if (next === undefined) {
      this.displaying = false;
      return;
    }
    this.displaying = true;
    this.display(next.text, next.kind);
  }

  private display(text: string, kind: HintKind): void {
    this.clear();

    const style = KIND_STYLE[kind];
    const wrapWidth = CARD_W - PAD * 2;

    const header = this.scene.add
      .text(0, 0, style.label, {
        fontFamily: "monospace",
        fontSize: "13px",
        color: style.css,
      })
      .setScrollFactor(0);

    const body = this.scene.add
      .text(0, 0, text, {
        fontFamily: "monospace",
        fontSize: "15px",
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
    // not a system toast — colored by kind (amber tip / cyan hint).
    const accent = this.scene.add
      .rectangle(startX, topY, 3, cardH, style.hex, 1)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(DEPTH_TEXT);

    header.setPosition(startX + PAD, topY + PAD).setDepth(DEPTH_TEXT);
    body.setPosition(startX + PAD, topY + PAD + header.height + 6).setDepth(DEPTH_TEXT);

    this.objects = [box, accent, header, body];

    // Slide the whole group in together by tweening a shared x delta.
    const dx = this.currentRestX() - startX;
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
    if (this.objects.length === 0) {
      this.advance();
      return;
    }
    this.scene.tweens.add({
      targets: this.objects,
      alpha: 0,
      duration: FADE_MS,
      onComplete: () => {
        this.clear();
        this.advance();
      },
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
