// Phaser-FREE single source of truth for enemy COMBAT stats.
//
// Why this exists: enemy stats used to live only inside the Phaser-importing
// entity classes (src/entities/*.ts), so the balancing dashboard's Enemies tab
// had to be HAND-MIRRORED — and it drifted badly (it claimed Cinderwrought
// resists blunt/pierce when the code resists nothing, called Hexling magic-
// resistant when it's magic-WEAK, and listed stale damage numbers). This module
// holds the raw numbers once; the entities import them (so the game and this
// table can never disagree) and the dashboard imports them too (live, no mirror).
//
// WIRING STATUS (which entities READ their numbers from this module vs. still
// hold their own literals). A wired entity can't drift from this table; an
// un-wired one's numbers here match its code TODAY but must be kept in sync
// until wired. The plan is to wire each remaining entity as it's next tuned
// (edit the number HERE + swap the entity's const to read it, in one pass).
//   WIRED: boar, snake, ranged_gremlin, melee_gremling, gremlin_king (all forest).
//   NOT YET WIRED (values here mirror the code, verified 2026-07-23): all
//     badlands + bayou enemies. Wire during their next balance pass.
//
// KEEP IT PHASER-FREE. The dashboard bundles this standalone; a transitive
// import of anything under src/entities (which import Phaser) would drag the
// whole engine into the dashboard bundle (see feedback_keep_system_modules_phaser_free).
// The only import allowed here is the damage-type union from Weapons.ts, itself
// Phaser-free.

// How an enemy attack interacts with the player's defenses — this is the axis
// the audit cares about (does flat armor apply?), not the player's own
// slash/blunt/pierce weapon-skill taxonomy:
//   physical — flat armor subtracts (the big mitigation for melee bruisers)
//   magic    — bypasses flat armor (heavy-armor % mitigation only)
//   fire     — bypasses flat armor (heavy-armor % mitigation only)
//   poison   — bypasses flat armor; also a damage-over-time
export type EnemyDamageClass = "physical" | "magic" | "fire" | "poison";
export type AttackKind = "melee" | "ranged" | "aoe" | "dot";
export type EnemyBiome = "forest" | "badlands" | "bayou";
export type EnemyRole = "normal" | "miniboss" | "boss";

export interface EnemyAttackStat {
  name: string;
  damage: number;
  cls: EnemyDamageClass;
  kind: AttackKind;
  // Representative time between uses of this attack (windup + strike + recover +
  // cooldown, or the ambush re-arm cycle) — a best-estimate for the cadence/DPS
  // display column, NOT a core ratio. First-pass; refine if a cadence read looks off.
  intervalMs: number;
  projectileSpeed?: number; // ranged only
  homing?: boolean; // curving projectile (Corpselight)
  bleedDps?: number;
  poisonDps?: number;
}

// Elite variant multipliers. The roster standard is +50% HP/dmg, +10% speed;
// scale varies per creature (a swarm Murkling barely grows, a Mirejaw doubles).
export interface EliteMods {
  hp: number;
  damage: number;
  speed: number;
  scale: number;
}
const STD_ELITE = (scale: number): EliteMods => ({ hp: 1.5, damage: 1.5, speed: 1.1, scale });

export interface EnemyStat {
  id: string;
  name: string;
  biome: EnemyBiome;
  role: EnemyRole;
  hp: number;
  scale: number; // base sprite scale (affects hitbox/reach, not damage)
  moveSpeed: number; // primary sustained chase / pursue / approach / drift speed (px/s)
  burstSpeed?: number; // pounce / charge / lunge / roll peak (px/s)
  attacks: EnemyAttackStat[];
  poise: number | null; // stagger threshold; null = cannot be staggered (heat/tether/blood-phase bosses, all trash)
  poiseRegenPerSec?: number;
  resistances?: Partial<Record<EnemyDamageClass | "slash" | "blunt" | "pierce" | "ranged", number>>;
  elite: EliteMods | null; // null = no elite variant (bosses/minibosses)
  packAggro?: boolean;
}

// ===== FOREST (biome 1) =====
const FOREST: EnemyStat[] = [
  {
    id: "boar", name: "Boar", biome: "forest", role: "normal", hp: 20, scale: 1,
    moveSpeed: 60, burstSpeed: 270,
    attacks: [
      { name: "Gore", damage: 25, cls: "physical", kind: "melee", intervalMs: 1170 },
      { name: "Charge", damage: 25, cls: "physical", kind: "aoe", intervalMs: 1890 },
    ],
    poise: null, elite: STD_ELITE(1.3),
  },
  {
    id: "snake", name: "Snake", biome: "forest", role: "normal", hp: 11, scale: 1,
    moveSpeed: 150, // strike lunge; not a sustained chaser
    attacks: [{ name: "Ambush bite", damage: 20, cls: "physical", kind: "melee", intervalMs: 5000 }],
    poise: null, elite: STD_ELITE(1.3),
  },
  {
    id: "ranged_gremlin", name: "Gremlin (ranged)", biome: "forest", role: "normal", hp: 32, scale: 1,
    moveSpeed: 70,
    attacks: [
      { name: "Rock (x2 burst)", damage: 11, cls: "physical", kind: "ranged", intervalMs: 1200, projectileSpeed: 220 },
      { name: "Claw", damage: 15, cls: "physical", kind: "melee", intervalMs: 900 },
    ],
    poise: null, elite: STD_ELITE(1.4),
  },
  {
    id: "melee_gremling", name: "Gremling (melee)", biome: "forest", role: "normal", hp: 12, scale: 1,
    moveSpeed: 70,
    attacks: [{ name: "Claw", damage: 12, cls: "physical", kind: "melee", intervalMs: 900 }],
    poise: null, elite: STD_ELITE(1.4),
  },
  {
    id: "gremlin_king", name: "Gremlin King", biome: "forest", role: "boss", hp: 600, scale: 2.4,
    moveSpeed: 45, burstSpeed: 480,
    attacks: [
      { name: "Leaping smash", damage: 60, cls: "physical", kind: "aoe", intervalMs: 950 },
      { name: "Charge", damage: 55, cls: "physical", kind: "aoe", intervalMs: 950 },
      { name: "Ground slam", damage: 55, cls: "physical", kind: "aoe", intervalMs: 950 },
    ],
    poise: 100, poiseRegenPerSec: 15, elite: null,
  },
];

// ===== BADLANDS (biome 2) =====
const BADLANDS: EnemyStat[] = [
  {
    id: "duskrunner", name: "Duskrunner", biome: "badlands", role: "normal", hp: 20, scale: 1,
    moveSpeed: 92, burstSpeed: 330, packAggro: true,
    attacks: [{ name: "Bite", damage: 42, cls: "physical", kind: "melee", intervalMs: 700 }],
    poise: null, elite: STD_ELITE(1.3),
  },
  {
    id: "cragscale", name: "Cragscale", biome: "badlands", role: "normal", hp: 60, scale: 1,
    moveSpeed: 40, burstSpeed: 300,
    attacks: [
      { name: "Basher", damage: 48, cls: "physical", kind: "melee", intervalMs: 1200 },
      { name: "Rolling charge", damage: 48, cls: "physical", kind: "aoe", intervalMs: 1600 },
    ],
    poise: null, resistances: { slash: 0.5, pierce: 1.25, fire: 0.5 }, elite: STD_ELITE(1.3),
  },
  {
    id: "hexling", name: "Hexling", biome: "badlands", role: "normal", hp: 95, scale: 1,
    moveSpeed: 46,
    attacks: [
      { name: "Hex bolt", damage: 16, cls: "magic", kind: "ranged", intervalMs: 1600, projectileSpeed: 210 },
      { name: "Flame strike", damage: 40, cls: "magic", kind: "aoe", intervalMs: 1400 },
    ],
    poise: null, resistances: { magic: 1.25, fire: 1.25 }, elite: STD_ELITE(1.3),
  },
  {
    id: "sandmaw", name: "Sandmaw", biome: "badlands", role: "normal", hp: 45, scale: 1,
    moveSpeed: 30, // submerged stalk; surfaces to erupt
    attacks: [{ name: "Sand eruption", damage: 46, cls: "physical", kind: "aoe", intervalMs: 3500 }],
    poise: null, resistances: { pierce: 0.5, blunt: 1.25, fire: 0.5 }, elite: STD_ELITE(1.3),
  },
  {
    id: "cinderwrought", name: "Cinderwrought", biome: "badlands", role: "miniboss", hp: 650, scale: 1.8,
    moveSpeed: 52,
    attacks: [
      { name: "Cinder cone", damage: 44, cls: "fire", kind: "aoe", intervalMs: 900 },
      { name: "Forge hammer", damage: 52, cls: "fire", kind: "aoe", intervalMs: 900 },
    ],
    poise: null, elite: null,
  },
  {
    id: "gloamwarden", name: "Gloamwarden", biome: "badlands", role: "miniboss", hp: 260, scale: 1.7,
    moveSpeed: 55,
    attacks: [
      { name: "Leaping smash", damage: 22, cls: "physical", kind: "aoe", intervalMs: 1400 },
      { name: "Gloam eruption", damage: 24, cls: "physical", kind: "aoe", intervalMs: 1400 },
    ],
    poise: 60, poiseRegenPerSec: 10, elite: null,
  },
  {
    id: "duneshaper", name: "Duneshaper", biome: "badlands", role: "boss", hp: 2500, scale: 2.3,
    moveSpeed: 48,
    attacks: [
      { name: "Gloam volley (x3)", damage: 22, cls: "magic", kind: "ranged", intervalMs: 1600, projectileSpeed: 460 },
      { name: "Sand spikes", damage: 56, cls: "physical", kind: "aoe", intervalMs: 1600 },
      { name: "Blink nova", damage: 50, cls: "magic", kind: "aoe", intervalMs: 1600 },
      { name: "Gloamfire lance", damage: 54, cls: "magic", kind: "aoe", intervalMs: 1600 },
      { name: "Sunscorch barrage", damage: 34, cls: "magic", kind: "aoe", intervalMs: 1600 },
    ],
    poise: 400, poiseRegenPerSec: 15, resistances: { fire: 1.25 }, elite: null,
  },
];

// ===== BAYOU (biome 3) =====
const BAYOU: EnemyStat[] = [
  {
    // HP 320→260 (D10, 2026-07-23): bayou commons had crept up on the crypt
    // wardens guarding their own doors (miniboss÷toughest-common was 1.0-1.5×
    // where badlands runs 2.7-6.8×) — see enemyStats.ts's own note below on the
    // miniboss trio for the full ratio table. Damage untouched; it was fine.
    id: "mirejaw", name: "Mirejaw", biome: "bayou", role: "normal", hp: 260, scale: 1.55,
    // Chase 138 = the Geared sprint (couldn't disengage); 108 is kiteable while
    // the 560 lunge (telegraphed, dodgeable) is how it closes. Lunge 120→80 and
    // chomp 85→52 so a caught hit is a heavy punish, not a one-shot (2026-07-23).
    moveSpeed: 108, burstSpeed: 560,
    attacks: [
      { name: "Chomp", damage: 52, cls: "physical", kind: "melee", intervalMs: 1200, bleedDps: 6 },
      { name: "Lunge", damage: 80, cls: "physical", kind: "aoe", intervalMs: 3750, bleedDps: 9 },
      // C1 (2026-07-23): the signature DEATH ROLL. the user: the Mirejaw "feels
      // like a glorified boar" — lunge-then-bite is exactly a Boar's kit. This
      // is the move that makes it a gator: a landed chomp latches and thrashes,
      // ticking damage+bleed in a tight radius, then leaves it planted for a
      // long punish window. Per-tick damage is modest; being held through all 3
      // is what hurts. Long cooldown, so it's a signature moment, not every bite.
      { name: "Death roll (3 ticks, latched)", damage: 18, cls: "physical", kind: "aoe", intervalMs: 7000, bleedDps: 7 },
    ],
    poise: null, resistances: { pierce: 0.5, slash: 1.25 }, elite: STD_ELITE(2.0),
  },
  {
    // HP 150→130 (D10). See Mirejaw's note above.
    id: "blighttoad", name: "Blighttoad", biome: "bayou", role: "normal", hp: 130, scale: 1.3,
    moveSpeed: 300, // hops in bursts (150px hops); not a steady walk
    // Bite 66→44 (the poison is the payload, not the bite); poison per-stack 6→4
    // with a hard 3-stack cap so a swarm can't melt you (2026-07-23 rebalance).
    attacks: [{ name: "Toxic bite", damage: 44, cls: "physical", kind: "melee", intervalMs: 1200, poisonDps: 4 }],
    poise: null, resistances: { magic: 0.6, fire: 1.25 }, elite: STD_ELITE(1.3),
  },
  {
    // HP 420→300 (D10) — the outlier that started the audit: it was the
    // exact same HP as the Palewake miniboss next to it. See Mirejaw's note above.
    id: "mosswretch", name: "Mosswretch", biome: "bayou", role: "normal", hp: 300, scale: 1.35,
    moveSpeed: 74,
    // Smash 135 (elite 202) one-shot a full-Embersteel player. 78 (elite 117 →
    // ~85 net through 32 armor) is a big telegraphed heavy that costs ~60% HP,
    // not a kill — the bruiser still hits like a truck, just survivably (2026-07-23).
    attacks: [
      { name: "Smash", damage: 78, cls: "physical", kind: "melee", intervalMs: 1600 },
      // C2 (2026-07-23): the user — "[Mosswretch] lacks attack moves... feels a
      // bit weird." It had exactly one. The spore burst is the answer to its own
      // core problem: it is the slowest thing in the game and cannot catch you,
      // so instead of chasing it DENIES GROUND — a lingering cloud that slows
      // and poisons, used at mid-range to cut off your escape and set up the
      // smash you can no longer simply walk out of. No direct impact damage;
      // the cloud is the whole payload.
      { name: "Spore burst (lingering cloud: slow + poison)", damage: 0, cls: "physical", kind: "aoe", intervalMs: 9000, poisonDps: 5 },
    ],
    poise: null, resistances: { blunt: 0.5, slash: 1.25, fire: 1.5 }, elite: STD_ELITE(1.75),
  },
  {
    id: "murkling", name: "Murkling", biome: "bayou", role: "normal", hp: 40, scale: 0.85,
    // 172 outran the player's sprint (un-kiteable); 118 sits under even the Mid
    // sprint (124) so a swarm can be out-walked. Claw 62→38 — swarm damage should
    // be chip that adds up, not a per-hit spike (2026-07-23 rebalance).
    moveSpeed: 118, packAggro: true,
    attacks: [{ name: "Claw", damage: 38, cls: "physical", kind: "melee", intervalMs: 900 }],
    poise: null, elite: STD_ELITE(1.15),
  },
  {
    // HP 190→160 (D10). See Mirejaw's note above.
    id: "corpselight", name: "Corpselight", biome: "bayou", role: "normal", hp: 160, scale: 1.3,
    moveSpeed: 85,
    // Orb 34 magic (armor can't touch it) + homing every 1.9s read as "so much
    // damage" — 22 magic is a real poke you can't just tank, and the entity's
    // homing turn-rate is loosened so the orb is dodgeable by movement (2026-07-23).
    attacks: [
      { name: "Homing orb (wisp form)", damage: 22, cls: "magic", kind: "ranged", intervalMs: 1900, projectileSpeed: 170, homing: true },
      // C3 (2026-07-23): the TRANSFORM. the user — "make that guy cooler besides
      // just a ranged gremlin... maybe it transforms when you get within melee
      // range to a bigger melee focused dude with more HP." Close to melee and
      // the wisp COLLAPSES into the drowned corpse the light was luring you to:
      // bigger, slow, and it hits with a real physical maul (armor answers this
      // form, unlike the armor-bypassing orb). Back off and it dissolves back.
      // One shared HP pool; the husk just takes reduced damage. attacks[1] =
      // husk maul (physical), attacks[2] = the collapse drop-slam (magic AoE the
      // transform-in deals). The dissolve puff is a fraction of the slam.
      { name: "Husk maul (melee, corporeal form)", damage: 30, cls: "physical", kind: "melee", intervalMs: 1300 },
      { name: "Collapse slam (magic AoE on transform)", damage: 26, cls: "magic", kind: "aoe", intervalMs: 4000 },
    ],
    poise: null, resistances: { fire: 1.25, magic: 1.25 }, elite: STD_ELITE(1.3),
  },
  // Fenlurker (bayou burrower) CUT 2026-07-23 — the user found it boring to fight;
  // the Sandmaw already owns the burrow-ambush niche. Entity + spawns removed.
  // D10 (2026-07-23) — the bayou common→miniboss gap. Measured: miniboss HP ÷
  // toughest common was 1.0-1.5× here vs 2.7-6.8× in badlands (Gloamwarden/
  // Cinderwrought vs the 95-HP Hexling), because bayou COMMONS had scaled ×4.1
  // from badlands while these three minibosses only moved ×1.08 — Mosswretch at
  // 420 HP was literally IDENTICAL to Palewake, so a crypt warden read as no
  // tougher than the trash guarding its own door. Fixed from BOTH ends per the
  // locked, revised-EVEN split (commons -15-30% above, wardens roughly double
  // here) rather than wardens alone: matching badlands ratios against the OLD
  // 420-HP Mosswretch would have put Sanguinarch at ~2860 HP — 79% of the
  // Miretyrant's own HP, on something fought across 18 crypts. Result: spread
  // 2.8-4.5× (badlands 2.7-6.8×), miniboss→boss 3.4× (badlands 5.5×). The
  // Miretyrant itself is untouched — it died in ~1 minute to the lifesteal
  // loop (see D2), not because its own HP was wrong.
  {
    // HP 420→850 (2.8× the new 300-HP Mosswretch, the toughest common).
    id: "palewake", name: "Palewake", biome: "bayou", role: "miniboss", hp: 850, scale: 1.5,
    moveSpeed: 96, // HP 240→420: died in ~4 Embersteel hits, too easy for a build-defining crypt warden (2026-07-23)
    // Tether 10→14/s so it clears the commons' own damage now that the fight
    // (per its own higher HP) runs longer.
    attacks: [{ name: "Drain tether", damage: 14, cls: "magic", kind: "dot", intervalMs: 1000 }],
    poise: null, elite: null,
  },
  {
    // HP 440→1000 (3.3× the toughest common).
    id: "kilnborn", name: "Kilnborn", biome: "bayou", role: "miniboss", hp: 1000, scale: 1.6,
    moveSpeed: 50, // HP 300→440 for parity with Palewake — build-defining crypt fights should last (2026-07-23)
    attacks: [
      { name: "Flame lash", damage: 30, cls: "fire", kind: "melee", intervalMs: 1400 },
      { name: "Backdraft", damage: 72, cls: "fire", kind: "aoe", intervalMs: 2000 }, // 58→72
      { name: "Burning ground", damage: 7, cls: "fire", kind: "dot", intervalMs: 1000 },
    ],
    poise: null, resistances: { blunt: 0.75, pierce: 1.25, fire: 0.4 }, elite: null,
  },
  {
    // Was HP 420 / Slash 15 / Slam 50 — LESS damage and barely more HP than the
    // common Mirejaw next to it (320 HP, 52/80), so the crypt warden read as
    // weaker than the trash guarding the way in (the user: "sanguinarch does less
    // dmg and has less hp than the alligators. can't even tell what it's doing").
    // HP 620→1350 (4.5× the toughest common) — the widest gap of the three,
    // matching its position as the crypt trio's own toughest fight.
    id: "sanguinarch", name: "Sanguinarch", biome: "bayou", role: "miniboss", hp: 1350, scale: 1.5,
    moveSpeed: 88, // HP 280→420 for parity with the other crypt wardens (2026-07-23)
    attacks: [
      { name: "Slash", damage: 34, cls: "physical", kind: "melee", intervalMs: 900 },
      { name: "Slam", damage: 88, cls: "physical", kind: "aoe", intervalMs: 1600 }, // 72→88
    ],
    poise: null, resistances: { slash: 1.3, blunt: 0.75 }, elite: null,
  },
  {
    id: "miretyrant", name: "Miretyrant", biome: "bayou", role: "boss", hp: 3600, scale: 2.6,
    moveSpeed: 66, burstSpeed: 300,
    // Its physical hits (46-58) were gutted to -1/-2 by flat armor + the 75%
    // reduction cap, so the win-con boss "did nothing". Bumped so each lands ~35-63
    // net through 32 armor — a real threat, ~2-3 hits. Poise 450→800 + regen
    // 15→28 stops the sword perma-stagger (stagger stays earnable, not a lock).
    // HP 4600→3600 so a fair fight isn't a 110s marathon (2026-07-23 rebalance).
    attacks: [
      // Re-bumped: the previous pass tuned these against 32 armor, but a geared
      // player now carries 50-74 flat armor (full Gloamsteel plus its reforge
      // levels), which ate almost all of it again — the user reported the same
      // "minimal damage" a second run running. Sized so the win-con boss lands
      // 35-55 net through 74 armor and stays lethal, not survivable-by-stat.
      { name: "Chomp", damage: 110, cls: "physical", kind: "melee", intervalMs: 1100 },
      { name: "Tail sweep", damage: 98, cls: "physical", kind: "aoe", intervalMs: 1100 },
      { name: "Slam", damage: 124, cls: "physical", kind: "aoe", intervalMs: 1100 },
      { name: "Death roll", damage: 92, cls: "physical", kind: "aoe", intervalMs: 1100 },
    ],
    poise: 800, poiseRegenPerSec: 28, resistances: { slash: 0.8, blunt: 1.2, poison: 0.25 }, elite: null,
  },
];

export const ALL_ENEMY_STATS: EnemyStat[] = [...FOREST, ...BADLANDS, ...BAYOU];

export const ENEMY_STATS: Record<string, EnemyStat> = Object.fromEntries(
  ALL_ENEMY_STATS.map((e) => [e.id, e]),
);

// Look up a record by id, throwing on a typo so a mis-wired entity fails loudly
// at construction rather than silently reading `undefined`.
export function enemyStat(id: string): EnemyStat {
  const s = ENEMY_STATS[id];
  if (!s) throw new Error(`enemyStat: unknown enemy id "${id}"`);
  return s;
}

// Best single-attack "DPS" (damage / interval) for a cadence display — the max
// across the enemy's attacks, since that's the threat that matters. Excludes DoT
// ticks (they're annotated separately). First-pass display metric, not a ratio input.
export function enemyBurstDps(e: EnemyStat): number {
  const hits = e.attacks.filter((a) => a.kind !== "dot");
  if (hits.length === 0) return 0;
  return Math.max(...hits.map((a) => (a.damage / a.intervalMs) * 1000));
}
