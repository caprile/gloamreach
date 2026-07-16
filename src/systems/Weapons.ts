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
  // enhanced/T2 tier (biome 2 Phase 4 Session 2) — reforged with Embersteel
  | "embersteel_warhammer"
  | "embersteel_sword"
  | "embersteel_pike"
  // the first MAGIC weapon — a rare-ore-exclusive melee fire brand
  | "ember_brand";

// Damage types double as the 5 weapon Skill types (Skills.ts) — a weapon's
// primary (first) type routes its on-hit skill XP. Multiple types are
// allowed for future weapons with mixed damage; only the first counts today.
export type DamageType = "slash" | "blunt" | "pierce" | "ranged" | "magic";

// Damage types an ENEMY can deal to the player. A superset of the weapon
// DamageType (which doubles as the weapon-skill keys) — enemies can also deal
// elemental "fire" (the Cinderwrought), which is NOT a player weapon skill, so
// it lives here rather than polluting DamageType/SkillType. Both `magic` and
// `fire` bypass the player's flat armor (see MainScene.applyDamageToPlayer).
export type IncomingDamageType = DamageType | "fire";

// Whether an incoming type ignores the flat-armor term (relic %-reduction +
// floor-at-1 still apply). Magic and fire are the two "elemental" types.
export function bypassesArmor(type: IncomingDamageType): boolean {
  return type === "magic" || type === "fire";
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
  embersteel_warhammer: ["blunt"],
  embersteel_sword: ["slash"],
  embersteel_pike: ["pierce"],
  ember_brand: ["magic"],
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
  // Enhanced tier: a real step over the base forged numbers (~+35-45%).
  embersteel_warhammer: 23,
  embersteel_sword: 19,
  embersteel_pike: 25, // S7: keeps pierce the single-target DPS leader at T2 (>= sunsteel_pike + 5 invariant)
  // The magic brand's raw number sits mid-pack; its DPS lands near the
  // Embersteel Pike on a NEUTRAL target, but its "magic" type is shrugged off
  // (~x0.4-0.5) by the gloam-casters (Hexlings, the Duneshaper). It's the only
  // `magic` weapon-skill source — a sidegrade with an upside, not flatly best.
  ember_brand: 17,
};
export function weaponDamage(weapon: WeaponType): number {
  return WEAPON_DAMAGE[weapon];
}

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
  embersteel_warhammer: 800,
  embersteel_sword: 470,
  embersteel_pike: 610,
  ember_brand: 520,
};
export function weaponCooldownMs(weapon: WeaponType): number {
  return WEAPON_COOLDOWN_MS[weapon];
}

const WEAPON_STAMINA_COST: Record<WeaponType, number> = {
  wood_club: 10,
  stone_club: 14,
  bone_knife: 8,
  primal_spear: 16,
  slingshot: 6,
  javelin: 16,
  // Higher-tier weapons cost more stamina (the user) — the ember tier was barely
  // above steel (13 vs 12). Now each tier is a clear step up, so the bigger
  // weapon is a real commitment, not a free upgrade: starter < Sunsteel < Ember.
  sunsteel_warhammer: 22,
  sunsteel_sword: 15,
  sunsteel_pike: 18,
  embersteel_warhammer: 27,
  embersteel_sword: 18,
  embersteel_pike: 22,
  ember_brand: 19,
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
  // Ranged — unchanged.
  slingshot: 0.05,
  javelin: 0.05,
  // Pierce — the crit kings (single-target identity).
  primal_spear: 0.1,
  sunsteel_pike: 0.1,
  embersteel_pike: 0.11,
  // Magic — mid.
  ember_brand: 0.07,
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
  // Pierce — highest crit multiplier too, so a pike crit is a genuine nuke.
  primal_spear: 1.7,
  sunsteel_pike: 1.7,
  embersteel_pike: 1.75,
  ember_brand: 1.6,
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
  ammoItemKey: string | null; // null = self-consumes from the equipped hotbar stack (Javelin)
  projectileTexture: string;
  // Rotation offset (radians) for the in-flight sprite when its art's "forward"
  // isn't +x — the javelin streak points up, so +90° makes it fly nose-first.
  projectileArtAngleOffset?: number;
}

const RANGED_WEAPONS: Partial<Record<WeaponType, RangedWeaponConfig>> = {
  slingshot: { projectileSpeed: 420, maxRangePx: 260, ammoItemKey: "slingshot_pellets", projectileTexture: "pellet_projectile" },
  javelin: { projectileSpeed: 300, maxRangePx: 220, ammoItemKey: null, projectileTexture: "javelin_projectile", projectileArtAngleOffset: Math.PI / 2 },
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
  // Fire washes over nearby foes — a medium sweep despite its melee reach.
  ember_brand: { halfAngleDeg: 45, range: 52, falloff: 0.6 },
};
export function weaponArc(weapon: WeaponType): WeaponArc {
  return WEAPON_ARC[weapon];
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
      return "Arcane — fire, ignores armor, medium sweep";
  }
}
