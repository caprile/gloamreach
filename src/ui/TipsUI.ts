import Phaser from "phaser";

// Re-readable list of every contextual hint (Hints.ts) discovered so far
// this run — opened from the Pause menu's "Tips" button (the pause menu's
// separate "How to Play" re-entry was removed once this shipped — the
// welcome/how-to-play overlay already runs automatically every run, so it
// didn't need its own pause-menu button too). Playtest feedback: non-obvious
// gestures (right-click to upgrade, etc.) are taught once by a corner popup
// (HintUI) and then gone; this is the "look it back up" escape hatch.
// Modeled on WelcomeUI's flat-GameObject panel (no Container — same
// input/hit-test constraint every other menu here documents), swapped in
// over the (hidden, not closed) pause panel.
const DEPTH_SCRIM = 3500;
const DEPTH_PANEL = 3501;
const DEPTH_TEXT = 3502;
const PANEL_W = 560;
const PANEL_H = 460;

export class TipsUI {
  private scene: Phaser.Scene;
  private open = false;
  private objects: Phaser.GameObjects.GameObject[] = [];
  private panelX: number;
  private panelY: number;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.panelX = scene.scale.width / 2 - PANEL_W / 2;
    this.panelY = scene.scale.height / 2 - PANEL_H / 2;
  }

  isOpen(): boolean {
    return this.open;
  }

  show(tips: string[], onClose: () => void): void {
    this.open = true;
    this.render(tips, onClose);
  }

  hide(): void {
    if (!this.open) return;
    this.open = false;
    this.clear();
  }

  private clear(): void {
    for (const o of this.objects) o.destroy();
    this.objects = [];
  }

  private render(tips: string[], onClose: () => void): void {
    this.clear();
    const cx = this.panelX + PANEL_W / 2;

    this.objects.push(
      this.scene.add
        .rectangle(0, 0, this.scene.scale.width, this.scene.scale.height, 0x000000, 0.7)
        .setOrigin(0, 0)
        .setScrollFactor(0)
        .setDepth(DEPTH_SCRIM)
        .setInteractive(),
    );
    this.objects.push(
      this.scene.add
        .rectangle(this.panelX, this.panelY, PANEL_W, PANEL_H, 0x0a0a0a, 0.97)
        .setOrigin(0, 0)
        .setStrokeStyle(1, 0x555e6e)
        .setScrollFactor(0)
        .setDepth(DEPTH_PANEL),
    );

    let y = this.panelY + 24;
    this.text(cx, y, "Tips Discovered", 22, "#ffffff", 0.5);
    y += 42;

    const wrapWidth = PANEL_W - 56;
    const body =
      tips.length > 0
        ? tips.map((t, i) => `${i + 1}. ${t}`).join("\n\n")
        : "Nothing discovered yet this run — tips appear the first time you run into a new situation.";
    this.text(this.panelX + 28, y, body, 13, "#c8d0dc", 0, wrapWidth);

    const btn = this.scene.add
      .text(cx, this.panelY + PANEL_H - 30, "Close", {
        fontFamily: "monospace",
        fontSize: "16px",
        color: "#dfe6f0",
        backgroundColor: "#1a1f2a",
        padding: { x: 20, y: 8 },
      })
      .setOrigin(0.5, 0.5)
      .setScrollFactor(0)
      .setDepth(DEPTH_TEXT)
      .setInteractive({ useHandCursor: true })
      .on("pointerover", () => btn.setBackgroundColor("#2a3140"))
      .on("pointerout", () => btn.setBackgroundColor("#1a1f2a"))
      .on("pointerdown", onClose);
    this.objects.push(btn);
  }

  private text(
    x: number,
    y: number,
    str: string,
    size: number,
    color: string,
    originX = 0,
    wrapWidth?: number,
  ): void {
    this.objects.push(
      this.scene.add
        .text(x, y, str, {
          fontFamily: "monospace",
          fontSize: `${size}px`,
          color,
          lineSpacing: 8,
          wordWrap: wrapWidth !== undefined ? { width: wrapWidth } : undefined,
        })
        .setOrigin(originX, 0)
        .setScrollFactor(0)
        .setDepth(DEPTH_TEXT),
    );
  }
}
