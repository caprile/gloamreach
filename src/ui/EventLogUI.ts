import Phaser from "phaser";
import type { EventLog, LogEntry, LogKind } from "../systems/EventLog";
import { PANEL_X as INVENTORY_PANEL_X } from "./InventoryMenu";

const PANEL_W = 260;
const HEADER_H = 26;
const LINE_H = 21;
const MAX_LINES = 6;

const KIND_COLORS: Record<LogKind, { text: string; border: number; fill: number }> = {
  recipe: { text: "#ffe08a", border: 0xffe08a, fill: 0x3a2f10 },
  material: { text: "#8ac2e0", border: 0x8ac2e0, fill: 0x102a3a },
  levelup: { text: "#8fe38f", border: 0x8fe38f, fill: 0x123219 },
  info: { text: "#c8d0dc", border: 0x8a93a3, fill: 0x1a1f2a },
  combat: { text: "#ff8a8a", border: 0xff8a8a, fill: 0x3a1414 },
  // Biome discovery — a prominent warm-gold center toast (routed to showToast, not
  // the side recipe/material queue), for the "you've entered a new region" beat.
  biome: { text: "#ffd27a", border: 0xffd27a, fill: 0x3a2a10 },
  // POI discovery (a found structure — e.g. a Duskrunner Warren) — a prominent
  // center toast like biome, tinted to match the POI's own map-marker color.
  poi: { text: "#e0a060", border: 0xe0a060, fill: 0x3a2612 },
  // Epic find (B4-P2). The brightest gold in the palette, and routed to the
  // prominent CENTER toast (not the side material queue) purely by not being
  // "recipe"/"material" in onNewEntry — a ~5% drop should stop you for a beat.
  epic: { text: "#ffe9a8", border: 0xffc94a, fill: 0x4a3608 },
};

// Recipe-unlock / material-discovery toast: a small card (icon + text) that
// slides in, holds while stacked, then fades. Anchored on the LEFT and grown
// UPWARD from a fixed low baseline into the otherwise-empty left column.
// Previously this anchored its TOP directly under the InventoryMenu panel's box
// and grew downward — but that panel is now ~850px tall, so the stack started
// near the bottom edge and a burst of several discoveries at once (e.g.
// take-all from a chest of never-seen materials) ran straight off the bottom of
// the screen. Decoupled from the inventory panel height entirely: the newest
// toast sits at the baseline and older ones climb up, so any realistic burst
// stays fully on screen. Shared by both "recipe" (amber) and "material" (blue,
// first-time-you-picked-this-up) entries so they stack in one queue rather than
// colliding if both fire in the same beat.
const RECIPE_TOAST_W = 220;
const RECIPE_TOAST_H = 40; // minimum height — grows for a message that wraps past 1 line
const RECIPE_TOAST_GAP = 6;
const RECIPE_TOAST_LEFT = INVENTORY_PANEL_X;
// Distance from the bottom of the canvas to the bottom edge of the newest
// toast (clear of the bottom-center hotbar/XP bar, which don't reach this far
// left).
const RECIPE_TOAST_BOTTOM_MARGIN = 118;
const RECIPE_TOAST_ICON_SIZE = 24;
const RECIPE_TOAST_SLIDE_MS = 280;
const RECIPE_TOAST_HOLD_MS = 5500; // playtest feedback (again): recipe/material toasts still vanished too fast
const RECIPE_TOAST_FADE_MS = 1500;
const RECIPE_TOAST_STAGGER_MS = 200;

// Max simultaneous center toasts ("Defeated X", level-up, discovery). Beyond
// this the oldest is evicted so the top-anchored stack can't reach the player.
const MAX_CENTER_TOASTS = 4;

// Same idea for the left-hand recipe/material stack: at ~46px a slot, six is
// about as tall as the free left column gets before it reaches the minimap.
const MAX_RECIPE_TOASTS = 6;

// A live center toast + its GameObjects, so the stack can be repositioned.
interface CenterToast {
  text: Phaser.GameObjects.Text;
  box: Phaser.GameObjects.Rectangle;
  height: number;
  tween?: Phaser.Tweens.Tween;
}

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
  private refreshQueued = false;
  private scrollOffset = 0; // entries scrolled up from the newest
  private rows: Phaser.GameObjects.GameObject[] = [];
  // Currently-visible center toasts, oldest first — each carries its own
  // GameObjects so the stack can be repacked (relayoutCenterToasts) whenever a
  // toast is added, evicted, or fades. Repacking from the top keeps the stack
  // bounded to MAX_CENTER_TOASTS worth of height, so a burst can't march down
  // over the player (the user), and closes gaps as toasts leave.
  private activeCenterToasts: CenterToast[] = [];
  private leftX: number;
  private topY: number;
  private recipeToastQueue: LogEntry[] = [];
  private recipeToastQueueBusy = false;
  // Currently-visible recipe/material toasts, OLDEST first. Each keeps its
  // container so the stack can be repacked (relayoutRecipeToasts) whenever one
  // is added, evicted or fades — the same treatment the center stack gets.
  // It used to be a monotonic upward cursor with no cap, which meant a burst of
  // crafts (each holds ~7s) marched the stack straight off the top of the screen
  // and left holes at the bottom as older toasts faded out from under it
  // (the user: "the side menu gets weird with where it puts the banner").
  private activeRecipeToasts: {
    height: number;
    container: Phaser.GameObjects.Container;
    tween?: Phaser.Tweens.Tween;
  }[] = [];

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
    if (!entry.silent) {
      if (entry.kind === "recipe" || entry.kind === "material") this.enqueueRecipeToast(entry);
      else this.showToast(entry);
    }
    this.queueRender();
  }

  // Coalesced repaint (InventoryMenu/CraftingMenu pattern). render() is a full
  // teardown-and-rebuild including the interactive header, and one beat can add
  // many entries in a single frame — a chest take-all, or a skill level-up
  // unlocking several recipes at once. Interaction-driven renders (collapse
  // toggle, wheel scroll) stay immediate: those are one call and want to feel
  // instant.
  private queueRender(): void {
    if (this.refreshQueued) return;
    this.refreshQueued = true;
    this.scene.events.once(Phaser.Scenes.Events.POST_UPDATE, () => {
      this.refreshQueued = false;
      this.render();
    });
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
          fontSize: "15px",
          color: "#ffffff",
        })
        .setScrollFactor(0)
        .setDepth(2601),
    );
    this.rows.push(
      this.scene.add
        .text(rightX - 8, headerTop + 4, this.collapsed ? "[+]" : "[-]", {
          fontFamily: "monospace",
          fontSize: "15px",
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
            fontSize: "14px",
            color: KIND_COLORS[entry.kind].text,
          })
          .setScrollFactor(0)
          .setDepth(2601),
      );
      y += LINE_H;
    }
  }

  private truncate(msg: string): string {
    return msg.length > 29 ? msg.slice(0, 28) + "…" : msg;
  }

  private showToast(entry: LogEntry): void {
    const colors = KIND_COLORS[entry.kind];
    const cx = this.scene.scale.width / 2;

    // Measure first (off-position) so the slot height reflects this
    // message's real size, same as spawnRecipeToast does below.
    const text = this.scene.add
      .text(0, 0, entry.message, {
        fontFamily: "monospace",
        fontSize: "18px",
        color: colors.text,
        align: "center",
      })
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(6001);

    const slotH = text.height + 18; // box padding + gap to the next toast
    text.setPosition(cx, 0);

    const box = this.scene.add
      .rectangle(cx, 0, text.width + 24, text.height + 12, colors.fill, 0.95)
      .setOrigin(0.5, 0)
      .setStrokeStyle(2, colors.border)
      .setScrollFactor(0)
      .setDepth(6000);

    const stackEntry: CenterToast = { text, box, height: slotH };
    this.activeCenterToasts.push(stackEntry);
    // Cap the stack so a burst of kills/level-ups can't march the toasts down
    // over the player (the user). Beyond the cap, evict the OLDEST immediately.
    while (this.activeCenterToasts.length > MAX_CENTER_TOASTS) {
      const oldest = this.activeCenterToasts.shift()!;
      oldest.tween?.remove();
      oldest.text.destroy();
      oldest.box.destroy();
    }
    // Repack every live toast from the top so the stack stays bounded (and
    // closes gaps when one is evicted or fades).
    this.relayoutCenterToasts();

    stackEntry.tween = this.scene.tweens.add({
      targets: [text, box],
      alpha: 0,
      delay: 4000, // playtest: center toasts (level-up etc.) lingered too briefly
      duration: 1500,
      onComplete: () => {
        text.destroy();
        box.destroy();
        const idx = this.activeCenterToasts.indexOf(stackEntry);
        if (idx !== -1) {
          this.activeCenterToasts.splice(idx, 1);
          this.relayoutCenterToasts();
        }
      },
    });
  }

  // Position every live center toast in a top-anchored stack, so it can never
  // grow past MAX_CENTER_TOASTS worth of height (and gaps close as toasts fade).
  private relayoutCenterToasts(): void {
    let y = 72;
    for (const t of this.activeCenterToasts) {
      t.text.setY(y);
      t.box.setY(y - 6);
      y += t.height;
    }
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
      fontSize: "14px",
      color: colors.text,
      wordWrap: { width: wrapWidth },
    });
    const toastH = Math.max(RECIPE_TOAST_H, text.height + 16);

    const restX = RECIPE_TOAST_LEFT;
    const startX = -RECIPE_TOAST_W - 20;

    // y is set by relayoutRecipeToasts once this toast has joined the stack.
    const container = this.scene.add.container(startX, 0).setScrollFactor(0).setDepth(6000);
    const stackEntry: (typeof this.activeRecipeToasts)[number] = { height: toastH, container };
    this.activeRecipeToasts.push(stackEntry);
    // Cap the stack the same way the center one is capped: past the cap the
    // OLDEST is evicted, so a long crafting spree can never climb off-screen.
    while (this.activeRecipeToasts.length > MAX_RECIPE_TOASTS) {
      const oldest = this.activeRecipeToasts.shift()!;
      oldest.tween?.remove();
      oldest.container.destroy();
    }
    this.relayoutRecipeToasts();

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

    stackEntry.tween = this.scene.tweens.add({
      targets: container,
      x: restX,
      duration: RECIPE_TOAST_SLIDE_MS,
      ease: "Cubic.easeOut",
      onComplete: () => {
        stackEntry.tween = this.scene.tweens.add({
          targets: container,
          alpha: 0,
          delay: RECIPE_TOAST_HOLD_MS,
          duration: RECIPE_TOAST_FADE_MS,
          onComplete: () => {
            container.destroy();
            const idx = this.activeRecipeToasts.indexOf(stackEntry);
            if (idx !== -1) {
              this.activeRecipeToasts.splice(idx, 1);
              this.relayoutRecipeToasts();
            }
          },
        });
      },
    });
  }

  // Stack the live toasts upward from a fixed low baseline — newest at the
  // bottom, older ones climbing above it. Recomputed from scratch every time the
  // stack changes, so gaps close as toasts fade and the top of the stack is
  // always bounded by MAX_RECIPE_TOASTS worth of height. Only the Y is touched:
  // X is owned by the slide-in tween.
  private relayoutRecipeToasts(): void {
    let bottom = this.scene.scale.height - RECIPE_TOAST_BOTTOM_MARGIN;
    for (let i = this.activeRecipeToasts.length - 1; i >= 0; i--) {
      const t = this.activeRecipeToasts[i];
      t.container.setY(bottom - t.height);
      bottom -= t.height + RECIPE_TOAST_GAP;
    }
  }
}
