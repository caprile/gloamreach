# Start-of-Run Base Character (B4-P1)

## Context

The biome-3 + new-systems umbrella is complete (all 5 phases) and nothing is queued behind
it. The user picked the roadmap's own top deferred candidate
(`.claude/plans/biome-3-and-new-systems-roadmap.md`, Phase 5 "Later"): a **start-of-run base
character**.

Today every run starts identically — `create()` builds a level-1 `PlayerProgression` with 0
stats, an empty `ItemContainer` backpack, empty `Equipment`, and an empty Q/E/R bar. The
roguelike meta-loop (`Run.ts` score, hardcore one-life death, the family-loadout relic
economy) rewards *how* a run goes but never varies *how it begins*, so the first ten minutes
of every run are the same gather-wood-craft-axe opening. This adds a **run-start class-select
screen**: a fixed roster of hand-designed characters, each bundling an identity, starting
stat points, a starting kit, an innate activated ability, and a **double-edged run modifier**
that stays live for the whole run.

It also fixes a real dead end: the B3-P2a ability framework (`Abilities.ts`, the Q/E/R HUD)
is currently only reachable via the Sunken Crypt wardens or `__dev.give`, so most runs never
touch it. Every character ships equipped with one of the three ability specials.

**Locked with the user (`AskUserQuestion`, this session):**
1. **Fixed roster, always all available** — not an RNG-rolled 3-card offer. Every character
   is selectable every run.
2. **One card bundles all four** — identity + starting stats + starting gear + innate ability
   + run modifier.
3. **Modifiers are double-edged (boon + bane) with NO score effect** — `Run.score()` stays
   purely kills + speed-scaled completion bonus. A harder card is a playstyle choice, not a
   leaderboard lever (avoids a degenerate "always take the highest multiplier" meta).
4. **The innate ability is delivered as a real "special" ITEM pre-equipped in its slot**, not
   a separate innate-ability channel — so it fills the same mechanical role as any other
   piece of equipment (swappable, occupies the slot, shows in the paper-doll). This means
   **zero new ability plumbing**: `recomputeAbilities()` already derives the Q/E/R bar from
   `ItemDef.grantsAbility` on whatever sits in `special1`/`special2`/`back`.

Model: **Opus** (new mechanic), per the model-switch convention — already active.

## Background from exploration

- `src/systems/Progression.ts` — `PlayerProgression`; `allocate(stat)` spends an unspent
  point, `setStat(stat, value)` sets directly (currently commented DEV-only; starting stats
  are the second legitimate caller and the comment needs widening).
- `src/scenes/MainScene.ts:1206` `create()` — the per-run reset block (the standing
  `scene.restart()` field-init gotcha). Every new per-run field must be reset here.
- `src/scenes/MainScene.ts:9799` `openWelcome()`/`closeWelcome()` — the freeze pattern to
  copy verbatim (`isPaused = true` + `player.setVelocity(0,0)` + `physics.world.pause()` +
  `time.paused = true`, undone on close). `update()` early-returns on `isPaused`, so the run
  clock and day/night do **not** advance while the picker is up.
- `src/ui/WelcomeUI.ts` / `src/ui/RunEndUI.ts` — the modal pattern: flat `scrollFactor(0)`
  GameObjects (never a Container — see the standing Phaser Container + scrollFactor input
  bug), a full-screen `.setInteractive()` scrim, depth band 3500/3600, `clear()`/`render()`.
- `src/systems/Abilities.ts` + `MainScene.ts:8883 recomputeAbilities()` — Q/E/R is derived
  from equipment each time equipment changes. Nothing to add.
- `src/systems/Items.ts:1225-1266` — the three ability specials already exist with
  `armorSlot` + `grantsAbility`: `special_gloamstep_band` (special1 → Q, Gloamstep Blink),
  `special_gloam_focus` (special2 → E, Gloam Nova), `back_bloodpact_shroud` (back → R,
  Bloodpact).
- **Confirmed single choke points for every modifier field** (all already exist for relics —
  the modifier adds one term at each, it does not create new math):

  | Modifier field | Hook site |
  |---|---|
  | `damageDealtMult` | `MainScene.ts:9165` (the `weaponSkillDamageMultiplier`/`relics.damageMult()` bucket) |
  | `damageTakenMult` | `MainScene.ts:9666` `applyDamageToPlayer` reduction bucket |
  | `moveSpeedMult` | `MainScene.ts:1963` `moveMult` sum passed to `Player.update()` |
  | `xpMult` | `MainScene.ts:9117` `awardSkillXp` additive bonus bucket |
  | `staminaCostMult` | `MainScene.ts:9188` + `:11371` |
  | `eliteChanceMult` | `MainScene.ts:3953` `rollElite(rng, chanceMult)` |
  | `maxHpPct` / `maxStaminaPct` | `MainScene.ts:10155` `syncStatBonuses()` |

## Implementation

### 1. `src/systems/Characters.ts` (new — framework-free pure data + a thin accessor)

Mirrors the `Relics.ts` / `Abilities.ts` split: defs are data, effects are read at MainScene's
existing hooks.

```ts
export interface RunModifier {
  name: string;
  boon: string;  // display line, e.g. "+25% damage dealt"
  bane: string;  // display line, e.g. "+25% damage taken"
  damageDealtMult?: number;  // all default to 1 (or 0 for the two pct fields)
  damageTakenMult?: number;
  moveSpeedMult?: number;
  xpMult?: number;
  staminaCostMult?: number;
  eliteChanceMult?: number;
  maxHpPct?: number;       // e.g. -15 = -15% of the 100 base
  maxStaminaPct?: number;
}

export interface CharacterDef {
  id: string;
  name: string;          // e.g. "The Reaver"
  blurb: string;         // one-line playstyle read
  icon: string;          // reuse the granted ability's BootScene texture
  startingStats: Partial<Record<StatType, number>>;
  startingEquip: { slot: EquipSlot; key: string }[];  // includes the ability special
  startingItems: { key: string; count: number }[];    // backpack/hotbar kit
  modifier: RunModifier;
}

export const CHARACTER_DEFS: CharacterDef[] = [ ... 5 entries ... ];

// Aggregate accessor with the SAME getter shape RelicManager exposes, so every
// MainScene call site reads identically. A null character returns neutral values,
// which keeps the game playable if the picker is ever bypassed.
export class RunCharacter { constructor(def: CharacterDef | null); damageDealtMult(): number; ... }
```

**Roster (5, all first-pass/tunable).** Each takes exactly one ability special; the three
specials repeat across the five so no card is ability-less:

| Character | Ability (slot) | Starting stats | Kit | Modifier (boon / bane) |
|---|---|---|---|---|
| **The Vagabond** | Blink (Q) | 2 End, 2 Vit | Stone Axe, 5 wood | *Well-Travelled*: +10% move speed / −10% max stamina |
| **The Reaver** | Bloodpact (R) | 4 Str | Stone Club | *Bloodthirst*: +25% damage dealt / +25% damage taken |
| **The Ashcaller** | Nova (E) | 3 Int, 2 Wis | Torch, Wood Club | *Gloam-Touched*: +30% skill XP / −15% max HP |
| **The Warden** | Blink (Q) | 3 Vit, 2 End | Stone Axe, Stone Pickaxe | *Ironbound*: +20% max HP / +20% weapon stamina cost |
| **The Ascetic** | Nova (E) | 3 Agi, 2 Str | *(no gear — the classic empty-handed opening)* | *Hunted*: elites are 2x as common / −20% damage taken |

### 2. `src/ui/CharacterSelectUI.ts` (new)

Full-screen modal in the WelcomeUI style: flat `scrollFactor(0)` objects, interactive scrim,
depth 3620/3621/3622 (its own band, above WelcomeUI's 3600 — only one is ever open, but the
band keeps them independent). Five cards in a row; each shows name, ability icon + name,
starting stats, kit, and the modifier's boon (amber) / bane (dim) lines.

**Select-then-confirm**, not click-to-commit: clicking a card highlights it and fills a
detail strip; a **"Begin Run"** button commits. Commit is final (no reroll) — consistent with
every other locked commit-only choice. Esc does **not** dismiss it: a run must have a
character, so the picker has no cancel path (the Esc handler at `MainScene.ts:1809` gets a
guard, same shape as the existing `welcomeUI.isOpen()` branch).

Per the standing red/green convention, the boon/bane lines use amber/dim-grey, not green/red.

### 3. MainScene wiring

- **New per-run fields, reset in `create()`** (scene.restart gotcha):
  `this.character = new RunCharacter(null)` and `this.characterDef = null`.
- **Flow:** at the end of `create()`, open the picker. If the welcome overlay shows first
  (fresh page load), chain the picker off its `onClose` instead of calling it directly, so
  they queue rather than stack. On a **New Run** (`scene.restart()`) the welcome is skipped
  but the picker still shows — that's the intended per-run decision point.
- `openCharacterSelect()` / `applyCharacter(def)` — copy `openWelcome`'s freeze verbatim.
  `applyCharacter` then:
  1. `progression.setStat(stat, n)` per `startingStats`;
  2. `equipment.set(slot, { key, tier: 0 })` per `startingEquip`;
  3. `backpack.addStack({key, count})` per `startingItems`, routing hotbarable items through
     the existing `findHotbarSlotFor` so a starting weapon/tool lands on the hotbar;
  4. `discoverMaterial(key)` for every granted key (so recipe discovery reflects the kit —
     reusing the centralized 5x entry point, not a raw `discovered.add`);
  5. `recomputeAbilities()`, `syncStatBonuses()`, `afterItemMove()`, `refreshDiscovery()`;
  6. unfreeze (the `closeWelcome` tail).
- **Modifier reads:** one added term at each of the seven hook sites in the table above,
  following the existing additive-bucket idiom at each site (e.g. `awardSkillXp`'s bonus
  bucket gains `+ (this.character.xpMult() - 1)`; `syncStatBonuses` gains the two pct terms
  as independent linear adds off the 100 base, matching the 2026-07-15 additive rule, so a
  character pct can never compound with relic pct).
- **Surfacing:** `RunHudUI` shows the character name beside the clock; `RunEndUI` adds a
  "Played as: <name> · <modifier>" line so a score is attributable to a build.

### 4. Keep-in-sync (standing per-phase rule)

- **Dashboard**: a new **Characters** tab in `src/dashboard/main.ts` importing
  `Characters.ts` live (Phaser-free, so it stays drift-free like every tab except Enemies).
- `RECIPES.md`: **no change** (no recipes added or altered).
- `STATUS.md`: new `### B4-P1` entry under Recent Entries + `## Current State` updated in
  place; prune to `STATUS-archive.md` if over ~40KB / >10 entries.
- A new memory file for the character system, linked from `MEMORY.md` and cross-linked to
  `[[survivor-rpg-roguelike-metaloop-plan]]`.
- Commit directly to `main` (solo trunk-based, per standing preference); no push unless asked.

## Verification

Browser game — verify live, not just type-checks.

1. `node node_modules/typescript/bin/tsc --noEmit` — clean.
2. `preview_start` config `"dev"` → `preview_screenshot` the picker; `preview_resize` if the
   render loop is paused (the known backgrounded-tab quirk).
3. `preview_eval` against `window.__game.scene.getScene('MainScene')`:
   - **Freeze**: with the picker open, assert `isPaused === true` and that `run.elapsedMs`
     does not advance across a few frames (the picker must not burn the speedrun clock).
   - **Grant**: call `applyCharacter` for each of the 5 defs on a fresh scene and assert
     stats (`progression.statValue`), `equipment.get(slot).key`, backpack/hotbar contents,
     and that `abilityByKey` lights up the expected Q/E/R key **through the item** (the
     locked mechanism) — then unequip the special and assert the key goes dark.
   - **Each modifier hook**, one at a time with a controlled character: damage dealt
     (`resolveWeaponHit` output), damage taken (`applyDamageToPlayer` with a known amount,
     including the magic/fire bypass branch), move speed (`Player.update` mult), XP
     (`awardSkillXp` delta), stamina cost, `rollElite` rate over many seeded rolls, and
     `health.max`/`stamina.max` after `syncStatBonuses` — asserting the pct adds are linear,
     not compounding, when a relic pct is also present.
   - **Score isolation**: assert `run.score()` for identical kill/time inputs is byte-identical
     across two different characters (locked decision 3 — modifiers must not touch score).
   - **Restart**: `scene.restart()` → assert the picker re-opens and that a prior character's
     stats/gear/modifier are fully gone (no carryover — the field-init gotcha).
4. `preview_console_logs` level `error` — zero.
5. `window.__dev` (`god`/`setstat`/`spawn`) to reach a fight fast and confirm a modifier is
   live in real combat, not just in isolation.
