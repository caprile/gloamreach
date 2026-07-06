// Worn-equipment slots. All placeholders for now — no armor items exist yet,
// so every slot stays empty. The layout and slot set are here so the
// Inventory UI can render the paper-doll, and combat/stat systems can hook in
// later. Slots hold an item key (see Items.ts) or null.
export type EquipSlot =
  | "helmet"
  | "chest"
  | "legs"
  | "back"
  | "necklace"
  | "ring1"
  | "ring2"
  | "special1"
  | "special2";

export const EQUIP_SLOTS: { id: EquipSlot; label: string }[] = [
  { id: "helmet", label: "Head" },
  { id: "necklace", label: "Neck" },
  { id: "back", label: "Back" },
  { id: "chest", label: "Chest" },
  { id: "ring1", label: "Ring1" },
  { id: "ring2", label: "Ring2" },
  { id: "legs", label: "Legs" },
  { id: "special1", label: "Spec1" },
  { id: "special2", label: "Spec2" },
];

export class Equipment {
  private slots: Record<EquipSlot, string | null> = {
    helmet: null,
    chest: null,
    legs: null,
    back: null,
    necklace: null,
    ring1: null,
    ring2: null,
    special1: null,
    special2: null,
  };

  get(slot: EquipSlot): string | null {
    return this.slots[slot];
  }

  set(slot: EquipSlot, itemKey: string | null): void {
    this.slots[slot] = itemKey;
  }
}
