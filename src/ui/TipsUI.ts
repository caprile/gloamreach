import Phaser from "phaser";

// Static "How to Play" reference — opened from the Pause menu's "Tips" button.
// REWORKED (S2, 2026-07-15 playtest batch): this used to dump every
// contextual hint discovered so far as one un-scrollable joined Text, which
// overflowed the panel once a run had seen more than a handful. the user's
// call: replace the dynamic dump with a curated static block covering core
// controls + how-to-play in generic terms — no spoilers, no win-condition.
// The one-off corner popups (HintUI, driven by Hints.ts) are untouched and
// still teach specific gestures the first time they're relevant; this panel
// is just the "look it back up" reference, not a hint log.
// Modeled on WelcomeUI's flat-GameObject panel (no Container — same
// input/hit-test constraint every other menu here documents), swapped in
// over the (hidden, not closed) pause panel.
const DEPTH_SCRIM = 3500;
const DEPTH_PANEL = 3501;
const DEPTH_TEXT = 3502;
const PANEL_W = 600;
// Floor only — the panel grows to fit the real (measured) text height rather
// than a guessed fixed height. A prior fixed-460/520 guess under-measured the
// wrapped body text at the game's native 1920x1080 resolution (the mismatch
// only showed up full-size; a scaled-down screenshot hid it), so the Close
// button rendered mid-paragraph instead of below the content.
const PANEL_H_MIN = 300;
const TOP_PADDING = 20;
const TITLE_GAP = 20;
const BODY_BOTTOM_GAP = 24;
const BUTTON_AREA_H = 60;

const HOW_TO_PLAY = [
  "MOVEMENT",
  "Move: WASD / Arrows.  Sprint: hold Shift.  Dash: Spacebar while moving\n" +
    "(a quick burst that briefly dodges hits — has its own cooldown).",
  "",
  "INTERACTING",
  "Everything is mouse-driven: left-click a hovered object or enemy within\n" +
    "reach to gather, chop, mine, or attack (attacking needs a weapon equipped).\n" +
    "Right-click equipped gear or a placed station to inspect and upgrade it.",
  "",
  "INVENTORY & CRAFTING",
  "Tab opens your pack and the crafting menu — new recipes appear as you\n" +
    "gather their ingredients. The hotbar's first row (1-9) holds tools,\n" +
    "weapons, and food; Alt+1-9 selects a second row for stations/placeables.",
  "",
  "SUSTAIN",
  "Cooked food grants a healing-over-time buff (no instant heal) — different\n" +
    "foods stack, so you can have more than one meal buff running at once.\n" +
    "Resting near a lit campfire heals too.",
  "",
  "CHARACTER & MAP",
  "K opens your Character menu (skills + stats). M opens the full world map.",
  "",
  "THE GOAL",
  "Explore, gather, and craft your way to stronger gear — the wilds get more\n" +
    "dangerous the further out you go, and something out there is worth\n" +
    "preparing for.",
].join("\n");

export class TipsUI {
  private scene: Phaser.Scene;
  private open = false;
  private objects: Phaser.GameObjects.GameObject[] = [];
  private panelX: number;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.panelX = scene.scale.width / 2 - PANEL_W / 2;
  }

  isOpen(): boolean {
    return this.open;
  }

  show(onClose: () => void): void {
    this.open = true;
    this.render(onClose);
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

  // Content is built at panel-relative Y first (as if the panel's top-left
  // were 0,0), so the title/body's real measured heights are known before
  // the panel's own height is decided — then everything shifts down by the
  // final `panelY` in one pass. Same "measure real Text heights, then shift"
  // pattern as the dynamic-row-height UI panels elsewhere in this codebase.
  private render(onClose: () => void): void {
    this.clear();
    const cx = this.panelX + PANEL_W / 2;
    const wrapWidth = PANEL_W - 56;

    let relY = TOP_PADDING;
    const title = this.text(cx, relY, "How to Play", 22, "#ffffff", 0.5);
    relY += title.height + TITLE_GAP;

    const bodyRelY = relY;
    const body = this.text(this.panelX + 28, bodyRelY, HOW_TO_PLAY, 13, "#c8d0dc", 0, wrapWidth);
    relY += body.height + BODY_BOTTOM_GAP;

    const panelH = Math.max(PANEL_H_MIN, relY + BUTTON_AREA_H);
    const panelY = this.scene.scale.height / 2 - panelH / 2;

    // Shift the already-measured title/body down into their final position.
    title.y += panelY;
    body.y += panelY;

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
        .rectangle(this.panelX, panelY, PANEL_W, panelH, 0x0a0a0a, 0.97)
        .setOrigin(0, 0)
        .setStrokeStyle(1, 0x555e6e)
        .setScrollFactor(0)
        .setDepth(DEPTH_PANEL),
    );
    this.objects.push(title, body);

    const btn = this.scene.add
      .text(cx, panelY + panelH - 30, "Close", {
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
  ): Phaser.GameObjects.Text {
    return this.scene.add
      .text(x, y, str, {
        fontFamily: "monospace",
        fontSize: `${size + 1}px`,
        color,
        lineSpacing: 6,
        wordWrap: wrapWidth !== undefined ? { width: wrapWidth } : undefined,
      })
      .setOrigin(originX, 0)
      .setScrollFactor(0)
      .setDepth(DEPTH_TEXT);
  }
}
