# STATUS Archive — older milestone entries (grep by id; never Read in full)

### Previously: 40-min playtest fix batch (12 items) + relic rarity/tier rework

A grab-bag off the user's 40-min "almost died a lot, feels harder — good" session. Built on
Opus (the relic change is a new data model). No new milestone letter. All 12 items done +
verified in the live preview.

**Relic rarity/tier rework (the big one — `Relics.ts`).** Trophies now carry a **rarity +
tier**, and a trophy's rarity drives an **outcome table** over the RESULT rarity (locked
odds, the user): a **Common** trophy → 1% Rare / 2.5% Uncommon / 10% Common (else 86.5% fail,
never Mythic); **Uncommon** → 1% Mythic / 5% Rare / rest Uncommon (never fails); **Rare** →
10% Mythic / rest Rare. A relic's **power tier always equals the trophy's tier**
(Tier-1 trophy → Tier-1 relic only). New `TROPHY_OUTCOME_ODDS` + `rollOutcomeRarity()` (walks
the bands, subtracting each — the listed chances ARE the exact odds) +
`trophyOverallSuccessChance()`. `TrophyRoll` dropped its `successChance` field;
`RARITY_SUCCESS_CHANCE` removed. `RollResult.rarity` is now the PRODUCED rarity (may exceed
the trophy's — a Common trophy CAN roll up into an Uncommon/Rare relic, and the
`RelicRevealFx` slot-machine shows that bigger reveal, which is the gamba payoff). **First
roll of a run is a guaranteed success** (the "hook" the user floated) via a `firstRollDone`
flag + `isFirstRollPending()`; the forge button surfaces "first roll guaranteed". Pity kept
as a floor (common 12). All first-biome trophies stay Common/Tier 1. Verified live: 20k-roll
sample gave Rare 1.02% / Uncommon 2.71% / Common 12.74% / Mythic 0% / fail 83.5% (matches
spec + pity), first roll guaranteed. `RelicForgeMenu` readout + the dashboard Relics tab
(outcome breakdown) + `RECIPES.md` all updated.

**The other 11 (playtest notes):**
- **Dashboard armor Lvl 3.** The Armor tab only showed Base + Lvl 2 (the 3-tier rebalance
  shipped but the dashboard never got a Lvl 3 column). Now Base/Lvl 2/Lvl 3 columns
  (full-set 7/10/13) + an "Armor upgrade costs" table. Balance tab's "Full armor" card now
  uses the max tier (Lvl 3). Verified live.
- **Boar faces its charge.** `applyFacing()` silently no-ops on a unit vector (magnitude < 3),
  so the charge/coil wind-up tells never rotated the sprite. New `Enemy.faceAngle(angle)`
  bypasses the guard; Boar's charge wind-up + Snake's coil now point the right way.
- **Committed attacks aren't interruptible by hits.** `Enemy.playHitFeedback()`'s x-shake
  tween fought a charging Boar's own body velocity + snapped it back on complete — read as
  "attacking cancels the charge." Now skips the shake only while an attack is *moving*
  (wind-up/recovery punish windows still flash).
- **Boss regens while deaggro'd.** `GremlinKing` heals 12 HP/s (+ poise refill) only while
  fully deaggro'd, so kiting away to rest doesn't bank chip damage for free.
- **Smash is dodgeable (i-frames confirmed working).** i-frames DO work — the slam routes
  through `applyDamageToPlayer`'s `invulnerableUntil` guard. The real bug: `SMASH_RADIUS` 120
  was bigger than the ~102px a walking player (95px/s) can travel in the ~1080ms telegraph+
  leap, so it was undodgeable by movement. Cut to **95** (walk-dodge viable, sprint/dash gives
  margin).
- **Snake Meat + 2 dishes.** New `snake_meat` resource (Snake drops 1, elite 2, alongside
  leather) → **Cooked Snake Meat** (shishkabob + snake_meat, +2 HP/s 22s) and **Blood-Glazed
  Snake Skewer** (+ gremlin blood, Lvl 2 campfire, +3 HP/s 35s). New Items/textures/Cooking
  rows; verified textures load.
- **Bones economy.** Boar bones drop 1→**1-2** (elite 2→2-3); Bone Knife Lvl 2 cost 5→**3**
  bones. (Chose drop-bump + cost-ease over a boar respawn system — noted as a future option.)
- **Stamina hint reworded** — no longer blames sprinting ("Sprinting, dashing, and attacking
  all drain it").
- **Workbench placement bug.** Crafting a placeable left the crafting menu open; a following
  recipe click fell through and placed ANOTHER workbench. `startPlacement()` now closes the
  crafting menu (mirrors `startItemPlacement`), + a belt-and-suspenders guard skips placement
  clicks over the crafting panel.
- **"Destroy" → "Pick up"** on the placed-object context menu + its event-log line (it
  returns a recoverable item, not a delete). Backpack-stack "Destroy" (a real delete) kept.
- **Relic Forge description** dropped the stale "or combine relics" (combine was removed).

### Previously: Enemy-dmg buff + boss dmg bump + GremlinKing "leaping smash"

The remaining balance half of the 25-min-playtest triage's "light both rebalance"
([[survivor-rpg-playtest-feedback-2026-07-11]]), plus the boss damage bump and the
cleave-replacement design. Number tuning + swapping one attack inside the *existing*
GremlinKing state machine — Sonnet-class work, built on Opus. the user locked the two open
forks via `AskUserQuestion`: cleave replacement = **leaping smash**; scope = **full balance
pass this session**.

**Enemy-dmg buff (gremlin-focused).** The dashboard Balance tab confirmed the "1 dmg/hit in
Lvl 2 armor" complaint was *specifically the gremlins* — flat mitigation
(`max(1, round(dmg − def))`) floored their 8-10 dmg to 1 against Lvl-2 (10) / Lvl-3 (13)
armor, while Boar (25) / Snake (20) still hurt. So the buff is a targeted gremlin bump, not
across-the-board (keeps it "light"): `RangedGremlin` claw **10→15**, projectile **8→11**,
`Gremling` claw **8→12** (`src/entities/Gremlin.ts`). Ordering preserved
(projectile < gremling claw < ranged claw < Snake < Boar); elite ×1.5 scales automatically
(claw→23/18). vs Lvl-2 armor gremlins now chip ~2-5 instead of 1; vs Lvl-3 they trickle to
1-2. Boar/Snake untouched (already threatening; buffing them would be "heavy").

**Boss dmg bump (~2-shot a full-armor player).** `GremlinKing.ts` charge **40→55**, slam
**45→55**, new smash **60** — sized so two hits through full armor (Lvl-3 = 13) roughly kill
a base 100-HP player (e.g. `(60−13)×2 = 94`). All three stay fully telegraphed/dodgeable, so
the threat is "respect the tells," not an undodgeable wall.

**Leaping smash replaces the cleave.** The old 140° forward cleave read as "just a worse
360° slam" (the user). Replaced with a **gap-closer**: at telegraph-start the boss locks the
player's position (clamped to `SMASH_MAX_LEAP` = 380px, like the charge target), draws a
growing **landing-zone marker circle at that locked point** (distinct from the boss's own
position), then leaps to it over `SMASH_LEAP_MS` (300ms) and impacts a 120px AoE + knockback
on landing. It *punishes running away* (the zone chases where you were) — dodge is to step
laterally out of the marked circle during the 780ms telegraph, a genuinely different read
from charge (fixed line, sidestep) and slam (fires where the boss stands). New state plumbing:
`smashTargetX/Y` + `smashLanded`/`smashElapsed`; `checkPlayerHit` gates the AoE on
`smashLanded` so it only connects after the leap arrives (null mid-air). `MELEE_STOP_RANGE`
(was `CLEAVE_RANGE`) is the new approach-stop distance. `BossAttackType` `cleave`→`smash`
throughout; `telegraphMsFor`/`recoverMsFor`/`pickAttack`/`drawTelegraph`/`beginExecute`/
`updateExecuting` all updated.

**Dashboard Enemies tab** (the one hand-mirrored data source) updated: gremlin damages, boss
attack list (Leaping Smash 60 / Charge 55 / Slam 55), and two now-stale "no telegraph" notes
corrected. No `RECIPES.md` change (no recipe/cost changes).

**Verification:** `tsc --noEmit` clean; preview boots error-free. Drove a live-spawned boss
via `preview_eval`: synchronous state-machine walk asserted `checkPlayerHit` returns null
mid-leap and `{60, kb 220}` only after `smashLanded`, plus charge `{55}` / slam `{55, kb 260}`;
a second **async** eval under the real physics loop confirmed the leap actually moves the boss
— it landed exactly on the locked point (`distToTarget: 0`, `movedFromStart: 380` = clamped
max toward a far player). `preview_screenshot` confirmed the landing-zone marker renders as a
distinct offset circle. Live enemies read the new claw damages (Gremlin 15 / Gremling 12,
elites 23/18; Boar 25 / Snake 20 unchanged). Zero console errors.

**Still queued from the triage:** 2 small features — Workbench-placement contextual hint
(`Hints.ts`) and an in-game relic compendium. Then the master-plan tail: **M-TE** (trophy
gear), **M-W1** (multi-biome world).

### Previously: Armor rebalance (3-tier set) + upgrade-menu polish

The armor half of the 25-min-playtest triage's "light both rebalance"
([[survivor-rpg-playtest-feedback-2026-07-11]]). Number tuning + extending the existing
(already-designed) armor-upgrade tables plus UI polish on the shared upgrade menu — Sonnet-class
work, built on Opus. Plan: `.claude/plans/hashed-enchanting-finch.md` (armor-rebalance follow-up
section).

**Armor: 9→16-in-one-tier was too much.** The old Gremlin set leapt the full-set defense from 9
(Lvl 1) to 16 (Lvl 2) in a single upgrade. Reworked into a **3-tier set, flat +1 armor per
tier**, to the user's exact spec:

- Base defenses (`Items.ts`): shirt 4→3, pants 3→2 (cap 2 unchanged). Per-piece per-tier:
  **cap 2/3/4, shirt 3/4/5, pants 2/3/4**.
- Full-set totals: **Lvl 1 = 7, Lvl 2 = 10, Lvl 3 = 13** — verified live via `armorDefenseForTier`.
- `ArmorUpgrades.ts`: existing lvl-2 `defenseBonus` retuned to +1-cumulative; new **lvl-3** rows
  (`resultTier: 2`) added per piece — costs escalate from lvl 2, all still gated on a
  Workbench-Lvl-2 (Tool Sharpener), since no higher Workbench tier exists yet. `deltaLabel` is
  the incremental +1; the stored `defenseBonus` is the cumulative bonus over base (matches
  `armorDefenseForTier`). **No wiring needed** — the UpgradeMenu / `applyArmorUpgrade` path was
  already tier-generic (weapon lvl2/lvl3 already exercised it).
- the user's note: the +1/tier proportional impact shrinks as raw armor numbers climb, so this
  curve is expected to be re-scaled per future biome, not assumed to hold deeper in.

**Upgrade-menu UX polish** (`src/ui/UpgradeMenu.ts` — one menu serves station/armor/weapon
upgrades, so both changes apply to all three):

1. **Timed loading bar before the upgrade lands** — reuses `ProgressBar` (roadmap 5p,
   [[survivor-rpg-timed-bars-gamba-relics]]) with the same commit-at-end + `busy` flag +
   cancel-on-close pattern as craft/process/cook (`UPGRADE_BAR_MS = 500`). Clicking a tier runs
   the bar (`startUpgrade()`) and only calls `deps.apply` — which consumes materials + bumps the
   tier — in the bar's `onComplete`. Every row greys + shows `(Upgrading…)` while it fills;
   closing the menu mid-bar cancels cleanly (nothing consumed). Multi-row tracking via
   `busyUpgradeId` + a `busyRowRect` (baseline rect captured in `renderUpgradeRow`, re-pinned over
   the filling row after render()'s panelY shift).
2. **Already-applied tiers are hidden, not greyed "(Applied)".** `render()` now filters
   `resultTier > target.tier`, so only the next (clickable) tier + any still-locked future tiers
   show. A fully-upgraded piece reads **"Fully upgraded."**; an undiscovered-higher-tier piece
   still reads "No upgrades discovered yet."

**Verification:** `tsc --noEmit` clean; preview boots error-free. Drove the real menu live via
`preview_eval` on an equipped cap with a placed tier-1 Workbench: rows showed Lvl 2 (clickable) +
Lvl 3 (Requires previous tier) with no "Applied" row; clicking played the bar (`busy`/`running`
true, tier still 0 mid-bar); on completion tier bumped 0→1, materials 20→19, and the applied Lvl 2
row vanished leaving only Lvl 3; a second upgrade reached tier 2 → "Fully upgraded."; a mid-bar
`close()` consumed nothing and reset `busy`/tier. `RECIPES.md` armor-upgrades table updated to
match (now lists Lvl 2 + Lvl 3 rows and the 7/10/13 set totals).

**Still queued from the triage:** the enemy-damage-buff half of the rebalance, the boss damage
bump + GremlinKing cleave replacement, and 2 small features (Workbench-placement hint, in-game
relic compendium). Then the master-plan tail: **M-TE** (trophy gear), **M-W1** (multi-biome world).


### Previously: M-RL relic economy rework (probabilistic roll + power tiers) + all-elites-drop-trophy

Reworked the M-RL relic economy the user shipped earlier the same day, per a new
locked spec, and did the trophy-drop prerequisite first. Detailed plan:
`.claude/plans/radiant-binding-relic.md` (rewritten). Built on Opus (core-system
rework).

**Part 1 — every elite drops a trophy (prerequisite, standalone).** Reverses the
M-EL2-era "Elite Gremlings drop no trophy" special case. Centralized in base
`Enemy`: `EnemyConfig` gained `elite?: boolean`, and the constructor now does
`this.elite = cfg.elite ?? false` + appends a shared `ELITE_TROPHY_DROP`
(`gremlin_trophy` ×1) to `loot` when elite. `Boar`/`Snake`/`RangedGremlin`/
`MeleeGremling` pass `elite` through to `super({...})` and dropped their own
`this.elite = true` lines; the ranged Gremlin's inline trophy entry was deleted
(no double-drop) and the melee Gremling's stale "do NOT drop a trophy" comment
fixed. Boss unchanged (drops `gremlin_king_fang`, not an elite → no
`gremlin_trophy`). Verified via `preview_eval`: elite Boar/Snake/Gremlin/Gremling
each `rollLoot()` → exactly 1 trophy; ranged elite still 1 (not 2); all normals 0;
King → 1 fang, 0 trophies.

**Part 2 — probabilistic economy (replaces the combine ladder).** Two axes:
- **Rarity** (Common/Uncommon/Rare/Mythic) = effect pool + roll odds,
  **source-determined by the trophy, NOT climbable — no manual combine.**
- **Power tier** (biome depth) = a magnitude multiplier on a relic's numbers
  (`POWER_TIER_MULT`, geometric ×1.0/1.5/2.25/3.375). **Flat ×1.0 this milestone**;
  scaffolding that activates in M-W1.
- **Probabilistic roll:** 1 trophy per attempt; **success chance by rarity — Common
  5% / Uncommon 10% / Rare 100%**; a **failed roll still consumes the trophy**. A
  **per-rarity pity counter** (`PITY_THRESHOLD`, Common 15) guarantees a success
  after N consecutive misses. Trophy map (`TROPHY_ROLL`): `gremlin_trophy →
  Common/tier1`, `gremlin_king_fang → Rare/tier1` (dormant, boss=win).
- **Duplicate auto-stacking replaces combine:** rolling a relic id (at a power
  tier) you own merges into that entry with ×N + aggregated stats — effects were
  always additive (each instance contributes `base × its power-tier mult`).

- **`src/systems/Relics.ts`** rewritten — `RelicInstance {id, powerTier}`,
  `POWER_TIER_MULT`/`powerTierMult`, `RARITY_SUCCESS_CHANCE`, `PITY_THRESHOLD`,
  `TROPHY_ROLL` (`{rarity, powerTier, successChance}`); `RelicManager` holds
  instances + a per-rarity miss counter, `roll(trophyKey, rng)` → a `RollResult`
  (`{success, rarity, id?, powerTier?, pity?}`), `missStreak()`,
  `groupedForDisplay()` (groups by id@powerTier), and the same aggregate getters
  (now summed over instances × power-tier mult). No `add()`/`combine()`/`nextRarity`.
  The 19-relic `RELIC_DEFS` pool is unchanged (only Common is reachable now).
- **`src/ui/RelicForgeMenu.ts`** rewritten — a **roll button per trophy** showing
  `"5% · pity in N"` (or "guaranteed" for Rare), an inline **result line** (forged
  relic name, or "The trophy crumbled to dust — no relic this time"), and a
  read-only owned-relics grid with a **T#** power-tier badge + scaled-number
  tooltips. **Combine bar removed.** `deps.roll` now returns the `RollResult` so the
  menu shows feedback. **`RelicBarUI.ts`** gained a small **T#** power-tier badge +
  power-tier in its grouping signature/tooltip.
- **MainScene** — `rollRelic(trophyKey)` now consumes the trophy **unconditionally**
  (before the roll), announces success or the "crumbled" failure, and returns the
  `RollResult`; `combineRelics` deleted; import `TROPHY_ROLL_RARITY→TROPHY_ROLL`;
  `.grouped()→.groupedForDisplay()`. All the effect hook points (damage/damage-taken/
  stamina/move/maxHP/maxStamina/killHeal/xp) are unchanged from the first ship.

**Verified** — `tsc --noEmit` clean; live `preview_eval`: forced fail (rng 0.99 >
5%) → no relic, miss streak 1, trophy consumed; forced success (rng 0) → Warrior's
Charm T1 added, streak reset; Rare (fang) always succeeds; **pity fires exactly at
attempt 15** (flagged `pity:true`); duplicate rolls → `groupedForDisplay()` "Warrior's
Charm T1 x2", `damageMult` 1.16; scene `rollRelic` consumes a trophy on **both** fail
(5→4, 0 relics) and success (4→3, +1 relic), returns null with no trophy;
`preview_screenshot` of the reworked forge menu (roll button with "5% · pity in 15",
"Forged:" result line, no Combine, T1 badges, ×2 stack) + bottom-left relic bar. No
console errors. (UI-render evals hit a canvas-context-pool exhaustion on the
long-HMR'd tab — an environment artifact that also hit untouched HotbarUI; a page
reload cleared it and the screenshot confirms the layout.) Next per the locked build
order: **M-WC (Gremlin War Camp) + M-TE (trophy-gated gear)**, then **M-W1** last.

### Previously: M-FA cut (design discussion, no code change)

The locked build order's next milestone was M-FA (Fresh Assault: a per-biome decaying
kill-bonus timer starting on entering a new biome). Reviewed with the user before starting
implementation: M-FA's premise already has no real trigger (only one biome exists until
M-W1 ships), and more fundamentally it would be **redundant with M-R1's already-shipped
score formula** — the speed multiplier there already applies only to the final-boss
completion bonus, which is already the "go fast, end-to-end" reward the game wants (locked
decision 4 in the master plan). Rather than build a workaround version (e.g. anchoring the
timer to run-start instead of biome-entry), the user opted to **cut M-FA from the build
order entirely**, revisiting only if M-W1's eventual multi-biome world exposes a real gap
the end-of-run multiplier doesn't cover.

Docs updated to reflect the cut: `.claude/plans/roguelike-metaloop-master-plan.md` (M-FA
section rewritten as "CUT", build-order list updated, header status line), `CLAUDE.md`
(new "5l. M-FA cut" roadmap entry + the umbrella-plan summary paragraph), and this file.
No code changed. Next up: **M-RL (trophy → RNG relics)** — self-contained, builds directly
on the trophy system M-EL2/Group C already shipped.

### Previously: M-EL2 — Generalized elite spawning

New milestone stub inserted into the roguelike meta-loop plan
(`.claude/plans/roguelike-metaloop-master-plan.md`) between M-FA and M-RL, per a
plan-review discussion with the user (locked via `AskUserQuestion`: do this before M-FA,
since M-FA's premise — "decaying bonus on entering a new biome" — has no real biome to
discover until M-W1 ships, while this milestone is self-contained). Built on Sonnet:
extends an already-established pattern (Group C's Gremlin/Gremling elites) to two more
enemy types and a probabilistic roll, rather than introducing new architecture.

- **Boar and Snake now have elite variants**, following the Gremlin/Gremling precedent
  exactly: +50% HP/damage, +10% move speed (`speedMult`), 1.3x scale, 2x loot, and a
  distinct crimson/gold recolor (`boar_elite`/`snake_elite` in `BootScene.ts`). Boar
  previously had no dedicated class — MainScene constructed a bare `Enemy` inline at two
  call sites — so it got a new `src/entities/Boar.ts` (mirrors `Gremlin.ts`'s shape) to
  hold the elite-scaling logic in one place instead of duplicating it. Snake's existing
  class gained an `elite?: boolean` constructor param; its `STRIKE_SPEED`/`FLEE_SPEED`
  velocity calculations previously multiplied only by `envSpeedMult` (the night buff) and
  not `speedMult` at all, so elite Snake's own speed bonus would have been silently
  inert — fixed alongside the elite work.
- **Chance-based elite rolls** replace the old all-or-nothing-per-site model: a new
  `MainScene.rollElite(rng, chanceMult)` helper (base `ELITE_SPAWN_CHANCE = 0.08`) is now
  called at every normal spawn site — `spawnEnemies()` (Boar/Snake/Gremlin/Gremling),
  `spawnAltarDensity()`'s extra gremlin-family spawns, and the M-DN nightfall surge
  (`spawnNightBatch()`, now also spawning Boar/Snake via the new `Boar` class instead of
  its own inline `Enemy` literal).
- **Higher elite chance at night**: `NIGHT_ELITE_CHANCE_MULT = 3` (→ ~24%) applied only in
  `spawnNightBatch()` — a third night effect alongside M-DN's existing speed buff and
  nightfall surge, still no damage buff.
- **Gremlin Shack guards are unchanged** (still hardcoded `elite: true`, not rolled) — per
  the open sub-decision noted in the master plan, they stay a deliberate fixed difficulty
  spike guarding a chest rather than folding into the probabilistic system.
- Kill-scoring needed **zero changes** — `MainScene`'s kill-category classifier already
  reads the generic `enemy.elite` field (`Run.ts` scoring), so Boar/Snake elite kills
  automatically count as `"elite"` kills same as Gremlin/Gremling always did.

Verified via `preview_eval`: spawned the world and confirmed elite Boar/Snake instances
carry correct stats (Elite Boar: 30 HP / 38 bite dmg / scale 1.3 / texture `boar_elite`;
Elite Snake: 17 HP / 30 bite dmg / scale 1.3 / texture `snake_elite`) and doubled loot
rolls (`rollLoot()` → 2/2 instead of 1/1). Ran `spawnNightBatch()` 30x (180 spawns) and
measured an observed 23.9% elite rate against the expected 24% (8% × 3). `tsc --noEmit`
clean, no console errors.

Two smaller backlog items flagged in the same review pass (not yet built, see
`CLAUDE.md`'s 2026-07-10 "second round" note): Gremlin Shacks should get the same minimap
landmark the Boss Altar already has, and interactables should show a hover highlight
border. Next per the locked build order: **M-FA (Fresh Assault discovery timer)** — a new
core mechanic, needs Opus, though its single-biome scope should be revisited before
starting (see the master plan's M-FA note).

### Previously: Comfort item (Bedroll) — replaces M-SB Sleep/Bed

Fourth milestone slot of the roguelike meta-loop (`.claude/plans/roguelike-metaloop-master-plan.md`),
after M-FX/M-R1/M-DN. Plan: `.claude/plans/imperative-riding-island.md`. Built on Sonnet
per the model-switch convention (a small, self-contained addition on top of already-designed
systems — placement, `Health`, `BuffManager` — not a new core mechanic).

The master plan's original M-SB was "Sleep + Bed, fast-forward to dawn." Discussed with the
user first: night is one of the run's few real sources of time pressure (M-DN's faster
enemies + nightfall surge), and a free skip-to-dawn would let players opt out of it every
night, so **the sleep/skip mechanic was dropped entirely**. Replaced with:

- **New placeable `comfort`** ("Bedroll" — "stuffed with reeds for cushioning"), tier 0
  (`src/systems/Items.ts`, `src/systems/Recipes.ts`), costing `{ wood: 3, cattail: 5 }` —
  reuses the existing `cattail` harvestable as the "reeds," no new raw resource. New
  placeholder texture in `BootScene.ts` (`icon_comfort`), doubles as the buff icon.
- **Live/conditional HP regen, +1 HP/s** (weaker than the weakest food buff, Cooked Boar
  Meat's +2 HP/s, so cooking still matters) — checked every frame in the new
  `MainScene.updateComfortRegen()`, no stillness required:
  1. Player within `COMFORT_RANGE` (80px) of a placed Bedroll.
  2. That Bedroll within `COMFORT_CAMPFIRE_RANGE` (120px) of a placed Campfire — **a hard
     requirement**, independent of Bedroll's own tier-0 craft-gating (tier 0 only means "no
     Workbench needed"; Comfort still does nothing without a lit fire nearby). New
     `isNearCampfire()` helper, copied from the existing `isNearWorkbench` pattern.
  3. No live enemy (aggro'd or not — simplest "safe area" read) within
     `COMFORT_SAFE_RADIUS` (350px) of the player. New `isEnemyNearby()` helper.
- **Reuses `BuffManager`/`BuffBarUI` directly instead of a new heal call + new HUD
  element** — every qualifying frame re-applies a short-lived (`durationMs: 400`)
  `comfort_rest` buff via the existing refresh-by-id `apply()` path; the instant a
  condition breaks, the scene stops calling `apply()` and the buff expires on its own
  within that same short window. This gets the "Resting" icon + `+1 HP/s` tooltip +
  depletion-meter look **for free**, identical to a food buff, with zero new UI code.
  `BuffManager`'s concurrent-buff cap raised 2→3 (`this.buffs.setMaxBuffs(3)` in
  `create()`) so Comfort doesn't get evicted by two simultaneous food buffs.
- **Destroy/recover needed zero new wiring** — the existing right-click context menu
  (`findPlacedObjectNear`/`destroyPlacedObject`) is already itemKey-agnostic, and
  `stationDisplayName()` already falls back to the plain item name when an itemKey has no
  upgrade table, so Comfort "just works" as a destroyable/recoverable placed object.

Verified live via `preview_eval`: placed a Campfire + Bedroll, confirmed the
`comfort_rest` buff (id/hpPerSec/refreshing `remainingMs`) appears while all three
conditions hold; independently broke each condition (player far from Bedroll, Bedroll far
from Campfire, a live enemy within `COMFORT_SAFE_RADIUS`) and confirmed the buff clears
each time, then confirmed it resumes when the condition is restored. `preview_screenshot`
confirmed the "Resting" icon renders in the existing buff bar above the HP bar, same visual
treatment as a food buff. One test-methodology note for future sessions: teleporting an
enemy far outside world bounds to "remove" it for a test gets silently undone by Arcade
Physics' `collideWorldBounds` clamp (it snaps back near the map corner, which can land
close to the player) — use `enemy.depleted = true` instead, which `isEnemyNearby()`
already skips regardless of position. `tsc --noEmit` clean, no console errors.

`RECIPES.md`, `CLAUDE.md` (roadmap 5j), and the master plan's M-SB entry updated to reflect
the supersede. Next per the locked build order: **M-FA (Fresh Assault discovery timer)** —
a new core mechanic, needs Opus.

### Previously: M-DN — Day/Night cycle (clock, night threat, torch lighting)

Third milestone of the roguelike meta-loop
(`.claude/plans/roguelike-metaloop-master-plan.md`), after M-FX and M-R1. Plan:
`.claude/plans/clever-sparking-gem.md`. Built on Opus per the model-switch convention (a
new core mechanic — a global clock + night state machine + a lighting layer). The
survival-time layer later milestones hang off (M-SB sleep-to-dawn, M-FA reads in-game time).

- **`src/systems/DayNight.ts`** (new, framework-free like `Run`/`Health`/`Buffs`) — the
  clock. **10 min day + 5 min night** (15-min cycle, run starts at dawn), ticked with
  `delta` from `MainScene.update()` so it freezes exactly when the run does. `phase()`/
  `isNight()`/`dayNumber()`, `enemySpeedMultiplier()` (binary: 1 by day, **1.15** at night),
  and `nightIntensity01()` (0 in full day, ramps 0→1 over a 20s dusk window, 1 through deep
  night, 1→0 at dawn — drives the tint alpha only). Verified live: the four phase samples +
  the dusk/dawn ramp all compute exactly (midday 0, dusk-mid 0.5, deep night 1, dawn 0.25).
- **Night enemy speed (locked: slightly faster, no damage buff)** — new public
  `Enemy.envSpeedMult` (default 1), assigned each frame in `updateEnemies()` from
  `dayNight.enemySpeedMultiplier()` and multiplied into every aggressive-movement velocity
  (base `Enemy` chase, `RangedGremlin` kite/pursue, `MeleeGremling` chase, `Snake`
  strike/flee — idle *wander* deliberately left at base speed). **GremlinKing is exempt with
  zero special-casing** — its overridden `update()` never reads the field. Verified live: a
  chasing Boar's body speed went 60 (day) → 69 (night), exactly ×1.15.
- **Nightfall surge + dawn cleanup (locked bound against density creep)** — at each
  day→night edge `spawnNightBatch()` drops ~6 normal enemies (2 Boar / 2 Snake / 2 Gremlin)
  into still-fogged cells in a 500–850px ring around the player (new
  `pickNightSpawnPoint()`, biased to `!fog.isRevealed()` non-creek cells; new `Fog.isRevealed()`),
  tracked in `nightSpawns`. At the night→day edge `cleanupNightSpawns()` destroys any tracked
  spawn that **never aggro'd and is off-screen**, so density returns to baseline every
  morning and can't creep upward over a long run; ones that engaged (or are on-screen) stay
  and fold into the roster. `Enemy.isAggro()` promoted `protected`→`public` for the filter.
  Surge only fires while alive; both edges run from a shared `updateDayNight()` called in the
  alive *and* dead branches of `update()`. Verified live: forcing the edge grew the roster by
  6 (all 6 in fogged cells, 560–850px out); forcing dawn with 5 idle+off-screen removed
  exactly those 5 and kept the 1 chasing one.
- **Torch lighting (added this pass, user request)** — the night visual is a light-**mask**,
  not a flat tint. `src/ui/NightOverlayUI.ts` (new) is a full-screen `RenderTexture` filled
  with dark blue at `nightIntensity01() × 0.42`, from which soft radial light circles are
  *erased* (new `light_soft` canvas-gradient texture in `BootScene`). Lights: the player
  when a **Torch** is the held hotbar item (`equippedLightRadius`, data-driven per item in
  `LIGHT_RADIUS_BY_ITEM` so a future Lantern just adds a row — torch 180px), plus each
  on-screen **Gremlin Shack / Boss Altar** (150px). Torch is now **non-stackable**
  (`maxStack: 1`). `collectLights()` computes screen-space holes (camera zoom 1). Depth ~2700
  sits above the world but below the minimap/HUD, so only the world dims. Verified live:
  torch equipped → one player light at screen-center r180 (0 when deselected); camera on a
  shack → 3 POI lights r150; screenshot shows a clean readable light pool on the player in a
  dimmed world.
- **HUD/minimap** — `RunHudUI` prefixes `[Day N]`/`[Night]`; `MinimapUI.setNightIntensity()`
  fades a light dark-blue overlay over the minimap panel (below the player marker).
- **Reset** — `create()` resets `dayNight`/`wasNight`/`nightSpawns`/`equippedLightRadius` per
  the standing `scene.restart()`-doesn't-re-run-field-initializers gotcha (M-R1's freeze
  bug). Verified: New Run → clock back to dawn, no carried-over night state.

**Verified** — `tsc --noEmit` clean; live `preview_eval` for every bullet above;
`preview_screenshot` of the torch-lit night; `preview_console_logs` clean. Next per the
locked build order: **M-SB (Sleep/Bed)**.

### Previously: M-R1 playtest fixes — New Run freeze, Clear Scores, boss tuning

First real playtest of M-R1 (14:17 run, max spear + max Gremlin armor, 6 elite kills, 1
boss kill at player level 5, score 3170) surfaced a real bug plus balance feedback. Built
on Sonnet (fixes on an existing system, no new mechanic).

- **"New Run" froze the game — real bug, not a preview quirk.** `MainScene.create()`'s
  M-R1 reset only covered `runOver`/`isDead`/`run` (see below), but `this.enemies`,
  `this.nodes`, `this.obstacleNodes`, `this.placedObjects`, `this.gremlinShacks`,
  `this.bossAltars`, `this.dryingRacks`, `this.placedLabels`, `this.discovered*` Sets, and
  every per-run **system** (`Skills`, `PlayerProgression`, `Crafting`, `backpack`
  `ItemContainer`, `Hotbar`, `Equipment`, `EventLog`, `Stamina`, `Health`, `BuffManager`)
  are all field-initialized **once at construction** and — per the standing
  `scene.restart()`-doesn't-re-run-field-initializers gotcha — silently carried over into
  the "new" run. `this.enemies` etc. specifically still held references to GameObjects the
  scene shutdown had already destroyed; the first `update()` tick of the new run iterated
  them and threw, freezing the game loop entirely (confirmed via `window.__game.loop.frame`
  staying static across ticks — a genuinely stuck rAF, not the documented backgrounded-tab
  preview quirk, which was a red herring encountered while first investigating this). Fix:
  `create()` now explicitly resets every one of those fields at the top, so "New Run" is
  the clean full reset (fresh character too — Skills/Progression/inventory/equipment all
  reset, only the localStorage high-score table survives) the original M-R1 plan doc always
  said it should be. Verified live: killed a run with 102 live enemies, clicked New Run,
  confirmed `window.__game.loop.frame` kept advancing afterward and the world was fully
  playable (screenshotted).
- **"Clear Scores" button** — `HighScores.clearHighScores()` (new, wipes the
  `localStorage` key) wired to a `[ Clear ]` link on `RunEndUI`'s high-score table header;
  `MainScene.showRunEndUI()` factored out of `endRun()` so the button can re-show the same
  screen with an emptied table without a full run restart.
- **Boss tuning** (`GremlinKing.ts`, all playtest-driven, first-pass numbers): cleave
  range 70→90 / arc 120°→140° / damage 22→30; **charge (the "line attack") speed
  340→480** (telegraph duration left alone — the dodge window stays readable, only the
  punish for not dodging got harsher); slam radius 110→150 / damage 35→45; attack
  cooldown 1200→950ms (less passive between attacks). The player's playtest was with
  max-tier gear (max spear, full Gremlin armor set) and no numeric baseline for "boss
  damage taken" was captured, so these are directional bumps to retest, not a tuned-to-a-
  target-DPS pass.

**Verified** — `tsc --noEmit` clean; live `preview_eval` (see New Run section above);
`preview_console_logs` clean.

### Previously: M-R1 — Run + Score + Hardcore Death

Second milestone of the roguelike run/score meta-loop
(`.claude/plans/roguelike-metaloop-master-plan.md`; detailed plan:
`.claude/plans/rustling-weaving-lovelace.md`), built on Opus per the model-switch
convention (new core mechanic). The run container the whole meta-loop hangs off:
a seed-stamped run with a live clock + score, hardcore permadeath, a boss-kill win
condition, and the game's **first localStorage save** (high-score table only).

- **`src/systems/Run.ts`** (new, framework-free like `Health`/`Buffs`) — owns a
  display-only `seed`, ticked `elapsedMs`, a kill tally (`normal`/`elite`/`boss`), and a
  pure `score()`. **Score formula (first-pass, all tunable):** flat kill points
  (`normal 10 / elite 30 / boss 500`) + a **completion bonus** (`2000`, win only) scaled
  by a **speed multiplier** (`clamp(10min / elapsedMs, 1, 3)`) applied to the bonus only.
  So a fast final-boss kill (mult ×3) dominates a slow full-clear, and grinding kills
  (flat) can't out-scale it — the master plan's core scoring constraint. Death score =
  kill points only; win score = `round(2000 × speedMult + killPoints)`.
- **Seed is display-only for now** (locked): generated + shown + recorded per run, but
  "New Run" just `scene.restart()`s with fresh RNG. True deterministic world-gen from a
  seed is deferred to M-W1 (which reworks world-gen anyway) — avoids refactoring every
  existing `Phaser.Math.Between` spawn/loot call.
- **`src/systems/HighScores.ts`** (new — first `localStorage` use anywhere) —
  `loadHighScores()` / `recordHighScore()`, key `survivor-rpg:highscores:v1`, sorted desc,
  capped at 20, tolerant of a missing/corrupt store (returns `[]` on any parse error).
  Returns the just-posted entry's 1-based rank for highlighting.
- **Hardcore death** (`HARDCORE = true` const, MainScene) — `onPlayerDeath()` now ends the
  run instead of respawning (after the existing ~2s death beat). The legacy
  `respawnPlayer()` path stays live behind the flag — the documented future "easy-mode"
  hook (master plan decision 3); nothing toggles it yet.
- **Win** — `tryAttackEnemy()`'s kill path classifies the kill (`GremlinKing` → boss, the
  `Enemy.elite` flag → elite, else normal) into `run.recordKill()`; a `GremlinKing` kill
  fires `endRun("won")` after a 1.2s beat so the death feedback plays first. (`elite` is
  now a readable field on `Enemy`, set by the two elite Gremlin constructors.)
- **`endRun(outcome)`** — freezes the world (a new `runOver` guard early-returns from
  `update()`), posts the `ScoreEntry`, and shows the run-end screen. Guarded against
  double-posting (e.g. dying during the post-win delay). `create()` now explicitly resets
  `runOver`/`isDead` and builds a fresh `Run`, since `scene.restart()` re-runs `create()`
  without re-firing boolean field initializers.
- **`src/ui/RunEndUI.ts`** (new, modeled on `CharacterMenu`'s flat-GameObject /
  `scrollFactor(0)` pattern, depth 3500-3502 above every in-game menu) — full-screen
  scrim + panel: **VICTORY!** (green) / **YOU DIED** (red) title — the one sanctioned
  red/green use per the reserve-red/green convention — final score, a breakdown block
  (time, kills, elite/boss, level, kill points, and on a win the completion bonus + speed
  mult), a top-5 high-score table (this run's row highlighted), and a **New Run** button
  (`scene.restart()`).
- **`src/ui/RunHudUI.ts`** (new, fixed-HUD depth 2820, top-left) — live run clock + score,
  minimizable to just the clock via **J** (new keybind, added to the Keybinds panel).
  KeybindsUI's panel nudged down (`PANEL_Y` 10→44) to clear it; EventLogUI follows
  automatically (anchored to the panel's top).

**Verified** — `tsc --noEmit` clean; live `preview_eval`: kill-point math exact
(`2×10 + 30 = 50`), forced death → `runOver`, YOU DIED screen (screenshotted), score
posted to `localStorage`; forced win → VICTORY! (only title in the display list),
fast-win score `510 + 2000×3 = 6510` exact, slow-win speed mult clamps to 1; New Run →
fresh run (kills 0, new seed, unfrozen) with scores persisted; HUD toggle collapses to
clock-only. No console errors. (Screenshots of the win screen were blocked by the known
paused-render-loop quirk — the live display list was authoritative instead.)

### Previously: M-FX — roguelike-batch warm-up fixes (fractional damage, chest re-arm, stat-panel recolor)

First milestone of the new roguelike run/score meta-loop plan
(`.claude/plans/roguelike-metaloop-master-plan.md`) — three small, independent fixes
surfaced while designing that plan, built on Sonnet per the model-switch convention
(fixes on existing systems, no new mechanic).

- **Weapon damage is now kept fractional all the way to `Enemy.takeHit()`.**
  `MainScene.tryAttackEnemy()` used to `Math.round()` damage before applying it, which
  silently discarded a weapon skill's +0.5%/level bonus whenever it didn't cross a whole
  number (e.g. Blunt lvl 10 on a base-5 weapon rounds right back to 5 — the bonus existed
  in the multiplier but had **zero actual effect** on the hit). Now the float is applied
  directly to `enemy.health` (a plain `number`, no type change needed) and only the
  floating damage-number popup rounds for display (`Math.round(dmg)` in
  `spawnDamageNumber`'s call site) — every skill level now has a real, cumulative effect
  even when two consecutive hits show the same displayed number. Verified live: a Stone
  Club hit at Blunt lvl 4 (mult ×1.02) dealt exactly 5.1 real damage (20 → 14.9 HP) while
  still displaying "5".
- **Gremlin Shack chest re-arm timing fixed** — `LootContainer.rearmIfEmpty()` was called
  from `MainScene.onShackGuardKilled()` at guard-*death* time, which let a player loot an
  emptied chest, kill the guards, and get an **immediate** fresh roll before the 6-minute
  respawn timer ever elapsed (the doc comment claimed it fired "once both guards respawn,"
  which was never true). The call moved into `respawnShackGuards()` itself, firing only
  when the guards actually come back. Verified live: killing both guards leaves
  `loot['rolled'] === true` (chest stays claimed-empty, no early re-roll); calling
  `respawnShackGuards()` is what flips it back to `false`.
- **Character menu Stats tab recolored off green** — green (`#8fe38f`) was used for
  "Unspent points" and the `[ + ]` allocate button (plus the Skills tab's "MAX" label);
  per the user, green/red should be reserved exclusively for buff/debuff markers (e.g.
  "boosted by an item") added later, so these are now neutral amber (`#e3b25a`) — same
  color already used for skill-group headers, so it reads as "info/action," not "buffed."
  Verified via `preview_screenshot`: the Stats tab with 3 unspent points shows amber
  throughout, no green.
- **Inventory (Tab) Combat column also recolored off its red/green rainbow** — the
  actual panel the user meant (the live equipped-stats readout next to Equipment in the
  Inventory menu, not the Character menu's Stats tab above — both got fixed). `Damage`
  was red (`#c25a5a`), `Armor` was green (`#7ac27a`), `Attack Speed`/`Attack Stamina` had
  their own cyan/gold — a decorative per-line rainbow with no actual meaning. All five
  stat lines (`InventoryMenu.renderCombatStats`) are now one neutral grey (`#8a93a3`,
  matching the already-bland Attack Range/Move Speed lines), freeing red/green for real
  buff/debuff deltas later. Verified via `preview_screenshot`: a Stone Club equipped
  shows "Damage: 5 Blunt" / "Attack Speed: 1.8/s" / "Attack Stamina: 14" / "Armor: 0"
  all in matching grey.

Type-check clean (`tsc --noEmit`), no console errors, `preview_screenshot` confirms the
recolored Stats tab. See the master plan doc for the full roguelike milestone list (M-R1
Run/Score/Hardcore death next, then Day/Night → Sleep/Bed → Fresh Assault timer → Relics →
Gremlin War Camp/trophy gear → circular world last — locked build order, confirmed by
the user).

### Previously: Cooking & Food Buffs (first food/consumable loop + first status-effect system)

The first food loop and the game's first **status-effect (buff)** system. Plan:
`.claude/plans/savory-simmering-hearth.md`. Built on Opus per the model-switch
convention (a new core mechanic — buff state machine + a new station interaction).
Locked design decisions (from the user this session):

- **Eating = a timed HP-regen buff only** — no instant heal (the user dislikes
  spam-insta-heal). Each food defines its own `hpPerSec` + `durationMs`; the buff
  heals over time and expires. Overheal at full HP is simply wasted (a natural
  anti-spam property). No HP *regen system* beyond buffs, no hunger meter.
- **Cooking is instant + station-based** — interact with a placed campfire → a
  cook menu → produce the dish now. No cook-over-time timer.
- **Foods this pass:** **Cooked Boar Meat** (`boar_meat` + `shishkabob` at any
  campfire → +2 HP/s for 20s) and **Bramble-Glazed Boar Skewer** (`boar_meat` +
  `blackberry` ×2 + `shishkabob`, at a **Lvl 2 campfire** → +3 HP/s for 30s).
- **Campfire is now upgradable to Lvl 2** (the "Stone Hearth" upgrade, **4 Twine
  + 20 Stone**) which unlocks the tier-1 dish.

New systems/UI:

- **`src/systems/Buffs.ts`** (`BuffManager`) — framework-free (no Phaser), like
  Health/Stamina. `apply(spec)` (re-applying the same food id refreshes duration
  rather than stacking; different foods run concurrently and their HP/s add up),
  `tick(delta, health)` (heals per active buff, drops expired, returns
  `{healed, changed}`), `active()`, `clear()`. `MainScene.update()` ticks it;
  refreshes the HP bar only when it actually healed.
- **`src/ui/BuffBarUI.ts`** — a centered row of food-buff icons just above the HP
  bar (icon = the food's own texture), each with a thin green depletion meter and
  a hover tooltip (name, HP/s, seconds remaining). Rebuilds the icon row only when
  the active *set* changes; updates meters/tooltip every frame. Depth 2803-2806
  (clears WORLD_H, below the 3000+ panels).
- **`src/systems/Cooking.ts`** (`COOK_RECIPES` + `canAffordCook`) — a small,
  self-contained multi-ingredient cook table (deliberately NOT a `RecipeCategory`
  in Recipes.ts, since cooking is a station interaction and this leaves room for a
  dedicated cooking station later). Each recipe gates on the campfire's own tier.
- **`src/ui/CookingMenu.ts`** — opened by clicking a placed campfire; a recipe
  LIST (unlike the Drying Rack's single-input slider, since dishes are
  multi-ingredient) showing each dish's ingredients (have/need, colored), buff
  summary, and a Cook button. Self-contained (no drag/drop) — a Cook click
  consumes straight from the backpack. (Initial ship showed higher-tier dishes
  dimmed with a "Requires Campfire Lvl N" note; superseded same-session — see
  the follow-up below, dishes above the open campfire's tier aren't listed at
  all.)

Wiring (`MainScene.ts` + others):

- **Eating gesture:** right-click an `edible` item (new `ItemDef.edible` field) in
  the backpack or hotbar eats one — wired into `InventoryMenu`/`HotbarUI`'s
  existing right-button branches (before the weapon/placeable checks). Foods are
  `hotbarable` so they can sit in the hotbar for quick eating. `Tooltip.ts`
  derives the "Effect: +X HP/s for Ns" line from `edible` (single source of truth).
- **Campfire hover/interact:** folded into the same placedObjects hover loop as
  the Workbench (distinguished by `itemKey`), a new `promptForCampfire()` →
  `"[LMB] Cook"`, and a `tryInteract()` branch → `openCookingMenu()`. Added to
  `anyMenuOpen()`, the Escape handler, every menu-open close-all site, and
  `destroyPlacedObject()` (destroying the open campfire closes its menu).
- **Campfire upgrade** reuses `StationUpgrades.ts` + the generic right-click
  Upgrade/Destroy popup wholesale — "Campfire Lvl 2" label, tier-survives-Destroy,
  and discovery-on-ingredients-known all work with **zero** new upgrade wiring
  (just the one `stone_hearth` table entry). New food + campfire-dish tables added
  to `RECIPES.md`.
- **Death clears active buffs** (`onPlayerDeath`), and the buff HUD re-syncs.

**Same-session playtest follow-up (6 tweaks):** (1) cook recipes are now
**discovered** (recipe-unlock toast, `discoverCookRecipeIds`) — Cooked Boar Meat on
first campfire placement, the Skewer on first upgrade to Lvl 2; (2) the cook menu
now **lists only dishes at/below the open campfire's tier** (the Skewer isn't shown
at all until Lvl 2, no more dimmed "Requires Lvl 2" row) and the panel resizes to
the visible rows; (3) the Stone Hearth upgrade now costs **4 Twine + 20 Stone**;
(4) **right-click → Destroy no longer falls through to reopen the station's menu**
(Campfire *and* Workbench) — the generic `openContextMenuForObject` now sets
`suppressNextPointerdown` in its Upgrade/Destroy handlers, since the ContextMenu row
closes the popup before running onClick and the same click's scene pointerdown fired
afterward with the menu already closed; (5) food in the hotbar can now be eaten by
**selecting it + left-clicking** (open ground; skipped when hovering a node so
gathering still works) in addition to right-click; (6) a **max of 2 concurrent food
buffs** (`BuffManager.maxBuffs`, settable for future items) — a 3rd distinct buff
evicts whichever active buff has the least time left.

Verified via `preview_eval` + `preview_screenshot` (type-check clean, no console
errors): cook menu opens on the campfire; Cooked Boar Meat cooks at tier 0
(consuming 1 skewer + 1 meat); the Skewer is blocked at tier 0 and cooks only
after the tier bumps to 1 (consuming 2 berries); eating a Cooked Boar Meat at 40
HP applies a +2 HP/s buff, decrements the stack, and HP climbs +2 over ~1.2s;
re-eating refreshes the timer to 20s without a second buff entry; the buff HUD
icon + green meter render above the HP bar with a working "Cooked Boar Meat / +2
HP/s · 20s left" hover tooltip; death clears all buffs;
`promptForCampfire` reads "[LMB] Cook" in reach / null out of reach; the Stone
Hearth upgrade is present in the shared table.

Follow-up tweaks verified separately via `preview_eval` (no console errors):
`discoverCookRecipes(0)` announces only Cooked Boar Meat, `(1)` adds the Skewer;
the cook menu's `panelH` grows from a 1-row to a 2-row layout going tier 0 → 1
(dish list length changes, not just visibility); triggering Destroy via the
context-menu's row `pointerdown` sets `suppressNextPointerdown` and leaves both
the placed object gone and the cook menu closed (no reopen); selecting a food
slot and calling `tryInteract()` with nothing hovered eats it and applies the
buff; applying 3 distinct buffs (5s/9s/9s remaining) leaves only the 2 with the
most time left active, confirming the least-remaining-first eviction.

### Previously: Second post-boss playtest batch, Group C — Elite Gremlins + Trophy-gated Totem

Third and final batch of the second Gremlin King playtest feedback (locked order
A → B → C — all three now shipped). Plan: `.claude/plans/witty-drifting-aurora.md`. The
biggest of the three: the game's first **Elite enemy variant** concept, plus a rework of
the Gremlin Totem's craft gate from a skill level to a hard-won trophy currency. Built on
Opus per the model-switch convention (a new mechanic, not just UI/tuning).

- **Elite Gremlins are the Gremlin Shack guards** — and *only* the shack guards. Every
  shack's 1 ranged + 1 melee guard is now elite (**+50% HP, +50% damage, +10% move speed,
  1.4x scale, distinct crimson/gold texture**). Gremlins anywhere else — including
  `spawnEnemies()`'s roster and `spawnAltarDensity()`'s altar-camp extras — stay normal.
  Hooked in via a single `elite: true` on both `new RangedGremlin`/`new MeleeGremling`
  calls in `MainScene.respawnShackGuards()`, the one shared spawn path for both the
  initial spawn and every 6-minute respawn cycle. 5 shacks × 2 guards = 10 elites in the
  world at once (respawning). Since 2 of the 5 shacks already bias near the Boss Altar,
  an altar-proximity elite cluster still falls out naturally — the tougher content marks
  the approach to the boss.
- **Elite variant model** — an opt-in `elite?: boolean` on both `RangedGremlin` and
  `MeleeGremling` constructors (`src/entities/Gremlin.ts`). No AI/state-machine change:
  the flag only swaps texture/displayName, multiplies `maxHealth`/`biteDamage` by 1.5
  (rounded), doubles each base loot entry, appends `{ gremlin_trophy: 1 }` **on the ranged
  Elite Gremlin only** (the melee Elite Gremling drops no trophy — user decision; **superseded
  by the M-RL economy rework: ALL elites now drop a trophy, centralized in `Enemy` — see the
  top entry**), and sets a new
  `protected speedMult` (`Enemy.ts`, default 1 → 1.1 for elites) that the two AIs multiply
  into their chase/pursue/kite speeds. Bigger `setScale(1.4)` is the tint-proof visual
  tell (hit-feedback `setTint` recolors the base texture during combat, same as every
  enemy). `MainScene.enemyReach()` already scales attack/prompt reach with sprite radius
  (post-boss batch), so the larger elite hitbox is covered with zero special-casing —
  same principle as the earlier Gremlin King reach fix. The kill path
  (`tryAttackEnemy` → `rollLoot` → `spawnLooseDrop`) and `onShackGuardKilled` (matches by
  object identity) needed no changes.
- **New resource `gremlin_trophy`** — `ResourceType` (`Inventory.ts`), `ITEM_DEFS`
  (`Items.ts`, `maxStack: 99`, non-hotbarable), and generated textures in `BootScene.ts`
  (`icon_gremlin_trophy` inventory/loose-drop icon + `gremlin_elite`/`gremling_elite`
  enemy sprites, all palette-consistent crimson/gold).
- **Gremlin Totem recipe reworked** (`Recipes.ts`) — cost changed from
  `{ gremlin_leather: 4, gremlin_guck: 3, bones: 8, twine: 4 }` +
  `light_armor` lvl-3 gate to **`{ gremlin_trophy: 3, wood: 1, gremlin_guck: 1 }`** with
  the skill gate removed (`requiredSkills: []`). Stays tier 1 (Workbench-gated to craft);
  discovery now keys off owning the ingredients — the trophy is the meaningful gate. So
  the difficulty ramp toward the boss (killing elites) and the means to summon it are the
  same content loop. `RECIPES.md` updated to match.

Verified via `preview_eval`: elite `RangedGremlin` = HP 48/dmg 15/scale 1.4/speedMult
1.1/texture `gremlin_elite`, loot = 2 skin + 2 blood + 1 trophy; elite `MeleeGremling` =
HP 18/dmg 12, loot = 2 blood (no trophy); both normals unchanged (HP 32/12, scale 1, no
trophy). All 5 shacks' guards read as elite (10 elites), 40 map gremlins stay normal —
only the 5 ranged elites drop trophies (still ≥ the 3 a Totem needs). The
Totem recipe unlocks once its 3 ingredients are discovered + a Workbench placed, exposes
`{ gremlin_trophy: 3, wood: 1, gremlin_guck: 1 }` / `requiredSkills: []` / tier 1, and is
affordable with 3 trophy + 1 wood + 1 guck. Type-check clean (`tsc --noEmit`), no console
errors, `preview_screenshot` confirms crimson elite guards at the shack vs green gremlins
elsewhere. **With Group C shipped, the entire second-playtest A → B → C batch is done.**

### Previously: Second post-boss playtest batch, Group B — HUD & stats display

Second of three grouped batches off the second Gremlin King playtest (locked order
A → B → C). Plan: `.claude/plans/group-b-hud-stats-display.md`. Pure display/wiring
work on top of already-designed systems (bar geometry, a new derived-stat readout) — no
new state machine or data model, so this batch stayed on Sonnet per the new
model-switch convention (see `CLAUDE.md`'s "Working conventions").

- **HP/Stamina bars now grow proportionally with max pool, capped at hotbar width.**
  Both bars used a hardcoded `barW = 76` and only rescaled the fill; the background
  rect was never stored so it couldn't resize. New `MainScene.layoutBar()` helper
  repositions/resizes both bg and fill (plus re-centers the label) from a computed
  `statBarWidth(max)` = `round(76 * max/100)`, clamped to `[76, hotbarUI.width]` (408px).
  `healthBarBg`/`staminaBarBg` are now stored fields. Verified: 20 Vitality + 20
  Endurance points widen both bars to 91px, still centered; artificially pushing max to
  720 clamps the bar at exactly 408px (the hotbar's own width).
- **XP bar relocated from "stacked above HP/stamina" to directly under the hotbar**,
  spanning its exact width. `HotbarUI` gained `width`/`left`/`bottom` getters and its
  `BOTTOM_MARGIN` (was an inline `14`) bumped to `34` to open clearance beneath it.
  HP/stamina bars, still anchored off `hotbarUI.top`, rose automatically since raising
  the hotbar moved `top` too — no separate reflow needed. Verified: XP bar geometry is
  `x === hotbarUI.left`, `width === hotbarUI.width`, `y === hotbarUI.bottom + 4`.
- **Run Speed breakdown** — new `MainScene.runSpeedBreakdown()` (walk/sprint/
  sprintMultiplier/runningLevel/runningBonus/itemBonus, the last always 0 today — no
  speed items exist yet), read by the inventory Combat column's compact
  "Move Speed: 95 / 166 spr" line (`RunSpeedView` interface, `InventoryMenu.ts`).
  `Player.ts`'s private `SPEED` constant is now exported `PLAYER_WALK_SPEED`.
- **Damage broken out by type** in the Combat column — new `Weapons.
  damageTypeDisplayName()`; `CombatStatsView` gained `damageTypeName`, and the Damage
  line now reads e.g. `Damage: 8 Pierce` instead of a bare number.
- **New Attack Range stat line** in the Combat column — `CombatStatsView.attackRange`
  reads the module-private `REACH` constant directly (64px today).
- **Same-day follow-up, per the user:** Run Speed moved off a standalone Stats-tab
  block and into the **Skills tab**, as the Running skill's own hover tooltip — and
  **every** skill row is now hoverable (not just the 5 weapon skills + Running), each
  showing its **live-computed current impact**, not a static per-level rate.
  `Skills.skillImpactDescription(skill, skills)` now takes the live `Skills` instance
  and returns e.g. `"+0.5% weapon damage per level — currently +4.5% at Lvl 9"` for a
  weapon skill, `"+0.5% sprint speed per level — Walk 95 / Sprint 187 (x1.97) at Lvl
  44"` for Running (reads `PLAYER_WALK_SPEED` directly, no more `CharacterMenuDeps`
  plumbing needed for it), and `"No combat/gather effect yet — recipe gate only"` for
  every skill with no wired mechanical effect (chopping/mining/heavy_armor/light_armor/
  blocking) — previously those 6 skills had no hover tooltip at all. `CharacterMenu`'s
  tooltip text object gained `wordWrap: { width: 300 }` since the live-computed strings
  run longer than the old static ones.

Verified via `preview_eval`: `import()`-ing `Skills.ts` directly and calling
`skillImpactDescription` for all 11 `SKILL_TYPES` against a live `Skills` instance
(Blunt lvl 9, Running lvl 44) returns correct per-skill strings, including the exact
"Sprint 187 (x1.97)" figure the old Stats-tab breakdown used to show; emitting a real
`pointerover` on the Running row's hit-rectangle sets the on-screen tooltip to that same
text and makes it visible; same for a zero-effect skill (Chopping), confirming the "no
effect yet" message renders correctly.

Verified via `preview_eval` + `preview_screenshot`: all of the above, plus both the
Inventory (Tab) Combat column and Character menu (K) Stats tab render cleanly with no
overlap in a live screenshot. Type-check clean (`tsc --noEmit`), no console errors.

### Previously: Second post-boss playtest batch, Group A — quick fixes

First of three grouped batches off a second Gremlin King playtest (player beat it at
lvl 5, Blunt 5/Pierce 10/Light Armor 5/Running 3/Chopping 4, max-lvl Primal Spear).
User locked the order via `AskUserQuestion`: **Group A (this batch) → Group B
(HUD/stats display) → Group C (Elites + Trophy-gated Totem)**. Plan:
`.claude/plans/delightful-tinkering-book.md`. A "notes for later" list (food system, HP
regen, roguelike ideas, minimap small-section + full-map-overlay rework, trophy
equipment slot, etc.) was appended to `CLAUDE.md`'s Long-term design notes section as
pure documentation, no code yet.

- **Running levels faster early** (`MainScene.ts`) — sprint's flat running-XP rate
  extracted to `RUNNING_XP_PER_SEC` and bumped 10→20 XP/sec; `skillXpToNext`'s curve
  itself is unchanged.
- **Ctrl+Click unequips armor** (`InventoryMenu.ts`/`MainScene.ts`) — the one remaining
  gesture without the standing Ctrl+Click-aliases-double-click-quick-move pattern. New
  `InventoryMenuDeps.unequipArmorSlot`, checked before the existing right-click
  (context menu) and left-click (drag) branches on an armor slot's `pointerdown`.
- **Clicking a placed Workbench opens the crafting menu** — previously a Workbench had
  zero hover/interact behavior at all (proximity-gating only). New `hoveredWorkbench`
  tracking (sourced by filtering `placedObjects` by `itemKey`, no new parallel array
  needed) mirrors the Drying Rack/Shack hover-and-prompt pattern; `tryInteract()`'s new
  branch calls the existing `toggleCombinedMenu()` (same one Tab already calls), so
  clicking the workbench a second time while the menu's open closes it.
- **Smart scroll-wheel hotbar cycling** — `cycleHotbar()` now steps up to a full lap
  looking for the next occupied slot instead of moving exactly one slot per tick,
  respecting the existing `wheelSpansBothRows` toggle's range.
- **Boss Altar now spawns further from world center** — the "minimum distance from
  center" mechanism the user asked for already existed (`pickSpawnPoint`'s
  `clearRadius` param, shared by every spawn-point picker); it was just tuned too
  small. Promoted the inline local `900` to a named `ALTAR_CLEAR_RADIUS` module
  constant and raised it to `1400` (world's half-diagonal is ~2240px).
- **Boss charge attack now reliably damages on contact** — `checkPlayerHit()` was
  already called every frame during the charge's travel (this was never a missing
  per-frame check), but `CHARGE_HIT_RADIUS` was a flat `34` that never accounted for
  `BOSS_SCALE = 2.4` — the boss's scaled-up visual footprint could visually overlap the
  player without the hit registering. Same class of bug the earlier
  `MainScene.enemyReach()` fix addressed for normal attack/prompt reach, just not
  previously applied to the boss's own charge math. Fixed: `CHARGE_HIT_RADIUS = 34 *
  BOSS_SCALE` (≈82px).

Verified via `preview_eval`: 5s of simulated sprint XP at the new rate lands exactly on
Running lvl 1 (was ~10s before); a scripted `unequipArmorSlot` call (the same path
Ctrl+Click now triggers) confirms the item returns to the backpack and the dep is wired
as a real function on `InventoryMenu`'s deps; placing a workbench at the pointer's
world position and calling the real hover/interact path shows the `"[LMB] Craft"`
prompt and opens both `inventoryMenu`/`craftingMenu`; a hotbar with only slots 0/3/7
filled cycles `0→3→7→0→3`, never landing on an empty slot; `pickAltarPosition()`
returns a point 1505px from world center (comfortably past the new 1400 threshold); a
live `GremlinKing.checkPlayerHit()` call during a scripted charge confirms a hit at
60px (previously would have missed under the old 34px radius) and 30px, and correctly
still misses at 90px. Type-check clean (`tsc --noEmit`), no console errors,
`preview_screenshot` confirms the world boots normally.

### Next up: Group C — Elites + Trophy-gated Totem (not started)

Group B (above) shipped this session. Group C remains planned-only, per the locked
A → B → C order — no plan file drafted for it yet.

### Previously: Post-boss-fight playtest batch — boss HUD/hitbox, chest take-all, 2nd hotbar row

A same-day playtest batch off the first real Gremlin King fight — grab-bag of fixes
plus one small feature (the 2nd hotbar row), plan:
`.claude/plans/post-boss-playtest-batch.md`. See `CLAUDE.md`'s new "5d." roadmap entry
for the full list; highlights:

- **Boss HUD** (`src/ui/BossHealthUI.ts`) — a big fixed top-of-screen HP + poise bar,
  Elden-Ring/Valheim style, visible only while `GremlinKing.isEngaged()`. The existing
  small floating world-space bars are untouched (both now show).
- **Boss hitbox/reach fix** — `MainScene.enemyReach()` scales attack/prompt reach with
  an enemy's visual radius past a ~13px baseline (the roster's normal sprite size), so
  the 2.4x-scaled Gremlin King is no longer nearly unreachable at its own edge. Generic
  by sprite size, not a King-specific special case.
- **Fixed-HUD depth bug fixed** — hotbar, minimap, HP/stamina/XP bars, and hover/
  placement prompt text all used `setDepth()` values below `WORLD_H` (2688), so a tree
  or enemy near the bottom of the map could render on top of them. Bumped into
  2800-2902 (still below the crafting/inventory panels' 3000+ and Tooltip's 4500).
- **Minimap Boss Altar landmark** — once the player explores within fog-of-war's own
  reveal radius of a Boss Altar, `MinimapUI.revealLandmark()` burns a one-time marker
  into the minimap's terrain `RenderTexture`. A discovered fixed structure, not a live
  entity blip — keeps the minimap's locked "no entity blips" rule intact.
- **Workbench recipe-discovery persistence bug fixed** — `hasWorkbenchPlaced()` used
  to check *currently placed* workbenches, so destroying one re-locked every tier-1+
  recipe's discovery/visibility even though the player had already unlocked it. New
  sticky `everPlacedWorkbench` flag (set once, never reset) fixes it; proximity checks
  are separate and still correctly track live placement state.
- **Gremlin Totem description no longer spoils what it summons** — describes the
  totem object itself; still points at the Boss Altar as where it's used.
- **Equipment stats panel** — the inventory menu (Tab) gained a third "Combat" column
  (next to Backpack/Equipment) showing live equipped-weapon damage/attack speed/attack
  stamina cost plus total armor (`MainScene.combatStats()`, mirrors `Tooltip.ts`'s
  existing weapon math).
- **Chest Take All (R) + Ctrl-click quick-move** — an open chest supports **R** to
  move everything into the backpack in one go (auto-stacking). **Ctrl+Left-Click** is
  now a one-press alias for every double-click quick-move gesture, including two new
  ones added this pass: the chest menu (chest ↔ backpack) and the Drying Rack menu
  (backpack → input, mirroring its existing right-click quickLoad).
- **Second hotbar row for stations/processors** — `Hotbar` (`src/systems/Hotbar.ts`)
  is now one flat 18-slot container; row 2 (Alt+1-9, `ROW1_COUNT`/`ROW2_COUNT`) is a
  dedicated spot for placeables. Auto-pickup of a loose station now prefers an empty
  row-2 slot before falling back to the backpack. Locked via `AskUserQuestion`: Alt+1-9
  selects row 2 directly (not a click-only fallback); scroll wheel spans both rows by
  default, togglable back to current-row-only with **H**.

Verified live via `preview_eval`/`preview_screenshot`: boss HUD bar shows/hides
correctly on aggro/deaggro with accurate HP/poise fractions; `hasWorkbenchPlaced()`
stays true after a scripted destroy; `takeAllFromChest()` empties a chest into the
backpack; a scripted Ctrl-click (`fakePointer.event.ctrlKey = true`) quick-moves items
backpack↔hotbar and both directions of the chest menu; the two-row hotbar renders with
a distinct green-tinted row 2, Alt+3 selects row-2 slot index 2 and engages placement
mode, and a simulated loose `drying_rack` pickup lands in row 2 first, falling back to
the backpack once row 2 is full. Type-check clean (`tsc --noEmit`), no console errors.

### Previously: Minimap + fog of war

First piece of roadmap item 6 (World & discovery), plan:
`.claude/plans/parsed-cooking-beacon.md`. Locked via `AskUserQuestion` before building:
**passive display only** (no fast-travel/waypoints — a future addition, not this pass),
**terrain + player position only** (no enemy/station blips), **fixed reveal radius**
(no skill/item scaling).

- **New `src/systems/Fog.ts` (`FogOfWar`)** — a `Uint8Array` reveal grid sized 1:1 to
  the minimap's own pixel resolution (224x168 — an exact 4:3 match for the 3584x2688
  world at a clean scale-16), independent of `Biome.ts`'s own 40px gameplay grid.
  `reveal(playerX, playerY)` marks every unrevealed cell within a 260px world radius
  (rough parity with existing enemy aggro-radius scale) as revealed, bounded to a local
  window around the player's current cell so it's cheap to call every frame regardless
  of world size — revealed cells never re-fog once seen. Exposes a drained
  `consumeNewlyRevealed()` queue so the UI layer only ever draws what changed, never a
  full-grid redraw.
- **New `src/ui/MinimapUI.ts`** — a top-right corner HUD panel, following the
  `EventLogUI`/`KeybindsUI` pattern of raw scrollFactor(0) GameObjects, no Container
  (per the standing Phaser Container+scrollFactor(0)+interactive-input bug — the
  minimap has no interaction today, but staying consistent avoids the trap if it gains
  one later). A `Phaser.GameObjects.RenderTexture` terrain layer starts fully black and
  fills in one pixel per newly-revealed `FogOfWar` cell (incremental draws only),
  sampling `Biome.forestWeight()`/`creekWeight()` and blending the *exact* same colors
  `MainScene.buildBiomeTexture()`'s real-world terrain bake uses (base grass `0x4a7a3a`,
  forest overlay `0x24421c`, creek overlay `0x3a6ea5`) so the minimap reads as a shrunk
  version of the real ground, not a different palette. A small `Graphics` marker dot is
  repainted every frame at the player's live position (the one piece that can't be
  incremental, since it moves).
- **Wired into `MainScene.update()`** — `this.fog.reveal(...)` +
  `this.minimapUI.update(...)` added to the same ambient-loop batch as
  `updateMagnet`/`updateEnemies`/`updateTreeOcclusion`, in both the normal and
  frozen-on-death branches (matching how those other ambient systems already keep
  running while dead).
- **Same-day follow-up, per the user: moved to top-right, and the old "[Tab] Menu" icon
  is gone entirely** — first shipped bottom-left; the user asked for top-right instead,
  which meant clearing that corner of its previous occupant first. The always-visible
  `"[Tab] Menu"` icon (`CraftingMenu.ts`) was deleted outright rather than just hidden or
  relocated — Tab and Escape already drove the combined crafting+inventory menu
  independently (`MainScene.toggleCombinedMenu()`), so the icon was a redundant
  click-to-open affordance, not the only entry point; `CraftingMenuDeps.onIconClick` and
  the icon `GameObject` are both gone, no dead code left behind. The stat-points badge
  and the `CraftingMenu` panel both shifted down to sit below the minimap —
  `MinimapUI` now exports `MARGIN`/`PANEL_W`/`PANEL_H` (was just `PANEL_W`/`PANEL_H`) so
  `CraftingMenu`'s `MARGIN_TOP` and `MainScene.createStatPointsBadge()`'s Y both compute
  off those constants instead of separate hardcoded offsets, so the three stay stacked
  without overlap if the minimap's size ever changes.
- **`CLAUDE.md` roadmap updated** — new "5a. Minimap + fog of war" entry (shipped);
  item 6 (World & discovery) trimmed to note the minimap piece is done, the rest
  (bigger generated world/biomes) still pending.
- **Stale "Craft: T" keybind label removed** — spotted while auditing the top-right
  corner for the icon removal above; `MainScene.createHud()`'s `KeybindsUI` list had
  carried a "Craft: T" line since before crafting was folded into the combined Tab
  menu. Grepped for any T-key handler first (`keydown-T`/`addKey("T")`/etc.) and found
  none anywhere in `src/` — Tab is the only entry point, already covered by the
  existing "Inventory: Tab" line — so the line was deleted rather than fixed to a real
  binding.

Verified via `preview_eval` + `preview_screenshot`: `FogOfWar` constructs at exactly
`cols: 224, rows: 168, scale: 16`; teleporting the player to a distant point, calling
`reveal()`/`minimapUI.update()`, then teleporting back and revealing again shows *two*
separate revealed circles on the minimap screenshot (the original spawn-area circle and
the new distant one) — confirming previously-revealed cells persist and don't re-fog once
the player leaves; a real `keydown-TAB` emit opens the combined menu with the
`CraftingMenu` panel rendering cleanly below the minimap with no overlap; forcing
`unspentPoints = 3` shows the stat-points badge at `y ≈ 189`, directly under the
minimap's bottom edge and well clear of the crafting panel (which starts at `y = 220`).
`preview_screenshot` confirms the panel renders top-right with a
correctly-colored (green/dark-green/blue) revealed patch around the player and solid
black everywhere unexplored; the expanded `KeybindsUI` panel screenshot confirms
"Craft: T" is gone and every remaining line still matches a real binding. Type-check
clean (`tsc --noEmit`), no console errors.

### Previously: Weapon stat display — stamina/hit and attack speed

Small same-day follow-up, no new milestone letter. Weapon tooltips (`InventoryMenu`/
`HotbarUI`, via `Tooltip.ts`) and the crafting-menu detail panel (`CraftingMenu.ts`) now
show two new stat lines for every weapon (Wood Club, Stone Club, Bone Knife, Primal
Spear): **Stamina** (cost per hit, live-adjusted by the Strength/Agility stamina-cost
multiplier exactly like the existing Damage line is skill-adjusted — reuses
`Progression.ts`'s `weaponStaminaCostMultiplier`, which was already computed for actual
combat but never surfaced in UI) and **Attack Speed** (`attacks/s`, new
`Weapons.weaponAttacksPerSecond()` = `1000 / weaponCooldownMs`, static — nothing
currently modifies attack speed). Both `Tooltip` and `CraftingMenu` needed a new
`progression: PlayerProgression` dependency threaded in from `MainScene` (mirroring the
existing `skills: Skills` dependency) since the Stamina line needs live player-stat data,
not just skill data. Verified live via `preview_eval`: a Stone Club tooltip reads
`Stamina: 14` / `Attack Speed: 1.8/s` at 0 Strength, and `Stamina: 14 (13)` after
allocating 10 Strength points — matching the crafting-menu preview's own
`statValue()` output for the same inputs.

Also added to `CLAUDE.md`'s roadmap (World & discovery, item 6): a **minimap with fog of
war** — idea-stage only, not started. Corner HUD map revealing explored terrain as the
player physically visits it; reveal radius/map scale/fast-travel-or-not all undecided.

### Previously: Playtest fixes batch — Gremlin Guck processing, bigger map, crafting-menu stats, Place context menu, level-up banner

Plan: `.claude/plans/bright-prancing-starlight-playtest-batch.md`. A same-day
follow-up batch off a fresh playtest, no new milestone letter:

- **Gremlin Guck** (new item/`ResourceType`, `icon_gremlin_guck` in `BootScene.ts`) is
  a new Drying Rack output: raw `gremlin_blood` -> `gremlin_guck` at 2:1
  (`Processing.ts` `PROCESS_RECIPES`), mirroring cattail->twine. Every recipe that
  previously spent raw Gremlin Blood now spends Gremlin Guck instead — Bone Knife Lvl 3
  and Primal Spear Lvl 3 (`WeaponUpgrades.ts`) — so raw blood is no longer a direct
  crafting ingredient anywhere, only a processing input.
- **Bone Knife now requires a Workbench.** Recipe changed from tier 0 (4 Bones) to tier
  1 (1 Leather Scraps, 4 Bones) — `Recipes.ts`. Primal Spear was already tier 1
  (workbench-gated); no change needed there, just confirmed.
- **Map roughly doubled** (`MainScene.ts`): `WORLD_W`/`WORLD_H` 80x60 -> 112x84 tiles
  (2560x1920 -> 3584x2688px, ~2x area) — per-playtest feedback that the old map ran dry
  of enemies/resources before a player could craft everything on offer. Every fixed
  spawn count scaled up to match (~1.8-2x each): Boar 12->24, Snake 15->28, RangedGremlin
  12->22, Gremling 4->8, Cattail 22->42, Branch 40->76, Rock 30->56, Tree(forest)
  70->132, Tree(grassy) 14->26, Boulder 18->34, Blackberry-bush total 16->30. Density-tuning
  constants (cluster radius/max, aggro/deaggro numbers) were left alone — only raw counts
  changed, since the map itself is proportionally bigger.
- **Player Level-up is now a real "in your face" moment.** New
  `MainScene.showLevelUpBanner()` — a big centered "LEVEL UP!" + "Level N • +N Stat
  Points" callout that punch-scales in (`Back.easeOut`), holds ~1.7s, then fades and
  destroys itself, plus a brief `cameras.main.flash()`. Non-blocking (scrollFactor(0)
  text, no interactivity, doesn't intercept input) — stacks alongside the existing
  quieter EventLog line and bobbing stat-points badge rather than replacing them.
- **Crafting menu now shows the Damage/Armor number for weapon/armor recipes.**
  `CraftingMenu.renderDetail()` gained a `statValue()` helper mirroring `Tooltip.ts`'s
  (base weapon damage adjusted by the relevant skill's live multiplier; armor shows its
  flat base defense) — rendered right under the description, above the cost lines.
  `CraftingMenuDeps` gained a `skills: Skills` field (MainScene already had the instance,
  just wasn't threading it through). Freshly-crafted output is always tier 0 ("Lvl 1"),
  so no tier-upgrade math is needed here unlike the owned-item Tooltip case.
- **Right-click a backpack placeable for an explicit "Place" option.** New
  `InventoryMenuDeps.openPlaceContextMenu`, wired to `MainScene.openPlaceContextMenu()` —
  a one-row `ContextMenu` popup (mirrors the armor-slot and placed-object popups) whose
  "Place" click just calls the existing `startItemPlacement()` path. A single left-click
  on a backpack placeable already entered placement mode (deferred behind the
  double-click window) — this is a discoverable, explicit alternative for players who
  don't know that, not a replacement for it. Right-click on a backpack slot still opens
  the weapon-upgrade panel for weapons; placeables are the other branch.

Verified live via `preview_eval`: world bounds report 3584x2688; the Bone Knife's
crafting-menu detail panel shows "Damage: 4" with 1 Leather/4 Bones costs and requires a
placed Workbench to discover; Gremlin Cap's panel shows "Armor: 2"; right-clicking a
backpack Campfire stack opens a "Place" popup whose click engages `placementMode` with a
ghost; the level-up banner's text objects are created at alpha 0/scale 0.3 and are fully
destroyed ~3s later once their tweens finish.

### Previously: Combat depth pass — enemy AI polish, armor defense, weapon upgrades, playtest fixes

Plan: `.claude/plans/recursive-bubbling-spring.md`. A fresh-session batch spanning enemy
AI bugs, new combat-depth content, and a grab-bag of playtest fixes + a documentation
ask, built across 6 milestones in one session. Confirmed with the user via
`AskUserQuestion`: the new Club upgrade path applies to **Stone Club only** (Wood Club
stays a fixed starter weapon).

- **Enemy AI: random initial facing, Gremlin wander, no-spawn-in-water.**
  `Enemy.ts`'s constructor now sets a randomized initial rotation
  (`setRotation(FloatBetween(0, 2π))`) — every enemy (including Snake, which extends
  Enemy) used to default to one unrotated orientation and only ever rotated once it
  moved, which read as "always facing the same direction" for anything that spends most
  of its life stationary (Snake hidden, Gremlin idle). `RangedGremlin` (`Gremlin.ts`)
  gained an idle wander state it never had before — confirmed via code read that its
  `idle` branch did nothing but check aggro radius. Unlike Boar/Gremling's incremental
  "drift from current position" wander, RangedGremlin's wander target is drawn fresh
  from its stored spawn point every cycle (`RANGED_WANDER_RADIUS = 70`), so it can never
  random-walk away — "a small area around their spawn" per the request.
  `MainScene.spawnEnemies()` now passes `avoidCreek: true` to every enemy spawn point
  pick (Boar/Snake/Gremlin/Gremling); `pickSpreadSpawnPoint()` widened to forward the
  param. Verified live: wander target lands within the radius of spawn, rotation varies
  across spawns, and the live enemy roster spawns with zero enemies on creek cells
  (an enemy chasing a player near the creek can still walk onto it afterward — no
  terrain-collision system exists, out of scope here, called out explicitly rather than
  silently left unaddressed).
- **Armor now has real defense numbers.** New `ItemDef.armorDefense` (base/tier-0):
  Gremlin Cap 2, Shirt 4, Pants 3. New `ArmorUpgradeDef.defenseBonus` on each existing
  lvl2 upgrade: Cap +2 (4 total), Shirt +3 (7 total), Pants +2 (5 total) — full tier-0 set
  9 armor, full tier-1 set 16 armor. `ArmorUpgrades.ts` gained
  `armorDefenseForTier()`/`totalPlayerDefense()`; `MainScene.applyDamageToPlayer()` now
  applies a flat deduction (`Math.max(1, amount - totalPlayerDefense(...))`) — per the
  user, everything dealt today is physical damage (no magic/elemental sources exist yet),
  flagged inline as the spot to branch on damage type later. `Tooltip.ts`'s "Armor" stat
  line mirrors the existing weapon "base (adjusted)" pattern. Verified live: a 25-damage
  hit reduces to exactly 16 at the tier-0 set and 9 at the tier-1 set, matching the math.
- **Weapon upgrade system — Stone Club gets Lvl 2/3, plus two brand-new weapons.** New
  `src/systems/WeaponUpgrades.ts` (`WeaponUpgradeDef`, structurally identical to
  `ArmorUpgradeDef`/`StationUpgradeDef`), reusing the existing generic `ItemStack.tier`
  field — no new data model. **Bone Knife** (new, tier 0, 4 Bones, slash — first-ever
  slash weapon) and **Primal Spear** (new, tier 1/workbench-gated, 4 Wood/2 Stone/1
  Leather Scraps, pierce — first-ever pierce weapon) fill the two weapon-damage-type
  skills that previously had zero XP sources. Stone Club/Bone Knife/Primal Spear each get
  2 upgrade tiers (Lvl 2, Lvl 3 — the base crafted weapon already counts as Lvl 1), all
  flat damage bonuses. Deliberate deviation from the Stone Club precedent: neither new
  weapon has a skill-level gate on its recipe (Stone Club requires Blunt 3, reachable
  "for free" from the pre-existing Wood Club — there's no pre-existing slash/pierce
  weapon to grind on before Bone Knife/Primal Spear exist, so gating them the same way
  would make them permanently uncraftable). `MainScene` gained `equippedWeaponTier`
  (read from the selected hotbar slot's `stack.tier` in `recomputeEquipped()`) and
  `tryAttackEnemy()` adds `weaponTierDamageBonus()` to base damage before the existing
  skill multiplier. **Right-click a weapon (backpack or hotbar) to upgrade it** — new
  branch in `InventoryMenu.ts`/`HotbarUI.ts` (right-click was otherwise a no-op per the
  last playtest batch's "reserved for context menus" decision) opens the same
  `UpgradeMenu` panel armor/station upgrades already use; `MainScene.upgradeTarget`
  widened to a third variant (`{weaponSlot: {container, index}}`) alongside the existing
  placed-object/armor-slot cases. Verified live: upgrading a hotbar Stone Club through
  both tiers bumps `equippedWeaponTier` immediately (no re-select needed) and a live
  `tryAttackEnemy()` call deals exactly 9 damage (5 base + 2 + 2), matching the table.
- **UpgradeMenu shows what an upgrade actually grants.** New optional `deltaLabel` field
  on `ArmorUpgradeDef`/`WeaponUpgradeDef`/`StationUpgradeDef` (authored directly per
  entry, e.g. `"+2 Armor"`/`"+2 Damage"` — left unset for Tool Sharpener, which only
  unlocks a gate rather than granting a direct numeric effect). `UpgradeMenu.ts` renders
  it in green between the cost and description lines, extending the existing
  measured-row-height pattern so longer rows still don't overlap. Verified live: both
  Stone Club upgrade rows render their delta line at the right offset with no overlap
  into the row below.
- **Playtest fixes batch:**
  - **Ghost placement bug fixed** — placing the last owned instance of a placeable
    (Workbench, Drying Rack, ...) from an owned stack used to leave a faded ghost armed
    on the cursor until the *next* click noticed the stack was empty. `attemptPlaceObject()`
    now checks immediately after a successful item-source placement and calls
    `cancelPlacement()` right away if the stack just hit zero. Verified live: placing a
    single owned Workbench now exits placement mode (ghost destroyed) in the same call.
  - **All three Gremlin armor lvl2 upgrades now require Workbench Lvl 2** (was Pants
    only) — `requiresWorkbenchTier: 1` added to Cap/Shirt's `ArmorUpgradeDef` entries.
    Investigated the user's separate "Pants lvl2 shows before Workbench Lvl 2 exists"
    report by reading `UpgradeMenu`/`upgradeBlockReason` directly — found no code bug;
    it's the existing, intentional "visible but blocked with a reason" design from
    Milestone K (the whole upgrade path stays visible so the player can see what's
    ahead), enforced at both click and apply time. No change made for that item beyond
    the Cap/Shirt gate above.
  - **Inventory stays open during placement.** `startItemPlacement()` no longer closes
    the `InventoryMenu` (still closes the crafting menu and Drying Rack popup, which do
    need to get out of the way). The global placement-mode click guard widened to also
    bail out on a click inside the still-open inventory panel, so several items can now
    be placed in a row without reopening it each time, and clicks on the panel itself
    don't fall through and place something underneath it. Verified live.
  - **Attack-range ring off by default** — `rangeRingEnabled` now starts `false` (was
    `true`); the `O` toggle is unchanged.
  - **Running rescaled**: sprint is now 1.75x walk speed at Running Lvl 0, climbing to
    2.25x at the Lvl-100 soft cap (was 1.15x -> 1.65x) — only `BASE_SPRINT_MULTIPLIER`
    changed (1.15 -> 1.75); the existing +0.5%-of-base-speed-per-level bonus already
    landed exactly on the new target spread with no further change.
- **New `RECIPES.md` dashboard** at the repo root — hand-authored markdown tables for
  every `Recipes.ts` entry, plus Station/Armor/Weapon upgrade tables (with the new
  defense/damage numbers) and the Drying Rack's processing ratios. Not generated — a new
  line in `CLAUDE.md`'s "Working conventions" section asks future sessions to keep it in
  sync whenever the underlying recipe/upgrade files change, mirroring the existing
  "plans must be committed in-repo" convention entry.

Verified via `preview_eval` (a stuck-on-BootScene preview tab needed a `preview_resize`
call to un-pause `requestAnimationFrame` mid-session — noted here in case it recurs):
live enemy roster spawns 12 Boar/15 Snake/12 RangedGremlin/4 MeleeGremling with no
enemy spawning on a creek cell; a scripted idle `RangedGremlin.update()` sequence
confirms its wander target lands within 70px of its spawn point and its rotation is
non-default from construction; a full tier-0 and tier-1 Gremlin armor set reduces a
25-damage hit to exactly 16 and 9 respectively; upgrading a hotbar Stone Club through
both new tiers updates `equippedWeaponTier` live and a real `tryAttackEnemy()` call deals
9 damage (5 base + 2 + 2); placing a single owned Workbench from the backpack now exits
placement mode cleanly (no residual ghost); all three Gremlin armor lvl2 upgrades block
with "Requires nearby Workbench Lvl 2" until a tier-1 Workbench is nearby, then clear;
placing an item while the inventory is open leaves it open and a click on the panel
doesn't place through it; `rangeRingEnabled` starts `false`. Type-check clean
(`tsc --noEmit`), no console errors, `preview_screenshot` confirms the world boots
normally and the UpgradeMenu's new delta line renders cleanly.

### Previously: Third Progression playtest batch — sprint rework, right-click reserved, workbench gate

Third same-day playtest pass. Per the user's own request this round, four ambiguous
items were clarified via `AskUserQuestion` before any code changed (sprint-speed
numbers, workbench-gate scope, quick-move scope, right-click's remaining job) — answers
below.

- **Sprint slowed substantially; Running skill now claws it back slowly**
  (`src/entities/Player.ts`, `src/systems/Skills.ts`). `Player`'s hardcoded
  `SPRINT_MULTIPLIER` constant is gone — `Player.update()` now takes a `sprintMultiplier`
  param computed by the scene each frame via new `Skills.runningSprintMultiplier()`:
  `1.15 + runningLevel * 0.005`. Base sprint dropped from the old flat 1.6x (~152 px/s)
  to ~1.15x (~109 px/s), climbing back up +0.5% of base speed per Running level,
  reaching ~1.65x only at the level-100 soft cap — a long, deliberate grind. Running
  also gained a hover-tooltip impact description ("+0.5% sprint speed per level") since
  it's no longer a no-op skill.
- **Weapon damage tooltip / recipe-toast fixes carried over from last batch, this batch adds:**
  **Recipe-unlock toast moved from top-right to the left side**, anchored directly
  under the `InventoryMenu` panel's box (`EventLogUI.ts` now imports `PANEL_X`/`PANEL_Y`/
  the newly-exported `PANEL_H` from `InventoryMenu.ts`) — slides in from off-screen left
  instead of the right.
- **Upgrade menu now closes when its target armor slot is unequipped** — `unequipArmorSlot()`
  checks `upgradeTarget` (mirrors the identical existing check in `destroyPlacedObject()`
  for a destroyed station) and closes the panel if it was open for that slot.
- **General workbench-proximity gate for ALL upgrades**, not just Gremlin Pants' existing
  special case. Per the user: "whatever workbench is required to craft an item, you must
  be near that item to upgrade it." `armorUpgradeBlockReason()` → renamed/generalized
  `upgradeBlockReason()`: looks up the upgrade's base `Recipe` via `appliesToItemKey` and
  requires `isNearWorkbench()` if that recipe's `tier > 0` — layered *underneath* Pants'
  existing `requiresWorkbenchTier` check (the general one shows first/is more helpful when
  the player has no workbench nearby at all). This was a real gap: Gremlin Cap/Shirt's
  lvl2 upgrades previously had **no workbench check at all**; only Pants did (and only its
  stricter tier-specific one). Workbench's own upgrade (Tool Sharpener) needs no separate
  check — right-clicking it already requires standing at that very workbench (tier 0).
  Both `applyStationUpgrade`/`applyArmorUpgrade` now defensively re-check this too, not
  just the UI-level `extraBlockReason`.
- **Quick-move is now double-left-click; right-click is reserved for context-menu/upgrade
  actions.** Per the user (clarified: applies to every backpack item uniformly; right-click
  becomes a no-op for plain items, no new context menu built for them yet): `InventoryMenu`'s
  backpack slots and `HotbarUI`'s slots dropped their `rightButtonDown() → quickMove(...)`
  branch (now just `return` on right-click) and the now-unused `quickMove` dep entirely.
  Double-click detection lives in `MainScene.resolveItemDrag()` via two new small helpers:
  `isDoubleClickInPlace(key)` (350ms window, keyed per-slot e.g. `"bag:5"`/`"hotbar:2"`) and
  `deferSingleClick(action)`. Hotbar's click-in-place (slot **select**) still fires
  immediately/undeferred (idempotent, no latency added) with double-click *additionally*
  triggering `quickMoveItem` back to the backpack. Backpack's click-in-place is trickier: a
  **single** click on a placeable enters placement mode — but that's now **deferred** behind
  the same 350ms window, so a genuine double-click quick-moves the item instead of arming
  placement mode first (which would otherwise reference a now-stale backpack slot once the
  item moved to the hotbar — a real correctness bug the deferral avoids, not just a style
  choice). A single click on a non-placeable stays a no-op, unchanged. Armor's own
  right-click gestures (equipped-slot Unequip/Upgrade popup, placed-station Upgrade/Destroy)
  are untouched — those were never the "quick-move" gesture.
- **Character menu (`K`) defaults to the Stats tab whenever `unspentPoints > 0`** —
  recomputed fresh on every `openMenu()` call (not remembered across opens).
- **New animated stat-points badge** — a small bobbing "N Stat Points Available!" tag
  under the `[Tab] Menu` icon (top-right), visible only while points are unspent,
  clickable to open the Character menu. Refreshed alongside the XP bar wherever
  `unspentPoints` changes (level-up, `allocateStat`).

Verified via `preview_eval`: sprint speed at Running lvl 0 reads ~109.25 px/s and ~156.75
px/s at the lvl-100 soft cap (matches the formula exactly); Gremlin Cap's lvl2 upgrade
blocks with "Requires a nearby Workbench" far from one and clears once a workbench is
placed nearby; Gremlin Pants' lvl2 still additionally blocks with "Requires nearby
Workbench Lvl 2" when only a tier-0 workbench is nearby; opening the Upgrade panel for
an equipped helmet then unequipping it closes the panel; a single click-in-place on a
non-placeable backpack item is a no-op (item stays put), while two clicks in the same
tick move it from backpack to hotbar; the `InventoryMenu`/`HotbarUI` deps objects no
longer carry a `quickMove` field at all; the recipe-toast container spawns at
`x:-240, y:442` — exactly off-screen-left and directly under the inventory panel's
bottom edge. Type-check clean (`tsc --noEmit`), no console errors.

### Previously: Second Progression playtest batch — UI polish + gremlin range tuning

Second same-day playtest pass, five independent small fixes:

- **Gremlin/Gremling attack + trigger ranges cut ~15%** (`src/entities/Gremlin.ts`):
  `RANGED_AGGRO_RADIUS` 160→136, `MELEE_AGGRO_RADIUS` 130→110, `PROJECTILE_MAX_RANGE`
  260→220, `RANGED_MELEE_RANGE`/`MELEE_RANGE` 24→20, `RANGED_MELEE_EXIT_RANGE` 40→34
  (kept proportional to its paired range so the hysteresis gap ratio is unchanged).
  Deaggro radii, speeds, and damage/cooldowns untouched — only the "notices you" /
  "can hit you from here" ranges shrank.
- **Weapon damage tooltip now shows "base (adjusted)"** — `Tooltip.ts`'s generic
  `def.stats` rendering gained a `statValue()` override: a weapon's "Damage" line
  computes the live skill-adjusted number (`weaponSkillDamageMultiplier` from
  `Skills.ts`) alongside the static base, e.g. "Damage: 3 (4)" once Blunt is high
  enough to round up. `Tooltip` now takes an optional `skills` param at construction;
  `InventoryMenu`/`HotbarUI`/`DryingRackMenu` all gained a `skills: Skills` dep field
  and pass it through to their own `new Tooltip(scene, deps.skills)` call.
- **Recipe-unlock toast stacking fixed** (`EventLogUI.ts`) — the toast box was a fixed
  40px tall but its wrapped message text wasn't, so a longer name (2-3 wrapped lines)
  could visually spill into whatever toast was stacked below it, reading as "toasts
  overlapping in the same place" when several unlocked close together. Toast height is
  now measured from the real wrapped text (`Math.max(40, text.height + 16)`) and each
  toast's Y offset is the actual cumulative height of every currently-active toast
  above it (`activeRecipeToasts: {height}[]`, replacing a bare counter) — no more
  fixed slot-height math. Also **hold/fade duration increased** (hold 2400→3200ms,
  fade 600→900ms) per "should fade out slower."
- **Placement-mode hint relocated to bottom-right** (`MainScene.ts`) — was anchored
  top-left under the controls line, disconnected from every other contextual
  prompt/instruction in the HUD (all of which live bottom-right, e.g. the interact
  prompt). Now anchored bottom-right (origin 1,1) stacked directly above `promptText`,
  matching its exact visual style (same font size/background/padding).

Verified via `preview_eval`: a wood_club tooltip at Blunt lvl 62 (~31% bonus) reads
"Damage: 3 (4)" (base 3, adjusted rounds up at that level; lower levels round back to
the same "3 (3)" honestly, which is expected/by-design); queuing a long recipe-unlock
message confirms toast height grows well past the 40px minimum (measured 68px) instead
of a fixed box; the placement hint renders at (1908, 1036) on a 1920x1080 screen,
origin (1,1), directly above the interact-prompt corner. `preview_screenshot` confirms
the tooltip and placement hint both render cleanly bottom-right with no overlap.
Type-check clean, no console errors.

### Previously: Progression playtest fixes — recipe visibility, stat rebalance, gremlin density

Same-day playtest pass on the Progression milestone below, requested directly by the
user after a real session:

- **Skill-gated recipes reverted to fully hidden (discovery-time gate), not
  visible-but-greyed.** The Progression milestone's own craft-time-gating decision
  (flagged for the user to override) was overridden: `Crafting.refresh()` checks
  `skillsMet()` again for discovery, matching how ingredients already work — a
  skill-locked recipe (e.g. `stone_club` before Blunt lvl 3) is invisible, not shown
  amber-greyed. The now-dead amber "Requires <Skill> Lvl N" line was removed from
  `CraftingMenu.ts` (unreachable once discovery already guarantees it's met), along
  with the redundant `skillsMet` rechecks in `isCraftable`/`craftRecipe` — skill levels
  never decrease, so the discovery-time check is sufficient forever, same reasoning
  `Recipe.tier`'s "workbench ever placed" discovery gate already relies on (as opposed
  to *proximity*, which does change and is correctly still rechecked at craft time).
- **Stat system fully reworked** (`src/systems/Progression.ts`) — the original
  Strength/Agility/Intelligence damage-bonus design is gone; damage now scales with the
  **weapon skill's own level** instead (see below), and player stats are pool-size /
  cost-reduction only:
  - `endurance`: +1 max Stamina/point (was +2)
  - `vitality` (**new stat**, split out of the old combined Endurance): +1 max HP/point
    (was +4 bundled into Endurance)
  - `strength`: -0.5% stamina cost, melee weapons only (was +2% dmg / -1.5% cost)
  - `agility`: -0.5% stamina cost, ranged weapons only (same change)
  - `intelligence`: -0.5% spell cast time/point (**placeholder** — no spell-casting
    system exists; repurposed from its old melee-magic-damage role)
  - `willpower` (**new stat**): -0.5% mana cost to magic attacks/point (**placeholder**
    — no mana system exists). Per the user, Intelligence/Willpower are explicitly
    placeholders for magic systems that don't exist yet.
  - `weaponDamageMultiplier` deleted from `Progression.ts` entirely; `Health.ts`/
    `Stamina.ts` wiring renamed `enduranceHealthBonus`→`vitalityHealthBonus` (now reads
    the `vitality` stat) and `MainScene.syncEnduranceBonus`→`syncStatBonuses`
    (`allocateStat` now re-syncs pools for either `endurance` or `vitality`).
- **Weapon skill levels now grant their own damage bonus** (`Skills.ts`,
  `weaponSkillDamageMultiplier`): +0.5% weapon damage per level, for the 5 weapon
  skills only (armor/general skills have none). This is the mechanic that replaced the
  old player-stat damage bonus — "getting better with a weapon type" now lives on the
  skill, while player stats stay pool-size/cost-reduction only. Applied in
  `tryAttackEnemy()` in place of the old `weaponDamageMultiplier` call.
- **Skill hover tooltips** (`CharacterMenu.ts`) — hovering a Skills-tab row now shows a
  small floating tooltip with its mechanical impact via a new `skillImpactDescription()`
  (`Skills.ts`), e.g. "+0.5% weapon damage per level" for the 5 weapon skills; rows with
  no mechanical effect (armor/general skills) get no hit-area/tooltip at all, per the
  user's "if applicable" framing. A persistent `tooltip` Text object (not rebuilt every
  `render()` like the row list) is shown/hidden via `pointerover`/`pointerout` on an
  invisible per-row hit rectangle, positioned just below the row so it never overlaps
  the row above it.
- **Player-level XP curve steepened significantly**: `XP_BASE` 40→**150**, `XP_EXPONENT`
  1.6→**1.9**. The user hit player level 8→9 from "only a few enemies" and asked if it
  was bugged — audited every XP hook (`addXp` loop, weapon/chop/mine/sprint/kill grants)
  and found no double-counting; the real cause was the curve being tuned too gently
  against 11 concurrently-leveling skills (passive `running` XP especially, which
  requires no combat at all) each feeding Player XP on every level-up. The new curve is
  roughly 3.5x steeper by level 10 than the original.
- **Gremlin/Gremling density cut** (`MainScene.spawnEnemies()`) — still felt overrun
  despite Milestone O's spacing fix. `RANGED_GREMLIN_COUNT` 18→**12** (still ~20% margin
  over the ~10 `gremlin_leather` estimate that justified 18 in the first place),
  `MELEE_GREMLING_COUNT` 6→**4** (no unique resource, safe to cut further), and spacing
  tightened: `GREMLIN_CLUSTER_RADIUS` 140→**220**, `GREMLIN_CLUSTER_MAX` 2→**1** (no more
  than 1 gremlin-family enemy within 220px of another, down from 2 within 140px).

Verified via `preview_eval`: `stone_club` stays absent from `discoveredRecipes()` at
Blunt lvl 0 and appears once Blunt hits lvl 3 (both via the real `refreshDiscovery()`
path); allocating 5 Vitality + 5 Endurance bumps HP 100→105 and Stamina 100→105 exactly
(+1 each); the same 600 skill-XP dump that previously reached Player Level 3 (247/368
xp) now reaches only **Level 2 (40/1210 xp)** — matching `round(150*2^1.9)=560`
consumed exactly; a live `tryAttackEnemy()` call at Blunt lvl 3 applies the weapon-skill
damage multiplier (1.015x on a 3-dmg club, rounds to 3 — expected, the bonus is subtle
at low levels by design); live enemy roster confirms exactly 12 Gremlin + 4 Gremling.
`preview_screenshot` confirms the Skills tab (with a working hover tooltip positioned
cleanly below its row) and Stats tab (all 6 stats, correct descriptions, no panel
overflow) both render correctly. Type-check clean, no console errors.

### Previously: Progression — Skills, Player Level, damage types, stat points

The roadmap's **Progression** milestone (plan:
`.claude/plans/refactored-napping-metcalfe.md`), built in four ordered sub-milestones
(A–D). Introduces two *separate* systems — many small per-activity **Skills** and one
overall **Player Level** — plus **weapon damage types** as new content. Built on top of
the previously-dormant `Skills.ts` seed (`axes`/`pickaxes`, never wired to any XP source;
`MainScene.gainSkillLevel()` was dead code, now deleted).

- **A — Skill/Weapon foundation.** `Weapons.ts` gained `DamageType`
  (`slash|blunt|pierce|ranged|magic`) + `WEAPON_DAMAGE_TYPES` (`wood_club`/`stone_club`
  → `["blunt"]`) + `weaponPrimaryDamageType()`. `Skills.ts` rewritten: expanded
  `SkillType` (5 weapon damage-type skills + `heavy_armor`/`light_armor` +
  `running`/`blocking`/`chopping`/`mining`), `WEAPON_SKILLS`/`ARMOR_SKILLS`/
  `GENERAL_SKILLS` grouping arrays, `MAX_SKILL_LEVEL = 100`, `skillXpToNext(level) =
  100*(level+1)`, `skillDisplayName()`, and an XP-based `Skills` class with fractional
  `addXp()` (loops through multi-level dumps) + an `onLevelUp` subscriber (mirrors
  `EventLog.onAdd`). `Recipe.requiredSkill` (singular) widened to `requiredSkills[]`;
  `stone_axe`→chopping0, `stone_pickaxe`→mining0, `stone_club`→**blunt3** (new),
  gremlin cap/shirt/pants→**light_armor0** (new). `Crafting.skillMet` → public
  `skillsMet` (checks all entries). `Items.ts` gained `ArmorType`, `ItemDef.armorType`
  (gremlin pieces = light_armor), hand-written "Damage Type"/"Armor Type" stat lines,
  and an `armorTypesWorn(slots)` helper.
- **B — Skill XP hooks + crafting-menu gating.** `MainScene` constructs `Skills` with an
  `onLevelUp` that logs a `"levelup"` toast, feeds Player XP, and refreshes the crafting
  menu. Four XP sources: weapon hit → 30 to the primary damage-type skill
  (`tryAttackEnemy`); tool hit → 30 chopping/mining (`tryInteract`, reusing the in-scope
  `kind`); sprint → 10/sec running (`update`); kill → 30 per distinct worn armor type
  (`tryAttackEnemy` kill branch, via `armorTypesWorn`). **Skill requirements are a
  CRAFT-TIME gate, not a discovery gate** (a resolved plan ambiguity — see decision note
  below): `Crafting.refresh()` no longer calls `skillMet` for discovery, so a skill-locked
  recipe shows once its ingredients+workbench are known but greys out with an amber
  `"Requires Blunt Lvl 3 (currently Lvl 0)"` line (mirrors the existing Workbench-proximity
  line) and `craftRecipe` guards on `skillsMet`.
- **C — Player Progression.** New `src/systems/Progression.ts`: `PlayerProgression`
  (level starts 1, `xp`, `unspentPoints`, per-stat counts), `StatType =
  endurance|strength|agility|intelligence` (**no luck**), `xpToNextPlayerLevel(level) =
  round(40*(level+1)^1.6)` (fast early, steep later), `addXp` (awards `level` points per
  level gained), `allocate`, `onLevelUp`, plus `weaponDamageMultiplier`/
  `weaponStaminaCostMultiplier` keyed generically off damage type (magic→INT, ranged→AGI,
  else STR — so a future ranged/magic weapon needs no changes). Every **skill** level-up
  feeds Player XP equal to that level's cost. `Health.ts`/`Stamina.ts` gained
  `setBonusMax` (Endurance → +4 HP / +2 stamina per point; `Health.reset()` now refills
  to the bonused max). Strength/Agility/Int scale weapon damage (+2%/pt) and stamina cost
  (−1.5%/pt, floored) — Strength is live today (all weapons are melee); AGI/INT are
  framework-only until ranged/magic weapons exist.
- **D — UI.** A third stacked HUD bar (purple XP + "Lvl N", above HP/stamina via the same
  `hotbarUI.top` anchor chain). New `src/ui/CharacterMenu.ts` (key **K**), full-page popup
  in `UpgradeMenu`'s style: **Skills tab** (all 11 skills grouped Weapon/Armor/General,
  each with level + XP bar) and **Stats tab** (player level/XP bar, unspent points, a
  "+" per stat with its effect description, immediate-apply). Wired into `anyMenuOpen`,
  the ESC chain, and the `KeybindsUI` list.

**Decision note (craft-time vs discovery skill gating):** the plan requested an amber
"Requires <Skill> Lvl N" line, which is only reachable if skill is a *craft-time* gate
(recipe visible-but-greyed), not a *discovery* gate (recipe hidden until met). The
existing `skillMet` sat in the discovery path, which would have made that line dead. Chose
craft-time gating — it's the only interpretation where all three requested UI changes
(skillsMet/amber line/isCraftable) function together, it surfaces "level this skill to
unlock this recipe" as a visible goal (matching the user's wish for leveling to feel
meaningful), and it's consistent with how recipes already reveal cost/Workbench
requirements. Only `stone_club`'s behavior actually changes (visible-greyed before blunt3
instead of hidden); the other current recipes are all level-0 gates. **Flag for the user:
say so if you'd rather skill-locked recipes stay fully hidden until met.**

Verified via `preview_eval`: 20 blunt hits (600 XP) level blunt 0→3 exactly (0 leftover)
and feed the player to Level 3 with 247/368 XP and 5 points (2+3) — matching the curve
math; allocating 3 Endurance bumps HP max 100→112 and stamina 100→106 (current HP tracks
up too); a real `tryAttackEnemy` grants +30 blunt on hit and +30 light_armor on the kill
(gremlin_cap worn); a 27-Strength boost visibly cut a Boar kill to 3 hits; `stone_club`
becomes discovered-but-greyed at blunt 0 with the amber "Requires Blunt Lvl 3 (currently
Lvl 0)" line and `skillsMet` false. `preview_screenshot` confirms the 3-bar HUD and both
Character-menu tabs render cleanly. Type-check clean (`tsc --noEmit`), no console errors.

### Previously: Playtest fixes after O — Gremlin spawn spacing + kite/pursue AI loop

Immediate follow-up after Milestone O's spawn-count bump surfaced two issues: Gremlins/
Gremlings could spawn in dense packs, and the ranged Gremlin's "kiting" AI always fled
regardless of distance, so a player who just held distance past shot range could never be
re-engaged. Both fixed in `src/scenes/MainScene.ts`/`src/entities/Gremlin.ts`, addressed now
rather than deferred to the planned "safe-center, danger-toward-edges" world-gen rework
(independent, small, worth fixing immediately).

- **Spawn spacing** — new `MainScene.pickSpreadSpawnPoint()` (parallel to `pickSpawnPoint`,
  same 200-attempt-then-fallback shape) rejects a candidate point if `maxNearby` or more
  existing points already sit within `minSpacing` of it. `spawnEnemies()`'s Gremlin/Gremling
  loops now share one `gremlinPoints` pool (both variants count against each other, since
  they read as one "gremlin problem" to the player) with `GREMLIN_CLUSTER_RADIUS = 140,
  GREMLIN_CLUSTER_MAX = 2` — no more than 2 gremlin-family enemies within 140px of each other.
  Snake/Boar spawn loops untouched (density complaint was Gremlin-specific).
- **Kite/pursue AI loop** (`RangedGremlin.update()`, `src/entities/Gremlin.ts`) — "ranged" mode
  used to always flee (back directly away) regardless of distance. Reworked into three bands:
  **< `RANGED_MIN_KITE_DIST` (140px)** flees (unchanged `KITE_SPEED`); **`RANGED_MIN_KITE_DIST`
  to `PROJECTILE_MAX_RANGE` (140-260px)** holds ground and fires bursts; **>
  `PROJECTILE_MAX_RANGE` (260px)** pursues straight at the player (new
  `RANGED_PURSUE_SPEED = 70`) instead of firing. `RANGED_DEAGGRO_RADIUS` bumped 260→400 to
  leave room for the pursue band — it previously equaled `PROJECTILE_MAX_RANGE` exactly, so
  any out-of-shot-range distance instantly deaggro'd instead of ever being pursued. This
  produces the flee→hold→pursue loop as the player closes and backs off, matching
  Boar/Gremling/Snake's more standard chase-until-engaged pattern instead of a Gremlin being a
  pure kiter.
- **Stop-to-shoot (same-day follow-up)** — the gremlin was still firing bursts while moving
  (kiting away, or approaching), which read wrong. `RangedGremlin.update()` now only starts a
  *fresh* burst while holding ground in the mid-range band (`inHoldBand`); a burst already
  underway (`midBurst`) forces `holdingStill = true`, overriding whatever the distance-based
  flee/pursue branch would otherwise pick, so the gremlin plants itself for the whole 2-shot
  burst even if the player closes distance mid-burst. Once the burst finishes
  (`shotsFiredInBurst` resets to 0), normal flee/hold/pursue resumes on the very next frame.
- **Shoot-while-cornered (second same-day follow-up)** — per the user, a Gremlin being chased
  in close shouldn't *only* flee; it should still periodically stop and try to shoot back, then
  resume fleeing. `holdingStill` widened from `midBurst || inHoldBand` to also allow a fresh
  burst anywhere in shot range (`inShotRange && readyForFreshBurst`, not just the ideal
  `inHoldBand`) — so a fully-close, off-cooldown gremlin now plants and fires instead of
  fleeing forever; once that burst's cooldown starts, it resumes fleeing (since `midBurst` and
  `readyForFreshBurst` are both false again) until the cooldown expires, at which point it
  plants and fires again. This produces a flee→stop-and-shoot→flee loop while cornered, not a
  pure kiter that never fights back up close.
- **Longer stand-still (third same-day follow-up)** — per the user, the plant duration itself
  needed to be at least 2x longer; it previously resumed fleeing the instant the burst finished
  (~200ms total stationary time). New `standGroundUntil` timestamp + `RANGED_STAND_GROUND_MS =
  450`: every frame the gremlin is mid-burst or starting a fresh one, `standGroundUntil` is
  pushed forward to `now + 450`, so `holdingStill` (now `inHoldBand || now < standGroundUntil`)
  stays true for a full 450ms *after* the burst's last shot fires, not just for the burst's own
  duration. Total stand-still time per stop-and-shoot episode is now ~640ms (190ms burst +
  450ms hold), over 3x the old ~200ms.

Verified via `preview_eval`: a scripted sequence at a fixed close distance (50px) confirms
`standGroundUntil` reads exactly `now + 450` the instant the burst completes, and sampling
every 100ms afterward shows the gremlin holding still (`vx: 0`) through the 400ms mark and
only resuming flee (`vx: -55`) between 400-500ms after burst completion — matching the 450ms
constant. Earlier 5-frame scripted sequence at the same close distance (50px, well
inside the old flee-only zone) confirms the loop end to end — frame 1 (cooldown ready) stops
and fires shot 1 (`vx/vy: 0`); frame 2 stays planted for shot 2 (mid-burst); frame 3 fires
shot 2 and completes the burst; frame 4 (burst now on cooldown, still close) **flees**
(`vx: -55`); frame 5 (cooldown expired, still close) **stops and fires again**
(`shotsFired: 1`, `vx/vy: 0`). Live spawn roster (18 RangedGremlin + 6 MeleeGremling = 24) has a
max of 1 same-family neighbor within 140px for every entity (no 3+ clusters); a real
`RangedGremlin.update()` sequence — aggro at 100px, then player backs to 350px (pursue,
`vx: 70` toward player), then 200px (hold, `vx/vy: 0`), then 50px (flee, `vx: -55` away) —
confirms all three bands fire correctly on the live object; a forced immediate burst at
200px shows `vx/vy: 0` while firing, moving the player to 50px away mid-burst keeps velocity
at `0,0` and the burst still in progress (not yet fleeing), and once the burst completes on a
later frame velocity flips to fleeing (`vx: -55`) on the very next `update()` call. Type-check
clean, no console errors, `preview_screenshot` shows the world booting normally.

### Previously: Milestones N + O — Blackberry persist-on-harvest, resource-density spawn bump

Final two milestones of the I–O batch (`.claude/plans/this-is-a-plan-cached-pixel.md`). With
these, **the entire I–O batch is done.**

- **Milestone N — Blackberry bushes harvest without destroying.** First "stays in the world
  after harvest" node in the game — every other node (branch/rock/tree/boulder/cattail) still
  destroys on collect. New `ResourceNodeConfig`/`ResourceNode` fields: `persistent?: boolean`,
  `pickedTexture?: string`, `regrowMs?: number`, plus a `harvested` runtime flag distinct from
  `depleted` (a harvested-but-alive bush must stay in `MainScene.nodes`/keep its sprite, unlike
  a depleted one, which is destroyed and filtered out). `ResourceNode.harvest()` sets
  `harvested = true`, swaps to `pickedTexture` (new `blackberry_bush_picked` — same leafy mound,
  no berry dots, `BootScene.ts`), and schedules `regrow()` via `scene.time.delayedCall(regrowMs,
  ...)` if set; `regrow()` reverts both. `tryInteract()`'s pickup branch now branches on
  `node.persistent`: persistent nodes call `collectNode()` + `harvest()` and stay in `nodes`;
  everything else keeps the old `collectNode()` + `deplete()` + remove-from-array path
  unchanged. `updateHover()`/`tryInteract()`'s existing `node.depleted` gates both grew an
  `|| node.harvested` check so a harvested bush shows no prompt and can't be re-clicked.
  Blackberry's `scatterClustered()` call (`MainScene.spawnNodes()`) now passes `persistent:
  true, pickedTexture: "blackberry_bush_picked", regrowMs: BLACKBERRY_REGROW_MS` (new constant,
  3 in-game minutes) — **regrow timing was an explicit recommendation, not a locked user
  decision**, since the original note only specified "berries removed, not the whole bush."
- **Milestone O — Resource-density spawn bump.** Per the plan's own math (worked out in the
  planning session, not redone here): RangedGremlin count **4 → 18** and Snake count **6 → 15**
  (`MainScene.spawnEnemies()`), covering the new Gremlin Armor set's `gremlin_leather`
  (~10 needed, was capped at 4 ever obtainable) and `leather`/Leather Scraps (~9 new demand on
  top of already-tight existing costs, was capped at 6) demand with margin. This is a deliberate
  departure from Milestone C's original "rarer, stronger" ranged-Gremlin tuning intent, called
  out explicitly rather than silently overridden, per the plan. `bones`/`twine`/other resources
  already had comfortable margin (Milestone L's Boar loot, existing cattail/bush counts) and
  needed no change.

Verified via `preview_eval`: a real `tryInteract()` on a hovered blackberry bush credits 2
`blackberry` to the backpack, sets `harvested: true`, swaps texture to
`blackberry_bush_picked`, and leaves the bush in `scene.nodes` (not destroyed/depleted); a
forced re-click on the same harvested bush is a no-op (berries count unchanged) and
`updateHover()` never re-selects a harvested bush as `hoveredNode`; calling the private
`regrow()` directly reverts both `harvested` and the texture back to `blackberry_bush`.
Enemy roster counts confirmed exactly `{Enemy: 12, Snake: 15, RangedGremlin: 18,
MeleeGremling: 6}` (51 total). Type-check clean (`tsc --noEmit`), no console errors,
`preview_screenshot` shows the world booting normally with the denser enemy roster.

### Previously: Playtest fixes batch #2 — armor equip/unequip polish, upgrade-menu docking, UI/tuning fixes

Follow-up playtest fixes on top of Milestone M, requested directly by the user in the same
session.

- **Armor Upgrade panel now docks beside the InventoryMenu** instead of floating
  screen-centered, and no longer closes the inventory when opened. `UpgradeMenu.openMenu()`
  gained an optional `anchor: {x, y}` — when set, `render()` positions the panel there instead
  of centering; `MainScene.openArmorUpgradeMenu()` passes `{x: INVENTORY_PANEL_X +
  INVENTORY_PANEL_W + 12, y: INVENTORY_PANEL_Y}` (both now exported from `InventoryMenu.ts`)
  and no longer calls `inventoryMenu.close()`. A placed station's Upgrade panel is unaffected
  (still opens with no anchor → centered, still closes the inventory, since that flow wasn't
  changed). The panel's existing "[ESC] Close" text is now also clickable (`setInteractive` +
  `close()` on `pointerdown`) as an explicit close affordance beyond the ESC key.
- **Unequip now works** — previously there was no way to take off worn armor short of
  equipping something else into the same slot. Two new gestures, both funneling into a new
  `MainScene.unequipArmorSlot(slot, toIndex?)`: **drag the equipped item out of its paper-doll
  slot** (new `beginArmorDrag`/`resolveArmorDrag`, widening `dragSource` to a
  `{container,index} | {armorSlot} | null` union) drops it into the backpack slot under the
  cursor (or the first available slot / the floor, if that target's occupied or the drop
  lands outside any panel); **right-click an occupied slot** now opens a small context menu
  (reusing `ContextMenu.ts`, same component the placed-station Upgrade/Destroy popup uses)
  with **"Unequip"/"Upgrade"** rows — an *empty* slot shows the same two rows greyed out
  ("Equip"/"Upgrade", both `enabled: false`) rather than nothing, so the interaction is
  consistent regardless of slot state. This replaced the old direct right-click-opens-Upgrade
  behavior from Milestone M (`InventoryMenuDeps.openArmorUpgrade` → `openArmorContextMenu`).
- **Event log moved beside Keybinds, not stacked underneath.** `EventLogUI` used to anchor at
  `keybindsUI.bottom + 8`, landing inside the same top-left region an open `InventoryMenu`
  panel occupies (y ≥ 48) — so opening the inventory always covered it. Now anchored at
  `keybindsUI.right + 12, keybindsUI.top` (both new getters on `KeybindsUI`) — same row as
  Keybinds, clear of the inventory panel in the common (collapsed) case. Dropped the now-dead
  `onToggle` reposition-callback plumbing between the two (`KeybindsUI` no longer takes one).
- **Crafting menu now stays open when placement mode starts** — `CraftingMenu.ts`'s "Place"
  button handler no longer calls `this.close()` after `deps.startPlacement(recipe)`. Matches
  how a plain "Craft" click already left the menu open; only inventory was staying up before,
  which was the inconsistency being fixed.
- **Tuning**: Stone Axe recipe → **4 wood, 4 stone** (was 3 wood/2 stone); Boar loot →
  **exactly 1 boar_meat and 1 bones** per kill (was 1-2 each).

Verified via `preview_eval`: right-click equips/unequips correctly through the new context
menu (occupied → real rows, empty → greyed no-ops); a simulated drag from the helmet slot
onto an occupied backpack slot correctly falls back to the next empty slot rather than
clobbering it; the Upgrade panel opens at `(532, 48)` — flush against the inventory panel's
right edge, top-aligned — with the inventory still open behind it; clicking the panel's
"[ESC] Close" text closes only the panel; a simulated real crafting-menu "Place" click (after
switching to the Crafting category tab and selecting the Workbench recipe) leaves
`craftingMenu.isOpen()` true while entering placement mode. Type-check clean, no console
errors.

### Previously: Milestone M — Gremlin Armor (first wearable armor)

Fifth milestone out of the I–O batch (`.claude/plans/this-is-a-plan-cached-pixel.md`),
following the playtest fixes batch. Wires up the long-dormant `Equipment.ts` slot system
for real.

- **`Equipment.ts`** now stores `EquippedItem { key, tier }` per slot instead of a bare
  `string | null` — a worn piece's upgrade level lives on the same field a placed station's
  tier does (Milestone K's plumbing, reused rather than re-invented).
- **Three new armor items** replace the old undifferentiated `gremlin_leather_armor`:
  **Gremlin Cap** (helmet), **Gremlin Shirt** (chest), **Gremlin Pants** (legs) — new
  `ItemDef.armorSlot` field, new `BootScene.ts` icons, `Recipes.ts` entries at the plan's
  costs (tier 1, workbench-gated).
- **Equip via drag-onto-paper-doll-slot or right-click-in-backpack**, both funneling into
  `MainScene.equipArmorFromContainer()`: standard swap semantics — whatever was previously
  worn returns to the backpack (or drops on the floor if full), never silently lost.
- **Per-piece lvl-2 upgrades, triggered by right-clicking the equipped slot** — this was the
  one open design question the plan left unresolved (armor doesn't live in the world for a
  context-menu like stations do); confirmed with the user that right-click on an *occupied*
  paper-doll slot should open the same `UpgradeMenu.ts` panel a placed station's Upgrade
  button does. `UpgradeMenu` was generalized from a `StationUpgradeDef`-only panel to a
  `UpgradeDef = StationUpgradeDef | ArmorUpgradeDef` union (new `src/systems/
  ArmorUpgrades.ts`, parallel to `StationUpgrades.ts`) — same component, no duplicate UI.
- **Gremlin Pants' lvl 2 additionally requires a nearby Workbench that has itself reached
  tier 1** — new `MainScene.isNearWorkbenchAtTier()` + `armorUpgradeBlockReason()`, surfaced
  in the panel as a distinct `"(Requires nearby Workbench Lvl 2)"` suffix (new optional
  `UpgradeMenuDeps.extraBlockReason`) rather than lumped under the generic "Missing
  materials" message. Per the user, this is the template for future armor tiers gating on
  future Workbench tiers, not a Pants-only special case.
- **No numeric defense stat** — per the plan's own hedge and the standing "damage
  types/resistances are later" note, equipping is visual (paper-doll icon) + trackable
  (tier persists through Destroy/re-equip semantics the same way a station's does) only.

Verified via `preview_eval`: right-click equips all three pieces; equipping a second Cap
swaps the first back to the backpack with the total item count unchanged; a simulated real
drag onto the helmet slot's screen coordinates also equips correctly; applying the Shirt's
lvl-2 upgrade deducts `gremlin_leather`/`bones` and bumps its tier; the Pants lvl-2 upgrade
is blocked with the Workbench-tier message until a tier-1 Workbench is placed nearby, then
succeeds; the panel renders the block-reason and "(Applied)" states correctly; the real
`Crafting`/`Recipes` discovery-and-craft path (not just a direct backpack add) produces a
`gremlin_cap` once a Workbench is placed and ingredients are known. Type-check clean, no
console errors. See `.claude/plans/this-is-a-plan-cached-pixel.md`'s Milestone M section for
full file-level detail.

Also corrected two stale `CLAUDE.md` statements found while updating the roadmap for this
milestone: the 4f roadmap bullet previously described Blackberry's harvest-without-destroy
mode (Milestone N) as already shipped when it isn't — bushes still deplete/destroy on
harvest today, unchanged by this session.

### Previously: Playtest fixes batch — Gremlin/Gremling naming split, combined Tab menu, bush clustering, upgrade cost display

Small independent fixes requested directly by the user (not from the I-O plan's own list),
landed in one session between Milestone K and Milestone M.

- **Gremlin/Gremling naming split.** The two gremlin-family enemies now have distinct names:
  the ranged+melee variant (`RangedGremlin`, `src/entities/Gremlin.ts`) is **"Gremlin"**; the
  weaker melee-only variant (renamed `MeleeGremling`) is **"Gremling"** (texture
  `gremling_weak`, was "Weak Gremlin"). Confirmed with the user: **item/resource names stay
  "Gremlin ___" regardless of which variant drops them** — `gremlin_blood` drops from both,
  `gremlin_skin`/`gremlin_leather`/`gremlin_leather_armor` only from the ranged one, and none
  of those keys/display names change. This reverses an earlier same-session pass that (based on
  an ambiguous initial request) had renamed everything uniformly to "Gremling" — that pass was
  undone in full (file back to `Gremlin.ts`, all item keys/textures back to `gremlin_*`) before
  applying just the melee-only rename on top.
- **Tab now opens crafting + inventory together; no more standalone crafting key.** `T` no
  longer toggles `CraftingMenu` on its own — `MainScene.toggleCombinedMenu()` opens/closes both
  `craftingMenu` and `inventoryMenu` in lockstep, driven by `inventoryMenu.isOpen()` as the
  source of truth. `CraftingMenu`'s top-right icon changed from `[T] Craft` to `[Tab] Menu` and
  now calls a new `CraftingMenuDeps.onIconClick` callback instead of toggling itself directly,
  so the icon and the Tab key both go through the same combined-toggle path. The two panels
  already sit on opposite sides of the 1920-wide screen (inventory left, crafting right) so
  showing both at once needed no repositioning.
- **Blackberry bushes now spawn in clusters of 2-4** instead of scattered individually. New
  `scatterClustered(totalCount, clusterMin, clusterMax, cfg)` in `MainScene.spawnNodes()`
  samples one cluster center per clump via the existing `pickSpawnPoint`, then jitters each
  bush in the clump ±40px around it (falling back to the exact center if jitter pushes a point
  onto the creek, rather than rejection-sampling per-node — keeps clumps tight). Total bush
  count unchanged (16); only the distribution changed. `scatter()` itself is untouched and still
  used for every other node type.
- **Workbench upgrade popup now shows owned/required material counts**, matching
  `CraftingMenu`'s detail-panel format. `MainScene.formatUpgradeCost()` changed from `"3 Twine,
  5 Wood, 2 Stone"` to `"Twine: 3/10, Wood: 5/10, Stone: 2/5"` (have/need per resource,
  `this.backpack.count(r)` against the upgrade's cost); `UpgradeMenu.ts`'s unaffordable-row
  suffix changed from `"(Can't afford)"` to `"(Missing materials)"` to match the wording the
  user asked for.

Verified via `preview_eval` + `preview_screenshot`: Tab opens both panels side by side and
toggles them together; a spawned Boar/Snake/Gremlin/Gremling roster reports `displayName`
"Gremlin" for the 4 ranged spawns and "Gremling" for the 6 melee spawns; a test Workbench's
Upgrade panel renders `"Tool Sharpener  (Missing materials)"` / `"Twine: 2/3, Wood: 5/5, Stone:
2/2"` when under-resourced. Type-check clean throughout, no console errors.

### Previously: Milestone K follow-up round 2 — discovery toast, hover-only label, panel layout, tooltip level

Second same-day playtest pass on the Milestone K follow-up above: four small, independent fixes.

- **Station upgrades now fire the "New Recipe Unlocked!"-style toast.** They live entirely
  outside the `Recipe`/`Crafting` system (a separate `StationUpgradeDef` table), so they never
  had their own "just became discoverable" tracking — `refreshDiscovery()` silently updated
  `craftingMenu`/`inventoryMenu` but never announced anything for upgrades. New
  `discoveredUpgradeIds` (`MainScene.ts`, mirrors `Crafting`'s internal `discoveredIds` for a
  different table) + a loop in `refreshDiscovery()` that fires
  `eventLog.add("recipe", "New Upgrade Unlocked! ${upg.name}", icon)` the first time an
  upgrade's ingredients are all discovered — same `"recipe"` `LogKind`, so it rides the existing
  toast queue in `EventLogUI.ts` for free.
- **The floating "Workbench Lvl N" label is now hover-only.** `refreshStationLabel()` creates it
  `setVisible(false)`; `updateHover()` gained a small loop over `placedLabels` toggling each
  label's visibility by distance-to-pointer, independent of the existing hovered-node/enemy/rack
  "winner" logic (a label and a chop/mine prompt can never conflict, since only upgradable
  stations get a label at all).
- **`UpgradeMenu.ts` row layout reworked to stop the description from overlapping the row
  below.** The old layout used a fixed `ROW_H` with the description squeezed into a narrow
  right-aligned column — a long description could wrap past the row's box into the next row's.
  Rows are now stacked (name → cost → description, full-width wordWrap) and **each row's height
  is derived from the description's actual rendered height** (`Math.max(42 + descText.height +
  10, MIN_ROW_H)`), not a constant. Since the panel is screen-centered, this creates a
  chicken-and-egg problem (panelY depends on total content height, which depends on text objects
  that must already exist to measure) — solved by building every row at a y-baseline of 0 first,
  measuring as it goes, then shifting every created object down by the final centered `panelY` in
  one pass at the end.
- **Station level now shows in inventory/hotbar tooltips, not just the panel/floating label.**
  `stationDisplayName()` moved out of `MainScene.ts` into `StationUpgrades.ts` (no circular
  import risk — `Items.ts` doesn't depend on `StationUpgrades.ts`) so it's reusable outside the
  scene. `Tooltip.show()` gained an optional `tier` param and swaps in `stationDisplayName(key,
  tier)` for the title line when provided; `HotbarUI.ts`/`InventoryMenu.ts`/`DryingRackMenu.ts`'s
  three `tooltipUI.show(...)` call sites now all pass `stack.tier` through.

Verified via `preview_eval` + `preview_screenshot`: discovering the Tool Sharpener's last
missing ingredient (twine, after wood/stone) logs "New Upgrade Unlocked! Tool Sharpener" as a
`"recipe"`-kind entry; a placed Workbench's label is hidden until the pointer is within its hover
radius, hidden again once it leaves; the Tool Sharpener row's description now sits fully inside
its own row's box (measured: box bottom 581.5px vs. description text bottom 577.5px, no
overlap); both the backpack and hotbar tooltips for a tier-1 Workbench stack read "Workbench Lvl
2". Type-check clean, no console errors.

### Previously: Milestone K follow-up — full Upgrade panel + station level display

Same-day playtest feedback on Milestone K's inline Upgrade popup: the user wanted a real,
crafting-menu-sized panel instead of a two-line list stuffed into the right-click popup, plus
the station's level surfaced beyond just a tint.

- **`src/ui/UpgradeMenu.ts` (new)** — a full-page popup, same visual language as
  `DryingRackMenu`/`CraftingMenu` (centered panel, `[ESC] Close` hint, row list). Opened by the
  context menu's **"Upgrade" button, which is now always present and always opens this panel**
  (previously the popup only listed upgrades inline and could show nothing at all). The panel
  lists every `StationUpgradeDef` for the target's `itemKey` whose ingredients are discovered —
  **undiscovered upgrades stay invisible** (unchanged locked decision), but **already-applied
  tiers are now shown greyed with an "(Applied)" suffix instead of disappearing**, so the player
  can see the whole upgrade path on one screen. A tier beyond `current + 1` renders
  "(Requires previous tier)"; an affordable, not-yet-applied, in-order upgrade is clickable
  (green stroke). An empty discovered list renders "No upgrades discovered yet." instead of a
  blank/absent panel.
- **`MainScene.ts`**: `openContextMenuForObject()` collapsed to two always-enabled rows
  ("Upgrade"/"Destroy") — all the discovery/afford/cost logic moved into `UpgradeMenu`'s deps
  (`upgradeIngredientsKnown`/`canAffordUpgrade`/`formatUpgradeCost` are reused, not duplicated).
  New `openUpgradeMenu`/`closeUpgradeMenu`/`createUpgradeMenu`, wired into `anyMenuOpen()` and
  the existing TAB/T/ESC close chains alongside the other big menus.
- **Station level display, two places**: new `stationDisplayName(itemKey, tier)` returns
  `"<Name> Lvl <tier+1>"` for any item with at least one defined upgrade (currently just
  Workbench) and the plain name otherwise — used in the UpgradeMenu title and the
  upgrade/destroy event-log lines. New `refreshStationLabel()` creates/updates a small floating
  text label (`"Workbench Lvl 1"`, etc.) anchored above the placed sprite itself, called at both
  placement points and after every upgrade; `destroyPlacedObject()` cleans the label up. Display
  levels are 1-based (`tier` 0 → "Lvl 1") since "Lvl 0" reads as broken to a player even though
  the underlying tier field still starts at 0.

Verified via `preview_eval` + `preview_screenshot`: Upgrade button opens the full panel showing
"Workbench Lvl 1" and the Tool Sharpener row; applying it deducts cost, bumps the title/label to
"Workbench Lvl 2", and re-renders the row as greyed "(Applied)" without closing the panel;
Destroy → magnet-collected pickup → re-Place carries tier 1 (tint + "Lvl 2" label) through
correctly; an object with an undiscovered upgrade ingredient shows the "No upgrades discovered
yet." empty state at a shrunk panel height. Type-check clean, no console errors.

### Previously: Milestone K — Per-instance station tiers + named upgrade system

Fourth milestone out of the I–O batch (`.claude/plans/this-is-a-plan-cached-pixel.md`),
per the recommended `L → I → J → K → M → N → O` order. Replaces the single generic
`workbench_upgrade` consumable with a **named, per-station upgrade system**, and makes a
station's upgrade tier **survive Destroy → pickup → re-Place** with a visual tell — genuinely
new plumbing, since no per-slot inventory metadata existed anywhere before this.

- **New `ItemStack.tier?: number`** (`src/systems/ItemContainer.ts`), additive-only —
  ordinary stackables (wood/stone/…) never set it. Placeable ItemDefs
  (`workbench`/`campfire`/`drying_rack`) dropped to `maxStack: 1` so two different-tier
  instances never merge into one count. New `ItemContainer.addStack()` drops a whole stack
  (preserving `tier`) into the first empty slot — `add()`'s merge-by-key path would silently
  discard the metadata.
- **Tier threaded end-to-end**: `ResourceNodeConfig`/`ResourceNode` gained a `tier?` field;
  `spawnLooseDrop()` takes an optional `tier` and tags the piece; `consolidateDrop()` refuses
  to merge tiered pieces (they carry per-instance state). A new `collectNode()` routes both
  the manual-click and magnet pickup paths through `addStack` when tiered (re-dropping the
  same tier if the backpack is full). `destroyPlacedObject()` reads the placed Image's `tier`
  into the drop; `attemptPlaceObject()`'s item-source branch consumes the exact slot (new
  `findConsumableStack`, not `removeCount`, so it can read that slot's tier before removal) and
  re-applies the tier + visual to the newly placed Image. This fixes the old latent bug where
  an upgraded Workbench's tier was silently discarded on Destroy.
- **Named upgrade table** (`src/systems/StationUpgrades.ts`): `StationUpgradeDef` +
  `STATION_UPGRADES` + `upgradesForItem()`. First entry **Tool Sharpener** — `{ appliesTo:
  workbench, resultTier: 1, costs: { twine: 3, wood: 5, stone: 2 } }`. The old
  `workbench_upgrade` ItemDef, Recipe, and BootScene texture were removed entirely — no
  intermediate craftable item, no separate consume-then-apply step.
- **Right-click Upgrade popup reworked** (`openContextMenuForObject`, `ContextMenu.ts` unchanged):
  lists each matching `StationUpgradeDef` whose next step is `tier + 1` and whose ingredients are
  all discovered (invisible otherwise — not greyed, mirroring recipe discovery), showing name +
  formatted cost. Clicking deducts resources directly from the backpack and calls the generalized
  `applyStationUpgrade` → `applyTierVisual` (a shared gold-tint tell applied at both the
  live-upgrade and re-placement render points, so they never diverge). Gremlin armor (Milestone M)
  reuses this same `tier` field on worn items rather than a parallel mechanism.

**Deviation (minor):** the visual tell is a shared gold tint (`applyTierVisual`), not distinct
per-tier art — the plan allowed "texture/tint," and a tint is the minimal generic choice matching
the old `upgradeWorkbench` behavior. A `textureForTier` lookup can slot into `applyTierVisual`
later with no call-site changes.

Verified via `preview_eval`: applying Tool Sharpener deducts twine 5→2 / wood 40→35 / stone 20→18
and tags tier=1 + gold tint; Destroy → loose drop carries tier=1 → pickup → inventory stack tier=1
→ re-place → tier=1 Workbench with tint (not tier=0); a tier-0 and tier-1 Workbench never share a
slot; the popup shows the upgrade only when discovered+affordable (hidden when twine is
undiscovered, absent on a maxed tier-1 bench). Type-check clean (`tsc --noEmit`), no console
errors, `preview_screenshot` shows the world booting normally.

### Previously: Milestone J — Placement-mode robustness + re-placing owned stations

Third milestone out of the I–O batch (`.claude/plans/this-is-a-plan-cached-pixel.md`),
per the recommended `L → I → J → K → M → N → O` order. Two related fixes to the
placement flow, both in `src/scenes/MainScene.ts` (+ a one-line-each flag flip in
`src/systems/Items.ts`):

- **Failed tier-gate no longer cancels placement mode.** `attemptPlaceObject()`'s
  `recipe.tier > 0 && !isNearWorkbench(...)` branch used to call `cancelPlacement()` —
  clicking a Drying Rack ghost while not near a Workbench dumped you out of placement mode
  entirely, forcing a trip back through the crafting menu. It now just logs "Requires a
  nearby Workbench" and returns, leaving the ghost on the cursor. Because
  `attemptPlaceObject()` re-checks `isNearWorkbench()` fresh every click, walking into
  range and clicking again just succeeds — no menu round-trip. Only an explicit cancel
  (RMB/ESC/TAB/T) or a successful placement leaves placement mode now.
- **Re-enter placement mode for a placeable you already own** (e.g. a station recovered via
  Destroy, sitting in the backpack). `placementMode` gained an optional
  `itemSource: { container, key }`: when armed from an owned stack, each placement consumes
  one of that stack (`container.removeCount(key, 1)`) instead of the recipe's ingredients,
  and running out auto-cancels. New `startItemPlacement(container, index, suppressClick)`
  closes any open menu (placement intercepts world clicks, so a menu would sit in front of
  the ghost — mirrors the crafting menu's Place flow), arms placement, and spawns the ghost.
  Entry points (both fire on pointerup, so `startItemPlacement` needs no `suppressNextPointerdown`
  trick — unlike the crafting menu's Place button):
  - **Left-click a placeable in the backpack** → enters placement mode for it. Inventory
    interactions now **match other items**: right-click a backpack placeable **quick-moves it
    to the hotbar** like any hotbar-able item (`quickMoveItem` no longer special-cases
    placeables), and the *left*-click gesture is what enters placement — specifically a
    click-in-place (drag that releases on the same backpack slot it started on), handled in
    `resolveItemDrag`'s backpack branch. A real drag to a different slot still rearranges;
    click-in-place on a non-placeable stays a no-op. (This revises Milestone J's first-pass
    behavior, where right-click entered placement — see decision note below.)
  - **Selecting a hotbar slot that holds a placeable** — placement mode now *follows the
    hotbar selection* (playtest follow-up — the original one-shot "arm on number-key" version
    was reworked): whichever slot is selected drives what's active, exactly like equipping a
    tool. Selecting a placeable enters place mode (ghost armed for it); selecting a
    tool/weapon/empty slot **exits** place mode (fixing the reported bug where switching off a
    workbench mid-placement equipped the club but left you stuck in place mode). All three
    select gestures route through one `setHotbarSelection(slot)` and behave identically:
    **number key (1-9)**, **scroll wheel** (`cycleHotbar` — now included, previously excluded),
    and **left-clicking the slot** (new — a click that releases on the same hotbar slot it
    started on is a select, not the old no-op re-drop; this also makes left-click select *any*
    item, equipping tools/weapons too, matching wheel/number). Real drags (releasing on a
    *different* slot) still rearrange. Placing consumes from the selected slot and re-arms;
    the last one running out auto-exits.
  - `campfire`/`workbench`/`drying_rack` are now `hotbarable: true` (were `false`, since
    before Destroy they never lived in a container) so they can actually be dragged into the
    hotbar. Consuming from a hotbar slot also refreshes `hotbarUI` (refreshHud only touches
    the crafting/inventory menus).
  - Consume-on-success-only carries over unchanged, so cancelling refunds nothing (nothing
    was spent yet) — the item stays in its slot.

**Decision note (recorded this session):** inventory interactions for placeables should mirror
every other item — **right-click = quick-move to hotbar**, and **left-click = enter place mode**
for that placeable (processors/stations especially). This replaced Milestone J's first-pass
"right-click enters placement" behavior after playtest feedback.

Verified via `preview_eval`: right-clicking a backpack workbench quick-moves it to the hotbar
(backpack slot cleared, workbench now in hotbar, **not** in place mode); left-click-in-place on
a backpack Drying Rack enters placement (itemSource from backpack, inventory auto-closed, item
still in the bag pending a successful place), while left-click-in-place on a non-placeable
(wood) is a no-op and a real drag to a *different* backpack slot still rearranges; placing a
2-stack tier-0 workbench from the hotbar twice depletes it (2→1→0, two objects placed, still
armed) then auto-cancels on the third empty attempt; a tier-1 Drying Rack stays armed on a
failed workbench-gate click then consumes + registers a `dryingRacks[]` entry once a Workbench
is nearby; selecting a placeable hotbar slot via number key / wheel / left-click enters place
mode and selecting a tool/weapon/empty slot exits it (equipping the tool); dragging a Drying
Rack from the backpack onto a hotbar slot lands there (the `hotbarable` flip). Type-check clean
(`tsc --noEmit`), no console errors, `preview_screenshot` shows the world booting normally.

### Previously: Milestone I — Drying Rack polish (output-based slider, recipe, tab reorg)

Second milestone out of the I–O batch (`.claude/plans/this-is-a-plan-cached-pixel.md`),
next in the recommended `L → I → J → K → M → N → O` order. Small, independent fixes
bundled because they all touch `DryingRackMenu.ts`/`Processing.ts`/`Items.ts`/`Recipes.ts`
in one pass:

- **Slider is now output-amount based**, not input-unit based. `src/systems/Processing.ts`
  gained `ProcessingStation.recipeForLoaded()` (returns the `ProcessRecipe` governing the
  loaded input, if any) and `maxPossibleOutput()` (`floor(input.count / inputPerOutput)`).
  `DryingRackMenu.ts`'s `selectedAmount` now means "desired output count" everywhere it's
  set or read (`openMenu`, `selectFullAmount`, `updateSliderFromPointer`, `render`'s clamp,
  `promptForAmount`) — e.g. loading 20 cattail (2:1 ratio) now shows a slider scaled 0..10,
  not 0..20. Input-unit conversion (`selectedAmount * recipe.inputPerOutput`) happens only
  at the `previewFor`/`process`/`deps.processAmount` call boundary inside `renderProcess()`,
  per the plan's "call-site conversion only" note — `Processing.ts`'s core `previewFor`/
  `process` signatures are unchanged. This also let the old hacky `previewOutputKey()`
  input-key-string-matching helper be deleted in favor of `recipe.output` from
  `recipeForLoaded()`.
- **Cattail's description no longer spoils processing** (`Items.ts`) — trimmed from "A reed
  from the creek's edge. Dried into twine at a Drying Rack." to "A reed harvested from the
  creek's edge.", matching how other raw pickups are described.
- **Drying Rack recipe → `wood: 5, leather: 4, bones: 2`** (was `wood: 8, leather: 1`,
  `Recipes.ts`) — now that `bones` exists (Milestone L).
- **Crafting-menu tab reorg** (`Recipes.ts` `category` field only, no cost changes):
  `campfire` moved `misc` → `crafting`, `shishkabob` moved `crafting` → `misc`, `drying_rack`
  moved `misc` → `crafting` (`workbench` was already `crafting`, untouched). Workbench,
  Campfire, and Drying Rack now all sit together in the Crafting tab; Misc's sole occupant
  is now Shishkabob.

Verified via `preview_eval`: `discoveredRecipes()` grouped by category confirms the tab
reorg (`crafting`: campfire/workbench/drying_rack/workbench_upgrade, `misc`: shishkabob
only) and the new drying_rack costs (`{bones: 2, leather: 4, wood: 5}`); loading 7 cattail
(2:1 ratio) into a real placed Drying Rack reports `maxPossibleOutput: 3` (vs. old
`maxProcessable: 7` input units) with 1 leftover correctly un-selectable; opening the rack
menu defaults `selectedAmount` to the full possible output (3, not 7); selecting 2 output
units converts to 4 input units at the process call site, yields +2 twine, and leaves 3
cattail loaded (7 - 4 = 3) — confirmed via the real `processRackAmount` path, not a direct
`ProcessingStation.process` call. Type-check clean (`tsc --noEmit`), no console errors,
`preview_screenshot` shows the reworked rack menu mid-session (live "Amount: 1 / 1" after
the test above left 1 output's worth of cattail loaded, "-> 1 twine" preview, no progress
bar/output slot per the earlier rework).

### Previously: Milestone L — new `bones` resource (Boar loot)

First implementation milestone out of the I–O batch planned last session
(`.claude/plans/this-is-a-plan-cached-pixel.md`), picked first per its own recommended
`L → I → J → K → M → N → O` order since bones unblocks both Milestone I's Drying Rack
recipe change and Milestone M's Gremlin Shirt. Small, mechanical addition, no new systems:

- **`src/systems/Inventory.ts`**: added `bones` to the `ResourceType` union.
- **`src/systems/Items.ts`**: new `bones` `ItemDef` (non-hotbarable, stacks to 99),
  following the `boar_meat`/`gremlin_blood` loot-item pattern exactly.
- **`src/scenes/BootScene.ts`**: new `icon_bones` texture (two crossed off-white bone
  shapes) generated the same way every other placeholder icon is.
- **`src/scenes/MainScene.ts` `spawnEnemies()`**: Boar's `loot: LootEntry[]` gained a
  second entry, `{ resource: "bones", min: 1, max: 2 }`, alongside the existing
  `boar_meat` entry — `LootEntry`/`rollLoot()` already supported multiple independently-
  rolled entries per enemy (added back in Milestone C for the ranged Gremlin's
  skin+blood drop), so no type or loot-rolling logic changes were needed.

Verified via `preview_eval`: a live Boar's `rollLoot()` now returns both
`{resource: "boar_meat", amount: 1-2}` and `{resource: "bones", amount: 1-2}` in one
call; `icon_bones` texture exists and loads. Type-check clean (`tsc --noEmit`),
`preview_screenshot` shows the world booting normally, no console errors.

### Previously: Planning session — Drying Rack polish, station-upgrade rework, Gremlin armor (Milestones I–O)

Plan-update session (no code changes) following a fresh round of playtest feedback after
Milestone H. Full plan: `.claude/plans/this-is-a-plan-cached-pixel.md`, referenced from
`CLAUDE.md`'s new roadmap item **4f**. Three Explore agents surveyed `Items.ts`/`Recipes.ts`/
`Inventory.ts`, `Processing.ts`/`DryingRackMenu.ts`/`ResourceNode.ts`/the placement-mode flow,
and `Enemy.ts`/hotbar/right-click handling before the plan was written, so implementation
sessions for I–O shouldn't need to re-explore those areas.

**Locked decisions from this session:**
- **Crafting-menu tab reorg**: Workbench, Campfire, and Drying Rack all move into the
  **Crafting** tab (campfire is conceptually a processor too, per the user); Shishkabob moves
  to **Misc**. No new "Stations"/"Processors" tabs — simpler than what was first proposed.
- **Station-upgrade popup** (right-click "Upgrade") only lists upgrades whose ingredients have
  all been discovered at least once — mirrors the existing tier-1 recipe-discovery gating,
  not "show everything greyed out."
- **Armor equip** supports both **drag onto the paper-doll slot** and **right-click to
  auto-equip** — matches the existing hotbar right-click-to-quick-move precedent.

**New milestones planned (I–O, continuing the A–H lettering), not yet built:**
- **I** — Drying Rack polish: slider reworked to represent desired **output** amount
  (auto-scaled 0..max possible output, not input units), Cattail's description stops
  spoiling what it processes into, recipe changes to `wood:5, leather:4, bones:2`, tab reorg.
- **J** — Placement-mode bug fix (a failed tier-gate check no longer cancels placement mode —
  it stays armed so walking into Workbench range lets the next click succeed) + a new way to
  re-enter placement mode from an inventory/hotbar item (e.g. a Workbench recovered via
  Destroy) via right-click or hotbar-select.
- **K** — Per-instance station tiers + named upgrade system: replaces the single generic
  `workbench_upgrade` consumable with named recipes (e.g. "Tool Sharpener": 3 twine/5 wood/2
  stone) applied directly via the right-click Upgrade popup, and fixes a **latent bug found
  during exploration**: an upgraded Workbench's tier is currently silently discarded on
  Destroy (no tier tag survives placed-Image → loose-pickup → inventory-stack today).
  Flagged as new architecture — recommend Opus.
- **L** — New `bones` resource (Boar loot), unblocks I and M.
- **M** — Gremlin Armor set (Cap/Shirt/Pants → helmet/chest/legs), the first real use of the
  long-dormant `Equipment.ts` slot system (exists since Milestone H, nothing ever called
  `equipment.set()` until now). Replaces the old undifferentiated `gremlin_leather_armor`
  recipe. Each piece has its own lvl-2 upgrade cost; Pants' lvl 2 additionally requires the
  Workbench's own upgrade tier.
- **N** — Blackberry bushes gain a harvest-without-destroy mode (berries picked, bush stays
  in the world) — the game's first persistent-after-harvest node; no such pattern existed
  anywhere in the codebase before this.
- **O** — Resource-density audit. **Two real shortfalls found by math, not guesswork**:
  the Gremlin Armor set needs ~10 `gremlin_leather` (base + lvl-2 upgrades) but only
  RangedGremlin drops `gremlin_skin` and only 4 spawn per session (max 4 ever obtainable);
  new `leather` scrap demand (~9, on top of existing Stone Pickaxe/Club costs) exceeds what
  6 Snakes per session can ever supply. Recommends bumping RangedGremlin (~4→16-20) and
  Snake (~6→14-16) spawn counts — a real departure from Milestone C's original
  "rarer, stronger" ranged-Gremlin tuning intent, called out deliberately rather than
  silently overridden when O is implemented.

Recommended implementation order: **L → I → J → K → M → N → O** (bones first since two other
milestones need it; J and N can slot in anywhere convenient). See the plan file for full
per-milestone detail, file:line references, and verification steps.

### Previously: Drying Rack rework (instant processing + slider), placed-object Upgrade/Destroy, inventory Drop/Destroy

Playtest follow-up right after Milestone H landed — several user-requested changes to the
system, all in one session:

- **Cattail now spawns IN the shallow water at the creek's edge**, not on the surrounding
  land. `Biome.isCreekEdge` was inverted: it now returns true for a *creek* cell that
  touches dry land (the outer ring of the water), instead of a *land* cell that touches
  creek. Verified: all 22 cattails land on-water (`isCreekAt` true), 0 on land.
- **Drying Rack now requires a Workbench**: its recipe tier 0→1. This doubles as "must be
  placed near a Workbench," since tier-1 gating already checks proximity at craft/place
  time. **Bug found + fixed while verifying this**: `attemptPlaceObject()` (the placeable
  path) never actually enforced the tier/workbench-proximity gate — only `craftRecipe()`
  (the backpack-item path) did. Harmless before (every placeable was tier 0), but silently
  let a tier-1 placeable go down anywhere once Drying Rack became one. Added the same
  `recipe.tier > 0 && !isNearWorkbench(...)` guard to `attemptPlaceObject()`.
- **New `workbench_upgrade` item/recipe** (tier 1, `wood: 10, stone: 8, twine: 3`) — costing
  `twine` means it's only discoverable once the player has produced twine at least once,
  which is exactly "making twine unlocks Workbench Upgrade" via the existing
  ingredient-known discovery mechanism, no bespoke flag needed.
- **New generic placed-object right-click menu** (`src/ui/ContextMenu.ts`) — Right-click any
  placed object (Workbench/Campfire/Drying Rack) within reach pops "Upgrade" (only shown for
  Workbench; consumes 1 `workbench_upgrade`, tags `tier: 1` on that specific placed image via
  `setData`, tints it gold — the *mechanical* payoff of an upgraded tier is intentionally
  undesigned this pass, this just wires the consume-and-flag mechanism + a visual tell) and
  "Destroy" (always shown; removes the object and spawns it back as a Minecraft-style
  recoverable loose pickup — a Drying Rack's still-loaded raw input is refunded the same way
  first, so destroying one doesn't eat whatever was inside it). One system covers every
  placeable type, not per-type code.
- **Drying Rack reworked to instant processing** — `src/systems/Processing.ts` dropped its
  `tick()`/duration model entirely. `ProcessingStation` now just holds the loaded input;
  `previewFor(amount)`/`process(amount)` let the player pick *how much* of the loaded stack
  to run through in one instant action (rounds down to a whole multiple of the recipe's
  ratio — e.g. processing 7 of a 2:1 input consumes 6, yields 3, leaves 1 loaded). No more
  progress bar or "Collect" button: processed output auto-deposits into the backpack, and
  overflow (backpack full) drops on the floor next to the player instead of being lost —
  same fallback the new Drop/Destroy system below uses.
- **`DryingRackMenu` UI reworked**: removed the progress bar, output slot, and "drag reeds or
  skins here" hint (replaced with the Drying Rack's own `itemDef` description, always
  visible). Added an **amount slider** (drag the track, or click the "Amount: N / max" label
  to type an exact number via `window.prompt` — a pragmatic choice given this project has no
  DOM text-input UI anywhere yet) driving a live "→ M Twine" preview, and a **Process**
  button. The slider's drag gesture reuses the same global `pointermove`/`pointerup` pair
  `MainScene` already had for item-drag ghosts (`DryingRackMenu.isDraggingSlider()` /
  `updateSliderFromPointer()` / `endSliderDrag()`), rather than a separate input path.
  Loading input resets the slider to the new full amount (`selectFullAmount()`, called from
  `loadRackInput`) — but only on a fresh load, not every re-render, so it never fights a
  manual mid-session adjustment.
- **New inventory Drop/Destroy system** — dragging a stack out of any open menu **onto the
  game world** (not over any panel or fixed HUD) drops it as a recoverable loose pickup near
  the player; dragging it onto a new **trash box** in the `InventoryMenu` (bottom-right,
  below the equipment grid) destroys it permanently, no refund. Both reuse the same
  `resolveItemDrag()` entry point item-move already used, branching on where the pointer
  ended up. `ResourceNode.resource` was widened from `ResourceType` to a plain `string` (and
  gained an optional `magnetReadyAt` cooldown field) so a dropped/destroyed-placeable pickup
  can carry *any* item key (tools, weapons, the Drying Rack itself), not just raw resources
  — `spawnLooseDrop()` picked up a `magnetCooldownMs` param (default 0, unchanged behavior
  for normal resource-node drops) so player-initiated drops don't instantly fly back into
  the inventory that just released them; `updateMagnet()` now skips a piece until its
  `magnetReadyAt` has passed. Manual click-pickup is unaffected by the cooldown.

Verified via `preview_eval`: all 22 cattails now `isCreekAt`-true (was land-adjacent before);
Drying Rack placement blocked far from a Workbench and succeeds standing at one (confirming
the `attemptPlaceObject` fix); `workbench_upgrade` undiscoverable until wood+stone+twine are
all known; `previewFor`/`process` round correctly on non-multiple amounts (7 of a 2:1 ratio
→ consumes 6, yields 3, 1 remains loaded — confirmed across two sequential partial-amount
calls); a full backpack correctly floor-drops processing output/retrieved input with an
active magnet cooldown; dragging a stack onto the trash box destroys it with no floor
pickup, dragging one out to the world spawns a magnet-cooldown-gated pickup; right-click
context menu opens on a placed Workbench, "Upgrade" consumes the item and sets
`tier: 1` + gold tint, "Destroy" removes the object, spawns it back as a pickup, and (for a
Drying Rack with loaded input) also refunds that input as separate loose pieces; normal
chop/mine interaction still works unchanged post-rework. Type-check clean (`tsc --noEmit`),
no console errors, `preview_screenshot` confirms the reworked rack menu (description text,
slider, live preview, Process button, no progress bar), the inventory trash box, and the
context menu popup all render correctly.

### Previously: Milestone H — Harvestables + Drying Rack (first processing station)

Plan file: `.claude/plans/let-s-proceed-with-option-crystalline-petal.md` (Milestone H, the
last open item in the first-biome content pass — **built on Opus per the plan's "net-new
architecture → Opus" guidance**). This introduces the game's **first timed processing
system** (load raw input → wait → collect a different output, distinct from Crafting's
instant spend-get model) and its **first drag-and-drop interaction**.

- **New resources** (`Inventory.ts` `ResourceType`, `Items.ts` `ITEM_DEFS`, `BootScene.ts`
  icons + world textures): `cattail`, `blackberry` (harvestables) and `twine`,
  `gremlin_leather` (processed outputs). New world sprites `cattail`, `blackberry_bush`,
  `drying_rack`; new icons for all four resources plus `icon_drying_rack` and
  `icon_gremlin_leather_armor`.
- **Harvestables** (`MainScene.spawnNodes`): **Blackberry bushes** (16, forest, free
  pickup — a future food item, no eating mechanic yet, deliberately per the plan).
  **Cattail** (22) uses a bespoke spawn constraint — the reedy **creek *border*** (dry land
  adjacent to water), not just "off the creek". New `Biome.isCreekEdge(x,y)` (4-neighborhood
  creek-adjacency) + `MainScene.pickCreekEdgePoint()` rejection sampler, since scatter's
  zone/avoidCreek sampling can't express "shoreline". Verified: all 22 cattails land on
  creek-edge cells (0 on water); all 16 berries in forest (0 on water).
- **New file `src/systems/Processing.ts`** — framework-light like Stamina/Biome (no Phaser
  dep, owns no GameObjects). `PROCESS_RECIPES` (ratios locked in the plan: `cattail→twine`
  **2:1** at 3s/unit, `gremlin_skin→gremlin_leather` **1:1** at 4s/unit — durations were a
  first-pass tuning call, unset in the plan). `ProcessingStation` holds `input`/`output`
  slots + progress; `tick(deltaMs)` produces as many whole batches as elapsed time allows
  (so a rack left running while its menu was closed catches up in one tick, not one
  batch/frame); `previewOutput()` returns the total yield (produced + still-extractable)
  for the live preview; `canAccept()` enforces one-input-type-at-a-time.
- **Drying Rack** — new placeable (`drying_rack` recipe: tier 0, 8 wood + 1 leather, `misc`
  tab), placed via the exact existing campfire/workbench placement flow. Each placed rack
  gets its own `ProcessingStation`, tracked in a new `dryingRacks[]` (paired with its image),
  ticked every frame in a new `MainScene.updateProcessing()` (runs in both the normal and
  death-freeze update branches — drying is real-time, not gated on the player watching).
- **New file `src/ui/DryingRackMenu.ts`** — the game's first processing-station UI and
  first drag-and-drop. Opened by interacting with a placed rack (`[LMB] Use Drying Rack`
  hover prompt, gated on reach; racks are hover-tested alongside nodes/enemies in
  `updateHover`). Shows the **backpack alongside** the station's input/output; backpack
  items that aren't a valid input for this station are **dimmed** (affordance only, keyed
  off `station.canAccept`, mirroring the crafting menu's grey-out pattern). Player **drags**
  a valid item onto the input slot (`resolveItemDrag` now routes to `loadRackInput` when the
  drop is over the input box, reusing MainScene's existing shared drag controller);
  right-click a valid stack **quick-loads** the whole thing. A **live output preview box**
  under the input shows the projected total (e.g. 10 cattail → "5 Twine"); a **progress bar**
  + "Drying…/Idle/Empty" status; a **Collect** button moves ready output to the backpack;
  clicking a loaded input pulls the raw material back out. Re-rendered every frame while open
  (MainScene drives it) so progress/counts/preview stay live as drying advances on its own.
  Flat `scrollFactor(0)` objects, no Containers — same input-hit-testing constraint as the
  other menus.
- **Downstream payoff wired in**: `gremlin_leather_armor` recipe (tier 1, `armor` tab —
  which already existed — 2 gremlin_leather + 2 twine) gives the two processed outputs a
  crafting sink. It's discoverable once twine + gremlin_leather are first collected AND a
  Workbench has been placed (tier-1 gate). **Not yet wearable** — the armor-equip system
  doesn't exist yet, so it sits in inventory like boar_meat/shishkabob do; that's expected.
  The Slingshot's twine ingredient remains a noted-not-built downstream hook.

Verified via `preview_eval` (snapshotting **primitive values**, not live object refs — a
gotcha this session: returning live `st.input`/`st.output` refs let the still-running game
loop mutate them to completion before the tool serialized the result, which briefly looked
like a tick bug but wasn't): spawn constraints exact (22 cattail all creek-edge, 16 berries
all forest, 0 on water); station 2:1/1:1 ratios + 3s/4s pacing + half-progress fraction;
`loadRackInput`/`collectRackOutput`/`retrieveRackInput` move items correctly and respect a
full backpack; menu open/close/binding + `anyMenuOpen`; discovery unlocks `drying_rack`
(tier 0) and `gremlin_leather_armor` (tier 1, needs a bench); drop-target geometry
(backpack slot indices + input box) matches the drawn boxes; and a full simulated
drag-from-backpack-onto-input-slot loads the stack and empties the bag slot end to end.
Type-check clean (`tsc --noEmit`), no console errors, `preview_screenshot` shows the world
booting with cattails on the banks + blackberry bushes in the trees, and the rack menu
rendering correctly (dimmed non-inputs, mid-progress bar, Collect button).

### Previously: Fixed enemies still walking off world bounds (Arcade Group defaults gotcha)

User reported enemies were *still* able to run off the map/screen, despite `Enemy.ts`'s
constructor already calling `this.setCollideWorldBounds(true)` (added in an earlier
session — see the "Enemies no longer walk off world bounds" entry further down). Root
cause was one level up: `MainScene.create()` builds `this.enemyGroup =
this.physics.add.group()` with **no config**, then `spawnEnemies()` calls
`this.enemyGroup.add(enemy)` for every spawned enemy. Phaser's `PhysicsGroup.
createCallbackHandler` re-applies the **group's own defaults** to every member's body on
`add()` — including `setCollideWorldBounds`, which defaults to `false` unless the group
is configured with `collideWorldBounds: true`. That silently *undid* the per-entity
`setCollideWorldBounds(true)` the instant each enemy was added to the group, for every
enemy type (Boar/`Enemy`, `Snake`, `RangedGremlin`, `MeleeGremlin`) — same class of bug
as the already-documented `Projectile` velocity-zeroing gotcha (STATUS.md, Milestone C),
just resetting a boolean instead of a vector, and in a different Group (`enemyGroup` vs
`enemyProjectiles`). See `[[survivor-rpg-phaser-arcade-group-defaults-reset]]` in memory
for the general pattern — this is the second time it's bitten this codebase and is worth
checking any time a fresh Group is created and used to `.add()` already-constructed
entities that set body properties in their own constructor.

- **Fix** (`src/scenes/MainScene.ts`, `create()`): `this.physics.add.group({
  collideWorldBounds: true })` instead of the no-config call. Applies to every current
  and future `Enemy` subclass automatically — no per-species change needed, same as the
  original per-entity fix intended.

Verified via `preview_eval`: before the fix, `enemyGroup.getChildren()[i].body.
collideWorldBounds` read `false` for every spawned enemy (confirming the bug
reproduces). After the fix and a page reload, all 28 spawned enemies across all four
types (`Enemy`: 12, `Snake`: 6, `RangedGremlin`: 4, `MeleeGremlin`: 6) report
`collideWorldBounds: true`. Type-check clean, no console errors, world renders normally.

### Previously: Range-ring toggle (O key)

Follow-up to the attack-range ring below, same session — user asked for a way to turn
the ring on/off. Mirrors the existing magnet toggle (`V`) pattern exactly:

- **`src/scenes/MainScene.ts`**: new `rangeRingEnabled = true` field, `keydown-O` binds
  to a new `toggleRangeRing()` (flips the flag, logs to the event log, and clears the
  Graphics immediately if turning off so it doesn't linger a stale frame). `updateAttackRangeRing()`
  now checks `!this.rangeRingEnabled` before the equip check — toggle wins even while a
  weapon/tool is equipped. Added `"Range ring: O"` to the `KeybindsUI` list.

Verified via `preview_eval`: with a tool equipped, `updateAttackRangeRing()` draws (14
commands), calling `toggleRangeRing()` clears it to 0 regardless of equip state, toggling
again restores the draw. Confirmed the real `keydown-O` event (via
`scene.input.keyboard.emit`) flips `rangeRingEnabled` end-to-end, not just the
direct-method-call path. Type-check clean, no console errors, `preview_screenshot` shows
the ring rendering around the player when enabled.

### Just finished: Dash i-frames (Milestone E) + attack-range ring (Milestone F)

Plan file: `.claude/plans/let-s-proceed-with-option-crystalline-petal.md` (Milestones E
and F — both flagged "fully independent," picked up together since they're small and
don't touch overlapping code).

- **Milestone E — dash → dodge + i-frames** (`src/entities/Player.ts`,
  `src/scenes/MainScene.ts`): `DASH_SPEED` 340→450 and `DASH_DURATION_MS` 160→105 for a
  sharper burst-then-stop feel (net displacement stays similar). New
  `DASH_IFRAME_MS` (150, in `MainScene.ts`) set on `this.invulnerableUntil` at the same
  site `DASH_STAMINA_COST` is already spent (`frame.dashStarted` branch in `update()`) —
  slightly outlasts the dash itself. Reuses the existing `invulnerableUntil` field/guard
  in `applyDamageToPlayer()` unchanged (already generic to any code setting it) — same
  mechanism as respawn invuln, different constant, not shared. `DASH_COOLDOWN_MS` (600)
  left as-is per the plan.
- **Milestone F — attack-range indicator** (`src/scenes/MainScene.ts`): new
  `attackRangeRing: Phaser.GameObjects.Graphics` created in `create()` (depth -5, just
  above ground/-10, below entities), redrawn each frame in a new
  `updateAttackRangeRing()` called alongside `syncEquippedIconPosition()` in both
  `update()` branches (normal and the frozen-on-death branch, so it doesn't vanish on
  death). Equipped-gated only (`!equippedTool && !equippedWeapon` → `clear()` and
  return — empty draw, cheapest hide), deliberately **not** target-gated per the plan
  (would flicker during approach). Radius = flat `REACH` (64) — no per-weapon range
  table exists yet, so the ring reads the same constant all melee already uses.

Verified via `preview_eval`: `updateAttackRangeRing()` with nothing equipped leaves the
Graphics' `commandBuffer` empty (len 0); equipping `stone_axe` and calling it again
produces draw commands (len 14); unequipping clears it back to 0 — confirms the
show/hide gating end-to-end without needing real mouse/pointer simulation. Manually
set `invulnerableUntil` to mirror the dash-start branch and confirmed
`time.now < invulnerableUntil` reads true immediately after, matching what
`applyDamageToPlayer()`'s existing guard checks. Type-check clean
(`tsc --noEmit`), `preview_screenshot` shows the world booting normally with no ring
visible pre-equip (correct), no console errors.

### Previously: Boar tuning for the 2x world (Milestone B)

Plan file: `.claude/plans/let-s-proceed-with-option-crystalline-petal.md` (Milestone B —
the numeric-tuning half; the movement/zigzag half was already resolved earlier via
non-solid trees). Addresses the long-standing "Boar too aggressive" flag from `STATUS.md`
now that the world is the larger 2560x1920 size.

- **`src/entities/Enemy.ts`**: `AGGRO_RADIUS` 140 → 105 (smaller, per the plan —
  complaint was aggression, not size), `DEAGGRO_RADIUS` 280 → 190 (kept the same ~1.8x
  ratio to AGGRO_RADIUS for the hysteresis gap).
- **`src/scenes/MainScene.ts` `spawnEnemies()`**: Boar count 8 → 12, now split 80%
  forest / 20% grassy (was 100% forest) via two `pickSpawnPoint` calls instead of one —
  matches "Boar common in Forest, rare in grassy" from the plan. Player-spawn clear
  radius 200 → 220 (~2x the new, smaller aggro radius, keeping the same ratio the plan
  called out as the actual point of the original 150→200 change).

Verified via `preview_eval`: spawn counts are exactly 12 Boars (11 forest / 1 grassy in
the sampled run — consistent with 80/20 weighting under normal RNG variance); real
`Enemy.update()` calls confirm a Boar stays `idle` at 110px and flips to `chasing` at
100px (matching the new `AGGRO_RADIUS`), and a chasing Boar stays `chasing` at 185px but
drops to `idle` past 195px (matching the new `DEAGGRO_RADIUS`). Type-check clean, no
console errors, world renders normally in `preview_screenshot`.

### Just finished: Enemies no longer walk off world bounds

Enemies were missing `setCollideWorldBounds(true)` — `Player.ts` has always had this, but
`Enemy.ts`'s constructor never did, so chase/flee/kite AI (Boar chasing, Snake fleeing,
RangedGremlin kiting) could push an enemy straight through the edge of the 2560x1920
world. Fixed with a one-line addition in `Enemy.ts`'s constructor, right next to
`scene.physics.add.existing(this)` — mirrors `Player`'s existing call exactly. Applies to
every `Enemy` subclass (Boar, Snake, RangedGremlin, MeleeGremlin) for free, no per-species
changes needed.

### Noted, not acted on: Hold LMB to continuously attack/chop/mine

User request (2026-07-07): holding left-mouse-button down should continuously
attack/chop/mine the hovered target, rather than requiring a fresh click per hit. Today
`tryInteract()` only fires from the `pointerdown` event handler — a held button doesn't
re-trigger it. The existing per-tool/weapon cooldown gating (`lastToolHitAt`/
`lastWeaponHitAt` + `toolCooldownMs`/`weaponCooldownMs`) already caps the effective hit
rate correctly, so the fix is purely about *triggering* on hold (checking
`pointer.isDown` each frame against the cooldown, alongside — or instead of — the
one-shot `pointerdown` handler), not about changing any damage/cooldown numbers. Not
implemented yet — flagging for a future session.

### Noted, not acted on: Player attack speed too high starting off (needs per-item tuning)

User feedback (2026-07-07): starting weapon/tool attack speed feels too fast right out of
the gate. Current cooldowns live in `weaponCooldownMs()` (`src/systems/Weapons.ts`: Wood
Club 450ms, Stone Club 550ms) and `toolCooldownMs()` (`src/entities/ResourceNode.ts`: both
stone tools 500ms) — these should be tuned up (slower) for the starting tier. Longer-term,
the user wants attack speed to be a **buffable stat** (something that can later be sped up
via gear/skills/consumables) and to **vary per item** (already partly true via the
per-`WeaponType`/`ToolType` cooldown tables, but the starting values across the board are
too fast and haven't been deliberately tuned as a set). Not implemented yet — flagging for
a future session; when tackled, revisit both tables together rather than one weapon at a
time so the relative pacing across items stays coherent.

### Just finished: Fixed the real freeze — projectile-overlap callback was destroying the player

The hysteresis fix below didn't resolve the reported freeze; the user then reproduced it
again and this time captured the actual browser console error, which pinned it down
immediately:

```
Player.ts:71 Uncaught TypeError: Cannot read properties of undefined (reading 'time')
    at Player.update (Player.ts:71:28)
    at MainScene.update (MainScene.ts:283:31)
```

**Root cause**: `MainScene`'s `enemyProjectiles` vs `player` overlap callback
(`this.physics.add.overlap(this.enemyProjectiles, this.player, (proj) => {...})`) assumed
Phaser always calls the callback as `(object1, object2)` matching registration order —
i.e. that the first argument is always the projectile. That's a real Phaser gotcha for a
**Group-vs-single-object** overlap specifically: argument order isn't guaranteed to match
registration order the way it reliably does for single-vs-single. When it came back
swapped, `proj` was actually **the player**, and `projectile.destroy()` destroyed the
player sprite instead of the projectile — leaving `this.player` a dead reference with no
`.scene`, so the very next frame's `this.player.update()` (`Player.ts:71`,
`this.scene.time.now`) threw and killed the game loop. This exactly matches the reported
repro ("right when projectile hits me the game freezes") — freezes right where the earlier
"known verification gap" note (this session's Milestone C entry) had flagged the live
overlap path as unverified.

- **Fix** (`MainScene.ts`, the overlap callback): instead of trusting argument position,
  pick whichever of the two callback args is actually `instanceof Projectile` and destroy
  *that* one — correct regardless of which slot Phaser puts it in.

Verified: type-check clean, world boots and renders with no console errors. Real-time
physics-driven overlap firing still couldn't be exercised end-to-end via `preview_eval`
this session (same environment throttling as before — manual `world.step()`/`world.update()`
calls don't reproduce a live overlap outside the real per-frame loop), but the fix removes
the exact failure mode the user's own console trace identified, and the surrounding logic
(damage application, i-frames) was already verified correct in the prior entry.

### Just finished: RangedGremlin melee/ranged mode hysteresis (freeze report follow-up)

User reported the game "freezing" while engaging a ranged Gremlin at melee range, right
after the combat-pattern rework below shipped. Extensive stress-testing (300 synthetic
frame ticks via direct `s.update()` calls, 200 direct `updateEnemies()` calls, a full
attack-to-kill sequence via `tryAttackEnemy()`) turned up **zero exceptions and no
infinite loop** — so this wasn't a crash in the reproducible sense. It did turn up a real
design gap, though: the melee↔ranged mode toggle used a **single shared distance
threshold** (`RANGED_MELEE_RANGE`, 24px) for both entering and leaving melee — every other
aggro/deaggro transition in this codebase (Boar/Snake/MeleeGremlin) deliberately uses a
*gap* between its enter/exit radii specifically to avoid boundary flicker, and this one
didn't. With the player-enemy physics collider constantly separating overlapping bodies,
hovering right at ~24px could flip the mode every single frame — very plausibly reading
as a "freeze"/stutter even without a real crash.

- **New `RANGED_MELEE_EXIT_RANGE` (40px)** — entering melee still triggers at 24px, but
  leaving it now requires backing out past 40px, not just past 24px again. Implemented as
  an explicit two-branch check (`if mode is meleeing: only leave past exit range; else:
  only enter at/under the enter range`) rather than a single ternary re-evaluated every
  frame, so the mode is now sticky within that 16px buffer band instead of knife-edged.

Verified via `preview_eval`: jittering the player back and forth across the *old* 24px
boundary (samples at 22-38px) all correctly stayed in `"meleeing"` instead of flickering;
only actually crossing 40px flipped it back to `"ranged"`. Type-check clean, no console
errors, world renders normally. **Flagged to the user**: since no crash was reproducible
despite significant effort, if the freeze persists after this fix, the browser console
error (F12 → Console) at the moment it happens would be the fastest way to pin down an
actual exception, if one exists beyond this flicker issue.

### Just finished: RangedGremlin combat pattern rework + HP doubled

Playtest follow-up right after Milestone C landed — the ranged Gremlin's old
kiting/throwing/melee-fallback split didn't match the intended feel:

- **New pattern**: once the player is in range, the Gremlin **always kites** (backs
  directly away) while managing a **2-shot burst** (`BURST_SHOT_COUNT`, fired
  `BURST_SHOT_INTERVAL_MS` (180ms) apart — a quick "double tap"), then a longer
  `BURST_COOLDOWN_MS` (2400ms) before the next burst — replacing the old flat
  `THROW_COOLDOWN_MS` single-shot-per-cooldown behavior and the old
  `PREFERRED_RANGE` band (no more "hold ground between preferred and aggro" state;
  it's just always retreating now while in ranged mode).
- **Melee is now a real two-way mode toggle, not a one-way fallback**: `this.mode =
  dist <= RANGED_MELEE_RANGE ? "meleeing" : "ranged"` is recomputed every frame off
  the same threshold — closing inside melee range flips it into meleeing (fights
  back, same claw/cooldown as before); backing back out immediately flips it back
  to ranged/kiting, resuming the burst cycle. Previously melee was only entered as
  a fallback and there was no explicit "kiting" mode separate from "throwing."
  `RangedMode` narrowed from `"idle" | "kiting" | "throwing" | "meleeing"` to
  `"idle" | "ranged" | "meleeing"`.
- **`RANGED_MAX_HEALTH` doubled, 16 → 32** — the old HP felt too fragile for how
  much pressure the ranged pattern is meant to apply.

Verified via `preview_eval`: a fresh contact fires shot 1 immediately, a second
shot at +100ms is correctly withheld (inside `BURST_SHOT_INTERVAL_MS`), fires at
+200ms (burst complete), stays withheld through +500ms (burst cooldown), and a
new burst starts once `BURST_COOLDOWN_MS` has elapsed (4 total projectiles spawned
across that sequence, matching the expected 1/1/2/2/3 running counts at each
checkpoint). Separately: a Gremlin placed within `RANGED_MELEE_RANGE` immediately
reports `mode: "meleeing"`, zero velocity, and lands a claw hit (respecting its own
cooldown on a second call); moving the player back out to 100px on the same
Gremlin flips it back to `mode: "ranged"` with velocity pointing away from the
player. `maxHealth` confirmed at 32. Type-check clean, no console errors,
`preview_screenshot` shows the world/enemies rendering normally.

### Just finished: Projectile system + Gremlin (Milestone C) — two variants

Plan file: `.claude/plans/let-s-proceed-with-option-crystalline-petal.md` (Milestone C,
now done — picked ahead of B's remaining Boar-tuning half since it unblocks the
Drying Rack's `gremlin_skin → gremlin_leather` line, per the plan's "Priority note #2").

- **New file `src/entities/Projectile.ts`** — the game's first ranged-attack primitive,
  generic and reusable (not Gremlin-specific): `ProjectileConfig` (`x, y, angle, speed,
  damage, texture, maxRangePx, sourceIsPlayer`), self-destroys once traveled distance
  reaches `maxRangePx` (distance-based despawn, not a timer, so faster projectiles
  aren't accidentally shorter-ranged). A `ProjectileHost` interface
  (`spawnProjectile(cfg): Projectile`) lets `Enemy` subclasses call
  `(this.scene as unknown as ProjectileHost).spawnProjectile(...)` without importing
  `MainScene` directly (would be circular — `MainScene` already imports entity classes).
  **Gotcha hit + fixed**: setting the physics body's velocity in the constructor was
  silently zeroed the moment `MainScene.spawnProjectile()` added the sprite to the
  `enemyProjectiles` Arcade Group — Arcade Groups overwrite a freshly-enabled body's
  velocity with their own (zeroed) defaults on `add()`. Fixed by storing the computed
  velocity and exposing a `launch()` method the spawner calls *after* `group.add()`.
- **`MainScene.ts`**: new `enemyProjectiles` Arcade group + an overlap collider against
  the player that calls the same `applyDamageToPlayer()` entry point melee damage
  already goes through (so it respects i-frames/death same as everything else), then
  destroys the projectile. No `playerProjectiles` group yet — nothing fires one until
  the Slingshot exists; that'll need its own group + overlap-vs-enemies wiring then.
- **`src/entities/Enemy.ts` loot generalized**: `EnemyConfig.lootResource/lootMin/lootMax`
  (single-drop) replaced with `loot: LootEntry[]` (one or more independently-rolled
  `{resource, min, max}` entries) and `rollLoot()` now returns an array instead of a
  single object — needed because the ranged Gremlin drops two different resources
  (skin + blood) on death, and the existing single-entry shape couldn't express that
  without per-species branching in `MainScene`. Boar and Snake's spawn configs updated to
  the new one-entry-array shape (behavior unchanged); `MainScene.tryAttackEnemy()` now
  loops over `rollLoot()`'s array, spawning one loose-drop pile per entry.
- **New file `src/entities/Gremlin.ts`** — two separate classes per the plan's "two
  gremlin variants" note (added 2026-07-07), each with its own state machine/numbers
  rather than one class with a "ranged?" flag:
  - **`RangedGremlin`** (stronger) — `idle | kiting | throwing | meleeing` state machine.
    Aggro 160px (larger than melee — notices earlier), backs away below `PREFERRED_RANGE`
    (120px), holds and throws rocks on a 2s cooldown between preferred and aggro range,
    falls back to a claw (10 dmg) if the player closes to melee range (24px). Drops
    **Gremlin Skin + Gremlin Blood** (skin is exclusive to this variant — feeds the
    Drying Rack's `gremlin_leather` output, and shouldn't be trivially farmable from the
    weak variant). 16 max HP. Overrides `isAggro()`/`takeHit()` off its own `mode` field
    (doesn't use `Enemy`'s shared `state` field), mirroring the pattern `Snake` already
    established for enemies with bespoke state machines.
  - **`MeleeGremlin`** (weaker) — plain `idle | chasing` chase-and-claw, no
    kiting/throwing states at all, but its own tuned numbers (not copied from Boar):
    130px aggro, 70px/s chase speed, 8 dmg claw (vs Boar's 25), 12 max HP. Drops
    **Gremlin Blood only** (no skin).
  - Both reuse `Enemy`'s protected give-up/re-aggro-immunity helpers
    (`startPursuit`/`hasGivenUpPursuit`/`canAggro`/`enterGivenUpState`/`markAttackLanded`)
    rather than reimplementing that mechanism, same as `Snake` does.
- **`ResourceType`** gained `gremlin_blood` and `gremlin_skin`; new `ItemDef` entries +
  `icon_gremlin_blood`/`icon_gremlin_skin` textures (`BootScene.ts`, matching the
  `boar_meat` icon precedent). New `gremlin`/`gremlin_weak`/`gremlin_rock` placeholder
  textures — the ranged variant is drawn bigger with a lighter belly highlight so it
  visually reads as tougher than the smaller, duller melee variant.
- **`MainScene.spawnEnemies()`**: 4 `RangedGremlin` + 6 `MeleeGremlin`, both
  grassy-preferred (per `CLAUDE.md`'s first-biome content notes) — melee more common,
  ranged rarer/stronger, matching the plan's tuning note.

Verified via `preview_eval`: spawn counts match (8 Enemy/Boar, 6 Snake, 4 RangedGremlin, 6
MeleeGremlin); `RangedGremlin.update()` correctly transitions idle→throwing on first
contact at mid-range (spawns a real projectile into `enemyProjectiles`, confirmed via
group child count), transitions to kiting when the player closes inside
`PREFERRED_RANGE` (velocity vector points away, confirmed by sign/magnitude), and
correctly melees (returns `true`, respects `RANGED_MELEE_COOLDOWN_MS`) once inside
`RANGED_MELEE_RANGE`; `rollLoot()` returns exactly `[gremlin_skin, gremlin_blood]` for
`RangedGremlin` and `[gremlin_blood]` for `MeleeGremlin`; `applyDamageToPlayer` correctly
deducts a projectile's `damage` and correctly no-ops during the i-frame window (tested by
calling it directly, matching the project's established "drive state directly via
`preview_eval`" convention). Type-check clean (`tsc --noEmit`), no console errors, world
boots and renders normally in `preview_screenshot` with both gremlin variants visible.

**Known verification gap, flagged rather than glossed over**: the live
Phaser-physics-driven overlap between a real in-flight projectile and the player (as
opposed to calling `applyDamageToPlayer` directly) could not be exercised end-to-end this
session — the preview browser tab was backgrounded throughout (`document.hasFocus()`
false), and real-time `requestAnimationFrame`/scene-`postupdate` ticks were severely
throttled-to-frozen (a 30-tick wait via scene events timed out after 30s with only a
couple of frames having run), matching `CLAUDE.md`'s documented "backgrounded preview tab
stalls Phaser's loop" quirk, just more severe than previously seen. What *is* confirmed:
the overlap collider is registered correctly (`physics.world.colliders` shows the new
`overlapOnly: true` entry alongside the existing solids/enemy colliders), the
projectile's velocity is correctly non-zero after the `launch()` fix, and the damage-
application path it calls into is independently correct. The remaining gap is narrow —
whether Arcade Physics's own overlap detection fires for two small moving bodies, which
is exercised elsewhere in this same engine version — but it's true that this specific
path wasn't watched happen live, so a fresh session with a focused/foreground preview tab
should double check a real thrown rock actually lands before calling ranged combat fully
battle-tested.

### Just finished: Snake deaggro + fight-back-before-fleeing behavior

Follow-up playtest feedback on Snake right after the previous fixes: it never deaggro'd
while chasing (would pursue forever if it just never landed a hit), and every hit from
the player made it flee immediately — even before it had ever landed a bite of its own,
which read as "runs away for no reason."

- **New deaggro while `striking`** (`src/entities/Snake.ts`): own condition (per
  CLAUDE.md's "different condition, not different number" rule), not a copy of Boar's
  30s/no-hit-landed giveup — Snake gives up much faster since it's a hit-and-run
  ambusher, not a sustained hunter. New `CHASE_GIVEUP_MS` (4000) and
  `CHASE_GIVEUP_RADIUS` (150px) — either the player stays out of melee range for 4s of
  continuous pursuit, or gets farther than 150px, and it gives up (`giveUp()`: back to
  `hidden`, alpha down, `ambushReadyAt` cooldown starts). Checked every frame at the top
  of the `striking` branch, before the melee/chase logic.
- **`takeHit()` now branches on whether it's already landed a bite this engagement** (new
  `hasBitten` field, reset whenever it fully re-hides): hasn't bitten yet → reveal and
  fight back (`enterStriking()`) instead of fleeing; already bitten → flee for a few
  seconds (new `RETALIATION_FLEE_MS`, 2500) then **want to strike again** rather than
  fully disengaging. `beginFlee()` gained a `reengage: boolean` param — post-bite flee
  (bit landed, no retaliation) ends back in `hidden` with the long rehide cooldown;
  post-retaliation-hit flee ends back in `striking` with a fresh pursuit clock. The
  original "bite → flee → hide" loop (no interruptions) is unchanged.

Verified via `preview_eval` (single synchronous blocks, per the project's cooldown-timing
testing convention): a snake stuck chasing a kiting player (held just outside melee, well
within giveup radius) auto-deaggros back to `hidden` once `CHASE_GIVEUP_MS` elapses; a
snake chasing a player who suddenly jumps past `CHASE_GIVEUP_RADIUS` deaggros
immediately; hitting a snake that hasn't bitten the player yet flips it straight to
`striking` (alpha 1) without ever fleeing; hitting a snake that already landed a bite
(currently `fleeing`) sets `reengageAfterFlee: true` and, after `RETALIATION_FLEE_MS`
elapses, lands back in `striking`; an uninterrupted bite still ends the cycle in `hidden`
after the normal (shorter) post-bite flee. Type-check clean, no console errors.

### Just finished: Snake playtest follow-ups + crafting-menu tab reorg

Four small fixes requested right after Snake (Milestone D) landed, in the same session:

- **Snake bite damage 5 → 20** (`src/entities/Snake.ts`) — a landed ambush bite should
  actually hurt; the low-HP (11) side of its tradeoff stays as-is, only the damage side
  was under-tuned.
- **Enemy HP bars now only show while aggro'd**, not at rest. New `Enemy.isAggro()`
  (protected, default `this.state === "chasing"`) gates `healthBarBg`/`healthBarFill`
  visibility every frame in `preUpdate()`. `Snake` overrides it (`this.mode !== "hidden"`)
  since it tracks aggro via its own mode field, not the shared `state` field — mirrors how
  `Snake.takeHit()` already had its own override pattern.
- **"Leather" → "Leather Scraps"** — display-name-only rename in `Items.ts` (`name`/
  `description`), resolving the open naming question CLAUDE.md had flagged ("leather" key
  vs "leather scrap" from the design notes). The `ResourceType`/item **key** stays
  `"leather"` — renaming the key would've meant touching `Snake.ts`, `Recipes.ts`,
  `Inventory.ts`, and every drop/cost reference for a cosmetic change with no functional
  upside.
- **Crafting-menu tab reorg**: `RecipeCategory`'s `"build"` tab is gone, replaced with a
  new `"misc"` tab. Workbench moved `"build"` → `"crafting"` (now sits in the Crafting tab
  next to Shishkabob); Campfire moved `"build"` → `"misc"` (first occupant of the new Misc
  tab, where future placeables like it will live). `CraftingMenu.ts`'s `CATEGORIES` list
  updated to match (`Build Pieces` label removed, `Misc` added). No recipe **costs**
  changed, only `category`.

Verified via `preview_eval`: forcing a Boar into `chasing` and a Snake into `striking`
both flip their HP bar to visible; both start hidden/idle with bars invisible. Snake's
`biteDamage` getter reads `20`. Crafting menu's `crafting` category recipe list includes
both `"Shishkabob"` and `"Workbench"`; `misc` includes `"Campfire"`; `preview_screenshot`
confirms the five tabs read Tools/Weapons/Armor/Crafting/Misc and the event log fires
"New Recipe Unlocked: Campfire" once wood/stone are known. Type-check clean, no console
errors.

### Just finished: Snake (Milestone D) — first ambush enemy, first leather source

Plan file: `.claude/plans/let-s-proceed-with-option-crystalline-petal.md` (Milestone D,
now done — prioritized ahead of B/C specifically because it's the only planned source of
`leather`, which Stone Pickaxe/Stone Club require to ever finish discovering).

- **New file `src/entities/Snake.ts`**, subclassing `Enemy` for rendering/HP-bar/depth
  reuse but **fully overriding `update()`** with its own `hidden | striking | fleeing`
  state machine — not a re-tuned copy of Boar's chase AI (per the "different condition,
  not just different number" standing decision in CLAUDE.md). `hidden`: motionless at
  alpha 0.35 ("in the grass," reuses the placeholder texture, no new art) — dist to
  player must cross a *tight* `AMBUSH_RADIUS` (45px, vs Boar's 140) **and** be past its
  own `ambushReadyAt` cooldown to trigger `striking` (alpha snaps to 1, lunges in). On a
  landed bite it immediately `beginFlee()`s (retreats away from the player for
  `FLEE_DURATION_MS`), then re-hides (`ambushReadyAt = now + REHIDE_COOLDOWN_MS`, alpha
  back to 0.35) — hit-and-retreat, not a sustained chase. Own numbers only: 11 max HP, 5
  bite damage (vs Boar's 20/25). **Getting attacked directly always reveals + flees**,
  even while nominally "hidden" (`Snake.takeHit()` overrides the base reaction) — a weak
  ambush enemy doesn't stand and fight once actually engaged, distinct from Boar's
  idle-to-chasing-on-hit.
- **`Enemy.ts` made loot and combat stats data-driven** (new `EnemyConfig` fields
  `lootResource`/`lootMin`/`lootMax`/`maxHealth`/`biteDamage`, replacing the old
  module-level `MAX_HEALTH`/`BITE_DAMAGE` constants and the hardcoded `"boar_meat"` drop
  in `MainScene.tryAttackEnemy()`) — new `Enemy.rollLoot()` returns `{resource, amount}`
  generically so MainScene doesn't need per-species branching. `applyFacing()` promoted
  private → protected so Snake can reuse the same 360°-rotation helper instead of
  duplicating it. `Snake`'s own `lastStrikeBiteAt` field is intentionally *not* named
  `lastBiteAt` — that name collides with `Enemy`'s existing private field of the same
  name (TS treats same-named private fields in base/derived classes as incompatible
  declarations, caught by `tsc`).
- **`MainScene.spawnEnemies()`**: Boar spawn now passes its stats explicitly through the
  new config fields (behavior unchanged — still 20 HP/25 dmg, forest-preferred, count 8).
  New Snake spawn loop (count 6) biased to **grassy** zone via the existing
  `pickSpawnPoint(rng, "grassy", 200)`, per the plan's "Snake weighted toward grassy."
- **New `snake` texture** in `BootScene.ts` (20x8 — long green body + darker head patch,
  low-profile silhouette that reads as "in the grass" even before the hidden-alpha fade).
- **Naming resolution locked in** (per the plan's explicit callout): reused the existing
  `leather` `ResourceType`/item key for Snake's drop — no duplicate `leather_scrap` type
  was added.

Verified via `preview_eval` (single synchronous eval blocks per the project's "run
cooldown-timing tests in one call" convention, since the real game loop's own
`updateEnemies()` would otherwise clobber manually-set state between separate tool
calls): a Snake spawns hidden at alpha 0.35; stepping `update()` with a player 10px away
triggers striking (alpha 1) then a landed bite (`bit: true`) on the next call; jumping
the clock past `FLEE_DURATION_MS` returns it to hidden (alpha 0.35); a further call
during the re-hide cooldown does not re-trigger striking; `takeHit()` on a hidden Snake
immediately sets alpha to 1 and flees; `rollLoot()` returns exactly `{resource:
"leather", amount: 1}`; Boar's stats are unchanged post-refactor (20 HP, 25 bite dmg,
1-2 boar_meat). Type-check clean, no console errors, world renders normally in
`preview_screenshot`.

### Just finished: Leather re-added to Stone Pickaxe/Stone Club + Workbench-gated recipes hidden until a bench exists

Follow-up requests right after the Workbench (Milestone G) + follow-up-fixes entries
below landed:

- **Leather is back as a cost** on Stone Pickaxe (`wood: 3, stone: 4, leather: 1`, per
  `CLAUDE.md`'s target numbers) and Stone Club (`wood: 3, stone: 2, leather: 1`) — the
  previous session had dropped it because `leather` has no drop source yet, which made
  those two recipes permanently undiscoverable. **User clarified that's intentional**:
  leather-gating both recipes is correct game design; it's fine that they don't show up
  until a leather source (Snake, still unbuilt) exists. Plan file updated — Milestone D
  (Snake) is now called out as **prioritized next** specifically because it's the game's
  only planned leather source (see
  `.claude/plans/let-s-proceed-with-option-crystalline-petal.md`, Milestone D's "Why
  prioritized" note).
- **Workbench-gated recipes are now invisible until a Workbench has ever been placed** —
  previously, `tier >= 1` recipes (Stone Pickaxe, Stone Club) would appear in the
  discovered-recipes list as soon as their *ingredients* were known, even with zero
  workbenches ever placed (they'd just always fail the *craft*-time proximity check).
  Per user request, discovery itself is now gated too: `Crafting.refresh()` gained a
  third `workbenchPlaced: boolean` param — a `tier > 0` recipe is skipped entirely (not
  added to `discoveredIds`) unless `workbenchPlaced` is true, checked *before* the
  existing ingredients/skill checks. `MainScene.hasWorkbenchPlaced()` (new — "has the
  player ever placed one, anywhere," distinct from `isNearWorkbench`'s "currently in
  range") supplies this in `refreshDiscovery()`. `attemptPlaceObject()` now calls
  `refreshDiscovery()` immediately after a successful Workbench placement (previously it
  only refreshed the HUD/inventory) so tier-1 recipes can appear the instant one lands,
  without waiting for the next resource pickup to trigger discovery.

Verified via `preview_eval`: with `wood`/`stone`/`leather` all discovered but no
Workbench placed, `stone_pickaxe`/`stone_club` are absent from
`crafting.discoveredRecipes()`; placing a workbench (both via a direct
`placedObjects.push` and via the real `startPlacement()`/`attemptPlaceObject()` flow)
immediately adds them. Type-check clean, no console errors.

### Just finished: Stone Axe is tool-only + Workbench (Milestone G)

Plan file: `.claude/plans/let-s-proceed-with-option-crystalline-petal.md` (Milestone G,
now done — "fully independent," not blocked on B/C/D). Two related requests in one
session: nerf the axe, then build the Workbench crafting-tier gate it was blocking on
(the notes call for Stone Pickaxe/Stone Club to be workbench-gated).

- **Stone Axe is tool-only again** — the Combat-polish-pass decision to give it
  `weapon: "stone_axe"` (so it doubled as both tool and weapon from one hotbar slot) is
  reverted: `ItemDef.stone_axe` no longer sets `weapon`, its "Damage" tooltip stat is
  gone, and `"stone_axe"` was removed from `WeaponType` (`src/systems/Weapons.ts`) along
  with its damage/cooldown/stamina-cost table entries. Reason: it made the axe a
  no-brainer over the Wood Club (free weapon slot + tool in one item), undermining
  weapon choice. `MainScene.recomputeEquipped()` needed no changes — it already derives
  `equippedWeapon` from `ItemDef.weapon`, so removing the field was sufficient. Wood Club
  stays a normal tier-0 (no workbench) weapon.
- **Workbench, new placeable** (`workbench` in `Items.ts`/`Recipes.ts`, new
  `icon_workbench` texture in `BootScene.ts` — brown tabletop + legs) — tier 0, 6 wood/4
  stone, placed via the exact same placement-mode flow the campfire already uses.
- **Tier enforcement (new, previously just an unused `Recipe.tier` hook):** Stone Pickaxe
  and Stone Club retargeted `tier: 0` → `tier: 1`. `MainScene.isNearWorkbench(x, y,
  radius = WORKBENCH_RANGE)` (100px — looser than `REACH`, "am I near it" not a precise
  click) filters `placedObjects` by a new `image.setData("itemKey", ...)` tag (set in
  `attemptPlaceObject()`) within range. Both `MainScene.craftRecipe()` (belt-and-
  suspenders, mirrors the existing `canAfford` guard) and `CraftingMenu`'s new
  `isCraftable()` helper (`canAfford && (tier === 0 || isNearWorkbench())`, composed at
  the call site — `Crafting.canAfford` stays pure resource-math, unchanged) gate on this.
  `CraftingMenuDeps` gained `isNearWorkbench: () => boolean`, wired from `MainScene` off
  the player's live position.
- **Non-silent feedback** — per the plan, tier-gating never says "tier 1" or a px number;
  the crafting-menu detail panel shows an amber (`#e3b25a`) "Requires a nearby Workbench"
  line, distinct from the existing red "can't afford" resource-line color, whenever
  `recipe.tier >= 1 && !isNearWorkbench()`.

Verified via `preview_eval`: crafting Stone Axe onto the hotbar has `equippedTool:
"stone_axe"` but `equippedWeapon: null`; Stone Pickaxe craft attempt silently no-ops
(inventory count stays 0, no resources deducted) with no workbench placed, then succeeds
(count 1, wood deducted) once a workbench object is placed within range; opening the
crafting menu on the Stone Pickaxe detail panel while far from any workbench renders the
exact "Requires a nearby Workbench" line among the other detail rows. Type-check clean,
no console errors.

**Follow-up fixes (same day, from playtest feedback right after landing):**

- **Live workbench-proximity refresh** — the amber "Requires a nearby Workbench" line and
  the affordable/craftable state only reflected proximity as of when the crafting menu
  was opened; walking into or out of range while it stayed open never updated it.
  `MainScene.update()` now calls a new `updateCraftingMenuWorkbenchProximity()` every
  frame that compares `isNearWorkbench()` against a cached
  `craftingMenuLastNearWorkbench` and only calls `craftingMenu.refresh()` (a full
  re-render) on an actual state change — avoids re-rendering every frame while sitting
  still near/far from a bench.
- **Workbench cost changed to 10 wood** (was 6 wood/4 stone) — no stone cost anymore, per
  user request.
- **Stone Club recipe fixed — it could never actually be discovered.** Its cost included
  `leather`, which has zero drop sources anywhere in the current game (`ResourceType`
  exists, but nothing awards it — `leather`'s intended source, Snake, is still an
  unbuilt milestone). `Crafting.refresh()`'s discovery check requires every cost
  ingredient to have been picked up at least once, so a `leather`-costing recipe was
  permanently locked. Dropped `leather` from the cost, matching the recipe to
  `CLAUDE.md`'s own target numbers for Stone Club (3 wood/2 stone) — `leather` will come
  back into weapon costs once Snake ships a real source for it.

Verified via `preview_eval`: placing a workbench and walking the player in/out of
`WORKBENCH_RANGE` while the crafting menu stays open toggles the amber line and button
affordability live, without needing to close/reopen the menu; Workbench recipe now costs
exactly `{wood: 10}`; discovering `wood`+`stone` (no `leather`) now unlocks Stone Club.
Type-check clean, no console errors.

### Just finished: 16:9 resolution, smoothed biome borders, crafting-menu inventory count

Three small QoL fixes requested in the same session, unrelated to each other:

- **Resolution**: `main.ts`'s Phaser config was a fixed 800x600 canvas from the very first
  session. Bumped the base resolution to 1920x1080 and added `scale: { mode: Phaser.Scale.FIT,
  autoCenter: Phaser.Scale.CENTER_BOTH }` so it scales to fit the browser window
  letterboxed at 16:9 instead of stretching or clipping. Verified safe first — every HUD
  element already anchors off `scene.scale.width/height` rather than hardcoded 800/600
  (`CraftingMenu`, `Tooltip`, `EventLogUI`, `HotbarUI`, `MainScene`'s HP/stamina bars), so
  nothing needed repositioning.
- **Biome border smoothing**: the forest/grassy/creek overlay bake
  (`MainScene.buildBiomeTexture()`) previously filled one flat-colored rectangle per 40px
  `Biome` zone-lookup cell, so boundaries were big jagged 40px staircases. `Biome.ts` now
  exposes `forestWeight(x,y)`/`creekWeight(x,y)` — bilinear interpolation across the same
  underlying zone/creek grids (cell values anchored at cell centers) — and the bake
  supersamples at an 8px stride, blending each overlay's alpha by the interpolated weight
  instead of a hard on/off fill. Same zone data, same gameplay grid/queries
  (`zoneAt`/`isCreekAt` untouched, still hard-edged for spawning logic) — only the render
  bake changed, into a soft multi-cell gradient band that reads as a rounded line.
  `forEachCell()` (now unused) was deleted rather than left dead. Verified visually via
  `preview_screenshot`: forest/grassy boundary is a smooth wavy curve, not a staircase.
- **Crafting menu**: the `*` prefix on already-crafted-at-least-once recipes (`isOwned`)
  is gone — per user feedback it read as visual noise. In its place, the recipe **detail**
  panel (opened by clicking a recipe) now shows `In inventory: X` (via
  `backpack.count(outputKey(recipe))`) for any recipe whose output actually lands in the
  backpack — skipped for placeable recipes (build pieces go into the world, not the
  backpack, so a count would always read 0). `CraftingMenuDeps.isOwned` and its only
  caller (`MainScene.createCraftingMenu`) were removed as dead code rather than left
  unused. Verified via `preview_eval`: crafted a Stone Axe with the detail panel open,
  confirmed the line went from `In inventory: 0` to `In inventory: 1` live.

### Just finished: Trees/boulders no longer solid + Y-depth occlusion fade + no-spawn-in-water fix

Plan file: `.claude/plans/review-the-plan-and-witty-cloud.md`. Resolves the Milestone B
follow-up below by picking the "let enemies (and the player) walk through trees" option
over improving the escape-heading heuristic further, plus adds a Stardew-Valley-style
occlusion fade and fixes a water-spawn bug surfaced in the same discussion.

- **Trees/boulders are no longer solid** (`MainScene.spawnNodes()`): their `scatter()`
  configs flipped `solid: true` → `false`, so they're no longer added to the `solids`
  static group. That group (and its colliders against both `player` and `enemyGroup`)
  stays wired up unchanged — it's just empty for now, reserved for future
  structures/walls/mountains that genuinely should block movement.
- **`Enemy.ts`'s obstacle-avoidance heuristic was deleted outright**, not left inert: the
  ground-truth stuck-detection + randomized near-tangent escape-heading + per-instance
  `escapeSide` mechanism (see the entry below) is gone along with its constants
  (`STUCK_CHECK_INTERVAL_MS`, `STUCK_DISPLACEMENT_PX`, `ESCAPE_DURATION_MS`) and fields.
  With nothing solid left to get stuck on, chase movement is back to a plain "always head
  straight at the player" angle every frame. Verified via `preview_eval` with real physics
  ticks: a Boar forced into `chasing` across the map's densest tree cluster (auto-detected
  the same way prior sessions did) cut a perfectly straight line through it (y didn't
  move at all, x closed monotonically) all the way to melee range — no zigzag.
- **Y-depth sorting (new)**: previously `Player`/`Enemy` were pinned to fixed depths
  (10/9) regardless of Y position specifically so trees could never visually cover them —
  a comment on `Player.ts` said so outright. That's superseded now: `Player` and `Enemy`
  both track `depth = this.y` every frame (in their own `preUpdate()` overrides, so it
  keeps working even while the player is frozen on death), and `ResourceNode` sets a
  one-time `depth = y` at construction for any non-pickup node (trees/boulders — ground
  clutter like branches/rocks/loose drops stays at the default depth, never occluding,
  same as before). The player's equipped-item icon and the enemy HP bar both now track
  `owner.depth + 1` per frame instead of a stale fixed depth, so they stay glued visually
  on top of whichever owns them regardless of the new Y-based scale.
- **Occlusion fade (new)**: `MainScene.updateTreeOcclusion()`, run every frame (both the
  normal path and the death-freeze path, alongside `updateMagnet`/`updateEnemies`), fades
  a tree/boulder's alpha down (to `0.45`) when the player is horizontally overlapping it
  and positioned close enough "above/behind" it (per the new Y-sort) that it would
  otherwise be drawn over them — and back to `1` once they're clear. Deliberately **fades
  the obstruction, not the player/enemy** (explicit user correction during planning — the
  Stardew-style effect people usually mean is "make the thing in front translucent," not
  "make the character translucent"). Implemented as a manual per-frame `Phaser.Math.Linear`
  alpha lerp rather than a Tween, specifically so it can't fight
  `ResourceNode.playHitFeedback()`'s own tweens (shake/tint) on the same object. A
  dedicated `obstacleNodes` array (populated alongside `nodes` in `spawnNodes()`, filtered
  to non-pickup nodes) avoids filtering the full, much larger `nodes` list every frame.
  Verified via `preview_eval`: placing the player directly above a tree dropped its alpha
  to `0.46` within 500ms and raised the player's computed depth below the tree's (matching
  the intended draw order), and moving far away recovered it back to `~1`.
  `preview_screenshot` confirms the visual read — a faded, ghostly tree with the player
  (blue square) fully visible in front of it, distinct from the solid-green unfaded trees
  elsewhere in frame.
- **Bug fix**: pre-placed branches/rocks could previously spawn inside the creek (their
  `scatter()` calls never passed `avoidCreek: true`, unlike trees/boulders which already
  did). Now both do. Verified via `preview_eval`: scanning every pre-placed branch/rock
  against `biome.isCreekAt()` returns zero hits.
- **Line-of-sight-gated aggro was explicitly scoped out** — raised as a discussion point,
  but the user clarified the intended rule is "only things you can't move through block
  line of sight." Since trees/boulders are now non-solid, they don't block LOS either —
  there's nothing to build this session. This becomes relevant automatically once a
  future *solid* obstacle (wall, mountain, etc.) exists; no code was added for it now
  beyond keeping solidity as the single source of truth for both movement-blocking and
  (eventually) LOS-blocking.
- Regression-checked: chop/mine hover/interact (manual `REACH` distance math, not
  collision-based) is unaffected by trees/boulders going non-solid — confirmed via
  `preview_eval` (equipping a stone axe and hovering a tree still resolves
  `[LMB] Chop`). No console errors throughout. Type-check clean.

### Noted, not acted on: Boar's obstacle-avoidance movement feels bad

User feedback after the "stuck between multiple trees" fixes (below): the movement
*works* now (no more freezing/oscillating/losing the player — see those entries), but the
zigzag pattern from the randomized near-tangent escape headings "is kind of trash" to look
at. Two directions raised, **neither implemented**: (1) smooth/improve the avoidance
heuristic itself, or (2) skip the problem entirely by letting Boars **walk through trees**
(exempt tree solids from the enemy collider). Needs a product decision first — logged in
the plan file (`.claude/plans/let-s-proceed-with-option-crystalline-petal.md`, Milestone
B's follow-up note) and in memory, to revisit whenever Milestone B (Boar tuning) is
actually picked up.

### Just finished: default "give up after prolonged failed pursuit" behavior

Formalizes a standing decision (see memory / the note in the Combat
foundation entry below) with concrete numbers, implemented as **reusable
base-class behavior on `Enemy`** (not a Boar-only special case), so future
enemies that subclass `Enemy` can opt into the same mechanism instead of
reimplementing it:

- **`CHASE_GIVEUP_MS` (30s):** if continuous pursuit (`state === "chasing"`)
  runs this long without landing a single attack, the enemy gives up —
  `state` flips to `"idle"` and it enters a **re-aggro immunity window**
  (`enterGivenUpState()`). This is a *pursuit* clock (`pursuitClockStart`),
  distinct from the pre-existing distance-based deaggro
  (`dist > DEAGGRO_RADIUS`) — that one still fires instantly with no
  immunity, since "the target simply walked away" isn't the same as "I've
  been trying and failing for half a minute."
  - The clock resets on `startPursuit()` (fresh chase begins) and
    `markAttackLanded()` (an attack actually connects) — a fight that's
    landing hits never times out, only a fruitless one does.
- **`POST_GIVEUP_IMMUNITY_MS` (5s):** while active, ordinary aggro-radius
  proximity (`canAggro()`) is ignored — the enemy won't re-engage just
  because the player is nearby again, for a short cooldown.
- **Two overrides, both requested explicitly:**
  1. **`CLOSE_REAGGRO_RADIUS` (50px):** proximity tighter than this still
     re-triggers aggro even mid-immunity — the player standing right next to
     a "fled" enemy still wakes it up.
  2. **Being attacked** (`takeHit()`) unconditionally clears
     `aggroImmuneUntil` and, if idle, immediately flips back to `"chasing"`
     — an enemy doesn't pointlessly tank hits without fighting back just
     because it recently gave up.
- Implemented as `protected` fields/helpers (`pursuitClockStart`,
  `aggroImmuneUntil`, `startPursuit`/`markAttackLanded`/`hasGivenUpPursuit`/
  `canAggro`/`enterGivenUpState`) on the `Enemy` base class specifically so a
  future subclass overriding `update()` entirely (per the standing "don't
  assume the 3-state machine is final" decision) can still call the same
  helpers rather than re-deriving the mechanism — the *numbers* stay
  per-enemy-tunable, but the *mechanism* is meant to be a shared default.

Verified via `preview_eval`, all via direct state manipulation rather than
waiting 30 real seconds (reading/writing the "private" TS fields works fine
at runtime): backdating `pursuitClockStart` by 31s while mid-chase (dist
inside aggro, outside melee, so no bite could land and reset the clock)
correctly gave up and set a ~5s immunity window; staying within ordinary
aggro range during that window correctly held `idle`; moving within
`CLOSE_REAGGRO_RADIUS` correctly force-reaggro'd mid-immunity; calling
`takeHit()` on an idle+immune enemy correctly cleared immunity and flipped
to `chasing` synchronously; letting immunity expire naturally (backdating
`aggroImmuneUntil` into the past) correctly allowed normal-range re-aggro
again; landing an actual bite mid-chase correctly reset the clock (confirmed
`pursuitClockStart` recent afterward); and — checked separately with an
explicit clean-slate reset after an earlier test's incidental interaction
briefly muddied one assertion — plain distance-based deaggro (target simply
out of `DEAGGRO_RADIUS`) still sets **no** immunity and re-aggros instantly
on return, unchanged from before this feature. No console errors.

### Just finished: Milestone A — world resize + procedural biome generation

Plan file: `.claude/plans/let-s-proceed-with-option-crystalline-petal.md` (the
"first-biome content pass" — 7 milestones A–G; **only A is done**, B–G are
future sessions). This is the foundation the enemy/spawn milestones (B Boar
tuning, C Gremlin, D Snake) all depend on.

The flat 1280x960 single-grass world is now a **2560x1920 procedurally
generated biome** with three readable sub-areas:

- **`src/systems/Biome.ts`** (new) — framework-light like `Stamina.ts` (only
  `Phaser.Math.RandomDataGenerator`, owns no GameObjects). A coarse **40px
  zone-lookup grid** (deliberately independent of the 32px render `TILE` — it's
  a gameplay/query grid, not a tilemap; 64x48 = 3072 cells, flat arrays).
  Generation: (1) **Voronoi** — 6-10 random seed points each tagged
  forest/grassy, every cell takes its nearest seed's type; (2) **cellular-
  automaton smoothing** (4 passes, double-buffered, flip a cell when ≥5/8
  Moore neighbors disagree) to round the jagged Voronoi edges into organic
  blobs; (3) a separate **random-walk creek** carved edge-to-edge (horizontal
  or vertical, wobbling laterally, tapering 1-2 cell width) into its own
  `boolean[]` grid decoupled from zone type — a cell can be forest AND creek.
  A **degenerate-layout guard** re-rolls (cap 3) if either zone covers <10%.
- **Query API:** `zoneAt(x,y)` and `isCreekAt(x,y)` — both O(1) flat-array
  bounds-checked lookups. `isCreekAt` is deliberately the cheap primitive a
  future **"Wet" status debuff** hooks into (creek is visual-only + walkable
  this pass — no collision, per user decision).
- **Rendering** (`MainScene.buildBiomeTexture()`): a **one-time bake** into a
  single world-sized `RenderTexture` at depth -9 (grass tileSprite dropped to
  -10, all entities stay at default 0 above both). Forest cells get a
  translucent darker-green overlay; grassy cells left showing the base grass;
  creek cells a translucent blue on top. Flat per-cell fills keep the visual
  WYSIWYG with the gameplay grid (no art/logic mismatch). One GameObject total
  — not one per tile.
- **Zone-biased spawning** (`spawnNodes`/`spawnEnemies`): new `pickSpawnPoint(rng,
  preferred, clearRadius, avoidCreek)` helper does **rejection sampling** (cap
  200 attempts, graceful fallback to last draw so a tiny/absent zone can't
  hang). Trees are **dense in forest (70) + sparse in grassy (14)**; boulders
  (18) prefer grassy; branches (40) prefer forest; loose rocks (30) anywhere;
  8 Boars prefer forest. Trees + boulders pass `avoidCreek: true` — the creek
  overlays forest/grassy cells, so without it a "forest" point could land a
  tree on the water (looked wrong). Counts scaled up for the 4x-area world.
- **Follow-up tuning (same session, from playtest feedback):** tree density
  raised and split forest/grassy (was a flat 28 forest-only); trees pulled off
  the creek; Boar **`BITE_DAMAGE` 8 → 25** so ~4 bites kill a full-health (100)
  player — the old 8 (≈12 hits) felt far too weak. Boar count/aggro-radius
  tuning is still **Milestone B**; only the damage was bumped here on request.
- **Unrelated bug fixes bundled in (playtest reports, not part of any
  milestone):** (1) Boars had **no obstacle avoidance** — the chase branch
  aimed straight at the player every frame, so a tree/boulder directly between
  them fully blocked the Boar (it just pushed into the solid forever). Fixed
  with a minimal steer-around: `Enemy` now checks `body.touching.none` (set by
  the existing collider against the solids group) and, if blocked, offsets the
  chase angle by a **fixed per-instance ±60°** (`avoidDir`, randomized once at
  construction so it doesn't flicker between left/right every frame) to slide
  along the obstacle instead of pushing into it. Not real pathfinding — just
  enough to get around a single tree. (2) The Boar sprite never flipped to
  face its direction of travel. Added `applyFacing(vx)` (flips `flipX` once
  horizontal velocity is decisive, i.e. `|vx| > 5`, to avoid flicker near
  zero), called from both the chase-move and idle-wander branches, plus once
  when settling into bite range (faces the player). Verified via `preview_eval`
  with **real physics ticks** (not manual position math): placed a Boar and
  player on opposite sides of a real tree, forced `chasing`, and let 2.5s of
  actual physics run — distance-to-player closed (90px → 78.5px) instead of
  staying frozen, and `flipX` matched the sign of `body.velocity.x`. Ran
  longer (6 more seconds) and confirmed the Boar fully closed the gap, bit the
  player enough times to kill them at the new 25 dmg rate, and the existing
  death/respawn pipeline fired correctly (teleport to world center, health
  reset to 100, no console errors) — full end-to-end proof the chase-around-
  obstacle path actually reaches and kills, not just "unstuck but never
  arrives."
- **Follow-up fix to the fix (same session, from a second playtest report):**
  the reactive per-frame `touching` check above still visibly vibrated left-
  right in place at certain approach angles — losing contact for a single
  frame immediately re-aimed straight at the player, which re-hit the
  obstacle next frame, re-triggering avoidance, forever. Fixed with
  **hysteresis**: a new `avoidUntil` timestamp is (re-)armed to `now +
  AVOID_HOLD_MS` (450ms) every frame contact is detected, and the offset
  heading stays committed until that window fully expires — so it now commits
  to a slide for at least ~450ms past the *last* contact instead of
  re-deciding every frame. Also widened the offset from ±60° to a fixed ±90°
  (`AVOID_TURN`). Also addressed in the same pass: **the Boar only ever
  flipped left/right** — replaced with **full continuous rotation**
  (`applyFacing(vx, vy)` now calls `setRotation(Math.atan2(vy, vx) + Math.PI)`,
  the `+PI` correcting for the texture's nose being drawn pointing left at
  rotation 0), so it now visibly points in its exact direction of travel
  instead of only two discrete states. Skips the rotation update when
  velocity is near-zero so it keeps its last facing while stopped/biting.
  Verified via `preview_eval` sampling real position/velocity/rotation every
  150ms for 3.6s with a Boar and player placed in exact head-on alignment
  across a tree (the reported "stuck" geometry): only **3 heading changes**
  occurred (each held 150-1050ms, not per-frame), rotation values were
  genuine intermediate angles (90°→1°→8°→...→129°→...→166°, not just 0°/180°
  snaps), and the Boar again fully closed the gap and killed the player
  (health reset to 100 + `isDead: false` afterward, matching a completed
  death/respawn cycle) — repeat proof it reliably reaches the target now, not
  just "visibly calmer but still failing to arrive." No console errors.
- **Third round (same session, "still gets stuck between multiple trees"):**
  the touching-flag/hysteresis approach above was fundamentally too easy to
  defeat with 2+ close obstacles — a fixed offset angle could just aim
  straight into a *second* tree, wedging the Boar (frozen, near-zero velocity,
  for 5+ seconds straight in one reproduction). Replaced the whole mechanism
  with **ground-truth stuck detection**: every `STUCK_CHECK_INTERVAL_MS`
  (350ms), compare actual displacement to `STUCK_DISPLACEMENT_PX` (12); if
  too small, commit to a **randomized escape heading** for
  `ESCAPE_DURATION_MS` (900ms) instead of re-deciding every frame. This alone
  fixed the permanent-freeze case but surfaced two follow-on bugs, found via
  `preview_eval` traces with real physics ticks (position/velocity/state
  sampled every 150-300ms) against deliberately placed obstacle clusters
  (found by scanning `s.nodes` for trees within 70-90px of each other) with
  every *other* enemy parked off-map to rule out cross-contamination (an
  earlier trace briefly looked like a "runaway" bug but was actually a
  *different*, untracked Boar independently killing the player mid-test):
  1. **Escape angle range had a net-backward bias.** The first attempt biased
     escape headings to ±(99°-162°) off the direct-to-player line to avoid
     "near-forward" (re-hits the obstacle) — but that whole range has a
     *negative* cosine projection onto the goal direction, meaning every
     single escape attempt had a small backward component. Chained across
     several consecutive stuck-cycles (common against a real 3-4 tree
     cluster), this reliably walked the Boar out past `DEAGGRO_RADIUS` over a
     few seconds. Fixed by narrowing the range to near-tangent, ±(65°-100°) —
     roughly perpendicular to the goal, which slides around an obstacle at
     close to constant distance instead of steadily retreating.
  2. **Deaggro could fire mid-maneuver.** Even with a good escape angle,
     `state` flips `chasing`→`idle` the instant `dist > DEAGGRO_RADIUS`
     (140/200 at the time) on ANY frame — including mid-escape, when the
     Boar is deliberately taking a temporary detour. Getting flipped to idle
     right then abandoned the maneuver permanently (it'd just idle-wander a
     step away from finishing). Fixed by gating the deaggro check on
     `now >= escapeUntil` (only allowed once the current escape commitment
     has fully ended) and widening `DEAGGRO_RADIUS` 200→**280** to give
     chained escape attempts against wide/dense clusters more slack before
     giving up at all.
  3. **Escape side re-randomized on every stuck-trigger**, which zigzagged
     between both sides of a wide obstacle instead of committing to one edge
     (classic wall-following needs a persistent side). Replaced the per-
     trigger coin flip with `escapeSide: 1 | -1`, fixed once per Boar
     instance (mirroring the original `avoidDir` idea from the first
     attempt, but now combined with the corrected tangent-range angle and
     ground-truth stuck detection instead of the flawed `touching`-flag
     reactive version).
  - **Verified** via `preview_eval` against the map's actual densest tree
    clusters (auto-detected by scanning `s.nodes` for trees within 70-90px of
    each other, 2-4 trees per cluster), placing the Boar and player at a fixed
    150px separation through each cluster's centroid (a bbox-edge-relative
    placement was tried first and turned out to be its own test bug — wide
    clusters could push the *initial* separation past `DEAGGRO_RADIUS` before
    any movement happened at all, invalidating that run). Across multiple
    dense (3-4 tree) clusters, the Boar consistently reached melee range
    (worst observed case: ~8.4s against a 4-tree cluster; most resolved in
    2-5s) without freezing, oscillating, or losing the player. Also hit (and
    recovered from) the documented "backgrounded preview tab stalls Phaser's
    loop" quirk mid-testing — resolved per `CLAUDE.md`'s guidance by
    `preview_stop`/`preview_start` fresh rather than trusting a stuck tab's
    output. No console errors. This remains a **heuristic, not real
    pathfinding** (none exists in the project) — it resolves every
    configuration tested during this pass, but isn't a mathematical
    guarantee against arbitrarily adversarial obstacle layouts.
- **Seeded-RNG convention changed:** biome layout, node scatter, and enemy
  scatter are now **three separate session-random generators** (`sessionRng()`,
  seeded off `Date.now()` + `Math.random()`), replacing the old fixed strings
  (`"explore-and-gather"`, `"boar-country"`). Rationale: once the biome layout
  is random per session, a fixed content seed no longer reproduces a coherent
  world anyway, so the reproducibility benefit was already gone.

Verified via `preview_eval` (world 2560x1920 / 64x48 grid; a sampled layout at
forest 0.69 / grassy 0.31 / creek 0.06 with all 28 trees + 8 boars in forest and
all 18 boulders in grassy — zone bias working; **40 fresh random seeds** all
landed in [0.11, 0.86] forest coverage with zero degenerate layouts, confirming
the re-roll guard) plus `preview_screenshot` (winding blue creek, darker forest
vs lighter grassy, entities placed sensibly). Type-check clean, no console
errors.

### Combat polish pass (same day, right after the foundation landed)

Three small enhancements requested after trying the Combat foundation out:

- **Axe doubles as a weapon** — `stone_axe` now carries both `tool:
  "stone_axe"` and `weapon: "stone_axe"` in its `ItemDef` (`src/systems/
  Items.ts`). Since `MainScene.recomputeEquipped()` already derives
  `equippedTool`/`equippedWeapon` independently from the same selected
  hotbar stack, this needed zero scene-level changes — having the axe out
  now lets you both chop trees and fight, no separate weapon slot.
  `WeaponType` (`src/systems/Weapons.ts`) gained a `"stone_axe"` member with
  its own combat numbers (6 dmg/500ms/12 stamina — distinct from its
  `toolDamage` of 1 used for chopping, since those are tuned against very
  different health pools). Pickaxe wasn't extended the same way (not asked
  for), but the same one-line change would do it if wanted.
- **Enemy HP bars** — `Enemy.ts` now owns a thin (22x3px) two-Rectangle bar
  (dark track + red fill, no number) that stays glued above the sprite via
  a `preUpdate()` override — the same "sync every frame regardless of
  MainScene's own update cadence" trick `ResourceNode` already uses for its
  count label. Always visible (not gated on "has taken damage"), destroyed
  alongside the enemy in `playDeathFeedback()`.
- **Floating damage numbers** — `MainScene.spawnDamageNumber(x, y, amount)`
  spawns plain white/black-outline text at the hit enemy's position that
  rises 24px and fades over 700ms, then destroys itself. Called from
  `tryAttackEnemy()` right after `enemy.takeHit(dmg)`. Deliberately just a
  plain number for now — damage types (slash/pierce/blunt) and resistances
  were flagged as a "later" concern, not built; the spot to hook in
  type-based coloring is called out with a comment on `spawnDamageNumber`.

Verified via `preview_eval`: axe equips as both tool and weapon
simultaneously from one hotbar slot; an axe hit deals exactly 6 (not the
tool's chop damage of 1); the HP bar's fill `scaleX` matches
`health/maxHealth` after a real frame tick and its position tracks the
enemy after it moves; the damage-number text object carries the exact
weapon damage dealt and becomes inactive/alpha-0 (destroyed) ~700ms later
(captured by temporarily wrapping `scene.add.text` to grab the exact
object, since a naive "any Text with digit content" filter was catching
the unrelated stamina/HP bar labels); enemy HP bar Rectangles are destroyed
(not leaked) when the enemy dies. Type-check clean, no console errors.

**Balance observation, not acted on:** during testing, a fresh spawn's HP
dropped noticeably within a few real seconds of idling — 6 Boars scattered
in a 1280x960 world with a 140px aggro radius and only a 150px spawn-clear
zone means an enemy can start closing in almost immediately. Not asked to
fix; flagging in case it feels too aggressive once played for real (easy
knobs: bigger clear zone, smaller aggro radius, or fewer Boars).

**User decision on future enemy variety (2026-07-06):** the shipped Boar is
a **proof-of-concept for the player/enemy interaction loop**, not a
template whose exact numbers get copied onto future enemies. As
Gremlin/Snake and later enemies get built, each is expected to tune its own
**aggro radius + aggro condition**, **deaggro time/radius/condition**,
**DPS**, **HP**, **speed**, and **attack methods** independently — including
different *conditions*, not just different numbers on the same logic (e.g.
a future enemy might aggro on line-of-sight or noise instead of flat
radius, or deaggro on a timer instead of radius hysteresis). Implication:
don't generalize `Enemy.ts`'s current constants into one shared config
table too early, and don't assume the current idle/chase/bite three-state
machine is the final shape — revisit the architecture once a second enemy
actually needs different behavioral logic, not just different numbers. See
the plan file's section 19 for the fuller note.

### Just finished: Combat foundation (roadmap item 4, scoped down)

Plan file: `.claude/plans/polymorphic-sparking-lynx.md`.

The user's first-biome design notes (folded into `CLAUDE.md`'s "First biome
— content notes" section) describe a much bigger combat roster than one
pass could reasonably cover — 3 enemies with distinct AI, a ranged
Slingshot/ammo system, Workbench gating. Asked to scope it down, the user
picked **"Foundation + one enemy"**: build the real combat systems (health,
facing, equipped-weapon visuals, melee equip, death/respawn) against a
single simplified enemy, leaving Gremlin/Snake/ranged/ambush/charge/
fire-fear/Workbench as explicit follow-ups.

- **`src/systems/Health.ts`** (new) — a Phaser-free pool adapted from
  `Stamina.ts`'s shape but not copied verbatim: `takeDamage`/`heal`/`reset`/
  `isDead`, no passive regen (that's deferred to a future food/rest system).
- **Facing direction** (`src/entities/Player.ts`) — the player finally
  tracks a 4-way `Facing` (`up`/`down`/`left`/`right`), persisting while
  idle, vertical winning ties on diagonal input. Widened `PlayerFrameResult`
  to report it every frame.
- **Equipped-item-on-sprite visual** — long deferred (per `CLAUDE.md`,
  pending "a real facing/weapon-attachment system"). Resolved with zero new
  art pipeline: `Player` attaches a small child `Image` reusing the
  item's existing 24x24 icon texture (the same ones already baked for
  tooltips), offset 16px from the player's center in the current facing
  direction, hidden when nothing's equipped. `MainScene.recomputeEquipped()`
  is still the single place equip state is derived — it now also drives
  this icon (`player.setEquippedIcon(...)`), and calls
  `player.syncEquippedIconPosition()` every frame (even during the death
  freeze) so it never lags a moved/teleported player.
- **Melee weapon equip** (`src/systems/Weapons.ts`, new) — `WeaponType =
  "wood_club" | "stone_club"` plus damage/cooldown/stamina-cost tables,
  exactly mirroring `ResourceNode.ts`'s existing tool-table pattern.
  `ItemDef` gained a `weapon?: WeaponType` field alongside `tool?: ToolType`;
  `wood_club`/`stone_club` (previously inert item stubs with display-only
  "Damage" tooltip text) now actually equip via the hotbar, the same way
  tools already did — no parallel equip path.
- **`src/entities/Enemy.ts`** (new) — a single enemy for this pass, "Boar":
  an Arcade-physics sprite (unlike the non-physics `ResourceNode`) with a
  simple idle-wander / chase state machine (aggro 140px, deaggro 200px —
  hysteresis to avoid boundary flicker) and a cooldown-gated melee bite (8
  dmg, 1s cooldown). `takeHit()`/hit feedback (shake + white-to-red tint
  lerp) mirror `ResourceNode`'s feel; `playDeathFeedback()` fades and
  destroys, then hands control back to `MainScene` to award loot. No charge
  attack, no fire-fear, no ranged attack — explicitly out of scope.
- **Attack reuses the existing hover/interact model**, not a parallel one —
  `updateHover()` now tracks whichever of a `ResourceNode` or an `Enemy` is
  closest to the cursor (only one prompt ever shows), gated the same way
  tool-kind gating already works: no weapon equipped → show nothing; weapon
  equipped + in reach → `[LMB] Attack <name>`. `tryInteract()` dispatches to
  a new `tryAttackEnemy()` when an enemy is hovered, using the identical
  cooldown/stamina-afford/silent-fail guard shape `tryInteract()`'s tool
  branch already used.
- **Enemy death loot** reuses the existing loose-drop/magnet pipeline
  unchanged rather than instant-crediting the backpack — `ResourceType`
  widened to include `boar_meat` (same trivial-extension precedent as
  `leather`), dropped via `spawnLooseDrop("boar_meat", ...)` at the kill
  position.
- **Player death & respawn** — a new `Health` instance on `MainScene`,
  a red HP bar stacked directly above the stamina bar (same
  `hotbarUI.top`-anchored construction pattern, 28px higher). On death:
  freezes the player (skips `Player.update()` entirely, though ambient
  systems — stamina tick, magnet, enemy AI, equipped-icon sync — keep
  running so the world doesn't visually pause too), toasts "You died...",
  and after a 2s delay teleports back to world-center spawn, refills health,
  and grants a 1.5s post-respawn invulnerability window. New `"combat"`
  `LogKind` (red-ish) added to `EventLog`/`EventLogUI` for all of this
  rather than overloading `"info"`.
- 6 Boars scattered map-wide via the same seeded-RNG scatter pattern
  `spawnNodes()` already used (slightly larger clear zone around player
  spawn); a physics collider keeps player/enemy bodies from passing through
  each other, but the actual bite/attack range check stays manual distance
  math against a tight `MELEE_RANGE` (28px) — consistent with how `REACH`
  already works, not a Phaser overlap callback.

Verified via `preview_eval` (facing tracking + persistence while idle;
equipped-icon visibility/texture/position-by-facing and hiding on an empty
slot; tool/weapon equip mutual exclusivity; enemy idle/chase state
transitions and velocity direction; melee attack cooldown and stamina-
afford gating both silently blocking extra hits; a full kill draining
exact per-hit damage, removing the enemy, logging "Defeated Boar", and
crediting `boar_meat` to the backpack via the existing magnet pipeline;
one-shot player death freezing movement while leaving enemy AI running;
automatic respawn via the real delayed-call timer resetting position/
health and opening the invulnerability window) plus `preview_screenshot`/
`preview_inspect` for the HP bar (exactly 28px above the stamina bar,
matching X/width) and the on-player equipped-icon rendering. Regression-
checked the existing chop/mine flow and confirmed hovering a node vs. an
enemy always resolves to exactly one prompt (whichever is closer). Type-
check clean, no console errors.

### Follow-up tuning pass on the stamina bar/panels (same day)

Right after the stamina milestone landed, the user requested a round of
polish based on actually seeing it in the preview:

- **Bar visuals** — was a bright cyan 220x14 bar with a color-shift-on-
  deplete effect; now a small (76x20, ~1.5-2x a hotbar slot) fixed dark
  goldenrod (`0xb8860b`) bar with no color changes on deplete/regen, and a
  centered numeric text label (`staminaBarText`) showing the rounded current
  value (e.g. `"72"`).
- **Event log relocated** — was bottom-right, expanded by default, growing
  upward. Now stacks directly under the top-left Keybinds panel (both
  `PANEL_X = 12`, same width), defaults **collapsed** like Keybinds, and
  grows downward. This was ahead of the bottom-center HUD area (hotbar +
  stamina bar) getting busier as more bars land there.
  - **Real coupling needed, not just a one-time position**: since
    `KeybindsUI` can expand/collapse independently, `EventLogUI`'s top
    position has to track it live, not just be computed once at
    construction — the first pass (`topY` set once in the constructor) left
    the Log panel overlapped whenever Keybinds was expanded after Log was
    already positioned, caught via `preview_screenshot` during verification.
    Fixed with `KeybindsUI(scene, binds, onToggle?)` — an `onToggle` callback
    fired after every collapse toggle — wired in `MainScene` to call the new
    `EventLogUI.setTopY(keybindsUI.bottom + 8)`, so Log always repositions
    the instant Keybinds' height changes.
- **Stamina usage bumped up** — the shipped numbers (`SPRINT_DRAIN_PER_SEC:
  18`, `DASH_STAMINA_COST: 15`, `toolStaminaCost: 6`) felt too cheap. Now
  `SPRINT_DRAIN_PER_SEC: 33` (a full 100-stamina bar drains from continuous
  sprint in ~3s — matches the user's explicit target), `DASH_STAMINA_COST:
  25` (4 dashes/full bar), `toolStaminaCost: 12` (both stone tools). Regen
  (20/s, 800ms delay) unchanged — draining faster than it refills is
  intentional.
  - **Forward-looking note left as a comment** (`src/systems/Stamina.ts`,
    next to `MAX_STAMINA`): a future food system will scale max stamina down
    as food depletes, with 0 food intended to reach roughly this same
    "~3s full sprint" feel on a much smaller pool. Not implemented — no food
    system exists yet — just documented so the eventual hookup target is
    clear.

Verified via `preview_eval` (sprint draining the full bar in ~3.1s real
time, confirmed via `performance.now()` timing, with the bar's text reading
`"0"` and speed reverted to base at the end) and `preview_screenshot`
(bar size/color/number, Log correctly stacked under both collapsed and
*expanded* Keybinds — the overlap bug was caught this way before the
`onToggle` fix). Type-check clean, no console errors.

### Just finished: Stamina, sprint, dash (roadmap item 3)

Plan file: `.claude/plans/read-the-plan-from-happy-ripple.md` (was only in the
global plans dir at the time; recovered and copied into the repo later — see
CLAUDE.md's "Plans must be committed in-repo" convention).

The player now has a stamina pool — the first player stat/resource bar in
the game (no health system exists yet either):

- **`src/systems/Stamina.ts`** (new) — a small Phaser-free state class:
  `current`/`max`, `canAfford(amount)`, `spend(amount)` (fails silently if
  unaffordable, re-arms a regen delay on success), and `tick(delta)` (called
  every frame from `MainScene.update()`, regenerates after the delay elapses).
  100 max, ~20/s regen, an 800ms delay after any spend before regen resumes.
- **Sprint** — hold **Shift** while moving multiplies speed by 1.6x and
  drains stamina at 18/s. Gated on affording *that frame's* drain cost
  (not just "stamina > 0") — an early version used a `> 0` check and a bug
  surfaced during `preview_eval` testing: a partial remainder too small to
  spend would sit there regenerating just enough to keep passing a `>0`
  check forever, so sprint's speed multiplier never actually turned off
  under sustained holding. Fixed by checking `canAfford(costThisFrame)`
  instead, matching how dash is already gated.
- **Dash** — **Spacebar** while holding a movement direction triggers a
  quick 340px/s burst for 160ms, spending 15 stamina and starting its own
  600ms cooldown (independent of stamina, so it can't be chain-spammed even
  with a full pool). `Player.update()` was widened to
  `update(delta, canSprint, canDash): PlayerFrameResult` — `MainScene`
  computes both stamina gates and reads back `sprinting`/`dashStarted` to
  know what to spend, rather than `Player` reaching into scene state
  directly. Mid-dash, `Player.update()` returns early and lets Arcade
  physics carry the velocity set when the dash started, ignoring normal
  input until the burst window elapses.
  - **This replaced an original "cosmetic hop jump on Spacebar" plan.**
    Jump was scoped first (matching the older roadmap wording), but the
    user corrected it mid-planning: Spacebar should be a dash/dodge instead,
    with no jump concept at all. Removed before any jump code was written.
  - No i-frames/damage-avoidance from dash — deliberately deferred, since
    there's no health/damage system yet to interact with (Combat, roadmap
    item 4).
- **Tool-swing stamina cost** — `toolStaminaCost(tool)` in
  `src/entities/ResourceNode.ts`, a third `Record<ToolType, number>` table
  alongside the existing `toolDamage`/`toolCooldownMs` (both stone tools:
  6 stamina/hit). `MainScene.tryInteract()` checks affordability right after
  the existing hit-rate cooldown check and before updating
  `lastToolHitAt` — an exhausted swing attempt doesn't burn the cooldown
  either, so the very next swing can land the instant stamina recovers
  enough, without also waiting out an unrelated cooldown window.
- **HUD stamina bar** — centered directly above the hotbar (two overlapping
  `Rectangle`s: a dark track + a cyan fill that scales/recolors). Per the
  user, this is meant to anchor a future vertical stack — HP is planned to
  land above it once Combat ships, maybe a mana-like bar after that. Added a
  `top` getter to `HotbarUI` (exposing its existing private `originY`) so
  the bar (and future bars) can anchor without duplicating the hotbar's
  centering math. `KeybindsUI` gained two new lines ("Sprint: Hold Shift",
  "Dash: Space (while moving)") but was otherwise untouched.

Verified via `preview_eval`: sprint's speed multiplier (1.6x) and stamina
drain while Shift+movement held (via direct `Key.isDown` manipulation, since
Phaser's `Key` objects don't respond to synthetic property writes for
`JustDown` — that needs `_justDown` set directly, which was used for the
dash tests instead); sprint hard-blocking once a frame's cost is
unaffordable (post-fix); dash's velocity spike to 340, the mid-dash lockout,
cooldown blocking a too-soon re-dash and allowing one after 600ms elapses
(all via a single self-contained `preview_eval` call with real `setTimeout`
waits, to avoid inter-tool-call latency confusing the cooldown math); dash
silently failing when unaffordable; tool swings costing exactly
`toolStaminaCost` and being silently blocked (no `takeHit`, no negative
stamina) when exhausted; and the regen-delay math directly against the
`Stamina` class. Plus `preview_screenshot` for the bar's placement/fill and
the expanded Keybinds panel. Type-check clean, no console errors.

### Small fix: collapsible Keybinds panel

The top-left "Move: WASD..." line was a single always-visible line that would
only keep growing as more binds get added. Replaced with **`src/ui/KeybindsUI.ts`**
(new) — a collapsible top-left panel mirroring `EventLogUI`'s header
collapse/expand mechanics (click header to toggle `[+]`/`[-]`), but simpler:
no scrolling/toasts, just a static list of bind strings passed in once from
`MainScene.createHud()`. Starts **collapsed** by default (the point of the
change was to declutter). Wired into `pointerOverHud()` and the wheel-routing
check alongside `eventLogUI` so clicks/scroll over the panel don't leak
through to world interaction or hotbar cycling.

Verified via `preview_eval` (real simulated mouse events toggling collapse
state, `isPointerOver` gating wheel-driven hotbar cycling while expanded) plus
`preview_screenshot` for collapsed/expanded layout. Type-check clean, no
console errors.

## Where things stand

Core loop works: move (WASD/arrows, sprint on Shift, dash on Spacebar — both
stamina-gated, see below), gather (branches/rocks free; trees/boulders need
the right tool kind equipped and now take multiple hits, see below), craft
(T), manage inventory/hotbar (Tab, 1-9, scroll wheel), equip tools via the
hotbar. Recipe discovery is gated by "have you picked up the ingredients" +
skill level; unlocks announce themselves via a toast + persistent event log
(bottom-right, collapsible). Placeable items (currently just the campfire)
skip the backpack entirely — crafting one enters a placement mode instead.
Chopping/mining a tree/boulder now explodes its yield into scattered loose
pieces on the ground instead of crediting the backpack instantly (see below),
with an auto-pickup magnet (toggle: `V`) to collect them. A stamina bar
(centered above the hotbar) gates sprint/dash/tool-swings and regenerates
after a short delay. Combat exists in foundation form: equip a club via the
hotbar (same flow as tools) to fight Boars scattered around the world —
`[LMB] Attack` when one's hovered in reach, same prompt-gating convention as
chop/mine. A red HP bar (above the stamina bar) tracks player health; dying
freezes the player briefly, then respawns them at world center with full
health and a short invulnerability window. The equipped tool/weapon now
shows as a small icon on the player, offset toward whichever direction
they're last facing.

### Just finished: Milestone 3 — loose world drops + magnet auto-pickup

Plan file: `.claude/plans/bright-prancing-starlight.md`.

Depleting a tree/boulder no longer credits the backpack directly — it
"explodes" into 2-4 scattered loose pieces that must be collected:

- **`ResourceNode`** (`src/entities/ResourceNode.ts`): `amount` is now
  mutable (stacks can grow via consolidation), plus new fields `isDrop`
  (marks a spawned piece vs. a pre-placed branch/rock) and `exploding`
  (true while the spawn-scatter tween runs, so the magnet doesn't fight it
  over x/y). `setAmount()` keeps a small `x<N>` world-space count label
  (only shown when >1) glued to the sprite via a `preUpdate` override — this
  is what makes the label track through the explode tween, magnet pull, and
  bob without extra bookkeeping. `startBob()` is a slow yoyo'd vertical
  tween, used only on landed drop pieces, that reads as "loose item" (the
  brainstormed alternative to a blink — chosen over blink/glow for being
  less flickery/noisy).
- **`MainScene.spawnLooseDrop()`** splits a depleted node's yield into 2-4
  pieces, each a `ResourceNode` with `action:"pickup", loose:true,
  isDrop:true`, tweened outward from the origin to a random point 20-45px
  away (`Cubic.easeOut`, 250ms — the "explode"). On landing, each piece runs
  `consolidateDrop()`: if another non-exploding piece of the same resource
  sits within 28px, it merges in (`setAmount`) and destroys itself, so
  repeated fells in one area collapse into fewer stacks instead of
  carpeting the ground.
- **`MainScene.updateMagnet()`** runs every frame (`update()` now takes
  Phaser's `delta`), pulling any `isDrop && loose && !exploding` piece
  within `MAGNET_RADIUS` (100px) toward the player at `MAGNET_SPEED`
  (220px/s), collecting it into the backpack once within 14px. Toggled with
  **`V`** (`magnetEnabled`, default on) — logs an event-log entry on toggle,
  and the binding is listed in the top-left controls line. Purely
  radius-gated per frame (deliberately no "lock on"/persistence, per user
  correction) — a piece stops dead the instant the player leaves
  `MAGNET_RADIUS`, and resumes/fully closes the gap the instant they're back
  inside it.
- **Bug fix during this milestone**: pulled pieces appeared to trail the
  player at a fixed offset instead of reaching them. Root cause was the idle
  `startBob()` tween — its yoyo/repeat-forever `y` animation kept
  overwriting the magnet's manual `node.y` write every frame, fighting for
  the property. Fixed by `this.tweens.killTweensOf(node)` the moment a piece
  enters magnet range, before applying the pull.
- **Follow-up bug fix (freeze/perf-death during extended play)**:
  `startBob()`'s `repeat: -1` tween never completes on its own, and nothing
  was stopping it when the piece it targeted got destroyed — either merged
  away by `consolidateDrop`, or clicked mid-explosion (pieces are
  hoverable/clickable immediately, even while still `exploding`). Each such
  piece left a tween permanently animating a destroyed sprite; over a play
  session of repeatedly breaking rocks/trees these piled up unbounded and
  dragged the frame rate down to what looked like a stuck/crashed game.
  Fixed by killing a node's own tweens in `ResourceNode.deplete()`, plus a
  `node.depleted` guard in the explosion tween's `onComplete` so an
  already-collected piece doesn't get a *new* bob tween started on it after
  the fact. Verified via `preview_eval`: depleting every boulder/tree in the
  world while never letting the magnet collect them (worst case) left tween
  count matching live-piece count exactly (no orphans), and fully collecting
  everything afterward left zero leaked node tweens.
- **Revised from the original plan**: pre-placed branches/rocks are now
  *both* `loose:false` — always manual-click, never magnet-eligible. Only
  spawned drop pieces are loose. `CLAUDE.md`'s "loose flag" bullet was
  updated to match (the old text said branches were loose; superseded).
- **Unrelated fix bundled in**: `vite.config.ts` hardcoded port 5173, which
  meant the Preview tooling's `autoPort` fallback (used when another
  session's dev server already holds 5173) couldn't actually redirect Vite
  to a free port. Now reads `process.env.PORT` (falls back to 5173), and
  `.claude/launch.json` no longer hardcodes `--port`/`port` and sets
  `autoPort: true` — future sessions running alongside another chat's `dev`
  server will just work instead of hitting a blank/unreachable preview.

Verified via `preview_eval` (explode scatter into multiple pieces summing to
the original amount, landing-site consolidation merging pieces and their
count labels, magnet pulling a landed piece in and crediting the backpack
while `exploding` pieces and pre-placed branches/rocks are correctly
untouched, the `V` toggle stopping/resuming the pull and logging both
transitions) plus `preview_screenshot` for the scatter/label rendering.
Type-check clean, no console errors.

### Previously: Move speed halved + tool hit-rate cooldown

Two small follow-ups requested right after M2 landed (M2's multi-hit change
made LMB-spam farming worse, since nothing capped how fast repeated hits
could land):

- **`Player.ts`**: `SPEED` halved (190 → 95 px/s) — movement felt too fast.
- **Tool hit cooldown**: `toolCooldownMs(tool)` (`src/entities/ResourceNode.ts`),
  same `Record<ToolType, number>` pattern as `toolDamage`/`toolKind`
  (`stone_axe`/`stone_pickaxe` both `500`ms for now). `MainScene.tryInteract()`
  tracks `lastToolHitAt` (via `this.time.now`) and bails out silently (no
  swing, no `takeHit`) if a chop/mine attempt comes in before the cooldown
  elapses — spamming LMB now can't out-farm the tool's swing rate. Pickups are
  unaffected (single-click, no cooldown, same as before).
- This is the first piece of "attack speed" as a per-tool/weapon concept;
  future tiers/weapons can tune their own cooldown independently, and this is
  the hook combat (roadmap item 4) will reuse for weapon attack speed.

Verified via `preview_eval`: first hit registers, an immediate second click on
the same node is blocked (health unchanged), and after waiting past the
cooldown window a hit lands again. Type-check clean, no console errors.

### Previously: Resource node health / multi-hit (Milestone 2)

Plan file: `.claude/plans/radiant-gliding-seal.md`.

Trees and boulders now take 3 hits to fell instead of one:

- **`ResourceNode`** (`src/entities/ResourceNode.ts`) gained `health`/
  `maxHealth` (set via a new `health` field on `ResourceNodeConfig`) and a
  `takeHit(damage)` method — decrements health, plays shake+tint feedback,
  returns `true` only once health hits 0. The resource `amount` is awarded
  **only on the depleting hit**, not per-hit — no partial-yield/overflow
  logic needed, matches loose-drops still being deferred to M3.
- **Tool damage** is a new `toolDamage(tool)` function next to the existing
  `toolKind()`/`requiredKind()` pattern, backed by a `Record<ToolType, number>`
  (`stone_axe`/`stone_pickaxe` both deal `1` for now) — future higher tiers
  return a bigger number and fell nodes in fewer hits without any node-data
  changes.
- **Hit feedback** lives entirely in `ResourceNode.playHitFeedback()`: a quick
  side-to-side shake tween plus a tint interpolated from white toward a
  darker "damaged" shade as health drops — the first shake/tint-style effect
  in the codebase (tween conventions follow `EventLogUI.ts`'s established
  style: short durations, named eases, cleanup via callbacks).
- **`Player.playSwing()`** (`src/entities/Player.ts`) is a quick rotate-punch
  tween (angle 0→25→0) played on every successful chop/mine hit — a stand-in
  for a real swing animation since there's no facing-direction or
  weapon-sprite system yet; kills any in-flight swing tween first so rapid
  clicks can't leave the player stuck mid-rotation.
- Pickups (branch/rock) are untouched — `health: 1`, but they never go
  through `takeHit`, so behavior is identical to before.
- Trees/boulders that survive a hit stay in `this.nodes` and keep showing
  their hover prompt; nothing is removed/credited until the depleting hit.

Verified via `preview_eval` (health decrementing per hit, resource awarded
only on the 3rd/depleting hit for both chop and mine, node correctly removed
from `nodes` only when depleted, rapid back-to-back hits leaving no stuck
tween/angle state) plus a `preview_screenshot` for the tint darkening. Type-
check clean, no console errors.

### Previously: Placement mode for build/placeable items

Plan file: `.claude/plans/ancient-painting-petal.md`.

Items flagged `placeable: true` in `Items.ts` (currently just `campfire`) no
longer land in the backpack when crafted. Instead:

- The crafting menu's button reads **"Place"** instead of "Craft" for these
  recipes (`isPlaceableRecipe()` in `Recipes.ts`, checked in `CraftingMenu.ts`).
  Clicking it closes the crafting menu and enters **placement mode**
  (`MainScene.startPlacement`) — no cost is deducted yet.
- A semi-transparent ghost preview follows the cursor, clamped to
  `PLACEMENT_RADIUS = REACH * 1.25` (80px) of the player (recomputed live each
  frame, so walking repositions the radius). A small hint —
  `[LMB] Place <item>   [RMB] Cancel` — shows under the top-left controls
  line (`placementHintText`, 12px, `(12, 30)` — deliberately NOT the shared
  bottom-right gather-prompt text, and deliberately not overlapping the
  hotbar or the `[T] Craft` tab).
- **LMB** (`attemptPlaceObject`) deducts the recipe cost only at that moment,
  spawns a plain world image at the ghost's position, and **re-arms**
  placement mode immediately so the next one can be placed without reopening
  the crafting menu — this loop is the "ask to place another" behavior,
  expressed as the persisting prompt rather than a separate confirm dialog.
  Running out of materials mid-loop auto-cancels with an event-log message.
- **RMB**, **Escape**, or **Tab** cancel placement mode outright — free,
  since nothing is spent until a successful LMB.
- A same-click double-fire bug (Phaser fires both the "Place" button's own
  `pointerdown` and the scene-wide generic `pointerdown` for one click, which
  was placing the object right where "Place" was clicked) is fixed via a
  one-shot `suppressNextPointerdown` flag consumed by the scene's global
  pointerdown handler.
- No loose-world-drop system was needed for this — since materials are only
  spent on a successful LMB, a cancelled placement has nothing to destroy.
  That concept is still deferred to Milestone 3 (or to whenever destroying
  *already-placed* build pieces becomes a feature).
- Placed objects are currently just visual (`this.add.image`, no physics
  body, no interaction) — intentionally minimal; a real placed-object entity
  can come later alongside the destroy-for-pieces feature.

Verified via `preview_eval` (radius clamping, cost-only-on-LMB, free RMB
cancel, Escape/Tab cancelling instead of opening menus, the double-click fix
via simulated real Phaser pointer events, and clicking "Place" through the
actual crafting-menu UI). Type-check clean, no console errors.

### Previously: Milestone 1 of the inventory-overhaul plan, plus a UI polish pass

Plan file: `.claude/plans/bug-i-can-drag-twinkling-engelbart.md` (3 milestones;
M1 done, M2/M3 not started).

**M1** replaced the old derived-list item model (`Inventory` counts + `ownedTools`
Set + `craftedItemCounts` Map) with a single unified slot-based model:

- **`src/systems/ItemContainer.ts`** (new) — fixed-size array of `{key, count}`
  stacks. `add`/`hasRoomFor`/`count`/`removeCount`/`findAssignable`, plus the
  free function `moveSlot(src, si, dst, di)` that merges-or-swaps. This one
  primitive backs every drag, rearrange, and hotbar assignment.
- **Backpack** (`MainScene.backpack`) and **Hotbar** (`Hotbar.container`) are
  each an `ItemContainer`. Resources (wood/stone/leather) are now regular
  stackable items living in the grid (max 99), not a separate counter.
- **`Items.ts`** — every item def now carries `maxStack` (99, or 1 for
  tools/weapons) and `hotbarable` (false for shishkabob/campfire).
- Drag is scene-owned (`MainScene.beginItemDrag/resolveItemDrag`), not
  per-widget — this is what lets items move backpack<->hotbar and rearrange
  within either. Right-click quick-moves via `quickMoveItem`.
- Mouse wheel cycles the hotbar 1-9 (wraps both directions) unless the pointer
  is over the event log, which scrolls its own history instead
  (`EventLogUI.isPointerOver`).

This fixed both reported bugs (item duplicating into multiple slots on
drag/right-click; crafting a 2nd tool eating resources with no result) as a
side effect of giving every item a single home slot instead of a derived
count.

**Then a follow-up UI polish session** cleaned up rough edges left by M1:

- Removed the top-left `Wood/Stone/Tool` HUD text (redundant once items live
  visibly in the grid/hotbar) and moved the "Move: WASD..." controls line up
  to `(12, 10)` now that nothing sits above it.
- **`src/ui/Tooltip.ts`** (new) — extracted the item-info popup (name,
  description, stats) that `InventoryMenu` already had into a shared class
  with two placement modes: `"right"` (flips left near the screen edge — used
  by the backpack grid) and `"above"` (opens upward, centered — used by the
  hotbar, which sits at the very bottom of the screen). `HotbarUI` now shows
  the same hover tooltip the backpack grid does.
- **`InventoryMenu`** reworked into a horizontal layout — backpack grid grown
  from 5x4 (20 slots) to **6x6 (36 slots)** on the left, with the 3x3
  equipment grid repositioned to its right (was stacked above it), using the
  vertical space freed up by that move.
- **Crafting menu** recipe rows now show the item's icon next to its name
  (`[icon] Stone Axe`). `outputKey(recipe)` (tool/itemId -> item key) moved
  from `MainScene.ts` into `Recipes.ts` as a shared export so both
  `MainScene` and `CraftingMenu` use one implementation.
- **Recipe-unlock toasts** redesigned: previously a center-screen toast shared
  with level-up/info messages; now recipe unlocks get their own small
  icon+text card that slides in from the right edge, lands in a stack
  top-right (below the `[T] Craft` button, clear of the bottom-right event
  log), holds, then fades. Multiple unlocks queue and stagger in one at a
  time (~200ms apart) instead of popping in simultaneously. Level-up/info
  toasts are unchanged (still center-screen via `EventLogUI.showToast`).

**Verified via `preview_eval` + `preview_screenshot`** — direct scene-method
calls to inspect state precisely (container/text object positions, contents,
tween state via an in-page `await new Promise(setTimeout...)` before
inspecting), plus visual screenshots for layout confirmation. Type-check
clean throughout. No console errors.

### Up next

Combat (roadmap item 4) now exists in **foundation** form (see "Just
finished" above) — health/damage, facing, equipped-item visuals, melee
weapon equip, one enemy (Boar), death & respawn. Per `CLAUDE.md` convention
(one milestone/feature per session), the follow-ups below should each start
in a fresh chat session rather than continuing this one.

**Explicitly deferred from this pass (not forgotten — see `CLAUDE.md`'s
"First biome — content notes" for the fuller design):**

- **Gremlin** (ranged rock-throw + melee claw, keep-distance AI) and
  **Snake** (hidden-in-grass ambush) — the other two first-biome enemies.
  Gremlin's ranged attack means this is also where the game's first
  projectile system needs to get built.
- **Boar's charge attack + fear-of-fire** (flees near a torch/campfire) —
  the shipped Boar this pass is bite-only/no-fear, a deliberate
  simplification.
- **Slingshot + Slingshot Pellets** — first ranged *weapon* + first
  consumable-ammo concept.
- **Workbench crafting-tier gate** — `Recipe.tier` still exists as the
  unused hook for this (see `Recipes.ts`); nothing enforces it yet.
- **Dash i-frames** — dash is still a pure movement burst with no
  invulnerability window. Now that Health exists, this is unblocked
  whenever it's wanted; just not bundled into this pass.
- **Cooking/food** (Empty Shishkabob + raw meat → cooked over a campfire) —
  no rest/food/hunger system exists yet; `boar_meat` currently just sits in
  the backpack as a plain stackable with no use.
- Combat XP/skill (`Skills.ts` still only has `axes`/`pickaxes`) — ties into
  roadmap item 5 (Progression) more than item 4.

### Known rough edges / deferred (see plan's "Out of scope" section)

Carry weight, tool durability, craft-quantity selector, stacking exceptions
beyond durability — all intentionally deferred, not forgotten. The magnet
(M3) has no carry-weight gating yet since that system doesn't exist. Placed
objects (campfire) have no collision/overlap checks and can't be destroyed
yet — deferred until a destroy-for-pieces feature exists, which can now
reuse the M3 loose-drop system for the resulting pieces.

### Previously: M-WC — Gremlin War Camp (altar POI upgrade + hints)

Next milestone in the locked roguelike meta-loop build order
(`.claude/plans/roguelike-metaloop-master-plan.md`; detailed plan:
`.claude/plans/snug-leaping-mochi.md`). Built on Sonnet — content + layout on the existing
altar/shack/camp-spawn, `MinimapUI.revealLandmark`, and M-DN night-light systems, no new
mechanic. Promotes the lone Boss Altar into a **walled Gremlin War Camp** so it reads as a
*place*. Two locked decisions this session (the user): shacks stay scattered but cluster denser
near the camp (2→3), and the camp glows at night as a navigation hint.

- **`MainScene.spawnWarCamp()`** (new; called after `spawnAltarDensity()` in `create()`,
  guard-returns if `altarPosition` is null, deterministic via `sessionRng`) lays out
  decoration around the altar. All props are plain `scene.add.image(...).setDepth(y)` —
  non-solid + Y-sorted like every other world structure, and untracked (auto-destroyed on
  `scene.restart`) except braziers:
  - **Palisade ring** — stakes every ~14° at ~230px radius (±8px jitter), **skipping a ~55°
    entrance-gate arc** whose facing points toward world center (`Phaser.Math.Angle.Between` +
    `Angle.Wrap` shortest-angular-distance test), so the player walks in the gate. Verified:
    22 stakes placed out of 26 candidate positions (the ~4 in the gate arc correctly skipped).
  - **Banners ×4 / totems ×2** scattered inside the camp; **braziers ×3** (two flanking the
    gate, one deep in) whose world positions are pushed to a new `campLightPoints` field.
  - **Breadcrumb trail** — 2 sparse outer `gremlin_camp_prop` bands (500–750px ×6, 750–1050px
    ×4) extending the existing 3 inner bands, so clutter increases toward the camp. Enemy
    counts unchanged (locked decision 7 — prefer a bigger world over more enemies).
- **Four new placeholder textures** in `BootScene.ts` (`palisade_stake` 12×26, `gremlin_banner`
  16×30, `war_totem` 18×38, `camp_brazier` 14×22), same crude-pixel style / gremlin palette;
  the brazier's flame matches the altar's orange (`0xe8862c`).
- **Braziers glow at night** — `collectLights()` gained a loop over `campLightPoints` pushing a
  `POI_LIGHT_RADIUS` light per on-screen brazier (reuses the existing `onScreen`/`toScreen`
  helpers, no new lighting code). The M-DN light-mask does the rest. Verified: with the camera
  on the camp and the clock forced to deep night, `collectLights()` returned 7 lights (altar +
  3 braziers + nearby shacks) and a screenshot shows a warm light pool over the camp against
  the dark forest.
- **Shacks cluster denser** — `SHACK_NEAR_ALTAR_COUNT` 2→3 in `spawnGremlinShacks()`; the other
  2 stay wild standalone POIs. Verified against a live seed: 3 shacks within ~500px of the
  altar, 2 far away.
- **Minimap landmarks** — `GremlinShack.discoveredOnMap` added; `updateAltarDiscovery()`
  generalized to also reveal each shack once the player explores within `REVEAL_RADIUS`, in a
  distinct **wood-brown** (`0x8a6a3a`, r1.5), while the altar/war-camp landmark is now a
  **larger red** dot (`0xd6483a`, r2.5) so the camp stands out. `MinimapUI.revealLandmark()`
  gained an optional `radius` param (default 1.5) for this. Folds in the standing "shacks
  should get the altar's landmark treatment" backlog item. Verified: driving the discovery
  pass over all 5 shacks + the altar flips every `discoveredOnMap` flag true and draws the
  dots.
- **Reset** — `campLightPoints` resets to `[]` at the top of `create()` per the
  `scene.restart()`-doesn't-re-run-field-initializers gotcha. Verified: New Run → exactly 3
  brazier light points again (not leaked/doubled), 5 fresh shacks, no stale discovery flags.

**Verified** — `tsc --noEmit` clean; live `preview_eval` for every bullet above;
`preview_screenshot` of the camp layout (palisade ring + props), the night glow, and the
minimap; `preview_console_logs` (error) clean.

**Same-day playtest follow-up (the user: "the camp just looks so busy"):** the first ship
above layered its new dressing on top of `spawnAltarDensity()`'s pre-existing (pre-M-WC)
40-prop clutter band and let ordinary trees/rocks/bushes/wild enemies scatter right through
the camp — the actual busy/messy look wasn't placeholder art, it was two independent
systems drawing over each other with no exclusion zone. Fixed with a real design pass, not
a tweak:

- **Nothing can spawn inside the camp anymore.** New shared module constants
  `WAR_CAMP_RADIUS` (230, the palisade wall — one source of truth now used by the wall
  itself, the floor stamp, and the exclusion check) and `WAR_CAMP_CLEAR_RADIUS` (300, padded
  past the wall to absorb cluster jitter). `pickSpawnPoint()` (used by every tree/rock/
  boulder/bush/enemy scatter call) and `pickCreekEdgePoint()` (Cattail's own bespoke
  sampler, which doesn't go through `pickSpawnPoint`) both reject any candidate within
  `WAR_CAMP_CLEAR_RADIUS` once `altarPosition` is set; `scatterClustered()`'s per-node jitter
  (bushes) gets an extra fallback-to-cluster-center check since jitter can push an
  already-valid center point back inside the wall. `altarPosition` is now picked *before*
  ground/node/enemy spawning in `create()` (previously chosen only after nodes+enemies were
  already scattered) so all of this can actually see it. Verified across multiple fresh
  seeds: 0 of ~396 world nodes ever land within 300px of the altar (a stray Cattail at 260px
  surfaced the `pickCreekEdgePoint` gap on the first check — fixed and reverified at 0).
- **Distinct camp floor** — `buildBiomeTexture()` stamps a packed-dirt color
  (`0x5a4a30`, 230px radius, 40px soft edge, same falloff idea as the forest/creek blend)
  over the ground bake once `altarPosition` is known, so the camp reads as a cleared
  campground instead of the same grass/forest texture as everywhere else.
- **Removed the old redundant clutter** — `spawnAltarDensity()`'s original 3-band
  `gremlin_camp_prop` scatter (0–500px, 40 props) predated the real camp structures and is
  gone entirely; `spawnWarCamp()` is now the single source of all camp dressing, both inside
  the wall and the breadcrumb trail leading to it (rebased to start at 300px, just outside
  the clear zone, instead of 500px).
- **Huts are evenly spaced, not randomly clumped** — the 3 near-altar Gremlin Shacks no
  longer roll a random `pickPointNearAltar` point; `spawnGremlinShacks()` now fans them at a
  fixed ~170px radius, 100° apart (± small jitter), centered on the side of the camp
  *opposite* the entrance gate (new `campGateFacing()` helper, shared with the palisade
  gate/brazier placement so they all agree on the same facing). Banner/totem scatter radii
  were also tightened (140px / 110px, down from 200px / 130px) so they stay in the courtyard
  instead of competing with the hut ring.

Verified live across several reloads/reseeds: 0 nodes inside `WAR_CAMP_CLEAR_RADIUS`; the 3
huts land at ~161–177px from the altar (target 170±10); screenshots (both a wide shot and a
close zoom) show a clean dirt clearing, palisade ring, altar + banners/totems centered, and
the 3 huts fanned evenly opposite the gate, with zero stray trees/rocks/bushes inside the
wall and only the breadcrumb trail visible approaching from outside. `tsc --noEmit` clean,
no console errors.

Next per the locked build order: **M-TE (trophy-gated gear)**, then **M-W1** (circular
multi-biome world) last.

### Previously: M-RL playtest follow-up — per-species elite trophies + night-number HUD fix

Small follow-up batch off the first M-RL relic playtest (the user, 20-min run: got 1
Common relic before the boss — "okay, hoping it scales" with more enemies/biomes; no
scaling change made this pass, just noted the design already supports it). Built on
Sonnet (extends the already-designed loot + relic systems + a one-line HUD fix, no new
mechanic).

- **Every elite now drops a UNIQUE trophy by species** (was: all elites dropped
  `gremlin_trophy`). Boar → **Boar Trophy**, Snake → **Snake Trophy**, Gremlin/Gremling →
  **Gremlin Trophy** (unchanged). The trophy type is data-driven, not another centralized
  constant: `EnemyConfig` gained an optional `eliteTrophy?: ResourceType` (defaults to
  `gremlin_trophy`); the base `Enemy` constructor appends `{ resource: cfg.eliteTrophy ??
  DEFAULT_ELITE_TROPHY, min: 1, max: 1 }` to `loot` when elite (the old `ELITE_TROPHY_DROP`
  const was replaced by `DEFAULT_ELITE_TROPHY`). `Boar`/`Snake` pass their own
  `eliteTrophy`; Gremlin/Gremling ride the default. **New resources** `boar_trophy` /
  `snake_trophy` (`Inventory.ts` `ResourceType`, `Items.ts` `ITEM_DEFS`, `BootScene.ts`
  `icon_boar_trophy`/`icon_snake_trophy` — crossed-tusks / coiled-fanged-head icons in the
  same crimson/gold elite palette as the gremlin trophy; the item texture doubles as the
  loose-drop sprite).
- **All three trophies roll the same Common pool + shared pity counter** — new
  `TROPHY_ROLL` entries `boar_trophy`/`snake_trophy` → `{ common, tier 1, 5% }`. Because
  pity is per-*rarity* (not per-trophy), more elite variety just funnels more attempts into
  Common without fragmenting the odds. Deeper biomes (M-W1) can remap a species' trophy to a
  higher rarity/tier per source — the plumbing already supports it.
- **Relic Forge menu wraps its roll buttons** — the layout hardcoded 2 buttons on one row
  (fit the 560px panel); with up to 3 Common trophies it now wraps into rows of `BTN_COLS`
  (2) and the result line + owned-relic grid stack below the measured button block, so
  nothing overlaps as trophy variety grows. Each button is now labelled by its **trophy
  name** ("Roll Boar Trophy"), not just its rarity, so same-rarity buttons are
  distinguishable.
- **HUD night number fix** — `RunHudUI` showed `[Day N]` by day but a bare `[Night]` at
  night. New `DayNight.nightNumber()` (a night shares the number of the day it follows) →
  the HUD now reads `[Night N]`, symmetric with `[Day N]`.

**Verified** — `tsc --noEmit` clean; live `preview_eval`: elite Boar/Snake/Gremlin/Gremling
each `rollLoot()` → their own unique trophy ×1 (normal Boar → none); `TROPHY_ROLL` has all
4 keys; both new trophies roll into the Common pool (forced-success → Warrior's Charm,
forced-miss → streak++); the HUD reads `[Night 1]`/`[Night 2]`/`[Day 1]` across cycles;
`preview_screenshot` of the forge menu shows the 3 roll buttons wrapping cleanly (Gremlin +
Boar on row 1, Snake on row 2) over the owned-relics grid. No console errors. Next per the
locked build order: **M-WC (Gremlin War Camp) + M-TE (trophy-gated gear)**, then **M-W1**.


### Previously: Contextual hints + pause menu (playtest-readiness pass)

Off the master-plan build order: the user paused M-TE (trophy gear) to instead polish the
first biome enough for outside playtesters. The first item of that pass tackles the
biggest cold-start problem — a fresh player has no idea what the goal is or how the
controls work. Built on Opus (two new systems). Plan:
`.claude/plans/contextual-hints-and-pause-menu.md`.

- **`src/systems/Hints.ts`** (`HintManager`, framework-free like Run/Buffs) — a
  Valheim-Hugin-style contextual tip system (explicitly **not** a mascot; the "raven" was
  only a behavioral reference). `trigger(id)` shows a tip **once per run** if enabled
  (idempotent — safe from a per-frame hover path). Locked with the user: **keep it a
  challenge** — 8 tips teach controls + nudge toward mechanics but **never** spell out the
  totem→altar→boss win condition. "Already shown" state **resets each run** (fresh instance
  in `create()`); the **on/off preference persists** in localStorage
  (`survivor-rpg:hints-enabled:v1`, tolerant of a blocked/corrupt store). Disabled is a
  **true no-op that doesn't mark the hint shown**, so flipping hints back on mid-run still
  surfaces future first-occurrences.
- **`src/ui/HintUI.ts`** — corner popup card: right-edge, mid-height (~42%), clear of the
  minimap/hotbar/prompt/left-column. Slides in from the right, holds 5.2s, fades, click to
  dismiss; only one at a time (a new hint replaces the current). Flat scrollFactor(0)
  objects (no Container), depth 2860/2861 (clears WORLD_H, below menus). The slide tween is
  killed on replace so a stale `onComplete` can't fade the next card early.
- **8 triggers** wired at existing hook points: `awaken` (spawn +1.5s: WASD + explore),
  `pickup_reach` (first reachable free pickup: left-click to interact), `tool_locked`
  (clicked a chop/mine node without the right tool KIND — nudges toward tools, **never
  names which**, preserving the prompt-gating design), `open_menu` (first recipe unlock:
  press Tab), `stamina_empty`, `low_hp` (≤30%: cooked food heals), `nightfall` (torch +
  danger), `elite_trophy` (gremlin/boar/snake trophy in hand → Relic Forge; NOT the boss
  fang, which is a win-state drop).
- **`src/ui/PauseMenuUI.ts`** + MainScene wiring — a pause overlay (**Esc**), modeled on
  RunEndUI. Chosen over a standalone settings panel because it delivers three playtest
  needs at once: the pause players expect, a Resume/New Run escape hatch, and the home for
  the Hints ON/OFF toggle (settings didn't exist). **Freeze:** `openPauseMenu()` sets
  `isPaused`, zeroes player velocity, `physics.world.pause()`, `time.paused = true`;
  `update()` early-returns on `isPaused` so `run.tick`/day-night never advance — **pausing
  doesn't burn the speedrun clock**. Blocked once `runOver`/`isDead` (RunEndUI owns the
  frozen world then). World pointerdown guarded with `isPaused`; **Esc** opens pause only
  when no other menu is open (else it just closes that menu). All new fields reset in
  `create()` per the `scene.restart()` field-init gotcha (with a defensive
  `physics.world.resume()` + `time.paused = false` in case New Run was clicked from the
  pause menu). Keybinds panel gained a `"Pause / close: Esc"` line for discoverability.
- `tsc --noEmit` clean; preview console clean. Verified live: card renders + idempotent +
  one-at-a-time; disabled no-op doesn't burn the hint (re-enable re-shows); pause freezes
  physics + scene clock + `isPaused` and resumes clean; toggle persists. Screenshots of the
  PAUSED overlay + the right-edge TIP card. No `RECIPES.md` change (no recipes touched).

### Previously: Timed action bars + slot-machine relic rolls

A playtest feel request from the user (off the standing roguelike loop, not a master-plan
milestone): crafting/processing/cooking/relic-rolls all completed **instantly** — he wanted
a short **loading bar before the result lands**, with two distinct feels. Built on Opus
(new UI-animation mechanic + a per-station "busy" concept that didn't exist). Detailed plan:
`.claude/plans/generic-meandering-puffin.md`.

- **`src/ui/ProgressBar.ts`** (new) — a small reusable fill bar (flat scrollFactor(0) rects,
  no Container per the CraftingMenu note). Tweens a `{v}` proxy 0→1 (not the Rectangle
  itself) so the visuals can hide/cancel without killing the tween. One instance is owned
  per menu, positioned over the action button, **not** part of the per-frame-cleared `rows`.
  Used by the three "quick" menus: **craft ~450ms, cook ~500ms, process ~600ms**
  (`Sine.easeInOut`). A **single bar for a whole batch** (an 8→4 dry is one bar, verified).
- **Commit-at-end:** inputs are consumed + output granted only when the bar fills (the
  existing synchronous `craft`/`processAmount`/`cook` methods are unchanged, just invoked
  from `onComplete`). A `busy` flag greys the button + blocks re-clicks meanwhile.
  **Closing a menu mid-bar cancels cleanly** (nothing consumed until it fills, so a no-op —
  chosen over "complete after close" because the station menus lose their station ref on
  close; uniform + predictable). Verified: normal craft 0→1, cancel-on-close 1→1 (no
  double-craft, no lost resources), and item lands **after** the bar, not at click.
- **`src/ui/RelicRevealFx.ts`** (new) — the Relic Forge's **slot-machine** spin (not the
  generic bar; the feel is different). The roll RESULT is resolved by the caller *before*
  the spin (trophy consumed + `RelicManager` mutated immediately — verified 5→4 trophies /
  0→1 relic at click), so an interrupted spin never changes what was won — it's pure theater
  over a known outcome. A ~1400ms `Quart.easeOut` bar decelerates while a **reel gem**
  rapid-swaps rarity icons and slows down, then a **rarity-scaled reveal** (data-driven
  `REVEAL_CFG`, not branching): **Common** = a modest gem punch + faint glow;
  **Uncommon** adds a panel flash + light shards; **Rare/Mythic** pile on a big additive
  glow burst (reuses the M-DN `light_soft` texture, tinted per rarity), panel flash, a
  radial shard burst, a scaled-in `★ RARITY! ★` banner, and a subtle camera shake. A
  full-panel scrim dims the busy grid + eats clicks during the spin. **Fail** = a grey
  crumble fizzle. Verified: mid-spin frame (scrim + reel + bar) and the frozen **mythic**
  payoff (glow blowing past the panel + banner) via a tween-pause trick.
- **Deferred announce:** `MainScene.rollRelic(trophyKey, announce=false)` for the menu path
  — the event-log line + `afterRelicChange()` (relic-bar sync, stat bonuses) fire at the
  **reveal landing** via a new `announceRelicResult()` + the menu's `announceRoll` dep, not
  at click, so the payoff is the satisfying moment. Verified: log/bar update on reveal, and
  `busy`/`fxActive` both clear afterward.
- No `RECIPES.md` change (no recipe/cost changes). `tsc --noEmit` clean; `preview_console_logs`
  (error) clean across all tests.

### Previously: Balancing dashboard + 25-min playtest triage

Off the master-plan build order (like 5q). the user's 25-min run (player lvl 7, ~lvl 16
Slash on a Bone Knife, 18 kills + 1 boss, 2 relics) produced a 12-item feedback dump.
Triaged and locked the order/scope via `AskUserQuestion`; **tackled the dashboard first**
this session (a tooling deliverable, not a game mechanic). Combat + balance work is queued
for later sessions.

- **Live HTML balancing dashboard** — `dashboard.html` (repo root) + `src/dashboard/main.ts`,
  wired as a **second Vite entry** (`vite.config.ts` `build.rollupOptions.input`). Open at
  **`/dashboard.html`** while `npm run dev` runs (served on whatever port Vite prints).
  Framework-free plain DOM (no new npm dep); no item icons (BootScene-generated at runtime,
  unavailable to a static page). **Drift-free by construction:** it imports the SAME
  source-of-truth data modules the game does (`Recipes`, `Items`, `Weapons`,
  `WeaponUpgrades`, `ArmorUpgrades`, `StationUpgrades`, `Processing`, `Cooking`, `Relics`) —
  all Phaser-free, so the page stays lean and updates automatically on any recipe/cost/stat/
  relic change. 8 searchable tabs: Recipes, Weapons (w/ DPS + upgrade costs), Armor (base +
  Lvl2 defense, set totals), Stations & Food, Relics (trophy→roll odds/pity + every relic's
  effect text — answers "Tireless Charm −12% to *what*" → **stamina cost**, and is the
  see-all-relics list), Enemies, **Balance Overview**, All Items.
- **Balance Overview tab** — the analysis payload. Computes incoming-damage-vs-armor
  (flat-deduction, floored at 1) at three armor breakpoints, flagging red where a hit floors
  to ≤2. Directly **quantifies the "1 damage per hit in Lvl 2 armor" complaint**: Gremling
  claw (8) and Gremlin claw (10) both floor to **1 dmg = 100 hits to kill you** in armor.
  Plus weapon time-to-kill per enemy. This is the reference for the queued rebalance.
- **The one drift risk** (documented in-UI + `RECIPES.md`): the **Enemies tab's `ENEMIES`
  array is manually mirrored** from the Phaser entity subclasses (Boar/Snake/Gremlin/
  GremlinKing) — enemy stats live in constructors, not exported tables. Keep in sync when
  tuning enemies. Everything else is live-imported.
- `RECIPES.md` got a pointer to the dashboard at the top (kept as the quick static reference).

**Locked decisions from the triage (for the queued follow-up sessions):**
- **Souls-like combat — ALL enemies, next combat session (Opus, new mechanic):** every enemy
  (Boar/Snake/Gremlin/Gremling) gets a telegraphed attack + a clear attack/dodge window, like
  the Gremlin King already has. Goal: kill the "kite forever by spam-left-click + walk away"
  feel. Boring common enemies are fine, but all need a readable tell + punish window.
- **Balance — "both, lightly" (Sonnet):** small armor-mitigation nerf + small enemy-damage
  buff so armor is a bonus, not near-immunity (see the Balance tab).
- **Boss (Sonnet):** bump Gremlin King damage MORE — should ~2-shot a full-armor player
  (damage already felt good vs max armor). **Replace the cleave/cone attack** — it reads as a
  strictly worse 360° slam; design a genuinely different attack.
- **Bug fixes (Sonnet):** (1) twine picked up from a chest didn't unlock recipes (container
  pickups skip discovery refresh); (2) Cooked Boar Meat recipe shown before ever making a
  shishkabob (cook-recipe discovery gating); (3) relic appears in "Your Relics" grid *before*
  the roll notification (5p deferred-announce missed the grid repaint); (4) "Roll Gremlin
  Trophy" button stuck in the Relic Forge at 0 count while other trophies vanish; (5) level-up
  full-screen flash is a jumpscare — keep it a big deal, dial intensity down.
- **Small features:** contextual hint to place a Workbench (Hints.ts); in-game relic
  compendium (see-all-relics view — the dashboard covers the dev side, he wants it in-game too).
### Previously: Souls-like common-enemy combat (telegraphed attacks)

Off the master-plan build order — the next item in the 25-min-playtest triage after the
dashboard ([[survivor-rpg-playtest-feedback-2026-07-11]]): kill the "kite forever by
spam-left-click + walk away" feel by giving **every** common enemy a telegraphed attack +
dodge window + recovery/punish window, the way the Gremlin King already works. Built on
**Opus** (new mechanic). Plan: `.claude/plans/hashed-enchanting-finch.md`. **Mechanic only —
the balance-number rebalance (armor/enemy-dmg/boss) stays deferred to a separate Sonnet pass**,
per the user's "get core mechanics playtest-ready first."

**Locked direction (the user):** per-enemy *bespoke* attacks, NOT one uniform system (harder
enemies feel distinct; common trash can stay simple + kiteable). Tells are **animation/motion/
tint** (rear-back, wind-up scale-pulse, lunge) — **NO world-space red arcs/lines** ("too
goofy"); players learn hitboxes over time. No audio system exists (confirmed) → sound tells
deferred. Ranged Gremlin: telegraph the **melee claw only** (projectile burst untouched).

- **Shared mechanism on base `Enemy`** (`src/entities/Enemy.ts`) — a *mechanism* with
  per-subclass *numbers* (like the existing `startPursuit`/`hasGivenUpPursuit`/`canAggro`
  give-up helpers; NOT a shared config table, per the standing "don't fold per-enemy combat
  stats into one table" rule). New `AttackPhase` (`none|windup|strike|recover`),
  `SwingConfig` (reach/windup/strike/recover/cooldown + optional `knockback`), `isAttacking()`,
  `playWindupTell()`/`endWindupTell()` (finite scale-punch ×1.18 + warning tint, restored via
  an extracted `applyHpTint()` — no `repeat:-1` leak, no x/y tween to fight the arcade body),
  and `tickMeleeSwing()` (drives a full in-place swing, holds the enemy planted, returns true
  only at the strike frame **if the player is STILL within reach** — re-checking current
  position instead of damaging on contact is what makes wind-up dodging real). Damage path is
  unchanged: `update()` returns true → `applyDamageToPlayer(biteDamage)`. Public
  `pendingAttackKnockback` (set by `tickMeleeSwing` from `SwingConfig.knockback` or by Boar's
  charge) is read in `MainScene.updateEnemies()` and fed to `applyDamageToPlayer`'s existing
  knockback param. Base `Enemy.update()`'s own bite was converted to the telegraphed swing too
  (canonical reference; deaggro now guarded with `!isAttacking()` so a committed swing plays
  out). GremlinKing untouched — already has telegraph/poise.
- **Gremling** (`MeleeGremling`, `Gremlin.ts`) — simple `tickMeleeSwing` claw, the
  intentionally-boring, still-kiteable baseline.
- **Snake** (`Snake.ts`) — **coil → locked lunge-bite**: a coil wind-up captures the strike
  direction on its first frame and never re-aims (stopped its old per-frame homing), then a
  straight locked lunge (`STRIKE_SPEED` bumped 90→150); a sidestep during the coil makes it
  whiff, and the existing flee IS the recovery/punish. Fleeing far during the coil cancels
  the strike; the whole lunge always resolves within COIL_MS+LUNGE_MS so it can't chase forever.
- **Boar** (`Boar.ts`) — now its own `update()` override (was bare base `Enemy`). Signature
  **CHARGE**: paws-the-ground wind-up (locks direction like GremlinKing's charge), a fast
  committed lunge (270px/s) that **overshoots** past the player, then a long
  recovery/turnaround (the main punish window). Plus a quick point-blank **gore-bite** so it
  can't be trivially circled. Both feed damage through the boolean contract; the charge sets a
  300px/s shove. (Renamed its wander fields to `boarWanderTarget`/`boarNextWanderAt` to avoid
  clashing with base `Enemy`'s privates.)
- **RangedGremlin** (`Gremlin.ts`) — kiting + 2-shot burst untouched; the melee claw is now a
  telegraphed `tickMeleeSwing` with a **shove knockback** (210px/s), and won't flip out of
  melee mode mid-swing.
- **Verified**: `tsc --noEmit` clean; preview console error-free. Live `preview_eval`
  (isolated one enemy, banished the rest) confirmed all four: Boar charge
  (windup→strike→recover→none, 25 dmg at strike, **sidestep whiffs → 0 dmg**, scale 1.18 +
  orange tint tell — screenshotted), Gremling swipe (cyclic, 8 dmg at strike), Snake coil→lunge
  (striking→fleeing→hidden, 20 dmg on the lunge), Ranged Gremlin claw (windup→strike→recover,
  10 dmg, kb=210 plumbed). **No damage ever lands during wind-up.** **Known limitation**: the
  shove knockback is currently near-cosmetic because `Player.update()` zeroes idle velocity
  every frame (overwriting the impulse the frame after) — a *pre-existing* trait of the exact
  path GremlinKing's slam already uses; fixing it is a boss-feel change, left for the deferred
  combat-feel/balance pass. No `RECIPES.md` change (no recipes touched).

**Still queued from the triage** (see [[survivor-rpg-playtest-feedback-2026-07-11]]): light
"both" rebalance (armor nerf + enemy-dmg buff), boss damage bump + replace the GremlinKing
cleave, 5 bug fixes, 2 small features (Workbench-placement hint, in-game relic compendium).
Then the master-plan tail: **M-TE** (trophy gear), **M-W1** (multi-biome world).
### Previously: Playtest bug-fix batch (5 fixes)

The first chunk of the 25-min-playtest triage backlog after the souls-like combat pass —
five independent bug fixes ([[survivor-rpg-playtest-feedback-2026-07-11]]). Fixes/UI on
already-designed systems (Sonnet-class work, though built this session on Opus). No
`RECIPES.md` change (no recipe/cost changes).

1. **Chest-looted materials never unlocked recipes.** Picking a material up off the ground
   goes through `MainScene.addToBackpack()` → `discovered.add()` + `refreshDiscovery()`, but
   moving one out of a chest (or drying rack) uses `moveSlot()` directly + `afterItemMove()`,
   which never recorded discovery — so e.g. twine looted from a Gremlin Shack chest never
   unlocked its recipes. New `MainScene.reconcileBackpackDiscovery()` (called from
   `afterItemMove()`) scans the backpack, marks any not-yet-discovered key discovered, and
   runs `refreshDiscovery()` only when something new actually appears. General across every
   container→backpack path, not chest-specific. *Verified: twine placed into the backpack via
   the move hook went undiscovered→discovered.*
2. **Cook recipes shown before their ingredients were discovered.** `CookingMenu` filtered
   dishes only by campfire tier, so "Cooked Boar Meat" advertised itself before the player had
   ever obtained a shishkabob. Added a `discovered: () => ReadonlySet<string>` dep (wired to
   `MainScene.discovered`); a dish now also stays hidden until ALL its ingredients are
   discovered — the same "don't reveal locked info" rule `Crafting.ts` uses. Empty-state note
   when nothing's known yet. *Verified: 0 dishes at fresh state → 1 (Cooked Boar Meat) after
   discovering boar_meat + shishkabob.*
3. **New relic appeared in the "Your Relics" grid before the reveal landed.** The forge's
   `roll()` mutates `RelicManager` immediately (so an interrupted spin can't change the
   outcome — 5p), but `render()` then repainted the grid live, popping the new relic in before
   the slot-machine spin resolved. `RelicForgeMenu` now snapshots `groupedForDisplay()` into
   `preRollGroups` BEFORE the roll and renders that (via `displayGroups()`) while `busy`,
   clearing it when the reveal's `onComplete` fires. *Verified via forced-pity roll: mid-spin
   the manager holds the relic (live len 1) but the grid renders the frozen snapshot (len 0).*
4. **"Roll Gremlin Trophy" button stuck at 0 while other trophy buttons vanished.**
   `visibleTrophyKeys()` special-cased `gremlin_trophy` to always show (for at-0
   discoverability), which read as a broken button next to Boar/Snake buttons disappearing at
   0. Now every trophy button shows only when owned (count > 0), with a "No trophies — defeat
   elite enemies to earn them." empty-state note (and the grid's empty message reworded off the
   Gremlin-Trophy-specific text). The forge recipe itself costs a Gremlin Trophy, so a placed
   forge already implies the player has met them. *Verified: 0 trophies → note only; +1 gremlin
   trophy → "Roll Gremlin Trophy" button.*
5. **Level-up flash was a jumpscare.** `cameras.main.flash()` peak amber dialed well down
   (90,70,20 → 48,36,12) and the fade lengthened (180→300ms) so it reads as a soft warm pulse,
   not a hard full-screen pop; the punch-in "LEVEL UP!" banner stays the "big deal" part. No
   camera shake.

**Verification:** `tsc --noEmit` clean; preview boots console-error-free; the four logic fixes
asserted live via `preview_eval`. (The "YOU DIED" screen seen during testing was just the idle
player killed by an enemy over the eval minute — confirms the hardcore run-end flow still works,
unrelated to these changes.)

**Still queued from the triage** (see [[survivor-rpg-playtest-feedback-2026-07-11]]): the light
"both" rebalance (armor nerf + enemy-dmg buff), the boss damage bump + GremlinKing cleave
replacement, and 2 small features (Workbench-placement hint, in-game relic compendium). Then the
master-plan tail: **M-TE** (trophy gear), **M-W1** (multi-biome world).
### Previously: Elite melee reach fix + Gloaming Vein design

Two things this session: a live combat bug fix, and the locked design + committed plan for
the next feature (the Gloaming Vein — not built yet). The bug fix is Sonnet-class (a fix on
an existing system); it was done on Opus alongside the new-mechanic brainstorm.

**Elite Gremling "runs up but never attacks" — fixed.** Root cause: an elite's
`setScale(1.4)` also grows its **Arcade physics body** (verified live: a Gremling's 14px
body → 19.6px), and the player↔enemy collider then holds their centers ~19.8px apart —
right at the flat 20px swing-*start* threshold. On any diagonal approach the Euclidean
center distance exceeds 20, so `dist <= MELEE_RANGE` never fires and it never winds up
(hence "sometimes"). This is the **mirror** of the earlier `MainScene.enemyReach()` fix
(which scales the *player's* reach vs big enemies) — nobody had scaled the *enemy's own*
reach vs its own scaled body. Fix: a principled `Enemy.reachBonus()` =
`(baseScale-1) * max(width,height)/2` (the exact body-half the scaling added; **0 for
non-elites**, uses `baseScale` not the live wind-up-pulsed scale), added to **every** melee
reach check across the roster: `tickMeleeSwing`'s strike + the base/Gremling `MELEE_RANGE`
starts, RangedGremlin's enter/exit-melee thresholds, Boar's gore-start + gore-strike +
charge-hit, and Snake's lunge bite. Any future scaled/elite enemy gets it for free.
*Verified live against a real elite Gremling: a 22px swing that whiffed at the flat 20px
reach now walks windup→strike and lands (`observedHit: true`); `reachBonus` = 3.2px
(gremling texture is 14×16, so it uses the 16px dimension), restoring the same ~3px reach
margin a normal Gremling has. `tsc --noEmit` clean; console clean.*

**Gloaming Vein — designed + locked, plan committed, NOT yet built.** Brainstormed with
the user and locked via `AskUserQuestion`; full plan at
`.claude/plans/amethyst-warding-vein.md`. A mineable, rare, finite **purple ore POI** (glows
at night) guarded by a **mini-boss** (the "Gloamwarden"); mining it yields a magical
resource ("Gloam Shard") used at the **Relic Forge (new "Refine" tab)** to **climb trophy
rarity** — turning crumble-prone raw Common trophies into guaranteed-roll Refined Uncommons.
Locked rules: refine happens on the existing forge (not a new station); refined trophies are
**species-agnostic**; the vein is **hard-gated** (un-mineable until the guardian dies);
refinement is **single-step + terminal** (raw→one-up, refined trophies are roll-only, no
refined→refined) — so biome 1 naturally caps at Refined Uncommon while the system already
supports raw-Uncommon→Refined-Rare for deeper biomes. This **deliberately overrides M-RL's
"rarity not climbable / no manual combine" lock** — but as a *gated* climb (rare resource +
mini-boss), consistent with "nothing free." First-pass numbers in the plan; relic-strength
retune is a separate later pass. New-mechanic build is Opus territory.


### Previously: Gloaming Vein (rarity-ore POI + mini-boss + trophy refinement)

Built the next locked feature after the world/map rework — plan:
`.claude/plans/amethyst-warding-vein.md`. Built on **Opus** (new mechanic: a POI + a
bespoke mini-boss + a refinement data model). A content+economy pass on the M-RL relic
loop: kill elites → raw Common trophies (86.5% crumble when rolled) → find + clear the ore
POI → Gloam Shards → spend them at the Relic Forge's new **Refine tab** to climb a raw
trophy one rarity up into a **Refined trophy that never fails a roll** (Uncommon outcome
table = 100% floor). Fully gated behind exploration + a mini-boss ("nothing free").

**The POI (world-gen, `MainScene`).** `veinPosition` is chosen once in `create()` after
the altar (so it stays ≥900px from BOTH world center and the war camp — verified 1290px
from center / 2429px from camp) and before node/enemy spawning, so a new
`VEIN_CLEAR_RADIUS` (160) exclusion in `pickSpawnPoint` keeps ordinary trees/rocks/enemies
out of the ore clearing (same pattern as the war camp — [[feedback_poi_busy_not_placeholder]]).
`spawnGloamingVein()` drops the **Gloamwarden** guardian at the clearing center ringed by
**5 shielded ore `ResourceNode`s** (Stone-Pickaxe-gated `mine` action, non-respawning, 1–2
Gloam Shard each, ~2 hits) plus **10 decorative amethyst crystal clusters**
(`gloam_crystal_cluster`). New `ResourceNode.shielded` flag + `crack(texture)`: shielded
nodes are skipped by hover/prompt/interact (like `harvested`) and swap
`gloaming_vein_shielded` → `gloaming_vein` when the guardian dies. **Unique area look** (so
the ore reads as its own place, like the war-camp floor does for the altar):
`buildBiomeTexture()` stamps a distinct **gloam-blighted crystalline floor** over the
clearing (dark-violet wash + a brighter amethyst core). Vein node + a few crystal positions
feed `veinLightPoints` that `collectLights()` iterates, so the crystals **glow purple at
night** — a navigation beacon like the war-camp braziers. Discovered within `REVEAL_RADIUS`
→ a purple **minimap landmark** (`map_vein`, generalized `updateAltarDiscovery`). New
per-run fields reset in `create()`.

**The guardian (`src/entities/Gloamwarden.ts`).** A bespoke mini-boss following
GremlinKing's telegraph/poise pattern but **lighter** (per the "no shared boss framework"
lock — a trimmed sibling, not a subclass of GremlinKing). Extends `Enemy`, fully overrides
`update()`. 260 HP, scale 1.7, poise 60 → stagger (2.5s, ×1.5 damage punish), difficulty
between an elite and the King; regens 10 HP/s while deaggro'd. Two **bespoke** purple-
telegraphed attacks — deliberately NOT the roster's charge/radial-slam (the user: those read
as "Boar charge / King slam again"): a **Leaping Smash** (leap to a locked landing spot +
AoE 95px, 22 dmg + kb — kept to preview the Gremlin King's own leaping smash) and a **Gloam
Eruption** (the warden roots itself and channels, then crystal spikes erupt at the player's
locked ground spot, 72px, 24 dmg + small launch — boss stays put + vulnerable = a punish
window; dodge is to leave the marked ground). Area damage flows through `checkPlayerHit()`
(queried in `updateEnemies` alongside GremlinKing) into the same `applyDamageToPlayer` choke
point, so dash i-frames/armor "just work." On death, `onGloamwardenKilled()` cracks the vein
+ guaranteed drop 3–4 Gloam Shard + 1 Refined Trophy. Scored as an **elite** kill (no
dedicated mini-boss band — the plan's "simplest" open sub-decision).

**Refinement (`Relics.ts` + `RelicForgeMenu.ts`).** New `REFINE_RECIPES` (data-driven,
tier-keyed) + `refinableTrophyKeys`/`ownedRefineInput`/`canAffordRefine` helpers. Biome-1
recipe: **3 raw Common trophies (any species mix) + 2 Gloam Shards → 1 Refined Trophy**;
an Uncommon→Radiant scaffold row exists but never surfaces (no raw Uncommon source in
biome 1). Refined trophies are **roll-only** `TROPHY_ROLL` keys (never dropped, never a
refine input — single-step + terminal, which caps biome 1 at Refined Uncommon and blocks
an infinite ladder). The forge menu gained a **Bind / Refine tab toggle** ("Bind" is the
in-universe name for rolling — the forge "binds trophies into relics"); the Refine tab
lists affordable recipes with a live cost readout + a **timed `ProgressBar`** (650ms,
commit-at-end + cancel-on-close, same as craft/process/cook). `MainScene.refineTrophies()`
consumes inputs greedily across species + grants the output at bar completion. **The Refine
tab is hidden entirely until the Relic Forge reaches Lvl 2** (no locked tab, no hint) — a new
**Gloam Conduit** station upgrade (`StationUpgrades.ts`, 15 Stone + 1 Gloam Shard, right-click
the forge → Upgrade) unlocks it. So you can't refine until you've mined at least one shard
(which the upgrade itself costs).

**Verified live** (`preview_eval` + screenshots): all new textures load; POI spawns 5
shielded nodes + guardian at correct distances; shielded nodes un-hoverable even with a
pickaxe equipped; guardian cycles telegraph → **Leaping Smash** (22, kb 200) / **Gloam
Eruption** (24, kb 120) → recover, and poise-0 → staggered; killing it cracks all 5 nodes
(texture swap, `shielded` false); the vein clearing shows its distinct gloam floor + crystal
props (screenshotted); the **Refine tab is hidden entirely at forge Lvl 1** (only the Roll
tab shows) and **appears at Lvl 2**, and the **Gloam Conduit** upgrade applies near a Workbench
(tier 0→1, −15 Stone/−1 Gloam Shard); refine consumes 3 mixed-species commons + 2 shards →
1 refined; a Refined trophy rolls **200/200 successes** (Uncommon 100% floor); the
ProgressBar commits at end (nothing consumed mid-bar); 9 vein light points reach
`collectLights`.
`tsc --noEmit` clean; console error-free. `RECIPES.md` + the dashboard (Relics Refine
table + Enemies Gloamwarden row) updated. See [[survivor-rpg-gloaming-vein-plan]].

**Next:** **M-TE** (trophy-gated special gear), then **M-W1** (multi-biome content in the
now-circular world) last.

### Previously: Circular bigger world + minimap nearby-view + full-map overlay

Off the master-plan build order (the user paused the Gloaming Vein to first do the world/map
rework, prepping for M-W1). Built on **Opus** (new world-gen geometry + two new map
systems). Three asks: (1) make the world **circular + much bigger**, keeping the current
biome ~its size but leaving room (empty for now) for future biomes; (2) the corner minimap
should show a **nearby view** (what's on screen), not the whole world; (3) a **full map**
opened by a button, **zoomable (scroll) + pannable (drag)**, with **POI icons once
discovered**.

**Circular bigger world.** New geometry constants in `MainScene`: `WORLD_RADIUS` 4000
(→ `WORLD_SIZE` 8000px square that bounds the world circle), `BIOME_RADIUS` 2000 (the
central content circle, ~the old 3584×2688 biome, slightly larger), centered at
`WORLD_CX/CY` = 4000. `WORLD_W`/`WORLD_H` kept as back-compat aliases = `WORLD_SIZE` (all
the existing `WORLD_W/2`-is-center math still holds). **`Biome` is now origin-aware**
(`new Biome(originX, originY, regionW, regionH, rng)`) — it generates only a centered
`BIOME_SIZE` region and `forestWeight`/`creekWeight` return 0 outside it, so the outer ring
is plain grass. `buildBiomeTexture()` bakes only that region (a `BIOME_SIZE`×`BIOME_SIZE`
RenderTexture placed at the region origin — kept well under the GPU texture-size limit
instead of a full-world 8000px bake). All spawn samplers (`pickSpawnPoint`,
`pickCreekEdgePoint`, `pickPointNearAltar`) now sample within the region and reject points
outside `BIOME_RADIUS`, so all first-biome content stays in the central circle (verified:
0/396 nodes outside; a few war-camp/shack guards spill ~120px past onto grass, as the camp
sits at the biome's outer edge — fine/thematic). `clampPlayerToWorld()` pins the player to
the world circle each frame; `drawWorldBoundary()` fills a dark **void ring** beyond
`WORLD_RADIUS` (cheap concentric thick strokes, no giant texture) + a shoreline accent, so
the playable area reads as a round island.

**Depth regression fixed (important).** Enlarging the world pushed world-object Y-sort
depth (`= y`) up to ~8000, which drew low trees/enemies OVER the fixed HUD (2600–6000).
New **`src/systems/depth.ts` `ysortDepth(y) = y * 0.3`** compresses the world Y range into
a bounded band (max ~2400, below the HUD), applied at every world Y-sort site
(Player/Enemy/ResourceNode/GremlinShack/BossAltar + war-camp props). Order preserved;
ground/ring negatives + low-depth drops/damage-numbers unaffected. **Any new Y-sorting
world object must use `ysortDepth`.**

**Map rework — three pieces.**
- **`src/systems/ExploredMap.ts`** (new, framework-light) — the shared explored-world
  model behind both views: a world-space fog color cache (one 0xRRGGBB per 40px fog cell,
  −1 = unrevealed) + the discovered-POI landmark list. It's the **single consumer** of
  `FogOfWar`'s reveal queue (`drainRevealed()` updates the cache + returns changed cells),
  so the two views can't race. Fog grid is now world-space (200×200 @ 40px), decoupled from
  any HUD panel resolution.
- **`MinimapUI` rewritten** — the corner panel is now a **player-centered nearby window**
  (~2240×1680 world px, a touch past the 1920×1080 viewport), repainted each frame from the
  color cache as clipped Graphics rects (no whole-world shrink). Landmark dots + player
  marker + night dim. A small **"🗺 Map (M)"** button is tucked in its corner.
- **`src/ui/WorldMapUI.ts`** (new) — the full-screen overlay (M key / Map button / ✕ /
  Esc). Draws the whole explored fog cache as clipped, zoom/pan-transformed Graphics rects
  (a dirty flag rebuilds terrain only on zoom/pan/new-reveal; the same reliable fixed-HUD
  clipping the minimap uses, no geometry-mask-vs-scroll drift). **Scroll = zoom (1–10×),
  drag = pan (clamped)**; discovered POIs get an **icon + label** (`map_altar` red/gold war
  camp, `map_shack` brown — new BootScene markers). **Non-modal** per the locked design —
  the game keeps running and the player can walk while it's open (world clicks/hover
  suppressed over it; it doesn't pause). Keybinds panel gained a "World map: M" line.

**Verified live** (`preview_eval` + screenshots): player spawns at center (4000,4000);
biome origin (2000,2000)/region 4000²/fog 200²@40; altar 1955px from center (in-biome);
0 nodes outside the biome circle; player shoved to (4000,8300) clamps to dist 3980
(`WORLD_RADIUS`−20); void/shoreline ring renders at the edge; nearby minimap scrolls with
the player and shows the edge as void; full map renders the explored trail + war-camp +
3 shack icons/labels, zoom scales cleanly (clipped to panel), a 250px drag pans and a huge
drag clamps to 1611; and — the depth fix — trees no longer draw over the map panel (a
mid-test RunEndUI correctly sat above it at 3500). `tsc --noEmit` clean; console
error-free. No `RECIPES.md` change (no recipe/cost changes).

**Next:** the **Gloaming Vein** (mineable rarity-ore POI + trophy refinement, plan
committed at `.claude/plans/amethyst-warding-vein.md`), then **M-TE**, then **M-W1** proper
(multi-biome content + deterministic seeded gen in this now-circular world).


### 5x — Playtest-readiness Tier 1 (discovered-material toast + hover highlight + first-damage hint)

Off the playtest-polish backlog (see the previous "Balancing dashboard" entry's triage
notes), the three cheapest comprehension-gap fixes ahead of handing the build to outside
playtesters. Sonnet-class fixes/UI on existing systems — no new mechanic. Passive HP regen
(the fourth backlog item) was explicitly cut per the user: Comfort (Bedroll) + cooked-food
buffs already own HP sustain, and a passive trickle on top would make both feel pointless.

**Discovered-material toast** (`EventLog.ts`/`EventLogUI.ts`/`MainScene.ts`). New
`LogKind: "material"` reuses the existing recipe-unlock slide-in/stack/fade toast verbatim
(`EventLogUI`'s `enqueueRecipeToast`/`spawnRecipeToast`, which only ever hardcoded the
`recipe` color — now reads `KIND_COLORS[entry.kind]` so both kinds share one queue/stack
instead of colliding if they fire the same beat), in a new blue accent (`#8ac2e0`) distinct
from recipe's amber. New `MainScene.discoverMaterial(key)` centralizes every
`discovered.add()` call site (world pickup via `collectNode`, `addToBackpack` — crafting/
cooking/processing output included — and `reconcileBackpackDiscovery` for chest/rack loot)
so the toast fires exactly once, wherever a key is first obtained, regardless of path. A
new module-level `CRAFTED_OUTPUT_KEYS` (unioned from `RECIPES`/`PROCESS_RECIPES`/
`COOK_RECIPES`/`REFINE_RECIPES` output keys) excludes crafted/cooked/processed/refined
goods from the toast — those already get their own "New Recipe Unlocked!" toast the moment
they become craftable, so a second "Discovered: X" on first craft would be redundant.
*Verified live: first `wood` pickup → "Discovered: Wood" material toast + its recipe
unlocks; a second `wood` pickup → no new entries (dedup); adding a crafted `stone_axe` →
no material toast.*

**Hover highlight** (`MainScene.ts`). A world-space `Graphics` outline (`hoverHighlight`,
mirrors `attackRangeRing`'s idiom) redrawn each frame in `updateHover()`, strictly gated on
the SAME `prompt` string the bottom-right text already uses — so a no-tool-equipped or
out-of-reach hover shows no highlight either, preserving the prompt-gating design's
"reveal nothing" rule. Depth = `ysortDepth(target.y) + 0.5` (mirrors GremlinKing's
telegraph-graphics depth convention), so it draws just above whatever's hovered — works
uniformly across nodes/enemies/racks/shacks/altars/workbench/campfire/forge since they all
expose `x`/`y`/`displayWidth`/`displayHeight`. *Verified live: `commandBuffer.length` is 0
with a null prompt, 14 (a drawn circle) with a hovered node + non-null prompt; depth
computed correctly for the target's y.*

**First-damage hint, not 30%-HP-threshold hint.** The `low_hp` hint used to poll
`health/max <= 0.3` every frame; renamed to `took_damage` and moved to fire once, right
when `applyDamageToPlayer()` actually lands a hit — a fresh player doesn't need to bleed
down to 30% before learning food/rest heal over time, and the old poll could also fire
well into a fight rather than at the actually-informative moment (first hit ever). Text
updated to mention both cooked food and Comfort/campfire resting. *Verified live: one hit
→ hint fires once with the new text; a second hit → no re-fire (idempotent, matches every
other `HintManager.trigger()` call).*

**Verification:** `tsc --noEmit` clean; preview boots console-error-free (driven via
`preview_eval` — the preview tab loaded backgrounded/hidden this session, the documented
quirk in `CLAUDE.md`'s verification workflow; `window.__game.scene.start('MainScene')`
force-advanced the stalled scene transition so live state could still be exercised).
`RECIPES.md` unchanged (no recipe/cost changes).

**Still queued:** inventory auto-sort, a ranged starter weapon, then a minimal
code-generated SFX layer (hit/pickup/craft/level-up/nightfall/death — same placeholder
ethos as the generated textures, swappable later) before a second/wider playtest round.
Real pixel art + animations stay deferred until content/balance settle further (last, per
`CLAUDE.md` roadmap item 8). Then the master-plan tail: **M-TE** (trophy gear), **M-W1**
(multi-biome world).

### 5y — Inventory sort/split + ranged starter weapons (Slingshot + Javelin) + minimal SFX

Closes out the rest of the playtest-polish backlog from 5x/5q/5r. Plan:
`.claude/plans/twinkly-orbiting-backus.md`. Two Sonnet-class quick fixes plus one new
mechanic (ranged weapons + a new Equipment slot) built on Opus per the model-switch
convention, plus a small standalone SFX addition.

**Inventory auto-sort + Shift-Click split-stack.** `ItemContainer.sortAndStack()` (new)
re-flows a container into merged, sorted, re-packed stacks — a "Sort" text button next to
the Backpack header in `InventoryMenu.ts` calls it. Shift+Left-Click on any stack of >1
(backpack/hotbar/chest/drying-rack — anywhere `beginItemDrag` is the entry point) now
splits it roughly in half into another empty slot in the same container, then drags the
split-off half — reuses 100% of the existing drag/drop/merge machinery
(`MainScene.trySplitStack` + `beginItemDrag`), no new resolve-time logic needed. Falls back
to a normal whole-stack drag if the container has no empty slot to split into.

**Ranged weapons (Slingshot + Javelin) + Ammo equipment slot.** Locked via
`AskUserQuestion` + a side-chat balance discussion: ranged aiming reuses the existing
click-a-hovered-enemy-in-reach model (NOT free-aim); Slingshot uses a new **`"ammo"`**
`EquipSlot` (paper-doll grid, now 10 slots — `ARMOR_ROWS_MAX` is computed, not a literal);
Javelin is a self-contained disposable hotbar weapon (no ammo slot — throwing depletes its
own stack). **`EquippedItem` gained a `count?: number`** field so the ammo slot could reuse
the *existing* armor-equip machinery (`equipArmorFromContainer`/`unequipArmorSlot`/
`armorSlotAt`/right-click context menu) almost verbatim — it branches on `slot === "ammo"`
for merge-not-swap semantics (topping up a matching key vs. swapping a different one out),
rather than building a parallel ammo system. `slingshot_pellets`'s `ItemDef.armorSlot` is
literally `"ammo"`, so `quickMoveItem`'s existing `armorSlot` branch covered double-click
equip for free with zero new code there.
`tryAttackEnemy` is now a thin dispatcher (`isRangedWeapon` check) over `tryMeleeAttack`
(the old body, unchanged) and new `tryRangedAttack`; both funnel into a new shared
`resolveWeaponHit(enemy, dmg, dmgType)` extracted from the old kill-resolution tail (skill
XP/loot/armor-XP/run-scoring), so melee and ranged can't drift out of sync on kill logic.
Ranged damage (incl. any stagger multiplier) is computed once at fire time and carried by
the `Projectile` — reused verbatim, it was already built anticipating this (`sourceIsPlayer`
was defined but unused). New `playerProjectiles` group + overlap-vs-`enemyGroup` (mirrors
the enemy-projectile-vs-player overlap exactly, including the arg-order gotcha). A new
`RANGED_WEAPONS` config in `Weapons.ts` (`maxRangePx` replaces melee `enemyReach()` for both
the attack gate and the hover prompt/reach-ring). **Balance is deliberately weak per
the user's locked side-chat direction — an opener/softener, not a solo tool:** Slingshot 2
dmg/650ms/6 stam (below even Wood Club's 3 dmg), Javelin 5 dmg/900ms/16 stam, both slow
projectiles (420/300 px/s) and bounded range (260/220px) — stamina cost + slow travel +
bounded range are the anti-kite governor this batch; **no enemy-AI changes**. Both use
`"ranged"` as their primary damage type, finally giving the long-dormant Ranged weapon skill
a real XP source (`weaponSkillDamageMultiplier` already generic over `DamageType` — zero
`Skills.ts` changes needed). `Recipe.output` gained an optional `count` field (defaults 1)
so Slingshot Pellets (5 Stone → 25) and Javelin (3 Wood + 1 Stone → 2) can batch-output —
`craftRecipe` now grants `output.count ?? 1` instead of a hardcoded 1.

**Minimal SFX layer.** `src/systems/Sfx.ts` (`SfxPlayer`) — raw Web Audio
`OscillatorNode`/`GainNode` envelopes synthesized at call time, no asset files, same
"generate in code, swap for real assets later" ethos `BootScene` established for textures.
Six cues (`hit`/`pickup`/`craft`/`levelUp`/`nightfall`/`death`) wired into existing hook
points (`resolveWeaponHit`, `applyDamageToPlayer`, `collectNode`, `craftRecipe`/
`processRackAmount`/`cookAtCampfire`/`refineTrophies`, `showLevelUpBanner`, the day→night
edge in `updateDayNight`, `onPlayerDeath`). A persisted on/off toggle
(`survivor-rpg:sfx-enabled:v1`, same pattern as Hints') lives in `PauseMenuUI` next to the
Hints toggle. `sfx` is deliberately **not** re-created in `create()` (unlike `hints`) so the
`AudioContext` + preference survive a "New Run" restart instead of resetting with the rest
of per-run state.

**Verification:** `tsc --noEmit` clean; full `npm run build` succeeds. **Live-verified via
`preview_eval`** (after clearing 5 orphaned Vite processes from closed chats that were
holding the per-folder server cap): Slingshot fires a player projectile at a 150px enemy
(out of melee reach) → 2 dmg on impact, projectile despawns, ammo 30→29, stamina −6,
cooldown stamped; firing at 0 ammo is a clean silent no-op (no projectile/stamina/
cooldown); out-of-range (400 > 260) doesn't fire or consume ammo; the hover prompt +
`attackRangeFor` correctly report the 260px ranged radius. Javelin self-consumes 1/throw
and auto-unequips (weapon→null, slot→null) at 0. Melee is unaffected (Wood Club still hits
at 50px for 3 dmg, reach stays 64, does NOT inherit the ranged radius; no-ops at 200px).
Auto-sort merges+front-packs (wood 5+10→15, alphabetical); Shift-split 11→6+5 into the
next slot, null fallback when the container is full. All 6 SFX cues fire with no console
errors. The inventory panel renders the Sort button, the Ammo equipment slot (with count
badge), and the "Ammo: N …" Combat-column line.

### 5aa — Third playtest fix batch (placement, level-up flash, resting, sliders, boss/camp fixes, victory-screen lock)

An 11-item feedback batch off the user's continued playtesting (post-5z). Sonnet-class
fixes/tuning on already-designed systems — no new mechanic.

**Placement mode no longer re-arms after one placement (`MainScene.attemptPlaceObject`).**
The "stays armed so you can place several in a row" behavior (shipped in 5z) was built
anticipating a workflow the user doesn't want — a successful placement now always calls
`cancelPlacement()` immediately, both for crafted placements and re-placing an owned
stack (previously that path only exited once the very last owned copy was placed).
Placing another requires a fresh Place click / hotbar selection, matching how every
other equip-and-act flow already works.

**Level-up feedback drops the whole-screen `camera.flash` entirely
(`MainScene.showLevelUpBanner`).** Two prior tuning passes (5z included) dialed it down
and it still read as "annoying" — cut outright, replaced with a small local glow circle
behind the punch-in banner text (a growing, fading `Graphics` circle, screen-space,
scoped to the banner's own area) so there's still a "big deal" beat without washing the
whole screen.

**Station label depth fix — "hover a bench, the text is hidden behind other benches"
(`MainScene.refreshStationLabel`).** The per-station upgrade-tier label
(`this.placedLabels`) was a world-space `Text` with no explicit depth (default 0), so
any nearby placed object's own y-sorted depth (up to ~2400) could render right over it.
Now pinned to depth 2500 — above every world object, still below the fixed HUD
(2600+), same convention the hover-highlight outline already uses.

**Comfort resting is now aggro-gated, not radius-gated
(`MainScene.isAnyEnemyAggro`, replaces `isEnemyNearby`).** "As long as no enemies are
aggro'd on you, you should be able to rest" — the flat `COMFORT_SAFE_RADIUS` (350px)
blocked resting even when nearby enemies were just idling/wandering, not a real threat.
"Safe" is now `enemy.isAggro()` across all live enemies, regardless of distance.

**Crafting-menu batch slider now reads in OUTPUT units, not craft-repetitions
(`CraftingMenu.ts`).** Most recipes are 1:1 so this was invisible, but Shishkabob (x2),
Slingshot Pellets (x25), and Javelin (x2) all grant more than one item per craft — the
"Qty: N / max" readout and the "Craft xN" button now show `batch * recipe.output.count`
instead of the raw batch count, so the slider reads as "how many items," matching the
Drying Rack's existing output-based slider (4f).

**Cook menu intro blurb no longer overflows the panel, and is confirmed pinned at the
top (`CookingMenu.ts`).** The "Cook meat and vegetables..." blurb rendered as one
unwrapped line that could run past the panel's right edge; now wrapped to the panel
width with its real (possibly 2-line) height measured up front so the panel is sized/
centered around it correctly, right under the title. Also fixed a second, worse overflow
in the footer's selected-dish cost line: it repeated the dish's own name
(`"${recipe.name} — ${costParts}"`, already shown on the row above) which was wide
enough on 3-ingredient dishes to run under the Cook button — now cost-only, plus a
wordWrap safety net stopping short of the button column either way.

**Crafting a stackable item you already have in the hotbar now tops that stack up
first (`MainScene.addToBackpack`/`topUpExistingHotbarStack`).** Previously EVERY craft/
cook/process/refine output landed straight in the backpack regardless of what was
already equipped in the hotbar. `addToBackpack` now tops up a matching hotbar stack
(any slot, up to its max) before falling back to `backpack.add()` — but only tops up an
EXISTING stack, never places a new item into an empty hotbar slot (that would be a
surprising side effect of crafting).

**Boss wanders back to its spawn point once deaggro'd (`GremlinKing.updateIdle`).**
Getting kited past the leash mid-charge used to leave the King standing wherever it
ended up, fully idle. The deaggro'd branch now walks it back toward `spawnX/spawnY` at
`BOSS_MOVE_SPEED` (re-aggroing normally if the player wanders back within
`BOSS_AGGRO_RADIUS` along the way) instead of freezing in place.

**Gremlin Shack guards near the War Camp never respawn, and the huts are folded into
one map POI (`GremlinShack.nearCamp`, `MainScene`).** The 3 shacks fanned inside the War
Camp (vs. the 2 wild standalone ones) had their guards firing the same 6-min respawn
timer as every other shack — with no idea a Gremlin King fight might be in progress,
guards could pop mid-boss-fight. `onShackGuardKilled` now no-ops the respawn schedule
entirely for `nearCamp` shacks (the camp's own density — `spawnAltarDensity` — covers
ongoing camp danger instead); wild shacks are unaffected. `updateAltarDiscovery` also
now skips adding a separate "Gremlin Shack" landmark for `nearCamp` shacks — they're
part of the "Gremlin War Camp" POI, not their own, so the map doesn't show 4 markers
stacked on top of each other.

**Victory/Death screen now actually freezes input (`MainScene.create`'s global
listeners).** `update()` already early-returned on `runOver`, but the global
`pointerdown` handler and several `keydown-*` listeners (TAB, K, M, R, V, O, H, the
hotbar-select keys, mouse wheel) had no `runOver` guard at all — a player could still
craft, gather, attack, or open menus behind the RunEndUI. All now short-circuit on
`this.runOver`.

**Verification:** `tsc --noEmit` clean; full build unaffected. Extensive live
`preview_eval` verification (console error-free throughout): placement exits after one
object; hotbar stack topped 2→4 on a matching craft; `isAnyEnemyAggro` replaces the old
radius check; crafting-menu Qty/button read output units (Shishkabob batch 5 → "Qty: 10
/ 238", `output.count` 2); station labels report depth 2500; boss walked back toward
spawn (velocity pointed home, x decreasing) once forced deaggro'd from 700px out; a
War-Camp shack's guards left `respawnAt: null` after both were killed; the explored-map
landmark list held exactly one "Gremlin War Camp" entry near 3 discovered huts; TAB
opened the crafting menu normally but was a no-op once `runOver` was set (verified via
real `keyboard.emit('keydown-TAB')` dispatches); Cook menu blurb wrapped to 2 lines
within the panel; footer cost line for a 3-ingredient dish rendered without running
under the Cook button.

### 5z — Second playtest polish batch (SFX feel, toast fix, batch sliders, gating, forge UI)

Plan: `.claude/plans/nimble-polishing-lantern.md`. A 14-item feedback batch off the user's
5y playtest — fixes/tuning/UI on already-designed systems, built on **Sonnet** per the
model-switch convention (no new mechanic). Two forks locked via `AskUserQuestion` before
starting: Javelin's gate = tier-1 (Workbench-proximity, like Stone Pickaxe), not an
upgraded-Workbench gate; the trophy-generalization discussion (#14) = don't merge the
data model, just consolidate the Relic Forge's roll UI.

**SFX/feel tuning (`Sfx.ts`, `MainScene.ts`, `Boar.ts`).** `hit()` gain 0.1→0.035 and
shortened 90→55ms (was "annoying" at sustained combat pace — it fires on every hit both
directions). New `Sfx.skillUp()` (quiet two-note blip) fires from `skills.onLevelUp`,
distinct from the fuller `levelUp()` triad reserved for Player-level. The Player level-up
`camera.flash` cut 300ms@(48,36,12) → 150ms@(20,15,5) (still no shake) — "full screen
flash is too much" was itself a second dial-down of an already-softened flash from an
earlier batch. Boar charge `CHARGE_MAX_DISTANCE` 230→170 and `CHARGE_RECOVER_MS` 820→550
(still a real punish window, less brutal overshoot/recovery).

**Top-middle toast overlap — root cause found and fixed (`EventLogUI.ts`).**
`showToast`'s old `y = 72 + activeToasts * 40` counter decremented on fade-**complete**,
but toasts share a fixed delay+duration so the earliest-created one always completes
first — its slot could free up while a LATER toast was still visible, and the next toast
reused that Y and overlapped it (rapid cooking made "Cooked X" toasts collide; affected
every `info`/`combat`/`levelup` toast, not just cooking). Replaced with a reflowing
`activeCenterToasts: {height}[]` list (mirrors the `activeRecipeToasts` pattern already in
the same file for the side toasts) — each toast gets a real cumulative-height slot and
splices itself out on fade-complete. *Verified live: 3 rapid `info` toasts got distinct
stable-height slots (34px each), no overlap.*

**Crafting menu stays open through placement + re-arms on a new Place click
(`MainScene.ts`, `CraftingMenu.ts`).** Reverses a 40-min-batch fix that CLOSED the
crafting menu on `startPlacement` (to kill an "every craft click drops a workbench"
fall-through bug). That old bug is now prevented a different way: the global pointerdown
handler already returns early for any click landing on the still-open crafting panel
while `placementMode` is set (`craftingMenu.containsPoint` guard, pre-existing) — so
`startPlacement` no longer needs to close the panel to stay safe. `startPlacement` is now
idempotent/re-entrant: calling it again while already mid-placement (e.g. clicking a
DIFFERENT placeable recipe's "Place" button) destroys the old ghost and re-arms to the new
recipe instead of leaking a ghost or stacking placements. `attemptPlaceObject` also now
calls `craftingMenu.refresh()` so the live cost readout stays accurate as materials are
spent across repeated placements. *Verified live: workbench→campfire re-arm swapped the
ghost texture cleanly with the crafting menu staying open and zero actual placements
landing; the old fall-through bug confirmed still dead (panel clicks return early).*

**Batch-quantity sliders for stackable crafting + cooking
(`CraftingMenu.ts`, `CookingMenu.ts`, `MainScene.ts`, `ItemContainer.ts`).**
`craftRecipe`/`cookAtCampfire` both gained a `batches` param (default 1, loops the
existing per-unit craft/cook + grants total output, one shared commit) backed by new
`maxCraftBatches`/`maxCookBatches` (min of cost-affordable batches and
`ItemContainer.roomFor()`-bounded batches — `roomFor` is a new `ItemContainer` method,
`hasRoomFor`'s boolean check generalized to return the actual remaining capacity).
**CraftingMenu**: a slider appears above the Craft button only for non-placeable,
stackable-output (`maxStack > 1`) recipes with >1 batch affordable; the ingredient-cost
readout scales live with the slider, button reads "Craft x{N}", one `ProgressBar` covers
the whole batch. **CookingMenu was restructured** from "each row has its own inline Cook
button" into a select-a-row-then-shared-footer flow (mirrors CraftingMenu's list+detail
shape) — clicking a dish row selects it (highlighted border) instead of cooking it
immediately; a new footer below the row list shows the selected dish's batch-scaled
ingredient cost, a slider (when >1 batch is affordable), and one Cook button. Both
sliders share MainScene's existing global pointermove/pointerup drag plumbing (extended
with `isDraggingSlider`/`updateSliderFromPointer`/`endSliderDrag`, same pattern
`DryingRackMenu`'s amount slider already used). *Verified live: 3-batch Shishkabob craft
spent 3 wood → 6 shishkabob (recipe now 1 wood → 2, see below); 4-batch Cooked Boar Meat
spent 4 boar_meat → 4 dishes; dragging the cooking slider to max showed "Qty: 6/6" and
"Cook x6" with the ingredient text scaling to match.*

**Drying Rack output slot shows the output item's icon (`DryingRackMenu.ts`).** The
"→ N Twine" preview text now sits next to a small icon of the actual output item
(`itemDef(recipe.output).texture`), reading visually like the input slot instead of
text-only.

**Shishkabob recipe + art (`Recipes.ts`, `BootScene.ts`).** Output bumped to `count: 2`
(1 Wood → 2 Shishkabob, cost unchanged). Texture redrawn from a stick-with-red/green-
chunks (which "already looked full of stuff") to a bare wooden skewer with a sharpened
tip — chunks now only belong on the COOKED dishes.

**Javelin + Slingshot Pellets recipe gating (`Recipes.ts`, `Crafting.ts`).** Javelin
bumped tier 0→1 (Workbench-proximity gate, like Stone Pickaxe/Slingshot — the locked fork
answer) + `requiredSkills: [{skill: "pierce", level: 5}]` — a free starter javelin at
Pierce 0 undercut the point of the (also-ranged, pierce-typed) Slingshot as the actual
early opener. New `Recipe.requiresDiscovered?: string[]` field + a
`Crafting.otherRecipesDiscovered` check: Slingshot Pellets now stays hidden until the
player has crafted a Slingshot at least once (`requiresDiscovered: ["slingshot"]`) — stone
is common enough it would otherwise appear immediately, well before there's a launcher to
load it into. *Verified live: both hidden pre-gate, both discovered immediately after
placing a workbench+Pierce 5 / crafting a slingshot respectively.*

**Relic Forge roll UI consolidated to one button per RARITY, not per species
(`RelicForgeMenu.ts`).** From the #14 discussion: species trophies (Boar/Snake/Gremlin)
stay separate as drops (flavor + M-W1 per-source-rarity scaffolding — NOT merged), but
since they already share identical odds/pity by rarity (5n), showing 3 near-identical
"Bind X Trophy" buttons was pure UI noise. New `rarityGroups()` groups every owned trophy
key by its `TROPHY_ROLL` rarity and renders ONE button per group ("Roll a Common Trophy",
showing the combined count); `pickTrophyToRoll()` consumes whichever species has the
highest count on click, draining stock evenly rather than favoring one arbitrarily. Odds/
pity/reveal-fx are unaffected (same `beginRoll` path, just fed a different key). *Verified
live: 3 owned trophy types (gremlin/boar/snake, totaling 9) collapsed into one Common
group; the picker correctly chose the highest-count species (boar_trophy, 5 owned).*

**Dashboard "sometimes doesn't load" — investigated, no bug found.** `/dashboard.html` is
a second Vite entry that only serves while `npm run dev` is running THIS project.
`.claude/launch.json`'s Preview config has `"autoPort": true`; if a stale/orphaned Vite
process from an earlier closed session is still holding port 5173 (exactly what happened
in 5y — 5 orphaned processes), a *new* session's dev server silently starts on 5174+
instead, but a bookmarked fixed-port URL still points at 5173 — looks broken even though a
server IS running. No code fix applies; environmental (kill orphaned `node.exe` processes
before starting a fresh session).

**Verification:** `tsc --noEmit` clean; full `npm run build` succeeds (main bundle
>500kB warning is pre-existing/unrelated). Extensive live `preview_eval` verification per
item above (console error-free throughout). `RECIPES.md` updated (Shishkabob output x2,
Javelin tier 1 + Pierce 5, Slingshot Pellets discovery-gate footnote).

### Enemy respawn — fog top-up (playtest food-economy fix)

Off the master-plan build order, built on **Opus** (a new spawn subsystem with its own
timing/state, not just a tuning change). Playtesters were burning through food far faster
than expected because the enemy roster was **one-shot and finite** — only wild (non-camp)
Gremlin Shack guards ever came back (their own 6-min pair timer). Meat sources (Boar/Snake)
drained to empty over a run. Now the world keeps itself huntable.

**Model (locked with the user via `AskUserQuestion`): fog top-up**, chosen over per-kill
replacement and full-world repopulation. A periodic check (`MainScene.updateRespawns`, every
`RESPAWN_TICK_MS` = **30s**, called from `update()`'s **alive branch only**) keeps the live
non-boss enemy count within `RESPAWN_NEARBY_RADIUS` (1500px) of the player topped up toward
`RESPAWN_NEARBY_TARGET` (10), spawning at most `RESPAWN_PER_TICK` (1) replacement per tick. At
1/30s that repopulates a fully cleared area in **~5 min** — the locked pace (an initial 7s/
~1-2 min tick felt way too fast in playtest; the user wanted ~5 min/area max). Bounded both
locally (the target) and globally (`RESPAWN_MAX_LIVE` 160) so camping can't build a swarm and
a long run can't run away.

**Off-screen spawns.** Reuses the nightfall-surge spawner: `pickNightSpawnPoint` gained
optional `ringMin`/`ringMax` params (default to the night constants), and respawns call it
with `RESPAWN_RING_MIN`/`_MAX` = **1150–1600px** — just past the camera's ~1102px
half-diagonal, so a replacement never materializes on-screen. Verified live via
`preview_eval`: at every realistic in-biome player position (center out to the ~1800px biome
edge) **100% of 200 sampled spawns landed >1102px away**; the only close spawns occur way out
in the empty outer grass (2800+px from center) where ring points clip the world edge and get
clamped — a spot players never hunt.

**Species mix.** `makeRespawnEnemy` weights by the baseline `spawnEnemies()` counts
(Boar 24 / Snake 28 / RangedGremlin 22 / MeleeGremling 8 = 82), so meat sources (~63%)
dominate — respawns fix the food shortage directly while keeping variety. Elite rolls at the
standard `rollElite` chance, night-boosted (`NIGHT_ELITE_CHANCE_MULT`) like every other spawn
path, so trophies stay renewable too.

**Excluded:** Gremlin King / Gloamwarden (one-shot win/mini-boss — filtered from both the
count and the spawn table), and the Gremlin Shack guards keep their own timer untouched.
`respawnAccumMs` resets in `create()` per the `scene.restart()` field-init gotcha. Verified:
tsc clean; the top-up paces exactly 1/tick up to the target of 10 then stops; no console
errors. No `RECIPES.md`/dashboard change (no recipe or enemy-stat change). One bounded
tradeoff, noted in-code: enemies you kite far away and abandon still count toward
`RESPAWN_MAX_LIVE`, so a very long roaming run could eventually park at the cap — the cap is
generous enough that this stays theoretical.

### M-SS — Stats & Skills depth pass (crit + distinct-axis effects + relic synergy)

Plan: `.claude/plans/crit-tempering-lodestar.md`. Built on **Opus** (crit is a new combat
mechanic + the relic change is a data-model change). Fixes the "Stats/Skills feel
negligible next to Relics" problem via the locked three-layer split: Relics = raw-% stat
layer, crafted gear = uniqueness/procs (M-TE, later), and **Stats/Skills = the reliable,
player-steered layer on axes relics don't touch** — plus making relics *synergize with*
stats instead of dwarfing them.

**Crit system (the headline).** Split by AXIS, not weapon class: **Strength = crit
multiplier** (+0.04×/pt, retired the old melee stamina-cost knob), **Agility = crit
chance** (+0.5%/pt, retired the ranged one), both **all-weapon**, multiplying together so a
crit build wants both. **Per-weapon base crit** lives in `Weapons.ts`
(`WEAPON_BASE_CRIT_CHANCE`/`_MULT` + getters) — slow/heavy weapons get higher base
(primal_spear 8%/1.6×, fast bone_knife 4%/1.5×), doubling as an attack-speed lever. The
locked pipeline is `weaponBase × (1+skill%) × (1+relic dmg%) × staggerMult ×
(critRoll?critMult:1)` — crit is the final multiplicative step. `MainScene.applyCrit()`
rolls it (chance/mult = weapon base + stat + relic, soft-capped `CRIT_CHANCE_CAP` 0.60 /
`CRIT_MULT_CAP` 3.0, `Math.random` — combat crit isn't seeded), called from both
`tryMeleeAttack` (rolled at hit) and `tryRangedAttack` (rolled at fire, baked into the
projectile via a new `Projectile.isCrit` — no weapon context at impact). A crit tints the
floating damage number orange-yellow + "!" and plays a new `Sfx.crit()` cue. The inventory
Combat column + the weapon Tooltip both surface crit (base + live stat/relic rollup).

**Stat rework (`Progression.ts`).** Every stat now has a live effect: **Endurance** +3 max
stam **and** +2% stamina-regen rate/pt; **Vitality** +4 max HP **and** +1.5%
healing-received/pt (amplifies food/Comfort/kill-heal, NOT passive regen — there is none);
**Intelligence** +1.5% skill-XP/pt (stacks with the Scholar's-Idol relic + is applied in
`awardSkillXp`); **`willpower` renamed `wisdom`** = +2% buff/food duration/pt. New getters:
`critChanceBonus`/`critMultBonus`/`healingReceivedMult`/`staminaRegenMult`/`xpMult`/
`buffDurationMult`. `weaponStaminaCostMultiplier` **retired** — grep'd out of MainScene (×3),
Tooltip, and CraftingMenu (their weapon "Stamina" tooltip line now shows the authored base;
only relics discount stamina now).

**Skill rework (`Skills.ts`).** Second/first real effects for one-note & dormant skills:
**light_armor** → +5ms dash i-frame/level over the 150ms base, cap +100ms (Monster Hunter
"Evade Window", added to `DASH_IFRAME_MS`); **running** also cuts sprint stamina drain
−1%/level cap −40%; **chopping/mining** → +1%/level (cap 60%) chance for a bonus +1 drop on
a depleted tree/rock (incl. cracked Gloam ore), rolled in the tool-swing path. `heavy_armor`
+ `blocking` stay deliberately dormant (biome-2 heavy gear / a real block mechanic) with an
explicit "no effect yet" impact line. **Per-piece armor XP** — the kill loop now awards +30
per *worn piece* (`armorTypesWornPerPiece`, replacing the old per-distinct-type
`armorTypesWorn`), so full-light (3) gives 3 light ticks and heavy_armor will accrue
naturally once biome-2 heavy gear ships. The 5 weapon-damage skills are unchanged (+0.5%/lvl)
— reserved as the M-TE proc-threshold hook.

**Relic synergy (`Relics.ts`).** HP/stamina relic channels went **flat → percent**
(`maxHpPct`/`maxStaminaPct` + `maxHpPctMult`/`maxStaminaPctMult` getters): Stout 15→15%,
Vigor 25/20→20%/18%, Titan 50/35→40%/30%. `MainScene.syncStatBonuses` now compounds
`(100 + statBonus) × relicPctMult − 100`, so stats × relics multiply (verified: 20 Vitality
→ base 180, +Stout+Vigor 35% → 243 max HP). New **crit relic channels** (`critChancePct`/
`critDamagePct` + getters) with two seeds — Common **Keen Charm** (+5% crit chance),
Uncommon **Savage Idol** (+0.30× crit dmg). `scaledEffectText` updated for all new channels;
`allocateStat` now always re-syncs (every stat feeds a cached multiplier now).

**Verified live** (`preview_eval`, console error-free): every stat getter (20 Vit → healMult
1.3, 10 End → regenMult 1.2, 10 Str → +0.4 crit mult, 10 Agi → +0.05 crit chance, 5 Int →
xpMult 1.075, 5 Wis → buffDurationMult 1.1); relic %-HP compounds the stat base (180×1.35=243
HP, 130×1.18=153.4 stam); crit rolls & applies (primal_spear 18%×2.30 → 10 dmg crits to 23,
non-crit 10) and both caps hold (mult 3.0 → 30, chance 0.60); heal 10×1.3=+13, buff 1000×1.1
→ 1100ms, stamina regen 20×1.2 → +24/s; all four skill getters + impact strings correct
(dash +100ms cap, drain 0.6, chop 30%, mine 60% cap); per-piece armor XP returns 3 light
entries for 3 worn pieces; Combat column reports crit 18%×2.30. `tsc --noEmit` + full build
clean. `RECIPES.md` relic table + dashboard weapons tab (base-crit + eff-DPS columns)
updated. See [[survivor-rpg-stats-skills-relics-direction]].

### Playtest polish batch — hints, elite tooltip, javelin, dash VFX, miniboss leash, text timings, stats display

Grab-bag of 11 playtest-feedback fixes (Sonnet-class polish on existing systems, no
new mechanic). Verified live via `preview_eval` + screenshots; `tsc --noEmit` clean.

- **F11 fullscreen reminder** — folded into the `awaken` hint text and added a
  "Fullscreen: F11" line to the Keybinds panel (F11 is the browser's own native
  fullscreen; nothing to wire).
- **Right-click discoverability** — new `right_click_tip` hint ("Right-click equipped
  gear or a placed station to inspect and upgrade it") triggered the first time the
  player places a station OR equips an armor piece, plus a "Inspect / upgrade: Right
  Click" Keybinds line.
- **Elite/boss red hover tooltip** — `promptForEnemy` now prefixes `Elite ` for
  `enemy.elite`, and a new `promptColorFor()` tints the bottom-right prompt text:
  crimson `#ff5a5a` for a boss/mini-boss (`GremlinKing`/`Gloamwarden`), orange
  `#ff9d5c` for elites, white otherwise. Verified: "[LMB] Attack Elite Boar".
- **Javelin art + thrown angle** — `icon_javelin` redrawn DIAGONALLY (bottom-left →
  top-right) so it no longer reads like the vertical Primal Spear icon. The in-flight
  javelin now flies nose-first: added `ProjectileConfig.artAngleOffset` (applied in
  `setRotation`) + `RangedWeaponConfig.projectileArtAngleOffset` = `Math.PI/2` for the
  javelin (its streak art points up). Verified rotation = angle+90°.
- **Dash more obvious** — `Player.playDashFx()` spawns 3 staggered translucent
  blue-tinted afterimage ghosts of the player sprite that fade/shrink over 260ms;
  called from the `frame.dashStarted` branch in `update()`.
- **Gloamwarden roams back to spawn** — its `updateIdle` deaggro branch now walks the
  mini-boss back toward its spawn point (mirrors `GremlinKing`'s `RETURN_HOME_EPS`
  return-home behavior) instead of idling wherever it was kited to.
- **All text fades slower** (playtest: "text isn't fading out slow enough", gloam-shard
  help vanished too fast) — HintUI HOLD 5200→8000 / FADE 700→1400; EventLogUI recipe/
  material toast HOLD 3200→5500 / FADE 900→1500; center toast delay 2200→4000 /
  duration 900→1500.
- **Altar/win-path guidance** — two new hints so the goal is clear after clearing camps:
  `altar_found` (fires when the War Camp altar is discovered on the map) and
  `totem_ready` (per-frame idempotent poll — fires once the player holds a
  `gremlin_totem`, pointing them to place it in the Boss Altar's fire). This
  deliberately relaxes the old "never spell out the win condition" hint rule, per
  the user's request.
- **Stats page total effect** — new `Progression.statTotalEffect(stat, p)` returns the
  CURRENT cumulative effect of points already spent (e.g. Vitality 5 → "+20 max HP,
  +7.5% healing"); shown as an amber "Now: …" line under each stat in `CharacterMenu`'s
  Stats tab (row height 44→52 to fit the third line).
