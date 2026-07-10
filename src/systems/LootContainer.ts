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
  rollIfEmpty(table: LootRollEntry[], rng: () => number = Math.random): void {
    if (this.rolled) return;
    this.rolled = true;
    for (const entry of table) {
      if (rng() >= entry.chance) continue;
      const amount = entry.min + Math.floor(rng() * (entry.max - entry.min + 1));
      this.items.add(entry.key, amount);
    }
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
