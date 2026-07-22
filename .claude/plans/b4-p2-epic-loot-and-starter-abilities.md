# B4-P2 — Epic loot pool + starter-ability nerf

## Context

Two problems that turned out to be the same problem.

**1. The starter abilities are the endgame rewards.** B4-P1 gives all five characters a
pre-equipped ability special. But those three items — `special_gloamstep_band`,
`special_gloam_focus`, `back_bloodpact_shroud` — are byte-identical to the **terminal
outputs of the Gemwright jewelry chain** ([`Jewelry.ts:60-80`](src/systems/Jewelry.ts:60)).
Earning one legitimately costs: kill the Duneshaper → Duneshaper's Heart → Gemwright's Table
tier-1 upgrade → find a crypt → beat a bespoke warden → crack the vault geode → moonsilver +
gem. B4-P1 hands you the same item at t=0, on every card. The whole crypt→gem→jewelry
progression currently has no reward left at the end of it.

**2. The "epic loot" system was specced and never built.** The biome-3 roadmap's Phase 2b
called for a shared low-chance special-item pool appended to every chest table
(`.claude/plans/biome-3-and-new-systems-roadmap.md:157-163`). When 2b shipped it delivered
only the jewelry half. There is no `EPIC_LOOT` anywhere in `src/`; all six loot tables are
independent with no shared pool. This is the largest already-designed, unbuilt system in the
game — and it's the natural home for the *found* powers that make the crafted ones feel like
a floor rather than a ceiling.

**Outcome:** characters start with visibly *lesser* versions of the three craftable abilities
(so clearing a crypt upgrades an ability you already understand), and every lootable container
gains a depth-tiered chance at found-only specials — three new abilities that exist nowhere in
the craft tree, plus passive uniques.

**Locked with the user (`AskUserQuestion`, all as recommended):** lesser variants of the same
three abilities; the epic pool holds new found-only abilities *and* passive uniques; the pool
is tiered by POI depth; a rare drop gets a distinct toast plus a chest glow.

---

## Part A — Ability variants (`src/systems/Abilities.ts`)

`AbilityDef` is already pure data with the effect logic in MainScene's `castAbility()`
dispatcher — preserve that. Today `castAbility` switches on the `AbilityId` itself, which
makes a second variant of the same effect impossible without duplicating a branch.

Split the two concerns:

```ts
export type AbilityFamily = "blink" | "nova" | "lifelink" | "gravebind" | "lance" | "aegis";

interface AbilityDef {
  id: AbilityId;
  family: AbilityFamily;   // which effect to run
  power: number;           // magnitude scalar; 1 = full-strength
  ...existing fields
}
```

`castAbility(id)` switches on `def.family`; every magnitude constant it reads
(`ABILITY_BLINK_DISTANCE`, `ABILITY_NOVA_RADIUS`/`_DAMAGE`, `ABILITY_BLOODPACT_LIFELINK_PCT`,
etc. — [`MainScene.ts:363-368`](src/scenes/MainScene.ts:363)) is multiplied by
`def.power * this.equipEffects.abilityPowerMult()`. The jewelry `abilityPowerMult()` hook
stays exactly where it is; `def.power` just multiplies alongside it. Cooldown already lives
per-def, so a lesser variant simply carries a longer one.

**Three new lesser ids** (first-pass numbers, tunable):

| id | family | power | cooldown | vs full |
|---|---|---|---|---|
| `gloamstep_blink_lesser` | blink | 0.60 | 9000 (vs 6000) | 132px hop, 150ms i-frames |
| `gloam_nova_lesser` | nova | 0.55 | 14000 (vs 10000) | ~82px radius, ~17 dmg |
| `bloodpact_lesser` | lifelink | 0.50 | 30000 (vs 24000) | 17.5% lifelink, 3s window |

`ABILITY_BLINK_IFRAME_MS` and the bloodpact `activeMs` scale with `power` too, so a lesser
variant is weaker on every axis, not just the headline number.

**Bug to fix while here:** `abilityEntries()` hardcodes `key === "r"` when deciding the active
glow ([`MainScene.ts:8921`](src/scenes/MainScene.ts:8921)). With Aegis (Part C) that stops
being true. Generalize to a small `activeUntilFor(id)` lookup over the per-family active
fields (`bloodpactUntil`, new `aegisUntil`).

## Part B — Character starter items (`src/systems/Items.ts`, `src/systems/Characters.ts`)

Three new `ItemDef`s — `special_gloamstep_band_lesser`, `special_gloam_focus_lesser`,
`back_bloodpact_shroud_lesser` — cloning the existing specials' shape (`armorSlot`,
`maxStack: 1`, `hotbarable: false`) but pointing `grantsAbility` at the lesser ids and
carrying "Worn thin" / "cracked" flavour plus stats lines naming the weaker numbers.

Swap all five `startingEquip` entries in [`Characters.ts:66-139`](src/systems/Characters.ts:66)
to the lesser keys. **No other change is needed** — `recomputeAbilities()` already derives
Q/E/R purely from `ItemDef.grantsAbility`, which is exactly why B4-P1 needed no ability
plumbing and why this needs none either.

These three are **start-only**: no recipe, no loot-table entry. The Gemwright recipes keep
producing the full-power items unchanged, so the upgrade is a straight slot swap.

## Part C — Three found-only abilities

Each deliberately reuses a proven primitive rather than inventing a system.

**`gravebind` (Q / special1 — "Gravebind Coil").** Yanks every live enemy within 260px inward
to ~90px and applies a 45% slow for 900ms. No damage. Structurally `castNova()`'s loop with
the shove direction inverted — same `setPosition` + `enemy.applySlow(...)` calls
([`MainScene.ts:9030-9033`](src/scenes/MainScene.ts:9030)). Build-defining next to a wide-arc
weapon (`WEAPON_ARC`) or the Emberblink landing nova. Cooldown 14s.

**`spirit_lance` (E / special2 — "Lance of the Pale Choir").** A 420px line from the player
toward the aim point; every enemy within 34px of that segment takes ~55 magic damage through
the existing `dealAbilityDamage(enemy, dmg, "magic")` helper, so resists and the
weak/resisted damage-number tint work for free. Only genuinely new code is a
point-to-segment distance test. Cooldown 12s.

**`aegis` (R / back — "Shroud of the Drowned King").** Opens a 4s window granting 60% damage
reduction. Implemented as a new `aegisUntil` field (exact `bloodpactUntil` precedent) whose
contribution is **added into the existing additive reduction bucket** at
[`MainScene.ts:9689-9697`](src/scenes/MainScene.ts:9689), so it lands under the same 0.75 cap
as relic and Molten Bulwark reduction and cannot be stacked into immunity. `activeMs: 4000`,
cooldown 26s.

Aim reuse: `castBlink()` already resolves pointer-else-facing via `facingAngle()` — extract
that two-line preamble into an `aimAngle()` helper for lance and blink to share.

## Part D — Epic passive uniques + one new effect channel

Six passive items using `EquipmentEffects`' existing channels at epic magnitudes, plus one
genuinely new channel. Nothing here duplicates a relic channel — the locked layer split
(relics = raw-% combat stats; jewelry/specials = ability-augment + utility) holds.

| item | slot | effect |
|---|---|---|
| Sparkbound Band | ring | +18% ability power, -12% ability cooldown |
| Lantern of the Long Dark | necklace | +60% light radius, +40% pickup radius |
| Gloamwrought Signet | ring | -25% ability cooldown |
| Ring of the Deep Vein | ring | +20% bonus-gather chance |
| Choirbone Amulet | necklace | +35% ability power |
| Mireborn Cloak | back | +30% status resist *(new)* |

**New channel `statusResistPct`** on `EquipPassive` + a `statusResistMult()` getter, added to
`CHANNELS` and `describePassive()` in
[`EquipmentEffects.ts:14-42`](src/systems/EquipmentEffects.ts:14). Consumed where MainScene
applies poison and bleed (`Poison.ts` / `BleedManager` call sites) to scale incoming dose
magnitude. Nothing owns status mitigation today, so this is a real new axis and a reason to
want a cloak in the bayou specifically.

## Part E — Tiered epic pools + loot integration

**Pool shape** — one roll per container, not per-entry, so an epic is a discrete event:

```ts
export interface EpicPool { chance: number; keys: string[] }
```

Rolling: if `rng() < chance`, add exactly one uniformly-chosen key. Three pools defined in
`MainScene.ts` beside the existing `*_LOOT_TABLE` consts:

| pool | chance | contents | containers |
|---|---|---|---|
| T1 | 4% | Sparkbound Band, Lantern of the Long Dark | Gremlin Shack |
| T2 | 6% | T1 + Gloamwrought Signet, Ring of the Deep Vein, Mireborn Cloak | Duskrunner Warren, Sunken Shrine bowl, Lodge hut |
| T3 | 8% | T2 + Choirbone Amulet + all three ability specials | Crypt chest, Lodge chief hut |

**Where the roll happens.** `LootContainer.rollIfEmpty(table)` is the single gate — its
`rolled` flag means whichever site fires first wins, and `openChestMenu` calls it too
([`MainScene.ts:3634`](src/scenes/MainScene.ts:3634)). So the epic roll must live *inside*
`rollIfEmpty`, not alongside it. Widen the signature to
`rollIfEmpty(table, opts?: { epics?: EpicPool; rng?: () => number })` — no current caller
passes the positional `rng`, so this is a safe change — and thread the right pool through the
seven call sites (3685, 3780, 5059, 7355, 7414, `openChestMenu`, and the crypt path). This
also means the re-arm cycle rerolls the epic exactly once, matching `rearmIfEmpty()`'s
existing semantics.

**Toast.** Add `"epic"` to `LogKind` ([`EventLog.ts:5`](src/systems/EventLog.ts:5)) plus a
gold entry in `KIND_COLORS`. Because it isn't `"recipe"`/`"material"`, `onNewEntry` routes it
to the prominent center `showToast` automatically
([`EventLogUI.ts:113`](src/ui/EventLogUI.ts:113)) — no UI code. Fire it from
`discoverMaterial()` ([`MainScene.ts:10168`](src/scenes/MainScene.ts:10168)), which is already
the choke point every container move reconciles through via
`reconcileBackpackDiscovery()`: branch on an `EPIC_ITEM_KEYS` set and emit the epic toast
instead of the blue material one.

*Known limitation, accept it:* `discoverMaterial` dedupes on `discovered`, so a second copy
of the same epic later in a run won't re-toast. Epics are `maxStack: 1` uniques and a
duplicate is a non-event; the chest glow covers the "there's something in here" signal
independently.

**Chest glow.** A `LootContainer.hasEpic(keys)` predicate plus a MainScene helper
`refreshEpicGlow(sprite, loot)` that attaches/removes a pulsing additive `light_soft` image
(the exact idiom `spawnBlinkFx` uses, [`MainScene.ts:9004-9012`](src/scenes/MainScene.ts:9004))
tinted gold on the container sprite. Called at the roll sites and after the chest menu closes.
Per [[feedback_phaser_infinite_tween_leak]] the pulse tween must be killed at the removal
site, not left to the sprite's destroy.

## Part F — Art, tagging, dev, docs

- **`BootScene.ts`**: 12 new icon textures (3 lesser specials — recolour the existing ability
  icons dimmer/cracked so the relationship reads at a glance; 3 new ability specials;
  6 passive uniques). Follow the existing `icon_*` generation helpers.
- **Item tab tagging**: add each new key to the biome set matching its source tier
  (`BAYOU_ITEM_KEYS` for T3, badlands set for T2, base for T1) — no new inventory tab.
- **`__dev.give`**: nothing to change, it already takes any item key; update the stale comment
  at [`MainScene.ts:12148`](src/scenes/MainScene.ts:12148) that says the specials "have no
  real source yet".
- **Dashboard** (`src/dashboard/main.ts`): the Abilities/Items data is imported live, so a new
  **Epic Loot** tab listing pools, chances and per-item effects stays drift-free. Ability defs
  now carry `family`/`power`, so surface those too.
- **`RECIPES.md`**: no recipe changes, but add a short epic-pool reference table.
- **`create()` reset**: `aegisUntil` must be reset per the `scene.restart()` field-init gotcha
  ([[feedback_scene_restart_full_reset]]).

---

## Verification

`node node_modules/typescript/bin/tsc --noEmit` first, then live via `preview_start` +
`preview_eval` against `window.__game.scene.getScene('MainScene')`:

1. **Lesser vs full, measured.** Start each character; assert `abilityByKey` maps to the
   `_lesser` ids. Record player position, `castBlink()`, measure the hop — assert ~132px, then
   `__dev.give` the full band, equip it, recast, assert ~220px. Same A/B for nova radius/damage
   (spawn a ring of enemies at known distances, count who took damage) and bloodpact heal
   amount. This is the core claim of the session — measure it, don't eyeball it.
2. **Cooldowns.** Assert `abilityReadyAt` delta matches each def's cooldown, and that a
   Ring of Quickening still multiplies it (jewelry hook not broken).
3. **New abilities.** Gravebind: place enemies at 100/250/400px, cast, assert only the first
   two moved inward and are slowed. Lance: place enemies on-axis and 60px off-axis, assert
   only on-axis took damage, and that a magic-resistant Hexling took reduced damage. Aegis:
   `applyDamageToPlayer(100)` before vs during the window, assert the ratio, and assert the
   0.75 cap still holds when stacked with relic reduction.
4. **Epic rolls.** Stub `rng` and roll each pool 20k times; assert observed chance matches
   spec and that only tier-legal keys appear. Assert a T1 shack can *never* produce an ability
   special. Assert `rearmIfEmpty()` → reroll yields at most one epic per cycle.
5. **Toast + glow.** Move an epic from a chest to the backpack, assert an `"epic"` entry
   landed in the log and that the center toast rendered; assert the glow attaches on a
   container holding one and is gone (tween killed) once emptied.
6. **Status resist.** Equip the Mireborn Cloak, apply a fixed poison dose, assert the ticked
   damage is 30% lower than the unequipped baseline.
7. Screenshot the ability bar with a lesser vs full item equipped; check
   `preview_console_logs` (level `error`) is clean.

**Docs:** append a `### B4-P2` entry to `STATUS.md`, update `## Current State` in place, prune
to `STATUS-archive.md` if over ~40KB, and copy this plan into `.claude/plans/` and commit it
alongside the feature per the in-repo-plans rule.
