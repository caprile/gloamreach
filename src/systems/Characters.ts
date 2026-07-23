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
import { statDisplayName, type StatType } from "./Progression";
import { skillDisplayName, type SkillType } from "./Skills";
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

// B4-P3 — the CLASS identity axis, separate from RunModifier's flat identity.
// A modifier says how big your numbers are; these two say how you GROW, which
// is what makes a card read as a class rather than a stat line. Both default to
// 1x per key, and each has exactly ONE hook site (see the class comment below).
export interface ClassAffinity {
  // Per-skill XP rate. Skills gate recipe DISCOVERY (Recipe.requiredSkills), so
  // this changes what a run can build, not just how fast numbers climb.
  skillXpMult?: Partial<Record<SkillType, number>>;
  // Per-stat multiplier on the value of each allocated point.
  statPotency?: Partial<Record<StatType, number>>;
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
  //
  // EMPTY on every character as of B4-P7 (the user: "no classes start with any
  // gear"). Three of the five used to hand out an axe, which meant the class
  // pick partly decided how fast you got through the opening minutes, and the
  // Ascetic's empty hands were its whole identity. Now every run starts the same
  // way — branches and rocks off the ground, into a Stone Axe — and a card is
  // expressed purely through stats, ability, modifier and affinity. The field
  // stays (not deleted) because it is the obvious lever for a future unlockable
  // or a difficulty option, and applyCharacter's routing already handles both
  // cases.
  startingItems: { key: string; count: number }[];
  modifier: RunModifier;
  affinity?: ClassAffinity;
}

// the user's locked rule (B4-P3): a character may never reduce DROPS. That has a
// concrete consequence here — chopping/mining levels roll the bonus-drop chance
// (Skills.choppingBonusChance/miningBonusChance), so a gathering-XP PENALTY is
// an indirect drop nerf. Positive gathering affinity is fine. Kept as a runtime
// guard rather than only a comment so a future editor trips it, not a playtest.
const NO_PENALTY_SKILLS: SkillType[] = ["chopping", "mining"];

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
    startingEquip: [{ slot: "special1", key: "special_gloamstep_band_lesser" }],
    startingItems: [],
    modifier: {
      name: "Well-Travelled",
      boon: "+10% move speed",
      bane: "-10% max Stamina",
      moveSpeedMult: 1.1,
      maxStaminaPct: -10,
    },
    affinity: {
      skillXpMult: { running: 1.6, light_armor: 1.4, blunt: 0.8 },
      statPotency: { agility: 1.5, strength: 0.85 },
    },
  },
  {
    id: "reaver",
    name: "The Reaver",
    blurb: "Hits like a landslide and takes the return blow just as hard.",
    icon: "ability_bloodpact",
    startingStats: { strength: 4 },
    startingEquip: [{ slot: "back", key: "back_bloodpact_shroud_lesser" }],
    startingItems: [],
    modifier: {
      name: "Bloodthirst",
      boon: "+25% damage dealt",
      bane: "+25% damage taken",
      damageDealtMult: 1.25,
      damageTakenMult: 1.25,
    },
    affinity: {
      skillXpMult: { blunt: 1.6, slash: 1.4, magic: 0.75 },
      statPotency: { strength: 1.5, intelligence: 0.85 },
    },
  },
  {
    id: "ashcaller",
    name: "The Ashcaller",
    blurb: "Learns from everything. Frail, but grows quickly.",
    icon: "ability_nova",
    startingStats: { intelligence: 3, wisdom: 2 },
    startingEquip: [{ slot: "special2", key: "special_gloam_focus_lesser" }],
    startingItems: [],
    modifier: {
      name: "Gloam-Touched",
      boon: "+30% skill XP",
      bane: "-15% max HP",
      xpMult: 1.3,
      maxHpPct: -15,
    },
    affinity: {
      skillXpMult: { magic: 1.6, ranged: 1.4, heavy_armor: 0.8 },
      statPotency: { intelligence: 1.5, wisdom: 1.25, vitality: 0.85 },
    },
  },
  {
    id: "warden",
    name: "The Warden",
    blurb: "Comes prepared and hard to put down — every swing costs more.",
    icon: "ability_blink",
    startingStats: { vitality: 3, endurance: 2 },
    startingEquip: [{ slot: "special1", key: "special_gloamstep_band_lesser" }],
    startingItems: [],
    modifier: {
      name: "Ironbound",
      boon: "+20% max HP",
      bane: "+20% attack stamina cost",
      maxHpPct: 20,
      staminaCostMult: 1.2,
    },
    // The only gathering affinity on the roster — it fits "comes prepared", and
    // per the drop lock it can only ever be an upside on those two skills.
    affinity: {
      skillXpMult: { heavy_armor: 1.6, chopping: 1.4, mining: 1.4, ranged: 0.8 },
      statPotency: { vitality: 1.5, agility: 0.85 },
    },
  },
  {
    id: "ascetic",
    name: "The Ascetic",
    // Reworded in B4-P7: "starts with nothing but nerve" stopped meaning
    // anything once every card starts empty-handed, so the blurb now leans on
    // what actually still distinguishes it — the Hunted modifier.
    blurb: "Hard to put a mark on, and the world sends its worst to try.",
    icon: "ability_nova",
    startingStats: { agility: 3, strength: 2 },
    startingEquip: [{ slot: "special2", key: "special_gloam_focus_lesser" }],
    startingItems: [],
    modifier: {
      name: "Hunted",
      boon: "-20% damage taken",
      bane: "Elites are twice as common",
      damageTakenMult: 0.8,
      eliteChanceMult: 2,
    },
    affinity: {
      skillXpMult: { light_armor: 1.6, pierce: 1.4, slash: 0.8 },
      statPotency: { endurance: 1.5, wisdom: 0.85 },
    },
  },
];

// Enforce the drop lock at module load — cheap, and it fires in the dev console
// the moment someone adds a gathering penalty rather than during a playtest.
for (const def of CHARACTER_DEFS) {
  for (const skill of NO_PENALTY_SKILLS) {
    const v = def.affinity?.skillXpMult?.[skill];
    if (v !== undefined && v < 1) {
      console.warn(
        `[Characters] ${def.id} penalises ${skill} XP (x${v}) — that reduces bonus-drop chance. Characters must never reduce drops.`,
      );
    }
  }
}

export function characterById(id: string): CharacterDef | undefined {
  return CHARACTER_DEFS.find((c) => c.id === id);
}

// Display strings DERIVED from the affinity maps, so card/menu text can never
// drift from the real numbers (unlike the hand-written boon/bane lines above).
// Returns boons first, then banes, each already sorted strongest-first.
export function affinityLines(def: CharacterDef): { boons: string[]; banes: string[] } {
  const boons: string[] = [];
  const banes: string[] = [];

  const pct = (v: number) => `${v > 1 ? "+" : "-"}${Math.round(Math.abs(v - 1) * 100)}%`;
  const push = (v: number, text: string) => (v > 1 ? boons : banes).push(text);

  const skills = Object.entries(def.affinity?.skillXpMult ?? {}) as [SkillType, number][];
  for (const [skill, v] of skills.sort((a, b) => Math.abs(b[1] - 1) - Math.abs(a[1] - 1))) {
    if (v !== 1) push(v, `${pct(v)} ${skillDisplayName(skill)} XP`);
  }

  const stats = Object.entries(def.affinity?.statPotency ?? {}) as [StatType, number][];
  for (const [stat, v] of stats.sort((a, b) => Math.abs(b[1] - 1) - Math.abs(a[1] - 1))) {
    if (v !== 1) push(v, `${statDisplayName(stat)} points worth ${v.toFixed(2).replace(/\.?0+$/, "")}x`);
  }

  return { boons, banes };
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

  // --- B4-P3 class identity (one hook site each) ---

  // Read by MainScene.awardSkillXp, MULTIPLIED outside the additive XP bucket
  // there — see that call site for why this composes rather than folding in.
  skillXpMult(skill: SkillType): number {
    return this.def?.affinity?.skillXpMult?.[skill] ?? 1;
  }

  // Pushed into PlayerProgression once (setStatPotency, from applyCharacter),
  // so every per-point getter AND every stat readout picks it up in one place.
  statPotency(stat: StatType): number {
    return this.def?.affinity?.statPotency?.[stat] ?? 1;
  }

  statPotencyMap(): Partial<Record<StatType, number>> {
    return this.def?.affinity?.statPotency ?? {};
  }
}
