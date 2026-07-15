import Phaser from "phaser";
import { itemDef, type ItemDef, type ItemStat } from "../systems/Items";
import { stationDisplayName } from "../systems/StationUpgrades";
import {
  weaponAttacksPerSecond,
  weaponBaseCritChance,
  weaponBaseCritMult,
  weaponDamage,
  weaponPrimaryDamageType,
} from "../systems/Weapons";
import { weaponSkillDamageMultiplier, type Skills } from "../systems/Skills";
import { armorDefenseForTier } from "../systems/ArmorUpgrades";
import { weaponTierDamageBonus } from "../systems/WeaponUpgrades";
import type { PlayerProgression } from "../systems/Progression";

export type TooltipPlacement = "right" | "above";

interface Anchor {
  x: number;
  y: number;
  width: number;
  height: number;
}

// Shared item-info popup used by both the backpack grid (InventoryMenu) and
// the hotbar (HotbarUI). "right" opens to the right of the anchor (flipping
// left if it would run off-screen) — used by the backpack grid. "above" opens
// upward, centered on the anchor — used by the hotbar, which sits at the very
// bottom of the screen with no room below it.
export class Tooltip {
  private scene: Phaser.Scene;
  private parts: Phaser.GameObjects.GameObject[] = [];
  private skills?: Skills;
  private progression?: PlayerProgression;

  constructor(scene: Phaser.Scene, skills?: Skills, progression?: PlayerProgression) {
    this.scene = scene;
    this.skills = skills;
    this.progression = progression;
  }

  // `tier` is only meaningful for stations with a defined upgrade path
  // (StationUpgrades.ts) — passing it for any other item is harmless, since
  // stationDisplayName falls back to the plain item name.
  show(key: string, anchor: Anchor, placement: TooltipPlacement, tier?: number): void {
    this.hide();
    const def = itemDef(key);
    if (!def) return;

    const name = tier !== undefined ? stationDisplayName(key, tier) : def.name;
    const lines = [name, "", def.description];
    if (def.stats?.length) {
      lines.push("");
      for (const s of def.stats) lines.push(`${s.label}: ${this.statValue(def, s, tier ?? 0)}`);
    }
    // Weapon base crit (M-SS) — the per-weapon floor; Strength/Agility + crit
    // relics add on top (shown live in the inventory Combat column).
    if (def.weapon) {
      lines.push(
        `Crit: ${Math.round(weaponBaseCritChance(def.weapon) * 100)}% x${weaponBaseCritMult(def.weapon).toFixed(1)}`,
      );
    }
    // Food: derive the effect line from `edible` so the numbers live in one
    // place (Items.ts) rather than being re-authored as static stat strings.
    if (def.edible) {
      lines.push("");
      lines.push(`Effect: +${def.edible.hpPerSec} HP/s for ${Math.round(def.edible.durationMs / 1000)}s`);
    }

    const text = this.scene.add
      .text(0, 0, lines.join("\n"), {
        fontFamily: "monospace",
        fontSize: "12px",
        color: "#e8ecf2",
        wordWrap: { width: 180 },
      })
      .setScrollFactor(0)
      .setDepth(4501);

    const padX = 8;
    const padY = 6;
    const w = text.width + padX * 2;
    const h = text.height + padY * 2;
    const { tx, ty } = this.place(anchor, w, h, placement);

    const bgBox = this.scene.add
      .rectangle(tx, ty, w, h, 0x000000, 0.92)
      .setOrigin(0, 0)
      .setStrokeStyle(1, 0x555e6e)
      .setScrollFactor(0)
      .setDepth(4500);
    text.setPosition(tx + padX, ty + padY);

    this.parts.push(bgBox, text);
  }

  // The static "Damage" stat is overridden with a live "base (adjusted)"
  // reading for weapons — the adjustment is the weapon SKILL's own damage
  // bonus (Skills.ts weaponSkillDamageMultiplier), not a player stat. Every
  // other stat line is shown as authored.
  private statValue(def: ItemDef, stat: ItemStat, tier: number): string {
    if (stat.label === "Damage" && def.weapon && this.skills) {
      const base = weaponDamage(def.weapon);
      const dmgType = weaponPrimaryDamageType(def.weapon);
      const tierBase = base + weaponTierDamageBonus(def.weapon, tier);
      const adjusted = Math.round(tierBase * weaponSkillDamageMultiplier(dmgType, this.skills));
      return adjusted === base ? `${base}` : `${adjusted} (base ${base})`;
    }
    if (stat.label === "Armor" && def.armorSlot) {
      const base = def.armorDefense ?? 0;
      const adjusted = armorDefenseForTier(def.key, tier);
      return adjusted === base ? `${base}` : `${adjusted} (base ${base})`;
    }
    // (Stamina cost is shown as-authored — Strength/Agility no longer discount
    // it after M-SS; only relics do, and the tooltip is relic-agnostic.)
    if (stat.label === "Attack Speed" && def.weapon) {
      return `${weaponAttacksPerSecond(def.weapon).toFixed(1)}/s`;
    }
    return stat.value;
  }

  hide(): void {
    for (const p of this.parts) p.destroy();
    this.parts = [];
  }

  private place(
    anchor: Anchor,
    w: number,
    h: number,
    placement: TooltipPlacement,
  ): { tx: number; ty: number } {
    const screenW = this.scene.scale.width;
    const screenH = this.scene.scale.height;

    if (placement === "right") {
      let tx = anchor.x + anchor.width + 8;
      if (tx + w > screenW - 4) tx = anchor.x - w - 8;
      const ty = Math.min(Math.max(anchor.y, 4), screenH - h - 4);
      return { tx, ty };
    }

    // "above": centered horizontally on the anchor, opening upward.
    let tx = anchor.x + anchor.width / 2 - w / 2;
    tx = Math.min(Math.max(tx, 4), screenW - w - 4);
    const ty = Math.max(anchor.y - h - 8, 4);
    return { tx, ty };
  }
}
