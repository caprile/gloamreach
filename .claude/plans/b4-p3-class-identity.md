# B4-P3 — Class identity: skill affinities + stat potency

## Context

B4-P1 shipped the run-start character picker (`src/systems/Characters.ts`), but all five
survivors differentiate on the same shape: a `RunModifier` of eight **global scalar**
fields (`Characters.ts:27-39`) — damage dealt/taken, move speed, XP, stamina cost, elite
chance, max HP/stamina %. The result is that no card reads as a *class*. The Reaver is
"the +25% damage one", not "the one who grows into a blunt bruiser". Nothing about a
character shapes **how you grow over the run**, only how big your flat numbers are.

This milestone adds the missing axis: each survivor gets a **defining set of skills and
stats** it is naturally better at, and a mild set it is worse at. Because Skills are the
**recipe-discovery gate** (`Recipe.requiredSkills`), a skill affinity genuinely changes
what a run can build, not just how fast numbers climb — which is exactly the "class"
feel that's missing today.

**Locked with the user this session:**
1. **Both channels** — per-skill XP affinity *and* per-stat potency.
2. **Double-edged, but not drastic** — favoured ≈ ×1.4–1.6, penalised ≈ ×0.75–0.85.
   No character should feel crippled at anything.
3. **Never reduce drops.** This has a concrete consequence: `chopping`/`mining` skill
   levels roll the bonus-drop chance (`Skills.choppingBonusChance`/`miningBonusChance`,
   `Skills.ts:112-117`), so a gathering-XP *penalty* would be an indirect drop nerf.
   **No character may have a `skillXpMult` below 1 on `chopping` or `mining`**, and no
   new yield/drop channel is introduced. Positive gathering affinities are fine.

Everything here lands on choke points that already exist — no new state machine, no new
math site. All numbers are first-pass/tunable like every other system in the project.

## Design

### Two new `RunModifier` fields (`src/systems/Characters.ts`)

```ts
skillXpMult?: Partial<Record<SkillType, number>>;  // per-skill XP rate
statPotency?: Partial<Record<StatType, number>>;   // per-point value of a stat
```

Both default to 1 per key. `RunCharacter` (the `RelicManager`-shaped accessor at
`Characters.ts:159`) gains two lookups matching the existing getter style:

```ts
skillXpMult(skill: SkillType): number   // 1 when absent / no character
statPotency(stat: StatType): number     // 1 when absent / no character
```

Per the file's own "a new field means a new hook, which is a deliberate decision" rule,
each field gets exactly **one** hook site (below).

### Hook 1 — skill XP affinity

`MainScene.awardSkillXp()` (`src/scenes/MainScene.ts:9299`) is already the single entry
point for every XP source. Today it sums relic / Intelligence / Prodigy-streak / character
bonuses into one **additive** bucket (per the 2026-07-15 additive rule) and applies it.

Affinity multiplies **outside** that bucket:

```ts
this.skills.addXp(skill, base * this.character.skillXpMult(skill) * (1 + bonus));
```

Deliberately multiplicative, not folded into the additive bucket: the bucket is the
"global +% XP" category, and folding a ×0.75 penalty in as −25 would let a couple of
relics erase a character's defining weakness entirely. A per-skill class scalar is a
different category, so it composes rather than competes. Document that reasoning inline —
it's the same argument the additive-rule comment already makes for its own category.

### Hook 2 — stat potency

`src/systems/Progression.ts` already funnels every stat's per-point value through eight
getters on `PlayerProgression` (`Progression.ts:153-189`). Adding potency **inside the
class** means one edit covers mechanics *and* every UI readout, with **zero MainScene
changes**:

- New private `statPotency: Partial<Record<StatType, number>>` + a
  `setStatPotency(map)` called once from `applyCharacter`.
- A private `potency(stat)` returning `this.statPotency[stat] ?? 1`.
- Every getter multiplies its per-point constant by `potency(stat)` —
  `enduranceStaminaBonus`, `vitalityHealthBonus`, `critChanceBonus`, `critMultBonus`,
  `healingReceivedMult`, `staminaRegenMult`, `xpMult`, `buffDurationMult`.
- **Refactor `statTotalEffect()` (`Progression.ts:55-72`) to read the getters** instead of
  re-multiplying the raw constants. It currently duplicates the per-point math; routing it
  through the getters both picks up potency for free and removes an existing drift risk.

Because `progression` is rebuilt in `create()`, potency resets on `scene.restart()` with
no extra work (the standing field-initializer gotcha is already handled there).

### The roster

Each survivor: 2–3 favoured skills, 1 mild skill penalty, 1 signature stat, 1 mild stat
penalty. Existing global modifiers are **kept** — they're the character's flat identity;
affinity/potency is its *growth* identity. Penalties sit only on combat/utility axes,
never on `chopping`/`mining`.

| Survivor | Skill affinity | Skill penalty | Stat potency | Stat penalty |
|---|---|---|---|---|
| **Vagabond** — light-footed wanderer | Running ×1.6, Light Armor ×1.4 | Blunt ×0.8 | Agility ×1.5 | Strength ×0.85 |
| **Reaver** — bruiser | Blunt ×1.6, Slash ×1.4 | Magic ×0.75 | Strength ×1.5 | Intelligence ×0.85 |
| **Ashcaller** — scholar | Magic ×1.6, Ranged ×1.4 | Heavy Armor ×0.8 | Intelligence ×1.5, Wisdom ×1.25 | Vitality ×0.85 |
| **Warden** — prepared tank | Heavy Armor ×1.6, Chopping ×1.4, Mining ×1.4 | Ranged ×0.8 | Vitality ×1.5 | Agility ×0.85 |
| **Ascetic** — nerve, no gear | Light Armor ×1.6, Pierce ×1.4 | Slash ×0.8 | Endurance ×1.5 | Wisdom ×0.85 |

Note the Warden is the only one with gathering affinity — it fits "comes prepared" and,
per the drop lock, it's an upside-only use of that axis.

### Invariant guard

Add a small module-level check in `Characters.ts` (dev-only `console.warn`, in the spirit
of the existing in-file design comments) asserting no `skillXpMult` entry for `chopping`
or `mining` is `< 1`. Cheap, and it encodes the user's lock where a future editor will see
it rather than only in a plan file.

### Display (the feature is invisible without this)

- **`src/systems/Characters.ts`** — a `affinityLines(def)` helper that formats the maps
  into display strings (`"+60% Running XP"`, `"Agility worth 1.5x"`). Derived from the
  data so card text can never drift from the numbers, unlike the hand-written
  `boon`/`bane` strings.
- **`src/ui/CharacterSelectUI.ts`** — a new `AFFINITIES` block on each card, styled with
  the existing `BOON_COLOR`/`BANE_COLOR` amber/dim-grey pair (red/green stay reserved per
  the standing convention). Cards are currently sized to measured content
  (`CARD_H = 400`, `PANEL_H = 600`); both will need bumping — **measure the real rendered
  height live, don't guess**, matching the existing comment at `CharacterSelectUI.ts:25`.
- **`src/ui/CharacterMenu.ts`** — the Stats tab's `Now:` line (`CharacterMenu.ts:284`)
  picks up potency automatically via `statTotalEffect`; add a small signature marker on
  rows where potency ≠ 1. The Skills tab hover (`CharacterMenu.ts:221`) appends the
  character's XP affinity for that skill. `skillImpactDescription` in `Skills.ts` stays
  character-free — append in `CharacterMenu` from a new `character` dep, so the
  framework-free system file doesn't learn about characters.
- **`src/dashboard/main.ts`** — two columns on the existing Characters tab
  (`main.ts:993`), imported live from `Characters.ts` like the rest of it.

No `RECIPES.md` change (no recipes/costs touched).

## Files

| File | Change |
|---|---|
| `src/systems/Characters.ts` | Two `RunModifier` fields, two `RunCharacter` getters, roster table, `affinityLines()`, drop-lock guard |
| `src/systems/Progression.ts` | `setStatPotency`/`potency`, potency in all 8 getters, `statTotalEffect` refactored onto the getters |
| `src/scenes/MainScene.ts` | One line in `awardSkillXp` (:9299); `setStatPotency` call in `applyCharacter` (:10041) |
| `src/ui/CharacterSelectUI.ts` | Affinities block + re-measured `CARD_H`/`PANEL_H` |
| `src/ui/CharacterMenu.ts` | Potency marker on Stats rows, affinity line on Skills hover, new `character` dep |
| `src/dashboard/main.ts` | Two columns on the Characters tab |
| `STATUS.md` / `CLAUDE.md` | New entry + roadmap line (per the maintenance rules) |

## Verification

`node node_modules/typescript/bin/tsc --noEmit` first, then live via `preview_start`
(config `"dev"`) + `preview_eval` against `window.__game.scene.getScene('MainScene')` —
the project's standard workflow. Measure, don't eyeball:

1. **Affinity math** — pick a character, call `awardSkillXp` for a favoured, a penalised,
   and a neutral skill with an identical base; assert the resulting `skills.getXp` deltas
   are in the expected ×1.6 / ×0.8 / ×1.0 ratio.
2. **Composes, doesn't fold** — set Intelligence high, re-run (1); confirm the affinity
   ratio between the three skills is *unchanged* (proving it multiplied outside the
   additive bucket) while all three absolute values rose.
3. **Potency** — allocate N points into a signature stat and its penalised stat; assert
   `vitalityHealthBonus()`/`critMultBonus()`/etc. and the `statTotalEffect()` **string**
   both reflect the multiplier, and that `syncStatBonuses()` produced the matching real
   max HP/stamina.
4. **Drop lock** — assert programmatically over `CHARACTER_DEFS` that no `skillXpMult`
   entry for `chopping`/`mining` is `< 1`. Also confirm `choppingBonusChance` at a given
   level is identical across all five characters (potency must not touch it).
5. **Neutral baseline** — with no character (`new RunCharacter()`), confirm XP and every
   stat getter are byte-identical to pre-change values.
6. **Score isolation** — re-confirm B4-P1's locked rule: `Run.score()` identical across
   characters at the same kills/time.
7. **UI** — render the picker and read back card text/heights to confirm the affinities
   block fits inside `CARD_H` with no overlap (the same measured-gap assertion B3-P5's
   verification used); open the Character menu and read the Stats `Now:` line and a Skills
   hover string.
8. `preview_console_logs` at level `error` — expect zero, and a clean `scene.restart()`
   (New Run → different character → potency/affinity fully swapped, no carryover).

Screenshots if the Browser pane renders in this environment; otherwise verify via render
data, as B4-P2 did.
