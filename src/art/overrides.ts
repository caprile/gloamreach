import Phaser from "phaser";
import { isVariantKey } from "./variants";

// Real-art override layer — the bridge off placeholder art.
//
// Every texture BootScene generates in code can be replaced by a real pixel-art
// PNG *without touching a single call site*: Phaser texture keys are plain
// strings, so dropping `art/sprites/icon_wood.png` into the repo transparently
// replaces the generated `icon_wood` everywhere it's referenced. That makes the
// migration per-asset and reversible (delete the PNG and the placeholder is
// back), so there is no big-bang cutover to schedule and no half-migrated state
// that doesn't run.
//
// Vite's import.meta.glob resolves the directory at BUILD time — the browser
// can't list a directory, and a hand-maintained index file would silently drift
// the way RECIPES.md does. Adding a PNG is therefore the entire workflow; there
// is nothing to register.
//
// Subdirectories are ignored for keying (only the basename matters), so the
// folder tree is free to organise by biome/category however is convenient.
const modules = import.meta.glob("/art/sprites/**/*.png", {
  eager: true,
  query: "?url",
  import: "default",
}) as Record<string, string>;

// Overrides load under a prefixed key so they don't collide with the generated
// texture of the same name, which doesn't exist yet at preload() time.
const PREFIX = "__ovr__";

function keyFromPath(path: string): string {
  const base = path.split("/").pop() ?? path;
  return base.replace(/\.png$/i, "");
}

/** Texture keys that currently have a real-art PNG on disk. */
export function overrideKeys(): string[] {
  return Object.keys(modules).map(keyFromPath).sort();
}

/** Queue every override PNG. Call from BootScene.preload(). */
export function queueTextureOverrides(scene: Phaser.Scene): void {
  for (const [path, url] of Object.entries(modules)) {
    scene.load.image(PREFIX + keyFromPath(path), url);
  }
}

// How big the placeholder was, per key that an override replaced.
//
// PixelLab's canvas floor is 32px while most world placeholders are 14-30px, so
// real art arrives roughly double size — which put mushrooms at gremlin scale
// and made them larger than the 20px player. The placeholder dimensions were
// art-directed against that player, so they are the correct target: render the
// new art at the old footprint and the world keeps its established scale.
//
// Icons are excluded — they are UI art with their own integer-scale rules, and
// the one world consumer (Player.equippedIcon) already normalises itself.
const placeholderSize = new Map<string, { w: number; h: number }>();

// Keys where the bigger art IS the change — a deliberate resize, not drift.
const INTENTIONAL_RESIZE = new Set(["gremlin_shack"]);

/**
 * Scale that renders `key`'s real art at the footprint its placeholder had, or
 * 1 when there is no override, no placeholder, or the resize was deliberate.
 */
export function artScale(scene: Phaser.Scene, key: string): number {
  // A variant (`tree_v2`) has no placeholder of its own, so it borrows its
  // base's footprint — otherwise variants would tower over the thing they're
  // meant to be interchangeable with.
  const was = placeholderSize.get(key) ?? placeholderSize.get(key.replace(/_v\d+$/, ""));
  if (!was) return 1;
  const now = scene.textures.get(key).getSourceImage();
  if (!now.width || !now.height) return 1;
  // Uniform scale off the larger axis so nothing overflows its old footprint
  // and the art never distorts.
  return Math.min(was.w / now.width, was.h / now.height);
}

export interface OverrideReport {
  applied: string[];
  /** Loaded, but a different size than the placeholder it replaced. */
  resized: { key: string; from: string; to: string }[];
  /** Present on disk but absent from the texture manager — a typo'd key. */
  unmatched: string[];
  failed: string[];
}

/**
 * Swap loaded overrides in over their generated counterparts. Must run AFTER
 * BootScene.makeTextures() and BEFORE MainScene starts.
 *
 * Sprite dimensions are load-bearing, not cosmetic: attack reach and hitbox
 * math read a sprite's size (MainScene.enemyReach, Enemy.reachBonus), and the
 * fog/minimap read POI floor sizes. An override that changes size silently
 * changes combat, so size changes are reported rather than accepted quietly.
 *
 * A key with no generated counterpart is reported too — that's almost always a
 * misspelled filename, which would otherwise fail completely silently.
 */
export function applyTextureOverrides(scene: Phaser.Scene): OverrideReport {
  const report: OverrideReport = { applied: [], resized: [], unmatched: [], failed: [] };

  for (const path of Object.keys(modules)) {
    const key = keyFromPath(path);
    const tmp = PREFIX + key;

    if (!scene.textures.exists(tmp)) {
      report.failed.push(key);
      continue;
    }
    const src = scene.textures.get(tmp).getSourceImage() as HTMLImageElement;

    if (scene.textures.exists(key)) {
      const old = scene.textures.get(key).getSourceImage();
      if (old.width !== src.width || old.height !== src.height) {
        report.resized.push({
          key,
          from: `${old.width}x${old.height}`,
          to: `${src.width}x${src.height}`,
        });
        // Captured here because it's the only moment both sizes exist — the
        // placeholder is about to be removed.
        if (!key.startsWith("icon_") && !INTENTIONAL_RESIZE.has(key)) {
          placeholderSize.set(key, { w: old.width, h: old.height });
        }
      }
      scene.textures.remove(key);
    } else {
      report.unmatched.push(key);
    }

    // The prefixed texture is deliberately left registered: removing it would
    // destroy the shared source image this new texture wraps. One spare Texture
    // object per override is far cheaper than the alternative bug.
    scene.textures.addImage(key, src);
    report.applied.push(key);
  }

  // Icons are deliberately authored larger than their placeholders (32x32 vs
  // 24x24 — PixelLab's minimum canvas, and a near-integer scale into the 34px
  // inventory slot instead of a mushy x1.42). They're UI art: nothing reads
  // their size for reach or hitboxes, and the one world-space consumer
  // (Player's equippedIcon) normalises to a fixed world size. Warning on each
  // would mean ~181 false positives drowning out a real one on a world sprite.
  const iconResizes = report.resized.filter((r) => r.key.startsWith("icon_"));
  const spriteResizes = report.resized.filter((r) => !r.key.startsWith("icon_"));

  for (const r of spriteResizes) {
    console.warn(`[art] "${r.key}" resized ${r.from} -> ${r.to}; reach/hitbox math reads sprite size.`);
  }
  if (iconResizes.length) {
    console.info(`[art] ${iconResizes.length} icon(s) resized (expected — icons are UI-only).`);
  }
  // A `<key>_v2` file is an intentional new key with no placeholder behind it
  // (see art/variants.ts), so it is expected to be "unmatched" — only the rest
  // is likely to be a typo.
  const typos = report.unmatched.filter((k) => !isVariantKey(k));
  if (typos.length) {
    console.warn(`[art] no generated texture for: ${typos.join(", ")} (misspelled filename?)`);
  }
  if (report.failed.length) {
    console.warn(`[art] failed to load: ${report.failed.join(", ")}`);
  }
  if (report.applied.length) {
    console.info(`[art] ${report.applied.length} real-art override(s) applied.`);
  }

  return report;
}
