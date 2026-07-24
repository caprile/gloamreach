# Status

## Current State

_Living snapshot — edit in place, never append._ Last shipped: **"God run" triage session 1 —
bug fixes, ammo removal, end-of-run summary** (2026-07-23, Opus,
plan: `.claude/plans/vagabond-god-run-triage.md`).

**What just landed.** the user's ~100-minute Ashcaller run trivialised biome 3 (Miretyrant dead in
~1 min, ended on an overshield). The whole dump was triaged into a committed plan with 10 locked
decisions (D1-D10) + 3 creature kits (C1-C3) and split across three sessions; **this was session 1
(bugs + plumbing)**. Shipped: **ammo removed entirely** (D1) — no Ammo equip slot, no
arrow/pellet items or recipes, no `reconcileAmmoSlot`; bows just fire, governed by stamina/range/
attack-speed, and the Javelin still self-consumes because it *is* the projectile. A
**player-facing end-of-run summary** (D7) now fills a second column on `RunEndUI`, fed by a new
framework-free `src/systems/RunLog.ts`: damage dealt split by attack slice, healing split by
source, damage taken by species, kills, a relic-roll ledger and a milestone timeline. **"New Run"
from the pause menu now ends the run properly** instead of silently restarting it with no score
and no summary. Plus six bug fixes — inventory flicker, six weapons missing their upgrades,
gem-augment text before the Gemwright exists, gator aggro/deaggro, and ability descriptions
without numbers.

**The finding that drove the triage** (measured, not inferred): `resolveWeaponHit` runs once per
target hit — primary, arc sweep, on-hit burst, crit splash — and weapon lifelink / the Leech relic
/ Bloodpact all heal *inside* it. **Lifesteal scales linearly with target count; incoming damage
does not** (~40 HP/s against a 308 HP pool). The new summary's "Damage Dealt" split is exactly the
readout that makes this visible in-game. Two compounding issues the user hadn't flagged: **Wisdom's
-50% ability-cooldown cap is reached at exactly 100 points** and he had 112, and **Intelligence is
a closed feedback loop** (Int -> skill XP -> skill level-ups are the only player-XP source -> stat
points -> Int) with no damping.

**Next — session 2 (balance), all decided, no design calls left.** Lifesteal per-swing cap (D2),
bow buff +40% dmg / -25% cooldown (D3), XP rebaseline (D4), jewelry pickup-radius -> gather yield
(D5), stat caps (D9), and the **bayou common->miniboss rescale (D10)**: bayou commons drop 15-30%
(Mosswretch 420->300, Mirejaw 320->260, Corpselight 190->160, Blighttoad 150->130) while crypt
wardens roughly double (420/440/620 -> 850/1000/1350). These must ship together and be verified in
one run — enemy HP feeds the lifesteal cap directly, and the summary from this session is what
makes the result readable. **Session 3** is the creature identity pass (C1-C3).

**Known issues / notes.**
- Two of the user's items are still unresolved: **"lvl 2 when I started bayou"** (unclear what was
  at level 2) and whether the two non-combining stacks were `arrows` beside `gloam_arrows` with
  near-identical icons — D1 deletes both items, so it resolves either way.
- `BootScene` still generates `icon_arrows` / `icon_gloam_arrows` / `icon_slingshot_pellets`.
  Deliberately kept: the art is harmless and still reads as "arrows" if a future recipe wants it.
- Every number in D2-D4 and D10 is first-pass and unplayed.

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
