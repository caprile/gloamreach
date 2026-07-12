export type WeaponType = "wood_club" | "stone_club" | "bone_knife" | "primal_spear" | "slingshot" | "javelin";

// Damage types double as the 5 weapon Skill types (Skills.ts) — a weapon's
// primary (first) type routes its on-hit skill XP. Multiple types are
// allowed for future weapons with mixed damage; only the first counts today.
export type DamageType = "slash" | "blunt" | "pierce" | "ranged" | "magic";

const WEAPON_DAMAGE_TYPES: Record<WeaponType, DamageType[]> = {
  wood_club: ["blunt"],
  stone_club: ["blunt"],
  bone_knife: ["slash"],
  primal_spear: ["pierce"],
  slingshot: ["ranged"],
  javelin: ["ranged"],
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
  primal_spear: 8,
  slingshot: 2,
  javelin: 5,
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
};
export function weaponStaminaCost(weapon: WeaponType): number {
  return WEAPON_STAMINA_COST[weapon];
}

export function weaponAttacksPerSecond(weapon: WeaponType): number {
  return 1000 / WEAPON_COOLDOWN_MS[weapon];
}

export function damageTypeDisplayName(type: DamageType): string {
  return type.charAt(0).toUpperCase() + type.slice(1);
}

// Per-weapon base crit (M-SS). This is where "base crit" lives — grounded
// per-weapon rather than one arbitrary global player constant — AND doubles as
// an attack-speed lever: slow/heavy weapons get higher base crit (a burst where
// overkill is least wasted), fast weapons lower. Strength (crit mult) / Agility
// (crit chance) stats and relic crit channels ADD on top of these bases; the
// totals are soft-capped in MainScene's crit roll (chance 60%, mult 3.0x).
const WEAPON_BASE_CRIT_CHANCE: Record<WeaponType, number> = {
  bone_knife: 0.04, // fast (350ms)
  wood_club: 0.05,
  stone_club: 0.05,
  slingshot: 0.05,
  javelin: 0.05,
  primal_spear: 0.08, // slow (650ms)
};
const WEAPON_BASE_CRIT_MULT: Record<WeaponType, number> = {
  bone_knife: 1.5,
  wood_club: 1.5,
  stone_club: 1.5,
  slingshot: 1.5,
  javelin: 1.5,
  primal_spear: 1.6,
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
}

const RANGED_WEAPONS: Partial<Record<WeaponType, RangedWeaponConfig>> = {
  slingshot: { projectileSpeed: 420, maxRangePx: 260, ammoItemKey: "slingshot_pellets", projectileTexture: "pellet_projectile" },
  javelin: { projectileSpeed: 300, maxRangePx: 220, ammoItemKey: null, projectileTexture: "javelin_projectile" },
};

export function rangedWeaponConfig(weapon: WeaponType): RangedWeaponConfig | undefined {
  return RANGED_WEAPONS[weapon];
}

export function isRangedWeapon(weapon: WeaponType): boolean {
  return weapon in RANGED_WEAPONS;
}
