import Phaser from "phaser";
import {
  RARITY_COLOR,
  RELIC_DEFS,
  rarityHex,
  rarityIcon,
  rarityName,
  type RelicRarity,
  type RollResult,
} from "../systems/Relics";
import type { SfxPlayer } from "../systems/Sfx";

// Depths sit above the forge menu's own (3000/3001/3002/3010) so the reveal
// always draws on top of the panel content.
const D_SCRIM = 3004;
const D_FLASH = 3005;
const D_GLOW = 3006;
const D_BAR = 3006;
const D_GEM = 3008;
const D_SHARD = 3009;
const D_BANNER = 3010;

const SPIN_MS = 1400;
const SPIN_BAR_W = 300;
const SPIN_BAR_H = 14;

// Per-rarity payoff intensity — escalation is data, not branching. Common is a
// modest "nice" pop; rare/mythic pile on flash + shards + banner (+ a subtle
// camera kick) for the "gamba" moment.
interface RevealCfg {
  punch: number; // gem overshoot scale
  glowScale: number;
  glowAlpha: number;
  flashAlpha: number; // 0 = no panel flash
  shards: number;
  shakeIntensity: number; // 0 = no shake
  banner: boolean;
}
const REVEAL_CFG: Record<RelicRarity, RevealCfg> = {
  common: { punch: 1.3, glowScale: 2.0, glowAlpha: 0.5, flashAlpha: 0, shards: 0, shakeIntensity: 0, banner: false },
  uncommon: { punch: 1.45, glowScale: 3.0, glowAlpha: 0.7, flashAlpha: 0.28, shards: 6, shakeIntensity: 0, banner: true },
  rare: { punch: 1.6, glowScale: 4.4, glowAlpha: 0.85, flashAlpha: 0.34, shards: 9, shakeIntensity: 0.004, banner: true },
  mythic: { punch: 1.75, glowScale: 5.6, glowAlpha: 0.95, flashAlpha: 0.4, shards: 13, shakeIntensity: 0.006, banner: true },
};

// The Relic Forge's slot-machine reveal (owned by RelicForgeMenu). A spin bar
// decelerates (Quart.easeOut) while a "reel" gem rapid-swaps rarity icons and
// slows down, then lands on a rarity-scaled payoff. The roll RESULT is already
// resolved by the caller before spin() — this is pure theater over a known
// outcome (like a real slot machine), so an interrupted spin never changes what
// was won.
export class RelicRevealFx {
  private scene: Phaser.Scene;
  private objects: Phaser.GameObjects.GameObject[] = [];
  private tweens: Phaser.Tweens.Tween[] = [];
  private reelGem?: Phaser.GameObjects.Image;
  private lastSwapAt = 0;
  private active = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  isActive(): boolean {
    return this.active;
  }

  // The owning scene IS the MainScene, which holds the SfxPlayer. Read it
  // structurally so S5's forge cues stay contained to Sfx.ts + this file (no
  // MainScene edit, no extra dep threading); no-ops safely if unavailable.
  private sfx(): SfxPlayer | undefined {
    return (this.scene as unknown as { sfx?: SfxPlayer }).sfx;
  }

  private playRevealCue(rarity: RelicRarity): void {
    const s = this.sfx();
    if (!s) return;
    if (rarity === "common") s.relicCommon();
    else if (rarity === "uncommon") s.relicUncommon();
    else if (rarity === "rare") s.relicRare();
    else s.relicMythic();
  }

  // Spin over a panel, then reveal `result` (null / !success = a "crumbled"
  // fizzle). Calls onComplete once the whole reveal finishes (or immediately if
  // stopped early).
  spin(bounds: { x: number; y: number; w: number; h: number }, result: RollResult | null, onComplete: () => void): void {
    this.stop();
    this.active = true;

    const cx = bounds.x + bounds.w / 2;
    const gemY = bounds.y + bounds.h * 0.42;
    const barY = gemY + 44;

    // Full-panel scrim: dims the busy grid behind the reel AND eats clicks so no
    // button can be pressed mid-spin.
    const scrim = this.scene.add
      .rectangle(bounds.x, bounds.y, bounds.w, bounds.h, 0x05070b, 0.55)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(D_SCRIM)
      .setInteractive();
    this.objects.push(scrim);

    this.addText(cx, bounds.y + 18, "Forging…", 14, "#c9a86a", D_BANNER, 0.5);

    // Reel gem — starts on a random rarity icon, swapped during the spin.
    this.reelGem = this.scene.add
      .image(cx, gemY, rarityIcon("common"))
      .setScrollFactor(0)
      .setDepth(D_GEM)
      .setScale(1.8);
    this.objects.push(this.reelGem);

    // Spin bar background + fill.
    const barX = cx - SPIN_BAR_W / 2;
    const barBg = this.scene.add
      .rectangle(barX, barY, SPIN_BAR_W, SPIN_BAR_H, 0x14181f, 0.98)
      .setOrigin(0, 0)
      .setStrokeStyle(1, 0x3a4250)
      .setScrollFactor(0)
      .setDepth(D_BAR);
    const barFill = this.scene.add
      .rectangle(barX + 1, barY + 1, SPIN_BAR_W - 2, SPIN_BAR_H - 2, 0xc9a86a, 1)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(D_BAR + 1);
    barFill.scaleX = 0;
    this.objects.push(barBg, barFill);

    this.lastSwapAt = this.scene.time.now;
    const proxy = { v: 0 };
    const t = this.scene.tweens.add({
      targets: proxy,
      v: 1,
      duration: SPIN_MS,
      ease: "Quart.easeOut",
      onUpdate: () => {
        barFill.scaleX = proxy.v;
        this.tickReel(proxy.v);
      },
      onComplete: () => this.reveal(bounds, cx, gemY, result, onComplete),
    });
    this.tweens.push(t);
  }

  // Swap the reel gem to a random rarity icon on a cadence that slows as the
  // spin nears the end (the "wheel decelerating" feel).
  private tickReel(frac: number): void {
    const now = this.scene.time.now;
    const interval = Phaser.Math.Linear(45, 230, frac); // ms between swaps
    if (now - this.lastSwapAt < interval) return;
    this.lastSwapAt = now;
    const rarities: RelicRarity[] = ["common", "uncommon", "rare", "mythic"];
    const r = rarities[Math.floor(this.scene.time.now / 97) % rarities.length];
    this.reelGem?.setTexture(rarityIcon(r));
    this.sfx()?.relicReelTick();
  }

  private reveal(
    bounds: { x: number; y: number; w: number; h: number },
    cx: number,
    gemY: number,
    result: RollResult | null,
    onComplete: () => void,
  ): void {
    // Phase 5: a boss-trophy roll lands with CANDIDATES instead of a single id
    // (the player picks after the spin) — that is still a win, so it must play
    // the rarity fanfare rather than the crumble fizzle.
    const success = !!result?.success && (!!result.id || !!result.candidates?.length);

    if (!success) {
      // Fizzle — grey crumble, subdued. The contrast makes wins feel better.
      this.sfx()?.relicCrumble();
      this.reelGem?.setTexture(rarityIcon("common")).setTint(0x6b7280);
      this.addText(cx, gemY + 70, "Crumbled to dust…", 13, "#c8a05a", D_BANNER, 0.5);
      const g = this.reelGem;
      if (g) {
        const t = this.scene.tweens.add({
          targets: g,
          scale: 1.0,
          alpha: 0.2,
          duration: 420,
          ease: "Sine.easeIn",
        });
        this.tweens.push(t);
      }
      this.finishAfter(650, onComplete);
      return;
    }

    const rarity = result!.rarity;
    const def = result!.id ? RELIC_DEFS[result!.id] : null;
    const cfg = REVEAL_CFG[rarity];
    const color = RARITY_COLOR[rarity];

    // Per-rarity fanfare, fired here so the audio lands with the gem punch
    // (not the much-later announceRoll after the hold).
    this.playRevealCue(rarity);

    // Land the reel on the real result gem, then punch it in.
    this.reelGem?.setTexture(rarityIcon(rarity)).clearTint().setScale(0.2);
    const g = this.reelGem;
    if (g) {
      const t = this.scene.tweens.add({
        targets: g,
        scale: { from: 0.2, to: cfg.punch },
        duration: 260,
        ease: "Back.easeOut",
        onComplete: () => {
          const t2 = this.scene.tweens.add({ targets: g, scale: 1.35, duration: 160, ease: "Sine.easeInOut" });
          this.tweens.push(t2);
        },
      });
      this.tweens.push(t);
    }

    // Glow burst behind the gem (reuses the M-DN soft-light texture).
    const glow = this.scene.add
      .image(cx, gemY, "light_soft")
      .setScrollFactor(0)
      .setDepth(D_GLOW)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setTint(color)
      .setScale(0.2)
      .setAlpha(cfg.glowAlpha);
    this.objects.push(glow);
    this.tweens.push(
      this.scene.tweens.add({
        targets: glow,
        scale: cfg.glowScale,
        alpha: 0,
        duration: 620,
        ease: "Cubic.easeOut",
      }),
    );

    // Panel flash (uncommon+).
    if (cfg.flashAlpha > 0) {
      const flash = this.scene.add
        .rectangle(bounds.x, bounds.y, bounds.w, bounds.h, color, cfg.flashAlpha)
        .setOrigin(0, 0)
        .setScrollFactor(0)
        .setDepth(D_FLASH);
      this.objects.push(flash);
      this.tweens.push(
        this.scene.tweens.add({ targets: flash, alpha: 0, duration: 340, ease: "Cubic.easeOut" }),
      );
    }

    // Shard burst (rare/mythic — and a light one for uncommon).
    for (let i = 0; i < cfg.shards; i++) {
      const ang = (Math.PI * 2 * i) / cfg.shards + Math.random() * 0.4;
      const dist = 70 + Math.random() * 70;
      const shard = this.scene.add
        .image(cx, gemY, rarityIcon(rarity))
        .setScrollFactor(0)
        .setDepth(D_SHARD)
        .setScale(0.7);
      this.objects.push(shard);
      this.tweens.push(
        this.scene.tweens.add({
          targets: shard,
          x: cx + Math.cos(ang) * dist,
          y: gemY + Math.sin(ang) * dist,
          scale: 0.2,
          alpha: 0,
          duration: 520,
          ease: "Cubic.easeOut",
        }),
      );
    }

    // Banner (uncommon+): "★ RARE! ★" scaling in above the gem.
    if (cfg.banner) {
      const banner = this.scene.add
        .text(cx, gemY - 58, `★ ${rarityName(rarity).toUpperCase()}! ★`, {
          fontFamily: "monospace",
          fontSize: "24px",
          color: rarityHex(rarity),
          fontStyle: "bold",
        })
        .setOrigin(0.5, 0.5)
        .setScrollFactor(0)
        .setDepth(D_BANNER)
        .setScale(0.1);
      this.objects.push(banner);
      this.tweens.push(
        this.scene.tweens.add({ targets: banner, scale: 1, duration: 340, ease: "Back.easeOut" }),
      );
    }

    // Result name under the gem.
    // Without a committed id yet (a pending pick), name the rarity only — the
    // three candidate cards below the spin do the naming.
    const bannerLabel = def ? `${def.name} [${rarityName(rarity)}]` : `${rarityName(rarity)} — choose your relic`;
    this.addText(cx, gemY + 74, bannerLabel, 15, rarityHex(rarity), D_BANNER, 0.5);

    if (cfg.shakeIntensity > 0) this.scene.cameras.main.shake(160, cfg.shakeIntensity);

    // Bigger wins linger a beat longer before handing control back.
    const hold = cfg.banner ? 900 : 650;
    this.finishAfter(hold, onComplete);
  }

  private finishAfter(ms: number, onComplete: () => void): void {
    this.scene.time.delayedCall(ms, () => {
      this.stop();
      onComplete();
    });
  }

  private addText(x: number, y: number, str: string, size: number, color: string, depth: number, originX = 0): void {
    const t = this.scene.add
      .text(x, y, str, { fontFamily: "monospace", fontSize: `${size}px`, color })
      .setOrigin(originX, 0.5)
      .setScrollFactor(0)
      .setDepth(depth);
    this.objects.push(t);
  }

  // Tear down all FX GameObjects + tweens. Safe to call anytime (menu close,
  // re-spin, scene shutdown).
  stop(): void {
    for (const t of this.tweens) t.remove();
    this.tweens = [];
    for (const o of this.objects) o.destroy();
    this.objects = [];
    this.reelGem = undefined;
    this.active = false;
  }

  destroy(): void {
    this.stop();
  }
}
