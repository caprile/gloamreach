import Phaser from "phaser";

// Anything the big boss bar can display — the Gremlin King (mid-boss) or the
// Duneshaper (final boss). A tiny structural interface instead of importing a
// concrete class, so each boss just exposes its own poise scale via poiseMax.
export interface BossBarTarget {
  displayName: string;
  health: number;
  maxHealth: number;
  poise: number;
  poiseMax: number;
  depleted: boolean;
  isEngaged(): boolean;
}

// Fixed top-of-screen boss encounter bar (Elden Ring/Valheim-style — big,
// impossible to miss, not the small floating world-space bar every regular
// enemy gets). Shows whichever big boss (Gremlin King / Duneshaper) is engaged.
// Visible only while that boss is currently engaged (aggro'd) and not yet
// defeated — same gating condition the floating bars already use, just surfaced
// somewhere the player can't miss mid-fight.
const BAR_W = 560;
const HP_BAR_H = 28;
const POISE_BAR_H = 16; // the ask was a bigger NUMBER, not a thicker bar (20 overshot); a numeric label carries the rest
const GAP = 5;
const TOP_MARGIN = 16;
const DEPTH = 2950; // clears WORLD_H/other fixed HUD (2800-2902), stays below CraftingMenu/InventoryMenu (3000+) and Tooltip (4500)

export class BossHealthUI {
  private nameText: Phaser.GameObjects.Text;
  private hpBarBg: Phaser.GameObjects.Rectangle;
  private hpBarFill: Phaser.GameObjects.Rectangle;
  private poiseBarBg: Phaser.GameObjects.Rectangle;
  private poiseBarFill: Phaser.GameObjects.Rectangle;
  private poiseText: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene) {
    const barX = scene.scale.width / 2 - BAR_W / 2;
    const nameY = TOP_MARGIN;
    const barY = nameY + 26;
    const poiseY = barY + HP_BAR_H + GAP;

    this.nameText = scene.add
      .text(scene.scale.width / 2, nameY, "", {
        fontFamily: "monospace",
        fontSize: "24px",
        color: "#f0d080",
        stroke: "#000000",
        strokeThickness: 5,
      })
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(DEPTH)
      .setVisible(false);

    this.hpBarBg = scene.add
      .rectangle(barX, barY, BAR_W, HP_BAR_H, 0x1a0808, 0.9)
      .setOrigin(0, 0)
      .setStrokeStyle(2, 0x000000, 0.9)
      .setScrollFactor(0)
      .setDepth(DEPTH)
      .setVisible(false);
    this.hpBarFill = scene.add
      .rectangle(barX + 2, barY + 2, BAR_W - 4, HP_BAR_H - 4, 0xc41e1e, 1)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(DEPTH + 1)
      .setVisible(false);

    this.poiseBarBg = scene.add
      .rectangle(barX, poiseY, BAR_W, POISE_BAR_H, 0x1a1608, 0.9)
      .setOrigin(0, 0)
      .setStrokeStyle(2, 0x000000, 0.9)
      .setScrollFactor(0)
      .setDepth(DEPTH)
      .setVisible(false);
    this.poiseBarFill = scene.add
      .rectangle(barX + 2, poiseY + 2, BAR_W - 4, POISE_BAR_H - 4, 0xe8c040, 1)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(DEPTH + 1)
      .setVisible(false);

    // Numeric readout ("42/70") centered over the poise bar — the bar alone
    // read as too thin to judge at a glance even at 20px tall; a real number
    // is what players actually wanted (the user).
    this.poiseText = scene.add
      .text(scene.scale.width / 2, poiseY + POISE_BAR_H / 2, "", {
        fontFamily: "monospace",
        fontSize: "14px",
        color: "#ffffff",
        stroke: "#000000",
        strokeThickness: 3,
      })
      .setOrigin(0.5, 0.5)
      .setScrollFactor(0)
      .setDepth(DEPTH + 2)
      .setVisible(false);
  }

  update(boss: BossBarTarget | null): void {
    const visible = !!boss && !boss.depleted && boss.isEngaged();
    // A poise bar only makes sense for a boss with a poise/stagger meter. Some
    // mini-bosses (Cinderwrought/Kilnborn/Palewake/Sanguinarch) run a different
    // second mechanic (heat/tether/blood-phase) or none, and pass poiseMax 0 —
    // for those, the HP bar shows alone (no empty poise strip).
    const showPoise = visible && !!boss && boss.poiseMax > 0;
    this.nameText.setVisible(visible);
    this.hpBarBg.setVisible(visible);
    this.hpBarFill.setVisible(visible);
    this.poiseBarBg.setVisible(showPoise);
    this.poiseBarFill.setVisible(showPoise);
    this.poiseText.setVisible(showPoise);
    if (!boss || !visible) return;

    this.nameText.setText(boss.displayName);
    this.hpBarFill.setScale(Math.max(0, boss.health / boss.maxHealth), 1);
    if (showPoise) {
      this.poiseBarFill.setScale(Math.max(0, boss.poise / boss.poiseMax), 1);
      this.poiseText.setText(`${Math.round(boss.poise)}/${boss.poiseMax}`);
    }
  }
}
