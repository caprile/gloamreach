import Phaser from "phaser";
import { frameInto } from "./frames";

export interface PauseMenuDeps {
  hintsEnabled: () => boolean;
  onToggleHints: () => void;
  sfxEnabled: () => boolean;
  onToggleSfx: () => void;
  onResume: () => void;
  onNewRun: () => void;
  onTips: () => void;
}

// Pause overlay (Esc). Freezes the run (MainScene pauses physics + the scene
// clock and early-returns update()) and offers Resume / New Run plus a Hints
// on/off toggle — the home for the settings-style toggle the user wanted.
// Full-screen scrim + centered panel, modeled on RunEndUI's flat-GameObject /
// scrollFactor(0) pattern (no Containers). Depths match RunEndUI (they're
// never open at once — pausing is blocked once the run is over).
const DEPTH_SCRIM = 3500;
const DEPTH_PANEL = 3501;
const DEPTH_TEXT = 3502;
const PANEL_W = 360;
const PANEL_H = 384;

export class PauseMenuUI {
  private scene: Phaser.Scene;
  private open = false;
  private objects: Phaser.GameObjects.GameObject[] = [];
  private panelX: number;
  private panelY: number;
  private deps?: PauseMenuDeps;
  private hintsToggle?: Phaser.GameObjects.Text;
  private sfxToggle?: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.panelX = scene.scale.width / 2 - PANEL_W / 2;
    this.panelY = scene.scale.height / 2 - PANEL_H / 2;
  }

  isOpen(): boolean {
    return this.open;
  }

  show(deps: PauseMenuDeps): void {
    if (this.open) return;
    this.open = true;
    this.deps = deps;
    const cx = this.scene.scale.width / 2;

    // Scrim — interactive so world clicks behind it are swallowed while paused.
    this.objects.push(
      this.scene.add
        .rectangle(0, 0, this.scene.scale.width, this.scene.scale.height, 0x000000, 0.6)
        .setOrigin(0, 0)
        .setScrollFactor(0)
        .setDepth(DEPTH_SCRIM)
        .setInteractive(),
    );
    const panel = this.scene.add
      .rectangle(this.panelX, this.panelY, PANEL_W, PANEL_H, 0x0a0a0a, 0.97)
      .setOrigin(0, 0)
      .setStrokeStyle(1, 0x555e6e)
      .setScrollFactor(0)
      .setDepth(DEPTH_PANEL);
    this.objects.push(panel);
    // Rebuilt on every open rather than bound, since the whole panel is torn
    // down when it closes.
    frameInto(this.objects, panel, "panel");

    let y = this.panelY + 30;
    this.text(cx, y, "PAUSED", 28, "#ffffff", 0.5);
    y += 62;

    this.button(cx, y, "Resume", () => deps.onResume());
    y += 52;

    // Hints/SFX toggles — reflect and flip their persisted preferences live.
    this.hintsToggle = this.button(cx, y, this.hintsLabel(), () => {
      deps.onToggleHints();
      this.hintsToggle?.setText(this.hintsLabel());
    });
    y += 52;

    this.sfxToggle = this.button(cx, y, this.sfxLabel(), () => {
      deps.onToggleSfx();
      this.sfxToggle?.setText(this.sfxLabel());
    });
    y += 52;

    this.button(cx, y, "Tips", () => deps.onTips());
    y += 52;

    this.button(cx, y, "New Run", () => deps.onNewRun());
  }

  hide(): void {
    if (!this.open) return;
    this.open = false;
    this.deps = undefined;
    this.hintsToggle = undefined;
    this.sfxToggle = undefined;
    for (const o of this.objects) o.destroy();
    this.objects = [];
  }

  private hintsLabel(): string {
    return `Hints: ${this.deps?.hintsEnabled() ? "ON" : "OFF"}`;
  }

  private sfxLabel(): string {
    return `Sound: ${this.deps?.sfxEnabled() ? "ON" : "OFF"}`;
  }

  private button(
    cx: number,
    y: number,
    label: string,
    onClick: () => void,
  ): Phaser.GameObjects.Text {
    const btn = this.scene.add
      .text(cx, y, label, {
        fontFamily: "monospace",
        fontSize: "18px",
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
      .on("pointerdown", onClick);
    this.objects.push(btn);
    return btn;
  }

  private text(
    x: number,
    y: number,
    str: string,
    size: number,
    color: string,
    originX = 0,
  ): Phaser.GameObjects.Text {
    const t = this.scene.add
      .text(x, y, str, { fontFamily: "monospace", fontSize: `${size + 1}px`, color })
      .setOrigin(originX, 0)
      .setScrollFactor(0)
      .setDepth(DEPTH_TEXT);
    this.objects.push(t);
    return t;
  }
}
