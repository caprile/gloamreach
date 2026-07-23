// Worn-equipment slots — first real occupants are the Gremlin Armor pieces
// (Milestone M). The layout and slot set are here so the Inventory UI can
// render the paper-doll, and combat/stat systems can hook in later. Slots
// hold an EquippedItem (item key + its per-instance upgrade tier, same field
// a placed station's tier lives on — see StationUpgrades.ts) or null.
export type EquipSlot =
  | "helmet"
  | "chest"
  | "legs"
  | "back" // the R-ability cape slot (SLOT_ABILITY_KEY back→r) — grants Q/E/R capes
  | "cloak" // stat back-armor (Mireborn Cloak) — SEPARATE from the R-ability cape so a
  //           utility cloak no longer competes with your R ability (the user 2026-07-23)
  | "necklace"
  | "ring1"
  | "ring2"
  | "special1"
  | "special2"
  | "ammo";

export interface EquippedItem {
  key: string;
  tier: number;
  // Set only for the "ammo" slot (a stack of ranged ammo), which needs a
  // quantity — every other slot holds a single qty-1 item and leaves this
  // undefined. Armor-equip logic swaps whole items; ammo-equip logic merges
  // counts of the same key instead (see MainScene.equipArmorFromContainer).
  count?: number;
  // Applied gem-augment ids (Biome-3 Phase 3, GearAugments.ts) — the same
  // per-instance field name ItemStack.upgrades uses, so a piece keeps its
  // augments across equip -> backpack -> equip with no translation step.
  upgrades?: string[];
}

export const EQUIP_SLOTS: { id: EquipSlot; label: string }[] = [
  { id: "helmet", label: "Head" },
  { id: "necklace", label: "Neck" },
  { id: "back", label: "Cape" }, // R-ability cape (bloodpact/aegis) — relabelled so it's not confused with back-armor
  { id: "cloak", label: "Cloak" }, // stat back-armor, distinct from the R cape
  { id: "chest", label: "Chest" },
  { id: "ring1", label: "Ring1" },
  { id: "ring2", label: "Ring2" },
  { id: "legs", label: "Legs" },
  { id: "special1", label: "Spec1" },
  { id: "special2", label: "Spec2" },
  { id: "ammo", label: "Ammo" },
];

export class Equipment {
  private slots: Record<EquipSlot, EquippedItem | null> = {
    helmet: null,
    chest: null,
    legs: null,
    back: null,
    cloak: null,
    necklace: null,
    ring1: null,
    ring2: null,
    special1: null,
    special2: null,
    ammo: null,
  };

  get(slot: EquipSlot): EquippedItem | null {
    return this.slots[slot];
  }

  set(slot: EquipSlot, item: EquippedItem | null): void {
    this.slots[slot] = item;
  }
}
