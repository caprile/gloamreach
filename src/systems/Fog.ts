// Fog-of-war reveal grid for the minimap (World & discovery roadmap item 6).
// Deliberately its own grid, independent of Biome.ts's 40px gameplay grid —
// this one is sized 1:1 to the minimap's pixel resolution so MinimapUI can
// draw a revealed cell directly with no extra scaling math. Framework-light
// like Inventory/Stamina: no Phaser dependency at all, just typed arrays.

// World px a reveal expands per call — rough parity with the aggro-radius
// scale other enemies already use (Boar/Gremlin sit in the 130-260px range).
// Exported so MainScene can use the exact same radius to decide when a fixed
// landmark (e.g. the Boss Altar) counts as "discovered" for the minimap.
export const REVEAL_RADIUS = 260;

export class FogOfWar {
  readonly cols: number;
  readonly rows: number;
  readonly scale: number; // world px per fog cell (same on both axes)
  private revealed: Uint8Array;
  // Cells revealed since the last consumeNewlyRevealed() call — lets
  // MinimapUI draw only what changed instead of repainting the whole map.
  private newlyRevealed: { cx: number; cy: number }[] = [];

  constructor(worldW: number, worldH: number, cols: number, rows: number) {
    this.cols = cols;
    this.rows = rows;
    this.scale = worldW / cols; // assumes worldH/rows lands on the same scale
    this.revealed = new Uint8Array(cols * rows);
  }

  // Marks every unrevealed cell within REVEAL_RADIUS of the player as
  // revealed. Bounded to a local window around the player's own cell (not a
  // full-grid scan), so this stays cheap regardless of world size — call
  // freely every frame.
  reveal(playerX: number, playerY: number): void {
    const pcx = playerX / this.scale;
    const pcy = playerY / this.scale;
    const r = REVEAL_RADIUS / this.scale;
    const minCx = Math.max(0, Math.floor(pcx - r));
    const maxCx = Math.min(this.cols - 1, Math.ceil(pcx + r));
    const minCy = Math.max(0, Math.floor(pcy - r));
    const maxCy = Math.min(this.rows - 1, Math.ceil(pcy + r));
    const r2 = r * r;
    for (let cy = minCy; cy <= maxCy; cy++) {
      for (let cx = minCx; cx <= maxCx; cx++) {
        const dx = cx + 0.5 - pcx;
        const dy = cy + 0.5 - pcy;
        if (dx * dx + dy * dy > r2) continue;
        const i = cy * this.cols + cx;
        if (this.revealed[i]) continue;
        this.revealed[i] = 1;
        this.newlyRevealed.push({ cx, cy });
      }
    }
  }

  // Whether the cell containing a world point has been revealed yet. Used by
  // M-DN's nightfall surge to prefer still-fogged (unexplored) spawn cells.
  // Out-of-bounds reads as revealed (nothing to spawn beyond the world edge).
  isRevealed(worldX: number, worldY: number): boolean {
    const cx = Math.floor(worldX / this.scale);
    const cy = Math.floor(worldY / this.scale);
    if (cx < 0 || cy < 0 || cx >= this.cols || cy >= this.rows) return true;
    return this.revealed[cy * this.cols + cx] === 1;
  }

  // Drains and returns the newly-revealed queue.
  consumeNewlyRevealed(): { cx: number; cy: number }[] {
    if (this.newlyRevealed.length === 0) return this.newlyRevealed;
    const out = this.newlyRevealed;
    this.newlyRevealed = [];
    return out;
  }
}
