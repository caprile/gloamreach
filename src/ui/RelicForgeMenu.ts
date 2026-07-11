import Phaser from "phaser";
import type { ItemContainer } from "../systems/ItemContainer";
import { itemDef } from "../systems/Items";
import {
  RelicManager,
  RELIC_DEFS,
  TROPHY_ROLL,
  PITY_THRESHOLD,
  RARITY_COLOR,
  rarityName,
  rarityHex,
  rarityIcon,
  relicEffectText,
  type RollResult,
} from "../systems/Relics";

export interface RelicForgeMenuDeps {
  backpack: ItemContainer;
  relics: RelicManager;
  // Attempt one roll by consuming a trophy of `trophyKey` (scene consumes +
  // announces). Returns the outcome so the menu can show inline feedback.
  roll: (trophyKey: string) => RollResult | null;
}

const DEPTH_BG = 3000;
const DEPTH_ITEM = 3001;
const DEPTH_TEXT = 3002;
const DEPTH_TIP = 3010;

const CHIP_W = 84;
const CHIP_H = 62;
const CHIP_GAP = 8;
const COLS = 6;

// Roll-button layout — buttons wrap so any number of trophy types (Gremlin +
// Boar + Snake today, more with later biomes) lays out without overflowing.
const BTN_W = 250;
const BTN_H = 58;
const BTN_GAP_X = 12;
const BTN_GAP_Y = 10;
const BTN_COLS = 2;

// The Relic Forge station menu (M-RL): a probabilistic roll — 1 trophy per
// attempt, success chance by rarity, failure consumes the trophy (with a pity
// counter shown). No manual combine; duplicates auto-stack. Owned relics are a
// read-only display grid. Flat scrollFactor(0) GameObjects (no Containers), per
// the CraftingMenu.ts note.
export class RelicForgeMenu {
  private scene: Phaser.Scene;
  private deps: RelicForgeMenuDeps;
  private bg: Phaser.GameObjects.Rectangle;
  private open = false;
  private rows: Phaser.GameObjects.GameObject[] = [];
  // Last roll outcome, shown as inline feedback until the menu closes.
  private lastResult: RollResult | null = null;

  private tipBg?: Phaser.GameObjects.Rectangle;
  private tipText?: Phaser.GameObjects.Text;

  private panelX = 0;
  private panelY = 0;
  private panelW = 560;
  private panelH = 400;

  constructor(scene: Phaser.Scene, deps: RelicForgeMenuDeps) {
    this.scene = scene;
    this.deps = deps;
    this.panelX = scene.scale.width / 2 - this.panelW / 2;
    this.panelY = scene.scale.height / 2 - this.panelH / 2;
    this.bg = scene.add
      .rectangle(this.panelX, this.panelY, this.panelW, this.panelH, 0x0a0a0a, 0.95)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(DEPTH_BG)
      .setVisible(false);
  }

  openMenu(): void {
    if (this.open) return;
    this.open = true;
    this.lastResult = null;
    this.bg.setVisible(true);
    this.render();
  }

  close(): void {
    if (!this.open) return;
    this.open = false;
    this.lastResult = null;
    this.bg.setVisible(false);
    this.clearRows();
    this.hideTooltip();
  }

  isOpen(): boolean {
    return this.open;
  }

  refresh(): void {
    if (this.open) this.render();
  }

  // Called by the scene right after a roll so the outcome shows inline.
  showResult(result: RollResult | null): void {
    this.lastResult = result;
    if (this.open) this.render();
  }

  containsPoint(screenX: number, screenY: number): boolean {
    if (!this.open) return false;
    return (
      screenX >= this.panelX &&
      screenX <= this.panelX + this.panelW &&
      screenY >= this.panelY &&
      screenY <= this.panelY + this.panelH
    );
  }

  private clearRows(): void {
    for (const r of this.rows) r.destroy();
    this.rows = [];
  }

  // Trophy types shown as roll buttons: always the Common Gremlin Trophy (so the
  // mechanic is discoverable at 0), plus any other trophy the player currently
  // owns (Boar/Snake from their own elites, a fang if ever spendable).
  private visibleTrophyKeys(): string[] {
    return Object.keys(TROPHY_ROLL).filter(
      (k) => k === "gremlin_trophy" || this.deps.backpack.count(k) > 0,
    );
  }

  private render(): void {
    this.clearRows();
    this.hideTooltip();

    const groups = this.deps.relics.groupedForDisplay();
    const gridRows = Math.max(1, Math.ceil(groups.length / COLS));

    // The roll-button block wraps with the number of trophy types owned; the
    // result line + relic grid stack below it so nothing overlaps as variety
    // grows. All Y values are panel-relative offsets computed up front.
    const btnRows = Math.max(1, Math.ceil(this.visibleTrophyKeys().length / BTN_COLS));
    const rollTop = 60;
    const btnBlockH = 22 + btnRows * (BTN_H + BTN_GAP_Y);
    const resultY = rollTop + btnBlockH + 4;
    const gridTop = resultY + 42;

    this.panelH = gridTop + gridRows * (CHIP_H + CHIP_GAP) + 16;
    this.panelY = this.scene.scale.height / 2 - this.panelH / 2;
    this.bg.setPosition(this.panelX, this.panelY).setSize(this.panelW, this.panelH);

    this.addText(this.panelX + 16, this.panelY + 14, "Relic Forge", 16, "#ffffff");
    this.addText(
      this.panelX + 16,
      this.panelY + 38,
      "Feed a trophy to attempt a relic. A failed attempt still consumes the trophy.",
      11,
      "#8a93a3",
    );

    this.renderRollButtons(this.panelY + rollTop);
    this.renderResultLine(this.panelY + resultY);
    this.renderRelicGrid(this.panelY + gridTop);
  }

  // A roll button per visible trophy (see visibleTrophyKeys), wrapping into
  // rows of BTN_COLS so any number of trophy types fits the panel width.
  private renderRollButtons(y: number): void {
    const x = this.panelX + 16;
    this.addText(x, y, "Roll", 13, "#c9a86a");

    const keys = this.visibleTrophyKeys();
    keys.forEach((trophyKey, i) => {
      const col = i % BTN_COLS;
      const rowN = Math.floor(i / BTN_COLS);
      const bx = x + col * (BTN_W + BTN_GAP_X);
      const by = y + 22 + rowN * (BTN_H + BTN_GAP_Y);

      const have = this.deps.backpack.count(trophyKey);
      const t = TROPHY_ROLL[trophyKey];
      const trophyName = itemDef(trophyKey)?.name ?? trophyKey;
      const can = have >= 1;
      const pct = Math.round(t.successChance * 100);
      const pityLeft = Math.max(0, PITY_THRESHOLD[t.rarity] - this.deps.relics.missStreak(t.rarity));
      const pityStr = t.successChance >= 1 ? "guaranteed" : `${pct}% · pity in ${pityLeft}`;

      const box = this.scene.add
        .rectangle(bx, by, BTN_W, BTN_H, 0x14181f, 0.95)
        .setOrigin(0, 0)
        .setStrokeStyle(1, can ? RARITY_COLOR[t.rarity] : 0x3a4250)
        .setScrollFactor(0)
        .setDepth(DEPTH_ITEM)
        .setInteractive({ useHandCursor: can })
        .on("pointerdown", () => {
          if (can) this.showResult(this.deps.roll(trophyKey));
        });
      this.rows.push(box);

      const gem = this.scene.add
        .image(bx + 22, by + 29, rarityIcon(t.rarity))
        .setScrollFactor(0)
        .setDepth(DEPTH_ITEM + 1);
      this.rows.push(gem);

      // Label by the trophy (its name), not just its rarity, so multiple
      // same-rarity buttons are distinguishable at a glance.
      this.addText(bx + 42, by + 8, `Roll ${trophyName}`, 12, can ? rarityHex(t.rarity) : "#5a6270");
      this.addText(bx + 42, by + 26, `${rarityName(t.rarity)} · have ${have}`, 11, can ? "#c8d0da" : "#e08a8a");
      this.addText(bx + 42, by + 42, pityStr, 10, "#8a93a3");
    });
  }

  // Inline feedback for the most recent roll (success = the forged relic;
  // failure = trophy consumed). Cleared when the menu reopens.
  private renderResultLine(y: number): void {
    const x = this.panelX + 16;
    if (!this.lastResult) return;
    if (this.lastResult.success && this.lastResult.id) {
      const def = RELIC_DEFS[this.lastResult.id];
      const label = this.lastResult.pity ? " (pity)" : "";
      this.addText(x, y, `Forged: ${def.name} [${rarityName(def.rarity)}]${label}`, 13, rarityHex(def.rarity));
    } else {
      this.addText(x, y, `The trophy crumbled to dust — no relic this time.`, 13, "#c8a05a");
    }
  }

  private renderRelicGrid(top: number): void {
    const x0 = this.panelX + 16;
    this.addText(x0, top - 22, "Your Relics", 13, "#c9a86a");

    const groups = this.deps.relics.groupedForDisplay();
    if (groups.length === 0) {
      this.addText(x0, top + 6, "No relics yet — feed a Gremlin Trophy above.", 12, "#8a93a3");
      return;
    }

    groups.forEach((group, i) => {
      const col = i % COLS;
      const rowN = Math.floor(i / COLS);
      const x = x0 + col * (CHIP_W + CHIP_GAP);
      const y = top + rowN * (CHIP_H + CHIP_GAP);
      const rarity = group.def.rarity;

      const chip = this.scene.add
        .rectangle(x, y, CHIP_W, CHIP_H, 0x14181f, 0.95)
        .setOrigin(0, 0)
        .setStrokeStyle(1, RARITY_COLOR[rarity])
        .setScrollFactor(0)
        .setDepth(DEPTH_ITEM)
        .setInteractive({ useHandCursor: true })
        .on("pointerover", () => this.showTooltip(group.id, group.powerTier, x, y))
        .on("pointerout", () => this.hideTooltip());
      this.rows.push(chip);

      const gem = this.scene.add
        .image(x + CHIP_W / 2, y + 20, rarityIcon(rarity))
        .setScrollFactor(0)
        .setDepth(DEPTH_ITEM + 1);
      this.rows.push(gem);

      if (group.count > 1) {
        this.addText(x + CHIP_W - 8, y + 6, `x${group.count}`, 11, "#ffffff", 1, 0);
      }
      // Power-tier indicator (T1 today; higher tiers arrive with M-W1).
      this.addText(x + 8, y + 6, `T${group.powerTier}`, 10, "#9fd0ff", 0, 0);
      const name = group.def.name.length > 12 ? group.def.name.slice(0, 11) + "…" : group.def.name;
      this.addText(x + CHIP_W / 2, y + CHIP_H - 12, name, 10, rarityHex(rarity), 0.5, 0);
    });
  }

  private showTooltip(id: string, powerTier: number, chipX: number, chipY: number): void {
    const def = RELIC_DEFS[id];
    const str = `${def.name}\n${rarityName(def.rarity)} · Power T${powerTier}\n${relicEffectText(def, powerTier)}`;
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
    let tx = chipX + CHIP_W + 6;
    if (tx + w > this.scene.scale.width - 4) tx = chipX - w - 6;
    const ty = Phaser.Math.Clamp(chipY, 4, this.scene.scale.height - h - 4);
    this.tipBg!.setPosition(tx, ty).setSize(w, h).setVisible(true);
    this.tipText.setPosition(tx + padX, ty + padY).setVisible(true);
  }

  private hideTooltip(): void {
    this.tipBg?.setVisible(false);
    this.tipText?.setVisible(false);
  }

  private addText(
    x: number,
    y: number,
    str: string,
    size: number,
    color: string,
    originX = 0,
    originY = 0,
  ): void {
    const t = this.scene.add
      .text(x, y, str, { fontFamily: "monospace", fontSize: `${size}px`, color })
      .setOrigin(originX, originY)
      .setScrollFactor(0)
      .setDepth(DEPTH_TEXT);
    this.rows.push(t);
  }
}
