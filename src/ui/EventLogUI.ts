import Phaser from "phaser";
import type { EventLog, LogEntry, LogKind } from "../systems/EventLog";

const PANEL_W = 260;
const HEADER_H = 22;
const LINE_H = 18;
const MAX_LINES = 6;
const RIGHT_MARGIN = 12;
const BOTTOM_MARGIN = 62; // sits above the hotbar row; corner stays free for the hover prompt

const KIND_COLORS: Record<LogKind, { text: string; border: number; fill: number }> = {
  recipe: { text: "#ffe08a", border: 0xffe08a, fill: 0x3a2f10 },
  levelup: { text: "#8fe38f", border: 0x8fe38f, fill: 0x123219 },
  info: { text: "#c8d0dc", border: 0x8a93a3, fill: 0x1a1f2a },
};

// Recipe-unlock toast: a small right-anchored card (icon + text) that slides
// in from the right edge, holds while stacked under earlier ones, then fades.
// Kept off the center of the screen and clear of the bottom-right log panel,
// per the user's request not to block the play area.
const RECIPE_TOAST_W = 220;
const RECIPE_TOAST_H = 40;
const RECIPE_TOAST_GAP = 6;
const RECIPE_TOAST_TOP = 48;
const RECIPE_TOAST_RIGHT_MARGIN = 12;
const RECIPE_TOAST_ICON_SIZE = 24;
const RECIPE_TOAST_SLIDE_MS = 280;
const RECIPE_TOAST_HOLD_MS = 2400;
const RECIPE_TOAST_FADE_MS = 600;
const RECIPE_TOAST_STAGGER_MS = 200;

// Persistent event feed anchored bottom-right. Collapsible via the header,
// scrollable with the mouse wheel, and pops a fading toast near the top when
// a new entry arrives so unlocks feel like a "big deal".
export class EventLogUI {
  private scene: Phaser.Scene;
  private log: EventLog;
  private collapsed = false;
  private scrollOffset = 0; // entries scrolled up from the newest
  private rows: Phaser.GameObjects.GameObject[] = [];
  private activeToasts = 0;
  private rightX: number;
  private bottomY: number;
  private recipeToastQueue: LogEntry[] = [];
  private recipeToastQueueBusy = false;
  private activeRecipeToasts = 0;

  constructor(scene: Phaser.Scene, log: EventLog) {
    this.scene = scene;
    this.log = log;
    this.rightX = scene.scale.width - RIGHT_MARGIN;
    this.bottomY = scene.scale.height - BOTTOM_MARGIN;

    log.onAdd((entry) => this.onNewEntry(entry));

    scene.input.on("wheel", this.onWheel, this);
    this.render();
  }

  private onNewEntry(entry: LogEntry): void {
    this.scrollOffset = 0; // jump to newest
    if (entry.kind === "recipe") this.enqueueRecipeToast(entry);
    else this.showToast(entry);
    this.render();
  }

  private onWheel(pointer: Phaser.Input.Pointer, _objs: unknown, _dx: number, dy: number): void {
    if (this.collapsed || !this.isPointerOver(pointer)) return;
    const maxOffset = Math.max(0, this.log.all().length - this.visibleLines());
    this.scrollOffset = Phaser.Math.Clamp(this.scrollOffset + (dy > 0 ? -1 : 1), 0, maxOffset);
    this.render();
  }

  // Whether a screen point is inside the log panel (header, plus body when
  // expanded). The scene uses this to route the wheel: over the log = scroll
  // the log, otherwise cycle the hotbar.
  isPointerOver(pointer: Phaser.Input.Pointer): boolean {
    const top = this.bottomY - HEADER_H - (this.collapsed ? 0 : this.bodyHeight());
    return (
      pointer.x >= this.rightX - PANEL_W &&
      pointer.x <= this.rightX &&
      pointer.y >= top &&
      pointer.y <= this.bottomY
    );
  }

  private visibleLines(): number {
    return Math.min(Math.max(this.log.all().length, 1), MAX_LINES);
  }

  private bodyHeight(): number {
    return this.visibleLines() * LINE_H + 8;
  }

  private clear(): void {
    for (const r of this.rows) r.destroy();
    this.rows = [];
  }

  private render(): void {
    this.clear();
    const leftX = this.rightX - PANEL_W;

    const bodyH = this.collapsed ? 0 : this.bodyHeight();
    const headerTop = this.bottomY - HEADER_H - bodyH;

    // Header bar (click to collapse/expand).
    const header = this.scene.add
      .rectangle(leftX, headerTop, PANEL_W, HEADER_H, 0x1a1f2a, 0.95)
      .setOrigin(0, 0)
      .setStrokeStyle(1, 0x3a4250)
      .setScrollFactor(0)
      .setDepth(2600)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => {
        this.collapsed = !this.collapsed;
        this.render();
      });
    this.rows.push(header);

    this.rows.push(
      this.scene.add
        .text(leftX + 8, headerTop + 4, "Log", {
          fontFamily: "monospace",
          fontSize: "13px",
          color: "#ffffff",
        })
        .setScrollFactor(0)
        .setDepth(2601),
    );
    this.rows.push(
      this.scene.add
        .text(this.rightX - 8, headerTop + 4, this.collapsed ? "[+]" : "[-]", {
          fontFamily: "monospace",
          fontSize: "13px",
          color: "#8a93a3",
        })
        .setOrigin(1, 0)
        .setScrollFactor(0)
        .setDepth(2601),
    );

    if (this.collapsed) return;

    const bodyTop = headerTop + HEADER_H;
    this.rows.push(
      this.scene.add
        .rectangle(leftX, bodyTop, PANEL_W, bodyH, 0x0a0a0a, 0.9)
        .setOrigin(0, 0)
        .setScrollFactor(0)
        .setDepth(2600),
    );

    // Show the newest `visibleLines` entries (minus any scroll), oldest at top.
    const all = this.log.all();
    const lines = this.visibleLines();
    const end = all.length - this.scrollOffset;
    const start = Math.max(0, end - lines);
    let y = bodyTop + 4;
    for (let i = start; i < end; i++) {
      const entry = all[i];
      this.rows.push(
        this.scene.add
          .text(leftX + 8, y, this.truncate(entry.message), {
            fontFamily: "monospace",
            fontSize: "12px",
            color: KIND_COLORS[entry.kind].text,
          })
          .setScrollFactor(0)
          .setDepth(2601),
      );
      y += LINE_H;
    }
  }

  private truncate(msg: string): string {
    return msg.length > 34 ? msg.slice(0, 33) + "…" : msg;
  }

  private showToast(entry: LogEntry): void {
    const colors = KIND_COLORS[entry.kind];
    const cx = this.scene.scale.width / 2;
    const y = 72 + this.activeToasts * 40;
    this.activeToasts++;

    const text = this.scene.add
      .text(cx, y, entry.message, {
        fontFamily: "monospace",
        fontSize: "16px",
        color: colors.text,
        align: "center",
      })
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(6001);

    const box = this.scene.add
      .rectangle(cx, y - 6, text.width + 24, text.height + 12, colors.fill, 0.95)
      .setOrigin(0.5, 0)
      .setStrokeStyle(2, colors.border)
      .setScrollFactor(0)
      .setDepth(6000);

    this.scene.tweens.add({
      targets: [text, box],
      alpha: 0,
      delay: 2200,
      duration: 900,
      onComplete: () => {
        text.destroy();
        box.destroy();
        this.activeToasts = Math.max(0, this.activeToasts - 1);
      },
    });
  }

  // Recipe unlocks queue up and slide in one at a time (staggered) rather
  // than all popping in on the same frame if several unlock together (e.g.
  // one skill level-up revealing multiple recipes at once).
  private enqueueRecipeToast(entry: LogEntry): void {
    this.recipeToastQueue.push(entry);
    if (!this.recipeToastQueueBusy) this.processRecipeToastQueue();
  }

  private processRecipeToastQueue(): void {
    const entry = this.recipeToastQueue.shift();
    if (!entry) {
      this.recipeToastQueueBusy = false;
      return;
    }
    this.recipeToastQueueBusy = true;
    this.spawnRecipeToast(entry);
    this.scene.time.delayedCall(RECIPE_TOAST_STAGGER_MS, () => this.processRecipeToastQueue());
  }

  private spawnRecipeToast(entry: LogEntry): void {
    const colors = KIND_COLORS.recipe;
    const slot = this.activeRecipeToasts++;
    const y = RECIPE_TOAST_TOP + slot * (RECIPE_TOAST_H + RECIPE_TOAST_GAP);
    const restX = this.scene.scale.width - RECIPE_TOAST_RIGHT_MARGIN - RECIPE_TOAST_W;
    const startX = this.scene.scale.width + 20;

    const container = this.scene.add.container(startX, y).setScrollFactor(0).setDepth(6000);

    const box = this.scene.add
      .rectangle(0, 0, RECIPE_TOAST_W, RECIPE_TOAST_H, colors.fill, 0.95)
      .setOrigin(0, 0)
      .setStrokeStyle(2, colors.border);
    container.add(box);

    const hasIcon = !!entry.icon;
    if (entry.icon) {
      const icon = this.scene.add
        .image(10 + RECIPE_TOAST_ICON_SIZE / 2, RECIPE_TOAST_H / 2, entry.icon)
        .setDisplaySize(RECIPE_TOAST_ICON_SIZE, RECIPE_TOAST_ICON_SIZE);
      container.add(icon);
    }

    const textX = hasIcon ? 10 + RECIPE_TOAST_ICON_SIZE + 8 : 10;
    const text = this.scene.add
      .text(textX, RECIPE_TOAST_H / 2, entry.message, {
        fontFamily: "monospace",
        fontSize: "12px",
        color: colors.text,
        wordWrap: { width: RECIPE_TOAST_W - textX - 8 },
      })
      .setOrigin(0, 0.5);
    container.add(text);

    this.scene.tweens.add({
      targets: container,
      x: restX,
      duration: RECIPE_TOAST_SLIDE_MS,
      ease: "Cubic.easeOut",
      onComplete: () => {
        this.scene.tweens.add({
          targets: container,
          alpha: 0,
          delay: RECIPE_TOAST_HOLD_MS,
          duration: RECIPE_TOAST_FADE_MS,
          onComplete: () => {
            container.destroy();
            this.activeRecipeToasts = Math.max(0, this.activeRecipeToasts - 1);
          },
        });
      },
    });
  }
}
