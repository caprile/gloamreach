import { ItemContainer } from "./ItemContainer";

// One entry in a world-placed lootable's roll table. Unlike Enemy's
// LootEntry (always dropped, per-kill), each entry here rolls independently
// against `chance` — a chest should feel variable across resets, not a
// guaranteed drop.
export interface LootRollEntry {
  key: string;
  min: number;
  max: number;
  chance: number;
}

// B4-P2 epic loot. Deliberately NOT expressed as extra LootRollEntry rows: an
// epic should be a single discrete event ("did this chest have one?"), not N
// independent per-item rolls that could hand out two at once. One roll against
// `chance`, then one key chosen uniformly from the pool.
//
// Pools are tiered by POI depth in MainScene (a first-5-minutes Gremlin Shack
// must never be able to produce an endgame active), and the roll lives INSIDE
// rollIfEmpty below because that method's `rolled` flag is the real gate —
// whichever call site fires first wins, so an epic rolled alongside it is
// guaranteed to happen exactly once per re-arm cycle.
export interface EpicPool {
  chance: number;
  keys: string[];
}

// Pairs an ItemContainer with a loot table + roll state for a world-placed
// lootable container (currently just the Gremlin Shack's chest). Not a
// generic "Container UI" abstraction beyond this — ChestMenu talks to
// ItemContainer directly, same as DryingRackMenu does for the backpack side.
export class LootContainer {
  readonly items: ItemContainer;
  private rolled = false;

  constructor(size: number) {
    this.items = new ItemContainer(size);
  }

  // No-op on repeat calls so re-opening an already-looted (but not yet
  // guard-respawned) chest doesn't top it back up.
  rollIfEmpty(table: LootRollEntry[], opts: { epics?: EpicPool; rng?: () => number } = {}): void {
    if (this.rolled) return;
    this.rolled = true;
    const rng = opts.rng ?? Math.random;
    for (const entry of table) {
      if (rng() >= entry.chance) continue;
      const amount = entry.min + Math.floor(rng() * (entry.max - entry.min + 1));
      this.items.add(entry.key, amount);
    }
    // The epic rides the same one-shot gate as the table itself.
    const epics = opts.epics;
    if (epics && epics.keys.length > 0 && rng() < epics.chance) {
      const key = epics.keys[Math.floor(rng() * epics.keys.length)];
      // addStack, not add: epics are maxStack-1 uniques, and add()'s by-key
      // merge would be the wrong primitive if one ever gained a tier.
      this.items.addStack({ key, count: 1 });
    }
  }

  // Whether this container currently holds any of `keys` — drives the gold
  // glow MainScene hangs on a container that has an epic waiting in it.
  holdsAny(keys: ReadonlySet<string>): boolean {
    return this.items.all().some((s) => s !== null && keys.has(s.key));
  }

  // Called once both guards actually respawn (not at guard-death time — that
  // used to allow looting, then killing the guards, then re-looting before
  // any respawn timer elapsed) — re-arms the chest to roll fresh loot next
  // time it's opened, but ONLY if it's already fully empty (a player who
  // never opened it keeps what's there; loot doesn't top itself back up for
  // free while unclaimed).
  rearmIfEmpty(): void {
    if (this.isEmpty()) this.rolled = false;
  }

  isEmpty(): boolean {
    return this.items.all().every((s) => s === null);
  }
}
