import Phaser from "phaser";
import { Player } from "../entities/Player";
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
import { Snake } from "../entities/Snake";
import { RangedGremlin, MeleeGremling } from "../entities/Gremlin";
import { Projectile, type ProjectileConfig } from "../entities/Projectile";
import { GremlinShack, SHACK_GUARD_RESPAWN_MS } from "../entities/GremlinShack";
import { BossAltar } from "../entities/BossAltar";
import { GremlinKing, STAGGER_DAMAGE_MULTIPLIER } from "../entities/GremlinKing";
import type { LootRollEntry } from "../systems/LootContainer";
import type { ResourceType } from "../systems/Inventory";
import {
  Skills,
  skillDisplayName,
  weaponSkillDamageMultiplier,
  runningSprintMultiplier,
} from "../systems/Skills";
import {
  PlayerProgression,
  weaponStaminaCostMultiplier,
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
  type WeaponType,
} from "../systems/Weapons";
import { outputKey, RECIPES, type Recipe } from "../systems/Recipes";
import { itemDef, armorTypesWorn } from "../systems/Items";
import { ItemContainer, moveSlot, type ItemStack } from "../systems/ItemContainer";
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
import { Hotbar } from "../systems/Hotbar";
import { ProcessingStation } from "../systems/Processing";
import { CraftingMenu } from "../ui/CraftingMenu";
import { ContextMenu, type ContextMenuItem } from "../ui/ContextMenu";
import { DryingRackMenu } from "../ui/DryingRackMenu";
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
} from "../ui/InventoryMenu";
import { HotbarUI } from "../ui/HotbarUI";
import { EventLogUI } from "../ui/EventLogUI";
import { KeybindsUI } from "../ui/KeybindsUI";
import { MinimapUI, PANEL_W as MINIMAP_W, PANEL_H as MINIMAP_H, MARGIN as MINIMAP_MARGIN } from "../ui/MinimapUI";
import { FogOfWar } from "../systems/Fog";

const HOTBAR_KEYS = ["ONE", "TWO", "THREE", "FOUR", "FIVE", "SIX", "SEVEN", "EIGHT", "NINE"];

const TILE = 32;
// Bumped 80x60 -> 112x84 tiles (~2x area) per playtest feedback: the old map
// ran out of enemies/resources before a player could craft everything on
// offer. Enemy spawn counts below were scaled up to match (see spawnEnemies).
const WORLD_W = TILE * 112; // 3584px wide — a procedurally generated biome (see Biome.ts)
const WORLD_H = TILE * 84; // 2688px tall
const REACH = 64; // how close (px) the player must be to interact
const PLACEMENT_RADIUS = REACH * 1.25; // how far from the player a placed item may land
const MAGNET_RADIUS = 100; // px — loose drop pieces within this of the player get pulled in
const MAGNET_SPEED = 220; // px/s a pulled piece travels toward the player
const MAGNET_PICKUP_DIST = 14; // px — close enough to the player to collect
const DROP_SCATTER_MIN = 20; // px — min distance a drop piece explodes out to
const DROP_SCATTER_MAX = 45; // px — max distance a drop piece explodes out to
const DROP_CONSOLIDATE_RADIUS = 28; // px — merge a landed piece into another this close
const SPRINT_DRAIN_PER_SEC = 33; // stamina/sec while sprinting — full bar in ~3s
const DASH_STAMINA_COST = 25; // flat cost per dash — 4 dashes per full bar
const DASH_IFRAME_MS = 150; // outlasts the dash burst itself (Milestone E)
const WORKBENCH_RANGE = 100; // px — looser than REACH; "am I near it," not a precise click
const BLACKBERRY_REGROW_MS = 3 * 60 * 1000; // a picked bush regrows berries after 3 in-game minutes
// A player-dropped or destroyed-station item pickup ignores the magnet for
// this long so it doesn't instantly fly back into the inventory/station that
// just released it. Manual click-pickup is unaffected.
const DROPPED_ITEM_MAGNET_COOLDOWN_MS = 1500;

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
  // The single tool the player currently has "out". Driven by the selected
  // hotbar slot.
  private equippedTool: ToolType | null = null;
  private equippedWeapon: WeaponType | null = null;
  private equippedWeaponTier = 0;
  private attackRangeRing!: Phaser.GameObjects.Graphics;
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
  private gremlinKing: GremlinKing | null = null;
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
  private minimapUI!: MinimapUI;

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
  private staminaBarFill!: Phaser.GameObjects.Rectangle; // fixed HUD bar, centered above the hotbar
  private staminaBarText!: Phaser.GameObjects.Text; // numeric current-stamina label inside the bar
  // Whether loose drop pieces auto-fly to the player when in range. Toggled
  // with V; doesn't affect pre-placed branches/rocks (always manual).
  private magnetEnabled = true;
  private rangeRingEnabled = false;

  // --- Combat ---
  private enemies: Enemy[] = [];
  private enemyGroup!: Phaser.Physics.Arcade.Group;
  // Enemy-fired projectiles (currently just the ranged Gremlin's rock throw).
  // No playerProjectiles group yet — nothing fires one until the Slingshot
  // exists, and it'd need its own overlap-vs-enemies wiring at that point.
  private enemyProjectiles!: Phaser.Physics.Arcade.Group;
  private health = new Health();
  private healthBarFill!: Phaser.GameObjects.Rectangle;
  private healthBarText!: Phaser.GameObjects.Text;
  private xpBarFill!: Phaser.GameObjects.Rectangle; // player-level XP bar, above the HP bar
  private xpBarText!: Phaser.GameObjects.Text; // "Lvl N" label inside the XP bar
  private isDead = false;
  private invulnerableUntil = 0; // this.time.now threshold; incoming damage skipped before this
  private readonly RESPAWN_DELAY_MS = 2000;
  private readonly POST_RESPAWN_INVULN_MS = 1500;

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
  private placementHintText!: Phaser.GameObjects.Text; // bottom-right, stacked above promptText
  // The "Place" button click that enters placement mode fires through to the
  // scene's global pointerdown too (same underlying click) — swallow that one
  // event so it isn't also read as the first placement click.
  private suppressNextPointerdown = false;

  constructor() {
    super("MainScene");
  }

  create(): void {
    // Procedural biome layout — must exist before spawning so nodes/enemies
    // can query zone type for placement. Seeded randomly per session (not a
    // fixed string) so the world differs every run.
    this.biome = new Biome(WORLD_W, WORLD_H, this.sessionRng());

    // Ground: one repeating grass texture (the "grassy" look), with the biome
    // overlay baked on top of it — both kept below every entity.
    this.add.tileSprite(0, 0, WORLD_W, WORLD_H, "grass").setOrigin(0, 0).setDepth(-10);
    this.buildBiomeTexture();

    // Keep the player and camera inside the world.
    this.physics.world.setBounds(0, 0, WORLD_W, WORLD_H);
    this.cameras.main.setBounds(0, 0, WORLD_W, WORLD_H);

    // Spawn the player in the middle and follow it smoothly.
    this.player = new Player(this, WORLD_W / 2, WORLD_H / 2);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);

    // Reach preview ring — only drawn while a tool/weapon is equipped, kept
    // just above the ground and below entities (Milestone F).
    this.attackRangeRing = this.add.graphics().setDepth(-5);

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
    // Altar position is chosen once, before the shack/decoration/enemy
    // density gradient around it — see spawnGremlinShacks/spawnAltarDensity.
    this.altarPosition = this.pickAltarPosition(this.sessionRng());
    this.spawnGremlinShacks();
    this.spawnAltarDensity();
    this.spawnBossAltar();
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

    // Left-click interacts with whatever is hovered and in reach. Suppressed
    // while a menu is open, or when the click lands on a fixed HUD element
    // (hotbar / event log) so a click there doesn't also hit the world behind.
    // Right-click on a placed object (Workbench/Campfire/Drying Rack) opens a
    // generic Upgrade/Destroy context menu.
    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
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
        // startItemPlacement) — a click on its still-open panel must not
        // fall through and place an object underneath it.
        if (this.inventoryMenu.isOpen() && this.inventoryMenu.containsPoint(pointer.x, pointer.y)) return;
        if (pointer.leftButtonDown()) this.attemptPlaceObject();
        else if (pointer.rightButtonDown()) this.cancelPlacement();
        return;
      }
      if (this.anyMenuOpen() || this.pointerOverHud(pointer)) return;
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
    this.createChestMenu();
    this.createUpgradeMenu();
    this.createCharacterMenu();
    this.hotbarUI = new HotbarUI(this, this.hotbar, {
      skills: this.skills,
      progression: this.progression,
      beginDrag: (c, i, p) => this.beginItemDrag(c, i, p),
      openWeaponUpgrade: (c, i) => this.openWeaponUpgradeMenu(c, i),
      isDragging: () => this.dragSource !== null,
    });
    this.createStaminaBar();
    this.createHealthBar();
    this.createXpBar();
    this.createStatPointsBadge();
    // Sits beside the Keybinds panel (same top row), not stacked underneath
    // it — an open InventoryMenu panel occupies that same top-left column
    // and used to cover the log whenever it was open.
    this.eventLogUI = new EventLogUI(this, this.eventLog, this.keybindsUI.right + 12, this.keybindsUI.top);

    // Minimap + fog of war (World & discovery roadmap item 6) — FogOfWar owns
    // the reveal grid, MinimapUI draws/repaints it. Sized 1:1 to the minimap's
    // own pixel resolution so a revealed cell maps directly to one pixel.
    this.fog = new FogOfWar(WORLD_W, WORLD_H, MINIMAP_W, MINIMAP_H);
    this.minimapUI = new MinimapUI(this, this.biome, this.fog);

    // Scene-level drag: a slot starts it, the pointer drags a ghost icon, and
    // release resolves the move against whichever container is under the
    // pointer (backpack grid or hotbar). The Drying Rack's amount slider
    // shares this same global pointermove/up pair for its own drag gesture.
    this.input.on("pointermove", (p: Phaser.Input.Pointer) => {
      if (this.dragGhost) this.dragGhost.setPosition(p.x, p.y);
      if (this.dryingRackMenu.isOpen() && this.dryingRackMenu.isDraggingSlider()) {
        this.dryingRackMenu.updateSliderFromPointer(p.x);
      }
    });
    this.input.on("pointerup", (p: Phaser.Input.Pointer) => {
      this.resolveItemDrag(p);
      this.dryingRackMenu.endSliderDrag();
    });

    // Mouse wheel cycles the hotbar selection (looping), unless the pointer is
    // over the event log (which scrolls its own history).
    this.input.on("wheel", (p: Phaser.Input.Pointer, _o: unknown, _dx: number, dy: number) => {
      if (this.eventLogUI.isPointerOver(p) || this.keybindsUI.isPointerOver(p)) return;
      this.cycleHotbar(dy > 0 ? 1 : -1);
    });

    // Tab is captured so the browser doesn't shift focus off the canvas.
    this.input.keyboard!.addCapture("TAB");
    this.input.keyboard!.on("keydown-TAB", () => {
      if (this.placementMode) return this.cancelPlacement();
      this.toggleCombinedMenu();
    });
    this.input.keyboard!.on("keydown-ESC", () => {
      if (this.contextMenu.isOpen()) return this.contextMenu.close();
      if (this.placementMode) return this.cancelPlacement();
      if (this.upgradeMenu.isOpen()) return this.closeUpgradeMenu();
      if (this.characterMenu.isOpen()) return this.characterMenu.close();
      this.closeDryingRackMenu();
      this.closeChestMenu();
      this.craftingMenu.close();
      this.inventoryMenu.close();
    });
    HOTBAR_KEYS.forEach((key, i) => {
      this.input.keyboard!.on(`keydown-${key}`, () => this.selectHotbarSlot(i));
    });
    this.input.keyboard!.on("keydown-V", () => this.toggleMagnet());
    this.input.keyboard!.on("keydown-O", () => this.toggleRangeRing());
    this.input.keyboard!.on("keydown-K", () => this.characterMenu.toggle());

    // Skill level-ups: announce, feed the overall Player Level the same XP the
    // skill level cost (Progression.ts), and re-run recipe discovery/crafting
    // menu since a level-up may satisfy a skill-gated recipe's requirement.
    this.skills.onLevelUp((skill, newLevel, xpCost) => {
      this.eventLog.add("levelup", `${skillDisplayName(skill)} leveled up -> Lvl ${newLevel}`);
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
    if (this.isDead) {
      // Frozen: no Player.update() (no input/movement), but ambient systems
      // keep running so the world doesn't visually freeze too.
      this.stamina.tick(delta);
      this.refreshStaminaBar();
      this.player.syncEquippedIconPosition();
      this.updateAttackRangeRing();
      this.updateEnemies(delta);
      this.updateMagnet(delta);
      this.updateTreeOcclusion(delta);
      this.fog.reveal(this.player.x, this.player.y);
      this.minimapUI.update(this.player.x, this.player.y);
      return;
    }

    // Gate sprint on affording *this frame's* drain (not just "stamina > 0")
    // — otherwise a partial remainder that's too small to spend keeps
    // regenerating just enough to pass a ">0" check forever, and sprint never
    // actually hard-blocks.
    const sprintCost = SPRINT_DRAIN_PER_SEC * (delta / 1000);
    const canSprint = this.stamina.canAfford(sprintCost);
    const canDash = this.stamina.canAfford(DASH_STAMINA_COST);
    const sprintMultiplier = runningSprintMultiplier(this.skills);
    const frame = this.player.update(delta, canSprint, canDash, sprintMultiplier);

    if (frame.sprinting) {
      this.stamina.spend(sprintCost);
      this.skills.addXp("running", 10 * (delta / 1000)); // 10 XP/sec sprinting
    }
    if (frame.dashStarted) {
      this.stamina.spend(DASH_STAMINA_COST);
      this.invulnerableUntil = this.time.now + DASH_IFRAME_MS;
    }
    this.stamina.tick(delta);
    this.refreshStaminaBar();
    this.player.syncEquippedIconPosition();
    this.updateAttackRangeRing();

    if (this.placementMode) this.updatePlacementGhost();
    else if (!this.anyMenuOpen()) this.updateHover();
    this.updateMagnet(delta);
    this.updateEnemies(delta);
    this.updateTreeOcclusion(delta);
    this.fog.reveal(this.player.x, this.player.y);
    this.minimapUI.update(this.player.x, this.player.y);
    this.updateCraftingMenuWorkbenchProximity();
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
      this.chestMenu.isOpen() ||
      this.contextMenu.isOpen() ||
      this.upgradeMenu.isOpen() ||
      this.characterMenu.isOpen()
    );
  }

  private selectHotbarSlot(slot: number): void {
    this.setHotbarSelection(slot);
  }

  private cycleHotbar(dir: number): void {
    const next = (this.hotbar.selected() + dir + this.hotbar.size) % this.hotbar.size;
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
    this.equippedWeaponTier = def?.weapon ? stack?.tier ?? 0 : 0;
    const iconTexture = def && (def.tool || def.weapon) ? def.texture : null;
    this.player.setEquippedIcon(iconTexture);
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
    this.attackRangeRing
      .lineStyle(1.5, 0xffffff, 0.25)
      .strokeCircle(this.player.x, this.player.y, REACH);
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
    const stack = container.slot(index);
    if (!stack) return;
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
      const chestIndex = this.chestMenu.chestSlotIndexAt(pointer.x, pointer.y);
      if (chestIndex !== null) {
        const chestContainer = this.openChest;
        if (chestContainer) moveSlot(src.container, src.index, chestContainer, chestIndex);
        this.afterItemMove();
        return;
      }
      const chestBagIndex = this.chestMenu.slotIndexAt(pointer.x, pointer.y);
      if (chestBagIndex !== null) {
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
        if (this.isDoubleClickInPlace(`hotbar:${hotIndex}`)) this.quickMoveItem(this.hotbar.container, hotIndex);
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
        if (this.isDoubleClickInPlace(key)) {
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
      const to = this.hotbar.container.findAssignable(stack.key);
      if (to !== null) moveSlot(container, index, this.hotbar.container, to);
    }
    this.afterItemMove();
  }

  private afterItemMove(): void {
    this.recomputeEquipped();
    this.inventoryMenu.refresh();
    this.dryingRackMenu.refresh();
    this.chestMenu.refresh();
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
    this.openRack = rack.station;
    this.dryingRackMenu.openMenu();
  }

  private closeDryingRackMenu(): void {
    this.dryingRackMenu.close();
    this.openRack = null;
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
    shack.loot.rollIfEmpty(GREMLIN_SHACK_LOOT_TABLE);
    this.openChest = shack.loot.items;
    this.chestMenu.openMenu();
  }

  private closeChestMenu(): void {
    this.chestMenu.close();
    this.openChest = null;
  }

  // Reused for both the initial spawn and every respawn-after-timer cycle —
  // spawns a fresh RangedGremlin + MeleeGremling pair anchored to the shack.
  private respawnShackGuards(shack: GremlinShack): void {
    shack.respawnAt = null;
    const ranged = new RangedGremlin(this, {
      x: shack.x + Phaser.Math.Between(-40, 40),
      y: shack.y + Phaser.Math.Between(-40, 40),
    });
    const melee = new MeleeGremling(this, {
      x: shack.x + Phaser.Math.Between(-40, 40),
      y: shack.y + Phaser.Math.Between(-40, 40),
      wanderAnchor: { x: shack.x, y: shack.y, radius: 70 },
    });
    shack.guards = [ranged, melee];
    this.enemies.push(ranged, melee);
    this.enemyGroup.add(ranged);
    this.enemyGroup.add(melee);
  }

  // Called from tryAttackEnemy()'s kill branch for every defeated enemy — a
  // no-op unless `enemy` was one of a shack's guards. Schedules a respawn
  // (and re-arms the chest to roll fresh loot next time it's empty) only once
  // BOTH guards are dead, not per-guard.
  private onShackGuardKilled(enemy: Enemy): void {
    const shack = this.gremlinShacks.find((s) => s.guards.includes(enemy));
    if (!shack) return;
    shack.guards = shack.guards.filter((g) => g !== enemy);
    if (shack.guards.length > 0) return;
    shack.respawnAt = this.time.now + SHACK_GUARD_RESPAWN_MS;
    shack.loot.rearmIfEmpty();
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

  // Draw x/y within world margins, biased to a preferred zone via rejection
  // sampling and kept out of the player's spawn clearing. Falls back to the
  // last draw after a cap so a tiny/absent zone can't hang the loop.
  private pickSpawnPoint(
    rng: Phaser.Math.RandomDataGenerator,
    preferred: ZoneType | null,
    clearRadius: number,
    avoidCreek = false,
  ): { x: number; y: number } {
    let last = { x: WORLD_W / 2, y: WORLD_H / 2 };
    for (let attempt = 0; attempt < 200; attempt++) {
      const x = rng.between(60, WORLD_W - 60);
      const y = rng.between(60, WORLD_H - 60);
      last = { x, y };
      if (Phaser.Math.Distance.Between(x, y, WORLD_W / 2, WORLD_H / 2) < clearRadius) continue;
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
    for (let py = 0; py < WORLD_H; py += step) {
      for (let px = 0; px < WORLD_W; px += step) {
        const cx = px + step / 2;
        const cy = py + step / 2;
        const forestW = this.biome.forestWeight(cx, cy);
        if (forestW > 0.02) {
          g.fillStyle(0x24421c, 0.55 * forestW);
          g.fillRect(px, py, step, step);
        }
        const creekW = this.biome.creekWeight(cx, cy);
        if (creekW > 0.02) {
          g.fillStyle(0x3a6ea5, 0.6 * creekW);
          g.fillRect(px, py, step, step);
        }
      }
    }
    const rt = this.add.renderTexture(0, 0, WORLD_W, WORLD_H).setOrigin(0, 0).setDepth(-9);
    rt.draw(g);
    g.destroy();
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
    let last = { x: WORLD_W / 2, y: WORLD_H / 2 };
    for (let attempt = 0; attempt < 300; attempt++) {
      const x = rng.between(60, WORLD_W - 60);
      const y = rng.between(60, WORLD_H - 60);
      last = { x, y };
      if (Phaser.Math.Distance.Between(x, y, WORLD_W / 2, WORLD_H / 2) < clearRadius) continue;
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
      const enemy = new Enemy(this, {
        x,
        y,
        texture: "boar",
        displayName: "Boar",
        loot: [
          { resource: "boar_meat", min: 1, max: 1 },
          { resource: "bones", min: 1, max: 1 },
        ],
        maxHealth: 20,
        biteDamage: 25,
      });
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
      const snake = new Snake(this, { x, y });
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
      const gremlin = new RangedGremlin(this, { x, y });
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
      const gremling = new MeleeGremling(this, { x, y });
      this.enemies.push(gremling);
      this.enemyGroup.add(gremling);
    }
  }

  // Scatter Gremlin Shacks (first POI) through the forest zone, spread apart
  // via the same pickSpreadSpawnPoint pool the Gremlin-family enemies use.
  // 2 of the 5 are deliberately biased near the altar (if one has been
  // placed) as part of the "denser gremlin content = closer to the boss"
  // environmental-hint gradient — sampled directly around altarPosition
  // rather than a full pickSpreadSpawnPoint roll. First-pass/tunable counts.
  private spawnGremlinShacks(): void {
    const rng = this.sessionRng();
    const SHACK_COUNT = 5;
    const SHACK_NEAR_ALTAR_COUNT = 2;
    const SHACK_CLEAR_RADIUS = 260;
    const SHACK_MIN_SPACING = 500;
    const ALTAR_NEAR_RADIUS = 500;
    const shackPoints: { x: number; y: number }[] = [];
    for (let i = 0; i < SHACK_COUNT; i++) {
      let point: { x: number; y: number };
      if (i < SHACK_NEAR_ALTAR_COUNT && this.altarPosition) {
        point = this.pickPointNearAltar(rng, ALTAR_NEAR_RADIUS);
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
      const shack = new GremlinShack(this, point);
      this.gremlinShacks.push(shack);
      this.respawnShackGuards(shack);
    }
  }

  // Far from the world-center safe zone, biased toward forest (gremlin
  // habitat) — the boss altar's own placement. Chosen once per session.
  private pickAltarPosition(rng: Phaser.Math.RandomDataGenerator): { x: number; y: number } {
    const ALTAR_CLEAR_RADIUS = 900;
    return this.pickSpawnPoint(rng, "forest", ALTAR_CLEAR_RADIUS, true);
  }

  // A point sampled around altarPosition within `radius`, rejecting non-
  // forest/creek cells the same way pickSpawnPoint does — used to bias
  // shack/prop/enemy placement toward the altar without a real per-cell
  // density field.
  private pickPointNearAltar(rng: Phaser.Math.RandomDataGenerator, radius: number): { x: number; y: number } {
    const altar = this.altarPosition!;
    let last = altar;
    for (let attempt = 0; attempt < 200; attempt++) {
      const angle = Phaser.Math.DegToRad(rng.angle());
      const r = rng.between(0, radius);
      const x = Phaser.Math.Clamp(altar.x + Math.cos(angle) * r, 60, WORLD_W - 60);
      const y = Phaser.Math.Clamp(altar.y + Math.sin(angle) * r, 60, WORLD_H - 60);
      last = { x, y };
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

  // Escalating environmental hint near the altar: decorative gremlin-camp
  // clutter (purely visual) plus a small ADDITIVE batch of extra
  // gremlins/gremlings, layered on top of (not a multiplier on) spawnEnemies'
  // Milestone-O-tuned base counts, so the rest of the map's balance is
  // untouched. First-pass/tunable.
  private spawnAltarDensity(): void {
    if (!this.altarPosition) return;
    const rng = this.sessionRng();

    // Camp props: 3 concentric bands, denser closer to the altar.
    const PROP_BANDS: { min: number; max: number; count: number }[] = [
      { min: 0, max: 150, count: 20 },
      { min: 150, max: 300, count: 15 },
      { min: 300, max: 500, count: 5 },
    ];
    for (const band of PROP_BANDS) {
      for (let i = 0; i < band.count; i++) {
        const angle = Phaser.Math.DegToRad(rng.angle());
        const r = rng.between(band.min, band.max);
        const x = Phaser.Math.Clamp(this.altarPosition.x + Math.cos(angle) * r, 20, WORLD_W - 20);
        const y = Phaser.Math.Clamp(this.altarPosition.y + Math.sin(angle) * r, 20, WORLD_H - 20);
        this.add.image(x, y, "gremlin_camp_prop").setDepth(y);
      }
    }

    const ALTAR_NEAR_RADIUS = 500;
    const ALTAR_EXTRA_GREMLINS = 6;
    const ALTAR_EXTRA_GREMLINGS = 4;
    for (let i = 0; i < ALTAR_EXTRA_GREMLINS; i++) {
      const { x, y } = this.pickPointNearAltar(rng, ALTAR_NEAR_RADIUS);
      const gremlin = new RangedGremlin(this, { x, y });
      this.enemies.push(gremlin);
      this.enemyGroup.add(gremlin);
    }
    for (let i = 0; i < ALTAR_EXTRA_GREMLINGS; i++) {
      const { x, y } = this.pickPointNearAltar(rng, ALTAR_NEAR_RADIUS);
      const gremling = new MeleeGremling(this, { x, y });
      this.enemies.push(gremling);
      this.enemyGroup.add(gremling);
    }
  }

  // Spawns a projectile and tracks it in the right physics group by source —
  // currently only enemy-sourced projectiles exist (the ranged Gremlin's rock throw),
  // the Slingshot will need its own playerProjectiles group + overlap-vs-
  // enemies wiring once it lands.
  private spawnProjectile(cfg: ProjectileConfig): Projectile {
    const projectile = new Projectile(this, cfg);
    this.enemyProjectiles.add(projectile);
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
    let best = Infinity;

    for (const node of this.nodes) {
      if (node.depleted || node.harvested) continue;
      const radius = Math.max(node.displayWidth, node.displayHeight) / 2 + 6;
      const d = Phaser.Math.Distance.Between(world.x, world.y, node.x, node.y);
      if (d <= radius && d < best) {
        hoveredNode = node;
        hoveredEnemy = null;
        hoveredRack = null;
        hoveredShack = null;
        hoveredAltar = null;
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
        best = d;
      }
    }

    this.hoveredNode = hoveredNode;
    this.hoveredEnemy = hoveredEnemy;
    this.hoveredRack = hoveredRack;
    this.hoveredShack = hoveredShack;
    this.hoveredAltar = hoveredAltar;

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
              : null;
    if (prompt) {
      this.promptText.setText(prompt).setVisible(true);
      this.input.setDefaultCursor("pointer");
    } else {
      this.promptText.setVisible(false);
      this.input.setDefaultCursor("default");
    }
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
      return `[LMB] Pick up ${node.displayName}`;
    }

    const kind = requiredKind(node.action);
    if (this.equippedTool && toolKind(this.equippedTool) === kind) {
      return node.action === "chop" ? "[LMB] Chop" : "[LMB] Mine";
    }
    return null; // no tool of the right kind out → show nothing
  }

  // Mirrors promptFor()'s gating rules: out of reach -> nothing; no weapon
  // equipped -> nothing (never reveal what's required); else the attack verb.
  private promptForEnemy(enemy: Enemy): string | null {
    const inReach =
      Phaser.Math.Distance.Between(this.player.x, this.player.y, enemy.x, enemy.y) <= REACH;
    if (!inReach) return null;
    if (!this.equippedWeapon) return null;
    return `[LMB] Attack ${enemy.displayName}`;
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
    const node = this.hoveredNode;
    if (!node || node.depleted || node.harvested) return;
    const inReach =
      Phaser.Math.Distance.Between(this.player.x, this.player.y, node.x, node.y) <= REACH;
    if (!inReach) return;

    if (node.action !== "pickup") {
      // Must have the matching tool KIND equipped to chop/mine.
      const kind = requiredKind(node.action);
      if (!this.equippedTool || toolKind(this.equippedTool) !== kind) return;
      // (Future: also gate success on tool TIER here — a stone axe may be too
      // weak for a hardwood tree, which would show "[LMB] Chop" but fail.)

      // Cap hit rate so holding/spamming LMB can't out-farm the tool's swing.
      const cooldownMs = toolCooldownMs(this.equippedTool);
      if (this.time.now - this.lastToolHitAt < cooldownMs) return;

      const staminaCost = toolStaminaCost(this.equippedTool);
      if (!this.stamina.canAfford(staminaCost)) return; // exhausted — silent, same as the guards above

      this.lastToolHitAt = this.time.now;
      this.stamina.spend(staminaCost);

      this.player.playSwing();
      const depleted = node.takeHit(toolDamage(this.equippedTool));
      // Every swing grants gather-skill XP (not just the depleting one). `kind`
      // is already resolved above from requiredKind(node.action).
      this.skills.addXp(kind === "axe" ? "chopping" : "mining", 30);
      if (!depleted) return; // node survives the hit; stays interactable

      this.spawnLooseDrop(node.resource, node.amount, node.x, node.y);
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
  // Overflow falls back to dropping the same tier back on the floor.
  private collectNode(node: ResourceNode): void {
    if (node.tier !== undefined) {
      const stack: ItemStack = { key: node.resource, count: node.amount, tier: node.tier };
      if (!this.backpack.addStack(stack)) {
        this.spawnLooseDrop(node.resource, node.amount, node.x, node.y, DROPPED_ITEM_MAGNET_COOLDOWN_MS, node.tier);
        return;
      }
      this.discovered.add(node.resource);
      this.refreshDiscovery();
      return;
    }
    this.addToBackpack(node.resource, node.amount);
  }

  // Left-click action on the currently hovered, in-reach enemy. Mirrors
  // tryInteract()'s tool-swing guards (cooldown, stamina afford, silent fail).
  private tryAttackEnemy(enemy: Enemy): void {
    if (enemy.depleted || !this.equippedWeapon) return;
    const inReach =
      Phaser.Math.Distance.Between(this.player.x, this.player.y, enemy.x, enemy.y) <= REACH;
    if (!inReach) return;

    const cooldownMs = weaponCooldownMs(this.equippedWeapon);
    if (this.time.now - this.lastWeaponHitAt < cooldownMs) return;

    // Damage type routes both the on-hit skill XP and the Strength/Agility
    // stamina-cost discount. Weapon damage itself now scales with the
    // weapon SKILL's own level (not player stat points) — see Skills.ts.
    const dmgType = weaponPrimaryDamageType(this.equippedWeapon);
    const staminaCost = Math.round(
      weaponStaminaCost(this.equippedWeapon) * weaponStaminaCostMultiplier(dmgType, this.progression),
    );
    if (!this.stamina.canAfford(staminaCost)) return; // exhausted — silent, same as tool guard

    this.lastWeaponHitAt = this.time.now;
    this.stamina.spend(staminaCost);
    this.player.playSwing();
    this.player.playEquippedSwing();

    const baseDmg = weaponDamage(this.equippedWeapon) + weaponTierDamageBonus(this.equippedWeapon, this.equippedWeaponTier);
    let dmg = Math.round(baseDmg * weaponSkillDamageMultiplier(dmgType, this.skills));
    // Gremlin King's poise-break punish window — bonus damage while staggered.
    if (enemy instanceof GremlinKing && enemy.isStaggered()) dmg = Math.round(dmg * STAGGER_DAMAGE_MULTIPLIER);
    const depleted = enemy.takeHit(dmg);
    this.skills.addXp(dmgType, 30); // weapon-hit XP to the primary damage type's skill
    this.spawnDamageNumber(enemy.x, enemy.y, dmg);
    if (!depleted) return;

    // Kill: grant armor-skill XP once per distinct worn armor type.
    for (const armorType of armorTypesWorn(EQUIP_SLOTS.map((s) => this.equipment.get(s.id)))) {
      this.skills.addXp(armorType, 30);
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
    this.eventLog.add("combat", `Defeated ${enemy.displayName}`);
    this.hoveredEnemy = null;
    this.promptText.setVisible(false);
  }

  // Floating combat-text on a successful hit. Plain white for now — once dmg
  // types/resistances exist, this is the spot to color/vary the text.
  private spawnDamageNumber(x: number, y: number, amount: number): void {
    const text = this.add
      .text(x, y - 14, `${amount}`, {
        fontFamily: "monospace",
        fontSize: "14px",
        color: "#ffffff",
        stroke: "#000000",
        strokeThickness: 3,
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
    for (const enemy of this.enemies) {
      const bit = enemy.update(delta, this.player.x, this.player.y, now);
      if (bit) this.applyDamageToPlayer(enemy.biteDamage);
      // Gremlin King's melee/AoE kit deals area damage, not a single-point
      // bite — queried separately since it needs richer info (knockback)
      // than Enemy.update()'s plain boolean contract.
      if (enemy instanceof GremlinKing) {
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
    // Flat armor deduction — everything dealt today is physical damage (no
    // magic/elemental sources exist yet), so this applies uniformly; branch
    // on a damage type here once one does. Floored at 1 so no armor
    // combination grants full immunity.
    const reduced = Math.max(1, Math.round(amount - totalPlayerDefense(this.equipment)));
    const died = this.health.takeDamage(reduced);
    this.refreshHealthBar();
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
    this.isDead = true;
    this.player.setVelocity(0, 0);
    this.eventLog.add("combat", "You died...");
    this.time.delayedCall(this.RESPAWN_DELAY_MS, () => this.respawnPlayer());
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

  // Add an item to the backpack and record it as discovered (which may unlock
  // recipes). Returns any amount that didn't fit. (M1 backpack is roomy;
  // overflow handling — dropping — arrives with the loot-drop milestone.)
  private addToBackpack(key: string, amount: number): number {
    const leftover = this.backpack.add(key, amount);
    this.discovered.add(key);
    this.refreshDiscovery();
    return leftover;
  }

  // Re-run recipe discovery and announce anything newly unlocked. Call after
  // any resource pickup, skill level-up, or workbench placement.
  private refreshDiscovery(): void {
    const unlocked = this.crafting.refresh(this.discovered, this.skills, this.hasWorkbenchPlaced());
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
    this.health.setBonusMax(this.progression.vitalityHealthBonus());
    this.stamina.setBonusMax(this.progression.enduranceStaminaBonus());
    this.refreshHealthBar();
    this.refreshStaminaBar();
  }

  // Spend one unspent point on a stat (from the Character menu). Endurance/
  // Vitality additionally re-sync the HP/Stamina max; the others take effect
  // the next time their multiplier is read (weapon hit). Refreshes the menu
  // in place.
  private allocateStat(stat: StatType): void {
    if (!this.progression.allocate(stat)) return;
    if (stat === "endurance" || stat === "vitality") this.syncStatBonuses();
    this.characterMenu?.refresh();
    this.refreshStatPointsBadge();
  }

  // --- Crafting ---

  private createCraftingMenu(): void {
    this.craftingMenu = new CraftingMenu(this, {
      backpack: this.backpack,
      crafting: this.crafting,
      craft: (recipe) => this.craftRecipe(recipe),
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
    this.closeChestMenu();
    this.closeUpgradeMenu();
    const opening = !this.inventoryMenu.isOpen();
    if (opening) {
      this.inventoryMenu.toggle();
      this.craftingMenu.toggle();
    } else {
      this.inventoryMenu.close();
      this.craftingMenu.close();
    }
  }

  private craftRecipe(recipe: Recipe): void {
    const key = outputKey(recipe);
    // Check affordability AND room before deducting, so a full backpack can't
    // eat the resources (the bug this replaces). Then create the item — a 2nd
    // tool now makes a new stack instead of a silent no-op.
    if (!this.crafting.canAfford(recipe, this.backpack)) return;
    if (recipe.tier > 0 && !this.isNearWorkbench(this.player.x, this.player.y)) return;
    if (!this.backpack.hasRoomFor(key, 1)) {
      this.eventLog.add("info", "Inventory full");
      return;
    }
    this.crafting.craft(recipe, this.backpack);
    this.addToBackpack(key, 1);
    this.recomputeEquipped();
    this.refreshHud();
    this.inventoryMenu.refresh();
  }

  // --- Placement mode (world-placed items: campfire, building pieces) ---

  // Enters placement mode without spending anything yet — cost is only
  // deducted per-unit, on each successful LMB placement (see
  // attemptPlaceObject). Cancelling is always free.
  private startPlacement(recipe: Recipe): void {
    this.suppressNextPointerdown = true;
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
    this.closeChestMenu();
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
    // Placing a Workbench for the first time can newly unlock tier 1+
    // recipes' visibility (see Crafting.refresh's workbenchPlaced gate) —
    // re-run discovery so that happens immediately, not just on next pickup.
    if (key === "workbench") this.refreshDiscovery();
    // A placed Drying Rack gets its own processing state, ticked in update()
    // and bound to the menu when the player interacts with this image.
    if (key === "drying_rack") this.dryingRacks.push({ image, station: new ProcessingStation() });
    this.refreshHud();
    this.inventoryMenu.refresh();
    // Placing from an owned stack changed a count — keep the hotbar display in
    // sync too (refreshHud only touches the crafting/inventory menus).
    if (itemSource) {
      this.hotbarUI.refresh();
      // That was the last one owned — exit placement mode immediately rather
      // than leaving a faded ghost armed on the cursor until the next click
      // notices the stack is empty (the old "ghost workbench" bug).
      if (itemSource.container.count(itemSource.key) < 1) {
        this.cancelPlacement();
        return;
      }
    }
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

  // Has the player ever placed a Workbench, anywhere — separate from (and
  // prior to) isNearWorkbench's "currently in range" check. Gates whether
  // tier 1+ recipes are discoverable/visible at all in the crafting menu.
  private hasWorkbenchPlaced(): boolean {
    return this.placedObjects.some((obj) => obj.getData("itemKey") === "workbench");
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
    const items: ContextMenuItem[] = [
      { label: "Upgrade", enabled: true, onClick: () => this.openUpgradeMenu(obj) },
      { label: "Destroy", enabled: true, onClick: () => this.destroyPlacedObject(obj) },
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
    this.closeChestMenu();
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
    this.closeChestMenu();
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
    this.closeChestMenu();
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

    // Carry the placed instance's upgrade tier into the pickup so re-placing
    // it restores the same tier (fixes the old bug where Destroy silently
    // discarded an upgraded Workbench's tier).
    this.spawnLooseDrop(itemKey, 1, obj.x, obj.y, DROPPED_ITEM_MAGNET_COOLDOWN_MS, tier || undefined);
    this.placedObjects = this.placedObjects.filter((o) => o !== obj);
    obj.destroy();
    this.eventLog.add("info", `Destroyed ${name}`);
  }

  // --- Inventory ---

  private createInventoryMenu(): void {
    this.inventoryMenu = new InventoryMenu(this, {
      backpack: this.backpack,
      skills: this.skills,
      progression: this.progression,
      armorSlots: () => this.armorSlots(),
      beginDrag: (c, i, p) => this.beginItemDrag(c, i, p),
      beginArmorDrag: (slot, p) => this.beginArmorDrag(slot, p),
      openArmorContextMenu: (slot, x, y) => this.openArmorContextMenu(slot, x, y),
      openWeaponUpgrade: (c, i) => this.openWeaponUpgradeMenu(c, i),
      openPlaceContextMenu: (c, i, x, y) => this.openPlaceContextMenu(c, i, x, y),
      isDragging: () => this.dragSource !== null,
    });
  }

  private armorSlots(): ArmorSlotView[] {
    return EQUIP_SLOTS.map((s) => {
      const eq = this.equipment.get(s.id);
      return { id: s.id, label: s.label, itemKey: eq?.key ?? null, tier: eq?.tier };
    });
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
    const previous = this.equipment.get(slot);
    this.equipment.set(slot, { key: stack.key, tier: stack.tier ?? 0 });
    container.set(index, null);
    if (previous) this.returnArmorToBackpack(previous);
    this.eventLog.add("info", `Equipped ${def.name}`);
    this.afterItemMove();
  }

  private returnArmorToBackpack(item: EquippedItem): void {
    const stack: ItemStack = { key: item.key, count: 1, tier: item.tier || undefined };
    if (!this.backpack.addStack(stack)) {
      this.spawnLooseDrop(item.key, 1, this.player.x, this.player.y, DROPPED_ITEM_MAGNET_COOLDOWN_MS, item.tier || undefined);
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
      this.backpack.set(toIndex, { key: eq.key, count: 1, tier: eq.tier || undefined });
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
      .setDepth(2000)
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
        "Inventory: Tab",
        "Character: K",
        "Auto-pickup: V",
        "Range ring: O",
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
      .setDepth(2000)
      .setVisible(false);

    this.refreshHud();
  }

  private refreshHud(): void {
    this.craftingMenu?.refresh();
    this.inventoryMenu?.refresh();
  }

  // Stamina bar: centered directly above the hotbar, sized close to a single
  // hotbar slot (not a full-width bar) since it's meant to start small — this
  // is the first player stat bar in the game, and future HP/mana bars should
  // stack above this one the same way, using hotbarUI.top as the shared
  // anchor.
  private createStaminaBar(): void {
    const barW = 76;
    const barH = 20;
    const gap = 8;
    const barX = this.scale.width / 2 - barW / 2;
    const barY = this.hotbarUI.top - gap - barH;
    this.add
      .rectangle(barX, barY, barW, barH, 0x1a1f2a, 0.95)
      .setOrigin(0, 0)
      .setStrokeStyle(1, 0x3a4250)
      .setScrollFactor(0)
      .setDepth(2000);
    // Dark/muted yellow rather than a bright/neon fill — a fixed color, no
    // depletion/regen color-shift.
    this.staminaBarFill = this.add
      .rectangle(barX + 1, barY + 1, barW - 2, barH - 2, 0xb8860b, 1)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(2001);
    this.staminaBarText = this.add
      .text(barX + barW / 2, barY + barH / 2, "", {
        fontFamily: "monospace",
        fontSize: "12px",
        color: "#1a1200",
      })
      .setOrigin(0.5, 0.5)
      .setScrollFactor(0)
      .setDepth(2002);
    this.refreshStaminaBar();
  }

  private refreshStaminaBar(): void {
    const frac = this.stamina.value() / this.stamina.max;
    this.staminaBarFill.setScale(Math.max(0, frac), 1);
    this.staminaBarText.setText(`${Math.round(this.stamina.value())}`);
  }

  // HP bar: stacks directly above the stamina bar via the same hotbarUI.top
  // anchor, one more slot up. Crimson fill vs. the stamina bar's goldenrod.
  private createHealthBar(): void {
    const barW = 76;
    const barH = 20;
    const gap = 8;
    const barX = this.scale.width / 2 - barW / 2;
    const staminaBarY = this.hotbarUI.top - gap - barH;
    const barY = staminaBarY - gap - barH;
    this.add
      .rectangle(barX, barY, barW, barH, 0x1a1f2a, 0.95)
      .setOrigin(0, 0)
      .setStrokeStyle(1, 0x3a4250)
      .setScrollFactor(0)
      .setDepth(2000);
    this.healthBarFill = this.add
      .rectangle(barX + 1, barY + 1, barW - 2, barH - 2, 0xb02020, 1)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(2001);
    this.healthBarText = this.add
      .text(barX + barW / 2, barY + barH / 2, "", {
        fontFamily: "monospace",
        fontSize: "12px",
        color: "#ffffff",
      })
      .setOrigin(0.5, 0.5)
      .setScrollFactor(0)
      .setDepth(2002);
    this.refreshHealthBar();
  }

  private refreshHealthBar(): void {
    const frac = this.health.value() / this.health.max;
    this.healthBarFill.setScale(Math.max(0, frac), 1);
    this.healthBarText.setText(`${Math.round(this.health.value())}`);
  }

  // Player-level XP bar: stacks one more slot above the HP bar via the same
  // hotbarUI.top anchor chain. Shows "Lvl N" inside; fills toward the next
  // level. Purple to distinguish from HP (crimson) / stamina (goldenrod).
  private createXpBar(): void {
    const barW = 76;
    const barH = 20;
    const gap = 8;
    const barX = this.scale.width / 2 - barW / 2;
    const staminaBarY = this.hotbarUI.top - gap - barH;
    const healthBarY = staminaBarY - gap - barH;
    const barY = healthBarY - gap - barH;
    this.add
      .rectangle(barX, barY, barW, barH, 0x1a1f2a, 0.95)
      .setOrigin(0, 0)
      .setStrokeStyle(1, 0x3a4250)
      .setScrollFactor(0)
      .setDepth(2000);
    this.xpBarFill = this.add
      .rectangle(barX + 1, barY + 1, barW - 2, barH - 2, 0x8a5cd0, 1)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(2001);
    this.xpBarText = this.add
      .text(barX + barW / 2, barY + barH / 2, "", {
        fontFamily: "monospace",
        fontSize: "12px",
        color: "#ffffff",
      })
      .setOrigin(0.5, 0.5)
      .setScrollFactor(0)
      .setDepth(2002);
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

    this.cameras.main.flash(180, 90, 70, 20);

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
