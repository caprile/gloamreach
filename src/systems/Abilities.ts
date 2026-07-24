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
  | "aegis"
  // Craftable control/tempo pair (Gemwright's Table).
  | "mire_snare"
  | "bloodrush";

// Which EFFECT the dispatcher runs. Several ids can share one family at
// different `power` — adding a variant is then pure data.
export type AbilityFamily =
  | "blink"
  | "nova"
  | "lifelink"
  | "gravebind"
  | "lance"
  | "aegis"
  | "snare" // AOE root — pins what's on you (vs gravebind, which PULLS then slows)
  | "haste"; // timed attack-speed window

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

// Which ability key each ability slot drives — POSITION is the hotkey.
//
// The three slots are otherwise interchangeable: any ability item fits any of
// them, so which key an ability sits on is the player's arrangement rather than
// a property baked into the item (it used to be — a bloodpact shroud was an "R
// item" because its slot was the cape slot, which is why moving an ability
// between keys was impossible). See EquipSlot's group model.
export const SLOT_ABILITY_KEY: Partial<Record<EquipSlot, AbilityKey>> = {
  ability1: "q",
  ability2: "e",
  ability3: "r",
};

export const ABILITY_DEFS: Record<AbilityId, AbilityDef> = {
  // === full-power craftables (Gemwright's Table, tier 1) ===
  gloamstep_blink: {
    id: "gloamstep_blink",
    family: "blink",
    power: 1,
    name: "Gloamstep Blink",
    // Every description below STATES ITS NUMBERS (the user: "descriptions of
    // abilities need to be defined with numbers in the table menu"). Half the
    // roster described only the mood, which left an ability's worth unreadable
    // next to one that did quote a figure. Values here are the full-power
    // magnitudes from MainScene's ABILITY_* constants; a `power` variant quotes
    // its own scaled numbers rather than the base ones.
    description: "Blink 220px toward your aim, untouchable for 250ms. Gap-close or escape.",
    cooldownMs: 6000,
    icon: "ability_blink",
  },
  gloam_nova: {
    id: "gloam_nova",
    family: "nova",
    power: 1,
    name: "Gloam Nova",
    description: "Deals 30 magic damage (ignores armor) to everything within 150px and shoves it back.",
    cooldownMs: 10000,
    icon: "ability_nova",
  },
  bloodpact: {
    id: "bloodpact",
    family: "lifelink",
    power: 1,
    name: "Bloodpact",
    description: "For 6s your strikes heal you for 35% of the damage dealt.",
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
    description: "A short, unsteady hop — 132px, untouchable for 150ms. Barely enough to slip a blow.",
    cooldownMs: 9000,
    icon: "ability_blink_lesser",
  },
  gloam_nova_lesser: {
    id: "gloam_nova_lesser",
    family: "nova",
    power: 0.55,
    name: "Lesser Gloamburst",
    description: "A thin pop of gloam: 17 magic damage within 82px. Only what's already on top of you.",
    cooldownMs: 14000,
    icon: "ability_nova_lesser",
  },
  bloodpact_lesser: {
    id: "bloodpact_lesser",
    family: "lifelink",
    power: 0.5,
    name: "Lesser Bloodpact",
    description: "A shallow pact: for 3s your strikes heal you for 18% of the damage dealt.",
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
    description: "Drags everything within 260px up to 170px inward and slows it to 30% for 2.2s. Deals no damage — it sets the table.",
    cooldownMs: 14000,
    icon: "ability_gravebind",
  },
  spirit_lance: {
    id: "spirit_lance",
    family: "lance",
    power: 1,
    name: "Spirit Lance",
    description: "Drives a 420px lance of pale gloam through everything in a line for 55 magic damage (ignores armor).",
    cooldownMs: 12000,
    icon: "ability_lance",
  },
  // === craftable control/tempo pair (Gemwright's Table, tier 1) ===
  // Deliberately CRAFTABLE rather than found-only epics: both were explicit
  // requests ("needs to be some kind of AOE root ability", "needs to be some
  // kind of attack speed ability"), and burying a requested ability behind an
  // epic-drop roll reproduces the "I never found one" problem the Gravemark
  // Rubbing exists to solve. The Gemwright tier is already gated behind the
  // Duneshaper's Heart, which is reachable now that biome 3 demoted it.
  mire_snare: {
    id: "mire_snare",
    family: "snare",
    power: 1,
    name: "Mire Snare",
    description:
      "Roots every enemy within 240px for 2.6s. They can still swing — so root, then leave; this is a control tool, not a stun.",
    cooldownMs: 16000,
    icon: "ability_snare",
  },
  bloodrush: {
    id: "bloodrush",
    family: "haste",
    power: 1,
    name: "Bloodrush",
    description: "For 6s your weapon cooldown drops 40% (~1.7x attack speed). Works with every weapon, melee or ranged.",
    cooldownMs: 22000,
    activeMs: 6000,
    icon: "ability_haste",
  },
  aegis: {
    id: "aegis",
    family: "aegis",
    power: 1,
    name: "Drowned Aegis",
    // Says the NUMBER. The flavour-only line ("the water takes most of what's
    // aimed at you") left the user unable to tell whether it did anything at all
    // — a 60% cut for 4s is a big, very usable window, and nothing on screen
    // said so. Every other ability's description states its effect; this one
    // just described the mood.
    description: "Cuts incoming damage by 60% for 4s. Stacks into the same reduction cap as relics and armor set bonuses.",
    cooldownMs: 26000,
    activeMs: 4000,
    icon: "ability_aegis",
  },
};
