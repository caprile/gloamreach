import Phaser from "phaser";
import type { ItemContainer } from "../systems/ItemContainer";
import { itemDef } from "../systems/Items";
import {
  RelicManager,
  RELIC_DEFS,
  TROPHY_ROLL,
  PITY_THRESHOLD,
  RELIC_RARITIES,
  trophyOverallSuccessChance,
  RARITY_COLOR,
  rarityName,
  rarityHex,
  rarityIcon,
  relicEffectText,
  relicFamilyName,
  REFINE_RECIPES,
  ownedRefineInput,
  canAffordRefine,
  previewShardRefund,
  GLOAM_TO_EMBER_RATIO,
  type RefineRecipe,
  type RollResult,
  type RelicGroup,
  type RelicRarity,
  type RelicDef,
  type ChoiceResolution,
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
  // tier >= 1 (Relic Forge Lvl 2, the Gloam Conduit upgrade); the Convert tab
  // on tier >= 2 (Relic Forge Lvl 3, the Ember Kiln upgrade).
  forgeTier: () => number;
  // Convert GLOAM_TO_EMBER_RATIO Gloam Shards -> 1 Ember Shard. Called at the
  // ProgressBar's completion (commit-at-end), like refine.
  convert: () => void;
  // Resolve a pending "ambiguous" family conflict (see Relics.ts doc comment)
  // once the player picks Keep New / Keep Old. Returns the refund info so the
  // menu can update its result line, or null if there's nothing pending.
  resolveFamilyChoice: (keepNew: boolean) => ChoiceResolution | null;
}

const DEPTH_BG = 3000;
const DEPTH_ITEM = 3001;
const DEPTH_TEXT = 3002;
const DEPTH_TIP = 3010;

const CHIP_W = 84;
const CHIP_H = 62;
const CHIP_GAP = 8;
// 5 cols: 5*84 + 4*8 = 452 <= the 528px usable panel width. (Was 6, which
// overflowed the panel by ~16px once a run filled several relic families.)
const COLS = 5;
// A small "Tier N" subheader precedes each power-tier group of chips.
const TIER_HDR_H = 18;

// Roll-button layout — buttons wrap so any number of trophy types (Gremlin +
// Boar + Snake today, more with later biomes) lays out without overflowing.
const BTN_W = 250;
const BTN_H = 58;
const BTN_GAP_X = 12;
const BTN_GAP_Y = 10;
const BTN_COLS = 2;

// Refine tab timing — a quick commit-at-end bar, same feel as craft/process/cook.
const REFINE_BAR_MS = 650;

// The Relic Forge station menu (M-RL, reworked in Phase 5): a probabilistic
// roll — 1 trophy per attempt, success chance by rarity, failure consumes the
// trophy (with a pity counter shown). No manual combine. Rolling into a
// family already owned either auto-replaces (strictly better), auto-declines
// (strictly worse/equal, refunds the new roll), or asks the player to choose
// (ambiguous) — see Relics.ts. Owned relics are a read-only display grid.
// Flat scrollFactor(0) GameObjects (no Containers), per the CraftingMenu.ts note.
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

  // Roll / Refine / Convert tabs. Refine spends Gloam Shards to climb a
  // trophy's rarity into a guaranteed roll; Convert renders Gloam Shards down
  // into Ember Shards (Phase 5, the tier-2 refinement currency).
  private tab: "roll" | "refine" | "convert" = "roll";
  // Refine timed-action bar (commit-at-end + cancel-on-close, same pattern as
  // craft/process/cook). Owned here, NOT in the per-render `rows`.
  private refineBar: ProgressBar;
  private refineBusy = false;
  private refineBusyId: string | null = null;
  // Convert timed-action bar — same commit-at-end pattern, one conversion per
  // click (the player just clicks again for more).
  private convertBar: ProgressBar;
  private convertBusy = false;

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
    this.convertBar = new ProgressBar(scene, { fillColor: 0xc8641e, depth: DEPTH_TIP });
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
    // Closing with an unresolved family-conflict choice would otherwise lose
    // the just-rolled relic AND its refund into thin air (the trophy was
    // already spent) — default to declining the new roll, same as if the
    // player had clicked "Keep Old", so the spent trophy always yields
    // something.
    if (this.choicePending()) this.deps.resolveFamilyChoice(false);
    this.open = false;
    this.lastResult = null;
    this.busy = false;
    // Cancel an in-flight refine/convert cleanly — commit-at-end means nothing
    // was consumed until the bar fills, so closing mid-bar is a no-op (same as
    // craft/process/cook).
    this.refineBusy = false;
    this.refineBusyId = null;
    this.refineBar.stop();
    this.convertBusy = false;
    this.convertBar.stop();
    this.tab = "roll";
    this.revealFx.stop();
    this.bg.setVisible(false);
    this.clearRows();
    this.hideTooltip();
  }

  // A successful roll landed on a family already owned, but neither instance
  // strictly dominates the other — the player must pick Keep New / Keep Old.
  private choicePending(): boolean {
    return this.lastResult?.familyConflict?.verdict === "choice";
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
    if (this.busy || this.refineBusy || this.convertBusy || this.choicePending()) return;
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

  // Roll buttons are grouped by the (rarity, powerTier) tuple — NOT by rarity
  // alone and NOT by individual species. Species of the same rarity+tier share
  // the same odds + pity counter (5n), so collapsing them into one button is
  // pure convenience (the choice of which species to drain is mechanically
  // invisible). But power TIER is a real, player-visible knob: a Common/T1 and
  // a Common/T2 trophy produce relics of very different magnitude (×1.5), so
  // they must be SEPARATE buttons — the player picks which tier feeds the roll
  // (playtest feedback: "it's just 'roll an uncommon trophy'"). A group
  // disappears once every trophy of that rarity+tier hits 0.
  private rarityGroups(): { rarity: RelicRarity; tier: number; keys: string[]; total: number }[] {
    // Key the map on "rarity@tier" so T1 and T2 Commons stay distinct.
    const byTuple = new Map<string, { rarity: RelicRarity; tier: number; keys: string[] }>();
    for (const key of Object.keys(TROPHY_ROLL)) {
      if (this.deps.backpack.count(key) <= 0) continue;
      const { rarity, powerTier } = TROPHY_ROLL[key];
      const mapKey = `${rarity}@${powerTier}`;
      const g = byTuple.get(mapKey);
      if (g) g.keys.push(key);
      else byTuple.set(mapKey, { rarity, tier: powerTier, keys: [key] });
    }
    return Array.from(byTuple.values())
      // Stable, readable order: rarity ascending, then tier ascending.
      .sort((a, b) =>
        RELIC_RARITIES.indexOf(a.rarity) - RELIC_RARITIES.indexOf(b.rarity) || a.tier - b.tier,
      )
      .map((g) => ({
        ...g,
        total: g.keys.reduce((sum, k) => sum + this.deps.backpack.count(k), 0),
      }));
  }

  // Which specific trophy key a group's button actually consumes — whichever
  // species (within the same rarity+tier) the player currently has the most
  // of, so stock drains evenly across species rather than always favoring one.
  private pickTrophyToRoll(keys: string[]): string {
    return keys.reduce((best, k) => (this.deps.backpack.count(k) > this.deps.backpack.count(best) ? k : best));
  }

  // The Refine tab only exists once the forge is Lvl 2 (Gloam Conduit
  // upgrade); Convert only exists at Lvl 3 (Ember Kiln upgrade).
  private refineUnlocked(): boolean {
    return this.deps.forgeTier() >= 1;
  }
  private convertUnlocked(): boolean {
    return this.deps.forgeTier() >= 2;
  }

  private render(): void {
    this.clearRows();
    this.hideTooltip();
    // A tab is hidden entirely below its unlock tier — never leave the menu
    // stuck on a tab that isn't shown.
    if (this.tab === "refine" && !this.refineUnlocked()) this.tab = "roll";
    if (this.tab === "convert" && !this.convertUnlocked()) this.tab = "roll";
    if (this.tab === "refine") this.renderRefine();
    else if (this.tab === "convert") this.renderConvert();
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
    // A tab is hidden entirely until the forge reaches its unlock tier — no
    // locked tab, no hint.
    const tabs: { id: "roll" | "refine" | "convert"; label: string }[] = [{ id: "roll", label: "Bind" }];
    if (this.refineUnlocked()) tabs.push({ id: "refine", label: "Refine" });
    if (this.convertUnlocked()) tabs.push({ id: "convert", label: "Convert" });
    const TW = 76;
    const TH = 22;
    const GAP = 6;
    // Don't switch tabs mid-action, or with an unresolved family-choice
    // pending (switching away would otherwise let the player dodge it).
    const locked = this.busy || this.refineBusy || this.convertBusy || this.choicePending();
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

    // The roll-button block wraps with the number of rarity groups owned; the
    // result line + relic grid stack below it so nothing overlaps as variety
    // grows. A pending family-conflict choice needs extra room for its two
    // buttons. All Y values are panel-relative offsets computed up front.
    const btnRows = Math.max(1, Math.ceil(this.rarityGroups().length / BTN_COLS));
    const rollTop = 96; // below title + tabs + subtitle
    const btnBlockH = 22 + btnRows * (BTN_H + BTN_GAP_Y);
    const resultY = rollTop + btnBlockH + 4;
    // Reserve exactly the vertical space the result region needs so the grid's
    // own "Your Relics" header (drawn at gridTop-22) always clears it:
    //   • no result yet          — just the grid's header gap.
    //   • plain success / fail    — one 13px line.
    //   • auto-resolved conflict  — that line + a second (refund) line.
    //   • unresolved "choice"     — the Keep New / Keep Old button block.
    const conflict = this.lastResult?.familyConflict;
    let resultBlockH: number;
    if (!this.lastResult) resultBlockH = 24;
    else if (conflict?.verdict === "choice") resultBlockH = 134;
    else if (conflict) resultBlockH = 64;
    else resultBlockH = 46;
    const gridTop = resultY + resultBlockH;

    this.panelH = gridTop + this.relicGridHeight(groups) + 16;
    this.layoutPanel();
    this.renderHeader("Feed a trophy to attempt a relic. A failed attempt still consumes the trophy.");
    this.renderRollButtons(this.panelY + rollTop);
    this.renderResultLine(this.panelY + resultY);
    this.renderRelicGrid(this.panelY + gridTop);
  }

  // Owned relics grouped by power tier (ascending) — so a run can see, at a
  // glance, what its T1 relics get displaced by as T2 badlands relics roll in.
  // Within a tier the groups keep groupedForDisplay()'s rarity-then-name order.
  private groupsByTier(groups: RelicGroup[]): { tier: number; groups: RelicGroup[] }[] {
    const byTier = new Map<number, RelicGroup[]>();
    for (const g of groups) {
      const list = byTier.get(g.powerTier);
      if (list) list.push(g);
      else byTier.set(g.powerTier, [g]);
    }
    return Array.from(byTier.keys())
      .sort((a, b) => a - b)
      .map((tier) => ({ tier, groups: byTier.get(tier)! }));
  }

  // Total height the tier-grouped relic grid occupies below its `top` anchor
  // (the "Your Relics" header sits ABOVE top, so it isn't counted here).
  private relicGridHeight(groups: RelicGroup[]): number {
    if (groups.length === 0) return 24; // just the "no relics yet" line
    let h = 0;
    for (const t of this.groupsByTier(groups)) {
      h += TIER_HDR_H + Math.ceil(t.groups.length / COLS) * (CHIP_H + CHIP_GAP);
    }
    return h;
  }

  // The Convert tab (Phase 5, Ember Kiln): render GLOAM_TO_EMBER_RATIO Gloam
  // Shards down into 1 Ember Shard, one click per conversion.
  private renderConvert(): void {
    if (!this.convertUnlocked()) {
      this.renderRoll();
      return;
    }
    const listTop = 96;
    this.panelH = listTop + 100;
    this.layoutPanel();
    this.renderHeader("Render Gloam Shards down into Ember — the tier-2 refinement currency.");

    const gloam = this.deps.backpack.count("gloam_shard");
    const ember = this.deps.backpack.count("ember_shard");
    const x = this.panelX + 16;
    const y = this.panelY + listTop;
    const w = this.panelW - 32;
    const h = 72;

    const box = this.scene.add
      .rectangle(x, y, w, h, 0x14181f, 0.95)
      .setOrigin(0, 0)
      .setStrokeStyle(1, 0xc8641e)
      .setScrollFactor(0)
      .setDepth(DEPTH_ITEM);
    this.rows.push(box);

    const emberDef = itemDef("ember_shard");
    if (emberDef) {
      const img = this.scene.add.image(x + 22, y + h / 2, emberDef.texture).setScrollFactor(0).setDepth(DEPTH_ITEM + 1);
      this.rows.push(img);
    }
    const can = gloam >= GLOAM_TO_EMBER_RATIO && !this.convertBusy;
    this.addText(x + 44, y + 8, `${GLOAM_TO_EMBER_RATIO} Gloam Shard -> 1 Ember Shard`, 13, "#e8923c");
    this.addText(x + 44, y + 28, `Gloam Shards  ${gloam}/${GLOAM_TO_EMBER_RATIO}`, 11, gloam >= GLOAM_TO_EMBER_RATIO ? "#c8d0da" : "#e08a8a");
    this.addText(x + 44, y + 44, `Ember Shards owned: ${ember}`, 11, "#8a93a3");

    const btnW = 110;
    const btnH = 30;
    const bx = x + w - btnW - 10;
    const by = y + h / 2 - btnH / 2;
    const btn = this.scene.add
      .rectangle(bx, by, btnW, btnH, can ? 0x2a2333 : 0x14181f, 0.95)
      .setOrigin(0, 0)
      .setStrokeStyle(1, can ? 0xe8923c : 0x3a4250)
      .setScrollFactor(0)
      .setDepth(DEPTH_ITEM)
      .setInteractive({ useHandCursor: can })
      .on("pointerdown", () => {
        if (can) this.beginConvert(bx, by, btnW, btnH);
      });
    this.rows.push(btn);
    this.addText(bx + btnW / 2, by + btnH / 2, this.convertBusy ? "Rendering…" : "Convert", 12, can ? "#f0c090" : "#6a7280", 0.5, 0.5);
    if (this.convertBusy) this.convertBar.setPosition(bx, by).setSize(btnW, btnH);
  }

  // Commit-at-end, same pattern as beginRefine.
  private beginConvert(bx: number, by: number, bw: number, bh: number): void {
    if (this.convertBusy || this.busy || this.refineBusy) return;
    this.convertBusy = true;
    this.render();
    this.convertBar.setPosition(bx, by).setSize(bw, bh);
    this.convertBar.start(REFINE_BAR_MS, {
      onComplete: () => {
        this.convertBusy = false;
        this.deps.convert();
        if (this.open) this.render();
      },
    });
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

  // One roll button per owned (rarity, power-tier) group (see rarityGroups),
  // wrapping into rows of BTN_COLS. Consuming a group's button picks whichever
  // species trophy is most plentiful (pickTrophyToRoll) — odds/pity are
  // identical across species of the same rarity+tier, so that choice is purely
  // about draining stock evenly. Power TIER, by contrast, IS a player-visible
  // decision (T1 vs T2 differ in relic magnitude), so it splits the buttons.
  private renderRollButtons(y: number): void {
    const x = this.panelX + 16;
    this.addText(x, y, "Bind", 13, "#c9a86a");

    const groups = this.rarityGroups();
    if (groups.length === 0) {
      this.addText(x, y + 26, "No trophies — defeat elite enemies to earn them.", 12, "#8a93a3");
      return;
    }
    groups.forEach((group, i) => {
      const col = i % BTN_COLS;
      const rowN = Math.floor(i / BTN_COLS);
      const bx = x + col * (BTN_W + BTN_GAP_X);
      const by = y + 22 + rowN * (BTN_H + BTN_GAP_Y);

      const rarity = group.rarity;
      const can = group.total >= 1 && !this.choicePending();
      const overall = trophyOverallSuccessChance(rarity);
      const pct = Math.round(overall * 100);
      const pityLeft = Math.max(0, PITY_THRESHOLD[rarity] - this.deps.relics.missStreak(rarity));
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
        .setStrokeStyle(1, can ? RARITY_COLOR[rarity] : 0x3a4250)
        .setScrollFactor(0)
        .setDepth(DEPTH_ITEM)
        .setInteractive({ useHandCursor: can && !this.busy })
        .on("pointerdown", () => {
          if (can && !this.busy) this.beginRoll(this.pickTrophyToRoll(group.keys));
        });
      this.rows.push(box);

      const gem = this.scene.add
        .image(bx + 22, by + 29, rarityIcon(rarity))
        .setScrollFactor(0)
        .setDepth(DEPTH_ITEM + 1);
      this.rows.push(gem);

      this.addText(bx + 42, by + 8, `Roll a ${rarityName(rarity)} Trophy (T${group.tier})`, 12, can ? rarityHex(rarity) : "#5a6270");
      this.addText(bx + 42, by + 26, `have ${group.total}`, 11, can ? "#c8d0da" : "#e08a8a");
      this.addText(bx + 42, by + 42, pityStr, 10, "#8a93a3");
    });
  }

  // Inline feedback for the most recent roll (success = the forged relic;
  // failure = trophy consumed). A family conflict extends this with either an
  // auto-resolved refund line or, if ambiguous, a Keep New / Keep Old choice.
  // Cleared when the menu reopens.
  private renderResultLine(y: number): void {
    const x = this.panelX + 16;
    if (!this.lastResult) return;
    if (!this.lastResult.success || !this.lastResult.id) {
      this.addText(x, y, `The trophy crumbled to dust — no relic this time.`, 13, "#c8a05a");
      return;
    }
    const def = RELIC_DEFS[this.lastResult.id];
    const label = this.lastResult.pity ? " (pity)" : "";
    this.addText(x, y, `Forged: ${def.name} [${rarityName(def.rarity)}]${label}`, 13, rarityHex(def.rarity));

    const conflict = this.lastResult.familyConflict;
    if (!conflict) return;
    const oldDef = RELIC_DEFS[conflict.oldId];
    if (conflict.verdict === "replaced") {
      // No shard refund on displacement anymore (see Relics.shardRefund) — the
      // suffix only appears if a nonzero amount is ever restored.
      this.addText(x, y + 20, `Replaced ${oldDef.name}${this.refundSuffix(conflict.refundShardKey, conflict.refundShardAmount)}`, 11, "#9fd0ff");
    } else if (conflict.verdict === "declined") {
      this.addText(x, y + 20, `${oldDef.name} was already better${this.refundSuffix(conflict.refundShardKey, conflict.refundShardAmount)}`, 11, "#9fd0ff");
    } else {
      this.renderFamilyChoice(x, y + 20, def, oldDef, this.lastResult.id, this.lastResult.powerTier!, conflict.oldId, conflict.oldPowerTier);
    }
  }

  // " — +N Shard" suffix, or "" when the refund is zero (the default now that
  // displacement gives nothing back — see Relics.shardRefund).
  private refundSuffix(shardKey: string | undefined, amount: number | undefined): string {
    if (!shardKey || !amount || amount <= 0) return "";
    const shardName = itemDef(shardKey)?.name ?? shardKey;
    return ` — +${amount} ${shardName}`;
  }

  // Both relics claim the same family and neither dominates (e.g. a differing
  // secondary stat) — let the player pick which one to keep. The other is
  // discarded (no shard refund anymore — see Relics.shardRefund). Blocks
  // rolling/tab-switching until resolved (see choicePending()).
  private renderFamilyChoice(
    x: number,
    y: number,
    newDef: RelicDef,
    oldDef: RelicDef,
    newId: string,
    newTier: number,
    oldId: string,
    oldTier: number,
  ): void {
    // Name the relic this would displace — "Forged: {new} [rarity]" is already
    // on the line above, so this reads as "{new} forged … Replace {old}?".
    this.addText(x, y, `Replace ${oldDef.name}?`, 11, "#c8a05a");
    const newRefund = previewShardRefund(oldId, oldTier);
    const oldRefund = previewShardRefund(newId, newTier);
    const rowY = y + 16;
    const btnW = (this.panelW - 32 - 10) / 2;
    const btnH = 52;

    const drawChoice = (bx: number, def: RelicDef, tier: number, refundKey: string, refundAmt: number, onPick: () => void) => {
      const box = this.scene.add
        .rectangle(bx, rowY, btnW, btnH, 0x14181f, 0.95)
        .setOrigin(0, 0)
        .setStrokeStyle(1, RARITY_COLOR[def.rarity])
        .setScrollFactor(0)
        .setDepth(DEPTH_ITEM)
        .setInteractive({ useHandCursor: true })
        .on("pointerdown", onPick);
      this.rows.push(box);
      this.addText(bx + 8, rowY + 6, `Keep ${def.name}`, 12, rarityHex(def.rarity));
      this.addText(bx + 8, rowY + 22, relicEffectText(def, tier), 10, "#8a93a3");
      // Refund line only when something is actually restored (zero by default
      // now — displacement is no longer a shard source; see Relics.shardRefund).
      const line = refundAmt > 0 ? `discards other → +${refundAmt} ${itemDef(refundKey)?.name ?? refundKey}` : "discards the other relic";
      this.addText(bx + 8, rowY + 34, line, 9, "#6a7280");
    };

    drawChoice(x, newDef, newTier, newRefund.refundShardKey, newRefund.refundShardAmount, () => this.resolveChoice(true));
    drawChoice(x + btnW + 10, oldDef, oldTier, oldRefund.refundShardKey, oldRefund.refundShardAmount, () => this.resolveChoice(false));
  }

  private resolveChoice(keepNew: boolean): void {
    if (!this.choicePending()) return;
    const resolution = this.deps.resolveFamilyChoice(keepNew);
    if (!resolution || !this.lastResult?.familyConflict) return;
    this.lastResult = {
      ...this.lastResult,
      familyConflict: {
        ...this.lastResult.familyConflict,
        verdict: keepNew ? "replaced" : "declined",
        refundShardKey: resolution.refundShardKey,
        refundShardAmount: resolution.refundShardAmount,
      },
    };
    this.render();
  }

  private renderRelicGrid(top: number): void {
    const x0 = this.panelX + 16;
    this.addText(x0, top - 22, "Your Relics", 13, "#c9a86a");

    const groups = this.displayGroups();
    if (groups.length === 0) {
      this.addText(x0, top + 6, "No relics yet — feed a trophy above to forge one.", 12, "#8a93a3");
      return;
    }

    // Grouped by power tier (each tier gets a subheader), chips wrapping at COLS
    // within the tier. Lets the player see a T1 relic sitting alongside the T2
    // that would displace it.
    let y = top;
    for (const t of this.groupsByTier(groups)) {
      this.addText(x0, y, `Tier ${t.tier}`, 10, "#9fd0ff");
      y += TIER_HDR_H;
      t.groups.forEach((group, i) => {
        const col = i % COLS;
        const rowN = Math.floor(i / COLS);
        const x = x0 + col * (CHIP_W + CHIP_GAP);
        const cy = y + rowN * (CHIP_H + CHIP_GAP);
        const rarity = group.def.rarity;

        const chip = this.scene.add
          .rectangle(x, cy, CHIP_W, CHIP_H, 0x14181f, 0.95)
          .setOrigin(0, 0)
          .setStrokeStyle(1, RARITY_COLOR[rarity])
          .setScrollFactor(0)
          .setDepth(DEPTH_ITEM)
          .setInteractive({ useHandCursor: true })
          .on("pointerover", () => this.showTooltip(group.id, group.powerTier, x, cy))
          .on("pointerout", () => this.hideTooltip());
        this.rows.push(chip);

        const gem = this.scene.add
          .image(x + CHIP_W / 2, cy + 22, rarityIcon(rarity))
          .setScrollFactor(0)
          .setDepth(DEPTH_ITEM + 1);
        this.rows.push(gem);

        // Family label top-left so it's clear which loadout slot this fills.
        this.addText(x + 6, cy + 6, relicFamilyName(group.family), 8, "#7f8a99", 0, 0);
        const name = group.def.name.length > 12 ? group.def.name.slice(0, 11) + "…" : group.def.name;
        this.addText(x + CHIP_W / 2, cy + CHIP_H - 12, name, 10, rarityHex(rarity), 0.5, 0);
      });
      y += Math.ceil(t.groups.length / COLS) * (CHIP_H + CHIP_GAP);
    }
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
