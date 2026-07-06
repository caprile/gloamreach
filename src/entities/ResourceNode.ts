import Phaser from "phaser";
import type { ResourceType } from "../systems/Inventory";

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

export interface ResourceNodeConfig {
  x: number;
  y: number;
  texture: string;
  resource: ResourceType;
  amount: number;
  action: NodeAction;
  displayName: string; // shown in the "[LMB] Pick up <name>" prompt
  // Whether this is a "loose" object eligible for the future magnet
  // auto-pickup. Branches are loose; rocks are not loose until picked.
  loose: boolean;
  // Hits to deplete at damage 1 (chop/mine only; pickups go through
  // deplete() directly and never call takeHit, so this is unused for them).
  health: number;
}

// A single interactable object in the world (branch, rock, tree, boulder).
export class ResourceNode extends Phaser.GameObjects.Sprite {
  readonly resource: ResourceType;
  readonly amount: number;
  readonly action: NodeAction;
  readonly displayName: string;
  readonly loose: boolean;
  readonly maxHealth: number;
  health: number;
  depleted = false;

  constructor(scene: Phaser.Scene, cfg: ResourceNodeConfig) {
    super(scene, cfg.x, cfg.y, cfg.texture);
    this.resource = cfg.resource;
    this.amount = cfg.amount;
    this.action = cfg.action;
    this.displayName = cfg.displayName;
    this.loose = cfg.loose;
    this.maxHealth = cfg.health;
    this.health = cfg.health;
    scene.add.existing(this);
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

  // For M1 we simply remove the node when harvested. Later, chopping/mining
  // will instead spawn loose drops on the ground (see roadmap).
  deplete(): void {
    this.depleted = true;
    this.destroy();
  }
}
