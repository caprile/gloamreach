# Status

## Current State

_Living snapshot — edit in place, never append._ Last shipped: **Vagabond-run playtest batch —
bayou over-correction + damage-type retirement** (2026-07-24, Opus; full writeup under Recent
Entries). Off the user's "unplayable" bayou run, undergeared (fighting bayou commons in badlands
Emberhide, ~16 armor). Design-confirmed with the user before applying. Headlines: (1) **the whole
damage-type layer is RETIRED** — every enemy `resistances` block deleted, so every weapon does full
damage and **flat armor is the only mitigation axis left**; (2) **bayou commons rescaled to ~half of
Sanguinarch** (the unchanged 118/205 miniboss anchor) — the pt1 pass had wrongly sized them against
74-armor Gloamsteel; (3) **healing reduction removed entirely** (`POISON_REGEN_MULT`→1.0); (4) **bow
ministagger removed** (ranged-only, via a one-shot `Enemy.suppressHitShake`); (5) **Duskrunner given
real windup/recovery/cooldown windows**; (6) **Cragscale roll now telegraphs its hit-lane**; (7)
**Kilnborn fire spans the whole crypt**, not just the vault. `tsc` clean; all verified live. Nothing
reached the Miretyrant/minibosses this run, so those are unchanged. **Next: playtest at these
numbers.**

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

### Warden-run playtest batch — the flat-armor collapse (2026-07-24, Opus)

No plan file. Off the user's Warden victory run (77:55, 633 kills, level 28, full Gloamsteel +
Gloamsteel Longsword) and a ~17-item feedback dump. Scope and the two design forks were locked
via `AskUserQuestion` before any code changed.

**THE ROOT CAUSE — one line explained most of the dump.** `applyDamageToPlayer` computes
`max(1, round(dmg × (1 − relicRed) − flatArmor))`. Flat armor is uncapped and had grown
**10.5×** across three biomes (full heavy set: 7 → 13 → 56 → **74**, 83 with augments) while the
strongest attack in the game grew **2×** (60 → 124). So essentially **every physical attack in
biomes 2 and 3 was pinned to the `max(1, …)` floor**, the win-con boss included. That single
fact accounts for: Miretyrant hitting for -1/-2/-12, Murklings doing 1, the Duneshaper's
"5-circle attack" doing 1 (it is Sand Spikes — `buildSpikesCross` = centre + 4 arms — and the
boss's ONLY physical attack, while its four magic ones bypassed armor and landed full), "bayou
enemies are so weak", the 5:1 badlands-vs-bayou danger ratio, and "I don't feel like I need the
next tier of gear". It also explains the two things the user singled out as *correct*: the
Corpselight/Mosswretch woods felt right because Corpselight orbs are `magic` and Mosswretch's
smash was one of only two physical hits big enough to clear 74 armor at all — and "Mosswretch
elites do way more damage than any of the minibosses" was literally true, since elite smash
landed 25 while Gloamwarden's 22/24 attacks and Sanguinarch's 50 both landed **1**.

**the user's call: keep flat subtraction** ("no this is confusing, should always be flat
subtraction") and **raise enemy damage to match today's armor** rather than compress armor or
switch to a DR curve. So this is a numbers pass, not a formula change.

**Wiring first — three enemies were silently ignoring the balance table.** `enemyStats.ts` said
Sanguinarch did 34/88 and Kilnborn's backdraft 72; the entities were still running **15/50** and
**58**. The HP half of that buff had landed (entities read `S.hp`), the damage half never did,
and nothing could catch it. **Every remaining un-wired entity is now wired** (all of badlands +
Palewake/Kilnborn/Sanguinarch), so the drift class is closed. Two unit traps found while wiring:
Palewake's tether table value is per-SECOND but the entity ticks every 450ms, so the hardcoded
10/tick was actually 22/s — the entity was doing *more* than the table advertised, not less;
same for Kilnborn's burning ground (7 per 620ms = 11/s). Both now convert properly.

**New sizing rule, documented at the top of `enemyStats.ts`:** size an attack by the NET number
you want it to land through its biome's armor, not by its paper value. Both prior Miretyrant
passes claimed to target "~35-55 net through 74 armor" and both failed the same way — they
picked raw numbers and never did the subtraction.

**Numbers (verified live, below).** Bayou commons 38-80 → 108-170; Mirejaw death-roll tick
18 → 105 (a per-tick 18 was under armor three times over, so the signature move landed 3 total);
crypt wardens Sanguinarch 15/50 → 118/205, Kilnborn 30/58/7 → 48/105/20, Palewake 22/s → 30/s;
**Miretyrant 110/98/124/92 → 225/210/255/200**. Badlands was deliberately left almost alone
(the user reports biome 1→2 progression feels right) — only the two clearly-broken things:
Gloamwarden 22/24 → 78/84 (its attacks were *below* a full Sunsteel set's armor, so the vein
guardian could not exceed 1 damage against any heavy build) and Duneshaper Sand Spikes 56 → 125.

**The rest of the batch:**
- **Miretyrant adds** are now **elite** and the mix flipped to favour Blighttoad (45/55). the user:
  "the ADDs are useless because my crit splash insta kills them." The ratio flip matters more than
  the elite flag — a Murkling's claw is physical and so is the first thing an endgame armor pool
  erases, while a Blighttoad's payload is poison, which bypasses armor entirely.
- **Delayed poison death-bloom** (the user's own suggestion). A killed Blighttoad's corpse swells
  for a telegraphed 1.1s fuse, then bursts into a poison cloud. Reuses the Mosswretch spore-cloud
  hazard record wholesale — no new damage code, expiry sweep or environment hook. Elite blooms
  deny *more ground* (2 offset clouds) rather than more damage, because `foldSporeCloud` is a
  boolean "inside any cloud" test that maxes dps rather than summing it, so stacking clouds on one
  point would have been a silent no-op.
- **Ranged "mini-stun" removed.** There was never a stagger mechanic — it was
  `Enemy.playHitFeedback`'s x-shake, which previously skipped only *moving* attackers on the theory
  that jittering a planted one was harmless. A planted attacker is exactly what a ranged player
  creates, so every arrow visibly knocked a casting enemy sideways. Any committed attack phase now
  suppresses it.
- **Bows reined in.** D3 raised bow damage +40% and cut cooldowns -25%; the cooldown half was right
  and is kept, the damage half had put every Warbow *above* its same-tier Sword per hit (15>14,
  21>19, 28>25) at 92-98% of its DPS from 380-420px away. Now 12/16/21 — under the Sword per hit
  and a consistent **73%** of its DPS.
- **Palewake's tether no longer drops while it's invisible** (the user). It was cleared on entering
  the stalk, so a third of every cycle was dead air in which the fight's only damage source did
  nothing *and* the boss could not be hit. Deliberately no unravel from a stalk-phase break — the
  punish window is still earned by breaking the committed channel.
- **Bayou elite/trophy density.** Both bayou POIs bypassed the elite roll entirely (Sunken Shrine
  waves 1-2 and *every* Drowned Lodge resident were hardcoded normal) and both dungeons rolled at
  the 8% badlands base rather than the bayou's 16%. Now: crypts/lair **41%**
  (`CRYPT_ELITE_CHANCE_MULT` — answers "dungeons are easy" and the trophy drought with one lever,
  since a crypt is fixed, finite and non-respawning), POIs **24%**, and the Shrine rite escalates to
  an **all-elite final wave** (the Duskrunner Warren's shape, which is what the user asked for).
- **Warden's boon swapped**, `maxHpPct: 20` → `damageTakenMult: 0.85`. the user asked whether
  1.5× vitality potency + 20% max HP was safe; it wasn't, and it was also broken in the other
  direction — `maxHpPct` is a % of the **100 base**, so "+20% max HP" was a flat +20, about 4% of
  his endgame pool. Damage reduction is a multiplier (never decays) on an axis the card's vitality
  potency doesn't already own. **NOTE:** every other `maxHpPct`/`maxStaminaPct` modifier has the
  same decay problem — the Vagabond's "-10% max Stamina" and Ashcaller's "-15% max HP" *banes*
  quietly evaporate late-game. Left alone pending the user's call.
- **Corpselight friendly fire: no bug.** Enemy projectiles only ever overlap the player; there is
  no enemy-vs-enemy damage path anywhere in the codebase. Mosslings are 16% HP and force-aggro on
  spawn, so the player's own AOE/crit-splash is what kills them.
- **Flicker fixed.** `HotbarUI`, `UpgradeMenu` and `EventLogUI` all did a synchronous full
  destroy-and-rebuild per call, and MainScene called them repeatedly per frame (Hotbar twice per
  equip, once per collected node — so N times during a magnet sweep). All three given the same
  `refreshQueued` + `POST_UPDATE` coalescing `InventoryMenu`/`CraftingMenu` already had, plus a
  redundant `hotbarUI.refresh()` removed from `afterItemMove` (verified redundant:
  `recomputeEquipped` has no early return). Measured 12 calls → 12 rebuilds, now → **1**. Also
  fixed a knock-on the coalescing exposed: the surviving repaint still killed the hover tooltip,
  and Phaser won't re-fire `pointerover` until the pointer physically moves, so a hovered slot's
  tooltip vanished for good.
- **Ability slots are now player-chosen** (the user: "I should be able to drag and drop it in").
  Every ability item declares `armorSlot: "ability1"`, and the drop gate was an *equality* check, so
  dropping on E or R always snapped back and equips always auto-filled the first free slot. The gate
  now compares slot GROUP and threads the hovered slot through as an explicit target; paper-doll →
  paper-doll is a real swap instead of a no-op, so Q/E/R can be reordered without unequipping.
  Group-generic, so the 4-slot `special` group got the same capability for free. Quick-equip
  (double/Ctrl-click) deliberately still auto-fills.

**Verification.** `tsc` + `npm run build` clean, zero console errors. Live against the running dev
server: table values reach the entities; end-to-end `applyDamageToPlayer` at a real
`totalPlayerDefense` of **74** and a 500 HP pool gives Miretyrant slam **181** (141 with a typical
-15.8% relic — ~4 hits), chomp 151/115, Mosswretch 91/65, Murkling 34/17 (was 1); light Mirehide
(36 armor) takes 219 and Embersteel (56, entering the biome) 199, so the gear tier now reads.
Death bloom: 0 clouds during the fuse, 1 after, 3 for an elite, hazard confirmed at the point
(`moveMult 0.6 / poisonDps 5`). Palewake drained **70 damage while invisible** across a full cycle
(previously 0) plus 126 while manifest. Hit-feedback: 0 tweens while attacking, 1 while idle.
Elite rates over 20k rolls: base 7.9%, bayou surface 16.1%, POI 24.4%, crypt 40.6%. Two bugs in my
own test harness were caught and fixed rather than reported as results — a wrong Equipment slot id
(`gear1` vs `helmet`) that read armor as 0, and a wrong `Palewake.update` argument order.

**Housekeeping:** a stray duplicate `## Recent Entries` heading left mid-file by an earlier prune
was removed, and the oldest entry moved to `STATUS-archive.md`.

### Vagabond-run playtest fix batch 2 (2026-07-24, Sonnet)

No plan file — a fix/tuning batch off the user's own end-of-run summary (Ashcaller, badlands+bayou
kit: Embersteel Warbow + badlands light armor) plus a fresh round of playtest notes. Design
decisions (nerf-ranged vs. buff-enemy-anti-kite vs. reduce-sustain vs. a light combined pass, plus
crit-splash's scope and the bow's move-slow %) were confirmed via `AskUserQuestion` before touching
anything; two ambiguous complaints ("little tree dudes don't hit me" / recipe-chain visibility) were
resolved by live investigation rather than guessed at.

**The diagnosis, confirmed by the user's own Run Summary after the fact:** 80% of all damage dealt
was Ranged (48,965 of 60,982), melee only 20% combined; 72% of all healing was the Leech relic
(3,439 of 4,747); only 6,639 total damage taken across a full run to two bosses. The two shipped
changes target those two lines directly.

**Balance (all locked decisions):**
- **Crit-splash relics → melee-only** (`MainScene.resolveWeaponHit`, gated on `source !== "Ranged"`;
  `Relics.ts` description text updated to say so). Ranged weapons carry no weapon-arc splash of
  their own (`WEAPON_ARC` is `{range:0}` for every bow) — crit-splash was the ONLY thing turning a
  single-target bow into horde-clear, and at a 60%-capped crit chance it fired on the majority of
  shots. Verified live: a forced ranged crit (`resolveWeaponHit(..., "Ranged")`) no longer splashes
  to a nearby enemy; the identical forced hit with `source: "Weapon (direct)"` still does.
- **Ranged fire-slow** — firing any ranged weapon sets `rangedFireSlowUntil` (350ms), folded as a
  separate multiplicative 0.72x term into `Player.update`'s envMult (kept OUT of
  `currentEnvMoveMult` so the terrain tooltip doesn't misattribute it) — an anti-kite governor per
  the user's "25-30%, not 40%" note. Verified live via `tryRangedAttack`.
- **Leech relic trimmed**: Reaper Totem 3%→2%, Bloodlord's Mantle 5%→4% (`Relics.ts`). `RECIPES.md`
  relic tables updated for both this and the crit-splash description change.
- **Duneshaper arena poison** — the user: "doesn't normally have poison, it was from the overlap of
  the bayou area." Root cause: `TYRANT_ALTAR_CLEAR_RADIUS` (360px) only gates where a bayou zone's
  CENTER gets picked; a miasma zone's own radius (up to 780px, more with `selfSep` merging) can still
  reach into the arena from just outside that exclusion. `baseSurfaceEnvironmentAt` now returns
  neutral unconditionally within the clear radius of any tyrant altar. Verified live: injecting a
  fake miasma zone dead-centered on a real altar reads neutral 100px from center, but still poisons
  normally 700px out (regression check — the fix isn't a global miasma kill switch).

**Bugs fixed (no design call needed):**
- **CraftingMenu flicker was a gap in the earlier B1 fix.** `InventoryMenu.refresh()` was coalesced
  to one repaint/frame; `CraftingMenu.refresh()` — shown right beside it under the same Tab panel,
  and called once per collected node via `collectNode()` → `refreshDiscovery()` → `craftingMenu
  .refresh()` — was still an uncoalesced direct `render()` every call. Given the exact same
  `refreshQueued` + `POST_UPDATE`-deferred pattern `InventoryMenu` already used. Verified live: 5
  rapid `refresh()` calls in one frame now produce exactly 1 deferred repaint instead of 5.
- **Mosswretch's spore cloud did nothing underground.** `environmentEffectAt` short-circuited to
  "only the Miretyrant's own mire pools matter" the instant `activeDungeon` was set, never reaching
  `foldSporeCloud` at all — but Mosswretch IS themed crypt/lair-approach dweller content (see
  `populateCrypt`'s "bruiser room" weight and the Miretyrant approach spawn). Fixed by routing the
  dungeon branch's base effect through `foldSporeCloud` too. Verified live: injecting a spore cloud
  and forcing `activeDungeon` truthy now correctly reads `moveMult 0.6/poisonDps 5` at the cloud's
  position, neutral elsewhere.
- **Stale weapon Stamina display.** Every weapon's `Items.ts` `stats` array is hand-authored text;
  Damage/Attack Speed/Armor were already recomputed live in `Tooltip.statValue`/`CraftingMenu
  .statValue`, but Stamina fell through to the raw authored string — drifted to "15" for the
  Embersteel Warbow after a balance pass moved the real `WEAPON_STAMINA_COST` to 11. Both
  `statValue` methods now read `weaponStaminaCost()` live, closing this class of drift for every
  weapon at once (the dashboard was never affected — it already read live). Verified live via both
  methods directly.
- **"Little tree dudes don't hit me, even standing still" — misfiled as Murkling, actually
  Mosswretch/Mossling.** Murkling was tested twice live (solo and a 6-pack) and connected correctly
  both times — no bug there; the pack test, if anything, showed it can burst a full-HP player to 0
  in under a second when several swings land on the same frame, the opposite problem. The real
  defect: `SMASH_SWING`'s `tell.rearBackSpeed` (46px/s, added for an earlier "hard to predict"
  telegraph complaint) reared the creature back for the FULL 780ms windup regardless of how close it
  started — enough drift (~36px) to carry it clean past its own 88px reach before the strike-time
  recheck, even against a player who never moved. Fixed in the shared `Enemy.tickMeleeSwing` engine:
  the rear-back now stops once retreating would cross the swing's own effective reach (with a small
  4px buffer for one-frame lag), affecting every current/future user of `tell.rearBackSpeed`, not
  just this creature. **Verified live and rigorously** (multiple false leads caught and ruled out
  along the way — a test-harness gotcha where splitting a timing-sensitive sim across separate
  `preview_eval` calls feeds Phaser's loop a clock that jumps backward and corrupts its delta
  tracking; always run one continuous script per timing test): a Mossling that missed 100% of the
  time over a 10-second window pre-fix now lands hits reliably (33 dmg each, matching spec) at
  84-90px, and the parent Mosswretch's identical code path was confirmed via the same mechanism.
- **Transitive recipe discovery.** the user: seeing Emberhide's recipe should only require Duskhide's
  RECIPE being known plus Embersteel — not an actual crafted Duskhide piece. `Crafting.ingredientsKnown`
  now also treats an ingredient as known if any already-discovered recipe produces it
  (`isKnownIngredient`, new), resolving transitively across repeated `refresh()` calls (which fire on
  essentially every state change) without needing explicit recursion. Verified live: Emberhide Vest's
  recipe unlocked in the same `refresh()` pass as Duskhide Vest's, with `duskhide_vest` never added
  to the discovered-items set at all.
- **Welcome popup reworded** (`WelcomeUI.ts`) — dropped the now-stale "this first biome is just the
  start" line (three biomes and multiple bosses now exist), replaced with a general "the game keeps
  growing between sessions" framing; removed the inline hotkey dump (Tab/K/Esc, Ctrl+Click/
  Shift+Click) in favor of pointing players at Pause → Tips (the full how-to-play reference) and the
  Keybinds panel (top-left, full control list) — per the user: "don't give them a bunch of hotkeys at
  this time." Verified live: both pages render within the existing panel height with no overflow.

`tsc` + `npm run build` clean throughout. A stray esbuild "Unexpected case" error appeared in the
Vite log during the Enemy.ts edit — traced to an 11-second window mid-edit before the closing brace
was added, self-resolved on the next save, and predates every live verification in this batch.
`RECIPES.md` updated (relic tables only — no recipe/cost changes otherwise).
