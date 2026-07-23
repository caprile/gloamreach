import Phaser from "phaser";

// Fixed-HUD depth band (must clear WORLD_H 2688; below the 3000+ menus).
const DEPTH_ICON = 2832;
const DEPTH_OVERLAY = 2833;
const DEPTH_BADGE = 2834;
const DEPTH_HIT = 2835;
// Above the hotbar (2900-2902) so a hover tooltip near it renders IN FRONT of the
// hotbar, not behind it (the user); still below the 3000+ menus.
const DEPTH_TIP = 2955;

const ICON = 36;
const GAP = 5;
const PER_ROW = 9; // wrap UP past this many

// One passive/proc the player currently has — a relic, an armor set-bonus, or a
// proc with live state. MainScene rebuilds the list each frame; the bar diffs the
// `key`s to decide when to rebuild structure, and updates count/cooldown/ready
// overlays in place every frame.
export interface PassiveEntry {
  key: string; // stable id for structure diffing
  texture: string; // icon texture key
  borderColor: number;
  name: string; // tooltip title
  desc: string; // tooltip effect / trigger line(s)
  badge?: string; // small top-left tag (e.g. "T2")
  // Onslaught-style counter: shows `cur` and glows when the NEXT hit procs.
  count?: { cur: number; max: number };
  // Cooldown fill: 1 = ready (no overlay), <1 = fraction charged (dark cover over
  // the top part, draining down as it re-arms). undefined = an always-on passive.
  cooldown01?: number;
  ready?: boolean; // proc armed/ready right now → highlight the border
}

interface Slot {
  bg: Phaser.GameObjects.Rectangle;
  icon: Phaser.GameObjects.Image;
  badge?: Phaser.GameObjects.Text;
  cdOverlay: Phaser.GameObjects.Rectangle;
  countText: Phaser.GameObjects.Text;
  glow: Phaser.GameObjects.Rectangle;
  hit: Phaser.GameObjects.Rectangle;
  x: number;
  y: number;
  baseColor: number;
}

// A Dota-style passive/proc icon strip that sits to the LEFT of the hotbar
// (the user): relic passives + armor set-bonuses + proc counters/cooldowns, all as
// hoverable squares that read cleanly together. Replaces the old bottom-left relic
// gem bar + the mid-left proc bar. Flat scrollFactor(0) GameObjects (per the
// CraftingMenu note — never nest interactive UI in a scroll-locked Container).
export class PassiveBarUI {
  private scene: Phaser.Scene;
  private rightX = 0; // right edge (nearest the hotbar); icons grow LEFT
  private bottomY = 0; // bottom edge; rows stack UP
  private slots: Slot[] = [];
  private sig = "";
  private tipBg?: Phaser.GameObjects.Rectangle;
  private tipText?: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  // Anchor at the hotbar's left edge / bottom; icon 0 is nearest the hotbar.
  layout(rightX: number, bottomY: number): void {
    this.rightX = rightX;
    this.bottomY = bottomY;
  }

  sync(entries: PassiveEntry[]): void {
    const sig = entries.map((e) => `${e.key}|${e.texture}|${e.borderColor}|${e.badge ?? ""}`).join(",");
    if (sig !== this.sig) {
      this.sig = sig;
      this.rebuild(entries);
    }
    this.updateDynamic(entries);
  }

  private slotXY(i: number): { x: number; y: number } {
    const col = i % PER_ROW;
    const row = Math.floor(i / PER_ROW);
    return {
      x: this.rightX - ICON - col * (ICON + GAP),
      y: this.bottomY - ICON - row * (ICON + GAP),
    };
  }

  private rebuild(entries: PassiveEntry[]): void {
    for (const s of this.slots) {
      s.bg.destroy();
      s.icon.destroy();
      s.badge?.destroy();
      s.cdOverlay.destroy();
      s.countText.destroy();
      s.glow.destroy();
      s.hit.destroy();
    }
    this.slots = [];
    this.hideTooltip();

    entries.forEach((e, i) => {
      const { x, y } = this.slotXY(i);
      const glow = this.scene.add
        .rectangle(x - 2, y - 2, ICON + 4, ICON + 4, 0xffd24a, 0.0)
        .setOrigin(0, 0)
        .setScrollFactor(0)
        .setDepth(DEPTH_ICON - 1);
      const bg = this.scene.add
        .rectangle(x, y, ICON, ICON, 0x14181f, 0.92)
        .setOrigin(0, 0)
        .setStrokeStyle(2, e.borderColor)
        .setScrollFactor(0)
        .setDepth(DEPTH_ICON);
      const icon = this.scene.add
        .image(x + ICON / 2, y + ICON / 2, e.texture)
        .setScrollFactor(0)
        .setDepth(DEPTH_ICON);
      this.fitIcon(icon);
      const cdOverlay = this.scene.add
        .rectangle(x, y, ICON, 0, 0x05070b, 0.62)
        .setOrigin(0, 0)
        .setScrollFactor(0)
        .setDepth(DEPTH_OVERLAY)
        .setVisible(false);
      const countText = this.scene.add
        .text(x + ICON - 2, y + ICON - 2, "", {
          fontFamily: "monospace",
          fontSize: "15px",
          fontStyle: "bold",
          color: "#ffe08a",
          stroke: "#000000",
          strokeThickness: 3,
        })
        .setOrigin(1, 1)
        .setScrollFactor(0)
        .setDepth(DEPTH_BADGE)
        .setVisible(false);
      let badge: Phaser.GameObjects.Text | undefined;
      if (e.badge) {
        badge = this.scene.add
          .text(x + 1, y + 1, e.badge, {
            fontFamily: "monospace",
            fontSize: "11px",
            color: "#9fd0ff",
            stroke: "#000000",
            strokeThickness: 3,
          })
          .setOrigin(0, 0)
          .setScrollFactor(0)
          .setDepth(DEPTH_BADGE);
      }
      const hit = this.scene.add
        .rectangle(x, y, ICON, ICON, 0xffffff, 0.001)
        .setOrigin(0, 0)
        .setScrollFactor(0)
        .setDepth(DEPTH_HIT)
        .setInteractive({ useHandCursor: true });
      const idx = i;
      hit.on("pointerover", () => this.showTooltip(entries[idx] ?? e, x, y));
      hit.on("pointerout", () => this.hideTooltip());
      this.slots.push({ bg, icon, badge, cdOverlay, countText, glow, hit, x, y, baseColor: e.borderColor });
    });
  }

  private updateDynamic(entries: PassiveEntry[]): void {
    entries.forEach((e, i) => {
      const s = this.slots[i];
      if (!s) return;
      // Cooldown cover: dark rect over the TOP `(1-cd)` of the icon, draining down.
      if (e.cooldown01 !== undefined && e.cooldown01 < 1) {
        const h = Math.round((1 - Phaser.Math.Clamp(e.cooldown01, 0, 1)) * ICON);
        s.cdOverlay.setVisible(true).setSize(ICON, h);
      } else {
        s.cdOverlay.setVisible(false);
      }
      // Counter (Onslaught): show the current tick.
      if (e.count) {
        s.countText.setVisible(true).setText(`${e.count.cur}`);
      } else {
        s.countText.setVisible(false);
      }
      // Ready/armed highlight: brighten the border + a soft glow.
      if (e.ready) {
        s.bg.setStrokeStyle(2, 0xffe066);
        s.glow.setFillStyle(0xffd24a, 0.28);
      } else {
        s.bg.setStrokeStyle(2, s.baseColor);
        s.glow.setFillStyle(0xffd24a, 0.0);
      }
    });
  }

  private fitIcon(icon: Phaser.GameObjects.Image): void {
    const box = ICON - 10;
    const w = icon.width || 1;
    const h = icon.height || 1;
    const scale = Math.min(box / w, box / h, 2.2);
    icon.setScale(scale);
  }

  private showTooltip(e: PassiveEntry, iconX: number, iconY: number): void {
    const str = `${e.name}\n${e.desc}`;
    if (!this.tipText) {
      this.tipText = this.scene.add
        .text(0, 0, str, { fontFamily: "monospace", fontSize: "14px", color: "#e8ecf2", wordWrap: { width: 230 } })
        .setScrollFactor(0)
        .setDepth(DEPTH_TIP);
      this.tipBg = this.scene.add
        .rectangle(0, 0, 10, 10, 0x000000, 0.95)
        .setOrigin(0, 0)
        .setScrollFactor(0)
        .setDepth(DEPTH_TIP - 1);
    }
    this.tipText.setText(str);
    this.tipBg!.setStrokeStyle(1, e.borderColor);
    const padX = 8;
    const padY = 6;
    const w = this.tipText.width + padX * 2;
    const h = this.tipText.height + padY * 2;
    const tx = Phaser.Math.Clamp(iconX + ICON / 2 - w / 2, 4, this.scene.scale.width - w - 4);
    const ty = Math.max(iconY - h - 8, 4);
    this.tipBg!.setPosition(tx, ty).setSize(w, h).setVisible(true);
    this.tipText.setPosition(tx + padX, ty + padY).setVisible(true);
  }

  private hideTooltip(): void {
    this.tipBg?.setVisible(false);
    this.tipText?.setVisible(false);
  }
}
