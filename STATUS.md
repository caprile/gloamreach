# Status

## Current State

_Living snapshot — edit in place, never append._ Last shipped: **Reaver-run playtest batch, part 1
— stat caps, shrine budget, boss pacing** (2026-07-24, Opus; full writeup under Recent Entries).
Off the user's Reaver win (69:56, 936 kills, level 31). **10 of the 15 items are done — the 5
remaining are listed below.** Headlines: a **hard 100-point cap on every stat** plus a
per-point retune so every stat is still growing at point 99 (Strength used to die at **24** points
for a Reaver — 76 of his points did nothing); **dead-point allocation is now blocked, not just
labelled**; a **`[ +5 ]`** allocation button; **Sunken Shrines capped at 3 kindlings each**
(charged at rite START, so lapse-farming can't dodge it) with a guaranteed **Tier-3 Refined
Trophy** for clearing all three; and **big-boss pacing guards** — a 5%-of-max-HP per-hit cap
(floors the 3 main bosses at 20 connects) plus 900ms phase-transition invulnerability so phases
can't be skipped. The root cause behind the scaling complaint: Int is a **straight player-XP
multiplier** (all skill XP becomes player XP), so it paid for more Int; the shrine loop alone
produced **196 of his 496 points**. Both ends now bounded.

**Part 2 also shipped: area-attack indicators + Mossling spawn immunity.** New shared
`Enemy.drawAreaCircle/drawAreaWedge/drawAreaLane` (+ lazy Graphics, destroyed on both teardown
paths). Wired: **Mirejaw** lunge lane (the actual "alligators" complaint — its adds fill a
Miretyrant bellow wave), **Boar** charge lane, **Duskrunner** pounce lane, **Sanguinarch** slam
circle, **Corpselight** collapse circle (whose code comment already promised a "growing tell"
that didn't exist). Audited the rest: **Kilnborn needs none** (its backdraft only burns lit
ground, and those tiles are already drawn) and **Palewake needs none** (a tether line, not an
area, already drawn by its own gfx); Cragscale/Sandmaw/Hexling/Cinderwrought/Gloamwarden/
GremlinKing/Duneshaper/Miretyrant already telegraphed theirs. Mosslings get 500ms
**damage-only** immunity (`Enemy.spawnInvulnUntil`) plus a fade-in — they still close on you.

**STILL TO DO from this batch (5 items, none started):**
1. **Cooking menu** ingredient text overlaps the quantity (Blood-Glazed Snake Skewer).
2. **Auto-stacking bug** — wood sat at 69/99/44. `ItemContainer.add()` merges correctly and
   `sortAndStack()` is only called from the manual Sort button, so something creates stacks
   outside `add()`. Lead: the `addStack` call sites and the drag/split paths.
3. **Convert All** on the Relic Forge Convert tab.
4. **Drag abilities straight to the Q/E/R hotbar.**
5. **Workbench Lvl 4->5 upgrade glyph** — re-investigate as a real bug (last session concluded
   "not a bug: Gloamsteel undiscovered", but the user reports it again).

All 5 remaining items are Sonnet-class fixes on existing systems - no mechanic work left in this batch.

Before that: **Ascetic-run playtest batch —
Miretyrant escalating waves, Bog Ore clustering, Ashcaller buff-master rework, food-buff cap, Max
buttons** (2026-07-24, Sonnet; full writeup under Recent Entries). Off the user's Ascetic win (77:59,
510 kills, level 25, Primal Spear → Ember Brand). Design-confirmed via `AskUserQuestion` before
applying. Headlines: (1) **Miretyrant bellow waves now escalate on a script** — waves 1-2 are frog
swarms (elite Murkling/Blighttoad), wave 3 introduces elite Mirejaw gators, wave 4+ keeps them in the
mix permanently, base interval tightened 15s→11s (enraged 8.5s→6.5s); boss damage/chase untouched
per the user's note; (2) **Bog Ore now clusters in the bayou's miasma/bonemire zones** (10 clusters of
3-4, plus a smaller flat baseline) — the user's "bunches in dangerous areas" ask, corrected mid-session
from an initial gloam-ore misreading; (3) **food-buff cap 3→2**, with Comfort/Bedroll now fully exempt
from the cap (`Buffs.ts` `COMFORT_BUFF_ID`) rather than competing for a slot; (4) **Ashcaller reworked
from "one buff at a time" to "buff master"** — runs 3 buffs while everyone else runs 2, since the cap
drop would have collapsed its old identity into "worse than everyone else"; (5) **a "Max" button on
every crafting-menu quantity slider** (CraftingMenu/CookingMenu/DryingRackMenu/JewelryMenu). Also
investigated the reported "Workbench Lvl 4→5 upgrade triangle doesn't show" — confirmed LIVE this is
**not a bug**: `gloamforge_anvil`'s ingredients (Gloamsteel Ingot specifically) must be actually
*discovered* (smelted at least once), and the user's run took the Sunsteel→Mirebronze branch, which
never smelts Gloamsteel — the glyph mechanism was verified to self-heal correctly the instant the
material is discovered. Stat spread (Int 100, heavy Pierce/Magic investment) reviewed and judged
healthy — no rebalance; the "too easy" signal was scoped entirely to the Miretyrant encounter design,
which item (1) addresses. `tsc` clean; all six changes verified live via `preview_eval`. **Next:
playtest the reworked Miretyrant fight and the bayou Bog Ore density.**

Before that: **the full-screen flicker fix** — `syncCameras()` moved from `update()` to the game's
`PRE_RENDER` (unclassified `cameraFilter === 0` objects were drawn twice; see the flicker entry
below for the general timing rule).

Before that: the **Survivor roster rework**, immediately after the **Warden-run playtest batch —
the flat-armor collapse** (same day, same session). Both off the user's Warden victory run (77:55,
633 kills, level 28, full Gloamsteel) and a ~17-item feedback dump.

**Roster rework (latest).** The flat-armor work surfaced that `maxHpPct`/`maxStaminaPct` were a %
of the **100 base**, so they decayed to nothing as pools grew — which meant **two of the five
survivors had no bane left** (the Vagabond's "-10% max Stamina" was worth 3%, the Ashcaller's
"-15% max HP" 4%). Reworked so every card is non-decaying, distinctive and genuinely double-edged:
`maxHpMult` is now a **true multiplier**, `maxStaminaPct` was retired, and each card gained a
**behavioural** edge (heal-on-kill, one-buff-at-a-time, attack speed, elite loot) via seven new
`RunModifier` fields, each one line at a choke point that already existed. New structural rule with
a module-load guard: **one axis, one lever** — no card may hit the same axis through both its
modifier and its stat potency (the Ashcaller had three such clashes). Cards: Vagabond =
outruns/never tires/kills slowly; Reaver = sustains by killing; Ashcaller = fragile, one long buff;
Warden = slow and unkillable; Ascetic = elites twice as common AND worth double.

**The headline:** most of that dump had a single root cause. `applyDamageToPlayer` is
`max(1, round(dmg × (1 − relicRed) − flatArmor))`, flat armor is uncapped, and armor had grown
**10.5×** across three biomes (7 → 13 → 56 → **74**) while the strongest attack grew **2×**
(60 → 124). Essentially **every physical attack in biomes 2 and 3 was pinned to the `max(1, …)`
floor** — the win-con boss included. the user's call was to KEEP flat subtraction and raise enemy
damage to match, so this was a numbers pass, not a formula change: Miretyrant 110/98/124/92 →
225/210/255/200, bayou commons 38-80 → 108-170, crypt wardens roughly doubled, plus the two
clearly-broken badlands cases (Gloamwarden 22/24 → 78/84, Duneshaper Sand Spikes 56 → 125).
Badlands was otherwise left alone — biome 1→2 progression reportedly feels right.

**Drift class closed:** three entities (Sanguinarch, Kilnborn, Palewake) were silently ignoring
`enemyStats.ts` — the table said 34/88 and 72, the code ran 15/50 and 58. **Every enemy is now
wired to the table**, and it carries a new documented SIZING RULE: size an attack by the NET
number it should land through its biome's armor, never by its paper value.

**Also shipped:** Miretyrant adds now elite + Blighttoad-weighted (poison bypasses armor, so they
stay relevant at any gear level); a delayed poison **death-bloom** on killed Blighttoads (reuses
the spore-cloud hazard, no new damage code); the ranged "mini-stun" removed (it was
`playHitFeedback`'s x-shake jittering planted casters, never a real mechanic); Warbows pulled back
to a consistent 73% of their tier's Sword DPS and below it per hit; Palewake's tether now drains
while it's invisible; bayou elite density raised where it had been bypassed entirely (crypts 41%,
POIs 24%, all-elite final Shrine wave); the Warden's decaying "+20% max HP" boon swapped for
−15% damage taken; UI flicker fixed by coalescing `HotbarUI`/`UpgradeMenu`/`EventLogUI` repaints
(12 rebuilds/frame → 1); and ability items can now be **dragged into a chosen Q/E/R slot** and
reordered between slots.

`tsc` + `npm run build` clean, zero console errors, every change verified live.

**Known / open:**
- **The Miretyrant is the most likely over-correction.** Without defensive relics it now kills a
  500 HP player in 3 connects (4 with a typical −15.8% relic). Intentional per "elite timing, hits
  should hurt", but watch it. `enemyStats.ts` is the single knob.
- **The Reaver is the roster's sharpest edge** and the most likely to need tuning: +25% damage
  taken AND -20% max HP against the newly-lethal bayou, paid for by 6 HP/kill — which does nothing
  during a boss fight, where there is nothing to kill.
- The decaying-`maxHpPct` problem is **resolved** (true multiplier + `maxStaminaPct` retired), and
  a module-load guard now blocks the double-stack that caused it.
- **Corpselight friendly fire was investigated and is not a bug** — no enemy-vs-enemy damage path
  exists; the player's own AOE/crit-splash kills the Mosslings.

**Next: a playtest at these numbers**, specifically the Miretyrant fight and whether the bayou now
out-threatens the badlands.

## Recent Entries

> Older entries in STATUS-archive.md.

### Reaver-run playtest batch — stat caps, shrine budget, boss pacing, area telegraphs (2026-07-24, Opus)

No plan file — a fix/rework batch off the user's Reaver win (69:56, 936 kills, level 31, score
19170, 62/62 relic rolls). **10 of 15 items; the 5 remaining are listed in
Current State.** Every design fork was locked via `AskUserQuestion` first, and two of the
locks reversed my initial recommendation once the real numbers were checked.

**The root finding.** Intelligence was an *unbounded* self-feeding loop: `Skills.onLevelUp` feeds
the player pool exactly the XP a skill level cost, so ALL raw skill XP eventually becomes player
XP — which makes Int a straight **player-XP multiplier** (+150.5% at the user's 118 points), paying
for more Int. Two numbers sized it: natural 3-biome play ends at **level 24 = 300 points**, and the
farm took him to **level 31 = 496**, i.e. the shrine loop produced **196 points, more than the
entire rest of the run**. Both ends are now bounded.

- **Hard 100-point cap on every stat** (`Progression.STAT_POINT_CAP`). 6 x 100 = 600, so honest
  play only ever spends ~half the budget — a real build choice, with the cap biting only the farm.
  Re-derived against the live XP curve: a 5-biome run lands near level 29 (~435 points), so this
  has headroom for future biomes. **This reversed my own "100 isn't enough for biome 4" answer**,
  which had wrongly used the post-farm level 31 as the natural endpoint.
- **Retuned per-point rates so every stat is still growing at point 99** (the user: "ideally I want
  all of these stats to have impact up to lvl 100 — otherwise feels weird"). The offender was
  Strength: its crit-damage axis caps at a combined 3.0x against 1.5-1.8x base weapons, so
  +0.04x/point burned the whole budget in ~35 points (**24** for a 1.5-potency Reaver — he put in
  100, so **76 points did nothing**). Fixed with a slower rate against the SAME ceiling, since
  "damage is already so high": nothing here raises a cap. Str 0.04->**0.015x**, Agi 0.5->**0.45%**,
  Int 1.5->**1%**, Vit healing 1.5->**1%**, End regen 2->**1.5%**. Endurance's flat stamina,
  Vitality's flat HP and both Wisdom axes keep their old rates (already meaningful to 100).
  Verified live: Strength now saturates at **exactly point 100** against a 1.5x weapon and point
  **80** against a Gloamsteel Pike — up from 19-37.
- **Dead-point allocation is now BLOCKED, not just annotated.** `MainScene.statAxisSaturated()` is
  the single enforcement point (it needs weapon/relic context, so it can't live in Progression),
  read by both `allocateStat` and the menu — so a dev/auto caller can't bypass the greyed button.
  Wisdom is deliberately exempt: its cooldown axis caps but buff duration doesn't, so those points
  still pay. Rows read `Vitality: 100 / 100` with `(MAXED)` / `(CAPPED — axis maxed)`.
- **`[ +5 ]` button beside `[ + ]`** (a 100-point stat is a lot of clicks). `allocate(stat, count)`
  returns how many landed, clamped by pool AND cap, so +5 banks whatever fits instead of
  overshooting. Also nudged the buttons to y+1 and shortened the cap notes — the long wording ran
  to within **1px** of the buttons, and text overlap is a live complaint elsewhere in this batch.
- **Sunken Shrines are capped at 3 kindlings each** (`SHRINE_MAX_KINDLINGS`), 9 x 3 = 27 rites,
  with a new `spent` phase. **A kindling is consumed when the rite STARTS, not when it's survived**
  — counting completions would have left the loop wide open (kindle, farm wave 1, walk away to
  lapse, repeat, paying only an offering the waves themselves drop). Visual tell: three
  `shrine_charge` pips at the shrine's foot, lit teal / dark once burned, plus a permanently cold
  tinted shrine when spent and a verb-less "The shrine is spent" prompt.
- **Guaranteed reward for clearing all three:** 1 `refined_trophy_uncommon_t3` in the third bowl.
  Chosen over the user's suggested Moonsilver/Bog Ore on purpose — Moonsilver gates the Gloamsteel
  ingot AND the Gemwright's Table, so surfacing it would collapse the Gloamsteel-vs-Mirebronze
  branch and break the locked "build-defining materials are dungeon loot" rule; Bog Ore is mined
  in the very zones shrines sit in. A relic-economy payout touches neither. Confirmed it's a real
  `TROPHY_ROLL` key (Uncommon @ power tier 3, x2.25).
- **Big-boss pacing guards** (Gremlin King / Duneshaper / Miretyrant only; mini-bosses stay
  burstable). Both default OFF on base `Enemy`, so every normal enemy is unchanged. (1) A **per-hit
  damage cap** of 5% of max HP (`maxHitFraction`) — the user one-shot the Miretyrant inside a single
  Bloodrush window at level 31 and saw neither phase. Floors all three at **20 connects** without
  touching player damage anywhere else; verified a Murkling still dies to one hit. (2)
  **Phase-transition invulnerability** (`phaseGates`, 900ms): King [50%], Duneshaper [70%, 50%],
  Miretyrant [65%, 35%]. Advances at most one gate per hit so no phase is ever skipped.
- Three subtleties in that boss work worth keeping: the bosses chip **poise** from the same hit, so
  they now route it through `effectiveDamage()` (a capped hit must not break poise at full value)
  and skip it entirely while phase-locked; and each boss's `update()` pushes `stateEnteredAt`
  forward every frozen frame so **the current state's timer pauses** — otherwise a telegraph would
  elapse behind the flash and the attack would land with no wind-up to dodge (verified: the
  Miretyrant resumed mid-telegraph, tint `0xffd24a`, not mid-attack).
- **Latent bug fixed on the way:** `GremlinKing` and `Miretyrant` never set `baseScale`, so it sat
  at 1 while their sprites rendered at 2.4x/2.6x. Harmless until something tweened the scale — the
  new transition does, and it shrank them permanently. Confirmed inert for combat first (neither
  reads `reachBonus()`, both have `biteDamage: 0`) before setting it.

**Area-attack indicators, roster-wide (item 8).** This deliberately REVERSES the locked "tells are
motion/tint, never world-space arcs" rule, re-locked with the user as: an AREA attack shows its
footprint, a single-target bite/claw still doesn't. The reasoning is that a wind-up POSE can tell
you a bite is coming, but nothing about a pose tells you a tail sweep reaches 120 degrees behind
the gator. New shared helpers on base `Enemy` — `drawAreaCircle` / `drawAreaWedge` / `drawAreaLane`
over one lazily-created Graphics, destroyed in BOTH `destroy()` and `playDeathFeedback()` (the
stranded-HP-bar bug class). Kept low-alpha with a thin ring at the TRUE radius, since the original
objection to arcs was that they looked goofy.

- Wired: **Mirejaw** lunge lane, **Boar** charge lane, **Duskrunner** pounce lane, **Sanguinarch**
  slam circle, **Corpselight** collapse circle. the user's "alligators" turned out to be the
  **Mirejaw**, not the Miretyrant — the boss already telegraphs its own sweep and chomp, and
  Mirejaws are what fill its bellow waves from wave 3, so a pack of locked lunge lines was
  unreadable.
- **Audited the rest rather than blanket-adding.** `Kilnborn` needs none: its backdraft only
  damages LIT GROUND and those burning tiles are already drawn, so a marker would be redundant.
  `Palewake` needs none: it has no area attack at all, only a tether drain, and its line is already
  drawn by its own gfx. Cragscale/Sandmaw/Hexling/Cinderwrought/Gloamwarden/GremlinKing/Duneshaper/
  Miretyrant already telegraphed theirs (Cragscale via `drawRollLane`, which an early grep missed).
- Lanes were included on the same reasoning as circles: a charge/pounce/lunge IS an area whose dodge
  is stepping off a line, and all three lock their angle at wind-up start, so the marker never lies.

**Mossling spawn immunity (item 9).** New `Enemy.spawnInvulnUntil` — 500ms of DAMAGE-ONLY immunity
(they still move and aggro, unlike `isPhaseLocked()`), plus a 0.35->1 fade-in so the window reads.
They burst out of a dying Mosswretch directly into the arc the player is mid-swing on, so crit + AOE
splash deleted them on frame one and the split looked like nothing happened.

`tsc` + `npm run build` clean, zero console errors, all of the above verified live via the
browser-pane eval (cap clamping, every retuned rate against divided-out potency, both UI cap
states, the full 3-kindling shrine lifecycle including the lapse rule, and all three bosses'
gates/locks/refusals), plus Mirejaw/Boar/Duskrunner drawing 34 telegraph commands during wind-up
and clearing to 0 at the strike. **Two paths are wired but NOT exercised live:** Sanguinarch's slam
(needs the engorged phase after feeding on a bleeding player) and Corpselight's collapse (needs a
sustained close approach) — both call the same helper proven on the other three. Notes for next
time: the preview loop needed the documented `loop.step` trick to advance game time, and enemy AI
does not tick until a character is actually picked (`runOver` stays true), which silently made a
first round of telegraph probes report nothing.

### Ascetic-run playtest batch — Miretyrant waves, Bog Ore clustering, Ashcaller rework, Max buttons (2026-07-24, Sonnet)

No plan file — a fix/tuning/content batch off the user's Ascetic win (77:59, 510 kills, level 25,
Kill Points 9710, Speed Multiplier x1.00 — a full clear, not a speedrun). Used Primal Spear until
Ember Brand dropped, then mixed both. Every design fork was locked via `AskUserQuestion` before any
code changed; the numbers themselves (Int 100 dump, Strength-capped crit mult, Agility crit chance)
were reviewed and judged healthy — no stat rebalance shipped, since the "too easy" complaint scoped
entirely to the Miretyrant encounter, not the character sheet.

- **Miretyrant bellow waves now escalate on a SCRIPT** (`src/entities/Miretyrant.ts` +
  `MainScene.updateMiretyrantBellow`/`miretyrantWaveComposition`). the user: "Honestly just spawn
  alligators instead of the frog dudes ... fighting strong adds the whole time ... hella frogs into
  some big scary alligators." The boss itself only hands MainScene a 1-based wave INDEX
  (`consumeBellow()`, renamed from a bare add-count — `pendingWave`/`bellowCount` replace the old
  `pendingAdds`/`MIRETYRANT_ADDS_PER_BELLOW`/`_ENRAGED` constants), and MainScene's
  `miretyrantWaveComposition(wave, enraged)` owns the script since it's the one that knows the
  entity classes: waves 1-2 are pure frog swarms (4-5 elite Murkling/Blighttoad, the existing
  45/55-favoured mix), wave 3 is the first elite-Mirejaw arrival (2 gators + 1 frog), wave 4+ keeps
  gators in the mix permanently (2 gators + 2 frogs, +1 extra frog while enraged). Base interval
  tightened `BELLOW_INTERVAL_MS` 15000→11000 and `BELLOW_ENRAGED_INTERVAL_MS` 8500→6500 for
  near-constant pressure late in the fight. Boss damage numbers and its own chase/attack behavior are
  explicitly UNCHANGED per the user's note ("damage was good, encounter was still too easy" — this is
  purely an add-pressure fix). Verified live: `miretyrantWaveComposition(1..6, false|true)` returns
  the exact scripted composition at every wave index and both enrage states.
- **Bog Ore now clusters in the bayou's dangerous zones**
  (`MainScene.spawnBayouNodes`). the user's actual ask, after a mid-session correction — he'd said
  "gloam ore" but meant **Bog Ore** (the bayou's sole surface metal, gating the whole
  Sunsteel→Mirebronze reforge flow he ran this session); gloam shards are a leftover-from-biome-2
  material that were never touched. The flat 46-node scatter is now a 24-node baseline (general
  presence) plus 10 clusters of 3-4 nodes biased into the **miasma** (poison fog) and **bonemire**
  (haunted boneyard) zones — the bayou's two actual hazard zones — via the existing
  `pickBayouPoint(..., { preferZone })` themed-spawn mechanism the enemy-pack spawner already uses,
  with the same jitter/fallback-to-anchor pattern (a cluster member that jitters off-bayou or into
  deep water snaps back to the verified anchor rather than being dropped). Net count ~24 + ~35
  clustered ≈ 59-64, up from 46.
- **Food-buff cap 3→2, Comfort/Bedroll fully exempt** (`src/systems/Buffs.ts`, `MainScene`
  `DEFAULT_MAX_BUFFS`). Locked via `AskUserQuestion`: "2 food, Comfort exempt" — a Bedroll should
  never compete with two cooked-food buffs for a slot. `BuffManager.apply()` now special-cases a new
  `COMFORT_BUFF_ID` ("comfort_rest"): it's pushed without ever being counted against the cap or
  considered for eviction, and the cap-eviction scan for a new FOOD buff explicitly skips the comfort
  entry when picking what to evict. Verified live: 2 foods + Comfort coexist (3 buffs active,
  Comfort untouched); adding a 3rd food correctly evicts the older food buff, never Comfort.
- **The Ashcaller reworked from "one buff at a time" to "buff master"** (`src/systems/
  Characters.ts`). The card's entire identity was built on `maxBuffs: 1` against a baseline of 3 —
  dropping the baseline to 2 would have collapsed a distinctive downside into plain worse-than-
  everyone-else. Locked via `AskUserQuestion` ("invert it"): `maxBuffs: 1` → `3`, so the Ashcaller
  alone runs 3 concurrent buffs while the new baseline is 2 for the rest of the roster. Boons: +15%
  skill XP, +60% buff/food duration, "Runs 3 buffs at once (everyone else: 2)"; bane stays -25% max
  HP only (a `+damage taken` second bane was considered and dropped — Reaver already owns that axis
  as its identity, and doubling it up would blur the two frail-glass-cannon cards together). Blurb
  updated to match. Verified live: `characterById('ashcaller').modifier.maxBuffs === 3`.
- **A "Max" button on every crafting-menu quantity slider** (`CraftingMenu`/`CookingMenu`/
  `DryingRackMenu`/`JewelryMenu`) — snaps the batch/amount straight to the max currently affordable,
  positioned to the right of each slider's knob within the existing panel width (no layout changes
  needed — all four panels had 60-380px of unused width past the slider). Verified live: clicking
  the CraftingMenu's Max button on a stackable recipe (Shishkabob, maxBatch 11286) snapped
  `batchAmount` from 1 straight to 11286 in one call.
- **Workbench Lvl 4→5 "upgrade ready" triangle — investigated, NOT a bug.** the user: "didn't show
  right, maybe because it was already placed? not sure." Reproduced live via a placed test Workbench
  stepped through all four upgrade tiers (`applyStationUpgrade` called directly for
  tool_sharpener/forge_anvil/emberforge_anvil): the ▲ glyph (`refreshStationUpgradeIndicators`/
  `stationHasReadyUpgrade`) correctly appeared and updated at every tier once ingredients were both
  *discovered* and *affordable*. Isolated the real cause: `gloamforge_anvil` (Lvl4→5) requires
  Gloamsteel Ingot specifically in its costs, and `upgradeIngredientsKnown` gates on the material
  having been actually **discovered** (smelted/held at least once) — the exact same "you had to
  actually smelt this" gate `emberforge_anvil` already uses for Embersteel. the user's run took the
  **Sunsteel→Mirebronze** branch this session (his own words), which never touches Gloamsteel Ingot
  at all, so the upgrade correctly stayed hidden — confirmed by forcing `discovered.delete
  ('gloamsteel_ingot')` (glyph vanishes, matching the report) then `discoverMaterial('gloamsteel_
  ingot')` (glyph reappears immediately). No code change; flagged to the user as working-as-designed
  rather than silently "fixed."
- **Numbers review (no changes shipped).** Reviewed the run's Skills/Stats screenshots (Pierce 51,
  Magic 23, Heavy Armor 49, Intelligence 100/329 points, Strength crit-mult capped at 3.0x, Agility
  20% crit chance). Judged healthy — Intelligence's uncapped skill-XP snowball is the same loop
  confirmed intentional in the earlier god-run triage (the fun-from-leveling was the explicit point),
  and the rest of the spread reads as a legitimate crit-focused pierce/magic build, not an imbalance.
  No stat/skill numbers were touched this batch.

`tsc` clean throughout. No `RECIPES.md` change (no recipe/cost changes — Bog Ore's yield/tool-tier
gate is unchanged, only its spawn distribution moved).

### Vagabond-run playtest batch — bayou over-correction + damage-type retirement (2026-07-24, Opus)

No plan file — a fix/tuning batch off the user's "not even finishing this — it's unplayable" bayou
run. Root cause of most of it: the 2026-07-24 pt1 damage pass sized bayou commons against
end-of-bayou Gloamsteel (74 armor), but a player entering the bayou wears badlands gear (~16-36), so
those raws landed near full and 2-shot. the user's own diagnosis in the dump: **Sanguinarch (118/205)
feels right as a miniboss, and commons were doing 2-3× that** — the ordering was inverted. Every
decision below was locked with him via `AskUserQuestion` before any code changed (he asked to review
the exact damage numbers first, too).

- **Damage-type layer RETIRED (the user: "remove resistances and weakness from enemies in general.
  Doesn't make sense").** Deleted every `resistances` block from all 11 entity constructors
  (Cragscale/Sandmaw/Hexling/Duneshaper/Mirejaw/Blighttoad/Mosswretch/Corpselight/Kilnborn/
  Sanguinarch/Miretyrant — Cinderwrought's was already `{}`) and the mirrors in `enemyStats.ts`.
  Every weapon now does full damage to every enemy; **flat armor is the only mitigation axis in the
  game.** `Enemy.resistMultiplier()` still exists and returns 1 (no code paths broke). This is the
  Phase-1 "bring the right weapon" system being deliberately retired — flagged to the user as such.
  NOTE: this only affects damage the player DEALS; enemy attack CLASS (magic/fire/poison bypassing
  the player's flat armor) is a separate axis and is unchanged.
- **Bayou commons → ~half of Sanguinarch** (anchor 118/205, unchanged). Raws: Mirejaw chomp 135→68 /
  lunge 170→100 / death-roll-tick 105→42; Blighttoad bite 125→48 (poison 4/s untouched — armor-
  bypassing payload); Mosswretch smash 165→98 (elite ×1.5 = 147, fixes "192 from elite tree guy");
  Murkling claw 108→38 (swarm = count, not per-hit); Corpselight husk maul 118→55 (its magic orb 22
  + slams untouched — they bypass armor and were fine). Biggest normal common ≈ half of Sanguinarch;
  no 2-shots; ~5-6 hits to kill at 16 armor. Minibosses/boss unchanged (not reached this run).
- **Healing reduction removed entirely** (`POISON_REGEN_MULT` 0.75→1.0, the user: "get rid of the
  healing reduction entirely"). Miasma/mire/spore zones deal only their poison DAMAGE now; the "This
  ground weakens healing" status never fires. Constant kept as a future deliberate-debuff hook.
- **Bow ministagger removed — RANGED ONLY** (the user chose ranged-only; melee keeps the shake for
  feel). The prior 2026-07-24 fix only suppressed the `playHitFeedback` position-shake while the
  enemy `isAttacking()`, so a *chasing* enemy still got knocked by every bow hit — the "forcing me to
  fight every enemy with my bow" complaint. Fixed with a one-shot `Enemy.suppressHitShake` flag set
  by `resolveWeaponHit` when `source === "Ranged"`, consumed+reset inside `playHitFeedback`, so no
  subclass `takeHit()` override has to thread a parameter through.
- **Duskrunner payoff windows** (the user: "too fast — why can they dash instantly melee attack? no
  payoff window"). Bite windup/recover/cooldown 180/200/140 → 300/360/420; pounce windup 260→340,
  recover 300→460, cooldown 560→900. Real telegraph + punish window between commitments.
- **Cragscale roll telegraph** (the user: "anything with an invisible radius like the spinny guys …
  needs to show the radius"). New `Cragscale.telegraphGfx` draws the roll's hit-lane on the ground —
  a translucent quad along the locked roll direction (ROLL_MAX_DIST long, 2×ROLL_HIT_RADIUS wide) +
  a rounded far cap — ramping in during windup, solid during the strike, cleared on recover;
  destroyed in a new `playDeathFeedback` override. Same pattern as the Sandmaw's existing ring.
- **Kilnborn whole-dungeon lava** (the user: "should make whole dungeon lava not just his room"). New
  `Kilnborn.floorRects` (assigned `[...layout.rooms, ...layout.corridors]` in MainScene); `ensureTiles`
  builds the fire grid across all of them, deduping doorway-overlap cells. At full heat
  MAX_BURN_FRACTION of the ENTIRE crypt is alight — no cold room to retreat to. Falls back to the
  single `arena` rect if `floorRects` is ever empty.

**Verified live** (`javascript_tool`, zero console errors): damage numbers read
[68,100,42]/[48]/[98,0]/[38]/[22,55,26]/[118,205]; `resistances` absent from the table + every
`resistMultiplier('pierce'|'slash'|'fire')===1`; `suppressHitShake` consumed by `takeHit`; a Kilnborn
built 92 tiles across two floor rects (multi-rect + dedup works, no throw); a Cragscale drove through
a full roll (trigger→windup→strike, 80 frames) drawing the telegraph without error. `tsc` clean.
Dashboard Enemies tab (the hand-mirror) updated: changed damage numbers + stripped the now-false
resist/heal prose. No `RECIPES.md` change.

### Full-screen flicker on equip/place — the real root cause (2026-07-24, Opus)

No plan file; a one-line fix off the user's report that the flicker "continues to be a thing —
every time I equip an item or place a thing the whole screen flickers and I see a flash of another
view for a split second."

**The previous fix treated a symptom.** Coalescing the `HotbarUI`/`UpgradeMenu`/`EventLogUI`
repaints (12 rebuilds/frame → 1) cut the flicker from a continuous strobe to a single flash per
action, but the flash itself was a different bug — and the coalescing actually *created* the window
it fires in.

**Root cause: unclassified objects render on EVERY camera.** The scene runs a two-camera split
(zoomed world cam + zoom-1 HUD cam); `syncCameras()` routes each object to exactly one via its
`cameraFilter` bitmask. A brand-new object has `cameraFilter === 0`, which Phaser reads as "draw on
all cameras" — so an unclassified HUD panel is drawn a second time on the **world** camera, at 1.5×
and in the wrong place. One frame of that is a full-screen flash.

`syncCameras()` was called from `update()`. Phaser's step order is
`scene.update` → `POST_UPDATE` → `PRE_RENDER` (**input handlers run here** —
`InputManager.preRender` is bound to the game's PRE_RENDER) → `render`. So syncing from `update()`
misses *both* things that create objects in response to a click: the pointer handler itself (e.g.
the placement ghost), and the coalesced UI repaints — which defer their teardown-and-rebuild to
`POST_UPDATE`, i.e. one hook *after* the sync.

**Measured live** (`javascript_tool`, probe registered on PRE_RENDER after the scene's own, so it
sees what the renderer is about to see): settled frame `0` unclassified → click frame `0` (the
refresh only queues) → **next frame `36`** — the entire 18-slot hotbar (18 rects 46×46 @depth 2900
+ 18 texts @2901) rebuilt and drawn on both cameras → frame after `0`. Exactly one flash per equip
or placement, which is what the user sees.

**Fix:** `syncCameras()` now runs on the game's `PRE_RENDER` (registered in `create()`, off-then-on
so `scene.restart()` can't stack a listener per run) instead of in `update()`. That is the last hook
before the renderer walks the display list, so it catches the input phase and the POST_UPDATE
rebuilds alike. It also still covers the frozen-menu case the old `update()` call was placed early
for, since PRE_RENDER fires whether or not `update()` returns early.

**Verified live:** equip frames `[0,0,0,0,0]` (was `[…,36,…]`); an object created mid-input-phase
`[0,0,0]`; across a `scene.restart()` the PRE_RENDER listener count is unchanged (4 → 4, no leak);
and the split itself is still correct — 129/129 HUD objects UI-cam-only, 1344/1344 world objects
world-cam-only, the `speckleLayer` exception still on the world cam. `tsc` + `npm run build` clean,
zero console errors.

**Rule this establishes:** any per-frame pass whose output the *renderer* consumes belongs on
PRE_RENDER, not in `update()` — anything created by an input handler or a POST_UPDATE-coalesced
repaint lands after `update()` has already run.

### Survivor roster rework — distinctive, non-decaying, double-edged (2026-07-24, Opus)

No plan file; a follow-on to the same session's damage batch, prompted by the `maxHpPct` decay
finding. the user: "consider a rework of the starting survivors... I want them to feel distinctive
and double edged sworded." Three forks locked via `AskUserQuestion`.

**Three problems found:**
1. **Two of the five cards had no bane left.** `maxHpPct`/`maxStaminaPct` were a % of the **100
   base**, so they decayed as pools grew: the Vagabond's "−10% max Stamina" was −10 off a ~310
   pool (**3%**) and the Ashcaller's "−15% max HP" was −15 off ~340 (**4%**). Both were, in
   practice, free-upside cards — the same decay that made the Warden's "+20% max HP" boon
   worthless, pointing the other way.
2. **Every modifier was the same shape** — one global scalar up, one global scalar down. The
   affinities carried all the class identity; the modifier layer read as a stat line.
3. **Two cards shared `damageTakenMult` as their boon** (Warden + Ascetic), an overlap introduced
   earlier the same session.

**Locked decisions:** behavioural edges (not just numbers); `maxHpPct` becomes a **true
multiplier**; and — the user's own framing — **no double-stacking an axis**: "I dont want them to
double stack i.e. -20% max hp AND vit is hit. doesnt make sense". **No hard limits** (a modifier
never locks out content, so a bad pick can't dead-end a 70-minute run).

**ONE AXIS, ONE LEVER is now a structural rule**, not a convention. Several `RunModifier` fields
govern exactly what a stat potency governs (`maxHpMult`↔vitality, `staminaRegenMult`↔endurance,
`xpMult`↔intelligence, `buffDurationMult`↔wisdom), so a card carrying both silently applied two
multipliers to one axis. A `MODIFIER_STAT_AXIS` map plus a module-load `console.warn` guard now
enforces it, alongside the existing never-reduce-drops guard. The Ashcaller was the user's own
worked example and had **three** such clashes (vitality, intelligence *and* wisdom) — resolving
them also finishes the job D4 started, since the multiplicative xp stack is now two terms, not
three.

**Seven new `RunModifier` fields, each one line at a choke point that already existed** —
`maxHpMult` (syncStatBonuses), `killHealBonus` (the on-kill heal site), `staminaRegenMult`
(`Stamina.setRegenMult`), `buffDurationMult` (`Buffs.setDurationMult`), `maxBuffs`
(`Buffs.setMaxBuffs`, previously a hardcoded 3, now `DEFAULT_MAX_BUFFS` + a per-card override),
`attackSpeedMult` (`attackCooldownMult()`, so all three attack paths inherit it), `eliteLootMult`
(the loot spawn loop, elites only). `maxStaminaPct` was **retired rather than kept as a future
lever**, per the file's own "a new field is a deliberate decision, not a freebie" rule.
`boon`/`bane` became `boons[]`/`banes[]` since most cards now carry a scalar pair *and* a
behavioural edge; all three display sites (CharacterSelectUI, CharacterMenu, dashboard) render
them like the existing affinity lines.

**The roster:**
| Card | Boons | Banes | Identity |
|---|---|---|---|
| **Vagabond** | +15% move speed, +50% stamina regen | −25% damage dealt | Outruns anything, never runs dry, kills slowly |
| **Reaver** | +30% damage dealt, +6 HP per kill | +25% damage taken, −20% max HP | Sustains by killing — backing off is what kills you |
| **Ashcaller** | +15% skill XP, buffs last 60% longer | −25% max HP, **only ONE buff at a time** | Fragile scholar living on one long, well-chosen buff |
| **Warden** | −15% damage taken | +20% stamina cost, −13% attack speed | Slow, deliberate, unkillable; the gatherer |
| **Ascetic** | Elites drop **double loot** | Elites are **twice as common** | The greed card — the only one that changes the world, not the player |

**One pre-existing inconsistency fixed in passing:** `syncStatBonuses` assembled stamina off a
literal `100` while `Stamina.MAX_STAMINA` is **130**. It happened to cancel out (`setBonusMax`
subtracted the same 100), but it would have silently mis-scaled the moment a multiplier was
applied to that pool. Now uses the real base; verified a no-op for the existing case (130 at 0
Endurance on every card).

**Verification.** `tsc` + `npm run build` clean, zero console errors/warnings (the new axis guard
stays quiet). Live: the roster loads with **zero axis clashes** under an independent re-check of
the rule (not just trusting the guard). The load-bearing test — `maxHpMult` holds at exactly
**75% / 80% of baseline at BOTH 0 and 60 Vitality points** (255/340 and 272/340), i.e. the decay
is gone; under the old system the Ashcaller's bane went from 15% to 4.4% over that same range.
Every hook read back correctly per card (Warden `attackCooldownMult` 1.15, Ashcaller `maxBuffs`
**1** and buff duration ×1.66, Vagabond stamina regen ×1.56 and damage ×0.75, Reaver kill-heal 6,
Ascetic elite chance/loot ×2). Elite loot doubling is correctly **scoped**: baseline normal 2,
baseline elite 2, Ascetic normal 2, Ascetic **elite 4**. Character-select screenshotted — all five
cards render the longer trait blocks with no overflow (bottom-most object exactly at the 1080
screen edge).

**Promo poster re-rendered** (`promo/gloamreach-playtest-invite.html` → `.png`): its five survivor
cards carried the old modifier lines verbatim. Blurbs and boon/bane lines updated to match, then
re-rendered via the documented headless-Chrome recipe. Body height is unchanged at 1710 (2400×3420
at scale 2) because `.blurb { flex: 1 }` absorbs the extra mod lines inside each card, so all five
cards stay the same height and the `starts with …` footers stay aligned — verified by measuring
every card's height and footer position before rendering. The Reaver's kill-heal is written as
"Restore HP on every kill" rather than the literal 6, since a raw HP number is meaningless on a
poster without knowing pool sizes and would drift on every tuning pass.

**All numbers first-pass/tunable.** The Reaver is the card most likely to need it: +25% damage
taken *and* −20% max HP against the newly-lethal bayou is the sharpest edge on the roster, and
the 6 HP/kill that pays for it does nothing during a boss fight, where there is nothing to kill.

