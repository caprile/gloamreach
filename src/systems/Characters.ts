// Start-of-run base characters (B4-P1). Framework-free (no Phaser), like
// Run/Health/Buffs/Relics. PURE DATA plus a thin aggregate accessor: a
// CharacterDef never reaches into the scene — MainScene grants the kit once at
// run start and reads the run modifier at the SAME choke points relics already
// use (damage dealt/taken, move speed, XP, stamina cost, elite chance, max
// HP/stamina), so a modifier adds one term rather than creating new math.
//
// Locked design (the user, this session):
//  1. FIXED roster — every character is offered every run (not an RNG 3-card
//     draw), so the pick is a playstyle decision, not a dealt hand.
//  2. One card bundles all four axes: starting stats, starting kit, an innate
//     activated ability, and a run modifier.
//  3. Modifiers are DOUBLE-EDGED (boon + bane) and deliberately have NO score
//     effect — Run.score() stays kills + speed-scaled completion bonus, so a
//     harder card can't become a leaderboard lever.
//  4. The "innate" ability is a real ability-granting SPECIAL ITEM pre-equipped
//     in its slot, not a separate innate channel — it fills exactly the same
//     mechanical role as any other equipment (swappable, occupies the slot,
//     shows on the paper-doll). recomputeAbilities() already derives Q/E/R from
//     ItemDef.grantsAbility, so this needed no new ability plumbing at all.
import type { StatType } from "./Progression";
import type { EquipSlot } from "./Equipment";

// Every field is optional and defaults to neutral (1x, or 0 for the pct pair).
// Keep this list to axes with a single existing choke point in MainScene — a
// new field means a new hook, which is a deliberate decision, not a freebie.
export interface RunModifier {
  name: string;
  boon: string; // display line, e.g. "+25% damage dealt"
  bane: string; // display line, e.g. "+25% damage taken"
  damageDealtMult?: number;
  damageTakenMult?: number;
  moveSpeedMult?: number;
  xpMult?: number;
  staminaCostMult?: number;
  eliteChanceMult?: number;
  maxHpPct?: number; // % of the 100 base, e.g. -15 = -15 max HP
  maxStaminaPct?: number;
}

export interface CharacterDef {
  id: string;
  name: string;
  blurb: string; // one-line playstyle read, shown on the card
  icon: string; // BootScene texture — reuses the granted ability's icon
  startingStats: Partial<Record<StatType, number>>;
  // Pre-equipped gear. Always includes exactly one ability-granting special
  // (see locked decision 4 above).
  startingEquip: { slot: EquipSlot; key: string }[];
  // Loose kit. Hotbarable items (tools/weapons) get routed to the hotbar by
  // MainScene.applyCharacter; everything else lands in the backpack.
  startingItems: { key: string; count: number }[];
  modifier: RunModifier;
}

// The roster. All numbers first-pass/tunable, like every other system here.
// Each character carries one of the three existing ability specials; the three
// repeat across the five so no card is ability-less.
export const CHARACTER_DEFS: CharacterDef[] = [
  {
    id: "vagabond",
    name: "The Vagabond",
    blurb: "A light-footed wanderer. Covers ground fast, tires faster.",
    icon: "ability_blink",
    startingStats: { endurance: 2, vitality: 2 },
    startingEquip: [{ slot: "special1", key: "special_gloamstep_band" }],
    startingItems: [
      { key: "stone_axe", count: 1 },
      { key: "wood", count: 5 },
    ],
    modifier: {
      name: "Well-Travelled",
      boon: "+10% move speed",
      bane: "-10% max Stamina",
      moveSpeedMult: 1.1,
      maxStaminaPct: -10,
    },
  },
  {
    id: "reaver",
    name: "The Reaver",
    blurb: "Hits like a landslide and takes the return blow just as hard.",
    icon: "ability_bloodpact",
    startingStats: { strength: 4 },
    startingEquip: [{ slot: "back", key: "back_bloodpact_shroud" }],
    startingItems: [{ key: "stone_club", count: 1 }],
    modifier: {
      name: "Bloodthirst",
      boon: "+25% damage dealt",
      bane: "+25% damage taken",
      damageDealtMult: 1.25,
      damageTakenMult: 1.25,
    },
  },
  {
    id: "ashcaller",
    name: "The Ashcaller",
    blurb: "Learns from everything. Frail, but grows quickly.",
    icon: "ability_nova",
    startingStats: { intelligence: 3, wisdom: 2 },
    startingEquip: [{ slot: "special2", key: "special_gloam_focus" }],
    startingItems: [
      { key: "wood_club", count: 1 },
      { key: "torch", count: 1 },
    ],
    modifier: {
      name: "Gloam-Touched",
      boon: "+30% skill XP",
      bane: "-15% max HP",
      xpMult: 1.3,
      maxHpPct: -15,
    },
  },
  {
    id: "warden",
    name: "The Warden",
    blurb: "Comes prepared and hard to put down — every swing costs more.",
    icon: "ability_blink",
    startingStats: { vitality: 3, endurance: 2 },
    startingEquip: [{ slot: "special1", key: "special_gloamstep_band" }],
    startingItems: [
      { key: "stone_axe", count: 1 },
      { key: "stone_pickaxe", count: 1 },
    ],
    modifier: {
      name: "Ironbound",
      boon: "+20% max HP",
      bane: "+20% attack stamina cost",
      maxHpPct: 20,
      staminaCostMult: 1.2,
    },
  },
  {
    id: "ascetic",
    name: "The Ascetic",
    blurb: "Starts with nothing but nerve. The world sends its worst.",
    icon: "ability_nova",
    startingStats: { agility: 3, strength: 2 },
    startingEquip: [{ slot: "special2", key: "special_gloam_focus" }],
    startingItems: [],
    modifier: {
      name: "Hunted",
      boon: "-20% damage taken",
      bane: "Elites are twice as common",
      damageTakenMult: 0.8,
      eliteChanceMult: 2,
    },
  },
];

export function characterById(id: string): CharacterDef | undefined {
  return CHARACTER_DEFS.find((c) => c.id === id);
}

// Aggregate accessor mirroring RelicManager's getter shape, so MainScene's hook
// sites read a character exactly the way they already read relics. A null def
// returns neutral values throughout — the game stays fully playable if the
// picker is ever bypassed (dev restarts, a future "quick play" path).
export class RunCharacter {
  readonly def: CharacterDef | null;

  constructor(def: CharacterDef | null = null) {
    this.def = def;
  }

  name(): string {
    return this.def?.name ?? "Nameless";
  }
  modifierName(): string {
    return this.def?.modifier.name ?? "None";
  }

  private mult(field: keyof RunModifier): number {
    const v = this.def?.modifier[field];
    return typeof v === "number" ? v : 1;
  }
  private pct(field: keyof RunModifier): number {
    const v = this.def?.modifier[field];
    return typeof v === "number" ? v : 0;
  }

  damageDealtMult(): number {
    return this.mult("damageDealtMult");
  }
  damageTakenMult(): number {
    return this.mult("damageTakenMult");
  }
  moveSpeedMult(): number {
    return this.mult("moveSpeedMult");
  }
  xpMult(): number {
    return this.mult("xpMult");
  }
  staminaCostMult(): number {
    return this.mult("staminaCostMult");
  }
  eliteChanceMult(): number {
    return this.mult("eliteChanceMult");
  }
  // Flat HP/stamina contribution off the 100 base — kept as an independent
  // LINEAR add (matching the 2026-07-15 additive rule) so a character's % can
  // never compound with a relic's %.
  maxHpBonus(): number {
    return 100 * (this.pct("maxHpPct") / 100);
  }
  maxStaminaBonus(): number {
    return 100 * (this.pct("maxStaminaPct") / 100);
  }
}
