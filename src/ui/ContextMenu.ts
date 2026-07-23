import Phaser from "phaser";

export interface ContextMenuItem {
  label: string;
  enabled: boolean;
  onClick: () => void;
}

const ITEM_W = 150;
const ITEM_H = 26;
const DEPTH = 5100; // above the item-drag ghost (5000)

// A small screen-anchored popup listing 1+ clickable rows, used for the
// right-click "Upgrade / Destroy" menu on placed objects (Workbench,
// Campfire, Drying Rack, ...). Generic — not tied to any one object type.
// Same flat-scrollFactor(0)-GameObject approach as the other menus (no
// Containers — see the note in CraftingMenu.ts).
export class ContextMenu {
  private scene: Phaser.Scene;
  private rows: Phaser.GameObjects.GameObject[] = [];
  private x = 0;
  private y = 0;
  private w = ITEM_W;
  private h = 0;
  private openFlag = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  isOpen(): boolean {
    return this.openFlag;
  }

  show(screenX: number, screenY: number, items: ContextMenuItem[]): void {
    this.close();
    this.openFlag = true;
    this.h = items.length * ITEM_H;
    // Keep the popup on-screen.
    this.x = Math.min(screenX, this.scene.scale.width - this.w - 4);
    this.y = Math.min(screenY, this.scene.scale.height - this.h - 4);

    const bg = this.scene.add
      .rectangle(this.x, this.y, this.w, this.h, 0x0a0a0a, 0.95)
      .setOrigin(0, 0)
      .setStrokeStyle(1, 0x555e6e)
      .setScrollFactor(0)
      .setDepth(DEPTH);
    this.rows.push(bg);

    items.forEach((item, i) => {
      const rowY = this.y + i * ITEM_H;
      const row = this.scene.add
        .rectangle(this.x, rowY, this.w, ITEM_H, 0x0a0a0a, 0.001)
        .setOrigin(0, 0)
        .setScrollFactor(0)
        .setDepth(DEPTH + 1)
        .setInteractive({ useHandCursor: item.enabled })
        .on("pointerover", () => {
          if (item.enabled) row.setFillStyle(0x2a3a55, 0.6);
        })
        .on("pointerout", () => row.setFillStyle(0x0a0a0a, 0.001))
        .on("pointerdown", () => {
          if (!item.enabled) return;
          this.close();
          item.onClick();
        });
      this.rows.push(row);

      const t = this.scene.add
        .text(this.x + 10, rowY + ITEM_H / 2, item.label, {
          fontFamily: "monospace",
          fontSize: "15px",
          color: item.enabled ? "#ffffff" : "#5b6472",
        })
        .setOrigin(0, 0.5)
        .setScrollFactor(0)
        .setDepth(DEPTH + 2);
      this.rows.push(t);
    });
  }

  close(): void {
    for (const r of this.rows) r.destroy();
    this.rows = [];
    this.openFlag = false;
  }

  containsPoint(screenX: number, screenY: number): boolean {
    if (!this.openFlag) return false;
    return screenX >= this.x && screenX <= this.x + this.w && screenY >= this.y && screenY <= this.y + this.h;
  }
}
