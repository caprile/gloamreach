# Status

## Current State

_Living snapshot — edit in place, never append. Last shipped: **elite melee reach
fix** (+ Gloaming Vein plan drafted), **2026-07-11**._

**The game.** Top-down 2D pixel survival-ARPG (Phaser 3 + TypeScript + Vite; all
textures are placeholders generated in `BootScene`). One forest biome on a ~2x world
with a day/night cycle and a hardcore run/score meta-loop (seed is display-only for
now). Shipped systems: gather/craft with tool-KIND gating + a Workbench tier gate;
souls-like telegraphed combat on **every** enemy (Boar charge, Snake coil-lunge,
Gremlin/Gremling claws) plus the first boss (Gremlin King — poise/stagger + leaping
smash / charge / ground slam, enrage <50% HP); stamina/sprint/dash with dash i-frames;
Skills + Player Level progression; placeable stations (Campfire, Drying Rack, Relic
Forge, Bedroll); cooking → timed HP-regen food buffs; wearable 3-tier Gremlin armor +
weapon/station upgrades; elites (chance-based rolls + forced-elite shack guards)
dropping per-species trophies; a probabilistic trophy→Relic economy; minimap + fog of
war; the Gremlin War Camp POI; contextual hints + a pause menu; and a drift-free
balancing dashboard at `/dashboard.html` (second Vite entry, imports live data modules).

**Meta-loop** (`.claude/plans/roguelike-metaloop-master-plan.md`): M-FX / M-R1 /
M-DN / Comfort(M-SB) / M-EL2 / M-RL / M-WC all shipped; M-FA cut. Hardcore one-life
death ends a run and posts a `localStorage` high score; killing the Gremlin King =
win. Deterministic seeded world-gen is still deferred to M-W1.

**In progress / next.** **Gloaming Vein** (mineable rarity-ore POI + gated trophy
refinement) is designed + locked with a committed plan
(`.claude/plans/amethyst-warding-vein.md`) but **not yet built** — a content+economy
pass on the M-RL relic loop, slotting in ahead of M-TE. Then **M-TE** (trophy-gated
special gear) and **M-W1** (circular multi-biome world) last. A separate playtest-polish
backlog also remains: discovered-material toast, hover highlight on interactables,
inventory auto-sort, minimap nearby-view + full-map rework, a ranged starter weapon, and
passive HP regen.

**Known issues / open.**
- Boss may be slightly overtuned after the 5s damage bump (the user's "TBD" — left as-is
  since the harder feel was wanted). 5t cut the smash AoE 120→95 so it's movement-dodgeable;
  dash i-frames confirmed working against it.
- Enemy shove-knockback is near-cosmetic — `Player.update()` zeroes idle velocity each
  frame; deferred to a combat-feel pass.
- No save/load beyond the high-score table; all run state is in-memory only.
- The dashboard **Enemies tab is the one hand-mirrored data source** — keep it in sync
  when tuning enemy stats (everything else on the dashboard is imported live).

## Recent Entries

> Older entries in STATUS-archive.md.

### Just finished: Elite melee reach fix + Gloaming Vein design

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
