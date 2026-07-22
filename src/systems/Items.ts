import type { ToolType } from "../entities/ResourceNode";
import type { WeaponType } from "./Weapons";
import type { EquipSlot, EquippedItem } from "./Equipment";
import type { AbilityId } from "./Abilities";
import type { EquipPassive } from "./EquipmentEffects";

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
  // Set for an ability-granting "special" item (equips to back/special1/
  // special2). While equipped it contributes its active to the Q/E/R ability
  // bar — the slot decides the key (Abilities.SLOT_ABILITY_KEY). No stat/armor
  // value of its own in 2a.
  grantsAbility?: AbilityId;
  // Set for passive jewelry (rings/amulet, B3-P2b). Ability-augment + utility/
  // explorer effects (NOT raw-% combat stats — that's relics' layer), summed by
  // EquipmentEffects while worn. See EquipmentEffects.EquipPassive.
  passive?: EquipPassive;
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
  arrows: {
    key: "arrows",
    name: "Arrows",
    description: "Metal-tipped arrows for a Warbow. Load them into the Ammo slot — one shared slot, so they swap out any loaded pellets.",
    texture: "icon_arrows",
    maxStack: 99,
    hotbarable: false,
    armorSlot: "ammo",
  },

  gloam_arrows: {
    key: "gloam_arrows",
    name: "Gloamsteel Arrows",
    description: "Gloamsteel-headed arrows, cut for a Gloamsteel Warbow — nothing lighter will hold the draw. Load them into the Ammo slot.",
    texture: "icon_gloam_arrows",
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
  sunsteel_warbow: {
    key: "sunsteel_warbow",
    name: "Sunsteel Warbow",
    description: "A forged badlands bow. Outranges the Slingshot and hits far harder — load it with Arrows from the backpack.",
    texture: "icon_sunsteel_warbow",
    maxStack: 1,
    hotbarable: true,
    weapon: "sunsteel_warbow",
    stats: [
      { label: "Type", value: "Weapon (Ranged)" },
      { label: "Damage", value: "11" },
      { label: "Damage Type", value: "Ranged" },
      { label: "Stamina", value: "12" },
      { label: "Attack Speed", value: "1.3/s" },
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
  embersteel_warbow: {
    key: "embersteel_warbow",
    name: "Embersteel Warbow",
    description: "A Sunsteel Warbow reforged on an ironbark stave with ember-steel limbs — longer reach and a heavier draw.",
    texture: "icon_embersteel_warbow",
    maxStack: 1,
    hotbarable: true,
    weapon: "embersteel_warbow",
    stats: [
      { label: "Type", value: "Weapon (Ranged)" },
      { label: "Damage", value: "15" },
      { label: "Damage Type", value: "Ranged" },
      { label: "Stamina", value: "15" },
      { label: "Attack Speed", value: "1.4/s" },
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
  ironbark: {
    key: "ironbark",
    name: "Ironbark",
    description: "Dense, sun-hardened wood from the badlands' gnarled ironbark trees. Too tough for a stone axe — a metal-shod edge cuts it. Prized for forge-benches and heavy hafts.",
    texture: "icon_ironbark",
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
  duskrunner_skewer: {
    key: "duskrunner_skewer",
    name: "Duskrunner Skewer",
    description: "A skewer of fire-roasted duskrunner meat. Right-click to eat.",
    texture: "icon_duskrunner_skewer",
    maxStack: 99,
    hotbarable: true,
    // A plain Lvl 2 dish — slightly above Cooked Boar Meat (55 vs 40 total).
    edible: { hpPerSec: 2.5, durationMs: 22000 },
  },
  // --- Lvl 3 campfire dishes (badlands). A gentle step above the Lvl 2 dishes
  // (~78 total heal vs ~55), matching the deliberate "not a 2x jump" ramp. ---
  seared_duskrunner_steak: {
    key: "seared_duskrunner_steak",
    name: "Seared Duskrunner Steak",
    description: "Badlands game seared over a forged grill, crusted with dustbloom. Right-click to eat.",
    texture: "icon_seared_duskrunner_steak",
    maxStack: 99,
    hotbarable: true,
    edible: { hpPerSec: 3, durationMs: 26000 },
  },
  emberbloom_broth: {
    key: "emberbloom_broth",
    name: "Emberbloom Broth",
    description: "A simmered desert-herb broth. Heals gently but for a long while. Right-click to eat.",
    texture: "icon_emberbloom_broth",
    maxStack: 99,
    hotbarable: true,
    edible: { hpPerSec: 2.5, durationMs: 34000 },
  },
  sunfruit_glazed_ribs: {
    key: "sunfruit_glazed_ribs",
    name: "Sunfruit-Glazed Ribs",
    description: "Boar ribs glazed with sweet sunfruit pulp. Right-click to eat.",
    texture: "icon_sunfruit_glazed_ribs",
    maxStack: 99,
    hotbarable: true,
    edible: { hpPerSec: 3, durationMs: 26000 },
  },
  // --- Lvl 4 campfire dishes (badlands). The richest dishes so far (~98-105
  // total), still a measured step over Lvl 3 rather than a leap. ---
  sunscorch_feast: {
    key: "sunscorch_feast",
    name: "Sunscorch Feast",
    description: "A heaping platter of seared game, gloamcap, and sunfruit. Right-click to eat.",
    texture: "icon_sunscorch_feast",
    maxStack: 99,
    hotbarable: true,
    edible: { hpPerSec: 3.5, durationMs: 30000 },
  },
  emberglazed_skewer: {
    key: "emberglazed_skewer",
    name: "Ember-Glazed Skewer",
    description: "Badlands and forest meat charred together and glazed with emberbloom. Right-click to eat.",
    texture: "icon_emberglazed_skewer",
    maxStack: 99,
    hotbarable: true,
    edible: { hpPerSec: 3.5, durationMs: 28000 },
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
    armorDefense: 6,
    stats: [
      { label: "Type", value: "Armor (Head)" },
      { label: "Armor Type", value: "Heavy" },
      { label: "Armor", value: "6" },
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
    armorDefense: 8,
    stats: [
      { label: "Type", value: "Armor (Chest)" },
      { label: "Armor Type", value: "Heavy" },
      { label: "Armor", value: "8" },
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
    armorDefense: 6,
    stats: [
      { label: "Type", value: "Armor (Legs)" },
      { label: "Armor Type", value: "Heavy" },
      { label: "Armor", value: "6" },
    ],
  },

  // --- forged LIGHT armor: Duskhide set (biome 2 Phase 4) ---
  duskhide_hood: {
    key: "duskhide_hood",
    name: "Duskhide Hood",
    description: "A supple hood of tanned duskrunner hide bound with chitin. Light and quiet.",
    texture: "icon_duskhide_hood",
    maxStack: 1,
    hotbarable: false,
    armorSlot: "helmet",
    armorType: "light_armor",
    armorDefense: 4,
    stats: [
      { label: "Type", value: "Armor (Head)" },
      { label: "Armor Type", value: "Light" },
      { label: "Armor", value: "4" },
    ],
  },
  duskhide_vest: {
    key: "duskhide_vest",
    name: "Duskhide Vest",
    description: "A layered vest of duskrunner hide reinforced with bone and chitin. Protection without the weight.",
    texture: "icon_duskhide_vest",
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
  duskhide_leggings: {
    key: "duskhide_leggings",
    name: "Duskhide Leggings",
    description: "Duskrunner-hide leggings reinforced with chitin plates. Fast and forgiving.",
    texture: "icon_duskhide_leggings",
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
    armorDefense: 10,
    stats: [
      { label: "Type", value: "Armor (Head)" },
      { label: "Armor Type", value: "Heavy" },
      { label: "Armor", value: "10" },
      { label: "Set (3)", value: "Molten Bulwark" },
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
    armorDefense: 12,
    stats: [
      { label: "Type", value: "Armor (Chest)" },
      { label: "Armor Type", value: "Heavy" },
      { label: "Armor", value: "12" },
      { label: "Set (3)", value: "Molten Bulwark" },
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
    armorDefense: 10,
    stats: [
      { label: "Type", value: "Armor (Legs)" },
      { label: "Armor Type", value: "Heavy" },
      { label: "Armor", value: "10" },
      { label: "Set (3)", value: "Molten Bulwark" },
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
    armorDefense: 7,
    stats: [
      { label: "Type", value: "Armor (Head)" },
      { label: "Armor Type", value: "Light" },
      { label: "Armor", value: "7" },
      { label: "Set (3)", value: "Emberblink" },
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
    armorDefense: 9,
    stats: [
      { label: "Type", value: "Armor (Chest)" },
      { label: "Armor Type", value: "Light" },
      { label: "Armor", value: "9" },
      { label: "Set (3)", value: "Emberblink" },
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
    armorDefense: 8, // 7→8: keeps base Emberhide > a fully-upgraded (Lvl 3) Duskhide (7)
    stats: [
      { label: "Type", value: "Armor (Legs)" },
      { label: "Armor Type", value: "Light" },
      { label: "Armor", value: "7" },
      { label: "Set (3)", value: "Emberblink" },
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
  boss_refined_trophy: {
    key: "boss_refined_trophy",
    name: "Boss Trophy",
    description: "A trophy torn from a true boss, blazing with power. Bound at a Relic Forge it never crumbles — it always yields a Mythic relic.",
    texture: "icon_boss_refined_trophy",
    maxStack: 99,
    hotbarable: false,
  },
  boss_refined_trophy_t2: {
    key: "boss_refined_trophy_t2",
    name: "Tyrant Trophy",
    description: "A relic-grade trophy torn from a badlands tyrant. Bound at a Relic Forge it never crumbles — it always yields a Tier-2 Mythic relic.",
    texture: "icon_boss_refined_trophy_t2",
    maxStack: 99,
    hotbarable: false,
  },

  // --- Duneshaper (badlands final boss) summon ---
  warren_fetish: {
    key: "warren_fetish",
    name: "Gloam-Bone Totem",
    description: "A knot of bone and gloam-scarred hide, hoarded deep in the Duskrunner warrens. Raw material — bind three together at a Workbench to craft an effigy for the badlands altars.",
    texture: "icon_warren_fetish",
    maxStack: 99,
    hotbarable: false,
  },
  tyrant_totem: {
    key: "tyrant_totem",
    name: "Effigy of the Duneshaper",
    description: "An effigy bound from Gloam-Bone Totems and gloam shards. Offer it to a badlands altar's fire to call down what sleeps beneath the dunes.",
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

  // --- Phase 5: Ember Kiln (Gloam -> Ember conversion) + tier-2 refinement ---
  ember_shard: {
    key: "ember_shard",
    name: "Ember Shard",
    description: "A gloam shard rendered down over kiln-heat until it burns amber instead of violet. Used at the Relic Forge.",
    texture: "icon_ember_shard",
    maxStack: 99,
    hotbarable: false,
  },
  refined_trophy_uncommon_t2: {
    key: "refined_trophy_uncommon_t2",
    name: "Ember-Refined Trophy",
    description: "A badlands trophy hardened in ember instead of gloam. Never crumbles at the Relic Forge.",
    texture: "icon_refined_trophy_uncommon_t2",
    maxStack: 99,
    hotbarable: false,
  },

  // --- B3-P2a: ability-granting "special" items (dev-only in 2a; real sources
  // — epic loot, biome-3 craftables, the post-boss reward picker — come later).
  // Each equips to its slot via the generic armor-equip path and lights up its
  // Q/E/R bar slot. ---
  special_gloamstep_band: {
    key: "special_gloamstep_band",
    name: "Gloamstep Band",
    description: "A gloam-charged band that folds space around its wearer. Grants Gloamstep Blink (Q).",
    texture: "ability_blink",
    maxStack: 1,
    hotbarable: false,
    armorSlot: "special1",
    grantsAbility: "gloamstep_blink",
    stats: [
      { label: "Type", value: "Special (Spec1 · Q)" },
      { label: "Grants", value: "Gloamstep Blink" },
    ],
  },
  special_gloam_focus: {
    key: "special_gloam_focus",
    name: "Gloam Focus",
    description: "A knot of unstable gloam that erupts on command. Grants Gloam Nova (E).",
    texture: "ability_nova",
    maxStack: 1,
    hotbarable: false,
    armorSlot: "special2",
    grantsAbility: "gloam_nova",
    stats: [
      { label: "Type", value: "Special (Spec2 · E)" },
      { label: "Grants", value: "Gloam Nova" },
    ],
  },
  back_bloodpact_shroud: {
    key: "back_bloodpact_shroud",
    name: "Bloodpact Shroud",
    description: "A shroud steeped in a life-siphoning pact. Grants Bloodpact (R).",
    texture: "ability_bloodpact",
    maxStack: 1,
    hotbarable: false,
    armorSlot: "back",
    grantsAbility: "bloodpact",
    stats: [
      { label: "Type", value: "Special (Back · R)" },
      { label: "Grants", value: "Bloodpact" },
    ],
  },

  // === Biome-3 Phase 2b: jewelry economy (DORMANT — real sources land in biome 3) ===

  // --- materials: the jewelry metal + the three ability gems ---
  moonsilver: {
    key: "moonsilver",
    name: "Moonsilver",
    description: "A cool, gloam-veined precious metal — the base of all fine jewelry. Mined in the deeper wilds.",
    texture: "icon_moonsilver",
    maxStack: 99,
    hotbarable: false,
  },
  gem_gloam: {
    key: "gem_gloam",
    name: "Gloam Gem",
    description: "A violet gem humming with folded space. Set into a band, it grants the Gloamstep Blink.",
    texture: "icon_gem_gloam",
    maxStack: 99,
    hotbarable: false,
  },
  gem_ember: {
    key: "gem_ember",
    name: "Ember Gem",
    description: "An unstable orange gem straining to erupt. Set into a focus, it grants the Gloam Nova.",
    texture: "icon_gem_ember",
    maxStack: 99,
    hotbarable: false,
  },
  gem_blood: {
    key: "gem_blood",
    name: "Blood Gem",
    description: "A crimson gem that drinks the light. Set into a shroud, it grants the Bloodpact.",
    texture: "icon_gem_blood",
    maxStack: 99,
    hotbarable: false,
  },
  duneshaper_heart: {
    key: "duneshaper_heart",
    name: "Duneshaper's Heart",
    description: "The gloam-gorged core of the Duneshaper, still pulsing. Set it into a Gemwright's Table to bind gems into ability jewelry.",
    texture: "icon_duneshaper_heart",
    maxStack: 99,
    hotbarable: false,
  },

  // --- the station itself ---
  jewelry_station: {
    key: "jewelry_station",
    name: "Gemwright's Table",
    description: "A jeweler's bench for setting gems into rings and amulets. Requires a nearby Workbench to build.",
    texture: "icon_jewelry_station",
    maxStack: 1,
    hotbarable: true,
    stats: [{ label: "Type", value: "Station" }],
    placeable: true,
  },

  // --- passive jewelry (ability-augment + utility/explorer — NOT relic stats) ---
  ring_quickening: {
    key: "ring_quickening",
    name: "Ring of Quickening",
    description: "A moonsilver band that hurries the gloam back into your veins — your abilities recharge faster.",
    texture: "icon_ring_quickening",
    maxStack: 1,
    hotbarable: false,
    armorSlot: "ring1",
    passive: { abilityCooldownPct: 15 },
    stats: [{ label: "Type", value: "Ring" }],
  },
  amulet_channeling: {
    key: "amulet_channeling",
    name: "Amulet of Channeling",
    description: "A focusing lens for raw gloam — your abilities strike harder and reach farther.",
    texture: "icon_amulet_channeling",
    maxStack: 1,
    hotbarable: false,
    armorSlot: "necklace",
    passive: { abilityPowerPct: 20 },
    stats: [{ label: "Type", value: "Amulet" }],
  },
  ring_forager: {
    key: "ring_forager",
    name: "Ring of the Forager",
    description: "A woven-moonsilver band that draws loose spoils to your hand and coaxes an extra scrap from every harvest.",
    texture: "icon_ring_forager",
    maxStack: 1,
    hotbarable: false,
    armorSlot: "ring1",
    passive: { gatherBonusPct: 15, magnetRadiusPct: 30 },
    stats: [{ label: "Type", value: "Ring" }],
  },
  amulet_farsight: {
    key: "amulet_farsight",
    name: "Amulet of Farsight",
    description: "A pale lantern-stone that pushes back the dark and pulls loose spoils a little closer.",
    texture: "icon_amulet_farsight",
    maxStack: 1,
    hotbarable: false,
    armorSlot: "necklace",
    passive: { lightRadiusPct: 40, magnetRadiusPct: 20 },
    stats: [{ label: "Type", value: "Amulet" }],
  },

  // === Biome-3 Phase 3: the bayou gear tier (DORMANT materials — sourced in biome 3) ===
  // Locked decision 6: biome 3 authors NO fresh base sets. Every piece below is
  // a REFORGE of its Ember-tier counterpart (the base piece is consumed as an
  // ingredient — see Recipes.ts), gated behind a Gloamforge-Anvil Workbench.

  // --- materials ---
  bog_ore: {
    key: "bog_ore",
    name: "Bog Ore",
    description: "Heavy, gloam-soaked ore dredged out of the mire. It sweats violet when it's worked.",
    texture: "icon_bog_ore",
    maxStack: 99,
    hotbarable: false,
  },
  gloamsteel_ingot: {
    key: "gloamsteel_ingot",
    name: "Gloamsteel Ingot",
    description: "Bog ore rendered down and bound with hex essence. The gloam never quite leaves the metal.",
    texture: "icon_gloamsteel_ingot",
    maxStack: 99,
    hotbarable: false,
  },
  mirehide: {
    key: "mirehide",
    name: "Mirehide",
    description: "Thick, water-shedding hide off something that lives under the bayou. Supple, and stubbornly tough.",
    texture: "icon_mirehide",
    maxStack: 99,
    hotbarable: false,
  },

  // --- bayou HEAVY armor: Gloamsteel set (reforged from Embersteel) ---
  gloamsteel_helm: {
    key: "gloamsteel_helm",
    name: "Gloamsteel Helm",
    description: "An Embersteel helm drowned in gloam and beaten out again. It hums faintly against the skull.",
    texture: "icon_gloamsteel_helm",
    maxStack: 1,
    hotbarable: false,
    armorSlot: "helmet",
    armorType: "heavy_armor",
    armorDefense: 13,
    stats: [
      { label: "Type", value: "Armor (Head)" },
      { label: "Armor Type", value: "Heavy" },
      { label: "Armor", value: "13" },
      { label: "Set (3)", value: "Gloam Bulwark" },
    ],
  },
  gloamsteel_cuirass: {
    key: "gloamsteel_cuirass",
    name: "Gloamsteel Cuirass",
    description: "A gloam-quenched breastplate. Blows land on it like they landed on the swamp floor.",
    texture: "icon_gloamsteel_cuirass",
    maxStack: 1,
    hotbarable: false,
    armorSlot: "chest",
    armorType: "heavy_armor",
    armorDefense: 16,
    stats: [
      { label: "Type", value: "Armor (Chest)" },
      { label: "Armor Type", value: "Heavy" },
      { label: "Armor", value: "16" },
      { label: "Set (3)", value: "Gloam Bulwark" },
    ],
  },
  gloamsteel_greaves: {
    key: "gloamsteel_greaves",
    name: "Gloamsteel Greaves",
    description: "Gloam-veined leg plates over a mirehide lining — heavy, and utterly unbothered by the muck.",
    texture: "icon_gloamsteel_greaves",
    maxStack: 1,
    hotbarable: false,
    armorSlot: "legs",
    armorType: "heavy_armor",
    armorDefense: 13,
    stats: [
      { label: "Type", value: "Armor (Legs)" },
      { label: "Armor Type", value: "Heavy" },
      { label: "Armor", value: "13" },
      { label: "Set (3)", value: "Gloam Bulwark" },
    ],
  },

  // --- bayou LIGHT armor: Mirehide set (reforged from Emberhide) ---
  mirehide_hood: {
    key: "mirehide_hood",
    name: "Mirehide Hood",
    description: "An Emberhide hood relined with mirehide. Sheds water, sound, and most of a claw.",
    texture: "icon_mirehide_hood",
    maxStack: 1,
    hotbarable: false,
    armorSlot: "helmet",
    armorType: "light_armor",
    armorDefense: 9,
    stats: [
      { label: "Type", value: "Armor (Head)" },
      { label: "Armor Type", value: "Light" },
      { label: "Armor", value: "9" },
      { label: "Set (3)", value: "Mireblink" },
    ],
  },
  mirehide_vest: {
    key: "mirehide_vest",
    name: "Mirehide Vest",
    description: "Layered mirehide over ember-steel seams. Silent, quick, and far harder to open than it looks.",
    texture: "icon_mirehide_vest",
    maxStack: 1,
    hotbarable: false,
    armorSlot: "chest",
    armorType: "light_armor",
    armorDefense: 12,
    stats: [
      { label: "Type", value: "Armor (Chest)" },
      { label: "Armor Type", value: "Light" },
      { label: "Armor", value: "12" },
      { label: "Set (3)", value: "Mireblink" },
    ],
  },
  mirehide_leggings: {
    key: "mirehide_leggings",
    name: "Mirehide Leggings",
    description: "Mirehide leggings cut for wading. You move through the bayou the way its own things do.",
    texture: "icon_mirehide_leggings",
    maxStack: 1,
    hotbarable: false,
    armorSlot: "legs",
    armorType: "light_armor",
    armorDefense: 9,
    stats: [
      { label: "Type", value: "Armor (Legs)" },
      { label: "Armor Type", value: "Light" },
      { label: "Armor", value: "9" },
      { label: "Set (3)", value: "Mireblink" },
    ],
  },

  // --- bayou weapons (reforged from the Embersteel tier) ---
  gloamsteel_warhammer: {
    key: "gloamsteel_warhammer",
    name: "Gloamsteel Warhammer",
    description: "A maul reforged in gloamsteel. What it hits stops being shaped like itself.",
    texture: "icon_gloamsteel_warhammer",
    maxStack: 1,
    hotbarable: true,
    weapon: "gloamsteel_warhammer",
    stats: [
      { label: "Type", value: "Weapon" },
      { label: "Damage", value: "30" },
      { label: "Damage Type", value: "Blunt" },
      { label: "Stamina", value: "31" },
      { label: "Attack Speed", value: "1.3/s" },
    ],
  },
  gloamsteel_sword: {
    key: "gloamsteel_sword",
    name: "Gloamsteel Longsword",
    description: "A longsword quenched in bog water. The edge cuts a hand's width wider than the steel.",
    texture: "icon_gloamsteel_sword",
    maxStack: 1,
    hotbarable: true,
    weapon: "gloamsteel_sword",
    stats: [
      { label: "Type", value: "Weapon" },
      { label: "Damage", value: "25" },
      { label: "Damage Type", value: "Slash" },
      { label: "Stamina", value: "21" },
      { label: "Attack Speed", value: "2.1/s" },
    ],
  },
  gloamsteel_pike: {
    key: "gloamsteel_pike",
    name: "Gloamsteel Pike",
    description: "A pike with a gloam-fed head. It finds the one seam in anything and opens it.",
    texture: "icon_gloamsteel_pike",
    maxStack: 1,
    hotbarable: true,
    weapon: "gloamsteel_pike",
    stats: [
      { label: "Type", value: "Weapon" },
      { label: "Damage", value: "32" },
      { label: "Damage Type", value: "Pierce" },
      { label: "Stamina", value: "25" },
      { label: "Attack Speed", value: "1.6/s" },
    ],
  },
  gloamsteel_warbow: {
    key: "gloamsteel_warbow",
    name: "Gloamsteel Warbow",
    description: "A warbow restrung with gloam-soaked sinew. It throws an arrow further than it has any right to.",
    texture: "icon_gloamsteel_warbow",
    maxStack: 1,
    hotbarable: true,
    weapon: "gloamsteel_warbow",
    stats: [
      { label: "Type", value: "Weapon" },
      { label: "Damage", value: "20" },
      { label: "Damage Type", value: "Ranged" },
      { label: "Stamina", value: "17" },
      { label: "Attack Speed", value: "1.4/s" },
    ],
  },
  gloamdrinker: {
    key: "gloamdrinker",
    name: "Gloamdrinker",
    description: "A bound censer of bog-iron and blood-gem. Every blow it lands drinks a little of the wound and gives it back to you.",
    texture: "icon_gloamdrinker",
    maxStack: 1,
    hotbarable: true,
    weapon: "gloamdrinker",
    stats: [
      { label: "Type", value: "Weapon" },
      { label: "Damage", value: "19" },
      { label: "Damage Type", value: "Magic" },
      { label: "Stamina", value: "20" },
      { label: "Attack Speed", value: "1.8/s" },
      { label: "Lifelink", value: "12% of damage dealt" },
    ],
  },
  gloam_brand: {
    key: "gloam_brand",
    name: "Gloam Brand",
    description: "The Ember Brand drowned and rekindled — it burns violet now, and armor means nothing to it.",
    texture: "icon_gloam_brand",
    maxStack: 1,
    hotbarable: true,
    weapon: "gloam_brand",
    stats: [
      { label: "Type", value: "Weapon" },
      { label: "Damage", value: "23" },
      { label: "Damage Type", value: "Magic" },
      { label: "Stamina", value: "22" },
      { label: "Attack Speed", value: "1.9/s" },
    ],
  },
};

export function itemDef(key: string): ItemDef | undefined {
  return ITEM_DEFS[key];
}

// --- Inventory organization (tabbed-by-biome rework) ---
// The biome an item belongs to = the first biome it appears in. Everything
// defaults to "forest" (biome 1); only the explicitly-listed biome-2 keys are
// "badlands". Cross-biome progression items follow "first appearance": the
// Gremlin King's heart/fang, Gloaming-Vein shards + their forest-POI refined
// trophies all first show up in the forest, so they stay forest even though
// they feed badlands-tier crafting.
export type ItemBiome = "forest" | "badlands" | "bayou";

const BADLANDS_ITEM_KEYS = new Set<string>([
  // raw materials + arid flora
  "duskrunner_pelt", "duskrunner_meat", "cragscale_plate", "hex_essence",
  "sandmaw_chitin", "ironbark", "ember_ore", "clay", "sunscorch_ore",
  "sunsteel_ingot", "embersteel_ingot", "emberbloom", "sunfruit", "gloamcap",
  "dustbloom",
  // forged weapons
  "sunsteel_warhammer", "sunsteel_sword", "sunsteel_pike",
  "embersteel_warhammer", "embersteel_sword", "embersteel_pike", "ember_brand",
  // forged ranged (S8) — bows + their arrows
  "sunsteel_warbow", "embersteel_warbow", "arrows",
  // forged armor
  "sunsteel_helm", "sunsteel_cuirass", "sunsteel_greaves",
  "duskhide_hood", "duskhide_vest", "duskhide_leggings",
  "embersteel_helm", "embersteel_cuirass", "embersteel_greaves",
  "emberhide_hood", "emberhide_vest", "emberhide_leggings",
  // station + badlands dishes
  "smelter",
  "seared_duskrunner_steak", "emberbloom_broth", "sunfruit_glazed_ribs",
  "sunscorch_feast", "emberglazed_skewer",
  // badlands trophies / currency / summon
  "duskrunner_trophy", "cragscale_trophy", "hexling_trophy", "sandmaw_trophy",
  "ember_shard", "refined_trophy_uncommon_t2", "warren_fetish", "tyrant_totem",
]);

// Biome-3 keys: the Phase-2b jewelry economy + the Phase-3 bayou gear tier.
// Both are authored dormant (no in-game source until the biome-3 content
// phases), but they still belong under their own inventory tab the moment a
// dev/test grant puts one in the backpack.
const BAYOU_ITEM_KEYS = new Set<string>([
  // jewelry economy (Phase 2b)
  "moonsilver", "gem_gloam", "gem_ember", "gem_blood", "duneshaper_heart",
  "jewelry_station", "ring_quickening", "amulet_channeling", "ring_forager",
  "amulet_farsight", "special_gloamstep_band", "special_gloam_focus",
  "back_bloodpact_shroud",
  // bayou gear tier (Phase 3)
  "bog_ore", "gloamsteel_ingot", "mirehide",
  "gloamsteel_helm", "gloamsteel_cuirass", "gloamsteel_greaves",
  "mirehide_hood", "mirehide_vest", "mirehide_leggings",
  "gloamsteel_warhammer", "gloamsteel_sword", "gloamsteel_pike",
  "gloamsteel_warbow", "gloam_brand", "gloamdrinker", "gloam_arrows",
]);

export function itemBiome(key: string): ItemBiome {
  if (BAYOU_ITEM_KEYS.has(key)) return "bayou";
  return BADLANDS_ITEM_KEYS.has(key) ? "badlands" : "forest";
}

// A coarse category axis, orthogonal to biome, used to break each biome tab
// into labelled sections. Derived from existing def flags (no new per-item
// data) plus a small trophy/ritual key set.
export type ItemCategory = "material" | "gear" | "station" | "food" | "curio";

const CURIO_ITEM_KEYS = new Set<string>([
  "gloam_shard", "ember_shard", "gremlin_king_fang",
  "warren_fetish", "tyrant_totem", "gremlin_totem",
]);

export function itemCategory(key: string): ItemCategory {
  const def = ITEM_DEFS[key];
  if (!def) return "material";
  if (def.placeable) return "station";
  if (def.edible) return "food";
  // Real gear only — the ammo "slot" (slingshot pellets) is a material, not
  // a wearable, so it groups with other stackable materials.
  if (def.weapon || def.tool || (def.armorSlot && def.armorSlot !== "ammo")) return "gear";
  if (CURIO_ITEM_KEYS.has(key) || key.includes("trophy")) return "curio";
  return "material";
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
