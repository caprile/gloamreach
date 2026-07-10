import { ItemContainer, type ItemStack } from "./ItemContainer";

// Row 1 (indices 0..ROW1_COUNT-1): the original tool/weapon quick-select
// slots, keyed to 1-9. Row 2 (indices ROW1_COUNT..SLOT_COUNT-1): a dedicated
// row for crafting stations/processors, keyed to Alt+1-9 — added so placing
// a station doesn't require detouring through the full inventory/hotbar-row-1
// juggle every time (see MainScene's placeable-pickup routing). Mechanically
// it's one flat selection space (single `selectedSlot`, single
// ItemContainer) — row 2 is a UI/routing convention, not a separate system.
export const ROW1_COUNT = 9;
export const ROW2_COUNT = 9;
const SLOT_COUNT = ROW1_COUNT + ROW2_COUNT;

// The quick-select slots. Backed by an ItemContainer so items truly live
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
