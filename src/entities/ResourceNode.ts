import Phaser from "phaser";
import { ysortDepth } from "../systems/depth";
import { variantAt } from "../art/variants";
import { artScale, placeholderDims, scaleToLongest } from "../art/overrides";

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
  // Per-instance upgrade tier carried from a destroyed placed station, so its
  // tier survives into the inventory stack when picked back up. Undefined for
  // ordinary drops.
  tier?: number;
  // The applied station-upgrade ids carried alongside `tier` from a destroyed
  // placed station (see ItemStack.upgrades), so the applied set survives the
  // pickup. Undefined for ordinary drops.
  upgrades?: string[];
  // When true, harvesting this (pickup-only) node yields its resource but
  // leaves the sprite in the world instead of destroying it — swaps to
  // pickedTexture and, if regrowMs is set, reverts back to harvestable after
  // that many ms. First used by Blackberry bushes (Milestone N).
  persistent?: boolean;
  pickedTexture?: string;
  regrowMs?: number;
  // When true, this node is inert/un-mineable until crack() is called (the
  // Gloaming Vein's ore, sealed until its guardian dies). Shielded nodes are
  // skipped by hover/prompt/interact, same as `harvested`.
  shielded?: boolean;
  // Minimum equipped-tool upgrade tier needed to actually fell this node. The
  // hover prompt still shows the verb with any correct-KIND tool (per the
  // prompt-gating design — never reveal the tier), but the chop/mine silently
  // fails until the equipped tool reaches this tier. First used by the badlands
  // Ironbark tree (needs an upgraded axe). Defaults to 0 (any tier works).
  minToolTier?: number;
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
  readonly tier?: number;
  readonly upgrades?: string[];
  readonly persistent: boolean;
  readonly pickedTexture?: string;
  readonly regrowMs?: number;
  readonly minToolTier: number;
  // Inert until crack()ed (Gloaming Vein ore). Not readonly — the guardian's
  // death flips it to false.
  shielded: boolean;
  private readonly freshTexture: string;
  // True once a persistent node has been harvested but hasn't regrown yet —
  // still exists in the world, but not interactable/hoverable.
  harvested = false;
  // True while a drop piece's spawn-scatter tween is still running — the
  // magnet loop skips it so it isn't fighting the scatter tween over x/y.
  exploding = false;
  private countLabel: Phaser.GameObjects.Text | null = null;
  // Persistent pulsing halo, used by crack() so a mineable Gloaming Vein
  // node is obvious at a glance (playtest: players consistently missed
  // that it could be mined once cracked open).
  private glowImage: Phaser.GameObjects.Image | null = null;
  // Gatherable crops are sized off their OWN placeholder rather than one flat
  // cap: the placeholders already encode a hierarchy (a berry bush was drawn
  // bigger than a mushroom) that a single number flattens. The modest growth
  // keeps the richer real art feeling bigger without letting a herb rival a
  // tree, and the ceiling stops anything tall running away with it.
  private static readonly CROP_GROWTH = 1.15;
  private static readonly CROP_MAX_PX = 30;

  constructor(scene: Phaser.Scene, cfg: ResourceNodeConfig) {
    // Resolved here rather than at the ~20 spawn sites so a new `<key>_v2` PNG
    // varies every node of that kind at once. A "picked" look must follow the
    // variant that was actually chosen, falling back to the shared one.
    const texture = variantAt(scene, cfg.texture, cfg.x, cfg.y);
    const pickedTexture =
      cfg.pickedTexture && texture !== cfg.texture && scene.textures.exists(`${texture}_picked`)
        ? `${texture}_picked`
        : cfg.pickedTexture;

    super(scene, cfg.x, cfg.y, texture);
    this.action = cfg.action;
    this.applyArtScale(texture);
    this.resource = cfg.resource;
    this.amount = cfg.amount;
    this.displayName = cfg.displayName;
    this.loose = cfg.loose;
    this.isDrop = cfg.isDrop ?? false;
    this.maxHealth = cfg.health;
    this.health = cfg.health;
    this.magnetReadyAt = cfg.magnetReadyAt ?? 0;
    this.tier = cfg.tier;
    this.upgrades = cfg.upgrades;
    this.persistent = cfg.persistent ?? false;
    this.pickedTexture = pickedTexture;
    this.regrowMs = cfg.regrowMs;
    this.minToolTier = cfg.minToolTier ?? 0;
    this.shielded = cfg.shielded ?? false;
    this.freshTexture = texture;
    scene.add.existing(this);
    // Trees/boulders are tall enough to visually occlude the player/enemies
    // walking past them, so they're Y-sorted against them (see
    // MainScene.updateTreeOcclusion for the fade-when-occluding companion
    // behavior). Ground clutter (pickups, loose drop pieces) stays at the
    // default depth (0) — always below player/enemies, same as before.
    if (this.action !== "pickup") this.setDepth(ysortDepth(cfg.y));
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
    // A Gloaming Vein node's glow (startGlow) only ever exists while it's
    // still mineable — cleaning it up here means it stops the moment this
    // specific node is fully mined out, without any separate "is it mined"
    // check elsewhere (the user: "vein should only glow if not mined").
    if (this.glowImage) {
      this.scene.tweens.killTweensOf(this.glowImage);
      this.glowImage.destroy();
      this.glowImage = null;
    }
    this.destroy();
  }

  // Persistent-node harvest (Blackberry bushes): yields the resource but
  // keeps the sprite alive — swaps to the "picked" look and, if regrowMs is
  // set, schedules a revert back to harvestable. Never called on non-
  // persistent nodes (those go through takeHit/deplete instead).
  harvest(): void {
    this.harvested = true;
    if (this.pickedTexture) this.swapTexture(this.pickedTexture);
    if (this.regrowMs !== undefined) {
      this.scene.time.delayedCall(this.regrowMs, () => this.regrow());
    }
  }

  // Every runtime texture swap goes through here: real art and its placeholder
  // are different sizes, so a raw setTexture() would drop back to unscaled and
  // the node would visibly jump size mid-harvest.
  private swapTexture(key: string): void {
    this.setTexture(key);
    this.applyArtScale(key);
  }

  // The world has a size hierarchy: a tree or a boulder should read as bigger
  // than the herbs and berries growing around it. Real art arrives on a canvas
  // that ignores that, so a picked mushroom came back taller than the player.
  //
  // `action` is the signal, not the texture name — "pickup" IS the set of
  // things you bend down to gather, so chop/mine nodes (trees, boulders, ore)
  // stay at full size and every future crop inherits the cap for free.
  private applyArtScale(key: string): void {
    const was = this.action === "pickup" ? placeholderDims(key) : undefined;
    if (!was) {
      this.setScale(artScale(this.scene, key));
      return;
    }
    const target = Math.min(
      Math.max(was.w, was.h) * ResourceNode.CROP_GROWTH,
      ResourceNode.CROP_MAX_PX,
    );
    this.setScale(scaleToLongest(this.scene, key, target));
  }

  private regrow(): void {
    if (this.depleted) return; // node was destroyed while waiting to regrow
    this.harvested = false;
    this.swapTexture(this.freshTexture);
  }

  // Break the seal on a shielded (Gloaming Vein) node — swaps to its mineable
  // texture, makes it interactable, and starts a constant pulsing glow so
  // it's obviously mineable (playtest: it was easy to miss). Called when the
  // vein's guardian dies.
  crack(mineableTexture: string): void {
    if (!this.shielded) return;
    this.shielded = false;
    this.swapTexture(mineableTexture);
    this.startGlow(0xb266ff);
  }

  // Reuses the light_soft gradient (same additive-glow idiom as the Gloam
  // Shard drop pop and the vein/torch night lighting) as a constant,
  // day-and-night pulsing halo — not just a night-only light point. Same
  // scale as GremlinShack's chest glow (0.14-0.2) — an earlier, bigger pass
  // read as "huge" (the user), and this should match that fix 1:1.
  private startGlow(tint: number): void {
    if (this.glowImage) return;
    const glow = this.scene.add
      .image(this.x, this.y, "light_soft")
      .setTint(tint)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setScale(0.14)
      .setAlpha(0.4)
      .setDepth(this.depth - 1);
    this.glowImage = glow;
    this.scene.tweens.add({
      targets: glow,
      alpha: 0.8,
      scale: 0.2,
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
  }
}
