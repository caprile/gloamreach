import Phaser from "phaser";
import { Player, PLAYER_WALK_SPEED } from "../entities/Player";
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
import { Projectile, type ProjectileConfig } from "../entities/Projectile";
import { GremlinShack, SHACK_GUARD_RESPAWN_MS } from "../entities/GremlinShack";
import { BossAltar } from "../entities/BossAltar";
import { GremlinKing, STAGGER_DAMAGE_MULTIPLIER } from "../entities/GremlinKing";
import { Gloamwarden, WARDEN_STAGGER_DAMAGE_MULTIPLIER } from "../entities/Gloamwarden";
import type { LootRollEntry } from "../systems/LootContainer";
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
  type SkillType,
} from "../systems/Skills";
import {
  PlayerProgression,
  xpToNextPlayerLevel,
  type StatType,
} from "../systems/Progression";
import { Crafting } from "../systems/Crafting";
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
  type WeaponType,
  type DamageType,
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
  type ArmorUpgradeDef,
} from "../systems/ArmorUpgrades";
import {
  weaponUpgradesForItem,
  weaponTierDamageBonus,
  type WeaponUpgradeDef,
} from "../systems/WeaponUpgrades";
import { EventLog } from "../systems/EventLog";
import { Biome, type ZoneType } from "../systems/Biome";
import { Equipment, EQUIP_SLOTS, type EquipSlot, type EquippedItem } from "../systems/Equipment";
import { Hotbar, ROW1_COUNT } from "../systems/Hotbar";
import { ProcessingStation, PROCESS_RECIPES } from "../systems/Processing";
import { BuffManager } from "../systems/Buffs";
import { COOK_RECIPES, type CookRecipe } from "../systems/Cooking";
import { CraftingMenu } from "../ui/CraftingMenu";
import { ContextMenu, type ContextMenuItem } from "../ui/ContextMenu";
import { DryingRackMenu } from "../ui/DryingRackMenu";
import { CookingMenu } from "../ui/CookingMenu";
import { BuffBarUI } from "../ui/BuffBarUI";
import { ChestMenu } from "../ui/ChestMenu";
import { UpgradeMenu, type UpgradeDef } from "../ui/UpgradeMenu";
import { CharacterMenu } from "../ui/CharacterMenu";
import {
  InventoryMenu,
  BACKPACK_SIZE,
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
import { BossHealthUI } from "../ui/BossHealthUI";
import { FogOfWar, REVEAL_RADIUS } from "../systems/Fog";
import { ExploredMap } from "../systems/ExploredMap";
import { ysortDepth } from "../systems/depth";
import { Run, type RunOutcome, type KillCategory } from "../systems/Run";
import { clearHighScores, recordHighScore } from "../systems/HighScores";
import type { ScoreEntry } from "../systems/HighScores";
import { RunHudUI } from "../ui/RunHudUI";
import { RunEndUI } from "../ui/RunEndUI";
import { HintManager } from "../systems/Hints";
import { SfxPlayer } from "../systems/Sfx";
import { HintUI } from "../ui/HintUI";
import { PauseMenuUI } from "../ui/PauseMenuUI";
import { WelcomeUI, hasSeenWelcome } from "../ui/WelcomeUI";
import { DayNight } from "../systems/DayNight";
import { NightOverlayUI, type ScreenLight } from "../ui/NightOverlayUI";
import {
  RelicManager,
  TROPHY_ROLL,
  RELIC_DEFS,
  rarityName,
  REFINE_RECIPES,
  refinableTrophyKeys,
  canAffordRefine,
  type RollResult,
} from "../systems/Relics";
import { RelicForgeMenu } from "../ui/RelicForgeMenu";
import { RelicBarUI } from "../ui/RelicBarUI";

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
const BIOME_RADIUS = 2000; // central content circle (~the old 3584x2688 biome, slightly larger)
const WORLD_RADIUS = 4000; // full circular world edge — big empty ring for future biomes
const WORLD_SIZE = WORLD_RADIUS * 2; // 8000px square that bounds the world circle
const WORLD_CX = WORLD_RADIUS; // world center
const WORLD_CY = WORLD_RADIUS;
// Back-compat: existing spawn/camera code references WORLD_W/WORLD_H and treats
// WORLD_W/2, WORLD_H/2 as "the center" — both still hold now that the world is
// a centered square.
const WORLD_W = WORLD_SIZE;
const WORLD_H = WORLD_SIZE;
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
// Crit (M-SS) soft caps on the COMBINED total (weapon base + Strength/Agility
// stats + relic crit channels). Applied in applyCrit().
const CRIT_CHANCE_CAP = 0.6;
const CRIT_MULT_CAP = 3.0;
const WORKBENCH_RANGE = 100; // px — looser than REACH; "am I near it," not a precise click
const BLACKBERRY_REGROW_MS = 3 * 60 * 1000; // a picked bush regrows berries after 3 in-game minutes
// Comfort (Bedroll) HP regen: player must be near a placed Bedroll, that
// Bedroll must be near a placed Campfire (hard requirement, not optional),
// and no live enemy may currently be aggro'd on the player (see
// isAnyEnemyAggro — not a proximity radius, so a sleeping/wandering enemy
// nearby doesn't block resting).
const COMFORT_RANGE = 80; // px, player <-> Bedroll
const COMFORT_CAMPFIRE_RANGE = 120; // px, Bedroll <-> Campfire
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

// The main gameplay scene: build the world, spawn the player and resources,
// follow the camera, and run the mouse-driven interaction + HUD.
export class MainScene extends Phaser.Scene {
  private player!: Player;
  private biome!: Biome; // procedural zone layout, generated fresh each session
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
  private backpack = new ItemContainer(BACKPACK_SIZE);
  private discovered = new Set<string>();
  // Which StationUpgradeDef.id's have already had their "New Upgrade
  // Unlocked!" toast fired — upgrades live outside the Recipe/Crafting
  // system, so they need their own one-shot discovery tracking (mirrors
  // Crafting's internal discoveredIds, just for a different data table).
  private discoveredUpgradeIds = new Set<string>();
  // Cook recipes (Cooking.ts) discovered so far — one-shot "New Recipe
  // Unlocked!" toast tracking, same as discoveredUpgradeIds but for the cook
  // table. Tier-0 dishes unlock on first campfire placement; tier-1 on upgrade.
  private discoveredCookRecipeIds = new Set<string>();
  // The single tool the player currently has "out". Driven by the selected
  // hotbar slot.
  private equippedTool: ToolType | null = null;
  private equippedWeapon: WeaponType | null = null;
  private equippedWeaponName: string | null = null;
  private equippedWeaponTier = 0;
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
  private openRack: ProcessingStation | null = null; // the rack the menu is bound to
  private hoveredRack: Phaser.GameObjects.Image | null = null;
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
  // Relic Forge (M-RL) — trophies -> RNG relics + combine. Same
  // sourced-from-placedObjects-by-itemKey hover/open shape as the Campfire.
  private relics!: RelicManager;
  private relicForgeMenu!: RelicForgeMenu;
  private relicBarUI!: RelicBarUI;
  private hoveredForge: Phaser.GameObjects.Image | null = null;
  private openForge: Phaser.GameObjects.Image | null = null; // the forge the relic menu is bound to
  private lastRollTrophyKey?: string; // for the deferred reveal's event-log icon
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
  // Gloaming Vein POI — chosen once in create() (after altarPosition, so it can
  // steer clear of the war camp). Its ore nodes start shielded and are cracked
  // open when the Gloamwarden dies. veinLightPoints glow purple at night
  // (collectLights). All reset per run in create() (scene.restart field-init gotcha).
  private veinPosition: { x: number; y: number } | null = null;
  private gloamingVeinNodes: ResourceNode[] = [];
  private gloamwarden: Gloamwarden | null = null;
  private veinCracked = false;
  private veinDiscoveredOnMap = false;
  private veinLightPoints: { x: number; y: number }[] = [];
  // Right-click "Upgrade / Destroy" popup for any placed object (Workbench,
  // Campfire, Drying Rack, ...) — a single generic system, not per-type.
  private contextMenu!: ContextMenu;
  // Full-page panel opened by the context menu's "Upgrade" button, listing
  // every discovered upgrade for whichever placed object is currently bound
  // to it (null when closed).
  private upgradeMenu!: UpgradeMenu;
  private characterMenu!: CharacterMenu;
  // Either a placed object (Workbench/Campfire/Drying Rack) or an equipped
  // armor slot — the UpgradeMenu deps below branch on which one is set.
  private upgradeTarget:
    | Phaser.GameObjects.Image
    | { armorSlot: EquipSlot }
    | { weaponSlot: { container: ItemContainer; index: number } }
    | null = null;
  // The floating "<Name> Lvl N" label shown above any placed object that has
  // at least one defined upgrade (see StationUpgrades.ts) — keyed by the
  // placed Image so it can be moved/updated/destroyed alongside it.
  private placedLabels = new Map<Phaser.GameObjects.Image, Phaser.GameObjects.Text>();
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
  private buffBarUI!: BuffBarUI;
  private healthBarBg!: Phaser.GameObjects.Rectangle;
  private healthBarFill!: Phaser.GameObjects.Rectangle;
  private healthBarText!: Phaser.GameObjects.Text;
  private xpBarBg!: Phaser.GameObjects.Rectangle;
  private xpBarFill!: Phaser.GameObjects.Rectangle; // player-level XP bar, under the hotbar
  private xpBarText!: Phaser.GameObjects.Text; // "Lvl N" label inside the XP bar
  private isDead = false;
  private invulnerableUntil = 0; // this.time.now threshold; incoming damage skipped before this
  private readonly RESPAWN_DELAY_MS = 2000;
  private readonly POST_RESPAWN_INVULN_MS = 1500;

  // Run/score meta-loop (M-R1). `run` tracks elapsed time + kills + score;
  // `runOver` freezes the world once the run-end screen is up.
  private run!: Run;
  private runHudUI!: RunHudUI;
  private runEndUI!: RunEndUI;
  private runOver = false;

  // Contextual hint system (tip popups) + pause overlay. `hints` resets each
  // run (fresh instance in create()); its on/off preference persists. `isPaused`
  // freezes the sim + input while the pause menu is up (Esc).
  private hints = new HintManager();
  private hintUI!: HintUI;
  private pauseMenu!: PauseMenuUI;
  // First-launch welcome + how-to-play overlay. Reuses the same isPaused
  // freeze as the pause menu (see openWelcome/closeWelcome) rather than a
  // parallel freeze flag. `howToPlayFromPause` remembers whether it was
  // opened via the pause menu's "How to Play" button, so closing it returns
  // to the pause menu instead of resuming play.
  private welcomeUI!: WelcomeUI;
  private howToPlayFromPause = false;
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
  private wasNight = false;
  private nightSpawns: Enemy[] = [];
  private equippedLightRadius = 0;
  // Accumulates frame delta toward the next fog-top-up respawn check (see
  // updateRespawns / RESPAWN_TICK_MS). Reset each run.
  private respawnAccumMs = 0;

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
    this.runOver = false;
    this.isDead = false;
    // Hints: fresh per-run "already shown" state (the on/off pref persists in
    // localStorage inside HintManager). Pause: clear the flag + defensively
    // un-freeze physics/clock in case New Run was clicked from the pause menu.
    this.hints = new HintManager();
    this.isPaused = false;
    this.physics.world.resume();
    this.time.paused = false;
    this.run = new Run();
    // Day/night resets to dawn each run (M-DN). NightOverlayUI is a GameObject,
    // rebuilt in createHud() on every create(), so only the plain-object clock
    // + edge tracker + surge list need resetting here (scene.restart() gotcha).
    this.dayNight = new DayNight();
    this.wasNight = false;
    this.nightSpawns = [];
    this.equippedLightRadius = 0;
    this.respawnAccumMs = 0;

    this.nodes = [];
    this.obstacleNodes = [];
    this.skills = new Skills();
    this.progression = new PlayerProgression();
    this.crafting = new Crafting();
    this.backpack = new ItemContainer(BACKPACK_SIZE);
    this.discovered = new Set<string>();
    this.discoveredUpgradeIds = new Set<string>();
    this.discoveredCookRecipeIds = new Set<string>();
    this.equippedTool = null;
    this.equippedWeapon = null;
    this.equippedWeaponName = null;
    this.equippedWeaponTier = 0;
    this.hotbar = new Hotbar();
    this.equipment = new Equipment();
    this.eventLog = new EventLog();
    this.craftingMenuLastNearWorkbench = null;
    this.dryingRacks = [];
    this.openRack = null;
    this.hoveredRack = null;
    this.hoveredWorkbench = null;
    this.hoveredCampfire = null;
    this.openCampfire = null;
    this.relics = new RelicManager();
    this.hoveredForge = null;
    this.openForge = null;
    this.gremlinShacks = [];
    this.openChest = null;
    this.hoveredShack = null;
    this.altarPosition = null;
    this.bossAltars = [];
    this.hoveredAltar = null;
    this.campLightPoints = [];
    this.gremlinKing = null;
    this.veinPosition = null;
    this.gloamingVeinNodes = [];
    this.gloamwarden = null;
    this.veinCracked = false;
    this.veinDiscoveredOnMap = false;
    this.veinLightPoints = [];
    this.upgradeTarget = null;
    this.placedLabels = new Map();
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
    this.buffs = new BuffManager();
    // 2 -> 3: Comfort's "Resting" buff shouldn't have to fight two
    // simultaneous food buffs for one of only 2 slots.
    this.buffs.setMaxBuffs(3);
    this.invulnerableUntil = 0;
    this.placementMode = null;
    this.placementGhost = null;
    this.placedObjects = [];
    this.everPlacedWorkbench = false;
    this.suppressNextPointerdown = false;

    // Procedural biome layout — must exist before spawning so nodes/enemies
    // can query zone type for placement. Seeded randomly per session (not a
    // fixed string) so the world differs every run.
    this.biome = new Biome(BIOME_ORIGIN_X, BIOME_ORIGIN_Y, BIOME_SIZE, BIOME_SIZE, this.sessionRng());

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

    // Ground: one repeating grass texture (the "grassy" look), with the biome
    // overlay baked on top of it — both kept below every entity.
    this.add.tileSprite(0, 0, WORLD_W, WORLD_H, "grass").setOrigin(0, 0).setDepth(-10);
    this.buildBiomeTexture();
    // Circular world edge: a dark "void" ring beyond WORLD_RADIUS so the
    // playable area reads as a round island, not an invisible wall in open grass.
    this.drawWorldBoundary();

    // Physics/camera bounds are the bounding square; the player is additionally
    // clamped to the world CIRCLE each frame (clampPlayerToWorld).
    this.physics.world.setBounds(0, 0, WORLD_W, WORLD_H);
    this.cameras.main.setBounds(0, 0, WORLD_W, WORLD_H);

    // Spawn the player in the middle and follow it smoothly.
    this.player = new Player(this, WORLD_W / 2, WORLD_H / 2);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);

    // Reach preview ring — only drawn while a tool/weapon is equipped, kept
    // just above the ground and below entities (Milestone F).
    this.attackRangeRing = this.add.graphics().setDepth(-5);
    this.hoverHighlight = this.add.graphics();

    // Trees and boulders are solid; the player bumps into them.
    const solids = this.physics.add.staticGroup();
    this.spawnNodes(solids);
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
    this.physics.add.collider(this.enemyGroup, solids);
    this.physics.add.collider(this.player, this.enemyGroup);

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
      this.applyDamageToPlayer(projectile.damage);
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
      if (!enemy.depleted) this.resolveWeaponHit(enemy, projectile.damage, "ranged", projectile.isCrit);
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
    this.createChestMenu();
    this.createUpgradeMenu();
    this.createCharacterMenu();
    this.createRelicForgeMenu();
    this.hotbarUI = new HotbarUI(this, this.hotbar, {
      skills: this.skills,
      progression: this.progression,
      beginDrag: (c, i, p) => this.beginItemDrag(c, i, p),
      openWeaponUpgrade: (c, i) => this.openWeaponUpgradeMenu(c, i),
      eatItem: (c, i) => this.eatItem(c, i),
      isDragging: () => this.dragSource !== null,
    });
    this.createStaminaBar();
    this.createHealthBar();
    this.createBuffBar();
    this.createXpBar();
    this.createRelicBar();
    this.createStatPointsBadge();
    // Sits beside the Keybinds panel (same top row), not stacked underneath
    // it — an open InventoryMenu panel occupies that same top-left column
    // and used to cover the log whenever it was open.
    this.eventLogUI = new EventLogUI(this, this.eventLog, this.keybindsUI.right + 12, this.keybindsUI.top);

    // Minimap + fog of war (World & discovery roadmap item 6) — FogOfWar owns
    // the reveal grid, MinimapUI draws/repaints it. Sized 1:1 to the minimap's
    // own pixel resolution so a revealed cell maps directly to one pixel.
    this.fog = new FogOfWar(WORLD_SIZE, WORLD_SIZE, FOG_COLS, FOG_COLS);
    this.exploredMap = new ExploredMap(this.biome, this.fog, WORLD_CX, WORLD_CY, WORLD_RADIUS);
    this.minimapUI = new MinimapUI(this, this.exploredMap);
    this.worldMapUI = new WorldMapUI(this, this.exploredMap);
    this.createMapButton();
    this.bossHealthUI = new BossHealthUI(this);
    // Night darkness + torch-light layer (M-DN). Depth ~2700 sits above the
    // world but below the minimap/HUD created around it, so only the world dims.
    this.nightOverlay = new NightOverlayUI(this);
    this.runHudUI = new RunHudUI(this);
    this.runEndUI = new RunEndUI(this);

    // Contextual hints (tip popups) + pause menu (Esc). The hint UI just
    // renders whatever HintManager decides to surface.
    this.hintUI = new HintUI(this);
    this.hints.onShow((text) => this.hintUI.show(text));
    this.pauseMenu = new PauseMenuUI(this);
    this.welcomeUI = new WelcomeUI(this);
    this.howToPlayFromPause = false;
    // Opening nudge: movement + goal, a beat after the world loads.
    this.time.delayedCall(1500, () => this.hints.trigger("awaken"));
    // First-ever launch (per browser, localStorage-backed): show the
    // welcome/how-to-play overlay before the player can act. Skipped on every
    // later run/session once dismissed once.
    if (!hasSeenWelcome()) this.openWelcome();

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
    });
    this.input.on("pointerup", (p: Phaser.Input.Pointer) => {
      this.resolveItemDrag(p);
      this.dryingRackMenu.endSliderDrag();
      this.craftingMenu.endSliderDrag();
      this.cookingMenu.endSliderDrag();
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
      if (this.welcomeUI.isOpen()) return this.closeWelcome();
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
        if (this.runOver) return;
        this.selectHotbarSlot(event.altKey ? ROW1_COUNT + i : i);
      });
    });
    this.input.keyboard!.on("keydown-V", () => !this.runOver && this.toggleMagnet());
    this.input.keyboard!.on("keydown-O", () => !this.runOver && this.toggleRangeRing());
    this.input.keyboard!.on("keydown-K", () => !this.runOver && this.characterMenu.toggle());
    this.input.keyboard!.on("keydown-R", () => !this.runOver && this.takeAllFromChest());
    this.input.keyboard!.on("keydown-H", () => !this.runOver && this.toggleWheelSpansBothRows());
    this.input.keyboard!.on("keydown-J", () => this.runHudUI.toggleMinimized());
    this.input.keyboard!.on("keydown-M", () => !this.runOver && this.toggleWorldMap());

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
      this.eventLog.add("levelup", `Level Up! You are now Level ${level} (+${points} points)`);
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
  }

  update(_time: number, delta: number): void {
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
      this.runHudUI.update(this.run, this.dayNight);
      this.stamina.tick(delta);
      this.refreshStaminaBar();
      this.player.syncEquippedIconPosition();
      this.updateAttackRangeRing();
      this.updateEnemies(delta);
      this.updateMagnet(delta);
      this.updateTreeOcclusion(delta);
      this.updateMapReveal();
      this.bossHealthUI.update(this.gremlinKing);
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
    // Relic move-speed bonus (M-RL) multiplies walk & sprint alike.
    const frame = this.player.update(delta, canSprint, canDash, sprintMultiplier, this.relics.moveSpeedMult());
    this.clampPlayerToWorld();

    if (frame.sprinting) {
      this.stamina.spend(sprintCost);
      this.awardSkillXp("running", RUNNING_XP_PER_SEC * (delta / 1000));
    }
    if (frame.dashStarted) {
      this.stamina.spend(DASH_STAMINA_COST);
      // light_armor extends the dodge window (M-SS "Evade Window").
      this.invulnerableUntil = this.time.now + DASH_IFRAME_MS + dashIframeBonusMs(this.skills);
      this.player.playDashFx();
    }
    this.run.tick(delta);
    this.updateDayNight(delta);
    this.runHudUI.update(this.run, this.dayNight);
    this.stamina.tick(delta);
    this.refreshStaminaBar();
    // Contextual hint: nearly-empty stamina. (First-damage-taken hint fires
    // from applyDamageToPlayer() instead, right when it actually happens.)
    if (this.stamina.value() < 5) this.hints.trigger("stamina_empty");
    this.updateComfortRegen();
    // Food buffs heal over time; refresh the HP bar only when they actually
    // healed, and keep the buff HUD in sync each frame (countdown/expiry).
    if (this.buffs.tick(delta, this.health).healed) this.refreshHealthBar();
    this.buffBarUI.sync(this.buffs.active());
    this.player.syncEquippedIconPosition();
    this.updateAttackRangeRing();

    if (this.placementMode) this.updatePlacementGhost();
    else if (!this.anyMenuOpen() && !this.worldMapUI.isOpen()) this.updateHover();
    this.updateMagnet(delta);
    this.updateEnemies(delta);
    this.updateRespawns(delta);
    this.updateTreeOcclusion(delta);
    this.updateMapReveal();
    this.bossHealthUI.update(this.gremlinKing);
    this.updateCraftingMenuWorkbenchProximity();
  }

  // Advance fog-of-war + both map views. ExploredMap is the single consumer of
  // the fog reveal queue (drainRevealed updates the shared color cache both the
  // corner minimap and the full map read); a fresh reveal while the full map is
  // open marks its terrain dirty so it repaints.
  private updateMapReveal(): void {
    this.exploredMap.reveal(this.player.x, this.player.y);
    const changed = this.exploredMap.drainRevealed();
    if (changed.length > 0) this.worldMapUI.markDirty();
    this.minimapUI.update(this.player.x, this.player.y);
    this.updateAltarDiscovery();
    if (this.worldMapUI.isOpen()) this.worldMapUI.update(this.player.x, this.player.y);
  }

  // Advance the day/night clock and drive its effects (M-DN): fade the world
  // darkness + torch lights, dim the minimap, and fire the day<->night edge
  // events (nightfall surge / dawn cleanup). Called from both the alive and
  // dead branches of update(), so time keeps flowing while dead but a surge
  // only spawns while alive.
  private updateDayNight(delta: number): void {
    this.dayNight.tick(delta);
    this.nightOverlay.render(this.dayNight.nightIntensity01(), this.collectLights());
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
  // Altar). World -> screen is a plain scroll subtract since the camera zoom
  // is 1. Off-screen POIs are skipped so the erase list stays short.
  private collectLights(): ScreenLight[] {
    const lights: ScreenLight[] = [];
    const cam = this.cameras.main;
    const toScreen = (wx: number, wy: number) => ({ x: wx - cam.scrollX, y: wy - cam.scrollY });
    if (this.equippedLightRadius > 0) {
      const p = toScreen(this.player.x, this.player.y);
      lights.push({ x: p.x, y: p.y, radius: this.equippedLightRadius });
    }
    const margin = POI_LIGHT_RADIUS;
    const onScreen = (wx: number, wy: number) =>
      wx >= cam.scrollX - margin &&
      wx <= cam.scrollX + cam.width + margin &&
      wy >= cam.scrollY - margin &&
      wy <= cam.scrollY + cam.height + margin;
    for (const shack of this.gremlinShacks) {
      if (!onScreen(shack.x, shack.y)) continue;
      const s = toScreen(shack.x, shack.y);
      lights.push({ x: s.x, y: s.y, radius: POI_LIGHT_RADIUS });
    }
    for (const altar of this.bossAltars) {
      if (!onScreen(altar.x, altar.y)) continue;
      const s = toScreen(altar.x, altar.y);
      lights.push({ x: s.x, y: s.y, radius: POI_LIGHT_RADIUS });
    }
    // War Camp braziers (M-WC) glow like any other POI light.
    for (const b of this.campLightPoints) {
      if (!onScreen(b.x, b.y)) continue;
      const s = toScreen(b.x, b.y);
      lights.push({ x: s.x, y: s.y, radius: POI_LIGHT_RADIUS });
    }
    // Gloaming Vein crystals glow at night (a purple beacon that doubles as a
    // navigation hint — the vein's own amethyst color shows through the erased
    // hole, like the war camp glows).
    for (const v of this.veinLightPoints) {
      if (!onScreen(v.x, v.y)) continue;
      const s = toScreen(v.x, v.y);
      lights.push({ x: s.x, y: s.y, radius: 110 });
    }
    return lights;
  }

  // Nightfall surge (M-DN): drop a small mix of normal enemies into still-
  // unexplored cells around the player. Tracked in nightSpawns so dawn can cull
  // any that never engaged — density returns to baseline each morning.
  private spawnNightBatch(): void {
    const rng = this.sessionRng();
    const spawn = (make: (x: number, y: number) => Enemy) => {
      const { x, y } = this.pickNightSpawnPoint(rng);
      const enemy = make(x, y);
      this.enemies.push(enemy);
      this.enemyGroup.add(enemy);
      this.nightSpawns.push(enemy);
    };
    // First-pass mix (~6): 2 Boar, 2 Snake, 2 Gremlin. Each rolls elite at the
    // night-multiplied chance (M-EL2) — the nightfall surge is also where
    // the user wanted a higher elite rate, on top of already being denser/
    // faster (M-DN).
    for (let i = 0; i < 2; i++) {
      spawn((x, y) => new Boar(this, { x, y, elite: this.rollElite(rng, NIGHT_ELITE_CHANCE_MULT) }));
    }
    for (let i = 0; i < 2; i++) {
      spawn((x, y) => new Snake(this, { x, y, elite: this.rollElite(rng, NIGHT_ELITE_CHANCE_MULT) }));
    }
    for (let i = 0; i < 2; i++) {
      spawn((x, y) => new RangedGremlin(this, { x, y, elite: this.rollElite(rng, NIGHT_ELITE_CHANCE_MULT) }));
    }
    this.eventLog.add("info", "Night falls — the forest stirs...");
    this.hints.trigger("nightfall"); // first nightfall -> torch/danger nudge
  }

  // At dawn, remove any night-spawn that never aggro'd and is off-screen. Ones
  // that engaged the player (or are still near/visible) stay and simply drop
  // out of nightSpawns tracking (now permanent roster). This is what keeps a
  // long multi-night run from accumulating ever-denser enemies.
  private cleanupNightSpawns(): void {
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
    this.respawnAccumMs += delta;
    if (this.respawnAccumMs < RESPAWN_TICK_MS) return;
    this.respawnAccumMs = 0;

    const isBoss = (e: Enemy) => e instanceof GremlinKing || e instanceof Gloamwarden;
    const alive = this.enemies.filter((e) => !e.depleted && !isBoss(e));
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
      this.enemies.push(enemy);
      this.enemyGroup.add(enemy);
    }
  }

  // Pick a respawn species weighted by the baseline spawnEnemies() mix
  // (Boar 24 / Snake 28 / RangedGremlin 22 / MeleeGremling 8 = 82) — meat sources
  // (Boar/Snake, ~63%) dominate, so respawns solve the food shortage directly
  // while keeping variety. Elite rolls at the standard chance (night-boosted,
  // matching every other spawn path).
  private makeRespawnEnemy(
    rng: Phaser.Math.RandomDataGenerator,
    x: number,
    y: number,
    eliteMult: number,
  ): Enemy {
    const elite = this.rollElite(rng, eliteMult);
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

  private anyMenuOpen(): boolean {
    return (
      this.craftingMenu.isOpen() ||
      this.inventoryMenu.isOpen() ||
      this.dryingRackMenu.isOpen() ||
      this.cookingMenu.isOpen() ||
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
    this.equippedWeapon = def?.weapon ?? null;
    this.equippedWeaponName = def?.weapon ? def.name : null;
    this.equippedWeaponTier = def?.weapon ? stack?.tier ?? 0 : 0;
    const iconTexture = def && (def.tool || def.weapon) ? def.texture : null;
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
      const rackBagIndex = this.dryingRackMenu.slotIndexAt(pointer.x, pointer.y);
      if (rackBagIndex !== null) {
        // Click-in-place on the rack's own backpack grid: double-click or
        // Ctrl-click quick-loads the whole stack into the rack's input,
        // mirroring the existing right-click quickLoad gesture.
        if (src.container === this.backpack && src.index === rackBagIndex) {
          if (this.isQuickMoveClick(pointer, `rack:${rackBagIndex}`)) this.loadRackInput(this.backpack, rackBagIndex);
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
      const chestBagIndex = this.chestMenu.slotIndexAt(pointer.x, pointer.y);
      if (chestBagIndex !== null) {
        // Click-in-place on the chest menu's own backpack grid: double-click
        // or Ctrl-click quick-moves that stack into the chest instead.
        if (src.container === this.backpack && src.index === chestBagIndex) {
          if (chestContainer && this.isQuickMoveClick(pointer, `chestin:${chestBagIndex}`)) {
            const to = chestContainer.findAssignable(stack.key);
            if (to !== null) moveSlot(this.backpack, chestBagIndex, chestContainer, to);
            this.afterItemMove();
          }
          return;
        }
        moveSlot(src.container, src.index, this.backpack, chestBagIndex);
        this.afterItemMove();
        return;
      }
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

    // Inventory menu open: dropping onto its matching paper-doll slot equips
    // an armor item. Dropping a non-armor item, or an armor item on the
    // wrong slot, just falls through and snaps back (nothing was removed).
    if (this.inventoryMenu.isOpen()) {
      const armorSlot = this.inventoryMenu.armorSlotAt(pointer.x, pointer.y);
      if (armorSlot !== null) {
        if (itemDef(stack.key)?.armorSlot === armorSlot) this.equipArmorFromContainer(src.container, src.index);
        return;
      }
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
    const bagIndex = this.inventoryMenu.slotIndexAt(pointer.x, pointer.y);
    if (bagIndex !== null) {
      // Click-in-place on a backpack slot: a DOUBLE left-click quick-moves
      // the stack (to the hotbar, or equips it — see quickMoveItem), same
      // action right-click used to trigger. A SINGLE click on a placeable
      // enters placement mode instead (e.g. a station recovered via
      // Destroy) — deferred behind the double-click window so a following
      // second click quick-moves it instead of arming placement mode first
      // (see deferSingleClick's own comment for why that ordering matters).
      // A single click on a non-placeable is a no-op, same as before.
      if (src.container === this.backpack && src.index === bagIndex) {
        const key = `bag:${bagIndex}`;
        if (this.isQuickMoveClick(pointer, key)) {
          this.quickMoveItem(this.backpack, bagIndex);
        } else if (itemDef(stack.key)?.placeable) {
          this.deferSingleClick(() => this.startItemPlacement(this.backpack, bagIndex));
        }
        return;
      }
      moveSlot(src.container, src.index, this.backpack, bagIndex);
      this.afterItemMove();
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
    if (!overPanel) this.dropStackToWorld(src.container, src.index, stack);
  }

  // Resolves a drag started from an equipped paper-doll slot — the
  // drag-to-unequip gesture. Dropping back on any paper-doll slot (itself or
  // another) is a no-op/snap-back; dropping on a backpack slot unequips there
  // specifically; dropping outside every panel/HUD unequips to the floor.
  private resolveArmorDrag(slot: EquipSlot, pointer: Phaser.Input.Pointer): void {
    if (!this.inventoryMenu.isOpen()) return; // can't have started this drag otherwise
    if (this.inventoryMenu.armorSlotAt(pointer.x, pointer.y) !== null) return;

    const bagIndex = this.inventoryMenu.slotIndexAt(pointer.x, pointer.y);
    if (bagIndex !== null) {
      this.unequipArmorSlot(slot, bagIndex);
      return;
    }

    if (!this.inventoryMenu.containsPoint(pointer.x, pointer.y) && !this.pointerOverHud(pointer)) {
      this.unequipArmorSlot(slot);
    }
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
    this.reconcileBackpackDiscovery();
    this.inventoryMenu.refresh();
    this.dryingRackMenu.refresh();
    this.cookingMenu.refresh();
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
      quickLoad: (i) => this.loadRackInput(this.backpack, i),
      isDragging: () => this.dragSource !== null,
      retrieveInput: () => this.retrieveRackInput(),
      processAmount: (amount) => this.processRackAmount(amount),
    });
  }

  private openDryingRackMenu(image: Phaser.GameObjects.Image): void {
    const rack = this.dryingRacks.find((r) => r.image === image);
    if (!rack) return;
    this.craftingMenu.close();
    this.inventoryMenu.close();
    this.closeUpgradeMenu();
    this.closeRelicForgeMenu();
    this.openRack = rack.station;
    this.dryingRackMenu.openMenu();
  }

  private closeDryingRackMenu(): void {
    this.dryingRackMenu.close();
    this.openRack = null;
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
    });
  }

  private openRelicForgeMenu(image: Phaser.GameObjects.Image): void {
    this.craftingMenu.close();
    this.inventoryMenu.close();
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
    if (!TROPHY_ROLL[trophyKey] || this.backpack.count(trophyKey) < 1) return null;
    this.backpack.removeCount(trophyKey, 1);
    this.lastRollTrophyKey = trophyKey;
    const result = this.relics.roll(trophyKey);
    // The forge menu defers this to the slot-machine reveal (announce=false) so
    // the log + relic-bar + stat bonuses land at the satisfying moment.
    if (announce) this.announceRelicResult(result);
    return result;
  }

  // Log the outcome + re-sync the HUD/stat bonuses. Called at reveal time by the
  // forge menu's deferred announceRoll, or inline for any non-menu roll path.
  private announceRelicResult(result: RollResult | null): void {
    const tex = this.lastRollTrophyKey ? itemDef(this.lastRollTrophyKey)?.texture : undefined;
    if (result?.success && result.id) {
      const def = RELIC_DEFS[result.id];
      this.eventLog.add("recipe", `Relic forged: ${def.name} (${rarityName(def.rarity)})`, tex);
    } else if (result) {
      this.eventLog.add("info", "The trophy crumbled to dust — no relic this time.", tex);
    }
    this.afterRelicChange();
  }

  // Shared post-roll refresh: relic effects may change max HP/stamina, and both
  // the forge menu (owned grid + trophy counts) and the HUD relic bar need
  // re-syncing; a consumed trophy also changed backpack/hotbar counts.
  private afterRelicChange(): void {
    this.syncStatBonuses();
    this.relicForgeMenu.refresh();
    this.relicBarUI.sync(this.relics.groupedForDisplay());
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
    // re-guard defensively).
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

  // Announce (once each) the cook recipes a campfire of `maxTier` makes
  // available — fired on first campfire placement (tier 0) and on upgrade
  // (tier 1). Mirrors the recipe-unlock toast the crafting system uses.
  private discoverCookRecipes(maxTier: number): void {
    for (const r of COOK_RECIPES) {
      if (r.requiredCampfireTier > maxTier) continue;
      if (this.discoveredCookRecipeIds.has(r.id)) continue;
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
    if (tier < recipe.requiredCampfireTier) return;
    const affordable = Object.entries(recipe.inputs).every(([key, n]) => this.backpack.count(key) >= n * batches);
    if (!affordable) return;
    for (let i = 0; i < batches; i++) {
      for (const [key, n] of Object.entries(recipe.inputs)) this.backpack.removeCount(key, n);
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
    let costBatches = Infinity;
    for (const [key, n] of Object.entries(recipe.inputs)) {
      if (n <= 0) continue;
      costBatches = Math.min(costBatches, Math.floor(this.backpack.count(key) / n));
    }
    if (!Number.isFinite(costBatches)) costBatches = 0;
    const roomBatches = this.backpack.roomFor(recipe.output);
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
    container.removeCount(stack.key, 1);
    this.buffs.apply({
      id: def.key,
      name: def.name,
      icon: def.texture,
      hpPerSec: def.edible.hpPerSec,
      durationMs: def.edible.durationMs,
    });
    this.buffBarUI.sync(this.buffs.active());
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

  private openChestMenu(shack: GremlinShack): void {
    this.craftingMenu.close();
    this.inventoryMenu.close();
    this.closeUpgradeMenu();
    this.closeRelicForgeMenu();
    shack.loot.rollIfEmpty(GREMLIN_SHACK_LOOT_TABLE);
    this.openChest = shack.loot.items;
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
    if (altar.summoned) return;
    if (this.hotbar.container.count("gremlin_totem") >= 1) {
      this.hotbar.container.removeCount("gremlin_totem", 1);
    } else if (this.backpack.count("gremlin_totem") >= 1) {
      this.backpack.removeCount("gremlin_totem", 1);
    } else {
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
    return rng.frac() < Math.min(1, ELITE_SPAWN_CHANCE * chanceMult);
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

  private buildBiomeTexture(): void {
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
        const forestW = this.biome.forestWeight(wx, wy);
        if (forestW > 0.02) {
          g.fillStyle(0x24421c, 0.55 * forestW);
          g.fillRect(lx, ly, step, step);
        }
        const creekW = this.biome.creekWeight(wx, wy);
        if (creekW > 0.02) {
          g.fillStyle(0x3a6ea5, 0.6 * creekW);
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
    ) => {
      const CLUSTER_JITTER = 40;
      let placed = 0;
      while (placed < totalCount) {
        const remaining = totalCount - placed;
        const size = Math.min(remaining, rng.between(clusterMin, clusterMax));
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
    scatter(76, { texture: "branch", resource: "wood", amount: 1, action: "pickup", displayName: "Branch", loose: false, solid: false, health: 1, zone: "forest", avoidCreek: true });
    scatter(56, { texture: "rock", resource: "stone", amount: 1, action: "pickup", displayName: "Rock", loose: false, solid: false, health: 1, zone: null, avoidCreek: true });
    // Tool-gated. Trees are dense in the forest and sparse in the grassy open;
    // both stay off the creek (a tree on water looks wrong). Boulders favor the
    // grassy open. Neither blocks movement (see updateTreeOcclusion for the
    // Y-sort + fade that replaces solid collision) — only the `solids` group
    // (currently empty) is reserved for future structures/walls/mountains.
    scatter(132, { texture: "tree", resource: "wood", amount: 5, action: "chop", displayName: "Tree", loose: false, solid: false, health: 3, zone: "forest", avoidCreek: true });
    scatter(26, { texture: "tree", resource: "wood", amount: 5, action: "chop", displayName: "Tree", loose: false, solid: false, health: 3, zone: "grassy", avoidCreek: true });
    scatter(34, { texture: "boulder", resource: "stone", amount: 5, action: "mine", displayName: "Boulder", loose: false, solid: false, health: 3, zone: "grassy", avoidCreek: true });
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

  // Scatter Gremlin Shacks (first POI) through the forest zone, spread apart
  // via the same pickSpreadSpawnPoint pool the Gremlin-family enemies use.
  // 3 of the 5 populate the War Camp as its "huts" — evenly spaced in a fan on
  // the side of the camp opposite the entrance gate (not a random roll),
  // per playtest feedback that a random pickPointNearAltar roll read as a
  // clumped, messy scatter instead of an arranged camp. The other 2 stay wild
  // standalone POIs via the normal spread-spawn pool. First-pass/tunable counts.
  private spawnGremlinShacks(): void {
    const rng = this.sessionRng();
    const SHACK_COUNT = 5;
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

    const warden = new Gloamwarden(this, { x: c.x, y: c.y });
    this.gloamwarden = warden;
    this.enemies.push(warden);
    this.enemyGroup.add(warden);

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
        amount: rng.between(1, 2),
        action: "mine",
        displayName: "Gloaming Vein",
        loose: false,
        health: 2, // ~2 hits each
        shielded: true,
      });
      this.nodes.push(node);
      this.obstacleNodes.push(node);
      this.gloamingVeinNodes.push(node);
      this.veinLightPoints.push({ x, y });
    }

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

  // A discovered (not summoned) Boss Altar gets a one-time landmark marker on
  // the minimap once the player has actually explored close enough to reveal
  // its fog cell — reuses fog's own REVEAL_RADIUS so "discovered" means the
  // same thing here as it does for terrain. Deliberately per-altar/one-shot,
  // not a live blip — keeps the minimap's locked "no entity blips" rule intact
  // (a fixed landmark once found is conceptually more like revealed terrain).
  private updateAltarDiscovery(): void {
    const inReveal = (x: number, y: number) =>
      Phaser.Math.Distance.Between(this.player.x, this.player.y, x, y) <= REVEAL_RADIUS;
    // Boss Altar / War Camp — a larger red marker so the camp is the standout
    // landmark on the minimap.
    for (const altar of this.bossAltars) {
      if (altar.discoveredOnMap) continue;
      if (Phaser.Math.Distance.Between(this.player.x, this.player.y, altar.x, altar.y) > ALTAR_DISCOVERY_RADIUS)
        continue;
      altar.discoveredOnMap = true;
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
      if (!inReveal(shack.x, shack.y)) continue;
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
    if (this.veinPosition && !this.veinDiscoveredOnMap && inReveal(this.veinPosition.x, this.veinPosition.y)) {
      this.veinDiscoveredOnMap = true;
      this.exploredMap.addLandmark({
        worldX: this.veinPosition.x,
        worldY: this.veinPosition.y,
        iconKey: "map_vein",
        label: "Gloaming Vein",
        tint: 0x9a5ee8,
      });
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
    let hoveredAltar: BossAltar | null = null;
    let hoveredWorkbench: Phaser.GameObjects.Image | null = null;
    let hoveredCampfire: Phaser.GameObjects.Image | null = null;
    let hoveredForge: Phaser.GameObjects.Image | null = null;
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
        best = d;
      }
    }
    for (const enemy of this.enemies) {
      if (enemy.depleted) continue;
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
        best = d;
      }
    }
    // Workbench (crafting menu), Campfire (cooking menu) and Relic Forge (relic
    // menu) are all plain placedObjects, distinguished by itemKey — handled in
    // one loop since they share the same hover/reach/interact shape.
    for (const obj of this.placedObjects) {
      const key = obj.getData("itemKey");
      if (key !== "workbench" && key !== "campfire" && key !== "relic_forge") continue;
      const radius = Math.max(obj.displayWidth, obj.displayHeight) / 2 + 6;
      const d = Phaser.Math.Distance.Between(world.x, world.y, obj.x, obj.y);
      if (d <= radius && d < best) {
        hoveredWorkbench = key === "workbench" ? obj : null;
        hoveredCampfire = key === "campfire" ? obj : null;
        hoveredForge = key === "relic_forge" ? obj : null;
        hoveredNode = null;
        hoveredEnemy = null;
        hoveredRack = null;
        hoveredShack = null;
        hoveredAltar = null;
        best = d;
      }
    }

    this.hoveredNode = hoveredNode;
    this.hoveredEnemy = hoveredEnemy;
    this.hoveredRack = hoveredRack;
    this.hoveredShack = hoveredShack;
    this.hoveredAltar = hoveredAltar;
    this.hoveredWorkbench = hoveredWorkbench;
    this.hoveredCampfire = hoveredCampfire;
    this.hoveredForge = hoveredForge;

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
      this.hoveredAltar?.image ??
      this.hoveredWorkbench ??
      this.hoveredCampfire ??
      this.hoveredForge ??
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
  private static readonly BASELINE_ENEMY_RADIUS = 13;
  private enemyReach(enemy: Enemy): number {
    const radius = Math.max(enemy.displayWidth, enemy.displayHeight) / 2;
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
    // Flag the tougher variants right in the prompt so a player knows what
    // they're swinging at (paired with a red prompt color in updateHover).
    const prefix = enemy.elite ? "Elite " : "";
    return `[LMB] Attack ${prefix}${enemy.displayName}`;
  }

  // Prompt color for the currently hovered target: crimson for a boss/mini-boss
  // or an elite (a "this one's dangerous" tell), plain white otherwise.
  private promptColorFor(): string {
    const e = this.hoveredEnemy;
    if (!e) return "#ffffff";
    if (e instanceof GremlinKing || e instanceof Gloamwarden) return "#ff5a5a";
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

  private promptForForge(image: Phaser.GameObjects.Image): string | null {
    const inReach = Phaser.Math.Distance.Between(this.player.x, this.player.y, image.x, image.y) <= REACH;
    return inReach ? "[LMB] Use Relic Forge" : null;
  }

  // Mirrors the tool-kind gating philosophy exactly: no Gremlin Totem
  // selected in the hotbar -> show nothing, never reveal what's required
  // (same "no tool of the right kind -> show nothing" rule as promptFor()).
  // Also hides once the boss has already been summoned this session.
  private promptForAltar(altar: BossAltar): string | null {
    const inReach = Phaser.Math.Distance.Between(this.player.x, this.player.y, altar.x, altar.y) <= REACH;
    if (!inReach || altar.summoned) return null;
    const selected = this.hotbar.get(this.hotbar.selected());
    if (!selected || selected.key !== "gremlin_totem") return null;
    return "[LMB] Place Totem";
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
      if (inReach) this.openChestMenu(this.hoveredShack);
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
      // (Future: also gate success on tool TIER here — a stone axe may be too
      // weak for a hardwood tree, which would show "[LMB] Chop" but fail.)

      // Cap hit rate so holding/spamming LMB can't out-farm the tool's swing.
      const cooldownMs = toolCooldownMs(this.equippedTool);
      if (this.time.now - this.lastToolHitAt < cooldownMs) return;

      // Relic stamina-cost reduction (M-RL) applies to tool swings too.
      const staminaCost = Math.round(toolStaminaCost(this.equippedTool) * this.relics.staminaCostMult());
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
      const bonusChance = kind === "axe" ? choppingBonusChance(this.skills) : miningBonusChance(this.skills);
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
    if (itemDef(node.resource)?.placeable) {
      const row2Slot = this.hotbarRow2Assignable(node.resource);
      if (row2Slot !== null) {
        this.hotbar.container.set(row2Slot, { key: node.resource, count: node.amount, tier: node.tier });
        this.hotbarUI.refresh();
        this.discoverMaterial(node.resource);
        this.refreshDiscovery();
        return;
      }
    }
    if (node.tier !== undefined) {
      const stack: ItemStack = { key: node.resource, count: node.amount, tier: node.tier };
      if (!this.backpack.addStack(stack)) {
        this.spawnLooseDrop(node.resource, node.amount, node.x, node.y, DROPPED_ITEM_MAGNET_COOLDOWN_MS, node.tier);
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

    const cooldownMs = weaponCooldownMs(this.equippedWeapon);
    if (this.time.now - this.lastWeaponHitAt < cooldownMs) return;

    // Damage type routes the on-hit skill XP. Weapon damage itself scales with
    // the weapon SKILL's own level (not player stat points) — see Skills.ts.
    // (Strength/Agility no longer discount stamina cost — retired in M-SS; only
    // relics do now.)
    const dmgType = weaponPrimaryDamageType(this.equippedWeapon);
    const staminaCost = Math.round(weaponStaminaCost(this.equippedWeapon) * this.relics.staminaCostMult());
    if (!this.stamina.canAfford(staminaCost)) return; // exhausted — silent, same as tool guard

    this.lastWeaponHitAt = this.time.now;
    this.stamina.spend(staminaCost);
    this.player.playSwing();
    this.player.playEquippedSwing();

    const baseDmg = weaponDamage(this.equippedWeapon) + weaponTierDamageBonus(this.equippedWeapon, this.equippedWeaponTier);
    // Kept fractional all the way to takeHit — a skill's +0.5%/level bonus
    // used to get thrown away by an early Math.round (e.g. Blunt 10 on a
    // base-5 weapon rounds right back to 5, so the bonus was invisible AND
    // had zero real effect). Only the floating combat-text number rounds for
    // display; the true float is what actually damages the enemy, so small
    // skill increments always matter even when the displayed number doesn't
    // visibly change hit-to-hit.
    // Weapon skill bonus + relic damage bonus (M-RL), kept fractional to
    // takeHit (see the fractional-damage note above).
    let dmg = baseDmg * weaponSkillDamageMultiplier(dmgType, this.skills) * this.relics.damageMult();
    // Poise-break punish window — bonus damage while a staggerable boss/mini-boss
    // is staggered.
    if (enemy instanceof GremlinKing && enemy.isStaggered()) dmg *= STAGGER_DAMAGE_MULTIPLIER;
    if (enemy instanceof Gloamwarden && enemy.isStaggered()) dmg *= WARDEN_STAGGER_DAMAGE_MULTIPLIER;
    // Crit is the final multiplicative step (M-SS), rolled here where the weapon
    // is known — carried into resolveWeaponHit only for the tint.
    const critResult = this.applyCrit(this.equippedWeapon, dmg);
    this.resolveWeaponHit(enemy, critResult.dmg, dmgType, critResult.crit);
  }

  // Ranged: cooldown/stamina/ammo-gated fire-and-forget. Damage (including
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

    const cooldownMs = weaponCooldownMs(this.equippedWeapon);
    if (this.time.now - this.lastWeaponHitAt < cooldownMs) return;

    const dmgType = weaponPrimaryDamageType(this.equippedWeapon);
    const staminaCost = Math.round(weaponStaminaCost(this.equippedWeapon) * this.relics.staminaCostMult());
    if (!this.stamina.canAfford(staminaCost)) return; // exhausted — silent, same as melee's guard

    // Ammo gate — silent no-op if unavailable, same "never reveal what's
    // missing" convention the stamina guard above already follows.
    if (cfg.ammoItemKey) {
      const eq = this.equipment.get("ammo");
      if (!eq || eq.key !== cfg.ammoItemKey || (eq.count ?? 0) < 1) return;
      const remaining = (eq.count ?? 0) - 1;
      this.equipment.set("ammo", remaining > 0 ? { key: eq.key, tier: 0, count: remaining } : null);
    } else {
      // Self-consuming (Javelin): burn 1 from the equipped hotbar stack itself.
      const selectedIndex = this.hotbar.selected();
      const selStack = this.hotbar.container.slot(selectedIndex);
      if (!selStack || itemDef(selStack.key)?.weapon !== this.equippedWeapon) return;
      this.hotbar.container.removeCount(selStack.key, 1);
    }

    this.lastWeaponHitAt = this.time.now;
    this.stamina.spend(staminaCost);
    this.player.playSwing();
    this.player.playEquippedSwing();

    const baseDmg = weaponDamage(this.equippedWeapon) + weaponTierDamageBonus(this.equippedWeapon, this.equippedWeaponTier);
    let dmg = baseDmg * weaponSkillDamageMultiplier(dmgType, this.skills) * this.relics.damageMult();
    if (enemy instanceof GremlinKing && enemy.isStaggered()) dmg *= STAGGER_DAMAGE_MULTIPLIER;
    if (enemy instanceof Gloamwarden && enemy.isStaggered()) dmg *= WARDEN_STAGGER_DAMAGE_MULTIPLIER;
    // Crit is rolled at fire time (same "captured at commit time" precedent as
    // the stagger multiplier) and carried by the projectile so the impact tints
    // correctly — resolveWeaponHit can't re-roll it (no weapon context there).
    const critResult = this.applyCrit(this.equippedWeapon, dmg);

    const angle = Phaser.Math.Angle.Between(this.player.x, this.player.y, enemy.x, enemy.y);
    this.spawnProjectile({
      x: this.player.x,
      y: this.player.y,
      angle,
      speed: cfg.projectileSpeed,
      damage: critResult.dmg,
      texture: cfg.projectileTexture,
      maxRangePx: cfg.maxRangePx,
      sourceIsPlayer: true,
      isCrit: critResult.crit,
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
  private resolveWeaponHit(enemy: Enemy, dmg: number, dmgType: DamageType, isCrit = false): void {
    if (isCrit) this.sfx.crit();
    else this.sfx.hit();
    const depleted = enemy.takeHit(dmg);
    this.awardSkillXp(dmgType, 30); // weapon-hit XP to the primary damage type's skill
    this.spawnDamageNumber(enemy.x, enemy.y, Math.round(dmg), isCrit);
    if (!depleted) return;

    // Kill: relic on-kill heal (M-RL), then armor-skill XP per WORN PIECE (M-SS
    // — changed from per-distinct-type, so a mix-and-match loadout is rewarded
    // per piece and heavy_armor accrues once biome-2 heavy gear exists).
    const killHeal = this.relics.killHeal();
    if (killHeal > 0) {
      this.health.heal(killHeal);
      this.refreshHealthBar();
    }
    for (const armorType of armorTypesWornPerPiece(EQUIP_SLOTS.map((s) => this.equipment.get(s.id)))) {
      this.awardSkillXp(armorType, 30);
    }

    const dropX = enemy.x;
    const dropY = enemy.y;
    const loot = enemy.rollLoot();
    enemy.playDeathFeedback(() => {
      for (const drop of loot) {
        this.spawnLooseDrop(drop.resource, drop.amount, dropX, dropY);
      }
    });
    this.enemies = this.enemies.filter((e) => e !== enemy);
    this.onShackGuardKilled(enemy);
    if (enemy instanceof Gloamwarden) this.onGloamwardenKilled();
    this.eventLog.add("combat", `Defeated ${enemy.displayName}`);
    this.hoveredEnemy = null;
    this.promptText.setVisible(false);

    // Run/score tracking. Killing the final boss (Gremlin King, for now) wins
    // the run — end it after a short beat so the death feedback plays first.
    this.run.recordKill(this.classifyKill(enemy));
    if (enemy instanceof GremlinKing) {
      this.time.delayedCall(1200, () => this.endRun("won"));
    }
  }

  // Single entry point for granting skill XP, so the relic +% skill XP bonus
  // (M-RL) AND Intelligence's +% XP (M-SS) apply uniformly to every source
  // (weapon hits, kills, tool swings, running) without repeating the multiplier
  // at each call site. The two stack additively-then-multiplied here; the
  // Player-XP feed downstream reads skill level-ups, so there's no double-count.
  private awardSkillXp(skill: SkillType, base: number): void {
    this.skills.addXp(skill, base * this.relics.xpMult() * this.progression.xpMult());
  }

  // Roll crit for one hit of `weapon` (M-SS). Chance = weapon base + Agility +
  // relics (cap CRIT_CHANCE_CAP); mult = weapon base + Strength + relics (cap
  // CRIT_MULT_CAP). Shared by melee (rolled at hit) and ranged (rolled at fire,
  // baked into the projectile). Uses Math.random — combat crit isn't seeded.
  private applyCrit(weapon: WeaponType, dmg: number): { dmg: number; crit: boolean } {
    const chance = Math.min(
      CRIT_CHANCE_CAP,
      weaponBaseCritChance(weapon) + this.progression.critChanceBonus() + this.relics.critChanceBonus(),
    );
    if (Math.random() >= chance) return { dmg, crit: false };
    const mult = Math.min(
      CRIT_MULT_CAP,
      weaponBaseCritMult(weapon) + this.progression.critMultBonus() + this.relics.critDamageBonus(),
    );
    return { dmg: dmg * mult, crit: true };
  }

  // Kill category for run scoring: the final boss, an elite variant, or a plain
  // enemy. Kept here (not on Enemy) since it's a scoring concern, not behavior.
  private classifyKill(enemy: Enemy): KillCategory {
    if (enemy instanceof GremlinKing) return "boss";
    // The Gloamwarden is a mini-boss — no dedicated score band exists, so it's
    // scored at the elite tier (per the plan's "simplest" open sub-decision).
    if (enemy instanceof Gloamwarden || enemy.elite) return "elite";
    return "normal";
  }

  // Floating combat-text on a successful hit. A crit (M-SS) is tinted
  // orange-yellow and drawn a bit larger with a "!" so the burst reads clearly.
  private spawnDamageNumber(x: number, y: number, amount: number, isCrit = false): void {
    const text = this.add
      .text(x, y - 14, isCrit ? `${amount}!` : `${amount}`, {
        fontFamily: "monospace",
        fontSize: isCrit ? "20px" : "14px",
        color: isCrit ? "#ffca3a" : "#ffffff",
        stroke: "#000000",
        strokeThickness: isCrit ? 4 : 3,
      })
      .setOrigin(0.5, 0.5)
      .setDepth(50);
    this.tweens.add({
      targets: text,
      y: text.y - 24,
      alpha: 0,
      duration: 700,
      ease: "Cubic.easeOut",
      onComplete: () => text.destroy(),
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
    for (const enemy of this.enemies) {
      enemy.envSpeedMult = envSpeedMult;
      const bit = enemy.update(delta, this.player.x, this.player.y, now);
      if (bit) {
        // Most melee hits carry no knockback; a telegraphed attack that opts
        // into one (ranged Gremlin shove, Boar charge gore) sets it on the
        // frame it connects. Reuses applyDamageToPlayer's existing knockback path.
        const kb = enemy.pendingAttackKnockback;
        this.applyDamageToPlayer(
          enemy.biteDamage,
          kb > 0 ? { fromX: enemy.x, fromY: enemy.y, speed: kb } : undefined,
        );
      }
      // Gremlin King's melee/AoE kit deals area damage, not a single-point
      // bite — queried separately since it needs richer info (knockback)
      // than Enemy.update()'s plain boolean contract.
      if (enemy instanceof GremlinKing || enemy instanceof Gloamwarden) {
        const areaHit = enemy.checkPlayerHit(this.player.x, this.player.y);
        if (areaHit) {
          this.applyDamageToPlayer(
            areaHit.damage,
            areaHit.knockback ? { fromX: enemy.x, fromY: enemy.y, speed: areaHit.knockback } : undefined,
          );
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

  // `knockback` is optional so every existing call site (Boar bite, Snake
  // bite, Gremlin claw/projectile) is untouched — only the Gremlin King's
  // slam attack passes one.
  private applyDamageToPlayer(
    amount: number,
    knockback?: { fromX: number; fromY: number; speed: number },
  ): void {
    if (this.isDead) return;
    if (this.time.now < this.invulnerableUntil) return;
    this.sfx.hit();
    // Relic damage-taken reduction (M-RL) applies first (a percentage), then
    // flat armor deduction — everything dealt today is physical damage (no
    // magic/elemental sources exist yet), so this applies uniformly; branch
    // on a damage type here once one does. Floored at 1 so no relic/armor
    // combination grants full immunity.
    const relicAdjusted = amount * this.relics.damageTakenMult();
    const reduced = Math.max(1, Math.round(relicAdjusted - totalPlayerDefense(this.equipment)));
    const died = this.health.takeDamage(reduced);
    this.refreshHealthBar();
    this.hints.trigger("took_damage"); // first hit taken this run -> nudge toward healing
    if (knockback) {
      const angle = Phaser.Math.Angle.Between(knockback.fromX, knockback.fromY, this.player.x, this.player.y);
      const body = this.player.body as Phaser.Physics.Arcade.Body;
      body.setVelocity(Math.cos(angle) * knockback.speed, Math.sin(angle) * knockback.speed);
      // Brief impulse, not a sustained shove — matches dash's own short-burst feel.
      this.time.delayedCall(150, () => body.setVelocity(0, 0));
    }
    if (died) this.onPlayerDeath();
  }

  private onPlayerDeath(): void {
    this.sfx.death();
    this.isDead = true;
    this.player.setVelocity(0, 0);
    // Active food buffs are lost on death (they don't carry into respawn).
    this.buffs.clear();
    this.buffBarUI.sync(this.buffs.active());
    this.eventLog.add("combat", "You died...");
    // Hardcore: death is terminal — end the run and post the score after a
    // beat. Non-hardcore keeps the legacy respawn (documented easy-mode hook).
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
  // (isPaused true). Split out from openPauseMenu so returning from "How to
  // Play" (closeWelcome's howToPlayFromPause branch) can re-show the panel
  // without re-running/being blocked by openPauseMenu's isPaused guard.
  private showPauseMenuPanel(): void {
    this.pauseMenu.show({
      hintsEnabled: () => this.hints.isEnabled(),
      onToggleHints: () => this.hints.setEnabled(!this.hints.isEnabled()),
      sfxEnabled: () => this.sfx.isEnabled(),
      onToggleSfx: () => this.sfx.setEnabled(!this.sfx.isEnabled()),
      onResume: () => this.resumeGame(),
      onNewRun: () => this.scene.restart(),
      onHowToPlay: () => this.openHowToPlay(),
    });
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
    // Opened from the pause menu's "How to Play" button: hand back to the
    // (still-frozen) pause menu instead of resuming play.
    if (this.howToPlayFromPause) {
      this.howToPlayFromPause = false;
      this.showPauseMenuPanel();
      return;
    }
    this.time.paused = false;
    this.physics.world.resume();
    this.isPaused = false;
  }

  // "How to Play" from the pause menu: swap the pause panel for the welcome
  // overlay without unfreezing the world, then restore the pause menu on close.
  private openHowToPlay(): void {
    this.pauseMenu.hide();
    this.howToPlayFromPause = true;
    this.welcomeUI.show(() => this.closeWelcome());
  }

  // Finalize the run: freeze the world, post the score to the localStorage
  // high-score table, and show the run-end screen. Guarded so a death during
  // the post-win delay (or vice versa) can't double-post.
  private endRun(outcome: RunOutcome): void {
    if (this.runOver) return;
    this.run.end(outcome);
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
      level: this.progression.level,
      entries,
      rank,
      onNewRun: () => this.scene.restart(),
      onClearScores: () => {
        clearHighScores();
        this.runEndUI.hide();
        this.showRunEndUI([], 0);
      },
    });
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
          this.consolidateDrop(node);
        },
      });
    }
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
    if (def) this.eventLog.add("material", `Discovered: ${def.name}`, def.texture);
  }

  // Re-run recipe discovery and announce anything newly unlocked. Call after
  // any resource pickup, skill level-up, or workbench placement.
  private refreshDiscovery(): void {
    const unlocked = this.crafting.refresh(this.discovered, this.skills, this.hasWorkbenchPlaced());
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
    this.craftingMenu?.refresh();
    this.inventoryMenu?.refresh();
    this.upgradeMenu?.refresh();
  }

  private createCharacterMenu(): void {
    this.characterMenu = new CharacterMenu(this, {
      skills: this.skills,
      progression: this.progression,
      allocate: (stat) => this.allocateStat(stat),
    });
  }

  // --- Progression (player stats) ---

  // Push the current Endurance/Vitality bonuses into the Stamina/HP pools.
  // Called on create and after either is spent, so the max bars grow live.
  private syncStatBonuses(): void {
    // M-SS: stat-built base compounds MULTIPLICATIVELY with relic percent
    // bonuses (was a flat additive that dwarfed a few stat points). Flat relic
    // maxHp/maxStamina (legacy channel — none in the current pool) folds into
    // the base before the percent so it still works if a flat relic ever ships.
    const baseMaxHp = 100 + this.progression.vitalityHealthBonus() + this.relics.maxHpBonus();
    const finalMaxHp = baseMaxHp * this.relics.maxHpPctMult();
    this.health.setBonusMax(finalMaxHp - 100);
    const baseMaxStam = 100 + this.progression.enduranceStaminaBonus() + this.relics.maxStaminaBonus();
    const finalMaxStam = baseMaxStam * this.relics.maxStaminaPctMult();
    this.stamina.setBonusMax(finalMaxStam - 100);
    // Secondary stat axes (M-SS): Vitality healing-received, Endurance stamina
    // regen, Wisdom buff duration — pushed into the pools/managers that own each.
    this.health.setHealMult(this.progression.healingReceivedMult());
    this.stamina.setRegenMult(this.progression.staminaRegenMult());
    this.buffs.setDurationMult(this.progression.buffDurationMult());
    this.refreshHealthBar();
    this.refreshStaminaBar();
  }

  // Spend one unspent point on a stat (from the Character menu). Always
  // re-syncs — every M-SS stat now feeds a cached multiplier (crit is read live
  // at hit time, but HP/stamina/heal/regen/buff-duration caches all live in the
  // pools), so it's cheap and keeps them all fresh. Refreshes the menu in place.
  private allocateStat(stat: StatType): void {
    if (!this.progression.allocate(stat)) return;
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
      skills: this.skills,
      progression: this.progression,
    });
  }

  // Tab opens crafting + inventory together as one combined menu — there's no
  // standalone crafting window anymore. Driven off inventoryMenu's open state
  // since both always move in lockstep.
  private toggleCombinedMenu(): void {
    this.closeDryingRackMenu();
    this.closeCookingMenu();
    this.closeChestMenu();
    this.closeUpgradeMenu();
    this.closeRelicForgeMenu();
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
    if (!this.backpack.hasRoomFor(key, totalOut)) {
      this.eventLog.add("info", "Inventory full");
      return;
    }
    for (let i = 0; i < batches; i++) {
      this.crafting.craft(recipe, this.backpack);
      this.addToBackpack(key, outCount);
    }
    this.sfx.craft();
    this.recomputeEquipped();
    this.refreshHud();
    this.inventoryMenu.refresh();
  }

  private canAffordBatch(recipe: Recipe, batches: number): boolean {
    return (Object.entries(recipe.costs) as [ResourceType, number][]).every(
      ([resource, amount]) => this.backpack.count(resource) >= amount * batches,
    );
  }

  // Max number of times `recipe` could be crafted right now — the lower of
  // "can afford N batches" and "backpack has room for N batches' worth of
  // output" (only meaningful for a non-placeable, stackable-output recipe;
  // batch sliders in CraftingMenu/CookingMenu use this to bound the slider).
  private maxCraftBatches(recipe: Recipe): number {
    const key = outputKey(recipe);
    const outCount = recipe.output.kind === "item" ? recipe.output.count ?? 1 : 1;
    let costBatches = Infinity;
    for (const [resource, amount] of Object.entries(recipe.costs) as [ResourceType, number][]) {
      if (amount <= 0) continue;
      costBatches = Math.min(costBatches, Math.floor(this.backpack.count(resource) / amount));
    }
    if (!Number.isFinite(costBatches)) costBatches = 0;
    const roomBatches = Math.floor(this.backpack.roomFor(key) / outCount);
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
    } else if (!this.crafting.canAfford(recipe, this.backpack)) {
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
    // An owned placeable carries its per-instance upgrade tier on the stack;
    // consume that exact slot (not removeCount, which could eat a different
    // tier's stack) so the tier travels onto the placed image. Crafted
    // placements always start at tier 0.
    let placedTier = 0;
    if (itemSource) {
      const idx = this.findConsumableStack(itemSource.container, itemSource.key);
      if (idx === null) {
        this.cancelPlacement();
        return;
      }
      placedTier = itemSource.container.slot(idx)?.tier ?? 0;
      itemSource.container.set(idx, null);
    } else {
      this.crafting.craft(recipe, this.backpack);
    }
    const pos = this.clampedPlacementPoint();
    const key = outputKey(recipe);
    const texture = itemDef(key)?.texture;
    const image = this.add.image(pos.x, pos.y, texture ?? "");
    image.setData("itemKey", key);
    if (placedTier > 0) {
      image.setData("tier", placedTier);
      this.applyTierVisual(image, placedTier);
    }
    this.placedObjects.push(image);
    this.refreshStationLabel(image);
    // First time they put a station down, teach the right-click inspect/upgrade
    // gesture (also covered for equipped gear at the armor-equip site).
    this.hints.trigger("right_click_tip");
    // Placing a Workbench for the first time can newly unlock tier 1+
    // recipes' visibility (see Crafting.refresh's workbenchPlaced gate) —
    // re-run discovery so that happens immediately, not just on next pickup.
    if (key === "workbench") {
      this.everPlacedWorkbench = true;
      this.refreshDiscovery();
    }
    // A placed Drying Rack gets its own processing state, ticked in update()
    // and bound to the menu when the player interacts with this image.
    if (key === "drying_rack") this.dryingRacks.push({ image, station: new ProcessingStation() });
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

  // Is any live (non-depleted) enemy currently AGGRO'd on the player. Used by
  // Comfort's "safe to rest" check — per playtest feedback, a flat proximity
  // radius (COMFORT_SAFE_RADIUS) was too easily tripped by enemies that
  // weren't even a threat (asleep/wandering nearby); "safe" now means
  // literally nobody is hunting you, regardless of how close they idle.
  private isAnyEnemyAggro(): boolean {
    for (const enemy of this.enemies) {
      if (enemy.depleted) continue;
      if (enemy.isAggro()) return true;
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
    const resting = this.placedObjects.some(
      (obj) =>
        obj.getData("itemKey") === "comfort" &&
        Phaser.Math.Distance.Between(this.player.x, this.player.y, obj.x, obj.y) <= COMFORT_RANGE &&
        this.isNearCampfire(obj.x, obj.y, COMFORT_CAMPFIRE_RANGE),
    );
    if (resting && !this.isAnyEnemyAggro()) {
      this.buffs.apply({ id: "comfort_rest", name: "Resting", icon: "icon_comfort", hpPerSec: 1, durationMs: 400 });
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
  private isWeaponUpgradeTarget(
    t: NonNullable<MainScene["upgradeTarget"]>,
  ): t is { weaponSlot: { container: ItemContainer; index: number } } {
    return "weaponSlot" in t;
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
        if (this.isWeaponUpgradeTarget(t)) {
          const stack = t.weaponSlot.container.slot(t.weaponSlot.index);
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
      ],
      isDiscovered: (upg) => this.upgradeIngredientsKnown(upg),
      canAfford: (upg) => this.canAffordUpgrade(upg),
      extraBlockReason: (upg) => this.upgradeBlockReason(upg),
      formatCost: (upg) => this.formatUpgradeCost(upg),
      displayName: (itemKey, tier) => stationDisplayName(itemKey, tier),
      apply: (upg) => {
        const t = this.upgradeTarget;
        if (!t) return;
        if (this.isArmorUpgradeTarget(t)) this.applyArmorUpgrade(t.armorSlot, upg as ArmorUpgradeDef);
        else if (this.isWeaponUpgradeTarget(t)) {
          this.applyWeaponUpgrade(t.weaponSlot.container, t.weaponSlot.index, upg as WeaponUpgradeDef);
        } else this.applyStationUpgrade(t, upg as StationUpgradeDef);
      },
    });
  }

  private openUpgradeMenu(obj: Phaser.GameObjects.Image): void {
    this.craftingMenu.close();
    this.inventoryMenu.close();
    this.closeDryingRackMenu();
    this.closeCookingMenu();
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

  // Right-click on a weapon (backpack or hotbar) opens the same Upgrade
  // panel, bound to that specific ItemStack — mirrors openArmorUpgradeMenu's
  // "dock beside the inventory if it's open" behavior when it is, otherwise
  // opens centered like a placed station's panel.
  private openWeaponUpgradeMenu(container: ItemContainer, index: number): void {
    if (!container.slot(index)) return;
    this.craftingMenu.close();
    this.closeDryingRackMenu();
    this.closeCookingMenu();
    this.closeChestMenu();
    this.closeRelicForgeMenu();
    this.upgradeTarget = { weaponSlot: { container, index } };
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
    return Object.keys(upg.costs).every((r) => this.discovered.has(r));
  }

  private canAffordUpgrade(upg: UpgradeDef): boolean {
    return Object.entries(upg.costs).every(([r, n]) => this.backpack.count(r) >= (n ?? 0));
  }

  // Owned/required per resource, mirroring CraftingMenu's detail panel
  // (`${resource}: ${have}/${amount}`) so both "what do I need" panels read
  // the same way.
  private formatUpgradeCost(upg: UpgradeDef): string {
    return Object.entries(upg.costs)
      .map(([r, n]) => `${itemDef(r)?.name ?? r}: ${this.backpack.count(r)}/${n}`)
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
    const recipe = RECIPES.find((r) => outputKey(r) === upg.appliesToItemKey);
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
    for (const [r, n] of Object.entries(upg.costs)) this.backpack.removeCount(r, n ?? 0);
    obj.setData("tier", upg.resultTier);
    this.applyTierVisual(obj, upg.resultTier);
    this.refreshStationLabel(obj);
    const itemKey = obj.getData("itemKey") as string;
    this.eventLog.add("info", `${stationDisplayName(itemKey, upg.resultTier)} upgraded: ${upg.name}`);
    // Upgrading a Campfire to Lvl 2 unlocks (and announces) its tier-1 dishes.
    if (itemKey === "campfire") this.discoverCookRecipes(upg.resultTier);
    this.upgradeMenu.refresh();
    this.afterItemMove();
  }

  // Armor's equivalent of applyStationUpgrade — deducts cost and bumps the
  // EquippedItem's tier in place.
  private applyArmorUpgrade(slot: EquipSlot, upg: ArmorUpgradeDef): void {
    const eq = this.equipment.get(slot);
    if (!eq || !this.canAffordUpgrade(upg) || this.upgradeBlockReason(upg)) return;
    for (const [r, n] of Object.entries(upg.costs)) this.backpack.removeCount(r, n ?? 0);
    this.equipment.set(slot, { key: eq.key, tier: upg.resultTier });
    this.eventLog.add("info", `${stationDisplayName(eq.key, upg.resultTier)} upgraded: ${upg.name}`);
    this.upgradeMenu.refresh();
    this.afterItemMove();
  }

  // Weapon's equivalent — deducts cost and bumps the specific ItemStack's
  // tier in place, wherever it sits (backpack or hotbar).
  private applyWeaponUpgrade(container: ItemContainer, index: number, upg: WeaponUpgradeDef): void {
    const stack = container.slot(index);
    if (!stack || !this.canAffordUpgrade(upg) || this.upgradeBlockReason(upg)) return;
    for (const [r, n] of Object.entries(upg.costs)) this.backpack.removeCount(r, n ?? 0);
    container.set(index, { ...stack, tier: upg.resultTier });
    this.eventLog.add("info", `${stationDisplayName(stack.key, upg.resultTier)} upgraded: ${upg.name}`);
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
    if (tier <= 0) image.clearTint();
    else image.setTint(0xffe08a);
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

    const rackIndex = this.dryingRacks.findIndex((r) => r.image === obj);
    if (rackIndex !== -1) {
      const station = this.dryingRacks[rackIndex].station;
      if (station.input) {
        this.spawnLooseDrop(
          station.input.key,
          station.input.count,
          obj.x,
          obj.y,
          DROPPED_ITEM_MAGNET_COOLDOWN_MS,
        );
      }
      if (this.openRack === station) this.closeDryingRackMenu();
      this.dryingRacks.splice(rackIndex, 1);
    }

    // Destroying the campfire whose cooking menu is open closes it too.
    if (this.openCampfire === obj) this.closeCookingMenu();
    // Same for the Relic Forge.
    if (this.openForge === obj) this.closeRelicForgeMenu();

    // Carry the placed instance's upgrade tier into the pickup so re-placing
    // it restores the same tier (fixes the old bug where Destroy silently
    // discarded an upgraded Workbench's tier).
    this.spawnLooseDrop(itemKey, 1, obj.x, obj.y, DROPPED_ITEM_MAGNET_COOLDOWN_MS, tier || undefined);
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
      armorSlots: () => this.armorSlots(),
      combatStats: () => this.combatStats(),
      runSpeedBreakdown: () => this.runSpeedBreakdown(),
      beginDrag: (c, i, p) => this.beginItemDrag(c, i, p),
      beginArmorDrag: (slot, p) => this.beginArmorDrag(slot, p),
      unequipArmorSlot: (slot) => this.unequipArmorSlot(slot),
      openArmorContextMenu: (slot, x, y) => this.openArmorContextMenu(slot, x, y),
      openWeaponUpgrade: (c, i) => this.openWeaponUpgradeMenu(c, i),
      openPlaceContextMenu: (c, i, x, y) => this.openPlaceContextMenu(c, i, x, y),
      eatItem: (c, i) => this.eatItem(c, i),
      isDragging: () => this.dragSource !== null,
      sortBackpack: () => {
        sortAndStack(this.backpack);
        this.inventoryMenu.refresh();
      },
    });
  }

  private armorSlots(): ArmorSlotView[] {
    return EQUIP_SLOTS.map((s) => {
      const eq = this.equipment.get(s.id);
      return { id: s.id, label: s.label, itemKey: eq?.key ?? null, tier: eq?.tier, count: eq?.count };
    });
  }

  // Live "what am I currently equipped with" summary for the inventory panel —
  // mirrors the exact same math Tooltip's weapon "base (adjusted)" lines and
  // tryAttackEnemy/applyDamageToPlayer already use, just rolled up into one
  // view instead of per-item tooltips.
  // Loaded ranged ammo for display — the Ammo equipment slot's count/name, or
  // null if empty. Independent of which weapon (if any) is equipped, same as
  // armor showing regardless of weapon choice.
  private ammoView(): { name: string; count: number } | null {
    const eq = this.equipment.get("ammo");
    if (!eq || !eq.count) return null;
    return { name: itemDef(eq.key)?.name ?? eq.key, count: eq.count };
  }

  private combatStats(): CombatStatsView {
    const armor = totalPlayerDefense(this.equipment);
    const ammo = this.ammoView();
    if (!this.equippedWeapon)
      return {
        weaponName: null,
        damage: 0,
        damageTypeName: null,
        attackSpeed: 0,
        staminaCost: 0,
        armor,
        attackRange: REACH,
        ammo,
        critChance: 0,
        critMult: 0,
      };
    const dmgType = weaponPrimaryDamageType(this.equippedWeapon);
    const baseDmg = weaponDamage(this.equippedWeapon) + weaponTierDamageBonus(this.equippedWeapon, this.equippedWeaponTier);
    // Include relic bonuses (M-RL) so the panel matches tryAttackEnemy's real math.
    const damage = Math.round(baseDmg * weaponSkillDamageMultiplier(dmgType, this.skills) * this.relics.damageMult());
    // Stamina cost no longer scales with Strength/Agility (retired in M-SS) —
    // only relics discount it now.
    const staminaCost = Math.round(weaponStaminaCost(this.equippedWeapon) * this.relics.staminaCostMult());
    const attackRange = rangedWeaponConfig(this.equippedWeapon)?.maxRangePx ?? REACH;
    // Crit rollup (M-SS) — same weapon-base + stat + relic math applyCrit uses,
    // capped for display.
    const critChance = Math.min(
      CRIT_CHANCE_CAP,
      weaponBaseCritChance(this.equippedWeapon) + this.progression.critChanceBonus() + this.relics.critChanceBonus(),
    );
    const critMult = Math.min(
      CRIT_MULT_CAP,
      weaponBaseCritMult(this.equippedWeapon) + this.progression.critMultBonus() + this.relics.critDamageBonus(),
    );
    return {
      weaponName: this.equippedWeaponName,
      damage,
      damageTypeName: damageTypeDisplayName(dmgType),
      attackSpeed: weaponAttacksPerSecond(this.equippedWeapon),
      staminaCost,
      armor,
      attackRange,
      ammo,
      critChance,
      critMult,
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
  private equipArmorFromContainer(container: ItemContainer, index: number): void {
    const stack = container.slot(index);
    if (!stack) return;
    const def = itemDef(stack.key);
    const slot = def?.armorSlot;
    if (!slot) return;

    // The ammo slot holds a *stack* (count), not a single item — merge into a
    // matching key (topped up to maxStack) instead of an unconditional swap.
    // A different key already loaded is returned to the backpack first, same
    // as armor's swap-out below.
    if (slot === "ammo") {
      const existing = this.equipment.get(slot);
      const max = def.maxStack;
      if (existing && existing.key === stack.key) {
        const room = Math.max(0, max - (existing.count ?? 0));
        const take = Math.min(room, stack.count);
        if (take <= 0) return; // full — no-op, snaps back
        this.equipment.set(slot, { key: stack.key, tier: 0, count: (existing.count ?? 0) + take });
        container.removeCount(stack.key, take);
      } else {
        if (existing) this.returnArmorToBackpack(existing);
        const take = Math.min(max, stack.count);
        this.equipment.set(slot, { key: stack.key, tier: 0, count: take });
        container.removeCount(stack.key, take);
      }
      this.eventLog.add("info", `Loaded ${def.name}`);
      this.afterItemMove();
      return;
    }

    const previous = this.equipment.get(slot);
    this.equipment.set(slot, { key: stack.key, tier: stack.tier ?? 0 });
    container.set(index, null);
    if (previous) this.returnArmorToBackpack(previous);
    this.eventLog.add("info", `Equipped ${def.name}`);
    // Teach right-click inspect/upgrade the first time they wear a piece (also
    // covered at the station-placement site).
    this.hints.trigger("right_click_tip");
    this.afterItemMove();
  }

  private returnArmorToBackpack(item: EquippedItem): void {
    const stack: ItemStack = { key: item.key, count: item.count ?? 1, tier: item.tier || undefined };
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
      this.backpack.set(toIndex, { key: eq.key, count: eq.count ?? 1, tier: eq.tier || undefined });
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
    // The ammo slot has no upgrade path (it holds a plain ammo stack, not an
    // upgradable armor piece) — just a bare Unequip.
    if (slot === "ammo") {
      if (!eq) return;
      this.contextMenu.show(screenX, screenY, [
        { label: "Unequip", enabled: true, onClick: () => this.unequipArmorSlot(slot) },
      ]);
      return;
    }
    const items: ContextMenuItem[] = eq
      ? [
          { label: "Unequip", enabled: true, onClick: () => this.unequipArmorSlot(slot) },
          { label: "Upgrade", enabled: true, onClick: () => this.openArmorUpgradeMenu(slot) },
        ]
      : [
          { label: "Equip", enabled: false, onClick: () => {} },
          { label: "Upgrade", enabled: false, onClick: () => {} },
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
        "Take all (chest): R",
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
  }

  // Buff-icon strip: sits just above the HP bar, centered. HP bar Y mirrors the
  // math in createHealthBar/refreshHealthBar (anchored off hotbarUI.top); the
  // strip's bottom edge is a small gap above it. HP/stamina bar Y is fixed
  // (only their WIDTH grows with max pool), so this anchor never needs
  // recomputing.
  private createBuffBar(): void {
    const gap = 8;
    const barH = 20;
    const staminaBarY = this.hotbarUI.top - gap - barH;
    const healthBarY = staminaBarY - gap - barH;
    this.buffBarUI = new BuffBarUI(this);
    this.buffBarUI.layout(this.scale.width / 2, healthBarY - 6);
    this.buffBarUI.sync(this.buffs.active());
  }

  // Owned-relics HUD strip (M-RL) — bottom-left, growing right/wrapping up. Only
  // changes on roll/combine (afterRelicChange re-syncs), so it's built once and
  // synced with the run's current (empty at a fresh start) relic set.
  private createRelicBar(): void {
    this.relicBarUI = new RelicBarUI(this);
    this.relicBarUI.layout(12, this.scale.height - 12);
    this.relicBarUI.sync(this.relics.groupedForDisplay());
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
    if (!this.worldMapUI.isOpen() && this.anyMenuOpen()) return;
    this.worldMapUI.toggle();
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
      .on("pointerdown", () => this.characterMenu.openMenu());
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
