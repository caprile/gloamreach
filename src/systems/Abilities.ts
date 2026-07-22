// Activated abilities (Biome-3 Phase 2a). Cooldown-only, equipment-granted
// actives — an equipped item in a "special" slot grants one active, bound to a
// key. This file is PURE DATA (id/family/power/cooldown/icon), mirroring the
// relic-def pattern (Relics.ts): the effect logic lives in MainScene's
// castAbility() dispatcher at the hook points that already own the primitives
// (blink → dash i-frame path, nova → radial AoE, bloodpact → resolveWeaponHit
// lifelink), so an AbilityDef never reaches into the scene.
//
// B4-P2 split `id` from `family`: the id names a specific ITEM-granted active,
// the family names the EFFECT MainScene runs, and `power` scales its magnitudes.
// That's what lets a lesser and a full version of the same effect coexist
// without duplicating a dispatcher branch — which is the whole point, since the
// run-start characters now grant the lesser variants and the Gemwright recipes
// still produce the full ones.
import type { EquipSlot } from "./Equipment";

export type AbilityId =
  | "gloamstep_blink"
  | "gloam_nova"
  | "bloodpact"
  // B4-P2 lesser variants — start-of-run character grants only. No recipe, no
  // loot entry: the full-power version is the upgrade you go earn.
  | "gloamstep_blink_lesser"
  | "gloam_nova_lesser"
  | "bloodpact_lesser"
  // B4-P2 found-only actives — epic-loot exclusive, craftable nowhere.
  | "gravebind"
  | "spirit_lance"
  | "aegis";

// Which EFFECT the dispatcher runs. Several ids can share one family at
// different `power` — adding a variant is then pure data.
export type AbilityFamily = "blink" | "nova" | "lifelink" | "gravebind" | "lance" | "aegis";

// The three live ability keys. T is reserved for a 4th slot later (not rendered
// yet) — keep this list and the SLOT_ABILITY_KEY map the single source of truth.
export type AbilityKey = "q" | "e" | "r";

export interface AbilityDef {
  id: AbilityId;
  family: AbilityFamily;
  // Magnitude scalar applied to EVERY number the family's effect reads (reach,
  // damage, i-frame window, lifelink fraction, active window). 1 = full
  // strength. Multiplies alongside the jewelry `abilityPowerMult()` hook rather
  // than replacing it. Cooldown is NOT scaled by this — it lives per-def below,
  // so a weaker variant can also be a slower one.
  power: number;
  name: string;
  description: string;
  cooldownMs: number;
  // Optional "active window" during which the ability's effect persists (e.g.
  // Bloodpact's lifelink, Aegis's damage reduction). The HUD shows an active
  // glow for activeMs, then the cooldown sweep; the cooldown is measured from
  // cast, so real downtime after the window is cooldownMs - activeMs.
  activeMs?: number;
  icon: string; // BootScene-baked texture, shared with the granting item's icon
}

// Which ability key each ability-granting equip slot drives. special1 → Q,
// special2 → E, back (cape) → R (locked mapping). Only these three slots grant
// actives in 2a; rings/necklace stay passive-only until 2b.
export const SLOT_ABILITY_KEY: Partial<Record<EquipSlot, AbilityKey>> = {
  special1: "q",
  special2: "e",
  back: "r",
};

export const ABILITY_DEFS: Record<AbilityId, AbilityDef> = {
  // === full-power craftables (Gemwright's Table, tier 1) ===
  gloamstep_blink: {
    id: "gloamstep_blink",
    family: "blink",
    power: 1,
    name: "Gloamstep Blink",
    description: "Blink a short distance toward your aim, briefly untouchable. Gap-close or escape.",
    cooldownMs: 6000,
    icon: "ability_blink",
  },
  gloam_nova: {
    id: "gloam_nova",
    family: "nova",
    power: 1,
    name: "Gloam Nova",
    description: "Burst gloam outward, damaging and knocking back everything around you.",
    cooldownMs: 10000,
    icon: "ability_nova",
  },
  bloodpact: {
    id: "bloodpact",
    family: "lifelink",
    power: 1,
    name: "Bloodpact",
    description: "For a few seconds, your strikes siphon life — healing you for part of the damage dealt.",
    cooldownMs: 24000,
    activeMs: 6000,
    icon: "ability_bloodpact",
  },

  // === lesser variants (run-start characters) ===
  // Weaker on every axis, not just the headline number: `power` scales reach,
  // damage, i-frames and the active window together, and each carries a longer
  // cooldown on top. Numbers are first-pass/tunable.
  gloamstep_blink_lesser: {
    id: "gloamstep_blink_lesser",
    family: "blink",
    power: 0.6,
    name: "Lesser Gloamstep",
    description: "A short, unsteady hop through the gloam. Barely enough to slip a blow.",
    cooldownMs: 9000,
    icon: "ability_blink_lesser",
  },
  gloam_nova_lesser: {
    id: "gloam_nova_lesser",
    family: "nova",
    power: 0.55,
    name: "Lesser Gloamburst",
    description: "A thin pop of gloam — it stings and shoves, but only what's already on top of you.",
    cooldownMs: 14000,
    icon: "ability_nova_lesser",
  },
  bloodpact_lesser: {
    id: "bloodpact_lesser",
    family: "lifelink",
    power: 0.5,
    name: "Lesser Bloodpact",
    description: "A shallow pact. Your strikes give back a little of what they take, for a little while.",
    cooldownMs: 30000,
    activeMs: 6000, // scaled by `power` at cast → ~3s
    icon: "ability_bloodpact_lesser",
  },

  // === found-only actives (epic loot; no recipe anywhere) ===
  gravebind: {
    id: "gravebind",
    family: "gravebind",
    power: 1,
    name: "Gravebind",
    description: "Drag everything nearby into your reach and leave it staggering. Deals no damage — it sets the table.",
    cooldownMs: 14000,
    icon: "ability_gravebind",
  },
  spirit_lance: {
    id: "spirit_lance",
    family: "lance",
    power: 1,
    name: "Spirit Lance",
    description: "Drive a lance of pale gloam straight through everything in a line.",
    cooldownMs: 12000,
    icon: "ability_lance",
  },
  aegis: {
    id: "aegis",
    family: "aegis",
    power: 1,
    name: "Drowned Aegis",
    description: "For a few seconds, the water takes most of what's aimed at you.",
    cooldownMs: 26000,
    activeMs: 4000,
    icon: "ability_aegis",
  },
};
