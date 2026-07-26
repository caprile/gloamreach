// Worn-equipment slots. Slots hold an EquippedItem (item key + its per-instance
// upgrade tier, same field a placed station's tier lives on — see
// StationUpgrades.ts) or null.
//
// The slot set is organised into GROUPS rather than one named slot per body
// part. It used to be helmet/chest/legs plus a pile of one-off slots —
// necklace, ring1, ring2, cloak, back(=R cape), special1(=Q), special2(=E) —
// which meant an item's slot decided which ABILITY KEY it drove, and where a
// given trinket could go was memorised trivia (the user: "generalize the ability
// slots to QER, any ability item can go in any ability slot... get rid of
// specifics like neck/ring1/etc. It's all just confusing").
//
// Now there are three groups plus ammo:
//   gear    — helmet/chest/legs. Armor, the set-bonus and armor-value carriers.
//   special — four interchangeable slots for passive jewelry/trinkets/cloaks.
//   ability — three interchangeable slots, which ARE Q/E/R by position.
//
// The payoff is that an item declares a GROUP, not a destination, and equipping
// routes it to the first free slot in that group (see MainScene's equip path).
// Adding a trinket or an ability item no longer means picking which named slot
// it competes for.
export type EquipSlot =
  | "helmet"
  | "chest"
  | "legs"
  | "special1"
  | "special2"
  | "special3"
  | "special4"
  | "ability1"
  | "ability2"
  | "ability3";

// Which family a slot belongs to. An item can only be equipped into a slot of
// its own group, and any slot within the group will do.
export type EquipSlotGroup = "gear" | "special" | "ability";

// The ability slots in hotkey order: Q, E, R. For abilities POSITION IS THE
// HOTKEY, so this doubles as the AbilityBarUI slot order — index 0 is the Q
// pip. Derived from EQUIP_SLOTS below rather than hand-listed, so it can never
// drift from the table.


export interface EquippedItem {
  key: string;
  tier: number;
  // Applied gem-augment ids (Biome-3 Phase 3, GearAugments.ts) — the same
  // per-instance field name ItemStack.upgrades uses, so a piece keeps its
  // augments across equip -> backpack -> equip with no translation step.
  upgrades?: string[];
}

// Declaration order drives the paper-doll layout (see InventoryMenu): gear
// column, then the special column, then the QER row. The Ammo slot that used to
// close this list is gone with the ammo system itself (see Weapons.ts's
// RangedWeaponConfig.ammo) — ranged weapons now just fire.
export const EQUIP_SLOTS: { id: EquipSlot; label: string; group: EquipSlotGroup }[] = [
  { id: "helmet", label: "Head", group: "gear" },
  { id: "chest", label: "Chest", group: "gear" },
  { id: "legs", label: "Legs", group: "gear" },
  { id: "special1", label: "Special", group: "special" },
  { id: "special2", label: "Special", group: "special" },
  { id: "special3", label: "Special", group: "special" },
  // Four specials, not three: three would have been a net LOSS of one passive
  // slot against the old neck + 2 rings + cloak (the user picked 4 for exactly
  // that reason).
  { id: "special4", label: "Special", group: "special" },
  // Position IS the hotkey — ability1 is Q, ability2 is E, ability3 is R.
  { id: "ability1", label: "Q", group: "ability" },
  { id: "ability2", label: "E", group: "ability" },
  { id: "ability3", label: "R", group: "ability" },
];

export const ABILITY_SLOT_IDS: EquipSlot[] = EQUIP_SLOTS.filter((s) => s.group === "ability").map((s) => s.id);

const SLOT_GROUP: Record<EquipSlot, EquipSlotGroup> = EQUIP_SLOTS.reduce(
  (acc, s) => {
    acc[s.id] = s.group;
    return acc;
  },
  {} as Record<EquipSlot, EquipSlotGroup>,
);

export function slotGroup(slot: EquipSlot): EquipSlotGroup {
  return SLOT_GROUP[slot];
}

// Whether ANY slot in the group will do for an item that declares one of them.
//
// Interchangeability is the point of the group model for specials and
// abilities — a trinket is a trinket, and for abilities position is only the
// hotkey. GEAR IS NOT INTERCHANGEABLE: helmet/chest/legs are grouped so the UI
// can draw them together and so "does this go here?" has one answer, but a
// helmet is still a helmet. Treating the three as one pool meant equipping
// routed a second pair of legs into the free chest slot, so you could wear
// three legs at once and stack their armor (the user).
const GROUP_INTERCHANGEABLE: Record<EquipSlotGroup, boolean> = {
  gear: false,
  special: true,
  ability: true,
};

export function groupIsInterchangeable(group: EquipSlotGroup): boolean {
  return GROUP_INTERCHANGEABLE[group];
}

// Can an item declaring `declared` be equipped into `target`? The single
// authority for both the drag path (is this a legal drop?) and the auto-equip
// path (where does this go?), so the two can't disagree.
export function slotAccepts(declared: EquipSlot, target: EquipSlot): boolean {
  const group = slotGroup(declared);
  if (slotGroup(target) !== group) return false;
  return groupIsInterchangeable(group) || declared === target;
}

export function slotsInGroup(group: EquipSlotGroup): EquipSlot[] {
  return EQUIP_SLOTS.filter((s) => s.group === group).map((s) => s.id);
}

// Player-facing name for a group, used by tooltips and the inventory's category
// headers so an item can say where it goes (the user: "the items in my inventory,
// the specials, it doesn't tell me what slot it can go into").
export const GROUP_LABEL: Record<EquipSlotGroup, string> = {
  gear: "Gear",
  special: "Special",
  ability: "Ability",
};

export class Equipment {
  private slots: Record<EquipSlot, EquippedItem | null> = {
    helmet: null,
    chest: null,
    legs: null,
    special1: null,
    special2: null,
    special3: null,
    special4: null,
    ability1: null,
    ability2: null,
    ability3: null,
  };

  get(slot: EquipSlot): EquippedItem | null {
    return this.slots[slot];
  }

  set(slot: EquipSlot, item: EquippedItem | null): void {
    this.slots[slot] = item;
  }

  // First slot in `group` that's empty, or null if the group is full. The equip
  // path uses this to place an item without the caller naming a slot.
  firstFreeIn(group: EquipSlotGroup): EquipSlot | null {
    return slotsInGroup(group).find((s) => this.slots[s] === null) ?? null;
  }

  // Where an item declaring `declared` should actually go when the player
  // hasn't named a destination. Interchangeable groups fill the first free slot
  // and only swap once full; a fixed group (gear) always uses the item's own
  // slot, swapping whatever is worn there.
  targetSlotFor(declared: EquipSlot): EquipSlot {
    const group = slotGroup(declared);
    if (!groupIsInterchangeable(group)) return declared;
    return this.firstFreeIn(group) ?? declared;
  }
}
