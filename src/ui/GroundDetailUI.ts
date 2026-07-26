import Phaser from "phaser";
import type { GroundMaterial } from "../systems/ground";
import {
  GROUND_ALPHA,
  GROUND_CELL,
  cellHash,
  groundTextureKey,
  variantForCell,
} from "../systems/ground";
import { groundQuadFrame } from "../art/groundFrames";

// Real pixel-art ground detail, stamped as 32px tiles around the player.
//
// WHY A MOVING CHUNK. The world is a 28000px circle, so nothing that carries
// per-pixel detail can cover it: a world-sized TileSprite is ~3GB (it OOMed once
// already — see the note on bakeOuterOverlay), and the outer colour overlay is
// 4096 texels stretched over the whole world, ~7 world px per texel. The only
// bounded way to get 1:1 pixel art onto the ground is to keep a window of it
// around the camera and rebuild as the player walks. Cost is then constant at
// any world size, which is the same reason the speckle layer this replaces was
// camera-locked.
//
// WHY IT'S ADDITIVE, NOT A REWRITE. The tiles draw semi-transparently OVER the
// existing colour field rather than replacing it. The colour still decides what
// the ground *is* — every biome boundary, the war-camp and vein floor stamps,
// the POI decals and the minimap all keep reading the exact same source — and
// the tiles only supply grain. That also means one clay tile can serve the whole
// badlands palette (ochre patches, rust lows, pale drifts) instead of needing a
// tile per colour, and it keeps this phase far less risky than swapping the bake
// itself for discrete tile stamping.
export class GroundDetailUI {
  // Cells are stamped at 1:1, so SPAN is in world pixels. It must comfortably
  // exceed the visible world area (1280x720 at zoom 1.5) plus the distance the
  // player can cover during a rebuild, since the OLD chunk stays on screen until
  // the new one is finished. SNAP is the rebuild granularity: the chunk only
  // moves when the player crosses a SNAP boundary, so a straight walk rebuilds
  // roughly every 2.5s rather than every frame.
  private static readonly SPAN = 2304;
  private static readonly SNAP = 576;
  // Half the visible world, plus slack. The camera shows 1280x720 world px at
  // zoom 1.5; anything beyond this from the chunk's edge is off screen.
  private static readonly VIEW_HALF = 700;
  // Rows stamped per frame while rebuilding. The whole chunk is ~21,000 stamps;
  // doing it in one go is a visible hitch every few seconds, so it's spread over
  // ~9 frames into an offscreen buffer and swapped in when complete.
  private static readonly ROWS_PER_FRAME = 8;

  private readonly scene: Phaser.Scene;
  /**
   * Material at a world point. A callback rather than the WorldBiomes instance
   * because the POI floors stamped into the colour bake (war camp, gloaming
   * vein) are the scene's knowledge, not the world map's, and this layer draws
   * over them — so the scene composes both.
   */
  private readonly materialAt: (x: number, y: number) => GroundMaterial;
  private readonly worldCx: number;
  private readonly worldCy: number;
  private readonly worldRadius: number;

  // Double-buffered: `front` is on screen, `back` is being stamped.
  private front: Phaser.GameObjects.RenderTexture;
  private back: Phaser.GameObjects.RenderTexture;
  /** Origin (world px) of the chunk currently being stamped into `back`. */
  private buildX = 0;
  private buildY = 0;
  private buildRow = -1; // -1 = idle
  /** Origin of whatever `front` shows, so we know when the player has left it. */
  private frontX = Number.NaN;
  private frontY = Number.NaN;

  constructor(
    scene: Phaser.Scene,
    materialAt: (x: number, y: number) => GroundMaterial,
    opts: { depth: number; worldCx: number; worldCy: number; worldRadius: number; x: number; y: number },
  ) {
    this.scene = scene;
    this.materialAt = materialAt;
    this.worldCx = opts.worldCx;
    this.worldCy = opts.worldCy;
    this.worldRadius = opts.worldRadius;

    const mk = () =>
      scene.add
        .renderTexture(0, 0, GroundDetailUI.SPAN, GroundDetailUI.SPAN)
        .setOrigin(0, 0)
        .setDepth(opts.depth);
    this.front = mk();
    this.back = mk().setVisible(false);

    // First chunk is stamped synchronously: it's a one-time boot cost like the
    // other ground bakes, and starting a run with a blank ground layer for nine
    // frames would be the more visible cost.
    const { ox, oy } = this.originFor(opts.x, opts.y);
    this.stampRows(this.front, ox, oy, 0, GroundDetailUI.SPAN / GROUND_CELL);
    this.front.setPosition(ox, oy);
    this.frontX = ox;
    this.frontY = oy;
  }

  /** Call every frame with the player's position. */
  update(x: number, y: number): void {
    const rows = GroundDetailUI.SPAN / GROUND_CELL;
    const { ox, oy } = this.originFor(x, y);

    // A TELEPORT outruns the amortised rebuild: Gloamstep Blink, a crypt
    // descent and a respawn all move the player further than a whole chunk, so
    // the visible one stops covering the camera entirely and spreading the work
    // would leave bare colour field on screen for a third of a second. Eat the
    // full ~45ms in one frame instead — the moves that cause it already come
    // with a camera fade or a screen-clearing jump.
    if (!this.covers(x, y)) {
      this.back.clear();
      this.stampRows(this.back, ox, oy, 0, rows);
      this.commit(ox, oy);
      return;
    }

    if (this.buildRow >= 0) {
      const end = Math.min(rows, this.buildRow + GroundDetailUI.ROWS_PER_FRAME);
      this.stampRows(this.back, this.buildX, this.buildY, this.buildRow, end);
      this.buildRow = end;
      if (this.buildRow >= rows) this.commit(this.buildX, this.buildY);
      return;
    }
    if (ox === this.frontX && oy === this.frontY) return;
    this.buildX = ox;
    this.buildY = oy;
    this.buildRow = 0;
    this.back.clear();
  }

  /** Does the visible chunk still cover everything the camera can show? */
  private covers(x: number, y: number): boolean {
    const m = GroundDetailUI.VIEW_HALF;
    return (
      this.frontX <= x - m &&
      this.frontX + GroundDetailUI.SPAN >= x + m &&
      this.frontY <= y - m &&
      this.frontY + GroundDetailUI.SPAN >= y + m
    );
  }

  /** Show the freshly-stamped buffer and retire the old one. */
  private commit(ox: number, oy: number): void {
    this.back.setPosition(ox, oy);
    this.frontX = ox;
    this.frontY = oy;
    this.buildRow = -1;
    this.back.setVisible(true);
    this.front.setVisible(false);
    const spent = this.front;
    this.front = this.back;
    this.back = spent;
  }

  setVisible(v: boolean): void {
    // Only ever show the buffer that holds a finished chunk.
    this.front.setVisible(v);
    if (!v) this.back.setVisible(false);
  }

  destroy(): void {
    this.front.destroy();
    this.back.destroy();
  }

  /** Chunk origin for a player position: centred, snapped to the SNAP grid. */
  private originFor(x: number, y: number): { ox: number; oy: number } {
    const s = GroundDetailUI.SNAP;
    return {
      ox: Math.round((x - GroundDetailUI.SPAN / 2) / s) * s,
      oy: Math.round((y - GroundDetailUI.SPAN / 2) / s) * s,
    };
  }

  private stampRows(
    rt: Phaser.GameObjects.RenderTexture,
    ox: number,
    oy: number,
    rowStart: number,
    rowEnd: number,
  ): void {
    const cols = GroundDetailUI.SPAN / GROUND_CELL;
    rt.beginDraw();
    for (let row = rowStart; row < rowEnd; row++) {
      const wy = oy + row * GROUND_CELL;
      for (let col = 0; col < cols; col++) {
        const wx = ox + col * GROUND_CELL;
        // Cell coordinates are absolute in world space, so the variant a cell
        // picks and the jitter it uses are the same no matter which chunk it
        // lands in — the ground never reshuffles as you walk back and forth.
        const cx = Math.floor(wx / GROUND_CELL);
        const cy = Math.floor(wy / GROUND_CELL);
        const mx = wx + GROUND_CELL / 2;
        const my = wy + GROUND_CELL / 2;
        // Outside the world circle is the void ring (and the underground realms
        // live out there too) — leave it bare, exactly as the colour overlay does.
        if (Math.hypot(mx - this.worldCx, my - this.worldCy) > this.worldRadius) continue;
        // The 32px block this cell belongs to. Variant and quadrant both come
        // from the block, so four cells that agree on a material redraw that
        // block's tile pixel-for-pixel — the finer grid buys boundary shape, not
        // a different-looking interior.
        const bx = cx >> 1;
        const by = cy >> 1;
        const frame = groundQuadFrame(cx & 1, cy & 1);

        // BOUNDARIES. Colour blends across a seam; a tile can't — a cell is one
        // material or the other, and a smooth curve cut that way steps. Two
        // probes soften every seam in the world at once, with no per-boundary
        // code and nothing for the colour field to disagree with:
        //   - a jittered PRIMARY, so the edge itself dithers into an
        //     interlocking band instead of running along cell lines;
        //   - a far-flung SECONDARY that reaches across the seam. Deep inside a
        //     region both agree and it costs nothing; near a border they
        //     disagree on a scattering of cells, and laying the neighbour on at
        //     partial strength widens the transition into a wash.
        const jx = mx + (cellHash(cx, cy, 11) - 0.5) * GROUND_CELL * 2.4;
        const jy = my + (cellHash(cx, cy, 23) - 0.5) * GROUND_CELL * 2.4;
        const mat = this.materialAt(jx, jy);
        rt.batchDrawFrame(
          groundTextureKey(mat, variantForCell(mat, bx, by)),
          frame,
          wx - ox,
          wy - oy,
          GROUND_ALPHA[mat],
        );
        const sx = mx + (cellHash(cx, cy, 31) - 0.5) * GROUND_CELL * 8;
        const sy = my + (cellHash(cx, cy, 47) - 0.5) * GROUND_CELL * 8;
        const near = this.materialAt(sx, sy);
        if (near !== mat) {
          // Offset the block coords so the blend tile isn't the same variant the
          // primary just drew, which would flatten the mix back to one texture.
          rt.batchDrawFrame(
            groundTextureKey(near, variantForCell(near, bx + 977, by + 313)),
            frame,
            wx - ox,
            wy - oy,
            GROUND_ALPHA[near] * 0.5,
          );
        }
      }
    }
    rt.endDraw();
  }
}
