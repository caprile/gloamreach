import Phaser from "phaser";
import { itemDef } from "../systems/Items";

export type TooltipPlacement = "right" | "above";

interface Anchor {
  x: number;
  y: number;
  width: number;
  height: number;
}

// Shared item-info popup used by both the backpack grid (InventoryMenu) and
// the hotbar (HotbarUI). "right" opens to the right of the anchor (flipping
// left if it would run off-screen) — used by the backpack grid. "above" opens
// upward, centered on the anchor — used by the hotbar, which sits at the very
// bottom of the screen with no room below it.
export class Tooltip {
  private scene: Phaser.Scene;
  private parts: Phaser.GameObjects.GameObject[] = [];

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  show(key: string, anchor: Anchor, placement: TooltipPlacement): void {
    this.hide();
    const def = itemDef(key);
    if (!def) return;

    const lines = [def.name, "", def.description];
    if (def.stats?.length) {
      lines.push("");
      for (const s of def.stats) lines.push(`${s.label}: ${s.value}`);
    }

    const text = this.scene.add
      .text(0, 0, lines.join("\n"), {
        fontFamily: "monospace",
        fontSize: "12px",
        color: "#e8ecf2",
        wordWrap: { width: 180 },
      })
      .setScrollFactor(0)
      .setDepth(4501);

    const padX = 8;
    const padY = 6;
    const w = text.width + padX * 2;
    const h = text.height + padY * 2;
    const { tx, ty } = this.place(anchor, w, h, placement);

    const bgBox = this.scene.add
      .rectangle(tx, ty, w, h, 0x000000, 0.92)
      .setOrigin(0, 0)
      .setStrokeStyle(1, 0x555e6e)
      .setScrollFactor(0)
      .setDepth(4500);
    text.setPosition(tx + padX, ty + padY);

    this.parts.push(bgBox, text);
  }

  hide(): void {
    for (const p of this.parts) p.destroy();
    this.parts = [];
  }

  private place(
    anchor: Anchor,
    w: number,
    h: number,
    placement: TooltipPlacement,
  ): { tx: number; ty: number } {
    const screenW = this.scene.scale.width;
    const screenH = this.scene.scale.height;

    if (placement === "right") {
      let tx = anchor.x + anchor.width + 8;
      if (tx + w > screenW - 4) tx = anchor.x - w - 8;
      const ty = Math.min(Math.max(anchor.y, 4), screenH - h - 4);
      return { tx, ty };
    }

    // "above": centered horizontally on the anchor, opening upward.
    let tx = anchor.x + anchor.width / 2 - w / 2;
    tx = Math.min(Math.max(tx, 4), screenW - w - 4);
    const ty = Math.max(anchor.y - h - 8, 4);
    return { tx, ty };
  }
}
