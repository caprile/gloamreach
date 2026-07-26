# Souls-like Common-Enemy Combat — telegraphed attacks + dodge/punish windows

## Context

the user's 25-min playtest flagged combat as "kite forever by spam-left-click + walk
away" — common enemies have no risk: they bite instantly the frame they're adjacent and
off cooldown, so you can facetank or kite with zero counterplay. Triage locked (see
`memory/survivor-rpg-playtest-feedback-2026-07-11.md`): give **every** common enemy
(Boar / Snake / Gremlin / Gremling) a readable **telegraphed attack** with a **dodge
window** and a **recovery/punish window**, the way `GremlinKing` already works.

**This pass is the mechanic only.** Balance *numbers* (armor nerf, enemy-damage buff, boss
damage bump, cleave replacement) are a separate, later Sonnet pass — deliberately deferred
per the user's "get core mechanics playtest-ready first, defer balance numbers." New
mechanic → **Opus**.

Direction locked with the user this session:
- **Per-enemy bespoke attacks, not one uniform system.** Harder enemies (Boar, ranged
  Gremlin) should feel mechanically distinct; common trash (Gremling) can stay simple and
  kiteable ("some you can kite and that's ok"). Not every enemy needs a complex moveset.
- **Tells are animation/motion/tint** (rear-back, wind-up, lunge) — **NOT** world-space red
  arcs/lines (the user: "too goofy"). Hit areas stay implicit; players learn hitboxes over
  time. (No audio system exists in the project — confirmed — so sound tells are a *future*
  add; visual/motion only now. Textures are `generateTexture` placeholders with no frames,
  so "animation" = tween-driven scale/tint/motion, not sprite sheets.)
- **Ranged Gremlin:** telegraph its **melee claw only** (leave the 2-shot projectile burst
  as-is — projectiles already travel and are dodgeable). Also make the melee trigger only
  when the player is right on top of it (the user's never even seen it claw).

## The shared mechanic (commit → wind-up → strike → recover)

Today a melee enemy's `update()` returns `true` the instant it's within `MELEE_RANGE` and
off cooldown, and `MainScene.updateEnemies()` (`src/scenes/MainScene.ts:2991`) applies
`enemy.biteDamage` — damage on *contact during approach*, no window.

New per-attack skeleton every telegraphed attack follows:
- **wind-up** (`windupMs`): on entering attack range & off cooldown, plant (or rear), play
  the visual tell, and **lock** facing/target. **No damage yet.** ← this is the dodge window.
- **strike**: after `windupMs`, hit-check the player's **current** position against the
  attack's reach in the **locked** facing. Still in reach → `return true` (existing damage
  contract fires). Out of reach → whiff. Re-checking at strike time (instead of damage on
  contact) is precisely what makes wind-up dodging real.
- **recover** (`recoverMs`): enemy planted/slowed and **vulnerable** → punish window. Then
  the normal attack cooldown.
- While `isAttacking()` (wind-up/strike/recover) the enemy's movement code holds, so it
  genuinely commits.

The melee damage path stays the existing boolean contract — `update()` returns `true` →
`applyDamageToPlayer(enemy.biteDamage)` — the `true` just now fires at the strike tick after
a wind-up and only on a passing re-check. **No `MainScene` change needed** for the base
melee case. Dash i-frames already gate damage via `invulnerableUntil` in
`applyDamageToPlayer` (`MainScene.ts:3058`), so dashing through a strike already negates it
for free — spatial sidestep during wind-up is the *primary* dodge, i-frames the secondary.

### Reusable helper on base `Enemy` (`src/entities/Enemy.ts`)

Add an **opt-in** attack-phase mechanism to the base class — a shared *mechanism* with
per-subclass *numbers*, exactly like the existing `startPursuit`/`hasGivenUpPursuit`/
`canAggro` give-up helpers (which are shared machinery each enemy tunes radii for). Not a
shared config table — durations/reach/damage stay per-subclass constants, per the standing
"don't generalize per-enemy combat stats" rule.

- Protected state: `attackPhase: "none" | "windup" | "strike" | "recover"`, `attackStartedAt`.
- Helpers: `beginWindup(now)`, phase-elapsed checks, `isAttacking()`.
- `playWindupTell()` — tween-based **scale-punch + brief tint flash** (restored to the
  HP-based tint afterward). Uses `tweens.killTweensOf(this)` care like `playHitFeedback()`
  already does, and scale/tint only (no x/y tween) so it never fights the arcade body.
- Boss (`GremlinKing`) stays untouched — it already has its own richer machine.

## Per-enemy attack identities (creative, differentiated)

1. **Gremling** — weak melee trash, stays simple & kiteable (`MeleeGremling`, `Gremlin.ts`).
   Telegraphed **claw swipe in place** via the shared `tickMeleeSwing`.

2. **Snake** — ambusher (`Snake.ts`). **Coil → locked lunge-bite**: a coil wind-up locks
   the strike direction (no more per-frame homing), then a straight locked lunge; the
   existing flee doubles as the recover/punish window.

3. **Boar** — bruiser / the standout beast (`Boar.ts`; own `update()` override now).
   Signature **charge/gore** (locked direction, overshoots, long recovery) + a quick
   point-blank **gore-bite**. Reuses `GremlinKing`'s locked-charge pattern.

4. **RangedGremlin** — kiter (`RangedGremlin`, `Gremlin.ts`). Kiting/burst untouched;
   telegraph on the **melee claw only** with an optional **shove knockback**.

## Files touched

- `src/entities/Enemy.ts` — attack-phase helper + `tickMeleeSwing` + `playWindupTell` + `applyHpTint` refactor + optional `pendingAttackKnockback`.
- `src/entities/Gremlin.ts` — `MeleeGremling` swipe; `RangedGremlin` telegraphed shove-claw.
- `src/entities/Snake.ts` — coil→locked-lunge strike.
- `src/entities/Boar.ts` — new `update()` override: charge + point-blank gore.
- `src/scenes/MainScene.ts` — reads `enemy.pendingAttackKnockback` in `updateEnemies()`.

## Non-goals / deferred

- **No number rebalance** (armor / enemy damage / boss damage / cleave replacement) — separate Sonnet pass.
- **No audio** — no sound system exists; tells are visual/motion. Sound is a future add.
- **GremlinKing untouched** — already has telegraph/poise.
- **No new player ability** — built entirely on the existing dash/i-frames + spatial sidestep.

## Verification

1. `tsc --noEmit` clean.
2. `preview_start "dev"` → boots; screenshot the boar mid-wind-up (orange tint + scale).
3. `preview_eval`: park player next to each enemy, drive frames, assert
   `windup → strike → recover` with **no damage during wind-up**, damage only at strike,
   and a **whiff** when the player sidesteps during the wind-up. Confirm dash i-frames negate.

### Verification result (shipped)

`tsc --noEmit` clean; console error-free. Live `preview_eval` (isolated enemy, banished the
rest) confirmed for all four: Boar charge (windup→strike→recover→none, 25 dmg at strike,
sidestep whiffs → 0 dmg, scale 1.18 + orange tint tell); Gremling swipe (cyclic, 8 dmg at
strike); Snake coil→lunge (striking→fleeing→hidden, 20 dmg on the lunge); Ranged Gremlin
claw (windup→strike→recover, 10 dmg, kb=210 plumbed). **Known limitation:** the shove
knockback is currently near-cosmetic because `Player.update()` zeroes idle velocity every
frame (overwriting the impulse the frame after) — a *pre-existing* trait of the exact path
`GremlinKing`'s slam already uses; fixing it is a feel change to the boss too, so it's left
for the deferred combat-feel/balance pass.

## Follow-up: playtest bug-fix batch (5 fixes — shipped 2026-07-11)

The next chunk of the 25-min-playtest triage after this combat pass — five independent bug
fixes (Sonnet-class; built this session on Opus). Detail in `STATUS.md`; decisions in
[[survivor-rpg-playtest-feedback-2026-07-11]] and [[survivor-rpg-relics]].

1. **Chest-looted materials never unlocked recipes.** Container→backpack moves use
   `moveSlot()` + `afterItemMove()` and skipped `addToBackpack`'s discovery hook. New
   `MainScene.reconcileBackpackDiscovery()` (in `afterItemMove()`) marks any not-yet-seen
   backpack key discovered and runs `refreshDiscovery()` only when something new appears.
2. **Cook recipes shown before ingredients discovered.** `CookingMenu` gained a
   `discovered: () => ReadonlySet<string>` dep; a dish stays hidden until every ingredient is
   discovered (same rule `Crafting.ts` uses). Empty-state note when nothing's known.
3. **New relic appeared in the grid before the reveal landed.** `RelicForgeMenu` snapshots
   `preRollGroups` before the roll, renders it via `displayGroups()` while spinning.
4. **"Roll Gremlin Trophy" button stuck at 0.** `visibleTrophyKeys()` no longer special-cases
   `gremlin_trophy` — buttons show only when owned, with an empty-state note. **Reverses** the
   earlier always-show-at-0 discoverability decision (see [[survivor-rpg-relics]]).
5. **Level-up flash jumpscare.** `cameras.main.flash` dialed 90,70,20/180ms → 48,36,12/300ms.

Verified: `tsc --noEmit` clean, preview boots error-free, all four logic fixes asserted live
via `preview_eval`. No `RECIPES.md` change.

## Follow-up: armor rebalance (3-tier set) + upgrade-menu polish (shipped 2026-07-11)

The armor half of the triage's "light both rebalance" (Sonnet-class; built on Opus). The old
Gremlin set jumped the full-set defense **9 → 16 in a single upgrade tier** — too much (the user).
Reworked into a **3-tier set with a flat +1 armor per tier**, to the user's exact spec:

- Base defenses (`Items.ts`): shirt 4→3, pants 3→2, cap 2 kept. Per-piece per-tier:
  cap **2/3/4**, shirt **3/4/5**, pants **2/3/4**.
- Full-set totals: **Lvl 1 = 7, Lvl 2 = 10, Lvl 3 = 13** (verified live via `armorDefenseForTier`).
- `ArmorUpgrades.ts`: lvl-2 `defenseBonus` retuned to +1-cumulative; new lvl-3 rows
  (`resultTier: 2`) added per piece (costs escalate from lvl 2, still Workbench-Lvl-2 gated —
  no higher Workbench tier exists yet). `deltaLabel` is the incremental +1; the stored
  `defenseBonus` is cumulative over base (matches `armorDefenseForTier`). No wiring needed — the
  UpgradeMenu / `applyArmorUpgrade` path was already tier-generic (weapon lvl2/lvl3 exercised it).
- The user's note: the +1/tier proportional impact shrinks as raw numbers climb; re-scale per
  future biome, don't assume this curve holds deeper in.

**Same-session upgrade-menu UX polish** (`src/ui/UpgradeMenu.ts`, applies to station/armor/weapon
upgrades since they share the one menu):

- **Timed loading bar before an upgrade lands** — reuses `ProgressBar` (5p) with the same
  commit-at-end + `busy` + cancel-on-close pattern (`UPGRADE_BAR_MS = 500`; `startUpgrade()`
  runs the bar, `deps.apply` fires in `onComplete`; materials consumed only on completion).
  Multi-row tracking via `busyUpgradeId` + a `busyRowRect` re-pinned over the filling row after
  render()'s panelY shift. (TS gotcha: don't null `busyRowRect` at top of render — see
  [[survivor-rpg-timed-bars-gamba-relics]].)
- **Already-applied tiers are hidden, not greyed "(Applied)"** — `render()` filters
  `resultTier > target.tier`; only the next (clickable) + any locked-future tiers show, and a
  maxed piece reads "Fully upgraded." Cleaner panel.

Verified live: cap 0→1→2 each played the bar and committed on completion (materials only spent at
end); applied rows vanished; mid-bar close consumed nothing; max tier showed "Fully upgraded."
`RECIPES.md` armor-upgrades table updated to match.

**Still queued from the triage:** the enemy-damage-buff half of the rebalance, boss damage bump +
GremlinKing cleave replacement, 2 small features (Workbench-placement hint, in-game relic
compendium). Then master-plan tail M-TE → M-W1.

## Follow-up: enemy-dmg buff + boss dmg bump + GremlinKing "leaping smash" (shipped 2026-07-11)

The remaining balance half of the triage's "light both rebalance," plus the boss damage bump and
the cleave-replacement design. Number tuning + swapping one attack inside the existing GremlinKing
state machine (Sonnet-class; built on Opus). The user locked the two open forks via `AskUserQuestion`:
cleave replacement = **leaping smash** (over spinning-sweep / ground-fissure / summon-adds); scope =
**full balance pass this session**.

**Enemy-dmg buff — gremlin-only (the actual "1 dmg/hit" culprit).** The dashboard Balance tab showed
flat mitigation (`max(1, round(dmg − def))`) floored the gremlins' 8-10 dmg to **1** vs Lvl-2 (10) /
Lvl-3 (13) armor, while Boar (25) / Snake (20) still hurt. So the buff is targeted, not
across-the-board (keeps it "light") — `src/entities/Gremlin.ts`:

- `RANGED_CLAW_DAMAGE` **10→15**, `PROJECTILE_DAMAGE` **8→11**, `MELEE_CLAW_DAMAGE` **8→12**.
- Ordering preserved (projectile 11 < gremling claw 12 < ranged claw 15 < Snake 20 < Boar 25);
  elite ×1.5 scales automatically (claw → 23/18). Boar/Snake untouched — already threatening;
  buffing them would be "heavy," not "light."
- Net: vs Lvl-2 armor gremlins now chip ~2-5 (was 1); vs Lvl-3 they trickle to 1-2.

**Boss dmg bump — ~2-shot a full-armor player (the user's spec).** `GremlinKing.ts`: `CHARGE_DAMAGE`
**40→55**, `SLAM_DAMAGE` **45→55**, new `SMASH_DAMAGE` **60**. Sized so two hits through full armor
(Lvl-3 = 13) roughly kill a base 100-HP player (`(60−13)×2 = 94`). All three stay fully
telegraphed/dodgeable — the threat is "respect the tells," not an undodgeable wall.

**Leaping smash replaces the cleave.** The old 140° forward cleave read as "just a worse 360° slam"
(the user). Replaced with a **gap-closer** in the same telegraph/execute/recover machine:

- At telegraph-start the boss **locks the player's position** (clamped to `SMASH_MAX_LEAP` = 380px,
  same non-homing pattern as the charge target — new `smashTargetX/Y`), draws a **growing
  landing-zone marker circle at that locked point** (distinct from the boss's own position, so the
  danger zone reads separately), then leaps to it over `SMASH_LEAP_MS` (300ms) and impacts a 120px
  AoE + 220 knockback on landing.
- It **punishes running away** (the zone chases where you *were*) — the dodge is to step laterally
  out of the marked circle during the 780ms telegraph. Genuinely different read from charge (fixed
  line, sidestep) and slam (fires where the boss stands).
- New plumbing: `smashTargetX/Y`, `smashLanded`, `smashElapsed`; `checkPlayerHit` gates the AoE on
  `smashLanded` so it only connects *after* the leap arrives (null mid-air — verified). Landing is
  driven by arrival-within-`SMASH_LAND_EPS` OR `smashElapsed >= SMASH_LEAP_MS`, then a brief
  `SMASH_IMPACT_MS` (130ms) planted strike window before recover. `MELEE_STOP_RANGE` replaces
  `CLEAVE_RANGE` as the approach-stop distance. `BossAttackType` `cleave`→`smash` throughout;
  `telegraphMsFor` / `recoverMsFor` / `pickAttack` / `drawTelegraph` / `beginExecute` /
  `updateExecuting` all updated.

**Dashboard Enemies tab** (`src/dashboard/main.ts` — the one hand-mirrored data source, per the
dashboard's known drift caveat) updated: gremlin damages, the boss attack list (Leaping Smash 60 /
Charge 55 / Slam 55), and two now-stale "no telegraph" notes corrected. No `RECIPES.md` change.

**Files touched:** `src/entities/Gremlin.ts`, `src/entities/GremlinKing.ts`, `src/dashboard/main.ts`
(+ STATUS.md, CLAUDE.md boss note).

**Verification:** `tsc --noEmit` clean; preview boots error-free. Drove a live-spawned boss via
`preview_eval`: a synchronous state-machine walk asserted `checkPlayerHit` returns null mid-leap and
`{60, kb 220}` only after `smashLanded`, plus charge `{55}` / slam `{55, kb 260}`; a second **async**
eval under the real physics loop confirmed the leap actually moves the boss — it landed exactly on
the locked point (`distToTarget: 0`, `movedFromStart: 380` = clamped max toward a far player).
`preview_screenshot` confirmed the landing-zone marker renders as a distinct offset circle. Live
enemies read the new claw damages (Gremlin 15 / Gremling 12, elites 23/18; Boar 25 / Snake 20
unchanged). Zero console errors.

**Still queued from the triage:** 2 small features (Workbench-placement contextual hint, in-game
relic compendium). Then master-plan tail M-TE → M-W1.
