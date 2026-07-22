import Phaser from "phaser";
import type { StationUpgradeDef } from "../systems/StationUpgrades";
import type { ArmorUpgradeDef } from "../systems/ArmorUpgrades";
import type { WeaponUpgradeDef } from "../systems/WeaponUpgrades";
import type { ToolUpgradeDef } from "../systems/ToolUpgrades";
import { isGearAugment, MAX_AUGMENTS_PER_ITEM, type GearAugmentDef } from "../systems/GearAugments";
import { ProgressBar } from "./ProgressBar";

// A short "upgrading…" bar plays over the clicked row before the tier lands —
// same commit-at-end feel as craft/process/cook (ProgressBar / roadmap 5p).
const UPGRADE_BAR_MS = 500;

// A placed station's upgrade, a worn armor piece's upgrade, or an owned
// weapon's upgrade — all three share the same shape the UI actually reads
// (name/description/resultTier/costs), so one panel serves all of them
// without a generic type parameter.
export type UpgradeDef =
  | StationUpgradeDef
  | ArmorUpgradeDef
  | WeaponUpgradeDef
  | ToolUpgradeDef
  | GearAugmentDef;

export interface UpgradeTarget {
  itemKey: string;
  tier: number;
}

export interface UpgradeMenuDeps {
  // The placed object / equipped armor slot the popup's "Upgrade" action was
  // opened for, or null once closed. Re-read every render so it reflects
  // live tier changes.
  target: () => UpgradeTarget | null;
  upgradesFor: (itemKey: string) => UpgradeDef[];
  isDiscovered: (upg: UpgradeDef) => boolean;
  canAfford: (upg: UpgradeDef) => boolean;
  // Non-null when the target is a placed station/processor: the set of upgrade
  // ids it has already applied. Its presence switches the panel into the
  // no-ladder model — every discovered, not-yet-applied upgrade is offerable
  // (no "requires previous tier"), and applying any one is +1 level. Null (or
  // absent) for worn weapon/armor, which keep the resultTier ladder.
  appliedUpgradeIds?: () => Set<string> | null;
  // Non-null when the target is an augmentable gear INSTANCE (Biome-3 Phase 3):
  // the gem-augment ids already applied to it. Augment rows always run the
  // no-ladder model regardless of whether the target is also on a tier ladder —
  // a piece can hold both (Lvl 2/3 tiers AND up to MAX_AUGMENTS_PER_ITEM gems),
  // which is why this is a separate dep rather than reusing appliedUpgradeIds.
  appliedAugmentIds?: () => Set<string> | null;
  // Extra non-material gate beyond canAfford (e.g. armor upgrades that also
  // require a nearby Workbench at a given tier) — returns a short blocking
  // reason to display, or null when unblocked. Optional: station upgrades
  // have none.
  extraBlockReason?: (upg: UpgradeDef) => string | null;
  formatCost: (upg: UpgradeDef) => string;
  displayName: (itemKey: string, tier: number) => string;
  apply: (upg: UpgradeDef) => void;
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
  // True while an upgrade bar is filling — greys every row + blocks re-clicks.
  private busy = false;
  private busyUpgradeId: string | null = null;
  // The baseline (pre-panelY-shift) box rect of the row currently filling, so
  // the bar can be re-pinned over it after each render's final shift pass.
  private busyRowRect: { y: number; h: number } | null = null;
  private progressBar: ProgressBar;

  private panelX: number;
  private panelY: number;
  private panelH = 200; // recomputed per render based on row content
  // When set, the panel docks at this fixed top-left point instead of
  // screen-centering itself — used to attach the panel to the right edge of
  // an open InventoryMenu (armor upgrades) instead of floating centered like
  // a placed station's Upgrade panel does.
  private anchor: { x: number; y: number } | null = null;

  constructor(scene: Phaser.Scene, deps: UpgradeMenuDeps) {
    this.scene = scene;
    this.deps = deps;

    this.panelX = scene.scale.width / 2 - PANEL_W / 2;
    this.panelY = scene.scale.height / 2 - this.panelH / 2;
    this.progressBar = new ProgressBar(scene, { depth: DEPTH_TEXT + 3 });

    this.bg = scene.add
      .rectangle(this.panelX, this.panelY, PANEL_W, this.panelH, 0x0a0a0a, 0.95)
      .setOrigin(0, 0)
      .setStrokeStyle(1, 0x555e6e)
      .setScrollFactor(0)
      .setDepth(DEPTH_BG)
      .setVisible(false);
  }

  openMenu(anchor?: { x: number; y: number }): void {
    this.anchor = anchor ?? null;
    this.open = true;
    this.bg.setVisible(true);
    this.render();
  }

  close(): void {
    if (!this.open) return;
    this.open = false;
    // Closing mid-bar cancels it — nothing's consumed until the bar fills, so
    // this is a clean no-op (no half-applied upgrade, no lost materials).
    this.busy = false;
    this.busyUpgradeId = null;
    this.busyRowRect = null;
    this.progressBar.stop();
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

    this.panelX = this.anchor ? this.anchor.x : this.scene.scale.width / 2 - PANEL_W / 2;
    // Stations/processors run the no-ladder model (applied set drives the menu);
    // worn weapon/armor keep the resultTier ladder. A non-null applied set is
    // the discriminator.
    const applied = this.deps.appliedUpgradeIds?.() ?? null;
    // Non-null only for an augmentable gear instance; augment rows always run
    // the no-ladder model, independently of the tier ladder above them.
    const augApplied = this.deps.appliedAugmentIds?.() ?? null;
    const augFull = augApplied !== null && augApplied.size >= MAX_AUGMENTS_PER_ITEM;
    const all = this.deps.upgradesFor(target.itemKey);
    // Station + augment rows: every discovered, not-yet-applied one is offerable
    // (no order gate). Weapon/armor tiers: only tiers above the current one.
    const upgrades = all.filter((u) => {
      if (!this.deps.isDiscovered(u)) return false;
      if (isGearAugment(u)) return augApplied !== null && !augApplied.has(u.id);
      if (applied) return !applied.has(u.id);
      return u.resultTier > target.tier;
    });

    let cursor = 0;
    this.addText(this.panelX + 16, cursor + 14, this.deps.displayName(target.itemKey, target.tier), 16, "#ffffff");
    const closeText = this.addText(this.panelX + PANEL_W - 16, cursor + 14, "[ESC] Close", 11, "#5b6472", 1, 0);
    closeText.setInteractive({ useHandCursor: true }).on("pointerdown", () => this.close());
    cursor += HEADER_H;

    // Gem-slot readout for augmentable gear, so the 2-per-item cap is visible
    // before a player finds every row greyed out.
    if (augApplied !== null) {
      this.addText(
        this.panelX + 16,
        cursor - 12,
        `Gem augments: ${augApplied.size}/${MAX_AUGMENTS_PER_ITEM}`,
        11,
        augFull ? "#8a93a3" : "#8fe38f",
      );
      cursor += 10;
    }

    if (upgrades.length === 0) {
      // Distinguish "everything is already applied" from "higher tiers exist
      // but aren't discovered yet" — the former should read as maxed, not empty.
      const higherExists = applied
        ? all.some((u) => !applied.has(u.id))
        : all.some((u) => !isGearAugment(u) && u.resultTier > target.tier);
      const msg = higherExists ? "No upgrades discovered yet." : "Fully upgraded.";
      this.addText(this.panelX + 16, cursor + 6, msg, 12, "#8a93a3");
      cursor += 36;
    } else {
      for (const upg of upgrades) {
        cursor += this.renderUpgradeRow(upg, target, applied !== null, augFull, cursor);
      }
    }
    cursor += 12;

    this.panelH = cursor;
    this.panelY = this.anchor ? this.anchor.y : this.scene.scale.height / 2 - this.panelH / 2;
    this.bg.setPosition(this.panelX, this.panelY).setSize(PANEL_W, this.panelH);
    for (const obj of this.rows) {
      (obj as unknown as { y: number }).y += this.panelY;
    }

    // Pin the running bar over the filling row (rows/panelY only exist now).
    if (this.busyUpgradeId && this.busyRowRect) {
      this.progressBar
        .setPosition(this.panelX + 12, this.busyRowRect.y + this.panelY)
        .setSize(PANEL_W - 24, this.busyRowRect.h - 6)
        .setVisible(true);
    } else {
      this.progressBar.setVisible(false);
    }
  }

  // Returns this row's total height so the caller can advance its cursor.
  // Only not-yet-applied tiers reach here (render() filters applied ones out).
  private renderUpgradeRow(
    upg: UpgradeDef,
    target: UpgradeTarget,
    stationMode: boolean,
    augFull: boolean,
    rowY: number,
  ): number {
    const filling = this.busyUpgradeId === upg.id;
    const isAug = isGearAugment(upg);
    // No ladder for stations/processors or gem augments — any offered one is
    // applyable. Worn weapon/armor TIERS still require the previous tier first.
    const locked = !isAug && !stationMode && upg.resultTier > target.tier + 1;
    const affordable = this.deps.canAfford(upg);
    const blockReason = locked
      ? null
      : isAug && augFull
        ? "Gem slots full"
        : (this.deps.extraBlockReason?.(upg) ?? null);
    // While any row's bar is filling, every row is inert (the bar covers the
    // filling one; the rest grey out until it lands).
    const clickable = !this.busy && !locked && affordable && !blockReason;

    const contentX = this.panelX + 22;
    const nameColor = clickable ? "#ffffff" : "#5b6472";
    let suffix = "";
    if (filling) suffix = "  (Upgrading…)";
    else if (locked) suffix = "  (Requires previous tier)";
    else if (blockReason) suffix = `  (${blockReason})`;
    else if (!affordable) suffix = "  (Missing materials)";

    this.addText(contentX, rowY + 8, `${upg.name}${suffix}`, 13, nameColor);
    this.addText(contentX, rowY + 26, this.deps.formatCost(upg), 11, "#8a93a3");
    if (upg.deltaLabel) this.addText(contentX, rowY + 42, upg.deltaLabel, 11, "#8fe38f");
    const descY = upg.deltaLabel ? rowY + 58 : rowY + 42;
    const descText = this.addText(contentX, descY, upg.description, 10, "#5b6472", 0, 0, PANEL_W - 44);

    const rowH = Math.max(descY - rowY + descText.height + 10, MIN_ROW_H);
    // Remember this row's baseline rect so render()'s final pass can pin the
    // bar over it (panelY isn't known yet at this point).
    if (filling) this.busyRowRect = { y: rowY, h: rowH };

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
        if (clickable) this.startUpgrade(upg);
      });
    this.rows.push(box);

    return rowH;
  }

  // Play the upgrade bar over the clicked row, then commit at the end (materials
  // are consumed by deps.apply on completion, never on click — so a mid-bar
  // close cancels cleanly). Re-renders to grey the rows while it fills.
  private startUpgrade(upg: UpgradeDef): void {
    this.busy = true;
    this.busyUpgradeId = upg.id;
    this.render();
    this.progressBar.start(UPGRADE_BAR_MS, {
      onComplete: () => {
        this.busy = false;
        this.busyUpgradeId = null;
        // apply() bumps the tier and calls refresh() -> render(), which now
        // hides the just-applied row and unlocks the next tier.
        this.deps.apply(upg);
      },
    });
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
        fontSize: `${size + 1}px`,
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
