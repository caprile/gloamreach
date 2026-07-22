import Phaser from "phaser";
import type { Enemy } from "./Enemy";
import { LootContainer } from "../systems/LootContainer";
import { ysortDepth } from "../systems/depth";

// A Drowned Lodge — the second bayou surface POI (biome 3 Phase 4d).
//
// The counterpart to the Sunken Shrine: where the Shrine is a scripted rite the
// player triggers, the Lodge has no script at all. It is a half-submerged stilt
// village, and its danger is the GEOGRAPHY — a narrow boardwalk over deep gloam
// channel, Corpselight haunts drifting above it, and Mirejaws in the water
// underneath. Stepping off the planks drops you into the 0.5x deep-water slow
// (Phase 4a) with the swamp's signature ambusher already there, which makes 4a's
// water rules and 4b's roster the content rather than a new mechanic.
//
// The payoff is SPREAD: every hut holds its own small cache, so you work the
// site instead of opening one chest. One hut is the chieftain's — planked shut
// until the site's haunts are dead, holding the richest cache.
//
// Plain data class like BadlandsDen: it owns its GameObjects, while MainScene
// owns the residents, the hover/interact branches and the respawn timer.
export const LODGE_HUT_CACHE_SIZE = 4;
export const LODGE_CHIEF_CACHE_SIZE = 6;

export interface LodgeHut {
  image: Phaser.GameObjects.Image;
  glow: Phaser.GameObjects.Image;
  loot: LootContainer;
  chief: boolean;
}

export class DrownedLodge {
  private readonly scene: Phaser.Scene;
  readonly x: number;
  readonly y: number;
  readonly huts: LodgeHut[] = [];
  // The site's Corpselights. While any is alive the chieftain's hut stays
  // barred — hover/prompt/interact skip it entirely (the same reveal-nothing
  // treatment a shielded ResourceNode gets), so the bar is the only tell.
  haunts: Enemy[] = [];
  // Mirejaws lurking under the boardwalk. Tracked so a respawn can restock them
  // and so the scene can clean them up; they gate nothing.
  lurkers: Enemy[] = [];
  discoveredOnMap = false;
  // S4 POI respawn: armed by the scene once every cache here is emptied.
  respawnAt: number | null = null;

  constructor(scene: Phaser.Scene, cfg: { x: number; y: number }) {
    this.scene = scene;
    this.x = cfg.x;
    this.y = cfg.y;
  }

  // Called by MainScene as it lays the village out. The chieftain's hut starts
  // barred; addHut is the only place a hut's texture and cache size are tied
  // together, so the two can't drift.
  addHut(x: number, y: number, chief: boolean): LodgeHut {
    const image = this.scene.add
      .image(x, y, chief ? "lodge_hut_barred" : "lodge_hut")
      .setDepth(ysortDepth(y));
    const glow = this.scene.add
      .image(x, y + 4, "light_soft")
      .setTint(chief ? 0xffcf6a : 0xd8b48a)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setScale(0.12)
      .setAlpha(0.35)
      .setDepth(image.depth - 1)
      .setVisible(false);
    this.scene.tweens.add({
      targets: glow,
      alpha: 0.7,
      scale: 0.18,
      duration: 950,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
    const hut: LodgeHut = {
      image,
      glow,
      loot: new LootContainer(chief ? LODGE_CHIEF_CACHE_SIZE : LODGE_HUT_CACHE_SIZE),
      chief,
    };
    this.huts.push(hut);
    return hut;
  }

  // True once every haunt at this site is dead — the chieftain's hut unbars.
  get chiefUnbarred(): boolean {
    return this.haunts.every((h) => h.depleted);
  }

  // Swap the chieftain hut's texture the moment it unbars. Polled by the scene
  // (with syncGlow) rather than pushed from the kill path, so it can't be
  // missed by a haunt that died to a DoT tick or a stray AOE.
  syncGlow(): void {
    const unbarred = this.chiefUnbarred;
    for (const hut of this.huts) {
      if (hut.chief) {
        const want = unbarred ? "lodge_hut" : "lodge_hut_barred";
        if (hut.image.texture.key !== want) hut.image.setTexture(want);
        hut.glow.setVisible(unbarred && !hut.loot.isEmpty());
      } else {
        hut.glow.setVisible(!hut.loot.isEmpty());
      }
    }
  }

  // Every cache emptied — the site is spent and the scene can arm its respawn.
  get fullyLooted(): boolean {
    return this.chiefUnbarred && this.huts.every((h) => h.loot.isEmpty());
  }

  // S4 respawn: re-arm every cache and re-bar the chieftain's hut. The scene
  // re-spawns the residents separately (mirrors BadlandsDen.reset).
  reset(): void {
    this.respawnAt = null;
    this.haunts = [];
    this.lurkers = [];
    for (const hut of this.huts) {
      hut.loot.rearmIfEmpty();
      if (hut.chief) hut.image.setTexture("lodge_hut_barred");
    }
  }
}
