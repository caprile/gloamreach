import type { ToolType } from "../entities/ResourceNode";
import type { WeaponType } from "./Weapons";
import type { EquipSlot, EquippedItem } from "./Equipment";

// Armor material classes — double as the two armor Skill types (Skills.ts).
export type ArmorType = "heavy_armor" | "light_armor";

// Central display + behaviour metadata for every item that can live in the
// inventory: raw resources AND crafted outputs. Keyed by the item's stable
// key — a resource key ("wood"), a tool's ToolType ("stone_axe"), or an
// item id ("torch"). Icon textures are generated in BootScene.
export interface ItemStat {
  label: string;
  value: string;
}

export interface ItemDef {
  key: string;
  name: string;
  description: string;
  texture: string; // placeholder icon baked in BootScene
  maxStack: number; // 99 for stackables; 1 for durability items (tools/weapons)
  hotbarable: boolean; // may this sit in a 1-9 hotbar slot?
  tool?: ToolType; // set for tool items — selecting it in the hotbar equips it
  weapon?: WeaponType; // set for weapon items — selecting it in the hotbar equips it
  armorSlot?: EquipSlot; // set for armor items — drag-onto-slot or right-click equips it
  armorType?: ArmorType; // set for armor items — which armor skill a kill grants XP to
  armorDefense?: number; // base (tier-0) flat damage reduction — see ArmorUpgrades.armorDefenseForTier
  stats?: ItemStat[];
  // World-placed items (campfires, building pieces) skip the backpack
  // entirely — crafting one enters placement mode instead. Per-item, not
  // inferred from category.
  placeable?: boolean;
}

export const ITEM_DEFS: Record<string, ItemDef> = {
  // --- raw resources (now first-class stackable items) ---
  wood: {
    key: "wood",
    name: "Wood",
    description: "A bundle of wood. Crafting material.",
    texture: "icon_wood",
    maxStack: 99,
    hotbarable: false,
  },
  stone: {
    key: "stone",
    name: "Stone",
    description: "Rough stone. Crafting material.",
    texture: "icon_stone",
    maxStack: 99,
    hotbarable: false,
  },
  leather: {
    key: "leather",
    name: "Leather Scraps",
    description: "Scraps of hide. Crafting material.",
    texture: "icon_leather",
    maxStack: 99,
    hotbarable: false,
  },

  // --- tools ---
  stone_axe: {
    key: "stone_axe",
    name: "Stone Axe",
    description: "A crude axe for chopping trees.",
    texture: "icon_stone_axe",
    maxStack: 1,
    hotbarable: true,
    tool: "stone_axe",
    stats: [
      { label: "Type", value: "Axe" },
      { label: "Gather", value: "Wood" },
    ],
  },
  stone_pickaxe: {
    key: "stone_pickaxe",
    name: "Stone Pickaxe",
    description: "A crude pickaxe for mining boulders.",
    texture: "icon_stone_pickaxe",
    maxStack: 1,
    hotbarable: true,
    tool: "stone_pickaxe",
    stats: [
      { label: "Type", value: "Pickaxe" },
      { label: "Gather", value: "Stone" },
    ],
  },
  torch: {
    key: "torch",
    name: "Torch",
    description: "A handheld light source.",
    texture: "icon_torch",
    maxStack: 99,
    hotbarable: true,
    stats: [{ label: "Type", value: "Light" }],
  },

  // --- weapons ---
  wood_club: {
    key: "wood_club",
    name: "Wood Club",
    description: "A simple bat for bashing things.",
    texture: "icon_wood_club",
    maxStack: 1,
    hotbarable: true,
    weapon: "wood_club",
    stats: [
      { label: "Type", value: "Weapon" },
      { label: "Damage", value: "3" },
      { label: "Damage Type", value: "Blunt" },
      { label: "Stamina", value: "10" },
      { label: "Attack Speed", value: "2.2/s" },
    ],
  },
  stone_club: {
    key: "stone_club",
    name: "Stone Club",
    description: "A heavier club with a stone head.",
    texture: "icon_stone_club",
    maxStack: 1,
    hotbarable: true,
    weapon: "stone_club",
    stats: [
      { label: "Type", value: "Weapon" },
      { label: "Damage", value: "5" },
      { label: "Damage Type", value: "Blunt" },
      { label: "Stamina", value: "14" },
      { label: "Attack Speed", value: "1.8/s" },
    ],
  },
  bone_knife: {
    key: "bone_knife",
    name: "Bone Knife",
    description: "A quick blade honed from a sharpened bone.",
    texture: "icon_bone_knife",
    maxStack: 1,
    hotbarable: true,
    weapon: "bone_knife",
    stats: [
      { label: "Type", value: "Weapon" },
      { label: "Damage", value: "4" },
      { label: "Damage Type", value: "Slash" },
      { label: "Stamina", value: "8" },
      { label: "Attack Speed", value: "2.9/s" },
    ],
  },
  primal_spear: {
    key: "primal_spear",
    name: "Primal Spear",
    description: "A wood-and-bone spear built for a heavier, slower strike.",
    texture: "icon_primal_spear",
    maxStack: 1,
    hotbarable: true,
    weapon: "primal_spear",
    stats: [
      { label: "Type", value: "Weapon" },
      { label: "Damage", value: "8" },
      { label: "Damage Type", value: "Pierce" },
      { label: "Stamina", value: "16" },
      { label: "Attack Speed", value: "1.5/s" },
    ],
  },

  // --- crafting / build (not hotbar-able) ---
  shishkabob: {
    key: "shishkabob",
    name: "Shishkabob",
    description: "A skewer for cooking meat and vegetables over a fire.",
    texture: "icon_shishkabob",
    maxStack: 99,
    hotbarable: false,
    stats: [{ label: "Type", value: "Cooking" }],
  },
  campfire: {
    key: "campfire",
    name: "Campfire",
    description: "A placeable fire for light, warmth, and cooking.",
    texture: "icon_campfire",
    // Placeables stack to 1: each carries its own per-instance tier once
    // upgrades exist, so two must never merge into a single count.
    maxStack: 1,
    hotbarable: true,
    stats: [{ label: "Type", value: "Build" }],
    placeable: true,
  },

  workbench: {
    key: "workbench",
    name: "Workbench",
    description: "A placeable bench required for more advanced recipes.",
    texture: "icon_workbench",
    maxStack: 1,
    hotbarable: true,
    stats: [{ label: "Type", value: "Build" }],
    placeable: true,
  },

  // --- loot ---
  boar_meat: {
    key: "boar_meat",
    name: "Boar Meat",
    description: "Raw meat from a boar. Can be cooked.",
    texture: "icon_boar_meat",
    maxStack: 99,
    hotbarable: false,
  },
  bones: {
    key: "bones",
    name: "Bones",
    description: "Bones from a slain boar. Crafting material.",
    texture: "icon_bones",
    maxStack: 99,
    hotbarable: false,
  },
  gremlin_blood: {
    key: "gremlin_blood",
    name: "Gremlin Blood",
    description: "Dark blood from a slain gremlin. Processed into Gremlin Guck at a Drying Rack.",
    texture: "icon_gremlin_blood",
    maxStack: 99,
    hotbarable: false,
  },
  gremlin_skin: {
    key: "gremlin_skin",
    name: "Gremlin Skin",
    description: "Tough hide from a ranged gremlin. Processed into leather at a Drying Rack.",
    texture: "icon_gremlin_skin",
    maxStack: 99,
    hotbarable: false,
  },

  // --- harvestables ---
  cattail: {
    key: "cattail",
    name: "Cattail",
    description: "A reed harvested from the creek's edge.",
    texture: "icon_cattail",
    maxStack: 99,
    hotbarable: false,
  },
  blackberry: {
    key: "blackberry",
    name: "Blackberries",
    description: "Sweet wild berries from a forest bush.",
    texture: "icon_blackberry",
    maxStack: 99,
    hotbarable: false,
  },

  // --- processed goods (Drying Rack outputs) ---
  twine: {
    key: "twine",
    name: "Twine",
    description: "Cord twisted from dried reeds. Crafting material.",
    texture: "icon_twine",
    maxStack: 99,
    hotbarable: false,
  },
  gremlin_leather: {
    key: "gremlin_leather",
    name: "Gremlin Leather",
    description: "Cured gremlin hide. Used to craft armor.",
    texture: "icon_gremlin_leather",
    maxStack: 99,
    hotbarable: false,
  },
  gremlin_guck: {
    key: "gremlin_guck",
    name: "Gremlin Guck",
    description: "Thickened gremlin blood, rendered down at a Drying Rack. Crafting material.",
    texture: "icon_gremlin_guck",
    maxStack: 99,
    hotbarable: false,
  },

  // --- processing station ---
  drying_rack: {
    key: "drying_rack",
    name: "Drying Rack",
    description: "A placeable rack that dries raw goods into refined materials on demand. Requires a nearby Workbench to build.",
    texture: "icon_drying_rack",
    maxStack: 1,
    hotbarable: true,
    stats: [{ label: "Type", value: "Station" }],
    placeable: true,
  },

  // --- armor ---
  gremlin_cap: {
    key: "gremlin_cap",
    name: "Gremlin Cap",
    description: "A light cap stitched from cured gremlin leather.",
    texture: "icon_gremlin_cap",
    maxStack: 1,
    hotbarable: false,
    armorSlot: "helmet",
    armorType: "light_armor",
    armorDefense: 2,
    stats: [
      { label: "Type", value: "Armor (Head)" },
      { label: "Armor Type", value: "Light" },
      { label: "Armor", value: "2" },
    ],
  },
  gremlin_shirt: {
    key: "gremlin_shirt",
    name: "Gremlin Shirt",
    description: "A tough shirt of cured gremlin leather reinforced with bone.",
    texture: "icon_gremlin_shirt",
    maxStack: 1,
    hotbarable: false,
    armorSlot: "chest",
    armorType: "light_armor",
    armorDefense: 4,
    stats: [
      { label: "Type", value: "Armor (Chest)" },
      { label: "Armor Type", value: "Light" },
      { label: "Armor", value: "4" },
    ],
  },
  gremlin_pants: {
    key: "gremlin_pants",
    name: "Gremlin Pants",
    description: "Leg wraps of cured gremlin leather and scrap hide.",
    texture: "icon_gremlin_pants",
    maxStack: 1,
    hotbarable: false,
    armorSlot: "legs",
    armorType: "light_armor",
    armorDefense: 3,
    stats: [
      { label: "Type", value: "Armor (Legs)" },
      { label: "Armor Type", value: "Light" },
      { label: "Armor", value: "3" },
    ],
  },

  // --- boss altar ---
  gremlin_totem: {
    key: "gremlin_totem",
    name: "Gremlin Totem",
    description: "A grim totem bound with gremlin remains. Placed into the Boss Altar's fire to summon its guardian.",
    texture: "icon_gremlin_totem",
    maxStack: 99,
    hotbarable: true,
    stats: [{ label: "Type", value: "Ritual Item" }],
  },
  gremlin_king_fang: {
    key: "gremlin_king_fang",
    name: "Gremlin King Fang",
    description: "A massive fang torn from the Gremlin King. Feels like it should be good for something.",
    texture: "icon_gremlin_king_fang",
    maxStack: 99,
    hotbarable: false,
  },
};

export function itemDef(key: string): ItemDef | undefined {
  return ITEM_DEFS[key];
}

// Distinct armor material types currently worn across the given equip slots
// (deduped — two Light pieces count once). Used to grant per-armor-type skill
// XP on a kill. Lives here since Items.ts owns armorType lookups.
export function armorTypesWorn(slots: (EquippedItem | null)[]): ArmorType[] {
  const out = new Set<ArmorType>();
  for (const eq of slots) {
    if (!eq) continue;
    const t = ITEM_DEFS[eq.key]?.armorType;
    if (t) out.add(t);
  }
  return [...out];
}
