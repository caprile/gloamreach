import Phaser from "phaser";
import { RARITY_COLOR, rarityName, rarityIcon, relicEffectText, type RelicGroup } from "../systems/Relics";

const ICON = 24;
const GAP = 5;
const PER_ROW = 12; // wrap upward past this many
// Fixed-HUD depth: must clear WORLD_H (2688) so world objects never draw over
// it; below the crafting/inventory panels (3000+). Sits in the HUD band with
// the bars/minimap.
const DEPTH_ICON = 2808;
const DEPTH_BADGE = 2809;
const DEPTH_TIP = 2812;

// The owned-relics HUD strip (M-RL). A bottom-left row of rarity-colored relic
// gems, grouped by id with an "xN" count badge, growing rightward and wrapping
// UPWARD as relics accumulate. Hover shows name/rarity/effect. Rebuilt only
// when the owned set changes (the group signature), like BuffBarUI. Flat
// scrollFactor(0) GameObjects, per the CraftingMenu.ts note.
export class RelicBarUI {
  private scene: Phaser.Scene;
  private leftX = 0;
  private bottomY = 0;
  private lastSig = "";
  private entries: Phaser.GameObjects.GameObject[] = [];
  private tipBg?: Phaser.GameObjects.Rectangle;
  private tipText?: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  // Anchor: gems grow right from `leftX` and up from `bottomY` (the bottom edge
  // of the lowest row).
  layout(leftX: number, bottomY: number): void {
    this.leftX = leftX;
    this.bottomY = bottomY;
  }

  sync(groups: RelicGroup[]): void {
    const sig = groups.map((g) => `${g.id}@${g.powerTier}:${g.count}`).join(",");
    if (sig === this.lastSig) return;
    this.lastSig = sig;
    this.rebuild(groups);
  }

  private rebuild(groups: RelicGroup[]): void {
    for (const e of this.entries) e.destroy();
    this.entries = [];
    this.hideTooltip();

    groups.forEach((group, i) => {
      const col = i % PER_ROW;
      const rowN = Math.floor(i / PER_ROW);
      const x = this.leftX + col * (ICON + GAP);
      const y = this.bottomY - ICON - rowN * (ICON + GAP);
      const rarity = group.def.rarity;

      const bg = this.scene.add
        .rectangle(x, y, ICON, ICON, 0x14181f, 0.9)
        .setOrigin(0, 0)
        .setStrokeStyle(1, RARITY_COLOR[rarity])
        .setScrollFactor(0)
        .setDepth(DEPTH_ICON);
      const gem = this.scene.add
        .image(x + ICON / 2, y + ICON / 2, rarityIcon(rarity))
        .setScrollFactor(0)
        .setDepth(DEPTH_ICON);
      this.entries.push(bg, gem);

      if (group.count > 1) {
        const badge = this.scene.add
          .text(x + ICON - 1, y + ICON - 1, `${group.count}`, {
            fontFamily: "monospace",
            fontSize: "10px",
            color: "#ffffff",
            stroke: "#000000",
            strokeThickness: 3,
          })
          .setOrigin(1, 1)
          .setScrollFactor(0)
          .setDepth(DEPTH_BADGE);
        this.entries.push(badge);
      }

      // Small power-tier indicator, top-left (T1 today; higher tiers in M-W1).
      const tierBadge = this.scene.add
        .text(x + 1, y + 1, `T${group.powerTier}`, {
          fontFamily: "monospace",
          fontSize: "9px",
          color: "#9fd0ff",
          stroke: "#000000",
          strokeThickness: 3,
        })
        .setOrigin(0, 0)
        .setScrollFactor(0)
        .setDepth(DEPTH_BADGE);
      this.entries.push(tierBadge);

      const hit = this.scene.add
        .rectangle(x, y, ICON, ICON, 0xffffff, 0.001)
        .setOrigin(0, 0)
        .setScrollFactor(0)
        .setDepth(DEPTH_BADGE + 1)
        .setInteractive({ useHandCursor: true })
        .on("pointerover", () => this.showTooltip(group, x, y))
        .on("pointerout", () => this.hideTooltip());
      this.entries.push(hit);
    });
  }

  private showTooltip(group: RelicGroup, iconX: number, iconY: number): void {
    const def = group.def;
    const countStr = group.count > 1 ? ` x${group.count}` : "";
    const str = `${def.name}${countStr}\n${rarityName(def.rarity)} · Power T${group.powerTier}\n${relicEffectText(def, group.powerTier)}`;
    if (!this.tipText) {
      this.tipText = this.scene.add
        .text(0, 0, str, { fontFamily: "monospace", fontSize: "11px", color: "#e8ecf2", wordWrap: { width: 220 } })
        .setScrollFactor(0)
        .setDepth(DEPTH_TIP);
      this.tipBg = this.scene.add
        .rectangle(0, 0, 10, 10, 0x000000, 0.95)
        .setOrigin(0, 0)
        .setStrokeStyle(1, RARITY_COLOR[def.rarity])
        .setScrollFactor(0)
        .setDepth(DEPTH_TIP - 1);
    }
    this.tipText.setText(str);
    this.tipBg!.setStrokeStyle(1, RARITY_COLOR[def.rarity]);
    const padX = 8;
    const padY = 6;
    const w = this.tipText.width + padX * 2;
    const h = this.tipText.height + padY * 2;
    const tx = Phaser.Math.Clamp(iconX, 4, this.scene.scale.width - w - 4);
    const ty = Math.max(iconY - h - 6, 4);
    this.tipBg!.setPosition(tx, ty).setSize(w, h).setVisible(true);
    this.tipText.setPosition(tx + padX, ty + padY).setVisible(true);
  }

  private hideTooltip(): void {
    this.tipBg?.setVisible(false);
    this.tipText?.setVisible(false);
  }
}
