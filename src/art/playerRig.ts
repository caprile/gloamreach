import Phaser from "phaser";
import type { Facing } from "../entities/Player";

// Animated player art — the one asset class the flat `art/sprites/<key>.png`
// override layer can't express, because an animation is many frames under one
// logical name rather than a single texture swap.
//
// Layout, which is the whole contract:
//
//   art/rig/<characterId>/<anim>_<direction>_f<frameCount>.png
//   e.g. art/rig/vagabond/walk_south_f6.png
//
// Each PNG is a horizontal strip of equal-width frames. The frame COUNT is in
// the filename and the frame WIDTH is derived from it after load, so a strip
// carries its own metadata: there is no manifest to register and nothing to
// keep in sync (the same reason overrides.ts globs a directory).
//
// A character with no folder here simply keeps the generated placeholder
// sprite, so the migration stays per-character and reversible exactly like the
// static one.
//
// The glob is EAGER, so every PNG under art/rig/ is bundled whether or not the
// filename parses — keep scratch captures out of this tree (art/_shots/ is
// gitignored for exactly that).
const modules = import.meta.glob("/art/rig/**/*.png", {
  eager: true,
  query: "?url",
  import: "default",
}) as Record<string, string>;

/** Animation states the rig understands. Anything else on disk is ignored. */
export type RigAnim = "idle" | "walk" | "attack";
const ANIMS: RigAnim[] = ["idle", "walk", "attack"];

// Cardinal names PixelLab generates, mapped from the game's 4-way facing.
const DIR_BY_FACING: Record<Facing, string> = {
  down: "south",
  up: "north",
  left: "west",
  right: "east",
};

interface Strip {
  charId: string;
  anim: RigAnim;
  dir: string;
  frames: number;
  url: string;
  key: string; // texture key the strip loads under
}

const PREFIX = "__rig__";

function parse(path: string): Strip | null {
  const parts = path.split("/");
  const file = parts.pop() ?? "";
  const charId = parts.pop() ?? "";
  const m = /^(\w+)_(south|north|east|west)_f(\d+)\.png$/i.exec(file);
  if (!m) return null;
  const anim = m[1].toLowerCase() as RigAnim;
  if (!ANIMS.includes(anim)) return null;
  return {
    charId,
    anim,
    dir: m[2].toLowerCase(),
    frames: Number(m[3]),
    url: "",
    key: `${PREFIX}${charId}_${anim}_${m[2].toLowerCase()}`,
  };
}

const strips: Strip[] = Object.entries(modules)
  .map(([path, url]) => {
    const s = parse(path);
    if (s) s.url = url;
    return s;
  })
  .filter((s): s is Strip => s !== null);

/** Character ids that have rig art on disk. */
export function riggedCharacters(): string[] {
  return [...new Set(strips.map((s) => s.charId))].sort();
}

/** True when `charId` has at least an idle strip — enough to swap off the placeholder. */
export function hasRig(charId: string): boolean {
  return strips.some((s) => s.charId === charId && s.anim === "idle");
}

/** Phaser animation key for a rigged character's state + facing. */
export function rigAnimKey(charId: string, anim: RigAnim, facing: Facing): string {
  return `rig_${charId}_${anim}_${DIR_BY_FACING[facing]}`;
}

/** Queue every rig strip. Call from BootScene.preload(). */
export function queuePlayerRig(scene: Phaser.Scene): void {
  for (const s of strips) scene.load.image(s.key, s.url);
}

/**
 * Slice each loaded strip into frames and register its animation. Must run
 * after the loader finishes (BootScene.create) and before MainScene starts.
 *
 * Frames are added to the strip's own texture rather than loaded as a
 * spritesheet because `load.spritesheet` needs the frame width up front, and
 * the width is only knowable once the image's own dimensions are.
 */
export function buildPlayerAnimations(scene: Phaser.Scene): number {
  let built = 0;
  for (const s of strips) {
    if (!scene.textures.exists(s.key)) {
      console.warn(`[rig] strip failed to load: ${s.key}`);
      continue;
    }
    const tex = scene.textures.get(s.key);
    const src = tex.getSourceImage();
    const fw = Math.floor(src.width / s.frames);
    if (fw <= 0 || src.width % s.frames !== 0) {
      console.warn(`[rig] ${s.key}: ${src.width}px doesn't divide into ${s.frames} frames`);
      continue;
    }
    for (let i = 0; i < s.frames; i++) {
      if (!tex.has(String(i))) tex.add(String(i), 0, i * fw, 0, fw, src.height);
    }
    const key = `rig_${s.charId}_${s.anim}_${s.dir}`;
    if (scene.anims.exists(key)) {
      // Two strips claiming one animation — almost always a stale file left
      // behind when a re-fetch changed the frame count (walk_south_f6 alongside
      // walk_south_f4). Whichever landed first silently wins, so say so.
      console.warn(`[rig] duplicate strip for ${key} (${s.frames} frames) — delete the stale PNG`);
      continue;
    }
    scene.anims.create({
      key,
      frames: Array.from({ length: s.frames }, (_, i) => ({ key: s.key, frame: String(i) })),
      // Attacks play once at the swing's own pace; locomotion loops. Walk is
      // deliberately brisk — the player moves ~166px/s at a walk.
      frameRate: s.anim === "attack" ? 16 : s.anim === "walk" ? 12 : 6,
      repeat: s.anim === "attack" ? 0 : -1,
    });
    built++;
  }
  if (built) console.info(`[rig] ${built} player animation(s) built for: ${riggedCharacters().join(", ")}`);
  return built;
}
