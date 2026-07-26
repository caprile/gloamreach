import type { ToolType } from "../entities/ResourceNode";
import type { WeaponType } from "./Weapons";
import { slotGroup, type EquipSlot, type EquippedItem } from "./Equipment";
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
  // Negates HAND_OFFSET's held tilt for this item. The on-screen angle of a held
  // item is the art's own lean PLUS that tilt, so an icon that leans the opposite
  // way to the roster has the tilt add to its lean instead of cancelling it, and
  // stands upright in the hand. Set it when an icon's rest angle fights the
  // default carry — the pickaxes need it after their art was reoriented
  // (art/tools/rotate.mjs).
  heldTiltMirrored?: boolean;
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
    heldTiltMirrored: true, // icon mirrored on disk — see the field's comment
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
  // --- bayou harvestables (biome 3 Phase 4a). Like Emberbloom/Sunfruit these
  // have NO recipe yet — they're authored as future alchemy/food ingredients and
  // surface only via the discovered-material toast. ---
  swamp_moss: {
    key: "swamp_moss",
    name: "Swamp Moss",
    description: "A damp mat of moss that drinks the gloam out of the water. It keeps its cold long after you pull it free.",
    texture: "icon_swamp_moss",
    maxStack: 99,
    hotbarable: false,
  },
  water_lily: {
    key: "water_lily",
    name: "Water Lily",
    description: "A pale bloom floating on the black channels. It opens only where the water runs deepest.",
    texture: "icon_water_lily",
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

  // --- Bayou dishes (biome 3). The best food in the game, but only by a
  // measured step over the badlands' Lvl 4 platters — the same "deeper is
  // better, not a different league" pacing every earlier tier used. ---
  seared_mirejaw_tail: {
    key: "seared_mirejaw_tail",
    name: "Seared Mirejaw Tail",
    description: "Thick gator tail, seared black on the outside. Right-click to eat.",
    texture: "icon_seared_mirejaw_tail",
    maxStack: 99,
    hotbarable: true,
    edible: { hpPerSec: 3, durationMs: 26000 },
  },
  fireroasted_toad_legs: {
    key: "fireroasted_toad_legs",
    name: "Fire-Roasted Toad Legs",
    description: "Roasted until the blight cooks clean out of them. Lean, quick energy. Right-click to eat.",
    texture: "icon_fireroasted_toad_legs",
    maxStack: 99,
    hotbarable: true,
    edible: { hpPerSec: 2.5, durationMs: 30000 },
  },
  mossbound_mirejaw: {
    key: "mossbound_mirejaw",
    name: "Mossbound Mirejaw",
    description: "Mirejaw wrapped in swamp moss and steamed in its own juices. Right-click to eat.",
    texture: "icon_mossbound_mirejaw",
    maxStack: 99,
    hotbarable: true,
    edible: { hpPerSec: 3.5, durationMs: 34000 },
  },
  // Replaced the Lily-Gilded Feast (2026-07-26). That dish cost 2 Mirejaw Meat,
  // which made the bayou's whole menu lean on one animal; this one is built on
  // toad legs instead so the two food sources each anchor their own dishes.
  mirelight_platter: {
    key: "mirelight_platter",
    name: "Mirelight Platter",
    description: "Toad legs and lily hearts laid over steamed moss. Right-click to eat.",
    texture: "icon_mirelight_platter",
    maxStack: 99,
    hotbarable: true,
    edible: { hpPerSec: 4, durationMs: 36000 },
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
    description: "A clay kiln that melts ore into metal ingots — load ore, a reagent, and wood to burn. Requires a nearby Workbench to build.",
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
    // HEAVY (2026-07-23, the user): the game's earliest heavy piece, so a biome-1
    // player has an on-ramp to heavy-armor's magic/fire mitigation + heavy_armor
    // skill XP well before the badlands forged sets. The Cap/Pants stay light, so
    // the Gremlin set is a deliberate mix.
    armorType: "heavy_armor",
    armorDefense: 3,
    stats: [
      { label: "Type", value: "Armor (Chest)" },
      { label: "Armor Type", value: "Heavy" },
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
    armorDefense: 8,
    stats: [
      { label: "Type", value: "Armor (Head)" },
      { label: "Armor Type", value: "Heavy" },
      { label: "Armor", value: "8" },
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
    armorDefense: 8,
    stats: [
      { label: "Type", value: "Armor (Legs)" },
      { label: "Armor Type", value: "Heavy" },
      { label: "Armor", value: "8" },
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
    armorDefense: 5,
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
    armorDefense: 5,
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
    armorDefense: 5,
    stats: [
      { label: "Type", value: "Armor (Legs)" },
      { label: "Armor Type", value: "Light" },
      { label: "Armor", value: "4" },
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
    armorDefense: 12,
    stats: [
      { label: "Type", value: "Armor (Head)" },
      { label: "Armor Type", value: "Heavy" },
      { label: "Armor", value: "12" },
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
    armorDefense: 14,
    stats: [
      { label: "Type", value: "Armor (Chest)" },
      { label: "Armor Type", value: "Heavy" },
      { label: "Armor", value: "14" },
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
    armorDefense: 12,
    stats: [
      { label: "Type", value: "Armor (Legs)" },
      { label: "Armor Type", value: "Heavy" },
      { label: "Armor", value: "12" },
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
    armorDefense: 8,
    stats: [
      { label: "Type", value: "Armor (Head)" },
      { label: "Armor Type", value: "Light" },
      { label: "Armor", value: "7" },
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
    armorDefense: 8,
    stats: [
      { label: "Type", value: "Armor (Chest)" },
      { label: "Armor Type", value: "Light" },
      { label: "Armor", value: "7" },
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
    // 2026-07-26: Duskhide's base went 4->5 to kill a cross-biome regression
    // (a freshly forged Duskhide set was 12 armor against a fully-upgraded
    // biome-1 Gremlin set's 13 — arriving in the badlands made you WORSE). That
    // pushes Duskhide Lvl 3 to 7/piece, so Emberhide's base goes 7->8 to keep the
    // long-standing rule that a base Ember piece still beats a maxed Duskhide one.
    armorDefense: 8,
    stats: [
      { label: "Type", value: "Armor (Legs)" },
      { label: "Armor Type", value: "Light" },
      { label: "Armor", value: "7" },
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
  boss_refined_trophy_t3: {
    key: "boss_refined_trophy_t3",
    name: "Mire Tyrant Trophy",
    description: "A relic-grade trophy cut from the thing at the bottom of the bayou. Bound at a Relic Forge it never crumbles — it always yields a Tier-3 Mythic relic.",
    texture: "icon_boss_refined_trophy_t3",
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
  // --- biome 3: Mire Crucible (Ember -> Mire conversion) + tier-3 refinement.
  // The bayou's trophies are Tier 3 and had no refine path at all until this. ---
  gravemark_rubbing: {
    key: "gravemark_rubbing",
    name: "Gravemark Rubbing",
    description:
      "A charcoal tracing lifted from a sunken grave-slab. The lines rearrange themselves when you are not looking, and they always settle pointing somewhere. Reads itself the moment you pick it up.",
    texture: "icon_gravemark_rubbing",
    maxStack: 1,
    hotbarable: false,
  },

  mire_shard: {
    key: "mire_shard",
    name: "Mire Shard",
    description: "An ember shard steeped in black bog-water until it drinks the light. Used at the Relic Forge.",
    texture: "icon_mire_shard",
    maxStack: 99,
    hotbarable: false,
  },
  refined_trophy_uncommon_t3: {
    key: "refined_trophy_uncommon_t3",
    name: "Mire-Refined Trophy",
    description: "A bayou trophy steeped in mire until it holds its shape. Never crumbles at the Relic Forge.",
    texture: "icon_refined_trophy_uncommon_t3",
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
  special_mire_snare_idol: {
    key: "special_mire_snare_idol",
    name: "Snarebound Idol",
    description: "A fist of knotted root and bog-iron. Whatever it is pointed at forgets how to walk. Grants Mire Snare.",
    texture: "ability_snare",
    maxStack: 1,
    hotbarable: false,
    armorSlot: "ability1",
    grantsAbility: "mire_snare",
    stats: [
      { label: "Type", value: "Ability (any Q/E/R slot)" },
      { label: "Grants", value: "Mire Snare" },
    ],
  },
  special_bloodrush_fang: {
    key: "special_bloodrush_fang",
    name: "Quickening Fang",
    description: "A tyrant's tooth still humming with the speed of the thing that grew it. Grants Bloodrush.",
    texture: "ability_haste",
    maxStack: 1,
    hotbarable: false,
    armorSlot: "ability1",
    grantsAbility: "bloodrush",
    stats: [
      { label: "Type", value: "Ability (any Q/E/R slot)" },
      { label: "Grants", value: "Bloodrush" },
    ],
  },

  special_gloamstep_band: {
    key: "special_gloamstep_band",
    name: "Gloamstep Band",
    description: "A gloam-charged band that folds space around its wearer. Grants Gloamstep Blink.",
    texture: "ability_blink",
    maxStack: 1,
    hotbarable: false,
    armorSlot: "ability1",
    grantsAbility: "gloamstep_blink",
    stats: [
      { label: "Type", value: "Ability (any Q/E/R slot)" },
      { label: "Grants", value: "Gloamstep Blink" },
    ],
  },
  special_gloam_focus: {
    key: "special_gloam_focus",
    name: "Gloam Focus",
    description: "A knot of unstable gloam that erupts on command. Grants Gloam Nova.",
    texture: "ability_nova",
    maxStack: 1,
    hotbarable: false,
    armorSlot: "ability1",
    grantsAbility: "gloam_nova",
    stats: [
      { label: "Type", value: "Ability (any Q/E/R slot)" },
      { label: "Grants", value: "Gloam Nova" },
    ],
  },
  back_bloodpact_shroud: {
    key: "back_bloodpact_shroud",
    name: "Bloodpact Shroud",
    description: "A shroud steeped in a life-siphoning pact. Grants Bloodpact.",
    texture: "ability_bloodpact",
    maxStack: 1,
    hotbarable: false,
    armorSlot: "ability1",
    grantsAbility: "bloodpact",
    stats: [
      { label: "Type", value: "Ability (any Q/E/R slot)" },
      { label: "Grants", value: "Bloodpact" },
    ],
  },

  // --- B4-P2: LESSER ability specials. Start-of-run character grants ONLY —
  // no recipe, no loot-table entry. These exist because B4-P1 was handing every
  // character the full-power item above, which is the terminal output of the
  // whole Duneshaper → Gemwright → crypt-warden → gem chain; the chain had no
  // reward left at the end of it. Same slots and same abilities, one grade down,
  // so clearing a crypt upgrades an ability the player already knows how to use. ---
  special_gloamstep_band_lesser: {
    key: "special_gloamstep_band_lesser",
    name: "Worn Gloamstep Band",
    description: "A band whose gloam has mostly leaked out. The step still works — just barely. Grants Lesser Gloamstep.",
    texture: "ability_blink_lesser",
    maxStack: 1,
    hotbarable: false,
    armorSlot: "ability1",
    grantsAbility: "gloamstep_blink_lesser",
    stats: [
      { label: "Type", value: "Ability (any Q/E/R slot)" },
      { label: "Grants", value: "Lesser Gloamstep" },
    ],
  },
  special_gloam_focus_lesser: {
    key: "special_gloam_focus_lesser",
    name: "Cracked Gloam Focus",
    description: "A fractured knot of gloam. What's left of it still pops. Grants Lesser Gloamburst.",
    texture: "ability_nova_lesser",
    maxStack: 1,
    hotbarable: false,
    armorSlot: "ability1",
    grantsAbility: "gloam_nova_lesser",
    stats: [
      { label: "Type", value: "Ability (any Q/E/R slot)" },
      { label: "Grants", value: "Lesser Gloamburst" },
    ],
  },
  back_bloodpact_shroud_lesser: {
    key: "back_bloodpact_shroud_lesser",
    name: "Frayed Bloodpact Shroud",
    description: "The pact sewn into it has come half undone. Grants Lesser Bloodpact.",
    texture: "ability_bloodpact_lesser",
    maxStack: 1,
    hotbarable: false,
    armorSlot: "ability1",
    grantsAbility: "bloodpact_lesser",
    stats: [
      { label: "Type", value: "Ability (any Q/E/R slot)" },
      { label: "Grants", value: "Lesser Bloodpact" },
    ],
  },

  // === B4-P2: EPIC LOOT — found-only, craftable nowhere ===
  //
  // The pool the biome-3 roadmap specced in Phase 2b and 2b never shipped. Three
  // ability specials whose actives exist in no recipe, plus six passive uniques
  // on the jewelry/utility layer (never the relic combat-stat layer — that split
  // is locked). All of them are rolled by LootContainer's epic pools, tiered by
  // POI depth, so a first-5-minutes Gremlin Shack can't hand out an endgame active.

  // --- found-only ability specials (tier-3 pool only) ---
  special_gravebind_coil: {
    key: "special_gravebind_coil",
    name: "Gravebind Coil",
    description: "A coil of grave-iron that drags the dead toward whoever holds it. Grants Gravebind.",
    texture: "ability_gravebind",
    maxStack: 1,
    hotbarable: false,
    armorSlot: "ability1",
    grantsAbility: "gravebind",
    stats: [
      { label: "Type", value: "Ability (any Q/E/R slot)" },
      { label: "Grants", value: "Gravebind" },
    ],
  },
  special_pale_choir_lance: {
    key: "special_pale_choir_lance",
    name: "Lance of the Pale Choir",
    description: "A reliquary shard that sings when pointed. Grants Spirit Lance.",
    texture: "ability_lance",
    maxStack: 1,
    hotbarable: false,
    armorSlot: "ability1",
    grantsAbility: "spirit_lance",
    stats: [
      { label: "Type", value: "Ability (any Q/E/R slot)" },
      { label: "Grants", value: "Spirit Lance" },
    ],
  },
  back_drowned_king_shroud: {
    key: "back_drowned_king_shroud",
    name: "Shroud of the Drowned King",
    description: "Still wet, and it never dries. Grants Drowned Aegis.",
    texture: "ability_aegis",
    maxStack: 1,
    hotbarable: false,
    armorSlot: "ability1",
    grantsAbility: "aegis",
    stats: [
      { label: "Type", value: "Ability (any Q/E/R slot)" },
      { label: "Grants", value: "Drowned Aegis" },
    ],
  },

  // --- found-only passive uniques ---
  ring_sparkbound: {
    key: "ring_sparkbound",
    name: "Sparkbound Band",
    description: "A band that hums along with whatever power you're holding, and hurries it back.",
    texture: "icon_ring_sparkbound",
    maxStack: 1,
    hotbarable: false,
    armorSlot: "special1",
    passive: { abilityPowerPct: 18, abilityCooldownPct: 12 },
  },
  amulet_long_dark: {
    key: "amulet_long_dark",
    name: "Lantern of the Long Dark",
    description: "A caged ember that refuses to go out, and picks out what's worth keeping in its glow.",
    texture: "icon_amulet_long_dark",
    maxStack: 1,
    hotbarable: false,
    armorSlot: "special1",
    // D5: was magnetRadiusPct 40 — folded into gatherBonusPct (see EquipmentEffects.ts header).
    passive: { lightRadiusPct: 60, gatherBonusPct: 20 },
  },
  ring_gloamwrought_signet: {
    key: "ring_gloamwrought_signet",
    name: "Gloamwrought Signet",
    description: "Gloam worked into a seal. Whatever you spend comes back to you faster.",
    texture: "icon_ring_signet",
    maxStack: 1,
    hotbarable: false,
    armorSlot: "special1",
    passive: { abilityCooldownPct: 25 },
  },
  ring_deep_vein: {
    key: "ring_deep_vein",
    name: "Ring of the Deep Vein",
    description: "Set with a splinter of ore that knows where the rest of it is.",
    texture: "icon_ring_deep_vein",
    maxStack: 1,
    hotbarable: false,
    armorSlot: "special1",
    passive: { gatherBonusPct: 20 },
  },
  amulet_choirbone: {
    key: "amulet_choirbone",
    name: "Choirbone Amulet",
    description: "Strung with the finger-bones of something that sang. Your powers land harder.",
    texture: "icon_amulet_choirbone",
    maxStack: 1,
    hotbarable: false,
    armorSlot: "special1",
    passive: { abilityPowerPct: 35 },
  },
  back_mireborn_cloak: {
    key: "back_mireborn_cloak",
    name: "Mireborn Cloak",
    description: "Woven from something that lived its whole life in the poison and never minded it.",
    texture: "icon_cloak_mireborn",
    maxStack: 1,
    hotbarable: false,
    // The stat "Cloak" slot, NOT "back" — that's the R-ability cape slot, and a
    // utility cloak shouldn't evict your R ability (the user 2026-07-23).
    armorSlot: "special1",
    passive: { statusResistPct: 30 },
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
  // === B4-P5: the four former ARMOR SET BONUSES, now single pieces of jewelry.
  // The effects and their numbers are unchanged — only what grants them moved
  // (see SetBonuses.ts). The tier-1 pair is badlands-grade, the tier-2 pair
  // bayou-grade, matching the sets they came from. ===
  amulet_molten_bulwark: {
    key: "amulet_molten_bulwark",
    name: "Amulet of the Molten Bulwark",
    description: "A slag-cored pendant that drinks a blow's heat. Reduces all incoming damage, and sears melee attackers.",
    texture: "icon_amulet_molten_bulwark",
    maxStack: 1,
    hotbarable: false,
    armorSlot: "special1",
    stats: [
      { label: "Type", value: "Amulet" },
      { label: "Effect", value: "Molten Bulwark" },
    ],
  },
  ring_emberblink: {
    key: "ring_emberblink",
    name: "Ring of Emberblink",
    description: "Ember caged in moonsilver. Your dash travels farther and erupts in fire where you land.",
    texture: "icon_ring_emberblink",
    maxStack: 1,
    hotbarable: false,
    armorSlot: "special1",
    stats: [
      { label: "Type", value: "Ring" },
      { label: "Effect", value: "Emberblink" },
    ],
  },
  amulet_gloam_bulwark: {
    key: "amulet_gloam_bulwark",
    name: "Amulet of the Gloam Bulwark",
    description: "Gloamsteel worked around a slag core. Greatly reduces incoming damage, and sears attackers badly.",
    texture: "icon_amulet_gloam_bulwark",
    maxStack: 1,
    hotbarable: false,
    armorSlot: "special1",
    stats: [
      { label: "Type", value: "Amulet" },
      { label: "Effect", value: "Gloam Bulwark" },
    ],
  },
  ring_mireblink: {
    key: "ring_mireblink",
    name: "Ring of Mireblink",
    description: "A gloam-lit band. Your dash travels much farther and erupts violently where you land.",
    texture: "icon_ring_mireblink",
    maxStack: 1,
    hotbarable: false,
    armorSlot: "special1",
    stats: [
      { label: "Type", value: "Ring" },
      { label: "Effect", value: "Mireblink" },
    ],
  },
  ring_quickening: {
    key: "ring_quickening",
    name: "Ring of Quickening",
    description: "A moonsilver band that hurries the gloam back into your veins — your abilities recharge faster.",
    texture: "icon_ring_quickening",
    maxStack: 1,
    hotbarable: false,
    armorSlot: "special1",
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
    armorSlot: "special1",
    passive: { abilityPowerPct: 20 },
    stats: [{ label: "Type", value: "Amulet" }],
  },
  ring_forager: {
    key: "ring_forager",
    name: "Ring of the Forager",
    description: "A woven-moonsilver band that coaxes a noticeably larger scrap from every harvest.",
    texture: "icon_ring_forager",
    maxStack: 1,
    hotbarable: false,
    armorSlot: "special1",
    // D5: was gatherBonusPct 15 + magnetRadiusPct 30 — folded into one channel
    // (see EquipmentEffects.ts header), making this the dedicated gather ring.
    passive: { gatherBonusPct: 30 },
    stats: [{ label: "Type", value: "Ring" }],
  },
  amulet_farsight: {
    key: "amulet_farsight",
    name: "Amulet of Farsight",
    description: "A pale lantern-stone that pushes back the dark and sharpens your eye for what's worth taking.",
    texture: "icon_amulet_farsight",
    maxStack: 1,
    hotbarable: false,
    armorSlot: "special1",
    // D5: was magnetRadiusPct 20 — folded into gatherBonusPct (see EquipmentEffects.ts header).
    passive: { lightRadiusPct: 40, gatherBonusPct: 10 },
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

  // --- bayou creature drops (Phase 4b roster) ---
  mirejaw_meat: {
    key: "mirejaw_meat",
    name: "Mirejaw Meat",
    description: "A heavy cut of pale reptile tail. Rank raw, but it firms up beautifully over a fire.",
    texture: "icon_mirejaw_meat",
    maxStack: 99,
    hotbarable: false,
  },
  blighttoad_legs: {
    key: "blighttoad_legs",
    name: "Blighttoad Legs",
    description: "Meaty hind legs off a blighttoad. The blight sits in the glands, not the meat — cook them through and they are perfectly good.",
    texture: "icon_blighttoad_legs",
    maxStack: 99,
    hotbarable: false,
  },
  blight_gland: {
    key: "blight_gland",
    name: "Blight Gland",
    description: "A taut sac cut from a Blighttoad's back, still weeping something green. Handle it with the hide side out.",
    texture: "icon_blight_gland",
    maxStack: 99,
    hotbarable: false,
  },
  gloam_dust: {
    key: "gloam_dust",
    name: "Gloam Dust",
    description: "The violet motes a Murkling scatters when it comes apart. Cold to the touch, and it never quite settles.",
    texture: "icon_gloam_dust",
    maxStack: 99,
    hotbarable: false,
  },

  // --- bayou surface-POI spoils (Phase 4d). Deliberately vague about what they
  // are FOR: naming the thing they summon would spoil the discovery, the same
  // reason the Gremlin Totem's description only points at the altar. ---
  tyrant_sigil: {
    key: "tyrant_sigil",
    name: "Tyrant Sigil",
    description:
      "A slab of black shrine-stone, scored with a mark the swamp keeps repeating. It is warm on the side that faces down.",
    texture: "icon_tyrant_sigil",
    maxStack: 99,
    hotbarable: false,
  },
  gorge_bone: {
    key: "gorge_bone",
    name: "Gorge Bone",
    description:
      "A rib the length of an arm, kept wrapped above a chieftain's bed. Whatever shed it is still down there somewhere.",
    texture: "icon_gorge_bone",
    maxStack: 99,
    hotbarable: false,
  },
  miretyrant_effigy: {
    key: "miretyrant_effigy",
    name: "Effigy of the Miretyrant",
    description:
      "Sigil-stone and gorge-bone bound in gator hide. The swamp goes quiet when you hold it. Offer it at the sealed maw deep in the mire.",
    texture: "icon_miretyrant_effigy",
    maxStack: 99,
    hotbarable: true,
    stats: [{ label: "Type", value: "Ritual Item" }],
  },

  // --- bayou elite trophies (Common rarity, Tier 3 — the deepest relic tier) ---
  mirejaw_trophy: {
    key: "mirejaw_trophy",
    name: "Mirejaw Trophy",
    description: "A curved tooth the length of a finger, pried from an Elite Mirejaw. Feed it to a Relic Forge.",
    texture: "icon_mirejaw_trophy",
    maxStack: 99,
    hotbarable: false,
  },
  blighttoad_trophy: {
    key: "blighttoad_trophy",
    name: "Blighttoad Trophy",
    description: "The swollen crown-gland of an Elite Blighttoad, dried hard. Feed it to a Relic Forge.",
    texture: "icon_blighttoad_trophy",
    maxStack: 99,
    hotbarable: false,
  },
  mosswretch_trophy: {
    key: "mosswretch_trophy",
    name: "Mosswretch Trophy",
    description: "A knot of heartwood from an Elite Mosswretch, still threaded with living moss. Feed it to a Relic Forge.",
    texture: "icon_mosswretch_trophy",
    maxStack: 99,
    hotbarable: false,
  },
  murkling_trophy: {
    key: "murkling_trophy",
    name: "Murkling Trophy",
    description: "The one shard of an Elite Murkling that didn't scatter — it still pulses. Feed it to a Relic Forge.",
    texture: "icon_murkling_trophy",
    maxStack: 99,
    hotbarable: false,
  },
  fenlurker_trophy: {
    key: "fenlurker_trophy",
    name: "Fenlurker Trophy",
    description: "A hooked digging claw off an Elite Fenlurker, packed with black silt. Feed it to a Relic Forge.",
    texture: "icon_fenlurker_trophy",
    maxStack: 99,
    hotbarable: false,
  },
  corpselight_trophy: {
    key: "corpselight_trophy",
    name: "Corpselight Trophy",
    description: "A guttering ember left where an Elite Corpselight unravelled. It gives no warmth. Feed it to a Relic Forge.",
    texture: "icon_corpselight_trophy",
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
    armorDefense: 16,
    stats: [
      { label: "Type", value: "Armor (Head)" },
      { label: "Armor Type", value: "Heavy" },
      { label: "Armor", value: "16" },
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
    armorDefense: 18,
    stats: [
      { label: "Type", value: "Armor (Chest)" },
      { label: "Armor Type", value: "Heavy" },
      { label: "Armor", value: "18" },
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
    armorDefense: 16,
    stats: [
      { label: "Type", value: "Armor (Legs)" },
      { label: "Armor Type", value: "Heavy" },
      { label: "Armor", value: "16" },
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
    armorDefense: 8,
    stats: [
      { label: "Type", value: "Armor (Head)" },
      { label: "Armor Type", value: "Light" },
      { label: "Armor", value: "8" },
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
    armorDefense: 8,
    stats: [
      { label: "Type", value: "Armor (Chest)" },
      { label: "Armor Type", value: "Light" },
      { label: "Armor", value: "8" },
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
    armorDefense: 8,
    stats: [
      { label: "Type", value: "Armor (Legs)" },
      { label: "Armor Type", value: "Light" },
      { label: "Armor", value: "8" },
    ],
  },

  // --- bayou weapons (reforged from the Embersteel tier) ---

  // === B4-P5: the MIREBRONZE branch — bayou-grade gear reforged straight from
  // Sunsteel/Duskhide, so skipping the Embersteel tier is a different route
  // rather than a dead end. Armor sits deliberately BETWEEN Embersteel and
  // Gloamsteel (heavy 36 vs 32/42, light 26 vs 24/30): a complete endgame set,
  // with the Embersteel road still the stronger one. Raw armor only — no
  // resistances, no stat lines (locked decision 5). ===
  mirebronze_ingot: {
    key: "mirebronze_ingot",
    name: "Mirebronze Ingot",
    description: "Sunsteel drowned in bog-ore slag until it takes on a green-black sheen. Crafting material.",
    texture: "icon_mirebronze_ingot",
    maxStack: 99,
    hotbarable: false,
  },
  mirebronze_helm: {
    key: "mirebronze_helm",
    name: "Mirebronze Helm",
    description: "A sunsteel helm resunk in mirebronze. Heavier than it looks, and colder.",
    texture: "icon_mirebronze_helm",
    maxStack: 1,
    hotbarable: false,
    armorSlot: "helmet",
    armorType: "heavy_armor",
    armorDefense: 14,
    stats: [
      { label: "Type", value: "Armor (Head)" },
      { label: "Armor Type", value: "Heavy" },
      { label: "Armor", value: "14" },
    ],
  },
  mirebronze_cuirass: {
    key: "mirebronze_cuirass",
    name: "Mirebronze Cuirass",
    description: "Sunsteel plate reworked in mirebronze — the bayou's answer to a smith with no ember ore.",
    texture: "icon_mirebronze_cuirass",
    maxStack: 1,
    hotbarable: false,
    armorSlot: "chest",
    armorType: "heavy_armor",
    armorDefense: 16,
    stats: [
      { label: "Type", value: "Armor (Chest)" },
      { label: "Armor Type", value: "Heavy" },
      { label: "Armor", value: "16" },
    ],
  },
  mirebronze_greaves: {
    key: "mirebronze_greaves",
    name: "Mirebronze Greaves",
    description: "Green-black plate from hip to ankle. It does not rust in standing water.",
    texture: "icon_mirebronze_greaves",
    maxStack: 1,
    hotbarable: false,
    armorSlot: "legs",
    armorType: "heavy_armor",
    armorDefense: 14,
    stats: [
      { label: "Type", value: "Armor (Legs)" },
      { label: "Armor Type", value: "Heavy" },
      { label: "Armor", value: "14" },
    ],
  },
  bogweave_hood: {
    key: "bogweave_hood",
    name: "Bogweave Hood",
    description: "A duskhide hood rewoven with bog fibre and mirebronze rivets.",
    texture: "icon_bogweave_hood",
    maxStack: 1,
    hotbarable: false,
    armorSlot: "helmet",
    armorType: "light_armor",
    armorDefense: 7,
    stats: [
      { label: "Type", value: "Armor (Head)" },
      { label: "Armor Type", value: "Light" },
      { label: "Armor", value: "7" },
    ],
  },
  bogweave_vest: {
    key: "bogweave_vest",
    name: "Bogweave Vest",
    description: "Duskhide relined with woven bog fibre — light, and it dries fast.",
    texture: "icon_bogweave_vest",
    maxStack: 1,
    hotbarable: false,
    armorSlot: "chest",
    armorType: "light_armor",
    armorDefense: 7,
    stats: [
      { label: "Type", value: "Armor (Chest)" },
      { label: "Armor Type", value: "Light" },
      { label: "Armor", value: "7" },
    ],
  },
  bogweave_leggings: {
    key: "bogweave_leggings",
    name: "Bogweave Leggings",
    description: "Bog-fibre weave over duskhide. Quiet in reeds, quieter in water.",
    texture: "icon_bogweave_leggings",
    maxStack: 1,
    hotbarable: false,
    armorSlot: "legs",
    armorType: "light_armor",
    armorDefense: 7,
    stats: [
      { label: "Type", value: "Armor (Legs)" },
      { label: "Armor Type", value: "Light" },
      { label: "Armor", value: "7" },
    ],
  },
  mirebronze_warhammer: {
    key: "mirebronze_warhammer",
    name: "Mirebronze Warhammer",
    description: "A sunsteel maul resunk in mirebronze. It lands like a dropped anchor.",
    texture: "icon_mirebronze_warhammer",
    maxStack: 1,
    hotbarable: true,
    weapon: "mirebronze_warhammer",
    stats: [
      { label: "Type", value: "Weapon" },
      { label: "Damage", value: "26" },
      { label: "Damage Type", value: "Blunt" },
      { label: "Stamina", value: "28" },
      { label: "Attack Speed", value: "1.3/s" },
    ],
  },
  mirebronze_sword: {
    key: "mirebronze_sword",
    name: "Mirebronze Longsword",
    description: "A sunsteel blade reforged in mirebronze — a wide, patient sweep.",
    texture: "icon_mirebronze_sword",
    maxStack: 1,
    hotbarable: true,
    weapon: "mirebronze_sword",
    stats: [
      { label: "Type", value: "Weapon" },
      { label: "Damage", value: "22" },
      { label: "Damage Type", value: "Slash" },
      { label: "Stamina", value: "24" },
      { label: "Attack Speed", value: "2.1/s" },
    ],
  },
  mirebronze_pike: {
    key: "mirebronze_pike",
    name: "Mirebronze Pike",
    description: "A sunsteel pike resunk in mirebronze. Reaches, and keeps reaching.",
    texture: "icon_mirebronze_pike",
    maxStack: 1,
    hotbarable: true,
    weapon: "mirebronze_pike",
    stats: [
      { label: "Type", value: "Weapon" },
      { label: "Damage", value: "28" },
      { label: "Damage Type", value: "Pierce" },
      { label: "Stamina", value: "26" },
      { label: "Attack Speed", value: "1.6/s" },
    ],
  },
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
  // B4-P2 epic loot: first reachable from the tier-2 pool (Warren caches
  // onward). The two tier-1 epics stay untagged and fall through to "forest",
  // which is exactly where a Gremlin Shack find belongs.
  "ring_gloamwrought_signet", "ring_deep_vein", "back_mireborn_cloak",
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
  "bog_ore", "gloamsteel_ingot", "mirehide", "swamp_moss", "water_lily",
  "gloamsteel_helm", "gloamsteel_cuirass", "gloamsteel_greaves",
  "mirehide_hood", "mirehide_vest", "mirehide_leggings",
  "gloamsteel_warhammer", "gloamsteel_sword", "gloamsteel_pike",
  "gloamsteel_warbow", "gloam_brand", "gloamdrinker", "gloam_arrows",
  // bayou creature drops + elite trophies (Phase 4b)
  "mirejaw_meat", "blight_gland", "gloam_dust",
  "mirejaw_trophy", "blighttoad_trophy", "mosswretch_trophy",
  "murkling_trophy", "fenlurker_trophy", "corpselight_trophy",
  // surface-POI spoils + the boss key (Phase 4d)
  "tyrant_sigil", "gorge_bone", "miretyrant_effigy",
  // B4-P2 epic loot: tier-3 pool only (crypt chests / lodge chieftain), so the
  // deepest biome's tab is where they belong. The shallower epics are tagged in
  // the forest/badlands sets by the tier that can actually drop them.
  "amulet_choirbone", "special_gravebind_coil", "special_pale_choir_lance",
  "back_drowned_king_shroud",
]);

export function itemBiome(key: string): ItemBiome {
  if (BAYOU_ITEM_KEYS.has(key)) return "bayou";
  return BADLANDS_ITEM_KEYS.has(key) ? "badlands" : "forest";
}

// A coarse category axis, orthogonal to biome, used to break each biome tab
// into labelled sections. Derived from existing def flags (no new per-item
// data) plus a small trophy/ritual key set.
export type ItemCategory = "material" | "gear" | "special" | "ability" | "station" | "food" | "curio";

const CURIO_ITEM_KEYS = new Set<string>([
  "gloam_shard", "ember_shard", "mire_shard", "gremlin_king_fang",
  "warren_fetish", "tyrant_totem", "gremlin_totem",
  "tyrant_sigil", "gorge_bone", "miretyrant_effigy",
]);

export function itemCategory(key: string): ItemCategory {
  const def = ITEM_DEFS[key];
  if (!def) return "material";
  if (def.placeable) return "station";
  if (def.edible) return "food";
  // Ability items and passive specials each get their OWN section rather than
  // being lumped in with armor and weapons under "gear" — the backpack section
  // an item lands in is now the fastest answer to "where can this go?".
  if (def.armorSlot && slotGroup(def.armorSlot) === "ability") return "ability";
  if (def.armorSlot && slotGroup(def.armorSlot) === "special") return "special";
  // Real gear only — the ammo "slot" (slingshot pellets) is a material, not
  // a wearable, so it groups with other stackable materials.
  if (def.weapon || def.tool || (def.armorSlot)) return "gear";
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
