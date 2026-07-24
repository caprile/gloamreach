# Status

## Current State

_Living snapshot — edit in place, never append._ Last shipped: **Survivor roster rework**
(2026-07-24, Opus), immediately after the **Warden-run playtest batch — the flat-armor collapse**
(same day, same session). Both off the user's Warden victory run (77:55, 633 kills, level 28, full
Gloamsteel) and a ~17-item feedback dump.

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

### "God run" triage session 3 — creature identity pass, C1/C2/C3 (2026-07-23, Opus)

Plan: `.claude/plans/vagabond-god-run-triage.md`. Sessions 1 (bugs/ammo/summary) and 2 (the
balance pass) shipped earlier the same day; this is the final session, closing the whole triage.
Three bespoke bayou-creature reworks, each off a specific the user complaint and each following the
roster's "own state machine, own numbers in enemyStats.ts, no shared config table" rule.

**C1 — Mirejaw ("feels like a glorified boar").** Two additions give it an alligator's identity.
(1) DEATH ROLL: a chomp that CONNECTS (and is off cooldown) latches into a thrashing roll — 3
ticks @360ms in a tight 62px grip, each re-checked against the player's CURRENT position (break
away to cut losses), 18 dmg + 7/s bleed each, ending in a 1s planted recovery (the biggest punish
the creature offers), 7s cooldown. Only ever entered from a hit that already landed — a punish for
being caught, not a new way to catch you. Routed through `checkPlayerHit` (Mirejaw added to that
union); the barrel-roll spin is driven manually rather than by a tween because
`Enemy.playHitFeedback` calls `killTweensOf(this)` on a planted enemy and would strand the sprite
crooked. (2) WATER TERRITORY: new generic `Enemy.ignoresTerrainSlow` (default false) exempts a
creature from the environmental move-slow the player suffers — only the TERRAIN term, so night
speed + Executioner slow still apply. On dry ground you outpace it; in deep water the player wades
at 0.5x and it doesn't, inverting the relationship. Verified live: full cycle fires 3 ticks at
900/1260/1620ms; breaking the grip after tick 1/2 takes exactly 1/2 hits; on a sampled 0.62-
moveMult tile the Mirejaw reads envSpeedMult 1.0 vs a Murkling's 0.62.

**C2 — Mosswretch ("lacks attack moves / feels weird").** Its whole kit was one slow overhead
swing on the slowest body in the game — trivially walked away from. (1) SPORE BURST: it can't
catch you so it stops you — a mid-range (outside smash reach) planted 700ms heave with NO impact
damage drops a lingering cloud on your CURRENT ground that slows 0.6x + poisons 5/s for 6s, used
to cut off the retreat so the next smash lands. Rides the same `environmentEffectAt` path the
Miretyrant's mire pools use (refactored into `baseSurfaceEnvironmentAt` + `foldSporeCloud`, so a
cloud stacks correctly with water/thornfield/miasma — harsher slow wins, poison max'd), inheriting
slow + poison + regen-suppression + status-resist with zero bespoke damage code. (2) DEATH-SPAWN:
comes apart into 3 Mosslings (same class scaled 0.58, 16% HP / 42% dmg / 1.9x speed, forceAggro'd
so they swarm the moment you'd relaxed), via the "creature asks (`deathSpawnCount`), scene spawns
(`spawnMosslings`)" split the bellow uses. Guarded 3 ways: a spawnling reports deathSpawnCount 0
(no recursion), is never elite (one kill can't pay 4 trophies), drops only 1 token swamp_moss.
Verified live (after page-reload to fix an HMR dual-class `instanceof` artifact): a real
dev-spawned kill spawns exactly 3 aggro'd Mosslings, killing a Mossling spawns none, the cloud
reads moveMult 0.6 / poison 5 / regen 0.75 inside and neutral outside.

**C3 — Corpselight ("just a ranged gremlin").** A genuine TWO-FORM TRANSFORM — the user explicitly
rejected phase-out and blink as done-before and asked for a melee-form transform, so this is a new
shape for the roster (nothing else transforms). At range = the wisp (unchanged: fragile, floaty,
armor-bypassing homing orbs). Within 96px it COLLAPSES into a corporeal husk: 1.7x scale, slow
62px/s lurch, a PHYSICAL maul (30 — armor answers the husk, unlike the wisp's magic orbs), and it
takes only 0.5x damage. Stay 190px away for 2s and it DISSOLVES back (hysteresis: revert range >
transform range, so no boundary strobe). ONE shared HP pool (chipping the wisp is real progress,
but a given DPS goes further at range than into the tanky husk — the "commit to a strategy"
lever). BOTH transitions deal telegraphed magic AoE (collapse drop-slam 26 + 150kb, dodgeable by
stepping out of the 104px tell; dissolve puff 13) via `checkPlayerHit` (Corpselight added to the
union); the husk maul uses the boolean-bite path with `biteDamage` overridden to the maul value.
1.6s transform cooldown caps flicker. Verified live: full wisp->collapse->husk->dissolve->wisp
cycle with correct scales/damage; husk takes exactly 0.5x (40->-40 wisp, -20 husk); collapse slam
lands 26 standing still / whiffs when you sprint clear; the scene loop dealt slam+maul to the
player through the real applyDamageToPlayer path (138->82).

`enemyStats.ts` holds every number (new attack entries per creature); dashboard Enemies tab
resynced for all three (stale primary-damage numbers corrected in passing since those entries were
being edited anyway — Blighttoad/Murkling's stay flagged). `tsc` + `npm run build` clean, zero
console errors. **The god-run triage (sessions 1-3, D1-D10 + C1-C3) is complete; next is a
playtest.**
