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
  // Set for food/consumables — right-clicking the item eats one, applying a
  // timed heal-over-time buff (Buffs.ts). The Tooltip derives its "Effect"/
  // "Right-click to eat" lines from this, so the numbers live in one place.
  edible?: { hpPerSec: number; durationMs: number };
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
    name: "Woodcutter's Axe",
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
    description: "A handheld light source. Lights the way at night.",
    texture: "icon_torch",
    maxStack: 1, // torches can't stack (M-DN) — one held light source at a time
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
  slingshot: {
    key: "slingshot",
    name: "Slingshot",
    description: "A simple ranged launcher. Chip damage from a safe distance — load it with pellets from the backpack.",
    texture: "icon_slingshot",
    maxStack: 1,
    hotbarable: true,
    weapon: "slingshot",
    stats: [
      { label: "Type", value: "Weapon (Ranged)" },
      { label: "Damage", value: "2" },
      { label: "Damage Type", value: "Ranged" },
      { label: "Stamina", value: "6" },
      { label: "Attack Speed", value: "1.5/s" },
    ],
  },
  javelin: {
    key: "javelin",
    name: "Javelin",
    description: "A disposable thrown spear. Hits harder than a pellet, but each throw burns one.",
    texture: "icon_javelin",
    maxStack: 20,
    hotbarable: true,
    weapon: "javelin",
    stats: [
      { label: "Type", value: "Weapon (Ranged, disposable)" },
      { label: "Damage", value: "5" },
      { label: "Damage Type", value: "Ranged" },
      { label: "Stamina", value: "16" },
      { label: "Attack Speed", value: "1.1/s" },
    ],
  },
  slingshot_pellets: {
    key: "slingshot_pellets",
    name: "Slingshot Pellets",
    description: "Rounded stones sized for a Slingshot. Load them into the Ammo slot.",
    texture: "icon_slingshot_pellets",
    maxStack: 99,
    hotbarable: false,
    armorSlot: "ammo",
  },

  // --- forged weapons (biome 2 Phase 4 — one per melee damage type) ---
  sunsteel_warhammer: {
    key: "sunsteel_warhammer",
    name: "Sunsteel Warhammer",
    description: "A massive forged maul. Slow, but its wide swing crushes everything in an arc.",
    texture: "icon_sunsteel_warhammer",
    maxStack: 1,
    hotbarable: true,
    weapon: "sunsteel_warhammer",
    stats: [
      { label: "Type", value: "Weapon" },
      { label: "Damage", value: "14" },
      { label: "Damage Type", value: "Blunt" },
      { label: "Stamina", value: "20" },
      { label: "Attack Speed", value: "1.3/s" },
    ],
  },
  sunsteel_sword: {
    key: "sunsteel_sword",
    name: "Sunsteel Longsword",
    description: "A keen forged blade, balanced for quick, cutting strikes.",
    texture: "icon_sunsteel_sword",
    maxStack: 1,
    hotbarable: true,
    weapon: "sunsteel_sword",
    stats: [
      { label: "Type", value: "Weapon" },
      { label: "Damage", value: "10" },
      { label: "Damage Type", value: "Slash" },
      { label: "Stamina", value: "12" },
      { label: "Attack Speed", value: "2.1/s" },
    ],
  },
  sunsteel_pike: {
    key: "sunsteel_pike",
    name: "Sunsteel Pike",
    description: "A long forged spear with reach and a punishing thrust.",
    texture: "icon_sunsteel_pike",
    maxStack: 1,
    hotbarable: true,
    weapon: "sunsteel_pike",
    stats: [
      { label: "Type", value: "Weapon" },
      { label: "Damage", value: "12" },
      { label: "Damage Type", value: "Pierce" },
      { label: "Stamina", value: "15" },
      { label: "Attack Speed", value: "1.6/s" },
    ],
  },

  // --- enhanced/T2 weapons (biome 2 Phase 4 Session 2 — reforged with Embersteel) ---
  embersteel_warhammer: {
    key: "embersteel_warhammer",
    name: "Embersteel Warhammer",
    description: "A sunsteel maul reforged with ember-veined steel — heavier, and it caves in whatever its arc catches.",
    texture: "icon_embersteel_warhammer",
    maxStack: 1,
    hotbarable: true,
    weapon: "embersteel_warhammer",
    stats: [
      { label: "Type", value: "Weapon" },
      { label: "Damage", value: "20" },
      { label: "Damage Type", value: "Blunt" },
      { label: "Stamina", value: "22" },
      { label: "Attack Speed", value: "1.3/s" },
    ],
  },
  embersteel_sword: {
    key: "embersteel_sword",
    name: "Embersteel Longsword",
    description: "A longsword reforged in ember-steel — the edge holds a killing keenness.",
    texture: "icon_embersteel_sword",
    maxStack: 1,
    hotbarable: true,
    weapon: "embersteel_sword",
    stats: [
      { label: "Type", value: "Weapon" },
      { label: "Damage", value: "15" },
      { label: "Damage Type", value: "Slash" },
      { label: "Stamina", value: "13" },
      { label: "Attack Speed", value: "2.1/s" },
    ],
  },
  embersteel_pike: {
    key: "embersteel_pike",
    name: "Embersteel Pike",
    description: "A pike reforged with ember-steel — reach, weight, and a thrust that punches through plate.",
    texture: "icon_embersteel_pike",
    maxStack: 1,
    hotbarable: true,
    weapon: "embersteel_pike",
    stats: [
      { label: "Type", value: "Weapon" },
      { label: "Damage", value: "17" },
      { label: "Damage Type", value: "Pierce" },
      { label: "Stamina", value: "16" },
      { label: "Attack Speed", value: "1.6/s" },
    ],
  },

  // --- first MAGIC weapon: the Ember Brand (rare-ore exclusive) ---
  ember_brand: {
    key: "ember_brand",
    name: "Ember Brand",
    description:
      "A branded rod of ember-veined steel that sears with bound gloamfire. Its strikes land as raw magic — which bites most badlands beasts cleanly, though the gloam-casters that fuel it barely feel it.",
    texture: "icon_ember_brand",
    maxStack: 1,
    hotbarable: true,
    weapon: "ember_brand",
    stats: [
      { label: "Type", value: "Weapon" },
      { label: "Damage", value: "14" },
      { label: "Damage Type", value: "Magic" },
      { label: "Stamina", value: "15" },
      { label: "Attack Speed", value: "1.9/s" },
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

  comfort: {
    key: "comfort",
    name: "Bedroll",
    description: "A bedroll stuffed with reeds for cushioning. Rest near a lit campfire, away from danger, to slowly recover HP.",
    texture: "icon_comfort",
    maxStack: 1,
    hotbarable: true,
    stats: [{ label: "Type", value: "Build" }],
    placeable: true,
  },

  // --- loot ---
  boar_meat: {
    key: "boar_meat",
    name: "Boar Meat",
    description: "Raw meat from a boar. Cook it on a Shishkabob at a campfire.",
    texture: "icon_boar_meat",
    maxStack: 99,
    hotbarable: false,
  },
  snake_meat: {
    key: "snake_meat",
    name: "Snake Meat",
    description: "Raw meat from a snake. Cook it on a Shishkabob at a campfire.",
    texture: "icon_snake_meat",
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
    description: "Sweet wild berries from a forest bush. A cooking ingredient.",
    texture: "icon_blackberry",
    maxStack: 99,
    hotbarable: false,
  },

  // --- badlands (biome 2) raw materials + flora ---
  duskrunner_pelt: {
    key: "duskrunner_pelt",
    name: "Duskrunner Pelt",
    description: "The dusty, gloam-touched hide of a badlands jackal. Coarse, but it might tan into something.",
    texture: "icon_duskrunner_pelt",
    maxStack: 99,
    hotbarable: false,
  },
  duskrunner_meat: {
    key: "duskrunner_meat",
    name: "Duskrunner Meat",
    description: "Stringy raw meat from a badlands jackal. A future cooking ingredient — best not eaten raw.",
    texture: "icon_duskrunner_meat",
    maxStack: 99,
    hotbarable: false,
  },
  cragscale_plate: {
    key: "cragscale_plate",
    name: "Cragscale Plate",
    description: "A slab of stone-hard reptile scale from the Sunscorch flats. Heavy, and hard to work.",
    texture: "icon_cragscale_plate",
    maxStack: 99,
    hotbarable: false,
  },
  hex_essence: {
    key: "hex_essence",
    name: "Hex Essence",
    description: "A vial of unstable gloam-fire wrung from a Hexling. It hums against the palm.",
    texture: "icon_hex_essence",
    maxStack: 99,
    hotbarable: false,
  },
  sandmaw_chitin: {
    key: "sandmaw_chitin",
    name: "Sandmaw Chitin",
    description: "A shard of the burrower's plated shell — light for its hardness. It still smells of hot sand.",
    texture: "icon_sandmaw_chitin",
    maxStack: 99,
    hotbarable: false,
  },
  ember_ore: {
    key: "ember_ore",
    name: "Cinderforged Ore",
    description: "Raw metal ore veined with cooling ember, from a Sunken Forge's deposits and rare badlands veins. Smelts into Embersteel — but only in an upgraded Smelter.",
    texture: "icon_ember_ore",
    maxStack: 99,
    hotbarable: false,
  },
  clay: {
    key: "clay",
    name: "Clay",
    description: "Dense red clay dug from the badlands flats. Packs into the walls of a Smelter.",
    texture: "icon_clay",
    maxStack: 99,
    hotbarable: false,
  },
  sunscorch_ore: {
    key: "sunscorch_ore",
    name: "Sunscorch Ore",
    description: "Common metal ore that litters the badlands. Smelt it with a hexfire charge to draw out Sunsteel.",
    texture: "icon_sunscorch_ore",
    maxStack: 99,
    hotbarable: false,
  },
  sunsteel_ingot: {
    key: "sunsteel_ingot",
    name: "Sunsteel Ingot",
    description: "A bar of sun-hardened steel, drawn from common ore at a Smelter. The backbone of forged gear.",
    texture: "icon_sunsteel_ingot",
    maxStack: 99,
    hotbarable: false,
  },
  embersteel_ingot: {
    key: "embersteel_ingot",
    name: "Embersteel Ingot",
    description: "A bar of ember-veined steel, drawn from rare ore in an upgraded Smelter. Reforges gear into something greater.",
    texture: "icon_embersteel_ingot",
    maxStack: 99,
    hotbarable: false,
  },
  emberbloom: {
    key: "emberbloom",
    name: "Emberbloom",
    description: "A hardy desert herb that glows a faint ember at dusk. Said to steady the blood.",
    texture: "icon_emberbloom",
    maxStack: 99,
    hotbarable: false,
  },
  sunfruit: {
    key: "sunfruit",
    name: "Sunfruit",
    description: "The swollen fruit of a Sunscorch cactus — bitter raw, but full of water.",
    texture: "icon_sunfruit",
    maxStack: 99,
    hotbarable: false,
  },
  gloamcap: {
    key: "gloamcap",
    name: "Gloamcap",
    description: "A violet mushroom that only fruits where the gloam has soaked the sand. Faintly luminous.",
    texture: "icon_gloamcap",
    maxStack: 99,
    hotbarable: false,
  },
  dustbloom: {
    key: "dustbloom",
    name: "Dustbloom",
    description: "A pale, papery flower that clings to the driest flats. Its petals scatter on the wind.",
    texture: "icon_dustbloom",
    maxStack: 99,
    hotbarable: false,
  },

  // --- food (cooked at a campfire; right-click to eat) ---
  cooked_boar_meat: {
    key: "cooked_boar_meat",
    name: "Cooked Boar Meat",
    description: "A skewer of fire-roasted boar. Right-click to eat.",
    texture: "icon_cooked_boar_meat",
    maxStack: 99,
    hotbarable: true,
    edible: { hpPerSec: 2, durationMs: 20000 },
  },
  bramble_boar_skewer: {
    key: "bramble_boar_skewer",
    name: "Bramble-Glazed Boar Skewer",
    description: "Roast boar glazed with wild blackberry jam. Right-click to eat.",
    texture: "icon_bramble_boar_skewer",
    maxStack: 99,
    hotbarable: true,
    // Heals faster per second than Cooked Boar Meat but over the SAME
    // duration, so its total heal is only ~25% higher (50 vs 40) — a Lvl 2
    // dish should feel like a real upgrade, not a 2x+ jump (playtest).
    edible: { hpPerSec: 2.5, durationMs: 20000 },
  },
  cooked_snake_meat: {
    key: "cooked_snake_meat",
    name: "Cooked Snake Meat",
    description: "A skewer of fire-roasted snake. Right-click to eat.",
    texture: "icon_cooked_snake_meat",
    maxStack: 99,
    hotbarable: true,
    edible: { hpPerSec: 2, durationMs: 22000 },
  },
  blood_snake_skewer: {
    key: "blood_snake_skewer",
    name: "Blood-Glazed Snake Skewer",
    description: "Roast snake lacquered with dark gremlin blood. Right-click to eat.",
    texture: "icon_blood_snake_skewer",
    maxStack: 99,
    hotbarable: true,
    // Same +25%-over-Lvl-1-total rule as the boar skewer above (55 vs 44).
    edible: { hpPerSec: 2.5, durationMs: 22000 },
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
  smelter: {
    key: "smelter",
    name: "Smelter",
    description: "A clay kiln that melts ore into metal ingots — feed it ore plus a Hexling's hex essence for the heat. Requires a nearby Workbench to build.",
    texture: "icon_smelter",
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
    armorDefense: 3,
    stats: [
      { label: "Type", value: "Armor (Chest)" },
      { label: "Armor Type", value: "Light" },
      { label: "Armor", value: "3" },
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
    armorDefense: 2,
    stats: [
      { label: "Type", value: "Armor (Legs)" },
      { label: "Armor Type", value: "Light" },
      { label: "Armor", value: "2" },
    ],
  },

  // --- forged HEAVY armor: Sunsteel set (biome 2 Phase 4) ---
  sunsteel_helm: {
    key: "sunsteel_helm",
    name: "Sunsteel Helm",
    description: "A forged steel helm. Heavy, but it shrugs off blows the Gremlin gear never could.",
    texture: "icon_sunsteel_helm",
    maxStack: 1,
    hotbarable: false,
    armorSlot: "helmet",
    armorType: "heavy_armor",
    armorDefense: 4,
    stats: [
      { label: "Type", value: "Armor (Head)" },
      { label: "Armor Type", value: "Heavy" },
      { label: "Armor", value: "4" },
    ],
  },
  sunsteel_cuirass: {
    key: "sunsteel_cuirass",
    name: "Sunsteel Cuirass",
    description: "A forged steel breastplate. The heaviest protection a smith can beat out of Sunsteel.",
    texture: "icon_sunsteel_cuirass",
    maxStack: 1,
    hotbarable: false,
    armorSlot: "chest",
    armorType: "heavy_armor",
    armorDefense: 6,
    stats: [
      { label: "Type", value: "Armor (Chest)" },
      { label: "Armor Type", value: "Heavy" },
      { label: "Armor", value: "6" },
    ],
  },
  sunsteel_greaves: {
    key: "sunsteel_greaves",
    name: "Sunsteel Greaves",
    description: "Forged steel leg plates over a chitin lining. Weighty, but they hold.",
    texture: "icon_sunsteel_greaves",
    maxStack: 1,
    hotbarable: false,
    armorSlot: "legs",
    armorType: "heavy_armor",
    armorDefense: 4,
    stats: [
      { label: "Type", value: "Armor (Legs)" },
      { label: "Armor Type", value: "Heavy" },
      { label: "Armor", value: "4" },
    ],
  },

  // --- forged LIGHT armor: Duskhide set (biome 2 Phase 4) ---
  duskhide_hood: {
    key: "duskhide_hood",
    name: "Duskhide Hood",
    description: "A supple hood of tanned duskrunner hide bound with a steel band. Light and quiet.",
    texture: "icon_duskhide_hood",
    maxStack: 1,
    hotbarable: false,
    armorSlot: "helmet",
    armorType: "light_armor",
    armorDefense: 3,
    stats: [
      { label: "Type", value: "Armor (Head)" },
      { label: "Armor Type", value: "Light" },
      { label: "Armor", value: "3" },
    ],
  },
  duskhide_vest: {
    key: "duskhide_vest",
    name: "Duskhide Vest",
    description: "A layered vest of duskrunner hide with steel-buckled seams. Protection without the weight.",
    texture: "icon_duskhide_vest",
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
  duskhide_leggings: {
    key: "duskhide_leggings",
    name: "Duskhide Leggings",
    description: "Duskrunner-hide leggings reinforced with chitin plates. Fast and forgiving.",
    texture: "icon_duskhide_leggings",
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

  // --- enhanced HEAVY armor: Embersteel set (biome 2 Phase 4 Session 2) ---
  embersteel_helm: {
    key: "embersteel_helm",
    name: "Embersteel Helm",
    description: "A Sunsteel helm reforged with ember-steel. Little short of a wall to wear.",
    texture: "icon_embersteel_helm",
    maxStack: 1,
    hotbarable: false,
    armorSlot: "helmet",
    armorType: "heavy_armor",
    armorDefense: 7,
    stats: [
      { label: "Type", value: "Armor (Head)" },
      { label: "Armor Type", value: "Heavy" },
      { label: "Armor", value: "7" },
    ],
  },
  embersteel_cuirass: {
    key: "embersteel_cuirass",
    name: "Embersteel Cuirass",
    description: "A Sunsteel breastplate reforged with ember-steel — the heaviest protection in the badlands.",
    texture: "icon_embersteel_cuirass",
    maxStack: 1,
    hotbarable: false,
    armorSlot: "chest",
    armorType: "heavy_armor",
    armorDefense: 9,
    stats: [
      { label: "Type", value: "Armor (Chest)" },
      { label: "Armor Type", value: "Heavy" },
      { label: "Armor", value: "9" },
    ],
  },
  embersteel_greaves: {
    key: "embersteel_greaves",
    name: "Embersteel Greaves",
    description: "Sunsteel leg plates reforged with ember-steel over a chitin lining. Weighty and unyielding.",
    texture: "icon_embersteel_greaves",
    maxStack: 1,
    hotbarable: false,
    armorSlot: "legs",
    armorType: "heavy_armor",
    armorDefense: 7,
    stats: [
      { label: "Type", value: "Armor (Legs)" },
      { label: "Armor Type", value: "Heavy" },
      { label: "Armor", value: "7" },
    ],
  },

  // --- enhanced LIGHT armor: Emberhide set (biome 2 Phase 4 Session 2) ---
  emberhide_hood: {
    key: "emberhide_hood",
    name: "Emberhide Hood",
    description: "A Duskhide hood reforged with ember-steel banding. Light, quiet, and far tougher than it looks.",
    texture: "icon_emberhide_hood",
    maxStack: 1,
    hotbarable: false,
    armorSlot: "helmet",
    armorType: "light_armor",
    armorDefense: 5,
    stats: [
      { label: "Type", value: "Armor (Head)" },
      { label: "Armor Type", value: "Light" },
      { label: "Armor", value: "5" },
    ],
  },
  emberhide_vest: {
    key: "emberhide_vest",
    name: "Emberhide Vest",
    description: "A Duskhide vest reforged with ember-steel seams. Protection without the weight of plate.",
    texture: "icon_emberhide_vest",
    maxStack: 1,
    hotbarable: false,
    armorSlot: "chest",
    armorType: "light_armor",
    armorDefense: 6,
    stats: [
      { label: "Type", value: "Armor (Chest)" },
      { label: "Armor Type", value: "Light" },
      { label: "Armor", value: "6" },
    ],
  },
  emberhide_leggings: {
    key: "emberhide_leggings",
    name: "Emberhide Leggings",
    description: "Duskhide leggings reforged with ember-steel plates. Fast, forgiving, and hard to cut.",
    texture: "icon_emberhide_leggings",
    maxStack: 1,
    hotbarable: false,
    armorSlot: "legs",
    armorType: "light_armor",
    armorDefense: 5,
    stats: [
      { label: "Type", value: "Armor (Legs)" },
      { label: "Armor Type", value: "Light" },
      { label: "Armor", value: "5" },
    ],
  },

  // --- relic forge ---
  relic_forge: {
    key: "relic_forge",
    name: "Relic Forge",
    description:
      "A stone plinth that binds monster trophies into relics. Feed it a trophy to roll a random relic. Requires a nearby Workbench to build.",
    texture: "icon_relic_forge",
    maxStack: 1,
    hotbarable: true,
    stats: [{ label: "Type", value: "Station" }],
    placeable: true,
  },

  // --- boss altar ---
  gremlin_totem: {
    key: "gremlin_totem",
    name: "Gremlin Totem",
    description: "A grim totem bound with gremlin remains and dark bindings. Its purpose becomes clear at the Boss Altar's fire.",
    texture: "icon_gremlin_totem",
    maxStack: 99,
    hotbarable: true,
    stats: [{ label: "Type", value: "Ritual Item" }],
  },
  gremlin_trophy: {
    key: "gremlin_trophy",
    name: "Gremlin Trophy",
    description: "A gruesome trinket torn from an Elite Gremlin. Three of them can bind a Gremlin Totem.",
    texture: "icon_gremlin_trophy",
    maxStack: 99,
    hotbarable: false,
  },
  boar_trophy: {
    key: "boar_trophy",
    name: "Boar Trophy",
    description: "A tusked trophy torn from an Elite Boar. Feed it to a Relic Forge to attempt a relic.",
    texture: "icon_boar_trophy",
    maxStack: 99,
    hotbarable: false,
  },
  snake_trophy: {
    key: "snake_trophy",
    name: "Snake Trophy",
    description: "A fanged trophy torn from an Elite Snake. Feed it to a Relic Forge to attempt a relic.",
    texture: "icon_snake_trophy",
    maxStack: 99,
    hotbarable: false,
  },
  // Badlands elite trophies (biome 2 Phase 2). Common/tier1 at the Relic Forge
  // for now (Phase 5 retiers them to tier-2 + Ember refinement).
  duskrunner_trophy: {
    key: "duskrunner_trophy",
    name: "Duskrunner Trophy",
    description: "A pack-leader's ember-flecked fang, torn from an Elite Duskrunner. Feed it to a Relic Forge.",
    texture: "icon_duskrunner_trophy",
    maxStack: 99,
    hotbarable: false,
  },
  cragscale_trophy: {
    key: "cragscale_trophy",
    name: "Cragscale Trophy",
    description: "A cracked crest-plate torn from an Elite Cragscale. Feed it to a Relic Forge.",
    texture: "icon_cragscale_trophy",
    maxStack: 99,
    hotbarable: false,
  },
  hexling_trophy: {
    key: "hexling_trophy",
    name: "Hexling Trophy",
    description: "A still-smoldering hex-node cut from an Elite Hexling. Feed it to a Relic Forge.",
    texture: "icon_hexling_trophy",
    maxStack: 99,
    hotbarable: false,
  },
  sandmaw_trophy: {
    key: "sandmaw_trophy",
    name: "Sandmaw Trophy",
    description: "A hooked mandible wrenched from an Elite Sandmaw, still gritty with sand. Feed it to a Relic Forge.",
    texture: "icon_sandmaw_trophy",
    maxStack: 99,
    hotbarable: false,
  },
  gremlin_king_fang: {
    key: "gremlin_king_fang",
    name: "Gremlin King Fang",
    description: "A massive fang torn from the Gremlin King. A grim trophy of an old kill.",
    texture: "icon_gremlin_king_fang",
    maxStack: 99,
    hotbarable: false,
  },
  gremlin_king_heart: {
    key: "gremlin_king_heart",
    name: "Gremlin King's Heart",
    description: "The still-warm heart of the Gremlin King, wrapped in gloamfire. Set it into a Smelter to bind heat enough to melt the rarest ore.",
    texture: "icon_gremlin_king_heart",
    maxStack: 99,
    hotbarable: false,
  },

  // --- Duneshaper (badlands final boss) summon ---
  warren_fetish: {
    key: "warren_fetish",
    name: "Gloam-Bone Totem",
    description: "A knot of bone and gloam-scarred hide, hoarded deep in the Duskrunner warrens. It hums faintly, as if pulling toward some old altar out in the badlands.",
    texture: "icon_warren_fetish",
    maxStack: 99,
    hotbarable: false,
  },
  tyrant_totem: {
    key: "tyrant_totem",
    name: "Effigy of the Duneshaper",
    description: "An effigy bound from warren fetishes and gloam shards. Offer it to a badlands altar's fire to call down what sleeps beneath the dunes.",
    texture: "icon_tyrant_totem",
    maxStack: 99,
    hotbarable: true,
    stats: [{ label: "Type", value: "Ritual Item" }],
  },

  // --- gloaming vein (mineable rarity-ore POI + trophy refinement) ---
  gloam_shard: {
    key: "gloam_shard",
    name: "Gloam Shard",
    description: "A cold, faintly glowing purple crystal prised from a Gloaming Vein. Used at the Relic Forge.",
    texture: "icon_gloam_shard",
    maxStack: 99,
    hotbarable: false,
  },
  refined_trophy_uncommon: {
    key: "refined_trophy_uncommon",
    name: "Refined Trophy",
    description: "A monster trophy suffused with gloam and hardened into something greater. Never crumbles at the Relic Forge.",
    texture: "icon_refined_trophy_uncommon",
    maxStack: 99,
    hotbarable: false,
  },
  refined_trophy_rare: {
    key: "refined_trophy_rare",
    name: "Radiant Trophy",
    description: "A trophy refined past its nature, humming with power. Never crumbles at the Relic Forge.",
    texture: "icon_refined_trophy_rare",
    maxStack: 99,
    hotbarable: false,
  },
};

export function itemDef(key: string): ItemDef | undefined {
  return ITEM_DEFS[key];
}

// Armor material type PER worn piece across the given equip slots (NOT deduped
// — two Light pieces yield two entries). Used to grant per-piece armor skill XP
// on a kill (M-SS changed this from the old per-distinct-type award, so a
// mix-and-match loadout is rewarded per piece and heavy_armor will accrue
// naturally once biome-2 heavy gear ships). Lives here since Items.ts owns
// armorType lookups.
export function armorTypesWornPerPiece(slots: (EquippedItem | null)[]): ArmorType[] {
  const out: ArmorType[] = [];
  for (const eq of slots) {
    if (!eq) continue;
    const t = ITEM_DEFS[eq.key]?.armorType;
    if (t) out.push(t);
  }
  return out;
}
