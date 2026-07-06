import Phaser from "phaser";
import { Player } from "../entities/Player";
import {
  ResourceNode,
  requiredKind,
  toolKind,
  toolDamage,
  toolCooldownMs,
  type NodeAction,
  type ToolType,
} from "../entities/ResourceNode";
import type { ResourceType } from "../systems/Inventory";
import { Skills, type SkillType } from "../systems/Skills";
import { Crafting } from "../systems/Crafting";
import { outputKey, type Recipe } from "../systems/Recipes";
import { itemDef } from "../systems/Items";
import { ItemContainer, moveSlot } from "../systems/ItemContainer";
import { EventLog } from "../systems/EventLog";
import { Equipment, EQUIP_SLOTS } from "../systems/Equipment";
import { Hotbar } from "../systems/Hotbar";
import { CraftingMenu } from "../ui/CraftingMenu";
import { InventoryMenu, BACKPACK_SIZE, type ArmorSlotView } from "../ui/InventoryMenu";
import { HotbarUI } from "../ui/HotbarUI";
import { EventLogUI } from "../ui/EventLogUI";

const HOTBAR_KEYS = ["ONE", "TWO", "THREE", "FOUR", "FIVE", "SIX", "SEVEN", "EIGHT", "NINE"];

const TILE = 32;
const WORLD_W = TILE * 40; // 1280px wide (bigger world comes with generation later)
const WORLD_H = TILE * 30; // 960px tall
const REACH = 64; // how close (px) the player must be to interact
const PLACEMENT_RADIUS = REACH * 1.25; // how far from the player a placed item may land

// The main gameplay scene: build the world, spawn the player and resources,
// follow the camera, and run the mouse-driven interaction + HUD.
export class MainScene extends Phaser.Scene {
  private player!: Player;
  private nodes: ResourceNode[] = [];
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
  private hotbar = new Hotbar();
  private equipment = new Equipment();
  private eventLog = new EventLog();
  private craftingMenu!: CraftingMenu;
  private inventoryMenu!: InventoryMenu;
  private hotbarUI!: HotbarUI;
  private eventLogUI!: EventLogUI;

  // Active drag (from any container): the source slot + a floating ghost icon.
  private dragSource: { container: ItemContainer; index: number } | null = null;
  private dragGhost: Phaser.GameObjects.Image | null = null;

  private promptText!: Phaser.GameObjects.Text; // fixed bottom-right hover prompt
  private hoveredNode: ResourceNode | null = null;
  private lastToolHitAt = 0; // this.time.now of the last successful chop/mine hit

  // Placement mode: crafting a placeable recipe (e.g. campfire) enters this
  // instead of landing in the backpack. A ghost preview follows the cursor,
  // clamped to PLACEMENT_RADIUS of the player; LMB commits (deducts cost,
  // spawns a world object), RMB cancels for free (nothing was spent yet).
  private placementMode: { recipe: Recipe } | null = null;
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
    // Ground: one repeating grass texture stretched across the whole world.
    this.add.tileSprite(0, 0, WORLD_W, WORLD_H, "grass").setOrigin(0, 0);

    // Keep the player and camera inside the world.
    this.physics.world.setBounds(0, 0, WORLD_W, WORLD_H);
    this.cameras.main.setBounds(0, 0, WORLD_W, WORLD_H);

    // Spawn the player in the middle and follow it smoothly.
    this.player = new Player(this, WORLD_W / 2, WORLD_H / 2);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);

    // Trees and boulders are solid; the player bumps into them.
    const solids = this.physics.add.staticGroup();
    this.spawnNodes(solids);
    this.physics.add.collider(this.player, solids);

    // Left-click interacts with whatever is hovered and in reach. Suppressed
    // while a menu is open, or when the click lands on a fixed HUD element
    // (hotbar / event log) so a click there doesn't also hit the world behind.
    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
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
      if (pointer.leftButtonDown() && !this.anyMenuOpen() && !this.pointerOverHud(pointer)) {
        this.tryInteract();
      }
    });

    // Right-click quick-moves items between backpack and hotbar, so suppress
    // the browser context menu on the canvas.
    this.input.mouse!.disableContextMenu();

    this.createHud();
    this.createCraftingMenu();
    this.createInventoryMenu();
    this.hotbarUI = new HotbarUI(this, this.hotbar, {
      beginDrag: (c, i, p) => this.beginItemDrag(c, i, p),
      quickMove: (c, i) => this.quickMoveItem(c, i),
      isDragging: () => this.dragSource !== null,
    });
    this.eventLogUI = new EventLogUI(this, this.eventLog);

    // Scene-level drag: a slot starts it, the pointer drags a ghost icon, and
    // release resolves the move against whichever container is under the
    // pointer (backpack grid or hotbar).
    this.input.on("pointermove", (p: Phaser.Input.Pointer) => {
      if (this.dragGhost) this.dragGhost.setPosition(p.x, p.y);
    });
    this.input.on("pointerup", (p: Phaser.Input.Pointer) => this.resolveItemDrag(p));

    // Mouse wheel cycles the hotbar selection (looping), unless the pointer is
    // over the event log (which scrolls its own history).
    this.input.on("wheel", (p: Phaser.Input.Pointer, _o: unknown, _dx: number, dy: number) => {
      if (this.eventLogUI.isPointerOver(p)) return;
      this.cycleHotbar(dy > 0 ? 1 : -1);
    });

    // Tab is captured so the browser doesn't shift focus off the canvas.
    this.input.keyboard!.addCapture("TAB");
    this.input.keyboard!.on("keydown-TAB", () => {
      if (this.placementMode) return this.cancelPlacement();
      this.craftingMenu.close();
      this.inventoryMenu.toggle();
    });
    this.input.keyboard!.on("keydown-T", () => {
      if (this.placementMode) return this.cancelPlacement();
      this.inventoryMenu.close();
      this.craftingMenu.toggle();
    });
    this.input.keyboard!.on("keydown-ESC", () => {
      if (this.placementMode) return this.cancelPlacement();
      this.craftingMenu.close();
      this.inventoryMenu.close();
    });
    HOTBAR_KEYS.forEach((key, i) => {
      this.input.keyboard!.on(`keydown-${key}`, () => this.selectHotbarSlot(i));
    });

    // Seed recipe discovery (no-op at a fresh start, but keeps state correct
    // if the initial inventory ever changes).
    this.refreshDiscovery();
  }

  update(): void {
    this.player.update();
    if (this.placementMode) this.updatePlacementGhost();
    else if (!this.anyMenuOpen()) this.updateHover();
  }

  private anyMenuOpen(): boolean {
    return this.craftingMenu.isOpen() || this.inventoryMenu.isOpen();
  }

  private selectHotbarSlot(slot: number): void {
    this.hotbar.select(slot);
    this.recomputeEquipped();
  }

  private cycleHotbar(dir: number): void {
    const next = (this.hotbar.selected() + dir + this.hotbar.size) % this.hotbar.size;
    this.hotbar.select(next);
    this.recomputeEquipped();
  }

  // The equipped tool is whatever tool sits in the selected hotbar slot.
  private recomputeEquipped(): void {
    const stack = this.hotbar.get(this.hotbar.selected());
    this.equippedTool = (stack && itemDef(stack.key)?.tool) || null;
    this.hotbarUI.refresh();
    this.refreshHud();
  }

  // True when a screen point lands on a fixed HUD element that should swallow
  // the click rather than pass it through to the world.
  private pointerOverHud(pointer: Phaser.Input.Pointer): boolean {
    return (
      this.hotbarUI.slotAt(pointer.x, pointer.y) !== null ||
      this.eventLogUI.isPointerOver(pointer)
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

    // Prefer a hotbar slot under the pointer, else a backpack slot.
    const hotIndex = this.hotbarUI.slotAt(pointer.x, pointer.y);
    if (hotIndex !== null) {
      if (!itemDef(stack.key)?.hotbarable) return; // reject; snaps back
      moveSlot(src.container, src.index, this.hotbar.container, hotIndex);
    } else {
      const bagIndex = this.inventoryMenu.slotIndexAt(pointer.x, pointer.y);
      if (bagIndex === null) return; // dropped on nothing; snaps back
      moveSlot(src.container, src.index, this.backpack, bagIndex);
    }

    this.afterItemMove();
  }

  // Right-click: move backpack->hotbar (if hotbar-able) or hotbar->backpack.
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
  }

  // Scatter resources around the world, keeping a clear area around the start.
  private spawnNodes(solids: Phaser.Physics.Arcade.StaticGroup): void {
    const rng = new Phaser.Math.RandomDataGenerator(["explore-and-gather"]);

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
      },
    ) => {
      for (let i = 0; i < count; i++) {
        const x = rng.between(60, WORLD_W - 60);
        const y = rng.between(60, WORLD_H - 60);
        if (Phaser.Math.Distance.Between(x, y, WORLD_W / 2, WORLD_H / 2) < 100) continue;
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
      }
    };

    // Free pickups. Branches are "loose" (future magnet); rocks are NOT loose
    // until picked, so they'll always need a manual pickup.
    scatter(18, { texture: "branch", resource: "wood", amount: 1, action: "pickup", displayName: "Branch", loose: true, solid: false, health: 1 });
    scatter(14, { texture: "rock", resource: "stone", amount: 1, action: "pickup", displayName: "Rock", loose: false, solid: false, health: 1 });
    // Tool-gated: chop trees (needs an axe out), mine boulders (needs a pickaxe out).
    scatter(10, { texture: "tree", resource: "wood", amount: 5, action: "chop", displayName: "Tree", loose: false, solid: true, health: 3 });
    scatter(8, { texture: "boulder", resource: "stone", amount: 5, action: "mine", displayName: "Boulder", loose: false, solid: true, health: 3 });
  }

  // Each frame: find which node the mouse is over (in world space) and update
  // the bottom-right prompt + cursor.
  private updateHover(): void {
    const pointer = this.input.activePointer;
    const world = this.cameras.main.getWorldPoint(pointer.x, pointer.y);

    let hovered: ResourceNode | null = null;
    let best = Infinity;
    for (const node of this.nodes) {
      if (node.depleted) continue;
      const radius = Math.max(node.displayWidth, node.displayHeight) / 2 + 6;
      const d = Phaser.Math.Distance.Between(world.x, world.y, node.x, node.y);
      if (d <= radius && d < best) {
        hovered = node;
        best = d;
      }
    }
    this.hoveredNode = hovered;

    const prompt = hovered ? this.promptFor(hovered) : null;
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

  // Left-click action on the currently hovered, in-reach node.
  private tryInteract(): void {
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
      this.lastToolHitAt = this.time.now;

      this.player.playSwing();
      const depleted = node.takeHit(toolDamage(this.equippedTool));
      if (!depleted) return; // node survives the hit; stays interactable
    }

    this.addToBackpack(node.resource, node.amount);
    node.deplete();
    this.nodes = this.nodes.filter((n) => n !== node);
    this.hoveredNode = null;
    this.promptText.setVisible(false);
    this.refreshHud();
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
  // any resource pickup or skill level-up.
  private refreshDiscovery(): void {
    const unlocked = this.crafting.refresh(this.discovered, this.skills);
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
      isOwned: (recipe) => this.backpack.count(outputKey(recipe)) > 0,
      craft: (recipe) => this.craftRecipe(recipe),
      startPlacement: (recipe) => this.startPlacement(recipe),
    });
  }

  private craftRecipe(recipe: Recipe): void {
    const key = outputKey(recipe);
    // Check affordability AND room before deducting, so a full backpack can't
    // eat the resources (the bug this replaces). Then create the item — a 2nd
    // tool now makes a new stack instead of a silent no-op.
    if (!this.crafting.canAfford(recipe, this.backpack)) return;
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
    if (!this.crafting.canAfford(recipe, this.backpack)) {
      const name = itemDef(outputKey(recipe))?.name ?? "item";
      this.eventLog.add("info", `Out of materials for ${name}`);
      this.cancelPlacement();
      return;
    }
    this.crafting.craft(recipe, this.backpack);
    const pos = this.clampedPlacementPoint();
    const texture = itemDef(outputKey(recipe))?.texture;
    this.placedObjects.push(this.add.image(pos.x, pos.y, texture ?? ""));
    this.refreshHud();
    this.inventoryMenu.refresh();
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

    // Top-left static controls reminder.
    this.add
      .text(
        12,
        10,
        "Move: WASD / Arrows     Interact: Left Click     Craft: T     Inventory: Tab",
        {
          fontFamily: "monospace",
          fontSize: "14px",
          color: "#c8d0dc",
        },
      )
      .setScrollFactor(0)
      .setDepth(1000);

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
}
