import { itemDef, itemBiome, itemCategory, type ItemCategory } from "./Items";

// Biome then category ordering used by sortAndStack so a re-flowed backpack
// physically clusters the way the tabbed inventory view groups it (forest
// first, then badlands; within a biome, materials -> gear -> stations -> food
// -> curios). Kept here (not in the UI) so a plain sort matches the view.
const BIOME_ORDER: Record<string, number> = { forest: 0, badlands: 1, bayou: 2 };
const CATEGORY_ORDER: Record<ItemCategory, number> = {
  material: 0,
  gear: 1,
  station: 2,
  food: 3,
  curio: 4,
};

// A single stack of one item type. `count` is always >= 1 while the stack
// exists; emptied stacks become null slots.
export interface ItemStack {
  key: string;
  count: number;
  // Per-instance upgrade tier, carried on placeable/upgradable items (a placed
  // station's tier survives Destroy -> pickup -> re-Place through this field;
  // Gremlin armor levels reuse it). Absent/0 for ordinary stackables. Tiered
  // items force maxStack 1 (see maxStackOf) so two different-tier instances
  // never merge into one count and silently lose a tier.
  tier?: number;
  // Which station-upgrade ids a placed station has applied (level == length,
  // any order — see StationUpgrades' no-ladder model). Only present on
  // placeable stations that have been upgraded; carried across Destroy ->
  // pickup -> re-Place alongside `tier` so the applied set survives (without
  // it, a re-placed station couldn't tell which upgrades remain and the
  // cheapest one could be spammed to max the level).
  upgrades?: string[];
}

function maxStackOf(key: string): number {
  return itemDef(key)?.maxStack ?? 99;
}

// A fixed-size array of item slots. This is the single source of truth for
// "where an item is" — the backpack and the hotbar are each an ItemContainer,
// and items move between slots (never copy). That single-location invariant is
// what fixes the old "one item in many slots" and "2nd craft eaten" bugs.
export class ItemContainer {
  private slots: (ItemStack | null)[];

  constructor(size: number) {
    this.slots = new Array(size).fill(null);
  }

  get size(): number {
    return this.slots.length;
  }

  slot(i: number): ItemStack | null {
    return this.slots[i] ?? null;
  }

  set(i: number, stack: ItemStack | null): void {
    this.slots[i] = stack;
  }

  all(): ReadonlyArray<ItemStack | null> {
    return this.slots;
  }

  // Add `count` of `key`, filling existing stacks first then empty slots.
  // Returns however much didn't fit (0 when it all landed).
  add(key: string, count: number): number {
    const max = maxStackOf(key);
    for (const s of this.slots) {
      if (count <= 0) break;
      if (s && s.key === key && s.count < max) {
        const take = Math.min(max - s.count, count);
        s.count += take;
        count -= take;
      }
    }
    for (let i = 0; i < this.slots.length && count > 0; i++) {
      if (this.slots[i] === null) {
        const take = Math.min(max, count);
        this.slots[i] = { key, count: take };
        count -= take;
      }
    }
    return count;
  }

  // Place a whole stack (preserving per-instance metadata like `tier`) into
  // the first empty slot. Used for tiered pickups where `add()`'s merge-by-key
  // path would drop the tier. Returns true if it landed, false if full.
  addStack(stack: ItemStack): boolean {
    for (let i = 0; i < this.slots.length; i++) {
      if (this.slots[i] === null) {
        this.slots[i] = stack;
        return true;
      }
    }
    return false;
  }

  hasRoomFor(key: string, count: number): boolean {
    return this.roomFor(key) >= count;
  }

  // Total additional units of `key` this container can hold right now, across
  // existing partial stacks plus empty slots — used to cap a batch-quantity
  // slider (crafting/cooking) so it can't compute a size that would silently
  // overflow the backpack.
  roomFor(key: string): number {
    const max = maxStackOf(key);
    let room = 0;
    for (const s of this.slots) {
      if (s === null) room += max;
      else if (s.key === key) room += max - s.count;
    }
    return room;
  }

  count(key: string): number {
    let n = 0;
    for (const s of this.slots) if (s && s.key === key) n += s.count;
    return n;
  }

  // Remove up to `n` of `key` across stacks, clearing emptied slots.
  removeCount(key: string, n: number): void {
    for (let i = 0; i < this.slots.length && n > 0; i++) {
      const s = this.slots[i];
      if (s && s.key === key) {
        const take = Math.min(s.count, n);
        s.count -= take;
        n -= take;
        if (s.count === 0) this.slots[i] = null;
      }
    }
  }

  // First slot that can accept `key`: a same-key stack with room, else an
  // empty slot. Null when the container can't take it. Used by right-click
  // quick-move.
  findAssignable(key: string): number | null {
    const max = maxStackOf(key);
    for (let i = 0; i < this.slots.length; i++) {
      const s = this.slots[i];
      if (s && s.key === key && s.count < max) return i;
    }
    for (let i = 0; i < this.slots.length; i++) {
      if (this.slots[i] === null) return i;
    }
    return null;
  }
}

// Re-flow every stack in `container` into as few slots as possible, sorted by
// key (then tier). Merges same-key/same-tier stacks up to their max stack
// size, splitting overflow into additional stacks, and repacks front-to-back
// — the rest of the container's now-empty tail slots are just left null.
export function sortAndStack(container: ItemContainer): void {
  const totals = new Map<string, { key: string; tier?: number; upgrades?: string[]; count: number }>();
  let uniqueSeq = 0;
  for (const s of container.all()) {
    if (!s) continue;
    // A stack carrying per-instance upgrade state must never be merged away —
    // give each its own group so its `upgrades` array survives the re-flow.
    const groupKey = s.upgrades ? `${s.key}#u${uniqueSeq++}` : `${s.key}#${s.tier ?? ""}`;
    const existing = totals.get(groupKey);
    if (existing) existing.count += s.count;
    else totals.set(groupKey, { key: s.key, tier: s.tier, upgrades: s.upgrades, count: s.count });
  }

  const packed: ItemStack[] = [];
  const sorted = [...totals.values()].sort((a, b) => {
    // Biome first, then category, then name — so the physical layout mirrors
    // the tabbed-by-biome / sectioned inventory view.
    const bd = (BIOME_ORDER[itemBiome(a.key)] ?? 0) - (BIOME_ORDER[itemBiome(b.key)] ?? 0);
    if (bd !== 0) return bd;
    const cd = CATEGORY_ORDER[itemCategory(a.key)] - CATEGORY_ORDER[itemCategory(b.key)];
    if (cd !== 0) return cd;
    if (a.key !== b.key) return a.key < b.key ? -1 : 1;
    return (a.tier ?? 0) - (b.tier ?? 0);
  });
  for (const group of sorted) {
    const max = maxStackOf(group.key);
    let remaining = group.count;
    while (remaining > 0) {
      const take = Math.min(max, remaining);
      packed.push({ key: group.key, count: take, tier: group.tier, upgrades: group.upgrades });
      remaining -= take;
    }
  }

  for (let i = 0; i < container.size; i++) {
    container.set(i, packed[i] ?? null);
  }
}

// Move the stack at src[si] onto dst[di]: merge if same stackable key (leaving
// any overflow in the source), otherwise swap. The one primitive behind every
// drag/rearrange (works within a container and across backpack<->hotbar).
export function moveSlot(
  src: ItemContainer,
  si: number,
  dst: ItemContainer,
  di: number,
): void {
  if (src === dst && si === di) return;
  const from = src.slot(si);
  if (!from) return;
  const to = dst.slot(di);

  if (to && to.key === from.key) {
    const max = maxStackOf(from.key);
    const take = Math.min(max - to.count, from.count);
    to.count += take;
    from.count -= take;
    if (from.count === 0) src.set(si, null);
    return;
  }

  // Swap (either an empty destination or a different item).
  dst.set(di, from);
  src.set(si, to);
}
