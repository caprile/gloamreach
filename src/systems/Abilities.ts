// Activated abilities (Biome-3 Phase 2a). Cooldown-only, equipment-granted
// actives — an equipped item in a "special" slot grants one active, bound to a
// key. This file is PURE DATA (id/name/description/cooldown/icon), mirroring the
// relic-def pattern (Relics.ts): the effect logic lives in MainScene's
// castAbility() dispatcher at the hook points that already own the primitives
// (blink → dash i-frame path, nova → radial AoE, bloodpact → resolveWeaponHit
// lifelink), so an AbilityDef never reaches into the scene.
//
// Sourcing is deliberately dev-only for now (__dev.give) — real sources (epic
// loot, biome-3 craftables, the post-boss reward picker) are Phase 2b / Phase 5.
import type { EquipSlot } from "./Equipment";

export type AbilityId = "gloamstep_blink" | "gloam_nova" | "bloodpact";

// The three live ability keys. T is reserved for a 4th slot later (not rendered
// yet) — keep this list and the SLOT_ABILITY_KEY map the single source of truth.
export type AbilityKey = "q" | "e" | "r";

export interface AbilityDef {
  id: AbilityId;
  name: string;
  description: string;
  cooldownMs: number;
  // Optional "active window" during which the ability's effect persists (e.g.
  // Bloodpact's lifelink). The HUD shows an active glow for activeMs, then the
  // cooldown sweep; the cooldown is measured from cast, so real downtime after
  // the active window is cooldownMs - activeMs.
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
  gloamstep_blink: {
    id: "gloamstep_blink",
    name: "Gloamstep Blink",
    description: "Blink a short distance toward your aim, briefly untouchable. Gap-close or escape.",
    cooldownMs: 6000,
    icon: "ability_blink",
  },
  gloam_nova: {
    id: "gloam_nova",
    name: "Gloam Nova",
    description: "Burst gloam outward, damaging and knocking back everything around you.",
    cooldownMs: 10000,
    icon: "ability_nova",
  },
  bloodpact: {
    id: "bloodpact",
    name: "Bloodpact",
    description: "For a few seconds, your strikes siphon life — healing you for part of the damage dealt.",
    cooldownMs: 24000,
    activeMs: 6000,
    icon: "ability_bloodpact",
  },
};
