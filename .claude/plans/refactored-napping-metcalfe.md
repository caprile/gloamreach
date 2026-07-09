# Plan: Progression — Skills, Player Level, Damage Types, Stat Points

## Context

The roadmap's next unbuilt milestone (per `CLAUDE.md`) is **Progression**. The codebase
already has a *dormant* seed of this: `src/systems/Skills.ts` defines a tiny
`axes`/`pickaxes` skill-level system whose only job is gating `Recipe.requiredSkill`
(currently both set to level 0, i.e. trivially met), plus a `MainScene.gainSkillLevel()`
method that is **defined but never called anywhere** — no XP source has ever been wired
up. This milestone builds the real thing on top of that seed.

Per the user's direction, there are **two distinct, separate concepts**, not one:

- **Skills** — many small per-activity levels (Blunt, Chopping, Light Armor, etc.).
  For now these ONLY gate recipes (as they already do). No stat/damage effect from a
  skill level itself.
- **Player Level** — one overall character level, fed *by* skill leveling, that grants
  allocatable stat points (Endurance/Strength/Agility/Intelligence). This is the system
  meant to feel meaningful moment-to-moment, per the user's explicit "a new tier weapon
  should matter a lot more than one player level, but player levels shouldn't feel
  insignificant" framing.

This also introduces **weapon damage types** (slash/blunt/pierce/ranged/magic) as a new
concept — needed both to route weapon-hit XP to the right skill and to eventually gate
multi-skill weapon recipes ("5 Blade + 5 Pierce"). Only `blunt` has real content today
(Wood Club, Stone Club); the other four exist in the type system now so future content
(ranged Slingshot, magic weapons, heavy armor) slots in without a redesign.

All numeric constants below (XP costs, curve shape, stat-bonus-per-point) are explicitly
first-pass, flagged as tunable — consistent with how every other system in this project
(Drying Rack timings, Boar loot counts, enemy spawn counts) shipped with placeholder
numbers and was tuned after playtesting.

## Locked design decisions

- Skills only gate recipes; no stat effects from skill level itself.
- Player Level grants points/level (reaching level N grants exactly N points that level-up).
- Stats: `endurance`, `strength`, `agility`, `intelligence`. **No `luck`** — explicitly
  deferred, not even stubbed.
- Endurance → flat bonus to max HP and max Stamina (pool size only — no regen system
  exists, and this doesn't add one).
- Strength → damage % + stamina-cost % for non-magical melee weapons (live today — both
  existing weapons qualify).
- Agility → same, for non-magical ranged weapons (inert today — no player ranged weapon
  exists yet; framework must not require one to exist to compile/wire correctly).
- Intelligence → same, for magical melee weapons (inert today, same treatment as Agility).
- Skill XP curve (per skill): level N→N+1 costs `100 * (N+1)` XP — a refill-style bar,
  not cumulative total. Soft cap `MAX_SKILL_LEVEL = 100`; a future item-based cap raise
  is out of scope but nothing here should assume the cap is hardcoded elsewhere.
- Player XP source: **every skill level-up** grants Player XP equal to that skill
  level-up's own XP cost (`100 * (N+1)`). Multiple skills leveling in parallel early
  (11 skill types exist) is what makes early player levels come fast.
- Player Level curve: steeper than skills' linear curve, so leveling feels fast at
  first and significant later. First-pass: `xpToNextPlayerLevel(level) = round(40 *
  (level+1)^1.6)` → lvl1→2 ≈121, lvl2→3 ≈225, lvl4→5 ≈495, lvl9→10 ≈1592,
  lvl14→15 ≈3010. Flagged tunable.
- First-pass stat bonuses: Endurance +4 max HP / +2 max Stamina per point; Strength/
  Agility/Intelligence +2% weapon damage per point, −1.5% stamina cost per point
  (floored so cost can't hit ≤0).
- First-pass skill XP grants: weapon hit → 30 XP (primary damage type), tool hit
  (chop/mine) → 30 XP, sprinting → 10 XP/sec, armor-kill → 30 XP per distinct worn
  armor type. **Blocking (30/60 on parry) has no mechanic to hook into yet** — the
  `blocking` skill type and constants exist, but no XP source is wired (no block/parry
  mechanic exists in the game at all) — mirrors how the whole Skills system sat dormant
  before this milestone.
- Recipe skill gates: `stone_axe`→chopping lvl0 (renamed from `axes`), `stone_pickaxe`
  →mining lvl0 (renamed from `pickaxes`), `stone_club`→**blunt lvl3** (new — reachable
  "for free" just from using the starting Wood Club, which is the point), `gremlin_cap`/
  `gremlin_shirt`/`gremlin_pants`→**light_armor lvl0** each (new).
- Recipes may require **multiple** skills at once (future-proofing per the user's own
  "5 Blade + 5 Pierce" example) — widen `Recipe.requiredSkill` (singular) to
  `requiredSkills?: {skill, level}[]`.
- New UI: a "Character" panel (key **`K`**, confirmed unused — current binds are WASD,
  Shift, Space, Tab, Esc, 1-9, V, O) with a Skills tab (all 11 skills grouped
  Weapon/Armor/General, level + XP bar each) and a Stats tab (player level/XP,
  unspent points, one "+" per stat, immediate-apply, no refunds — matches this
  codebase's general "state commits immediately" style used everywhere else).
- HUD gets a 3rd stacked bar (XP) above the existing Stamina/Health bars, plus a
  "Lvl N" label, using the exact same anchor-and-stack pattern already established.
- Both skill level-ups and player level-ups reuse the already-wired `"levelup"`
  `LogKind` (colors already defined in `EventLogUI.ts`) — no EventLog/EventLogUI changes
  needed.

## Build order

Ship as four ordered sub-milestones so each is independently testable/committable:

**A — Skill/Weapon foundation** (compiles + plays identically; no new behavior yet)
1. `src/systems/Weapons.ts` — add `DamageType = "slash"|"blunt"|"pierce"|"ranged"|"magic"`,
   `WEAPON_DAMAGE_TYPES: Record<WeaponType, DamageType[]>` (`wood_club`/`stone_club` →
   `["blunt"]`), `weaponPrimaryDamageType(weapon)`.
2. `src/systems/Skills.ts` — rewrite. New `SkillType = DamageType | "heavy_armor" |
   "light_armor" | "running" | "blocking" | "chopping" | "mining"` (importing
   `DamageType` from `Weapons.ts` is safe — neither file has any imports today, so no
   cycle). Add `SKILL_TYPES` array, `WEAPON_SKILLS`/`ARMOR_SKILLS`/`GENERAL_SKILLS`
   grouping arrays (for the Skills-tab UI), `MAX_SKILL_LEVEL = 100`,
   `skillXpToNext(level)`, `skillDisplayName(skill)`. `Skills` class: per-skill
   `level`/`xp` records, `get(skill)`, `getXp(skill)` (progress within current level,
   for UI bars), `addXp(skill, amount)` (fractional-safe; loops while
   `xp >= skillXpToNext(level) && level < MAX_SKILL_LEVEL`, decrementing xp and
   incrementing level each pass), and an `onLevelUp(cb: (skill, newLevel, xpCost) =>
   void)` subscriber method — **mirror `EventLog.onAdd`'s exact shape** (an array of
   listener callbacks, not a single constructor-injected one — matches this codebase's
   existing idiom for "notify on state change" rather than inventing a new pattern).
   Delete the old `levelUp()` direct-increment method — nothing but the dead
   `gainSkillLevel` called it.
3. `src/systems/Recipes.ts` — `requiredSkill?` → `requiredSkills?: {skill,level}[]`;
   update the 5 recipes per the locked decisions above (rename axes/pickaxes, add
   stone_club + 3 armor pieces).
4. `src/systems/Crafting.ts` — `skillMet()` (~line 59-61) checks `(recipe.requiredSkills
   ?? []).every(req => skills.get(req.skill) >= req.level)`.
5. `src/systems/Items.ts` — add `ArmorType = "heavy_armor"|"light_armor"`, `ItemDef.
   armorType?: ArmorType` (near `armorSlot`), tag `gremlin_cap`/`shirt`/`pants` as
   `light_armor`. Add a hand-written `{label:"Damage Type", value:"Blunt"}` stats-array
   entry to `wood_club`/`stone_club` (matches this file's existing convention of
   hand-duplicating table values into `stats`, e.g. `wood_club`'s `"Damage":"3"` already
   duplicates `WEAPON_DAMAGE.wood_club` by hand — don't build a derivation helper).
   Add `armorTypesWorn(slots: (EquippedItem|null)[]): ArmorType[]` here (not in
   `Equipment.ts` — `Items.ts` already owns `ItemDef`/`armorType` lookups, and
   `Equipment.ts`→`Items.ts` would risk a cycle since `Items.ts` already imports
   `EquipSlot` from `Equipment.ts`).

**B — Hook points** (skill XP starts flowing; player-visible in the event log)
6. `MainScene.ts`: construct `Skills` with `onLevelUp` wired to log `"${name} leveled up
   -> Lvl ${n}"` (via `skillDisplayName`) and call `refreshDiscovery()` (a level-up may
   unlock a recipe). Delete dead `gainSkillLevel()` (~line 1636-1644).
7. Hook 1 (weapon hit) in `tryAttackEnemy()` (~line 1404-1406): `this.skills.addXp
   (weaponPrimaryDamageType(this.equippedWeapon), 30)` right after `enemy.takeHit(dmg)`.
8. Hook 2 (armor-kill) in the same function's kill branch (~line 1407-1418): for each
   type in `armorTypesWorn(EQUIP_SLOTS.map(s => this.equipment.get(s.id)))`, `this.
   skills.addXp(type, 30)`.
9. Hook 3 (chop/mine) in `tryInteract()`'s tool-swing branch (~line 1344, right after
   `node.takeHit(...)`): reuse the already-in-scope `kind` local (computed at line 1328)
   — `this.skills.addXp(kind === "axe" ? "chopping" : "mining", 30)`.
10. Hook 4 (running) in `update()` (~line 382-384): inside the existing `if (frame.
    sprinting)` block, `this.skills.addXp("running", 10 * (delta / 1000))`.
11. `src/ui/CraftingMenu.ts`: `CraftingMenuDeps` gains `skills: Skills`. `isCraftable()`
    (~line 35-37) also requires `(recipe.requiredSkills ?? []).every(r => deps.skills.
    get(r.skill) >= r.level)`. `renderDetail()` (~line 226-261, right by the existing
    "Requires a nearby Workbench" amber-line block) adds one amber line per unmet skill
    requirement: `"Requires ${skillDisplayName(req.skill)} Lvl ${req.level} (currently
    Lvl ${have})"`. `MainScene.createCraftingMenu()` (~line 1648-1657) passes `skills:
    this.skills` in the deps object.

**C — Player Progression**
12. New `src/systems/Progression.ts` — `StatType = "endurance"|"strength"|"agility"|
    "intelligence"`. Constants `XP_BASE=40, XP_EXPONENT=1.6`,
    `xpToNextPlayerLevel(level)`, `ENDURANCE_HP_PER_POINT=4`,
    `ENDURANCE_STAMINA_PER_POINT=2`, `DAMAGE_PCT_PER_POINT=0.02`,
    `STAMINA_COST_PCT_PER_POINT=0.015`. `PlayerProgression` class: `level` (starts 1),
    `xp`, `unspentPoints`, per-stat allocated counts, `addXp(amount)` (loops like
    `Skills.addXp`, awarding `this.level` points each level-up), `allocate(stat)`
    (spends one point, returns false if none unspent), `statValue(stat)`,
    `enduranceHealthBonus()`/`enduranceStaminaBonus()`, and an `onLevelUp(cb)`
    subscriber (same `EventLog.onAdd`-style pattern as `Skills`). Also export
    `weaponDamageMultiplier(dmgType, progression)` / `weaponStaminaCostMultiplier(...)`
    — keyed generically off `dmgType` (magic→intelligence, ranged→agility, else
    strength) so a future ranged/magic weapon needs zero changes here.
13. `src/systems/Health.ts` / `src/systems/Stamina.ts`: add `setBonusMax(n)` +
    change `get max()` to `BASE_MAX + this.bonusMax`. `Health.reset()` must NOT touch
    `bonusMax` (it's progression-derived, not respawn-derived).
14. `MainScene.ts`: construct `PlayerProgression`; wire `Skills.onLevelUp` to also call
    `progression.addXp(xpCost)`. Wire `progression.onLevelUp` to log `"Level Up! You
    are now Level ${level} (+${points} points)"` and refresh the XP bar. Call `health.
    setBonusMax(progression.enduranceHealthBonus())` / `stamina.setBonusMax(...)` once
    on create, and again wherever an Endurance point is allocated (Character menu's "+"
    handler). In `tryAttackEnemy()`, apply `weaponDamageMultiplier`/
    `weaponStaminaCostMultiplier` (keyed off `weaponPrimaryDamageType`) to the damage
    (~line 1404) and stamina-cost (~line 1396) lookups, rounding once at the call site
    (matches `weaponDamage()`'s existing plain-int return convention).

**D — UI**
15. `MainScene.ts` HUD: `createXpBar()`/`refreshXpBar()` following `createHealthBar`/
    `createStaminaBar`'s exact 3-object (bg/fill/text) pattern (~line 2248-2314),
    stacked one more slot above Health via the same `barY - gap - barH` chain, plus a
    small "Lvl N" text. No shared bar abstraction — the existing two bars are already
    hand-duplicated with no helper, so a third follows suit rather than refactoring.
16. New `src/ui/CharacterMenu.ts` — follow `UpgradeMenu.ts`'s full-page-popup pattern
    (centered, `[ESC] Close`, `open/close/isOpen/refresh/containsPoint`), NOT
    `CraftingMenu.ts`'s docked-panel pattern. Two tabs: **Skills** (grouped via
    `WEAPON_SKILLS`/`ARMOR_SKILLS`/`GENERAL_SKILLS`, each row = name + "Lvl N" + a
    small XP progress bar reusing the bg/fill/text pattern) and **Stats** (player
    level/XP bar, `unspentPoints`, one row per `StatType` with current value, a
    one-line effect description, and a "+" button greyed when no points are unspent).
17. `MainScene.ts`: construct `CharacterMenu`, bind `keydown-K` → toggle, add to
    `anyMenuOpen()` (~line 465-473) and the existing ESC-close chain (~line 340-347),
    add `"Character: K"` to the `KeybindsUI` bind array (~line 2211-2221).

## Playtest revisions (post-ship, same day)

Three playtest batches landed on top of the A–D build above, each requested directly by
the user after real sessions. Full detail/verification for all three is in `STATUS.md`;
summarized here since several reverse or replace decisions locked above:

1. **Skill-gated recipes reverted to discovery-time (hidden until met)** — this plan's
   original "craft-time visible-but-greyed" choice (a resolved ambiguity at write time)
   was overridden the same day: a skill-locked recipe is now fully invisible until met,
   matching undiscovered-ingredient treatment. `Crafting.refresh()` checks `skillsMet`
   again; the amber "Requires `<Skill>` Lvl N" UI line this plan added was removed as
   dead code once that reverted.
2. **Stat table reworked** — `Endurance/Strength/Agility/Intelligence` (this plan's
   damage-%-per-point design) replaced by `Endurance/Vitality/Strength/Agility/
   Intelligence/Willpower`: Endurance/Vitality are pool-size only (+1 Stamina / +1 HP
   per point, split from one combined stat); Strength/Agility are stamina-cost-only
   (−0.5%/point, no damage); Intelligence/Willpower are explicit placeholders
   (spell-cast-time/mana-cost, no such systems exist). Weapon damage scaling **moved
   from player stats to the weapon skill's own level** (+0.5% dmg/level,
   `Skills.weaponSkillDamageMultiplier`) — skills gained a real mechanical effect
   beyond gating recipes, contradicting this plan's "no stat effects from skill level
   itself" line above (superseded).
3. **Player-level curve steepened** (`XP_BASE`/`XP_EXPONENT` 40/1.6 → 150/1.9) after a
   playtest reached level 8-9 in one session — not a bug, just tuned too gently against
   11 concurrently-leveling skills feeding it.
4. **New, unplanned additions**: sprint speed slowed substantially with Running's skill
   level clawing it back slowly (`Skills.runningSprintMultiplier`); a general
   workbench-proximity gate for **all** upgrades keyed off the base recipe's tier
   (fixed a real gap — only Gremlin Pants had any workbench check before); quick-move
   changed from right-click to double-left-click, freeing right-click for context-menu/
   upgrade actions; gremlin aggro/attack ranges cut ~15%; recipe-unlock toasts moved
   from top-right to the left side under the inventory panel with dynamic per-message
   height (fixed a real overlap bug) and a slower fade; a Skills-tab hover tooltip
   showing each skill's mechanical impact "if applicable"; the Character menu (`K`)
   defaulting to the Stats tab plus a bobbing "N Stat Points Available!" badge when
   points are unspent.

## Verification

- `node node_modules/typescript/bin/tsc --noEmit` after each sub-milestone (A/B/C/D).
- Via `preview_eval`: after B, farm a tree/rock and land weapon hits, confirm
  `skills.get("chopping"|"mining"|"blunt")` climbs and an event-log `"levelup"` entry
  fires on level-up; confirm `stone_club` stays hidden from discovery until
  `blunt` reaches level 3 purely from Wood Club hits. After C, confirm
  `progression.level`/`unspentPoints` climb as skills level, and that allocating an
  Endurance point immediately bumps `health.max`/`stamina.max`. After D, confirm the
  HUD XP bar/level label render and update live, and the `K` panel opens showing all
  11 skills with correct grouping and current levels, plus the Stats tab's "+" buttons
  spend points and reflect in Health/Stamina bars without reopening the panel.
- `preview_screenshot` to confirm the new HUD bar and Character panel render cleanly
  against the existing HUD (no overlap with hotbar/keybinds/event log).
- Check `preview_console_logs` (level `error`) throughout.
