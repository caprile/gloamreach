import Phaser from "phaser";
import type { EventLog, LogEntry, LogKind } from "../systems/EventLog";
import { PANEL_X as INVENTORY_PANEL_X, PANEL_Y as INVENTORY_PANEL_Y, PANEL_H as INVENTORY_PANEL_H } from "./InventoryMenu";

const PANEL_W = 260;
const HEADER_H = 22;
const LINE_H = 18;
const MAX_LINES = 6;

const KIND_COLORS: Record<LogKind, { text: string; border: number; fill: number }> = {
  recipe: { text: "#ffe08a", border: 0xffe08a, fill: 0x3a2f10 },
  material: { text: "#8ac2e0", border: 0x8ac2e0, fill: 0x102a3a },
  levelup: { text: "#8fe38f", border: 0x8fe38f, fill: 0x123219 },
  info: { text: "#c8d0dc", border: 0x8a93a3, fill: 0x1a1f2a },
  combat: { text: "#ff8a8a", border: 0xff8a8a, fill: 0x3a1414 },
};

// Recipe-unlock / material-discovery toast: a small card (icon + text) that
// slides in, holds while stacked under earlier ones, then fades. Anchored on
// the LEFT, directly under the InventoryMenu panel's box (moved off the
// top-right per the user — it used to collide visually with nothing there,
// but the left side under the inventory box is where they want contextual
// unlock feedback to live). Shared by both "recipe" (amber) and "material"
// (blue, first-time-you-picked-this-up) entries so they stack in one queue
// rather than colliding if both fire in the same beat.
const RECIPE_TOAST_W = 220;
const RECIPE_TOAST_H = 40; // minimum height — grows for a message that wraps past 1 line
const RECIPE_TOAST_GAP = 6;
const RECIPE_TOAST_LEFT = INVENTORY_PANEL_X;
const RECIPE_TOAST_TOP = INVENTORY_PANEL_Y + INVENTORY_PANEL_H + 12;
const RECIPE_TOAST_ICON_SIZE = 24;
const RECIPE_TOAST_SLIDE_MS = 280;
const RECIPE_TOAST_HOLD_MS = 3200; // playtest feedback: hold/fade noticeably longer
const RECIPE_TOAST_FADE_MS = 900;
const RECIPE_TOAST_STAGGER_MS = 200;

// Persistent event feed, anchored top-left beside KeybindsUI (not stacked
// underneath it — an open InventoryMenu panel covers the same top-left
// column below Keybinds, so the log used to get hidden behind it whenever
// the player opened their inventory). Collapsible via the header — defaults
// collapsed/hidden, same as KeybindsUI — scrollable with the mouse wheel,
// and pops a fading toast near the top when a new entry arrives so unlocks
// feel like a "big deal".
export class EventLogUI {
  private scene: Phaser.Scene;
  private log: EventLog;
  private collapsed = true;
  private scrollOffset = 0; // entries scrolled up from the newest
  private rows: Phaser.GameObjects.GameObject[] = [];
  // Ordered (oldest first) heights of currently-visible center toasts, so a
  // new one's Y offset is the real cumulative stack height rather than a bare
  // counter. The old counter approach decremented on fade-COMPLETE, but with
  // a shared delay+duration the earliest-created toast always completes
  // first — so a later toast's slot could free up while it was still
  // visible, and the next toast reused that same Y and overlapped it
  // (playtest: rapid cooking made "Cooked X" toasts collide). Mirrors the
  // `activeRecipeToasts` pattern already used below for the side toasts.
  private activeCenterToasts: { height: number }[] = [];
  private leftX: number;
  private topY: number;
  private recipeToastQueue: LogEntry[] = [];
  private recipeToastQueueBusy = false;
  // Ordered (oldest first) heights of currently-visible recipe toasts, so a
  // new one's Y offset is the real cumulative height of the stack rather than
  // a fixed slot*constant — a message that wraps past one line used to spill
  // past its box into whatever toast came after it.
  private activeRecipeToasts: { height: number }[] = [];

  // `x`/`topY` are this panel's fixed top-left anchor — the caller
  // (MainScene) computes `x` once from KeybindsUI's right edge so the two
  // panels sit side by side at the same top edge instead of stacking.
  constructor(scene: Phaser.Scene, log: EventLog, x: number, topY: number) {
    this.scene = scene;
    this.log = log;
    this.leftX = x;
    this.topY = topY;

    log.onAdd((entry) => this.onNewEntry(entry));

    scene.input.on("wheel", this.onWheel, this);
    this.render();
  }

  private onNewEntry(entry: LogEntry): void {
    this.scrollOffset = 0; // jump to newest
    if (entry.kind === "recipe" || entry.kind === "material") this.enqueueRecipeToast(entry);
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
    const h = HEADER_H + (this.collapsed ? 0 : this.bodyHeight());
    return (
      pointer.x >= this.leftX &&
      pointer.x <= this.leftX + PANEL_W &&
      pointer.y >= this.topY &&
      pointer.y <= this.topY + h
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
    const leftX = this.leftX;
    const rightX = this.leftX + PANEL_W;
    const headerTop = this.topY;

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
        .text(rightX - 8, headerTop + 4, this.collapsed ? "[+]" : "[-]", {
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
        .rectangle(leftX, bodyTop, PANEL_W, this.bodyHeight(), 0x0a0a0a, 0.9)
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

    // Measure first (off-position) so the slot height reflects this
    // message's real size, same as spawnRecipeToast does below.
    const text = this.scene.add
      .text(0, 0, entry.message, {
        fontFamily: "monospace",
        fontSize: "16px",
        color: colors.text,
        align: "center",
      })
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(6001);

    const slotH = text.height + 18; // box padding + gap to the next toast
    const y = 72 + this.activeCenterToasts.reduce((sum, t) => sum + t.height, 0);
    const stackEntry = { height: slotH };
    this.activeCenterToasts.push(stackEntry);
    text.setPosition(cx, y);

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
        const idx = this.activeCenterToasts.indexOf(stackEntry);
        if (idx !== -1) this.activeCenterToasts.splice(idx, 1);
      },
    });
  }

  // Recipe unlocks (and material discoveries) queue up and slide in one at a
  // time (staggered) rather than all popping in on the same frame if several
  // fire together (e.g. one skill level-up revealing multiple recipes, or
  // taking all from a chest full of never-seen materials at once).
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
    const colors = KIND_COLORS[entry.kind];
    const hasIcon = !!entry.icon;
    const textX = hasIcon ? 10 + RECIPE_TOAST_ICON_SIZE + 8 : 10;
    const wrapWidth = RECIPE_TOAST_W - textX - 8;

    // Measure the wrapped text height before placing anything, so a message
    // long enough to wrap past one line grows its own box (and this toast's
    // stack slot) instead of overflowing into whatever's below it.
    const text = this.scene.add.text(0, 0, entry.message, {
      fontFamily: "monospace",
      fontSize: "12px",
      color: colors.text,
      wordWrap: { width: wrapWidth },
    });
    const toastH = Math.max(RECIPE_TOAST_H, text.height + 16);

    const stackEntry = { height: toastH };
    const y =
      RECIPE_TOAST_TOP +
      this.activeRecipeToasts.reduce((sum, t) => sum + t.height + RECIPE_TOAST_GAP, 0);
    this.activeRecipeToasts.push(stackEntry);

    const restX = RECIPE_TOAST_LEFT;
    const startX = -RECIPE_TOAST_W - 20;

    const container = this.scene.add.container(startX, y).setScrollFactor(0).setDepth(6000);

    const box = this.scene.add
      .rectangle(0, 0, RECIPE_TOAST_W, toastH, colors.fill, 0.95)
      .setOrigin(0, 0)
      .setStrokeStyle(2, colors.border);
    container.add(box);

    if (entry.icon) {
      const icon = this.scene.add
        .image(10 + RECIPE_TOAST_ICON_SIZE / 2, toastH / 2, entry.icon)
        .setDisplaySize(RECIPE_TOAST_ICON_SIZE, RECIPE_TOAST_ICON_SIZE);
      container.add(icon);
    }

    text.setPosition(textX, toastH / 2 - text.height / 2);
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
            const idx = this.activeRecipeToasts.indexOf(stackEntry);
            if (idx !== -1) this.activeRecipeToasts.splice(idx, 1);
          },
        });
      },
    });
  }
}
