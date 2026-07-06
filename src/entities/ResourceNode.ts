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
}

// A single interactable object in the world (branch, rock, tree, boulder).
export class ResourceNode extends Phaser.GameObjects.Sprite {
  readonly resource: ResourceType;
  readonly amount: number;
  readonly action: NodeAction;
  readonly displayName: string;
  readonly loose: boolean;
  depleted = false;

  constructor(scene: Phaser.Scene, cfg: ResourceNodeConfig) {
    super(scene, cfg.x, cfg.y, cfg.texture);
    this.resource = cfg.resource;
    this.amount = cfg.amount;
    this.action = cfg.action;
    this.displayName = cfg.displayName;
    this.loose = cfg.loose;
    scene.add.existing(this);
  }

  // For M1 we simply remove the node when harvested. Later, chopping/mining
  // will instead spawn loose drops on the ground (see roadmap).
  deplete(): void {
    this.depleted = true;
    this.destroy();
  }
}
