export type WeaponType = "wood_club" | "stone_club";

// Damage types double as the 5 weapon Skill types (Skills.ts) — a weapon's
// primary (first) type routes its on-hit skill XP. Multiple types are
// allowed for future weapons with mixed damage; only the first counts today.
export type DamageType = "slash" | "blunt" | "pierce" | "ranged" | "magic";

const WEAPON_DAMAGE_TYPES: Record<WeaponType, DamageType[]> = {
  wood_club: ["blunt"],
  stone_club: ["blunt"],
};
export function weaponDamageTypes(weapon: WeaponType): DamageType[] {
  return WEAPON_DAMAGE_TYPES[weapon];
}
export function weaponPrimaryDamageType(weapon: WeaponType): DamageType {
  return WEAPON_DAMAGE_TYPES[weapon][0];
}

const WEAPON_DAMAGE: Record<WeaponType, number> = {
  wood_club: 3,
  stone_club: 5,
};
export function weaponDamage(weapon: WeaponType): number {
  return WEAPON_DAMAGE[weapon];
}

const WEAPON_COOLDOWN_MS: Record<WeaponType, number> = {
  wood_club: 450,
  stone_club: 550,
};
export function weaponCooldownMs(weapon: WeaponType): number {
  return WEAPON_COOLDOWN_MS[weapon];
}

const WEAPON_STAMINA_COST: Record<WeaponType, number> = {
  wood_club: 10,
  stone_club: 14,
};
export function weaponStaminaCost(weapon: WeaponType): number {
  return WEAPON_STAMINA_COST[weapon];
}
