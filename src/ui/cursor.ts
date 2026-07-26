import Phaser from "phaser";

// The game's own mouse cursor: a gauntleted pointing hand.
//
// Gloamreach is played almost entirely with the mouse — gathering, attacking,
// every menu — so the OS arrow was the one piece of the interface that never
// belonged to the game.
//
// ONE icon, everywhere (the user). An earlier pass swapped between three
// (pointer / hand / attack reticle) off the same prompt state that drives the
// hover highlight; the state was already there, but three cursors flickering
// between each other reads as noise rather than information, and the bottom-right
// prompt plus the hover outline already say what's under the pointer. The only
// thing the cursor does is respond to a CLICK on something interactible, with a
// short jab — the feedback the mouse-driven interaction model was missing.
//
// Built from a TEXTURE KEY rather than an imported file path, so the cursor
// rides the same override layer as everything else (art/overrides.ts): BootScene
// generates a placeholder, dropping art/sprites/ui/cursor.png replaces it, and
// the game runs either way.

const KEY = "cursor";
const FALLBACK = "default";

// Cursors render at their image's natural size and the art is authored at a
// normal cursor footprint (14x21), so it ships 1:1. x2 was tried and read as
// oversized against everything else on screen.
const SCALE = 1;

// A pale rim traced around the whole silhouette, and the reason the cursor is
// legible everywhere (the user: "make sure it is easily readable everywhere").
// The art is a dark gauntlet, and it is dragged across near-black menu panels,
// unlit crypt floors and the night overlay as often as it is across grass — on
// those it would simply vanish. The art keeps its own dark outline inside this
// one, so the cursor carries both a light edge and a dark edge and cannot lose
// contrast against any background. It's why OS cursors are shaped this way too.
//
// Applied here rather than painted into the PNG so that dropping in new cursor
// art can't silently lose the property.
const OUTLINE = { r: 0xdf, g: 0xe6, b: 0xf0 };
const PAD = 1; // room for the rim; without it the outline is clipped at the edges

// The click jab: the hand shrinks toward its own fingertip and springs back.
// Scaling is anchored ON the tip, so the hotspot is identical in every frame and
// the click point cannot drift mid-animation.
const CLICK_FRAMES: { scale: number; holdMs: number }[] = [
  { scale: 0.78, holdMs: 70 },
  { scale: 0.92, holdMs: 80 },
];

let baseCss = FALLBACK;
let frameCss: string[] = [];
let timers: number[] = [];

/** Build the cursor and take it over. Call once from create(). */
export function installCursors(scene: Phaser.Scene, isOverInteractable: () => boolean): void {
  clearPending();

  const built = build(scene);
  baseCss = built.base;
  frameCss = built.frames;
  scene.input.setDefaultCursor(baseCss);

  // Phaser's `setInteractive({ useHandCursor: true })` stores the literal string
  // "pointer" on each object and writes it to the canvas on hover — so all 76 of
  // those call sites would flip to the OS hand over our own menus. Translating it
  // once here beats editing 76 call sites and then missing the 77th; the object's
  // stored cursor is rewritten in place, so it costs one comparison per object.
  const manager = scene.input.manager as unknown as {
    __gloamCursorPatched?: boolean;
    setCursor: (io: Phaser.Types.Input.InteractiveObject) => void;
  };
  if (!manager.__gloamCursorPatched) {
    manager.__gloamCursorPatched = true;
    const original = manager.setCursor.bind(manager);
    manager.setCursor = (io: Phaser.Types.Input.InteractiveObject) => {
      if (io.cursor === "pointer") io.cursor = baseCss;
      original(io);
    };
  }

  // One handler for the whole game rather than a jab call at every click site.
  // scene.input.on outlives a restart the same way the follower in frames.ts
  // does, so it's registered against the scene once and re-armed by the guard.
  const input = scene.input as Phaser.Input.InputPlugin & { __gloamClickAnim?: boolean };
  if (!input.__gloamClickAnim) {
    input.__gloamClickAnim = true;
    scene.input.on(Phaser.Input.Events.POINTER_DOWN, () => {
      if (isOverInteractable()) playClick(scene);
    });
  }
}

/** The jab. Safe to spam — a new click restarts the animation rather than stacking. */
export function playClick(scene: Phaser.Scene): void {
  if (!frameCss.length) return;
  clearPending();
  // Driven by wall-clock timers, not the scene clock: menus stay usable while
  // the run is paused (MainScene sets time.paused), and a cursor frozen
  // mid-press would be a visible bug on the pause menu's own buttons.
  let elapsed = 0;
  frameCss.forEach((css, i) => {
    timers.push(
      window.setTimeout(() => scene.input.setDefaultCursor(css), elapsed),
    );
    elapsed += CLICK_FRAMES[i].holdMs;
  });
  timers.push(window.setTimeout(() => scene.input.setDefaultCursor(baseCss), elapsed));
}

function clearPending(): void {
  for (const t of timers) window.clearTimeout(t);
  timers = [];
}

function build(scene: Phaser.Scene): { base: string; frames: string[] } {
  if (!scene.textures.exists(KEY)) return { base: FALLBACK, frames: [] };
  const src = scene.textures.get(KEY).getSourceImage() as CanvasImageSource & {
    width: number;
    height: number;
  };
  const aw = src.width * SCALE;
  const ah = src.height * SCALE;
  const w = aw + PAD * 2;
  const h = ah + PAD * 2;

  // The art's own tip, measured once. Every frame anchors its scaling on this
  // point and reports the same hotspot, so a click during the jab lands exactly
  // where a click before it would have.
  const art = tipOf(src, aw, ah);
  const hotX = art.x + PAD;
  const hotY = art.y + PAD;

  const frame = (scale: number): string | null => {
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.imageSmoothingEnabled = false; // pixel art: crisp, not blurred
    ctx.drawImage(src, hotX - art.x * scale, hotY - art.y * scale, aw * scale, ah * scale);
    outline(ctx, w, h);
    return `url(${canvas.toDataURL()}) ${hotX} ${hotY}, ${FALLBACK}`;
  };

  const base = frame(1);
  if (!base) return { base: FALLBACK, frames: [] };
  return {
    base,
    frames: CLICK_FRAMES.map((f) => frame(f.scale)).filter((c): c is string => !!c),
  };
}

// Trace a 1px rim around the silhouette: any transparent pixel touching a solid
// one becomes the outline colour. Reads from a snapshot so the rim can't grow
// into itself as it's written.
function outline(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  const img = ctx.getImageData(0, 0, w, h);
  const src = new Uint8ClampedArray(img.data);
  const solid = (x: number, y: number) =>
    x >= 0 && y >= 0 && x < w && y < h && src[(y * w + x) * 4 + 3] > 32;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (src[i + 3] > 32) continue;
      let touching = false;
      for (let dy = -1; dy <= 1 && !touching; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if ((dx || dy) && solid(x + dx, y + dy)) {
            touching = true;
            break;
          }
        }
      }
      if (!touching) continue;
      img.data[i] = OUTLINE.r;
      img.data[i + 1] = OUTLINE.g;
      img.data[i + 2] = OUTLINE.b;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
}

// Where the click lands: the leftmost solid pixel of the topmost row that has
// any — for a hand pointing up-left, that IS the fingertip. Derived from the
// art's own alpha rather than hardcoded, so redrawn cursor art keeps clicking
// where it looks like it clicks.
function tipOf(
  src: CanvasImageSource & { width: number; height: number },
  w: number,
  h: number,
): { x: number; y: number } {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return { x: 0, y: 0 };
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(src, 0, 0, w, h);
  const data = ctx.getImageData(0, 0, w, h).data;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (data[(y * w + x) * 4 + 3] > 32) return { x, y };
    }
  }
  return { x: 0, y: 0 };
}
