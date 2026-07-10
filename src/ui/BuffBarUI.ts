import Phaser from "phaser";
import type { ActiveBuff } from "../systems/Buffs";

const ICON = 28;
const GAP = 6;
// Above the HP bar (bars sit at depth 2800-2802); below the crafting/inventory
// panels (3000+). Must clear WORLD_H so world objects never draw over it.
const DEPTH_ICON = 2803;
const DEPTH_BAR = 2804;
const DEPTH_TIP = 2806;

interface Entry {
  bg: Phaser.GameObjects.Rectangle;
  icon: Phaser.GameObjects.Image;
  meterBg: Phaser.GameObjects.Rectangle;
  meter: Phaser.GameObjects.Rectangle;
  hit: Phaser.GameObjects.Rectangle;
}

// The active-buff HUD: a centered row of food-buff icons sitting just above the
// HP bar. Each icon has a thin depletion meter and a hover tooltip (name, HP/s,
// seconds remaining). Icons are only rebuilt when the SET of active buffs
// changes; the meter + any visible tooltip update every frame from live buff
// data. Flat scrollFactor(0) GameObjects, per the CraftingMenu.ts note.
export class BuffBarUI {
  private scene: Phaser.Scene;
  private entries = new Map<string, Entry>();
  private centerX = 0;
  private bottomY = 0;
  private lastIds = "";
  private hoveredId: string | null = null;
  private tipBg?: Phaser.GameObjects.Rectangle;
  private tipText?: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  // Anchor: icons are centered horizontally on `centerX` and bottom-aligned at
  // `bottomY` (the top edge of the HP bar minus a small gap).
  layout(centerX: number, bottomY: number): void {
    this.centerX = centerX;
    this.bottomY = bottomY;
  }

  // Called every frame with the live active buffs. Rebuilds the icon row only
  // when the active set changes; always updates meters + the hovered tooltip.
  sync(buffs: ActiveBuff[]): void {
    const ids = buffs.map((b) => b.id).join(",");
    if (ids !== this.lastIds) {
      this.rebuild(buffs);
      this.lastIds = ids;
    }
    for (const b of buffs) {
      const e = this.entries.get(b.id);
      if (!e) continue;
      const frac = Phaser.Math.Clamp(b.remainingMs / b.durationMs, 0, 1);
      e.meter.setScale(frac, 1);
    }
    if (this.hoveredId) {
      const b = buffs.find((x) => x.id === this.hoveredId);
      if (b) this.updateTooltip(b);
      else this.hideTooltip();
    }
  }

  private rebuild(buffs: ActiveBuff[]): void {
    for (const e of this.entries.values()) {
      e.bg.destroy();
      e.icon.destroy();
      e.meterBg.destroy();
      e.meter.destroy();
      e.hit.destroy();
    }
    this.entries.clear();
    this.hideTooltip();
    this.hoveredId = null;

    const n = buffs.length;
    if (n === 0) return;
    const totalW = n * ICON + (n - 1) * GAP;
    let x = this.centerX - totalW / 2;
    const y = this.bottomY - ICON;

    for (const b of buffs) {
      const bg = this.scene.add
        .rectangle(x, y, ICON, ICON, 0x14181f, 0.9)
        .setOrigin(0, 0)
        .setStrokeStyle(1, 0x8fe38f)
        .setScrollFactor(0)
        .setDepth(DEPTH_ICON);
      const icon = this.scene.add
        .image(x + ICON / 2, y + ICON / 2 - 1, b.icon)
        .setScrollFactor(0)
        .setDepth(DEPTH_ICON);
      const meterBg = this.scene.add
        .rectangle(x + 2, y + ICON - 4, ICON - 4, 3, 0x000000, 0.6)
        .setOrigin(0, 0)
        .setScrollFactor(0)
        .setDepth(DEPTH_BAR);
      const meter = this.scene.add
        .rectangle(x + 2, y + ICON - 4, ICON - 4, 3, 0x8fe38f, 1)
        .setOrigin(0, 0)
        .setScrollFactor(0)
        .setDepth(DEPTH_BAR);
      const hit = this.scene.add
        .rectangle(x, y, ICON, ICON, 0xffffff, 0.001)
        .setOrigin(0, 0)
        .setScrollFactor(0)
        .setDepth(DEPTH_BAR + 1)
        .setInteractive({ useHandCursor: true })
        .on("pointerover", () => {
          this.hoveredId = b.id;
        })
        .on("pointerout", () => {
          if (this.hoveredId === b.id) this.hoveredId = null;
          this.hideTooltip();
        });

      this.entries.set(b.id, { bg, icon, meterBg, meter, hit });
      x += ICON + GAP;
    }
  }

  private updateTooltip(b: ActiveBuff): void {
    const secs = Math.ceil(b.remainingMs / 1000);
    const str = `${b.name}\n+${b.hpPerSec} HP/s · ${secs}s left`;
    if (!this.tipText) {
      this.tipText = this.scene.add
        .text(0, 0, str, { fontFamily: "monospace", fontSize: "11px", color: "#e8ecf2" })
        .setScrollFactor(0)
        .setDepth(DEPTH_TIP);
      this.tipBg = this.scene.add
        .rectangle(0, 0, 10, 10, 0x000000, 0.92)
        .setOrigin(0, 0)
        .setStrokeStyle(1, 0x555e6e)
        .setScrollFactor(0)
        .setDepth(DEPTH_TIP - 1);
    }
    this.tipText.setText(str);
    const padX = 8;
    const padY = 6;
    const w = this.tipText.width + padX * 2;
    const h = this.tipText.height + padY * 2;
    const e = this.entries.get(b.id);
    const anchorX = e ? e.bg.x + ICON / 2 : this.centerX;
    let tx = anchorX - w / 2;
    tx = Phaser.Math.Clamp(tx, 4, this.scene.scale.width - w - 4);
    const ty = Math.max(this.bottomY - ICON - h - 6, 4);
    this.tipBg!.setPosition(tx, ty).setSize(w, h).setVisible(true);
    this.tipText.setPosition(tx + padX, ty + padY).setVisible(true);
  }

  private hideTooltip(): void {
    this.tipBg?.setVisible(false);
    this.tipText?.setVisible(false);
  }
}
