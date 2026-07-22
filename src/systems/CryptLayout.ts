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

// Is a world point on walkable crypt floor (any room or corridor)? Used by the
// scene both to keep dwellers off the rock and to place things that must sit in
// the open. `margin` shrinks each rect, so "on floor" can mean "well inside it".
export function isCryptFloor(layout: CryptLayout, x: number, y: number, margin = 0): boolean {
  const inside = (r: CryptRect) =>
    x >= r.x + margin && x <= r.x + r.w - margin && y >= r.y + margin && y <= r.y + r.h - margin;
  return layout.rooms.some(inside) || layout.corridors.some(inside);
}

// Nearest point on walkable floor to (x, y) — the fallback when something has
// ended up in the rock (a burrow, a leap, a knockback). Returns the closest
// clamped point across all floor rects rather than the closest rect's center, so
// the correction is the smallest one that works.
export function nearestCryptFloorPoint(
  layout: CryptLayout,
  x: number,
  y: number,
  margin = 12,
): { x: number; y: number } {
  let best = { x, y };
  let bestD = Infinity;
  for (const r of [...layout.rooms, ...layout.corridors]) {
    const cx = Math.min(Math.max(x, r.x + margin), r.x + r.w - margin);
    const cy = Math.min(Math.max(y, r.y + margin), r.y + r.h - margin);
    const d = (cx - x) ** 2 + (cy - y) ** 2;
    if (d < bestD) {
      bestD = d;
      best = { x: cx, y: cy };
    }
  }
  return best;
}

// --- coarse navigation over the floor plan ---
//
// Making dungeon dwellers collide with walls immediately exposed the reason the
// engine-wide default is "enemies walk through terrain": a straight-line chaser
// presses into the wall between it and the player and never finds the door
// (measured: closed 545px → 276px, then sat there). Rather than reintroduce the
// per-frame obstacle-avoidance heuristic that was deleted from this codebase
// once already, navigate the structure we ALREADY have — a crypt is a dozen-odd
// rectangles, so room→corridor→room is a tiny BFS, and the waypoint is the
// middle of the overlap between two rects, i.e. the actual doorway.

interface FloorGraph {
  rects: CryptRect[];
  neighbors: number[][];
}

const graphCache = new WeakMap<CryptLayout, FloorGraph>();
const pathCache = new WeakMap<CryptLayout, Map<string, number>>();

function overlap1D(a0: number, a1: number, b0: number, b1: number): [number, number] | null {
  const lo = Math.max(a0, b0);
  const hi = Math.min(a1, b1);
  return hi >= lo ? [lo, hi] : null;
}

function floorGraph(layout: CryptLayout): FloorGraph {
  const cached = graphCache.get(layout);
  if (cached) return cached;
  const rects = [...layout.rooms, ...layout.corridors];
  const neighbors: number[][] = rects.map(() => []);
  for (let i = 0; i < rects.length; i++) {
    for (let j = i + 1; j < rects.length; j++) {
      const a = rects[i];
      const b = rects[j];
      // "Adjacent" = genuinely overlapping (corridors are carved INTO the rooms
      // they connect), with enough width for a body to pass through.
      const ox = overlap1D(a.x, a.x + a.w, b.x, b.x + b.w);
      const oy = overlap1D(a.y, a.y + a.h, b.y, b.y + b.h);
      if (!ox || !oy) continue;
      if (ox[1] - ox[0] < 24 || oy[1] - oy[0] < 24) continue;
      neighbors[i].push(j);
      neighbors[j].push(i);
    }
  }
  const graph = { rects, neighbors };
  graphCache.set(layout, graph);
  return graph;
}

// Which rect is a point in? Rooms and corridors OVERLAP by construction, so
// "first match" flip-flops between them as something walks through a doorway and
// the path oscillates. Pick the rect the point sits DEEPEST inside instead —
// that's stable frame to frame.
function rectIndexAt(graph: FloorGraph, x: number, y: number): number {
  let best = -1;
  let bestInset = -Infinity;
  for (let i = 0; i < graph.rects.length; i++) {
    const r = graph.rects[i];
    if (x < r.x || x > r.x + r.w || y < r.y || y > r.y + r.h) continue;
    const inset = Math.min(x - r.x, r.x + r.w - x, y - r.y, r.y + r.h - y);
    if (inset > bestInset) {
      bestInset = inset;
      best = i;
    }
  }
  return best;
}

// Next rect index on the shortest hop-path from `from` to `to` (-1 if same rect
// or unreachable). Memoized per layout — a crypt's graph never changes.
function nextHop(layout: CryptLayout, graph: FloorGraph, from: number, to: number): number {
  if (from < 0 || to < 0 || from === to) return -1;
  let cache = pathCache.get(layout);
  if (!cache) {
    cache = new Map();
    pathCache.set(layout, cache);
  }
  const key = `${from}:${to}`;
  const hit = cache.get(key);
  if (hit !== undefined) return hit;

  const prev = new Array<number>(graph.rects.length).fill(-2);
  prev[from] = -1;
  const queue = [from];
  let found = false;
  while (queue.length > 0 && !found) {
    const cur = queue.shift() as number;
    for (const n of graph.neighbors[cur]) {
      if (prev[n] !== -2) continue;
      prev[n] = cur;
      if (n === to) {
        found = true;
        break;
      }
      queue.push(n);
    }
  }
  let step = -1;
  if (found) {
    let cur = to;
    while (prev[cur] !== from && prev[cur] >= 0) cur = prev[cur];
    step = prev[cur] === from ? cur : -1;
  }
  cache.set(key, step);
  return step;
}

// Where should something at (fromX, fromY) actually walk to reach (toX, toY)?
// Returns null when it's already in the same rect — then chase directly. Any
// other case returns the doorway (overlap center) into the next rect along.
export function cryptNavWaypoint(
  layout: CryptLayout,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
): { x: number; y: number } | null {
  const graph = floorGraph(layout);
  const to = rectIndexAt(graph, toX, toY);
  let cur = rectIndexAt(graph, fromX, fromY);
  if (cur < 0 || to < 0 || cur === to) return null;

  // Walk forward until we find a seam that is actually somewhere ELSE. Standing
  // in a doorway means you're inside both rects at once, so the first seam can
  // be the spot you already occupy — re-planning to your own position every
  // frame (observed: waypoint distance 0, and the zero-length heading collapsed
  // to "due east"). Looking one hop further is safe: being on the seam means
  // you're inside the next rect too, so the straight line stays on floor.
  for (let hop = 0; hop < 3; hop++) {
    const step = nextHop(layout, graph, cur, to);
    if (step < 0) return null;
    const a = graph.rects[cur];
    const b = graph.rects[step];
    const ox = overlap1D(a.x, a.x + a.w, b.x, b.x + b.w);
    const oy = overlap1D(a.y, a.y + a.h, b.y, b.y + b.h);
    if (!ox || !oy) return null;
    // The center of the OVERLAP REGION, and nothing beyond it. The overlap is a
    // rectangle contained in both rects, and a rectangle is convex — so a
    // straight line to it from inside the current rect stays on floor, which is
    // exactly the guarantee a steering agent needs. An earlier version pushed
    // the waypoint further into the next rect, lost that property, and enemies
    // drove into a wall forever (blocked.down, 226px still to go).
    const wp = { x: (ox[0] + ox[1]) / 2, y: (oy[0] + oy[1]) / 2 };
    if (Math.hypot(wp.x - fromX, wp.y - fromY) > 20) return wp;
    cur = step;
    if (cur === to) return null; // already in the target rect: chase directly
  }
  return null;
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

// Minimums matter: the vault has to fit a 1.5–1.8× warden plus two rings of
// material nodes AND leave room to dodge, so a 6×5 room (192×160) was too small
// — its node ring ended up inside the walls.
const ROOM_MIN_W = 8;
const ROOM_MAX_W = 12;
const ROOM_MIN_H = 7;
const ROOM_MAX_H = 10;
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
  // Vault = a room that is both FAR from the entrance (the payoff is a real
  // delve, not the first door on the left) and BIG (it has to hold the warden,
  // two rings of material nodes, and space to dodge in). Take the far half by
  // distance, then the largest of those — distance alone once handed the boss
  // fight a broom cupboard.
  const others = rooms.slice(1);
  const byDistance = [...others].sort(
    (a, b) =>
      Math.hypot(b.cx - entry.cx, b.cy - entry.cy) - Math.hypot(a.cx - entry.cx, a.cy - entry.cy),
  );
  const farHalf = byDistance.slice(0, Math.max(1, Math.ceil(byDistance.length / 2)));
  let vault = farHalf[0] ?? rooms[rooms.length - 1];
  for (const room of farHalf) {
    if (room.w * room.h > vault.w * vault.h) vault = room;
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
