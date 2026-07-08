import Phaser from "phaser";
import type { StationUpgradeDef } from "../systems/StationUpgrades";

export interface UpgradeTarget {
  itemKey: string;
  tier: number;
}

export interface UpgradeMenuDeps {
  // The placed object the popup's "Upgrade" button was clicked on, or null
  // once closed. Re-read every render so it reflects live tier changes.
  target: () => UpgradeTarget | null;
  upgradesFor: (itemKey: string) => StationUpgradeDef[];
  isDiscovered: (upg: StationUpgradeDef) => boolean;
  canAfford: (upg: StationUpgradeDef) => boolean;
  formatCost: (upg: StationUpgradeDef) => string;
  displayName: (itemKey: string, tier: number) => string;
  apply: (upg: StationUpgradeDef) => void;
}

const PANEL_W = 420;
const HEADER_H = 44;
const MIN_ROW_H = 50;
const DEPTH_BG = 3000;
const DEPTH_ITEM = 3001;
const DEPTH_TEXT = 3002;

// Full-page popup opened from a placed station's right-click "Upgrade"
// button (Milestone K follow-up) — replaces the earlier inline
// ContextMenu row-list-of-upgrades with a real panel matching the
// Drying Rack/Crafting menus' look, since a station can end up with several
// upgrade tiers over time. Only lists DISCOVERED upgrades for this station's
// itemKey (undiscovered ones stay invisible, mirroring recipe discovery);
// among those, ones already applied to this specific instance are shown
// greyed out ("Applied") rather than hidden, so the player can see the whole
// upgrade path. An empty discovered list renders "No upgrades discovered yet."
//
// Row layout is stacked (name -> cost -> description) and each row's height
// is derived from the description's actual wrapped text height rather than a
// fixed constant, so a longer description grows its own row instead of
// spilling into the next one's box.
export class UpgradeMenu {
  private scene: Phaser.Scene;
  private deps: UpgradeMenuDeps;
  private bg: Phaser.GameObjects.Rectangle;
  private open = false;
  private rows: Phaser.GameObjects.GameObject[] = [];

  private panelX: number;
  private panelY: number;
  private panelH = 200; // recomputed per render based on row content

  constructor(scene: Phaser.Scene, deps: UpgradeMenuDeps) {
    this.scene = scene;
    this.deps = deps;

    this.panelX = scene.scale.width / 2 - PANEL_W / 2;
    this.panelY = scene.scale.height / 2 - this.panelH / 2;

    this.bg = scene.add
      .rectangle(this.panelX, this.panelY, PANEL_W, this.panelH, 0x0a0a0a, 0.95)
      .setOrigin(0, 0)
      .setStrokeStyle(1, 0x555e6e)
      .setScrollFactor(0)
      .setDepth(DEPTH_BG)
      .setVisible(false);
  }

  openMenu(): void {
    this.open = true;
    this.bg.setVisible(true);
    this.render();
  }

  close(): void {
    if (!this.open) return;
    this.open = false;
    this.bg.setVisible(false);
    this.clearRows();
  }

  isOpen(): boolean {
    return this.open;
  }

  // MainScene calls this after applying an upgrade so the panel immediately
  // reflects the new tier (next row unlocked, just-applied row now greyed).
  refresh(): void {
    if (this.open) this.render();
  }

  containsPoint(screenX: number, screenY: number): boolean {
    if (!this.open) return false;
    return (
      screenX >= this.panelX &&
      screenX <= this.panelX + PANEL_W &&
      screenY >= this.panelY &&
      screenY <= this.panelY + this.panelH
    );
  }

  private clearRows(): void {
    for (const r of this.rows) r.destroy();
    this.rows = [];
  }

  // Builds every row at a y baseline of 0 (as if the panel started at
  // screen-y 0), measuring each description's real wrapped height along the
  // way, then shifts everything down by the final centered panelY in one
  // pass. This avoids a chicken-and-egg problem: panelY depends on the total
  // content height, which depends on wrapped text heights that only exist
  // once the Text objects are actually created.
  private render(): void {
    this.clearRows();
    const target = this.deps.target();
    if (!target) {
      this.close();
      return;
    }

    this.panelX = this.scene.scale.width / 2 - PANEL_W / 2;
    const upgrades = this.deps.upgradesFor(target.itemKey).filter((u) => this.deps.isDiscovered(u));

    let cursor = 0;
    this.addText(this.panelX + 16, cursor + 14, this.deps.displayName(target.itemKey, target.tier), 16, "#ffffff");
    this.addText(this.panelX + PANEL_W - 16, cursor + 14, "[ESC] Close", 11, "#5b6472", 1, 0);
    cursor += HEADER_H;

    if (upgrades.length === 0) {
      this.addText(this.panelX + 16, cursor + 6, "No upgrades discovered yet.", 12, "#8a93a3");
      cursor += 36;
    } else {
      for (const upg of upgrades) cursor += this.renderUpgradeRow(upg, target, cursor);
    }
    cursor += 12;

    this.panelH = cursor;
    this.panelY = this.scene.scale.height / 2 - this.panelH / 2;
    this.bg.setPosition(this.panelX, this.panelY).setSize(PANEL_W, this.panelH);
    for (const obj of this.rows) {
      (obj as unknown as { y: number }).y += this.panelY;
    }
  }

  // Returns this row's total height so the caller can advance its cursor.
  private renderUpgradeRow(upg: StationUpgradeDef, target: UpgradeTarget, rowY: number): number {
    const applied = upg.resultTier <= target.tier;
    const locked = !applied && upg.resultTier > target.tier + 1; // requires an earlier tier first
    const affordable = this.deps.canAfford(upg);
    const clickable = !applied && !locked && affordable;

    const contentX = this.panelX + 22;
    const nameColor = applied ? "#8fe38f" : clickable ? "#ffffff" : "#5b6472";
    let suffix = "";
    if (applied) suffix = "  (Applied)";
    else if (locked) suffix = "  (Requires previous tier)";
    else if (!affordable) suffix = "  (Missing materials)";

    this.addText(contentX, rowY + 8, `${upg.name}${suffix}`, 13, nameColor);
    this.addText(contentX, rowY + 26, this.deps.formatCost(upg), 11, "#8a93a3");
    const descText = this.addText(contentX, rowY + 42, upg.description, 10, "#5b6472", 0, 0, PANEL_W - 44);

    const rowH = Math.max(42 + descText.height + 10, MIN_ROW_H);

    const box = this.scene.add
      .rectangle(this.panelX + 12, rowY, PANEL_W - 24, rowH - 6, 0x14181f, 0.9)
      .setOrigin(0, 0)
      .setStrokeStyle(1, clickable ? 0x8fe38f : 0x3a4250)
      .setScrollFactor(0)
      .setDepth(DEPTH_ITEM)
      .setInteractive({ useHandCursor: clickable })
      .on("pointerover", () => {
        if (clickable) box.setFillStyle(0x1c2430, 0.9);
      })
      .on("pointerout", () => box.setFillStyle(0x14181f, 0.9))
      .on("pointerdown", () => {
        if (clickable) this.deps.apply(upg);
      });
    this.rows.push(box);

    return rowH;
  }

  private addText(
    x: number,
    y: number,
    str: string,
    size: number,
    color: string,
    originX = 0,
    originY = 0,
    wrapWidth?: number,
  ): Phaser.GameObjects.Text {
    const t = this.scene.add
      .text(x, y, str, {
        fontFamily: "monospace",
        fontSize: `${size}px`,
        color,
        wordWrap: wrapWidth ? { width: wrapWidth } : undefined,
        align: originX === 1 ? "right" : "left",
      })
      .setOrigin(originX, originY)
      .setScrollFactor(0)
      .setDepth(DEPTH_TEXT);
    this.rows.push(t);
    return t;
  }
}
