// Start-of-run base characters (B4-P1). Framework-free (no Phaser), like
// Run/Health/Buffs/Relics. PURE DATA plus a thin aggregate accessor: a
// CharacterDef never reaches into the scene — MainScene grants the kit once at
// run start and reads the run modifier at the SAME choke points relics already
// use, so a modifier adds one term rather than creating new math.
//
// Locked design (the user, B4-P1):
//  1. FIXED roster — every character is offered every run (not an RNG 3-card
//     draw), so the pick is a playstyle decision, not a dealt hand.
//  2. One card bundles all four axes: starting stats, starting kit, an innate
//     activated ability, and a run modifier.
//  3. Modifiers are DOUBLE-EDGED (boons + banes) and deliberately have NO score
//     effect — Run.score() stays kills + speed-scaled completion bonus, so a
//     harder card can't become a leaderboard lever.
//  4. The "innate" ability is a real ability-granting SPECIAL ITEM pre-equipped
//     in its slot, not a separate innate channel — it fills exactly the same
//     mechanical role as any other equipment (swappable, occupies the slot,
//     shows on the paper-doll). recomputeAbilities() already derives Q/E/R from
//     ItemDef.grantsAbility, so this needed no new ability plumbing at all.
//
// 2026-07-24 REWORK (the user: "consider a rework of the starting survivors...
// I want them to feel distinctive and double edged sworded"). Three problems
// drove it:
//
//  A. TWO CARDS HAD NO BANE LEFT. `maxHpPct`/`maxStaminaPct` were a % of the
//     100 BASE, so as pools grew they evaporated: the Vagabond's "-10% max
//     Stamina" was -10 off a ~310 pool (3%) and the Ashcaller's "-15% max HP"
//     was -15 off ~300+ (5%). Both cards were, in practice, free upside. Same
//     decay that made the Warden's "+20% max HP" boon worthless, pointing the
//     other way. Fixed by making it a TRUE multiplier (see maxHpMult).
//  B. EVERY MODIFIER WAS THE SAME SHAPE — one global scalar up, one global
//     scalar down. The affinities carried all the class identity and the
//     modifier layer read as a stat line. Each card now also owns a
//     BEHAVIOURAL edge that changes how it is played (heal-on-kill, one-buff-
//     at-a-time, attack speed, elite loot), each riding a choke point that
//     already existed.
//  C. Two cards shared `damageTakenMult` as their boon. One axis per card now.
//
// Locked with the user in the same pass: no HARD limits — a modifier scales
// numbers and behaviour but never locks out content, because a bad pick must
// not be able to dead-end a 70-minute run.
import { statDisplayName, type StatType } from "./Progression";
import { skillDisplayName, type SkillType } from "./Skills";
import type { EquipSlot } from "./Equipment";

// Every field is optional and defaults to neutral (1x, or 0). Keep this list to
// axes with a single existing choke point in MainScene — a new field means a new
// hook, which is a deliberate decision, not a freebie. Corollary: do NOT leave
// unused fields lying around as "future levers" (`maxStaminaPct` was retired
// rather than kept, since nothing on the roster spends it any more).
export interface RunModifier {
  name: string;
  // Display lines. Arrays, not single strings, because most cards now carry a
  // scalar pair AND a behavioural edge. Rendered exactly like affinityLines().
  boons: string[];
  banes: string[];

  // --- scalar axes (all TRUE multipliers — none of these decay) ---
  damageDealtMult?: number;
  damageTakenMult?: number;
  moveSpeedMult?: number;
  xpMult?: number;
  staminaCostMult?: number;
  eliteChanceMult?: number;
  // A true multiplier on the FINAL max-HP pool, not a % of the 100 base — so
  // "-25% max HP" still means a quarter of your actual health at level 28. Kept
  // BANE-ONLY on the roster: as a boon it would multiply a pool a Vitality
  // potency has already inflated, which is the compounding the user rejected.
  maxHpMult?: number;

  // --- behavioural edges (one line each at an existing choke point) ---
  killHealBonus?: number; // flat HP restored per kill (MainScene's killHeal site)
  staminaRegenMult?: number; // Stamina.setRegenMult
  buffDurationMult?: number; // Buffs.setDurationMult
  maxBuffs?: number; // Buffs.setMaxBuffs — overrides the default 3
  attackSpeedMult?: number; // multiplies weapon COOLDOWN, so >1 is SLOWER
  eliteLootMult?: number; // multiplies an elite's rolled drop amounts
}

// B4-P3 — the CLASS identity axis, separate from RunModifier's flat identity.
// A modifier says how big your numbers are; these two say how you GROW, which
// is what makes a card read as a class rather than a stat line. Both default to
// 1x per key, and each has exactly ONE hook site.
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
  // or a difficulty option, and applyCharacter's routing already handles both.
  startingItems: { key: string; count: number }[];
  modifier: RunModifier;
  affinity?: ClassAffinity;
}

// the user's locked rule (B4-P3): a character may never reduce DROPS. That has a
// concrete consequence here — chopping/mining levels roll the bonus-drop chance
// (Skills.choppingBonusChance/miningBonusChance), so a gathering-XP PENALTY is
// an indirect drop nerf. Positive gathering affinity is fine.
const NO_PENALTY_SKILLS: SkillType[] = ["chopping", "mining"];

// ONE AXIS, ONE LEVER (the user, 2026-07-24: "I dont want them to double stack
// i.e. -20% max hp AND vit is hit. doesnt make sense"). Several RunModifier
// fields govern the very same thing a stat potency governs, so a card carrying
// both is silently applying two multipliers to one axis — invisible on the card,
// and exactly the compounding that made the old Warden and Ashcaller wrong.
// A card may touch as many axes as it likes; it may pull only ONE lever on each.
const MODIFIER_STAT_AXIS: Partial<Record<keyof RunModifier, StatType>> = {
  maxHpMult: "vitality", // Vitality grants max HP
  staminaRegenMult: "endurance", // Endurance grants stamina regen
  xpMult: "intelligence", // Intelligence grants skill XP
  buffDurationMult: "wisdom", // Wisdom grants buff/food duration
};

// The roster. All numbers first-pass/tunable, like every other system here.
// Each character carries one of the three existing ability specials; the three
// repeat across the five so no card is ability-less.
export const CHARACTER_DEFS: CharacterDef[] = [
  {
    id: "vagabond",
    name: "The Vagabond",
    // The attrition card: it can outrun literally anything in the game and
    // never runs dry, but it cannot burst anything down, so every fight is
    // long. Its answer to danger is not to be there.
    blurb: "Never stops moving and never runs dry — but nothing dies quickly.",
    icon: "ability_blink",
    startingStats: { endurance: 2, vitality: 2 },
    startingEquip: [{ slot: "ability1", key: "special_gloamstep_band_lesser" }],
    startingItems: [],
    modifier: {
      name: "Well-Travelled",
      boons: ["+15% move speed", "+50% stamina regeneration"],
      // The old bane ("-10% max Stamina") was worth 3% by the endgame, i.e.
      // this card had effectively no downside at all. A flat damage cut is a
      // multiplier, so it stays a real cost for the whole run — and it is the
      // RIGHT cost, since it is what stops "outrun everything" from also being
      // "kill everything".
      banes: ["-25% damage dealt"],
      moveSpeedMult: 1.15,
      staminaRegenMult: 1.5,
      damageDealtMult: 0.75,
    },
    affinity: {
      skillXpMult: { running: 1.6, light_armor: 1.4, blunt: 0.8 },
      // No Endurance potency: staminaRegenMult already pulls that axis.
      statPotency: { agility: 1.5, strength: 0.85 },
    },
  },
  {
    id: "reaver",
    name: "The Reaver",
    // The only card that sustains by KILLING rather than by resting, which
    // inverts the usual "retreat and eat" loop — backing off is what kills you.
    blurb: "Lives off the kill. Stop swinging and you bleed out.",
    icon: "ability_bloodpact",
    startingStats: { strength: 4 },
    startingEquip: [{ slot: "ability1", key: "back_bloodpact_shroud_lesser" }],
    startingItems: [],
    modifier: {
      name: "Bloodthirst",
      boons: ["+30% damage dealt", "Restore 6 HP on every kill"],
      banes: ["+25% damage taken", "-20% max HP"],
      damageDealtMult: 1.3,
      damageTakenMult: 1.25,
      killHealBonus: 6,
      maxHpMult: 0.8,
    },
    affinity: {
      skillXpMult: { blunt: 1.6, slash: 1.4, magic: 0.75 },
      // No Vitality potency: maxHpMult already pulls that axis.
      statPotency: { strength: 1.5, intelligence: 0.85 },
    },
  },
  {
    id: "ashcaller",
    name: "The Ashcaller",
    // REWORKED 2026-07-24 (playtest: the game-wide food-buff cap dropped from
    // 3 to 2, so "only ONE buff at a time" — this card's entire identity — was
    // about to collapse into "worse than everyone else" rather than "different
    // from everyone else"). Inverted instead of deleted: everyone else now runs
    // 2 concurrent buffs, and the Ashcaller alone runs 3 — the "buff master"
    // reading is the mirror image of the old "buff ascetic" one, and it reuses
    // the exact same maxBuffs lever pointed the other direction.
    blurb: "Frail and fast-learning. Juggles three blessings where anyone else carries two.",
    icon: "ability_nova",
    startingStats: { intelligence: 3, wisdom: 2 },
    startingEquip: [{ slot: "ability1", key: "special_gloam_focus_lesser" }],
    startingItems: [],
    // D4 (2026-07-23) trimmed the XP side after the god-run found xpMult,
    // skillXpMult and Intelligence potency stacking MULTIPLICATIVELY (skillXpMult
    // applies outside the additive bucket the other two feed — see
    // MainScene.awardSkillXp). The 2026-07-24 one-axis-one-lever rule finishes
    // that job properly: Intelligence potency is GONE from this card, so the
    // stack is two terms rather than three. Wisdom potency likewise gave way to
    // buffDurationMult, and Vitality potency to maxHpMult — this card was
    // the user's own worked example of the double-stack problem.
    modifier: {
      name: "Gloam-Touched",
      boons: ["+15% skill XP", "Buffs and food last 60% longer", "Runs 3 buffs at once (everyone else: 2)"],
      banes: ["-25% max HP"],
      xpMult: 1.15,
      buffDurationMult: 1.6,
      maxHpMult: 0.75,
      maxBuffs: 3,
    },
    affinity: {
      skillXpMult: { magic: 1.35, ranged: 1.2, heavy_armor: 0.8 },
      // Endurance is the one axis this card's modifier leaves untouched.
      statPotency: { endurance: 0.85 },
    },
  },
  {
    id: "warden",
    name: "The Warden",
    // The deliberate fighter: it wins by not dying and by out-gathering
    // everyone, and it pays for that in tempo rather than in survivability.
    blurb: "Slow, deliberate and hard to put down. Every swing is expensive.",
    icon: "ability_blink",
    startingStats: { vitality: 3, endurance: 2 },
    startingEquip: [{ slot: "ability1", key: "special_gloamstep_band_lesser" }],
    startingItems: [],
    // The boon was `maxHpPct: 20` — which read as "+20% max HP" but was a flat
    // +20 (a % of the 100 base), about 4% of an endgame pool, AND doubled up on
    // the axis this card's Vitality potency already owns. Damage reduction never
    // decays and is a genuinely different lever from the size of the pool, so
    // the card now has two distinct ways of being hard to kill.
    modifier: {
      name: "Ironbound",
      boons: ["-15% damage taken"],
      banes: ["+20% attack stamina cost", "-13% attack speed"],
      damageTakenMult: 0.85,
      staminaCostMult: 1.2,
      attackSpeedMult: 1.15, // multiplies cooldown -> slower swings
    },
    // The only gathering affinity on the roster — it fits "comes prepared", and
    // per the drop lock it can only ever be an upside on those two skills.
    // Vitality potency is safe here: this card pulls no vitality-axis modifier.
    affinity: {
      skillXpMult: { heavy_armor: 1.6, chopping: 1.4, mining: 1.4, ranged: 0.8 },
      statPotency: { vitality: 1.5, agility: 0.85 },
    },
  },
  {
    id: "ascetic",
    name: "The Ascetic",
    // The only card that changes the WORLD rather than the player: it is a
    // greed card, and the relic economy is the payoff. It lost the -20% damage
    // taken it used to share with the Warden — its survivability now comes from
    // the dash i-frames its Light Armor affinity levels fastest, which is what
    // "hard to put a mark on" always meant mechanically.
    blurb: "The world sends its worst — and its worst is worth twice as much.",
    icon: "ability_nova",
    startingStats: { agility: 3, strength: 2 },
    startingEquip: [{ slot: "ability1", key: "special_gloam_focus_lesser" }],
    startingItems: [],
    modifier: {
      name: "Hunted",
      boons: ["Elites drop double loot"],
      banes: ["Elites are twice as common"],
      eliteChanceMult: 2,
      eliteLootMult: 2,
    },
    affinity: {
      skillXpMult: { light_armor: 1.6, pierce: 1.4, slash: 0.8 },
      statPotency: { endurance: 1.5, wisdom: 0.85 },
    },
  },
];

// Both design locks enforced at module load — cheap, and they fire in the dev
// console the moment someone breaks one rather than during a playtest.
for (const def of CHARACTER_DEFS) {
  for (const skill of NO_PENALTY_SKILLS) {
    const v = def.affinity?.skillXpMult?.[skill];
    if (v !== undefined && v < 1) {
      console.warn(
        `[Characters] ${def.id} penalises ${skill} XP (x${v}) — that reduces bonus-drop chance. Characters must never reduce drops.`,
      );
    }
  }
  for (const [field, stat] of Object.entries(MODIFIER_STAT_AXIS) as [keyof RunModifier, StatType][]) {
    if (def.modifier[field] !== undefined && def.affinity?.statPotency?.[stat] !== undefined) {
      console.warn(
        `[Characters] ${def.id} pulls TWO levers on the ${stat} axis (modifier.${field} and statPotency.${stat}). One axis, one lever.`,
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
  private flat(field: keyof RunModifier): number {
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

  // A TRUE multiplier on the final pool (2026-07-24), unlike the old
  // maxHpPct's flat-off-100 contribution — so a "frail" card stays frail at
  // level 28 instead of decaying to a rounding error.
  maxHpMult(): number {
    return this.mult("maxHpMult");
  }

  // --- behavioural edges ---
  killHealBonus(): number {
    return this.flat("killHealBonus");
  }
  staminaRegenMult(): number {
    return this.mult("staminaRegenMult");
  }
  buffDurationMult(): number {
    return this.mult("buffDurationMult");
  }
  // null = no override, use the game's default cap.
  maxBuffs(): number | null {
    const v = this.def?.modifier.maxBuffs;
    return typeof v === "number" ? v : null;
  }
  attackSpeedMult(): number {
    return this.mult("attackSpeedMult");
  }
  eliteLootMult(): number {
    return this.mult("eliteLootMult");
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
