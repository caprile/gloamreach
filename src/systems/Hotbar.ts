import { ItemContainer, type ItemStack } from "./ItemContainer";

const SLOT_COUNT = 9;

// The 9 quick-select slots. Backed by an ItemContainer so items truly live
// here (moved in from the backpack, not copied). Tracks which slot is
// selected; selecting a slot that holds a tool equips it (handled in
// MainScene). Assignment/rearrangement happens via drag or right-click.
export class Hotbar {
  readonly container = new ItemContainer(SLOT_COUNT);
  private selectedSlot = 0;

  get(slot: number): ItemStack | null {
    return this.container.slot(slot);
  }

  all(): ReadonlyArray<ItemStack | null> {
    return this.container.all();
  }

  select(slot: number): void {
    this.selectedSlot = slot;
  }

  selected(): number {
    return this.selectedSlot;
  }

  get size(): number {
    return SLOT_COUNT;
  }
}
