import { itemDef } from "./Items";

// A single stack of one item type. `count` is always >= 1 while the stack
// exists; emptied stacks become null slots.
export interface ItemStack {
  key: string;
  count: number;
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

  hasRoomFor(key: string, count: number): boolean {
    const max = maxStackOf(key);
    let room = 0;
    for (const s of this.slots) {
      if (s === null) room += max;
      else if (s.key === key) room += max - s.count;
      if (room >= count) return true;
    }
    return room >= count;
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
