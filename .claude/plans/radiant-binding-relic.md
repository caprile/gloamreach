# M-RL — Relics (probabilistic trophy → relic economy)

Milestone M-RL of the roguelike meta-loop
(`.claude/plans/roguelike-metaloop-master-plan.md`) — the ARPG/Slay-the-Spire
spine. **This doc supersedes the earlier "manual 2→1 combine ladder" version of
M-RL** (same file, first draft): rarity is now source-determined and NOT
climbable, there is no manual combine, and duplicate auto-stacking replaces it.
Built on Opus (a new core system).

## Locked design (from the user, this rework)

Two independent axes:
- **Rarity** (Common/Uncommon/Rare/Mythic) = which effect pool + roll odds a
  relic comes from. **Source-determined by the trophy — NOT climbable.** No
  manual combine.
- **Power tier** (biome depth) = a magnitude multiplier on the relic's numbers
  (`POWER_TIER_MULT`, geometric ×1.0/1.5/2.25/3.375…). **Flat ×1.0 this
  milestone** (single biome) — scaffolding that activates in M-W1.

**Trophy → relic is a probabilistic roll.** 1 trophy per attempt at a placeable
Relic Forge. Success chance by trophy rarity: **Common 5% / Uncommon 10% / Rare
100%**. A **failed roll still consumes the trophy** (no relic). A **per-rarity
pity counter** guarantees success after N consecutive misses (kills the 5%
feel-bad tail). Trophy map: `gremlin_trophy → Common / tier 1`,
`gremlin_king_fang → Rare / tier 1` (dormant — boss = win).

**Duplicate auto-stacking IS the "combining":** rolling a relic id (at a given
power tier) you already own merges into that entry with aggregated stats + ×N
count. Purely visual de-clutter — effects were always additive (each copy
contributes `base × its power-tier mult`).

**This milestone's live economy:** only common trophies flow → only Common
relics. The 4 rarity pools + power tiers are scaffolding for M-W1. All
rates/curves are tunable constants — flag Common's 5% variance at first
playtest; the lever if it feels thin is bumping Common's success rate.

## Build

- `src/systems/Relics.ts` (framework-free): `RelicRarity`, `RelicDef`
  (id/name/desc/icon/rarity/effect channels), `RELIC_DEFS`, `RELIC_POOLS` by
  rarity, `TROPHY_ROLL` (trophy → `{rarity, powerTier, successChance}`),
  `POWER_TIER_MULT`, `PITY_THRESHOLD` by rarity. `RelicManager` holds instances
  `{id, powerTier}`, `roll(trophyKey, rng)` (odds + pity, returns a `RollResult`),
  `groupedForDisplay()`, and aggregate getters (`damageMult`/`moveSpeedMult`/
  `staminaCostMult`/`damageTakenMult`/`killHeal`/`maxHpBonus`/`maxStaminaBonus`/
  `xpMult`) summed over instances × `powerTierMult`.
- Relic Forge: `Items.ts` def (`placeable`, maxStack 1), `Recipes.ts` recipe
  (tier 1 / workbench-gated, `10 Stone / 5 Bones / 1 Gremlin Trophy` so discovery
  ties to owning a trophy), `BootScene` icon (doubles as placed sprite).
  Hover/prompt/interact → `RelicForgeMenu`; wired into `anyMenuOpen`, Escape, all
  close-all sites, `destroyPlacedObject`.
- `src/ui/RelicForgeMenu.ts` — a **roll button per owned trophy tier** (shows
  success chance + pity progress) and an owned-relics display. **No combine bar.**
  Roll feedback announces success (relic name) or failure (trophy consumed).
- `src/ui/RelicBarUI.ts` — grouped rarity-colored icons + ×N badge + a small
  power-tier indicator + hover tooltip with scaled numbers; HUD depth ≥2803, no
  meter (permanent).
- MainScene hook points (unchanged from the first M-RL ship): `tryAttackEnemy`
  (`dmg *= damageMult`; on-kill `heal(killHeal)`), `applyDamageToPlayer`
  (`amount *= damageTakenMult` pre-armor), weapon+tool stamina cost, `player.update`
  move mult, `syncStatBonuses` (fold maxHp/maxStamina), skill XP (`× xpMult` via
  `awardSkillXp`). Reset: `new RelicManager()` in `create()`; RelicBarUI rebuilt
  in `createHud`.

## Part 1 prerequisite (shipped alongside): all elites drop a trophy
Centralized in base `Enemy` (`ELITE_TROPHY_DROP` appended to `loot` when
`cfg.elite`), reversing the M-EL2-era "Elite Gremlings drop no trophy" decision.
`Boar`/`Snake`/`RangedGremlin`/`MeleeGremling` pass `elite` through to `super`;
the ranged Gremlin's inline trophy entry was deleted (no double-drop). Boss
unchanged (drops `gremlin_king_fang`, not an elite so no `gremlin_trophy`).

## Playtest follow-up (per-species trophies + night-number HUD)
First relic-economy playtest (the user, 20-min run → 1 Common relic pre-boss, "okay,
hoping it scales"). No scaling knob changed — the design already funnels more
elites/biomes into more rolls; revisit if a full multi-biome run still feels thin.
Two changes shipped:
- **Unique trophy per species** — the M-RL "all elites drop `gremlin_trophy`"
  prerequisite (Part 1) is generalized: Boar → `boar_trophy`, Snake →
  `snake_trophy`, Gremlin/Gremling → `gremlin_trophy`. `EnemyConfig.eliteTrophy?:
  ResourceType` (default `gremlin_trophy`); base `Enemy` appends it when elite. New
  `boar_trophy`/`snake_trophy` items+textures. **All three roll the same Common
  pool + shared per-rarity pity** (`TROPHY_ROLL` maps each → `common/tier1/5%`), so
  variety adds attempts without splitting odds — deeper biomes can remap per source
  later. `RelicForgeMenu` roll buttons now wrap into rows of 2 (labelled by trophy
  name) so 3+ Common trophies fit the panel.
- **Night HUD number** — `RunHudUI` showed `[Night]` with no number; added
  `DayNight.nightNumber()` (= the day it follows) so it reads `[Night N]`.

## 2026-07-11 rework — rarity/tier outcome tables + first-roll guarantee
Off the user's 40-min playtest (STATUS 5t). **SUPERSEDES the "success chance by
trophy rarity (Common 5% / Uncommon 10% / Rare 100%)" model above.** Locked odds:

- A trophy's rarity drives an **outcome table over the RESULT rarity**
  (`TROPHY_OUTCOME_ODDS`, walked by `rollOutcomeRarity()` — bands subtract, so the
  listed chances ARE the exact odds):
  - **Common** trophy → 1% Rare, 2.5% Uncommon, 10% Common, else FAIL (86.5%, never Mythic)
  - **Uncommon** trophy → 1% Mythic, 5% Rare, rest Uncommon (never fails)
  - **Rare** trophy → 10% Mythic, rest Rare (never fails)
- So a Common trophy can **roll UP** into an Uncommon/Rare relic. `RollResult.rarity`
  is now the PRODUCED rarity (may exceed the trophy's), and `RelicRevealFx` shows the
  bigger reveal — that roll-up is the gamba payoff.
- A relic's **power tier ALWAYS equals the trophy's tier** (Tier-1 trophy → Tier-1
  relic only). All first-biome trophies stay Common / Tier 1.
- **First roll of a run is a guaranteed success** (the user's "hook") — `firstRollDone`
  flag + `isFirstRollPending()`; the forge button shows "first roll guaranteed". Pity
  kept as a floor (common 12).
- Code: `TrophyRoll` dropped `successChance`; `RARITY_SUCCESS_CHANCE` removed; added
  `TROPHY_OUTCOME_ODDS` + `trophyOverallSuccessChance()`. `RelicForgeMenu` readout +
  dashboard Relics tab (outcome breakdown) + `RECIPES.md` updated. Verified live:
  20k-roll sample → Rare 1.02% / Uncommon 2.71% / Common 12.74% (10% + pity) /
  Mythic 0% / fail 83.5%; first roll guaranteed.

## Deferred / notes
- Uncommon/Mythic pools + power tiers 2+ still have no *native* trophy source until
  M-W1 (a Common trophy CAN now roll up into an Uncommon/Rare relic, though).
- One gem icon per rarity (placeholder-art ethos; identity via tooltip).
