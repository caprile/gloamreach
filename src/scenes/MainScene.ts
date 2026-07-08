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
import { RangedGremlin, MeleeGremlin } from "../entities/Gremlin";
import { Projectile, type ProjectileConfig } from "../entities/Projectile";
import type { ResourceType } from "../systems/Inventory";
import { Skills, type SkillType } from "../systems/Skills";
import { Crafting } from "../systems/Crafting";
import { Stamina } from "../systems/Stamina";
import { Health } from "../systems/Health";
import {
  weaponDamage,
  weaponCooldownMs,
  weaponStaminaCost,
  type WeaponType,
} from "../systems/Weapons";
import { outputKey, RECIPES, type Recipe } from "../systems/Recipes";
import { itemDef } from "../systems/Items";
import { ItemContainer, moveSlot } from "../systems/ItemContainer";
import { EventLog } from "../systems/EventLog";
import { Biome, type ZoneType } from "../systems/Biome";
import { Equipment, EQUIP_SLOTS } from "../systems/Equipment";
import { Hotbar } from "../systems/Hotbar";
import { ProcessingStation } from "../systems/Processing";
import { CraftingMenu } from "../ui/CraftingMenu";
import { ContextMenu, type ContextMenuItem } from "../ui/ContextMenu";
import { DryingRackMenu } from "../ui/DryingRackMenu";
import { InventoryMenu, BACKPACK_SIZE, type ArmorSlotView } from "../ui/InventoryMenu";
import { HotbarUI } from "../ui/HotbarUI";
import { EventLogUI } from "../ui/EventLogUI";
import { KeybindsUI } from "../ui/KeybindsUI";

const HOTBAR_KEYS = ["ONE", "TWO", "THREE", "FOUR", "FIVE", "SIX", "SEVEN", "EIGHT", "NINE"];

const TILE = 32;
const WORLD_W = TILE * 80; // 2560px wide — a procedurally generated biome (see Biome.ts)
const WORLD_H = TILE * 60; // 1920px tall
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
// A player-dropped or destroyed-station item pickup ignores the magnet for
// this long so it doesn't instantly fly back into the inventory/station that
// just released it. Manual click-pickup is unaffected.
const DROPPED_ITEM_MAGNET_COOLDOWN_MS = 1500;

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
  private crafting = new Crafting();
  // The single unified item pool. Resources and crafted items alike live here
  // as stacks; the hotbar is a second container items move into. `discovered`
  // records every item key ever added (drives recipe discovery).
  private backpack = new ItemContainer(BACKPACK_SIZE);
  private discovered = new Set<string>();
  // The single tool the player currently has "out". Driven by the selected
  // hotbar slot.
  private equippedTool: ToolType | null = null;
  private equippedWeapon: WeaponType | null = null;
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
  // Right-click "Upgrade / Destroy" popup for any placed object (Workbench,
  // Campfire, Drying Rack, ...) — a single generic system, not per-type.
  private contextMenu!: ContextMenu;
  private hotbarUI!: HotbarUI;
  private eventLogUI!: EventLogUI;
  private keybindsUI!: KeybindsUI;

  // Active drag (from any container): the source slot + a floating ghost icon.
  private dragSource: { container: ItemContainer; index: number } | null = null;
  private dragGhost: Phaser.GameObjects.Image | null = null;

  private promptText!: Phaser.GameObjects.Text; // fixed bottom-right hover prompt
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
  private rangeRingEnabled = true;

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
  private placementHintText!: Phaser.GameObjects.Text; // small hint under the top-left controls line
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
    this.hotbarUI = new HotbarUI(this, this.hotbar, {
      beginDrag: (c, i, p) => this.beginItemDrag(c, i, p),
      quickMove: (c, i) => this.quickMoveItem(c, i),
      isDragging: () => this.dragSource !== null,
    });
    this.createStaminaBar();
    this.createHealthBar();
    // Stacks directly under the Keybinds panel (top-left column), clear of
    // the bottom-center HUD cluster (hotbar + stamina bar) which is expected
    // to grow.
    this.eventLogUI = new EventLogUI(this, this.eventLog, this.keybindsUI.bottom + 8);

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
      this.closeDryingRackMenu();
      this.craftingMenu.close();
      this.inventoryMenu.toggle();
    });
    this.input.keyboard!.on("keydown-T", () => {
      if (this.placementMode) return this.cancelPlacement();
      this.closeDryingRackMenu();
      this.inventoryMenu.close();
      this.craftingMenu.toggle();
    });
    this.input.keyboard!.on("keydown-ESC", () => {
      if (this.contextMenu.isOpen()) return this.contextMenu.close();
      if (this.placementMode) return this.cancelPlacement();
      this.closeDryingRackMenu();
      this.craftingMenu.close();
      this.inventoryMenu.close();
    });
    HOTBAR_KEYS.forEach((key, i) => {
      this.input.keyboard!.on(`keydown-${key}`, () => this.selectHotbarSlot(i));
    });
    this.input.keyboard!.on("keydown-V", () => this.toggleMagnet());
    this.input.keyboard!.on("keydown-O", () => this.toggleRangeRing());

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
      return;
    }

    // Gate sprint on affording *this frame's* drain (not just "stamina > 0")
    // — otherwise a partial remainder that's too small to spend keeps
    // regenerating just enough to pass a ">0" check forever, and sprint never
    // actually hard-blocks.
    const sprintCost = SPRINT_DRAIN_PER_SEC * (delta / 1000);
    const canSprint = this.stamina.canAfford(sprintCost);
    const canDash = this.stamina.canAfford(DASH_STAMINA_COST);
    const frame = this.player.update(delta, canSprint, canDash);

    if (frame.sprinting) {
      this.stamina.spend(sprintCost);
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
      this.addToBackpack(node.resource, node.amount);
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
      this.contextMenu.isOpen()
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

  private resolveItemDrag(pointer: Phaser.Input.Pointer): void {
    if (!this.dragSource) return;
    const src = this.dragSource;
    this.dragSource = null;
    this.dragGhost?.destroy();
    this.dragGhost = null;

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

    // Inventory menu open: its trash box permanently destroys the stack.
    if (this.inventoryMenu.isOpen() && this.inventoryMenu.isOverTrash(pointer.x, pointer.y)) {
      this.destroyStack(src.container, src.index, stack);
      return;
    }

    // Prefer a hotbar slot under the pointer, else a backpack slot.
    const hotIndex = this.hotbarUI.slotAt(pointer.x, pointer.y);
    if (hotIndex !== null) {
      // A click that never left the hotbar slot it started on isn't a
      // rearrange — it's a select, identical to a number-key/wheel select
      // (there's no other click-to-select). setHotbarSelection also drives
      // placement mode for placeables.
      if (src.container === this.hotbar.container && src.index === hotIndex) {
        this.setHotbarSelection(hotIndex);
        return;
      }
      if (!itemDef(stack.key)?.hotbarable) return; // reject; snaps back
      moveSlot(src.container, src.index, this.hotbar.container, hotIndex);
      this.afterItemMove();
      return;
    }
    const bagIndex = this.inventoryMenu.slotIndexAt(pointer.x, pointer.y);
    if (bagIndex !== null) {
      // Left-click-in-place on a backpack placeable enters placement mode for
      // it (e.g. a station recovered via Destroy) — the inventory analog of
      // selecting a placeable in the hotbar. Right-click still quick-moves it
      // to the hotbar like any other item.
      if (
        src.container === this.backpack &&
        src.index === bagIndex &&
        itemDef(stack.key)?.placeable
      ) {
        this.startItemPlacement(this.backpack, bagIndex);
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

  // Right-click: move backpack->hotbar (if hotbar-able) or hotbar->backpack.
  // Placeables are hotbar-able too, so right-clicking one in the backpack just
  // quick-moves it to the hotbar like any other item (consistent behavior);
  // entering placement mode from the inventory is the *left*-click gesture (see
  // resolveItemDrag's backpack click-in-place branch).
  private quickMoveItem(container: ItemContainer, index: number): void {
    const stack = container.slot(index);
    if (!stack) return;

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
  }

  // --- Drying Rack (processing station) ---

  private createDryingRackMenu(): void {
    this.dryingRackMenu = new DryingRackMenu(this, {
      backpack: this.backpack,
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
    this.openRack = rack.station;
    this.dryingRackMenu.openMenu();
  }

  private closeDryingRackMenu(): void {
    this.dryingRackMenu.close();
    this.openRack = null;
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

    // Free pickups. Pre-placed branches/rocks are always manual-click — only
    // pieces spawned from a depleted tree/boulder are "loose"/magnet-eligible
    // (see spawnLooseDrop). Counts scaled up for the larger world. Both stay
    // off the creek, same reasoning as trees/boulders below.
    scatter(40, { texture: "branch", resource: "wood", amount: 1, action: "pickup", displayName: "Branch", loose: false, solid: false, health: 1, zone: "forest", avoidCreek: true });
    scatter(30, { texture: "rock", resource: "stone", amount: 1, action: "pickup", displayName: "Rock", loose: false, solid: false, health: 1, zone: null, avoidCreek: true });
    // Tool-gated. Trees are dense in the forest and sparse in the grassy open;
    // both stay off the creek (a tree on water looks wrong). Boulders favor the
    // grassy open. Neither blocks movement (see updateTreeOcclusion for the
    // Y-sort + fade that replaces solid collision) — only the `solids` group
    // (currently empty) is reserved for future structures/walls/mountains.
    scatter(70, { texture: "tree", resource: "wood", amount: 5, action: "chop", displayName: "Tree", loose: false, solid: false, health: 3, zone: "forest", avoidCreek: true });
    scatter(14, { texture: "tree", resource: "wood", amount: 5, action: "chop", displayName: "Tree", loose: false, solid: false, health: 3, zone: "grassy", avoidCreek: true });
    scatter(18, { texture: "boulder", resource: "stone", amount: 5, action: "mine", displayName: "Boulder", loose: false, solid: false, health: 3, zone: "grassy", avoidCreek: true });
    // Blackberry bushes — free forest pickup (Milestone H). A future food item;
    // no eating mechanic yet, so it just sits in inventory for now.
    scatter(16, { texture: "blackberry_bush", resource: "blackberry", amount: 2, action: "pickup", displayName: "Blackberries", loose: false, solid: false, health: 1, zone: "forest", avoidCreek: true });

    // Cattail — free pickup, but a bespoke spawn constraint (creek *edge*, not
    // just "not on the creek"), so it can't reuse scatter's zone/avoidCreek
    // sampling. Feeds the Drying Rack's twine output.
    const CATTAIL_COUNT = 22;
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
    const BOAR_COUNT = 12;
    const BOAR_FOREST_COUNT = Math.round(BOAR_COUNT * 0.8);
    const BOAR_GRASSY_COUNT = BOAR_COUNT - BOAR_FOREST_COUNT;
    const spawnBoar = (zone: "forest" | "grassy") => {
      const { x, y } = this.pickSpawnPoint(rng, zone, BOAR_CLEAR_RADIUS);
      const enemy = new Enemy(this, {
        x,
        y,
        texture: "boar",
        displayName: "Boar",
        loot: [
          { resource: "boar_meat", min: 1, max: 2 },
          { resource: "bones", min: 1, max: 2 },
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
    // discoverable).
    const SNAKE_COUNT = 6;
    for (let i = 0; i < SNAKE_COUNT; i++) {
      const { x, y } = this.pickSpawnPoint(rng, "grassy", 200);
      const snake = new Snake(this, { x, y });
      this.enemies.push(snake);
      this.enemyGroup.add(snake);
    }

    // Gremlins: grassy-preferred with occasional forest wandering-in (per
    // CLAUDE.md's first-biome content notes). Melee-only variant is more
    // common; the ranged variant is rarer and stronger (only leather-style
    // gate: it's the sole gremlin_skin source, feeding the Drying Rack).
    const RANGED_GREMLIN_COUNT = 4;
    for (let i = 0; i < RANGED_GREMLIN_COUNT; i++) {
      const { x, y } = this.pickSpawnPoint(rng, "grassy", 200);
      const gremlin = new RangedGremlin(this, { x, y });
      this.enemies.push(gremlin);
      this.enemyGroup.add(gremlin);
    }
    const MELEE_GREMLIN_COUNT = 6;
    for (let i = 0; i < MELEE_GREMLIN_COUNT; i++) {
      const { x, y } = this.pickSpawnPoint(rng, "grassy", 200);
      const gremlin = new MeleeGremlin(this, { x, y });
      this.enemies.push(gremlin);
      this.enemyGroup.add(gremlin);
    }
  }

  // Spawns a projectile and tracks it in the right physics group by source —
  // currently only enemy-sourced projectiles exist (Gremlin's rock throw),
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
    let best = Infinity;

    for (const node of this.nodes) {
      if (node.depleted) continue;
      const radius = Math.max(node.displayWidth, node.displayHeight) / 2 + 6;
      const d = Phaser.Math.Distance.Between(world.x, world.y, node.x, node.y);
      if (d <= radius && d < best) {
        hoveredNode = node;
        hoveredEnemy = null;
        hoveredRack = null;
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
        best = d;
      }
    }

    this.hoveredNode = hoveredNode;
    this.hoveredEnemy = hoveredEnemy;
    this.hoveredRack = hoveredRack;

    const prompt = hoveredNode
      ? this.promptFor(hoveredNode)
      : hoveredEnemy
        ? this.promptForEnemy(hoveredEnemy)
        : hoveredRack
          ? this.promptForRack(hoveredRack)
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
    const node = this.hoveredNode;
    if (!node || node.depleted) return;
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
      if (!depleted) return; // node survives the hit; stays interactable

      this.spawnLooseDrop(node.resource, node.amount, node.x, node.y);
      node.deplete();
      this.nodes = this.nodes.filter((n) => n !== node);
      this.hoveredNode = null;
      this.promptText.setVisible(false);
      this.refreshHud();
      return;
    }

    this.addToBackpack(node.resource, node.amount);
    node.deplete();
    this.nodes = this.nodes.filter((n) => n !== node);
    this.hoveredNode = null;
    this.promptText.setVisible(false);
    this.refreshHud();
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

    const staminaCost = weaponStaminaCost(this.equippedWeapon);
    if (!this.stamina.canAfford(staminaCost)) return; // exhausted — silent, same as tool guard

    this.lastWeaponHitAt = this.time.now;
    this.stamina.spend(staminaCost);
    this.player.playSwing();
    this.player.playEquippedSwing();

    const dmg = weaponDamage(this.equippedWeapon);
    const depleted = enemy.takeHit(dmg);
    this.spawnDamageNumber(enemy.x, enemy.y, dmg);
    if (!depleted) return;

    const dropX = enemy.x;
    const dropY = enemy.y;
    const loot = enemy.rollLoot();
    enemy.playDeathFeedback(() => {
      for (const drop of loot) {
        this.spawnLooseDrop(drop.resource, drop.amount, dropX, dropY);
      }
    });
    this.enemies = this.enemies.filter((e) => e !== enemy);
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

  private applyDamageToPlayer(amount: number): void {
    if (this.isDead) return;
    if (this.time.now < this.invulnerableUntil) return;
    const died = this.health.takeDamage(amount);
    this.refreshHealthBar();
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
    const existing = this.nodes.find(
      (n) =>
        n !== node &&
        n.isDrop &&
        n.loose &&
        !n.depleted &&
        !n.exploding &&
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
    this.craftingMenu?.refresh();
    this.inventoryMenu?.refresh();
  }

  // Level a skill and log it. No gameplay trigger yet (XP comes later) — this
  // is the hook progression will call, and unlocking a skill level can reveal
  // recipes gated on it.
  gainSkillLevel(skill: SkillType): void {
    this.skills.levelUp(skill);
    const name = skill.charAt(0).toUpperCase() + skill.slice(1);
    this.eventLog.add("levelup", `Leveled Up (${name}) -> Lvl ${this.skills.get(skill)}`);
    this.refreshDiscovery();
  }

  // --- Crafting ---

  private createCraftingMenu(): void {
    this.craftingMenu = new CraftingMenu(this, {
      backpack: this.backpack,
      crafting: this.crafting,
      craft: (recipe) => this.craftRecipe(recipe),
      startPlacement: (recipe) => this.startPlacement(recipe),
      isNearWorkbench: () => this.isNearWorkbench(this.player.x, this.player.y),
    });
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
    // Placement intercepts world clicks, so any open menu would sit in front of
    // the ghost — close them first, mirroring the crafting menu's Place flow.
    this.craftingMenu.close();
    this.inventoryMenu.close();
    this.closeDryingRackMenu();
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
    if (itemSource) itemSource.container.removeCount(itemSource.key, 1);
    else this.crafting.craft(recipe, this.backpack);
    const pos = this.clampedPlacementPoint();
    const key = outputKey(recipe);
    const texture = itemDef(key)?.texture;
    const image = this.add.image(pos.x, pos.y, texture ?? "");
    image.setData("itemKey", key);
    this.placedObjects.push(image);
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
    if (itemSource) this.hotbarUI.refresh();
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

  private openContextMenuForObject(obj: Phaser.GameObjects.Image, screenX: number, screenY: number): void {
    const itemKey = obj.getData("itemKey") as string;
    const items: ContextMenuItem[] = [];

    // Only the Workbench supports an upgrade right now — Drying Rack/Campfire
    // upgrade tiers are undesigned (see CLAUDE.md's long-term notes), so their
    // row is simply omitted rather than shown permanently disabled.
    if (itemKey === "workbench") {
      const tier = (obj.getData("tier") as number | undefined) ?? 0;
      const alreadyMax = tier >= 1;
      const hasUpgradeItem = this.backpack.count("workbench_upgrade") > 0;
      items.push({
        label: alreadyMax ? "Upgrade (maxed)" : "Upgrade",
        enabled: !alreadyMax && hasUpgradeItem,
        onClick: () => this.upgradeWorkbench(obj),
      });
    }

    items.push({ label: "Destroy", enabled: true, onClick: () => this.destroyPlacedObject(obj) });
    this.contextMenu.show(screenX, screenY, items);
  }

  // Consumes a Workbench Upgrade item and marks this specific placed
  // Workbench as upgraded. The mechanical payoff (recipes/behavior gated on
  // an upgraded bench) is intentionally undesigned this pass — this wires up
  // the consume-and-flag mechanism plus a visual tell for future recipes to
  // hook into.
  private upgradeWorkbench(obj: Phaser.GameObjects.Image): void {
    if (this.backpack.count("workbench_upgrade") <= 0) return;
    this.backpack.removeCount("workbench_upgrade", 1);
    obj.setData("tier", 1);
    obj.setTint(0xffe08a);
    this.eventLog.add("info", "Workbench upgraded!");
    this.afterItemMove();
  }

  // Minecraft-style destroy: the object vanishes and drops as a recoverable
  // loose pickup of itself — not "pieces," a simpler result that's equally
  // recoverable. A Drying Rack's still-loaded raw input is refunded the same
  // way first, so destroying one doesn't just eat whatever was inside it.
  private destroyPlacedObject(obj: Phaser.GameObjects.Image): void {
    const itemKey = obj.getData("itemKey") as string;
    const name = itemDef(itemKey)?.name ?? itemKey;

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

    this.spawnLooseDrop(itemKey, 1, obj.x, obj.y, DROPPED_ITEM_MAGNET_COOLDOWN_MS);
    this.placedObjects = this.placedObjects.filter((o) => o !== obj);
    obj.destroy();
    this.eventLog.add("info", `Destroyed ${name}`);
  }

  // --- Inventory ---

  private createInventoryMenu(): void {
    this.inventoryMenu = new InventoryMenu(this, {
      backpack: this.backpack,
      armorSlots: () => this.armorSlots(),
      beginDrag: (c, i, p) => this.beginItemDrag(c, i, p),
      quickMove: (c, i) => this.quickMoveItem(c, i),
      isDragging: () => this.dragSource !== null,
    });
  }

  private armorSlots(): ArmorSlotView[] {
    return EQUIP_SLOTS.map((s) => ({
      id: s.id,
      label: s.label,
      itemKey: this.equipment.get(s.id),
    }));
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
        "Craft: T",
        "Inventory: Tab",
        "Auto-pickup: V",
        "Range ring: O",
      ],
      () => this.eventLogUI?.setTopY(this.keybindsUI.bottom + 8),
    );

    // Placement-mode hint, directly under the controls line above — small so
    // it stays clear of the crafting/inventory tabs in the top-right.
    this.placementHintText = this.add
      .text(12, 30, "", {
        fontFamily: "monospace",
        fontSize: "12px",
        color: "#ffe08a",
      })
      .setScrollFactor(0)
      .setDepth(1000)
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
}
