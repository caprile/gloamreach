# Biome 2 — Phase 1: Combat systems layer (damage types, resist/weak, AOE arcs, swarm base)

> Phase 1 of the `.claude/plans/biome-2-sunscorch-badlands.md` umbrella. Phase 0 (patchwork
> worldgen) shipped. This adds the reusable **mechanics** biome-2 content will declare as data,
> built *before* the content (Phase 2 enemies / Phase 4 weapons) so those can be pure data.
> Built on **Opus** (new combat mechanics). No new enemies/weapons/content here — all three
> features are dormant hooks verified by temporarily flagging existing enemies/weapons.

## Scope (from the umbrella's Phase 1 section)

Three independent mechanics, all in the existing combat path:

1. **Non-physical damage type + resist/weakness layer.**
2. **Per-weapon AOE arc** (melee cleave; ranged stays single-target).
3. **Swarm pack-aggro base** (opt-in flag + wake mechanism; no swarm enemy yet).

## 1. Damage types + resistances

`magic` already exists in `DamageType` (Weapons.ts) — no enum change. The work is the
resist/weak multiplier layer and its visual feedback.

- **`Enemy.ts`** — add `resistances?: Partial<Record<DamageType, number>>` to `EnemyConfig`
  (default multiplier `1`). Store it; expose `resistMultiplier(type): number` (returns the
  configured multiplier or 1). `<1` = resistant, `>1` = weak. `import type { DamageType }`
  from Weapons (Weapons has no Enemy import → no cycle).
- **`resolveWeaponHit` (MainScene)** — the single choke point both melee and ranged flow
  through. Multiply `dmg` by `enemy.resistMultiplier(dmgType)` **here** (not in tryMelee/
  tryRanged), so resistance covers ranged automatically and can't drift. Derive an
  `effectiveness` (`"weak"` | `"resist"` | `"normal"`) from the multiplier and pass it to the
  damage number. Order vs crit doesn't matter (both multiplicative).
- **`spawnDamageNumber`** — add an `effectiveness` arg. Crit color wins (rare, important
  signal); otherwise weak = bright orange-red `#ff5a3a`, resist = dim blue `#7db4ff`,
  normal = white. (Crit already tints yellow + adds `!` + larger.)
- **Player-side magic bypass (dormant hook).** `applyDamageToPlayer` gains an optional
  `dmgType?: DamageType`. When `"magic"`, **skip the flat-armor term** (relic %-reduction
  still applies, still floored at 1) — gives Phase 2's magical gremlin teeth + seeds a
  magic-resist-gear hook. Every current caller deals physical → left unchanged (default
  path). No enemy passes `"magic"` until Phase 2, so this is verified by a direct eval call.

## 2. Per-weapon AOE arc (locked decision 6)

- **`Weapons.ts`** — `WEAPON_ARC: Record<WeaponType, { halfAngleDeg; range; falloff }>` +
  `weaponArc(weapon)` getter. First-pass values (tunable):
  - `bone_knife`: 25° / 34px / 0.5 — near single-target.
  - `wood_club`: 45° / 40px / 0.6
  - `stone_club`: 50° / 44px / 0.65
  - `primal_spear`: 50° / 58px / 0.7 — the wide sweeper (per the plan, spear is a sweeper).
  - `slingshot` / `javelin`: `range: 0` (ranged never sweeps; also never calls tryMeleeAttack).
- **`tryMeleeAttack` (MainScene)** — after the primary hovered hit resolves, if `arc.range > 0`
  gather other live enemies within `arc.range` of the player AND within `±halfAngleDeg` of the
  direction **player→primary target** (that direction is the swing facing). Apply
  `raw × staggerMult(other) × falloff` to each, **rolling crit per-target** (better feel),
  through the same `resolveWeaponHit` (so each secondary gets its own resist, kill/loot/XP).
- Refactor the primary/secondary shared math: `raw = baseDmg × skillMult × relicMult`
  (pre-stagger, pre-crit), then per-target `× staggerMult × (falloff for secondaries)` →
  `applyCrit` → `resolveWeaponHit`. Extract `staggerMultiplierFor(enemy)` (the
  GremlinKing/Gloamwarden `isStaggered()` checks) to reuse across primary/secondary/ranged.

## 3. Swarm pack-aggro base

Opt-in mechanism only — no swarm enemy exists until Phase 2, so this is a cheap dormant hook.

- **`Enemy.ts`** — public `packAggro = false` + public `packAggroRadius = 220` (tunable per
  subclass) + `forceAggro(now)` (wakes idle→chasing without dealing damage; no-op if
  depleted/already chasing; clears the post-giveup immunity so a woken ally commits).
- **`MainScene.updatePackAggro(now)`** — for each aggro'd `packAggro` enemy, wake idle
  **same-class** (`constructor ===`) `packAggro` enemies within their `packAggroRadius`. O(k·n)
  where k = packAggro count (0 today), so effectively free. Call once/frame from
  `updateEnemies`.

## Files

- `src/systems/Weapons.ts` — `WEAPON_ARC` + `weaponArc()`.
- `src/entities/Enemy.ts` — `resistances`/`resistMultiplier`, `packAggro`/`packAggroRadius`/
  `forceAggro`, `DamageType` import.
- `src/scenes/MainScene.ts` — resist in `resolveWeaponHit`, effectiveness tint in
  `spawnDamageNumber`, arc gather in `tryMeleeAttack`, `staggerMultiplierFor`, magic-bypass in
  `applyDamageToPlayer`, `updatePackAggro`.

## Verification

`tsc --noEmit`; `preview_start` + eval. Temporarily set `resistances` on a Boar via eval and
confirm blunt vs pierce damage differ + the number tints; place 3 enemies in an arc and confirm
a spear sweep hits multiple while a knife hits ~1; call `applyDamageToPlayer(20, undefined,
"magic")` in heavy-ish armor and confirm it isn't reduced by armor; set `packAggro` on two
nearby Boars, aggro one, confirm the other wakes. No `RECIPES.md`/dashboard change (no
recipe/enemy-stat data change — resist values arrive with Phase 2 enemies).
