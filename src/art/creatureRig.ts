import Phaser from "phaser";
import { recolourToElite } from "./eliteVariants";

// Animated creature art.
//
// Same idea as the player rig (art/playerRig.ts) with one difference that
// removes most of the work: creatures are drawn facing RIGHT and mirrored with
// flipX at runtime, so there are no per-direction strips — one strip per
// animation is the whole creature.
//
//   art/creatures/<textureKey>_<anim>_f<frameCount>.png
//   art/creatures/boar_walk_f8.png     <- 8 frames, horizontal strip
//
// `<textureKey>` is the creature's own texture key, so it can contain
// underscores (`gremling_weak`, `gremlin_king`) — the filename is parsed from
// the RIGHT to keep that unambiguous. The frame count is in the name and the
// width derived after load, exactly as the player rig does: a strip carries its
// own metadata and there is nothing to register.
//
// A creature with no strips keeps its static sprite, so this is per-creature
// and reversible like every other layer in the migration.
const modules = import.meta.glob("/art/creatures/**/*.png", {
  eager: true,
  query: "?url",
  import: "default",
}) as Record<string, string>;

export type CreatureAnim = "idle" | "walk" | "attack";
const ANIMS: CreatureAnim[] = ["idle", "walk", "attack"];

const PREFIX = "__cr__";

interface Strip {
  artKey: string;
  anim: CreatureAnim;
  frames: number;
  url: string;
  key: string;
}

function parse(path: string): Strip | null {
  const file = path.split("/").pop() ?? "";
  const m = /^(.+)_(idle|walk|attack)_f(\d+)\.png$/i.exec(file);
  if (!m) return null;
  const anim = m[2].toLowerCase() as CreatureAnim;
  if (!ANIMS.includes(anim)) return null;
  return { artKey: m[1], anim, frames: Number(m[3]), url: "", key: `${PREFIX}${m[1]}_${anim}` };
}

const strips: Strip[] = Object.entries(modules)
  .map(([path, url]) => {
    const s = parse(path);
    if (s) s.url = url;
    return s;
  })
  .filter((s): s is Strip => s !== null);

/** Phaser animation key for a creature's texture key + state. */
export function creatureAnimKey(artKey: string, anim: CreatureAnim): string {
  return `cr_${artKey}_${anim}`;
}

/** True when `artKey` has any animation art on disk. */
export function hasCreatureRig(scene: Phaser.Scene, artKey: string): boolean {
  return ANIMS.some((a) => scene.anims.exists(creatureAnimKey(artKey, a)));
}

/** Queue every creature strip. Call from BootScene.preload(). */
export function queueCreatureRig(scene: Phaser.Scene): void {
  for (const s of strips) scene.load.image(s.key, s.url);
}

/**
 * Slice each strip into frames and register its animation, then build the
 * matching elite strips by recolouring.
 *
 * Elites are derived here rather than in eliteVariants' static pass because an
 * animated elite needs recoloured STRIPS, not a recoloured still — and since a
 * strip is one image, the same ramp handles every frame at once.
 */
export function buildCreatureAnimations(scene: Phaser.Scene, eliteKeyFor: (k: string) => string): number {
  let built = 0;
  for (const s of strips) {
    if (!sliceStrip(scene, s.key, s.frames)) continue;
    if (addAnim(scene, creatureAnimKey(s.artKey, s.anim), s.key, s.frames, s.anim)) built++;

    // The elite is the same animation in crimson/gold. Skipped when the game
    // has no elite for this creature (bosses don't).
    const eliteKey = eliteKeyFor(s.artKey);
    if (!scene.textures.exists(eliteKey)) continue;
    const eliteStrip = `${PREFIX}${eliteKey}_${s.anim}`;
    if (!recolourToElite(scene, s.key, eliteStrip)) continue;
    if (!sliceStrip(scene, eliteStrip, s.frames)) continue;
    if (addAnim(scene, creatureAnimKey(eliteKey, s.anim), eliteStrip, s.frames, s.anim)) built++;
  }
  if (built) console.info(`[art] ${built} creature animation(s) built.`);
  return built;
}

function sliceStrip(scene: Phaser.Scene, key: string, frames: number): boolean {
  if (!scene.textures.exists(key)) {
    console.warn(`[creature] strip missing: ${key}`);
    return false;
  }
  const tex = scene.textures.get(key);
  const src = tex.getSourceImage();
  if (src.width % frames !== 0) {
    console.warn(`[creature] ${key}: ${src.width}px doesn't divide into ${frames} frames`);
    return false;
  }
  const fw = src.width / frames;
  for (let i = 0; i < frames; i++) {
    if (!tex.has(String(i))) tex.add(String(i), 0, i * fw, 0, fw, src.height);
  }
  return true;
}

function addAnim(
  scene: Phaser.Scene,
  key: string,
  texKey: string,
  frames: number,
  anim: CreatureAnim,
): boolean {
  if (scene.anims.exists(key)) return false;
  scene.anims.create({
    key,
    frames: Array.from({ length: frames }, (_, i) => ({ key: texKey, frame: String(i) })),
    // An attack plays once — Enemy holds it for the swing's own duration, which
    // is a per-creature constant, not the animation's length.
    frameRate: anim === "attack" ? 14 : anim === "walk" ? 10 : 5,
    repeat: anim === "attack" ? 0 : -1,
  });
  return true;
}
