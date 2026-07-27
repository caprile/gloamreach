import Phaser from "phaser";
import { bindFrame } from "./frames";

// Fixed-HUD depth band (must clear WORLD_H 2688; below the 3000+ menus). Sits
// just above the passive bar's band (2832-2835) so they never fight.
const DEPTH_BG = 2836;
const DEPTH_ICON = 2837;
const DEPTH_OVERLAY = 2838;
const DEPTH_TEXT = 2839;
// Above the hotbar (2900-2902) so a hover tooltip renders in front of it.
const DEPTH_TIP = 2955;

const ICON = 44;
const GAP = 6;
// Key letters sit in a strip BELOW each slot (centered) so they never overlap
// the slot's cooldown numeric / sweep (the user). The whole bar bottom-aligns to
// the anchor, with this strip as its bottom band.
const LABEL_H = 18;

const EMPTY_BORDER = 0x3a4150;
const READY_BORDER = 0x8fb4ff;
const ACTIVE_BORDER = 0xff5a6a;
// Matches DEBUFF_DEFS.silence's accent, so the ability bar and the status icon
// naming the cause are visibly the same colour.
const SILENCED_BORDER = 0x8a5cc4;
const SILENCED_TINT = 0x9a8ab0;

// One Q/E/R ability slot's live state, rebuilt each frame by MainScene. An
// empty slot (no granting item equipped) still renders — a dim frame with its
// key letter — the Dota-style "you could put an ability here" affordance.
export interface AbilityBarEntry {
  key: "q" | "e" | "r";
  abilityId?: string; // undefined = slot empty
  texture?: string; // ability icon (present when equipped)
  name?: string;
  desc?: string;
  cooldownMs: number;
  cooldownRemainingMs: number; // 0 = ready
  active?: boolean; // in its active window (e.g. Bloodpact lifelink) — glows
  // SILENCED (bayou debuff system): the whole bar is locked out. Rendered as a
  // desaturated icon + a violet border rather than the cooldown sweep, because
  // "on cooldown" and "you cannot cast at all" are different problems and a
  // player mid-fight has to tell them apart at a glance.
  silenced?: boolean;
}

interface Slot {
  key: string;
  bg: Phaser.GameObjects.Rectangle;
  frame: Phaser.GameObjects.NineSlice | null;
  glow: Phaser.GameObjects.Rectangle;
  icon: Phaser.GameObjects.Image;
  keyBg: Phaser.GameObjects.Rectangle;
  keyLabel: Phaser.GameObjects.Text;
  cdOverlay: Phaser.GameObjects.Rectangle;
  cdText: Phaser.GameObjects.Text;
  hit: Phaser.GameObjects.Rectangle;
  x: number;
  y: number;
}

// The Dota-2-style ability bar: a fixed row of Q/E/R slots near the hotbar.
// Empty slots show a dim frame + key letter; equipped slots fill with the
// ability icon, a top-down cooldown sweep + numeric seconds while re-arming, and
// an active-window glow (Bloodpact). Hover shows name/description/cooldown. Flat
// scrollFactor(0) GameObjects (per the CraftingMenu note — never nest interactive
// UI in a scroll-locked Container). The slot set is constant, so it's built once
// and updated in place — no structural rebuild.
export class AbilityBarUI {
  private scene: Phaser.Scene;
  private leftX = 0; // left edge; slots grow RIGHT (hotbar sits to the left)
  private bottomY = 0;
  private slots: Slot[] = [];
  private hoveredKey: string | null = null;
  private tipBg?: Phaser.GameObjects.Rectangle;
  private tipText?: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  // Anchor at the given left edge / bottom; Q is nearest the anchor, then E, R.
  layout(leftX: number, bottomY: number): void {
    this.leftX = leftX;
    this.bottomY = bottomY;
    if (this.slots.length === 0) this.build();
    else this.reposition();
  }

  private slotXY(i: number): { x: number; y: number } {
    // Slots sit above the label strip, the whole bar bottom-aligned to bottomY.
    return { x: this.leftX + i * (ICON + GAP), y: this.bottomY - ICON - LABEL_H };
  }

  // Which Q/E/R slot (0..2) is under a SCREEN point, or null. Mirrors
  // HotbarUI.slotAt so MainScene.resolveItemDrag can treat this bar as a drop
  // target — dragging an ability item onto the HUD bar is the gesture players
  // reach for first (the user: "need to be able to drag abilities straight to
  // hotbar"), rather than opening the inventory to find the paper-doll slots.
  slotAt(screenX: number, screenY: number): number | null {
    for (let i = 0; i < 3; i++) {
      const { x, y } = this.slotXY(i);
      if (screenX >= x && screenX <= x + ICON && screenY >= y && screenY <= y + ICON) return i;
    }
    return null;
  }

  private build(): void {
    const keys = ["q", "e", "r"];
    keys.forEach((key, i) => {
      const { x, y } = this.slotXY(i);
      const glow = this.scene.add
        .rectangle(x - 2, y - 2, ICON + 4, ICON + 4, 0xffffff, 0)
        .setOrigin(0, 0)
        .setScrollFactor(0)
        .setDepth(DEPTH_BG - 1);
      const bg = this.scene.add
        .rectangle(x, y, ICON, ICON, 0x0e1218, 0.9)
        .setOrigin(0, 0)
        .setStrokeStyle(2, EMPTY_BORDER)
        .setScrollFactor(0)
        .setDepth(DEPTH_BG);
      // Bound (not per-render) because these slots are built once and only
      // repositioned; the follower keeps the frame on the moving rectangle.
      const frame = bindFrame(bg, "slot");
      const icon = this.scene.add
        .image(x + ICON / 2, y + ICON / 2, "ability_blink")
        .setScrollFactor(0)
        .setDepth(DEPTH_ICON)
        .setVisible(false);
      // Key letter centered in a chip BELOW the slot — off the slot face entirely,
      // so it never overlaps the cooldown numeric/sweep, and large enough that an
      // "E" doesn't read as an "F" at play size (the user).
      const lx = x + ICON / 2;
      const ly = y + ICON + LABEL_H / 2;
      const keyBg = this.scene.add
        .rectangle(lx, ly, 22, LABEL_H - 2, 0x0a0d12, 0.85)
        .setOrigin(0.5, 0.5)
        .setScrollFactor(0)
        .setDepth(DEPTH_TEXT);
      const keyLabel = this.scene.add
        .text(lx, ly, key.toUpperCase(), {
          fontFamily: "monospace",
          fontSize: "17px",
          fontStyle: "bold",
          color: "#bfe0ff",
          stroke: "#000000",
          strokeThickness: 2,
        })
        .setOrigin(0.5, 0.5)
        .setScrollFactor(0)
        .setDepth(DEPTH_TEXT);
      const cdOverlay = this.scene.add
        .rectangle(x, y, ICON, 0, 0x05070b, 0.64)
        .setOrigin(0, 0)
        .setScrollFactor(0)
        .setDepth(DEPTH_OVERLAY)
        .setVisible(false);
      const cdText = this.scene.add
        .text(x + ICON / 2, y + ICON / 2, "", {
          fontFamily: "monospace",
          fontSize: "18px",
          fontStyle: "bold",
          color: "#ffffff",
          stroke: "#000000",
          strokeThickness: 4,
        })
        .setOrigin(0.5, 0.5)
        .setScrollFactor(0)
        .setDepth(DEPTH_TEXT)
        .setVisible(false);
      const hit = this.scene.add
        .rectangle(x, y, ICON, ICON, 0xffffff, 0.001)
        .setOrigin(0, 0)
        .setScrollFactor(0)
        .setDepth(DEPTH_TEXT + 1)
        .setInteractive({ useHandCursor: true })
        .on("pointerover", () => {
          this.hoveredKey = key;
        })
        .on("pointerout", () => {
          if (this.hoveredKey === key) this.hoveredKey = null;
          this.hideTooltip();
        });
      this.slots.push({ key, bg, frame, glow, icon, keyBg, keyLabel, cdOverlay, cdText, hit, x, y });
    });
  }

  private reposition(): void {
    this.slots.forEach((s, i) => {
      const { x, y } = this.slotXY(i);
      s.x = x;
      s.y = y;
      s.glow.setPosition(x - 2, y - 2);
      s.bg.setPosition(x, y);
      s.icon.setPosition(x + ICON / 2, y + ICON / 2);
      const lx = x + ICON / 2;
      const ly = y + ICON + LABEL_H / 2;
      s.keyBg.setPosition(lx, ly);
      s.keyLabel.setPosition(lx, ly);
      s.cdOverlay.setPosition(x, y);
      s.cdText.setPosition(x + ICON / 2, y + ICON / 2);
      s.hit.setPosition(x, y);
    });
  }

  // Border colour is the slot's state tell. With art on the edge it's a tint on
  // the frame; without art it stays the flat stroke it always was.
  private setSlotBorder(s: { bg: Phaser.GameObjects.Rectangle; frame: Phaser.GameObjects.NineSlice | null }, color: number): void {
    if (s.frame) s.frame.setTint(color);
    else s.bg.setStrokeStyle(2, color);
  }

  // Called every frame with the live Q/E/R state.
  update(entries: AbilityBarEntry[]): void {
    for (const e of entries) {
      const s = this.slots.find((sl) => sl.key === e.key);
      if (!s) continue;
      const equipped = !!e.abilityId;
      if (equipped && e.texture) {
        // Greyed + dimmed while silenced — the icon itself carries the state,
        // so the lockout is legible even at the edge of vision.
        s.icon.setVisible(true).setTexture(e.texture).setAlpha(e.silenced ? 0.35 : 1);
        s.icon.setTint(e.silenced ? SILENCED_TINT : 0xffffff);
        this.fitIcon(s.icon);
      } else {
        s.icon.setVisible(false);
      }
      // Border / glow: silenced (violet) > active window (crimson) > ready
      // (blue) > empty (dim). Silence wins because it overrides all of them —
      // an ability in its active window still cannot be recast while locked.
      if (e.silenced) {
        this.setSlotBorder(s, SILENCED_BORDER);
        s.glow.setFillStyle(SILENCED_BORDER, 0.22);
      } else if (e.active) {
        this.setSlotBorder(s, ACTIVE_BORDER);
        s.glow.setFillStyle(ACTIVE_BORDER, 0.3);
      } else if (equipped) {
        this.setSlotBorder(s, READY_BORDER);
        s.glow.setFillStyle(0xffffff, 0);
      } else {
        this.setSlotBorder(s, EMPTY_BORDER);
        s.glow.setFillStyle(0xffffff, 0);
      }
      // Cooldown sweep + numeric — only when equipped, off its active window,
      // and still re-arming. The overlay drains from the top down.
      const onCd = equipped && !e.active && e.cooldownRemainingMs > 0 && e.cooldownMs > 0;
      if (onCd) {
        const frac = Phaser.Math.Clamp(e.cooldownRemainingMs / e.cooldownMs, 0, 1);
        s.cdOverlay.setVisible(true).setSize(ICON, Math.round(frac * ICON));
        s.cdText.setVisible(true).setText(`${Math.ceil(e.cooldownRemainingMs / 1000)}`);
      } else {
        s.cdOverlay.setVisible(false);
        s.cdText.setVisible(false);
      }
    }
    if (this.hoveredKey) {
      const e = entries.find((x) => x.key === this.hoveredKey);
      if (e) this.showTooltip(e);
      else this.hideTooltip();
    }
  }

  private fitIcon(icon: Phaser.GameObjects.Image): void {
    const box = ICON - 12;
    const w = icon.width || 1;
    const h = icon.height || 1;
    icon.setScale(Math.min(box / w, box / h, 2.4));
  }

  private showTooltip(e: AbilityBarEntry): void {
    const s = this.slots.find((sl) => sl.key === e.key);
    if (!s) return;
    const title = e.name ?? `${e.key.toUpperCase()} — empty`;
    let body: string;
    if (!e.abilityId) {
      body = "Equip a special item to gain this ability.";
    } else {
      const cdSecs = Math.round(e.cooldownMs / 1000);
      const state = e.active
        ? "Active now"
        : e.cooldownRemainingMs > 0
          ? `Ready in ${Math.ceil(e.cooldownRemainingMs / 1000)}s`
          : "Ready";
      body = `${e.desc ?? ""}\nCooldown: ${cdSecs}s · ${state}`;
    }
    const str = `[${e.key.toUpperCase()}] ${title}\n${body}`;
    if (!this.tipText) {
      this.tipText = this.scene.add
        .text(0, 0, str, { fontFamily: "monospace", fontSize: "14px", color: "#e8ecf2", wordWrap: { width: 240 } })
        .setScrollFactor(0)
        .setDepth(DEPTH_TIP);
      this.tipBg = this.scene.add
        .rectangle(0, 0, 10, 10, 0x000000, 0.95)
        .setOrigin(0, 0)
        .setScrollFactor(0)
        .setDepth(DEPTH_TIP - 1);
    }
    this.tipText.setText(str);
    this.tipBg!.setStrokeStyle(1, e.active ? ACTIVE_BORDER : READY_BORDER);
    const padX = 8;
    const padY = 6;
    const w = this.tipText.width + padX * 2;
    const h = this.tipText.height + padY * 2;
    const tx = Phaser.Math.Clamp(s.x + ICON / 2 - w / 2, 4, this.scene.scale.width - w - 4);
    const ty = Math.max(s.y - h - 8, 4);
    this.tipBg!.setPosition(tx, ty).setSize(w, h).setVisible(true);
    this.tipText.setPosition(tx + padX, ty + padY).setVisible(true);
  }

  private hideTooltip(): void {
    this.tipBg?.setVisible(false);
    this.tipText?.setVisible(false);
  }
}
