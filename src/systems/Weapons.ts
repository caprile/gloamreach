export type WeaponType =
  | "wood_club"
  | "stone_club"
  | "bone_knife"
  | "primal_spear"
  | "slingshot"
  | "javelin"
  // forged tier (biome 2 Phase 4) — one per melee damage type
  | "sunsteel_warhammer"
  | "sunsteel_sword"
  | "sunsteel_pike"
  // forged RANGED (biome 2 Phase 4 / S8) — a badlands bow a tier above the Slingshot
  | "sunsteel_warbow"
  // enhanced/T2 tier (biome 2 Phase 4 Session 2) — reforged with Embersteel
  | "embersteel_warhammer"
  | "embersteel_sword"
  | "embersteel_pike"
  // enhanced/T2 RANGED (S8) — the Sunsteel Warbow reforged with ember-steel
  | "embersteel_warbow"
  // the first MAGIC weapon — a rare-ore-exclusive melee fire brand
  | "ember_brand"
  // bayou tier (biome 3 Phase 3) — the Ember tier reforged with Gloamsteel.
  // No new base weapons: each of these consumes its Ember counterpart.
  | "gloamsteel_warhammer"
  | "gloamsteel_sword"
  | "gloamsteel_pike"
  | "gloamsteel_warbow"
  | "gloam_brand"
  // the bayou's bespoke magic weapon (NOT a reforge of anything) - the only
  // weapon that lifelinks on every hit
  | "gloamdrinker"
  // Mirebronze (B4-P5) — the SUNSTEEL branch. Bayou-grade gear reforged straight
  // from the Sunsteel weapons, so skipping the Embersteel tier is a different
  // route rather than a dead end.
  | "mirebronze_warhammer"
  | "mirebronze_sword"
  | "mirebronze_pike";

// Damage types double as the 5 weapon Skill types (Skills.ts) — a weapon's
// primary (first) type routes its on-hit skill XP. Multiple types are
// allowed for future weapons with mixed damage; only the first counts today.
export type DamageType = "slash" | "blunt" | "pierce" | "ranged" | "magic";

// Damage types an ENEMY (or the environment) can deal to the player. A superset
// of the weapon DamageType (which doubles as the weapon-skill keys) — the world
// can also deal elemental "fire" (the Cinderwrought) and "poison" (biome 3's
// miasma + bayou creatures), neither of which is a player weapon skill, so they
// live here rather than polluting DamageType/SkillType. All three bypass the
// player's flat armor (see MainScene.applyDamageToPlayer).
export type IncomingDamageType = DamageType | "fire" | "poison";

// Poison is a SUBTYPE OF MAGIC (locked, the user): mechanically it inherits every
// magic rule — it bypasses flat armor and is reduced by the same heavy-armor
// magic mitigation / Gloamweave Lining channel — while carrying its own identity
// on top (it ticks over time and suppresses HP regen while active). Anything that
// asks "is this magic?" for MITIGATION purposes must use this helper, not
// `=== "magic"`, or poison silently escapes the magic defenses.
export function isMagicFamily(type: IncomingDamageType): boolean {
  return type === "magic" || type === "poison";
}

// Whether an incoming type ignores the flat-armor term (relic %-reduction +
// floor-at-1 still apply). The elemental types: magic (and its poison subtype)
// plus fire.
export function bypassesArmor(type: IncomingDamageType): boolean {
  return isMagicFamily(type) || type === "fire";
}

const WEAPON_DAMAGE_TYPES: Record<WeaponType, DamageType[]> = {
  wood_club: ["blunt"],
  stone_club: ["blunt"],
  bone_knife: ["slash"],
  primal_spear: ["pierce"],
  slingshot: ["ranged"],
  javelin: ["ranged"],
  sunsteel_warhammer: ["blunt"],
  sunsteel_sword: ["slash"],
  sunsteel_pike: ["pierce"],
  sunsteel_warbow: ["ranged"],
  embersteel_warhammer: ["blunt"],
  embersteel_sword: ["slash"],
  embersteel_pike: ["pierce"],
  embersteel_warbow: ["ranged"],
  ember_brand: ["magic"],
  gloamsteel_warhammer: ["blunt"],
  gloamsteel_sword: ["slash"],
  gloamsteel_pike: ["pierce"],
  gloamsteel_warbow: ["ranged"],
  gloam_brand: ["magic"],
  gloamdrinker: ["magic"],
  // Mirebronze — the Sunsteel branch (B4-P5). Same three identities as every
  // forged tier: blunt sweeper, slash sweeper, pierce single-target.
  mirebronze_warhammer: ["blunt"],
  mirebronze_sword: ["slash"],
  mirebronze_pike: ["pierce"],
};
export function weaponDamageTypes(weapon: WeaponType): DamageType[] {
  return WEAPON_DAMAGE_TYPES[weapon];
}
export function weaponPrimaryDamageType(weapon: WeaponType): DamageType {
  return WEAPON_DAMAGE_TYPES[weapon][0];
}

// Ranged starts deliberately weak — an opener/softener, not a solo tool (locked
// design). Slingshot's 2 dmg is below even wood_club's 3; Javelin's 5 sits
// roughly at a starter melee weapon's level but burns a craftable per throw
// and costs more stamina. Build-dedication into the Ranged skill (dormant
// until now — weaponSkillDamageMultiplier) is what turns this chip damage
// into real damage over a run.
const WEAPON_DAMAGE: Record<WeaponType, number> = {
  wood_club: 3,
  stone_club: 5,
  bone_knife: 4,
  // Pierce = highest single-target (S7 identity). primal_spear already tops
  // its tier's single-target DPS; the forged pikes are bumped below so pierce
  // edges out the slash sword on single-target while staying near-useless vs
  // packs (tiny arc). Paired with the best base crit in Weapons.ts.
  primal_spear: 8,
  slingshot: 2,
  javelin: 5,
  // Base forged tier — every one clears the max-UPGRADED Primal Spear (13)
  // so freshly-forged gear always out-hits maxed starter gear (S1 rebalance;
  // the old 10/12 sword/pike sat below 13, which read as a downgrade).
  sunsteel_warhammer: 17,
  sunsteel_sword: 14,
  sunsteel_pike: 19, // S7: pierce single-target king — edges out the sword's DPS
  // Forged ranged. D3 (2026-07-23) bumped these +40% AND cut their cooldowns
  // 25%, off the user calling bow damage and rate of fire "abysmal". The
  // cooldown half of that was right and is untouched; the damage half
  // overshot — it put every bow ABOVE its same-tier sword on per-hit damage
  // (15>14, 21>19, 28>25) at 92-98% of its DPS, from 380-420px away with no
  // risk. the user, 2026-07-24: "no reason why longsword should be dealing less
  // dmg than the bow" / "feels better with just melee... ranged makes it super
  // easy." Each bow now sits clearly under its tier's sword per hit and at
  // ~73% of its DPS — range and safety ARE the compensation, so they cannot
  // also be the bigger number.
  sunsteel_warbow: 12,
  // Enhanced tier: a real step over the base forged numbers (~+35-45%).
  embersteel_warhammer: 23,
  embersteel_sword: 19,
  embersteel_pike: 25, // S7: keeps pierce the single-target DPS leader at T2 (>= sunsteel_pike + 5 invariant)
  embersteel_warbow: 16,
  // The magic brand's raw number sits mid-pack; its DPS lands near the
  // Embersteel Pike on a NEUTRAL target, but its "magic" type is shrugged off
  // (~x0.4-0.5) by the gloam-casters (Hexlings, the Duneshaper). It's the only
  // `magic` weapon-skill source — a sidegrade with an upside, not flatly best.
  ember_brand: 17,
  // Bayou tier — another ~+30% over the Ember numbers, holding every S7
  // identity invariant (pierce stays the single-target leader, slash the
  // sweeper, blunt the cripple, the brand a resisted-but-armor-ignoring sidegrade).
  gloamsteel_warhammer: 30,
  gloamsteel_sword: 25,
  gloamsteel_pike: 32,
  gloamsteel_warbow: 21,
  gloam_brand: 29,
  // Deliberately BELOW the Gloam Brand: its per-hit lifelink is the payoff,
  // so it trades raw numbers for sustain rather than adding both.
  gloamdrinker: 19,
  // Sits BETWEEN the Embersteel and Gloamsteel numbers — the Sunsteel route is
  // real endgame gear, but the Embersteel route stays the better one (locked
  // decision 4: the reward for the longer road is simply bigger numbers).
  mirebronze_warhammer: 26,
  mirebronze_sword: 22,
  mirebronze_pike: 28,
};
export function weaponDamage(weapon: WeaponType): number {
  return WEAPON_DAMAGE[weapon];
}

// D3 (2026-07-23): the three Warbows' cooldowns cut 25% alongside their +40%
// damage bump above — the user: bow rate of fire AND damage were both
// "abysmal." Every other weapon's cooldown is untouched.
const WEAPON_COOLDOWN_MS: Record<WeaponType, number> = {
  wood_club: 450,
  stone_club: 550,
  bone_knife: 350,
  primal_spear: 650,
  slingshot: 650,
  javelin: 900,
  sunsteel_warhammer: 800,
  sunsteel_sword: 480,
  sunsteel_pike: 620,
  sunsteel_warbow: 560, // D3: was 750 (-25%)
  embersteel_warhammer: 800,
  embersteel_sword: 470,
  embersteel_pike: 610,
  embersteel_warbow: 545, // D3: was 730 (-25%)
  ember_brand: 520,
  gloamsteel_warhammer: 800,
  gloamsteel_sword: 470,
  gloamsteel_pike: 610,
  gloamsteel_warbow: 540, // D3: was 720 (-25%)
  gloam_brand: 520,
  gloamdrinker: 560,
  mirebronze_warhammer: 800,
  mirebronze_sword: 470,
  mirebronze_pike: 610,
};
export function weaponCooldownMs(weapon: WeaponType): number {
  return WEAPON_COOLDOWN_MS[weapon];
}

// Costs scaled to ~0.7x across the board (the user: "weapon stam usage is way
// too high even for spears... I shouldn't have to put a million points into stam
// just to have basic combat"). The RELATIVE ladder is untouched — each tier is
// still a clear step up, which was his own earlier ask — this only lowers the
// baseline. The arithmetic that made it bite: a 16-cost Primal Spear against the
// old 100 base pool is SIX swings, and because the post-spend regen delay
// re-arms on every swing, sustained attacking regenerates nothing at all. Six
// swings then a wait is not "basic combat", and Endurance was effectively a tax
// for showing up rather than a build choice. Paired with the base pool going
// 100 -> 130 (Stamina.ts).
const WEAPON_STAMINA_COST: Record<WeaponType, number> = {
  wood_club: 7,
  stone_club: 10,
  bone_knife: 6,
  primal_spear: 11,
  slingshot: 4,
  javelin: 11,
  // Higher-tier weapons cost more stamina (the user) — the ember tier was barely
  // above steel (13 vs 12). Now each tier is a clear step up, so the bigger
  // weapon is a real commitment, not a free upgrade: starter < Sunsteel < Ember.
  sunsteel_warhammer: 15,
  sunsteel_sword: 11,
  sunsteel_pike: 13,
  sunsteel_warbow: 8,
  embersteel_warhammer: 19,
  embersteel_sword: 13,
  embersteel_pike: 15,
  embersteel_warbow: 11,
  ember_brand: 14,
  // Each tier is a real commitment, not a free upgrade: Sunsteel < Ember < Gloam.
  gloamsteel_warhammer: 22,
  gloamsteel_sword: 15,
  gloamsteel_pike: 18,
  gloamsteel_warbow: 12,
  gloam_brand: 16,
  gloamdrinker: 14,
  mirebronze_warhammer: 20,
  mirebronze_sword: 17,
  mirebronze_pike: 18,
};
export function weaponStaminaCost(weapon: WeaponType): number {
  return WEAPON_STAMINA_COST[weapon];
}

export function weaponAttacksPerSecond(weapon: WeaponType): number {
  return 1000 / WEAPON_COOLDOWN_MS[weapon];
}

export function damageTypeDisplayName(type: IncomingDamageType): string {
  return type.charAt(0).toUpperCase() + type.slice(1);
}

// Per-weapon base crit (M-SS). This is where "base crit" lives — grounded
// per-weapon rather than one arbitrary global player constant. As of S7, crit
// is a PIERCE identity axis first (spears/pikes get clearly the best base crit
// — the single-target payoff that pairs with their tiny arc), with a mild
// attack-speed lean underneath (blunt/slash stay modest since their payoff is
// the movement-slow debuff / the wide AOE arc respectively). Strength (crit
// mult) / Agility (crit chance) stats and relic crit channels ADD on top of
// these bases; the totals are soft-capped in MainScene's crit roll (chance
// 60%, mult 3.0x).
const WEAPON_BASE_CRIT_CHANCE: Record<WeaponType, number> = {
  // Slash — modest crit; identity is the wide AOE arc, not the burst.
  bone_knife: 0.05,
  sunsteel_sword: 0.05,
  embersteel_sword: 0.06,
  // Blunt — modest crit; identity is the cripple/slow debuff.
  wood_club: 0.04,
  stone_club: 0.04,
  sunsteel_warhammer: 0.05,
  embersteel_warhammer: 0.05,
  // Ranged — slingshot/javelin unchanged; the forged bows crit a touch better
  // than the starter launchers (a forged-tier perk), still below the pierce kings.
  slingshot: 0.05,
  javelin: 0.05,
  sunsteel_warbow: 0.07,
  embersteel_warbow: 0.08,
  // Pierce — the crit kings (single-target identity).
  primal_spear: 0.1,
  sunsteel_pike: 0.1,
  embersteel_pike: 0.11,
  // Magic — mid.
  ember_brand: 0.07,
  // Bayou tier — a hair above its Ember counterpart, identities unchanged.
  gloamsteel_sword: 0.07,
  gloamsteel_warhammer: 0.06,
  gloamsteel_warbow: 0.09,
  gloamsteel_pike: 0.12,
  gloam_brand: 0.08,
  gloamdrinker: 0.07,
  mirebronze_warhammer: 0.05,
  mirebronze_sword: 0.06,
  mirebronze_pike: 0.08,
};
const WEAPON_BASE_CRIT_MULT: Record<WeaponType, number> = {
  bone_knife: 1.5,
  sunsteel_sword: 1.5,
  embersteel_sword: 1.55,
  wood_club: 1.5,
  stone_club: 1.5,
  sunsteel_warhammer: 1.55,
  embersteel_warhammer: 1.6,
  slingshot: 1.5,
  javelin: 1.5,
  sunsteel_warbow: 1.55,
  embersteel_warbow: 1.6,
  // Pierce — highest crit multiplier too, so a pike crit is a genuine nuke.
  primal_spear: 1.7,
  sunsteel_pike: 1.7,
  embersteel_pike: 1.75,
  ember_brand: 1.6,
  gloamsteel_sword: 1.6,
  gloamsteel_warhammer: 1.62,
  gloamsteel_warbow: 1.62,
  gloamsteel_pike: 1.8,
  gloam_brand: 1.62,
  gloamdrinker: 1.6,
  mirebronze_warhammer: 1.6,
  mirebronze_sword: 1.55,
  mirebronze_pike: 1.62,
};
export function weaponBaseCritChance(weapon: WeaponType): number {
  return WEAPON_BASE_CRIT_CHANCE[weapon];
}
export function weaponBaseCritMult(weapon: WeaponType): number {
  return WEAPON_BASE_CRIT_MULT[weapon];
}

// A ranged weapon fires a Projectile instead of applying damage instantly at
// melee reach — see MainScene.tryRangedAttack. Absent for every melee weapon
// (isRangedWeapon is a plain key-presence check). Deliberately slow
// projectile speeds + a bounded range are part of the anti-kite governor
// alongside stamina cost (locked design) — no enemy-AI changes this batch.
export interface RangedWeaponConfig {
  projectileSpeed: number; // px/s
  maxRangePx: number; // replaces melee reach for both the attack gate + hover prompt
  // What firing costs, in items.
  //   "none" — nothing; the weapon just fires (every launcher and bow).
  //   "self" — consumes one from its own equipped hotbar stack (the Javelin,
  //            which IS the projectile rather than launching a separate one).
  //
  // Consumable AMMO was removed entirely (the user, twice: "I'm contemplating
  // getting rid of ammo and just letting ranged weapons have infinite ammo" /
  // "I think we should get rid of the resource / arrows restriction"). It never
  // governed anything — stamina, bounded range and attack speed are the real
  // anti-kite levers — while costing a dedicated equipment slot, three craftable
  // items, a reconcile routine to keep the slot honest, and the class of bug
  // where reforging a bow silently unloaded arrows it could no longer draw.
  ammo: "none" | "self";
  projectileTexture: string;
  // Rotation offset (radians) for the in-flight sprite when its art's "forward"
  // isn't +x — the javelin streak points up, so +90° makes it fly nose-first.
  projectileArtAngleOffset?: number;
}

const RANGED_WEAPONS: Partial<Record<WeaponType, RangedWeaponConfig>> = {
  slingshot: { projectileSpeed: 420, maxRangePx: 260, ammo: "none", projectileTexture: "pellet_projectile" },
  javelin: { projectileSpeed: 300, maxRangePx: 220, ammo: "self", projectileTexture: "javelin_projectile", projectileArtAngleOffset: Math.PI / 2 },
  // S8 bows — longer reach + faster arrows than the slingshot: the bow is the
  // badlands ranged upgrade. The arrow art points +x, so no artAngleOffset.
  // Each keeps its own arrow TEXTURE (a gloamsteel bow still visibly looses a
  // gloamsteel shaft) now that the arrow ITEM behind it is gone.
  sunsteel_warbow: { projectileSpeed: 600, maxRangePx: 380, ammo: "none", projectileTexture: "arrow_projectile" },
  embersteel_warbow: { projectileSpeed: 640, maxRangePx: 400, ammo: "none", projectileTexture: "ember_arrow_projectile" },
  gloamsteel_warbow: { projectileSpeed: 680, maxRangePx: 420, ammo: "none", projectileTexture: "gloam_arrow_projectile" },
};

export function rangedWeaponConfig(weapon: WeaponType): RangedWeaponConfig | undefined {
  return RANGED_WEAPONS[weapon];
}

export function isRangedWeapon(weapon: WeaponType): boolean {
  return weapon in RANGED_WEAPONS;
}

// Per-weapon melee AOE arc (Biome 2 Phase 1, locked decision 6). A melee swing
// hits its primary hovered target at full damage, then sweeps any other enemies
// within `range` px of the player AND within ±`halfAngleDeg` of the direction to
// that primary target, dealing `primary × falloff` to each. Ranged weapons never
// sweep (`range: 0`, and they never reach tryMeleeAttack anyway).
//
// S7 weapon-identity redesign (locked): the arc axis is now what separates the
// three melee damage types (previously largely inverted — spears were the
// WIDEST sweepers, swords near single-target).
//   • SLASH (knife/sword)  = biggest arc + best AOE (the crowd-clearer).
//   • BLUNT (club/warhammer) = lower-medium arc (payoff is the movement-slow
//     debuff applied in MainScene.resolveWeaponHit, not the sweep).
//   • PIERCE (spear/pike)  = lowest/near-single-target arc (payoff is the
//     highest single-target damage + best crit).
//   • MAGIC (ember_brand)  = medium — fire washes over nearby foes.
// First-pass numbers — tunable. Pairs with the Phase 2 swarm enemies.
export interface WeaponArc {
  halfAngleDeg: number; // half-width of the cone, each side of the swing direction
  range: number; // px from the player a secondary target must be within (0 = no sweep)
  falloff: number; // secondary-target damage as a fraction of the primary hit
}
const WEAPON_ARC: Record<WeaponType, WeaponArc> = {
  // Slash — the wide AOE sweepers.
  bone_knife: { halfAngleDeg: 50, range: 54, falloff: 0.65 },
  sunsteel_sword: { halfAngleDeg: 60, range: 66, falloff: 0.75 },
  embersteel_sword: { halfAngleDeg: 62, range: 70, falloff: 0.78 },
  // Blunt — lower-medium arc (identity is the cripple/slow debuff).
  wood_club: { halfAngleDeg: 35, range: 40, falloff: 0.5 },
  stone_club: { halfAngleDeg: 38, range: 44, falloff: 0.5 },
  sunsteel_warhammer: { halfAngleDeg: 40, range: 48, falloff: 0.55 },
  embersteel_warhammer: { halfAngleDeg: 42, range: 50, falloff: 0.55 },
  // Pierce — lowest / near single-target (identity is single-target + crit).
  primal_spear: { halfAngleDeg: 18, range: 30, falloff: 0.4 },
  sunsteel_pike: { halfAngleDeg: 20, range: 34, falloff: 0.4 },
  embersteel_pike: { halfAngleDeg: 22, range: 36, falloff: 0.42 },
  // Ranged — never sweeps.
  slingshot: { halfAngleDeg: 0, range: 0, falloff: 0 },
  javelin: { halfAngleDeg: 0, range: 0, falloff: 0 },
  sunsteel_warbow: { halfAngleDeg: 0, range: 0, falloff: 0 },
  embersteel_warbow: { halfAngleDeg: 0, range: 0, falloff: 0 },
  // Fire washes over nearby foes — a medium sweep despite its melee reach.
  ember_brand: { halfAngleDeg: 45, range: 52, falloff: 0.6 },
  // Bayou tier — same identity spread, one notch wider/harder-hitting each.
  gloamsteel_sword: { halfAngleDeg: 64, range: 74, falloff: 0.8 },
  gloamsteel_warhammer: { halfAngleDeg: 44, range: 54, falloff: 0.58 },
  gloamsteel_pike: { halfAngleDeg: 24, range: 38, falloff: 0.44 },
  gloamsteel_warbow: { halfAngleDeg: 0, range: 0, falloff: 0 },
  gloam_brand: { halfAngleDeg: 46, range: 54, falloff: 0.62 },
  // Every swept target lifelinks too, so the arc is kept tighter than the
  // Brand's - a wide drain sweep would trivialize crowds.
  gloamdrinker: { halfAngleDeg: 34, range: 46, falloff: 0.5 },
  // Same identity spread as every other forged tier, sitting a notch under the
  // Gloamsteel arcs to match its damage placement.
  mirebronze_warhammer: { halfAngleDeg: 43, range: 52, falloff: 0.57 },
  mirebronze_sword: { halfAngleDeg: 63, range: 72, falloff: 0.79 },
  mirebronze_pike: { halfAngleDeg: 23, range: 37, falloff: 0.43 },
};
export function weaponArc(weapon: WeaponType): WeaponArc {
  return WEAPON_ARC[weapon];
}

// ON-HIT BURST: a detonation centred on the target, dealing a fraction of the
// hit's damage to everything else nearby.
//
// This is what a MAGIC weapon is for. Magic's only stated upside was that it
// "bypasses flat armor" — but that is a rule about damage taken by the PLAYER;
// enemies have no armor stat at all, so against them the bypass did precisely
// nothing. What was left was strictly worse than the alternatives: the Gloam
// Brand deals 44 DPS to the Gloamsteel Pike's 52 and Sword's 53, AND is shrugged
// off (x0.4-0.5) by the gloam-casters. the user, correctly: "the magic weapons
// feel like trash idk maybe we need to buff them or give them gnarly AOE."
//
// So: a magic weapon trades single-target DPS for a real crowd answer, which is
// a trade a player can actually read and choose. Data-driven rather than keyed
// off damageType === "magic", so a future non-magic weapon can carry a burst
// (and a future magic weapon can decline one) without touching MainScene.
export interface WeaponBurst {
  radius: number;
  damageFrac: number; // fraction of the hit's final damage dealt to others
  tint: number; // detonation colour
}

const WEAPON_ON_HIT_BURST: Partial<Record<WeaponType, WeaponBurst>> = {
  // The fire brand: a wide, showy wash of flame. Its 45-degree arc already
  // sweeps, so the burst is what makes it hit things the arc missed.
  ember_brand: { radius: 88, damageFrac: 0.55, tint: 0xff7a1e },
  // The bayou brand: bigger and harder, matching its tier.
  gloam_brand: { radius: 118, damageFrac: 0.8, tint: 0x9a5ce0 },
  // The drinker keeps the tightest burst — every swept target already lifelinks,
  // so a wide detonation would make it the sustain AND the crowd answer.
  gloamdrinker: { radius: 72, damageFrac: 0.4, tint: 0x6fbf4a },
};

export function weaponOnHitBurst(weapon: WeaponType): WeaponBurst | undefined {
  return WEAPON_ON_HIT_BURST[weapon];
}

// Per-hit LIFELINK: the fraction of damage dealt healed back to the player,
// applied at the single melee/ranged hit choke point (MainScene.resolveWeaponHit).
// Data-driven rather than hardcoded to one key so a future drain weapon is a
// row here. Parallel to - and stacking with - the Leech relic and the Bloodpact
// ability, but unlike either it is ALWAYS on and costs no relic family slot.
// Absent = no lifelink (every other weapon).
const WEAPON_LIFELINK_PCT: Partial<Record<WeaponType, number>> = {
  // 0.12 -> 0.08 (the user: "gloam brand needs a buff because the other magic
  // weapon is bonker busted"). Always-on lifelink with no cost and no relic
  // family slot was strong enough that the Gloamdrinker's tight 34-degree arc
  // stopped mattering — it beat the wide-arc Brand at the Brand's own job because
  // sustain outweighed everything. Still the sustain weapon, no longer the
  // automatic answer; the Brand's crowd numbers went up to meet it.
  gloamdrinker: 0.08,
};
export function weaponLifelinkPct(weapon: WeaponType): number {
  return WEAPON_LIFELINK_PCT[weapon] ?? 0;
}

// Blunt weapon movement-slow debuff (S7 identity, locked: "movement slow /
// cripple"). Applied at the single melee/ranged hit choke point
// (MainScene.resolveWeaponHit) whenever the weapon's primary damage type is
// blunt — it drives the existing Enemy.applySlow/slowMult path (built for the
// Executioner crit relic), so no new per-enemy state machine is needed. The
// slow REFRESHES on each blunt hit, so sustained bludgeoning keeps a target
// crippled. 0.6 = 40% slower; every blunt weapon shares one debuff (its size
// is the weapon's identity, not a per-tier knob).
export const BLUNT_SLOW_FACTOR = 0.6;
export const BLUNT_SLOW_MS = 1500;

export function weaponSlowsOnHit(weapon: WeaponType): boolean {
  return weaponPrimaryDamageType(weapon) === "blunt";
}

// A one-line "what is this weapon type good at" identity string, keyed off the
// primary damage type (S7). Surfaced in the item Tooltip, the inventory Combat
// column, and the balance dashboard so the three melee identities read clearly.
export function weaponIdentityLine(weapon: WeaponType): string {
  switch (weaponPrimaryDamageType(weapon)) {
    case "slash":
      return "Sweeping — widest arc, best crowd AOE";
    case "blunt":
      return "Crushing — cripples enemy movement";
    case "pierce":
      return "Focused — top single-target & crit, narrow arc";
    case "ranged":
      return "Ranged — strike from a distance";
    case "magic":
      return "Arcane — ignores armor, medium sweep";
  }
}
