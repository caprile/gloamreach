import Phaser from "phaser";
import { CHARACTER_DEFS, affinityLines, type CharacterDef } from "../systems/Characters";
import { statDisplayName, type StatType } from "../systems/Progression";
import { itemDef } from "../systems/Items";
import { ABILITY_DEFS, SLOT_ABILITY_KEY } from "../systems/Abilities";

// Run-start character picker (B4-P1). Modeled on WelcomeUI/RunEndUI: flat
// scrollFactor(0) GameObjects (never a Container — the standing Phaser
// Container + scrollFactor input-hit-testing bug), a full-screen interactive
// scrim, and a clear()/render() repaint on every state change.
//
// SELECT-then-CONFIRM rather than click-to-commit: a mis-click here would
// silently decide a whole hardcore run. Committing is final (no reroll), and
// there is deliberately NO cancel path — a run must have a character, so Esc
// does not dismiss this (MainScene's Esc handler guards on isOpen()).
const DEPTH_SCRIM = 3620;
const DEPTH_PANEL = 3621;
const DEPTH_TEXT = 3622;

const PANEL_W = 1500;
// Headroom for the self-sizing cards below (CARD_TOP + tallest card + the
// Begin Run button). The canvas is a fixed 1920x1080, so this still centres.
// Measured live: the tallest card (4 affinity boons) bottoms out 493px below
// CARD_TOP, leaving a ~65px gap to the button at this height.
const PANEL_H = 690;
const CARD_W = 272;
const CARD_GAP = 18;
const CARD_TOP = 96;
// MINIMUM card height. The card box now measures itself: renderCard returns its
// real content bottom and render() grows every rect to the tallest card + a
// margin, so adding a section (as B4-P3's AFFINITIES block did) can never clip
// content or need this constant re-guessed. PANEL_H just needs enough headroom.
const CARD_MIN_H = 400;
const CARD_PAD_BOTTOM = 14;

// Boon/bane use amber/dim-grey, not green/red — red/green stay reserved for
// buff/debuff deltas (standing convention).
const BOON_COLOR = "#e0b263";
const BANE_COLOR = "#8a8f99";

export class CharacterSelectUI {
  private scene: Phaser.Scene;
  private open = false;
  private objects: Phaser.GameObjects.GameObject[] = [];
  private panelX: number;
  private panelY: number;
  private selected = 0;
  private onConfirm?: (def: CharacterDef) => void;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.panelX = scene.scale.width / 2 - PANEL_W / 2;
    this.panelY = scene.scale.height / 2 - PANEL_H / 2;
  }

  isOpen(): boolean {
    return this.open;
  }

  show(onConfirm: (def: CharacterDef) => void): void {
    if (this.open) return;
    this.open = true;
    this.selected = 0;
    this.onConfirm = onConfirm;
    this.render();
  }

  hide(): void {
    if (!this.open) return;
    this.open = false;
    this.onConfirm = undefined;
    this.clear();
  }

  private confirm(): void {
    const def = CHARACTER_DEFS[this.selected];
    const cb = this.onConfirm;
    this.hide();
    cb?.(def);
  }

  private clear(): void {
    for (const o of this.objects) o.destroy();
    this.objects = [];
  }

  private render(): void {
    this.clear();
    const cx = this.panelX + PANEL_W / 2;

    this.objects.push(
      this.scene.add
        .rectangle(0, 0, this.scene.scale.width, this.scene.scale.height, 0x000000, 0.78)
        .setOrigin(0, 0)
        .setScrollFactor(0)
        .setDepth(DEPTH_SCRIM)
        .setInteractive(),
    );
    this.objects.push(
      this.scene.add
        .rectangle(this.panelX, this.panelY, PANEL_W, PANEL_H, 0x0a0a0a, 0.97)
        .setOrigin(0, 0)
        .setStrokeStyle(1, 0x6e5a94)
        .setScrollFactor(0)
        .setDepth(DEPTH_PANEL),
    );

    this.text(cx, this.panelY + 24, "Choose Your Survivor", 26, "#c9a4f0", 0.5);
    this.text(
      cx,
      this.panelY + 60,
      // No mention of a kit: everyone now starts empty-handed (see
      // CharacterDef.startingItems), so the card's four real axes are what the
      // subtitle should name.
      "Everyone starts empty-handed. What differs is where you begin, what you can already do, how you grow, and what it costs. Locked for the run.",
      13,
      "#8a93a3",
      0.5,
    );

    const rowW = CHARACTER_DEFS.length * CARD_W + (CHARACTER_DEFS.length - 1) * CARD_GAP;
    const rowX = cx - rowW / 2;
    const cardTop = this.panelY + CARD_TOP;
    const cards: Phaser.GameObjects.Rectangle[] = [];
    let maxBottom = cardTop + CARD_MIN_H;
    CHARACTER_DEFS.forEach((def, i) => {
      const { rect, bottom } = this.renderCard(def, i, rowX + i * (CARD_W + CARD_GAP), cardTop);
      cards.push(rect);
      maxBottom = Math.max(maxBottom, bottom + CARD_PAD_BOTTOM);
    });
    // Uniform height across the row, driven by the tallest real content.
    for (const rect of cards) rect.setSize(CARD_W, maxBottom - cardTop);

    this.button(cx, this.panelY + PANEL_H - 34, "Begin Run", () => this.confirm());
  }

  // Returns its rect (so render() can grow it) and the y its content ends at.
  private renderCard(
    def: CharacterDef,
    index: number,
    x: number,
    y: number,
  ): { rect: Phaser.GameObjects.Rectangle; bottom: number } {
    const isSel = index === this.selected;
    const card = this.scene.add
      .rectangle(x, y, CARD_W, CARD_MIN_H, isSel ? 0x1c1830 : 0x121319, 0.98)
      .setOrigin(0, 0)
      .setStrokeStyle(isSel ? 2 : 1, isSel ? 0xc9a4f0 : 0x3a4050)
      .setScrollFactor(0)
      .setDepth(DEPTH_PANEL)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => {
        this.selected = index;
        this.render();
      });
    this.objects.push(card);

    const cx = x + CARD_W / 2;
    let cy = y + 16;
    this.text(cx, cy, def.name, 18, isSel ? "#e8dcff" : "#c8d0dc", 0.5);
    cy += 30;

    // The granted ability's icon doubles as the card's portrait — no new art.
    const icon = this.scene.add
      .image(cx, cy + 22, def.icon)
      .setScale(2)
      .setScrollFactor(0)
      .setDepth(DEPTH_TEXT);
    this.objects.push(icon);
    cy += 54;

    cy = this.block(x + 14, cy, def.blurb, 12, "#7f8798", CARD_W - 28);
    cy += 10;

    // --- ability (delivered as a pre-equipped special item) ---
    const special = def.startingEquip.find((e) => itemDef(e.key)?.grantsAbility);
    if (special) {
      const abilityId = itemDef(special.key)!.grantsAbility!;
      const ability = ABILITY_DEFS[abilityId];
      const key = SLOT_ABILITY_KEY[special.slot];
      this.text(x + 14, cy, "ABILITY", 10, "#5b6472");
      cy += 16;
      this.text(x + 14, cy, `${ability.name}  [${(key ?? "?").toUpperCase()}]`, 13, "#a9b6ff");
      cy += 20;
      cy = this.block(x + 14, cy, itemDef(special.key)!.name, 11, "#6a7280", CARD_W - 28);
      cy += 8;
    }

    // --- starting stats ---
    const stats = Object.entries(def.startingStats) as [StatType, number][];
    this.text(x + 14, cy, "STARTING STATS", 10, "#5b6472");
    cy += 16;
    this.text(
      x + 14,
      cy,
      stats.length ? stats.map(([s, n]) => `+${n} ${statDisplayName(s)}`).join("\n") : "—",
      12,
      "#c8d0dc",
    );
    cy += stats.length * 18 + 10;

    // --- kit ---
    // Skipped entirely when empty, which is every card today (see
    // CharacterDef.startingItems) — a "KIT: nothing" row on all five is pure
    // noise. The section still renders if a kit ever comes back, and the card
    // measures its own height, so nothing needs re-tuning either way.
    if (def.startingItems.length > 0) {
      this.text(x + 14, cy, "KIT", 10, "#5b6472");
      cy += 16;
      const kit = def.startingItems
        .map((it) => `${it.count > 1 ? `${it.count}x ` : ""}${itemDef(it.key)?.name ?? it.key}`)
        .join("\n");
      this.text(x + 14, cy, kit, 12, "#c8d0dc");
      cy += def.startingItems.length * 18 + 12;
    }

    // --- run modifier (boon + bane) ---
    this.text(x + 14, cy, def.modifier.name.toUpperCase(), 11, "#8a6ec0");
    cy += 18;
    cy = this.block(x + 14, cy, def.modifier.boon, 12, BOON_COLOR, CARD_W - 28);
    cy = this.block(x + 14, cy + 2, def.modifier.bane, 12, BANE_COLOR, CARD_W - 28);

    // --- class identity (B4-P3): how this survivor GROWS, vs the modifier's
    // flat numbers above. Derived from the affinity maps so it can't drift.
    const { boons, banes } = affinityLines(def);
    if (boons.length || banes.length) {
      cy += 10;
      this.text(x + 14, cy, "AFFINITIES", 10, "#5b6472");
      cy += 16;
      if (boons.length) cy = this.block(x + 14, cy, boons.join("\n"), 11, BOON_COLOR, CARD_W - 28);
      if (banes.length) cy = this.block(x + 14, cy + 2, banes.join("\n"), 11, BANE_COLOR, CARD_W - 28);
    }

    return { rect: card, bottom: cy };
  }

  // Word-wrapped text block; returns the y just past it so callers can stack.
  private block(x: number, y: number, str: string, size: number, color: string, wrapW: number): number {
    const t = this.scene.add
      .text(x, y, str, {
        fontFamily: "monospace",
        fontSize: `${size}px`,
        color,
        lineSpacing: 3,
        wordWrap: { width: wrapW },
      })
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(DEPTH_TEXT);
    this.objects.push(t);
    return y + t.height;
  }

  private text(x: number, y: number, str: string, size: number, color: string, originX = 0): void {
    this.objects.push(
      this.scene.add
        .text(x, y, str, { fontFamily: "monospace", fontSize: `${size}px`, color, lineSpacing: 4 })
        .setOrigin(originX, 0)
        .setScrollFactor(0)
        .setDepth(DEPTH_TEXT),
    );
  }

  private button(x: number, y: number, label: string, onClick: () => void): void {
    const btn = this.scene.add
      .text(x, y, label, {
        fontFamily: "monospace",
        fontSize: "20px",
        color: "#dfe6f0",
        backgroundColor: "#2a2140",
        padding: { x: 26, y: 10 },
      })
      .setOrigin(0.5, 0.5)
      .setScrollFactor(0)
      .setDepth(DEPTH_TEXT)
      .setInteractive({ useHandCursor: true })
      .on("pointerover", () => btn.setBackgroundColor("#3b2f5a"))
      .on("pointerout", () => btn.setBackgroundColor("#2a2140"))
      .on("pointerdown", onClick);
    this.objects.push(btn);
  }
}
