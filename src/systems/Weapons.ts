// "stone_axe" (and later "stone_pickaxe") double as both a ToolType (see
// ResourceNode.ts, for chopping/mining) and a WeaponType (for combat) — the
// same item key, gated independently by whichever table a given action reads.
export type WeaponType = "wood_club" | "stone_club" | "stone_axe";

const WEAPON_DAMAGE: Record<WeaponType, number> = {
  wood_club: 3,
  stone_club: 5,
  stone_axe: 6,
};
export function weaponDamage(weapon: WeaponType): number {
  return WEAPON_DAMAGE[weapon];
}

const WEAPON_COOLDOWN_MS: Record<WeaponType, number> = {
  wood_club: 450,
  stone_club: 550,
  stone_axe: 500,
};
export function weaponCooldownMs(weapon: WeaponType): number {
  return WEAPON_COOLDOWN_MS[weapon];
}

const WEAPON_STAMINA_COST: Record<WeaponType, number> = {
  wood_club: 10,
  stone_club: 14,
  stone_axe: 12,
};
export function weaponStaminaCost(weapon: WeaponType): number {
  return WEAPON_STAMINA_COST[weapon];
}
