import Phaser from "phaser";
import { Player, PLAYER_WALK_SPEED, DASH_DURATION_MS } from "../entities/Player";
import {
  ResourceNode,
  requiredKind,
  toolKind,
  toolDamage,
  toolCooldownMs,
  toolStaminaCost,
  type NodeAction,
  type ToolType,
} from "../entities/ResourceNode";
import { Enemy } from "../entities/Enemy";
import { Boar } from "../entities/Boar";
import { Snake } from "../entities/Snake";
import { RangedGremlin, MeleeGremling } from "../entities/Gremlin";
import { Duskrunner } from "../entities/Duskrunner";
import { Cragscale } from "../entities/Cragscale";
import { Hexling } from "../entities/Hexling";
import { Sandmaw } from "../entities/Sandmaw";
import { Mirejaw } from "../entities/Mirejaw";
import { Blighttoad } from "../entities/Blighttoad";
import { Mosswretch } from "../entities/Mosswretch";
import { Murkling } from "../entities/Murkling";
import { Corpselight } from "../entities/Corpselight";
import { Projectile, type ProjectileConfig } from "../entities/Projectile";
import { GremlinShack, SHACK_GUARD_RESPAWN_MS } from "../entities/GremlinShack";
import { BadlandsDen } from "../entities/BadlandsDen";
import { BossAltar } from "../entities/BossAltar";
import { GremlinKing, STAGGER_DAMAGE_MULTIPLIER } from "../entities/GremlinKing";
import { Gloamwarden, WARDEN_STAGGER_DAMAGE_MULTIPLIER } from "../entities/Gloamwarden";
import { Cinderwrought, CINDERWROUGHT_STAGGER_DAMAGE_MULTIPLIER } from "../entities/Cinderwrought";
import { Duneshaper, DUNESHAPER_STAGGER_DAMAGE_MULTIPLIER } from "../entities/Duneshaper";
import { Palewake, PALEWAKE_UNRAVEL_DAMAGE_MULTIPLIER } from "../entities/Palewake";
import { Kilnborn, KILNBORN_VENT_DAMAGE_MULTIPLIER } from "../entities/Kilnborn";
import { Sanguinarch, SANGUINARCH_ENGORGED_DAMAGE_MULTIPLIER } from "../entities/Sanguinarch";
import { SunkenCrypt, CRYPT_THEMES, type CryptTheme } from "../entities/SunkenCrypt";
import {
  generateCrypt,
  isCryptFloor,
  nearestCryptFloorPoint,
  cryptNavWaypoint,
  CRYPT_CELL,
  type CryptLayout,
} from "../systems/CryptLayout";
import { SunkenShrine, SHRINE_OFFERING, SHRINE_MAX_KINDLINGS } from "../entities/SunkenShrine";
import { MiretyrantLair } from "../entities/MiretyrantLair";
import {
  Miretyrant,
  MIRETYRANT_STAGGER_DAMAGE_MULTIPLIER,
  MIRETYRANT_MAX_ADDS,
} from "../entities/Miretyrant";
import type { DungeonInterior } from "../systems/Dungeon";
import { DrownedLodge } from "../entities/DrownedLodge";
import type { EpicPool, LootContainer, LootRollEntry } from "../systems/LootContainer";
import { EPIC_ITEM_KEYS, EPIC_POOL_T1, EPIC_POOL_T2, EPIC_POOL_T3, EpicPity } from "../systems/EpicLoot";
import type { ResourceType } from "../systems/Inventory";
import {
  Skills,
  skillDisplayName,
  weaponSkillDamageMultiplier,
  runningSprintMultiplier,
  dashIframeBonusMs,
  sprintStaminaDrainMult,
  choppingBonusChance,
  miningBonusChance,
  heavyArmorMagicMitigation,
  SKILL_TYPES,
  type SkillType,
} from "../systems/Skills";
import {
  PlayerProgression,
  xpToNextPlayerLevel,
  STAT_TYPES,
  type StatType,
} from "../systems/Progression";
import { Crafting } from "../systems/Crafting";
import { DEV_ENEMY_SPAWN_TABLE } from "../systems/DevSpawnTable";
import { Stamina } from "../systems/Stamina";
import { Health } from "../systems/Health";
import {
  weaponDamage,
  weaponCooldownMs,
  weaponStaminaCost,
  weaponPrimaryDamageType,
  weaponAttacksPerSecond,
  damageTypeDisplayName,
  rangedWeaponConfig,
  isRangedWeapon,
  weaponBaseCritChance,
  weaponBaseCritMult,
  weaponArc,
  weaponIdentityLine,
  bypassesArmor,
  BLUNT_SLOW_FACTOR,
  weaponLifelinkPct,
  weaponOnHitBurst,
  BLUNT_SLOW_MS,
  type WeaponType,
  type DamageType,
  type IncomingDamageType,
} from "../systems/Weapons";
import { outputKey, RECIPES, type Recipe } from "../systems/Recipes";
import { itemDef, armorTypesWornPerPiece } from "../systems/Items";
import { ItemContainer, moveSlot, sortAndStack, type ItemStack } from "../systems/ItemContainer";
import {
  STATION_UPGRADES,
  upgradesForItem,
  stationDisplayName,
  type StationUpgradeDef,
} from "../systems/StationUpgrades";
import {
  armorUpgradesForItem,
  totalPlayerDefense,
  ARMOR_UPGRADES,
  type ArmorUpgradeDef,
} from "../systems/ArmorUpgrades";
import {
  weaponUpgradesForItem,
  weaponTierDamageBonus,
  WEAPON_UPGRADES,
  type WeaponUpgradeDef,
} from "../systems/WeaponUpgrades";
import { toolUpgradesForItem, TOOL_UPGRADES } from "../systems/ToolUpgrades";
import { EventLog } from "../systems/EventLog";
import { Biome, type ZoneType } from "../systems/Biome";
import { Equipment, EQUIP_SLOTS, ABILITY_SLOT_IDS, slotGroup, type EquipSlot, type EquippedItem } from "../systems/Equipment";
import { activeSets, setById, type SetId } from "../systems/SetBonuses";
import {
  augmentEffect,
  augmentsForItem,
  appliedAugmentIds,
  equippedAugmentEffect,
  isGearAugment,
  GEAR_AUGMENTS,
  isAugmentableItem,
  MAX_AUGMENTS_PER_ITEM,
  type AugmentEffect,
  type GearAugmentDef,
} from "../systems/GearAugments";
import { Hotbar, ROW1_COUNT } from "../systems/Hotbar";
import { ProcessingStation, PROCESS_RECIPES, SMELT_RECIPES, SECONDARY_SIDES, type SecondarySide } from "../systems/Processing";
import { BuffManager } from "../systems/Buffs";
import { BleedManager } from "../systems/Bleed";
import { PoisonManager } from "../systems/Poison";
import { COOK_RECIPES, type CookRecipe } from "../systems/Cooking";
import { CraftingMenu } from "../ui/CraftingMenu";
import { ContextMenu, type ContextMenuItem } from "../ui/ContextMenu";
import { DryingRackMenu } from "../ui/DryingRackMenu";
import { CookingMenu } from "../ui/CookingMenu";
import { JewelryMenu } from "../ui/JewelryMenu";
import { EquipmentEffects, describePassive } from "../systems/EquipmentEffects";
import { JEWELRY_RECIPES, type JewelryRecipe } from "../systems/Jewelry";
import { BuffBarUI } from "../ui/BuffBarUI";
import { StatusBarUI, type StatusEffect } from "../ui/StatusBarUI";
import { ChestMenu } from "../ui/ChestMenu";
import { UpgradeMenu, type UpgradeDef } from "../ui/UpgradeMenu";
import { CharacterMenu } from "../ui/CharacterMenu";
import {
  InventoryMenu,
  BACKPACK_CAPACITY,
  PANEL_X as INVENTORY_PANEL_X,
  PANEL_Y as INVENTORY_PANEL_Y,
  PANEL_W as INVENTORY_PANEL_W,
  type ArmorSlotView,
  type CombatStatsView,
  type RunSpeedView,
} from "../ui/InventoryMenu";
import { HotbarUI } from "../ui/HotbarUI";
import { EventLogUI } from "../ui/EventLogUI";
import { KeybindsUI } from "../ui/KeybindsUI";
import { MinimapUI, PANEL_W as MINIMAP_W, PANEL_H as MINIMAP_H, MARGIN as MINIMAP_MARGIN } from "../ui/MinimapUI";
import { WorldMapUI } from "../ui/WorldMapUI";
import { BossHealthUI, type BossBarTarget } from "../ui/BossHealthUI";
import { FogOfWar, REVEAL_RADIUS } from "../systems/Fog";
import { ExploredMap } from "../systems/ExploredMap";
import { WorldBiomes, type BiomeId } from "../systems/WorldBiomes";
import { bayouWaterAt } from "../systems/Bayou";

// Display names for the current-biome HUD label + discovery toast. Placeholder
// flavor (Gloamreach setting) — easy to rename. "base" = the open wilds between
// biome blobs. Only the three real biomes fire a discovery notification.
const BIOME_NAMES: Record<BiomeId | "base", string> = {
  forest: "Verdant Woods",
  badlands: "Sunscorch Badlands",
  bayou: "Duskmire Bayou",
  dunes: "Windswept Dunes",
  base: "The Wilds",
};
import { ysortDepth } from "../systems/depth";
import { variantAt, clearVariantCache } from "../art/variants";
import { artScale, placeholderDims, scaleToLongest } from "../art/overrides";
import { Run, type RunOutcome, type KillCategory } from "../systems/Run";
import { RunLog } from "../systems/RunLog";
import { clearHighScores, recordHighScore } from "../systems/HighScores";
import type { ScoreEntry } from "../systems/HighScores";
import { RunHudUI } from "../ui/RunHudUI";
import { RunEndUI } from "../ui/RunEndUI";
import { HintManager } from "../systems/Hints";
import { SfxPlayer } from "../systems/Sfx";
import { HintUI } from "../ui/HintUI";
import { PauseMenuUI } from "../ui/PauseMenuUI";
import { WelcomeUI, hasSeenWelcome } from "../ui/WelcomeUI";
import { CharacterSelectUI } from "../ui/CharacterSelectUI";
import { RunCharacter, type CharacterDef } from "../systems/Characters";
import { TipsUI } from "../ui/TipsUI";
import { DayNight } from "../systems/DayNight";
import { NightOverlayUI, type ScreenLight } from "../ui/NightOverlayUI";
import {
  RelicManager,
  TROPHY_ROLL,
  RELIC_DEFS,
  rarityName,
  rarityIcon,
  RARITY_COLOR,
  relicEffectText,
  REFINE_RECIPES,
  refinableTrophyKeys,
  canAffordRefine,
  powerTierMult,
  SHARD_CONVERSIONS,
  type RollResult,
  type ChoiceResolution,
  type RelicGroup,
} from "../systems/Relics";
import { RelicForgeMenu } from "../ui/RelicForgeMenu";
import { PassiveBarUI, type PassiveEntry } from "../ui/PassiveBarUI";
import { AbilityBarUI, type AbilityBarEntry } from "../ui/AbilityBarUI";
import { ABILITY_DEFS, SLOT_ABILITY_KEY, type AbilityFamily, type AbilityId, type AbilityKey } from "../systems/Abilities";

const HOTBAR_KEYS = ["ONE", "TWO", "THREE", "FOUR", "FIVE", "SIX", "SEVEN", "EIGHT", "NINE"];

// Every item key producible by a recipe/process/cook/refine table — used to
// tell a raw MATERIAL (first pickup of a gathered/dropped resource) apart
// from a CRAFTED good (first time a recipe's output lands in the backpack),
// which already gets its own "New Recipe Unlocked!" toast the moment it
// becomes craftable. See discoverMaterial().
const CRAFTED_OUTPUT_KEYS = new Set<string>([
  ...RECIPES.map(outputKey),
  ...PROCESS_RECIPES.map((r) => r.output),
  ...COOK_RECIPES.map((r) => r.output),
  ...REFINE_RECIPES.map((r) => r.output),
]);

// Hardcore: one life. Death ends the run and posts a score instead of
// respawning (M-R1, roguelike meta-loop). Flipping this false restores the
// legacy respawn-at-center path (respawnPlayer) — the documented future
// "easy-mode" hook; nothing wires it to a toggle yet.
const HARDCORE = true;

const TILE = 32;
// --- World geometry (circular, M-W1 prep) ---
// The playable world is now a large CIRCLE centered on WORLD_CX/CY. The current
// first-biome content fills a central circle of BIOME_RADIUS; everything from
// there out to WORLD_RADIUS is (for now) empty grass — headroom for future
// biomes, with danger meant to scale outward from the safe center (the locked
// M-W1 direction). Physics/camera bounds stay a square that bounds the world
// circle; the player is clamped to the circle each frame (clampPlayerToWorld),
// and a dark "void" ring is drawn beyond WORLD_RADIUS (drawWorldBoundary).
const BIOME_RADIUS = 2000; // forest (biome 1) content circle — unchanged
// Biome 2+ worldgen is a Valheim-style PATCHWORK (see systems/WorldBiomes.ts): a
// universal base layer with biome blobs painted on top, weighted by danger =
// radialTier(r) + noise. Biome 1 (forest) is a solid PROTECTED disc at the center;
// the patchwork only exists beyond it. No concentric rings — the ring model was
// tried and reworked (too uniform). WorldBiomes owns the FOREST_CORE/EDGE + biome
// tier constants; MainScene only needs the world size + the forest region below.
// One tiled feature-Biome region size, shared by the outer biomes' internal look
// (badlands mesa/flats/ravine, dune ridge/hollow) so a small cheap Biome tiles
// across the whole outer world instead of a 28000px Voronoi.
const OUTER_FEATURE_SIZE = 4000;
// Full circular world edge — grown to ~14000 for ~5 patchwork biomes (locked:
// "bigger world + 2x chunks"). The rendering (one bounded coarse overlay texture +
// the crisp forest bake, ysortDepth compression, world-space fog) is sized for
// this, so growing it further later is a constant change, not a rearchitecture.
const WORLD_RADIUS = 14000;
const WORLD_SIZE = WORLD_RADIUS * 2; // 28000px square that bounds the world circle
const WORLD_CX = WORLD_RADIUS; // world center
const WORLD_CY = WORLD_RADIUS;
// Back-compat: existing spawn/camera code references WORLD_W/WORLD_H and treats
// WORLD_W/2, WORLD_H/2 as "the center" — both still hold now that the world is
// a centered square.
const WORLD_W = WORLD_SIZE;
const WORLD_H = WORLD_SIZE;
// World camera zoom. Raised 1.25 -> 1.5 (the user: "my guy looks so tiny — did
// the camera zoom out?"), so the player and every creature read 20% larger and
// the visible world is 1280x720 of a 1920x1080 canvas. Only the WORLD camera
// zooms; a separate zoom-1 UI camera keeps the HUD pixel-perfect (see
// setupCameras/syncCameras). Note updateSceneStreaming derives its radius from
// the camera's worldView, so it tracks any change here automatically.
const WORLD_ZOOM = 1.5;
// The terrain-baked biome region: a centered square inscribing the biome
// circle. Kept well under the GPU max-texture-size so the one-shot bake stays a
// single RenderTexture (BIOME_SIZE x BIOME_SIZE).
const BIOME_SIZE = BIOME_RADIUS * 2; // 4000
const BIOME_ORIGIN_X = WORLD_CX - BIOME_RADIUS;
const BIOME_ORIGIN_Y = WORLD_CY - BIOME_RADIUS;
// Fog / explored-map grid: world-space, one cell per 40px (200x200 for the
// 8000px world). Independent of any HUD panel resolution now — both the corner
// minimap and the full map render from it at their own scales.
const FOG_CELL = 40;
const FOG_COLS = Math.ceil(WORLD_SIZE / FOG_CELL);
// Minimum distance from world center the Boss Altar can spawn — bumped
// 900->1400 per playtest feedback ("boss shouldn't spawn close to center").
// Half-diagonal of the world is ~2240px, so this still leaves the 200-attempt
// fallback loop in pickSpawnPoint plenty of forest-zone area to land in.
const ALTAR_CLEAR_RADIUS = 1400;
// War Camp (M-WC) layout radii — one source of truth shared by the palisade
// ring (spawnWarCamp), the camp-floor ground stamp (buildBiomeTexture), and
// the resource-node/enemy no-spawn zone (pickSpawnPoint), so "the camp" means
// the same physical circle everywhere. CLEAR_RADIUS is padded past the
// palisade so clustered-node jitter (±40px, see scatterClustered) can never
// land a bush/tree inside the wall.
const WAR_CAMP_RADIUS = 230; // palisade wall radius
const WAR_CAMP_CLEAR_RADIUS = 300; // resource-node/enemy spawn exclusion edge
// The camp is a big, deliberately-clumped POI (breadcrumb prop trail runs
// 500-1050px out) — using fog's plain REVEAL_RADIUS (260px) for "discovered"
// meant the player had to walk almost up to the palisade before it registered.
// This wider radius fires discovery while still approaching through the
// clutter trail, matching how visually obvious the camp already is by then.
const ALTAR_DISCOVERY_RADIUS = 900;
// Every non-altar POI (shacks, vein, dens, forges) uses this generous detection
// radius so they land on the minimap/world-map from a good way off, not only
// once you're right on top of them (the user: "POIs should show up sooner").
// Scaled off fog's terrain reveal radius so the two stay related if that changes.
const POI_DISCOVERY_RADIUS = Math.max(760, REVEAL_RADIUS * 2.6);
// Gloaming Vein POI (rare mineable rarity-ore, gated behind the Gloamwarden).
// Placed a notable distance from both world center and the war camp so it reads
// as its own destination. VEIN_CLEAR_RADIUS is the no-spawn zone kept clear of
// ordinary nodes/enemies (same pattern as the war camp — see
// feedback_poi_busy_not_placeholder).
const VEIN_MIN_DIST_FROM_CENTER = 900;
const VEIN_MIN_DIST_FROM_CAMP = 900; // keep it well away from the altar/war camp
const VEIN_CLEAR_RADIUS = 160; // ore-clearing spawn exclusion edge
const VEIN_NODE_COUNT = 5;
const VEIN_NODE_RING = 90; // px — vein nodes cluster this far around the guardian
const REACH = 64; // how close (px) the player must be to interact
const PLACEMENT_RADIUS = REACH * 1.25; // how far from the player a placed item may land
const MAGNET_RADIUS = 100; // px — loose drop pieces within this of the player get pulled in
const MAGNET_SPEED = 220; // px/s a pulled piece travels toward the player
const MAGNET_PICKUP_DIST = 14; // px — close enough to the player to collect
const DROP_SCATTER_MIN = 20; // px — min distance a drop piece explodes out to
const DROP_SCATTER_MAX = 45; // px — max distance a drop piece explodes out to
const DROP_CONSOLIDATE_RADIUS = 28; // px — merge a landed piece into another this close
const SPRINT_DRAIN_PER_SEC = 33; // stamina/sec while sprinting — full bar in ~3s
// Bumped 10->20 per playtest feedback ("running needs to level a little faster early
// game") — pure rate tune, skillXpToNext's curve is untouched.
const RUNNING_XP_PER_SEC = 20;
const DASH_STAMINA_COST = 25; // flat cost per dash — 4 dashes per full bar
const DASH_IFRAME_MS = 150; // outlasts the dash burst itself (Milestone E)
// Anti-kite governor for ranged weapons (playtest: "ranged feels really safe,
// bows can just kite"). Firing briefly slows the player so a shot-and-sprint
// loop can't outrun everything indefinitely — a mild per-shot cost, not a
// lockout. 350ms is shorter than every bow's own cooldown (540ms+), so a
// single, unhurried shot still recovers to full speed before the next one.
const RANGED_FIRE_SLOW_MULT = 0.72; // ~28% slower, per locked playtest decision
const RANGED_FIRE_SLOW_MS = 350;
// --- Armor set-bonus magnitudes (biome 2 Phase 4 forged gear; see SetBonuses.ts) ---
// Molten Bulwark (Embersteel heavy): a melee attacker that lands a hit is seared
// for this much fire damage (thorns), and ALL incoming damage is cut by a flat
// fraction — a pure heavy-tank identity (the knockback-immunity that used to be
// this set's other half was dropped per playtest, decision 2).
const SET_THORNS_FIRE_DAMAGE = 9;
const SET_MOLTEN_DAMAGE_REDUCTION = 0.15; // 15% off every hit (physical/magic/fire) while the full set is worn
// Emberblink (Emberhide light): dash burst distance multiplier + the fire nova
// that erupts at the landing point.
const SET_EMBERBLINK_DASH_MULT = 1.6;
const SET_EMBERBLINK_BURST_RADIUS = 95;
const SET_EMBERBLINK_BURST_DAMAGE = 16;
// Bayou reforges of both sets (biome 3 Phase 3) - same two mechanics, turned up.
// Read through moltenDamageReduction()/emberblinkDashMult() so the Ember and
// Gloam tiers can never both apply (the stronger one wins).
const SET_GLOAM_BULWARK_DAMAGE_REDUCTION = 0.22;
const SET_GLOAM_THORNS_FIRE_DAMAGE = 15;
const SET_MIREBLINK_DASH_MULT = 1.9;
const SET_MIREBLINK_BURST_RADIUS = 120;
const SET_MIREBLINK_BURST_DAMAGE = 26;
// --- Activated-ability tuning (B3-P2a). First-pass/tunable. ---
const ABILITY_BLINK_DISTANCE = 220; // px teleported toward aim
const ABILITY_BLINK_IFRAME_MS = 250; // untouchable window on blink (> the 150ms dash)
const ABILITY_NOVA_RADIUS = 150; // gloam-burst reach
const ABILITY_NOVA_DAMAGE = 30; // magic damage per enemy in the burst
const ABILITY_NOVA_KNOCKBACK = 64; // px each enemy is shoved outward
const ABILITY_BLOODPACT_LIFELINK_PCT = 0.35; // fraction of damage healed while active
// B4-P2 found-only actives (epic loot). Every magnitude here is scaled by the
// casting def's `power` × the jewelry abilityPowerMult(), same as the originals.
const ABILITY_GRAVEBIND_RADIUS = 260; // who gets yanked
const ABILITY_GRAVEBIND_PULL = 170; // px dragged inward
const ABILITY_GRAVEBIND_HOLD_RADIUS = 90; // never pulled closer than this
// Deepened + lengthened (the user: "stun should be way longer"). At 0.45 for
// 900ms a yanked pack was walking again before you'd finished one swing, which
// is not a window — it's a hiccup. 0.30 for 2.2s, on top of the attack-state
// reset in castGravebind, is long enough to actually be the setup the ability
// advertises (wide-arc swing / follow-up nova).
const ABILITY_GRAVEBIND_SLOW = 0.3; // movement multiplier while staggering
const ABILITY_GRAVEBIND_SLOW_MS = 2200;
const ABILITY_LANCE_RANGE = 420; // length of the beam
const ABILITY_LANCE_HALF_W = 34; // how far off-axis still counts as hit
const ABILITY_LANCE_DAMAGE = 55; // magic damage per enemy on the line
const ABILITY_AEGIS_REDUCTION = 0.6; // damage cut while the window is open
// Mire Snare (AOE root) — the user: "needs to be some kind of AOE root ability".
// Distinct from Gravebind, which is a PULL that happens to slow: this doesn't
// move anything, it pins what's already on you. A root is a hard 0 move
// multiplier, not a steep slow, so `applySlow(0, …)` — which `slowMult` already
// supports, since it just multiplies velocity.
//
// Deliberately does NOT stop enemies attacking: a rooted enemy you're standing
// next to still swings, so the counterplay is to root and then LEAVE, not root
// and facetank. That's what keeps it a control tool rather than a stun.
const ABILITY_SNARE_RADIUS = 240;
const ABILITY_SNARE_MS = 2600;
// Bloodrush (attack speed) — the user: "needs to be some kind of attack speed
// ability". A timed multiplier on weapon cooldown, applied at the single
// attackCooldownMult() choke point every attack path already reads.
const ABILITY_HASTE_MULT = 0.6; // 0.6x cooldown = ~1.67x attacks/sec
const ABILITY_HASTE_MS = 6000;
// Crit (M-SS) soft caps on the COMBINED total (weapon base + Strength/Agility
// stats + relic crit channels). Applied in critChanceTotal()/critMultTotal().
const CRIT_CHANCE_CAP = 0.6;
const CRIT_MULT_CAP = 3.0;
// How a weapon's damage type landed against a target's resistances (Biome 2
// Phase 1) — drives the floating-damage-number tint. "normal" = neutral (×1).
type DamageEffectiveness = "normal" | "weak" | "resist";
const WORKBENCH_RANGE = 100; // px — looser than REACH; "am I near it," not a precise click
// Tint per station level for non-textured placeables (Campfire etc.) — warmer
// the higher the level, so a Lvl 3/4 campfire reads distinctly from a Lvl 2 one
// (index 0 = tier 1). Textured stations (Workbench/Smelter) swap art instead.
const CAMPFIRE_TIER_TINT = [0xffe08a, 0xffb066, 0xff8c5a];
const BLACKBERRY_REGROW_MS = 3 * 60 * 1000; // a picked bush regrows berries after 3 in-game minutes
// Comfort (Bedroll) HP regen: player must be near a placed Bedroll, that
// Bedroll must be near a placed Campfire (hard requirement, not optional),
// and no live enemy may currently be aggro'd on the player (see
// isAnyEnemyAggro — not a proximity radius, so a sleeping/wandering enemy
// nearby doesn't block resting).
const COMFORT_RANGE = 80; // px, player <-> Bedroll
const COMFORT_CAMPFIRE_RANGE = 120; // px, Bedroll <-> Campfire
// How close a HUNTING enemy must be to count as "you are not safe to rest".
// Comfortably past a screen's width, so nothing off-camera blocks resting but
// anything actually bearing down on you does. See isAnyEnemyAggro.
const COMFORT_THREAT_RADIUS = 900;
// Miretyrant phase-3 arena hazard. Deliberately survivable to cross — the pools
// are meant to take the arena away a piece at a time, not to be instant death
// that turns the fight into a tile puzzle.
const MIRE_POOL_RADIUS = 90;
const MIRE_POOL_SLOW_MULT = 0.55;
const MIRE_POOL_POISON_DPS = 7;
// C2: the Mosswretch's spore cloud. A timed, creature-placed sibling of the
// mire pool above, and it rides the exact same environmentEffectAt path — so it
// inherits the slow, the poison DoT, the regen suppression and the
// status-resist scaling with no bespoke damage code. Weaker and much shorter
// than a boss arena hazard: this is a common enemy denying you a patch of
// ground for a few seconds, not a phase mechanic.
const SPORE_CLOUD_RADIUS = 85;
const SPORE_CLOUD_SLOW_MULT = 0.6;
const SPORE_CLOUD_POISON_DPS = 5;
const SPORE_CLOUD_MS = 6000;
// Concurrent FOOD buffs allowed by default (Comfort/Bedroll is exempt — see
// Buffs.ts COMFORT_BUFF_ID). A run character's modifier may override it
// (Characters.ts `maxBuffs`) — the Ashcaller's "buff master" identity raises it.
const DEFAULT_MAX_BUFFS = 2;
// A killed Blighttoad's delayed death bloom (see spawnDeathBloom). Long enough
// to read the swelling corpse and step off it, short enough that it still
// punishes standing in a pack you just AOE'd down.
const DEATH_BLOOM_FUSE_MS = 1100;
// Every named fight, keyed by displayName, with the one-line read that tells the
// player what KIND of fight they just walked into. Presence in this table is
// what makes an enemy announce itself (see announceBossEncounter) — a future
// boss is one row, and an ordinary enemy is simply absent.
const BOSS_SUBTITLES: Record<string, string> = {
  // Mini-bosses — each hints at its own bespoke opening, since every one of
  // these is solved differently.
  Gloamwarden: "Guardian of the Vein",
  Cinderwrought: "Keeper of the Cinder Forge",
  "The Palewake": "It feeds on the tether — break line of sight",
  "The Kilnborn": "It burns the ground it stands on",
  "The Sanguinarch": "It grows strong on your blood",
  // Big bosses.
  "Gremlin King": "Warlord of the Forest",
  "The Duneshaper": "Sorcerer of the Sunscorch",
  "The Miretyrant": "Sovereign of the Drowned Deep",
};
// How far from the player an enemy still runs its AI. Comfortably past both the
// camera's ~1536px view and the longest leash on the roster (the Duskrunner's
// 620), so the cull is never observable. See the note in updateEnemies.
const ENEMY_ACTIVE_RADIUS = 2000;
const ENEMY_ACTIVE_RADIUS_SQ = ENEMY_ACTIVE_RADIUS * ENEMY_ACTIVE_RADIUS;
// Phase 1 (terrain-that-matters): walk-speed multiplier while standing in a
// bramble patch — noticeable but not punishing, the gentle intro to terrain
// affecting movement. Dashing ignores it (Player.update's dash burst is separate).
const BRAMBLE_SLOW_MULT = 0.6;

// A badlands macro-zone (Phase 1). NON-circular: the effective edge radius varies
// with angle via an angular harmonic wobble (same idiom as WorldBiomes.seedCoverage),
// so zones read as organic lumpy blobs, not perfect circles. The one shape (zoneEdge)
// is shared by subZoneAt (membership), the prop fill, and the ground decal so they
// all line up. `wAmp` is the wobble amplitude as a fraction of the base radius `r`.
interface ZoneShape {
  x: number;
  y: number;
  r: number;
  wK: number;
  wPhase: number;
  wAmp: number;
}
interface BadlandsZone extends ZoneShape {
  type: "boulderfield" | "thornfield";
}
// A bayou macro-zone (biome 3 Phase 4a). Same organic wobbly-blob shape as a
// badlands zone — only the effect differs, so it shares ZoneShape/zoneEdge rather
// than duplicating the geometry. "miasma" is the gloam fog: it suppresses HP regen
// AND ticks poison, which is the biome's signature environmental threat.
// The bayou's themed macro-zones — the same organic wobbly-blob shape as a
// badlands zone (shared ZoneShape/zoneEdge), differing only in effect + dressing.
// These carry the biome's signature LOOK now that its precious materials moved
// underground (the user): the surface has to be characterful and threatening on
// its own, since it's no longer where the payoff is.
//   miasma   — gloam fog: suppresses HP regen AND ticks poison. The hazard.
//   bonemire — a drowned boneyard of pale dead trees; waterlogged, so it slows.
//   hammock  — a raised cypress island: no penalty, dense foraging. The respite.
interface BayouZone extends ZoneShape {
  type: "miasma" | "bonemire" | "hammock";
}
// Sum of the three harmonic weights below — the max |wobble|, used to bound a zone's
// outermost lobe (rMax = r * (1 + wAmp * WOBBLE_MAX)) for POI-clearance checks.
const WOBBLE_MAX = 0.6 + 0.28 + 0.16;
// A player-dropped or destroyed-station item pickup ignores the magnet for
// this long so it doesn't instantly fly back into the inventory/station that
// just released it. Manual click-pickup is unaffected.
const DROPPED_ITEM_MAGNET_COOLDOWN_MS = 1500;

// Night light sources (M-DN). A held item emits light of the given world-px
// radius while it's the selected hotbar item; a future Lantern just adds a row.
const LIGHT_RADIUS_BY_ITEM: Record<string, number> = {
  torch: 180,
};
// Fixed light radius for a lit POI (Gremlin Shack, Boss Altar) at night.
const POI_LIGHT_RADIUS = 150;
// Additive light colours (see NightOverlayUI.ScreenLight.color). The darkness
// mask only ever *reveals* what's beneath it, so before this every light source
// looked identical no matter what its comment claimed — a "purple beacon" and a
// "warm ember smithy" were the same grey hole. These are what actually makes a
// gloam vein read violet and a forge read molten from across a dark map.
//
// A source with no entry here casts no colour and behaves exactly as before.
const LIGHT_COLOR = {
  torch: 0xffb45a, // carried flame — warm amber
  poiFire: 0xff9440, // shack hearths, war-camp braziers, boss altars, lodge lamps
  forge: 0xff6a2a, // molten crucible — hottest, most orange
  den: 0xc97a3d, // "faint gloam-ember" — dimmer and browner than a real fire
  vein: 0xa855f7, // Gloaming Vein amethyst
  tyrant: 0x8b5cf6, // Duneshaper altar gloam crystals — violet
  crypt: 0x9a6ae0, // crypt doorways. Generic gloam for now: per-gem colour needs
  // the theme threaded into cryptLightPoints, which is currently just {x,y}.
  gorge: 0x7fd84a, // the Sunken Gorge's maw — "a bile-green hole breathing light"
  shrine: 0x9fd45a, // Sunken Shrine bowl-fire — sickly swamp green-gold
  // Deliberately the only COOL, near-white light underground. Every other
  // interior source is warm firelight, so the way out never reads as one more
  // brazier.
  daylightShaft: 0xdfe8ff,
} as const;
// Nightfall surge (M-DN): how many extra enemies spawn in unexplored cells
// around the player at each dusk, and the ring (world px) they appear in —
// beyond the ~half-screen view so they arrive out in the dark, not on top of
// the player. Culled at dawn unless they engaged (see cleanupNightSpawns).
const NIGHT_SPAWN_RING_MIN = 500;
const NIGHT_SPAWN_RING_MAX = 850;

// Enemy respawn — "fog top-up" (2026-07-11). Playtesters burned through food far
// faster than a one-shot, finite roster could supply, so the world now keeps
// itself huntable: a periodic check tops the live enemy count back up toward a
// target near the player, spawning replacements OFF-SCREEN in the fog ring (like
// the nightfall surge) so nothing pops into view. Bounded locally (TARGET) and
// globally (MAX_LIVE) so camping can't build a swarm and the population can't run
// away. Moderate pace (locked with the user): a cleared area refills in ~1-2 min.
// Bosses (GremlinKing/Gloamwarden) and Shack guards are excluded — their own
// lifecycles own them. All first-pass/tunable.
// Pace (locked with the user): a fully cleared area repopulates in ~5 min, NOT
// faster — TICK_MS 30s × TARGET 10 at PER_TICK 1 = ~300s to refill from empty.
const RESPAWN_TICK_MS = 30000; // how often the top-up check runs (30s → ~5 min full refill)
const RESPAWN_NEARBY_RADIUS = 1500; // "near the player" window kept populated
const RESPAWN_NEARBY_TARGET = 10; // desired live non-boss enemies within that window
const RESPAWN_PER_TICK = 1; // at most N replacements per tick — this paces the refill
const RESPAWN_MAX_LIVE = 160; // global safety cap on total non-boss enemies
// Ring is pushed just past the camera's half-diagonal (~1102 at 1920x1080) so a
// replacement never materializes on-screen, even on a horizontal spawn.
const RESPAWN_RING_MIN = 1150;
const RESPAWN_RING_MAX = 1600;

// Generalized elite spawning (M-EL2, added 2026-07-10) — a base % chance for
// any normal enemy spawn (Boar/Snake/Gremlin/Gremling) to roll as its elite
// variant instead, replacing the old all-or-nothing-per-site model (only the
// Gremlin Shack guards, still hardcoded elite:true below, force it). Night
// spawns (the M-DN nightfall surge) roll at a multiplied chance — first-pass
// numbers, tune from playtesting.
const ELITE_SPAWN_CHANCE = 0.08;
const NIGHT_ELITE_CHANCE_MULT = 3;
// The bayou (endgame biome) rolls elites ~2x more often — elites are the trophy
// source that feeds the relic meta-loop, and the user found them "really rare" out
// there. Applied to the bayou surface spawns (spawnBayouEnemies).
const BAYOU_ELITE_CHANCE_MULT = 2;
// Bayou INTERIORS (the six Sunken Crypts and the Miretyrant's lair) roll far
// hotter still: ~40%. Two 2026-07-24 complaints share this one lever —
// "dungeons are easy" and "trophies feel so rare in the bayou... maybe the
// dungeons should be all elites" — because a crypt is both the hardest content
// in the biome and a fixed, finite, non-respawning population, so it can afford
// a density the open world can't. Deliberately not 100%: an all-elite room
// erases the elite recolor as a "this one is dangerous" read.
const CRYPT_ELITE_CHANCE_MULT = 5;
// Rite/garrison waves at the two bayou surface POIs. These bypassed the elite
// roll ENTIRELY (both Sunken Shrine waves 1-2 and every Drowned Lodge resident
// were hardcoded normal), which is a large part of why the biome's trophy
// supply felt dry — its two dedicated POIs contributed almost none.
const BAYOU_POI_ELITE_CHANCE_MULT = 3;

// Gremlin Shack chest loot — re-rolled per "empty cycle" (see
// LootContainer.rollIfEmpty/rearmIfEmpty), not per guard-respawn. First-pass,
// tunable.
const GREMLIN_SHACK_LOOT_TABLE: LootRollEntry[] = [
  { key: "gremlin_blood", min: 1, max: 3, chance: 0.9 },
  { key: "gremlin_skin", min: 1, max: 2, chance: 0.5 },
  { key: "bones", min: 1, max: 2, chance: 0.6 },
  { key: "twine", min: 1, max: 2, chance: 0.35 },
  { key: "leather", min: 1, max: 1, chance: 0.25 },
];

// Duskrunner Warren cache loot (biome 2 Phase 3) — a heap of the fallen,
// revealed only once the den is smashed. Rolled once (LootContainer), no
// respawn. Richer than the shack (a two-wave elite fight earns it): guaranteed
// pelts, likely meat/bones, and chances at chitin/shards + a trophy.
const DUSKRUNNER_WARREN_LOOT_TABLE: LootRollEntry[] = [
  { key: "duskrunner_pelt", min: 2, max: 4, chance: 1.0 },
  { key: "duskrunner_meat", min: 2, max: 4, chance: 0.9 },
  { key: "bones", min: 1, max: 3, chance: 0.8 },
  { key: "sandmaw_chitin", min: 1, max: 2, chance: 0.35 },
  { key: "gloam_shard", min: 1, max: 2, chance: 0.4 },
  { key: "duskrunner_trophy", min: 1, max: 1, chance: 0.5 },
  // The Duneshaper summon ingredient (badlands final boss). Guaranteed 1/cache —
  // clearing a few Warrens gathers the fetishes an Effigy of the Duneshaper needs.
  { key: "warren_fetish", min: 1, max: 1, chance: 1.0 },
];

// Warren placement (biome 2 Phase 3): dens should be FAIRLY COMMON — roughly one
// per sizable badlands chunk (the user), not a rare landmark. DEN_CLEAR_RADIUS
// keeps ordinary wild badlands packs out of a den's own clearing (the "POI busy
// = missing exclusion zone" lesson); DEN_MIN_SPACING spreads them so they land
// in different chunks rather than clustering.
const DEN_COUNT = 30; // 10 -> 16 -> 30 (the user: "need more burrows", then "WAAYAYYY more")
const DEN_MIN_SPACING = 900; // spread across chunks, but common enough that most areas have one
const DEN_CLEAR_RADIUS = 200;
const DEN_WAVE2_DELAY_MS = 1600; // beat between wave-1 clear and the elite wave-2 emerging (S4)

// POI respawn (S4, locked decision 4): Warren dens, the Gloaming Vein, and Sunken
// Forges each re-arm on a timer AFTER being fully cleared (den looted + cache
// emptied; vein/forge mini-boss dead + all its ore mined out). Boss-summon altars
// (gremlin/tyrant) are the ONLY one-shot POIs. Mirrors the shack's 6-min guard
// respawn; a mini-boss POI is a bigger commitment, so it's a bit longer.
const POI_RESPAWN_MS = 8 * 60 * 1000; // 8 min after full clear before a POI re-arms
// Only toast a POI respawn if the player is within this of it (roughly on-screen
// + a margin) — a respawn across the map is noise (the user).
const POI_RESPAWN_NOTIFY_RADIUS = 900;

// Badlands content band radii (from world center). Most content fills the
// accessible inner band; POI_DEEP_R_MIN pushes the "destination" landmarks (Sunken
// Forges + Duneshaper altars, S4) further out so they don't crowd the forest edge.
const BADLANDS_R_MIN = 2500;
const BADLANDS_R_MAX_INNER = 5200; // the original "accessible inner band" ceiling
// PB1 Session 3 (playtest: "lot of empty space... at least put trees and rocks out
// here" + "shouldn't have to loop the whole badlands ring") — extends the populated
// badlands band another ~3300px band out, and gives the forest patchwork blobs
// beyond BIOME_RADIUS their own (lighter) content pass. Deliberately NOT filled all
// the way to WORLD_RADIUS (14000) — that deep frontier stays reserved for a future
// biome per the roadmap, not silently backfilled with biome-1/2 content.
const BADLANDS_R_MAX_OUTER = 8500;
const OUTER_FOREST_R_MAX = 6000;
// Bayou band (biome 3). Starts at its WorldBiomes unlock radius (6500) and runs
// out to the deep frontier where the Dunes placeholder takes over — so a player
// pushing past the badlands finds it, and it never laps the forest disc.
// Pulled IN from 6400 to follow the bayou's new 4200 unlock radius, and the
// outer edge in from 10500 now that the Dunes no longer own the frontier.
// Together with the POI density bump this is what makes a QUADRANT hold a full
// material set (the user: "a shitload of mats in just 1/4th of the map"), instead
// of the bayou's content being smeared across a 4000px-deep ring.
const BAYOU_R_MIN = 4400;
const BAYOU_R_MAX = 9000;
// Water movement penalties (locked: slow BY DEPTH, never blocks — the swamp stays
// fully traversable). Shallow muck is a nuisance; a deep gloam channel is a real
// commitment you can be caught in.
const BAYOU_SHALLOW_SLOW_MULT = 0.78;
const BAYOU_DEEP_SLOW_MULT = 0.5;
// Miasma: no HP regen inside, plus a slow poison tick (see Poison.ts).
const MIASMA_POISON_DPS = 3;
// How much healing survives inside a MIASMA/mire-pool zone. Named for the
// hazard, not for the poison status — a creature's poison dose stopped touching
// regen in the 2026-07-23 batch; only standing in the fog does.
//
// 0.75 -> 1.0 (2026-07-24, the user: "get rid of the healing reduction
// entirely"). Miasma/mire zones now only deal their poison DAMAGE; they no
// longer weaken healing at all. Kept as a named constant (not deleted) so a
// future zone could reintroduce a heal debuff deliberately, but nothing does
// today — the "This ground weakens healing" status simply never fires now.
const POISON_REGEN_MULT = 1.0;
// Bonemire: waterlogged boneyard muck. Harsher than shallow water, gentler than
// a deep channel — crossing one is a real commitment.
const BONEMIRE_SLOW_MULT = 0.62;
// Denominator for the status-HUD depletion meters. Neither DoT has one single
// "duration" (each is a bag of stacks with their own timers), so the meter shows
// remaining time against a fixed reference window rather than pretending to know
// a total — full bar = this long or more left, draining as it runs out.
const POISON_METER_FULL_MS = 900;
const BLEED_METER_FULL_MS = 4000;
const POI_DEEP_R_MIN = 3600;
// Keep distinct POI types from crowding each other (S4). Enforced in the pickers
// against every already-placed POI center, on top of each POI's own clear radius.
const POI_MIN_SEPARATION = 800; // eased alongside the density bump — more POIs need more room to fit

// Sunken Forge POIs (biome 2 Phase 3 POI 2) — SEVERAL themed landmarks out in the
// badlands, each guarded by a Cinderwrought mini-boss (the user: "way more of the
// ember POIs — took me forever to find the one on the map"). Placed well clear of
// the war camp and Gloaming Vein so each reads as its own destination;
// FORGE_CLEAR_RADIUS keeps ordinary badlands spawns out of a forge clearing (the
// "POI busy = missing exclusion zone" lesson).
const FORGE_COUNT = 9;
const FORGE_MIN_SPACING = 1600; // spread the forges across the badlands
const FORGE_MIN_DIST_FROM_CAMP = 1000;
const FORGE_MIN_DIST_FROM_VEIN = 700;
const FORGE_CLEAR_RADIUS = 240;
const FORGE_DECOR_COUNT = 9; // decorative slag chunks scattered across the clearing
const FORGE_ORE_COUNT = 4; // shielded ember-ore nodes, cracked open on the Cinderwrought's death

// Duneshaper altars (biome 2 Phase 3 — the badlands final boss). ONE PER QUADRANT
// of the map (the user — players move outward radially and shouldn't have to
// backtrack across the world), so at least one is reachable no matter which side
// of the huge world the player explored; crafting the summon Effigy also reveals
// them all on the map (the clue system). Kept clear of content.
const TYRANT_ALTAR_MIN_SPACING = 2600; // spread across the badlands ring
// The altar clearing is now a big, obvious PLACE (the user: "boss altar area needs
// to be way bigger and noticeable similar to other POIs") — a wide gloam-blighted
// floor ringed by standing stones and guarded by elite Hexlings. The clear radius
// grew to match so nothing wild spawns inside the arena.
const TYRANT_ALTAR_CLEAR_RADIUS = 360;
const TYRANT_ALTAR_FLOOR_RADIUS = 300;
const TYRANT_ALTAR_GUARD_COUNT = 4; // elite Hexlings guarding each altar

// ===== Sunken Crypts (biome 3 Phase 4c — the dungeon mechanic) =====
//
// Interiors live in a POCKET OF THE SAME WORLD rather than a separate Phaser
// Scene: every system the player carries (run state, HUD, inventory, physics
// groups, day/night, relics) lives on MainScene, and a second scene would have
// to duplicate or re-parent all of it. The pocket is the dead corner of the
// world SQUARE that falls outside the world CIRCLE — physics/camera bounds
// already cover it (setBounds is the square), drawWorldBoundary already paints
// it near-black, and every spawn sampler already rejects it because content is
// gated on biome coverage inside WORLD_RADIUS.
//
// Geometry check (do not shrink the margin casually): the corner of this rect
// nearest world center is (3600, 2600), which is hypot(10400, 11400) ≈ 15432 px
// from (WORLD_CX, WORLD_CY) — comfortably outside WORLD_RADIUS (14000). Every
// other point of the rect is further out still.
// The underground pocket, in the dead corner of the world SQUARE that falls
// outside the world CIRCLE. Grown 3400x2400 -> 3700x3700 (the largest square
// that still clears WORLD_RADIUS at its inner corner: hypot(10100,10100) =
// 14283 > 14000) and packed 4x3 instead of 3x2, DOUBLING the dungeon count.
// Packing this tightly is only safe because an interior is now hidden unless
// you're inside it (see setDungeonVisible) — cells still never overlap, so no
// interior's wall bodies reach into another's floor.
// How long the black fade covering a dungeon transition takes to lift (see
// transitionCameraTo). Long enough to read as a scene change, short enough not
// to be a loading screen.
const TRANSITION_FADE_MS = 420;
const CRYPT_REALM = { x: 200, y: 200, w: 3700, h: 3700 };
// A SECOND crypt pocket, in the BOTTOM-LEFT dead corner — the mirror of the
// top-left one, and free (LAIR_REALM took the top-right). Added when the crypt
// count went past what one 4x3 realm holds: the alternative was shrinking every
// cell, and a smaller cell means generateCrypt silently places fewer rooms, so
// "more dungeons" would have quietly meant "worse dungeons". Same geometry
// check as the others — its inner corner (3900, 24100) is hypot(10100, 10100) =
// 14283 from world center, outside WORLD_RADIUS (14000).
const CRYPT_REALM_2 = { x: 200, y: 24100, w: 3700, h: 3700 };
const CRYPT_REALMS = [CRYPT_REALM, CRYPT_REALM_2];
// Every underground pocket with a generous margin, so "nearly in there" counts
// too — see the invariant in updateEnemies. All of these rects sit outside the
// world circle by construction, so no surface content can legitimately be here
// and the margin can't catch anything real.
const UNDERGROUND_GUARD = 600;
function insideUndergroundRealm(x: number, y: number): boolean {
  const inRect = (r: { x: number; y: number; w: number; h: number }) =>
    x >= r.x - UNDERGROUND_GUARD &&
    x <= r.x + r.w + UNDERGROUND_GUARD &&
    y >= r.y - UNDERGROUND_GUARD &&
    y <= r.y + r.h + UNDERGROUND_GUARD;
  return CRYPT_REALMS.some(inRect) || inRect(LAIR_REALM);
}
const CRYPT_GRID_COLS = 4;
const CRYPT_GRID_ROWS = 3;
const CRYPT_CELLS_PER_REALM = CRYPT_GRID_COLS * CRYPT_GRID_ROWS; // 12
// 12 -> 18 (the user playtest: "explored like a 3rd of the ring and didn't find
// any dungeons"). Six per gem theme, so a run always has several shots at each
// ability. The bigger half of that complaint was findability, not count — the
// answers to that are the Gravemark Rubbing (a bayou drop that maps the nearest
// unknown crypt — see revealNearestCrypt) and the grave-marker breadcrumb bands
// each entrance scatters around itself (see spawnSunkenCrypts).
const CRYPT_COUNT = 18;
// Grave markers strewn around a crypt mouth, thinning outward — the war camp's
// breadcrumb-trail idea applied to a doorway. A crypt used to be a single small
// structure in an enormous swamp with nothing announcing it; the bands mean you
// notice the ground getting graver before you can see the door itself, which is
// discovery through exploration rather than a map handout.
const CRYPT_TRAIL_BANDS = [
  { radius: 300, count: 10 },
  { radius: 520, count: 8 },
  { radius: 760, count: 5 },
];
const CRYPT_CELL_PAD = 40; // gap between adjacent interiors inside the realm
const CRYPT_ROOMS_MIN = 5;
const CRYPT_ROOMS_MAX = 7;
// Surface entrances: spread across the bayou, with the standing POI exclusion so
// ordinary swamp content never scatters into a crypt's clearing.
const CRYPT_MIN_SPACING = 1100; // eased with the count doubled, so 12 doorways still spread
const CRYPT_CLEAR_RADIUS = 200;
const CRYPT_LIGHT_RADIUS = 130; // entrance/brazier night-glow holes
// A crypt is lit by DISCOVERY, not by equipment (the user: not a fan of "you must
// hold a torch to see"). Setting foot in a room or corridor lights that whole
// space for the rest of the run, so a explored crypt reads as a map of lit rooms
// with the unexplored parts still black. The player also carries a modest
// always-on glow so an unlit corridor is navigable — a torch/lantern then makes
// it BETTER (a wider pool) instead of being the price of admission.
const CRYPT_AMBIENT_LIGHT = 120; // player's own light underground, torch or not
// The soft brush is a radial gradient — at 1× a room's edges would only be half
// erased. Oversizing puts the brush's fully-opaque core over the room proper and
// lets the falloff land on the walls, which is what makes a lit room read as a
// room (walls included) rather than a blob in the middle of one.
const CRYPT_ROOM_LIGHT_SCALE = 1.55;
const CRYPT_VAULT_GEODE_COUNT = 3; // shielded gem geodes per vault
const CRYPT_VAULT_SEAM_COUNT = 4; // 3 -> 4 (B4-P5): Gloamsteel now eats Moonsilver, on top of rising jewelry demand
const CRYPT_EXIT_REACH = 46; // stairs are a fat target — never fight the exit

// What a crypt's side-room chest can hold. Richer than a Warren cache (this is
// the deepest content in the game so far) but deliberately NOT a gem source —
// the gems are behind the warden, in the vault, always.
const CRYPT_LOOT_TABLE: LootRollEntry[] = [
  { key: "moonsilver", min: 1, max: 2, chance: 0.85 },
  { key: "bog_ore", min: 3, max: 6, chance: 0.8 },
  { key: "mirehide", min: 1, max: 2, chance: 0.5 },
  { key: "gloam_shard", min: 1, max: 3, chance: 0.6 },
  { key: "hex_essence", min: 1, max: 3, chance: 0.5 },
  { key: "bones", min: 3, max: 6, chance: 0.6 },
  { key: "refined_trophy_uncommon", min: 1, max: 1, chance: 0.25 },
];

// ===== Bayou surface POIs (biome 3 Phase 4d) =====
//
// The crypts gave the bayou a way DOWN; these give it places to go on the
// surface. Deliberately built on two different verbs so they aren't each
// other's reskin (and aren't a fourth copy of "kill the guards, take the loot"):
// the Shrine is a rite the PLAYER starts and has to survive on the spot, and
// the Lodge is a place whose danger is its geography.

// Sunken Shrines. A rite site is a destination, so they sit deep (POI_DEEP_R_MIN)
// and well apart; SHRINE_CLEAR_RADIUS is generous because the rite spawns waves
// in a ring around it and wild scatter inside that ring reads as noise.
const SHRINE_COUNT = 9;
const SHRINE_MIN_SPACING = 1800;
const SHRINE_CLEAR_RADIUS = 260;
const SHRINE_RING_PROPS = 7; // decorative offering basins circling the shrine
// The rite. Three waves, each given time to be fought before the next lands —
// a wave that arrives on top of the last one is a pile-up, not an escalation.
const SHRINE_WAVE_COUNT = 3;
const SHRINE_FIRST_WAVE_DELAY_MS = 1400; // beat between kindling and wave 1
const SHRINE_WAVE_INTERVAL_MS = 22000; // cadence if the player hasn't cleared yet
const SHRINE_SPAWN_RADIUS = 190; // where a wave surfaces, in a ring around the shrine
// Leash: the rite is a stand-and-hold, so walking away lapses it. Not instant —
// a fighting retreat across the clearing is legitimate, abandoning it isn't.
const SHRINE_RITE_RADIUS = 420;
const SHRINE_LEASH_GRACE_MS = 5000;

// Sunken Shrine bowl (Phase 4d). Guaranteed Tyrant Sigil — a survived rite is a
// real fight, and the sigils are half of what the deep mire will ask for.
// Paid once per shrine, on the third rite SURVIVED (see completeShrineRite).
// A relic-economy reward rather than a material, so bounding the shrine farm
// doesn't also cut a gear source.
const SHRINE_MASTERY_REWARD = "refined_trophy_uncommon_t3";

const SUNKEN_SHRINE_LOOT_TABLE: LootRollEntry[] = [
  { key: "tyrant_sigil", min: 1, max: 1, chance: 1.0 },
  { key: "gloam_shard", min: 2, max: 4, chance: 0.85 },
  { key: "moonsilver", min: 1, max: 1, chance: 0.35 },
  { key: "blight_gland", min: 2, max: 4, chance: 0.6 },
  { key: "gloam_dust", min: 2, max: 4, chance: 0.6 },
  { key: "hex_essence", min: 1, max: 2, chance: 0.4 },
];

// Drowned Lodges. Fewer and further apart than crypt doorways — a village is a
// landmark. The clear radius covers the whole boardwalk footprint.
const LODGE_COUNT = 9;
const LODGE_MIN_SPACING = 1800;
const LODGE_CLEAR_RADIUS = 280;
const LODGE_HUT_MIN = 4;
const LODGE_HUT_MAX = 6;
const LODGE_WALK_HALF_W = 16; // half-width of the boardwalk planking
const LODGE_SPAN = 210; // how far the boardwalk runs either side of center
const LODGE_HUT_OFFSET = 66; // how far off the walkway a hut platform sits
const LODGE_LURKER_COUNT = 3; // Mirejaws in the water under the planks

// An ordinary hut's cache — steady bayou supply, no key material.
const LODGE_HUT_LOOT_TABLE: LootRollEntry[] = [
  { key: "mirehide", min: 1, max: 2, chance: 0.6 },
  { key: "mirejaw_meat", min: 1, max: 3, chance: 0.7 },
  { key: "bog_ore", min: 2, max: 4, chance: 0.55 },
  { key: "swamp_moss", min: 2, max: 4, chance: 0.5 },
  { key: "bones", min: 2, max: 4, chance: 0.5 },
  { key: "twine", min: 1, max: 3, chance: 0.4 },
];

// The chieftain's hut — barred until the site's haunts are dead, so it's allowed
// to be the richest thing on the boardwalk. Guaranteed Gorge Bone.
const LODGE_CHIEF_LOOT_TABLE: LootRollEntry[] = [
  { key: "gorge_bone", min: 1, max: 1, chance: 1.0 },
  { key: "moonsilver", min: 1, max: 2, chance: 0.6 },
  { key: "mirehide", min: 2, max: 3, chance: 0.8 },
  { key: "gloam_shard", min: 1, max: 3, chance: 0.5 },
  { key: "corpselight_trophy", min: 1, max: 1, chance: 0.4 },
  { key: "refined_trophy_uncommon", min: 1, max: 1, chance: 0.2 },
];

// Which epic pool a container draws from, keyed off the loot table it's already
// being rolled with — the table IS the POI's identity, so no call site has to
// carry (and none can get out of sync on) a separate tier argument.
function epicPoolFor(table: LootRollEntry[]): EpicPool {
  if (table === GREMLIN_SHACK_LOOT_TABLE) return EPIC_POOL_T1; // biome 1, minutes in
  if (table === CRYPT_LOOT_TABLE || table === LODGE_CHIEF_LOOT_TABLE) return EPIC_POOL_T3; // deepest content
  return EPIC_POOL_T2; // warren / shrine bowl / ordinary lodge hut
}


// ===== The Sunken Gorge — the Miretyrant's lair (biome 3 Phase 4d session 2) =====
//
// ONE lair per world (locked with the user), sealed until an Effigy of the
// Miretyrant is offered at its maw, and revealed on the map the moment that
// effigy is crafted — a 28000px world is far too big to hunt a single door in
// (the Duneshaper altars' clue system, same reasoning).
const GORGE_CLEAR_RADIUS = 300; // the standing POI exclusion — nothing wild scatters into the clearing
const GORGE_LIGHT_RADIUS = 150;
// Its interior lives in the same dead corner outside the world circle as the
// crypts, in its own rect BELOW CRYPT_REALM (which ends at y 2600) so the two
// can never touch. Geometry check, same as CRYPT_REALM's: the corner nearest
// world center is (2800, 4400), hypot(11200, 9600) ~= 14750 px from
// (WORLD_CX, WORLD_CY) — outside WORLD_RADIUS (14000), so no sampler can reach
// it and drawWorldBoundary already paints it near-black.
// Moved to the TOP-RIGHT dead corner now that the crypts fill the top-left one.
// Same geometry check: its inner corner (24100, 3800) is hypot(10100, 10200) =
// 14355 from world center, outside WORLD_RADIUS.
const LAIR_REALM = { x: 24100, y: 200, w: 2600, h: 1700 };
// Surface doors into that one interior (see MiretyrantLair.maws).
const GORGE_MAW_COUNT = 2;
const GORGE_MAW_MIN_SPACING = 3000;
// Approach + arena (locked): a short descent, then one big room. The arena is
// FORCED to this cell size rather than rolled — a 2.6x boss, its adds and the
// room to dodge in do not fit in a random 8-12 cell room.
const LAIR_ROOMS = 4; // the arena + 3 approach rooms
const LAIR_ARENA_CELLS = { cw: 26, ch: 18 }; // 832 x 576 px
const LAIR_ADD_SPAWN_INSET = 60; // adds surface this far inside the arena walls

// The main gameplay scene: build the world, spawn the player and resources,
// follow the camera, and run the mouse-driven interaction + HUD.
export class MainScene extends Phaser.Scene {
  private player!: Player;
  private biome!: Biome; // forest (biome 1) zone layout, generated fresh each session
  // Patchwork worldgen (biome 2+): decides which biome type covers each outer
  // point (blob coverage + danger). `outerFeatureBiome` is one tiled Biome its
  // outer biomes reinterpret for their internal look. Both fresh per session.
  private worldBiomes!: WorldBiomes;
  private outerFeatureBiome!: Biome;
  // Current-biome HUD label + first-time discovery tracking.
  private biomeLabel?: Phaser.GameObjects.Text;
  private currentBiome: BiomeId | "base" = "forest";
  private discoveredBiomes = new Set<string>();
  private nodes: ResourceNode[] = [];
  // Subset of `nodes` that can visually occlude the player (trees/boulders —
  // see updateTreeOcclusion). Ground clutter (pickups/loose drops) never
  // occludes, so it's excluded up front rather than filtered every frame.
  private obstacleNodes: ResourceNode[] = [];
  private skills = new Skills();
  private progression = new PlayerProgression();
  private crafting = new Crafting();
  // The single unified item pool. Resources and crafted items alike live here
  // as stacks; the hotbar is a second container items move into. `discovered`
  // records every item key ever added (drives recipe discovery).
  private backpack = new ItemContainer(BACKPACK_CAPACITY);
  private discovered = new Set<string>();
  // Which StationUpgradeDef.id's have already had their "New Upgrade
  // Unlocked!" toast fired — upgrades live outside the Recipe/Crafting
  // system, so they need their own one-shot discovery tracking (mirrors
  // Crafting's internal discoveredIds, just for a different data table).
  private discoveredUpgradeIds = new Set<string>();
  // Which TOOL_UPGRADES.id's have had their "New Upgrade Unlocked!" toast fired.
  // Tool upgrades (ToolUpgrades.ts) live outside the Recipe/Crafting system too,
  // so they need the same one-shot discovery tracking as discoveredUpgradeIds —
  // a separate set only because they use a different data table (mirrors it).
  private discoveredToolUpgradeIds = new Set<string>();
  // Weapon + armor upgrades (WeaponUpgrades.ts / ArmorUpgrades.ts). These were
  // the ONLY upgrade tables with no discovery announcement at all — a whole
  // progression axis the player could finish a run without ever learning about
  // (the user playtest: "I never got any weapon upgrade unlocks"). Same one-shot
  // pattern; one set for both since ids are unique across the two tables.
  private discoveredGearUpgradeIds = new Set<string>();
  // Run-scoped epic-loot pity. A scene field rather than module state so
  // scene.restart() can't carry a half-full counter into the next run.
  private epicPity = new EpicPity();
  // Every epic key already placed into SOME world container this run. One copy
  // of each unique per run — see rollContainerLoot for why player-ownership
  // alone can't enforce that.
  private epicsGranted = new Set<string>();
  // Bosses that have already played their intro card this run.
  private announcedBosses = new Set<Enemy>();
  // Phase-3 Miretyrant arena hazard (see updateMiretyrantBellow). Permanent for
  // the fight — the arena closing in IS the phase.
  private mirePools: { x: number; y: number; image: Phaser.GameObjects.Image }[] = [];
  // Active Mosswretch spore clouds (C2) — surface hazards with an expiry, unlike
  // the boss-arena mire pools which live for the whole fight.
  private sporeClouds: { x: number; y: number; expiresAt: number; image: Phaser.GameObjects.Image }[] = [];
  // Cook recipes (Cooking.ts) discovered so far — one-shot "New Recipe
  // Unlocked!" toast tracking, same as discoveredUpgradeIds but for the cook
  // table. Tier-0 dishes unlock on first campfire placement; tier-1 on upgrade.
  private discoveredCookRecipeIds = new Set<string>();
  // Highest-tier campfire ever placed/upgraded; -1 = none placed yet. Gates
  // announceCookRecipes() alongside ingredient discovery.
  private campfireMaxTierSeen = -1;
  // The single tool the player currently has "out". Driven by the selected
  // hotbar slot.
  private equippedTool: ToolType | null = null;
  // Upgrade tier of the equipped tool's hotbar stack (0 = base). Gates felling
  // higher-hardness nodes like the badlands Ironbark tree (needs an upgraded axe).
  private equippedToolTier = 0;
  private equippedWeapon: WeaponType | null = null;
  private equippedWeaponName: string | null = null;
  private equippedWeaponTier = 0;
  // Summed gem-augment effect of the currently-equipped weapon instance (biome 3
  // Phase 3). Cached at the same chokepoint equippedWeaponTier is (recomputeEquipped)
  // so the per-swing hooks never re-walk the stack.
  private equippedWeaponAugment: AugmentEffect = {};
  private attackRangeRing!: Phaser.GameObjects.Graphics;
  // Outline drawn around whatever's hovered, redrawn each frame in
  // updateHover() — gated on the SAME prompt string the bottom-right text
  // uses, so it never reveals anything the prompt-gating design hides (no
  // tool equipped -> no highlight, out of reach -> no highlight, etc).
  private hoverHighlight!: Phaser.GameObjects.Graphics;
  private hotbar = new Hotbar();
  private equipment = new Equipment();
  private eventLog = new EventLog();
  private craftingMenu!: CraftingMenu;
  // Tracks the last-seen Workbench-proximity result while the crafting menu
  // is open, so it can re-render (and clear/set the "Requires a nearby
  // Workbench" line + affordability) the instant the player walks in or out
  // of range, instead of only reflecting proximity as of when the menu opened.
  private craftingMenuLastNearWorkbench: boolean | null = null;
  private inventoryMenu!: InventoryMenu;
  private dryingRackMenu!: DryingRackMenu;
  // Placed Drying Racks + their live processing state. Parallel to
  // placedObjects (the racks' images live there too, tagged "drying_rack"),
  // but paired with a ProcessingStation each so update() can tick them and the
  // menu can bind to whichever one the player opened.
  private dryingRacks: { image: Phaser.GameObjects.Image; station: ProcessingStation }[] = [];
  private openRack: ProcessingStation | null = null; // the rack/smelter the menu is bound to
  private hoveredRack: Phaser.GameObjects.Image | null = null;
  // Smelter (biome 2 Phase 4) — same "image + ProcessingStation" pairing as the
  // Drying Rack. Reuses the SAME dryingRackMenu instance (both are processing
  // stations); openStationKind switches its title/verb/fuel + process behavior.
  private smelters: { image: Phaser.GameObjects.Image; station: ProcessingStation }[] = [];
  private hoveredSmelter: Phaser.GameObjects.Image | null = null;
  private openStationKind: "rack" | "smelter" = "rack";
  // A placed Workbench, hovered — clicking it opens the combined crafting
  // menu directly (mirrors the Drying Rack's click-to-open, per playtest
  // feedback). No dedicated array like dryingRacks/gremlinShacks since a
  // Workbench has no per-instance state beyond what placedObjects already
  // carries — sourced by filtering placedObjects by itemKey each hover pass.
  private hoveredWorkbench: Phaser.GameObjects.Image | null = null;
  // A placed Campfire, hovered — clicking it opens the cooking menu. Same
  // sourced-from-placedObjects-by-itemKey approach as hoveredWorkbench (no
  // per-instance state beyond the tier placedObjects already carries).
  private hoveredCampfire: Phaser.GameObjects.Image | null = null;
  private cookingMenu!: CookingMenu;
  private openCampfire: Phaser.GameObjects.Image | null = null; // the campfire the cooking menu is bound to
  // Gemwright's Table (B3-P2b) — a placed jewelry station, same placedObjects-
  // by-itemKey hover/menu shape as the Campfire.
  private hoveredJewelry: Phaser.GameObjects.Image | null = null;
  private jewelryMenu!: JewelryMenu;
  private openJewelry: Phaser.GameObjects.Image | null = null; // the table the jewelry menu is bound to
  // Jewelry (ring/amulet) passive effects — recomputed on every equipment
  // change (afterItemMove) + reset per run (create).
  private equipEffects = new EquipmentEffects();
  // Relic Forge (M-RL) — trophies -> RNG relics + combine. Same
  // sourced-from-placedObjects-by-itemKey hover/open shape as the Campfire.
  private relics!: RelicManager;
  private relicForgeMenu!: RelicForgeMenu;
  private passiveBarUI!: PassiveBarUI;
  private hoveredForge: Phaser.GameObjects.Image | null = null;
  private openForge: Phaser.GameObjects.Image | null = null; // the forge the relic menu is bound to
  private lastRollTrophyKey?: string; // for the deferred reveal's event-log icon
  // Phase 5: set when a roll's family conflict is "ambiguous" (see Relics.ts)
  // — RelicManager left ownership untouched until resolveRelicFamilyChoice
  // resolves it via the forge menu's Keep New / Keep Old prompt.
  private pendingRelicChoice: RollResult | null = null;
  // Gremlin Shack POI (world-gen-placed, not player-placed) — parallel array
  // to dryingRacks, same "image + live state" pairing shape.
  private gremlinShacks: GremlinShack[] = [];
  private chestMenu!: ChestMenu;
  private openChest: ItemContainer | null = null; // the shack.loot.items currently bound to chestMenu
  private hoveredShack: GremlinShack | null = null;
  // Boss Altar + Gremlin King — altarPosition is chosen once in create(),
  // before spawnGremlinShacks() runs, so the shack/decoration/enemy density
  // gradient can bias toward it.
  private altarPosition: { x: number; y: number } | null = null;
  private bossAltars: BossAltar[] = [];
  private hoveredAltar: BossAltar | null = null;
  // War Camp brazier world positions (M-WC) — decorative lit props around the
  // altar that emit night light via collectLights(). Reset per run in create()
  // (scene.restart doesn't re-run field initializers).
  private campLightPoints: { x: number; y: number }[] = [];
  private gremlinKing: GremlinKing | null = null;

  // The Duneshaper (biome 2 Phase 3) — the badlands FINAL BOSS + new
  // win-condition. Several tyrant altars scatter the badlands (so one is
  // reachable); the boss is summoned once per run by offering an Effigy of the
  // Duneshaper at any of them. tyrantAltarPositions is chosen in create() before
  // spawning (so a clear-radius exclusion keeps content off them);
  // tyrantAltarsRevealed gates the one-time reveal-all-altars clue on totem
  // craft. All reset per run in create() (scene.restart field-init gotcha).
  private duneshaper: Duneshaper | null = null;
  private tyrantSummoned = false;
  private tyrantAltarPositions: { x: number; y: number }[] = [];
  private tyrantAltarsRevealed = false;
  private tyrantAltarLightPoints: { x: number; y: number }[] = [];
  // Gloaming Vein POI — chosen once in create() (after altarPosition, so it can
  // steer clear of the war camp). Its ore nodes start shielded and are cracked
  // open when the Gloamwarden dies. veinLightPoints glow purple at night
  // (collectLights). All reset per run in create() (scene.restart field-init gotcha).
  private veinPosition: { x: number; y: number } | null = null;
  private gloamingVeinNodes: ResourceNode[] = [];
  private gloamwarden: Gloamwarden | null = null;
  private veinCracked = false;
  private veinRespawnAt: number | null = null; // S4: armed once fully cleared (guardian dead + ore mined)
  private veinDiscoveredOnMap = false;
  private veinLightPoints: { x: number; y: number }[] = [];

  // Phase 1 (terrain-that-matters) + macro-zones. badlandsZones: a handful of LARGE
  // themed sub-zones (boulderfield = dense grey rock formations the player/enemies
  // collide with; thornfield = dense brambles that slow + dense flora) that content
  // keys off, so the badlands reads as distinct PLACES not uniform scatter (the user).
  // obstaclePositions: every solid rock body's footprint (recorded so wild spawns
  // avoid them). currentRegenMult caches this frame's HP-regen multiplier
  // from environmentEffectAt (dormant in biome 2 — wired for biome-3 miasma). All
  // reset per run (scene.restart field-init gotcha).
  private badlandsZones: BadlandsZone[] = [];
  // Biome-3 miasma zones (see BayouZone) — the bayou's environmental hazard.
  private bayouZones: BayouZone[] = [];
  private obstaclePositions: { x: number; y: number; r: number }[] = [];
  // 1 = normal healing, 0 = fully suppressed, 0.5 = the poison/miasma penalty.
  // Cached each frame so every regen consumer (food buffs, Comfort) reads one
  // value and a new suppression source only has to fold in below.
  private currentRegenMult = 1;

  // Duskrunner Warrens (biome 2 Phase 3) — two-wave destructible den POIs.
  private badlandsDens: BadlandsDen[] = [];
  private hoveredDen: BadlandsDen | null = null;
  private denLightPoints: { x: number; y: number }[] = [];

  // Sunken Forge POIs (biome 2 Phase 3 POI 2) — SEVERAL badlands landmarks, each
  // guarded by a Cinderwrought mini-boss (the user: "way more of the ember POIs").
  // Positions chosen once in create() (after the vein, so they steer clear of it
  // and the camp). Each forge has shielded ember-ore nodes that crack open when
  // its Cinderwrought dies (a smelting/metal material payoff — the mineable thing
  // "here after we kill him"). forgeLightPoints glow ember at night (collectLights).
  // All reset per run in create() (scene.restart field-init gotcha).
  private forgePositions: { x: number; y: number }[] = [];
  private forges: {
    x: number;
    y: number;
    bosses: Cinderwrought[]; // two Cinderwroughts guard each forge (the user)
    oreNodes: ResourceNode[];
    cracked: boolean;
    discoveredOnMap: boolean;
    respawnAt: number | null; // S4: armed once fully cleared (bosses dead + ore mined)
  }[] = [];
  private forgeLightPoints: { x: number; y: number }[] = [];

  // Sunken Crypts (biome 3 Phase 4c — the dungeon mechanic). Surface entrances
  // scattered through the bayou; interiors prebuilt at create() time in the
  // CRYPT_REALM pocket (see that constant's note). `activeCrypt` is the one the
  // player is currently inside — it gates the world systems that must not run
  // in a dungeon (map reveal, surface respawns, the day/night sky). All reset
  // per run in create() (scene.restart field-init gotcha).
  private cryptPositions: { x: number; y: number; theme: CryptTheme }[] = [];
  private crypts: SunkenCrypt[] = [];
  private activeDungeon: DungeonInterior | null = null;
  private cryptReturn: { x: number; y: number } | null = null;
  // Enemies living inside crypts, excluded from the surface respawn budget so
  // ~60 dungeon dwellers can't eat RESPAWN_MAX_LIVE and starve the overworld.
  private cryptEnemies = new Set<Enemy>();
  private cryptLightPoints: { x: number; y: number }[] = [];
  // Committed nav waypoint per chasing crypt dweller (see steerCryptEnemy).
  private cryptNav = new Map<Enemy, { x: number; y: number; at: number }>();
  private hoveredCrypt: SunkenCrypt | null = null;
  private hoveredCryptExit: DungeonInterior | null = null;
  private hoveredCryptChest: SunkenCrypt | null = null;

  // Bayou surface POIs (biome 3 Phase 4d). Positions are picked in create()
  // before any spawning so their clear radii can keep wild content out of each
  // site (the standing "POI busy = missing exclusion zone" rule). All reset per
  // run in create() (scene.restart field-init gotcha).
  private shrinePositions: { x: number; y: number }[] = [];
  private shrines: SunkenShrine[] = [];
  private shrineLightPoints: { x: number; y: number }[] = [];
  private hoveredShrine: SunkenShrine | null = null;
  // The Sunken Gorge (Phase 4d session 2) — the Miretyrant's lair. One per
  // world; its position is picked in create() before spawning like every other
  // POI, and its interior is prebuilt in LAIR_REALM alongside the crypts.
  private gorgePosition: { x: number; y: number } | null = null;
  // Every surface maw leading to the single lair interior.
  private gorgePositions: { x: number; y: number }[] = [];
  private lair: MiretyrantLair | null = null;
  private gorgeLightPoints: { x: number; y: number }[] = [];
  // The hovered maw, not just the lair: there are TWO doors into the one
  // interior, and reach/highlight have to be measured against whichever one the
  // cursor is actually on (see promptForGorge).
  private hoveredGorge: { lair: MiretyrantLair; maw: MiretyrantLair["maws"][number] } | null = null;
  private lairRevealed = false; // crafting the effigy puts the maw on the map, once
  private miretyrant: Miretyrant | null = null;
  private lodgePositions: { x: number; y: number }[] = [];
  private lodges: DrownedLodge[] = [];
  private lodgeLightPoints: { x: number; y: number }[] = [];
  // A lodge hover resolves to ONE hut, not the site — each hut is its own cache.
  private hoveredLodgeHut: { lodge: DrownedLodge; hut: DrownedLodge["huts"][number] } | null = null;
  // Right-click "Upgrade / Destroy" popup for any placed object (Workbench,
  // Campfire, Drying Rack, ...) — a single generic system, not per-type.
  private contextMenu!: ContextMenu;
  // Full-page panel opened by the context menu's "Upgrade" button, listing
  // every discovered upgrade for whichever placed object is currently bound
  // to it (null when closed).
  private upgradeMenu!: UpgradeMenu;
  private characterMenu!: CharacterMenu;
  // Either a placed object (Workbench/Campfire/Drying Rack), an equipped
  // armor slot, or a gear item (weapon/tool/armor) sitting in a container
  // (backpack/hotbar) slot — the UpgradeMenu deps below branch on which one is set.
  private upgradeTarget:
    | Phaser.GameObjects.Image
    | { armorSlot: EquipSlot }
    | { gearSlot: { container: ItemContainer; index: number } }
    | null = null;
  // The floating "<Name> Lvl N" label shown above any placed object that has
  // at least one defined upgrade (see StationUpgrades.ts) — keyed by the
  // placed Image so it can be moved/updated/destroyed alongside it.
  private placedLabels = new Map<Phaser.GameObjects.Image, Phaser.GameObjects.Text>();
  // A floating gold "▲" over any placed station that has an affordable,
  // not-yet-applied upgrade ready (S3) — keyed by the placed Image like
  // placedLabels, each with its own looping fade tween (killed on destroy).
  private placedUpgradeGlyphs = new Map<
    Phaser.GameObjects.Image,
    { text: Phaser.GameObjects.Text; tween: Phaser.Tweens.Tween }
  >();
  private hotbarUI!: HotbarUI;
  private eventLogUI!: EventLogUI;
  private keybindsUI!: KeybindsUI;
  private fog!: FogOfWar;
  private exploredMap!: ExploredMap;
  private minimapUI!: MinimapUI;
  private worldMapUI!: WorldMapUI;
  private bossHealthUI!: BossHealthUI;

  // Active drag (from any container): the source slot + a floating ghost icon.
  private dragSource: { container: ItemContainer; index: number } | { armorSlot: EquipSlot } | null = null;
  private dragGhost: Phaser.GameObjects.Image | null = null;

  // Double-left-click-in-place detection (backpack/hotbar quick-move — right-
  // click is reserved for context-menu/upgrade actions now, see resolveItemDrag).
  // `key` identifies a slot (e.g. "bag:5"/"hotbar:2"); a second click-in-place
  // on the same key within DOUBLE_CLICK_MS counts as a double-click.
  private lastClickKey: string | null = null;
  private lastClickAt = -Infinity;
  // A single click on a backpack placeable defers entering placement mode by
  // this same window, so a following double-click quick-moves the item
  // instead of arming placement mode first (which would then reference a
  // stale backpack slot once the item's moved to the hotbar).
  private pendingSingleClick: Phaser.Time.TimerEvent | null = null;
  private static readonly DOUBLE_CLICK_MS = 350;

  private promptText!: Phaser.GameObjects.Text; // fixed bottom-right hover prompt
  private statPointsBadge!: Phaser.GameObjects.Text; // top-right, bobbing "N Stat Points Available!" nudge
  private hoveredNode: ResourceNode | null = null;
  private hoveredEnemy: Enemy | null = null;
  private lastToolHitAt = 0; // this.time.now of the last successful chop/mine hit
  private lastWeaponHitAt = 0; // mirrors lastToolHitAt, separate clock for weapon swings
  private stamina = new Stamina();
  private staminaBarBg!: Phaser.GameObjects.Rectangle;
  private staminaBarFill!: Phaser.GameObjects.Rectangle; // fixed HUD bar, centered above the hotbar
  private staminaBarText!: Phaser.GameObjects.Text; // numeric current-stamina label inside the bar
  // Whether loose drop pieces auto-fly to the player when in range. Toggled
  // with V; doesn't affect pre-placed branches/rocks (always manual).
  private magnetEnabled = true;
  private rangeRingEnabled = false;
  // Whether the scroll wheel cycles across both hotbar rows (default, per the
  // user) or loops within just the currently-selected row. Toggled with H.
  private wheelSpansBothRows = true;

  // --- Combat ---
  private enemies: Enemy[] = [];
  private enemyGroup!: Phaser.Physics.Arcade.Group;
  // Enemy-fired projectiles (the ranged Gremlin's rock throw) vs. player-fired
  // ones (Slingshot/Javelin) — separate groups since each overlaps a
  // different target (player vs. enemyGroup).
  private enemyProjectiles!: Phaser.Physics.Arcade.Group;
  private playerProjectiles!: Phaser.Physics.Arcade.Group;
  private health = new Health();
  // Timed player buffs (heal-over-time from eating cooked food today) + their
  // HUD strip above the HP bar. See Buffs.ts / BuffBarUI.ts.
  private buffs = new BuffManager();
  private bleed = new BleedManager();
  private poison = new PoisonManager();
  private buffBarUI!: BuffBarUI;
  private statusBarUI!: StatusBarUI;
  // This frame's environmental movement multiplier (<1 = slowed). Cached beside
  // currentRegenMult purely so the status HUD can report WHY you're slow.
  private currentEnvMoveMult = 1;
  private healthBarBg!: Phaser.GameObjects.Rectangle;
  private healthBarFill!: Phaser.GameObjects.Rectangle;
  private healthShieldFill!: Phaser.GameObjects.Rectangle; // Leech (Mythic) absorb overlay
  private healthBarText!: Phaser.GameObjects.Text;
  private xpBarBg!: Phaser.GameObjects.Rectangle;
  private xpBarFill!: Phaser.GameObjects.Rectangle; // player-level XP bar, under the hotbar
  private xpBarText!: Phaser.GameObjects.Text; // "Lvl N" label inside the XP bar
  private isDead = false;
  private invulnerableUntil = 0; // this.time.now threshold; incoming damage skipped before this
  private rangedFireSlowUntil = 0; // anti-kite: briefly slowed after firing a ranged weapon
  private readonly RESPAWN_DELAY_MS = 2000;
  private readonly POST_RESPAWN_INVULN_MS = 1500;

  // --- relic unique-proc state (2026-07-15 redesign; all reset in create()) ---
  private onslaughtHits = 0; // Onslaught (damage): attack counter for the every-Nth-hit bonus
  private killMoveBurstUntil = 0; // Fleetfoot (move): burst end timestamp
  private killMoveBurstPct = 0; //   ...and its move-speed bonus as a fraction (0.25 = +25%)
  private guardianReadyAt = 0; // Guardian (defense): next time the hit-negate is ready
  private freeAttackUntil = 0; // Second Wind (stamina, Mythic): zero-cost attacks until this ts
  private playerShield = 0; // Leech (lifesteal, Mythic): overheal-banked absorb, consumed before HP
  private undyingReadyAt = 0; // Undying (vitality, Rare): next time the low-HP emergency heal is ready
  private reviveUsed = false; // Undying (vitality, Mythic): once-per-run fatal-hit save spent
  private killStreak = 0; // Prodigy (xp): consecutive-kill counter
  private lastKillAt = 0; //   ...and the last kill's timestamp (streak window)

  // --- B3-P2a activated-ability state (all reset in create()) ---
  private abilityBarUI!: AbilityBarUI;
  private abilityByKey: Partial<Record<AbilityKey, AbilityId>> = {}; // equipped special slots -> Q/E/R
  private abilityReadyAt: Record<AbilityKey, number> = { q: 0, e: 0, r: 0 }; // per-key cooldown gate (time.now)
  private bloodpactUntil = 0; // Bloodpact (R) lifelink active window — resolveWeaponHit heals during it
  // Snapshotted at cast so a variant's `power` is baked into the window that's
  // actually running, rather than re-read (and possibly re-scaled by a gear swap)
  // on every hit mid-window.
  private bloodpactLifelink = ABILITY_BLOODPACT_LIFELINK_PCT;
  // Per-swing lifesteal cap (D2, the 2026-07-23 "god run" fix — see
  // budgetedSwingHeal below for the full explanation). Reset/armed inside
  // resolveWeaponHit; no scene.restart() reset needed since a fresh swing
  // re-arms them regardless of leftover state from the previous run.
  private swingHealBudget = 0;
  private swingHealCapArmed = false;
  private swingHealApplied = 0;
  private aegisUntil = 0; // Drowned Aegis (found-only) damage-reduction window
  private hasteUntil = 0; // Bloodrush attack-speed window
  private hasteMult = 1; // cooldown multiplier while that window is open
  private aegisReduction = 0; // fraction cut while that window is open

  // Active full armor-set bonuses (biome 2 Phase 4 forged gear). Recomputed on
  // every equipment change (afterItemMove) + on run reset (create). Read at the
  // relevant combat hook points via hasSet(). Effect magnitudes are the SET_*
  // constants below, kept next to where they apply.
  private activeSetIds: Set<SetId> = new Set();

  // Run/score meta-loop (M-R1). `run` tracks elapsed time + kills + score;
  // `runOver` freezes the world once the run-end screen is up.
  private run!: Run;
  private runLog!: RunLog;
  private runHudUI!: RunHudUI;
  private runEndUI!: RunEndUI;
  private runOver = false;
  // Playtest escape hatch: after winning (the current end-game boss kill), the
  // run-end screen offers "Continue" so the player can keep exploring past the
  // finished target into in-progress content. `inProgressMode` drives a persistent
  // on-screen caveat while active. Death is UNAFFECTED — a hardcore death still
  // ends the run (see onPlayerDeath); Continue only skips the forced New Run.
  private inProgressMode = false;
  private inProgressBanner: Phaser.GameObjects.Text | null = null;

  // Contextual hint system (tip popups) + pause overlay. `hints` resets each
  // run (fresh instance in create()); its on/off preference persists. `isPaused`
  // freezes the sim + input while the pause menu is up (Esc).
  private hints = new HintManager();
  private hintUI!: HintUI;
  private pauseMenu!: PauseMenuUI;
  // First-launch welcome/how-to-play overlay. Reuses the same isPaused
  // freeze as the pause menu (see openWelcome/closeWelcome) rather than a
  // parallel freeze flag. It's shown once automatically at the start of
  // every run (see ALWAYS_SHOW_EACH_LOAD in WelcomeUI.ts), which is why the
  // pause menu no longer has its own "How to Play" re-entry point — the
  // Tips panel below is the re-readable reference instead.
  private welcomeUI!: WelcomeUI;
  // Run-start character picker (B4-P1) + the chosen character. `character` is a
  // neutral RunCharacter(null) until a card is confirmed, so every modifier hook
  // reads a harmless 1x if the picker is ever bypassed. Reset per run in
  // create() (scene.restart field-init gotcha).
  private characterSelectUI!: CharacterSelectUI;
  private character = new RunCharacter();
  // Pause menu's "Tips" panel — re-readable list of hints discovered this run.
  private tipsUI!: TipsUI;
  // Procedural SFX layer — deliberately NOT re-created in create() (unlike
  // `hints` above): the AudioContext + on/off preference should survive a
  // "New Run" restart, not reset with the rest of per-run state.
  private sfx = new SfxPlayer();
  private isPaused = false;

  // Day/night cycle (M-DN). dayNight is the clock; nightOverlay the darkness +
  // torch-light layer. wasNight tracks the previous frame's phase so the scene
  // can fire the day->night surge and night->day cleanup on the exact edge.
  // nightSpawns holds enemies added by a nightfall surge so they can be culled
  // at dawn (density returns to baseline each morning). equippedLightRadius is
  // the current held-light-source radius (Torch, future Lantern) in world px.
  private dayNight!: DayNight;
  private nightOverlay!: NightOverlayUI;
  // Camera-locked speckle overlay: a viewport-sized TileSprite (constant memory —
  // a world-sized one OOMs) tiling `ground_speckle`, its tilePosition synced to
  // the camera scroll each frame so the specks read as world-locked ground grain
  // over the smooth outer overlay. See buildSpeckleLayer / syncSpeckleLayer.
  private speckleLayer!: Phaser.GameObjects.TileSprite;
  // Zoom-1 HUD camera paired with the zoomed main/world camera (see setupCameras).
  private uiCam!: Phaser.Cameras.Scene2D.Camera;
  private wasNight = false;
  private nightSpawns: Enemy[] = [];
  private equippedLightRadius = 0;
  // Accumulates frame delta toward the next fog-top-up respawn check (see
  // updateRespawns / RESPAWN_TICK_MS). Reset each run.
  private respawnAccumMs = 0;
  // World objects currently held OUT of the scene display list because they're
  // far from the player (see updateSceneStreaming). They keep existing — bodies,
  // state, everything — they just aren't rendered or iterated.
  private streamedOut: Phaser.GameObjects.GameObject[] = [];
  private nextStreamAt = 0;

  // Placement mode: crafting a placeable recipe (e.g. campfire) enters this
  // instead of landing in the backpack. A ghost preview follows the cursor,
  // clamped to PLACEMENT_RADIUS of the player; LMB commits (deducts cost,
  // spawns a world object), RMB cancels for free (nothing was spent yet).
  // `itemSource` is set when placement was armed from an owned stack (a
  // station recovered via Destroy, re-placed from the backpack/hotbar) — each
  // placement consumes one of that item instead of the recipe's ingredients.
  private placementMode:
    | { recipe: Recipe; itemSource?: { container: ItemContainer; key: string } }
    | null = null;
  private placementGhost: Phaser.GameObjects.Image | null = null;
  private placedObjects: Phaser.GameObjects.Image[] = [];
  // Sticky flag — true forever once the player has placed a Workbench at
  // least once, even if it's later destroyed. Recipe *discovery* (visibility)
  // should never re-lock on destroy, only current-proximity checks
  // (isNearWorkbench/isNearWorkbenchAtTier) should track the live placedObjects state.
  private everPlacedWorkbench = false;
  // Highest Workbench tier the player has EVER reached (via placement or an
  // upgrade), sticky like everPlacedWorkbench. Gates *discovery* of
  // requiresWorkbenchTier recipes (Sunsteel etc.) so they don't appear until
  // the bench has actually been upgraded to that level — separate from the
  // live isNearWorkbenchAtTier proximity check that gates crafting them.
  private everMaxWorkbenchTier = 0;
  // DEV-only playtest cheats, toggled via the window.__dev console commands
  // (installDevConsole) — gated to DEV builds only, never reachable in prod.
  private devGodMode = false;
  private devNoBuildCost = false;
  private devConsoleInstalled = false;
  private placementHintText!: Phaser.GameObjects.Text; // bottom-right, stacked above promptText
  // The "Place" button click that enters placement mode fires through to the
  // scene's global pointerdown too (same underlying click) — swallow that one
  // event so it isn't also read as the first placement click.
  private suppressNextPointerdown = false;

  constructor() {
    super("MainScene");
  }

  create(): void {
    // Reset per-run state up front — scene.restart() (New Run) re-runs create()
    // on the same instance, so field initializers (booleans, `= []`/`new Map()`
    // collections, and system objects like Skills/Inventory) don't re-fire and
    // would otherwise carry stale values/destroyed-object references into the
    // new run. This was previously only done for runOver/isDead/run, which left
    // this.enemies/this.nodes/etc. full of references to GameObjects destroyed
    // by the scene shutdown — iterating them in update() threw and froze the
    // game the instant "New Run" was clicked. Reset every per-run field here so
    // "New Run" is the clean full reset the design always intended.
    clearVariantCache();
    this.runOver = false;
    this.isDead = false;
    this.inProgressMode = false;
    this.inProgressBanner = null;
    // Hints: fresh per-run "already shown" state (the on/off pref persists in
    // localStorage inside HintManager). Pause: clear the flag + defensively
    // un-freeze physics/clock in case New Run was clicked from the pause menu.
    this.hints = new HintManager();
    this.isPaused = false;
    this.physics.world.resume();
    this.time.paused = false;
    this.run = new Run();
    // Per-run attribution for the end-of-run summary. Fresh instance per run,
    // same scene.restart() field-init rule as everything else in this block.
    this.runLog = new RunLog();
    // No character until this run's picker is confirmed — neutral modifiers.
    this.character = new RunCharacter();
    // Day/night resets to dawn each run (M-DN). NightOverlayUI is a GameObject,
    // rebuilt in createHud() on every create(), so only the plain-object clock
    // + edge tracker + surge list need resetting here (scene.restart() gotcha).
    this.dayNight = new DayNight();
    this.wasNight = false;
    this.nightSpawns = [];
    this.equippedLightRadius = 0;
    this.respawnAccumMs = 0;
    // scene.restart() destroys every GameObject, so any streamed-out refs from
    // the previous run are dead — drop them rather than re-adding corpses.
    this.streamedOut = [];
    this.nextStreamAt = 0;

    this.nodes = [];
    this.obstacleNodes = [];
    this.skills = new Skills();
    this.progression = new PlayerProgression();
    this.crafting = new Crafting();
    this.backpack = new ItemContainer(BACKPACK_CAPACITY);
    this.discovered = new Set<string>();
    this.discoveredUpgradeIds = new Set<string>();
    this.discoveredToolUpgradeIds = new Set<string>();
    this.discoveredGearUpgradeIds = new Set<string>();
    this.epicPity = new EpicPity();
    this.epicsGranted = new Set<string>();
    this.announcedBosses = new Set();
    this.mirePools = [];
    this.sporeClouds = [];
    this.discoveredCookRecipeIds = new Set<string>();
    this.campfireMaxTierSeen = -1;
    this.equippedTool = null;
    this.equippedWeapon = null;
    this.equippedWeaponName = null;
    this.equippedWeaponTier = 0;
    this.equippedWeaponAugment = {};
    this.hotbar = new Hotbar();
    this.equipment = new Equipment();
    // Let crafting count/consume EQUIPPED pieces toward recipe ingredients
    // (T2 reforge recipes take the base forged piece you may have worn).
    this.crafting.setEquipment(this.equipment);
    // ...and count/consume items sitting in the hotbar too (weapons/tools live
    // there — e.g. a Sunsteel Pike a reforge consumes).
    this.crafting.setHotbar(this.hotbar.container);
    this.eventLog = new EventLog();
    this.craftingMenuLastNearWorkbench = null;
    this.dryingRacks = [];
    this.openRack = null;
    this.hoveredRack = null;
    this.smelters = [];
    this.hoveredSmelter = null;
    this.openStationKind = "rack";
    this.hoveredWorkbench = null;
    this.hoveredCampfire = null;
    this.openCampfire = null;
    this.hoveredJewelry = null;
    this.openJewelry = null;
    this.equipEffects = new EquipmentEffects();
    this.relics = new RelicManager();
    this.hoveredForge = null;
    this.openForge = null;
    this.pendingRelicChoice = null;
    this.gremlinShacks = [];
    this.openChest = null;
    this.hoveredShack = null;
    this.altarPosition = null;
    this.bossAltars = [];
    this.hoveredAltar = null;
    this.campLightPoints = [];
    this.gremlinKing = null;
    this.duneshaper = null;
    this.tyrantSummoned = false;
    this.tyrantAltarPositions = [];
    this.tyrantAltarsRevealed = false;
    this.tyrantAltarLightPoints = [];
    this.veinPosition = null;
    this.gloamingVeinNodes = [];
    this.gloamwarden = null;
    this.veinCracked = false;
    this.veinRespawnAt = null;
    this.veinDiscoveredOnMap = false;
    this.veinLightPoints = [];
    this.badlandsZones = [];
    this.bayouZones = [];
    this.obstaclePositions = [];
    this.currentRegenMult = 1;
    this.currentEnvMoveMult = 1;
    this.badlandsDens = [];
    this.hoveredDen = null;
    this.denLightPoints = [];
    this.forgePositions = [];
    this.forges = [];
    this.forgeLightPoints = [];
    this.cryptPositions = [];
    this.crypts = [];
    this.activeDungeon = null;
    this.cryptReturn = null;
    this.cryptEnemies = new Set();
    this.cryptLightPoints = [];
    this.cryptNav = new Map();
    this.hoveredCrypt = null;
    this.hoveredCryptExit = null;
    this.hoveredCryptChest = null;
    this.shrinePositions = [];
    this.shrines = [];
    this.shrineLightPoints = [];
    this.hoveredShrine = null;
    this.gorgePosition = null;
    this.gorgePositions = [];
    this.lair = null;
    this.gorgeLightPoints = [];
    this.hoveredGorge = null;
    this.lairRevealed = false;
    this.miretyrant = null;
    this.lodgePositions = [];
    this.lodges = [];
    this.lodgeLightPoints = [];
    this.hoveredLodgeHut = null;
    this.upgradeTarget = null;
    this.placedLabels = new Map();
    this.placedUpgradeGlyphs = new Map();
    this.dragSource = null;
    this.dragGhost = null;
    this.lastClickKey = null;
    this.lastClickAt = -Infinity;
    this.pendingSingleClick = null;
    this.hoveredNode = null;
    this.hoveredEnemy = null;
    this.lastToolHitAt = 0;
    this.lastWeaponHitAt = 0;
    this.stamina = new Stamina();
    this.enemies = [];
    this.health = new Health();
    this.bleed = new BleedManager();
    this.poison = new PoisonManager();
    this.buffs = new BuffManager();
    // Comfort's "Resting" buff is exempt from this cap entirely (Buffs.ts
    // COMFORT_BUFF_ID) — it never has to fight a food buff for a slot. A run
    // character may override the food cap itself (the Ashcaller runs 3 food
    // buffs at once instead of 2) — applyCharacter re-applies it once chosen.
    this.buffs.setMaxBuffs(DEFAULT_MAX_BUFFS);
    this.invulnerableUntil = 0;
    this.rangedFireSlowUntil = 0;
    // Relic unique-proc state (2026-07-15) — reset per run (scene.restart gotcha).
    this.onslaughtHits = 0;
    this.killMoveBurstUntil = 0;
    this.killMoveBurstPct = 0;
    this.guardianReadyAt = 0;
    this.freeAttackUntil = 0;
    this.playerShield = 0;
    this.undyingReadyAt = 0;
    this.reviveUsed = false;
    this.killStreak = 0;
    this.lastKillAt = 0;
    this.activeSetIds = new Set();
    // B3-P2a ability state (scene.restart gotcha).
    this.abilityByKey = {};
    this.abilityReadyAt = { q: 0, e: 0, r: 0 };
    this.bloodpactUntil = 0;
    this.bloodpactLifelink = ABILITY_BLOODPACT_LIFELINK_PCT;
    this.aegisUntil = 0;
    this.hasteUntil = 0;
    this.hasteMult = 1;
    this.aegisReduction = 0;
    this.placementMode = null;
    this.placementGhost = null;
    this.placedObjects = [];
    this.everPlacedWorkbench = false;
    this.everMaxWorkbenchTier = 0;
    this.suppressNextPointerdown = false;
    // Per-run biome discovery state (reset here per the scene.restart() field-init gotcha).
    // Forest is pre-marked known — the player starts there, so the FIRST discovery
    // toast is a genuinely new region (the label still reads "Verdant Woods" at spawn).
    this.discoveredBiomes = new Set<string>(["forest"]);
    this.currentBiome = "forest";

    // Procedural biome layout — must exist before spawning so nodes/enemies
    // can query zone type for placement. Seeded randomly per session (not a
    // fixed string) so the world differs every run.
    this.biome = new Biome(BIOME_ORIGIN_X, BIOME_ORIGIN_Y, BIOME_SIZE, BIOME_SIZE, this.sessionRng());
    // Patchwork worldgen (biome 2+). Assigned here (not field initializers) so
    // scene.restart() re-seeds them. The outer feature Biome is TILED (origin 0)
    // so its mesa/flats/ravine pattern repeats across the whole outer world at a
    // sane scale instead of a giant Voronoi.
    this.outerFeatureBiome = new Biome(
      0,
      0,
      OUTER_FEATURE_SIZE,
      OUTER_FEATURE_SIZE,
      this.sessionRng(),
      true, // tiled
    );
    this.worldBiomes = new WorldBiomes(
      WORLD_CX,
      WORLD_CY,
      WORLD_RADIUS,
      this.biome,
      this.outerFeatureBiome,
      this.sessionRng(),
    );

    // War Camp position (M-WC) is chosen here, before ground/node/enemy
    // spawning, so pickSpawnPoint can keep trees/rocks/wild enemies out of the
    // camp interior (WAR_CAMP_CLEAR_RADIUS) and buildBiomeTexture can stamp a
    // distinct camp floor — both need to know where the camp is up front,
    // not after the world is already scattered.
    this.altarPosition = this.pickAltarPosition(this.sessionRng());
    // Gloaming Vein POI position — chosen after the altar so it can stay well
    // clear of the war camp, and before node/enemy spawning so pickSpawnPoint's
    // VEIN_CLEAR_RADIUS exclusion keeps ordinary content out of the ore clearing.
    this.veinPosition = this.pickVeinPosition(this.sessionRng());
    // Sunken Forge POI (biome 2 Phase 3 POI 2) — chosen after the vein (kept
    // clear of both it and the camp) and before any spawning so its own
    // FORGE_CLEAR_RADIUS exclusion in pickBadlandsPoint keeps ordinary badlands
    // content out of the forge clearing.
    this.forgePositions = this.pickForgePositions(this.sessionRng());
    // Duneshaper altars (biome 2 Phase 3 final boss) — several scattered badlands
    // altars, chosen before spawning so their TYRANT_ALTAR_CLEAR_RADIUS exclusion
    // in pickBadlandsPoint keeps ordinary content off the altar clearings.
    this.tyrantAltarPositions = this.pickTyrantAltarPositions(this.sessionRng());
    // Sunken Crypt entrances (biome 3 Phase 4c) — picked here, before any
    // spawning, so CRYPT_CLEAR_RADIUS keeps ordinary bayou content out of each
    // doorway's clearing (same reason every POI above picks its spot up front).
    this.cryptPositions = this.pickCryptPositions(this.sessionRng());
    // Bayou surface POIs (Phase 4d) — same rule again: chosen up front so their
    // clear radii are in force for every spawn pass below. After the crypts, so
    // a shrine/lodge can't land on a doorway.
    this.shrinePositions = this.pickBayouPoiPositions(
      this.sessionRng(),
      SHRINE_COUNT,
      SHRINE_MIN_SPACING,
      { avoidDeepWater: true },
    );
    // Lodges deliberately do NOT avoid deep water — a stilt village belongs over
    // a channel. That IS the POI: the boardwalk is the only safe footing.
    this.lodgePositions = this.pickBayouPoiPositions(
      this.sessionRng(),
      LODGE_COUNT,
      LODGE_MIN_SPACING,
      { avoidDeepWater: false, avoid: this.shrinePositions, avoidRadius: POI_MIN_SEPARATION },
    );
    // The Sunken Gorge (Phase 4d session 2) — last of the bayou POIs to be
    // placed, so it keeps clear of every other one; deep water avoided because
    // the maw is a hole in the ground, not a pool.
    // TWO maws into the one lair (see MiretyrantLair.maws) so the finale is
    // never a cross-map trek. Spaced like any other pair of POIs.
    this.gorgePositions = this.pickBayouPoiPositions(this.sessionRng(), GORGE_MAW_COUNT, GORGE_MAW_MIN_SPACING, {
      avoidDeepWater: true,
      avoid: [...this.shrinePositions, ...this.lodgePositions, ...this.cryptPositions],
      avoidRadius: POI_MIN_SEPARATION,
    });
    this.gorgePosition = this.gorgePositions[0] ?? null;

    // Ground: a repeating grass texture only over the FOREST REGION (biome 1),
    // where it shows through the translucent forest bake. A world-sized tilesprite
    // is impossible now — TileSprite allocates a canvas its own size, and 28000² is
    // ~3GB (out-of-memory). The outer patchwork paints its own base color (graded
    // grass->dust) in the overlay, so grass is only needed here in the core.
    const grass = this.add
      .tileSprite(BIOME_ORIGIN_X, BIOME_ORIGIN_Y, BIOME_SIZE, BIOME_SIZE, "grass")
      .setOrigin(0, 0)
      .setDepth(-9.4); // ABOVE the outer overlay (-9.5) so the feathered core shows through it
    // Outer patchwork ground: ONE bounded coarse overlay texture stretched over the
    // whole world (constant GPU cost at any world size), a continuous smooth base.
    this.bakeOuterOverlay();
    // Forest (biome 1) crisp bake on top — unchanged look; fades out past the
    // forest edge so it never paints over an outer biome.
    const forestRT = this.buildBiomeTexture();
    // Feather the crisp forest region (grass + forest bake) into the outer overlay
    // with a soft-disc bitmap mask, so their SQUARE edges no longer meet the
    // overlay as hard straight lines (the user). The mask disc is scaled to the
    // region square; it's opaque across the play area and fades to 0 by the edge.
    const feather = this.add
      .image(WORLD_CX, WORLD_CY, "forest_feather")
      .setVisible(false)
      .setDisplaySize(BIOME_SIZE, BIOME_SIZE);
    const featherMask = feather.createBitmapMask();
    grass.setMask(featherMask);
    forestRT.setMask(featherMask);
    // Circular world edge: a dark "void" ring beyond WORLD_RADIUS so the
    // playable area reads as a round island, not an invisible wall in open grass.
    this.drawWorldBoundary();

    // Fine ground grain over the WHOLE world (the outer badlands/dunes overlay is
    // a single smooth stretched texture with no detail; this gives it the same
    // speckle the forest gets from its `grass` tile). A camera-locked, viewport-
    // sized TileSprite — its tilePosition follows the camera scroll so the specks
    // sit still in world space, at constant GPU cost (a world-sized tilesprite
    // would OOM). Subtle enough to layer harmlessly over the forest + void too.
    this.buildSpeckleLayer();

    // Physics/camera bounds are the bounding square; the player is additionally
    // clamped to the world CIRCLE each frame (clampPlayerToWorld).
    this.physics.world.setBounds(0, 0, WORLD_W, WORLD_H);
    this.cameras.main.setBounds(0, 0, WORLD_W, WORLD_H);

    // Spawn the player in the middle and follow it smoothly.
    this.player = new Player(this, WORLD_W / 2, WORLD_H / 2);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameras.main.setZoom(WORLD_ZOOM);

    // Two-camera split so the world can zoom without dragging the HUD with it:
    // the main camera renders (and zooms) the world; a second, zoom-1 UI camera
    // renders the screen-locked HUD at native pixel scale. syncCameras() routes
    // every object to exactly one of them each frame (see its note).
    this.uiCam = this.cameras.add(0, 0, this.cameras.main.width, this.cameras.main.height);
    this.uiCam.setName("ui");

    // Reach preview ring — only drawn while a tool/weapon is equipped, kept
    // just above the ground and below entities (Milestone F).
    this.attackRangeRing = this.add.graphics().setDepth(-5);
    this.hoverHighlight = this.add.graphics();

    // Trees and boulders are solid; the player bumps into them.
    const solids = this.physics.add.staticGroup();
    this.spawnNodes(solids);
    // Badlands wild flora/minerals/nodes are spawned LATER (after placeBadlandsZones,
    // below) so they avoid the themed sub-zone cores — the zones own their content.
    this.physics.add.collider(this.player, solids);

    // Enemies: physical collision with solids and the player (separation
    // only — the actual bite trigger is manual distance math, matching how
    // REACH-based interaction already works).
    // `collideWorldBounds: true` here is required, not redundant with Enemy's
    // own setCollideWorldBounds(true) call — Arcade Group.add() re-applies the
    // group's defaults (collideWorldBounds: false unless set here) to every
    // member's body on add(), silently undoing whatever the entity's own
    // constructor set. Same class of gotcha as Projectile's velocity-zeroing
    // (see STATUS.md), just hitting a boolean instead of a vector.
    this.enemyGroup = this.physics.add.group({ collideWorldBounds: true });
    this.spawnEnemies();
    this.spawnGremlinShacks();
    this.spawnAltarDensity();
    this.spawnWarCamp();
    this.spawnBossAltar();
    this.spawnGloamingVein();
    this.spawnSunkenForges(); // biome 2 Phase 3 POI 2 — the Cinderwrought mini-boss landmarks
    this.spawnBadlandsDens(); // biome 2 Phase 3 POI — before wild packs so den clearings stay clear
    this.spawnTyrantAltars(); // biome 2 Phase 3 — the badlands final-boss altars
    // Macro-zones (the user): place a few LARGE themed sub-zones after every POI,
    // stamp their ground decals + dense props, THEN spawn the wild badlands content
    // — which now avoids zone cores (subZoneAt gate in pickBadlandsPoint), so zones
    // read as distinct places and the open ground between stays organically scattered.
    this.placeBadlandsZones();
    this.spawnBadlandsZoneContent(solids);
    this.spawnBadlandsFlora(); // biome 2 Phase 2 arid harvestables (free pickups, not solid)
    this.spawnBadlandsMinerals(); // biome 2 Phase 4 — mineable ore + clay for smelting
    this.spawnBadlandsNodes(); // wood/stone gatherables + gated Ironbark tree (every biome supplies the basics)
    this.spawnBadlandsEnemies(); // biome 2 Phase 2 — out in the badlands patchwork (avoids zones)
    this.spawnZoneEnemies(); // themed enemies inside each sub-zone
    // Biome 3 (Duskmire Bayou) Phase 4a — terrain content + material sources.
    // Zones first so their poison fields are placed before anything scatters.
    this.placeBayouZones();
    this.spawnBayouZoneContent();
    this.spawnBayouNodes();
    this.spawnBayouFlora();
    this.spawnBayouEnemies(); // Phase 4b — the melee-core roster (after the nodes, same as the badlands order)
    this.spawnSunkenCrypts(solids); // Phase 4c — surface doorways + their prebuilt interiors
    this.spawnSunkenShrines(); // Phase 4d — the rite POI
    this.spawnDrownedLodges(); // Phase 4d — the stilt-village POI
    this.spawnSunkenGorge(solids); // Phase 4d s2 — the sealed maw + the Miretyrant's lair
    // PB1 Session 3 — populate the forest patchwork blobs beyond BIOME_RADIUS and
    // extend the badlands band beyond BADLANDS_R_MAX_INNER. Called last of the
    // content passes (every POI position is set by now) so their exclusion checks
    // are fully correct, unlike the inner-band passes above which run before POIs.
    this.spawnOuterForestContent();
    this.spawnOuterForestEnemies();
    this.spawnOuterBadlandsContent();
    this.spawnOuterBadlandsEnemies();
    this.scatterDecor(); // purely-decorative immersion props across both biomes
    // Enemy↔solid-terrain collision is gated PER ENEMY on `collidesWithTerrain`
    // (default false → every current enemy rolls freely through boulderfield
    // rocks; the player still collides via the collider above). The process
    // callback returns whether to perform Arcade separation for this pair, so a
    // future terrain-blocked enemy just flips its flag — no new collider wiring.
    // Arg slot is group-vs-static-group and not guaranteed, so we resolve the
    // Enemy by instanceof on both args (see the group-overlap arg-order gotcha).
    this.physics.add.collider(
      this.enemyGroup,
      solids,
      undefined,
      (a, b) => {
        const enemy = a instanceof Enemy ? a : b instanceof Enemy ? b : null;
        return enemy ? enemy.collidesWithTerrain : true;
      },
    );
    // Deliberately NO physics collider between the player and enemies — every
    // attempt at a "solid but not pushable" middle ground (immovable bodies,
    // then dash-only exemptions) still let an enemy's own chase/attack
    // velocity shove the player via Arcade's separation math each frame they
    // overlap (and vice versa before that). Enemies are walk-through, same
    // as trees/boulders (see updateTreeOcclusion's non-solid precedent) — all
    // damage already flows through distance-based hit checks in
    // updateEnemies()/checkPlayerHit(), never through this collider, so
    // dropping it entirely costs nothing but the unwanted shove.

    // Enemy projectiles (Gremlin's rock throw) hit the player via overlap,
    // reusing the same i-frame-respecting entry point melee damage already
    // goes through.
    this.enemyProjectiles = this.physics.add.group();
    this.physics.add.overlap(this.enemyProjectiles, this.player, (a, b) => {
      // Phaser doesn't guarantee (object1, object2) argument order for a
      // Group-vs-single-object overlap matches registration order — blindly
      // trusting the first arg as "the projectile" and destroying it crashed
      // the game once it happened to be the player instead (this.player then
      // had no `.scene`, so the next Player.update() threw). Pick whichever
      // argument actually is a Projectile instead of assuming a slot.
      const projectile = (a instanceof Projectile ? a : b) as Projectile;
      // Pass the projectile's damage type so a Hexling's "magic" bolt bypasses
      // the player's flat armor (Phase 1 hook); a physical Gremlin rock leaves
      // damageType undefined and subtracts armor as usual.
      this.applyDamageToPlayer(
        projectile.damage,
        undefined,
        projectile.damageType,
        undefined,
        undefined,
        projectile.sourceEnemy?.displayName ?? "Projectile",
      );
      // A CONNECTING shot is what resets its caster's give-up clock — firing
      // alone no longer does (see Enemy.markAttackAttempted). Without this a
      // ranged enemy could never time out of a pursuit, which is why nothing
      // in the bayou ever deaggro'd.
      projectile.sourceEnemy?.onProjectileHitPlayer(this.time.now);
      projectile.destroy();
    });

    // Player-fired projectiles (Slingshot/Javelin) vs. enemies — mirrors the
    // enemy-projectile-vs-player overlap above, including the same
    // "don't trust Phaser's arg order" pattern
    // (see feedback_phaser_group_overlap_arg_order).
    this.playerProjectiles = this.physics.add.group();
    this.physics.add.overlap(this.playerProjectiles, this.enemyGroup, (a, b) => {
      const projectile = (a instanceof Projectile ? a : b) as Projectile;
      const enemy = (a instanceof Enemy ? a : b) as Enemy;
      if (!enemy.depleted) this.resolveWeaponHit(enemy, projectile.damage, "ranged", projectile.isCrit, true, "Ranged");
      projectile.destroy();
    });

    // Left-click interacts with whatever is hovered and in reach. Suppressed
    // while a menu is open, or when the click lands on a fixed HUD element
    // (hotbar / event log) so a click there doesn't also hit the world behind.
    // Right-click on a placed object (Workbench/Campfire/Drying Rack) opens a
    // generic Upgrade/Destroy context menu.
    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      // Run over (victory/death screen up) — RunEndUI owns all input then;
      // don't let a click fall through to craft/gather/attack/place behind it.
      if (this.runOver) return;
      // The context menu's own rows have their own pointerdown handlers (which
      // already ran by the time this global listener fires — Phaser processes
      // hit-tested game objects before the input plugin's own event). Any
      // click while it's open is swallowed here either way, so it can't also
      // be read as a world interact/placement click.
      if (this.contextMenu.isOpen()) {
        if (!this.contextMenu.containsPoint(pointer.x, pointer.y)) this.contextMenu.close();
        return;
      }
      if (this.suppressNextPointerdown) {
        this.suppressNextPointerdown = false;
        return;
      }
      if (this.placementMode) {
        if (this.pointerOverHud(pointer)) return;
        // The inventory can stay open during placement (see
        // startItemPlacement) — a click on its still-open panel (or the
        // crafting panel, as a belt-and-suspenders guard) must not fall
        // through and place an object underneath it.
        if (this.inventoryMenu.isOpen() && this.inventoryMenu.containsPoint(pointer.x, pointer.y)) return;
        if (this.craftingMenu.isOpen() && this.craftingMenu.containsPoint(pointer.x, pointer.y)) return;
        if (pointer.leftButtonDown()) this.attemptPlaceObject();
        else if (pointer.rightButtonDown()) this.cancelPlacement();
        return;
      }
      if (this.isPaused || this.worldMapUI.isOpen() || this.anyMenuOpen() || this.pointerOverHud(pointer))
        return;
      if (pointer.leftButtonDown()) {
        this.tryInteract();
      } else if (pointer.rightButtonDown()) {
        this.tryOpenContextMenu(pointer);
      }
    });

    // Right-click quick-moves items between backpack and hotbar, so suppress
    // the browser context menu on the canvas.
    this.input.mouse!.disableContextMenu();

    this.contextMenu = new ContextMenu(this);
    this.createHud();
    this.createCraftingMenu();
    this.createInventoryMenu();
    this.createDryingRackMenu();
    this.createCookingMenu();
    this.createJewelryMenu();
    this.createChestMenu();
    this.createUpgradeMenu();
    this.createCharacterMenu();
    this.createRelicForgeMenu();
    this.hotbarUI = new HotbarUI(this, this.hotbar, {
      skills: this.skills,
      progression: this.progression,
      beginDrag: (c, i, p) => this.beginItemDrag(c, i, p),
      openGearUpgrade: (c, i) => this.openGearUpgradeMenu(c, i),
      eatItem: (c, i) => this.eatItem(c, i),
      isDragging: () => this.dragSource !== null,
      stationTexture: (key, tier) => this.tieredStationTexture(key, tier),
      upgradeReady: (key, tier, appliedIds) => this.hasReadyUpgrade(key, tier, appliedIds),
      critTotals: (w) => ({ chance: this.critChanceTotal(w), mult: this.critMultTotal(w) }),
    });
    this.createStaminaBar();
    this.createHealthBar();
    this.createBuffBar();
    this.createXpBar();
    this.createPassiveBar();
    this.createAbilityBar();
    this.createStatPointsBadge();
    // Sits beside the Keybinds panel (same top row), not stacked underneath
    // it — an open InventoryMenu panel occupies that same top-left column
    // and used to cover the log whenever it was open.
    this.eventLogUI = new EventLogUI(this, this.eventLog, this.keybindsUI.right + 12, this.keybindsUI.top);

    // Minimap + fog of war (World & discovery roadmap item 6) — FogOfWar owns
    // the reveal grid, MinimapUI draws/repaints it. Sized 1:1 to the minimap's
    // own pixel resolution so a revealed cell maps directly to one pixel.
    this.fog = new FogOfWar(WORLD_SIZE, WORLD_SIZE, FOG_COLS, FOG_COLS);
    // The map samples the SAME terrain color the ground bakes (the single
    // worldBiomeColorAt source), so minimap/world-map mirror the ground exactly.
    this.exploredMap = new ExploredMap(this.biome, this.fog, WORLD_CX, WORLD_CY, WORLD_RADIUS, (x, y) =>
      this.worldBiomes.worldBiomeColorAt(x, y),
    );
    this.minimapUI = new MinimapUI(this, this.exploredMap);
    // Open the map framed on a ~5000px-radius nearby view centered on the player
    // (the 28000px world is too big to show whole). Wheel zooms out to see more.
    this.worldMapUI = new WorldMapUI(this, this.exploredMap, 5000);
    this.createMapButton();
    this.createBiomeLabel();
    this.bossHealthUI = new BossHealthUI(this);
    // Night darkness + torch-light layer (M-DN). Depth ~2700 sits above the
    // world but below the minimap/HUD created around it, so only the world dims.
    this.nightOverlay = new NightOverlayUI(this);
    this.runHudUI = new RunHudUI(this);
    this.runEndUI = new RunEndUI(this);

    // Contextual hints (tip popups) + pause menu (Esc). The hint UI just
    // renders whatever HintManager decides to surface.
    this.hintUI = new HintUI(this);
    this.hints.onShow((text, _id, kind) => this.hintUI.show(text, kind));
    this.pauseMenu = new PauseMenuUI(this);
    this.welcomeUI = new WelcomeUI(this);
    this.characterSelectUI = new CharacterSelectUI(this);
    this.tipsUI = new TipsUI(this);
    // Opening nudge: movement + goal, a beat after the world loads.
    this.time.delayedCall(1500, () => this.hints.trigger("awaken"));
    // Show the welcome/how-to-play overlay before the player can act. During
    // early access it surfaces once per page load (see WelcomeUI's
    // ALWAYS_SHOW_EACH_LOAD) — not re-shown on an in-session New Run restart.
    // The character picker follows it (chained, so the two queue rather than
    // stack) and — unlike the welcome — shows on EVERY run, including New Run.
    if (!hasSeenWelcome()) this.openWelcome();
    else this.openCharacterSelect();

    // Classify every object built above onto the world/ui camera before the
    // first render. From here on the split is maintained on the game's
    // PRE_RENDER, which is the ONLY hook late enough to catch everything — see
    // syncCameras' note. off-then-on because create() re-runs on scene.restart()
    // and would otherwise stack a listener per run.
    this.game.events.off(Phaser.Core.Events.PRE_RENDER, this.syncCameras, this);
    this.game.events.on(Phaser.Core.Events.PRE_RENDER, this.syncCameras, this);
    this.syncCameras();

    // Scene-level drag: a slot starts it, the pointer drags a ghost icon, and
    // release resolves the move against whichever container is under the
    // pointer (backpack grid or hotbar). The Drying Rack/Crafting/Cooking
    // menus' batch-amount sliders share this same global pointermove/up pair
    // for their own drag gesture.
    this.input.on("pointermove", (p: Phaser.Input.Pointer) => {
      if (this.dragGhost) this.dragGhost.setPosition(p.x, p.y);
      if (this.dryingRackMenu.isOpen() && this.dryingRackMenu.isDraggingSlider()) {
        this.dryingRackMenu.updateSliderFromPointer(p.x);
      }
      if (this.craftingMenu.isOpen() && this.craftingMenu.isDraggingSlider()) {
        this.craftingMenu.updateSliderFromPointer(p.x);
      }
      if (this.cookingMenu.isOpen() && this.cookingMenu.isDraggingSlider()) {
        this.cookingMenu.updateSliderFromPointer(p.x);
      }
      if (this.jewelryMenu.isOpen() && this.jewelryMenu.isDraggingSlider()) {
        this.jewelryMenu.updateSliderFromPointer(p.x);
      }
    });
    this.input.on("pointerup", (p: Phaser.Input.Pointer) => {
      this.resolveItemDrag(p);
      this.dryingRackMenu.endSliderDrag();
      this.craftingMenu.endSliderDrag();
      this.cookingMenu.endSliderDrag();
      this.jewelryMenu.endSliderDrag();
    });

    // Mouse wheel cycles the hotbar selection (looping), unless the pointer is
    // over the event log (which scrolls its own history).
    this.input.on("wheel", (p: Phaser.Input.Pointer, _o: unknown, _dx: number, dy: number) => {
      if (this.runOver) return;
      // Full map open: the wheel zooms it instead of cycling the hotbar.
      if (this.worldMapUI.isOpen()) {
        this.worldMapUI.handleWheel(dy);
        return;
      }
      if (this.eventLogUI.isPointerOver(p) || this.keybindsUI.isPointerOver(p)) return;
      // The cooking menu scrolls its own recipe list on wheel — don't also
      // cycle the hotbar when the pointer is over it.
      if (this.cookingMenu.isOpen() && this.cookingMenu.containsPoint(p.x, p.y)) return;
      if (this.jewelryMenu.isOpen() && this.jewelryMenu.containsPoint(p.x, p.y)) return;
      // The inventory's backpack grid scrolls on wheel when the pointer is over
      // it (consumes the wheel so the hotbar doesn't also cycle).
      if (this.inventoryMenu.handleWheel(p, dy)) return;
      this.cycleHotbar(dy > 0 ? 1 : -1);
    });

    // Tab is captured so the browser doesn't shift focus off the canvas.
    this.input.keyboard!.addCapture("TAB");
    this.input.keyboard!.on("keydown-TAB", () => {
      if (this.runOver) return;
      if (this.placementMode) return this.cancelPlacement();
      this.toggleCombinedMenu();
    });
    this.input.keyboard!.on("keydown-ESC", () => {
      if (this.runOver) return;
      // Esc while typing in the inventory search just unfocuses the box (so it
      // doesn't also close the whole menu on the same press).
      if (this.inventoryMenu.isSearchFocused()) return this.inventoryMenu.unfocusSearch();
      // The character picker has no cancel path — a run must have a character.
      if (this.characterSelectUI.isOpen()) return;
      if (this.welcomeUI.isOpen()) return this.closeWelcome();
      if (this.tipsUI.isOpen()) return this.closeTips();
      if (this.pauseMenu.isOpen()) return this.resumeGame();
      if (this.worldMapUI.isOpen()) return this.worldMapUI.close();
      if (this.contextMenu.isOpen()) return this.contextMenu.close();
      if (this.placementMode) return this.cancelPlacement();
      if (this.upgradeMenu.isOpen()) return this.closeUpgradeMenu();
      if (this.characterMenu.isOpen()) return this.characterMenu.close();
      // If any in-game menu is open, Esc just closes it; otherwise Esc pauses.
      if (this.anyMenuOpen()) {
        this.closeDryingRackMenu();
        this.closeCookingMenu();
        this.closeJewelryMenu();
        this.closeChestMenu();
        this.closeRelicForgeMenu();
        this.craftingMenu.close();
        this.inventoryMenu.close();
        return;
      }
      this.openPauseMenu();
    });
    HOTBAR_KEYS.forEach((key, i) => {
      // Alt+1-9 selects the same column in row 2 (the dedicated
      // stations/processors row, see Hotbar.ts) instead of row 1 — same
      // single selectHotbarSlot entry point either way.
      this.input.keyboard!.on(`keydown-${key}`, (event: KeyboardEvent) => {
        if (this.runOver || this.typingInSearch()) return;
        this.selectHotbarSlot(event.altKey ? ROW1_COUNT + i : i);
      });
    });
    this.input.keyboard!.on("keydown-V", () => !this.runOver && !this.typingInSearch() && this.toggleMagnet());
    this.input.keyboard!.on("keydown-O", () => !this.runOver && !this.typingInSearch() && this.toggleRangeRing());
    this.input.keyboard!.on("keydown-K", () => {
      if (this.runOver || this.typingInSearch()) return;
      if (this.characterMenu.isOpen()) return this.characterMenu.close();
      this.openCharacterMenu();
    });
    // Q/E/R activated abilities (B3-P2a). R is context-sensitive: with a chest
    // open it still means "take all" (no relearn); otherwise it casts the R
    // ability. tryCastAbility() applies the remaining menu/pause/cooldown guards.
    this.input.keyboard!.on("keydown-Q", () => !this.runOver && !this.typingInSearch() && this.tryCastAbility("q"));
    this.input.keyboard!.on("keydown-E", () => !this.runOver && !this.typingInSearch() && this.tryCastAbility("e"));
    this.input.keyboard!.on("keydown-R", () => {
      if (this.runOver || this.typingInSearch()) return;
      if (this.chestMenu.isOpen()) {
        this.takeAllFromChest();
        return;
      }
      this.tryCastAbility("r");
    });
    this.input.keyboard!.on("keydown-H", () => !this.runOver && !this.typingInSearch() && this.toggleWheelSpansBothRows());
    this.input.keyboard!.on("keydown-J", () => !this.typingInSearch() && this.runHudUI.toggleMinimized());
    this.input.keyboard!.on("keydown-M", (e: KeyboardEvent) => {
      if (this.runOver || this.typingInSearch()) return;
      // DEV: Ctrl+Shift+M reveals the whole map for worldgen inspection.
      if (e.ctrlKey && e.shiftKey) {
        this.revealEntireMap();
        return;
      }
      this.toggleWorldMap();
    });

    // Skill level-ups: announce, feed the overall Player Level the same XP the
    // skill level cost (Progression.ts), and re-run recipe discovery/crafting
    // menu since a level-up may satisfy a skill-gated recipe's requirement.
    this.skills.onLevelUp((skill, newLevel, xpCost) => {
      this.eventLog.add("levelup", `${skillDisplayName(skill)} leveled up -> Lvl ${newLevel}`);
      this.sfx.skillUp();
      this.progression.addXp(xpCost);
      this.craftingMenu?.refresh();
      this.refreshXpBar();
    });

    // Player level-ups: announce the awarded points and refresh the character
    // menu (unspent-point count/buttons) if it's open.
    this.progression.onLevelUp((level, points) => {
      // Silent: showLevelUpBanner() below is the dedicated big "you leveled
      // up" visual — the generic center toast would just duplicate it and
      // compete for the same screen space (playtest). Still logged to the
      // persistent side panel.
      this.eventLog.add("levelup", `Level Up! You are now Level ${level} (+${points} points)`, undefined, true);
      // No longer logged to the end-of-run timeline (the user: "kind of
      // pointless") — level-ups fire every 5 levels and the timeline is capped
      // at the last 6, so a long run's timeline was 100% "Reached Level N"
      // with every boss/miniboss/biome-entry pushed off the end. `Player Level`
      // is already its own line in the score breakdown; the pace is legible
      // from there without eating the timeline's whole budget.
      this.characterMenu?.refresh();
      this.refreshXpBar();
      this.refreshStatPointsBadge();
      this.showLevelUpBanner(level, points);
    });

    // Apply any starting Endurance/Vitality bonus (0 at a fresh start; keeps
    // the wiring in one place for when a save/load restores allocated points).
    this.syncStatBonuses();

    // Seed recipe discovery (no-op at a fresh start, but keeps state correct
    // if the initial inventory ever changes).
    this.refreshDiscovery();

    this.installDevConsole();
  }

  update(_time: number, delta: number): void {
    // NOTE: the world/HUD camera split is NOT synced here — it runs on the
    // game's PRE_RENDER instead (registered in create()), which also covers the
    // frozen-menu case since that event fires whether or not update() returns
    // early. See syncCameras.
    // Park distant world objects out of the display list before anything else
    // reads it. Runs even while frozen (below) — a paused frame still renders,
    // and the whole point is to keep the render list small at all times.
    this.updateSceneStreaming();

    // Run ended (death/win screen up) — freeze the whole world sim + input. The
    // RunEndUI is tween/pointer-driven, so it stays live regardless.
    if (this.runOver) return;
    // Paused (Esc menu up) — same freeze, but resumable. Skipping the tick here
    // is what keeps in-run time (the speedrun clock) from advancing while
    // paused; physics + the scene clock are frozen alongside in openPauseMenu.
    if (this.isPaused) return;

    if (this.isDead) {
      // Frozen: no Player.update() (no input/movement), but ambient systems
      // keep running so the world doesn't visually freeze too.
      this.run.tick(delta);
      this.updateDayNight(delta);
      this.runHudUI.update(this.run, this.dayNight, this.character.def ? this.character.name() : undefined);
      this.stamina.tick(delta);
      this.refreshStaminaBar();
      this.player.syncEquippedIconPosition();
      this.updateAttackRangeRing();
      this.updateEnemies(delta);
      this.updateMagnet(delta);
      this.updateTreeOcclusion(delta);
      this.updateMapReveal();
      this.bossHealthUI.update(this.engagedBigBoss() ?? this.engagedMiniBoss());
      this.syncSpeckleLayer();
      return;
    }

    // Gate sprint on affording *this frame's* drain (not just "stamina > 0")
    // — otherwise a partial remainder that's too small to spend keeps
    // regenerating just enough to pass a ">0" check forever, and sprint never
    // actually hard-blocks.
    // Running skill reduces sprint stamina drain (M-SS), on top of keeping
    // sprint speed.
    const sprintCost = SPRINT_DRAIN_PER_SEC * sprintStaminaDrainMult(this.skills) * (delta / 1000);
    const canSprint = this.stamina.canAfford(sprintCost);
    const canDash = this.stamina.canAfford(DASH_STAMINA_COST);
    const sprintMultiplier = runningSprintMultiplier(this.skills);
    // Relic move-speed bonus (M-RL) + Fleetfoot on-kill burst ADD into the move
    // bucket (2026-07-15), applied to walk & sprint alike in Player.update.
    // Emberblink set bonus (Emberhide light set) lengthens the dash burst only.
    const dashDistMult = this.emberblinkDashMult();
    // Movement locks while the inventory search box is focused, so WASD routes
    // to the text field instead of walking the player.
    const inputEnabled = !this.inventoryMenu.isSearchFocused();
    const moveMult =
      this.relics.moveSpeedMult() +
      this.killMoveBurstBonus() +
      (equippedAugmentEffect(this.equipment).moveSpeedPct ?? 0) / 100 +
      (this.character.moveSpeedMult() - 1);
    // Phase 1: terrain under the player this frame — the bramble slow feeds
    // Player.update's env multiplier; regenMult is cached for the regen gates
    // later this frame (dormant in biome 2, live for biome-3 miasma).
    const env = this.environmentEffectAt(this.player.x, this.player.y);
    // Regen is reduced ONLY by the terrain now (miasma/mire zones). The creature
    // poison DoT no longer cuts regen (the user 2026-07-23: "get rid of the regen
    // reduction in poison — maybe make it an enemy-kit thing"). A specific enemy
    // could still opt into a regen debuff later; base poison is just a DoT.
    this.currentRegenMult = env.regenMult;
    this.currentEnvMoveMult = env.moveMult;
    // Standing in a miasma keeps re-applying a short poison stack, so leaving the
    // zone lets it lapse on its own rather than needing a separate "exit" event.
    if (env.poisonDps && env.poisonDps > 0 && !this.isDead) {
      // sustain(), NOT apply() — this runs every frame while the player stands in
      // the fog, and a stacking application would multiply the intended DPS by
      // the stack cap (see Poison.ts). The short duration is what makes leaving
      // the zone self-cleaning: stop re-arming and it lapses on its own.
      // Mireborn Cloak (B4-P2) thins the environmental dose too, not just
      // creature bites — the cloak's whole flavour is living in the poison.
      this.poison.sustain(env.poisonDps * this.equipEffects.statusResistMult(), 900);
      this.hints.trigger("poisoned");
    }
    // Anti-kite: briefly slower right after firing a ranged weapon. A separate
    // multiplicative factor from env.moveMult (terrain) — folded in only for the
    // actual speed calc so the terrain tooltip (currentEnvMoveMult) isn't misled
    // into blaming the ground for it.
    const rangedFireSlow = this.time.now < this.rangedFireSlowUntil ? RANGED_FIRE_SLOW_MULT : 1;
    const frame = this.player.update(
      delta,
      canSprint,
      canDash,
      sprintMultiplier,
      moveMult,
      dashDistMult,
      inputEnabled,
      env.moveMult * rangedFireSlow,
    );
    this.clampPlayerToWorld();

    if (frame.sprinting) {
      this.stamina.spend(sprintCost);
      this.awardSkillXp("running", RUNNING_XP_PER_SEC * (delta / 1000));
    }
    if (frame.dashStarted) {
      this.hints.trigger("dash_tip");
      this.stamina.spend(DASH_STAMINA_COST);
      // light_armor extends the dodge window (M-SS "Evade Window").
      this.invulnerableUntil = this.time.now + DASH_IFRAME_MS + dashIframeBonusMs(this.skills);
      this.player.playDashFx();
      // Emberblink set bonus: fire erupts where the dash puts the player down.
      // Timed to the dash's end so the nova lands at the destination, not the
      // launch point.
      if (this.hasSet("emberhide")) {
        this.time.delayedCall(DASH_DURATION_MS, () => this.emberblinkBurst());
      }
    }
    this.run.tick(delta);
    this.updateDayNight(delta);
    this.runHudUI.update(this.run, this.dayNight, this.character.def ? this.character.name() : undefined);
    this.stamina.tick(delta);
    this.refreshStaminaBar();
    // Contextual hint: nearly-empty stamina. (First-damage-taken hint fires
    // from applyDamageToPlayer() instead, right when it actually happens.)
    if (this.stamina.value() < 5) this.hints.trigger("stamina_empty");
    this.updateComfortRegen();
    // Food buffs heal over time; refresh the HP bar only when they actually
    // healed, and keep the buff HUD in sync each frame (countdown/expiry). In a
    // no-regen zone (Phase 1, biome-3 miasma) the buff still ticks down but heals
    // nothing.
    if (this.buffs.tick(delta, this.health, this.currentRegenMult).healed) this.refreshHealthBar();
    this.buffBarUI.sync(this.buffs.active());
    this.statusBarUI.sync(this.statusEffects());
    this.passiveBarUI.sync(this.passiveEntries());
    this.abilityBarUI.update(this.abilityEntries());
    // Bleed DoT (Cragscale roll): ticks whole damage points regardless of
    // i-frames (it's applied inside the i-frame guard at wound time, not here)
    // and ignores armor. A small red number over the player reads as "bleeding".
    // Poison DoT (biome 3): same tick shape as bleed, but its damage is typed
    // `poison` so it reads green and is mitigated like magic. Applied directly
    // (not via applyDamageToPlayer) for the same reason bleed is — the wound was
    // already gated by i-frames at application time, so a tick shouldn't be
    // re-dodgeable. Elemental mitigation is applied here at tick time instead.
    const poisonRaw = this.poison.tick(delta);
    if (poisonRaw > 0 && !this.isDead) {
      const mit = Math.min(
        0.75,
        (this.wearsHeavyArmor() ? heavyArmorMagicMitigation(this.skills) : 0) +
          (equippedAugmentEffect(this.equipment).elementalMitigationPct ?? 0) / 100,
      );
      const poisonDmg = Math.max(1, Math.round(poisonRaw * (1 - mit)));
      const toHp = this.absorbWithShield(poisonDmg); // chip the Leech overshield first
      const applied = this.devGodMode
        ? Math.min(toHp, Math.max(0, this.health.value() - 1))
        : toHp;
      const diedOfPoison = this.health.takeDamage(applied);
      this.refreshHealthBar();
      this.spawnPlayerDamageNumber(poisonDmg, "poison");
      if (diedOfPoison && !this.devGodMode && !this.tryUndyingRevive()) this.onPlayerDeath();
    }
    const bleedDmg = this.bleed.tick(delta);
    if (bleedDmg > 0 && !this.isDead) {
      // DEV god mode: same floor-at-1-HP guard applyDamageToPlayer() uses —
      // bleed was bypassing it entirely and could still kill the player.
      const bleedToHp = this.absorbWithShield(bleedDmg); // shield absorbs bleed too
      const appliedBleed = this.devGodMode
        ? Math.min(bleedToHp, Math.max(0, this.health.value() - 1))
        : bleedToHp;
      const died = this.health.takeDamage(appliedBleed);
      this.refreshHealthBar();
      this.spawnDamageNumber(this.player.x, this.player.y, bleedDmg, false, "weak");
      // Undying Mythic revive covers a bleed-out too, not just direct hits.
      if (died && !this.devGodMode && !this.tryUndyingRevive()) this.onPlayerDeath();
    }
    this.player.syncEquippedIconPosition();
    this.updateAttackRangeRing();

    if (this.placementMode) this.updatePlacementGhost();
    else if (!this.anyMenuOpen() && !this.worldMapUI.isOpen()) this.updateHover();
    this.updateMagnet(delta);
    this.updateEnemies(delta);
    this.updateRespawns(delta);
    this.updatePoiRespawns(this.time.now);
    this.updateShrines(this.time.now, delta); // Phase 4d — rite waves + the leash
    this.updateTreeOcclusion(delta);
    this.updateMapReveal();
    this.updateShackGlows();
    this.bossHealthUI.update(this.engagedBigBoss() ?? this.engagedMiniBoss());
    this.updateCraftingMenuWorkbenchProximity();
    this.syncSpeckleLayer();
  }

  // Advance fog-of-war + both map views. ExploredMap is the single consumer of
  // the fog reveal queue (drainRevealed updates the shared color cache both the
  // corner minimap and the full map read); a fresh reveal while the full map is
  // open marks its terrain dirty so it repaints.
  private updateMapReveal(): void {
    // Underground: no fog reveal, no map. Painting the CRYPT_REALM pocket into
    // the explored-world cache would smear a dungeon across the far corner of
    // the world map, and a crypt is meant to be navigated by torchlight anyway.
    if (this.activeDungeon) {
      this.minimapUI.setHidden(true);
      this.biomeLabel?.setText(this.activeDungeon.name);
      this.currentBiome = "base"; // force a re-label on the way back out
      this.updateCryptDiscovery(this.activeDungeon);
      return;
    }
    this.minimapUI.setHidden(false);
    this.exploredMap.reveal(this.player.x, this.player.y);
    const changed = this.exploredMap.drainRevealed();
    if (changed.length > 0) this.worldMapUI.markDirty();
    this.minimapUI.update(this.player.x, this.player.y);
    this.updateAltarDiscovery();
    this.updateBiomeUI();
    if (this.worldMapUI.isOpen()) this.worldMapUI.update(this.player.x, this.player.y);
  }

  // Advance the day/night clock and drive its effects (M-DN): fade the world
  // darkness + torch lights, dim the minimap, and fire the day<->night edge
  // events (nightfall surge / dawn cleanup). Called from both the alive and
  // dead branches of update(), so time keeps flowing while dead but a surge
  // only spawns while alive.
  private updateDayNight(delta: number): void {
    this.dayNight.tick(delta);
    // A crypt is always pitch dark regardless of the sky (biome 3 Phase 4c) —
    // which is what finally makes the torch/light system load-bearing rather
    // than a night-time convenience. The clock keeps running underneath.
    const darkness = this.activeDungeon ? 1 : this.dayNight.nightIntensity01();
    this.nightOverlay.render(darkness, this.collectLights(), !!this.activeDungeon);
    this.minimapUI.setNightIntensity(this.dayNight.nightIntensity01());

    const isNight = this.dayNight.isNight();
    if (isNight && !this.wasNight && !this.isDead) {
      this.sfx.nightfall();
      this.spawnNightBatch();
    } else if (!isNight && this.wasNight) {
      this.cleanupNightSpawns();
    }
    this.wasNight = isNight;
  }

  // Screen-space light holes for the night overlay: the player (only while a
  // light item is held) plus any on-screen lit POI (Gremlin Shacks, Boss
  // Altar). The overlay renders on the zoom-1 uiCam, so world coords are mapped
  // to actual screen pixels through the WORLD camera's zoom (midPoint transform)
  // and every radius is scaled by that zoom too. Off-screen POIs are skipped so
  // the erase list stays short.
  private collectLights(): ScreenLight[] {
    const lights: ScreenLight[] = [];
    const cam = this.cameras.main;
    const z = cam.zoom;
    const halfW = cam.width * 0.5;
    const halfH = cam.height * 0.5;
    const toScreen = (wx: number, wy: number) => ({
      x: (wx - cam.midPoint.x) * z + halfW,
      y: (wy - cam.midPoint.y) * z + halfH,
    });
    // The player's own light. Underground there's always SOME (see
    // CRYPT_AMBIENT_LIGHT) — a torch widens it rather than being required.
    // A light-bearing trinket glows on its own; a held torch is brighter and the
    // trinket's % widens it. Max, not sum — two light sources on one body is one
    // pool of light, whichever is bigger.
    const carried = Math.max(
      this.equippedLightRadius * this.equipEffects.lightRadiusMult(),
      this.equipEffects.innateLightRadius(),
    );
    const ownLight = this.activeDungeon ? Math.max(CRYPT_AMBIENT_LIGHT, carried) : carried;
    if (ownLight > 0) {
      const p = toScreen(this.player.x, this.player.y);
      lights.push({ x: p.x, y: p.y, radius: ownLight * z, color: LIGHT_COLOR.torch });
    }
    // Cull against the zoomed visible world rect (worldView) plus a world-space
    // margin, so the erase list only holds POIs actually near the viewport.
    const view = cam.worldView;
    const margin = POI_LIGHT_RADIUS;
    const onScreen = (wx: number, wy: number) =>
      wx >= view.x - margin &&
      wx <= view.right + margin &&
      wy >= view.y - margin &&
      wy <= view.bottom + margin;
    for (const shack of this.gremlinShacks) {
      if (!onScreen(shack.x, shack.y)) continue;
      const s = toScreen(shack.x, shack.y);
      lights.push({ x: s.x, y: s.y, radius: POI_LIGHT_RADIUS * z, color: LIGHT_COLOR.poiFire });
    }
    // Bayou surface POIs (Phase 4d) — a shrine's bowl-fire and a lodge's lamps
    // are how both read as inhabited places across a dark swamp.
    for (const p of this.shrineLightPoints) {
      if (!onScreen(p.x, p.y)) continue;
      const s = toScreen(p.x, p.y);
      lights.push({ x: s.x, y: s.y, radius: POI_LIGHT_RADIUS * z, color: LIGHT_COLOR.shrine });
    }
    for (const p of this.lodgeLightPoints) {
      if (!onScreen(p.x, p.y)) continue;
      const s = toScreen(p.x, p.y);
      lights.push({ x: s.x, y: s.y, radius: POI_LIGHT_RADIUS * 1.3 * z, color: LIGHT_COLOR.poiFire });
    }
    // Sunken Crypts — surface doorways glow with their gem's color at night.
    for (const p of this.cryptLightPoints) {
      if (!onScreen(p.x, p.y)) continue;
      const s = toScreen(p.x, p.y);
      lights.push({ x: s.x, y: s.y, radius: CRYPT_LIGHT_RADIUS * z, color: LIGHT_COLOR.crypt });
    }
    // The Sunken Gorge's maw — a bile-green hole breathing light at night.
    for (const p of this.gorgeLightPoints) {
      if (!onScreen(p.x, p.y)) continue;
      const s = toScreen(p.x, p.y);
      lights.push({ x: s.x, y: s.y, radius: GORGE_LIGHT_RADIUS * z, color: LIGHT_COLOR.gorge });
    }
    // Interior braziers, but ONLY for the crypt you're standing in. The six
    // interiors share one grid in CRYPT_REALM and a neighbour is within camera
    // range, so lighting them all would hang the next dungeon's braziers in the
    // void beside you — the one place the "it's pitch dark down here" illusion
    // can actually break.
    if (this.activeDungeon) {
      for (const p of this.activeDungeon.braziers) {
        if (!onScreen(p.x, p.y)) continue;
        const s = toScreen(p.x, p.y);
        lights.push({ x: s.x, y: s.y, radius: CRYPT_LIGHT_RADIUS * z, color: LIGHT_COLOR.poiFire });
      }
      // The way OUT gets its own shaft of daylight. Playtest: the exit was hard
      // to pick out once real art made the floor busier, and a dungeon you can't
      // find your way out of is the worst thing for it to be. Warmer and wider
      // than a brazier so it reads as "outside is that way" from across a room,
      // and it costs nothing else — the light layer already existed.
      const stairs = this.activeDungeon.exitStairs;
      if (stairs && onScreen(stairs.x, stairs.y)) {
        const s = toScreen(stairs.x, stairs.y);
        lights.push({ x: s.x, y: s.y, radius: CRYPT_LIGHT_RADIUS * 1.7 * z, color: LIGHT_COLOR.daylightShaft });
      }
      // Discovered rooms/corridors stay lit — a stretched soft brush per space,
      // so a whole room lights at once instead of a circle following the player.
      // TWO passes each: a wide halo that softens onto the walls, then a core
      // pass at the room's own size. The halo alone left room edges ~40% dark
      // (the brush is a radial gradient), which read as murky rather than lit —
      // and "lit" is the whole point of discovering a room.
      for (const r of this.activeDungeon.discovered) {
        const cx = r.x + r.w / 2;
        const cy = r.y + r.h / 2;
        if (!onScreen(cx, cy)) continue;
        const s = toScreen(cx, cy);
        for (const scale of [CRYPT_ROOM_LIGHT_SCALE, 1.05]) {
          lights.push({ x: s.x, y: s.y, radius: 0, width: r.w * scale * z, height: r.h * scale * z });
        }
      }
    }
    for (const altar of this.bossAltars) {
      if (!onScreen(altar.x, altar.y)) continue;
      const s = toScreen(altar.x, altar.y);
      lights.push({ x: s.x, y: s.y, radius: POI_LIGHT_RADIUS * z, color: LIGHT_COLOR.poiFire });
    }
    // War Camp braziers (M-WC) glow like any other POI light.
    for (const b of this.campLightPoints) {
      if (!onScreen(b.x, b.y)) continue;
      const s = toScreen(b.x, b.y);
      lights.push({ x: s.x, y: s.y, radius: POI_LIGHT_RADIUS * z, color: LIGHT_COLOR.poiFire });
    }
    // Gloaming Vein crystals glow at night (a purple beacon that doubles as a
    // navigation hint — the vein's own amethyst color shows through the erased
    // hole, like the war camp glows).
    for (const v of this.veinLightPoints) {
      if (!onScreen(v.x, v.y)) continue;
      const s = toScreen(v.x, v.y);
      lights.push({ x: s.x, y: s.y, radius: 110 * z, color: LIGHT_COLOR.vein });
    }
    // Duskrunner Warren dens glow a faint gloam-ember at night — a subtler
    // beacon than the full POIs, marking a den's location from a distance.
    for (const d of this.denLightPoints) {
      if (!onScreen(d.x, d.y)) continue;
      const s = toScreen(d.x, d.y);
      lights.push({ x: s.x, y: s.y, radius: 90 * z, color: LIGHT_COLOR.den });
    }
    // Sunken Forge (Phase 3 POI 2): a warm ember glow — the molten crucible +
    // slag read as a lit smithy from a distance, a navigation beacon in the dark.
    for (const f of this.forgeLightPoints) {
      if (!onScreen(f.x, f.y)) continue;
      const s = toScreen(f.x, f.y);
      lights.push({ x: s.x, y: s.y, radius: 130 * z, color: LIGHT_COLOR.forge });
    }
    // Duneshaper altar arenas: gloam crystals glow violet at night, so the
    // (now much larger) boss-altar clearing reads as a major beacon in the dark.
    for (const t of this.tyrantAltarLightPoints) {
      if (!onScreen(t.x, t.y)) continue;
      const s = toScreen(t.x, t.y);
      lights.push({ x: s.x, y: s.y, radius: 120 * z, color: LIGHT_COLOR.tyrant });
    }
    return lights;
  }

  // Nightfall surge (M-DN): drop a small mix of normal enemies into still-
  // unexplored cells around the player. Tracked in nightSpawns so dawn can cull
  // any that never engaged — density returns to baseline each morning.
  private spawnNightBatch(): void {
    // Underground there is no nightfall to surge into — and the surge ring is
    // measured around the PLAYER, so it would drop swamp creatures inside a
    // sealed crypt.
    if (this.activeDungeon) return;
    const rng = this.sessionRng();
    // Biome-aware surge (S4): pick each spawn point, then draw its species from
    // THAT point's biome roster via makeRespawnEnemy — so a nightfall out in the
    // badlands stirs Duskrunners/Cragscale/Hexling/Sandmaw, not forest Boars
    // (the old hardcoded 2 Boar/2 Snake/2 Gremlin mix ignored biome). Each rolls
    // elite at the night-multiplied chance (M-EL2) — the nightfall surge is where
    // the user wanted a higher elite rate, on top of already being denser/faster
    // (M-DN). Dunes has no roster → makeRespawnEnemy returns null, skipped.
    const NIGHT_BATCH = 6;
    for (let i = 0; i < NIGHT_BATCH; i++) {
      const { x, y } = this.pickNightSpawnPoint(rng);
      const enemy = this.makeRespawnEnemy(rng, x, y, NIGHT_ELITE_CHANCE_MULT);
      if (!enemy) continue;
      this.enemies.push(enemy);
      this.enemyGroup.add(enemy);
      this.nightSpawns.push(enemy);
    }
    this.eventLog.add("info", "Night falls — the wilds stir...");
    this.hints.trigger("nightfall"); // first nightfall -> torch/danger nudge
  }

  // At dawn, remove any night-spawn that never aggro'd and is off-screen. Ones
  // that engaged the player (or are still near/visible) stay and simply drop
  // out of nightSpawns tracking (now permanent roster). This is what keeps a
  // long multi-night run from accumulating ever-denser enemies.
  private cleanupNightSpawns(): void {
    // Dawn can't reach a crypt: culling here would judge "off-screen" against a
    // camera parked underground and quietly delete surface night-spawns the
    // player never saw resolve. They're culled on the next dawn instead.
    if (this.activeDungeon) return;
    const cam = this.cameras.main;
    const margin = 80;
    const onScreen = (e: Enemy) =>
      e.x >= cam.scrollX - margin &&
      e.x <= cam.scrollX + cam.width + margin &&
      e.y >= cam.scrollY - margin &&
      e.y <= cam.scrollY + cam.height + margin;
    for (const enemy of this.nightSpawns) {
      if (enemy.depleted) continue; // already killed
      if (enemy.isAggro() || onScreen(enemy)) continue; // engaged/visible — keep it
      const idx = this.enemies.indexOf(enemy);
      if (idx >= 0) this.enemies.splice(idx, 1);
      this.enemyGroup.remove(enemy);
      enemy.destroy();
    }
    this.nightSpawns = [];
  }

  // Fog top-up respawns (2026-07-11): keep a moderate number of huntable enemies
  // around the player so meat/loot stay renewable over a long run. Every
  // RESPAWN_TICK_MS, if the live non-boss count within RESPAWN_NEARBY_RADIUS is
  // under target (and the global cap isn't hit), spawn up to RESPAWN_PER_TICK
  // replacements off-screen in the fog ring. Bosses (GremlinKing/Gloamwarden) are
  // excluded; Shack guards still count toward density but keep their own respawn
  // timer. Called from update()'s alive branch only (no respawns while dead). The
  // one bounded tradeoff: enemies you kite far away and abandon still count toward
  // MAX_LIVE, so a very long roaming run can eventually park at the cap — the cap
  // is generous enough that this stays a non-issue in practice.
  private updateRespawns(delta: number): void {
    if (this.activeDungeon) return; // no surface top-ups into a dungeon
    this.respawnAccumMs += delta;
    if (this.respawnAccumMs < RESPAWN_TICK_MS) return;
    this.respawnAccumMs = 0;

    const isBoss = (e: Enemy) =>
      e instanceof GremlinKing ||
      e instanceof Gloamwarden ||
      e instanceof Cinderwrought ||
      e instanceof Duneshaper ||
      e instanceof Palewake ||
      e instanceof Kilnborn ||
      e instanceof Sanguinarch ||
      e instanceof Miretyrant;
    // Crypt dwellers are excluded from the surface budget: six prebuilt
    // interiors hold ~60 enemies that would otherwise permanently consume a
    // third of RESPAWN_MAX_LIVE and starve the overworld's top-up.
    const alive = this.enemies.filter((e) => !e.depleted && !isBoss(e) && !this.cryptEnemies.has(e));
    if (alive.length >= RESPAWN_MAX_LIVE) return;

    const r2 = RESPAWN_NEARBY_RADIUS * RESPAWN_NEARBY_RADIUS;
    const nearby = alive.filter(
      (e) => Phaser.Math.Distance.Squared(e.x, e.y, this.player.x, this.player.y) <= r2,
    ).length;
    let toSpawn = Math.min(
      RESPAWN_NEARBY_TARGET - nearby,
      RESPAWN_PER_TICK,
      RESPAWN_MAX_LIVE - alive.length,
    );
    if (toSpawn <= 0) return;

    const rng = this.sessionRng();
    const eliteMult = this.dayNight.isNight() ? NIGHT_ELITE_CHANCE_MULT : 1;
    while (toSpawn-- > 0) {
      const { x, y } = this.pickNightSpawnPoint(rng, RESPAWN_RING_MIN, RESPAWN_RING_MAX);
      const enemy = this.makeRespawnEnemy(rng, x, y, eliteMult);
      if (!enemy) continue; // no roster for this point's biome (e.g. dunes)
      this.enemies.push(enemy);
      this.enemyGroup.add(enemy);
    }
  }

  // Pick a respawn species matching the BIOME at the chosen point (biome-aware
  // top-up — checked per-point so a spawn ring straddling a biome border spawns the
  // right roster on each side). Forest/base → the forest mix (Boar 24 / Snake 28 /
  // RangedGremlin 22 / MeleeGremling 8 = 82); badlands → the badlands mix (weighted
  // to roughly the spawnBadlandsEnemies() proportions). In both, the meat source
  // dominates (forest: Boar/Snake ~63%; badlands: Duskrunner ~38%, whose
  // duskrunner_meat is the badlands food drop) so respawns solve the food shortage
  // directly. Dunes is an empty placeholder biome with no roster yet → returns null
  // (no top-up there). Elite rolls at the standard chance (night-boosted, matching
  // every other spawn path).
  private makeRespawnEnemy(
    rng: Phaser.Math.RandomDataGenerator,
    x: number,
    y: number,
    eliteMult: number,
  ): Enemy | null {
    const elite = this.rollElite(rng, eliteMult);
    const biome = this.worldBiomes.dominantBiomeAt(x, y);
    // Respawns are drawn from a RING around the player, so near a seam the ring
    // reaches into the neighbouring biome and tops it up with that biome's
    // roster — which the player then meets on this side of the border, since a
    // hunter happily chases across it (the user playtest: "murklings in the
    // badlands"). Every initial spawner is already strict about this; the ring
    // was the one path that wasn't. Skipping the mismatch is right rather than
    // remapping the species: the ring has plenty of other candidate points.
    if (biome !== this.worldBiomes.dominantBiomeAt(this.player.x, this.player.y)) return null;
    if (biome === "badlands") {
      // Weighted ~ spawnBadlandsEnemies() counts (Duskrunner ~84 / Cragscale 46 /
      // Hexling 44 / Sandmaw 46 = 220). Duskrunners respawn as LONE runners (no
      // pack) — a top-up, not a fresh war party.
      const roll = rng.between(1, 220);
      if (roll <= 84) return new Duskrunner(this, { x, y, elite });
      if (roll <= 130) return new Cragscale(this, { x, y, elite });
      if (roll <= 174) return new Hexling(this, { x, y, elite });
      return new Sandmaw(this, { x, y, elite });
    }
    if (biome === "dunes") return null; // placeholder biome, no roster yet
    // Bayou (biome 3): the roster shipped in Phase 4b, so the top-up is live —
    // weighted ~ spawnBayouEnemies()'s own counts (Murkling ~130 / Blighttoad ~65
    // / Mirejaw 44 / Mosswretch ~45 / Corpselight 22 = 306). The Fenlurker (a
    // burrower) was CUT 2026-07-23 (the user: "boring to fight"), so its share is
    // simply gone from the total. Murklings respawn as LONE stragglers, not a
    // fresh nest, and the Mirejaw (the sole Mirehide source) keeps a real share so
    // the reforge tier stays farmable.
    if (biome === "bayou") {
      const roll = rng.between(1, 306);
      if (roll <= 130) return new Murkling(this, { x, y, elite });
      if (roll <= 195) return new Blighttoad(this, { x, y, elite });
      if (roll <= 239) return new Mirejaw(this, { x, y, elite });
      if (roll <= 284) return new Mosswretch(this, { x, y, elite });
      return new Corpselight(this, { x, y, elite });
    }
    // forest + base (the universal between-blobs layer) → the forest roster.
    const roll = rng.between(1, 82);
    if (roll <= 24) return new Boar(this, { x, y, elite });
    if (roll <= 52) return new Snake(this, { x, y, elite });
    if (roll <= 74) return new RangedGremlin(this, { x, y, elite });
    return new MeleeGremling(this, { x, y, elite });
  }

  // Ring around the player, biased to still-fogged (unexplored) non-creek
  // cells so a surge appears out in the dark rather than in already-cleared
  // ground. Falls back to any in-bounds ring point after the attempt cap.
  private pickNightSpawnPoint(
    rng: Phaser.Math.RandomDataGenerator,
    ringMin = NIGHT_SPAWN_RING_MIN,
    ringMax = NIGHT_SPAWN_RING_MAX,
  ): { x: number; y: number } {
    let last = { x: this.player.x, y: this.player.y };
    for (let attempt = 0; attempt < 60; attempt++) {
      const angle = rng.rotation();
      const r = rng.between(ringMin, ringMax);
      const x = Phaser.Math.Clamp(this.player.x + Math.cos(angle) * r, 60, WORLD_W - 60);
      const y = Phaser.Math.Clamp(this.player.y + Math.sin(angle) * r, 60, WORLD_H - 60);
      last = { x, y };
      if (this.biome.isCreekAt(x, y)) continue;
      // Prefer unexplored cells for the first two-thirds of attempts, then
      // accept any valid ring point so a well-explored area still gets a surge.
      if (attempt < 40 && this.fog.isRevealed(x, y)) continue;
      return { x, y };
    }
    return last;
  }

  // While the crafting menu is open, re-render it the instant Workbench
  // proximity changes (walking in/out of WORKBENCH_RANGE) rather than only
  // reflecting proximity as of when the menu was opened.
  private updateCraftingMenuWorkbenchProximity(): void {
    if (!this.craftingMenu.isOpen()) {
      this.craftingMenuLastNearWorkbench = null;
      return;
    }
    const near = this.isNearWorkbench(this.player.x, this.player.y);
    if (near !== this.craftingMenuLastNearWorkbench) {
      this.craftingMenuLastNearWorkbench = near;
      this.craftingMenu.refresh();
    }
  }

  private toggleMagnet(): void {
    this.magnetEnabled = !this.magnetEnabled;
    this.eventLog.add("info", `Auto-pickup: ${this.magnetEnabled ? "ON" : "OFF"}`);
  }

  private toggleRangeRing(): void {
    this.rangeRingEnabled = !this.rangeRingEnabled;
    this.eventLog.add("info", `Range ring: ${this.rangeRingEnabled ? "ON" : "OFF"}`);
    if (!this.rangeRingEnabled) this.attackRangeRing.clear();
  }

  private toggleWheelSpansBothRows(): void {
    this.wheelSpansBothRows = !this.wheelSpansBothRows;
    this.eventLog.add(
      "info",
      `Scroll wheel: ${this.wheelSpansBothRows ? "cycles both hotbar rows" : "cycles current row only"}`,
    );
  }

  // Pulls loose drop pieces (not pre-placed branches/rocks) toward the
  // player every frame they're within MAGNET_RADIUS, collecting them once
  // close enough. Purely radius-gated, no "lock on" — a piece stops dead the
  // instant the player is no longer within range.
  private updateMagnet(delta: number): void {
    if (!this.magnetEnabled) return;
    const step = MAGNET_SPEED * (delta / 1000);
    const toCollect: ResourceNode[] = [];

    for (const node of this.nodes) {
      if (!node.isDrop || !node.loose || node.depleted || node.exploding) continue;
      if (this.time.now < node.magnetReadyAt) continue; // player-dropped cooldown
      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, node.x, node.y);
      if (dist > MAGNET_RADIUS) continue;
      // The idle bob tween keeps yoyo-ing `y` on its own schedule; kill it
      // once the magnet takes over the node's position, or it fights the
      // pull and the piece appears to hover at a fixed offset instead of
      // closing the gap.
      this.tweens.killTweensOf(node);
      if (dist <= MAGNET_PICKUP_DIST) {
        toCollect.push(node);
        continue;
      }
      const angle = Phaser.Math.Angle.Between(node.x, node.y, this.player.x, this.player.y);
      node.x += Math.cos(angle) * step;
      node.y += Math.sin(angle) * step;
    }

    if (toCollect.length === 0) return;
    for (const node of toCollect) {
      this.collectNode(node);
      node.deplete();
    }
    this.nodes = this.nodes.filter((n) => !n.depleted);
    this.refreshHud();
  }

  // True while the inventory search box has keyboard focus — gameplay hotkeys
  // (hotbar 1-9, V/O/K/R/H/J/M) and player movement all suppress on this so
  // typed characters route to the search field.
  private typingInSearch(): boolean {
    return this.inventoryMenu.isSearchFocused();
  }

  private anyMenuOpen(): boolean {
    return (
      this.craftingMenu.isOpen() ||
      this.inventoryMenu.isOpen() ||
      this.dryingRackMenu.isOpen() ||
      this.cookingMenu.isOpen() ||
      this.jewelryMenu.isOpen() ||
      this.chestMenu.isOpen() ||
      this.contextMenu.isOpen() ||
      this.upgradeMenu.isOpen() ||
      this.characterMenu.isOpen() ||
      this.relicForgeMenu.isOpen()
    );
  }

  private selectHotbarSlot(slot: number): void {
    this.setHotbarSelection(slot);
  }

  // Skips empty slots — steps up to a full lap looking for the next occupied
  // one, per playtest feedback. If every slot in range is empty, the loop
  // completes a full lap and lands back on the starting slot (harmless no-op).
  private cycleHotbar(dir: number): void {
    const rowStart = this.wheelSpansBothRows ? 0 : this.hotbar.selected() < ROW1_COUNT ? 0 : ROW1_COUNT;
    const size = this.wheelSpansBothRows ? this.hotbar.size : ROW1_COUNT;
    let next = this.hotbar.selected();
    for (let i = 0; i < size; i++) {
      next = rowStart + (((next - rowStart + dir) % size) + size) % size;
      if (this.hotbar.get(next) !== null) break;
    }
    this.setHotbarSelection(next);
  }

  // Single entry point for changing the hotbar selection — number keys, the
  // scroll wheel, and left-clicking a slot all route here so they behave
  // identically. Placement mode follows the selection: a selected placeable is
  // in place mode (ghost armed for it); selecting anything else exits it.
  private setHotbarSelection(slot: number): void {
    this.hotbar.select(slot);
    this.recomputeEquipped();
    const stack = this.hotbar.get(slot);
    const placeable = !!(stack && itemDef(stack.key)?.placeable);
    if (placeable) {
      // Re-arm for the freshly selected slot (cancel first so switching from
      // one placeable to another repoints the ghost at the new item).
      if (this.placementMode) this.cancelPlacement();
      this.startItemPlacement(this.hotbar.container, slot);
    } else if (this.placementMode) {
      // Selected a tool/weapon/empty slot — leave placement mode so the
      // ghost/hint don't linger while something else is equipped.
      this.cancelPlacement();
    }
  }

  // The equipped tool/weapon is whatever sits in the selected hotbar slot —
  // single source of truth for both, plus the on-player equipped-item icon.
  private recomputeEquipped(): void {
    const stack = this.hotbar.get(this.hotbar.selected());
    const def = stack ? itemDef(stack.key) : undefined;
    this.equippedTool = def?.tool ?? null;
    this.equippedToolTier = def?.tool ? stack?.tier ?? 0 : 0;
    this.equippedWeapon = def?.weapon ?? null;
    this.equippedWeaponName = def?.weapon ? def.name : null;
    this.equippedWeaponTier = def?.weapon ? stack?.tier ?? 0 : 0;
    this.equippedWeaponAugment = def?.weapon ? augmentEffect(stack) : {};
    // Use the tiered texture so an upgraded tool/weapon (e.g. the Ironshod
    // stone_axe) shows its upgraded art on the player, not the base icon.
    const iconTexture =
      def && (def.tool || def.weapon) ? this.tieredStationTexture(stack!.key, stack?.tier ?? 0) : null;
    this.player.setEquippedIcon(iconTexture);
    // Held light source (M-DN) — a Torch (future Lantern) casts light around
    // the player at night. Data-driven per item key so a bigger-radius upgrade
    // just adds a row here. 0 = no light emitted.
    this.equippedLightRadius = stack ? (LIGHT_RADIUS_BY_ITEM[stack.key] ?? 0) : 0;
    this.hotbarUI.refresh();
    this.refreshHud();
  }

  // Subtle reach preview — visible whenever a tool or weapon is equipped
  // (unarmed has no reach to communicate), radius = flat REACH since all
  // melee currently shares one range (Milestone F).
  private updateAttackRangeRing(): void {
    this.attackRangeRing.clear();
    if (!this.rangeRingEnabled) return;
    if (!this.equippedTool && !this.equippedWeapon) return;
    const radius = (this.equippedWeapon && rangedWeaponConfig(this.equippedWeapon)?.maxRangePx) || REACH;
    this.attackRangeRing
      .lineStyle(1.5, 0xffffff, 0.25)
      .strokeCircle(this.player.x, this.player.y, radius);
  }

  // True when a screen point lands on a fixed HUD element that should swallow
  // the click rather than pass it through to the world.
  private pointerOverHud(pointer: Phaser.Input.Pointer): boolean {
    return (
      this.hotbarUI.slotAt(pointer.x, pointer.y) !== null ||
      this.eventLogUI.isPointerOver(pointer) ||
      this.keybindsUI.isPointerOver(pointer)
    );
  }

  // --- item drag/move (backpack <-> hotbar, and rearranging within either) ---

  private beginItemDrag(
    container: ItemContainer,
    index: number,
    pointer: Phaser.Input.Pointer,
  ): void {
    let stack = container.slot(index);
    if (!stack) return;
    if (this.isShiftClick(pointer) && stack.count > 1) {
      const splitIndex = this.trySplitStack(container, index);
      if (splitIndex !== null) index = splitIndex;
      stack = container.slot(index);
      if (!stack) return;
    }
    const def = itemDef(stack.key);
    if (!def) return;
    this.dragSource = { container, index };
    this.inventoryMenu.hideTooltip();
    this.hotbarUI.hideTooltip();
    this.dragGhost = this.add
      .image(pointer.x, pointer.y, def.texture)
      .setScrollFactor(0)
      .setDepth(5000)
      .setAlpha(0.85);
  }

  // Left-press on an occupied paper-doll slot — the drag-to-unequip gesture.
  // Mirrors beginItemDrag but the source is an equipment slot, not a
  // container/index pair.
  private beginArmorDrag(slot: EquipSlot, pointer: Phaser.Input.Pointer): void {
    const eq = this.equipment.get(slot);
    if (!eq) return;
    const def = itemDef(eq.key);
    if (!def) return;
    this.dragSource = { armorSlot: slot };
    this.inventoryMenu.hideTooltip();
    this.dragGhost = this.add
      .image(pointer.x, pointer.y, def.texture)
      .setScrollFactor(0)
      .setDepth(5000)
      .setAlpha(0.85);
  }

  // Ctrl+Left-Click is a one-press alias for every double-click-in-place
  // quick-move gesture below (inventory/hotbar/chest/drying rack) — per the
  // user, holding Ctrl should never require the double-click timing window.
  private isCtrlClick(pointer: Phaser.Input.Pointer): boolean {
    const e = pointer.event as (MouseEvent & { ctrlKey?: boolean }) | undefined;
    return !!e?.ctrlKey;
  }

  // Shift+Left-Click on a stack begins a split-drag instead of a whole-stack
  // drag — see trySplitStack.
  private isShiftClick(pointer: Phaser.Input.Pointer): boolean {
    const e = pointer.event as (MouseEvent & { shiftKey?: boolean }) | undefined;
    return !!e?.shiftKey;
  }

  // Splits the stack at container[index] roughly in half into another empty
  // slot in the same container, returning that slot's index (or null if the
  // container has no empty slot to split into, e.g. it's full — falls back to
  // a normal whole-stack drag in that case). Reuses the existing drag/drop
  // machinery unchanged: the split-off half is just what gets dragged, so
  // dropping it back in place re-merges via moveSlot like any other drag.
  // Mainly useful for loading a partial stack into a processor (Drying Rack)
  // input without committing the whole stack.
  private trySplitStack(container: ItemContainer, index: number): number | null {
    const stack = container.slot(index);
    if (!stack || stack.count < 2) return null;
    let emptyIndex: number | null = null;
    for (let i = 0; i < container.size; i++) {
      if (i !== index && container.slot(i) === null) {
        emptyIndex = i;
        break;
      }
    }
    if (emptyIndex === null) return null;
    const take = Math.floor(stack.count / 2);
    const remain = stack.count - take;
    container.set(index, { key: stack.key, count: remain, tier: stack.tier });
    container.set(emptyIndex, { key: stack.key, count: take, tier: stack.tier });
    return emptyIndex;
  }

  // True if this click-in-place on `key` should trigger its quick-move
  // action: either the second half of a genuine double-click (within
  // DOUBLE_CLICK_MS of the previous one on the same key), or a Ctrl-held
  // single click. Still runs the double-click bookkeeping either way so
  // click timing stays consistent regardless of which path fired.
  private isQuickMoveClick(pointer: Phaser.Input.Pointer, key: string): boolean {
    const isDouble = this.isDoubleClickInPlace(key);
    return isDouble || this.isCtrlClick(pointer);
  }

  // Returns true if this click-in-place on `key` is the second half of a
  // double-click (within DOUBLE_CLICK_MS of the previous one on the same
  // key) — and cancels any deferred single-click action still pending for
  // that key, since the double-click supersedes it.
  private isDoubleClickInPlace(key: string): boolean {
    const now = this.time.now;
    const isDouble = this.lastClickKey === key && now - this.lastClickAt <= MainScene.DOUBLE_CLICK_MS;
    if (isDouble) {
      this.pendingSingleClick?.remove(false);
      this.pendingSingleClick = null;
      this.lastClickKey = null;
    } else {
      this.lastClickKey = key;
      this.lastClickAt = now;
    }
    return isDouble;
  }

  // Defers a single-click action (currently only "enter placement mode" for
  // a backpack placeable) until DOUBLE_CLICK_MS has passed with no follow-up
  // click on the same slot — otherwise a double-click would arm placement
  // mode on its first half, then quick-move the item away on its second,
  // leaving placement mode referencing a backpack slot that's now empty.
  private deferSingleClick(action: () => void): void {
    this.pendingSingleClick?.remove(false);
    this.pendingSingleClick = this.time.delayedCall(MainScene.DOUBLE_CLICK_MS, () => {
      this.pendingSingleClick = null;
      action();
    });
  }

  private resolveItemDrag(pointer: Phaser.Input.Pointer): void {
    if (!this.dragSource) return;
    const src = this.dragSource;
    this.dragSource = null;
    this.dragGhost?.destroy();
    this.dragGhost = null;

    if ("armorSlot" in src) {
      this.resolveArmorDrag(src.armorSlot, pointer);
      return;
    }

    const stack = src.container.slot(src.index);
    if (!stack) return;

    // Drying Rack menu open: dropping on the input slot loads the stack into
    // the rack; the rack's own backpack grid is a rearrange target; dropped
    // outside the whole panel is a world-drop, same as any other menu.
    if (this.dryingRackMenu.isOpen()) {
      if (this.dryingRackMenu.isOverInput(pointer.x, pointer.y)) {
        this.loadRackInput(src.container, src.index);
        return;
      }
      const dropSide = this.dryingRackMenu.secondarySideAt(pointer.x, pointer.y);
      if (dropSide) {
        this.loadRackSecondary(dropSide, src.container, src.index);
        return;
      }
      const rackBagIndex = this.dryingRackMenu.slotIndexAt(pointer.x, pointer.y);
      if (rackBagIndex !== null) {
        // Click-in-place on the rack's own backpack grid: double-click or
        // Ctrl-click quick-loads the whole stack into the station, mirroring
        // the existing right-click quickLoad gesture. quickLoadStation routes
        // to the input OR fuel slot by item kind, so Ctrl-click works on the
        // Smelter's Hex Essence fuel too (not just the input).
        if (src.container === this.backpack && src.index === rackBagIndex) {
          if (this.isQuickMoveClick(pointer, `rack:${rackBagIndex}`)) this.quickLoadStation(this.backpack, rackBagIndex);
          return;
        }
        moveSlot(src.container, src.index, this.backpack, rackBagIndex);
        this.afterItemMove();
        return;
      }
      if (!this.dryingRackMenu.containsPoint(pointer.x, pointer.y)) {
        this.dropStackToWorld(src.container, src.index, stack);
      }
      return;
    }

    // Chest menu open (Gremlin Shack): dropping on the chest grid moves the
    // stack into it; the chest's own backpack grid is a rearrange target;
    // dropped outside the whole panel is a world-drop, same as the Drying
    // Rack. Not a "container kind" enum — a direct extension of the same
    // if-chain shape, same as the Drying Rack block above.
    if (this.chestMenu.isOpen()) {
      const chestContainer = this.openChest;
      const chestIndex = this.chestMenu.chestSlotIndexAt(pointer.x, pointer.y);
      if (chestIndex !== null) {
        // Click-in-place on the chest's own grid: double-click or Ctrl-click
        // quick-moves that stack back to the backpack (first assignable slot).
        if (chestContainer && src.container === chestContainer && src.index === chestIndex) {
          if (this.isQuickMoveClick(pointer, `chestout:${chestIndex}`)) {
            const to = this.backpack.findAssignable(stack.key);
            if (to !== null) moveSlot(chestContainer, chestIndex, this.backpack, to);
            this.afterItemMove();
          }
          return;
        }
        if (chestContainer) moveSlot(src.container, src.index, chestContainer, chestIndex);
        this.afterItemMove();
        return;
      }
      // No backpack-side branch any more: the chest menu shows only the chest
      // (see ChestMenu's header note), so there is no in-panel bag grid to
      // rearrange or drag into.
      if (!this.chestMenu.containsPoint(pointer.x, pointer.y)) {
        this.dropStackToWorld(src.container, src.index, stack);
      }
      return;
    }

    // Inventory menu open: its trash box permanently destroys the stack.
    if (this.inventoryMenu.isOpen() && this.inventoryMenu.isOverTrash(pointer.x, pointer.y)) {
      this.destroyStack(src.container, src.index, stack);
      return;
    }

    // Inventory menu open: dropping onto a compatible paper-doll slot equips
    // the item THERE specifically. The gate is by GROUP, not slot identity —
    // an item declares a group, not a destination (see EquipSlot), so every
    // ability item nominally says "ability1" and would otherwise only ever be
    // droppable on Q. Naming the slot is the point of the drag: it's how the
    // player picks which of Q/E/R (or which special) a piece goes to.
    // Dropping a non-equippable item, or one on a foreign group's slot, just
    // falls through and snaps back (nothing was removed).
    if (this.inventoryMenu.isOpen()) {
      const armorSlot = this.inventoryMenu.armorSlotAt(pointer.x, pointer.y);
      if (armorSlot !== null) {
        const declared = itemDef(stack.key)?.armorSlot;
        if (declared && slotGroup(declared) === slotGroup(armorSlot)) {
          this.equipArmorFromContainer(src.container, src.index, armorSlot);
        }
        return;
      }
    }

    // The Q/E/R HUD bar is a drop target too, whether or not the inventory is
    // open — that's the gesture players reach for first, instead of opening the
    // inventory to find the paper-doll ability slots (the user: "need to be able
    // to drag abilities straight to hotbar"). Same group gate as the paper-doll
    // branch above; index 0/1/2 maps to ability1/2/3, i.e. Q/E/R, since for
    // abilities POSITION IS THE HOTKEY.
    const abilityIndex = this.abilityBarUI.slotAt(pointer.x, pointer.y);
    if (abilityIndex !== null) {
      const declared = itemDef(stack.key)?.armorSlot;
      if (declared && slotGroup(declared) === "ability") {
        this.equipArmorFromContainer(src.container, src.index, ABILITY_SLOT_IDS[abilityIndex]);
      }
      return; // a non-ability item dropped here just snaps back
    }

    // Prefer a hotbar slot under the pointer, else a backpack slot.
    const hotIndex = this.hotbarUI.slotAt(pointer.x, pointer.y);
    if (hotIndex !== null) {
      // A click that never left the hotbar slot it started on isn't a
      // rearrange — it's a select, identical to a number-key/wheel select
      // (there's no other click-to-select). setHotbarSelection also drives
      // placement mode for placeables. Select fires immediately regardless
      // (idempotent, no reason to delay it); a second click within the
      // double-click window additionally quick-moves the stack back to the
      // backpack (was right-click, now double-left-click — see
      // isDoubleClickInPlace).
      if (src.container === this.hotbar.container && src.index === hotIndex) {
        this.setHotbarSelection(hotIndex);
        if (this.isQuickMoveClick(pointer, `hotbar:${hotIndex}`)) this.quickMoveItem(this.hotbar.container, hotIndex);
        return;
      }
      if (!itemDef(stack.key)?.hotbarable) return; // reject; snaps back
      moveSlot(src.container, src.index, this.hotbar.container, hotIndex);
      this.afterItemMove();
      return;
    }
    // Backpack grid (auto-organized, no free placement): a drop anywhere over
    // it means "put this in the backpack" (first matching/free slot). Only an
    // in-place click on the item's OWN cell keeps its quick-move / place-mode
    // behavior.
    if (this.inventoryMenu.isOverBackpackGrid(pointer.x, pointer.y)) {
      const cellIndex = this.inventoryMenu.slotIndexAt(pointer.x, pointer.y);
      if (src.container === this.backpack) {
        // In-place on its own cell: DOUBLE left-click quick-moves the stack (to
        // the hotbar, or equips it — see quickMoveItem); a SINGLE click on a
        // placeable enters placement mode instead (deferred behind the
        // double-click window). A drop onto a different cell is a no-op (no
        // manual arranging) — snap back.
        if (cellIndex === src.index) {
          const key = `bag:${src.index}`;
          if (this.isQuickMoveClick(pointer, key)) {
            this.quickMoveItem(this.backpack, src.index);
          } else if (itemDef(stack.key)?.placeable) {
            this.deferSingleClick(() => this.startItemPlacement(this.backpack, src.index));
          }
        }
        return;
      }
      // From the hotbar/chest/etc. into the backpack: merge or first free slot.
      const di = this.backpack.findAssignable(stack.key);
      if (di !== null) {
        moveSlot(src.container, src.index, this.backpack, di);
        this.afterItemMove();
      }
      return;
    }

    // Nothing resolved: if the drop isn't even over an open menu's panel or
    // fixed HUD, it was dragged out into the game world — drop it there as a
    // recoverable loose pickup. Missing a slot while still inside an open
    // panel just snaps back (unchanged prior behavior).
    const overPanel =
      this.pointerOverHud(pointer) ||
      (this.inventoryMenu.isOpen() && this.inventoryMenu.containsPoint(pointer.x, pointer.y)) ||
      (this.craftingMenu.isOpen() && this.craftingMenu.containsPoint(pointer.x, pointer.y));
    if (overPanel) return;
    // Dragging a placeable OUT of the hotbar (either row) reads as "place
    // this", not "throw it away" — re-arms placement mode exactly like a
    // click-select would, instead of dropping it as a loose pickup
    // (playtest: dragging a station out of the processor row was dropping
    // it on the ground). Backpack-sourced drags keep dropping to the world —
    // that's still the deliberate "get rid of this" gesture there.
    if (src.container === this.hotbar.container && itemDef(stack.key)?.placeable) {
      this.setHotbarSelection(src.index);
      return;
    }
    this.dropStackToWorld(src.container, src.index, stack);
  }

  // Resolves a drag started from an equipped paper-doll slot — the
  // drag-to-unequip gesture, plus rearranging within a group. Dropping on
  // another slot of the same group swaps the two; dropping on a backpack slot
  // unequips there specifically; dropping outside every panel/HUD unequips to
  // the floor.
  private resolveArmorDrag(slot: EquipSlot, pointer: Phaser.Input.Pointer): void {
    if (!this.inventoryMenu.isOpen()) return; // can't have started this drag otherwise
    // Drag an equipped piece onto the trash box to permanently destroy it —
    // the last inventory drag path that was missing (S6).
    if (this.inventoryMenu.isOverTrash(pointer.x, pointer.y)) {
      this.destroyEquippedSlot(slot);
      return;
    }
    const overSlot = this.inventoryMenu.armorSlotAt(pointer.x, pointer.y);
    if (overSlot !== null) {
      // Slot-to-slot within one group is a reorder, not a no-op — for abilities
      // that's the only way to change which of Q/E/R an already-worn ability
      // sits on, since position IS the hotkey (SLOT_ABILITY_KEY). Group-generic,
      // so the four specials get it too. Cross-group drops still snap back.
      if (overSlot !== slot && slotGroup(overSlot) === slotGroup(slot)) this.swapEquippedSlots(slot, overSlot);
      return;
    }

    // Over the backpack grid: unequip into the backpack (first free slot —
    // the auto-organized view has no manual placement).
    if (this.inventoryMenu.isOverBackpackGrid(pointer.x, pointer.y)) {
      this.unequipArmorSlot(slot);
      return;
    }

    if (!this.inventoryMenu.containsPoint(pointer.x, pointer.y) && !this.pointerOverHud(pointer)) {
      this.unequipArmorSlot(slot);
    }
  }

  // Swap (or move, if the target is empty) two equipped slots of the same
  // group. Nothing leaves the equipment, so there's no backpack-full case to
  // handle — unlike every other equip path.
  private swapEquippedSlots(from: EquipSlot, to: EquipSlot): void {
    const a = this.equipment.get(from);
    if (!a) return;
    const b = this.equipment.get(to);
    // An open Upgrade panel is pinned to a SLOT, so a swap would silently
    // repoint it at a different piece (same reasoning as unequipArmorSlot).
    const t = this.upgradeTarget;
    if (t && "armorSlot" in t && (t.armorSlot === from || t.armorSlot === to)) this.closeUpgradeMenu();
    this.equipment.set(to, a);
    this.equipment.set(from, b);
    this.afterItemMove();
  }

  // Permanently destroy the item equipped in a paper-doll slot (drag-to-trash)
  // — no refund/floor pickup, mirroring destroyStack for backpack items.
  private destroyEquippedSlot(slot: EquipSlot): void {
    const eq = this.equipment.get(slot);
    if (!eq) return;
    // The Upgrade panel's target no longer exists once destroyed — close it
    // (mirrors unequipArmorSlot).
    const t = this.upgradeTarget;
    if (t && "armorSlot" in t && t.armorSlot === slot) this.closeUpgradeMenu();
    this.equipment.set(slot, null);
    this.eventLog.add("info", `Destroyed ${itemDef(eq.key)?.name ?? eq.key}`);
    this.afterItemMove();
  }

  // Remove a whole stack from the inventory and spawn it as a recoverable
  // loose pickup near the player (magnet-cooldown gated so it doesn't
  // instantly fly back in) — the "Drop" half of the drop/destroy pair.
  private dropStackToWorld(
    container: ItemContainer,
    index: number,
    stack: { key: string; count: number },
  ): void {
    container.set(index, null);
    const name = itemDef(stack.key)?.name ?? stack.key;
    this.spawnLooseDrop(stack.key, stack.count, this.player.x, this.player.y, DROPPED_ITEM_MAGNET_COOLDOWN_MS);
    this.eventLog.add("info", `Dropped ${name} x${stack.count}`);
    this.afterItemMove();
  }

  // Permanently remove a whole stack from the inventory — no refund, no
  // floor pickup. The "Destroy" half of the drop/destroy pair.
  private destroyStack(
    container: ItemContainer,
    index: number,
    stack: { key: string; count: number },
  ): void {
    container.set(index, null);
    const name = itemDef(stack.key)?.name ?? stack.key;
    this.eventLog.add("info", `Destroyed ${name} x${stack.count}`);
    this.afterItemMove();
  }

  // Double-left-click-in-place (was right-click — see resolveItemDrag):
  // move backpack->hotbar (if hotbar-able), hotbar->backpack, or equip if
  // it's an armor item. Placeables are hotbar-able too, so double-clicking
  // one in the backpack just quick-moves it like any other item; a single
  // click there is what enters placement mode instead (also in
  // resolveItemDrag, deferred behind the double-click window).
  private quickMoveItem(container: ItemContainer, index: number): void {
    const stack = container.slot(index);
    if (!stack) return;

    if (container !== this.hotbar.container && itemDef(stack.key)?.armorSlot) {
      this.equipArmorFromContainer(container, index);
      return;
    }

    if (container === this.hotbar.container) {
      const to = this.backpack.findAssignable(stack.key);
      if (to !== null) moveSlot(container, index, this.backpack, to);
    } else {
      if (!itemDef(stack.key)?.hotbarable) return;
      const to = this.findHotbarSlotFor(stack.key);
      if (to !== null) moveSlot(container, index, this.hotbar.container, to);
    }
    this.afterItemMove();
  }

  // Slot within the hotbar's flat 18-slot ItemContainer to send `key` to on a
  // quick-move/auto-pickup — placeables (crafting stations/processors)
  // prefer the dedicated row 2 (indices ROW1_COUNT..) first, per the user's
  // "auto-pickup of a loose station should place it there instead of your
  // backpack by default" request, falling back to a normal row-1-first
  // findAssignable() for everything else (and for a placeable when row 2 is
  // full, so it doesn't get stuck unassignable while row 1 has room).
  private findHotbarSlotFor(key: string): number | null {
    if (itemDef(key)?.placeable) {
      const row2Slot = this.hotbarRow2Assignable(key);
      if (row2Slot !== null) return row2Slot;
    }
    return this.hotbar.container.findAssignable(key);
  }

  private hotbarRow2Assignable(key: string): number | null {
    const max = itemDef(key)?.maxStack ?? 99;
    for (let i = ROW1_COUNT; i < this.hotbar.size; i++) {
      const s = this.hotbar.container.slot(i);
      if (s && s.key === key && s.count < max) return i;
    }
    for (let i = ROW1_COUNT; i < this.hotbar.size; i++) {
      if (this.hotbar.container.slot(i) === null) return i;
    }
    return null;
  }

  private afterItemMove(): void {
    this.recomputeEquipped();
    this.recomputeSetBonuses();
    this.recomputeAbilities();
    this.equipEffects.recompute(this.equipment);
    this.reconcileBackpackDiscovery();
    this.inventoryMenu.refresh();
    // The "upgrade ready" glyphs depend on backpack materials, which this move
    // may have changed even when nothing NEW was discovered (so
    // reconcileBackpackDiscovery's refreshDiscovery path didn't fire) — refresh
    // the station glyphs so they track affordability (S3). The hotbar's own
    // arrows are already covered by recomputeEquipped's refresh above.
    this.refreshStationUpgradeIndicators();
    this.dryingRackMenu.refresh();
    this.cookingMenu.refresh();
    this.jewelryMenu.refresh();
    this.chestMenu.refresh();
  }

  // Anything that lands in the backpack via a container move (chest loot,
  // drying-rack retrieval, etc.) counts as discovered, exactly like a world
  // pickup. Those paths use moveSlot() directly and skip addToBackpack's
  // discovery hook, so a material first seen inside a chest never unlocked its
  // recipes. Reconcile against the backpack here; refreshDiscovery only runs
  // when something genuinely new shows up.
  private reconcileBackpackDiscovery(): void {
    let changed = false;
    for (let i = 0; i < this.backpack.size; i++) {
      const stack = this.backpack.slot(i);
      if (stack && !this.discovered.has(stack.key)) {
        this.discoverMaterial(stack.key);
        changed = true;
      }
    }
    if (changed) this.refreshDiscovery();
  }

  // --- Drying Rack (processing station) ---

  private createDryingRackMenu(): void {
    this.dryingRackMenu = new DryingRackMenu(this, {
      backpack: this.backpack,
      skills: this.skills,
      station: () => this.openRack,
      beginDrag: (c, i, p) => this.beginItemDrag(c, i, p),
      quickLoad: (i) => this.quickLoadStation(this.backpack, i),
      isDragging: () => this.dragSource !== null,
      retrieveInput: () => this.retrieveRackInput(),
      retrieveSecondary: (side) => this.retrieveRackSecondary(side),
      // The Smelter's reagent/fuel live in their own loaded slots, so process is
      // the same call for both stations — station.process() spends them itself.
      processAmount: (amount) => this.processRackAmount(amount),
      // The same menu serves the Smelter — switch title/verb by kind.
      title: () => (this.openStationKind === "smelter" ? "Smelter" : "Drying Rack"),
      descKey: () => (this.openStationKind === "smelter" ? "smelter" : "drying_rack"),
      actionLabel: () => (this.openStationKind === "smelter" ? "Smelt" : "Process"),
      busyLabel: () => (this.openStationKind === "smelter" ? "Smelting…" : "Drying…"),
    });
  }

  private openDryingRackMenu(image: Phaser.GameObjects.Image): void {
    const rack = this.dryingRacks.find((r) => r.image === image);
    if (!rack) return;
    this.craftingMenu.close();
    this.inventoryMenu.close();
    this.closeUpgradeMenu();
    this.closeRelicForgeMenu();
    this.openStationKind = "rack";
    this.openRack = rack.station;
    this.dryingRackMenu.openMenu();
  }

  // A placed Smelter reuses the Drying Rack's processing menu (both are
  // ProcessingStations) — openStationKind flips the menu's title/verb and shows
  // the dedicated fuel slot; station.process() burns the loaded fuel itself.
  private openSmelterMenu(image: Phaser.GameObjects.Image): void {
    const smelter = this.smelters.find((s) => s.image === image);
    if (!smelter) return;
    this.craftingMenu.close();
    this.inventoryMenu.close();
    this.closeUpgradeMenu();
    this.closeRelicForgeMenu();
    this.closeCookingMenu();
    this.closeChestMenu();
    // Reflect the placed Smelter's upgrade tier so rare-ore recipes unlock.
    smelter.station.setTier((image.getData("tier") as number | undefined) ?? 0);
    this.openStationKind = "smelter";
    this.openRack = smelter.station;
    this.dryingRackMenu.openMenu();
  }

  private closeDryingRackMenu(): void {
    // Closing the menu returns anything still loaded in the station's slots to
    // the backpack (floor fallback if full) — processing is instant, so nothing
    // should sit stranded in a Smelter/Drying Rack after you walk away.
    if (this.openRack) this.refundStationSlots(this.openRack);
    this.dryingRackMenu.close();
    this.openRack = null;
    this.openStationKind = "rack";
  }

  // Drain a station's loaded slots back into the backpack; overflow drops as a
  // loose pickup at the station's position. Used by closeDryingRackMenu (menu
  // close) — destroy uses drainAll directly to drop everything loose instead.
  private refundStationSlots(station: ProcessingStation): void {
    const drained = station.drainAll();
    if (drained.length === 0) return;
    const img =
      this.dryingRacks.find((r) => r.station === station)?.image ??
      this.smelters.find((s) => s.station === station)?.image;
    const x = img?.x ?? this.player.x;
    const y = img?.y ?? this.player.y;
    for (const slot of drained) {
      const remaining = this.backpack.add(slot.key, slot.count); // merges + returns overflow
      if (remaining > 0) this.spawnLooseDrop(slot.key, remaining, x, y, DROPPED_ITEM_MAGNET_COOLDOWN_MS);
    }
  }

  // --- Campfire cooking + food buffs ---

  private createCookingMenu(): void {
    this.cookingMenu = new CookingMenu(this, {
      backpack: this.backpack,
      skills: this.skills,
      discovered: () => this.discovered,
      campfireTier: () =>
        this.openCampfire ? ((this.openCampfire.getData("tier") as number | undefined) ?? 0) : null,
      cook: (recipeId, batches) => this.cookAtCampfire(recipeId, batches),
      maxBatches: (recipe) => this.maxCookBatches(recipe),
      noBuildCost: () => this.devNoBuildCost,
    });
  }

  private openCookingMenu(image: Phaser.GameObjects.Image): void {
    this.craftingMenu.close();
    this.inventoryMenu.close();
    this.closeUpgradeMenu();
    this.closeDryingRackMenu();
    this.closeCookingMenu();
    this.closeChestMenu();
    this.closeRelicForgeMenu();
    this.openCampfire = image;
    this.cookingMenu.openMenu();
  }

  private closeCookingMenu(): void {
    this.cookingMenu.close();
    this.openCampfire = null;
  }

  // --- Gemwright's Table (jewelry crafting — B3-P2b) ---
  // A dedicated station with its own recipe-list menu, cloned from the
  // Campfire+Cooking pattern. Tier (== upgrade count) gates the recipes: tier 0
  // = passive jewelry, tier 1 (Duneshaper's-Heart upgrade) = the ability specials.

  private createJewelryMenu(): void {
    this.jewelryMenu = new JewelryMenu(this, {
      backpack: this.backpack,
      skills: this.skills,
      discovered: () => this.discovered,
      stationTier: () =>
        this.openJewelry ? ((this.openJewelry.getData("tier") as number | undefined) ?? 0) : null,
      craft: (recipeId, batches) => this.craftAtJewelry(recipeId, batches),
      maxBatches: (recipe) => this.maxJewelryBatches(recipe),
      noBuildCost: () => this.devNoBuildCost,
      augmentTargets: () => this.augmentTargets(),
      availableAugments: () => this.availableAugments(),
      ownsOutput: (itemKey) => this.ownsItemAnywhere(itemKey),
      canAffordAugment: (aug) => this.canAffordAugment(aug),
      applyAugment: (targetId, augId) => this.applyAugmentToTarget(targetId, augId),
    });
  }

  private openJewelryMenu(image: Phaser.GameObjects.Image): void {
    this.craftingMenu.close();
    this.inventoryMenu.close();
    this.closeUpgradeMenu();
    this.closeDryingRackMenu();
    this.closeCookingMenu();
    this.closeChestMenu();
    this.closeRelicForgeMenu();
    this.openJewelry = image;
    this.jewelryMenu.openMenu();
  }

  private closeJewelryMenu(): void {
    this.jewelryMenu.close();
    this.openJewelry = null;
  }

  // Craft `batches` of a jewelry recipe — consumes inputs, deposits the piece
  // (overflow drops on the floor). Mirrors cookAtCampfire exactly.
  private craftAtJewelry(recipeId: string, batches: number = 1): void {
    const recipe = JEWELRY_RECIPES.find((r) => r.id === recipeId);
    if (!recipe || !this.openJewelry) return;
    const tier = (this.openJewelry.getData("tier") as number | undefined) ?? 0;
    if (!this.devNoBuildCost && tier < recipe.requiredStationTier) return;
    const affordable =
      this.devNoBuildCost ||
      Object.entries(recipe.inputs).every(([key, n]) => this.backpack.count(key) >= n * batches);
    if (!affordable) return;
    for (let i = 0; i < batches; i++) {
      if (!this.devNoBuildCost) {
        for (const [key, n] of Object.entries(recipe.inputs)) this.backpack.removeCount(key, n);
      }
      const leftover = this.addToBackpack(recipe.output, 1);
      if (leftover > 0) {
        this.spawnLooseDrop(recipe.output, leftover, this.player.x, this.player.y, DROPPED_ITEM_MAGNET_COOLDOWN_MS);
        this.eventLog.add("info", "Backpack full — the piece landed on the floor");
      }
    }
    this.eventLog.add("info", batches > 1 ? `Crafted ${batches}x ${recipe.name}` : `Crafted ${recipe.name}`);
    this.sfx.craft();
    this.afterItemMove();
  }

  private maxJewelryBatches(recipe: JewelryRecipe): number {
    const roomBatches = this.backpack.roomFor(recipe.output);
    if (this.devNoBuildCost) return Math.max(0, roomBatches);
    let costBatches = Infinity;
    for (const [key, n] of Object.entries(recipe.inputs)) {
      if (n <= 0) continue;
      costBatches = Math.min(costBatches, Math.floor(this.backpack.count(key) / n));
    }
    if (!Number.isFinite(costBatches)) costBatches = 0;
    return Math.max(0, Math.min(costBatches, roomBatches));
  }

  // --- Relic Forge (M-RL) ---

  private createRelicForgeMenu(): void {
    this.relicForgeMenu = new RelicForgeMenu(this, {
      backpack: this.backpack,
      relics: this.relics,
      // Resolve the roll now (consume trophy + mutate RelicManager) but defer
      // the log/HUD-sync to the slot-machine reveal landing (announceRoll).
      roll: (trophyKey) => this.rollRelic(trophyKey, false),
      announceRoll: (result) => this.announceRelicResult(result),
      refine: (recipeId) => this.refineTrophies(recipeId),
      forgeTier: () => (this.openForge?.getData("tier") as number | undefined) ?? 0,
      convert: (id, runs) => this.convertShards(id, runs),
      resolveFamilyChoice: (keepNew) => this.resolveRelicFamilyChoice(keepNew),
      commitCandidate: (id) => this.commitRelicCandidate(id),
      hasDiscovered: (key) => this.discovered.has(key),
      noBuildCost: () => this.devNoBuildCost,
    });
  }

  private openRelicForgeMenu(image: Phaser.GameObjects.Image): void {
    this.craftingMenu.close();
    this.inventoryMenu.close();
    this.characterMenu?.close(); // K panel is mutually exclusive with station menus
    this.closeUpgradeMenu();
    this.closeDryingRackMenu();
    this.closeCookingMenu();
    this.closeChestMenu();
    this.closeRelicForgeMenu();
    this.openForge = image;
    this.relicForgeMenu.openMenu();
  }

  private closeRelicForgeMenu(): void {
    this.relicForgeMenu.close();
    this.openForge = null;
  }

  // Attempt one relic roll by consuming a trophy of `trophyKey`. Probabilistic
  // (M-RL): the trophy is consumed whether the roll succeeds or fails; success
  // chance + a pity counter live in RelicManager.roll(). Re-guarded against an
  // empty backpack even though the menu gates its button. Returns the outcome so
  // the forge menu can show inline feedback.
  private rollRelic(trophyKey: string, announce = true): RollResult | null {
    if (!TROPHY_ROLL[trophyKey]) return null;
    // nobuildcost rolls without owning (or spending) a trophy — relic testing
    // shouldn't require farming elites first.
    if (!this.devNoBuildCost) {
      if (this.backpack.count(trophyKey) < 1) return null;
      this.backpack.removeCount(trophyKey, 1);
    }
    this.lastRollTrophyKey = trophyKey;
    const result = this.relics.roll(trophyKey);
    // The forge menu defers this to the slot-machine reveal (announce=false) so
    // the log + relic-bar + stat bonuses land at the satisfying moment.
    if (announce) this.announceRelicResult(result);
    return result;
  }

  // Log the outcome + re-sync the HUD/stat bonuses. Called at reveal time by the
  // forge menu's deferred announceRoll, or inline for any non-menu roll path.
  // Append one line to the run summary's relic ledger. Logged at the REVEAL
  // rather than at the click, matching announceRelicResult's own deferral — the
  // ledger should say what the player saw. Settles questions the event log
  // can't ("4 rares in a row, is that even possible?") because it survives to
  // the end screen instead of scrolling away.
  private recordRelicRollToLog(result: RollResult | null): void {
    const trophy = this.lastRollTrophyKey ? itemDef(this.lastRollTrophyKey)?.name ?? this.lastRollTrophyKey : "Trophy";
    // The BUCKET this roll counts toward, not a description of it — RunLog
    // tallies these rather than listing individual rolls (see its header).
    let outcome = "crumbled";
    if (result?.success && result.candidates?.length && !result.id) {
      outcome = rarityName(result.rarity ?? "mythic");
    } else if (result?.success && result.id) {
      outcome = rarityName(RELIC_DEFS[result.id].rarity);
    }
    this.runLog.recordRelicRoll(this.run.elapsedMs, trophy, outcome);
    // No timeline entry here — the timeline is boss kills only (see RunLog.ts).
    // Rare/Mythic relics still show in full via the Relic Rolls tally above.
  }

  private announceRelicResult(result: RollResult | null): void {
    const tex = this.lastRollTrophyKey ? itemDef(this.lastRollTrophyKey)?.texture : undefined;
    this.recordRelicRollToLog(result);
    // Phase 5 (biome 3): a boss trophy landed on a CHOICE of candidates — there's
    // no relic to name or grant yet, so the real announce is deferred to the pick
    // (commitRelicCandidate). Only the HUD/menu refresh runs now.
    if (result?.success && result.candidates?.length && !result.id) {
      this.eventLog.add("recipe", `The forge offers ${result.candidates.length} relics — choose one`, tex);
      this.afterRelicChange();
      return;
    }
    if (result?.success && result.id) {
      const def = RELIC_DEFS[result.id];
      this.eventLog.add("recipe", `Relic forged: ${def.name} (${rarityName(def.rarity)})`, tex);
      // Phase 5: the new relic contests a family slot already owned.
      // "replaced"/"declined" are auto-resolved by RelicManager.roll() —
      // grant the refund now. "choice" is left unresolved (ownership
      // untouched) until the player picks via the forge menu's prompt.
      const conflict = result.familyConflict;
      if (conflict?.verdict === "replaced") {
        // Old relic displaced — no refund; grantRelicRefund just logs it.
        this.grantRelicRefund(conflict.refundShardKey!, conflict.refundShardAmount!, RELIC_DEFS[conflict.oldId].name);
      } else if (conflict?.verdict === "declined") {
        // The JUST-ROLLED relic (def) is the one discarded — refund half its
        // trophy's shard cost (0 for a free raw trophy).
        this.grantRelicRefund(conflict.refundShardKey!, conflict.refundShardAmount!, def.name);
      } else if (conflict?.verdict === "choice") {
        this.pendingRelicChoice = result;
      }
    } else if (result) {
      this.eventLog.add("info", "The trophy crumbled to dust — no relic this time.", tex);
    }
    this.afterRelicChange();
  }

  // Grant a shard refund from a discarded/declined relic (Phase 5 family
  // conflicts) — drops to the floor if the backpack is full, same pattern as
  // refineTrophies' output grant.
  private grantRelicRefund(shardKey: string, amount: number, discardedName: string): void {
    // A discarded relic refunds half its trophy's shard cost (0 for a free raw
    // trophy, or on an upgrade where the OLD relic is displaced) — see
    // Relics.trophyDiscardRefund. A zero amount just logs the discard.
    if (amount <= 0) {
      this.eventLog.add("info", `${discardedName} discarded.`);
      return;
    }
    const leftover = this.addToBackpack(shardKey, amount);
    if (leftover > 0) {
      this.spawnLooseDrop(shardKey, leftover, this.player.x, this.player.y, DROPPED_ITEM_MAGNET_COOLDOWN_MS);
    }
    const shardDef = itemDef(shardKey);
    this.eventLog.add("info", `${discardedName} discarded — +${amount} ${shardDef?.name ?? shardKey}`, shardDef?.texture);
  }

  // Commit one of a boss trophy's candidate relics (biome-3 Phase 5) once the
  // player picks in the forge menu. RelicManager validates that `id` was
  // actually offered, then resolves it through the SAME family-dominance path a
  // normal roll uses — so announceRelicResult can handle the completed result
  // (log + any refund + HUD sync) with no special-casing.
  private commitRelicCandidate(id: string): RollResult | null {
    const result = this.relics.commitCandidate(id);
    if (!result) return null;
    this.announceRelicResult(result);
    return result;
  }

  // Finalize a pending "ambiguous" family-conflict choice (Phase 5) once the
  // player picks Keep New / Keep Old in the forge menu. Returns the refund
  // info for the menu's own result-line rendering.
  private resolveRelicFamilyChoice(keepNew: boolean): ChoiceResolution | null {
    const pending = this.pendingRelicChoice;
    if (!pending?.familyConflict || pending.familyConflict.verdict !== "choice" || !pending.id || pending.powerTier === undefined) {
      return null;
    }
    const resolution = this.relics.resolveChoice(pending.familyConflict.family, keepNew, pending.id, pending.powerTier);
    if (!resolution) return null;
    this.pendingRelicChoice = null;
    this.grantRelicRefund(resolution.refundShardKey, resolution.refundShardAmount, RELIC_DEFS[resolution.discardedId].name);
    this.afterRelicChange();
    return resolution;
  }

  // One conversion per call; the menu's Convert tab calls this repeatedly for a
  // batch. Re-guards station tier + affordability defensively (the menu already
  // gates its button).
  //
  // One shard conversion, identified by its SHARD_CONVERSIONS row. Was
  // Gloam->Ember specifically; the bayou added Ember->Mire, and a second
  // near-identical method is how the tier gate and the ratio drift apart.
  // `runs` supports the forge's "Convert All" button. Batched INSIDE one call
  // rather than by calling this N times, so a 50-shard render produces one
  // toast and one sound instead of fifty — the same toast-spam rule the upgrade
  // announcements already follow. Each run still re-checks cost, so a batch can
  // never spend shards the player doesn't have.
  private convertShards(conversionId: string, runs = 1): void {
    const conv = SHARD_CONVERSIONS.find((c) => c.id === conversionId);
    if (!conv) return;
    const toName = itemDef(conv.toKey)?.name ?? conv.toKey;
    let made = 0;
    let dropped = 0;
    for (let i = 0; i < Math.max(1, runs); i++) {
      if (!this.devNoBuildCost) {
        if (((this.openForge?.getData("tier") as number | undefined) ?? 0) < conv.minStationTier) break;
        if (this.backpack.count(conv.fromKey) < conv.ratio) break;
        this.backpack.removeCount(conv.fromKey, conv.ratio);
      }
      const leftover = this.addToBackpack(conv.toKey, 1);
      if (leftover > 0) {
        this.spawnLooseDrop(conv.toKey, leftover, this.player.x, this.player.y, DROPPED_ITEM_MAGNET_COOLDOWN_MS);
        dropped += leftover;
      }
      made += 1;
    }
    if (made === 0) return;
    if (dropped > 0) {
      this.eventLog.add("info", `Backpack full — ${dropped}x ${toName.toLowerCase()} landed on the floor`);
    }
    this.discoverMaterial(conv.toKey);
    this.eventLog.add(
      "recipe",
      `Rendered ${itemDef(conv.fromKey)?.name ?? conv.fromKey} into ${made}x ${toName}`,
      itemDef(conv.toKey)?.texture,
    );
    this.sfx.craft();
    this.afterRelicChange();
  }

  // Shared post-roll refresh: relic effects may change max HP/stamina, and both
  // the forge menu (owned grid + trophy counts) and the HUD relic bar need
  // re-syncing; a consumed trophy also changed backpack/hotbar counts.
  private afterRelicChange(): void {
    this.syncStatBonuses();
    this.relicForgeMenu.refresh();
    this.passiveBarUI.sync(this.passiveEntries());
    this.inventoryMenu.refresh();
    this.hotbarUI.refresh();
  }

  // Refine raw trophies + Gloam Shards into a refined trophy (Gloaming Vein
  // loop). Re-guards affordability (the menu gates its button), consumes
  // inputCount raw trophies of the recipe's rarity — drawn greedily across the
  // eligible species — plus shardCount Gloam Shards, and grants 1 refined
  // trophy. Called at the ProgressBar's completion from the forge menu.
  private refineTrophies(recipeId: string): void {
    const recipe = REFINE_RECIPES.find((r) => r.id === recipeId);
    if (!recipe) return;
    // Gated on Relic Forge Lvl 2 (the menu already hides refine rows below it;
    // re-guard defensively). nobuildcost skips the tier gate + the inputs.
    if (!this.devNoBuildCost) {
      if (((this.openForge?.getData("tier") as number | undefined) ?? 0) < 1) return;
      if (!canAffordRefine(recipe, (k) => this.backpack.count(k))) return;

      let remaining = recipe.inputCount;
      for (const key of refinableTrophyKeys(recipe.inputRarity, recipe.tier)) {
        if (remaining <= 0) break;
        const take = Math.min(remaining, this.backpack.count(key));
        if (take > 0) {
          this.backpack.removeCount(key, take);
          remaining -= take;
        }
      }
      this.backpack.removeCount(recipe.shardKey, recipe.shardCount);
    }

    const leftover = this.addToBackpack(recipe.output, 1);
    if (leftover > 0) {
      this.spawnLooseDrop(recipe.output, leftover, this.player.x, this.player.y, DROPPED_ITEM_MAGNET_COOLDOWN_MS);
      this.eventLog.add("info", "Backpack full — the refined trophy landed on the floor");
    }
    const def = itemDef(recipe.output);
    this.eventLog.add("recipe", `Refined into ${def?.name ?? recipe.output}`, def?.texture);
    this.sfx.craft();
    this.afterRelicChange();
  }

  // Record the highest-tier campfire ever placed/upgraded, then re-run the
  // announce pass — fired on first campfire placement (tier 0) and on
  // upgrade (tier 1). Mirrors the recipe-unlock toast the crafting system
  // uses, but a dish also needs every ingredient DISCOVERED (not just a
  // high-enough campfire) before it announces — otherwise "New Recipe
  // Unlocked! Cooked Boar Meat" could fire the moment any campfire goes down,
  // before the player has ever obtained a shishkabob or boar meat.
  private discoverCookRecipes(maxTier: number): void {
    this.campfireMaxTierSeen = Math.max(this.campfireMaxTierSeen, maxTier);
    this.announceCookRecipes();
  }

  private announceCookRecipes(): void {
    if (this.campfireMaxTierSeen < 0) return;
    for (const r of COOK_RECIPES) {
      if (r.requiredCampfireTier > this.campfireMaxTierSeen) continue;
      if (this.discoveredCookRecipeIds.has(r.id)) continue;
      if (!Object.keys(r.inputs).every((key) => this.discovered.has(key))) continue;
      this.discoveredCookRecipeIds.add(r.id);
      this.eventLog.add("recipe", `New Recipe Unlocked! ${r.name}`, itemDef(r.output)?.texture);
    }
  }

  // Cook a dish at the open campfire: re-check tier + affordability (the menu
  // gates its button, but re-guard defensively), consume inputs, and deposit
  // the food. Overflow drops on the floor rather than being lost — same pattern
  // as the Drying Rack's processed output.
  // `batches` cooks the same dish that many times in one call (a bulk-cook
  // slider, mirrors craftRecipe's batch param) — defaults to 1.
  private cookAtCampfire(recipeId: string, batches: number = 1): void {
    const recipe = COOK_RECIPES.find((r) => r.id === recipeId);
    if (!recipe || !this.openCampfire) return;
    const tier = (this.openCampfire.getData("tier") as number | undefined) ?? 0;
    if (!this.devNoBuildCost && tier < recipe.requiredCampfireTier) return;
    const affordable =
      this.devNoBuildCost ||
      Object.entries(recipe.inputs).every(([key, n]) => this.backpack.count(key) >= n * batches);
    if (!affordable) return;
    for (let i = 0; i < batches; i++) {
      if (!this.devNoBuildCost) {
        for (const [key, n] of Object.entries(recipe.inputs)) this.backpack.removeCount(key, n);
      }
      const leftover = this.addToBackpack(recipe.output, 1);
      if (leftover > 0) {
        this.spawnLooseDrop(recipe.output, leftover, this.player.x, this.player.y, DROPPED_ITEM_MAGNET_COOLDOWN_MS);
        this.eventLog.add("info", "Backpack full — the dish landed on the floor");
      }
    }
    this.eventLog.add("info", batches > 1 ? `Cooked ${batches}x ${recipe.name}` : `Cooked ${recipe.name}`);
    this.sfx.craft();
    this.afterItemMove();
  }

  // Max number of times a cook recipe could run right now — the lower of
  // "can afford N batches" and "backpack has room for N dishes".
  private maxCookBatches(recipe: CookRecipe): number {
    const roomBatches = this.backpack.roomFor(recipe.output);
    // DEV nobuildcost: ingredients are free, but backpack room still caps it.
    if (this.devNoBuildCost) return Math.max(0, roomBatches);
    let costBatches = Infinity;
    for (const [key, n] of Object.entries(recipe.inputs)) {
      if (n <= 0) continue;
      costBatches = Math.min(costBatches, Math.floor(this.backpack.count(key) / n));
    }
    if (!Number.isFinite(costBatches)) costBatches = 0;
    return Math.max(0, Math.min(costBatches, roomBatches));
  }

  // Eat one `edible` item from `container[index]`, applying its heal-over-time
  // buff (Buffs.ts). Right-click gesture on food in the backpack/hotbar. No
  // instant heal — the buff does the healing over its duration, per design.
  private eatItem(container: ItemContainer, index: number): void {
    const stack = container.slot(index);
    if (!stack) return;
    const def = itemDef(stack.key);
    if (!def?.edible) return;
    this.hints.trigger("multi_food_tip");
    container.removeCount(stack.key, 1);
    this.buffs.apply({
      id: def.key,
      name: def.name,
      icon: def.texture,
      hpPerSec: def.edible.hpPerSec,
      durationMs: def.edible.durationMs,
    });
    this.buffBarUI.sync(this.buffs.active());
    this.statusBarUI.sync(this.statusEffects());
    this.eventLog.add("info", `Ate ${def.name}`);
    this.afterItemMove();
  }

  // --- Gremlin Shack (POI) ---

  private createChestMenu(): void {
    this.chestMenu = new ChestMenu(this, {
      backpack: this.backpack,
      skills: this.skills,
      chest: () => this.openChest,
      beginDrag: (c, i, p) => this.beginItemDrag(c, i, p),
      isDragging: () => this.dragSource !== null,
    });
  }

  // Opens the shared ChestMenu bound to any LootContainer (Gremlin Shack chest
  // or Duskrunner Warren cache) — rolls its table lazily on first open.
  private openChestMenu(loot: LootContainer, table: LootRollEntry[]): void {
    this.craftingMenu.close();
    this.inventoryMenu.close();
    this.closeUpgradeMenu();
    this.closeRelicForgeMenu();
    this.rollContainerLoot(loot, table);
    this.openChest = loot.items;
    this.chestMenu.openMenu();
  }

  private closeChestMenu(): void {
    this.chestMenu.close();
    this.openChest = null;
  }

  // "R" while a chest is open — move everything from it into the backpack in
  // one go, auto-stacking onto matching backpack stacks first (ItemContainer.add
  // already does this) before spilling into empty slots. Tiered stacks (none
  // exist in the shack loot table today, but future containers may hold one)
  // use addStack so a tier never gets silently dropped by add()'s by-key merge.
  // Whatever doesn't fit (backpack full) is simply left behind in the chest.
  private takeAllFromChest(): void {
    if (!this.chestMenu.isOpen() || !this.openChest) return;
    const chest = this.openChest;
    for (let i = 0; i < chest.size; i++) {
      const stack = chest.slot(i);
      if (!stack) continue;
      if (stack.tier !== undefined) {
        if (this.backpack.addStack(stack)) chest.set(i, null);
        continue;
      }
      const leftover = this.backpack.add(stack.key, stack.count);
      chest.set(i, leftover > 0 ? { key: stack.key, count: leftover } : null);
    }
    this.afterItemMove();
    this.eventLog.add("info", "Took everything from the chest");
  }

  // Reused for both the initial spawn and every respawn-after-timer cycle —
  // spawns a fresh Elite RangedGremlin + Elite MeleeGremling pair anchored to
  // the shack. Shack guards are the game's only Elite Gremlins (the sole
  // gremlin_trophy source) — every other gremlin on the map stays normal.
  private respawnShackGuards(shack: GremlinShack): void {
    shack.respawnAt = null;
    // Re-arms the chest to roll fresh loot next open — but only if it's
    // already empty (a player who never looted it keeps what's there; loot
    // doesn't top itself back up for free). Deliberately fired here, on
    // respawn, not at guard-death time: doing it at death let a player loot
    // the chest, then kill the (still-un-respawned) guards and get an
    // immediate re-roll before any respawn timer elapsed.
    shack.loot.rearmIfEmpty();
    // Roll immediately (was lazily deferred to first open) so the chest's
    // glow (syncGlow, gated on loot.isEmpty()) is accurate from the moment
    // it exists, without requiring the player to open it first to find out.
    // rollIfEmpty is idempotent — a no-op here if it's already rolled and
    // still holds unclaimed loot.
    this.rollContainerLoot(shack.loot, GREMLIN_SHACK_LOOT_TABLE);
    shack.syncGlow();
    const ranged = new RangedGremlin(this, {
      x: shack.x + Phaser.Math.Between(-40, 40),
      y: shack.y + Phaser.Math.Between(-40, 40),
      elite: true,
    });
    const melee = new MeleeGremling(this, {
      x: shack.x + Phaser.Math.Between(-40, 40),
      y: shack.y + Phaser.Math.Between(-40, 40),
      wanderAnchor: { x: shack.x, y: shack.y, radius: 70 },
      elite: true,
    });
    shack.guards = [ranged, melee];
    this.enemies.push(ranged, melee);
    this.enemyGroup.add(ranged);
    this.enemyGroup.add(melee);
  }

  // Keeps every chest's glow in sync with whether it currently has anything
  // in it (the user: "chest should only glow if there are items in it") —
  // items leave a chest via several different gestures (drag, quick-move,
  // Take All), so this polls once a frame instead of hooking each one.
  // Cheap: a handful of shacks, one boolean check apiece.
  private updateShackGlows(): void {
    for (const shack of this.gremlinShacks) shack.syncGlow();
    for (const den of this.badlandsDens) den.syncGlow();
    for (const crypt of this.crypts) crypt.syncGlow();
    // Also unbars a lodge's chieftain hut the moment its last haunt dies (the
    // texture swap lives in syncGlow so a haunt killed by a DoT tick or a stray
    // AOE can't miss it — no kill-path hook needed).
    for (const lodge of this.lodges) lodge.syncGlow();
  }

  // POI respawn (S4, locked decision 4): every badlands mini-boss POI re-arms
  // POI_RESPAWN_MS after being FULLY cleared — so a long run doesn't run out of
  // Gloam/Ember ore or Warren caches. "Fully cleared" is polled here (the states
  // that define it — looted+empty, cracked+all-ore-mined — are themselves polled
  // states, so a poll-and-arm loop is simpler than hooking each node/kill). Boss-
  // summon altars (gremlin/tyrant) are deliberately NOT here — they stay one-shot.
  // Arm-then-fire so the timer only starts once the clear condition first holds;
  // the else-branch cancels a pending arm if the condition stops holding (it can't
  // for vein/forge, but keeps dens honest if state ever changes underfoot).
  private updatePoiRespawns(now: number): void {
    // Gloaming Vein: guardian dead + every ore node mined out.
    if (this.veinPosition && this.veinCracked && this.gloamingVeinNodes.every((n) => n.depleted)) {
      if (this.veinRespawnAt === null) this.veinRespawnAt = now + POI_RESPAWN_MS;
      else if (now >= this.veinRespawnAt) {
        this.veinRespawnAt = null;
        this.armVein(this.sessionRng(), false);
        this.notifyPoiRespawn(this.veinPosition.x, this.veinPosition.y, "The Gloaming Vein reforms — its guardian stirs anew.");
      }
    }
    // Sunken Forges: mini-boss dead + every ember-ore node mined out.
    for (const forge of this.forges) {
      const cleared = forge.cracked && forge.oreNodes.every((n) => n.depleted);
      if (!cleared) {
        forge.respawnAt = null;
        continue;
      }
      if (forge.respawnAt === null) forge.respawnAt = now + POI_RESPAWN_MS;
      else if (now >= forge.respawnAt) {
        forge.respawnAt = null;
        this.armForge(this.sessionRng(), forge, false);
        this.notifyPoiRespawn(forge.x, forge.y, "Embers rekindle at a Cinder Forge — its guardian returns.");
      }
    }
    // Warren dens: destroyed (looted) AND the cache fully emptied by the player.
    for (const den of this.badlandsDens) {
      const cleared = den.phase === "looted" && den.loot.isEmpty();
      if (!cleared) {
        den.respawnAt = null;
        continue;
      }
      if (den.respawnAt === null) den.respawnAt = now + POI_RESPAWN_MS;
      else if (now >= den.respawnAt) {
        den.reset(); // clears respawnAt, resets to wave1, re-arms loot
        this.spawnDenWave(den, false); // fresh wave 1 of 3 normal Duskrunners
        this.notifyPoiRespawn(den.x, den.y, "A Warren has been reclaimed — Duskrunners burrow in anew.");
      }
    }
    // Drowned Lodges (Phase 4d): every cache emptied AND the chieftain's hut
    // opened. Sunken Shrines are deliberately absent — they re-arm the instant
    // their bowl is emptied (they're a rite, not a container), so a timer would
    // only get in the way. See updateShrines.
    for (const lodge of this.lodges) {
      if (!lodge.fullyLooted) {
        lodge.respawnAt = null;
        continue;
      }
      if (lodge.respawnAt === null) lodge.respawnAt = now + POI_RESPAWN_MS;
      else if (now >= lodge.respawnAt) {
        lodge.reset(); // clears respawnAt, re-bars the chief hut, re-arms caches
        this.spawnLodgeResidents(lodge);
        for (const hut of lodge.huts) {
          this.rollContainerLoot(hut.loot, hut.chief ? LODGE_CHIEF_LOOT_TABLE : LODGE_HUT_LOOT_TABLE);
        }
        this.notifyPoiRespawn(lodge.x, lodge.y, "The lodge is occupied again — lights move on the water.");
      }
    }
  }

  // POI respawns fire on a timer regardless of where the player is; only surface
  // the toast when they're near enough to actually witness it (the user: "should
  // only get notified of POIs respawning if I am nearby"). The respawn itself
  // still happens either way.
  private notifyPoiRespawn(x: number, y: number, message: string): void {
    if (Phaser.Math.Distance.Between(this.player.x, this.player.y, x, y) <= POI_RESPAWN_NOTIFY_RADIUS) {
      this.eventLog.add("info", message);
    }
  }

  // Called from tryAttackEnemy()'s kill branch for every defeated enemy — a
  // no-op unless `enemy` was one of a shack's guards. Schedules a respawn
  // only once BOTH guards are dead, not per-guard (chest re-arm itself
  // happens in respawnShackGuards, not here — see that comment).
  private onShackGuardKilled(enemy: Enemy): void {
    const shack = this.gremlinShacks.find((s) => s.guards.includes(enemy));
    if (!shack) return;
    shack.guards = shack.guards.filter((g) => g !== enemy);
    if (shack.guards.length > 0) return;
    // War Camp huts never respawn their guards — a respawn firing mid-boss-
    // fight (their 6-min timer has no idea a Gremlin King engagement is in
    // progress nearby) was disruptive. The camp's own density
    // (spawnAltarDensity) covers ongoing camp danger instead; standalone wild
    // shacks are unaffected and keep respawning as before.
    if (shack.nearCamp) return;
    shack.respawnAt = this.time.now + SHACK_GUARD_RESPAWN_MS;
    this.time.delayedCall(SHACK_GUARD_RESPAWN_MS, () => this.respawnShackGuards(shack));
  }

  // --- Boss Altar + Gremlin King ---

  private static readonly BOSS_RITUAL_DELAY_MS = 2500;

  // Consumes one Gremlin Totem (hotbar first — the player is holding it per
  // the prompt gate — falling back to the backpack so a totem moved
  // mid-interaction still consumes correctly), then a short ritual pause
  // before the boss actually spawns.
  private attemptSummonBoss(altar: BossAltar): void {
    if (altar.kind === "tyrant") {
      this.attemptSummonDuneshaper(altar);
      return;
    }
    if (altar.summoned) return;
    if (this.hotbar.container.count("gremlin_totem") >= 1) {
      this.hotbar.container.removeCount("gremlin_totem", 1);
    } else if (this.backpack.count("gremlin_totem") >= 1) {
      this.backpack.removeCount("gremlin_totem", 1);
    } else {
      // The altar is now always interactable-looking (highlight + prompt) so
      // it reads as a real POI even before the player has a totem — clicking
      // without one just needs a reason why nothing happened.
      this.eventLog.add("info", "The altar needs something offered to it first.");
      return;
    }
    this.afterItemMove();
    altar.summoned = true;
    this.eventLog.add("combat", "The altar's fire roars to life...");
    this.time.delayedCall(MainScene.BOSS_RITUAL_DELAY_MS, () => this.spawnGremlinKing(altar));
  }

  private spawnGremlinKing(altar: BossAltar): void {
    const boss = new GremlinKing(this, { x: altar.x, y: altar.y - 60 });
    this.gremlinKing = boss;
    this.enemies.push(boss);
    this.enemyGroup.add(boss);
    this.eventLog.add("combat", "The Gremlin King rises!");
  }

  // Duneshaper summon (biome 2 Phase 3). Consumes one Effigy of the Duneshaper
  // (hotbar first, per the prompt gate; backpack fallback) at any tyrant altar,
  // then a ritual pause before the final boss spawns. tyrantSummoned gates it to
  // one summon per run across all altars.
  private attemptSummonDuneshaper(altar: BossAltar): void {
    if (this.tyrantSummoned) return;
    if (this.hotbar.container.count("tyrant_totem") >= 1) {
      this.hotbar.container.removeCount("tyrant_totem", 1);
    } else if (this.backpack.count("tyrant_totem") >= 1) {
      this.backpack.removeCount("tyrant_totem", 1);
    } else {
      this.eventLog.add("info", "The altar hungers for an effigy — none offered.");
      return;
    }
    this.afterItemMove();
    this.tyrantSummoned = true;
    altar.summoned = true;
    this.eventLog.add("combat", "The altar's gloamfire flares violet...");
    this.time.delayedCall(MainScene.BOSS_RITUAL_DELAY_MS, () => this.spawnDuneshaper(altar));
  }

  // Move a whole stack from `container[index]` into the open rack's input slot,
  // if it's a valid input for that station. Invalid drops just snap back.
  private loadRackInput(container: ItemContainer, index: number): void {
    const station = this.openRack;
    if (!station) return;
    const stack = container.slot(index);
    if (!stack || !station.canAccept(stack.key)) return;
    station.addInput(stack.key, stack.count);
    container.set(index, null);
    this.dryingRackMenu.selectFullAmount();
    this.afterItemMove();
  }

  // Load a whole stack into one of the Smelter's secondary slots (reagent/fuel).
  private loadRackSecondary(side: SecondarySide, container: ItemContainer, index: number): void {
    const station = this.openRack;
    if (!station) return;
    const stack = container.slot(index);
    if (!stack || !station.canAcceptInto(side, stack.key)) return;
    station.addInto(side, stack.key, stack.count);
    container.set(index, null);
    this.dryingRackMenu.selectFullAmount();
    this.afterItemMove();
  }

  // Route a right-click / quick-move on a backpack stack to the right slot —
  // valid input to the input slot, otherwise whichever secondary slot takes it.
  private quickLoadStation(container: ItemContainer, index: number): void {
    const station = this.openRack;
    const stack = container.slot(index);
    if (!station || !stack) return;
    if (station.canAccept(stack.key)) {
      this.loadRackInput(container, index);
      return;
    }
    for (const side of SECONDARY_SIDES) {
      if (station.canAcceptInto(side, stack.key)) {
        this.loadRackSecondary(side, container, index);
        return;
      }
    }
  }

  // Pull an unconsumed secondary (reagent/fuel) back out of the Smelter.
  private retrieveRackSecondary(side: SecondarySide): void {
    const station = this.openRack;
    const slot = side === "reagent" ? station?.reagent : station?.fuel;
    if (!station || !slot) return;
    const leftover = this.addToBackpack(slot.key, slot.count);
    station.takeFrom(side);
    if (leftover > 0) {
      this.spawnLooseDrop(slot.key, leftover, this.player.x, this.player.y, DROPPED_ITEM_MAGNET_COOLDOWN_MS);
      this.eventLog.add("info", "Backpack full — some of it landed on the floor");
    }
    this.dryingRackMenu.selectFullAmount();
    this.afterItemMove();
  }

  // Instantly convert `amount` units of the rack's loaded input. The result
  // auto-lands in the backpack if there's room; any overflow drops on the
  // floor next to the player instead of being silently lost (per user spec —
  // processed output is never a "collect" step the player can forget).
  private processRackAmount(amount: number): void {
    const station = this.openRack;
    if (!station) return;
    const result = station.process(amount);
    if (!result) return;
    const leftover = this.addToBackpack(result.key, result.count);
    if (leftover > 0) {
      this.spawnLooseDrop(result.key, leftover, this.player.x, this.player.y, DROPPED_ITEM_MAGNET_COOLDOWN_MS);
      this.eventLog.add("info", "Backpack full — some output landed on the floor");
    }
    this.sfx.craft();
    this.afterItemMove();
  }

  // Pull the loaded (unprocessed) raw input back out into the backpack.
  private retrieveRackInput(): void {
    const station = this.openRack;
    if (!station?.input) return;
    const inp = station.input;
    const leftover = this.addToBackpack(inp.key, inp.count);
    station.takeInput();
    if (leftover > 0) {
      this.spawnLooseDrop(inp.key, leftover, this.player.x, this.player.y, DROPPED_ITEM_MAGNET_COOLDOWN_MS);
      this.eventLog.add("info", "Backpack full — some input landed on the floor");
    }
    this.afterItemMove();
  }

  // A random, distinct RNG stream per call. Now that the biome layout is
  // procedural, a fixed content seed no longer reproduces a coherent world
  // anyway (the zones under it differ each session), so node/enemy scatter is
  // session-random too — kept as separate generators so tuning one stream
  // doesn't perturb another's draw sequence.
  private sessionRng(): Phaser.Math.RandomDataGenerator {
    return new Phaser.Math.RandomDataGenerator([String(Date.now()), String(Math.random())]);
  }

  // Elite-chance roll shared by every normal spawn path (M-EL2). `chanceMult`
  // lets the nightfall surge roll at a higher rate than daytime scatter
  // without duplicating the base percentage in two places.
  private rollElite(rng: Phaser.Math.RandomDataGenerator, chanceMult = 1): boolean {
    // The run character's elite-chance modifier multiplies on top of the
    // caller's own multiplier (e.g. M-DN's 3x nightfall surge).
    return rng.frac() < Math.min(1, ELITE_SPAWN_CHANCE * chanceMult * this.character.eliteChanceMult());
  }

  // Draw x/y within world margins, biased to a preferred zone via rejection
  // sampling and kept out of the player's spawn clearing. Falls back to the
  // last draw after a cap so a tiny/absent zone can't hang the loop.
  private pickSpawnPoint(
    rng: Phaser.Math.RandomDataGenerator,
    preferred: ZoneType | null,
    clearRadius: number,
    avoidCreek = false,
  ): { x: number; y: number } {
    let last = { x: WORLD_CX, y: WORLD_CY };
    for (let attempt = 0; attempt < 200; attempt++) {
      // Sample within the biome REGION and keep the point inside the biome
      // CIRCLE — all first-biome content stays in the central area; the empty
      // outer ring is reserved for future biomes.
      const x = rng.between(BIOME_ORIGIN_X, BIOME_ORIGIN_X + BIOME_SIZE);
      const y = rng.between(BIOME_ORIGIN_Y, BIOME_ORIGIN_Y + BIOME_SIZE);
      last = { x, y };
      const dc = Phaser.Math.Distance.Between(x, y, WORLD_CX, WORLD_CY);
      if (dc < clearRadius || dc > BIOME_RADIUS) continue;
      // War Camp (M-WC): keep every plain scatter/enemy spawn out of the camp
      // interior — the camp is world-gen-placed content with its own dressing
      // (spawnWarCamp), not a spot for random trees/rocks/wild enemies too.
      if (
        this.altarPosition &&
        Phaser.Math.Distance.Between(x, y, this.altarPosition.x, this.altarPosition.y) < WAR_CAMP_CLEAR_RADIUS
      )
        continue;
      // Gloaming Vein: keep ordinary trees/rocks/wild enemies out of the ore
      // clearing (the vein has its own guardian + shielded nodes).
      if (
        this.veinPosition &&
        Phaser.Math.Distance.Between(x, y, this.veinPosition.x, this.veinPosition.y) < VEIN_CLEAR_RADIUS
      )
        continue;
      if (preferred && this.biome.zoneAt(x, y) !== preferred) continue;
      // Creek overlays forest/grassy cells, so a "forest" point can still land
      // on water — keep trees (tall canopy) off the creek where they look wrong.
      if (avoidCreek && this.biome.isCreekAt(x, y)) continue;
      return { x, y };
    }
    return last;
  }

  // Like pickSpawnPoint, but additionally rejects a candidate if too many
  // `existing` points already sit within `minSpacing` of it — used to keep
  // same-family spawns (e.g. the Gremlin/Gremling roster) from clumping into
  // dense packs, without banning pairs outright. Falls back to the last
  // candidate after the attempt cap, same as pickSpawnPoint, so a crowded
  // pool can't hang the loop.
  private pickSpreadSpawnPoint(
    rng: Phaser.Math.RandomDataGenerator,
    zone: ZoneType | null,
    clearRadius: number,
    existing: { x: number; y: number }[],
    minSpacing: number,
    maxNearby: number,
    avoidCreek = false,
  ): { x: number; y: number } {
    let last = { x: WORLD_W / 2, y: WORLD_H / 2 };
    for (let attempt = 0; attempt < 200; attempt++) {
      const { x, y } = this.pickSpawnPoint(rng, zone, clearRadius, avoidCreek);
      last = { x, y };
      const nearby = existing.filter(
        (p) => Phaser.Math.Distance.Between(p.x, p.y, x, y) <= minSpacing,
      ).length;
      if (nearby < maxNearby) return { x, y };
    }
    return last;
  }

  // Is (x, y) inside ANY POI's own clearing? The standing rule is that a POI
  // clearing stays free of wild scatter, or the landmark reads as visual noise
  // instead of a place ("POI busy = missing exclusion zone"). Every sampler used
  // to carry its own copy of this list, which is exactly how the Phase-4d POIs
  // ended up with stray trees in them: pickBayouPoint learned about them and the
  // badlands/outer-forest samplers didn't, and bayou blobs neighbour badlands
  // ones. One list, consulted by everything that places world content.
  private insidePoiClearing(x: number, y: number): boolean {
    const near = (c: { x: number; y: number } | null | undefined, r: number) =>
      !!c && Phaser.Math.Distance.Between(x, y, c.x, c.y) < r;
    if (near(this.altarPosition, WAR_CAMP_CLEAR_RADIUS)) return true;
    if (near(this.veinPosition, VEIN_CLEAR_RADIUS)) return true;
    if (this.badlandsDens.some((d) => near(d, DEN_CLEAR_RADIUS))) return true;
    if (this.forgePositions.some((f) => near(f, FORGE_CLEAR_RADIUS))) return true;
    if (this.tyrantAltarPositions.some((a) => near(a, TYRANT_ALTAR_CLEAR_RADIUS))) return true;
    if (this.cryptPositions.some((c) => near(c, CRYPT_CLEAR_RADIUS))) return true;
    if (this.shrinePositions.some((s) => near(s, SHRINE_CLEAR_RADIUS))) return true;
    if (this.lodgePositions.some((l) => near(l, LODGE_CLEAR_RADIUS))) return true;
    if (this.gorgePositions.some((p) => near(p, GORGE_CLEAR_RADIUS))) return true;
    return false;
  }

  // Is (x, y) within `minSep` of ANY already-placed POI CENTER? Distinct from
  // insidePoiClearing (which uses each POI's small ordinary-content clear radius):
  // this enforces POI-to-POI SPACING, so two landmarks' decorations never overlap
  // (the "Cinder Forge and Warren spawned on top of each other" / "Duneshaper
  // altar right next to the Sunken Gorge" reports). Every POI picker consults it
  // against POI_MIN_SEPARATION so each new POI keeps clear of every earlier one —
  // the badlands pickers used to enforce only their own clear radii (~200-360),
  // smaller than a POI's actual footprint, and the bayou pickers avoided only a
  // hand-picked subset (never the badlands POIs across a blob border).
  private tooCloseToAnyPoi(x: number, y: number, minSep: number): boolean {
    const near = (c: { x: number; y: number } | null | undefined) =>
      !!c && Phaser.Math.Distance.Between(x, y, c.x, c.y) < minSep;
    if (near(this.altarPosition)) return true;
    if (near(this.veinPosition)) return true;
    if (this.badlandsDens.some((d) => near(d))) return true;
    if (this.forgePositions.some((f) => near(f))) return true;
    if (this.tyrantAltarPositions.some((a) => near(a))) return true;
    if (this.cryptPositions.some((c) => near(c))) return true;
    if (this.shrinePositions.some((s) => near(s))) return true;
    if (this.lodgePositions.some((l) => near(l))) return true;
    if (this.gorgePositions.some((p) => near(p))) return true;
    return false;
  }

  // Sample a point out in the badlands patchwork (biome 2 Phase 2). Unlike the
  // forest samplers (which sample the central BIOME region), this sweeps a polar
  // annulus in the badlands radius band and requires real badlands blob coverage
  // there — so content lands in the dusty flats, never the forest disc or the
  // base-layer gaps between blobs. Honors the same War-Camp/Vein exclusions
  // pickSpawnPoint uses. Returns null only if no covered point is found (badlands
  // always generates, so callers that get null simply spawn nothing).
  private pickBadlandsPoint(
    rng: Phaser.Math.RandomDataGenerator,
    minCoverage = 0.4,
    rMin = BADLANDS_R_MIN,
    rMax = BADLANDS_R_MAX_INNER,
  ): { x: number; y: number } | null {
    // Concentrated in the ACCESSIBLE inner badlands band (the first badlands a
    // player reaches from the forest edge), biased toward the inner edge — the
    // deep badlands stays sparse. Content here needs real density or a player
    // walks through empty dusty ground (the user: "0 enemies in a badlands area").
    // rMin lets specific callers (the Sunken Forges + Duneshaper altars, S4) push
    // their pick DEEPER past the forest-edge band so those landmarks sit out in
    // real badlands, not right on the woods border. rMax lets the PB1 Session 3
    // "outer badlands" spawn pass push the band further out (playtest: shouldn't
    // have to loop the whole ring for base biome-2 content) without touching the
    // original inner-band callers, which all keep the default.
    const R_MIN = rMin; // right at the forest edge / transition (default)
    const R_MAX = rMax; // inner-to-mid badlands by default; deep ring left sparse for now
    let last: { x: number; y: number } | null = null;
    for (let attempt = 0; attempt < 400; attempt++) {
      const ang = rng.frac() * Math.PI * 2;
      const r = R_MIN + Math.pow(rng.frac(), 1.7) * (R_MAX - R_MIN); // inner-weighted
      const x = WORLD_CX + Math.cos(ang) * r;
      const y = WORLD_CY + Math.sin(ang) * r;
      if (this.insidePoiClearing(x, y)) continue;
      // Phase 1 macro-zones: keep WILD scatter off a solid rock footprint AND out
      // of a themed sub-zone's core (both empty until zones are placed, so the
      // earlier flora/mineral passes that run before placeBadlandsZones are
      // unaffected — zones own their content; the open ground between them stays
      // organically scattered). Also spreads new zones off already-placed ones.
      if (this.obstaclePositions.some((o) => Phaser.Math.Distance.Between(x, y, o.x, o.y) < o.r + 34))
        continue;
      if (this.subZoneAt(x, y)) continue;
      // Badlands must be the DOMINANT biome here, not merely present: near the
      // forest transition a point can carry >=0.4 badlands coverage while forest
      // (disc or an overlapping forest blob) still wins the blend — placing a
      // badlands enemy/flora there reads as "spawned in the woods" (the user's
      // report). dominantBiomeAt already resolves the winner incl. the forest
      // disc, so gate on it. minCoverage remains a floor for "meaningfully in".
      if (this.worldBiomes.dominantBiomeAt(x, y) !== "badlands") continue;
      if (this.worldBiomes.coverageAt(x, y, "badlands") < minCoverage) continue;
      return { x, y };
    }
    return last;
  }

  // The bayou's content sampler (biome 3 Phase 4a) — the direct counterpart to
  // pickBadlandsPoint, and it honors every one of the same POI exclusions (a
  // bayou blob can in principle generate near any badlands landmark, since the
  // patchwork mixes tiers outward). Sweeps the bayou band and requires bayou to
  // be the DOMINANT biome, not merely present: near a badlands seam a point can
  // carry >=0.4 bayou coverage while badlands still wins the blend, and content
  // placed there reads as "spawned in the wrong biome" (the exact bug the user
  // reported for the badlands/forest seam). Returns null if nothing is found in
  // budget — callers skip that spawn attempt, same null contract as the others.
  private pickBayouPoint(
    rng: Phaser.Math.RandomDataGenerator,
    minCoverage = 0.4,
    rMin = BAYOU_R_MIN,
    rMax = BAYOU_R_MAX,
    opts: { avoidDeepWater?: boolean; preferWater?: boolean; preferZone?: "miasma" | "bonemire" | "hammock" } = {},
  ): { x: number; y: number } | null {
    for (let attempt = 0; attempt < 400; attempt++) {
      const ang = rng.frac() * Math.PI * 2;
      const r = rMin + rng.frac() * (rMax - rMin); // uniform — blobs are patchy either way
      const x = WORLD_CX + Math.cos(ang) * r;
      const y = WORLD_CY + Math.sin(ang) * r;
      if (this.insidePoiClearing(x, y)) continue;
      if (this.obstaclePositions.some((o) => Phaser.Math.Distance.Between(x, y, o.x, o.y) < o.r + 34)) continue;
      if (this.worldBiomes.dominantBiomeAt(x, y) !== "bayou") continue;
      if (this.worldBiomes.coverageAt(x, y, "bayou") < minCoverage) continue;
      // Solid, harvestable things (trees, ore) shouldn't generate out in a deep
      // gloam channel where reaching them means eating the heavy slow. Flora and
      // water lilies opt out of this so the water still has its own content.
      if (opts.avoidDeepWater && bayouWaterAt(x, y, this.outerFeatureBiome) === "deep") continue;
      // SOFT themed-spawn preference (the user: "make bayou spawns a bit more
      // themed — frogs in the lilypad water, ranged at the haunted boneyard").
      // Enforced only for the first ~3/4 of attempts, then relaxed so the spawn
      // never fails outright if a matching cell is scarce this seed.
      if (attempt < 300) {
        if (opts.preferWater && bayouWaterAt(x, y, this.outerFeatureBiome) === null) continue;
        if (opts.preferZone && this.bayouZoneAt(x, y)?.type !== opts.preferZone) continue;
      }
      return { x, y };
    }
    return null;
  }

  // PB1 Session 3 — the forest-blob counterpart to pickBadlandsPoint. Beyond
  // BIOME_RADIUS, WorldBiomes paints forest as one of the patchwork "blobs" (it's
  // tier 1, so it stays eligible at any radius per the ceiling model), but nothing
  // sampled it for content — those patches rendered forest-colored ground with zero
  // trees/rocks/enemies (playtest: "lot of empty space in the verdant woods outside
  // of center"). Sweeps an annulus from the edge of the central disc out to rMax,
  // requiring forest to be the DOMINANT biome (same reasoning as pickBadlandsPoint —
  // a point can carry some forest coverage while badlands/dunes still wins the
  // blend) and honoring every POI exclusion the badlands picker does, since a forest
  // blob can in principle sit near any of them. Returns null if no covered point is
  // found within budget — callers should skip that spawn attempt, same as the
  // badlands picker's null contract.
  private pickOuterForestPoint(
    rng: Phaser.Math.RandomDataGenerator,
    minCoverage = 0.4,
    rMin = BIOME_RADIUS,
    rMax = OUTER_FOREST_R_MAX,
  ): { x: number; y: number } | null {
    for (let attempt = 0; attempt < 400; attempt++) {
      const ang = rng.frac() * Math.PI * 2;
      const r = rMin + rng.frac() * (rMax - rMin); // uniform — blobs are patchy either way
      const x = WORLD_CX + Math.cos(ang) * r;
      const y = WORLD_CY + Math.sin(ang) * r;
      if (this.insidePoiClearing(x, y)) continue;
      if (this.worldBiomes.dominantBiomeAt(x, y) !== "forest") continue;
      if (this.worldBiomes.coverageAt(x, y, "forest") < minCoverage) continue;
      return { x, y };
    }
    return null;
  }

  // True if `p` sits at least POI_MIN_SEPARATION from every already-placed POI of
  // the requested kinds (S4 — keep distinct POI types from crowding each other, on
  // top of each POI's own smaller clear radius). Only checks POIs already chosen at
  // call time, so the caller order (altar → vein → forge → altars → dens) matters.
  // One-time background bake: a single RenderTexture over the whole world,
  // depth just above the grass and below every entity. Forest gets a darker-
  // green overlay, grassy is left showing the base grass, and creek draws a
  // translucent blue on top of whichever zone it crosses.
  //
  // Rendered at a finer SUPERSAMPLE stride than the 40px zone-lookup grid,
  // with alpha driven by Biome's bilinear forestWeight()/creekWeight() rather
  // than each cell's own hard on/off value — this turns the old blocky,
  // staircase-edged zone boundary (one big flat-colored 40px square at a
  // time) into a soft multi-cell-wide gradient band, which reads as a
  // rounded line rather than a low-res jagged edge.
  private static readonly BIOME_SUPERSAMPLE = 8;

  private buildBiomeTexture(): Phaser.GameObjects.RenderTexture {
    const step = MainScene.BIOME_SUPERSAMPLE;
    const g = this.make.graphics({}, false); // offscreen; not on the display list
    // Only bake the biome REGION (a centered BIOME_SIZE square), not the whole
    // (much larger, mostly-empty) world — the surrounding grass needs no
    // overlay, and a full-world RenderTexture would exceed the GPU texture-size
    // limit. Graphics coords are LOCAL to the region (0..BIOME_SIZE); the
    // RenderTexture is placed at the region's world origin below.
    for (let ly = 0; ly < BIOME_SIZE; ly += step) {
      for (let lx = 0; lx < BIOME_SIZE; lx += step) {
        const wx = BIOME_ORIGIN_X + lx + step / 2;
        const wy = BIOME_ORIGIN_Y + ly + step / 2;
        // Fade the forest overlay out past the forest edge (forestCoverage), so
        // this crisp inner bake never paints green forest over an outer biome in
        // the region-square corners — the coarse overlay owns those, showing
        // through where this bake draws nothing. In the core coverage is 1
        // (unchanged: biome 1 stays pixel-identical).
        const fc = this.worldBiomes.forestCoverage(Math.hypot(wx - WORLD_CX, wy - WORLD_CY));
        if (fc <= 0.01) continue;
        const forestW = this.biome.forestWeight(wx, wy);
        if (forestW > 0.02) {
          g.fillStyle(0x24421c, 0.55 * forestW * fc);
          g.fillRect(lx, ly, step, step);
        }
        const creekW = this.biome.creekWeight(wx, wy);
        if (creekW > 0.02) {
          g.fillStyle(0x3a6ea5, 0.6 * creekW * fc);
          g.fillRect(lx, ly, step, step);
        }
      }
    }
    // War Camp (M-WC): a distinct packed-dirt floor stamped over whatever
    // biome color sits under the camp, so it reads as a cleared campground
    // rather than the same grass/forest everywhere else. Only loops the
    // camp's own small bounding box (local region coords).
    if (this.altarPosition) {
      const altar = this.altarPosition;
      const alx = altar.x - BIOME_ORIGIN_X; // altar in local region coords
      const aly = altar.y - BIOME_ORIGIN_Y;
      const CAMP_FLOOR_SOFT = 40; // soft-edge falloff width, same idea as the forest/creek blend
      const CAMP_FLOOR_COLOR = 0x5a4a30;
      const CAMP_FLOOR_ALPHA = 0.8;
      const outer = WAR_CAMP_RADIUS;
      const minPx = Math.max(0, Math.floor((alx - outer) / step) * step);
      const maxPx = Math.min(BIOME_SIZE, Math.ceil((alx + outer) / step) * step);
      const minPy = Math.max(0, Math.floor((aly - outer) / step) * step);
      const maxPy = Math.min(BIOME_SIZE, Math.ceil((aly + outer) / step) * step);
      for (let py = minPy; py < maxPy; py += step) {
        for (let px = minPx; px < maxPx; px += step) {
          const cx = px + step / 2;
          const cy = py + step / 2;
          const d = Phaser.Math.Distance.Between(cx, cy, alx, aly);
          if (d >= outer) continue;
          const alpha =
            d < outer - CAMP_FLOOR_SOFT
              ? CAMP_FLOOR_ALPHA
              : CAMP_FLOOR_ALPHA * (1 - (d - (outer - CAMP_FLOOR_SOFT)) / CAMP_FLOOR_SOFT);
          g.fillStyle(CAMP_FLOOR_COLOR, alpha);
          g.fillRect(px, py, step, step);
        }
      }
    }
    // Gloaming Vein: a distinct gloam-blighted crystalline floor stamped over
    // the clearing, so the ore area reads as its own unique place (like the
    // war-camp floor makes the altar read as a camp). Two-tone — a dark violet
    // wash with a brighter amethyst core near the vein center.
    if (this.veinPosition) {
      const vlx = this.veinPosition.x - BIOME_ORIGIN_X; // vein in local region coords
      const vly = this.veinPosition.y - BIOME_ORIGIN_Y;
      const VEIN_FLOOR_SOFT = 40;
      const VEIN_FLOOR_OUTER = 150;
      const VEIN_CORE = 70;
      const minPx = Math.max(0, Math.floor((vlx - VEIN_FLOOR_OUTER) / step) * step);
      const maxPx = Math.min(BIOME_SIZE, Math.ceil((vlx + VEIN_FLOOR_OUTER) / step) * step);
      const minPy = Math.max(0, Math.floor((vly - VEIN_FLOOR_OUTER) / step) * step);
      const maxPy = Math.min(BIOME_SIZE, Math.ceil((vly + VEIN_FLOOR_OUTER) / step) * step);
      for (let py = minPy; py < maxPy; py += step) {
        for (let px = minPx; px < maxPx; px += step) {
          const cx = px + step / 2;
          const cy = py + step / 2;
          const d = Phaser.Math.Distance.Between(cx, cy, vlx, vly);
          if (d >= VEIN_FLOOR_OUTER) continue;
          // Dark violet blight across the whole clearing, soft outer edge.
          const outerAlpha =
            d < VEIN_FLOOR_OUTER - VEIN_FLOOR_SOFT
              ? 0.72
              : 0.72 * (1 - (d - (VEIN_FLOOR_OUTER - VEIN_FLOOR_SOFT)) / VEIN_FLOOR_SOFT);
          g.fillStyle(0x2a1e3a, outerAlpha);
          g.fillRect(px, py, step, step);
          // Brighter amethyst core so the very center glows crystalline.
          if (d < VEIN_CORE) {
            g.fillStyle(0x4a2f6e, 0.55 * (1 - d / VEIN_CORE));
            g.fillRect(px, py, step, step);
          }
        }
      }
    }
    const rt = this.add
      .renderTexture(BIOME_ORIGIN_X, BIOME_ORIGIN_Y, BIOME_SIZE, BIOME_SIZE)
      .setOrigin(0, 0)
      .setDepth(-9);
    rt.draw(g);
    g.destroy();
    return rt;
  }

  // Bake the outer patchwork ground (biome 2+) into ONE bounded RenderTexture that
  // covers the whole world, no matter how big the world gets. The world is far too
  // large (28000px) to bake at full resolution, so this bakes a coarse OVERLAY_TEX²
  // texture (~64MB, constant cost) and stretches it across the world — soft, which
  // is fine for placeholder ground. Only the FOREST CORE is skipped (transparent),
  // so biome 1 stays the crisp forest bake + grass tilesprite (pixel-identical);
  // everything past it reads worldBiomeColorAt (base + biome blobs). Depth -9.5 sits
  // just under the crisp forest bake (-9) and above the grass tilesprite (-10).
  // 4096²/step4 ≈ 1M fills (~1.5s one-time bake, 64MB texture) — bounded and
  // constant at any world size. Stretched ~6.8x over the world with LINEAR
  // filtering forced (the game is pixelArt/NEAREST by default) so the outer ground
  // reads as a smooth gradient rather than blocky. Soft is fine for placeholder.
  private static readonly OVERLAY_TEX = 4096; // texture resolution
  private static readonly OVERLAY_STEP = 4; // texel block size baked per fill

  // Display-list streaming (see updateSceneStreaming). The interval is a
  // compromise: often enough that a sprinting/dashing player can't outrun the
  // window, rare enough that the ~17k-object scan is amortised to nothing. The
  // margin is generous for the same reason — at max sprint the player covers
  // ~230px/s, so 900px is several seconds of slack past the screen edge.
  private static readonly STREAM_INTERVAL_MS = 250;
  private static readonly STREAM_MARGIN = 900;
  // Anything bigger than this is a ground bake / zone decal whose x,y is its
  // centre, not a point you can be "far from" — never park those.
  private static readonly STREAM_MAX_SIZE = 900;

  // Camera-locked ground-grain overlay (see the speckleLayer field note). Sized to
  // the camera viewport and pinned with scrollFactor(0), so its canvas stays
  // small no matter how big the world is; syncSpeckleLayer() offsets tilePosition
  // by the camera scroll each frame so the specks appear fixed to the ground.
  // Depth -8.8 sits above every ground layer (overlay -9.5 / grass -9.4 / forest
  // bake -9 / void ring) and below all Y-sorted world entities (positive depths).
  private buildSpeckleLayer(): void {
    const cam = this.cameras.main;
    this.speckleLayer = this.add
      .tileSprite(0, 0, cam.width, cam.height, "ground_speckle")
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(-8.8);
    this.syncSpeckleLayer();
  }

  private syncSpeckleLayer(): void {
    const cam = this.cameras.main;
    // Specks stay locked to world coords: shift the tiling by the camera scroll.
    this.speckleLayer.setTilePosition(cam.scrollX, cam.scrollY);
  }

  // DISPLAY-LIST STREAMING. The world had grown to ~17,000 display objects (5000+
  // miasma fumes, 2300 crypt/dungeon wall rects, 2200 resource nodes, 1100
  // enemies, and every decorative prop in three biomes). Phaser walks the WHOLE
  // display list every frame — to cull, to render, and again in syncCameras —
  // and re-sorts all 17,000 whenever any depth changes, which is every frame the
  // player is moving. Measured: ~22ms/frame even with the sim paused, dropping to
  // ~4ms once distant objects are out of the list. That is the hitching the user
  // felt specifically while walking/sprinting (standing still = no depth change =
  // no re-sort).
  //
  // So: anything far enough away that it CANNOT be on screen is removed from the
  // display list and parked in `streamedOut`. Nothing else changes — Arcade
  // bodies live in the physics world and Sprite.preUpdate runs off the scene's
  // update list, so collision, AI and animation are all untouched. This is
  // purely "don't ask the renderer about things it can't draw".
  private updateSceneStreaming(): void {
    const now = this.time.now;
    if (now < this.nextStreamAt) return;
    this.nextStreamAt = now + MainScene.STREAM_INTERVAL_MS;

    const px = this.player.x;
    const py = this.player.y;
    // Derived from the actual zoomed viewport, so a wider window or a zoom
    // change can never stream out something that is still on screen.
    const view = this.cameras.main.worldView;
    const radius = Math.hypot(view.width, view.height) / 2 + MainScene.STREAM_MARGIN;
    const r2 = radius * radius;

    const list = this.children.list;
    for (let i = list.length - 1; i >= 0; i--) {
      const o = list[i] as Phaser.GameObjects.GameObject & { x: number; y: number };
      if (!this.isStreamable(o)) continue;
      const dx = o.x - px;
      const dy = o.y - py;
      if (dx * dx + dy * dy <= r2) continue;
      this.children.remove(o);
      this.streamedOut.push(o);
    }

    const keep: Phaser.GameObjects.GameObject[] = [];
    for (const o of this.streamedOut) {
      // destroy() clears `scene`, so a parked object that died while out of the
      // list (a node depleted by a set-bonus proc, a run reset) is simply dropped.
      if (!o.scene) continue;
      const t = o as Phaser.GameObjects.GameObject & { x: number; y: number };
      const dx = t.x - px;
      const dy = t.y - py;
      if (dx * dx + dy * dy <= r2) this.children.add(o);
      else keep.push(o);
    }
    this.streamedOut = keep;
  }

  // Whether a display object is safe to park out of the display list. Requires a
  // real world position, so it excludes: HUD (scrollFactor 0), the ground bakes /
  // overlays / zone decals (depth < 0 or huge), and every Graphics object — those
  // draw in absolute world coordinates from a transform parked at (0, 0), so
  // their x/y says nothing about where they appear on screen.
  private isStreamable(o: Phaser.GameObjects.GameObject): boolean {
    const a = o as Phaser.GameObjects.GameObject & {
      scrollFactorX?: number;
      depth?: number;
      displayWidth?: number;
      displayHeight?: number;
      x?: number;
      y?: number;
    };
    if (a.scrollFactorX === 0) return false;
    if (typeof a.x !== "number" || typeof a.y !== "number") return false;
    if ((a.depth ?? 0) < 0) return false;
    if (o instanceof Phaser.GameObjects.Graphics) return false;
    if ((a.displayWidth ?? 0) > MainScene.STREAM_MAX_SIZE) return false;
    if ((a.displayHeight ?? 0) > MainScene.STREAM_MAX_SIZE) return false;
    return true;
  }

  // Route every display object to exactly one camera each frame: screen-locked
  // HUD (scrollFactor 0) renders ONLY on the zoom-1 uiCam; everything else (the
  // world, entities, projectiles, floating text) renders ONLY on the zoomed
  // world camera. Done via each object's `cameraFilter` bitmask (an object is
  // hidden from a camera when that camera's id-bit is set), which Phaser's input
  // hit-testing also respects, so clicks land on the right camera automatically.
  // Run every frame (not once) so dynamically-created objects — menus, tooltips,
  // damage numbers — are classified as soon as they appear.
  //
  // TIMING IS LOAD-BEARING: this runs on the game's PRE_RENDER, NOT in update().
  // An unclassified object has cameraFilter 0, which means "render on EVERY
  // camera" — a HUD panel drawn once more on the zoomed world camera, at 1.5x
  // and in the wrong place. One frame of that is a full-screen flash. Phaser's
  // step order is: scene.update -> POST_UPDATE -> PRE_RENDER (input handlers
  // run here) -> render. So syncing from update() misses BOTH of the things
  // that create objects in response to a click: the pointer handler itself, and
  // the coalesced UI repaints that defer their teardown-and-rebuild to
  // POST_UPDATE (HotbarUI/InventoryMenu/CraftingMenu). That was the "screen
  // flickers and I see a flash of another view" on every equip/place — the
  // 36-object hotbar rebuild landing after the sync. PRE_RENDER is the last
  // hook before the renderer walks the display list, so it catches everything.
  // Exception: the speckle ground-grain tilesprite is scrollFactor 0 but is a
  // world UNDERLAY (depth < 0) that must zoom with and sit beneath the world, so
  // it stays on the world camera.
  private syncCameras(): void {
    if (!this.uiCam) return;
    const wBit = this.cameras.main.id;
    const uBit = this.uiCam.id;
    const list = this.children.list;
    for (let i = 0; i < list.length; i++) {
      const o = list[i] as Phaser.GameObjects.GameObject & {
        scrollFactorX?: number;
        cameraFilter: number;
      };
      const isUI = o.scrollFactorX === 0 && o !== this.speckleLayer;
      if (isUI) {
        o.cameraFilter = (o.cameraFilter | wBit) & ~uBit; // hide from world cam
      } else {
        o.cameraFilter = (o.cameraFilter | uBit) & ~wBit; // hide from ui cam
      }
    }
  }

  private bakeOuterOverlay(): void {
    const TEX = MainScene.OVERLAY_TEX;
    const step = MainScene.OVERLAY_STEP;
    const worldPerTexel = WORLD_SIZE / TEX;
    const g = this.make.graphics({}, false); // offscreen
    for (let ty = 0; ty < TEX; ty += step) {
      for (let tx = 0; tx < TEX; tx += step) {
        const wx = (tx + step / 2) * worldPerTexel;
        const wy = (ty + step / 2) * worldPerTexel;
        const r = Math.hypot(wx - WORLD_CX, wy - WORLD_CY);
        if (r > WORLD_RADIUS) continue; // beyond the world edge: the void ring covers it
        // Draw the overlay CONTINUOUSLY, including under the forest core — it's a
        // smooth base for the whole world. The crisp grass tilesprite + forest
        // bake sit on top and are feathered to a soft disc (forest_feather mask),
        // so their square edges fade into this overlay instead of cutting a hard
        // line (the user's "straight vertical/horizontal lines"). worldBiomeColorAt
        // returns the forest color in the core, so what shows through the feather
        // ring is continuous green, not a gap.
        g.fillStyle(this.worldBiomes.worldBiomeColorAt(wx, wy), 1);
        g.fillRect(tx, ty, step, step);
      }
    }
    const rt = this.add.renderTexture(0, 0, TEX, TEX).setOrigin(0, 0).setDepth(-9.5);
    rt.draw(g);
    rt.texture.setFilter(Phaser.Textures.FilterMode.LINEAR); // smooth the big stretch
    rt.setDisplaySize(WORLD_SIZE, WORLD_SIZE); // stretch the coarse texture over the world
    g.destroy();
  }

  // The circular world edge: fill everything beyond WORLD_RADIUS with a dark
  // "void" (concentric thick strokes out to the bounding square's corners —
  // cheap retained-mode vector geometry, no huge texture), plus a subtle
  // shoreline accent just inside the edge. Depth -8 sits above the biome bake
  // (-9)/grass (-10) and below every entity; nothing spawns out here anyway.
  private drawWorldBoundary(): void {
    const g = this.add.graphics().setDepth(-8);
    const corner = Math.hypot(WORLD_SIZE, WORLD_SIZE) / 2; // center -> square corner
    const band = 90;
    for (let r = WORLD_RADIUS + band / 2; r < corner + band; r += band) {
      g.lineStyle(band + 2, 0x0a0e14, 1);
      g.strokeCircle(WORLD_CX, WORLD_CY, r);
    }
    g.lineStyle(12, 0x213247, 0.9);
    g.strokeCircle(WORLD_CX, WORLD_CY, WORLD_RADIUS - 6);
    g.lineStyle(4, 0x3a6ea5, 0.5);
    g.strokeCircle(WORLD_CX, WORLD_CY, WORLD_RADIUS - 16);
  }

  // Keep the player inside the circular world (physics bounds are only the
  // bounding square). Re-pinned every frame — a soft wall at the water's edge.
  private clampPlayerToWorld(): void {
    // Inside a Sunken Crypt the player is out in the CRYPT_REALM pocket, well
    // outside the world circle — clamp to the interior's own footprint instead,
    // or this would yank them back to the swamp every frame.
    if (this.activeDungeon) {
      this.clampPlayerToCrypt(this.activeDungeon);
      return;
    }
    const dx = this.player.x - WORLD_CX;
    const dy = this.player.y - WORLD_CY;
    const d = Math.hypot(dx, dy);
    const maxR = WORLD_RADIUS - 20;
    if (d > maxR) {
      const s = maxR / d;
      this.player.setPosition(WORLD_CX + dx * s, WORLD_CY + dy * s);
    }
  }

  // Scatter resources around the world, biased by biome zone (trees + branches
  // cluster in forest, boulders favor the grassy open), keeping a clear area
  // around the start.
  private spawnNodes(solids: Phaser.Physics.Arcade.StaticGroup): void {
    const rng = this.sessionRng();

    const scatter = (
      count: number,
      cfg: {
        texture: string;
        resource: ResourceType;
        amount: number;
        action: NodeAction;
        displayName: string;
        loose: boolean;
        solid: boolean;
        health: number;
        zone: ZoneType | null;
        avoidCreek?: boolean;
      },
    ) => {
      for (let i = 0; i < count; i++) {
        const { x, y } = this.pickSpawnPoint(rng, cfg.zone, 100, cfg.avoidCreek ?? false);
        const node = new ResourceNode(this, {
          x,
          y,
          texture: cfg.texture,
          resource: cfg.resource,
          amount: cfg.amount,
          action: cfg.action,
          displayName: cfg.displayName,
          loose: cfg.loose,
          health: cfg.health,
        });
        this.nodes.push(node);
        if (cfg.solid) solids.add(node);
        // Trees/boulders (not pickups) are Y-sorted and can render in front
        // of the player — tracked separately so updateTreeOcclusion() doesn't
        // have to filter the full (much larger, and growing) nodes list every
        // frame just to find the handful that can occlude anything.
        if (cfg.action !== "pickup") this.obstacleNodes.push(node);
      }
    };

    // Like scatter(), but places nodes in clumps of clusterMin..clusterMax
    // around one sampled center per clump instead of spreading each node
    // independently — used for bushes, which should read as a patch rather
    // than lone plants dotted around the forest.
    const scatterClustered = (
      totalCount: number,
      clusterMin: number,
      clusterMax: number,
      cfg: {
        texture: string;
        resource: ResourceType;
        amount: number;
        action: NodeAction;
        displayName: string;
        loose: boolean;
        solid: boolean;
        health: number;
        zone: ZoneType | null;
        avoidCreek?: boolean;
        persistent?: boolean;
        pickedTexture?: string;
        regrowMs?: number;
      },
      // Optional weighted clump sizes. A flat min..max roll gives every clump
      // roughly the same size, which reads as evenly-spaced blobs — repeating
      // small values here makes most clumps small with the occasional dense
      // stand, so the ground alternates between thicket and clearing.
      sizeWeights?: number[],
    ) => {
      let placed = 0;
      while (placed < totalCount) {
        const remaining = totalCount - placed;
        const size = Math.min(
          remaining,
          sizeWeights ? rng.weightedPick(sizeWeights) : rng.between(clusterMin, clusterMax),
        );
        // Spread scales with the clump so a stand of 8 trees doesn't pile into
        // the same 40px the original fixed jitter allowed — a big clump covers
        // proportionally more ground rather than getting denser.
        const CLUSTER_JITTER = Math.round(28 + size * 11);
        const center = this.pickSpawnPoint(rng, cfg.zone, 100, cfg.avoidCreek ?? false);
        for (let i = 0; i < size; i++) {
          let x = Phaser.Math.Clamp(center.x + rng.between(-CLUSTER_JITTER, CLUSTER_JITTER), 60, WORLD_W - 60);
          let y = Phaser.Math.Clamp(center.y + rng.between(-CLUSTER_JITTER, CLUSTER_JITTER), 60, WORLD_H - 60);
          // Jitter can push a point onto the creek even though the cluster
          // center was checked — fall back to the center itself rather than
          // rejection-sampling per-node (keeps the clump tight).
          if (cfg.avoidCreek && this.biome.isCreekAt(x, y)) {
            x = center.x;
            y = center.y;
          }
          // Same fallback for the War Camp interior: the center is already
          // guaranteed clear by WAR_CAMP_CLEAR_RADIUS (300), which has enough
          // margin past the wall (230) to absorb the ±40 jitter, so falling
          // back to it always lands outside the palisade.
          if (
            this.altarPosition &&
            Phaser.Math.Distance.Between(x, y, this.altarPosition.x, this.altarPosition.y) < WAR_CAMP_RADIUS
          ) {
            x = center.x;
            y = center.y;
          }
          const node = new ResourceNode(this, {
            x,
            y,
            texture: cfg.texture,
            resource: cfg.resource,
            amount: cfg.amount,
            action: cfg.action,
            displayName: cfg.displayName,
            loose: cfg.loose,
            health: cfg.health,
            persistent: cfg.persistent,
            pickedTexture: cfg.pickedTexture,
            regrowMs: cfg.regrowMs,
          });
          this.nodes.push(node);
          if (cfg.solid) solids.add(node);
          if (cfg.action !== "pickup") this.obstacleNodes.push(node);
        }
        placed += size;
      }
    };

    // Free pickups. Pre-placed branches/rocks are always manual-click — only
    // pieces spawned from a depleted tree/boulder are "loose"/magnet-eligible
    // (see spawnLooseDrop). Counts scaled up for the larger world. Both stay
    // off the creek, same reasoning as trees/boulders below.
    // Counts bumped again for the ~2x bigger map (was 40/30/70/14/18/16).
    // Clumped, not spread: ground litter collects where it fell — under a
    // stand of trees, along a rocky patch — rather than one branch every N
    // paces. Playtest: an even spread of every prop type at the same density
    // is the single thing that makes a generated map read as generated.
    scatterClustered(76, 1, 3, { texture: "branch", resource: "wood", amount: 1, action: "pickup", displayName: "Branch", loose: false, solid: false, health: 1, zone: "forest", avoidCreek: true }, [1, 1, 1, 2, 2, 3, 4]);
    scatterClustered(56, 1, 3, { texture: "rock", resource: "stone", amount: 1, action: "pickup", displayName: "Rock", loose: false, solid: false, health: 1, zone: null, avoidCreek: true }, [1, 1, 1, 2, 2, 3, 5]);
    // Tool-gated. Trees are dense in the forest and sparse in the grassy open;
    // both stay off the creek (a tree on water looks wrong). Boulders favor the
    // grassy open. Neither blocks movement (see updateTreeOcclusion for the
    // Y-sort + fade that replaces solid collision) — only the `solids` group
    // (currently empty) is reserved for future structures/walls/mountains.
    // Trees grow in stands with clearings between them, so they clump hardest:
    // forest gets big thickets, the grassy open only loose pairs and singles —
    // which is what visually separates the two zones now that both use the same
    // tree art. Boulders come in small rocky outcrops, never a lone rock grid.
    scatterClustered(132, 2, 6, { texture: "tree", resource: "wood", amount: 5, action: "chop", displayName: "Tree", loose: false, solid: false, health: 3, zone: "forest", avoidCreek: true }, [1, 2, 2, 3, 3, 4, 5, 6, 8, 9]);
    scatterClustered(26, 1, 3, { texture: "tree", resource: "wood", amount: 5, action: "chop", displayName: "Tree", loose: false, solid: false, health: 3, zone: "grassy", avoidCreek: true }, [1, 1, 1, 2, 2, 3]);
    scatterClustered(34, 1, 4, { texture: "boulder", resource: "stone", amount: 5, action: "mine", displayName: "Boulder", loose: false, solid: false, health: 3, zone: "grassy", avoidCreek: true }, [1, 1, 2, 2, 3, 4]);
    // Blackberry bushes — free forest pickup (Milestone H), grouped into
    // patches of 2-4 rather than spread individually across the forest.
    // Persistent (Milestone N): harvesting yields berries but keeps the bush
    // in the world (picked look) until it regrows.
    scatterClustered(30, 2, 4, { texture: "blackberry_bush", resource: "blackberry", amount: 2, action: "pickup", displayName: "Blackberries", loose: false, solid: false, health: 1, zone: "forest", avoidCreek: true, persistent: true, pickedTexture: "blackberry_bush_picked", regrowMs: BLACKBERRY_REGROW_MS });

    // Cattail — free pickup, but a bespoke spawn constraint (creek *edge*, not
    // just "not on the creek"), so it can't reuse scatter's zone/avoidCreek
    // sampling. Feeds the Drying Rack's twine output.
    const CATTAIL_COUNT = 42; // bumped for the ~2x bigger map (was 22)
    for (let i = 0; i < CATTAIL_COUNT; i++) {
      const { x, y } = this.pickCreekEdgePoint(rng, 100);
      const node = new ResourceNode(this, {
        x,
        y,
        texture: "cattail",
        resource: "cattail",
        amount: 1,
        action: "pickup",
        displayName: "Cattail",
        loose: false,
        health: 1,
      });
      this.nodes.push(node);
    }
  }

  // PB1 Session 3 — trees/rocks/branches/boulders/blackberries in the forest
  // patchwork blobs beyond BIOME_RADIUS (playtest: "put trees and rocks and stuff
  // out here"). Deliberately lighter than the central disc (~half its counts) —
  // these are patchy blobs, not a solid biome, and pickOuterForestPoint's null
  // return (no forest coverage found within budget) just skips that spawn, so the
  // ACTUAL placed count self-corrects to however much real forest-blob area exists
  // out to OUTER_FOREST_R_MAX. No cattails here (creek-edge specific; outer blobs
  // carry no creek terrain).
  private spawnOuterForestContent(): void {
    const rng = this.sessionRng();
    const scatter = (
      count: number,
      cfg: {
        texture: string;
        resource: ResourceType;
        amount: number;
        action: NodeAction;
        displayName: string;
        health: number;
        persistent?: boolean;
        pickedTexture?: string;
        regrowMs?: number;
      },
    ) => {
      for (let i = 0; i < count; i++) {
        const pt = this.pickOuterForestPoint(rng);
        if (!pt) break;
        const node = new ResourceNode(this, {
          x: pt.x,
          y: pt.y,
          texture: cfg.texture,
          resource: cfg.resource,
          amount: cfg.amount,
          action: cfg.action,
          displayName: cfg.displayName,
          loose: false,
          health: cfg.health,
          persistent: cfg.persistent,
          pickedTexture: cfg.pickedTexture,
          regrowMs: cfg.regrowMs,
        });
        this.nodes.push(node);
        if (cfg.action !== "pickup") this.obstacleNodes.push(node);
      }
    };
    scatter(50, { texture: "branch", resource: "wood", amount: 1, action: "pickup", displayName: "Branch", health: 1 });
    scatter(40, { texture: "rock", resource: "stone", amount: 1, action: "pickup", displayName: "Rock", health: 1 });
    scatter(90, { texture: "tree", resource: "wood", amount: 5, action: "chop", displayName: "Tree", health: 3 });
    scatter(24, { texture: "boulder", resource: "stone", amount: 5, action: "mine", displayName: "Boulder", health: 3 });
    scatter(20, {
      texture: "blackberry_bush",
      resource: "blackberry",
      amount: 2,
      action: "pickup",
      displayName: "Blackberries",
      health: 1,
      persistent: true,
      pickedTexture: "blackberry_bush_picked",
      regrowMs: BLACKBERRY_REGROW_MS,
    });
  }

  // Like pickSpawnPoint, but rejection-samples for a creek-*border* cell (dry
  // land adjacent to water) — the reedy bank where Cattail grows. Falls back to
  // the last draw after a cap so a creek with no reachable edge can't hang.
  private pickCreekEdgePoint(
    rng: Phaser.Math.RandomDataGenerator,
    clearRadius: number,
  ): { x: number; y: number } {
    let last = { x: WORLD_CX, y: WORLD_CY };
    for (let attempt = 0; attempt < 300; attempt++) {
      const x = rng.between(BIOME_ORIGIN_X, BIOME_ORIGIN_X + BIOME_SIZE);
      const y = rng.between(BIOME_ORIGIN_Y, BIOME_ORIGIN_Y + BIOME_SIZE);
      last = { x, y };
      const dc = Phaser.Math.Distance.Between(x, y, WORLD_CX, WORLD_CY);
      if (dc < clearRadius || dc > BIOME_RADIUS) continue;
      // War Camp (M-WC): same no-clutter exclusion pickSpawnPoint applies —
      // this sampler has its own rejection loop so it needs its own check.
      if (
        this.altarPosition &&
        Phaser.Math.Distance.Between(x, y, this.altarPosition.x, this.altarPosition.y) < WAR_CAMP_CLEAR_RADIUS
      )
        continue;
      if (!this.biome.isCreekEdge(x, y)) continue;
      return { x, y };
    }
    return last;
  }

  // Scatter Boars around the world. Milestone B: retuned for the 2x world +
  // AGGRO_RADIUS reduction above — 80/20 forest/grassy split (forest is their
  // common habitat, grassy is a rare wander-in), clear zone widened to ~2x
  // the new (smaller) aggro radius.
  private spawnEnemies(): void {
    const rng = this.sessionRng();
    const BOAR_CLEAR_RADIUS = 220;
    const BOAR_COUNT = 24; // bumped for the ~2x bigger map (was 12)
    const BOAR_FOREST_COUNT = Math.round(BOAR_COUNT * 0.8);
    const BOAR_GRASSY_COUNT = BOAR_COUNT - BOAR_FOREST_COUNT;
    const spawnBoar = (zone: "forest" | "grassy") => {
      const { x, y } = this.pickSpawnPoint(rng, zone, BOAR_CLEAR_RADIUS, true);
      const enemy = new Boar(this, { x, y, elite: this.rollElite(rng) });
      this.enemies.push(enemy);
      this.enemyGroup.add(enemy);
    };
    for (let i = 0; i < BOAR_FOREST_COUNT; i++) spawnBoar("forest");
    for (let i = 0; i < BOAR_GRASSY_COUNT; i++) spawnBoar("grassy");

    // Snakes: grassy-preferred (per CLAUDE.md's first-biome content notes),
    // the game's only leather source (see plan Milestone D's "why
    // prioritized" note — Stone Pickaxe/Stone Club need it to ever be
    // discoverable). Bumped 6->15 (Milestone O): the new Gremlin armor set's
    // leather demand (~9, on top of existing tool costs) exceeded what 6
    // snakes could ever supply in one session.
    const SNAKE_COUNT = 28; // bumped for the ~2x bigger map (was 15)
    for (let i = 0; i < SNAKE_COUNT; i++) {
      const { x, y } = this.pickSpawnPoint(rng, "grassy", 200, true);
      const snake = new Snake(this, { x, y, elite: this.rollElite(rng) });
      this.enemies.push(snake);
      this.enemyGroup.add(snake);
    }

    // Gremlin/Gremling: grassy-preferred with occasional forest wandering-in
    // (per CLAUDE.md's first-biome content notes). The ranged "Gremlin" is
    // the sole gremlin_skin source feeding the Drying Rack -> gremlin_leather.
    // Milestone O bumped this 4->18 by resource-supply math alone (~10
    // gremlin_leather needed across the armor set + upgrades); playtesting
    // that number found the map felt overrun with gremlins regardless of
    // spacing. Trimmed back down (18->12, still ~20% margin over the ~10
    // estimate) and tightened spacing (radius 140->220, max-per-cluster 2->1)
    // — both the raw count AND the local density were too high. Gremling
    // (melee-only, no unique resource) cut 6->4 for the same overrun feel.
    // Both variants share one spacing pool (`gremlinPoints`) so the combined
    // roster reads as spread out rather than clumping into packs.
    const GREMLIN_CLUSTER_RADIUS = 220;
    const GREMLIN_CLUSTER_MAX = 1;
    const gremlinPoints: { x: number; y: number }[] = [];
    const RANGED_GREMLIN_COUNT = 22; // bumped for the ~2x bigger map (was 12)
    for (let i = 0; i < RANGED_GREMLIN_COUNT; i++) {
      const { x, y } = this.pickSpreadSpawnPoint(
        rng,
        "grassy",
        200,
        gremlinPoints,
        GREMLIN_CLUSTER_RADIUS,
        GREMLIN_CLUSTER_MAX,
        true,
      );
      gremlinPoints.push({ x, y });
      const gremlin = new RangedGremlin(this, { x, y, elite: this.rollElite(rng) });
      this.enemies.push(gremlin);
      this.enemyGroup.add(gremlin);
    }
    const MELEE_GREMLING_COUNT = 8; // bumped for the ~2x bigger map (was 4)
    for (let i = 0; i < MELEE_GREMLING_COUNT; i++) {
      const { x, y } = this.pickSpreadSpawnPoint(
        rng,
        "grassy",
        200,
        gremlinPoints,
        GREMLIN_CLUSTER_RADIUS,
        GREMLIN_CLUSTER_MAX,
        true,
      );
      gremlinPoints.push({ x, y });
      const gremling = new MeleeGremling(this, { x, y, elite: this.rollElite(rng) });
      this.enemies.push(gremling);
      this.enemyGroup.add(gremling);
    }
  }

  // PB1 Session 3 — the forest roster's counterpart to spawnOuterForestContent:
  // the same 4 species out in the forest patchwork blobs beyond BIOME_RADIUS, at
  // roughly half the central disc's counts (a patchy blob, not a solid biome).
  // pickOuterForestPoint's null return skips a spawn attempt, so real placed
  // counts self-correct to however much forest-blob area actually exists.
  private spawnOuterForestEnemies(): void {
    const rng = this.sessionRng();
    const OUTER_BOAR_COUNT = 14;
    for (let i = 0; i < OUTER_BOAR_COUNT; i++) {
      const pt = this.pickOuterForestPoint(rng);
      if (!pt) break;
      const enemy = new Boar(this, { x: pt.x, y: pt.y, elite: this.rollElite(rng) });
      this.enemies.push(enemy);
      this.enemyGroup.add(enemy);
    }
    const OUTER_SNAKE_COUNT = 16;
    for (let i = 0; i < OUTER_SNAKE_COUNT; i++) {
      const pt = this.pickOuterForestPoint(rng);
      if (!pt) break;
      const snake = new Snake(this, { x: pt.x, y: pt.y, elite: this.rollElite(rng) });
      this.enemies.push(snake);
      this.enemyGroup.add(snake);
    }
    const OUTER_RANGED_GREMLIN_COUNT = 12;
    for (let i = 0; i < OUTER_RANGED_GREMLIN_COUNT; i++) {
      const pt = this.pickOuterForestPoint(rng);
      if (!pt) break;
      const gremlin = new RangedGremlin(this, { x: pt.x, y: pt.y, elite: this.rollElite(rng) });
      this.enemies.push(gremlin);
      this.enemyGroup.add(gremlin);
    }
    const OUTER_MELEE_GREMLING_COUNT = 5;
    for (let i = 0; i < OUTER_MELEE_GREMLING_COUNT; i++) {
      const pt = this.pickOuterForestPoint(rng);
      if (!pt) break;
      const gremling = new MeleeGremling(this, { x: pt.x, y: pt.y, elite: this.rollElite(rng) });
      this.enemies.push(gremling);
      this.enemyGroup.add(gremling);
    }
  }

  // Badlands roster (biome 2 Phase 2) — spawned out in the badlands patchwork via
  // pickBadlandsPoint, never the forest disc. "Noticeably tougher" (locked): the
  // enemies themselves carry ~1.5-2x forest stats, and Duskrunners come in packs.
  // Counts are sized so the ACCESSIBLE inner badlands has roughly forest-comparable
  // findable density (an earlier ~39-over-the-whole-ring pass left whole badlands
  // areas empty — the user's "0 enemies" report). Deep badlands stays sparse via
  // pickBadlandsPoint's inner-weighting. First-pass/tunable.
  private spawnBadlandsEnemies(): void {
    const rng = this.sessionRng();

    // Duskrunner packs — the pack-aggro payoff. Each pack clusters around one
    // badlands point so updatePackAggro visibly converges them once one engages.
    // Bumped 16→24 (the user: "enemy density feels pretty weak").
    const PACK_COUNT = 24;
    const PACK_JITTER = 70;
    for (let p = 0; p < PACK_COUNT; p++) {
      const center = this.pickBadlandsPoint(rng);
      if (!center) break;
      const size = rng.between(3, 4);
      for (let i = 0; i < size; i++) {
        const x = Phaser.Math.Clamp(center.x + rng.between(-PACK_JITTER, PACK_JITTER), 60, WORLD_W - 60);
        const y = Phaser.Math.Clamp(center.y + rng.between(-PACK_JITTER, PACK_JITTER), 60, WORLD_H - 60);
        const d = new Duskrunner(this, { x, y, elite: this.rollElite(rng) });
        this.enemies.push(d);
        this.enemyGroup.add(d);
      }
    }

    // Cragscales — scattered lone armored bruisers (the damage-type teachers).
    const CRAGSCALE_COUNT = 46;
    for (let i = 0; i < CRAGSCALE_COUNT; i++) {
      const pt = this.pickBadlandsPoint(rng);
      if (!pt) break;
      const c = new Cragscale(this, { x: pt.x, y: pt.y, elite: this.rollElite(rng) });
      this.enemies.push(c);
      this.enemyGroup.add(c);
    }

    // Hexlings — scattered magic casters (the first magic damage to the player).
    const HEXLING_COUNT = 44;
    for (let i = 0; i < HEXLING_COUNT; i++) {
      const pt = this.pickBadlandsPoint(rng);
      if (!pt) break;
      const h = new Hexling(this, { x: pt.x, y: pt.y, elite: this.rollElite(rng) });
      this.enemies.push(h);
      this.enemyGroup.add(h);
    }

    // Sandmaws — scattered LONE burrowing ambushers (Phase 2b, the 4th native).
    // Not packed (a lurker is a solo trap). Bumped 24→46 (the user: "need more
    // burrows") so a badlands crossing regularly triggers a lurking ambush.
    const SANDMAW_COUNT = 46;
    for (let i = 0; i < SANDMAW_COUNT; i++) {
      const pt = this.pickBadlandsPoint(rng);
      if (!pt) break;
      const s = new Sandmaw(this, { x: pt.x, y: pt.y, elite: this.rollElite(rng) });
      this.enemies.push(s);
      this.enemyGroup.add(s);
    }
  }

  // PB1 Session 3 — extends the badlands roster into the [BADLANDS_R_MAX_INNER,
  // BADLANDS_R_MAX_OUTER] band (playtest: "shouldn't have to loop around the whole
  // Badlands level ring just to get enough for base biome-2 stuff" — more Hexlings
  // in particular directly grows the hex-essence supply). Roughly half the inner
  // band's counts; called after every POI position is set so it correctly excludes
  // dens/forges/tyrant altars even though they're chosen before the wild inner-band
  // packs (spawnBadlandsFlora/Minerals/Nodes run before POIs are placed and don't
  // get this benefit — a pre-existing gap, not something this pass changes).
  private spawnOuterBadlandsEnemies(): void {
    const rng = this.sessionRng();
    const OUTER_PACK_COUNT = 12;
    const PACK_JITTER = 70;
    for (let p = 0; p < OUTER_PACK_COUNT; p++) {
      const center = this.pickBadlandsPoint(rng, 0.4, BADLANDS_R_MAX_INNER, BADLANDS_R_MAX_OUTER);
      if (!center) break;
      const size = rng.between(3, 4);
      for (let i = 0; i < size; i++) {
        const x = Phaser.Math.Clamp(center.x + rng.between(-PACK_JITTER, PACK_JITTER), 60, WORLD_W - 60);
        const y = Phaser.Math.Clamp(center.y + rng.between(-PACK_JITTER, PACK_JITTER), 60, WORLD_H - 60);
        const d = new Duskrunner(this, { x, y, elite: this.rollElite(rng) });
        this.enemies.push(d);
        this.enemyGroup.add(d);
      }
    }
    const OUTER_CRAGSCALE_COUNT = 24;
    for (let i = 0; i < OUTER_CRAGSCALE_COUNT; i++) {
      const pt = this.pickBadlandsPoint(rng, 0.4, BADLANDS_R_MAX_INNER, BADLANDS_R_MAX_OUTER);
      if (!pt) break;
      const c = new Cragscale(this, { x: pt.x, y: pt.y, elite: this.rollElite(rng) });
      this.enemies.push(c);
      this.enemyGroup.add(c);
    }
    const OUTER_HEXLING_COUNT = 22;
    for (let i = 0; i < OUTER_HEXLING_COUNT; i++) {
      const pt = this.pickBadlandsPoint(rng, 0.4, BADLANDS_R_MAX_INNER, BADLANDS_R_MAX_OUTER);
      if (!pt) break;
      const h = new Hexling(this, { x: pt.x, y: pt.y, elite: this.rollElite(rng) });
      this.enemies.push(h);
      this.enemyGroup.add(h);
    }
    const OUTER_SANDMAW_COUNT = 24;
    for (let i = 0; i < OUTER_SANDMAW_COUNT; i++) {
      const pt = this.pickBadlandsPoint(rng, 0.4, BADLANDS_R_MAX_INNER, BADLANDS_R_MAX_OUTER);
      if (!pt) break;
      const s = new Sandmaw(this, { x: pt.x, y: pt.y, elite: this.rollElite(rng) });
      this.enemies.push(s);
      this.enemyGroup.add(s);
    }
  }

  // Duskrunner Warrens (biome 2 Phase 3 POI) — a few dens spread widely across
  // the accessible badlands. Each starts guarded by a wave of 3 Duskrunners;
  // the den is inert until both waves fall, then it's smashable for its cache.
  // No respawn (the den is destroyed). Picked before the wild packs so their
  // clearings are excluded from ordinary spawns (DEN_CLEAR_RADIUS).
  private spawnBadlandsDens(): void {
    const rng = this.sessionRng();
    for (let i = 0; i < DEN_COUNT; i++) {
      let pt: { x: number; y: number } | null = null;
      let fallback: { x: number; y: number } | null = null;
      // 160 tries (was 80): the POI-separation constraint made a spot harder to
      // find, and dens are meant to be plentiful (the user), so give them room.
      for (let a = 0; a < 160; a++) {
        const cand = this.pickBadlandsPoint(rng);
        if (!cand) break;
        // Keep clear of every OTHER POI so a den never lands on a Cinder Forge /
        // vein / war camp / tyrant altar (the user: "Cinderwrought and Warren
        // overlap"). den↔den is handled by DEN_MIN_SPACING (900 > POI_MIN_SEPARATION),
        // so this only constrains den-vs-other-POI. fallback stays POI-safe too.
        if (this.tooCloseToAnyPoi(cand.x, cand.y, POI_MIN_SEPARATION)) continue;
        fallback = cand;
        if (
          this.badlandsDens.every(
            (d) => Phaser.Math.Distance.Between(d.x, d.y, cand.x, cand.y) >= DEN_MIN_SPACING,
          )
        ) {
          pt = cand;
          break;
        }
      }
      pt = pt ?? fallback;
      // Skip just THIS den if no POI-safe spot turned up (continue, not break, so
      // one crowded den doesn't cut the whole batch short — recovers the count the
      // POI-separation constraint would otherwise cost).
      if (!pt) continue;
      // POI dressing — a sandy dirt floor + a ring of bone-cairn stakes so the
      // warren reads as a den from a distance (the user).
      this.decoratePoi(rng, pt.x, pt.y, {
        floorTexture: "poi_floor_den",
        floorRadius: 150,
        ringTexture: "poi_ring_den",
        ringCount: 14,
        ringRadius: 140,
      });
      const den = new BadlandsDen(this, { x: pt.x, y: pt.y });
      this.badlandsDens.push(den);
      this.denLightPoints.push({ x: pt.x, y: pt.y });
      this.spawnDenWave(den, false); // wave 1: 3 normal Duskrunners
    }
  }

  // Spawn one wave of 3 Duskrunners clustered on a den, tracked as its guards.
  // Wave 1 (elite=false) at world-gen; wave 2 (elite=true) when wave 1 falls.
  private spawnDenWave(den: BadlandsDen, elite: boolean): void {
    const rng = this.sessionRng();
    const JITTER = 46;
    const guards: Enemy[] = [];
    for (let i = 0; i < 3; i++) {
      const x = Phaser.Math.Clamp(den.x + rng.between(-JITTER, JITTER), 60, WORLD_W - 60);
      const y = Phaser.Math.Clamp(den.y + rng.between(-JITTER, JITTER), 60, WORLD_H - 60);
      // Anchor guards to the den so they don't idle-wander off the POI.
      const d = new Duskrunner(this, { x, y, elite, wanderAnchor: { x: den.x, y: den.y } });
      guards.push(d);
      this.enemies.push(d);
      this.enemyGroup.add(d);
    }
    den.guards = guards;
  }

  // Called from resolveWeaponHit()'s kill branch for every defeated enemy — a
  // no-op unless `enemy` was a Warren guard. Once a wave is fully cleared:
  // wave1 -> spawn the elite wave2; wave2 -> the den becomes smashable.
  private onDenGuardKilled(enemy: Enemy): void {
    const den = this.badlandsDens.find((d) => d.guards.includes(enemy));
    if (!den) return;
    den.guards = den.guards.filter((g) => g !== enemy);
    if (den.guards.length > 0) return;
    if (den.phase === "wave1") {
      // S4: don't insta-pop wave 2 on top of the player the instant wave 1 dies
      // (they spawned + aggro'd in the same frame, which read as cheap). The den
      // "stirs" now; the elites burst a beat later. Guard on phase so a den
      // destroyed/reset before the beat elapses can't spawn a ghost wave.
      den.phase = "wave2";
      this.eventLog.add("combat", "The warren stirs — something is coming...");
      this.time.delayedCall(DEN_WAVE2_DELAY_MS, () => {
        if (den.phase !== "wave2" || den.guards.length > 0) return;
        this.spawnDenWave(den, true);
        this.eventLog.add("combat", "Elite Duskrunners burst from the den!");
      });
    } else if (den.phase === "wave2") {
      den.phase = "attackable";
      den.markAttackable();
      this.eventLog.add("info", "The warren stands undefended — smash it to loot the den");
    }
  }

  // Reach for smashing a den — REACH plus however much the den's own footprint
  // exceeds the baseline sprite radius (mirrors enemyReach() for big enemies).
  private denReach(den: BadlandsDen): number {
    const radius = Math.max(den.image.displayWidth, den.image.displayHeight) / 2;
    return REACH + Math.max(0, radius - MainScene.BASELINE_ENEMY_RADIUS);
  }

  // Smash an exposed den with the equipped MELEE weapon (a Warren is a physical
  // structure — ranged weapons don't apply). Mirrors tryMeleeAttack's cooldown/
  // stamina/reach guards; on collapse it rolls + reveals the cache.
  private tryAttackDen(den: BadlandsDen): void {
    if (den.phase !== "attackable") return;
    if (!this.equippedWeapon || isRangedWeapon(this.equippedWeapon)) return;
    const inReach =
      Phaser.Math.Distance.Between(this.player.x, this.player.y, den.x, den.y) <= this.denReach(den);
    if (!inReach) return;

    const cooldownMs = weaponCooldownMs(this.equippedWeapon) * this.attackCooldownMult();
    if (this.time.now - this.lastWeaponHitAt < cooldownMs) return;
    const staminaCost = Math.round(weaponStaminaCost(this.equippedWeapon) * this.effectiveStaminaCostMult());
    if (!this.stamina.canAfford(staminaCost)) return;

    this.lastWeaponHitAt = this.time.now;
    this.stamina.spend(staminaCost);
    this.player.playSwing();
    this.player.playEquippedSwing();

    const dmgType = weaponPrimaryDamageType(this.equippedWeapon);
    const dmg =
      (this.equippedWeaponBaseDamage()) *
      this.damageBonusMult(dmgType);
    this.sfx.hit();
    this.spawnDamageNumber(den.x, den.y, Math.round(dmg), false, "normal");
    if (den.takeHit(dmg)) {
      this.rollContainerLoot(den.loot, DUSKRUNNER_WARREN_LOOT_TABLE);
      den.syncGlow();
      this.eventLog.add("info", "The warren collapses — search the remains");
    }
  }

  // Arid harvestables (biome 2 Phase 2) — free pickups scattered through the
  // badlands, reusing the persistent + regrow pattern (like Blackberry): harvest
  // yields the resource and swaps to a "picked" look, regrowing after a timer.
  // No recipes wired yet — they're future alchemy/food ingredients, surfaced only
  // via the discovered-material toast.
  private spawnBadlandsFlora(): void {
    const rng = this.sessionRng();
    // `patch` (the user): crops (blooms) grow in little patches of 3-5 around a
    // shared center instead of scattered individually; the cactus + mushroom
    // stay solo. A patch places its members with a small jitter off the center.
    const scatterFlora = (
      texture: string,
      pickedTexture: string,
      resource: ResourceType,
      displayName: string,
      count: number,
      patch?: { min: number; max: number },
    ) => {
      const makeNode = (x: number, y: number) => {
        const node = new ResourceNode(this, {
          x,
          y,
          texture,
          resource,
          amount: 1,
          action: "pickup",
          displayName,
          loose: false,
          health: 1,
          persistent: true,
          pickedTexture,
          regrowMs: BLACKBERRY_REGROW_MS,
        });
        this.nodes.push(node);
      };
      let placed = 0;
      while (placed < count) {
        const center = this.pickBadlandsPoint(rng);
        if (!center) break;
        const inPatch = patch ? Math.min(rng.between(patch.min, patch.max), count - placed) : 1;
        for (let j = 0; j < inPatch; j++) {
          const jx = patch && j > 0 ? rng.between(-38, 38) : 0;
          const jy = patch && j > 0 ? rng.between(-38, 38) : 0;
          makeNode(center.x + jx, center.y + jy);
          placed++;
        }
      }
    };
    // More pickable badlands vegetation (the user), with bumped counts so the
    // flats don't read as barren. Blooms (Emberbloom/Dustbloom) grow in patches;
    // the cactus (Sunfruit) and mushroom (Gloamcap) stay scattered solo.
    scatterFlora("emberbloom", "emberbloom_picked", "emberbloom", "Emberbloom", 60, { min: 3, max: 5 });
    scatterFlora("sunfruit_cactus", "sunfruit_cactus_picked", "sunfruit", "Sunfruit", 48);
    scatterFlora("gloamcap", "gloamcap_picked", "gloamcap", "Gloamcap", 44);
    scatterFlora("dustbloom", "dustbloom_picked", "dustbloom", "Dustbloom", 52, { min: 3, max: 5 });
  }

  // --- Badlands macro-zones (the user: the biome felt like uniform random scatter;
  // give it structure — a few LARGE, visually-distinct themed regions content keys
  // off, so it reads as deliberate PLACES). Two types: `boulderfield` (dense grey
  // rock formations you weave through / take cover in — blocking) and `thornfield`
  // (dense brambles that slow + rich foraging). Each gets a ground decal so the area
  // is obvious from a distance. Placed after every POI so their clear radii exclude
  // zones; wild scatter avoids zone cores (subZoneAt gate in pickBadlandsPoint), and
  // each zone gets its own dense props + themed enemies, giving the biome structure
  // amid the organic open ground between zones. ---

  // The zone's organic (non-circular) edge distance in the direction `ang` (radians
  // from the zone center) — base radius modulated by 3 angular harmonics, mirroring
  // WorldBiomes.seedCoverage's blob-edge wobble.
  private zoneEdge(z: ZoneShape, ang: number): number {
    const wob =
      0.6 * Math.sin(ang * z.wK + z.wPhase) +
      0.28 * Math.sin(ang * (z.wK * 2 + 1) + z.wPhase * 1.7) +
      0.16 * Math.sin(ang * (z.wK * 3 + 2) - z.wPhase * 0.6);
    return z.r * (1 + z.wAmp * wob);
  }

  private subZoneAt(x: number, y: number): BadlandsZone | null {
    let best: BadlandsZone | null = null;
    let bd = Infinity;
    for (const z of this.badlandsZones) {
      const dx = x - z.x;
      const dy = y - z.y;
      const d = Math.hypot(dx, dy);
      if (d <= this.zoneEdge(z, Math.atan2(dy, dx)) && d < bd) {
        best = z;
        bd = d;
      }
    }
    return best;
  }

  // Pick a handful of large themed sub-zones, roughly alternating type and kept far
  // apart so each is its own recognizable area (not a merged mush). Run AFTER all
  // POIs so pickBadlandsPoint's POI exclusions apply; the subZoneAt gate it also
  // checks naturally spreads new zones off already-placed ones.
  private placeBadlandsZones(): void {
    const rng = this.sessionRng();
    const TYPES = ["boulderfield", "thornfield"] as const;
    const TARGET = 10;
    const MIN_SEP = 720; // between zone centers — keep areas visually separate
    // pickBadlandsPoint only excludes a zone's CENTER from POI clearings, but a
    // zone's big radius can still sweep over a POI (the user saw a Sunken Forge
    // inside a thornfield's slow). Require the WHOLE zone to clear every POI: the
    // zone edge must stay at least the POI's clear radius from the POI center, so a
    // boss arena is never inside a slow/rock field.
    const clearsPois = (x: number, y: number, r: number): boolean => {
      const far = (c: { x: number; y: number } | null | undefined, pad: number) =>
        !c || Phaser.Math.Distance.Between(x, y, c.x, c.y) >= r + pad;
      return (
        far(this.altarPosition, WAR_CAMP_CLEAR_RADIUS) &&
        far(this.veinPosition, VEIN_CLEAR_RADIUS) &&
        this.forgePositions.every((f) => far(f, FORGE_CLEAR_RADIUS)) &&
        this.badlandsDens.every((d) => far(d, DEN_CLEAR_RADIUS)) &&
        this.tyrantAltarPositions.every((a) => far(a, TYRANT_ALTAR_CLEAR_RADIUS))
      );
    };
    let guard = 0;
    while (this.badlandsZones.length < TARGET && guard++ < 1200) {
      const p = this.pickBadlandsPoint(rng);
      if (!p) break;
      if (this.badlandsZones.some((z) => Phaser.Math.Distance.Between(p.x, p.y, z.x, z.y) < MIN_SEP)) continue;
      const type = TYPES[this.badlandsZones.length % TYPES.length];
      const r = type === "boulderfield" ? rng.between(330, 470) : rng.between(300, 430);
      const wAmp = rng.realInRange(0.16, 0.24); // ±16–24% organic lumpiness
      // Clear POIs by the zone's OUTERMOST lobe so no lobe ever laps a boss arena.
      if (!clearsPois(p.x, p.y, r * (1 + wAmp * WOBBLE_MAX))) continue;
      this.badlandsZones.push({ type, x: p.x, y: p.y, r, wK: rng.between(2, 4), wPhase: rng.frac() * Math.PI * 2, wAmp });
    }
  }

  // --- Duskmire Bayou content (biome 3 Phase 4a) ---
  //
  // Everything here routes through pickBayouPoint, so it lands only where bayou
  // is the dominant biome and every POI clearing is honored. This pass is
  // deliberately TERRAIN-AND-SOURCES only — the melee roster (and Mirehide, which
  // is a CREATURE hide and can't honestly come from a node) lands in Phase 4b.

  // The bayou's basics + its material sources. Same "every biome supplies the
  // universal wood/stone keys" rule the badlands follows (so all existing recipes
  // work out here), plus the ore/gem nodes that finally give the Phase-2b/3
  // dormant materials a real in-world source.
  private spawnBayouNodes(): void {
    const rng = this.sessionRng();
    const scatter = (cfg: {
      texture: string;
      resource: ResourceType;
      displayName: string;
      action: NodeAction;
      amountMin: number;
      amountMax: number;
      health: number;
      count: number;
      minToolTier?: number;
    }) => {
      for (let i = 0; i < cfg.count; i++) {
        // Solid/mineable things avoid the deep channels (see pickBayouPoint) so
        // harvesting never demands standing in the heavy water slow.
        const pt = this.pickBayouPoint(rng, 0.4, BAYOU_R_MIN, BAYOU_R_MAX, { avoidDeepWater: true });
        if (!pt) break;
        const node = new ResourceNode(this, {
          x: pt.x,
          y: pt.y,
          texture: cfg.texture,
          resource: cfg.resource,
          amount: rng.between(cfg.amountMin, cfg.amountMax),
          action: cfg.action,
          displayName: cfg.displayName,
          loose: false,
          health: cfg.health,
          minToolTier: cfg.minToolTier,
        });
        this.nodes.push(node);
        if (cfg.action !== "pickup") this.obstacleNodes.push(node);
      }
    };
    // Basics — the universal wood/stone keys under bayou skins.
    scatter({ texture: "bayou_cypress", resource: "wood", displayName: "Cypress", action: "chop", amountMin: 5, amountMax: 5, health: 3, count: 56 });
    scatter({ texture: "bayou_mirestone", resource: "stone", displayName: "Mirestone", action: "mine", amountMin: 5, amountMax: 5, health: 3, count: 48 });
    scatter({ texture: "bayou_driftwood", resource: "wood", displayName: "Driftwood", action: "pickup", amountMin: 1, amountMax: 1, health: 1, count: 42 });
    scatter({ texture: "bayou_shellrock", resource: "stone", displayName: "Shellrock", action: "pickup", amountMin: 1, amountMax: 1, health: 1, count: 42 });
    // Bog Ore — the bayou's metal, plentiful like Sunscorch was in the badlands
    // (it feeds a whole reforge tier, so it can't trickle).
    // minToolTier 1: needs the Ironshod Pickaxe (B4-P5), the mining mirror of
    // the Ironbark axe gate. Bog Ore is the bayou's only surface ore, so this is
    // the gate on the whole bayou metal economy.
    //
    // A baseline flat scatter for general presence, PLUS clustered bunches
    // biased into the miasma/bonemire zones (the user: "put more gloam^H^H^H bog
    // ore on the map — add bunches in dangerous areas") — poison fog and the
    // haunted boneyard are the bayou's two hazard zones, so a Bog Ore hunt now
    // pulls the player toward the parts of the swamp that actually bite back.
    scatter({ texture: "bog_ore_node", resource: "bog_ore", displayName: "Bog Ore", action: "mine", amountMin: 3, amountMax: 5, health: 3, count: 24, minToolTier: 1 });
    const BOG_ORE_CLUSTERS = 10;
    for (let c = 0; c < BOG_ORE_CLUSTERS; c++) {
      const zone = c % 2 === 0 ? "miasma" : "bonemire";
      const center = this.pickBayouPoint(rng, 0.4, BAYOU_R_MIN, BAYOU_R_MAX, { avoidDeepWater: true, preferZone: zone });
      if (!center) continue;
      const count = rng.between(3, 4);
      for (let i = 0; i < count; i++) {
        let x = Phaser.Math.Clamp(center.x + rng.between(-70, 70), 60, WORLD_W - 60);
        let y = Phaser.Math.Clamp(center.y + rng.between(-70, 70), 60, WORLD_H - 60);
        // Jitter can push a member off bayou or into deep water — fall back to
        // the (already-verified) anchor rather than dropping the node.
        if (
          this.worldBiomes.dominantBiomeAt(x, y) !== "bayou" ||
          bayouWaterAt(x, y, this.outerFeatureBiome) === "deep"
        ) {
          x = center.x;
          y = center.y;
        }
        const node = new ResourceNode(this, {
          x,
          y,
          texture: "bog_ore_node",
          resource: "bog_ore",
          amount: rng.between(3, 5),
          action: "mine",
          displayName: "Bog Ore",
          loose: false,
          health: 3,
          minToolTier: 1,
        });
        this.nodes.push(node);
        this.obstacleNodes.push(node);
      }
    }
    // DELIBERATELY ABSENT: Moonsilver seams and the three ability geodes.
    //
    // Locked by the user (2026-07-22): the most precious materials are NOT found on
    // the surface — they're **dungeon loot** (a Valheim burial-chamber/sunken-crypt
    // mechanic, its own upcoming phase). The surface bayou's job is to feel
    // dangerous and murky while you hunt for a way IN; its reward is bulk
    // gathering (wood/stone/Bog Ore) and foraging, not build-defining materials.
    //
    // Bog Ore stays above ground on purpose: it's the bulk metal behind the whole
    // Gloamsteel/Mirehide reforge tier, so keeping it surface-mineable means
    // exploring the swamp still pays, while abilities + jewelry stay gated.
    //
    // `moonsilver_node` / `geode_gloam` / `geode_ember` / `geode_blood` textures
    // and their ResourceNode shapes are intentionally KEPT (BootScene + the
    // scatter helper above) — the dungeon phase places these exact nodes inside
    // interiors, so nothing here needs rebuilding, only re-siting. Until then
    // `moonsilver` + the three gems are dormant again (test via `__dev.give`),
    // which is the same state Phase 2b shipped them in.
  }

  // Bayou flora — persistent free-pickups on the Blackberry regrow path (harvest
  // swaps to a picked texture, regrows on a timer) so the swamp stays foragable.
  // Water lilies deliberately DON'T avoid deep water: they belong on the channels,
  // and wading out for them is the point (the slow is the cost of the harvest).
  private spawnBayouFlora(): void {
    const rng = this.sessionRng();
    const scatterFlora = (cfg: {
      texture: string;
      pickedTexture: string;
      resource: ResourceType;
      displayName: string;
      count: number;
      avoidDeepWater: boolean;
    }) => {
      for (let i = 0; i < cfg.count; i++) {
        const pt = this.pickBayouPoint(rng, 0.4, BAYOU_R_MIN, BAYOU_R_MAX, {
          avoidDeepWater: cfg.avoidDeepWater,
        });
        if (!pt) break;
        this.nodes.push(
          new ResourceNode(this, {
            x: pt.x,
            y: pt.y,
            texture: cfg.texture,
            resource: cfg.resource,
            amount: 1,
            action: "pickup",
            displayName: cfg.displayName,
            loose: false,
            health: 1,
            persistent: true,
            pickedTexture: cfg.pickedTexture,
            regrowMs: BLACKBERRY_REGROW_MS,
          }),
        );
      }
    };
    scatterFlora({ texture: "swamp_moss", pickedTexture: "swamp_moss_picked", resource: "swamp_moss", displayName: "Swamp Moss", count: 90, avoidDeepWater: true });
    scatterFlora({ texture: "water_lily", pickedTexture: "water_lily_picked", resource: "water_lily", displayName: "Water Lily", count: 70, avoidDeepWater: false });
  }

  // The Duskmire Bayou's creature roster (biome 3 Phase 4b) — MELEE-CORE by
  // design (locked): five melee kits plus one deliberately uncommon ranged haunt.
  // Everything routes through pickBayouPoint, so it can only land where the bayou
  // actually dominates and never inside a POI clearing.
  //
  // Counts follow the badlands' hard-won density lesson (the user's "0 enemies
  // found" report): the bayou band is a big annulus, so a count that looks large
  // on paper still reads sparse on the ground. Roughly badlands-comparable per
  // area, weighted toward the swarm — and everything except the Mirejaw and the
  // Corpselight is uneven/clustered rather than evenly spread, per the standing
  // organic-density preference. First-pass/tunable.
  private spawnBayouEnemies(): void {
    const rng = this.sessionRng();
    const add = (e: Enemy) => {
      this.enemies.push(e);
      this.enemyGroup.add(e);
    };
    // Scatter a clustered group around one bayou anchor point — the shared shape
    // for every packed species below (jitter is per-species, since a Murkling
    // swarm boils out of one reed-bed while toads are just loosely neighborly).
    const cluster = (
      count: number,
      jitter: number,
      make: (x: number, y: number) => Enemy,
      themed: { preferWater?: boolean; preferZone?: "miasma" | "bonemire" | "hammock" } = {},
    ) => {
      const center = this.pickBayouPoint(rng, 0.4, BAYOU_R_MIN, BAYOU_R_MAX, { avoidDeepWater: true, ...themed });
      if (!center) return false;
      for (let i = 0; i < count; i++) {
        let x = Phaser.Math.Clamp(center.x + rng.between(-jitter, jitter), 60, WORLD_W - 60);
        let y = Phaser.Math.Clamp(center.y + rng.between(-jitter, jitter), 60, WORLD_H - 60);
        // The anchor is verified bayou, but jitter can push a member over a seam
        // into the neighbouring biome — which reads exactly like the "spawned in
        // the wrong biome" bug the badlands seam had. Fall back to the anchor
        // rather than dropping the member (the badlands pack spawner doesn't do
        // this check; this is the improved version).
        if (this.worldBiomes.dominantBiomeAt(x, y) !== "bayou") {
          x = center.x;
          y = center.y;
        }
        add(make(x, y));
      }
      return true;
    };

    // Murkling swarms — the pack-aggro payoff. 4-6 per reed-bed, tightly
    // clustered so updatePackAggro visibly cascades the whole nest awake.
    // Murkling swarms — themed to the HAMMOCK (raised reed-beds), where a nest
    // boiling out of the reeds reads right (the user: more themed bayou spawns).
    const MURKLING_NESTS = 26;
    for (let n = 0; n < MURKLING_NESTS; n++) {
      if (!cluster(rng.between(4, 6), 60, (x, y) => new Murkling(this, { x, y, elite: this.rollElite(rng, BAYOU_ELITE_CHANCE_MULT) }), { preferZone: "hammock" })) break;
    }

    // Blighttoads — loose semi-swarm clumps of 2-3. Themed to the MIASMA (the
    // poison-fog swamp — where poison frogs belong, and abundant enough for the
    // theming to read; the creek "lilypad" water is too sparse to congregate on).
    const TOAD_CLUMPS = 26;
    for (let c = 0; c < TOAD_CLUMPS; c++) {
      if (!cluster(rng.between(2, 3), 110, (x, y) => new Blighttoad(this, { x, y, elite: this.rollElite(rng, BAYOU_ELITE_CHANCE_MULT) }), { preferZone: "miasma" })) break;
    }

    // Mirejaws — LONE ambushers (a gator doesn't share a stretch of water), and
    // the only Mirehide source, so there have to be enough of them that hunting
    // for hide is a hunt rather than a scavenger sweep of the whole band.
    const MIREJAW_COUNT = 44;
    for (let i = 0; i < MIREJAW_COUNT; i++) {
      // Gators lurk in the water (themed spawn) — deep channels included, so no avoidDeepWater.
      const pt = this.pickBayouPoint(rng, 0.4, BAYOU_R_MIN, BAYOU_R_MAX, { preferWater: true });
      if (!pt) break;
      add(new Mirejaw(this, { x: pt.x, y: pt.y, elite: this.rollElite(rng, BAYOU_ELITE_CHANCE_MULT) }));
    }

    // Mosswretches — mostly solitary, occasionally a pair of husks together.
    // Themed to the bonemire (the drowned boneyard of dead trees these husks are
    // made of), which also makes it the "haunted" zone alongside the Corpselights.
    const MOSSWRETCH_GROUPS = 30;
    for (let g = 0; g < MOSSWRETCH_GROUPS; g++) {
      if (!cluster(rng.between(1, 2), 90, (x, y) => new Mosswretch(this, { x, y, elite: this.rollElite(rng, BAYOU_ELITE_CHANCE_MULT) }), { preferZone: "bonemire" })) break;
    }

    // Fenlurker (burrowing ambusher) CUT 2026-07-23 (the user: "a really boring
    // enemy to fight — I'd just remove it entirely"). The Sandmaw already covers
    // the badlands burrow-ambush niche; the bayou didn't need a second one.

    // Corpselights — the ONE ranged creature, kept genuinely uncommon (about a
    // third of any melee species) so the biome still reads melee-core and a
    // homing orb stays an event rather than ambient chip damage.
    const CORPSELIGHT_COUNT = 22;
    for (let i = 0; i < CORPSELIGHT_COUNT; i++) {
      // Haunts drift over the drowned boneyard (themed — the "haunted" zone,
      // alongside the Drowned Lodge POI which already anchors ranged content).
      const pt = this.pickBayouPoint(rng, 0.4, BAYOU_R_MIN, BAYOU_R_MAX, { preferZone: "bonemire" });
      if (!pt) break;
      add(new Corpselight(this, { x: pt.x, y: pt.y, elite: this.rollElite(rng, BAYOU_ELITE_CHANCE_MULT) }));
    }
  }

  // Biome-3 miasma zones — the bayou's counterpart to the badlands macro-zones,
  // and the payoff of Phase 1's generic environment hook: inside one, HP regen is
  // suppressed and poison ticks (see environmentEffectAt). Deliberately SMALLER
  // and more numerous than a badlands zone: a miasma is a pocket of bad air you
  // route around or push through, not a region you live in. Run after every POI so
  // pickBayouPoint's exclusions apply.
  private placeBayouZones(): void {
    const rng = this.sessionRng();
    // Per-type targets rather than an even split: the miasma is the bayou's
    // SIGNATURE, and the user wants it **very common and large** — the swamp
    // should read as choked with gloam fog, with the other zones as punctuation.
    // It's placed first so it claims ground freely, and it's the only type
    // allowed to sit close to its own kind (selfSep), so neighbouring miasmas
    // MERGE into big irregular fog banks instead of staying tidy separate discs.
    const PLAN = [
      { type: "miasma" as const, count: 46, rMin: 520, rMax: 780, selfSep: 520 },
      { type: "bonemire" as const, count: 8, rMin: 260, rMax: 360, selfSep: 700 },
      { type: "hammock" as const, count: 8, rMin: 260, rMax: 360, selfSep: 700 },
    ];
    // Distance a zone must keep from a zone of a DIFFERENT type. Larger than any
    // self-separation so a hammock stays a genuine respite — a big miasma lapping
    // over the one safe island would quietly delete the thing that makes it one.
    // Must exceed the largest miasma radius plus the other zone's own radius, or
    // a fog bank simply swallows the island it was supposed to spare — and since
    // miasma is placed FIRST, bayouZoneAt would resolve the overlap in its favour.
    const CROSS_SEP = 1250;
    for (const plan of PLAN) {
      let placed = 0;
      let guard = 0;
      while (placed < plan.count && guard++ < 1400) {
        const p = this.pickBayouPoint(rng);
        if (!p) break;
        const tooClose = this.bayouZones.some((z) => {
          const sep = z.type === plan.type ? plan.selfSep : CROSS_SEP;
          return Phaser.Math.Distance.Between(p.x, p.y, z.x, z.y) < sep;
        });
        if (tooClose) continue;
        this.bayouZones.push({
          type: plan.type,
          x: p.x,
          y: p.y,
          r: rng.between(plan.rMin, plan.rMax),
          wK: rng.between(2, 4),
          wPhase: rng.frac() * Math.PI * 2,
          wAmp: rng.realInRange(0.16, 0.24),
        });
        placed++;
      }
    }
  }

  // Each miasma gets a sickly ground decal + a scatter of fume props, so the
  // hazard is legible from outside it — the player should never walk into a
  // regen-blocking poison field with no warning (the same "make the area obvious
  // from a distance" rule the badlands zones follow).
  private spawnBayouZoneContent(): void {
    const rng = this.sessionRng();
    for (const z of this.bayouZones) {
      if (z.type === "miasma") {
        // Sickly green floor + fume props, so a regen-blocking poison field is
        // legible from OUTSIDE it — the player should never walk into one blind
        // (the same "obvious from a distance" rule the badlands zones follow).
        this.drawZoneFloor(z, 0x2c3a24, 0x4d6b2e);
        // Fume count scales with AREA but is capped — miasmas are large now, and
        // holding the old small-zone density would put thousands of sprites in
        // the world. The ground decal already fills the whole organic blob, so
        // the fumes are an accent on top of it rather than the fog itself.
        this.scatterInZone(z, rng, Math.min(120, Math.round((Math.PI * z.r * z.r) / 6500)), (x, y) => {
          this.add
            .image(x, y, "miasma_fume")
            .setDepth(ysortDepth(y))
            .setAlpha(0.5 + rng.frac() * 0.35)
            .setScale(0.8 + rng.frac() * 0.9);
        });
      } else if (z.type === "bonemire") {
        // A drowned boneyard: pale bleached floor, a thicket of dead trunks and
        // bone litter. Purely decorative props (non-solid) — the zone's teeth are
        // its slow, not physical blockers, so it stays a place you can flee across.
        this.drawZoneFloor(z, 0x2a2b33, 0x585a66);
        this.scatterInZone(z, rng, Math.min(48, Math.round((Math.PI * z.r * z.r) / 4200)), (x, y) => {
          this.add
            .image(x, y, "bayou_deadtree")
            .setDepth(ysortDepth(y))
            .setFlipX(rng.frac() < 0.5)
            .setScale(0.85 + rng.frac() * 0.4);
        });
        this.scatterInZone(z, rng, Math.min(40, Math.round((Math.PI * z.r * z.r) / 5200)), (x, y) => {
          this.add
            .image(x, y, "bayou_bones")
            .setDepth(ysortDepth(y))
            .setFlipX(rng.frac() < 0.5)
            .setAlpha(0.85);
        });
      } else {
        // A cypress hammock: raised dry ground, dense reeds, and the swamp's best
        // foraging. The counterweight to the other two — somewhere worth reaching.
        this.drawZoneFloor(z, 0x2b3a2c, 0x4a6b40);
        this.scatterInZone(z, rng, Math.min(60, Math.round((Math.PI * z.r * z.r) / 3600)), (x, y) => {
          this.add
            .image(x, y, "bayou_reeds")
            .setDepth(ysortDepth(y))
            .setFlipX(rng.frac() < 0.5)
            .setScale(0.8 + rng.frac() * 0.5);
        });
        // Real cypress (chop for wood) + rich flora — the hammock is the one place
        // the surface reliably pays, now that ore/gems live underground.
        this.scatterInZone(z, rng, rng.between(7, 12), (x, y) => {
          const node = new ResourceNode(this, {
            x,
            y,
            texture: "bayou_cypress",
            resource: "wood",
            amount: 5,
            action: "chop",
            displayName: "Cypress",
            loose: false,
            health: 3,
          });
          this.nodes.push(node);
          this.obstacleNodes.push(node);
        });
        this.scatterInZone(z, rng, rng.between(12, 20), (x, y) => {
          const moss = rng.frac() < 0.55;
          this.nodes.push(
            new ResourceNode(this, {
              x,
              y,
              texture: moss ? "swamp_moss" : "water_lily",
              resource: (moss ? "swamp_moss" : "water_lily") as ResourceType,
              amount: 1,
              action: "pickup",
              displayName: moss ? "Swamp Moss" : "Water Lily",
              loose: false,
              health: 1,
              persistent: true,
              pickedTexture: moss ? "swamp_moss_picked" : "water_lily_picked",
              regrowMs: BLACKBERRY_REGROW_MS,
            }),
          );
        });
      }
    }
  }

  // Scatter `count` items uniformly inside a zone's ORGANIC outline (not a
  // circle), shared by every zone-fill pass.
  private scatterInZone(
    z: ZoneShape,
    rng: Phaser.Math.RandomDataGenerator,
    count: number,
    place: (x: number, y: number) => void,
  ): void {
    for (let i = 0; i < count; i++) {
      const a = rng.frac() * Math.PI * 2;
      const d = Math.sqrt(rng.frac()) * this.zoneEdge(z, a) * 0.94;
      const x = z.x + Math.cos(a) * d;
      const y = z.y + Math.sin(a) * d;
      // A zone is placed clear of POIs, but a big one's EDGE can still reach into
      // a nearby POI clearing — this is the path that put cypresses inside a
      // Drowned Lodge. Skip rather than retry: a zone that overlaps a POI should
      // just be a little thinner where they meet.
      if (this.insidePoiClearing(x, y)) continue;
      place(x, y);
    }
  }

  // Stamp each zone's ground decal + fill it with dense, themed props.
  private spawnBadlandsZoneContent(solids: Phaser.Physics.Arcade.StaticGroup): void {
    const rng = this.sessionRng();
    for (const z of this.badlandsZones) {
      this.drawZoneFloor(
        z,
        z.type === "boulderfield" ? 0x30343b : 0x1d160c,
        z.type === "boulderfield" ? 0x474d57 : 0x2a2612,
      );
      if (z.type === "boulderfield") this.fillBoulderfield(z, solids, rng);
      else this.fillThornfield(z, rng);
    }
  }

  // The zone's ground decal, drawn as a soft-edged ORGANIC blob that follows the
  // wobbly zoneEdge outline (not a scaled circle), so the area itself reads as
  // non-circular. Layered translucent fills give the soft radial look the old
  // texture had. One Graphics per zone at depth -7 (above the ground overlay).
  private drawZoneFloor(z: ZoneShape, base: number, core: number): void {
    const gfx = this.add.graphics().setDepth(-7);
    const STEP = 0.16; // angular sampling of the outline
    const blob = (scale: number, color: number, alpha: number) => {
      gfx.fillStyle(color, alpha);
      gfx.beginPath();
      let first = true;
      for (let a = 0; a < Math.PI * 2; a += STEP) {
        const e = this.zoneEdge(z, a) * scale;
        const px = z.x + Math.cos(a) * e;
        const py = z.y + Math.sin(a) * e;
        if (first) {
          gfx.moveTo(px, py);
          first = false;
        } else {
          gfx.lineTo(px, py);
        }
      }
      gfx.closePath();
      gfx.fillPath();
    };
    for (let s = 7; s >= 1; s--) blob(s / 7, base, 0.06); // outer fade to the wobbly edge
    for (let s = 4; s >= 1; s--) blob((s / 4) * 0.6, core, 0.07); // denser core
  }

  // Boulderfield: several rock RIDGE-LINES (barriers with walkable gaps) plus
  // scattered rocks — a navigable maze/cover formation, not an impassable disk.
  // All solid (added to `solids`; player + enemies collide) and recorded so wild
  // spawns avoid them.
  private fillBoulderfield(
    z: BadlandsZone,
    solids: Phaser.Physics.Arcade.StaticGroup,
    rng: Phaser.Math.RandomDataGenerator,
  ): void {
    const place = (x: number, y: number) => {
      // Clamp to the zone's organic outline, not a circle.
      if (Math.hypot(x - z.x, y - z.y) > this.zoneEdge(z, Math.atan2(y - z.y, x - z.x))) return;
      const base = rng.frac() < 0.4 ? "badlands_mesa_spire" : "badlands_rockwall";
      const img = solids.create(x, y, variantAt(this, base, x, y)) as Phaser.Physics.Arcade.Image;
      img.setDepth(ysortDepth(y));
      this.obstaclePositions.push({ x, y, r: Math.max(img.width, img.height) / 2 });
    };
    const ridges = rng.between(3, 5);
    for (let i = 0; i < ridges; i++) {
      const ang = rng.frac() * Math.PI * 2;
      // offset the ridge origin off-center so ridges don't all cross the middle
      const off = rng.between(-Math.round(z.r * 0.55), Math.round(z.r * 0.55));
      const ox = z.x + Math.cos(ang + Math.PI / 2) * off;
      const oy = z.y + Math.sin(ang + Math.PI / 2) * off;
      const len = rng.between(3, 6);
      for (let j = 0; j < len; j++) {
        const d = (j - len / 2) * rng.between(34, 44);
        place(ox + Math.cos(ang) * d, oy + Math.sin(ang) * d);
      }
    }
    const extra = rng.between(6, 12);
    for (let i = 0; i < extra; i++) {
      const a = rng.frac() * Math.PI * 2;
      const d = Math.sqrt(rng.frac()) * this.zoneEdge(z, a) * 0.9;
      place(z.x + Math.cos(a) * d, z.y + Math.sin(a) * d);
    }
  }

  // Thornfield: fill the whole region densely with non-solid bramble scrub (the
  // slow applies across the entire zone via environmentEffectAt) + dense foraging
  // clusters of a badlands harvestable — crossing the slow is rewarded (the user).
  private fillThornfield(z: BadlandsZone, rng: Phaser.Math.RandomDataGenerator): void {
    const brambleCount = Math.min(150, Math.round((Math.PI * z.r * z.r) / 3200)); // dense fill
    for (let i = 0; i < brambleCount; i++) {
      const a = rng.frac() * Math.PI * 2;
      const d = Math.sqrt(rng.frac()) * this.zoneEdge(z, a) * 0.96;
      const x = z.x + Math.cos(a) * d;
      const y = z.y + Math.sin(a) * d;
      this.add.image(x, y, "bramble").setDepth(ysortDepth(y));
    }
    const flora = [
      { tex: "dustbloom", picked: "dustbloom_picked", res: "dustbloom", name: "Dustbloom" },
      { tex: "emberbloom", picked: "emberbloom_picked", res: "emberbloom", name: "Emberbloom" },
    ];
    const kind = flora[rng.between(0, flora.length - 1)];
    const bloom = rng.between(14, 24);
    for (let i = 0; i < bloom; i++) {
      const a = rng.frac() * Math.PI * 2;
      const d = Math.sqrt(rng.frac()) * this.zoneEdge(z, a) * 0.85;
      const node = new ResourceNode(this, {
        x: z.x + Math.cos(a) * d,
        y: z.y + Math.sin(a) * d,
        texture: kind.tex,
        resource: kind.res as ResourceType,
        amount: 1,
        action: "pickup",
        displayName: kind.name,
        loose: false,
        health: 1,
        persistent: true,
        pickedTexture: kind.picked,
        regrowMs: BLACKBERRY_REGROW_MS,
      });
      this.nodes.push(node);
    }
  }

  // Themed enemies per zone so a place feels inhabited with intent: armored bruisers
  // (Cragscale) hold the rocky boulderfields, swarm packs (Duskrunner) roam the
  // thornfields. Wild scatter already avoids zone cores, so these ARE the zone's
  // enemies. Runs after the wild badlands roster (zones + POIs all placed).
  private spawnZoneEnemies(): void {
    const rng = this.sessionRng();
    const add = (e: Enemy) => {
      this.enemies.push(e);
      this.enemyGroup.add(e);
    };
    // A point inside the zone that isn't sitting on a solid rock (so a bruiser
    // doesn't spawn wedged in a wall).
    const zonePoint = (z: BadlandsZone) => {
      for (let t = 0; t < 20; t++) {
        const a = rng.frac() * Math.PI * 2;
        const d = Math.sqrt(rng.frac()) * this.zoneEdge(z, a) * 0.85;
        const x = z.x + Math.cos(a) * d;
        const y = z.y + Math.sin(a) * d;
        if (!this.obstaclePositions.some((o) => Phaser.Math.Distance.Between(x, y, o.x, o.y) < o.r + 24)) {
          return { x, y };
        }
      }
      return { x: z.x, y: z.y };
    };
    for (const z of this.badlandsZones) {
      if (z.type === "boulderfield") {
        const n = rng.between(3, 5);
        for (let i = 0; i < n; i++) {
          const p = zonePoint(z);
          add(new Cragscale(this, { x: p.x, y: p.y, elite: this.rollElite(rng) }));
        }
      } else {
        const n = rng.between(4, 6);
        for (let i = 0; i < n; i++) {
          const p = zonePoint(z);
          add(new Duskrunner(this, { x: p.x, y: p.y, elite: this.rollElite(rng) }));
        }
      }
    }
  }

  // Phase 1 (terrain-that-matters): the generic per-frame environmental-zone query.
  // Returns how the terrain under a world point affects the player right now — a
  // movement multiplier (<1 slows) and whether HP regen is suppressed. Built generic
  // so biome 3's swamp-water slow + miasma no-regen zones just add cases; today the
  // only live case is a badlands thornfield (slow; regen unaffected).
  private environmentEffectAt(
    x: number,
    y: number,
  ): { moveMult: number; regenMult: number; poisonDps?: number } {
    // Crypt interiors sit outside every biome blob, so the samplers below would
    // return neutral anyway — but say it explicitly: dungeon floors are plain
    // stone, never swamp water or a miasma.
    if (this.activeDungeon) {
      // The only underground TERRAIN environment: the Miretyrant's mire pools.
      // But Mosswretch is themed crypt/lair-approach dweller content (see
      // populateCrypt's "bruiser room" + the Miretyrant approach), so its spore
      // cloud needs to fold on top here too — this used to short-circuit before
      // ever reaching foldSporeCloud, so a cloud dropped underground silently did
      // nothing (playtest: "poison cloud doesn't do anything inside dungeons").
      let base: { moveMult: number; regenMult: number; poisonDps?: number } = { moveMult: 1, regenMult: 1 };
      for (const pool of this.mirePools) {
        if (Phaser.Math.Distance.Between(x, y, pool.x, pool.y) <= MIRE_POOL_RADIUS) {
          base = { moveMult: MIRE_POOL_SLOW_MULT, regenMult: POISON_REGEN_MULT, poisonDps: MIRE_POOL_POISON_DPS };
          break;
        }
      }
      return this.foldSporeCloud(x, y, base);
    }
    // Compute the terrain-only effect, then fold in any C2 spore cloud on top —
    // this way a cloud stacks correctly with a thornfield, water, or a miasma
    // zone (harsher slow wins, and the cloud always adds its poison + regen
    // suppression) rather than one silently replacing the other.
    return this.foldSporeCloud(x, y, this.baseSurfaceEnvironmentAt(x, y));
  }

  // The terrain-only surface effect (no spore clouds, no crypt) — factored out
  // of environmentEffectAt so the C2 spore-cloud fold can wrap it.
  private baseSurfaceEnvironmentAt(x: number, y: number): { moveMult: number; regenMult: number; poisonDps?: number } {
    // A tyrant altar's arena is meant to be a clean telegraph-dodge boss fight —
    // but a bayou miasma zone's own radius (up to 780px) can reach well past the
    // TYRANT_ALTAR_CLEAR_RADIUS (360px) exclusion that only gates where a zone's
    // CENTER is picked, not how far its edge can bleed. Playtest: "duneshaper
    // arena doesn't normally have poison — it was from the overlap of the bayou
    // area." Suppress every bayou/badlands zone effect inside the arena outright.
    if (this.tyrantAltarPositions.some((a) => Phaser.Math.Distance.Between(x, y, a.x, a.y) < TYRANT_ALTAR_CLEAR_RADIUS)) {
      return { moveMult: 1, regenMult: 1 };
    }
    const z = this.subZoneAt(x, y);
    if (z && z.type === "thornfield") return { moveMult: BRAMBLE_SLOW_MULT, regenMult: 1 };
    // Biome 3 zones are resolved BEFORE the early return so a zone sitting over a
    // channel still reports both its own effect and the water slow — whichever
    // slow is harsher wins rather than one silently replacing the other.
    const water = this.bayouWaterMult(x, y);
    const bz = this.bayouZoneAt(x, y);
    // The miasma's regen penalty is now the SAME 50% poison carries, rather than
    // the total block it originally shipped with. Keeping it at 0 would have made
    // the new 50% rule unobservable in practice — the miasma is currently the only
    // poison source in the game, so a full block there would always win. A future
    // zone can still pass regenMult: 0 for a genuine no-heal area.
    if (bz?.type === "miasma")
      return { moveMult: water, regenMult: POISON_REGEN_MULT, poisonDps: MIASMA_POISON_DPS };
    if (bz?.type === "bonemire") return { moveMult: Math.min(water, BONEMIRE_SLOW_MULT), regenMult: 1 };
    // A hammock is raised dry ground — explicitly no penalty, even where the
    // feature layer would otherwise read as shallow water.
    if (bz?.type === "hammock") return { moveMult: 1, regenMult: 1 };
    return { moveMult: water, regenMult: 1 };
  }

  // Overlay any active Mosswretch spore cloud (C2) onto a base terrain effect:
  // the harsher slow wins, and a cloud always contributes its poison DoT + the
  // shared poison regen suppression. Keeps the harsher of two poison DPS values
  // if the base already poisons (a cloud dropped inside a miasma).
  private foldSporeCloud(
    x: number,
    y: number,
    base: { moveMult: number; regenMult: number; poisonDps?: number },
  ): { moveMult: number; regenMult: number; poisonDps?: number } {
    let inCloud = false;
    for (const c of this.sporeClouds) {
      if (Phaser.Math.Distance.Between(x, y, c.x, c.y) <= SPORE_CLOUD_RADIUS) {
        inCloud = true;
        break;
      }
    }
    if (!inCloud) return base;
    return {
      moveMult: Math.min(base.moveMult, SPORE_CLOUD_SLOW_MULT),
      regenMult: Math.min(base.regenMult, POISON_REGEN_MULT),
      poisonDps: Math.max(base.poisonDps ?? 0, SPORE_CLOUD_POISON_DPS),
    };
  }

  // The bayou's water movement multiplier at a point (1 = unaffected). Gated on
  // real bayou coverage so the shared feature's creek pattern only means "water"
  // inside the swamp — the same feature layer reads as a dry ravine in the
  // badlands and a wind hollow in the dunes, and must NOT slow there.
  private bayouWaterMult(x: number, y: number): number {
    // Gate on DOMINANCE, not a raw coverage threshold. A coverage cutoff drifts
    // out of step with everything else: content placement uses dominantBiomeAt,
    // the HUD label uses dominantBiomeAt, but the ground COLOR blends bayou in at
    // any coverage — so a fixed 0.5 cutoff both (a) failed to slow water the
    // player could plainly see at the bayou's edge and (b) slowed the badlands'
    // DRY RAVINE where a bayou blob merely overlapped (both caught in testing:
    // 8/300 deep badlands ravine samples were slowing). Dominance is the one rule
    // that makes "am I in the swamp?" mean the same thing everywhere.
    if (this.worldBiomes.dominantBiomeAt(x, y) !== "bayou") return 1;
    const w = bayouWaterAt(x, y, this.outerFeatureBiome);
    if (w === "deep") return BAYOU_DEEP_SLOW_MULT;
    if (w === "shallow") return BAYOU_SHALLOW_SLOW_MULT;
    return 1;
  }

  // The bayou zone covering a point, if any (same organic-edge test as subZoneAt).
  private bayouZoneAt(x: number, y: number): BayouZone | null {
    for (const z of this.bayouZones) {
      const dx = x - z.x;
      const dy = y - z.y;
      if (Math.hypot(dx, dy) <= this.zoneEdge(z, Math.atan2(dy, dx))) return z;
    }
    return null;
  }

  // Mineable badlands minerals (biome 2 Phase 4) — the smelting economy's raw
  // ore + the Smelter's clay, scattered OUT in the badlands (not just the Sunken
  // Forge POI) so they're a renewable-ish source. Stone-Pickaxe `mine` nodes,
  // finite (non-respawning). Common Sunscorch Ore is plentiful; rare Cinderforged
  // veins are scarce (they smelt to the T2 ingot, so kept rare on top of the POI
  // deposits). Routed through pickBadlandsPoint so every POI exclusion is honored.
  private spawnBadlandsMinerals(): void {
    const rng = this.sessionRng();
    const scatterOre = (
      texture: string,
      resource: ResourceType,
      displayName: string,
      count: number,
      health: number,
      amountMin: number,
      amountMax: number,
    ) => {
      for (let i = 0; i < count; i++) {
        const pt = this.pickBadlandsPoint(rng);
        if (!pt) break;
        const node = new ResourceNode(this, {
          x: pt.x,
          y: pt.y,
          texture,
          resource,
          amount: rng.between(amountMin, amountMax),
          action: "mine",
          displayName,
          loose: false,
          health,
        });
        this.nodes.push(node);
        this.obstacleNodes.push(node);
      }
    };
    // S1 rebalance — "not grindy": ore nodes yield a handful each and scatter
    // denser. Sunscorch (common metal) is plentiful; Cinderforged veins stay
    // rarer but no longer trickle 1-2 (the Sunken Forge POI is the main ember
    // source, but scattered veins now pay off too). Ratio is 1:1 so a node's
    // yield equals its ingot potential.
    scatterOre("clay_deposit", "clay", "Clay Deposit", 44, 2, 2, 3);
    scatterOre("sunscorch_ore_node", "sunscorch_ore", "Sunscorch Ore", 60, 3, 3, 5);
    scatterOre("ember_ore_node", "ember_ore", "Cinderforged Vein", 14, 3, 2, 4);
    // Scattered gloam outcrops (the user: "there is simply not enough gloam ore
    // on the surface"). Until now the ONE Gloaming Vein POI was the entire
    // surface supply of the shard that the whole refinement economy sits on —
    // and everything downstream converts at brutal ratios (3 gloam per ember, 3
    // ember per mire, so 9 gloam for one tier-3 shard). Kept scarce and
    // low-yield: these are a trickle that makes the ratios survivable, not a
    // replacement for the POI, which is still the only place you get a pile at
    // once. Exactly the treatment Cinderforged veins already get next to the
    // Sunken Forge.
    scatterOre("gloaming_vein", "gloam_shard", "Gloam Outcrop", 16, 3, 1, 2);
  }

  // Every biome needs a supply of the basics — wood and stone. The forest disc
  // has trees/rocks; the badlands gets its own themed gatherables that drop the
  // SAME universal `wood`/`stone` keys (so all recipes work anywhere), plus the
  // Ironbark hardwood tree — a tool-tier-gated new wood source (needs an
  // Ironshod axe; a base axe just bounces off, see ResourceNode.minToolTier).
  private spawnBadlandsNodes(): void {
    const rng = this.sessionRng();
    const scatter = (cfg: {
      texture: string;
      resource: ResourceType;
      displayName: string;
      action: NodeAction;
      amount: number;
      health: number;
      count: number;
      minToolTier?: number;
    }) => {
      for (let i = 0; i < cfg.count; i++) {
        const pt = this.pickBadlandsPoint(rng);
        if (!pt) break;
        const node = new ResourceNode(this, {
          x: pt.x,
          y: pt.y,
          texture: cfg.texture,
          resource: cfg.resource,
          amount: cfg.amount,
          action: cfg.action,
          displayName: cfg.displayName,
          loose: false,
          health: cfg.health,
          minToolTier: cfg.minToolTier,
        });
        this.nodes.push(node);
        // Chop/mine nodes are tall enough to Y-sort/occlude; free pickups stay
        // at ground depth (mirrors the forest branch/rock convention).
        if (cfg.action !== "pickup") this.obstacleNodes.push(node);
      }
    };
    scatter({ texture: "badlands_deadtree", resource: "wood", displayName: "Dead Tree", action: "chop", amount: 5, health: 3, count: 54 });
    scatter({ texture: "badlands_boulder", resource: "stone", displayName: "Badlands Boulder", action: "mine", amount: 5, health: 3, count: 46 });
    scatter({ texture: "badlands_branch", resource: "wood", displayName: "Dry Branch", action: "pickup", amount: 1, health: 1, count: 40 });
    scatter({ texture: "badlands_scraprock", resource: "stone", displayName: "Scrap Rock", action: "pickup", amount: 1, health: 1, count: 40 });
    // Ironbark — the gated hardwood. Rarer than the basics; needs the Ironshod axe.
    scatter({ texture: "ironbark_tree", resource: "ironbark", displayName: "Ironbark Tree", action: "chop", amount: 3, health: 4, count: 34, minToolTier: 1 });
  }

  // PB1 Session 3 — flora + minerals + basic wood/stone in the extended badlands
  // band [BADLANDS_R_MAX_INNER, BADLANDS_R_MAX_OUTER], roughly half the inner
  // band's counts (see spawnOuterBadlandsEnemies). Called after every POI position
  // is set, so (unlike the inner-band spawnBadlandsFlora/Minerals/Nodes) this pass
  // correctly excludes den/forge/tyrant-altar clearings too.
  private spawnOuterBadlandsContent(): void {
    const rng = this.sessionRng();
    const pt = () => this.pickBadlandsPoint(rng, 0.4, BADLANDS_R_MAX_INNER, BADLANDS_R_MAX_OUTER);

    const scatterFlora = (
      texture: string,
      pickedTexture: string,
      resource: ResourceType,
      displayName: string,
      count: number,
      patch?: { min: number; max: number }, // blooms grow in patches (the user); cactus/mushroom stay solo
    ) => {
      const makeNode = (x: number, y: number) => {
        const node = new ResourceNode(this, {
          x,
          y,
          texture,
          resource,
          amount: 1,
          action: "pickup",
          displayName,
          loose: false,
          health: 1,
          persistent: true,
          pickedTexture,
          regrowMs: BLACKBERRY_REGROW_MS,
        });
        this.nodes.push(node);
      };
      let placed = 0;
      while (placed < count) {
        const center = pt();
        if (!center) break;
        const inPatch = patch ? Math.min(rng.between(patch.min, patch.max), count - placed) : 1;
        for (let j = 0; j < inPatch; j++) {
          const jx = patch && j > 0 ? rng.between(-38, 38) : 0;
          const jy = patch && j > 0 ? rng.between(-38, 38) : 0;
          makeNode(center.x + jx, center.y + jy);
          placed++;
        }
      }
    };
    scatterFlora("emberbloom", "emberbloom_picked", "emberbloom", "Emberbloom", 30, { min: 3, max: 5 });
    scatterFlora("sunfruit_cactus", "sunfruit_cactus_picked", "sunfruit", "Sunfruit", 24);
    scatterFlora("gloamcap", "gloamcap_picked", "gloamcap", "Gloamcap", 22);
    scatterFlora("dustbloom", "dustbloom_picked", "dustbloom", "Dustbloom", 26, { min: 3, max: 5 });

    const scatterOre = (texture: string, resource: ResourceType, displayName: string, count: number, health: number, amountMin: number, amountMax: number) => {
      for (let i = 0; i < count; i++) {
        const p = pt();
        if (!p) break;
        const node = new ResourceNode(this, {
          x: p.x,
          y: p.y,
          texture,
          resource,
          amount: rng.between(amountMin, amountMax),
          action: "mine",
          displayName,
          loose: false,
          health,
        });
        this.nodes.push(node);
        this.obstacleNodes.push(node);
      }
    };
    scatterOre("clay_deposit", "clay", "Clay Deposit", 22, 2, 2, 3);
    scatterOre("sunscorch_ore_node", "sunscorch_ore", "Sunscorch Ore", 30, 3, 3, 5);
    scatterOre("ember_ore_node", "ember_ore", "Cinderforged Vein", 8, 3, 2, 4);

    const scatterBasic = (cfg: { texture: string; resource: ResourceType; displayName: string; action: NodeAction; amount: number; health: number; count: number; minToolTier?: number }) => {
      for (let i = 0; i < cfg.count; i++) {
        const p = pt();
        if (!p) break;
        const node = new ResourceNode(this, {
          x: p.x,
          y: p.y,
          texture: cfg.texture,
          resource: cfg.resource,
          amount: cfg.amount,
          action: cfg.action,
          displayName: cfg.displayName,
          loose: false,
          health: cfg.health,
          minToolTier: cfg.minToolTier,
        });
        this.nodes.push(node);
        if (cfg.action !== "pickup") this.obstacleNodes.push(node);
      }
    };
    scatterBasic({ texture: "badlands_deadtree", resource: "wood", displayName: "Dead Tree", action: "chop", amount: 5, health: 3, count: 26 });
    scatterBasic({ texture: "badlands_boulder", resource: "stone", displayName: "Badlands Boulder", action: "mine", amount: 5, health: 3, count: 22 });
    scatterBasic({ texture: "badlands_branch", resource: "wood", displayName: "Dry Branch", action: "pickup", amount: 1, health: 1, count: 20 });
    scatterBasic({ texture: "badlands_scraprock", resource: "stone", displayName: "Scrap Rock", action: "pickup", amount: 1, health: 1, count: 20 });
    scatterBasic({ texture: "ironbark_tree", resource: "ironbark", displayName: "Ironbark Tree", action: "chop", amount: 3, health: 4, count: 16, minToolTier: 1 });
  }

  // Purely-decorative, non-interactive immersion props scattered through both
  // biomes (the user: "for both biomes add a bunch of decorative textures so it's
  // more immersive"). Not tracked (auto-destroyed on scene.restart), Y-sorted
  // like any world object, and routed through the existing spawn samplers so
  // they respect every POI exclusion zone. Placeholder art.
  // Decoration hangs off things that are already there — a fern at the foot of
  // a tree, bones against a rock, junk beside a hut — rather than being
  // scattered across open ground on its own.
  //
  // The previous version sampled its own 220+260 centers, which littered every
  // square of the map at uniform density (playtest: "way too many... think of
  // sprinkling decorations, not littering the map"). Anchoring fixes the
  // *reason* as well as the count: decoration now marks where something grew or
  // died, so open ground stays open and reads as deliberate.
  private scatterDecor(): void {
    const rng = this.sessionRng();
    const forestDecor = ["decor_fern", "decor_flowers", "decor_mushrooms", "decor_log"];
    const badlandsDecor = ["decor_skull", "decor_deadbush", "decor_mesarock", "decor_bones"];

    // Only a minority of features get dressed, and most of those get a single
    // prop — two is the occasional flourish, not the norm.
    const DRESSED_FRACTION = 0.22;
    const anchors: { x: number; y: number }[] = this.nodes.filter((n) => n.action !== "pickup");
    for (const shack of this.gremlinShacks) anchors.push({ x: shack.x, y: shack.y });

    for (const a of anchors) {
      if (rng.frac() > DRESSED_FRACTION) continue;
      // Forest content lives in the central disc; everything outside it is
      // badlands, which is the same test the spawn samplers use.
      const inForest = Phaser.Math.Distance.Between(a.x, a.y, WORLD_CX, WORLD_CY) <= BIOME_RADIUS;
      const palette = inForest ? forestDecor : badlandsDecor;
      const key = palette[rng.between(0, palette.length - 1)];
      const count = rng.weightedPick([1, 1, 1, 2]);
      for (let i = 0; i < count; i++) {
        // Ringed just outside the anchor so the prop reads as sitting beside it
        // rather than clipping through it.
        const ang = rng.frac() * Math.PI * 2;
        const dist = rng.between(22, 46);
        const x = a.x + Math.cos(ang) * dist;
        const y = a.y + Math.sin(ang) * dist;
        if (this.biome.isCreekAt(x, y)) continue;
        const img = this.add.image(x, y, variantAt(this, key, x, y)).setDepth(ysortDepth(y));
        img.setScale(artScale(this, img.texture.key));
      }
    }
  }

  // Scatter Gremlin Shacks (first POI) through the forest zone, spread apart
  // via the same pickSpreadSpawnPoint pool the Gremlin-family enemies use.
  // 3 of the 5 populate the War Camp as its "huts" — evenly spaced in a fan on
  // the side of the camp opposite the entrance gate (not a random roll),
  // per playtest feedback that a random pickPointNearAltar roll read as a
  // clumped, messy scatter instead of an arranged camp. The other 2 stay wild
  // standalone POIs via the normal spread-spawn pool. First-pass/tunable counts.
  private spawnGremlinShacks(): void {
    const rng = this.sessionRng();
    // Bumped 5 -> 8 (playtest: too sparse) — the extra 3 land in the wild
    // standalone pool below, not the war-camp cluster, which keeps
    // SHACK_NEAR_ALTAR_COUNT's carefully-spaced hut fan untouched.
    const SHACK_COUNT = 14;
    const SHACK_NEAR_ALTAR_COUNT = 3;
    const SHACK_CLEAR_RADIUS = 260;
    const SHACK_MIN_SPACING = 500;
    const HUT_RADIUS = 170; // inside the palisade (WAR_CAMP_RADIUS = 230)
    const HUT_ANGLE_STEP = Phaser.Math.DegToRad(100);
    const shackPoints: { x: number; y: number }[] = [];
    for (let i = 0; i < SHACK_COUNT; i++) {
      let point: { x: number; y: number };
      if (i < SHACK_NEAR_ALTAR_COUNT && this.altarPosition) {
        const altar = this.altarPosition;
        const back = this.campGateFacing() + Math.PI; // opposite the gate
        const offset = (i - (SHACK_NEAR_ALTAR_COUNT - 1) / 2) * HUT_ANGLE_STEP;
        const angle = back + offset + Phaser.Math.DegToRad(rng.between(-6, 6));
        const r = HUT_RADIUS + rng.between(-10, 10);
        point = {
          x: Phaser.Math.Clamp(altar.x + Math.cos(angle) * r, 60, WORLD_W - 60),
          y: Phaser.Math.Clamp(altar.y + Math.sin(angle) * r, 60, WORLD_H - 60),
        };
      } else {
        point = this.pickSpreadSpawnPoint(
          rng,
          "forest",
          SHACK_CLEAR_RADIUS,
          shackPoints,
          SHACK_MIN_SPACING,
          1,
          true,
        );
      }
      shackPoints.push(point);
      const nearCamp = i < SHACK_NEAR_ALTAR_COUNT && !!this.altarPosition;
      const shack = new GremlinShack(this, { ...point, nearCamp });
      this.gremlinShacks.push(shack);
      this.respawnShackGuards(shack);
    }
  }

  // Far from the world-center safe zone, biased toward forest (gremlin
  // habitat) — the boss altar's own placement. Chosen once per session.
  private pickAltarPosition(rng: Phaser.Math.RandomDataGenerator): { x: number; y: number } {
    return this.pickSpawnPoint(rng, "forest", ALTAR_CLEAR_RADIUS, true);
  }

  // Angle (radians) from the altar toward world center — the War Camp's fixed
  // gate facing, shared by the palisade opening (spawnWarCamp), the braziers
  // that flank it, and the evenly-spaced hut fan on the opposite side
  // (spawnGremlinShacks). Only call once altarPosition is set.
  private campGateFacing(): number {
    const altar = this.altarPosition!;
    return Phaser.Math.Angle.Between(altar.x, altar.y, WORLD_W / 2, WORLD_H / 2);
  }

  // A point sampled around altarPosition within `radius`, rejecting non-
  // forest/creek cells the same way pickSpawnPoint does — used to bias
  // enemy placement toward the altar without a real per-cell density field.
  private pickPointNearAltar(rng: Phaser.Math.RandomDataGenerator, radius: number): { x: number; y: number } {
    const altar = this.altarPosition!;
    let last = altar;
    for (let attempt = 0; attempt < 200; attempt++) {
      const angle = Phaser.Math.DegToRad(rng.angle());
      const r = rng.between(0, radius);
      const x = Phaser.Math.Clamp(altar.x + Math.cos(angle) * r, 60, WORLD_W - 60);
      const y = Phaser.Math.Clamp(altar.y + Math.sin(angle) * r, 60, WORLD_H - 60);
      last = { x, y };
      // Stay inside the biome circle (the altar sits near its edge, so an
      // outward push could otherwise land on the empty outer ring).
      if (Phaser.Math.Distance.Between(x, y, WORLD_CX, WORLD_CY) > BIOME_RADIUS) continue;
      if (this.biome.zoneAt(x, y) !== "forest") continue;
      if (this.biome.isCreekAt(x, y)) continue;
      return { x, y };
    }
    return last;
  }

  private spawnBossAltar(): void {
    if (!this.altarPosition) return;
    const altar = new BossAltar(this, this.altarPosition);
    this.bossAltars.push(altar);
  }

  // Duneshaper altars (biome 2 Phase 3). Pick several spots out in the badlands,
  // spread apart, so at least one is reachable from wherever the player explored
  // (the world is huge — a single altar could sit on the far side). Positions are
  // chosen in create() BEFORE spawning so pickBadlandsPoint's TYRANT_ALTAR_CLEAR_
  // RADIUS exclusion keeps content off the clearings.
  private pickTyrantAltarPositions(rng: Phaser.Math.RandomDataGenerator): { x: number; y: number }[] {
    // ONE PER QUADRANT (the user): the player moves outward radially, so wherever
    // they push out from center, an altar is in reach without backtracking across
    // the huge world. Each quadrant is a sign of (x-cx, y-cy); reject a badlands
    // sample until it lands in the target quadrant (and clears prior picks).
    const picks: { x: number; y: number }[] = [];
    const quadrants: [number, number][] = [
      [1, 1],
      [-1, 1],
      [-1, -1],
      [1, -1],
    ];
    for (const [sx, sy] of quadrants) {
      let placed: { x: number; y: number } | null = null;
      let fallback: { x: number; y: number } | null = null;
      for (let attempt = 0; attempt < 400; attempt++) {
        // Pushed DEEP (S4) — the final-boss altar is the furthest-out landmark.
        const p = this.pickBadlandsPoint(rng, 0.4, POI_DEEP_R_MIN);
        if (!p) continue;
        if (Math.sign(p.x - WORLD_CX) !== sx || Math.sign(p.y - WORLD_CY) !== sy) continue;
        fallback = p;
        if (picks.some((q) => Phaser.Math.Distance.Between(p.x, p.y, q.x, q.y) < TYRANT_ALTAR_MIN_SPACING)) continue;
        // Don't crowd ANY other POI (keep clear of the war camp, vein, forges,
        // and each other by POI_MIN_SEPARATION). tyrant↔tyrant is the
        // TYRANT_ALTAR_MIN_SPACING check above (tyrantAltarPositions isn't
        // assigned until this returns, so tooCloseToAnyPoi only sees earlier POIs).
        if (this.tooCloseToAnyPoi(p.x, p.y, POI_MIN_SEPARATION)) continue;
        placed = p;
        break;
      }
      const chosen = placed ?? fallback;
      if (chosen) picks.push(chosen);
    }
    return picks;
  }

  private spawnTyrantAltars(): void {
    const rng = this.sessionRng();
    for (const p of this.tyrantAltarPositions) {
      // A big, unmistakable arena (the user): a wide gloam-blighted floor + a ring
      // of standing stones + scattered gloam crystals, so it reads as a major
      // landmark from a long way off, like the other POIs.
      this.decoratePoi(rng, p.x, p.y, {
        floorTexture: "poi_floor_tyrant",
        floorRadius: TYRANT_ALTAR_FLOOR_RADIUS,
        ringTexture: "poi_ring_tyrant",
        ringCount: 30,
        ringRadius: TYRANT_ALTAR_FLOOR_RADIUS - 20,
      });
      // Decorative gloam crystals scattered inside the arena — extra "big deal"
      // dressing, a few glowing at night as beacons (like the vein clearing).
      for (let i = 0; i < 12; i++) {
        const a = rng.frac() * Math.PI * 2;
        const r = rng.between(60, TYRANT_ALTAR_FLOOR_RADIUS - 40);
        const x = Phaser.Math.Clamp(p.x + Math.cos(a) * r, 20, WORLD_W - 20);
        const y = Phaser.Math.Clamp(p.y + Math.sin(a) * r, 20, WORLD_H - 20);
        this.add.image(x, y, "gloam_crystal_cluster").setDepth(ysortDepth(y));
        if (i % 4 === 0) this.tyrantAltarLightPoints.push({ x, y });
      }
      this.bossAltars.push(new BossAltar(this, { x: p.x, y: p.y, kind: "tyrant" }));

      // Guarded by ELITE Hexlings (the user) — a caster escort that punishes
      // walking in unprepared, ringing the altar so the arena has teeth.
      for (let i = 0; i < TYRANT_ALTAR_GUARD_COUNT; i++) {
        const a = (i / TYRANT_ALTAR_GUARD_COUNT) * Math.PI * 2 + rng.frac() * 0.4;
        const r = TYRANT_ALTAR_FLOOR_RADIUS - 70 + rng.between(-20, 20);
        const x = Phaser.Math.Clamp(p.x + Math.cos(a) * r, 60, WORLD_W - 60);
        const y = Phaser.Math.Clamp(p.y + Math.sin(a) * r, 60, WORLD_H - 60);
        const hex = new Hexling(this, { x, y, elite: true });
        this.enemies.push(hex);
        this.enemyGroup.add(hex);
      }
    }
  }

  private spawnDuneshaper(altar: BossAltar): void {
    const boss = new Duneshaper(this, { x: altar.x, y: altar.y - 70 });
    this.duneshaper = boss;
    this.enemies.push(boss);
    this.enemyGroup.add(boss);
    this.eventLog.add("combat", "Sand screams skyward — the Duneshaper rises!");
  }

  // Gloaming Vein POI: a forest clearing a notable distance from BOTH world
  // center and the war camp, so it reads as its own destination. Reuses
  // pickSpawnPoint (which already excludes the camp) and rejects candidates too
  // close to the altar. veinPosition isn't set yet here, so its own
  // VEIN_CLEAR_RADIUS exclusion doesn't reject the pick.
  private pickVeinPosition(rng: Phaser.Math.RandomDataGenerator): { x: number; y: number } {
    let last = { x: WORLD_CX, y: WORLD_CY };
    for (let attempt = 0; attempt < 200; attempt++) {
      const p = this.pickSpawnPoint(rng, "forest", VEIN_MIN_DIST_FROM_CENTER, true);
      last = p;
      if (
        this.altarPosition &&
        Phaser.Math.Distance.Between(p.x, p.y, this.altarPosition.x, this.altarPosition.y) < VEIN_MIN_DIST_FROM_CAMP
      )
        continue;
      return p;
    }
    return last;
  }

  // Spawn the Gloaming Vein: the Gloamwarden guardian anchored at the clearing
  // center, ringed by shielded (un-mineable) ore nodes. The nodes stay inert
  // until the guardian dies (onGloamwardenKilled cracks them open). Their world
  // positions feed veinLightPoints so the crystals glow at night, like the war
  // camp braziers.
  private spawnGloamingVein(): void {
    if (!this.veinPosition) return;
    const rng = this.sessionRng();
    const c = this.veinPosition;

    // A ring of gloam standing stones around the ore clearing (the floor is
    // already baked into the biome texture) so the vein reads as a bounded POI
    // from a distance, like every other landmark (the user).
    this.decoratePoi(rng, c.x, c.y, {
      ringTexture: "poi_ring_tyrant",
      ringCount: 18,
      ringRadius: 150,
    });

    this.armVein(rng, true); // guardian + shielded ore (pushes node lights on first arm)

    // Decorative amethyst crystal clusters scattered across the clearing (like
    // the war-camp props) so the ore area reads as a crystalline field, not a
    // few nodes on grass. Non-interactive, Y-sorted. A few of the outer ones
    // also glow at night as extra beacons.
    const DECOR_COUNT = 10;
    for (let i = 0; i < DECOR_COUNT; i++) {
      const a = rng.frac() * Math.PI * 2;
      const r = rng.between(40, 145);
      const x = Phaser.Math.Clamp(c.x + Math.cos(a) * r, 20, WORLD_W - 20);
      const y = Phaser.Math.Clamp(c.y + Math.sin(a) * r, 20, WORLD_H - 20);
      this.add.image(x, y, "gloam_crystal_cluster").setDepth(ysortDepth(y));
      if (i % 3 === 0) this.veinLightPoints.push({ x, y });
    }
  }

  // (Re)arm the Gloaming Vein: its Gloamwarden guardian + a ring of shielded ore
  // nodes. Used by the initial spawn and the S4 respawn once the vein is fully
  // mined out. pushLights only on the FIRST arm — the clearing's night-glow points
  // are static after create(), so a respawn reuses them (its crystals still glow).
  private armVein(rng: Phaser.Math.RandomDataGenerator, pushLights: boolean): void {
    if (!this.veinPosition) return;
    const c = this.veinPosition;
    this.veinCracked = false;
    const warden = new Gloamwarden(this, { x: c.x, y: c.y });
    this.gloamwarden = warden;
    this.enemies.push(warden);
    this.enemyGroup.add(warden);

    const fresh: ResourceNode[] = [];
    for (let i = 0; i < VEIN_NODE_COUNT; i++) {
      const a = (i / VEIN_NODE_COUNT) * Math.PI * 2 + rng.frac() * 0.5;
      const r = VEIN_NODE_RING + rng.between(-14, 14);
      const x = Phaser.Math.Clamp(c.x + Math.cos(a) * r, 60, WORLD_W - 60);
      const y = Phaser.Math.Clamp(c.y + Math.sin(a) * r, 60, WORLD_H - 60);
      const node = new ResourceNode(this, {
        x,
        y,
        texture: "gloaming_vein_shielded",
        resource: "gloam_shard",
        // 1-2 -> 2-4. Clearing the Gloamwarden for ~7 shards never matched the
        // fight, let alone what the conversion ladder eats downstream.
        amount: rng.between(2, 4),
        action: "mine",
        displayName: "Gloaming Vein",
        loose: false,
        health: 2, // ~2 hits each
        shielded: true,
      });
      this.nodes.push(node);
      this.obstacleNodes.push(node);
      fresh.push(node);
      if (pushLights) this.veinLightPoints.push({ x, y });
    }
    // Replace (not append) — a respawn's old nodes were destroyed on depletion.
    this.gloamingVeinNodes = fresh;
  }

  // The Gloamwarden died — crack open every vein ore node so the player can now
  // mine Gloam Shards (the visible payoff for the kill).
  private onGloamwardenKilled(): void {
    if (this.veinCracked) return;
    this.veinCracked = true;
    this.gloamwarden = null;
    for (const node of this.gloamingVeinNodes) {
      if (!node.depleted) node.crack("gloaming_vein");
    }
    this.eventLog.add("combat", "The Gloaming Vein cracks open — its shards can now be mined.");
  }

  // Sunken Forge POI (biome 2 Phase 3 POI 2): a badlands clearing kept a notable
  // distance from both the war camp and the Gloaming Vein so it reads as its own
  // destination. Reuses pickBadlandsPoint (which already excludes camp/vein);
  // forgePosition isn't set yet here, so its own FORGE_CLEAR_RADIUS exclusion
  // doesn't reject the pick. Returns null only if the badlands never yields a
  // covered point (spawnSunkenForge then no-ops).
  private pickForgePositions(rng: Phaser.Math.RandomDataGenerator): { x: number; y: number }[] {
    const picks: { x: number; y: number }[] = [];
    let guard = 0;
    while (picks.length < FORGE_COUNT && guard++ < 800) {
      // Pushed DEEP (S4): the Sunken Forge is a destination, not forest-edge
      // content — POI_DEEP_R_MIN keeps it out in real badlands.
      const p = this.pickBadlandsPoint(rng, 0.4, POI_DEEP_R_MIN);
      if (!p) continue;
      if (
        this.altarPosition &&
        Phaser.Math.Distance.Between(p.x, p.y, this.altarPosition.x, this.altarPosition.y) < FORGE_MIN_DIST_FROM_CAMP
      )
        continue;
      if (
        this.veinPosition &&
        Phaser.Math.Distance.Between(p.x, p.y, this.veinPosition.x, this.veinPosition.y) < FORGE_MIN_DIST_FROM_VEIN
      )
        continue;
      if (picks.some((q) => Phaser.Math.Distance.Between(p.x, p.y, q.x, q.y) < FORGE_MIN_SPACING)) continue;
      picks.push(p);
    }
    return picks;
  }

  // Spawn the Sunken Forge: the Cinderwrought mini-boss anchored at the clearing
  // center, the ruined smithy structure behind it, and decorative slag chunks
  // scattered around. The forge structure + a couple slag chunks feed
  // forgeLightPoints so the clearing glows ember at night (like the war-camp
  // braziers / vein crystals). No post-kill interactable — the loot is the
  // Cinderwrought's guaranteed drop (unlike the vein's mineable nodes).
  private spawnSunkenForges(): void {
    const rng = this.sessionRng();
    for (const c of this.forgePositions) {
      // A POI ring + distinct floor + decorations (the user: "POIs should have some
      // kind of ring around them, add decorations and different floor texture").
      this.decoratePoi(rng, c.x, c.y, {
        floorTexture: "poi_floor_forge",
        floorRadius: 210,
        ringTexture: "poi_ring_forge",
        ringCount: 22,
        ringRadius: 200,
      });

      // The ruined forge structure — offset slightly so the boss stands in front
      // of it, not on top of it. Non-interactive, Y-sorted world dressing.
      const forgeY = c.y - 30;
      this.add.image(c.x, forgeY, "sunken_forge").setDepth(ysortDepth(forgeY));
      this.forgeLightPoints.push({ x: c.x, y: forgeY });

      const forge = {
        x: c.x,
        y: c.y,
        oreNodes: [] as ResourceNode[],
        bosses: [] as Cinderwrought[],
        cracked: false,
        discoveredOnMap: false,
        respawnAt: null as number | null,
      };
      this.forges.push(forge);
      this.armForge(rng, forge, true); // 2 Cinderwroughts + shielded ore (lights on first arm)

      // Decorative cooled-lava rubble across the clearing so the forge reads as a
      // scorched ruin, not one structure on dust. A few glow at night as beacons.
      for (let i = 0; i < FORGE_DECOR_COUNT; i++) {
        const a = rng.frac() * Math.PI * 2;
        const r = rng.between(60, 175);
        const x = Phaser.Math.Clamp(c.x + Math.cos(a) * r, 20, WORLD_W - 20);
        const y = Phaser.Math.Clamp(c.y + Math.sin(a) * r, 20, WORLD_H - 20);
        this.add.image(x, y, "slag_chunk").setDepth(ysortDepth(y));
        if (i % 4 === 0) this.forgeLightPoints.push({ x, y });
      }
    }
  }

  // (Re)arm one Sunken Forge: its Cinderwrought mini-boss + a ring of shielded
  // ember-ore nodes (inert until onCinderwroughtKilled cracks them). Used by the
  // initial spawn and the S4 respawn once the forge is fully mined out. pushLights
  // only on the first arm — the clearing's night-glow points are static after
  // create(), so a respawn reuses them.
  private armForge(
    rng: Phaser.Math.RandomDataGenerator,
    forge: { x: number; y: number; bosses: Cinderwrought[]; oreNodes: ResourceNode[]; cracked: boolean },
    pushLights: boolean,
  ): void {
    forge.cracked = false;
    // ONE Cinderwrought guards each forge (PB17, the user) — a solo, tanky,
    // unstaggerable mini-boss reads far more cohesive than the old 2v1 of
    // stationary fire-swingers. The single drop is bumped (5-8 Ember Shards +
    // the refined trophy) so the per-forge payoff stays high.
    forge.bosses = [];
    const wrought = new Cinderwrought(this, { x: forge.x, y: forge.y, dropTrophy: true });
    forge.bosses.push(wrought);
    this.enemies.push(wrought);
    this.enemyGroup.add(wrought);

    const oreNodes: ResourceNode[] = [];
    for (let i = 0; i < FORGE_ORE_COUNT; i++) {
      const a = (i / FORGE_ORE_COUNT) * Math.PI * 2 + rng.frac() * 0.5;
      const r = 110 + rng.between(-14, 14);
      const x = Phaser.Math.Clamp(forge.x + Math.cos(a) * r, 60, WORLD_W - 60);
      const y = Phaser.Math.Clamp(forge.y + Math.sin(a) * r, 60, WORLD_H - 60);
      const node = new ResourceNode(this, {
        x,
        y,
        texture: "ember_ore_shielded",
        resource: "ember_ore",
        // The Ember POI is the *main* Cinderforged source — a rich payoff for
        // the Cinderwrought fight (S1: was 1-2, way too thin).
        amount: rng.between(4, 7),
        action: "mine",
        displayName: "Ember Deposit",
        loose: false,
        health: 2,
        shielded: true,
      });
      this.nodes.push(node);
      this.obstacleNodes.push(node);
      oreNodes.push(node);
      if (pushLights) this.forgeLightPoints.push({ x, y });
    }
    // Replace (not append) — a respawn's old nodes were destroyed on depletion.
    forge.oreNodes = oreNodes;
  }

  // A slain Cinderwrought cracks open its forge's ember-ore deposits so the
  // player can mine Cinderforged Ore (the metalworking payoff for the fight).
  private onCinderwroughtKilled(enemy: Enemy): void {
    const forge = this.forges.find((f) => f.bosses.includes(enemy as Cinderwrought));
    if (!forge || forge.cracked) return;
    // Both guardians must fall before the deposits crack open.
    if (forge.bosses.some((b) => b !== enemy && !b.depleted)) return;
    forge.cracked = true;
    forge.bosses = [];
    for (const node of forge.oreNodes) {
      if (!node.depleted) node.crack("ember_ore_node");
    }
    this.eventLog.add("combat", "The forge's ember deposits crack open — mine them for Cinderforged Ore.");
  }

  // Shared POI dressing (the user: "POIs should have some kind of ring around
  // them, add decorations and a different floor texture for all of them"): a soft
  // floor decal under the POI + a ring of small marker props around its edge, so
  // every landmark reads as a deliberate, bounded PLACE from a distance — not one
  // structure dropped on open ground. Floor sits just above the baked ground
  // (-7) and below all Y-sorted world objects; ring props Y-sort normally.
  // ===== Sunken Crypts (biome 3 Phase 4c) =====

  // Entrance positions, picked in create() BEFORE any spawning so
  // CRYPT_CLEAR_RADIUS can keep ordinary swamp content out of every clearing
  // (the standing "POI busy = missing exclusion zone" rule). Themes are dealt
  // two-per-kind and shuffled, so a run always has two shots at each ability.
  private pickCryptPositions(
    rng: Phaser.Math.RandomDataGenerator,
  ): { x: number; y: number; theme: CryptTheme }[] {
    // Deal an even split across the FULL count, then shuffle — building a short
    // repeating array and indexing it with `% length` would make the theme
    // sequence cycle every 3, so which door you found decided nothing.
    const themes: CryptTheme[] = [];
    const kinds: CryptTheme[] = ["gloam", "ember", "blood"];
    for (let i = 0; i < CRYPT_COUNT; i++) themes.push(kinds[i % kinds.length]);
    for (let i = themes.length - 1; i > 0; i--) {
      const j = rng.between(0, i);
      [themes[i], themes[j]] = [themes[j], themes[i]];
    }
    const picked: { x: number; y: number; theme: CryptTheme }[] = [];
    for (let i = 0; i < CRYPT_COUNT; i++) {
      let pt: { x: number; y: number } | null = null;
      let fallback: { x: number; y: number } | null = null;
      for (let a = 0; a < 90; a++) {
        // avoidDeepWater: a stone doorway belongs on solid ground, not mid-channel.
        const cand = this.pickBayouPoint(rng, 0.45, BAYOU_R_MIN, BAYOU_R_MAX, { avoidDeepWater: true });
        if (!cand) break;
        fallback = cand;
        if (picked.every((p) => Phaser.Math.Distance.Between(p.x, p.y, cand.x, cand.y) >= CRYPT_MIN_SPACING)) {
          pt = cand;
          break;
        }
      }
      pt = pt ?? fallback;
      if (!pt) break;
      picked.push({ x: pt.x, y: pt.y, theme: themes[i % themes.length] });
    }
    return picked;
  }

  // Build every crypt: the surface entrance + its prebuilt interior. Interiors
  // are laid out on a grid inside CRYPT_REALM (see that constant) — one cell
  // each, so no two dungeons can ever overlap or leak into each other.
  private spawnSunkenCrypts(solids: Phaser.Physics.Arcade.StaticGroup): void {
    const rng = this.sessionRng();
    this.cryptPositions.forEach((pos, i) => {
      const crypt = new SunkenCrypt(this, { x: pos.x, y: pos.y, theme: pos.theme });
      this.crypts.push(crypt);
      this.cryptLightPoints.push({ x: pos.x, y: pos.y });
      // Surface dressing so the doorway reads as a place, like every other POI.
      this.decoratePoi(rng, pos.x, pos.y, {
        floorTexture: "poi_floor_crypt",
        floorRadius: 140,
        ringTexture: "poi_ring_crypt",
        ringCount: 9,
        ringRadius: 128,
      });
      // Breadcrumb bands: grave markers thinning outward, so the swamp gets
      // visibly graver before the doorway itself is in view. Jittered rather
      // than evenly spaced, per the standing "uniform reads as programmatic"
      // preference. Purely decorative, non-solid, Y-sorted via ysortDepth.
      for (const band of CRYPT_TRAIL_BANDS) {
        for (let m = 0; m < band.count; m++) {
          const a = rng.frac() * Math.PI * 2;
          const r = band.radius * rng.realInRange(0.72, 1.28);
          const mx = pos.x + Math.cos(a) * r;
          const my = pos.y + Math.sin(a) * r;
          this.add.image(mx, my, "poi_ring_crypt").setDepth(ysortDepth(my)).setAlpha(0.9);
        }
      }
      this.buildCryptInterior(crypt, i, rng, solids);
      // Pre-roll the loot chest now (like shacks/dens/lodges do) so its glow
      // reflects its contents from the start. Rolling only on open — as it did
      // before — left crypt.loot empty until then, so the chest never glowed.
      // rollIfEmpty is idempotent, so the open-time roll stays a safe no-op.
      this.rollContainerLoot(crypt.loot, CRYPT_LOOT_TABLE);
      // Prebuilt but not drawn — an interior only becomes visible when entered.
      this.setDungeonVisible(crypt, false);
    });
  }

  // The interior itself. CryptLayout carves the floor plan; everything below is
  // just turning its rects into floors, solid walls, props and content.
  // Turn a layout into an actual place: floors, solid walls, dressing, the exit
  // stairs and the arrival point. Extracted in Phase 4d session 2, when the
  // Miretyrant's lair became a second interior — everything here is about being
  // a dungeon, not about being a crypt, so both build from this one path.
  // Returns the occluder rects (walls + pillars) a warden's line-of-sight logic
  // needs. `vaultPillars` forces extra cover in the boss room.
  private renderDungeonShell(
    dungeon: DungeonInterior,
    rng: Phaser.Math.RandomDataGenerator,
    solids: Phaser.Physics.Arcade.StaticGroup,
    vaultPillars: number,
    // Themed shell textures (per crypt warden). Omitted by the Miretyrant's
    // lair, which keeps the base grey stone.
    shell?: { floor: string; wall: string; pillar: string; rubble: string; brazier: string },
  ): { x: number; y: number; w: number; h: number }[] {
    const tex = shell ?? {
      floor: "crypt_floor",
      wall: "crypt_wall",
      pillar: "crypt_pillar",
      rubble: "crypt_rubble",
      brazier: "crypt_brazier",
    };
    const layout = dungeon.layout;
    // Everything built here is registered on the interior so it can be hidden
    // while you're not inside it (see DungeonInterior.objects).
    const reg = <T extends Phaser.GameObjects.GameObject>(o: T): T => {
      dungeon.objects.push(o);
      return o;
    };
    // Floors: one TileSprite per room/corridor rect. Tiled (not a stretched
    // image) so the flagstones keep their grain at room scale.
    for (const r of [...layout.rooms, ...layout.corridors]) {
      reg(this.add.tileSprite(r.x, r.y, r.w, r.h, tex.floor).setOrigin(0, 0).setDepth(-7));
    }

    // Walls: merged runs from the layout, each one solid. The player collides
    // via the existing player↔solids collider; enemies only if they opt in
    // (collidesWithTerrain), exactly like boulderfield rock.
    for (const w of layout.walls) {
      const ts = reg(this.add.tileSprite(w.x, w.y, w.w, w.h, tex.wall).setOrigin(0, 0));
      ts.setDepth(ysortDepth(w.y + w.h));
      solids.add(ts);
    }

    const occluders: { x: number; y: number; w: number; h: number }[] = layout.walls.map((w) => ({ ...w }));
    for (const room of layout.rooms) {
      const pillars = room === layout.vault && vaultPillars > 0 ? vaultPillars : rng.between(0, 2);
      for (let i = 0; i < pillars; i++) {
        const px = room.x + rng.between(40, Math.max(41, room.w - 40));
        const py = room.y + rng.between(40, Math.max(41, room.h - 40));
        const img = reg(this.add.image(px, py, tex.pillar).setDepth(ysortDepth(py)));
        solids.add(img);
        occluders.push({ x: px - 10, y: py - 10, w: 20, h: 20 });
      }
      for (let i = 0; i < rng.between(1, 3); i++) {
        const px = room.x + rng.between(20, Math.max(21, room.w - 20));
        const py = room.y + rng.between(20, Math.max(21, room.h - 20));
        reg(this.add.image(px, py, tex.rubble).setDepth(ysortDepth(py)));
      }
      // One brazier per room: the only ambient light down here besides a torch.
      const bx = room.cx + rng.between(-30, 30);
      const by = room.y + 26;
      reg(this.add.image(bx, by, tex.brazier).setDepth(ysortDepth(by)));
      dungeon.braziers.push({ x: bx, y: by }); // per-interior, see SunkenCrypt.braziers
    }

    // Exit stairs in the entry room, and the arrival point right beside them.
    const stairsX = layout.entry.cx;
    const stairsY = layout.entry.y + 34;
    dungeon.exitStairs = reg(this.add.image(stairsX, stairsY, "crypt_stairs").setDepth(ysortDepth(stairsY)));
    dungeon.entryPoint = { x: stairsX, y: stairsY + 46 };
    return occluders;
  }

  private buildCryptInterior(
    crypt: SunkenCrypt,
    index: number,
    rng: Phaser.Math.RandomDataGenerator,
    solids: Phaser.Physics.Arcade.StaticGroup,
  ): void {
    // Interiors fill one realm's 4x3 grid before spilling into the next, so cell
    // size (and therefore room count) is identical no matter how many crypts a
    // run has.
    const realm = CRYPT_REALMS[Math.floor(index / CRYPT_CELLS_PER_REALM) % CRYPT_REALMS.length];
    const cell = index % CRYPT_CELLS_PER_REALM;
    const col = cell % CRYPT_GRID_COLS;
    const row = Math.floor(cell / CRYPT_GRID_COLS) % CRYPT_GRID_ROWS;
    const cellW = realm.w / CRYPT_GRID_COLS;
    const cellH = realm.h / CRYPT_GRID_ROWS;
    const rect = {
      x: realm.x + col * cellW + CRYPT_CELL_PAD,
      y: realm.y + row * cellH + CRYPT_CELL_PAD,
      w: cellW - CRYPT_CELL_PAD * 2,
      h: cellH - CRYPT_CELL_PAD * 2,
    };
    const layout = generateCrypt(rng, rect, rng.between(CRYPT_ROOMS_MIN, CRYPT_ROOMS_MAX));
    crypt.layout = layout;
    // Pillars double as the Palewake's tether-breakers, so the gloam vault gets
    // a few extra — a fight with nothing to hide behind isn't a fight.
    const occluders = this.renderDungeonShell(crypt, rng, solids, crypt.theme === "gloam" ? 4 : 0, crypt.def.shell);

    // Side-room chest (reuses LootContainer + ChestMenu verbatim). The texture
    // key was "shack_chest", which BootScene never generates — the chest was
    // rendering as Phaser's missing-texture placeholder (the user playtest:
    // "chest looks like black box with green outline").
    const chest = this.add
      .image(layout.side.cx, layout.side.cy, "crypt_chest")
      .setDepth(ysortDepth(layout.side.cy));
    crypt.setChest(chest);
    crypt.objects.push(chest);

    this.populateCrypt(crypt, rng, occluders);
  }

  // Stage the crypt's inhabitants: trash through the middle rooms, then the
  // warden + the SHIELDED vault nodes. The materials are hard-gated on the
  // encounter — shielded nodes are skipped by hover/prompt/interact entirely
  // (ResourceNode), so there is no walking past the fight to the loot.
  private populateCrypt(
    crypt: SunkenCrypt,
    rng: Phaser.Math.RandomDataGenerator,
    occluders: { x: number; y: number; w: number; h: number }[],
  ): void {
    const layout = crypt.layout;
    const addEnemy = (e: Enemy) => {
      // Crypt dwellers DO collide with solid terrain — the one place the standing
      // "enemies walk through rock" default is wrong. Out in the world that rule
      // exists so a chaser can't wedge on a boulder, and boulders are cover, not
      // structure; a dungeon wall IS the structure, and enemies drifting through
      // it read as broken (the user, first playtest: "enemies aren't respecting
      // collision... moving outside of the walls"). The per-instance flag is
      // exactly the hook the collider's process callback already gates on, so
      // this needs no new wiring.
      e.collidesWithTerrain = true;
      this.enemies.push(e);
      this.enemyGroup.add(e);
      this.cryptEnemies.add(e);
      crypt.enemies.push(e);
    };

    for (const room of layout.rooms) {
      if (room === layout.entry || room === layout.vault) continue; // arrival stays safe; the vault is the warden's
      const spot = () => ({
        x: room.x + rng.between(24, Math.max(25, room.w - 24)),
        y: room.y + rng.between(24, Math.max(25, room.h - 24)),
      });
      // Deliberately uneven per room (the standing organic-density preference):
      // some rooms are a swarm, some hold one bruiser, some are nearly empty.
      //
      // The MIX is themed per warden, so a crypt's population belongs to it the
      // way its walls now do (the user: the whole dungeon should be thematic, not
      // just the boss and the drop). Same three species everywhere — this is a
      // weighting, not a new roster — but each crypt leans on the one that
      // matches its warden's fight, so they play differently as well as look
      // different:
      //   gloam  (Palewake)     — swarms. You need room to break its tether, and
      //                           Murklings are what deny you that room.
      //   ember  (Kilnborn)     — bruisers. Its burning floor already shrinks the
      //                           arena; slow heavies punish you for not moving.
      //   blood  (Sanguinarch)  — Blighttoads. Poison and bleed feed the exact
      //                           state its Feed channel wants you in.
      const weights =
        crypt.theme === "gloam"
          ? { swarm: 6, poison: 8 } // rest bruiser
          : crypt.theme === "ember"
            ? { swarm: 3, poison: 5 }
            : { swarm: 2, poison: 8 };
      const roll = rng.between(1, 10);
      if (roll <= weights.swarm) {
        for (let i = 0; i < rng.between(3, 5); i++) {
          const p = spot();
          addEnemy(new Murkling(this, { x: p.x, y: p.y, elite: this.rollElite(rng, CRYPT_ELITE_CHANCE_MULT) }));
        }
      } else if (roll <= weights.poison) {
        for (let i = 0; i < rng.between(1, 2); i++) {
          const p = spot();
          addEnemy(new Blighttoad(this, { x: p.x, y: p.y, elite: this.rollElite(rng, CRYPT_ELITE_CHANCE_MULT) }));
        }
      } else {
        // A bruiser room. (Fenlurker cut 2026-07-23 — its share folded into the
        // Mosswretch, keeping the crypt's "one big thing" rooms.)
        const p = spot();
        addEnemy(new Mosswretch(this, { x: p.x, y: p.y, elite: this.rollElite(rng, CRYPT_ELITE_CHANCE_MULT) }));
      }
    }

    // The warden — one bespoke mini-boss per gem theme, each with its own state
    // machine (see the entity files; they deliberately do NOT share a skeleton).
    const vault = layout.vault;
    let warden: Enemy;
    if (crypt.theme === "gloam") {
      const pw = new Palewake(this, { x: vault.cx, y: vault.cy });
      pw.occluders = occluders; // walls + pillars are what break its tether
      pw.arena = { x: vault.x, y: vault.y, w: vault.w, h: vault.h }; // keeps its flanks on open floor
      warden = pw;
    } else if (crypt.theme === "ember") {
      const kb = new Kilnborn(this, { x: vault.cx, y: vault.cy });
      kb.arena = { x: vault.x, y: vault.y, w: vault.w, h: vault.h }; // fallback if floorRects is ever empty
      // Whole-dungeon lava (the user): the fire grid spans every room + corridor,
      // not just the vault, so there's no cold room to retreat to as heat climbs.
      kb.floorRects = [...layout.rooms, ...layout.corridors].map((r) => ({ x: r.x, y: r.y, w: r.w, h: r.h }));
      warden = kb;
    } else {
      warden = new Sanguinarch(this, { x: vault.cx, y: vault.cy });
    }
    crypt.warden = warden;
    addEnemy(warden);

    // The vault's sealed payoff: gem geodes + moonsilver seams, all shielded
    // until the warden falls (the Gloaming Vein mechanic, which is exactly why
    // that mechanic exists). Sealed nodes wear the neutral husk texture and
    // crack open into their real one.
    // Ring radii are sized to the ROOM, not fixed: a fixed 132px seam ring fell
    // outside a smaller vault entirely, leaving nodes embedded in the wall/void
    // (the user's "things outside the walls"). `span` is the largest radius that
    // still clears the room's tightest side, and each ring takes a fraction of it.
    const span = Math.min(vault.w, vault.h) / 2 - 26;
    const ring = (count: number, frac: number, phase: number, make: (x: number, y: number) => ResourceNode) => {
      const radius = Math.max(46, span * frac);
      for (let i = 0; i < count; i++) {
        const a = phase + (i / count) * Math.PI * 2;
        // Belt-and-braces: clamp into the room even if a radius math change ever
        // over-reaches again, so a vault node can never end up un-minable in rock.
        const x = Phaser.Math.Clamp(vault.cx + Math.cos(a) * radius, vault.x + 20, vault.x + vault.w - 20);
        const y = Phaser.Math.Clamp(vault.cy + Math.sin(a) * radius, vault.y + 20, vault.y + vault.h - 20);
        const node = make(x, y);
        this.nodes.push(node);
        this.obstacleNodes.push(node);
        crypt.vaultNodes.push(node);
        crypt.objects.push(node);
      }
    };
    ring(CRYPT_VAULT_GEODE_COUNT, 0.62, 0.4, (x, y) =>
      new ResourceNode(this, {
        x,
        y,
        // A neutral SEALED husk, not the surface gloam vein's texture. Sharing
        // "gloaming_vein_shielded" made a crypt's gem geode read as an ordinary
        // Gloam Shard node (the user playtest) — which also hid the fact that
        // these are the game's only ability-gem source. It cracks open into
        // def.geodeTexture below, which is where the colour belongs.
        texture: "crypt_node_sealed",
        resource: crypt.def.gem as ResourceType,
        amount: 1,
        action: "mine",
        displayName: crypt.def.gemLabel,
        loose: false,
        health: 3,
        shielded: true,
      }),
    );
    ring(CRYPT_VAULT_SEAM_COUNT, 0.95, 1.5, (x, y) =>
      new ResourceNode(this, {
        x,
        y,
        texture: "crypt_node_sealed",
        resource: "moonsilver",
        // 2-3 -> 3-5 (the user: "moonsilver is insanely scarce"). Demand is much
        // larger than supply was: the Gemwright's Table alone costs 4, then
        // every jewelry recipe wants 2-4, every augment 2, and Gloamsteel gear
        // 2 per piece. Clearing a crypt should visibly move that needle.
        amount: rng.between(3, 5),
        action: "mine",
        displayName: "Moonsilver Seam",
        loose: false,
        health: 3,
        shielded: true,
      }),
    );
  }

  // The warden is down: unseal this crypt's vault. Called from the kill tail,
  // mirroring onGloamwardenKilled/onCinderwroughtKilled.
  private onCryptWardenKilled(enemy: Enemy): void {
    const crypt = this.crypts.find((c) => c.warden === enemy);
    if (!crypt || crypt.vaultOpen) return;
    crypt.vaultOpen = true;
    for (const node of crypt.vaultNodes) {
      const isGem = node.resource === crypt.def.gem;
      node.crack(isGem ? crypt.def.geodeTexture : "moonsilver_node");
    }
    this.eventLog.add("info", `${crypt.def.wardenName} falls — the vault is unsealed`);
    this.sfx.levelUp();
  }

  // ===== The Sunken Gorge — the Miretyrant's lair (Phase 4d session 2) =====

  // The surface maw + its prebuilt interior. Same two-part shape as a crypt: the
  // doorway is a POI out in the swamp, the interior lives in the dead-corner
  // pocket and is built once, at create() time.
  private spawnSunkenGorge(solids: Phaser.Physics.Arcade.StaticGroup): void {
    const pos = this.gorgePosition;
    if (!pos) return;
    const rng = this.sessionRng();
    this.decoratePoi(rng, pos.x, pos.y, {
      floorTexture: "poi_floor_gorge",
      floorRadius: 175,
      ringTexture: "poi_ring_gorge",
      ringCount: 11,
      ringRadius: 156,
    });
    const lair = new MiretyrantLair(this, { x: pos.x, y: pos.y });
    this.lair = lair;
    this.gorgeLightPoints.push({ x: pos.x, y: pos.y });
    // Additional maws into the SAME interior — each gets the full POI dressing
    // and night glow, so neither reads as the "lesser" door.
    for (const extra of this.gorgePositions.slice(1)) {
      this.decoratePoi(rng, extra.x, extra.y, {
        floorTexture: "poi_floor_gorge",
        floorRadius: 175,
        ringTexture: "poi_ring_gorge",
        ringCount: 11,
        ringRadius: 156,
      });
      lair.addMaw(this, extra.x, extra.y);
      this.gorgeLightPoints.push({ x: extra.x, y: extra.y });
    }
    this.buildLairInterior(lair, rng, solids);
    this.setDungeonVisible(lair, false);
  }

  private buildLairInterior(
    lair: MiretyrantLair,
    rng: Phaser.Math.RandomDataGenerator,
    solids: Phaser.Physics.Arcade.StaticGroup,
  ): void {
    // Approach + arena (locked): the forced arena room becomes the layout's
    // vault, and generateCrypt puts the entrance in the room furthest from it,
    // so the descent always ENDS at the arena instead of opening onto it.
    lair.layout = generateCrypt(rng, LAIR_REALM, LAIR_ROOMS, LAIR_ARENA_CELLS);
    this.renderDungeonShell(lair, rng, solids, 3); // a few pillars: cover to break the death roll's line
    this.populateLair(lair, rng);
  }

  // The approach holds bayou dwellers; the arena holds nothing but the boss.
  // No chest and no vault nodes down here — killing what waits in the arena ends
  // the run, so there is nothing to bank.
  private populateLair(lair: MiretyrantLair, rng: Phaser.Math.RandomDataGenerator): void {
    const layout = lair.layout;
    for (const room of layout.rooms) {
      if (room === layout.entry || room === layout.vault) continue; // arrival stays safe; the arena is the boss's
      const spot = () => ({
        x: room.x + rng.between(24, Math.max(25, room.w - 24)),
        y: room.y + rng.between(24, Math.max(25, room.h - 24)),
      });
      const roll = rng.between(1, 10);
      if (roll <= 5) {
        for (let i = 0; i < rng.between(3, 5); i++) {
          const p = spot();
          this.addDungeonEnemy(lair, new Murkling(this, { x: p.x, y: p.y, elite: this.rollElite(rng, CRYPT_ELITE_CHANCE_MULT) }));
        }
      } else {
        // roll 6-10: a bruiser. (Fenlurker cut 2026-07-23 — folded into Mosswretch.)
        const p = spot();
        this.addDungeonEnemy(lair, new Mosswretch(this, { x: p.x, y: p.y, elite: this.rollElite(rng, CRYPT_ELITE_CHANCE_MULT) }));
      }
    }

    const arena = layout.vault;
    const boss = new Miretyrant(this, { x: arena.cx, y: arena.cy });
    this.miretyrant = boss;
    lair.boss = boss;
    this.addDungeonEnemy(lair, boss);
  }

  // Register an enemy as living inside an interior. Dungeon dwellers DO collide
  // with solid terrain (the one place the engine-wide default is wrong — see
  // populateCrypt), and being in cryptEnemies keeps them out of the surface
  // respawn budget.
  private addDungeonEnemy(dungeon: DungeonInterior, e: Enemy): void {
    e.collidesWithTerrain = true;
    this.enemies.push(e);
    this.enemyGroup.add(e);
    this.cryptEnemies.add(e);
    dungeon.enemies.push(e);
  }

  // The Miretyrant's bellow, resolved. The boss only ASKS (consumeBellow) —
  // spawning is the scene's job, which is what gets the adds terrain collision,
  // crypt navigation and containment for free. Called each frame from
  // updateEnemies while the player is in the lair.
  private updateMiretyrantBellow(): void {
    const lair = this.lair;
    const boss = this.miretyrant;
    if (!lair || !boss || boss.depleted) return;
    // Phase-3 mire pools: churned floor that poisons and drags. Rendered here
    // (the boss owns no world objects beyond itself) and applied through the
    // SAME environmentEffectAt path the bayou's miasma zones use, so a pool
    // needs no bespoke damage code and inherits the status-resist layer.
    for (const p of boss.consumeMirePools()) {
      const img = this.add
        .image(p.x, p.y, "poi_floor_gorge")
        .setScale(MIRE_POOL_RADIUS / 90)
        .setAlpha(0.72)
        .setTint(0x2c4a2a)
        .setDepth(-6);
      this.mirePools.push({ x: p.x, y: p.y, image: img });
    }
    const wave = boss.consumeBellow();
    if (wave <= 0) return;
    lair.adds = lair.adds.filter((a) => !a.depleted);
    const room = lair.layout.vault;
    const rng = this.sessionRng();
    const composition = this.miretyrantWaveComposition(wave, boss.health <= boss.maxHealth * 0.35);
    let spawned = 0;
    for (const kind of composition) {
      if (lair.adds.length >= MIRETYRANT_MAX_ADDS) break;
      // Surface them around the arena's edge rather than on the player — a wave
      // that materializes on top of you isn't a wave, it's a mugging.
      const a = rng.frac() * Math.PI * 2;
      const x = Phaser.Math.Clamp(
        room.cx + Math.cos(a) * (room.w / 2 - LAIR_ADD_SPAWN_INSET),
        room.x + LAIR_ADD_SPAWN_INSET,
        room.x + room.w - LAIR_ADD_SPAWN_INSET,
      );
      const y = Phaser.Math.Clamp(
        room.cy + Math.sin(a) * (room.h / 2 - LAIR_ADD_SPAWN_INSET),
        room.y + LAIR_ADD_SPAWN_INSET,
        room.y + room.h - LAIR_ADD_SPAWN_INSET,
      );
      // Adds are ELITE (Elite is the roster's existing +50% HP/dmg lever, so a
      // splash-crit swing still has to spend the swing). "frog" keeps the
      // 2026-07-24 Blighttoad-favoured mix (its payload is poison, which
      // bypasses flat armour, so it stays relevant at any gear level); "gator"
      // is the escalation — a tankier elite Mirejaw that the frog swarm alone
      // never delivered (the user: "spawn alligators instead of the frog dudes
      // ... fighting strong adds the whole time").
      const add =
        kind === "gator"
          ? new Mirejaw(this, { x, y, elite: true })
          : rng.frac() < 0.45
            ? new Murkling(this, { x, y, elite: true })
            : new Blighttoad(this, { x, y, elite: true });
      this.addDungeonEnemy(lair, add);
      lair.adds.push(add);
      spawned++;
    }
    if (spawned > 0) {
      this.eventLog.add(
        "combat",
        wave >= 3 ? "The Miretyrant bellows — the mire's jaws answer." : "The Miretyrant bellows — the mire answers.",
      );
      this.sfx.nightfall();
    }
  }

  // Scripted escalation for the Miretyrant's bellow waves (the user's "hella
  // frogs into some big scary alligators" pitch): the first two waves are pure
  // frog swarms, wave 3 is the first Mirejaw arrival, and every wave after that
  // keeps gators in the mix permanently. Enraged (phase 3) adds one more frog
  // on top of the apex mix, on top of its own halved bellow interval, so
  // pressure escalates on two axes at once late in the fight.
  private miretyrantWaveComposition(wave: number, enraged: boolean): ("frog" | "gator")[] {
    if (wave === 1) return ["frog", "frog", "frog", "frog"];
    if (wave === 2) return ["frog", "frog", "frog", "frog", "frog"];
    if (wave === 3) return ["gator", "gator", "frog"];
    return enraged
      ? ["gator", "gator", "frog", "frog", "frog"]
      : ["gator", "gator", "frog", "frog"];
  }

  // The maw. Sealed it takes the effigy; open it's a doorway like any other.
  // Prompted even while sealed (the tyrant-altar precedent) so the site reads as
  // real content before you can use it — clicking without the effigy just needs
  // to say why nothing happened.
  // NOTE the reach is measured against the HOVERED maw, not lair.x/lair.y — that
  // is only ever the FIRST maw, so measuring against it made the second door
  // permanently unusable: no prompt, and the click fell through (the user: "I
  // built an effigy and couldn't interact with the boss dungeon opening").
  private promptForGorge(hover: { lair: MiretyrantLair; maw: { x: number; y: number } }): string | null {
    const { lair, maw } = hover;
    const inReach = Phaser.Math.Distance.Between(this.player.x, this.player.y, maw.x, maw.y) <= REACH;
    if (!inReach) return null;
    return lair.unsealed ? "[LMB] Descend into the Sunken Gorge" : "[LMB] Break the seal";
  }

  private tryOpenGorge(lair: MiretyrantLair): void {
    if (lair.unsealed) {
      this.enterCrypt(lair);
      return;
    }
    if (this.hotbar.container.count("miretyrant_effigy") >= 1) {
      this.hotbar.container.removeCount("miretyrant_effigy", 1);
    } else if (this.backpack.count("miretyrant_effigy") >= 1) {
      this.backpack.removeCount("miretyrant_effigy", 1);
    } else {
      this.eventLog.add("info", "The seal holds. Something must be offered here.");
      return;
    }
    this.afterItemMove();
    lair.unseal();
    this.cameras.main.shake(400, 0.006);
    this.eventLog.add("poi", "The seal splits — the mire drains into the dark.");
    this.sfx.levelUp();
  }

  // One maw onto the map. Both discovery routes (walking up to a door, and
  // crafting the effigy) funnel through here so they can never disagree about
  // what "discovered" means again.
  private markMawDiscovered(maw: { x: number; y: number; discovered: boolean }): void {
    if (maw.discovered) return;
    maw.discovered = true;
    if (this.lair) this.lair.discoveredOnMap = true; // "at least one door is known"
    this.exploredMap.addLandmark({
      worldX: maw.x,
      worldY: maw.y,
      iconKey: "map_gorge",
      label: "The Sunken Gorge",
      tint: 0x4fbf86,
    });
  }

  // Crafting the effigy puts EVERY maw on the map. A door in a 28000px world is
  // not findable by exploration, so this mirrors the Duneshaper altars' clue
  // system rather than hoping the player wanders past — and with several doors
  // into one lair, the compass points at the NEAREST one, which is the entire
  // reason there is more than one.
  private onMiretyrantEffigyCrafted(): void {
    const lair = this.lair;
    if (!lair || this.lairRevealed) return;
    this.lairRevealed = true;
    // Per maw, and NOT gated on "has any maw been discovered" — that outer guard
    // is what silently swallowed this whole reveal once the player had already
    // stumbled onto one door.
    for (const maw of lair.maws) this.markMawDiscovered(maw);
    const nearest = lair.maws.reduce((best, m) =>
      Phaser.Math.Distance.Between(this.player.x, this.player.y, m.x, m.y) <
      Phaser.Math.Distance.Between(this.player.x, this.player.y, best.x, best.y)
        ? m
        : best,
    );
    const dir = this.compassDir(this.player.x, this.player.y, nearest.x, nearest.y);
    this.eventLog.add("poi", `The effigy pulls ${dir} — the Sunken Gorge is marked on your map.`);
  }

  // Enter a crypt: remember where we came in, then teleport into its entry room.
  // Show/hide a whole interior — its shell, its props and its inhabitants.
  // Interiors are prebuilt at create() and packed into the dead corners outside
  // the world circle, so a neighbour is easily within the ~1536px the camera
  // sees. Hiding all but the active one is what makes that packing safe (and
  // lets the corners hold far more dungeons than separation ever could).
  //
  // Enemies are hidden too, but NOT disabled — their AI is already skipped by
  // the distance cull in updateEnemies, and their bodies must stay live so a
  // dungeon the player re-enters is exactly as they left it.
  private setDungeonVisible(dungeon: DungeonInterior, visible: boolean): void {
    for (const o of dungeon.objects) {
      (o as unknown as { setVisible?: (v: boolean) => void }).setVisible?.(visible);
    }
    for (const e of dungeon.enemies) {
      if (!e.depleted) e.setVisible(visible);
    }
  }

  // Cover a teleport. The camera follows the player with lerp 0.1, so moving him
  // ~14000px into an underground pocket made the camera EASE all the way there —
  // you watched it fly across the whole world (the user: "you can clearly see the
  // camera moving to the other area and it's really distracting"). A `flash`
  // couldn't hide that: it's ~260ms and the pan takes far longer.
  //
  // So do both things: snap the camera onto its new subject so there is no pan
  // at all, then fade UP from black over it, which reads as a scene transition
  // instead of a jump cut. Both cameras fade — the world camera alone would
  // leave the HUD floating over a black screen.
  private transitionCameraTo(x: number, y: number): void {
    const cam = this.cameras.main;
    cam.centerOn(x, y); // kills the follow lerp's in-flight travel
    cam.fadeIn(TRANSITION_FADE_MS, 0, 0, 0);
    this.uiCam?.fadeIn(TRANSITION_FADE_MS, 0, 0, 0);
  }

  private enterCrypt(crypt: DungeonInterior): void {
    if (this.activeDungeon) return;
    this.cryptReturn = { x: this.player.x, y: this.player.y };
    this.activeDungeon = crypt;
    this.setDungeonVisible(crypt, true);
    // Nobody gets a free hit on arrival: every dweller starts its attack clock
    // over, so the first swing you see down here plays its full telegraph.
    const now = this.time.now;
    for (const e of crypt.enemies) {
      if (!e.depleted) e.resetAttackState(now);
    }
    this.player.setPosition(crypt.entryPoint.x, crypt.entryPoint.y);
    (this.player.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
    this.transitionCameraTo(crypt.entryPoint.x, crypt.entryPoint.y);
    this.clearHoverState();
    this.eventLog.add("poi", `Entered the ${crypt.name}`);
    this.hints.trigger("crypt_dark");
  }

  // Leave a crypt: back to the surface doorway we came in by. Anything killed or
  // mined inside stays that way — the interior is prebuilt, never regenerated.
  private exitCrypt(): void {
    const crypt = this.activeDungeon;
    if (!crypt) return;
    const back = this.cryptReturn ?? { x: crypt.x, y: crypt.y + 40 };
    this.setDungeonVisible(crypt, false);
    this.activeDungeon = null;
    this.cryptReturn = null;
    this.player.setPosition(back.x, back.y + 30);
    (this.player.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
    this.transitionCameraTo(back.x, back.y + 30);
    this.clearHoverState();
  }

  // March the blink line in small steps and return the furthest point still on
  // crypt floor (the full destination when outside a crypt). Stepping rather
  // than testing only the endpoint is what stops a blink from jumping THROUGH a
  // wall into the next room — the endpoint alone can be perfectly valid floor on
  // the far side of solid rock.
  private clipBlinkToFloor(
    fromX: number,
    fromY: number,
    angle: number,
    dist: number,
  ): { x: number; y: number } {
    const crypt = this.activeDungeon;
    const full = { x: fromX + Math.cos(angle) * dist, y: fromY + Math.sin(angle) * dist };
    if (!crypt?.layout) return full;
    const step = 10;
    const margin = 10; // keep the landing clear of the wall face itself
    let best = { x: fromX, y: fromY };
    for (let d = step; d <= dist; d += step) {
      const x = fromX + Math.cos(angle) * d;
      const y = fromY + Math.sin(angle) * d;
      if (!isCryptFloor(crypt.layout, x, y, margin)) break;
      best = { x, y };
    }
    return best;
  }

  // Light every room/corridor the player sets foot in, permanently. This is the
  // crypt's fog of war: the space you're standing in reveals as a whole (walls
  // included), so a crypt you've walked reads as a lit floor plan and the parts
  // you haven't stay black. A small margin means stepping just inside a doorway
  // counts — nobody should have to walk to a room's center to light it.
  private updateCryptDiscovery(crypt: DungeonInterior): void {
    const layout = crypt.layout;
    if (!layout) return;
    const px = this.player.x;
    const py = this.player.y;
    const m = 10;
    for (const r of [...layout.rooms, ...layout.corridors]) {
      if (crypt.discovered.has(r)) continue;
      if (px >= r.x - m && px <= r.x + r.w + m && py >= r.y - m && py <= r.y + r.h + m) {
        crypt.discovered.add(r);
      }
    }
  }

  // Redirect a chasing crypt dweller's movement along the corridor toward the
  // player. Deliberately narrow: only inside the crypt the player is in, only
  // while aggro'd, only when the enemy is ALREADY moving under its own AI (so a
  // planted wind-up/recovery is never disturbed), and only when the player is in
  // a different room. Preserves the AI's chosen speed — this is a heading
  // change, not a movement system, and the enemy's own logic is untouched.
  private static readonly CRYPT_NAV_REACHED = 34; // px — close enough, pick the next one
  private static readonly CRYPT_NAV_REFRESH_MS = 1200; // re-plan even if not reached (the player moves)
  // Walk a strayed enemy back toward where it spawned. Applied AFTER update()
  // and only while it is NOT aggro'd or attacking, so it can never bend a
  // committed lunge or pull a creature off a live chase — it only overrides idle
  // wander, which is the drift that actually accumulates. This is the coarse
  // backstop behind each subclass's own tighter anchor (den/shack guards);
  // HOME_LEASH is deliberately loose enough that ordinary roaming still reads as
  // roaming, and only a genuine migration gets corrected.
  private steerEnemyHome(enemy: Enemy): void {
    if (enemy.isAggro() || enemy.isAttacking()) return;
    const dx = enemy.homeX - enemy.x;
    const dy = enemy.homeY - enemy.y;
    const d = Math.hypot(dx, dy);
    if (d <= MainScene.HOME_LEASH) return;
    const body = enemy.body as Phaser.Physics.Arcade.Body | undefined;
    if (!body) return;
    body.setVelocity((dx / d) * MainScene.HOME_RETURN_SPEED, (dy / d) * MainScene.HOME_RETURN_SPEED);
  }
  // px from spawn before a non-aggro'd enemy starts walking home, and how fast
  // it does (a touch above a typical idle-wander speed, so it actually closes).
  private static readonly HOME_LEASH = 800;
  private static readonly HOME_RETURN_SPEED = 34;

  private steerCryptEnemy(enemy: Enemy): void {
    const crypt = this.activeDungeon;
    if (!crypt?.layout || !this.cryptEnemies.has(enemy)) return;
    if (!crypt.enemies.includes(enemy) || !enemy.isAggro() || enemy.isAttacking()) return;
    // Bosses run their own committed lines (a locked lunge, a death roll) and
    // never leave their arena, so steering them toward a doorway could only bend
    // an attack the player has already read. isAttacking() doesn't cover it —
    // the bespoke bosses drive their own state machines, not the base one.
    if (enemy instanceof Miretyrant) return;
    const body = enemy.body as Phaser.Physics.Arcade.Body | undefined;
    if (!body) return;
    const speed = Math.hypot(body.velocity.x, body.velocity.y);
    if (speed < 1) return; // it chose to stand still — respect that

    // COMMIT to a waypoint rather than re-deriving a heading every frame. Rooms
    // and corridors overlap, so at a junction an enemy sits inside three rects
    // at once and "which rect am I in" flips frame to frame — re-planning each
    // frame made the heading flip with it and the enemy vibrated in the doorway
    // instead of walking through it (observed: velocity alternating ±25 while
    // the position held still). It re-plans on arrival or on a timer instead.
    const now = this.time.now;
    let wp = this.cryptNav.get(enemy);
    const reached = wp && Phaser.Math.Distance.Between(enemy.x, enemy.y, wp.x, wp.y) <= MainScene.CRYPT_NAV_REACHED;
    if (!wp || reached || now - wp.at > MainScene.CRYPT_NAV_REFRESH_MS) {
      const next = cryptNavWaypoint(crypt.layout, enemy.x, enemy.y, this.player.x, this.player.y);
      if (!next) {
        this.cryptNav.delete(enemy); // same room — chase directly from here
        return;
      }
      wp = { x: next.x, y: next.y, at: now };
      this.cryptNav.set(enemy, wp);
    }
    const a = Phaser.Math.Angle.Between(enemy.x, enemy.y, wp.x, wp.y);
    body.setVelocity(Math.cos(a) * speed, Math.sin(a) * speed);
  }

  // Keep a crypt's inhabitants on their crypt's walkable floor. Dungeon dwellers
  // DO collide with walls (see addEnemy), so this is no longer the thing keeping
  // them in — it's the safety net for the movement that physics separation can't
  // catch: a Fenlurker surfacing, a leap, a knockback, or an enemy spawned by a
  // future path that doesn't know about interiors. Anything found off the floor
  // plan is nudged to the NEAREST floor point (the smallest correction that
  // works) rather than teleported to a room center. Cheap: 6 crypts × ~10.
  private containCryptEnemies(): void {
    for (const crypt of [...this.crypts, ...(this.lair ? [this.lair as DungeonInterior] : [])]) {
      const layout = crypt.layout;
      if (!layout) continue;
      for (const e of crypt.enemies) {
        if (e.depleted) continue;
        if (isCryptFloor(layout, e.x, e.y)) continue;
        const p = nearestCryptFloorPoint(layout, e.x, e.y);
        e.setPosition(p.x, p.y);
        (e.body as Phaser.Physics.Arcade.Body | undefined)?.reset(p.x, p.y);
      }
    }
  }

  // Drop every hover target + the prompt. Teleporting (crypt in/out) moves the
  // player out from under the pointer without the pointer moving, so a stale
  // hover would otherwise survive the transition and offer an interaction with
  // something now on the other side of the world.
  private clearHoverState(): void {
    this.hoveredNode = null;
    this.hoveredEnemy = null;
    this.hoveredRack = null;
    this.hoveredShack = null;
    this.hoveredDen = null;
    this.hoveredAltar = null;
    this.hoveredWorkbench = null;
    this.hoveredCampfire = null;
    this.hoveredForge = null;
    this.hoveredSmelter = null;
    this.hoveredJewelry = null;
    this.hoveredCrypt = null;
    this.hoveredCryptExit = null;
    this.hoveredCryptChest = null;
    this.hoveredShrine = null;
    this.hoveredLodgeHut = null;
    this.hoveredGorge = null;
    this.promptText.setVisible(false);
    this.hoverHighlight.clear();
  }

  // Clamp the player to the interior's own footprint while inside (the world
  // circle clamp is meaningless out in the realm pocket). Walls already stop
  // ordinary movement; this catches a dash/blink through a corner.
  private clampPlayerToCrypt(crypt: DungeonInterior): void {
    const b = crypt.layout.bounds;
    const m = 16;
    this.player.setPosition(
      Phaser.Math.Clamp(this.player.x, b.x + m, b.x + b.w - m),
      Phaser.Math.Clamp(this.player.y, b.y + m, b.y + b.h - m),
    );
    // Last line of defence: if the player somehow ends up embedded in rock
    // (knockback into a corner, a future movement ability that ignores walls),
    // put them back on the nearest floor rather than leaving them stuck inside a
    // static body. The blink is already clipped at cast time; this covers the
    // cases nothing asked permission for.
    if (!isCryptFloor(crypt.layout, this.player.x, this.player.y)) {
      const p = nearestCryptFloorPoint(crypt.layout, this.player.x, this.player.y);
      this.player.setPosition(p.x, p.y);
    }
  }

  private decoratePoi(
    rng: Phaser.Math.RandomDataGenerator,
    cx: number,
    cy: number,
    opts: {
      floorTexture?: string;
      floorRadius?: number;
      ringTexture?: string;
      ringCount?: number;
      ringRadius?: number;
    },
  ): void {
    if (opts.floorTexture && opts.floorRadius) {
      this.add
        .image(cx, cy, opts.floorTexture)
        .setDisplaySize(opts.floorRadius * 2, opts.floorRadius * 2)
        .setDepth(-7);
    }
    if (opts.ringTexture && opts.ringCount && opts.ringRadius) {
      const step = (Math.PI * 2) / opts.ringCount;
      for (let i = 0; i < opts.ringCount; i++) {
        const a = i * step + rng.frac() * step * 0.3;
        const r = opts.ringRadius + rng.between(-8, 8);
        const x = Phaser.Math.Clamp(cx + Math.cos(a) * r, 20, WORLD_W - 20);
        const y = Phaser.Math.Clamp(cy + Math.sin(a) * r, 20, WORLD_H - 20);
        const img = this.add.image(x, y, opts.ringTexture).setDepth(ysortDepth(y));
        // These are boundary MARKERS — they say "something is here", so they
        // must not compete with the POI they surround. Sized off their own
        // placeholder like crops, since real art arrives on a much taller
        // canvas and a ring of 48px posts reads as a structure in its own right.
        const was = placeholderDims(opts.ringTexture);
        if (was) img.setScale(scaleToLongest(this, opts.ringTexture, Math.max(was.w, was.h) * 1.3));
      }
    }
  }

  // ===== Bayou surface POIs (biome 3 Phase 4d) =====

  // Shared placement for both Phase-4d POIs: sample the bayou until we have
  // `count` points that are far enough from each other (and from any extra
  // positions the caller passes). Same "keep the best fallback" contract every
  // other POI picker uses — a spacing rule should thin a crowded map, not
  // silently drop half the POIs when the band is tight.
  private pickBayouPoiPositions(
    rng: Phaser.Math.RandomDataGenerator,
    count: number,
    minSpacing: number,
    opts: { avoidDeepWater?: boolean; avoid?: { x: number; y: number }[]; avoidRadius?: number } = {},
  ): { x: number; y: number }[] {
    const picked: { x: number; y: number }[] = [];
    const avoid = opts.avoid ?? [];
    const avoidRadius = opts.avoidRadius ?? 0;
    for (let i = 0; i < count; i++) {
      let pt: { x: number; y: number } | null = null;
      let fallback: { x: number; y: number } | null = null;
      for (let a = 0; a < 90; a++) {
        const cand = this.pickBayouPoint(rng, 0.45, BAYOU_R_MIN, BAYOU_R_MAX, {
          avoidDeepWater: opts.avoidDeepWater,
        });
        if (!cand) break;
        // Keep clear of EVERY other POI, including the badlands ones a bayou blob
        // can border (the user: "Duneshaper altar right next to the Sunken Gorge").
        // Same-type spacing (minSpacing) + the explicit `avoid` list handle
        // bayou-vs-bayou; this adds the cross-biome / other-type separation.
        if (this.tooCloseToAnyPoi(cand.x, cand.y, POI_MIN_SEPARATION)) continue;
        fallback = cand;
        const spacedOk = picked.every(
          (p) => Phaser.Math.Distance.Between(p.x, p.y, cand.x, cand.y) >= minSpacing,
        );
        const avoidOk = avoid.every(
          (p) => Phaser.Math.Distance.Between(p.x, p.y, cand.x, cand.y) >= avoidRadius,
        );
        if (spacedOk && avoidOk) {
          pt = cand;
          break;
        }
      }
      pt = pt ?? fallback;
      if (!pt) break;
      picked.push(pt);
    }
    return picked;
  }

  // --- Sunken Shrine (the rite POI) ---

  private spawnSunkenShrines(): void {
    const rng = this.sessionRng();
    for (const pos of this.shrinePositions) {
      this.decoratePoi(rng, pos.x, pos.y, {
        floorTexture: "poi_floor_shrine",
        floorRadius: 190,
        ringTexture: "poi_ring_shrine",
        ringCount: 12,
        ringRadius: 176,
      });
      const shrine = new SunkenShrine(this, { x: pos.x, y: pos.y });
      this.shrines.push(shrine);
      this.shrineLightPoints.push({ x: pos.x, y: pos.y });
      // A close ring of offering basins — what makes it read as a rite site
      // rather than one standing stone in the muck.
      for (let i = 0; i < SHRINE_RING_PROPS; i++) {
        const a = (i / SHRINE_RING_PROPS) * Math.PI * 2 + rng.frac() * 0.4;
        const r = 72 + rng.between(-10, 10);
        const bx = pos.x + Math.cos(a) * r;
        const by = pos.y + Math.sin(a) * r;
        this.add.image(bx, by, "shrine_basin").setDepth(ysortDepth(by));
      }
    }
  }

  // Spend the offering and start the rite. The shrine is deliberately always
  // prompt-able while dormant (the Boss Altar precedent) so it reads as a real
  // interactable before the player knows what it wants — clicking without the
  // offering just says so.
  private kindleShrine(shrine: SunkenShrine): void {
    if (shrine.phase !== "dormant") return;
    if (shrine.kindlingsLeft() <= 0) return; // spent — nothing left to give it
    const held = (key: string) => this.backpack.count(key) + this.hotbar.container.count(key);
    const missing = SHRINE_OFFERING.find((o) => held(o.key) < o.count);
    if (missing && !this.devNoBuildCost) {
      const def = itemDef(missing.key);
      this.eventLog.add("info", `The bowl stays cold. It wants ${missing.count}x ${def?.name ?? missing.key}.`);
      return;
    }
    if (!this.devNoBuildCost) {
      // Backpack first, then the hotbar for whatever's left — the offering is a
      // material, so unlike a totem the player isn't necessarily holding it.
      for (const o of SHRINE_OFFERING) {
        const fromPack = Math.min(o.count, this.backpack.count(o.key));
        if (fromPack > 0) this.backpack.removeCount(o.key, fromPack);
        if (fromPack < o.count) this.hotbar.container.removeCount(o.key, o.count - fromPack);
      }
      this.afterItemMove();
    }
    // Charged BEFORE the rite resolves: a lapsed rite still costs a kindling,
    // which is what stops kindle -> farm a wave -> walk away -> repeat.
    shrine.kindlings += 1;
    shrine.clearRite();
    shrine.setPhase("rite");
    shrine.nextWaveAt = this.time.now + SHRINE_FIRST_WAVE_DELAY_MS;
    this.eventLog.add("combat", "The bowl takes the offering — the water starts to move.");
    const left = shrine.kindlingsLeft();
    this.eventLog.add(
      "info",
      left > 0
        ? `This shrine will answer ${left} more time${left === 1 ? "" : "s"}.`
        : "The last of the shrine's hunger — it will not answer again.",
    );
  }

  // One wave of the rite. Each is a different shape rather than more of the
  // same: a swarm to be swept, then a poison line that punishes standing still,
  // then a bruiser with an elite escort. All three are the bayou's own roster,
  // which is the point — the rite is what makes those creatures the content.
  private spawnShrineWave(shrine: SunkenShrine, wave: number): void {
    const rng = this.sessionRng();
    const spawnAt = (i: number, total: number) => {
      const a = (i / total) * Math.PI * 2 + rng.frac() * 0.5;
      const r = SHRINE_SPAWN_RADIUS + rng.between(-24, 24);
      return { x: shrine.x + Math.cos(a) * r, y: shrine.y + Math.sin(a) * r };
    };
    const summoned: Enemy[] = [];
    const add = (e: Enemy) => {
      summoned.push(e);
      this.enemies.push(e);
      this.enemyGroup.add(e);
      // The rite CALLED them — they don't wander in and notice you later.
      e.forceAggro(this.time.now);
    };
    // Elites ESCALATE across the rite (2026-07-24). Waves 1-2 previously passed
    // no elite flag at all and wave 3 hardcoded exactly one, so the bayou's only
    // wave content was also nearly its only content that couldn't drop a trophy
    // — the user: "trophies feel so rare in the bayou... maybe there needs to be
    // some kind of elite waves thing like the dusk warren." The Warren's shape
    // is exactly the model: rolled early, guaranteed by the last wave, so the
    // rite pays out for finishing it rather than for starting it.
    const eliteRoll = () => this.rollElite(rng, BAYOU_POI_ELITE_CHANCE_MULT);
    if (wave === 1) {
      for (let i = 0; i < 5; i++) {
        const p = spawnAt(i, 5);
        add(new Murkling(this, { x: p.x, y: p.y, elite: eliteRoll() }));
      }
    } else if (wave === 2) {
      for (let i = 0; i < 3; i++) {
        const p = spawnAt(i, 6);
        add(new Blighttoad(this, { x: p.x, y: p.y, elite: eliteRoll() }));
      }
      for (let i = 3; i < 7; i++) {
        const p = spawnAt(i, 7);
        add(new Murkling(this, { x: p.x, y: p.y, elite: eliteRoll() }));
      }
    } else {
      // Final wave: all elite, no roll. This is the payout the rite is for.
      for (let i = 0; i < 2; i++) {
        const p = spawnAt(i, 4);
        add(new Mosswretch(this, { x: p.x, y: p.y, elite: true }));
      }
      for (let i = 2; i < 5; i++) {
        const p = spawnAt(i, 5);
        add(new Blighttoad(this, { x: p.x, y: p.y, elite: true }));
      }
    }
    shrine.wave = wave;
    shrine.riteEnemies = summoned;
    shrine.nextWaveAt = this.time.now + SHRINE_WAVE_INTERVAL_MS;
    shrine.stokeForWave(wave);
    this.sfx.nightfall();
    this.eventLog.add("combat", `The shrine burns brighter — wave ${wave} of ${SHRINE_WAVE_COUNT}!`);
  }

  // Ticked every frame from update(). Owns wave cadence, the leash, and both
  // exits from the rite. Polled rather than hooked into the kill path because
  // every condition here (a wave cleared, the player wandering off, the bowl
  // being emptied) is already a polled state elsewhere.
  private updateShrines(now: number, delta: number): void {
    for (const shrine of this.shrines) {
      if (shrine.phase === "open") {
        // Emptied — the shrine goes cold. It can be kindled again only while it
        // has kindlings left; out of them it retires permanently, which is the
        // bound on what used to be an unlimited renewable.
        if (shrine.loot.isEmpty()) {
          shrine.loot.rearmIfEmpty();
          shrine.setPhase(shrine.kindlingsLeft() > 0 ? "dormant" : "spent");
        }
        continue;
      }
      if (shrine.phase !== "rite") continue;

      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, shrine.x, shrine.y);
      // Being underground counts as gone: activeCrypt puts the player in the
      // CRYPT_REALM pocket, which is nowhere near the shrine anyway, but say it
      // explicitly rather than relying on that distance being large.
      if (dist > SHRINE_RITE_RADIUS || this.activeDungeon) shrine.awayMs += delta;
      else shrine.awayMs = 0;
      if (shrine.awayMs >= SHRINE_LEASH_GRACE_MS) {
        this.failShrineRite(shrine);
        continue;
      }

      shrine.riteEnemies = shrine.riteEnemies.filter((e) => !e.depleted);
      if (shrine.wave < SHRINE_WAVE_COUNT) {
        // Next wave lands when this one is cleared, or when the interval runs
        // out — so a fast player is rewarded with pace instead of waiting.
        const cleared = shrine.wave > 0 && shrine.riteEnemies.length === 0;
        if (cleared || now >= shrine.nextWaveAt) this.spawnShrineWave(shrine, shrine.wave + 1);
      } else if (shrine.riteEnemies.length === 0) {
        this.completeShrineRite(shrine);
      }
    }
  }

  // The rite lapses. The offering is gone, the site is not — everything it
  // called sinks back into the water, so a lapsed rite doesn't leave a pack
  // roaming the swamp that the player never chose to fight.
  private failShrineRite(shrine: SunkenShrine): void {
    for (const e of shrine.riteEnemies) {
      if (e.depleted) continue;
      const idx = this.enemies.indexOf(e);
      if (idx >= 0) this.enemies.splice(idx, 1);
      this.enemyGroup.remove(e);
      e.destroy();
    }
    shrine.clearRite();
    const exhausted = shrine.kindlingsLeft() <= 0;
    shrine.setPhase(exhausted ? "spent" : "dormant");
    if (Phaser.Math.Distance.Between(this.player.x, this.player.y, shrine.x, shrine.y) <= POI_RESPAWN_NOTIFY_RADIUS) {
      this.eventLog.add(
        "info",
        exhausted
          ? "The rite lapses, and the shrine's last hunger goes with it."
          : "The rite lapses — the shrine goes cold.",
      );
    }
  }

  private completeShrineRite(shrine: SunkenShrine): void {
    shrine.clearRite();
    shrine.completions += 1;
    shrine.setPhase("open");
    this.rollContainerLoot(shrine.loot, SUNKEN_SHRINE_LOOT_TABLE);
    this.eventLog.add("info", "The rite holds — the bowl spills what it was keeping.");
    // Clearing all three rites at one shrine without ever lapsing one pays a
    // guaranteed tier-3 Refined Trophy (the user's ask for "some kind of
    // guaranteed reward after you clear it 3 times"). A relic-economy payout on
    // purpose: it never touches the gear economy, so it can't undercut the
    // locked rule that build-defining MATERIALS are dungeon loot only.
    if (shrine.completions >= SHRINE_MAX_KINDLINGS) {
      shrine.loot.items.add(SHRINE_MASTERY_REWARD, 1);
      this.eventLog.add(
        "poi",
        "Three rites held. Something older than the shrine settles in the bowl.",
      );
      this.sfx.levelUp();
    }
  }

  // Dormant: always prompt-able in reach (the Boss Altar precedent — the site
  // should read as interactable before you know what it wants). Mid-rite: no
  // prompt, there is nothing to click. Open: the bowl is a container.
  private promptForShrine(shrine: SunkenShrine): string | null {
    const inReach = Phaser.Math.Distance.Between(this.player.x, this.player.y, shrine.x, shrine.y) <= REACH;
    if (!inReach) return null;
    if (shrine.phase === "dormant") return "[LMB] Make an offering";
    if (shrine.phase === "open") return "[LMB] Search the offering bowl";
    // Verb-less on purpose: there's no action left, but saying so beats leaving
    // the player clicking a dead site wondering what they're missing.
    if (shrine.phase === "spent") return "The shrine is spent";
    return null;
  }

  // --- Drowned Lodge (the stilt-village POI) ---

  private spawnDrownedLodges(): void {
    const rng = this.sessionRng();
    for (const pos of this.lodgePositions) {
      this.decoratePoi(rng, pos.x, pos.y, {
        floorTexture: "poi_floor_lodge",
        floorRadius: 220,
        ringTexture: "poi_ring_lodge",
        ringCount: 13,
        ringRadius: 205,
      });
      const lodge = new DrownedLodge(this, { x: pos.x, y: pos.y });
      this.lodges.push(lodge);
      this.lodgeLightPoints.push({ x: pos.x, y: pos.y });

      // The boardwalk: one plank run through the site. It is NOT solid — the
      // player can step off any time, which is exactly the trap. It just sits
      // above the water visually, and the deep-water slow does the rest.
      this.add
        .tileSprite(
          pos.x - LODGE_SPAN,
          pos.y - LODGE_WALK_HALF_W,
          LODGE_SPAN * 2,
          LODGE_WALK_HALF_W * 2,
          "lodge_plank",
        )
        .setOrigin(0, 0)
        .setDepth(-6);
      for (let px = -LODGE_SPAN + 24; px < LODGE_SPAN; px += 62) {
        const y = pos.y + LODGE_WALK_HALF_W + 6;
        this.add.image(pos.x + px, y, "lodge_piling").setDepth(ysortDepth(y) - 0.1);
      }

      // Huts alternate above and below the walk, strung along it. The LAST one
      // is the chieftain's, so the richest cache is always the far end of the
      // boardwalk — the deepest point of the site, not the doorstep.
      const hutCount = rng.between(LODGE_HUT_MIN, LODGE_HUT_MAX);
      for (let i = 0; i < hutCount; i++) {
        const t = hutCount === 1 ? 0.5 : i / (hutCount - 1);
        const hx = pos.x - LODGE_SPAN + 40 + t * (LODGE_SPAN * 2 - 80);
        const hy = pos.y + (i % 2 === 0 ? -LODGE_HUT_OFFSET : LODGE_HUT_OFFSET);
        const chief = i === hutCount - 1;
        const hut = lodge.addHut(hx, hy, chief);
        this.rollContainerLoot(hut.loot, chief ? LODGE_CHIEF_LOOT_TABLE : LODGE_HUT_LOOT_TABLE);
        // A short spur of planking connecting the hut to the walk.
        this.add
          .tileSprite(hx - 10, Math.min(hy, pos.y), 20, Math.abs(hy - pos.y), "lodge_plank")
          .setOrigin(0, 0)
          .setDepth(-6.1);
        this.add.image(hx, hy + 22, "lodge_piling").setDepth(ysortDepth(hy) - 0.1);
      }

      this.spawnLodgeResidents(lodge);
    }
  }

  // The site's population, shared by the initial spawn and the respawn. Haunts
  // gate the chieftain's hut; lurkers gate nothing — they're the reason
  // stepping off the planks is a mistake.
  private spawnLodgeResidents(lodge: DrownedLodge): void {
    const rng = this.sessionRng();
    const haunts: Enemy[] = [];
    // One Corpselight per two huts, minimum two — the ranged haunt is uncommon
    // by design (Phase 4b), so a lodge is one of the few places to meet several.
    const hauntCount = Math.max(2, Math.round(lodge.huts.length / 2));
    for (let i = 0; i < hauntCount; i++) {
      const hut = lodge.huts[i % lodge.huts.length];
      // Rolled elite (2026-07-24): every lodge resident was hardcoded normal,
      // so a garrison POI in the endgame biome dropped no trophies at all.
      const c = new Corpselight(this, {
        x: hut.image.x + rng.between(-30, 30),
        y: hut.image.y - 34 + rng.between(-14, 14),
        elite: this.rollElite(rng, BAYOU_POI_ELITE_CHANCE_MULT),
      });
      haunts.push(c);
      this.enemies.push(c);
      this.enemyGroup.add(c);
    }
    lodge.haunts = haunts;

    const lurkers: Enemy[] = [];
    for (let i = 0; i < LODGE_LURKER_COUNT; i++) {
      // Under the boardwalk, off to the side — in the water the player is
      // tempted to shortcut through.
      const m = new Mirejaw(this, {
        x: lodge.x + rng.between(-LODGE_SPAN, LODGE_SPAN),
        y: lodge.y + (i % 2 === 0 ? 1 : -1) * rng.between(46, 120),
        elite: this.rollElite(rng, BAYOU_POI_ELITE_CHANCE_MULT),
      });
      lurkers.push(m);
      this.enemies.push(m);
      this.enemyGroup.add(m);
    }
    lodge.lurkers = lurkers;
  }

  // A hut's cache. The chieftain's hut returns NOTHING while barred — no
  // prompt, no highlight — the same reveal-nothing treatment a shielded node
  // gets, so the planked-over door is the only tell that it's there at all.
  private promptForLodgeHut(hut: DrownedLodge["huts"][number], lodge: DrownedLodge): string | null {
    if (hut.chief && !lodge.chiefUnbarred) return null;
    const inReach =
      Phaser.Math.Distance.Between(this.player.x, this.player.y, hut.image.x, hut.image.y) <= REACH;
    if (!inReach) return null;
    return hut.chief ? "[LMB] Search the chieftain's hut" : "[LMB] Search the hut";
  }

  // A discovered (not summoned) Boss Altar gets a one-time landmark marker on
  // the minimap once the player has actually explored close enough to reveal
  // its fog cell — reuses fog's own REVEAL_RADIUS so "discovered" means the
  // same thing here as it does for terrain. Deliberately per-altar/one-shot,
  // not a live blip — keeps the minimap's locked "no entity blips" rule intact
  // (a fixed landmark once found is conceptually more like revealed terrain).
  // `forceAll` (used by the dev reveal-whole-map command) marks every POI
  // discovered regardless of distance, so revealing the map also drops all POI
  // landmarks on it (the user: "the reveal map feature should show points of
  // interest on the map").
  private updateAltarDiscovery(forceAll = false): void {
    // POIs get a generous detection radius (the user: "POIs not just boss altars
    // should show up on the minimap and map sooner") — larger than fog's own
    // terrain REVEAL_RADIUS so a structure lands on the map from a good way off,
    // before you're right on top of it.
    const inPoiReveal = (x: number, y: number) =>
      forceAll || Phaser.Math.Distance.Between(this.player.x, this.player.y, x, y) <= POI_DISCOVERY_RADIUS;
    // Boss Altar / War Camp — a larger red marker so the camp is the standout
    // landmark on the minimap.
    for (const altar of this.bossAltars) {
      if (altar.discoveredOnMap) continue;
      if (!forceAll && Phaser.Math.Distance.Between(this.player.x, this.player.y, altar.x, altar.y) > ALTAR_DISCOVERY_RADIUS)
        continue;
      altar.discoveredOnMap = true;
      if (altar.kind === "tyrant") {
        // Duneshaper's Altar (badlands final boss) — a gloam-violet landmark.
        this.exploredMap.addLandmark({
          worldX: altar.x,
          worldY: altar.y,
          iconKey: "map_tyrant_altar",
          label: "Duneshaper's Altar",
          tint: 0x9a5ee8,
        });
        continue;
      }
      this.exploredMap.addLandmark({
        worldX: altar.x,
        worldY: altar.y,
        iconKey: "map_altar",
        label: "Gremlin War Camp",
        tint: 0xd6483a,
      });
      // Point the player at the win path now that they've found the camp — the
      // altar + totem loop is otherwise easy to miss after clearing the guards.
      this.hints.trigger("altar_found");
    }
    // Gremlin Shacks (M-WC backlog item) — same discovered-landmark treatment,
    // in a distinct wood-brown so they read differently from the war camp.
    // The 3 War Camp huts (nearCamp) are folded into the camp's own "Gremlin
    // War Camp" marker above instead of getting their own — they're part of
    // that POI, not separate ones, so the map wouldn't show 4 markers stacked
    // on top of each other.
    for (const shack of this.gremlinShacks) {
      if (shack.nearCamp) continue;
      if (shack.discoveredOnMap) continue;
      if (!inPoiReveal(shack.x, shack.y)) continue;
      shack.discoveredOnMap = true;
      this.exploredMap.addLandmark({
        worldX: shack.x,
        worldY: shack.y,
        iconKey: "map_shack",
        label: "Gremlin Shack",
        tint: 0x8a6a3a,
      });
    }
    // Gloaming Vein — a discovered fixed structure, marked in purple. Same
    // one-shot treatment as the altar/shacks (no live entity blip).
    if (this.veinPosition && !this.veinDiscoveredOnMap && inPoiReveal(this.veinPosition.x, this.veinPosition.y)) {
      this.veinDiscoveredOnMap = true;
      this.exploredMap.addLandmark({
        worldX: this.veinPosition.x,
        worldY: this.veinPosition.y,
        iconKey: "map_vein",
        label: "Gloaming Vein",
        tint: 0x9a5ee8,
      });
    }
    // Duskrunner Warrens (Phase 3) — discovered fixed structures, dusty
    // orange-brown markers, same one-shot treatment as the shacks.
    for (const den of this.badlandsDens) {
      if (den.discoveredOnMap) continue;
      if (!inPoiReveal(den.x, den.y)) continue;
      den.discoveredOnMap = true;
      this.exploredMap.addLandmark({
        worldX: den.x,
        worldY: den.y,
        iconKey: "map_den",
        label: "Duskrunner Warren",
        tint: 0xc06a34,
      });
      // A prominent discovery popup, same beat as finding a new biome.
      this.eventLog.add("poi", "Discovered: Duskrunner Warren");
      this.hints.trigger("den_found");
    }
    // Sunken Crypts (Phase 4c) — one marker PER THEME, so the map itself tells
    // the player which ability is buried where and a run can be steered toward
    // the build they want.
    for (const crypt of this.crypts) {
      if (crypt.discoveredOnMap) continue;
      if (!inPoiReveal(crypt.x, crypt.y)) continue;
      crypt.discoveredOnMap = true;
      this.exploredMap.addLandmark({
        worldX: crypt.x,
        worldY: crypt.y,
        iconKey: crypt.def.mapMarker,
        label: crypt.def.name,
        tint: crypt.def.lightTint,
      });
      this.eventLog.add("poi", `Discovered: ${crypt.def.name}`);
      this.hints.trigger("crypt_found");
    }
    // The Sunken Gorge (Phase 4d s2) — the bayou finale. Crafting the effigy
    // reveals it outright (onMiretyrantEffigyCrafted); this covers walking into
    // it first, which is the better story when it happens.
    // Tested PER MAW: `lair.x/y` is only the first door, so the old check meant
    // walking right up to any other one discovered nothing at all.
    if (this.lair) {
      for (const maw of this.lair.maws) {
        if (maw.discovered || !inPoiReveal(maw.x, maw.y)) continue;
        this.markMawDiscovered(maw);
        this.eventLog.add("poi", "Discovered: The Sunken Gorge");
      }
    }
    // Sunken Forges (Phase 3 POI 2) — discovered fixed landmarks, fiery
    // orange-red markers, same one-shot treatment as the other POIs.
    for (const forge of this.forges) {
      if (forge.discoveredOnMap) continue;
      if (!inPoiReveal(forge.x, forge.y)) continue;
      forge.discoveredOnMap = true;
      this.exploredMap.addLandmark({
        worldX: forge.x,
        worldY: forge.y,
        iconKey: "map_forge",
        label: "The Cinder Forge",
        tint: 0xd6481a,
      });
      this.eventLog.add("poi", "Discovered: The Cinder Forge");
    }
    // Bayou surface POIs (Phase 4d) — discovered fixed structures, same one-shot
    // treatment. Distinct colors from the crypt trio's violets so the map reads
    // "a place" vs "a way down" at a glance.
    for (const shrine of this.shrines) {
      if (shrine.discoveredOnMap) continue;
      if (!inPoiReveal(shrine.x, shrine.y)) continue;
      shrine.discoveredOnMap = true;
      this.exploredMap.addLandmark({
        worldX: shrine.x,
        worldY: shrine.y,
        iconKey: "map_shrine",
        label: "Sunken Shrine",
        tint: 0x2a7a6a,
      });
      this.eventLog.add("poi", "Discovered: Sunken Shrine");
    }
    for (const lodge of this.lodges) {
      if (lodge.discoveredOnMap) continue;
      if (!inPoiReveal(lodge.x, lodge.y)) continue;
      lodge.discoveredOnMap = true;
      this.exploredMap.addLandmark({
        worldX: lodge.x,
        worldY: lodge.y,
        iconKey: "map_lodge",
        label: "Drowned Lodge",
        tint: 0x6a4a2a,
      });
      this.eventLog.add("poi", "Discovered: Drowned Lodge");
    }
    // Once the player is actually holding a Totem, spell out what to do with it
    // (trigger is once-per-run idempotent, so a per-frame poll here is fine).
    if (this.backpack.count("gremlin_totem") + this.hotbar.container.count("gremlin_totem") > 0) {
      this.hints.trigger("totem_ready");
    }
  }

  // Escalating environmental hint near the altar: a small ADDITIVE batch of
  // extra gremlins/gremlings, layered on top of (not a multiplier on)
  // spawnEnemies' Milestone-O-tuned base counts, so the rest of the map's
  // balance is untouched. (The decorative camp-clutter props this used to
  // scatter here were removed in M-WC — spawnWarCamp now owns ALL camp
  // dressing, inside the palisade and the breadcrumb trail leading to it, so
  // there's one source of truth instead of two overlapping prop passes.)
  // First-pass/tunable.
  private spawnAltarDensity(): void {
    if (!this.altarPosition) return;
    const rng = this.sessionRng();

    const ALTAR_NEAR_RADIUS = 500;
    const ALTAR_EXTRA_GREMLINS = 6;
    const ALTAR_EXTRA_GREMLINGS = 4;
    for (let i = 0; i < ALTAR_EXTRA_GREMLINS; i++) {
      const { x, y } = this.pickPointNearAltar(rng, ALTAR_NEAR_RADIUS);
      const gremlin = new RangedGremlin(this, { x, y, elite: this.rollElite(rng) });
      this.enemies.push(gremlin);
      this.enemyGroup.add(gremlin);
    }
    for (let i = 0; i < ALTAR_EXTRA_GREMLINGS; i++) {
      const { x, y } = this.pickPointNearAltar(rng, ALTAR_NEAR_RADIUS);
      const gremling = new MeleeGremling(this, { x, y, elite: this.rollElite(rng) });
      this.enemies.push(gremling);
      this.enemyGroup.add(gremling);
    }
  }

  // M-WC: promote the altar into a walled Gremlin War Camp — a palisade ring,
  // banners, totems, lit braziers, plus a breadcrumb prop trail leading toward
  // it. All purely decorative (non-solid, Y-sorted via setDepth(y)) and untracked
  // (auto-destroyed on scene.restart) except braziers, whose positions feed
  // campLightPoints so they glow at night (collectLights). Deterministic via
  // sessionRng. WAR_CAMP_RADIUS (the palisade radius) is the same constant
  // pickSpawnPoint/buildBiomeTexture use, so the wall, the ground-floor stamp,
  // and the no-clutter zone all agree on where "the camp" physically is —
  // this is now the ONLY prop-scatter pass near the altar (spawnAltarDensity
  // used to also drop 40 loose cairns inside this same area, which just
  // looked like clutter piled on top of the real camp dressing; removed).
  // First-pass/tunable.
  private spawnWarCamp(): void {
    if (!this.altarPosition) return;
    const rng = this.sessionRng();
    const altar = this.altarPosition;
    const prop = (x: number, y: number, key: string) =>
      this.add.image(x, y, key).setDepth(ysortDepth(y));

    // Palisade wall: a ring of stakes at the camp radius, one every ~14deg,
    // leaving a ~55deg entrance gap facing world center so the player walks
    // in the gate.
    const GATE_FACING = this.campGateFacing();
    const GATE_HALF_ARC = Phaser.Math.DegToRad(27.5);
    for (let deg = 0; deg < 360; deg += 14) {
      const a = Phaser.Math.DegToRad(deg);
      // Skip the entrance arc (shortest angular distance to the gate facing).
      if (Math.abs(Phaser.Math.Angle.Wrap(a - GATE_FACING)) < GATE_HALF_ARC) continue;
      const r = WAR_CAMP_RADIUS + rng.between(-8, 8);
      const x = Phaser.Math.Clamp(altar.x + Math.cos(a) * r, 20, WORLD_W - 20);
      const y = Phaser.Math.Clamp(altar.y + Math.sin(a) * r, 20, WORLD_H - 20);
      prop(x, y, "palisade_stake");
    }

    // Banners + totems, kept close to the altar/courtyard (well inside the
    // ~170px hut radius, see spawnGremlinShacks) so they don't compete for
    // space with the evenly-spaced huts or the wall.
    const scatter = (key: string, count: number, minR: number, maxR: number) => {
      for (let i = 0; i < count; i++) {
        const a = Phaser.Math.DegToRad(rng.angle());
        const r = rng.between(minR, maxR);
        const x = Phaser.Math.Clamp(altar.x + Math.cos(a) * r, 20, WORLD_W - 20);
        const y = Phaser.Math.Clamp(altar.y + Math.sin(a) * r, 20, WORLD_H - 20);
        prop(x, y, key);
      }
    };
    scatter("gremlin_banner", 4, 60, 140);
    scatter("war_totem", 2, 70, 110);

    // Braziers: two flanking the entrance gate, one deeper inside. Their world
    // positions light the camp at night (collectLights reads campLightPoints).
    const braziers: { x: number; y: number }[] = [
      { x: altar.x + Math.cos(GATE_FACING - GATE_HALF_ARC) * (WAR_CAMP_RADIUS - 10), y: altar.y + Math.sin(GATE_FACING - GATE_HALF_ARC) * (WAR_CAMP_RADIUS - 10) },
      { x: altar.x + Math.cos(GATE_FACING + GATE_HALF_ARC) * (WAR_CAMP_RADIUS - 10), y: altar.y + Math.sin(GATE_FACING + GATE_HALF_ARC) * (WAR_CAMP_RADIUS - 10) },
      { x: altar.x + Math.cos(GATE_FACING + Math.PI) * 90, y: altar.y + Math.sin(GATE_FACING + Math.PI) * 90 },
    ];
    for (const b of braziers) {
      const x = Phaser.Math.Clamp(b.x, 20, WORLD_W - 20);
      const y = Phaser.Math.Clamp(b.y, 20, WORLD_H - 20);
      prop(x, y, "camp_brazier");
      this.campLightPoints.push({ x, y });
    }

    // Breadcrumb trail: sparse bands starting just OUTSIDE the camp (pickSpawnPoint
    // already keeps trees/rocks/wild enemies clear out to WAR_CAMP_CLEAR_RADIUS=300,
    // so there's no clutter competing with the palisade/floor right at the wall) —
    // decoration increases as the player approaches. Enemy counts unchanged
    // (locked: prefer a bigger world over more enemies).
    const TRAIL_BANDS: { min: number; max: number; count: number }[] = [
      { min: 300, max: 550, count: 8 },
      { min: 550, max: 800, count: 6 },
      { min: 800, max: 1050, count: 4 },
    ];
    for (const band of TRAIL_BANDS) {
      for (let i = 0; i < band.count; i++) {
        const a = Phaser.Math.DegToRad(rng.angle());
        const r = rng.between(band.min, band.max);
        const x = Phaser.Math.Clamp(altar.x + Math.cos(a) * r, 20, WORLD_W - 20);
        const y = Phaser.Math.Clamp(altar.y + Math.sin(a) * r, 20, WORLD_H - 20);
        prop(x, y, "gremlin_camp_prop");
      }
    }
  }

  // Spawns a projectile and tracks it in the right physics group by source —
  // enemy-sourced (the ranged Gremlin's rock throw) vs. player-sourced
  // (Slingshot/Javelin).
  private spawnProjectile(cfg: ProjectileConfig): Projectile {
    const projectile = new Projectile(this, cfg);
    (cfg.sourceIsPlayer ? this.playerProjectiles : this.enemyProjectiles).add(projectile);
    projectile.launch(); // see Projectile.launch()'s comment — group.add() zeroes velocity
    return projectile;
  }

  // Each frame: find whichever node OR enemy the mouse is over (in world
  // space) — whichever is closest overall — and update the bottom-right
  // prompt + cursor. Only one of hoveredNode/hoveredEnemy is ever set.
  private updateHover(): void {
    const pointer = this.input.activePointer;
    const world = this.cameras.main.getWorldPoint(pointer.x, pointer.y);

    let hoveredNode: ResourceNode | null = null;
    let hoveredEnemy: Enemy | null = null;
    let hoveredRack: Phaser.GameObjects.Image | null = null;
    let hoveredShack: GremlinShack | null = null;
    let hoveredDen: BadlandsDen | null = null;
    let hoveredAltar: BossAltar | null = null;
    let hoveredWorkbench: Phaser.GameObjects.Image | null = null;
    let hoveredCampfire: Phaser.GameObjects.Image | null = null;
    let hoveredForge: Phaser.GameObjects.Image | null = null;
    let hoveredSmelter: Phaser.GameObjects.Image | null = null;
    let hoveredJewelry: Phaser.GameObjects.Image | null = null;
    let best = Infinity;

    for (const node of this.nodes) {
      if (node.depleted || node.harvested || node.shielded) continue;
      const radius = Math.max(node.displayWidth, node.displayHeight) / 2 + 6;
      const d = Phaser.Math.Distance.Between(world.x, world.y, node.x, node.y);
      if (d <= radius && d < best) {
        hoveredNode = node;
        hoveredEnemy = null;
        hoveredRack = null;
        hoveredShack = null;
        hoveredAltar = null;
        hoveredWorkbench = null;
        hoveredCampfire = null;
        hoveredForge = null;
        hoveredSmelter = null;
        best = d;
      }
    }
    for (const enemy of this.enemies) {
      if (enemy.depleted || !enemy.isTargetable()) continue;
      const radius = Math.max(enemy.displayWidth, enemy.displayHeight) / 2 + 6;
      const d = Phaser.Math.Distance.Between(world.x, world.y, enemy.x, enemy.y);
      if (d <= radius && d < best) {
        hoveredEnemy = enemy;
        hoveredNode = null;
        hoveredRack = null;
        hoveredShack = null;
        hoveredAltar = null;
        hoveredWorkbench = null;
        hoveredCampfire = null;
        hoveredForge = null;
        hoveredSmelter = null;
        best = d;
      }
    }
    for (const rack of this.dryingRacks) {
      const image = rack.image;
      const radius = Math.max(image.displayWidth, image.displayHeight) / 2 + 6;
      const d = Phaser.Math.Distance.Between(world.x, world.y, image.x, image.y);
      if (d <= radius && d < best) {
        hoveredRack = image;
        hoveredNode = null;
        hoveredEnemy = null;
        hoveredShack = null;
        hoveredAltar = null;
        hoveredWorkbench = null;
        hoveredCampfire = null;
        hoveredForge = null;
        hoveredSmelter = null;
        best = d;
      }
    }
    for (const shack of this.gremlinShacks) {
      const image = shack.chestImage;
      const radius = Math.max(image.displayWidth, image.displayHeight) / 2 + 6;
      const d = Phaser.Math.Distance.Between(world.x, world.y, image.x, image.y);
      if (d <= radius && d < best) {
        hoveredShack = shack;
        hoveredNode = null;
        hoveredEnemy = null;
        hoveredRack = null;
        hoveredAltar = null;
        hoveredWorkbench = null;
        hoveredCampfire = null;
        hoveredForge = null;
        hoveredSmelter = null;
        best = d;
      }
    }
    for (const altar of this.bossAltars) {
      const image = altar.image;
      const radius = Math.max(image.displayWidth, image.displayHeight) / 2 + 6;
      const d = Phaser.Math.Distance.Between(world.x, world.y, image.x, image.y);
      if (d <= radius && d < best) {
        hoveredAltar = altar;
        hoveredNode = null;
        hoveredEnemy = null;
        hoveredRack = null;
        hoveredShack = null;
        hoveredWorkbench = null;
        hoveredCampfire = null;
        hoveredForge = null;
        hoveredSmelter = null;
        best = d;
      }
    }
    // Workbench (crafting menu), Campfire (cooking menu) and Relic Forge (relic
    // menu) are all plain placedObjects, distinguished by itemKey — handled in
    // one loop since they share the same hover/reach/interact shape.
    for (const obj of this.placedObjects) {
      const key = obj.getData("itemKey");
      if (
        key !== "workbench" &&
        key !== "campfire" &&
        key !== "relic_forge" &&
        key !== "smelter" &&
        key !== "jewelry_station"
      )
        continue;
      const radius = Math.max(obj.displayWidth, obj.displayHeight) / 2 + 6;
      const d = Phaser.Math.Distance.Between(world.x, world.y, obj.x, obj.y);
      if (d <= radius && d < best) {
        hoveredWorkbench = key === "workbench" ? obj : null;
        hoveredCampfire = key === "campfire" ? obj : null;
        hoveredForge = key === "relic_forge" ? obj : null;
        hoveredSmelter = key === "smelter" ? obj : null;
        hoveredJewelry = key === "jewelry_station" ? obj : null;
        hoveredNode = null;
        hoveredEnemy = null;
        hoveredRack = null;
        hoveredShack = null;
        hoveredAltar = null;
        best = d;
      }
    }

    // Duskrunner Warren dens — interactable only once exposed (attackable) or
    // looted; during the wave fight the mound isn't a target. Runs last so it
    // respects `best`; wins by nulling the others.
    for (const den of this.badlandsDens) {
      if (den.phase !== "attackable" && den.phase !== "looted") continue;
      const image = den.target;
      const radius = Math.max(image.displayWidth, image.displayHeight) / 2 + 6;
      const d = Phaser.Math.Distance.Between(world.x, world.y, image.x, image.y);
      if (d <= radius && d < best) {
        hoveredDen = den;
        hoveredNode = null;
        hoveredEnemy = null;
        hoveredRack = null;
        hoveredShack = null;
        hoveredAltar = null;
        hoveredWorkbench = null;
        hoveredCampfire = null;
        hoveredForge = null;
        hoveredSmelter = null;
        hoveredJewelry = null;
        best = d;
      }
    }

    // Sunken Crypts (Phase 4c) — three targets sharing one loop: the surface
    // doorway, and (while inside) the exit stairs + the crypt's chest. Runs last
    // like the Warren so it respects `best` and wins by nulling the others.
    let hoveredCrypt: SunkenCrypt | null = null;
    let hoveredCryptExit: DungeonInterior | null = null;
    let hoveredCryptChest: SunkenCrypt | null = null;
    const takeCryptHover = (d: number) => {
      hoveredNode = null;
      hoveredEnemy = null;
      hoveredRack = null;
      hoveredShack = null;
      hoveredAltar = null;
      hoveredWorkbench = null;
      hoveredCampfire = null;
      hoveredForge = null;
      hoveredSmelter = null;
      hoveredJewelry = null;
      hoveredDen = null;
      best = d;
    };
    const hits = (img: Phaser.GameObjects.Image) => {
      const radius = Math.max(img.displayWidth, img.displayHeight) / 2 + 6;
      const d = Phaser.Math.Distance.Between(world.x, world.y, img.x, img.y);
      return d <= radius && d < best ? d : null;
    };
    if (this.activeDungeon) {
      const dungeon = this.activeDungeon;
      const crypt = dungeon instanceof SunkenCrypt ? dungeon : null;
      if (dungeon.exitStairs) {
        const d = hits(dungeon.exitStairs);
        if (d !== null) {
          hoveredCryptExit = dungeon;
          hoveredCrypt = null;
          hoveredCryptChest = null;
          takeCryptHover(d);
        }
      }
      if (crypt?.chestImage) {
        const d = hits(crypt.chestImage);
        if (d !== null) {
          hoveredCryptChest = crypt;
          hoveredCrypt = null;
          hoveredCryptExit = null;
          takeCryptHover(d);
        }
      }
    } else {
      for (const crypt of this.crypts) {
        const d = hits(crypt.image);
        if (d !== null) {
          hoveredCrypt = crypt;
          hoveredCryptExit = null;
          hoveredCryptChest = null;
          takeCryptHover(d);
        }
      }
    }
    this.hoveredCrypt = hoveredCrypt;
    this.hoveredCryptExit = hoveredCryptExit;
    this.hoveredCryptChest = hoveredCryptChest;

    // Bayou surface POIs (Phase 4d). Same last-runner treatment: they respect
    // `best` and win by nulling the others. Never reachable from inside a crypt.
    let hoveredShrine: SunkenShrine | null = null;
    let hoveredLodgeHut: { lodge: DrownedLodge; hut: DrownedLodge["huts"][number] } | null = null;
    let hoveredGorge: { lair: MiretyrantLair; maw: MiretyrantLair["maws"][number] } | null = null;
    if (!this.activeDungeon) {
      if (this.lair) {
        for (const maw of this.lair.maws) {
          const d = hits(maw.image);
          if (d !== null) {
            hoveredGorge = { lair: this.lair, maw };
            hoveredCrypt = null;
            takeCryptHover(d);
          }
        }
      }
      for (const shrine of this.shrines) {
        const d = hits(shrine.image);
        if (d !== null) {
          hoveredShrine = shrine;
          hoveredLodgeHut = null;
          hoveredCrypt = null;
          takeCryptHover(d);
        }
      }
      for (const lodge of this.lodges) {
        for (const hut of lodge.huts) {
          // A barred chieftain's hut isn't a target at all (see promptForLodgeHut).
          if (hut.chief && !lodge.chiefUnbarred) continue;
          const d = hits(hut.image);
          if (d !== null) {
            hoveredLodgeHut = { lodge, hut };
            hoveredShrine = null;
            hoveredCrypt = null;
            takeCryptHover(d);
          }
        }
      }
    }
    if (hoveredShrine || hoveredLodgeHut) hoveredGorge = null;
    if (hoveredShrine || hoveredLodgeHut || hoveredGorge) {
      this.hoveredCrypt = null;
      this.hoveredCryptExit = null;
      this.hoveredCryptChest = null;
    }
    this.hoveredShrine = hoveredShrine;
    this.hoveredLodgeHut = hoveredLodgeHut;
    this.hoveredGorge = hoveredGorge;

    this.hoveredNode = hoveredNode;
    this.hoveredEnemy = hoveredEnemy;
    this.hoveredRack = hoveredRack;
    this.hoveredShack = hoveredShack;
    this.hoveredDen = hoveredDen;
    this.hoveredAltar = hoveredAltar;
    this.hoveredWorkbench = hoveredWorkbench;
    this.hoveredCampfire = hoveredCampfire;
    this.hoveredForge = hoveredForge;
    this.hoveredSmelter = hoveredSmelter;
    this.hoveredJewelry = hoveredJewelry;

    // Station level labels are passive flavor, not part of the interact/
    // prompt system above — shown purely on hover, independent of the
    // hovered-node/enemy/rack "winner" (a label and a chop prompt can't
    // conflict since only stations with upgrades get a label at all).
    for (const [obj, label] of this.placedLabels) {
      const radius = Math.max(obj.displayWidth, obj.displayHeight) / 2 + 6;
      label.setVisible(Phaser.Math.Distance.Between(world.x, world.y, obj.x, obj.y) <= radius);
    }

    const prompt = hoveredNode
      ? this.promptFor(hoveredNode)
      : hoveredEnemy
        ? this.promptForEnemy(hoveredEnemy)
        : hoveredRack
          ? this.promptForRack(hoveredRack)
          : hoveredShack
            ? this.promptForShack(hoveredShack)
            : hoveredAltar
              ? this.promptForAltar(hoveredAltar)
              : hoveredWorkbench
                ? this.promptForWorkbench(hoveredWorkbench)
                : hoveredCampfire
                  ? this.promptForCampfire(hoveredCampfire)
                  : hoveredForge
                    ? this.promptForForge(hoveredForge)
                    : hoveredSmelter
                      ? this.promptForSmelter(hoveredSmelter)
                      : hoveredJewelry
                        ? this.promptForJewelry(hoveredJewelry)
                        : hoveredDen
                          ? this.promptForDen(hoveredDen)
                          : hoveredCrypt
                            ? this.promptForCrypt(hoveredCrypt)
                            : hoveredCryptExit
                              ? this.promptForCryptExit(hoveredCryptExit)
                              : hoveredCryptChest
                                ? this.promptForCryptChest(hoveredCryptChest)
                                : hoveredShrine
                                  ? this.promptForShrine(hoveredShrine)
                                  : hoveredLodgeHut
                                    ? this.promptForLodgeHut(hoveredLodgeHut.hut, hoveredLodgeHut.lodge)
                                    : hoveredGorge
                                      ? this.promptForGorge(hoveredGorge)
                                      : null;
    if (prompt) {
      this.promptText.setText(prompt).setColor(this.promptColorFor()).setVisible(true);
      this.input.setDefaultCursor("pointer");
    } else {
      this.promptText.setVisible(false);
      this.input.setDefaultCursor("default");
    }
    this.updateHoverHighlight(prompt);
  }

  // Outline whatever's hovered — gated on the identical prompt string the
  // bottom-right text uses, so a hidden-tool/out-of-reach hover shows no
  // highlight either, exactly like the text prompt.
  private updateHoverHighlight(prompt: string | null): void {
    this.hoverHighlight.clear();
    if (!prompt) return;
    const target =
      this.hoveredNode ??
      this.hoveredEnemy ??
      this.hoveredRack ??
      this.hoveredShack?.chestImage ??
      this.hoveredDen?.target ??
      this.hoveredCrypt?.image ??
      this.hoveredCryptExit?.exitStairs ??
      this.hoveredCryptChest?.chestImage ??
      this.hoveredShrine?.image ??
      this.hoveredLodgeHut?.hut.image ??
      this.hoveredGorge?.maw.image ??
      this.hoveredAltar?.image ??
      this.hoveredWorkbench ??
      this.hoveredCampfire ??
      this.hoveredForge ??
      this.hoveredJewelry ??
      null;
    if (!target) return;
    const radius = Math.max(target.displayWidth, target.displayHeight) / 2 + 4;
    this.hoverHighlight
      .setDepth(ysortDepth(target.y) + 0.5)
      .lineStyle(2, 0xffffff, 0.85)
      .strokeCircle(target.x, target.y, radius);
  }

  // The prompt string for a hovered node, or null if nothing should show.
  // - Out of reach: nothing.
  // - Pickups: always show (no tool needed).
  // - Chop/mine: show the verb ONLY when the matching tool KIND is equipped.
  //   We never reveal which tool/tier is required.
  private promptFor(node: ResourceNode): string | null {
    // Sealed (Gloaming Vein ore, Sunken Crypt vault geodes) — inert until its
    // guardian dies. updateHover() already skips shielded nodes so this is
    // belt-and-braces, but the crypt vault's whole material gate rests on it,
    // so the rule is stated here too rather than living in one loop's filter.
    if (node.shielded || node.harvested) return null;
    const inReach =
      Phaser.Math.Distance.Between(this.player.x, this.player.y, node.x, node.y) <= REACH;
    if (!inReach) return null;

    if (node.action === "pickup") {
      this.hints.trigger("pickup_reach"); // first reachable free pickup
      return `[LMB] Pick up ${node.displayName}`;
    }

    const kind = requiredKind(node.action);
    if (this.equippedTool && toolKind(this.equippedTool) === kind) {
      return node.action === "chop" ? "[LMB] Chop" : "[LMB] Mine";
    }
    return null; // no tool of the right kind out → show nothing
  }

  // Flat REACH was tuned around the roster's normal ~20-26px sprites (Boar,
  // Snake, Gremlin). A much larger enemy (the Gremlin King, scaled 2.4x) eats
  // almost all of that budget just reaching its own edge from its center,
  // leaving a razor-thin sliver of actual reach past the visible sprite —
  // reported as "impossible to hit despite being close." Scale reach up by
  // however much an enemy's visual radius exceeds that baseline, so bigger
  // enemies keep roughly the same "reach past the edge" feel as small ones.
  //
  // The radius is measured from the sprite's TUNED footprint, not its art. Real
  // creature art is authored larger than the placeholder it replaces, and
  // reading the live sprite would hand the player extra reach against the
  // entire common roster at once, purely as a side effect of the art pass —
  // while enemies' own melee ranges are flat constants that don't grow back.
  // Enemy's constructor pins the physics body to the same footprint, so the
  // collider gap and the reach threshold stay in step and combat feels exactly
  // as tuned; a creature simply looks bigger than it hits.
  private static readonly BASELINE_ENEMY_RADIUS = 13;
  private enemyReach(enemy: Enemy): number {
    const was = placeholderDims(enemy.artKey);
    const radius = was
      ? (Math.max(was.w, was.h) / 2) * enemy.artFootprintScale()
      : Math.max(enemy.displayWidth, enemy.displayHeight) / 2;
    return REACH + Math.max(0, radius - MainScene.BASELINE_ENEMY_RADIUS);
  }

  // A ranged weapon's fixed maxRangePx replaces melee's size-scaled
  // enemyReach() — ranged range is generous enough that an elite's bigger
  // hitbox doesn't need the same per-enemy scaling melee does.
  private attackRangeFor(enemy: Enemy): number {
    if (this.equippedWeapon) {
      const ranged = rangedWeaponConfig(this.equippedWeapon);
      if (ranged) return ranged.maxRangePx;
    }
    return this.enemyReach(enemy);
  }

  // Mirrors promptFor()'s gating rules: out of reach -> nothing; no weapon
  // equipped -> nothing (never reveal what's required); else the attack verb.
  private promptForEnemy(enemy: Enemy): string | null {
    const inReach =
      Phaser.Math.Distance.Between(this.player.x, this.player.y, enemy.x, enemy.y) <= this.attackRangeFor(enemy);
    if (!inReach) return null;
    if (!this.equippedWeapon) return null;
    // displayName already carries its own "Elite " prefix for elite variants
    // (set per-species, e.g. Snake.ts) — don't prepend a second one here
    // (was producing "Attack Elite Elite Snake").
    return `[LMB] Attack ${enemy.displayName}`;
  }

  // Prompt color for the currently hovered target: crimson for a boss/mini-boss
  // or an elite (a "this one's dangerous" tell), plain white otherwise.
  private promptColorFor(): string {
    const e = this.hoveredEnemy;
    if (!e) return "#ffffff";
    if (
      e instanceof GremlinKing ||
      e instanceof Gloamwarden ||
      e instanceof Cinderwrought ||
      e instanceof Duneshaper ||
      e instanceof Palewake ||
      e instanceof Kilnborn ||
      e instanceof Sanguinarch ||
      e instanceof Miretyrant
    )
      return "#ff5a5a";
    if (e.elite) return "#ff9d5c";
    return "#ffffff";
  }

  // A placed Drying Rack: prompt to open its processing menu when in reach.
  private promptForRack(image: Phaser.GameObjects.Image): string | null {
    const inReach =
      Phaser.Math.Distance.Between(this.player.x, this.player.y, image.x, image.y) <= REACH;
    return inReach ? "[LMB] Use Drying Rack" : null;
  }

  // A Gremlin Shack's chest: prompt to open it when in reach — no gating
  // (reach-only), same as the Drying Rack.
  private promptForShack(shack: GremlinShack): string | null {
    const inReach = Phaser.Math.Distance.Between(this.player.x, this.player.y, shack.x, shack.y) <= REACH;
    return inReach ? "[LMB] Open" : null;
  }

  // A Duskrunner Warren, once its guards are cleared:
  // - looted: reach-only prompt to open the exposed cache.
  // - attackable: the smash verb, but ONLY with a melee weapon equipped
  //   (ranged doesn't apply to a structure) — mirrors the enemy-attack gating
  //   of showing nothing without a weapon.
  private promptForDen(den: BadlandsDen): string | null {
    if (den.phase === "looted") {
      const inReach =
        Phaser.Math.Distance.Between(this.player.x, this.player.y, den.target.x, den.target.y) <= REACH;
      return inReach ? "[LMB] Search the remains" : null;
    }
    if (den.phase !== "attackable") return null;
    const inReach = Phaser.Math.Distance.Between(this.player.x, this.player.y, den.x, den.y) <= this.denReach(den);
    if (!inReach) return null;
    if (!this.equippedWeapon || isRangedWeapon(this.equippedWeapon)) return null;
    return "[LMB] Smash the warren";
  }

  // A Sunken Crypt doorway: reach-only, like every other "open this" POI. The
  // prompt names the crypt so the player knows which ability they're diving for
  // (the entrance runes + map marker already say it in color).
  private promptForCrypt(crypt: SunkenCrypt): string | null {
    const inReach = Phaser.Math.Distance.Between(this.player.x, this.player.y, crypt.x, crypt.y) <= REACH;
    return inReach ? `[LMB] Enter the ${crypt.def.name}` : null;
  }

  // The exit stairs inside a crypt. Deliberately a generous reach — nobody
  // should have to fight the camera to leave a dungeon.
  private promptForCryptExit(crypt: DungeonInterior): string | null {
    const stairs = crypt.exitStairs;
    if (!stairs) return null;
    const inReach =
      Phaser.Math.Distance.Between(this.player.x, this.player.y, stairs.x, stairs.y) <= CRYPT_EXIT_REACH;
    return inReach ? "[LMB] Climb back to the surface" : null;
  }

  private promptForCryptChest(crypt: SunkenCrypt): string | null {
    const chest = crypt.chestImage;
    if (!chest) return null;
    const inReach = Phaser.Math.Distance.Between(this.player.x, this.player.y, chest.x, chest.y) <= REACH;
    return inReach ? "[LMB] Open" : null;
  }

  // A placed Workbench: prompt to open the combined crafting menu when in
  // reach — no gating (reach-only), same as the Drying Rack/Shack.
  private promptForWorkbench(image: Phaser.GameObjects.Image): string | null {
    const inReach = Phaser.Math.Distance.Between(this.player.x, this.player.y, image.x, image.y) <= REACH;
    return inReach ? "[LMB] Craft" : null;
  }

  // A placed Campfire: prompt to open its cooking menu when in reach —
  // reach-only gating, same as the Drying Rack/Workbench.
  private promptForCampfire(image: Phaser.GameObjects.Image): string | null {
    const inReach = Phaser.Math.Distance.Between(this.player.x, this.player.y, image.x, image.y) <= REACH;
    return inReach ? "[LMB] Cook" : null;
  }

  // A placed Gemwright's Table: prompt to open its jewelry menu when in reach —
  // reach-only gating, same as the Campfire/Workbench.
  private promptForJewelry(image: Phaser.GameObjects.Image): string | null {
    const inReach = Phaser.Math.Distance.Between(this.player.x, this.player.y, image.x, image.y) <= REACH;
    return inReach ? "[LMB] Craft jewelry" : null;
  }

  private promptForForge(image: Phaser.GameObjects.Image): string | null {
    const inReach = Phaser.Math.Distance.Between(this.player.x, this.player.y, image.x, image.y) <= REACH;
    return inReach ? "[LMB] Use Relic Forge" : null;
  }

  private promptForSmelter(image: Phaser.GameObjects.Image): string | null {
    const inReach = Phaser.Math.Distance.Between(this.player.x, this.player.y, image.x, image.y) <= REACH;
    return inReach ? "[LMB] Use Smelter" : null;
  }

  // Mirrors the tool-kind gating philosophy exactly: no Gremlin Totem
  // selected in the hotbar -> show nothing, never reveal what's required
  // (same "no tool of the right kind -> show nothing" rule as promptFor()).
  // Also hides once the boss has already been summoned this session.
  // Unlike tool-gated resource nodes (which deliberately show nothing until
  // the right tool is equipped, so as not to reveal a requirement), the altar
  // always shows a prompt + hover highlight once in reach — it's a unique,
  // one-of-a-kind landmark, and playtesting found it read as non-interactive
  // scenery without SOME feedback. Whether the player is actually carrying a
  // totem only changes what the click does (see attemptSummonBoss), not
  // whether the altar looks interactable.
  private promptForAltar(altar: BossAltar): string | null {
    const inReach = Phaser.Math.Distance.Between(this.player.x, this.player.y, altar.x, altar.y) <= REACH;
    if (!inReach) return null;
    if (altar.kind === "tyrant") {
      // Any tyrant altar goes quiet once the Duneshaper has been summoned this
      // run (one boss/run, gated globally on tyrantSummoned, not per-altar).
      if (this.tyrantSummoned) return null;
      return "[LMB] Offer the Effigy";
    }
    if (altar.summoned) return null;
    return "[LMB] Call Their Leader";
  }

  // Left-click action on the currently hovered, in-reach node (or enemy/rack).
  private tryInteract(): void {
    if (this.hoveredEnemy) {
      this.tryAttackEnemy(this.hoveredEnemy);
      return;
    }
    if (this.hoveredRack) {
      const inReach =
        Phaser.Math.Distance.Between(
          this.player.x,
          this.player.y,
          this.hoveredRack.x,
          this.hoveredRack.y,
        ) <= REACH;
      if (inReach) this.openDryingRackMenu(this.hoveredRack);
      return;
    }
    if (this.hoveredShack) {
      const inReach =
        Phaser.Math.Distance.Between(this.player.x, this.player.y, this.hoveredShack.x, this.hoveredShack.y) <=
        REACH;
      if (inReach) this.openChestMenu(this.hoveredShack.loot, GREMLIN_SHACK_LOOT_TABLE);
      return;
    }
    if (this.hoveredDen) {
      const den = this.hoveredDen;
      if (den.phase === "looted") {
        const inReach = Phaser.Math.Distance.Between(this.player.x, this.player.y, den.target.x, den.target.y) <= REACH;
        if (inReach) this.openChestMenu(den.loot, DUSKRUNNER_WARREN_LOOT_TABLE);
      } else if (den.phase === "attackable") {
        this.tryAttackDen(den);
      }
      return;
    }
    if (this.hoveredCrypt) {
      if (this.promptForCrypt(this.hoveredCrypt)) this.enterCrypt(this.hoveredCrypt);
      return;
    }
    if (this.hoveredCryptExit) {
      if (this.promptForCryptExit(this.hoveredCryptExit)) this.exitCrypt();
      return;
    }
    if (this.hoveredCryptChest) {
      const crypt = this.hoveredCryptChest;
      if (this.promptForCryptChest(crypt)) this.openChestMenu(crypt.loot, CRYPT_LOOT_TABLE);
      return;
    }
    if (this.hoveredShrine) {
      const shrine = this.hoveredShrine;
      if (!this.promptForShrine(shrine)) return;
      if (shrine.phase === "dormant") this.kindleShrine(shrine);
      else this.openChestMenu(shrine.loot, SUNKEN_SHRINE_LOOT_TABLE);
      return;
    }
    if (this.hoveredLodgeHut) {
      const { lodge, hut } = this.hoveredLodgeHut;
      if (this.promptForLodgeHut(hut, lodge)) {
        this.openChestMenu(hut.loot, hut.chief ? LODGE_CHIEF_LOOT_TABLE : LODGE_HUT_LOOT_TABLE);
      }
      return;
    }
    if (this.hoveredGorge) {
      if (this.promptForGorge(this.hoveredGorge)) this.tryOpenGorge(this.hoveredGorge.lair);
      return;
    }
    if (this.hoveredAltar) {
      if (this.promptForAltar(this.hoveredAltar)) this.attemptSummonBoss(this.hoveredAltar);
      return;
    }
    if (this.hoveredWorkbench) {
      if (this.promptForWorkbench(this.hoveredWorkbench)) this.toggleCombinedMenu();
      return;
    }
    if (this.hoveredCampfire) {
      if (this.promptForCampfire(this.hoveredCampfire)) this.openCookingMenu(this.hoveredCampfire);
      return;
    }
    if (this.hoveredForge) {
      if (this.promptForForge(this.hoveredForge)) this.openRelicForgeMenu(this.hoveredForge);
      return;
    }
    if (this.hoveredJewelry) {
      if (this.promptForJewelry(this.hoveredJewelry)) this.openJewelryMenu(this.hoveredJewelry);
      return;
    }
    if (this.hoveredSmelter) {
      if (this.promptForSmelter(this.hoveredSmelter)) this.openSmelterMenu(this.hoveredSmelter);
      return;
    }
    // Holding (selected) a food item in the hotbar: a left-click on open ground
    // eats one, so food can be consumed straight from the hotbar. Skipped when
    // hovering a node (that click should still gather) — enemies/stations above
    // already returned.
    if (!this.hoveredNode) {
      const selIdx = this.hotbar.selected();
      const sel = this.hotbar.get(selIdx);
      if (sel && itemDef(sel.key)?.edible) {
        this.eatItem(this.hotbar.container, selIdx);
        return;
      }
    }
    const node = this.hoveredNode;
    if (!node || node.depleted || node.harvested) return;
    const inReach =
      Phaser.Math.Distance.Between(this.player.x, this.player.y, node.x, node.y) <= REACH;
    if (!inReach) return;

    if (node.action !== "pickup") {
      // Must have the matching tool KIND equipped to chop/mine.
      const kind = requiredKind(node.action);
      if (!this.equippedTool || toolKind(this.equippedTool) !== kind) {
        // Clicked a chop/mine node without the right tool KIND — nudge toward
        // tools (never reveals which tool, preserving the prompt-gating design).
        this.hints.trigger("tool_locked");
        return;
      }
      // Tool-TIER gate: the right KIND still shows "[LMB] Chop" (we never reveal
      // the tier), but a too-weak tool just bounces off. First used by the
      // badlands Ironbark tree, which needs an upgraded (tier 1) axe. Throttled
      // to the swing cooldown so spamming LMB doesn't flood the log or shake.
      if (node.minToolTier > this.equippedToolTier) {
        if (this.time.now - this.lastToolHitAt >= toolCooldownMs(this.equippedTool)) {
          this.lastToolHitAt = this.time.now;
          this.player.playSwing();
          node.takeHit(0); // shake/tint bounce, no damage — communicates "didn't work"
          const toolWord = kind === "axe" ? "axe" : "pickaxe";
          this.eventLog.add("info", `Your ${toolWord} isn't strong enough for this`);
        }
        return;
      }

      // Cap hit rate so holding/spamming LMB can't out-farm the tool's swing.
      const cooldownMs = toolCooldownMs(this.equippedTool);
      if (this.time.now - this.lastToolHitAt < cooldownMs) return;

      // Relic stamina-cost reduction (M-RL) applies to tool swings too, and the
      // Second Wind free-attack window (effectiveStaminaCostMult) covers tools.
      const staminaCost = Math.round(toolStaminaCost(this.equippedTool) * this.effectiveStaminaCostMult());
      if (!this.stamina.canAfford(staminaCost)) return; // exhausted — silent, same as the guards above

      this.lastToolHitAt = this.time.now;
      this.stamina.spend(staminaCost);

      this.player.playSwing();
      const depleted = node.takeHit(toolDamage(this.equippedTool));
      // Every swing grants gather-skill XP (not just the depleting one). `kind`
      // is already resolved above from requiredKind(node.action).
      this.awardSkillXp(kind === "axe" ? "chopping" : "mining", 30);
      if (!depleted) return; // node survives the hit; stays interactable

      this.spawnLooseDrop(node.resource, node.amount, node.x, node.y);
      // Chopping/Mining skill: rolled chance for a bonus +1 drop (M-SS). Routes
      // by tool kind (chop→chopping, mine→mining, incl. cracked Gloam ore).
      // Chopping/Mining skill chance + a Ring-of-the-Forager (B3-P2b) bonus.
      const bonusChance =
        (kind === "axe" ? choppingBonusChance(this.skills) : miningBonusChance(this.skills)) +
        this.equipEffects.gatherBonusChance();
      if (Math.random() < bonusChance) this.spawnLooseDrop(node.resource, 1, node.x, node.y);
      node.deplete();
      this.nodes = this.nodes.filter((n) => n !== node);
      this.hoveredNode = null;
      this.promptText.setVisible(false);
      this.refreshHud();
      return;
    }

    this.collectNode(node);
    if (node.persistent) {
      node.harvest();
    } else {
      node.deplete();
      this.nodes = this.nodes.filter((n) => n !== node);
    }
    this.hoveredNode = null;
    this.promptText.setVisible(false);
    this.refreshHud();
  }

  // Credit a picked-up loose node to the backpack, preserving a per-instance
  // tier (destroyed station) as stack metadata rather than merging by count.
  // Overflow falls back to dropping the same tier back on the floor. A
  // placeable (crafting station/processor) prefers the hotbar's dedicated
  // row 2 first — per the user, auto-pickup of a loose station should land
  // there by default instead of the backpack, so placing it again doesn't
  // require detouring through the inventory each time.
  private collectNode(node: ResourceNode): void {
    this.sfx.pickup();
    // Consumed on contact — never enters the backpack (see
    // collectGravemarkRubbing). Handled here, before every other branch, so it
    // can't be routed to a hotbar slot or bounce off a full backpack.
    if (node.resource === "gravemark_rubbing") {
      this.collectGravemarkRubbing();
      return;
    }
    if (itemDef(node.resource)?.placeable) {
      const row2Slot = this.hotbarRow2Assignable(node.resource);
      if (row2Slot !== null) {
        this.hotbar.container.set(row2Slot, { key: node.resource, count: node.amount, tier: node.tier, upgrades: node.upgrades });
        this.hotbarUI.refresh();
        this.discoverMaterial(node.resource);
        this.refreshDiscovery();
        return;
      }
    }
    if (node.tier !== undefined || node.upgrades !== undefined) {
      const stack: ItemStack = { key: node.resource, count: node.amount, tier: node.tier, upgrades: node.upgrades };
      if (!this.backpack.addStack(stack)) {
        this.spawnLooseDrop(node.resource, node.amount, node.x, node.y, DROPPED_ITEM_MAGNET_COOLDOWN_MS, node.tier, node.upgrades);
        return;
      }
      this.discoverMaterial(node.resource);
      this.refreshDiscovery();
      return;
    }
    this.addToBackpack(node.resource, node.amount);
  }

  // Left-click action on the currently hovered, in-reach enemy. Dispatches to
  // melee (instant, reach-gated) or ranged (fire-and-forget projectile,
  // range-gated) depending on the equipped weapon.
  private tryAttackEnemy(enemy: Enemy): void {
    if (enemy.depleted || !this.equippedWeapon) return;
    if (isRangedWeapon(this.equippedWeapon)) this.tryRangedAttack(enemy);
    else this.tryMeleeAttack(enemy);
  }

  // Melee: mirrors tryInteract()'s tool-swing guards (cooldown, stamina
  // afford, silent fail) and applies damage instantly at reach.
  private tryMeleeAttack(enemy: Enemy): void {
    if (!this.equippedWeapon) return;
    const inReach =
      Phaser.Math.Distance.Between(this.player.x, this.player.y, enemy.x, enemy.y) <= this.enemyReach(enemy);
    if (!inReach) return;

    const cooldownMs = weaponCooldownMs(this.equippedWeapon) * this.attackCooldownMult();
    if (this.time.now - this.lastWeaponHitAt < cooldownMs) return;

    // Damage type routes the on-hit skill XP. Weapon damage itself scales with
    // the weapon SKILL's own level (not player stat points) — see Skills.ts.
    // (Strength/Agility no longer discount stamina cost — retired in M-SS; only
    // relics do now.)
    const dmgType = weaponPrimaryDamageType(this.equippedWeapon);
    const staminaCost = Math.round(weaponStaminaCost(this.equippedWeapon) * this.effectiveStaminaCostMult());
    if (!this.stamina.canAfford(staminaCost)) return; // exhausted — silent, same as tool guard

    this.lastWeaponHitAt = this.time.now;
    this.stamina.spend(staminaCost);
    this.player.playSwing();
    this.player.playEquippedSwing();

    const baseDmg = this.equippedWeaponBaseDamage();
    // Kept fractional all the way to takeHit — a skill's +0.5%/level bonus
    // used to get thrown away by an early Math.round (e.g. Blunt 10 on a
    // base-5 weapon rounds right back to 5, so the bonus was invisible AND
    // had zero real effect). Only the floating combat-text number rounds for
    // display; the true float is what actually damages the enemy, so small
    // skill increments always matter even when the displayed number doesn't
    // visibly change hit-to-hit.
    // "Normal hit" = base × the always-on additive bucket (weapon skill + relic
    // damage). Crit and Onslaught are CONDITIONAL bonuses that ADD onto this
    // (2026-07-15 rework — they no longer multiply each other). Onslaught is
    // rolled ONCE per swing so the whole swing (primary + AOE secondaries) is
    // empowered together; crit is rolled per target. Stagger/resist stay their
    // own target-side multipliers.
    const normalHit = baseDmg * this.damageBonusMult(dmgType);
    const onsBonus = this.onslaughtBonus();

    // Primary hit.
    const critP = this.rollCrit(this.equippedWeapon);
    const primaryDmg =
      normalHit * (1 + onsBonus + (critP ? this.critBonus(this.equippedWeapon) : 0)) * this.staggerMultiplierFor(enemy);
    this.resolveWeaponHit(enemy, primaryDmg, dmgType, critP, true);

    // AOE arc sweep (Biome 2 Phase 1, locked decision 6): wide weapons also hit
    // other live enemies within `range` and within ±halfAngle of the swing
    // direction (player → primary target). Each secondary shares the swing's
    // Onslaught roll but rolls its own crit/stagger and flows through the same
    // resolveWeaponHit (own resist, kill/loot/XP). enemy may already be dead
    // here (a lethal primary), but the arc is keyed off the swing direction, not
    // the primary's live position.
    // A Widened Sweep augment stretches the arc's reach (not its angle - the
    // swing still only covers what is in front of you).
    const baseArc = weaponArc(this.equippedWeapon);
    const arc = {
      ...baseArc,
      range: baseArc.range * (1 + (this.equippedWeaponAugment.arcRangePct ?? 0) / 100),
    };
    if (arc.range > 0) {
      const swingAngle = Phaser.Math.Angle.Between(this.player.x, this.player.y, enemy.x, enemy.y);
      const halfAngle = Phaser.Math.DegToRad(arc.halfAngleDeg);
      for (const other of this.enemies) {
        if (other === enemy || other.depleted || !other.isTargetable()) continue;
        const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, other.x, other.y);
        if (d > arc.range + this.enemyRadiusBonus(other)) continue;
        const a = Phaser.Math.Angle.Between(this.player.x, this.player.y, other.x, other.y);
        if (Math.abs(Phaser.Math.Angle.Wrap(a - swingAngle)) > halfAngle) continue;
        const critS = this.rollCrit(this.equippedWeapon);
        const secDmg =
          normalHit *
          (1 + onsBonus + (critS ? this.critBonus(this.equippedWeapon) : 0)) *
          this.staggerMultiplierFor(other) *
          arc.falloff;
        this.resolveWeaponHit(other, secDmg, dmgType, critS, false, "Arc sweep");
      }
    }
  }

  // Poise-break punish multiplier for a staggerable boss/mini-boss, else 1.
  // Shared by the primary melee hit, arc secondaries, and ranged so the three
  // can't drift.
  // Whichever "big" boss (Gremlin King / Duneshaper / Miretyrant) is engaged, for
  // the fixed top-of-screen BossHealthUI. Takes priority over an engaged mini-boss
  // (see engagedMiniBoss, which now also feeds the big bar as of 2026-07-23).
  private engagedBigBoss(): BossBarTarget | null {
    for (const b of [this.gremlinKing, this.duneshaper, this.miretyrant]) {
      if (b && !b.depleted && b.isEngaged()) return b;
    }
    return null;
  }

  // Mini-bosses (Gloamwarden / Cinderwrought / the three crypt wardens) now ALSO
  // get the big top-of-screen HP bar while engaged (the user: "fire guy's health
  // bar is missing" — the floating world-space bar was too easy to lose). Adapted
  // to BossBarTarget in the scene (rather than editing five entity files): HP +
  // name come off base Enemy, `isEngaged` maps to isAggro(), and the poise strip
  // only shows for one that actually exposes a poise meter (Gloamwarden); the
  // others pass poiseMax 0 and render HP alone (BossHealthUI hides the empty
  // strip). Their bespoke second mechanic (heat/tether/blood-phase) still reads
  // from its own in-world tell.
  private engagedMiniBoss(): BossBarTarget | null {
    for (const e of this.enemies) {
      if (e.depleted || !e.isAggro()) continue;
      if (
        !(
          e instanceof Gloamwarden ||
          e instanceof Cinderwrought ||
          e instanceof Palewake ||
          e instanceof Kilnborn ||
          e instanceof Sanguinarch
        )
      )
        continue;
      const anyE = e as unknown as { poise?: number; poiseMax?: number };
      const hasPoise = typeof anyE.poise === "number" && typeof anyE.poiseMax === "number";
      return {
        displayName: e.displayName,
        health: e.health,
        maxHealth: e.maxHealth,
        poise: hasPoise ? anyE.poise! : 0,
        poiseMax: hasPoise ? anyE.poiseMax! : 0,
        depleted: e.depleted,
        isEngaged: () => e.isAggro(),
      };
    }
    return null;
  }

  // A boss/mini-boss the player has just engaged announces itself, once per
  // encounter: a name card, a camera kick and a sting.
  //
  // the user playtest: "minibosses need more character and should be more epic in
  // those fights." Each of the five already HAS a bespoke state machine — the
  // Palewake's tether, the Kilnborn's heat, the Sanguinarch's phase-follows-your-
  // bleed — but nothing announced that you'd walked into a named fight rather
  // than a big trash mob, so the mechanics never got read as special. This is
  // the cheapest thing that makes all of them land, and it applies to every
  // future boss for free.
  private announceBossEncounter(enemy: Enemy, subtitle: string): void {
    if (this.announcedBosses.has(enemy)) return;
    this.announcedBosses.add(enemy);

    const cam = this.cameras.main;
    const cx = this.scale.width / 2;
    const title = this.add
      .text(cx, this.scale.height * 0.34, enemy.displayName.toUpperCase(), {
        fontFamily: "monospace",
        fontSize: "40px",
        color: "#f0e0c0",
        stroke: "#000000",
        strokeThickness: 5,
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(2890)
      .setAlpha(0);
    const sub = this.add
      .text(cx, this.scale.height * 0.34 + 34, subtitle, {
        fontFamily: "monospace",
        fontSize: "15px",
        color: "#b8a888",
        stroke: "#000000",
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(2890)
      .setAlpha(0);

    for (const t of [title, sub]) {
      this.tweens.add({
        targets: t,
        alpha: 1,
        duration: 320,
        ease: "Quad.easeOut",
        onComplete: () => {
          this.tweens.add({
            targets: t,
            alpha: 0,
            delay: 1500,
            duration: 700,
            onComplete: () => t.destroy(),
          });
        },
      });
    }
    title.setScale(1.18);
    this.tweens.add({ targets: title, scale: 1, duration: 420, ease: "Back.easeOut" });
    cam.shake(320, 0.004);
    this.sfx.nightfall();
    this.eventLog.add("combat", `${enemy.displayName} stirs.`);
  }

  private staggerMultiplierFor(enemy: Enemy): number {
    if (enemy instanceof GremlinKing && enemy.isStaggered()) return STAGGER_DAMAGE_MULTIPLIER;
    if (enemy instanceof Gloamwarden && enemy.isStaggered()) return WARDEN_STAGGER_DAMAGE_MULTIPLIER;
    if (enemy instanceof Cinderwrought && enemy.isStaggered()) return CINDERWROUGHT_STAGGER_DAMAGE_MULTIPLIER;
    // Crypt wardens (Phase 4c): each has its OWN opening rather than a shared
    // poise bar — the Palewake's severed tether, the Kilnborn's post-backdraft
    // vent, the Sanguinarch's engorged phase — but all three funnel through the
    // same isStaggered() contract so the punish math stays in one place.
    if (enemy instanceof Palewake && enemy.isStaggered()) return PALEWAKE_UNRAVEL_DAMAGE_MULTIPLIER;
    if (enemy instanceof Kilnborn && enemy.isStaggered()) return KILNBORN_VENT_DAMAGE_MULTIPLIER;
    if (enemy instanceof Sanguinarch && enemy.isStaggered()) return SANGUINARCH_ENGORGED_DAMAGE_MULTIPLIER;
    if (enemy instanceof Duneshaper && enemy.isStaggered()) return DUNESHAPER_STAGGER_DAMAGE_MULTIPLIER;
    if (enemy instanceof Miretyrant && enemy.isStaggered()) return MIRETYRANT_STAGGER_DAMAGE_MULTIPLIER;
    return 1;
  }

  // Half the extra body-radius a larger (elite/boss) enemy adds past the
  // baseline — same term enemyReach() adds for the player's own reach, reused
  // so an AOE arc can still catch a big enemy at the cone's edge.
  private enemyRadiusBonus(enemy: Enemy): number {
    const radius = Math.max(enemy.displayWidth, enemy.displayHeight) / 2;
    return Math.max(0, radius - MainScene.BASELINE_ENEMY_RADIUS);
  }

  // Ranged: cooldown/stamina-gated fire-and-forget. Damage (including
  // any stagger multiplier) is computed once now — same "captured at
  // commit time" precedent GremlinKing's enrage math already uses — and
  // carried by the projectile, applied on impact via resolveWeaponHit rather
  // than re-checked mid-flight.
  private tryRangedAttack(enemy: Enemy): void {
    if (!this.equippedWeapon) return;
    const cfg = rangedWeaponConfig(this.equippedWeapon);
    if (!cfg) return;
    const inReach = Phaser.Math.Distance.Between(this.player.x, this.player.y, enemy.x, enemy.y) <= cfg.maxRangePx;
    if (!inReach) return;

    const cooldownMs = weaponCooldownMs(this.equippedWeapon) * this.attackCooldownMult();
    if (this.time.now - this.lastWeaponHitAt < cooldownMs) return;

    const dmgType = weaponPrimaryDamageType(this.equippedWeapon);
    const staminaCost = Math.round(weaponStaminaCost(this.equippedWeapon) * this.effectiveStaminaCostMult());
    if (!this.stamina.canAfford(staminaCost)) return; // exhausted — silent, same as melee's guard

    // Firing cost, in items. `"none"` (every launcher and bow) is free — see
    // RangedWeaponConfig.ammo for why consumable ammo was removed outright.
    if (cfg.ammo === "self") {
      // The Javelin IS the projectile: burn 1 from the equipped hotbar stack.
      const selectedIndex = this.hotbar.selected();
      const selStack = this.hotbar.container.slot(selectedIndex);
      if (!selStack || itemDef(selStack.key)?.weapon !== this.equippedWeapon) return;
      this.hotbar.container.removeCount(selStack.key, 1);
    }

    this.lastWeaponHitAt = this.time.now;
    this.rangedFireSlowUntil = this.time.now + RANGED_FIRE_SLOW_MS; // anti-kite: brief post-shot slow
    this.stamina.spend(staminaCost);
    this.player.playSwing();
    this.player.playEquippedSwing();

    const baseDmg = this.equippedWeaponBaseDamage();
    // Same additive model as melee: normal hit × (1 + Onslaught + crit), then
    // the target-side stagger multiplier. Crit is rolled at fire time (the
    // "captured at commit time" precedent) and carried by the projectile so the
    // impact tints correctly — resolveWeaponHit can't re-roll it (no weapon
    // context there).
    const normalHit = baseDmg * this.damageBonusMult(dmgType);
    const crit = this.rollCrit(this.equippedWeapon);
    const dmg =
      normalHit *
      (1 + this.onslaughtBonus() + (crit ? this.critBonus(this.equippedWeapon) : 0)) *
      this.staggerMultiplierFor(enemy);

    const angle = Phaser.Math.Angle.Between(this.player.x, this.player.y, enemy.x, enemy.y);
    this.spawnProjectile({
      x: this.player.x,
      y: this.player.y,
      angle,
      speed: cfg.projectileSpeed,
      damage: dmg,
      texture: cfg.projectileTexture,
      maxRangePx: cfg.maxRangePx,
      sourceIsPlayer: true,
      isCrit: crit,
      artAngleOffset: cfg.projectileArtAngleOffset,
    });

    // Refreshes hotbar/ammo-slot UI counts and — critically for Javelin —
    // recomputes equippedWeapon, clearing it the instant a depleted javelin
    // stack's slot goes empty (nothing else does that on a bare
    // removeCount() call outside moveSlot).
    this.afterItemMove();
  }

  // Applies weapon damage to `enemy` and runs the shared kill-resolution tail
  // (skill XP, floating damage number, kill loot/armor-XP/run-scoring) —
  // shared by melee (applied instantly) and ranged (applied on projectile
  // impact), so the two firing paths can't drift out of sync on kill logic.
  private resolveWeaponHit(
    enemy: Enemy,
    dmg: number,
    dmgType: DamageType,
    isCrit = false,
    // True only for the swing's PRIMARY target / a projectile's impact — the
    // one hit allowed to trigger the weapon's on-hit burst.
    isBurstSource = false,
    // Which slice of an attack produced this hit, for the end-of-run summary's
    // damage attribution (RunLog). Every AOE slice funnels through here, which
    // is exactly why the breakdown is worth having: a single swing can report
    // as five separate hits and the player has no way to see that ratio live.
    source: "Weapon (direct)" | "Arc sweep" | "Ranged" = "Weapon (direct)",
  ): void {
    // Waking on hit is handled by takeHit() itself — the base Enemy.takeHit()
    // flips idle->chasing for state-field enemies, and Boar/Snake/RangedGremlin/
    // MeleeGremling/Hexling each mirror that in their own takeHit() override
    // for their private `mode` field (a ranged weapon out-ranging an enemy's
    // own aggro radius was leaving it un-aggro'd despite being hit — playtest).
    // Per-swing lifesteal cap (D2): a fresh swing starts here. isBurstSource is
    // true exactly once per swing — the primary melee hit, or a ranged shot
    // (which never has secondaries, since every RANGED_WEAPONS arc is 0) — so
    // this resets the budget before that hit's own heals fire below, and the
    // arm step after them (see the end of this method) locks in what the
    // primary alone generated as the ceiling for any arc-sweep secondaries that
    // follow in the same swing.
    if (isBurstSource) {
      this.swingHealApplied = 0;
      this.swingHealCapArmed = false;
    }
    if (isCrit) this.sfx.crit();
    else this.sfx.hit();
    // Resist/weakness layer (Biome 2 Phase 1) — applied at the single choke point
    // both melee and ranged flow through, so it covers every attack and can't
    // drift. Neutral (×1) for every biome-1 enemy. The tint tells the player
    // whether this weapon type is effective here.
    const resistMult = enemy.resistMultiplier(dmgType);
    const finalDmg = dmg * resistMult;
    const effectiveness: DamageEffectiveness =
      resistMult > 1.001 ? "weak" : resistMult < 0.999 ? "resist" : "normal";
    // Bow-only ministagger removal (the user): a ranged hit suppresses the
    // position-shake in playHitFeedback for this one call; melee still shakes.
    if (source === "Ranged") enemy.suppressHitShake = true;
    const depleted = enemy.takeHit(finalDmg);
    this.runLog.recordDamageDealt(source, finalDmg);
    this.awardSkillXp(dmgType, 30); // weapon-hit XP to the primary damage type's skill
    this.spawnDamageNumber(enemy.x, enemy.y, Math.round(finalDmg), isCrit, effectiveness);
    // Blunt weapon identity (S7): a blunt hit cripples the target's movement.
    // Drives the same Enemy.applySlow/slowMult path the Executioner relic uses
    // (folded into envSpeedMult each frame), so no per-enemy wiring — it just
    // rides the aggressive-movement velocities. Refreshes on each hit; only
    // meaningful on a survivor (a corpse doesn't move). A subtle icy puff tells
    // the player the debuff landed (the enemy visibly slowing is the rest).
    if (!depleted && dmgType === "blunt") {
      enemy.applySlow(BLUNT_SLOW_FACTOR, BLUNT_SLOW_MS, this.time.now);
      this.spawnSlowTell(enemy);
    }
    // Leech relic (lifesteal): heal a % of the damage dealt (Mythic banks overheal
    // as a shield). Executioner relic (crit): a crit splashes to nearby enemies.
    this.applyLeech(finalDmg);
    // Bloodpact (R ability): a timed lifelink — heal a fraction of the damage
    // dealt while its active window lasts. Parallel to the Leech relic, its own
    // source; overheal at full HP is simply wasted (no shield bank).
    if (this.time.now < this.bloodpactUntil) {
      const amt = this.budgetedSwingHeal(Math.max(1, Math.round(finalDmg * this.bloodpactLifelink)));
      if (amt > 0) {
        this.health.heal(amt);
        this.runLog.recordHealing("Bloodpact", amt);
        this.refreshHealthBar();
      }
    }
    // Weapon lifelink (the Gloamdrinker): an ALWAYS-on drain that costs no relic
    // family slot and needs no ability window. Data-driven per weapon, and read
    // off the equipped weapon so it covers the melee swing + its arc sweep;
    // ranged weapons have no lifelink row today.
    const lifelink = this.equippedWeapon ? weaponLifelinkPct(this.equippedWeapon) : 0;
    if (lifelink > 0) {
      const amt = this.budgetedSwingHeal(Math.max(1, Math.round(finalDmg * lifelink)));
      if (amt > 0) {
        this.health.heal(amt);
        this.runLog.recordHealing("Weapon lifelink", amt);
        this.refreshHealthBar();
      }
    }
    // Arm the cap AFTER every lifesteal source has had its chance to fire on
    // the primary hit — swingHealApplied at this point is the primary's TOTAL
    // across Leech + Bloodpact + weapon lifelink combined (whichever are
    // active), which is what "the primary target's contribution" means when
    // more than one source is live at once.
    if (isBurstSource) {
      this.swingHealBudget = this.swingHealApplied * 1.5;
      this.swingHealCapArmed = true;
    }
    // Crit splash is melee-only: at range it turned a single-target bow into
    // free horde clear (60%-capped crit chance × 3x-capped crit mult already
    // deletes single targets; splash on top of that trivialized kiting).
    if (isCrit && source !== "Ranged") this.applyCritSplash(enemy, finalDmg, dmgType);
    // Magic's crowd answer (see WEAPON_ON_HIT_BURST). Fires from the PRIMARY hit
    // only — `isBurstSource` is false for the arc sweep, the burst's own victims
    // and the crit splash, so a detonation can never chain into another one.
    if (isBurstSource) this.applyWeaponBurst(enemy, finalDmg, dmgType);
    if (!depleted) return;
    this.resolveKill(enemy);
  }

  // Detonate the equipped weapon's on-hit burst around the struck enemy. Models
  // applyCritSplash exactly (same targetable/edge/resist/kill-tail handling) —
  // the only difference is what triggers it.
  private applyWeaponBurst(source: Enemy, primaryDmg: number, dmgType: DamageType): void {
    const burst = this.equippedWeapon ? weaponOnHitBurst(this.equippedWeapon) : undefined;
    if (!burst) return;
    const splash = primaryDmg * burst.damageFrac;
    for (const other of [...this.enemies]) {
      if (other === source || !other.active || other.depleted || !other.isTargetable()) continue;
      const edge = Math.max(other.displayWidth, other.displayHeight) / 2;
      if (Phaser.Math.Distance.Between(source.x, source.y, other.x, other.y) > burst.radius + edge) continue;
      const resistMult = other.resistMultiplier(dmgType);
      const dealt = splash * resistMult;
      const eff: DamageEffectiveness = resistMult > 1.001 ? "weak" : resistMult < 0.999 ? "resist" : "normal";
      const depleted = other.takeHit(dealt);
      this.spawnDamageNumber(other.x, other.y, Math.round(dealt), false, eff);
      if (depleted) this.resolveKill(other);
    }
    // The detonation itself — the same expanding additive flash the Emberblink
    // nova uses, tinted per weapon.
    const fx = this.add
      .image(source.x, source.y, "light_soft")
      .setTint(burst.tint)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(ysortDepth(source.y) + 1)
      .setScale(((burst.radius * 2) / 256) * 0.35)
      .setAlpha(0.85);
    this.tweens.add({
      targets: fx,
      scale: (burst.radius * 2) / 256,
      alpha: 0,
      duration: 240,
      ease: "Cubic.easeOut",
      onComplete: () => fx.destroy(),
    });
  }

  // A brief icy-blue puff at a blunt-slowed enemy — the subtle "cripple landed"
  // tell (S7). Deliberately one-shot rather than a persistent tint (which would
  // fight Enemy.applyHpTint / the wind-up tell); the enemy visibly moving slower
  // is the lasting feedback. Reuses the M-DN light_soft soft-gradient texture.
  private spawnSlowTell(enemy: Enemy): void {
    const fx = this.add
      .image(enemy.x, enemy.y, "light_soft")
      .setTint(0x8fd6ff)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(ysortDepth(enemy.y) + 1)
      .setScale(0.12)
      .setAlpha(0.7);
    this.tweens.add({
      targets: fx,
      scale: 0.22,
      alpha: 0,
      duration: 300,
      ease: "Cubic.easeOut",
      onComplete: () => fx.destroy(),
    });
  }

  // Fire damage dealt by an armor SET BONUS (Molten Bulwark thorns, Emberblink
  // nova) — NOT a weapon hit, so it grants no weapon-skill XP and doesn't play
  // the swing sfx, but it CAN kill and must run the same loot/scoring tail.
  // Fire honors the enemy's "fire" resist multiplier (S2 decision 3) — the
  // counterweight that makes fire situational: Sandmaw/Cragscale resist it,
  // Hexling is weak to it, everything else neutral. The damage number tints by
  // effectiveness so the player reads whether fire is landing here.
  private dealSetBonusDamage(enemy: Enemy, dmg: number): void {
    const resistMult = enemy.resistMultiplier("fire");
    const finalDmg = dmg * resistMult;
    const effectiveness: DamageEffectiveness =
      resistMult > 1.001 ? "weak" : resistMult < 0.999 ? "resist" : "normal";
    const depleted = enemy.takeHit(finalDmg);
    this.spawnDamageNumber(enemy.x, enemy.y, Math.round(finalDmg), false, effectiveness);
    if (depleted) this.resolveKill(enemy);
  }

  // Emberblink set bonus (Emberhide light set): a fire nova at the player's
  // landing point after a dash. Damages every live enemy within the burst
  // radius, then plays an expanding orange flash (reuses the M-DN light_soft
  // gradient texture, tinted). Snapshots the enemy list first since
  // dealSetBonusDamage mutates this.enemies on a kill.
  private emberblinkBurst(): void {
    if (this.isDead || this.isPaused || this.runOver) return;
    const cx = this.player.x;
    const cy = this.player.y;
    const mire = this.hasSet("mirehide");
    const r = mire ? SET_MIREBLINK_BURST_RADIUS : SET_EMBERBLINK_BURST_RADIUS;
    const burstDamage = mire ? SET_MIREBLINK_BURST_DAMAGE : SET_EMBERBLINK_BURST_DAMAGE;
    for (const enemy of [...this.enemies]) {
      // isTargetable gates the burrowed/stalking states (Sandmaw, Fenlurker,
      // Palewake). Every other damage sweep already honors it; this one didn't,
      // so the nova was hitting things that are underground (the user playtest).
      if (!enemy.active || enemy.depleted || !enemy.isTargetable()) continue;
      // Catch a big elite at its edge, not just its center (mirrors enemyReach's
      // sprite-radius term).
      const edge = Math.max(enemy.displayWidth, enemy.displayHeight) / 2;
      if (Phaser.Math.Distance.Between(cx, cy, enemy.x, enemy.y) <= r + edge) {
        this.dealSetBonusDamage(enemy, burstDamage);
      }
    }
    // Expanding fire flash. light_soft is a soft radial gradient (~256px) — scale
    // it so the bright core roughly matches the damage radius, then fade out.
    const fx = this.add
      .image(cx, cy, "light_soft")
      .setTint(0xff7a1e)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(ysortDepth(cy) + 1)
      .setScale((r * 2) / 256 * 0.4)
      .setAlpha(0.9);
    this.tweens.add({
      targets: fx,
      scale: (r * 2) / 256,
      alpha: 0,
      duration: 260,
      ease: "Cubic.easeOut",
      onComplete: () => fx.destroy(),
    });
  }

  // === B3-P2a: activated abilities (Q/E/R, cooldown-only, equipment-granted) ===

  // A special item in special1/special2/back grants its ability to the matching
  // key. Recomputed on every equipment change (afterItemMove) + on run reset.
  private recomputeAbilities(): void {
    const next: Partial<Record<AbilityKey, AbilityId>> = {};
    for (const slot of Object.keys(SLOT_ABILITY_KEY) as EquipSlot[]) {
      const key = SLOT_ABILITY_KEY[slot]!;
      const eq = this.equipment.get(slot);
      const def = eq ? itemDef(eq.key) : undefined;
      if (def?.grantsAbility) next[key] = def.grantsAbility;
    }
    this.abilityByKey = next;
  }

  // Live Q/E/R state for the ability bar (icon / cooldown sweep / active glow).
  private abilityEntries(): AbilityBarEntry[] {
    const now = this.time.now;
    const keys: AbilityKey[] = ["q", "e", "r"];
    return keys.map((key) => {
      const id = this.abilityByKey[key];
      const def = id ? ABILITY_DEFS[id] : undefined;
      // Which "until" field an active window reads is a property of the FAMILY,
      // not of the key it happens to be bound to (this used to assume R ==
      // Bloodpact, which stopped being true once Aegis shipped).
      const active = !!def?.activeMs && now < this.activeUntilFor(def.family);
      return {
        key,
        abilityId: id,
        texture: def?.icon,
        name: def?.name,
        desc: def?.description,
        cooldownMs: (def?.cooldownMs ?? 0) * this.equipEffects.abilityCooldownMult(),
        cooldownRemainingMs: def ? Math.max(0, this.abilityReadyAt[key] - now) : 0,
        active,
      };
    });
  }

  private createAbilityBar(): void {
    this.abilityBarUI = new AbilityBarUI(this);
    // Right of the hotbar (the passive bar owns the left), bottom-aligned to it.
    this.abilityBarUI.layout(this.hotbarUI.left + this.hotbarUI.width + 12, this.hotbarUI.bottom);
    this.abilityBarUI.update(this.abilityEntries());
  }

  // Fire the ability bound to `key` if one is equipped and off cooldown. Every
  // menu/pause/death guard lives here so the three keydown handlers stay thin.
  private tryCastAbility(key: AbilityKey): void {
    if (this.isDead || this.isPaused || this.runOver || this.anyMenuOpen()) return;
    const id = this.abilityByKey[key];
    if (!id) return; // nothing equipped in that slot
    if (this.time.now < this.abilityReadyAt[key]) return; // still on cooldown
    const def = ABILITY_DEFS[id];
    this.castAbility(id);
    // Ring of Quickening (B3-P2b) shortens the cooldown; the HUD sweep reads the
    // same reduced value in abilityEntries().
    this.abilityReadyAt[key] =
      this.time.now +
      def.cooldownMs * this.equipEffects.abilityCooldownMult() * this.progression.abilityCooldownMult();
  }

  // Dispatch on the FAMILY, never the id — that's what lets a lesser and a
  // full variant of one effect coexist as pure data (Abilities.ts). `power`
  // scales every magnitude the effect reads, alongside (not instead of) the
  // jewelry abilityPowerMult() hook.
  private castAbility(id: AbilityId): void {
    const def = ABILITY_DEFS[id];
    const power = def.power * this.equipEffects.abilityPowerMult();
    switch (def.family) {
      case "blink":
        this.castBlink(power);
        break;
      case "nova":
        this.castNova(power);
        break;
      case "lifelink":
        this.castBloodpact(power, def.activeMs ?? 0);
        break;
      case "gravebind":
        this.castGravebind(power);
        break;
      case "lance":
        this.castSpiritLance(power);
        break;
      case "aegis":
        this.castAegis(power, def.activeMs ?? 0);
        break;
      case "snare":
        this.castMireSnare(power);
        break;
      case "haste":
        this.castBloodrush(power, def.activeMs ?? 0);
        break;
    }
  }

  // How long the given family's active window runs, for the HUD's active glow.
  // Families with no window return 0 (always in the past).
  private activeUntilFor(family: AbilityFamily): number {
    switch (family) {
      case "lifelink":
        return this.bloodpactUntil;
      case "aegis":
        return this.aegisUntil;
      case "haste":
        return this.hasteUntil;
      default:
        return 0;
    }
  }

  // Where the player is aiming: the pointer if it's meaningfully away from the
  // player, else the facing direction. Shared by every aimed ability.
  private aimAngle(): number {
    const pointer = this.input.activePointer;
    const world = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
    return Phaser.Math.Distance.Between(this.player.x, this.player.y, world.x, world.y) >= 8
      ? Phaser.Math.Angle.Between(this.player.x, this.player.y, world.x, world.y)
      : this.facingAngle();
  }

  // Q — Gloamstep Blink: teleport toward the aim point (mouse, else facing) and
  // grant a brief untouchable window. Reuses the dash i-frame field + world clamp.
  private castBlink(power: number): void {
    const fromX = this.player.x;
    const fromY = this.player.y;
    const ang = this.aimAngle();
    // Amulet of Channeling (B3-P2b) extends the blink reach; `power` also
    // carries the lesser variant's shorter hop.
    const dist = ABILITY_BLINK_DISTANCE * power;
    // Underground the blink is CLIPPED to floor rather than disabled (the user
    // asked whether to forbid it outright — but the gems that grant it are crypt
    // loot, so a dungeon is the last place it should stop working). It walks the
    // blink line and stops at the last point still on walkable floor, so it can
    // cross a room or a doorway but never lands you inside rock or outside the
    // crypt entirely. Above ground it's unchanged.
    const dest = this.clipBlinkToFloor(fromX, fromY, ang, dist);
    this.player.setPosition(dest.x, dest.y);
    this.clampPlayerToWorld();
    this.invulnerableUntil = Math.max(this.invulnerableUntil, this.time.now + ABILITY_BLINK_IFRAME_MS * power);
    this.spawnBlinkFx(fromX, fromY, this.player.x, this.player.y);
    this.sfx.pickup();
  }

  // A violet gloam poof at both the blink origin and the destination.
  private spawnBlinkFx(x0: number, y0: number, x1: number, y1: number): void {
    for (const [x, y] of [
      [x0, y0],
      [x1, y1],
    ] as const) {
      const fx = this.add
        .image(x, y, "light_soft")
        .setTint(0x9a5cff)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(ysortDepth(y1) + 1)
        .setScale(0.14)
        .setAlpha(0.8);
      this.tweens.add({ targets: fx, scale: 0.32, alpha: 0, duration: 240, ease: "Cubic.easeOut", onComplete: () => fx.destroy() });
    }
  }

  // E — Gloam Nova: a radial gloam burst around the player. Damages (magic) and
  // shoves every live enemy in range, plus a brief slow. Snapshots the enemy list
  // first since dealAbilityDamage mutates this.enemies on a kill (emberblink idiom).
  private castNova(power: number): void {
    const cx = this.player.x;
    const cy = this.player.y;
    // Amulet of Channeling (B3-P2b) scales both the burst radius and its damage;
    // `power` also carries the lesser variant's smaller, weaker pop.
    const r = ABILITY_NOVA_RADIUS * power;
    for (const enemy of [...this.enemies]) {
      // Untargetable = burrowed/stalking (Sandmaw, Fenlurker, Palewake). An AoE
      // must respect that for the same reason a click does: it isn't there yet.
      if (!enemy.active || enemy.depleted || !enemy.isTargetable()) continue;
      const edge = Math.max(enemy.displayWidth, enemy.displayHeight) / 2;
      if (Phaser.Math.Distance.Between(cx, cy, enemy.x, enemy.y) > r + edge) continue;
      this.dealAbilityDamage(enemy, ABILITY_NOVA_DAMAGE * power, "magic");
      if (!enemy.active) continue; // killed by the burst
      // Shove outward + a short disorienting slow. No per-enemy stun state exists,
      // so the pop-back + slow IS the "knockback".
      const ang = Phaser.Math.Angle.Between(cx, cy, enemy.x, enemy.y);
      enemy.setPosition(enemy.x + Math.cos(ang) * ABILITY_NOVA_KNOCKBACK, enemy.y + Math.sin(ang) * ABILITY_NOVA_KNOCKBACK);
      enemy.applySlow(0.5, 500, this.time.now);
    }
    const fx = this.add
      .image(cx, cy, "light_soft")
      .setTint(0x9a5cff)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(ysortDepth(cy) + 1)
      .setScale(((r * 2) / 256) * 0.4)
      .setAlpha(0.9);
    this.tweens.add({ targets: fx, scale: (r * 2) / 256, alpha: 0, duration: 280, ease: "Cubic.easeOut", onComplete: () => fx.destroy() });
    this.sfx.hit();
  }

  // Ability AoE damage — mirrors dealSetBonusDamage but honors the given damage
  // type's resist (gloam nova = "magic") and runs the shared kill tail.
  private dealAbilityDamage(enemy: Enemy, dmg: number, dmgType: DamageType): void {
    const resistMult = enemy.resistMultiplier(dmgType);
    const finalDmg = dmg * resistMult;
    const effectiveness: DamageEffectiveness = resistMult > 1.001 ? "weak" : resistMult < 0.999 ? "resist" : "normal";
    const depleted = enemy.takeHit(finalDmg);
    this.spawnDamageNumber(enemy.x, enemy.y, Math.round(finalDmg), false, effectiveness);
    if (depleted) this.resolveKill(enemy);
  }

  // R — Bloodpact: open a timed lifelink window (resolveWeaponHit heals during
  // it). A brief red pulse is the cast cue; the bar's R slot glows for the window.
  // `power` scales BOTH the window length and the siphon fraction, so the lesser
  // pact is shorter and thinner rather than just one or the other.
  private castBloodpact(power: number, activeMs: number): void {
    this.bloodpactUntil = this.time.now + activeMs * power;
    this.bloodpactLifelink = ABILITY_BLOODPACT_LIFELINK_PCT * power;
    this.player.setTint(0xff5a6a);
    this.time.delayedCall(280, () => this.player.clearTint());
    this.sfx.upgrade();
  }

  // Q (found-only) — Gravebind: drag everything nearby INTO your reach and leave
  // it staggering. Deals no damage; it sets the table for a wide-arc weapon or a
  // follow-up nova. Structurally castNova's loop with the shove inverted.
  private castGravebind(power: number): void {
    const cx = this.player.x;
    const cy = this.player.y;
    const r = ABILITY_GRAVEBIND_RADIUS * power;
    for (const enemy of [...this.enemies]) {
      if (!enemy.active || enemy.depleted) continue;
      const d = Phaser.Math.Distance.Between(cx, cy, enemy.x, enemy.y);
      if (d > r) continue;
      // Pull inward to the hold ring, never past the player (a yank that
      // overshoots reads as a shove and can drop an enemy behind you).
      const pulled = Math.max(ABILITY_GRAVEBIND_HOLD_RADIUS, d - ABILITY_GRAVEBIND_PULL * power);
      const ang = Phaser.Math.Angle.Between(cx, cy, enemy.x, enemy.y);
      enemy.setPosition(cx + Math.cos(ang) * pulled, cy + Math.sin(ang) * pulled);
      // Break whatever it was in the middle of. Without this the yank moved a
      // charging/winding-up enemy but left its attack committed, so it simply
      // finished the swing from its new spot and connected anyway — the ability
      // looked like it had done nothing (the user: "gravebind seems to kinda not
      // work sometimes"). Its next attack now starts from the top, telegraph and
      // all, which is the whole souls-like contract and what "staggering"
      // promised. Velocity has to be zeroed alongside it: Arcade bodies have no
      // drag, so a mid-pounce enemy would otherwise keep coasting straight back
      // out of the pull (the same defect B4-P6 fixed at the AI cull).
      enemy.resetAttackState(this.time.now);
      (enemy.body as Phaser.Physics.Arcade.Body | undefined)?.setVelocity(0, 0);
      enemy.applySlow(ABILITY_GRAVEBIND_SLOW, ABILITY_GRAVEBIND_SLOW_MS, this.time.now);
    }
    const fx = this.add
      .image(cx, cy, "light_soft")
      .setTint(0x5c4a8a)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(ysortDepth(cy) + 1)
      .setScale((r * 2) / 256)
      .setAlpha(0.75);
    // Collapses inward — the visual reads as a pull, the inverse of nova's bloom.
    this.tweens.add({ targets: fx, scale: 0.1, alpha: 0, duration: 320, ease: "Cubic.easeIn", onComplete: () => fx.destroy() });
    this.sfx.hit();
  }

  // E (found-only) — Spirit Lance: a line nuke along the aim. Every enemy within
  // LANCE_HALF_W of the segment takes magic damage through the shared
  // dealAbilityDamage helper, so resists + the damage-number tint come free.
  private castSpiritLance(power: number): void {
    const x0 = this.player.x;
    const y0 = this.player.y;
    const ang = this.aimAngle();
    const len = ABILITY_LANCE_RANGE * power;
    const x1 = x0 + Math.cos(ang) * len;
    const y1 = y0 + Math.sin(ang) * len;
    for (const enemy of [...this.enemies]) {
      if (!enemy.active) continue;
      const edge = Math.max(enemy.displayWidth, enemy.displayHeight) / 2;
      if (this.distToSegment(enemy.x, enemy.y, x0, y0, x1, y1) > ABILITY_LANCE_HALF_W + edge) continue;
      this.dealAbilityDamage(enemy, ABILITY_LANCE_DAMAGE * power, "magic");
    }
    this.spawnLanceFx(x0, y0, x1, y1);
    this.sfx.hit();
  }

  // Shortest distance from a point to the segment (x0,y0)-(x1,y1). Only new
  // geometry this milestone needs — every other ability is radial.
  private distToSegment(px: number, py: number, x0: number, y0: number, x1: number, y1: number): number {
    const dx = x1 - x0;
    const dy = y1 - y0;
    const lenSq = dx * dx + dy * dy;
    // Degenerate segment (zero-length aim) — fall back to point distance.
    const t = lenSq === 0 ? 0 : Phaser.Math.Clamp(((px - x0) * dx + (py - y0) * dy) / lenSq, 0, 1);
    return Phaser.Math.Distance.Between(px, py, x0 + t * dx, y0 + t * dy);
  }

  // A pale beam laid along the lance, fading in place.
  private spawnLanceFx(x0: number, y0: number, x1: number, y1: number): void {
    const g = this.add.graphics().setDepth(ysortDepth(y0) + 1).setBlendMode(Phaser.BlendModes.ADD);
    g.lineStyle(ABILITY_LANCE_HALF_W * 2, 0xd8c8ff, 0.55).lineBetween(x0, y0, x1, y1);
    g.lineStyle(6, 0xffffff, 0.9).lineBetween(x0, y0, x1, y1);
    this.tweens.add({ targets: g, alpha: 0, duration: 260, ease: "Cubic.easeOut", onComplete: () => g.destroy() });
  }

  // R (found-only) — Drowned Aegis: open a timed damage-reduction window. The
  // reduction itself is read in applyDamageToPlayer, where it ADDS into the same
  // bucket relic/Molten-Bulwark reduction uses — so it lands under the shared
  // 0.75 cap and can never be stacked into immunity.
  private castAegis(power: number, activeMs: number): void {
    this.aegisUntil = this.time.now + activeMs * power;
    this.aegisReduction = ABILITY_AEGIS_REDUCTION * power;
    const fx = this.add
      .image(this.player.x, this.player.y, "light_soft")
      .setTint(0x6ad4ff)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(ysortDepth(this.player.y) + 1)
      .setScale(0.1)
      .setAlpha(0.85);
    this.tweens.add({ targets: fx, scale: 0.42, alpha: 0, duration: 380, ease: "Cubic.easeOut", onComplete: () => fx.destroy() });
    this.sfx.upgrade();
  }

  // Q/E/R — Mire Snare: root everything nearby in place. Structurally
  // castGravebind's loop with the PULL removed: nothing is repositioned, so it
  // reads as the ground grabbing them rather than you dragging them.
  //
  // Deliberately does NOT reset attack state (Gravebind does): a rooted enemy
  // finishing its swing is the counterplay — root, then step out of reach.
  private castMireSnare(power: number): void {
    const cx = this.player.x;
    const cy = this.player.y;
    const r = ABILITY_SNARE_RADIUS * power;
    let caught = 0;
    for (const enemy of [...this.enemies]) {
      if (!enemy.active || enemy.depleted) continue;
      if (Phaser.Math.Distance.Between(cx, cy, enemy.x, enemy.y) > r) continue;
      // A hard 0 move multiplier — applySlow already keeps the STRONGER slow,
      // so this can't be weakened by an overlapping Gravebind.
      enemy.applySlow(0, ABILITY_SNARE_MS * power, this.time.now);
      (enemy.body as Phaser.Physics.Arcade.Body | undefined)?.setVelocity(0, 0);
      caught++;
    }
    const fx = this.add
      .image(cx, cy, "light_soft")
      .setTint(0x4f7a4a)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(ysortDepth(cy) + 1)
      .setScale(0.1)
      .setAlpha(0.8);
    // Blooms outward and holds briefly — the inverse of Gravebind's collapse.
    this.tweens.add({
      targets: fx,
      scale: (r * 2) / 256,
      alpha: 0,
      duration: 460,
      ease: "Cubic.easeOut",
      onComplete: () => fx.destroy(),
    });
    this.sfx.hit();
    if (caught > 0) this.eventLog.add("combat", `Mire Snare roots ${caught}`);
  }

  // Q/E/R — Bloodrush: a timed attack-speed window. The multiplier is read at
  // the single attackCooldownMult() choke point, so it covers melee, ranged and
  // the den-smash path with no per-path wiring.
  private castBloodrush(power: number, activeMs: number): void {
    this.hasteUntil = this.time.now + activeMs * power;
    // Stronger power shortens the cooldown further, floored so it can never
    // reach zero (an instant-attack loop).
    this.hasteMult = Math.max(0.35, 1 - (1 - ABILITY_HASTE_MULT) * power);
    const fx = this.add
      .image(this.player.x, this.player.y, "light_soft")
      .setTint(0xff5a4a)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(ysortDepth(this.player.y) + 1)
      .setScale(0.08)
      .setAlpha(0.85);
    this.tweens.add({ targets: fx, scale: 0.36, alpha: 0, duration: 340, ease: "Cubic.easeOut", onComplete: () => fx.destroy() });
    this.sfx.upgrade();
  }

  // C2: spawn a dead Mosswretch's fragments. Placed in a tight ring around the
  // corpse (not on the player) so a kill doesn't teleport a swarm onto you.
  // Registered exactly like any other enemy — and if the parent was somehow a
  // dungeon dweller, the fragments inherit that too (a Mosswretch is a surface
  // creature today, so this is defensive rather than a live path).
  // Long enough that a fast weapon's next swing can't also be the one that kills
  // them, short enough that it never feels like they're ignoring hits.
  private static readonly MOSSLING_SPAWN_INVULN = 500;

  private spawnMosslings(parent: Mosswretch): void {
    const count = parent.deathSpawnCount();
    if (count <= 0) return;
    const inDungeon = this.cryptEnemies.has(parent);
    for (let i = 0; i < count; i++) {
      const ang = (i / count) * Math.PI * 2 + Math.random() * 0.5;
      const d = 26 + Math.random() * 14;
      const x = parent.x + Math.cos(ang) * d;
      const y = parent.y + Math.sin(ang) * d;
      const m = new Mosswretch(this, { x, y, spawnling: true });
      if (inDungeon && this.activeDungeon) {
        this.addDungeonEnemy(this.activeDungeon, m);
      } else {
        this.enemies.push(m);
        this.enemyGroup.add(m);
      }
      // Come out already angry: a fragment that has to be re-aggroed defeats the
      // "swarmed the moment you relax" point.
      m.forceAggro(this.time.now);
      // ...but let them exist for a beat first. They spawn inside the arc the
      // player is mid-swing on, so crit + AOE splash used to delete them on
      // frame one and the split was invisible. Damage-only immunity — they're
      // already closing while it runs — plus a fade-in so the window reads.
      m.spawnInvulnUntil = this.time.now + MainScene.MOSSLING_SPAWN_INVULN;
      m.setAlpha(0.35);
      this.tweens.add({ targets: m, alpha: 1, duration: MainScene.MOSSLING_SPAWN_INVULN, ease: "Sine.easeOut" });
    }
  }

  // Weapon-cooldown multiplier. 1 normally; Bloodrush's window scales it down.
  // Every attack path (melee, ranged, den smash) multiplies its weapon cooldown
  // by this, so a new attack path gets the haste for free.
  private attackCooldownMult(): number {
    // The run character's own attack-speed term multiplies in here rather than at
    // the three attack sites, so melee/arc/ranged all inherit it (>1 = slower).
    const haste = this.time.now < this.hasteUntil ? this.hasteMult : 1;
    return haste * this.character.attackSpeedMult();
  }

  // Aim fallback when the pointer is basically on the player: the facing dir.
  private facingAngle(): number {
    switch (this.player.getFacing()) {
      case "up":
        return -Math.PI / 2;
      case "down":
        return Math.PI / 2;
      case "left":
        return Math.PI;
      default:
        return 0; // right
    }
  }

  // The shared kill-resolution tail — relic on-kill heal, per-worn-piece armor
  // XP, loot drop + death feedback, POI/boss hooks, and run/score tracking.
  // Extracted so both a weapon hit and set-bonus fire damage converge on ONE
  // kill path (they can't drift on loot/scoring).
  private resolveKill(enemy: Enemy): void {
    // Kill: relic on-kill heal (M-RL), then armor-skill XP per WORN PIECE (M-SS
    // — changed from per-distinct-type, so a mix-and-match loadout is rewarded
    // per piece and heavy_armor accrues once biome-2 heavy gear exists).
    this.runLog.recordKill(enemy.displayName);
    const killHeal = this.relics.killHeal();
    if (killHeal > 0) {
      this.health.heal(killHeal);
      this.runLog.recordHealing("On-kill relic heal", killHeal);
      this.refreshHealthBar();
    }
    // The Reaver's Bloodthirst rides the SAME on-kill moment, but recorded under
    // its own label so the end-of-run healing breakdown can tell the class edge
    // apart from a relic the player also happens to be carrying.
    const charKillHeal = this.character.killHealBonus();
    if (charKillHeal > 0) {
      this.health.heal(charKillHeal);
      this.runLog.recordHealing(`${this.character.modifierName()} kill heal`, charKillHeal);
      this.refreshHealthBar();
    }
    // On-kill relic procs: Fleetfoot move burst, Second Wind stamina, Prodigy streak.
    this.applyOnKillRelicProcs();
    for (const armorType of armorTypesWornPerPiece(EQUIP_SLOTS.map((s) => this.equipment.get(s.id)))) {
      this.awardSkillXp(armorType, 30);
    }

    const dropX = enemy.x;
    const dropY = enemy.y;
    const loot = enemy.rollLoot();
    // The Ascetic's Hunted pays out here: elites are twice as common for it AND
    // worth twice as much, which is what turns "the world sends its worst" from
    // a pure tax into the roster's greed card. Elites only — trash is unchanged,
    // so the bonus tracks the risk the modifier actually adds.
    const lootMult = enemy.elite ? this.character.eliteLootMult() : 1;
    enemy.playDeathFeedback(() => {
      for (const drop of loot) {
        this.spawnLooseDrop(drop.resource, Math.round(drop.amount * lootMult), dropX, dropY);
      }
    });
    this.enemies = this.enemies.filter((e) => e !== enemy);
    // C2: a Mosswretch comes apart into smaller husks on death (the creature
    // ASKS via deathSpawnCount; the scene spawns, so the spawnlings get terrain
    // collision / dungeon nav / containment for free, same split as the
    // Miretyrant's bellow). A spawnling reports 0, so this never chains.
    if (enemy instanceof Mosswretch) this.spawnMosslings(enemy);
    if (enemy instanceof Blighttoad) this.spawnDeathBloom(dropX, dropY, enemy.elite);
    this.onShackGuardKilled(enemy);
    this.onDenGuardKilled(enemy);
    if (enemy instanceof Gloamwarden) this.onGloamwardenKilled();
    if (enemy instanceof Cinderwrought) this.onCinderwroughtKilled(enemy);
    if (enemy instanceof Palewake || enemy instanceof Kilnborn || enemy instanceof Sanguinarch)
      this.onCryptWardenKilled(enemy);
    this.eventLog.add("combat", `Defeated ${enemy.displayName}`);
    this.hoveredEnemy = null;
    this.promptText.setVisible(false);

    // Run/score tracking. Killing the FINAL boss (the Miretyrant, at the bottom
    // of the Sunken Gorge) wins the run — end it after a short beat so the death
    // feedback plays first. Biome 3 demoted the Duneshaper the same way biome 2
    // demoted the Gremlin King: both are still "boss" scores, and the
    // Duneshaper's Heart is finally obtainable now that killing it doesn't end
    // the run (it gates the Gemwright's Table's ability-jewelry tier).
    const killCategory = this.classifyKill(enemy);
    this.run.recordKill(killCategory);
    // Timeline is boss kills ONLY (the user, after trying miniboss/relic/biome
    // too: "the only milestones I care about are the boss ones"). isMiniboss()
    // stays as the shared classifyKill helper even though nothing else reads it
    // right now.
    if (killCategory === "boss") {
      this.runLog.recordMilestone(this.run.elapsedMs, `Defeated ${enemy.displayName}`);
    }
    if (enemy instanceof Miretyrant) {
      this.time.delayedCall(1200, () => this.endRun("won"));
    }
  }

  // Single entry point for granting skill XP, so the relic +% skill XP bonus
  // (M-RL) AND Intelligence's +% XP (M-SS) apply uniformly to every source
  // (weapon hits, kills, tool swings, running) without repeating the multiplier
  // at each call site. The two stack additively-then-multiplied here; the
  // Player-XP feed downstream reads skill level-ups, so there's no double-count.
  private awardSkillXp(skill: SkillType, base: number): void {
    // Additive XP bucket (2026-07-15): relic +%, Intelligence +%, and the Prodigy
    // kill-streak +% ADD instead of compounding.
    const bonus =
      this.relics.xpMult() -
      1 +
      (this.progression.xpMult() - 1) +
      (this.xpStreakMult() - 1) +
      (this.character.xpMult() - 1);
    // The run character's PER-SKILL affinity (B4-P3) multiplies OUTSIDE that
    // bucket on purpose. The bucket is the "global +% XP" category; folding a
    // class's x0.75 weakness in as -25 would let a couple of relics erase its
    // defining downside entirely. A per-skill class scalar is its own category,
    // so it composes with the bucket instead of competing with it.
    this.skills.addXp(skill, base * this.character.skillXpMult(skill) * (1 + bonus));
  }

  // Total crit CHANCE for `weapon` (capped) — weapon base + Agility + relics.
  private critChanceTotal(weapon: WeaponType): number {
    return Math.min(
      CRIT_CHANCE_CAP,
      weaponBaseCritChance(weapon) +
        this.progression.critChanceBonus() +
        this.relics.critChanceBonus() +
        (this.equippedWeaponAugment.critChancePct ?? 0) / 100,
    );
  }
  // Total crit MULTIPLIER for `weapon` (capped) — weapon base + Strength + relics.
  private critMultTotal(weapon: WeaponType): number {
    return Math.min(
      CRIT_MULT_CAP,
      weaponBaseCritMult(weapon) +
        this.progression.critMultBonus() +
        this.relics.critDamageBonus() +
        (this.equippedWeaponAugment.critMultBonus ?? 0),
    );
  }
  // Roll whether one hit of `weapon` crits (M-SS). Uses Math.random — combat crit
  // isn't seeded. Shared by melee (rolled at hit) and ranged (rolled at fire).
  private rollCrit(weapon: WeaponType): boolean {
    return Math.random() < this.critChanceTotal(weapon);
  }
  // Crit's ADDITIVE contribution to the conditional-damage bucket. As of the
  // 2026-07-15 rework, crit is a bonus that ADDS with Onslaught on the normal
  // hit rather than multiplying it — so a crit + Onslaught landing on the same
  // swing no longer explodes (was crit×onslaught, now crit+onslaught).
  private critBonus(weapon: WeaponType): number {
    return this.critMultTotal(weapon) - 1;
  }

  // --- Additive-within-category buckets + relic unique procs (2026-07-15) ---

  // Additive damage bucket: the two always-on % sources (weapon skill + relic)
  // ADD into one multiplier instead of compounding. Crit/Onslaught are the
  // conditional bonuses that ADD onto this (see conditionalDamageBonus); stagger
  // + resist stay their own target-side multipliers. Future always-on % sources
  // add here.
  private damageBonusMult(dmgType: DamageType): number {
    return (
      1 +
      (weaponSkillDamageMultiplier(dmgType, this.skills) - 1) +
      (this.relics.damageMult() - 1) +
      (this.character.damageDealtMult() - 1)
    );
  }

  // Onslaught (damage relic): count each attack; every Nth adds a FLAT bonus to
  // the conditional-damage bucket. 2026-07-15: +100% = "double the normal hit,"
  // ADDITIVE with crit and NO power-tier amplification (a predictable spike, not
  // a runaway one). Returns the bonus fraction (0 on most hits). Call ONCE per
  // swing — the whole swing (primary + AOE-arc secondaries) shares one roll.
  private onslaughtBonus(): number {
    const u = this.relics.unique("onslaught");
    if (!u) return 0;
    this.onslaughtHits += 1;
    if (this.onslaughtHits % u.params.interval !== 0) return 0;
    return u.params.bonusPct / 100;
  }

  // Second Wind (stamina Mythic) free-attack window folds into the weapon/tool
  // stamina-cost multiplier as a 0. Every weapon/tool cost site reads this.
  private effectiveStaminaCostMult(): number {
    if (this.time.now < this.freeAttackUntil) return 0;
    // A Swift Grip augment on the equipped weapon discounts its own swings (and
    // a tool swing harmlessly - a tool cannot carry augments, so its factor is 1).
    const aug = 1 - (this.equippedWeaponAugment.staminaCostPct ?? 0) / 100;
    return this.relics.staminaCostMult() * this.character.staminaCostMult() * Math.max(0, aug);
  }

  // The equipped weapon's flat damage before any multiplier: base + right-click
  // tier bonus + a Gloam Edge augment. One helper so the melee, ranged, and
  // inventory Combat-column readouts cannot drift.
  private equippedWeaponBaseDamage(): number {
    if (!this.equippedWeapon) return 0;
    return (
      weaponDamage(this.equippedWeapon) +
      weaponTierDamageBonus(this.equippedWeapon, this.equippedWeaponTier) +
      (this.equippedWeaponAugment.damageBonus ?? 0)
    );
  }

  // Fleetfoot (move relic) on-kill move-speed burst, as a fraction added into the
  // move bucket (0.25 = +25%).
  private killMoveBurstBonus(): number {
    return this.time.now < this.killMoveBurstUntil ? this.killMoveBurstPct : 0;
  }

  // Prodigy (xp relic) kill-streak XP multiplier, additive into the XP bucket.
  // Decays to 1 once the streak window lapses (checked live so stale streaks
  // don't buff a later weapon-hit's XP).
  private xpStreakMult(): number {
    const u = this.relics.unique("xpstreak");
    if (!u || this.time.now - this.lastKillAt > u.params.windowMs) return 1;
    const bonus = Math.min(u.params.maxPct, this.killStreak * u.params.perKillPct) * powerTierMult(u.powerTier);
    return 1 + bonus / 100;
  }

  // On-kill relic procs (Fleetfoot burst, Second Wind stamina, Prodigy streak) —
  // called once per kill from resolveKill().
  private applyOnKillRelicProcs(): void {
    const now = this.time.now;
    const fr = this.relics.unique("killrush");
    if (fr) {
      this.killMoveBurstUntil = now + fr.params.ms;
      this.killMoveBurstPct = (fr.params.movePct / 100) * powerTierMult(fr.powerTier);
      if (fr.params.dashRefund) this.player.resetDashCooldown();
    }
    const sw = this.relics.unique("secondwind");
    if (sw) {
      this.stamina.restore((sw.params.restorePct / 100) * powerTierMult(sw.powerTier) * this.stamina.max);
      this.refreshStaminaBar();
      if (sw.params.freeMs) this.freeAttackUntil = now + sw.params.freeMs;
    }
    const xs = this.relics.unique("xpstreak");
    if (xs) {
      this.killStreak = now - this.lastKillAt <= xs.params.windowMs ? this.killStreak + 1 : 1;
      this.lastKillAt = now;
    }
  }

  // Leech (lifesteal relic): heal a % of damage dealt; the Mythic banks overheal
  // as a shield (up to a cap). Called from resolveWeaponHit with the dealt damage.
  private applyLeech(finalDmg: number): void {
    const u = this.relics.unique("leech");
    if (!u || finalDmg <= 0) return;
    const rawHeal = finalDmg * (u.params.healPct / 100) * powerTierMult(u.powerTier);
    // Budgeted BEFORE the shield-banking step below, not just before
    // health.heal() — capping only the HP portion and letting Mythic's
    // overheal-to-shield run on the uncapped amount would just move the same
    // AOE-scaling bug from HP into the shield instead of fixing it.
    const heal = this.budgetedSwingHeal(rawHeal);
    if (heal <= 0) return;
    const before = this.health.value();
    this.health.heal(heal);
    const applied = this.health.value() - before;
    this.runLog.recordHealing("Leech relic", applied);
    this.refreshHealthBar();
    if (u.params.shieldPct) {
      const overheal = Math.max(0, heal - applied);
      if (overheal > 0) {
        const cap = this.health.max * (u.params.shieldPct / 100) * powerTierMult(u.powerTier);
        this.playerShield = Math.min(cap, this.playerShield + overheal);
        this.refreshHealthBar();
      }
    }
  }

  // Every per-hit lifesteal source (Leech relic, Bloodpact, weapon lifelink)
  // routes its desired heal through here instead of calling this.health.heal()
  // directly, so the D2 per-swing cap applies uniformly no matter which
  // source — or how many at once — is healing. See swingHealBudget's field
  // comment and resolveWeaponHit's reset/arm points for the full mechanism.
  //
  // The primary hit (before the cap is armed) always heals in full: its total
  // across every active source IS what defines the cap, so clamping it against
  // itself would be circular. Everything after arming is clamped to whatever
  // room remains under swingHealBudget.
  private budgetedSwingHeal(desired: number): number {
    if (desired <= 0) return 0;
    if (!this.swingHealCapArmed) {
      this.swingHealApplied += desired;
      return desired;
    }
    const room = Math.max(0, this.swingHealBudget - this.swingHealApplied);
    const allowed = Math.min(desired, room);
    this.swingHealApplied += allowed;
    return allowed;
  }

  // Executioner (crit relic): a crit splashes a % of its damage to nearby enemies
  // (Mythic also slows them). Deals damage directly (NOT via resolveWeaponHit — no
  // recursion / no re-crit / no double weapon-XP), same pattern as the set-bonus
  // bursts. Also slows the primary target when the relic has a slow.
  private applyCritSplash(source: Enemy, primaryDmg: number, dmgType: DamageType): void {
    const u = this.relics.unique("critsplash");
    if (!u) return;
    const now = this.time.now;
    const slowFactor = u.params.slowPct ? 1 - (u.params.slowPct / 100) * powerTierMult(u.powerTier) : 1;
    if (u.params.slowMs && slowFactor < 1 && source.active) source.applySlow(slowFactor, u.params.slowMs, now);
    const splash = primaryDmg * (u.params.splashPct / 100) * powerTierMult(u.powerTier);
    for (const other of [...this.enemies]) {
      if (other === source || !other.active || other.depleted || !other.isTargetable()) continue;
      const edge = Math.max(other.displayWidth, other.displayHeight) / 2;
      if (Phaser.Math.Distance.Between(source.x, source.y, other.x, other.y) > u.params.radius + edge) continue;
      const resistMult = other.resistMultiplier(dmgType);
      const dealt = splash * resistMult;
      const eff: DamageEffectiveness = resistMult > 1.001 ? "weak" : resistMult < 0.999 ? "resist" : "normal";
      const depleted = other.takeHit(dealt);
      this.spawnDamageNumber(other.x, other.y, Math.round(dealt), false, eff);
      if (u.params.slowMs && slowFactor < 1) other.applySlow(slowFactor, u.params.slowMs, now);
      if (depleted) this.resolveKill(other);
    }
  }

  // Undying (vitality Mythic): survive one fatal hit per run, healing to
  // revivePct% of max HP. Returns true if the death was prevented. Shared by the
  // main and bleed-DoT death paths.
  private tryUndyingRevive(): boolean {
    const u = this.relics.unique("undying");
    if (!u || !u.params.revivePct || this.reviveUsed) return false;
    this.reviveUsed = true;
    const healTo = Math.max(1, Math.round(this.health.max * (u.params.revivePct / 100) * powerTierMult(u.powerTier)));
    this.health.reset(); // refill to max, then trim to the revive amount (avoids healMult)
    this.health.takeDamage(this.health.max - healTo);
    this.bleed.clear();
    this.poison.clear();
    this.playerShield = 0;
    this.invulnerableUntil = this.time.now + this.POST_RESPAWN_INVULN_MS;
    this.refreshHealthBar();
    this.spawnFeedbackText(this.player.x, this.player.y, "Undying!");
    return true;
  }

  // Kill category for run scoring: the final boss, an elite variant, or a plain
  // enemy. Kept here (not on Enemy) since it's a scoring concern, not behavior.
  // The 5 mini-bosses — no dedicated score band exists for them (they score at
  // the elite tier, per the plan's "simplest" open sub-decision), but they ARE
  // a run's real turning points and belong on the end-of-run timeline the same
  // way a true boss does. Shared by classifyKill and the milestone hook below
  // so the list can't drift between the two.
  private isMiniboss(enemy: Enemy): boolean {
    return (
      enemy instanceof Gloamwarden ||
      enemy instanceof Cinderwrought ||
      enemy instanceof Palewake ||
      enemy instanceof Kilnborn ||
      enemy instanceof Sanguinarch
    );
  }

  private classifyKill(enemy: Enemy): KillCategory {
    if (enemy instanceof GremlinKing || enemy instanceof Duneshaper || enemy instanceof Miretyrant) return "boss";
    if (this.isMiniboss(enemy) || enemy.elite) return "elite";
    return "normal";
  }

  // Floating combat-text on a successful hit. Effectiveness is encoded purely by
  // COLOR, no text label (the user): neutral = white, RESISTED = greyed out, WEAK =
  // gold. A crit reads by its "!" + larger size + a hot-orange tint (distinct from
  // weak's gold), and takes color precedence — it's the rarer, more important
  // signal.
  private spawnDamageNumber(
    x: number,
    y: number,
    amount: number,
    isCrit = false,
    effectiveness: DamageEffectiveness = "normal",
  ): void {
    const color = isCrit
      ? "#ff8c1a" // crit — hot orange, distinct from weak's gold
      : effectiveness === "weak"
        ? "#ffd24a" // weak — gold
        : effectiveness === "resist"
          ? "#8a8f99" // resisted — greyed out
          : "#ffffff"; // neutral — white
    const text = this.add
      .text(x, y - 14, isCrit ? `${amount}!` : `${amount}`, {
        fontFamily: "monospace",
        fontSize: isCrit ? "22px" : "16px",
        color,
        stroke: "#000000",
        strokeThickness: isCrit ? 4 : 3,
      })
      .setOrigin(0.5, 0.5)
      .setAlpha(effectiveness === "resist" && !isCrit ? 0.85 : 1) // resisted reads a touch dimmer
      .setDepth(50);
    this.tweens.add({
      targets: text,
      y: y - 38,
      alpha: 0,
      duration: 700,
      ease: "Cubic.easeOut",
      onComplete: () => text.destroy(),
    });
  }

  // Floating damage number over the player when hit, tinted by the incoming
  // damage type so elemental hits read clearly (the user: "fire damage should be
  // clear"): fire = orange, magic = violet, physical = red. Drawn just above the
  // player's head, rising and fading like the enemy-hit numbers.
  private spawnPlayerDamageNumber(amount: number, dmgType?: IncomingDamageType): void {
    const color =
      dmgType === "fire"
        ? "#ff8a2a"
        : dmgType === "poison"
          ? "#8fd94a" // sickly green — poison reads distinctly from its magic parent
          : dmgType === "magic"
            ? "#c48aff"
            : "#ff5a5a";
    const text = this.add
      .text(this.player.x, this.player.y - 26, `-${amount}`, {
        fontFamily: "monospace",
        fontSize: "15px",
        fontStyle: "bold",
        color,
        stroke: "#000000",
        strokeThickness: 3,
      })
      .setOrigin(0.5, 0.5)
      .setDepth(50);
    this.tweens.add({
      targets: text,
      y: text.y - 22,
      alpha: 0,
      duration: 750,
      ease: "Cubic.easeOut",
      onComplete: () => text.destroy(),
    });
  }

  // Small rising/fading callout at the player — an explicit deviation from
  // the standing "never reveal what's missing" silent-guard convention,
  // used only where a player specifically asked for feedback (e.g. firing a
  // ranged weapon with no ammo loaded — the guard used to be a silent no-op
  // and playtesters couldn't tell why nothing happened).
  private spawnFeedbackText(x: number, y: number, text: string, color = "#ff9d5c"): void {
    const t = this.add
      .text(x, y - 20, text, {
        fontFamily: "monospace",
        fontSize: "13px",
        color,
        stroke: "#000000",
        strokeThickness: 3,
      })
      .setOrigin(0.5, 0.5)
      .setDepth(50);
    this.tweens.add({
      targets: t,
      y: t.y - 22,
      alpha: 0,
      duration: 800,
      ease: "Cubic.easeOut",
      onComplete: () => t.destroy(),
    });
  }

  // Runs every frame: ticks each enemy's AI/movement and applies any bite
  // that lands to the player's Health.
  private updateEnemies(delta: number): void {
    const now = this.time.now;
    // Slight enemy speed bump at night (M-DN) — assigned each frame so
    // night-spawned enemies pick it up too. The GremlinKing's overridden
    // update() ignores envSpeedMult, so the boss is exempt with no branch here.
    const envSpeedMult = this.dayNight.enemySpeedMultiplier();
    const px = this.player.x;
    const py = this.player.y;
    for (const enemy of this.enemies) {
      // ACTIVITY CULL. Every enemy in the world used to run its full AI every
      // frame — the forest, badlands and bayou rosters, every POI guard, and
      // every dweller in every prebuilt dungeon interior, well over a thousand
      // of them, most of them tens of thousands of pixels away and idle. That
      // is the frame-rate regression (the user: "overall performance feels
      // worse"), and it gets worse with every POI added.
      //
      // Safe because nothing an enemy does at this distance is observable: it
      // can't see the player (the largest leash on the roster is far inside
      // this radius), can't be seen (~1536px of camera), and can't be hit. All
      // give-up/attack timers are absolute (`now`-based), not accumulators, so
      // nothing drifts while an enemy sits out frames. A culled enemy simply
      // resumes when the player comes back into range.
      // HARD INVARIANT: nothing that wasn't placed underground may BE
      // underground. the user found forest gremlins wandering around inside the
      // crypts — the CRYPT_REALM pocket sits in the dead corner of the world
      // SQUARE, so it is inside `collideWorldBounds` even though it is outside
      // the world circle the player is clamped to, and a creature drifting far
      // enough would simply arrive there. The coasting bug above was how they
      // got the ~14000px to make that trip, but the geometry that ALLOWS it is
      // permanent, so this stays as the guard rather than relying on movement
      // never going wrong again. Snapping home (not just nudging) is right: an
      // enemy this far off the map has no meaningful local position.
      if (!this.cryptEnemies.has(enemy) && insideUndergroundRealm(enemy.x, enemy.y)) {
        enemy.setPosition(enemy.homeX, enemy.homeY);
        (enemy.body as Phaser.Physics.Arcade.Body | undefined)?.reset(enemy.homeX, enemy.homeY);
        continue;
      }
      const dx = enemy.x - px;
      const dy = enemy.y - py;
      if (dx * dx + dy * dy > ENEMY_ACTIVE_RADIUS_SQ) {
        // Stop it dead on the way out. Arcade velocity persists with no drag, so
        // an enemy culled mid-chase (or mid-pounce, at 330px/s) kept coasting in
        // a straight line for as long as the player stayed away — which is how
        // Warren guards ended up thousands of px from their den (leaving the POI
        // permanently stuck on wave 1) and how badlands Duskrunners drifted all
        // the way into the starting forest.
        const body = enemy.body as Phaser.Physics.Arcade.Body | null;
        if (body && (body.velocity.x !== 0 || body.velocity.y !== 0)) body.setVelocity(0, 0);
        continue;
      }
      // Fold any temporary slow (Executioner crit relic) into the same envSpeedMult
      // path every aggressive-movement velocity already reads — no per-subclass wiring.
      // ALSO fold in the terrain move-mult (bayou water, thornfield bramble): the
      // PLAYER wades at 50% in deep water but enemies used to ignore it entirely, so
      // in the swamp you literally could not out-walk anything (the #1 "can't run
      // away in the bayou" complaint). Applying the same slow restores relative
      // speed — and the player's dash is terrain-exempt, so a dash still escapes.
      // Only runs for already-active (near-player) enemies, so the per-enemy
      // environment lookup cost is bounded. GremlinKing/bosses that override
      // update() and ignore envSpeedMult stay exempt with no branch here.
      // `ignoresTerrainSlow` (C1) exempts a creature that's at home in the
      // terrain — the Mirejaw in bayou water. Only the TERRAIN term is skipped:
      // night speed and the Executioner slow still apply, so it isn't a blanket
      // immunity.
      const terrainMult = enemy.ignoresTerrainSlow ? 1 : this.environmentEffectAt(enemy.x, enemy.y).moveMult;
      enemy.envSpeedMult = envSpeedMult * enemy.slowMult(now) * terrainMult;
      // The Sanguinarch's whole phase machine runs on whether the PLAYER is
      // bleeding, which update()'s (delta, x, y, now) signature can't express —
      // so the scene pushes it, the same way envSpeedMult is pushed above.
      if (enemy instanceof Sanguinarch) enemy.playerBleeding = this.bleed.isBleeding();
      // Name card the first time any named fight actually starts. Driven off the
      // same isAggro() every enemy already reports, so a new boss needs only a
      // row in BOSS_SUBTITLES.
      const subtitle = BOSS_SUBTITLES[enemy.displayName];
      if (subtitle !== undefined && enemy.isAggro()) this.announceBossEncounter(enemy, subtitle);
      const bit = enemy.update(delta, this.player.x, this.player.y, now);
      // C2: a Mosswretch that just resolved a spore burst hands the scene a
      // ground position; spawn the lingering hazard there (same "creature asks,
      // scene places" split the Miretyrant's mire pools use).
      if (enemy instanceof Mosswretch) {
        const cloud = enemy.consumeSporeCloud();
        if (cloud) this.spawnSporeCloud(cloud.x, cloud.y, now);
      }
      // Dungeon navigation (Phase 4c): re-aim whatever movement the AI just
      // decided on down the corridor toward the player, so the whole roster
      // pathfinds through a crypt unmodified. Applied AFTER update() on purpose
      // — an earlier attempt fed the enemy a fake doorway TARGET instead, and
      // every enemy with reach then thought it had arrived and stood swinging at
      // air (a Mosswretch's ~100px reach froze it 710px away for 600 frames).
      // Steering only redirects existing velocity: the AI still sees the real
      // player for every range/attack/give-up decision.
      this.steerCryptEnemy(enemy);
      this.steerEnemyHome(enemy);
      if (bit) {
        // Most melee hits carry no knockback; a telegraphed attack that opts
        // into one (ranged Gremlin shove, Boar charge gore) sets it on the
        // frame it connects. Reuses applyDamageToPlayer's existing knockback path.
        const kb = enemy.pendingAttackKnockback;
        this.applyDamageToPlayer(
          enemy.biteDamage,
          kb > 0 ? { fromX: enemy.x, fromY: enemy.y, speed: kb } : undefined,
          undefined,
          enemy.pendingBleed ?? undefined,
          enemy.pendingPoison ?? undefined,
          enemy.displayName,
        );
        enemy.pendingBleed = null; // consumed this frame
        enemy.pendingPoison = null;
        // Molten Bulwark (Embersteel heavy set): a melee attacker that lands a
        // hit is seared. Only the contact-bite path (this branch) procs it —
        // ranged projectiles never touch the plate. Note dealSetBonusDamage may
        // remove this enemy from this.enemies on a kill; for...of holds the old
        // array reference (filter returns a new one), so the loop stays safe.
        const thorns = this.hasSet("gloamsteel")
          ? SET_GLOAM_THORNS_FIRE_DAMAGE
          : this.hasSet("embersteel")
            ? SET_THORNS_FIRE_DAMAGE
            : 0;
        if (thorns > 0) this.dealSetBonusDamage(enemy, thorns);
      }
      // Area-damage attacks (boss slams, the Hexling's flame strike) deal AoE,
      // not a single-point bite — queried separately since they need richer info
      // (knockback, magic dmgType) than Enemy.update()'s plain boolean contract.
      // The cast widens the three subclasses' return shapes to their common
      // superset so both knockback + dmgType read cleanly (each only sets its own).
      if (
        enemy instanceof GremlinKing ||
        enemy instanceof Gloamwarden ||
        enemy instanceof Cinderwrought ||
        enemy instanceof Duneshaper ||
        enemy instanceof Hexling ||
        enemy instanceof Sandmaw ||
        enemy instanceof Miretyrant ||
        enemy instanceof Palewake ||
        enemy instanceof Kilnborn ||
        enemy instanceof Sanguinarch ||
        enemy instanceof Mirejaw || // C1: death-roll ticks are area hits, not bites
        enemy instanceof Corpselight // C3: collapse slam / dissolve puff are area hits
      ) {
        const areaHit = enemy.checkPlayerHit(this.player.x, this.player.y) as
          | {
              damage: number;
              knockback?: number;
              dmgType?: IncomingDamageType;
              bleed?: { dmgPerSec: number; durationMs: number };
            }
          | null;
        if (areaHit) {
          this.applyDamageToPlayer(
            areaHit.damage,
            areaHit.knockback ? { fromX: enemy.x, fromY: enemy.y, speed: areaHit.knockback } : undefined,
            areaHit.dmgType,
            areaHit.bleed,
            undefined,
            enemy.displayName,
          );
        }
      }
    }
    this.updatePackAggro(now);
    this.updateDuskrunnerPacks(now);
    this.containCryptEnemies();
    this.updateMiretyrantBellow();
    this.expireSporeClouds(now);
  }

  // Place a lingering Mosswretch spore cloud (C2). Purely a hazard record +
  // its own faint visual; damage/slow/regen come entirely through
  // environmentEffectAt, so there's no per-cloud damage code. Reuses the mire
  // pool's soft blob art in a paler spore-green.
  private spawnSporeCloud(x: number, y: number, now: number): void {
    const img = this.add
      .image(x, y, "poi_floor_gorge")
      .setScale((SPORE_CLOUD_RADIUS / 90) * 1.1)
      .setAlpha(0.5)
      .setTint(0x9fd66a)
      .setDepth(-6);
    this.sporeClouds.push({ x, y, expiresAt: now + SPORE_CLOUD_MS, image: img });
  }

  // A killed Blighttoad's corpse swells and BURSTS after a short fuse, leaving a
  // poison cloud where it fell (2026-07-24, the user: "maybe some enemies should
  // have a delayed poison explosion on death").
  //
  // Why this creature and why poison: the complaint it answers is that clearing
  // the bayou had no cost, because crit-splash deletes a whole pack in one swing
  // and every physical counter-attack was being erased by flat armour anyway.
  // Poison bypasses armour outright, so this stays a real cost at ANY gear
  // level — it is specifically the thing endgame defence cannot stat its way
  // past — and the fuse is what makes it a decision: the corpse is a hazard you
  // now have to walk away from, so mowing a clump down while standing in it
  // costs you something. It reuses the spore-cloud hazard record wholesale, so
  // there is no new damage code, no new expiry sweep and no new environment hook.
  private spawnDeathBloom(x: number, y: number, elite: boolean): void {
    // Telegraph the fuse — an unexplained delayed hit the player can't see
    // coming is just unfair damage, not a mechanic.
    const warn = this.add
      .image(x, y, "poi_floor_gorge")
      .setScale((SPORE_CLOUD_RADIUS / 90) * 0.5)
      .setAlpha(0.3)
      .setTint(0x9fd66a)
      .setDepth(-6);
    this.tweens.add({
      targets: warn,
      scale: (SPORE_CLOUD_RADIUS / 90) * 1.1,
      alpha: 0.55,
      duration: DEATH_BLOOM_FUSE_MS,
      ease: "Quad.easeIn",
      onComplete: () => {
        warn.destroy();
        // Fuse survives the corpse but not the run — bail if the scene moved on.
        if (this.runOver) return;
        this.spawnSporeCloud(x, y, this.time.now);
        // An elite denies MORE GROUND rather than more damage per tick: stacking
        // clouds on one spot would be a silent no-op, since foldSporeCloud is a
        // boolean "inside any cloud" test that maxes the dps rather than summing
        // it. Two offset clouds actually widen the patch you have to leave.
        if (elite) {
          const a = Math.random() * Math.PI * 2;
          const r = SPORE_CLOUD_RADIUS * 0.7;
          this.spawnSporeCloud(x + Math.cos(a) * r, y + Math.sin(a) * r, this.time.now);
          this.spawnSporeCloud(x - Math.cos(a) * r, y - Math.sin(a) * r, this.time.now);
        }
        this.sfx.hit();
      },
    });
  }

  // Sweep expired clouds each frame (their images too). Also fades the last
  // second so a cloud doesn't wink out — purely cosmetic, the hazard is gone
  // the instant it expires from the list.
  private expireSporeClouds(now: number): void {
    for (let i = this.sporeClouds.length - 1; i >= 0; i--) {
      const c = this.sporeClouds[i];
      if (now >= c.expiresAt) {
        c.image.destroy();
        this.sporeClouds.splice(i, 1);
      } else {
        const remaining = c.expiresAt - now;
        if (remaining < 1000) c.image.setAlpha(0.5 * (remaining / 1000));
      }
    }
  }

  // Duskrunner pack-attack sync (the user: "attack as a pack"). When one dog is
  // in its pounce wind-up, rally nearby chasing packmates to pounce in the same
  // beat so a pack leaps together rather than one at a time. joinPounce no-ops
  // for anything out of band / on cooldown / already attacking, so this is cheap
  // and self-limiting (k Duskrunners aggro'd, 0 today outside the badlands).
  private static readonly DUSK_PACK_SYNC_RADIUS = 210;
  private updateDuskrunnerPacks(now: number): void {
    const px = this.player.x;
    const py = this.player.y;
    for (const leader of this.enemies) {
      if (!(leader instanceof Duskrunner) || leader.depleted || !leader.isPounceWindup()) continue;
      for (const other of this.enemies) {
        if (other === leader || !(other instanceof Duskrunner)) continue;
        if (Phaser.Math.Distance.Between(leader.x, leader.y, other.x, other.y) > MainScene.DUSK_PACK_SYNC_RADIUS)
          continue;
        other.joinPounce(now, px, py);
      }
    }
  }

  // Swarm pack-aggro (Biome 2 Phase 1): an aggro'd pack member wakes nearby
  // idle same-type pack members, so a swarm converges once one engages or is
  // hit. Opt-in via Enemy.packAggro (off for every biome-1 enemy — Phase 2's
  // canid swarm is the first user), so the outer loop is empty today and this
  // is effectively free. Same-class only (constructor identity) keeps a Boar
  // from waking a Gremlin.
  private updatePackAggro(now: number): void {
    for (const leader of this.enemies) {
      if (!leader.packAggro || leader.depleted || !leader.isAggro()) continue;
      for (const other of this.enemies) {
        if (other === leader || other.depleted || !other.packAggro || other.isAggro()) continue;
        if (other.constructor !== leader.constructor) continue;
        if (Phaser.Math.Distance.Between(leader.x, leader.y, other.x, other.y) <= other.packAggroRadius) {
          other.forceAggro(now);
        }
      }
    }
  }

  // Trees/boulders are non-solid but still Y-sorted (see ResourceNode's
  // constructor), so one can render in front of the player when standing
  // "behind" it. Rather than hide the player, fade the obstruction down so
  // the player is always visible (Stardew Valley's approach) — a manual
  // per-frame alpha lerp toward a target, not a tween, so it doesn't fight
  // ResourceNode.playHitFeedback's own tweens on the same object.
  private static readonly OCCLUSION_FADE_ALPHA = 0.45;
  private static readonly OCCLUSION_CULL_DIST = 120; // px — skip the finer overlap check beyond this
  private static readonly OCCLUSION_LERP_PER_SEC = 8; // alpha lerp rate
  private updateTreeOcclusion(delta: number): void {
    const px = this.player.x;
    const py = this.player.y;
    const t = Math.min(1, (delta / 1000) * MainScene.OCCLUSION_LERP_PER_SEC);
    for (const node of this.obstacleNodes) {
      if (node.depleted) continue;
      const dx = node.x - px;
      const dy = node.y - py;
      let target = 1;
      if (Math.abs(dx) <= MainScene.OCCLUSION_CULL_DIST && Math.abs(dy) <= MainScene.OCCLUSION_CULL_DIST) {
        const halfW = node.displayWidth / 2;
        const halfH = node.displayHeight / 2;
        // "Behind" the tree: the player overlaps it horizontally and sits
        // above it (smaller y) closely enough that the Y-sorted sprite would
        // actually be drawn over them.
        if (Math.abs(dx) <= halfW && dy > 0 && dy <= halfH) {
          target = MainScene.OCCLUSION_FADE_ALPHA;
        }
      }
      if (node.alpha !== target) {
        node.setAlpha(Phaser.Math.Linear(node.alpha, target, t));
      }
    }
  }

  // True if the player has at least one heavy-armor piece equipped — gates the
  // heavy_armor skill's magic/fire mitigation (biome 2 Phase 4) so a light build
  // that once leveled heavy_armor doesn't get free elemental resist.
  private wearsHeavyArmor(): boolean {
    return armorTypesWornPerPiece(EQUIP_SLOTS.map((s) => this.equipment.get(s.id))).includes("heavy_armor");
  }

  // Recompute which full armor sets are worn — called from afterItemMove (the
  // single equip/unequip chokepoint) and on run reset. Cached so combat hooks
  // read a Set membership test, not a full re-scan each frame.
  private recomputeSetBonuses(): void {
    this.activeSetIds = activeSets(EQUIP_SLOTS.map((s) => this.equipment.get(s.id)));
  }

  private hasSet(id: SetId): boolean {
    return this.activeSetIds.has(id);
  }

  // Heavy-set flat damage reduction - the bayou (Gloamsteel) reforge supersedes
  // the Ember one rather than stacking (you can only wear one full set anyway).
  private moltenDamageReduction(): number {
    if (this.hasSet("gloamsteel")) return SET_GLOAM_BULWARK_DAMAGE_REDUCTION;
    return this.hasSet("embersteel") ? SET_MOLTEN_DAMAGE_REDUCTION : 0;
  }

  // Light-set dash-distance multiplier, same supersede rule.
  private emberblinkDashMult(): number {
    if (this.hasSet("mirehide")) return SET_MIREBLINK_DASH_MULT;
    return this.hasSet("emberhide") ? SET_EMBERBLINK_DASH_MULT : 1;
  }

  // `knockback` is optional so every existing call site (Boar bite, Snake
  // bite, Gremlin claw/projectile) is untouched — only the Gremlin King's
  // slam attack passes one.
  private applyDamageToPlayer(
    amount: number,
    knockback?: { fromX: number; fromY: number; speed: number },
    dmgType?: IncomingDamageType,
    bleed?: { dmgPerSec: number; durationMs: number },
    poison?: { dmgPerSec: number; durationMs: number },
    // Who hit you, for the end-of-run summary's damage-taken breakdown. Recorded
    // AFTER every reduction, so it reports what actually cost you HP rather than
    // the attack's paper number — which is the only version worth balancing on.
    sourceLabel?: string,
  ): void {
    if (this.isDead) return;
    if (this.time.now < this.invulnerableUntil) return;

    // Guardian relic (defense): fully negate this hit if the negate is off
    // cooldown. Consumes it + starts a brief grace so a multi-hit frame can't
    // burn it twice. No damage, no bleed.
    const guardian = this.relics.unique("guardian");
    if (guardian && this.time.now >= this.guardianReadyAt) {
      this.guardianReadyAt = this.time.now + guardian.params.cooldownMs;
      this.invulnerableUntil = Math.max(this.invulnerableUntil, this.time.now + 150);
      this.sfx.hit();
      this.spawnFeedbackText(this.player.x, this.player.y, "Blocked!");
      return;
    }

    this.sfx.hit();
    // Bleed rides the same i-frame guard above, so a dashed-through Cragscale
    // roll opens no wound (the whole attack is dodged, not just its direct hit).
    // The Mireborn Cloak (B4-P2 epic passive) thins the DOSE rather than the
    // duration, so a resisted wound still reads as a wound on the status bar —
    // it just costs less. Same treatment for poison below.
    const statusMult = this.equipEffects.statusResistMult();
    if (bleed) {
      this.bleed.apply(bleed.dmgPerSec * statusMult, bleed.durationMs);
      this.hints.trigger("bled");
    }
    // Creature poison (biome 3) rides the same i-frame guard as bleed, and uses
    // the DISCRETE apply() path — repeated Blighttoad bites are meant to ramp,
    // unlike the miasma's refresh-don't-stack sustain().
    if (poison) {
      this.poison.apply(poison.dmgPerSec * statusMult, poison.durationMs);
      this.hints.trigger("poisoned");
    }
    // Additive damage-reduction bucket (2026-07-15): the relic %-reduction and
    // Molten Bulwark's flat % (Embersteel heavy set) ADD into one reduction,
    // capped at 75% so no combination reaches immunity — applied once, before
    // flat armor. Magic AND fire (Biome 2) BYPASS the flat-armor term (badlands
    // casters/forge-boss teeth); the %-reduction still applies. Floored at 1.
    const relicRed = 1 - this.relics.damageTakenMult();
    const moltenDr = this.moltenDamageReduction();
    // Drowned Aegis (B4-P2 found-only active) is a third contributor to the SAME
    // additive bucket, deliberately — so a big timed cut still lands under the
    // shared 0.75 cap and can't be stacked into immunity with relics/Bulwark.
    const aegisDr = this.time.now < this.aegisUntil ? this.aegisReduction : 0;
    const reductionPct = Math.min(0.75, Math.max(0, relicRed + moltenDr + aegisDr));
    // The run character's modifier scales incoming damage BEFORE the reduction
    // bucket — it's a property of the run, not another stackable resistance, so
    // a +25%-damage-taken card can't be cancelled out by the 75% reduction cap.
    let relicAdjusted = amount * this.character.damageTakenMult() * (1 - reductionPct);
    // Guardian Mythic: cap any single hit at capPct% of max HP (post-%, pre-armor).
    if (guardian && guardian.params.capPct) {
      relicAdjusted = Math.min(
        relicAdjusted,
        this.health.max * (guardian.params.capPct / 100) * powerTierMult(guardian.powerTier),
      );
    }
    let reduced: number;
    if (dmgType && bypassesArmor(dmgType)) {
      // Magic/fire bypass the flat-armor term. Heavy armor's skill gives partial
      // elemental mitigation instead (its identity vs light's dodge i-frames) —
      // a % reduction, only while wearing at least one heavy piece (biome 2
      // Phase 4). Light-armor players take the hit undiminished, as before.
      // Heavy-armor skill mitigation + any Gloamweave Lining augments, capped so
      // a full set of linings can never zero out elemental damage.
      const skillMit = this.wearsHeavyArmor() ? heavyArmorMagicMitigation(this.skills) : 0;
      const augMit = (equippedAugmentEffect(this.equipment).elementalMitigationPct ?? 0) / 100;
      const mit = Math.min(0.75, skillMit + augMit);
      reduced = Math.max(1, Math.round(relicAdjusted * (1 - mit)));
      this.hints.trigger("magic_damage");
    } else {
      reduced = Math.max(1, Math.round(relicAdjusted - totalPlayerDefense(this.equipment)));
    }
    // Floating number over the player, tinted by incoming type, so it's clear
    // when you're being hit by fire/magic (the user: "fire damage should be
    // clear") vs a physical bite. Shown at the true computed value even under
    // god mode, so damage numbers stay testable.
    this.spawnPlayerDamageNumber(reduced, dmgType);
    // Leech shield (lifesteal Mythic) absorbs before HP.
    const toHp = this.absorbWithShield(reduced);
    // DEV god mode: still take the hit (sfx/knockback/damage number all play
    // out normally above/below) but never drop below 1 HP or die.
    const appliedDamage = this.devGodMode ? Math.min(toHp, Math.max(0, this.health.value() - 1)) : toHp;
    this.runLog.recordDamageTaken(sourceLabel ?? "Unattributed", appliedDamage);
    const died = this.health.takeDamage(appliedDamage);
    this.refreshHealthBar();
    this.hints.trigger("took_damage"); // first hit taken this run -> nudge toward healing
    // Undying Rare (vitality): an emergency heal when this hit drops you below the
    // threshold (on its own cooldown). Distinct from the Mythic once-per-run revive.
    if (!died) {
      const u = this.relics.unique("undying");
      if (
        u &&
        u.params.lowHpHealPct &&
        this.health.value() / this.health.max < u.params.thresholdPct / 100 &&
        this.time.now >= this.undyingReadyAt
      ) {
        this.undyingReadyAt = this.time.now + u.params.cooldownMs;
        this.health.heal(this.health.max * (u.params.lowHpHealPct / 100) * powerTierMult(u.powerTier));
        this.refreshHealthBar();
        this.spawnFeedbackText(this.player.x, this.player.y, "Second Breath!");
      }
    }
    // Knockback (bite shove, boss slam) always applies now — Molten Bulwark's
    // old knockback-immunity was traded for the flat damage reduction above
    // (decision 2), so the heavy set is pure mitigation, not a stance anchor.
    if (knockback) {
      const angle = Phaser.Math.Angle.Between(knockback.fromX, knockback.fromY, this.player.x, this.player.y);
      const body = this.player.body as Phaser.Physics.Arcade.Body;
      body.setVelocity(Math.cos(angle) * knockback.speed, Math.sin(angle) * knockback.speed);
      // Brief impulse, not a sustained shove — matches dash's own short-burst feel.
      this.time.delayedCall(150, () => body.setVelocity(0, 0));
    }
    // Undying Mythic can save one fatal hit per run before the death path fires.
    if (died && !this.devGodMode && !this.tryUndyingRevive()) this.onPlayerDeath();
  }

  // Route damage through the Leech overshield (playerShield) before HP and
  // return what's left for HP. Shared by direct hits and the DoT ticks (poison/
  // bleed) so every damage source chips the shield consistently.
  private absorbWithShield(amount: number): number {
    if (this.playerShield <= 0) return amount;
    const absorbed = Math.min(this.playerShield, amount);
    this.playerShield -= absorbed;
    return amount - absorbed;
  }

  private onPlayerDeath(): void {
    this.sfx.death();
    this.isDead = true;
    this.player.setVelocity(0, 0);
    // Active food buffs + any bleed are lost on death (don't carry into respawn).
    this.buffs.clear();
    this.bleed.clear();
    this.poison.clear();
    this.buffBarUI.sync(this.buffs.active());
    this.statusBarUI.sync(this.statusEffects());
    this.eventLog.add("combat", "You died...");
    // Hardcore: death is terminal — end the run and post the score after a beat.
    // This holds even after a "Continue" into in-progress content: death always
    // ends the run. Non-hardcore keeps the legacy respawn (documented easy-mode hook).
    if (HARDCORE) {
      this.time.delayedCall(this.RESPAWN_DELAY_MS, () => this.endRun("died"));
    } else {
      this.time.delayedCall(this.RESPAWN_DELAY_MS, () => this.respawnPlayer());
    }
  }

  // Pause (Esc): freeze the sim so time-in-run doesn't advance while away.
  // update() early-returns on isPaused; pausing physics + the scene clock
  // stops body drift and timer/cooldown desync. Blocked once the run is over
  // (the run-end screen owns the frozen world then).
  private openPauseMenu(): void {
    if (this.isPaused || this.runOver || this.isDead) return;
    this.isPaused = true;
    this.player.setVelocity(0, 0);
    this.physics.world.pause();
    this.time.paused = true;
    this.showPauseMenuPanel();
  }

  // Shows the pause panel itself, assuming the world is already frozen
  // (isPaused true). Split out from openPauseMenu so returning from Tips
  // (closeTips) can re-show the panel without re-running/being blocked by
  // openPauseMenu's isPaused guard.
  private showPauseMenuPanel(): void {
    this.pauseMenu.show({
      hintsEnabled: () => this.hints.isEnabled(),
      onToggleHints: () => this.hints.setEnabled(!this.hints.isEnabled()),
      sfxEnabled: () => this.sfx.isEnabled(),
      onToggleSfx: () => this.sfx.setEnabled(!this.sfx.isEnabled()),
      onResume: () => this.resumeGame(),
      // Abandoning mid-run ENDS the run rather than silently restarting it
      // (D7). This is the path a player takes most often, and it used to be the
      // one case that produced no summary and no score at all — the run simply
      // evaporated. Ending it as a death is honest: you didn't finish.
      onNewRun: () => this.abandonRun(),
      onTips: () => this.openTips(),
    });
  }

  // "New Run" from the pause menu: close the pause overlay, un-freeze just
  // enough for the end screen to work, and route through the normal endRun()
  // path so the abandoned run is scored, recorded, and summarised like any
  // other. The end screen's own "New Run" button then does the restart.
  private abandonRun(): void {
    this.pauseMenu.hide();
    this.isPaused = false;
    this.physics.world.resume();
    this.time.paused = false;
    this.endRun("died");
  }

  private resumeGame(): void {
    if (!this.isPaused) return;
    this.pauseMenu.hide();
    this.time.paused = false;
    this.physics.world.resume();
    this.isPaused = false;
  }

  // First-launch welcome/how-to-play overlay. Shares the pause menu's
  // isPaused freeze (see openPauseMenu) so the world can't be interacted with
  // while it's up, without a second parallel freeze flag.
  private openWelcome(): void {
    if (this.isPaused || this.runOver || this.isDead) return;
    this.isPaused = true;
    this.player.setVelocity(0, 0);
    this.physics.world.pause();
    this.time.paused = true;
    this.welcomeUI.show(() => this.closeWelcome());
  }

  private closeWelcome(): void {
    this.welcomeUI.hide();
    this.time.paused = false;
    this.physics.world.resume();
    this.isPaused = false;
    // The picker follows the welcome rather than stacking on top of it.
    this.openCharacterSelect();
  }

  // === B4-P1: run-start character picker ===

  // Shares the welcome/pause freeze (isPaused + physics + clock) so the run
  // clock and day/night can't advance while the picker is up — deciding your
  // build must never burn speedrun time.
  private openCharacterSelect(): void {
    if (this.runOver || this.isDead) return;
    this.isPaused = true;
    this.player.setVelocity(0, 0);
    this.physics.world.pause();
    this.time.paused = true;
    this.characterSelectUI.show((def) => this.applyCharacter(def));
  }

  // Commit the chosen card: stats, pre-equipped gear (including the ability
  // special that lights up Q/E/R through the ordinary equipment path), and the
  // loose kit — then unfreeze. The run modifier itself is read live at the
  // existing relic hook points, so nothing is "applied" for it here.
  private applyCharacter(def: CharacterDef): void {
    this.character = new RunCharacter(def);
    // Each survivor has its own sprite and animations once real art exists for
    // it; a card with no rig art keeps the placeholder (see art/playerRig.ts).
    this.player.setCharacter(def.id);

    // Potency must land BEFORE the starting stats, so the granted points are
    // already worth the class rate the first time syncStatBonuses reads them.
    this.progression.setStatPotency(this.character.statPotencyMap());
    for (const [stat, n] of Object.entries(def.startingStats)) {
      this.progression.setStat(stat as StatType, n as number);
    }
    for (const eq of def.startingEquip) {
      this.equipment.set(eq.slot, { key: eq.key, tier: 0 });
      this.discoverMaterial(eq.key);
    }
    for (const it of def.startingItems) {
      // Tools/weapons go straight to the hotbar so they're usable without
      // opening the inventory; everything else (and any overflow) lands in the
      // backpack. Both containers are empty at run start, so addStack's
      // first-empty-slot placement is the whole story here — no merge path.
      const stack = { key: it.key, count: it.count };
      const wantsHotbar = itemDef(it.key)?.hotbarable !== false;
      if (!wantsHotbar || !this.hotbar.container.addStack(stack)) {
        this.backpack.addStack(stack);
      }
      this.discoverMaterial(it.key);
    }

    this.buffs.setMaxBuffs(this.character.maxBuffs() ?? DEFAULT_MAX_BUFFS);

    this.afterItemMove();
    this.syncStatBonuses();
    this.refreshDiscovery();
    this.hotbarUI.refresh();
    this.characterMenu?.refresh();
    this.refreshStatPointsBadge();
    this.eventLog.add("info", `${def.name} — ${def.modifier.name}`);

    this.time.paused = false;
    this.physics.world.resume();
    this.isPaused = false;
  }

  // "Tips" from the pause menu: swap the pause panel for the discovered-tips
  // list without unfreezing the world, then restore the pause menu on close.
  private openTips(): void {
    this.pauseMenu.hide();
    this.tipsUI.show(() => this.closeTips());
  }

  private closeTips(): void {
    this.tipsUI.hide();
    this.showPauseMenuPanel();
  }

  // Finalize the run: freeze the world, post the score to the localStorage
  // high-score table, and show the run-end screen. Guarded so a death during
  // the post-win delay (or vice versa) can't double-post.
  private endRun(outcome: RunOutcome): void {
    if (this.runOver) return;
    this.run.end(outcome);
    // If the run was already ended by a win and then Continued, end() no-ops, so
    // force the real (death) outcome for the end screen + high-score entry.
    if (this.inProgressMode) this.run.setOutcome(outcome);
    this.inProgressBanner?.setVisible(false);
    this.runOver = true;
    this.player.setVelocity(0, 0);
    const { entries, rank } = recordHighScore({
      score: this.run.score(),
      outcome,
      seed: this.run.seed,
      elapsedMs: this.run.elapsedMs,
      kills: this.run.kills,
      level: this.progression.level,
      dateISO: new Date().toISOString(),
    });
    this.showRunEndUI(entries, rank);
  }

  // Shared by endRun() and the run-end screen's own "Clear" button (which
  // needs to re-show itself with an emptied table, not just wipe storage).
  private showRunEndUI(entries: ScoreEntry[], rank: number): void {
    this.runEndUI.show({
      run: this.run,
      runLog: this.runLog,
      level: this.progression.level,
      entries,
      rank,
      characterLine: this.character.def
        ? `Played as ${this.character.name()} — ${this.character.modifierName()}`
        : undefined,
      onNewRun: () => this.scene.restart(),
      // Only surfaced on a win (RunEndUI hides it on "died"): dismiss the end
      // screen and un-freeze the world so the player can keep exploring.
      onContinue: () => this.resumeAfterWin(),
      onClearScores: () => {
        clearHighScores();
        this.runEndUI.hide();
        this.showRunEndUI([], 0);
      },
      // Test-mode "keep playing" button on the death screen. Intentionally live
      // in production too for now (the user — may be removed once balance settles),
      // so hardcore death is currently NOT terminal on the deployed build.
      onDevContinue: () => this.resumeFromDeath(),
    });
  }

  // Continue a won run into in-progress content (playtest end-to-end testing).
  // The win's score is already posted; this just un-freezes the world and raises
  // a persistent caveat so it's clear you're past the current end-game target.
  // Death is NOT affected — a hardcore death still ends the run.
  private resumeAfterWin(): void {
    this.runEndUI.hide();
    this.runOver = false;
    this.run.resume(); // see Run.resume() — the win's score is already banked
    this.inProgressMode = true;
    if (!this.inProgressBanner) {
      this.inProgressBanner = this.add
        .text(
          this.scale.width / 2,
          8,
          "⚠ IN-PROGRESS CONTENT — past the current end-game target (work in progress)",
          {
            fontFamily: "monospace",
            fontSize: "12px",
            color: "#ffd24a",
            backgroundColor: "#1a1408",
            padding: { x: 10, y: 4 },
          },
        )
        .setOrigin(0.5, 0)
        .setScrollFactor(0)
        .setDepth(2850); // fixed-HUD band (above WORLD_H, below menus)
    }
    this.inProgressBanner.setVisible(true);
  }

  // DEV test-mode "Continue" from the death screen (see showRunEndUI's
  // onDevContinue). Respawn where you fell at full HP/stamina, drop every
  // debuff, grant a generous invuln window, and shove nearby enemies back to
  // their spawn — a universal deaggro that works for every enemy type (they all
  // expose homeX/homeY) without touching each subclass's aggro-state model.
  private resumeFromDeath(): void {
    this.runEndUI.hide();
    this.runOver = false;
    this.isDead = false;
    this.run.resume(); // the clock keeps running — you're still playing
    // Full pools + a clean slate (onPlayerDeath already cleared buffs/bleed/
    // poison, but re-clear defensively in case anything re-applied since).
    this.health.reset();
    this.stamina.restore(this.stamina.max);
    this.buffs.clear();
    this.bleed.clear();
    this.poison.clear();
    this.playerShield = 0;
    this.buffBarUI.sync(this.buffs.active());
    this.statusBarUI.sync(this.statusEffects());
    this.refreshHealthBar();
    this.refreshStaminaBar();
    this.reviveUsed = false; // let Undying trigger again after a test continue
    this.invulnerableUntil = this.time.now + 3000; // generous window to relocate
    // Send anything close back home so it stops mid-fight and re-idles from
    // spawn; its own leash/steer logic takes over from there.
    for (const e of this.enemies) {
      if (!e.active || e.depleted) continue;
      if (Phaser.Math.Distance.Between(e.x, e.y, this.player.x, this.player.y) > 900) continue;
      e.setPosition(e.homeX, e.homeY);
      (e.body as Phaser.Physics.Arcade.Body | undefined)?.setVelocity(0, 0);
    }
    this.eventLog.add("combat", "Continued (test mode) — respawned where you fell");
  }

  private respawnPlayer(): void {
    this.player.setPosition(WORLD_W / 2, WORLD_H / 2);
    this.health.reset();
    this.refreshHealthBar();
    this.invulnerableUntil = this.time.now + this.POST_RESPAWN_INVULN_MS;
    this.isDead = false;
    this.eventLog.add("combat", "Respawned");
  }

  // Depleting a tree/boulder "explodes" its yield into 2-4 scattered loose
  // pieces instead of crediting the backpack directly. Pieces that land near
  // another piece of the same resource consolidate into one stack. Also
  // reused (with a nonzero magnetCooldownMs) for player-dropped items,
  // processed Drying Rack output/input overflow, and destroyed-placeable
  // pickups — `resource` is a plain item key rather than ResourceType so it
  // can carry tools/weapons/placeables too, not just raw resources.
  private spawnLooseDrop(
    resource: string,
    amount: number,
    x: number,
    y: number,
    magnetCooldownMs = 0,
    tier?: number,
    upgrades?: string[],
  ): void {
    const pieceCount = amount > 1 ? Phaser.Math.Between(2, Math.min(4, amount)) : 1;
    const base = Math.floor(amount / pieceCount);
    let remainder = amount - base * pieceCount;

    const def = itemDef(resource);
    const magnetReadyAt = this.time.now + magnetCooldownMs;
    for (let i = 0; i < pieceCount; i++) {
      const pieceAmount = base + (remainder > 0 ? 1 : 0);
      if (remainder > 0) remainder--;

      const node = new ResourceNode(this, {
        x,
        y,
        texture: def?.texture ?? resource,
        resource,
        amount: pieceAmount,
        action: "pickup",
        displayName: def?.name ?? resource,
        loose: true,
        isDrop: true,
        health: 1,
        magnetReadyAt,
        tier,
        upgrades,
      });
      node.exploding = true;
      node.setAmount(pieceAmount);
      this.nodes.push(node);

      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const dist = Phaser.Math.Between(DROP_SCATTER_MIN, DROP_SCATTER_MAX);
      const targetX = x + Math.cos(angle) * dist;
      const targetY = y + Math.sin(angle) * dist;

      this.tweens.add({
        targets: node,
        x: targetX,
        y: targetY,
        duration: 250,
        ease: "Cubic.easeOut",
        onComplete: () => {
          node.exploding = false;
          // The piece may already have been clicked and collected mid-flight
          // (pieces are hoverable/clickable immediately, even while
          // exploding) — don't resurrect it with a fresh bob tween.
          if (node.depleted) return;
          node.startBob();
          if (resource === "gloam_shard") this.playGloamShardPop(node);
          this.consolidateDrop(node);
        },
      });
    }
  }

  // A little extra pop on Gloam Shard drops (Gloamwarden's rare currency) so
  // they read as a special reward, not just another loose pickup — a scale
  // punch on the sprite plus a quick purple glow burst (reuses the light_soft
  // gradient the M-DN torch/vein lighting already established).
  private playGloamShardPop(node: ResourceNode): void {
    node.setScale(0.4);
    this.tweens.add({
      targets: node,
      scale: 1,
      duration: 260,
      ease: "Back.easeOut",
    });
    const glow = this.add
      .image(node.x, node.y, "light_soft")
      .setTint(0xb266ff)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(0.85)
      .setScale(0.3)
      .setDepth(ysortDepth(node.y) + 1);
    this.tweens.add({
      targets: glow,
      scale: 1.1,
      alpha: 0,
      duration: 380,
      ease: "Cubic.easeOut",
      onComplete: () => glow.destroy(),
    });
  }

  // After a drop piece lands, merge it into another nearby piece of the same
  // resource (if any) so the ground doesn't accumulate lots of tiny stacks.
  private consolidateDrop(node: ResourceNode): void {
    if (node.depleted) return;
    if (node.tier !== undefined) return; // tiered station drops carry per-instance state — never merge counts
    const existing = this.nodes.find(
      (n) =>
        n !== node &&
        n.isDrop &&
        n.loose &&
        !n.depleted &&
        !n.exploding &&
        n.tier === undefined &&
        n.resource === node.resource &&
        Phaser.Math.Distance.Between(n.x, n.y, node.x, node.y) <= DROP_CONSOLIDATE_RADIUS,
    );
    if (!existing) return;
    existing.setAmount(existing.amount + node.amount);
    node.deplete();
    this.nodes = this.nodes.filter((n) => !n.depleted);
  }

  // Add an item to the backpack — but top up a MATCHING stack already sitting
  // in the hotbar first (e.g. crafting/cooking more of a food you already
  // have equipped in a hotbar slot should stack there, not silently land in
  // the backpack instead). Only tops up an EXISTING hotbar stack — never
  // places a brand-new item into an empty hotbar slot, which would be a
  // surprising side effect of crafting. Records discovery and returns any
  // amount that didn't fit anywhere. (M1 backpack is roomy; overflow handling
  // — dropping — arrives with the loot-drop milestone.)
  private addToBackpack(key: string, amount: number): number {
    const afterHotbar = this.topUpExistingHotbarStack(key, amount);
    const leftover = this.backpack.add(key, afterHotbar);
    if (afterHotbar !== amount) this.hotbarUI?.refresh();
    this.discoverMaterial(key);
    // First elite trophy in hand -> nudge toward the Relic Forge (not the boss
    // fang, which is a win-state drop, not a forge input the player farms).
    if (key === "gremlin_trophy" || key === "boar_trophy" || key === "snake_trophy") {
      this.hints.trigger("elite_trophy");
    }
    this.refreshDiscovery();
    return leftover;
  }

  // Tops up any hotbar slot already holding `key` (up to its max stack size),
  // across as many existing stacks as needed — never touches empty slots.
  // Returns whatever amount is still left to place elsewhere.
  private topUpExistingHotbarStack(key: string, amount: number): number {
    const max = itemDef(key)?.maxStack ?? 99;
    let remaining = amount;
    for (let i = 0; i < this.hotbar.container.size && remaining > 0; i++) {
      const s = this.hotbar.container.slot(i);
      if (s && s.key === key && s.count < max) {
        const take = Math.min(max - s.count, remaining);
        s.count += take;
        remaining -= take;
      }
    }
    return remaining;
  }

  // Mark a key discovered; if it's a genuinely NEW raw material (not a
  // crafted/processed/cooked/refined output — those already get their own
  // "New Recipe Unlocked!" toast) pop a small discovery toast. Centralizes
  // every discovered.add() call site so this fires exactly once, wherever
  // the material is first obtained — world pickup, chest loot, drying-rack
  // output, etc.
  private discoverMaterial(key: string): void {
    if (this.discovered.has(key)) return;
    this.discovered.add(key);
    if (CRAFTED_OUTPUT_KEYS.has(key)) return;
    const def = itemDef(key);
    if (!def) return;
    // An epic find gets the loud gold center toast instead of the quiet blue
    // material one. This rides discoverMaterial deliberately: it's already the
    // choke point every container move reconciles through
    // (reconcileBackpackDiscovery), so chest → backpack is covered for free.
    // Known limitation: it dedupes on `discovered`, so a SECOND copy of the same
    // epic won't re-toast. Epics are maxStack-1 uniques, so a duplicate is a
    // non-event, and the container glow signals "there's something in here"
    // independently of this.
    if (EPIC_ITEM_KEYS.has(key)) {
      this.eventLog.add("epic", `Epic find — ${def.name}!`, def.texture);
      this.sfx.upgrade();
      return;
    }
    this.eventLog.add("material", `Discovered: ${def.name}`, def.texture);
  }

  // Re-run recipe discovery and announce anything newly unlocked. Call after
  // any resource pickup, skill level-up, or workbench placement.
  private refreshDiscovery(): void {
    const unlocked = this.crafting.refresh(this.discovered, this.skills, this.hasWorkbenchPlaced(), this.everMaxWorkbenchTier);
    // First recipe of the run becomes craftable -> point at the Tab menu.
    if (unlocked.length > 0) this.hints.trigger("open_menu");
    for (const recipe of unlocked) {
      const icon = itemDef(outputKey(recipe))?.texture;
      this.eventLog.add("recipe", `New Recipe Unlocked! ${recipe.name}`, icon);
    }
    // Station upgrades (StationUpgrades.ts) live outside the Recipe/Crafting
    // system entirely, so they need their own "just became discoverable"
    // tracking to get the same unlock announcement recipes get.
    for (const upg of STATION_UPGRADES) {
      if (this.discoveredUpgradeIds.has(upg.id)) continue;
      if (!this.upgradeIngredientsKnown(upg)) continue;
      this.discoveredUpgradeIds.add(upg.id);
      const icon = itemDef(upg.appliesToItemKey)?.texture;
      this.eventLog.add("recipe", `New Upgrade Unlocked! ${upg.name}`, icon);
    }
    // Tool upgrades (ToolUpgrades.ts) sit outside the Recipe/Crafting system in
    // the same way station upgrades do, so they get the identical one-shot
    // discovery announcement — becomes available once its ingredients are known
    // and the tool it targets has been discovered (upgradeIngredientsKnown's
    // appliesToItemKey gate covers the latter).
    for (const upg of TOOL_UPGRADES) {
      if (this.discoveredToolUpgradeIds.has(upg.id)) continue;
      if (!this.upgradeIngredientsKnown(upg)) continue;
      this.discoveredToolUpgradeIds.add(upg.id);
      const icon = itemDef(upg.appliesToItemKey)?.texture;
      this.eventLog.add("recipe", `New Upgrade Unlocked! ${upg.name}`, icon);
    }
    // Weapon + armor upgrades. These are LADDERS (Lvl 2 then Lvl 3), and unlike
    // a station or tool upgrade a rung buys no new capability — just bigger
    // numbers on a thing you already have. There are dozens of them across the
    // gear tiers, and learning one common material can unlock a whole column of
    // rungs on the same frame, which is the toast flood the user hit ("upgrade
    // notifications are unruly when you get a bunch at once — not needed for
    // lvl 1->2 type upgrades").
    //
    // So these are logged SILENTLY: the entry still lands in the scrollable Log
    // and the rung still appears in the Upgrade menu (the discovery bookkeeping
    // below is unchanged — only the popup is suppressed). Stations keep their
    // toast outright, and so do tool upgrades, because both of those unlock
    // something you could not do at all before (a new recipe tier, a node you
    // couldn't fell) rather than a bigger number.
    //
    // The below-tier gate stays: it keeps the LOG readable in ladder order.
    for (const upg of [...WEAPON_UPGRADES, ...ARMOR_UPGRADES]) {
      if (this.discoveredGearUpgradeIds.has(upg.id)) continue;
      if (!this.upgradeIngredientsKnown(upg)) continue;
      if (upg.resultTier > 1) {
        const prev = [...WEAPON_UPGRADES, ...ARMOR_UPGRADES].find(
          (u) => u.appliesToItemKey === upg.appliesToItemKey && u.resultTier === upg.resultTier - 1,
        );
        if (prev && !this.discoveredGearUpgradeIds.has(prev.id)) continue;
      }
      this.discoveredGearUpgradeIds.add(upg.id);
      const icon = itemDef(upg.appliesToItemKey)?.texture;
      this.eventLog.add("recipe", `New Upgrade Unlocked! ${upg.name}`, icon, true);
    }
    this.announceCookRecipes();
    this.craftingMenu?.refresh();
    this.inventoryMenu?.refresh();
    this.upgradeMenu?.refresh();
    this.refreshStationUpgradeIndicators();
  }

  private createCharacterMenu(): void {
    this.characterMenu = new CharacterMenu(this, {
      skills: this.skills,
      progression: this.progression,
      allocate: (stat, count) => this.allocateStat(stat, count),
      character: () => this.character,
      // D9: read live off the currently equipped weapon, since crit caps
      // combine weapon base + Strength/Agility + relics + gear augments — a
      // fixed point threshold would be wrong the moment the player switches
      // weapons or relics. Unarmed has no crit to cap.
      axisSaturated: (stat) => this.statAxisSaturated(stat),
    });
  }

  // Open the Character/level-up panel, first closing any other full-screen or
  // station menu so it can't render on top of (and hide) an open one — the
  // Relic Forge menu in particular (playtest: K'd the forge open, the character
  // panel just covered it). One full-screen panel at a time.
  private openCharacterMenu(): void {
    this.closeRelicForgeMenu();
    this.closeDryingRackMenu();
    this.closeCookingMenu();
    this.closeJewelryMenu();
    this.closeChestMenu();
    this.closeUpgradeMenu();
    if (this.inventoryMenu.isOpen()) {
      this.inventoryMenu.close();
      this.craftingMenu.close();
    }
    this.characterMenu.openMenu();
  }

  // --- Progression (player stats) ---

  // Push the current Endurance/Vitality bonuses into the Stamina/HP pools.
  // Called on create and after either is spent, so the max bars grow live.
  private syncStatBonuses(): void {
    // Additive/linear (2026-07-15, supersedes M-SS compounding): the stat bonus
    // (flat) and the relic % (of the 100 base) are INDEPENDENT linear adds, not
    // relic% × stat-inflated-base — so HP/stamina can't compound exponentially.
    // relics.maxHpPctMult() is (1 + sumMaxHpPct/100); (mult - 1) × 100 is the
    // relic's flat HP contribution off the 100 base. Legacy flat maxHp/maxStamina
    // still add directly if a flat relic ever ships.
    // The run character's % is a third INDEPENDENT linear add off the same 100
    // base (never multiplied into the relic/stat total), for the same reason.
    // The run character's maxHpMult is applied LAST, as a true multiplier on the
    // assembled pool (2026-07-24) — unlike the stat/relic terms above, which stay
    // independent linear adds. It was previously a flat % of the 100 base, which
    // meant a "frail" card stopped being frail once the pool grew (the Ashcaller's
    // -15% was worth 5% of an endgame pool). Kept bane-only on the roster so it
    // can never inflate a pool a Vitality potency has already multiplied.
    const finalMaxHp =
      (100 +
        this.progression.vitalityHealthBonus() +
        this.relics.maxHpBonus() +
        100 * (this.relics.maxHpPctMult() - 1)) *
      this.character.maxHpMult();
    this.health.setBonusMax(finalMaxHp - 100);
    // NB the literal here is the pool's own base (Stamina.MAX_STAMINA = 130), not
    // the 100 the relic-% terms are measured against — they only coincided while
    // both were 100, and setBonusMax needs the real base to subtract.
    const finalMaxStam =
      130 +
      this.progression.enduranceStaminaBonus() +
      this.relics.maxStaminaBonus() +
      100 * (this.relics.maxStaminaPctMult() - 1);
    this.stamina.setBonusMax(finalMaxStam - 130);
    // Secondary stat axes (M-SS): Vitality healing-received, Endurance stamina
    // regen, Wisdom buff duration — pushed into the pools/managers that own each.
    // Each also folds in the run character's own multiplier for that axis; the
    // one-axis-one-lever rule in Characters.ts is what stops a card from
    // multiplying the same axis twice (once here and once via stat potency).
    this.health.setHealMult(this.progression.healingReceivedMult());
    this.stamina.setRegenMult(this.progression.staminaRegenMult() * this.character.staminaRegenMult());
    this.buffs.setDurationMult(this.progression.buffDurationMult() * this.character.buffDurationMult());
    this.refreshHealthBar();
    this.refreshStaminaBar();
  }

  // Spend one unspent point on a stat (from the Character menu). Always
  // re-syncs — every M-SS stat now feeds a cached multiplier (crit is read live
  // at hit time, but HP/stamina/heal/regen/buff-duration caches all live in the
  // pools), so it's cheap and keeps them all fresh. Refreshes the menu in place.
  // A stat whose ONLY axis is already saturated against the LIVE build, so
  // further points would be silently dead. Strength/Agility are the two
  // single-axis stats whose ceiling depends on weapon base + relics + augments,
  // which is why this can't live in Progression alongside the point cap. Wisdom
  // is deliberately excluded: its cooldown axis caps at 100 points but buff
  // duration is uncapped, so those points still pay for something. With no
  // weapon equipped there's no crit total to compare against, so nothing blocks.
  private statAxisSaturated(stat: StatType): boolean {
    if (!this.equippedWeapon) return false;
    if (stat === "strength") return this.critMultTotal(this.equippedWeapon) >= CRIT_MULT_CAP;
    if (stat === "agility") return this.critChanceTotal(this.equippedWeapon) >= CRIT_CHANCE_CAP;
    return false;
  }

  private allocateStat(stat: StatType, count = 1): void {
    // Enforced here, not just greyed out in the menu, so every caller (dev
    // commands, any future auto-allocate) gets the same guard.
    if (this.statAxisSaturated(stat)) return;
    if (this.progression.allocate(stat, count) === 0) return;
    this.syncStatBonuses();
    this.characterMenu?.refresh();
    this.refreshStatPointsBadge();
  }

  // --- Crafting ---

  private createCraftingMenu(): void {
    this.craftingMenu = new CraftingMenu(this, {
      backpack: this.backpack,
      crafting: this.crafting,
      craft: (recipe, batches) => this.craftRecipe(recipe, batches),
      maxBatches: (recipe) => this.maxCraftBatches(recipe),
      startPlacement: (recipe) => this.startPlacement(recipe),
      isNearWorkbench: () => this.isNearWorkbench(this.player.x, this.player.y),
      isNearWorkbenchAtTier: (tier) => this.isNearWorkbenchAtTier(tier, this.player.x, this.player.y),
      skills: this.skills,
      progression: this.progression,
      noBuildCost: () => this.devNoBuildCost,
    });
  }

  // Tab opens crafting + inventory together as one combined menu — there's no
  // standalone crafting window anymore. Driven off inventoryMenu's open state
  // since both always move in lockstep.
  private toggleCombinedMenu(): void {
    this.closeDryingRackMenu();
    this.closeCookingMenu();
    this.closeJewelryMenu();
    this.closeChestMenu();
    this.closeUpgradeMenu();
    this.closeRelicForgeMenu();
    this.characterMenu?.close(); // one full-screen menu at a time (mutually exclusive with K)
    const opening = !this.inventoryMenu.isOpen();
    if (opening) {
      this.inventoryMenu.toggle();
      this.craftingMenu.toggle();
    } else {
      this.inventoryMenu.close();
      this.craftingMenu.close();
    }
  }

  // `batches` repeats the recipe that many times in one call (a batch-craft
  // slider for stackable outputs, e.g. 5x Shishkabob) — defaults to 1, the
  // original single-craft behavior.
  private craftRecipe(recipe: Recipe, batches: number = 1): void {
    const key = outputKey(recipe);
    const outCount = recipe.output.kind === "item" ? recipe.output.count ?? 1 : 1;
    const totalOut = outCount * batches;
    // Check affordability AND room for the WHOLE batch before deducting
    // anything, so a full backpack can't eat the resources (the bug this
    // replaces) and a partial batch can never be crafted. Then create the
    // item(s) — a 2nd tool now makes a new stack instead of a silent no-op.
    if (!this.canAffordBatch(recipe, batches)) return;
    if (recipe.tier > 0 && !this.isNearWorkbench(this.player.x, this.player.y)) return;
    if (
      recipe.requiresWorkbenchTier !== undefined &&
      !this.isNearWorkbenchAtTier(recipe.requiresWorkbenchTier, this.player.x, this.player.y)
    )
      return;
    // Reforge routing: a single-craft recipe that consumes a base gear piece
    // (armor/weapon/tool) which currently lives EQUIPPED or in the HOTBAR should
    // return its reforged result to that same spot, not dump it in the backpack
    // (the user). The consumed slot is freed by craft() first, so no backpack
    // room is needed in that case.
    const reforgeTarget = batches === 1 ? this.reforgeReturnTarget(recipe) : null;
    if (!reforgeTarget && !this.backpack.hasRoomFor(key, totalOut)) {
      this.eventLog.add("info", "Inventory full");
      return;
    }
    for (let i = 0; i < batches; i++) {
      this.crafting.craft(recipe, this.backpack, this.devNoBuildCost);
      if (reforgeTarget) this.placeReforgeOutput(key, reforgeTarget);
      else this.addToBackpack(key, outCount);
    }
    this.sfx.craft();
    this.recomputeEquipped();
    this.refreshHud();
    this.inventoryMenu.refresh();
    // Clue system (biome 2 Phase 3): the moment the player commits to the boss
    // by crafting the effigy, reveal ALL badlands altars on the map so a distant
    // one is never a dead end (the world is huge).
    if (key === "tyrant_totem") this.onTyrantTotemCrafted();
    if (key === "miretyrant_effigy") this.onMiretyrantEffigyCrafted();
  }

  // Where a reforge's output should land so it returns to where the consumed
  // base piece was. Returns null (→ normal backpack deposit) unless the recipe
  // both OUTPUTS gear and CONSUMES a matching base gear piece that lives only
  // in the hotbar or an equipped slot. craft() consumes backpack copies first,
  // so if a backpack copy exists the result stays in the backpack (null here).
  private reforgeReturnTarget(
    recipe: Recipe,
  ): { kind: "equip"; slot: EquipSlot } | { kind: "hotbar"; index: number } | null {
    const outDef = itemDef(outputKey(recipe));
    if (!outDef) return null;
    const outIsGear =
      !!outDef.weapon || !!outDef.tool || !!outDef.armorSlot;
    if (!outIsGear) return null;
    for (const ingredient of Object.keys(recipe.costs)) {
      const def = itemDef(ingredient);
      if (!def) continue;
      const isGear = !!def.weapon || !!def.tool || !!def.armorSlot;
      if (!isGear) continue;
      // A backpack copy is consumed first — leave the result in the backpack.
      if (this.backpack.count(ingredient) > 0) return null;
      // Equipped? Only redirect if the output fits the same armor slot.
      for (const s of EQUIP_SLOTS) {
        if (this.equipment.get(s.id)?.key === ingredient) {
          return outDef.armorSlot === s.id ? { kind: "equip", slot: s.id } : null;
        }
      }
      // Hotbar?
      for (let i = 0; i < this.hotbar.container.size; i++) {
        if (this.hotbar.container.slot(i)?.key === ingredient) return { kind: "hotbar", index: i };
      }
      return null; // gear ingredient not found anywhere consumable — shouldn't happen
    }
    return null;
  }

  // Deposit a reforged result back into the slot the base piece occupied. The
  // consumed slot was already emptied by craft() (equipped → unequipped, hotbar
  // stack → removed), so it's free for the fresh tier-0 result here.
  private placeReforgeOutput(
    key: string,
    target: { kind: "equip"; slot: EquipSlot } | { kind: "hotbar"; index: number },
  ): void {
    if (target.kind === "equip") {
      this.equipment.set(target.slot, { key, tier: 0 });
      this.recomputeSetBonuses(); // worn set changed — refresh cached set bonuses
    } else if (this.hotbar.container.slot(target.index) === null) {
      this.hotbar.container.set(target.index, { key, count: 1, tier: 0 });
      this.hotbarUI?.refresh();
    } else {
      this.addToBackpack(key, 1); // slot unexpectedly taken — fall back to backpack
      return;
    }
    this.discoverMaterial(key);
    this.refreshDiscovery();
  }

  // Reveal every Duneshaper altar on the world map (one-time) + point the player
  // at the nearest, so crafting the effigy always tells them where to go. The
  // altars also auto-discover when explored near and glow at night — this is the
  // load-bearing "the altar is across the map" fix (the user).
  private onTyrantTotemCrafted(): void {
    if (this.tyrantAltarsRevealed) return;
    this.tyrantAltarsRevealed = true;
    let nearest: BossAltar | null = null;
    let nearestDist = Infinity;
    for (const altar of this.bossAltars) {
      if (altar.kind !== "tyrant") continue;
      if (!altar.discoveredOnMap) {
        altar.discoveredOnMap = true;
        this.exploredMap.addLandmark({
          worldX: altar.x,
          worldY: altar.y,
          iconKey: "map_tyrant_altar",
          label: "Duneshaper's Altar",
          tint: 0x9a5ee8,
        });
      }
      const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, altar.x, altar.y);
      if (d < nearestDist) {
        nearestDist = d;
        nearest = altar;
      }
    }
    if (nearest) {
      const dir = this.compassDir(this.player.x, this.player.y, nearest.x, nearest.y);
      this.eventLog.add("combat", `The effigy tugs toward the ${dir} — a Duneshaper's Altar waits (see your map).`);
    }
  }

  // Rough 8-point compass direction from (x0,y0) toward (x1,y1) — for the
  // effigy's directional nudge (y grows downward in world space).
  private compassDir(x0: number, y0: number, x1: number, y1: number): string {
    const deg = (Phaser.Math.RadToDeg(Math.atan2(y1 - y0, x1 - x0)) + 360) % 360;
    const names = ["east", "south-east", "south", "south-west", "west", "north-west", "north", "north-east"];
    return names[Math.round(deg / 45) % 8];
  }

  private canAffordBatch(recipe: Recipe, batches: number): boolean {
    if (this.devNoBuildCost) return true;
    // availableFor counts EQUIPPED pieces too, so a T2 reforge consuming a
    // worn base piece isn't blocked here (matches Crafting.canAfford/craft).
    return (Object.entries(recipe.costs) as [ResourceType, number][]).every(
      ([resource, amount]) => this.crafting.availableFor(resource, this.backpack) >= amount * batches,
    );
  }

  // Max number of times `recipe` could be crafted right now — the lower of
  // "can afford N batches" and "backpack has room for N batches' worth of
  // output" (only meaningful for a non-placeable, stackable-output recipe;
  // batch sliders in CraftingMenu/CookingMenu use this to bound the slider).
  private maxCraftBatches(recipe: Recipe): number {
    const key = outputKey(recipe);
    const outCount = recipe.output.kind === "item" ? recipe.output.count ?? 1 : 1;
    const roomBatches = Math.floor(this.backpack.roomFor(key) / outCount);
    // DEV nobuildcost: ingredients are free, but backpack room still caps it —
    // you can't hold infinite items.
    if (this.devNoBuildCost) return Math.max(0, roomBatches);
    let costBatches = Infinity;
    for (const [resource, amount] of Object.entries(recipe.costs) as [ResourceType, number][]) {
      if (amount <= 0) continue;
      costBatches = Math.min(costBatches, Math.floor(this.backpack.count(resource) / amount));
    }
    if (!Number.isFinite(costBatches)) costBatches = 0;
    return Math.max(0, Math.min(costBatches, roomBatches));
  }

  // --- Placement mode (world-placed items: campfire, building pieces) ---

  // Enters placement mode without spending anything yet — cost is only
  // deducted per-unit, on each successful LMB placement (see
  // attemptPlaceObject). Cancelling is always free.
  //
  // Per playtest feedback, the crafting menu now STAYS OPEN through placement
  // (was: closed here, to fix an earlier "every craft click drops a
  // workbench" fall-through bug). That old bug is prevented a different way
  // now: the global pointerdown handler already returns early for any click
  // that lands on the still-open crafting panel while placementMode is set
  // (see the `craftingMenu.containsPoint` guard), so a panel click can never
  // fall through to a world placement. This also makes startPlacement
  // re-entrant: clicking a DIFFERENT placeable recipe's "Place" button while
  // already mid-placement just re-arms the ghost to the new recipe, instead
  // of being a no-op or stacking placements.
  private startPlacement(recipe: Recipe): void {
    this.suppressNextPointerdown = true;
    this.placementGhost?.destroy();
    this.placementMode = { recipe };
    const texture = itemDef(outputKey(recipe))?.texture;
    const pos = this.clampedPlacementPoint();
    this.placementGhost = this.add.image(pos.x, pos.y, texture ?? "").setAlpha(0.5).setDepth(500);
  }

  // Re-enter placement mode for a placeable the player already owns (e.g. a
  // station recovered via Destroy), consuming that stack one-per-placement
  // rather than recipe ingredients. Reached by selecting a placeable in the
  // hotbar or left-click-in-place on one in the backpack — both fire on
  // pointerup, so there's no in-flight pointerdown to swallow (unlike the
  // crafting menu's Place button, which sets suppressNextPointerdown itself).
  private startItemPlacement(container: ItemContainer, index: number): void {
    if (this.placementMode) return;
    const stack = container.slot(index);
    if (!stack) return;
    const def = itemDef(stack.key);
    if (!def?.placeable) return;
    const recipe = RECIPES.find((r) => outputKey(r) === stack.key);
    if (!recipe) return;
    // Placement intercepts world clicks, so an open menu would otherwise sit
    // in front of the ghost — close the crafting menu and Drying Rack popup
    // (neither needs to stay open while placing), but deliberately leave the
    // inventory open so several items can be placed in a row without
    // reopening it each time (the global pointerdown handler guards against
    // clicking through the still-open panel, see below).
    this.craftingMenu.close();
    this.closeDryingRackMenu();
    this.closeCookingMenu();
    this.closeJewelryMenu();
    this.closeChestMenu();
    this.closeRelicForgeMenu();
    this.placementMode = { recipe, itemSource: { container, key: stack.key } };
    const pos = this.clampedPlacementPoint();
    this.placementGhost = this.add.image(pos.x, pos.y, def.texture).setAlpha(0.5).setDepth(500);
  }

  private cancelPlacement(): void {
    this.placementMode = null;
    this.placementGhost?.destroy();
    this.placementGhost = null;
    this.placementHintText.setVisible(false);
    this.input.setDefaultCursor("default");
  }

  // Cursor's world position, clamped to PLACEMENT_RADIUS of the player so a
  // placement is always valid regardless of how far away the mouse is.
  private clampedPlacementPoint(): { x: number; y: number } {
    const pointer = this.input.activePointer;
    const world = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
    const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, world.x, world.y);
    if (dist <= PLACEMENT_RADIUS) return { x: world.x, y: world.y };
    const angle = Phaser.Math.Angle.Between(this.player.x, this.player.y, world.x, world.y);
    return {
      x: this.player.x + Math.cos(angle) * PLACEMENT_RADIUS,
      y: this.player.y + Math.sin(angle) * PLACEMENT_RADIUS,
    };
  }

  private updatePlacementGhost(): void {
    if (!this.placementMode || !this.placementGhost) return;
    const pos = this.clampedPlacementPoint();
    this.placementGhost.setPosition(pos.x, pos.y);
    const name = itemDef(outputKey(this.placementMode.recipe))?.name ?? "item";
    this.placementHintText.setText(`[LMB] Place ${name}   [RMB] Cancel`).setVisible(true);
    this.input.setDefaultCursor("pointer");
  }

  // LMB while in placement mode: deducts cost and spawns the world object,
  // then re-arms placement mode so another can be placed immediately.
  private attemptPlaceObject(): void {
    if (!this.placementMode) return;
    const recipe = this.placementMode.recipe;
    const itemSource = this.placementMode.itemSource;
    // Affordability: an item-source placement just needs one of the owned
    // stack left (running out ends placement); a craft placement needs the
    // recipe's ingredients.
    if (itemSource) {
      if (itemSource.container.count(itemSource.key) < 1) {
        this.cancelPlacement();
        return;
      }
    } else if (!this.devNoBuildCost && !this.crafting.canAfford(recipe, this.backpack)) {
      const name = itemDef(outputKey(recipe))?.name ?? "item";
      this.eventLog.add("info", `Out of materials for ${name}`);
      this.cancelPlacement();
      return;
    }
    // Tier 1+ placeables (the Drying Rack) need the player standing near a
    // Workbench to place, same gate craftRecipe() already applies to
    // non-placeable tier 1+ recipes. A failed check keeps placement armed (the
    // ghost stays on the cursor) so walking into range lets the next click
    // succeed without reopening the crafting menu — only an explicit cancel or
    // a successful placement leaves placement mode.
    if (recipe.tier > 0 && !this.isNearWorkbench(this.player.x, this.player.y)) {
      this.eventLog.add("info", "Requires a nearby Workbench");
      return;
    }
    if (
      recipe.requiresWorkbenchTier !== undefined &&
      !this.isNearWorkbenchAtTier(recipe.requiresWorkbenchTier, this.player.x, this.player.y)
    ) {
      this.eventLog.add("info", `Requires a nearby ${stationDisplayName("workbench", recipe.requiresWorkbenchTier)}`);
      return;
    }
    // An owned placeable carries its per-instance upgrade tier on the stack;
    // consume that exact slot (not removeCount, which could eat a different
    // tier's stack) so the tier travels onto the placed image. Crafted
    // placements always start at tier 0.
    let placedTier = 0;
    let placedUpgrades: string[] | undefined;
    if (itemSource) {
      const idx = this.findConsumableStack(itemSource.container, itemSource.key);
      if (idx === null) {
        this.cancelPlacement();
        return;
      }
      const src = itemSource.container.slot(idx);
      placedTier = src?.tier ?? 0;
      placedUpgrades = src?.upgrades;
      itemSource.container.set(idx, null);
    } else {
      this.crafting.craft(recipe, this.backpack, this.devNoBuildCost);
    }
    const pos = this.clampedPlacementPoint();
    const key = outputKey(recipe);
    const texture = itemDef(key)?.texture;
    const image = this.add.image(pos.x, pos.y, texture ?? "");
    image.setData("itemKey", key);
    // Placed stations (Workbench, Drying Rack, Smelter, ...) wash out against
    // the mottled badlands floor. A soft dark outline glow makes them read as
    // a built object rather than terrain. WebGL-only (postFX); a Canvas
    // fallback simply skips it — the outline is polish, not load-bearing. — S6
    if (this.sys.game.renderer.type === Phaser.WEBGL) {
      image.postFX.addGlow(0x000000, 5, 0, false, 0.1, 8);
    }
    if (placedUpgrades && placedUpgrades.length > 0) {
      image.setData("upgrades", [...placedUpgrades]);
    }
    if (placedTier > 0) {
      image.setData("tier", placedTier);
      this.applyTierVisual(image, placedTier);
    }
    this.placedObjects.push(image);
    // No SFX on placement (the user: "placing benches down doesn't need to make a
    // noise") — the craft cue already plays for non-placeable crafts.
    // A placed station counts as "discovered" so its upgrades become visible
    // while it's on the ground. Previously a Smelter's Ember Crucible upgrade
    // only appeared once the Smelter was picked back up into the backpack
    // (placeables skip the backpack on craft, so they were never discovered) — S5.
    this.discovered.add(key);
    this.refreshStationLabel(image);
    // First time they put a station down, teach the right-click inspect/upgrade
    // gesture (also covered for equipped gear at the armor-equip site).
    this.hints.trigger("right_click_tip");
    // Placing a Workbench for the first time can newly unlock tier 1+
    // recipes' visibility (see Crafting.refresh's workbenchPlaced gate) —
    // re-run discovery so that happens immediately, not just on next pickup.
    if (key === "workbench") {
      this.everPlacedWorkbench = true;
      // A re-placed, already-upgraded Workbench keeps its reached tier sticky
      // so its tier-gated recipes stay unlocked.
      this.everMaxWorkbenchTier = Math.max(this.everMaxWorkbenchTier, placedTier);
      this.refreshDiscovery();
    }
    // A placed Drying Rack gets its own processing state, ticked in update()
    // and bound to the menu when the player interacts with this image.
    if (key === "drying_rack") this.dryingRacks.push({ image, station: new ProcessingStation() });
    // A placed Smelter gets its own smelt-recipe ProcessingStation; seed its
    // tier from the placed stack (a re-placed upgraded Smelter keeps rare-ore
    // smelting) so it works even before the menu is opened.
    if (key === "smelter") {
      const station = new ProcessingStation(SMELT_RECIPES);
      station.setTier(placedTier);
      this.smelters.push({ image, station });
    }
    // Placing a Campfire discovers the cook recipes its tier can make (tier-0
    // dishes for a fresh one; also tier-1 if this is a re-placed Lvl 2 campfire).
    if (key === "campfire") this.discoverCookRecipes(placedTier);
    this.refreshHud();
    this.inventoryMenu.refresh();
    // The crafting menu can now stay open through placement (see
    // startPlacement) — keep its live cost readout in sync as materials are
    // spent on each successive placement.
    this.craftingMenu.refresh();
    // Placing from an owned stack changed a count — keep the hotbar display in
    // sync too (refreshHud only touches the crafting/inventory menus).
    if (itemSource) this.hotbarUI.refresh();
    // A freshly placed station may already have an affordable upgrade — surface
    // its glyph now (and a re-placed tiered station shows the right glyph state).
    this.refreshStationUpgradeIndicators();
    // A single placement exits placement mode — per playtest feedback, "place
    // another one" auto-re-arming wasn't wanted (was built anticipating a
    // different use case that never landed). Explicit re-entry (a fresh Place
    // click, or selecting the item again) is one extra click, which is fine.
    this.cancelPlacement();
  }

  // First slot holding `key` — the one an item-source placement consumes.
  // Placeables are maxStack 1, so each stack is a single instance; this returns
  // the slot so its per-instance tier can be read before removal.
  private findConsumableStack(container: ItemContainer, key: string): number | null {
    for (let i = 0; i < container.size; i++) {
      if (container.slot(i)?.key === key) return i;
    }
    return null;
  }

  // "Am I near a placed Workbench" — used to gate actually crafting/placing
  // an already-discovered tier-1+ recipe. Loose proximity, not a precise
  // click, so it's a bigger radius than REACH.
  private isNearWorkbench(x: number, y: number, radius: number = WORKBENCH_RANGE): boolean {
    if (this.devNoBuildCost) return true;
    return this.placedObjects.some(
      (obj) =>
        obj.getData("itemKey") === "workbench" &&
        Phaser.Math.Distance.Between(x, y, obj.x, obj.y) <= radius,
    );
  }

  // Like isNearWorkbench, but additionally requires the nearby Workbench to
  // have reached at least `minTier` itself (e.g. Gremlin Pants' lvl-2 upgrade
  // needing a Tool-Sharpener-upgraded Workbench, not just any Workbench).
  private isNearWorkbenchAtTier(minTier: number, x: number, y: number, radius: number = WORKBENCH_RANGE): boolean {
    if (this.devNoBuildCost) return true;
    return this.placedObjects.some(
      (obj) =>
        obj.getData("itemKey") === "workbench" &&
        ((obj.getData("tier") as number | undefined) ?? 0) >= minTier &&
        Phaser.Math.Distance.Between(x, y, obj.x, obj.y) <= radius,
    );
  }

  // "Is there a placed Campfire within `radius` of (x, y)" — mirrors
  // isNearWorkbench exactly, just filtered on a different itemKey. Used by
  // Comfort's HP regen, which has no function at all without a nearby fire.
  private isNearCampfire(x: number, y: number, radius: number): boolean {
    return this.placedObjects.some(
      (obj) => obj.getData("itemKey") === "campfire" && Phaser.Math.Distance.Between(x, y, obj.x, obj.y) <= radius,
    );
  }

  // Every roll of a world container goes through here so the epic pool can never
  // be forgotten at a call site (and so a future POI gets it by construction).
  // A scene method rather than a free function only so it can reach the
  // run-scoped pity counter, which has to be shared across every container.
  private rollContainerLoot(loot: LootContainer, table: LootRollEntry[]): void {
    // Never hand out a special/epic item the player already owns — those are
    // maxStack-1 uniques (usually ability-granting), so a duplicate is pure
    // waste. Filter the pool against current ownership before rolling; if that
    // empties it, rollIfEmpty simply skips the epic (and doesn't burn pity).
    const pool = epicPoolFor(table);
    const keys = pool.keys.filter((k) => !this.ownsItemAnywhere(k) && !this.epicsGranted.has(k));
    const before = keys.map((k) => loot.items.count(k));
    loot.rollIfEmpty(table, { epics: { chance: pool.chance, keys }, pity: this.epicPity });
    // Reserve whatever this container actually got, so no OTHER container can
    // roll the same unique. The ownership filter above can't do this on its own:
    // every world container is pre-rolled during create() (so its glow reflects
    // its contents from the start), at which point the player owns nothing at
    // all — so two chests happily rolled the same epic (the user: "duplicate epic
    // items should never be present in chests"). One copy per run, per key.
    keys.forEach((k, i) => {
      if (loot.items.count(k) > before[i]) this.epicsGranted.add(k);
    });
  }

  // True if the player holds `key` anywhere it can live: backpack, hotbar, or
  // any equipment slot. Used to keep duplicate uniques out of loot rolls.
  private ownsItemAnywhere(key: string): boolean {
    if (this.backpack.count(key) > 0) return true;
    if (this.hotbar.container.count(key) > 0) return true;
    for (const s of EQUIP_SLOTS) if (this.equipment.get(s.id)?.key === key) return true;
    return false;
  }

  // Is any live enemy currently HUNTING the player from close enough to matter.
  // Used by Comfort's "safe to rest" check. Two revisions deep now:
  //   1. Originally a flat proximity radius — tripped by harmless enemies just
  //      idling nearby, so it became aggro-only.
  //   2. Aggro-only, world-wide, then broke completely in the badlands (the user
  //      playtest): a Duskrunner leashes for 620px and barely ever deaggros, so
  //      somewhere on a 28000px map SOMETHING is always hunting you and Comfort
  //      simply never fired again.
  // So: aggro AND within a generous radius. Both conditions carry their own
  // lesson — an idler nearby doesn't block resting, and a hunter on the far
  // side of the world isn't your problem.
  private isAnyEnemyAggro(): boolean {
    for (const enemy of this.enemies) {
      if (enemy.depleted || !enemy.isAggro()) continue;
      if (Phaser.Math.Distance.Between(this.player.x, this.player.y, enemy.x, enemy.y) <= COMFORT_THREAT_RADIUS) {
        return true;
      }
    }
    return false;
  }

  // Comfort (Bedroll): live/conditional HP regen, not a stored buff — every
  // frame all three conditions hold (near a Bedroll, that Bedroll near a
  // Campfire, no enemy nearby), refresh a short-lived "Resting" buff via the
  // existing BuffManager/BuffBarUI so it renders exactly like a food buff.
  // The instant a condition breaks, we simply stop refreshing it and it
  // expires on its own within its own short durationMs.
  private updateComfortRegen(): void {
    // Comfort's Resting regen takes the same penalty as every other heal source.
    if (this.currentRegenMult <= 0) return;
    // Highest campfire tier fuelling a Bedroll the player is resting on. -1 = not
    // resting (no qualifying Bedroll+Campfire pair). The rate scales with the fire
    // (the user: "resting regen should go up based on your campfire level").
    let campfireTier = -1;
    for (const bed of this.placedObjects) {
      if (bed.getData("itemKey") !== "comfort") continue;
      if (Phaser.Math.Distance.Between(this.player.x, this.player.y, bed.x, bed.y) > COMFORT_RANGE) continue;
      for (const fire of this.placedObjects) {
        if (fire.getData("itemKey") !== "campfire") continue;
        if (Phaser.Math.Distance.Between(bed.x, bed.y, fire.x, fire.y) > COMFORT_CAMPFIRE_RANGE) continue;
        campfireTier = Math.max(campfireTier, (fire.getData("tier") as number | undefined) ?? 0);
      }
    }
    if (campfireTier >= 0 && !this.isAnyEnemyAggro()) {
      // Lvl 1 (tier 0) → 1 HP/s (still under the weakest food buff), each campfire
      // level adds +1. Applied at FULL rate — the regen penalty is applied once,
      // centrally, in buffs.tick(). Pre-scaling here too would penalize Comfort
      // twice (0.5 × 0.5 while poisoned) and make it the one heal source with
      // different math.
      const hpPerSec = 1 + campfireTier;
      this.buffs.apply({ id: "comfort_rest", name: "Resting", icon: "icon_comfort", hpPerSec, durationMs: 400 });
    }
  }

  // Has the player ever placed a Workbench, anywhere — separate from (and
  // prior to) isNearWorkbench's "currently in range" check. Gates whether
  // tier 1+ recipes are discoverable/visible at all in the crafting menu.
  // Sticky forever (everPlacedWorkbench) — destroying the Workbench later
  // must NOT re-lock recipes the player already discovered/knows about.
  private hasWorkbenchPlaced(): boolean {
    return this.everPlacedWorkbench;
  }

  // --- Placed-object management (right-click Upgrade/Destroy) ---

  // Nearest placed object under a world point, within a small hover radius,
  // or null. Generic across every placeable type (Workbench, Campfire,
  // Drying Rack, ...) — one system covers all of them, not a per-type one.
  private findPlacedObjectNear(worldX: number, worldY: number): Phaser.GameObjects.Image | null {
    let best: Phaser.GameObjects.Image | null = null;
    let bestDist = Infinity;
    for (const obj of this.placedObjects) {
      const radius = Math.max(obj.displayWidth, obj.displayHeight) / 2 + 6;
      const d = Phaser.Math.Distance.Between(worldX, worldY, obj.x, obj.y);
      if (d <= radius && d < bestDist) {
        best = obj;
        bestDist = d;
      }
    }
    return best;
  }

  // Right-click on a placed object, in reach, opens its Upgrade/Destroy popup.
  private tryOpenContextMenu(pointer: Phaser.Input.Pointer): void {
    const world = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
    const obj = this.findPlacedObjectNear(world.x, world.y);
    if (!obj) return;
    const inReach = Phaser.Math.Distance.Between(this.player.x, this.player.y, obj.x, obj.y) <= REACH;
    if (!inReach) return;
    this.openContextMenuForObject(obj, pointer.x, pointer.y);
  }

  // Tiny two-row popup: "Upgrade" always opens the full UpgradeMenu (even
  // with nothing discovered yet — that renders its own "No upgrades
  // discovered yet" empty state rather than hiding the button), "Destroy"
  // always works. The actual upgrade list/costs/affordability live in the
  // bigger panel now, not here.
  private openContextMenuForObject(obj: Phaser.GameObjects.Image, screenX: number, screenY: number): void {
    // The ContextMenu row closes the popup before running onClick, so this same
    // click's scene-level pointerdown fires afterward with the menu already
    // closed and would fall through to a world interact (e.g. reopening the
    // Campfire/Workbench menu right after Destroy). Suppress that next
    // pointerdown, same guard the "Place" button double-fire uses.
    const items: ContextMenuItem[] = [
      { label: "Upgrade", enabled: true, onClick: () => { this.suppressNextPointerdown = true; this.openUpgradeMenu(obj); } },
      // "Pick up", not "Destroy" — the object returns as a recoverable loose
      // item (Minecraft-style), it isn't deleted. (Deleting a backpack stack
      // stays "Destroy" — that one really does delete.)
      { label: "Pick up", enabled: true, onClick: () => { this.suppressNextPointerdown = true; this.destroyPlacedObject(obj); } },
    ];
    this.contextMenu.show(screenX, screenY, items);
  }

  // Discriminators for the three kinds of upgrade target — a placed world
  // object (Image), an equipped armor slot, or a weapon sitting in a
  // container (backpack or hotbar) slot.
  private isArmorUpgradeTarget(t: NonNullable<MainScene["upgradeTarget"]>): t is { armorSlot: EquipSlot } {
    return "armorSlot" in t;
  }
  private isGearUpgradeTarget(
    t: NonNullable<MainScene["upgradeTarget"]>,
  ): t is { gearSlot: { container: ItemContainer; index: number } } {
    return "gearSlot" in t;
  }

  private createUpgradeMenu(): void {
    this.upgradeMenu = new UpgradeMenu(this, {
      target: () => {
        const t = this.upgradeTarget;
        if (!t) return null;
        if (this.isArmorUpgradeTarget(t)) {
          const eq = this.equipment.get(t.armorSlot);
          return eq ? { itemKey: eq.key, tier: eq.tier } : null;
        }
        if (this.isGearUpgradeTarget(t)) {
          const stack = t.gearSlot.container.slot(t.gearSlot.index);
          return stack ? { itemKey: stack.key, tier: stack.tier ?? 0 } : null;
        }
        return { itemKey: t.getData("itemKey") as string, tier: (t.getData("tier") as number | undefined) ?? 0 };
      },
      // Station, armor, and weapon upgrades are keyed by disjoint itemKeys,
      // so concatenating all three tables is safe — only one ever matches.
      upgradesFor: (itemKey) => [
        ...upgradesForItem(itemKey),
        ...armorUpgradesForItem(itemKey),
        ...weaponUpgradesForItem(itemKey),
        ...toolUpgradesForItem(itemKey),
        // Gem augments (biome 3 Phase 3) sit alongside the tier ladder in the
        // same panel — they're keyed by the same itemKey but run the no-ladder
        // model (see UpgradeMenu's appliedAugmentIds branch).
        ...augmentsForItem(itemKey),
      ],
      isDiscovered: (upg) => this.upgradeIngredientsKnown(upg),
      canAfford: (upg) => this.canAffordUpgrade(upg),
      // Non-null for a placed station/processor (its applied-upgrade set drives
      // the no-ladder menu: any discovered, not-yet-applied upgrade is
      // offerable and applying it is +1 level). Null for worn weapon/armor,
      // which keep the resultTier ladder.
      appliedUpgradeIds: () => {
        const t = this.upgradeTarget;
        if (!t || this.isArmorUpgradeTarget(t) || this.isGearUpgradeTarget(t)) return null;
        return new Set((t.getData("upgrades") as string[] | undefined) ?? []);
      },
      // Non-null only when the target is an augmentable gear INSTANCE — a worn
      // paper-doll piece or a weapon/armor stack in a container. Reads the same
      // `upgrades` field a placed station's applied set lives on.
      appliedAugmentIds: () => {
        const inst = this.upgradeTargetInstance();
        if (!inst || !isAugmentableItem(inst.key)) return null;
        return new Set(appliedAugmentIds(inst));
      },
      // Recipe discovery, not placement: knowing the Gemwright's Table exists is
      // what makes "set gems at the Gemwright's Table" a useful pointer rather
      // than a spoiler for a station the player has never heard of.
      gemsUnlocked: () => this.crafting.discoveredRecipes().some((r) => r.id === "jewelry_station"),
      extraBlockReason: (upg) => this.upgradeBlockReason(upg),
      formatCost: (upg) => this.formatUpgradeCost(upg),
      displayName: (itemKey, tier) => stationDisplayName(itemKey, tier),
      apply: (upg) => {
        const t = this.upgradeTarget;
        if (!t) return;
        if (isGearAugment(upg)) this.applyGearAugment(upg);
        else if (this.isArmorUpgradeTarget(t)) this.applyArmorUpgrade(t.armorSlot, upg as ArmorUpgradeDef);
        else if (this.isGearUpgradeTarget(t)) {
          this.applyGearUpgrade(t.gearSlot.container, t.gearSlot.index, upg as WeaponUpgradeDef | ArmorUpgradeDef);
        } else this.applyStationUpgrade(t, upg as StationUpgradeDef);
      },
    });
  }

  private openUpgradeMenu(obj: Phaser.GameObjects.Image): void {
    this.craftingMenu.close();
    this.inventoryMenu.close();
    this.closeDryingRackMenu();
    this.closeCookingMenu();
    this.closeJewelryMenu();
    this.closeChestMenu();
    this.closeRelicForgeMenu();
    this.upgradeTarget = obj;
    this.upgradeMenu.openMenu();
  }

  // Right-click on an occupied paper-doll slot opens the same Upgrade panel,
  // bound to that equipped item instead of a placed object — mirrors
  // openUpgradeMenu's close-everything-else behavior for consistency.
  // Docks the panel to the right of the (left-open) InventoryMenu, top edges
  // aligned, and deliberately leaves the inventory open — unlike a placed
  // station's centered Upgrade panel, this one is meant to sit alongside the
  // paper-doll it's editing.
  private openArmorUpgradeMenu(slot: EquipSlot): void {
    if (!this.equipment.get(slot)) return;
    this.craftingMenu.close();
    this.closeDryingRackMenu();
    this.closeCookingMenu();
    this.closeChestMenu();
    this.closeRelicForgeMenu();
    this.upgradeTarget = { armorSlot: slot };
    this.upgradeMenu.openMenu({ x: INVENTORY_PANEL_X + INVENTORY_PANEL_W + 12, y: INVENTORY_PANEL_Y });
  }

  // Right-click on a gear item — a weapon/tool OR an armor piece — sitting in a
  // container (backpack or hotbar) opens the same Upgrade panel, bound to that
  // specific ItemStack. (Equipped armor upgrades via the paper-doll slot instead;
  // see openArmorUpgradeMenu.) Mirrors openArmorUpgradeMenu's "dock beside the
  // inventory if it's open" behavior when it is, otherwise opens centered like a
  // placed station's panel.
  private openGearUpgradeMenu(container: ItemContainer, index: number): void {
    if (!container.slot(index)) return;
    this.craftingMenu.close();
    this.closeDryingRackMenu();
    this.closeCookingMenu();
    this.closeChestMenu();
    this.closeRelicForgeMenu();
    this.upgradeTarget = { gearSlot: { container, index } };
    if (this.inventoryMenu.isOpen()) {
      this.upgradeMenu.openMenu({ x: INVENTORY_PANEL_X + INVENTORY_PANEL_W + 12, y: INVENTORY_PANEL_Y });
    } else {
      this.upgradeMenu.openMenu();
    }
  }

  private closeUpgradeMenu(): void {
    this.upgradeMenu.close();
    this.upgradeTarget = null;
  }

  // Creates (or updates the text of) the floating level label for a placed
  // station that has at least one defined upgrade — no-op for stations with
  // no upgrades defined at all (Campfire, Drying Rack today). Starts hidden;
  // updateHover() is what actually shows it while the mouse is over the
  // object, same as the world-hover pattern used elsewhere.
  private refreshStationLabel(obj: Phaser.GameObjects.Image): void {
    const itemKey = obj.getData("itemKey") as string;
    if (upgradesForItem(itemKey).length === 0) return;
    const tier = (obj.getData("tier") as number | undefined) ?? 0;
    const text = stationDisplayName(itemKey, tier);
    const existing = this.placedLabels.get(obj);
    if (existing) {
      existing.setText(text);
      return;
    }
    const label = this.add
      .text(obj.x, obj.y - obj.displayHeight / 2 - 6, text, {
        fontFamily: "monospace",
        fontSize: "11px",
        color: "#e8ecf2",
        backgroundColor: "#0a0a0a",
        padding: { x: 3, y: 1 },
      })
      .setOrigin(0.5, 1)
      // A world-space label had no explicit depth (default 0), so a nearby
      // placed object's own y-sorted depth (up to ~2400) could render right
      // over it — "hover a bench, the text is hidden behind other benches".
      // Pin it above every world object but still below the fixed HUD
      // (2600+), like the hover-highlight outline's own depth convention.
      .setDepth(2500)
      .setVisible(false);
    this.placedLabels.set(obj, label);
  }

  private upgradeIngredientsKnown(upg: UpgradeDef): boolean {
    // DEV free-craft: upgrades are freely available regardless of what mats
    // have been discovered (grants "free upgrades" — the cost is already
    // waived by canAffordUpgrade under the same flag).
    if (this.devNoBuildCost) return true;
    if (!Object.keys(upg.costs).every((r) => this.discovered.has(r))) return false;
    // A station upgrade shouldn't be discoverable/announced before the player
    // has ever discovered the station it applies to (e.g. Ember Crucible
    // shouldn't unlock off just having a Gremlin King's Heart in hand if the
    // Smelter itself hasn't been built yet) — armor/weapon upgrades have no
    // "appliesToItemKey" station gate, so this only narrows StationUpgradeDef.
    if ("appliesToItemKey" in upg && !this.discovered.has((upg as StationUpgradeDef).appliesToItemKey)) return false;
    return true;
  }

  // How many of `key` the player HOLDS, backpack plus hotbar.
  //
  // Upgrades used to count the backpack only, which is what the user hit twice:
  // "I placed down workbench, built the gloamsteel, 100% had enough materials to
  // upgrade to lvl 5 and it did not show the upgrade available icon". Ingots and
  // reforge inputs routinely live on the hotbar, so the affordability check (and
  // therefore the floating ▲ glyph, which is driven by it) silently read zero.
  // Crafting was already fixed for exactly this complaint — see Crafting.ts's
  // hotbar reference, added off "still not looking at items in hotbar when
  // considering upgrades" — but the fix never reached the upgrade path. This is
  // that same rule, applied here.
  private heldCount(key: string): number {
    return this.backpack.count(key) + this.hotbar.container.count(key);
  }

  // Spend `n` of `key` from the backpack first, then the hotbar for the
  // remainder — mirrors kindleShrine's split so a cost can be paid from wherever
  // the material actually sits.
  private consumeHeld(key: string, n: number): void {
    const fromPack = Math.min(n, this.backpack.count(key));
    if (fromPack > 0) this.backpack.removeCount(key, fromPack);
    if (fromPack < n) this.hotbar.container.removeCount(key, n - fromPack);
  }

  private canAffordUpgrade(upg: UpgradeDef): boolean {
    if (this.devNoBuildCost) return true;
    return Object.entries(upg.costs).every(([r, n]) => this.heldCount(r) >= (n ?? 0));
  }

  // Owned/required per resource, mirroring CraftingMenu's detail panel
  // (`${resource}: ${have}/${amount}`) so both "what do I need" panels read
  // the same way.
  private formatUpgradeCost(upg: UpgradeDef): string {
    return Object.entries(upg.costs)
      .map(([r, n]) => `${itemDef(r)?.name ?? r}: ${this.heldCount(r)}/${n}`)
      .join(", ");
  }

  // Extra gate beyond raw materials, shared by both station and armor
  // upgrades. Two layers:
  // 1. General rule (per the user): whatever Workbench-proximity was needed
  //    to CRAFT the base item (recipe.tier >= 1) is also needed to UPGRADE
  //    it — e.g. gremlin_cap/shirt/pants are tier-1 recipes, so all three
  //    now require a nearby Workbench to upgrade too (previously only
  //    Pants had any workbench check at all). A tier-0 item (Workbench
  //    itself, the only station with an upgrade today) needs no separate
  //    check here — right-clicking it to open this panel already requires
  //    standing at that very workbench.
  // 2. Armor-specific extra gate: `requiresWorkbenchTier` (e.g. Gremlin
  //    Pants lvl 2 needing a Tool-Sharpener-upgraded Workbench specifically,
  //    not just any workbench) — checked second so a player with no nearby
  //    workbench at all sees the more helpful generic message first.
  private upgradeBlockReason(upg: UpgradeDef): string | null {
    // A gem augment has no single appliesToItemKey (it fits a family of pieces),
    // so the generic "needs the bench you crafted it at" rule is skipped for it -
    // its own requiresWorkbenchTier below is the gate.
    const targetKey = "appliesToItemKey" in upg ? upg.appliesToItemKey : undefined;
    const recipe = targetKey ? RECIPES.find((r) => outputKey(r) === targetKey) : undefined;
    if (recipe && recipe.tier > 0 && !this.isNearWorkbench(this.player.x, this.player.y)) {
      return "Requires a nearby Workbench";
    }
    if ("requiresWorkbenchTier" in upg && upg.requiresWorkbenchTier !== undefined) {
      if (this.isNearWorkbenchAtTier(upg.requiresWorkbenchTier, this.player.x, this.player.y)) return null;
      return `Requires nearby ${stationDisplayName("workbench", upg.requiresWorkbenchTier)}`;
    }
    return null;
  }

  // Deducts a named upgrade's cost from the backpack and bumps this specific
  // placed station's tier (persisted on the Image's data, and carried into the
  // pickup on Destroy). Generic across stations — the visual tell is shared.
  private applyStationUpgrade(obj: Phaser.GameObjects.Image, upg: StationUpgradeDef): void {
    if (!this.canAffordUpgrade(upg) || this.upgradeBlockReason(upg)) return;
    const applied = (obj.getData("upgrades") as string[] | undefined) ?? [];
    // No-ladder model: applying any not-yet-applied upgrade bumps the level by
    // exactly +1 (level == count of applied upgrades). The specific upgrade
    // determines cost/effect; the tier number is just the count. Guard against
    // a double-apply of the same id (the menu already filters applied ones).
    if (applied.includes(upg.id)) return;
    if (!this.devNoBuildCost) for (const [r, n] of Object.entries(upg.costs)) this.consumeHeld(r, n ?? 0);
    applied.push(upg.id);
    this.sfx.upgrade();
    const tier = applied.length;
    obj.setData("upgrades", applied);
    obj.setData("tier", tier);
    this.applyTierVisual(obj, tier);
    this.refreshStationLabel(obj);
    const itemKey = obj.getData("itemKey") as string;
    // A placed Smelter's ProcessingStation re-reads its tier from this image's
    // data when its menu opens (see openSmelter), so obj.setData("tier") above
    // is enough — no separate station sync needed here.
    // "recipe" kind (not "info") so this uses the left-anchored, under-
    // inventory toast lane instead of the top-center one — the top-center
    // toast used to render right over the just-opened Upgrade panel.
    this.eventLog.add("recipe", `${stationDisplayName(itemKey, tier)} upgraded: ${upg.name}`, itemDef(itemKey)?.texture);
    // Upgrading a Campfire raises its level, unlocking (and announcing) the
    // dishes that level can cook.
    if (itemKey === "campfire") this.discoverCookRecipes(tier);
    // Reaching a new Workbench tier newly unlocks the recipes gated on it
    // (Sunsteel at Lvl 3, Embersteel at Lvl 4) — bump the sticky max and
    // re-run discovery so they appear the moment the bench is upgraded, not
    // only on the next pickup/craft — S5.
    if (itemKey === "workbench") {
      this.everMaxWorkbenchTier = Math.max(this.everMaxWorkbenchTier, tier);
      this.refreshDiscovery();
    }
    this.upgradeMenu.refresh();
    this.afterItemMove();
  }

  // The gear INSTANCE the Upgrade panel is currently bound to — a worn
  // paper-doll piece or a stack in a container — or null for a placed station.
  // Both instance shapes carry `key` + the optional `upgrades` augment set, which
  // is all the augment path needs to read.
  private upgradeTargetInstance(): { key: string; upgrades?: string[] } | null {
    const t = this.upgradeTarget;
    if (!t) return null;
    if (this.isArmorUpgradeTarget(t)) return this.equipment.get(t.armorSlot);
    if (this.isGearUpgradeTarget(t)) return t.gearSlot.container.slot(t.gearSlot.index);
    return null;
  }

  // Apply a gem augment to whichever gear instance the panel is bound to
  // (worn or held). Deducts the cost and appends the augment id to that
  // instance's `upgrades` set — the item's own `tier` is untouched, so tiers and
  // augments compose. Capped at MAX_AUGMENTS_PER_ITEM; the menu greys the rows
  // at the cap, this is the belt-and-braces guard.

  // === B4-P5: gem setting, addressable from the Gemwright's Table ===
  //
  // applyGearAugment above is bound to `this.upgradeTarget` — whatever the
  // right-click Upgrade panel happens to be pointed at. The Gemwright needs to
  // set a gem on an item the player PICKS from a list, so these address an item
  // directly. Same rules enforced in both places (cost, the 2-per-item cap, no
  // duplicate augment); only the addressing differs.
  augmentTargets(): { id: string; label: string; key: string; texture: string; applied: string[] }[] {
    const out: { id: string; label: string; key: string; texture: string; applied: string[] }[] = [];
    for (const slot of EQUIP_SLOTS) {
      const eq = this.equipment.get(slot.id);
      if (!eq || !isAugmentableItem(eq.key)) continue;
      out.push({
        id: `equip:${slot.id}`,
        label: `${itemDef(eq.key)?.name ?? eq.key} (worn)`,
        key: eq.key,
        texture: itemDef(eq.key)?.texture ?? "",
        applied: appliedAugmentIds(eq),
      });
    }
    // Weapons live in the hotbar, not an equipment slot — scan it too, or an
    // equipped weapon never appears in the Set Gems list (the user: "weapons not
    // showing up in the Set Gems section").
    const hb = this.hotbar.container.all();
    for (let i = 0; i < hb.length; i++) {
      const st = hb[i];
      if (!st || !isAugmentableItem(st.key)) continue;
      out.push({
        id: `hotbar:${i}`,
        label: `${itemDef(st.key)?.name ?? st.key} (equipped)`,
        key: st.key,
        texture: itemDef(st.key)?.texture ?? "",
        applied: appliedAugmentIds(st),
      });
    }
    const all = this.backpack.all();
    for (let i = 0; i < all.length; i++) {
      const st = all[i];
      if (!st || !isAugmentableItem(st.key)) continue;
      out.push({
        id: `bag:${i}`,
        label: itemDef(st.key)?.name ?? st.key,
        key: st.key,
        texture: itemDef(st.key)?.texture ?? "",
        applied: appliedAugmentIds(st),
      });
    }
    return out;
  }

  // Apply `augId` to the item addressed by `targetId` (see augmentTargets).
  // Returns true if it was actually set.
  applyAugmentToTarget(targetId: string, augId: string): boolean {
    const aug = GEAR_AUGMENTS.find((a) => a.id === augId);
    if (!aug) return false;
    const [kind, ref] = targetId.split(":");
    const equipped = kind === "equip" ? this.equipment.get(ref as EquipSlot) : null;
    // "hotbar:" routes to the hotbar container (equipped weapons); "bag:" to the
    // backpack. Previously anything non-equip was assumed to be the backpack,
    // which mis-addressed a hotbar weapon's slot index.
    const container = kind === "hotbar" ? this.hotbar.container : kind === "bag" ? this.backpack : null;
    const stack = container ? container.slot(Number(ref)) : null;
    const inst = equipped ?? stack;
    if (!inst) return false;
    if (!aug.appliesToItemKeys.includes(inst.key)) return false;
    const applied = appliedAugmentIds(inst);
    if (applied.includes(aug.id) || applied.length >= MAX_AUGMENTS_PER_ITEM) return false;
    if (!this.devNoBuildCost) {
      for (const [r, n] of Object.entries(aug.costs)) {
        if (this.heldCount(r) < (n ?? 0)) return false;
      }
      for (const [r, n] of Object.entries(aug.costs)) this.consumeHeld(r, n ?? 0);
    }
    const next = [...(inst.upgrades ?? []), aug.id];
    if (equipped) {
      this.equipment.set(ref as EquipSlot, { ...equipped, upgrades: next });
    } else if (stack && container) {
      container.set(Number(ref), { ...stack, upgrades: next });
    }
    this.sfx.upgrade();
    this.eventLog.add("recipe", `${itemDef(inst.key)?.name ?? inst.key} augmented: ${aug.name}`, itemDef(inst.key)?.texture);
    this.recomputeEquipped();
    this.afterItemMove();
    return true;
  }

  // Gems the player can currently set: discovered, and affordable.
  availableAugments(): GearAugmentDef[] {
    return GEAR_AUGMENTS.filter((a) => this.upgradeIngredientsKnown(a));
  }

  canAffordAugment(aug: GearAugmentDef): boolean {
    if (this.devNoBuildCost) return true;
    return Object.entries(aug.costs).every(([r, n]) => this.heldCount(r) >= (n ?? 0));
  }

  private applyGearAugment(aug: GearAugmentDef): void {
    const t = this.upgradeTarget;
    const inst = this.upgradeTargetInstance();
    if (!t || !inst) return;
    if (!this.canAffordUpgrade(aug) || this.upgradeBlockReason(aug)) return;
    const applied = appliedAugmentIds(inst);
    if (applied.includes(aug.id) || applied.length >= MAX_AUGMENTS_PER_ITEM) return;
    if (!this.devNoBuildCost) for (const [r, n] of Object.entries(aug.costs)) this.consumeHeld(r, n ?? 0);
    // Keep any non-augment ids already on the field (a station's applied set can
    // never land on gear, but the merge keeps the field's contract honest).
    const next = [...(inst.upgrades ?? []), aug.id];
    if (this.isArmorUpgradeTarget(t)) {
      const eq = this.equipment.get(t.armorSlot);
      if (eq) this.equipment.set(t.armorSlot, { ...eq, upgrades: next });
    } else if (this.isGearUpgradeTarget(t)) {
      const stack = t.gearSlot.container.slot(t.gearSlot.index);
      if (stack) t.gearSlot.container.set(t.gearSlot.index, { ...stack, upgrades: next });
    }
    this.sfx.upgrade();
    this.eventLog.add("recipe", `${itemDef(inst.key)?.name ?? inst.key} augmented: ${aug.name}`, itemDef(inst.key)?.texture);
    // An augmented weapon may be the currently-equipped hotbar item — refresh
    // the cached augment effect so its damage/crit/arc bonus applies at once.
    this.recomputeEquipped();
    this.upgradeMenu.refresh();
    this.afterItemMove();
  }

  // Armor's equivalent of applyStationUpgrade — deducts cost and bumps the
  // EquippedItem's tier in place.
  private applyArmorUpgrade(slot: EquipSlot, upg: ArmorUpgradeDef): void {
    const eq = this.equipment.get(slot);
    if (!eq || !this.canAffordUpgrade(upg) || this.upgradeBlockReason(upg)) return;
    if (!this.devNoBuildCost) for (const [r, n] of Object.entries(upg.costs)) this.consumeHeld(r, n ?? 0);
    this.sfx.upgrade();
    this.equipment.set(slot, { key: eq.key, tier: upg.resultTier, upgrades: eq.upgrades });
    // Left-anchored "recipe" toast, not the top-center "info" one — the
    // Upgrade panel for a paper-doll slot opens right beside/over where the
    // center toast used to land (see applyStationUpgrade's note).
    this.eventLog.add("recipe", `${stationDisplayName(eq.key, upg.resultTier)} upgraded: ${upg.name}`, itemDef(eq.key)?.texture);
    this.upgradeMenu.refresh();
    this.afterItemMove();
  }

  // Container-item equivalent — deducts cost and bumps the specific ItemStack's
  // tier in place, wherever it sits (backpack or hotbar). Handles both weapons/
  // tools and armor pieces held in a container (equipped armor uses
  // applyArmorUpgrade); only costs + resultTier are read, so either def works.
  private applyGearUpgrade(container: ItemContainer, index: number, upg: WeaponUpgradeDef | ArmorUpgradeDef): void {
    const stack = container.slot(index);
    if (!stack || !this.canAffordUpgrade(upg) || this.upgradeBlockReason(upg)) return;
    if (!this.devNoBuildCost) for (const [r, n] of Object.entries(upg.costs)) this.consumeHeld(r, n ?? 0);
    this.sfx.upgrade();
    container.set(index, { ...stack, tier: upg.resultTier });
    this.eventLog.add("recipe", `${stationDisplayName(stack.key, upg.resultTier)} upgraded: ${upg.name}`, itemDef(stack.key)?.texture);
    // The upgraded weapon may be the currently-equipped hotbar item — refresh
    // equippedWeaponTier so the damage bonus applies immediately.
    this.recomputeEquipped();
    this.upgradeMenu.refresh();
    this.afterItemMove();
  }

  // The visual tell for a placed station's upgrade tier — applied at every
  // render point (live upgrade AND re-placement from a tiered stack) so the two
  // paths never diverge. Tier 0 clears the tint; higher tiers get a gold cast.
  private applyTierVisual(image: Phaser.GameObjects.Image, tier: number): void {
    // Benches (Workbench/Smelter) get a distinct texture per upgrade tier so an
    // upgraded station visibly reflects its latest level (biome 2 Phase 4,
    // the user). The tier already survives Destroy -> pickup -> re-Place, so the
    // look follows it for free. Other placeables keep the amber-tint tell.
    const key = image.getData("itemKey") as string | undefined;
    const tex = key ? this.tieredStationTexture(key, tier) : null;
    if (tex && this.textures.exists(tex)) {
      image.setTexture(tex);
      image.clearTint();
      return;
    }
    // Non-textured stations (Campfire, Drying Rack, Relic Forge) get a warmer
    // tint the higher their level, so a Lvl 3/4 campfire reads distinctly from a
    // Lvl 2 one without needing per-tier art.
    if (tier <= 0) image.clearTint();
    else image.setTint(CAMPFIRE_TIER_TINT[Math.min(tier, CAMPFIRE_TIER_TINT.length) - 1]);
  }

  // The world texture for a Workbench/Smelter at `tier` — base at tier 0, then
  // `<icon>_t1`, `_t2`, ... (defined in BootScene). Null for stations without a
  // per-tier look (they keep the tint).
  // Resolve the on-screen texture for an item at a given upgrade tier: if a
  // `${base}_t{tier}` texture was generated (BootScene), use it; else fall back
  // to the base icon. Covers placed stations (Workbench/Smelter) AND upgraded
  // tools/weapons (e.g. the Ironshod stone_axe at tier 1) with one generic rule,
  // so adding tiered art for any item is just drawing a `_t{n}` texture.
  private tieredStationTexture(key: string, tier: number): string | null {
    const base = itemDef(key)?.texture;
    if (!base) return null;
    if (tier <= 0) return base;
    const tiered = `${base}_t${tier}`;
    return this.textures.exists(tiered) ? tiered : base;
  }

  // Minecraft-style destroy: the object vanishes and drops as a recoverable
  // loose pickup of itself — not "pieces," a simpler result that's equally
  // recoverable. A Drying Rack's still-loaded raw input is refunded the same
  // way first, so destroying one doesn't just eat whatever was inside it.
  private destroyPlacedObject(obj: Phaser.GameObjects.Image): void {
    const itemKey = obj.getData("itemKey") as string;
    const tier = (obj.getData("tier") as number | undefined) ?? 0;
    const name = stationDisplayName(itemKey, tier);
    if (this.upgradeTarget === obj) this.closeUpgradeMenu();
    const label = this.placedLabels.get(obj);
    if (label) {
      label.destroy();
      this.placedLabels.delete(obj);
    }
    const glyph = this.placedUpgradeGlyphs.get(obj);
    if (glyph) {
      glyph.tween.remove();
      glyph.text.destroy();
      this.placedUpgradeGlyphs.delete(obj);
    }

    // Destroy drops any loaded slots as loose pickups at the destroyed object
    // (Minecraft-style recovery). drainAll clears the slots first, so the
    // closeDryingRackMenu below finds nothing to refund — no double-drop.
    const rackIndex = this.dryingRacks.findIndex((r) => r.image === obj);
    if (rackIndex !== -1) {
      const station = this.dryingRacks[rackIndex].station;
      for (const slot of station.drainAll()) {
        this.spawnLooseDrop(slot.key, slot.count, obj.x, obj.y, DROPPED_ITEM_MAGNET_COOLDOWN_MS);
      }
      if (this.openRack === station) this.closeDryingRackMenu();
      this.dryingRacks.splice(rackIndex, 1);
    }

    // Same for a placed Smelter's loaded ore, reagent AND fuel.
    const smelterIndex = this.smelters.findIndex((s) => s.image === obj);
    if (smelterIndex !== -1) {
      const station = this.smelters[smelterIndex].station;
      for (const slot of station.drainAll()) {
        this.spawnLooseDrop(slot.key, slot.count, obj.x, obj.y, DROPPED_ITEM_MAGNET_COOLDOWN_MS);
      }
      if (this.openRack === station) this.closeDryingRackMenu();
      this.smelters.splice(smelterIndex, 1);
    }

    // Destroying the campfire whose cooking menu is open closes it too.
    if (this.openCampfire === obj) this.closeCookingMenu();
    // Same for the Gemwright's Table.
    if (this.openJewelry === obj) this.closeJewelryMenu();
    // Same for the Relic Forge.
    if (this.openForge === obj) this.closeRelicForgeMenu();

    // Carry the placed instance's upgrade tier AND applied-upgrade set into the
    // pickup so re-placing restores both (fixes the old bug where Destroy
    // discarded an upgraded station's tier; the id set is what stops a re-placed
    // station from re-offering — and cheaply re-applying — an already-applied
    // upgrade to climb the level for free).
    const applied = obj.getData("upgrades") as string[] | undefined;
    this.spawnLooseDrop(
      itemKey,
      1,
      obj.x,
      obj.y,
      DROPPED_ITEM_MAGNET_COOLDOWN_MS,
      tier || undefined,
      applied && applied.length > 0 ? [...applied] : undefined,
    );
    this.placedObjects = this.placedObjects.filter((o) => o !== obj);
    obj.destroy();
    this.eventLog.add("info", `Picked up ${name}`);
  }

  // --- Inventory ---

  private createInventoryMenu(): void {
    this.inventoryMenu = new InventoryMenu(this, {
      backpack: this.backpack,
      skills: this.skills,
      progression: this.progression,
      critTotals: (w) => ({ chance: this.critChanceTotal(w), mult: this.critMultTotal(w) }),
      stationTexture: (key, tier) => this.tieredStationTexture(key, tier),
      armorSlots: () => this.armorSlots(),
      combatStats: () => this.combatStats(),
      runSpeedBreakdown: () => this.runSpeedBreakdown(),
      relicFamilySlots: () => this.relics.familySlots(),
      relicEffectSummary: () => this.relics.effectSummary(),
      beginDrag: (c, i, p) => this.beginItemDrag(c, i, p),
      beginArmorDrag: (slot, p) => this.beginArmorDrag(slot, p),
      unequipArmorSlot: (slot) => this.unequipArmorSlot(slot),
      openArmorContextMenu: (slot, x, y) => this.openArmorContextMenu(slot, x, y),
      openGearUpgrade: (c, i) => this.openGearUpgradeMenu(c, i),
      openPlaceContextMenu: (c, i, x, y) => this.openPlaceContextMenu(c, i, x, y),
      eatItem: (c, i) => this.eatItem(c, i),
      isDragging: () => this.dragSource !== null,
      sortBackpack: () => {
        sortAndStack(this.backpack);
        this.inventoryMenu.refresh();
      },
      upgradeReady: (key, tier, appliedIds) => this.hasReadyUpgrade(key, tier, appliedIds),
    });
  }

  // Whether the item at (itemKey, tier) has a discovered + affordable next-tier
  // upgrade the player could apply right now — drives the inventory/hotbar/
  // paper-doll "upgrade ready" arrow (S3). Weapons, tools, and armor all follow
  // the resultTier ladder (next tier only), and a given itemKey matches at most
  // one of the three tables. Deliberately materials-only: it does NOT consult
  // upgradeBlockReason (Workbench-proximity), so the arrow is a stable "you have
  // the mats" nudge that doesn't flicker as the player moves — clicking Upgrade
  // still surfaces any proximity gate, exactly like the crafting menu does.
  private hasReadyUpgrade(itemKey: string, tier: number, appliedIds?: string[]): boolean {
    const next = [
      ...weaponUpgradesForItem(itemKey),
      ...armorUpgradesForItem(itemKey),
      ...toolUpgradesForItem(itemKey),
    ].find((u) => u.resultTier === tier + 1);
    if (next && this.upgradeIngredientsKnown(next) && this.canAffordUpgrade(next)) return true;
    // Stations (no-ladder model) can be upgraded too, so a station sitting in the
    // hotbar should show the arrow like a placed one does (the user: "workstations
    // should show the upgrade yellow triangle while in the hotbar").
    //
    // The set of upgrades this instance has ALREADY APPLIED has to come out of
    // the candidate list first. It didn't, so `some(affordable)` kept matching an
    // early, cheap, long-since-applied upgrade — a Workbench that had Tool
    // Sharpener (twine/wood/stone: trivially affordable by the late game) showed
    // a permanent "upgrade ready" arrow no matter how upgraded it actually was
    // (the user: "telling me I have an upgrade available for workbench/fire in my
    // hotbar when they are fully upgraded"). The PLACED-station check has always
    // filtered by applied id; only this item-stack path didn't.
    const applied = new Set(appliedIds ?? []);
    const stationUps = upgradesForItem(itemKey);
    if (stationUps.length === 0) return false;
    // Only an instance that has ALREADY been upgraded gets the carried-item
    // reminder. A pristine spare always has every upgrade pending, so it wore a
    // permanent arrow that could never be cleared — and you can't apply an
    // upgrade to something in your hotbar anyway, you have to place it first. The
    // PLACED station keeps its own glyph (stationHasReadyUpgrade), which is where
    // the prompt actually belongs; this one exists so a partly-upgraded station
    // you're carrying still reminds you it has room left.
    if (tier <= 0 && applied.size === 0) return false;
    // Prefer the exact applied-id set the instance carries; fall back to the
    // count approximation (level == #applied, and the list is tier-sorted) for an
    // instance that has a tier but no recorded ids.
    const remaining = applied.size > 0 ? stationUps.filter((u) => !applied.has(u.id)) : stationUps.slice(tier);
    return remaining.some((u) => this.upgradeIngredientsKnown(u) && this.canAffordUpgrade(u));
  }

  // Station equivalent: a placed station has an affordable upgrade ready if any
  // discovered, not-yet-applied upgrade for its itemKey is affordable (no-ladder
  // model — see UpgradeMenu). Drives the floating glyph over the placed object.
  private stationHasReadyUpgrade(obj: Phaser.GameObjects.Image): boolean {
    const key = obj.getData("itemKey") as string;
    const applied = new Set((obj.getData("upgrades") as string[] | undefined) ?? []);
    return upgradesForItem(key).some(
      (u) => !applied.has(u.id) && this.upgradeIngredientsKnown(u) && this.canAffordUpgrade(u),
    );
  }

  // Show/hide the floating "upgrade ready" glyph over each placed station,
  // reconciling against stationHasReadyUpgrade(). Cheap — runs on the same item-
  // move/discovery cadence affordability actually changes on, not per frame.
  private refreshStationUpgradeIndicators(): void {
    for (const obj of this.placedObjects) {
      const ready = this.stationHasReadyUpgrade(obj);
      const existing = this.placedUpgradeGlyphs.get(obj);
      if (ready && !existing) {
        const text = this.add
          .text(obj.x + obj.displayWidth / 2 + 2, obj.y - obj.displayHeight / 2 - 6, "▲", {
            fontFamily: "monospace",
            fontSize: "16px",
            color: "#ffd24a",
          })
          .setOrigin(0, 1)
          // Above every world object but below the fixed HUD, matching the
          // placed-label depth convention.
          .setDepth(2500);
        const tween = this.tweens.add({
          targets: text,
          alpha: { from: 1, to: 0.3 },
          duration: 620,
          yoyo: true,
          repeat: -1,
        });
        this.placedUpgradeGlyphs.set(obj, { text, tween });
      } else if (!ready && existing) {
        existing.tween.remove();
        existing.text.destroy();
        this.placedUpgradeGlyphs.delete(obj);
      }
    }
  }

  private armorSlots(): ArmorSlotView[] {
    return EQUIP_SLOTS.map((s) => {
      const eq = this.equipment.get(s.id);
      return { id: s.id, label: s.label, itemKey: eq?.key ?? null, tier: eq?.tier, upgrades: eq?.upgrades };
    });
  }

  // Live "what am I currently equipped with" summary for the inventory panel —
  // mirrors the exact same math Tooltip's weapon "base (adjusted)" lines and
  // tryAttackEnemy/applyDamageToPlayer already use, just rolled up into one
  // view instead of per-item tooltips.
  private combatStats(): CombatStatsView {
    const armor = totalPlayerDefense(this.equipment);
    const setBonuses = [...this.activeSetIds].map((id) => {
      const s = setById(id);
      return { name: s.bonusName, desc: s.bonusDesc };
    });
    if (!this.equippedWeapon)
      return {
        weaponName: null,
        damage: 0,
        damageTypeName: null,
        attackSpeed: 0,
        staminaCost: 0,
        armor,
        attackRange: REACH,
        critChance: 0,
        critMult: 0,
        identity: null,
        setBonuses,
      };
    const dmgType = weaponPrimaryDamageType(this.equippedWeapon);
    const baseDmg = this.equippedWeaponBaseDamage();
    // Include relic bonuses (M-RL) so the panel matches the real math — the
    // additive skill+relic damage bucket (2026-07-15), same as damageBonusMult().
    const damage = Math.round(baseDmg * this.damageBonusMult(dmgType));
    // Stamina cost no longer scales with Strength/Agility (retired in M-SS) —
    // only relics discount it now.
    const staminaCost = Math.round(weaponStaminaCost(this.equippedWeapon) * this.relics.staminaCostMult());
    const attackRange = rangedWeaponConfig(this.equippedWeapon)?.maxRangePx ?? REACH;
    // Crit rollup (M-SS) — the same total-crit helpers the real crit roll uses,
    // so the panel can't drift from actual combat math.
    const critChance = this.critChanceTotal(this.equippedWeapon);
    const critMult = this.critMultTotal(this.equippedWeapon);
    return {
      weaponName: this.equippedWeaponName,
      damage,
      damageTypeName: damageTypeDisplayName(dmgType),
      attackSpeed: weaponAttacksPerSecond(this.equippedWeapon),
      staminaCost,
      armor,
      attackRange,
      critChance,
      critMult,
      identity: weaponIdentityLine(this.equippedWeapon),
      setBonuses,
    };
  }

  // Live "what determines the player's move speed right now" breakdown —
  // base walk speed + the Running skill's sprint multiplier, then any relic
  // move-speed bonus (M-RL) folded into the effective walk/sprint figures so
  // the panel shows real numbers (itemBonus carries the relic px contribution).
  private runSpeedBreakdown(): RunSpeedView {
    const base = PLAYER_WALK_SPEED;
    const moveMult = this.relics.moveSpeedMult();
    const walk = Math.round(base * moveMult);
    const sprintMultiplier = runningSprintMultiplier(this.skills);
    const runningLevel = this.skills.get("running");
    return {
      walk,
      sprintMultiplier,
      sprint: Math.round(base * sprintMultiplier * moveMult),
      runningLevel,
      runningBonus: Math.round(runningLevel * 0.005 * base),
      itemBonus: Math.round(base * (moveMult - 1)),
    };
  }

  // Equip an armor item from `container[index]` into its matching slot,
  // swapping whatever was previously worn there back to the backpack (or
  // dropping it on the floor if the backpack is full). Shared by the
  // right-click-to-equip gesture and drag-onto-slot.
  //
  // `requestedSlot` is the drag path's explicit target — the slot the player
  // actually dropped on. Auto-equip gestures (double-click / Ctrl-click /
  // starting kit) pass nothing and keep the first-free-in-group routing, so
  // only a deliberate drag ever has to name a destination.
  private equipArmorFromContainer(container: ItemContainer, index: number, requestedSlot?: EquipSlot): void {
    const stack = container.slot(index);
    if (!stack) return;
    const def = itemDef(stack.key);
    const slot = def?.armorSlot;
    if (!slot) return;

    // An item declares a GROUP, not a destination: any special fits any of the
    // four special slots and any ability item fits any of the three Q/E/R slots
    // (see EquipSlot). So route to the first FREE slot in the item's group, and
    // only swap — into the slot the item nominally declares — once the group is
    // full. Generalised from what used to be a ring1/ring2 special case, which
    // was the only pair that could do this.
    const group = slotGroup(slot);
    const explicit = requestedSlot && slotGroup(requestedSlot) === group ? requestedSlot : undefined;
    const targetSlot: EquipSlot = explicit ?? this.equipment.firstFreeIn(group) ?? slot;
    const previous = this.equipment.get(targetSlot);
    this.equipment.set(targetSlot, { key: stack.key, tier: stack.tier ?? 0, upgrades: stack.upgrades });
    container.set(index, null);
    if (previous) this.returnArmorToBackpack(previous);
    this.eventLog.add("info", `Equipped ${def.name}`);
    // Teach right-click inspect/upgrade the first time they wear a piece (also
    // covered at the station-placement site).
    this.hints.trigger("right_click_tip");
    this.afterItemMove();
  }

  private returnArmorToBackpack(item: EquippedItem): void {
    const stack: ItemStack = { key: item.key, count: 1, tier: item.tier || undefined, upgrades: item.upgrades };
    if (!this.backpack.addStack(stack)) {
      this.spawnLooseDrop(item.key, stack.count, this.player.x, this.player.y, DROPPED_ITEM_MAGNET_COOLDOWN_MS, item.tier || undefined);
    }
  }

  // Unequip whatever's worn in `slot`. With `toIndex` given and that backpack
  // slot empty, it lands there specifically (the drag-to-a-particular-slot
  // case); otherwise it falls back to the first assignable slot, or drops on
  // the floor if the backpack is full. Also the "Unequip" context-menu action
  // (no `toIndex`).
  private unequipArmorSlot(slot: EquipSlot, toIndex?: number): void {
    const eq = this.equipment.get(slot);
    if (!eq) return;
    // The Upgrade panel's target no longer exists once unequipped — close it
    // rather than leaving it open on a now-empty slot (mirrors
    // destroyPlacedObject's identical check for a destroyed station).
    const t = this.upgradeTarget;
    if (t && "armorSlot" in t && t.armorSlot === slot) this.closeUpgradeMenu();
    this.equipment.set(slot, null);
    if (toIndex !== undefined && this.backpack.slot(toIndex) === null) {
      this.backpack.set(toIndex, { key: eq.key, count: 1, tier: eq.tier || undefined, upgrades: eq.upgrades });
    } else {
      this.returnArmorToBackpack(eq);
    }
    this.eventLog.add("info", `Unequipped ${itemDef(eq.key)?.name ?? eq.key}`);
    this.afterItemMove();
  }

  // Right-click on a paper-doll slot: "Unequip"/"Upgrade" if occupied, or a
  // greyed informational "Equip"/"Upgrade" if empty (mirrors a placed
  // station's right-click Upgrade/Destroy popup).
  // Right-click on a backpack placeable (Workbench, Campfire, ...): a
  // single-row "Place" popup that just calls the same startItemPlacement
  // path a left-click-in-place already reaches — an explicit, discoverable
  // way in, mirroring a placed station's own right-click popup.
  private openPlaceContextMenu(
    container: ItemContainer,
    index: number,
    screenX: number,
    screenY: number,
  ): void {
    const items: ContextMenuItem[] = [
      { label: "Place", enabled: true, onClick: () => this.startItemPlacement(container, index) },
    ];
    this.contextMenu.show(screenX, screenY, items);
  }

  private openArmorContextMenu(slot: EquipSlot, screenX: number, screenY: number): void {
    const eq = this.equipment.get(slot);
    const items: ContextMenuItem[] = eq
      ? [
          {
            label: "Upgrade",
            // Only lit up when an actual next tier is both defined AND
            // discovered (mirrors UpgradeMenu's own row filter) — otherwise
            // it's a dead click into an empty panel.
            enabled: armorUpgradesForItem(eq.key).some(
              (u) => u.resultTier > eq.tier && this.upgradeIngredientsKnown(u),
            ),
            onClick: () => this.openArmorUpgradeMenu(slot),
          },
          { label: "Unequip", enabled: true, onClick: () => this.unequipArmorSlot(slot) },
        ]
      : [
          { label: "Upgrade", enabled: false, onClick: () => {} },
          { label: "Equip", enabled: false, onClick: () => {} },
        ];
    this.contextMenu.show(screenX, screenY, items);
  }

  // --- HUD ---

  private createHud(): void {
    // Hover prompt, anchored to the bottom-right of the screen.
    this.promptText = this.add
      .text(this.scale.width - 12, this.scale.height - 12, "", {
        fontFamily: "monospace",
        fontSize: "16px",
        color: "#ffffff",
        backgroundColor: "#000000aa",
        padding: { x: 8, y: 4 },
      })
      .setOrigin(1, 1)
      .setScrollFactor(0)
      .setDepth(2800) // must clear WORLD_H (2688) so trees/world objects never draw over fixed HUD
      .setVisible(false);

    // Top-left collapsible keybind reference (was a single always-on line;
    // moved to a collapsible panel since the bind list keeps growing).
    this.keybindsUI = new KeybindsUI(
      this,
      [
        "Move: WASD / Arrows",
        "Sprint: Hold Shift",
        "Dash: Space (while moving)",
        "Interact: Left Click",
        "Inspect / upgrade: Right Click",
        "Quick-move item: Ctrl+Click",
        "Split stack in half: Shift+Click",
        "Inventory: Tab",
        "Character: K",
        "World map: M",
        "Auto-pickup: V",
        "Range ring: O",
        "Station row: Alt+1-9",
        "Row2 scroll toggle: H",
        "Abilities: Q / E / R",
        "Take all (chest open): R",
        "Run info toggle: J",
        "Fullscreen: F11",
        "Pause / close: Esc",
      ],
    );

    // Placement-mode hint — bottom-right, stacked directly above the
    // interact prompt (promptText), matching where every other contextual
    // instruction/prompt in the HUD lives (was previously top-left, an odd
    // spot disconnected from the rest of the interaction UI).
    this.placementHintText = this.add
      .text(this.scale.width - 12, this.scale.height - 44, "", {
        fontFamily: "monospace",
        fontSize: "14px",
        color: "#ffe08a",
        backgroundColor: "#000000aa",
        padding: { x: 8, y: 4 },
      })
      .setOrigin(1, 1)
      .setScrollFactor(0)
      .setDepth(2800)
      .setVisible(false);

    this.refreshHud();
  }

  private refreshHud(): void {
    this.craftingMenu?.refresh();
    this.inventoryMenu?.refresh();
  }

  // Shared layout for the fixed HUD bars (HP/stamina): repositions/resizes
  // the bg + fill rects and re-centers the label text, keeping the bar
  // horizontally centered on screen at whatever width is passed in. Called
  // on every refresh (not just create) so allocating a Vitality/Endurance
  // point re-lays-out the bar immediately, not just its fill fraction.
  private layoutBar(
    bg: Phaser.GameObjects.Rectangle,
    fill: Phaser.GameObjects.Rectangle,
    text: Phaser.GameObjects.Text,
    barW: number,
    barY: number,
    frac: number,
  ): void {
    const barH = 20;
    const barX = Math.round(this.scale.width / 2 - barW / 2);
    bg.setPosition(barX, barY).setSize(barW, barH);
    fill.setPosition(barX + 1, barY + 1).setSize(barW - 2, barH - 2).setScale(Math.max(0, frac), 1);
    text.setPosition(barX + barW / 2, barY + barH / 2);
  }

  // Bars grow proportionally with their max pool (base 76px at pool 100),
  // capped at the hotbar's own on-screen width so a large pool can't outgrow
  // the HUD it sits above.
  private statBarWidth(max: number): number {
    const BASE_BAR_W = 76;
    const BASE_MAX = 100;
    return Phaser.Math.Clamp(Math.round((BASE_BAR_W * max) / BASE_MAX), BASE_BAR_W, this.hotbarUI.width);
  }

  // Stamina bar: centered directly above the hotbar, sized close to a single
  // hotbar slot (not a full-width bar) since it's meant to start small — this
  // is the first player stat bar in the game, and future HP/mana bars should
  // stack above this one the same way, using hotbarUI.top as the shared
  // anchor.
  private createStaminaBar(): void {
    const barW = this.statBarWidth(this.stamina.max);
    const barH = 20;
    const gap = 8;
    const barX = this.scale.width / 2 - barW / 2;
    const barY = this.hotbarUI.top - gap - barH;
    this.staminaBarBg = this.add
      .rectangle(barX, barY, barW, barH, 0x1a1f2a, 0.95)
      .setOrigin(0, 0)
      .setStrokeStyle(1, 0x3a4250)
      .setScrollFactor(0)
      .setDepth(2800);
    // Dark/muted yellow rather than a bright/neon fill — a fixed color, no
    // depletion/regen color-shift.
    this.staminaBarFill = this.add
      .rectangle(barX + 1, barY + 1, barW - 2, barH - 2, 0xb8860b, 1)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(2801);
    this.staminaBarText = this.add
      .text(barX + barW / 2, barY + barH / 2, "", {
        fontFamily: "monospace",
        fontSize: "12px",
        color: "#1a1200",
      })
      .setOrigin(0.5, 0.5)
      .setScrollFactor(0)
      .setDepth(2802);
    this.refreshStaminaBar();
  }

  private refreshStaminaBar(): void {
    const gap = 8;
    const barH = 20;
    const barW = this.statBarWidth(this.stamina.max);
    const barY = this.hotbarUI.top - gap - barH;
    const frac = this.stamina.value() / this.stamina.max;
    this.layoutBar(this.staminaBarBg, this.staminaBarFill, this.staminaBarText, barW, barY, frac);
    this.staminaBarText.setText(`${Math.round(this.stamina.value())}`);
  }

  // HP bar: stacks directly above the stamina bar via the same hotbarUI.top
  // anchor, one more slot up. Crimson fill vs. the stamina bar's goldenrod.
  private createHealthBar(): void {
    const barW = this.statBarWidth(this.health.max);
    const barH = 20;
    const gap = 8;
    const barX = this.scale.width / 2 - barW / 2;
    const staminaBarY = this.hotbarUI.top - gap - barH;
    const barY = staminaBarY - gap - barH;
    this.healthBarBg = this.add
      .rectangle(barX, barY, barW, barH, 0x1a1f2a, 0.95)
      .setOrigin(0, 0)
      .setStrokeStyle(1, 0x3a4250)
      .setScrollFactor(0)
      .setDepth(2800);
    this.healthBarFill = this.add
      .rectangle(barX + 1, barY + 1, barW - 2, barH - 2, 0xb02020, 1)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(2801);
    // Leech (lifesteal Mythic) shield — a cyan overlay anchored to the bar's
    // right edge, width proportional to the banked absorb.
    this.healthShieldFill = this.add
      .rectangle(barX + barW - 1, barY + 1, 0, barH - 2, 0x5ad6e8, 0.85)
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(2801.5)
      .setVisible(false);
    this.healthBarText = this.add
      .text(barX + barW / 2, barY + barH / 2, "", {
        fontFamily: "monospace",
        fontSize: "12px",
        color: "#ffffff",
      })
      .setOrigin(0.5, 0.5)
      .setScrollFactor(0)
      .setDepth(2802);
    this.refreshHealthBar();
  }

  private refreshHealthBar(): void {
    const gap = 8;
    const barH = 20;
    const staminaBarY = this.hotbarUI.top - gap - barH;
    const barY = staminaBarY - gap - barH;
    const barW = this.statBarWidth(this.health.max);
    const frac = this.health.value() / this.health.max;
    this.layoutBar(this.healthBarBg, this.healthBarFill, this.healthBarText, barW, barY, frac);
    this.healthBarText.setText(`${Math.round(this.health.value())}`);
    // Shield overlay (Leech Mythic): a cyan strip from the bar's right edge.
    const shieldFrac = Phaser.Math.Clamp(this.playerShield / this.health.max, 0, 1);
    const barX = Math.round(this.scale.width / 2 - barW / 2);
    this.healthShieldFill
      .setPosition(barX + barW - 1, barY + 1)
      .setSize(shieldFrac * (barW - 2), 20 - 2)
      .setVisible(shieldFrac > 0);
  }

  // Buff-icon strip: sits just above the HP bar, centered. HP bar Y mirrors the
  // math in createHealthBar/refreshHealthBar (anchored off hotbarUI.top); the
  // strip's bottom edge is a small gap above it. HP/stamina bar Y is fixed
  // (only their WIDTH grows with max pool), so this anchor never needs
  // recomputing.
  // The live debuff list for StatusBarUI, rebuilt each frame from real system
  // state (never cached), so an effect can never linger on the HUD after it ends.
  // Adding a future debuff = one more row here; the UI is generic.
  private statusEffects(): StatusEffect[] {
    if (this.isDead) return [];
    const out: StatusEffect[] = [];
    if (this.poison.isPoisoned()) {
      out.push({
        id: "poison",
        name: "Poisoned",
        icon: "icon_status_poison",
        detail: `${this.poison.dps()} dmg/s · ignores armor`,
        color: 0x8fd94a,
        remainingMs: this.poison.remainingMs(),
        durationMs: POISON_METER_FULL_MS,
      });
    }
    if (this.bleed.isBleeding()) {
      out.push({
        id: "bleed",
        name: "Bleeding",
        icon: "icon_status_bleed",
        detail: `${this.bleed.dps()} dmg/s · ignores armor`,
        color: 0xd42a2a,
        remainingMs: this.bleed.remainingMs(),
        durationMs: BLEED_METER_FULL_MS,
      });
    }
    // Conditional (no timer): true exactly while you're standing in it.
    if (this.currentEnvMoveMult < 1) {
      out.push({
        id: "slow",
        name: "Slowed",
        icon: "icon_status_slow",
        detail: `Movement ${Math.round((1 - this.currentEnvMoveMult) * 100)}% slower here`,
        color: 0xc9a24a,
      });
    }
    // Shown whenever a ZONE (miasma/mire) cuts regen. Poison no longer affects
    // regen (2026-07-23), so this is independent of the poison status now.
    if (this.currentRegenMult < 1) {
      const pct = Math.round((1 - this.currentRegenMult) * 100);
      out.push({
        id: "noregen",
        name: this.currentRegenMult <= 0 ? "No Regen" : "Weakened Healing",
        icon: "icon_status_noregen",
        // Names the TERRAIN explicitly. Sitting next to the Poisoned icon with
        // only "here" to go on, this read as poison's doing (the user: "still
        // saying healing is 50% while in poison?") — poison hasn't touched regen
        // since the 2026-07-23 batch; the ground you're standing on has.
        detail:
          this.currentRegenMult <= 0
            ? "This ground suppresses healing — move to clear ground"
            : `This ground weakens healing ${pct}% — move to clear ground`,
        color: 0x9a3a46,
      });
    }
    return out;
  }

  private createBuffBar(): void {
    const gap = 8;
    const barH = 20;
    const staminaBarY = this.hotbarUI.top - gap - barH;
    const healthBarY = staminaBarY - gap - barH;
    this.buffBarUI = new BuffBarUI(this);
    this.buffBarUI.layout(this.scale.width / 2, healthBarY - 6);
    // Debuffs sit in their own band directly ABOVE the buff row, at a FIXED
    // offset rather than stacked on the live buff count — otherwise the debuff
    // icons would jump every time a food buff started or expired.
    this.statusBarUI = new StatusBarUI(this);
    this.statusBarUI.layout(this.scale.width / 2, healthBarY - 6 - 34);
    this.buffBarUI.sync(this.buffs.active());
    this.statusBarUI.sync(this.statusEffects());
  }

  // Unified passive/proc HUD (the user: Dota-style icons LEFT of the hotbar) —
  // relic passives + armor set-bonuses + proc counters/cooldowns, all as
  // hoverable squares. Replaces the old bottom-left relic gem bar + mid-left proc
  // bar. Synced every frame (cooldown sweeps need it); rebuilds structure only
  // when the owned set changes.
  private createPassiveBar(): void {
    this.passiveBarUI = new PassiveBarUI(this);
    this.passiveBarUI.layout(this.hotbarUI.left - 10, this.hotbarUI.bottom);
    this.passiveBarUI.sync(this.passiveEntries());
  }

  // Build the current passive/proc icon list: one entry per owned relic (proc
  // relics carry live count/cooldown state) + one per active armor set-bonus.
  private passiveEntries(): PassiveEntry[] {
    const entries: PassiveEntry[] = [];
    for (const group of this.relics.groupedForDisplay() as RelicGroup[]) {
      const def = group.def;
      const entry: PassiveEntry = {
        key: `relic:${group.id}@${group.powerTier}`,
        texture: rarityIcon(def.rarity),
        borderColor: RARITY_COLOR[def.rarity],
        name: `${def.name} (${rarityName(def.rarity)} · T${group.powerTier})`,
        desc: relicEffectText(def, group.powerTier),
        badge: `T${group.powerTier}`,
      };
      const kind = def.unique?.kind;
      if (kind === "onslaught") {
        const u = this.relics.unique("onslaught");
        if (u) {
          const cur = this.onslaughtHits % u.params.interval;
          entry.count = { cur, max: u.params.interval };
          entry.ready = cur === u.params.interval - 1; // next hit is the empowered one
        }
      } else if (kind === "guardian") {
        const u = this.relics.unique("guardian");
        if (u) {
          const remaining = Math.max(0, this.guardianReadyAt - this.time.now);
          entry.cooldown01 = u.params.cooldownMs > 0 ? 1 - remaining / u.params.cooldownMs : 1;
          entry.ready = remaining <= 0; // block is armed
        }
      }
      entries.push(entry);
    }
    // Armor set-bonuses (always-on passives) — icon = the set's chest piece.
    for (const id of this.activeSetIds) {
      const set = setById(id);
      const chest = set.pieces[1];
      entries.push({
        key: `set:${id}`,
        texture: itemDef(chest)?.texture ?? rarityIcon("mythic"),
        borderColor: 0xffb84a,
        name: `${set.bonusName} · ${set.name} set`,
        desc: set.bonusDesc,
      });
    }
    // Equipped jewelry (rings/amulet) — always-on ability-augment / utility
    // passives (B3-P2b), so they read on the HUD like relics/set bonuses do. The
    // ability specials (special1/2/back) have no `passive` and show on the QER bar.
    for (const { id: slot } of EQUIP_SLOTS) {
      const eq = this.equipment.get(slot);
      const def = eq ? itemDef(eq.key) : undefined;
      if (!def?.passive) continue;
      entries.push({
        key: `jewelry:${slot}:${eq!.key}`,
        texture: def.texture,
        borderColor: 0xb98cff, // gloam-violet — distinct from relic rarity + set gold
        name: def.name,
        desc: describePassive(def.passive).join("\n"),
      });
    }
    return entries;
  }

  // Player-level XP bar: sits directly under the hotbar, spanning its exact
  // width, rather than stacking with HP/stamina above it. Shows "Lvl N"
  // inside; fills toward the next level. Purple to distinguish from HP
  // (crimson) / stamina (goldenrod).
  private createXpBar(): void {
    const barW = this.hotbarUI.width;
    const barH = 12;
    const barX = this.hotbarUI.left;
    const barY = this.hotbarUI.bottom + 4;
    this.xpBarBg = this.add
      .rectangle(barX, barY, barW, barH, 0x1a1f2a, 0.95)
      .setOrigin(0, 0)
      .setStrokeStyle(1, 0x3a4250)
      .setScrollFactor(0)
      .setDepth(2800);
    this.xpBarFill = this.add
      .rectangle(barX + 1, barY + 1, barW - 2, barH - 2, 0x8a5cd0, 1)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(2801);
    this.xpBarText = this.add
      .text(barX + barW / 2, barY + barH / 2, "", {
        fontFamily: "monospace",
        fontSize: "10px",
        color: "#ffffff",
      })
      .setOrigin(0.5, 0.5)
      .setScrollFactor(0)
      .setDepth(2802);
    this.refreshXpBar();
  }

  private refreshXpBar(): void {
    const need = xpToNextPlayerLevel(this.progression.level);
    const frac = need > 0 ? this.progression.xp / need : 0;
    this.xpBarFill.setScale(Phaser.Math.Clamp(frac, 0, 1), 1);
    this.xpBarText.setText(`Lvl ${this.progression.level}`);
  }

  // Small bobbing nudge whenever unspent stat points are sitting unused —
  // click opens the Character menu, which itself defaults to the Stats tab
  // whenever points are available. Sits directly below the top-right
  // MinimapUI panel (was "under the [Tab] Menu icon" before that icon was
  // removed and the minimap took over the top-right corner).
  // Small "Map (M)" button tucked into the minimap's bottom-left corner — the
  // clickable affordance for the full-map overlay (also opened with M). Pinned
  // to the minimap (not the row below it) so it can't collide with the
  // stat-points badge that lives under the panel.
  private createMapButton(): void {
    const x = this.scale.width - MINIMAP_MARGIN - MINIMAP_W + 3;
    const y = MINIMAP_MARGIN + MINIMAP_H - 22;
    this.add
      .text(x, y, "🗺 Map (M)", {
        fontFamily: "monospace",
        fontSize: "12px",
        color: "#ffe08a",
        backgroundColor: "#1a1f2acc",
        padding: { x: 6, y: 3 },
      })
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(3000)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => this.toggleWorldMap());
  }

  // Toggle the full-map overlay. Guarded so it doesn't stack on top of a
  // blocking menu / the run-end or pause screens.
  private toggleWorldMap(): void {
    if (this.runOver || this.isPaused) return;
    // No surface map underground — it would center on the CRYPT_REALM pocket,
    // i.e. a black corner nowhere near the swamp you actually came from.
    if (this.activeDungeon && !this.worldMapUI.isOpen()) {
      this.eventLog.add("info", "No use for a map down here.");
      return;
    }
    if (!this.worldMapUI.isOpen() && this.anyMenuOpen()) return;
    this.worldMapUI.toggle(this.player.x, this.player.y);
  }

  // Current-biome name banner, pinned to the top edge of the minimap panel
  // (depth above the minimap terrain, below the crafting/menu panels). Updated
  // each frame in updateBiomeUI().
  private createBiomeLabel(): void {
    const cxp = this.scale.width - MINIMAP_MARGIN - MINIMAP_W / 2;
    this.biomeLabel = this.add
      .text(cxp, MINIMAP_MARGIN + 2, BIOME_NAMES[this.currentBiome], {
        fontFamily: "monospace",
        fontSize: "12px",
        color: "#ffe6b0",
        backgroundColor: "#0a0e14cc",
        padding: { x: 6, y: 2 },
      })
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(2902);
  }

  // Track which biome the player is standing in: refresh the HUD label and fire a
  // one-time discovery toast the first time a real biome is entered.
  private updateBiomeUI(): void {
    const b = this.worldBiomes.dominantBiomeAt(this.player.x, this.player.y);
    if (b !== this.currentBiome) {
      this.currentBiome = b;
      this.biomeLabel?.setText(BIOME_NAMES[b]);
    }
    if (b !== "base" && !this.discoveredBiomes.has(b)) {
      this.discoveredBiomes.add(b);
      this.eventLog.add("biome", `Discovered: ${BIOME_NAMES[b]}`);
      // No timeline entry — the timeline is boss kills only (see RunLog.ts);
      // biome discovery already has its own event-log toast.
    }
  }

  // Put the NEAREST still-unknown Sunken Crypt on the map, and say which way it
  // lies. Returns false if every crypt is already known.
  //
  // This is the payload of a Gravemark Rubbing (see collectGravemarkRubbing).
  // An earlier pass revealed ALL eighteen crypts the moment you set foot in the
  // bayou — which fixed "an hour in and I can't craft anything" by deleting
  // exploration outright (the user, rightly: "I don't want it to reveal the whole
  // biome"). One at a time, earned, is the same help paid out in increments: the
  // map fills in as you fight through the swamp instead of arriving pre-solved.
  //
  // Each marker names its crypt's theme, so it also tells you which ability is
  // buried there and a run can be steered toward the build you want.
  private revealNearestCrypt(): boolean {
    let best: SunkenCrypt | null = null;
    let bestD = Infinity;
    for (const crypt of this.crypts) {
      if (crypt.discoveredOnMap) continue;
      const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, crypt.x, crypt.y);
      if (d < bestD) {
        bestD = d;
        best = crypt;
      }
    }
    if (!best) return false;
    best.discoveredOnMap = true;
    this.exploredMap.addLandmark({
      worldX: best.x,
      worldY: best.y,
      iconKey: best.def.mapMarker,
      label: best.def.name,
      tint: best.def.lightTint,
    });
    this.worldMapUI.markDirty();
    const dir = this.compassDir(this.player.x, this.player.y, best.x, best.y);
    this.eventLog.add("poi", `The rubbing pulls ${dir} — ${best.def.name} is marked on your map.`);
    this.hints.trigger("crypt_found");
    return true;
  }

  // A Gravemark Rubbing is consumed the instant it's picked up: it's a clue, not
  // an inventory item, so there's nothing to manage and no way to hoard a stack
  // of them into a de-facto reveal-all. Dropped by bayou creatures, so the thing
  // that finds you dungeons is the thing you were already doing down there.
  private collectGravemarkRubbing(): void {
    if (this.revealNearestCrypt()) {
      this.sfx.upgrade();
      return;
    }
    // Every crypt already known — say so rather than silently eating it.
    this.eventLog.add("info", "The rubbing shows nothing new — every crypt is already marked.");
  }

  // DEV: reveal the entire explored map (all fog cleared) + open the full map, for
  // debugging/inspecting world generation. Bound to Ctrl+Shift+M (undocumented —
  // not in the Keybinds panel, since it's a dev/playtest cheat, not a game feature).
  private revealEntireMap(): void {
    const cell = this.exploredMap.cellSize;
    for (let cy = 0; cy < this.exploredMap.rows; cy++) {
      for (let cx = 0; cx < this.exploredMap.cols; cx++) {
        this.fog.reveal((cx + 0.5) * cell, (cy + 0.5) * cell);
      }
    }
    this.exploredMap.drainRevealed();
    // Also drop every POI landmark on the map (not just revealed terrain), so the
    // reveal command surfaces all points of interest at once (the user).
    this.updateAltarDiscovery(true);
    // The corner minimap repaints its nearby window every frame, so it needs no
    // dirty nudge; the full map does.
    this.worldMapUI.markDirty();
    if (!this.worldMapUI.isOpen()) this.worldMapUI.openMap(this.player.x, this.player.y);
    this.eventLog.add("info", "[DEV] Whole map revealed");
  }

  // DEV: window.__dev console commands for fast playtesting — bypasses
  // grinding/farming so a change deep in a build (e.g. a badlands weapon) can
  // be tested without a full playthrough. Installed once per scene instance
  // (survives scene.restart(), since the flag lives on `this`). Intentionally
  // installed in prod builds too (GitHub Pages): this is a single-player game
  // with no backend and only local high scores, so console cheats can't affect
  // anyone else's session — the user wants them on the deployed build.
  private installDevConsole(): void {
    if (this.devConsoleInstalled) return;
    this.devConsoleInstalled = true;
    const dev = {
      god: (on?: boolean) => {
        this.devGodMode = on ?? !this.devGodMode;
        this.eventLog.add("info", `[DEV] God mode ${this.devGodMode ? "ON" : "OFF"}`);
      },
      heal: () => {
        this.health.reset();
        this.refreshHealthBar();
        this.eventLog.add("info", "[DEV] Healed to full");
      },
      // Drop `count` of any item key into the backpack. Handy for testing the
      // ability specials and the B4-P2 epic-loot uniques without farming the
      // ~4-8% container rolls that are their only real source.
      give: (key: string, count = 1) => {
        const def = itemDef(key);
        if (!def) {
          console.warn(`[DEV] Unknown item "${key}".`);
          return;
        }
        if (!this.backpack.addStack({ key, count })) {
          console.warn("[DEV] Backpack full.");
          return;
        }
        this.discoverMaterial(key);
        this.afterItemMove();
        this.eventLog.add("info", `[DEV] Gave ${count} ${def.name}`);
      },
      // A cost + temporary-unlock cheat: while on, crafting/upgrading is free
      // (no ingredient deduction, affordability checks pass), station/armor/
      // weapon upgrades become available even without their mats discovered, AND
      // the crafting menu lists EVERY recipe so anything can be made. The unlock
      // is display-only (CraftingMenu.visibleRecipes) — it never mutates the
      // real discovered set, so toggling it off snaps the list back to what was
      // genuinely discovered rather than permanently revealing every recipe.
      nobuildcost: (on?: boolean) => {
        this.devNoBuildCost = on ?? !this.devNoBuildCost;
        this.refreshDiscovery();
        this.craftingMenu?.refresh();
        // Station menus each gate independently, so any open one needs a repaint
        // to pick the flag up (a toggle mid-menu otherwise looks like a no-op).
        this.cookingMenu?.refresh();
        this.relicForgeMenu?.refresh();
        this.jewelryMenu?.refresh();
        this.eventLog.add("info", `[DEV] Free craft ${this.devNoBuildCost ? "ON" : "OFF"}`);
      },
      // name = a SkillType (e.g. "blunt", "light_armor") or a StatType (e.g.
      // "vitality"). Skills are levels [0,100]; stats are raw allocated points.
      setstat: (name: string, value: number) => {
        const key = name.toLowerCase().trim();
        if (key === "all") {
          for (const s of SKILL_TYPES) this.skills.setLevel(s, value);
          for (const s of STAT_TYPES) this.progression.setStat(s, value);
          this.syncStatBonuses();
          this.characterMenu?.refresh();
          this.refreshStatPointsBadge();
          this.eventLog.add("info", `[DEV] All skills and stats set to ${value}`);
          return;
        }
        if ((SKILL_TYPES as string[]).includes(key)) {
          this.skills.setLevel(key as SkillType, value);
          this.characterMenu?.refresh();
          this.eventLog.add("info", `[DEV] Skill ${key} set to ${value}`);
          return;
        }
        if ((STAT_TYPES as string[]).includes(key)) {
          this.progression.setStat(key as StatType, value);
          this.syncStatBonuses();
          this.characterMenu?.refresh();
          this.refreshStatPointsBadge();
          this.eventLog.add("info", `[DEV] Stat ${key} set to ${value}`);
          return;
        }
        console.warn(
          `[DEV] Unknown stat/skill "${name}". Use __dev.list() to see valid names, or "all" to set ` +
            "every skill and stat at once.",
        );
      },
      spawn: (name: string, elite?: boolean) => {
        const key = name.toLowerCase().trim();
        const factory = DEV_ENEMY_SPAWN_TABLE[key];
        if (!factory) {
          console.warn(`[DEV] Unknown enemy "${name}". Valid: ${Object.keys(DEV_ENEMY_SPAWN_TABLE).join(", ")}.`);
          return;
        }
        // Scatter around the player rather than on top of them, so repeated
        // spawns don't stack exactly and immediately melee the player.
        const angle = Math.random() * Math.PI * 2;
        const x = this.player.x + Math.cos(angle) * 100;
        const y = this.player.y + Math.sin(angle) * 100;
        const enemy = factory(this, x, y, elite ?? false);
        this.enemies.push(enemy);
        this.enemyGroup.add(enemy);
        this.eventLog.add("info", `[DEV] Spawned ${elite ? "elite " : ""}${key}`);
      },
      // Scoped to non-boss enemies only (GremlinKing/Gloamwarden/Cinderwrought/
      // Duneshaper excluded) — this is for clearing trash to test in peace, not
      // for sniping a boss fight/altar state.
      killall: (radius: number = 2000) => {
        const isBossEnemy = (e: Enemy): boolean =>
          e instanceof GremlinKing ||
          e instanceof Gloamwarden ||
          e instanceof Cinderwrought ||
          e instanceof Duneshaper ||
          e instanceof Palewake ||
          e instanceof Kilnborn ||
          e instanceof Sanguinarch ||
          e instanceof Miretyrant;
        const targets = this.enemies.filter(
          (e) => !isBossEnemy(e) && Phaser.Math.Distance.Between(this.player.x, this.player.y, e.x, e.y) <= radius,
        );
        for (const enemy of targets) {
          enemy.playDeathFeedback(() => {});
          this.onShackGuardKilled(enemy);
          this.onDenGuardKilled(enemy);
        }
        this.enemies = this.enemies.filter((e) => !targets.includes(e));
        this.hoveredEnemy = null;
        this.promptText.setVisible(false);
        this.eventLog.add("info", `[DEV] Killed ${targets.length} enemies within ${radius}px`);
      },
      exploremap: () => this.revealEntireMap(),
      // Reference dictionary for setstat()/spawn() names — logs as tables (for
      // a quick glance) and returns the raw arrays (for programmatic use).
      list: () => {
        const skills = [...SKILL_TYPES];
        const stats = [...STAT_TYPES];
        const enemies = Object.keys(DEV_ENEMY_SPAWN_TABLE);
        console.log("[DEV] setstat skill names:", skills);
        console.log('[DEV] setstat stat names (or "all"):', stats);
        console.log("[DEV] spawn enemy names:", enemies);
        return { skills, stats, enemies };
      },
      // Convenience one-liner parser, e.g. __dev.run("spawn duneshaper") or
      // __dev.run("setstat vitality 20"), so console typing doesn't need
      // separate quoted/comma args for the common case.
      run: (cmd: string) => {
        const [name, ...args] = cmd.trim().split(/\s+/);
        switch (name) {
          case "god":
            dev.god(args[0] === undefined ? undefined : args[0] === "true");
            break;
          case "heal":
            dev.heal();
            break;
          case "nobuildcost":
            dev.nobuildcost(args[0] === undefined ? undefined : args[0] === "true");
            break;
          case "setstat":
            dev.setstat(args[0], Number(args[1]));
            break;
          case "spawn":
            dev.spawn(args[0], args[1] === "elite");
            break;
          case "give":
            dev.give(args[0], args[1] === undefined ? 1 : Number(args[1]));
            break;
          case "killall":
            dev.killall(args[0] === undefined ? undefined : Number(args[0]));
            break;
          case "exploremap":
            dev.exploremap();
            break;
          case "list":
            dev.list();
            break;
          default:
            console.warn(`[DEV] Unknown command "${name}".`);
        }
      },
    };
    (window as unknown as { __dev: typeof dev }).__dev = dev;
    console.log(
      '[DEV] Console commands ready: __dev.god() / __dev.heal() / __dev.nobuildcost() / ' +
        '__dev.setstat(name|"all", value) / __dev.spawn(name, elite?) / __dev.give(key, count?) / ' +
        '__dev.killall(radius?) / __dev.exploremap() / __dev.list() -- or __dev.run("...") for one-liners.',
    );
  }

  private createStatPointsBadge(): void {
    const badgeY = MINIMAP_MARGIN + MINIMAP_H + 8;
    this.statPointsBadge = this.add
      .text(this.scale.width - 16, badgeY, "", {
        fontFamily: "monospace",
        fontSize: "13px",
        color: "#ffe08a",
        backgroundColor: "#3a2f10",
        padding: { x: 8, y: 4 },
      })
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(3000)
      .setVisible(false)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => this.openCharacterMenu());
    this.tweens.add({
      targets: this.statPointsBadge,
      y: badgeY + 6,
      duration: 700,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
    this.refreshStatPointsBadge();
  }

  private refreshStatPointsBadge(): void {
    const n = this.progression.unspentPoints;
    if (n <= 0) {
      this.statPointsBadge.setVisible(false);
      return;
    }
    this.statPointsBadge.setText(`${n} Stat Point${n === 1 ? "" : "s"} Available!`).setVisible(true);
  }

  // Big, hard-to-miss (but non-blocking — no input capture, auto-dismisses)
  // center-screen callout on Player Level-up. The existing EventLog line and
  // bobbing statPointsBadge are both easy to miss mid-combat; this is the
  // "catch your eye" version — punch-in scale tween plus a brief camera
  // flash, then fades itself out after a couple seconds.
  private showLevelUpBanner(level: number, points: number): void {
    this.sfx.levelUp();
    const cx = this.scale.width / 2;
    const cy = this.scale.height * 0.3;

    const title = this.add
      .text(cx, cy, `LEVEL UP!`, {
        fontFamily: "monospace",
        fontSize: "48px",
        fontStyle: "bold",
        color: "#ffe08a",
        stroke: "#000000",
        strokeThickness: 7,
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(6000)
      .setAlpha(0)
      .setScale(0.3);

    const sub = this.add
      .text(cx, cy + 44, `Level ${level}  •  +${points} Stat Point${points === 1 ? "" : "s"}`, {
        fontFamily: "monospace",
        fontSize: "18px",
        color: "#ffffff",
        stroke: "#000000",
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(6000)
      .setAlpha(0);

    // Center toasts ("Defeated X", skill level-ups) stay pinned to the TOP of
    // the screen (their default y=72) — this banner lives at 30% screen height,
    // so the two never collide and nothing clusters under the banner. An earlier
    // pass pushed the toast stack DOWN to sit below the banner, but that just
    // dropped the toasts into the center of the screen right under it (playtest:
    // "messages popping up under the level-up text, blocking the center"), which
    // is exactly what we're avoiding. No push — leave the stack at the top.

    // A whole-screen camera.flash was here for two prior tuning passes and
    // stayed "annoying" even dialed way down — per playtest feedback it's cut
    // entirely. The punch-in banner + a local glow behind it below carries all
    // the "big deal" feedback now; no more full-screen flash, no camera shake.
    const glow = this.add
      .circle(cx, cy + 10, 90, 0xffe08a, 0.35)
      .setScrollFactor(0)
      .setDepth(5999)
      .setScale(0.4);
    this.tweens.add({
      targets: glow,
      alpha: 0,
      scale: 1.6,
      duration: 420,
      ease: "Sine.easeOut",
      onComplete: () => glow.destroy(),
    });

    this.tweens.add({
      targets: title,
      alpha: 1,
      scale: 1,
      duration: 260,
      ease: "Back.easeOut",
    });
    this.tweens.add({
      targets: sub,
      alpha: 1,
      duration: 220,
      delay: 120,
    });
    this.tweens.add({
      targets: [title, sub],
      alpha: 0,
      delay: 1700,
      duration: 450,
      onComplete: () => {
        title.destroy();
        sub.destroy();
      },
    });
  }
}
