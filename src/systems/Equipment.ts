// Worn-equipment slots — first real occupants are the Gremlin Armor pieces
// (Milestone M). The layout and slot set are here so the Inventory UI can
// render the paper-doll, and combat/stat systems can hook in later. Slots
// hold an EquippedItem (item key + its per-instance upgrade tier, same field
// a placed station's tier lives on — see StationUpgrades.ts) or null.
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

export interface EquippedItem {
  key: string;
  tier: number;
}

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
  private slots: Record<EquipSlot, EquippedItem | null> = {
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

  get(slot: EquipSlot): EquippedItem | null {
    return this.slots[slot];
  }

  set(slot: EquipSlot, item: EquippedItem | null): void {
    this.slots[slot] = item;
  }
}
