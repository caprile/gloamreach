// Sunken Crypt layout generation (biome 3 Phase 4c — the dungeon mechanic).
//
// Framework-free like Run/Poison/Relics: no Phaser import, no scene access. It
// carves a room-and-corridor floor plan on a coarse cell grid and hands back
// plain world-space rects; MainScene turns those into floor images, solid wall
// bodies, props and spawns.
//
// Walls are returned as MERGED HORIZONTAL RUNS rather than one rect per cell.
// A crypt's wall ring is ~300 cells; six crypts of individually-bodied blocks
// would be ~1800 extra static bodies and draw calls sitting in the world for
// the whole run. Merging collapses that to ~40 segments per crypt at zero
// gameplay cost — the collision shape is identical.

export const CRYPT_CELL = 32; // world px per layout cell

export interface CryptRect {
  x: number; // world-space top-left
  y: number;
  w: number;
  h: number;
}

export interface CryptRoom extends CryptRect {
  cx: number; // world-space center (spawn/prop math wants this constantly)
  cy: number;
}

export interface CryptLayout {
  bounds: CryptRect; // the whole interior footprint (player clamp uses this)
  rooms: CryptRoom[]; // index 0 is always `entry`
  corridors: CryptRect[];
  walls: CryptRect[]; // merged runs — solid
  entry: CryptRoom; // where the player arrives / the exit stairs live
  vault: CryptRoom; // the warden + the shielded material nodes
  side: CryptRoom; // the loot chest room (falls back to a mid room)
}

// Structural subset of Phaser's RandomDataGenerator, so this file stays
// Phaser-free while callers can pass sessionRng() straight in (world-gen is
// deterministic per run).
export interface CryptRng {
  frac(): number;
  between(min: number, max: number): number;
}

interface CellRoom {
  cx0: number;
  cy0: number;
  cw: number;
  ch: number;
}

const ROOM_MIN_W = 6;
const ROOM_MAX_W = 10;
const ROOM_MIN_H = 5;
const ROOM_MAX_H = 8;
const ROOM_GAP = 2; // cells of solid rock kept between rooms
const CORRIDOR_W = 2; // cells

function roomsOverlap(a: CellRoom, b: CellRoom): boolean {
  return (
    a.cx0 - ROOM_GAP < b.cx0 + b.cw &&
    a.cx0 + a.cw + ROOM_GAP > b.cx0 &&
    a.cy0 - ROOM_GAP < b.cy0 + b.ch &&
    a.cy0 + a.ch + ROOM_GAP > b.cy0
  );
}

function centerOf(r: CellRoom): { x: number; y: number } {
  return { x: r.cx0 + Math.floor(r.cw / 2), y: r.cy0 + Math.floor(r.ch / 2) };
}

// Carve a crypt into `rect` (world px). roomCount is a target — if the rect
// can't fit that many with the spacing rule, it returns as many as it placed
// (never fewer than 2, so entry/vault always differ).
export function generateCrypt(rng: CryptRng, rect: CryptRect, roomCount: number): CryptLayout {
  const cols = Math.floor(rect.w / CRYPT_CELL);
  const rows = Math.floor(rect.h / CRYPT_CELL);
  // 1-cell margin so the outer wall ring always has room to exist inside the rect.
  const minC = 1;
  const minR = 1;

  const cellRooms: CellRoom[] = [];
  for (let attempt = 0; attempt < 400 && cellRooms.length < roomCount; attempt++) {
    const cw = rng.between(ROOM_MIN_W, ROOM_MAX_W);
    const ch = rng.between(ROOM_MIN_H, ROOM_MAX_H);
    const cand: CellRoom = {
      cx0: rng.between(minC, Math.max(minC, cols - cw - minC)),
      cy0: rng.between(minR, Math.max(minR, rows - ch - minR)),
      cw,
      ch,
    };
    if (cand.cx0 + cw + minC > cols || cand.cy0 + ch + minR > rows) continue;
    if (cellRooms.some((r) => roomsOverlap(cand, r))) continue;
    cellRooms.push(cand);
  }

  // Floor mask. Rooms first, then the corridors that connect them.
  const floor: boolean[][] = [];
  for (let r = 0; r < rows; r++) floor.push(new Array<boolean>(cols).fill(false));
  const carve = (cx0: number, cy0: number, cw: number, ch: number) => {
    for (let r = cy0; r < cy0 + ch; r++) {
      if (r < 0 || r >= rows) continue;
      for (let c = cx0; c < cx0 + cw; c++) {
        if (c < 0 || c >= cols) continue;
        floor[r][c] = true;
      }
    }
  };
  for (const room of cellRooms) carve(room.cx0, room.cy0, room.cw, room.ch);

  // Connect: walk the rooms in placement order, joining each to the nearest
  // already-connected room with an L-bend. That guarantees one connected
  // component (every room is reachable from the entry) without needing a real
  // graph/MST — a crypt is 5-7 rooms, not a maze.
  const corridors: CryptRect[] = [];
  const cellCorridor = (cx0: number, cy0: number, cw: number, ch: number) => {
    carve(cx0, cy0, cw, ch);
    corridors.push({
      x: rect.x + cx0 * CRYPT_CELL,
      y: rect.y + cy0 * CRYPT_CELL,
      w: cw * CRYPT_CELL,
      h: ch * CRYPT_CELL,
    });
  };
  for (let i = 1; i < cellRooms.length; i++) {
    const a = centerOf(cellRooms[i]);
    let best = 0;
    let bestD = Infinity;
    for (let j = 0; j < i; j++) {
      const b = centerOf(cellRooms[j]);
      const d = Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
      if (d < bestD) {
        bestD = d;
        best = j;
      }
    }
    const b = centerOf(cellRooms[best]);
    const x0 = Math.min(a.x, b.x);
    const x1 = Math.max(a.x, b.x);
    const y0 = Math.min(a.y, b.y);
    const y1 = Math.max(a.y, b.y);
    // Horizontal leg at A's row, vertical leg at B's column (an L, elbow at
    // (b.x, a.y)) — the two legs overlap at the elbow so there's never a gap.
    cellCorridor(x0, a.y, x1 - x0 + CORRIDOR_W, CORRIDOR_W);
    cellCorridor(b.x, y0, CORRIDOR_W, y1 - y0 + CORRIDOR_W);
  }

  // Walls: every non-floor cell touching floor (8-neighborhood, so diagonal
  // pinholes at corridor elbows are sealed too), merged into horizontal runs.
  const walls: CryptRect[] = [];
  const isFloor = (c: number, r: number) => r >= 0 && r < rows && c >= 0 && c < cols && floor[r][c];
  for (let r = 0; r < rows; r++) {
    let runStart = -1;
    for (let c = 0; c <= cols; c++) {
      let wall = false;
      if (c < cols && !isFloor(c, r)) {
        for (let dr = -1; dr <= 1 && !wall; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            if (isFloor(c + dc, r + dr)) {
              wall = true;
              break;
            }
          }
        }
      }
      if (wall && runStart < 0) runStart = c;
      if (!wall && runStart >= 0) {
        walls.push({
          x: rect.x + runStart * CRYPT_CELL,
          y: rect.y + r * CRYPT_CELL,
          w: (c - runStart) * CRYPT_CELL,
          h: CRYPT_CELL,
        });
        runStart = -1;
      }
    }
  }

  const rooms: CryptRoom[] = cellRooms.map((cr) => {
    const x = rect.x + cr.cx0 * CRYPT_CELL;
    const y = rect.y + cr.cy0 * CRYPT_CELL;
    const w = cr.cw * CRYPT_CELL;
    const h = cr.ch * CRYPT_CELL;
    return { x, y, w, h, cx: x + w / 2, cy: y + h / 2 };
  });

  const entry = rooms[0];
  // Vault = the room furthest from the entrance, so the payoff is always a real
  // delve rather than the first door on the left.
  let vault = rooms[rooms.length - 1];
  let vaultD = -1;
  for (const room of rooms.slice(1)) {
    const d = Math.hypot(room.cx - entry.cx, room.cy - entry.cy);
    if (d > vaultD) {
      vaultD = d;
      vault = room;
    }
  }
  // Chest room = furthest from BOTH entry and vault, so the loot detour is a
  // detour. Falls back to any non-entry/vault room, then the vault itself.
  let side = rooms.find((r) => r !== entry && r !== vault) ?? vault;
  let sideScore = -1;
  for (const room of rooms) {
    if (room === entry || room === vault) continue;
    const score =
      Math.hypot(room.cx - entry.cx, room.cy - entry.cy) + Math.hypot(room.cx - vault.cx, room.cy - vault.cy);
    if (score > sideScore) {
      sideScore = score;
      side = room;
    }
  }

  return { bounds: rect, rooms, corridors, walls, entry, vault, side };
}
