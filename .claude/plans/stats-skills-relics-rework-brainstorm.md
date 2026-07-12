# Stats / Skills / Relics rework — brainstorm (PROMOTED — superseded by the locked plan)

**Status: PROMOTED 2026-07-11 → `.claude/plans/crit-tempering-lodestar.md`** (milestone
**M-SS**). That file is the locked, step-by-step implementation plan with final numbers;
build from it (on **Opus**). This file is kept as the brainstorm/decision trail only —
don't build from it.

## The problem (the user's words)

Stats (Endurance/Vitality/Strength/Agility/Intelligence/Willpower) and Skills
(slash/blunt/pierce/ranged/magic, heavy/light armor, running/blocking/chopping/mining)
"all feel pretty negligible now compared to relics." Two root causes confirmed in code:

1. **Half the sheet does nothing.** 6 of 11 skills (heavy_armor, light_armor, blocking,
   chopping, mining) only gate recipe discovery — zero mechanical effect. 2 of 6 stats
   (Intelligence, Willpower) are pure placeholders for a magic system that doesn't exist.
2. **The 5 that work compete with relics on relics' own axis and lose.** Weapon skills
   +0.5% dmg/level and stats like +1 HP/point are a rounding error next to a relic's
   +8–40%.

## The three layers (locked)

1. **Relics = the raw-stat layer.** Primary source of "+X% damage / speed / HP / etc."
   Per-run, RNG. Already how they work — don't fight it.
2. **Recipes/gear = the uniqueness layer.** Special crafted weapons/armor with
   *qualitative* effects — procs ("20% chance to double-attack"), on-hit (bleed/stun/
   lifesteal), conditional (+dmg vs staggered / at night), unique actives. NEW; lands in
   **M-TE** (trophy-gated special gear).
3. **Stats/Skills = the reliable, player-steered layer on axes relics DON'T touch.** Not
   a weaker copy of relics — the deterministic build you control, filling gaps relics
   can't (crit, flat mitigation, mobility windows, gather/utility), plus the *key* that
   powers your M-TE gear (weapon-skill thresholds gate/scale procs).

## Locked decisions (the user, 2026-07-11)

- **Sheet role = "Distinct-axis effects + M-TE gating"** (the B+D+A mix). Every dead
  skill/stat gets a REAL effect on an axis relics don't cover; weapon-skill thresholds
  gate/scale M-TE weapon procs. Stays per-run (rejected the cross-run meta layer C — keep
  the hardcore one-life model intact; revisit meta-progression as its own milestone later
  if ever).
- **Add a crit system** as the flagship new axis. Strength → melee crit chance, Agility →
  ranged crit chance. Strength/Agility drop the weak stamina-cost knob. Crit is a new
  combat mechanic (Opus when built) and also opens design space for future crit relics /
  "on-crit" procs.
- **Repurpose the dead magic stats and rename them DnD-style:** **Willpower → Wisdom**;
  keep **Intelligence**. Both get real non-magic effects now (a future magic system can
  reclaim its own stats later). DnD framing: Intelligence = knowledge/efficiency, Wisdom =
  perception/insight/resilience.

## Concrete effect table (first-pass numbers, tunable)

### Stats (spent from Player Level points, `Progression.ts`)

| Stat | Effect (per point) | Axis / notes |
|---|---|---|
| **Endurance** | +1 max Stamina (keep) | flat pool |
| **Vitality** | +1 max HP (keep) | flat pool |
| **Strength** | **+melee crit chance** (NEW — replaces −stamina cost) | crit (new axis) |
| **Agility** | **+ranged crit chance** (NEW — replaces −stamina cost) | crit (new axis) |
| **Intelligence** | **+gather yield &/or +XP gain** (NEW) | utility relics don't touch |
| **Wisdom** (was Willpower) | **+buff/food duration &/or knockback/debuff resist** (NEW) | utility/resilience |

- Base crit chance ~5%; per-point crit is small (proposal ~+1%/pt, floor/cap TBD). Crit
  damage default ~1.5× (tunable). Crit is a multiplicative factor in `resolveWeaponHit`,
  stacking with the stagger multiplier and relic `damageMult`.
- Removing Strength/Agility's stamina-cost effect means `weaponStaminaCostMultiplier`
  (Progression.ts) is retired or repointed — Endurance's +max stamina remains the stamina
  answer. Confirm we're OK dropping stamina-cost reduction entirely.
- Int/Wis: pick a single clean effect each first (avoid two-effect bloat). Leading
  proposal: **Intelligence → +gather yield** (chance for +1 drop, pairs with chopping/
  mining), **Wisdom → +buff duration** (makes cooking/Comfort investments feel better).
  Alt axes noted above if the user prefers.

### Skills (leveled by activity, `Skills.ts`)

| Skill | Effect | Notes |
|---|---|---|
| slash / blunt / pierce / ranged / magic | keep +0.5%/lvl damage **+ threshold gates/scales M-TE weapon procs of that type** | the A tie-in — the sheet powers your unique gear |
| **heavy_armor** | **flat** damage reduction per level | distinct from relics' *percent* damage-taken; strong vs chip damage; gives heavy armor an identity |
| **light_armor** | **+dodge/dash i-frame window** (and/or reduced move penalty) | mobility axis; reuses the existing `DASH_IFRAME_MS` guard |
| **running** | keep sprint speed **+ reduced sprint stamina drain** | second real effect for a currently one-note skill |
| **chopping** | gather yield or fewer hits-to-break on trees | cheap obvious win |
| **mining** | gather yield or fewer hits-to-break on rocks/ore | cheap obvious win |
| **blocking** | **DEFER** — needs a real block/parry mechanic first | leave gate-only for now; build alongside a future block system, not faked |

## Milestone shape

- **This rework = its own milestone (Opus — crit is a new combat mechanic + touches
  damage resolution and half the character sheet).** Scope: crit system, real effects for
  all dead skills/stats, Int→utility, Willpower→Wisdom rename. Does NOT build the M-TE
  proc gear — only leaves the weapon-skill *threshold hook* those procs will read.
- **M-TE (later, its own milestone)** builds the trophy-gated proc/uniqueness gear that
  consumes the threshold hook. Crit built here means M-TE can offer "on-crit" procs for
  free.
- **Keep `RECIPES.md` / dashboard in sync** if any recipe skill-gates change; the
  dashboard's Balance Overview should probably grow a crit/effective-DPS view.

## Remaining micro-decisions to confirm before promoting to an implementation plan

1. Crit numbers: base %, per-point %, crit multiplier, and whether Strength/Agility get a
   soft cap.
2. Int vs Wis single-effect assignment (gather-yield / XP / buff-duration / resist — pick
   one each).
3. OK to fully drop stamina-cost reduction (Strength/Agility → crit) rather than keep a
   token amount?
4. heavy_armor flat-reduction and light_armor i-frame numbers.
5. Confirm `blocking` stays deferred (no fake effect) until a block/parry mechanic exists.

Relates to [[survivor-rpg-progression-system]] and [[survivor-rpg-relics]].
