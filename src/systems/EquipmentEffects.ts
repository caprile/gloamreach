import { EQUIP_SLOTS, type Equipment } from "./Equipment";
import { itemDef } from "./Items";

// Jewelry (ring/amulet) passive effects — Biome-3 Phase 2b. DELIBERATELY a
// different layer from relics: relics own the raw-% COMBAT-STAT layer (and
// high-rarity procs), so jewelry is the ABILITY-AUGMENT + UTILITY/EXPLORER
// layer instead — nothing here duplicates a relic channel. Pure data lives on
// `ItemDef.passive`; this class sums the equipped pieces (recomputed on every
// equipment change) and MainScene reads the getters at the ability + utility
// hook points (NOT the relic combat hooks). Modeled on Relics.ts's summer shape.

export interface EquipPassive {
  // --- ability-augment (tune the equipped Q/E/R actives) ---
  abilityCooldownPct?: number; // reduce all ability cooldowns (15 = -15%)
  abilityPowerPct?: number; // scale ability effect magnitudes (nova dmg/radius, blink distance)
  // --- utility / explorer (things relics never touch) ---
  magnetRadiusPct?: number; // bigger loose-drop magnet radius
  gatherBonusPct?: number; // added chance for a bonus +1 on a depleted node (15 = +15%)
  lightRadiusPct?: number; // bigger equipped/night light radius
  // B4-P2: status (bleed/poison) mitigation. A genuinely new axis — nothing in
  // the game owned status resistance before, so it doesn't collide with the
  // relic combat-stat layer OR with heavy armor's magic/fire mitigation.
  statusResistPct?: number; // reduce incoming bleed/poison dose (30 = -30%)
}

const CHANNELS: (keyof EquipPassive)[] = [
  "abilityCooldownPct",
  "abilityPowerPct",
  "magnetRadiusPct",
  "gatherBonusPct",
  "lightRadiusPct",
  "statusResistPct",
];

// World-px light a piece with 100% lightRadiusPct would emit on its own (see
// innateLightRadius). Sized under a Torch's 180px on purpose.
const JEWELRY_LIGHT_BASE = 200;

// Human-readable effect lines for a passive record — reused by the JewelryMenu
// row and the item Tooltip so display can't drift from the mechanical numbers.
export function describePassive(p: EquipPassive): string[] {
  const out: string[] = [];
  if (p.abilityCooldownPct) out.push(`-${p.abilityCooldownPct}% ability cooldown`);
  if (p.abilityPowerPct) out.push(`+${p.abilityPowerPct}% ability power`);
  if (p.magnetRadiusPct) out.push(`+${p.magnetRadiusPct}% pickup radius`);
  if (p.gatherBonusPct) out.push(`+${p.gatherBonusPct}% bonus-gather chance`);
  if (p.lightRadiusPct) out.push(`Sheds light; +${p.lightRadiusPct}% light radius`);
  if (p.statusResistPct) out.push(`-${p.statusResistPct}% bleed/poison taken`);
  return out;
}

export class EquipmentEffects {
  private sums: Record<keyof EquipPassive, number> = {
    abilityCooldownPct: 0,
    abilityPowerPct: 0,
    magnetRadiusPct: 0,
    gatherBonusPct: 0,
    lightRadiusPct: 0,
    statusResistPct: 0,
  };

  // Sum the `passive` records of every equipped item. Additive across pieces.
  recompute(equipment: Equipment): void {
    for (const k of CHANNELS) this.sums[k] = 0;
    for (const { id } of EQUIP_SLOTS) {
      const eq = equipment.get(id);
      const p = eq ? itemDef(eq.key)?.passive : undefined;
      if (!p) continue;
      for (const k of CHANNELS) this.sums[k] += p[k] ?? 0;
    }
  }

  // --- aggregate getters (read at the ability + utility hook points) ---

  // Clamped so no stack of jewelry can zero (or invert) a cooldown.
  abilityCooldownMult(): number {
    return Math.max(0.4, 1 - this.sums.abilityCooldownPct / 100);
  }
  abilityPowerMult(): number {
    return 1 + this.sums.abilityPowerPct / 100;
  }
  magnetRadiusMult(): number {
    return 1 + this.sums.magnetRadiusPct / 100;
  }
  // A probability fraction (0.15 = +15%), added onto the chopping/mining skill
  // bonus-drop roll in MainScene.
  gatherBonusChance(): number {
    return this.sums.gatherBonusPct / 100;
  }
  lightRadiusMult(): number {
    return 1 + this.sums.lightRadiusPct / 100;
  }
  // A light-bearing trinket (the Amulet of Farsight's "pale lantern-stone")
  // should actually give off light, not merely widen a torch you might not be
  // holding — lightRadiusPct alone multiplies the HELD radius, which is 0 with
  // an axe in hand, so the amulet read as doing nothing (the user: "lantern
  // should auto give light radius"). Its own glow is derived from the same
  // percentage rather than a second stat, so one number still describes the
  // piece; the base is deliberately below a torch's 180px, so a torch is still
  // the brighter choice and the two combine.
  innateLightRadius(): number {
    return (JEWELRY_LIGHT_BASE * this.sums.lightRadiusPct) / 100;
  }
  // Scales an incoming bleed/poison dose. Floored at 0.25 so no stack of gear
  // can make status effects a non-mechanic — same "never zero it out" instinct
  // as the ability-cooldown clamp above.
  statusResistMult(): number {
    return Math.max(0.25, 1 - this.sums.statusResistPct / 100);
  }
}
