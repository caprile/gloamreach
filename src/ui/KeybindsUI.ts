import Phaser from "phaser";

const PANEL_X = 12;
const PANEL_Y = 10;
const PANEL_W = 260;
const HEADER_H = 22;
const LINE_H = 18;
const PADDING = 8;

// Collapsible keybind reference, anchored top-left. Starts collapsed so the
// growing list of binds doesn't crowd the screen — expand via the header to
// see the full list. Mirrors EventLogUI's collapse/expand mechanics (header
// toggle, fixed depth/scrollFactor) but has no scrolling/toasts since the
// list is static, just passed in once at construction.
export class KeybindsUI {
  private scene: Phaser.Scene;
  private binds: string[];
  private collapsed = true;
  private rows: Phaser.GameObjects.GameObject[] = [];

  constructor(scene: Phaser.Scene, binds: string[]) {
    this.scene = scene;
    this.binds = binds;
    this.render();
  }

  // Whether a screen point is inside the panel (header, plus body when
  // expanded) — used by the scene to swallow clicks that would otherwise hit
  // the world underneath.
  isPointerOver(pointer: Phaser.Input.Pointer): boolean {
    const h = HEADER_H + (this.collapsed ? 0 : this.bodyHeight());
    return (
      pointer.x >= PANEL_X &&
      pointer.x <= PANEL_X + PANEL_W &&
      pointer.y >= PANEL_Y &&
      pointer.y <= PANEL_Y + h
    );
  }

  private bodyHeight(): number {
    return this.binds.length * LINE_H + PADDING;
  }

  private clear(): void {
    for (const r of this.rows) r.destroy();
    this.rows = [];
  }

  private render(): void {
    this.clear();

    const header = this.scene.add
      .rectangle(PANEL_X, PANEL_Y, PANEL_W, HEADER_H, 0x1a1f2a, 0.95)
      .setOrigin(0, 0)
      .setStrokeStyle(1, 0x3a4250)
      .setScrollFactor(0)
      .setDepth(2600)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => {
        this.collapsed = !this.collapsed;
        this.render();
      });
    this.rows.push(header);

    this.rows.push(
      this.scene.add
        .text(PANEL_X + 8, PANEL_Y + 4, "Keybinds", {
          fontFamily: "monospace",
          fontSize: "13px",
          color: "#ffffff",
        })
        .setScrollFactor(0)
        .setDepth(2601),
    );
    this.rows.push(
      this.scene.add
        .text(PANEL_X + PANEL_W - 8, PANEL_Y + 4, this.collapsed ? "[+]" : "[-]", {
          fontFamily: "monospace",
          fontSize: "13px",
          color: "#8a93a3",
        })
        .setOrigin(1, 0)
        .setScrollFactor(0)
        .setDepth(2601),
    );

    if (this.collapsed) return;

    const bodyTop = PANEL_Y + HEADER_H;
    this.rows.push(
      this.scene.add
        .rectangle(PANEL_X, bodyTop, PANEL_W, this.bodyHeight(), 0x0a0a0a, 0.9)
        .setOrigin(0, 0)
        .setScrollFactor(0)
        .setDepth(2600),
    );

    let y = bodyTop + 4;
    for (const line of this.binds) {
      this.rows.push(
        this.scene.add
          .text(PANEL_X + 8, y, line, {
            fontFamily: "monospace",
            fontSize: "12px",
            color: "#c8d0dc",
          })
          .setScrollFactor(0)
          .setDepth(2601),
      );
      y += LINE_H;
    }
  }
}
