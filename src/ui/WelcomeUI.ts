import Phaser from "phaser";

const STORAGE_KEY = "survivor-rpg:welcome-seen:v1";

// Has the player ever dismissed the welcome/how-to-play screen? Persisted like
// Hints' on/off pref (Hints.ts) — survives a "New Run" scene.restart(), only
// resets if localStorage is cleared.
export function hasSeenWelcome(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return true; // storage unavailable (e.g. sandboxed iframe) — don't block play
  }
}

function markWelcomeSeen(): void {
  try {
    localStorage.setItem(STORAGE_KEY, "1");
  } catch {
    // ignore — worst case it just shows again next load
  }
}

// Two static "pages": an early-access welcome + a how-to-play loop summary.
// Deliberately spoiler-free per the standing Hints.ts rule — teaches the
// Explore/Gather/Craft/Level/Fight loop and a couple of easy-to-miss input
// gestures, never the totem->altar->boss win condition.
const PAGES: { title: string; lines: string[] }[] = [
  {
    title: "Welcome, Survivor",
    lines: [
      "This is an early, in-development build. Art and sound are all",
      "placeholders for now, and balance is still being tuned.",
      "",
      "You're playtesting alongside the developer — what breaks, what",
      "confuses you, and what you enjoy all directly shapes what gets",
      "built next. Thank you for helping build this.",
      "",
      "Expect rough edges. Nothing here is final.",
    ],
  },
  {
    title: "How to Play",
    lines: [
      "The core loop: Explore -> Gather -> Craft -> Level -> Fight.",
      "Repeat that loop to grow stronger and push further.",
      "",
      "Play at your own pace — but the clock never stops: your final",
      "score rewards a fast finish, so lingering is fine, speed pays off.",
      "",
      "Left-click interacts with or attacks anything within reach.",
      "Tab opens your pack and crafting; K opens your character sheet.",
      "Esc pauses.",
      "",
      "Handy shortcuts: Ctrl+Click an item to quick-move it (e.g. equip",
      "or store it); Shift+Click a stack to split it in half.",
      "",
      "The Keybinds panel (top-left) always has the full control list.",
    ],
  },
];

const DEPTH_SCRIM = 3600;
const DEPTH_PANEL = 3601;
const DEPTH_TEXT = 3602;
const PANEL_W = 680;
const PANEL_H = 460;

export class WelcomeUI {
  private scene: Phaser.Scene;
  private open = false;
  private objects: Phaser.GameObjects.GameObject[] = [];
  private panelX: number;
  private panelY: number;
  private page = 0;
  private onClose?: () => void;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.panelX = scene.scale.width / 2 - PANEL_W / 2;
    this.panelY = scene.scale.height / 2 - PANEL_H / 2;
  }

  isOpen(): boolean {
    return this.open;
  }

  show(onClose: () => void): void {
    this.open = true;
    this.page = 0;
    this.onClose = onClose;
    this.render();
  }

  hide(): void {
    if (!this.open) return;
    this.open = false;
    this.onClose = undefined;
    this.clear();
  }

  // Esc/"Start Playing" both end the flow the same way: mark it seen so it
  // never auto-shows again, then hand back control to the caller.
  private finish(): void {
    markWelcomeSeen();
    const cb = this.onClose;
    this.hide();
    cb?.();
  }

  private clear(): void {
    for (const o of this.objects) o.destroy();
    this.objects = [];
  }

  private render(): void {
    this.clear();
    const cx = this.panelX + PANEL_W / 2;
    const page = PAGES[this.page];

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

    let y = this.panelY + 26;
    this.text(cx, y, page.title, 26, "#ffffff", 0.5);
    y += 46;

    this.text(this.panelX + 32, y, page.lines.join("\n"), 15, "#c8d0dc", 0);
    y = this.panelY + PANEL_H - 56;

    // Page dots.
    this.text(cx, y, `Page ${this.page + 1} / ${PAGES.length}`, 12, "#6a7280", 0.5);

    const btnY = this.panelY + PANEL_H - 26;
    if (this.page > 0) {
      this.button(this.panelX + 90, btnY, "< Back", () => {
        this.page--;
        this.render();
      });
    }
    if (this.page < PAGES.length - 1) {
      this.button(this.panelX + PANEL_W - 90, btnY, "Next >", () => {
        this.page++;
        this.render();
      });
    } else {
      this.button(this.panelX + PANEL_W - 110, btnY, "Start Playing", () => this.finish());
    }
  }

  private button(x: number, y: number, label: string, onClick: () => void): void {
    const btn = this.scene.add
      .text(x, y, label, {
        fontFamily: "monospace",
        fontSize: "16px",
        color: "#dfe6f0",
        backgroundColor: "#1a1f2a",
        padding: { x: 16, y: 8 },
      })
      .setOrigin(0.5, 0.5)
      .setScrollFactor(0)
      .setDepth(DEPTH_TEXT)
      .setInteractive({ useHandCursor: true })
      .on("pointerover", () => btn.setBackgroundColor("#2a3140"))
      .on("pointerout", () => btn.setBackgroundColor("#1a1f2a"))
      .on("pointerdown", onClick);
    this.objects.push(btn);
  }

  private text(
    x: number,
    y: number,
    str: string,
    size: number,
    color: string,
    originX = 0,
  ): void {
    this.objects.push(
      this.scene.add
        .text(x, y, str, {
          fontFamily: "monospace",
          fontSize: `${size}px`,
          color,
          lineSpacing: 6,
        })
        .setOrigin(originX, 0)
        .setScrollFactor(0)
        .setDepth(DEPTH_TEXT),
    );
  }
}
