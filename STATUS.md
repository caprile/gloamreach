# Status

## Current State

_Living snapshot — edit in place, never append._ Last shipped: **"God run" triage session 2 —
the balance pass** (2026-07-23, Sonnet, plan: `.claude/plans/vagabond-god-run-triage.md`).
Session 3 (creature identity: Mirejaw/Mosswretch/Corpselight kits) is next and unstarted.

**What just landed — all 6 remaining locked decisions from the triage, shipped and verified:**
- **D2** — lifesteal is now capped at 1.5x the primary hit's contribution PER SWING (the
  actual god-run fix). New `MainScene.budgetedSwingHeal()` wraps Leech relic / Bloodpact /
  weapon lifelink; the primary hit always heals in full (it DEFINES the cap), everything an
  arc sweep adds on top is clamped to whatever room remains. Verified: a 6-target Gloamdrinker
  swing with all three sources active clamped at exactly budget=applied=15 (was ~55+
  uncapped) across three consecutive swings with no carry-over; single-target melee and a
  single ranged shot both heal fully uncapped, since neither has anything to clamp against.
- **D3** — all 3 Warbows: damage +40% (11/15/20 -> 15/21/28), cooldown -25%
  (750/730/720ms -> 560/545/540ms). Lands each tier's bow DPS inside its own tier's
  forged-melee band (e.g. Sunsteel 26.8 DPS between the Warhammer's 21.3 and Sword/Pike's
  29-31), paying for reach with no arc/burst/lifelink instead of chip damage.
- **D4** — raised the baseline XP curve (`Progression.ts` `XP_BASE` 110->85) and trimmed the
  Ashcaller's stacked multipliers (`xpMult` 1.3->1.15, `skillXpMult` magic 1.6->1.35/ranged
  1.4->1.2, `statPotency.intelligence` 1.5->1.25). **Correctness catch mid-implementation:**
  `Skills.ts`'s `skillXpToNext` coefficient looked like an equivalent lever but is a NO-OP for
  player-level pace (proven by simulation — a skill level's cost literally IS the player-XP
  it feeds, so lowering the coefficient only re-chunks the same total into more/smaller
  deposits). Lowered it anyway (70->54) since it's a real, independent win for skill-level
  pace, but the code comments now say what it actually does rather than repeat the original,
  also-inaccurate S1-batch claim.
- **D5** — jewelry's `magnetRadiusPct` passive (pickup radius) removed entirely and folded
  into the existing `gatherBonusPct` channel on the 3 items that had it (Ring of the Forager,
  Lantern of the Long Dark, Amulet of Farsight).
- **D9** — stat caps are now SURFACED, not blocked. A "(CAPPED — this axis is maxed)" note
  appears on the Stats tab once an axis saturates: Wisdom's ability-cooldown (self-contained,
  100 points) and Strength/Agility's crit contribution (build-dependent — new `critCapped`
  dep reads live off the equipped weapon). No universal hard allocation ceiling — Endurance/
  Vitality/Intelligence/Wisdom's-other-axis are all genuinely uncapped by design.
- **D10** — the bayou common->miniboss gap. Commons down 15-30% (Mosswretch 420->300,
  Mirejaw 320->260, Corpselight 190->160, Blighttoad 150->130); the 3 crypt wardens roughly
  doubled (Palewake 420->850, Kilnborn 440->1000, Sanguinarch 620->1350) plus matching damage
  bumps. Spread now 2.8-4.5x (was 1.0-1.5x; badlands runs 2.7-6.8x), boss->toughest-common
  12x. **Self-caught error:** my own plan doc claimed "miniboss->boss 3.4x" and badlands
  "5.5x" — both were arithmetic slips; re-measured live as 2.67x and 3.85x respectively, and
  the plan doc's now corrected in place rather than left wrong.
- Along the way: found the dashboard's Enemies tab (`src/dashboard/main.ts`) was ALREADY
  stale for Palewake/Kilnborn (a same-day 240->420/300->440 bump from earlier today's other
  session never reached it) — resynced all 8 touched enemies' entries. **Known remaining
  drift, explicitly NOT fixed this session** (out of scope, flagged rather than silently
  expanded into): Mirejaw/Blighttoad/Mosswretch/Murkling/Corpselight's dashboard ATTACK
  damage numbers are stale from that same earlier rebalance pass, and the CUT Fenlurker is
  still listed as a live enemy in the dashboard.

**Next — session 3, creature identity (Opus, new mechanics):** Mirejaw death-roll thrash +
water-territory exemption (C1); Mosswretch death-spawn Mosslings + spore cloud (C2);
Corpselight two-form transform, wisp<->corporeal husk (C3). All fully speced in the plan doc.


### "God run" triage session 2 — the balance pass, D2/D3/D4/D5/D9/D10 (2026-07-23, Sonnet)

Plan: `.claude/plans/vagabond-god-run-triage.md`. Session 1 (bugs, ammo removal, the
end-of-run summary) shipped earlier the same day; this closes out every remaining locked
decision from the triage except the creature-identity pass (session 3, next).

**D2 — per-swing lifesteal cap.** The actual fix for the god-run's headline finding
(`resolveWeaponHit` runs once per target an AOE swing hits, and Leech/Bloodpact/weapon
lifelink each heal inside it independently, so total healing scaled with target count while
incoming damage didn't). New `swingHealBudget`/`swingHealCapArmed`/`swingHealApplied` fields +
a `budgetedSwingHeal()` helper: reset when a swing's primary hit fires (`isBurstSource`),
armed right after that hit's own heals resolve so "the primary's contribution" is the SUM
across every active source, not any one alone. Every heal source (including Leech's
overheal->shield banking, budgeted BEFORE the shield conversion so capping only stops the HP
portion) routes through it instead of calling `health.heal()` directly. Verified live: a
6-target Gloamdrinker swing with Leech + Bloodpact + weapon lifelink all active clamped at
exactly budget=applied=15 across 3 consecutive fresh swings (no carry-over); a single-target
swing and a lone ranged shot both healed fully uncapped (nothing to clamp against).

**D3 — bow buff.** All 3 Warbows +40% damage / -25% cooldown (11/15/20 -> 15/21/28 dmg,
750/730/720 -> 560/545/540ms). Verified each tier's bow DPS now sits inside its own tier's
forged-melee band (Sunsteel 26.8 vs Warhammer 21.3/Sword-Pike 29-31; Embersteel 38.5 vs
28.75/40-41; Gloamsteel 51.9 vs 37.5/52.5-53.2) rather than trailing it. `RECIPES.md`'s bow
table gained a DPS column.

**D4 — XP rebaseline.** `Progression.ts` `XP_BASE` 110->85 (~1.29x) is the real player-level
pace fix, sized to roughly match what the Ashcaller's own `character.xpMult` (1.3) gave a
neutral class for free. **Correctness finding caught mid-implementation and fixed before
shipping:** `Skills.ts`'s `skillXpToNext` coefficient looks like an equivalent lever but is
provably a NO-OP for player-level pace — verified by simulation (a fixed raw-XP budget fed
through the real skill->player feed produces MORE skill level-ups at a lower coefficient but
the IDENTICAL player level), because a skill level's cost literally IS the player-XP it
feeds; lowering the coefficient just re-chunks the same total into smaller deposits. Lowered
it anyway (70->54, a real independent win for skill-level/recipe-unlock pace) but rewrote
both files' comments to state the correct mechanism rather than repeat the original S1-batch
comment's same (also unverified) claim. Ashcaller (`Characters.ts`) trimmed: `xpMult`
1.3->1.15, `skillXpMult` magic 1.6->1.35/ranged 1.4->1.2, `statPotency.intelligence`
1.5->1.25 — these three stack MULTIPLICATIVELY (skillXpMult applies outside the additive
bonus bucket xpMult and Intelligence both feed), so a magic-heavy Ashcaller could earn 2x+ XP
on its main skill before a single stat point. Bane and the heavy_armor penalty untouched.
Verified live via the real `awardSkillXp` path: trimmed Ashcaller now gives ~1.63x on its
favored skill vs neutral (was 2.08x+ pre-trim, before any stat investment).

**D5 — jewelry pickup-radius replaced.** `magnetRadiusPct` removed entirely from
`EquipmentEffects` (channel, sums, describePassive, the getter, its one MainScene call
site) — not left dead. Folded into the already-wired `gatherBonusPct` on the 3 affected items
(Ring of the Forager merged 15+30->30 into the dedicated gather ring; Lantern of the Long
Dark 40->20; Amulet of Farsight 20->10). `RECIPES.md` jewelry table updated.

**D9 — stat caps surfaced, not blocked.** Wisdom's -50% ability-cooldown cap (100 points,
the user had 112) now shows "(CAPPED — this axis is maxed)" on the Stats tab once reached —
self-contained in `Progression.ts` (`wisdomAbilityCdrCapped()`) since it depends only on the
stat. Same audit found Strength/Agility's crit contribution is ALSO capped
(`CRIT_MULT_CAP`/`CRIT_CHANCE_CAP`) but build-dependent (weapon + stat + relics + gear
augments combined), so those read live off the equipped weapon via a new optional
`critCapped` dep rather than a fixed point threshold. Deliberately NO universal hard
allocation ceiling — Endurance/Vitality/Intelligence and Wisdom's OTHER axis (buff duration)
are genuinely uncapped by design; blocking them would remove real value to fix a problem only
3 of 6 stat axes actually have. Verified: the boolean flips at exactly 100 Wisdom points (99
false/100 true); the marker renders/omits correctly across all 3 capped axes and is absent
when unarmed (crit has no context without a weapon).

**D10 — bayou common->miniboss gap.** Measured: miniboss HP ÷ toughest common was 1.0-1.5x
here vs 2.7-6.8x in badlands, because bayou commons had scaled x4.1 from badlands while the 3
crypt wardens only moved x1.08 (Mosswretch was literally the SAME HP as the Palewake next to
it). Fixed from both ends per the locked even split: commons -15-30% (Mosswretch 420->300,
Mirejaw 320->260, Corpselight 190->160, Blighttoad 150->130, Murkling unchanged at 40 —
swarm), wardens roughly doubled (Palewake 420->850, Kilnborn 440->1000, Sanguinarch
620->1350) with matching damage bumps (Kilnborn backdraft 58->72, Sanguinarch slam 72->88,
Palewake tether 10->14/s). Verified live via `enemyStat()` AND real spawned entities: spread
now 2.8-4.5x (target hit exactly), boss->toughest-common 12x. **Self-caught arithmetic error
in my own plan doc:** it had claimed "miniboss->boss 3.4x" and cited badlands at "5.5x" —
both were slips from earlier in the session; re-measured live as 2.67x (3600/1350) and 3.85x
(2500/650) respectively, and the plan doc corrected in place with the real numbers rather
than left standing. Also found and fixed pre-existing dashboard drift while in
`enemyStats.ts`: Palewake/Kilnborn's `src/dashboard/main.ts` HP entries were stale from an
EARLIER same-day rebalance pass that never reached the dashboard (240/300 shown, code already
at 420/440 before this session even started) — resynced all 8 touched enemies' dashboard
entries. **Known remaining drift, explicitly out of scope this session:**
Mirejaw/Blighttoad/Mosswretch/Murkling/Corpselight's dashboard ATTACK damage numbers are
stale from that same earlier pass, and the CUT Fenlurker is still listed as a live enemy in
the dashboard — flagged, not silently expanded into.

All changes verified live via `preview_eval`; `tsc` + `npm run build` clean throughout, zero
console errors/warnings across every check. `RECIPES.md` updated (bow DPS table, jewelry
table). **Next: session 3, the creature-identity pass (Opus) — Mirejaw/Mosswretch/Corpselight
kits, fully speced in the plan doc.**

## Recent Entries

> Older entries in STATUS-archive.md.

### "God run" triage + session 1 — bugs, ammo removal, end-of-run summary (2026-07-23, Opus)

Plan: `.claude/plans/vagabond-god-run-triage.md` (root causes, 7 bugs, decisions D1-D10, creature
kits C1-C3, 3-session split). This entry covers the triage and **session 1 only**.

**Triage findings (measured from code, before any change).**
- **Lifesteal scales with AOE target count; incoming damage does not.** `resolveWeaponHit` runs
  once per target — primary, arc sweep, on-hit burst, crit splash — and weapon lifelink, the Leech
  relic and Bloodpact all heal inside it. Against the user's kit one swing into 5 enemies dealt
  ~170 damage across targets => ~22 HP/swing => **~40 HP/s** against a 308 HP pool. His own "maybe
  magic shouldn't crit" hypothesis was considered and **rejected**: crit is only the multiplier
  that makes each of N instances big, so nerfing it leaves the scaling intact.
- **Wisdom over-caps.** Ability cooldown caps at -50%, reached at exactly 100 points; he had 112.
  At the cap Bloodrush is 11s cooldown / 6s active = 55% uptime on +67% attack speed.
- **Intelligence is an undamped feedback loop.** Int -> skill XP -> skill level-ups are the *only*
  player-XP source -> stat points -> Int. Skills are capped (`MAX_SKILL_LEVEL` 100); **stats are
  not capped at all**, which is what he saw pass 100.
- Cross-biome: bayou commons scaled x4.1 from badlands while minibosses scaled x1.08, so
  miniboss/toughest-common is 1.0-1.5x where badlands is 2.7-6.8x (D10).

**Session 1 — shipped.**
- **D1, ammo removed entirely.** No `ammo` `EquipSlot` or group, no `EquippedItem.count`, no
  `reconcileAmmoSlot`, no arrow/pellet items or their four recipes. `RangedWeaponConfig.ammoItemKey`
  became `ammo: "none" | "self"` — every launcher and bow is `"none"`, the Javelin is `"self"`
  because it *is* the projectile. Kills two reported bugs outright: the Gloamsteel reforge that
  logged *"Loaded Arrows"* then silently evicted them, and the "stacks that won't combine" (almost
  certainly `arrows` beside `gloam_arrows` with near-identical icons).
- **D7, end-of-run summary.** New framework-free `src/systems/RunLog.ts` + a second column on
  `RunEndUI`: damage dealt **split by attack slice**, healing **split by source**, damage taken by
  species, kills, a relic-roll tally (settles "4 rares in a row?") and a milestone timeline.
  Deliberately **not** the requested event log — a craft list answers nothing; attribution is what
  no one can see from inside a run. Made player-facing per the user rather than a dev export.
  **Nothing truncates silently** (the user: "what happens when that list gets huge?"): the two
  genuinely unbounded categories are AGGREGATED rather than listed — 31 relic rolls become a
  5-row outcome tally, not "the last 3" — and every top-N block carries a `+N more` tail with the
  damage/kills it represents, with the timeline labelled "last 6 of 19". The panel is not
  scrollable or collapsible **by design**: it stays a one-screen summary, and aggregating is
  lossless at bounded height where a scroll pane would just be a longer list.
- **"New Run" from the pause menu now ends the run** (`abandonRun`) — scored, recorded and
  summarised like any other. It used to `scene.restart()` silently, producing no score at all, and
  it is the path a player takes most often.
- **D8**: chest menu dropped the backpack panel (600x400 -> 234x216); [R] Take All and
  double/Ctrl-click quick-move still do everything that actually moved items.
- **B2**: `sunsteel_warbow`, `embersteel_warbow` and all three Mirebronze weapons had **no
  upgrades registered at all** — a plain omission that dead-ended ranged and Sunsteel-branch
  builds. Auditing every weapon and armor piece afterwards found the same bug one layer over: the
  **entire Mirebronze (heavy) + Bogweave (light) armor sets** had none either. Now registered
  (+3/+7 helm and greaves, +4/+8 cuirass, +2/+3 per Bogweave piece, Mirebronze Ingot at bench Lvl
  4). Every armor piece with a defense stat now has a path; only `wood_club`/`slingshot`/`javelin`
  lack one, deliberately — tier-0 starters.
- **B6**: melee deaggro. Mirejaw `STALK_RADIUS` 460->330 and `DEAGGRO_RADIUS` 720->520 (both were
  outside the ~360px visible half-height / ~734px half-diagonal, so it aggro'd off-screen and could
  not lose you), plus a new **hard `MAX_PURSUIT_MS` ceiling on base `Enemy`** that a landed hit
  cannot reset — the melee half of the same defect the ranged casters got fixed for last session,
  since a gator chomping every 1.2s refreshed the 30s give-up clock forever.
- **B1**: inventory flicker — `refresh()` was a full teardown/rebuild per item movement, i.e. per
  magnet pickup. Now coalesced to one repaint per frame, and a refresh-driven render keeps the
  tooltip (Phaser won't re-fire `pointerover` on the rebuilt object until the pointer moves, which
  is what made it strobe).
- **B5**: the `Gem augments: N/2` line no longer advertises the Gemwright's Table pre-discovery.
- **B7**: all 10 ability descriptions now state real numbers (5 were pure flavour).

**Verified live** via the preview (`tsc` + `npm run build` clean, zero console errors):
bow fires with zero ammo items in existence and still spends stamina; all 6 weapons report 2
upgrades; no ability description lacks a digit; all 3 ammo items and 4 recipes gone; Mirejaw aggros
at <=320px and not at >=340; the pursuit ceiling fires at 45.6s while landing hits every 1.2s
(previously never) and the 30s no-hit rule is unchanged; 20 refreshes across 2 frames produce 2
renders; the gem line is hidden pre-discovery and shown after; pause "New Run" ends+scores+
summarises; and the summary panel was measured at its **saturated worst case** (95 text objects) for
zero overflow and 31px button clearance.

**Two bugs caught by verification, not by the compiler.** (1) The pursuit ceiling was only cleared
by `enterGivenUpState`, but most subclasses deaggro by DISTANCE and never call it (Mirejaw just
submerges) — a gator that lost you once would have carried a spent ceiling forever and
insta-given-up on every later fight. Now re-stamped whenever the aggro-persistence window has
lapsed, which every aggro path reaches. (2) `RunEndUI` at 600px tall fit the sparse test data and
would have overflowed a real run; at 700 the last timeline row still ran into the button strip,
and 740 broke again once the `+N more` tails were added. Sized to **844**, verified against a
saturated log (12 damage sources, 9 kill species, 31 relic rolls, 19 milestones) with 33px of
button clearance — if a block ever gains rows, re-verify saturated, not on a typical run.

`RECIPES.md` updated (ammo tables removed, warbow/Mirebronze upgrades noted). **Next: session 2,
the balance pass (D2-D6, D9, D10) — all decided, verify in one run.**
