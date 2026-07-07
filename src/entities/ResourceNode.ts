import Phaser from "phaser";

// A specific craftable tool (tiers can grow later, e.g. iron_axe).
export type ToolType = "stone_axe" | "stone_pickaxe";
// The category of a tool. Choppable objects need an "axe"; mineable need a "pickaxe".
export type ToolKind = "axe" | "pickaxe";
// How the player interacts with a node. Drives the hover prompt verb.
export type NodeAction = "pickup" | "chop" | "mine";

// Which tool kind a given action needs (pickups need none).
export function requiredKind(action: NodeAction): ToolKind | null {
  if (action === "chop") return "axe";
  if (action === "mine") return "pickaxe";
  return null;
}

// The category a specific tool belongs to.
export function toolKind(tool: ToolType): ToolKind {
  return tool === "stone_axe" ? "axe" : "pickaxe";
}

// Damage a tool deals per hit. Future higher tiers (e.g. iron_axe) return a
// bigger number and fell nodes in fewer hits — node data doesn't need to change.
const TOOL_DAMAGE: Record<ToolType, number> = {
  stone_axe: 1,
  stone_pickaxe: 1,
};
export function toolDamage(tool: ToolType): number {
  return TOOL_DAMAGE[tool];
}

// Minimum time between successful hits with a tool, in ms (caps chop/mine
// rate so holding/spamming LMB can't out-farm the swing itself). Future
// tiers can return a smaller number for a faster swing.
const TOOL_COOLDOWN_MS: Record<ToolType, number> = {
  stone_axe: 500,
  stone_pickaxe: 500,
};
export function toolCooldownMs(tool: ToolType): number {
  return TOOL_COOLDOWN_MS[tool];
}

// Stamina spent per successful swing with a tool (chop/mine only — pickups
// are free). Future tiers can return a smaller number for a more "efficient"
// tool.
const TOOL_STAMINA_COST: Record<ToolType, number> = {
  stone_axe: 12,
  stone_pickaxe: 12,
};
export function toolStaminaCost(tool: ToolType): number {
  return TOOL_STAMINA_COST[tool];
}

export interface ResourceNodeConfig {
  x: number;
  y: number;
  texture: string;
  // The item key this node yields (a ResourceType for gatherables, but also
  // any arbitrary ItemDef key for player-dropped/destroyed-station pickups —
  // see MainScene.dropStackToWorld/destroyPlacedObject). Kept as a plain
  // string rather than ResourceType so this node can carry tools/weapons/
  // placeables too, not just raw resources.
  resource: string;
  amount: number;
  action: NodeAction;
  displayName: string; // shown in the "[LMB] Pick up <name>" prompt
  // Whether this is a "loose" object eligible for magnet auto-pickup. Only
  // pieces spawned from a depleted tree/boulder are loose; pre-placed
  // branches/rocks are always manual-click.
  loose: boolean;
  // Hits to deplete at damage 1 (chop/mine only; pickups go through
  // deplete() directly and never call takeHit, so this is unused for them).
  health: number;
  // Marks a piece spawned by spawnLooseDrop's "explode" (as opposed to a
  // pre-placed branch/rock). Consolidation and the magnet only ever touch
  // drop pieces.
  isDrop?: boolean;
  // this.time.now threshold before which the magnet won't pull this piece in
  // (manual click-pickup is unaffected). Used for player-dropped items and
  // destroyed-placeable pickups so they don't instantly fly back into the
  // inventory that just released them. Defaults to 0 (immediately eligible),
  // matching every existing drop source's behavior.
  magnetReadyAt?: number;
}

// A single interactable object in the world (branch, rock, tree, boulder, or
// a loose drop piece exploded out of a depleted tree/boulder).
export class ResourceNode extends Phaser.GameObjects.Sprite {
  readonly resource: string;
  amount: number;
  readonly action: NodeAction;
  readonly displayName: string;
  readonly loose: boolean;
  readonly isDrop: boolean;
  readonly maxHealth: number;
  health: number;
  depleted = false;
  readonly magnetReadyAt: number;
  // True while a drop piece's spawn-scatter tween is still running — the
  // magnet loop skips it so it isn't fighting the scatter tween over x/y.
  exploding = false;
  private countLabel: Phaser.GameObjects.Text | null = null;

  constructor(scene: Phaser.Scene, cfg: ResourceNodeConfig) {
    super(scene, cfg.x, cfg.y, cfg.texture);
    this.resource = cfg.resource;
    this.amount = cfg.amount;
    this.action = cfg.action;
    this.displayName = cfg.displayName;
    this.loose = cfg.loose;
    this.isDrop = cfg.isDrop ?? false;
    this.maxHealth = cfg.health;
    this.health = cfg.health;
    this.magnetReadyAt = cfg.magnetReadyAt ?? 0;
    scene.add.existing(this);
    // Trees/boulders are tall enough to visually occlude the player/enemies
    // walking past them, so they're Y-sorted against them (see
    // MainScene.updateTreeOcclusion for the fade-when-occluding companion
    // behavior). Ground clutter (pickups, loose drop pieces) stays at the
    // default depth (0) — always below player/enemies, same as before.
    if (this.action !== "pickup") this.setDepth(cfg.y);
  }

  // Updates the stack amount and keeps the count label (shown only when
  // amount > 1) in sync.
  setAmount(n: number): void {
    this.amount = n;
    if (this.amount > 1) {
      if (!this.countLabel) {
        this.countLabel = this.scene.add
          .text(this.x, this.y + this.displayHeight / 2 + 2, "", {
            fontFamily: "monospace",
            fontSize: "10px",
            color: "#ffffff",
            stroke: "#000000",
            strokeThickness: 3,
          })
          .setOrigin(0.5, 0);
      }
      this.countLabel.setText(`x${this.amount}`);
    } else {
      this.countLabel?.destroy();
      this.countLabel = null;
    }
  }

  // Slow, small vertical bob loop so a loose piece reads as "interactable
  // clutter" at a glance. Only used for drop pieces once they finish
  // exploding — pre-placed branches/rocks stay fully static.
  startBob(): void {
    const baseY = this.y;
    this.scene.tweens.add({
      targets: this,
      y: baseY - 3,
      duration: 1100,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
  }

  // Applies damage from a chop/mine hit. Plays shake+decay feedback either
  // way. Returns true once health reaches 0, telling the caller to award the
  // resource and deplete() — the node itself doesn't award anything.
  takeHit(damage: number): boolean {
    this.health = Math.max(0, this.health - damage);
    this.playHitFeedback();
    return this.health <= 0;
  }

  private playHitFeedback(): void {
    this.scene.tweens.killTweensOf(this);
    const baseX = this.x;
    this.scene.tweens.add({
      targets: this,
      x: baseX + 4,
      duration: 60,
      yoyo: true,
      repeat: 1,
      ease: "Sine.easeInOut",
      onComplete: () => {
        this.x = baseX;
      },
    });

    const frac = this.health / this.maxHealth; // 1 = healthy, 0 = about to break
    const shade = Phaser.Display.Color.Interpolate.ColorWithColor(
      new Phaser.Display.Color(255, 255, 255),
      new Phaser.Display.Color(90, 70, 60),
      100,
      Math.round((1 - frac) * 100)
    );
    this.setTint(Phaser.Display.Color.GetColor(shade.r, shade.g, shade.b));
  }

  // Keeps the count label glued to the sprite through explosion scatter,
  // magnet pull, and bob tweens, all of which move x/y directly.
  preUpdate(time: number, delta: number): void {
    super.preUpdate(time, delta);
    this.countLabel?.setPosition(this.x, this.y + this.displayHeight / 2 + 2);
  }

  // Trees/boulders spawn loose drop pieces instead (see MainScene.spawnLooseDrop);
  // this just removes the node itself once harvested/collected. Killing our
  // own tweens first matters for drop pieces: startBob()'s repeat:-1 tween
  // never completes on its own, so without this it keeps animating a
  // destroyed sprite forever (e.g. a piece merged away by consolidateDrop,
  // or clicked mid-explosion) — a leaked tween per piece that piles up over
  // a play session and drags the frame rate down.
  deplete(): void {
    this.depleted = true;
    this.scene.tweens.killTweensOf(this);
    this.countLabel?.destroy();
    this.destroy();
  }
}
