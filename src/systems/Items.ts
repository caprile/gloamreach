import type { ToolType } from "../entities/ResourceNode";
import type { WeaponType } from "./Weapons";

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
    maxStack: 99,
    hotbarable: false,
    stats: [{ label: "Type", value: "Build" }],
    placeable: true,
  },

  workbench: {
    key: "workbench",
    name: "Workbench",
    description: "A placeable bench required for more advanced recipes.",
    texture: "icon_workbench",
    maxStack: 99,
    hotbarable: false,
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
};

export function itemDef(key: string): ItemDef | undefined {
  return ITEM_DEFS[key];
}
