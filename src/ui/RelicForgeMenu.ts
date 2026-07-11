import Phaser from "phaser";
import type { ItemContainer } from "../systems/ItemContainer";
import { itemDef } from "../systems/Items";
import {
  RelicManager,
  RELIC_DEFS,
  TROPHY_ROLL,
  PITY_THRESHOLD,
  trophyOverallSuccessChance,
  RARITY_COLOR,
  rarityName,
  rarityHex,
  rarityIcon,
  relicEffectText,
  REFINE_RECIPES,
  ownedRefineInput,
  canAffordRefine,
  type RefineRecipe,
  type RollResult,
  type RelicGroup,
} from "../systems/Relics";
import { RelicRevealFx } from "./RelicRevealFx";
import { ProgressBar } from "./ProgressBar";

export interface RelicForgeMenuDeps {
  backpack: ItemContainer;
  relics: RelicManager;
  // Attempt one roll by consuming a trophy of `trophyKey`. The scene consumes
  // the trophy + mutates RelicManager immediately, but does NOT announce (the
  // menu's slot-machine reveal defers that to announceRoll). Returns the
  // resolved outcome so the reveal knows what to land on.
  roll: (trophyKey: string) => RollResult | null;
  // Fired when the reveal animation lands — the scene logs the result + syncs
  // the HUD relic bar / stat bonuses at the satisfying moment, not at click.
  announceRoll: (result: RollResult | null) => void;
  // Refine raw trophies + Gloam Shards into a refined trophy (Gloaming Vein
  // loop). The scene consumes inputs + grants the output + logs. Called at the
  // ProgressBar's completion (commit-at-end).
  refine: (recipeId: string) => void;
  // The open forge's upgrade tier (0 = Lvl 1). The Refine tab is gated on
  // tier >= 1 (Relic Forge Lvl 2, the Gloam Conduit upgrade).
  forgeTier: () => number;
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

// Refine tab timing — a quick commit-at-end bar, same feel as craft/process/cook.
const REFINE_BAR_MS = 650;

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
  // Last roll outcome, shown as inline feedback until the menu closes. Set at
  // REVEAL time (not click), so the line matches the slot-machine landing.
  private lastResult: RollResult | null = null;
  // The slot-machine spin/reveal; `busy` blocks a second roll mid-spin.
  private revealFx: RelicRevealFx;
  private busy = false;
  // Snapshot of the owned-relic grid as it was BEFORE the in-flight roll. The
  // roll mutates RelicManager immediately (so an interrupted spin can't change
  // the outcome), but the grid must keep showing the pre-roll set until the
  // reveal lands — otherwise a new relic pops into the grid before the spin
  // even resolves, spoiling it.
  private preRollGroups: RelicGroup[] | null = null;

  // Roll vs Refine tab (Gloaming Vein). The Refine tab spends Gloam Shards to
  // climb a trophy's rarity into a guaranteed roll.
  private tab: "roll" | "refine" = "roll";
  // Refine timed-action bar (commit-at-end + cancel-on-close, same pattern as
  // craft/process/cook). Owned here, NOT in the per-render `rows`.
  private refineBar: ProgressBar;
  private refineBusy = false;
  private refineBusyId: string | null = null;

  private tipBg?: Phaser.GameObjects.Rectangle;
  private tipText?: Phaser.GameObjects.Text;

  private panelX = 0;
  private panelY = 0;
  private panelW = 560;
  private panelH = 400;

  constructor(scene: Phaser.Scene, deps: RelicForgeMenuDeps) {
    this.scene = scene;
    this.deps = deps;
    this.revealFx = new RelicRevealFx(scene);
    this.refineBar = new ProgressBar(scene, { fillColor: 0xb069e8, depth: DEPTH_TIP });
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
    this.busy = false;
    // Cancel an in-flight refine cleanly — commit-at-end means nothing was
    // consumed until the bar fills, so closing mid-bar is a no-op (same as
    // craft/process/cook).
    this.refineBusy = false;
    this.refineBusyId = null;
    this.refineBar.stop();
    this.tab = "roll";
    this.revealFx.stop();
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

  // Consume the trophy + resolve the roll immediately (so state is correct even
  // if the spin is interrupted), then play the slot-machine spin over a KNOWN
  // outcome. The reveal landing is when we announce + show the result line.
  private beginRoll(trophyKey: string): void {
    if (this.busy || this.refineBusy) return;
    // Freeze the grid to its pre-roll contents BEFORE mutating the manager, so
    // the spin can play over a grid that doesn't already show the new relic.
    this.preRollGroups = this.deps.relics.groupedForDisplay();
    const result = this.deps.roll(trophyKey);
    this.busy = true;
    this.lastResult = null;
    this.render(); // clear any prior result line + grey the buttons under the scrim
    const bounds = { x: this.panelX, y: this.panelY, w: this.panelW, h: this.panelH };
    this.revealFx.spin(bounds, result, () => {
      this.busy = false;
      this.preRollGroups = null;
      this.lastResult = result;
      this.deps.announceRoll(result);
      if (this.open) this.render();
    });
  }

  // The owned-relic grid renders this snapshot while a roll is spinning, else
  // the live set. Centralizes the "hold the grid until reveal lands" rule.
  private displayGroups(): RelicGroup[] {
    return this.busy && this.preRollGroups ? this.preRollGroups : this.deps.relics.groupedForDisplay();
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

  // Trophy types shown as roll buttons: every trophy the player currently owns
  // (Gremlin/Boar/Snake from their own elites, a fang if ever spendable). A
  // trophy button disappears at 0 like every other — the old special-case that
  // kept the Gremlin Trophy button pinned at 0 read as a stuck/broken button
  // next to the others vanishing. With none owned, an empty-state note keeps
  // the forge's purpose clear.
  private visibleTrophyKeys(): string[] {
    return Object.keys(TROPHY_ROLL).filter((k) => this.deps.backpack.count(k) > 0);
  }

  // The Refine tab only exists once the forge is Lvl 2 (Gloam Conduit upgrade).
  private refineUnlocked(): boolean {
    return this.deps.forgeTier() >= 1;
  }

  private render(): void {
    this.clearRows();
    this.hideTooltip();
    // Refine is hidden entirely below Lvl 2 — never leave the menu stuck on a
    // tab that isn't shown.
    if (this.tab === "refine" && !this.refineUnlocked()) this.tab = "roll";
    if (this.tab === "refine") this.renderRefine();
    else this.renderRoll();
  }

  // Re-center the panel vertically for the current panelH and repaint the bg.
  private layoutPanel(): void {
    this.panelY = this.scene.scale.height / 2 - this.panelH / 2;
    this.bg.setPosition(this.panelX, this.panelY).setSize(this.panelW, this.panelH);
  }

  // Shared header: title, Roll/Refine tab buttons, and a per-tab subtitle. Must
  // run AFTER layoutPanel so panelY is final.
  private renderHeader(subtitle: string): void {
    this.addText(this.panelX + 16, this.panelY + 14, "Relic Forge", 16, "#ffffff");
    this.renderTabs(this.panelY + 40);
    this.addText(this.panelX + 16, this.panelY + 70, subtitle, 11, "#8a93a3");
  }

  private renderTabs(y: number): void {
    // The Refine tab is hidden entirely until the forge is Lvl 2 — no locked
    // tab, no hint.
    const tabs: { id: "roll" | "refine"; label: string }[] = [{ id: "roll", label: "Bind" }];
    if (this.refineUnlocked()) tabs.push({ id: "refine", label: "Refine" });
    const TW = 90;
    const TH = 22;
    const GAP = 6;
    const locked = this.busy || this.refineBusy; // don't switch tabs mid-action
    tabs.forEach((t, i) => {
      const x = this.panelX + 16 + i * (TW + GAP);
      const active = this.tab === t.id;
      const box = this.scene.add
        .rectangle(x, y, TW, TH, active ? 0x2a2333 : 0x14181f, 0.95)
        .setOrigin(0, 0)
        .setStrokeStyle(1, active ? 0xc264d8 : 0x3a4250)
        .setScrollFactor(0)
        .setDepth(DEPTH_ITEM)
        .setInteractive({ useHandCursor: !active && !locked })
        .on("pointerdown", () => {
          if (this.tab !== t.id && !locked) {
            this.tab = t.id;
            this.lastResult = null;
            this.render();
          }
        });
      this.rows.push(box);
      this.addText(x + TW / 2, y + TH / 2, t.label, 12, active ? "#e6b8f0" : "#8a93a3", 0.5, 0.5);
    });
  }

  private renderRoll(): void {
    const groups = this.displayGroups();
    const gridRows = Math.max(1, Math.ceil(groups.length / COLS));

    // The roll-button block wraps with the number of trophy types owned; the
    // result line + relic grid stack below it so nothing overlaps as variety
    // grows. All Y values are panel-relative offsets computed up front.
    const btnRows = Math.max(1, Math.ceil(this.visibleTrophyKeys().length / BTN_COLS));
    const rollTop = 96; // below title + tabs + subtitle
    const btnBlockH = 22 + btnRows * (BTN_H + BTN_GAP_Y);
    const resultY = rollTop + btnBlockH + 4;
    const gridTop = resultY + 42;

    this.panelH = gridTop + gridRows * (CHIP_H + CHIP_GAP) + 16;
    this.layoutPanel();
    this.renderHeader("Feed a trophy to attempt a relic. A failed attempt still consumes the trophy.");
    this.renderRollButtons(this.panelY + rollTop);
    this.renderResultLine(this.panelY + resultY);
    this.renderRelicGrid(this.panelY + gridTop);
  }

  // The Refine tab (Gloaming Vein): spend Gloam Shards to climb a trophy's
  // rarity one step into a guaranteed-success roll. Only recipes with at least
  // one eligible input owned surface, so the tab reads empty until the player
  // has both trophies and shards to work with.
  private renderRefine(): void {
    // Only reachable at Lvl 2 — render() forces the Roll tab below that, and the
    // Refine tab button isn't drawn until unlocked (renderTabs).
    if (!this.refineUnlocked()) {
      this.renderRoll();
      return;
    }

    const count = (k: string) => this.deps.backpack.count(k);
    const recipes = REFINE_RECIPES.filter((r) => ownedRefineInput(r, count) > 0);
    const ROW_H = 72;
    const listTop = 96;

    this.panelH = listTop + Math.max(1, recipes.length) * (ROW_H + 8) + 20;
    this.layoutPanel();
    this.renderHeader("Spend Gloam Shards to refine trophies one rarity up into a guaranteed roll.");

    if (recipes.length === 0) {
      this.addText(
        this.panelX + 16,
        this.panelY + listTop,
        "Nothing to refine yet. Mine Gloam Shards at a Gloaming Vein,\nand bring the raw trophies to refine.",
        12,
        "#8a93a3",
      );
      return;
    }
    recipes.forEach((recipe, i) => this.renderRefineRow(recipe, this.panelY + listTop + i * (ROW_H + 8), ROW_H));
  }

  private renderRefineRow(recipe: RefineRecipe, y: number, h: number): void {
    const count = (k: string) => this.deps.backpack.count(k);
    const x = this.panelX + 16;
    const w = this.panelW - 32;

    const box = this.scene.add
      .rectangle(x, y, w, h, 0x14181f, 0.95)
      .setOrigin(0, 0)
      .setStrokeStyle(1, 0x7a3ec8)
      .setScrollFactor(0)
      .setDepth(DEPTH_ITEM);
    this.rows.push(box);

    const outDef = itemDef(recipe.output);
    if (outDef) {
      const img = this.scene.add.image(x + 22, y + h / 2, outDef.texture).setScrollFactor(0).setDepth(DEPTH_ITEM + 1);
      this.rows.push(img);
    }

    const owned = ownedRefineInput(recipe, count);
    const shards = count(recipe.shardKey);
    const trophyOk = owned >= recipe.inputCount;
    const shardOk = shards >= recipe.shardCount;
    const shardName = itemDef(recipe.shardKey)?.name ?? recipe.shardKey;

    this.addText(x + 44, y + 8, `→ ${outDef?.name ?? recipe.output}`, 13, "#c79cf0");
    this.addText(x + 44, y + 28, `${rarityName(recipe.inputRarity)} trophies  ${owned}/${recipe.inputCount}`, 11, trophyOk ? "#c8d0da" : "#e08a8a");
    this.addText(x + 44, y + 44, `${shardName}  ${shards}/${recipe.shardCount}`, 11, shardOk ? "#c8d0da" : "#e08a8a");

    const can = canAffordRefine(recipe, count);
    const isBusyRow = this.refineBusy && this.refineBusyId === recipe.id;
    const btnW = 110;
    const btnH = 30;
    const bx = x + w - btnW - 10;
    const by = y + h / 2 - btnH / 2;
    const btn = this.scene.add
      .rectangle(bx, by, btnW, btnH, can && !isBusyRow ? 0x2a2333 : 0x14181f, 0.95)
      .setOrigin(0, 0)
      .setStrokeStyle(1, can && !isBusyRow ? 0xc264d8 : 0x3a4250)
      .setScrollFactor(0)
      .setDepth(DEPTH_ITEM)
      .setInteractive({ useHandCursor: can && !this.refineBusy })
      .on("pointerdown", () => {
        if (can && !this.refineBusy && !this.busy) this.beginRefine(recipe.id, bx, by, btnW, btnH);
      });
    this.rows.push(btn);
    this.addText(bx + btnW / 2, by + btnH / 2, isBusyRow ? "Refining…" : "Refine", 12, can && !isBusyRow ? "#e6b8f0" : "#6a7280", 0.5, 0.5);

    // Re-pin the progress bar over the busy row after this render pass.
    if (isBusyRow) this.refineBar.setPosition(bx, by).setSize(btnW, btnH);
  }

  // Commit-at-end: nothing is consumed until the bar fills (deps.refine runs in
  // onComplete). Closing the menu mid-bar cancels cleanly.
  private beginRefine(recipeId: string, bx: number, by: number, bw: number, bh: number): void {
    if (this.refineBusy || this.busy) return;
    this.refineBusy = true;
    this.refineBusyId = recipeId;
    this.render(); // grey the button + show "Refining…"
    this.refineBar.setPosition(bx, by).setSize(bw, bh);
    this.refineBar.start(REFINE_BAR_MS, {
      onComplete: () => {
        this.refineBusy = false;
        this.refineBusyId = null;
        this.deps.refine(recipeId); // consume inputs + grant output + log (its refresh re-renders)
        if (this.open) this.render();
      },
    });
  }

  // A roll button per visible trophy (see visibleTrophyKeys), wrapping into
  // rows of BTN_COLS so any number of trophy types fits the panel width.
  private renderRollButtons(y: number): void {
    const x = this.panelX + 16;
    this.addText(x, y, "Bind", 13, "#c9a86a");

    const keys = this.visibleTrophyKeys();
    if (keys.length === 0) {
      this.addText(x, y + 26, "No trophies — defeat elite enemies to earn them.", 12, "#8a93a3");
      return;
    }
    keys.forEach((trophyKey, i) => {
      const col = i % BTN_COLS;
      const rowN = Math.floor(i / BTN_COLS);
      const bx = x + col * (BTN_W + BTN_GAP_X);
      const by = y + 22 + rowN * (BTN_H + BTN_GAP_Y);

      const have = this.deps.backpack.count(trophyKey);
      const t = TROPHY_ROLL[trophyKey];
      const trophyName = itemDef(trophyKey)?.name ?? trophyKey;
      const can = have >= 1;
      const overall = trophyOverallSuccessChance(t.rarity);
      const pct = Math.round(overall * 100);
      const pityLeft = Math.max(0, PITY_THRESHOLD[t.rarity] - this.deps.relics.missStreak(t.rarity));
      // First roll of a run is a guaranteed success — surface the hook.
      const pityStr =
        overall >= 1
          ? "guaranteed"
          : this.deps.relics.isFirstRollPending()
            ? `${pct}% · first roll guaranteed`
            : `${pct}% · pity in ${pityLeft}`;

      const box = this.scene.add
        .rectangle(bx, by, BTN_W, BTN_H, 0x14181f, 0.95)
        .setOrigin(0, 0)
        .setStrokeStyle(1, can ? RARITY_COLOR[t.rarity] : 0x3a4250)
        .setScrollFactor(0)
        .setDepth(DEPTH_ITEM)
        .setInteractive({ useHandCursor: can && !this.busy })
        .on("pointerdown", () => {
          if (can && !this.busy) this.beginRoll(trophyKey);
        });
      this.rows.push(box);

      const gem = this.scene.add
        .image(bx + 22, by + 29, rarityIcon(t.rarity))
        .setScrollFactor(0)
        .setDepth(DEPTH_ITEM + 1);
      this.rows.push(gem);

      // Label by the trophy (its name), not just its rarity, so multiple
      // same-rarity buttons are distinguishable at a glance.
      this.addText(bx + 42, by + 8, `Bind ${trophyName}`, 12, can ? rarityHex(t.rarity) : "#5a6270");
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

    const groups = this.displayGroups();
    if (groups.length === 0) {
      this.addText(x0, top + 6, "No relics yet — feed a trophy above to forge one.", 12, "#8a93a3");
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
