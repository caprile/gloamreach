import Phaser from "phaser";

// A negative status effect currently on the player. Built fresh each frame by
// MainScene from live system state (poison/bleed managers, the environment
// query) — this UI owns no state of its own beyond its GameObjects.
//
// `remainingMs`/`durationMs` are OPTIONAL because debuffs come in two flavors:
// TIMED ones that tick down on their own (poison, bleed) get a depletion meter,
// while CONDITIONAL ones that last exactly as long as you stand somewhere
// (slowed, no-regen) have no meaningful duration and simply show while active.
export interface StatusEffect {
  id: string;
  name: string;
  icon: string;
  detail: string; // tooltip line 2 — the actual mechanical effect
  color: number; // accent (border + meter)
  remainingMs?: number;
  durationMs?: number;
}

// 26 -> 42 (the user, 2026-07-26: "the status debuffs are kinda small today").
// Two reasons beyond preference: the status art is authored at 32px, so a 26px
// box was rendering it OVERSIZED and clipped by its own frame; and the bayou
// debuff system means this row now carries lockouts you must react to, not just
// DoT tickers you can note in passing. 42 fits the 32px art with a real margin.
const ICON = 42;
const GAP = 8;
// The art is 32px; anything larger (or a future 16px icon) is fitted to the box
// rather than trusted to be the right size.
const ICON_ART_BOX = 32;
// Sits in the same HUD band as the buff bar (2803/2804) — see BuffBarUI's note
// on clearing WORLD_H so world objects never draw over it.
const DEPTH_ICON = 2803;
const DEPTH_BAR = 2804;
const DEPTH_TIP = 2955;

interface Entry {
  effect: StatusEffect;
  bg: Phaser.GameObjects.Rectangle;
  icon: Phaser.GameObjects.Image;
  meterBg?: Phaser.GameObjects.Rectangle;
  meter?: Phaser.GameObjects.Rectangle;
  hit: Phaser.GameObjects.Rectangle;
  timeText?: Phaser.GameObjects.Text;
}

// The active-DEBUFF HUD: a centered row of status icons sitting just above the
// buff bar, so buffs (green, below) and debuffs (red/amber, above) read as two
// clearly separated bands. Deliberately GENERIC rather than a poison-specific
// indicator — bleed had shipped since the badlands with no HUD tell at all, and
// every future debuff now gets an icon for free by adding one row to MainScene's
// statusEffects().
//
// Red/amber here is the sanctioned use of those colors per the standing
// "reserve red/green for buff/debuff deltas" convention — this IS the debuff
// case they were reserved for.
//
// Structure mirrors BuffBarUI: rebuild the row only when the SET of active
// effects changes, update meters/timers/tooltip every frame. Flat
// scrollFactor(0) GameObjects, per the CraftingMenu.ts note.
export class StatusBarUI {
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

  // Icons are centered on `centerX` and bottom-aligned at `bottomY`.
  layout(centerX: number, bottomY: number): void {
    this.centerX = centerX;
    this.bottomY = bottomY;
  }

  sync(effects: StatusEffect[]): void {
    const ids = effects.map((e) => e.id).join(",");
    if (ids !== this.lastIds) {
      this.rebuild(effects);
      this.lastIds = ids;
    }
    for (const eff of effects) {
      const e = this.entries.get(eff.id);
      if (!e) continue;
      e.effect = eff; // keep live values for the tooltip
      if (e.meter && eff.remainingMs !== undefined && eff.durationMs) {
        e.meter.setScale(Phaser.Math.Clamp(eff.remainingMs / eff.durationMs, 0, 1), 1);
      }
      if (e.timeText && eff.remainingMs !== undefined) {
        e.timeText.setText(`${Math.ceil(eff.remainingMs / 1000)}`);
      }
    }
    if (this.hoveredId) {
      const e = this.entries.get(this.hoveredId);
      if (e) this.updateTooltip(e);
      else this.hideTooltip();
    }
  }

  private rebuild(effects: StatusEffect[]): void {
    for (const e of this.entries.values()) {
      e.bg.destroy();
      e.icon.destroy();
      e.meterBg?.destroy();
      e.meter?.destroy();
      e.timeText?.destroy();
      e.hit.destroy();
    }
    this.entries.clear();
    this.hideTooltip();
    this.hoveredId = null;
    if (effects.length === 0) return;

    const n = effects.length;
    const totalW = n * ICON + (n - 1) * GAP;
    let x = this.centerX - totalW / 2;
    const y = this.bottomY - ICON;

    for (const eff of effects) {
      const timed = eff.remainingMs !== undefined && !!eff.durationMs;
      const bg = this.scene.add
        .rectangle(x, y, ICON, ICON, 0x1d1416, 0.92)
        .setOrigin(0, 0)
        .setStrokeStyle(1, eff.color)
        .setScrollFactor(0)
        .setDepth(DEPTH_ICON);
      const icon = this.scene.add
        .image(x + ICON / 2, y + ICON / 2 - 1, eff.icon)
        .setScrollFactor(0)
        .setDepth(DEPTH_ICON);
      icon.setScale(Math.min(ICON_ART_BOX / (icon.width || 1), ICON_ART_BOX / (icon.height || 1)));
      let meterBg: Phaser.GameObjects.Rectangle | undefined;
      let meter: Phaser.GameObjects.Rectangle | undefined;
      let timeText: Phaser.GameObjects.Text | undefined;
      if (timed) {
        meterBg = this.scene.add
          .rectangle(x + 3, y + ICON - 6, ICON - 6, 4, 0x000000, 0.6)
          .setOrigin(0, 0)
          .setScrollFactor(0)
          .setDepth(DEPTH_BAR);
        meter = this.scene.add
          .rectangle(x + 3, y + ICON - 6, ICON - 6, 4, eff.color, 1)
          .setOrigin(0, 0)
          .setScrollFactor(0)
          .setDepth(DEPTH_BAR);
        // Seconds remaining, readable at a glance without hovering — a DoT's
        // remaining time is the one number you actually act on.
        timeText = this.scene.add
          .text(x + ICON - 3, y + 1, "", {
            fontFamily: "monospace",
            fontSize: "15px",
            fontStyle: "bold",
            color: "#ffe0e0",
            stroke: "#000000",
            strokeThickness: 3,
          })
          .setOrigin(1, 0)
          .setScrollFactor(0)
          .setDepth(DEPTH_BAR + 1);
      }
      const hit = this.scene.add
        .rectangle(x, y, ICON, ICON, 0xffffff, 0.001)
        .setOrigin(0, 0)
        .setScrollFactor(0)
        .setDepth(DEPTH_BAR + 2)
        .setInteractive({ useHandCursor: true })
        .on("pointerover", () => {
          this.hoveredId = eff.id;
        })
        .on("pointerout", () => {
          if (this.hoveredId === eff.id) this.hoveredId = null;
          this.hideTooltip();
        });

      this.entries.set(eff.id, { effect: eff, bg, icon, meterBg, meter, hit, timeText });
      x += ICON + GAP;
    }
  }

  private updateTooltip(e: Entry): void {
    const eff = e.effect;
    const secs =
      eff.remainingMs !== undefined ? ` · ${Math.ceil(eff.remainingMs / 1000)}s left` : "";
    const str = `${eff.name}\n${eff.detail}${secs}`;
    if (!this.tipText) {
      this.tipText = this.scene.add
        .text(0, 0, str, { fontFamily: "monospace", fontSize: "13px", color: "#f2e8e8" })
        .setScrollFactor(0)
        .setDepth(DEPTH_TIP);
      this.tipBg = this.scene.add
        .rectangle(0, 0, 10, 10, 0x000000, 0.92)
        .setOrigin(0, 0)
        .setStrokeStyle(1, 0x6e5555)
        .setScrollFactor(0)
        .setDepth(DEPTH_TIP - 1);
    }
    this.tipText.setText(str);
    const padX = 8;
    const padY = 6;
    const w = this.tipText.width + padX * 2;
    const h = this.tipText.height + padY * 2;
    let tx = e.bg.x + ICON / 2 - w / 2;
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
