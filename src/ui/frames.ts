import Phaser from "phaser";

// Real-art chrome for the menus.
//
// Every panel and slot in src/ui is a flat `add.rectangle` with a fill colour
// and, for slots, a stroke that encodes STATE (selected, filled, rarity). Those
// rectangles also own the hit areas, the alpha, and the layout every menu's
// pointer maths is written against — so replacing them with art would mean
// rewriting all of that in thirty files.
//
// Instead the art is a BORDER with a transparent centre, nine-sliced to the
// rectangle's own bounds and drawn just above it. The rectangle keeps its fill,
// its alpha and its hit area; the art only takes over the edge. That makes this
// layer additive: a menu opts in with one line per rectangle, and a key with no
// texture simply draws nothing and leaves the flat look untouched — the same
// reversibility the sprite override layer has (see art/overrides.ts).
//
// The centre is transparent for a reason beyond layering: a nine-slice STRETCHES
// its centre, and stretching hammered-metal texture across a 700x850 panel
// smears it. Only the border, which is sliced rather than stretched at the
// corners, is art.

export type FrameKind = "panel" | "slot";

const KEYS: Record<FrameKind, string> = { panel: "ui_panel", slot: "ui_slot" };

// Border width of each frame's art, in source pixels. The nine-slice corners are
// cut at exactly this inset, so a value larger than the art's real border pulls
// interior detail into the corner (which then never scales), and a smaller one
// stretches part of the border. Keep these in lockstep with the PNGs.
// The panel's inset is its CORNER PLATE, not its edge bar (14px): the plate is
// wider than the bar, so slicing at the bar would stretch half a rivet block.
const INSETS: Record<FrameKind, number> = { panel: 28, slot: 9 };

// How far OUTSIDE the rectangle the frame is drawn.
//
// Every menu's layout was written against a 1px stroke: the inventory's text
// starts 12px inside the panel, and a slot's icon box is 64px inside a 70px
// slot. A border thick enough to read as metal would sit on top of both. Growing
// the frame outward instead keeps the content box exactly where the existing
// pointer maths already puts it, and the bleed is capped at the gap between
// neighbours (6px between slots) so frames meet rather than overlap.
const BLEED: Record<FrameKind, number> = { panel: 6, slot: 3 };

export interface FrameOpts {
  /** Tints the frame — how a slot shows selection/rarity once art owns the edge. */
  accent?: number;
  /**
   * Keep the rectangle's own stroke. Off by default: art plus a flat stroke
   * reads as a double border, so `accent` is the state signal instead.
   */
  keepStroke?: boolean;
  alpha?: number;
  /** Override how far outside the rectangle the frame is drawn. */
  bleed?: number;
}

/** True when `kind` has a texture — i.e. framing will actually draw something. */
export function hasFrame(scene: Phaser.Scene, kind: FrameKind): boolean {
  return scene.textures.exists(KEYS[kind]);
}

/**
 * Draw real-art chrome around an existing rectangle.
 *
 * Returns the frame so the caller can destroy it alongside the rectangle —
 * menus rebuild their contents every render(), and a frame that outlives its
 * rectangle is a leak that accumulates one object per repaint. Returns null
 * when there is no art, which is the "nothing changes" path.
 */
export function frameRect(
  rect: Phaser.GameObjects.Rectangle,
  kind: FrameKind,
  opts: FrameOpts = {},
): Phaser.GameObjects.NineSlice | null {
  const scene = rect.scene;
  const key = KEYS[kind];
  if (!scene?.textures.exists(key)) return null;

  const bleed = opts.bleed ?? BLEED[kind];
  const w = rect.width + bleed * 2;
  const h = rect.height + bleed * 2;
  // A frame can't be thicker than half of what it frames — Phaser silently
  // renders garbage when the slices overlap, and menus do draw thin strips.
  const inset = Math.max(1, Math.min(INSETS[kind], Math.floor(Math.min(w, h) / 2) - 1));
  // Grow away from the rectangle whatever its origin is: a top-left rectangle
  // moves up-left by the bleed, a centred one doesn't move at all.
  const shiftX = -bleed * (1 - 2 * rect.originX);
  const shiftY = -bleed * (1 - 2 * rect.originY);

  const frame = scene.add
    .nineslice(rect.x + shiftX, rect.y + shiftY, key, undefined, w, h, inset, inset, inset, inset)
    // Mirrored rather than assumed: panels are drawn from their top-left, but
    // some smaller rectangles are centred, and a frame offset from the thing it
    // frames is worse than no frame at all.
    .setOrigin(rect.originX, rect.originY)
    .setScrollFactor(rect.scrollFactorX, rect.scrollFactorY)
    // Above the fill, below anything the menu puts inside it. The menus stack
    // their contents a whole integer above the backing rectangle, so a half
    // step is always inside that gap.
    .setDepth(rect.depth + 0.5);

  if (opts.accent !== undefined) frame.setTint(opts.accent);
  if (opts.alpha !== undefined) frame.setAlpha(opts.alpha);
  if (!opts.keepStroke) rect.setStrokeStyle();

  return frame;
}

// Panel frames that follow their rectangle, one list per scene.
//
// A menu's backing rectangle is not static: it's shown and hidden, and the
// station menus re-anchor and resize theirs every time they open on a different
// station. Mirroring all three of those by hand at ~30 call sites across ten
// files is the kind of thing that works until someone adds an eleventh menu and
// forgets one — and the failure mode (a frame left floating over the world after
// its menu closed) is about as visible as a bug gets. Syncing from the
// rectangle instead makes the frame structurally incapable of disagreeing with
// it.
const followers = new WeakMap<Phaser.Scene, { rect: Phaser.GameObjects.Rectangle; frame: Phaser.GameObjects.NineSlice; kind: FrameKind; bleed: number }[]>();

/**
 * Frame a long-lived rectangle (a menu's panel background) and keep the frame
 * matched to it — position, size and visibility — for as long as it lives.
 */
export function bindFrame(
  rect: Phaser.GameObjects.Rectangle,
  kind: FrameKind,
  opts: FrameOpts = {},
): Phaser.GameObjects.NineSlice | null {
  const frame = frameRect(rect, kind, opts);
  if (!frame) return null;

  const scene = rect.scene;
  let list = followers.get(scene);
  if (!list) {
    list = [];
    followers.set(scene, list);
    // POST_UPDATE, so a menu that moved its panel during update() is already
    // settled. Registered once per Scene INSTANCE — scene.restart() reuses the
    // instance, so this survives a New Run without stacking up listeners, and
    // the entries from the old run are pruned below as their rects die.
    scene.events.on(Phaser.Scenes.Events.POST_UPDATE, () => {
      const live = followers.get(scene);
      if (!live) return;
      for (let i = live.length - 1; i >= 0; i--) {
        const f = live[i];
        if (!f.rect.scene || !f.frame.scene) {
          f.frame.destroy();
          live.splice(i, 1);
          continue;
        }
        syncFrame(f.frame, f.rect, f.bleed);
      }
    });
  }
  list.push({ rect, frame, kind, bleed: opts.bleed ?? BLEED[kind] });
  return frame;
}

function syncFrame(frame: Phaser.GameObjects.NineSlice, rect: Phaser.GameObjects.Rectangle, bleed: number): void {
  frame.setVisible(rect.visible);
  if (!rect.visible) return;
  frame.setPosition(rect.x - bleed * (1 - 2 * rect.originX), rect.y - bleed * (1 - 2 * rect.originY));
  const w = rect.width + bleed * 2;
  const h = rect.height + bleed * 2;
  if (frame.width !== w || frame.height !== h) frame.setSize(w, h);
  frame.setDepth(rect.depth + 0.5);
}

/**
 * `frameRect` straight into a menu's per-render cleanup array — the shape
 * almost every call site wants, since menus rebuild their contents each
 * render() and every frame has to be destroyed with the rectangle it wraps.
 */
export function frameInto(
  bucket: Phaser.GameObjects.GameObject[],
  rect: Phaser.GameObjects.Rectangle,
  kind: FrameKind,
  opts: FrameOpts = {},
): void {
  const frame = frameRect(rect, kind, opts);
  if (frame) bucket.push(frame);
}
